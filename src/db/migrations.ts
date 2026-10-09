import { Effect } from "effect";
import { Migrator, SqlClient } from "effect/sql";

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

const timeline = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`CREATE TABLE time_labels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
    goal_minutes INTEGER NOT NULL CHECK (goal_minutes BETWEEN 0 AND 1440),
    color TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  yield* sql`CREATE TABLE time_blocks (
    id TEXT PRIMARY KEY,
    label_id TEXT NOT NULL REFERENCES time_labels(id),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    notes TEXT NOT NULL DEFAULT '',
    CHECK (end_time IS NULL OR end_time > start_time)
  )`;
  yield* sql`CREATE UNIQUE INDEX time_blocks_one_running ON time_blocks ((true)) WHERE end_time IS NULL`;
  yield* sql`CREATE INDEX time_blocks_start ON time_blocks (start_time)`;
});

const weeklyTimeGoals = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`ALTER TABLE time_labels ADD COLUMN weekly_goal_minutes INTEGER NOT NULL DEFAULT 0 CHECK (weekly_goal_minutes BETWEEN 0 AND 10080)`;
});

const timeGoalTypes = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`ALTER TABLE time_labels ADD COLUMN goal_type TEXT NOT NULL DEFAULT 'minimum' CHECK (goal_type IN ('minimum', 'maximum'))`;
  yield* sql`UPDATE time_labels SET goal_type = 'maximum' WHERE lower(trim(name)) = 'work'`;
});

export const migrate = Migrator.make({})({
  loader: Migrator.fromRecord({
    "001_workouts": initial,
    "002_habits": habits,
    "003_habit_icons": habitIcons,
    "004_lucide_habit_icons": lucideHabitIcons,
    "005_remove_sparkles_habit_icon": removeSparklesHabitIcon,
    "006_timeline": timeline,
    "007_weekly_time_goals": weeklyTimeGoals,
    "008_time_goal_types": timeGoalTypes,
  }),
});
