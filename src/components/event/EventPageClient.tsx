"use client";

import { useState, useEffect } from "react";
import { VotingForm } from "@/components/voting";
import { ShareButtons } from "@/components/share";
import { ParticipantActions } from "./ParticipantActions";
import type { Candidate, VoteWithDetails, EventMode } from "@/types";

interface EventPageClientProps {
  eventId: string;
  event: {
    title: string;
    description: string | null;
    mode: EventMode;
    duration_minutes: number | null;
    response_deadline: string | null;
  };
  candidates: Candidate[];
  votes: VoteWithDetails[];
}

export function EventPageClient({
  eventId,
  event,
  candidates,
  votes,
}: EventPageClientProps) {
  const [isAdminMode, setIsAdminMode] = useState(false);

  // localStorage から初期モードを復元（SSR後のhydrationで必要）
  useEffect(() => {
    const hostToken = localStorage.getItem(`host_token_${eventId}`);
    const savedMode = localStorage.getItem(`admin_mode_${eventId}`);
    // host_token があり、かつ前回管理者モードだった場合のみ復元
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
        </header>

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
            日程調整
          </h2>
          <VotingForm
            eventId={eventId}
            candidates={candidates}
            votes={votes}
            mode={event.mode || "event"}
            durationMinutes={event.duration_minutes}
          />
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
              responseDeadline={event.response_deadline}
              isAdminMode={isAdminMode}
            />
          </div>
        )}

        {/* 固定アクションバーのためのスペーサー */}
        <div className="h-28" />
      </div>

      {/* 回答者向けアクションバー（固定） */}
      <ParticipantActions
        eventId={eventId}
        isAdminMode={isAdminMode}
        onModeChange={handleModeChange}
      />
    </main>
  );
}
