const SESSION_TYPES = ["CM", "TD", "TD1", "TD2", "EXAM"];

export function renderTimelineView(container, database) {
  const courses = Object.values(database.courses ?? {})
    .map((course) => ({ id: String(course.id), name: course.name ?? String(course.id) }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  const establishments = uniqueValues(
    Object.values(database.courses ?? {}).flatMap((course) =>
      (course.audiences ?? []).map((audience) => audience.establishment),
    ),
  ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  container.innerHTML = `

  <section class="timeline-note" role="note">
      Projects and suivis are not shown here because their manually entered hours have no scheduled dates.
    </section>

    <section class="timeline-metrics" aria-label="Filtered timeline totals">
      <article><span>Scheduled hours</span><strong id="timeline-total-hours">0 h</strong></article>
      <article><span>Service Eq. TD</span><strong id="timeline-total-eqtd">0 h</strong></article>
      <article><span>Sessions</span><strong id="timeline-total-sessions">0</strong></article>
      <article><span>Active weeks</span><strong id="timeline-active-weeks">0</strong></article>
    </section>

    <section class="filter-card" aria-label="Timeline filters">
      <div class="filter-heading">
        <div>
          <h3>Filters</h3>
          <p>These filters are independent from Service Summary.</p>
        </div>
        <button id="timeline-reset-filters" class="secondary-button" type="button">Reset filters</button>
      </div>

      <div class="filter-grid">
        ${multiSelectFilter("timeline-activity-filter", "Activity", courses.map((course) => ({ value: course.id, label: course.name })))}
        ${multiSelectFilter("timeline-session-type-filter", "Session type", SESSION_TYPES.map((type) => ({ value: type, label: type === "EXAM" ? "Exam" : type })))}
        ${multiSelectFilter("timeline-establishment-filter", "Establishment", establishments.map((value) => ({ value, label: value })))}
        <label class="filter-field filter-field-search">
          <span>Search</span>
          <input id="timeline-search-filter" class="filter-control search-input" type="search" placeholder="Name, diploma, year…" autocomplete="off">
        </label>
      </div>
    </section>

    <section class="timeline-chart-grid">
      ${chartCard("timeline-heatmap-chart", "Calendar heatmap", "Click any day to inspect its scheduled sessions.", "timeline-chart-card-wide timeline-calendar-card")}
      ${chartCard("timeline-monthly-chart", "Monthly workload", "Scheduled teaching hours grouped by month.")}
      ${chartCard("timeline-weekly-chart", "Weekly workload", "Scheduled teaching hours grouped by ISO week.")}
      ${chartCard("timeline-cumulative-chart", "Cumulative service", "Running totals of real hours and equivalent TD hours.", "timeline-chart-card-wide")}
    </section>

    <div id="timeline-empty-state" class="timeline-empty-state" hidden>
      No dated sessions match the selected filters.
    </div>

    <div id="timeline-day-modal" class="timeline-modal" hidden>
      <div class="timeline-modal-backdrop" data-close-modal></div>
      <section class="timeline-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="timeline-modal-title">
        <button class="timeline-modal-close" type="button" aria-label="Close day details" data-close-modal>&times;</button>
        <div id="timeline-modal-content"></div>
      </section>
    </div>
  `;

  const state = {
    database,
    selectedActivities: new Set(courses.map((course) => course.id)),
    selectedSessionTypes: new Set(SESSION_TYPES),
    selectedEstablishments: new Set(establishments),
    establishmentCount: establishments.length,
    query: "",
  };

  bindMultiSelect(container, "timeline-activity-filter", state.selectedActivities, () => updateTimeline(container, state));
  bindMultiSelect(container, "timeline-session-type-filter", state.selectedSessionTypes, () => updateTimeline(container, state));
  bindMultiSelect(container, "timeline-establishment-filter", state.selectedEstablishments, () => updateTimeline(container, state));

  container.querySelector("#timeline-search-filter").addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLocaleLowerCase();
    updateTimeline(container, state);
  });

  container.querySelector("#timeline-reset-filters").addEventListener("click", () => {
    state.query = "";
    container.querySelector("#timeline-search-filter").value = "";
    resetMultiSelect(container, "timeline-activity-filter", state.selectedActivities);
    resetMultiSelect(container, "timeline-session-type-filter", state.selectedSessionTypes);
    resetMultiSelect(container, "timeline-establishment-filter", state.selectedEstablishments);
    updateTimeline(container, state);
  });

  container.refreshTimelineCharts = () => updateTimeline(container, state);
  updateTimeline(container, state);
}

function updateTimeline(container, state) {
  if (typeof Plotly === "undefined") {
    container.querySelector("#timeline-empty-state").hidden = false;
    container.querySelector("#timeline-empty-state").textContent = "Plotly is not loaded. Include plotly.min.js before your main module.";
    return;
  }

  const rows = buildTimelineRows(state.database).filter((row) =>
    state.selectedActivities.has(row.courseId)
    && state.selectedSessionTypes.has(row.sessionType)
    && (state.selectedEstablishments.size === state.establishmentCount
      || row.establishments.some((value) => state.selectedEstablishments.has(value)))
    && (!state.query || row.searchText.includes(state.query)),
  );

  const empty = rows.length === 0;
  container.querySelector("#timeline-empty-state").hidden = !empty;
  container.querySelector(".timeline-chart-grid").hidden = empty;
  renderMetrics(container, rows);
  if (empty) return;

  const theme = chartTheme();
  renderMonthlyChart(container, rows, theme);
  renderWeeklyChart(container, rows, theme);
  renderCumulativeChart(container, rows, theme);
  renderHeatmap(container, rows, theme);
}

function buildTimelineRows(database) {
  const courses = database.courses ?? {};
  return (database.sessions ?? []).flatMap((session) => {
    const date = readSessionStart(session);
    if (!date) return [];
    const course = courses[session.course_id] ?? Object.values(courses).find((candidate) => String(candidate.id) === String(session.course_id));
    if (!course) return [];
    const sessionType = normalizeSessionType(session.session_type);
    if (!SESSION_TYPES.includes(sessionType)) return [];
    const audiences = course.audiences ?? [];
    const establishments = uniqueValues(audiences.map((audience) => audience.establishment));
    const minutes = Number(session.duration_minutes || durationFromDates(session) || 0);
    const searchText = [
      course.name,
      sessionType,
      ...establishments,
      ...audiences.flatMap((audience) => [audience.year, audience.diploma, audience.track, audience.study_mode]),
    ].filter(Boolean).join(" ").toLocaleLowerCase();
    return [{
      courseId: String(course.id),
      courseName: course.name,
      sessionType,
      date,
      endDate: readSessionEnd(session),
      minutes,
      eqTdMinutes: minutes * eqTdMultiplier(sessionType),
      location: session.location ?? session.room ?? session.location_name ?? "",
      establishments,
      searchText,
    }];
  }).sort((a, b) => a.date - b.date);
}

function renderMetrics(container, rows) {
  const totalMinutes = sum(rows, (row) => row.minutes);
  const eqTdMinutes = sum(rows, (row) => row.eqTdMinutes);
  const weeks = new Set(rows.map((row) => isoWeekKey(row.date)));
  container.querySelector("#timeline-total-hours").textContent = formatHours(totalMinutes);
  container.querySelector("#timeline-total-eqtd").textContent = formatHours(eqTdMinutes);
  container.querySelector("#timeline-total-sessions").textContent = String(rows.length);
  container.querySelector("#timeline-active-weeks").textContent = String(weeks.size);
}

function renderMonthlyChart(container, rows, theme) {
  const grouped = groupRows(rows, (row) => monthKey(row.date));
  const entries = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
  const labels = entries.map(([key]) => formatMonthKey(key));
  const values = entries.map(([, items]) => sum(items, (item) => item.minutes) / 60);
  draw(container, "timeline-monthly-chart", [{ type: "bar", x: labels, y: values, hovertemplate: "%{x}<br>%{y:.1f} h<extra></extra>" }], {
    ...baseLayout(theme),
    margin: { l: 52, r: 20, t: 12, b: 64 },
    xaxis: { color: theme.text, tickangle: -30, automargin: true },
    yaxis: { title: "Hours", color: theme.text, gridcolor: theme.grid, rangemode: "tozero" },
    showlegend: false,
  });
}

function renderWeeklyChart(container, rows, theme) {
  const grouped = groupRows(rows, (row) => isoWeekKey(row.date));
  const entries = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
  const labels = entries.map(([key]) => formatIsoWeek(key));
  const values = entries.map(([, items]) => sum(items, (item) => item.minutes) / 60);
  draw(container, "timeline-weekly-chart", [{ type: "bar", x: labels, y: values, hovertemplate: "%{x}<br>%{y:.1f} h<extra></extra>" }], {
    ...baseLayout(theme),
    margin: { l: 52, r: 20, t: 12, b: 70 },
    xaxis: { color: theme.text, tickangle: -45, automargin: true },
    yaxis: { title: "Hours", color: theme.text, gridcolor: theme.grid, rangemode: "tozero" },
    showlegend: false,
  });
}

function renderCumulativeChart(container, rows, theme) {
  let real = 0;
  let eqtd = 0;
  const daily = groupRows(rows, (row) => dayKey(row.date));
  const entries = [...daily.entries()].sort(([a], [b]) => a.localeCompare(b));
  const x = [];
  const realValues = [];
  const eqtdValues = [];
  for (const [key, items] of entries) {
    real += sum(items, (item) => item.minutes) / 60;
    eqtd += sum(items, (item) => item.eqTdMinutes) / 60;
    x.push(formatDayKey(key));
    realValues.push(real);
    eqtdValues.push(eqtd);
  }
  draw(container, "timeline-cumulative-chart", [
    { type: "scatter", mode: "lines+markers", name: "Real hours", x, y: realValues, hovertemplate: "%{x}<br>%{y:.1f} h<extra>Real hours</extra>" },
    { type: "scatter", mode: "lines+markers", name: "Eq. TD", x, y: eqtdValues, hovertemplate: "%{x}<br>%{y:.1f} h<extra>Eq. TD</extra>" },
  ], {
    ...baseLayout(theme),
    margin: { l: 56, r: 24, t: 12, b: 65 },
    xaxis: { color: theme.text, automargin: true },
    yaxis: { title: "Cumulative hours", color: theme.text, gridcolor: theme.grid, rangemode: "tozero" },
    legend: { orientation: "h", y: -0.22, x: 0.5, xanchor: "center", font: { color: theme.text } },
  });
}

function renderHeatmap(container, rows, theme) {
  const daily = groupRows(rows, (row) => dayKey(row.date));
  const dayEntries = [...daily.entries()].sort(([a], [b]) => a.localeCompare(b));
  const first = startOfWeek(new Date(`${dayEntries[0][0]}T12:00:00`));
  const last = new Date(`${dayEntries.at(-1)[0]}T12:00:00`);
  const weeks = Math.floor((startOfWeek(last) - first) / 604800000) + 1;
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const categories = [
    { key: "zero", label: "0 h", color: "#aeb4bd", min: 0, max: 0 },
    { key: "light", label: "Up to 2 h", color: "#79d99b", min: 0, max: 2 },
    { key: "medium", label: "2–4 h", color: "#73bdf2", min: 2, max: 4 },
    { key: "busy", label: "4–6 h", color: "#f59a9a", min: 4, max: 6 },
    { key: "heavy", label: "6–8 h", color: "#ef6767", min: 6, max: Infinity },
  ];

  const cells = [];
  for (let week = 0; week < weeks; week += 1) {
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const date = new Date(first);
      date.setDate(date.getDate() + week * 7 + weekday);
      const key = dayKey(date);
      const items = daily.get(key) ?? [];
      const hours = sum(items, (item) => item.minutes) / 60;
      const category = categories.find((entry) => (
        entry.key === "zero"
          ? hours === 0
          : hours > entry.min && hours <= entry.max
      )) ?? categories.at(-1);

      cells.push({
        week,
        weekday,
        dateKey: key,
        hours,
        category: category.key,
        hover: `${date.toLocaleDateString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "short",
          day: "numeric",
        })}<br><b>${hours.toFixed(1)} h</b>`,
      });
    }
  }

  const target = container.querySelector("#timeline-heatmap-chart");
  const availableWidth = Math.max(320, target?.clientWidth || 900);
  const availableHeight = Math.max(260, target?.clientHeight || 420);
  const horizontalStep = Math.max(9, (availableWidth - 130) / Math.max(weeks, 1));
  const verticalStep = Math.max(24, (availableHeight - 120) / 7);
  const gridSize = Math.max(10, Math.min(30, horizontalStep * 0.82, verticalStep * 0.82));
  const tileSize = Math.max(8, gridSize * 0.86);

  const traces = [
    {
      type: "scatter",
      mode: "markers",
      x: cells.map((cell) => cell.week),
      y: cells.map((cell) => cell.weekday),
      hoverinfo: "skip",
      showlegend: false,
      marker: {
        symbol: "square",
        size: gridSize,
        color: theme.heatmapCell,
        line: { color: theme.heatmapGrid, width: 1 },
      },
    },
  ];

  for (const category of categories) {
    const categoryCells = cells.filter((cell) => cell.category === category.key);
    traces.push({
      type: "scatter",
      mode: "markers",
      name: category.label,
      x: categoryCells.map((cell) => cell.week),
      y: categoryCells.map((cell) => cell.weekday),
      text: categoryCells.map((cell) => cell.hover),
      customdata: categoryCells.map((cell) => cell.dateKey),
      hovertemplate: "%{text}<extra></extra>",
      marker: {
        symbol: "square",
        size: tileSize,
        color: category.color,
        line: { color: "rgba(15,23,42,0.24)", width: 1.4 },
      },
    });
  }

  const weekTickValues = [];
  const weekTickText = [];
  for (let week = 0; week < weeks; week += 1) {
    const date = new Date(first);
    date.setDate(date.getDate() + week * 7);
    weekTickValues.push(week);
    weekTickText.push(date.toLocaleDateString(undefined, { month: "short", day: "numeric" }));
  }

  draw(container, "timeline-heatmap-chart", traces, {
    ...baseLayout(theme),
    margin: { l: 62, r: 24, t: 18, b: 118 },
    plot_bgcolor: theme.heatmapBackground,
    hovermode: "closest",
    xaxis: {
      color: theme.text,
      range: [-0.65, weeks - 0.35],
      tickmode: "array",
      tickvals: weekTickValues,
      ticktext: weekTickText,
      tickangle: -55,
      automargin: true,
      showgrid: false,
      zeroline: false,
      fixedrange: true,
      constrain: "domain",
    },
    yaxis: {
      color: theme.text,
      range: [6.65, -0.65],
      tickmode: "array",
      tickvals: [0, 1, 2, 3, 4, 5, 6],
      ticktext: weekdays,
      showgrid: false,
      zeroline: false,
      fixedrange: true,
      scaleanchor: "x",
      scaleratio: 1,
      constrain: "domain",
    },
    legend: {
      orientation: "h",
      x: 0.5,
      xanchor: "center",
      y: -0.23,
      yanchor: "top",
      font: { color: theme.text },
      bgcolor: "rgba(0,0,0,0)",
      traceorder: "normal",
      itemsizing: "constant",
    },
  });

  bindHeatmapClicks(container, rows);
}

