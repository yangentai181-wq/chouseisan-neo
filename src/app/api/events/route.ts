import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createEventSchema } from "@/lib/validation";
import { generateEventId, generateToken, generateId } from "@/lib/utils/nanoid";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createEventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const {
      title,
      description,
      mode,
      duration_minutes,
      is_anonymous,
      candidates,
    } = parsed.data;
    const supabase = await createClient();

    const eventId = generateEventId();
    const hostToken = generateToken();

    // イベント作成
    const { error: eventError } = await supabase.from("events").insert({
      id: eventId,
      host_token: hostToken,
      title,
      description: description || null,
      mode: mode || "event",
      duration_minutes: duration_minutes || null,
      is_anonymous: is_anonymous || false,
    });

    if (eventError) {
      console.error("Event creation error:", eventError);
      return NextResponse.json(
        { error: "イベントの作成に失敗しました" },
        { status: 500 },
      );
    }

    // 候補日作成
    const candidateRecords = candidates.map((c, index) => ({
      id: generateId(),
      event_id: eventId,
      date: c.date,
      start_time: c.start_time || null,
      end_time: c.end_time || null,
      position: index,
    }));

    const { error: candidatesError } = await supabase
      .from("candidates")
      .insert(candidateRecords);

    if (candidatesError) {
      console.error("Candidates creation error:", candidatesError);
      // ロールバック: イベントを削除
      await supabase.from("events").delete().eq("id", eventId);
      return NextResponse.json(
        { error: "候補日の作成に失敗しました" },
        { status: 500 },
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    return NextResponse.json({
      event_id: eventId,
      host_token: hostToken,
      share_url: `${baseUrl}/e/${eventId}`,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "予期せぬエラーが発生しました" },
      { status: 500 },
    );
  }
}
