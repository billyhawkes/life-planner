const STEP = 15 * 60 * 1000;
const duration = (minutes) => {
  const total = Math.floor(minutes);
  return `${Math.floor(total / 60)}h ${total % 60}m`;
};
const clippedMinutes = (blockStart, now, start, end) =>
  Math.max(0, Math.min(now, end) - Math.max(blockStart, start)) / 60000;

export const updateLiveTimeline = (root, now = Date.now()) => {
  const clock = (time) =>
    new Date(time).toLocaleTimeString("en", {
      hour: "2-digit",
      minute: "2-digit",
    });
  root.querySelectorAll(".timeline-block.is-running").forEach((block) => {
    const grid = block.closest(".timeline-scale");
    const start = Number(grid.dataset.timelineStart);
    const end = Number(grid.dataset.timelineEnd);
    const blockStart = Date.parse(block.dataset.blockStart);
    const visibleStart = Math.min(end, Math.max(blockStart, start));
    const visibleEnd = Math.max(visibleStart, Math.min(now, end));
    const minutes = clippedMinutes(
      blockStart,
      now,
      Number(grid.dataset.dayStart),
      Number(grid.dataset.dayEnd),
    );
    block.style.top = `${((visibleStart - start) / (end - start)) * 100}%`;
    block.style.height = `${((visibleEnd - visibleStart) / (end - start)) * 100}%`;
    block.classList.toggle("is-short", minutes < 35);
    block.querySelector(".timeline-block-duration").textContent =
      `${duration(minutes)} · Running`;
    block.title = `${block.dataset.blockName}: ${clock(blockStart)} – now · ${duration(minutes)}${block.dataset.blockNotes ? ` · ${block.dataset.blockNotes}` : ""}`;
  });
  root.querySelectorAll(".timeline-now").forEach((marker) => {
    const grid = marker.closest(".timeline-scale");
    const start = Number(grid.dataset.timelineStart);
    const end = Number(grid.dataset.timelineEnd);
    marker.hidden = now < start || now >= end;
    if (marker.hidden) return;
    marker.style.top = `${((now - start) / (end - start)) * 100}%`;
    marker.querySelector("span").textContent = clock(now);
    marker.setAttribute("aria-label", `Current time ${clock(now)}`);
  });
  root
    .querySelectorAll(".timeline-tracked-total[data-running-start]")
    .forEach((summary) => {
      const minutes =
        Number(summary.dataset.trackedMinutes) +
        clippedMinutes(
          Date.parse(summary.dataset.runningStart),
          now,
          Number(summary.dataset.dayStart),
          Number(summary.dataset.dayEnd),
        );
      summary.textContent = `${duration(minutes)} tracked`;
    });
};

// Grid origins are server-provided instants, so day changes remain correct at DST.
export const adjustRange = ({
  mode,
  start,
  end,
  sourceStart,
  targetStart = sourceStart,
  delta,
}) => {
  const snap = (time, origin) =>
    origin + Math.round((time - origin) / STEP) * STEP;
  if (mode === "start")
    return {
      start: Math.min(snap(start + delta, sourceStart), end - STEP),
      end,
    };
  if (mode === "end")
    return {
      start,
      end: Math.max(snap(end + delta, sourceStart), start + STEP),
    };
  const next = snap(start + targetStart - sourceStart + delta, targetStart);
  return { start: next, end: next + end - start };
};

