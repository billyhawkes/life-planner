import { describe, expect, it } from "bun:test";
import { Effect, Layer } from "effect";
import { SqlClient } from "effect/unstable/sql";
import { DatabaseTest } from "@/db";
import { Habits } from "./index";
import { decodeCompletionForm, decodeHabitForm } from "./schema";

describe("habit form validation", () => {
  it("trims text and rejects impossible dates and ambiguous completions", async () => {
    expect(
      await Effect.runPromise(
        decodeHabitForm({ name: "  Read  ", startDate: "2028-02-29" }),
      ),
    ).toEqual({
      name: "Read",
      startDate: "2028-02-29",
      notes: "",
    });
    for (const values of [
      { name: " ", startDate: "2026-09-21" },
      { name: "Read", startDate: "2026-02-29" },
      { name: "Read", startDate: "2026-04-31" },
      { name: "Read", startDate: "invalid" },
      { name: "Read", startDate: "0000-01-01" },
      { name: "x".repeat(101), startDate: "2026-09-21" },
    ]) {
      expect(
        (await Effect.runPromise(decodeHabitForm(values).pipe(Effect.result)))
          ._tag,
      ).toBe("Failure");
    }
    expect(
      (
        await Effect.runPromise(
          decodeCompletionForm({ date: "2026-09-21", completed: "yes" }).pipe(
            Effect.result,
          ),
        )
      )._tag,
    ).toBe("Failure");
  });
});

describe.skipIf(!process.env.TEST_DATABASE_URL)(
  "habits PostgreSQL integration",
  () => {
    it(
      "schedules daily from the start date and keeps idempotent completion isolated by habit and day",
      () =>
        Effect.runPromise(
          Effect.gen(function* () {
            const habits = yield* Habits;
            const sql = yield* SqlClient.SqlClient;
            const ids: Array<string> = [];
            yield* Effect.addFinalizer(() =>
              ids.length
                ? sql`DELETE FROM habits WHERE id IN ${sql.in(ids)}`.pipe(
                    Effect.orDie,
                  )
                : Effect.void,
            );
            const first = yield* habits.create({
              payload: {
                name: "Read",
                startDate: "2026-03-08",
                notes: "Ten pages",
              },
            });
            ids.push(first.id);
            const second = yield* habits.create({
              payload: { name: "Walk", startDate: "2026-03-09", notes: "" },
            });
            ids.push(second.id);
            expect(
              (yield* habits.list({})).find((habit) => habit.id === first.id),
            ).toEqual(first);

            const range = { after: "2026-03-07", before: "2026-03-11" };
            const initial = (yield* habits.schedule(range)).filter(
              (row) => row.habit.id === first.id,
            );
            expect(initial.map((row) => [row.date, row.completed])).toEqual([
              ["2026-03-08", false],
              ["2026-03-09", false],
              ["2026-03-10", false],
            ]);
            const completion = {
              id: first.id,
              payload: { date: "2026-03-09", completed: true },
            };
            yield* habits.setCompletion(completion);
            yield* habits.setCompletion(completion);
            const schedule = (yield* habits.schedule(range)).filter((row) =>
              ids.includes(row.habit.id),
            );
            expect(
              schedule
                .filter((row) => row.completed)
                .map((row) => [row.habit.id, row.date]),
            ).toEqual([[first.id, "2026-03-09"]]);
            expect(
              yield* habits.setCompletion({
                id: first.id,
                payload: { date: "2026-03-07", completed: true },
              }),
            ).toBeUndefined();
            expect(
              yield* habits.setCompletion({
                id: "missing-habit",
                payload: completion.payload,
              }),
            ).toBeUndefined();

            yield* habits.setCompletion({
              ...completion,
              payload: { ...completion.payload, completed: false },
            });
            expect(
              (yield* habits.schedule(range))
                .filter((row) => ids.includes(row.habit.id))
                .every((row) => !row.completed),
            ).toBe(true);
            const counts = yield* sql<{
              count: number;
            }>`SELECT count(*)::integer AS count FROM habit_completions WHERE habit_id = ${first.id}`;
            expect(counts[0].count).toBe(1);
            expect(yield* habits.remove({ id: first.id })).toBe(true);
            expect(yield* habits.remove({ id: first.id })).toBe(false);
            expect(
              (yield* habits.schedule(range)).some(
                (row) => row.habit.id === first.id,
              ),
            ).toBe(false);
            expect(
              (yield* habits.list({})).some((row) => row.id === second.id),
            ).toBe(true);
            const remainingCompletions = yield* sql<{
              count: number;
            }>`SELECT count(*)::integer AS count FROM habit_completions WHERE habit_id = ${first.id}`;
            expect(remainingCompletions[0].count).toBe(0);
            const invalid = yield* habits
              .create({
                payload: {
                  name: "Bad date",
                  startDate: "2026-02-30",
                  notes: "",
                },
              })
              .pipe(Effect.result);
            expect(invalid._tag).toBe("Failure");
          }).pipe(
            Effect.scoped,
            Effect.provide(
              Habits.baseLayer.pipe(Layer.provideMerge(DatabaseTest)),
            ),
          ),
        ),
      15000,
    );
  },
);
