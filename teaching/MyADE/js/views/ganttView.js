const SESSION_TYPES = ["CM", "TD", "TD1", "TD2", "EXAM"];

export function renderGanttView(container, database) {
  const model = buildModel(database);

  container.innerHTML = `
    <header class="view-header gantt-view-header">
      <div>
        <p class="view-eyebrow">Academic-year planning</p>
        <h2>Gantt diagram</h2>
        <p>See course activity periods and every scheduled session on one shared timeline.</p>
      </div>
      <div class="gantt-header-actions" aria-label="Gantt display controls">
        <div class="gantt-segmented" role="group" aria-label="Display mode">
          <button class="is-active" type="button" data-gantt-mode="sessions">Sessions</button>
          <button type="button" data-gantt-mode="periods">Activity periods</button>
        </div>
      </div>
    </header>

    <section class="gantt-range-card" aria-label="Gantt date range">
      <div class="gantt-range-heading">
        <div>
          <h3>Date range</h3>
          <p>Show the complete academic year, one semester, or a custom period.</p>
        </div>
        <button id="gantt-reset-range" class="secondary-button" type="button">Reset range</button>
      </div>
      <div class="gantt-range-grid">
        <label class="filter-field">
          <span>Semester</span>
          <select id="gantt-semester" class="filter-control">
            <option value="all">All</option>
            <option value="s1">Semester 1</option>
            <option value="s2">Semester 2</option>
          </select>
        </label>
        <label class="filter-field">
          <span>From</span>
          <input id="gantt-date-from" class="filter-control" type="date">
        </label>
        <label class="filter-field">
          <span>To</span>
          <input id="gantt-date-to" class="filter-control" type="date">
        </label>

      </div>
    </section>

    <section class="filter-card" aria-label="Gantt filters">
      <div class="filter-heading">
        <div>
          <h3>Filters</h3>
          <p>These selections are independent from the other dashboard views.</p>
        </div>
        <button id="gantt-reset-filters" class="secondary-button" type="button">Reset filters</button>
      </div>
      <div class="filter-grid">
        <label class="filter-field">
          <span>Activity</span>
          <select id="gantt-activity-filter" class="filter-control">
            <option value="all">All activities</option>
            ${model.activities.map((activity) => `<option value="${escapeHtml(activity.id)}">${escapeHtml(activity.name)}</option>`).join("")}
          </select>
        </label>

        <label class="filter-field">
          <span>Session type</span>
          <select id="gantt-session-type-filter" class="filter-control">
            <option value="all">All session types</option>
            ${SESSION_TYPES.map((type) => `<option value="${type}">${type === "EXAM" ? "Exam" : type}</option>`).join("")}
          </select>
        </label>
        <label class="filter-field filter-field-search">
          <span>Search</span>
          <input id="gantt-search-filter" class="filter-control search-input" type="search" placeholder="Course, room, audience…" autocomplete="off">
        </label>
      </div>
    </section>

    <section class="gantt-summary" aria-label="Gantt totals">
      <article><span>Activities</span><strong id="gantt-activity-count">0</strong></article>
      <article><span>Sessions</span><strong id="gantt-session-count">0</strong></article>
      <article><span>Scheduled hours</span><strong id="gantt-hours">0 h</strong></article>
      <article><span>Visible period</span><strong id="gantt-period-label">—</strong></article>
    </section>

    <section class="gantt-card">
      <div class="gantt-legend" aria-label="Session type legend">
        <span><i class="gantt-legend-swatch is-cm"></i>CM</span>
        <span><i class="gantt-legend-swatch is-td"></i>TD</span>
        <span><i class="gantt-legend-swatch is-td1"></i>TD1</span>
        <span><i class="gantt-legend-swatch is-td2"></i>TD2</span>
        <span><i class="gantt-legend-swatch is-exam"></i>Exam</span>
      </div>
      <div id="gantt-empty" class="gantt-empty" hidden>No dated sessions match the selected filters.</div>
      <div id="gantt-scroll" class="gantt-scroll">
        <div id="gantt-grid" class="gantt-grid"></div>
      </div>
    </section>

    <dialog id="gantt-session-dialog" class="gantt-dialog">
      <form method="dialog" class="gantt-dialog-shell">
        <header class="gantt-dialog-header">
          <div>
            <p class="view-eyebrow" id="gantt-dialog-type">Session</p>
            <h3 id="gantt-dialog-title">Session details</h3>
          </div>
          <button class="gantt-dialog-close" value="close" aria-label="Close session details">×</button>
        </header>
        <div id="gantt-dialog-body" class="gantt-dialog-body"></div>
      </form>
    </dialog>
  `;

  const state = {
    model,
    mode: "sessions",
    activity: "all",
    sessionType: "all",
    query: "",
    from: model.range.minKey,
    to: model.range.maxKey,
  };

  bindControls(container, state);
  render(container, state);
}

