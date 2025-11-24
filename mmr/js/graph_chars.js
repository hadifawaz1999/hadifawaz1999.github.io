let comicsData = [];
let currentSeriesFilter = null;
let currentCharacterFilter = null;
let currentRenderer = null;

function initGraphCharsView() {

    $.getJSON("data/comics.json", function (data){
        comicsData = data;
        initGraphCharsFilters(comicsData);
        buildGraphCharsFromData(comicsData)
    });

}

function buildGraphCharsFromData(data) {
        
    const Graph = graphology.Graph;
    const graph = new Graph({ type: "undirected" });

    let year_text = "";

    const seenNodeIds = new Set();
    const seenEdges = new Set();

    let index = 0;

    function addNode(id, attrs) {
        if (seenNodeIds.has(id)) return;

        const x = (Math.random() - 0.5) * 10;
        const y = (Math.random() - 0.5) * 10;

        graph.addNode(id, {
        x,
        y,
        size: attrs.size,
        label: attrs.label,
        color: attrs.color,
        kind: attrs.kind,
        });

        seenNodeIds.add(id);
        index++;
    }

    for (const entry of data){
        const seriesID = `series:${entry.id_order}`;
        if (entry.year_start == entry.year_end){
            year_text = `(${entry.year_start})`;
        }
        else {
            year_text = `(${entry.year_start}-${entry.year_end})`;
        }
        const seriesLabel = `#${seriesID} - ${entry.series} - Issues ${entry.issues} ${year_text}`;

        addNode(seriesID, {
            label: seriesLabel,
            kind: "series",
            size: 8,
            color: "#ffcc00"
        });

        if (Array.isArray(entry.characters)){
            for (const char_name of entry.characters){

                const charID = `char:${char_name}`;
                const charLabel = char_name;
                addNode(charID, {
                    label: char_name,
                    kind: "character",
                    size: 4,
                    color: "#66aaff"
                });

                const edgeKey = `${charID}->${seriesID}`;
                if (!seenEdges.has(edgeKey)){
                    graph.addEdge(charID, seriesID);
                    seenEdges.add(edgeKey);
                }
            }
        }
    }

    relaxGraphLayout(graph, 300, 0.01);

    const container = document.getElementById("graph-chars");

    if (currentRenderer) {
        currentRenderer.kill();
        currentRenderer = null;
    }
    container.innerHTML = "";

    const renderer = new Sigma(graph, container, {
        labelRenderedSizeThreshold: 8,
        labelRenderer: customLabelRenderer,
    });

    renderer.setSetting("labelSize", 12);
    renderer.setSetting("labelFont", "system-ui");
    renderer.setSetting("labelWeight", "500");
    renderer.setSetting("minCameraRatio", 0.005);
    renderer.setSetting("maxCameraRatio", 2);

    // console.log("Graph built:", graph.order, "nodes,", graph.size, "edges");
}

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


function relaxGraphLayout(graph, iterations=200, step=0.01){

    for (let iter = 0; iter < iterations; iter++){
        graph.forEachEdge((edge, attr, source, target) => {

            const source_x = graph.getNodeAttribute(source, "x");
            const source_y = graph.getNodeAttribute(source, "y");

            const target_x = graph.getNodeAttribute(target, "x");
            const target_y = graph.getNodeAttribute(target, "y");

            const dx = target_x - source_x;
            const dy = target_y - source_y;

            const fx = dx * step;
            const fy = dy * step;

            graph.setNodeAttribute(source, "x", source_x + fx);
            graph.setNodeAttribute(source, "y", source_y + fy);
            graph.setNodeAttribute(target, "x", target_x - fx);
            graph.setNodeAttribute(target, "y", target_y - fy);

        });
    }

}

function initGraphCharsFilters(data){

    const seriesSet = new Set();
    const charsSet = new Set();

    data.forEach(entry => {
        if (entry.series) { seriesSet.add(entry.series); }
        if (Array.isArray(entry.characters)) { 
            entry.characters.forEach(ch => {
                if (ch) { charsSet.add(ch); }
            })
         }
    });

    const seriesSelect = document.getElementById("seriesSelect");
    const characterSelect = document.getElementById("characterSelect");

    function populateSelectOptions(select_element, values, all_label){
        select_element.innerHtTML = "";

        const all_options = document.createElement("option");
        all_options.value = "";
        all_options.textContent = all_label;
        select_element.appendChild(all_options);

        [...values].sort().forEach(v => {
            const opt = document.createElement("option");
            opt.value = v;
            opt.textContent = v;
            select_element.appendChild(opt);
        });
    }

    populateSelectOptions(seriesSelect, seriesSet, "All Series");
    populateSelectOptions(characterSelect, charsSet, "All Characters");

    const seriesSearch = document.getElementById("seriesSearch");
    const characterSearch = document.getElementById("characterSearch");

    seriesSearch.addEventListener("input", () => {
        filterSelectOptions(seriesSelect, seriesSearch.value);
    });

    characterSearch.addEventListener("input", () => {
        filterSelectOptions(characterSelect, characterSearch.value);
    });

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
  const term = search_item.toLowerCase();

  Array.from(select_element.options).forEach(opt => {
    if (opt.value === "") {
      opt.hidden = false;
      return;
    }

    const text = opt.textContent.toLowerCase();
    opt.hidden = !text.includes(term);
  });
}

function applyFilters(){
    const s = currentSeriesFilter;
    const c = currentCharacterFilter;

    const filtered_comics_data = comicsData.filter(entry => {
        if (s && entry.series !== s) { return false; }
        if (c && (!Array.isArray(entry.characters) || !entry.characters.includes(c))) { return false; }
        return true;
    });

    buildGraphCharsFromData(filtered_comics_data);
}