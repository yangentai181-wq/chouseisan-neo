import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { VotingGrid } from "@/components/voting";
import { CalendarLinks } from "@/components/calendar";
import { HostOnlyShareButtons } from "@/components/share";
import { ManageLink } from "@/components/event/ManageLink";
import type { Candidate, VoteWithDetails, EventMode } from "@/types";

interface ResultPageProps {
  params: Promise<{ eventId: string }>;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const WEEKDAY_DATES = [
  "2000-01-02",
  "2000-01-03",
  "2000-01-04",
  "2000-01-05",
  "2000-01-06",
  "2000-01-07",
  "2000-01-08",
];

function isWeekdayDate(date: string): boolean {
  return WEEKDAY_DATES.includes(date);
}

function formatCandidate(c: Candidate): string {
  // 定期開催モードの曜日日付かどうかをチェック
  if (isWeekdayDate(c.date)) {
    const dayIndex = WEEKDAY_DATES.indexOf(c.date);
    const weekdayStr = `${WEEKDAYS[dayIndex]}曜日`;
    if (c.start_time && c.end_time) {
      return `${weekdayStr} ${c.start_time.slice(0, 5)}〜${c.end_time.slice(0, 5)}`;
    }
    if (c.start_time) {
      return `${weekdayStr} ${c.start_time.slice(0, 5)}〜`;
    }
    return weekdayStr;
  }

  const date = new Date(c.date);
  const dateStr = date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  if (c.start_time && c.end_time) {
    return `${dateStr} ${c.start_time.slice(0, 5)}〜${c.end_time.slice(0, 5)}`;
  }
  if (c.start_time) {
    return `${dateStr} ${c.start_time.slice(0, 5)}〜`;
  }
  return dateStr;
}

// イベントモード: 最多参加者の候補日を探す
function findBestCandidate(
  candidates: Candidate[],
  votes: VoteWithDetails[],
): Candidate | null {
  if (candidates.length === 0) return null;

  let bestCandidate = candidates[0];
  let bestScore = -1;

  for (const candidate of candidates) {
    let score = 0;
    for (const vote of votes) {
      const detail = vote.vote_details.find(
        (d) => d.candidate_id === candidate.id,
      );
      if (detail?.availability === "available") score += 2;
      if (detail?.availability === "maybe") score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  return bestCandidate;
}

// 全員集合モード: 全員が参加可能（unavailableでない）な候補を探す
function findAvailableForAll(
  candidates: Candidate[],
  votes: VoteWithDetails[],
): Candidate[] {
  if (votes.length === 0) return candidates; // 投票がなければ全候補がOK

  return candidates.filter((candidate) => {
    // 全員がこの候補日にunavailableでないか確認
    return votes.every((vote) => {
      const detail = vote.vote_details.find(
        (d) => d.candidate_id === candidate.id,
      );
      // detailがない場合はavailable扱い（全員集合モードのデフォルト）
      return !detail || detail.availability !== "unavailable";
    });
  });
}

// 定例モード: 4段階評価の加重平均でランキング
// ◎希望=3pt, ○OK=2pt, △可能=1pt, ×不可=0pt
interface CandidateRanking {
  candidate: Candidate;
  score: number;
  preferredCount: number; // ◎
  availableCount: number; // ○
  maybeCount: number; // △
  unavailableCount: number; // ×
}

function calculatePreferenceRanking(
  candidates: Candidate[],
  votes: VoteWithDetails[],
): CandidateRanking[] {
  const rankings: CandidateRanking[] = candidates.map((candidate) => {
    let score = 0;
    let preferredCount = 0;
    let availableCount = 0;
    let maybeCount = 0;
    let unavailableCount = 0;

    for (const vote of votes) {
      const detail = vote.vote_details.find(
        (d) => d.candidate_id === candidate.id,
      );
      if (detail?.availability === "preferred") {
        score += 3;
        preferredCount++;
      } else if (detail?.availability === "available") {
        score += 2;
        availableCount++;
      } else if (detail?.availability === "maybe") {
        score += 1;
        maybeCount++;
      } else {
        unavailableCount++;
      }
    }

    return {
      candidate,
      score,
      preferredCount,
      availableCount,
      maybeCount,
      unavailableCount,
    };
  });

  // スコア降順、同点なら◎数→○数で比較
  return rankings.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.preferredCount !== a.preferredCount)
      return b.preferredCount - a.preferredCount;
    return b.availableCount - a.availableCount;
  });
}

