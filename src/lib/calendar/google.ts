interface CalendarEvent {
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
}

export function getGoogleCalendarUrl(event: CalendarEvent): string {
  const baseUrl = "https://calendar.google.com/calendar/render";

  // 日時のフォーマット
  let dates: string;
  if (event.startTime && event.endTime) {
    // 時間指定あり
    const startDateTime = `${event.date.replace(/-/g, "")}T${event.startTime.replace(":", "")}00`;
    const endDateTime = `${event.date.replace(/-/g, "")}T${event.endTime.replace(":", "")}00`;
    dates = `${startDateTime}/${endDateTime}`;
  } else if (event.startTime) {
    // 開始時刻のみ（1時間のイベントとして）
    const startDateTime = `${event.date.replace(/-/g, "")}T${event.startTime.replace(":", "")}00`;
    const [hours, minutes] = event.startTime.split(":").map(Number);
    const endHours = String((hours + 1) % 24).padStart(2, "0");
    const endDateTime = `${event.date.replace(/-/g, "")}T${endHours}${String(minutes).padStart(2, "0")}00`;
    dates = `${startDateTime}/${endDateTime}`;
  } else {
    // 終日
    const dateStr = event.date.replace(/-/g, "");
    dates = `${dateStr}/${dateStr}`;
  }

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates,
  });

  if (event.description) {
    params.set("details", event.description);
  }

  return `${baseUrl}?${params.toString()}`;
}
