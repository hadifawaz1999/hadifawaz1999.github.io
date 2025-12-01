// comics-graph.js

// -----------------------------------------------------
// Global state
// -----------------------------------------------------
let current_graph = null;
let comicsData = [];
let charsData = null;
let currentSeriesFilter = null;
let currentCharacterFilter = null;
let currentRenderer = null;
let seriesSet = null;
let charsSet = null;

// -----------------------------------------------------
// Init entry point
// -----------------------------------------------------
function initGraphCharsView() {
    $.getJSON("data/comics.json", function (data) {
        comicsData = Array.isArray(data) ? data : [];
        $.getJSON("data/chars.json", function (charactersData) {
            charsData = charactersData;
            initGraphCharsFilters(comicsData);
            buildGraphCharsFromData(comicsData, charactersData);
        });
    });
}



// -----------------------------------------------------
// Build graph + layout + clusters + render
// -----------------------------------------------------
function buildGraphCharsFromData(data, chars_data) {
    const Graph = graphology.Graph;
    const graph = new Graph({ type: "undirected" });

    let year_text = "";
    const seenNodeIds = new Set();
    const seenEdges = new Set();

    function addNode(id, attrs) {
        if (seenNodeIds.has(id)) return;

        // Initial random position (layout will refine this)
        const x = (Math.random() - 0.5) * 10;
        const y = (Math.random() - 0.5) * 10;

        graph.addNode(id, {
            x,
            y,
            size: attrs.size,
            label: attrs.label,
            color: attrs.color,
            kind: attrs.kind,
            url: attrs.url || null,
        });

        seenNodeIds.add(id);
    }

    // ---- Build nodes & edges from your comicsData ----
    for (const entry of data) {
        const seriesID = `series:${entry.id_order}`;

        if (entry.year_start == entry.year_end) {
            year_text = `(${entry.year_start})`;
        } else {
            year_text = `(${entry.year_start}-${entry.year_end})`;
        }

        const seriesLabel = `#${seriesID} - ${entry.series} - Issues ${entry.issues} ${year_text}`;

        addNode(seriesID, {
            label: seriesLabel,
            kind: "series",
            size: 8,
            color: "#ffcc00", // default color (can be overridden by clusters)
            url: entry.urls,
        });

        if (Array.isArray(entry.characters)) {
            for (const char_name of entry.characters) {
                const charID = `char:${char_name}`;

                addNode(charID, {
                    label: char_name,
                    kind: "character",
                    size: 4,
                    color: "#66aaff", // default color (can be overridden by clusters)
                    url: chars_data[char_name],
                });

                const edgeKey = `${charID}->${seriesID}`;
                if (!seenEdges.has(edgeKey)) {
                    graph.addEdge(charID, seriesID);
                    seenEdges.add(edgeKey);
                }
            }
        }
    }

    current_graph = graph;

    // -------------------------------------------------
    // Layout: prefer ForceAtlas2 if available, else fallback
    // -------------------------------------------------
    if (graph.order > 0 && graph.size > 0) {
        if (window.graphologyLibrary && graphologyLibrary.layoutForceAtlas2) {
            const settings = graphologyLibrary.layoutForceAtlas2.inferSettings(graph);
            graphologyLibrary.layoutForceAtlas2.assign(graph, {
                iterations: 300,
                settings,
            });
        }
    }

    // -------------------------------------------------
    // Render with Sigma
    // -------------------------------------------------
    const container = document.getElementById("graph-chars");

    if (currentRenderer) {
        currentRenderer.kill();
        currentRenderer = null;
    }
    container.innerHTML = "";

    container.style.position = container.style.position || "relative";

    const popup = document.createElement("div");
    popup.id = "node-popup";
    popup.className = "node-popup";
    popup.style.display = "none";
    container.appendChild(popup);

    const renderer = new Sigma(graph, container, {
        labelRenderedSizeThreshold: 10,
        labelRenderer: customLabelRenderer,
    });

    renderer.setSetting("labelSize", 12);
    renderer.setSetting("labelFont", "system-ui");
    renderer.setSetting("labelWeight", "500");
    renderer.setSetting("minCameraRatio", 0.005);
    renderer.setSetting("maxCameraRatio", 2);

    renderer.on("clickNode", ({ node, event }) => {

        const attrs = graph.getNodeAttributes(node);
        if (attrs.kind == "series") {
            const urls = attrs.url || {};

            let html = `<strong>${attrs.label || node}</strong><br><br>`;
            for (const [title, link] of Object.entries(urls)) {
                html += `<a href="${link}" target="_blank" rel="noopener noreferrer">${title}</a><br>`;
            }
            popup.innerHTML = html;

            const rect = container.getBoundingClientRect();
            popup.style.left = (event.clientX - rect.left + 10) + "px";
            popup.style.top = (event.clientY - rect.top + 10) + "px";
            popup.style.display = "block";
        }
        else if (attrs.kind == "character") {
            const url = attrs.url || {};
            console.log(url);
            window.open(url, "_blank");
        }
    });

    renderer.on("clickStage", () => {
        popup.style.display = "none";
    });


    currentRenderer = renderer;
}

// -----------------------------------------------------
// Custom label renderer for Sigma
// -----------------------------------------------------
function customLabelRenderer(ctx, data, settings) {
    if (!data.label) return;

    const size = data.size || 1;
    if (size < settings.labelRenderedSizeThreshold) return;

    const fontSize = settings.labelSize;
    const font = `${settings.labelWeight} ${fontSize}px ${settings.labelFont}`;

    ctx.font = font;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Draw label just above the node
    ctx.fillText(data.label, data.x, data.y - size - 3);
}

