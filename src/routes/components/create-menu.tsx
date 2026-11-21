import { formUrl, type ViewOptions } from "@/services/workouts/helpers";
import { Icon } from "./icon";

export const CreateMenu = ({
  options,
  date,
  primary = !date,
}: {
  readonly options: ViewOptions;
  readonly date?: string;
  readonly primary?: boolean;
}) => {
  const suffix = date ? `-${date}` : "";
  const menuId = `create-menu-items${suffix}`;
  const workoutUrl = formUrl(options, "/workouts/new", { new: date ?? "true" });
  const habitUrl = formUrl(options, "/habits/new", { new: date ?? "true" });
  const taskUrl = formUrl(options, "/tasks/new", { new: date ?? "true" });
  const goalUrl = formUrl(options, "/timeline/goals/new", {
    planner: "true",
    day: date ?? "",
  });
  const timeUrl = formUrl(options, "/timeline/blocks/new", {
    planner: "true",
    day: date ?? "",
  });
  return (
    <div class="create-menu">
      <button
        type="button"
        id={`create-menu-trigger${suffix}`}
        class={primary ? "button" : "day-create-button secondary"}
        popovertarget={menuId}
        aria-label={date ? `Create an item on ${date}` : "Create an item"}
      >
        {!primary ? (
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
          id={`add-task${suffix}`}
          href={taskUrl}
          data-on:click__prevent={`@get('${taskUrl}')`}
        >
          <Icon name="task" /> Task
        </a>
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
        {options.view === "dashboard" ? (
          <a
            id="add-personal-goal"
            href="/goals/new"
            data-on:click__prevent="@get('/goals/new')"
          >
            <Icon name="target" /> Personal goal
          </a>
        ) : null}
        <a
          id={`add-goal${suffix}`}
          href={goalUrl}
          data-on:click__prevent={`@get('${goalUrl}')`}
        >
          <Icon name="target" /> Time goal
        </a>
        <a
          id={`add-time${suffix}`}
          href={timeUrl}
          data-on:click__prevent={`@get('${timeUrl}')`}
        >
          <Icon name="clock" /> Time
        </a>
      </nav>
    </div>
  );
};
