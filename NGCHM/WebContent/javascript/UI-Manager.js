(function () {
  "use strict";
  NgChm.markFile();

  /**
   * General purpose javascript helper funcitons
   */

  //Define Namespace for NgChm UI Manager.
  const UIMGR = NgChm.createNS("NgChm.UI-Manager");

  const UTIL = NgChm.importNS("NgChm.UTIL");
  const COMPAT = NgChm.importNS("NgChm.CM");
  const FLICK = NgChm.importNS("NgChm.FLICK");
  const MAPREP = NgChm.importNS("NgChm.MAPREP");
  const SUM = NgChm.importNS("NgChm.SUM");
  const SMM = NgChm.importNS("NgChm.SMM");
  const PDF = NgChm.importNS("NgChm.PDF");
  const DET = NgChm.importNS("NgChm.DET");
  const DEV = NgChm.importNS("NgChm.DEV");
  const DMM = NgChm.importNS("NgChm.DMM");
  const LNK = NgChm.importNS("NgChm.LNK");
  const DVW = NgChm.importNS("NgChm.DVW");
  const MMGR = NgChm.importNS("NgChm.MMGR");
  const PANE = NgChm.importNS("NgChm.Pane");
  const PIM = NgChm.importNS("NgChm.PIM");
  const SRCHSTATE = NgChm.importNS("NgChm.SRCHSTATE");
  const SRCH = NgChm.importNS("NgChm.SRCH");
  const DRAW = NgChm.importNS("NgChm.DRAW");
  const RECPANES = NgChm.importNS("NgChm.RecPanes");
  const CUST = NgChm.importNS("NgChm.CUST");
  const UHM = NgChm.importNS("NgChm.UHM");
  const TOUR = NgChm.importNS("NgChm.TOUR");

  const localFunctions = {};

  /***
   *  Functions related to saving Ng-Chms.
   */
  function saveHeatMapToNgchm() {
    const heatMap = MMGR.getHeatMap();
    PIM.requestDataFromPlugins();
    var success = true;
    if (heatMap.source() === MMGR.WEB_SOURCE) {
      success = MMGR.zipMapProperties(
        heatMap,
        JSON.stringify(heatMap.mapConfig),
      );
      showViewerSaveNotification(heatMap);
      UHM.messageBoxCancel();
    } else {
      UHM.showMsgBoxProgressBar();
      let waitForPluginDataCount = 0;
      let awaitingPluginData = setInterval(function () {
        waitForPluginDataCount = waitForPluginDataCount + 1; // only wait so long
        if (PIM.havePluginData() || waitForPluginDataCount > 3) {
          clearInterval(awaitingPluginData);
          PIM.warnAboutMissingPluginData();
          MMGR.zipSaveMapProperties(
            heatMap,
            addSaveStateToMapConfig(),
            UHM.msgBoxProgressMeter,
          ).then((success) => {
            UHM.messageBoxCancel();
            if (success) {
              showViewerSaveNotification(heatMap);
            }
          });
        }
      }, 1000);
    }
    heatMap.setUnAppliedChanges(false);
  }

  function autoSaveHeatMap(heatMap) {
    let success = true;
    if (MMGR.embeddedMapName === null) {
      heatMap.setRowClassificationOrder();
      heatMap.setColClassificationOrder();
      if (heatMap.source() !== MMGR.FILE_SOURCE) {
        // FIXME: BMB. Verify this does what it's required to do.
        // This appears to only be saving mapConfig.
        // What about mapData?
        success = MMGR.webSaveMapProperties(heatMap);
      } else {
        zipSaveOutdated(heatMap);
      }
    }
    return success;
  }

  function addSaveStateToMapConfig() {
    const mapConfig = MMGR.getHeatMap().getMapConfig();
    if (!mapConfig.hasOwnProperty("panel_configuration")) {
      mapConfig["panel_configuration"] = {};
    }

    savePaneLayoutToMapConfig();
    saveSummaryMapInfoToMapConfig();
    saveDetailMapInfoToMapConfig();
    saveFlickInfoToMapConfig();
    saveSelectionsToMapConfig();
    return mapConfig;

    /**
     * Save the pane layout to mapConfig
     */
    function savePaneLayoutToMapConfig() {
      let layoutToSave = document.getElementById("ngChmContainer");
      let layoutJSON = PANE.paneLayout(layoutToSave);
      mapConfig["panel_configuration"]["panel_layout"] = layoutJSON;
    }

    /**
     * Save the summary pane details to mapConfig.
     * (This just saves which pane, if any, is the summary pane.)
     */
    function saveSummaryMapInfoToMapConfig() {
      const pane = SUM.chmElement && SUM.chmElement.parentElement;
      if (pane && pane.classList.contains("pane")) {
        mapConfig.panel_configuration[pane.id] = {
          type: "summaryMap",
        };
      }
    }

    /**
     * Save enough information from the detail map to reconstruct the zoom/pan state
     */
    function saveDetailMapInfoToMapConfig() {
      DVW.detailMaps.forEach((dm) => {
        mapConfig.panel_configuration[dm.pane] = DET.getDetailSaveState(dm);
      });
    }

    /**
     * Save information about the data layers (i.e. 'flick info') to mapConfig
     */
    function saveFlickInfoToMapConfig() {
      try {
        mapConfig.panel_configuration["flickInfo"] = FLICK.getFlickSaveState();
      } catch (err) {
        console.error(err);
      }
    }

    function saveSelectionsToMapConfig() {
      mapConfig.panel_configuration["selections"] =
        SRCHSTATE.getSearchSaveState();
      if (SUM.rowDendro) {
        const bars = SUM.rowDendro.saveSelectedBars();
        if (bars.length > 0) {
          mapConfig.panel_configuration["selections"]["selectedRowDendroBars"] =
            bars;
        }
      }
      if (SUM.colDendro) {
        const bars = SUM.colDendro.saveSelectedBars();
        if (bars.length > 0) {
          mapConfig.panel_configuration["selections"]["selectedColDendroBars"] =
            bars;
        }
      }
    }
  }

  /**********************************************************************************
   * FUNCTION - zipSaveOutdated: This function handles all of the tasks necessary
   * display a modal window for saving a zip file is being saved. The textId passed in
   * instructs the code to display either the startup save OR preferences save message.
   **********************************************************************************/
  function zipSaveOutdated(heatMap) {
    const text =
      "<br>This NG-CHM contains an outdated heat map configuration. It has been updated locally to be compatible with the latest version of the NG-CHM Viewer.<br><br>To avoid this notice in the future, replace your original file with the version now being displayed.<br><br>";
    const msgBox = UHM.initMessageBox();
    msgBox.classList.add("file-viewer");
    UHM.setMessageBoxHeader("NG-CHM File Viewer");
    UHM.setMessageBoxText(text);
    addSaveToNgchmButton(() => {
      UHM.showMsgBoxProgressBar();
      MMGR.zipSaveMapProperties(
        heatMap,
        addSaveStateToMapConfig(),
        UHM.msgBoxProgressMeter,
      ).then((success) => {
        UHM.messageBoxCancel();
        if (success) {
          showViewerSaveNotification(heatMap);
        }
      });
    });
    addCancelSaveButton();
    UHM.displayMessageBox();
  }

  /**********************************************************************************
   * FUNCTION - showViewerSaveNotification: This function handles all of the tasks necessary
   * display a modal window whenever a zip file is being saved. The textId passed in
   * instructs the code to display either the startup save OR preferences save message.
   **********************************************************************************/
  function showViewerSaveNotification(heatMap) {
    const title = "NG-CHM File Viewer";
    const text =
      "<br>You have just saved a heat map as a NG-CHM file.  To open this new file you will need the NG-CHM File Viewer application.  To get the lastest version, press the Download Viewer button.<br><br>The application downloads as a single HTML file (ngchmApp.html).  When the download completes, you can run the application by double-clicking on the downloaded file.  You may want to save this file to a location of your choice on your computer for future use.<br><br>";
    MMGR.showDownloadViewerNotification(title, text);
  }

  function saveHeatMapToServer() {
    const heatMap = MMGR.getHeatMap();
    UHM.initMessageBox();
    const success = MMGR.webSaveMapProperties(heatMap);
    if (success !== "false") {
      heatMap.setUnAppliedChanges(false);
    } else {
      heatMap.setReadOnly();
      UHM.saveHeatMapChanges();
    }
    return success;
  }
  // End of map save functions.

  (function () {
    // Cache of access windows for the summary data corresponding to the flick1 and flick2 controls.
    // Used to ensure the summary level for the (up to) two data layers shown in the flick control
    // are kept available.
    const summaryWindows = {};

    // For debugging.
    UIMGR.getSummaryAccessWindows = function () {
      return summaryWindows;
    };

    /************************************************************************************************
     * FUNCTION: changeDataLayer - Responds to a change in a selected data layer.  All of these actions
     * depend upon the flick control being visible (i.e. active) There are 3 types of changes:
     * (1) User clicks on the toggle control.
     * (2) User changes the value of one of the 2 dropdowns AND the toggle control is on that dropdown.
     * (3) The user presses the one or two key, corresponding
     * to the 2 dropdowns, AND the current visible data layer is for the opposite dropdown.
     * If any of the above cases are met, the currentDl is changed and the screen is redrawn.
     *
     * change is an object containing three fields:
     * - element Either flick1 or flick2. The flick control that changed.
     * - layer The heat map layer now associated with element.
     * - redrawRequired element is the active control AND layer is different from the last layer
     *   selected (irrespective of which element it was associated with).
     ***********************************************************************************************/
    UIMGR.changeDataLayer = function changeDataLayer(change) {
      const heatMap = MMGR.getHeatMap();
      // Associated the flick element with an AccessWindow for the summary level for this layer.
      summaryWindows[change.flickElement] = getSummaryAccessWindow(
        heatMap,
        change.layer,
      );
      // Redraw the UI if the currently visible layer changed.
      if (change.redrawRequired) {
        heatMap.setCurrentDL(change.layer);
        SUM.buildSummaryTexture();
        SUM.drawLeftCanvasBox();
        SUM.drawSelectionMarks();
        DET.setDrawDetailsTimeout(DET.redrawSelectionTimeout);
      }
    };
    FLICK.setFlickHandler(UIMGR.changeDataLayer);

    UIMGR.initializeSummaryWindows = function (heatMap) {
      const flickState = FLICK.getFlickState();
      const first = flickState.shift();
      summaryWindows[first.element] = getSummaryAccessWindow(
        heatMap,
        first.layer,
      );
      setTimeout(() => {
        flickState.forEach((alt) => {
          summaryWindows[alt.element] = getSummaryAccessWindow(
            heatMap,
            alt.layer,
          );
        });
      });
    };

    function getSummaryAccessWindow(heatMap, layer) {
      return heatMap.getNewAccessWindow({
        layer: layer,
        level: MAPREP.SUMMARY_LEVEL,
        firstRow: 1,
        firstCol: 1,
        numRows: heatMap.getNumRows(MAPREP.SUMMARY_LEVEL),
        numCols: heatMap.getNumColumns(MAPREP.SUMMARY_LEVEL),
      });
    }
  })();

  // Function configurePanelInterface must called once immediately after the HeatMap is loaded.
  // It configures the initial Panel user interface according to the heat map preferences and
  // the interface configuration parameters.
  //
  (function () {
    const debug = false;
    var firstTime = true;

    UIMGR.configurePanelInterface = function configurePanelInterface(event) {
      if (event !== MMGR.Event_INITIALIZED) {
        return;
      }

      const heatMap = MMGR.getHeatMap();
      UIMGR.initializeSummaryWindows(heatMap);

      //If any new configs were added to the heatmap's config, save the config file.
      if (
        MMGR.mapUpdatedOnLoad(heatMap) &&
        heatMap.getMapInformation().read_only !== "Y"
      ) {
        var success = autoSaveHeatMap(heatMap);
      }
      heatMap.setSelectionColors();
      SRCH.configSearchInterface(heatMap);

      CUST.addCustomJS();
      if (heatMap.source() === MMGR.FILE_SOURCE) {
        firstTime = true;
        if (SUM.chmElement) {
          PANE.emptyPaneLocation(PANE.findPaneLocation(SUM.chmElement));
        }
        if (DVW.detailMaps.length > 0) {
          for (let i = 0; i < DVW.detailMaps.length; i++) {
            PANE.emptyPaneLocation(
              PANE.findPaneLocation(DVW.detailMaps[i].chm),
            );
          }
        }
      }
      // Split the initial pane horizontally and insert the
      // summary and detail NGCHMs into the children.
      if (firstTime) {
        firstTime = false;
      } else {
        return;
      }
      UTIL.showLoader("Configuring interface...");
      //
      // Define the DROP TARGET and set the drop event handler(s).
      if (debug) console.log("Configuring drop event handler");
      const dropTarget = document.getElementById("droptarget");
      function handleDropData(txt) {
        if (debug) console.log({ m: "Got drop data", txt });
        const j = JSON.parse(txt);
        if (j && j.type === "linkout.spec" && j.kind && j.spec) {
          LNK.loadLinkoutSpec(j.kind, j.spec);
        }
      }
      ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
        dropTarget.addEventListener(eventName, function dropHandler(ev) {
          ev.preventDefault();
          ev.stopPropagation();
          if (eventName == "drop") {
            if (debug) console.log({ m: "drop related event", eventName, ev });
            const dt = ev.dataTransfer;
            const files = dt.files;
            [...files].forEach((file) => {
              if (debug) console.log({ m: "dropFile", file });
              if (file.type == "application/json") {
                const reader = new FileReader();
                reader.onloadend = () => {
                  handleDropData(reader.result);
                };
                reader.readAsText(file);
              }
            });
            const txt = dt.getData("Application/json");
            if (txt) handleDropData(txt);
            dropTarget.classList.remove("visible");
          } else if (eventName === "dragenter") {
            dropTarget.classList.add("visible");
          } else if (eventName === "dragleave") {
            dropTarget.classList.remove("visible");
          }
        });
      });
      SUM.initSummaryData({
        clearSearchItems: function (axis) {
          // Clear all search items on an axis. Does not redraw.
          SRCH.clearSearchItems(axis);
        },
        clearSearchRange: function (axis, left, right) {
          // Clear range of search items on an axis.  Does not redraw.
          SRCH.clearSearchRange(axis, left, right);
        },
        setAxisSearchResults: function (axis, left, right) {
          // Set range of search items on an axis.  Does not redraw.
          SRCH.setAxisSearchResults(axis, left, right);
        },
        showSearchResults: function () {
          // Redraw search results.
          //SRCH.showSearchResults,
          SRCH.redrawSearchResults();
        },
        callDetailDrawFunction: DET.callDetailDrawFunction,
      });
      const initialLoc = PANE.initializePanes();
      const panelConfig = MMGR.getHeatMap().getPanelConfiguration();
      if (panelConfig) {
        RECPANES.reconstructPanelsFromMapConfig(initialLoc, panelConfig);
      } else if (UTIL.showSummaryPane && UTIL.showDetailPane) {
        const s = PANE.splitPane(false, initialLoc);
        PANE.setPanePropWidths(
          MMGR.getHeatMap().getDividerPref(),
          s.child2,
          s.child1,
          s.divider,
        );
        SMM.switchPaneToSummary(PANE.findPaneLocation(s.child2));
        setTimeout(() => {
          DMM.switchPaneToDetail(PANE.findPaneLocation(s.child1));
          SRCH.doInitialSearch();
          PANE.resizePane(SUM.chmElement);
        }, 32);
      } else if (UTIL.showSummaryPane) {
        SMM.switchPaneToSummary(initialLoc);
        SRCH.doInitialSearch();
      } else if (UTIL.showDetailPane) {
        DMM.switchPaneToDetail(initialLoc);
        SRCH.doInitialSearch();
      }
    };
  })();

  /**********************************************************************************
   * FUNCTION - onLoadCHM: This function performs "on load" processing for the NG_CHM
   * Viewer.  It will load either the file mode viewer, standard viewer, or widgetized
   * viewer.
   **********************************************************************************/
  UIMGR.onLoadCHM = function (sizeBuilderView) {
    // Flush summary cache before possibly replacing current CHM with a new map.
    SUM.summaryHeatMapCache = {};

    UTIL.isBuilderView = sizeBuilderView;
    //Run startup checks that enable startup warnings button.
    setDragPanels();

    // See if we are running in file mode AND not from "widgetized" code - launcHed locally rather than from a web server (
    if (
      UTIL.mapId === "" &&
      UTIL.mapNameRef === "" &&
      MMGR.embeddedMapName === null
    ) {
      //In local mode, need user to select the zip file with data (required by browser security)
      var chmFileItem = document.getElementById("fileButton");
      document.getElementById("menuFileOpen").style.display = "";
      document.getElementById("detail_buttons").style.display = "none";
      chmFileItem.style.display = "";
      chmFileItem.addEventListener("change", loadFileModeCHM, false);
      UTIL.showSplashExample();
    } else {
      UTIL.showLoader("Loading NG-CHM from server...");
      //Run from a web server.
      var mapName = UTIL.mapId;
      var dataSource = MMGR.WEB_SOURCE;
      if (MMGR.embeddedMapName !== null && ngChmWidgetMode !== "web") {
        mapName = MMGR.embeddedMapName;
        dataSource = MMGR.FILE_SOURCE;
        var embedButton = document.getElementById("NGCHMEmbedButton");
        if (embedButton !== null) {
          document.getElementById("NGCHMEmbed").style.display = "none";
        } else {
          loadLocalModeCHM(sizeBuilderView);
        }
      } else {
        if (MMGR.embeddedMapName !== null) {
          mapName = MMGR.embeddedMapName;
          dataSource = MMGR.LOCAL_SOURCE;
        }
        resetCHM();
        initDisplayVars();
        MMGR.createHeatMap(dataSource, mapName, [
          UIMGR.configurePanelInterface,
          SUM.processSummaryMapUpdate,
          DET.processDetailMapUpdate,
        ]);
      }
    }
    document
      .getElementById("summary_canvas")
      .addEventListener(
        "wheel",
        DEV.handleScroll,
        UTIL.passiveCompat({ capture: false, passive: false }),
      );
    initializeKeyNavigation();
  };

  /**********************************************************************************
   * FUNCTION - loadLocalModeCHM: This function is called when running in local file mode and
   * with the heat map embedded in a "widgetized" web page.
   **********************************************************************************/
  function loadLocalModeCHM(sizeBuilderView) {
    //Special case for embedded version where a blob is passed in.
    if (MMGR.embeddedMapName instanceof Blob) {
      loadBlobModeCHM(sizeBuilderView);
      return;
    }
    if (UTIL.isValidURL(MMGR.embeddedMapName) === true) {
      loadCHMFromURL(sizeBuilderView);
      return;
    }
    //Else, fetch the .ngchm file
    var req = new XMLHttpRequest();
    req.open("GET", MMGR.localRepository + "/" + MMGR.embeddedMapName);
    req.responseType = "blob";
    req.onreadystatechange = function () {
      if (req.readyState == req.DONE) {
        if (req.status != 200) {
          console.log("Failed in call to get NGCHM from server: " + req.status);
          UTIL.showLoader("Failed to get NGCHM from server");
        } else {
          var chmBlob = new Blob([req.response], { type: "application/zip" }); // req.response;
          var chmFile = new File([chmBlob], MMGR.embeddedMapName);
          resetCHM();
          var split = chmFile.name.split(".");
          if (split[split.length - 1].toLowerCase() !== "ngchm") {
            // check if the file is a .ngchm file
            UHM.invalidFileFormat();
          } else {
            displayFileModeCHM(chmFile, sizeBuilderView);
          }
        }
      }
    };
    req.send();
  }

  /**********************************************************************************
   * FUNCTION - loadCHMFromURL: Works kind of like local mode but works when javascript
   * passes in the ngchm as a blob.
   **********************************************************************************/
  function loadCHMFromURL(sizeBuilderView) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", MMGR.embeddedMapName, true);
    xhr.setRequestHeader("Access-Control-Allow-Origin", "*");
    xhr.responseType = "blob";
    xhr.onload = function (e) {
      if (this.status == 200) {
        var myBlob = this.response;
        resetCHM();
        displayFileModeCHM(myBlob, sizeBuilderView);
      }
    };
    xhr.send();
  }

  /**********************************************************************************
   * FUNCTION - loadCHMFromBlob: Works kind of like local mode but works when javascript
   * passes in the ngchm as a blob.
   **********************************************************************************/
  function loadBlobModeCHM(sizeBuilderView) {
    var chmFile = new File([MMGR.embeddedMapName], "ngchm");
    resetCHM();
    displayFileModeCHM(chmFile, sizeBuilderView);
  }

  /**********************************************************************************
   * FUNCTION - loadFileModeCHM: This function is called when running in stand-alone
   * file mode and  user selects the chm data .zip file.
   **********************************************************************************/
  function loadFileModeCHM() {
    UTIL.showLoader("Loading NG-CHM from file...");
    var chmFile = document.getElementById("chmFile").files[0];
    var split = chmFile.name.split(".");
    if (split[split.length - 1].toLowerCase() !== "ngchm") {
      // check if the file is a .ngchm file
      UHM.invalidFileFormat();
    } else {
      displayFileModeCHM(chmFile);
      openFileToggle();
    }
  }

  function openFileToggle() {
    const fileButton = document.getElementById("fileButton");
    const detailButtons = document.getElementById("detail_buttons");
    if (fileButton.style.display === "none") {
      location.reload();
    } else {
      fileButton.style.display = "none";
      detailButtons.style.display = "";
    }
  }

  /**********************************************************************************
   * FUNCTION - displayFileModeCHM: This function performs functions shared by the
   * stand-alone and widgetized "file" versions of the application.
   **********************************************************************************/
  function displayFileModeCHM(chmFile, sizeBuilderView) {
    resetCHM();
    initDisplayVars();
    MMGR.createHeatMap(
      MMGR.FILE_SOURCE,
      "",
      [
        UIMGR.configurePanelInterface,
        SUM.processSummaryMapUpdate,
        DET.processDetailMapUpdate,
      ],
      chmFile,
    );
    if (typeof sizeBuilderView !== "undefined" && sizeBuilderView) {
      UTIL.showDetailPane = false;
      PANE.showPaneHeader = false;
      MMGR.getHeatMap().addEventListener(builderViewSizing);
    }
  }

  /**********************************************************************************
   * FUNCTION - builderViewSizing: This function handles the resizing of the summary
   * panel for the builder in cases where ONLY the summary panel is being drawn.
   **********************************************************************************/
  function builderViewSizing(event) {
    if (typeof event !== "undefined" && event !== MMGR.Event_INITIALIZED) {
      return;
    }

    const header = document.getElementById("mdaServiceHeader");
    if (!header.classList.contains("hide")) {
      header.classList.add("hide");
      window.onresize();
    }
  }

  /**********************************************************************************
   * FUNCTION - resetCHM: This function will reload CHM SelectionManager parameters
   * when loading a file mode heatmap.  Specifically for handling the case where switching
   * from one file-mode heatmap to another
   **********************************************************************************/
  function resetCHM() {
    SRCH.clearAllSearchResults();
    DVW.scrollTime = null;
    SUM.colDendro = null;
    SUM.rowDendro = null;
  }

  /**********************************************************************************
   * FUNCTION - initDisplayVars: This function reinitializes summary and detail
   * display values whenever a file-mode map is opened.  This is done primarily
   * to reset screens when a second, third, etc. map is opened.
   **********************************************************************************/
  function initDisplayVars() {
    DRAW.widthScale = 1; // scalar used to stretch small maps (less than 250) to be proper size
    DRAW.heightScale = 1;
    SUM.summaryHeatMapCache = {};
    SUM.colTopItemsWidth = 0;
    SUM.rowTopItemsHeight = 0;
    DMM.nextMapNumber = 1;
    DEV.setMouseDown(false);
    MMGR.initAxisLabels();
    UTIL.removeElementsByClass("DynamicLabel");
    SRCH.clearAllCurrentSearchItems();
  }

  /**********************************************************************************
   * FUNCTION - setDragPanels: This function configures selected DIV panels as "drag
   * panels", allowing them to be moved on the screen.
   **********************************************************************************/
  function setDragPanels() {
    var panel = document.getElementById("prefs");
    if (panel !== null) {
      UTIL.dragElement(document.getElementById("prefs"));
      UTIL.dragElement(document.getElementById("pdfPrefs"));
      UTIL.dragElement(document.getElementById("msgBox"));
      UTIL.dragElement(document.getElementById("linkBox"));
    }
  }

  /**********************************************************************************
   * FUNCTION - embedCHM: This function is a special pre-processing function for the
   * widgetized version of the NG-CHM Viewer.  It will take the map name provided
   * by the user (embedded in an unaffiliated web page) and pass that on to the
   * on load processing for the viewer.  repository (default .) is the path to the
   * directory containing the specified map.
   **********************************************************************************/
  NgChm.exportToNS("NgChm.API", { embedCHM, showEmbed, showEmbedded });
  // FIXME: BMB: Why do both showEmbed and showEmbedded exist and how are they different?
  // To preserve compatibility with old API:
  Object.assign(UTIL, { embedCHM, showEmbed, showEmbedded });

  function embedCHM(map, repository, sizeBuilderView) {
    MMGR.embeddedMapName = map;
    MMGR.localRepository = repository || ".";
    //Reset dendros for local/widget load
    SUM.colDendro = null;
    SUM.rowDendro = null;
    //	DET.colDendro = null;
    //	DET.rowDendro = null;
    UIMGR.onLoadCHM(sizeBuilderView);
  }

  /**********************************************************************************
   * FUNCTION - showEmbed: This function shows the embedded heat map when the
   * user clicks on the embedded map image.
   **********************************************************************************/
  function showEmbed(baseDiv, dispWidth, dispHeight, customJS) {
    var embeddedWrapper = document.getElementById("NGCHMEmbedWrapper");
    UTIL.embedThumbWidth = embeddedWrapper.style.width;
    UTIL.embedThumbHeight = embeddedWrapper.style.height;
    var embeddedCollapse = document.getElementById("NGCHMEmbedCollapse");
    var embeddedMap = document.getElementById("NGCHMEmbed");
    var iFrame = window.frameElement; // reference to iframe element container
    iFrame.className = "ngchm";
    var wid = 100;
    if (dispWidth < 100) {
      wid = wid * (dispWidth / 100);
    }
    var hgt = 100;
    if (dispHeight < 100) {
      hgt = hgt * (dispHeight / 100);
    }
    iFrame.style.height = hgt + "vh";
    iFrame.style.width = wid + "vw";
    iFrame.style.display = "flex";
    embeddedMap.style.height = "92vh";
    embeddedMap.style.width = "97vw";
    embeddedMap.style.display = "flex";
    embeddedMap.style.flexDirection = "column";
    embeddedWrapper.style.display = "none";
    embeddedCollapse.style.display = "";
    if (UTIL.embedLoaded === false) {
      UTIL.embedLoaded = true;
      loadLocalModeCHM(false);
      if (customJS !== "") {
        setTimeout(function () {
          CUST.addExtraCustomJS(customJS);
        }, 2000);
      }
    }
  }

  /**********************************************************************************
   * FUNCTION - showEmbed: This function shows the embedded heat map when the
   * user clicks on the embedded map image.  It is used by NGCHM_Embed.js from
   * the minimized file ngchmEmbed-min.js
   **********************************************************************************/
  function showEmbedded(baseDiv, iframeStyle, customJS) {
    var embeddedWrapper = document.getElementById("NGCHMEmbedWrapper");
    UTIL.embedThumbWidth = embeddedWrapper.style.width;
    UTIL.embedThumbHeight = embeddedWrapper.style.height;
    var embeddedCollapse = document.getElementById("NGCHMEmbedCollapse");
    var embeddedMap = document.getElementById("NGCHMEmbed");
    var iFrame = window.frameElement; // reference to iframe element container
    iFrame.className = "ngchm";
    iFrame.style = iframeStyle;
    iFrame.style.display = "flex";
    embeddedMap.style.height = "92vh";
    embeddedMap.style.width = "97vw";
    embeddedMap.style.display = "flex";
    embeddedMap.style.flexDirection = "column";
    embeddedWrapper.style.display = "none";
    embeddedCollapse.style.display = "";
    if (UTIL.embedLoaded === false) {
      UTIL.embedLoaded = true;
      loadLocalModeCHM(false);
      if (customJS !== "") {
        setTimeout(function () {
          CUST.addExtraCustomJS(customJS);
        }, 2000);
      }
    }
  }

  function showTutorialVideos() {
    const msgBox = UHM.newMessageBox("videos");
    UHM.setNewMessageBoxHeader(msgBox, "NG-CHM Tutorial Videos");
    const messageBox = UHM.getNewMessageTextBox(msgBox);

    const youTubePlayList = UTIL.newElement("DIV.youtube");
    youTubePlayList.innerHTML =
      '<iframe width="560" height="315" src="https://www.youtube.com/embed/videoseries?list=PLIBaINv-Qmd05G3Kj7SbBbSAPZrG-H5bq" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>';
    youTubePlayList.firstChild.classList.add("youtube");
    messageBox.innerHTML = "";
    messageBox.appendChild(youTubePlayList);

    UHM.setNewMessageBoxButton(msgBox, "close", {
      type: "text",
      text: "Close",
      tooltip: "Closes this dialog",
    });
    UHM.displayNewMessageBox(msgBox);
  }

  /**********************************************************************************
   * FUNCTION - widgetHelp: This function displays a special help popup box for
   * the widgetized version of the NG-CHM embedded viewer.
   **********************************************************************************/
  UIMGR.widgetHelp = function () {
    const heatMap = MMGR.getHeatMap();
    const isMapLoaded = heatMap && heatMap.isMapLoaded();
    const logos = document.getElementById("aboutLogos");
    // Logos are not included in the widgetized version.
    if (logos) {
      logos.style.display = "";
    }
    UHM.initMessageBox();
    UHM.setMessageBoxHeader("About NG-CHM Viewer");
    const mapVersion = isMapLoaded
      ? heatMap.getMapInformation().version_id
      : "N/A";
    const messageBox = UHM.getMessageTextBox();
    messageBox.style.width = "40em";
    let text =
      "<p>The NG-CHM Heat Map Viewer is a dynamic, graphical environment for exploration of clustered or non-clustered heat map data in a web browser. It supports zooming, panning, searching, covariate bars, and link-outs that enable deep exploration of patterns and associations in heat maps.</p>";
    messageBox.innerHTML = text;

    messageBox.appendChild(
      UTIL.newElement(
        "P",
        {},
        "Links to additional NG-CHM information and help:",
      ),
    );
    const links = UTIL.newElement("UL");
    addLink(
      links,
      "https://bioinformatics.mdanderson.org/public-software/ngchm/",
      "NG-CHM Project Page",
    );
    addLink(links, "https://www.ngchm.net", "NG-CHM News and Updates");
    addLink(
      links,
      "https://bioinformatics.mdanderson.org/public-software/ngchm/#video-tutorials",
      "Video tutorials",
    );
    messageBox.appendChild(links);

    const versions = UTIL.newElement("TABLE");
    addVersion(versions, "Software Version", COMPAT.version);
    if (heatMap) {
      addVersion(versions, "Linkouts Version", linkouts.getVersion());
      addVersion(versions, "Map Version", mapVersion);
    }
    messageBox.appendChild(versions);

    messageBox.appendChild(
      UTIL.newElement("P", {}, [
        "<b>Citation:</b>",
        " Michael C. Ryan, Mark Stucky, Chris Wakefield, James M. Melott, Rehan Akbani, John N. Weinstein, and Bradley M. Broom,",
        " Interactive Clustered Heat Map Builder: An easy web-based tool for creating sophisticated clustered heat maps.",
        UTIL.newElement(
          "A",
          {
            href: "https://doi.org/10.12688/f1000research.20590.2",
            target: "_blank",
          },
          ["F1000Research 2019, 8 (ISCB Comm J):1750"],
        ),
        ".",
      ]),
    );
    messageBox.appendChild(
      UTIL.newElement("P", {}, [
        "The NG-CHM Viewer can be downloaded for stand-alone use. It is also incorporated into a variety of other platforms.",
      ]),
    );
    UHM.setMessageBoxButton(
      "videos",
      {
        type: "text",
        text: "Videos",
        tooltip: "Shows NG-CHM Tutorial Videos",
      },
      function () {
        UHM.messageBoxCancel();
        showTutorialVideos();
      },
    );
    UHM.setMessageBoxButton(
      "tour",
      {
        type: "text",
        text: "Take a tour",
        tooltip: "Displays an interactive tour of the user interface elements",
        disabled: !isMapLoaded,
        disabledReason: "no map is loaded",
      },
      function () {
        UHM.messageBoxCancel();
        TOUR.showTour(null);
      },
    );
    UHM.setMessageBoxButton(
      "viewer",
      {
        type: "text",
        text: "Download viewer",
        tooltip: "Downloads a copy of the NG-CHM viewer",
      },
      function () {
        UHM.messageBoxCancel();
        MMGR.zipAppDownload();
      },
    );
    UHM.setMessageBoxButton(
      "showkeys",
      {
        type: "text",
        text: "Show Keys",
        tooltip: "Display keyboard controls",
      },
      function () {
        UHM.messageBoxCancel();
        UIMGR.showKeysDialog();
      },
    );
    UHM.setMessageBoxButton(
      "plugins",
      {
        type: "text",
        text: "Show Plugins",
        tooltip: "Displays details of loaded/available plugins",
        disabled: !isMapLoaded,
        disabledReason: "no map is loaded",
      },
      function () {
        UHM.messageBoxCancel();
        localFunctions.openLinkoutHelp();
      },
    );
    UHM.setMessageBoxButton("close", {
      type: "text",
      text: "Close",
      tooltip: "Closes this dialog",
      default: true,
    });
    UHM.displayMessageBox();

    function addLink(links, href, text) {
      const LI = UTIL.newElement("LI", {}, [
        UTIL.newElement("A", { href, target: "_blank" }, [text]),
      ]);
      links.appendChild(LI);
    }

    function addVersion(versions, name, value) {
      const row = UTIL.newElement("TR", {}, [
        UTIL.newElement("TD", {}, name + ":"),
        UTIL.newElement("TD", {}, value),
      ]);
      versions.appendChild(row);
    }
  };

  function openHamburgerMenu(e) {
    var menu = document.getElementById("burgerMenuPanel");
    var parent = menu.parentElement;
    var parentTop = parent.offsetTop + 50;
    menu.style.top = parentTop + "px";
    if (menu.style.display === "none") {
      menu.style.display = "";
      // Disable Save as PDF menu item if no heatmap window visble.
      const pdfMenuItem = document.getElementById("menuPdf");
      if (PDF.canGeneratePdf() && PDF.pdfDialogClosed()) {
        pdfMenuItem.classList.remove("disabled");
      } else {
        pdfMenuItem.classList.add("disabled");
      }
      // Disabled Save Thumbnail menu if summary heatmap not visble.
      if (SUM.isVisible()) {
        document.getElementById("menuPng").classList.remove("disabled");
      } else {
        document.getElementById("menuPng").classList.add("disabled");
      }
    } else {
      menu.style.display = "none";
    }
  }

  /**********************************************************************************
   * FUNCTION - saveHeatMapChanges: This function handles all of the tasks necessary
   * display a modal window whenever the user requests to save heat map changes.
   **********************************************************************************/
  function saveHeatMapChanges() {
    const heatMap = MMGR.getHeatMap();
    var text;
    UHM.closeMenu();
    const msgBox = UHM.initMessageBox();
    msgBox.classList.add("save-heat-map");
    UHM.setMessageBoxHeader("Save Heat Map");
    //Have changes been made?
    if (heatMap.getUnAppliedChanges()) {
      if (heatMap.isFileMode() || typeof NgChm.galaxy !== "undefined") {
        // FIXME: BMB.  Improve Galaxy detection.
        if (typeof NgChm.galaxy !== "undefined") {
          text =
            "<br>Changes to the heatmap cannot be saved in the Galaxy history.  Your modifications to the heatmap may be written to a downloaded NG-CHM file.";
        } else {
          text =
            "<br>You have elected to save changes made to this NG-CHM heat map file.<br><br>You may save them to a new NG-CHM file that may be opened using the NG-CHM File Viewer application.<br><br>";
        }
        UHM.setMessageBoxText(text);
        addSaveToNgchmButton();
        addCancelSaveButton();
      } else {
        // If so, is read only?
        if (heatMap.isReadOnly()) {
          text =
            "<br>You have elected to save changes made to this READ-ONLY heat map. READ-ONLY heat maps cannot be updated.<br><br>However, you may save these changes to an NG-CHM file that may be opened using the NG-CHM File Viewer application.<br><br>";
          UHM.setMessageBoxText(text);
          addSaveToNgchmButton();
          addCancelSaveButton();
        } else {
          text =
            "<br>You have elected to save changes made to this heat map.<br><br>You have the option to save these changes to the original map OR to save them to an NG-CHM file that may be opened using the NG-CHM File Viewer application.<br><br>";
          UHM.setMessageBoxText(text);
          addSaveToNgchmButton();
          UHM.setMessageBoxButton(
            "saveOriginal",
            { type: "text", text: "Save original" },
            saveHeatMapToServer,
          );
          addCancelSaveButton();
        }
      }
    } else {
      text =
        "<br>There are no changes to save to this heat map at this time.<br><br>However, you may save the map as an NG-CHM file that may be opened using the NG-CHM File Viewer application.<br><br>";
      UHM.setMessageBoxText(text);
      addSaveToNgchmButton();
      addCancelSaveButton();
    }
    UHM.displayMessageBox();
  }

  // Adds a "Save to .ngchm" button to an initialized UHM dialog.
  //
  // Executes saveHeatMapToNgchm when clicked by default.  If saveFunc
  // is supplied, executes that instead.
  function addSaveToNgchmButton(saveFunc) {
    UHM.setMessageBoxButton(
      "saveToNgchm",
      {
        type: "text",
        text: "Save to .ngchm",
        disableOnClick: true,
        default: true,
      },
      saveFunc || saveHeatMapToNgchm,
    );
  }

  // Adds a "Cancel" button to an initialized UHM dialog.
  //
  // Executes UHM.messageBoxCancel when clicked by default.
  function addCancelSaveButton() {
    UHM.setMessageBoxButton(
      "cancelSave",
      { type: "text", text: "Cancel" },
      (button) => {
        if (UHM.isProgressBarVisible()) {
          UHM.cancelOperation();
          button.disabled = true;
        } else {
          UHM.messageBoxCancel();
        }
      },
    );
  }

  const aboutButton = document.getElementById("introButton");
  aboutButton.onclick = (ev) => {
    UIMGR.widgetHelp();
    ev.stopPropagation();
  };

  const hamburgerButton = document.getElementById("barMenu_btn");
  hamburgerButton.onclick = (ev) => {
    openHamburgerMenu(ev.target);
    ev.stopPropagation();
  };

  (function () {
    /*===========================================================
     *
     * LINKOUT HELP MENU ITEM FUNCTIONS
     *
     *===========================================================*/

    /**********************************************************************************
     * FUNCTION - openLinkoutHelp: The purpose of this function is to construct an
     * HTML tables for plugins associated with the current heat map AND plugins
     * installed for the NG-CHM instance. Then the logic to display the linkout
     * help box is called.
     **********************************************************************************/
    localFunctions.openLinkoutHelp = openLinkoutHelp;
    function openLinkoutHelp() {
      UHM.closeMenu();
      const mapLinksTbl = openMapLinkoutsHelp();
      const allLinksTbl = openAllLinkoutsHelp();
      linkoutHelp(mapLinksTbl, allLinksTbl);
    }

    /**********************************************************************************
     * FUNCTION - openMapLinkoutsHelp: The purpose of this function is to construct an
     * HTML table object containing all of the linkout plugins that apply to a
     * particular heat map. The table is created and then passed on to a linkout
     * popup help window.
     **********************************************************************************/
    function openMapLinkoutsHelp() {
      const heatMap = MMGR.getHeatMap();
      var validPluginCtr = 0;
      var pluginTbl = document.createElement("TABLE");
      var rowLabels = heatMap.getRowLabels().label_type;
      var colLabels = heatMap.getColLabels().label_type;
      pluginTbl.insertRow().innerHTML = UHM.formatBlankRow();
      var tr = pluginTbl.insertRow();
      var tr = pluginTbl.insertRow();
      for (var i = 0; i < CUST.customPlugins.length; i++) {
        var plugin = CUST.customPlugins[i];
        var rowPluginFound = isPluginFound(plugin, rowLabels);
        var colPluginFound = isPluginFound(plugin, colLabels);
        var matrixPluginFound = isPluginMatrix(plugin);
        var axesFound =
          matrixPluginFound && rowPluginFound && colPluginFound
            ? "Row, Column, Matrix"
            : rowPluginFound && colPluginFound
              ? "Row, Column"
              : rowPluginFound
                ? "Row"
                : colPluginFound
                  ? "Column"
                  : "None";
        //If there is at least one available plugin, fill table with plugin rows containing 5 cells
        if (rowPluginFound || colPluginFound) {
          //If first plugin being written to table, write header row.
          if (validPluginCtr === 0) {
            tr.className = "chmHdrRow";
            let td = tr.insertCell(0);
            td.innerHTML = "<b>Plug-in Axes</b>";
            td = tr.insertCell(0);
            td.innerHTML = "<b>Description</b>";
            td = tr.insertCell(0);
            td.innerHTML = "<b>Plug-in Name and Website</b>";
            td.setAttribute("colspan", 2);
          }
          validPluginCtr++;
          //If there is no plugin logo, replace it with hyperlink using plugin name
          var logoImage =
            typeof plugin.logo !== "undefined"
              ? "<img src='" +
                plugin.logo +
                "' onerror='this.onerror=null; this.remove();' width='100px'>"
              : "<b>" + plugin.name + "</b>";
          var hrefSite =
            typeof plugin.site !== "undefined"
              ? "<a href='" + plugin.site + "' target='_blank'> "
              : "<a>";
          var logo = hrefSite + logoImage + "</a>";
          var tr = pluginTbl.insertRow();
          tr.className = "chmTblRow";
          var tdLogo = tr.insertCell(0);
          tdLogo.className = "chmTblCell";
          tdLogo.innerHTML = logo;
          var tdName = tr.insertCell(1);
          tdName.className = "chmTblCell";
          tdName.style.fontWeight = "bold";
          tdName.innerHTML =
            typeof plugin.site !== "undefined"
              ? "<a href='" +
                plugin.site +
                "' target='_blank'>" +
                plugin.name +
                "</a>"
              : plugin.name;
          var tdDesc = tr.insertCell(2);
          tdDesc.className = "chmTblCell";
          tdDesc.innerHTML = plugin.description;
          var tdAxes = tr.insertCell(3);
          tdAxes.className = "chmTblCell";
          tdAxes.innerHTML = axesFound;
        }
      }
      if (validPluginCtr === 0) {
        var tr = pluginTbl.insertRow();
        tr.className = "chmTblRow";
        var tdLogo = tr.insertCell(0);
        tdLogo.className = "chmTblCell";
        tdLogo.innerHTML =
          "<B>NO AVAILABLE PLUGINS WERE FOUND FOR THIS HEATMAP</B>";
      }
      return pluginTbl;
    }

    /**********************************************************************************
     * FUNCTION - openAllLinkoutsHelp: The purpose of this function is to construct an
     * HTML table object containing all of the linkout plugins that are installed for
     * the NG-CHM instance. The table is created and then passed on to a linkout
     * popup help window.
     **********************************************************************************/
    function openAllLinkoutsHelp() {
      var validPluginCtr = 0;
      var pluginTbl = document.createElement("TABLE");
      pluginTbl.id = "allPlugins";
      pluginTbl.insertRow().innerHTML = UHM.formatBlankRow();
      var tr = pluginTbl.insertRow();
      var tr = pluginTbl.insertRow();
      for (var i = 0; i < CUST.customPlugins.length; i++) {
        var plugin = CUST.customPlugins[i];
        //If first plugin being written to table, write header row.
        if (validPluginCtr === 0) {
          tr.className = "chmHdrRow";
          let td = tr.insertCell(0);
          td.innerHTML = "<b>Description</b>";
          td = tr.insertCell(0);
          td.innerHTML = "<b>Plug-in Name and Website</b>";
          td.setAttribute("colspan", 2);
        }
        validPluginCtr++;
        //If there is no plugin logo, replace it with hyperlink using plugin name
        var logoImage =
          typeof plugin.logo !== "undefined"
            ? "<img src='" +
              plugin.logo +
              "' onerror='this.onerror=null; this.remove();' width='100px'>"
            : "<b>" + plugin.name + "</b>";
        var hrefSite =
          typeof plugin.site !== "undefined"
            ? "<a href='" + plugin.site + "' target='_blank'> "
            : "<a>";
        var logo = hrefSite + logoImage + "</a>";
        var tr = pluginTbl.insertRow();
        tr.className = "chmTblRow";
        var tdLogo = tr.insertCell(0);
        tdLogo.className = "chmTblCell";
        tdLogo.innerHTML = logo;
        var tdName = tr.insertCell(1);
        tdName.className = "chmTblCell";
        tdName.style.fontWeight = "bold";
        tdName.innerHTML =
          typeof plugin.site !== "undefined"
            ? "<a href='" +
              plugin.site +
              "' target='_blank'>" +
              plugin.name +
              "</a>"
            : plugin.name;
        var tdDesc = tr.insertCell(2);
        tdDesc.className = "chmTblCell";
        tdDesc.innerHTML = plugin.description;
      }
      return pluginTbl;
    }

    /**********************************************************************************
     * FUNCTION - isPluginFound: The purpose of this function is to check to see if
     * a given plugin is applicable for the current map based upon the label types.
     * Row or column label types are passed into this function.
     **********************************************************************************/
    function isPluginFound(plugin, labels) {
      var pluginFound = false;
      if (plugin.name === "TCGA") {
        for (var l = 0; l < labels.length; l++) {
          var tcgaBase = "bio.tcga.barcode.sample";
          if (labels[l] === tcgaBase) {
            pluginFound = true;
          }
          if (typeof CUST.subTypes[tcgaBase] !== "undefined") {
            for (var m = 0; m < CUST.subTypes[tcgaBase].length; m++) {
              var subVal = CUST.subTypes[tcgaBase][m];
              if (labels[l] === subVal) {
                pluginFound = true;
              }
            }
          }
        }
      } else {
        for (var k = 0; k < plugin.linkouts.length; k++) {
          var typeN = plugin.linkouts[k].typeName;
          for (var l = 0; l < labels.length; l++) {
            var labelVal = labels[l];
            if (labelVal === typeN) {
              pluginFound = true;
            }
            if (typeof CUST.superTypes[labelVal] !== "undefined") {
              for (var m = 0; m < CUST.superTypes[labelVal].length; m++) {
                var superVal = CUST.superTypes[labelVal][m];
                if (superVal === typeN) {
                  pluginFound = true;
                }
              }
            }
          }
        }
      }
      return pluginFound;
    }

    /**********************************************************************************
     * FUNCTION - isPluginMatrix: The purpose of this function is to determine whether
     * a given plugin is also a Matrix plugin.
     **********************************************************************************/
    function isPluginMatrix(plugin) {
      var pluginMatrix = false;
      if (typeof plugin.linkouts !== "undefined") {
        for (var k = 0; k < plugin.linkouts.length; k++) {
          var pluginName = plugin.linkouts[k].menuEntry;
          for (var l = 0; l < linkouts.Matrix.length; l++) {
            var matrixName = linkouts.Matrix[l].title;
            if (pluginName === matrixName) {
              pluginMatrix = true;
            }
          }
        }
      }
      return pluginMatrix;
    }

    /**********************************************************************************
     * FUNCTION - linkoutHelp: The purpose of this function is to load and make visible
     * the linkout help popup window.
     **********************************************************************************/
    function linkoutHelp(mapLinksTbl, allLinksTbl) {
      var linkBox = document.getElementById("linkBox");
      var linkBoxHdr = document.getElementById("linkBoxHdr");
      var linkBoxTxt = document.getElementById("linkBoxTxt");
      var linkBoxAllTxt = document.getElementById("linkBoxAllTxt");
      var pluginCtr = allLinksTbl.rows.length;
      var headerpanel = document.getElementById("mdaServiceHeader");
      UTIL.hideLoader(true);
      linkBox.classList.add("hide");
      linkBox.style.top = headerpanel.offsetTop + 15 + "px";
      linkBox.style.right = "5%";
      const closer = linkBoxHdr.querySelector("button.red");
      if (closer) closer.onclick = linkBoxCancel;
      linkBoxTxt.innerHTML = "";
      linkBoxTxt.appendChild(mapLinksTbl);
      mapLinksTbl.style.width = "100%";
      linkBoxAllTxt.innerHTML = "";
      linkBoxAllTxt.appendChild(allLinksTbl);
      allLinksTbl.style.width = "100%";
      linkBoxSizing();
      UTIL.showTab("mapLinks_btn");
      linkBox.classList.remove("hide");
      linkBox.style.left = (window.innerWidth - linkBox.offsetWidth) / 2 + "px";
    }

    /**********************************************************************************
     * FUNCTION - linkBoxCancel: The purpose of this function is to hide the linkout
     * help popup window.
     **********************************************************************************/
    function linkBoxCancel() {
      const linkBox = document.getElementById("linkBox");
      linkBox.classList.add("hide");
    }

    /**********************************************************************************
     * FUNCTION - linkBoxSizing: The purpose of this function is to size the height
     * of the linkout help popup window depending on the number of plugins to be
     * listed.
     **********************************************************************************/
    function linkBoxSizing() {
      var linkBox = document.getElementById("linkBox");
      var pluginCtr = 0;
      if (document.getElementById("allPlugins") !== null) {
        pluginCtr = document.getElementById("allPlugins").rows.length;
      }
      var linkBoxTxt = document.getElementById("linkBoxTxt");
      var linkBoxAllTxt = document.getElementById("linkBoxAllTxt");
      var container = document.getElementById("ngChmContainer");
      var contHeight = container.offsetHeight;
      if (pluginCtr === 0) {
        var boxHeight = contHeight * 0.3;
        var boxTextHeight = boxHeight * 0.4;
        if (boxHeight < 150) {
          boxHeight = contHeight * 0.35;
          boxTextHeight = boxHeight * 0.2;
        }
        linkBox.style.height = boxHeight;
        linkBoxTxt.style.height = boxTextHeight;
      } else {
        var boxHeight = contHeight * 0.92;
        linkBox.style.height = boxHeight;
        var boxTextHeight = boxHeight * 0.8;
        if (MMGR.embeddedMapName !== null) {
          boxTextHeight = boxHeight * 0.6;
        }
        if (boxHeight < 400) {
          if (MMGR.embeddedMapName !== null) {
            boxTextHeight = boxHeight * 0.6;
          } else {
            boxTextHeight = boxHeight * 0.7;
          }
        }
        linkBoxTxt.style.height = boxTextHeight;
        linkBoxAllTxt.style.height = boxTextHeight;
      }
    }

    document.getElementById("mapLinks_btn").onclick = () => {
      UTIL.showTab("mapLinks_btn");
    };

    document.getElementById("allLinks_btn").onclick = () => {
      UTIL.showTab("allLinks_btn");
    };

    document.getElementById("linkBoxFootCloseButton").onclick = () => {
      linkBoxCancel();
    };
  })();

  document.getElementById("aboutButton").onclick = (ev) => {
    UIMGR.widgetHelp();
  };

  document.getElementById("menuSave").onclick = () => {
    saveHeatMapChanges();
  };

  document.getElementById("menuFileOpen").onclick = () => {
    openFileToggle();
  };

  function clearSelectedDendrogram(mapItem) {
    if (mapItem.selectedIsDendrogram) {
      mapItem.selectedIsDendrogram = false;
      if (mapItem == DVW.primaryMap) {
        const dendro = mapItem.mode.startsWith("RIBBONV")
          ? SUM.rowDendro
          : SUM.colDendro;
        if (dendro) {
          dendro.clearSelectedRegion();
        }
      }
      showRestoreDendrogramMessage(mapItem);
    }
  }

  function showRestoreDendrogramMessage(mapItem) {
    const debug = false;

    UHM.initMessageBox();
    UHM.setMessageBoxHeader("Dendrogram selection lost");
    UHM.setMessageBoxText(
      "<br>" +
        "The summary panel dendrogram selection was lost due to keyboard movement of the focus region. " +
        "Click UNDO to undo the keyboard movement and restore the dendrogram selection. " +
        "Otherwise, hit Enter or click OK to just close this dialog.",
    );
    const undoFunction = function undoFunction(restoreInfo) {
      if (debug)
        console.log(
          "Undoing keyboard movement and dendrogram selection loss.",
          restoreInfo,
        );
      UHM.messageBoxCancel();
      restoreInfo.mapItem.selectedIsDendrogram = true;
      restoreInfo.mapItem.selectedStart = restoreInfo.selectedStart;
      restoreInfo.mapItem.selectedStop = restoreInfo.selectedStop;
      DET.callDetailDrawFunction(restoreInfo.mode, restoreInfo.mapItem);
      if (restoreInfo.mapItem == DVW.primaryMap) {
        const dendro = restoreInfo.mode.startsWith("RIBBONV")
          ? SUM.rowDendro
          : SUM.colDendro;
        if (dendro) {
          dendro.setRibbonModeBar(
            restoreInfo.selectedStart,
            restoreInfo.selectedStop,
          );
        }
      }
    }.bind(null, {
      mapItem: mapItem,
      mode: mapItem.mode,
      selectedStart: mapItem.selectedStart,
      selectedStop: mapItem.selectedStop,
    });
    UHM.setMessageBoxButton(
      "undo",
      { type: "text", text: "Undo" },
      "Undo button",
      undoFunction,
    );
    UHM.setMessageBoxButton(
      "ok",
      { type: "text", text: "OK", default: true },
      "OK button",
      UHM.messageBoxCancel,
    );
    UHM.displayMessageBox();
  }

  /*********************************************************************************************
   *
   * Handle user key press events received at the document level.
   *
   *********************************************************************************************/
  function initializeKeyNavigation() {
    // Table of all available keyboard actions.
    const actions = new Map();

    dvAction(
      "MoveLeftOne",
      "Move the primary normal, vertical, or restricted vertical ribbon view one column to the left",
      (e, mapItem) => {
        mapItem.currentCol--;
      },
    );
    dvAction(
      "MoveLeftPage",
      "Move the primary normal, vertical, or restricted vertical ribbon view one page to the left",
      (e, mapItem) => {
        mapItem.currentCol -= mapItem.dataPerRow;
      },
    );
    dvAction(
      "MoveRibbonLeft",
      "Move the primary normal, vertical, restricted vertical, or restricted horizontal ribbon view one column to the left",
      (e, mapItem) => {
        if (
          (mapItem.mode == "NORMAL" || mapItem.mode.startsWith("RIBBONV")) &&
          mapItem.currentCol > 1
        ) {
          mapItem.currentCol -= 1;
        } else if (
          mapItem.mode.startsWith("RIBBONH") &&
          mapItem.selectedStart > 1
        ) {
          mapItem.currentCol -= 1;
          clearSelectedDendrogram(mapItem);
          mapItem.selectedStart -= 1;
          mapItem.selectedStop -= 1;
          DET.callDetailDrawFunction(mapItem.mode);
        }
      },
    );
    dvAction(
      "ExpandRibbonLeft",
      "Expand the primary restricted horizontal ribbon view one column to the left",
      (e, mapItem) => {
        if (mapItem.mode.startsWith("RIBBONH") && mapItem.selectedStart > 1) {
          mapItem.currentCol -= 1;
          clearSelectedDendrogram(mapItem);
          mapItem.selectedStart -= 1;
          mapItem.dataPerRow += 1;
          DET.callDetailDrawFunction(mapItem.mode);
        }
      },
    );
    dvAction(
      "MoveRightOne",
      "Move the primary normal, vertical, or restricted vertical ribbon view one column to the right",
      (e, mapItem) => {
        mapItem.currentCol++;
      },
    );
    dvAction(
      "MoveRightPage",
      "Move the primary normal, vertical, or restricted vertical ribbon view one page to the right",
      (e, mapItem) => {
        mapItem.currentCol += mapItem.dataPerRow;
      },
    );
    dvAction(
      "MoveRibbonRight",
      "Move the primary normal, vertical, restricted vertical, or restricted horizontal ribbon view one column to the right",
      (e, mapItem) => {
        if (
          (mapItem.mode == "NORMAL" || mapItem.mode.startsWith("RIBBONV")) &&
          mapItem.currentCol + mapItem.dataPerRow <
            mapItem.heatMap.getNumColumns(MAPREP.DETAIL_LEVEL)
        ) {
          mapItem.currentCol += 1;
        } else if (
          mapItem.mode.startsWith("RIBBONH") &&
          mapItem.selectedStart > 0 &&
          mapItem.selectedStop <
            mapItem.heatMap.getNumColumns(MAPREP.DETAIL_LEVEL)
        ) {
          mapItem.currentCol += 1;
          clearSelectedDendrogram(mapItem);
          mapItem.selectedStart += 1;
          mapItem.selectedStop += 1;
          DET.callDetailDrawFunction(mapItem.mode);
        }
      },
    );
    dvAction(
      "ExpandRibbonRight",
      "Expand the primary restricted horizontal ribbon view one column to the right",
      (e, mapItem) => {
        if (
          mapItem.mode.startsWith("RIBBONH") &&
          mapItem.selectedStart > 0 &&
          mapItem.selectedStop <
            mapItem.heatMap.getNumColumns(MAPREP.DETAIL_LEVEL)
        ) {
          clearSelectedDendrogram(mapItem);
          mapItem.selectedStop += 1;
          mapItem.dataPerRow += 1;
          DET.callDetailDrawFunction(mapItem.mode);
        }
      },
    );
    dvAction(
      "MoveUpOne",
      "Move the primary normal, horizontal, or restricted horizontal ribbon view up one row",
      (e, mapItem) => {
        mapItem.currentRow--;
      },
    );
    dvAction(
      "MoveUpPage",
      "Move the primary normal, horizontal, or restricted horizontal ribbon view up one page",
      (e, mapItem) => {
        mapItem.currentRow -= mapItem.dataPerCol;
      },
    );
    dvAction(
      "MoveRibbonUp",
      "Move the primary normal, horizontal, restricted horizontal, or restricted vertical ribbon view up one row",
      (e, mapItem) => {
        if (
          (mapItem.mode == "NORMAL" || mapItem.mode.startsWith("RIBBONH")) &&
          mapItem.currentRow > 1
        ) {
          mapItem.currentRow -= 1;
        } else if (
          mapItem.mode.startsWith("RIBBONV") &&
          mapItem.selectedStart > 1
        ) {
          mapItem.currentRow -= 1;
          clearSelectedDendrogram(mapItem);
          mapItem.selectedStart -= 1;
          mapItem.selectedStop -= 1;
          DET.callDetailDrawFunction(mapItem.mode);
        }
      },
    );
    dvAction(
      "ExpandRibbonUp",
      "Expand the primary restricted vertical ribbon view up one row",
      (e, mapItem) => {
        if (mapItem.mode.startsWith("RIBBONV") && mapItem.selectedStart > 1) {
          mapItem.currentRow -= 1;
          clearSelectedDendrogram(mapItem);
          mapItem.selectedStart -= 1;
          mapItem.dataPerCol += 1;
          DET.callDetailDrawFunction(mapItem.mode);
        }
      },
    );
    dvAction(
      "MoveDownOne",
      "Move the primary normal, horizontal, or restricted horizontal view down one row",
      (e, mapItem) => {
        mapItem.currentRow++;
      },
    );
    dvAction(
      "MoveDownPage",
      "Move the primary normal, horizontal, or restricted horizontal view down one page",
      (e, mapItem) => {
        mapItem.currentRow += mapItem.dataPerCol;
      },
    );
    dvAction(
      "MoveRibbonDown",
      "Move the primary normal, horizontal, restricted horizontal, or restricted vertical ribbon view down one row",
      (e, mapItem) => {
        if (
          (mapItem.mode == "NORMAL" || mapItem.mode.startsWith("RIBBONH")) &&
          mapItem.currentRow + mapItem.dataPerCol <
            mapItem.heatMap.getNumRows(MAPREP.DETAIL_LEVEL)
        ) {
          mapItem.currentRow += 1;
        } else if (
          mapItem.mode.startsWith("RIBBONV") &&
          mapItem.selectedStart > 0 &&
          mapItem.selectedStop < mapItem.heatMap.getNumRows(MAPREP.DETAIL_LEVEL)
        ) {
          mapItem.currentRow += 1;
          clearSelectedDendrogram(mapItem);
          mapItem.selectedStart += 1;
          mapItem.selectedStop += 1;
          DET.callDetailDrawFunction(mapItem.mode);
        }
      },
    );
    dvAction(
      "ExpandRibbonDown",
      "Expand the primary restricted vertical ribbon view down one row",
      (e, mapItem) => {
        if (
          mapItem.mode.startsWith("RIBBONV") &&
          mapItem.selectedStart > 0 &&
          mapItem.selectedStop < mapItem.heatMap.getNumRows(MAPREP.DETAIL_LEVEL)
        ) {
          clearSelectedDendrogram(mapItem);
          mapItem.selectedStop += 1;
          mapItem.dataPerCol += 1;
          DET.callDetailDrawFunction(mapItem.mode);
        }
      },
    );
    dvAction(
      "ZoomIn",
      "Zoom the primary detail view in one step",
      (e, mapItem) => {
        DEV.zoomAnimation(mapItem);
      },
    );
    dvAction(
      "ChangeZoomModeLeft",
      "Change zoom modes: Vertical ribbon -> horizontal ribbon -> normal",
      (e, mapItem) => {
        let newMode;
        DET.clearDendroSelection(mapItem);
        switch (mapItem.mode) {
          case "RIBBONV":
            newMode = "RIBBONH";
            break;
          case "RIBBONH":
            newMode = "NORMAL";
            break;
          default:
            newMode = mapItem.mode;
            break;
        }
        DET.callDetailDrawFunction(newMode);
      },
    );
    dvAction(
      "ZoomOut",
      "Zoom the primary detail view out one step",
      (e, mapItem) => {
        DEV.detailDataZoomOut(mapItem);
      },
    );
    dvAction(
      "ChangeZoomModeRight",
      "Change zoom modes: Normal -> horizontal ribbon -> vertical ribbon",
      (e, mapItem) => {
        let newMode;
        DET.clearDendroSelection(mapItem);
        switch (mapItem.mode) {
          case "NORMAL":
            newMode = "RIBBONH";
            break;
          case "RIBBONH":
            newMode = "RIBBONV";
            break;
          default:
            newMode = mapItem.mode;
            break;
        }
        DET.callDetailDrawFunction(newMode);
      },
    );

    stdAction("ToggleLayers", "Toggle between the two selected layers", (e) => {
      if (FLICK.flickIsOn()) {
        UIMGR.changeDataLayer(FLICK.toggleFlickState("toggle"));
      }
    });

    stdAction("CloseDialog", "Close any open dialog window", (e) => {
      if (UHM.messageBoxIsVisible()) {
        const defaultButton = document.querySelector(
          ".msgBoxButtons button.default",
        );
        if (defaultButton) {
          defaultButton.onclick();
        } else {
          UHM.messageBoxCancel();
        }
      }
      if (!document.getElementById("linkBox").classList.contains("hide")) {
        document.querySelector("#linkBox button.default").onclick();
      }
    });

    // Default key to action map.
    const keyToAction = new Map([
      ["ArrowLeft", "MoveLeftOne"],
      ["shift-ArrowLeft", "MoveLeftPage"],
      ["ctrl-ArrowLeft", "MoveRibbonLeft"],
      ["ctrl-meta-ArrowLeft", "ExpandRibbonLeft"],
      ["ArrowRight", "MoveRightOne"],
      ["shift-ArrowRight", "MoveRightPage"],
      ["ctrl-ArrowRight", "MoveRibbonRight"],
      ["ctrl-meta-ArrowRight", "ExpandRibbonRight"],
      ["ArrowUp", "MoveUpOne"],
      ["shift-ArrowUp", "MoveUpPage"],
      ["ctrl-ArrowUp", "MoveRibbonUp"],
      ["ctrl-meta-ArrowUp", "ExpandRibbonUp"],
      ["ArrowDown", "MoveDownOne"],
      ["shift-ArrowDown", "MoveDownPage"],
      ["ctrl-ArrowDown", "MoveRibbonDown"],
      ["ctrl-meta-ArrowDown", "ExpandRibbonDown"],
      ["PageUp", "ZoomIn"],
      ["shift-PageUp", "ChangeZoomModeLeft"],
      ["PageDown", "ZoomOut"],
      ["shift-PageDown", "ChangeZoomModeRight"],
      ["F2", "ToggleLayers"],
      ["Enter", "CloseDialog"],
    ]);

    UTIL.setKeyData("keyActions", [keyToAction, actions]);
    let navElement = document;
    if (UTIL.getKeyData("require-focus")) {
      navElement = document.getElementById("NGCHMEmbed");
    }
    navElement.addEventListener("keydown", keyNavigate);

    function keyNavigate(e) {
      const debug = false;

      // Key press events that target the search_text input box are mostly
      // handled by that input..
      if (e.target.id === "search_text") {
        if (e.key === "Enter") {
          SRCH.detailSearch();
        }
        return;
      }
      if (e.target.id === "pdfCustomResolution") {
        if (e.key === "Enter") {
          e.target.dispatchEvent(new Event("change"));
        }
        return;
      }
      if (debug)
        console.log({
          m: "KeyPress",
          key: e.key,
          ctrl: e.ctrlKey,
          shift: e.shiftKey,
          alt: e.altKey,
          meta: e.metaKey,
          e,
        });
      const actionName = keyToAction.get(fullKey(e));
      if (!actionName) {
        if (debug) console.log("No action found for " + fullKey(e));
        return;
      }
      UHM.hlpC();
      const action = actions.get(actionName);
      if (!action) {
        console.error("Could not get action detail found for ", actionName);
        return;
      }
      if (action.needsDV && !DVW.primaryMap) {
        if (debug)
          console.log(
            "Action " +
              actionName +
              " needs primary detail view, but it does not exist",
          );
        return;
      }
      e.preventDefault();
      if (debug) console.log("Action " + actionName);
      if (action.needsDV) {
        action.fn(e, DVW.primaryMap);
        DVW.checkRow(DVW.primaryMap);
        DVW.checkCol(DVW.primaryMap);
        DVW.primaryMap.updateSelection();
        SRCH.enableDisableSearchButtons(DVW.primaryMap);
      } else {
        action.fn(e);
      }
    }

    // Helper function for creating an action that needs a detail view.
    function dvAction(name, help, fn) {
      actions.set(name, { name, help, needsDV: true, fn });
    }

    // Helper function for creating an action that does not need a detail view.
    function stdAction(name, help, fn) {
      actions.set(name, { name, help, needsDV: false, fn });
    }

    // Helper function for returning a key name with leading modifier key names.
    function fullKey(e) {
      let mod = "";
      if (e.ctrlKey) mod += "ctrl-";
      if (e.altKey) mod += "alt-";
      if (e.shiftKey) mod += "shift-";
      if (e.metaKey) mod += "meta-";
      return mod + e.key;
    }

    /**********************************************************************************
     * FUNCTION - showKeysDialog: Show the keys dialog.
     **********************************************************************************/
    UIMGR.showKeysDialog = showKeysDialog;
    function showKeysDialog() {
      const msgBox = UHM.newMessageBox("keynav");
      UHM.setNewMessageBoxHeader(msgBox, "Key Actions");
      const messageBox = UHM.getNewMessageTextBox(msgBox);
      messageBox.innerHTML = "";

      const head = UTIL.newElement("THEAD", {}, [
        UTIL.newElement(
          "TR",
          {},
          ["Key", "Action", "Description"].map((h) =>
            UTIL.newElement("TH", {}, h),
          ),
        ),
      ]);

      // Populating key map body.
      const [keyMap, actionTab] = UTIL.getKeyData("keyActions");
      const body = UTIL.newElement("TBODY");
      keyMap.forEach((action, key) => {
        const help = actionTab.get(action).help;
        body.appendChild(
          UTIL.newElement(
            "TR",
            {},
            [key, action, help].map((val) => UTIL.newElement("TD", {}, val)),
          ),
        );
      });
      const table = UTIL.newElement("TABLE.keyTable", {}, [head, body]);
      messageBox.appendChild(table);

      UHM.setNewMessageBoxButton(msgBox, "close", {
        type: "text",
        text: "Close",
        tooltip: "Closes this dialog",
        default: true,
      });
      UHM.displayNewMessageBox(msgBox);
    }
  }

  /*********************************************************************************************/

  /*
		Process message from plugins to highlight points selected in plugin
	*/
  LNK.defineVanodiMessageHandler(
    "selectLabels",
    function vanodiSelectLabels(instance, msg) {
      const axis = MMGR.isRow(msg.selection.axis) ? "Row" : "Column";
      const pluginLabels = msg.selection.pointIds.map((l) => l.toUpperCase()); // labels from plugin
      var heatMapAxisLabels;
      if (pluginLabels.length > 0 && pluginLabels[0].indexOf("|") !== -1) {
        // Plugin sent full labels
        heatMapAxisLabels = MMGR.getHeatMap().getAxisLabels(axis).labels;
      } else {
        // Plugin sent actual labels (or actual and full are identical).
        heatMapAxisLabels = MMGR.getActualLabels(axis);
      }
      heatMapAxisLabels = heatMapAxisLabels.map((l) => l.toUpperCase());
      var setSelected = new Set(pluginLabels); // make a set for faster access below, and avoiding use of indexOf
      SRCH.clearSearchItems(axis);
      var indexes = [];
      for (var i = 0; i < heatMapAxisLabels.length; i++) {
        // loop over all labels
        if (setSelected.has(heatMapAxisLabels[i])) {
          // if set of selected points has label, add index to array of indexes
          indexes.push(i + 1);
        }
      }
      if (indexes.length > 0) {
        SRCH.setAxisSearchResultsVec(axis, indexes);
        DET.labelLastClicked[axis] = indexes[indexes.length - 1];
      }
      DET.updateDisplayedLabels();
      SUM.redrawSelectionMarks();
      DET.updateSelections();
      SRCH.showSearchResults();
      PIM.postSelectionToPlugins(axis, msg.selection.clickType, 0, msg.nonce);
    },
  );

  /*
		Process message from scatter plot to highlight single point under mouse on plot
	*/
  LNK.defineVanodiMessageHandler(
    "mouseover",
    function vanodiMouseover(instance, msg) {
      const axis = MMGR.isRow(msg.selection.axis) ? "Row" : "Column";
      const allLabels = MMGR.getActualLabels(axis);
      const pointId = msg.selection.pointId;
      const ptIdx = allLabels.indexOf(pointId) + 1;
      SRCH.setAxisSearchResults(axis, ptIdx, ptIdx);
      DET.labelLastClicked[axis] = ptIdx;
      DET.updateDisplayedLabels();
      DET.updateSelections();
      SRCH.showSearchResults();
      SUM.redrawSelectionMarks();
    },
  );
})();
