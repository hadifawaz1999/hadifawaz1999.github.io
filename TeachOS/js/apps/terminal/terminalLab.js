import { Application } from "../base/application.js";
import { TerminalController } from "./terminalController.js";

export class TerminalLab extends Application {
  get id() {
    return "terminal";
  }

  get title() {
    return "Terminal Lab";
  }

  get icon() {
    return "💻";
  }

  render() {
    return `
      <div class="terminal">
        <div class="terminal__output">
          <p>TeachOS Terminal v1.0</p>
          <p>Type <span class="terminal__command">help</span> to get started.</p>
        </div>

        <div class="terminal__input-line">
          <span class="terminal__prompt">teachos@student:~$</span>
          <input class="terminal__input" type="text" autofocus />
        </div>
      </div>
    `;
  }

  onOpen(windowElement) {
    const terminalRoot = windowElement.querySelector(".terminal");
    const controller = new TerminalController(terminalRoot);
    controller.initialize();
  }
}