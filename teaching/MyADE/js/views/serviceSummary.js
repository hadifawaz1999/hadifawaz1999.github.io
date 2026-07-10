const SESSION_TYPES = ["CM", "TD", "TD1", "TD2", "EXAM"];
const PROJECT_CATEGORY = "project/suivi";

export function renderServiceSummary(container, database) {
  const rows = buildSummaryRows(database);
  const totals = buildGlobalTotals(rows);

  container.innerHTML = `
    <section class="summary-grid summary-grid-six" aria-label="Service totals">
      ${metricCard("Courses", totals.courseCount)}
      ${metricCard("Projects / suivis", totals.projectCount)}
      ${metricCard("Sessions", totals.sessionCount)}
      ${metricCard("Teaching hours", formatHours(totals.teachingMinutes))}
      ${metricCard("Project / suivi hours", formatHours(totals.suiviMinutes))}
      ${metricCard("Service (Eq. TD)", formatHours(totals.serviceEqTdMinutes))}
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

        <label>
          <span class="visually-hidden">Filter activities</span>
          <input
            id="course-filter"
            class="search-input"
            type="search"
            placeholder="Filter by name, establishment, diploma, year…"
            autocomplete="off"
          >
        </label>
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
    rows,
    query: "",
    sortKey: "default",
    sortDirection: "asc",
  };

  const filterInput = container.querySelector("#course-filter");
  filterInput.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLocaleLowerCase();
    updateTable(container, state);
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

      updateTable(container, state);
    });
  });

  updateTable(container, state);
}

function buildSummaryRows(database) {
  const sessionsByCourse = new Map();
  const suiviMinutesByCourse = new Map();

  for (const suivi of database.suivis ?? []) {
    const courseId = suivi.course_id;
    if (!courseId) continue;

    const minutes = Number(suivi.hours || 0) * 60;
    suiviMinutesByCourse.set(
      courseId,
      (suiviMinutesByCourse.get(courseId) ?? 0) + minutes,
    );
  }

  for (const session of database.sessions ?? []) {
    if (!sessionsByCourse.has(session.course_id)) {
      sessionsByCourse.set(session.course_id, []);
    }
    sessionsByCourse.get(session.course_id).push(session);
  }

  return Object.values(database.courses ?? {}).map((course) => {
    const sessions = sessionsByCourse.get(course.id) ?? [];
    const minutesByType = Object.fromEntries(SESSION_TYPES.map((type) => [type, 0]));

    for (const session of sessions) {
      const type = normalizeSessionType(session.session_type);
      minutesByType[type] = (minutesByType[type] ?? 0) + Number(session.duration_minutes || 0);
    }

    const audiences = course.audiences ?? [];
    const audienceLabels = audiences.map(formatAudience);
    const establishments = uniqueValues(audiences.map((audience) => audience.establishment));
    const sessionMinutes = sessions.reduce(
      (sum, session) => sum + Number(session.duration_minutes || 0),
      0,
    );
    const suiviMinutes = suiviMinutesByCourse.get(course.id) ?? 0;
    const category = course.category === PROJECT_CATEGORY ? PROJECT_CATEGORY : "course";

    return {
      id: course.id,
      name: course.name,
      category,
      establishment: establishments.join(", ") || "—",
      audience: audienceLabels.join(" · ") || "—",
      searchText: [course.name, category, ...establishments, ...audienceLabels]
        .join(" ")
        .toLocaleLowerCase(),
      sessionCount: sessions.length,
      suiviMinutes,
      sessionMinutes,
      totalMinutes: sessionMinutes + suiviMinutes,
      ...minutesByType,
    };
  });
}

function buildGlobalTotals(rows) {
  return {
    courseCount: rows.filter((row) => row.category === "course").length,
    projectCount: rows.filter((row) => row.category === PROJECT_CATEGORY).length,
    sessionCount: sumBy(rows, "sessionCount"),
    teachingMinutes: sumBy(rows, "sessionMinutes"),
    suiviMinutes: sumBy(rows, "suiviMinutes"),
    serviceEqTdMinutes:
      sumBy(rows, "CM") * 1.5
      + sumBy(rows, "TD")
      + sumBy(rows, "TD1")
      + sumBy(rows, "TD2")
      + sumBy(rows, "EXAM") * 1.5
      + sumBy(rows, "suiviMinutes"),
  };
}

function updateTable(container, state) {
  const visibleRows = state.rows
    .filter((row) => !state.query || row.searchText.includes(state.query))
    .sort((left, right) => compareRows(left, right, state.sortKey, state.sortDirection));

  container.querySelectorAll(".sort-button").forEach((button) => {
    const isActive = button.dataset.sortKey === state.sortKey;
    button.dataset.direction = isActive ? state.sortDirection : "";
    button.closest("th")?.setAttribute("aria-sort", isActive ? state.sortDirection : "none");
  });

  const body = container.querySelector("#service-table-body");

  if (visibleRows.length === 0) {
    body.innerHTML = `
      <tr class="empty-row">
        <td colspan="11">No activities match the current filter.</td>
      </tr>
    `;
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
  container.querySelector("#table-footer").textContent =
    `${visibleRows.length} of ${state.rows.length} activities shown · ` +
    `${visibleCourses} courses · ${visibleProjects} projects / suivis`;
}

function compareRows(left, right, key, direction) {
  if (key === "default") {
    const categoryDifference = categoryRank(left.category) - categoryRank(right.category);
    if (categoryDifference !== 0) return categoryDifference;
    return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
  }

  const multiplier = direction === "asc" ? 1 : -1;
  const leftValue = left[key];
  const rightValue = right[key];

  if (typeof leftValue === "string") {
    const result = leftValue.localeCompare(rightValue, undefined, { sensitivity: "base" });
    return result !== 0
      ? result * multiplier
      : left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
  }

  const result = (leftValue - rightValue) * multiplier;
  return result !== 0
    ? result
    : left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
}

function categoryRank(category) {
  return category === "course" ? 0 : 1;
}

function renderRow(row, stripeIndex) {
  const isProject = row.category === PROJECT_CATEGORY;
  const stripeClass = stripeIndex % 2 === 0 ? "stripe-a" : "stripe-b";
  const rowClass = isProject ? "project-row" : "course-row";

  return `
    <tr class="${rowClass} ${stripeClass}">
      <td class="course-cell sticky-name-column">${escapeHtml(row.name)}</td>
      <td>${escapeHtml(row.establishment)}</td>
      <td class="audience-cell">${escapeHtml(row.audience)}</td>
      ${hoursCell(row.CM, !isProject)}
      ${hoursCell(row.TD, !isProject)}
      ${hoursCell(row.TD1, !isProject)}
      ${hoursCell(row.TD2, !isProject)}
      ${hoursCell(row.EXAM, !isProject)}
      ${hoursCell(row.suiviMinutes, isProject)}
      <td class="number-cell">${isProject ? "—" : row.sessionCount}</td>
      <td class="number-cell total-cell">${formatHours(row.totalMinutes)}</td>
    </tr>
  `;
}

function renderTotals(container, rows) {
  const totals = {
    CM: sumBy(rows, "CM"),
    TD: sumBy(rows, "TD"),
    TD1: sumBy(rows, "TD1"),
    TD2: sumBy(rows, "TD2"),
    EXAM: sumBy(rows, "EXAM"),
    suiviMinutes: sumBy(rows, "suiviMinutes"),
    sessionCount: sumBy(rows, "sessionCount"),
    totalMinutes: sumBy(rows, "totalMinutes"),
  };

  container.querySelector("#service-table-totals").innerHTML = `
    <tr>
      <th class="sticky-name-column totals-label" scope="row">Total</th>
      <td></td>
      <td></td>
      ${totalHoursCell(totals.CM)}
      ${totalHoursCell(totals.TD)}
      ${totalHoursCell(totals.TD1)}
      ${totalHoursCell(totals.TD2)}
      ${totalHoursCell(totals.EXAM)}
      ${totalHoursCell(totals.suiviMinutes)}
      <td class="number-cell">${totals.sessionCount}</td>
      <td class="number-cell total-cell">${formatHours(totals.totalMinutes)}</td>
    </tr>
  `;
}

function hoursCell(minutes, applicable = true) {
  if (!applicable) {
    return '<td class="number-cell not-applicable">—</td>';
  }
  return `<td class="number-cell">${minutes ? formatHours(minutes) : "—"}</td>`;
}

function totalHoursCell(minutes) {
  return `<td class="number-cell">${minutes ? formatHours(minutes) : "—"}</td>`;
}

function sumBy(rows, key) {
  return rows.reduce((sum, row) => sum + Number(row[key] || 0), 0);
}

function formatHours(minutes) {
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours} h` : `${hours.toFixed(1)} h`;
}

function formatAudience(audience) {
  const main = [audience.year, audience.diploma].filter(Boolean).join(" ");
  const details = [audience.track, audience.study_mode].filter(Boolean).join(", ");
  return details ? `${main} (${details})` : main || audience.source_label || "Unknown audience";
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeSessionType(type) {
  return String(type || "").toUpperCase();
}

function metricCard(label, value) {
  return `
    <article class="metric-card">
      <span class="metric-label">${escapeHtml(label)}</span>
      <strong class="metric-value">${escapeHtml(String(value))}</strong>
    </article>
  `;
}

function sortableHeader(label, key, className = "") {
  return `
    <th scope="col" class="${className}" aria-sort="none">
      <button class="sort-button" type="button" data-sort-key="${key}" data-direction="">
        ${label}
      </button>
    </th>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function addVisuallyHiddenUtility() {
  if (document.getElementById("visually-hidden-style")) return;

  const style = document.createElement("style");
  style.id = "visually-hidden-style";
  style.textContent = `
    .visually-hidden {
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    }
  `;
  document.head.append(style);
}
