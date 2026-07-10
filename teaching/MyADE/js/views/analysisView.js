const SESSION_TYPES = ["CM", "TD", "TD1", "TD2", "EXAM"];
const PROJECT_CATEGORY = "project/suivi";

export function renderAnalysisView(container, database) {
  const activityOptions = Object.values(database.courses ?? {})
    .map((course) => ({ id: course.id, name: course.name }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  const establishmentOptions = uniqueValues(
    Object.values(database.courses ?? {}).flatMap((course) =>
      (course.audiences ?? []).map((audience) => audience.establishment),
    ),
  ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  container.innerHTML = `
    <section class="analysis-header">
      <div>
        <h2>Analysis</h2>
        <p>Compare workload, service equivalence, and session composition.</p>
      </div>
    </section>

    <section class="filter-card" aria-label="Analysis filters">
      <div class="filter-heading">
        <div>
          <h3>Analysis filters</h3>
          <p>These selections are independent from the Table view.</p>
        </div>
        <button id="analysis-reset-filters" class="secondary-button" type="button">Reset filters</button>
      </div>
      <div class="filter-grid">
        ${multiSelectFilter("analysis-activity-filter", "Activity", activityOptions.map((item) => ({ value: item.id, label: item.name })))}
        ${multiSelectFilter("analysis-category-filter", "Activity type", [
          { value: "course", label: "Courses" },
          { value: PROJECT_CATEGORY, label: "Projects / suivis" },
        ])}
        ${multiSelectFilter("analysis-session-type-filter", "Session type", [
          ...SESSION_TYPES.map((type) => ({ value: type, label: type === "EXAM" ? "Exam" : type })),
          { value: PROJECT_CATEGORY, label: "Projet / suivi" },
        ])}
        ${multiSelectFilter("analysis-establishment-filter", "Establishment", establishmentOptions.map((value) => ({ value, label: value })))}
        <label class="filter-field filter-field-search">
          <span>Search</span>
          <input id="analysis-search-filter" class="filter-control search-input" type="search" placeholder="Name, diploma, year…" autocomplete="off">
        </label>
      </div>
    </section>

    <section id="analysis-empty" class="analysis-empty" hidden>No activities match the current filters.</section>
    <section id="analysis-chart-grid" class="analysis-chart-grid">
      ${chartCard("analysis-hours-chart", "Hours by activity", "Actual selected workload for each activity.")}
      ${chartCard("analysis-types-chart", "Session-type distribution", "Share of selected hours by CM, TD, exam, and project/suivi.")}
      ${chartCard("analysis-eqtd-chart", "Eq. TD by activity", "Equivalent service using the configured coefficients.")}
      ${chartCard("analysis-sessions-chart", "Sessions by activity", "Number of selected scheduled sessions per activity.")}
    </section>
  `;

  const state = {
    database,
    query: "",
    selectedActivities: new Set(activityOptions.map((item) => item.id)),
    selectedCategories: new Set(["course", PROJECT_CATEGORY]),
    selectedSessionTypes: new Set([...SESSION_TYPES, PROJECT_CATEGORY]),
    selectedEstablishments: new Set(establishmentOptions),
    establishmentCount: establishmentOptions.length,
  };

  bindMultiSelect(container, "analysis-activity-filter", state.selectedActivities, () => updateAnalysis(container, state));
  bindMultiSelect(container, "analysis-category-filter", state.selectedCategories, () => updateAnalysis(container, state));
  bindMultiSelect(container, "analysis-session-type-filter", state.selectedSessionTypes, () => updateAnalysis(container, state));
  bindMultiSelect(container, "analysis-establishment-filter", state.selectedEstablishments, () => updateAnalysis(container, state));
  container.querySelector("#analysis-search-filter").addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLocaleLowerCase();
    updateAnalysis(container, state);
  });
  container.querySelector("#analysis-reset-filters").addEventListener("click", () => {
    state.query = "";
    container.querySelector("#analysis-search-filter").value = "";
    resetMultiSelect(container, "analysis-activity-filter", state.selectedActivities);
    resetMultiSelect(container, "analysis-category-filter", state.selectedCategories);
    resetMultiSelect(container, "analysis-session-type-filter", state.selectedSessionTypes);
    resetMultiSelect(container, "analysis-establishment-filter", state.selectedEstablishments);
    updateAnalysis(container, state);
  });

  updateAnalysis(container, state);
}

function updateAnalysis(container, state) {
  const rows = buildRows(state.database, state.selectedSessionTypes)
    .filter((row) => state.selectedActivities.has(row.id))
    .filter((row) => state.selectedCategories.has(row.category))
    .filter((row) => state.selectedEstablishments.size === state.establishmentCount || row.establishments.some((value) => state.selectedEstablishments.has(value)))
    .filter((row) => !state.query || row.searchText.includes(state.query))
    .filter((row) => row.totalMinutes > 0);

  const empty = rows.length === 0;
  container.querySelector("#analysis-empty").hidden = !empty;
  container.querySelector("#analysis-chart-grid").hidden = empty;
  if (empty || typeof Plotly === "undefined") return;

  const theme = chartTheme();
  renderHoursChart(container, rows, theme);
  renderTypeChart(container, rows, theme);
  renderEqTdChart(container, rows, theme);
  renderSessionsChart(container, rows, theme);
}

function renderHoursChart(container, rows, theme) {
  const ordered = [...rows].sort((a, b) => a.totalMinutes - b.totalMinutes);
  const traces = categoryBarTraces(ordered, (row) => row.totalMinutes / 60, "Hours");
  draw(container, "analysis-hours-chart", traces, horizontalLayout(theme, "Hours"));
}

function renderTypeChart(container, rows, theme) {
  const values = [
    ["CM", sumBy(rows, "CM")],
    ["TD", sumBy(rows, "TD") + sumBy(rows, "TD1") + sumBy(rows, "TD2")],
    ["Exam", sumBy(rows, "EXAM")],
    ["Projet / suivi", sumBy(rows, "suiviMinutes")],
  ].filter(([, minutes]) => minutes > 0);
  draw(container, "analysis-types-chart", [{ type: "pie", hole: 0.58, labels: values.map(([label]) => label), values: values.map(([, minutes]) => minutes / 60), textinfo: "label+percent", hovertemplate: "%{label}<br>%{value:.1f} h<extra></extra>" }], {
    ...baseLayout(theme),
    showlegend: true,
    legend: { orientation: "h", y: -0.12, x: 0.5, xanchor: "center", font: { color: theme.text } },
    margin: { l: 20, r: 20, t: 10, b: 55 },
  });
}

function renderEqTdChart(container, rows, theme) {
  const ordered = [...rows].map((row) => ({ ...row, eqTd: equivalentTd(row) })).sort((a, b) => a.eqTd - b.eqTd);
  const traces = categoryBarTraces(ordered, (row) => row.eqTd / 60, "Eq. TD hours");
  draw(container, "analysis-eqtd-chart", traces, horizontalLayout(theme, "Eq. TD hours"));
}

function renderSessionsChart(container, rows, theme) {
  const ordered = [...rows].sort((a, b) => a.sessionCount - b.sessionCount);
  const traces = categoryBarTraces(ordered, (row) => row.sessionCount, "Sessions", true);
  draw(container, "analysis-sessions-chart", traces, horizontalLayout(theme, "Sessions", true));
}

function categoryBarTraces(rows, valueSelector, label, integers = false) {
  return [
    { category: "course", name: "Course" },
    { category: PROJECT_CATEGORY, name: "Project / suivi" },
  ].map(({ category, name }) => {
    const filtered = rows.filter((row) => row.category === category);
    return {
      type: "bar",
      orientation: "h",
      name,
      y: filtered.map((row) => row.name),
      x: filtered.map(valueSelector),
      customdata: filtered.map((row) => row.name),
      hovertemplate: integers ? "%{customdata}<br>%{x:.0f} sessions<extra></extra>" : `%{customdata}<br>%{x:.1f} ${label}<extra></extra>`,
    };
  }).filter((trace) => trace.x.length > 0);
}

function draw(container, id, traces, layout) {
  Plotly.react(container.querySelector(`#${id}`), traces, layout, { responsive: true, displaylogo: false, modeBarButtonsToRemove: ["lasso2d", "select2d"] });
}

function horizontalLayout(theme, xTitle, integerTicks = false) {
  return {
    ...baseLayout(theme),
    barmode: "stack",
    margin: { l: 145, r: 24, t: 12, b: 52 },
    xaxis: { title: xTitle, color: theme.text, gridcolor: theme.grid, zerolinecolor: theme.grid, rangemode: "tozero", dtick: integerTicks ? 1 : undefined },
    yaxis: { color: theme.text, automargin: true },
    legend: { orientation: "h", y: -0.2, x: 0.5, xanchor: "center", font: { color: theme.text } },
  };
}

function baseLayout(theme) {
  return { paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)", font: { color: theme.text, family: "inherit" }, hoverlabel: { bgcolor: theme.surface, font: { color: theme.text } } };
}

function chartTheme() {
  const styles = getComputedStyle(document.documentElement);
  return {
    text: styles.getPropertyValue("--text").trim() || "#e5e7eb",
    surface: styles.getPropertyValue("--surface").trim() || "#111827",
    grid: styles.getPropertyValue("--border").trim() || "#374151",
  };
}

function buildRows(database, selectedSessionTypes) {
  const sessionsByCourse = new Map();
  const suiviMinutesByCourse = new Map();
  for (const suivi of database.suivis ?? []) {
    if (!suivi.course_id) continue;
    suiviMinutesByCourse.set(suivi.course_id, (suiviMinutesByCourse.get(suivi.course_id) ?? 0) + Number(suivi.hours || 0) * 60);
  }
  for (const session of database.sessions ?? []) {
    if (!sessionsByCourse.has(session.course_id)) sessionsByCourse.set(session.course_id, []);
    sessionsByCourse.get(session.course_id).push(session);
  }
  return Object.values(database.courses ?? {}).map((course) => {
    const sessions = (sessionsByCourse.get(course.id) ?? []).filter((session) => selectedSessionTypes.has(normalizeSessionType(session.session_type)));
    const minutes = Object.fromEntries(SESSION_TYPES.map((type) => [type, 0]));
    for (const session of sessions) {
      const type = normalizeSessionType(session.session_type);
      minutes[type] = (minutes[type] ?? 0) + Number(session.duration_minutes || 0);
    }
    const audiences = course.audiences ?? [];
    const establishments = uniqueValues(audiences.map((audience) => audience.establishment));
    const suiviMinutes = selectedSessionTypes.has(PROJECT_CATEGORY) ? (suiviMinutesByCourse.get(course.id) ?? 0) : 0;
    const sessionMinutes = sessions.reduce((sum, session) => sum + Number(session.duration_minutes || 0), 0);
    const category = course.category === PROJECT_CATEGORY ? PROJECT_CATEGORY : "course";
    const audienceText = audiences.map((audience) => [audience.year, audience.diploma, audience.track, audience.study_mode].filter(Boolean).join(" "));
    return { id: course.id, name: course.name, category, establishments, searchText: [course.name, category, ...establishments, ...audienceText].join(" ").toLocaleLowerCase(), sessionCount: sessions.length, suiviMinutes, sessionMinutes, totalMinutes: sessionMinutes + suiviMinutes, ...minutes };
  });
}

function equivalentTd(row) { return row.CM * 1.5 + row.TD + row.TD1 + row.TD2 + row.EXAM * 1.5 + row.suiviMinutes; }
function chartCard(id, title, description) { return `<article class="analysis-chart-card"><header><h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p></header><div id="${id}" class="analysis-chart"></div></article>`; }
function multiSelectFilter(id, label, options) { return `<div class="filter-field multi-filter" id="${id}"><span>${escapeHtml(label)}</span><details class="multi-filter-menu"><summary class="filter-control multi-filter-summary"><span class="multi-filter-summary-text">All selected</span></summary><div class="multi-filter-popover"><div class="multi-filter-actions"><button type="button" data-action="all">Select all</button><button type="button" data-action="clear">Clear</button><button type="button" data-action="invert">Invert</button></div><div class="multi-filter-options">${options.map((option) => `<label class="multi-filter-option"><input type="checkbox" value="${escapeHtml(option.value)}" checked><span>${escapeHtml(option.label)}</span></label>`).join("")}</div></div></details></div>`; }
function bindMultiSelect(container, id, selectedValues, onChange) { const root = container.querySelector(`#${id}`); const inputs = [...root.querySelectorAll('input[type="checkbox"]')]; const apply = () => { selectedValues.clear(); inputs.filter((input) => input.checked).forEach((input) => selectedValues.add(input.value)); updateSummary(root, inputs); onChange(); }; inputs.forEach((input) => input.addEventListener("change", apply)); root.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", () => { inputs.forEach((input) => { if (button.dataset.action === "all") input.checked = true; if (button.dataset.action === "clear") input.checked = false; if (button.dataset.action === "invert") input.checked = !input.checked; }); apply(); })); updateSummary(root, inputs); }
function resetMultiSelect(container, id, selectedValues) { const root = container.querySelector(`#${id}`); const inputs = [...root.querySelectorAll('input[type="checkbox"]')]; inputs.forEach((input) => { input.checked = true; }); selectedValues.clear(); inputs.forEach((input) => selectedValues.add(input.value)); updateSummary(root, inputs); }
function updateSummary(root, inputs) { const selected = inputs.filter((input) => input.checked); root.querySelector(".multi-filter-summary-text").textContent = selected.length === inputs.length ? "All selected" : selected.length === 0 ? "None selected" : selected.length === 1 ? selected[0].nextElementSibling.textContent : `${selected.length} of ${inputs.length} selected`; }
function sumBy(rows, key) { return rows.reduce((sum, row) => sum + Number(row[key] || 0), 0); }
function uniqueValues(values) { return [...new Set(values.filter(Boolean))]; }
function normalizeSessionType(type) { return String(type || "").toUpperCase(); }
function escapeHtml(value) { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
