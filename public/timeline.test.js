import { describe, expect, it } from "bun:test";
import { adjustRange, updateLiveTimeline } from "./timeline.js";

const minute = 60000;
const origin = Date.parse("2026-01-01T00:00:00Z");
const range = {
  start: origin + 9 * 60 * minute,
  end: origin + 10 * 60 * minute,
  sourceStart: origin,
};

const liveFixture = (blockStart = range.start) => {
  const grid = {
    dataset: {
      timelineStart: String(origin),
      timelineEnd: String(origin + 86400000),
      dayStart: String(origin),
      dayEnd: String(origin + 86400000),
    },
  };
  const text = { textContent: "" };
  const block = {
    dataset: {
      blockStart: new Date(blockStart).toISOString(),
      blockName: "Work",
      blockNotes: "Focus",
    },
    style: {},
    classList: {
      toggle: (_name, value) => {
        block.short = value;
      },
    },
    closest: () => grid,
    querySelector: () => text,
  };
  const markerText = { textContent: "" };
  const marker = {
    style: {},
    closest: () => grid,
    querySelector: () => markerText,
    setAttribute: (_name, value) => {
      marker.label = value;
    },
  };
  const summary = {
    dataset: {
      runningStart: new Date(blockStart).toISOString(),
      trackedMinutes: "30",
      dayStart: String(origin),
      dayEnd: String(origin + 86400000),
    },
    textContent: "",
  };
  const root = {
    querySelectorAll: (selector) => {
      if (selector === ".timeline-block.is-running") return [block];
      if (selector === ".timeline-now") return [marker];
      return [summary];
    },
  };
  return { root, block, text, marker, markerText, summary };
};

describe("live timeline updates", () => {
  it("grows a running slot, updates its duration and total, and moves the current-time marker", () => {
    const { root, block, text, marker, summary } = liveFixture();
    updateLiveTimeline(root, range.start + 15 * minute);
    expect(Number.parseFloat(block.style.height)).toBeCloseTo(
      (15 / 1440) * 100,
    );
    expect(text.textContent).toBe("0h 15m · Running");
    expect(block.short).toBe(true);
    updateLiveTimeline(root, range.start + 60 * minute);
    expect(Number.parseFloat(block.style.height)).toBeCloseTo(
      (60 / 1440) * 100,
    );
    expect(Number.parseFloat(marker.style.top)).toBeCloseTo((10 / 24) * 100);
    expect(marker.hidden).toBe(false);
    expect(marker.label).toContain("Current time");
    expect(text.textContent).toBe("1h 0m · Running");
    expect(block.short).toBe(false);
    expect(block.title).toContain("1h 0m · Focus");
    expect(summary.textContent).toBe("1h 30m tracked");
  });
  it("clips overnight slots and hides the current-time marker outside the displayed day", () => {
    const { root, block, text, marker, summary } = liveFixture(
      origin - 60 * minute,
    );
    updateLiveTimeline(root, origin + 60 * minute);
    expect(block.style.top).toBe("0%");
    expect(text.textContent).toBe("1h 0m · Running");
    expect(summary.textContent).toBe("1h 30m tracked");
    updateLiveTimeline(root, origin + 86400000 + 60 * minute);
    expect(block.style.height).toBe("100%");
    expect(text.textContent).toBe("24h 0m · Running");
    expect(marker.hidden).toBe(true);
    expect(summary.textContent).toBe("24h 30m tracked");
  });
});

describe("calendar drag calculations", () => {
  it("moves the whole block and snaps to 15-minute boundaries", () => {
    expect(adjustRange({ ...range, mode: "move", delta: 22 * minute })).toEqual(
      {
        start: range.start + 15 * minute,
        end: range.end + 15 * minute,
      },
    );
  });
  it("moves across days without changing duration", () => {
    expect(
      adjustRange({
        ...range,
        mode: "move",
        targetStart: origin + 86400000,
        delta: 30 * minute,
      }),
    ).toEqual({
      start: range.start + 86400000 + 30 * minute,
      end: range.end + 86400000 + 30 * minute,
    });
  });
  it("resizes either edge without moving the other", () => {
    expect(
      adjustRange({ ...range, mode: "start", delta: -16 * minute }),
    ).toEqual({ start: range.start - 15 * minute, end: range.end });
    expect(adjustRange({ ...range, mode: "end", delta: 16 * minute })).toEqual({
      start: range.start,
      end: range.end + 15 * minute,
    });
  });
  it("keeps a minimum 15-minute duration when edges cross", () => {
    expect(
      adjustRange({ ...range, mode: "start", delta: 120 * minute }),
    ).toEqual({ start: range.end - 15 * minute, end: range.end });
    expect(
      adjustRange({ ...range, mode: "end", delta: -120 * minute }),
    ).toEqual({ start: range.start, end: range.start + 15 * minute });
  });
  it("preserves exact durations and UTC instants for midnight-spanning blocks", () => {
    const overnight = {
      ...range,
      start: origin + 23 * 60 * minute,
      end: origin + 25 * 60 * minute,
    };
    expect(
      adjustRange({ ...overnight, mode: "move", delta: 30 * minute }),
    ).toEqual({
      start: overnight.start + 30 * minute,
      end: overnight.end + 30 * minute,
    });
  });
});

