import {
  blockMinutes,
  dayRange,
  duration,
  timelineWindow,
  type TimelineWindow,
} from "../helpers";
import type { TimeBlock, TimeLabel } from "../schema";
import {
  dateKey,
  viewUrl,
  type ViewOptions,
} from "@/services/workouts/helpers";
import { TimerControls } from "./timer";

export const TimeTrackedSummary = ({
  blocks,
  day,
  now = Date.now(),
}: {
  blocks: readonly TimeBlock[];
  day: string;
  now?: number;
}) => (
  <div class="timeline-section-heading">
    <span>
      {duration(
        blocks.reduce((sum, block) => sum + blockMinutes(block, day, now), 0),
      )}{" "}
      tracked
    </span>
  </div>
);

export const DayTimeline = ({
  labels,
  blocks,
  day,
  options,
  window = timelineWindow(blocks, [day]),
  showHours = true,
  showSummary = true,
}: {
  labels: readonly TimeLabel[];
  blocks: readonly TimeBlock[];
  day: string;
  options?: ViewOptions;
  window?: TimelineWindow;
  showHours?: boolean;
  showSummary?: boolean;
}) => {
  const now = Date.now();
  const today = day === dateKey(new Date());
  const range = dayRange(day);
  const start = new Date(
    `${day}T${String(window.startHour).padStart(2, "0")}:00:00`,
  ).getTime();
  const endDate = new Date(`${day}T00:00:00`);
  endDate.setHours(window.endHour);
  const end = endDate.getTime();
  const visible = blocks.filter(
    (block) =>
      Date.parse(block.startTime) < range.end &&
      Date.parse(block.endTime ?? new Date(now).toISOString()) > range.start,
  );
  const clock = (time: string) =>
    new Date(time).toLocaleTimeString("en", {
      hour: "2-digit",
      minute: "2-digit",
    });
  const url = (edit?: string, hour?: number) => {
    const base = options
      ? viewUrl(options).replace("/workouts?", "/timeline/blocks/new?") +
        "&planner=true"
      : "/timeline/blocks/new?";
    return `${base}&day=${day}${edit ? `&edit=${encodeURIComponent(edit)}` : ""}${hour !== undefined ? `&startTime=${day}T${String(hour).padStart(2, "0")}:00` : ""}`;
  };
  return (
    <section
      class={`day-timeline ${today ? "is-today" : ""} ${showHours ? "has-hour-labels" : ""}`}
      aria-label={`Time tracked on ${day}`}
    >
      {showSummary ? (
        <TimeTrackedSummary blocks={visible} day={day} now={now} />
      ) : null}
      {today && !options ? (
        <TimerControls
          labels={labels}
          blocks={blocks}
          options={options}
          day={day}
        />
      ) : null}
      <div
        class="timeline-scale"
        style={`--timeline-hours:${window.endHour - window.startHour}`}
        aria-label="Daily time grid"
      >
        {Array.from(
          { length: window.endHour - window.startHour },
          (_, index) => {
            const hour = window.startHour + index;
            const hourDate = new Date(
              `${day}T${String(hour).padStart(2, "0")}:00:00`,
            );
            const top = ((hourDate.getTime() - start) / (end - start)) * 100;
            return (
              <div class="timeline-hour" style={`top:${top}%`}>
                {hour !== 0 ? (
                  <span aria-hidden={!showHours}>
                    {String(hour).padStart(2, "0")}:00
                  </span>
                ) : null}
                {labels.length ? (
                  <a
                    class="timeline-slot"
                    href={url(undefined, hour)}
                    data-on:click__prevent={`@get('${url(undefined, hour)}')`}
                    aria-label={`Add time at ${String(hour).padStart(2, "0")}:00 on ${day}`}
                  >
                    <span>+ Add time</span>
                  </a>
                ) : null}
              </div>
            );
          },
        )}
        {visible.map((block) => {
          const label = labels.find((label) => label.id === block.labelId);
          const minutes = blockMinutes(block, day, now);
          const top =
            ((Math.max(Date.parse(block.startTime), start) - start) /
              (end - start)) *
            100;
          const height = ((minutes * 60000) / (end - start)) * 100;
          return (
            <a
              id={`block-${day}-${block.id}`}
              class={`timeline-block ${block.endTime === null ? "is-running" : ""} ${minutes < 35 ? "is-short" : ""}`}
              href={url(block.id)}
              data-on:click__prevent={`@get('${url(block.id)}')`}
              style={`top:${top}%;height:${height}%;--label-color:${label?.color ?? "#15803d"}`}
              title={`${label?.name}: ${clock(block.startTime)} – ${block.endTime ? clock(block.endTime) : "now"} · ${duration(minutes)}${block.notes ? ` · ${block.notes}` : ""}`}
            >
              <strong>{block.notes || label?.name}</strong>
              {block.notes ? (
                <span class="timeline-block-label">{label?.name}</span>
              ) : null}
              <span class="timeline-block-time">
                {clock(block.startTime)} –{" "}
                {block.endTime ? clock(block.endTime) : "now"}
              </span>
              <span class="timeline-block-duration">
                {duration(minutes)}
                {block.endTime === null ? " · Running" : ""}
              </span>
            </a>
          );
        })}
        {today && now >= start && now <= end ? (
          <div
            class="timeline-now"
            style={`top:${((now - start) / (end - start)) * 100}%`}
            aria-label={`Current time ${clock(new Date(now).toISOString())}`}
          >
            <span>{clock(new Date(now).toISOString())}</span>
          </div>
        ) : null}
      </div>
    </section>
  );
};
