import {
  dateKey,
  viewUrl,
  type ViewOptions,
} from "@/services/workouts/helpers";

export const HabitForm = ({
  options,
  values,
  error,
}: {
  readonly options: ViewOptions;
  readonly values?: Record<string, string>;
  readonly error?: string;
}) => (
  <section id="habit-form">
    <dialog
      id="habit-dialog"
      class="form-dialog"
      open
      aria-labelledby="habit-form-title"
      aria-describedby="habit-form-description"
    >
      <header class="dialog-heading">
        <div>
          <h2 id="habit-form-title">Create habit</h2>
          <p id="habit-form-description">
            Build a daily routine. Each day gets its own completion check.
          </p>
        </div>
        <a
          class="dialog-close"
          href={viewUrl(options)}
          data-dialog-close=""
          aria-label="Close habit form"
        >
          ×
        </a>
      </header>
      <form
        method="post"
        action="/habits"
        data-on:submit__prevent="@post('/habits', {contentType: 'form'})"
        data-indicator:savinghabit=""
      >
        {Object.entries(options).map(([key, value]) => (
          <input type="hidden" name={key} value={value} />
        ))}
        <div class="form-grid">
          <label class="wide">
            Habit name
            <input
              name="name"
              value={values?.name ?? ""}
              placeholder="Read, meditate, go for a walk…"
              required
              maxlength="100"
              autofocus
            />
          </label>
          <label>
            Start date
            <input
              type="date"
              name="startDate"
              value={values?.startDate ?? dateKey(new Date())}
              required
            />
          </label>
          <label>
            Repeats
            <select name="frequency">
              <option value="daily">Every day</option>
            </select>
          </label>
          <label class="wide">
            Notes (optional)
            <textarea name="notes" rows="3" maxlength="2000">
              {values?.notes ?? ""}
            </textarea>
          </label>
        </div>
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
          <button type="submit" data-attr:disabled="$savinghabit">
            <span data-show="!$savinghabit">Create habit</span>
            <span data-show="$savinghabit" style="display: none">
              Creating…
            </span>
          </button>
        </footer>
      </form>
    </dialog>
  </section>
);
