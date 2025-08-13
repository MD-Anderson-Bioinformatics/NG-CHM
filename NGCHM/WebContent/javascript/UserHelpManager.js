/**********************************************************************************
 * USER HELP FUNCTIONS:  The following functions handle the processing
 * for user help popup windows for the detail canvas and the detail canvas buttons.
 **********************************************************************************/
(function () {
  "use strict";
  NgChm.markFile();

  //Define Namespace for NgChm UserHelpManager
  const UHM = NgChm.createNS("NgChm.UHM");

  const UTIL = NgChm.importNS("NgChm.UTIL");

  UHM.postMapDetails = false; // Should we post map details to an enclosing document?
  UHM.postMapToWhom = null; // Identity of the window to post map details to
  UHM.myNonce = "N"; // Shared secret for vetting message sender

  var popupTimeoutId = null; // Timeout for displaying a pending popup window.
  var popupTimeoutElement = null; // Element for which we are displaying the popup window.

  // Define action handlers for static UHM UI elements.
  //
  (function () {
    let uiElement;

    uiElement = document.getElementById("messageOpen_btn");
    uiElement.onclick = () => {
      UHM.displayStartupWarnings();
    };
  })();

  // Add a global event handler for processing mouseover and mouseout events.
  //
  // The handler adds the data-hovering property to an HTML element while the
  // mouse is hovering over the element and removes it when the mouse moves away.
  //
  // The handler will display and clear tooltips if the mouse hovers over an element long enough.
  // Add a tooltip to an HTML element by setting the data-tooltip property.
  (function () {
    document.addEventListener("mouseover", mouseover, { passive: true });
    document.addEventListener("mouseout", mouseout, { passive: true });
    document.addEventListener("click", click, { passive: true });

    function click(ev) {
      // Clear any (pending) tooltips if the user clicks on the element.
      UHM.hlpC();
      UHM.closeMenu();

      const closeables = document.getElementsByClassName("remove-on-click");
      [...closeables].forEach((element) => {
        element.remove();
      });
    }

    function mouseout(ev) {
      const tt = findMajorNode(ev.target);
      delete tt.dataset.hovering;
    }

    function mouseover(ev) {
      const tt = findMajorNode(ev.target);
      tt.dataset.hovering = "";
      if (tt.dataset.tooltip) {
        let text = tt.dataset.tooltip;
        if (tt.disabled && tt.dataset.disabledReason) {
          text += " " + tt.dataset.disabledReason;
        }
        UHM.hlp(tt, text, 140, 0);
      }
    }

    function findMajorNode(el) {
      let node = el;
      while (node) {
        if (
          node.tagName.toLowerCase() == "button" ||
          node.dataset.hasOwnProperty("tooltip") ||
          node.dataset.hasOwnProperty("title")
        ) {
          return node;
        }
        node = node.parentElement;
      }
      return el;
    }
  })();

  // This function is called when the NgChm receives a message.  It is intended for
  // customizing behavior when the NgChm is included in an iFrame.
  //
  // If the message includes override: 'ShowMapDetail' we will post map details to the
  // enclosing window instead of displaying them within the NGCHM.
  //
  UHM.processMessage = function (e) {
    //console.log ('Got message');
    //console.log (e);

    // We should only process messages from the enclosing origin.

    // I tried using document.location.ancestorOrigins.
    // At least chrome knows about this, but at least firefox doesn't.
    // if (!document.location.ancestorOrigins || document.location.ancestorOrigins.length < 1 ||
    //     document.location.ancestorOrigins[0] != e.origin) {
    //     console.log ("Who's that?");
    //     return;
    // }
    // We could perhaps use document.referrer instead, but we would have to parse it.

    // Instead, we require that the enclosing document passes a secret nonce in our URL.
    // We only accept any messages that contain this secret.
    if (UHM.myNonce === "") UHM.myNonce = UTIL.getURLParameter("nonce");
    if (UHM.myNonce === "" || !e.data || e.data.nonce !== UHM.myNonce) {
      //console.log ("What's that?");
      return;
    }

    if (e.data.override === "ShowMapDetail") {
      // Parent wants to display map details itself.
      UHM.postMapDetails = true;
      UHM.postMapToWhom = e.origin;
    }

    //If caller provided a unique ID to be returned with data point messages, save it.
    if (e.data.ngchm_id != null) {
      UHM.postID = e.data.ngchm_id;
    }
  };
  window.addEventListener("message", UHM.processMessage, false);

  /* Format the pixel information for display in the helpContents table.
   */
  UHM.formatMapDetails = function (helpContents, pixelInfo) {
    helpContents.insertRow().innerHTML = UHM.formatBlankRow();
    UHM.setTableRow(
      helpContents,
      ["<u>" + "Data Details" + "</u>", "&nbsp;"],
      2,
    );
    UHM.setTableRow(helpContents, ["&nbsp;Value:", pixelInfo.value]);
    UHM.setTableRow(helpContents, ["&nbsp;Row:", pixelInfo.rowLabel]);
    UHM.setTableRow(helpContents, ["&nbsp;Column:", pixelInfo.colLabel]);
    if (pixelInfo.rowCovariates.length > 0) {
      helpContents.insertRow().innerHTML = UHM.formatBlankRow();
      UHM.setTableRow(
        helpContents,
        ["&nbsp;<u>" + "Row Covariates" + "</u>", "&nbsp;"],
        2,
      );
      pixelInfo.rowCovariates.forEach((cv) => {
        const displayName =
          cv.name.length > 20 ? cv.name.substring(0, 20) + "..." : cv.name;
        UHM.setTableRow(helpContents, [
          "&nbsp;&nbsp;&nbsp;" + displayName + ":" + "</u>",
          cv.value,
        ]);
      });
    }
    if (pixelInfo.colCovariates.length > 0) {
      helpContents.insertRow().innerHTML = UHM.formatBlankRow();
      UHM.setTableRow(
        helpContents,
        ["&nbsp;<u>" + "Column Covariates" + "</u>", "&nbsp;"],
        2,
      );
      pixelInfo.colCovariates.forEach((cv) => {
        const displayName =
          cv.name.length > 20 ? cv.name.substring(0, 20) + "..." : cv.name;
        UHM.setTableRow(helpContents, [
          "&nbsp;&nbsp;&nbsp;" + displayName + ":" + "</u>",
          cv.value,
        ]);
      });
    }
  };

  /**********************************************************************************
   * FUNCTION - pasteHelpContents: This function opens a browser window and pastes
   * the contents of the user help panel into the window.
   **********************************************************************************/
  UHM.pasteHelpContents = pasteHelpContents;
  function pasteHelpContents() {
    var el = document.getElementById("helpTable");
    window
      .open("", "", "width=500,height=330,resizable=1")
      .document.write(el.innerText.replace(/(\r\n|\n|\r)/gm, "<br>"));
  }

  /**********************************************************************************
   * FUNCTION - hlp: The purpose of this function is to generate a
   * pop-up help panel (tooltip) for the specified user interface element.
   * The popup title, if any, will be obtained from the element's title dataset property.
   * The popup text will be obtained from the element's intro dataset property,
   * if it exists, or from the text parameter.
   * Normally the tooltip is displayed just below the top-left corner of the element.
   * If reverse is specified, the tooltip will be positioned width pixels to the
   * left of the default position.
   * The tooltip will appear delay milliseconds after this function is called unless
   * the user does something to clear the pending popup (e.g. move the mouse, press a key).
   **********************************************************************************/
  UHM.hlp = function (element, text, width, reverse, delay = 500) {
    if (element == popupTimeoutElement) {
      return;
    }
    UHM.hlpC();
    popupTimeoutElement = element;
    popupTimeoutId = setTimeout(function () {
      const bodyElem = document.querySelector("body");
      if (!bodyElem) return;

      if (element.dataset.hovering != "") {
        // Don't show popup unless user is still hovering.
        return;
      }
      const elemPos = UHM.getElemPosition(element);
      const title = UTIL.newElement("span.title", {}, [
        UTIL.newTxt(element.dataset.title || ""),
      ]);
      const content = UTIL.newElement("span.intro", {}, [
        element.dataset.intro || text,
      ]);
      const helptext = UTIL.newElement("div#bubbleHelp", {}, [title, content]);
      if (reverse !== undefined) {
        let popupPosn = elemPos.left - width;
        if (popupPosn < 0) popupPosn = 0;
        helptext.style.left = popupPosn + "px";
      } else {
        helptext.style.left = elemPos.left + "px";
      }
      helptext.style.top = elemPos.top + 40 + "px";
      helptext.innerHTML =
        "<b><font size='2' color='#0843c1'>" + text + "</font></b>";
      helptext.style.display = "inherit";
      bodyElem.appendChild(helptext);
      popupTimeoutId = null;
      setTimeout(() => {
        if (popupTimeoutElement == element) {
          popupTimeoutElement = null;
          UHM.hlpC();
        }
      }, 5000);
    }, delay);
  };

  /**********************************************************************************
   * FUNCTION - getElemPosition: This function finds the help element selected's
   * position on the screen and passes it back to the help function for display.
   * The position returned is the position on the entire screen (not the panel that
   * the control is embedded in).  In this way, the help text bubble may be placed
   * on the document body.
   **********************************************************************************/
  UHM.getElemPosition = function (el) {
    var _x = 0;
    var _y = 0;
    while (el && !isNaN(el.offsetLeft) && !isNaN(el.offsetTop)) {
      _x += el.offsetLeft - el.scrollLeft;
      _y += el.offsetTop - el.scrollTop;
      el = el.offsetParent;
    }
    return { top: _y, left: _x };
  };

  /**********************************************************************************
   * FUNCTION - hlpC: This function clears any bubble help box displayed on the screen.
   **********************************************************************************/
  UHM.hlpC = function () {
    if (popupTimeoutId !== null) {
      clearTimeout(popupTimeoutId);
      popupTimeoutId = null;
      popupTimeoutElement = null;
    }
    let helptext = document.getElementById("bubbleHelp");
    if (helptext === null) {
      helptext = document.getElementById("helptext");
    }
    if (helptext) {
      helptext.remove();
    }
  };

  /**********************************************************************************
   * FUNCTION - setTableRow: The purpose of this function is to set a row into a help
   * or configuration html TABLE item for a given help pop-up panel. It receives text for
   * the header column, detail column, and the number of columns to span as inputs.
   **********************************************************************************/
  UHM.setTableRow = function (tableObj, tdArray, colSpan, align) {
    const tr = tableObj.insertRow();
    tr.className = "chmTblRow";
    for (var i = 0; i < tdArray.length; i++) {
      var td = tr.insertCell(i);
      if (typeof colSpan != "undefined") {
        td.colSpan = colSpan;
      }
      if (i === 0) {
        td.style.fontWeight = "bold";
      }
      if (
        ["string", "number"].includes(typeof tdArray[i]) ||
        Array.isArray(tdArray[i])
      ) {
        td.innerHTML = tdArray[i];
      } else if (tdArray[i]) {
        td.appendChild(tdArray[i]);
      }
      if (typeof align != "undefined") {
        td.align = align;
      }
    }
    return tr;
  };

  /**********************************************************************************
   * FUNCTION - setTableRowX: eXperimental/eXtended version of setTableRow.
   * or configuration html TABLE item for a given help pop-up panel. It receives text for
   * the header column, detail column, and the number of columns to span as inputs.
   **********************************************************************************/
  UHM.setTableRowX = function (tableObj, tdArray, rowClasses, tdProps) {
    rowClasses = rowClasses || [];
    tdProps = tdProps || Array(tdArray.length);

    const tr = tableObj.insertRow();
    tr.classList.add("chmTblRow");
    rowClasses.forEach((rowClass) => {
      tr.classList.add(rowClass);
    });
    if (tr.classList.length == 1) {
      tr.classList.add("entry");
    }

    for (let i = 0; i < tdArray.length; i++) {
      const td = tr.insertCell(i);

      for (let [key, value] of Object.entries(tdProps[i] || {})) {
        if (typeof value != "object") {
          td[key] = value;
        } else if (key == "style") {
          for (let [k2, v2] of Object.entries(value)) {
            td.style[k2] = v2;
          }
        } else if (key == "classList") {
          value.forEach((className) => td.classList.add(className));
        } else if (key == "dataset") {
          for (let [k2, v2] of Object.entries(value)) {
            td.dataset[k2] = v2;
          }
        } else {
          console.error("Unknown object in tdProps: " + key);
        }
      }
      if (td.classList.length == 0) {
        td.classList.add(i == 0 ? "label" : "value");
      }
      if (
        ["string", "number"].includes(typeof tdArray[i]) ||
        Array.isArray(tdArray[i])
      ) {
        td.innerHTML = tdArray[i];
      } else if (tdArray[i]) {
        td.appendChild(tdArray[i]);
      }
    }
  };

  /**********************************************************************************
   * FUNCTION - formatBlankRow: The purpose of this function is to return the html
   * text for a blank row.
   **********************************************************************************/
  UHM.formatBlankRow = function () {
    return "<td style='line-height:4px;' colspan=2>&nbsp;</td>";
  };

  /**********************************************************************************
   * FUNCTION - addBlankRow: The purpose of this function is to return the html
   * text for a blank row.
   **********************************************************************************/
  UHM.addBlankRow = function (addDiv, rowCnt) {
    addDiv.insertRow().innerHTML = UHM.formatBlankRow();
    if (typeof rowCnt !== "undefined") {
      for (var i = 1; i < rowCnt; i++) {
        addDiv.insertRow().innerHTML = UHM.formatBlankRow();
      }
    }
    return;
  };

  /**********************************************************************************
   * FUNCTION - hamburgerLinkMissing: This function handles all of the tasks
   * necessary display a modal window whenever a user's clicks on a hamburger menu
   * link that has not had it's callback destination defined.
   **********************************************************************************/
  UHM.hamburgerLinkMissing = function () {
    UHM.initMessageBox();
    UHM.setMessageBoxHeader("NG-CHM Menu Link Error");
    UHM.setMessageBoxText(
      "<br>No destination has been defined for the menu link.",
    );
    UHM.setMessageBoxButton(
      "cancel",
      { type: "text", text: "Cancel" },
      "Cancel button",
      UHM.messageBoxCancel,
    );
    UHM.displayMessageBox();
  };

  /**********************************************************************************
   * FUNCTION - systemMessage: This function handles all of the tasks necessary
   * display a modal window whenever a given notification condition occurs.
   **********************************************************************************/
  UHM.systemMessage = function (header, message) {
    UHM.initMessageBox();
    UHM.setMessageBoxHeader(header);
    UHM.setMessageBoxText("<br>" + message);
    UHM.setMessageBoxButton(
      "cancel",
      { type: "text", text: "Cancel" },
      "Cancel button",
      UHM.messageBoxCancel,
    );
    UHM.displayMessageBox();
  };

  /**********************************************************************************
   * FUNCTION - noWebGlContext: This function displays an error when no WebGl context
   * is available on the user's machine.
   **********************************************************************************/
  UHM.noWebGlContext = function (isDisabled) {
    UHM.initMessageBox();
    UHM.setMessageBoxHeader("ERROR: WebGL Initialization Failed");
    if (isDisabled) {
      UHM.setMessageBoxText(
        "<br>WebGL is available but is not enabled on your machine.  The NG-CHM Application requires the WebGL Javascript API in order to render images of Next Generation Clustered Heat Maps.<br><br>Instructions for enabling WebGL, based on browser type, can be found via a web search.",
      );
    } else {
      UHM.setMessageBoxText(
        "<br>No WebGL context is available.  The NG-CHM Application requires the WebGL Javascript API in order to render images of Next Generation Clustered Heat Maps. Most web browsers and graphics processors support WebGL.<br><br>Please ensure that the browser that you are using and your computer's processor are WebGL compatible.",
      );
    }
    UHM.setMessageBoxButton(
      "cancel",
      { type: "text", text: "Cancel" },
      "Cancel button",
      UHM.messageBoxCancel,
    );
    UHM.displayMessageBox();
  };

  /**********************************************************************************
   * FUNCTION - mapNotFound: This function displays an error when a server NG-CHM
   * cannot be accessed.
   **********************************************************************************/
  UHM.mapNotFound = function (heatMapName) {
    UTIL.hideLoader(false);
    UHM.initMessageBox();
    UHM.setMessageBoxHeader("Requested Heat Map Not Found");
    UHM.setMessageBoxText(
      "<br>The Heat Map (" +
        heatMapName +
        ") that you requested cannot be found OR connectivity to the Heat Map repository has been interrupted.<br><br>Please check the Heat Map name and try again.",
    );
    UHM.setMessageBoxButton(
      "cancel",
      { type: "text", text: "Cancel" },
      "Cancel button",
      UHM.messageBoxCancel,
    );
    UHM.displayMessageBox();
  };

  /**********************************************************************************
   * FUNCTION - mapLoadError: This function displays an error when a .ngchm file
   * cannot be loaded.
   **********************************************************************************/
  UHM.mapLoadError = function (heatMapName, details) {
    UTIL.hideLoader(false);
    UHM.initMessageBox();
    UHM.setMessageBoxHeader("Requested Heat Map Not Loaded");
    UHM.setMessageBoxText(
      "<br>The Heat Map (" +
        heatMapName +
        ") that you selected cannot be loaded.<br><br>Reason: " +
        details,
    );
    UHM.setMessageBoxButton(
      "cancel",
      { type: "text", text: "Cancel" },
      "Cancel button",
      UHM.messageBoxCancel,
    );
    UHM.displayMessageBox();
  };

  /**********************************************************************************
   * FUNCTION - linkoutError: This function displays a linkout error message.
   **********************************************************************************/
  UHM.linkoutError = function (msgText) {
    UHM.initMessageBox();
    UHM.setMessageBoxHeader("Heat Map Linkout");
    UHM.setMessageBoxText(msgText);
    UHM.setMessageBoxButton(
      "cancel",
      { type: "text", text: "Cancel" },
      "Cancel button",
      UHM.messageBoxCancel,
    );
    UHM.displayMessageBox();
  };

  /**********************************************************************************
   * FUNCTION - invalidFileFormat: This function displays an error when the user selects
   * a file that is not an NG-CHM file.
   **********************************************************************************/
  UHM.invalidFileFormat = function () {
    UHM.initMessageBox();
    UHM.setMessageBoxHeader("Invalid File Format");
    UHM.setMessageBoxText(
      "<br>The file chosen is not an NG-CHM file.<br><br>Please select a .ngchm file and try again.",
    );
    UHM.setMessageBoxButton(
      "cancel",
      { type: "text", text: "Cancel" },
      "Cancel button",
      UHM.messageBoxCancel,
    );
    UHM.displayMessageBox();
  };

  /**********************************************************************************
   * FUNCTIONS - MESSAGE BOX FUNCTIONS
   *
   * We use a generic message box for most of the modal request windows in the
   * application.  The following functions support this message box:
   * 1. initMessageBox - Initializes and hides the message box panel
   * 2. setMessageBoxHeader - Places text in the message box header bar.
   * 3. setMessageBoxText - Places text in the message box body.
   * 4. setMessageBoxButton - Configures and places a button on the message box.
   * 5. messageBoxCancel - Closes the message box when a Cancel is requested.
   **********************************************************************************/
  UHM.initMessageBox = function () {
    UHM.hideMsgBoxProgressBar();
    const msgBox = document.getElementById("msgBox");
    while (msgBox.classList.length > 0) {
      msgBox.classList.remove(msgBox.classList[0]);
    }
    msgBox.style.display = "none";
    msgBox.style.width = "";
    const msgBoxButtons = msgBox.querySelector(".msgBoxButtons");
    while (msgBoxButtons.firstChild) {
      msgBoxButtons.removeChild(msgBoxButtons.firstChild);
    }
    document.getElementById("messageOpen_btn").style.display = "none";
    return msgBox;
  };

  UHM.messageBoxIsVisible = function () {
    const messageBox = document.getElementById("msgBox");
    return messageBox && messageBox.style.display != "none";
  };

  UHM.setMessageBoxHeader = function (headerText) {
    var msgBoxHdr = document.getElementById("msgBoxHdr");
    msgBoxHdr.innerHTML = "<SPAN>" + headerText + "</SPAN>";
    if (msgBoxHdr.querySelector(".closeX")) {
      msgBoxHdr.querySelector(".closeX").remove();
    }
    msgBoxHdr.appendChild(UHM.createCloseX(UHM.messageBoxCancel));
  };

  UHM.getMessageTextBox = function () {
    return document.getElementById("msgBoxTxt");
  };

  UHM.setMessageBoxText = function (text) {
    var msgBoxTxt = document.getElementById("msgBoxTxt");
    msgBoxTxt.innerHTML = text;
  };

  UHM.displayMessageBox = function () {
    let msgBox = document.getElementById("msgBox");
    msgBox.style.display = "";
    msgBox.style.left = (window.innerWidth - msgBox.offsetWidth) / 2 + "px"; // center horizontally
    let headerpanel = document.getElementById("mdaServiceHeader");
    msgBox.style.top = headerpanel.offsetTop + 15 + "px";
  };

  /* Add a button to the message box.
   *
   * buttonId is an id specific to this button within the message box.
   * Note: on initialization/finalization all buttons are removed from
   * the message box.
   *
   * buttonSpec describes the button to insert.
   * Deprecated usage: a string that identifies the image source of the button.
   * New usage: an object that describes the button.  Fields are:
   * - type: 'image' or 'text'
   * - src: if type == 'image' source of the button image
   * - alt: if type == 'image' alt attribute of the button image
   * - text: if type == 'text' content of the button
   * - tooltip: adds value of this property as a tooltip for the button
   * - disableOnClick: if true disables the button element when clicked.
   * - disabled: disables the button element immediately
   * - disabledReason: if disabled, include this message in tool tip.
   * - default: if true class default added to the button element.
   *
   * altText (deprecated): added to 'alt' attribute of img buttons.  Superseded by alt field.
   *
   * onClick: function called when the user clicks on the button.  Defaults
   * to UHM.messageBoxCancel.
   */
  UHM.setMessageBoxButton = function (buttonId, buttonSpec, altText, onClick) {
    const msgBox = document.getElementById("msgBox");
    addMsgBoxButton(msgBox, buttonId, buttonSpec, altText, onClick);
  };

  function addMsgBoxButton(msgBox, buttonId, buttonSpec, altText, onClick) {
    if (typeof altText == "function") {
      onClick = altText;
      altText = "missing - deprecated";
    }
    const msgBoxButtons = msgBox.querySelector(".msgBoxButtons");
    const newButton = document.createElement("button");
    newButton.id = "msgBoxBtn_" + buttonId;
    if (typeof buttonSpec != "object") {
      buttonSpec = {
        type: "image",
        src: buttonSpec,
      };
    }
    if (buttonSpec.type == "image") {
      const newImage = document.createElement("img");
      newImage.src = buttonSpec.src;
      newImage.alt = buttonSpec.alt || altText;
      newButton.appendChild(newImage);
    } else {
      const newText = UTIL.newElement("span.button");
      newText.innerText = buttonSpec.text;
      const newWrapper = UTIL.newElement("span.spanbuttonwrapper");
      newWrapper.appendChild(newText);
      newButton.appendChild(newWrapper);
    }
    if (buttonSpec.default) {
      newButton.classList.add("default");
    }
    if (buttonSpec.disabled) {
      newButton.disabled = true;
      const reason = buttonSpec.disabledReason || "of unspecified reason";
      const tooltip = buttonSpec.tooltip ? buttonSpec.tooltip + ". " : "";
      newButton.dataset.tooltip = tooltip + "Disabled because " + reason;
    } else if (buttonSpec.tooltip) {
      newButton.dataset.tooltip = buttonSpec.tooltip + ".";
    }
    if (onClick == undefined) {
      newButton.onclick = () => {
        if (msgBox == document.getElementById("msgBox")) {
          // Close original message box.
          UHM.messageBoxCancel();
        } else {
          // Remove a new message box.
          document.body.removeChild(msgBox);
        }
      };
    } else {
      newButton.onclick = function (ev) {
        if (buttonSpec.disableOnClick) {
          newButton.disabled = true;
        }
        onClick(newButton);
      };
    }
    msgBoxButtons.appendChild(newButton);
  }

  // Show the progress bar in the messageBox.
  // Usually called by a long-running button event
  // handler.
  //
  UHM.showMsgBoxProgressBar = showMsgBoxProgressBar;
  function showMsgBoxProgressBar() {
    document.getElementById("msgBoxProgressDiv").style.display = "";
    document.getElementById("msgBoxProgressBar").value = 0;
  }

  // Hide the message box progress bar.
  // Normally unnecessary to call explicitly.
  // Will be called automatically when the message
  // box is cancelled.
  UHM.hideMsgBoxProgressBar = hideMsgBoxProgressBar;
  function hideMsgBoxProgressBar() {
    document.getElementById("msgBoxProgressDiv").style.display = "none";
  }

  UHM.isProgressBarVisible = function isProgressBarVisible() {
    return document.getElementById("msgBoxProgressDiv").style.display == "";
  };

  // Set the value of the message box progress bar.
  // Assumes that the progress bar is displayed.
  // Value must be a number between 0 (not started) and 1 (finished).
  //
  UHM.msgBoxProgressMeter = msgBoxProgressMeter;
  function msgBoxProgressMeter(value) {
    document.getElementById("msgBoxProgressBar").value = value;
    return (
      document.getElementById("msgBoxProgressBar").dataset.cancelled != "true"
    );
  }

  UHM.cancelOperation = function cancelOperation() {
    document.getElementById("msgBoxProgressBar").dataset.cancelled = "true";
    document.getElementById("msgBoxProgressDiv").style.opacity = 0.5;
  };

  UHM.messageBoxCancel = function () {
    UHM.initMessageBox();
  };

  // ******************************
  //
  // Support for 'new' message boxes.  These message boxes are created dynamically and can
  // co-exist alongside other message boxes with different 'names'.
  //
  // New message boxes do not currently support all the features of the original
  // message box, notably progress bars.

  // Create a new message box.
  UHM.newMessageBox = function (name, templateId) {
    const id = "msgBox-for-" + name;
    const existing = document.getElementById(id);
    if (existing) {
      return existing;
    }

    const msgBox = document
      .querySelector("template#" + (templateId || "msgBoxTemplate"))
      .content.querySelector("div")
      .cloneNode(true);
    msgBox.classList.add("hide");
    msgBox.id = id;
    document.body.appendChild(msgBox);
    UTIL.dragElement(msgBox);
    return msgBox;
  };

  // Set the header text of a new message box.
  UHM.setNewMessageBoxHeader = function (msgBox, headerText) {
    const msgBoxHdr = msgBox.querySelector(".msgBoxHdr");
    msgBoxHdr.innerHTML = "<SPAN>" + headerText + "</SPAN>";
    if (msgBoxHdr.querySelector(".closeX")) {
      msgBoxHdr.querySelector(".closeX").remove();
    }
    msgBoxHdr.appendChild(
      UHM.createCloseX(() => {
        UHM.closeNewMessageBox(msgBox);
      }),
    );
  };

  // Get the text box of a new message box.
  UHM.getNewMessageTextBox = function (msgBox) {
    return msgBox.querySelector(".msgBoxTxt");
  };

  // Add a button to a new message box.
  // See setMessageBoxButton for details.
  UHM.setNewMessageBoxButton = function (
    msgBox,
    buttonId,
    buttonSpec,
    onClick,
  ) {
    if (!onClick) {
      onClick = () => {
        UHM.closeNewMessageBox(msgBox);
      };
    }
    addMsgBoxButton(msgBox, buttonId, buttonSpec, onClick);
  };

  // Display a new message box.
  //
  UHM.displayNewMessageBox = function (msgBox) {
    msgBox.classList.remove("hide");
  };

  // Close a new message box.
  //
  UHM.closeNewMessageBox = function (msgBox) {
    document.body.removeChild(msgBox);
  };

  //
  // End support for 'new' message boxes.
  //
  // ******************************

  UHM.closeMenu = function () {
    const barMenuBtn = document.getElementById("barMenu_btn");
    if (barMenuBtn !== null) {
      if (!barMenuBtn.dataset.hasOwnProperty("hovering")) {
        const menu = document.getElementById("burgerMenuPanel");
        menu.style.display = "none";
      }
    }
  };

  /**********************************************************************************
   * FUNCTION - displayStartupWarnings: The purpose of this function is to display any
   * heat map startup warnings in a popup box when the user opens a heat map.  Multiple
   * possible warnings may be displayed in the box.
   **********************************************************************************/
  UHM.displayStartupWarnings = function () {
    UHM.hlpC();
    UHM.initMessageBox();
    var headingText = "NG-CHM Startup Warning";
    var warningText = "";
    var msgFound = false;
    var warningsFound = 1;
    if (UTIL.getBrowserType() === "IE") {
      warningText =
        "<br><b>Unsupported Browser Warning:</b> Your current browser is Internet Explorer. The NG-CHM application is optimized for use with the Google Chrome and Mozilla Firefox browsers.  While you may view maps in IE, the performance of the application cannot be guaranteed.<br><br>You may wish to switch to one of these supported browsers.";
      msgFound = true;
    } else {
      if (UTIL.minLabelSize > 11) {
        if (msgFound) {
          warningText = warningText + "<br>";
        }
        warningText =
          warningText +
          "<br><b>Minimum Font Warning:</b> Current browser settings include a minimum font size setting that is too large. This will block the display of row, column, and covariate bar labels in the NG-CHM application. You may wish to turn off or adjust this setting in your browser.";
        msgFound = true;
        warningsFound++;
      }
      if (UTIL.minLabelSize > 5) {
        if (msgFound) {
          warningText = warningText + "<br>";
        }
        warningText =
          warningText +
          "<br><b>Minimum Font Warning:</b> Current browser settings include a minimum font size setting. This may interfere with the display of row, column, and covariate bar labels in the NG-CHM application. You may wish to turn off or adjust this setting in your browser.";
        msgFound = true;
        warningsFound++;
      }
    }
    if (warningsFound > 2) {
      headingText = headingText + "s";
    }
    UHM.setMessageBoxHeader(headingText);
    UHM.setMessageBoxText(warningText);
    UHM.setMessageBoxButton(
      "cancel",
      { type: "text", text: "Cancel" },
      "Cancel button",
      UHM.messageBoxCancel,
    );
    UHM.displayMessageBox();
  };

  /*
  Returns a span with 'X' that can be used to close a dialog.
*/
  UHM.createCloseX = function (closeFunction) {
    const closeX = UTIL.newSvgButton("icon-big-x.red");
    closeX.onclick = closeFunction;
    const buttonBox = UTIL.newElement("SPAN.closeX", {}, [closeX]);
    return buttonBox;
  };
})();
