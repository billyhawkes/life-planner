import { Schema } from "effect";
import { HabitDate } from "@/services/habits/schema";

export const LabelPayload = Schema.Struct({
  name: Schema.String.check(Schema.isPattern(/\S/), Schema.isMaxLength(100)),
  goalMinutes: Schema.Number.check(
    Schema.isInt(),
    Schema.isBetween({ minimum: 0, maximum: 1440 }),
  ),
  weeklyGoalMinutes: Schema.Number.check(
    Schema.isInt(),
    Schema.isBetween({ minimum: 0, maximum: 10080 }),
  ),
  color: Schema.String.check(Schema.isPattern(/^#[0-9a-fA-F]{6}$/)),
}).annotate({ identifier: "TimeLabelPayload" });
export const TimeLabel = Schema.Struct({
  id: Schema.String,
  ...LabelPayload.fields,
}).annotate({ identifier: "TimeLabel" });
const timestamp = Schema.String.check(
  Schema.makeFilter(
    (value) =>
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?$/.test(
        value,
      ) &&
      Schema.is(HabitDate)(value.slice(0, 10)) &&
      Number.isFinite(Date.parse(value)),
  ),
).annotate({ identifier: "TimeTimestamp" });
export const BlockPayload = Schema.Struct({
  labelId: Schema.String.check(Schema.isMinLength(1)),
  startTime: timestamp,
  endTime: Schema.NullOr(timestamp),
  notes: Schema.String.check(Schema.isMaxLength(2000)),
})
  .check(
    Schema.makeFilter(
      (value) =>
        value.endTime === null ||
        Date.parse(value.endTime) > Date.parse(value.startTime),
    ),
  )
  .annotate({ identifier: "TimeBlockPayload" });
export const TimeBlock = Schema.Struct({
  id: Schema.String,
  ...BlockPayload.fields,
}).annotate({ identifier: "TimeBlock" });
export const TimeFields = Schema.Record(Schema.String, Schema.String).annotate({
  identifier: "TimeFields",
});
export const TimeId = Schema.Struct({ id: Schema.String }).annotate({
  identifier: "TimeId",
});
export class TimelineError extends Schema.TaggedError<TimelineError>()(
  "TimelineError",
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Defect()),
  },
) {}
export const decodeLabelForm = (values: Record<string, string>) =>
  Schema.decodeUnknownEffect(LabelPayload)({
    name: values.name?.trim(),
    goalMinutes: Number(values.goalMinutes),
    weeklyGoalMinutes: Number(values.weeklyGoalMinutes ?? "0"),
    color: values.color,
  });
export const decodeBlockForm = (values: Record<string, string>) =>
  Schema.decodeUnknownEffect(BlockPayload)({
    labelId: values.labelId,
    startTime: values.startTime,
    endTime: values.endTime || null,
    notes: values.notes?.trim() ?? "",
  });
export type TimeLabel = typeof TimeLabel.Type;
export type TimeBlock = typeof TimeBlock.Type;
export type LabelPayload = typeof LabelPayload.Type;
export type BlockPayload = typeof BlockPayload.Type;
