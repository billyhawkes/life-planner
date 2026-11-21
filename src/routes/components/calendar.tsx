import {
  dateKey,
  viewUrl,
  type ViewOptions,
} from "@/services/workouts/helpers";
import { Icon } from "./icon";
import { ScheduleDays, type ScheduleDay } from "./schedule";

export const PlannerCalendar = ({
  days,
  options,
}: {
  readonly days: ReadonlyArray<ScheduleDay>;
  readonly options: ViewOptions;
}) => {
  const month = new Date(`${options.month}-01T12:00`);
  const previous = new Date(month);
  previous.setMonth(previous.getMonth() - 1);
  const next = new Date(month);
  next.setMonth(next.getMonth() + 1);
  return (
    <section class="calendar-panel">
      <header class="calendar-toolbar">
        <a
          class="outline-action"
          href={viewUrl(options, { month: dateKey(previous).slice(0, 7) })}
          aria-label="Previous month"
        >
          <Icon name="arrow-left" /> Previous
        </a>
        <h2>
          {month.toLocaleDateString("en", { month: "long", year: "numeric" })}
        </h2>
        <a
          class="outline-action"
          href={viewUrl(options, { month: dateKey(next).slice(0, 7) })}
          aria-label="Next month"
        >
          Next <Icon name="arrow-right" />
        </a>
      </header>
      <ScheduleDays month={month} days={days} />
    </section>
  );
};
