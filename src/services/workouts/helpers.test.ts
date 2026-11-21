import { describe, expect, it } from "bun:test";
import { formUrl, readOptions, weekStart, viewUrl } from "./helpers";

describe("workout view options", () => {
  it("uses planner paths and keeps form context separate", () => {
    for (const view of ["dashboard", "today", "menu"] as const) {
      expect(viewUrl(readOptions({ view }))).toBe(
        view === "dashboard" ? "/" : `/${view}`,
      );
    }
    expect(viewUrl(readOptions({ view: "week", week: "2026-01-01" }))).toBe(
      "/week?week=2025-12-29",
    );
    expect(viewUrl(readOptions({ view: "calendar", month: "2026-11" }))).toBe(
      "/calendar?month=2026-11",
    );
    const url = new URL(
      formUrl(readOptions({ view: "week" }), "/tasks/new", {
        new: "2026-11-21",
      }),
      "http://localhost",
    );
    expect(url.pathname).toBe("/tasks/new");
    expect(url.searchParams.get("view")).toBe("week");
    expect(url.searchParams.get("new")).toBe("2026-11-21");
  });
  it("normalizes selected weeks to Monday, including across year boundaries", () => {
    expect(weekStart("2026-01-01")).toBe("2025-12-29");
    expect(weekStart("2026-01-04")).toBe("2025-12-29");
    expect(weekStart("2026-01-05")).toBe("2026-01-05");
    expect(weekStart("2026-02-30")).toBe(weekStart());
    expect(weekStart("invalid")).toBe(weekStart());
    const options = readOptions({ view: "week", week: "2026-01-01" });
    expect(options.week).toBe("2025-12-29");
    expect(viewUrl(options)).toContain("week=2025-12-29");
  });
  it("accepts the Menu page", () => {
    expect(readOptions({ view: "menu" }).view).toBe("menu");
  });
  it("normalizes untrusted view options", () => {
    expect(
      readOptions({ view: "unknown", page: "-2", month: "2026-99" }),
    ).toMatchObject({ view: "today", page: 1 });
  });
});
