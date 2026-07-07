import { Kernel } from "./core/kernel.js";

const kernel = new Kernel();

window.addEventListener("DOMContentLoaded", () => {
    kernel.boot();
});