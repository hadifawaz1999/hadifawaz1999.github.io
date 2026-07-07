export class MinimizeManager {
    constructor(focusManager) {
        this.focusManager = focusManager;
    }

    attach(windowElement, taskbarButton) {
        windowElement
            .querySelector(".window__control--minimize")
            .addEventListener("click", () => {
                this.minimize(windowElement, taskbarButton);
            });

        taskbarButton.addEventListener("click", () => {
            this.restore(windowElement, taskbarButton);
        });
    }

    minimize(windowElement, taskbarButton) {
        windowElement.classList.add("is-minimized");
        taskbarButton.classList.add("is-minimized");
    }

    restore(windowElement, taskbarButton) {
        windowElement.classList.remove("is-minimized");
        taskbarButton.classList.remove("is-minimized");
        this.focusManager.focus(windowElement);
    }
}