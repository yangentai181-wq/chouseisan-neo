"use client";

import type { Candidate, VoteWithDetails, Availability } from "@/types";

interface VotingGridProps {
  candidates: Candidate[];
  votes: VoteWithDetails[];
  currentVotes?: Record<string, Availability>;
  onCellClick?: (candidateId: string) => void;
  isEditing?: boolean;
}

const symbols: Record<Availability, string> = {
  available: "○",
  maybe: "△",
  unavailable: "×",
};

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
    const weekdayStr = `${WEEKDAYS[dayIndex]}曜`;
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
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });
  if (c.start_time && c.end_time) {
    return `${dateStr} ${c.start_time.slice(0, 5)}〜${c.end_time.slice(0, 5)}`;
  }
  if (c.start_time) {
    return `${dateStr} ${c.start_time.slice(0, 5)}〜`;
  }
  return dateStr;
}

function countAvailability(
  candidateId: string,
  votes: VoteWithDetails[],
): { available: number; maybe: number } {
  let available = 0;
  let maybe = 0;

  for (const vote of votes) {
    const detail = vote.vote_details.find(
      (d) => d.candidate_id === candidateId,
    );
    if (detail?.availability === "available") available++;
    if (detail?.availability === "maybe") maybe++;
  }

  return { available, maybe };
}

export function VotingGrid({
  candidates,
  votes,
  currentVotes,
  onCellClick,
  isEditing = false,
}: VotingGridProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="p-2 border border-border bg-background text-left min-w-[150px]">
              日程
            </th>
            {votes.map((vote) => (
              <th
                key={vote.id}
                className="p-2 border border-border bg-background text-center min-w-[60px]"
              >
                {vote.participant_name}
              </th>
            ))}
            {isEditing && (
              <th className="p-2 border border-border bg-primary/10 text-center min-w-[60px]">
                あなた
              </th>
            )}
            <th className="p-2 border border-border bg-background text-center min-w-[80px]">
              集計
            </th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((candidate) => {
            const counts = countAvailability(candidate.id, votes);
            return (
              <tr key={candidate.id}>
                <td className="p-2 border border-border text-sm">
                  {formatCandidate(candidate)}
                </td>
                {votes.map((vote) => {
                  const detail = vote.vote_details.find(
                    (d) => d.candidate_id === candidate.id,
                  );
                  const availability = detail?.availability || "unavailable";
                  return (
                    <td
                      key={vote.id}
                      className="p-2 border border-border text-center"
                    >
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded ${
                          availability === "available"
                            ? "bg-success text-white"
                            : availability === "maybe"
                              ? "bg-warning text-white"
                              : "bg-border text-muted"
                        }`}
                      >
                        {symbols[availability]}
                      </span>
                    </td>
                  );
                })}
                {isEditing && currentVotes && (
                  <td className="p-2 border border-border text-center">
                    <button
                      type="button"
                      onClick={() => onCellClick?.(candidate.id)}
                      className={`inline-flex items-center justify-center w-8 h-8 rounded cursor-pointer transition-colors ${
                        currentVotes[candidate.id] === "available"
                          ? "bg-success text-white"
                          : currentVotes[candidate.id] === "maybe"
                            ? "bg-warning text-white"
                            : "bg-border text-muted"
                      }`}
                    >
                      {symbols[currentVotes[candidate.id] || "unavailable"]}
                    </button>
                  </td>
                )}
                <td className="p-2 border border-border text-center text-sm">
                  <span className="text-success font-medium">
                    ○{counts.available}
                  </span>
                  <span className="mx-1">/</span>
                  <span className="text-warning font-medium">
                    △{counts.maybe}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
