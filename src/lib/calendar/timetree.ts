interface CalendarEvent {
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
}

/**
 * TimeTreeアプリで予定を作成するためのURLを生成
 * timetreeapp:// スキームを使用（モバイルアプリ用）
 */
export function getTimeTreeUrl(event: CalendarEvent): string {
  // TimeTreeは ISO 8601 形式の日時を使用
  // 例: 2024-01-15T10:00:00+09:00
  const timezone = "+09:00"; // JST

  let startAt: string;
  let endAt: string;

  if (event.startTime && event.endTime) {
    startAt = `${event.date}T${event.startTime}:00${timezone}`;
    endAt = `${event.date}T${event.endTime}:00${timezone}`;
  } else if (event.startTime) {
    // 開始時刻のみ（1時間のイベントとして）
    startAt = `${event.date}T${event.startTime}:00${timezone}`;
    const [hours, minutes] = event.startTime.split(":").map(Number);
    const endHours = String((hours + 1) % 24).padStart(2, "0");
    endAt = `${event.date}T${endHours}:${String(minutes).padStart(2, "0")}:00${timezone}`;
  } else {
    // 終日イベント
    startAt = `${event.date}T00:00:00${timezone}`;
    endAt = `${event.date}T23:59:59${timezone}`;
  }

  const params = new URLSearchParams({
    title: event.title,
    start_at: startAt,
    end_at: endAt,
    all_day: event.startTime ? "false" : "true",
  });

  if (event.description) {
    params.set("note", event.description);
  }

  return `timetreeapp://events/create?${params.toString()}`;
}
