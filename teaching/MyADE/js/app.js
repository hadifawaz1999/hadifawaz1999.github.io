import { loadDatabase } from "./data.js";
import { renderServiceSummary } from "./views/serviceSummary.js";

const container = document.querySelector("#view-container");
const status = document.querySelector("#data-status");
const themeToggle = document.querySelector("#theme-toggle");
const themeToggleLabel = document.querySelector("#theme-toggle-label");

initializeThemeToggle();
initialize();

async function initialize() {
  try {
    const database = await loadDatabase();
    renderServiceSummary(container, database);

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
        <strong>Unable to display the service summary.</strong>
        <p>${escapeHtml(error.message)}</p>
        <p>
          Confirm that <code>courses.json</code> exists at
          <code>./data/courses.json</code> and serve the project through a local web server.
        </p>
      </div>
    `;
  }
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
