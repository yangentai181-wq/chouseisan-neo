"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui";
import { ManagePanel } from "@/components/event/ManagePanel";
import { ParticipantActions } from "@/components/event/ParticipantActions";

// 初期認証状態を計算するヘルパー
function getInitialAuthState(
  eventId: string,
  urlToken: string | null,
): { isAuthorized: boolean | null; hostToken: string | null } {
  if (typeof window === "undefined") {
    return { isAuthorized: null, hostToken: null };
  }
  const storedToken = localStorage.getItem(`host_token_${eventId}`);
  if (urlToken || storedToken) {
    return { isAuthorized: true, hostToken: urlToken || storedToken };
  }
  return { isAuthorized: false, hostToken: null };
}

export default function ManagePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = params.eventId as string;
  const urlToken = searchParams.get("token");

  // 初期状態を計算
  const initialState = useMemo(
    () => getInitialAuthState(eventId, urlToken),
    [eventId, urlToken],
  );

  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(
    initialState.isAuthorized,
  );
  const [hostToken, setHostToken] = useState<string | null>(
    initialState.hostToken,
  );
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinLoading, setPinLoading] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(true);
  const initializedRef = useRef(false);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin)) {
      setPinError("4桁の数字を入力してください");
      return;
    }

    setPinLoading(true);
    setPinError(null);

    try {
      const res = await fetch(`/api/events/${eventId}/verify-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      if (!res.ok) {
        const data = await res.json();
        setPinError(data.error || "認証に失敗しました");
        return;
      }

      const data = await res.json();
      localStorage.setItem(`host_token_${eventId}`, data.host_token);
      localStorage.setItem(`admin_mode_${eventId}`, "true");
      setHostToken(data.host_token);
      setIsAuthorized(true);
    } catch {
      setPinError("エラーが発生しました");
    } finally {
      setPinLoading(false);
    }
  };

  const handleModeChange = useCallback(
    (isAdmin: boolean) => {
      setIsAdminMode(isAdmin);
      localStorage.setItem(`admin_mode_${eventId}`, String(isAdmin));
    },
    [eventId],
  );

  // URLトークンの処理とlocalStorage保存（初回のみ）
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (urlToken) {
      // URLトークンがある場合はlocalStorageに保存
      localStorage.setItem(`host_token_${eventId}`, urlToken);
      localStorage.setItem(`admin_mode_${eventId}`, "true");
      // URLからトークンを消す（セキュリティ向上）
      window.history.replaceState({}, "", `/e/${eventId}/manage`);
    } else if (hostToken) {
      // 既存トークンがある場合は管理者モードを設定
      localStorage.setItem(`admin_mode_${eventId}`, "true");
    }
  }, [eventId, urlToken, hostToken]);

  if (isAuthorized === null) {
    return (
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="text-muted">読み込み中...</div>
      </main>
    );
  }

  if (!isAuthorized) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="bg-card-bg rounded-xl shadow-sm border border-border p-8 max-w-md">
          <h1 className="text-xl font-bold text-foreground mb-2 text-center">
            管理画面へのアクセス
          </h1>
          <p className="text-muted mb-6 text-center text-sm">
            イベント作成時に設定したPINを入力してください
          </p>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            {pinError && (
              <div className="bg-red-50 border border-error text-error px-4 py-3 rounded-lg text-sm">
                {pinError}
              </div>
            )}

            <div>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="4桁のPIN"
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-center text-2xl tracking-widest"
                autoFocus
              />
            </div>

            <Button
              type="submit"
              loading={pinLoading}
              className="w-full"
              size="lg"
            >
              認証する
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href={`/e/${eventId}`}
              className="text-primary hover:underline text-sm"
            >
              イベントページに戻る
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center p-4 bg-admin-bg min-h-screen">
      {/* 管理者モードバッジ */}
      <div className="w-full max-w-4xl mb-4">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-admin-card-bg text-admin-foreground text-xs font-medium rounded-full border border-admin-border">
          <span className="w-2 h-2 bg-primary rounded-full" />
          管理者モード
        </span>
      </div>

      <div className="w-full max-w-4xl">
        <ManagePanel eventId={eventId} hostToken={hostToken!} isAdminMode />
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
