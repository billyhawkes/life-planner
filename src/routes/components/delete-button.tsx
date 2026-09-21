import type { ViewOptions } from "@/services/workouts/helpers";
import { Icon } from "./icon";

export const DeleteButton = ({
  kind,
  id,
  name,
  options,
}: {
  readonly kind: "workout" | "habit";
  readonly id: string;
  readonly name: string;
  readonly options: ViewOptions;
}) => {
  const action = `/${kind}s/${encodeURIComponent(id).replaceAll("'", "%27")}/delete`;
  return (
    <form
      method="post"
      action={action}
      data-on:submit__prevent={`@post('${action}', {contentType: 'form'})`}
    >
      {Object.entries(options).map(([key, value]) => (
        <input type="hidden" name={key} value={value} />
      ))}
      <button
        type="submit"
        class="delete-button"
        aria-label={`Delete ${kind}: ${name}`}
        title={
          kind === "habit"
            ? "Delete this habit and all its completion history"
            : "Delete this workout"
        }
      >
        <Icon name="trash" />
      </button>
    </form>
  );
};
