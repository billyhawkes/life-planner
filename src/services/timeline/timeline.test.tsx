import { describe, expect, it } from "bun:test";
import { Effect, Layer } from "effect";
import { SqlClient } from "effect/sql";
import { DatabaseTest } from "@/db";
import { renderTimeline } from "@/routes/timeline";
import { renderDashboard } from "@/routes/workouts";
import { readOptions } from "@/services/workouts/helpers";
import { Timeline } from "./index";
import {
  blockMinutes,
  dayRange,
  weekDays,
  weeklyMinutes,
  timelineWindow,
  blockDateTime,
  maximumWarning,
} from "./helpers";
import { DayTimeline } from "./components/day";
import { BlockForm } from "./components/block-form";
import { TrackingControls } from "./components/tracking";
import type { PlannerDay } from "@/services/planner/dashboard";
import { CreateMenu } from "@/routes/components/create-menu";
import { dateKey } from "@/services/workouts/helpers";
import { decodeBlockForm, decodeLabelForm } from "./schema";

describe("timeline presentation and validation", () => {
  it("warns at daily and weekly maximums, but not minimums or unset targets", () => {
    const now = new Date("2026-01-08T12:00:00").getTime();
    const label = {
      id: "work",
      name: "Work",
      goalType: "maximum" as const,
      goalMinutes: 60,
      weeklyGoalMinutes: 120,
      color: "#15803d",
    };
    const blocks = [
      {
        id: "today",
        labelId: "work",
        startTime: new Date("2026-01-08T11:00:00").toISOString(),
        endTime: null,
        notes: "",
      },
    ];
    expect(maximumWarning(label, blocks, now)).toContain("daily maximum");
    expect(maximumWarning(label, blocks, now - 1)).toBeUndefined();
    const previous = {
      ...blocks[0]!,
      id: "previous",
      startTime: new Date("2026-01-07T11:00:00").toISOString(),
      endTime: new Date("2026-01-07T12:00:00").toISOString(),
    };
    expect(maximumWarning(label, [...blocks, previous], now)).toContain(
      "daily and weekly maximum",
    );
    expect(
      maximumWarning({ ...label, goalMinutes: 0 }, [...blocks, previous], now),
    ).toContain("weekly maximum");
    expect(
      maximumWarning(
        { ...label, goalType: "minimum" },
        [...blocks, previous],
        now,
      ),
    ).toBeUndefined();
    expect(
      maximumWarning(
        { ...label, goalMinutes: 0, weeklyGoalMinutes: 0 },
        blocks,
        now,
      ),
    ).toBeUndefined();
    expect(
      maximumWarning(label, [{ ...previous, labelId: "hobby" }], now),
    ).toBeUndefined();
  });
  it("renders an explicit start-anyway confirmation for maximum warnings", () => {
    const html = TrackingControls({
      labels: [],
      blocks: [],
      day: "2026-01-08",
      error: "Work has reached its daily maximum.",
      values: { operation: "start", confirmStart: "true", labelId: "work" },
    }).value;
    expect(html).toContain('role="alert"');
    expect(html).toContain(
      '<dialog id="maximum-warning-dialog" class="form-dialog" open',
    );
    expect(html).toContain('role="alertdialog"');
    expect(html).toContain('aria-labelledby="maximum-warning-title"');
    expect(html).toContain('aria-describedby="maximum-warning-message"');
    expect(html).toContain('data-dialog-close=""');
    expect(html).toContain('action="/timeline/start"');
    expect(html).toContain('name="confirmMaximum" value="true"');
    expect(html).toContain('name="labelId" value="work"');
    expect(html).toContain("Start anyway");
    expect(html).toContain("Cancel");
  });
  it("validates minimum and maximum goal types", async () => {
    for (const goalType of ["minimum", "maximum"] as const) {
      const payload = await Effect.runPromise(
        decodeLabelForm({
          name: "Goal",
          goalType,
          goalMinutes: "60",
          color: "#15803d",
        }),
      );
      expect(payload.goalType).toBe(goalType);
    }
    const result = await Effect.runPromise(
      decodeLabelForm({
        name: "Goal",
        goalType: "other",
        goalMinutes: "60",
        color: "#15803d",
      }).pipe(Effect.result),
    );
    expect(result._tag).toBe("Failure");
  });
  it("prefills clicked hours on both dialog and native page opens", () => {
    for (const operation of [undefined, "block"]) {
      const dialog = BlockForm({
        labels: [],
        blocks: [],
        values: {
          day: "2099-01-01",
          startTime: "2099-01-01T23:00",
          ...(operation ? { operation } : {}),
        },
      }).value;
      expect(dialog).toContain(
        'name="startTime" step="any" value="2099-01-01T23:00"',
      );
      expect(dialog).toContain(
        'name="endTime" step="any" value="2099-01-02T00:00:00.000"',
      );
    }
  });

  it("preserves submitted values after a block validation error", () => {
    const dialog = BlockForm({
      labels: [],
      blocks: [],
      values: {
        day: "2026-01-01",
        operation: "block",
        startTime: "2026-01-01T09:15",
        endTime: "2026-01-01T09:10",
        notes: "Keep these notes",
      },
      error: "End must be after start.",
    }).value;
    expect(dialog).toContain('value="2026-01-01T09:15"');
    expect(dialog).toContain('value="2026-01-01T09:10"');
    expect(dialog).toContain("Keep these notes");
  });
  it("shows rejected UTC drag values as editable local datetimes", () => {
    const startTime = "2026-01-01T14:00:00.000Z";
    const endTime = "2026-01-01T15:00:00.000Z";
    const dialog = BlockForm({
      labels: [],
      blocks: [],
      error: "This block overlaps another block.",
      values: { day: "2026-01-01", operation: "block", startTime, endTime },
    }).value;
    expect(dialog).toContain(`value="${blockDateTime(startTime)}"`);
    expect(dialog).toContain(`value="${blockDateTime(endTime)}"`);
    expect(dialog).not.toContain(`value="${startTime}"`);
  });
  it("keeps start and stop controls in the Time dialog instead of the plus menu", () => {
    const labels = [
      {
        id: "work",
        name: "Work",
        goalType: "maximum" as const,
        goalMinutes: 0,
        weeklyGoalMinutes: 2400,
        color: "#15803d",
      },
    ];
    const day = dateKey(new Date());
    const blocks = [
      {
        id: "running",
        labelId: "work",
        startTime: new Date(Date.now() - 60000).toISOString(),
        endTime: null,
        notes: "",
      },
    ];
    const menu = CreateMenu({
      options: readOptions({ view: "week" }),
      date: day,
    }).value;
    expect(menu).not.toContain('aria-label="Timer controls"');
    expect(menu).toContain("Time</a>");
    const dialog = BlockForm({
      labels,
      blocks,
      options: readOptions({ view: "week" }),
      values: { day, planner: "true" },
    }).value;
    expect(dialog).toContain('class="day-timer-controls time-dialog-timer"');
    expect(dialog).not.toContain('action="/timeline/start"');
    expect(dialog).not.toContain('class="timeline-play"');
    expect(dialog).toContain('aria-label="Elapsed time"');
    expect(dialog).toContain('<span class="sr-only">Label</span>');
    expect(dialog).toContain('action="/timeline/blocks/running/stop"');
    const idleDialog = BlockForm({
      labels,
      blocks: [],
      values: { day },
    }).value;
    expect(idleDialog).toContain('action="/timeline/start"');
    expect(idleDialog).toContain('class="timeline-play"');
    expect(idleDialog).not.toContain('aria-label="Stop timer"');

    const editDialog = BlockForm({
      labels,
      blocks,
      options: readOptions({ view: "week" }),
      values: { day, planner: "true", edit: "running" },
    }).value;
    expect(editDialog).toContain('id="time-block-edit"');
    expect(editDialog).toContain(
      '<footer class="time-block-actions"><button type="submit" form="time-block-edit">Save changes</button><form',
    );
    expect(editDialog).toContain('action="/timeline/blocks/running/delete"');
    expect(dialog.indexOf('<dialog id="time-block-dialog"')).toBeLessThan(
      dialog.indexOf('aria-label="Timer controls"'),
    );
    const grid = DayTimeline({
      labels,
      blocks,
      day,
      options: readOptions({ view: "today" }),
    }).value;
    expect(grid).not.toContain('aria-label="Time tracker"');
  });
  it("uses icon-only habits in the week while keeping names in Today", () => {
    const day: PlannerDay = {
      date: new Date("2026-01-01T00:00:00"),
      workouts: [],
      habits: [
        {
          date: "2026-01-01",
          completed: false,
          habit: {
            id: "guitar",
            name: "Guitar practice",
            icon: "music",
            startDate: "2026-01-01",
            notes: "",
          },
        },
      ],
    };
    const week = renderDashboard(
      { view: "week", days: [day] },
      readOptions({ view: "week" }),
    ).value;
    expect(week).toContain('class="habit-control compact ');
    expect(week).toContain(
      'aria-label="Complete: Guitar practice on 2026-01-01"',
    );
    expect(week).toContain('title="Guitar practice — Complete.');
    const today = renderDashboard(
      { view: "today", days: [day] },
      readOptions({ view: "today" }),
    ).value;
    expect(today).not.toContain('class="habit-control compact ');
    expect(today).toContain('<span class="habit-name">Guitar practice</span>');
  });
  it("renders goals using the Stats card layout with weekly time as the headline", () => {
    const html = TrackingControls({
      labels: [
        {
          id: "work",
          name: "Work",
          goalType: "maximum",
          goalMinutes: 60,
          weeklyGoalMinutes: 2400,
          color: "#15803d",
        },
      ],
      blocks: [
        {
          id: "session",
          labelId: "work",
          startTime: new Date("2026-01-01T09:00").toISOString(),
          endTime: new Date("2026-01-01T11:00").toISOString(),
          notes: "",
        },
      ],
      day: "2026-01-01",
      options: readOptions({ view: "week" }),
    }).value;
    expect(html).toContain('class="stats tracking-goal-list"');
    expect(html).toContain(
      '<article class="card timeline-goal is-over-maximum">',
    );
    expect(html).toContain("<strong>2h 0m</strong>");
    expect(html).toContain("of 40h 0m weekly maximum");
    expect(html).toContain("Daily: 2h 0m / 1h 0m");
    expect(html).toContain("5%</span>");
    expect(html).toContain("200%</span>");
    expect(html).toContain("1h 0m over maximum");
    expect(html).toContain("/timeline/goals/new?view=week");
  });
  it("uses shared daytime hours without hiding early or overnight entries", () => {
    expect(timelineWindow([], ["2026-01-01"])).toEqual({
      startHour: 6,
      endHour: 22,
    });
    const block = {
      id: "early",
      labelId: "work",
      startTime: new Date("2026-01-01T03:30").toISOString(),
      endTime: new Date("2026-01-01T23:30").toISOString(),
      notes: "Focus",
    };
    expect(timelineWindow([block], ["2026-01-01", "2026-01-02"])).toEqual({
      startHour: 3,
      endHour: 24,
    });
    expect(timelineWindow([block], ["2026-01-02"])).toEqual({
      startHour: 6,
      endHour: 22,
    });
  });
  it("shows uncapped percentages and only marks maximums red when exceeded", () => {
    for (const goalType of ["minimum", "maximum"] as const) {
      for (const minutes of [30, 60, 90]) {
        const html = TrackingControls({
          labels: [
            {
              id: "goal",
              name: "Goal",
              goalType,
              goalMinutes: 60,
              weeklyGoalMinutes: 0,
              color: "#15803d",
            },
          ],
          blocks: [
            {
              id: "session",
              labelId: "goal",
              startTime: new Date("2026-01-01T09:00").toISOString(),
              endTime: new Date(
                new Date("2026-01-01T09:00").getTime() + minutes * 60000,
              ).toISOString(),
              notes: "",
            },
          ],
          day: "2026-01-01",
        }).value;
        expect(html).toContain(`${(minutes / 60) * 100}%</span>`);
        expect(html.includes("is-over-maximum")).toBe(
          goalType === "maximum" && minutes > 60,
        );
        if (goalType === "maximum" && minutes > 60)
          expect(html).toContain("0h 30m over maximum");
        if (goalType === "maximum" && minutes === 60)
          expect(html).toContain("Maximum reached");
        if (goalType === "minimum" && minutes >= 60)
          expect(html).toContain("Minimum met");
      }
    }
    const noTarget = TrackingControls({
      labels: [
        {
          id: "goal",
          name: "Goal",
          goalType: "maximum",
          goalMinutes: 0,
          weeklyGoalMinutes: 0,
          color: "#15803d",
        },
      ],
      blocks: [],
      day: "2026-01-01",
    }).value;
    expect(noTarget).not.toContain("timeline-goal-percentage");
    expect(noTarget).not.toContain("is-over-maximum");
    expect(noTarget).toContain("tracked today");
  });
  it("opens editors from blocks and empty slots rather than duplicating entry lists", () => {
    const labels = [
      {
        id: "work",
        name: "Work",
        goalType: "maximum" as const,
        goalMinutes: 0,
        weeklyGoalMinutes: 2400,
        color: "#15803d",
      },
    ];
    const blocks = [
      {
        id: "focus",
        labelId: "work",
        startTime: new Date("2026-01-01T09:00").toISOString(),
        endTime: new Date("2026-01-01T10:00").toISOString(),
        notes: "Deep work",
      },
    ];
    const html = DayTimeline({
      labels,
      blocks,
      day: "2026-01-01",
      options: readOptions({ view: "week" }),
    }).value;
    expect(html).toContain("edit=focus");
    expect(html).toContain("startTime=2026-01-01T09:00");
    expect(html).toContain("Deep work</strong>");
    expect(html).toContain('data-block-id="focus"');
    expect(html).toContain('data-resize="start"');
    expect(html).toContain('data-resize="end"');
    expect(html).toContain('class="timeline-update-form" hidden');
    expect(html).not.toContain("timeline-entries");
    const form = BlockForm({
      labels,
      blocks,
      options: readOptions({ view: "week" }),
      values: { edit: "focus", day: "2026-01-01", planner: "true" },
    }).value;
    expect(form).toContain('<dialog id="time-block-dialog"');
    expect(form).toContain('name="planner" value="true"');
    expect(form).toContain('action="/timeline/blocks/focus"');
    expect(form).toContain("Delete block");
  });
  it("validates label goals and block intervals", async () => {
    expect(
      await Effect.runPromise(
        decodeLabelForm({
          name: " Guitar ",
          goalMinutes: "30",
          color: "#15803d",
        }),
      ),
    ).toEqual({
      name: "Guitar",
      goalType: "minimum",
      goalMinutes: 30,
      weeklyGoalMinutes: 0,
      color: "#15803d",
    });
    for (const goalMinutes of ["-1", "1441", "1.5", "bad"])
      expect(
        (
          await Effect.runPromise(
            decodeLabelForm({
              name: "Work",
              goalMinutes,
              color: "#15803d",
            }).pipe(Effect.result),
          )
        )._tag,
      ).toBe("Failure");
    for (const [startTime, endTime] of [
      ["2026-02-30T09:00", "2026-03-01T10:00"],
      ["2026-01-01T10:00", "2026-01-01T09:00"],
      ["1", "2"],
    ])
      expect(
        (
          await Effect.runPromise(
            decodeBlockForm({ labelId: "work", startTime, endTime }).pipe(
              Effect.result,
            ),
          )
        )._tag,
      ).toBe("Failure");
  });
  it("clips overnight blocks and running timers to the selected day", () => {
    const block = {
      id: "one",
      labelId: "work",
      startTime: new Date("2026-01-01T23:00").toISOString(),
      endTime: new Date("2026-01-02T01:00").toISOString(),
      notes: "",
    };
    expect(blockMinutes(block, "2026-01-01")).toBe(60);
    expect(blockMinutes(block, "2026-01-02")).toBe(60);
    expect(blockMinutes(block, "2026-01-03")).toBe(0);
    expect(
      blockMinutes(
        { ...block, endTime: null },
        "2026-01-02",
        new Date("2026-01-02T02:00").getTime(),
      ),
    ).toBe(120);
    expect(dayRange("2026-01-01").end).toBe(dayRange("2026-01-02").start);
  });
  it("validates weekly targets and clips totals at Monday week boundaries", async () => {
    const work = await Effect.runPromise(
      decodeLabelForm({
        name: "Work",
        goalMinutes: "0",
        weeklyGoalMinutes: "2400",
        color: "#15803d",
      }),
    );
    expect(work.weeklyGoalMinutes).toBe(2400);
    for (const weeklyGoalMinutes of ["-1", "10081", "1.5", "bad"]) {
      expect(
        (
          await Effect.runPromise(
            decodeLabelForm({
              name: "Work",
              goalMinutes: "0",
              weeklyGoalMinutes,
              color: "#15803d",
            }).pipe(Effect.result),
          )
        )._tag,
      ).toBe("Failure");
    }
    expect(weekDays("2026-01-04")).toEqual([
      "2025-12-29",
      "2025-12-30",
      "2025-12-31",
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
      "2026-01-04",
    ]);
    const crossing = {
      id: "crossing",
      labelId: "work",
      startTime: new Date("2026-01-04T23:00").toISOString(),
      endTime: new Date("2026-01-05T01:00").toISOString(),
      notes: "",
    };
    expect(weeklyMinutes([crossing], "2026-01-04")).toBe(60);
    expect(weeklyMinutes([crossing], "2026-01-05")).toBe(60);
    expect(
      weeklyMinutes(
        [{ ...crossing, endTime: null }],
        "2026-01-05",
        new Date("2026-01-05T02:00").getTime(),
      ),
    ).toBe(120);
  });
  it("embeds aligned day timelines in Today and This Week with planner form context", () => {
    const labels = [
      {
        id: "work",
        name: "Work",
        goalType: "maximum" as const,
        goalMinutes: 0,
        weeklyGoalMinutes: 2400,
        color: "#15803d",
      },
    ];
    const blocks = [
      {
        id: "overnight",
        labelId: "work",
        startTime: new Date("2026-01-01T23:00").toISOString(),
        endTime: new Date("2026-01-02T01:00").toISOString(),
        notes: "",
      },
    ];
    const days = weekDays("2026-01-01").map((day) => ({
      date: new Date(`${day}T00:00:00`),
      workouts: [],
      habits: [],
    }));
    const html = renderDashboard(
      { view: "week", days, timeline: { labels, blocks } },
      readOptions({ view: "week" }),
    ).value;
    expect(html).toContain('class="daily-plans week-timelines"');
    expect(html.match(/aria-label="Daily time grid"/g)).toHaveLength(7);
    expect(html).not.toContain("week-timer-toolbar");
    expect(html).not.toContain('class="day-timer-controls"');
    expect(html).toContain('id="add-time-2026-01-01"');
    expect(html).toContain("Time</a>");
    expect(html).not.toContain("+ Time");
    expect(html.match(/has-hour-labels/g)).toHaveLength(1);
    expect(html).toContain("planner=true");
    expect(html).toContain("/timeline/blocks/new?view=week");
    expect(html).not.toContain('href="/timeline"');
    expect(html).toContain('id="block-2026-01-01-overnight"');
    expect(html).toContain('id="block-2026-01-02-overnight"');
    expect(html.indexOf('class="day-cards"')).toBeLessThan(
      html.indexOf('class="day-timeline '),
    );
    const today = renderDashboard(
      { view: "today", days: [days[3]], timeline: { labels, blocks } },
      readOptions({ view: "today" }),
    ).value;
    expect(today.match(/aria-label="Daily time grid"/g)).toHaveLength(1);
    expect(today).toContain('class="daily-plans today-timeline"');
  });
  it("renders escaped timeline labels without goal cards on the standalone page", () => {
    const html = renderTimeline({
      labels: [
        {
          id: "work",
          name: "<Work>",
          goalType: "maximum",
          goalMinutes: 480,
          weeklyGoalMinutes: 2400,
          color: "#15803d",
        },
      ],
      blocks: [
        {
          id: "work-block",
          labelId: "work",
          startTime: new Date("2026-01-01T09:00").toISOString(),
          endTime: new Date("2026-01-01T10:00").toISOString(),
          notes: "",
        },
      ],
      day: "2026-01-01",
    }).value;
    expect(html).toContain("&lt;Work&gt;");
    expect(html).not.toContain('class="stats tracking-goal-list"');
    expect(html).toContain('aria-label="Daily time grid"');
    expect(html).toContain("data-on:click__prevent");
  });
});

