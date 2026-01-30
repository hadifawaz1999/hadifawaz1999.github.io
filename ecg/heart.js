// heart.js
export function setupHeart() {
  const svg = document.querySelector(".heart");
  const atria = document.getElementById("atria");
  const ventricles = document.getElementById("ventricles");
  const phaseText = document.getElementById("phaseText");
  const timeText = document.getElementById("timeText");

  if (!svg || !atria || !ventricles) {
    throw new Error("Missing .heart, #atria, or #ventricles");
  }

  let lastPhase = "REST";

  function restart(el, cls) {
    el.classList.remove(cls);
    void el.getBoundingClientRect(); // force reflow
    el.classList.add(cls);
  }

  function setPhase(phase, tNow) {
    phaseText.textContent = phase;
    timeText.textContent = tNow.toFixed(2);

    if (phase === lastPhase) return;

    if (phase === "P") {
      restart(atria, "atria-contract");
    }

    if (phase === "QRS") {
      restart(ventricles, "ventricles-contract");
      restart(svg, "heart-contract");   // ← whole heart
    }

    if (phase === "T") {
      restart(ventricles, "ventricles-relax");
    }

    lastPhase = phase;
  }

  function reset() {
    lastPhase = "REST";
  }

  return { setPhase, reset };
}
