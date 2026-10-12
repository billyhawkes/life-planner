import type { Html } from "@/lib/datastar";
import { ScheduleDays } from "./components/schedule";
import type { DashboardData } from "@/services/planner/dashboard";
import { PlannerCalendar } from "./components/calendar";
import { CreateMenu } from "./components/create-menu";
import { PlannerFeedback } from "./components/feedback";
import { Icon, type IconName } from "./components/icon";
import { HabitCard } from "@/services/habits/components/card";
import { WorkoutCard } from "@/services/workouts/components/card";
import { TrainingChart } from "@/services/workouts/components/training-chart";
import {
  DayTimeline,
  TimeTrackedSummary,
} from "@/services/timeline/components/day";
import { TrackingControls } from "@/services/timeline/components/tracking";
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
  ["menu", "Menu"],
];

const viewIcons: Record<ViewOptions["view"], IconName> = {
  today: "sun",
  week: "week",
  calendar: "calendar",
  stats: "activity",
  menu: "menu",
};

export const renderDashboard = (
  data: DashboardData,
  options: ViewOptions,
  form: Html = <section id="workout-form" />,
  habitForm: Html = <section id="habit-form" />,
  trackingFeedback?: {
    readonly error?: string;
    readonly values?: Record<string, string>;
  },
) => {
  const compact = data.view === "calendar";
  const hours = { startHour: 0, endHour: 24 };
  const days =
    data.view === "stats" || data.view === "menu"
      ? []
      : data.days.map(({ date, workouts, habits }, index) => {
          const cards = (
            <div class="day-cards">
              {habits.length > 0 ? (
                <div class="habit-controls">
                  {habits.map((occurrence) => (
                    <HabitCard
                      occurrence={occurrence}
                      options={options}
                      compact={compact || data.view === "week"}
                    />
                  ))}
                </div>
              ) : null}
              {workouts.map((workout) => (
                <WorkoutCard
                  workout={workout}
                  options={options}
                  compact={compact}
                />
              ))}
              {!compact &&
              data.view !== "week" &&
              workouts.length === 0 &&
              habits.length === 0 ? (
                <p class="day-empty">
                  {options.search
                    ? "No matching workouts or habits."
                    : "Nothing planned for this day."}
                </p>
              ) : null}
            </div>
          );
          const timeline =
            data.timeline && !compact ? (
              <DayTimeline
                labels={data.timeline.labels}
                blocks={data.timeline.blocks}
                day={dateKey(date)}
                options={options}
                window={hours}
                showHours={data.view !== "week" || index === 0}
                showSummary={data.view !== "week"}
              />
            ) : null;
          return {
            date,
            actions: <CreateMenu options={options} date={dateKey(date)} />,
            pinnedContent:
              data.view === "week" ? (
                <>
                  {cards}
                  {data.timeline ? (
                    <TimeTrackedSummary
                      blocks={data.timeline.blocks}
                      day={dateKey(date)}
                    />
                  ) : null}
                </>
              ) : undefined,
            content:
              data.view === "week" ? (
                (timeline ?? <></>)
              ) : (
                <>
                  {cards}
                  {timeline}
                </>
              ),
          };
        });
  return (
    <main
      id="dashboard"
      class={`planner-page planner-view-${data.view}`}
      data-on:input="el.dataset.editing = 'true'"
      {...(data.view === "today" || data.view === "week"
        ? {
            "data-on-interval__duration.30s": `if (el.dataset.editing !== 'true' && !el.querySelector('details[open], dialog[open]') && !el.contains(document.activeElement)) @get(${JSON.stringify(viewUrl(options))})`,
          }
        : {})}
    >
      <footer class="planner-topbar" aria-label="Planner navigation">
        <nav class="tabs" aria-label="Planner views">
          {plannerViews.map(([view, label]) => (
            <a
              href={viewUrl(options, { view, page: 1 })}
              class={data.view === view ? "active" : ""}
              aria-current={data.view === view ? "page" : undefined}
            >
              <Icon name={viewIcons[view]} />
              <span>{label}</span>
            </a>
          ))}
        </nav>
      </footer>
      <div class="planner-content">
        {form}
        {habitForm}
        <PlannerFeedback />
        {data.view !== "stats" && data.timeline ? (
          <TrackingControls
            labels={data.timeline.labels}
            blocks={data.timeline.blocks}
            options={options}
            error={trackingFeedback?.error}
            values={trackingFeedback?.values}
            showGoals={false}
          />
        ) : null}
        {data.view === "menu" ? (
          <section class="menu-page" aria-labelledby="menu-title">
            <h1 id="menu-title">Menu</h1>
            <section class="card" aria-labelledby="menu-import-title">
              <h2 id="menu-import-title">Import</h2>
              <p>
                Bring your workouts into Life Planner from an Apple Health
                export.
              </p>
              <a
                id="menu-import-trigger"
                class="button"
                href={`${viewUrl(options)}&import=true`}
                data-on:click__prevent={`@get('${viewUrl(options)}&import=true')`}
              >
                Import Apple Health
              </a>
            </section>
          </section>
        ) : data.view === "stats" ? (
          <div class="stats-page">
            {data.timeline ? (
              <section class="stats-section" aria-labelledby="time-goals-title">
                <h2 id="time-goals-title">Time goals</h2>
                <TrackingControls
                  labels={data.timeline.labels}
                  blocks={data.timeline.blocks}
                  options={options}
                  error={trackingFeedback?.error}
                  values={trackingFeedback?.values}
                />
              </section>
            ) : null}
            <section
              class="stats-section"
              aria-labelledby="workout-overview-title"
            >
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
              <TrainingChart
                workouts={data.overview.trends}
                options={options}
              />
            </section>
          </div>
        ) : data.view === "calendar" ? (
          <PlannerCalendar days={days} options={options} />
        ) : (
          <section
            class={`daily-plans ${data.view === "week" ? "week-timelines" : "today-timeline"}`}
            aria-label="Daily plans"
          >
            <ScheduleDays days={days} />
          </section>
        )}
      </div>
    </main>
  );
};
