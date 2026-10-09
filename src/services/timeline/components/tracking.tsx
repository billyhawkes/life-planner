import {
  dateKey,
  viewUrl,
  type ViewOptions,
} from "@/services/workouts/helpers";
import { blockMinutes, duration, weeklyMinutes } from "../helpers";
import type { TimeBlock, TimeLabel } from "../schema";
import { GoalForm } from "./goal-form";
import { BlockForm } from "./block-form";

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
  const progress = (
    name: string,
    minutes: number,
    target: number,
    period: string,
  ) => (
    <div class="timeline-goal-progress">
      <span>
        {period}: {duration(minutes)} / {duration(target)}
      </span>
      <progress
        max={target}
        value={Math.min(minutes, target)}
        aria-label={`${name} ${period.toLowerCase()} goal`}
      />
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
      {error && values.operation !== "label" && values.operation !== "block" ? (
        <p class="timeline-error" role="alert">
          {error}
        </p>
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
            return (
              <article class="card timeline-goal">
                <h3>
                  <a
                    href={url}
                    data-on:click__prevent={`@get('${url}')`}
                    style={`color:${label.color}`}
                  >
                    {label.name}
                  </a>
                </h3>
                <strong>{duration(minutes)}</strong>
                <p>
                  {target
                    ? `of ${duration(target)} ${weekly ? "weekly" : "daily"} goal`
                    : `tracked ${weekly ? "this week" : "today"}`}
                </p>
                {target ? (
                  <progress
                    max={target}
                    value={Math.min(minutes, target)}
                    aria-label={`${label.name} ${weekly ? "weekly" : "daily"} goal`}
                  />
                ) : null}
                {weekly && label.goalMinutes
                  ? progress(
                      label.name,
                      dailyMinutes,
                      label.goalMinutes,
                      "Daily",
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
