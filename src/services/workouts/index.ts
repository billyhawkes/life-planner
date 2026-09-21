import { Context, Effect, Layer, Option, Schema } from "effect";
import { SqlClient, SqlSchema } from "effect/unstable/sql";

import { DatabaseLive, DatabaseTest } from "@/db";
import {
  Workout,
  WorkoutDataError,
  WorkoutIdParams,
  WorkoutPayload,
  UpdateWorkoutRequest,
  type WorkoutSearchInput,
} from "./schema";

type ListInput = {
  readonly limit?: number;
  readonly activityType?: string;
  readonly after?: string;
  readonly before?: string;
};

const databaseError = (message: string) => (cause: unknown) =>
  new WorkoutDataError({ message, cause });
const decodeWorkouts = Schema.decodeUnknownEffect(Schema.Array(Workout));

const weekRange = (date = new Date()) => {
  const start = new Date(date);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
};

const findMatchingPlan = (
  workout: Workout,
  plans: ReadonlyArray<Workout>,
  used: ReadonlySet<string>,
) => {
  const activity = workout.activityType.trim().toLowerCase();
  const start = Date.parse(workout.startDate);
  const matchWindow = 12 * 60 * 60 * 1000;
  let closest: Workout | undefined;
  let closestDifference = matchWindow + 1;
  for (const plan of plans) {
    if (
      used.has(plan.id) ||
      plan.activityType.trim().toLowerCase() !== activity
    )
      continue;
    const difference = Math.abs(Date.parse(plan.startDate) - start);
    if (difference <= matchWindow && difference < closestDifference) {
      closest = plan;
      closestDifference = difference;
    }
  }
  return closest;
};

