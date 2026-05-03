"use client";

import { useState, useMemo } from "react";
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

const QUICK_TIMES = [
  { label: "終日", start: "", end: "" },
  { label: "10:00〜", start: "10:00", end: "" },
  { label: "13:00〜", start: "13:00", end: "" },
  { label: "19:00〜", start: "19:00", end: "" },
  { label: "19:00-21:00", start: "19:00", end: "21:00" },
  { label: "20:00-22:00", start: "20:00", end: "22:00" },
];

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

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: (Date | null)[] = [];

  // 月初の曜日まで空白を追加
  for (let i = 0; i < firstDay.getDay(); i++) {
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

function formatCandidate(c: CandidateDate) {
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

  const isMeetingMode = mode === "meeting";

  const days = useMemo(
    () => getMonthDays(currentMonth.getFullYear(), currentMonth.getMonth()),
    [currentMonth],
  );

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

  const removeCandidate = (index: number) => {
    onChange(candidates.filter((_, i) => i !== index));
  };

  const isPastDate = (date: Date) => {
    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    return date < todayStart;
  };

  return (
    <div className="space-y-4">
      {/* カレンダー */}
      <div className="border border-border rounded-lg p-4">
        {/* 月ナビゲーション */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            ←
          </button>
          <span className="font-medium">
            {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            →
          </button>
        </div>

        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS.map((day, i) => (
            <div
              key={day}
              className={`text-center text-sm font-medium py-1 ${
                i === 0
                  ? "text-red-500"
                  : i === 6
                    ? "text-blue-500"
                    : "text-gray-600"
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 日付グリッド */}
        <div className="grid grid-cols-7 gap-1">
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

            return (
              <button
                key={key}
                type="button"
                onClick={() => !isPast && handleDateClick(date)}
                disabled={isPast}
                className={`
                  aspect-square flex items-center justify-center rounded-lg text-sm
                  transition-all relative
                  ${isPast ? "text-gray-300 cursor-not-allowed" : "hover:bg-gray-100"}
                  ${isSelected ? "bg-primary text-white hover:bg-primary" : ""}
                  ${isAdded && !isSelected ? "bg-green-100 text-green-700" : ""}
                  ${isToday && !isSelected ? "ring-2 ring-primary ring-inset" : ""}
                  ${!isPast && !isSelected && dayOfWeek === 0 ? "text-red-500" : ""}
                  ${!isPast && !isSelected && dayOfWeek === 6 ? "text-blue-500" : ""}
                `}
              >
                {date.getDate()}
                {isAdded && !isSelected && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-green-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-muted mt-2">
          日付をタップして選択（複数選択可）
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
                <label className="text-sm text-gray-600">候補時間の範囲</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="time"
                    value={rangeStart}
                    onChange={(e) => setRangeStart(e.target.value)}
                    className="flex-1 px-3 py-2 border border-border rounded-lg text-sm"
                  />
                  <span className="text-gray-500">〜</span>
                  <input
                    type="time"
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(e.target.value)}
                    className="flex-1 px-3 py-2 border border-border rounded-lg text-sm"
                  />
                </div>
              </div>

              {previewSlots.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-2">
                    生成される枠（{durationMinutes}分 × {previewSlots.length}
                    枠/日）
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {previewSlots.slice(0, 8).map((slot, i) => (
                      <span
                        key={i}
                        className="text-xs bg-white px-2 py-1 rounded border border-gray-200"
                      >
                        {slot.start}-{slot.end}
                      </span>
                    ))}
                    {previewSlots.length > 8 && (
                      <span className="text-xs text-gray-400 px-2 py-1">
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
              <p className="text-sm text-gray-600">時間帯を選択</p>

              {/* クイック選択 */}
              <div className="flex flex-wrap gap-2">
                {QUICK_TIMES.map((time) => (
                  <button
                    key={time.label}
                    type="button"
                    onClick={() => {
                      setSelectedTime(time);
                      setUseCustomTime(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                      !useCustomTime && selectedTime.label === time.label
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {time.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setUseCustomTime(true)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                    useCustomTime
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  カスタム
                </button>
              </div>

              {/* カスタム時間入力 */}
              {useCustomTime && (
                <div className="flex gap-2 items-center">
                  <input
                    type="time"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="px-3 py-2 border border-border rounded-lg text-sm"
                  />
                  <span>〜</span>
                  <input
                    type="time"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="px-3 py-2 border border-border rounded-lg text-sm"
                  />
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
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            候補日一覧（{candidates.length}件）
          </h4>
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {candidates.map((candidate, index) => (
              <li
                key={index}
                className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded"
              >
                <span className="text-sm">{formatCandidate(candidate)}</span>
                <button
                  type="button"
                  onClick={() => removeCandidate(index)}
                  className="text-error hover:text-red-700 text-sm"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