function bindHeatmapClicks(container, rows) {
  const chart = container.querySelector("#timeline-heatmap-chart");
  if (!chart || typeof chart.on !== "function") return;

  if (typeof chart.removeAllListeners === "function") {
    chart.removeAllListeners("plotly_click");
  }

  chart.on("plotly_click", (event) => {
    const dateKey = event?.points?.[0]?.customdata;
    if (!dateKey) return;
    const dayRows = rows.filter((row) => dayKey(row.date) === dateKey);
    openDayModal(container, dateKey, dayRows);
  });
}

function openDayModal(container, dateKeyValue, rows) {
  const modal = container.querySelector("#timeline-day-modal");
  const content = container.querySelector("#timeline-modal-content");
  if (!modal || !content) return;

  const date = new Date(`${dateKeyValue}T12:00:00`);
  const totalMinutes = sum(rows, (row) => row.minutes);
  const totalEqTd = sum(rows, (row) => row.eqTdMinutes);
  const sortedRows = [...rows].sort((a, b) => a.date - b.date);

  content.innerHTML = `
    <header class="timeline-modal-header">
      <p class="timeline-modal-eyebrow">Day details</p>
      <h2 id="timeline-modal-title">${escapeHtml(date.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" }))}</h2>
      <p>${rows.length ? `${rows.length} scheduled session${rows.length === 1 ? "" : "s"}` : "No scheduled teaching"}</p>
    </header>

    <div class="timeline-modal-stats">
      <article><span>Teaching</span><strong>${formatHours(totalMinutes)}</strong></article>
      <article><span>Eq. TD</span><strong>${formatHours(totalEqTd)}</strong></article>
      <article><span>Sessions</span><strong>${rows.length}</strong></article>
    </div>

    <div class="timeline-modal-session-list">
      ${sortedRows.length ? sortedRows.map((row) => `
        <article class="timeline-session-card">
          <div class="timeline-session-time">
            <strong>${formatTime(row.date)}</strong>
            <span>${row.endDate ? formatTime(row.endDate) : formatHours(row.minutes)}</span>
          </div>
          <div class="timeline-session-main">
            <div class="timeline-session-title-row">
              <h3>${escapeHtml(row.courseName)}</h3>
              <span class="timeline-session-badge">${escapeHtml(row.sessionType === "EXAM" ? "Exam" : row.sessionType)}</span>
            </div>
            <p>${formatHours(row.minutes)} · ${formatHours(row.eqTdMinutes)} Eq. TD</p>
            ${row.location ? `<p class="timeline-session-location">${escapeHtml(row.location)}</p>` : ""}
          </div>
        </article>
      `).join("") : `<div class="timeline-modal-no-sessions">No teaching sessions are scheduled for this day.</div>`}
    </div>
  `;

  modal.hidden = false;
  document.body.classList.add("timeline-modal-open");

  const close = () => closeDayModal(container);
  modal.querySelectorAll("[data-close-modal]").forEach((element) => {
    element.onclick = close;
  });

  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      close();
      document.removeEventListener("keydown", onKeyDown);
    }
  };
  document.addEventListener("keydown", onKeyDown);
  modal.querySelector(".timeline-modal-close")?.focus();
}

