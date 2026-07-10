import { renderAnalysisView } from "./analysisView.js";

const SESSION_TYPES = ["CM", "TD", "TD1", "TD2", "EXAM"];
const PROJECT_CATEGORY = "project/suivi";

export function renderServiceSummary(container, database) {
  container.innerHTML = `
    <nav class="dashboard-view-tabs" aria-label="Dashboard views">
      <button class="dashboard-view-tab is-active" type="button" data-view="table" aria-selected="true">Table</button>
      <button class="dashboard-view-tab" type="button" data-view="analysis" aria-selected="false">Analysis</button>
    </nav>
    <section class="dashboard-view-panel" data-view-panel="table"></section>
    <section class="dashboard-view-panel" data-view-panel="analysis" hidden></section>
  `;

  const tablePanel = container.querySelector('[data-view-panel="table"]');
  const analysisPanel = container.querySelector('[data-view-panel="analysis"]');
  renderTableView(tablePanel, database);
  renderAnalysisView(analysisPanel, database);

  container.querySelectorAll(".dashboard-view-tab").forEach((button) => {
    button.addEventListener("click", () => {
      const selectedView = button.dataset.view;
      container.querySelectorAll(".dashboard-view-tab").forEach((tab) => {
        const active = tab === button;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-selected", String(active));
      });
      container.querySelectorAll("[data-view-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.viewPanel !== selectedView;
      });
      if (selectedView === "analysis") {
        window.dispatchEvent(new Event("resize"));
      }
    });
  });
}

