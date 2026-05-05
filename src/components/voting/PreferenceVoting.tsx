"use client";

import { useMemo, useCallback, useState } from "react";
import type { Candidate, Availability } from "@/types";

interface PreferenceVotingProps {
  candidates: Candidate[];
  currentVotes: Record<string, Availability>;
  currentPreferences: Record<string, number | null>;
  onVoteChange: (
    candidateId: string,
    availability: Availability,
    preference: number | null,
  ) => void;
}

// 状態の循環順序
const AVAILABILITY_CYCLE: Availability[] = [
  "unavailable",
  "preferred",
  "available",
  "maybe",
];

// 4段階評価オプション
const AVAILABILITY_OPTIONS = [
  {
    value: "preferred" as const,
    label: "希望",
    icon: "◎",
    color: "bg-primary",
    textColor: "text-white",
    description: "ぜひこの時間がいい",
  },
  {
    value: "available" as const,
    label: "OK",
    icon: "○",
    color: "bg-success",
    textColor: "text-white",
    description: "問題なく参加できる",
  },
  {
    value: "maybe" as const,
    label: "可能",
    icon: "△",
    color: "bg-warning",
    textColor: "text-white",
    description: "できれば避けたい",
  },
  {
    value: "unavailable" as const,
    label: "不可",
    icon: "×",
    color: "bg-border",
    textColor: "text-muted",
    description: "参加できない",
  },
];

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

