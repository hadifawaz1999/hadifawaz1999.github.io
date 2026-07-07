export class Application {
    constructor(kernel) {
        this.kernel = kernel;
    }

    get id() {
        throw new Error("Application must define an id.");
    }

    get title() {
        throw new Error("Application must define a title.");
    }

    get icon() {
        return "📦";
    }

    render() {
        return `<p>${this.title}</p>`;
    }

    onOpen() { }

    onClose() { }
}