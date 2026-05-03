interface ICSEvent {
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  uid: string;
}

function formatICSDate(date: string, time?: string): string {
  if (time) {
    return `${date.replace(/-/g, "")}T${time.replace(":", "")}00`;
  }
  return date.replace(/-/g, "");
}

function escapeICS(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function generateICS(event: ICSEvent): string {
  const now = new Date();
  const dtstamp = now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  let dtstart: string;
  let dtend: string;

  if (event.startTime && event.endTime) {
    dtstart = formatICSDate(event.date, event.startTime);
    dtend = formatICSDate(event.date, event.endTime);
  } else if (event.startTime) {
    dtstart = formatICSDate(event.date, event.startTime);
    // 1時間後
    const [hours, minutes] = event.startTime.split(":").map(Number);
    const endHours = String((hours + 1) % 24).padStart(2, "0");
    const endTime = `${endHours}:${String(minutes).padStart(2, "0")}`;
    dtend = formatICSDate(event.date, endTime);
  } else {
    // 終日イベント
    dtstart = formatICSDate(event.date);
    // 翌日
    const nextDay = new Date(event.date);
    nextDay.setDate(nextDay.getDate() + 1);
    dtend = nextDay.toISOString().split("T")[0].replace(/-/g, "");
  }

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Chouseisan Neo//JP",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${dtstamp}`,
  ];

  if (event.startTime) {
    lines.push(`DTSTART:${dtstart}`);
    lines.push(`DTEND:${dtend}`);
  } else {
    lines.push(`DTSTART;VALUE=DATE:${dtstart}`);
    lines.push(`DTEND;VALUE=DATE:${dtend}`);
  }

  lines.push(`SUMMARY:${escapeICS(event.title)}`);

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICS(event.description)}`);
  }

  lines.push("END:VEVENT");
  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}
