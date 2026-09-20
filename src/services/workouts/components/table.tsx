import {
  formatDate,
  formatNumber,
  viewUrl,
  type WorkoutsProps,
} from "../helpers";
import { EditLink, Link } from "./links";

const WorkoutRows = ({ workouts, options }: WorkoutsProps) => (
  <>
    {workouts.length ? (
      workouts.map((workout) => (
        <tr>
          <td>
            <span class={`badge ${workout.status}`}>{workout.status}</span>
          </td>
          <td>{formatDate(workout.startDate)}</td>
          <td>{workout.activityType}</td>
          <td>{formatNumber(workout.durationMinutes)} min</td>
          <td>
            {workout.distanceKilometres === undefined
              ? "—"
              : `${formatNumber(workout.distanceKilometres)} km`}
          </td>
          <td>
            {workout.heartRate
              ? `${Math.round(workout.heartRate.average)} bpm`
              : "—"}
          </td>
          <td class="notes">{workout.notes ?? "—"}</td>
          <td>
            <EditLink workout={workout} options={options} />
          </td>
        </tr>
      ))
    ) : (
      <tr>
        <td colspan="8" class="empty">
          No workouts yet. Add a planned session or import Apple Health.
        </td>
      </tr>
    )}
  </>
);

export const WorkoutTable = ({ workouts, options }: WorkoutsProps) => (
  <div class="table-scroll">
    <table>
      <thead>
        <tr>
          {[
            ["Status", "status"],
            ["Date", "startDate"],
            ["Activity", "activityType"],
            ["Duration", "durationMinutes"],
            ["Kilometres", "distanceKilometres"],
            ["Avg. heart rate", "heartRate"],
            ["Plan notes", "notes"],
          ].map(([label, sort]) => (
            <th>
              <Link
                label={label}
                url={viewUrl(options, {
                  sort: options.sort === sort ? `-${sort}` : sort,
                  page: 1,
                })}
              />
            </th>
          ))}
          <th>
            <span class="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <WorkoutRows workouts={workouts} options={options} />
      </tbody>
    </table>
  </div>
);
