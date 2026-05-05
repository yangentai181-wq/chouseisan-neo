import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EventPageClient } from "@/components/event/EventPageClient";
import type { Metadata } from "next";

interface EventPageProps {
  params: Promise<{ eventId: string }>;
}

export async function generateMetadata({
  params,
}: EventPageProps): Promise<Metadata> {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("title, description")
    .eq("id", eventId)
    .single();

  if (!event) {
    return { title: "ページが見つかりません" };
  }

  return {
    title: `${event.title} | 調整さんネオ`,
    description: event.description || "日程調整に参加しましょう",
    openGraph: {
      title: `${event.title} | 調整さんネオ`,
      description: event.description || "日程調整に参加しましょう",
    },
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const { eventId } = await params;
  const supabase = await createClient();

  // イベント取得
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select(
      "id, title, description, mode, duration_minutes, response_deadline, status, finalized_candidate_id, created_at, updated_at",
    )
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    notFound();
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

  return (
    <EventPageClient
      eventId={eventId}
      event={{
        title: event.title,
        description: event.description,
        mode: event.mode || "event",
        duration_minutes: event.duration_minutes,
        response_deadline: event.response_deadline,
      }}
      candidates={candidates || []}
      votes={votes || []}
    />
  );
}
