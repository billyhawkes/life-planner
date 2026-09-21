import { Schema } from "effect";

export const HeartRate = Schema.Struct({
  average: Schema.Number,
  minimum: Schema.Number,
  maximum: Schema.Number,
}).annotate({ identifier: "HeartRate" });

export const Workout = Schema.Struct({
  id: Schema.String,
  activityType: Schema.String,
  status: Schema.Union([
    Schema.Literal("planned"),
    Schema.Literal("completed"),
  ]),
  startDate: Schema.String,
  endDate: Schema.String,
  durationMinutes: Schema.Number,
  sourceName: Schema.String,
  indoor: Schema.Boolean,
  distanceKilometres: Schema.optional(Schema.Number),
  activeEnergyKilocalories: Schema.optional(Schema.Number),
  heartRate: Schema.optional(HeartRate),
  notes: Schema.optional(Schema.String),
}).annotate({ identifier: "Workout" });

export const WorkoutIndex = Schema.Array(Workout).annotate({
  identifier: "WorkoutIndex",
});

export const WorkoutListQuery = Schema.Struct({
  limit: Schema.optional(Schema.Number),
  activityType: Schema.optional(Schema.String),
  after: Schema.optional(Schema.String),
  before: Schema.optional(Schema.String),
}).annotate({ identifier: "WorkoutListQuery" });

export const WorkoutSummaryQuery = Schema.Struct({
  days: Schema.optional(Schema.Number),
}).annotate({ identifier: "WorkoutSummaryQuery" });

export const WorkoutSummary = Schema.Struct({
  days: Schema.Number,
  workoutCount: Schema.Number,
  totalDurationMinutes: Schema.Number,
  totalDistanceKilometres: Schema.Number,
  totalActiveEnergyKilocalories: Schema.Number,
  byActivityType: Schema.Record(Schema.String, Schema.Number),
}).annotate({ identifier: "WorkoutSummary" });

export const WorkoutPayload = Schema.Struct({
  activityType: Schema.String.check(Schema.isPattern(/\S/)),
  status: Schema.Union([
    Schema.Literal("planned"),
    Schema.Literal("completed"),
  ]),
  startDate: Schema.String.check(
    Schema.makeFilter((value) => Number.isFinite(Date.parse(value))),
  ),
  durationMinutes: Schema.Number.check(
    Schema.isFinite(),
    Schema.isGreaterThan(0),
  ),
  indoor: Schema.optional(Schema.Boolean),
  distanceKilometres: Schema.optional(
    Schema.Number.check(Schema.isFinite(), Schema.isGreaterThanOrEqualTo(0)),
  ),
  notes: Schema.optional(Schema.String),
}).annotate({ identifier: "WorkoutPayload" });

export const WorkoutIdParams = Schema.Struct({
  id: Schema.String,
}).annotate({ identifier: "WorkoutIdParams" });

export const UpdateWorkoutRequest = Schema.Struct({
  id: Schema.String,
  payload: WorkoutPayload,
}).annotate({ identifier: "UpdateWorkoutRequest" });

// Keep browser input as strings so semantic validation can render form feedback.
export const WorkoutFormFields = Schema.Record(
  Schema.String,
  Schema.String,
).annotate({
  identifier: "WorkoutFormFields",
});

export const WorkoutViewQuery = Schema.Record(
  Schema.String,
  Schema.String,
).annotate({
  identifier: "WorkoutViewQuery",
});

export const decodeWorkoutForm = (values: Record<string, string>) => {
  const minutes = Number(values.minutes);
  const seconds = Number(values.seconds);
  const start = new Date(values.startDate);
  const validDuration =
    Boolean(values.minutes?.trim() && values.seconds?.trim()) &&
    Number.isInteger(minutes) &&
    minutes >= 0 &&
    Number.isInteger(seconds) &&
    seconds >= 0 &&
    seconds <= 59;

  return Schema.decodeUnknownEffect(WorkoutPayload)({
    activityType: values.activityType?.trim(),
    status: values.status,
    startDate: Number.isFinite(start.getTime()) ? start.toISOString() : "",
    durationMinutes: validDuration ? minutes + seconds / 60 : NaN,
    indoor: values.indoor === "true",
    ...(values.distance?.trim()
      ? { distanceKilometres: Number(values.distance) }
      : {}),
    ...(values.notes?.trim() ? { notes: values.notes.trim() } : {}),
  });
};

export class WorkoutDataError extends Schema.TaggedErrorClass<WorkoutDataError>()(
  "WorkoutDataError",
  { message: Schema.String, cause: Schema.optional(Schema.Defect()) },
) {}

export type Workout = typeof Workout.Type;
export type WorkoutPayload = typeof WorkoutPayload.Type;
export type WorkoutSummary = typeof WorkoutSummary.Type;

export type WorkoutSearchInput = {
  readonly search?: string;
  readonly sort?: string;
  readonly page?: number;
  /** Null selects all matching rows for schedules. */
  readonly pageSize?: number | null;
  readonly after?: string;
  /** Exclusive upper bound. */
  readonly before?: string;
  readonly week?: boolean;
};

export type WorkoutPage = {
  readonly workouts: ReadonlyArray<Workout>;
  readonly total: number;
  readonly page: number;
  readonly pages: number;
};

export type WorkoutDay = {
  readonly date: Date;
  readonly workouts: ReadonlyArray<Workout>;
};

export type WorkoutSchedule = {
  readonly days: ReadonlyArray<WorkoutDay>;
  readonly total: number;
};

export type WorkoutOverview = {
  readonly completedCount: number;
  readonly distanceKilometres: number;
  readonly currentPace: number | undefined;
  readonly trends: ReadonlyArray<Workout>;
};
