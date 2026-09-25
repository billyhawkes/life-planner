import { describe, expect, it } from "bun:test";
import { BunHttpServer, BunServices } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { BlobWriter, TextReader, ZipWriter } from "@zip.js/zip.js";
import { HttpRouter } from "effect/unstable/http";
import { SqlClient } from "effect/unstable/sql";

import { applicationRoutes } from "@/app";
import { DatabaseTest } from "@/db";
import { Workouts } from "@/services/workouts";
import { Habits } from "@/services/habits";
import { dateKey, localDateTime } from "@/services/workouts/helpers";

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
            const habits = yield* Habits;
            const activityType = `http-test-${crypto.randomUUID()}`;
            yield* Effect.addFinalizer(() =>
              sql`DELETE FROM workouts WHERE activity_type = ${activityType}`.pipe(
                Effect.orDie,
              ),
            );
            const habitName = `habit-http-${crypto.randomUUID()}`;
            yield* Effect.addFinalizer(() =>
              sql`DELETE FROM habits WHERE name = ${habitName}`.pipe(
                Effect.orDie,
              ),
            );
            const web = HttpRouter.toWebHandler(
              applicationRoutes.pipe(
                HttpRouter.provideRequest(
                  Layer.mergeAll(
                    Layer.succeed(Workouts, workouts),
                    Layer.succeed(Habits, habits),
                    Layer.succeed(SqlClient.SqlClient, sql),
                  ),
                ),
                Layer.provide(BunHttpServer.layerHttpServices),
                Layer.provideMerge(BunServices.layer),
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
            const page = yield* request("/workouts?view=week");
            expect(page.status).toBe(200);
            expect(yield* Effect.promise(() => page.text())).toContain(
              'id="dashboard"',
            );
            const stats = yield* request("/workouts?view=stats");
            expect(stats.status).toBe(200);
            const statsHtml = yield* Effect.promise(() => stats.text());
            expect(statsHtml).toContain("Workout overview</h2>");
            expect(statsHtml).toContain("Training trends</h3>");
            expect(statsHtml).not.toContain("All workouts");
            const formPage = yield* request("/workouts?view=week&new=true", {
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
              startDate: localDateTime(new Date()),
              minutes: "30",
              seconds: "45",
              distance: "5",
              notes: '<script>alert("x")</script>',
              view: "week",
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

            const habitDialog = yield* request(
              "/habits/new?view=today&new=true",
              { headers: { "Datastar-Request": "true" } },
            );
            expect(habitDialog.headers.get("content-type")).toContain(
              "text/event-stream",
            );
            expect(yield* Effect.promise(() => habitDialog.text())).toContain(
              '<dialog id="habit-dialog"',
            );
            const habitForm = {
              name: habitName,
              icon: "book-open",
              startDate: dateKey(new Date()),
              notes: "<script>habit</script>",
              view: "today",
            };
            const invalidHabit = yield* request("/habits", {
              method: "POST",
              body: new URLSearchParams({ ...habitForm, name: " " }),
            });
            expect(invalidHabit.status).toBe(400);
            expect(yield* Effect.promise(() => invalidHabit.text())).toContain(
              'role="alert"',
            );
            const createdHabit = yield* request("/habits", {
              method: "POST",
              body: new URLSearchParams(habitForm),
              headers: { "Datastar-Request": "true" },
            });
            const habitPatch = yield* Effect.promise(() => createdHabit.text());
            expect(habitPatch).toContain("event: datastar-patch-elements");
            expect(habitPatch).toContain(habitName);
            expect(habitPatch).toContain('<path d="M12 7v14"');
            expect(habitPatch).not.toContain("<script>habit</script>");
            expect(habitPatch).not.toContain(
              "&lt;script&gt;habit&lt;/script&gt;",
            );
            expect(habitPatch).not.toContain("<dialog");
            expect(habitPatch).not.toContain("<table");
            const habit = (yield* habits.list({})).find(
              (item) => item.name === habitName,
            )!;
            expect(habit.icon).toBe("book-open");
            const editHabit = yield* request(
              `/habits/new?view=today&edit=${habit.id}`,
              { headers: { "Datastar-Request": "true" } },
            );
            const editHabitPatch = yield* Effect.promise(() =>
              editHabit.text(),
            );
            expect(editHabitPatch).toContain("Edit habit");
            expect(editHabitPatch).toContain('value="book-open" checked');
            expect(editHabitPatch).toContain(
              "&lt;script&gt;habit&lt;/script&gt;",
            );
            const updatedHabit = yield* request(`/habits/${habit.id}`, {
              method: "POST",
              body: new URLSearchParams({ ...habitForm, notes: "Updated" }),
            });
            expect(updatedHabit.status).toBe(303);
            expect((yield* habits.get({ id: habit.id }))?.notes).toBe(
              "Updated",
            );
            const completionFields = {
              view: "today",
              date: habitForm.startDate,
              completed: "true",
            };
            const completion = yield* request(
              `/habits/${habit.id}/completion`,
              {
                method: "POST",
                body: new URLSearchParams(completionFields),
                headers: { "Datastar-Request": "true" },
              },
            );
            expect(yield* Effect.promise(() => completion.text())).toContain(
              `Mark incomplete: ${habitName}`,
            );
            const undo = yield* request(`/habits/${habit.id}/completion`, {
              method: "POST",
              body: new URLSearchParams({
                ...completionFields,
                completed: "false",
              }),
            });
            expect(undo.status).toBe(303);
            expect(undo.headers.get("location")).toContain("view=today");
            const calendar = yield* request(
              `/workouts?view=calendar&month=${habitForm.startDate.slice(0, 7)}`,
            );
            const calendarHtml = yield* Effect.promise(() => calendar.text());
            expect(calendarHtml).toContain(habitName);
            expect(calendarHtml).toContain(
              `id="create-menu-trigger-${habitForm.startDate}"`,
            );
            expect(calendarHtml).toContain(
              `popovertarget="create-menu-items-${habitForm.startDate}"`,
            );
            const datedHabitDialog = yield* request(
              "/habits/new?view=calendar&new=2026-10-04",
              { headers: { "Datastar-Request": "true" } },
            );
            expect(
              yield* Effect.promise(() => datedHabitDialog.text()),
            ).toContain('name="startDate" value="2026-10-04"');
            const datedWorkoutDialog = yield* request(
              "/workouts?view=calendar&new=2026-10-04",
              { headers: { "Datastar-Request": "true" } },
            );
            expect(
              yield* Effect.promise(() => datedWorkoutDialog.text()),
            ).toContain('name="startDate" value="2026-10-04T09:00"');
            const week = yield* request(
              `/workouts?view=week&search=${habitName}`,
            );
            const weekHtml = yield* Effect.promise(() => week.text());
            expect(weekHtml).toContain(habitName);
            expect(
              weekHtml.match(/class="day-create-button secondary"/g),
            ).toHaveLength(7);
            const todayPage = yield* request("/workouts?view=today");
            expect(
              (yield* Effect.promise(() => todayPage.text())).match(
                /class="day-create-button secondary"/g,
              ),
            ).toHaveLength(1);
            const missingHabit = yield* request(
              "/habits/missing-habit/completion",
              { method: "POST", body: new URLSearchParams(completionFields) },
            );
            expect(missingHabit.status).toBe(404);
            const missingHabitPatch = yield* request(
              "/habits/missing-habit/completion",
              {
                method: "POST",
                body: new URLSearchParams(completionFields),
                headers: { "Datastar-Request": "true" },
              },
            );
            expect(
              yield* Effect.promise(() => missingHabitPatch.text()),
            ).toContain('id="planner-feedback"');
            const nativeHabit = yield* request("/habits", {
              method: "POST",
              body: new URLSearchParams(habitForm),
            });
            expect(nativeHabit.status).toBe(303);
            expect(nativeHabit.headers.get("location")).toContain("view=today");

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
              "/api/habits",
              "/api/habits/{id}",
              "/api/habits/{id}/completion",
              "/api/workouts",
              "/api/workouts/summary",
              "/api/workouts/{id}",
            ]);
            const deletedWorkout = yield* request(
              `/workouts/${workout.id}/delete`,
              {
                method: "POST",
                body: new URLSearchParams({ view: "week" }),
                headers: { "Datastar-Request": "true" },
              },
            );
            expect(deletedWorkout.headers.get("content-type")).toContain(
              "text/event-stream",
            );
            expect(
              yield* Effect.promise(() => deletedWorkout.text()),
            ).not.toContain(activityType);
            expect(yield* workouts.get({ id: workout.id })).toBeUndefined();
            expect(
              (yield* request(`/api/workouts/${workout.id}`, {
                method: "DELETE",
              })).status,
            ).toBe(404);
            const deletedHabit = yield* request(`/habits/${habit.id}/delete`, {
              method: "POST",
              body: new URLSearchParams({
                view: "calendar",
                month: habitForm.startDate.slice(0, 7),
              }),
              headers: { "Datastar-Request": "true" },
            });
            expect(deletedHabit.headers.get("content-type")).toContain(
              "text/event-stream",
            );
            expect(
              yield* Effect.promise(() => deletedHabit.text()),
            ).not.toContain(`/habits/${habit.id}/completion`);
            expect(
              (yield* request(`/api/habits/${habit.id}`, { method: "DELETE" }))
                .status,
            ).toBe(404);
            const nativeCreated = (yield* habits.list({})).find(
              (item) => item.name === habitName,
            )!;
            const nativeDeleted = yield* request(
              `/habits/${nativeCreated.id}/delete`,
              {
                method: "POST",
                body: new URLSearchParams({ view: "today" }),
              },
            );
            expect(nativeDeleted.status).toBe(303);
            expect(nativeDeleted.headers.get("location")).toContain(
              "view=today",
            );

            const importPage = yield* request("/workouts?import=true");
            expect(yield* Effect.promise(() => importPage.text())).toContain(
              'enctype="multipart/form-data"',
            );
            const archive = yield* Effect.promise(async () => {
              const writer = new ZipWriter(new BlobWriter(), {
                useWebWorkers: false,
              });
              await writer.add(
                "apple_health_export/export.xml",
                new TextReader(
                  `<HealthData><Workout workoutActivityType="HKWorkoutActivityType${activityType}" startDate="2026-09-22 09:00:00 +0000" endDate="2026-09-22 09:30:00 +0000" duration="30" sourceName="Import test"/></HealthData>`,
                ),
              );
              return writer.close();
            });
            const upload = () => {
              const body = new FormData();
              body.set("archive", archive, "export.zip");
              return body;
            };
            const imported = yield* request("/workouts/import?view=stats", {
              method: "POST",
              body: upload(),
            });
            expect(imported.status).toBe(303);
            expect(imported.headers.get("location")).toContain("imported=1");
            expect((yield* workouts.list({ activityType })).length).toBe(1);
            const reimported = yield* request("/workouts/import?view=stats", {
              method: "POST",
              body: upload(),
              headers: { "Datastar-Request": "true" },
            });
            expect(reimported.headers.get("content-type")).toContain(
              "text/event-stream",
            );
            const importResult = yield* Effect.promise(() => reimported.text());
            expect(importResult).toContain("Import complete");
            expect(importResult).toContain("Workouts imported");
            expect(importResult).toContain("Activity types");
            expect(importResult).toContain("0.5 hours");
            expect(importResult).toContain("0 km");
            expect(importResult).toContain("<dd>1</dd>");
            expect(importResult).toContain("<dt>Plans replaced</dt><dd>0</dd>");
            expect(importResult).not.toContain('type="file"');
            const nativeImportResult = yield* request(
              imported.headers.get("location")!,
            );
            expect(
              yield* Effect.promise(() => nativeImportResult.text()),
            ).toContain("Import complete");
            expect((yield* workouts.list({ activityType })).length).toBe(1);
            const invalidZip = new FormData();
            invalidZip.set("archive", new Blob(["not a zip"]), "export.zip");
            const rejected = yield* request("/workouts/import", {
              method: "POST",
              body: invalidZip,
            });
            expect(rejected.status).toBe(400);
            expect(yield* Effect.promise(() => rejected.text())).toContain(
              "Choose a valid export ZIP",
            );
            const missing = yield* request("/workouts/import", {
              method: "POST",
              body: new FormData(),
            });
            expect(missing.status).toBe(400);
            expect((yield* workouts.list({ activityType })).length).toBe(1);
          }).pipe(
            Effect.scoped,
            Effect.provide(
              Layer.merge(Workouts.baseLayer, Habits.baseLayer).pipe(
                Layer.provideMerge(DatabaseTest),
              ),
            ),
            Effect.provide(BunServices.layer),
          ),
        ),
      15000,
    );
  },
);
