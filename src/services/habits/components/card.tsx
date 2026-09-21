import type { HabitOccurrence } from "../schema";
import type { ViewOptions } from "@/services/workouts/helpers";
import { DeleteButton } from "@/routes/components/delete-button";
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
  return (
    <article
      class={`log-card ${compact ? "compact" : ""} ${completed ? "is-complete" : ""}`}
    >
      {!compact ? (
        <span class="item-icon habit-icon">
          <Icon name="habit" />
        </span>
      ) : null}
      <div class="log-content">
        <span class="log-kind">Habit · Daily</span>
        <div class="log-title">
          <h4>{habit.name}</h4>
          <span class={`badge ${completed ? "completed" : "planned"}`}>
            {completed ? "Completed" : "To do"}
          </span>
        </div>
        {!compact && habit.notes ? <p>{habit.notes}</p> : null}
      </div>
      <div class="log-actions">
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
            class="completion-button secondary"
            type="submit"
            aria-label={`${completed ? "Mark incomplete" : "Complete"}: ${habit.name} on ${date}`}
            aria-pressed={String(completed)}
            title={completed ? "Mark incomplete" : "Complete habit"}
          >
            <Icon name="check" />
          </button>
        </form>
        <DeleteButton
          kind="habit"
          id={habit.id}
          name={habit.name}
          options={options}
        />
      </div>
    </article>
  );
};
