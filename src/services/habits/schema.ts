import { Schema } from "effect";

export const HABIT_ICON_KEYS = [
  "circle-check",
  "book-open",
  "droplet",
  "person-standing",
  "footprints",
  "activity",
  "dumbbell",
  "salad",
  "pill",
  "pencil",
  "sprout",
  "sun",
] as const;

export const HABIT_ICON_LABELS: Record<
  (typeof HABIT_ICON_KEYS)[number],
  string
> = {
  "circle-check": "Check",
  "book-open": "Reading",
  droplet: "Water",
  "person-standing": "Mindfulness",
  footprints: "Walking",
  activity: "Activity",
  dumbbell: "Strength",
  salad: "Nutrition",
  pill: "Medication",
  pencil: "Writing",
  sprout: "Growth",
  sun: "Sun",
};

export const HabitIcon = Schema.Literals(HABIT_ICON_KEYS).annotate({
  identifier: "HabitIcon",
});

export const HabitDate = Schema.String.check(
  Schema.makeFilter((value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000"))
      return false;
    const time = Date.parse(`${value}T00:00:00Z`);
    return (
      Number.isFinite(time) &&
      new Date(time).toISOString().slice(0, 10) === value
    );
  }),
).annotate({ identifier: "HabitDate" });

export const HabitPayload = Schema.Struct({
  name: Schema.String.check(Schema.isPattern(/\S/), Schema.isMaxLength(100)),
  icon: HabitIcon,
  startDate: HabitDate,
  notes: Schema.String.check(Schema.isMaxLength(2000)),
}).annotate({ identifier: "HabitPayload" });

export const Habit = Schema.Struct({
  id: Schema.String,
  ...HabitPayload.fields,
}).annotate({ identifier: "Habit" });

export const HabitOccurrence = Schema.Struct({
  habit: Habit,
  date: HabitDate,
  completed: Schema.Boolean,
}).annotate({ identifier: "HabitOccurrence" });

export const HabitIdParams = Schema.Struct({ id: Schema.String }).annotate({
  identifier: "HabitIdParams",
});
export const HabitCompletion = Schema.Struct({
  date: HabitDate,
  completed: Schema.Boolean,
}).annotate({ identifier: "HabitCompletion" });
export const HabitFields = Schema.Record(Schema.String, Schema.String).annotate(
  { identifier: "HabitFields" },
);

export const decodeHabitForm = (values: Record<string, string>) =>
  Schema.decodeUnknownEffect(HabitPayload)({
    name: values.name?.trim(),
    icon: values.icon ?? HABIT_ICON_KEYS[0],
    startDate: values.startDate,
    notes: values.notes?.trim() ?? "",
  });

export const decodeCompletionForm = (values: Record<string, string>) =>
  Schema.decodeUnknownEffect(HabitCompletion)({
    date: values.date,
    completed:
      values.completed === "true"
        ? true
        : values.completed === "false"
          ? false
          : undefined,
  });

export class HabitDataError extends Schema.TaggedError<HabitDataError>()(
  "HabitDataError",
  { message: Schema.String, cause: Schema.optional(Schema.Defect()) },
) {}

export type Habit = typeof Habit.Type;
export type HabitPayload = typeof HabitPayload.Type;
export type HabitOccurrence = typeof HabitOccurrence.Type;