function bindControls(container, state) {
  container.querySelectorAll("[data-gantt-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.mode = button.dataset.ganttMode;
      container.querySelectorAll("[data-gantt-mode]").forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });
      render(container, state);
    });
  });

  const activity = container.querySelector("#gantt-activity-filter");
  const type = container.querySelector("#gantt-session-type-filter");
  const search = container.querySelector("#gantt-search-filter");
  const semester = container.querySelector("#gantt-semester");
  const from = container.querySelector("#gantt-date-from");
  const to = container.querySelector("#gantt-date-to");

  from.min = to.min = state.model.range.minKey;
  from.max = to.max = state.model.range.maxKey;
  from.value = state.from;
  to.value = state.to;

  activity.addEventListener("change", () => {
    state.activity = activity.value;
    render(container, state);
  });
  type.addEventListener("change", () => {
    state.sessionType = type.value;
    render(container, state);
  });
  search.addEventListener("input", () => {
    state.query = search.value.trim().toLocaleLowerCase();
    render(container, state);
  });

  const applyCustomRange = () => {
    state.from = from.value || state.model.range.minKey;
    state.to = to.value || state.model.range.maxKey;
    if (state.from > state.to) {
      if (document.activeElement === from) state.to = state.from;
      else state.from = state.to;
    }
    from.value = state.from;
    to.value = state.to;
    semester.value = "all";
    render(container, state);
  };
  from.addEventListener("change", applyCustomRange);
  to.addEventListener("change", applyCustomRange);

  semester.addEventListener("change", () => {
    if (semester.value === "s1") {
      state.from = state.model.range.s1Start;
      state.to = state.model.range.s1End;
    } else if (semester.value === "s2") {
      state.from = state.model.range.s2Start;
      state.to = state.model.range.s2End;
    } else {
      state.from = state.model.range.minKey;
      state.to = state.model.range.maxKey;
    }
    from.value = state.from;
    to.value = state.to;
    render(container, state);
  });

  container.querySelector("#gantt-reset-range").addEventListener("click", () => {
    state.from = state.model.range.minKey;
    state.to = state.model.range.maxKey;
    semester.value = "all";
    from.value = state.from;
    to.value = state.to;
    render(container, state);
  });

  container.querySelector("#gantt-reset-filters").addEventListener("click", () => {
    state.activity = "all";
    state.sessionType = "all";
    state.query = "";
    activity.value = "all";
    type.value = "all";
    search.value = "";
    render(container, state);
  });
}

