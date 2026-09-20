# Training Ledger

A local Apple Health workout dashboard built with **Bun, Effect, and Datastar**.
Plan and edit workouts, review weekly sessions, browse a calendar, and compare
running/cycling pace and distance. The log includes search, sorting, pagination,
and CSV export. The dashboard displays the latest 500 workouts.

The server renders TSX templates to HTML with plain CSS. Datastar submits forms and applies HTML
patches over SSE. PostgreSQL access and migrations use Effect SQL. The UI is
English-only and intended for local, single-user use.

TSX uses a small local JSX runtime, compiled directly by Bun. Components return
escaped HTML; there is no React dependency, hydration, or client component tree.
Use native HTML attribute names (`class`, `for`, `selected`) and Datastar attributes:

```tsx
const AddWorkout = () => (
  <button data-on:click="@get('/workouts?new=true')">Add workout</button>
);
```

## Quick start

Requires Bun **1.4.0 or newer** (for `Bun.XML`), PostgreSQL, and `unzip` for imports.

```sh
bun install
cp .env.example .env
# Set DATABASE_URL in .env to your PostgreSQL database.
bun run dev
```

Open <http://localhost:3000>. Migrations run automatically before the server
starts. `bun run db:migrate` also runs them explicitly.

| Variable            | Purpose                                                      |
| ------------------- | ------------------------------------------------------------ |
| `DATABASE_URL`      | PostgreSQL connection for the app and importer               |
| `PORT`              | HTTP port; defaults to `3000`                                |
| `SITE_URL`          | MCP's loopback API URL; defaults to `http://localhost:$PORT` |
| `TEST_DATABASE_URL` | Separate PostgreSQL database for integration tests           |

For a production build:

```sh
bun run build
bun run preview
```

The Bun bundle at `dist/server.js` embeds CSS and the vendored Datastar runtime.
It can be run with `bun dist/server.js`; no asset directory or frontend build
server is required. `bun start` runs the source without watch mode.

## Import Apple Health

Place your Apple Health archive at `export.zip`, then run:

```sh
bun run health:import
# Or supply an archive path:
bun run health:import /path/to/export.zip
```

The importer streams `apple_health_export/export.xml` through `unzip`, extracts
individual workout elements, and parses them with `Bun.XML.parse`. It stores
only workout summaries, without loading the complete export into memory.
Clinical records and workout routes are not imported or uploaded.

Imports are transactional and idempotent. Stable workout identities are upserted.
New imports match the nearest planned session of the same activity within 12
hours and retain its notes. Re-imports preserve existing notes and fill in
available distance, energy, and heart-rate data.

## Database migrations

`src/db/index.ts` composes the Effect PostgreSQL client and migration layer.
`src/db/migrations.ts` defines numbered Effect SQL migrations, recorded in
`effect_sql_migrations` and applied transactionally.

The initial migration adopts existing `workouts` tables created by Drizzle,
including the original text-date schema. Existing workout data is retained;
there is no reset or re-import step. Add subsequent numbered migrations rather
than modifying a migration that has already run.

## Endpoints

- Dashboard: `/workouts`
- Workout JSON API: `GET /api/workouts`, `POST /api/workouts`, `PATCH /api/workouts/:id`
- Summary: `/api/workouts/summary?days=28`
- OpenAPI: `/api/openapi.json`
- API documentation: `/api/docs`
- MCP: `/api/mcp` (read-only tools generated from the workout API)
- Health: `/api/health`, `/api/health/live`, `/api/health/ready`, `/api/health/startup`

## Project layout

- `src/server.ts` — Bun HTTP entry point
- `src/app.ts` — Effect HTTP/API route composition
- `src/services/workouts/api.group.ts` — JSON API, page, form, and CSV endpoint contracts
- `src/services/workouts/api.builder.ts` — JSON and browser HTTP handlers
- `src/routes/` — TSX page templates, document shell, and error page
- `src/services/workouts/components/` — workout form, table, chart, calendar, and links
- `src/services/workouts/helpers.ts` — view options, formatting, URLs, and CSV output
- `src/lib/jsx/` — server-side JSX runtime (escaping, attributes, components, fragments)
- `src/lib/datastar.ts` — escaped HTML templates and SSE encoding
- `public/styles.css` — application styles
- `src/services/workouts/` — workout service and typed JSON API
- `src/db/` — PostgreSQL layers and migrations
- `scripts/` — migrations and Apple Health importer
- `public/datastar.js` — Datastar 1.0.2, vendored from the template's `datastar-effect` branch

## Checks

```sh
bun run test
bun type:check
bun lint
bun fmt
bun run build
```

Database integration tests require `TEST_DATABASE_URL` and are skipped when it
is absent. They apply migrations and clean up only their own fixture rows.
Never point them at the application database.
