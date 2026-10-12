import { describe, expect, it } from "bun:test";
import { readOptions } from "@/services/workouts/helpers";
import { ScheduleDays } from "./components/schedule";
import { renderDashboard } from "./workouts";

describe("planner layout", () => {
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
