"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { ModeSwitch } from "./ModeSwitch";

interface ParticipantActionsProps {
  eventId: string;
  isAdminMode?: boolean;
  onModeChange?: (isAdmin: boolean) => void;
}

// localStorageから初期状態を取得するヘルパー
function getInitialState(eventId: string) {
  if (typeof window === "undefined") {
    return { hasVoted: false, participantName: null, hasHostToken: false };
  }
  const token = localStorage.getItem(`participant_token_${eventId}`);
  const name = localStorage.getItem(`participant_name_${eventId}`);
  const hostToken = localStorage.getItem(`host_token_${eventId}`);
  return {
    hasVoted: !!token,
    participantName: name,
    hasHostToken: !!hostToken,
  };
}

export function ParticipantActions({
  eventId,
  isAdminMode = false,
  onModeChange,
}: ParticipantActionsProps) {
  const initialState = useMemo(() => getInitialState(eventId), [eventId]);
  const [hasVoted, setHasVoted] = useState(initialState.hasVoted);
  const [participantName, setParticipantName] = useState<string | null>(
    initialState.participantName,
  );
  const [hasHostToken, setHasHostToken] = useState(initialState.hasHostToken);

  // SSR後にlocalStorageから再取得（hydrationで必要）
  useEffect(() => {
    const token = localStorage.getItem(`participant_token_${eventId}`);
    const name = localStorage.getItem(`participant_name_${eventId}`);
    const hostToken = localStorage.getItem(`host_token_${eventId}`);
    /* eslint-disable react-hooks/set-state-in-effect -- hydration */
    if (!!token !== hasVoted) setHasVoted(!!token);
    if (name !== participantName) setParticipantName(name);
    if (!!hostToken !== hasHostToken) setHasHostToken(!!hostToken);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [eventId, hasVoted, participantName, hasHostToken]);

  const handleModeChange = useCallback(
    (isAdmin: boolean) => {
      // 認証成功時に hasHostToken を更新
      if (isAdmin) {
        setHasHostToken(true);
      }
      onModeChange?.(isAdmin);
    },
    [onModeChange],
  );

  // propsから直接使用（ローカル状態で管理しない）
  const localAdminMode = isAdminMode;

  const bgClass = localAdminMode
    ? "bg-admin-card-bg border-admin-border"
    : "bg-card-bg border-border";

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 ${bgClass} border-t shadow-lg z-50 safe-area-pb`}
    >
      <div className="max-w-4xl mx-auto px-4 py-3">
        {/* ステータス表示 */}
        <div className="flex items-center justify-between mb-2">
          {hasVoted && participantName ? (
            <div
              className={`text-xs ${localAdminMode ? "text-admin-muted" : "text-muted"}`}
            >
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 bg-success rounded-full" />
                {participantName}さんとして回答済み
              </span>
            </div>
          ) : (
            <div />
          )}
          <ModeSwitch
            eventId={eventId}
            isAdminMode={localAdminMode}
            hasHostToken={hasHostToken}
            onModeChange={handleModeChange}
          />
        </div>

        {/* アクションボタン */}
        <div className="flex gap-2">
          {/* 回答/修正ボタン - ページトップへスクロール */}
          <button
            type="button"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all bg-primary text-white hover:bg-primary/90 active:scale-98"
          >
            {hasVoted ? "回答を修正" : "回答する"}
          </button>

          {/* 結果を見る */}
          <Link
            href={`/e/${eventId}/result`}
            className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm text-center transition-all border active:scale-98 ${
              localAdminMode
                ? "bg-admin-bg text-admin-foreground border-admin-border hover:bg-admin-card-bg"
                : "bg-background text-foreground border-border hover:bg-border"
            }`}
          >
            結果を見る
          </Link>

          {/* 管理者画面 */}
          <Link
            href={`/e/${eventId}/manage`}
            className={`py-3 px-3 rounded-lg text-sm transition-all border active:scale-98 ${
              localAdminMode
                ? "bg-admin-bg text-admin-muted border-admin-border hover:bg-admin-card-bg hover:text-admin-foreground"
                : "bg-background text-muted border-border hover:bg-border hover:text-foreground"
            }`}
            title="管理者画面"
          >
            ⚙
          </Link>
        </div>
      </div>
    </div>
  );
}
