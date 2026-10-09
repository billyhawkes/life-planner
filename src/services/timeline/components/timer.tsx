import { dateKey, type ViewOptions } from "@/services/workouts/helpers";
import type { TimeBlock, TimeLabel } from "../schema";
import { LabelSelect, TimeForm } from "./forms";

export const TimerControls = ({
  labels,
  blocks,
  options,
  day = dateKey(new Date()),
  className = "day-timer-controls",
}: {
  labels: readonly TimeLabel[];
  blocks: readonly TimeBlock[];
  options?: ViewOptions;
  day?: string;
  className?: string;
}) => {
  const running = blocks.find((block) => block.endTime === null);
  const seconds = running
    ? Math.max(
        0,
        Math.floor((Date.now() - Date.parse(running.startTime)) / 1000),
      )
    : 0;
  return (
    <div class={className} aria-label="Time tracker">
      {labels.length ? (
        <TimeForm
          action={
            running ? `/timeline/blocks/${running.id}/stop` : "/timeline/start"
          }
          day={day}
          options={options}
          className="day-timer-start"
        >
          <LabelSelect
            labels={labels}
            selected={running?.labelId}
            compact
            disabled={Boolean(running)}
          />
          {running ? (
            <div class="day-timer-running">
              <button
                type="submit"
                class="timeline-stop secondary"
                aria-label="Stop timer"
                title="Stop timer"
              >
                ■
              </button>
              <strong
                aria-label="Elapsed time"
                {...{
                  "data-on-interval__duration.1s": `const seconds = Math.max(0, Math.floor((Date.now() - ${Date.parse(running.startTime)}) / 1000)); el.textContent = Math.floor(seconds / 3600) + ':' + String(Math.floor(seconds / 60) % 60).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0')`,
                }}
              >{`${Math.floor(seconds / 3600)}:${String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`}</strong>
            </div>
          ) : (
            <button
              type="submit"
              class="timeline-play"
              title="Start timer"
              aria-label="Start timer"
            >
              ▶
            </button>
          )}
        </TimeForm>
      ) : (
        <span class="timeline-hint">+ → Goal to start tracking</span>
      )}
    </div>
  );
};