function closeDayModal(container) {
  const modal = container.querySelector("#timeline-day-modal");
  if (!modal) return;
  modal.hidden = true;
  document.body.classList.remove("timeline-modal-open");
}

function formatTime(date) {
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function readSessionEnd(session) {
  const value = session.end_time ?? session.end_datetime ?? session.ends_at ?? session.end ?? session.dtend;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function readSessionStart(session) {
  const value = session.start_time ?? session.start_datetime ?? session.starts_at ?? session.start ?? session.dtstart ?? session.date;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function durationFromDates(session) {
  const start = readSessionStart(session);
  const value = session.end_time ?? session.end_datetime ?? session.ends_at ?? session.end ?? session.dtend;
  if (!start || !value) return 0;
  const end = new Date(value);
  return Number.isNaN(end.getTime()) ? 0 : Math.max(0, Math.round((end - start) / 60000));
}

function eqTdMultiplier(type) { return type === "CM" || type === "EXAM" ? 1.5 : 1; }
function normalizeSessionType(value) { return String(value || "").toUpperCase(); }
function groupRows(rows, keySelector) { const map = new Map(); for (const row of rows) { const key = keySelector(row); if (!map.has(key)) map.set(key, []); map.get(key).push(row); } return map; }
function sum(rows, selector) { return rows.reduce((total, row) => total + Number(selector(row) || 0), 0); }
function dayKey(date) { return localDateParts(date).join("-"); }
function monthKey(date) { const [year, month] = localDateParts(date); return `${year}-${month}`; }
function localDateParts(date) { return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")]; }
function formatMonthKey(key) { const [year, month] = key.split("-").map(Number); return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: "short", year: "numeric" }); }
function formatDayKey(key) { return new Date(`${key}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
function isoWeekKey(date) { const local = new Date(date.getFullYear(), date.getMonth(), date.getDate()); const day = local.getDay() || 7; local.setDate(local.getDate() + 4 - day); const yearStart = new Date(local.getFullYear(), 0, 1); const week = Math.ceil((((local - yearStart) / 86400000) + 1) / 7); return `${local.getFullYear()}-${String(week).padStart(2, "0")}`; }
function formatIsoWeek(key) { const [year, week] = key.split("-"); return `W${week} ${year}`; }
function startOfWeek(date) { const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate()); copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7)); copy.setHours(0, 0, 0, 0); return copy; }
function formatHours(minutes) { const hours = minutes / 60; return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} h`; }
function uniqueValues(values) { return [...new Set(values.filter(Boolean).map(String))]; }

function draw(container, id, traces, layout) {
  const target = container.querySelector(`#${id}`);
  Plotly.react(target, traces, layout, { responsive: true, displaylogo: false, modeBarButtonsToRemove: ["lasso2d", "select2d"] });
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
    heatmapBackground: styles.getPropertyValue("--background").trim() || styles.getPropertyValue("--bg").trim() || "#0f172a",
    heatmapCell: styles.getPropertyValue("--surface-muted").trim() || "rgba(148, 163, 184, 0.14)",
    heatmapGrid: styles.getPropertyValue("--border").trim() || "rgba(148, 163, 184, 0.32)",
  };
}

function chartCard(id, title, description, extraClass = "") {
  return `<article class="timeline-chart-card ${extraClass}"><header><h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p></header><div id="${id}" class="timeline-chart"></div></article>`;
}

function multiSelectFilter(id, label, options) {
  return `<div class="filter-field multi-filter" id="${id}"><span>${escapeHtml(label)}</span><details class="multi-filter-menu"><summary class="filter-control multi-filter-summary"><span class="multi-filter-summary-text">All selected</span></summary><div class="multi-filter-popover"><div class="multi-filter-actions"><button type="button" data-action="all">Select all</button><button type="button" data-action="clear">Clear</button><button type="button" data-action="invert">Invert</button></div><div class="multi-filter-options">${options.map((option) => `<label class="multi-filter-option"><input type="checkbox" value="${escapeHtml(option.value)}" checked><span>${escapeHtml(option.label)}</span></label>`).join("")}</div></div></details></div>`;
}

function bindMultiSelect(container, id, selectedValues, onChange) {
  const root = container.querySelector(`#${id}`);
  const inputs = [...root.querySelectorAll('input[type="checkbox"]')];
  const apply = () => {
    selectedValues.clear();
    inputs.filter((input) => input.checked).forEach((input) => selectedValues.add(input.value));
    updateSummary(root, inputs);
    onChange();
  };
  inputs.forEach((input) => input.addEventListener("change", apply));
  root.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", () => {
    inputs.forEach((input) => {
      if (button.dataset.action === "all") input.checked = true;
      if (button.dataset.action === "clear") input.checked = false;
      if (button.dataset.action === "invert") input.checked = !input.checked;
    });
    apply();
  }));
  updateSummary(root, inputs);
}

function resetMultiSelect(container, id, selectedValues) {
  const root = container.querySelector(`#${id}`);
  const inputs = [...root.querySelectorAll('input[type="checkbox"]')];
  inputs.forEach((input) => { input.checked = true; });
  selectedValues.clear();
  inputs.forEach((input) => selectedValues.add(input.value));
  updateSummary(root, inputs);
}

function updateSummary(root, inputs) {
  const selected = inputs.filter((input) => input.checked);
  root.querySelector(".multi-filter-summary-text").textContent = selected.length === inputs.length
    ? "All selected"
    : selected.length === 0
      ? "None selected"
      : selected.length === 1
        ? selected[0].nextElementSibling.textContent
        : `${selected.length} of ${inputs.length} selected`;
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
