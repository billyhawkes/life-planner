import type { Workout } from "../schema";
import { formatNumber, type ViewOptions } from "../helpers";
import { EditLink } from "./links";
import { DeleteButton } from "@/routes/components/delete-button";
import { Icon } from "@/routes/components/icon";

export const WorkoutCard = ({
  workout,
  options,
  compact = false,
}: {
  readonly workout: Workout;
  readonly options: ViewOptions;
  readonly compact?: boolean;
}) => (
  <article
    class={`log-card ${compact ? "compact" : ""} ${workout.status === "completed" ? "is-complete" : ""}`}
  >
    {!compact ? (
      <span class="item-icon workout-icon">
        <Icon name="workout" />
      </span>
    ) : null}
    <div class="log-content">
      <span class="log-kind">
        Workout ·{" "}
        <time datetime={workout.startDate}>
          {new Date(workout.startDate).toLocaleTimeString("en", {
            hour: "numeric",
            minute: "2-digit",
          })}
        </time>
      </span>
      <div class="log-title">
        <h4>{workout.activityType}</h4>
        <span class={`badge ${workout.status}`}>{workout.status}</span>
      </div>
      <p class="log-meta">
        {formatNumber(workout.durationMinutes)} min
        {workout.distanceKilometres === undefined
          ? ""
          : ` · ${formatNumber(workout.distanceKilometres)} km`}
        {!compact && workout.heartRate
          ? ` · ${formatNumber(workout.heartRate.average)} bpm`
          : ""}
      </p>
      {!compact && workout.notes ? <p>{workout.notes}</p> : null}
    </div>
    <div class="log-actions">
      <EditLink workout={workout} options={options} />
      <DeleteButton
        kind="workout"
        id={workout.id}
        name={workout.activityType}
        options={options}
      />
    </div>
  </article>
);
