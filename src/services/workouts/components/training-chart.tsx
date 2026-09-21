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
  const low = Math.max(0, Math.min(...values) - 0.5);
  const high = Math.max(...values) + 0.5;
  const points = values.map((value, index) => ({
    x: 70 + (index * 780) / Math.max(1, values.length - 1),
    y: 230 - ((value - low) / (high - low)) * 195,
  }));
  const valueLabel = (value: number) =>
    options.metric === "distance"
      ? `${formatNumber(value)} km`
      : `${formatPace(value)} /km`;
  return (
    <section class="card">
      <header>
        <div>
          <h3>Training trends</h3>
          <p>
            Compare pace and distance across your latest completed runs and
            rides.
          </p>
        </div>
        <nav class="pills" aria-label="Chart options">
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
      </header>
      {selected.length ? (
        <svg
          class="chart"
          viewBox="0 0 900 280"
          role="img"
          aria-label={`${options.metric === "distance" ? "Distance" : "Pace"} across the last ${selected.length} sessions`}
        >
          {Array.from({ length: 5 }, (_, index) => {
            const y = 230 - (index * 195) / 4;
            return (
              <>
                <line x1="70" x2="850" y1={y} y2={y} class="grid-line" />
                <text x="60" y={y + 4} text-anchor="end">
                  {valueLabel(low + (index * (high - low)) / 4)}
                </text>
              </>
            );
          })}
          <polyline
            points={points.map(({ x, y }) => `${x},${y}`).join(" ")}
            fill="none"
          />
          {points.map(({ x, y }, index) => (
            <circle cx={x} cy={y} r="4">
              <title>
                {formatDate(selected[index].startDate)}:{" "}
                {valueLabel(values[index])}
              </title>
            </circle>
          ))}
          <text x="70" y="265">
            {formatDate(selected[0].startDate)}
          </text>
          <text x="850" y="265" text-anchor="end">
            {formatDate(selected[selected.length - 1].startDate)}
          </text>
        </svg>
      ) : (
        <p class="empty">
          Complete a run or ride with distance to start your pace chart.
        </p>
      )}
    </section>
  );
};
