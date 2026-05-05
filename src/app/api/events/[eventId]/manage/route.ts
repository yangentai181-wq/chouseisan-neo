import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId } = await params;
    const hostToken = request.headers.get("x-host-token");

    if (!hostToken) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const supabase = await createClient();

    // イベント取得・トークン検証
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select(
        "id, title, description, mode, duration_minutes, response_deadline, status, finalized_candidate_id, host_token, created_at, updated_at",
      )
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: "イベントが見つかりません" },
        { status: 404 },
      );
    }

    if (event.host_token !== hostToken) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    // 候補日取得
    const { data: candidates } = await supabase
      .from("candidates")
      .select("*")
      .eq("event_id", eventId)
      .order("position", { ascending: true });

    // 投票取得
    const { data: votes } = await supabase
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
          availability,
          preference
        )
      `,
      )
      .eq("event_id", eventId);

    // host_token を除外してレスポンス
    const { host_token: _, ...eventWithoutToken } = event;

    return NextResponse.json({
      event: eventWithoutToken,
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
