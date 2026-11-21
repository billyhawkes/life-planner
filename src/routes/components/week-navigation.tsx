import { adjacentDay } from "@/services/timeline/helpers";
import {
  dateKey,
  viewUrl,
  weekStart,
  type ViewOptions,
} from "@/services/workouts/helpers";
import type { Html } from "@/lib/datastar";
import { Icon } from "./icon";

export const PlannerWeekNavigation = ({
  options,
  totals,
}: {
  readonly options: ViewOptions;
  readonly totals?: Html;
}) => {
  const start = weekStart(options.week);
  const end = adjacentDay(start, 6);
  const format = (day: string) =>
    new Date(`${day}T12:00`).toLocaleDateString("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  return (
    <header class="calendar-toolbar week-toolbar" aria-label="Week navigation">
      <div class="week-navigation-row">
        <a
          class="outline-action"
          href={viewUrl(options, { week: adjacentDay(start, -7) })}
        >
          <Icon name="arrow-left" /> Previous week
        </a>
        <h2>
          {format(start)} – {format(end)}
        </h2>
        <div class="week-navigation-actions">
          <a
            class="outline-action"
            href={viewUrl(options, { week: weekStart(dateKey(new Date())) })}
          >
            This week
          </a>
          <a
            class="outline-action"
            href={viewUrl(options, { week: adjacentDay(start, 7) })}
          >
            Next week <Icon name="arrow-right" />
          </a>
        </div>
      </div>
      {totals}
    </header>
  );
};
