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
      : (Array.from(document.querySelectorAll("a[href]")).find(
          (link) => link.getAttribute("href") === opener?.getAttribute("href"),
        ) ?? document.getElementById("add-workout"));
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
    if (url.searchParams.has("new") || url.searchParams.has("edit")) {
      opener = link;
    }
  }
});

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