export default async function ResultPage({ params }: ResultPageProps) {
  const { eventId } = await params;
  const supabase = await createClient();

  // イベント取得
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select(
      "id, title, description, mode, duration_minutes, status, finalized_candidate_id, created_at, updated_at",
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

  const candidateList = candidates || [];
  const voteList = votes || [];
  const mode: EventMode = event.mode || "event";

  // モードによって結果表示を変える
  let selectedCandidate: Candidate | null = null;
  let availableCandidates: Candidate[] = [];
  let preferenceRankings: CandidateRanking[] = [];

  if (event.finalized_candidate_id) {
    selectedCandidate =
      candidateList.find((c) => c.id === event.finalized_candidate_id) || null;
  } else if (mode === "meeting") {
    // 全員集合モード: 全員がOKな候補を探す
    availableCandidates = findAvailableForAll(candidateList, voteList);
    selectedCandidate = availableCandidates[0] || null;
  } else if (mode === "regular") {
    // 定例モード: 希望順位の加重平均でランキング
    preferenceRankings = calculatePreferenceRanking(candidateList, voteList);
    selectedCandidate = preferenceRankings[0]?.candidate || null;
  } else {
    // イベントモード: 最多参加者の候補日
    selectedCandidate = findBestCandidate(candidateList, voteList);
  }

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
          <p className="text-sm text-muted mt-1">
            {mode === "meeting"
              ? "全員参加モード"
              : mode === "regular"
                ? "定期開催モード"
                : "多数決モード"}
          </p>
        </header>

        {mode === "meeting" ? (
          // 全員集合モードの結果表示
          <div className="mb-6">
            {availableCandidates.length > 0 ? (
              <div className="bg-success/10 border border-success rounded-xl p-6">
                <h2 className="text-lg font-semibold text-success mb-3">
                  全員参加可能な日時 ({availableCandidates.length}件)
                </h2>
                <div className="space-y-3">
                  {availableCandidates.map((candidate, index) => (
                    <div
                      key={candidate.id}
                      className={`p-4 rounded-lg ${index === 0 ? "bg-white border-2 border-success" : "bg-white/50"}`}
                    >
                      <p className="font-medium">
                        {formatCandidate(candidate)}
                      </p>
                      {index === 0 && (
                        <div className="mt-3">
                          <CalendarLinks
                            eventId={eventId}
                            eventTitle={event.title}
                            eventDescription={event.description}
                            candidate={candidate}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : voteList.length === 0 ? (
              <div className="bg-gray-100 rounded-xl p-6 text-center">
                <p className="text-muted">まだ回答がありません</p>
              </div>
            ) : (
              <div className="bg-warning/10 border border-warning rounded-xl p-6">
                <h2 className="text-lg font-semibold text-warning mb-2">
                  全員が参加できる日時が見つかりません
                </h2>
                <p className="text-sm text-muted">
                  候補日を追加するか、参加者に再調整をお願いしてください
                </p>
              </div>
            )}
          </div>
        ) : mode === "regular" ? (
          // 定例モードの結果表示
          <div className="mb-6">
            {preferenceRankings.length > 0 && voteList.length > 0 ? (
              <div className="bg-success/10 border border-success rounded-xl p-6">
                <h2 className="text-lg font-semibold text-success mb-3">
                  希望順位ランキング
                </h2>
                <div className="space-y-3">
                  {preferenceRankings.slice(0, 5).map((ranking, index) => (
                    <div
                      key={ranking.candidate.id}
                      className={`p-4 rounded-lg ${index === 0 ? "bg-white border-2 border-success" : "bg-white/50"}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">
                          {index + 1}位: {formatCandidate(ranking.candidate)}
                        </p>
                        <span className="text-sm font-semibold text-primary">
                          {ranking.score}pt
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                        <span className="bg-primary/20 text-primary px-2 py-0.5 rounded">
                          ◎希望: {ranking.preferredCount}
                        </span>
                        <span className="bg-success/20 text-success px-2 py-0.5 rounded">
                          ○OK: {ranking.availableCount}
                        </span>
                        <span className="bg-warning/20 text-warning px-2 py-0.5 rounded">
                          △可能: {ranking.maybeCount}
                        </span>
                        <span className="bg-gray-100 px-2 py-0.5 rounded">
                          ×不可: {ranking.unavailableCount}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : voteList.length === 0 ? (
              <div className="bg-gray-100 rounded-xl p-6 text-center">
                <p className="text-muted">まだ回答がありません</p>
              </div>
            ) : (
              <div className="bg-gray-100 rounded-xl p-6 text-center">
                <p className="text-muted">希望順位の投票がありません</p>
              </div>
            )}
          </div>
        ) : (
          // イベントモード（従来）の結果表示
          selectedCandidate && (
            <div className="bg-success/10 border border-success rounded-xl p-6 mb-6">
              <h2 className="text-lg font-semibold text-success mb-2">
                {event.status === "finalized" ? "確定日程" : "最多参加候補"}
              </h2>
              <p className="text-xl font-medium mb-4">
                {formatCandidate(selectedCandidate)}
              </p>
              <CalendarLinks
                eventId={eventId}
                eventTitle={event.title}
                eventDescription={event.description}
                candidate={selectedCandidate}
              />
            </div>
          )
        )}

        <div className="bg-card-bg rounded-xl shadow-sm border border-border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">回答一覧</h2>
            <ManageLink eventId={eventId} />
          </div>
          <VotingGrid candidates={candidateList} votes={voteList} />
        </div>

        <HostOnlyShareButtons
          eventId={eventId}
          url={shareUrl}
          title={event.title}
          candidates={candidateList}
          finalizedCandidate={
            event.status === "finalized" ? selectedCandidate : null
          }
        />

        <footer className="mt-6 text-center space-x-4">
          <Link
            href={`/e/${eventId}`}
            className="text-primary hover:underline text-sm"
          >
            回答ページに戻る
          </Link>
          <Link href="/" className="text-primary hover:underline text-sm">
            新規作成
          </Link>
        </footer>
      </div>
    </main>
  );
}
