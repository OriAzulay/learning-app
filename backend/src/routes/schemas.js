import { z } from "zod";
import { isValidDateKey, daysBetween } from "../services/dates.js";

// Shared zod schemas for request input.

export const dateKey = z.string().refine(isValidDateKey, "Expected a date like 2026-10-17");

export const roleParams = z.object({
  role: z.string().regex(/^[a-z0-9_-]{1,32}$/, "Invalid role id"),
});

export const dayParams = roleParams.extend({ date: dateKey });

export const itemParams = dayParams.extend({
  pos: z.coerce.number().int().min(0).max(10_000),
});

export const weekQuery = z.object({ from: dateKey, to: dateKey }).refine(({ from, to }) => {
  const span = daysBetween(from, to);
  return span >= 0 && span <= 42;
}, "`to` must be on or after `from`, at most 6 weeks apart");

const MAX_ANSWER = 5000;

export const itemBody = z
  .object({
    answer: z.string().max(MAX_ANSWER).optional(),
    editFlags: z
      .string()
      .max(MAX_ANSWER)
      .regex(/^[01]*$/, "editFlags is a string of 0 and 1")
      .nullable()
      .optional(),
    view: z.enum(["ans", "sol"]).optional(),
  })
  .strict()
  .refine((b) => b.answer !== undefined || b.view !== undefined, "Nothing to update")
  .refine(
    (b) =>
      b.editFlags == null || (b.answer !== undefined && b.editFlags.length === b.answer.length),
    "editFlags needs an answer of the same length",
  );

export const settingsBody = z
  .object({
    userName: z.string().trim().min(1).max(40).optional(),
    role: z
      .string()
      .regex(/^[a-z0-9_-]{1,32}$/)
      .optional(),
  })
  .strict()
  .refine((b) => Object.keys(b).length > 0, "Nothing to update");

// The backup file format (same as the old localStorage format).
const check = z.discriminatedUnion("type", [
  z.object({ type: z.literal("kw"), keys: z.string().max(5000) }),
  z.object({ type: z.literal("first"), val: z.string().max(200) }),
  z.object({ type: z.literal("num"), val: z.number() }),
  z.object({ type: z.literal("bigo"), val: z.string().max(50) }),
]);

const backupItem = z.object({
  id: z.string().min(1).max(200),
  topic: z.string().min(1).max(100),
  level: z.number().int().min(1).max(5),
  q: z.string().max(20_000),
  a: z.string().max(20_000),
  check,
});

const backupDay = z.object({
  items: z.array(backupItem).max(2000),
  answers: z.array(z.string().max(MAX_ANSWER)).optional(),
  results: z.array(z.boolean()).optional(),
  done: z.array(z.boolean()).optional(),
  view: z.array(z.enum(["ans", "sol"])).optional(),
  ansEdit: z.record(z.string(), z.string().regex(/^[01]*$/)).optional(),
  submitted: z.boolean().optional(),
});

export const backupBody = z.object({
  version: z.literal(1).optional(),
  role: z.string().max(32).optional(),
  userName: z.string().trim().min(1).max(40).optional(),
  days: z.record(z.string().max(32), z.record(dateKey, backupDay)),
  seen: z
    .record(
      z.string().max(32),
      z.record(z.string().max(200), z.object({ d: dateKey, ok: z.boolean().optional() })),
    )
    .optional(),
});
