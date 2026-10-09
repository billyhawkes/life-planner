import type { Html } from "@/lib/datastar";
import type { TimeLabel } from "../schema";
import type { ViewOptions } from "@/services/workouts/helpers";

export const TimeForm = ({
  action,
  day,
  children,
  className,
  options,
  id,
}: {
  action: string;
  day: string;
  children: Html | readonly Html[];
  className?: string;
  options?: ViewOptions;
  id?: string;
}) => (
  <form
    id={id}
    method="post"
    action={action}
    class={className}
    data-on:submit__prevent={`@post('${action}', {contentType: 'form'})`}
  >
    <input type="hidden" name="day" value={day} />
    {options ? (
      <>
        <input type="hidden" name="planner" value="true" />
        {Object.entries(options).map(([key, value]) => (
          <input type="hidden" name={key} value={value} />
        ))}
      </>
    ) : null}
    {children}
  </form>
);
export const LabelSelect = ({
  labels,
  selected,
  compact = false,
  disabled = false,
}: {
  labels: readonly TimeLabel[];
  selected?: string;
  compact?: boolean;
  disabled?: boolean;
}) => (
  <label>
    <span class={compact ? "sr-only" : undefined}>Label</span>
    <select name="labelId" required disabled={disabled}>
      {labels.map((label) => (
        <option value={label.id} selected={label.id === selected}>
          {label.name}
        </option>
      ))}
    </select>
  </label>
);
