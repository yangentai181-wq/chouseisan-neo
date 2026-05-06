import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { VoteCompleteClient } from "./VoteCompleteClient";

interface CompletePageProps {
  params: Promise<{ eventId: string }>;
}

export default async function CompletePage({ params }: CompletePageProps) {
  const { eventId } = await params;
  const supabase = await createClient();

  // イベント取得
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title, description")
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

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-success"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            投票が完了しました！
          </h1>
          <p className="text-muted mb-6">{event.title}</p>

          <div className="space-y-3">
            <Link
              href={`/e/${eventId}/result`}
              className="block w-full bg-primary text-white py-3 px-4 rounded-xl font-medium hover:bg-primary/90 transition-colors"
            >
              結果を見る
            </Link>

            <Link
              href={`/e/${eventId}`}
              className="block w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              投票ページに戻る
            </Link>
          </div>
        </div>

        <VoteCompleteClient eventId={eventId} participants={votes || []} />

        <footer className="mt-6 text-center">
          <Link href="/" className="text-primary hover:underline text-sm">
            新しいイベントを作成
          </Link>
        </footer>
      </div>
    </main>
  );
}
