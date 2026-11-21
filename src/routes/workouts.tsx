import type { Html } from "@/lib/datastar";
import { ScheduleDays } from "./components/schedule";
import type { DashboardData } from "@/services/planner/dashboard";
import { PlannerCalendar } from "./components/calendar";
import { CreateMenu } from "./components/create-menu";
import { PlannerWeekNavigation } from "./components/week-navigation";
import { PlannerFeedback } from "./components/feedback";
import { Icon, type IconName } from "./components/icon";
import { HabitCard } from "@/services/habits/components/card";
import { TaskCard } from "@/services/tasks/components/card";
import { PersonalGoals } from "@/services/goals/components/list";
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
  formUrl,
  type ViewOptions,
} from "@/services/workouts/helpers";

const plannerViews: ReadonlyArray<readonly [ViewOptions["view"], string]> = [
  ["dashboard", "Dashboard"],
  ["today", "Today"],
  ["week", "Week"],
  ["calendar", "Calendar"],
  ["stats", "Stats"],
  ["menu", "Menu"],
];

const viewIcons: Record<ViewOptions["view"], IconName> = {
  dashboard: "dashboard",
  today: "sun",
  week: "week",
  calendar: "calendar",
  stats: "activity",
  menu: "menu",
};

const viewCopy = {
  dashboard: [
    "Dashboard",
    "Manage your inbox, personal goals, and time targets.",
  ],
  today: ["Today", "See what’s planned and track how you spend your day."],
  week: ["Week", "See your schedule and time goals across the week."],
  calendar: ["Calendar", "Browse your tasks, habits, and workouts by date."],
  stats: ["Stats", "Review your training volume and progress over time."],
  menu: ["Menu", "Manage your planner and bring in existing workout data."],
} satisfies Record<ViewOptions["view"], readonly [string, string]>;

