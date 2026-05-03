import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createVoteSchema } from "@/lib/validation";
import { generateToken, generateId } from "@/lib/utils/nanoid";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId } = await params;
    const body = await request.json();
    const parsed = createVoteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { participant_name, participant_token, votes } = parsed.data;
    const supabase = await createClient();

    // イベント存在確認
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, status")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: "イベントが見つかりません" },
        { status: 404 },
      );
    }

    // 既存の投票を確認
    const { data: existingVote } = await supabase
      .from("votes")
      .select("id, participant_token")
      .eq("event_id", eventId)
      .eq("participant_name", participant_name)
      .single();

    let voteId: string;
    let newParticipantToken: string;

    if (existingVote) {
      // 既存投票の編集：トークン検証
      if (
        participant_token &&
        existingVote.participant_token !== participant_token
      ) {
        return NextResponse.json(
          { error: "この名前は既に使用されています" },
          { status: 403 },
        );
      }
      if (!participant_token) {
        return NextResponse.json(
          { error: "この名前は既に使用されています" },
          { status: 403 },
        );
      }

      voteId = existingVote.id;
      newParticipantToken = existingVote.participant_token;

      // 既存の投票詳細を削除
      await supabase.from("vote_details").delete().eq("vote_id", voteId);
    } else {
      // 新規投票
      voteId = generateId();
      newParticipantToken = generateToken();

      const { error: voteError } = await supabase.from("votes").insert({
        id: voteId,
        event_id: eventId,
        participant_name,
        participant_token: newParticipantToken,
      });

      if (voteError) {
        console.error("Vote creation error:", voteError);
        return NextResponse.json(
          { error: "投票の作成に失敗しました" },
          { status: 500 },
        );
      }
    }

    // 投票詳細を作成
    const voteDetails = votes.map((v) => ({
      id: generateId(),
      vote_id: voteId,
      candidate_id: v.candidate_id,
      availability: v.availability,
      preference: v.preference ?? null,
    }));

    const { error: detailsError } = await supabase
      .from("vote_details")
      .insert(voteDetails);

    if (detailsError) {
      console.error("Vote details creation error:", detailsError);
      return NextResponse.json(
        { error: "投票詳細の作成に失敗しました" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      vote_id: voteId,
      participant_token: newParticipantToken,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "予期せぬエラーが発生しました" },
      { status: 500 },
    );
  }
}
