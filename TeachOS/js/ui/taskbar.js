export class Taskbar {
  constructor() {
    this.runningAppsElement = document.getElementById("running-apps");
  }

  addWindow(windowElement) {
    const appName = windowElement.dataset.app;
    const title = windowElement.querySelector(".window__title").textContent;
    const icon = windowElement.querySelector(".window__icon").textContent;

    const button = document.createElement("button");
    button.className = "taskbar-app";
    button.dataset.app = appName;

    button.innerHTML = `
      <span>${icon}</span>
      <span>${title}</span>
    `;

    this.runningAppsElement.appendChild(button);

    return button;
  }

  removeButton(button) {
    button.remove();
  }
}