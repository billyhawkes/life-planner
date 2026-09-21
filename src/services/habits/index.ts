import { Context, Effect, Layer, Schema } from "effect";
import { SqlClient, SqlSchema } from "effect/unstable/sql";
import { DatabaseLive, DatabaseTest } from "@/db";
import {
  Habit,
  HabitCompletion,
  HabitDataError,
  HabitDate,
  HabitOccurrence,
  HabitPayload,
  HabitIdParams,
} from "./schema";

const databaseError = (message: string) => (cause: unknown) =>
  new HabitDataError({ message, cause });

export class Habits extends Context.Service<Habits>()("Habits", {
  make: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const createQuery = SqlSchema.findOne({
      Request: Schema.Struct({ payload: HabitPayload }).annotate({
        identifier: "CreateHabitRequest",
      }),
      Result: Habit,
      execute: ({ payload }) => sql`
        INSERT INTO habits (id, name, start_date, notes)
        VALUES (${crypto.randomUUID()}, ${payload.name}, ${payload.startDate}::date, ${payload.notes})
        RETURNING id, name, start_date::text AS "startDate", notes`,
    });
    const create = Effect.fn("Habits.create")(
      (input: { readonly payload: HabitPayload }) =>
        createQuery(input).pipe(
          Effect.mapError(databaseError("Could not create habit")),
        ),
    );

    const listQuery = SqlSchema.findAll({
      Request: Schema.Struct({}).annotate({ identifier: "ListHabitsRequest" }),
      Result: Habit,
      execute: () =>
        sql`SELECT id, name, start_date::text AS "startDate", notes FROM habits ORDER BY created_at, id`,
    });
    const list = Effect.fn("Habits.list")((input: {}) =>
      listQuery(input).pipe(
        Effect.mapError(databaseError("Could not load habits")),
      ),
    );

    const scheduleQuery = SqlSchema.findAll({
      Request: Schema.Struct({ after: HabitDate, before: HabitDate }).annotate({
        identifier: "HabitScheduleRequest",
      }),
      Result: HabitOccurrence,
      execute: ({ after, before }) => sql`
        SELECT jsonb_build_object('id', h.id, 'name', h.name, 'startDate', h.start_date::text, 'notes', h.notes) AS habit,
          d.day::date::text AS date, coalesce(c.completed, false) AS completed
        FROM generate_series(${after}::date, ${before}::date - 1, interval '1 day') AS d(day)
        JOIN habits h ON h.start_date <= d.day::date
        LEFT JOIN habit_completions c ON c.habit_id = h.id AND c.date = d.day::date
        ORDER BY d.day, h.created_at, h.id`,
    });
    const schedule = Effect.fn("Habits.schedule")(
      (input: { readonly after: string; readonly before: string }) =>
        scheduleQuery(input).pipe(
          Effect.mapError(databaseError("Could not load habit schedule")),
        ),
    );

    const completionQuery = SqlSchema.findAll({
      Request: Schema.Struct({
        id: Schema.String,
        payload: HabitCompletion,
      }).annotate({ identifier: "SetHabitCompletionRequest" }),
      Result: HabitCompletion,
      execute: ({ id, payload }) => sql`
        INSERT INTO habit_completions (habit_id, date, completed)
        SELECT id, ${payload.date}::date, ${payload.completed} FROM habits
        WHERE id = ${id} AND start_date <= ${payload.date}::date
        ON CONFLICT (habit_id, date) DO UPDATE SET completed = EXCLUDED.completed
        RETURNING date::text, completed`,
    });
    const setCompletion = Effect.fn("Habits.setCompletion")(
      (input: {
        readonly id: string;
        readonly payload: typeof HabitCompletion.Type;
      }) =>
        completionQuery(input).pipe(
          Effect.map((rows) => rows[0]),
          Effect.mapError(databaseError("Could not update habit completion")),
        ),
    );
    const removeQuery = SqlSchema.findAll({
      Request: HabitIdParams,
      Result: HabitIdParams,
      execute: ({ id }) =>
        sql`DELETE FROM habits WHERE id = ${id} RETURNING id`,
    });
    const remove = Effect.fn("Habits.remove")(
      (input: { readonly id: string }) =>
        removeQuery(input).pipe(
          Effect.map((rows) => rows.length > 0),
          Effect.mapError(databaseError("Could not delete habit")),
        ),
    );
    return { create, list, schedule, setCompletion, remove };
  }),
}) {
  static readonly baseLayer = Layer.effect(this, this.make);
  static readonly layer = this.baseLayer.pipe(Layer.provide(DatabaseLive));
  static readonly testLayer = this.baseLayer.pipe(Layer.provide(DatabaseTest));
}
