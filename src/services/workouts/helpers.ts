import type { Workout } from "./schema";

export type ViewOptions = {
  readonly view: "today" | "week" | "calendar" | "stats";
  readonly activity: string;
  readonly metric: string;
  readonly month: string;
  readonly search: string;
  readonly sort: string;
  readonly page: number;
};

export type WorkoutsProps = {
  readonly workouts: ReadonlyArray<Workout>;
  readonly options: ViewOptions;
};

export const readOptions = (values: Record<string, string>): ViewOptions => ({
  view:
    values.view === "overview" || values.view === "stats"
      ? "stats"
      : values.view === "week" || values.view === "calendar"
        ? values.view
        : "today",
  activity: values.activity === "cycling" ? "cycling" : "running",
  metric: values.metric === "distance" ? "distance" : "pace",
  month: /^\d{4}-(0[1-9]|1[0-2])$/.test(values.month ?? "")
    ? values.month
    : dateKey(new Date()).slice(0, 7),
  search: values.search ?? "",
  sort: values.sort ?? "-startDate",
  page: Math.max(1, Math.min(100000, Math.floor(Number(values.page) || 1))),
});

const numberFormatter = new Intl.NumberFormat("en", {
  maximumFractionDigits: 1,
});
export const formatNumber = (value: number) => numberFormatter.format(value);
export const formatPace = (value: number) => {
  const seconds = Math.round(value * 60);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};
export const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const localDateTime = (date: Date) =>
  `${dateKey(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
export const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
export const viewUrl = (
  options: ViewOptions,
  changes: Partial<ViewOptions> = {},
) =>
  `/workouts?${new URLSearchParams(Object.entries({ ...options, ...changes }).map(([key, value]) => [key, String(value)]))}`;
