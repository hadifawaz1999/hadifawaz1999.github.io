import { Application } from "../base/application.js";

export class SchedulerLab extends Application {

  get id() {
        return "scheduler";
    }

    get title() {
        return "Scheduler";
    }

    get icon() {
        return "⚙️";
    }

  render() {
    return `
    <section class="lab">
      <header class="lab__header">
        <h2>Scheduler Lab</h2>
        <p>Visualize how the operating system schedules processes.</p>
      </header>

      <div class="lab__grid">
        <article class="lab-card">
          <h3>Running</h3>
          <p>0</p>
        </article>

        <article class="lab-card">
          <h3>Ready</h3>
          <p>0</p>
        </article>

        <article class="lab-card">
          <h3>Waiting</h3>
          <p>0</p>
        </article>
      </div>
      </section>
    `;
  }
}