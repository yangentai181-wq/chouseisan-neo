import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { VotingForm } from "@/components/voting";
import { ShareButtons } from "@/components/share/ShareButtons";
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

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const shareUrl = `${baseUrl}/e/${eventId}`;

  return (
    <main className="flex-1 flex flex-col items-center p-4">
      <div className="w-full max-w-4xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {event.title}
          </h1>
          {event.description && (
            <p className="text-muted">{event.description}</p>
          )}
        </header>

        <div className="bg-card-bg rounded-xl shadow-sm border border-border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">日程調整</h2>
          <VotingForm
            eventId={eventId}
            candidates={candidates || []}
            votes={votes || []}
            mode={event.mode || "event"}
            durationMinutes={event.duration_minutes}
          />
        </div>

        <div className="bg-card-bg rounded-xl shadow-sm border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">共有</h2>
          <ShareButtons
            url={shareUrl}
            title={event.title}
            candidates={candidates || []}
            responseDeadline={event.response_deadline}
          />
        </div>

        <footer className="mt-6 text-center space-x-4">
          <Link
            href={`/e/${eventId}/result`}
            className="text-primary hover:underline text-sm"
          >
            結果を見る
          </Link>
          <Link href="/" className="text-primary hover:underline text-sm">
            新規作成
          </Link>
        </footer>
      </div>
    </main>
  );
}
