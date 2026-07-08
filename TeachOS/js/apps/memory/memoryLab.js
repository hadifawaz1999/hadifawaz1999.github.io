import { Application } from "../base/application.js";

export class MemoryLab extends Application {
    get id() {
        return "memory";
    }

    get title() {
        return "Memory Lab";
    }

    get icon() {
        return "🧠";
    }

    render() {
        return `
      <section class="lab">
        <header class="lab__header">
          <h2>Memory Lab</h2>
          <p>Explore RAM, allocation, fragmentation, paging, and virtual memory.</p>
        </header>

        <div class="lab__grid">
          <article class="lab-card">
            <h3>RAM Overview</h3>
            <p>Visualize used and free memory blocks.</p>
          </article>

          <article class="lab-card">
            <h3>Allocation</h3>
            <p>Compare first-fit, best-fit, and worst-fit strategies.</p>
          </article>

          <article class="lab-card">
            <h3>Paging</h3>
            <p>Learn how virtual pages map to physical frames.</p>
          </article>
        </div>
      </section>
    `;
    }
}