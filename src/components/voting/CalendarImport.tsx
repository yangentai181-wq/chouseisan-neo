"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";
import type { Candidate, Availability } from "@/types";

interface CalendarImportProps {
  candidates: Candidate[];
  onImport: (conflicts: Record<string, Availability>) => void;
}

interface ConflictResult {
  candidateId: string;
  hasConflict: boolean;
  conflictingEvents: string[];
}

export function CalendarImport({ candidates, onImport }: CalendarImportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [icsUrl, setIcsUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    conflicts: ConflictResult[];
    eventCount: number;
  } | null>(null);

  const handleImport = async () => {
    if (!icsUrl.trim()) {
      setError("URLを入力してください");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/calendar/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          icsUrl: icsUrl.trim(),
          candidates: candidates.map((c) => ({
            id: c.id,
            date: c.date,
            start_time: c.start_time,
            end_time: c.end_time,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "カレンダーの取得に失敗しました");
      }

      setResult(data);

      // 衝突がある候補を unavailable に設定
      const newAvailability: Record<string, Availability> = {};
      for (const conflict of data.conflicts) {
        if (conflict.hasConflict) {
          newAvailability[conflict.candidateId] = "unavailable";
        }
      }

      if (Object.keys(newAvailability).length > 0) {
        onImport(newAvailability);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const conflictCount =
    result?.conflicts.filter((c) => c.hasConflict).length ?? 0;

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-sm font-medium text-slate-700">
            カレンダーから予定を読み込む
          </span>
        </div>
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="p-4 space-y-4 border-t border-slate-200">
          <div className="text-sm text-slate-600">
            <p>Google カレンダーの公開ICS URLを貼り付けると、</p>
            <p>予定がある時間帯を自動で「×」に設定します。</p>
          </div>

          <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500">
            <p className="font-medium mb-1">ICS URLの取得方法:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Google カレンダーを開く</li>
              <li>設定 → カレンダー → 対象カレンダーを選択</li>
              <li>「カレンダーの統合」→「iCal形式の公開URL」をコピー</li>
            </ol>
          </div>

          <Input
            label="ICS URL"
            type="url"
            value={icsUrl}
            onChange={(e) => setIcsUrl(e.target.value)}
            placeholder="https://calendar.google.com/calendar/ical/..."
          />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {result && (
            <div className="bg-teal-50 border border-teal-200 text-teal-700 px-3 py-2 rounded-lg text-sm">
              <p>
                {result.eventCount}件の予定を読み込みました。
                {conflictCount > 0
                  ? `${conflictCount}件の候補日に予定があるため「×」に設定しました。`
                  : "すべての候補日が空いています。"}
              </p>
            </div>
          )}

          <Button
            type="button"
            onClick={handleImport}
            loading={loading}
            variant="secondary"
            size="sm"
            className="w-full"
          >
            予定を読み込む
          </Button>
        </div>
      )}
    </div>
  );
}
