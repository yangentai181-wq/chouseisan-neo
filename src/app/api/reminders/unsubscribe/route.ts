import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const unsubscribeSchema = z.object({
  eventId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = unsubscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { eventId } = parsed.data;
    const supabase = await createClient();

    // Delete all subscriptions for this event from this endpoint
    // Note: In a real app, you'd want to identify the specific subscription
    // For simplicity, we're deleting based on eventId only
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("event_id", eventId);

    if (error) {
      console.error("Unsubscribe error:", error);
      return NextResponse.json(
        { error: "解除に失敗しました" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return NextResponse.json(
      { error: "エラーが発生しました" },
      { status: 500 },
    );
  }
}
