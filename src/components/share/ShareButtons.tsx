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
    </div>
  );
}
