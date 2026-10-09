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
    "separates the full-width header from the %s content",
    (view) => {
      const page = renderDashboard(
        { view, days: [] },
        readOptions({ view }),
      ).value;

      expect(page).toContain(`class="planner-page planner-view-${view}"`);
      expect(page).toContain('</header><div class="planner-content">');
      expect(page).not.toContain('class="planner-brand"');
      expect(page.indexOf('id="import-menu-trigger"')).toBeLessThan(
        page.indexOf('class="planner-topbar-actions"'),
      );
      expect(page).toContain('class="planner-topbar-actions"');
      expect(page).toContain('aria-label="Planner views"');
    },
  );

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
