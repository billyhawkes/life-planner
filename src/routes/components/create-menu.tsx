import { viewUrl, type ViewOptions } from "@/services/workouts/helpers";
import { Icon } from "./icon";

export const CreateMenu = ({
  options,
  date,
}: {
  readonly options: ViewOptions;
  readonly date?: string;
}) => {
  const suffix = date ? `-${date}` : "";
  const menuId = `create-menu-items${suffix}`;
  const workoutUrl = `${viewUrl(options)}&new=${date ?? "true"}`;
  const habitUrl = workoutUrl.replace("/workouts?", "/habits/new?");
  return (
    <div class="create-menu">
      <button
        type="button"
        id={`create-menu-trigger${suffix}`}
        class={date ? "day-create-button secondary" : "button"}
        popovertarget={menuId}
        aria-label={date ? `Create an item on ${date}` : "Create an item"}
      >
        {date ? (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M8 3v10M3 8h10" />
          </svg>
        ) : (
          <>
            <Icon name="plus" /> Create <Icon name="chevron" />
          </>
        )}
      </button>
      <nav
        id={menuId}
        popover="auto"
        aria-label={date ? `Create on ${date}` : "Create an item"}
        class="create-menu-items"
      >
        <a
          id={`add-workout${suffix}`}
          href={workoutUrl}
          data-on:click__prevent={`@get('${workoutUrl}')`}
        >
          <Icon name="workout" /> Workout
        </a>
        <a
          id={`add-habit${suffix}`}
          href={habitUrl}
          data-on:click__prevent={`@get('${habitUrl}')`}
        >
          <Icon name="habit" /> Habit
        </a>
      </nav>
    </div>
  );
};
