import type { EventTemplate, CandidatePattern } from "@/types";
import { nanoid } from "nanoid";

const TEMPLATES_KEY = "chouseisan_templates";

export function getTemplates(): EventTemplate[] {
  if (typeof window === "undefined") return [];

  const stored = localStorage.getItem(TEMPLATES_KEY);
  if (!stored) return [];

  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveTemplate(
  template: Omit<EventTemplate, "id" | "created_at" | "updated_at">,
): EventTemplate {
  const templates = getTemplates();
  const now = new Date().toISOString();

  const newTemplate: EventTemplate = {
    ...template,
    id: nanoid(10),
    created_at: now,
    updated_at: now,
  };

  templates.push(newTemplate);
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));

  return newTemplate;
}

export function updateTemplate(
  id: string,
  updates: Partial<Omit<EventTemplate, "id" | "created_at" | "updated_at">>,
): EventTemplate | null {
  const templates = getTemplates();
  const index = templates.findIndex((t) => t.id === id);

  if (index === -1) return null;

  templates[index] = {
    ...templates[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };

  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  return templates[index];
}

export function deleteTemplate(id: string): boolean {
  const templates = getTemplates();
  const filtered = templates.filter((t) => t.id !== id);

  if (filtered.length === templates.length) return false;

  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(filtered));
  return true;
}

// 曜日名
const WEEKDAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

export function getWeekdayName(day: number): string {
  return WEEKDAY_NAMES[day] || "";
}

// テンプレートパターンから実際の日付を生成
export function generateCandidatesFromPattern(
  patterns: CandidatePattern[],
  weeksAhead: number = 4,
): { date: string; start_time: string | null; end_time: string | null }[] {
  const candidates: {
    date: string;
    start_time: string | null;
    end_time: string | null;
  }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const pattern of patterns) {
    if (pattern.day_type === "relative") {
      // 相対日数指定
      const date = new Date(today);
      date.setDate(date.getDate() + pattern.day_value);
      candidates.push({
        date: date.toISOString().split("T")[0],
        start_time: pattern.start_time,
        end_time: pattern.end_time,
      });
    } else {
      // 曜日指定 - weeksAhead週間分の候補を生成
      for (let week = 0; week < weeksAhead; week++) {
        const date = new Date(today);
        const daysUntilTarget = (pattern.day_value - today.getDay() + 7) % 7;
        date.setDate(date.getDate() + daysUntilTarget + week * 7);

        // 今日より前の日付はスキップ
        if (date < today) continue;

        candidates.push({
          date: date.toISOString().split("T")[0],
          start_time: pattern.start_time,
          end_time: pattern.end_time,
        });
      }
    }
  }

  // 日付順にソート
  candidates.sort((a, b) => a.date.localeCompare(b.date));

  return candidates;
}

// パターンの説明テキストを生成
export function describePattern(pattern: CandidatePattern): string {
  let description = "";

  if (pattern.day_type === "relative") {
    if (pattern.day_value === 0) {
      description = "今日";
    } else if (pattern.day_value === 1) {
      description = "明日";
    } else {
      description = `${pattern.day_value}日後`;
    }
  } else {
    description = `毎週${getWeekdayName(pattern.day_value)}曜日`;
  }

  if (pattern.start_time) {
    description += ` ${pattern.start_time}`;
    if (pattern.end_time) {
      description += `〜${pattern.end_time}`;
    }
  }

  return description;
}
