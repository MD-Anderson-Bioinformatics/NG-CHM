(function () {
  "use strict";
  NgChm.markFile();

  // Define Namespace for Command Dialog.
  const CMDD = NgChm.createNS("NgChm.CMDD");

  const UTIL = NgChm.importNS("NgChm.UTIL");
  const EXEC = NgChm.importNS("NgChm.EXEC");
  const UHM = NgChm.importNS("NgChm.UHM");

  const cmdBoxKeys = [ "Enter", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight" ];
  function CommandDialog() {
    this.debug = UTIL.getDebugFlag("ui-cmd-mode");

    // Create the command dialog.
    this.msgBox = UHM.newMessageBox("command-dialog", "emptyMsgBoxTemplate");
    UHM.setNewMessageBoxHeader(this.msgBox, "NG-CHM Command Dialog");

    // Initialize command history.
    this.savedCmd = null;
    this.nextHistoryEntry = this.cmdBoxHistory.length;

    // Add command output box.
    const msgBody = this.msgBox.querySelector(".msgBoxBody");
    const outputHeading = UTIL.newElement("DIV");
    outputHeading.innerText = "Output:";
    msgBody.appendChild(outputHeading);
    const output = UTIL.newElement("P", { id: "ngchm-cmd-output" });
    msgBody.appendChild(output);

    // Add command input box.
    const inputHeading = UTIL.newElement("DIV");
    inputHeading.innerText = "Command:";
    msgBody.appendChild(inputHeading);
    this.cmdText = UTIL.newElement("TEXTAREA", { id: "ngchm-cmd-textarea", row: 20, col: 100 });
    this.cmdText.addEventListener("keydown", ev => this.keyEventHandler(ev));
    this.cmdText.addEventListener("keyup", ev => this.keyEventHandler(ev));
    msgBody.appendChild(this.cmdText);

    // Add the command dialog buttons.
    UHM.setNewMessageBoxButton(
      this.msgBox,
      "close",
      {
        type: "text",
        text: "Cancel",
        tooltip: "Closes this dialog without executing any command.",
        default: false
      },
      () => UHM.closeNewMessageBox(this.msgBox),
    );
    UHM.setNewMessageBoxButton(
      this.msgBox,
      "Execute",
      {
        type: "text",
        text: "Execute",
        tooltip: "Executes the command",
        disabled: false,
        disabledReason: "no map is loaded",
        default: true
      },
      () => this.runCommand()
    );
    UHM.displayNewMessageBox(this.msgBox);
    this.cmdText.focus();
  }
  {
    // Preserve command history over multiple instances of the CommandDialog.
    const cmdBoxHistory = [];
    Object.defineProperty(CommandDialog.prototype, 'cmdBoxHistory', {
      get() {
        return cmdBoxHistory;
      }
    });
  }
  CommandDialog.prototype.keyEventHandler = function keyEventHandler (ev) {
    if (ev.target.id == "ngchm-cmd-textarea" && cmdBoxKeys.includes(ev.key)) {
      if ([ "ArrowLeft", "ArrowRight" ].includes(ev.key)) {
        ev.stopPropagation();
        return;
      }
      if (ev.type == "keydown"
      ) {
        ev.preventDefault();
        ev.stopPropagation();
        return;
      }
      if (ev.type == "keyup" && cmdBoxKeys.includes(ev.key)) {
        if (ev.key === "Enter") {
          this.runCommand();
        } else if (ev.key == "ArrowUp") {
          this.prevHistory();
        } else if (ev.key == "ArrowDown") {
          this.nextHistory();
        }
        ev.preventDefault();
        ev.stopPropagation();
      }
    }
  };
  CommandDialog.prototype.prevHistory = function prevHistory () {
    if (this.nextHistoryEntry > 0) {
      if (this.nextHistoryEntry == this.cmdBoxHistory.length) {
        // If moving away from current entry, save it.
        this.savedCmd = this.cmdText.value;
      }
      this.cmdText.value = this.cmdBoxHistory[--this.nextHistoryEntry];
      this.cmdText.selectionStart = this.cmdText.selectionEnd = this.cmdText.value.length;
    }
  };
  CommandDialog.prototype.nextHistory = function prevHistory () {
    if (this.nextHistoryEntry < this.cmdBoxHistory.length) {
      this.nextHistoryEntry++;
      if (this.nextHistoryEntry == this.cmdBoxHistory.length) {
        this.cmdText.value = this.savedCmd;
      } else {
        this.cmdText.value = this.cmdBoxHistory[this.nextHistoryEntry];
      }
      this.cmdText.selectionStart = this.cmdText.selectionEnd = this.cmdText.value.length;
    }
  };

  CommandDialog.prototype.runCommand = function runCommand() {
    if (this.debug) console.log (`CommandDialog.runCommand: "${this.cmdText.value}"`);
    if (this.cmdText.value == "") {
      return;
    }
    // Add to history if different from previous.
    if (this.cmdBoxHistory.length == 0 || this.cmdBoxHistory[this.cmdBoxHistory.length-1] != this.cmdText.value) {
      this.cmdBoxHistory.push (this.cmdText.value);
    }
    this.nextHistoryEntry = this.cmdBoxHistory.length;

    EXEC.runCommand(this.cmdText.value, new Output);
    this.cmdText.value = "";
  };

  Object.setPrototypeOf(Output.prototype, UTIL.OutputClass.prototype);
  function Output() {
    UTIL.OutputClass.call (this);
    this.output = document.getElementById("ngchm-cmd-output");
    this.output.innerText = "";
  }
  Output.prototype.write = function (text) {
    const line = UTIL.newElement("SPAN");
    const spaces = /(^ *)/.exec(text)[0].length;
    if (this.__indent > 0 || spaces > 0) {
      line.style.paddingLeft = (this.__indent * 2 + spaces) * 0.5 + "em";
    }
    line.innerText = text || "";
    this.output.appendChild(line);
    return line;
  };
  Output.prototype.error = function (text) {
    const line = this.write(text);
    line.classList.add('ngchm-cmd-error');
  };

  // Export FUNCTION CMDD.openCommandDialog.
  CMDD.openCommandDialog = function () {
    return new CommandDialog;
  };

})();
