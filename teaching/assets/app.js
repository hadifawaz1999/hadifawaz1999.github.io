(() => {
  const data = window.COURSE_DATA || {
    config: {},
    types: {},
    units: [],
    stats: {}
  };

  const { config, types, units, stats } = data;
  let activeFilter = "ALL";

  const $ = selector => document.querySelector(selector);

  const setText = (selector, value) => {
    const element = $(selector);

    if (element) {
      element.textContent = value ?? "";
    }
  };

  const escapeHtml = (value = "") =>
    String(value).replace(
      /[&<>"']/g,
      character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[character]
    );

  document.title =
    `${config.title || "Course"} — Course Material`;

  setText("#brand-title", config.title || "My Courses");
  setText("#course-title", config.title || "My Courses");
  setText("#course-subtitle", config.subtitle || "");
  setText("#course-author", config.author || "Ali El Hadi ISMAIL FAWAZ");
  setText("#footer-author", config.author || "Ali El Hadi ISMAIL FAWAZ");
  setText("#course-description", config.description || "List of my courses and their materials.");
  setText("#course-audience", config.audience || "Students at the Université de Haut-Alsace");
  setText("#course-institution", config.institution || "Université de Haut-Alsace");
  setText("#footer-copy", config.footer || "");
  setText("#year", new Date().getFullYear());

  setText("#stat-total", stats.total || 0);
  setText("#stat-cm", stats.cm || 0);
  setText("#stat-pr", stats.pr || 0);

  if (!config.institution) {
    $("#institution-row")?.classList.add("hidden");
  }

  if (config.repositoryUrl) {
    const repositoryLink = $("#repository-link");
    repositoryLink.href = config.repositoryUrl;
    repositoryLink.classList.remove("hidden");
  }

  const selectedTheme =
    localStorage.getItem("course-theme")
    || config.defaultTheme
    || "dark";

  document.documentElement.dataset.theme = selectedTheme;

  $("#theme-toggle")?.addEventListener("click", () => {
    const nextTheme =
      document.documentElement.dataset.theme === "dark"
        ? "light"
        : "dark";

    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem("course-theme", nextTheme);
  });

  const presentTypes =
    [...new Set(units.map(unit => unit.type))];

  const filterOptions = [
    {
      key: "ALL",
      label: `All ${units.length}`
    },
    ...presentTypes.map(key => ({
      key,
      label:
        `${types[key]?.label || key} `
        + units.filter(unit => unit.type === key).length
    }))
  ];

  const filters = $("#filters");

  filterOptions.forEach(({ key, label }) => {
    const button = document.createElement("button");

    button.className =
      `filter-button${key === "ALL" ? " active" : ""}`;

    button.type = "button";
    button.dataset.filter = key;
    button.textContent = label;

    button.addEventListener("click", () => {
      activeFilter = key;

      document
        .querySelectorAll(".filter-button")
        .forEach(item => {
          item.classList.toggle(
            "active",
            item.dataset.filter === key
          );
        });

      render();
    });

    filters?.appendChild(button);
  });

  function renderTopics(topics = []) {
    const visibleTopics = topics.slice(0, 4);
    const remaining = topics.length - visibleTopics.length;

    const tags = visibleTopics.map(topic => (
      `<span class="tag">${escapeHtml(topic)}</span>`
    ));

    if (remaining > 0) {
      tags.push(
        `<span class="tag tag-more">+${remaining}</span>`
      );
    }

    return tags.join("");
  }

  function card(unit) {
    const typeLabel =
      types[unit.type]?.singular || unit.type;

    const subtitle = unit.subtitle
      ? `<p class="card-subtitle">${escapeHtml(unit.subtitle)}</p>`
      : "";

    const description = unit.description
      ? escapeHtml(unit.description)
      : `${escapeHtml(typeLabel)} ${unit.number}`;

    const duration = unit.duration
      ? `<span class="card-duration" style="font-size: 1.2em;">${escapeHtml(unit.duration)}</span>`
      : "";

    return `
      <article class="course-card course-card-${unit.type.toLowerCase()}">
        <div class="card-watermark" aria-hidden="true">
          ${String(unit.number).padStart(2, "0")}
        </div>

        <header class="card-header">
          <div class="card-meta">
            <span class="card-type">${escapeHtml(typeLabel)}</span>
            ${duration}
          </div>
        </header>

        <div class="card-content">
          <h3>${escapeHtml(unit.title)}</h3>
          ${subtitle}
          <p class="card-description">${description}</p>
        </div>

        <div class="tags">
          ${renderTopics(unit.topics || [])}
        </div>

        <footer class="card-footer">
          <a
            class="slides-button"
            href="${encodeURI(unit.pdf)}"
            target="_blank"
            rel="noreferrer"
            aria-label="Open ${escapeHtml(unit.title)} slides"
          >
            <span>View document</span>
            <span aria-hidden="true">↗</span>
          </a>
        </footer>
      </article>
    `;
  }

  function render() {
    const query =
      $("#search")?.value.trim().toLowerCase() || "";

    const filteredUnits = units.filter(unit => {
      const matchesType =
        activeFilter === "ALL"
        || unit.type === activeFilter;

      const searchableText = [
        unit.title,
        unit.subtitle,
        unit.description,
        unit.type,
        ...(unit.topics || [])
      ]
        .join(" ")
        .toLowerCase();

      return (
        matchesType
        && (!query || searchableText.includes(query))
      );
    });

    const grid = $("#course-grid");

    if (grid) {
      grid.innerHTML =
        filteredUnits.map(card).join("");
    }

    $("#empty-state")?.classList.toggle(
      "hidden",
      filteredUnits.length > 0
    );
  }

  $("#search")?.addEventListener("input", render);

  render();
})();