function render(container, state) {
  const fromDate = dateFromKey(state.from);
  const toDate = endOfDay(dateFromKey(state.to));
  const filteredActivities = state.model.activities
    .map((activity) => ({
      ...activity,
      sessions: activity.sessions.filter((session) =>
        session.start <= toDate
        && session.end >= fromDate
        && (state.sessionType === "all" || session.type === state.sessionType)
        && (!state.query || session.searchText.includes(state.query) || activity.searchText.includes(state.query)),
      ),
    }))
    .filter((activity) =>
      (state.activity === "all" || activity.id === state.activity)
      && (!state.query || activity.searchText.includes(state.query) || activity.sessions.some((session) => session.searchText.includes(state.query)))
      && activity.sessions.length > 0,
    );

  const empty = container.querySelector("#gantt-empty");
  const grid = container.querySelector("#gantt-grid");
  const visibleSessions = filteredActivities.flatMap((activity) => activity.sessions);

  empty.hidden = filteredActivities.length > 0;
  grid.hidden = filteredActivities.length === 0;

  container.querySelector("#gantt-activity-count").textContent = String(filteredActivities.length);
  container.querySelector("#gantt-session-count").textContent = String(visibleSessions.length);
  container.querySelector("#gantt-hours").textContent = formatHours(
    visibleSessions.reduce((sum, session) => sum + session.durationMinutes, 0),
  );
  container.querySelector("#gantt-period-label").textContent =
    `${formatShortDate(fromDate)} – ${formatShortDate(toDate)}`;

  if (!filteredActivities.length) {
    grid.innerHTML = "";
    return;
  }

  const dayWidth = 64;
  const totalDays = Math.max(1, differenceInCalendarDays(fromDate, toDate) + 1);
  const timelineWidth = totalDays * dayWidth;
  const months = buildMonthSegments(fromDate, toDate);
  const weeks = buildWeekTicks(fromDate, toDate);
  const today = new Date();
  const todayOffset = today >= fromDate && today <= toDate
    ? differenceInCalendarDays(fromDate, today) * dayWidth
    : null;

  grid.style.setProperty("--gantt-timeline-width", `${timelineWidth}px`);
  grid.style.setProperty("--gantt-day-width", `${dayWidth}px`);

  grid.innerHTML = `
    <div class="gantt-corner gantt-sticky-top">Activity</div>
    <div class="gantt-header gantt-sticky-top">
      <div class="gantt-months">
        ${months.map((month) => `
          <div style="left:${month.offset * dayWidth}px;width:${month.days * dayWidth}px">
            ${escapeHtml(month.label)}
          </div>
        `).join("")}
      </div>
      <div class="gantt-weeks">
        ${weeks.map((week) => `
          <span style="left:${week.offset * dayWidth}px">${escapeHtml(week.label)}</span>
        `).join("")}
      </div>
    </div>
    ${filteredActivities.map((activity, index) => renderActivityRow(activity, index, fromDate, toDate, dayWidth, timelineWidth, state.mode, todayOffset)).join("")}
  `;

  grid.querySelectorAll("[data-session-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const session = state.model.sessionById.get(button.dataset.sessionId);
      if (session) openSessionDialog(container, session);
    });
  });

  grid.querySelectorAll("[data-activity-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const activity = filteredActivities.find((item) => item.id === button.dataset.activityId);
      if (activity) openActivityDialog(container, activity);
    });
  });
}

