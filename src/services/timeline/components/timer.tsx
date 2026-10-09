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
        <>
          <TimeForm
            action="/timeline/start"
            day={day}
            options={options}
            className="day-timer-start"
          >
            <LabelSelect labels={labels} selected={running?.labelId} compact />
            <button
              type="submit"
              class="timeline-play"
              title={running ? "Switch timer" : "Start timer"}
              aria-label={running ? "Switch timer" : "Start timer"}
            >
              ▶
            </button>
          </TimeForm>
          {running ? (
            <div class="day-timer-running">
              <span class="timeline-live" aria-label="Timer running">
                ●
              </span>
              <strong
                {...{
                  "data-on-interval__duration.1s": `const seconds = Math.max(0, Math.floor((Date.now() - ${Date.parse(running.startTime)}) / 1000)); el.textContent = Math.floor(seconds / 3600) + ':' + String(Math.floor(seconds / 60) % 60).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0')`,
                }}
              >{`${Math.floor(seconds / 3600)}:${String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`}</strong>
              <TimeForm
                action={`/timeline/blocks/${running.id}/stop`}
                day={day}
                options={options}
              >
                <button
                  type="submit"
                  class="timeline-stop secondary"
                  aria-label="Stop timer"
                  title="Stop timer"
                >
                  ■
                </button>
              </TimeForm>
            </div>
          ) : null}
        </>
      ) : (
        <span class="timeline-hint">+ → Goal to start tracking</span>
      )}
    </div>
  );
};
