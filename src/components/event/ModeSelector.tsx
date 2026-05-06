"use client";

import type { EventMode } from "@/types";

interface ModeSelectorProps {
  value: EventMode;
  onChange: (mode: EventMode) => void;
  isRegular: boolean;
  onRegularChange: (isRegular: boolean) => void;
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
];

export function ModeSelector({
  value,
  onChange,
  isRegular,
  onRegularChange,
}: ModeSelectorProps) {
  // 内部的に mode を管理（regular は meeting + isRegular で表現）
  const displayMode = value === "regular" ? "meeting" : value;

  const handleModeChange = (mode: EventMode) => {
    onChange(mode);
    // event モードに切り替えたら isRegular をリセット
    if (mode === "event") {
      onRegularChange(false);
    }
  };

  const handleRegularChange = (checked: boolean) => {
    onRegularChange(checked);
    // isRegular が true の場合、内部的には regular モードとして扱う
    if (checked) {
      onChange("regular");
    } else {
      onChange("meeting");
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-foreground">
        調整モード
      </label>
      <div className="grid grid-cols-2 gap-2">
        {modes.map((mode) => (
          <button
            key={mode.value}
            type="button"
            onClick={() => handleModeChange(mode.value)}
            className={`p-3 rounded-lg border-2 text-center transition-all ${
              displayMode === mode.value
                ? "border-primary bg-primary/5 text-primary"
                : "border-border hover:border-muted"
            }`}
          >
            <div className="font-medium text-sm">{mode.label}</div>
            <div className="text-xs text-muted mt-1">{mode.description}</div>
          </button>
        ))}
      </div>

      {/* 全員参加モード選択時に定期開催オプションを表示 */}
      {displayMode === "meeting" && (
        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-border hover:border-muted transition-colors">
          <input
            type="checkbox"
            checked={isRegular}
            onChange={(e) => handleRegularChange(e.target.checked)}
            className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
          />
          <div>
            <span className="text-sm font-medium text-foreground">
              定期開催
            </span>
            <p className="text-xs text-muted">
              繰り返し開催の時間帯を決める（曜日ベース）
            </p>
          </div>
        </label>
      )}
    </div>
  );
}
