// ── Kanban constants ──────────────────────────────────────────────────────────
const STORAGE_KEY = "quick-kanban:v1";
const TASK_COUNTER_KEY = "quick-kanban:task-counter:v1";
const STATUSES = ["todo", "doing", "done"];

// ── Events constants ──────────────────────────────────────────────────────────
const EVENTS_KEY = "quick-kanban:events:v1";
const EVENT_STATUSES = ["scheduled", "completed"];
const OPENCLAW_VERSION = "2026.2.24";
const MAIN_AGENT_MODEL = "gpt-5.3-codex";

const ACTIVE_SCHEDULED_TASKS = [
  { id: 'cron-openclaw-update', title: 'OpenClaw_Auto_Update', source: 'openclaw', schedule: 'Daily 3:00 AM PT', agentId: 'agent:default', reason: 'Keeps OpenClaw updated automatically every morning.', actionSummary: 'Checks latest OpenClaw release, applies update if available, and restarts services safely.' },
  { id: 'cron-news-report', title: 'News_Report', source: 'openclaw', schedule: 'Daily 6:30 AM PT', agentId: 'agent:main', reason: 'Morning AI/OpenClaw news digest delivery.', actionSummary: 'Collects top AI/OpenClaw news and sends concise summary to Telegram.' },
  { id: 'cron-weather-btc', title: 'Weather_BTC_Report', source: 'openclaw', schedule: 'Daily 7:00 AM PT', agentId: 'agent:main', reason: 'Morning weather + BTC update delivery.', actionSummary: 'Fetches local weather and BTC price movement and sends Telegram briefing.' },
  { id: 'cron-ev-job-scout', title: 'EV_Job_Scout', source: 'openclaw', schedule: 'Daily 10:00 AM PT', agentId: 'agent:main', reason: 'Tracks managerial/executive roles in EV charging, PV, and ESS.', actionSummary: 'Finds active postings, validates links, ranks relevance, and delivers report to Telegram.' }
];

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
  cards: loadCards(),
  events: loadEvents(),
  activeTab: "scheduled",
};

// ── DOM: Kanban ───────────────────────────────────────────────────────────────
const addTaskBtn = document.getElementById("add-task-btn");
const clearButton = document.getElementById("clear-all");
const lists = Object.fromEntries(
  STATUSES.map((status) => [status, document.querySelector('[data-list="' + status + '"]')])
);
const countEls = Object.fromEntries(
  STATUSES.map((status) => [status, document.querySelector('[data-count-for="' + status + '"]')])
);

// ── DOM: Events ───────────────────────────────────────────────────────────────
const eventList = document.getElementById("event-list");
const tabBtns = document.querySelectorAll(".tab-btn");
const countScheduled = document.getElementById("count-scheduled");
const countCompleted = document.getElementById("count-completed");
const eventModal = document.getElementById("event-modal");
const modalContent = document.getElementById("modal-content");
const modalClose = document.getElementById("modal-close");
const runtimeMeta = document.getElementById("runtime-meta");
const taskModal = document.getElementById("task-modal");
const taskModalContent = document.getElementById("task-modal-content");
const taskModalClose = document.getElementById("task-modal-close");

// ── Drag state ────────────────────────────────────────────────────────────────
let draggedCardId = null;

// ── Init ──────────────────────────────────────────────────────────────────────
if (runtimeMeta) {
  runtimeMeta.textContent = "OpenClaw v" + OPENCLAW_VERSION + " · model: " + MAIN_AGENT_MODEL;
}

render();
renderEvents();
bindEvents();

// ── Bind events ───────────────────────────────────────────────────────────────
function bindEvents() {
  // Add card (create blank task, then open editor)
  addTaskBtn.addEventListener("click", function () {
    var card = {
      id: createId(),
      taskId: nextTaskId(),
      title: "New task",
      detail: "",
      createdAt: new Date().toISOString(),
      agentId: "agent:main",
      status: "todo"
    };
    state.cards.push(card);
    persist();
    render();
    openTaskModal(card.id, true);
  });

  // Clear all
  clearButton.addEventListener("click", function () {
    if (!state.cards.length) return;
    if (!window.confirm("Clear all cards? This cannot be undone.")) return;
    state.cards = [];
    persist();
    render();
  });

  // Drag-and-drop per column
  Object.keys(lists).forEach(function (status) {
    var listEl = lists[status];

    listEl.addEventListener("dragover", function (event) {
      event.preventDefault();
      listEl.classList.add("drag-over");
    });

    listEl.addEventListener("dragleave", function (event) {
      if (!listEl.contains(event.relatedTarget)) {
        listEl.classList.remove("drag-over");
      }
    });

    listEl.addEventListener("drop", function (event) {
      event.preventDefault();
      listEl.classList.remove("drag-over");
      if (!draggedCardId) return;
      moveCard(draggedCardId, status);
    });
  });

  // Tab switching
  tabBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      state.activeTab = btn.dataset.tab;
      renderEvents();
    });
  });

  // Modal close button
  modalClose.addEventListener("click", closeModal);
  taskModalClose.addEventListener("click", closeTaskModal);

  // Click outside modal
  eventModal.addEventListener("click", function (e) {
    if (e.target === eventModal) closeModal();
  });
  taskModal.addEventListener("click", function (e) {
    if (e.target === taskModal) closeTaskModal();
  });

  // ESC to close modal
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && eventModal.classList.contains("is-open")) closeModal();
    if (e.key === "Escape" && taskModal.classList.contains("is-open")) closeTaskModal();
  });
}

