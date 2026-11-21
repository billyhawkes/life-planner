import { Schema } from "effect";

export const goalStatuses = {
  planned: "Not started",
  active: "In progress",
  achieved: "Achieved",
} as const;

const GoalStatus = Schema.Literals(["planned", "active", "achieved"]).annotate({
  identifier: "GoalStatus",
});

export const GoalPayload = Schema.Struct({
  title: Schema.String.check(Schema.isPattern(/\S/), Schema.isMaxLength(200)),
  notes: Schema.String.check(Schema.isMaxLength(2000)),
  status: GoalStatus,
}).annotate({ identifier: "GoalPayload" });

export const Goal = Schema.Struct({
  id: Schema.String,
  ...GoalPayload.fields,
}).annotate({ identifier: "Goal" });
export type Goal = typeof Goal.Type;

export const GoalId = Schema.Struct({ id: Schema.String }).annotate({
  identifier: "GoalId",
});
export const GoalFields = Schema.Record(Schema.String, Schema.String).annotate({
  identifier: "GoalFields",
});

export const decodeGoalForm = (values: Record<string, string>) =>
  Schema.decodeUnknownEffect(GoalPayload)({
    title: values.title?.trim(),
    notes: values.notes?.trim() ?? "",
    status: values.status ?? "planned",
  });

export class GoalDataError extends Schema.TaggedError<GoalDataError>()(
  "GoalDataError",
  { message: Schema.String, cause: Schema.Defect() },
) {}
