# AGENTS

## Core Rules

- Prefer the smallest correct change that fits the existing architecture.
- Keep frontend and backend concerns separated unless a feature explicitly spans both.
- Use project conventions already present in nearby files before introducing new patterns.
- Do not edit generated or registry-managed files unless explicitly requested.

## UI

- Public-facing copy is English-only.
- Write server-rendered views in TSX using the local JSX runtime in `src/lib/jsx/`.
- JSX returns escaped `Html` values compatible with `src/lib/datastar.ts`; no React runtime is involved.
- Use native HTML controls and Datastar attributes for interactions.

## Architecture

The application is divided into two areas: frontend and backend.

### Frontend

- Server-rendered HTML and plain CSS, enhanced by Datastar.
- Server state lives in Effect services; mutations return Datastar SSE patches.
- Keep forms usable through native POST/redirect as well as Datastar.

### Backend

- Effect application services.
- Effect SQL through `@effect/sql-pg` for PostgreSQL access.
- Effect SQL migrations run at startup, before serving requests or importing data.
- Bun runs the HTTP server, builds the app, and parses Apple Health XML.
- Effect HttpApi, HttpServer, OpenAPI, and OpenTelemetry for API and runtime concerns.

## Folder Structure

- `public/` contains static assets.
- `scripts/` contains build and utility scripts.
- `tmp/` contains local temporary files that should not be committed.
- `src/db/` contains SQL client layers and versioned migrations.
- `src/lib/` contains shared infrastructure and runtime utilities, including API/MCP helpers, Datastar HTML/SSE encoding, and JSX.
- `src/services/` contains Effect service definitions, API handlers, and schemas.
- `src/routes/` contains server-rendered TSX page templates and the document shell.
- `src/services/<name>/components/` contains service-specific TSX components.
- `src/services/<name>/helpers.ts` contains shared presentation types, formatting, and filtering helpers.
- `src/lib/jsx/` contains the JSX runtime; `src/lib/datastar.ts` contains escaped HTML templates and SSE encoding.
- `src/app.ts` composes application routes; `src/server.ts` starts Bun HTTP.
- `src/api.ts` defines the root Effect API.

## Code Practices

- Prefer arrow functions `() => void` over function expressions `function () {}` except where Effect generator APIs require `function*`.
- Avoid `as any`, `as Type`, and `as unknown` unless absolutely necessary.
- Use Effect `Schema` for validation. Do not use Zod or other validation libraries.
- Prefer Effect-native integrations over ad hoc boundaries: use `FetchHttpClient`/`HttpClient` instead of raw `fetch`, Effect `Schema` codecs such as `Schema.fromJsonString(...)` and `HttpClientResponse.schemaBodyJson(...)` instead of manual `JSON.parse` or custom validation, and typed Effect errors instead of broad `try`/`tryPromise` wrappers.
- Use `Effect.try` or `Effect.tryPromise` only when wrapping a non-Effect API that has no suitable Effect adapter; keep the boundary as small as possible and map failures into domain-specific errors.
- Annotate schemas with `.annotate({ identifier: "Name" })`.
- Use `Schema.toStandardSchemaV1(...)` when integrating Effect schemas with form validators.
- Use `Effect.fn` for service methods when practical.
- Add OpenTelemetry through Effect runtime patterns where relevant.

## Services

Use service-based design for CRUD, features, integrations, and related domain concerns.

A typical service should use this structure:

- `src/services/<name>/schema.ts` defines Effect schemas, payload schemas, route params, and standard schema exports.
- `src/services/<name>/index.ts` implements the Effect `Context.Service` and exposes production and test layers where needed.
- `src/services/<name>/api.group.ts` defines JSON API and browser (HTML, forms, SSE, downloads) HttpApiGroup contracts.
- `src/services/<name>/api.builder.ts` implements those HTTP handlers, rendering page templates and mapping errors.
- `src/services/<name>/components/` defines reusable UI components for that service; page composition belongs in `src/routes/`.

Service methods should accept object inputs, scope by the current user or tenant where applicable, and avoid exposing cross-tenant data.

## API

- Define the root API in `src/api.ts`.
- Merge service API groups into the root API with `.add(...)`.
- Keep OpenAPI annotations on the root API.
- OpenAPI documentation is served at `/api/docs`.
- MCP server support is served at `/api/mcp`, using Effect MCP and the shared HttpApi contract.

## Tooling

- Keep runtime dependencies limited to Bun, Effect, the Effect PostgreSQL adapter, and zip.js for streaming ZIP imports.
- Datastar is vendored in `public/datastar.js`; do not edit the minified runtime by hand.
- The application is a local single-user tool with no authentication layer.

## Testing

- Use Bun's built-in test runner (`bun test`).
- Add tests beside code when practical using `*.test.ts` or `*.test.tsx`.
- Import `describe`, `expect`, and `it` from `bun:test`.
- Run Effect programs with `Effect.runPromise(...)` and provide dependencies with `Effect.provide(...)`.
- Prefer fresh per-test layers so mutable state does not leak.
- Use suite-shared layers only for expensive resources and reset state between tests.
- Backend and service tests must use the real Postgres test database through `TEST_DATABASE_URL`.
- Never point tests at `DATABASE_URL`.
- The test database is provided externally. Set `TEST_DATABASE_URL` in `.env` or the shell before DB tests.
- Expose service `testLayer`s for tests, backed by `DatabaseTest` where database access is needed.
- Run migrations against the test database before DB tests and reset affected tables between tests.
- Use parameterized Effect SQL for queries, test setup, and cleanup.

## Checks

Run checks after code changes when practical:

- `bun run test`
- `bun type:check`
- `bun lint`
- `bun fmt`

## Examples

KrakStack examples are the canonical architecture reference for this project. Prefer the configured `krakstack` project reference. If it is unavailable, use `https://github.com/krakcons/krakstack/tree/main/src/agent-examples`.

Before implementing or substantially refactoring one of the areas below, read the corresponding KrakStack example and the nearest equivalent implementation in this repository.

| Task                  | Required KrakStack reference                |
| --------------------- | ------------------------------------------- |
| Effect service        | `src/agent-examples/service/service.ts`     |
| Effect schemas        | `src/agent-examples/service/schema.ts`      |
| HttpApi contract      | `src/agent-examples/service/api.group.ts`   |
| HttpApi handlers      | `src/agent-examples/service/api.builder.ts` |
| Root API registration | `src/agent-examples/service/api-entry.ts`   |

<!-- intent-skills:start -->

## Skill Loading

Before substantial work:

- Skill check: run `npx @tanstack/intent@latest list`, or use skills already listed in context.
- Skill guidance: if one local skill clearly matches the task, run `npx @tanstack/intent@latest load <package>#<skill>` and follow the returned `SKILL.md`.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.

<!-- intent-skills:end -->