// ── Kanban render ─────────────────────────────────────────────────────────────
function render() {
  for (var i = 0; i < STATUSES.length; i++) {
    var status = STATUSES[i];
    var listEl = lists[status];
    var cards = state.cards.filter(function (card) { return card.status === status; });
    countEls[status].textContent = String(cards.length);

    listEl.innerHTML = "";

    if (!cards.length) {
      var empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "Move task here";
      listEl.appendChild(empty);
      continue;
    }

    cards.forEach(function (card) {
      var el = document.createElement("article");
      el.className = "card";
      el.draggable = true;
      el.tabIndex = 0;
      el.dataset.id = card.id;
      var shortDetail = (card.detail || "").length > 72 ? (card.detail || "").slice(0, 72) + "…" : (card.detail || "");
      el.innerHTML =
        '<div class="task-tile-id">' + escapeHtml(card.taskId || "TASK-0000") + '</div>' +
        '<div class="task-tile-title">' + escapeHtml(card.title) + '</div>' +
        '<div class="task-tile-detail">' + escapeHtml(shortDetail) + '</div>';

      el.addEventListener("click", function () { openTaskModal(card.id); });
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openTaskModal(card.id);
        }
      });

      el.addEventListener("dragstart", function () {
        draggedCardId = card.id;
        el.classList.add("dragging");
      });

      el.addEventListener("dragend", function () {
        draggedCardId = null;
        el.classList.remove("dragging");
        document.querySelectorAll(".card-list.drag-over").forEach(function (node) {
          node.classList.remove("drag-over");
        });
      });

      listEl.appendChild(el);
    });
  }
}

function moveCard(cardId, nextStatus) {
  var card = state.cards.find(function (item) { return item.id === cardId; });
  if (!card || !STATUSES.includes(nextStatus) || card.status === nextStatus) return;
  card.status = nextStatus;
  persist();
  render();
}

function persist() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.cards));
}

function loadCards() {
  try {
    var raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    var parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(function (item) {
        return (
          item &&
          typeof item.id === "string" &&
          typeof item.title === "string" &&
          STATUSES.includes(item.status)
        );
      })
      .map(function (item) {
        return { id: item.id, taskId: item.taskId || "TASK-0000", title: item.title.trim(), detail: (item.detail || "").trim(), createdAt: item.createdAt || new Date().toISOString(), agentId: item.agentId || "agent:main", status: item.status };
      })
      .filter(function (item) { return item.title.length > 0; });
  } catch (e) {
    return [];
  }
}

// ── Events render ─────────────────────────────────────────────────────────────

function isWithinLastDays(iso, days) {
  if (!iso) return false;
  var t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  var cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return t >= cutoff;
}

