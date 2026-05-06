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

function formatCandidate(c: Candidate): string {
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
            <th className="p-2 border border-border bg-gray-50 text-left min-w-[150px]">
              日程
            </th>
            {votes.map((vote) => (
              <th
                key={vote.id}
                className="p-2 border border-border bg-gray-50 text-center min-w-[60px]"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>{vote.participant_name}</span>
                  {vote.comment && (
                    <span
                      className="relative group cursor-help"
                      title={vote.comment}
                    >
                      <svg
                        className="w-4 h-4 text-muted"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-sm text-white bg-gray-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap max-w-[200px] text-wrap z-10 pointer-events-none">
                        {vote.comment}
                      </span>
                    </span>
                  )}
                </div>
              </th>
            ))}
            {isEditing && (
              <th className="p-2 border border-border bg-primary/10 text-center min-w-[60px]">
                あなた
              </th>
            )}
            <th className="p-2 border border-border bg-gray-50 text-center min-w-[80px]">
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
                              : "bg-gray-200 text-gray-500"
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
                            : "bg-gray-200 text-gray-500"
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