function renderActivityRow(activity, colorIndex, fromDate, toDate, dayWidth, timelineWidth, mode, todayOffset) {
  const first = activity.sessions.reduce((value, session) => session.start < value ? session.start : value, activity.sessions[0].start);
  const last = activity.sessions.reduce((value, session) => session.end > value ? session.end : value, activity.sessions[0].end);
  const clippedFirst = first < fromDate ? fromDate : first;
  const clippedLast = last > toDate ? toDate : last;
  const periodLeft = differenceInCalendarDays(fromDate, clippedFirst) * dayWidth;
  const periodWidth = Math.max(dayWidth, (differenceInCalendarDays(clippedFirst, clippedLast) + 1) * dayWidth);
  const paletteIndex = colorIndex % 10;
  const courseStyle = `--course-color: var(--course-${paletteIndex}); --course-color-strong: var(--course-${paletteIndex}-strong);`;

  return `
    <div class="gantt-label is-course" style="${courseStyle}">
      <strong title="${escapeHtml(activity.name)}">${escapeHtml(activity.name)}</strong>
      <span>${activity.sessions.length} session${activity.sessions.length === 1 ? "" : "s"} · ${formatHours(activity.sessions.reduce((sum, session) => sum + session.durationMinutes, 0))}</span>
    </div>
    <div class="gantt-lane is-course" style="width:${timelineWidth}px;${courseStyle}">
      ${todayOffset === null ? "" : `<i class="gantt-today-line" style="left:${todayOffset}px" aria-label="Today"></i>`}
      <div class="gantt-period-bar" style="left:${periodLeft}px;width:${periodWidth}px"></div>
      ${mode === "periods" ? `
        <button
          class="gantt-period-button"
          type="button"
          data-activity-id="${escapeHtml(activity.id)}"
          style="left:${periodLeft}px;width:${periodWidth}px"
          title="${escapeHtml(activity.name)} · ${activity.sessions.length} sessions · ${formatHours(activity.sessions.reduce((sum, session) => sum + session.durationMinutes, 0))} · Click for details"
          aria-label="${escapeHtml(activity.name)} activity period; click for details"
        >
          <span>${activity.sessions.length}</span>
        </button>
      ` : activity.sessions.map((session) => {
        const left = differenceInCalendarDays(fromDate, session.start) * dayWidth;
        const sameDayWidth = 58;
        return `
          <button
            class="gantt-session ${sessionTypeClass(session.type)}"
            type="button"
            data-session-id="${escapeHtml(session.id)}"
            style="left:${left}px;width:${sameDayWidth}px"
            title="${escapeHtml(session.tooltip)}"
            aria-label="${escapeHtml(session.tooltip)}"
          >
            <span>${escapeHtml(session.type === "EXAM" ? "Exam" : session.type)}</span>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function openActivityDialog(container, activity) {
  const dialog = container.querySelector("#gantt-session-dialog");
  const first = activity.sessions[0]?.start;
  const last = activity.sessions[activity.sessions.length - 1]?.end;
  const totalMinutes = activity.sessions.reduce((sum, session) => sum + session.durationMinutes, 0);
  const typeCounts = activity.sessions.reduce((counts, session) => {
    counts[session.type] = (counts[session.type] || 0) + 1;
    return counts;
  }, {});

  container.querySelector("#gantt-dialog-type").textContent = "Course activity period";
  container.querySelector("#gantt-dialog-title").textContent = activity.name;
  container.querySelector("#gantt-dialog-body").innerHTML = `
    <div class="gantt-dialog-date">
      <strong>${formatShortDate(first)} – ${formatShortDate(last)}</strong>
      <span>${activity.sessions.length} sessions · ${formatHours(totalMinutes)}</span>
    </div>
    <dl class="gantt-detail-grid">
      <div><dt>First session</dt><dd>${formatLongDate(first)}</dd></div>
      <div><dt>Last session</dt><dd>${formatLongDate(last)}</dd></div>
      <div><dt>Session breakdown</dt><dd>${Object.entries(typeCounts).map(([type, count]) => `${escapeHtml(type === "EXAM" ? "Exam" : type)}: ${count}`).join(" · ")}</dd></div>
      <div><dt>Audience</dt><dd>${escapeHtml(activity.audiences.join(" · ") || "Not specified")}</dd></div>
    </dl>
  `;
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function openSessionDialog(container, session) {
  const dialog = container.querySelector("#gantt-session-dialog");
  container.querySelector("#gantt-dialog-type").textContent = session.type === "EXAM" ? "Exam" : session.type;
  container.querySelector("#gantt-dialog-title").textContent = session.courseName;
  container.querySelector("#gantt-dialog-body").innerHTML = `
    <div class="gantt-dialog-date">
      <strong>${formatLongDate(session.start)}</strong>
      <span>${formatTime(session.start)}–${formatTime(session.end)} · ${formatHours(session.durationMinutes)}</span>
    </div>
    <dl class="gantt-detail-grid">
      <div><dt>Room</dt><dd>${escapeHtml(session.location || "Not specified")}</dd></div>
      <div><dt>Session type</dt><dd>${escapeHtml(session.type === "EXAM" ? "Exam" : session.type)}</dd></div>
      <div><dt>Audience</dt><dd>${escapeHtml(session.audiences.join(" · ") || "Not specified")}</dd></div>
      <div><dt>Activity</dt><dd>${escapeHtml(session.courseName)}</dd></div>
    </dl>
  `;
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function buildModel(database) {
  const courses = database.courses ?? {};
  const sessionById = new Map();
  const activityMap = new Map();

  Object.values(courses).forEach((course) => {
    const id = String(course.id ?? course.course_id ?? "");
    if (!id) return;
    activityMap.set(id, {
      id,
      name: course.name ?? id,
      category: course.category === "project/suivi" ? "project/suivi" : "course",
      audiences: (course.audiences ?? []).map(audienceLabel).filter(Boolean),
      sessions: [],
      searchText: [
        course.name,
        course.description,
        ...(course.audiences ?? []).flatMap((audience) => Object.values(audience ?? {})),
      ].filter(Boolean).join(" ").toLocaleLowerCase(),
    });
  });

  (database.sessions ?? []).forEach((raw, index) => {
    const start = readDate(raw, ["start_time", "start_datetime", "starts_at", "start", "dtstart", "date"]);
    if (!start) return;
    const end = readDate(raw, ["end_time", "end_datetime", "ends_at", "end", "dtend"])
      ?? new Date(start.getTime() + Number(raw.duration_minutes || 0) * 60000);
    const courseId = String(raw.course_id ?? raw.activity_id ?? "");
    if (!courseId) return;

    if (!activityMap.has(courseId)) {
      activityMap.set(courseId, {
        id: courseId,
        name: raw.course_name ?? raw.title ?? courseId,
        category: "course",
        audiences: [],
        sessions: [],
        searchText: String(raw.course_name ?? raw.title ?? courseId).toLocaleLowerCase(),
      });
    }

    const activity = activityMap.get(courseId);
    const type = normalizeSessionType(raw.session_type ?? raw.type);
    const location = locationLabel(raw.location);
    const audiences = unique([
      ...activity.audiences,
      ...(raw.audiences ?? []).map(audienceLabel),
      ...(raw.audience ? [audienceLabel(raw.audience)] : []),
    ].filter(Boolean));
    const id = String(raw.id ?? `${courseId}-${start.toISOString()}-${index}`);
    const durationMinutes = Number(raw.duration_minutes) || Math.max(0, Math.round((end - start) / 60000));
    const tooltip = `${activity.name} · ${type === "EXAM" ? "Exam" : type} · ${formatLongDate(start)} ${formatTime(start)}–${formatTime(end)}${location ? ` · ${location}` : ""}`;
    const session = {
      id,
      courseId,
      courseName: activity.name,
      category: activity.category,
      type,
      start,
      end,
      durationMinutes,
      location,
      audiences,
      tooltip,
      searchText: [activity.name, type, location, ...audiences].filter(Boolean).join(" ").toLocaleLowerCase(),
    };
    activity.sessions.push(session);
    sessionById.set(id, session);
  });

  const activities = [...activityMap.values()]
    .filter((activity) => activity.category !== "project/suivi" && activity.sessions.length)
    .map((activity) => ({
      ...activity,
      sessions: activity.sessions.sort((a, b) => a.start - b.start),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  const allSessions = activities.flatMap((activity) => activity.sessions);
  const minDate = allSessions.reduce((value, session) => session.start < value ? session.start : value, allSessions[0]?.start ?? new Date());
  const maxDate = allSessions.reduce((value, session) => session.end > value ? session.end : value, allSessions[0]?.end ?? new Date());
  const minKey = dayKey(minDate);
  const maxKey = dayKey(maxDate);
  const january = new Date(minDate.getFullYear() + (minDate.getMonth() >= 7 ? 1 : 0), 0, 1);
  const s1EndDate = new Date(january.getTime() - 86400000);
  const s2StartDate = january;

  return {
    activities,
    sessionById,
    range: {
      minKey,
      maxKey,
      s1Start: minKey,
      s1End: dayKey(s1EndDate < maxDate ? s1EndDate : maxDate),
      s2Start: dayKey(s2StartDate > minDate ? s2StartDate : minDate),
      s2End: maxKey,
    },
  };
}

function buildMonthSegments(from, to) {
  const result = [];
  let cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  while (cursor <= to) {
    const segmentStart = cursor < from ? from : cursor;
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const segmentEnd = monthEnd > to ? to : monthEnd;
    result.push({
      label: new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(cursor),
      offset: differenceInCalendarDays(from, segmentStart),
      days: differenceInCalendarDays(segmentStart, segmentEnd) + 1,
    });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  return result;
}

function buildWeekTicks(from, to) {
  const result = [];
  let cursor = startOfWeek(from);
  while (cursor <= to) {
    if (cursor >= from) {
      result.push({
        label: `W${isoWeek(cursor)}`,
        offset: differenceInCalendarDays(from, cursor),
      });
    }
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7);
  }
  return result;
}

function readDate(object, fields) {
  for (const field of fields) {
    const value = object?.[field];
    if (!value) continue;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
}

function normalizeSessionType(value) {
  const text = String(value ?? "TD").trim().toUpperCase();
  if (text.includes("EXAM")) return "EXAM";
  if (text.includes("TD1")) return "TD1";
  if (text.includes("TD2")) return "TD2";
  if (text.includes("CM")) return "CM";
  return "TD";
}

function locationLabel(location) {
  if (!location) return "";
  if (typeof location === "string") return location;
  return location.raw ?? [location.site, location.building, location.room].filter(Boolean).join(" · ");
}

function audienceLabel(audience) {
  if (!audience) return "";
  if (typeof audience === "string") return audience;
  return audience.source_label
    ?? [audience.year, audience.diploma, audience.track, audience.study_mode, audience.establishment].filter(Boolean).join(" · ");
}

function sessionTypeClass(type) {
  return `is-${String(type).toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function shortType(type) {
  if (type === "EXAM") return "E";
  return type;
}

function dateFromKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function endOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function dayKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function differenceInCalendarDays(start, end) {
  const a = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const b = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((b - a) / 86400000);
}

function startOfWeek(date) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = result.getDay() || 7;
  result.setDate(result.getDate() - day + 1);
  return result;
}

function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function formatHours(minutes) {
  const hours = Number(minutes || 0) / 60;
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(hours)} h`;
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function formatLongDate(date) {
  return new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);
}

function formatTime(date) {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(date);
}

function unique(values) {
  return [...new Set(values)];
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
