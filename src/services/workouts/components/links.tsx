import type { Workout } from "../schema";
import { formatDate, viewUrl, type ViewOptions } from "../helpers";

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
  const url = `${viewUrl(options)}&edit=${encodeURIComponent(workout.id).replaceAll("'", "%27")}`;
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
