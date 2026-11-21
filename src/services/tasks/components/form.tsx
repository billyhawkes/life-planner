import { viewUrl, type ViewOptions } from "@/services/workouts/helpers";
import type { Task } from "../schema";

export const TaskForm = ({
  options,
  task,
  values,
  error,
}: {
  readonly options: ViewOptions;
  readonly task?: Task;
  readonly values?: Record<string, string>;
  readonly error?: string;
}) => {
  const action = task
    ? `/tasks/${encodeURIComponent(task.id).replaceAll("'", "%27")}`
    : "/tasks";
  const value = (name: "title" | "date" | "notes") =>
    values?.[name] ?? task?.[name] ?? "";
  return (
    <section id="task-form">
      <dialog
        id="task-dialog"
        class="form-dialog"
        open
        aria-labelledby="task-form-title"
      >
        <header class="dialog-heading">
          <div>
            <h2 id="task-form-title">{task ? "Edit task" : "Create task"}</h2>
            <p>
              Choose a date, or leave it blank to keep this task in your inbox.
            </p>
          </div>
          <a
            class="dialog-close"
            href={viewUrl(options)}
            data-dialog-close=""
            aria-label="Close task form"
          >
            ×
          </a>
        </header>
        <form
          method="post"
          action={action}
          data-on:submit__prevent={`@post('${action}', {contentType: 'form'})`}
          data-indicator:savingtask=""
        >
          {Object.entries(options).map(([key, value]) => (
            <input type="hidden" name={key} value={value} />
          ))}
          <div class="form-grid">
            <label class="wide">
              Task title
              <input
                name="title"
                value={value("title")}
                required
                maxlength="200"
                autofocus
              />
            </label>
            <label>
              Date (optional)
              <input type="date" name="date" value={value("date")} />
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
            <button type="submit" data-attr:disabled="$savingtask">
              {task ? "Save task" : "Create task"}
            </button>
          </footer>
        </form>
      </dialog>
    </section>
  );
};
