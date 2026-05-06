"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui";
import type { EventMode } from "@/types";

interface CandidateDate {
  date: string;
  start_time?: string;
  end_time?: string;
}

export type OffsetMode = "none" | "30min" | "60min";

interface CandidateDatePickerProps {
  candidates: CandidateDate[];
  onChange: (candidates: CandidateDate[]) => void;
  mode?: EventMode;
  durationMinutes?: number;
  offsetMode?: OffsetMode;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const WEEKDAYS_SUNDAY = WEEKDAYS;
const WEEKDAYS_MONDAY = ["月", "火", "水", "木", "金", "土", "日"];

const FREQUENCIES = [
  { value: "weekly", label: "週1回" },
  { value: "biweekly", label: "隔週" },
  { value: "monthly", label: "月1回" },
  { value: "monthly2", label: "月2回" },
];

// 曜日を表す固定日付（2000-01-02が日曜日）
const WEEKDAY_DATES = [
  "2000-01-02", // 日曜
  "2000-01-03", // 月曜
  "2000-01-04", // 火曜
  "2000-01-05", // 水曜
  "2000-01-06", // 木曜
  "2000-01-07", // 金曜
  "2000-01-08", // 土曜
];

// 15分刻みの時間オプション（6:00〜24:00）
const TIME_OPTIONS: string[] = [];
for (let h = 6; h <= 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    if (h === 24 && m > 0) break;
    const hour = h === 24 ? "24" : String(h).padStart(2, "0");
    const min = String(m).padStart(2, "0");
    TIME_OPTIONS.push(`${hour}:${min}`);
  }
}

// 時間範囲からスロットを生成
// offsetMode: "30min" / "60min" の場合、開始時刻をずらしてスロットを生成
function generateTimeSlots(
  rangeStart: string,
  rangeEnd: string,
  durationMinutes: number,
  offsetMode: OffsetMode = "none",
): { start: string; end: string }[] {
  const slots: { start: string; end: string }[] = [];
  if (!rangeStart || !rangeEnd || durationMinutes <= 0) return slots;

  const [startH, startM] = rangeStart.split(":").map(Number);
  const [endH, endM] = rangeEnd.split(":").map(Number);
  const rangeStartMinutes = startH * 60 + startM;
  const rangeEndMinutes = endH * 60 + endM;

  // offsetMode に応じて increment を決定
  const increment =
    offsetMode === "30min" ? 30 : offsetMode === "60min" ? 60 : durationMinutes;

  let current = rangeStartMinutes;
  while (current + durationMinutes <= rangeEndMinutes) {
    const slotStartH = Math.floor(current / 60);
    const slotStartM = current % 60;
    const slotEndH = Math.floor((current + durationMinutes) / 60);
    const slotEndM = (current + durationMinutes) % 60;

    slots.push({
      start: `${String(slotStartH).padStart(2, "0")}:${String(slotStartM).padStart(2, "0")}`,
      end: `${String(slotEndH).padStart(2, "0")}:${String(slotEndM).padStart(2, "0")}`,
    });

    current += increment;
  }

  return slots;
}

function getMonthDays(
  year: number,
  month: number,
  weekStartsOnMonday: boolean,
) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: (Date | null)[] = [];

  // 月初の曜日まで空白を追加
  let firstDayOfWeek = firstDay.getDay();
  if (weekStartsOnMonday) {
    // 月曜始まりの場合: 日曜=6, 月曜=0, 火曜=1, ...
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  }
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(null);
  }

  // 日付を追加
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  return days;
}

function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

function isWeekdayDate(date: string): boolean {
  return WEEKDAY_DATES.includes(date);
}

