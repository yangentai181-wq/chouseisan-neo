"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ModeSwitch } from "./ModeSwitch";
import type { VoteWithDetails } from "@/types";

interface ParticipantActionsProps {
  eventId: string;
  isAdminMode?: boolean;
  onModeChange?: (isAdmin: boolean) => void;
  votes?: VoteWithDetails[];
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
  votes = [],
}: ParticipantActionsProps) {
  const router = useRouter();
  const initialState = useMemo(() => getInitialState(eventId), [eventId]);
  const [hasVoted, setHasVoted] = useState(initialState.hasVoted);
  const [participantName, setParticipantName] = useState<string | null>(
    initialState.participantName,
  );
  const [hasHostToken, setHasHostToken] = useState(initialState.hasHostToken);
  const [showEditModal, setShowEditModal] = useState(false);

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

  const handleSelectParticipant = (vote: VoteWithDetails) => {
    // 選択した参加者のトークンと名前をlocalStorageに設定
    localStorage.setItem(
      `participant_token_${eventId}`,
      vote.participant_token,
    );
    localStorage.setItem(`participant_name_${eventId}`, vote.participant_name);
    setShowEditModal(false);
    // ページをリロードして編集モードを反映
    router.refresh();
    window.location.reload();
  };

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
          {votes.length > 0 && (
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="flex-1 py-3 px-4 rounded-lg font-medium text-sm text-center transition-all active:scale-98 bg-card-bg border border-border text-foreground hover:bg-background"
            >
              回答を修正
            </button>
          )}
          <Link
            href={`/e/${eventId}/result`}
            className="flex-1 py-3 px-4 rounded-lg font-medium text-sm text-center transition-all active:scale-98 bg-primary text-white hover:bg-primary/90"
          >
            結果を見る
          </Link>
        </div>
      </div>

      {/* 参加者選択モーダル */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-card-bg rounded-xl shadow-xl border border-border p-6 max-w-sm w-full max-h-[80vh] flex flex-col">
            <h2 className="text-lg font-bold text-foreground mb-2 text-center">
              回答を修正
            </h2>
            <p className="text-muted mb-4 text-center text-sm">
              修正する回答者を選んでください
            </p>

            <div className="flex-1 overflow-y-auto space-y-2">
              {votes.map((vote) => (
                <button
                  key={vote.id}
                  type="button"
                  onClick={() => handleSelectParticipant(vote)}
                  className="w-full px-4 py-3 text-left rounded-lg border border-border hover:bg-background transition-colors"
                >
                  <span className="font-medium">{vote.participant_name}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="mt-4 w-full py-2 text-sm text-muted hover:text-foreground transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
