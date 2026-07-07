export class TeachWindow {
  constructor({ appName, title, icon, position, zIndex }) {
    this.appName = appName;
    this.title = title;
    this.icon = icon;
    this.position = position;
    this.zIndex = zIndex;

    this.element = this.createElement();
  }

  createElement() {
    const windowElement = document.createElement("div");

    windowElement.className = "window";
    windowElement.dataset.app = this.appName;

    windowElement.style.left = `${this.position.x}px`;
    windowElement.style.top = `${this.position.y}px`;
    windowElement.style.zIndex = this.zIndex;

    windowElement.innerHTML = `
      <div class="window__header">
        <div class="window__app">
          <span class="window__icon">${this.icon}</span>
          <span class="window__title">${this.title}</span>
        </div>

        <div class="window__controls">
          <button class="window__control window__control--minimize">−</button>
          <button class="window__control window__control--maximize">□</button>
          <button class="window__control window__control--close">✕</button>
        </div>
      </div>

      <div class="window__body">
        Welcome to ${this.title}
      </div>
    `;

    return windowElement;
  }

  setContent(html) {
    this.element.querySelector(".window__body").innerHTML = html;
  }

  setTitle(title) {
    this.title = title;
    this.element.querySelector(".window__title").textContent = title;
  }
}