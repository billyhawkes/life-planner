import { describe, expect, it } from "bun:test";
import { readOptions, weekStart, viewUrl } from "./helpers";

describe("workout view options", () => {
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
