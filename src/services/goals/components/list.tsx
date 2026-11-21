import { Icon } from "@/routes/components/icon";
import { goalStatuses, type Goal } from "../schema";

export const PersonalGoals = ({ goals }: { goals: readonly Goal[] }) => (
  <section
    class="card dashboard-card personal-goals"
    aria-labelledby="homepage-goals-title"
  >
    <header class="task-list-heading">
      <h2 id="homepage-goals-title">
        <Icon name="target" /> Personal goals
      </h2>
      <a
        class="task-add"
        href="/goals/new"
        data-on:click__prevent="@get('/goals/new')"
      >
        <Icon name="plus" /> Add goal
      </a>
    </header>
    {goals.length ? (
      goals.map((goal) => {
        const edit = `/goals/new?${new URLSearchParams({ edit: goal.id })}`;
        const remove = `/goals/${encodeURIComponent(goal.id)}/delete`;
        return (
          <article class="editable-row personal-goal-row">
            <div>
              <a
                class="task-title editable-row-link"
                href={edit}
                data-on:click__prevent={`@get(${JSON.stringify(edit)})`}
              >
                {goal.title}
              </a>
              {goal.notes ? <p>{goal.notes}</p> : null}
            </div>
            <span class={`personal-goal-status ${goal.status}`}>
              {goalStatuses[goal.status]}
            </span>
            <form
              method="post"
              action={remove}
              data-on:submit__prevent={`@post(${JSON.stringify(remove)}, {contentType: 'form'})`}
            >
              <button
                type="submit"
                class="task-delete secondary"
                aria-label={`Delete goal: ${goal.title}`}
              >
                <Icon name="trash" />
              </button>
            </form>
          </article>
        );
      })
    ) : (
      <p class="day-empty">What would you like to work toward?</p>
    )}
  </section>
);