export function PreferenceVoting({
  candidates,
  currentVotes,
  onVoteChange,
}: PreferenceVotingProps) {
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
    // 全時間帯を取得（開始時間でユニーク化）
    const timeSlots = [
      ...new Set(candidates.map((c) => c.start_time || "終日")),
    ].sort();

    // 日付×時間 → 候補IDのマップを作成
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

  // グリッドが有効かどうか（2日以上かつ2時間帯以上）
  const canUseGrid =
    gridData.dates.length >= 2 && gridData.timeSlots.length >= 2;

  // 各評価の件数をカウント
  const availabilityCounts = useMemo(() => {
    const counts: Record<Availability, number> = {
      preferred: 0,
      available: 0,
      maybe: 0,
      unavailable: 0,
    };
    Object.values(currentVotes).forEach((avail) => {
      counts[avail]++;
    });
    return counts;
  }, [currentVotes]);

  const handleAvailabilityClick = (
    candidateId: string,
    availability: Availability,
  ) => {
    // preference は使用しない（null固定）
    onVoteChange(candidateId, availability, null);
  };

  // 全候補を一括変更
  const handleBulkChange = useCallback(
    (availability: Availability) => {
      candidates.forEach((c) => {
        onVoteChange(c.id, availability, null);
      });
    },
    [candidates, onVoteChange],
  );

  // 日付単位で一括変更
  const handleDateBulkChange = useCallback(
    (dateCandidates: Candidate[], availability: Availability) => {
      dateCandidates.forEach((c) => {
        onVoteChange(c.id, availability, null);
      });
    },
    [onVoteChange],
  );

  // 列（日付）一括変更（グリッド用）
  const handleColumnChange = useCallback(
    (date: string) => {
      const dateCandidates = candidates.filter((c) => c.date === date);
      // 現在の状態を見て次に循環
      const currentStates = dateCandidates.map(
        (c) => currentVotes[c.id] || "unavailable",
      );
      const allSame = currentStates.every((s) => s === currentStates[0]);
      const nextAvail = allSame
        ? AVAILABILITY_CYCLE[
            (AVAILABILITY_CYCLE.indexOf(currentStates[0]) + 1) %
              AVAILABILITY_CYCLE.length
          ]
        : "available";
      dateCandidates.forEach((c) => {
        onVoteChange(c.id, nextAvail, null);
      });
    },
    [candidates, currentVotes, onVoteChange],
  );

  // 行（時間帯）一括変更（グリッド用）
  const handleRowChange = useCallback(
    (time: string) => {
      const timeCandidates = candidates.filter(
        (c) => (c.start_time || "終日") === time,
      );
      const currentStates = timeCandidates.map(
        (c) => currentVotes[c.id] || "unavailable",
      );
      const allSame = currentStates.every((s) => s === currentStates[0]);
      const nextAvail = allSame
        ? AVAILABILITY_CYCLE[
            (AVAILABILITY_CYCLE.indexOf(currentStates[0]) + 1) %
              AVAILABILITY_CYCLE.length
          ]
        : "available";
      timeCandidates.forEach((c) => {
        onVoteChange(c.id, nextAvail, null);
      });
    },
    [candidates, currentVotes, onVoteChange],
  );

  // セルタップで次の状態に循環
  const handleCellCycle = useCallback(
    (candidateId: string) => {
      const current = currentVotes[candidateId] || "unavailable";
      const currentIndex = AVAILABILITY_CYCLE.indexOf(current);
      const nextIndex = (currentIndex + 1) % AVAILABILITY_CYCLE.length;
      onVoteChange(candidateId, AVAILABILITY_CYCLE[nextIndex], null);
    },
    [currentVotes, onVoteChange],
  );

  // 短い日付フォーマット（グリッド用）
  const formatShortDate = (dateStr: string): string => {
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    if (WEEKDAY_DATES.includes(dateStr)) {
      const dayIndex = WEEKDAY_DATES.indexOf(dateStr);
      return weekdays[dayIndex];
    }
    const date = new Date(dateStr);
    const weekday = weekdays[date.getDay()];
    return `${date.getMonth() + 1}/${date.getDate()}(${weekday})`;
  };

  // 短い時間フォーマット（グリッド用）
  const formatShortTime = (time: string): string => {
    if (time === "終日") return "終日";
    return time.slice(0, 5);
  };

  return (
    <div className="space-y-4">
      {/* 凡例 */}
      <div className="text-sm text-muted">
        <p className="mb-2">各候補の参加可否を選択してください</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {AVAILABILITY_OPTIONS.map((opt) => (
            <div
              key={opt.value}
              className="flex items-center gap-2 bg-background rounded-lg p-2"
            >
              <span
                className={`w-6 h-6 ${opt.color} ${opt.textColor} rounded flex items-center justify-center text-sm font-medium`}
              >
                {opt.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground text-xs">
                  {opt.label}
                  <span className="ml-1 text-muted">
                    ({availabilityCounts[opt.value]})
                  </span>
                </div>
                <div className="text-xs text-muted truncate">
                  {opt.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 一括投票ボタン */}
      <div className="bg-background rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">一括入力</span>
          <span className="text-xs text-muted">
            全{candidates.length}件をまとめて変更
          </span>
        </div>
        <div className="flex gap-2">
          {AVAILABILITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleBulkChange(opt.value)}
              className={`flex-1 py-2 px-2 rounded-lg text-sm font-medium transition-all border-2 border-transparent hover:border-current ${opt.color} ${opt.textColor} hover:opacity-90`}
            >
              すべて{opt.icon}
            </button>
          ))}
        </div>
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
                      onClick={() => handleColumnChange(date)}
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
                      onClick={() => handleRowChange(time)}
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
                    const avail = currentVotes[candidate.id] || "unavailable";
                    const opt = AVAILABILITY_OPTIONS.find(
                      (o) => o.value === avail,
                    );
                    return (
                      <td key={date} className="p-1">
                        <button
                          type="button"
                          onClick={() => handleCellCycle(candidate.id)}
                          className={`w-10 h-10 rounded-lg text-lg font-medium transition-all active:scale-95 ${opt?.color} ${opt?.textColor}`}
                        >
                          {opt?.icon}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted mt-2 text-center">
            タップで切り替え: × → ◎ → ○ → △ → ×
          </p>
        </div>
      )}

      {/* 候補日リスト（コンパクト表示） */}
      {(!canUseGrid || viewMode === "list") &&
        candidatesByDate.map(([date, dateCandidates]) => (
          <div key={date} className="bg-background rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-foreground">
                {formatDate(date)}
              </h3>
              {/* 日付単位の一括ボタン */}
              <div className="flex gap-0.5">
                {AVAILABILITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      handleDateBulkChange(dateCandidates, opt.value)
                    }
                    className={`w-6 h-6 rounded text-xs font-medium transition-all ${opt.color} ${opt.textColor} hover:opacity-80`}
                    title={`この日をすべて${opt.label}に`}
                  >
                    {opt.icon}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              {dateCandidates.map((candidate) => {
                const currentAvail =
                  currentVotes[candidate.id] || "unavailable";

                return (
                  <div
                    key={candidate.id}
                    className="flex items-center gap-2 bg-white rounded border border-border px-2 py-1"
                  >
                    <span className="text-xs font-medium min-w-[80px]">
                      {formatTimeRange(
                        candidate.start_time,
                        candidate.end_time,
                      )}
                    </span>
                    <div className="flex gap-0.5 flex-1 justify-end">
                      {AVAILABILITY_OPTIONS.map((opt) => {
                        const isSelected = currentAvail === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() =>
                              handleAvailabilityClick(candidate.id, opt.value)
                            }
                            className={`w-8 h-7 rounded text-xs font-medium transition-all active:scale-95 ${
                              isSelected
                                ? `${opt.color} ${opt.textColor}`
                                : "bg-background text-muted hover:bg-border"
                            }`}
                          >
                            {opt.icon}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
    </div>
  );
}
