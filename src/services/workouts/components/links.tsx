import type { Workout } from "../schema";
import { formatDate, formUrl, type ViewOptions } from "../helpers";

export const Link = ({
  label,
  url,
  active = false,
}: {
  readonly label: string;
  readonly url: string;
  readonly active?: boolean;
}) => (
  <a
    class={active ? "active" : ""}
    href={url}
    aria-current={active ? "page" : undefined}
  >
    {label}
  </a>
);

export const EditLink = ({
  workout,
  options,
}: {
  readonly workout: Workout;
  readonly options: ViewOptions;
}) => {
  const url = formUrl(options, "/workouts/new", {
    edit: workout.id,
  }).replaceAll("'", "%27");
  return (
    <a href={url} data-on:click__prevent={`@get('${url}')`}>
      Edit
      <span class="sr-only">
        {" "}
        {workout.activityType} {formatDate(workout.startDate)}
      </span>
    </a>
  );
};
