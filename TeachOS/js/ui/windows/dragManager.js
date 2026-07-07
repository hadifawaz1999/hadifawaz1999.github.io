export class DragManager {
    constructor(desktop, focusManager) {
        this.desktop = desktop;
        this.focusManager = focusManager;

        this.draggedWindow = null;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
    }

    attach(windowElement) {
        const header = windowElement.querySelector(".window__header");

        header.addEventListener("mousedown", event => {
            this.start(event, windowElement);
        });
    }

    start(event, windowElement) {
        if (event.target.classList.contains("window__control")) {
            return;
        }

        this.focusManager.focus(windowElement);

        this.draggedWindow = windowElement;

        const rect = windowElement.getBoundingClientRect();

        this.dragOffsetX = event.clientX - rect.left;
        this.dragOffsetY = event.clientY - rect.top;
    }

    move(event) {
        if (!this.draggedWindow) {
            return;
        }

        const desktopRect = this.desktop.getBoundingClientRect();
        const windowRect = this.draggedWindow.getBoundingClientRect();

        const nextLeft = event.clientX - this.dragOffsetX;
        const nextTop = event.clientY - this.dragOffsetY;

        const minLeft = 12;
        const minTop = 12;
        const maxLeft = desktopRect.width - windowRect.width - 12;
        const maxTop = desktopRect.height - windowRect.height - 88;

        const safeLeft = Math.min(Math.max(nextLeft, minLeft), maxLeft);
        const safeTop = Math.min(Math.max(nextTop, minTop), maxTop);

        this.draggedWindow.style.left = `${safeLeft}px`;
        this.draggedWindow.style.top = `${safeTop}px`;
    }

    stop() {
        this.draggedWindow = null;
    }
}