import { PgClient, PgTypes } from "@effect/sql-pg";
import { Config, Effect, Layer, Result } from "effect";

import { migrate } from "@/db/migrations";

const types = PgTypes.makeRegistry();

// Effect's migrator probes an existing table with a regclass result. Decode the
// binary OID instead of treating it as UTF-8 text.
types.register(2205, {
  decode: (bytes) =>
    Result.succeed(
      new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(
        0,
      ),
    ),
  encode: (value) => {
    const bytes = new Uint8Array(4);
    new DataView(bytes.buffer).setUint32(0, value);
    return Result.succeed(bytes);
  },
});

const databaseLayer = (variable: string) => {
  const client = Layer.unwrap(
    Config.Redacted(variable).pipe(
      Effect.map((url) => PgClient.layer({ url, types })),
    ),
  );
  return Layer.effectDiscard(migrate).pipe(Layer.provideMerge(client));
};

export const DatabaseLive = databaseLayer("DATABASE_URL");
export const DatabaseTest = databaseLayer("TEST_DATABASE_URL");
