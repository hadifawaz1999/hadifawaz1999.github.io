import { loadDatabase } from "./data.js";
import { renderServiceSummary } from "./views/serviceSummary.js";
import { renderTimelineView } from "./views/timelineView.js";

const container = document.querySelector("#view-container");
const status = document.querySelector("#data-status");
const themeToggle = document.querySelector("#theme-toggle");
const themeToggleLabel = document.querySelector("#theme-toggle-label");

const navigationButtons = document.querySelectorAll(".nav-button[data-view]");
const pageEyebrow = document.querySelector(".page-heading .eyebrow");
const pageTitle = document.querySelector(".page-heading h2");
const pageDescription = document.querySelector(".page-description");

let database = null;
let currentView = "summary";

initializeThemeToggle();
initialize();

async function initialize() {
  try {
    database = await loadDatabase();

    setupNavigation();
    renderCurrentView();

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
          Confirm that <code>courses.json</code> exists at
          <code>./data/courses.json</code> and serve the project through a local web server.
        </p>
      </div>
    `;
  }
}

function setupNavigation() {
  navigationButtons.forEach((button) => {
    if (button.disabled) return;

    button.addEventListener("click", () => {
      const requestedView = button.dataset.view;

      if (!requestedView || requestedView === currentView) {
        return;
      }

      currentView = requestedView;
      updateNavigationButtons();
      renderCurrentView();
    });
  });
}

function updateNavigationButtons() {
  navigationButtons.forEach((button) => {
    const isActive = button.dataset.view === currentView;

    button.classList.toggle("active", isActive);

    if (isActive) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });
}

function renderCurrentView() {
  if (!database) return;

  switch (currentView) {
    case "timeline":
      updatePageHeading({
        eyebrow: "Teaching schedule",
        title: "Timeline",
        description:
          "Teaching workload over the academic year, grouped by month, week, and day. Explore when scheduled teaching happens during the academic year.",
      });

      renderTimelineView(container, database);
      break;

    case "summary":
    default:
      updatePageHeading({
        eyebrow: "Teaching service",
        title: "Service summary",
        description:
          "Aggregated teaching hours and session counts by course and session type.",
      });

      renderServiceSummary(container, database);
      break;
  }
}

function updatePageHeading({ eyebrow, title, description }) {
  if (pageEyebrow) pageEyebrow.textContent = eyebrow;
  if (pageTitle) pageTitle.textContent = title;
  if (pageDescription) pageDescription.textContent = description;
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
  });
}

function updateThemeToggle() {
  if (!themeToggle || !themeToggleLabel) return;

  const isDark = document.documentElement.dataset.theme !== "light";
  themeToggle.setAttribute("aria-checked", String(isDark));
  themeToggle.setAttribute(
    "aria-label",
    isDark ? "Switch to light mode" : "Switch to dark mode",
  );
  themeToggleLabel.textContent = isDark ? "Dark" : "Light";
}
