"use client";

import { useState, useEffect } from "react";
import type { Candidate, VoteWithDetails, Availability } from "@/types";

interface VotingGridProps {
  candidates: Candidate[];
  votes: VoteWithDetails[];
  currentVotes?: Record<string, Availability>;
  onCellClick?: (candidateId: string) => void;
  isEditing?: boolean;
}

// モバイル判定のブレークポイント
const MOBILE_BREAKPOINT = 768;

const symbols: Record<Availability, string> = {
  preferred: "◎",
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
): { preferred: number; available: number; maybe: number } {
  let preferred = 0;
  let available = 0;
  let maybe = 0;

  for (const vote of votes) {
    const detail = vote.vote_details.find(
      (d) => d.candidate_id === candidateId,
    );
    if (detail?.availability === "preferred") preferred++;
    if (detail?.availability === "available") available++;
    if (detail?.availability === "maybe") maybe++;
  }

  return { preferred, available, maybe };
}

function AvailabilityBadge({
  availability,
  onClick,
  isButton = false,
}: {
  availability: Availability;
  onClick?: () => void;
  isButton?: boolean;
}) {
  const baseClass = `inline-flex items-center justify-center w-8 h-8 rounded ${
    availability === "preferred"
      ? "bg-primary text-white"
      : availability === "available"
        ? "bg-success text-white"
        : availability === "maybe"
          ? "bg-warning text-white"
          : "bg-border text-muted"
  }`;

  if (isButton && onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseClass} cursor-pointer transition-colors`}
      >
        {symbols[availability]}
      </button>
    );
  }

  return <span className={baseClass}>{symbols[availability]}</span>;
}

function CountsSummary({
  counts,
}: {
  counts: { preferred: number; available: number; maybe: number };
}) {
  return (
    <span className="text-sm">
      {counts.preferred > 0 && (
        <>
          <span className="text-primary font-medium">◎{counts.preferred}</span>
          <span className="mx-0.5">/</span>
        </>
      )}
      <span className="text-success font-medium">○{counts.available}</span>
      <span className="mx-0.5">/</span>
      <span className="text-warning font-medium">△{counts.maybe}</span>
    </span>
  );
}

// モバイル用カードビュー
function MobileCardView({
  candidates,
  votes,
  currentVotes,
  onCellClick,
  isEditing,
}: VotingGridProps) {
  return (
    <div className="space-y-3">
      {candidates.map((candidate) => {
        const counts = countAvailability(candidate.id, votes);
        return (
          <div
            key={candidate.id}
            className="bg-card-bg border border-border rounded-xl p-4"
          >
            {/* 日程と集計 */}
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-sm">
                {formatCandidate(candidate)}
              </span>
              <CountsSummary counts={counts} />
            </div>

            {/* 参加者の回答 */}
            {votes.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {votes.map((vote) => {
                  const detail = vote.vote_details.find(
                    (d) => d.candidate_id === candidate.id,
                  );
                  const availability = detail?.availability || "unavailable";
                  return (
                    <div
                      key={vote.id}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <AvailabilityBadge availability={availability} />
                      <span className="text-muted truncate max-w-[60px]">
                        {vote.participant_name}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 編集モード時のあなたの回答 */}
            {isEditing && currentVotes && (
              <div className="pt-3 border-t border-border flex items-center justify-between">
                <span className="text-sm text-muted">あなたの回答</span>
                <AvailabilityBadge
                  availability={currentVotes[candidate.id] || "unavailable"}
                  onClick={() => onCellClick?.(candidate.id)}
                  isButton
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// デスクトップ用テーブルビュー
function DesktopTableView({
  candidates,
  votes,
  currentVotes,
  onCellClick,
  isEditing,
}: VotingGridProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="p-2 border border-border bg-background text-left min-w-[150px] sticky left-0 z-10">
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
                <td className="p-2 border border-border text-sm bg-background sticky left-0 z-10">
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
                      <AvailabilityBadge availability={availability} />
                    </td>
                  );
                })}
                {isEditing && currentVotes && (
                  <td className="p-2 border border-border text-center">
                    <AvailabilityBadge
                      availability={currentVotes[candidate.id] || "unavailable"}
                      onClick={() => onCellClick?.(candidate.id)}
                      isButton
                    />
                  </td>
                )}
                <td className="p-2 border border-border text-center">
                  <CountsSummary counts={counts} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function VotingGrid(props: VotingGridProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (isMobile) {
    return <MobileCardView {...props} />;
  }

  return <DesktopTableView {...props} />;
}
