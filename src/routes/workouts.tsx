import type { Html } from "@/lib/datastar";
import { ScheduleDays } from "./components/schedule";
import type { DashboardData } from "@/services/planner/dashboard";
import { PlannerCalendar } from "./components/calendar";
import { CreateMenu } from "./components/create-menu";
import { PlannerFeedback } from "./components/feedback";
import { Icon } from "./components/icon";
import { HabitCard } from "@/services/habits/components/card";
import { Link } from "@/services/workouts/components/links";
import { WorkoutCard } from "@/services/workouts/components/card";
import { TrainingChart } from "@/services/workouts/components/training-chart";
import {
  formatNumber,
  formatPace,
  dateKey,
  viewUrl,
  type ViewOptions,
} from "@/services/workouts/helpers";

const plannerViews: ReadonlyArray<readonly [ViewOptions["view"], string]> = [
  ["today", "Today"],
  ["week", "This Week"],
  ["calendar", "Calendar"],
  ["stats", "Stats"],
];

export const renderDashboard = (
  data: DashboardData,
  options: ViewOptions,
  form: Html = <section id="workout-form" />,
  habitForm: Html = <section id="habit-form" />,
) => {
  const compact = data.view === "calendar";
  const days =
    data.view === "stats"
      ? []
      : data.days.map(({ date, workouts, habits }) => {
          return {
            date,
            actions: <CreateMenu options={options} date={dateKey(date)} />,
            content: (
              <div class="day-cards">
                {workouts.map((workout) => (
                  <WorkoutCard
                    workout={workout}
                    options={options}
                    compact={compact}
                  />
                ))}
                {habits.map((occurrence) => (
                  <HabitCard
                    occurrence={occurrence}
                    options={options}
                    compact={compact}
                  />
                ))}
                {!compact && workouts.length === 0 && habits.length === 0 ? (
                  <p class="day-empty">
                    {options.search
                      ? "No matching workouts or habits."
                      : "Nothing planned for this day."}
                  </p>
                ) : null}
              </div>
            ),
          };
        });
  return (
    <main id="dashboard">
      <header class="planner-topbar">
        <nav class="tabs" aria-label="Planner views">
          {plannerViews.map(([view, label]) => (
            <Link
              label={label}
              url={viewUrl(options, { view, page: 1 })}
              active={data.view === view}
            />
          ))}
        </nav>
        {data.view !== "stats" ? (
          <form
            class="planner-search"
            role="search"
            method="get"
            action="/workouts"
          >
            {Object.entries(options)
              .filter(([key]) => key !== "search")
              .map(([key, value]) => (
                <input type="hidden" name={key} value={value} />
              ))}
            <input
              type="search"
              name="search"
              value={options.search}
              placeholder="Search plans…"
              aria-label="Search workouts and habits"
            />
            <button
              type="submit"
              class="search-button"
              aria-label="Search workouts and habits"
              title="Search"
            >
              <Icon name="search" />
            </button>
          </form>
        ) : null}
        <CreateMenu options={options} />
      </header>
      {form}
      {habitForm}
      <PlannerFeedback />
      {data.view === "stats" ? (
        <section class="stats-section" aria-labelledby="workout-overview-title">
          <h2 id="workout-overview-title">Workout overview</h2>
          <section class="stats" aria-label="Current training overview">
            <article class="card">
              <h3>Workouts this week</h3>
              <strong>{data.overview.completedCount}</strong>
              <p>completed sessions</p>
            </article>
            <article class="card">
              <h3>Distance this week</h3>
              <strong>
                {formatNumber(data.overview.distanceKilometres)} km
              </strong>
              <p>Running and cycling</p>
            </article>
            <article class="card">
              <h3>Current running pace</h3>
              <strong>
                {data.overview.currentPace === undefined
                  ? "—"
                  : formatPace(data.overview.currentPace)}
              </strong>
              <p>minutes per kilometre</p>
            </article>
          </section>
          <TrainingChart workouts={data.overview.trends} options={options} />
        </section>
      ) : data.view === "calendar" ? (
        <PlannerCalendar days={days} options={options} />
      ) : (
        <section class="daily-plans" aria-label="Daily plans">
          <ScheduleDays days={days} />
        </section>
      )}
    </main>
  );
};
