let currentPage = null;

function loadPage(page, event) {

  event.preventDefault();

  // Toggle OFF if same page is clicked again
  if (currentPage === page) {
    document.getElementById("content").innerHTML = "";

    // remove active highlight
    document.querySelectorAll(".menu-btn").forEach(btn => btn.classList.remove("active"));

    currentPage = null;
    return;
  }

  // Load a new page
  fetch(page)
    .then(response => response.text())
    .then(html => {
      const container = document.getElementById("content");
      container.innerHTML = html;
      currentPage = page;

      // update active highlight
      document.querySelectorAll(".menu-btn").forEach(btn => btn.classList.remove("active"));
      if (event) event.target.classList.add("active");

      // init specific pages
      if (page === "table.html" && typeof initTableView === "function") {
        setTimeout(() => initTableView(), 0);
      }
      if (page == "graph_chars.html" && typeof initGraphCharsView == "function") {
        setTimeout(() => initGraphCharsView(), 0);
      }
    })
    .catch(err => {
      document.getElementById("content").innerHTML = "<p>Error loading page.</p>";
      console.error(err);
    });
}
