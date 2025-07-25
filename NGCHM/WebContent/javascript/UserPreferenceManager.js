/**********************************************************************************
 * USER PREFERENCE MANAGER:  The following functions handle the processing
 * for user preferences popup.
 **********************************************************************************/
(function () {
  "use strict";
  NgChm.markFile();

  //Define Namespace for NgChm UserPreferenceManager
  const UPM = NgChm.createNS("NgChm.UPM");

  const TABLE = NgChm.importNS("NgChm.UI.TABLE");
  const PALETTES = NgChm.importNS("NgChm.PALETTES");
  const UHM = NgChm.importNS("NgChm.UHM");
  const MAPREP = NgChm.importNS("NgChm.MAPREP");
  const MMGR = NgChm.importNS("NgChm.MMGR");
  const UTIL = NgChm.importNS("NgChm.UTIL");
  const SUM = NgChm.importNS("NgChm.SUM");
  const DET = NgChm.importNS("NgChm.DET");
  const DMM = NgChm.importNS("NgChm.DMM");
  const CMM = NgChm.importNS("NgChm.CMM");
  const COMPAT = NgChm.importNS("NgChm.CM");

  const debug = UTIL.getDebugFlag("upm");
  const debugLayers = UTIL.getDebugFlag("upm-layers");
  const debugAxes = UTIL.getDebugFlag("upm-axes");
  const debugCovars = UTIL.getDebugFlag("upm-covars");
  const debugColors = UTIL.getDebugFlag("upm-colors");
  const debugEvents = UTIL.getDebugFlag("upm-events");

  const flagNewCovars = UTIL.getFeatureFlag("new-covars");

  // The DIV that contains the entire Preferences Manager.
  const prefspanel = document.getElementById("prefs");

  // The DIV that contains all the tabs.
  const tabContainer = document.getElementById("prefPrefs");

  // Listen for keydown events on the tabs.
  // A keydown event on any element with class "ngchm-upm-input" within
  // a tab will signify a change.
  tabContainer.addEventListener("keydown", (ev) => {
    if (debug || debugEvents) console.log(`User Preference Manager keydown handler`, { target: ev.target });
    for (const target of tabTargetGen(ev)) {
      if (target.classList.contains("ngchm-upm-input")) {
        startChange();
        break;
      }
    }
  });

  // Generate a list of potential target elements for an event, starting at
  // the event.target and proceeding up through its parents, up to
  // and including the tab's highest div.  The caller should stop processing
  // the generator's results when an applicable element is found.
  function* tabTargetGen (event) {
    for (let target = event.target; target; target = target.parentElement) {
      if (target === tabContainer) {
        break;
      }
      yield (target);
    }
    return null;
  }

  // The Preferences Manager interface consists of an overall interface and
  // four tabs.
  //
  // The overall Preference Manager interface consists of those items outside of
  // the four tabs.  In particular: the panel header and its buttons (left/right
  // arrow, red X), the panel footer and its buttons (Apply, Reset, Close),
  // the gear button in the NG-CHM header, and the Modify Map Preferences
  // option in the NG-CHM hamburger menu.
  //
  // Each of the four tabs is implemented as an instance of a derived class of
  // PreferencesTab.
  // Here, we define the prototype chains for the derived PreferencesTab classes.
  Object.setPrototypeOf(MapInfoTab.prototype, PreferencesTab.prototype);
  Object.setPrototypeOf(MapLayersTab.prototype, PreferencesTab.prototype);
  Object.setPrototypeOf(RowsColsTab.prototype, PreferencesTab.prototype);
  Object.setPrototypeOf(CovariatesPrefsTab.prototype, PreferencesTab.prototype);

  // Create an instance of each tab.  These calls create the tab instances but do not
  // populate the body of the tabs.  For that, see method setupTab below.
  //
  const mapInfoTab = new MapInfoTab();
  const mapLayersTab = new MapLayersTab();
  const rowsColsTab = new RowsColsTab();
  const covariatesTab = new CovariatesPrefsTab();
  const allTabs = [mapInfoTab, mapLayersTab, rowsColsTab, covariatesTab];

  // VIRTUAL CLASS PreferencesTab - Core functionality of a tab in Preferences Manager.
  //
  // All PreferencesTabs have a button and tab div.
  // Clicking on the tab's button will show the tab's div.
  //
  function PreferencesTab(buttonId, tabId) {
    this.buttonId = buttonId;
    this.button = document.getElementById(buttonId);
    this.tabId = tabId;
    this.tabDiv = document.getElementById(tabId);
    this.button.onclick = (ev) => this.show(ev);
  }

  // VIRTUAL METHOD PreferencesTab.setupTab : populate the tab.
  //
  // Derived classes must override this function to setup the tab's UI.
  // It is called when a new Preferences Manager window is created.
  // i.e. when openPreferencesManager() is called.
  // The contents of the tab will be removed when closePreferencesManager()
  // is called.
  //
  PreferencesTab.prototype.setupTab = function setupTab() {
    console.error("PreferencesTab.setupTab not overridden", { tab: this });
  };

  // VIRTUAL METHOD PreferencesTab.validateTab : validate the entries in the tab.
  //
  // Derived classes must override this function to validate the tab's inputs.
  // It returns null iff all checks pass otherwise an ErrorMsg array.
  //
  PreferencesTab.prototype.validateTab = function validateTab() {
    console.error("PreferencesTab.validateTab not overridden", { tab: this });
    return null;
  };

  // Functions that validate preferences return:
  // - on success: null,
  // - on error: a string array (called errorMsg) with at least three elements.
  //
  // The elements of an ErrorMsg array are:
  // - errorMsg[0] : selector (only used by the layersTab and the covariatesTab),
  // - errorMsg[1] : tabId
  // - errorMsg[2] : error message text
  // - errorMsg[3] : axis name (only used by the covariates tab)
  //
  // errorMsg[1] is used to show the tab containing the error.
  // errorMsg[0] (and possibly errorMsg[3]) is used to show the relevant view within the tab.
  // errorMsg[2] is the error text displayed at the bottom of the preferences popup.

  // VIRTUAL METHOD PreferencesTab.resetTabPrefs : reset the preference inputs
  // in the tab from resetVal.
  //
  // Derived classes must override this function to reset the tab's preferences.
  //
  PreferencesTab.prototype.resetTabPrefs = function resetTabPrefs(resetVal) {
    console.error("PreferencesTab.resetTabPrefs not overridden", { tab: this });
  };

  // VIRTUAL METHOD PreferencesTab.applyTabPrefs : update the heatMap from the
  // preference inputs in the tab.
  //
  // Derived classes must override this function to apply the tab's preferences.
  // It is only called if validateTab has been called and returned null (success).
  //
  PreferencesTab.prototype.applyTabPrefs = function applyTabPrefs() {
    console.error("PreferencesTab.applyTabPrefs not overridden", { tab: this });
  };

  // METHODS prepareView and prepareErrorView.
  //
  // Some tabs present multiple views. For instance, the Map Layers tab presents a
  // different view for each data layer.  Normally, we want to show a tab's default
  // view, but after an error we want to show the view containing the error.
  //
  // editPreferences will call either prepareView or prepareErrorView every
  // time it is called, either initially or after an error.
  // - prepareView is called if there is no error message, or it does not apply
  //   to this tab.  The function should prepare the default view for display.
  // - prepareErrorView is called when there is an error message and it applies
  //   to this tab.  The function should prepare the view specified in the errorMsg
  //   array for display.
  // The total number of times these functions are called and the order
  // in which they are called is determined by how many errors are identified.
  //
  // Tabs that do not provide multiple views do not need to override these methods.
  // The default for both is that no specific actions are required to prepare
  // the tab.

  // METHOD PreferencesTab.prepareView : show the default tab view.
  //
  // By default, no specific actions are required to show the default view.
  PreferencesTab.prototype.prepareView = function prepareView() {};

  // METHOD PreferencesTab.prepareErrorView : show the tab view that includes errorMsg.
  //
  // By default, no specific actions are required to show the view containing the error.
  PreferencesTab.prototype.prepareErrorView = function prepareErrorView(errorMsg) {};

  // METHOD PreferencesTab.show : show this tab and hide its siblings.
  //
  // This method should not be overridden.
  //
  PreferencesTab.prototype.show = function () {
    UTIL.showTab(this.buttonId);
  };

  // METHOD PreferencesTab.removeTab : remove the contents of the tab.
  //
  // The tabDiv and the tabButton will remain as hidden elements.
  //
  // This method should not be overridden.
  //
  PreferencesTab.prototype.removeTab = function () {
    while (this.tabDiv.firstChild) {
      this.tabDiv.removeChild(this.tabDiv.firstChild);
    }
  };

  // --------------------------------------------------------------------------
  //
  // User Preferences Manager interface.
  //
  const applyButton = KAE("prefApply_btn");
  const resetButton = KAE("prefReset_btn");

  // Define a click handler for each of the Preferences Manager UI elements.
  (function () {
    // Two ways to open the Preferences Manager.
    KAE("colorMenu_btn").onclick = () => openPreferencesManager();
    KAE("menuGear").onclick = () => openPreferencesManager();

    // Two ways to close the Preferences Manager.
    KAE("redX_btn").onclick = () => closePreferencesManager();
    KAE("prefClose_btn").onclick = () => closePreferencesManager();

    // Move the Preferences Manager position.
    KAE("prefsMove_btn").onclick = () => movePreferencesManager();

    // Define handlers for the Apply and Reset buttons.
    applyButton.onclick = () => applyAllPreferences(false);
    resetButton.onclick = () => resetAllPreferences();
  })();

  // Global variables for Preferences Manager.
  //
  // There can be at most one Preferences Manager window displayed at any time.
  //
  // These variables are set when the Preferences Manager is opened and cleared
  // when it is closed.
  clearGlobalVariables();

  function clearGlobalVariables() {
    UPM.heatMap = null; // The heatMap in the open Preferences Manager (UPM).
    UPM.bkpColorMaps = null; // A backup copy of the heatMap's color maps, used by reset.
    UPM.resetValJSON = null; // A backup copy of the UPM's options, used by reset.
  }

  /*===================================================================================
   *  COMMON PREFERENCE PROCESSING FUNCTIONS
   *
   *  The following functions are utilized to present the entire heat map preferences
   *  dialog and, therefore, sit above those functions that are specific to a tab.
   *  - openPreferencesManager
   *  - closePreferencesManager
   *  - editPreferences
   *  - prefsValidateBreakPoints
   *  - prefsValidateBreakColors
   *  - prefsApplyBreaks
   *  - getNewBreakColors
   *  - getNewBreakThresholds
   =================================================================================*/

  /* FUNCTION openPreferencesManager - Open the User Preferences Manager for the current
   * heatmap.
   *
   * This function is called if
   * - the Edit Preferences "gear" button is pressed on the main application screen, or
   * - the Modify Map Preferences menu option is selected from the hamburger menu.
   */
  function openPreferencesManager() {
    UHM.closeMenu();
    UHM.hlpC();

    if (prefspanel.style.display !== "none") {
      // The user clicked to open the preferences panel, but we believe it is already open.
      // Nothing to do, but we reshow the preferences panel just in case it's not visible.
      prefspanel.style.display = "";
      locatePrefsPanel();
      return;
    }

    // Set the heatMap we are editing.
    UPM.heatMap = MMGR.getHeatMap();

    // Disable the apply and reset buttons until a change is made.
    applyButton.disabled = true;
    resetButton.disabled = true;

    // Execute common code to display the contents of the Preferences Manager.
    editPreferences(null);
  }

  /**********************************************************************************
   * FUNCTION closePreferencesManager: Close the Preferences Manager Window.
   *
   * necessary to exit the user preferences dialog WITHOUT applying or saving any
   * changes made by the user when the Cancel button is pressed on the ColorMap
   * preferences dialog.  Since the dataLayer colormap must be edited to add/delete
   * breakpoints, the backup colormap (saved when preferences are first opened) is re-
   * applied to the colorMapManager.  Then the preferences DIV is retrieved and removed.
   **********************************************************************************/
  function closePreferencesManager() {
    // Clear any error message.
    showErrorMessage("");

    // Remove the contents of all tabs.
    // This will automatically cancel any unapplied changes in the
    // non-colormap UI elements in those tabs.
    for (const tab of allTabs) tab.removeTab();

    // Restore the heatMap's color maps.
    // This will remove any unapplied changes made to the color maps.
    restoreColorMaps();

    // Hide the user preferences panel.
    document.getElementById("prefs").style.display = "none";

    // Clear all global variables.
    clearGlobalVariables();
  }

  // Call before making any change to the preferences.
  // This will preserve, if necessary, the data required to reset any changes
  // and enable the Apply and Reset buttons.
  //
  function startChange() {
    if (resetButton.disabled) {
      preserveColorMaps();
      saveResetVals();
    }
    applyButton.disabled = false;
    resetButton.disabled = false;
  }

  // FUNCTION preserveColorMaps: Preserve the contents of the NG-CHM color
  // maps.
  //
  // This is done so that the state can still be reset after any color map
  // changes have been applied.
  //
  // We make deep copies of the color map states by saving them as JSON.
  //
  function preserveColorMaps() {
    if (UPM.bkpColorMaps === null) {
      UPM.bkpColorMaps = { layers: new Map(), row: new Map(), col: new Map() };
      const colorMapMgr = UPM.heatMap.getColorMapManager();
      const dataLayers = UPM.heatMap.getDataLayers();
      for (let key in dataLayers) {
        UPM.bkpColorMaps.layers.set(key, colorMapMgr.getColorMapJSON("data", key));
      }
      for (const { axis, key } of UPM.heatMap.genAllCovars()) {
        UPM.bkpColorMaps[axis].set(key, colorMapMgr.getColorMapJSON(axis, key));
      }
    }
  }

  // FUNCTION restoreColorMaps: Undo any color map changes by restoring the
  // NG-CHM's colormaps from bkpColorMaps.
  function restoreColorMaps() {
    if (UPM.bkpColorMaps !== null) {
      const colorMapMgr = UPM.heatMap.getColorMapManager();
      const dataLayers = UPM.heatMap.getDataLayers();
      for (let key in dataLayers) {
        colorMapMgr.setColorMap("data", key, JSON.parse(UPM.bkpColorMaps.layers.get(key)));
      }
      for (const { axis, key } of UPM.heatMap.genAllCovars()) {
        colorMapMgr.setColorMap(axis, key, JSON.parse(UPM.bkpColorMaps[axis].get(key)));
      }
    }
  }

  /**********************************************************************************
   * FUNCTION editPreferences: This is the MAIN driver function for edit
   * preferences processing.  It is called under two conditions:
   *
   * (1) The Edit Preferences "gear" button is pressed on the main application screen,
   *     or the Modify Map Preferences menu option is selected from the hamburger menu.
   *
   * (2) The user attempted to apply preferences BUT at least error was detected
   *     during validation.
   *
   **********************************************************************************/
  function editPreferences(errorMsg) {
    if (errorMsg === null) {
      // Initialize all tabs.
      for (const tab of allTabs) {
        tab.setupTab();
      }
      // Show the Preferences Manager.
      tabContainer.style.display = "block";
      // Ensure no error message is displayed.
      showErrorMessage("");
    } else {
      // Display the error message.
      showErrorMessage(errorMsg[2]);
    }

    // Prepare each tab's view: either the default view or after an error was detected.
    // errorMsg[1] is the id of the tab where the error was detcetd.
    for (const tab of allTabs) {
      if (errorMsg && errorMsg[1] == tab.tabId) {
        tab.prepareErrorView(errorMsg);
      } else {
        tab.prepareView();
      }
    }

    if (errorMsg != null) {
      // If there's an error, show that tab.
      showTabWithError(errorMsg);
      errorMsg = null;
    } else {
      // Default to opening the map layers tab.
      mapLayersTab.show();
    }

    // Display the Preferences Manager (if it isn't already) and set its location.
    prefspanel.style.display = "";
    locatePrefsPanel();

    // ------------------------------------------------------------------------
    // Helper functions.

    // Switch to the tab containing the error.
    function showTabWithError(errorMsg) {
      for (let ii = 0; ii < allTabs.length; ii++) {
        if (allTabs[ii].tabId == errorMsg[1]) {
          allTabs[ii].show(errorMsg);
          return;
        }
      }
      console.error("UPM.editPreferences: unable to show error: bad tab id", {
        errorMsg
      });
    }
  }

  // FUNCTION locatePrefsPanel: Position the prefernces panel on the screen.
  //
  function locatePrefsPanel() {
    const icon = document.querySelector("*[data-prefs-panel-locator]");
    const iconBB = icon.getBoundingClientRect();
    const container = UTIL.containerElement.parentElement;
    // Position the preferences panel over the container element.
    prefspanel.style.top = container.offsetTop + "px";
    prefspanel.style.height = container.offsetHeight + "px";
    // Done for builder panel sizing ONLY
    const screenNotes = document.getElementById("screenNotesDisplay");
    if (screenNotes !== null) {
      const notesBB = screenNotes.getBoundingClientRect();
      prefspanel.style.top = iconBB.top - notesBB.height + "px";
    }

    document.getElementById("prefsMove_btn").dataset.state = "moveLeft";
    prefspanel.style.left =
      UTIL.containerElement.getBoundingClientRect().right - prefspanel.offsetWidth + "px";
  }

  /**********************************************************************************
   * FUNCTION showErrorMessage: Set the error message at the bottom of the preferences
   * panel.
   **********************************************************************************/
  function showErrorMessage(errorMsgTxt) {
    const prefActions = document.getElementById("prefActions");
    const errMsg = prefActions.querySelector(".errorMessage");
    if (errMsg) {
      // Remove any existing error message.
      prefActions.removeChild(errMsg);
    }
    if (errorMsgTxt) {
      // Add new error message node before the buttons row (first child of prefActions).
      prefActions.insertBefore(
        UTIL.newElement("DIV.errorMessage", {}, UTIL.newTxt(errorMsgTxt)),
        prefActions.firstChild
      );
    }
  }

  /**********************************************************************************
   * FUNCTION movePreferencesManager: Toggle the preferences manager panel
   * from the left side of the screen to the right (or vice-versa).
   **********************************************************************************/
  function movePreferencesManager() {
    UHM.hlpC();
    const moveBtn = document.getElementById("prefsMove_btn");
    if (moveBtn.dataset.state === "moveLeft") {
      moveBtn.dataset.state = "moveRight";
      prefspanel.style.right = "";
      prefspanel.style.left = UTIL.containerElement.offsetLeft + "px";
    } else {
      moveBtn.dataset.state = "moveLeft";
      prefspanel.style.right = "";
      prefspanel.style.left =
        UTIL.containerElement.getBoundingClientRect().right - prefspanel.offsetWidth + "px";
    }
  }

  // FUNCTION saveResetVals: save a copy of all the data needed to reset the heatMap state.
  //
  function saveResetVals() {
    const resetVals = {
      matrix: UPM.heatMap.getMapInformation()
    };
    for (const axis of ["row", "col"]) {
      resetVals[axis + "Config"] = UPM.heatMap.getAxisConfig(axis);
      resetVals[axis + "LabelTypes"] = UPM.heatMap.getLabelTypes(axis); // Comes from mapData.
    }
    // Turn resetVals into a string so the values don't change as the user changes
    // stuff in the preferences manager.
    UPM.resetValJSON = JSON.stringify(resetVals);
  }

  // FUNCTION resetAllPreferences: Reset the heatMap state and the UI to the saved values.
  //
  function resetAllPreferences() {
    restoreColorMaps();
    const resetVal = JSON.parse(UPM.resetValJSON);
    // Reset all of the UI preferences.
    for (const tab of allTabs) {
      tab.resetTabPrefs(resetVal);
    }
    // Then set the heatMap to those restored values.
    applyAllPreferences(true);
  }

  /**********************************************************************************
   * FUNCTION applyAllPreferences: The purpose of this function is to perform all processing
   * necessary to reconfigure the "current" presentation of the heat map in the
   * viewer when the Apply button is pressed on the ColorMap Preferences Dialog.
   * First validations are performed.  If errors are found, preference
   * changes are NOT applied and the user is re-presented with the preferences dialog
   * and the error found.  If no errors are found, all changes are applied to the heatmap
   * and the summary panel, detail panel, and covariate bars are redrawn.
   **********************************************************************************/
  function applyAllPreferences(isReset) {
    // Disable the apply and reset buttons.
    applyButton.disabled = true;
    resetButton.disabled = true;

    // Give the apply and reset buttons time to become disabled, otherwise
    // that state might never show up.
    setTimeout(() => doApply(isReset), 0);

    // ------------------------------------------------------------------------
    // Helper functions.

    // Continue applying the preferences once the applyButton has had a chance to update.
    function doApply(isReset) {
      // When resetting, no validations need to be performed and, if they were,
      // additional modifications to the validation logic would be required.
      const errorMsg = isReset ? null : validateAllPreferences();
      if (errorMsg) {
        // If a validation error exists, re-present the user preferences
        // dialog with the error message displayed.
        resetButton.disabled = false;
        editPreferences(errorMsg);
      } else {
        // Apply all preferences.
        for (const tab of allTabs) {
          tab.applyTabPrefs();
        }
        showErrorMessage("");
        redrawHeatMap();
        // Remove the backup color maps (used to reinstate colors if
        // the user resets or cancels).
        UPM.bkpColorMaps = null;
      }
    }

    /**********************************************************************************
     * FUNCTION validateAllPreferences: Validate all user changes to the heatmap
     * properties by checking every tab in turn.
     **********************************************************************************/
    function validateAllPreferences() {
      for (const tab of allTabs) {
        const errorMsg = tab.validateTab();
        if (errorMsg) return errorMsg;
      }
      return null;
    }

    /**********************************************************************************
     * FUNCTION redrawHeatMap: Redraw the heatmap after it has been updated.
     **********************************************************************************/
    function redrawHeatMap() {
      // Redraw the heat map.
      UPM.heatMap.initAxisLabels();
      UPM.heatMap.setUnAppliedChanges(true);
      SUM.redrawSummaryPanel();
      DMM.resizeDetailMapCanvases();
      DET.updateSelections(false); // Do not skip resize: covariate bar changes may require resize
    }
  }

  /**********************************************************************************
   * FUNCTION prefsValidateBreakPoints: The purpose of this function is to validate
   * all user breakpoint and color changes to heatmap data layer properties. When the
   * first error is found, an error  message (string array containing error information)
   * is created and returned to the prefsApply function.
   **********************************************************************************/
  function prefsValidateBreakPoints(axis, key, prefPanel) {
    const colorMapMgr = UPM.heatMap.getColorMapManager();
    const colorMap = colorMapMgr.getColorMap(axis, key);
    var thresholds = colorMap.getThresholds();
    var charBreak = false;
    var dupeBreak = false;
    var breakOrder = false;
    var prevBreakValue = MAPREP.minValues;
    var errorMsg = null;
    //Loop thru colormap thresholds and validate for order and duplicates
    for (let i = 0; i < thresholds.length; i++) {
      const breakElement = getBreakPrefElement(key, axis, i);
      // If current breakpoint is not numeric
      if (isNaN(breakElement.value) || breakElement.value === "") {
        charBreak = true;
        break;
      }

      //If current breakpoint is not greater than previous, throw order error
      if (Number(breakElement.value) < prevBreakValue) {
        breakOrder = true;
        break;
      }
      //Loop thru thresholds, skipping current element, searching for a match to the
      //current selection.  If found, throw duplicate error
      for (let j = 0; j < thresholds.length; j++) {
        const be = getBreakPrefElement(key, axis, j);
        if (be !== null) {
          if (i != j) {
            if (Number(breakElement.value) === Number(be.value)) {
              dupeBreak = true;
              break;
            }
          }
        }
      }
      prevBreakValue = breakElement.value;
    }
    if (charBreak) {
      errorMsg = [key, prefPanel, "ERROR: Breakpoints must be numeric", axis];
    }
    if (breakOrder) {
      errorMsg = [key, prefPanel, "ERROR: Breakpoints must be in increasing order", axis];
    }
    if (dupeBreak) {
      errorMsg = [key, prefPanel, "ERROR: Duplicate breakpoint found", axis];
    }

    return errorMsg;
  }

  /**********************************************************************************
   * FUNCTION prefsValidateBreakColors: The purpose of this function is to validate
   * all user color changes to heatmap classification and data layer properties. When the
   * first error is found, an error  message (string array containing error information)
   * is created and returned to the prefsApply function.
   **********************************************************************************/
  // This function isn't being called!!!????
  function prefsValidateBreakColors(colorMapName, axis, prefPanel) {
    const colorMapMgr = UPM.heatMap.getColorMapManager();
    const colorMap = colorMapMgr.getColorMap(type, colorMapName);
    const thresholds = colorMap.getThresholds();
    const colors = colorMap.getColors();
    let dupeColor = false;
    for (let i = 0; i < colors.length; i++) {
      for (let j = 0; j < thresholds.length; j++) {
        if (i != j) {
          const ce = getColorPrefElement(colorMapName, axis, j);
          if (colorElement.value === ce.value) {
            dupeColor = true;
            break;
          }
        }
      }
    }
    if (dupeColor) {
      return [colorMapName, prefPanel, "ERROR: Duplicate color setting found above"];
    }

    return null;
  }

  /**********************************************************************************
   * FUNCTION prefsApplyBreaks: Apply all user entered changes to the colors
   * and breakpoints of the specified color map.
   **********************************************************************************/
  function prefsApplyBreaks(colorMapName, axis) {
    const colorMapMgr = UPM.heatMap.getColorMapManager();
    const colorMap = colorMapMgr.getColorMap(axis, colorMapName);
    const newColors = getNewBreakColors(axis, colorMapName);
    colorMap.setColors(newColors);
    if (colorMap.getType() != "discrete") {
      const newThresholds = getNewBreakThresholds(axis, colorMapName);
      colorMap.setThresholds(newThresholds);
    }
    const missingElement = KAE(colorMapName, axis, "missing", "colorPref");
    colorMap.setMissingColor(missingElement.value);
    colorMapMgr.setColorMap(axis, colorMapName, colorMap);
  }

  /**********************************************************************************
   * FUNCTION getNewBreakColors: Return an array of colors from the color entries
   * in the colormap specified by colorMapAxis and colorMapName.  If pos and action
   * are supplied, it will modify the returned colors by adding or deleting a
   * color entry.
   * It iterates thru the screen elements, pulling the current color entry for each
   * element, placing it in a new array, and returning that array.
   *
   * This function is called by the prefsApplyBreaks function.  It is ALSO called from
   * the data layer modifyDataLayerBreaks function with parameters passed
   * in for the position to add/delete and the action to be performed (add/delete).
   **********************************************************************************/
  function getNewBreakColors(colorMapAxis, colorMapName, pos, action) {
    const colorMapMgr = UPM.heatMap.getColorMapManager();
    const colorMap = colorMapMgr.getColorMap(colorMapAxis, colorMapName);
    const thresholds = colorMap.getThresholds();
    const newColors = [];
    let prevColorElement = getColorPrefElement(colorMapName, colorMapAxis, 0);
    if (pos == 0 && action == "add") {
      // Insert a color before the first color.
      newColors.push(UTIL.blendTwoColors("#000000", prevColorElement.value));
    }
    if (pos != 0 || action != "delete") {
      // Copy first color unless it is deleted.
      newColors.push(prevColorElement.value); // color0
    }
    for (let j = 1; j < thresholds.length; j++) {
      const colorElement = getColorPrefElement(colorMapName, colorMapAxis, j);
      //In case there are now less elements than the thresholds list on Reset.
      if (colorElement !== null) {
        //If being called from modifyDataLayerBreaks
        if (typeof pos !== "undefined") {
          if (action === "add") {
            if (j === pos) {
              //Blend previous and current breakpoint colors to get new color.
              newColors.push(UTIL.blendTwoColors(prevColorElement.value, colorElement.value));
            }
            newColors.push(colorElement.value);
          } else {
            if (j !== pos) {
              newColors.push(colorElement.value);
            }
          }
        } else {
          newColors.push(colorElement.value);
        }
      }
      prevColorElement = colorElement;
    }
    if (pos == thresholds.length && action == "add") {
      // Add a new color after the last one.
      newColors.push(UTIL.blendTwoColors("#000000", prevColorElement.value));
    }

    //If this color map is for an covariate bar AND that bar is a scatter or
    //bar plot (colormap will always be continuous), set the upper colormap color
    //to the foreground color set by the user for the bar/scatter plot. This is
    //default behavior that happens when a map is built but must be managed as
    //users change preferences and bar types.
    if (colorMapAxis !== "data") {
      const classBar = UPM.heatMap.getAxisCovariateConfig(colorMapAxis)[colorMapName];
      if (classBar.bar_type != "color_plot") {
        newColors[1] = classBar.fg_color;
      }
    } else {
      //Potentially on a data layer reset, there could be more color points than contained in the thresholds object
      //because a user may have deleted a breakpoint and then hit "reset". So we check for up to 50 preferences.
      for (let k = thresholds.length; k < 50; k++) {
        const colorElement = getColorPrefElement(colorMapName, colorMapAxis, k);
        if (colorElement !== null) {
          newColors.push(colorElement.value);
        }
      }
    }
    return newColors;
  }

  // Return the id of the colorPref element at the specified position in the specified
  // color map (or null if none).
  function getColorPrefId(key, axis, position) {
    return KAID(key, axis, "color" + position, "colorPref");
  }

  // Return the colorPref element at the specified position in the specified
  // color map (or null if none).
  function getColorPrefElement(key, axis, position) {
    return KAE_OPT(key, axis, "color" + position, "colorPref");
  }

  // Return the id of the breakpoint at the specified position in the specified
  // color map (or null if none).
  function getBreakPrefId(key, axis, position) {
    return KAID(key, axis, "breakPt" + position, "breakPref");
  }

  // Return the breakpoint element at the specified position in the specified
  // color map (or null if none).
  function getBreakPrefElement(key, axis, position) {
    return KAE_OPT(key, axis, "breakPt" + position, "breakPref");
  }

  /**********************************************************************************
   * FUNCTION getNewBreakThresholds: The purpose of this function is to grab all user
   * data layer breakpoint entries for a given colormap and place them on a string array.
   * It will  iterate thru the screen elements, pulling the current breakpoint entry for each
   * element, placing it in a new array, and returning that array. This function is
   * called by the prefsApplyBreaks function (only for data layers).  It is ALSO called
   * from the modifyDataLayerBreaks function with parameters
   * passed in for the position to add/delete and the action to be performed (add/delete).
   **********************************************************************************/
  function getNewBreakThresholds(colorMapAxis, colorMapName, pos, action) {
    const colorMapMgr = UPM.heatMap.getColorMapManager();
    const colorMap = colorMapMgr.getColorMap(colorMapAxis, colorMapName);
    const thresholds = colorMap.getThresholds();
    const newThresholds = [];
    let prevBreakElement = getBreakPrefElement(colorMapName, colorMapAxis, 0);
    let prevBreakValue = Number(prevBreakElement.value);
    if (pos == 0 && action == "add") {
      newThresholds.push(prevBreakValue - 1);
    }
    if (pos != 0 || action != "delete") {
      newThresholds.push(prevBreakValue);
    }
    for (let j = 1; j < thresholds.length; j++) {
      const breakElement = getBreakPrefElement(colorMapName, colorMapAxis, j);
      const breakValue = Number(breakElement.value);
      //In case there are now less elements than the thresholds list on Reset.
      if (breakElement !== null) {
        if (typeof pos !== "undefined") {
          if (action === "add") {
            if (j === pos) {
              //calculate the difference between last and next breakpoint values and divide by 2 to get the mid-point between.
              const breakDiff = breakValue - prevBreakValue;
              //add mid-point to last breakpoint.
              const calcdBreak = (prevBreakValue + breakDiff / 2).toFixed(4);
              newThresholds.push(calcdBreak);
            }
            newThresholds.push(breakValue);
          } else {
            if (j !== pos) {
              newThresholds.push(breakValue);
            }
          }
        } else {
          newThresholds.push(breakValue);
        }
      }
      prevBreakElement = breakElement;
      prevBreakValue = breakValue;
    }
    if (pos == thresholds.length) {
      newThresholds.push(prevBreakValue + 1);
    }
    //Potentially on a data layer reset, there could be more color points than contained in the thresholds object
    //because a user may have deleted a breakpoint and then hit "reset". So we check for up to 50 preferences.
    for (let k = thresholds.length; k < 50; k++) {
      const breakElement = getBreakPrefElement(colorMapName, colorMapAxis, k);
      if (breakElement !== null) {
        newThresholds.push(breakElement.value);
      }
    }

    return newThresholds;
  }

  /**********************************************************************************
   * CLASS MapLayersTab - a tab for all data layer preferences.
   *
   * A dropdown list containing all data layers is presented and individual DIVs
   * for each data layer, containing breakpoints/colors, are added.
   **********************************************************************************/
  function MapLayersTab() {
    PreferencesTab.call(this, "ngchm-upm-layersTab-btn", "ngchm-upm-layersTab");
  }

  MapLayersTab.prototype.prepareErrorView = function (errorMsg) {
    // errorMsg[0] : layer name
    // Show the view of the layer containing the error.
    this.showDataLayer(errorMsg[0]);
  };

  MapLayersTab.prototype.prepareView = function () {
    // Show the view of the heatMap's current layer.
    this.showDataLayer(UPM.heatMap.getCurrentDL());
  };

  MapLayersTab.prototype.setupTab = function setupLayersTab() {
    const sortedLayers = UPM.heatMap.getSortedLayers();

    this.tabDiv.appendChild(createDataLayerSelect(sortedLayers));

    // Loop over the data layers, creating a preferences div for each layer.
    // All are hidden initially. Switching to the tab will display one of them.
    for (const entry of sortedLayers) {
      this.createLayerPreferences(entry[0]);
    }

    // Add a change event handler for this tab.
    this.tabDiv.addEventListener("change", (ev) => {
      if (debug || debugEvents) {
        console.log("DataLayersTab: Change handler", { target: ev.target });
      }
      for (const target of tabTargetGen(ev)) {
        if (target.id == "dlPref_list") {
          // Change this visible layer preferences div.
          this.showDataLayer();
          break;
        }
        if (
          target.classList.contains("spectrumColor") ||
          target.classList.contains("ngchm-upm-input")
        ) {
          // Note the user changed something in a layer preferences div.
          startChange();
          break;
        }
      }
    });

    return this.tabDiv;

    // Helper function.

    // Create and return the data-layer select dropdown.
    function createDataLayerSelect(sortedLayers) {
      const dropdown = UTIL.newElement("DIV.ngchm-upm-layer-select");

      const label = UTIL.newElement("LABEL", { for: "dlPref_list" }, "Data Layer:");
      const select = UTIL.newElement("SELECT", {
        id: "dlPref_list",
        name: "dlPref_list"
      });
      dropdown.appendChild(label);
      dropdown.appendChild(select);

      for (const [key, layer] of sortedLayers) {
        let displayName = layer.name;
        if (displayName.length > 20) {
          displayName = displayName.substring(0, 17) + "...";
        }
        select.appendChild(UTIL.newElement("OPTION", { value: key }, displayName));
      }
      return dropdown;
    }
  };

  // METHOD MapLayersTab.validateTab: validate user preference settings on the
  // Layers (aka Heat Map Colors) tab.
  MapLayersTab.prototype.validateTab = function validateLayersTab() {
    const dataLayers = UPM.heatMap.getDataLayers();
    for (let key in dataLayers) {
      const errorMsg = prefsValidateBreakPoints("data", key, "layerPrefs");
      if (errorMsg != null) return errorMsg;
    }
    return null;
  };

  // METHOD MapLayersTab.resetTabPrefs: reset the Data Layer preference items.
  //
  MapLayersTab.prototype.resetTabPrefs = function resetLayersTabPrefs(resetVal) {
    for (let layerName in resetVal.matrix.data_layer) {
      const layer = resetVal.matrix.data_layer[layerName];

      // Reset the color map values.
      const dlTable = getColorScheme("data", layerName);
      dlTable.fillContinuousColorTable(layer.color_map);
      dlTable.setMissingColor(layer.color_map.missing);

      // Reset the other data layer values.
      resetGridPreferences(layerName, layer);

      // Load the preview histogram for the layer.
      loadColorPreviewDiv(layerName);
    }
  };

  // METHOD MapLayersTab.applyTabPrefs: Apply all user preference settings on the Layers
  // (aka Heat Map Colors) tab.
  //
  MapLayersTab.prototype.applyTabPrefs = function applyLayersTabPrefs() {
    // Apply Data Layer Preferences
    for (let layerName in UPM.heatMap.getDataLayers()) {
      // Apply the color map changes.
      prefsApplyBreaks(layerName, "data");

      // Apply the other data layer values.
      applyGridPreferences(layerName);

      // Load the preview histogram for the layer.
      loadColorPreviewDiv(layerName);
    }
  };

  /**********************************************************************************
   * METHOD createLayerPreferences: Construct a DIV containing all of the preferences
   * for the specified data layer and add it to the tab, replacing any existing div
   * for that layer.
   *
   * This function will be called repeatedly to create a DIV for each data layer. At any
   * time, exactly one of the resulting DIVs will be visible, depending on the value of
   * the layers dropdown on the LayerPreferencesTab.  It will be displayed immediately
   * below that dropdown.
   *
   * This function should only be called after the layers dropdown has been added to the
   * tab, so that it will appear below it.  The order in which the layer preferences are
   * added (and replaced) does not matter, since at most one is ever visible at a time.
   *
   **********************************************************************************/
  MapLayersTab.prototype.createLayerPreferences = function createLayerPreferences(layerName) {
    // Create a DIV for the layer preferences.
    const layerPrefsId = KAID("layerPrefs", layerName);
    const layerPrefs = UTIL.newElement("DIV");
    layerPrefs.id = layerPrefsId;

    // Remove the existing div for the layer, if any.
    const oldLayerPrefs = document.getElementById(layerPrefsId);
    if (oldLayerPrefs) {
      // If replacing a layer prefs, keep the same visibility.
      layerPrefs.style.display = oldLayerPrefs.style.display;
      this.tabDiv.removeChild(oldLayerPrefs);
    } else {
      // A new layers prefs is not visible until switched to.
      layerPrefs.style.display = "none";
    }

    // The layerPrefs division consists of four subparts:
    // - the layer's continuous color scheme
    // - a continuous color palette table
    // - the grid properties table
    // - the preview histogram.

    // 1. Create the continuous color scheme.
    const colorMapMgr = UPM.heatMap.getColorMapManager();
    const colorMap = colorMapMgr.getColorMap("data", layerName);
    const colorScheme = createColorMapInput(layerName, "data", colorMap);
    layerPrefs.appendChild(colorScheme);

    // 2. Create the color palette table.
    const paletteTable = TABLE.createTable({ columns: 3 });
    paletteTable.content.style.width = "fit-content";
    paletteTable.addIndent();
    PALETTES.addPredefinedPalettes(
      paletteTable,
      layerName,
      setColorPrefsToPreset,
      "data",
      "continuous"
    );
    layerPrefs.appendChild(paletteTable.content);

    // 3. Create the grid properties table.
    const gridProps = createGridPropsInput(layerName);
    layerPrefs.appendChild(gridProps.content);

    // 4. Create the preview histogram.

    const header = UTIL.newElement("DIV.histogram-header");
    header.appendChild(document.createTextNode("Color Histogram:"));
    const updateButton = UTIL.newElement(
      "DIV.buttonGroup.histogram-update",
      {},
      UTIL.newElement(
        "BUTTON",
        { type: "button" },
        UTIL.newElement("SPAN.button", {}, "Update"),
        function (el) {
          el.onclick = function () {
            loadColorPreviewDiv(layerName);
          };
          return el;
        }
      )
    );

    const histogram = UTIL.newElement("DIV.histogram");
    histogram.appendChild(header);
    histogram.appendChild(updateButton);

    const previewDiv = UTIL.newElement("DIV.histogram-preview");
    previewDiv.id = "previewWrapper" + layerName;
    histogram.appendChild(previewDiv);

    setTimeout(
      function (layerName) {
        loadColorPreviewDiv(layerName, true);
      },
      100,
      layerName
    );
    layerPrefs.appendChild(histogram);

    // Add the layer preferences to the end of the tab.
    this.tabDiv.appendChild(layerPrefs);
  };

  /**********************************************************************************
   * METHOD showDataLayer: Show the specified data layer panel.
   *
   * If selLayer is specified, set the layer drop down to that value.
   * Now show the selected layer panel and hide all others.
   *
   **********************************************************************************/
  MapLayersTab.prototype.showDataLayer = function showDataLayer(selLayer) {
    const layerBtn = document.getElementById("dlPref_list");
    // Change the selected panel to selLayer if provided.
    if (typeof selLayer != "undefined") {
      layerBtn.value = selLayer;
    }
    // Show the selected panel. Hide all others.
    for (let i = 0; i < layerBtn.length; i++) {
      const prefs = KAE("layerPrefs", layerBtn.options[i].value);
      prefs.style.display = layerBtn.options[i].selected ? "block" : "none";
    }
  };

  /**********************************************************************************
   * FUNCTION getTempCM: This function  will create a dummy color map object to be
   * used by loadColorPreviewDiv. If the gear menu has just been opened (firstLoad), the
   * saved values from the color map manager will be used. Otherwise, it will read the
   * values stored in the input boxes, as these values may differ from the ones stored
   * in the color map manager.
   **********************************************************************************/
  function getTempCM(mapName, firstLoad) {
    const tempCM = { colors: [], missing: "", thresholds: [], type: "linear" };
    if (firstLoad) {
      const colorMapMgr = UPM.heatMap.getColorMapManager();
      const colorMap = colorMapMgr.getColorMap("data", mapName);
      tempCM.thresholds = colorMap.getThresholds();
      tempCM.colors = colorMap.getColors();
      tempCM.missing = colorMap.getMissingColor();
    } else {
      for (let i = 0; ; i++) {
        const bp = getBreakPrefElement(mapName, "data", i);
        const color = getColorPrefElement(mapName, "data", i);
        if (!bp || !color) {
          // Reached end of breakpoints and/or colors.
          break;
        }
        tempCM.colors.push(color.value);
        tempCM.thresholds.push(bp.value);
      }
      const missing = KAE(mapName, "data", "missing", "colorPref");
      tempCM.missing = missing.value;
    }
    return tempCM;
  }

  /**********************************************************************************
   * FUNCTION loadColorPreviewDiv: This function will update the color distribution
   * preview div to the current color palette in the gear panel
   **********************************************************************************/
  function loadColorPreviewDiv(mapName, firstLoad) {
    var cm = getTempCM(mapName, firstLoad);
    var gradient = "linear-gradient(to right";
    var numBreaks = cm.thresholds.length;
    var highBP = parseFloat(cm.thresholds[numBreaks - 1]);
    var lowBP = parseFloat(cm.thresholds[0]);
    var diff = highBP - lowBP;
    for (var i = 0; i < numBreaks; i++) {
      var bp = cm.thresholds[i];
      var col = cm.colors[i];
      var pct = Math.round(((bp - lowBP) / diff) * 100);
      gradient += "," + col + " " + pct + "%";
    }
    gradient += ")";
    const wrapper = document.getElementById("previewWrapper" + mapName);

    UPM.heatMap.getSummaryHist(mapName, lowBP, highBP).then((hist) => {
      var svg = "<svg class='preview-svg' id='previewSVG" + mapName + "' width='110' height='100'>";
      for (var i = 0; i < hist.bins.length; i++) {
        var rect =
          "<rect x='" +
          i * 10 +
          "' y='" +
          (1 - hist.bins[i] / hist.binMax) * 100 +
          "' width='10' height='" +
          (hist.bins[i] / hist.binMax) * 100 +
          "' style='fill:rgb(0,0,0);fill-opacity:0;stroke-width:1;stroke:rgb(0,0,0)'> " /*<title>"+hist.bins[i]+"</title>*/ +
          "</rect>";
        svg += rect;
      }
      var missingRect =
        "<rect x='100' y='" +
        (1 - hist.nan / hist.binMax) * 100 +
        "' width='10' height='" +
        (hist.nan / hist.binMax) * 100 +
        "' style='fill:rgb(255,255,255);fill-opacity:1;stroke-width:1;stroke:rgb(0,0,0)'> " /* <title>"+hist.nan+"</title>*/ +
        "</rect>";
      svg += missingRect;
      svg += "</svg>";
      const boundNums =
        "<p class='preview-legend-left'>" +
        lowBP.toFixed(2) +
        "</p><p class='preview-legend-right'>" +
        highBP.toFixed(2) +
        "</p>";
      const mainColor =
        "<div class='preview-main-color' id='previewMainColor" +
        mapName +
        "' style='background:" +
        gradient +
        ";'></div>";
      const missingColor =
        "<div class='preview-missing-color' id='previewMissingColor" +
        mapName +
        "'style='background:" +
        cm.missing +
        ";'></div>";
      wrapper.innerHTML = mainColor + missingColor + svg + boundNums;
    });
  }

  /**********************************************************************************
   * FUNCTION setColorPrefsToPreset: This function will be executed when the user
   * selects a predefined color scheme. It will set the color preferences based on the
   * preset.
   *
   * For discrete color preferences: it will set the colors directly from the preset.
   *
   * For continuous color preferences: it will interpolate the colors from the preset
   * based on the breakpoints.
   **********************************************************************************/
  function setColorPrefsToPreset(key, preset, axis, type) {
    if (debug || debugColors) {
      console.log("setColorPrefsToPreset:", { key, preset, axis, type });
    }
    startChange();

    // Find the number of breakpoints/colors in the color preference.
    let numColorPrefs = 0;
    while (getColorPrefElement(key, axis, ++numColorPrefs)) {}

    // Get that many colors.
    const colors = type == "discrete" ? preset.getColorArray(numColorPrefs) : getContColors();

    // Set the color preferences.
    for (let j = 0; j < numColorPrefs; j++) {
      getColorPrefElement(key, axis, j).value = colors[j];
    }
    KAE(key, axis, "missing", "colorPref").value = preset.missing;

    // Helper function.
    // Get the colors for a continuous color scheme (data layer or continuous covariate).
    function getContColors() {
      // Determine the total range of the breakpoints.
      const firstBP = Number(getBreakPrefElement(key, axis, 0).value);
      const lastBP = Number(getBreakPrefElement(key, axis, numColorPrefs - 1).value);
      const range = lastBP - firstBP;

      // Create a temporary color map for interpolating the color scheme colors.
      const thresh = [];
      for (let j = 0; j < preset.colors.length; j++) {
        thresh[j] = firstBP + j * (range / (preset.colors.length - 1));
      }
      const colorScheme = {
        type: "continuous",
        colors: preset.colors,
        thresholds: thresh,
        missing: preset.missing
      };
      const csTemp = new CMM.ColorMap(UPM.heatMap, colorScheme);

      // Get the interpolated colors at each breakpoint.
      const colors = [];
      for (let j = 0; j < numColorPrefs; j++) {
        const breakpoint = getBreakPrefElement(key, axis, j).value;
        colors.push(csTemp.getRgbToHex(csTemp.getColor(breakpoint)));
      }
      return colors;
    }
  }

  // Create an input for the specified layer's grid properties.
  // Also includes the layer's selection color and gap color.
  //
  function createGridPropsInput(layerName) {
    const gridProps = TABLE.createTable({ columns: 4 });
    gridProps.content.style.width = "fit-content";
    gridProps.addIndent();
    const layer = UPM.heatMap.getDataLayers()[layerName];

    gridProps.addBlankSpace(3);
    gridProps.addRow(
      [
        "Grid Lines:",
        createColorInput(KAID(layerName, "gridColorPref"), layer.grid_color),
        "Grid Show:",
        createCheckBox(KAID(layerName, "gridPref"), layer.grid_show == "Y")
      ],
      { fontWeight: ["bold", "", "bold", ""] }
    );
    gridProps.addRow(
      [
        "Selection Color:",
        createColorInput(KAID(layerName, "selectionColorPref"), layer.selection_color),
        "Gap Color:",
        createColorInput(KAID(layerName, "gapColorPref"), layer.cuts_color)
      ],
      { fontWeight: ["bold", "", "bold", ""] }
    );
    return gridProps;
  }

  // Reset the "grid" preferences for the specified layer from the given resetVals.
  function resetGridPreferences(layerName, resetVals) {
    KAE(layerName, "gridPref").checked = resetVals.grid_show == "Y";
    KAE(layerName, "gridColorPref").value = resetVals.grid_color;
    KAE(layerName, "selectionColorPref").value = resetVals.selection_color;
    KAE(layerName, "gapColorPref").value = resetVals.cuts_color;
  }

  // Apply the "grid" preferences for the specified layer.
  function applyGridPreferences(layerName) {
    UPM.heatMap.setLayerGridPrefs(
      layerName,
      KAE(layerName, "gridPref").checked,
      KAE(layerName, "gridColorPref").value,
      KAE(layerName, "selectionColorPref").value,
      KAE(layerName, "gapColorPref").value
    );
  }
  // ===================================================================================
  // COVARIATE PREFERENCE PROCESSING FUNCTIONS
  //
  // CLASS CovariatesPrefsTab - Tab for Showing Covariate Preferences.
  // - Inherits from class PreferencesTab.
  //
  function CovariatesPrefsTab() {
    PreferencesTab.call(this, "prefClass_btn", "classPrefs");
  }

  // Return true iff the covariate name is a value of covariates dropdown
  // that does not correspond to a covariate.
  function isDummyCovariate(name) {
    return ["NEW-row", "NEW-col"].includes(name);
  }

  // PROPERTY CovariatesPrefsTab.nextNumber - return a unique value on every access.
  //
  {
    let nextNumber = 0;
    Object.defineProperty(CovariatesPrefsTab.prototype, "nextNumber", {
      get: () => nextNumber++
    });
  }

  /**********************************************************************************
   * METHOD - CovariatesPrefsTab.setupTab: Populates the covariates preferences tab.
   *
   * The covariates tab consists of a filter for subsetting the list of available
   * covariates.
   *
   * Below that is a "covariate dropdown" containing:
   * - An entry for showing a summary table of all covariates.
   * - Entries for creating new row or column covariates.
   * - An entry for each covariate bar that passes the filter.
   *
   * After the covariate dropdown there are:
   * - a "covariate summary" DIV for "ALL" classification bars that contains preferences
   *   that are global to all of the individual bars.
   * - individual DIVs for every covariate bar containing detailed preferences for the
   *   bar concerned.
   * Exactly one of these DIVs is visible at any time. Which one depends on the
   * value of the covariate dropdown.
   *
   **********************************************************************************/
  CovariatesPrefsTab.prototype.setupTab = function setupCovariatesTab() {
    const prefsTable = TABLE.createTable({ columns: 3 });

    this.tabDiv.appendChild(prefsTable.content);
    prefsTable.addBlankSpace();

    // Add the covariate filter input.
    const filterInput = "<input name='all_searchPref' id='all_searchPref'>";
    const filterButton = UTIL.newElement(
      "BUTTON#all_searchPref_btn.text-button",
      {
        align: "top"
      },
      [UTIL.newElement("SPAN.button", {}, "Filter Covariates")]
    );
    prefsTable.addRow([filterInput, filterButton], {
      colSpan: [2, 1],
      align: ["right", "left"]
    });
    prefsTable.addBlankSpace(2);

    // Add the covariate selection dropdown.
    const classSelect = UTIL.newElement("SELECT#classPref_list", {
      name: "classPref_list"
    });
    prefsTable.addRow(["Covariate Bar: ", classSelect]);
    prefsTable.addBlankSpace();

    // Add a hidden DIV for every covariate.
    // The DIV will be displayed if the user selects the covariate from the
    // covariate selection dropdown.
    const covariates = {
      row: UPM.heatMap.getRowClassificationConfig(),
      col: UPM.heatMap.getColClassificationConfig()
    };
    this.hasClasses = false;
    for (const { axis, key } of UPM.heatMap.genAllCovars()) {
      this.hasClasses = true;
      if (this.filterShow(key)) {
        const breakprefs = setupClassBreaks(key, axis, covariates[axis][key]);
        breakprefs.style.display = "none";
        this.tabDiv.appendChild(breakprefs);
      }
    }

    // Append a DIV panel for all of the covariate bars.
    // The DIV will be displayed if the user selects "ALL" from the
    // covariate selection dropdown.
    const allPrefs = this.setupAllClassesPrefs();
    allPrefs.style.display = this.hasClasses ? "block" : "none";
    this.tabDiv.appendChild(allPrefs);

    this.emptyNotice = null;
    if (!this.hasClasses) {
      this.emptyNotice = prefsTable.addRow(["This Heat Map contains no covariate bars"]);
    }

    this.addClassPrefOptions();

    // Add a click handler for the entire tab.
    this.tabDiv.addEventListener("click", (ev) => {
      if (debug || debugEvents) {
        console.log("CovariatesPrefsTab: Click handler", { target: ev.target });
      }
      for (const target of tabTargetGen(ev)) {
        if (target.id == "all_searchPref_btn") {
          // The user clicked on the filter covariates button.
          this.filterClassPrefs();
          return;
        }
      }
    });

    // Add a change handler for the entire tab.
    this.tabDiv.addEventListener("change", (ev) => {
      if (debug || debugEvents) {
        console.log("CovariatesPrefsTab: Change handler", {
          target: ev.target
        });
      }
      for (const target of tabTargetGen(ev)) {
        if (target.classList.contains("ngchm-upm-show-covariate")) {
          // A "Show" checkbox on a covariate row changed.
          startChange();
          this.setShowAll();
          break;
        } else if (target.id == "classPref_list") {
          // A new selection was made on the covariate bar dropdown.
          if (flagNewCovars && isDummyCovariate(ev.target.value)) {
            // Create a new covariate.
            startChange();
            const axis = ev.target.value.substr(4);
            const number = this.nextNumber;
            const name = "new_covariate" + number;
            const key = name + "_" + axis;
            // Add an entry for the new covariate to the covariate drop down.
            const classSelect = document.getElementById("classPref_list");
            classSelect.options[classSelect.options.length] = new Option(name, key);
            classSelect.value = key;
            // Create a DIV for the new covariate.
            const newCovar = this.setupNewCovariate(axis, name);
            newCovar.style.display = "none";
            this.tabDiv.appendChild(newCovar);
            // Show the new covariate.
            this.showClassBreak(name, axis);
          } else {
            // Change view to new selection.
            this.showClassBreak();
          }
          break;
        } else if (
          target.classList.contains("spectrumColor") ||
          target.classList.contains("ngchm-upm-input")
        ) {
          startChange();
          break;
        }
      }
    });
    return this.tabDiv;
  };

  CovariatesPrefsTab.prototype.setupNewCovariate = function setupNewCovariate(axis, name) {
    const newBarDetails = UPM.heatMap.addCovariate(axis, name, "continuous");
    const newPrefs = setupClassBreaks(name, axis, newBarDetails);
    const prefContents = document.getElementById("tableAllClasses");
    this.addCovariateRow(prefContents, name, axis, newBarDetails);
    return newPrefs;
  };

  /**********************************************************************************
   * FUNCTION setupAllClassesPrefs: The purpose of this function is to construct a DIV
   * containing a list of all covariate bars with informational data and user preferences
   * that are common to all bars (show/hide and size).
   **********************************************************************************/
  CovariatesPrefsTab.prototype.setupAllClassesPrefs = function setupAllClassesPrefs() {
    const allprefs = UTIL.newElement("DIV#breakPrefs_ALL");
    const prefContents = UTIL.newElement("TABLE#tableAllClasses");

    UHM.addBlankRow(prefContents);
    const thisTab = this;

    // Create a pair of buttons for adjusting the size of all covariates.
    const buttons = UTIL.newElement("DIV.icon_group", {}, [
      UTIL.newSvgButton(
        "icon-minus",
        {
          dataset: {
            tooltip: "Decrease the size of all selected covariate bars by one"
          }
        },
        function (el) {
          el.onclick = function () {
            startChange();
            decrementAllHeights();
          };
          return el;
        }
      ),
      UTIL.newSvgButton(
        "icon-plus",
        {
          dataset: {
            tooltip: "Increase the size of all selected covariate bars by one"
          }
        },
        function (el) {
          el.onclick = function () {
            startChange();
            incrementAllHeights();
          };
          return el;
        }
      )
    ]);
    // Add the pair of size adjusting buttons to the table.
    UHM.setTableRow(prefContents, [
      "&nbsp;&nbsp;&nbsp;",
      "&nbsp;&nbsp;&nbsp;",
      "<b>Adjust All Heights: </b>",
      buttons
    ]);
    // Create the header for the "Show" column.
    // Includes the "all_showPref" checkbox.
    const showHeader = UTIL.newFragment([
      UTIL.newElement(
        "INPUT#all_showPref",
        {
          name: "all_showPref",
          type: "checkbox"
        },
        null,
        function (el) {
          el.onchange = function () {
            startChange();
            thisTab.showAllBars();
          };
          return el;
        }
      ),
      UTIL.newElement("B", {}, UTIL.newElement("U", {}, "Show"))
    ]);
    // Add the header row to the table.
    UHM.setTableRow(prefContents, [
      "&nbsp;<u>" + "Covariate" + "</u>",
      "<b><u>" + "Position" + "</u></b>",
      showHeader,
      "<b><u>" + "Height" + "</u></b>"
    ]);
    // Add a row to the table of all covariates that pass the filter.
    const covariates = {
      row: UPM.heatMap.getRowClassificationConfig(),
      col: UPM.heatMap.getColClassificationConfig()
    };
    for (const { axis, key } of UPM.heatMap.genAllCovars()) {
      if (this.filterShow(key)) {
        this.addCovariateRow(prefContents, key, axis, covariates[axis][key]);
      }
    }
    allprefs.appendChild(prefContents);
    return allprefs;
  };

  CovariatesPrefsTab.prototype.addCovariateRow = function addCovariateRow(
    prefContents,
    key,
    axis,
    currentClassBar
  ) {
    const keyaxis = key + "_" + axis;
    const showPref = keyaxis + "_showPref";
    const colShow = UTIL.newElement(
      "INPUT.ngchm-upm-show-covariate",
      {
        id: showPref,
        name: showPref,
        type: "checkbox"
      },
      null,
      function (el) {
        if (currentClassBar.show == "Y") {
          el.checked = true;
        }
        return el;
      }
    );
    const heightPref = keyaxis + "_heightPref";
    const colHeight = UTIL.newElement("INPUT.ngchm-upm-input", {
      id: heightPref,
      name: heightPref,
      maxlength: 2,
      size: 2,
      value: currentClassBar.height
    });

    var displayName = key;
    if (key.length > 20) {
      displayName = key.substring(0, 17) + "...";
    }
    const tr = UHM.setTableRow(prefContents, [
      "&nbsp;&nbsp;" + displayName,
      UTIL.toTitleCase(axis),
      colShow,
      colHeight
    ]);
    tr.dataset.key = key;
    tr.dataset.axis = axis;
  };

  /**********************************************************************************
   * FUNCTION setupClassBreaks: Construct a covariatePrefPanel DIV that contains
   * information and preferences for a specific covariate (identified by key and axis).
   **********************************************************************************/
  function setupClassBreaks(key, axis, classBar) {
    // Must add axis to key when adding objects to DOM
    const keyaxis = key + "_" + axis;
    const colorMapMgr = UPM.heatMap.getColorMapManager();
    const colorMap = colorMapMgr.getColorMap(axis, key);

    // Create the covariatePrefPanel.
    const covariatePrefPanel = UTIL.newElement("DIV");
    covariatePrefPanel.id = "breakPrefs_" + keyaxis;

    // Create the bar type preferences for:
    // - axis (fixed)
    // - bar type (fixed: discrete or continuous)
    // - plot type (color plot vs bar/scatter plot)
    // For discrete covariates plot type is fixed (to color plot).
    // For continuous covariates: plot type can be changed.

    const barTypePrefs = TABLE.createTable({ columns: 3 });
    {
      barTypePrefs.addBlankSpace();
      barTypePrefs.addIndent();

      // Create fixed Axis: row.
      const breakpointsType = UTIL.toTitleCase(colorMap.getType());
      const barPlot = UTIL.toTitleCase(classBar.bar_type.replace("_", " "));
      barTypePrefs.addRow(["Axis:", UTIL.toTitleCase(axis)], {
        fontWeight: ["bold", "bold"]
      });

      barTypePrefs.addRow(["Covariate Type:", breakpointsType], {
        fontWeight: ["bold", "bold"]
      });
      barTypePrefs.addBlankSpace(2);

      if (breakpointsType === "Discrete") {
        // Fixed bar plot type.  Only color_plot.
        barTypePrefs.addRow(["Bar Type:", barPlot], {
          fontWeight: ["bold", "bold"]
        });
      } else {
        // Variable bar plot type: color_plot, bar_plot, or scatter_plot.
        const typeOptionsId = KAID(key, axis, "barTypePref");
        const typeOptionsSelect = UTIL.newElement(
          "SELECT",
          {
            id: typeOptionsId,
            name: typeOptionsId
          },
          [
            UTIL.newElement("OPTION", { value: "bar_plot" }, "Bar Plot"),
            UTIL.newElement("OPTION", { value: "color_plot" }, "Color Plot"),
            UTIL.newElement("OPTION", { value: "scatter_plot" }, "Scatter Plot")
          ],
          function (el) {
            el.onchange = function () {
              startChange();
              showPlotTypeProperties(key, axis);
            };
            el.value = "color_plot";
            return el;
          }
        );
        barTypePrefs.addRow(["Bar Type:", typeOptionsSelect]);
      }
      barTypePrefs.addBlankSpace();
    }

    const colorScheme = createColorMapInput(key, axis, colorMap);

    const presets = TABLE.createTable({ columns: 3 });
    PALETTES.addPredefinedPalettes(presets, key, setColorPrefsToPreset, axis, colorMap.getType());

    const colorPlotPrefs = UTIL.newElement("DIV");
    colorPlotPrefs.id = KAID(keyaxis, "breakPrefsCB");
    colorPlotPrefs.appendChild(colorScheme);
    colorPlotPrefs.appendChild(presets.content);

    const barScatterPlotPrefs = UTIL.newElement("DIV");
    barScatterPlotPrefs.id = KAID(keyaxis, "breakPrefsBB");
    var prefContentsBB = document.createElement("TABLE");
    UHM.setTableRow(prefContentsBB, [
      "&nbsp;&nbsp;Lower Bound:",
      createNumericInput(KAID(keyaxis, "lowBoundPref"), classBar.low_bound, 8, 10)
    ]);
    UHM.setTableRow(prefContentsBB, [
      "&nbsp;&nbsp;Upper Bound:",
      createNumericInput(KAID(keyaxis, "highBoundPref"), classBar.high_bound, 8, 10)
    ]);
    UHM.setTableRow(prefContentsBB, [
      "&nbsp;&nbsp;Foreground Color:",
      createColorInput(KAID(keyaxis, "fgColorPref"), classBar.fg_color)
    ]);
    UHM.setTableRow(prefContentsBB, [
      "&nbsp;&nbsp;Background Color:",
      createColorInput(KAID(keyaxis, "bgColorPref"), classBar.bg_color)
    ]);
    UHM.addBlankRow(prefContentsBB);
    barScatterPlotPrefs.appendChild(prefContentsBB);

    covariatePrefPanel.appendChild(barTypePrefs.content);
    covariatePrefPanel.appendChild(colorPlotPrefs);
    covariatePrefPanel.appendChild(barScatterPlotPrefs);
    if (classBar.bar_type === "color_plot") {
      barScatterPlotPrefs.style.display = "none";
      colorPlotPrefs.style.display = "block";
    } else {
      colorPlotPrefs.style.display = "none";
      barScatterPlotPrefs.style.display = "block";
    }
    return covariatePrefPanel;
  }

  // Create the preferences panel for the specified axis and covariate.
  // Append it to the covariate preferences tab.
  function addCovariatePrefs(axis, covariateName) {
    const bars = UPM.heatMap.getAxisCovariateConfig(axis);
    const breakPrefs = setupClassBreaks(covariateName, axis, bars[covariateName]);

    const classPrefs = document.getElementById("classPrefs");
    classPrefs.append(breakPrefs);
  }

  // Show the color plot options or the bar/scatter plot options for the
  // specified axis and covariate, depending on the value of the covariate's
  // barType preference.
  function showPlotTypeProperties(key, axis) {
    const bbDiv = KAE(key, axis, "breakPrefsBB"); // Color plot options.
    const cbDiv = KAE(key, axis, "breakPrefsCB"); // Bar and scatter plot options.
    if (KAE(key, axis, "barTypePref").value === "color_plot") {
      bbDiv.style.display = "none";
      cbDiv.style.display = "block";
    } else {
      cbDiv.style.display = "none";
      bbDiv.style.display = "block";
    }
  }

  /**********************************************************************************
   * METHOD CovariatesPrefsTab.showAllBars: Set the "Show" state of all filtered
   * covariate bars on the covariate bars tab of the user preferences dialog to
   * equal that of the "Show" checkbox in the table header.
   *
   * This method is called whenever the user changes the state of the "Show" checkbox
   * in the table header.
   *
   * These checkboxes are located on the DIV that is visible when the ALL entry of the
   * covariate dropdown is selected.
   *
   **********************************************************************************/
  CovariatesPrefsTab.prototype.showAllBars = function showAllBars() {
    const showAllBox = document.getElementById("all_showPref");
    const checkState = showAllBox.checked;

    for (const { axis, key } of UPM.heatMap.genAllCovars()) {
      if (this.filterShow(key)) {
        const showItem = document.getElementById(`${key}_${axis}_showPref`);
        showItem.checked = checkState;
      }
    }
  };

  // FUNCTION incrementAllHeights. Increment the height of all covariate bars, to a
  // maximum of 99.
  function incrementAllHeights() {
    for (const { axis, key } of UPM.heatMap.genAllCovars()) {
      const heightItem = document.getElementById(`${key}_${axis}_heightPref`);
      const value = parseInt(heightItem.value);
      // Increment if value < 99, limit maximum height to 99.
      if (value < 99) {
        heightItem.value = value + 1;
      }
    }
  }

  // FUNCTION decrementAllHeights. Decrement the height of all covariate bars, to a
  // minimum of 0.
  function decrementAllHeights() {
    for (const { axis, key } of UPM.heatMap.genAllCovars()) {
      const heightItem = document.getElementById(`${key}_${axis}_heightPref`);
      const value = parseInt(heightItem.value);
      // Decrement if value > 0, prevent negative values.
      if (value > 0) {
        heightItem.value = value - 1;
      }
    }
  }

  /**********************************************************************************
   * METHOD CovariatesPrefsTab.prepareView: sets the default view
   */
  CovariatesPrefsTab.prototype.prepareView = function () {
    this.filterVal = null;
    this.setShowAll();
  };

  CovariatesPrefsTab.prototype.prepareErrorView = function (errorMsg) {
    this.filterVal = null;
    // errorMsg[0] : covariate selector
    // errorMsg[3] : axis
    this.showClassBreak(errorMsg[0], errorMsg[3]); // Switch to the covariate view containing the error.
  };

  /**********************************************************************************
   * METHOD CovariatesPrefsTab.setShowAll: This function sets the condition of
   * the "show all" checkbox on the covariate bars tab of the user preferences dialog.
   * This checkbox is located on the DIV that is visible when the ALL entry of the
   * covariate dropdown is selected. If a user un-checks a single box in the list of
   * covariate bars, the show all box is un-checked. Conversely, if a user checks a box
   * resulting in all of the boxes being selected, the show all box will be checked.
   **********************************************************************************/
  CovariatesPrefsTab.prototype.setShowAll = function setShowAll() {
    let allChecked = true;
    for (const { axis, key } of UPM.heatMap.genAllCovars()) {
      if (this.filterShow(key)) {
        const showItem = document.getElementById(`${key}_${axis}_showPref`);
        if (!showItem) {
          console.error("setShowAll: showItem missing", { key, axis });
        } else if (!showItem.checked) {
          allChecked = false;
          break;
        }
      }
    }
    const showAllBox = document.getElementById("all_showPref");
    showAllBox.checked = allChecked;
  };

  /**********************************************************************************
   * METHOD - CovariatesPrefsTab.showClassBreak: The purpose of this function is to show the
   * appropriate classification bar panel based upon the user selection of the
   * covariate dropdown on the covariates tab of the preferences screen.  This
   * function is also called when an error is trappped, opening the covariate DIV
   * that contains the erroneous data entry.
   **********************************************************************************/
  CovariatesPrefsTab.prototype.showClassBreak = function showClassBreak(selClass, selAxis) {
    const classBtn = document.getElementById("classPref_list");
    if (typeof selClass != "undefined") {
      classBtn.value = selClass + (selAxis ? "_" + selAxis : "");
    }
    for (let i = 0; i < classBtn.length; i++) {
      if (isDummyCovariate(classBtn.options[i].value)) {
        // Dummy covariates do not have a corresponding DIV.
        continue;
      }
      const classVal = "breakPrefs_" + classBtn.options[i].value;
      const classDiv = document.getElementById(classVal);
      const classSel = classBtn.options[i].selected;
      if (classSel) {
        classDiv.style.display = "block";
      } else {
        classDiv.style.display = "none";
      }
    }
  };

  /**********************************************************************************
   * METHOD CovariatesPrefsTab.filterClassPrefs: The purpose of this function is to initiate the
   * process of filtering option choices for classifications. It is fired when either
   * the "Filter Covariates" or "Clear Filters" button is pressed on the covariates
   * preferences dialog.  The global filter value variable is set when filtering and
   * cleared when clearing and the editPreferences function is called to reload all
   * preferences.
   **********************************************************************************/
  CovariatesPrefsTab.prototype.filterClassPrefs = function filterClassPrefs() {
    this.showClassBreak("ALL");
    const filterButton = document.getElementById("all_searchPref_btn");
    const textSpan = filterButton.querySelector("span");
    if (!textSpan) return;
    const searchPrefSelect = document.getElementById("all_searchPref");
    if (filterButton.dataset.buttonStatus == "RemoveFilter") {
      // Button shows "Remove Filter".
      // - Clear search results.
      // - Reset button to "Filter covariates".
      delete filterButton.dataset.buttonStatus;
      textSpan.innerText = "Filter covariates";
      searchPrefSelect.value = "";
      this.filterVal = null;
    } else {
      // Button shows "Filter covariates".
      // - Filter covariates.
      // - Change button to "Remove Filter".
      const searchPrefVal = searchPrefSelect.value;
      if (searchPrefVal != "") {
        this.filterVal = searchPrefVal;
        filterButton.dataset.buttonStatus = "RemoveFilter";
        textSpan.innerText = "Remove filter";
      }
    }
    const hiddenItems = this.addClassPrefOptions();
    filterAllClassesTable(hiddenItems);
    this.showClassBreak("ALL");
  };

  /**********************************************************************************
   * FUNCTION filterAllClassesTable: make the visibility of the covariates in
   * the table of all covariates match those that pass the covariate filter.
   *
   * hiddenItems contains those covariates that did not pass the filter.
   * - it includes two arrays, one for each axis. Each array contains the
   *   hidden keys for that axis.
   *
   * Note: only those rows in tableAllClasses that have the axis and key dataset properties
   * contain covariates. Other rows contain headers, spacing, etc. and are always visible.
   *
   **********************************************************************************/
  function filterAllClassesTable(hiddenItems) {
    const table = document.getElementById("tableAllClasses");
    for (let i = 0; i < table.rows.length; i++) {
      const row = table.rows[i];
      const hidden = row.dataset.axis && hiddenItems[row.dataset.axis].includes(row.dataset.key);
      if (hidden) {
        row.classList.add("hide");
      } else {
        row.classList.remove("hide");
      }
    }
  }

  /**********************************************************************************
   * FUNCTION addClassPrefOptions: The purpose of this function is to assign option
   * values to the Covariates dropdown control on the Covariates preferences tab.  All
   * covariates will be loaded at startup.  The filter control, however, is used to
   * limit the visible options in this dropdown.  This function returns a string
   * array containing a list of all options that are NOT being displayed.  This list
   * is used to hide rows on the ALL covariates panel.
   **********************************************************************************/
  CovariatesPrefsTab.prototype.addClassPrefOptions = function addClassPrefOptions() {
    // Empty covariate dropdown.
    const classSelect = document.getElementById("classPref_list");
    classSelect.options.length = 0;

    // Initialize the lists of hidden covariates to return.
    const hiddenOpts = {
      row: new Array(),
      col: new Array()
    };

    // Add an ALL option if there's at least one covariate bar.
    if (this.hasClasses) {
      classSelect.options[classSelect.options.length] = new Option("ALL", "ALL");
    }

    // Add entries for creating new covariates.
    // Moving a covariate between axes will be, in general:
    // - very large and complex to implement, and
    // - probably of very little practical utility.
    // So, we won't provide that capability.
    // So, the user has to create new covariate bars on the appropriate
    // axis.
    if (flagNewCovars) {
      classSelect.options[classSelect.options.length] = new Option(
        "Add new row covariate",
        "NEW-row",
      );
      classSelect.options[classSelect.options.length] = new Option(
        "Add new column covariate",
        "NEW-col",
      );
    }

    // Add options for every covariate that passes the filter.
    // Add covariates that don't pass the filter to hiddenOpts.
    //
    if (this.hasClasses) {
      for (const { axis, key } of UPM.heatMap.genAllCovars()) {
        if (this.filterShow(key)) {
          const displayName = key.length <= 20 ? key : key.substring(0, 17) + "...";
          classSelect.options[classSelect.options.length] = new Option(
            displayName,
            key + "_" + axis
          );
        } else {
          hiddenOpts[axis].push(key);
        }
        const barTypeEl = KAE_OPT(key, axis, "barTypePref");
        if (barTypeEl) {
          const classBars = UPM.heatMap.getAxisConfig(axis).classifications;
          barTypeEl.value = classBars[key].bar_type;
        }
      }
    }
    return hiddenOpts;
  };

  /**********************************************************************************
   * FUNCTION filterShow: The purpose of this function is to determine whether a
   * given covariates bar is to be shown given the state of the covariates filter
   * search text box.
   **********************************************************************************/
  CovariatesPrefsTab.prototype.filterShow = function filterShow(key) {
    if (this.filterVal == null) {
      // Show all bars if no filter.
      return true;
    }
    return key.toLowerCase().indexOf(this.filterVal.toLowerCase()) >= 0;
  };

  // METHOD CovariatesPrefsTab.validateTab: Validate Covariate Bar Preferences.
  //
  CovariatesPrefsTab.prototype.validateTab = function validateCovariatesTab() {
    return validateAxis("row") || validateAxis("col");

    // Helper functions.

    // Validate one axis.
    function validateAxis(axis) {
      const covBars = UPM.heatMap.getAxisCovariateConfig(axis);
      let errorMsg = prefsValidateForNumeric(axis, covBars);
      if (errorMsg != null) return errorMsg;
      for (let [key, config] of Object.entries(covBars)) {
        if (config.color_map.type == "continuous") {
          errorMsg = prefsValidateBreakPoints(axis, key, "classPrefs");
          if (errorMsg != null) return errorMsg;
        }
      }
      return null;
    }

    /**********************************************************************************
     * FUNCTION prefsValidateInputBoxs: Validate all user text input boxes that
     * require positive numeric values.
     **********************************************************************************/
    function prefsValidateForNumeric(axis, axisClassBars) {
      for (let key in axisClassBars) {
        const keyaxis = key + "_" + axis;
        const heightPref = parseInt(KAE(keyaxis, "heightPref").value);
        if (isNaN(heightPref) || heightPref < 0 || heightPref > 100) {
          return ["ALL", "classPrefs", "ERROR: Bar heights must be between 0 and 100"];
        }
        const barType = KAE_OPT(keyaxis, "barTypePref");
        if (barType !== null && barType.value !== "color_plot") {
          const lowBoundElement = KAE(keyaxis, "lowBoundPref");
          if (isNaN(lowBoundElement.value)) {
            return [keyaxis, "classPrefs", "ERROR: Covariate bar low bound must be numeric"];
          }
          const highBoundElement = KAE(keyaxis, "highBoundPref");
          if (isNaN(highBoundElement.value)) {
            return [keyaxis, "classPrefs", "ERROR: Covariate bar high bound must be numeric"];
          }
          const bgColorElement = KAE(keyaxis, "bgColorPref");
          const fgColorElement = KAE(keyaxis, "fgColorPref");
          if (bgColorElement.value === fgColorElement.value) {
            return [
              keyaxis,
              "classPrefs",
              "ERROR: Duplicate foreground and background colors found"
            ];
          }
        }
      }
      return null;
    }
  };

  CovariatesPrefsTab.prototype.resetTabPrefs = function resetCovariateTabPrefs(resetVal) {
    // Reset the Covariate preference items.
    for (const axis of ["row", "col"]) {
      const axisSavedCovariate = resetVal[axis + "Config"].classifications;
      for (let key in axisSavedCovariate) {
        const bar = axisSavedCovariate[key];
        KAE(key, axis, "showPref").checked = bar.show == "Y";
        KAE(key, axis, "heightPref").value = bar.height;
        KAE(key, axis, "missing_colorPref").value = bar.color_map.missing;

        if (bar.color_map.type == "discrete") {
          for (let i = 0; i < bar.color_map.colors.length; i++) {
            getColorPrefElement(key, axis, i).value = bar.color_map.colors[i];
          }
        } else {
          KAE(key, axis, "barTypePref").value = bar.bar_type;
          showPlotTypeProperties(key, axis);
          if (["bar_plot", "scatter_plot"].includes(bar.bar_type)) {
            KAE(key, axis, "lowBoundPref").value = bar.low_bound;
            KAE(key, axis, "highBoundPref").value = bar.high_bound;
            KAE(key, axis, "fgColorPref").value = bar.fg_color;
            KAE(key, axis, "bgColorPref").value = bar.bg_color;
          } else {
            // It's a continuous color_plot.
            updateRequiredBreakPoints();
            removeExcessBreakPoints();
          }
          // Helper function.
          function updateRequiredBreakPoints() {
            for (let i = 0; i < bar.color_map.colors.length; i++) {
              const el = getColorPrefElement(key, axis, i);
              if (el && !el.classList.contains("ngchm-upm-last-breakpoint")) {
                // Set value and color of existing breakpoints.
                el.value = bar.color_map.colors[i];
                getBreakPrefElement(key, axis, i).value = bar.color_map.thresholds[i];
              } else {
                // If the user deleted one or more breakpoints, we need to recreate them.
                const scheme = getColorScheme(axis, key);
                scheme.setInsertPosn(scheme.findInsertPoint());
                scheme.addBreakpoint(i, bar.color_map.thresholds[i], bar.color_map.colors[i], true);
              }
            }
          }
          // Helper function.
          function removeExcessBreakPoints() {
            // Excess breakpoints can be caused by adding breakpoints before clicking reset.
            for (let i = bar.color_map.colors.length; ; i++) {
              let el = getColorPrefElement(key, axis, i);
              if (!el || el.classList.contains("ngchm-upm-last-breakpoint")) break;
              while (el.tagName != "TR") {
                el = el.parentElement;
              }
              el.remove();
            }
          }
        }
      }
    }
  };

  // METHOD CovariatesPrefsTab.applyTabPrefs: Apply Covariate Bar Preferences.
  //
  CovariatesPrefsTab.prototype.applyTabPrefs = function applyCovariatesPrefs() {
    const colorMapMan = UPM.heatMap.getColorMapManager();
    for (const { axis, key } of UPM.heatMap.genAllCovars()) {
      const showElement = KAE(key, axis, "showPref");
      const heightElement = KAE(key, axis, "heightPref");
      if (debug || debugCovars)
        console.log("applyTabPrefs: ", {
          key,
          axis,
          show: showElement.value,
          height: heightElement.value,
          type: colorMapMan.getColorMap(axis, key).getType()
        });
      if (heightElement.value === "0") {
        showElement.checked = false;
      }
      UPM.heatMap.setClassificationPrefs(key, axis, showElement.checked, heightElement.value);
      if (colorMapMan.getColorMap(axis, key).getType() === "continuous") {
        UPM.heatMap.setClassBarScatterPrefs(
          key,
          axis,
          KAE(key, axis, "barTypePref").value,
          KAE(key, axis, "lowBoundPref").value,
          KAE(key, axis, "highBoundPref").value,
          KAE(key, axis, "fgColorPref").value,
          KAE(key, axis, "bgColorPref").value
        );
      }
      prefsApplyBreaks(key, axis);
    }
  };

  // Helper FUNCTION KAE: Return the "Key-Axis Element" whose id consists of
  // the specified parts, joined by underscores.
  // `
  // For example, KAE("key","axis","name") returns the DOM element whose id
  // is "key_axis_name".
  //
  // It was created to simplify access to document elements with structured names.
  // Originally, it was just for elements consisting of a key, an axis, and a name,
  // but it now works for any ID structured into parts separated by underscores.
  //
  // This function also checks that the requested element actually exists and throws
  // an error if it doesn't.
  function KAE(...parts) {
    const id = parts.join("_");
    const el = document.getElementById(id);
    if (el) return el;
    console.error("KAE: Could not find element " + id);
    throw new Error("KAE: Could not find element " + id);
  }
  // Like KAE, but just return null if no such element. The caller is expected
  // to handle a null return.
  function KAE_OPT(...parts) {
    const id = parts.join("_");
    return document.getElementById(id);
  }
  // Just return the "Key-Axis" Id.
  function KAID(...parts) {
    return parts.join("_");
  }

  /*===================================================================================
   *  CLASS MapInfoTab - Implements a tab containing summary information about the map.
   *
   =================================================================================*/

  function MapInfoTab() {
    PreferencesTab.call(this, "prefMapInfo_btn", "infoPrefs");
  }
  MapInfoTab.prototype.setupTab = function setupMapInfoTab() {
    const mapInfo = UPM.heatMap.getMapInformation();
    const mapInfoPrefs = document.getElementById("infoPrefs");
    const prefContents = document.createElement("TABLE");

    const totalRows = UPM.heatMap.getTotalRows() - mapInfo.map_cut_rows;
    const totalCols = UPM.heatMap.getTotalCols() - mapInfo.map_cut_cols;

    UHM.setTableRowX(prefContents, ["ABOUT:"], ["header"], [{ colSpan: 2 }]);
    UHM.setTableRowX(prefContents, ["Name:", mapInfo.name]);
    UHM.setTableRowX(prefContents, ["Size:", totalRows + " rows by " + totalCols + " columns"]);
    UHM.setTableRowX(prefContents, ["Description:", mapInfo.description]);
    UHM.setTableRowX(prefContents, ["Build time:", mapInfo.attributes["chm.info.build.time"]]);
    UHM.setTableRowX(prefContents, ["Read Only:", mapInfo.read_only]);

    UHM.setTableRowX(prefContents, ["VERSIONS:"], ["header"], [{ colSpan: 2 }]);
    UHM.setTableRowX(prefContents, ["Viewer Version:", COMPAT.version]);
    UHM.setTableRowX(prefContents, ["Map Version:", mapInfo.version_id]);
    UHM.setTableRowX(prefContents, ["Builder Version:", mapInfo.builder_version]);

    UHM.setTableRowX(prefContents, ["LAYERS:"], ["header"], [{ colSpan: 2 }]);
    for (let dl in mapInfo.data_layer) {
      UHM.setTableRowX(prefContents, [dl + ":", mapInfo.data_layer[dl].name]);
    }

    UHM.setTableRowX(prefContents, ["ATTRIBUTES:"], ["header"], [{ colSpan: 2 }]);
    const omit = [/^chm/, /^!/];
    const pass = [/^chm.info.external.url/, /^!extraparam/];
    for (let attr in mapInfo.attributes) {
      if (!matchAny(attr, omit) || matchAny(attr, pass)) {
        let attrVal = mapInfo.attributes[attr];
        if (/.external.url/.test(attr)) {
          attrVal = UTIL.newElement("A", { href: attrVal, target: "_blank" }, [attrVal]);
        }
        UHM.setTableRowX(prefContents, [attr + ":", attrVal]);
      }
    }

    UHM.addBlankRow(prefContents, 2);
    mapInfoPrefs.appendChild(prefContents);

    return mapInfoPrefs;

    // Helper function.
    // Return true iff str matches any regexp in regExpArray.
    function matchAny(str, regExpArray) {
      for (let regExp of regExpArray) {
        if (regExp.test(str)) return true;
      }
      return false;
    }
  };
  MapInfoTab.prototype.validateTab = function () {
    // Nothing to validate.
    return null;
  };
  MapInfoTab.prototype.resetTabPrefs = function resetInfoTabPrefs() {
    // Nothing to reset.
  };

  MapInfoTab.prototype.applyTabPrefs = function () {
    // Nothing to update.
  };
  MapInfoTab.prototype.prepareView = function () {
    // Nothing to do.
  };

  /**********************************************************************************
   * CLASS RowsColsTab - A tab for all row & column preferences.
   *
   * Two sections are presented, one for rows and the other for cols.
   *
   * Informational data begins each section and properties for modifying the
   * appearance of row/col dendograms appear at the end.
   **********************************************************************************/
  function RowsColsTab() {
    PreferencesTab.call(this, "prefRowsCols_btn", "rowsColsPrefs");
  }
  RowsColsTab.prototype.prepareView = function () {
    this.showDendroSelections();
    showLabelSelections();
  };
  RowsColsTab.prototype.setupTab = function setupRowsColsTab() {
    const rowcolprefs = document.getElementById("rowsColsPrefs");
    const prefContents = document.createElement("TABLE");

    const mapInfo = UPM.heatMap.getMapInformation();
    const dendroHeightOptions =
      "<option value='50'>50%</option><option value='75'>75%</option><option value='100'>100%</option><option value='125'>125%</option><option value='150'>150%</option><option value='200'>200%</option>";
    for (const axis of ["row", "col"]) {
      const camelAxis = axis == "row" ? "Row" : "Column";
      UHM.addBlankRow(prefContents);
      UHM.setTableRow(prefContents, [camelAxis.toUpperCase() + " INFORMATION:"], 3);
      const axisConfig = UPM.heatMap.getAxisConfig(axis);
      const axisOrganization = axisConfig.organization;
      const axisOrder = axisOrganization["order_method"];
      const totalElements =
        UPM.heatMap.getTotalElementsForAxis(axis) - mapInfo["map_cut_" + axis + "s"];
      UHM.setTableRow(prefContents, [`&nbsp;&nbsp;Total ${camelAxis}s:`, totalElements]);
      addLabelTypeInputs(prefContents, UPM.heatMap, axis);
      UHM.setTableRow(prefContents, ["&nbsp;&nbsp;Ordering Method:", axisOrder]);
      if (axisOrder === "Hierarchical") {
        UHM.setTableRow(prefContents, [
          "&nbsp;&nbsp;Agglomeration Method:",
          axisOrganization["agglomeration_method"]
        ]);
        UHM.setTableRow(prefContents, [
          "&nbsp;&nbsp;Distance Metric:",
          axisOrganization["distance_metric"]
        ]);
        const dendroShowSelect = UTIL.newElement(
          "SELECT.ngchm-upm-input",
          { name: axis + "_DendroShowPref", id: axis + "_DendroShowPref" },
          dendroShowOptions(),
          function (el) {
            el.dataset.axis = axis;
            return el;
          }
        );
        UHM.setTableRow(prefContents, ["&nbsp;&nbsp;Show Dendrogram:", dendroShowSelect]);
        const dendroHeightSelect =
          `<select class='ngchm-upm-input' name='${axis}_DendroHeightPref' id='${axis}_DendroHeightPref'>` +
          dendroHeightOptions +
          "</select>";
        UHM.setTableRow(prefContents, ["&nbsp;&nbsp;Dendrogram Height:", dendroHeightSelect]);
      }
      UHM.setTableRow(prefContents, [
        "&nbsp;&nbsp;Maximum Label Length:",
        genLabelSizeSelect(axis)
      ]);
      UHM.setTableRow(prefContents, [
        "&nbsp;&nbsp;Trim Label Text From:",
        genLabelAbbrevSelect(axis)
      ]);

      addTopItemsSelector(prefContents, axis, camelAxis + "s");
      UHM.addBlankRow(prefContents);
    }

    rowcolprefs.appendChild(prefContents);

    this.tabDiv.addEventListener("change", (ev) => {
      if (debug || debugEvents) console.log("RowsColsTab: Change handler", { target: ev.target });
      for (const target of tabTargetGen(ev)) {
        if (["row_DendroShowPref", "col_DendroShowPref"].includes(target.id)) {
          startChange();
          dendroShowChange(target.dataset.axis);
        } else if (target.id == KAID("row", "TopItems")) {
          startChange();
          KAE("row", "TopItemsTextRow").style.display =
            KAE("row", "TopItems").value == "--text-entry--" ? "" : "none";
        } else if (target.id == KAID("col", "TopItems")) {
          startChange();
          KAE("col", "TopItemsTextRow").style.display =
            KAE("col", "TopItems").value == "--text-entry--" ? "" : "none";
        } else if (target.classList.contains("ngchm-upm-input")) {
          startChange();
          break;
        }
      }
    });

    return rowcolprefs;

    // ------------------------------------------------------------------------
    // Helper functions.

    function addTopItemsSelector(prefContents, axis, pluralAxisName) {
      const axisConfig = UPM.heatMap.getAxisConfig(axis);
      const covars = UPM.heatMap.getAxisCovariateConfig(axis, {
        type: "continuous"
      });
      const covarNames = Object.keys(covars);
      const selector = UTIL.newSelect(
        ["", "--text-entry--"].concat(covarNames), // Values
        ["Not Selected", "Manual Entry"].concat(covarNames) // Option texts
      );
      selector.id = KAID(axis, "TopItems");
      selector.classList.add("ngchm-upm-input");
      selector.value = axisConfig.top_items_cv;
      UHM.setTableRow(prefContents, [`&nbsp;&nbsp;Top ${pluralAxisName}:`, selector]);
      const id = KAID(axis, "TopItemsText");
      const topItemsText = UTIL.newElement("TEXTAREA.ngchm-upm-input.ngchm-upm-top-items-text", {
        id: id,
        name: id,
        rows: 3
      });
      topItemsText.value = axisConfig.top_items;
      const tr = UHM.setTableRow(prefContents, [
        `&nbsp;&nbsp;Top ${pluralAxisName} Input:`,
        topItemsText
      ]);
      tr.id = KAID(axis, "TopItemsTextRow");
      tr.style.display = selector.value == "--text-entry--" ? "" : "none";
    }

    function dendroShowOptions() {
      return [
        UTIL.newElement("OPTION", { value: "ALL" }, "Summary and Detail"),
        UTIL.newElement("OPTION", { value: "SUMMARY" }, "Summary Only"),
        UTIL.newElement("OPTION", { value: "NONE" }, "Hide")
      ];
    }

    function genLabelSizeSelect(axis) {
      const sizes = [10, 15, 20, 25, 30, 35, 40];
      const id = KAID(axis, "LabelSizePref");
      const sizeInput = UTIL.newElement("INPUT.ngchm-upm-input", {
        type: "number",
        id: id,
        name: id,
        min: 10,
        max: 99
      });
      return sizeInput;
    }
    function genLabelAbbrevSelect(axis) {
      return (
        `<select class='ngchm-upm-input' name='${axis}_LabelAbbrevPref' id='${axis}_LabelAbbrevPref'>` +
        "<option value='START'>Beginning</option><option value='MIDDLE'>Middle</option><option value='END'>End</option>" +
        "</select>"
      );
    }
  };

  // Add Label Type rows for the specified axis of heatMap to the userPreferencesTable.
  function addLabelTypeInputs(userPreferencesTable, heatMap, axisName) {
    axisName = MMGR.isRow(axisName) ? "Row" : "Col";
    const axisTypes = heatMap.getLabelTypes(axisName);
    axisTypes.forEach((type, idx) => {
      const idbase = `upm_${axisName}_label_part_${idx}`;
      const typeInput = UTIL.newElement("INPUT.ngchm-upm-input.upm_label_type", {
        type: "text",
        name: idbase + "_type",
        id: idbase + "_type",
        value: type.type
      });
      const showType = UTIL.newElement("INPUT.ngchm-upm-input", {
        type: "checkbox",
        name: idbase + "_show",
        id: idbase + "_show"
      });
      showType.checked = type.visible;
      UHM.setTableRow(userPreferencesTable, [
        idx == 0 ? "&nbsp;&nbsp;Labels Type(s):" : "",
        typeInput,
        showType
      ]);
    });
  }

  // Reset the label type inputs to the values in savedLabelTypes.
  function resetLabelTypeInputs(axisName, savedLabelTypes) {
    axisName = MMGR.isRow(axisName) ? "Row" : "Col";
    savedLabelTypes.forEach((type, idx) => {
      const idbase = `upm_${axisName}_label_part_${idx}`;
      const typeInput = KAE(idbase, "type");
      typeInput.value = type.type;
      const checkBox = KAE(idbase, "show");
      checkBox.checked = type.visible;
    });
  }

  RowsColsTab.prototype.validateTab = function validateRowsColsTab() {
    for (const axis of ["row", "col"]) {
      let errorMsg = validateLabelTypeInputs(axis);
      if (errorMsg) return errorMsg;
      const sizePref = KAE(axis, "LabelSizePref").value;
      if (sizePref < 10) {
        return ["ALL", "rowsColsPrefs", `ERROR: ${axis} label size too small (min: 10)`];
      }
      if (sizePref > 99) {
        return ["ALL", "rowsColsPrefs", `ERROR: ${axis} label size too large (max: 99)`];
      }
    }
    return null;

    // ------------------------------------------------------------------------
    // Helper functions.

    // Validate the label type inputs for the specified axis.
    // Returns null if the label type inputs pass all checks.
    // Returns an error message with relevant details if at least one check fails.
    function validateLabelTypeInputs(axisName) {
      axisName = MMGR.isRow(axisName) ? "Row" : "Col";
      const axisLabelTypes = UPM.heatMap.getLabelTypes(axisName);
      let foundEmpty = false;
      const checkedParts = axisLabelTypes.filter((type, idx) => {
        const idbase = `upm_${axisName}_label_part_${idx}`;
        if (KAE(idbase, "type").value == "") {
          foundEmpty = true;
        }
        return KAE(idbase, "show").checked;
      });
      let errMsg = "";
      if (foundEmpty) errMsg += " None can be empty.";
      if (checkedParts.length == 0) errMsg += " At least one must be visible.";
      if (errMsg) {
        return ["ALL", "rowsColsPrefs", `ERROR: ${axisName} types: ${errMsg}`];
      }
      return null;
    }
  };

  RowsColsTab.prototype.resetTabPrefs = function resetRowsColsTabPrefs(resetVal) {
    // Reset the Row/Col preference items.
    for (const axis of ["row", "col"]) {
      resetLabelTypeInputs(axis, resetVal[axis + "LabelTypes"]);
      const axisResetVal = resetVal[axis + "Config"];
      // Reset dendrogram options.
      if (KAE_OPT(axis, "DendroShowPref") !== null) {
        const dendroSaveVals = axisResetVal.dendrogram;
        KAE(axis, "DendroShowPref").value = dendroSaveVals.show;
        KAE(axis, "DendroHeightPref").value = dendroSaveVals.height;
        dendroShowChange(axis);
      }
      // Reset axis label options.
      KAE(axis, "LabelSizePref").value = axisResetVal.label_display_length;
      KAE(axis, "LabelAbbrevPref").value = axisResetVal.label_display_method;
      KAE(axis, "TopItems").value = axisResetVal.top_items_cv;
      KAE(axis, "TopItemsText").value = axisResetVal.top_items;
      KAE(axis, "TopItemsTextRow").style.display =
        axisResetVal.top_items_cv == "--text-entry--" ? "" : "none";
    }
  };

  RowsColsTab.prototype.applyTabPrefs = function applyRowsColsPrefs() {
    // Apply the Row/Col preference items.
    for (const axis of ["row", "col"]) {
      const axisConfig = UPM.heatMap.getAxisConfig(axis);
      // Label type preferences.
      applyLabelTypeInputs(axis);
      // Dendrogram preferences.
      if (axisConfig.organization.order_method === "Hierarchical") {
        axisConfig.dendrogram.show = KAE(axis, "DendroShowPref").value;
        axisConfig.dendrogram.height = KAE(axis, "DendroHeightPref").value;
      }
      // Apply Label Sizing Preferences.
      axisConfig.label_display_length = KAE(axis, "LabelSizePref").value;
      axisConfig.label_display_method = KAE(axis, "LabelAbbrevPref").value;
      // Top items preferences.
      axisConfig.top_items_cv = KAE(axis, "TopItems").value;
      axisConfig.top_items = [];
      for (const item of KAE(axis, "TopItemsText").value.split(/[;, \r\n]+/)) {
        if (item !== "") {
          axisConfig.top_items.push(item);
        }
      }
    }

    // ------------------------------------------------------------------------
    // Helper functions.

    // Saves the values of the label type inputs for the specified axis to heatMap.
    // Only call this function if validateLabelTypeInputs has been called and no
    // issues were found.
    function applyLabelTypeInputs(axisName) {
      axisName = MMGR.isRow(axisName) ? "Row" : "Col";
      const axisLabelTypes = UPM.heatMap.getLabelTypes(axisName);
      axisLabelTypes.forEach((type, idx) => {
        const idbase = `upm_${axisName}_label_part_${idx}`;
        type.type = KAE(idbase, "type").value;
        type.visible = KAE(idbase, "show").checked;
      });
      UPM.heatMap.setLabelTypes(axisName, axisLabelTypes);
    }
  };

  /**********************************************************************************
   * FUNCTION showDendroSelections: The purpose of this function is to set the
   * states of the row/column dendrogram show and height preferences.
   **********************************************************************************/
  RowsColsTab.prototype.showDendroSelections = function showDendroSelections() {
    for (const axis of ["row", "col"]) {
      const axisConfig = UPM.heatMap.getAxisConfig(axis);
      const rowOrder = axisConfig.organization.order_method;
      if (rowOrder === "Hierarchical") {
        const dendroShowVal = axisConfig.dendrogram.show;
        KAE(axis, "DendroShowPref").value = dendroShowVal;
        const heightPref = KAE(axis, "DendroHeightPref");
        if (dendroShowVal === "NONE") {
          const opt = heightPref.options[6]; // options[6] is what the NA option below becomes.
          if (typeof opt != "undefined") {
            heightPref.options[6].remove();
          }
          const option = document.createElement("option");
          option.text = "NA";
          option.value = "10";
          heightPref.add(option);
          heightPref.disabled = true;
          heightPref.value = option.value;
        } else {
          heightPref.value = axisConfig.dendrogram.height;
        }
      }
    }
  };

  /**********************************************************************************
   * FUNCTION showLabelSelections: Set the label length and truncation preferences.
   **********************************************************************************/
  function showLabelSelections() {
    for (const axis of ["row", "col"]) {
      const axisConfig = UPM.heatMap.getAxisConfig(axis);
      KAE(axis, "LabelSizePref").value = axisConfig.label_display_length;
      KAE(axis, "LabelAbbrevPref").value = axisConfig.label_display_method;
    }
  }

  /**********************************************************************************
   * FUNCTION dendroShowChange(axis): This function responds to change event on the
   * row/column show dendrogram dropdowns.
   * - If the change is to Hide, the dendro height is set to 10 and the dropdown disabled.
   * - If the change is to one of the 2 Show options AND was previously Hide, set height
   *   to the default value of 100 and enable the dropdown.
   **********************************************************************************/
  function dendroShowChange(axis) {
    const newValue = KAE(axis, "DendroShowPref").value;
    const heightPref = KAE(axis, "DendroHeightPref");
    if (newValue === "NONE") {
      // Append an NA option (becomes options[6]) to the height-pref dropdown.
      const option = document.createElement("option");
      option.text = "NA";
      option.value = "10";
      heightPref.add(option);
      heightPref.value = "10";
      heightPref.disabled = true;
    } else if (heightPref.disabled) {
      const opt = heightPref.options[6]; // options[6] is what the NA element becomes.
      if (typeof opt != "undefined") {
        heightPref.options[6].remove();
      }
      heightPref.value = "100";
      heightPref.disabled = false;
    }
  }

  // Create a color input with the given id and initial color.
  function createColorInput(id, color) {
    const input = `<input class='spectrumColor' type='color' name='${id}' id='${id}' value='${color}'>`;
    return input;
  }

  // Create a checkbox input with the given id and initial checked state.
  function createCheckBox(id, checked) {
    checked = checked ? "checked" : "";
    return `<input class='ngchm-upm-input' name='${id}' id='${id}' type='checkbox' ${checked}>`;
  }

  // Create a numeric input with the given id, initial value, size, and maximum length.
  function createNumericInput(id, value, size, maxlength) {
    if (!size) size = 8;
    if (!maxlength) maxlength = size;
    return `<input class='ngchm-upm-input' name='${id}' id='${id}' value='${value}' maxlength='${maxlength}' size='${size}'>`;
  }

  /**********************************************************************************
   * The following functions implement color scheme inputs. Color scheme inputs are
   * included in the preferences DIV for each layer in the mapLayersTab and in each
   * covariate preferences DIV in the covariatesPrefsTab.
   *
   * Color scheme inputs are implemented as three-column tables (breakpoint/category,
   * color, and control buttons) wrapped in a DIV.ngchm-upm-color-scheme.
   *
   * A colors scheme table consists of a header row, zero or more breakpoint rows, and
   * a missing color row.
   * - continuous color schemes allow breakpoints to be added or removed (if more than two).
   * - discrete color schemes currently do not.
   *
   * Changes to a (continuous) color scheme may involve the addition or removal of
   * breakpoints, either during editing or when resetting preferences.
   *
   * Class ColorSchemeTable is used to manage the three-column preferences tables. It is
   * a subclass of TABLES.Table.  It adds the color scheme's "key" (data layer/covariate)
   * and "axis" to the table's state, and includes specialized methods for adding
   * breakpoints to the table and removing them.
   *
   **********************************************************************************/

  // CLASS ColorSchemeTable
  //
  class ColorSchemeTable extends TABLE.Table {
    constructor (axis, key, content) {
      super({ columns: 3 }, content);
      this.axis = axis;
      this.key = key;
      this.addIndent();
    }
  }

  // Create a new colorSchemeTable and TABLE element for the specified axis and key.
  function createColorScheme(axis, key) {
    const table = new ColorSchemeTable(axis, key);
    table.content.id = KAID("colorSchemeTable", axis, key);
    table.content.style.width = "fit-content";
    return table;
  }

  // Create a new colorSchemeTable for the specified axis and key to manage an existing
  // TABLE element.
  function getColorScheme(axis, key) {
    return new ColorSchemeTable(axis, key, KAE("colorSchemeTable", axis, key));
  }

  // Create a new ColorMapInput for the specified key and axis, initialized by the
  // provided colorMap.  Returns the DIV.ngchm-upm-color-scheme that wraps the
  // TABLE element.
  //
  // Classes on the table rows (...-colorscheme-heading, ...-breakpoint, and ...-missing-breakpoint)
  // can be used via CSS to control presentation.
  //
  function createColorMapInput(key, axis, colorMap) {
    if (debug || debugColors) {
      console.log("createColorMapInput", { key, axis });
    }
    // Create the colorSchemeDIV and enclosed TABLE element.
    const colorSchemeDiv = UTIL.newElement("DIV.ngchm-upm-color-scheme");
    const colorScheme = createColorScheme(axis, key);
    colorSchemeDiv.appendChild(colorScheme.content);

    // Determine if we are making a discrete or continuous color scheme.
    const isDiscrete = colorMap.getType() === "discrete";

    // Add the color table heading (of class ngchm-upm-colorscheme-heading).
    const head = colorScheme.addRow([isDiscrete ? "Category" : "Breakpoint", "Color", ""], {
      underline: [true, true, false],
      fontWeight: ["bold", "bold", ""]
    });
    head.classList.add("ngchm-upm-colorscheme-heading");

    // Add the breakpoint rows.
    if (isDiscrete) {
      // My current thoughts are that this will become much more
      // similar to the continuous case.
      colorScheme.addIndent();
      const thresholds = colorMap.getThresholds();
      const colors = colorMap.getColors();
      for (let j = 0; j < thresholds.length; j++) {
        colorScheme.addRow([
          thresholds[j],
          createColorInput(getColorPrefId(key, axis, j), colors[j])
        ]);
      }
      colorScheme.popIndent();
    } else {
      colorScheme.fillContinuousColorTable(colorMap);
    }

    // Add the missing color row (of class ngchm-upm-missing-breakpoint).
    const missing = colorScheme.addRow([
      "Missing:",
      createColorInput(KAID(key, axis, "missing", "colorPref"), colorMap.getMissingColor())
    ]);
    missing.classList.add("ngchm-upm-missing-breakpoint");

    return colorSchemeDiv;
  }

  // Set the missing color preference for the current colorScheme to the
  // specified color.
  ColorSchemeTable.prototype.setMissingColor = function setMissingColor(color) {
    KAE(this.key, this.axis, "missing", "colorPref").value = color;
  };

  // For a continuous color table, remove any existing breakpoints, and insert
  // breakpoints for all the breakpoints in the specified colorMap.
  ColorSchemeTable.prototype.fillContinuousColorTable = fillContinuousColorTable;
  function fillContinuousColorTable(colorMap) {
    const thresholds =
      colorMap instanceof CMM.ColorMap ? colorMap.getThresholds() : colorMap.thresholds;
    const colors = colorMap instanceof CMM.ColorMap ? colorMap.getColors() : colorMap.colors;
    // Remove any existing breakpoints (excluding the "missing" breakpoint).
    this.removeBreakpoints();
    // Set where to insert the new breakpoints.
    this.setInsertPosn(this.findInsertPoint());
    // The new breakpoints can be deleted only if there are more than 2.
    const deleteAble = thresholds.length > 2;
    // Add the new breakpoints.
    if (debug || debugColors) {
      console.log("fillContinuousColorTable", {
        colorMap,
        thresholds,
        colors,
        deleteAble
      });
    }
    for (let j = 0; j < thresholds.length; j++) {
      this.addBreakpoint(j, thresholds[j], colors[j], deleteAble);
    }
    // Append a blank "breakpoint" with just an add button after all the actual breakpoints.
    // Mark it with class ngchm-upm-last-breakpoint so we can find it again later.
    const lastbp = this.addBreakpoint(thresholds.length, null, null, false);
    lastbp.classList.add("ngchm-upm-last-breakpoint");
    return;
  }

  // Remove all existing breakpoints (not including the "missing" breakpoint)
  // from the colorSchemeTable.
  ColorSchemeTable.prototype.removeBreakpoints = removeBreakpoints;
  function removeBreakpoints() {
    if (debug || debugColors) {
      console.log("removeBreakpoints", { key: this.key, axis: this.axis });
    }
    const tbody = this.content.getElementsByTagName("tbody")[0];
    if (tbody && tbody.children) {
      const breakpoints = [];
      // Find any old breakpoints.
      for (const child of tbody.children) {
        if (child.classList.contains("ngchm-upm-breakpoint")) {
          breakpoints.push(child);
        }
      }
      // Remove them.
      for (const bp of breakpoints) {
        tbody.removeChild(bp);
      }
    }
  }

  // Find the row before which to insert additional breakpoints.
  // Two cases:
  // 1. We are just missing one or more breakpoints and we
  //    want to insert before the last-breakpoint (the empty
  //    breakpoint for appending new rows).
  // 2. All the breakpoints have been removed, including the
  //    last-breakpoint, so we want to insert before the
  //    missing-breakpoint.
  ColorSchemeTable.prototype.findInsertPoint = function findInsertPoint() {
    const tbody = this.content.getElementsByTagName("tbody")[0];
    if (tbody && tbody.children) {
      for (let ii = 0; ii < tbody.children.length; ii++) {
        const classList = tbody.children[ii].classList;
        if (
          classList.contains("ngchm-upm-last-breakpoint") ||
          classList.contains("ngchm-upm-missing-breakpoint")
        ) {
          return ii;
        }
      }
    }
    // Append to table.
    return -1;
  };

  // Add a numeric breakpoint to the continuous colorSchemeTable.
  // If threshold and color are null, we are inserting the special
  // "last" breakpoint that just has an "add breakpoint" button.
  ColorSchemeTable.prototype.addBreakpoint = addBreakpoint;
  function addBreakpoint(index, threshold, color, deleteAble) {
    const row = this.addRow([
      // The breakpoint input.
      threshold == null
        ? ""
        : createNumericInput(getBreakPrefId(this.key, this.axis, index), threshold, 8),
      // The color input.
      color == null ? "" : createColorInput(getColorPrefId(this.key, this.axis, index), color),
      // The add/delete breakpoint buttons.
      buttonBar(this, index, deleteAble)
    ]);
    row.classList.add("ngchm-upm-breakpoint");
    return row;
    // Helper functions.
    // Create a breakpoint buttons bar.
    function buttonBar(scheme, index, addDeleteButton) {
      const buttons = UTIL.newElement("DIV.colorTableButtons");
      buttons.appendChild(bpButton(scheme, index, "icon-plus", "add"));
      if (addDeleteButton) {
        buttons.appendChild(bpButton(scheme, index, "icon-big-x", "delete"));
      }
      return buttons;
    }
    // Create a breakpoint button.
    function bpButton(scheme, index, icon, action) {
      const button = UTIL.newSvgButton(icon);
      button.id = KAID(scheme.key, scheme.axis, "breakPt" + index, action, "button");
      button.onclick = genCallback(scheme.axis, scheme.key, index, action);
      return button;
    }
    // Return a function to perform the specified action ("add" or "delete")
    // for the breakpoint specified by axis, key, and index.
    function genCallback(axis, key, index, action) {
      return function () {
        if (debug || debugEvents || debugColors) {
          console.log("Color scheme breakpoint button press", { axis, key, index, action });
        }
        startChange();
        modifyDataLayerBreaks(axis, key, index, action);
      };
    }
  }

  /**********************************************************************************
   * FUNCTION modifyDataLayerBreaks: Add or remove a breakpoint from a data layer
   * color map.  Called when the user clicks on one of the add or remove breakpoint buttons.
   *
   * - action is either "add" or "delete"
   * - pos is the breakpoint index at which to perform the action.
   **********************************************************************************/
  function modifyDataLayerBreaks(colorMapAxis, colorMapName, pos, action) {
    // Get the modified breaks and colors.
    if (debug || debugColors) {
      console.log("modifyDataLayerBreaks", {
        colorMapAxis,
        colorMapName,
        pos,
        action
      });
    }
    // Get the modified threholds and colors.
    const newThresholds = getNewBreakThresholds(colorMapAxis, colorMapName, pos, action);
    const newColors = getNewBreakColors(colorMapAxis, colorMapName, pos, action);

    // Change them in the color map.
    const colorMapMgr = UPM.heatMap.getColorMapManager();
    const colorMap = colorMapMgr.getColorMap(colorMapAxis, colorMapName);
    colorMap.setThresholds(newThresholds);
    colorMap.setColors(newColors);
    colorMapMgr.setColorMap(colorMapAxis, colorMapName, colorMap);

    // Change them in the UI.
    // This removes and recreates the entire panel containing the
    // modified color scheme table.
    if (colorMapAxis == "data") {
      // Replace the layer preferences panel.
      mapLayersTab.createLayerPreferences(colorMapName);
    } else {
      // Replace the covariate preferences panel.
      const oldCovariatePrefs = KAE_OPT("breakPrefs", colorMapName, colorMapAxis);
      if (oldCovariatePrefs) {
        oldCovariatePrefs.remove();
      }
      addCovariatePrefs(colorMapAxis, colorMapName);
    }
  }
})();
