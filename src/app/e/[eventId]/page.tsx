import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EventLandingClient } from "./EventLandingClient";
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
    return { title: "イベントが見つかりません" };
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
    .select("id, title, description, mode")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    notFound();
  }

  // 投票者一覧取得
  const { data: votes } = await supabase
    .from("votes")
    .select("id, participant_name, participant_token")
    .eq("event_id", eventId);

  const modeLabel =
    event.mode === "meeting"
      ? "全員参加"
      : event.mode === "regular"
        ? "全員参加（定期開催）"
        : "多数決";

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
            {event.title}
          </h1>
          {event.description && (
            <p className="text-muted text-center mb-2">{event.description}</p>
          )}
          <p className="text-xs text-center text-gray-400 mb-6">{modeLabel}</p>

          <div className="space-y-3">
            <Link
              href={`/e/${eventId}/vote`}
              className="block w-full bg-primary text-white py-3 px-4 rounded-xl font-medium hover:bg-primary/90 transition-colors text-center"
            >
              新しく回答する
            </Link>

            <EventLandingClient eventId={eventId} participants={votes || []} />

            <Link
              href={`/e/${eventId}/result`}
              className="block w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-medium hover:bg-gray-200 transition-colors text-center"
            >
              結果をみる
            </Link>
          </div>

          {votes && votes.length > 0 && (
            <p className="text-xs text-center text-muted mt-4">
              {votes.length}人が回答済み
            </p>
          )}
        </div>

        <footer className="text-center">
          <Link href="/" className="text-primary hover:underline text-sm">
            新しいイベントを作成
          </Link>
        </footer>
      </div>
    </main>
  );
}
