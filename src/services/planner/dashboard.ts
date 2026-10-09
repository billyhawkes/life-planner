import { Effect } from "effect";
import { Workouts } from "@/services/workouts";
import { Habits } from "@/services/habits";
import { dateKey, type ViewOptions } from "@/services/workouts/helpers";
import type { HabitOccurrence } from "@/services/habits/schema";
import type { WorkoutDay, WorkoutOverview } from "@/services/workouts/schema";
import { Timeline } from "@/services/timeline";
import type { TimeLabel, TimeBlock } from "@/services/timeline/schema";

export type PlannerDay = WorkoutDay & {
  readonly habits: ReadonlyArray<HabitOccurrence>;
};
type TimelineData = {
  readonly labels: readonly TimeLabel[];
  readonly blocks: readonly TimeBlock[];
};
export type DashboardData =
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
      }),
    };
    return data;
  }
  const habits = yield* Habits;
  const schedule = yield* workouts.schedule({
    month: options.view === "calendar" ? options.month : undefined,
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