describe.skipIf(!process.env.TEST_DATABASE_URL)(
  "timeline PostgreSQL integration",
  () => {
    it(
      "persists edits, rejects overlaps, switches timers, and stops idempotently",
      () =>
        Effect.runPromise(
          Effect.gen(function* () {
            const timeline = yield* Timeline;
            const sql = yield* SqlClient.SqlClient;
            const name = `timeline-test-${crypto.randomUUID()}`;
            yield* Effect.addFinalizer(() =>
              Effect.gen(function* () {
                yield* sql`DELETE FROM time_blocks WHERE label_id IN (SELECT id FROM time_labels WHERE name = ${name})`;
                yield* sql`DELETE FROM time_labels WHERE name = ${name}`;
              }).pipe(Effect.orDie),
            );
            yield* timeline.saveLabel({
              payload: {
                name,
                goalMinutes: 30,
                weeklyGoalMinutes: 0,
                color: "#15803d",
              },
            });
            const label = (yield* timeline.listLabels({})).find(
              (row) => row.name === name,
            )!;
            const localPayload = {
              labelId: label.id,
              startTime: "2019-01-02T09:00:00",
              endTime: "2019-01-02T10:00:00",
              notes: "Local time round trip",
            };
            yield* sql.withTransaction(
              Effect.gen(function* () {
                yield* sql`SET LOCAL TIME ZONE 'Pacific/Honolulu'`;
                yield* timeline.saveBlock({ payload: localPayload });
              }),
            );
            const localBlock = (yield* timeline.listBlocks({})).find(
              (row) => row.labelId === label.id,
            )!;
            expect(localBlock.startTime).toBe(
              new Date(localPayload.startTime).toISOString(),
            );
            expect(localBlock.endTime).toBe(
              new Date(localPayload.endTime).toISOString(),
            );

            yield* sql.withTransaction(
              Effect.gen(function* () {
                yield* sql`SET LOCAL TIME ZONE 'Pacific/Honolulu'`;
                yield* timeline.saveBlock({
                  id: localBlock.id,
                  payload: {
                    ...localPayload,
                    startTime: "2019-02-02T09:00:00-05:00",
                    endTime: "2019-02-02T10:00:00-05:00",
                  },
                });
              }),
            );
            const editedLocalBlock = (yield* timeline.listBlocks({})).find(
              (row) => row.id === localBlock.id,
            )!;
            expect(editedLocalBlock.startTime).toBe("2019-02-02T14:00:00.000Z");
            expect(editedLocalBlock.endTime).toBe("2019-02-02T15:00:00.000Z");
            yield* timeline.saveBlock({
              id: localBlock.id,
              payload: {
                ...localPayload,
                startTime: "2099-01-01T09:00:00Z",
                endTime: "2099-01-01T10:30:00Z",
              },
            });
            const futureBlock = (yield* timeline.listBlocks({})).find(
              (row) => row.id === localBlock.id,
            )!;
            expect(futureBlock.startTime).toBe("2099-01-01T09:00:00.000Z");
            expect(futureBlock.endTime).toBe("2099-01-01T10:30:00.000Z");
            expect(
              (yield* timeline
                .saveBlock({
                  payload: {
                    ...localPayload,
                    startTime: "2099-01-01T10:00:00Z",
                    endTime: "2099-01-01T11:00:00Z",
                  },
                })
                .pipe(Effect.result))._tag,
            ).toBe("Failure");
            yield* timeline.removeBlock({ id: localBlock.id });
            const payload = {
              labelId: label.id,
              startTime: "2020-01-01T09:00:00Z",
              endTime: "2020-01-01T10:00:00Z",
              notes: "Practice",
            };
            yield* timeline.saveBlock({ payload });
            const block = (yield* timeline.listBlocks({})).find(
              (row) => row.labelId === label.id,
            )!;
            expect(block.notes).toBe("Practice");
            expect(
              (yield* timeline.saveBlock({ payload }).pipe(Effect.result))._tag,
            ).toBe("Failure");
            yield* timeline.saveBlock({
              id: block.id,
              payload: { ...payload, endTime: "2020-01-01T11:00:00Z" },
            });
            yield* timeline.saveLabel({
              id: label.id,
              payload: {
                name,
                goalMinutes: 60,
                weeklyGoalMinutes: 2400,
                color: "#123456",
              },
            });
            expect(
              (yield* timeline.listLabels({})).find(
                (row) => row.id === label.id,
              )?.goalMinutes,
            ).toBe(60);
            expect(
              (yield* timeline.listLabels({})).find(
                (row) => row.id === label.id,
              )?.weeklyGoalMinutes,
            ).toBe(2400);
            yield* timeline.start({ labelId: label.id });
            yield* Effect.sleep("10 millis");
            yield* timeline.start({ labelId: label.id });
            const blocks = yield* timeline.listBlocks({});
            expect(blocks.filter((row) => row.endTime === null)).toHaveLength(
              1,
            );
            const running = blocks.find((row) => row.endTime === null)!;
            yield* Effect.sleep("10 millis");
            yield* timeline.stop({ id: running.id });
            yield* timeline.stop({ id: running.id });
            expect(
              (yield* timeline.listBlocks({})).filter(
                (row) => row.endTime === null,
              ),
            ).toHaveLength(0);
            yield* timeline.saveLabel({
              id: label.id,
              payload: {
                name,
                goalType: "maximum",
                goalMinutes: 0,
                weeklyGoalMinutes: 1,
                color: "#123456",
              },
            });
            expect(
              (yield* timeline.listLabels({})).find(
                (row) => row.id === label.id,
              )?.goalType,
            ).toBe("maximum");
            const now = Date.now();
            // Keep this block in the current Monday–Sunday week even near midnight.
            const weekStart = dayRange(
              weekDays(dateKey(new Date(now)))[0]!,
            ).start;
            yield* timeline.saveBlock({
              payload: {
                labelId: label.id,
                startTime: new Date(weekStart).toISOString(),
                endTime: new Date(weekStart + 60000).toISOString(),
                notes: "Maximum reached",
              },
            });
            const rejected = yield* timeline
              .start({ labelId: label.id })
              .pipe(Effect.result);
            expect(rejected._tag).toBe("Failure");
            if (rejected._tag === "Failure")
              expect(rejected.failure.maximumReached).toBe(true);
            expect(
              (yield* timeline.listBlocks({})).filter(
                (row) => row.endTime === null,
              ),
            ).toHaveLength(0);
            yield* timeline.start({ labelId: label.id, confirmMaximum: true });
            const override = (yield* timeline.listBlocks({})).find(
              (row) => row.endTime === null,
            )!;
            yield* timeline.stop({ id: override.id });
            yield* timeline.removeBlock({ id: block.id });
            expect(
              (yield* timeline.listBlocks({})).some(
                (row) => row.id === block.id,
              ),
            ).toBe(false);
          }).pipe(
            Effect.scoped,
            Effect.provide(
              Timeline.baseLayer.pipe(Layer.provideMerge(DatabaseTest)),
            ),
          ),
        ),
      15000,
    );
  },
);
