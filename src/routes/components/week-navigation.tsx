import { adjacentDay } from "@/services/timeline/helpers";
import {
  dateKey,
  viewUrl,
  weekStart,
  type ViewOptions,
} from "@/services/workouts/helpers";
import { Link } from "@/services/workouts/components/links";
import type { Html } from "@/lib/datastar";

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
        <Link
          label="← Previous week"
          url={viewUrl(options, { week: adjacentDay(start, -7) })}
        />
        <h2>
          {format(start)} – {format(end)}
        </h2>
        <div class="week-navigation-actions">
          <Link
            label="This week"
            url={viewUrl(options, { week: weekStart(dateKey(new Date())) })}
          />
          <Link
            label="Next week →"
            url={viewUrl(options, { week: adjacentDay(start, 7) })}
          />
        </div>
      </div>
      {totals}
    </header>
  );
};
