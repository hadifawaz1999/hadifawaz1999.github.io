// data.json expected to be an ARRAY like:
// [
//   { "label": "...", "fs": 500, "ecg": [...], "intervals": { "P":[...], "QRS":[...], "T":[...] } },
//   ...
// ]

async function loadInlineSVG(url, containerId) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load SVG: ${url}`);

  const svgText = await res.text();
  const container = document.getElementById(containerId);
  container.innerHTML = svgText;
}



async function loadData() {
    const r = await fetch("./data.json");
    if (!r.ok) throw new Error(`Failed to load data.json: ${r.status}`);
    const data = await r.json();

    if (!Array.isArray(data)) {
        throw new Error("data.json must be an array of records (list of dicts).");
    }
    if (data.length === 0) {
        throw new Error("data.json array is empty.");
    }
    return data;
}

function inAny(t, intervals) {
    for (let i = 0; i < intervals.length; i++) {
        const [a, b] = intervals[i];
        if (t >= a && t <= b) return true;
    }
    return false;
}

function phaseAt(t, intervals) {
    if (inAny(t, intervals.P)) return "P";
    if (inAny(t, intervals.QRS)) return "QRS";
    if (inAny(t, intervals.T)) return "T";
    return "REST";
}

function setupECGCanvas(canvas, ecg, fs) {
    const ctx = canvas.getContext("2d");

    // monitor-like view
    const secondsVisible = 5;

    // Plot margins for axes + labels
    const margin = { left: 55, right: 15, top: 15, bottom: 35 };
    const plotW = canvas.width - margin.left - margin.right;
    const plotH = canvas.height - margin.top - margin.bottom;

    const pxPerSecond = plotW / secondsVisible;
    const midY = margin.top + plotH * 0.5;

    // auto-scale amplitude
    let min = Infinity,
        max = -Infinity;
    for (const v of ecg) {
        if (v < min) min = v;
        if (v > max) max = v;
    }
    const range = (max - min) || 1;
    const center = (min + max) / 2;
    const ampScale = (plotH * 0.35) / range;

    // For Y-axis label values
    const yMin = min;
    const yMax = max;

    function drawGrid() {
        ctx.globalAlpha = 0.12;
        ctx.beginPath();

        // Vertical grid (time)
        for (let x = 0; x <= plotW; x += 25) {
            const xx = margin.left + x;
            ctx.moveTo(xx, margin.top);
            ctx.lineTo(xx, margin.top + plotH);
        }

        // Horizontal grid (amplitude)
        for (let y = 0; y <= plotH; y += 25) {
            const yy = margin.top + y;
            ctx.moveTo(margin.left, yy);
            ctx.lineTo(margin.left + plotW, yy);
        }

        ctx.strokeStyle = "#000";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }

    function drawAxes(tStart) {
        ctx.strokeStyle = "#000";
        ctx.fillStyle = "#000";
        ctx.lineWidth = 1;
        ctx.font = "12px system-ui";

        // Y axis
        ctx.beginPath();
        ctx.moveTo(margin.left, margin.top);
        ctx.lineTo(margin.left, margin.top + plotH);
        ctx.stroke();

        // X axis
        ctx.beginPath();
        ctx.moveTo(margin.left, margin.top + plotH);
        ctx.lineTo(margin.left + plotW, margin.top + plotH);
        ctx.stroke();

        // Y ticks (amplitude)
        const yTicks = 5;
        for (let i = 0; i <= yTicks; i++) {
            const frac = i / yTicks; // 0..1
            const y = margin.top + plotH * (1 - frac);
            const value = yMin + frac * (yMax - yMin);

            ctx.beginPath();
            ctx.moveTo(margin.left - 5, y);
            ctx.lineTo(margin.left, y);
            ctx.stroke();

            ctx.textAlign = "right";
            ctx.textBaseline = "middle";
            ctx.fillText(value.toFixed(2), margin.left - 8, y);
        }

        // X ticks (time)
        const xTicks = secondsVisible; // 1 tick per second
        for (let i = 0; i <= xTicks; i++) {
            const x = margin.left + i * pxPerSecond;
            const t = tStart + i;

            ctx.beginPath();
            ctx.moveTo(x, margin.top + plotH);
            ctx.lineTo(x, margin.top + plotH + 5);
            ctx.stroke();

            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillText(t.toFixed(1) + " s", x, margin.top + plotH + 8);
        }
    }

    function draw(tNow) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const tStart = Math.max(0, tNow - secondsVisible);
        const startIdx = Math.floor(tStart * fs);
        const endIdx = Math.min(ecg.length - 1, Math.floor(tNow * fs));

        drawGrid();
        drawAxes(tStart);

        ctx.beginPath();
        for (let i = startIdx; i <= endIdx; i++) {
            const ti = i / fs;
            const x = margin.left + (ti - tStart) * pxPerSecond;
            const y = midY - (ecg[i] - center) * ampScale;

            if (i === startIdx) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = "#111";
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    return { draw };
}

import { setupHeart } from "./heart.js";

function normalizeIntervals(intervals) {
    return {
        P: Array.isArray(intervals?.P) ? intervals.P : [],
        QRS: Array.isArray(intervals?.QRS) ? intervals.QRS : [],
        T: Array.isArray(intervals?.T) ? intervals.T : [],
    };
}

(async function main() {
    await loadInlineSVG("./heart.svg", "heartContainer");

    const heart = setupHeart();

    const records = await loadData();

    const canvas = document.getElementById("ecg");

    const playBtn = document.getElementById("playBtn");
    const pauseBtn = document.getElementById("pauseBtn");
    const restartBtn = document.getElementById("restartBtn");
    const speedSel = document.getElementById("speedSel");
    const recordSel = document.getElementById("recordSel");

    // Populate record dropdown (if present in HTML)
    if (recordSel) {
        recordSel.innerHTML = "";
        records.forEach((rec, idx) => {
            const opt = document.createElement("option");
            opt.value = String(idx);
            opt.textContent = rec.label || `Record ${idx + 1}`;
            recordSel.appendChild(opt);
        });
    }

    let speed = Number(speedSel.value);
    speedSel.addEventListener("change", () => (speed = Number(speedSel.value)));

    // Playback state
    let running = false;
    let tStartPerf = 0;
    let tOffset = 0;

    // Active record state
    let fs = 0;
    let ecg = [];
    let intervals = { P: [], QRS: [], T: [] };
    let duration = 0;
    let ecgView = null;

    function stopAndResetUI() {
        running = false;
        playBtn.disabled = false;
        pauseBtn.disabled = true;
        tStartPerf = 0;
        tOffset = 0;
    }

    function loadRecord(idx) {
        const rec = records[idx];
        if (!rec) throw new Error(`No record at index ${idx}`);

        fs = rec.fs;
        ecg = rec.ecg;
        intervals = normalizeIntervals(rec.intervals);
        duration = ecg.length / fs;

        ecgView = setupECGCanvas(canvas, ecg, fs);

        stopAndResetUI();
        ecgView.draw(0);
        heart.setPhase("REST", 0);
    }

    // Initial record
    loadRecord(0);

    if (recordSel) {
        recordSel.addEventListener("change", () => {
            const idx = Number(recordSel.value);
            loadRecord(idx);
        });
    }

    function start() {
        if (running) return;
        running = true;
        playBtn.disabled = true;
        pauseBtn.disabled = false;
        tStartPerf = performance.now();

        if (heart.resumeFlows) heart.resumeFlows();  // ✅ guard

        requestAnimationFrame(tick);
    }

    function pause() {
        if (!running) return;
        running = false;
        playBtn.disabled = false;
        pauseBtn.disabled = true;

        const elapsed = ((performance.now() - tStartPerf) / 1000) * speed;
        tOffset = Math.min(tOffset + elapsed, duration);

        if (heart.pauseFlows) heart.pauseFlows();    // ✅ guard
    }


    function restart() {
        running = false;
        playBtn.disabled = false;
        pauseBtn.disabled = true;

        tOffset = 0;
        tStartPerf = 0;

        ecgView.draw(0);
        heart.setPhase("REST", 0);

        if (heart.pauseFlows) heart.pauseFlows();    // ✅ keep flows stopped
    }


    playBtn.addEventListener("click", start);
    pauseBtn.addEventListener("click", pause);
    if (restartBtn) restartBtn.addEventListener("click", restart);

    function tick() {
        if (!running) return;

        const elapsed = ((performance.now() - tStartPerf) / 1000) * speed;
        const tNow = Math.min(tOffset + elapsed, duration);

        ecgView.draw(tNow);
        const ph = phaseAt(tNow, intervals);
        heart.setPhase(ph, tNow);

        if (tNow >= duration) {
            running = false;
            playBtn.disabled = false;
            pauseBtn.disabled = true;
            tOffset = duration;
            return;
        }
        requestAnimationFrame(tick);
    }

    // draw initial frame
    ecgView.draw(0);
    heart.setPhase("REST", 0);
})();
