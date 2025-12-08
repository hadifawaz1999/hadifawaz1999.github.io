let rts_comicsData = [];
let rts_charsData = null;

let rts_currentCharacterFilter = null;
let rts_currentTagFilter = null;

let rts_charsSet = null;
let rts_tagsSet = null;

function initRatingTSView() {
    $.getJSON("data/comics.json", function (data) {
        rts_comicsData = Array.isArray(data) ? data : [];
        initRatingTSCharsFilters(rts_comicsData);
        buildRatingTimeSeriesFromData(rts_comicsData);
    });
}

function rts_getSets(data) {
    rts_charsSet = new Set();
    rts_tagsSet = new Set();

    data.forEach((entry) => {
        if (Array.isArray(entry.tags)) {
            entry.tags.forEach((tg) => {
                if (tg) rts_tagsSet.add(tg);
            });
        }
        if (Array.isArray(entry.characters)) {
            entry.characters.forEach((ch) => {
                if (ch) rts_charsSet.add(ch);
            });
        }
    });
}

function RTS_populateSelectOptions(select_element, values, all_label) {
    select_element.innerHTML = "";

    if (all_label) {
        const all_options = document.createElement("option");
        all_options.value = "";
        all_options.textContent = all_label;
        select_element.appendChild(all_options);
    }

    [...values].sort().forEach((v) => {
        const opt = document.createElement("option");
        opt.value = v;
        opt.textContent = v;
        select_element.appendChild(opt);
    });
}

function RTS_filterSelectOptions(select_element, search_item) {
    const term = (search_item || "").toLowerCase();

    Array.from(select_element.options).forEach((opt) => {
        if (opt.value === "") {
            // "All ..." option always visible
            opt.hidden = false;
            return;
        }

        const text = (opt.textContent || "").toLowerCase();
        opt.hidden = !text.includes(term);
    });
}

function RTS_applyFilters() {
    const c = rts_currentCharacterFilter;
    const t = rts_currentTagFilter;

    const filtered_comics_data = rts_comicsData.filter((entry) => {
        if (
            t &&
            (!Array.isArray(entry.tags) || !entry.tags.includes(t))
        ) {
            return false;
        }
        if (
            c &&
            (!Array.isArray(entry.characters) || !entry.characters.includes(c))
        ) {
            return false;
        }
        return true;
    });

    buildRatingTimeSeriesFromData(filtered_comics_data);
}

function initRatingTSCharsFilters(data) {
    rts_getSets(data);

    const characterSelect = document.getElementById("ts-characterSelect");
    const tagSelect = document.getElementById("ts-tagSelect");

    RTS_populateSelectOptions(characterSelect, rts_charsSet, "All Characters");
    RTS_populateSelectOptions(tagSelect, rts_tagsSet, "All Tags");

    const characterSearch = document.getElementById("ts-characterSearch");
    const tagSearch = document.getElementById("ts-tagSearch");

    characterSearch.addEventListener("input", () => {
        RTS_filterSelectOptions(characterSelect, characterSearch.value);
    });
    tagSearch.addEventListener("input", () => {
        RTS_filterSelectOptions(tagSelect, tagSearch.value);
    });

    characterSelect.addEventListener("change", () => {
        rts_currentCharacterFilter = characterSelect.value || null;
        RTS_applyFilters();
    });
    tagSelect.addEventListener("change", () => {
        rts_currentTagFilter = tagSelect.value || null;
        RTS_applyFilters();
    });
}

function getTimeSeriesPoints(data) {
    let points = [];
    let tags = []

    if (!data || !data.length) {
        return points;
    }

    for (let i = 0; i < data.length; i++) {
        const entry = data[i];

        if (typeof entry.rating !== "number" || isNaN(entry.rating)) {
            continue;
        }

        const year_start = Number(entry.year_start);
        const year_end = Number(entry.year_end);

        const year_mid = (year_start + year_end) / 2;

        tags = entry.tags;

        let point = {
            x: year_mid,
            y: entry.rating,
            series: entry.series,
            age: entry.age,
            id: entry.id_order,
            issues: entry.issues,
            tags: tags
        }

        points.push(point);
    }

    points.sort(function (a, b) {
        return a.x - b.x;
    });

    return points;
}

function drawTimeline(points) {
    
    const marker_color = "#f25c05";
    const line_color = "#ed7028";

    const trace = {
        x: points.map(p => p.x),
        y: points.map(p => p.y),
        text: points.map(p => `${p.series} (${p.issues})`),
        hoverlabel: {
        bgcolor: "#1b2138",
            bordercolor: "#ff6b35",
            font: {
                size: 20,
                color: "#f5f5f7"
            }
        },
        mode: "markers+lines",
        marker: { size: 15, color: marker_color },
        line: { color: line_color },
        type: "scatter"
    };

    const layout = {
        title: {
            text: "Rating Over Time",
            font: { color: "#f5f5f7" }
        },
        xaxis: {
            title: "Year",
            color: "#f5f5f7",
            gridcolor: "#33384d",
            zerolinecolor: "#444b63"
        },
        yaxis: {
            title: "Rating",
            color: "#f5f5f7",
            gridcolor: "#33384d",
            zerolinecolor: "#444b63",
            range: [0, 5]
        },
        plot_bgcolor: "#0b1020",         // the *inside* of the chart
        paper_bgcolor: "rgba(0,0,0,0)",  // the entire card surface behind it
        font: { color: "#f5f5f7" },
        margin: { t: 40, r: 20, b: 50, l: 50 }
    };

    Plotly.newPlot("mtv-chart", [trace], layout);
}

function buildRatingTimeSeriesFromData(data) {
    let points = getTimeSeriesPoints(data);
    drawTimeline(points);
}