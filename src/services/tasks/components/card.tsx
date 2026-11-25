import { Icon } from "@/routes/components/icon";
import { formUrl, type ViewOptions } from "@/services/workouts/helpers";
import type { Task } from "../schema";

export const TaskCard = ({
  task,
  options,
  compact = false,
}: {
  readonly task: Task;
  readonly options: ViewOptions;
  readonly compact?: boolean;
}) => {
  const path = `/tasks/${encodeURIComponent(task.id).replaceAll("'", "%27")}`;
  const editUrl = formUrl(options, "/tasks/new", { edit: task.id }).replaceAll(
    "'",
    "%27",
  );
  const notes = compact ? "" : task.notes;
  return (
    <article
      class={`editable-row task-card${compact ? " compact" : ""}${task.completed ? " is-complete" : ""}${notes ? " has-notes" : ""}`}
    >
      <form
        method="post"
        action={`${path}/completion`}
        data-on:submit__prevent={`@post('${path}/completion', {contentType: 'form'})`}
      >
        {Object.entries(options).map(([key, value]) => (
          <input type="hidden" name={key} value={value} />
        ))}
        <input type="hidden" name="completed" value={String(!task.completed)} />
        <button
          class="task-toggle secondary"
          type="submit"
          aria-label={`${task.completed ? "Reopen" : "Complete"} task: ${task.title}`}
          aria-pressed={String(task.completed)}
        >
          <span class="task-checkbox" aria-hidden="true">
            {task.completed ? <Icon name="check" /> : null}
          </span>
        </button>
      </form>
      <div class="task-content">
        <a
          class="task-edit editable-row-link"
          href={editUrl}
          data-on:click__prevent={`@get('${editUrl}')`}
        >
          <span class="task-text">
            <span class="task-title">{task.title}</span>
            {notes ? <span class="task-notes">{notes}</span> : null}
          </span>
          {!compact && task.date ? (
            <time class="task-date" datetime={task.date}>
              <Icon name="calendar" />
              {new Date(`${task.date}T12:00`).toLocaleDateString("en", {
                month: "short",
                day: "numeric",
              })}
            </time>
          ) : null}
        </a>
      </div>
      <form
        class="task-actions"
        method="post"
        action={`${path}/delete`}
        data-on:submit__prevent={`@post('${path}/delete', {contentType: 'form'})`}
      >
        {Object.entries(options).map(([key, value]) => (
          <input type="hidden" name={key} value={value} />
        ))}
        <button
          type="submit"
          class="task-delete secondary"
          aria-label={`Delete task: ${task.title}`}
          title="Delete task"
        >
          <Icon name="trash" />
        </button>
      </form>
    </article>
  );
};
