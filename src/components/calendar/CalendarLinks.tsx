"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { getGoogleCalendarUrl } from "@/lib/calendar/google";
import { getTimeTreeUrl } from "@/lib/calendar/timetree";
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
  const [showAll, setShowAll] = useState(false);

  const calendarEvent = {
    title: eventTitle,
    description: eventDescription || undefined,
    date: candidate.date,
    startTime: candidate.start_time || undefined,
    endTime: candidate.end_time || undefined,
  };

  const googleUrl = getGoogleCalendarUrl(calendarEvent);
  const timeTreeUrl = getTimeTreeUrl(calendarEvent);
  const icsUrl = `/api/events/${eventId}/calendar?candidateId=${candidate.id}`;

  // Appleカレンダー用のwebcal URLを生成（httpsをwebcalに置換）
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const appleCalendarUrl = `webcal://${baseUrl.replace(/^https?:\/\//, "")}${icsUrl}`;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() =>
            window.open(googleUrl, "_blank", "noopener,noreferrer")
          }
          variant="outline"
          size="sm"
        >
          Google
        </Button>
        <Button
          onClick={() => {
            window.location.href = appleCalendarUrl;
          }}
          variant="outline"
          size="sm"
        >
          Apple
        </Button>
        <Button
          onClick={() => {
            window.location.href = timeTreeUrl;
          }}
          variant="outline"
          size="sm"
        >
          TimeTree
        </Button>
        {!showAll && (
          <Button onClick={() => setShowAll(true)} variant="outline" size="sm">
            その他...
          </Button>
        )}
      </div>

      {showAll && (
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              const link = document.createElement("a");
              link.href = icsUrl;
              link.download = `${eventTitle}.ics`;
              link.click();
            }}
            variant="outline"
            size="sm"
          >
            ICSダウンロード
          </Button>
          <p className="text-xs text-muted self-center">
            Outlook、Yahoo!カレンダー等で使用
          </p>
        </div>
      )}
    </div>
  );
}
