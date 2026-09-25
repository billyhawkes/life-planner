import type { HabitOccurrence } from "../schema";
import type { ViewOptions } from "@/services/workouts/helpers";
import { viewUrl } from "@/services/workouts/helpers";
import { Icon } from "@/routes/components/icon";

export const HabitCard = ({
  occurrence,
  options,
  compact = false,
}: {
  readonly occurrence: HabitOccurrence;
  readonly options: ViewOptions;
  readonly compact?: boolean;
}) => {
  const { habit, date, completed } = occurrence;
  const action = `/habits/${encodeURIComponent(habit.id).replaceAll("'", "%27")}/completion`;
  const deleteAction = `/habits/${encodeURIComponent(habit.id).replaceAll("'", "%27")}/delete`;
  const editUrl = `${viewUrl(options).replace("/workouts?", "/habits/new?")}&edit=${encodeURIComponent(habit.id).replaceAll("'", "%27")}`;
  const menuId = `habit-menu-${habit.id}-${date}`;
  return (
    <article
      class={`habit-control ${compact ? "compact" : ""} ${completed ? "is-complete" : ""}`}
      data-context-menu={menuId}
    >
      <form
        method="post"
        action={action}
        data-on:submit__prevent={`@post('${action}', {contentType: 'form'})`}
      >
        {Object.entries(options).map(([key, value]) => (
          <input type="hidden" name={key} value={value} />
        ))}
        <input type="hidden" name="date" value={date} />
        <input type="hidden" name="completed" value={String(!completed)} />
        <button
          class="habit-toggle secondary"
          type="submit"
          aria-label={`${completed ? "Mark incomplete" : "Complete"}: ${habit.name} on ${date}`}
          aria-pressed={String(completed)}
          title={`${completed ? "Mark incomplete" : "Complete"}. Right-click for habit actions.`}
        >
          <span class="habit-symbol" aria-hidden="true">
            <Icon name={habit.icon} />
          </span>
          <span class="habit-name">{habit.name}</span>
        </button>
      </form>
      <nav
        id={menuId}
        popover="auto"
        class="create-menu-items habit-context-menu"
        aria-label={`Actions for ${habit.name}`}
      >
        <a href={editUrl} data-on:click__prevent={`@get('${editUrl}')`}>
          <Icon name="edit" /> Edit
        </a>
        <form
          method="post"
          action={deleteAction}
          data-on:submit__prevent={`@post('${deleteAction}', {contentType: 'form'})`}
        >
          {Object.entries(options).map(([key, value]) => (
            <input type="hidden" name={key} value={value} />
          ))}
          <button
            type="submit"
            aria-label={`Delete habit: ${habit.name}`}
            title="Delete this habit and all its completion history"
          >
            <Icon name="trash" /> Delete
          </button>
        </form>
      </nav>
    </article>
  );
};
