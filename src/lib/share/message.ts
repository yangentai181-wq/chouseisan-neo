import type { Candidate } from "@/types";
import { getGoogleCalendarUrl } from "@/lib/calendar/google";

// 定期開催モード用の曜日日付
export const WEEKDAY_DATES = [
  "2000-01-02", // 日
  "2000-01-03", // 月
  "2000-01-04", // 火
  "2000-01-05", // 水
  "2000-01-06", // 木
  "2000-01-07", // 金
  "2000-01-08", // 土
];

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/**
 * 候補日を共有用の文字列にフォーマット
 * 例: "5/10(土) 14:00〜15:00" or "月曜日 10:00〜11:00"
 */
export function formatCandidateForShare(c: Candidate): string {
  // 定期開催モードの曜日日付
  if (WEEKDAY_DATES.includes(c.date)) {
    const dayIndex = WEEKDAY_DATES.indexOf(c.date);
    let result = `${WEEKDAYS[dayIndex]}曜日`;
    if (c.start_time) {
      result += ` ${c.start_time.slice(0, 5)}`;
      if (c.end_time) {
        result += `〜${c.end_time.slice(0, 5)}`;
      }
    }
    return result;
  }

  // 通常の日付
  const date = new Date(c.date);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = WEEKDAYS[date.getDay()];

  let result = `${month}/${day}(${weekday})`;
  if (c.start_time) {
    result += ` ${c.start_time.slice(0, 5)}`;
    if (c.end_time) {
      result += `〜${c.end_time.slice(0, 5)}`;
    }
  }
  return result;
}

/**
 * 締め切り日を表示用にフォーマット
 * 例: "5月10日(土)"
 */
export function formatDeadline(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

interface ShareMessageOptions {
  title: string;
  url: string;
  candidates?: Candidate[];
  responseDeadline?: string | null;
  maxCandidates?: number;
}

/**
 * 共有メッセージ（お願い文）を生成
 */
export function generateShareMessage({
  title,
  url,
  candidates = [],
  responseDeadline,
  maxCandidates = 5,
}: ShareMessageOptions): string {
  let message = `「${title}」の日程調整をお願いします！\n\n`;

  if (candidates.length > 0) {
    const candidateList = candidates
      .slice(0, maxCandidates)
      .map((c) => `・${formatCandidateForShare(c)}`)
      .join("\n");
    const moreText =
      candidates.length > maxCandidates
        ? `\n...他${candidates.length - maxCandidates}件`
        : "";
    message += `${candidateList}${moreText}\n`;
  }

  if (responseDeadline) {
    message += `\n【締め切り】${formatDeadline(responseDeadline)}まで\n`;
  }

  message += `\n▼ ご回答はこちら\n${url}`;
  return message;
}

/**
 * 確定通知メッセージを生成
 */
export function generateFinalizedMessage(
  title: string,
  url: string,
  candidate: Candidate,
): string {
  const dateStr = formatCandidateForShare(candidate);
  const isWeekday = WEEKDAY_DATES.includes(candidate.date);

  // 定例モード（曜日）の場合はカレンダーリンクなし
  // 具体的な日付の場合のみGoogle Calendar URLを生成
  let calendarSection = "";
  if (!isWeekday) {
    const calendarUrl = getGoogleCalendarUrl({
      title,
      date: candidate.date,
      startTime: candidate.start_time || undefined,
      endTime: candidate.end_time || undefined,
    });
    calendarSection = `
▼ カレンダーに登録
${calendarUrl}
`;
  }

  return `【決定】${title}

日程が決定しました!

📅 ${dateStr}
${calendarSection}
▼ 詳細はこちら
${url}`;
}

/**
 * リマインドメッセージを生成
 */
export function generateReminderMessage(
  title: string,
  url: string,
  responseDeadline?: string | null,
): string {
  let message = `【リマインド】${title}の日程調整\n\n`;

  if (responseDeadline) {
    message += `まだ回答されていない方は、${formatDeadline(responseDeadline)}までにご回答をお願いします。`;
  } else {
    message += `まだ回答されていない方は、お早めにご回答をお願いします。`;
  }

  message += `\n\n▼ 回答はこちら\n${url}`;
  return message;
}
