export class MaximizeManager {
  constructor(focusManager) {
    this.focusManager = focusManager;
  }

  attach(windowElement) {
    windowElement
      .querySelector(".window__control--maximize")
      .addEventListener("click", () => {
        this.toggle(windowElement);
      });
  }

  toggle(windowElement) {
    this.focusManager.focus(windowElement);

    if (windowElement.classList.contains("is-maximized")) {
      this.restore(windowElement);
      return;
    }

    this.maximize(windowElement);
  }

  maximize(windowElement) {
    windowElement.dataset.previousLeft = windowElement.style.left;
    windowElement.dataset.previousTop = windowElement.style.top;
    windowElement.dataset.previousWidth = windowElement.style.width || "640px";
    windowElement.dataset.previousHeight = windowElement.style.height || "";

    windowElement.classList.add("is-maximized");

    windowElement.style.left = "24px";
    windowElement.style.top = "24px";
    windowElement.style.width = "calc(100vw - 48px)";
    windowElement.style.height = "calc(100vh - 112px)";
  }

  restore(windowElement) {
    windowElement.classList.remove("is-maximized");

    windowElement.style.left = windowElement.dataset.previousLeft;
    windowElement.style.top = windowElement.dataset.previousTop;
    windowElement.style.width = windowElement.dataset.previousWidth;
    windowElement.style.height = windowElement.dataset.previousHeight;
  }
}