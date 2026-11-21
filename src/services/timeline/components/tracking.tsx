import {
  dateKey,
  viewUrl,
  formUrl,
  type ViewOptions,
} from "@/services/workouts/helpers";
import { blockMinutes, duration, weeklyMinutes } from "../helpers";
import type { TimeBlock, TimeLabel } from "../schema";
import { GoalForm } from "./goal-form";
import { BlockForm } from "./block-form";
import { TimeForm } from "./forms";
import { Icon } from "@/routes/components/icon";

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
  const compactDuration = (minutes: number) => {
    const total = Math.floor(minutes);
    if (total < 60) return `${total}m`;
    return total % 60 ? duration(total) : `${total / 60}h`;
  };
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
    period: "Daily" | "Weekly",
    goalType: TimeLabel["goalType"],
    showPeriod: boolean,
  ) => {
    const overMaximum = goalType === "maximum" && minutes > target;
    return (
      <div
        class={`timeline-goal-progress${overMaximum ? " is-over-maximum" : ""}`}
      >
        {showPeriod ? <span class="timeline-goal-period">{period}</span> : null}
        <progress
          max={target}
          value={Math.min(minutes, target)}
          aria-label={`${name} ${period.toLowerCase()} goal`}
          aria-valuetext={`${duration(minutes)} tracked of ${duration(target)} ${goalType}. ${status(minutes, target, goalType)}`}
        />
        <span class="timeline-goal-badge">
          {compactDuration(minutes)} / {compactDuration(target)}
        </span>
      </div>
    );
  };
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
        <div
          class={
            options?.view === "week"
              ? "tracking-goal-list"
              : options?.view === "dashboard"
                ? "tracking-goal-list time-goal-rows"
                : "card tracking-goal-list time-goal-rows"
          }
        >
          {labels.map((label) => {
            const matching = blocks.filter(
              (block) => block.labelId === label.id,
            );
            const url = options
              ? formUrl(options, "/timeline/goals/new", {
                  planner: "true",
                  edit: label.id,
                  day,
                })
              : `/timeline/goals/new?edit=${label.id}&day=${day}`;
            const dailyMinutes = matching.reduce(
              (sum, block) => sum + blockMinutes(block, day, now),
              0,
            );
            const weekly =
              options?.view === "week" || label.weeklyGoalMinutes > 0;
            const minutes = weekly
              ? weeklyMinutes(matching, day, now)
              : dailyMinutes;
            const target = weekly ? label.weeklyGoalMinutes : label.goalMinutes;
            if (options?.view === "week") {
              const overMaximum =
                label.goalType === "maximum" && target > 0 && minutes > target;
              const hours = (value: number) =>
                Math.round((value / 60) * 10) / 10;
              return (
                <a
                  class={`weekly-time-total${overMaximum ? " is-over-maximum" : ""}`}
                  href={url}
                  data-on:click__prevent={`@get('${url}')`}
                  title={
                    target > 0
                      ? status(minutes, target, label.goalType)
                      : "Weekly tracked time"
                  }
                  style={`--label-color:${label.color}`}
                >
                  {target > 0 ? (
                    <progress
                      class="weekly-time-progress"
                      max={target}
                      value={Math.min(minutes, target)}
                      aria-label={`${label.name} weekly goal`}
                    />
                  ) : null}
                  <span>{label.name}</span>
                  <strong>
                    {hours(minutes)}h{target > 0 ? `/${hours(target)}` : ""}
                  </strong>
                </a>
              );
            }
            return (
              <article class="editable-row timeline-goal">
                <h3 class="time-goal-name">
                  <a
                    class="editable-row-link"
                    href={url}
                    data-on:click__prevent={`@get('${url}')`}
                  >
                    <i
                      class="time-goal-dot"
                      style={`background:${label.color}`}
                      aria-hidden="true"
                    />
                    {label.name}
                    <Icon name="edit" />
                  </a>
                </h3>
                {target ? (
                  <div class="timeline-goal-periods">
                    {label.goalMinutes > 0
                      ? progress(
                          label.name,
                          dailyMinutes,
                          label.goalMinutes,
                          "Daily",
                          label.goalType,
                          weekly,
                        )
                      : null}
                    {weekly
                      ? progress(
                          label.name,
                          minutes,
                          target,
                          "Weekly",
                          label.goalType,
                          label.goalMinutes > 0,
                        )
                      : null}
                  </div>
                ) : (
                  <p class="time-goal-target">
                    <strong>{duration(minutes)}</strong> tracked today
                  </p>
                )}
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
};
