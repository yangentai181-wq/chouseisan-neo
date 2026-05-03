import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const finalizeSchema = z.object({
  host_token: z.string(),
  candidate_id: z.string(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId } = await params;
    const body = await request.json();
    const parsed = finalizeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { host_token, candidate_id } = parsed.data;
    const supabase = await createClient();

    // イベント取得・ホストトークン検証
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, host_token, status")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: "イベントが見つかりません" },
        { status: 404 },
      );
    }

    if (event.host_token !== host_token) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    // 候補日存在確認
    const { data: candidate, error: candidateError } = await supabase
      .from("candidates")
      .select("id")
      .eq("id", candidate_id)
      .eq("event_id", eventId)
      .single();

    if (candidateError || !candidate) {
      return NextResponse.json(
        { error: "候補日が見つかりません" },
        { status: 404 },
      );
    }

    // 確定
    const { error: updateError } = await supabase
      .from("events")
      .update({
        status: "finalized",
        finalized_candidate_id: candidate_id,
      })
      .eq("id", eventId);

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json(
        { error: "確定に失敗しました" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "予期せぬエラーが発生しました" },
      { status: 500 },
    );
  }
}
