export class Clock {
    constructor() {
        this.timeElement = document.getElementById("clock-time");
        this.dateElement = document.getElementById("clock-date");
    }

    start() {
        this.update();

        setInterval(() => {
            this.update();
        }, 1000);
    }

    update() {
        const now = new Date();

        this.timeElement.textContent = now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        });

        this.dateElement.textContent = now.toLocaleDateString([], {
            weekday: "short",
            month: "short",
            day: "numeric"
        });
    }
}