const initialize = () => {
  document.documentElement.classList.add("timeline-enhanced");
  const tick = () => updateLiveTimeline(document);
  tick();
  let interval = setInterval(tick, 1000);
  document.addEventListener("visibilitychange", tick);
  window.addEventListener("pagehide", () => {
    clearInterval(interval);
    interval = undefined;
  });
  window.addEventListener("pageshow", () => {
    tick();
    interval ??= setInterval(tick, 1000);
  });
  let drag;
  let pending;
  let suppressClickUntil = 0;
  const blockFor = (target) =>
    target instanceof Element
      ? target.closest(".timeline-block[data-block-end]")
      : null;
  const field = (form, name, value) => {
    form.elements.namedItem(name).value = value;
  };
  const rangeOf = (block) => ({
    start: Date.parse(block.dataset.blockStart),
    end: Date.parse(block.dataset.blockEnd),
  });
  const formatTime = (time) =>
    new Date(time).toLocaleTimeString("en", {
      hour: "2-digit",
      minute: "2-digit",
    });
  const restoreEditing = (state) => {
    if (!state.root?.isConnected) return;
    if (state.editing === undefined) delete state.root.dataset.editing;
    else state.root.dataset.editing = state.editing;
  };
  const restoreScroll = (state) => {
    for (const { selector, top, left } of state.scroll) {
      const container = document.querySelector(selector);
      if (container) {
        container.scrollTop = top;
        container.scrollLeft = left;
      }
    }
    window.scrollTo(state.windowX, state.windowY);
  };
  const save = (block, grid, range, state) => {
    const form = block
      .closest(".day-timeline")
      .querySelector(".timeline-update-form");
    form.action = `/timeline/blocks/${encodeURIComponent(block.dataset.blockId)}`;
    field(form, "day", grid.dataset.timelineDay);
    field(form, "labelId", block.dataset.blockLabel);
    field(form, "notes", block.dataset.blockNotes);
    field(form, "startTime", new Date(range.start).toISOString());
    field(form, "endTime", new Date(range.end).toISOString());
    pending = {
      ...state,
      form,
      scroll: [".week-timelines", ".planner-content"].flatMap((selector) => {
        const container = document.querySelector(selector);
        return container
          ? [{ selector, top: container.scrollTop, left: container.scrollLeft }]
          : [];
      }),
      windowX: window.scrollX,
      windowY: window.scrollY,
    };
    if (state.root) state.root.dataset.editing = "true";
    block.classList.add("is-saving");
    form.requestSubmit();
  };
  document.addEventListener("datastar-fetch", (event) => {
    if (!pending || event.detail.el !== pending.form) return;
    if (event.detail.type === "datastar-patch-elements") {
      const state = pending;
      // Datastar's patch listener runs during this event. Restore scroll after
      // the patch, but before paint, rather than waiting for the stream to finish.
      queueMicrotask(() => restoreScroll(state));
      return;
    }
    if (!["finished", "error", "retries-failed"].includes(event.detail.type))
      return;
    const state = pending;
    pending = undefined;
    state.ghost?.remove();
    restoreEditing(state);
    document
      .querySelectorAll(".timeline-block.is-saving")
      .forEach((block) => block.classList.remove("is-saving"));
    restoreScroll(state);
    if (event.detail.type !== "finished") {
      const feedback =
        document.getElementById("planner-feedback") ??
        state.form.closest(".day-timeline");
      if (feedback) {
        const message = document.createElement("p");
        message.className = "error";
        message.setAttribute("role", "alert");
        message.textContent = "The block could not be saved. Please try again.";
        feedback.append(message);
      }
    }
  });
  const gridAt = (x, fallback) => {
    const root = fallback.closest(".daily-plans") ?? fallback.closest("main");
    return (
      [...root.querySelectorAll(".timeline-scale")].find((grid) => {
        const bounds = grid.getBoundingClientRect();
        return x >= bounds.left && x <= bounds.right;
      }) ?? fallback
    );
  };
  const preview = () => {
    if (!drag?.started) return;
    const grid = drag.mode === "move" ? gridAt(drag.x, drag.grid) : drag.grid;
    const bounds = grid.getBoundingClientRect();
    const sourceStart = Number(drag.grid.dataset.timelineStart);
    const targetStart = Number(grid.dataset.timelineStart);
    const targetEnd = Number(grid.dataset.timelineEnd);
    const offset = Math.max(0, Math.min(bounds.height, drag.y - bounds.top));
    const delta =
      (offset / bounds.height) * (targetEnd - targetStart) - drag.offset;
    drag.range = adjustRange({
      ...drag.original,
      mode: drag.mode,
      sourceStart,
      targetStart,
      delta,
    });
    drag.target = grid;
    if (drag.ghost.parentElement !== grid) grid.append(drag.ghost);
    const visibleStart = Math.max(drag.range.start, targetStart);
    const visibleEnd = Math.min(drag.range.end, targetEnd);
    drag.ghost.style.top = `${((visibleStart - targetStart) / (targetEnd - targetStart)) * 100}%`;
    drag.ghost.style.height = `${(Math.max(0, visibleEnd - visibleStart) / (targetEnd - targetStart)) * 100}%`;
    const time = `${formatTime(drag.range.start)} – ${formatTime(drag.range.end)}`;
    const duration = Math.round((drag.range.end - drag.range.start) / 60000);
    const clock = drag.ghost.querySelector(".timeline-block-time");
    if (clock) clock.textContent = time;
    drag.ghost.querySelector(".timeline-block-duration").textContent =
      `${Math.floor(duration / 60)}h ${duration % 60}m`;
    drag.hint.textContent = `${new Date(drag.range.start).toLocaleDateString("en", { month: "short", day: "numeric" })} · ${time}`;
    drag.hint.style.left = `${Math.max(8, Math.min(drag.x + 14, window.innerWidth - drag.hint.offsetWidth - 8))}px`;
    drag.hint.style.top = `${Math.max(8, Math.min(drag.y + 14, window.innerHeight - drag.hint.offsetHeight - 8))}px`;
  };
  const autoScroll = () => {
    if (!drag?.started) return;
    const week = drag.grid.closest(".week-timelines");
    const container =
      week && week.scrollHeight > week.clientHeight
        ? week
        : document.scrollingElement;
    const bounds =
      container === document.scrollingElement
        ? {
            top: 0,
            bottom: window.innerHeight,
            left: 0,
            right: window.innerWidth,
          }
        : container.getBoundingClientRect();
    const pinnedBottom =
      week?.querySelector(".schedule-day-top")?.getBoundingClientRect()
        .bottom ?? bounds.top;
    const speed = (position, low, high) =>
      position < low + 32 ? -8 : position > high - 32 ? 8 : 0;
    container.scrollTop += speed(
      drag.y,
      Math.max(bounds.top, pinnedBottom),
      bounds.bottom,
    );
    if (week) week.scrollLeft += speed(drag.x, bounds.left, bounds.right);
    preview();
    drag.frame = requestAnimationFrame(autoScroll);
  };
  const cleanup = (keepPreview = false) => {
    const state = drag;
    drag = undefined;
    if (!state) return;
    cancelAnimationFrame(state.frame);
    if (!keepPreview) state.ghost?.remove();
    state.hint?.remove();
    state.block.classList.remove("is-dragging");
    if (state.block.hasPointerCapture(state.pointerId))
      state.block.releasePointerCapture(state.pointerId);
    return state;
  };
  const cancel = () => {
    const state = cleanup();
    if (state) {
      restoreEditing(state);
      suppressClickUntil = performance.now() + 400;
    }
  };
  document.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || pending || drag) return;
    const block = blockFor(event.target);
    if (!block) return;
    const grid = block.closest(".timeline-scale");
    const root = block.closest("main");
    drag = {
      block,
      grid,
      root,
      editing: root?.dataset.editing,
      original: rangeOf(block),
      mode: event.target.closest("[data-resize]")?.dataset.resize ?? "move",
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      initialX: event.clientX,
      initialY: event.clientY,
      offset:
        ((event.clientY - grid.getBoundingClientRect().top) /
          grid.getBoundingClientRect().height) *
        (Number(grid.dataset.timelineEnd) - Number(grid.dataset.timelineStart)),
    };
  });
  document.addEventListener(
    "pointermove",
    (event) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      drag.x = event.clientX;
      drag.y = event.clientY;
      if (
        !drag.started &&
        Math.hypot(drag.x - drag.initialX, drag.y - drag.initialY) < 5
      )
        return;
      event.preventDefault();
      if (!drag.started) {
        drag.started = true;
        drag.block.setPointerCapture(event.pointerId);
        if (drag.root) drag.root.dataset.editing = "true";
        drag.block.classList.add("is-dragging");
        drag.ghost = drag.block.cloneNode(true);
        drag.ghost.removeAttribute("id");
        drag.ghost.removeAttribute("data-block-id");
        drag.ghost.classList.remove("is-dragging");
        drag.ghost.classList.add("timeline-drag-ghost");
        drag.ghost.setAttribute("inert", "");
        drag.ghost
          .querySelectorAll("[data-on\\:click__prevent]")
          .forEach((link) => link.removeAttribute("data-on:click__prevent"));
        drag.hint = document.createElement("div");
        drag.hint.className = "timeline-drag-hint";
        drag.hint.setAttribute("role", "status");
        document.body.append(drag.hint);
        autoScroll();
      }
      preview();
    },
    { passive: false },
  );
  document.addEventListener("pointerup", (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const changed =
      drag.started &&
      (drag.range.start !== drag.original.start ||
        drag.range.end !== drag.original.end);
    const state = cleanup(changed);
    if (!state.started) return;
    suppressClickUntil = performance.now() + 400;
    if (!changed) restoreEditing(state);
    else save(state.block, state.target, state.range, state);
  });
  document.addEventListener("pointercancel", cancel);
  window.addEventListener("blur", cancel);
  document.addEventListener(
    "click",
    (event) => {
      if (
        performance.now() < suppressClickUntil &&
        event.target instanceof Element &&
        event.target.closest(".timeline-block, .timeline-slot")
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && drag) {
      event.preventDefault();
      cancel();
      return;
    }
    const block = blockFor(event.target);
    if (!block || pending || drag) return;
    const handle = event.target.closest("[data-resize]");
    if (!handle && !event.altKey) return;
    const grid = block.closest(".timeline-scale");
    const sourceStart = Number(grid.dataset.timelineStart);
    let target = grid;
    let delta = { ArrowUp: -STEP, ArrowDown: STEP }[event.key];
    if (!handle && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
      const grids = [
        ...block.closest("main").querySelectorAll(".timeline-scale"),
      ];
      target =
        grids[grids.indexOf(grid) + (event.key === "ArrowLeft" ? -1 : 1)];
      if (!target) return;
      delta = 0;
    }
    if (delta === undefined) return;
    event.preventDefault();
    const original = rangeOf(block);
    const range = adjustRange({
      ...original,
      mode: handle?.dataset.resize ?? "move",
      sourceStart,
      targetStart: Number(target.dataset.timelineStart),
      delta,
    });
    const root = block.closest("main");
    save(block, target, range, { root, editing: root?.dataset.editing });
  });
};

if (typeof document !== "undefined") initialize();
