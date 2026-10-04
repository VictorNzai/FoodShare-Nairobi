// Shared UI helpers. Styles live in /styles/design-system.css.

const TOAST_ICONS = {
  success: "M3.5 8.5l3 3 6-7",
  error: "M8 4v5M8 11.6v.1",
  info: "M8 7.2v4.4M8 4.4v.1",
};

// showToast("Saved", "success" | "error" | "info")
function showToast(message, type = "info") {
  let region = document.querySelector(".toast-region");
  if (!region) {
    region = document.createElement("div");
    region.className = "toast-region";
    document.body.appendChild(region);
  }

  const svg = (path) =>
    `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;

  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.setAttribute("role", type === "error" ? "alert" : "status");
  toast.innerHTML = `<span class="toast-icon">${svg(
    TOAST_ICONS[type] || TOAST_ICONS.info
  )}</span><span class="toast-text"></span><button type="button" class="toast-close" aria-label="Dismiss">${svg(
    "M4 4l8 8M12 4l-8 8"
  )}</button>`;
  // textContent, not innerHTML: messages come from the server
  toast.querySelector(".toast-text").textContent = message;

  const dismiss = () => {
    toast.classList.add("toast--leaving");
    setTimeout(() => toast.remove(), 220);
  };
  toast.querySelector(".toast-close").addEventListener("click", dismiss);
  setTimeout(dismiss, type === "error" ? 7000 : 4500);

  region.appendChild(toast);
}

// Mark a submit button as working while a request is in flight
function setBusy(button, busy) {
  button.disabled = busy;
  button.setAttribute("aria-busy", busy);
}

// Escape text before putting it into innerHTML
function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// Styled replacement for confirm(). Resolves true if the user confirms.
// if (await confirmDialog("Ban this user?", { confirmLabel: "Ban", danger: true })) ...
function confirmDialog(
  message,
  { title = "Are you sure?", confirmLabel = "Confirm", danger = false } = {}
) {
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "dialog";
    dialog.innerHTML = `<h2 class="dialog-title"></h2><p class="dialog-text"></p><div class="dialog-actions"><button type="button" class="btn btn--quiet" value="cancel">Cancel</button><button type="button" class="btn ${
      danger ? "btn--danger" : "btn--solid"
    }" value="ok"></button></div>`;
    dialog.querySelector(".dialog-title").textContent = title;
    dialog.querySelector(".dialog-text").textContent = message;
    dialog.querySelector('[value="ok"]').textContent = confirmLabel;
    dialog.addEventListener("click", (e) => {
      if (e.target.value) dialog.close(e.target.value);
    });
    dialog.addEventListener("close", () => {
      resolve(dialog.returnValue === "ok");
      dialog.remove();
    });
    document.body.appendChild(dialog);
    dialog.showModal();
  });
}

// Status as a coloured badge. Unknown statuses get the neutral style.
const STATUS_KIND = {
  active: "success",
  approved: "success",
  verified: "success",
  completed: "success",
  delivered: "success",
  pending: "warning",
  scheduled: "warning",
  "picked up": "warning",
  "not verified": "warning",
  "verification pending": "warning",
  banned: "danger",
  rejected: "danger",
  denied: "danger",
  cancelled: "danger",
};

function statusBadge(status) {
  const kind = STATUS_KIND[String(status || "").toLowerCase()];
  return `<span class="badge${kind ? " badge--" + kind : ""}">${escapeHtml(
    status || "unknown"
  )}</span>`;
}

// Styled calendar for <input type="date" class="input">. The input stays the
// source of truth, so typing, required, min/max and form submission still work.
// Runs on page load; call enhanceDateInputs(container) for inputs added later.
function enhanceDateInputs(root = document) {
  if (!("popover" in HTMLElement.prototype)) return; // keep the native picker
  root.querySelectorAll('input[type="date"].input').forEach((input) => {
    if (!input.closest(".date-field")) enhanceDateInput(input);
  });
}

