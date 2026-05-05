"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Textarea } from "@/components/ui";
import { generateShareMessage } from "@/lib/share/message";
import type { Candidate } from "@/types";

interface EventData {
  title: string;
  response_deadline?: string | null;
  candidates: Candidate[];
}

// localStorageからホストトークンを取得するヘルパー（SSR対応）
function getInitialHostToken(eventId: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(`host_token_${eventId}`);
}

export default function CreatedPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  // 初期値をlocalStorageから取得（SSR時はnull）
  const initialToken = useMemo(() => getInitialHostToken(eventId), [eventId]);
  const [hostToken, setHostToken] = useState<string | null>(initialToken);
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [shareMessageCopied, setShareMessageCopied] = useState(false);
  const [manageUrlCopied, setManageUrlCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedMessage, setEditedMessage] = useState("");

  // クライアントサイドでトークンを再確認＆イベントデータ取得
  useEffect(() => {
    const token = localStorage.getItem(`host_token_${eventId}`);
    if (!token) {
      router.replace(`/e/${eventId}`);
      return;
    }
    // SSR時にnullだった場合のみ更新
    if (!hostToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration
      setHostToken(token);
    }

    // イベントデータを取得
    fetch(`/api/events/${eventId}`)
      .then((res) => res.json())
      .then((data) => {
        setEventData({
          title: data.title || "",
          response_deadline: data.response_deadline,
          candidates: data.candidates || [],
        });
      })
      .catch(() => {});
  }, [eventId, router, hostToken]);

  if (!hostToken || !eventData) {
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

  const defaultMessage = generateShareMessage({
    title: eventData.title,
    url: shareUrl,
    candidates: eventData.candidates,
    responseDeadline: eventData.response_deadline,
  });

  // 編集されたメッセージがあればそれを、なければデフォルトを使用
  const shareMessage = editedMessage || defaultMessage;

  const handleCopyShareMessage = async () => {
    try {
      await navigator.clipboard.writeText(shareMessage);
      setShareMessageCopied(true);
      setTimeout(() => setShareMessageCopied(false), 2000);
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

  const handleStartEdit = () => {
    setEditedMessage(shareMessage);
    setEditing(true);
  };

  const handleReset = () => {
    setEditedMessage("");
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

        {/* 共有メッセージ */}
        <div className="bg-card-bg rounded-xl shadow-sm border border-border p-6 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-foreground">
              共有メッセージ
            </h2>
            <div className="flex gap-2">
              {editing && editedMessage && editedMessage !== defaultMessage && (
                <button
                  onClick={handleReset}
                  className="text-xs text-muted hover:text-foreground"
                >
                  リセット
                </button>
              )}
              <button
                onClick={() =>
                  editing ? setEditing(false) : handleStartEdit()
                }
                className="text-xs text-primary hover:underline"
              >
                {editing ? "完了" : "編集"}
              </button>
            </div>
          </div>
          <p className="text-xs text-muted mb-3">
            このメッセージを参加者に送って、日程を入力してもらいましょう
          </p>
          {editing ? (
            <Textarea
              value={editedMessage}
              onChange={(e) => setEditedMessage(e.target.value)}
              rows={10}
              className="mb-3 text-sm"
            />
          ) : (
            <div className="bg-background rounded-lg p-3 mb-3 text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
              {shareMessage}
            </div>
          )}
          <Button onClick={handleCopyShareMessage} className="w-full">
            {shareMessageCopied ? "コピーしました!" : "メッセージをコピー"}
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
