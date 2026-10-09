import {
  dateKey,
  readOptions,
  viewUrl,
  type ViewOptions,
} from "@/services/workouts/helpers";
import { blockDateTime, selectedDay } from "../helpers";
import type { TimeBlock, TimeLabel } from "../schema";
import { LabelSelect, TimeForm } from "./forms";
import { TimerControls } from "./timer";

export const BlockForm = ({
  labels,
  blocks,
  options = readOptions({}),
  values = {},
  error,
}: {
  labels: readonly TimeLabel[];
  blocks: readonly TimeBlock[];
  options?: ViewOptions;
  values?: Record<string, string>;
  error?: string;
}) => {
  const block = blocks.find(
    (entry) => entry.id === (values.editBlock ?? values.edit),
  );
  const day = selectedDay(values.day);
  const retry = values.operation === "block";
  const action = block ? `/timeline/blocks/${block.id}` : "/timeline/blocks";
  const closeUrl =
    values.planner === "true" ? viewUrl(options) : `/timeline?day=${day}`;
  const start =
    values.startTime && Number.isFinite(Date.parse(values.startTime))
      ? values.startTime
      : day === dateKey(new Date())
        ? blockDateTime(
            new Date(
              Math.floor(Date.now() / 60000) * 60000 - 30 * 60000,
            ).toISOString(),
          )
        : `${day}T09:00`;
  const defaultEnd = blockDateTime(
    new Date(
      Math.min(Date.parse(start) + 60 * 60000, Date.now()),
    ).toISOString(),
  );
  return (
    <section id="time-block-form">
      <dialog
        id="time-block-dialog"
        class="form-dialog"
        open
        aria-labelledby="time-block-title"
      >
        <header class="dialog-heading">
          <div>
            <h2 id="time-block-title">
              {block ? "Edit time block" : "Add time block"}
            </h2>
            <p>
              {new Date(`${day}T12:00:00`).toLocaleDateString("en", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <a
            class="dialog-close"
            href={closeUrl}
            data-dialog-close=""
            aria-label="Close time block form"
          >
            ×
          </a>
        </header>
        {error ? (
          <p class="timeline-error" role="alert">
            {error}
          </p>
        ) : null}
        {day === dateKey(new Date()) ? (
          <section
            class="time-dialog-timer-section"
            aria-label="Timer controls"
          >
            <h3>Timer</h3>
            <TimerControls
              labels={labels}
              blocks={blocks}
              day={day}
              options={values.planner === "true" ? options : undefined}
              className="day-timer-controls time-dialog-timer"
            />
          </section>
        ) : null}
        <TimeForm
          id="time-block-edit"
          action={action}
          day={day}
          options={values.planner === "true" ? options : undefined}
        >
          <div class="form-grid">
            <div class="wide">
              <LabelSelect
                labels={labels}
                selected={retry ? values.labelId : block?.labelId}
              />
            </div>
            <label>
              Start
              <input
                type="datetime-local"
                name="startTime"
                step="any"
                value={
                  retry
                    ? values.startTime
                    : block
                      ? blockDateTime(block.startTime)
                      : start
                }
                required
              />
            </label>
            <label>
              {block?.endTime === null ? "End (blank to keep running)" : "End"}
              <input
                type="datetime-local"
                name="endTime"
                step="any"
                value={
                  retry
                    ? values.endTime
                    : block
                      ? block.endTime
                        ? blockDateTime(block.endTime)
                        : ""
                      : defaultEnd
                }
                required={!block || block.endTime !== null}
              />
            </label>
            <label class="wide">
              Notes
              <textarea
                name="notes"
                maxlength="2000"
                placeholder="What did you spend this time on?"
              >
                {retry ? values.notes : (block?.notes ?? "")}
              </textarea>
            </label>
          </div>
        </TimeForm>
        <footer class="time-block-actions">
          <button type="submit" form="time-block-edit">
            {block ? "Save changes" : "Add block"}
          </button>
          {block ? (
            <TimeForm
              action={`/timeline/blocks/${block.id}/delete`}
              day={day}
              options={values.planner === "true" ? options : undefined}
            >
              <button type="submit" class="danger">
                Delete block
              </button>
            </TimeForm>
          ) : null}
        </footer>
      </dialog>
    </section>
  );
};
