import { goalStatuses, type Goal } from "../schema";

export const PersonalGoalForm = ({
  goal,
  values = {},
  error,
}: {
  goal?: Goal;
  values?: Record<string, string>;
  error?: string;
}) => {
  const action = goal ? `/goals/${encodeURIComponent(goal.id)}` : "/goals";
  return (
    <section id="personal-goal-form">
      <dialog class="form-dialog" open aria-labelledby="personal-goal-title">
        <header class="dialog-heading">
          <div>
            <h2 id="personal-goal-title">
              {goal ? "Edit personal goal" : "New personal goal"}
            </h2>
            <p>Set something to work toward, at your own pace.</p>
          </div>
          <a
            class="dialog-close"
            href="/"
            data-dialog-close=""
            aria-label="Close goal form"
          >
            ×
          </a>
        </header>
        <form
          method="post"
          action={action}
          data-on:submit__prevent={`@post(${JSON.stringify(action)}, {contentType: 'form'})`}
          data-indicator:savinggoal=""
        >
          <div class="form-grid">
            <label class="wide">
              Goal
              <input
                name="title"
                value={values.title ?? goal?.title ?? ""}
                placeholder="Go on a road trip"
                required
                maxlength="200"
                autofocus
              />
            </label>
            <label>
              Status
              <select name="status">
                {Object.entries(goalStatuses).map(([status, label]) => (
                  <option
                    value={status}
                    selected={
                      status === (values.status ?? goal?.status ?? "planned")
                    }
                  >
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label class="wide">
              Notes or next steps (optional)
              <textarea name="notes" rows="3" maxlength="2000">
                {values.notes ?? goal?.notes ?? ""}
              </textarea>
            </label>
          </div>
          {error ? (
            <p class="error" role="alert" tabindex="-1">
              {error}
            </p>
          ) : null}
          <footer>
            <a class="button secondary" href="/" data-dialog-close="">
              Cancel
            </a>
            <button type="submit" data-attr:disabled="$savinggoal">
              {goal ? "Save goal" : "Create goal"}
            </button>
          </footer>
        </form>
      </dialog>
    </section>
  );
};
