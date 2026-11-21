import { Context, Effect, Layer, Option, Schema } from "effect";
import { SecureRandom } from "effect/crypto";
import { SqlClient, SqlSchema } from "effect/sql";
import { DatabaseLive, DatabaseTest } from "@/db";
import { Goal, GoalDataError, GoalId, GoalPayload } from "./schema";

const databaseError = (cause: unknown) =>
  new GoalDataError({ message: "Could not load or save goals", cause });

export class Goals extends Context.Service<Goals>()("Goals", {
  make: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const random = yield* SecureRandom.SecureRandom.pipe(
      Effect.provide(SecureRandom.layerWebCrypto),
    );
    const listQuery = SqlSchema.findAll({
      Request: Schema.Struct({}).annotate({ identifier: "ListGoalsRequest" }),
      Result: Goal,
      execute: () => sql`
        SELECT id, title, notes, status FROM goals
        ORDER BY (status = 'achieved'), created_at, id`,
    });
    const getQuery = SqlSchema.findOneOption({
      Request: GoalId,
      Result: Goal,
      execute: ({ id }) => sql`
        SELECT id, title, notes, status FROM goals WHERE id = ${id}`,
    });
    const createQuery = SqlSchema.findOne({
      Request: GoalPayload,
      Result: Goal,
      execute: ({ title, notes, status }) =>
        random.uuidV7().pipe(
          Effect.flatMap(
            (id) => sql`
          INSERT INTO goals (id, title, notes, status)
          VALUES (${id}, ${title}, ${notes}, ${status})
          RETURNING id, title, notes, status`,
          ),
        ),
    });
    const updateQuery = SqlSchema.findOneOption({
      Request: Schema.Struct({
        id: Schema.String,
        payload: GoalPayload,
      }).annotate({
        identifier: "UpdateGoalRequest",
      }),
      Result: Goal,
      execute: ({ id, payload }) => sql`
        UPDATE goals SET title = ${payload.title}, notes = ${payload.notes}, status = ${payload.status}
        WHERE id = ${id} RETURNING id, title, notes, status`,
    });
    const removeQuery = SqlSchema.findOneOption({
      Request: GoalId,
      Result: GoalId,
      execute: ({ id }) => sql`DELETE FROM goals WHERE id = ${id} RETURNING id`,
    });

    return {
      list: Effect.fn("Goals.list")((input: {}) =>
        listQuery(input).pipe(Effect.mapError(databaseError)),
      ),
      get: Effect.fn("Goals.get")((input: typeof GoalId.Type) =>
        getQuery(input).pipe(
          Effect.map(Option.getOrUndefined),
          Effect.mapError(databaseError),
        ),
      ),
      create: Effect.fn("Goals.create")(
        (input: { readonly payload: typeof GoalPayload.Type }) =>
          createQuery(input.payload).pipe(Effect.mapError(databaseError)),
      ),
      update: Effect.fn("Goals.update")(
        (input: {
          readonly id: string;
          readonly payload: typeof GoalPayload.Type;
        }) =>
          updateQuery(input).pipe(
            Effect.map(Option.getOrUndefined),
            Effect.mapError(databaseError),
          ),
      ),
      remove: Effect.fn("Goals.remove")((input: typeof GoalId.Type) =>
        removeQuery(input).pipe(
          Effect.map(Option.isSome),
          Effect.mapError(databaseError),
        ),
      ),
    };
  }),
}) {
  static readonly baseLayer = Layer.effect(this, this.make);
  static readonly layer = this.baseLayer.pipe(Layer.provide(DatabaseLive));
  static readonly testLayer = this.baseLayer.pipe(Layer.provide(DatabaseTest));
}