describe("drag rendering lifecycle", () => {
  it("keeps the drop preview until save completes and restores scroll before paint", async () => {
    const listeners = new Map();
    const classes = () => {
      const values = new Set();
      return {
        add: (...names) => names.forEach((name) => values.add(name)),
        remove: (...names) => names.forEach((name) => values.delete(name)),
        contains: (name) => values.has(name),
      };
    };
    const form = {
      elements: { namedItem: () => ({ value: "" }) },
      requestSubmit: () => {
        form.submitted = true;
      },
    };
    const root = {
      dataset: {},
      isConnected: true,
      querySelectorAll: () => [grid],
    };
    const section = { querySelector: () => form };
    const scrolling = { scrollTop: 0 };
    const week = {
      scrollHeight: 700,
      clientHeight: 700,
      scrollTop: 200,
      scrollLeft: 25,
      querySelector: () => null,
    };
    const grid = {
      dataset: {
        timelineStart: String(origin),
        timelineEnd: String(origin + 86400000),
        timelineDay: "2026-01-01",
      },
      getBoundingClientRect: () => ({
        top: 0,
        left: 0,
        right: 200,
        height: 1056,
      }),
      closest: (selector) => (selector === ".week-timelines" ? week : root),
      append: (child) => {
        child.parentElement = grid;
      },
    };
    const ghost = {
      classList: classes(),
      style: {},
      removed: false,
      removeAttribute: () => {},
      setAttribute: () => {},
      querySelectorAll: () => [],
      querySelector: () => ({ textContent: "" }),
      remove: () => {
        ghost.removed = true;
      },
    };
    class FakeElement {}
    const block = new FakeElement();
    Object.assign(block, {
      dataset: {
        blockId: "focus",
        blockStart: new Date(range.start).toISOString(),
        blockEnd: new Date(range.end).toISOString(),
        blockLabel: "work",
        blockNotes: "Keep notes",
      },
      classList: classes(),
      closest: (selector) => {
        if (selector === ".timeline-scale") return grid;
        if (selector === "main") return root;
        if (selector === ".day-timeline") return section;
        if (selector === ".timeline-block[data-block-end]") return block;
        return null;
      },
      cloneNode: () => ghost,
      setPointerCapture: () => {},
      hasPointerCapture: () => true,
      releasePointerCapture: () => {},
    });
    const fakeDocument = {
      documentElement: { classList: classes() },
      scrollingElement: scrolling,
      body: { append: () => {} },
      addEventListener: (name, callback) => listeners.set(name, callback),
      querySelector: (selector) =>
        selector === ".week-timelines" ? week : null,
      querySelectorAll: (selector) =>
        selector === ".timeline-block.is-saving" ? [block] : [],
      createElement: () => ({
        className: "",
        style: {},
        offsetWidth: 150,
        offsetHeight: 20,
        setAttribute: () => {},
        remove: () => {},
      }),
    };
    const globals = {
      document: fakeDocument,
      Element: FakeElement,
      window: {
        scrollX: 0,
        scrollY: 0,
        innerWidth: 1000,
        innerHeight: 800,
        scrollTo: () => {},
        addEventListener: () => {},
      },
      requestAnimationFrame: () => 1,
      cancelAnimationFrame: () => {},
      setInterval: () => 1,
    };
    const previous = new Map(
      Object.keys(globals).map((name) => [
        name,
        Object.getOwnPropertyDescriptor(globalThis, name),
      ]),
    );
    try {
      for (const [name, value] of Object.entries(globals))
        Object.defineProperty(globalThis, name, { value, configurable: true });
      await import("./timeline.js?flash-test");
      listeners.get("pointerdown")({
        target: block,
        button: 0,
        pointerId: 1,
        clientX: 100,
        clientY: 400,
      });
      listeners.get("pointermove")({
        target: block,
        pointerId: 1,
        clientX: 100,
        clientY: 430,
        preventDefault: () => {},
      });
      listeners.get("pointerup")({ pointerId: 1 });
      expect(form.submitted).toBe(true);
      expect(ghost.removed).toBe(false);
      expect(block.classList.contains("is-saving")).toBe(true);

      listeners.get("datastar-fetch")({
        detail: { el: form, type: "datastar-patch-elements" },
      });
      week.scrollTop = 0;
      week.scrollLeft = 0;
      await Promise.resolve();
      expect(week.scrollTop).toBe(200);
      expect(week.scrollLeft).toBe(25);
      expect(ghost.removed).toBe(false);

      listeners.get("datastar-fetch")({
        detail: { el: form, type: "finished" },
      });
      expect(ghost.removed).toBe(true);
      expect(block.classList.contains("is-saving")).toBe(false);
    } finally {
      for (const [name, descriptor] of previous) {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor);
        else delete globalThis[name];
      }
    }
  });
});