function renderTableView(container, database) {
  const activityOptions = Object.values(database.courses ?? {})
    .map((course) => ({ id: course.id, name: course.name }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  const establishmentOptions = uniqueValues(
    Object.values(database.courses ?? {}).flatMap((course) =>
      (course.audiences ?? []).map((audience) => audience.establishment),
    ),
  ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  container.innerHTML = `
    <section id="service-metrics" class="summary-grid summary-grid-six" aria-label="Service totals"></section>

    <section class="filter-card" aria-label="Service filters">
      <div class="filter-heading">
        <div>
          <h3>Filters</h3>
          <p>Summary cards and table totals update automatically.</p>
        </div>
        <button id="reset-filters" class="secondary-button" type="button">Reset filters</button>
      </div>

      <div class="filter-grid">
        ${multiSelectFilter("activity-filter", "Activity", activityOptions.map((item) => ({
          value: item.id,
          label: item.name,
        })))}

        ${multiSelectFilter("category-filter", "Activity type", [
          { value: "course", label: "Courses" },
          { value: PROJECT_CATEGORY, label: "Projects / suivis" },
        ])}

        ${multiSelectFilter("session-type-filter", "Session type", [
          ...SESSION_TYPES.map((type) => ({ value: type, label: type === "EXAM" ? "Exam" : type })),
          { value: PROJECT_CATEGORY, label: "Projet / suivi" },
        ])}

        ${multiSelectFilter("establishment-filter", "Establishment", establishmentOptions.map((value) => ({
          value,
          label: value,
        })))}

        <label class="filter-field filter-field-search">
          <span>Search</span>
          <input
            id="course-filter"
            class="filter-control search-input"
            type="search"
            placeholder="Name, diploma, year…"
            autocomplete="off"
          >
        </label>
      </div>
    </section>

    <section class="table-card">
      <div class="table-toolbar">
        <div class="table-toolbar-title">
          <h3>Service summary</h3>
          <div class="table-legend" aria-label="Row type legend">
            <span class="legend-item">
              <span class="legend-swatch legend-swatch-course" aria-hidden="true"></span>
              Course
            </span>
            <span class="legend-item">
              <span class="legend-swatch legend-swatch-project" aria-hidden="true"></span>
              Project / suivi
            </span>
          </div>
        </div>
      </div>

      <div class="table-scroll">
        <table class="service-table">
          <thead>
            <tr>
              ${sortableHeader("Name", "name", "sticky-name-column")}
              ${sortableHeader("Establishment", "establishment")}
              <th>Audience</th>
              ${sortableHeader("CM", "CM", "number-heading")}
              ${sortableHeader("TD", "TD", "number-heading")}
              ${sortableHeader("TD1", "TD1", "number-heading")}
              ${sortableHeader("TD2", "TD2", "number-heading")}
              ${sortableHeader("Exam", "EXAM", "number-heading")}
              ${sortableHeader("Projet/suivi", "suiviMinutes", "number-heading")}
              ${sortableHeader("Sessions", "sessionCount", "number-heading")}
              ${sortableHeader("Total", "totalMinutes", "number-heading")}
            </tr>
          </thead>
          <tbody id="service-table-body"></tbody>
          <tfoot id="service-table-totals"></tfoot>
        </table>
      </div>

      <div id="table-footer" class="table-footer"></div>
    </section>
  `;

  addVisuallyHiddenUtility();

  const state = {
    database,
    query: "",
    selectedActivities: new Set(activityOptions.map((item) => item.id)),
    selectedCategories: new Set(["course", PROJECT_CATEGORY]),
    selectedSessionTypes: new Set([...SESSION_TYPES, PROJECT_CATEGORY]),
    selectedEstablishments: new Set(establishmentOptions),
    optionCounts: {
      activities: activityOptions.length,
      categories: 2,
      sessionTypes: SESSION_TYPES.length + 1,
      establishments: establishmentOptions.length,
    },
    sortKey: "default",
    sortDirection: "asc",
  };

  bindFilter(container, "#course-filter", "input", (value) => {
    state.query = value.trim().toLocaleLowerCase();
    updateView(container, state);
  });

  bindMultiSelect(container, "activity-filter", state.selectedActivities, () => updateView(container, state));
  bindMultiSelect(container, "category-filter", state.selectedCategories, () => updateView(container, state));
  bindMultiSelect(container, "session-type-filter", state.selectedSessionTypes, () => updateView(container, state));
  bindMultiSelect(container, "establishment-filter", state.selectedEstablishments, () => updateView(container, state));

  container.querySelector("#reset-filters").addEventListener("click", () => {
    state.query = "";
    container.querySelector("#course-filter").value = "";

    resetMultiSelect(container, "activity-filter", state.selectedActivities);
    resetMultiSelect(container, "category-filter", state.selectedCategories);
    resetMultiSelect(container, "session-type-filter", state.selectedSessionTypes);
    resetMultiSelect(container, "establishment-filter", state.selectedEstablishments);
    updateView(container, state);
  });

  container.querySelectorAll(".sort-button").forEach((button) => {
    button.addEventListener("click", () => {
      const nextKey = button.dataset.sortKey;
      if (state.sortKey === nextKey) {
        state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
      } else {
        state.sortKey = nextKey;
        state.sortDirection = nextKey === "name" || nextKey === "establishment" ? "asc" : "desc";
      }
      updateView(container, state);
    });
  });

  updateView(container, state);
}

function updateView(container, state) {
  const allRows = buildSummaryRows(state.database, state.selectedSessionTypes);
  const visibleRows = allRows
    .filter((row) => state.selectedActivities.has(row.id))
    .filter((row) => state.selectedCategories.has(row.category))
    .filter((row) =>
      state.selectedEstablishments.size === state.optionCounts.establishments
      || row.establishments.some((value) => state.selectedEstablishments.has(value)),
    )
    .filter((row) => !state.query || row.searchText.includes(state.query))
    .filter((row) => rowHasSelectedWork(row, state.selectedSessionTypes))
    .sort((left, right) => compareRows(left, right, state.sortKey, state.sortDirection));

  renderMetrics(container, visibleRows);
  renderTable(container, visibleRows, allRows.length, state);
}

function buildSummaryRows(database, selectedSessionTypes) {
  const sessionsByCourse = new Map();
  const suiviMinutesByCourse = new Map();

  for (const suivi of database.suivis ?? []) {
    const courseId = suivi.course_id;
    if (!courseId) continue;
    const minutes = Number(suivi.hours || 0) * 60;
    suiviMinutesByCourse.set(courseId, (suiviMinutesByCourse.get(courseId) ?? 0) + minutes);
  }

  for (const session of database.sessions ?? []) {
    if (!sessionsByCourse.has(session.course_id)) sessionsByCourse.set(session.course_id, []);
    sessionsByCourse.get(session.course_id).push(session);
  }

  return Object.values(database.courses ?? {}).map((course) => {
    const allSessions = sessionsByCourse.get(course.id) ?? [];
    const sessions = allSessions.filter((session) =>
      selectedSessionTypes.has(normalizeSessionType(session.session_type)),
    );

    const minutesByType = Object.fromEntries(SESSION_TYPES.map((type) => [type, 0]));
    for (const session of sessions) {
      const type = normalizeSessionType(session.session_type);
      minutesByType[type] = (minutesByType[type] ?? 0) + Number(session.duration_minutes || 0);
    }

    const audiences = course.audiences ?? [];
    const audienceLabels = audiences.map(formatAudience);
    const establishments = uniqueValues(audiences.map((audience) => audience.establishment));
    const sessionMinutes = sessions.reduce((sum, session) => sum + Number(session.duration_minutes || 0), 0);
    const allSuiviMinutes = suiviMinutesByCourse.get(course.id) ?? 0;
    const suiviMinutes = selectedSessionTypes.has(PROJECT_CATEGORY) ? allSuiviMinutes : 0;
    const category = course.category === PROJECT_CATEGORY ? PROJECT_CATEGORY : "course";

    return {
      id: course.id,
      name: course.name,
      category,
      establishments,
      establishment: establishments.join(", ") || "—",
      audience: audienceLabels.join(" · ") || "—",
      searchText: [course.name, category, ...establishments, ...audienceLabels].join(" ").toLocaleLowerCase(),
      sessionCount: sessions.length,
      suiviMinutes,
      sessionMinutes,
      totalMinutes: sessionMinutes + suiviMinutes,
      ...minutesByType,
    };
  });
}

function rowHasSelectedWork(row, selectedSessionTypes) {
  if (selectedSessionTypes.size === 0) return false;
  if (selectedSessionTypes.has(PROJECT_CATEGORY) && row.suiviMinutes > 0) return true;
  return SESSION_TYPES.some((type) => selectedSessionTypes.has(type) && Number(row[type] || 0) > 0);
}

function renderMetrics(container, rows) {
  const totals = buildGlobalTotals(rows);
  container.querySelector("#service-metrics").innerHTML = `
    ${metricCard("Courses", totals.courseCount)}
    ${metricCard("Projects / suivis", totals.projectCount)}
    ${metricCard("Sessions", totals.sessionCount)}
    ${metricCard("Teaching hours", formatHours(totals.teachingMinutes))}
    ${metricCard("Project / suivi hours", formatHours(totals.suiviMinutes))}
    ${metricCard("Service (Eq. TD)", formatHours(totals.serviceEqTdMinutes))}
  `;
}

function buildGlobalTotals(rows) {
  return {
    courseCount: rows.filter((row) => row.category === "course").length,
    projectCount: rows.filter((row) => row.category === PROJECT_CATEGORY).length,
    sessionCount: sumBy(rows, "sessionCount"),
    teachingMinutes: sumBy(rows, "sessionMinutes"),
    suiviMinutes: sumBy(rows, "suiviMinutes"),
    serviceEqTdMinutes:
      sumBy(rows, "CM") * 1.5 + sumBy(rows, "TD") + sumBy(rows, "TD1")
      + sumBy(rows, "TD2") + sumBy(rows, "EXAM") * 1.5 + sumBy(rows, "suiviMinutes"),
  };
}

function renderTable(container, visibleRows, totalRowCount, state) {
  container.querySelectorAll(".sort-button").forEach((button) => {
    const isActive = button.dataset.sortKey === state.sortKey;
    button.dataset.direction = isActive ? state.sortDirection : "";
    button.closest("th")?.setAttribute("aria-sort", isActive ? state.sortDirection : "none");
  });

  const body = container.querySelector("#service-table-body");
  if (visibleRows.length === 0) {
    body.innerHTML = `<tr class="empty-row"><td colspan="11">No activities match the current filters.</td></tr>`;
  } else {
    const categoryIndexes = { course: 0, [PROJECT_CATEGORY]: 0 };
    body.innerHTML = visibleRows.map((row) => {
      const stripeIndex = categoryIndexes[row.category] ?? 0;
      categoryIndexes[row.category] = stripeIndex + 1;
      return renderRow(row, stripeIndex);
    }).join("");
  }

  renderTotals(container, visibleRows);
  const visibleCourses = visibleRows.filter((row) => row.category === "course").length;
  const visibleProjects = visibleRows.filter((row) => row.category === PROJECT_CATEGORY).length;
  const activeFilterCount = [
    Boolean(state.query),
    state.selectedActivities.size !== state.optionCounts.activities,
    state.selectedCategories.size !== state.optionCounts.categories,
    state.selectedSessionTypes.size !== state.optionCounts.sessionTypes,
    state.selectedEstablishments.size !== state.optionCounts.establishments,
  ].filter(Boolean).length;
  container.querySelector("#table-footer").textContent =
    `${visibleRows.length} of ${totalRowCount} activities shown · ${visibleCourses} courses · `
    + `${visibleProjects} projects / suivis${activeFilterCount ? ` · ${activeFilterCount} active filter${activeFilterCount > 1 ? "s" : ""}` : ""}`;
}

function compareRows(left, right, key, direction) {
  if (key === "default") {
    const categoryDifference = categoryRank(left.category) - categoryRank(right.category);
    return categoryDifference || left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
  }
  const multiplier = direction === "asc" ? 1 : -1;
  const leftValue = left[key];
  const rightValue = right[key];
  if (typeof leftValue === "string") {
    const result = leftValue.localeCompare(rightValue, undefined, { sensitivity: "base" });
    return result !== 0 ? result * multiplier : left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
  }
  const result = (leftValue - rightValue) * multiplier;
  return result !== 0 ? result : left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
}

function categoryRank(category) { return category === "course" ? 0 : 1; }

function renderRow(row, stripeIndex) {
  const isProject = row.category === PROJECT_CATEGORY;
  const stripeClass = stripeIndex % 2 === 0 ? "stripe-a" : "stripe-b";
  return `
    <tr class="${isProject ? "project-row" : "course-row"} ${stripeClass}">
      <td class="course-cell sticky-name-column">${escapeHtml(row.name)}</td>
      <td>${escapeHtml(row.establishment)}</td>
      <td class="audience-cell">${escapeHtml(row.audience)}</td>
      ${hoursCell(row.CM, !isProject)}${hoursCell(row.TD, !isProject)}
      ${hoursCell(row.TD1, !isProject)}${hoursCell(row.TD2, !isProject)}
      ${hoursCell(row.EXAM, !isProject)}${hoursCell(row.suiviMinutes, isProject)}
      <td class="number-cell">${isProject ? "—" : row.sessionCount}</td>
      <td class="number-cell total-cell">${formatHours(row.totalMinutes)}</td>
    </tr>`;
}

function renderTotals(container, rows) {
  const totals = Object.fromEntries(
    ["CM", "TD", "TD1", "TD2", "EXAM", "suiviMinutes", "sessionCount", "totalMinutes"]
      .map((key) => [key, sumBy(rows, key)]),
  );
  container.querySelector("#service-table-totals").innerHTML = `
    <tr><th class="sticky-name-column totals-label" scope="row">Total</th><td></td><td></td>
      ${totalHoursCell(totals.CM)}${totalHoursCell(totals.TD)}${totalHoursCell(totals.TD1)}
      ${totalHoursCell(totals.TD2)}${totalHoursCell(totals.EXAM)}${totalHoursCell(totals.suiviMinutes)}
      <td class="number-cell">${totals.sessionCount}</td>
      <td class="number-cell total-cell">${formatHours(totals.totalMinutes)}</td></tr>`;
}

function multiSelectFilter(id, label, options) {
  const checkboxes = options.map((option) => `
    <label class="multi-filter-option">
      <input type="checkbox" value="${escapeHtml(option.value)}" checked>
      <span>${escapeHtml(option.label)}</span>
    </label>`).join("");

  return `
    <div class="filter-field multi-filter" id="${id}">
      <span>${escapeHtml(label)}</span>
      <details class="multi-filter-menu">
        <summary class="filter-control multi-filter-summary">
          <span class="multi-filter-summary-text">All selected</span>
        </summary>
        <div class="multi-filter-popover">
          <div class="multi-filter-actions">
            <button type="button" data-action="all">Select all</button>
            <button type="button" data-action="clear">Clear</button>
            <button type="button" data-action="invert">Invert</button>
          </div>
          <div class="multi-filter-options">${checkboxes}</div>
        </div>
      </details>
    </div>`;
}

function bindMultiSelect(container, id, selectedValues, onChange) {
  const root = container.querySelector(`#${id}`);
  const inputs = [...root.querySelectorAll('input[type="checkbox"]')];

  const apply = () => {
    selectedValues.clear();
    inputs.filter((input) => input.checked).forEach((input) => selectedValues.add(input.value));
    updateMultiSelectSummary(root, inputs);
    onChange();
  };

  inputs.forEach((input) => input.addEventListener("change", apply));
  root.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      inputs.forEach((input) => {
        if (action === "all") input.checked = true;
        if (action === "clear") input.checked = false;
        if (action === "invert") input.checked = !input.checked;
      });
      apply();
    });
  });
  updateMultiSelectSummary(root, inputs);
}

