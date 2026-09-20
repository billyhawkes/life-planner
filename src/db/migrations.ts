import { Effect } from "effect";
import { Migrator, SqlClient } from "effect/unstable/sql";

// IF NOT EXISTS adopts databases previously managed by Drizzle without replacing data.
const initial = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`
    CREATE TABLE IF NOT EXISTS workouts (
      id TEXT PRIMARY KEY,
      activity_type TEXT NOT NULL,
      status TEXT NOT NULL,
      start_date TIMESTAMPTZ NOT NULL,
      end_date TIMESTAMPTZ NOT NULL,
      duration_minutes DOUBLE PRECISION NOT NULL,
      source_name TEXT NOT NULL,
      indoor BOOLEAN NOT NULL DEFAULT FALSE,
      distance_kilometres DOUBLE PRECISION,
      active_energy_kilocalories DOUBLE PRECISION,
      heart_rate_average DOUBLE PRECISION,
      heart_rate_minimum DOUBLE PRECISION,
      heart_rate_maximum DOUBLE PRECISION,
      notes TEXT,
      imported BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  // Also supports the original schema that stored dates as text.
  yield* sql`ALTER TABLE workouts
    ALTER COLUMN start_date TYPE TIMESTAMPTZ USING start_date::TIMESTAMPTZ,
    ALTER COLUMN end_date TYPE TIMESTAMPTZ USING end_date::TIMESTAMPTZ`;
});

export const migrate = Migrator.make({})({
  loader: Migrator.fromRecord({ "001_workouts": initial }),
});
