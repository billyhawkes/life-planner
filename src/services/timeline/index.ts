import { Context, Effect, Layer, Schema } from "effect";
import { SqlClient } from "effect/sql";
import { DatabaseLive, DatabaseTest } from "@/db";
import {
  BlockPayload,
  LabelPayload,
  TimeBlock,
  TimeLabel,
  TimelineError,
} from "./schema";

export class Timeline extends Context.Service<Timeline>()("Timeline", {
  make: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const fail = (message: string) => new TimelineError({ message });
    const protect = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
      effect.pipe(
        Effect.mapError((cause) =>
          cause instanceof TimelineError
            ? cause
            : new TimelineError({
                message: "Could not save or load time tracking data.",
                cause,
              }),
        ),
      );
    const listLabels = Effect.fn("Timeline.listLabels")((_input: {}) =>
      protect(
        sql`SELECT id, name, goal_minutes AS "goalMinutes", weekly_goal_minutes AS "weeklyGoalMinutes", color FROM time_labels ORDER BY created_at, id`.pipe(
          Effect.flatMap(Schema.decodeUnknownEffect(Schema.Array(TimeLabel))),
        ),
      ),
    );
    const listBlocks = Effect.fn("Timeline.listBlocks")((_input: {}) =>
      protect(
        sql`SELECT id, label_id AS "labelId", to_char(start_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "startTime", to_char(end_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "endTime", notes FROM time_blocks ORDER BY start_time`.pipe(
          Effect.flatMap(Schema.decodeUnknownEffect(Schema.Array(TimeBlock))),
        ),
      ),
    );
    const saveLabel = Effect.fn("Timeline.saveLabel")(function* (input: {
      id?: string;
      payload: LabelPayload;
    }) {
      const payload = yield* Schema.decodeUnknownEffect(LabelPayload)(
        input.payload,
      );
      if (input.id) {
        const rows =
          yield* sql`UPDATE time_labels SET name = ${payload.name}, goal_minutes = ${payload.goalMinutes}, weekly_goal_minutes = ${payload.weeklyGoalMinutes}, color = ${payload.color} WHERE id = ${input.id} RETURNING id`;
        if (!rows.length) return yield* fail("Label not found.");
      } else
        yield* sql`INSERT INTO time_labels (id, name, goal_minutes, weekly_goal_minutes, color) VALUES (${crypto.randomUUID()}, ${payload.name}, ${payload.goalMinutes}, ${payload.weeklyGoalMinutes}, ${payload.color})`;
    }, protect);
    const lock = sql`SELECT pg_advisory_xact_lock(7319042)`;
    const saveBlock = Effect.fn("Timeline.saveBlock")(
      (input: { id?: string; payload: BlockPayload }) =>
        protect(
          sql.withTransaction(
            Effect.gen(function* () {
              const decoded = yield* Schema.decodeUnknownEffect(BlockPayload)(
                input.payload,
              );
              // Interpret datetime-local values exactly as the rendered calendar
              // does, then send explicit instants instead of relying on the DB timezone.
              const payload = {
                ...decoded,
                startTime: new Date(decoded.startTime).toISOString(),
                endTime:
                  decoded.endTime === null
                    ? null
                    : new Date(decoded.endTime).toISOString(),
              };
              yield* lock;
              const labels =
                yield* sql`SELECT id FROM time_labels WHERE id = ${payload.labelId}`;
              if (!labels.length)
                return yield* fail("Choose an existing label.");
              const overlapping =
                yield* sql`SELECT id FROM time_blocks WHERE id <> ${input.id ?? ""} AND start_time < coalesce(${payload.endTime}::timestamptz, 'infinity'::timestamptz) AND coalesce(end_time, 'infinity'::timestamptz) > ${payload.startTime}::timestamptz`;
              if (overlapping.length)
                return yield* fail(
                  "This block overlaps another block. Adjust its start or end time.",
                );
              if (input.id) {
                const rows =
                  yield* sql`UPDATE time_blocks SET label_id = ${payload.labelId}, start_time = ${payload.startTime}::timestamptz, end_time = ${payload.endTime}::timestamptz, notes = ${payload.notes} WHERE id = ${input.id} RETURNING id`;
                if (!rows.length) return yield* fail("Time block not found.");
              } else
                yield* sql`INSERT INTO time_blocks (id, label_id, start_time, end_time, notes) VALUES (${crypto.randomUUID()}, ${payload.labelId}, ${payload.startTime}::timestamptz, ${payload.endTime}::timestamptz, ${payload.notes})`;
            }),
          ),
        ),
    );
    const start = Effect.fn("Timeline.start")((input: { labelId: string }) =>
      protect(
        sql.withTransaction(
          Effect.gen(function* () {
            yield* lock;
            const labels =
              yield* sql`SELECT id FROM time_labels WHERE id = ${input.labelId}`;
            if (!labels.length) return yield* fail("Choose an existing label.");
            const running = yield* sql<{
              startTime: string;
            }>`SELECT to_char(start_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "startTime" FROM time_blocks WHERE end_time IS NULL`;
            const now = new Date(
              Math.max(
                Date.now(),
                running[0] ? Date.parse(running[0].startTime) + 1 : 0,
              ),
            ).toISOString();
            yield* sql`UPDATE time_blocks SET end_time = ${now}::timestamptz WHERE end_time IS NULL`;
            yield* sql`INSERT INTO time_blocks (id, label_id, start_time) VALUES (${crypto.randomUUID()}, ${input.labelId}, ${now}::timestamptz)`;
          }),
        ),
      ),
    );
    const stop = Effect.fn("Timeline.stop")((input: { id: string }) =>
      protect(
        sql.withTransaction(
          Effect.gen(function* () {
            yield* lock;
            yield* sql`UPDATE time_blocks SET end_time = greatest(${new Date().toISOString()}::timestamptz, start_time + interval '1 millisecond') WHERE id = ${input.id} AND end_time IS NULL`;
          }),
        ),
      ),
    );
    const removeBlock = Effect.fn("Timeline.removeBlock")(
      (input: { id: string }) =>
        protect(
          sql.withTransaction(
            Effect.gen(function* () {
              yield* lock;
              const rows =
                yield* sql`DELETE FROM time_blocks WHERE id = ${input.id} RETURNING id`;
              if (!rows.length) return yield* fail("Time block not found.");
            }),
          ),
        ),
    );
    return {
      listLabels,
      listBlocks,
      saveLabel,
      saveBlock,
      start,
      stop,
      removeBlock,
    };
  }),
}) {
  static readonly baseLayer = Layer.effect(this, this.make);
  static readonly layer = this.baseLayer.pipe(Layer.provide(DatabaseLive));
  static readonly testLayer = this.baseLayer.pipe(Layer.provide(DatabaseTest));
}
