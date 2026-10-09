import { DayTimeline } from "@/services/timeline/components/day";
import { TrackingControls } from "@/services/timeline/components/tracking";
import { adjacentDay } from "@/services/timeline/helpers";
import type { TimeBlock, TimeLabel } from "@/services/timeline/schema";

// Retained for bookmarked day URLs; primary tracking lives in the planner.
export const renderTimeline = ({
  labels,
  blocks,
  day,
  error,
  values = {},
}: {
  labels: readonly TimeLabel[];
  blocks: readonly TimeBlock[];
  day: string;
  error?: string;
  values?: Record<string, string>;
}) => (
  <main
    id="timeline-page"
    data-on:input="el.dataset.editing = 'true'"
    {...{
      "data-on-interval__duration.30s": `if (el.dataset.editing !== 'true' && !el.querySelector('details[open]') && !el.contains(document.activeElement)) @get('/timeline?day=${day}')`,
    }}
  >
    <header class="planner-topbar">
      <nav class="tabs" aria-label="Planner views">
        <a href="/workouts?view=today">Today</a>
        <a href="/workouts?view=week">This Week</a>
      </nav>
    </header>
    <header class="timeline-heading">
      <h1>Daily timeline</h1>
      <div class="timeline-date">
        <a
          href={`/timeline?day=${adjacentDay(day, -1)}`}
          aria-label="Previous day"
        >
          ←
        </a>
        <form method="get" action="/timeline">
          <input
            type="date"
            name="day"
            value={day}
            required
            aria-label="Timeline date"
          />
          <button type="submit">Go</button>
        </form>
        <a href={`/timeline?day=${adjacentDay(day, 1)}`} aria-label="Next day">
          →
        </a>
      </div>
    </header>
    <TrackingControls
      labels={labels}
      blocks={blocks}
      day={day}
      error={error}
      values={values}
      showGoals={false}
    />
    <section class="card">
      <DayTimeline labels={labels} blocks={blocks} day={day} />
    </section>
  </main>
);
