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

const PREFERENCE_OPTIONS = [
  { value: 1, label: "第1希望", icon: "★★★", color: "bg-yellow-400" },
  { value: 2, label: "第2希望", icon: "★★", color: "bg-yellow-300" },
  { value: 3, label: "第3希望", icon: "★", color: "bg-yellow-200" },
  { value: null, label: "希望なし", icon: "−", color: "bg-background" },
] as const;

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
  currentPreferences,
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

  // 選択された希望の数をカウント
  const preferenceCounts = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    Object.values(currentPreferences).forEach((pref) => {
      if (pref && pref >= 1 && pref <= 3) {
        counts[pref]++;
      }
    });
    return counts;
  }, [currentPreferences]);

  const handlePreferenceClick = (
    candidateId: string,
    preference: number | null,
  ) => {
    const currentPref = currentPreferences[candidateId];

    // 同じ値をクリックした場合は希望なしに戻す
    if (currentPref === preference) {
      onVoteChange(candidateId, "unavailable", null);
      return;
    }

    // 希望あり = available, 希望なし = unavailable
    const availability: Availability = preference ? "available" : "unavailable";
    onVoteChange(candidateId, availability, preference);
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted">
        <p>希望順位を選択してください（複数選択可）</p>
        <div className="flex flex-wrap gap-3 mt-2">
          {PREFERENCE_OPTIONS.map((opt) => (
            <span key={opt.label} className="flex items-center gap-1.5">
              <span
                className={`w-4 h-4 ${opt.color} rounded border border-border flex items-center justify-center text-xs`}
              >
                {opt.value ? opt.value : ""}
              </span>
              {opt.label}
              {opt.value && (
                <span className="text-xs text-muted">
                  ({preferenceCounts[opt.value]}件)
                </span>
              )}
            </span>
          ))}
        </div>
      </div>

      {candidatesByDate.map(([date, dateCandidates]) => (
        <div key={date} className="bg-background rounded-lg p-4">
          <h3 className="font-medium text-foreground mb-3">
            {formatDate(date)}
          </h3>
          <div className="space-y-2">
            {dateCandidates.map((candidate) => {
              const currentPref = currentPreferences[candidate.id];
              const prefOption = PREFERENCE_OPTIONS.find(
                (o) => o.value === currentPref,
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
                    {prefOption && currentPref && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${prefOption.color}`}
                      >
                        {prefOption.label}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {PREFERENCE_OPTIONS.map((opt) => {
                      const isSelected = currentPref === opt.value;
                      return (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() =>
                            handlePreferenceClick(candidate.id, opt.value)
                          }
                          className={`flex-1 py-2 px-1 rounded text-xs font-medium transition-all ${
                            isSelected
                              ? `${opt.color} ${opt.value ? "text-foreground" : "text-muted"} ring-2 ring-muted`
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
