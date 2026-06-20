const blogGrid = document.getElementById("blogGrid");
const blogCount = document.getElementById("blogCount");
const searchInput = document.getElementById("searchInput");
const emptyState = document.getElementById("emptyState");

let blogs = [];

async function loadBlogs() {
    try {
        const res = await fetch("./blogs.json");

        if (!res.ok) {
            throw new Error("Could not load blogs.json");
        }

        blogs = await res.json();
        renderBlogs(blogs);
    } catch (err) {
        blogGrid.innerHTML = `
          <article class="error-card">
            <h2>Could not load blogs</h2>
            <p>Please check that <code>blogs.json</code> exists in the blogs folder.</p>
          </article>
        `;
    }
}

function renderBlogs(items) {
    blogCount.textContent = items.length;
    emptyState.hidden = items.length > 0;

    blogGrid.innerHTML = items.map(blog => {
        return `
          <article class="blog-card">
            <div class="card-top">
              <span class="category">${blog.categories.join(", ") || "Blog"}</span>
              ${blog.featured ? `<span class="featured">Featured</span>` : ""}
            </div>

            <h2>${blog.title}</h2>

            <p>${blog.description}</p>

            <div class="meta">
              <span>${formatDate(blog.date)}</span>
              <span>${blog.author || ""}</span>
            </div>

            <a class="read-link" target="_blank" href="${blog.url || `./${blog.slug}/`}">
              Open blog
              <span aria-hidden="true">→</span>
            </a>
          </article>
        `;
    }).join("");
}

function formatDate(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString("en", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();

    const filtered = blogs.filter(blog => {
        return [
            blog.title,
            blog.description,
            blog.category,
            blog.author
        ]
            .join(" ")
            .toLowerCase()
            .includes(query);
    });

    renderBlogs(filtered);
});

loadBlogs();