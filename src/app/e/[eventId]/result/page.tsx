import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ResultPageClient } from "@/components/event/ResultPageClient";
import type { Candidate, VoteWithDetails, EventMode } from "@/types";

interface ResultPageProps {
  params: Promise<{ eventId: string }>;
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

  return (
    <ResultPageClient
      eventId={eventId}
      event={{
        title: event.title,
        description: event.description,
        mode,
        status: event.status,
        finalized_candidate_id: event.finalized_candidate_id,
      }}
      candidates={candidateList}
      votes={voteList}
      selectedCandidate={selectedCandidate}
      availableCandidates={availableCandidates}
      preferenceRankings={preferenceRankings}
    />
  );
}
