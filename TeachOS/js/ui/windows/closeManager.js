export class CloseManager {
  constructor(registry) {
    this.registry = registry;
  }

  attach(windowElement) {
    windowElement
      .querySelector(".window__control--close")
      .addEventListener("click", () => {
        this.registry.unregister(windowElement);
      });
  }
}