"use client";

import { useState, useMemo, useCallback } from "react";
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
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

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

  // グリッド表示用データ
  const gridData = useMemo(() => {
    // 全日付を取得（WEEKDAY_DATESの場合は月曜始まりでソート）
    const dates = [...new Set(candidates.map((c) => c.date))].sort((a, b) => {
      const aIsWeekday = WEEKDAY_DATES.includes(a);
      const bIsWeekday = WEEKDAY_DATES.includes(b);
      if (aIsWeekday && bIsWeekday) {
        const aIdx = WEEKDAY_DATES.indexOf(a);
        const bIdx = WEEKDAY_DATES.indexOf(b);
        const aOrder = aIdx === 0 ? 7 : aIdx; // 日曜を最後に
        const bOrder = bIdx === 0 ? 7 : bIdx;
        return aOrder - bOrder;
      }
      return a.localeCompare(b);
    });
    const timeSlots = [
      ...new Set(candidates.map((c) => c.start_time || "終日")),
    ].sort();

    const cellMap: Record<string, Record<string, Candidate | null>> = {};
    timeSlots.forEach((time) => {
      cellMap[time] = {};
      dates.forEach((date) => {
        const candidate = candidates.find(
          (c) => c.date === date && (c.start_time || "終日") === time,
        );
        cellMap[time][date] = candidate || null;
      });
    });

    return { dates, timeSlots, cellMap };
  }, [candidates]);

  // グリッドが有効かどうか
  const canUseGrid =
    gridData.dates.length >= 2 && gridData.timeSlots.length >= 2;

  // 短い日付フォーマット
  const formatShortDate = useCallback((dateStr: string): string => {
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    if (WEEKDAY_DATES.includes(dateStr)) {
      const dayIndex = WEEKDAY_DATES.indexOf(dateStr);
      return weekdays[dayIndex];
    }
    const date = new Date(dateStr);
    const weekday = weekdays[date.getDay()];
    return `${date.getMonth() + 1}/${date.getDate()}(${weekday})`;
  }, []);

  // 短い時間フォーマット
  const formatShortTime = useCallback((time: string): string => {
    if (time === "終日") return "終日";
    return time.slice(0, 5);
  }, []);

  // 列（日付）一括トグル
  const toggleColumn = useCallback(
    (date: string) => {
      const dateCandidates = candidates.filter((c) => c.date === date);
      const allUnavailable = dateCandidates.every(
        (c) => currentVotes[c.id] === "unavailable",
      );
      dateCandidates.forEach((c) => {
        onVoteChange(c.id, allUnavailable ? "available" : "unavailable");
      });
    },
    [candidates, currentVotes, onVoteChange],
  );

  // 行（時間帯）一括トグル
  const toggleRow = useCallback(
    (time: string) => {
      const timeCandidates = candidates.filter(
        (c) => (c.start_time || "終日") === time,
      );
      const allUnavailable = timeCandidates.every(
        (c) => currentVotes[c.id] === "unavailable",
      );
      timeCandidates.forEach((c) => {
        onVoteChange(c.id, allUnavailable ? "available" : "unavailable");
      });
    },
    [candidates, currentVotes, onVoteChange],
  );

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

      {/* 表示モード切替 */}
      {canUseGrid && (
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`px-3 py-1 text-sm rounded-lg transition-all ${
              viewMode === "grid"
                ? "bg-primary text-white"
                : "bg-background text-muted hover:bg-border"
            }`}
          >
            カレンダー
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`px-3 py-1 text-sm rounded-lg transition-all ${
              viewMode === "list"
                ? "bg-primary text-white"
                : "bg-background text-muted hover:bg-border"
            }`}
          >
            リスト
          </button>
        </div>
      )}

      {/* カレンダーグリッド表示 */}
      {canUseGrid && viewMode === "grid" && (
        <div className="bg-background rounded-lg p-4 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-1 text-xs text-muted font-normal w-14"></th>
                {gridData.dates.map((date) => (
                  <th key={date} className="p-1 min-w-[44px]">
                    <button
                      type="button"
                      onClick={() => toggleColumn(date)}
                      className="w-full text-xs text-foreground font-medium text-center px-1 py-1 rounded hover:bg-primary/10 transition-colors"
                      title="この列をまとめて変更"
                    >
                      {formatShortDate(date)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gridData.timeSlots.map((time) => (
                <tr key={time}>
                  <td className="p-1">
                    <button
                      type="button"
                      onClick={() => toggleRow(time)}
                      className="text-xs text-muted text-right pr-2 whitespace-nowrap w-full py-1 rounded hover:bg-primary/10 transition-colors"
                      title="この行をまとめて変更"
                    >
                      {formatShortTime(time)}
                    </button>
                  </td>
                  {gridData.dates.map((date) => {
                    const candidate = gridData.cellMap[time][date];
                    if (!candidate) {
                      return (
                        <td key={date} className="p-1">
                          <div className="w-10 h-10 bg-gray-100 rounded opacity-30" />
                        </td>
                      );
                    }
                    const isUnavailable =
                      currentVotes[candidate.id] === "unavailable";
                    return (
                      <td key={date} className="p-1">
                        <button
                          type="button"
                          onClick={() => toggleUnavailable(candidate.id)}
                          className={`w-10 h-10 rounded-lg text-lg font-medium transition-all active:scale-95 ${
                            isUnavailable
                              ? "bg-gray-800 text-white"
                              : "bg-white border border-border"
                          }`}
                        >
                          {isUnavailable ? "×" : "○"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted mt-2 text-center">
            タップで参加可/不可を切り替え
          </p>
        </div>
      )}

      {/* リスト表示（コンパクト） */}
      {(!canUseGrid || viewMode === "list") &&
        candidatesByDate.map(([date, dateCandidates]) => {
          const morningCandidates = dateCandidates.filter(isMorning);
          const afternoonCandidates = dateCandidates.filter(isAfternoon);

          const allStatus = getStatus(dateCandidates);
          const morningStatus = getStatus(morningCandidates);
          const afternoonStatus = getStatus(afternoonCandidates);

          return (
            <div key={date} className="bg-background rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-foreground">
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
                      className={`text-xs px-2 py-0.5 rounded transition-all ${
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
                      className={`text-xs px-2 py-0.5 rounded transition-all ${
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
                    className={`text-xs px-2 py-0.5 rounded transition-all ${
                      allStatus === "all"
                        ? "bg-gray-800 text-white"
                        : "bg-white border border-border hover:bg-background"
                    }`}
                  >
                    終日×
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {dateCandidates.map((candidate) => {
                  const isUnavailable =
                    currentVotes[candidate.id] === "unavailable";
                  return (
                    <button
                      key={candidate.id}
                      type="button"
                      onClick={() => toggleUnavailable(candidate.id)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-all active:scale-95 ${
                        isUnavailable
                          ? "bg-gray-800 text-white"
                          : "bg-white border border-border"
                      }`}
                    >
                      {formatTimeRange(
                        candidate.start_time,
                        candidate.end_time,
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
