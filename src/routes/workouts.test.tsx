import { describe, expect, it } from "bun:test";
import { readOptions } from "@/services/workouts/helpers";
import { ScheduleDays } from "./components/schedule";
import { renderDashboard } from "./workouts";
import { TrainingChart } from "@/services/workouts/components/training-chart";

describe("planner layout", () => {
  it("defaults training history to all time and preserves the range in chart links", () => {
    expect(readOptions({}).range).toBe("all");
    expect(readOptions({ range: "invalid" }).range).toBe("all");
    for (const range of ["30", "90", "365", "all"] as const) {
      const options = readOptions({ view: "stats", range });
      expect(options.range).toBe(range);
      const chart = TrainingChart({ workouts: [], options }).value;
      expect(chart).toContain('aria-label="Chart time range"');
      expect(chart).toContain("30 days");
      expect(chart).toContain("90 days");
      expect(chart).toContain("1 year");
      expect(chart).toContain("All time");
      expect(chart).toContain(
        `activity=cycling&amp;metric=pace&amp;range=${range}`,
      );
    }
  });

  it("shows time stats and navigation for the selected week, not Stats", () => {
    const timeline = {
      labels: [
        {
          id: "work",
          name: "Work",
          color: "#15803d",
          goalType: "maximum" as const,
          goalMinutes: 0,
          weeklyGoalMinutes: 2400,
        },
      ],
      blocks: [
        {
          id: "selected",
          labelId: "work",
          startTime: new Date("2025-12-30T09:00").toISOString(),
          endTime: new Date("2025-12-30T11:00").toISOString(),
          notes: "",
        },
        {
          id: "other",
          labelId: "work",
          startTime: new Date("2026-01-05T09:00").toISOString(),
          endTime: new Date("2026-01-05T12:00").toISOString(),
          notes: "",
        },
      ],
    };
    const page = renderDashboard(
      { view: "week", days: [], timeline },
      readOptions({ view: "week", week: "2025-12-29" }),
    ).value;
    expect(page).toContain("Week navigation");
    expect(page).toContain("Previous week");
    expect(page).toContain("Next week");
    expect(page).toContain("week=2025-12-22");
    expect(page).toContain("week=2026-01-05");
    expect(page).toContain("Dec 29, 2025 – Jan 4, 2026");
    expect(page).toContain("<strong>2h/40</strong>");
    const headerStart = page.indexOf('aria-label="Week navigation"');
    const headerEnd = page.indexOf("</header>", headerStart);
    const badge = page.indexOf('class="weekly-time-total"');
    expect(badge).toBeGreaterThan(headerStart);
    expect(badge).toBeLessThan(headerEnd);
    expect(page).not.toContain('class="stats tracking-goal-list"');
    expect(page).not.toContain("<strong>3h/40</strong>");
    const stats = renderDashboard(
      {
        view: "stats",
        timeline,
        overview: {
          completedCount: 0,
          distanceKilometres: 0,
          currentPace: undefined,
          trends: [],
        },
      },
      readOptions({ view: "stats" }),
    ).value;
    expect(stats).not.toContain("tracking-goal-list");
    expect(stats).toContain("Workout overview");
  });
  it.each(["today", "week"] as const)(
    "shows all 24 hours in the %s timeline",
    (view) => {
      const page = renderDashboard(
        {
          view,
          days: [
            { date: new Date("2026-02-01T12:00:00"), workouts: [], habits: [] },
          ],
          timeline: { labels: [], blocks: [] },
        },
        readOptions({ view }),
      ).value;

      expect(page).toContain('style="--timeline-hours:24"');
      expect(page.match(/class="timeline-hour"/g)).toHaveLength(24);
      expect(page).not.toContain("00:00</span>");
      expect(page).toContain("23:00</span>");
      if (view === "week") {
        const pinnedStart = page.indexOf('class="schedule-day-top"');
        const tracked = page.indexOf("tracked</span>", pinnedStart);
        const timeline = page.indexOf('class="day-timeline', pinnedStart);

        expect(pinnedStart).toBeGreaterThan(-1);
        expect(tracked).toBeGreaterThan(pinnedStart);
        expect(tracked).toBeLessThan(timeline);
        expect(page.match(/tracked<\/span>/g)).toHaveLength(1);
      }
    },
  );
  it.each(["today", "week", "calendar"] as const)(
    "separates responsive navigation from the %s content",
    (view) => {
      const page = renderDashboard(
        { view, days: [] },
        readOptions({ view }),
      ).value;

      expect(page).toContain(`class="planner-page planner-view-${view}"`);
      expect(page).toContain('</footer><div class="planner-content">');
      expect(page).toContain('aria-label="Planner navigation"');
      expect(page).not.toContain('class="planner-brand"');
      expect(page).not.toContain('id="import-menu-trigger"');
      expect(page).toContain("<span>Menu</span>");
      expect(page).not.toContain('role="search"');
      expect(page).toContain('aria-label="Planner views"');
    },
  );

  it("puts import on the Menu page with native and Datastar navigation", () => {
    const page = renderDashboard(
      { view: "menu" },
      readOptions({ view: "menu" }),
    ).value;
    expect(page).toContain('class="planner-page planner-view-menu"');
    expect(page).toContain('<h1 id="menu-title">Menu</h1>');
    expect(page).toContain('id="menu-import-trigger"');
    expect(page).toContain("view=menu");
    expect(page).toContain("import=true");
    expect(page).toContain("data-on:click__prevent=");
    expect(page).not.toContain('class="mobile-search"');
    expect(page).not.toContain('class="daily-plans');
    expect(page.indexOf('id="menu-import-trigger"')).toBeGreaterThan(
      page.indexOf("</footer>"),
    );
  });

  it("does not render search controls, even for bookmarked search URLs", () => {
    const page = renderDashboard(
      { view: "today", days: [] },
      readOptions({ view: "today", search: "Morning run" }),
    ).value;
    expect(page).not.toContain('class="mobile-search"');
    expect(page).not.toContain('role="search"');
    expect(page).toContain('aria-current="page"');
  });

  it.each([28, 35, 42])(
    "sets the calendar row count for a %s-day month grid",
    (count) => {
      const calendar = ScheduleDays({
        month: new Date("2026-02-01T12:00:00"),
        days: Array.from({ length: count }, (_, index) => ({
          date: new Date(2026, 1, index + 1, 12),
          content: <div />,
        })),
      }).value;

      expect(calendar).toContain(`style="--calendar-weeks:${count / 7}"`);
    },
  );
});