function populateSelectOptions(select_element, values, all_label) {
    select_element.innerHTML = "";

    if (all_label){
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

function getSets(data){
    seriesSet = new Set();
    charsSet = new Set();

    data.forEach((entry) => {
        if (entry.series) {
            seriesSet.add(entry.series);
        }
        if (Array.isArray(entry.characters)) {
            entry.characters.forEach((ch) => {
                if (ch) charsSet.add(ch);
            });
        }
    });
}

// -----------------------------------------------------
// Filters (series / characters)
// -----------------------------------------------------
function initGraphCharsFilters(data) {
    getSets(data);

    const seriesSelect = document.getElementById("seriesSelect");
    const characterSelect = document.getElementById("characterSelect");

    populateSelectOptions(seriesSelect, seriesSet, "All Series");
    populateSelectOptions(characterSelect, charsSet, "All Characters");

    const seriesSearch = document.getElementById("seriesSearch");
    const characterSearch = document.getElementById("characterSearch");

    // Live filtering of dropdown options
    seriesSearch.addEventListener("input", () => {
        filterSelectOptions(seriesSelect, seriesSearch.value);
    });

    characterSearch.addEventListener("input", () => {
        filterSelectOptions(characterSelect, characterSearch.value);
    });

    // On select change, update filters and rebuild graph
    seriesSelect.addEventListener("change", () => {
        currentSeriesFilter = seriesSelect.value || null;
        applyFilters();
    });

    characterSelect.addEventListener("change", () => {
        currentCharacterFilter = characterSelect.value || null;
        applyFilters();
    });
}

function filterSelectOptions(select_element, search_item) {
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

function applyFilters() {
    const s = currentSeriesFilter;
    const c = currentCharacterFilter;

    const filtered_comics_data = comicsData.filter((entry) => {
        if (s && entry.series !== s) return false;
        if (
            c &&
            (!Array.isArray(entry.characters) || !entry.characters.includes(c))
        ) {
            return false;
        }
        return true;
    });

    console.log(filtered_comics_data);

    buildGraphCharsFromData(filtered_comics_data, charsData);
}

function ToggleBFSbutton(){
    const bfs_panel_content = document.getElementById("pathPanelContent");
    const toggle_button = document.getElementById("togglePathPanel");

    const isPanelHidden = bfs_panel_content.style.display === "none";

    if (!isPanelHidden){
        bfs_panel_content.style.display = "none";
        toggle_button.textContent = "Show Path Finder";
    }
    else {
        bfs_panel_content.style.display = "block";
        toggle_button.textContent = "Hide Path Finder";

        const char1_select = document.getElementById("pathChar1");
        const char2_select = document.getElementById("pathChar2");
        
        populateSelectOptions(char1_select, charsSet, null);
        populateSelectOptions(char2_select, charsSet, null);

        const char1_search = document.getElementById("pathChar1Search");
        char1_search.addEventListener("input", () => {
            filterSelectOptions(char1_select, char1_search.value);
        });

        const char2_search = document.getElementById("pathChar2Search");
        char2_search.addEventListener("input", () => {
            filterSelectOptions(char2_select, char2_search.value);
        });

        const bfs_button = document.getElementById("findShortestPathButton");

        bfs_button.addEventListener("click", () => {

            if (bfs_button.textContent == "Find Path (BFS)"){
                const char1_name = char1_select.value;
                const char2_name = char2_select.value;

                const shortest_path = get_bfs_shortest_path(current_graph, `char:${char1_name}`, `char:${char2_name}`);

                resetGraphColors(current_graph);
                if (!shortest_path) {
                    return;
                }

                highlightShortestPath(current_graph, shortest_path);
                currentRenderer.refresh();

                bfs_button.textContent = "Reset Graph Colors";
            }
            else{
                bfs_button.textContent = "Find Path (BFS)";
                resetGraphColors(current_graph);
            }
        });
    }
}

function get_bfs_shortest_path(graph, source_id, target_id){
    const queue = [source_id];
    const visited = new Set([source_id]);
    const prev = new Map();

    while (queue.length > 0){
        const curr_node = queue.shift();
        if (curr_node == target_id) break;

        const curr_neighbors = graph.neighbors(curr_node);
        for (const _neighbor of curr_neighbors){
            if (!visited.has(_neighbor)){
                visited.add(_neighbor);
                prev.set(_neighbor, curr_node);
                queue.push(_neighbor);
            }
        }
    }

    if (!visited.has(target_id)){
        return null;
    }

    const shortest_path = [];
    let cur = target_id;
    while (cur != undefined){
        shortest_path.push(cur);
        cur = prev.get(cur);
    }
    shortest_path.reverse();
    return shortest_path;
}

function resetGraphColors(graph) {
    graph.forEachNode((node) => {
        const kind = graph.getNodeAttribute(node, "kind");
        graph.setNodeAttribute(
            node,
            "color",
            kind === "series" ? "#ffcc00" : "#66aaff"
        );
    });

    graph.forEachEdge((edge) => {
        graph.setEdgeAttribute(edge, "color", "#999");
    });
}

function highlightShortestPath(graph, path) {
    if (!path) return;

    // Color nodes
    for (const node of path) {
        graph.setNodeAttribute(node, "color", "#ff3333");
    }

    // Color edges between consecutive nodes
    for (let i = 0; i < path.length - 1; i++) {
        const a = path[i];
        const b = path[i + 1];

        // get the edge between a & b
        const edge = graph.edge(a, b);
        if (edge) {
            graph.setEdgeAttribute(edge, "color", "#ff3333");
        }
    }
}
