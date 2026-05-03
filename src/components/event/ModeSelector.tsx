"use client";

import type { EventMode } from "@/types";

interface ModeSelectorProps {
  value: EventMode;
  onChange: (mode: EventMode) => void;
}

const modes: { value: EventMode; label: string; description: string }[] = [
  {
    value: "event",
    label: "イベント",
    description: "最多参加者の日を探す",
  },
  {
    value: "meeting",
    label: "全員集合",
    description: "全員が参加できる日を探す",
  },
  {
    value: "regular",
    label: "定例",
    description: "毎週の固定時間を決める",
  },
];

export function ModeSelector({ value, onChange }: ModeSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        調整モード
      </label>
      <div className="grid grid-cols-3 gap-2">
        {modes.map((mode) => (
          <button
            key={mode.value}
            type="button"
            onClick={() => onChange(mode.value)}
            className={`p-3 rounded-lg border-2 text-center transition-all ${
              value === mode.value
                ? "border-primary bg-primary/5 text-primary"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="font-medium text-sm">{mode.label}</div>
            <div className="text-xs text-muted mt-1">{mode.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
