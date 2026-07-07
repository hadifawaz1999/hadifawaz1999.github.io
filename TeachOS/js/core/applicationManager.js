export class ApplicationManager {
    constructor(kernel) {
        this.kernel = kernel;
        this.applications = new Map();
    }

    register(application) {
        this.applications.set(application.id, application);
    }

    launch(appId) {
        const application = this.applications.get(appId);

        if (!application) {
            console.warn(`Application not found: ${appId}`);
            return;
        }

        this.kernel.windowManager.openApplication(application);
    }
}