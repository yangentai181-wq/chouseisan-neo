"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ManagePanel } from "@/components/event/ManagePanel";

export default function ManagePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = params.eventId as string;

  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [hostToken, setHostToken] = useState<string | null>(null);

  useEffect(() => {
    // URLのトークンを優先
    const urlToken = searchParams.get("token");
    const storedToken = localStorage.getItem(`host_token_${eventId}`);

    if (urlToken) {
      // URLトークンがある場合はlocalStorageに保存して使用
      localStorage.setItem(`host_token_${eventId}`, urlToken);
      setHostToken(urlToken);
      setIsAuthorized(true);
      // URLからトークンを消す（セキュリティ向上）
      window.history.replaceState({}, "", `/e/${eventId}/manage`);
    } else if (storedToken) {
      // localStorageのトークンを使用
      setHostToken(storedToken);
      setIsAuthorized(true);
    } else {
      setIsAuthorized(false);
    }
  }, [eventId, searchParams]);

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
        <div className="bg-card-bg rounded-xl shadow-sm border border-border p-8 text-center max-w-md">
          <h1 className="text-xl font-bold text-foreground mb-4">
            アクセス権限がありません
          </h1>
          <p className="text-muted mb-6">
            この管理ページにアクセスするには、イベント作成時に発行された管理用URLが必要です。
          </p>
          <Link
            href={`/e/${eventId}`}
            className="text-primary hover:underline text-sm"
          >
            イベントページに戻る
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center p-4">
      <div className="w-full max-w-4xl">
        <ManagePanel eventId={eventId} hostToken={hostToken!} />
        <footer className="mt-6 text-center space-x-4">
          <Link
            href={`/e/${eventId}`}
            className="text-primary hover:underline text-sm"
          >
            イベントページ
          </Link>
          <Link
            href={`/e/${eventId}/result`}
            className="text-primary hover:underline text-sm"
          >
            結果を見る
          </Link>
        </footer>
      </div>
    </main>
  );
}
