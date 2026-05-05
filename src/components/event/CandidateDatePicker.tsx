"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui";
import type { EventMode } from "@/types";

interface CandidateDate {
  date: string;
  start_time?: string;
  end_time?: string;
}

interface CandidateDatePickerProps {
  candidates: CandidateDate[];
  onChange: (candidates: CandidateDate[]) => void;
  mode?: EventMode;
  durationMinutes?: number;
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

const QUICK_TIMES = [
  { label: "終日", start: "", end: "", category: "basic" },
  { label: "午前", start: "10:00", end: "12:00", category: "basic" },
  { label: "午後", start: "13:00", end: "17:00", category: "basic" },
  { label: "ランチ", start: "12:00", end: "13:00", category: "meal" },
  { label: "ディナー", start: "18:00", end: "20:00", category: "meal" },
  { label: "飲み会", start: "19:00", end: "22:00", category: "meal" },
  { label: "朝会", start: "09:00", end: "10:00", category: "meeting" },
  { label: "夕方MTG", start: "17:00", end: "18:00", category: "meeting" },
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
function generateTimeSlots(
  rangeStart: string,
  rangeEnd: string,
  durationMinutes: number,
): { start: string; end: string }[] {
  const slots: { start: string; end: string }[] = [];
  if (!rangeStart || !rangeEnd || durationMinutes <= 0) return slots;

  const [startH, startM] = rangeStart.split(":").map(Number);
  const [endH, endM] = rangeEnd.split(":").map(Number);
  const rangeStartMinutes = startH * 60 + startM;
  const rangeEndMinutes = endH * 60 + endM;

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

    current += durationMinutes;
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
}: CandidateDatePickerProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [selectedTime, setSelectedTime] = useState(QUICK_TIMES[0]);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [useCustomTime, setUseCustomTime] = useState(false);

  // 全員集合モード用: 時間範囲
  const [rangeStart, setRangeStart] = useState("09:00");
  const [rangeEnd, setRangeEnd] = useState("18:00");

  // 定期開催モード用
  const [selectedWeekdays, setSelectedWeekdays] = useState<Set<number>>(
    new Set(),
  );
  const [frequency, setFrequency] = useState("weekly");
  const [regularStartTime, setRegularStartTime] = useState("10:00");
  const [regularEndTime, setRegularEndTime] = useState("11:00");

  // ドラッグ選択用
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"select" | "deselect">("select");
  const [draggedDates, setDraggedDates] = useState<Set<string>>(new Set());

  // カレンダー週始まり
  const [weekStartsOnMonday, setWeekStartsOnMonday] = useState(false);

  const isMeetingMode = mode === "meeting";
  const isRegularMode = mode === "regular";

  // グローバルなマウスアップでドラッグ終了
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleDragEnd();
      }
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    window.addEventListener("touchend", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      window.removeEventListener("touchend", handleGlobalMouseUp);
    };
  }, [isDragging, draggedDates, dragMode]);

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

  const handleDateClick = (date: Date) => {
    const key = formatDateKey(date);
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

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

  // ドラッグ終了
  const handleDragEnd = () => {
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

  const handleAddCandidates = () => {
    if (selectedDates.size === 0) return;

    const startTime = useCustomTime ? customStart : selectedTime.start;
    const endTime = useCustomTime ? customEnd : selectedTime.end;

    const newCandidates: CandidateDate[] = Array.from(selectedDates)
      .sort()
      .map((date) => ({
        date,
        ...(startTime && { start_time: startTime }),
        ...(endTime && { end_time: endTime }),
      }));

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
    setSelectedDates(new Set());
  };

  // 全員集合モード: 時間範囲から自動生成
  const handleGenerateSlots = () => {
    if (selectedDates.size === 0) return;

    const slots = generateTimeSlots(rangeStart, rangeEnd, durationMinutes);
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
  const previewSlots = useMemo(() => {
    if (!isMeetingMode) return [];
    return generateTimeSlots(rangeStart, rangeEnd, durationMinutes);
  }, [isMeetingMode, rangeStart, rangeEnd, durationMinutes]);

  // 定期開催モード: 曜日と時間から候補を追加
  const handleAddRegularCandidates = () => {
    if (selectedWeekdays.size === 0) return;
    if (!regularStartTime) return;

    const newCandidates: CandidateDate[] = Array.from(selectedWeekdays)
      .sort()
      .map((dayOfWeek) => ({
        date: WEEKDAY_DATES[dayOfWeek],
        start_time: regularStartTime,
        end_time: regularEndTime || undefined,
      }));

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

  // 曜日選択のトグル
  const handleWeekdayToggle = (dayOfWeek: number) => {
    setSelectedWeekdays((prev) => {
      const next = new Set(prev);
      if (next.has(dayOfWeek)) {
        next.delete(dayOfWeek);
      } else {
        next.add(dayOfWeek);
      }
      return next;
    });
  };

  const removeCandidate = (index: number) => {
    onChange(candidates.filter((_, i) => i !== index));
  };

  const moveCandidate = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= candidates.length) return;
    const newCandidates = [...candidates];
    [newCandidates[index], newCandidates[newIndex]] = [
      newCandidates[newIndex],
      newCandidates[index],
    ];
    onChange(newCandidates);
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
        <div className="border border-border rounded-lg p-4 space-y-3">
          <label className="block text-sm font-medium text-foreground">
            開催頻度
          </label>
          <div className="flex flex-wrap gap-2">
            {FREQUENCIES.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFrequency(f.value)}
                className={`px-4 py-2 rounded-lg text-sm border-2 transition-all ${
                  frequency === f.value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:border-muted"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* 曜日選択 */}
        <div className="border border-border rounded-lg p-4 space-y-3">
          <label className="block text-sm font-medium text-foreground">
            曜日を選択
          </label>
          <div className="flex gap-2">
            {WEEKDAYS.map((day, i) => (
              <button
                key={day}
                type="button"
                onClick={() => handleWeekdayToggle(i)}
                className={`w-10 h-10 rounded-full text-sm font-medium transition-all ${
                  selectedWeekdays.has(i)
                    ? "bg-primary text-white"
                    : i === 0
                      ? "bg-background text-red-500 hover:bg-border"
                      : i === 6
                        ? "bg-background text-blue-500 hover:bg-border"
                        : "bg-background text-foreground hover:bg-border"
                }`}
              >
                {day}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">
            複数選択可。参加者は選んだ曜日の中から希望順位をつけます。
          </p>
        </div>

        {/* 時間帯入力 */}
        <div className="border border-border rounded-lg p-4 space-y-3">
          <label className="block text-sm font-medium text-foreground">
            時間帯
          </label>
          <div className="flex gap-2 items-center">
            <select
              value={regularStartTime}
              onChange={(e) => setRegularStartTime(e.target.value)}
              className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-white"
            >
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <span className="text-muted">〜</span>
            <select
              value={regularEndTime}
              onChange={(e) => setRegularEndTime(e.target.value)}
              className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-white"
            >
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 追加ボタン */}
        {selectedWeekdays.size > 0 && (
          <Button
            type="button"
            onClick={handleAddRegularCandidates}
            className="w-full"
          >
            {selectedWeekdays.size}つの曜日を候補に追加
          </Button>
        )}

        {/* 追加済み候補一覧 */}
        {candidates.length > 0 && (
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-foreground">
                候補一覧（{candidates.length}件）
              </h4>
              <button
                type="button"
                onClick={clearAllCandidates}
                className="text-xs text-muted hover:text-error"
              >
                すべてクリア
              </button>
            </div>
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {candidates.map((candidate, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between bg-background px-3 py-2 rounded group"
                >
                  <span className="text-sm">{formatCandidate(candidate)}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveCandidate(index, "up")}
                      disabled={index === 0}
                      className="text-muted hover:text-foreground text-sm disabled:opacity-30 disabled:cursor-not-allowed px-1"
                      title="上に移動"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveCandidate(index, "down")}
                      disabled={index === candidates.length - 1}
                      className="text-muted hover:text-foreground text-sm disabled:opacity-30 disabled:cursor-not-allowed px-1"
                      title="下に移動"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCandidate(index)}
                      className="text-error hover:text-red-700 text-sm px-1"
                      title="削除"
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* カレンダー */}
      <div className="border border-border rounded-lg p-4">
        {/* 月ナビゲーション */}
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2 hover:bg-background rounded-lg"
          >
            ←
          </button>
          <span className="font-medium">
            {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-2 hover:bg-background rounded-lg"
          >
            →
          </button>
        </div>

        {/* 週始まり切り替え */}
        <div className="flex justify-end mb-2">
          <button
            type="button"
            onClick={() => setWeekStartsOnMonday(!weekStartsOnMonday)}
            className="text-xs text-muted hover:text-foreground px-2 py-1 rounded hover:bg-background"
          >
            {weekStartsOnMonday ? "日曜始まりに変更" : "月曜始まりに変更"}
          </button>
        </div>

        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekdays.map((day) => (
            <div
              key={day}
              className={`text-center text-sm font-medium py-1 ${
                day === "日"
                  ? "text-red-500"
                  : day === "土"
                    ? "text-blue-500"
                    : "text-muted"
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
                onTouchStart={(e) => {
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
                  aspect-square flex items-center justify-center rounded-lg text-sm
                  transition-colors relative touch-none
                  ${isPast ? "text-border cursor-not-allowed" : "cursor-pointer"}
                  ${isSelected && !previewDeselected ? "bg-primary text-white" : ""}
                  ${previewSelected ? "bg-primary/60 text-white" : ""}
                  ${previewDeselected ? "bg-primary/30 text-primary" : ""}
                  ${isAdded && !isSelected && !previewSelected ? "bg-green-100 text-green-700" : ""}
                  ${isToday && !isSelected && !previewSelected ? "ring-2 ring-primary ring-inset" : ""}
                  ${!isPast && !isSelected && !previewSelected && dayOfWeek === 0 ? "text-red-500" : ""}
                  ${!isPast && !isSelected && !previewSelected && dayOfWeek === 6 ? "text-blue-500" : ""}
                `}
              >
                {date.getDate()}
                {isAdded && !isSelected && !previewSelected && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-green-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-muted mt-2">
          タップで選択、ドラッグでまとめて選択
        </p>
      </div>

      {/* 時間選択 */}
      {selectedDates.size > 0 && (
        <div className="border border-border rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium">{selectedDates.size}日選択中</p>

          {isMeetingMode ? (
            /* 全員集合モード: 時間範囲で自動生成 */
            <>
              <div className="space-y-2">
                <label className="text-sm text-muted">候補時間の範囲</label>
                <div className="flex gap-2 items-center">
                  <select
                    value={rangeStart}
                    onChange={(e) => setRangeStart(e.target.value)}
                    className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-white"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <span className="text-muted">〜</span>
                  <select
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(e.target.value)}
                    className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-white"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {previewSlots.length > 0 && (
                <div className="bg-background rounded-lg p-3">
                  <p className="text-xs text-muted mb-2">
                    生成される枠（{durationMinutes}分 × {previewSlots.length}
                    枠/日）
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {previewSlots.slice(0, 8).map((slot, i) => (
                      <span
                        key={i}
                        className="text-xs bg-white px-2 py-1 rounded border border-border"
                      >
                        {slot.start}-{slot.end}
                      </span>
                    ))}
                    {previewSlots.length > 8 && (
                      <span className="text-xs text-muted px-2 py-1">
                        +{previewSlots.length - 8}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <Button
                type="button"
                onClick={handleGenerateSlots}
                className="w-full"
                disabled={previewSlots.length === 0}
              >
                {selectedDates.size}日 × {previewSlots.length}枠 ={" "}
                {selectedDates.size * previewSlots.length}件を追加
              </Button>
            </>
          ) : (
            /* イベント/定例モード: 従来のクイック選択 */
            <>
              <p className="text-sm text-muted">時間帯を選択</p>

              {/* クイック選択 */}
              <div className="grid grid-cols-4 gap-2">
                {QUICK_TIMES.map((time) => (
                  <button
                    key={time.label}
                    type="button"
                    onClick={() => {
                      setSelectedTime(time);
                      setUseCustomTime(false);
                    }}
                    className={`px-2 py-2 rounded-lg text-sm border transition-all text-center ${
                      !useCustomTime && selectedTime.label === time.label
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-muted"
                    }`}
                  >
                    <div className="font-medium">{time.label}</div>
                    {time.start && (
                      <div className="text-xs text-muted mt-0.5">
                        {time.start}〜{time.end || ""}
                      </div>
                    )}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setUseCustomTime(true)}
                  className={`px-2 py-2 rounded-lg text-sm border transition-all text-center ${
                    useCustomTime
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-muted"
                  }`}
                >
                  <div className="font-medium">カスタム</div>
                  <div className="text-xs text-muted mt-0.5">時間を指定</div>
                </button>
              </div>

              {/* カスタム時間入力 */}
              {useCustomTime && (
                <div className="flex gap-2 items-center">
                  <select
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-white"
                  >
                    <option value="">開始</option>
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <span>〜</span>
                  <select
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-white"
                  >
                    <option value="">終了</option>
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <Button
                type="button"
                onClick={handleAddCandidates}
                className="w-full"
              >
                {selectedDates.size}件の候補日を追加
              </Button>
            </>
          )}
        </div>
      )}

      {/* 追加済み候補一覧 */}
      {candidates.length > 0 && (
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-foreground">
              候補日一覧（{candidates.length}件）
            </h4>
            <button
              type="button"
              onClick={clearAllCandidates}
              className="text-xs text-muted hover:text-error"
            >
              すべてクリア
            </button>
          </div>
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {candidates.map((candidate, index) => (
              <li
                key={index}
                className="flex items-center justify-between bg-background px-3 py-2 rounded group"
              >
                <span className="text-sm">{formatCandidate(candidate)}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveCandidate(index, "up")}
                    disabled={index === 0}
                    className="text-muted hover:text-foreground text-sm disabled:opacity-30 disabled:cursor-not-allowed px-1"
                    title="上に移動"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveCandidate(index, "down")}
                    disabled={index === candidates.length - 1}
                    className="text-muted hover:text-foreground text-sm disabled:opacity-30 disabled:cursor-not-allowed px-1"
                    title="下に移動"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCandidate(index)}
                    className="text-error hover:text-red-700 text-sm px-1"
                    title="削除"
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
