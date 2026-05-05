"use client";

import { useState, useMemo } from "react";
import type { Candidate, Availability } from "@/types";

interface TimeBlockVotingProps {
  candidates: Candidate[];
  currentVotes: Record<string, Availability>;
  onVoteChange: (candidateId: string, availability: Availability) => void;
}

const WEEKDAY_DATES = [
  "2000-01-02",
  "2000-01-03",
  "2000-01-04",
  "2000-01-05",
  "2000-01-06",
  "2000-01-07",
  "2000-01-08",
];

function formatDate(dateStr: string): string {
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

  // 定期開催モードの曜日日付かどうかをチェック
  if (WEEKDAY_DATES.includes(dateStr)) {
    const dayIndex = WEEKDAY_DATES.indexOf(dateStr);
    return `${weekdays[dayIndex]}曜日`;
  }

  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = weekdays[date.getDay()];
  return `${month}/${day}(${weekday})`;
}

function formatTimeRange(start: string | null, end: string | null): string {
  if (!start) return "終日";
  const startHM = start.slice(0, 5);
  if (!end) return startHM;
  return `${startHM}〜${end.slice(0, 5)}`;
}

export function TimeBlockVoting({
  candidates,
  currentVotes,
  onVoteChange,
}: TimeBlockVotingProps) {
  // 日付でグループ化
  const candidatesByDate = useMemo(() => {
    const grouped: Record<string, Candidate[]> = {};
    candidates.forEach((c) => {
      if (!grouped[c.date]) {
        grouped[c.date] = [];
      }
      grouped[c.date].push(c);
    });
    // 日付順にソート
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [candidates]);

  const toggleUnavailable = (candidateId: string) => {
    const current = currentVotes[candidateId] || "available";
    // 全員集合モードでは available（空き）と unavailable（来れない）のみ
    const next: Availability =
      current === "unavailable" ? "available" : "unavailable";
    onVoteChange(candidateId, next);
  };

  // 時間帯フィルタ
  const isMorning = (c: Candidate) => {
    if (!c.start_time) return false;
    const hour = parseInt(c.start_time.slice(0, 2), 10);
    return hour < 12;
  };

  const isAfternoon = (c: Candidate) => {
    if (!c.start_time) return true; // 終日は午後扱い
    const hour = parseInt(c.start_time.slice(0, 2), 10);
    return hour >= 12;
  };

  // 日付単位で来れない/空きにする
  const toggleCandidates = (
    targetCandidates: Candidate[],
    toUnavailable: boolean,
  ) => {
    targetCandidates.forEach((c) => {
      onVoteChange(c.id, toUnavailable ? "unavailable" : "available");
    });
  };

  // 指定候補群のステータス
  const getStatus = (
    targetCandidates: Candidate[],
  ): "all" | "none" | "partial" => {
    if (targetCandidates.length === 0) return "none";
    const unavailableCount = targetCandidates.filter(
      (c) => currentVotes[c.id] === "unavailable",
    ).length;
    if (unavailableCount === 0) return "none";
    if (unavailableCount === targetCandidates.length) return "all";
    return "partial";
  };

  // 全ての選択をリセット
  const resetAll = () => {
    candidates.forEach((c) => {
      onVoteChange(c.id, "available");
    });
  };

  const hasAnyUnavailable = candidates.some(
    (c) => currentVotes[c.id] === "unavailable",
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div className="text-sm text-muted">
          <p>都合のつかない時間帯を選択してください</p>
          <div className="flex gap-4 mt-2">
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 bg-background rounded border border-border" />
              参加可
            </span>
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 bg-gray-800 rounded" />
              参加不可
            </span>
          </div>
        </div>
        {hasAnyUnavailable && (
          <button
            type="button"
            onClick={resetAll}
            className="text-xs text-primary hover:underline"
          >
            全てリセット
          </button>
        )}
      </div>

      {candidatesByDate.map(([date, dateCandidates]) => {
        const morningCandidates = dateCandidates.filter(isMorning);
        const afternoonCandidates = dateCandidates.filter(isAfternoon);

        const allStatus = getStatus(dateCandidates);
        const morningStatus = getStatus(morningCandidates);
        const afternoonStatus = getStatus(afternoonCandidates);

        return (
          <div key={date} className="bg-background rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-foreground">
                {formatDate(date)}
              </h3>
              <div className="flex gap-1">
                {morningCandidates.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      toggleCandidates(
                        morningCandidates,
                        morningStatus !== "all",
                      )
                    }
                    className={`text-xs px-2 py-1 rounded transition-all ${
                      morningStatus === "all"
                        ? "bg-gray-800 text-white"
                        : "bg-white border border-border hover:bg-background"
                    }`}
                  >
                    午前×
                  </button>
                )}
                {afternoonCandidates.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      toggleCandidates(
                        afternoonCandidates,
                        afternoonStatus !== "all",
                      )
                    }
                    className={`text-xs px-2 py-1 rounded transition-all ${
                      afternoonStatus === "all"
                        ? "bg-gray-800 text-white"
                        : "bg-white border border-border hover:bg-background"
                    }`}
                  >
                    午後×
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    toggleCandidates(dateCandidates, allStatus !== "all")
                  }
                  className={`text-xs px-2 py-1 rounded transition-all ${
                    allStatus === "all"
                      ? "bg-gray-800 text-white"
                      : "bg-white border border-border hover:bg-background"
                  }`}
                >
                  終日×
                </button>
              </div>
            </div>
            <div className="grid gap-2">
              {dateCandidates.map((candidate) => {
                const isUnavailable =
                  currentVotes[candidate.id] === "unavailable";
                return (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => toggleUnavailable(candidate.id)}
                    className={`w-full p-3 rounded-lg text-left transition-all ${
                      isUnavailable
                        ? "bg-gray-800 text-white"
                        : "bg-white border border-border hover:border-border"
                    }`}
                  >
                    <span className="font-medium">
                      {formatTimeRange(
                        candidate.start_time,
                        candidate.end_time,
                      )}
                    </span>
                    {isUnavailable && (
                      <span className="ml-2 text-sm opacity-75">
                        × 参加不可
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
