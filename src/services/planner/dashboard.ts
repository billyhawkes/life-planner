import { Effect } from "effect";
import { Workouts } from "@/services/workouts";
import { Habits } from "@/services/habits";
import { Tasks } from "@/services/tasks";
import { Goals } from "@/services/goals";
import type { Goal } from "@/services/goals/schema";
import type { Task } from "@/services/tasks/schema";
import { dateKey, type ViewOptions } from "@/services/workouts/helpers";
import type { HabitOccurrence } from "@/services/habits/schema";
import type { WorkoutDay, WorkoutOverview } from "@/services/workouts/schema";
import { Timeline } from "@/services/timeline";
import type { TimeLabel, TimeBlock } from "@/services/timeline/schema";

export type PlannerDay = WorkoutDay & {
  readonly habits: ReadonlyArray<HabitOccurrence>;
  readonly tasks: ReadonlyArray<Task>;
};
type TimelineData = {
  readonly labels: readonly TimeLabel[];
  readonly blocks: readonly TimeBlock[];
};
export type DashboardData =
  | { readonly view: "menu"; readonly timeline?: undefined }
  | {
      readonly view: "dashboard";
      readonly tasks: ReadonlyArray<Task>;
      readonly goals: ReadonlyArray<Goal>;
      readonly timeline?: TimelineData;
    }
  | {
      readonly view: "stats";
      readonly overview: WorkoutOverview;
      readonly timeline?: TimelineData;
    }
  | {
      readonly view: "today" | "week" | "calendar";
      readonly days: ReadonlyArray<PlannerDay>;
      readonly timeline?: TimelineData;
    };

export const loadDashboard = Effect.fn("Planner.loadDashboard")(function* (
  options: ViewOptions,
) {
  if (options.view === "menu") {
    const data: DashboardData = { view: "menu" };
    return data;
  }
  const tasks = yield* Tasks;
  const allTasks = options.view === "stats" ? [] : yield* tasks.list({});
  if (options.view === "dashboard") {
    const tracker = yield* Timeline;
    const goals = yield* Goals;
    const search = options.search.trim().toLowerCase();
    const data: DashboardData = {
      view: "dashboard",
      goals: yield* goals.list({}),
      timeline: {
        labels: yield* tracker.listLabels({}),
        blocks: yield* tracker.listBlocks({}),
      },
      tasks: allTasks.filter((task) =>
        `${task.title} ${task.notes}`.toLowerCase().includes(search),
      ),
    };
    return data;
  }
  const workouts = yield* Workouts;
  const tracker = yield* Timeline;
  const timeline =
    options.view === "calendar"
      ? undefined
      : {
          labels: yield* tracker.listLabels({}),
          blocks: yield* tracker.listBlocks({}),
        };
  if (options.view === "stats") {
    const data: DashboardData = {
      view: "stats",
      timeline,
      overview: yield* workouts.overview({
        activityType: options.activity === "cycling" ? "Cycling" : "Running",
        after:
          options.range === "all"
            ? undefined
            : new Date(
                Date.now() - Number(options.range) * 86400000,
              ).toISOString(),
      }),
    };
    return data;
  }
  const habits = yield* Habits;
  const schedule = yield* workouts.schedule({
    month: options.view === "calendar" ? options.month : undefined,
    week: options.view === "week" ? options.week : undefined,
    search: options.search,
    sort: options.sort,
  });
  const today = dateKey(new Date());
  const days =
    options.view === "today"
      ? schedule.days.filter((day) => dateKey(day.date) === today)
      : schedule.days;
  const first = days[0];
  const last = days.at(-1);
  if (!first || !last) {
    const data: DashboardData = { view: options.view, days: [], timeline };
    return data;
  }
  const end = new Date(last.date);
  end.setDate(end.getDate() + 1);
  const occurrences = yield* habits.schedule({
    after: dateKey(first.date),
    before: dateKey(end),
  });
  const search = options.search.trim().toLowerCase();
  const data: DashboardData = {
    view: options.view,
    timeline,
    days: days.map((day) => ({
      ...day,
      tasks: allTasks.filter(
        (task) =>
          task.date === dateKey(day.date) &&
          `${task.title} ${task.notes}`.toLowerCase().includes(search),
      ),
      habits: occurrences.filter(
        (occurrence) =>
          occurrence.date === dateKey(day.date) &&
          `${occurrence.habit.name} ${occurrence.habit.notes} ${occurrence.completed ? "completed" : "planned"}`
            .toLowerCase()
            .includes(search),
      ),
    })),
  };
  return data;
});
