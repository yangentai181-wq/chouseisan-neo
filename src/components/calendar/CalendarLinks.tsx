"use client";

import { Button } from "@/components/ui";
import { getGoogleCalendarUrl } from "@/lib/calendar/google";
import type { Candidate } from "@/types";

interface CalendarLinksProps {
  eventId: string;
  eventTitle: string;
  eventDescription?: string | null;
  candidate: Candidate;
}

export function CalendarLinks({
  eventId,
  eventTitle,
  eventDescription,
  candidate,
}: CalendarLinksProps) {
  const googleUrl = getGoogleCalendarUrl({
    title: eventTitle,
    description: eventDescription || undefined,
    date: candidate.date,
    startTime: candidate.start_time || undefined,
    endTime: candidate.end_time || undefined,
  });

  const icsUrl = `/api/events/${eventId}/calendar?candidateId=${candidate.id}`;

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        onClick={() => window.open(googleUrl, "_blank", "noopener,noreferrer")}
        variant="primary"
      >
        Googleカレンダーに追加
      </Button>
      <Button
        onClick={() => {
          const link = document.createElement("a");
          link.href = icsUrl;
          link.download = `${eventTitle}.ics`;
          link.click();
        }}
        variant="outline"
      >
        ICSダウンロード
      </Button>
    </div>
  );
}
