const chartFor = (target) =>
  target instanceof Element ? target.closest("[data-training-chart]") : null;

const hide = (chart) => {
  chart.parentElement.querySelector(".chart-tooltip").hidden = true;
  chart
    .querySelector("[data-chart-crosshair]")
    .setAttribute("visibility", "hidden");
  chart
    .querySelector("[data-chart-active]")
    .setAttribute("visibility", "hidden");
};

const show = (chart, index) => {
  const points = chart.querySelectorAll("[data-chart-point]");
  const point = points[index];
  if (!point) return;
  chart.dataset.activeIndex = String(index);
  const x = point.getAttribute("cx");
  const y = point.getAttribute("cy");
  const line = chart.querySelector("[data-chart-crosshair]");
  line.setAttribute("x1", x);
  line.setAttribute("x2", x);
  line.setAttribute("visibility", "visible");
  const active = chart.querySelector("[data-chart-active]");
  active.setAttribute("cx", x);
  active.setAttribute("cy", y);
  active.setAttribute("visibility", "visible");
  const container = chart.parentElement;
  const tooltip = container.querySelector(".chart-tooltip");
  tooltip.querySelector("[data-tooltip-date]").textContent = point.dataset.date;
  tooltip.querySelector("[data-tooltip-value]").textContent =
    point.dataset.value;
  tooltip.querySelector("[data-tooltip-details]").textContent =
    point.dataset.details;
  tooltip.hidden = false;
  const screenPoint = new DOMPoint(Number(x), Number(y)).matrixTransform(
    chart.getScreenCTM(),
  );
  const bounds = container.getBoundingClientRect();
  const left = Math.max(
    8,
    Math.min(
      screenPoint.x - bounds.left + 14,
      container.clientWidth - tooltip.offsetWidth - 8,
    ),
  );
  tooltip.style.left = `${left + container.scrollLeft}px`;
  tooltip.style.top = `${Math.max(8, screenPoint.y - bounds.top - tooltip.offsetHeight - 12)}px`;
};

const inspect = (event) => {
  const chart = chartFor(event.target);
  if (!chart) return;
  const local = new DOMPoint(event.clientX, event.clientY).matrixTransform(
    chart.getScreenCTM().inverse(),
  );
  const points = [...chart.querySelectorAll("[data-chart-point]")];
  let closest = 0;
  let distance = Infinity;
  points.forEach((point, index) => {
    const dx = Math.abs(Number(point.getAttribute("cx")) - local.x);
    const dy = Math.abs(Number(point.getAttribute("cy")) - local.y);
    const next = dx * 1000 + dy;
    if (next < distance) {
      closest = index;
      distance = next;
    }
  });
  show(chart, closest);
};
document.addEventListener("pointermove", inspect);
document.addEventListener("pointerdown", inspect);

document.addEventListener("pointerout", (event) => {
  const chart = chartFor(event.target);
  if (
    chart &&
    !chart.contains(event.relatedTarget) &&
    document.activeElement !== chart
  )
    hide(chart);
});
document.addEventListener("focusin", (event) => {
  const chart = chartFor(event.target);
  if (chart) show(chart, Number(chart.dataset.activeIndex ?? 0));
});
document.addEventListener("focusout", (event) => {
  const chart = chartFor(event.target);
  if (chart) hide(chart);
});
document.addEventListener("keydown", (event) => {
  const chart = chartFor(event.target);
  if (!chart) return;
  if (event.key === "Escape") {
    hide(chart);
    return;
  }
  const last = chart.querySelectorAll("[data-chart-point]").length - 1;
  const index = Number(chart.dataset.activeIndex ?? 0);
  const next = {
    ArrowLeft: Math.max(0, index - 1),
    ArrowRight: Math.min(last, index + 1),
    Home: 0,
    End: last,
  }[event.key];
  if (next === undefined) return;
  event.preventDefault();
  show(chart, next);
});
