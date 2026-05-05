"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui";
import { ShareMessageEditor } from "./ShareMessageEditor";
import { getLineShareUrl } from "@/lib/share/line";
import type { Candidate } from "@/types";

interface ShareButtonsProps {
  url: string;
  title: string;
  candidates?: Candidate[];
  responseDeadline?: string | null;
  finalizedCandidate?: Candidate | null;
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

function formatDeadline(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function formatCandidateForPreview(c: Candidate): string {
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  if (WEEKDAY_DATES.includes(c.date)) {
    const dayIndex = WEEKDAY_DATES.indexOf(c.date);
    let result = `${weekdays[dayIndex]}曜日`;
    if (c.start_time) {
      result += ` ${c.start_time.slice(0, 5)}`;
      if (c.end_time) result += `〜${c.end_time.slice(0, 5)}`;
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
    if (c.end_time) result += `〜${c.end_time.slice(0, 5)}`;
  }
  return result;
}

export function ShareButtons({
  url,
  title,
  candidates = [],
  responseDeadline,
  finalizedCandidate,
}: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [reminderCopied, setReminderCopied] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // プレビュー用の共有メッセージを生成
  const previewMessage = useMemo(() => {
    // 確定済みの場合
    if (finalizedCandidate) {
      const dateStr = formatCandidateForPreview(finalizedCandidate);
      return `【決定】${title}\n\n日程が決定しました!\n\n${dateStr}\n\n▼ 詳細はこちら\n${url}`;
    }

    if (candidates.length === 0) return null;
    const candidateList = candidates
      .slice(0, 5)
      .map((c) => `・${formatCandidateForPreview(c)}`)
      .join("\n");
    const moreText =
      candidates.length > 5 ? `\n...他${candidates.length - 5}件` : "";
    return `${title}の日程調整\n\n以下の候補からご都合のよい日程をお選びください。\n${candidateList}${moreText}\n\n▼ ご回答はこちら\n${url}`;
  }, [title, candidates, url, finalizedCandidate]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleCopyReminder = async () => {
    if (!responseDeadline) return;
    try {
      const deadlineFormatted = formatDeadline(responseDeadline);
      const reminderMessage = `【リマインド】${title}の日程調整

まだ回答されていない方は、${deadlineFormatted}までにご回答をお願いします。

▼ 回答はこちら
${url}`;
      await navigator.clipboard.writeText(reminderMessage);
      setReminderCopied(true);
      setTimeout(() => setReminderCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleLineShare = () => {
    const message = finalizedCandidate
      ? `【決定】${title}`
      : `【日程調整】${title}`;
    const lineUrl = getLineShareUrl(url, message);
    window.open(lineUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      {responseDeadline && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-amber-800">
            回答締め切り:{" "}
            <span className="font-semibold">
              {formatDeadline(responseDeadline)}
            </span>
          </p>
        </div>
      )}

      {/* プレビューパネル */}
      {previewMessage && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            <span>{showPreview ? "▼" : "▶"}</span>
            共有時のメッセージをプレビュー
          </button>
          {showPreview && (
            <div className="mt-2 bg-background rounded-lg p-4 border border-border">
              <div className="whitespace-pre-wrap text-sm text-foreground">
                {previewMessage}
              </div>
              <p className="text-xs text-muted mt-2">
                ※「文面を編集」で内容をカスタマイズできます
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button
          onClick={handleLineShare}
          variant="primary"
          className="bg-[#06C755] hover:bg-[#05a648]"
        >
          LINEで共有
        </Button>
        {candidates.length > 0 && (
          <Button onClick={() => setShowEditor(true)} variant="outline">
            文面を編集
          </Button>
        )}
        <Button onClick={handleCopyLink} variant="outline">
          {copied ? "コピーしました!" : "リンクをコピー"}
        </Button>
      </div>

      {responseDeadline && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-sm text-muted mb-2">未回答者へのリマインド用</p>
          <Button onClick={handleCopyReminder} variant="outline" size="sm">
            {reminderCopied ? "コピーしました!" : "リマインド文面をコピー"}
          </Button>
        </div>
      )}

      {showEditor && (
        <ShareMessageEditor
          url={url}
          title={title}
          candidates={candidates}
          onClose={() => setShowEditor(false)}
        />
      )}
    </>
  );
}