function renderEvents() {
  var scheduled = state.events.filter(function (e) { return e.status === "scheduled"; });
  var completed = state.events.filter(function (e) { return e.status === "completed" && isWithinLastDays(e.completedAt, 7); });

  countScheduled.textContent = String(scheduled.length);
  countCompleted.textContent = String(completed.length);

  // Update tab active state
  tabBtns.forEach(function (btn) {
    var isActive = btn.dataset.tab === state.activeTab;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", String(isActive));
  });

  var visible = state.activeTab === "scheduled" ? scheduled : completed;
  eventList.innerHTML = "";

  if (!visible.length) {
    var empty = document.createElement("div");
    empty.className = "event-empty";
    empty.textContent = "No events";
    eventList.appendChild(empty);
    return;
  }

  visible.forEach(function (evt) {
    var card = document.createElement("article");
    card.className = "event-card event-card--" + evt.status;
    card.setAttribute("role", "listitem");
    card.tabIndex = 0;
    card.setAttribute("aria-label", "Event: " + evt.title);

    var ts = evt.status === "completed" ? evt.completedAt : evt.scheduledAt;

    card.innerHTML =
      '<div class="event-card-main">' +
        '<span class="event-status-badge event-status-badge--' + evt.status + '">' + evt.status + '</span>' +
        '<strong class="event-title">' + escapeHtml(evt.title) + '</strong>' +
      '</div>' +
      '<div class="event-card-meta">' +
        '<span class="event-agent">' + escapeHtml(evt.agentId) + '</span>' +
        '<span class="event-ts">' + formatTs(ts) + '</span>' +
      '</div>';

    card.addEventListener("click", function () { openModal(evt.id); });
    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openModal(evt.id);
      }
    });

    eventList.appendChild(card);
  });
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function openModal(eventId) {
  var evt = state.events.find(function (e) { return e.id === eventId; });
  if (!evt) return;

  var completedRow = evt.completedAt
    ? '<dt>Completed At</dt><dd>' + formatTsFull(evt.completedAt) + '</dd>'
    : "";

  var actionValue = evt.status === "completed"
    ? evt.actionSummary
    : evt.actionSummary;

  modalContent.innerHTML =
    '<div class="modal-header">' +
      '<span class="event-status-badge event-status-badge--' + evt.status + '">' + evt.status + '</span>' +
      '<h2 class="modal-title">' + escapeHtml(evt.title) + '</h2>' +
    '</div>' +
    '<dl class="modal-details">' +
      '<dt>Agent ID</dt>' +
      '<dd class="mono">' + escapeHtml(evt.agentId) + '</dd>' +
      '<dt>Scheduled At</dt>' +
      '<dd>' + formatTsFull(evt.scheduledAt) + '</dd>' +
      completedRow +
      '<dt>Reason</dt>' +
      '<dd>' + escapeHtml(evt.reason) + '</dd>' +
      '<dt>Action Summary</dt>' +
      '<dd>' + escapeHtml(actionValue) + '</dd>' +
    '</dl>';

  eventModal.classList.add("is-open");
  document.body.style.overflow = "hidden";
  modalClose.focus();
}

function closeModal() {
  eventModal.classList.remove("is-open");
  document.body.style.overflow = "";
}

// ── Events persistence ────────────────────────────────────────────────────────

function buildActiveScheduledEvents() {
  var now = new Date();
  var hourMap = {
    'OpenClaw_Auto_Update': [3,0],
    'News_Report': [6,30],
    'Weather_BTC_Report': [7,0],
    'EV_Job_Scout': [10,0]
  };
  return ACTIVE_SCHEDULED_TASKS.map(function (t) {
    var hm = hourMap[t.title] || [9,0];
    var next = new Date(now);
    next.setHours(hm[0], hm[1], 0, 0);
    if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
    return {
      id: t.id,
      title: t.title,
      status: 'scheduled',
      reason: t.reason + ' Source: ' + t.source + ' cron (' + t.schedule + ').',
      actionSummary: t.actionSummary,
      scheduledAt: next.toISOString(),
      completedAt: null,
      agentId: t.agentId
    };
  });
}

function ensureRequiredEvents(events) {
  var scheduled = buildActiveScheduledEvents();

  // remove stale scheduled entries and replace with active task set only
  events = events.filter(function (e) { return e.status !== 'scheduled'; });

  // keep completed timeline relevant for dashboard UX
  var cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  events = events.filter(function (e) {
    if (e.status !== 'completed') return true;
    if (!e.completedAt) return false;
    var t = new Date(e.completedAt).getTime();
    return !Number.isNaN(t) && t >= cutoff;
  });

  events = events.concat(scheduled);

  try {
    window.localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  } catch (e) {}

  return events;
}


function persistEvents() {
  window.localStorage.setItem(EVENTS_KEY, JSON.stringify(state.events));
}

function loadEvents() {
  try {
    var raw = window.localStorage.getItem(EVENTS_KEY);
    if (!raw) return seedEvents();
    var parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) return seedEvents();
    var cleaned = parsed.filter(function (e) {
      return e &&
        typeof e.id === "string" &&
        typeof e.title === "string" &&
        EVENT_STATUSES.includes(e.status);
    });
    return ensureRequiredEvents(cleaned);
  } catch (e) {
    return seedEvents();
  }
}

