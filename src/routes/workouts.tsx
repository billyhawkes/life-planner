import type { Html } from "@/lib/datastar";
import type {
  WorkoutOverview,
  WorkoutPage,
  WorkoutSchedule,
} from "@/services/workouts/schema";
import { WorkoutCalendar } from "@/services/workouts/components/calendar";
import { Link } from "@/services/workouts/components/links";
import { WorkoutTable } from "@/services/workouts/components/table";
import { TrainingChart } from "@/services/workouts/components/training-chart";
import {
  formatNumber,
  formatPace,
  viewUrl,
  type ViewOptions,
} from "@/services/workouts/helpers";

export type DashboardData =
  | { readonly view: "overview"; readonly overview: WorkoutOverview }
  | { readonly view: "calendar"; readonly schedule: WorkoutSchedule }
  | { readonly view: "week"; readonly schedule: WorkoutSchedule }
  | { readonly view: "table"; readonly page: WorkoutPage };

export const renderDashboard = (
  data: DashboardData,
  options: ViewOptions,
  form: Html = <section id="workout-form" />,
) => {
  const newUrl = `${viewUrl(options)}&new=true`;
  return (
    <main id="dashboard">
      <header class="page-heading">
        <div>
          <p class="eyebrow">Training Ledger</p>
          <h1>Workouts</h1>
          <p>Stored privately in your PostgreSQL database</p>
        </div>
        <a
          id="add-workout"
          class="button"
          href={newUrl}
          data-on:click__prevent={`@get('${newUrl}')`}
        >
          + Add workout
        </a>
      </header>
      <nav class="tabs" aria-label="Workout views">
        {[
          ["overview", "Overview"],
          ["week", "Week log"],
          ["table", "Log"],
          ["calendar", "Calendar"],
        ].map(([view, label]) => (
          <Link
            label={label}
            url={viewUrl(options, { view, page: 1 })}
            active={data.view === view}
          />
        ))}
      </nav>
      {form}
      {data.view === "overview" ? (
        <>
          <section class="stats" aria-label="Current training overview">
            <article class="card">
              <h2>Workouts this week</h2>
              <strong>{data.overview.completedCount}</strong>
              <p>completed sessions</p>
            </article>
            <article class="card">
              <h2>Distance this week</h2>
              <strong>
                {formatNumber(data.overview.distanceKilometres)} km
              </strong>
              <p>Running and cycling</p>
            </article>
            <article class="card">
              <h2>Current running pace</h2>
              <strong>
                {data.overview.currentPace === undefined
                  ? "—"
                  : formatPace(data.overview.currentPace)}
              </strong>
              <p>minutes per kilometre</p>
            </article>
          </section>
          <TrainingChart workouts={data.overview.trends} options={options} />
        </>
      ) : data.view === "calendar" ? (
        <WorkoutCalendar days={data.schedule.days} options={options} />
      ) : (
        <section class="card">
          <form class="toolbar" method="get" action="/workouts">
            <input type="hidden" name="view" value={data.view} />
            <input type="hidden" name="sort" value={options.sort} />
            <label>
              Search workouts
              <input
                type="search"
                name="search"
                value={options.search}
                placeholder="Activity, status, notes…"
              />
            </label>
            <button type="submit">Search</button>
            <a
              href={viewUrl(options).replace("/workouts?", "/workouts/export?")}
            >
              Export CSV
            </a>
            <span>
              {data.view === "week" ? data.schedule.total : data.page.total}{" "}
              workouts
            </span>
          </form>
          {data.view === "week" ? (
            data.schedule.days.map(({ date, workouts }) => (
              <>
                <h3>
                  {date.toLocaleDateString("en", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </h3>
                <WorkoutTable workouts={workouts} options={options} />
              </>
            ))
          ) : (
            <WorkoutTable workouts={data.page.workouts} options={options} />
          )}
          {data.view === "table" ? (
            <footer>
              {data.page.page > 1 ? (
                <Link
                  label="← Previous"
                  url={viewUrl(options, { page: data.page.page - 1 })}
                />
              ) : null}
              <span>
                Page {data.page.page} of {data.page.pages}
              </span>
              {data.page.page < data.page.pages ? (
                <Link
                  label="Next →"
                  url={viewUrl(options, { page: data.page.page + 1 })}
                />
              ) : null}
            </footer>
          ) : null}
        </section>
      )}
    </main>
  );
};
