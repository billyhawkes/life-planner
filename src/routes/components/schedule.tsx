import type { Html } from "@/lib/datastar";

// Day content is composed by the page, allowing workouts and habits to share layouts.
export type ScheduleDay = {
  readonly date: Date;
  readonly content: Html;
  readonly actions?: Html;
};

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const ScheduleDays = ({
  days,
  month,
}: {
  readonly days: ReadonlyArray<ScheduleDay>;
  readonly month?: Date;
}) =>
  month ? (
    <div class="calendar-scroll">
      <div class="calendar">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <strong class="weekday">{day}</strong>
        ))}
        {days.map(({ date, content, actions }) => (
          <section
            class={`calendar-day ${date.getMonth() !== month.getMonth() ? "outside" : ""}`}
          >
            <div class="calendar-day-heading">
              <time
                class={
                  dateKey(date) === dateKey(new Date()) ? "current-day" : ""
                }
                datetime={dateKey(date)}
              >
                {date.getDate()}
              </time>
              {actions}
            </div>
            {content}
          </section>
        ))}
      </div>
    </div>
  ) : (
    <>
      {days.map(({ date, content, actions }) => (
        <section class="schedule-day">
          <header class="schedule-day-heading">
            <h3>
              <time datetime={dateKey(date)}>
                <span>
                  {date.toLocaleDateString("en", { weekday: "long" })}
                </span>
                <span class="day-date">
                  {date.toLocaleDateString("en", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </time>
              {dateKey(date) === dateKey(new Date()) ? (
                <span class="today-label">Today</span>
              ) : null}
            </h3>
            {actions}
          </header>
          {content}
        </section>
      ))}
    </>
  );