function seedEvents() {
  var events = [
    {
      id: "evt-001",
      title: "Weather & BTC Morning Report",
      status: "completed",
      reason: "Daily 7:00 AM cron job triggered to fetch Hawthorne, CA weather and current BTC price.",
      actionSummary: "Fetched weather data (72\u00b0F, partly cloudy). Retrieved BTC at $94,210. Composed and delivered summary to Telegram @AstraClaw08_bot.",
      scheduledAt: "2026-02-25T15:00:00.000Z",
      completedAt: "2026-02-25T15:01:43.000Z",
      agentId: "agent:main",
    },
    {
      id: "evt-002",
      title: "AI & OpenClaw News Digest",
      status: "completed",
      reason: "Daily 7:30 AM cron job triggered to surface AI news from Reddit and Google.",
      actionSummary: "Scraped r/MachineLearning and r/LocalLLaMA. Summarized 6 articles including Claude 4.6 release notes and a LangGraph paper. Delivered digest via Telegram.",
      scheduledAt: "2026-02-25T15:30:00.000Z",
      completedAt: "2026-02-25T15:32:11.000Z",
      agentId: "agent:main",
    },
    {
      id: "evt-003",
      title: "Liveness Ping Check",
      status: "completed",
      reason: "Daily 8:00 AM cron job to confirm gateway is online and agent is responsive.",
      actionSummary: "Responded with PST timestamp 2026-02-25 08:00:12. Gateway latency: 42ms. All channels healthy.",
      scheduledAt: "2026-02-25T16:00:00.000Z",
      completedAt: "2026-02-25T16:00:15.000Z",
      agentId: "agent:main",
    },
    {
      id: "evt-004",
      title: "Memory Index Rebuild",
      status: "completed",
      reason: "Auto-triggered after session-memory hook detected 50+ new memory files since last index.",
      actionSummary: "Ran memory index --force. Indexed 127 files, built 3,841 embeddings using nomic-embed-text. Completed in 18s.",
      scheduledAt: "2026-02-24T22:15:00.000Z",
      completedAt: "2026-02-24T22:15:18.000Z",
      agentId: "agent:main",
    },
    {
      id: "evt-005",
      title: "Weather & BTC Morning Report",
      status: "scheduled",
      reason: "Recurring daily cron at 7:00 AM PT \u2014 delivers weather for Hawthorne, CA and live BTC price to Telegram.",
      actionSummary: "Will fetch current weather conditions and BTC price, compose a concise summary, and deliver to the paired Telegram channel.",
      scheduledAt: "2026-02-26T15:00:00.000Z",
      completedAt: null,
      agentId: "agent:main",
    },
    {
      id: "evt-006",
      title: "AI & OpenClaw News Digest",
      status: "scheduled",
      reason: "Recurring daily cron at 7:30 AM PT \u2014 surfaces latest AI and OpenClaw news from Reddit/Google.",
      actionSummary: "Will search Reddit and Google for top AI news, summarize key posts, and deliver a digest to Telegram.",
      scheduledAt: "2026-02-26T15:30:00.000Z",
      completedAt: null,
      agentId: "agent:main",
    },
    {
      id: "evt-007",
      title: "Liveness Ping Check",
      status: "scheduled",
      reason: "Recurring daily cron at 8:00 AM PT \u2014 confirms gateway uptime and agent responsiveness.",
      actionSummary: "Will reply with the current PST timestamp and confirm all channels are healthy.",
      scheduledAt: "2026-02-26T16:00:00.000Z",
      completedAt: null,
      agentId: "agent:main",
    },

    {
      id: "evt-008",
      title: "EV_Job_Scout Report",
      status: "completed",
      reason: "Manual run requested to validate posting quality and URL integrity for EV/Solar/ESS opportunities.",
      actionSummary: "Generated 8 validated postings, excluded dead links, and delivered updated report to Telegram.",
      scheduledAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
      agentId: "agent:main",
    },
    {
      id: "evt-009",
      title: "EV_Job_Scout Report",
      status: "scheduled",
      reason: "Recurring daily cron at 10:00 AM PT for EV/PV/ESS managerial + executive role scouting.",
      actionSummary: "Will gather and rank up to top 20 relevant active postings and deliver to Telegram.",
      scheduledAt: new Date(Date.now() + 11 * 60 * 60 * 1000).toISOString(),
      completedAt: null,
      agentId: "agent:main",
    },
  ];
  events = ensureRequiredEvents(events);
  window.localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  return events;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function nextTaskId() {
  var n = 0;
  try { n = parseInt(window.localStorage.getItem(TASK_COUNTER_KEY) || "0", 10) || 0; } catch (e) {}
  n += 1;
  try { window.localStorage.setItem(TASK_COUNTER_KEY, String(n)); } catch (e) {}
  return "TASK-" + String(n).padStart(4, "0");
}

var activeTaskModalId = null;

function renderTaskModal(card, isEdit) {
  if (!card) return;
  var statusValue = card.status || "todo";
  taskModalContent.innerHTML =
    '<div class="modal-header">' +
      '<h2 class="modal-title">' + escapeHtml(card.taskId || "TASK-0000") + ' — ' + escapeHtml(card.title) + '</h2>' +
      '<div class="modal-actions">' +
        (isEdit
          ? '<button id="task-save-btn" class="task-save-btn" type="button">Save</button>'
          : '<button id="task-edit-btn" class="task-edit-btn" type="button">Edit</button>') +
      '</div>' +
    '</div>' +
    '<dl class="modal-details">' +
      '<dt>Task Status</dt><dd>' +
        (isEdit
          ? '<select id="task-edit-status" class="task-edit-input">' +
              '<option value="todo"' + (statusValue === 'todo' ? ' selected' : '') + '>TODO</option>' +
              '<option value="doing"' + (statusValue === 'doing' ? ' selected' : '') + '>DOING</option>' +
              '<option value="done"' + (statusValue === 'done' ? ' selected' : '') + '>DONE</option>' +
            '</select>'
          : escapeHtml(statusValue.toUpperCase())) +
      '</dd>' +
      '<dt>Created At</dt><dd>' + formatTsFull(card.createdAt) + '</dd>' +
      '<dt>Agent</dt><dd class="mono">' +
        (isEdit
          ? '<input id="task-edit-agent" class="task-edit-input mono" type="text" value="' + escapeHtml(card.agentId || "agent:main") + '" />'
          : escapeHtml(card.agentId || "agent:main")) +
      '</dd>' +
      '<dt>Task Name</dt><dd>' +
        (isEdit
          ? '<input id="task-edit-title" class="task-edit-input" type="text" maxlength="120" value="' + escapeHtml(card.title || "") + '" />'
          : escapeHtml(card.title || "")) +
      '</dd>' +
      '<dt>Details</dt><dd>' +
        (isEdit
          ? '<textarea id="task-edit-detail" class="task-edit-textarea" rows="5" maxlength="1200">' + escapeHtml(card.detail || "") + '</textarea>'
          : escapeHtml(card.detail || "")) +
      '</dd>' +
    '</dl>';

  var editBtn = document.getElementById("task-edit-btn");
  if (editBtn) {
    editBtn.addEventListener("click", function () {
      renderTaskModal(card, true);
    });
  }

  var saveBtn = document.getElementById("task-save-btn");
  if (saveBtn) {
    saveBtn.addEventListener("click", function () {
      var updated = {
        title: (document.getElementById("task-edit-title").value || "").trim(),
        status: document.getElementById("task-edit-status").value,
        agentId: (document.getElementById("task-edit-agent").value || "").trim(),
        detail: (document.getElementById("task-edit-detail").value || "").trim()
      };
      if (!updated.title || !updated.detail || !updated.agentId) return;

      var target = state.cards.find(function (c) { return c.id === activeTaskModalId; });
      if (!target) return;
      target.title = updated.title;
      target.status = updated.status;
      target.agentId = updated.agentId;
      target.detail = updated.detail;

      persist();
      render();
      renderTaskModal(target, false);
    });
  }
}

function openTaskModal(cardId, startInEditMode) {
  var card = state.cards.find(function (c) { return c.id === cardId; });
  if (!card) return;
  activeTaskModalId = cardId;
  renderTaskModal(card, !!startInEditMode);
  taskModal.classList.add("is-open");
  document.body.style.overflow = "hidden";
  taskModalClose.focus();
}

function closeTaskModal() {
  activeTaskModalId = null;
  taskModal.classList.remove("is-open");
  document.body.style.overflow = "";
}

function createId() {
  return Date.now() + "-" + Math.random().toString(36).slice(2, 8);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatTs(iso) {
  if (!iso) return "\u2014";
  try {
    var d = new Date(iso);
    var diff = Date.now() - d.getTime();
    var abs = Math.abs(diff);
    var future = diff < 0;
    if (abs < 60000) return future ? "in a moment" : "just now";
    if (abs < 3600000) {
      var m = Math.round(abs / 60000);
      return future ? "in " + m + "m" : m + "m ago";
    }
    if (abs < 86400000) {
      var h = Math.round(abs / 3600000);
      return future ? "in " + h + "h" : h + "h ago";
    }
    var days = Math.round(abs / 86400000);
    return future ? "in " + days + "d" : days + "d ago";
  } catch (e) {
    return iso;
  }
}

function formatTsFull(iso) {
  if (!iso) return "\u2014";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch (e) {
    return iso;
  }
}
