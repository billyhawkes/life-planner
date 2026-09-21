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
  const activity = String(
    value("activityType", workout?.activityType ?? "Running"),
  );
  const activities = Array.from(
    new Set([
      "Running",
      "Cycling",
      "Walking",
      "Swimming",
      "Hiking",
      "TraditionalStrengthTraining",
      "FunctionalStrengthTraining",
      "HighIntensityIntervalTraining",
      "Yoga",
      "Pilates",
      "Rowing",
      "Elliptical",
      "Other",
      ...(activity ? [activity] : []),
    ]),
  );
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
    <section id="workout-form">
      <dialog
        id="workout-dialog"
        class="form-dialog workout-dialog"
        open
        aria-labelledby="workout-form-title"
        aria-describedby="workout-form-description"
      >
        <header class="dialog-heading">
          <div>
            <h2 id="workout-form-title">
              {workout ? "Edit workout" : "Create workout"}
            </h2>
            <p id="workout-form-description">
              {workout
                ? "Update your session details."
                : "Plan a session or log a completed workout."}
            </p>
          </div>
          <a
            class="dialog-close"
            href={viewUrl(options)}
            data-dialog-close=""
            aria-label="Close workout form"
          >
            ×
          </a>
        </header>
        <form
          method="post"
          action={action}
          data-on:submit__prevent={`@post('${action}', {contentType: 'form'})`}
          data-indicator:saving=""
        >
          {Object.entries(options).map(([key, entry]) => (
            <input type="hidden" name={key} value={entry} />
          ))}
          <fieldset class="workout-section">
            <legend>Session</legend>
            <div class="form-grid">
              <label>
                Activity
                <select name="activityType" autofocus required>
                  <option value="" disabled selected={!activity}>
                    Select an activity
                  </option>
                  {activities.map((entry) => (
                    <option value={entry} selected={activity === entry}>
                      {entry.replace(/([a-z])([A-Z])/g, "$1 $2")}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset class="choice-field">
                <legend>Status</legend>
                <div class="segmented-choice">
                  {["planned", "completed"].map((status) => (
                    <label>
                      <input
                        type="radio"
                        name="status"
                        value={status}
                        checked={
                          value("status", workout?.status ?? "planned") ===
                          status
                        }
                      />
                      <span>
                        {status === "planned" ? "Planned" : "Completed"}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label class="wide">
                Date and time
                <input
                  type="datetime-local"
                  name="startDate"
                  value={value("startDate", localDateTime(date))}
                  required
                />
              </label>
            </div>
          </fieldset>
          <fieldset class="workout-section">
            <legend>Workout details</legend>
            <div class="form-grid">
              <fieldset>
                <legend>Duration</legend>
                <div class="duration">
                  <label class="unit-field">
                    <span class="sr-only">Minutes</span>
                    <input
                      type="number"
                      name="minutes"
                      min="0"
                      step="1"
                      value={value("minutes", Math.floor(totalSeconds / 60))}
                      required
                    />
                    <span class="field-unit" aria-hidden="true">
                      min
                    </span>
                  </label>
                  <label class="unit-field">
                    <span class="sr-only">Seconds</span>
                    <input
                      type="number"
                      name="seconds"
                      min="0"
                      max="59"
                      step="1"
                      value={value("seconds", totalSeconds % 60)}
                      required
                    />
                    <span class="field-unit" aria-hidden="true">
                      sec
                    </span>
                  </label>
                </div>
              </fieldset>
              <label>
                <span>
                  Distance <span class="field-hint">optional</span>
                </span>
                <span class="unit-field">
                  <input
                    type="number"
                    name="distance"
                    min="0"
                    step="any"
                    value={value("distance", workout?.distanceKilometres ?? "")}
                    placeholder="0"
                    aria-label="Distance in kilometres, optional"
                  />
                  <span class="field-unit" aria-hidden="true">
                    km
                  </span>
                </span>
              </label>
              <fieldset class="choice-field wide location-choice">
                <legend>Location</legend>
                <div class="segmented-choice">
                  {[
                    { value: "false", label: "Outdoors" },
                    { value: "true", label: "Indoors" },
                  ].map((location) => (
                    <label>
                      <input
                        type="radio"
                        name="indoor"
                        value={location.value}
                        checked={
                          value("indoor", String(workout?.indoor ?? false)) ===
                          location.value
                        }
                      />
                      <span>{location.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label class="wide">
                <span>
                  Notes <span class="field-hint">optional</span>
                </span>
                <textarea
                  name="notes"
                  rows="2"
                  placeholder="Route, intervals, or anything to remember…"
                >
                  {value("notes", workout?.notes ?? "")}
                </textarea>
              </label>
            </div>
          </fieldset>
          {error ? (
            <p role="alert" class="error" tabindex="-1">
              {error}
            </p>
          ) : null}
          <footer>
            <a
              class="button secondary"
              href={viewUrl(options)}
              data-dialog-close=""
            >
              Cancel
            </a>
            <button data-attr:disabled="$saving" type="submit">
              <span data-show="!$saving">Save workout</span>
              <span data-show="$saving" style="display: none">
                Saving…
              </span>
            </button>
          </footer>
        </form>
      </dialog>
    </section>
  );
};
