import { describe, expect, it } from "bun:test";
import { Effect, Layer } from "effect";
import { SqlClient } from "effect/unstable/sql";
import { DatabaseTest } from "@/db";
import { migrate } from "@/db/migrations";
import { Workouts } from "./index";

const TestLive = Workouts.baseLayer.pipe(Layer.provideMerge(DatabaseTest));

describe.skipIf(!process.env.TEST_DATABASE_URL)(
  "workouts PostgreSQL integration",
  () => {
    it(
      "adopts a legacy text-date table without deleting existing workouts",
      () =>
        Effect.runPromise(
          Effect.gen(function* () {
            const sql = yield* SqlClient.SqlClient;
            const schema = `migration_test_${crypto.randomUUID().replaceAll("-", "")}`;
            yield* sql`CREATE SCHEMA ${sql(schema)}`;
            yield* Effect.addFinalizer(() =>
              sql`DROP SCHEMA ${sql(schema)} CASCADE`.pipe(Effect.orDie),
            );
            yield* sql.withTransaction(
              Effect.gen(function* () {
                yield* sql`SET LOCAL search_path TO ${sql(schema)}`;
                // The fixture's outer transaction isolates search_path. Avoid the
                // migrator's missing-table probe aborting that enclosing transaction.
                yield* sql`CREATE TABLE effect_sql_migrations (
            migration_id INTEGER PRIMARY KEY, name TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )`;
                yield* sql`CREATE TABLE workouts (LIKE public.workouts INCLUDING ALL)`;
                yield* sql`ALTER TABLE workouts ALTER COLUMN start_date TYPE TEXT, ALTER COLUMN end_date TYPE TEXT`;
                yield* sql`INSERT INTO workouts (id, activity_type, status, start_date, end_date, duration_minutes, source_name, notes)
        VALUES ('legacy', 'Running', 'completed', '2026-07-22T09:00:00-04:00', '2026-07-22T09:30:00-04:00', 30, 'Apple Watch', 'Preserve me')`;
                yield* migrate;
                yield* migrate;
                const rows = yield* sql<{
                  id: string;
                  notes: string;
                  date_type: string;
                }>`SELECT id, notes, pg_typeof(start_date)::text AS date_type FROM workouts`;
                expect(rows).toEqual([
                  {
                    id: "legacy",
                    notes: "Preserve me",
                    date_type: "timestamp with time zone",
                  },
                ]);
              }),
            );
          }).pipe(Effect.scoped, Effect.provide(DatabaseTest)),
        ),
      15000,
    );

    it(
      "migrates, creates, updates, reconciles and re-imports without losing data",
      () =>
        Effect.runPromise(
          Effect.gen(function* () {
            const service = yield* Workouts;
            const sql = yield* SqlClient.SqlClient;
            const ids: Array<string> = [];
            yield* Effect.addFinalizer(() =>
              ids.length
                ? sql`DELETE FROM workouts WHERE id IN ${sql.in(ids)}`.pipe(
                    Effect.orDie,
                  )
                : Effect.void,
            );
            const startDate = new Date().toISOString();
            const activityType = `test-${crypto.randomUUID()}`;
            const plan = yield* service.create({
              activityType,
              status: "planned",
              startDate,
              durationMinutes: 45,
              notes: "Keep these notes",
            });
            ids.push(plan.id);
            expect(plan.notes).toBe("Keep these notes");
            expect(yield* service.get({ id: plan.id })).toEqual(plan);
            expect(
              yield* service.get({ id: crypto.randomUUID() }),
            ).toBeUndefined();
            const selection = yield* service.search({
              search: activityType,
              page: 100,
            });
            expect(selection).toMatchObject({ total: 1, page: 1, pages: 1 });
            expect(selection.workouts.map((row) => row.id)).toEqual([plan.id]);
            expect(
              (yield* service.search({
                search: activityType,
                before: startDate,
              })).total,
            ).toBe(0);
            expect(
              (yield* service.search({
                search: activityType,
                after: startDate,
              })).total,
            ).toBe(1);
            const schedule = yield* service.schedule({ search: activityType });
            expect(schedule.days).toHaveLength(7);
            expect(schedule.total).toBe(1);
            expect(
              schedule.days.flatMap((day) => day.workouts.map((row) => row.id)),
            ).toEqual([plan.id]);
            yield* migrate;
            expect(
              (yield* service.list({ activityType })).map((row) => row.id),
            ).toContain(plan.id);

            const updated = yield* service.update({
              id: plan.id,
              payload: {
                activityType,
                status: "planned",
                startDate,
                durationMinutes: 30.5,
                notes: "Updated notes",
                distanceKilometres: 5,
              },
            });
            expect(updated?.durationMinutes).toBe(30.5);
            expect(
              yield* service.update({
                id: crypto.randomUUID(),
                payload: {
                  activityType,
                  status: "planned",
                  startDate,
                  durationMinutes: 1,
                },
              }),
            ).toBeUndefined();

            const imported = {
              ...plan,
              id: `test-import-${crypto.randomUUID()}`,
              status: "completed" as const,
              distanceKilometres: 5,
              notes: undefined,
              sourceName: "Apple Watch",
              heartRate: { average: 140, minimum: 110, maximum: 170 },
            };
            ids.push(imported.id);
            expect(yield* service.import([imported])).toBe(1);
            expect(
              (yield* service.overview({ activityType })).trends.map(
                (row) => row.id,
              ),
            ).toEqual([imported.id]);
            expect(yield* service.list({ activityType })).toMatchObject([
              {
                id: imported.id,
                status: "completed",
                notes: "Updated notes",
                heartRate: { average: 140 },
              },
            ]);
            yield* service.import([
              {
                ...imported,
                distanceKilometres: undefined,
                heartRate: undefined,
              },
            ]);
            const rows = yield* service.list({ activityType });
            expect(rows).toHaveLength(1);
            expect(rows[0]).toMatchObject({
              distanceKilometres: 5,
              notes: "Updated notes",
              heartRate: { average: 140 },
            });
            expect(
              (yield* service.summary({ days: 1 })).byActivityType[
                activityType
              ],
            ).toBe(1);
          }).pipe(Effect.scoped, Effect.provide(TestLive)),
        ),
      15000,
    );
  },
);