function resetMultiSelect(container, id, selectedValues) {
  const root = container.querySelector(`#${id}`);
  const inputs = [...root.querySelectorAll('input[type="checkbox"]')];
  inputs.forEach((input) => { input.checked = true; });
  selectedValues.clear();
  inputs.forEach((input) => selectedValues.add(input.value));
  updateMultiSelectSummary(root, inputs);
}

function updateMultiSelectSummary(root, inputs) {
  const selected = inputs.filter((input) => input.checked);
  const text = selected.length === inputs.length
    ? "All selected"
    : selected.length === 0
      ? "None selected"
      : selected.length === 1
        ? selected[0].nextElementSibling.textContent
        : `${selected.length} of ${inputs.length} selected`;
  root.querySelector(".multi-filter-summary-text").textContent = text;
}

function bindFilter(container, selector, eventName, handler) {
  container.querySelector(selector).addEventListener(eventName, (event) => handler(event.target.value));
}

function hoursCell(minutes, applicable = true) {
  return applicable ? `<td class="number-cell">${minutes ? formatHours(minutes) : "—"}</td>` : '<td class="number-cell not-applicable">—</td>';
}
function totalHoursCell(minutes) { return `<td class="number-cell">${minutes ? formatHours(minutes) : "—"}</td>`; }
function sumBy(rows, key) { return rows.reduce((sum, row) => sum + Number(row[key] || 0), 0); }
function formatHours(minutes) { const hours = minutes / 60; return Number.isInteger(hours) ? `${hours} h` : `${hours.toFixed(1)} h`; }
function formatAudience(audience) {
  const main = [audience.year, audience.diploma].filter(Boolean).join(" ");
  const details = [audience.track, audience.study_mode].filter(Boolean).join(", ");
  return details ? `${main} (${details})` : main || audience.source_label || "Unknown audience";
}
function uniqueValues(values) { return [...new Set(values.filter(Boolean))]; }
function normalizeSessionType(type) { return String(type || "").toUpperCase(); }
function metricCard(label, value) { return `<article class="metric-card"><span class="metric-label">${escapeHtml(label)}</span><strong class="metric-value">${escapeHtml(String(value))}</strong></article>`; }
function sortableHeader(label, key, className = "") { return `<th scope="col" class="${className}" aria-sort="none"><button class="sort-button" type="button" data-sort-key="${key}" data-direction="">${label}</button></th>`; }
function escapeHtml(value) { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function addVisuallyHiddenUtility() {
  if (document.getElementById("visually-hidden-style")) return;
  const style = document.createElement("style");
  style.id = "visually-hidden-style";
  style.textContent = `.visually-hidden{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}`;
  document.head.append(style);
}
