const sections = [
    "01-introduction",
    "02-probability-view",
    "03-synthetic-experiment",
    "04-information-learned",
    "05-modern-generative-models",
    "06-practical-consequences",
    "07-conclusion"
];


function buildTOC() {

    const tocList = document.getElementById("toc-list");

    if (!tocList) return;

    tocList.innerHTML = "";

    const sections = document.querySelectorAll("#content section");

    sections.forEach((section, index) => {

        const heading = section.querySelector("h2");

        if (!heading) return;

        const id = `section-${index + 1}`;

        section.id = id;

        const li = document.createElement("li");

        li.innerHTML = `
      <a href="#${id}">
        ${heading.textContent}
      </a>
    `;

        tocList.appendChild(li);
    });
}


async function loadSections() {
    const container = document.getElementById("content");

    for (const section of sections) {
        try {
            const response = await fetch(`./sections/${section}.html`);

            if (!response.ok) {
                throw new Error(`Failed to load ${section}`);
            }

            const html = await response.text();

            container.insertAdjacentHTML(
                "beforeend",
                html
            );
        }
        catch (err) {
            console.error(err);

            container.insertAdjacentHTML(
                "beforeend",
                `
                <section class="section">
                    <h2>Error</h2>
                    <p>Could not load section: ${section}</p>
                </section>
                `
            );
        }
    }

    buildTOC();

    if (window.MathJax && window.MathJax.typesetPromise) {
        await window.MathJax.typesetPromise([container]);
    }
}

function handleTOCVisibility() {
  const threshold = 420;

  if (window.scrollY > threshold) {
    document.body.classList.add("scrolled");
  } else {
    document.body.classList.remove("scrolled");
  }
}

window.addEventListener("scroll", handleTOCVisibility);
handleTOCVisibility();

loadSections();
