import { z } from "zod";

export const candidateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付形式が不正です"),
  start_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "時刻形式が不正です")
    .optional(),
  end_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "時刻形式が不正です")
    .optional(),
});

export const eventModeSchema = z.enum(["regular", "meeting", "event"]);

export const createEventSchema = z.object({
  title: z
    .string()
    .min(1, "タイトルを入力してください")
    .max(100, "タイトルは100文字以内で入力してください"),
  description: z
    .string()
    .max(1000, "説明は1000文字以内で入力してください")
    .optional(),
  mode: eventModeSchema.default("event"),
  duration_minutes: z
    .number()
    .int()
    .min(15, "所要時間は15分以上で設定してください")
    .max(480, "所要時間は8時間以内で設定してください")
    .optional(),
  response_deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "日付形式が不正です")
    .optional(),
  candidates: z
    .array(candidateSchema)
    .min(1, "候補日を1つ以上設定してください"),
});

export const createVoteSchema = z.object({
  participant_name: z
    .string()
    .min(1, "名前を入力してください")
    .max(50, "名前は50文字以内で入力してください"),
  participant_token: z.string().optional(),
  votes: z.array(
    z.object({
      candidate_id: z.string(),
      availability: z.enum(["available", "maybe", "unavailable"]),
      preference: z.number().int().min(1).max(3).nullable().optional(),
    }),
  ),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type CreateVoteInput = z.infer<typeof createVoteSchema>;