export const renderDashboard = (
  data: DashboardData,
  options: ViewOptions,
  form: Html = <section id="workout-form" />,
  habitForm: Html = <section id="habit-form" />,
  trackingFeedback?: {
    readonly error?: string;
    readonly values?: Record<string, string>;
  },
  taskForm: Html = <section id="task-form" />,
  personalGoalForm: Html = <section id="personal-goal-form" />,
) => {
  const [title, description] = viewCopy[data.view];
  const titleId = `${data.view}-title`;
  const compact = data.view === "calendar";
  const hours = { startHour: 0, endHour: 24 };
  const timeGoalUrl = formUrl(options, "/timeline/goals/new", {
    planner: "true",
  });
  const tracking = data.timeline ? (
    <TrackingControls
      labels={data.timeline.labels}
      blocks={data.timeline.blocks}
      options={options}
      day={data.view === "week" ? options.week : undefined}
      error={trackingFeedback?.error}
      values={trackingFeedback?.values}
      showGoals={data.view === "week" || data.view === "dashboard"}
    />
  ) : undefined;
  const days =
    data.view === "stats" || data.view === "menu" || data.view === "dashboard"
      ? []
      : data.days.map(({ date, workouts, habits, tasks }, index) => {
          const taskRows = tasks.map((task) => (
            <TaskCard
              task={task}
              options={options}
              compact={compact || data.view === "week"}
            />
          ));
          const habitRows = habits.map((occurrence) => (
            <HabitCard
              occurrence={occurrence}
              options={options}
              compact={data.view !== "today"}
              showCheckbox={data.view === "today"}
            />
          ));
          const cards = (
            <div class="day-cards">
              {data.view === "today" && tasks.length > 0 ? (
                <section
                  class="card task-list today-tasks"
                  aria-labelledby="today-tasks-title"
                >
                  <h3 id="today-tasks-title">Tasks</h3>
                  {taskRows}
                </section>
              ) : (
                taskRows
              )}
              {habits.length === 0 ? null : data.view === "today" ? (
                <section
                  class="card today-habits"
                  aria-labelledby="today-habits-title"
                >
                  <h3 id="today-habits-title">Habits</h3>
                  <ul class="today-habit-list" role="list">
                    {habitRows.map((row) => (
                      <li>{row}</li>
                    ))}
                  </ul>
                </section>
              ) : (
                <div class="habit-controls">{habitRows}</div>
              )}
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
              tasks.length === 0 &&
              habits.length === 0 ? (
                <p class="day-empty today-empty">
                  {options.search
                    ? "No matching tasks, workouts, or habits."
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
            actions:
              data.view === "today" ? undefined : (
                <CreateMenu options={options} date={dateKey(date)} />
              ),
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
      <div class="planner-sidebar">
        <a
          class="planner-brand"
          href={viewUrl(options, { view: "dashboard", page: 1 })}
        >
          <span class="planner-brand-icon">
            <Icon name="sprout" />
          </span>
          <span>Life Planner</span>
        </a>
        <p class="planner-nav-label" aria-hidden="true">
          Workspace
        </p>
        <nav class="planner-nav" aria-label="Planner views">
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
      </div>
      <div class="planner-content">
        <header class="planner-heading">
          <div>
            <h1 id={titleId}>{title}</h1>
            <p>{description}</p>
          </div>
          {data.view === "dashboard" || data.view === "today" ? (
            <CreateMenu
              options={options}
              date={
                data.view === "today"
                  ? dateKey(data.days[0]?.date ?? new Date())
                  : undefined
              }
              primary
            />
          ) : null}
        </header>
        {form}
        {habitForm}
        {taskForm}
        {personalGoalForm}
        <PlannerFeedback />
        {data.view === "week" ? (
          <PlannerWeekNavigation options={options} totals={tracking} />
        ) : data.view === "dashboard" ? null : (
          tracking
        )}
        {data.view === "dashboard" ? (
          <section class="task-dashboard" aria-labelledby={titleId}>
            <section
              class="card dashboard-card task-list"
              aria-label="Inbox tasks"
            >
              <header class="task-list-heading">
                <h2>
                  <Icon name="task" /> Inbox{" "}
                  <span class="task-count">
                    {data.tasks.filter((task) => !task.completed).length}
                  </span>
                </h2>
                <a
                  class="outline-action"
                  href={formUrl(options, "/tasks/new")}
                  data-on:click__prevent={`@get('${formUrl(options, "/tasks/new")}')`}
                >
                  <Icon name="plus" /> Add task
                </a>
              </header>
              {data.tasks.length ? (
                data.tasks.map((task) => (
                  <TaskCard task={task} options={options} />
                ))
              ) : (
                <p class="day-empty">
                  Your inbox is clear. Add a task to capture something for
                  later.
                </p>
              )}
            </section>
            <div class="dashboard-goals">
              <PersonalGoals goals={data.goals} />
              <section
                class="card dashboard-card"
                aria-labelledby="homepage-time-goals-title"
              >
                <header class="task-list-heading">
                  <h2 id="homepage-time-goals-title">
                    <Icon name="clock" /> Time goals
                  </h2>
                  <a
                    class="outline-action"
                    href={timeGoalUrl}
                    data-on:click__prevent={`@get('${timeGoalUrl}')`}
                  >
                    <Icon name="plus" /> Add time goal
                  </a>
                </header>
                {tracking}
                {!data.timeline?.labels.length ? (
                  <p class="day-empty">
                    No time goals yet. Set a target for how you spend your time.
                  </p>
                ) : null}
              </section>
            </div>
          </section>
        ) : data.view === "menu" ? (
          <section class="menu-page" aria-labelledby={titleId}>
            <section class="card" aria-labelledby="menu-import-title">
              <h2 id="menu-import-title" class="panel-title">
                <Icon name="activity" /> Import workouts
              </h2>
              <p>
                Bring your workouts into Life Planner from an Apple Health
                export.
              </p>
              <a
                id="menu-import-trigger"
                class="button"
                href={formUrl(options, "/workouts/new", { import: "true" })}
                data-on:click__prevent={`@get('${formUrl(options, "/workouts/new", { import: "true" })}')`}
              >
                Import Apple Health
              </a>
            </section>
          </section>
        ) : data.view === "stats" ? (
          <div class="stats-page">
            <section
              class="stats-section"
              aria-labelledby="workout-overview-title"
            >
              <h2 id="workout-overview-title">Workout overview</h2>
              <section class="stats" aria-label="Current training overview">
                <article class="card">
                  <h3>
                    Workouts this week <Icon name="workout" />
                  </h3>
                  <strong>{data.overview.completedCount}</strong>
                  <p>completed sessions</p>
                </article>
                <article class="card">
                  <h3>
                    Distance this week <Icon name="activity" />
                  </h3>
                  <strong>
                    {formatNumber(data.overview.distanceKilometres)} km
                  </strong>
                  <p>Running and cycling</p>
                </article>
                <article class="card">
                  <h3>
                    Current running pace <Icon name="clock" />
                  </h3>
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
