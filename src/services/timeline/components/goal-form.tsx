import { viewUrl, type ViewOptions } from "@/services/workouts/helpers";
import type { TimeLabel } from "../schema";
import { TimeForm } from "./forms";

export const GoalForm = ({
  labels,
  day,
  options,
  values = {},
  error,
}: {
  labels: readonly TimeLabel[];
  day: string;
  options: ViewOptions;
  values?: Record<string, string>;
  error?: string;
}) => {
  const selected = labels.find(
    (label) => label.id === (values.editLabel ?? values.edit),
  );
  const retry = values.operation === "label";
  const action = selected
    ? `/timeline/labels/${selected.id}`
    : "/timeline/labels";
  return (
    <section id="goal-form">
      <dialog
        id="goal-dialog"
        class="form-dialog"
        open
        aria-labelledby="goal-form-title"
      >
        <header class="dialog-heading">
          <div>
            <h2 id="goal-form-title">
              {selected ? "Edit goal" : "Create goal"}
            </h2>
            <p>Set daily or weekly time targets for a label.</p>
          </div>
          <a
            class="dialog-close"
            href={viewUrl(options)}
            data-dialog-close=""
            aria-label="Close goal form"
          >
            ×
          </a>
        </header>
        {error ? (
          <p class="timeline-error" role="alert">
            {error}
          </p>
        ) : null}
        <TimeForm action={action} day={day} options={options}>
          <div class="form-grid">
            <label class="wide">
              Label name
              <input
                name="name"
                value={retry ? values.name : (selected?.name ?? "")}
                placeholder="Work, guitar practice…"
                required
                maxlength="100"
                autofocus
              />
            </label>
            <label>
              Daily goal (minutes)
              <input
                type="number"
                name="goalMinutes"
                min="0"
                max="1440"
                value={
                  retry ? values.goalMinutes : (selected?.goalMinutes ?? 0)
                }
                required
              />
            </label>
            <label>
              Weekly goal (minutes)
              <input
                type="number"
                name="weeklyGoalMinutes"
                min="0"
                max="10080"
                value={
                  retry
                    ? values.weeklyGoalMinutes
                    : (selected?.weeklyGoalMinutes ?? 0)
                }
                required
              />
            </label>
            <label>
              Color
              <input
                type="color"
                name="color"
                value={retry ? values.color : (selected?.color ?? "#15803d")}
              />
            </label>
          </div>
          <p>
            Weeks run Monday–Sunday. Use 0 for no target. A 40-hour work week is
            2400 weekly minutes.
          </p>
          <button type="submit">
            {selected ? "Save goal" : "Create goal"}
          </button>
        </TimeForm>
        {labels.length ? (
          <section>
            <h3>Existing goals</h3>
            {labels.map((label) => {
              const url = `${viewUrl(options).replace("/workouts?", "/timeline/goals/new?")}&planner=true&edit=${label.id}&day=${day}`;
              return (
                <p>
                  <a href={url} data-on:click__prevent={`@get('${url}')`}>
                    {label.name} — Edit goal
                  </a>
                </p>
              );
            })}
          </section>
        ) : null}
      </dialog>
    </section>
  );
};
