import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateICS } from "@/lib/calendar/ics";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId } = await params;
    const candidateId = request.nextUrl.searchParams.get("candidateId");

    if (!candidateId) {
      return NextResponse.json(
        { error: "candidateId is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // イベント取得
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, title, description")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: "イベントが見つかりません" },
        { status: 404 },
      );
    }

    // 候補日取得
    const { data: candidate, error: candidateError } = await supabase
      .from("candidates")
      .select("*")
      .eq("id", candidateId)
      .single();

    if (candidateError || !candidate) {
      return NextResponse.json(
        { error: "候補日が見つかりません" },
        { status: 404 },
      );
    }

    const icsContent = generateICS({
      title: event.title,
      description: event.description || undefined,
      date: candidate.date,
      startTime: candidate.start_time || undefined,
      endTime: candidate.end_time || undefined,
      uid: `${eventId}-${candidateId}@chouseisan-neo`,
    });

    return new NextResponse(icsContent, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${event.title}.ics"`,
      },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "予期せぬエラーが発生しました" },
      { status: 500 },
    );
  }
}
