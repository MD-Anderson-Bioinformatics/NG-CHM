/*************************************************************
 * Linkouts will be added to the Row/Column Menus according to
 * the labelTypes attributes (found in the mapData.json file).
 * These attributes will drive the input paramaters for the
 * linkout functions. (Provided by getLabelsByType)
 *
 * TODO: Need to find a way to pass in whole label for some linkout functions.
 **************************************************************/

/*******************************************
 * BEGIN EXTERNAL INTERFACE
 *******************************************/

var linkouts = {};
var linkoutsVersion = "undefined";

(function () {
  "use strict";
  NgChm.markFile();

  //Define Namespace for NgChm Linkout
  const LNK = NgChm.createNS("NgChm.LNK");
  const CUST = NgChm.importNS("NgChm.CUST");
  const MAPREP = NgChm.importNS("NgChm.MAPREP");
  const MMGR = NgChm.importNS("NgChm.MMGR");
  const UTIL = NgChm.importNS("NgChm.UTIL");

  linkouts.VISIBLE_LABELS = "visibleLabels";
  linkouts.HIDDEN_LABELS = "hiddenLabels";
  linkouts.FULL_LABELS = "fullLabels";
  linkouts.POSITION = "position";
  linkouts.SINGLE_SELECT = "singleSelection";
  linkouts.MULTI_SELECT = "multiSelection";
  const EMPTY_SELECT = "emptySelection"; // NOT exported

  linkouts.getAttribute = function (attribute) {
    return MMGR.getHeatMap().getMapInformation().attributes[attribute];
  };

  linkouts.setVersion = function (v) {
    linkoutsVersion = "" + v;
  };

  linkouts.getVersion = function () {
    return linkoutsVersion;
  };

  linkouts.getMapName = function () {
    return MMGR.getHeatMap().getMapInformation().name;
  };

  linkouts.getMapFileName = function () {
    return UTIL.mapId;
  };

  // returns type of object we're linking from.
  linkouts.getSourceObjectType = function () {
    return "chm"; // CHM of course.
  };

  // returns a 'unique' identifier for the current source object.
  linkouts.getSourceObjectUniqueId = function () {
    return UTIL.mapId;
  };

  const debugLinkoutCallbacks = UTIL.getDebugFlag("linkouts");

  //adds axis linkout objects to the linkouts global variable
  linkouts.addLinkout = function (
    name,
    labelType,
    selectType,
    callback,
    reqAttributes,
    index,
  ) {
    // Cannot pass heatMap object to external callback function.
    const cb = function (heatMap, labels, axis) {
      if (debugLinkoutCallbacks) console.log ("AxisLinkout callback", { name, labels, axis });
      callback (labels, axis);
    };
    LNK.addLinkout(name, labelType, selectType, cb, reqAttributes, index);
  };

  //adds matrix linkout objects to the linkouts global variable
  linkouts.addMatrixLinkout = function (
    name,
    rowType,
    colType,
    selectType,
    callback,
    reqAttributes,
    index,
  ) {
    // Cannot pass heatMap object to external callback function.
    const cb = function (heatMap, labels, axis) {
      if (debugLinkoutCallbacks) console.log ("MatrixLinkout callback", { name, labels, axis });
      callback (labels, axis);
    };
    LNK.addMatrixLinkout(
      name,
      rowType,
      colType,
      selectType,
      cb,
      reqAttributes,
      index,
    );
  };

  /* Called in the custom.js to add a linkout */
  linkouts.addPanePlugin = function (p) {
    LNK.registerPanePlugin(p);
  };

  // Linkout to the specified url in a suitable 'window'.
  // name identifies the linkout group (subsequent linkouts in the same group should display in the same window).
  // options fine tunes the window display.
  linkouts.openUrl = function openUrl(url, name, options) {
    LNK.openUrl(url, name, options);
  };

  linkouts.simplifyLabels = function (labels) {
    if (!Array.isArray(labels)) {
      labels = labels.Row.concat(labels.Column);
    }
    // Remove duplicates.
    return labels.sort().filter(function (el, i, a) {
      return i === a.indexOf(el);
    });
  };

  linkouts.addHamburgerLinkout = function (params) {
    LNK.addHamburgerLinkout(params);
  };

  // Define a subtype: any linkouts defined for the supertype will also be defined
  // for the subtype.  No transformation will be applied to the labels.  For
  // instance: addSubtype('bio.gene.hugo', 'bio.pubmed'): linkouts defined for bio.pubmed
  // will also be defined for bio.gene.hugo.
  linkouts.addSubtype = function (subtype, supertype) {
    CUST.addSubtype(subtype, supertype);
  };

  // Add the specified plugin.
  linkouts.addPlugin = function (plugin) {
    for (var i = 0; i < CUST.customPlugins.length; i++) {
      var currPlug = CUST.customPlugins[i];
      if (currPlug.name === plugin.name) {
        CUST.customPlugins.splice(i, 1);
      }
    }
    if (CUST.verbose) console.log("NgChm.CUST: adding plugin " + plugin.name);
    CUST.customPlugins.push(plugin);
  };

  // Describe plugin types.
  linkouts.describeTypes = function (typelist) {
    CUST.describeTypes(typelist);
  };

  /*******************************************
   * END EXTERNAL INTERFACE
   *******************************************/

  /* Additional imports. */
  const SRCHSTATE = NgChm.importNS("NgChm.SRCHSTATE");
  const SRCH = NgChm.importNS("NgChm.SRCH");
  const PANE = NgChm.importNS("NgChm.Pane");
  const UHM = NgChm.importNS("NgChm.UHM");
  const PIM = NgChm.importNS("NgChm.PIM");
  const CMM = NgChm.importNS("NgChm.CMM");

  var menuOpenCanvas = null; // Canvas on which the most recent linkouts popup was opened.
  LNK.enableBuilderUploads = true;

  const pluginRestoreInfo = {};

  //Used to store the label item that the user clicked-on
  LNK.selection = 0;
  //Used to place items into the hamburger menu (incremented from starting point of 10 which is just after the gear in the menu.  this value MUST be edited if adding an item before the gear)
  LNK.hamburgerLinkCtr = 10;

  LNK.linkoutElement = null;

  LNK.openUrl = function openUrl(url, name, options) {
    options = options || {};
    const pane =
      LNK.linkoutElement !== null && PANE.findPaneLocation(LNK.linkoutElement);
    if (!pane.pane || options.noframe) {
      window.open(url, name);
    } else {
      console.log({ m: "openUrl", url, name, options });
      let ch = LNK.linkoutElement.lastChild;
      while (ch) {
        LNK.linkoutElement.removeChild(ch);
        ch = LNK.linkoutElement.lastChild;
      }
      ch = document.createElement("IFRAME");
      ch.setAttribute("title", name);
      ch.setAttribute("src", url);
      LNK.linkoutElement.appendChild(ch);
      if (name) {
        PANE.setPaneTitle(pane, name);
      }
      MMGR.getHeatMap().saveLinkoutPaneToMapConfig(pane.pane.id, url, name);
    }
  };

  //Add a linkout to the Hamburger menu
  LNK.addHamburgerLinkout = function (params) {
    const burgerMenu = document.getElementById("burgerMenuPanel");
    let icon;

    //Verify params and set defaults
    if (params.name === undefined) {
      return;
    }
    params.name = "plugin-" + params.name;
    if (params.label === undefined) {
      params.label = params.name;
    }
    if (params.icon === undefined) {
      icon = UTIL.newSvgButton("icon-links");
    } else {
      // Assume user-specified icon is an image for now.
      icon = UTIL.newElement("IMG#plugin-" + params.name + "_btn", {
        src: params.icon,
      });
    }
    if (params.action === undefined) {
      params.action = UHM.hamburgerLinkMissing;
    }

    //Create linkout div using params
    const text = UTIL.newTxt(params.label + "...");
    //Add linkout to burger menu
    const menuItem = UTIL.newElement("DIV#" + params.name + ".menuItem", {}, [
      icon,
      text,
    ]);
    menuItem.onclick = params.action;
    burgerMenu.insertBefore(
      menuItem,
      burgerMenu.children[LNK.hamburgerLinkCtr],
    );
    LNK.hamburgerLinkCtr++;
  };

  // The axis linkout class.
  // Create an instance using new.
  function AxisLinkout (
    title,
    labelType,
    selectType,
    reqAttributes,
    callback,
  ) {
    this.title = title;
    this.labelType = labelType; // input type of the callback function
    this.selectType = selectType;
    this.reqAttributes = reqAttributes;
    this.callback = callback;
  };

  // The matrix linkout class.
  // Create an instance using new.
  function MatrixLinkout (
    title,
    rowType,
    colType,
    selectType,
    reqAttributes,
    callback,
  ) {
    this.title = title;
    this.rowType = rowType;
    this.colType = colType;
    this.selectType = selectType;
    this.reqAttributes = reqAttributes;
    this.callback = callback;
  };

  const matrixLinkouts = [];      // An array for all matrix linkouts.
  const linkoutsDB = new Map();   // A map from linkout types to an array of linkouts for all axis linkouts.

  const NullTypeKey = "---null---";

  // This function is used to add standard linkouts to the row/col, covariate menus.
  // labelType will decide which menu to place the linkout in.
  // selectType decides when the linkout is executable. (passing in null or undefined, or false will allow the function to be executable for all selection types)
  LNK.addLinkout = function (
    name,
    labelType,
    selectType,
    callback,
    reqAttributes,
    index,
  ) {
    if (!Array.isArray(labelType)) labelType = labelType.split("|");
    const linkout = new AxisLinkout(
      name,
      labelType,
      selectType,
      reqAttributes,
      callback,
    );
    // If labelType includes multiple types (all of which are required), save it under one type,
    // independent of the order of the types given.
    const key = labelType.length == "0" ? NullTypeKey : labelType.sort()[0];
    if (!linkoutsDB.has(key)) {
      // Create the first linkout for that type.
      linkoutsDB.set(key, [linkout]);
    } else {
      // Get the array of linkouts for that type.
      const linkoutsForType = linkoutsDB.get(key);
      if (index !== undefined) {
        // Replace the existing linkout at index.
        //linkoutsForType.splice(index, 0, linkout);
        console.error ("addLinkout: obsolete attempt to replace a specific linkout", { linkout, index });
        return;
      } else {
        // Append to the array of linkouts for that type.
        // But first remove any existing linkout with the same title.
        removeExistingLinkout(linkoutsForType, linkout);
        linkoutsForType.push(linkout);
      }
    }
  };

  // Check to see if there is already a linkout with the same title and the same type
  // requirements as the one being added.
  // This would be in a case where a secondary custom.js is being used (embedded NG-CHM).
  // If so, delete the existing linkout to allow the new linkout to be added.
  function removeExistingLinkout (linkouts, linkout) {
    const labelType = canonical(linkout.labelType);
    for (let i = 0; i < linkouts.length; i++) {
      if (linkouts[i].title === linkout.title && canonical(linkouts[i].labelType) == labelType) {
        linkouts.splice(i, 1);
        return;
      }
    }
  }

  // Similar to removeExistingLinkout, but in this case there can be multiple
  // entries with the same titles but with different row and column type requirements.
  function removeExistingMatrixLinkout (linkouts, linkout) {
    const rowType = canonical(linkout.rowType);
    const colType = canonical(linkout.colType);
    for (let i = 0; i < linkouts.length; i++) {
      if (linkouts[i].title === linkout.title && canonical(linkouts[i].rowType) == rowType && canonical(linkouts[i].colType) == colType) {
        linkouts.splice(i, 1);
        return;
      }
    }
  }

  // Sort label type into a canonical order, so we treat "typea|typeb" the same as
  // "typeb|typea".
  function canonical (labelType) {
    if (!Array.isArray(labelType)) labelType = labelType.split("|");
    return labelType.sort().join("|");
  }

  LNK.addMatrixLinkout = function (
    name,
    rowType,
    colType,
    selectType,
    callback,
    reqAttributes,
    index,
  ) {
    const linkout = new MatrixLinkout(
      name,
      Array.isArray(rowType) ? rowType : rowType.split("|"),
      Array.isArray(colType) ? colType : colType.split("|"),
      selectType,
      reqAttributes,
      callback,
    );
    if (index !== undefined) {
      matrixLinkouts.splice(index, 0, linkout);
    } else {
      removeExistingMatrixLinkout(matrixLinkouts, linkout);
      matrixLinkouts.push(linkout);
    }
  };

  // Returns TRUE iff there is a matrix linkout with the specified name.
  LNK.isMatrixLinkout = function isMatrixLinkout (name) {
    return matrixLinkouts.map(linkout => linkout.name).includes(name);
  };

  // Return the labels from heatMap required by the specified linkout (and axis if applicable).
  //
  function getLabelsByType (heatMap, linkout, axis) {

    if (linkout.labelType) {
      // Single-axis linkout.
      return getAxisLinkoutLabels(axis, linkout.labelType, linkout.selectType);
    } else {
      // Matrix linkout.
      return {
        Row: getAxisLinkoutLabels("Row", linkout.rowType, linkout.selectType),
        Column: getAxisLinkoutLabels("Column", linkout.colType, linkout.selectType),
      };
    }

    function getAxisLinkoutLabels (axis, labelType, selectType) {
      // Build an array of the individual types required.
      const types = getRequiredTypes (labelType); // split 'types' into an array if a combined label type is requested
      const axisLabelTypes = axis.includes("Covar") ? [axis] : heatMap.getLabelTypes(axis).map(type => type.type);
      const formatIndex = types.map (type => axisLabelTypes.indexOf(type));

      // formatIndex should not contain any missing (negative) indices.
      formatIndex.forEach ((value, idx) => {
        if (value < 0) {
          console.error ("getAxisLinkoutLabels: missing type", { axis, labelType, missingType: types[idx], axisLabelTypes });
        }
      });

      if (selectType === linkouts.SINGLE_SELECT) {
        return [generateLinkoutLabel(LNK.selection, formatIndex)];
      } else {
        const srchResults = SRCHSTATE.getAxisSearchResults(axis);
        if (axis.includes("Covar")) {
          const labels = heatMap.getAxisCovariateOrder(axis.replace("Covar",""));
          return srchResults.map(idx => generateLinkoutLabel(labels[idx], formatIndex));
        } else {
          const labels = heatMap.getAxisLabels(axis).labels;
          return srchResults.map(idx => generateLinkoutLabel(labels[idx-1], formatIndex));
        }
      }

      // Return an array of the individual label types specified by labelType.
      // Normally involves splitting a string at the vertical bar character.
      // Special cases:
      // - labelType is a non-empty array. Just return it.
      // - labelType is an empty array. Return an array of all types in the data.
      function getRequiredTypes (labelType) {
        if (Array.isArray(labelType)) {
          if (labelType.length == 0) {
            return heatMap.getLabelTypes(axis.replace("Covar","")).map(type=>type.type);
          } else {
            return labelType;
          }
        } else {
          return labelType.split("|");
        }
      }
    }

    // This is a helper function to create labels consisting of the specified
    // parts of the given full label, separated by vertical bars.
    // 'indexes' is an array, each element of which is the index (zero-based)
    // of the desired part of the full label.
    // For example, if fullLabel = "part0|part1|part2|part3" and indexes=[3,1],
    // then the function will return "part3|part1".
    function generateLinkoutLabel(fullLabel, indexes) {
      if (fullLabel === undefined) return "";
      const parts = fullLabel.split("|");
      const searchLabel = indexes.map(idx => parts[idx]).join("|");
      return searchLabel;
    }
  }

  function downloadAllMatrixData(heatMap) {
    const selection = {
      rowLabels: heatMap.actualLabels("row"),
      colLabels: heatMap.actualLabels("column"),
      rowItems: null,
      colItems: null,
    };
    selection.rowItems = selection.rowLabels.map((v, i) => i + 1);
    selection.colItems = selection.colLabels.map((v, i) => i + 1);
    createMatrixData(heatMap, selection);
  }

  function downloadSelectedMatrixData(heatMap, selectedLabels) {
    const selection = {
      rowLabels: selectedLabels.Row,
      colLabels: selectedLabels.Column,
      rowItems: getAxisItems("Row"),
      colItems: getAxisItems("Column"),
    };
    createMatrixData(heatMap, selection);

    function getAxisItems(axis) {
      const searchItems = SRCHSTATE.getAxisSearchResults(axis);
      //Check to see if we need new searchItems because entire axis is selected by
      //default of no items being selected on opposing axis, Otherwise, use
      //searchItems selected.
      if (searchItems.length > 0) {
        return searchItems;
      } else {
        return LNK.getEntireAxisSearchItems(selectedLabels, axis);
      }
    }
  }

  //This function creates a two dimensional array which contains all of the row and
  //column labels along with the data for a given selection
  function createMatrixData(heatMap, selection) {
    const { labels: rowLabels, items: rowItems } = deGap(
      selection.rowLabels,
      selection.rowItems,
    );
    const { labels: colLabels, items: colItems } = deGap(
      selection.colLabels,
      selection.colItems,
    );
    const minCol = Math.min.apply(null, colItems);
    const numCols = Math.max.apply(null, colItems) - minCol + 1;

    const matrix = new Array();
    // Push column headers: empty field followed by column labels.
    matrix.push([""].concat(colLabels).join("\t") + "\n");

    let accessWindow = null; // Hold onto accessWindow until next one created to ensure tiles stay in cache.
    let canceled = false;

    const warningSize = 1000000;
    const warningShown = rowLabels.length * colLabels.length >= warningSize;

    if (warningShown) {
      showDownloadWarning();
    } else {
      processRow(0);
    }

    function showDownloadWarning() {
      UHM.initMessageBox();
      UHM.setMessageBoxHeader("Large Download Notice");
      UHM.setMessageBoxText(
        "<br>The requested download is very large.  <span class='errorMessage'>It may exhaust the browser's memory and crash the window or the browser without warning.</span><br><br>",
      );
      UHM.setMessageBoxButton(
        "cancel",
        {
          type: "text",
          text: "Cancel",
          tooltip: "Cancel the download",
          disableOnClick: true,
          default: false,
        },
        () => {
          canceled = true;
          UHM.messageBoxCancel();
        },
      );
      UHM.setMessageBoxButton(
        "go",
        {
          type: "text",
          text: "Proceed",
          tooltip: "Continue the download",
          disableOnClick: true,
          default: true,
        },
        () => {
          UHM.showMsgBoxProgressBar();
          processRow(0);
        },
      );
      UHM.displayMessageBox();
    }

    function processRow(row) {
      if (canceled) {
        return;
      }
      if (warningShown) {
        UHM.msgBoxProgressMeter(row / rowLabels.length);
      }
      if (row >= rowLabels.length) {
        // All requested rows processed.  Make matrix available for download.
        downloadSelectedData(heatMap, matrix, "Matrix", warningShown);
      } else {
        const rowItem = rowItems[row];
        // Get access window for this row and the columns requested.
        accessWindow = heatMap.getNewAccessWindow({
          layer: heatMap.getCurrentDL(),
          level: MAPREP.DETAIL_LEVEL,
          firstRow: rowItem,
          firstCol: minCol,
          numRows: 1,
          numCols: numCols,
        });
        accessWindow.onready((win) => {
          const rowValues = colItems.map((colItem) =>
            win.getValue(rowItem, colItem),
          );
          matrix.push([rowLabels[row]].concat(rowValues).join("\t") + "\n");
          processRow(row + 1);
        });
      }
    }

    // Helper function:
    // Remove gaps from labels and items.
    // Gaps are indicated by an empty label ('').
    function deGap(labels, items) {
      if (labels.length != items.length) {
        console.error(
          "deGap: length mismatch between labels and items",
          labels,
          items,
        );
        return { labels: [], items: [] };
      }
      const newLabels = [];
      const newItems = [];
      for (let i = 0; i < labels.length; i++) {
        if (labels[i] != "") {
          newLabels.push(labels[i]);
          newItems.push(items[i]);
        }
      }
      return { labels: newLabels, items: newItems };
    }
  }

  //This function creates a temporary searchItems object array and
  //is called when the selection box spans an entire axis
  //(e.g. the selection is the result of a dendro selection on one
  //axis with nothing selected on the other)
  LNK.getEntireAxisSearchItems = function (searchLabels, axis) {
    let searchItems = [];
    for (let i = 1; i <= searchLabels[axis].length; i++) {
      if (searchLabels[axis][i - 1] !== "") {
        searchItems.push(i);
      }
    }
    return searchItems;
  };

  LNK.createLabelMenus = function () {
    if (!document.getElementById("RowLabelMenu")) {
      createLabelMenu("Column"); // create the menu divs if they don't exist yet
      createLabelMenu("ColumnCovar");
      createLabelMenu("Row");
      createLabelMenu("RowCovar");
      createLabelMenu("Matrix");
      defineDefaultLinkouts();
    }
  };

  LNK.closeAllLinkoutMenus = function (ev) {
    ev = ev || {};
    closeLinkoutMenu("Matrix", ev);
    closeLinkoutMenu("Column", ev);
    closeLinkoutMenu("ColumnCovar", ev);
    closeLinkoutMenu("Row", ev);
    closeLinkoutMenu("RowCovar", ev);
  };

  function closeLinkoutMenu (axis, ev) {
    if (ev.ctrlKey || ev.metaKey) {
      // Prevent extra ctrl-click event sent by Safari from closing newly opened label menus.
      // See issue #539.
      return;
    }
    const labelMenu =
      axis === "Matrix"
        ? document.getElementById("MatrixMenu")
        : document.getElementById(axis + "LabelMenu");
    var tableBody = labelMenu.getElementsByTagName("TBODY")[0];
    var tempClass = tableBody.className;
    var newTableBody = document.createElement("TBODY");
    newTableBody.className = tempClass;
    tableBody.parentElement.replaceChild(newTableBody, tableBody);
    if (labelMenu) {
      labelMenu.classList.add("hide");
    }
  };

  LNK.openLinkoutMenu = function (heatMap, axis, e) {
    menuOpenCanvas = e.currentTarget;
    LNK.closeAllLinkoutMenus(e);
    //Get the label item that the user clicked on (by axis) and save that value for use in LNK.selection
    var index = e.target.dataset.index;
    LNK.selection = "";
    if (axis === "Row") {
      LNK.selection = heatMap.getRowLabels().labels[index - 1];
    } else if (axis === "Column") {
      LNK.selection = heatMap.getColLabels().labels[index - 1];
    } else if (axis === "RowCovar") {
      LNK.selection = heatMap.getRowClassificationConfigOrder()[index];
    } else if (axis === "ColumnCovar") {
      LNK.selection = heatMap.getColClassificationConfigOrder()[index];
    }

    const labelMenu =
      axis === "Matrix"
        ? document.getElementById("MatrixMenu")
        : document.getElementById(axis + "LabelMenu");
    var labelMenuTable =
      axis !== "Matrix"
        ? document.getElementById(axis + "LabelMenuTable")
        : document.getElementById("MatrixMenuTable");
    var axisLabelsLength =
      axis !== "Matrix"
        ? SRCHSTATE.getSearchLabelsByAxis(axis).length
        : {
            Row: SRCHSTATE.getSearchLabelsByAxis("Row").length,
            Column: SRCHSTATE.getSearchLabelsByAxis("Column").length,
          };
    var header = labelMenu.getElementsByClassName("labelMenuHeader")[0];
    var row = header.getElementsByTagName("TR")[0];
    if ((axisLabelsLength > 0 || LNK.selection !== "") && axis !== "Matrix") {
      row.innerHTML =
        "Selected " +
        axis.replace("Covar", " Covariate") +
        "s : " +
        axisLabelsLength;
      labelMenuTable.getElementsByTagName("TBODY")[0].style.display = "inherit";
      populateLabelMenu(heatMap, axis, axisLabelsLength);
    } else if (axis == "Matrix") {
      if (axisLabelsLength["Row"] > 0 || axisLabelsLength["Column"] > 0) {
        if (axisLabelsLength["Row"] === 0) {
          axisLabelsLength["Row"] =
            heatMap.getAxisLabels("Row")["labels"].length;
        } else if (axisLabelsLength["Column"] === 0) {
          axisLabelsLength["Column"] =
            heatMap.getAxisLabels("Column")["labels"].length;
        }
      }
      row.innerHTML =
        "Selected Rows: " +
        axisLabelsLength["Row"] +
        "<br>Selected Columns: " +
        axisLabelsLength["Column"];
      populateLabelMenu(heatMap, axis, axisLabelsLength);
    } else {
      row.innerHTML = "Please select a " + axis.replace("Covar", " Covariate");
      labelMenuTable.getElementsByTagName("TBODY")[0].style.display = "none";
    }

    if (labelMenu) {
      labelMenu.classList.remove("hide");
      var pageX = e.changedTouches ? e.changedTouches[0].pageX : e.pageX;
      var pageY = e.changedTouches ? e.changedTouches[0].pageY : e.pageY;
      const left =
        pageX + labelMenu.offsetWidth > window.innerWidth
          ? window.innerWidth - labelMenu.offsetWidth - 15
          : pageX; // -15 added in for the scroll bars
      const top =
        pageY + labelMenu.offsetHeight > window.innerHeight
          ? window.innerHeight - labelMenu.offsetHeight - 15
          : pageY;
      labelMenu.style.left = left + "px";
      labelMenu.style.top = top + "px";
    }
  };

  //creates the divs for the label menu
  function createLabelMenu (axis) {
    var labelMenu =
      axis !== "Matrix"
        ? UHM.getDivElement(axis + "LabelMenu")
        : UHM.getDivElement(axis + "Menu");
    document.body.appendChild(labelMenu);
    labelMenu.style.display = "block";
    labelMenu.style.position = "absolute";
    labelMenu.classList.add("labelMenu");
    labelMenu.classList.add("hide");
    var topDiv = document.createElement("DIV");
    topDiv.classList.add("labelMenuCaption");
    topDiv.innerHTML =
      axis !== "Matrix"
        ? axis.replace("Covar", " Covariate") + " Label Menu:"
        : axis + " Menu";
    const closeMenu = UTIL.newElement(
      "DIV.buttonGroup",
      {},
      UTIL.newElement(
        "BUTTON.labelMenuClose",
        {},
        UTIL.newElement("SPAN.button", {}, "Close"),
      ),
    );
    closeMenu.addEventListener(
      "click",
      function (ev) {
        closeLinkoutMenu(axis, ev);
      },
      false,
    );
    var table = document.createElement("TABLE");
    table.id = axis !== "Matrix" ? axis + "LabelMenuTable" : axis + "MenuTable";
    var tableHead = table.createTHead();
    tableHead.classList.add("labelMenuHeader");
    var row = tableHead.insertRow();
    labelMenu.appendChild(topDiv);
    labelMenu.appendChild(table);
    labelMenu.appendChild(closeMenu);
    var tableBody = table.createTBody();
    tableBody.classList.add("labelMenuBody");
    var labelHelpCloseAxis = function (ev) {
      closeLinkoutMenu(axis, ev);
    };
    document.addEventListener("click", labelHelpCloseAxis);
    labelMenu.addEventListener(
      "contextmenu",
      function (e) {
        e.preventDefault();
      },
      true,
    );
  };

  // Check to see if the item that the user clicked on is part of selected labels group
  LNK.itemInSelection = function (axis) {
    const heatMap = MMGR.getHeatMap();
    const labels =
      axis == "Row"
        ? heatMap.getRowLabels()
        : axis == "Column"
          ? heatMap.getColLabels()
          : axis == "RowCovar"
            ? heatMap.getRowClassificationConfigOrder()
            : axis == "ColumnCovar"
              ? heatMap.getColClassificationConfigOrder()
              : [];
    SRCHSTATE.getAxisSearchResults(axis).forEach((key) => {
      let selItem;
      if (axis.includes("Covar")) {
        selItem = labels[key];
      } else {
        selItem = labels[key - 1];
      }
      if (selItem === LNK.selection) {
        return true;
      }
    });
    return false;
  };

  //Check to see if we have selections
  LNK.hasSelection = function (axis) {
    // Check to see if clicked item is part of selected labels group
    return SRCHSTATE.getAxisSearchResults(axis).length > 0;
  };

  //adds the row linkouts and the column linkouts to the menus
  function populateLabelMenu (heatMap, axis, axisLabelsLength) {

    // Arrays here are used to store linkouts by type (e.g. individual OR group)
    const indLinkouts = [];
    const grpLinkouts = [];

    const rowLabelTypes = heatMap.getLabelTypes("row").map(type=>type.type);
    const colLabelTypes = heatMap.getLabelTypes("col").map(type=>type.type);

    if (axis.includes("Row") || axis.includes("Column")) {
      // This handles Row, RowCovar, Column, and ColumnCovar "axes".
      // The labelTypes for RowCovar and ColumnCovar are ["RowCovar"] and ["ColumnCovar"] respectively.
      // For Row and Column, we get them from the labels on the corresponding axis of the heatMap.
      const labelTypes = axis.includes("Covar") ? [axis] : axis == "Row" ? rowLabelTypes : colLabelTypes;
      // For every labeltype that the map has...
      [NullTypeKey].concat(labelTypes).forEach((key) => {
        if (linkoutsDB.has(key)) {
          // Add linkout saved under that key but only if the map has all the required types.
          linkoutsDB.get(key).forEach((linkout) => {
            if (includesAll (labelTypes, linkout.labelType)) {
              addLinkoutToSection (linkout);
            }
          });
        }
      });
    } else if (axis === "Matrix") {
      matrixLinkouts.filter(validRegion).filter(hasAllAxisLabelTypes).forEach((linkout) => {
        grpLinkouts.push({ linkout: linkout });
      });
    } else {
      throw new Error ("populateLabelMenu: Unknown 'axis'", { axis });
    }

    // Helper function.
    // - linkout is of type "Matrix".
    // Returns true iff the heatMap includes all of the linkout's required row and column types.
    function hasAllAxisLabelTypes(linkout) {
      return includesAll (rowLabelTypes, asArray(linkout.rowType)) &&
             includesAll (colLabelTypes, asArray(linkout.colType));
    }

    // Helper function.
    // - linkout is of type "Matrix".
    // Returns true iff the heatMap has a valid selection for the linkout.
    function validRegion (linkout) {
      return linkout.selectType == EMPTY_SELECT ||
             (axisLabelsLength["Row"] > 0 && axisLabelsLength["Column"] > 0);
    }

    // Helper function.
    // - values and required are arrays.
    // Returns true iff values includes all the elements of required.
    function includesAll (values, required) {
      // Remove all required values that are present in values.
      // If none are left, all are included.
      return required.filter((rq) => !values.includes(rq)).length == 0;
    }

    // Helper function: add linkout to either the individual or group linkout sections.
    function addLinkoutToSection (linkout) {
      const section = linkout.selectType == linkouts.SINGLE_SELECT ? indLinkouts : grpLinkouts;
      section.push({ linkout: linkout });
    }

    // *****************************************************************************

    // Populate either the MatrixMenuTable or the axisLabelMenuTable.

    const table =
      axis === "Matrix"
        ? document.getElementById("MatrixMenuTable")
        : document.getElementById(axis + "LabelMenuTable");

    if (axis === "Matrix") {
      grpLinkouts.forEach((linkout) => {
        addMenuItemToTable(heatMap, "Matrix", table, linkout.linkout, true);
      });
    } else {
      const covar = axis.indexOf("Covar") != -1;
      if (!covar) {
        // Always add clipboard link at top of list
        addMenuItemToTable(heatMap, axis, table, grpLinkouts[0].linkout, true);
      }
      const firstGroupLinkout = covar ? 0 : 1;
      if (indLinkouts.length > 0 && LNK.selection !== undefined) {
        let addedHeader = false;
        for (let k = 0; k < indLinkouts.length; k++) {
          addedHeader = addMenuItemToTable(
            heatMap,
            axis,
            table,
            indLinkouts[k].linkout,
            addedHeader,
          );
        }
      }
      if (grpLinkouts.length > firstGroupLinkout) {
        let addedHeader = false;
        for (let l = firstGroupLinkout; l < grpLinkouts.length; l++) {
          if (
            covar &&
            grpLinkouts[l].linkout.title.indexOf("for selected") != -1 &&
            SRCHSTATE.getAxisSearchResults(axis.replace("Covar", "")).length ==
              0
          ) {
            // Don't add the "Copy covariate data for selected rows/columns" to the covariate label menu
            // if there are no selected labels on that axis.
            continue;
          }
          addedHeader = addMenuItemToTable(
            heatMap,
            axis,
            table,
            grpLinkouts[l].linkout,
            addedHeader,
          );
        }
      }
    }
    //Add blank row so links don't overlay close button
    var body = table.getElementsByClassName("labelMenuBody")[0];
    body.insertRow();
  };

  // Helper function. If thing is an array, return thing. Otherwise, return
  // an array containing thing.
  function asArray (thing) {
    return Array.isArray(thing) ? thing : [thing];
  }

  // Helper functions to add header comment lines to help box
  function addTextRowToTable (heatMap, table, type, axis) {
    var body = table.getElementsByClassName("labelMenuBody")[0];
    var row = body.insertRow();
    var cell = row.insertCell();
    if (type === "multi") {
      cell.innerHTML = "<b>Linkouts for entire selection:</b>";
    } else {
      let labelVal = heatMap.getVisibleLabel (LNK.selection, axis);
      labelVal = heatMap.getLabelText(labelVal, axis);
      cell.innerHTML = "<b>Linkouts for: " + labelVal + "</b>";
    }
  };

  function addMenuItemToTable (heatMap, axis, table, linkout, addedHeader) {

    const functionWithParams = function () {
      // this is the function that gets called when the linkout is clicked
      const labels = getLabelsByType(heatMap, linkout, axis);
      if (linkout.callback !== null) linkout.callback(heatMap, labels, axis); // linkout functions will have inputs that correspond to the labelType used in the addlinkout function used to make them.
    };

    const body = table.getElementsByClassName("labelMenuBody")[0];

    //Add indentation to linkout title if the link does not contain the word "clipboard" and it is not a Matrix linkout
    var linkTitle =
      linkout.title.indexOf("clipboard") > 0 && axis !== "Matrix"
        ? linkout.title
        : "&nbsp;&nbsp" + linkout.title;
    if (
      linkout.reqAttributes == null ||
      (linkout.reqAttributes.constructor === Array &&
        linkout.reqAttributes.length === 0)
    ) {
      if (addedHeader === false) {
        //If sub-sectional header has not been added to the popup (before single/multi links) AND a link is being added...put in the header
        if (linkout.selectType === "multiSelection") {
          //Don't add a subsection header for multi links IF only one link has been selected
          if (LNK.hasSelection(axis)) {
            addTextRowToTable(heatMap, table, "multi", axis);
          }
        } else {
          addTextRowToTable(heatMap, table, "ind", axis);
        }
        addedHeader = true;
      }
      if (
        axis !== "Matrix" &&
        !LNK.hasSelection(axis) &&
        linkout.selectType === "multiSelection"
      ) {
        return addedHeader;
      } else {
        var row = body.insertRow();
        var cell = row.insertCell();
        cell.innerHTML = linkTitle;
        cell.addEventListener("click", functionWithParams);
      }
    } else {
      if (typeof linkout.reqAttributes == "string") {
        linkout.reqAttributes = [linkout.reqAttributes];
      }
      var add = false;
      if (linkout.labelType == "ColumnCovar") {
        for (var i = 0; i < linkout.reqAttributes.length; i++) {
          SRCHSTATE.getAxisSearchResults(axis).forEach((j) => {
            var name = heatMap.getColClassificationConfigOrder()[j];
            if (
              heatMap.getColClassificationConfig()[name].data_type ==
              linkout.reqAttributes[i]
            ) {
              add = true;
            }
          });
          if (
            heatMap.getColClassificationConfig()[LNK.selection].data_type ==
            linkout.reqAttributes[i]
          ) {
            add = true;
          }
        }
      } else if (linkout.labelType == "RowCovar") {
        for (var i = 0; i < linkout.reqAttributes.length; i++) {
          SRCHSTATE.getAxisSearchResults(axis).forEach((j) => {
            var name = heatMap.getRowClassificationConfigOrder()[j];
            if (
              heatMap.getRowClassificationConfig()[name].data_type ==
              linkout.reqAttributes[i]
            ) {
              add = true;
            }
          });
          if (
            heatMap.getRowClassificationConfig()[LNK.selection].data_type ==
            linkout.reqAttributes[i]
          ) {
            add = true;
          }
        }
      } else {
        for (var i = 0; i < linkout.reqAttributes.length; i++) {
          if (linkouts.getAttribute(linkout.reqAttributes[i])) {
            add = true;
          }
        }
      }
      if (add) {
        if (addedHeader === false) {
          if (linkout.selectType === "multiSelection") {
            if (LNK.hasSelection(axis)) {
              addTextRowToTable(heatMap, table, "multi", axis);
            }
          } else {
            addTextRowToTable(heatMap, table, "ind", axis);
          }
          addedHeader = true;
        }
        if (
          !LNK.hasSelection(axis) &&
          linkout.selectType === "multiSelection"
        ) {
          return addedHeader;
        } else {
          var row = body.insertRow();
          var cell = row.insertCell();
          cell.innerHTML = linkTitle;
          cell.addEventListener("click", functionWithParams);
        }
      }
    }
    return addedHeader;
  };

  function defineDefaultLinkouts () {

    LNK.addLinkout(
      "Copy selected labels to clipboard",
      [],
      linkouts.MULTI_SELECT,
      copyToClipBoard,
      null,
    );

    LNK.addLinkout(
      "Download covariate data for all columns",
      "ColumnCovar",
      linkouts.MULTI_SELECT,
      downloadEntireClassBar,
      null,
    );
    LNK.addLinkout(
      "Download covariate data for selected columns",
      "ColumnCovar",
      linkouts.MULTI_SELECT,
      downloadPartialClassBar,
      null,
    );
    LNK.addLinkout(
      "Download covariate data for all rows",
      "RowCovar",
      linkouts.MULTI_SELECT,
      downloadEntireClassBar,
      null,
    );
    LNK.addLinkout(
      "Download covariate data for selected rows",
      "RowCovar",
      linkouts.MULTI_SELECT,
      downloadPartialClassBar,
      null,
    );
    LNK.addMatrixLinkout(
      "Copy selected labels to clipboard",
      [], [],
      linkouts.MULTI_SELECT,
      copySelectionToClipboard,
      null,
    );
    LNK.addMatrixLinkout(
      "Download all matrix data to file",
      [], [],
      EMPTY_SELECT,
      downloadAllMatrixData,
      null,
    );
    LNK.addMatrixLinkout(
      "Download selected matrix data to file",
      [], [],
      linkouts.MULTI_SELECT,
      downloadSelectedMatrixData,
      null,
    );
    if (LNK.enableBuilderUploads) {
      LNK.addMatrixLinkout(
        "Upload all NG-CHM data to builder",
        [], [],
        EMPTY_SELECT,
        uploadAllToBuilder,
        null,
      );
      LNK.addMatrixLinkout(
        "Upload selected NG-CHM data to builder",
        [], [],
        linkouts.MULTI_SELECT,
        uploadSelectedToBuilder,
        null,
      );
    }
  };

  // Return and clear a reference to the last canvas on which a label help menu was opened.
  // Used to determine which detail map an operation chosen from that menu should apply to.
  // e.g. which detail map should be zoomed in response to the user picking 'zoom to selection'.
  LNK.getMenuOpenCanvas = function () {
    if (menuOpenCanvas == null) {
      console.error("Canvas on which the menu popup was opened is not set");
      return null;
    }
    const retval = menuOpenCanvas;
    menuOpenCanvas = null;
    return retval;
  };

  //===================//
  // DEFAULT FUNCTIONS //
  //===================//

  function copyToClipBoard (heatMap, labels, axis) {
    window
      .open("", "", "width=335,height=330,resizable=1")
      .document.write(labels.join("<br>"));
  }

  function downloadEntireClassBar(heatMap, labels, covarAxis) {
    const axis = covarAxis == "ColumnCovar" ? "Column" : "Row";
    const axisLabels = heatMap.getAxisLabels(axis)["labels"];
    const classBars = heatMap.getAxisCovariateData(axis);
    const covarData = [];
    covarData.push(["Sample"].concat(labels));
    for (let i = 0; i < axisLabels.length; i++) {
      covarData.push(
        [axisLabels[i]].concat(labels.map((lbl) => classBars[lbl].values[i])),
      );
    }
    const rows = covarData.map((row) => row.join("\t") + "\n");
    downloadSelectedData(heatMap, rows, covarAxis, false);
  }

  function downloadPartialClassBar(heatMap, labels, covarAxis) {
    const axis = covarAxis == "ColumnCovar" ? "Column" : "Row";
    const axisLabels = SRCHSTATE.getSearchLabelsByAxis(axis);
    const labelIndex = SRCHSTATE.getAxisSearchResults(axis);
    const classBars = heatMap.getAxisCovariateData(axis);
    const covarData = [];
    covarData.push(["Sample"].concat(labels));
    for (let i = 0; i < axisLabels.length; i++) {
      covarData.push(
        [axisLabels[i]].concat(
          labels.map((lbl) => classBars[lbl].values[labelIndex[i] - 1]),
        ),
      );
    }
    const rows = covarData.map((row) => row.join("\t") + "\n");
    downloadSelectedData(heatMap, rows, covarAxis, false);
  }

  function copySelectionToClipboard (heatMap, labels, axis) {
    window
      .open("", "", "width=335,height=330,resizable=1")
      .document.write(
        "<b>Rows:</b><br>" +
          labels["Row"].join("<br>") +
          "<br><br><b>Columns:</b><br>" +
          labels["Column"].join("<br>"),
      );
  };

  function uploadAllToBuilder(heatMap, data, axis) {
    uploadToBuilder(heatMap, "all", data, [], []);
  }

  function uploadSelectedToBuilder(heatMap, data, axis) {
    const rowRanges = NgChm.UTIL.getContigRanges(
      NgChm.SRCHSTATE.getAxisSearchResults("Row"),
    );
    const colRanges = NgChm.UTIL.getContigRanges(
      NgChm.SRCHSTATE.getAxisSearchResults("Column"),
    );
    uploadToBuilder(heatMap, "selected", data, rowRanges, colRanges);
  }

  function uploadToBuilder(heatMap, selectType, data, rowSelection, colSelection) {
    const msgBox = UHM.newMessageBox("upload");
    UHM.setNewMessageBoxHeader(
      msgBox,
      "Upload " + selectType + " NG-CHM data to NG-CHM Builder",
    );
    const msgBoxText = UHM.getNewMessageTextBox(msgBox);
    const label = UTIL.newElement(
      "LABEL",
      { for: "builder-url" },
      "NG-CHM Builder URL:",
    );
    const util = UTIL.newElement("INPUT", { name: "builder-url", size: 60 });
    util.value = UTIL.getKeyData("web-builder-url");
    msgBoxText.appendChild(UTIL.newElement("BR"));
    msgBoxText.appendChild(label);
    msgBoxText.appendChild(util);
    msgBoxText.appendChild(UTIL.newElement("BR"));
    msgBoxText.appendChild(UTIL.newElement("BR"));
    UHM.setNewMessageBoxButton(
      msgBox,
      "upload",
      {
        type: "text",
        text: "Upload",
        tooltip: "Upload data to builder",
        default: true,
      },
      () => {
        UTIL.setKeyData("web-builder-url", util.value);
        sendDataToBuilder();
      },
    );
    UHM.setNewMessageBoxButton(msgBox, "cancel", {
      type: "text",
      text: "Cancel",
      tooltip: "Cancel upload",
      default: false,
    });
    UHM.displayNewMessageBox(msgBox);

    if (rowSelection.length == 0)
      rowSelection = [[1, heatMap.getNumRows(MAPREP.DETAIL_LEVEL)]];
    if (colSelection.length == 0)
      colSelection = [[1, heatMap.getNumColumns(MAPREP.DETAIL_LEVEL)]];

    function sendDataToBuilder() {
      const debug = false;
      const nonce = PIM.getNewNonce();
      const url = new URL(util.value.replace(/[/]*[A-Za-z0-9-.]*.html*$/, ""));
      const builder = window.open(
        url.href + "/Upload_Matrix.html?adv=Y&nonce=" + nonce,
        "_blank",
      );
      var established = false;
      var numProbes = 0;

      if (debug) console.log("UploadDataToBuilder", heatMap, data);
      window.addEventListener("message", processMessage, false);
      setTimeout(sendProbe, 50);

      // Send probe messages until we get a response or it appears we never will.
      function sendProbe() {
        if (!established && numProbes < 1200) {
          builder.postMessage({ op: "probe", nonce: nonce }, url.origin);
          numProbes++;
          setTimeout(sendProbe, 50);
        }
      }

      function processMessage(msg) {
        if (msg.data.nonce == nonce) {
          if (debug) console.log("Got message from builder");
          if (msg.source != builder) {
            console.error("Message not from builder", msg, builder);
            return;
          }
          if (msg.data.op == "ready") {
            established = true;
            if (debug) console.log("Established comms with builder");
            // Get access window from first selected index to last selected index
            // for both rows and columns.
            const win = heatMap.getNewAccessWindow({
              layer: heatMap.getCurrentDL(),
              level: MAPREP.DETAIL_LEVEL,
              firstRow: rowSelection[0][0],
              firstCol: colSelection[0][0],
              numRows:
                rowSelection[rowSelection.length - 1][1] -
                rowSelection[0][0] +
                1,
              numCols:
                colSelection[colSelection.length - 1][1] -
                colSelection[0][0] +
                1,
            });
            win.onready((win) => {
              if (debug) console.log("Ready to send tiles");
              const tiles = {
                startRowTile: win.tileWindow.startRowTile,
                startColTile: win.tileWindow.startColTile,
                endRowTile: win.tileWindow.endRowTile,
                endColTile: win.tileWindow.endColTile,
              };
              const ngchm = {
                mapName: heatMap.mapName,
                mapConfig: heatMap.mapConfig,
                mapData: heatMap.mapData,
                currentLayer: heatMap._currentDl,
                tiles: tiles,
                rowSelection: rowSelection,
                colSelection: colSelection,
              };
              // Send the NG-CHM config and summary data and all the tile data.
              builder.postMessage(
                { op: "ngchm", nonce: nonce, ngchm: ngchm },
                url.origin,
              );
              for (
                let row = win.tileWindow.startRowTile;
                row <= win.tileWindow.endRowTile;
                row++
              ) {
                for (
                  let col = win.tileWindow.startColTile;
                  col <= win.tileWindow.endColTile;
                  col++
                ) {
                  const tile = win.tileWindow.getTileData(row, col);
                  const res = builder.postMessage(
                    { op: "ngchm-tile", nonce: nonce, row, col, tile },
                    url.origin,
                  );
                }
              }
              if (debug) console.log("All tiles sent");
              UHM.closeNewMessageBox(msgBox);
            });
          }
        }
      }
    }
  }

  // Rows is an array of tab-separated row data.
  // The first row should be column labels.
  // The first field in each row should be a row label.
  function downloadSelectedData(heatMap, rows, axis, warningShown) {
    try {
      const fileName =
        heatMap.getMapInformation().name + "_" + axis + "_Data.tsv";
      download(fileName, rows, warningShown);
    } catch (error) {
      console.error("Matrix download is too large");
      if (warningShown) {
        UHM.setMessageBoxHeader("Matrix Download Failed");
        UHM.setMessageBoxText(
          "<br>The Matrix download failed, probably because is was too large.<br>",
        );
      }
    }
  }

  function download(filename, text, warningShown) {
    const blob = new Blob(text, { type: "text/plain" });
    const reader = new FileReader();
    reader.onerror = function (e) {
      console.error("Failed to convert to data URL", e, reader);
      throw e;
    };
    reader.onload = function (e) {
      const element = document.createElement("a");
      element.setAttribute("href", reader.result);
      element.setAttribute("download", filename);
      element.style.display = "none";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      if (warningShown) {
        UHM.messageBoxCancel();
      }
    };
    reader.readAsDataURL(blob);
  }

  LNK.switchPaneToLinkouts = function switchPaneToLinkouts(loc) {
    PANE.clearExistingDialogs(loc.pane.id);
    const oldLinkoutPane =
      LNK.linkoutElement && PANE.findPaneLocation(LNK.linkoutElement);
    if (
      oldLinkoutPane &&
      oldLinkoutPane.paneTitle &&
      oldLinkoutPane.paneTitle.innerText === "Linkouts"
    ) {
      PANE.setPaneTitle(oldLinkoutPane, "Empty");
    }
    PANE.emptyPaneLocation(loc);
    LNK.linkoutElement = UTIL.newElement("DIV.linkouts");
    PANE.setPaneTitle(loc, "Linkouts");
    loc.pane.appendChild(LNK.linkoutElement);
    MMGR.getHeatMap().saveLinkoutPaneToMapConfig(loc.pane.id, "", "Linkouts");
  };
  PANE.registerPaneContentOption("Linkouts", LNK.switchPaneToLinkouts);

  // Maintain a database of installed pane plugins.
  //
  (function () {
    const panePlugins = [];

    class PanePlugin {
      constructor({ name = "", helpText = "", params = {}, src = "" } = {}) {
        Object.assign(this, { name, helpText, params, src });
      }
    }

    LNK.registerPanePlugin = function (p) {
      const pp = new PanePlugin(p);
      // Replace any existing plugin with the same name.
      for (let idx = 0; idx < panePlugins.length; idx++) {
        if (panePlugins[idx].name === pp.name) {
          panePlugins[idx] = pp;
          return pp;
        }
      }
      // Add new pane plugin if no plugin with the same name already exists.

      // If the plugin handles special coordinates, add them as separate plugins.
      if (pp.params.handlesSpecialCoordinates === true) {
        let specialCoordinates = getSpecialCoordinatesList();
        if (specialCoordinates.length === 0) { // no special coordinates in NG-CHM, so treat like regular plugin
          panePlugins.push(pp);
          return pp;
        }
        pp.disabled = true; /* disable because functionality of plugin will be handled by the "generalPlugin" sub item below*/
        panePlugins.push(pp);
        /* Create a plugin for each of the special coordinates */
        specialCoordinates.forEach((sc) => {
          let specialPlugin = deepClone(pp);
          specialPlugin.name = pp.name + ": " + sc.name + " (" + sc.rowOrColumn + ")";
          specialPlugin.nameInPaneMenu = sc.name + " (" + sc.rowOrColumn + ")";
          specialPlugin.disabled = false;
          specialPlugin.rowOrColumn = sc.rowOrColumn;
          specialPlugin.specialCoordinates = sc;
          specialPlugin.subItem = true;
          panePlugins.push(specialPlugin);
        })
        let generalPlugin = deepClone(pp);
        generalPlugin.name = pp.name + ": Other ...";
        generalPlugin.nameInPaneMenu = "Other ...";
        generalPlugin.disabled = false;
        generalPlugin.subItem = true;
        panePlugins.push(generalPlugin);
      } else {
        panePlugins.push(pp);
      }
      return pp;
    };

    LNK.getPanePlugins = function () {
      return Array.from(new Set(panePlugins.map((a) => a.name))).map((name) => {
        return panePlugins.find((a) => a.name === name);
      });
    };
  })();

  /**
   * Creates a deep copy of the provided object or array.
   *
   * @param {Object|Array} obj - The object or array to be deep cloned.
   * @returns {Object|Array} A deep copy of the provided object or array.
   */
   function deepClone(obj) {
     if (obj === null || typeof obj !== "object") {
       return obj;
     }
     if (Array.isArray(obj)) {
       return obj.map(deepClone);
     }
     const clone = {};
     for (let key in obj) {
       if (obj.hasOwnProperty(key)) {
         clone[key] = deepClone(obj[key]);
       }
     }
     return clone;
   }
  // Switch the empty pane identified by PaneLocation loc to a new
  // instance of the specified panel plugin.
  LNK.switchPaneToPlugin = function (loc, plugin, restoreInfo) {
    if (restoreInfo) {
      pluginRestoreInfo[loc.pane.id] = restoreInfo;
    }
    switchToPlugin(loc, plugin.name);
    MMGR.getHeatMap().setUnAppliedChanges(true);
    const params = plugin.params;
    if (!params) {
      const help = UTIL.newElement("DIV.linkouts");
      help.innerText = plugin.helpText;
      loc.pane.appendChild(help);
      return;
    }

    const linkoutElement = UTIL.newElement("DIV.linkouts");
    loc.pane.dataset.pluginName = plugin.name;
    loc.paneTitle.innerText = plugin.name;
    loc.pane.appendChild(linkoutElement);

    let pluginIframe = PIM.createPluginInstance("panel-plugin", plugin);
    linkoutElement.appendChild(pluginIframe);
  };

  // Start bunch of private helper functions for collecting/packaging data to send to plugin

  /* For a discrete covariate, return array of hex colors for each value
	   Inputs:
	      axis: 'row' or 'column'
	      label: name of covariate bar
	      values: array of values for covariate bar
	   Outputs:
	      valColors: array of hex color values corresponding to input 'values'
	*/
  function getDiscCovariateColors(axis, label, values, colorMapMgr) {
    const colorMap = colorMapMgr.getColorMap(axis, label);
    const uniqueClassValues = Array.from(new Set(values));
    const classColors = [];
    for (let i = 0; i < uniqueClassValues.length; i++) {
      if (uniqueClassValues[i] !== "!CUT!") {
        classColors.push({
          Class: uniqueClassValues[i],
          Color: CMM.darkenHexColorIfNeeded(
            colorMap.getRgbToHex(
              colorMap.getClassificationColor(uniqueClassValues[i]),
            ),
          ),
        });
      }
    }
    // for each of the values input, get the corresponding class color to return
    var valColors = []; // array of colors for each value
    var tmpColor;
    values.forEach((val) => {
      tmpColor = classColors.filter((cc) => {
        return cc.Class == val;
      });
      if (tmpColor.length != 1) {
        console.error("Error getting color for discrete covariate");
        tmpColor = [{ Color: "#000000" }];
      }
      valColors.push(tmpColor[0].Color);
    });
    return { classColors, colors: valColors };
  }

  /* Return object of class values (list of values)  and corresponding hex colors (list of hex colors)
	 Input:
	     cfg:
	     vals: array of values
	 Output:
	   {
	     values: array of class values (the 'Class' corresponding to each of 'vals')
	     colors: array of corresponding hex colors (the 'Color' for the 'Class' of each of the 'vals')
	   }
	*/
  function getContCovariateColors(cfg, vals) {
    const { breaks, classColors } = getDiscMapFromContMap(
      cfg.color_map.thresholds,
      cfg.color_map.colors,
    );
    // get list of Class values for each of vals:
    const valClasses = getValueClassesColors(
      vals,
      breaks,
      classColors,
      cfg.color_map.missing,
      "Class",
    );
    // get list of corresponding hex colors for each of vals:
    const valColors = getValueClassesColors(
      vals,
      breaks,
      classColors,
      cfg.color_map.missing,
      "Color",
    );
    return {
      values: valClasses,
      colors: valColors,
      colorMap: getVanodiColorMap(
        cfg.color_map.thresholds,
        cfg.color_map.colors,
      ),
    };
  }

  function getVanodiColorMap(thresholds, colors) {
    const classColors = [];
    for (let idx = 0; idx < thresholds.length; idx++) {
      if (thresholds[idx] !== "!CUT!") {
        classColors.push({ Class: thresholds[idx], Color: colors[idx] });
      }
    }
    return classColors;
  }

  // Return an array of values for the rows/columns specified by idx along axis.
  function getDataValues(axis, idx) {
    const heatMap = MMGR.getHeatMap();
    const isRow = MMGR.isRow(axis);
    const colorMap = heatMap.getCurrentColorMap();
    const colorThresholds = colorMap.getThresholds();
    idx = idx === undefined ? [] : Array.isArray(idx) ? idx : [idx];
    const values = [];
    const rawValues = [];
    const rawCounts = [];
    let numRows = isRow ? 1 : heatMap.getNumRows(MAPREP.DETAIL_LEVEL);
    let numCols = isRow ? heatMap.getNumColumns(MAPREP.DETAIL_LEVEL) : 1;
    for (let j = 0; j < numRows; j++) {
      for (let i = 0; i < numCols; i++) {
        rawValues.push(0.0);
        rawCounts.push(0);
      }
    }
    let accessWindowPromises = [];
    for (let dd = 0; dd < idx.length; dd++) {
      let win = {
        layer: heatMap.getCurrentDL(),
        level: MAPREP.DETAIL_LEVEL,
        firstRow: 1,
        firstCol: 1,
        numRows: numRows,
        numCols: numCols,
      };
      if (isRow) win.firstRow = idx[dd];
      else win.firstCol = idx[dd];
      accessWindowPromises.push(heatMap.getNewAccessWindow(win).onready());
    }
    return new Promise((resolve, reject) => {
      Promise.all(accessWindowPromises).then((accessWindows) => {
        try {
          accessWindows.forEach((accessWindow) => {
            for (let j = 0; j < accessWindow.win.numRows; j++) {
              for (let i = 0; i < accessWindow.win.numCols; i++) {
                const val = accessWindow.getValue(
                  j + accessWindow.win.firstRow,
                  i + accessWindow.win.firstCol,
                );
                if (
                  !isNaN(val) &&
                  val > MAPREP.minValues &&
                  val < MAPREP.maxValues
                ) {
                  rawValues[j * accessWindow.win.numCols + i] += val;
                  rawCounts[j * accessWindow.win.numCols + i]++;
                }
              }
            }
          });
          for (let i = 0; i < rawValues.length; i++) {
            values.push(rawCounts[i] === 0 ? NaN : rawValues[i] / rawCounts[i]);
          }
          resolve(values);
        } catch (error) {
          reject(error);
        }
      });
    });
  } // end function getDataValues

  /*  Function to return mean, variance, and number of items in a group of rows/columns

	    Returns mean, variance, and number of items for each
	    Inputs:
	        axis: 'column' or 'row'.
	        idx: list of indexes in column or row with data of interest
	    Exmple:  axis = 'column' and idx = ['1', '2', '3'] means we are looking at
	             the data in the first, second, and third columns of the heatmap.
	    Output:
	        summaryStatistics: a list of objects, each object having a mean, variance,
	             and number of items.
	    Example: if the input is axis = 'column' and idx = ['1', '2', '3'], this means we
	             are looking at the first, second, and third columns in the heatmap. The output
	             will be a list of objects, one entry for each ROW in the heatmap. Each object
	             will have the mean, variance, and number of entries (there might be missing data)
	             for a row in the heatmap of the first three columns.
	*/
  /* If axis == 'row' axisIdx = indices of the rows to summarize, groupIdx = indices of columns to include.
   * Result will a vector with one value for each axisIdx value.
   */
  function getSummaryStatistics(axis, axisIdx, groupIdx) {
    const heatMap = MMGR.getHeatMap();
    const isRow = MMGR.isRow(axis);
    axisIdx =
      axisIdx === undefined ? [] : Array.isArray(axisIdx) ? axisIdx : [axisIdx];
    groupIdx =
      groupIdx === undefined
        ? []
        : Array.isArray(groupIdx)
          ? groupIdx
          : [groupIdx];
    const values = [];
    // Both axisIdx and groupIdx can be disjoint.
    // TODO: Improve efficiency by grouping adjacent indices.
    let accessWindowPromises = [];
    for (let i = 0; i < axisIdx.length; i++) {
      // Get access window for each axisIdx (one vector per iteration)
      const win = {
        layer: heatMap.getCurrentDL(),
        level: MAPREP.DETAIL_LEVEL,
        firstRow: isRow ? 1 + axisIdx[i] : 1,
        firstCol: isRow ? 1 : 1 + axisIdx[i],
        numRows: isRow ? 1 : heatMap.getNumRows(MAPREP.DETAIL_LEVEL),
        numCols: isRow ? heatMap.getNumColumns(MAPREP.DETAIL_LEVEL) : 1,
      };
      accessWindowPromises.push(heatMap.getNewAccessWindow(win).onready());
    }
    return new Promise((resolve, reject) => {
      Promise.all(accessWindowPromises)
        .then((accessWindows) => {
          accessWindows.forEach((accessWindow) => {
            const thisVec = [];
            // Iterate over groupIdx to get vector of values from heatmap for summarization.
            if (isRow) {
              for (let j = 0; j < groupIdx.length; j++) {
                const val = accessWindow.getValue(
                  accessWindow.win.firstRow,
                  1 + groupIdx[j],
                );
                thisVec.push(val);
              }
            } else {
              for (let j = 0; j < groupIdx.length; j++) {
                const val = accessWindow.getValue(
                  1 + groupIdx[j],
                  accessWindow.win.firstCol,
                );
                thisVec.push(val);
              }
            }
            var statsForVec = getStats(thisVec);
            values.push(statsForVec);
          });
          resolve(values);
        })
        .catch((error) => {
          reject(error);
        });
    });
  } // end function getSummaryStatistics

  function getDiscMapFromContMap(colorThresholds, colorVec) {
    colorVec = colorVec.map(CMM.darkenHexColorIfNeeded);
    const precision =
      colorThresholds
        // Determine length of each threshold, excluding any minus sign, leading zero, period, or exponent.
        .map(
          (t) =>
            ("" + t)
              .replace("-", "")
              .replace(/^0*/, "")
              .replace(".", "")
              .replace(/[eE]\d*/, "").length,
        )
        // Get longest length and increase by 1.
        .reduce((m, l) => (l > m ? l : m), 0) + 1;
    const iColorVec = [colorVec[0]];
    const iColorThresholds = [+colorThresholds[0]];
    for (let i = 1; i < colorVec.length; i++) {
      iColorVec.push(CMM.blendHexColors(colorVec[i - 1], colorVec[i], 0.75));
      iColorThresholds.push(
        (3 * colorThresholds[i - 1] + +colorThresholds[i]) / 4.0,
      );
      iColorVec.push(CMM.blendHexColors(colorVec[i - 1], colorVec[i], 0.5));
      iColorThresholds.push(
        (+colorThresholds[i - 1] + +colorThresholds[i]) / 2.0,
      );
      iColorVec.push(CMM.blendHexColors(colorVec[i - 1], colorVec[i], 0.25));
      iColorThresholds.push(
        (+colorThresholds[i - 1] + 3 * colorThresholds[i]) / 4.0,
      );
      iColorVec.push(colorVec[i]);
      iColorThresholds.push(+colorThresholds[i]);
    }
    const classColors = [];
    const breaks = [];
    for (let i = 0; i < iColorVec.length; i++) {
      classColors.push({
        Class: iColorThresholds[i].toPrecision(precision),
        Color: iColorVec[i],
      });
      if (i > 0) {
        breaks.push((iColorThresholds[i - 1] + iColorThresholds[i]) / 2.0);
      }
    }
    return { breaks, classColors };
  } // end function getDiscMapFromContMap

  /* Map the continuous values into discrete classColors according to breaks.
	 If values contains at least one NA, "NA" is added to classColors.
	 Returns either Class value or Color value based on 'wantClassOrColor'
	    Inputs:
	       values: array of values
	       breaks: array of breakpoints from heatmap
	       classColors:
	       naColor:
	       wantClassOrColor: string. Either 'Class' or 'Color.
	    Outputs:
	       array of classes or hex color values. One for each of input 'values'
	*/
  function getValueClassesColors(
    values,
    breaks,
    classColors,
    naColor,
    wantClassOrColor,
  ) {
    if (wantClassOrColor != "Class" && wantClassOrColor != "Color") {
      console.error("must request 'Class' or 'Color'");
      return;
    }
    let firstNaN = true;
    return values.map((val) => {
      let k = -1;
      if (isNaN(val)) {
        if (firstNaN) {
          classColors.push({
            Class: "NA",
            Color: naColor,
          });
          firstNaN = false;
        }
        return "NA";
      } else if (val <= breaks[0]) {
        k = 0;
      } else if (breaks[breaks.length - 1] <= val) {
        k = breaks.length;
      } else {
        k = 1;
        while (val >= breaks[k]) k++;
      }
      if (wantClassOrColor == "Class") {
        return classColors[k].Class;
      } else {
        return classColors[k].Color;
      }
    });
  }

  function getDataColors(axis, idx) {
    const heatMap = MMGR.getHeatMap();
    const colorMap = heatMap.getCurrentColorMap();
    const { breaks, classColors } = getDiscMapFromContMap(
      colorMap.getThresholds(),
      colorMap.getColors(),
    );
    const values = getDataValues(axis, idx);
    const valClasses = getValueClassesColors(
      values,
      breaks,
      classColors,
      colorMap.getMissingColor(),
      "Class",
    );
    return { values: valClasses, colors: classColors };
  }
  // end bunch of helper functions

  LNK.initializePanePlugin = async function (nonce, config) {
    const heatMap = MMGR.getHeatMap();
    const data = {
      axes: [],
    };
    for (let ai = 0; ai < config.axes.length; ai++) {
      const axis = config.axes[ai];
      const axisName = MMGR.isRow(axis.axisName) ? "Row" : "Column";
      const fullLabels = heatMap.getAxisLabels(axisName).labels;
      const searchItemsIdx = SRCHSTATE.getAxisSearchResults(axisName);
      let selectedLabels = [];
      for (let i = 0; i < searchItemsIdx.length; i++) {
        let selectedLabel = fullLabels[searchItemsIdx[i] - 1];
        selectedLabel =
          selectedLabel.indexOf("|") !== -1
            ? selectedLabel.substring(0, selectedLabel.indexOf("|"))
            : selectedLabel;
        selectedLabels.push(selectedLabel);
      }
      const gapIndices = [];
      fullLabels.forEach((value, index) => {
        if (value === "") gapIndices.push(index);
      });
      data.axes.push({
        fullLabels: filterGaps(fullLabels, gapIndices),
        actualLabels: filterGaps(heatMap.actualLabels(axisName), gapIndices),
        selectedLabels: selectedLabels,
      });
      for (let idx = 0; idx < axis.cocos.length; idx++) {
        await setAxisCoCoData(data.axes[ai], axis, axis.cocos[idx], gapIndices);
      }
      for (let idx = 0; idx < axis.groups.length; idx++) {
        setAxisGroupData(data.axes[ai], axis, axis.groups[idx]);
      }
    }
    heatMap.setUnAppliedChanges(true);
    PIM.sendMessageToPlugin({ nonce, op: "plot", config, data });
    heatMap.saveDataSentToPluginToMapConfig(nonce, config, data);
  }; // end of initializePanePlugin

  function filterGaps(data, gapIndices) {
    return data.filter((value, index) => !gapIndices.includes(index));
  }

  /**
		Using information in msg about which tests to perform, performs statistical tests and returns results.

		Called from vanodiSendTestData

		@function getAxisTestData
		@param {Object} msg same format as vanodiSendTestData
		@return {Object} cocodata
		@option {Array<String>} labels NGCHM / plugin labels
		@option {Array<>} results Array of results. Below describes an example element

						{
							'colorMap': {
							              'colors': Array of hex colors
							              'missing': color for missing
							              'thresholds': thresholds for the color map
							            },
							'label': string name for the test
							'values': array of numerical results of the test
						}
	*/
  // Keys in msg:
  // axisName: 'row',
  // axisLabels: labels of nodes from plugin (e.g. gene symbols from PathwayMapper)
  // testToRun: name of test to run
  // group1: labels of other axis elements in group 1
  // group2: labels of other axis elements in group 2 (optional)
  async function getAxisTestData(msg) {
    if (msg.axisLabels.length < 1) {
      UHM.systemMessage(
        "NG-CHM PathwayMapper",
        "No pathway present in PathwayMapper. Please import or create a pathway and try again.",
      );
      return false;
    }
    const heatMap = MMGR.getHeatMap();
    var otherAxisName = MMGR.isRow(msg.axisName) ? "column" : "row";
    var otherAxisLabels = heatMap.actualLabels(otherAxisName);
    var heatMapAxisLabels = heatMap.actualLabels(msg.axisName); //<-- axis labels from heatmap (e.g. gene names in heatmap)
    heatMapAxisLabels = heatMapAxisLabels.map((l) => l.toUpperCase());
    var axisIdx = [];
    const pluginLabels = [];
    for (let i = 0; i < msg.axisLabels.length; i++) {
      let idx = heatMapAxisLabels.indexOf(msg.axisLabels[i].toUpperCase());
      if (idx !== -1) {
        axisIdx.push(idx);
        pluginLabels.push(msg.axisLabels[i]);
      }
    }
    if (axisIdx.length < 1) {
      UHM.systemMessage(
        "NG-CHM PathwayMapper",
        "Heatmap and pathway have no genes in common.",
      );
      return;
    }
    var idx1 = [];
    var idx2 = [];
    if (msg.group2 == null || msg.group2.length == 0) {
      for (let i = 0; i < otherAxisLabels.length; i++) {
        if (msg.group1.indexOf(otherAxisLabels[i]) === -1) {
          idx2.push(i);
        } else {
          idx1.push(i);
        }
      }
    } else {
      for (let i = 0; i < otherAxisLabels.length; i++) {
        if (msg.group1.indexOf(otherAxisLabels[i]) !== -1) {
          idx1.push(i);
        }
        if (msg.group2.indexOf(otherAxisLabels[i]) !== -1) {
          idx2.push(i);
        }
      }
    }
    if (idx1.length < 2) {
      UHM.systemMessage(
        "Group too small",
        "Group 1 must have at least 2 members.",
      );
      return false;
    } else if (idx2.length < 2) {
      UHM.systemMessage(
        "Group too small",
        "Group 2 must have at least 2 members.",
      );
      return false;
    }
    var summaryStatistics1 = await getSummaryStatistics(
      msg.axisName,
      axisIdx,
      idx1,
    );
    var summaryStatistics2 = await getSummaryStatistics(
      msg.axisName,
      axisIdx,
      idx2,
    );

    var cocodata = {
      labels: [],
      results: [],
    };

    if (msg.testToRun === "Mean") {
      const heatMap = MMGR.getHeatMap();
      const colorMap = heatMap.getCurrentColorMap();
      const vColorMap = {
        thresholds: colorMap.getThresholds(),
        colors: colorMap.getColors().map(CMM.darkenHexColorIfNeeded),
        type: "linear",
        missing: "#fefefe",
      };
      cocodata.results.push({
        label: "mean",
        values: [],
        colorMap: vColorMap,
      });
      for (let i = 0; i < axisIdx.length; i++) {
        const summary1 = summaryStatistics1[i];
        cocodata.labels.push(pluginLabels[i]);
        if (msg.group2 == null || msg.group2.length == 0) {
          cocodata.results[0].values.push(summary1.mu);
        } else {
          const summary2 = summaryStatistics2[i];
          cocodata.results[0].values.push(summary1.mu - summary2.mu);
        }
      }
    } else if (msg.testToRun === "T-test") {
      cocodata.results.push({
        label: "t_statistics",
        values: [],
        colorMap: {
          type: "linear",
          thresholds: [-3.291, -1.96, 1.96, 3.291],
          colors: ["#1c2ed4", "#cbcff7", "#f9d4d4", "#d41c1c"],
          missing: "#fefefe",
        },
      });
      cocodata.results.push({
        label: "p_values",
        values: [],
        colorMap: {
          type: "linear",
          thresholds: [0.001, 0.05, 1],
          colors: ["#fefefe", "#777777", "#000000"],
          missing: "#fefefe",
        },
      });

      for (let i = 0; i < axisIdx.length; i++) {
        const summary1 = summaryStatistics1[i];
        const summary2 = summaryStatistics2[i];
        const tvalue = Welch_tValue(summary1, summary2);
        const dof = degreesOfFreedom(summary1, summary2);
        const pvalue = pValue(tvalue, dof);
        cocodata.labels.push(pluginLabels[i]);
        cocodata.results[0].values.push(tvalue);
        cocodata.results[1].values.push(pvalue);
      }
    }
    //console.log ({ m: '< getAxisTestData', msg, cocodata });
    return cocodata;
  } // end function getAxisTestData

  // Add the values and colors to cocodata for the 'coco' attributes of axis.
  // Currently, 'coco' is either coordinate or covariate.
  async function setAxisCoCoData(cocodata, axis, coco, gapIndices) {
    const heatMap = MMGR.getHeatMap();
    const colorMapMgr = heatMap.getColorMapManager();
    const colClassificationData = heatMap.getAxisCovariateData("column");
    const rowClassificationData = heatMap.getAxisCovariateData("row");
    const isRow = MMGR.isRow(axis.axisName);
    const covData = isRow ? rowClassificationData : colClassificationData;
    const axisCovCfg = heatMap.getAxisCovariateConfig(axis.axisName);
    const valueField = coco + "s";
    const colorField = coco + "Colors";
    const colorMapField = coco + "ColorMap";
    cocodata[valueField] = [];
    cocodata[colorField] = [];
    cocodata[colorMapField] = [];
    for (let ci = 0; ci < axis[valueField].length; ci++) {
      const ctype = axis[valueField][ci].type; // one of 'covariate' (i.e. from covariate bar) or 'data' (i.e. from map values)
      const label = axis[valueField][ci].covName;
      if (ctype === "covariate") {
        // i.e. from one of the covariate bars
        if (axisCovCfg.hasOwnProperty(label)) {
          const cfg = axisCovCfg[label];
          const values = filterGaps(covData[label].values, gapIndices);
          if (cfg.color_map.type === "continuous") {
            // i.e. from covariate bar w/ continuous values
            const { classValues, colors, colorMap } = getContCovariateColors(
              cfg,
              values,
            );
            cocodata[colorMapField].push(colorMap);
            cocodata[colorField].push(colors); // the color corresponding to the 'Class' for each value
            cocodata[valueField].push(values); // the actual values (not 'Class' values)
          } else {
            // i.e. from covariate bar w/ discrete values
            const { classColors, colors } = getDiscCovariateColors(
              axis.axisName,
              label,
              values,
              colorMapMgr,
            );
            cocodata[colorMapField].push(classColors);
            cocodata[colorField].push(colors);
            cocodata[valueField].push(values);
          }
        } else {
          console.log(
            "heatmap " + axis.axisName + " axis: no such covariate: " + label,
          );
        }
      } else if (ctype === "data") {
        // i.e. from selections on the map values
        const idx = axis[valueField][ci].labelIdx;
        let unfilteredValues = await getDataValues(
          isRow ? "column" : "row",
          idx,
        );
        const values = filterGaps(unfilteredValues, gapIndices);
        cocodata[valueField].push(values);
        const colorMap = heatMap.getCurrentColorMap();

        const colorsForThisData = [];
        for (let idv = 0; idv < values.length; idv++) {
          colorsForThisData.push(
            CMM.darkenHexColorIfNeeded(
              colorMap.getRgbToHex(colorMap.getColor(values[idv])),
            ),
          );
        }
        cocodata[colorMapField].push(
          getVanodiColorMap(
            colorMap.getThresholds(),
            colorMap.getColors().map(CMM.darkenHexColorIfNeeded),
          ),
        );
        cocodata[colorField].push(colorsForThisData);
      } else {
        console.log("Unknown coco data type " + ctype);
      }
    }
    if (axis.covariates[0].covName === "All Black") { // add dummy data for 'All Black' option
      let allBlackColorMap = {
        Class: "All Black",
        Color: "#000000",
      }
      let allBlackColors = Array.from({length: heatMap.getTotalElementsForAxis(axis.axisName)}, () => "#000000");
      let allBlackCovariate = Array.from({length: heatMap.getTotalElementsForAxis(axis.axisName)}, () => "All Black");
      cocodata["covariateColorMap"] = [];
      cocodata["covariateColorMap"].push([allBlackColorMap]);
      cocodata["covariateColors"] = [];
      cocodata["covariateColors"].push(allBlackColors);
      cocodata["covariates"] = [];
      cocodata["covariates"].push(allBlackCovariate);
    }
    //console.log ({ m: 'setAxisCoCoData', axis, coco, cocodata });
  }

  /**
		Pushes user-specified group labels and NGCHM labels for group members to cocodata object.

		As an example, if 'group' = 'ugroup', then the following will be added to the cocodata object:

				[
					{
						'grouplabels': Array of strings to label each of the groups. length = 2. E.g. ['my group 1', 'my group 2']
						'labels': Array of arrays of strings. Each array will have the NGCHM labels of the items in 
						        each group. E.g. [['sample1', 'sample2'], ['sample5', 'sample9']]
					}
				]

		@function setAxisGroupData
		@param {object} cocodata
		@option {Array<String>} actualLabels The actual labels from the NGCHM
		@option {Array<String>} fullLabels The full labels from the NGCHM
		@param {object} axis
		@option {String} axisName 'column' or 'row
		@option {Array<String>} cocos Array of strings that are names for coordinates or covariates. For each item in this array, an additional key will be present in axis, with an 's' added to the name. For example if axis.cocos = ['coordinate','covariate'] then there are two additional keys for axis: 'coordinates' and 'covariates'.
		@option {Array<>} [coordinates] Present only if 'coordinate' is an element of axisName.cocos
		@option {Array<>} [covariates] Present only if 'covariate' is an element of axisName.cocos
		@option {Array<>} data
		@option {Array<String>} groups Array of string that are names for groups. Similar to axis.cocos, for each item in this array,an additional key will be present in axis, with and 's' added to the name. For example, if axis.groups = ['ugroup'] then there will be an additional key to axis: 'ugroups'
		@option {Array<>} [ugroups] Present only if the 'ugroup' is an element of axisName.groups. Describes the groups for 
		                            the statistical tests. Below is a brief description of the elements in the object

			[ 
				{
					'covName': if present, name of covariate choosen
					'labelIdx': Array of length two (one for each group). Each array has the label index from the NGCHM of the items in the groups
					'labels': User-specified labels for each group
					'selectValue': covariate selected. How this is different from covName, I am not sure
					'type': 'covariate' or 'data'. 'covariate' seems to be for when a covariate is choosen from the selector dropdown, 
					      'data' seems to be for when the GRAB/SHOW buttons are being used.
				}
			]

		@param {String} group In this example, 'ugroup'
	*/
  function setAxisGroupData(cocodata, axis, group) {
    const heatMap = MMGR.getHeatMap();
    const colClassificationData = heatMap.getAxisCovariateData("column");
    const rowClassificationData = heatMap.getAxisCovariateData("row");
    const isRow = MMGR.isRow(axis.axisName);
    const covData = isRow ? rowClassificationData : colClassificationData;
    const axisCovCfg = heatMap.getAxisCovariateConfig(axis.axisName);
    const valueField = group + "s";
    cocodata[valueField] = [];
    for (let ci = 0; ci < axis[valueField].length; ci++) {
      const ctype = axis[valueField][ci].type; // one of 'covariate' (i.e. from covariate bar) or 'data' (i.e. from map values)
      const label = axis[valueField][ci].covName;
      if (ctype === "covariate") {
        // i.e. from one of the covariate bars
        if (axisCovCfg.hasOwnProperty(label)) {
          const cfg = axisCovCfg[label];
          if (cfg.color_map.type === "continuous") {
            // i.e. from covariate bar w/ continuous values
            const idx = axis[valueField][ci].labelIdx;
            const labels = idx.map((y) =>
              y.map((x) => cocodata.fullLabels[parseInt(x)]),
            );
            cocodata[valueField].push({
              grouplabels: axis[valueField][ci].labels,
              labels,
            });
          } else {
            // i.e. from covariate bar w/ discrete values
            const idx = axis[valueField][ci].labelIdx;
            const labels = idx.map((y) =>
              y.map((x) => cocodata.fullLabels[parseInt(x)]),
            );
            cocodata[valueField].push({
              grouplabels: axis[valueField][ci].labels,
              labels,
            });
          }
        } else {
          console.log(
            "heatmap " + axis.axisName + " axis: no such covariate: " + label,
          );
        }
      } else if (ctype === "data") {
        // i.e. from selections on the map values (GRAB/SHOW buttons)
        const idx = axis[valueField][ci].labelIdx;
        const labels = idx.map((y) =>
          y.map((x) => cocodata.fullLabels[parseInt(x) - 1]),
        );
        cocodata[valueField].push({
          grouplabels: axis[valueField][ci].labels,
          labels,
        });
      } else {
        console.log("Unknown group data type " + ctype);
      }
    }
  }

  // Create a gear dialog for the pane identified by the DOM element icon.
  LNK.newGearDialog = newGearDialog;
  function newGearDialog(icon, paneId) {
    const debug = false;
    const loc = PANE.findPaneLocation(icon);
    if (
      !loc ||
      !loc.pane ||
      loc.pane.getElementsByTagName("IFRAME").length == 0
    ) {
      console.log("No options"); //alert
      return;
    }

    const iframe = loc.pane.getElementsByTagName("IFRAME")[0];
    const nonce = iframe.dataset.nonce;
    const { plugin, params } = PIM.getPluginInstance(nonce);
    if (debug) console.log({ m: "newGearDialog", loc, plugin, params });

    const config = plugin.config;
    let lastApplied = params.lastApplied;
    if (lastApplied === undefined) {
      lastApplied = [];
      lastApplied.push({ rangeStrings: ["", ""] });
    }
    //Remove any other open gear panels
    removeOpenGearPanels();

    let panel = UTIL.newElement("DIV.gearPanel");
    panel.id = paneId + "Gear";

    function removeOpenGearPanels() {
      const gears = document.getElementsByClassName("gearPanel");
      for (let item of gears) {
        const paneId = item.id.substring(0, item.id.indexOf("Gear"));
        PANE.clearExistingDialogs(paneId);
      }
    }

    function optionNode(type, value, disabled = false) {
      const optNode = UTIL.newElement("OPTION");
      optNode.appendChild(UTIL.newTxt(value));
      optNode.dataset.type = type;
      if (disabled) optNode.disabled = true;
      return optNode;
    }

    /** Creates text for option to use GRAB/SHOW */
    function selectedElementsOptionName(axis, uname) {
      return "Selected " + (MMGR.isRow(axis) ? "columns" : "rows") + uname;
    }

    /**
     * Adds covariate options to select element (e.g. in gear menu)
     *
     * @function addCovariateOptions
     * @param {string|null} defaultOptText - Text of default option to be selected. If null, Grap/Show option is selected.
     * @param {Object} covariatesConfig - Covariates info, e.g. output of `heatMap.getAxisCovariateConfig()`
     * @param {HTMLSelectElement} selectElement - The select element to which the options will be added.
     * @param {string} grabshowOptText - The text to display for user to select rows/cols via GRAB/SHOW.
     * @param {boolean} onlyContinuous - If true, only continuous covariates are added.
     * @param {boolean} addAllBlackOption - If true, an "All Black" option is added to the dropdown.
     * @returns {HTMLOptionElement} The option element for user to select rows/cols via GRAB/SHOW.
     */
    function addCovariateOptions(
      defaultOptText,
      covariatesConfig,
      selectElement,
      grabShowOptText,
      onlyContinuous,
      addAllBlackOption = false,
    ) {
      let defaultIndex = 0;
      let covariatesForDropDown = [];
      if (plugin.hasOwnProperty("specialCoordinates") &&
          plugin.specialCoordinates.hasOwnProperty("name") &&
          onlyContinuous
        ) { // put only continuous special coordinates in dropdown
        covariatesForDropDown = Object.fromEntries(
          Object.entries(covariatesConfig).filter(([cvText, cvProperties]) =>
            cvText.includes(plugin.specialCoordinates.name)
          )
        );
      } else { // put all covariates in dropdown
        covariatesForDropDown = covariatesConfig;
      }
      if (addAllBlackOption == true) {
        covariatesForDropDown["All Black"] = { // Add an "All Black" option for dropdown
          "color_map": {
            "type": "discrete",
            "colors": ["#FFFFFF"],
            "thresholds": ["All Black"],
            "missing": "#FFFFFF",
          }
        }
      }
      for (let [cvText, cvProperties] of Object.entries(covariatesForDropDown)) {
        if (cvText === defaultOptText) {
          defaultIndex = selectElement.children.length;
        }
        if (cvProperties.color_map.type === "continuous") {
          selectElement.add(optionNode("covariate", cvText));
        } else if (!onlyContinuous) {
          selectElement.add(optionNode("covariate", cvText));
        }
      }
      let allBlackOpt = Array.from(selectElement.children).filter((opt) => opt.text === "All Black");
      if (defaultOptText === null && allBlackOpt.length > 0) {
        let allBlackOptIndex = Array.from(selectElement.children).findIndex((opt) => opt.text === "All Black");
        defaultIndex = allBlackOptIndex;
      } else if (defaultOptText === null) {
        defaultIndex = selectElement.children.length;
      }
      const grabShowOpt = optionNode("data", grabShowOptText);
      if (defaultOptText === grabShowOptText)
        defaultIndex = selectElement.children.length;
      selectElement.add(grabShowOpt);
      selectElement.selectedIndex = defaultIndex;
      return grabShowOpt; /* return GRAB/SHOW option, even though it might not be the selected one */
    }

    const optionsBox = UTIL.newElement("DIV.optionsBox");
    panel.appendChild(optionsBox);

    function textN(base, id, len) {
      return base + (len === 1 ? "" : " " + id);
    }

    const axisParams = plugin.config.axes;
    const axesOptions = []; // this is the list that will get sent to the plugin
    for (let axisId = 0; axisId < config.axes.length; axisId++) {
      {
        const labelText = textN(
          axisParams[axisId].axisLabel || "Heat map axis",
          axisId + 1,
          config.axes.length,
        );
        optionsBox.appendChild(
          UTIL.newElement("SPAN.leftLabel", {}, [UTIL.newTxt(labelText)]),
        );
      }
      const axis1Select = UTIL.newElement("SELECT");
      axis1Select.add(optionNode("axis", "column"));
      axis1Select.add(optionNode("axis", "row"));
      optionsBox.appendChild(axis1Select);

      const axis1Coco = {};
      const axis1Data = [];

      // Variables that depend on the current axis.
      let thisAxis;
      let axis1Config;
      let otherAxis;
      let defaultCoord;
      let defaultCovar;

      /**
       * This function sets the values of the variables scoped outside of the function:
       *
       *   thisAxis
       *   axis1Config
       *   otherAxis
       *   defaultCoord
       *   defaultCovar
       *
       * @function setAxis
       * @param {string} axis - The axis to set (e.g., "Row" or "Column").
       */
      function setAxis(axis) {
        const heatMap = MMGR.getHeatMap();
        thisAxis = axis;
        if (debug) console.log({ m: "setAxis", axis, params });
        axis1Config = heatMap.getAxisCovariateConfig(axis);
        const axis1cvOrder = heatMap.getAxisCovariateOrder(axis);
        otherAxis = MMGR.isRow(axis) ? "Column" : "Row";
        if (plugin.hasOwnProperty("specialCoordinates") && plugin.specialCoordinates.hasOwnProperty("name")){
          defaultCoord = plugin.specialCoordinates.name + ".coordinate.";
        } else {
          defaultCoord = axis1cvOrder.filter((x) => /\.coordinate\.1/.test(x));
          defaultCoord =
            defaultCoord.length === 0 ? null : defaultCoord[0].replace(/1$/, "");
        }
        defaultCovar = axis1cvOrder.filter(
          (x) => !/\.coordinate\.\d+$/.test(x),
        );
        defaultCovar =
          defaultCovar.length === 0
            ? null
            : defaultCovar[defaultCovar.length - 1];
      }

      let selectedAxis;
      if (lastApplied[0].hasOwnProperty("axis")) {
        selectedAxis = lastApplied[0].axis;
      } else if (plugin.hasOwnProperty("specialCoordinates") && plugin.specialCoordinates.hasOwnProperty("rowOrColumn")) {
        selectedAxis = plugin.specialCoordinates.rowOrColumn;
      } else {
        selectedAxis = MMGR.isRow(axisParams[axisId].axisName)
          ? "row"
          : "column";
      }
      if (selectedAxis === "row") axis1Select.selectedIndex = 1;
      setAxis(selectedAxis);

      function createLinearSelectors(
        sss,
        numSelectors,
        selectorName,
        params,
        helpText,
      ) {
        params = params || [];
        for (let cid = 0; cid < numSelectors; cid++) {
          const selParams = cid < params.length ? params[cid] : {};
          const selectEl = UTIL.newElement("SELECT");
          optionsBox.appendChild(
            UTIL.newElement("SPAN.leftLabel", {}, [
              UTIL.newTxt(
                textN(UTIL.capitalize(selectorName), cid + 1, numSelectors),
              ),
            ]),
          );
          if (helpText != undefined) {
            optionsBox.appendChild(
              UTIL.newElement("a.helpQuestionMark", {}, [], (e) => {
                e.onmouseover = function () {
                  UHM.hlp(this, helpText, 200, true, 0);
                };
                e.onmouseout = function () {
                  UHM.hlpC();
                };
                return e;
              }),
            );
          }
          optionsBox.appendChild(selectEl);
          sss.push({
            select: selectEl,
            axisName: thisAxis,
            data: [],
            updateAxis,
          });
          function updateAxis() {
            while (selectEl.firstChild)
              selectEl.removeChild(selectEl.firstChild);
            const uname = textN(" for " + selectorName, cid + 1, numSelectors);
            const selectedElementsOption = selectedElementsOptionName(
              thisAxis,
              uname,
            );
            let defaultOpt;
            if (selParams.type === "data") {
              defaultOpt = selectedElementsOption;
            } else if (selParams.type === "covariate" && selParams.covName) {
              defaultOpt = selParams.covName;
            } else if (selectorName === "Coordinate") { // NOTE: `selectorName` comes from the plugin config
              defaultOpt = defaultCoord ? defaultCoord + (cid + 1) : null;
            } else {
              defaultOpt = defaultCovar;
            }
            let onlyContinuous = selectorName === "Coordinate";
            let deepCloneOfAxis1Config = deepClone(axis1Config);
            sss[cid].selOpt = addCovariateOptions( // in createLinearSelectors
              defaultOpt,
              deepCloneOfAxis1Config,
              selectEl,
              selectedElementsOption,
              onlyContinuous,
              true, // add "All Black" option to covariates dropdown
            );
          }
          updateAxis();
          const userLabel = createLabeledTextInput(selParams.label);
          optionsBox.appendChild(userLabel.element);
          sss[cid].userLabel = userLabel;

          sss[cid].grabbers = {};

          const countNode = UTIL.newTxt("0 " + otherAxis + "s");
          const infoEl = UTIL.newElement("DIV.nodeSelector.hide", {}, [
            UTIL.newElement("SPAN.leftLabel", {}, [UTIL.newTxt("Selected")]),
            countNode,
            UTIL.newButton("GRAB", {}, {}),
            UTIL.newButton("SHOW", {}, {}),
          ]);
          sss[cid].grabbers.clearData = function () {
            while (sss[cid].data.length > 0) sss[cid].data.pop();
          };
          if (selParams.type === "data" && selParams.labelIdx) {
            for (let ii = 0; ii < selParams.labelIdx.length; ii++) {
              sss[cid].data.push(selParams.labelIdx[ii]);
            }
          }
          sss[cid].grabbers.setSummary = function (label) {
            const data = sss[cid].data;
            countNode.textContent = "" + data.length + " " + otherAxis + "s";
            const selectedItem =
              sss[cid].select.children[sss[cid].select.selectedIndex];
            if (sss[cid].select.selectedIndex === sss[cid].select.length - 1) {
              infoEl.classList.remove("hide");
              if (label) {
                userLabel.setLabel(label);
              } else if (data.length === 0) {
                if (selectorName === "Coordinate") {
                  userLabel.setLabel("Undefined");
                } else {
                  userLabel.setLabel("");
                }
              } else if (data.length === 1) {
                userLabel.setLabel(
                  MMGR.getHeatMap().getAxisLabels(otherAxis).labels[
                    data[0] - 1
                  ],
                );
              } else {
                userLabel.setLabel("Average of " + countNode.textContent);
              }
            } else {
              infoEl.classList.add("hide");
              if (label) {
                userLabel.setLabel(label);
              } else {
                userLabel.setLabel(
                  selectedItem.value.replace(/\.coordinate\./, " "),
                );
              }
            }
          };
          sss[cid].setSummary = function setSummary(label) {
            sss[cid].grabbers.setSummary(label);
          };
          sss[cid].setSummary(selParams.label);

          infoEl.children[1].onclick = function (e) {
            if (debug) console.log("GRAB");
            const results = SRCHSTATE.getAxisSearchResults(otherAxis);
            if (results.length < 1) {
              UHM.systemMessage(
                "Nothing to GRAB",
                'To add to the selection: highlight labels on the appropriate axis of the NG-CHM and click "GRAB"',
              );
              return;
            }
            sss[cid].grabbers.clearData();
            sss[cid].data = SRCHSTATE.getAxisSearchResults(otherAxis);
            if (debug) console.log({ m: "Grabbed", results: sss[cid].data });
            sss[cid].grabbers.setSummary();
          };
          infoEl.children[2].onclick = function (e) {
            if (debug) console.log("SHOW");
            if (sss[cid].data.length < 1) {
              UHM.systemMessage(
                "Nothing to SHOW",
                'To add to the selection: highlight labels on the appropriate axis of the NG-CHM and click "GRAB"',
              );
              return;
            }
            SRCH.clearSearchItems(otherAxis);
            SRCH.setAxisSearchResultsVec(otherAxis, sss[cid].data);
            SRCH.redrawSearchResults();
          };
          optionsBox.appendChild(infoEl);
          selectEl.onchange = function (e) {
            sss[cid].setSummary();
          };
        }
      } // end function createLinearSelectors

      /**
				Creates the selectors for choosing groups in the gear menu.
				@function createGroupSelectors
				@param {object} sss
				@param {int} numSelectors Number of selectors to create
				@param {string} selectorName
				@param {object} params
			*/
      function createGroupSelectors(
        sss,
        numSelectors,
        selectorName,
        params,
        lastApplied,
      ) {
        const debug = false;
        params = params || [];
        var thisText = textN(UTIL.capitalize(selectorName));
        for (let cid = 0; cid < 1 + 0 * numSelectors; cid++) {
          optionsBox.appendChild(
            UTIL.newElement("SPAN.leftLabel", {}, [
              UTIL.newTxt(
                textN(
                  UTIL.capitalize(selectorName),
                  cid + 1,
                  1 + 0 * numSelectors,
                ),
              ),
            ]),
          );
          optionsBox.appendChild(
            UTIL.newElement("a.helpQuestionMark", {}, [], (e) => {
              e.onmouseover = function () {
                let helpText =
                  "Specify groups for statistical tests by first selecting a covariate or";
                helpText +=
                  " 'Selected " +
                  thisAxis +
                  "s for Group(s):' from this dropdown.";
                UHM.hlp(this, helpText, 400, 0, 0);
              };
              e.onmouseout = function () {
                UHM.hlpC();
              };
              return e;
            }),
          );
          const selectEl = UTIL.newElement("SELECT#gearDialogCovariateSelect");
          optionsBox.appendChild(selectEl);
          sss.push({
            select: selectEl,
            axisName: otherAxis,
            data: [],
            updateAxis,
          });

          const selParams = cid < params.length ? params[cid] : {};
          sss[cid].updateAxis();

          sss[cid].userLabels = [];
          sss[cid].grabbers = [];
          sss[cid].rangeSelectors = [];
          sss[cid].discreteSelectors = [];
          for (let idx = 0; idx < numSelectors; idx++) {
            sss[cid].data.push([]);
            const groupName =
              selParams.labels && idx < selParams.labels.length
                ? selParams.labels[idx]
                : "Undefined";
            sss[cid].userLabels.push(
              createLabeledTextInput(groupName, idx + 1, numSelectors),
            );
            optionsBox.appendChild(sss[cid].userLabels[idx].element); // append text box for label
            sss[cid].grabbers.push(
              createLabelGrabber(thisAxis, sss[cid].userLabels[idx], idx),
            );
            optionsBox.appendChild(sss[cid].grabbers[idx].element); // append GRAB/SHOW
            sss[cid].rangeSelectors.push(
              createRangeSelector(idx + 1, numSelectors),
            );
            optionsBox.appendChild(sss[cid].rangeSelectors[idx].element); // append range selector
            sss[cid].discreteSelectors.push(
              createDiscreteSelector(idx + 1, numSelectors),
            );
            optionsBox.appendChild(sss[cid].discreteSelectors[idx].element); // append range selector
          }

          function isGrabberSelected() {
            const idx = sss[cid].select.selectedIndex;
            const item = sss[cid].select.children[idx];
            if (debug)
              console.log({
                m: "isGrabberSelected",
                cid,
                idx,
                item,
                isSelected: item === sss[cid].selOpt,
              });
            return item === sss[cid].selOpt;
          }

          function updateAxis() {
            // Remove choices for previous axis, if any.
            while (selectEl.firstChild)
              selectEl.removeChild(selectEl.firstChild);
            const uname = " for " + selectorName;
            const selectedElementsOption = selectedElementsOptionName(
              otherAxis,
              uname,
            );
            let defaultOpt;
            if (selParams.type === "data") {
              defaultOpt = selectedElementsOption;
            } else if (selParams.type === "covariate" && selParams.covName) {
              defaultOpt = selParams.covName;
            } else if (selectorName === "Coordinate") {
              defaultOpt = defaultCoord ? defaultCoord + (cid + 1) : null;
            } else {
              defaultOpt = defaultCovar;
            }
            sss[cid].selOpt = addCovariateOptions( // in createGroupSelectors
              defaultOpt,
              axis1Config,
              selectEl,
              selectedElementsOption,
              false,
            );
            if (selParams.type === "data" && selParams.labelIdx) {
              for (let ii = 0; ii < selParams.labelIdx.length; ii++) {
                sss[cid].data.push(selParams.labelIdx[ii]);
              }
            }
            if (sss[cid].grabbers) {
              for (let idx = 0; idx < numSelectors; idx++) {
                sss[cid].grabbers[idx].updateAxis(thisAxis);
              }
            }
          }

          function clearData(idx) {
            while (sss[cid].data[idx].length > 0) sss[cid].data[idx].pop();
          }

          /**
						Creates the 'GRAB' and 'SHOW' buttons and their functionality
						@function createLabelGrabbber
						@param {String} axisName
						@param {Object} userLabel
						@param {int} idx group index (starts at 0)
						@return {Object} 
						@option {element} infoEl DIV element
						@option {function} clearData is actually defined outside this function
						@option {function} setSummary maybe sets the value? I'm not 100% sure
						@option {function} updateAxis
					*/
          function createLabelGrabber(axisName, userLabel, idx) {
            const countNode = UTIL.newTxt("0 " + axisName + "s");
            const infoEl = UTIL.newElement("DIV.nodeSelector.hide", {}, [
              UTIL.newElement("SPAN.leftLabel", {}, [UTIL.newTxt("Selected")]),
              countNode,
              UTIL.newButton("GRAB", {}, { click: doGrab }),
              UTIL.newButton("SHOW", {}, { click: doShow }),
            ]);
            let axisNameU;
            updateAxis(axisName);

            function doGrab(e) {
              if (debug) console.log("GRAB");
              if (SRCHSTATE.getAxisSearchResults(axisNameU).length < 1) {
                UHM.systemMessage(
                  "Nothing to GRAB",
                  'To add to the selection: highlight labels on the appropriate axis of the NG-CHM and click "GRAB"',
                );
                return;
              }
              clearData(idx);
              let count = 0;
              SRCHSTATE.getAxisSearchResults(axisNameU).forEach((si) => {
                if (debug) console.log({ m: "Grabbed", si });
                sss[cid].data[idx].push(si);
                count++;
              });
              setSummary(true);
            }
            function doShow(e) {
              if (debug) console.log("SHOW");
              if (sss[cid].data[idx].length < 1) {
                UHM.systemMessage(
                  "Nothing to SHOW",
                  'To add to the selection: highlight labels on the appropriate axis of the NG-CHM and click "GRAB"',
                );
                return;
              }
              SRCH.clearSearchItems(axisNameU);
              SRCH.setAxisSearchResultsVec(axisNameU, sss[cid].data[idx]);
              SRCH.redrawSearchResults();
            }
            function updateAxis(newAxis) {
              axisName = newAxis;
              axisNameU = MMGR.isRow(axisName) ? "Row" : "Column";
            }
            function setSummary(selected, label) {
              const data = sss[cid].data[idx];
              countNode.textContent = "" + data.length + " " + axisName + "s";
              if (selected) {
                infoEl.classList.remove("hide");
                if (label) {
                  userLabel.setLabel(label);
                } else if (data.length === 0) {
                  if (selectorName === "Coordinate") {
                    userLabel.setLabel("Undefined");
                  } else {
                    userLabel.setLabel("Undefined");
                  }
                } else if (data.length === 1) {
                  userLabel.setLabel(
                    MMGR.getHeatMap().getAxisLabels(axisName).labels[
                      data[0] - 1
                    ],
                  );
                } else {
                  userLabel.setLabel("Group of " + countNode.textContent);
                }
              } else {
                infoEl.classList.add("hide");
              }
            }
            return { element: infoEl, clearData, setSummary, updateAxis };
          } // end function createLabelGrabber

          /**
							Function to create the div for choosing groups from cont covariates.

							This function creates the DIV.rangeSelector, which has the DOM elemnts that
							allow the user to choose ranges (e.g. '>=1.3<3') for making groups 
							from continuous covariates.

							@function createRangeSelector
							@param {int} nth group number
							@param {int} nmax max number of groups
							@return {Object} 
							@option {element} element reange selector DIV element
							@option {function} setRange function to set value of the range element
							@option {function} getRange function to get value of the range element
							@option {function} setSummary function for showing/hiding the element 
							@option {function} showMinMax function to show the min/max covariates to help user
					*/
          function createRangeSelector(nth, nmax) {
            let label = "Group ";
            const groupIdx = nth - 1;
            if (nmax && nmax > 1) {
              label = label + " " + nth;
            }
            const rangeSelectorEl = UTIL.newElement(
              "DIV.rangeSelector.hide",
              {},
              [
                UTIL.newElement("SPAN.leftLabel", {}, [UTIL.newTxt(label)]),
                UTIL.newElement("a.helpQuestionMark", {}, [], (e) => {
                  e.onmouseover = function () {
                    let helpText =
                      "Use the text boxes to enter a range for selection of groups based on continuous covariate values.";
                    let testElem = document.getElementById(
                      "gearDialogTestSelect",
                    );
                    let selectedTest =
                      testElem.options[testElem.selectedIndex].value;
                    if (selectedTest == "Mean") {
                      helpText +=
                        "<br><br><u>Mean:</u> <br>If only Group 1 is specified, the mean value of Group 1 will be calculated.";
                      helpText +=
                        "<br>If both groups are specified, the difference in means between Group 1 and Group 2 will be calculated.";
                    } else if (selectedTest == "T-test") {
                      helpText +=
                        "<br><br><u>T-test:</u><br>If only Group 1 is specified, then Group 2 is automatically all elements NOT in Group 1.";
                    }
                    UHM.hlp(this, helpText, 200, undefined, 0);
                  };
                  e.onmouseout = function () {
                    UHM.hlpC();
                  };
                  return e;
                }),
                UTIL.newElement("BR"),
                UTIL.newElement("SPAN.gear-menu-spacing"),
                UTIL.newElement("SPAN.leftLabel", {}, [UTIL.newTxt("")]),
                UTIL.newElement("BR"),
                UTIL.newElement("SPAN.gear-menu-spacing"),
                UTIL.newElement("INPUT", { "data-covariate-group": groupIdx }),
              ],
            );
            rangeSelectorEl.lastChild.type = "text";
            rangeSelectorEl.lastChild.placeholder = "e.g.: >=1.1<3.2";
            rangeSelectorEl.lastChild.onchange = getIndexes;
            return {
              element: rangeSelectorEl,
              setSummary,
              showMinMax,
              setRange,
              getRange,
            };

            /** Function to show / hide the range DIV */
            function setSummary(show) {
              if (show) {
                rangeSelectorEl.classList.remove("hide");
              } else {
                rangeSelectorEl.classList.add("hide");
              }
            }
            /** Function to show the min & max values as text to help user in making ranges */
            function showMinMax(v) {
              rangeSelectorEl.children[4].innerHTML = v;
            }
            /** Function to set value of range */
            function setRange(v) {
              rangeSelectorEl.lastChild.value = v;
            }
            /** Function to get value of range */
            function getRange() {
              return rangeSelectorEl.lastChild.value;
            }
            /* Function to parse range string and get indexes for covariates that fall within the range string.
						   This is the onchange function for the range INPUT boxes (rangeSelectorEl.lastChild).
						*/
            function getIndexes(e) {
              // gets index values from range to add to sss
              const selectedCov =
                selectEl.options[selectEl.selectedIndex].value;
              const [isValid, searchResults] = SRCH.continuousCovarSearch(
                thisAxis,
                selectedCov,
                e.target.value,
              );
              if (!isValid) {
                UHM.systemMessage(
                  "Invalid Range Text",
                  'ERROR: Range selection text is not valid. Examples of acceptable ranges: ">2<=5", ">=1<10"',
                );
                return;
              }
              const groupIndex = e.target.getAttribute("data-covariate-group");
              sss[cid].data[groupIndex] = searchResults;
              const common = sss[cid].data[0].filter((value) =>
                sss[cid].data[1].includes(value),
              );
              if (common.length > 0) {
                UHM.systemMessage(
                  "Group Selection Warning",
                  "WARNING: Groups are not mutually exclusive in Gear Dialog.",
                );
              }
            }
          } // end function createRangeSelector

          /**
							Function to create the div for choosing groups from discrete covariates.

							This function creates the DIV.discreteSelector, which has the DOM elemnts that
							allow the user to check checkboxes of discrete covariates for making groups 
							from discrete covariates.

							@function createDiscreteSelector
							@param {int} nth group number
							@param {int} nmax max number of groups
							@return {Object} 
							@option {element} element reange selector DIV element
							@option {function} setRange function to set value of the range element
							@option {function} setSummary function for showing/hiding the element 
							@option {function} showMinMax function to show the min/max covariates to help user
					*/
          function createDiscreteSelector(nth, nmax) {
            const groupIdx = nth - 1;
            let label = "Group";
            if (nmax && nmax > 1) {
              label = label + " " + nth;
            }
            const discreteSelectorEl = UTIL.newElement(
              "DIV.discreteSelector.hide",
              {},
              [
                UTIL.newElement("SPAN.leftLabel", {}, [UTIL.newTxt(label)]),
                UTIL.newElement("a.helpQuestionMark", {}, [], (e) => {
                  e.onmouseover = function () {
                    let helpText =
                      "Use the checkboxes to select groups based on covariate value.";
                    let testElem = document.getElementById(
                      "gearDialogTestSelect",
                    );
                    let selectedTest =
                      testElem.options[testElem.selectedIndex].value;
                    if (selectedTest == "Mean") {
                      helpText +=
                        "<br><br><u>Mean:</u> <br>If only Group 1 is specified, the mean value of Group 1 will be calculated.";
                      helpText +=
                        "<br>If both groups are specified, the difference in means between Group 1 and Group 2 will be calculated.";
                    } else if (selectedTest == "T-test") {
                      helpText +=
                        "<br><br><u>T-test:</u><br>If only Group 1 is specified, then Group 2 is automatically all elements NOT in Group 1.";
                    }
                    UHM.hlp(this, helpText, 200, undefined, 0);
                  };
                  e.onmouseout = function () {
                    UHM.hlpC();
                  };
                  return e;
                }),
              ],
            );
            return {
              element: discreteSelectorEl,
              setSummary,
              getCheckBoxes,
              setCheckBoxes,
            };

            /** Function to set values of checkboxes */
            function setCheckBoxes(checkboxValues) {
              for (let i = 0; i < checkboxValues.length; i++) {
                discreteSelectorEl.lastChild.children[i].children[0].value =
                  checkboxValues[i].value;
                discreteSelectorEl.lastChild.children[i].children[0].checked =
                  checkboxValues[i].checked;
              }
            }

            /** Function to get current values of checkboxes */
            function getCheckBoxes() {
              let checkboxValues = [];
              discreteSelectorEl.lastChild.children;
              for (
                let i = 0;
                i < discreteSelectorEl.lastChild.children.length;
                i++
              ) {
                checkboxValues.push({
                  value:
                    discreteSelectorEl.lastChild.children[i].children[0].value,
                  checked:
                    discreteSelectorEl.lastChild.children[i].children[0]
                      .checked,
                });
              }
              return checkboxValues;
            }

            /** Function to show/hide DIV.discreteSelector, and to create checkboxes for selected covariate */
            function setSummary(show) {
              if (show) {
                while (discreteSelectorEl.children.length > 2) {
                  discreteSelectorEl.removeChild(discreteSelectorEl.lastChild);
                }
                discreteSelectorEl.classList.remove("hide");
                let checkboxDivElem = UTIL.newElement(
                  "DIV.gear-dialog-dropDownCheckBoxes-inline",
                );
                const selectedCov =
                  selectEl.options[selectEl.selectedIndex].value;
                const covariateThresholds =
                  MMGR.getHeatMap().getAxisCovariateConfig(thisAxis)[
                    selectedCov
                  ].color_map.thresholds;
                document
                  .querySelectorAll(
                    '[data-checkbox-label-group="' + groupIdx + '"]',
                  )
                  .forEach((el) => el.parentNode.removeChild(el)); // rm old ones
                covariateThresholds.forEach((covThresh, ctIdx) => {
                  // create checkbox for each value
                  let checkboxElem = UTIL.newElement(
                    "LABEL.gear-dialog-checkboxes",
                    { "data-checkbox-label-group": groupIdx },
                    [
                      UTIL.newElement("INPUT", {
                        type: "checkbox",
                        value: covThresh,
                        "data-checkbox-covariate-group": groupIdx,
                      }),
                      UTIL.newTxt(covThresh),
                    ],
                  );
                  checkboxElem.appendChild(UTIL.newElement("BR"));
                  checkboxElem.onchange = getIndexes;
                  checkboxDivElem.appendChild(checkboxElem);
                });
                discreteSelectorEl.appendChild(checkboxDivElem);
              } else {
                discreteSelectorEl.classList.add("hide");
              }
            }

            /** Function to get indexes for covariates for the checked boxes for each group
						   This is the onchange function for each of the checkboxes (checkboxElem.onchange above).
						   This is because of the exclusivity requirement between the groups. 
						   Somewhat differently from the range selectors, here the sss[cid].data is updated for all
						   groups when any of the checkboxes are changed. This is also somewhat inefficient.
						*/
            function getIndexes(e) {
              document
                .querySelectorAll('[value="' + e.target.value + '"]')
                .forEach((cb) => {
                  // ensure mutually exclusive groups
                  if (cb !== e.target) {
                    cb.checked = false;
                  }
                });
              const selectedCov =
                selectEl.options[selectEl.selectedIndex].value;
              const covariateValues =
                MMGR.getHeatMap().getAxisCovariateData(thisAxis)[selectedCov]
                  .values;
              for (let groupIndex = 0; groupIndex < nmax; groupIndex++) {
                sss[cid].data[groupIndex] = []; // clear any old values
                let checkedValues = [];
                const checkboxEls =
                  sss[cid].discreteSelectors[groupIndex].element.children.item(
                    2,
                  ).children;
                Array.from(checkboxEls).forEach((cb, i) => {
                  if (cb.firstChild.checked === true) {
                    checkedValues.push(cb.firstChild.value);
                  }
                });
                covariateValues.forEach((cv, i) => {
                  if (checkedValues.indexOf(cv) > -1) {
                    sss[cid].data[groupIndex].push(String(i));
                  }
                });
              }
            }
          } // end function createDiscreteSelector

          /*
							Function to set sub-options for the group selector after the user has chosen
							something from the dropdown for this group selector. For example, if the
							user has chosen 'Selected columns for Groups(s)', the SHOW & GRAB buttons are displayed.
						
						This is the main setSummary for choosing groups.
						This will fill in the last applied values if they exist.
					*/
          sss[cid].setSummary = function setSummary(selectedValue, labels) {
            if (isGrabberSelected()) {
              sss[cid].rangeSelectors.forEach((s) => s.setSummary(false)); // hide the range selectors
              sss[cid].discreteSelectors.forEach((s) => s.setSummary(false)); // hide the discrete selectors
              for (let idx = 0; idx < numSelectors; idx++) {
                sss[cid].grabbers[idx].setSummary(true, selectedValue);
              }
            } else {
              // covariate bar selected
              const selectedIndex = sss[cid].select.selectedIndex;
              const selectedCovariate =
                sss[cid].select.children[selectedIndex].value;
              const typeContOrDisc =
                MMGR.getHeatMap().getAxisCovariateConfig(thisAxis)[
                  selectedCovariate
                ].color_map.type;
              if (typeContOrDisc === "continuous") {
                sss[cid].rangeSelectors.forEach((s) => s.setSummary(true)); // show the range selectors
                sss[cid].discreteSelectors.forEach((s) => s.setSummary(false)); // hide the discrete selectors
                const covariateValues = MMGR.getHeatMap()
                  .getAxisCovariateData(thisAxis)
                  [selectedCovariate].values.filter((x) => {
                    return !isNaN(x);
                  })
                  .map((x) => parseFloat(x));
                let minCovValue = Math.min(...covariateValues);
                let maxCovValue = Math.max(...covariateValues);
                let rangeMinMaxText =
                  "(Min: " + minCovValue + ", Max: " + maxCovValue + ")";
                sss[cid].rangeSelectors.forEach((s) =>
                  s.showMinMax(rangeMinMaxText),
                ); // show user the min/max values
                if (
                  lastApplied[cid].hasOwnProperty("rangeStrings") &&
                  lastApplied[cid].covariate == selectedValue
                ) {
                  sss[cid].rangeSelectors.forEach((s, sidx) =>
                    s.setRange(lastApplied[cid].rangeStrings[sidx]),
                  ); // <-- set value to last applied
                  sss[cid].rangeSelectors.forEach((s) => {
                    let e = new Event("change");
                    s.element.lastChild.dispatchEvent(e);
                  }); // <-- trigger onchange event
                }
              } else if (typeContOrDisc === "discrete") {
                sss[cid].rangeSelectors.forEach((s) => s.setSummary(false)); // hide the range selectors
                sss[cid].discreteSelectors.forEach((s) => s.setSummary(true)); // show the discrete selectors
                if (
                  lastApplied[cid].hasOwnProperty("discreteCheckboxes") &&
                  lastApplied[cid].covariate == selectedValue
                ) {
                  sss[cid].discreteSelectors.forEach((s, sidx) =>
                    s.setCheckBoxes(lastApplied[cid].discreteCheckboxes[sidx]),
                  ); // set last applied values
                  sss[cid].discreteSelectors.forEach((s) => {
                    let e = new Event("change");
                    s.element.lastChild.lastChild.dispatchEvent(e);
                  }); // trigger onchange
                }
              } else {
                console.error("Unknown covariate type");
              }
              const item = sss[cid].select.children[selectedIndex];
              if (debug)
                console.log({
                  m: "selector setSummary",
                  cid,
                  selectedIndex,
                  item,
                  isGrabber: item === sss[cid].selOpt,
                });
              for (let idx = 0; idx < numSelectors; idx++) {
                sss[cid].grabbers[idx].setSummary(false);
                if (labels) {
                  sss[cid].userLabels[idx].setLabel(labels[idx]);
                } else {
                  let groupNumber = idx + 1;
                  sss[cid].userLabels[idx].setLabel(
                    "Group " +
                      groupNumber +
                      " for " +
                      item.value.replace(/\.coordinate\./, " "),
                  );
                }
              }
            }
          }; // end setSummary for group selection

          sss[cid].setSummary(
            selParams.selectValue,
            selParams.labels,
            lastApplied,
          );
          selectEl.onchange = function (e) {
            sss[cid].setSummary();
          };
        }
      } // end function createGroupSelectors

      if (config.axes[axisId].coco == null) config.axes[axisId].coco = [];
      const pa =
        params.axes && axisId < params.axes.length
          ? params.axes[axisId]
          : { cocos: [], groups: [] };
      pa.cocos = pa.cocos || {};
      pa.groups = pa.groups || {};
      // create UI for choosing coordiantes / covariates
      for (
        let cocoidx = 0;
        cocoidx < config.axes[axisId].coco.length;
        cocoidx++
      ) {
        const coco = config.axes[axisId].coco[cocoidx];
        axis1Coco[coco.baseid] = [];
        let helpText = coco.helpText;
        createLinearSelectors(
          axis1Coco[coco.baseid],
          coco.max,
          coco.name,
          pa[pa.cocos[cocoidx] + "s"],
          helpText,
        );
      }
      if (config.axes[axisId].group == null) config.axes[axisId].group = [];
      // create UI for choosing groups
      for (
        let groupidx = 0;
        groupidx < config.axes[axisId].group.length;
        groupidx++
      ) {
        const group = config.axes[axisId].group[groupidx];
        axis1Coco[group.baseid] = [];
        createGroupSelectors(
          axis1Coco[group.baseid],
          group.max,
          group.label,
          pa[pa.groups[groupidx] + "s"],
          lastApplied,
        );
      }
      const theseOpts = {
        select: axis1Select,
        data: axis1Data,
        dataTypeName: "group",
        groups: [],
        cocos: [],
      };
      // add coordiante/covariate information to theseOpts
      for (
        let cocoidx = 0;
        cocoidx < config.axes[axisId].coco.length;
        cocoidx++
      ) {
        const coco = config.axes[axisId].coco[cocoidx];
        theseOpts[coco.baseid + "s"] = axis1Coco[coco.baseid];
        theseOpts.cocos.push(coco.baseid);
      }
      // add groups information to theseOpts
      for (
        let groupidx = 0;
        groupidx < config.axes[axisId].group.length;
        groupidx++
      ) {
        const group = config.axes[axisId].group[groupidx];
        theseOpts[group.baseid + "s"] = axis1Coco[group.baseid];
        theseOpts.groups.push(group.baseid);
      }
      axesOptions.push(theseOpts);
      axis1Select.onchange = function (e) {
        // this is when the selector with 'data-type = axis' changes
        setAxis(e.srcElement.value);
        if (debug) console.log("Selected axis changed to " + thisAxis);
        for (let coco of config.axes[axisId].coco) {
          updateSelector(coco);
        }
        for (let group of config.axes[axisId].group) {
          updateSelector(group);
        }
        function updateSelector(coco) {
          axis1Coco[coco.baseid][0].updateAxis();
          for (let cid = 0; cid < coco.max; cid++) {
            axis1Coco[coco.baseid][cid].updateAxis();
            //while (axis1Coco[coco.baseid][cid].data.length > 0) {axis1Coco[coco.baseid][cid].data.pop()}
            for (
              let gidx = 0;
              gidx < axis1Coco[coco.baseid][cid].grabbers.length;
              gidx++
            ) {
              axis1Coco[coco.baseid][cid].grabbers[gidx].clearData(gidx);
            }
            axis1Coco[coco.baseid][cid].setSummary();
            if (axis1Coco[coco.baseid][cid].hasOwnProperty("userLabel")) {
              axis1Coco[coco.baseid][cid].userLabel.setLabel("");
            }
            axis1Coco[coco.baseid][cid].select.onchange(null);
          }
        }
      };
    } // end for loop over  config.axes.length (loop variable = axisId)

    // Create a DIV.userLabel that displays as Label: <text input>
    // If specified, iValue is the initial value of the text input.
    // The returned value is an object with the following fields:
    // .element  The created DIV element.
    // .setLabel Method for changing the labels value.
    //
    function createLabeledTextInput(iValue, nth, nmax) {
      let label = "Label";
      if (nmax && nmax > 1) {
        label = label + " " + nth;
      }
      const userLabelEl = UTIL.newElement("DIV.userLabel", {}, [
        UTIL.newElement("SPAN.leftLabel", {}, [UTIL.newTxt(label)]),
        UTIL.newElement("INPUT", { maxlength: "50" }),
      ]);
      userLabelEl.children[1].type = "text";
      if (iValue) userLabelEl.children[1].value = iValue;
      return { element: userLabelEl, setLabel };

      function setLabel(v) {
        userLabelEl.children[1].value = v;
      }
    }

    const pluginOptions = genPluginOptions(config.options, 0, params.options);
    optionsBox.appendChild(pluginOptions);

    function genPluginOptions(opts, level, params) {
      level = level || 0;
      const box = UTIL.newElement("DIV.grouper");
      for (let oi = 0; oi < opts.length; oi++) {
        const opt = UTIL.newElement("DIV.grouper", {}, [
          UTIL.newElement("SPAN.leftLabel", {}, [UTIL.newTxt(opts[oi].label)]),
        ]);
        if (opts[oi].helpText) {
          let helpElem = UTIL.newElement("a.helpQuestionMark", {}, [], (e) => {
            e.onmouseover = function () {
              UHM.hlp(this, opts[oi].helpText, 200, true, 0);
            };
            e.onmouseout = function () {
              UHM.hlpC();
            };
            return e;
          });
          opt.appendChild(helpElem);
        }
        const optParam =
          params && params.hasOwnProperty(opts[oi].label)
            ? params[opts[oi].label]
            : null;
        if (debug)
          console.log({ m: "genOption", label: opts[oi].label, optParam });
        if (level > 0) {
          opt.children[0].style.marginLeft = level * 1.25 + "em";
        }
        if (opts[oi].type === "checkbox") {
          const input = UTIL.newElement("INPUT");
          input.type = opts[oi].type;
          input.checked = optParam !== null ? optParam : opts[oi].default;
          opt.append(input);
        } else if (opts[oi].type === "text") {
          const input = UTIL.newElement("INPUT");
          input.type = opts[oi].type;
          input.value = optParam !== null ? optParam : opts[oi].default;
          opt.append(input);
        } else if (opts[oi].type === "dropdown") {
          const input = UTIL.newElement("SELECT");
          let selectedIndex = 0;
          let choices = opts[oi].choices;
          if (!Array.isArray(choices)) choices = [choices];
          let idx = 0;
          for (const cc of choices) {
            if (typeof cc === "string") {
              if (cc === "STANDARD TESTS") {
                input.id = "gearDialogTestSelect";
                for (const t of vanodiKnownTests) {
                  const choice = UTIL.newElement("OPTION");
                  choice.value = t.value;
                  if (t.value === optParam) selectedIndex = idx;
                  choice.innerText = t.label;
                  input.append(choice);
                  idx++;
                }
              } else {
                console.log("Unknown choice string: " + cc);
              }
            } else {
              const choice = UTIL.newElement("OPTION");
              choice.value = cc.value;
              if (cc.value == optParam) selectedIndex = idx;
              choice.innerText = cc.label;
              input.append(choice);
              idx++;
            }
          }
          input.selectedIndex = selectedIndex;
          opt.append(input);
        } else if (opts[oi].type === "group") {
          opt.append(genPluginOptions(opts[oi].options, level + 1, optParam));
        } else {
          console.error("Unknown option type " + opts[oi].type);
        }
        box.append(opt);
      }
      return box;
    }

    function getPluginOptionValues(opts, element) {
      const values = {};
      for (let oi = 0; oi < opts.length; oi++) {
        const o = opts[oi];
        let e = Array.from(element.children[oi].children).filter((ele) => {
          return ele.nodeName === "SELECT" || ele.nodeName === "INPUT";
        })[0];
        if (o.type === "checkbox") {
          values[o.label] = e.checked;
        } else if (o.type === "dropdown" || o.type === "text") {
          values[o.label] = e.value;
        } else if (o.type === "group") {
          values[o.label] = getPluginOptionValues(o.options, e);
        } else {
          console.error("Unknown option type " + o.type);
        }
      }
      return values;
    }

    function selectToCoordinate(coord) {
      const label = coord.userLabel.element.children[1].value; //.select.value.replace(/\.coordinate\./, ' ');
      const choice = coord.select.children[coord.select.selectedIndex];
      const type = choice.dataset.type;
      if (type === "data") {
        return { type, label, labelIdx: coord.data };
      } else {
        return { type, label, covName: coord.select.value };
      }
    }

    function selectToGroups(coord) {
      const labels = coord.userLabels.map((ul) => ul.element.children[1].value);
      const choice = coord.select.children[coord.select.selectedIndex];
      const type = choice.dataset.type;
      return {
        type,
        selectValue: coord.select.value,
        labels,
        labelIdx: coord.data,
        covName: coord.select.value,
      };
    }

    /**
			Function to convert the user selections from DOM elements in the Gear Dialog into data to send to the plugins.
			
			The aEls object has additional key/value pairs depending on the arrays 'cocos' and 'groups'. For example,
			if cocos = ['coordinate', 'covariate'] and groups = ['ugroup'], there will be three additional keys
			in aEls: 'coordinates', 'covariates', and 'ugroups'. Note the additional 's' on the name.

			- coordaintes: Array of objects relating to DOM elements for user selection of 'coordinates',
			- covariates: Array of objects relating to DOM elements for user selection of 'covariates',
			- ugroups: Array of objects relating to DOM elements for user selection of 'ugroups'.
			
			The return value of this function will become the 'axes' key to the plotParams object. This is part
			of the data sent to the plugins. This return object has the same general structure as the aEls input 
			object. Below is some description of the structure of this 'ops' return object:

			- cocos: Same as input
			- coordinates: Specific to this example. Array of objects of information extracted from DOM element. Example:

					[
						{
							type: 'covariate' // for data obtained from covariate bar
							label: <user-specified label> // from the text box in Gear Menu
							covName: <name of covariate bar>
						},
						{
							type: 'data' // for data obtained from GRAB/SHOW
							label: <user-specified label> // from the text box in Gear Menu
							labelIdx: Array of indexes of NGCHM rows or columns 
						}
					]

			- groups: Same as input
			- ugroups: Specific to this example. Array of objects of information extracted from DOM element. Example:

					[
						{
							labelIdx: Array of arrays of indexes of NGCHM rows or columns. One array for each group,
							labels: Array of user-specified labels // from the text boxes in the Gear Menu
							selectValue: value from the, in this example, 'Group(s)' dropdown. In this example this is one of the covariate bars or something to let you know the GRAB/SHOW was used
							type: 'data'
						}
					]

			- data:  ??


				@param {object} aEls Object of selection-element stuff
				@option {Array<String>} cocos Array of names of coordinate/covariate data to send to plugin. E.g.: ['coordiante', 'covariate'].
					       There will be an additional key in the aEls object for each item in this list, with and added 's'. 
					       In this example, that means there are two additional keys: 'coordinates' and 'covariates'
				@option {Array<String>} groups Similar to 'cocos'. Array of names of group data to send to plugin. E.g.: ['ugroup']
					        There will be an additional key in the aEls object for each item in this list, with and added 's'.
					        In this example, that means there is an additional key: 'ugroups'.
				@option {String} dataTypeName ??
				@option {Array<>} data 
				@option {Element} select DOM element for selecting between 'row' and 'column'
				@return {object} The value for the 'axes' key to the plotParams object. This is part of the data sent to the plugins. The 
				       same general structure as for the 'aEls' input object. See the more detailed description below.
		*/
    function axesElementsToOps(aEls) {
      const ops = {
        axisName: aEls.select.value,
        data: aEls.data.map((axisC) => selectToCoordinate(axisC)),
        cocos: aEls.cocos,
        groups: aEls.groups,
      };
      for (let idx = 0; idx < aEls.cocos.length; idx++) {
        const f = aEls.cocos[idx] + "s";
        ops[f] = aEls[f].map((axisC) => selectToCoordinate(axisC));
      }
      for (let idx = 0; idx < aEls.groups.length; idx++) {
        const f = aEls.groups[idx] + "s";
        ops[f] = aEls[f].map((axisC) => selectToGroups(axisC));
      }
      return ops;
    }

    function saveLastApplied(aEls) {
      let lastApplied = {};
      lastApplied.axis = aEls.select.value;
      lastApplied.rangeStrings = [];
      lastApplied.discreteCheckboxes = [];
      for (let idx = 0; idx < aEls.groups.length; idx++) {
        const f = aEls.groups[idx] + "s";
        let selectedCovElem = Array.from(aEls[f][idx].select.children).filter(
          (e) => {
            return e.selected === true;
          },
        );
        if (selectedCovElem.length != 1) {
          console.error("Expecting 1 coviariate");
        }
        lastApplied.covariate = selectedCovElem[0].value;
        for (let jdx = 0; jdx < aEls[f][idx].rangeSelectors.length; jdx++) {
          lastApplied.rangeStrings[jdx] =
            aEls[f][idx].rangeSelectors[jdx].getRange();
          lastApplied.discreteCheckboxes[jdx] =
            aEls[f][idx].discreteSelectors[jdx].getCheckBoxes();
        }
      }
      if (aEls.hasOwnProperty("coordinates")) {
        lastApplied.coordinates = aEls.coordinates.map((elem) => {
          return elem.data;
        });
      }
      if (aEls.hasOwnProperty("covariates")) {
        lastApplied.covariates = aEls.covariates.map((elem) => {
          return elem.data;
        });
      }
      return lastApplied;
    }

    /**
			Function to verify minimum required entries for coordinates and groups are present
			before sending data to plugin.

			This function verifies that the labelIdx entries are non-empty, alerts the user, and returns 'false'.
			Otherwise this function returns 'true'.
			
			The config object is used to determine which plotParams to validate.
			
			For cocos: since user is choosing from a dropdown, we only need to test the type = 'data' (because 
			otherwise the values are comming from a covariate bar).
			
			@function validateParams
			@param {Object} plotParams Parameters sent to plugin
		*/
    function validateParams(plotParams) {
      var minNumberRequired, thingToCheck;
      for (var a = 0; a < config.axes.length; a++) {
        for (var c = 0; c < config.axes[a].coco.length; c++) {
          minNumberRequired = config.axes[a].coco[c].min;
          for (var i = 0; i < minNumberRequired; i++) {
            thingToCheck = config.axes[a].coco[c].baseid + "s";
            var cocoToCheck = plotParams.axes[a][thingToCheck];
            for (var j = 0; j < minNumberRequired; j++) {
              if (
                cocoToCheck[j].type == "data" &&
                cocoToCheck[j].labelIdx.length == 0
              ) {
                var entryNumber = j + 1;
                UHM.systemMessage(
                  "Missing Selection",
                  "Missing selection for " +
                    config.axes[a].coco[c].name +
                    " " +
                    entryNumber +
                    " in Gear Dialog.",
                );
                return false;
              }
            }
          }
        } // end loop over config.axes.coco
        for (var g = 0; g < config.axes[a].group.length; g++) {
          minNumberRequired = config.axes[a].group[g].min;
          for (var i = 0; i < minNumberRequired; i++) {
            thingToCheck = config.axes[a].group[g].baseid + "s";
            var groupToCheck = plotParams.axes[a][thingToCheck][0];
            for (var j = 0; j < minNumberRequired; j++) {
              if (groupToCheck.labelIdx[j].length == 0) {
                UHM.systemMessage(
                  "Missing Selection",
                  "Missing selection for " +
                    config.axes[a].group[g].label +
                    " in Gear Dialog. At least " +
                    minNumberRequired +
                    " is required.",
                );
                return false;
              }
            }
          }
        } // end loop over config.axes.group
      } // end loop over config.axes
      return true;
    }

    /**
				Invoked when user clicks 'APPLY' button on gear menu. 

			This function constructs the plotParams object with:

					{
						axes: via a call to axesElementsToOps
						options: via a call to getPluginOptionValues
					}


			@function applyPanel
		*/
    function applyPanel() {
      let plotTitle = "Heat Map Data";
      if (axesOptions.length === 1) {
        plotTitle =
          "Heat Map " + UTIL.capitalize(axesOptions[0].select.value) + "s";
      }
      const plotParams = {
        plotTitle,
        axes: axesOptions.map((ao) => axesElementsToOps(ao)),
        options: getPluginOptionValues(config.options, pluginOptions),
        lastApplied: axesOptions.map((ao) => saveLastApplied(ao)),
      };
      var paramsOK = validateParams(plotParams);
      if (paramsOK) {
        PIM.setPanePluginOptions(icon, plotParams, LNK.initializePanePlugin);
      }
    }

    function resetPanel() {
      closePanel();
      newGearDialog(icon);
    }

    function closePanel() {
      PANE.removePopupNearIcon(panel, icon);
    }

    panel.appendChild(
      UTIL.newElement("DIV.buttonBox", {}, [
        UTIL.newButton("APPLY", {}, { click: applyPanel }),
        UTIL.newButton("RESET", {}, { click: resetPanel }),
        UTIL.newButton("CLOSE", {}, { click: closePanel }),
      ]),
    );
    if (plugin.hasOwnProperty("specialCoordinates")) {
      applyPanel(); // If plugin is a special cordinates plugin, save user from having to click APPLY
    }

    PANE.insertPopupNearIcon(panel, icon);
  } // bottom of newGearDialog

  /**
		Processes messages from plugins

		@function processVanodiMessage
		@param {string} nonce nonce for plugin
		@param {} loc location of plugin
		@param {object} msg
		@option {string} op operation to perform. E.g. 'getTestData'
		@option {string} axisName 'row' or 'column'
		@option {Array<String>} axisLabels lNGCHM labels in heatmap along axisName dimension
		@option {Array<String>} group1 Optional. NGCHM labels in heat map for group 1
		@option {Array<Striong>} group2 Optional. NGCHM labels in heat map for group 2
		@option {String} testToRun Optional. String denoting tests to run. E.g. 'T-test'
	*/
  const vanodiMessageHandlers = {};
  LNK.defineVanodiMessageHandler = defineVanodiMessageHandler;
  function defineVanodiMessageHandler(op, fn) {
    vanodiMessageHandlers[op] = fn;
  }
  function processVanodiMessage(instance, msg) {
    const debug = false;
    const fn = vanodiMessageHandlers[msg.op];
    if (debug)
      console.log({ m: "Processing Vanodi message", instance, msg, fn });
    if (fn) fn(instance, msg);
  }

  defineVanodiMessageHandler(
    "register",
    function vanodiRegister(instance, msg) {
      const paneId = getPaneIdFromInstance(instance);
      const loc = PANE.findPaneLocation(instance.iframe);
      instance.plugin.config = {
        name: msg.name,
        axes: msg.axes,
        options: msg.options,
      };
      if (Object.entries(instance.params).length === 0) {
        PIM.sendMessageToPlugin({ nonce: msg.nonce, op: "none" }); // Let plugin know we heard it.
        switchToPlugin(loc, instance.plugin.name);
        MMGR.getHeatMap().saveDataSentToPluginToMapConfig(
          msg.nonce,
          null,
          null,
        );
      } else {
        loc.paneTitle.innerText = instance.plugin.name;
        LNK.initializePanePlugin(msg.nonce, instance.params);
      }
      if (pluginRestoreInfo.hasOwnProperty(loc.pane.id)) {
        initializePluginWithMapConfigData(
          paneId,
          instance,
          pluginRestoreInfo[loc.pane.id],
        );
        delete pluginRestoreInfo[loc.pane.id];
      }
    },
  );

  function getPaneIdFromInstance(pluginInstance) {
    let paneId = pluginInstance.iframe.parentElement.parentElement.id;
    if (paneId == null) {
      throw "No pane found for this plugin";
    }
    return paneId;
  }

  /**
   * Send any existing data from mapConfig.json to plugin and close Gear Menu
   *
   * It's confusing because there are many things called 'data'. To hopefully help clarify:
   *
   *   paneInfo.config and paneInfo.data:
   *      This is the data send to the plugin when user clicked 'APPLY' on the Gear Menu
   *      before they saved the map. All plugins should have this data.
   *
   *      An annoying thing: if there are selected labels on the saved NGCHM that came from selecting points
   *      on, say, a scatter plot, those selections are NOT saved in the pluginConfigData :-(.
   *      So the current selectedLabels are re-generated and added below. TODO: modify the code
   *      that saves what becomes the pluginConfigData to capture selections that came from the plugin.
   *
   *   dataFromPlugin:
   *      This is the sort of data that is generated by the user's manupulation in the plugin,
   *      and did not come from the NGCHM. Example: the zoom/pan state of the 3D Scatter Plot.
   *      Some plugins have not yet been updated to send this data to the NGCHM when the user
   *      saves the .ngchm file; these plugins will not have any dataFromPlugin.
   */
  function initializePluginWithMapConfigData(paneId, pluginInstance, paneInfo) {
    if (typeof paneInfo == "undefined" || paneInfo.type != "plugin") {
      return;
    }
    if (paneInfo) {
      let nonce = pluginInstance.nonce;
      let config = paneInfo.config;
      let data = paneInfo.data;
      if (config) {
        data.axes.forEach((ax, idx) => {
          if (config.axes[idx].axisName) {
            ax.selectedLabels = getSelectedLabels(config.axes[idx].axisName);
          }
        });
        pluginInstance.params = config;
        if (data) {
          PIM.sendMessageToPlugin({ nonce, op: "plot", config, data });
          let dataFromPlugin = paneInfo.dataFromPlugin;
          if (dataFromPlugin)
            PIM.sendMessageToPlugin({
              nonce,
              op: "savedPluginData",
              dataFromPlugin,
            });
          PANE.removePopupNearIcon(
            document.getElementById(paneId + "Gear"),
            document.getElementById(paneId + "Icon"),
          );
        }
      }
    } else {
      return false;
    }
  }

  function getSelectedLabels(axis) {
    const allLabels = MMGR.getHeatMap().getAxisLabels(axis).labels;
    const searchItems = SRCHSTATE.getAxisSearchResults(axis); // axis == 'Row' or 'Column'
    let selectedLabels = [];
    searchItems.forEach((si, idx) => {
      let pointId = allLabels[si - 1];
      pointId =
        pointId.indexOf("|") !== -1
          ? pointId.substring(0, pointId.indexOf("!"))
          : pointId;
      selectedLabels.push(pointId);
    });
    return selectedLabels;
  }

  function switchToPlugin(loc, title) {
    PANE.registerPaneEventHandler(loc.pane, "empty", PIM.removePluginInstance);
    loc.pane.dataset.title = title + " Plug-in";
    loc.pane.dataset.intro =
      "This panel contains an instance of the " + title + " plug-in.";
    PANE.setPaneTitle(loc, title);
    const gearIcon = addGearIconToPane(loc);
    PANE.clearExistingDialogs(loc.pane.id);
    LNK.newGearDialog(gearIcon, loc.pane.id);
  }

  function addGearIconToPane(loc) {
    let gearIcon = loc.paneHeader.querySelector(".gearIcon");
    if (!gearIcon) {
      const paneid = loc.pane.id;
      gearIcon = UTIL.newSvgButton("icon-gear.gearIcon", {
        align: "top",
        id: paneid + "Icon",
      });
      gearIcon.dataset.popupName = paneid + "Gear";
      initializeGearIconMenu(gearIcon);
      PANE.addPanelIcons(loc, [gearIcon]);
    }
    return gearIcon;
  }

  // Initialize DOM IMG element icon to a gear menu.
  function initializeGearIconMenu(icon) {
    icon.onmouseout = function (e) {
      UHM.hlpC();
    };
    icon.onmouseover = function (e) {
      UHM.hlp(icon, "Open gear menu", 120, 0);
    };
    icon.onclick = function (e) {
      const debug = false;
      if (debug) console.log({ m: "paneGearIcon click", e });
      e.stopPropagation();
      let paneIdx = e.target.id.slice(0, -4); // e.g. 'pane2Gear'
      LNK.newGearDialog(icon, paneIdx);
    };
  }

  defineVanodiMessageHandler(
    "getLabels",
    function vanodiSendLabels(instance, msg) {
      if (msg.axisName === "row" || msg.axisName === "column") {
        PIM.sendMessageToPlugin({
          nonce: msg.nonce,
          op: "labels",
          labels: MMGR.getHeatMap().actualLabels(msg.axisName),
        });
      } else {
        console.log({
          m: "Malformed getLabels request",
          msg,
          detail: "msg.axisName must equal row or column",
        });
      }
    },
  );

  /* Message handler for when plugins send their data
   */
  defineVanodiMessageHandler(
    "sendingPluginData",
    function vanodiSaveData(instance, msg) {
      let pluginInstances = PIM.getPluginInstances();
      pluginInstances[instance.nonce]["dataFromPlugin"] = msg.pluginData;
      MMGR.getHeatMap().saveDataFromPluginToMapConfig(
        instance.nonce,
        pluginInstances[instance.nonce]["dataFromPlugin"],
      );
    },
  );

  /*
		Send an NGCHM property to plugin.
		
		Post message to plugin with value of given property, typically in response to a 
		'getProperty' message from a plugin. 
		Example incoming message: {vanodi: {op: 'getProperty', propertyName: 'ndexUUIDs', nonce: <nonce>}}.
		These are properties added to the NGCHM at build time, for example by using
		the R function 'chmAddProperty()'. 
		
		Inputs:
			loc: location of plugin.
			msg: message from plugin. Should have attribute 'propertyName',
			     whose value is the name of the property to retrieve from the NGCHM.
	*/
  defineVanodiMessageHandler(
    "getProperty",
    function vanodiSendProperty(loc, msg) {
      if (!msg.hasOwnProperty("propertyName")) {
        console.error('Incoming message missing attribute "propertyName"');
        return;
      }
      PIM.sendMessageToPlugin({
        nonce: msg.nonce,
        op: "property",
        propertyName: msg.propertyName,
        propertyValue: linkouts.getAttribute(msg.propertyName),
      });
    },
  );

  const vanodiKnownTests = [
    { label: "Mean", value: "Mean" },
    { label: "T-test", value: "T-test" },
  ];

  defineVanodiMessageHandler(
    "getTestData",
    /**
		Calls getAxisTestData to perform statistical tests, and posts results to plugin

		@function vanodiSendTestData
		@param {object} instance Plugin instance msg applies to
		@param {object} msg
		@option {String} op Specifices operation to perform. here 'getTestData'
		@option {String} testToRun Specifies tests to perform
		@option {String} axisName 'row' or 'column'
		@option {Array<String>} axisLabels labels of nodes from plugin (e.g. gene symbols from PathwayMapper)
		@option {Array<String>} group1 NGCHM labels for group 1
		@option {Array<String>} group2 NGCHM labels for group 2
	    */
    async function vanodiSendTestData(instance, msg) {
      // axisName: 'row',
      // axisLabels: labels of axisName elements to test
      // testToRun: name of test to run
      // group1: labels of other axis elements in group 1
      // group2: labels of other axis elements in group 2 (optional)

      // msg.axisName
      if (msg.axisName != "row" && msg.axisName != "column") {
        console.log({
          m: "Malformed getTestData request",
          msg,
          detail: "msg.axisName must equal row or column",
        });
      } else if (
        vanodiKnownTests.map((t) => t.label).indexOf(msg.testToRun) === -1
      ) {
        console.log({
          m: "Malformed getTestData request",
          msg,
          detail: "unknown test msg.testToRun",
          vanodiKnownTests,
        });
      } else if (msg.group1 == null) {
        console.log({
          m: "Malformed getTestData request",
          msg,
          detail: "group1 is required",
        });
      } else {
        var testData = await getAxisTestData(msg);
        if (testData == false) {
          return;
        } // return if no data to send
        PIM.sendMessageToPlugin({
          nonce: msg.nonce,
          op: "testData",
          data: testData,
        });
      }
    },
  );

  // Listen for messages from plugins.
  (function () {
    window.addEventListener("message", processMessage, false);
    function processMessage(e) {
      if (e.data.hasOwnProperty("vanodi")) {
        const msg = e.data.vanodi;
        if (!msg.hasOwnProperty("nonce")) {
          console.warn("Vanodi message received with no nonce: op==" + msg.op);
          return;
        }
        if (msg.nonce == "prompt" && msg.op == "register") {
          // Intercept special case: register message from a plugin instance that can't get a nonce automatically.
          // Ask user for permission.
          const instance = PIM.getPluginInstanceByName(msg.name);
          if (!instance) {
            console.warn(
              "Vanodi registration message received for unknown plugin: name==" +
                msg.name,
            );
            return;
          }
          if (confirm("Grant access to plugin " + msg.name + "?")) {
            // Post special message containing actual nonce to the plugin.
            instance.source = e.source;
            e.source.postMessage(
              {
                vanodi: {
                  op: "changeNonce",
                  nonce: msg.actualNonce,
                  newNonce: instance.nonce,
                },
              },
              "*",
            );
            // Then proceed as if a normal register message for the instance's nonce was received.
            msg.nonce = instance.nonce;
          } else {
            return;
          }
        }
        const instance = PIM.getPluginInstance(msg.nonce);
        if (instance) {
          processVanodiMessage(instance, msg);
        }
      }
    }
  })();

  /* Used when dragging and dropping a plugin */
  LNK.loadLinkoutSpec = function loadLinkoutSpec(kind, spec) {
    console.log({ m: "loadLinkoutSpec", kind, spec });
    if (kind === "panel-plugin") {
      // Panel plugin was dropped.  Add plugin to available panel plugins.
      const plugin = LNK.registerPanePlugin(spec);
      let panes = document.querySelectorAll(
        `[data-plugin-name='${spec.name}']`,
      );
      [...panes].forEach((pane) => {
        const loc = PANE.findPaneLocation(pane);
        const iframes = loc.pane.getElementsByTagName("IFRAME");
        const oldNonce = iframes.length > 0 ? iframes[0].dataset.nonce : false;
        const oldInstance = oldNonce ? PIM.getPluginInstance(oldNonce) : null;
        PANE.emptyPaneLocation(loc);
        LNK.switchPaneToPlugin(loc, plugin);
        if (oldInstance)
          PIM.setPanePluginOptions(
            pane,
            oldInstance.params,
            LNK.initializePanePlugin,
          );
      });
      UHM.hlp(
        document.getElementById("barMenu_btn"),
        "Added panel plugin " + spec.name,
        150,
        false,
        0,
      );
      setTimeout(UHM.hlpC, 5000);
    } else {
      addLinkoutPlugin(kind, spec);
    }
  };

  // Add a linkout or hamburger plugin.
  function addLinkoutPlugin(kind, spec) {
    if (
      (kind === "linkout-plugin" || kind === "hamburger-plugin") &&
      spec.src
    ) {
      // Create an instance of the plugin.
      const iframe = PIM.createPluginInstance(kind, spec);
      iframe.classList.add("hide");
      document.body.append(iframe);

      // For each linkout, create a function that sends a Vanodi message to the instance.
      if (kind === "linkout-plugin") {
        for (let idx = 0; idx < spec.linkouts.length; idx++) {
          spec.linkouts[idx].linkoutFn = ((spec, nonce) =>
            function (labels) {
              PIM.sendMessageToPlugin({
                nonce,
                op: "linkout",
                id: spec.messageId,
                labels,
              });
            })(spec.linkouts[idx], iframe.dataset.nonce);
        }
        for (let idx = 0; idx < spec.matrixLinkouts.length; idx++) {
          spec.matrixLinkouts[idx].linkoutFn = ((spec, nonce) =>
            function (labels) {
              PIM.sendMessageToPlugin({
                nonce,
                op: "matrixLinkout",
                id: spec.messageId,
                labels,
              });
            })(spec.matrixLinkouts[idx], iframe.dataset.nonce);
        }
        linkouts.addPlugin(spec);
      } else {
        spec.action = ((spec, nonce) =>
          function () {
            PIM.sendMessageToPlugin({
              nonce,
              op: "hamburgerLinkout",
              id: spec.messageId,
            });
          })(spec, iframe.dataset.nonce);
        linkouts.addHamburgerLinkout(spec);
      }

      // Regenerate the linkout menus.
      CUST.definePluginLinkouts();
    }
  }
  /**
   *
   * Retrieves a list of special coordinates from the heatmap's column and row coordinate bars.
   * Special coordinates are identified by the pattern ".coordinate.<number>" and are returned as unique objects
   * with their names and whether they belong to a row or column.
   *
   * @returns {Array<Object>} An array of objects representing the special coordinates.
   *                          Each object has the following properties:
   *                          - {string} name: The name of the coordinate without the ".coordinate.<number>" suffix.
   *                          - {string} rowOrColumn: Indicates whether the coordinate belongs to a "row" or "column".
   *
   * @example
   * // Example usage:
   * const specialCoords = getSpecialCoordinatesList();
   * console.log(specialCoords);
   * // Output might look like:
   * // [
   * //   { name: 'PCA', rowOrColumn: 'column' },
   * //   { name: 'UMAP', rowOrColumn: 'column' },
   * //   { name: 'PCA', rowOrColumn: 'row' }
   * // ]
   */
  function getSpecialCoordinatesList() {
    let columnCovariateNames = MMGR.getHeatMap().getColClassificationConfigOrder();
    let specialColumnCoords = columnCovariateNames.filter((x) => /\.coordinate\.\d+$/.test(x)) /* get only "*.coordinate.<number>" */
                              .map((x) => x.replace(/\.coordinate\.\d+$/, "")) /* remove the ".coordinate.<number>" suffix */
    let uniqueColumnCoords = [...new Set(specialColumnCoords)] /* remove duplicates */
                              .map((x) => ({name: x, rowOrColumn: "column"})); /* create object with name and rowOrColumn properties */
    let rowCovariateNames = MMGR.getHeatMap().getRowClassificationConfigOrder();
    let specialRowCoords = rowCovariateNames.filter((x) => /\.coordinate\.\d+$/.test(x)) /* get only "*.coordinate.<number>" */
                           .map((x) => x.replace(/\.coordinate\.\d+$/, "")) /* remove the ".coordinate.<number>" suffix */
    let uniqueRowCoords = [...new Set(specialRowCoords)] /* remove duplicates */
                           .map((x) => ({name: x, rowOrColumn: "row"})); /* create object with name and rowOrColumn properties */
    let specialCoords = uniqueColumnCoords.concat(uniqueRowCoords);
    specialCoords = [...new Set(specialCoords)]; /* remove duplicates */
    return specialCoords;
  }

  CUST.waitForPlugins(() => {
    const panePlugins = LNK.getPanePlugins();
    panePlugins.forEach((plugin) => {
      PANE.registerPaneExtraOption(
        plugin.name,
        () => !!plugin.params,
        LNK.switchPaneToPlugin,
        plugin,
      );
    });
  });
})(); // end of big IIFE
