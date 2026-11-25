import { describe, expect, it } from "bun:test";
import { Effect, Layer } from "effect";
import { SqlClient } from "effect/sql";
import { DatabaseTest } from "@/db";
import { renderDashboard } from "@/routes/workouts";
import { dateKey, readOptions } from "@/services/workouts/helpers";
import { Tasks } from "./index";
import { decodeTaskCompletion, decodeTaskForm, type Task } from "./schema";
import { TaskForm } from "./components/form";

describe("tasks", () => {
  it("validates task forms and optional dates", async () => {
    expect(
      await Effect.runPromise(decodeTaskForm({ title: "  Buy milk  " })),
    ).toEqual({
      title: "Buy milk",
      date: null,
      notes: "",
    });
    expect(
      (
        await Effect.runPromise(
          decodeTaskForm({ title: "Leap day", date: "2028-02-29" }),
        )
      ).date,
    ).toBe("2028-02-29");
    const invalidValues: ReadonlyArray<Record<string, string>> = [
      { title: " " },
      { title: "x".repeat(201) },
      { title: "Task", date: "2026-02-29" },
      { title: "Task", date: "2026-04-31" },
      { title: "Task", date: "invalid" },
      { title: "Task", notes: "x".repeat(2001) },
    ];
    for (const values of invalidValues) {
      expect(
        (await Effect.runPromise(decodeTaskForm(values).pipe(Effect.result)))
          ._tag,
      ).toBe("Failure");
    }
    expect(
      (
        await Effect.runPromise(
          decodeTaskCompletion({ completed: "yes" }).pipe(Effect.result),
        )
      )._tag,
    ).toBe("Failure");
  });

  it("shows one simple inbox and goals on the homepage", () => {
    const today = dateKey(new Date());
    const task = (
      id: string,
      date: string | null,
      completed = false,
    ): Task => ({ id, title: id, date, completed, notes: "" });
    const page = renderDashboard(
      {
        view: "dashboard",
        goals: [],
        timeline: {
          labels: [
            {
              id: "reading",
              name: "Reading",
              color: "#15803d",
              goalType: "minimum",
              goalMinutes: 30,
              weeklyGoalMinutes: 150,
            },
          ],
          blocks: [],
        },
        tasks: [
          task("inbox-task", null),
          task("overdue-task", "2000-01-01"),
          task("today-task", today),
          task("upcoming-task", "9999-01-01"),
          task("done-task", null, true),
        ],
      },
      readOptions({ view: "dashboard" }),
    ).value;
    const start = page.indexOf('aria-label="Inbox tasks"');
    const end = page.indexOf("</section>", start);
    const inbox = page.slice(start, end);
    expect(inbox).toContain(">inbox-task</span>");
    expect(inbox).toContain('<span class="task-count">1</span>');
    for (const title of [
      "overdue-task",
      "today-task",
      "upcoming-task",
      "done-task",
    ]) {
      expect(inbox).not.toContain(`>${title}</span>`);
    }
    expect(page).not.toContain('aria-label="Overdue tasks"');
    expect(page).not.toContain('aria-label="Completed tasks"');
    expect(page).toContain('id="homepage-goals-title"');
    expect(page).toContain('class="card dashboard-card task-list"');
    expect(page).toContain('class="card dashboard-card personal-goals"');
    expect(page).toContain(
      'class="card dashboard-card" aria-labelledby="homepage-time-goals-title"',
    );
    expect(page).toContain('class="tracking-goal-list time-goal-rows"');
    expect(page).toContain('class="editable-row timeline-goal"');
    expect(page).toContain("Reading");
    expect(page).toContain('aria-label="Reading weekly goal"');
    expect(page).toContain('id="add-task"');
    expect(page).toContain('id="task-form"');
  });

  it.each(["today", "week", "calendar"] as const)(
    "renders tasks in %s with date-aware creation",
    (view) => {
      const page = renderDashboard(
        {
          view,
          days: [
            {
              date: new Date("2026-11-21T12:00"),
              workouts: [],
              habits: [],
              tasks: [
                {
                  id: "scheduled",
                  title: "<Do something>",
                  date: "2026-11-21",
                  notes: "A task description",
                  completed: false,
                },
              ],
            },
          ],
        },
        readOptions({ view, month: "2026-11" }),
      ).value;
      expect(page).toContain("&lt;Do something&gt;");
      expect(page).toContain("/tasks/scheduled/completion");
      expect(page).toContain('id="add-task-2026-11-21"');
      expect(page).toContain("/tasks/new?");
      expect(page).toContain("new=2026-11-21");
      expect(page).not.toContain("Nothing planned");
      if (view === "today") {
        expect(page).toMatch(
          /class="card task-list today-tasks"[^>]*><h3 id="today-tasks-title">Tasks<\/h3>.*\/tasks\/scheduled\/completion/,
        );
        expect(page).toMatch(
          /class="task-edit editable-row-link"[^>]+><span class="task-text"><span class="task-title">&lt;Do something&gt;<\/span><span class="task-notes">A task description<\/span><\/span><time class="task-date" datetime="2026-11-21">.*?<\/time><\/a>/,
        );
        expect(page).toContain('class="editable-row task-card has-notes"');
      } else {
        expect(page).not.toContain("today-tasks");
        expect(page).not.toContain("A task description");
        expect(page).not.toContain("has-notes");
      }
    },
  );

  it("leaves inbox dates blank and preserves invalid form values", () => {
    const options = readOptions({ view: "dashboard" });
    expect(TaskForm({ options }).value).toContain('name="date" value=""');
    const form = TaskForm({
      options,
      values: { title: "Keep me", date: "2026-11-21" },
      error: "Invalid",
    }).value;
    expect(form).toContain('value="Keep me"');
    expect(form).toContain('value="2026-11-21"');
    expect(form).toContain('role="alert"');
  });
});

