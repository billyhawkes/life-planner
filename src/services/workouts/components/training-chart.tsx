import {
  formatDate,
  formatNumber,
  formatPace,
  viewUrl,
  type WorkoutsProps,
} from "../helpers";
import { Link } from "./links";

export const TrainingChart = ({
  workouts: selected,
  options,
}: WorkoutsProps) => {
  const values = selected.map((workout) =>
    options.metric === "distance"
      ? workout.distanceKilometres!
      : workout.durationMinutes / workout.distanceKilometres!,
  );
  const minimum = values.length ? Math.min(...values) : 0;
  const maximum = values.length ? Math.max(...values) : 1;
  const padding = Math.max((maximum - minimum) * 0.15, maximum * 0.05, 0.25);
  const low =
    options.metric === "distance" ? 0 : Math.max(0, minimum - padding);
  const high = maximum + padding;
  const times = selected.map((workout) => Date.parse(workout.startDate));
  const firstTime = times[0] ?? 0;
  const lastTime = times[times.length - 1] ?? firstTime;
  const timeX = (time: number) =>
    lastTime === firstTime
      ? 460
      : 80 + ((time - firstTime) / (lastTime - firstTime)) * 760;
  const tickCount = lastTime === firstTime ? 1 : 5;
  const dateTicks = Array.from(
    { length: tickCount },
    (_, index) =>
      firstTime + ((lastTime - firstTime) * index) / Math.max(1, tickCount - 1),
  );
  const points = values.map((value, index) => ({
    x: timeX(times[index]),
    y: 270 - ((value - low) / (high - low)) * 240,
  }));
  const valueLabel = (value: number) =>
    options.metric === "distance"
      ? `${formatNumber(value)} km`
      : `${formatPace(value)} /km`;
  return (
    <section class="card training-chart">
      <header class="chart-heading">
        <div>
          <h3>Training trends</h3>
          <p>
            {selected.length
              ? `Latest ${selected.length} completed ${options.activity === "cycling" ? "rides" : "runs"}`
              : "Your completed sessions"}
            {options.metric === "pace"
              ? " · Lower pace is faster"
              : " · Distance per session"}
          </p>
        </div>
        <div class="chart-controls">
          <nav class="pills" aria-label="Chart activity">
            <Link
              label="Running"
              url={viewUrl(options, { activity: "running" })}
              active={options.activity !== "cycling"}
            />
            <Link
              label="Cycling"
              url={viewUrl(options, { activity: "cycling" })}
              active={options.activity === "cycling"}
            />
          </nav>
          <nav class="pills" aria-label="Chart metric">
            <Link
              label="Pace"
              url={viewUrl(options, { metric: "pace" })}
              active={options.metric !== "distance"}
            />
            <Link
              label="Distance"
              url={viewUrl(options, { metric: "distance" })}
              active={options.metric === "distance"}
            />
          </nav>
        </div>
      </header>
      {selected.length ? (
        <div class="chart-scroll">
          <svg
            class="chart"
            data-training-chart=""
            tabindex="0"
            viewBox="0 0 880 320"
            role="group"
            aria-label={`${options.metric === "distance" ? "Distance" : "Pace"} across the last ${selected.length} sessions. Use left and right arrow keys to explore workouts.`}
            aria-describedby="training-chart-tooltip"
          >
            {Array.from({ length: 5 }, (_, index) => {
              const y = 270 - (index * 240) / 4;
              return (
                <>
                  <line x1="80" x2="840" y1={y} y2={y} class="grid-line" />
                  <text x="68" y={y + 4} text-anchor="end">
                    {valueLabel(low + (index * (high - low)) / 4)}
                  </text>
                </>
              );
            })}
            {dateTicks.map((time) => (
              <>
                <line
                  x1={timeX(time)}
                  x2={timeX(time)}
                  y1="270"
                  y2="277"
                  class="grid-line"
                />
                <text x={timeX(time)} y="303" text-anchor="middle">
                  {lastTime !== firstTime && lastTime - firstTime < 86400000
                    ? new Date(time).toLocaleTimeString("en", {
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : new Date(time).toLocaleDateString("en", {
                        month: "short",
                        day: "numeric",
                      })}
                </text>
              </>
            ))}
            {points.length > 1 ? (
              <polyline
                points={points.map(({ x, y }) => `${x},${y}`).join(" ")}
                fill="none"
              />
            ) : null}
            {points.map(({ x, y }, index) => (
              <circle
                cx={x}
                cy={y}
                r="4"
                data-chart-point=""
                data-date={new Date(selected[index].startDate).toLocaleString(
                  "en",
                  {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  },
                )}
                data-value={valueLabel(values[index])}
                data-details={`${formatNumber(selected[index].durationMinutes)} min · ${formatNumber(selected[index].distanceKilometres!)} km`}
              >
                <title>
                  {formatDate(selected[index].startDate)}:{" "}
                  {valueLabel(values[index])}
                </title>
              </circle>
            ))}
            <line
              class="chart-crosshair"
              data-chart-crosshair=""
              y1="30"
              y2="270"
              visibility="hidden"
            />
            <circle
              class="chart-active-point"
              data-chart-active=""
              r="6"
              visibility="hidden"
            />
          </svg>
          <div
            id="training-chart-tooltip"
            class="chart-tooltip"
            role="status"
            hidden
          >
            <span data-tooltip-date="" />
            <strong data-tooltip-value="" />
            <span data-tooltip-details="" />
          </div>
        </div>
      ) : (
        <p class="empty">
          Complete a {options.activity === "cycling" ? "ride" : "run"} with
          recorded distance to see your trends.
        </p>
      )}
    </section>
  );
};