function enhanceDateInput(input) {
  const pad = (n) => String(n).padStart(2, "0");
  const toISO = (d) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromISO = (iso) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const svg = (path) =>
    `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
  const dayName = new Intl.DateTimeFormat(undefined, { dateStyle: "full" });
  // Weeks start on Monday; 1 Jan 2024 was a Monday
  const weekdays = Array.from(
    { length: 7 },
    (_, i) =>
      `<span class="calendar-weekday" aria-hidden="true">${new Intl.DateTimeFormat(
        undefined,
        { weekday: "short" }
      )
        .format(new Date(2024, 0, 1 + i))
        .slice(0, 2)}</span>`
  ).join("");

  const name = (input.labels?.[0]?.textContent.trim() || "date").toLowerCase();
  const wrap = document.createElement("div");
  wrap.className = "date-field";
  input.replaceWith(wrap);
  wrap.innerHTML = `<button type="button" class="date-toggle" aria-haspopup="dialog">${svg(
    "M2.5 6.5h11M5.2 1.8v2.4M10.8 1.8v2.4M3.5 3h9a1 1 0 0 1 1 1v8.5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"
  )}</button><div class="calendar" popover role="dialog"><div class="calendar-head"><button type="button" class="calendar-nav" data-step="-1" aria-label="Previous month">${svg(
    "M10 3.5L5.5 8l4.5 4.5"
  )}</button><div class="calendar-jump"><select class="input calendar-select" data-month aria-label="Month">${Array.from(
    { length: 12 },
    (_, i) =>
      `<option value="${i}">${new Intl.DateTimeFormat(undefined, {
        month: "long",
      }).format(new Date(2024, i, 1))}</option>`
  ).join(
    ""
  )}</select><select class="input calendar-select" data-year aria-label="Year"></select></div><button type="button" class="calendar-nav" data-step="1" aria-label="Next month">${svg(
    "M6 3.5L10.5 8 6 12.5"
  )}</button></div><div class="calendar-grid"></div><div class="calendar-foot"><button type="button" class="btn btn--quiet" data-today>Today</button></div></div>`;
  wrap.prepend(input);

  const toggle = wrap.querySelector(".date-toggle");
  const pop = wrap.querySelector(".calendar");
  const grid = wrap.querySelector(".calendar-grid");
  const monthSelect = wrap.querySelector("[data-month]");
  const yearSelect = wrap.querySelector("[data-year]");
  toggle.setAttribute("aria-label", `Choose ${name}`);
  pop.setAttribute("aria-label", `Choose ${name}`);

  const allowed = (iso) =>
    !(input.min && iso < input.min) && !(input.max && iso > input.max);
  const isOpen = () => pop.matches(":popover-open");
  let view = new Date(); // any day in the month on show

  // Draw the month in `view`; `focusISO` is the day arrow keys start from
  function render(focusISO, moveFocus) {
    const y = view.getFullYear();
    const m = view.getMonth();
    const offset = (new Date(y, m, 1).getDay() + 6) % 7;
    const today = toISO(new Date());
    // Ten years back to five ahead, widened to cover min, max and the view
    const thisYear = new Date().getFullYear();
    const bound = (iso, fallback) => (iso ? +iso.slice(0, 4) : fallback);
    const first = Math.min(y, bound(input.min, thisYear - 10));
    const last = Math.max(y, bound(input.max, thisYear + 5));
    yearSelect.innerHTML = Array.from(
      { length: last - first + 1 },
      (_, i) => `<option>${first + i}</option>`
    ).join("");
    yearSelect.value = y;
    monthSelect.value = m;
    grid.innerHTML =
      weekdays +
      Array.from({ length: new Date(y, m + 1, 0).getDate() }, (_, i) => {
        const iso = `${y}-${pad(m + 1)}-${pad(i + 1)}`;
        return `<button type="button" class="calendar-day" tabindex="-1" data-date="${iso}" aria-label="${dayName.format(
          fromISO(iso)
        )}"${iso === input.value ? ' aria-pressed="true"' : ""}${
          iso === today ? ' aria-current="date"' : ""
        }${allowed(iso) ? "" : " disabled"}${
          i === 0 ? ` style="grid-column-start: ${offset + 1}"` : ""
        }>${i + 1}</button>`;
      }).join("");
    const target =
      grid.querySelector(`[data-date="${focusISO}"]:not(:disabled)`) ||
      grid.querySelector(".calendar-day:not(:disabled)");
    if (!target) return;
    target.tabIndex = 0;
    if (moveFocus) target.focus();
  }

  function open(moveFocus) {
    const start = input.value || toISO(new Date());
    view = fromISO(start);
    pop.showPopover();
    render(start, moveFocus);
    // Below the field, or above it when there is no room below
    const field = input.getBoundingClientRect();
    const fitsBelow =
      field.bottom + 6 + pop.offsetHeight <= innerHeight ||
      field.top < pop.offsetHeight + 6;
    pop.style.top = `${
      fitsBelow ? field.bottom + 6 : field.top - 6 - pop.offsetHeight
    }px`;
    pop.style.left = `${Math.max(
      8,
      Math.min(field.left, innerWidth - pop.offsetWidth - 8)
    )}px`;
  }

  function choose(iso) {
    if (!allowed(iso)) return;
    input.value = iso;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    pop.hidePopover();
    toggle.focus();
  }

  // A click on the button while open has already light-dismissed the calendar
  let wasOpen = false;
  toggle.addEventListener("pointerdown", () => (wasOpen = isOpen()));
  toggle.addEventListener("click", () => {
    if (!wasOpen && !isOpen()) open(true);
    wasOpen = false;
  });
  // Clicking the field shows the calendar but leaves focus in it for typing.
  // preventDefault stops Firefox and phones opening their own picker on top.
  input.addEventListener("click", (e) => {
    e.preventDefault();
    if (!isOpen()) open(false);
  });

  pop.addEventListener("click", (e) => {
    const day = e.target.closest(".calendar-day");
    const nav = e.target.closest(".calendar-nav");
    if (day) choose(day.dataset.date);
    else if (nav) {
      view = new Date(view.getFullYear(), view.getMonth() + +nav.dataset.step, 1);
      render(toISO(view), false);
    } else if (e.target.closest("[data-today]")) choose(toISO(new Date()));
  });

  grid.addEventListener("keydown", (e) => {
    const day = e.target.closest(".calendar-day");
    if (!day) return;
    const d = fromISO(day.dataset.date);
    const weekday = (d.getDay() + 6) % 7;
    const moves = {
      ArrowLeft: () => d.setDate(d.getDate() - 1),
      ArrowRight: () => d.setDate(d.getDate() + 1),
      ArrowUp: () => d.setDate(d.getDate() - 7),
      ArrowDown: () => d.setDate(d.getDate() + 7),
      Home: () => d.setDate(d.getDate() - weekday),
      End: () => d.setDate(d.getDate() + 6 - weekday),
      PageUp: () => d.setMonth(d.getMonth() - 1),
      PageDown: () => d.setMonth(d.getMonth() + 1),
    };
    if (!moves[e.key]) return;
    e.preventDefault();
    moves[e.key]();
    if (!allowed(toISO(d))) return;
    view = d;
    render(toISO(d), true);
  });

  // Jump straight to a month or year
  pop.addEventListener("change", (e) => {
    if (!e.target.matches(".calendar-select")) return;
    e.stopPropagation(); // not a change of the date itself
    view = new Date(+yearSelect.value, +monthSelect.value, 1);
    render(toISO(view), false);
  });

  // A fixed-position calendar would drift away from its field when the page
  // scrolls. Scrolling inside the calendar (the year list) is fine.
  const close = () => isOpen() && pop.hidePopover();
  addEventListener("resize", close);
  addEventListener(
    "scroll",
    (e) => wrap.contains(e.target) || close(),
    { capture: true, passive: true }
  );

  // Show the dd/mm/yyyy hint in placeholder colour until a date is set
  const sync = () => input.classList.toggle("is-empty", !input.value);
  input.addEventListener("input", sync);
  input.addEventListener("change", sync);
  input.form?.addEventListener("reset", () => setTimeout(sync));
  sync();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => enhanceDateInputs());
} else {
  enhanceDateInputs();
}

// One full-width table row for loading, empty and error messages
function noteRow(colspan, text) {
  return `<tr><td class="table-note" colspan="${colspan}">${escapeHtml(
    text
  )}</td></tr>`;
}
