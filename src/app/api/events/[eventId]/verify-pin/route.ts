import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const verifyPinSchema = z.object({
  pin: z.string().regex(/^\d{4}$/, "PINは4桁の数字です"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId } = await params;
    const body = await request.json();
    const parsed = verifyPinSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { pin } = parsed.data;
    const supabase = await createClient();

    // イベント取得
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, host_token, host_pin")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: "イベントが見つかりません" },
        { status: 404 },
      );
    }

    // PIN検証
    if (event.host_pin !== pin) {
      return NextResponse.json(
        { error: "PINが正しくありません" },
        { status: 401 },
      );
    }

    // 成功: host_tokenを返す
    return NextResponse.json({ host_token: event.host_token });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "予期せぬエラーが発生しました" },
      { status: 500 },
    );
  }
}