export class Workouts extends Context.Service<Workouts>()("Workouts", {
  make: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    // JSON construction omits nullable optional fields and keeps the public schema unchanged.
    const columns = sql`jsonb_strip_nulls(jsonb_build_object(
    'id', id, 'activityType', activity_type, 'status', status,
    'startDate', start_date, 'endDate', end_date, 'durationMinutes', duration_minutes,
    'sourceName', source_name, 'indoor', indoor, 'distanceKilometres', distance_kilometres,
    'activeEnergyKilocalories', active_energy_kilocalories, 'notes', notes,
    'heartRate', CASE WHEN heart_rate_average IS NOT NULL AND heart_rate_minimum IS NOT NULL
      AND heart_rate_maximum IS NOT NULL THEN jsonb_build_object(
        'average', heart_rate_average, 'minimum', heart_rate_minimum, 'maximum', heart_rate_maximum)
      ELSE NULL END
  )) AS workout`;
    const decodeRows = (rows: ReadonlyArray<{ readonly workout: unknown }>) =>
      decodeWorkouts(rows.map((row) => row.workout));

    const workoutRow = Schema.Struct({ workout: Workout }).annotate({
      identifier: "WorkoutRow",
    });
    const findOne = SqlSchema.findOneOption({
      Request: WorkoutIdParams,
      Result: workoutRow,
      execute: ({ id }) =>
        sql`SELECT ${columns} FROM workouts WHERE id = ${id}`,
    });
    const get = Effect.fn("Workouts.get")(
      (input: typeof WorkoutIdParams.Type) =>
        findOne(input).pipe(
          Effect.map(Option.map((row) => row.workout)),
          Effect.map(Option.getOrUndefined),
          Effect.mapError(databaseError("Could not load workout")),
        ),
    );

    const sortColumns = new Map([
      ["startDate", sql`start_date`],
      ["status", sql`status`],
      ["activityType", sql`activity_type`],
      ["durationMinutes", sql`duration_minutes`],
      ["distanceKilometres", sql`coalesce(distance_kilometres, 0)`],
      ["heartRate", sql`coalesce(heart_rate_average, 0)`],
      ["notes", sql`coalesce(notes, '')`],
    ]);
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const search = Effect.fn("Workouts.search")(
      function* (input: WorkoutSearchInput) {
        const filters = [sql`TRUE`];
        if (input.week) {
          const { start, end } = weekRange();
          filters.push(
            sql`start_date >= ${start.toISOString()}::timestamptz AND start_date < ${end.toISOString()}::timestamptz`,
          );
        }
        if (input.after)
          filters.push(sql`start_date >= ${input.after}::timestamptz`);
        if (input.before)
          filters.push(sql`start_date < ${input.before}::timestamptz`);
        if (input.search)
          filters.push(sql`strpos(lower(concat_ws(' ', activity_type, status, notes,
      to_char(start_date AT TIME ZONE ${timeZone}, 'Mon FMDD, YYYY'), start_date::text)), ${input.search.toLowerCase()}) > 0`);
        const where = sql.and(filters);
        const [count] = yield* sql<{
          total: number;
        }>`SELECT count(*)::integer AS total FROM workouts WHERE ${where}`;
        const total = count!.total;
        const pageSize =
          input.pageSize === null
            ? null
            : Math.max(1, Math.min(500, Math.floor(input.pageSize ?? 25)));
        const pages =
          pageSize === null ? 1 : Math.max(1, Math.ceil(total / pageSize));
        const page = Math.min(pages, Math.max(1, Math.floor(input.page ?? 1)));
        const sort = input.sort ?? "-startDate";
        const column =
          sortColumns.get(sort.replace(/^-/, "")) ?? sql`start_date`;
        const direction = sort.startsWith("-") ? sql`DESC` : sql`ASC`;
        const pagination =
          pageSize === null
            ? sql``
            : sql`LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;
        const workouts = yield* sql<{
          workout: unknown;
        }>`SELECT ${columns} FROM workouts
      WHERE ${where} ORDER BY ${column} ${direction}, start_date DESC, id ASC ${pagination}`.pipe(
          Effect.flatMap(decodeRows),
        );
        return { workouts, total, page, pages };
      },
      Effect.mapError(databaseError("Could not search workouts")),
    );

    const schedule = Effect.fn("Workouts.schedule")(function* (input: {
      readonly month?: string;
      readonly search?: string;
      readonly sort?: string;
    }) {
      const start = input.month
        ? new Date(`${input.month}-01T00:00`)
        : weekRange().start;
      if (!Number.isFinite(start.getTime()))
        return yield* new WorkoutDataError({
          message: "Invalid schedule month",
        });
      if (input.month) start.setDate(1 - ((start.getDay() + 6) % 7));
      const length = input.month ? 42 : 7;
      const end = new Date(start);
      end.setDate(end.getDate() + length);
      const result = yield* search({
        search: input.search,
        sort: input.sort,
        after: start.toISOString(),
        before: end.toISOString(),
        pageSize: null,
      });
      const days = Array.from({ length }, (_, index) => {
        const date = new Date(start);
        date.setDate(date.getDate() + index);
        const next = new Date(date);
        next.setDate(next.getDate() + 1);
        return {
          date,
          workouts: result.workouts.filter((workout) => {
            const time = Date.parse(workout.startDate);
            return time >= date.getTime() && time < next.getTime();
          }),
        };
      });
      return { days, total: result.total };
    });

    const overview = Effect.fn("Workouts.overview")(
      function* ({ activityType }: { readonly activityType: string }) {
        const now = new Date();
        const { start, end } = weekRange(now);
        const [totals] = yield* sql<{
          completedCount: number;
          distanceKilometres: number;
        }>`SELECT count(*)::integer AS "completedCount",
      coalesce(sum(distance_kilometres) FILTER (WHERE activity_type IN ('Running', 'Cycling')), 0)::double precision AS "distanceKilometres"
      FROM workouts WHERE status = 'completed' AND start_date >= ${start.toISOString()}::timestamptz AND start_date < ${end.toISOString()}::timestamptz`;
        const [latest] = yield* sql<{
          pace: number;
        }>`SELECT duration_minutes / distance_kilometres AS pace FROM workouts
      WHERE status = 'completed' AND activity_type = 'Running' AND distance_kilometres > 0 AND start_date <= ${now.toISOString()}::timestamptz
      ORDER BY start_date DESC, id ASC LIMIT 1`;
        const recent = yield* sql<{
          workout: unknown;
        }>`SELECT ${columns} FROM workouts
      WHERE status = 'completed' AND activity_type = ${activityType} AND distance_kilometres > 0
      ORDER BY start_date DESC, id ASC LIMIT 20`.pipe(
          Effect.flatMap(decodeRows),
        );
        return {
          completedCount: totals!.completedCount,
          distanceKilometres: totals!.distanceKilometres,
          currentPace: latest?.pace,
          trends: [...recent].reverse(),
        };
      },
      Effect.mapError(databaseError("Could not load training overview")),
    );

    const list = Effect.fn("Workouts.list")((input: ListInput) => {
      const filters = [sql`TRUE`];
      if (input.activityType)
        filters.push(sql`activity_type ILIKE ${input.activityType}`);
      if (input.after)
        filters.push(sql`start_date >= ${input.after}::timestamptz`);
      if (input.before)
        filters.push(sql`start_date <= ${input.before}::timestamptz`);
      return sql<{ workout: unknown }>`SELECT ${columns} FROM workouts
      WHERE ${sql.and(filters)} ORDER BY start_date DESC
      LIMIT ${Math.min(Math.max(input.limit ?? 20, 1), 500)}`.pipe(
        Effect.flatMap(decodeRows),
        Effect.mapError(databaseError("Could not load workouts")),
      );
    });

    const summary = Effect.fn("Workouts.summary")(
      function* (input: { readonly days?: number }) {
        const days = Math.min(Math.max(input.days ?? 28, 1), 3650);
        const rows = yield* sql<{
          workout: unknown;
        }>`SELECT ${columns} FROM workouts
      WHERE status = 'completed' AND start_date >= ${new Date(Date.now() - days * 86400000).toISOString()}::timestamptz`.pipe(
          Effect.flatMap(decodeRows),
        );
        const byActivityType: Record<string, number> = {};
        for (const row of rows)
          byActivityType[row.activityType] =
            (byActivityType[row.activityType] ?? 0) + 1;
        return {
          days,
          workoutCount: rows.length,
          totalDurationMinutes: rows.reduce(
            (sum, row) => sum + row.durationMinutes,
            0,
          ),
          totalDistanceKilometres: rows.reduce(
            (sum, row) => sum + (row.distanceKilometres ?? 0),
            0,
          ),
          totalActiveEnergyKilocalories: rows.reduce(
            (sum, row) => sum + (row.activeEnergyKilocalories ?? 0),
            0,
          ),
          byActivityType,
        };
      },
      Effect.mapError(databaseError("Could not summarize workouts")),
    );

    const values = (payload: WorkoutPayload) => ({
      activity_type: payload.activityType.trim(),
      status: payload.status,
      start_date: payload.startDate,
      end_date: new Date(
        Date.parse(payload.startDate) + payload.durationMinutes * 60000,
      ).toISOString(),
      duration_minutes: payload.durationMinutes,
      source_name: "Manual",
      indoor: payload.indoor ?? false,
      distance_kilometres: payload.distanceKilometres ?? null,
      notes: payload.notes?.trim() || null,
      imported: false,
      updated_at: new Date().toISOString(),
    });

    const insert = SqlSchema.findOne({
      Request: WorkoutPayload,
      Result: workoutRow,
      execute: (payload) =>
        sql`INSERT INTO workouts ${sql.insert({ id: crypto.randomUUID(), ...values(payload) })} RETURNING ${columns}`,
    });
    const create = Effect.fn("Workouts.create")((payload: WorkoutPayload) =>
      insert(payload).pipe(
        Effect.map((row) => row.workout),
        Effect.mapError(databaseError("Could not create workout")),
      ),
    );

    const updateRow = SqlSchema.findOneOption({
      Request: UpdateWorkoutRequest,
      Result: workoutRow,
      execute: ({ id, payload }) =>
        sql`UPDATE workouts SET ${sql.update(values(payload))} WHERE id = ${id} RETURNING ${columns}`,
    });
    const update = Effect.fn("Workouts.update")(
      ({
        id,
        payload,
      }: {
        readonly id: string;
        readonly payload: WorkoutPayload;
      }) =>
        updateRow({ id, payload }).pipe(
          Effect.map(Option.map((row) => row.workout)),
          Effect.map(Option.getOrUndefined),
          Effect.mapError(databaseError("Could not update workout")),
        ),
    );

    const importWorkouts = Effect.fn("Workouts.import")(
      (items: ReadonlyArray<Workout>) =>
        sql
          .withTransaction(
            Effect.gen(function* () {
              if (!items.length) return 0;
              // Serialize imports so concurrent re-imports cannot consume the same planned session.
              yield* sql`LOCK TABLE workouts IN SHARE ROW EXCLUSIVE MODE`;
              const existing = yield* sql<{
                id: string;
              }>`SELECT id FROM workouts WHERE imported = TRUE`;
              const existingIds = new Set(existing.map((row) => row.id));
              const planned = yield* sql<{
                workout: unknown;
              }>`SELECT ${columns} FROM workouts WHERE status = 'planned'`.pipe(
                Effect.flatMap(decodeRows),
              );
              const used = new Set<string>();
              for (const workout of items) {
                const plan = existingIds.has(workout.id)
                  ? undefined
                  : findMatchingPlan(workout, planned, used);
                if (plan) {
                  used.add(plan.id);
                  yield* sql`DELETE FROM workouts WHERE id = ${plan.id}`;
                }
                yield* sql`INSERT INTO workouts ${sql.insert({
                  id: workout.id,
                  activity_type: workout.activityType,
                  status: "completed",
                  start_date: workout.startDate,
                  end_date: workout.endDate,
                  duration_minutes: workout.durationMinutes,
                  source_name: workout.sourceName,
                  indoor: workout.indoor,
                  distance_kilometres: workout.distanceKilometres ?? null,
                  active_energy_kilocalories:
                    workout.activeEnergyKilocalories ?? null,
                  heart_rate_average: workout.heartRate?.average ?? null,
                  heart_rate_minimum: workout.heartRate?.minimum ?? null,
                  heart_rate_maximum: workout.heartRate?.maximum ?? null,
                  notes: workout.notes ?? plan?.notes ?? null,
                  imported: true,
                })} ON CONFLICT (id) DO UPDATE SET
          activity_type = excluded.activity_type, status = 'completed',
          start_date = excluded.start_date, end_date = excluded.end_date,
          duration_minutes = excluded.duration_minutes, source_name = excluded.source_name,
          indoor = excluded.indoor, imported = TRUE, updated_at = NOW(),
          distance_kilometres = coalesce(excluded.distance_kilometres, workouts.distance_kilometres),
          active_energy_kilocalories = coalesce(excluded.active_energy_kilocalories, workouts.active_energy_kilocalories),
          heart_rate_average = coalesce(excluded.heart_rate_average, workouts.heart_rate_average),
          heart_rate_minimum = coalesce(excluded.heart_rate_minimum, workouts.heart_rate_minimum),
          heart_rate_maximum = coalesce(excluded.heart_rate_maximum, workouts.heart_rate_maximum)`;
                existingIds.add(workout.id);
              }
              return items.length;
            }),
          )
          .pipe(Effect.mapError(databaseError("Could not import workouts"))),
    );

    const removeQuery = SqlSchema.findAll({
      Request: WorkoutIdParams,
      Result: WorkoutIdParams,
      execute: ({ id }) =>
        sql`DELETE FROM workouts WHERE id = ${id} RETURNING id`,
    });
    const remove = Effect.fn("Workouts.remove")(
      (input: { readonly id: string }) =>
        removeQuery(input).pipe(
          Effect.map((rows) => rows.length > 0),
          Effect.mapError(databaseError("Could not delete workout")),
        ),
    );

    return {
      get,
      search,
      schedule,
      overview,
      list,
      summary,
      create,
      update,
      remove,
      import: importWorkouts,
    };
  }),
}) {
  static readonly baseLayer = Layer.effect(this, this.make);
  static readonly layer = this.baseLayer.pipe(Layer.provide(DatabaseLive));
  static readonly testLayer = this.baseLayer.pipe(Layer.provide(DatabaseTest));
}
