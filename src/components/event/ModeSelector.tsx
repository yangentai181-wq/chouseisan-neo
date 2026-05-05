"use client";

import type { EventMode } from "@/types";

interface ModeSelectorProps {
  value: EventMode;
  onChange: (mode: EventMode) => void;
}

const modes: { value: EventMode; label: string; description: string }[] = [
  {
    value: "event",
    label: "多数決",
    description: "参加可能な人が最も多い日程を選ぶ",
  },
  {
    value: "meeting",
    label: "全員参加",
    description: "全員が参加できる日時を探す",
  },
  {
    value: "regular",
    label: "定期開催",
    description: "繰り返し開催の時間帯を決める",
  },
];

export function ModeSelector({ value, onChange }: ModeSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">
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
                : "border-border hover:border-muted"
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
