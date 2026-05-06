"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";
import type { EventMode, CandidatePattern } from "@/types";
import { saveTemplate, getWeekdayName } from "@/lib/templates";

interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventData: {
    title: string;
    description: string;
    mode: EventMode;
    duration_minutes: number | null;
    candidates: {
      date: string;
      start_time: string | null;
      end_time: string | null;
    }[];
  };
}

export function SaveTemplateModal({
  isOpen,
  onClose,
  eventData,
}: SaveTemplateModalProps) {
  const [name, setName] = useState("");
  const [patternType, setPatternType] = useState<"weekday" | "relative">(
    "weekday",
  );
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // 候補日からパターンを抽出
  const extractPatterns = (): CandidatePattern[] => {
    const patterns: CandidatePattern[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const candidate of eventData.candidates) {
      const candidateDate = new Date(candidate.date);
      candidateDate.setHours(0, 0, 0, 0);

      if (patternType === "weekday") {
        // 曜日パターン
        const weekday = candidateDate.getDay();
        // 同じ曜日・時間のパターンが既にあればスキップ
        const exists = patterns.some(
          (p) =>
            p.day_type === "weekday" &&
            p.day_value === weekday &&
            p.start_time === candidate.start_time &&
            p.end_time === candidate.end_time,
        );
        if (!exists) {
          patterns.push({
            day_type: "weekday",
            day_value: weekday,
            start_time: candidate.start_time,
            end_time: candidate.end_time,
          });
        }
      } else {
        // 相対日数パターン
        const diffDays = Math.floor(
          (candidateDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );
        patterns.push({
          day_type: "relative",
          day_value: diffDays,
          start_time: candidate.start_time,
          end_time: candidate.end_time,
        });
      }
    }

    return patterns;
  };

  const handleSave = () => {
    if (!name.trim()) {
      setError("テンプレート名を入力してください");
      return;
    }

    const patterns = extractPatterns();
    if (patterns.length === 0) {
      setError("候補日がありません");
      return;
    }

    saveTemplate({
      name: name.trim(),
      title: eventData.title,
      description: eventData.description,
      mode: eventData.mode,
      duration_minutes: eventData.duration_minutes,
      candidate_pattern: patterns,
    });

    onClose();
  };

  const patterns = extractPatterns();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">テンプレートとして保存</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <Input
            label="テンプレート名"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 週次MTG"
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              日程パターン
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPatternType("weekday")}
                className={`flex-1 py-2 px-3 text-sm rounded-lg border transition-colors ${
                  patternType === "weekday"
                    ? "border-teal-500 bg-teal-50 text-teal-700"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                曜日パターン
              </button>
              <button
                type="button"
                onClick={() => setPatternType("relative")}
                className={`flex-1 py-2 px-3 text-sm rounded-lg border transition-colors ${
                  patternType === "relative"
                    ? "border-teal-500 bg-teal-50 text-teal-700"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                相対日数
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {patternType === "weekday"
                ? "毎週同じ曜日の候補日を自動生成します"
                : "今日から○日後という形式で候補日を生成します"}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              抽出されるパターン
            </label>
            <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
              {patterns.length > 0 ? (
                <ul className="space-y-1">
                  {patterns.map((p, i) => (
                    <li key={i}>
                      {p.day_type === "weekday"
                        ? `毎週${getWeekdayName(p.day_value)}曜日`
                        : p.day_value === 0
                          ? "今日"
                          : p.day_value === 1
                            ? "明日"
                            : `${p.day_value}日後`}
                      {p.start_time && ` ${p.start_time}`}
                      {p.end_time && `〜${p.end_time}`}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>候補日がありません</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            キャンセル
          </Button>
          <Button type="button" onClick={handleSave} className="flex-1">
            保存
          </Button>
        </div>
      </div>
    </div>
  );
}
