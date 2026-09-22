import { PgClient } from "@effect/sql-pg";
import { Config, Effect, Layer } from "effect";

import { migrate } from "@/db/migrations";

const databaseLayer = (variable: string) => {
  const client = Layer.unwrap(
    Config.Redacted(variable).pipe(
      Effect.map((url) => PgClient.layer({ url })),
    ),
  );
  return Layer.effectDiscard(migrate).pipe(Layer.provideMerge(client));
};

export const DatabaseLive = databaseLayer("DATABASE_URL");
export const DatabaseTest = databaseLayer("TEST_DATABASE_URL");
