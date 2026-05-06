import { NextRequest, NextResponse } from "next/server";
import ICAL from "ical.js";
import { z } from "zod";

const parseRequestSchema = z.object({
  icsUrl: z.string().url("有効なURLを入力してください"),
  candidates: z.array(
    z.object({
      id: z.string(),
      date: z.string(),
      start_time: z.string().nullable(),
      end_time: z.string().nullable(),
    }),
  ),
});

interface CalendarEvent {
  summary: string;
  start: Date;
  end: Date;
}

interface ConflictResult {
  candidateId: string;
  hasConflict: boolean;
  conflictingEvents: string[];
}

function parseIcsContent(icsContent: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  try {
    const jcalData = ICAL.parse(icsContent);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents("vevent");

    for (const vevent of vevents) {
      const event = new ICAL.Event(vevent);
      events.push({
        summary: event.summary || "予定",
        start: event.startDate.toJSDate(),
        end: event.endDate.toJSDate(),
      });
    }
  } catch (error) {
    console.error("ICS parse error:", error);
  }

  return events;
}

function checkConflict(
  candidateDate: string,
  candidateStartTime: string | null,
  candidateEndTime: string | null,
  events: CalendarEvent[],
): { hasConflict: boolean; conflictingEvents: string[] } {
  const conflictingEvents: string[] = [];

  // 候補日のDateオブジェクトを作成
  const candidateDateObj = new Date(candidateDate);

  for (const event of events) {
    const eventStart = event.start;
    const eventEnd = event.end;

    // 同じ日かチェック
    const eventDate = new Date(eventStart);
    eventDate.setHours(0, 0, 0, 0);
    const candDate = new Date(candidateDateObj);
    candDate.setHours(0, 0, 0, 0);

    if (eventDate.getTime() !== candDate.getTime()) {
      continue; // 別の日なのでスキップ
    }

    // 時間指定がない場合（終日）は、その日に予定があれば衝突
    if (!candidateStartTime) {
      conflictingEvents.push(event.summary);
      continue;
    }

    // 時間が指定されている場合、時間帯の重複をチェック
    const [startHour, startMin] = candidateStartTime.split(":").map(Number);
    const candStart = new Date(candidateDateObj);
    candStart.setHours(startHour, startMin, 0, 0);

    let candEnd: Date;
    if (candidateEndTime) {
      const [endHour, endMin] = candidateEndTime.split(":").map(Number);
      candEnd = new Date(candidateDateObj);
      candEnd.setHours(endHour, endMin, 0, 0);
    } else {
      // 終了時間がない場合は1時間と仮定
      candEnd = new Date(candStart);
      candEnd.setHours(candEnd.getHours() + 1);
    }

    // 時間帯の重複判定
    // 重複条件: candStart < eventEnd && candEnd > eventStart
    if (candStart < eventEnd && candEnd > eventStart) {
      conflictingEvents.push(event.summary);
    }
  }

  return {
    hasConflict: conflictingEvents.length > 0,
    conflictingEvents,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = parseRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { icsUrl, candidates } = parsed.data;

    // ICSファイルを取得
    const response = await fetch(icsUrl, {
      headers: {
        Accept: "text/calendar",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "カレンダーの取得に失敗しました。URLを確認してください。" },
        { status: 400 },
      );
    }

    const icsContent = await response.text();

    // ICS内容をパース
    const events = parseIcsContent(icsContent);

    if (events.length === 0) {
      return NextResponse.json({
        conflicts: [],
        message: "カレンダーに予定が見つかりませんでした",
      });
    }

    // 各候補日との衝突をチェック
    const conflicts: ConflictResult[] = candidates.map((candidate) => {
      const { hasConflict, conflictingEvents } = checkConflict(
        candidate.date,
        candidate.start_time,
        candidate.end_time,
        events,
      );

      return {
        candidateId: candidate.id,
        hasConflict,
        conflictingEvents,
      };
    });

    return NextResponse.json({
      conflicts,
      eventCount: events.length,
    });
  } catch (error) {
    console.error("Calendar parse error:", error);
    return NextResponse.json(
      { error: "カレンダーの解析中にエラーが発生しました" },
      { status: 500 },
    );
  }
}
