import { describe, expect, it } from "bun:test";
import { readOptions } from "./helpers";

describe("workout view options", () => {
  it("accepts the Menu page", () => {
    expect(readOptions({ view: "menu" }).view).toBe("menu");
  });
  it("normalizes untrusted view options", () => {
    expect(
      readOptions({ view: "unknown", page: "-2", month: "2026-99" }),
    ).toMatchObject({ view: "today", page: 1 });
  });
});
