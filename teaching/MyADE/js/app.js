import { loadDatabase } from "./data.js";
import { renderServiceSummary } from "./views/serviceSummary.js";
import { renderTimelineView } from "./views/timelineView.js";
import { renderGanttView } from "./views/ganttView.js";

const container = document.querySelector("#view-container");
const status = document.querySelector("#data-status");
const themeToggle = document.querySelector("#theme-toggle");
const themeToggleLabel = document.querySelector("#theme-toggle-label");
const pageEyebrow = document.querySelector(".page-heading .eyebrow");
const pageTitle = document.querySelector(".page-heading h2");
const pageDescription = document.querySelector(".page-description");

let database = null;
let currentView = "summary";

const VIEW_META = {
  summary: {
    eyebrow: "Teaching service",
    title: "Service summary",
    description: "Aggregated teaching hours and session counts by course and session type.",
  },
  timeline: {
    eyebrow: "Workload planning",
    title: "Timeline",
    description: "Calendar, weekly, monthly, and cumulative workload across the academic year.",
  },
  gantt: {
    eyebrow: "Academic-year planning",
    title: "Gantt diagram",
    description: "Course activity periods and scheduled sessions on a shared horizontal timeline.",
  },
};

initializeThemeToggle();
initialize();

async function initialize() {
  try {
    database = await loadDatabase();
    bindNavigation();
    showView("summary");

    const generatedAt = database.metadata?.generated_at;
    status.textContent = generatedAt
      ? `Data loaded · generated ${formatDateTime(generatedAt)}`
      : "Data loaded";
    status.classList.add("is-ready");
  } catch (error) {
    console.error(error);
    status.textContent = "Data could not be loaded";
    status.classList.add("is-error");
    container.innerHTML = `
      <div class="state-card error">
        <strong>Unable to display the dashboard.</strong>
        <p>${escapeHtml(error.message)}</p>
        <p>
          Confirm that the generated JSON exists in <code>./data/</code>
          and serve the project through a local web server.
        </p>
      </div>
    `;
  }
}

function bindNavigation() {
  document.querySelectorAll(".nav-button[data-view]").forEach((button) => {
    if (button.disabled) return;
    button.addEventListener("click", () => showView(button.dataset.view));
  });
}

function showView(view) {
  if (!database || !VIEW_META[view]) return;
  currentView = view;

  document.querySelectorAll(".nav-button[data-view]").forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });

  const meta = VIEW_META[view];
  if (pageEyebrow) pageEyebrow.textContent = meta.eyebrow;
  if (pageTitle) pageTitle.textContent = meta.title;
  if (pageDescription) pageDescription.textContent = meta.description;

  if (view === "timeline") renderTimelineView(container, database);
  else if (view === "gantt") renderGanttView(container, database);
  else renderServiceSummary(container, database);
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function initializeThemeToggle() {
  updateThemeToggle();

  themeToggle?.addEventListener("click", () => {
    const currentTheme = document.documentElement.dataset.theme;
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem("ade-dashboard-theme", nextTheme);
    updateThemeToggle();

    if (currentView === "timeline") {
      container.refreshTimelineCharts?.();
    }
  });
}

function updateThemeToggle() {
  if (!themeToggle || !themeToggleLabel) return;
  const isDark = document.documentElement.dataset.theme !== "light";
  themeToggle.setAttribute("aria-checked", String(isDark));
  themeToggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
  themeToggleLabel.textContent = isDark ? "Dark" : "Light";
}
