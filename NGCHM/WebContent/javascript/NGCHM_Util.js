(function () {
  "use strict";
  NgChm.markFile();

  /**
   * General purpose javascript helper funcitons
   */

  //Define Namespace for NgChm UTIL
  const UTIL = NgChm.createNS("NgChm.UTIL");
  const CFG = NgChm.importNS("NgChm.CFG");

  //Get a value for a parm passed in the URL.
  UTIL.getURLParameter = function (name) {
    return (
      decodeURIComponent(
        (new RegExp("[?|&]" + name + "=" + "([^&;]+?)(&|#|;|$)").exec(
          location.search,
        ) || [, ""])[1].replace(/\+/g, "%20"),
      ) || ""
    );
  };

  UTIL.mapId = UTIL.getURLParameter("map");
  UTIL.mapNameRef = UTIL.getURLParameter("name");

  UTIL.getDebugFlag = function getDebugFlag (what) {
    return UTIL.getURLParameter("debug").split(",").includes(what);
  };

  UTIL.getFeatureFlag = function getFeatureFlag (what) {
    return UTIL.getURLParameter("feature").split(",").includes(what);
  };

  UTIL.capitalize = function capitalize(str) {
    return str.substr(0, 1).toUpperCase() + str.substr(1);
  };

  // UTIL.passiveCompat is a function that accepts an options
  // object for addEventListener and depending on the browser's
  // support for the passive flag returns either:
  // the unmodified object (if the browser supports passive), or
  // the truthiness of object.capture for backwards compatibility.
  (function () {
    UTIL.passiveCompat = supportsPassive() ? (f) => f : (f) => !!f.capture;
    // Determine if the browser supports the passive flag.
    function supportsPassive() {
      var cold = false;
      const hike = function () {};

      try {
        var aid = Object.defineProperty({}, "passive", {
          get() {
            cold = true;
          },
        });
        window.addEventListener("test", hike, aid);
        window.removeEventListener("test", hike, aid);
      } catch (e) {}

      return cold;
    }
  })();

  {
    const keyMap = new Map();

    UTIL.setKeyData = function (key, data) {
      keyMap.set(key, data);
    };

    UTIL.getKeyData = function (key) {
      return keyMap.get(key);
    };
  }

  // Set initial value for web builder URL.
  UTIL.setKeyData("web-builder-url", CFG.builder_url);

  // Load the dynamic script file.
  UTIL.addScript = function (src, callback) {
    const head = document.getElementsByTagName("head")[0];
    const script = UTIL.newElement("script", { type: "text/javascript", src });
    head.appendChild(script);
    // Most browsers:   NOTE: The next 2 lines of code are replaced when building ngchmApp.html and ngchmWidget-min.js (the "file mode" and "widget" versions of the application)
    script.onload = callback;
    // Internet explorer:
    script.onreadystatechange = function () {
      if (this.readyState == "complete") {
        callback();
      }
    }; //Leave this as one line for filemode version app builder
  };

  UTIL.addScripts = function (srcs, callback) {
    UTIL.addScript(srcs[0], () => {
      if (srcs.length === 1) {
        callback();
      } else {
        UTIL.addScripts(srcs.slice(1), callback);
      }
    });
  };

  // Set the position and size of the DOM element el to the size in vp.
  // If el is a canvas and styleOnly is not truthy, set the canvas
  // width and height properties to the same width and height as el.
  UTIL.setElementPositionSize = function (el, vp, styleOnly) {
    if (!el || !el.style) {
      console.error("setElementPositionSize on non-element", el);
      let foo = 1;
    }
    if (vp.left) el.style.left = vp.left + "px";
    if (vp.top) el.style.top = vp.top + "px";
    el.style.width = vp.width + "px";
    el.style.height = vp.height + "px";
    if (!styleOnly && el.tagName === "CANVAS") {
      el.width = Math.round(vp.width);
      el.height = Math.round(vp.height);
    }
  };

  // Create a new text node.
  UTIL.newTxt = function newTxt(txt) {
    return document.createTextNode(txt);
  };

  // Create a new SVG icon button element.
  //
  // iconIds is one or more SVG symbol ids (separated by !) from icons.svg.
  // By default, all SVG elements are always visible.  The client is
  // responsible for the CSS required to show the SVGs selectively.
  //
  // The svgIds can be followed by an optional #id and .classes.
  // The attrs object defines additional attributes to be set on
  // the newSvgButton.  Note that all such decorations apply to
  // the button element, not to the SVG(s) contained therein.
  //
  UTIL.newSvgButton = newSvgButton;
  function newSvgButton(iconIds, attrs, fn) {
    const classes = iconIds.split(".");
    const names = classes.shift().split("#");
    const svgs = names[0].split("!");
    const button = UTIL.newElement("BUTTON");
    button.innerHTML = svgs
      .map(
        (svg) =>
          '<SVG width="1em" height="1em"><USE href="icons.svg#' +
          svg +
          '"/></SVG>',
      )
      .join("");
    return decorateElement(button, names, classes, attrs, [], fn);
  }

  UTIL.newSvgMenuItem = newSvgMenuItem;
  function newSvgMenuItem(iconIds, attrs, fn) {
    const classes = iconIds.split(".");
    const names = classes.shift().split("#");
    const svgs = names[0].split("!");
    const menuItem = UTIL.newElement("DIV.menuSvg");
    menuItem.innerHTML = svgs
      .map(
        (svg) =>
          '<SVG width="1em" height="1em"><USE href="icons.svg#' +
          svg +
          '"/></SVG>',
      )
      .join("");
    return decorateElement(menuItem, names, classes, attrs, [], fn);
  }

  // Create a new DOM element.
  //
  // Spec consists of an element tag name,
  //     optionally followed by a single '#' and node id,
  //     followed by any number of '.' and class id.
  // E.g. div#id.class1.class2
  //
  // Attrs is a dictionary of attributes to add to the new node.  If attrs contains
  // either style and/or dataset, the contents of those objects are added
  // individually to the corresponding objects on the DOM element.
  //
  // Content, if defined, is either a DOM node or an array of DOM nodes to
  // include as children of the new DOM element.
  //
  // Fn, if defined, is a function that is called with the new node as a
  // parameter after it's constructed but before it's returned.  It must
  // return a DOM element.
  //
  UTIL.newElement = function newElement(spec, attrs, content, fn) {
    const classes = spec.split(".");
    const names = classes.shift().split("#");
    const el = document.createElement(names[0]);

    return decorateElement(el, names, classes, attrs, content, fn);
  };

  function decorateElement(el, names, classes, attrs, content, fn) {
    content = content || [];
    if (!Array.isArray(content)) content = [content];
    if (names.length > 2) {
      console.log({
        m: "UTIL.decorateElement: too many ids",
        spec,
        attrs,
        names,
      });
      throw new Error("UTIL.decorateElement: too many ids");
    }
    if (names.length > 1) {
      el.setAttribute("id", names[1]);
    }
    while (classes.length > 0) {
      el.classList.add(classes.shift());
    }
    if (attrs) {
      Object.entries(attrs).forEach(([key, value]) => {
        if (key === "style") {
          Object.entries(value).forEach(([key, value]) => {
            el.style[key] = value;
          });
        } else if (key === "dataset") {
          Object.entries(value).forEach(([key, value]) => {
            el.dataset[key] = value;
          });
        } else {
          el.setAttribute(key, value);
        }
      });
    }
    while (content.length > 0) {
      let c = content.shift();
      if (typeof c == "string") {
        let tmp = document.createElement("div");
        tmp.innerHTML = c;
        while (tmp.firstChild) el.appendChild(tmp.firstChild);
      } else {
        el.appendChild(c);
      }
    }
    if (fn) {
      const x = fn(el);
      if (x instanceof HTMLElement) {
        return x;
      } else {
        console.error(
          new Error(
            "UTIL.decorateElement decorator function did not return a DOM node",
          ),
        );
      }
    }
    return el;
  }

  // Create a DOM fragment from an array of DOM nodes.
  UTIL.newFragment = function newFragement(nodes) {
    const frag = document.createDocumentFragment();
    nodes.forEach((node) => {
      frag.appendChild(node);
    });
    return frag;
  };

  // Create a new button element.
  UTIL.newButton = function newButton(buttonName, properties, handlers) {
    const button = UTIL.newElement("SPAN.button", {}, [
      UTIL.newTxt(buttonName),
    ]);
    for (const h of Object.entries(handlers)) {
      button.addEventListener(h[0], h[1]);
    }
    return button;
  };

  // Create a new select element.
  UTIL.newSelect = function newSelect(values, contents) {
    if (values.length != contents.length) {
      console.error ("UTIL.newSelect: values and contents do not have the same length", { values, contents });
    }
    const select = UTIL.newElement("SELECT");
    for (let ii = 0; ii < values.length; ii++) {
      const option = UTIL.newElement("OPTION");
      option.value = values[ii];
      option.innerText = contents[ii];
      select.appendChild (option);
    }
    return select;
  };

  /**********************************************************************************
   * FUNCTION - UTIL.createPopupPanel: Create and return a DIV html element that is
   * configured for a pop-up panel.
   **********************************************************************************/
  UTIL.createPopupPanel = function createPopupPanel (elemName) {
    const existing = document.getElementById(elemName);
    if (existing) {
      existing.classList.add("ngchm-popup");
      existing.style.display = "none";
      return existing;
    }
    return UTIL.newElement(
      "DIV.ngchm-popup",
      { id: elemName, style: { display: "none" } }
    );
  };

  /**********************************************************************************
   * FUNCTION - showTab: This function shows the tab identified by buttonId and hides
   * all the other tabs in the group.
   *
   * Requires:
   * - all tab buttons in the group must be contained in the same div (and nothing else)
   * - each tab button has a data-for-tab attribute containing the id of the tab it
   *   controls.
   *
   * This function:
   * - adds the 'selected' class to the specified button and removes it from all other
   *   buttons in the group.
   * - removes the 'hide' class from the tab div identified by the data-for-tab attribute
   *   of the specified button and adds it to the divs identified by the other buttons.
   *
   **********************************************************************************/
  UTIL.showTab = showTab;
  function showTab(buttonId) {
    const btn = document.getElementById(buttonId);
    if (!btn)
      console.error("No tab button identified by buttonId:", { buttonId });
    hideAllLinks(btn.parentElement);
    const tab =
      btn.dataset.forTab && document.getElementById(btn.dataset.forTab);
    if (!tab) console.error("No tab identified by buttonId:", { buttonId });
    tab.classList.remove("hide");
    btn.classList.add("selected");

    function hideAllLinks(btns) {
      [...btns.children].forEach((btn) => {
        const tab = document.getElementById(btn.dataset.forTab);
        if (!tab) console.error("No tab identified by button:", { btn });
        tab.classList.add("hide");
        btn.classList.remove("selected");
      });
    }
  }

  /**********************************************************************************
   * FUNCTION - toTitleCase: The purpose of this function is to change the case of
   * the first letter of the first word in each sentence passed in.
   **********************************************************************************/
  UTIL.toTitleCase = function (string) {
    // \u00C0-\u00ff for a happy Latin-1
    return string
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b([a-z\u00C0-\u00ff])/g, function (_, initial) {
        return initial.toUpperCase();
      })
      .replace(
        /(\s(?:de|a|o|e|da|do|em|ou|[\u00C0-\u00ff]))\b/gi,
        function (_, match) {
          return match.toLowerCase();
        },
      );
  };

  /**********************************************************************************
   * FUNCTION - getStyle: The purpose of this function is to return the style
   * property requested for a given screen object.
   **********************************************************************************/
  UTIL.getStyle = function (x, styleProp) {
    if (x.currentStyle) var y = x.currentStyle[styleProp];
    else if (window.getComputedStyle)
      var y = document.defaultView
        .getComputedStyle(x, null)
        .getPropertyValue(styleProp);
    return y;
  };

  /**********************************************************************************
   * FUNCTION - returnToHome: The purpose of this function is to open a "home" URL
   * in the same tab as the heatMap (when a link is present).
   **********************************************************************************/
  UTIL.returnToHome = function () {
    var collectionhomeurl = UTIL.getURLParameter("collectionHome");
    if (collectionhomeurl !== "") {
      window.open(collectionhomeurl, "_self");
    }
  };

  /**********************************************************************************
   * FUNCTION - isScreenZoomed: The purpose of this function is to determine if the
   * browser zoom level, set by the user, is zoomed (other than 100%)
   **********************************************************************************/
  UTIL.isScreenZoomed = function () {
    var zoomVal = 0;
    if (window.devicePixelRatio < 0.89) {
      zoomVal = -1;
    } else if (window.devicePixelRatio > 1.375) {
      zoomVal = 1;
    }
    return zoomVal;
  };

  /**********************************************************************************
   * FUNCTION - getBrowserType: The purpose of this function is to determine the type
   * of web browser being utilized and return that value as a string.
   **********************************************************************************/
  UTIL.getBrowserType = function () {
    var type = "unknown";
    if (
      (navigator.userAgent.indexOf("Opera") ||
        navigator.userAgent.indexOf("OPR")) != -1
    ) {
      type = "Opera";
    } else if (navigator.userAgent.indexOf("Chrome") != -1) {
      type = "Chrome";
    } else if (navigator.userAgent.indexOf("Safari") != -1) {
      type = "Safari";
    } else if (navigator.userAgent.indexOf("Firefox") != -1) {
      type = "Firefox";
    } else if (
      navigator.userAgent.indexOf("MSIE") != -1 ||
      !!document.documentMode == true
    ) {
      type = "IE";
    }
    return type;
  };

  /**********************************************************************************
   * FUNCTION - setMinFontSize: The purpose of this function is to determine if the
   * user has set a minimum font size on their browser and set the detail minimum label
   * size accordingly.
   **********************************************************************************/
  UTIL.minLabelSize = 5;
  function setMinFontSize() {
    const minMinLabelSize = 5;
    var minSettingFound = 0;
    var el = document.createElement("div");
    el.innerHTML =
      "<div><p>a b c d e f g h i j k l m n o p q r s t u v w x y z</p></div>";
    el.style.position = "absolute";
    el.style.fontSize = "1px";
    el.style.width = "64px";
    document.body.appendChild(el);
    var minimumHeight = el.offsetHeight;
    var least = 0;
    var most = 64;
    var middle;
    for (var i = 0; i < 32 && most >= minMinLabelSize; ++i) {
      middle = (least + most) / 2;
      el.style.fontSize = middle + "px";
      if (el.offsetHeight === minimumHeight) {
        least = middle;
      } else {
        most = middle;
      }
    }
    if (middle > minMinLabelSize) {
      minSettingFound = middle;
      UTIL.minLabelSize = Math.floor(middle) - 1;
    }
    document.body.removeChild(el);
    return minSettingFound;
  }

  /**********************************************************************************
   * FUNCTION - iESupport: The purpose of this function is to allow for the support
   * of javascript functions that Internet Explorer does not recognize.
   **********************************************************************************/
  function iESupport() {
    if (!String.prototype.startsWith) {
      String.prototype.startsWith = function (searchString, position) {
        position = position || 0;
        return this.substr(position, searchString.length) === searchString;
      };
    }

    if (!Element.prototype.remove) {
      Element.prototype.remove = function () {
        this.parentElement.removeChild(this);
      };
    }
  }

  /**********************************************************************************
   * FUNCTION - startupChecks: The purpose of this function is to check for warning
   * conditions that will be flagged for a given heat map at startup.  These include:
   * Browser type = IE, zoom level other than 100%, and a minimum font size browser
   * setting greater than 5pt.
   **********************************************************************************/
  function startupChecks() {
    let warningsRequired = false;
    if (UTIL.getBrowserType() === "IE") {
      warningsRequired = true;
    }
    if (UTIL.minLabelSize > 5) {
      warningsRequired = true;
    }

    const msgButton = document.getElementById("messageOpen_btn");
    if (msgButton != undefined) {
      if (warningsRequired) {
        msgButton.style.display = "";
      } else {
        msgButton.style.display = "none";
      }
    }
  }

  // Panel interface configuration parameters that can be set by API.editWidget:
  UTIL.showSummaryPane = true;
  UTIL.showDetailPane = true;

  /**********************************************************************************
   * FUNCTION - blendTwoColors: The purpose of this function is to blend two 6-character
   * hex color code values into a single value between the two.
   * Color1 and color2 can be either hex color strings or arrays of color values.
   * Percentage is the proportion of color2 to include (default 0.5).
   **********************************************************************************/
  UTIL.blendTwoColors = function (color1, color2, percentage) {
    // check input
    if (!color1) {
      console.warn("UTIL.blendTwoColors: missing color1. Using black.");
      color1 = "#000000";
    }
    if (!color2) {
      console.warn("UTIL.blendTwoColors: missing color2. Using white.");
      color2 = "#ffffff";
    }
    // Convert colors to rgb arrays if given as hex strings.
    if (!Array.isArray(color1)) color1 = hexToInts (color1);
    if (!Array.isArray(color2)) color2 = hexToInts (color2);
    if (typeof percentage == "undefined") percentage = 0.5;

    // Blend colors
    const color3 = [
      (1 - percentage) * color1[0] + percentage * color2[0],
      (1 - percentage) * color1[1] + percentage * color2[1],
      (1 - percentage) * color1[2] + percentage * color2[2],
    ];
    // Return as hex string.
    return rgbToHex.apply (null, color3);
  };

  // Convert a hex color string such as "#0077ff" or "#07f" to
  // an array of three ints each in the range [0..255].
  function hexToInts (hex) {
    if (hex.length == 7) {
      return [
        parseInt(hex[1] + hex[2], 16),
        parseInt(hex[3] + hex[4], 16),
        parseInt(hex[5] + hex[6], 16),
      ];
    } else if (hex.length == 4) {
      return [
        parseInt(hex[1] + hex[1], 16),
        parseInt(hex[2] + hex[2], 16),
        parseInt(hex[3] + hex[3], 16),
      ];
    } else {
      console.error (`UTIL.hextoInts: Bad hex string value ${hex}.`);
      return [ 0, 0, 0 ];
    }
  }

  // Convert r,g,b to hex string.
  // Each of r,g,b is in the range 0 to 255.
  function rgbToHex (r, g, b) {
    const hex = "#" + intToHex(r) + intToHex(g) + intToHex(b);
    return hex;
  }

  /**********************************************************************************
   * FUNCTION - intToHex: The purpose of this function is to convert integer
   * value into a hex value;
   **********************************************************************************/
  function intToHex (num) {
    let hex = Math.round(num).toString(16);
    if (hex.length == 1) hex = "0" + hex;
    return hex;
  }

  // Convert hue (range 0 to 360), sat (range 0 to 100), and val (range 0 to 100)
  // to a hex encoded rgb string.
  UTIL.hsvToRgb = hsvToRgb;
  function hsvToRgb(hue, sat, val) {
    hue /= 60;  // Scale to 0..6
    sat /= 100; // Scale to 0..1
    val /= 100; // Scale to 0..1
    const sector = Math.floor(hue);
    const frac = hue - sector;

    const p = 1 - sat;
    const q = 1 - frac * sat;
    const t = 1 - (1 - frac) * sat;

    // Scale rgb results to half-open range [0..256).
    val *= 256 - 1e-10;
    const rgb = rotate(sector).map(c => Math.floor(c*val));
    const hex = rgbToHex.apply (null, rgb);
    return hex;

    function rotate (sector) {
      switch (sector % 6) {
        case 0:
          return [1,t,p];
        case 1:
          return [q,1,p];
        case 2:
          return [p,1,t];
        case 3:
          return [p,q,1];
        case 4:
          return [t,p,1];
        case 5:
          return [1,p,q];
      }
    }
  }

  // FUNCTION pick - evenly pick N data points from the range [0..M-1].
  //
  // Returns an array of length N.
  // Each element of the array is an integer in the range [0..M-1].
  // The values of the array start at 0 and do not decrease.
  UTIL.pick = pick;
  function pick (N, M) {
    const points = [0];
    const base = Math.floor (M/(N-1));
    const derror = M/(N-1) - base;
    let error = derror;
    for (let ii = 1; ii < N; ii++) {
      let inc = base;
      if (error >= 1) {
        inc++;
        error -= 1;
      }
      error += derror;
      points.push (Math.min(points[points.length-1] + inc, M-1));
    }
    return points;
  }

  /**********************************************************************************
   * FUNCTION - convertToArray: The purpose of this function is to convert a single
   * var value into an array containing just that value.  It is used for compatibility
   * management.
   **********************************************************************************/
  UTIL.convertToArray = function (value) {
    var valArr = [];
    valArr.push(value);
    return valArr;
  };

  UTIL.containerElement = document.getElementById("ngChmContainer");

  /**********************************************************************************
   * FUNCTION - removeElementsByClass: This function removes all DOM elements with
   * a given className.
   **********************************************************************************/
  UTIL.removeElementsByClass = function (className) {
    var elements = document.getElementsByClassName(className);
    while (elements.length > 0) {
      elements[0].parentNode.removeChild(elements[0]);
    }
  };

  /**********************************************************************************
   * FUNCTION - shadeColor: This function darken or lighten a color given a percentage.
   * Percentages are represented from 0 to 100.  Positive percentages lighten a color
   * (100 = white) and negative percentages will darken a color (-100 = black).
   **********************************************************************************/
  UTIL.shadeColor = function (color, pct) {
    var percent = pct / 100;
    var f = parseInt(color.slice(1), 16),
      t = percent < 0 ? 0 : 255,
      p = percent < 0 ? percent * -1 : percent,
      R = f >> 16,
      G = (f >> 8) & 0x00ff,
      B = f & 0x0000ff;
    return (
      "#" +
      (
        0x1000000 +
        (Math.round((t - R) * p) + R) * 0x10000 +
        (Math.round((t - G) * p) + G) * 0x100 +
        (Math.round((t - B) * p) + B)
      )
        .toString(16)
        .slice(1)
    );
  };

  UTIL.imageCanvas = function (canvas) {
    let inMemCanvas = document.createElement("canvas");
    const inMemCtx = inMemCanvas.getContext("2d");
    inMemCanvas.width = canvas.width;
    inMemCanvas.height = canvas.height;
    inMemCtx.drawImage(canvas, 0, 0);
    return inMemCanvas;
  };

  /**********************************************************************************
   * FUNCTION - isNaN: This function checks for a numeric (float or integer) value
   * and returns true/false.
   **********************************************************************************/
  UTIL.isNaN = function (n) {
    let nan = false;
    nan = isNaN(n);
    if (n.trim() === "") {
      nan = true;
    }
    return nan;
  };

  /**********************************************************************************
   * FUNCTION - validURL: This function checks to see if a string contains a valid
   * URL address.
   **********************************************************************************/
  UTIL.isValidURL = function (str) {
    let url;
    try {
      url = new URL(str);
    } catch (_) {
      return false;
    }
    return true;
  };

  /**********************************************************************************
   * FUNCTION - dragElement: This function adds drag/move functionality to the DIV
   * passed in.
   **********************************************************************************/
  UTIL.dragElement = function (elmnt) {
    const ngchmHeaderHeight =
      document.getElementById("mdaServiceHeader").clientHeight;
    let deltaMouseElementX = 0;
    let deltaMouseElementY = 0;
    const minTop = -2;
    let maxTop = 0;
    let minLeft = 0;
    let maxLeft = 0;

    const header =
      document.getElementById(elmnt.id + "Hdr") ||
      elmnt.querySelector(".msgBoxHdr");
    if (header) {
      /* if present, the header is where you move the DIV from:*/
      header.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
      e = e || window.event;
      e.preventDefault();
      const bbox = elmnt.getBoundingClientRect();
      deltaMouseElementX = e.clientX - bbox.x;
      deltaMouseElementY = e.clientY - bbox.y;
      minLeft = -bbox.width / 2;
      maxLeft = window.innerWidth - bbox.width / 2;
      const hdrBbox = header.getBoundingClientRect();
      maxTop = window.innerHeight - hdrBbox.height;
      document.onmouseup = closeDragElement;
      // call a function whenever the cursor moves:
      document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
      e = e || window.event;
      e.preventDefault();
      // calculate the new cursor position:
      const yPosn = e.clientY - deltaMouseElementY;
      const xPosn = e.clientX - deltaMouseElementX;
      elmnt.style.left = Math.min(maxLeft, Math.max(minLeft, xPosn)) + "px";
      elmnt.style.top = Math.min(maxTop, Math.max(minTop, yPosn)) + "px";

      const contentHeight = document.getElementById("content").clientHeight;
      elmnt.style.height = "";
      if (elmnt.offsetHeight > ngchmHeaderHeight + contentHeight) {
        elmnt.style.height = ngchmHeaderHeight + contentHeight + "px";
      }
    }

    function closeDragElement() {
      /* stop moving when mouse button is released:*/
      document.onmouseup = null;
      document.onmousemove = null;
    }
  };

  /**********************************************************************************
   * FUNCTION - roundUpDown: The purpose of this function is to take an input number
   * and round it up OR down depending upon where it is in the range either between
   * 1 and 5 OR 1 and 10 depending on the limit set.  For example:  16 becomes 15 if
   * limit set to 5 but 20 with a limit of 10).
   **********************************************************************************/
  UTIL.roundUpDown = function (inVal, limit) {
    var roundedVal = inVal;
    var lastDigit = inVal % 10;
    if (limit === 5) {
      if (
        (lastDigit < 5 && lastDigit >= 3) ||
        (lastDigit > 5 && lastDigit >= 7)
      ) {
        roundedVal = Math.ceil(inVal / 5) * 5;
      } else {
        roundedVal = Math.floor(inVal / 5) * 5;
      }
    } else if (limit === 10) {
      if (lastDigit >= 5) {
        roundedVal = Math.ceil(inVal / 10) * 10;
      } else {
        roundedVal = Math.floor(inVal / 10) * 10;
      }
    }
    return roundedVal;
  };

  /**********************************************************************************
   * FUNCTION - createCheckBoxDropDown: The purpose of this function is to dynamically
   * populate the html of a discrete check box dropdown with items.
   **********************************************************************************/
  UTIL.createCheckBoxDropDown = function (
    selectBoxId,
    checkBoxesId,
    boxText,
    items,
    maxHeight,
  ) {
    var checkBoxes = document.getElementById(checkBoxesId);
    var selectBox = document.getElementById(selectBoxId);
    //Order categories (in case they are out of order in properties)
    let orderedItems = [];
    for (let i = 0; i < items.length; i++) {
      orderedItems.push(items[i]);
    }
    orderedItems.sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
    //Set text to display on closed check box dropdown (can be set to '' for no text)
    selectBox.innerHTML =
      "<select><option>" +
      boxText +
      "</option></select><div id='overSelect' class='dropDownOverSelect'></div>";
    //Create html for all check box rows
    var boxes = "";
    for (var i = 0; i < orderedItems.length; i++) {
      boxes =
        boxes +
        "<label for='" +
        orderedItems[i] +
        "' ><input type='checkBox' class='srchCovCheckBox' value='" +
        orderedItems[i] +
        "' name='" +
        orderedItems[i] +
        "'>" +
        orderedItems[i] +
        "</input></label>";
    }
    if (items.length > 20) {
      checkBoxes.style.height = maxHeight;
    } else {
      checkBoxes.style.height = (items.length + 1) * 18 + "px";
    }
    checkBoxes.innerHTML =
      boxes +
      "<label for='Missing'><input type='checkBox' class='srchCovCheckBox' value='missing' name='missing'>Missing</input></label>";
    checkBoxes.querySelectorAll("label").forEach((label) => {
      label.onclick = toggleLabel;
    });

    function toggleLabel(event) {
      UTIL.toggleCheckBox(event, event.target);
    }
  };

  /**********************************************************************************
   * FUNCTION - clearCheckBoxDropdown: The purpose of this function is to remove all
   * check box rows from within a given checkBox dropdown control.
   **********************************************************************************/
  UTIL.clearCheckBoxDropdown = function (checkBoxesId) {
    document.getElementById(checkBoxesId).innerHTML = "";
  };

  /**********************************************************************************
   * FUNCTION - resetCheckBoxDropdown: The purpose of this function is to reset all
   * check boxes in a check box dropdown control to unselected.
   **********************************************************************************/
  UTIL.resetCheckBoxDropdown = function (checkBoxClass) {
    var checkboxes = document.getElementsByClassName(checkBoxClass);
    for (var i = 0; i < checkboxes.length; i++) {
      checkboxes[i].checked = false;
    }
  };

  /**********************************************************************************
   * FUNCTION - toggleCheckBox: The purpose of this function is to toggle the value
   * of a check box.  This is inherent to the check box itself BUT you need this
   * code to enable the toggle when the user clicks on a check box row (highlighted
   * LABEL element) but not directly on the box itself.
   **********************************************************************************/
  UTIL.toggleCheckBox = function (event, item) {
    if (event.target.nodeName === "LABEL") {
      item.children[0].checked = !item.children[0].checked;
    }
  };

  /**********************************************************************************
   * FUNCTION - showCheckBoxDropDown: The purpose of this function is open up
   * the contents (checkboxes) of a check box dropdown control.
   **********************************************************************************/
  UTIL.showCheckBoxDropDown = function (checkBoxesId) {
    var checkboxes = document.getElementById(checkBoxesId);
    if (checkboxes.style.display === "none") {
      checkboxes.style.display = "block";
    } else {
      checkboxes.style.display = "none";
    }
  };

  /**********************************************************************************
   * FUNCTION - closeCheckBoxDropdown: The purpose of this function is to close
   * the contents of a check box dropdown control. It is similar the the show
   * function but can be called from anywhere. The idea being that if the
   * dropdown has been left open and you click somewhere else, it will be closed.
   **********************************************************************************/
  UTIL.closeCheckBoxDropdown = function (selectBoxId, checkBoxesId) {
    var offP = document.getElementById(checkBoxesId).offsetParent;
    if (offP !== null) {
      document.getElementById(selectBoxId).click();
    }
  };

  /*
   * Keep element from moving off the viewport as the user resizes the window.
   */
  UTIL.keepElementInViewport = function (elementId) {
    const element = document.getElementById(elementId);
    if (element !== null) {
      const rect = element.getBoundingClientRect();
      if (rect.bottom < window.innerHeight && element.style.height) {
        element.style.height = "";
      }
      if (rect.bottom > window.innerHeight) {
        element.style.height = window.innerHeight - rect.top + "px";
      }
      if (rect.right > window.innerWidth) {
        element.style.left = window.innerWidth - rect.width + "px";
      }
      if (rect.top < 0) {
        element.style.top = "0px";
      }
      if (rect.left < 0) {
        element.style.left = "0px";
      }
    }
  };

  /**********************************************************************************
   * BEGIN: EMBEDDED MAP FUNCTIONS AND GLOBALS
   *
   * embedLoaded: Global for whether a given iFrame's heat map has been loaded already.
   * We only only load once.
   *
   **********************************************************************************/
  UTIL.embedThumbWidth = "150px";
  UTIL.embedThumbHeight = "150px";
  UTIL.defaultNgchmWidget = "ngchmWidget-min.js";

  /**********************************************************************************
   * FUNCTION - setNgchmWidget: This function allows the user to modify the default
   * for the nghcmWidget-min.js file to a fully pathed location for that file (which
   * may be under a different name than the file itself)
   **********************************************************************************/
  UTIL.setNgchmWidget = function (path) {
    UTIL.defaultNgchmWidget = path;
  };

  /**********************************************************************************
   * FUNCTION - embedExpandableMap: This function constructs the html for embedding
   * a heat map widget within an iFrame object.  It takes a javascript object (options)
   * as an input.  The minimum parameters within this object is the ngchm file entry.
   * Optional entries may be provided for the thumbnail, height, width, and widget JS
   * location.
   **********************************************************************************/
  UTIL.embedExpandableMap = function (options) {
    //Exit if no ngchm has been provided
    if (options.ngchm === undefined) {
      return;
    }

    //Set all option parameters to defaults if not provided
    if (options.divId === undefined) options.divId = "NGCHM";
    if (options.thumbnail === undefined)
      options.thumbnail = options.ngchm.replace(/\.ngchm$/, ".png");
    if (options.thumbnailWidth === undefined) options.thumbnailWidth = "150px";
    if (options.thumbnailHeight === undefined)
      options.thumbnailHeight = options.thumbnailWidth;
    if (options.ngchmWidget === undefined)
      options.ngchmWidget = UTIL.defaultNgchmWidget;
    var displayWidth =
      options.displayWidth === undefined
        ? "100"
        : options.displayWidth.substring(0, options.displayWidth.length - 1);
    var customJS = options.customJS === undefined ? "" : options.customJS;
    var displayHeight = displayWidth;
    if (displayWidth <= 70) {
      displayHeight = 70;
    }

    //set "memory" variables for width/height for collapse functionality
    UTIL.embedThumbWidth = options.thumbnailWidth;
    UTIL.embedThumbWidth = options.thumbnailHeight;

    //Construct a fully configured embedded iframe and add it to the html page
    var embeddedDiv = document.getElementById(options.divId);
    var ngchmIFrame = document.createElement("iframe");
    ngchmIFrame.id = options.divId + "_iframe";
    ngchmIFrame.scrolling = "no";
    ngchmIFrame.style =
      "height:" + options.thumbnailHeight + "; width:100%; border-style:none; ";
    ngchmIFrame.sandbox =
      "allow-scripts allow-same-origin allow-popups allow-forms allow-modals allow-downloads";
    ngchmIFrame.className = "ngchmThumbnail";
    embeddedDiv.appendChild(ngchmIFrame);
    var doc = ngchmIFrame.contentWindow.document;
    doc.open();
    doc.write(
      "<!DOCTYPE html><HTML><BODY style='margin:0px;width:100vw;height: 100vh;display: flex;flex-direction: column;'><div id='NGCHMEmbedWrapper' class='NGCHMEmbedWrapper' style='height: " +
        options.thumbnailHeight +
        "; width: " +
        options.thumbnailWidth +
        "'><img img id='NGCHMEmbedButton' src='" +
        options.thumbnail +
        "' alt='Show Heat Map' onclick='NgChm.API.showEmbed(this,\"" +
        displayWidth +
        '","' +
        displayHeight +
        '","' +
        customJS +
        "\");' /><div class='NGCHMEmbedOverlay' onclick='NgChm.UTIL.showEmbed(this,\"" +
        displayWidth +
        '","' +
        displayHeight +
        '","' +
        customJS +
        "\");' ><div id='NGCHMEmbedOverText'>Expand<br>Map</div></div></div><div id='NGCHMEmbedCollapse' style='display: none;width: 100px; height: 20px;'><div class='buttonGroup'><button id='NGCHMEmbedButton' onclick='NgChm.API.hideEmbed();'><span class='button'>Collapse Map</span></button></div></div><br/><div id='NGCHMEmbed' style='display: none; background-color: white; height: 100%; width: 98%; border: 2px solid gray; padding: 5px;'></div><script src='" +
        options.ngchmWidget +
        "'></script><script type='text/Javascript'>NgChm.API.embedCHM('" +
        options.ngchm +
        "');</script></BODY></HTML><br><br>",
    );
    doc.close();
  };
  UTIL.defaultNgchmWidget = "ngchmWidget-min.js";

  /**********************************************************************************
   * END: EMBEDDED MAP FUNCTIONS AND GLOBALS
   **********************************************************************************/

  /**********************************************************************************
   * FUNCTION - b64toBlob: This function reads a .ngchm file from a blob.  It is used
   * in html pages that contain an entire heat map (.ngchm, widget, html, embed)
   **********************************************************************************/
  UTIL.b64toBlob = function (b64Data) {
    const sliceSize = 512;
    let byteCharacters = atob(b64Data);
    let byteArrays = [];
    for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);
      let byteNumbers = new Array(slice.length);
      for (var i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      let byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    const blob = new Blob(byteArrays);
    return blob;
  };

  /*********************************************************************************************
   * FUNCTION:  getClickType - The purpose of this function returns an integer. 0 for left click;
   * 1 for right.  It could be expanded further for wheel clicks, browser back, and browser forward
   *********************************************************************************************/
  UTIL.getClickType = function (e) {
    var clickType = 0;
    e = e || window.event;
    if (!e.which && typeof e.button !== "undefined") {
      e.which = e.button & 1 ? 1 : e.button & 2 ? 3 : e.button & 4 ? 2 : 0;
    }
    switch (e.which) {
      case 3:
        clickType = 1;
        break;
    }
    if (e.ctrlKey) {
      clickType = 1;
    }
    return clickType;
  };

  /*********************************************************************************************
   * FUNCTION:  getCursorPosition - The purpose of this function is to return the cursor
   * position over the canvas.
   *********************************************************************************************/
  UTIL.getCursorPosition = function (e) {
    var x, y;
    if (e.touches) {
      if (e.touches.length > 0) {
        var rect = e.target.getBoundingClientRect();
        x = Math.round(e.targetTouches[0].pageX - rect.left);
        y = Math.round(e.targetTouches[0].pageY - rect.top);
      } else {
        var rect = e.target.getBoundingClientRect();
        x = Math.round(e.changedTouches[0].pageX - rect.left);
        y = Math.round(e.changedTouches[0].pageY - rect.top);
      }
    } else {
      x = e.offsetX;
      y = e.offsetY;
    }
    return { x: x, y: y };
  };

  /*********************************************************************************************
   * FUNCTION:  hexToComplimentary - The purpose of this function is to convert a hex color value
   * to a complimentary hex color value.  It shifts hue by 45 degrees and then converts hex,
   * returning complimentary color as a hex value
   *********************************************************************************************/
  UTIL.hexToComplimentary = function (hex) {
    // Convert hex to rgb
    // Credit to Denis http://stackoverflow.com/a/36253499/4939630
    var rgb =
      "rgb(" +
      (hex = hex.replace("#", ""))
        .match(new RegExp("(.{" + hex.length / 3 + "})", "g"))
        .map(function (l) {
          return parseInt(hex.length % 2 ? l + l : l, 16);
        })
        .join(",") +
      ")";

    // Get array of RGB values
    rgb = rgb.replace(/[^\d,]/g, "").split(",");

    var r = rgb[0],
      g = rgb[1],
      b = rgb[2];

    // Convert RGB to HSL
    // Adapted from answer by 0x000f http://stackoverflow.com/a/34946092/4939630
    r /= 255.0;
    g /= 255.0;
    b /= 255.0;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var h,
      s,
      l = (max + min) / 2.0;

    if (max == min) {
      h = s = 0; //achromatic
    } else {
      var d = max - min;
      s = l > 0.5 ? d / (2.0 - max - min) : d / (max + min);

      if (max == r && g >= b) {
        h = (1.0472 * (g - b)) / d;
      } else if (max == r && g < b) {
        h = (1.0472 * (g - b)) / d + 6.2832;
      } else if (max == g) {
        h = (1.0472 * (b - r)) / d + 2.0944;
      } else if (max == b) {
        h = (1.0472 * (r - g)) / d + 4.1888;
      }
    }

    h = (h / 6.2832) * 360.0 + 0;

    // Shift hue to opposite side of wheel and convert to [0-1] value
    h += 45;
    if (h > 360) {
      h -= 360;
    }
    h /= 360;

    // Convert h s and l values into r g and b values
    // Adapted from answer by Mohsen http://stackoverflow.com/a/9493060/4939630
    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      var hue2rgb = function hue2rgb(p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;

      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    r = Math.round(r * 255);
    g = Math.round(g * 255);
    b = Math.round(b * 255);

    // Convert r b and g values to hex
    rgb = b | (g << 8) | (r << 16);
    return "#" + (0x1000000 | rgb).toString(16).substring(1);
  };

  /*********************************************************************************************
   * FUNCTION:  getContigRanges - This function iterates thru a sorted array of integers (e.g.
   * searchRows or searchCols) and returns an array containing entries for each contiguous range
   * present in the original Array.  The elements of the returned array will be sub-arrays that
   * each have 2 entries: one for the starting position and the other for the ending position.
   *********************************************************************************************/
  UTIL.getContigRanges = function (sortedArr) {
    const ranges = [];
    let prevVal = sortedArr[0];
    let startVal = sortedArr[0];
    if (sortedArr.length > 0) {
      for (let i = 0; i < sortedArr.length; i++) {
        let currVal = sortedArr[i];
        // If a contiguous range has been found, write array entry
        if (currVal - prevVal > 1) {
          ranges.push([startVal, prevVal]);
          startVal = currVal;
          // If this is ALSO the last entry, write one more array for
          // for the current single row/col selection
          if (i === sortedArr.length - 1) {
            ranges.push([currVal, currVal]);
          }
        } else {
          // If last entry, write array entry
          if (i === sortedArr.length - 1) {
            ranges.push([startVal, currVal]);
          }
        }
        prevVal = currVal;
      }
    }
    return ranges;
  };

  // Sub-module for managing the splash screen.
  (function () {
    const exports = { showSplashExample, showLoader, hideLoader };
    NgChm.exportToNS("NgChm.UTIL", exports);
    var firstLoaderMessage = true;
    var messages = "";

    function showSplashExample() {
      const splashWaiting = document.getElementById("splashWaiting");
      // Splash screen removed in widget.
      if (!splashWaiting) return;
      const splashExample = document.getElementById("splashExample");
      splashWaiting.classList.add("hide");
      splashExample.classList.remove("hide");
    }

    // Replace splash screen with loader screen.
    function showLoader(message) {
      const splash = document.getElementById("splash");
      const loader = document.getElementById("loader");
      messages += "<P>" + message;
      loader.innerHTML = messages;
      if (firstLoaderMessage) {
        loader.classList.replace("faded", "fadeinslow");
        // Splash screen removed in widget.
        if (splash) splash.classList.replace("fadeinslow", "fadeout");
        firstLoaderMessage = false;
      }
    }

    // Replace loader screen with NgCHM.
    // If hideAll is true, hides every UI element marked with hide-on-load
    // and shows every element marked with show-on-load.
    // Otherwise, only the loader element itself is hidden.
    function hideLoader(hideAll) {
      const loader = document.getElementById("loader");
      loader.classList.replace("fadeinslow", "fadeout");
      if (hideAll) {
        [...document.querySelectorAll("*[data-hide-on-load]")].forEach((e) =>
          e.classList.add("hide"),
        );
        UTIL.containerElement.classList.replace("faded", "fadein");
        [...document.querySelectorAll("*[data-show-on-load]")].forEach((e) =>
          e.classList.remove("hide"),
        );
      }
    }
  })();

  // Export CLASS OutputClass;
  // This is a virtual class that tracks indentation.
  // To use, you will need to define a derived class that also implements the
  // write and error methods.
  UTIL.OutputClass = OutputClass;
  function OutputClass () {
    this.__indent = 0;
  }
  OutputClass.prototype.indent = function () {
    this.__indent++;
  };
  OutputClass.prototype.unindent = function () {
    if (this.__indent > 0) this.__indent--;
  };

  // ConsoleOutput is a subclass of OutputClass that writes messages to the console log.
  Object.setPrototypeOf(ConsoleOutput.prototype, UTIL.OutputClass.prototype);
  function ConsoleOutput() {
    OutputClass.call(this);
  }
  ConsoleOutput.prototype.fmt = function (text) {
    if (!text) return "";
    let spaces = "";
    if (this.__indent > 0) {
      spaces += new Array(this.__indent * 2).fill("  ").join("");
    }
    return spaces + text;
  };
  ConsoleOutput.prototype.write = function (text) {
    console.log (this.fmt(text));
  };
  ConsoleOutput.prototype.error = function (text) {
    console.error (this.fmt(text));
  };
  UTIL.consoleOutput = new ConsoleOutput;

  UTIL.cmdRegistry = new Map();

  // CLASS Command.
  function Command (name, route, help) {
    this.name = name;
    this.route = route;
    this.help = help;
  }

  UTIL.registerCommand = function registerCommand (commandName, commandFn, helpFn) {
    commandFn = Array.isArray(commandFn) ? commandFn : [commandFn];
    helpFn = Array.isArray(helpFn) ? helpFn : [helpFn];
    UTIL.cmdRegistry.set(commandName, new Command (commandName, commandFn, helpFn));
  };

  UTIL.writeKnownCommands = function writeKnownCommands (req, res) {
    const output = res.output;
    output.write("Available commands:");
    output.write();
    output.indent();
    for (const [name, cmd] of UTIL.cmdRegistry) {
      output.write(name);
    }
    output.unindent();
  };

  UTIL.getCommand = function getCommand (commandName) {
    return UTIL.cmdRegistry.has (commandName) ? UTIL.cmdRegistry.get(commandName) : null;
  };

  UTIL.isCommand = function (object) {
    return object instanceof Command;
  };

  // Executed at startup.
  iESupport();
  setMinFontSize();
  startupChecks();
  document.getElementById("srchCovSelectBox").onclick = function (event) {
    UTIL.showCheckBoxDropDown("srchCovCheckBoxes");
  };
})();
