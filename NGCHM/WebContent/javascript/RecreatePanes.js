(function () {
  "use strict";
  NgChm.markFile();

  /**
   *	NGCHM namespace responsible for reconstructing a saved pane layout.
   */
  const RECPANES = NgChm.createNS("NgChm.RecPanes");

  const UTIL = NgChm.importNS("NgChm.UTIL");
  const LNK = NgChm.importNS("NgChm.LNK");
  const SRCHSTATE = NgChm.importNS("NgChm.SRCHSTATE");
  const SRCH = NgChm.importNS("NgChm.SRCH");
  const PANE = NgChm.importNS("NgChm.Pane");
  const MMGR = NgChm.importNS("NgChm.MMGR");
  const SMM = NgChm.importNS("NgChm.SMM");
  const SUM = NgChm.importNS("NgChm.SUM");
  const DVW = NgChm.importNS("NgChm.DVW");
  const DET = NgChm.importNS("NgChm.DET");
  const DEV = NgChm.importNS("NgChm.DEV");
  const DMM = NgChm.importNS("NgChm.DMM");
  const CUST = NgChm.importNS("NgChm.CUST");
  const debug = false;

  RECPANES.reconstructPanelsFromMapConfig = reconstructPanelsFromMapConfig;

  /**
   * Reconstruct the panels from data in the mapConfig.json file
   *
   * This function combines an if/else with setTmeout in order to wait for the plugins to
   * complete loading before attempting to reconstruct the panel layout.
   * This is a hack.
   * TODO: Understand the NGCHM initialization code well enough to not need this hack.
   */
  function reconstructPanelsFromMapConfig(initialLoc, savedState) {
    if (debug) console.log("Reconstructing panes");
    RECPANES.mapConfigPanelConfiguration = Object.assign({}, savedState);
    try {
      let panel_layoutJSON = RECPANES.mapConfigPanelConfiguration.panel_layout;
      let reconstructedPanelLayout = createLayout(panel_layoutJSON);
      UTIL.containerElement.replaceChildren(
        reconstructedPanelLayout.firstChild,
      );
    } catch (err) {
      console.error("Cannot reconstruct panel layout: " + err);
      throw "Error reconstructing panel layout from mapConfig.";
      return;
    }
    addDividerControlsToResizeHelpers();
    addResizeHandlersToContainers();

    CUST.waitForPlugins(populatePluginPanels);

    // Plugin panes require plugins loaded first.
    function populatePluginPanels() {
      if (debug) console.log("Setting initial pane content");
      setPanesContent();
      setSelections(); // Set saved results, if any.
      SRCH.doInitialSearch(); // Will override saved results, if requested.
      PANE.resizeNGCHM();
      MMGR.getHeatMap().setUnAppliedChanges(false);
      setTimeout(() => {
        DET.updateSelections(true);
        const expanded = document.querySelector("DIV[data-expanded-panel]");
        if (expanded) {
          delete expanded.dataset.expandedPanel;
          PANE.toggleScreenMode(expanded.id);
        }
        [...document.getElementsByClassName("pane")].forEach(PANE.resizePane);
        UTIL.hideLoader(true); // Hide loader screen, display NG-CHM.
      }, 500);
    }
  }

  /**
   * Create an NgChm container/pane layout according to the given save state specification.
   * Users should pass the saveSpec for the top level ngChmContainer and leave parent undefined.
   * The function calls itself recursively.
   *
   * Panes in the generated layout are empty and need their content set.
   * The pane/container sizes are set to those in the specification and have to be adjusted
   * for the current window size.
   */
  function createLayout(saveSpec, parent) {
    if (saveSpec.type === "pane") {
      let el = PANE.newPane({}, "Empty", saveSpec.id);
      el.style.width = saveSpec.width;
      el.style.height = saveSpec.height;
      if (saveSpec.collapsed) {
        // Create a 'fake' pane location.
        const loc = {
          pane: el,
          container: parent,
          paneHeader: el.getElementsByClassName("paneHeader")[0],
          paneTitle: el.getElementsByClassName("paneTitle")[0],
        };
        PANE.collapsePane(loc);
      }
      if (saveSpec.expanded) el.dataset.expandedPanel = true;
      return el;
    } else if (saveSpec.type === "container") {
      let el = document.createElement("DIV");
      el.style.width = saveSpec.width;
      el.style.height = saveSpec.height;
      el.id = saveSpec.id;
      el.classList.add("ngChmContainer");
      if (saveSpec.vertical) el.classList.add("vertical");
      saveSpec.children.forEach((child, idx) => {
        if (idx > 0) {
          const divider = document.createElement("DIV");
          divider.classList.add("resizerHelper");
          divider.classList.add(
            "resizerHelper" + (saveSpec.vertical ? "Bottom" : "Right"),
          );
          const splitter = document.createElement("DIV");
          splitter.classList.add(
            "resizerSplitter" + (saveSpec.vertical ? "Horizontal" : "Vertical"),
          );
          divider.appendChild(splitter);
          el.appendChild(divider);
        }
        const ch = createLayout(child, el);
        el.appendChild(ch);
      });
      el.addEventListener("paneresize", PANE.resizeHandler);
      return el;
    } else {
      console.error(
        "Attemping to restore unknown saveSpec object: " + saveSpec.type,
      );
    }
  }

  /**
   * Add DividerControl methods to resizeHelper elements
   */
  function addDividerControlsToResizeHelpers() {
    let dividers = document.getElementsByClassName("resizerHelper");
    for (let i = 0; i < dividers.length; i++) {
      dividers[i].dividerController = new PANE.DividerControl(dividers[i]);
    }
  }

  /**
   * Add paneresize event handlers to ngChmContainer elements
   */
  function addResizeHandlersToContainers() {
    let containers = document.getElementsByClassName("ngChmContainer");
    for (let i = 0; i < containers.length; i++) {
      containers[i].addEventListener("paneresize", PANE.resizeHandler);
    }
  }

  /**
   *	Iterate over panes and set their content
   *	The sort is included so that 'nextMapNumber' (i.e. the number suffix to id = 'detail_chm*')
   *	goes smoothly
   */
  function setPanesContent() {
    let panesArray = Array.from(document.getElementsByClassName("pane")).map(
      (el) => {
        const info = getPaneInfoFromMapConfig(el.id);
        let sortval;
        if (info.type == "summaryMap") {
          sortval = 0;
        } else if (info.type == "detailMap") {
          sortval = info.version == "P" ? 1 : 2;
        } else {
          sortval = 3;
        }
        return {
          id: el.id,
          idx: +el.id.replace("pane", ""),
          el: el,
          info: info,
          sortval: sortval,
        };
      },
    );
    /* Order: summaryMap, primaryDetailMap, otherDetailMaps, other panes.
     * Within a category: increasing pane.id.
     */
    panesArray.sort(function (a, b) {
      // sort to numerical pane order
      if (a.sortval > b.sortval) return 1;
      if (a.sortval < b.sortval) return -1;
      if (a.idx > b.idx) return 1; // e.g.: 'pane3' > 'pane2' = true
      if (a.idx < b.idx) return -1; // e.g.: 'pane3' < 'pane4' = true
      return 0;
    });
    setUsedVersionNumbers();
    panesArray.forEach((pane) => {
      setPaneContent(pane.id);
    });
    PANE.resetPaneCounter(getHighestPaneId() + 1);
  }

  /**
		Return hightest pane id for panes currently in DOM
	*/
  function getHighestPaneId() {
    let panes = document.getElementsByClassName("pane");
    try {
      let paneIds = [...panes]
        .map((p) => {
          return p.id;
        })
        .map((p) => {
          return parseInt(p.replace("pane", ""));
        });
      return Math.max(...paneIds);
    } catch (err) {
      console.error("Cannot determine hightest pane id");
      throw err;
    }
  }

  function setSelections() {
    if (!RECPANES.mapConfigPanelConfiguration.hasOwnProperty("selections"))
      return;
    let rowSelections =
      RECPANES.mapConfigPanelConfiguration["selections"]["row"];
    SRCH.setAxisSearchResultsVec("Row", rowSelections);
    let colSelections =
      RECPANES.mapConfigPanelConfiguration["selections"]["col"];
    SRCH.setAxisSearchResultsVec("Column", colSelections);

    let dendroBars =
      RECPANES.mapConfigPanelConfiguration["selections"][
        "selectedRowDendroBars"
      ];
    if (dendroBars) SUM.rowDendro.restoreSelectedBars(dendroBars);
    dendroBars =
      RECPANES.mapConfigPanelConfiguration["selections"][
        "selectedColDendroBars"
      ];
    if (dendroBars) SUM.colDendro.restoreSelectedBars(dendroBars);
  }

  /**
   *	Set a pane's content based on 'config.type' attribute.
   */
  function setPaneContent(paneid) {
    const pane = document.getElementById(paneid);
    const paneLoc = PANE.findPaneLocation(pane);
    const config = RECPANES.mapConfigPanelConfiguration[paneid];
    if (!config) {
      // Probably an empty pane.
      // console.debug ("Pane has no config", paneid, config);
      return;
    }
    if (config.type === "summaryMap") {
      SMM.switchPaneToSummary(PANE.findPaneLocation(pane));
      delete RECPANES.mapConfigPanelConfiguration[paneid];
    } else if (config.type === "detailMap") {
      let paneInfo = getPaneInfoFromMapConfig(paneid);
      const isPrimary = paneInfo.version == "P";
      let mapNumber =
        paneInfo.versionNumber == ""
          ? getUnusedVersionNumber()
          : parseInt(paneInfo.versionNumber);
      DMM.switchPaneToDetail(PANE.findPaneLocation(pane), {
        isPrimary,
        mapNumber,
        paneInfo,
      });

      DET.updateDisplayedLabels();
      // set zoom/pan state of detail map
      let mapItem = DVW.getMapItemFromPane(pane.id);
      mapItem.updateSelection();
      delete RECPANES.mapConfigPanelConfiguration[paneid];
      PANE.resizePane(mapItem.canvas);
    } else if (config.type === "plugin") {
      let customjsPlugins = LNK.getPanePlugins(); // plugins from custom.js
      let specifiedPlugin = customjsPlugins.filter(
        (pc) => config.pluginName == pc.name,
      );
      if (specifiedPlugin.length > 0) {
        try {
          let restoreInfo = getPaneInfoFromMapConfig(paneid);
          delete RECPANES.mapConfigPanelConfiguration[paneid];
          const loc = PANE.findPaneLocation(pane);
          LNK.switchPaneToPlugin(loc, specifiedPlugin[0], restoreInfo);
        } catch (err) {
          console.error(err);
          console.error("Specified plugin: ", config.pluginName);
          throw "Error loading plugin";
        }
      } else {
        // Show brief message about the missing plugin in the panel.
        const loc = PANE.findPaneLocation(pane);
        loc.pane.dataset.pluginName = config.pluginName;
        loc.paneTitle.innerText = config.pluginName;
        const message = document.createElement("DIV");
        message.innerText = `This restored panel requires the "${config.pluginName}" plugin, which is not available. Adding the plugin will initialize the panel.`;
        loc.pane.appendChild(message);
      }
    } else if (config.type === "linkout") {
      let loc = PANE.findPaneLocation(pane);
      LNK.switchPaneToLinkouts(loc);
      let linkoutData = getPaneInfoFromMapConfig(paneid);
      if (linkoutData != null) {
        LNK.openUrl(linkoutData.url, linkoutData.paneTitle);
      }
    } else {
      console.error("Unrecognized pane type - " + config.type);
    }
    if (PANE.isCollapsedPane(paneLoc)) {
      // Ensures that any added/modified pane components are collapsed properly.
      PANE.collapsePane(paneLoc);
    }
  }

  /**
   * Track what detail map version numbers are used by the saved panel
   * configuration, so that a new unused number can be safely assigned to
   * any saved map that doesn't have a version number.
   */
  var usedVersionNumbers;

  /**
   * Save what version numbers are used in the panel configuration. Must be
   * called before panels are restored, since restoring a panel removes its
   * information from the saved panel configuration.
   */
  function setUsedVersionNumbers() {
    usedVersionNumbers = Object.entries(RECPANES.mapConfigPanelConfiguration)
      .filter(([k, v]) => v && v.versionNumber && v.versionNumber != "")
      .map(([k, v]) => +v.versionNumber);
  }

  /**
   * Get the first unused version number and note that it is now used.
   */
  function getUnusedVersionNumber() {
    let i = 1;
    while (usedVersionNumbers.indexOf(i) != -1) {
      i++;
    }
    usedVersionNumbers.push(i);
    return i;
  }

  function getPaneInfoFromMapConfig(paneId) {
    try {
      let paneInfo = RECPANES.mapConfigPanelConfiguration[paneId];
      if (!paneInfo) {
        console.warn("Panel " + paneId + " has nosaved configuration");
        paneInfo = {};
      }
      return paneInfo;
    } catch (error) {
      if (error instanceof TypeError) {
        return false;
      } else {
        throw error;
      }
    }
  }
})();
