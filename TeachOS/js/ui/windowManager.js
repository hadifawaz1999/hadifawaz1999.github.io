import { WindowFactory } from "./windows/windowFactory.js";
import { FocusManager } from "./windows/focusManager.js";
import { DragManager } from "./windows/dragManager.js";
import { MaximizeManager } from "./windows/maximizeManager.js";
import { CloseManager } from "./windows/closeManager.js";
import { Taskbar } from "./taskbar.js";
import { WindowRegistry } from "./windows/windowRegistry.js";
import { MinimizeManager } from "./windows/minimizeManager.js";

export class WindowManager {
    constructor(kernel) {
        this.kernel = kernel;
        this.desktop = null;
        this.container = null;
        this.zIndex = 100;
        this.windowCount = 0;
        this.windowFactory = new WindowFactory();
        this.focusManager = new FocusManager();
        this.dragManager = null;
        this.maximizeManager = null;
        this.taskbar = new Taskbar();
        this.registry = new WindowRegistry();
        this.closeManager = new CloseManager(this.registry);
        this.minimizeManager = null;
    }

    initialize() {
        this.desktop = document.querySelector(".desktop");
        this.container = document.getElementById("windows-container");
        this.dragManager = new DragManager(this.desktop, this.focusManager);
        this.maximizeManager = new MaximizeManager(this.focusManager);
        this.minimizeManager = new MinimizeManager(this.focusManager);

        document.querySelectorAll(".desktop-icon").forEach(icon => {
            icon.addEventListener("dblclick", () => {
                this.kernel.applicationManager.launch(icon.dataset.app);
            });
        });

        document.addEventListener("mousemove", event => {
            this.dragManager.move(event);
        });

        document.addEventListener("mouseup", () => {
            this.dragManager.stop();
        });
    }

    openWindow(appName) {
        const offset = this.windowCount * 28;

        const position = {
            x: 220 + offset,
            y: 120 + offset
        };

        const teachWindow = this.windowFactory.create(
            appName,
            position,
            this.focusManager.nextZIndex()
        );

        const windowElement = teachWindow.element;

        this.windowCount++;

        const header = windowElement.querySelector(".window__header");

        this.dragManager.attach(windowElement);
        this.maximizeManager.attach(windowElement);
        this.closeManager.attach(windowElement);

        windowElement.addEventListener("mousedown", () => {
            this.focusManager.focus(windowElement);
        });

        this.container.appendChild(windowElement);
        const taskbarButton = this.taskbar.addWindow(windowElement);
        this.registry.register(windowElement, taskbarButton);

        this.minimizeManager.attach(windowElement, taskbarButton);
        this.focusManager.focus(windowElement);
    }

    openApplication(application) {
        const offset = this.windowCount * 28;

        const position = {
            x: 220 + offset,
            y: 120 + offset
        };

        const teachWindow = this.windowFactory.createFromApplication(
            application,
            position,
            this.focusManager.nextZIndex()
        );

        const windowElement = teachWindow.element;

        this.windowCount++;

        this.container.appendChild(windowElement);

        this.dragManager.attach(windowElement);
        this.maximizeManager.attach(windowElement);

        const taskbarButton = this.taskbar.addWindow(windowElement);

        this.registry.register(windowElement, taskbarButton);
        this.minimizeManager.attach(windowElement, taskbarButton);
        this.closeManager.attach(windowElement);

        this.focusManager.focus(windowElement);

        application.onOpen(windowElement);
    }
}