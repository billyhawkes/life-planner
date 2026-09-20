import { dateKey, formatNumber, viewUrl, type ViewOptions } from "../helpers";
import type { WorkoutDay } from "../schema";
import { EditLink, Link } from "./links";

export const WorkoutCalendar = ({
  days,
  options,
}: {
  readonly days: ReadonlyArray<WorkoutDay>;
  readonly options: ViewOptions;
}) => {
  const month = new Date(`${options.month}-01T12:00`);
  const previous = new Date(month);
  previous.setMonth(previous.getMonth() - 1);
  const next = new Date(month);
  next.setMonth(next.getMonth() + 1);
  return (
    <section class="card">
      <header>
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
      <div class="calendar-scroll">
        <div class="calendar">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <strong class="weekday">{day}</strong>
          ))}
          {days.map(({ date, workouts }) => {
            const key = dateKey(date);
            const url = `${viewUrl(options)}&new=${key}`;
            return (
              <section
                class={`calendar-day ${date.getMonth() !== month.getMonth() ? "outside" : ""}`}
              >
                <div>
                  <time datetime={key}>{date.getDate()}</time>
                  <a
                    aria-label={`Add workout on ${key}`}
                    href={url}
                    data-on:click__prevent={`@get('${url}')`}
                  >
                    +
                  </a>
                </div>
                {workouts.map((workout) => (
                  <article>
                    <strong>{workout.activityType}</strong>
                    <small>
                      {workout.status} · {formatNumber(workout.durationMinutes)}{" "}
                      min
                      {workout.distanceKilometres === undefined
                        ? ""
                        : ` · ${formatNumber(workout.distanceKilometres)} km`}
                    </small>
                    <EditLink workout={workout} options={options} />
                  </article>
                ))}
              </section>
            );
          })}
        </div>
      </div>
    </section>
  );
};
