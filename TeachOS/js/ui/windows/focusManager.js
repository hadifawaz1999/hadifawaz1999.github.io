export class FocusManager {
    constructor() {
        this.zIndex = 100;
    }

    focus(windowElement) {
        document.querySelectorAll(".window").forEach(win => {
            win.classList.remove("is-active");
        });

        windowElement.classList.add("is-active");
        windowElement.style.zIndex = ++this.zIndex;
    }

    nextZIndex() {
        return ++this.zIndex;
    }
}