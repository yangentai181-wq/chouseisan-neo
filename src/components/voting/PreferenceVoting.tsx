"use client";

import { useMemo } from "react";
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

      {/* 候補日リスト */}
      {candidatesByDate.map(([date, dateCandidates]) => (
        <div key={date} className="bg-background rounded-lg p-4">
          <h3 className="font-medium text-foreground mb-3">
            {formatDate(date)}
          </h3>
          <div className="space-y-2">
            {dateCandidates.map((candidate) => {
              const currentAvail = currentVotes[candidate.id] || "unavailable";
              const currentOption = AVAILABILITY_OPTIONS.find(
                (o) => o.value === currentAvail,
              );

              return (
                <div
                  key={candidate.id}
                  className="bg-white rounded-lg border border-border p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">
                      {formatTimeRange(
                        candidate.start_time,
                        candidate.end_time,
                      )}
                    </span>
                    {currentOption && currentAvail !== "unavailable" && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${currentOption.color} ${currentOption.textColor}`}
                      >
                        {currentOption.label}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {AVAILABILITY_OPTIONS.map((opt) => {
                      const isSelected = currentAvail === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            handleAvailabilityClick(candidate.id, opt.value)
                          }
                          className={`flex-1 py-2 px-1 rounded text-sm font-medium transition-all ${
                            isSelected
                              ? `${opt.color} ${opt.textColor} ring-2 ring-offset-1 ring-muted`
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
