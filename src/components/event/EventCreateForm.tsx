"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Textarea } from "@/components/ui";
import { CandidateDatePicker } from "./CandidateDatePicker";
import { ModeSelector } from "./ModeSelector";
import { TemplateSelector, SaveTemplateModal } from "@/components/template";
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

export function EventCreateForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<EventMode>("event");
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [candidates, setCandidates] = useState<CandidateDate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  const handleTemplateSelect = (template: {
    title: string;
    description: string;
    mode: EventMode;
    duration_minutes: number | null;
    candidates: {
      date: string;
      start_time: string | null;
      end_time: string | null;
    }[];
  }) => {
    setTitle(template.title);
    setDescription(template.description);
    setMode(template.mode);
    if (template.duration_minutes) {
      setDurationMinutes(template.duration_minutes);
    }
    setCandidates(
      template.candidates.map((c) => ({
        date: c.date,
        start_time: c.start_time || undefined,
        end_time: c.end_time || undefined,
      })),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

    setLoading(true);

    try {
      const payload: CreateEventInput = {
        title: title.trim(),
        description: description.trim() || undefined,
        mode,
        duration_minutes: mode === "meeting" ? durationMinutes : undefined,
        candidates,
      };

      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "イベントの作成に失敗しました");
      }

      const data = await res.json();

      // host_token を localStorage に保存
      localStorage.setItem(`host_token_${data.event_id}`, data.host_token);

      // イベントページへリダイレクト
      router.push(`/e/${data.event_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <TemplateSelector onSelect={handleTemplateSelect} />

      {error && (
        <div className="bg-red-50 border border-error text-error px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <Input
        label="イベント名"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="例：歓迎会の日程調整"
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
          <label className="block text-sm font-medium text-gray-700">
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
                    : "border-gray-200 hover:border-gray-300"
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
        <label className="block text-sm font-medium text-gray-700 mb-2">
          候補日時
        </label>
        <CandidateDatePicker
          candidates={candidates}
          onChange={setCandidates}
          mode={mode}
          durationMinutes={durationMinutes}
        />
      </div>

      <div className="flex flex-col gap-3">
        <Button type="submit" loading={loading} className="w-full" size="lg">
          イベントを作成
        </Button>

        {title.trim() && candidates.length > 0 && (
          <button
            type="button"
            onClick={() => setShowSaveTemplate(true)}
            className="text-sm text-teal-600 hover:text-teal-700 flex items-center justify-center gap-1"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
              />
            </svg>
            テンプレートとして保存
          </button>
        )}
      </div>

      <SaveTemplateModal
        isOpen={showSaveTemplate}
        onClose={() => setShowSaveTemplate(false)}
        eventData={{
          title,
          description,
          mode,
          duration_minutes: mode === "meeting" ? durationMinutes : null,
          candidates: candidates.map((c) => ({
            date: c.date,
            start_time: c.start_time || null,
            end_time: c.end_time || null,
          })),
        }}
      />
    </form>
  );
}
