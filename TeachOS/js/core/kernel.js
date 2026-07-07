import { WindowManager } from "../ui/windowManager.js";
import { Clock } from "../ui/clock.js";
import { ApplicationManager } from "./applicationManager.js";
import { TerminalLab } from "../apps/terminal/terminalLab.js";

export class Kernel {
    constructor() {
        this.windowManager = new WindowManager(this);
        this.clock = new Clock();
        this.applicationManager = new ApplicationManager(this);
    }

    boot() {
        console.log("TeachOS booted.");

        this.windowManager.initialize();
        this.applicationManager.register(new TerminalLab(this));
        this.clock.start();
    }
}