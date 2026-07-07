export class TerminalController {
    constructor(rootElement) {
        this.rootElement = rootElement;
        this.outputElement = rootElement.querySelector(".terminal__output");
        this.inputElement = rootElement.querySelector(".terminal__input");
    }

    initialize() {
        this.inputElement.focus();

        this.inputElement.addEventListener("keydown", event => {
            if (event.key !== "Enter") {
                return;
            }

            const command = this.inputElement.value.trim();

            this.runCommand(command);

            this.inputElement.value = "";
        });
    }

    runCommand(command) {
        if (!command) {
            return;
        }

        this.printCommand(command);

        switch (command) {
            case "help":
                this.print(`
          Available commands:<br>
          <span class="terminal__command">help</span> — Show commands<br>
          <span class="terminal__command">about</span> — About TeachOS<br>
          <span class="terminal__command">clear</span> — Clear terminal
        `);
                break;

            case "about":
                this.print("TeachOS is an interactive operating systems learning environment.");
                break;

            case "clear":
                this.outputElement.innerHTML = "";
                break;

            default:
                this.print(`Command not found: ${command}`);
        }
    }

    printCommand(command) {
        this.print(`<span class="terminal__prompt">teachos@student:~$</span> ${command}`);
    }

    print(html) {
        const line = document.createElement("p");
        line.innerHTML = html;
        this.outputElement.appendChild(line);
    }
}