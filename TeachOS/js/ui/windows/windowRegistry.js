export class WindowRegistry {
    constructor() {
        this.windows = new Map();
    }

    register(windowElement, taskbarButton) {
        this.windows.set(windowElement, {
            window: windowElement,
            taskbarButton
        });
    }

    unregister(windowElement) {
        const entry = this.windows.get(windowElement);

        if (!entry) {
            return;
        }

        entry.taskbarButton.remove();

        windowElement.remove();

        this.windows.delete(windowElement);
    }

    get(windowElement) {
        return this.windows.get(windowElement);
    }
}