"use client";

import { useState, useEffect } from "react";
import { Button, Textarea } from "@/components/ui";
import { getLineShareUrl } from "@/lib/share/line";
import type { Candidate } from "@/types";

interface ShareMessageEditorProps {
  url: string;
  title: string;
  candidates: Candidate[];
  onClose: () => void;
}

const WEEKDAY_DATES = [
  "2000-01-02",
  "2000-01-03",
  "2000-01-04",
  "2000-01-05",
  "2000-01-06",
  "2000-01-07",
  "2000-01-08",
];

function formatCandidateForShare(c: Candidate): string {
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

  // 定期開催モードの曜日日付かどうかをチェック
  if (WEEKDAY_DATES.includes(c.date)) {
    const dayIndex = WEEKDAY_DATES.indexOf(c.date);
    let result = `${weekdays[dayIndex]}曜日`;
    if (c.start_time) {
      result += ` ${c.start_time.slice(0, 5)}`;
      if (c.end_time) {
        result += `〜${c.end_time.slice(0, 5)}`;
      } else {
        result += "〜";
      }
    }
    return result;
  }

  const date = new Date(c.date);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = weekdays[date.getDay()];

  let result = `${month}/${day}(${weekday})`;
  if (c.start_time) {
    result += ` ${c.start_time.slice(0, 5)}`;
    if (c.end_time) {
      result += `〜${c.end_time.slice(0, 5)}`;
    } else {
      result += "〜";
    }
  }
  return result;
}

function generateDefaultMessage(
  title: string,
  candidates: Candidate[],
): string {
  const candidateList = candidates
    .slice(0, 10) // 最大10件まで表示
    .map((c) => `・${formatCandidateForShare(c)}`)
    .join("\n");

  const moreText =
    candidates.length > 10 ? `\n...他${candidates.length - 10}件` : "";

  return `${title}の日程調整

以下の候補からご都合のよい日程をお選びください。
${candidateList}${moreText}

▼ ご回答はこちら`;
}

export function ShareMessageEditor({
  url,
  title,
  candidates,
  onClose,
}: ShareMessageEditorProps) {
  const [message, setMessage] = useState(() =>
    generateDefaultMessage(title, candidates),
  );
  const [copied, setCopied] = useState(false);

  // ESCキーでモーダルを閉じる
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleLineShare = () => {
    const lineUrl = getLineShareUrl(url, message);
    window.open(lineUrl, "_blank", "noopener,noreferrer");
    onClose();
  };

  const handleCopyMessage = async () => {
    try {
      const fullMessage = `${message}\n${url}`;
      await navigator.clipboard.writeText(fullMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleReset = () => {
    setMessage(generateDefaultMessage(title, candidates));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* モーダル */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">共有メッセージを編集</h2>
            <button
              onClick={onClose}
              className="text-muted hover:text-foreground text-2xl leading-none"
              aria-label="閉じる"
            >
              ×
            </button>
          </div>

          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={10}
            className="mb-2"
          />

          <p className="text-xs text-muted mb-4">
            ※ URLは自動で末尾に追加されます
          </p>

          {/* プレビュー */}
          <div className="bg-background rounded-lg p-4 mb-4">
            <p className="text-xs text-muted mb-2">プレビュー</p>
            <div className="whitespace-pre-wrap text-sm">
              {message}
              {"\n"}
              <span className="text-primary">{url}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleLineShare}
              variant="primary"
              className="bg-[#06C755] hover:bg-[#05a648] flex-1"
            >
              LINEで送信
            </Button>
            <Button onClick={handleCopyMessage} variant="outline">
              {copied ? "コピーしました!" : "コピー"}
            </Button>
            <Button onClick={handleReset} variant="outline">
              リセット
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
