import { dateKey } from "@/services/workouts/helpers";
import { HabitDate } from "@/services/habits/schema";
import { Schema } from "effect";
import type { TimeBlock } from "./schema";

export const selectedDay = (value?: string) =>
  Schema.is(HabitDate)(value) ? value : dateKey(new Date());
export const dayRange = (day: string) => {
  const start = new Date(`${day}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.getTime(), end: end.getTime() };
};
export const blockMinutes = (
  block: TimeBlock,
  day: string,
  now = Date.now(),
) => {
  const range = dayRange(day);
  return (
    Math.max(
      0,
      Math.min(
        Date.parse(block.endTime ?? new Date(now).toISOString()),
        range.end,
      ) - Math.max(Date.parse(block.startTime), range.start),
    ) / 60000
  );
};
export const duration = (minutes: number) => {
  const total = Math.floor(minutes);
  return `${Math.floor(total / 60)}h ${total % 60}m`;
};
export const adjacentDay = (day: string, offset: number) => {
  const date = new Date(`${day}T12:00:00`);
  date.setDate(date.getDate() + offset);
  return dateKey(date);
};
export const blockDateTime = (value: string) => {
  const date = new Date(value);
  return `${dateKey(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}.${String(date.getMilliseconds()).padStart(3, "0")}`;
};
export const weekDays = (day: string) => {
  const date = new Date(`${day}T12:00:00`);
  const monday = adjacentDay(day, -((date.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => adjacentDay(monday, index));
};
export const weeklyMinutes = (
  blocks: readonly TimeBlock[],
  day: string,
  now = Date.now(),
) =>
  weekDays(day).reduce(
    (sum, date) =>
      sum +
      blocks.reduce(
        (total, block) => total + blockMinutes(block, date, now),
        0,
      ),
    0,
  );
export type TimelineWindow = {
  readonly startHour: number;
  readonly endHour: number;
};
export const timelineWindow = (
  blocks: readonly TimeBlock[],
  days: readonly string[],
  now = Date.now(),
): TimelineWindow => {
  let startHour = 6;
  let endHour = 22;
  for (const day of days) {
    const range = dayRange(day);
    for (const block of blocks) {
      if (blockMinutes(block, day, now) <= 0) continue;
      const start = Math.max(Date.parse(block.startTime), range.start);
      const end = Math.min(
        Date.parse(block.endTime ?? new Date(now).toISOString()),
        range.end,
      );
      const first = new Date(start);
      const last = new Date(end);
      startHour = Math.min(startHour, first.getHours());
      endHour = Math.max(
        endHour,
        end === range.end ? 24 : Math.min(24, last.getHours() + 1),
      );
    }
  }
  return { startHour, endHour };
};