describe.skipIf(!process.env.TEST_DATABASE_URL)(
  "tasks PostgreSQL integration",
  () => {
    it(
      "persists inbox tasks, schedules, completes idempotently, reopens, and deletes",
      () =>
        Effect.runPromise(
          Effect.gen(function* () {
            const tasks = yield* Tasks;
            const sql = yield* SqlClient.SqlClient;
            const ids: string[] = [];
            yield* Effect.addFinalizer(() =>
              ids.length
                ? sql`DELETE FROM tasks WHERE id IN ${sql.in(ids)}`.pipe(
                    Effect.orDie,
                  )
                : Effect.void,
            );
            const task = yield* tasks.create({
              payload: { title: "Inbox", date: null, notes: "" },
            });
            ids.push(task.id);
            expect(task.completed).toBe(false);
            expect(task.date).toBeNull();
            expect(yield* tasks.get({ id: task.id })).toEqual(task);
            expect(
              (yield* tasks.list({})).find((row) => row.id === task.id),
            ).toEqual(task);
            for (const completed of [true, true, false]) {
              expect(
                yield* tasks.setCompletion({
                  id: task.id,
                  payload: { completed },
                }),
              ).toMatchObject({ completed, date: dateKey(new Date()) });
            }
            const payload = {
              title: "Scheduled",
              date: "2026-11-21",
              notes: "Do this",
            };
            expect((yield* tasks.update({ id: task.id, payload }))?.date).toBe(
              "2026-11-21",
            );
            for (let i = 0; i < 2; i++) {
              expect(
                yield* tasks.setCompletion({
                  id: task.id,
                  payload: { completed: true },
                }),
              ).toMatchObject({ completed: true, date: payload.date });
            }
            expect(
              yield* tasks.update({
                id: task.id,
                payload: { ...payload, date: null },
              }),
            ).toMatchObject({ completed: true, date: payload.date });
            expect(
              (yield* tasks.setCompletion({
                id: task.id,
                payload: { completed: false },
              }))?.completed,
            ).toBe(false);
            expect(
              yield* tasks.update({ id: "missing-task", payload }),
            ).toBeUndefined();
            expect(
              yield* tasks.setCompletion({
                id: "missing-task",
                payload: { completed: true },
              }),
            ).toBeUndefined();
            expect(yield* tasks.remove({ id: task.id })).toBe(true);
            expect(yield* tasks.remove({ id: task.id })).toBe(false);
            expect(yield* tasks.get({ id: task.id })).toBeUndefined();
          }).pipe(
            Effect.scoped,
            Effect.provide(
              Tasks.baseLayer.pipe(Layer.provideMerge(DatabaseTest)),
            ),
          ),
        ),
      15000,
    );
  },
);
