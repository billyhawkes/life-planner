import { Context, Effect, Layer, Option, Schema } from "effect";
import { SecureRandom } from "effect/crypto";
import { SqlClient, SqlSchema } from "effect/sql";
import { DatabaseLive, DatabaseTest } from "@/db";
import { dateKey } from "@/services/workouts/helpers";
import {
  Task,
  TaskCompletion,
  TaskDataError,
  TaskIdParams,
  TaskPayload,
} from "./schema";

const databaseError = (cause: unknown) =>
  new TaskDataError({ message: "Could not load or save tasks", cause });

export class Tasks extends Context.Service<Tasks>()("Tasks", {
  make: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const random = yield* SecureRandom.SecureRandom.pipe(
      Effect.provide(SecureRandom.layerWebCrypto),
    );
    const listQuery = SqlSchema.findAll({
      Request: Schema.Struct({}).annotate({ identifier: "ListTasksRequest" }),
      Result: Task,
      execute: () => sql`
        SELECT id, title, date::text, notes, completed FROM tasks
        ORDER BY completed, date NULLS FIRST, created_at, id`,
    });
    const getQuery = SqlSchema.findOneOption({
      Request: TaskIdParams,
      Result: Task,
      execute: ({ id }) => sql`
        SELECT id, title, date::text, notes, completed FROM tasks WHERE id = ${id}`,
    });
    const createQuery = SqlSchema.findOne({
      Request: Schema.Struct({ payload: TaskPayload }).annotate({
        identifier: "CreateTaskRequest",
      }),
      Result: Task,
      execute: ({ payload }) =>
        random.uuidV7().pipe(
          Effect.flatMap(
            (id) => sql`
        INSERT INTO tasks (id, title, date, notes)
        VALUES (${id}, ${payload.title}, ${payload.date}::date, ${payload.notes})
        RETURNING id, title, date::text, notes, completed`,
          ),
        ),
    });
    const updateQuery = SqlSchema.findOneOption({
      Request: Schema.Struct({
        id: Schema.String,
        payload: TaskPayload,
      }).annotate({ identifier: "UpdateTaskRequest" }),
      Result: Task,
      execute: ({ id, payload }) => sql`
        UPDATE tasks SET title = ${payload.title},
          date = CASE WHEN completed THEN COALESCE(${payload.date}::date, date, ${dateKey(new Date())}::date)
            ELSE ${payload.date}::date END,
          notes = ${payload.notes} WHERE id = ${id}
        RETURNING id, title, date::text, notes, completed`,
    });
    const completionQuery = SqlSchema.findOneOption({
      Request: Schema.Struct({
        id: Schema.String,
        payload: TaskCompletion,
      }).annotate({ identifier: "CompleteTaskRequest" }),
      Result: Task,
      execute: ({ id, payload }) => sql`
        UPDATE tasks SET completed = ${payload.completed},
          date = CASE WHEN ${payload.completed} THEN COALESCE(date, ${dateKey(new Date())}::date) ELSE date END
        WHERE id = ${id}
        RETURNING id, title, date::text, notes, completed`,
    });
    const removeQuery = SqlSchema.findAll({
      Request: TaskIdParams,
      Result: TaskIdParams,
      execute: ({ id }) => sql`DELETE FROM tasks WHERE id = ${id} RETURNING id`,
    });
    const list = Effect.fn("Tasks.list")((input: {}) =>
      listQuery(input).pipe(Effect.mapError(databaseError)),
    );
    const get = Effect.fn("Tasks.get")((input: { readonly id: string }) =>
      getQuery(input).pipe(
        Effect.map(Option.getOrUndefined),
        Effect.mapError(databaseError),
      ),
    );
    const create = Effect.fn("Tasks.create")(
      (input: { readonly payload: TaskPayload }) =>
        createQuery(input).pipe(Effect.mapError(databaseError)),
    );
    const update = Effect.fn("Tasks.update")(
      (input: { readonly id: string; readonly payload: TaskPayload }) =>
        updateQuery(input).pipe(
          Effect.map(Option.getOrUndefined),
          Effect.mapError(databaseError),
        ),
    );
    const setCompletion = Effect.fn("Tasks.setCompletion")(
      (input: {
        readonly id: string;
        readonly payload: typeof TaskCompletion.Type;
      }) =>
        completionQuery(input).pipe(
          Effect.map(Option.getOrUndefined),
          Effect.mapError(databaseError),
        ),
    );
    const remove = Effect.fn("Tasks.remove")((input: { readonly id: string }) =>
      removeQuery(input).pipe(
        Effect.map((rows) => rows.length > 0),
        Effect.mapError(databaseError),
      ),
    );
    return { list, get, create, update, setCompletion, remove };
  }),
}) {
  static readonly baseLayer = Layer.effect(this, this.make);
  static readonly layer = this.baseLayer.pipe(Layer.provide(DatabaseLive));
  static readonly testLayer = this.baseLayer.pipe(Layer.provide(DatabaseTest));
}
