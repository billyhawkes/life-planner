import type { Html } from "@/lib/datastar";
import type { Workout } from "../schema";
import { localDateTime, viewUrl, type ViewOptions } from "../helpers";

export const WorkoutForm = ({
  options,
  workout,
  initialDate,
  error,
  values,
}: {
  readonly options: ViewOptions;
  readonly workout?: Workout;
  readonly initialDate?: string;
  readonly error?: string;
  readonly values?: Record<string, string>;
}): Html => {
  const value = (name: string, fallback: string | number) =>
    values?.[name] ?? fallback;
  const totalSeconds = Math.round((workout?.durationMinutes ?? 45) * 60);
  const action = workout
    ? `/workouts/${encodeURIComponent(workout.id).replaceAll("'", "%27")}`
    : "/workouts";
  const date = workout
    ? new Date(workout.startDate)
    : initialDate
      ? new Date(`${initialDate}T09:00`)
      : new Date();
  return (
    <section id="workout-form" class="card form-card">
      <h2>{workout ? "Edit workout" : "Add workout"}</h2>
      <p>Set the session timing and details for your training plan.</p>
      <form
        method="post"
        action={action}
        data-on:submit__prevent={`@post('${action}', {contentType: 'form'})`}
        data-indicator:saving=""
      >
        {Object.entries(options).map(([key, entry]) => (
          <input type="hidden" name={key} value={entry} />
        ))}
        <div class="form-grid">
          <label>
            Activity
            <input
              name="activityType"
              list="activities"
              value={value("activityType", workout?.activityType ?? "Running")}
              required
              maxlength="100"
            />
            <datalist id="activities">
              <option>Running</option>
              <option>Cycling</option>
              <option>Walking</option>
              <option>Swimming</option>
            </datalist>
          </label>
          <label>
            Status
            <select name="status">
              {["planned", "completed"].map((status) => (
                <option
                  value={status}
                  selected={
                    value("status", workout?.status ?? "planned") === status
                  }
                >
                  {status === "planned" ? "Planned" : "Completed"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input
              type="datetime-local"
              name="startDate"
              value={value("startDate", localDateTime(date))}
              required
            />
          </label>
          <fieldset>
            <legend>Duration</legend>
            <div class="duration">
              <label>
                Minutes
                <input
                  type="number"
                  name="minutes"
                  min="0"
                  step="1"
                  value={value("minutes", Math.floor(totalSeconds / 60))}
                  required
                />
              </label>
              <label>
                Seconds
                <input
                  type="number"
                  name="seconds"
                  min="0"
                  max="59"
                  step="1"
                  value={value("seconds", totalSeconds % 60)}
                  required
                />
              </label>
            </div>
          </fieldset>
          <label>
            Distance (km, optional)
            <input
              type="number"
              name="distance"
              min="0"
              step="any"
              value={value("distance", workout?.distanceKilometres ?? "")}
            />
          </label>
          <label>
            Location
            <select name="indoor">
              <option
                value="false"
                selected={
                  value("indoor", String(workout?.indoor ?? false)) === "false"
                }
              >
                Outdoors
              </option>
              <option
                value="true"
                selected={
                  value("indoor", String(workout?.indoor ?? false)) === "true"
                }
              >
                Indoors
              </option>
            </select>
          </label>
          <label class="wide">
            Plan notes
            <textarea name="notes" rows="3">
              {value("notes", workout?.notes ?? "")}
            </textarea>
          </label>
        </div>
        {error ? (
          <p role="alert" class="error">
            {error}
          </p>
        ) : null}
        <footer>
          <a
            class="button secondary"
            href={viewUrl(options)}
            data-on:click__prevent="document.getElementById('workout-form').innerHTML = ''"
          >
            Cancel
          </a>
          <button data-attr:disabled="$saving" type="submit">
            Save workout
          </button>
        </footer>
      </form>
    </section>
  );
};
