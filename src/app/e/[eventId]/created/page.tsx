"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui";

export default function CreatedPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const [hostToken, setHostToken] = useState<string | null>(null);
  const [shareUrlCopied, setShareUrlCopied] = useState(false);
  const [manageUrlCopied, setManageUrlCopied] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(`host_token_${eventId}`);
    if (!token) {
      // トークンがない場合はイベントページへ
      router.replace(`/e/${eventId}`);
      return;
    }
    setHostToken(token);
  }, [eventId, router]);

  if (!hostToken) {
    return (
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="text-muted">読み込み中...</div>
      </main>
    );
  }

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const shareUrl = `${baseUrl}/e/${eventId}`;
  const manageUrl = `${baseUrl}/e/${eventId}/manage?token=${hostToken}`;

  const handleCopyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareUrlCopied(true);
      setTimeout(() => setShareUrlCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleCopyManageUrl = async () => {
    try {
      await navigator.clipboard.writeText(manageUrl);
      setManageUrlCopied(true);
      setTimeout(() => setManageUrlCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-success"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            イベントを作成しました
          </h1>
          <p className="text-muted">以下のURLを参加者に共有してください</p>
        </div>

        {/* 共有URL */}
        <div className="bg-card-bg rounded-xl shadow-sm border border-border p-6 mb-4">
          <h2 className="text-sm font-semibold text-foreground mb-2">
            参加者用URL
          </h2>
          <p className="text-xs text-muted mb-3">
            このURLを参加者に送って、日程を入力してもらいましょう
          </p>
          <div className="bg-background rounded-lg p-3 mb-3 break-all text-sm">
            {shareUrl}
          </div>
          <Button onClick={handleCopyShareUrl} className="w-full">
            {shareUrlCopied ? "コピーしました!" : "URLをコピー"}
          </Button>
        </div>

        {/* 管理URL */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-amber-800 mb-2">
            管理用URL（重要）
          </h2>
          <p className="text-xs text-amber-700 mb-3">
            このURLをブックマークしておくと、別のデバイスやブラウザからでも日程の確定などの管理操作ができます。
          </p>
          <div className="bg-white/50 rounded-lg p-3 mb-3 break-all text-sm text-amber-900">
            {manageUrl}
          </div>
          <Button
            onClick={handleCopyManageUrl}
            variant="outline"
            className="w-full"
          >
            {manageUrlCopied ? "コピーしました!" : "管理用URLをコピー"}
          </Button>
        </div>

        <div className="flex gap-3">
          <Link href={`/e/${eventId}`} className="flex-1">
            <Button variant="secondary" className="w-full">
              イベントを見る
            </Button>
          </Link>
          <Link href={`/e/${eventId}/manage`} className="flex-1">
            <Button variant="outline" className="w-full">
              管理ページ
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
