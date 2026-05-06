"use client";

import { useState, useMemo } from "react";
import { Button, Textarea } from "@/components/ui";
import {
  formatDeadline,
  generateShareMessage,
  generateFinalizedMessage,
  generateReminderMessage,
} from "@/lib/share/message";
import type { Candidate } from "@/types";

// LINEアイコン（公式ロゴ簡易版）
function LineIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  );
}

interface ShareButtonsProps {
  url: string;
  title: string;
  candidates?: Candidate[];
  responseDeadline?: string | null;
  finalizedCandidate?: Candidate | null;
  isAdminMode?: boolean;
}

export function ShareButtons({
  url,
  title,
  candidates = [],
  responseDeadline,
  finalizedCandidate,
  isAdminMode = false,
}: ShareButtonsProps) {
  // スタイルクラス
  const messageBoxClass = isAdminMode
    ? "bg-admin-bg rounded-lg p-4 border border-admin-border"
    : "bg-background rounded-lg p-4 border border-border";
  const labelClass = isAdminMode
    ? "text-xs text-admin-muted font-medium"
    : "text-xs text-muted font-medium";
  const textClass = isAdminMode ? "text-admin-foreground" : "text-foreground";
  const [copied, setCopied] = useState<string | null>(null);

  // メッセージ編集状態
  const [editingShare, setEditingShare] = useState(false);
  const [editingReminder, setEditingReminder] = useState(false);

  // デフォルトメッセージ
  const defaultShareMessage = useMemo(() => {
    if (finalizedCandidate) {
      return generateFinalizedMessage(title, url, finalizedCandidate);
    }
    return generateShareMessage({ title, url, candidates, responseDeadline });
  }, [title, candidates, url, responseDeadline, finalizedCandidate]);

  const defaultReminderMessage = useMemo(
    () => generateReminderMessage(title, url, responseDeadline),
    [title, responseDeadline, url],
  );

  // ユーザーが編集した場合のみカスタムメッセージを保持（nullはデフォルトを使用）
  const [customShareMessage, setCustomShareMessage] = useState<string | null>(
    null,
  );
  const [customReminderMessage, setCustomReminderMessage] = useState<
    string | null
  >(null);

  // 表示用メッセージ（カスタムがあればそれを、なければデフォルト）
  const shareMessage = customShareMessage ?? defaultShareMessage;
  const reminderMessage = customReminderMessage ?? defaultReminderMessage;

  const handleCopy = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleResetShare = () => {
    setCustomShareMessage(null);
  };

  const handleResetReminder = () => {
    setCustomReminderMessage(null);
  };

  return (
    <div className="space-y-4">
      {/* 締め切り表示 */}
      {responseDeadline && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <p className="text-sm text-amber-800">
            回答締め切り:{" "}
            <span className="font-semibold">
              {formatDeadline(responseDeadline)}
            </span>
          </p>
        </div>
      )}

      {/* 共有メッセージ */}
      <div className={messageBoxClass}>
        <div className="flex items-center justify-between mb-2">
          <p className={labelClass}>共有メッセージ</p>
          <div className="flex gap-2">
            {editingShare && customShareMessage !== null && (
              <button
                onClick={handleResetShare}
                className={`text-xs ${isAdminMode ? "text-admin-muted hover:text-admin-foreground" : "text-muted hover:text-foreground"}`}
              >
                リセット
              </button>
            )}
            <button
              onClick={() => setEditingShare(!editingShare)}
              className="text-xs text-primary hover:underline"
            >
              {editingShare ? "完了" : "編集"}
            </button>
          </div>
        </div>
        {editingShare ? (
          <Textarea
            value={shareMessage}
            onChange={(e) => setCustomShareMessage(e.target.value)}
            rows={8}
            className={`text-sm ${isAdminMode ? "bg-admin-card-bg text-admin-foreground border-admin-border" : ""}`}
          />
        ) : (
          <div
            className={`whitespace-pre-wrap text-sm max-h-40 overflow-y-auto ${textClass}`}
          >
            {shareMessage}
          </div>
        )}
      </div>

      {/* リマインド文 */}
      <div className={messageBoxClass}>
        <div className="flex items-center justify-between mb-2">
          <p className={labelClass}>リマインド文</p>
          <div className="flex gap-2">
            {editingReminder && customReminderMessage !== null && (
              <button
                onClick={handleResetReminder}
                className={`text-xs ${isAdminMode ? "text-admin-muted hover:text-admin-foreground" : "text-muted hover:text-foreground"}`}
              >
                リセット
              </button>
            )}
            <button
              onClick={() => setEditingReminder(!editingReminder)}
              className="text-xs text-primary hover:underline"
            >
              {editingReminder ? "完了" : "編集"}
            </button>
          </div>
        </div>
        {editingReminder ? (
          <Textarea
            value={reminderMessage}
            onChange={(e) => setCustomReminderMessage(e.target.value)}
            rows={5}
            className={`text-sm ${isAdminMode ? "bg-admin-card-bg text-admin-foreground border-admin-border" : ""}`}
          />
        ) : (
          <div
            className={`whitespace-pre-wrap text-sm max-h-32 overflow-y-auto ${textClass}`}
          >
            {reminderMessage}
          </div>
        )}
      </div>

      {/* コピーボタン */}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => handleCopy(shareMessage, "share")}
          variant="primary"
          className="flex-1 min-w-[140px]"
        >
          {copied === "share" ? "コピーしました" : "共有メッセージをコピー"}
        </Button>
        <Button
          onClick={() => handleCopy(reminderMessage, "reminder")}
          variant="outline"
          className="flex-1 min-w-[140px]"
        >
          {copied === "reminder" ? "コピーしました" : "リマインド文をコピー"}
        </Button>
        <Button
          onClick={() => handleCopy(url, "link")}
          variant="outline"
          className="flex-1 min-w-[100px]"
        >
          {copied === "link" ? "コピーしました" : "リンクをコピー"}
        </Button>
      </div>

      {/* LINE共有ボタン */}
      <a
        href={`https://line.me/R/msg/text/?${encodeURIComponent(shareMessage)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-[#00B900] hover:bg-[#00A000] text-white font-medium transition-colors"
      >
        <LineIcon className="w-5 h-5" />
        LINEで共有
      </a>
    </div>
  );
}
