import { TeachWindow } from "./window.js";

export class WindowFactory {
  create(appName, position, zIndex) {
    return new TeachWindow({
      appName,
      title: this.getTitle(appName),
      icon: this.getIcon(appName),
      position,
      zIndex
    });
  }

  getTitle(appName) {
    switch (appName) {
      case "terminal":
        return "Terminal Lab";
      case "filesystem":
        return "File System Lab";
      case "scheduler":
        return "Scheduler Lab";
      case "memory":
        return "Memory Lab";
      default:
        return appName;
    }
  }

  getIcon(appName) {
    switch (appName) {
      case "terminal":
        return "💻";
      case "filesystem":
        return "📁";
      case "scheduler":
        return "⚙️";
      case "memory":
        return "🧠";
      default:
        return "📦";
    }
  }

  createFromApplication(application, position, zIndex) {
    const teachWindow = new TeachWindow({
      appName: application.id,
      title: application.title,
      icon: application.icon,
      position,
      zIndex
    });

    teachWindow.setContent(application.render());

    return teachWindow;
  }
}