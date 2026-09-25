// Enhance server-rendered forms, including forms inserted by Datastar patches.
let activeDialog;
let opener;
let lastError;
let backdropPointerDown = false;

const isOutsideDialog = (event) => {
  if (!activeDialog || event.target !== activeDialog) return false;
  const bounds = activeDialog.getBoundingClientRect();
  return (
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom
  );
};

document.addEventListener("pointerdown", (event) => {
  backdropPointerDown = event.button === 0 && isOutsideDialog(event);
});

document.addEventListener("pointercancel", () => {
  backdropPointerDown = false;
});

const restoreFocus = () => {
  const target =
    opener?.isConnected && opener !== document.body
      ? opener
      : ((opener?.id ? document.getElementById(opener.id) : undefined) ??
        Array.from(document.querySelectorAll("a[href]")).find(
          (link) => link.getAttribute("href") === opener?.getAttribute("href"),
        ) ??
        document.getElementById("create-menu-trigger"));
  target?.focus({ preventScroll: true });
  opener = undefined;
};

document.addEventListener("click", (event) => {
  const dismiss = backdropPointerDown && isOutsideDialog(event);
  backdropPointerDown = false;
  if (dismiss) {
    activeDialog.close();
    return;
  }
  if (!(event.target instanceof Element)) return;
  const close = event.target.closest("[data-dialog-close]");
  if (close && activeDialog?.contains(close)) {
    event.preventDefault();
    activeDialog.close();
    return;
  }
  // Remember pointer triggers too: some browsers don't focus clicked links.
  const link = event.target.closest("a[href]");
  if (link && !activeDialog) {
    const url = new URL(link.href);
    if (
      url.searchParams.has("new") ||
      url.searchParams.has("edit") ||
      url.searchParams.has("import")
    ) {
      opener =
        link.closest(".create-menu")?.querySelector("[popovertarget]") ?? link;
      link.closest(".create-menu-items:popover-open")?.hidePopover();
    }
  }
});

// Popovers use the top layer so calendar scrolling never clips the dropdown.
const positionMenu = (menu) => {
  const owner = menu.closest(".create-menu, .habit-control");
  const contextOffsetX = Number(menu.dataset.contextOffsetX);
  const contextOffsetY = Number(menu.dataset.contextOffsetY);
  if (
    owner?.matches(".habit-control") &&
    Number.isFinite(contextOffsetX) &&
    Number.isFinite(contextOffsetY)
  ) {
    const anchor = owner.getBoundingClientRect();
    const bounds = menu.getBoundingClientRect();
    const contextX = anchor.left + contextOffsetX;
    const contextY = anchor.top + contextOffsetY;
    Object.assign(menu.style, {
      inset: "auto",
      margin: "0",
      left: `${Math.max(8, Math.min(contextX, window.innerWidth - bounds.width - 8))}px`,
      top: `${Math.max(8, Math.min(contextY, window.innerHeight - bounds.height - 8))}px`,
    });
    return;
  }
  const trigger = owner?.querySelector("[popovertarget]");
  if (!trigger) return;
  const anchor = trigger.getBoundingClientRect();
  const bounds = menu.getBoundingClientRect();
  const left = Math.max(
    8,
    Math.min(anchor.right - bounds.width, window.innerWidth - bounds.width - 8),
  );
  const top =
    anchor.bottom + bounds.height + 8 <= window.innerHeight
      ? anchor.bottom + 4
      : Math.max(8, anchor.top - bounds.height - 4);
  Object.assign(menu.style, {
    inset: "auto",
    margin: "0",
    left: `${left}px`,
    top: `${top}px`,
  });
};
document.addEventListener(
  "toggle",
  (event) => {
    if (
      !(event.target instanceof HTMLElement) ||
      !event.target.matches(".create-menu-items")
    )
      return;
    if (event.newState === "open") positionMenu(event.target);
    else {
      delete event.target.dataset.contextOffsetX;
      delete event.target.dataset.contextOffsetY;
    }
  },
  true,
);
const positionOpenMenus = () =>
  document
    .querySelectorAll(".create-menu-items:popover-open")
    .forEach(positionMenu);
window.addEventListener("resize", positionOpenMenus);
document.addEventListener("scroll", positionOpenMenus, true);

document.addEventListener("contextmenu", (event) => {
  if (!(event.target instanceof Element)) return;
  const habit = event.target.closest("[data-context-menu]");
  if (!habit) return;
  const menu = document.getElementById(habit.dataset.contextMenu);
  if (!(menu instanceof HTMLElement)) return;
  const bounds = habit.getBoundingClientRect();
  event.preventDefault();
  menu.dataset.contextOffsetX = String(event.clientX - bounds.left);
  menu.dataset.contextOffsetY = String(event.clientY - bounds.top);
  menu.showPopover();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10"))
    return;
  if (!(event.target instanceof Element)) return;
  const habit = event.target.closest("[data-context-menu]");
  if (!habit) return;
  const menu = document.getElementById(habit.dataset.contextMenu);
  if (!(menu instanceof HTMLElement)) return;
  const bounds = habit.getBoundingClientRect();
  event.preventDefault();
  menu.dataset.contextOffsetX = "0";
  menu.dataset.contextOffsetY = String(bounds.height + 4);
  menu.showPopover();
});

document.addEventListener(
  "submit",
  (event) => {
    if (!(event.target instanceof HTMLFormElement)) return;
    const action = new URL(event.target.action, window.location.href);
    if (!action.pathname.endsWith("/delete")) return;
    if (window.confirm("Delete this item? This action cannot be undone."))
      return;
    event.preventDefault();
    event.stopImmediatePropagation();
  },
  true,
);

const syncDialog = () => {
  const dialog = document.querySelector(".form-dialog[open]");
  if (!(dialog instanceof HTMLDialogElement)) {
    if (activeDialog) {
      activeDialog = undefined;
      restoreFocus();
    }
    return;
  }
  if (dialog !== activeDialog) {
    if (!opener && !dialog.contains(document.activeElement)) {
      opener = document.activeElement;
    }
    activeDialog = dialog;
    // The open attribute supplies the usable, inline no-JavaScript fallback.
    dialog.close();
    dialog.showModal();
    dialog.addEventListener("close", () => {
      // Ignore the queued close event from promotion to a modal.
      if (dialog.open || activeDialog !== dialog) return;
      dialog.remove();
      activeDialog = undefined;
      restoreFocus();
    });
  }
  const error = dialog.querySelector('[role="alert"]');
  if (error && error !== lastError) error.focus();
  lastError = error;
};

new MutationObserver(syncDialog).observe(document.body, {
  childList: true,
  subtree: true,
});
syncDialog();
