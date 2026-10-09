import {
  dateKey,
  viewUrl,
  type ViewOptions,
} from "@/services/workouts/helpers";
import { blockMinutes, duration, weeklyMinutes } from "../helpers";
import type { TimeBlock, TimeLabel } from "../schema";
import { GoalForm } from "./goal-form";
import { BlockForm } from "./block-form";
import { TimeForm } from "./forms";

export const TrackingControls = ({
  labels,
  blocks,
  day = dateKey(new Date()),
  options,
  error,
  values = {},
  showGoals = true,
}: {
  labels: readonly TimeLabel[];
  blocks: readonly TimeBlock[];
  day?: string;
  options?: ViewOptions;
  error?: string;
  values?: Record<string, string>;
  showGoals?: boolean;
}) => {
  const now = Date.now();
  const confirmStart =
    values.operation === "start" && values.confirmStart === "true";
  const closeUrl = options ? viewUrl(options) : `/timeline?day=${day}`;
  const percentage = (minutes: number, target: number) =>
    `${Math.round((minutes / target) * 100)}%`;
  const status = (
    minutes: number,
    target: number,
    goalType: TimeLabel["goalType"],
  ) =>
    goalType === "maximum"
      ? minutes > target
        ? `${duration(minutes - target)} over maximum`
        : minutes === target
          ? "Maximum reached"
          : `${duration(target - minutes)} available`
      : minutes >= target
        ? "Minimum met"
        : `${duration(target - minutes)} to minimum`;
  const progress = (
    name: string,
    minutes: number,
    target: number,
    period: string,
    goalType: TimeLabel["goalType"],
  ) => (
    <div
      class={`timeline-goal-progress${goalType === "maximum" && minutes > target ? " is-over-maximum" : ""}`}
    >
      <div class="timeline-goal-detail">
        <span>
          {period}: {duration(minutes)} / {duration(target)}
        </span>
        <span
          class="timeline-goal-percentage"
          aria-label={`${period} ${percentage(minutes, target)} of ${goalType}`}
        >
          {percentage(minutes, target)}
        </span>
      </div>
      <progress
        max={target}
        value={Math.min(minutes, target)}
        aria-label={`${name} ${period.toLowerCase()} goal`}
      />
      <p class="timeline-goal-status">{status(minutes, target, goalType)}</p>
    </div>
  );
  return (
    <section class="tracking-controls" aria-label="Time goals">
      {values.operation === "label" && options ? (
        <GoalForm
          labels={labels}
          day={day}
          options={options}
          error={error}
          values={values}
        />
      ) : (
        <section id="goal-form" />
      )}
      {values.operation === "block" ? (
        <BlockForm
          labels={labels}
          blocks={blocks}
          options={options}
          values={values}
          error={error}
        />
      ) : (
        <section id="time-block-form" />
      )}
      {error &&
      !confirmStart &&
      values.operation !== "label" &&
      values.operation !== "block" ? (
        <p class="timeline-error" role="alert">
          {error}
        </p>
      ) : null}
      {confirmStart ? (
        <dialog
          id="maximum-warning-dialog"
          class="form-dialog"
          open
          role="alertdialog"
          aria-labelledby="maximum-warning-title"
          aria-describedby="maximum-warning-message"
        >
          <header class="dialog-heading">
            <h2 id="maximum-warning-title">Time maximum reached</h2>
            <a
              class="dialog-close"
              href={closeUrl}
              data-dialog-close=""
              aria-label="Close maximum warning"
            >
              ×
            </a>
          </header>
          <p
            id="maximum-warning-message"
            class="timeline-error"
            role="alert"
            tabindex="-1"
          >
            {error}
          </p>
          <TimeForm action="/timeline/start" day={day} options={options}>
            <input type="hidden" name="labelId" value={values.labelId} />
            <input type="hidden" name="confirmMaximum" value="true" />
            <button type="submit">Start anyway</button>
            <a class="button secondary" href={closeUrl} data-dialog-close="">
              Cancel
            </a>
          </TimeForm>
        </dialog>
      ) : null}
      {showGoals && labels.length ? (
        <div class="stats tracking-goal-list">
          {labels.map((label) => {
            const matching = blocks.filter(
              (block) => block.labelId === label.id,
            );
            const url = options
              ? `${viewUrl(options).replace("/workouts?", "/timeline/goals/new?")}&planner=true&edit=${label.id}&day=${day}`
              : `/timeline/goals/new?edit=${label.id}&day=${day}`;
            const dailyMinutes = matching.reduce(
              (sum, block) => sum + blockMinutes(block, day, now),
              0,
            );
            const weekly =
              label.weeklyGoalMinutes > 0 ||
              (!label.goalMinutes && options?.view === "week");
            const minutes = weekly
              ? weeklyMinutes(matching, day, now)
              : dailyMinutes;
            const target = weekly ? label.weeklyGoalMinutes : label.goalMinutes;
            const overMaximum =
              label.goalType === "maximum" &&
              ((target > 0 && minutes > target) ||
                (label.goalMinutes > 0 && dailyMinutes > label.goalMinutes));
            return (
              <article
                class={`card timeline-goal${overMaximum ? " is-over-maximum" : ""}`}
              >
                <h3>
                  <a
                    href={url}
                    data-on:click__prevent={`@get('${url}')`}
                    style={`color:${label.color}`}
                  >
                    {label.name}
                  </a>
                </h3>
                <div class="timeline-goal-metric">
                  <strong>{duration(minutes)}</strong>
                  {target > 0 ? (
                    <span
                      class="timeline-goal-percentage"
                      aria-label={`${weekly ? "Weekly" : "Daily"} ${percentage(minutes, target)} of ${label.goalType}`}
                    >
                      {percentage(minutes, target)}
                    </span>
                  ) : null}
                </div>
                <p>
                  {target
                    ? `of ${duration(target)} ${weekly ? "weekly" : "daily"} ${label.goalType}`
                    : `tracked ${weekly ? "this week" : "today"}`}
                </p>
                {target ? (
                  <>
                    <progress
                      max={target}
                      value={Math.min(minutes, target)}
                      aria-label={`${label.name} ${weekly ? "weekly" : "daily"} goal`}
                    />
                    <p class="timeline-goal-status">
                      {status(minutes, target, label.goalType)}
                    </p>
                  </>
                ) : null}
                {weekly && label.goalMinutes
                  ? progress(
                      label.name,
                      dailyMinutes,
                      label.goalMinutes,
                      "Daily",
                      label.goalType,
                    )
                  : null}
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
};
