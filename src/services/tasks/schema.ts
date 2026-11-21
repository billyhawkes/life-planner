import { Schema } from "effect";
import { HabitDate } from "@/services/habits/schema";

export const TaskDate = HabitDate.annotate({ identifier: "TaskDate" });
export const TaskPayload = Schema.Struct({
  title: Schema.String.check(Schema.isPattern(/\S/), Schema.isMaxLength(200)),
  date: Schema.NullOr(TaskDate),
  notes: Schema.String.check(Schema.isMaxLength(2000)),
}).annotate({ identifier: "TaskPayload" });
export const Task = Schema.Struct({
  id: Schema.String,
  ...TaskPayload.fields,
  completed: Schema.Boolean,
}).annotate({ identifier: "Task" });
export const TaskIdParams = Schema.Struct({ id: Schema.String }).annotate({
  identifier: "TaskIdParams",
});
export const TaskCompletion = Schema.Struct({
  completed: Schema.Boolean,
}).annotate({ identifier: "TaskCompletion" });
export const TaskFields = Schema.Record(Schema.String, Schema.String).annotate({
  identifier: "TaskFields",
});
export const decodeTaskForm = (values: Record<string, string>) =>
  Schema.decodeUnknownEffect(TaskPayload)({
    title: values.title?.trim(),
    date: values.date || null,
    notes: values.notes?.trim() ?? "",
  });
export const decodeTaskCompletion = (values: Record<string, string>) =>
  Schema.decodeUnknownEffect(TaskCompletion)({
    completed:
      values.completed === "true"
        ? true
        : values.completed === "false"
          ? false
          : undefined,
  });
export class TaskDataError extends Schema.TaggedError<TaskDataError>()(
  "TaskDataError",
  { message: Schema.String, cause: Schema.optional(Schema.Defect()) },
) {}
export type Task = typeof Task.Type;
export type TaskPayload = typeof TaskPayload.Type;
