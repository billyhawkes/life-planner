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

const habits = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`CREATE TABLE habits (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  yield* sql`CREATE TABLE habit_completions (
    habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (habit_id, date)
  )`;
});

const habitIcons = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`ALTER TABLE habits ADD COLUMN IF NOT EXISTS icon TEXT NOT NULL DEFAULT '✓'`;
});

const lucideHabitIcons = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`UPDATE habits SET icon = CASE icon
    WHEN '📖' THEN 'book-open'
    WHEN '💧' THEN 'droplet'
    WHEN '🧘' THEN 'person-standing'
    WHEN '🚶' THEN 'footprints'
    WHEN '🏃' THEN 'activity'
    WHEN '💪' THEN 'dumbbell'
    WHEN '🥗' THEN 'salad'
    WHEN '💊' THEN 'pill'
    WHEN '🧹' THEN 'sparkles'
    WHEN '✍️' THEN 'pencil'
    WHEN '🌱' THEN 'sprout'
    ELSE 'circle-check'
  END`;
  yield* sql`ALTER TABLE habits ALTER COLUMN icon SET DEFAULT 'circle-check'`;
});

const removeSparklesHabitIcon = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`UPDATE habits SET icon = 'sun' WHERE icon = 'sparkles'`;
});

export const migrate = Migrator.make({})({
  loader: Migrator.fromRecord({
    "001_workouts": initial,
    "002_habits": habits,
    "003_habit_icons": habitIcons,
    "004_lucide_habit_icons": lucideHabitIcons,
    "005_remove_sparkles_habit_icon": removeSparklesHabitIcon,
  }),
});