function formatCandidate(c: CandidateDate) {
  // 定期開催モードの曜日日付かどうかをチェック
  if (isWeekdayDate(c.date)) {
    const dayIndex = WEEKDAY_DATES.indexOf(c.date);
    const weekdayStr = `${WEEKDAYS[dayIndex]}曜日`;
    if (c.start_time && c.end_time) {
      return `${weekdayStr} ${c.start_time.slice(0, 5)}〜${c.end_time.slice(0, 5)}`;
    }
    if (c.start_time) {
      return `${weekdayStr} ${c.start_time.slice(0, 5)}〜`;
    }
    return weekdayStr;
  }

  const date = new Date(c.date);
  const dateStr = date.toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
    weekday: "short",
  });
  if (c.start_time && c.end_time) {
    return `${dateStr} ${c.start_time.slice(0, 5)}〜${c.end_time.slice(0, 5)}`;
  }
  if (c.start_time) {
    return `${dateStr} ${c.start_time.slice(0, 5)}〜`;
  }
  return dateStr;
}

export function CandidateDatePicker({
  candidates,
  onChange,
  mode = "event",
  durationMinutes = 60,
  offsetMode = "none",
}: CandidateDatePickerProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());

  // 時間範囲選択
  const [rangeStart, setRangeStart] = useState("09:00");
  const [rangeEnd, setRangeEnd] = useState("18:00");

  // 定期開催モード用
  const [selectedWeekdays, setSelectedWeekdays] = useState<Set<number>>(
    new Set(),
  );
  const [frequency, setFrequency] = useState("weekly");
  const [regularRangeStart, setRegularRangeStart] = useState("09:00");
  const [regularRangeEnd, setRegularRangeEnd] = useState("18:00");
  const [regularDuration, setRegularDuration] = useState(60);

  // 曜日ドラッグ選択用
  const [isDraggingWeekday, setIsDraggingWeekday] = useState(false);
  const [dragModeWeekday, setDragModeWeekday] = useState<"select" | "deselect">(
    "select",
  );
  const [draggedWeekdays, setDraggedWeekdays] = useState<Set<number>>(
    new Set(),
  );

  // カレンダードラッグ選択用
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"select" | "deselect">("select");
  const [draggedDates, setDraggedDates] = useState<Set<string>>(new Set());

  // カレンダー週始まり（デフォルト月曜始まり）
  const [weekStartsOnMonday, setWeekStartsOnMonday] = useState(true);

  const isRegularMode = mode === "regular";

  // ドラッグ終了
  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;

    setSelectedDates((prev) => {
      const next = new Set(prev);
      draggedDates.forEach((key) => {
        if (dragMode === "select") {
          next.add(key);
        } else {
          next.delete(key);
        }
      });
      return next;
    });

    setIsDragging(false);
    setDraggedDates(new Set());
  }, [isDragging, draggedDates, dragMode, setSelectedDates]);

  // 曜日ドラッグ終了
  const handleWeekdayDragEnd = useCallback(() => {
    if (!isDraggingWeekday) return;

    setSelectedWeekdays((prev) => {
      const next = new Set(prev);
      draggedWeekdays.forEach((day) => {
        if (dragModeWeekday === "select") {
          next.add(day);
        } else {
          next.delete(day);
        }
      });
      return next;
    });

    setIsDraggingWeekday(false);
    setDraggedWeekdays(new Set());
  }, [isDraggingWeekday, draggedWeekdays, dragModeWeekday]);

  // 曜日ドラッグ開始
  const handleWeekdayDragStart = useCallback(
    (day: number) => {
      const isCurrentlySelected = selectedWeekdays.has(day);
      setIsDraggingWeekday(true);
      setDragModeWeekday(isCurrentlySelected ? "deselect" : "select");
      setDraggedWeekdays(new Set([day]));
    },
    [selectedWeekdays],
  );

  // 曜日ドラッグ中
  const handleWeekdayDragEnter = useCallback(
    (day: number) => {
      if (!isDraggingWeekday) return;
      setDraggedWeekdays((prev) => {
        const next = new Set(prev);
        next.add(day);
        return next;
      });
    },
    [isDraggingWeekday],
  );

  // グローバルなマウスアップでドラッグ終了
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleDragEnd();
      }
      if (isDraggingWeekday) {
        handleWeekdayDragEnd();
      }
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    window.addEventListener("touchend", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      window.removeEventListener("touchend", handleGlobalMouseUp);
    };
  }, [isDragging, handleDragEnd, isDraggingWeekday, handleWeekdayDragEnd]);

  const days = useMemo(
    () =>
      getMonthDays(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        weekStartsOnMonday,
      ),
    [currentMonth, weekStartsOnMonday],
  );

  const weekdays = weekStartsOnMonday ? WEEKDAYS_MONDAY : WEEKDAYS_SUNDAY;

  const candidateDateSet = useMemo(() => {
    return new Set(candidates.map((c) => c.date));
  }, [candidates]);

  // ドラッグ開始
  const handleDragStart = (date: Date) => {
    const key = formatDateKey(date);
    const isCurrentlySelected = selectedDates.has(key);

    setIsDragging(true);
    setDragMode(isCurrentlySelected ? "deselect" : "select");
    setDraggedDates(new Set([key]));
  };

  // ドラッグ中
  const handleDragEnter = (date: Date) => {
    if (!isDragging) return;
    const key = formatDateKey(date);
    if (isPastDate(date)) return;

    setDraggedDates((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  const handlePrevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
    );
  };

  // 時間範囲から自動生成
  const handleGenerateSlots = () => {
    if (selectedDates.size === 0) return;

    const slots = generateTimeSlots(
      rangeStart,
      rangeEnd,
      durationMinutes,
      offsetMode,
    );
    if (slots.length === 0) return;

    const newCandidates: CandidateDate[] = [];
    const sortedDates = Array.from(selectedDates).sort();

    for (const date of sortedDates) {
      for (const slot of slots) {
        newCandidates.push({
          date,
          start_time: slot.start,
          end_time: slot.end,
        });
      }
    }

    // 重複を除いて追加
    const existingKeys = new Set(
      candidates.map(
        (c) => `${c.date}-${c.start_time || ""}-${c.end_time || ""}`,
      ),
    );
    const uniqueNew = newCandidates.filter(
      (c) => !existingKeys.has(`${c.date}-${c.start_time}-${c.end_time}`),
    );

    onChange([...candidates, ...uniqueNew]);
    setSelectedDates(new Set());
  };

  // プレビュー用: 生成されるスロット数
  // イベントモード・ミーティングモード共通で時間枠を生成
  const previewSlots = useMemo(() => {
    if (isRegularMode) return [];
    return generateTimeSlots(rangeStart, rangeEnd, durationMinutes, offsetMode);
  }, [isRegularMode, rangeStart, rangeEnd, durationMinutes, offsetMode]);

  // 定期開催モード用: 生成されるスロット数
  const regularPreviewSlots = useMemo(() => {
    if (!isRegularMode) return [];
    return generateTimeSlots(
      regularRangeStart,
      regularRangeEnd,
      regularDuration,
    );
  }, [isRegularMode, regularRangeStart, regularRangeEnd, regularDuration]);

  // 定期開催モード: 曜日と時間から候補を追加
  const handleAddRegularCandidates = () => {
    if (selectedWeekdays.size === 0) return;

    const slots = generateTimeSlots(
      regularRangeStart,
      regularRangeEnd,
      regularDuration,
    );
    if (slots.length === 0) return;

    const newCandidates: CandidateDate[] = [];
    const sortedWeekdays = Array.from(selectedWeekdays).sort();

    for (const dayOfWeek of sortedWeekdays) {
      for (const slot of slots) {
        newCandidates.push({
          date: WEEKDAY_DATES[dayOfWeek],
          start_time: slot.start,
          end_time: slot.end,
        });
      }
    }

    // 重複を除いて追加
    const existingKeys = new Set(
      candidates.map(
        (c) => `${c.date}-${c.start_time || ""}-${c.end_time || ""}`,
      ),
    );
    const uniqueNew = newCandidates.filter(
      (c) =>
        !existingKeys.has(
          `${c.date}-${c.start_time || ""}-${c.end_time || ""}`,
        ),
    );

    onChange([...candidates, ...uniqueNew]);
    setSelectedWeekdays(new Set());
  };

  const removeCandidate = (index: number) => {
    onChange(candidates.filter((_, i) => i !== index));
  };

  const clearAllCandidates = () => {
    onChange([]);
  };

  const isPastDate = (date: Date) => {
    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    return date < todayStart;
  };

  // 定期開催モード: 専用UI
  if (isRegularMode) {
    return (
      <div className="space-y-4">
        {/* 頻度選択 */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            開催頻度
          </label>
          <div className="flex flex-wrap gap-2">
            {FREQUENCIES.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFrequency(f.value)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium border-2 transition-all ${
                  frequency === f.value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-slate-200 hover:border-slate-300 text-slate-600"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* 曜日選択 */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
            <label className="block text-sm font-medium text-slate-700">
              曜日を選択
            </label>
          </div>
          <div className="p-4">
            <div
              className="flex justify-center gap-2 select-none"
              onMouseLeave={handleWeekdayDragEnd}
              onMouseUp={handleWeekdayDragEnd}
              onTouchEnd={handleWeekdayDragEnd}
            >
              {[1, 2, 3, 4, 5, 6, 0].map((i) => {
                const isSelected = selectedWeekdays.has(i);
                const isDragTarget =
                  isDraggingWeekday && draggedWeekdays.has(i);
                const previewSelected =
                  isDragTarget && dragModeWeekday === "select" && !isSelected;
                const previewDeselected =
                  isDragTarget && dragModeWeekday === "deselect" && isSelected;

                return (
                  <button
                    key={i}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleWeekdayDragStart(i);
                    }}
                    onMouseEnter={() => handleWeekdayDragEnter(i)}
                    onTouchStart={() => handleWeekdayDragStart(i)}
                    className={`w-11 h-11 rounded-xl text-sm font-semibold transition-all touch-none ${
                      (isSelected && !previewDeselected) || previewSelected
                        ? "bg-primary text-white shadow-md shadow-primary/30 scale-105"
                        : previewDeselected
                          ? "bg-primary/20 text-primary scale-95"
                          : i === 0
                            ? "bg-red-50 text-red-400 hover:bg-red-100"
                            : i === 6
                              ? "bg-blue-50 text-blue-400 hover:bg-blue-100"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {WEEKDAYS[i]}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 mt-3 text-center">
              タップまたはドラッグで選択
            </p>
          </div>
        </div>

        {/* 時間設定パネル（曜日選択時に表示） */}
        {selectedWeekdays.size > 0 && (
          <div className="bg-white border-2 border-primary rounded-xl shadow-lg shadow-primary/10 overflow-hidden animate-in slide-in-from-top-2">
            {/* ヘッダー */}
            <div className="bg-primary px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {selectedWeekdays.size}
                </span>
                <span className="text-white font-medium">曜日選択中</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWeekdays(new Set())}
                className="text-white/70 hover:text-white text-sm"
              >
                選択解除
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* 所要時間選択 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">
                  所要時間
                </label>
                <div className="flex flex-wrap gap-2">
                  {[30, 60, 90, 120].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setRegularDuration(d)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                        regularDuration === d
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-slate-200 bg-white hover:border-slate-300 text-slate-600"
                      }`}
                    >
                      {d >= 60
                        ? `${Math.floor(d / 60)}時間${d % 60 > 0 ? `${d % 60}分` : ""}`
                        : `${d}分`}
                    </button>
                  ))}
                </div>
              </div>

              {/* 候補時間の範囲 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">
                  候補時間の範囲
                </label>
                <div className="flex gap-3 items-center">
                  <select
                    value={regularRangeStart}
                    onChange={(e) => setRegularRangeStart(e.target.value)}
                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <span className="text-slate-400 font-medium">〜</span>
                  <select
                    value={regularRangeEnd}
                    onChange={(e) => setRegularRangeEnd(e.target.value)}
                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* プレビュー */}
              {regularPreviewSlots.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-2 font-medium">
                    生成される枠: {regularDuration}分 ×{" "}
                    {regularPreviewSlots.length}枠/曜日
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {regularPreviewSlots.slice(0, 8).map((slot, i) => (
                      <span
                        key={i}
                        className="text-xs bg-white px-2.5 py-1 rounded-md border border-slate-200 text-slate-600"
                      >
                        {slot.start}〜{slot.end}
                      </span>
                    ))}
                    {regularPreviewSlots.length > 8 && (
                      <span className="text-xs text-slate-400 px-2 py-1">
                        +{regularPreviewSlots.length - 8}枠
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* 追加ボタン */}
              <Button
                type="button"
                onClick={handleAddRegularCandidates}
                size="lg"
                className="w-full"
                disabled={regularPreviewSlots.length === 0}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  {selectedWeekdays.size}曜日 × {regularPreviewSlots.length}枠 ={" "}
                  {selectedWeekdays.size * regularPreviewSlots.length}件を追加
                </span>
              </Button>
            </div>
          </div>
        )}

        {/* 追加済み候補一覧 */}
        {candidates.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xs font-bold">
                  {candidates.length}
                </span>
                <h4 className="text-sm font-medium text-slate-700">候補一覧</h4>
              </div>
              <button
                type="button"
                onClick={clearAllCandidates}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors"
              >
                すべてクリア
              </button>
            </div>
            <div className="p-3 max-h-48 overflow-y-auto">
              <div className="flex flex-wrap gap-1.5">
                {candidates.map((candidate, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => removeCandidate(index)}
                    className="group inline-flex items-center gap-1.5 bg-slate-50 hover:bg-red-50 px-2.5 py-1.5 rounded-md text-xs transition-all border border-transparent hover:border-red-200"
                    title="タップで削除"
                  >
                    <span className="text-slate-600 group-hover:text-red-600">
                      {formatCandidate(candidate)}
                    </span>
                    <span className="text-slate-300 group-hover:text-red-400 text-sm">
                      ×
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* カレンダー */}
      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        {/* 月ナビゲーション */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-border">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="w-9 h-9 flex items-center justify-center hover:bg-white rounded-lg transition-colors text-muted hover:text-foreground"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-foreground">
              {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
            </span>
            <button
              type="button"
              onClick={() => setWeekStartsOnMonday(!weekStartsOnMonday)}
              className="text-xs text-muted hover:text-primary px-2 py-1 rounded-md hover:bg-white transition-colors"
            >
              {weekStartsOnMonday ? "月→日" : "日→月"}
            </button>
          </div>
          <button
            type="button"
            onClick={handleNextMonth}
            className="w-9 h-9 flex items-center justify-center hover:bg-white rounded-lg transition-colors text-muted hover:text-foreground"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>

        <div className="p-3">
          {/* 曜日ヘッダー */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {weekdays.map((day) => (
              <div
                key={day}
                className={`text-center text-xs font-medium py-2 ${
                  day === "日"
                    ? "text-red-400"
                    : day === "土"
                      ? "text-blue-400"
                      : "text-slate-400"
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* 日付グリッド */}
          <div
            className="grid grid-cols-7 gap-1 select-none"
            onMouseLeave={handleDragEnd}
            onMouseUp={handleDragEnd}
            onTouchEnd={handleDragEnd}
          >
            {days.map((date, i) => {
              if (!date) {
                return <div key={`empty-${i}`} className="aspect-square" />;
              }

              const key = formatDateKey(date);
              const isSelected = selectedDates.has(key);
              const isAdded = candidateDateSet.has(key);
              const isPast = isPastDate(date);
              const isToday = formatDateKey(today) === key;
              const dayOfWeek = date.getDay();

              // ドラッグ中のプレビュー表示
              const isDragTarget = isDragging && draggedDates.has(key);
              const previewSelected =
                isDragTarget && dragMode === "select" && !isSelected;
              const previewDeselected =
                isDragTarget && dragMode === "deselect" && isSelected;

              return (
                <button
                  key={key}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (!isPast) handleDragStart(date);
                  }}
                  onMouseEnter={() => handleDragEnter(date)}
                  onTouchStart={() => {
                    if (!isPast) handleDragStart(date);
                  }}
                  onTouchMove={(e) => {
                    const touch = e.touches[0];
                    const element = document.elementFromPoint(
                      touch.clientX,
                      touch.clientY,
                    );
                    const dateKey = element?.getAttribute("data-date");
                    if (dateKey && !isPastDate(new Date(dateKey))) {
                      setDraggedDates((prev) => {
                        const next = new Set(prev);
                        next.add(dateKey);
                        return next;
                      });
                    }
                  }}
                  data-date={key}
                  disabled={isPast}
                  className={`
                    aspect-square flex items-center justify-center rounded-lg text-sm font-medium
                    transition-all duration-150 relative touch-none
                    ${isPast ? "text-slate-200 cursor-not-allowed" : "cursor-pointer hover:bg-slate-100"}
                    ${isSelected && !previewDeselected ? "bg-primary text-white shadow-sm shadow-primary/30 scale-105" : ""}
                    ${previewSelected ? "bg-primary/70 text-white scale-105" : ""}
                    ${previewDeselected ? "bg-primary/20 text-primary scale-95" : ""}
                    ${isAdded && !isSelected && !previewSelected ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200" : ""}
                    ${isToday && !isSelected && !previewSelected ? "ring-2 ring-primary font-bold" : ""}
                    ${!isPast && !isSelected && !previewSelected && !isAdded && dayOfWeek === 0 ? "text-red-400" : ""}
                    ${!isPast && !isSelected && !previewSelected && !isAdded && dayOfWeek === 6 ? "text-blue-400" : ""}
                    ${!isPast && !isSelected && !previewSelected && !isAdded && dayOfWeek !== 0 && dayOfWeek !== 6 ? "text-slate-700" : ""}
                  `}
                >
                  {date.getDate()}
                  {isAdded && !isSelected && !previewSelected && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* ヒント */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              タップで選択 • ドラッグでまとめて
            </p>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-primary" />
                <span className="text-slate-400">選択中</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-emerald-100 ring-1 ring-emerald-300" />
                <span className="text-slate-400">追加済</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 時間選択パネル */}
      {selectedDates.size > 0 && (
        <div className="bg-white border-2 border-primary rounded-xl shadow-lg shadow-primary/10 overflow-hidden animate-in slide-in-from-top-2">
          {/* ヘッダー */}
          <div className="bg-primary px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-white text-sm font-bold">
                {selectedDates.size}
              </span>
              <span className="text-white font-medium">日選択中</span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDates(new Set())}
              className="text-white/70 hover:text-white text-sm"
            >
              選択解除
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* 時間範囲選択 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">
                候補時間の範囲
              </label>
              <div className="flex gap-3 items-center">
                <select
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <span className="text-slate-400 font-medium">〜</span>
                <select
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* プレビュー */}
            {previewSlots.length > 0 && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-2 font-medium">
                  生成される枠: {durationMinutes}分 × {previewSlots.length}枠/日
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {previewSlots.slice(0, 8).map((slot, i) => (
                    <span
                      key={i}
                      className="text-xs bg-white px-2.5 py-1 rounded-md border border-slate-200 text-slate-600"
                    >
                      {slot.start}〜{slot.end}
                    </span>
                  ))}
                  {previewSlots.length > 8 && (
                    <span className="text-xs text-slate-400 px-2 py-1">
                      +{previewSlots.length - 8}枠
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* 追加ボタン */}
            <Button
              type="button"
              onClick={handleGenerateSlots}
              size="lg"
              className="w-full"
              disabled={previewSlots.length === 0}
            >
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                {selectedDates.size}日 × {previewSlots.length}枠 ={" "}
                {selectedDates.size * previewSlots.length}件を追加
              </span>
            </Button>
          </div>
        </div>
      )}

      {/* 追加済み候補一覧 */}
      {candidates.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xs font-bold">
                {candidates.length}
              </span>
              <h4 className="text-sm font-medium text-slate-700">候補日時</h4>
            </div>
            <button
              type="button"
              onClick={clearAllCandidates}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              すべてクリア
            </button>
          </div>
          <div className="p-3 max-h-48 overflow-y-auto">
            <div className="flex flex-wrap gap-1.5">
              {candidates.map((candidate, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => removeCandidate(index)}
                  className="group inline-flex items-center gap-1.5 bg-slate-50 hover:bg-red-50 px-2.5 py-1.5 rounded-md text-xs transition-all border border-transparent hover:border-red-200"
                  title="タップで削除"
                >
                  <span className="text-slate-600 group-hover:text-red-600">
                    {formatCandidate(candidate)}
                  </span>
                  <span className="text-slate-300 group-hover:text-red-400 text-sm">
                    ×
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
