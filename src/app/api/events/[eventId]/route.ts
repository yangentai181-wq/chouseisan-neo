import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId } = await params;
    const supabase = await createClient();

    // イベント取得
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select(
        "id, title, description, status, finalized_candidate_id, created_at, updated_at",
      )
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: "イベントが見つかりません" },
        { status: 404 },
      );
    }

    // 候補日取得
    const { data: candidates, error: candidatesError } = await supabase
      .from("candidates")
      .select("*")
      .eq("event_id", eventId)
      .order("position", { ascending: true });

    if (candidatesError) {
      return NextResponse.json(
        { error: "候補日の取得に失敗しました" },
        { status: 500 },
      );
    }

    // 投票取得（詳細含む）
    const { data: votes, error: votesError } = await supabase
      .from("votes")
      .select(
        `
        id,
        event_id,
        participant_name,
        participant_token,
        vote_details (
          id,
          vote_id,
          candidate_id,
          availability
        )
      `,
      )
      .eq("event_id", eventId);

    if (votesError) {
      return NextResponse.json(
        { error: "投票の取得に失敗しました" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      event,
      candidates: candidates || [],
      votes: votes || [],
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "予期せぬエラーが発生しました" },
      { status: 500 },
    );
  }
}
