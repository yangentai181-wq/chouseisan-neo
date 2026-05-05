"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Textarea } from "@/components/ui";
import { CandidateDatePicker } from "./CandidateDatePicker";
import { ModeSelector } from "./ModeSelector";
import type { CreateEventInput } from "@/lib/validation";
import type { EventMode } from "@/types";

interface CandidateDate {
  date: string;
  start_time?: string;
  end_time?: string;
}

const DURATION_OPTIONS = [
  { value: 30, label: "30分" },
  { value: 60, label: "1時間" },
  { value: 90, label: "1時間30分" },
  { value: 120, label: "2時間" },
  { value: 180, label: "3時間" },
];

const WEEKDAY_DATES = [
  "2000-01-02",
  "2000-01-03",
  "2000-01-04",
  "2000-01-05",
  "2000-01-06",
  "2000-01-07",
  "2000-01-08",
];

function formatDate(dateStr: string): string {
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  if (WEEKDAY_DATES.includes(dateStr)) {
    const dayIndex = WEEKDAY_DATES.indexOf(dateStr);
    return `${weekdays[dayIndex]}曜日`;
  }
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = weekdays[date.getDay()];
  return `${month}/${day}(${weekday})`;
}

function formatTimeRange(start?: string, end?: string): string {
  if (!start) return "終日";
  const startHM = start.slice(0, 5);
  if (!end) return startHM;
  return `${startHM}〜${end.slice(0, 5)}`;
}

export function EventCreateForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<EventMode>("event");
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [candidates, setCandidates] = useState<CandidateDate[]>([]);
  const [hasDeadline, setHasDeadline] = useState(false);
  const [responseDeadline, setResponseDeadline] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleShowConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("タイトルを入力してください");
      return;
    }

    if (candidates.length === 0) {
      setError("候補日を1つ以上設定してください");
      return;
    }

    setShowConfirmation(true);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload: CreateEventInput = {
        title: title.trim(),
        description: description.trim() || undefined,
        mode,
        duration_minutes: mode === "meeting" ? durationMinutes : undefined,
        response_deadline:
          hasDeadline && responseDeadline ? responseDeadline : undefined,
        candidates,
      };

      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "作成に失敗しました");
      }

      const data = await res.json();

      // host_token を localStorage に保存
      localStorage.setItem(`host_token_${data.event_id}`, data.host_token);

      // 作成完了ページへリダイレクト
      router.push(`/e/${data.event_id}/created`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setShowConfirmation(false);
    } finally {
      setLoading(false);
    }
  };

  // 確認画面
  if (showConfirmation) {
    const modeLabel =
      mode === "event"
        ? "イベント"
        : mode === "meeting"
          ? "ミーティング"
          : "定期開催";

    // 日付でグループ化
    const candidatesByDate: Record<string, CandidateDate[]> = {};
    candidates.forEach((c) => {
      if (!candidatesByDate[c.date]) {
        candidatesByDate[c.date] = [];
      }
      candidatesByDate[c.date].push(c);
    });
    const sortedDates = Object.keys(candidatesByDate).sort();

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">内容を確認</h2>
          <p className="text-sm text-muted">以下の内容でイベントを作成します</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-error text-error px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-background rounded-xl p-4 space-y-4">
          <div>
            <span className="text-xs text-muted">タイトル</span>
            <p className="font-medium text-foreground">{title}</p>
          </div>

          {description && (
            <div>
              <span className="text-xs text-muted">説明</span>
              <p className="text-foreground whitespace-pre-wrap">
                {description}
              </p>
            </div>
          )}

          <div>
            <span className="text-xs text-muted">タイプ</span>
            <p className="text-foreground">{modeLabel}</p>
          </div>

          {mode === "meeting" && (
            <div>
              <span className="text-xs text-muted">所要時間</span>
              <p className="text-foreground">
                {
                  DURATION_OPTIONS.find((d) => d.value === durationMinutes)
                    ?.label
                }
              </p>
            </div>
          )}

          {hasDeadline && responseDeadline && (
            <div>
              <span className="text-xs text-muted">回答締め切り</span>
              <p className="text-foreground">{formatDate(responseDeadline)}</p>
            </div>
          )}

          <div>
            <span className="text-xs text-muted">
              候補日時（{candidates.length}件）
            </span>
            <div className="mt-2 space-y-2">
              {sortedDates.map((date) => (
                <div
                  key={date}
                  className="bg-white rounded-lg border border-border p-3"
                >
                  <div className="font-medium text-foreground mb-1">
                    {formatDate(date)}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {candidatesByDate[date].map((c, idx) => (
                      <span
                        key={idx}
                        className="text-sm bg-background px-2 py-1 rounded"
                      >
                        {formatTimeRange(c.start_time, c.end_time)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowConfirmation(false)}
            className="flex-1"
            size="lg"
          >
            戻る
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            loading={loading}
            className="flex-1"
            size="lg"
          >
            作成する
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleShowConfirmation} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-error text-error px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <Input
        label="タイトル"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="例：チーム定例会、懇親会、面接"
        required
        maxLength={100}
      />

      <Textarea
        label="説明（任意）"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="イベントの詳細を入力"
        rows={3}
        maxLength={1000}
      />

      <ModeSelector value={mode} onChange={setMode} />

      {mode === "meeting" && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            会議の所要時間
          </label>
          <div className="flex flex-wrap gap-2">
            {DURATION_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setDurationMinutes(option.value)}
                className={`px-4 py-2 rounded-lg border-2 text-sm transition-all ${
                  durationMinutes === option.value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:border-muted"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">
            この時間分、全員が空いている枠を探します
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          候補日時
        </label>
        <CandidateDatePicker
          candidates={candidates}
          onChange={setCandidates}
          mode={mode}
          durationMinutes={durationMinutes}
        />
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={hasDeadline}
            onChange={(e) => setHasDeadline(e.target.checked)}
            className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-sm font-medium text-foreground">
            回答締め切りを設定する
          </span>
        </label>
        {hasDeadline && (
          <div className="ml-8">
            <input
              type="date"
              value={responseDeadline}
              onChange={(e) => setResponseDeadline(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <p className="text-xs text-muted mt-1">
              この日までに回答をお願いする文面を自動生成します
            </p>
          </div>
        )}
      </div>

      <Button type="submit" loading={loading} className="w-full" size="lg">
        作成する
      </Button>
    </form>
  );
}
