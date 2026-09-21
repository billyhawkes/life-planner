import { describe, expect, it } from "bun:test";
import { BunHttpServer } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { HttpRouter } from "effect/unstable/http";
import { SqlClient } from "effect/unstable/sql";

import { applicationRoutes } from "@/app";
import { DatabaseTest } from "@/db";
import { Workouts } from "@/services/workouts";

describe.skipIf(!process.env.TEST_DATABASE_URL)(
  "Bun HTTP and Datastar integration",
  () => {
    it(
      "renders, validates and patches workouts using the real database",
      () =>
        Effect.runPromise(
          Effect.gen(function* () {
            const sql = yield* SqlClient.SqlClient;
            const workouts = yield* Workouts;
            const activityType = `http-test-${crypto.randomUUID()}`;
            yield* Effect.addFinalizer(() =>
              sql`DELETE FROM workouts WHERE activity_type = ${activityType}`.pipe(
                Effect.orDie,
              ),
            );
            const web = HttpRouter.toWebHandler(
              applicationRoutes.pipe(
                HttpRouter.provideRequest(
                  Layer.merge(
                    Layer.succeed(Workouts, workouts),
                    Layer.succeed(SqlClient.SqlClient, sql),
                  ),
                ),
                Layer.provide(BunHttpServer.layerHttpServices),
              ),
              { disableLogger: true },
            );
            yield* Effect.addFinalizer(() => Effect.promise(web.dispose));
            const request = (path: string, init?: RequestInit) =>
              Effect.promise(() =>
                web.handler(new Request(`http://localhost${path}`, init)),
              );

            const root = yield* request("/");
            expect(root.status).toBe(303);
            expect(root.headers.get("location")).toBe("/workouts");
            const page = yield* request("/workouts?view=table");
            expect(page.status).toBe(200);
            expect(yield* Effect.promise(() => page.text())).toContain(
              'id="dashboard"',
            );
            const formPage = yield* request("/workouts?view=table&new=true", {
              headers: { "Datastar-Request": "true" },
            });
            expect(formPage.headers.get("content-type")).toContain(
              "text/event-stream",
            );
            const formHtml = yield* Effect.promise(() => formPage.text());
            expect(formHtml).toContain('id="workout-form"');
            expect(formHtml).toContain('<dialog id="workout-dialog"');
            expect(formHtml).toContain('aria-labelledby="workout-form-title"');
            const tokens = yield* request("/open-props-1.7.23.min.css");
            expect(tokens.headers.get("content-type")).toContain("text/css");
            expect(yield* Effect.promise(() => tokens.text())).toContain(
              "--size-3:",
            );
            const dialogs = yield* request("/dialogs.js");
            expect(dialogs.headers.get("content-type")).toContain(
              "text/javascript",
            );
            const script = yield* request("/datastar.js");
            expect(script.headers.get("content-type")).toContain(
              "text/javascript",
            );
            expect(yield* Effect.promise(() => script.text())).toContain(
              "Datastar v1.0.2",
            );

            const form = {
              activityType,
              status: "planned",
              startDate: "2026-09-20T09:00",
              minutes: "30",
              seconds: "45",
              distance: "5",
              notes: '<script>alert("x")</script>',
              view: "table",
            };
            const created = yield* request("/workouts", {
              method: "POST",
              body: new URLSearchParams(form),
              headers: { "Datastar-Request": "true" },
            });
            expect(created.status).toBe(200);
            expect(created.headers.get("content-type")).toContain(
              "text/event-stream",
            );
            const patch = yield* Effect.promise(() => created.text());
            expect(patch).toContain("event: datastar-patch-elements");
            expect(patch).toContain("&lt;script&gt;");
            expect(patch).not.toContain('<script>alert("x")</script>');
            expect(patch).not.toContain("<dialog");
            const [workout] = yield* workouts.list({ activityType });
            expect(workout?.durationMinutes).toBe(30.75);

            const invalid = yield* request(`/workouts/${workout.id}`, {
              method: "POST",
              body: new URLSearchParams({ ...form, seconds: "99" }),
              headers: { "Datastar-Request": "true" },
            });
            expect(yield* Effect.promise(() => invalid.text())).toContain(
              'role="alert"',
            );
            const nativeInvalid = yield* request("/workouts", {
              method: "POST",
              body: new URLSearchParams({ ...form, minutes: "" }),
            });
            expect(nativeInvalid.status).toBe(400);
            expect(nativeInvalid.headers.get("content-type")).toContain(
              "text/html",
            );
            expect(yield* Effect.promise(() => nativeInvalid.text())).toContain(
              'role="alert"',
            );
            expect(
              (yield* workouts.list({ activityType }))[0].durationMinutes,
            ).toBe(30.75);
            const saved = yield* request(`/workouts/${workout.id}`, {
              method: "POST",
              body: new URLSearchParams({
                ...form,
                minutes: "40",
                notes: "Changed",
              }),
            });
            expect(saved.status).toBe(303);
            expect((yield* workouts.list({ activityType }))[0].notes).toBe(
              "Changed",
            );

            const api = yield* request(
              `/api/workouts?limit=1&activityType=${activityType}`,
            );
            expect(api.status).toBe(200);
            const apiRows = yield* Effect.promise(() => api.json());
            expect(apiRows).toHaveLength(1);
            expect(apiRows[0].activityType).toBe(activityType);
            const badApi = yield* request("/api/workouts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                activityType,
                status: "planned",
                startDate: "invalid",
                durationMinutes: -1,
              }),
            });
            expect(badApi.status).toBe(400);
            const docs = yield* request("/api/docs");
            expect(docs.status).toBe(200);
            const specification = yield* request("/api/openapi.json");
            const spec = yield* Effect.promise(() => specification.json());
            expect(Object.keys(spec.paths).sort()).toEqual([
              "/api/workouts",
              "/api/workouts/summary",
              "/api/workouts/{id}",
            ]);
            const csv = yield* request(
              `/workouts/export?search=${activityType}`,
            );
            expect(csv.headers.get("content-type")).toContain("text/csv");
            expect(yield* Effect.promise(() => csv.text())).toContain(
              activityType,
            );
          }).pipe(
            Effect.scoped,
            Effect.provide(
              Workouts.baseLayer.pipe(Layer.provideMerge(DatabaseTest)),
            ),
          ),
        ),
      15000,
    );
  },
);
