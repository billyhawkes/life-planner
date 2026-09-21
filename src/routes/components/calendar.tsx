import {
  dateKey,
  viewUrl,
  type ViewOptions,
} from "@/services/workouts/helpers";
import { Link } from "@/services/workouts/components/links";
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
        <Link
          label="← Previous"
          url={viewUrl(options, { month: dateKey(previous).slice(0, 7) })}
        />
        <h2>
          {month.toLocaleDateString("en", { month: "long", year: "numeric" })}
        </h2>
        <Link
          label="Next →"
          url={viewUrl(options, { month: dateKey(next).slice(0, 7) })}
        />
      </header>
      <ScheduleDays month={month} days={days} />
    </section>
  );
};
