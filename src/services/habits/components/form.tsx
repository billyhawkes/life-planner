import {
  dateKey,
  viewUrl,
  type ViewOptions,
} from "@/services/workouts/helpers";
import { Icon } from "@/routes/components/icon";
import { HABIT_ICON_KEYS, HABIT_ICON_LABELS, type Habit } from "../schema";

export const HabitForm = ({
  options,
  values,
  error,
  habit,
}: {
  readonly options: ViewOptions;
  readonly values?: Record<string, string>;
  readonly error?: string;
  readonly habit?: Habit;
}) => {
  const action = habit
    ? `/habits/${encodeURIComponent(habit.id).replaceAll("'", "%27")}`
    : "/habits";
  const value = (name: "name" | "startDate" | "notes") =>
    values?.[name] ?? habit?.[name] ?? "";
  const selectedIcon =
    HABIT_ICON_KEYS.find((icon) => icon === values?.icon) ??
    habit?.icon ??
    HABIT_ICON_KEYS[0];
  return (
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
            <h2 id="habit-form-title">
              {habit ? "Edit habit" : "Create habit"}
            </h2>
            <p id="habit-form-description">
              {habit
                ? "Update this daily routine."
                : "Build a daily routine. Each day gets its own completion check."}
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
          action={action}
          data-on:submit__prevent={`@post('${action}', {contentType: 'form'})`}
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
                value={value("name")}
                placeholder="Read, meditate, go for a walk…"
                required
                maxlength="100"
                autofocus
              />
            </label>
            <fieldset class="wide habit-icon-picker">
              <legend>Icon</legend>
              <div>
                {HABIT_ICON_KEYS.map((icon) => (
                  <label>
                    <input
                      type="radio"
                      name="icon"
                      value={icon}
                      checked={icon === selectedIcon}
                    />
                    <span aria-hidden="true">
                      <Icon name={icon} />
                    </span>
                    <span class="sr-only">
                      Use {HABIT_ICON_LABELS[icon]} icon
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label>
              Start date
              <input
                type="date"
                name="startDate"
                value={value("startDate") || dateKey(new Date())}
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
                {value("notes")}
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
              <span data-show="!$savinghabit">
                {habit ? "Save habit" : "Create habit"}
              </span>
              <span data-show="$savinghabit" style="display: none">
                Saving…
              </span>
            </button>
          </footer>
        </form>
      </dialog>
    </section>
  );
};
