"use client";

import { useState, useEffect } from "react";
import { VotingGrid } from "@/components/voting";
import { CalendarLinks } from "@/components/calendar";
import { ShareButtons } from "@/components/share";
import { ParticipantActions } from "./ParticipantActions";
import { ManageLink } from "./ManageLink";
import type { Candidate, VoteWithDetails, EventMode } from "@/types";

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

interface CandidateRanking {
  candidate: Candidate;
  score: number;
  preferredCount: number;
  availableCount: number;
  maybeCount: number;
  unavailableCount: number;
}

interface ResultPageClientProps {
  eventId: string;
  event: {
    title: string;
    description: string | null;
    mode: EventMode;
    status: string;
    finalized_candidate_id: string | null;
  };
  candidates: Candidate[];
  votes: VoteWithDetails[];
  selectedCandidate: Candidate | null;
  availableCandidates: Candidate[];
  preferenceRankings: CandidateRanking[];
}

export function ResultPageClient({
  eventId,
  event,
  candidates,
  votes,
  selectedCandidate,
  availableCandidates,
  preferenceRankings,
}: ResultPageClientProps) {
  const [isAdminMode, setIsAdminMode] = useState(false);

  // localStorage から初期モードを復元（SSR後のhydrationで必要）
  useEffect(() => {
    const hostToken = localStorage.getItem(`host_token_${eventId}`);
    const savedMode = localStorage.getItem(`admin_mode_${eventId}`);
    if (hostToken && savedMode === "true") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration
      setIsAdminMode(true);
    }
  }, [eventId]);

  const handleModeChange = (isAdmin: boolean) => {
    setIsAdminMode(isAdmin);
    localStorage.setItem(`admin_mode_${eventId}`, String(isAdmin));
  };

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const shareUrl = `${baseUrl}/e/${eventId}`;

  const mode = event.mode;

  return (
    <main
      className={`flex-1 flex flex-col items-center p-4 min-h-screen transition-colors ${
        isAdminMode ? "bg-admin-bg" : ""
      }`}
    >
      <div className="w-full max-w-4xl">
        {/* 管理者モードバッジ */}
        {isAdminMode && (
          <div className="mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-admin-card-bg text-admin-foreground text-xs font-medium rounded-full border border-admin-border">
              <span className="w-2 h-2 bg-primary rounded-full" />
              管理者モード
            </span>
          </div>
        )}

        <header className="mb-6">
          <h1
            className={`text-2xl font-bold mb-2 ${isAdminMode ? "text-admin-foreground" : "text-foreground"}`}
          >
            {event.title}
          </h1>
          {event.description && (
            <p className={isAdminMode ? "text-admin-muted" : "text-muted"}>
              {event.description}
            </p>
          )}
          <p
            className={`text-sm mt-1 ${isAdminMode ? "text-admin-muted" : "text-muted"}`}
          >
            {mode === "meeting"
              ? "全員参加モード"
              : mode === "regular"
                ? "定期開催モード"
                : "多数決モード"}
          </p>
        </header>

        {mode === "meeting" ? (
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
            ) : votes.length === 0 ? (
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
          <div className="mb-6">
            {preferenceRankings.length > 0 && votes.length > 0 ? (
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
            ) : votes.length === 0 ? (
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

        <div
          className={`rounded-xl shadow-sm border p-6 mb-6 ${
            isAdminMode
              ? "bg-admin-card-bg border-admin-border"
              : "bg-card-bg border-border"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h2
              className={`text-lg font-semibold ${isAdminMode ? "text-admin-foreground" : ""}`}
            >
              回答一覧
            </h2>
            <ManageLink eventId={eventId} />
          </div>
          <VotingGrid candidates={candidates} votes={votes} />
        </div>

        {/* 管理者モード時のみ共有機能を表示 */}
        {isAdminMode && (
          <div
            className={`rounded-xl shadow-sm border p-6 mb-6 ${
              isAdminMode
                ? "bg-admin-card-bg border-admin-border"
                : "bg-card-bg border-border"
            }`}
          >
            <h2
              className={`text-lg font-semibold mb-4 ${isAdminMode ? "text-admin-foreground" : ""}`}
            >
              共有
            </h2>
            <ShareButtons
              url={shareUrl}
              title={event.title}
              candidates={candidates}
              finalizedCandidate={
                event.status === "finalized" ? selectedCandidate : null
              }
              isAdminMode={isAdminMode}
            />
          </div>
        )}

        <div className="h-28" />
      </div>

      <ParticipantActions
        eventId={eventId}
        isAdminMode={isAdminMode}
        onModeChange={handleModeChange}
      />
    </main>
  );
}
