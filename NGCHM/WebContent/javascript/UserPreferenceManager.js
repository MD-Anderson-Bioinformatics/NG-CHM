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

  // The DIV that contains the entire Preferences Manager.
  const prefspanel = document.getElementById("prefs");

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
  PreferencesTab.prototype.prepareErrorView = function prepareErrorView(
    errorMsg,
  ) {};

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

  // Generate a list of potential target elements for an event, starting at
  // the event.target and proceeding up through its parents, up to
  // and including the tab's highest div.  The caller should stop processing
  // the generator's results when an applicable element is found.
  PreferencesTab.prototype.targetGen = function* targetGen (event) {
    for (let target = event.target; target; target = target.parentElement) {
      yield (target);
      if (target === this.tabDiv) {
        break;
      }
    }
    return null;
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
    KAE ("colorMenu_btn").onclick = () => openPreferencesManager();
    KAE ("menuGear").onclick = () => openPreferencesManager();

    // Two ways to close the Preferences Manager.
    KAE ("redX_btn").onclick = () => closePreferencesManager();
    KAE ("prefClose_btn").onclick = () => closePreferencesManager();

    // Move the Preferences Manager position.
    KAE ("prefsMove_btn").onclick = () => movePreferencesManager();

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
    UPM.heatMap = null;          // The heatMap in the open Preferences Manager (UPM).
    UPM.bkpColorMaps = null;     // A backup copy of the heatMap's color maps, used by reset.
    UPM.resetValJSON = null;     // A backup copy of the UPM's options, used by reset.
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
  function preserveColorMaps () {
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
  function restoreColorMaps () {
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
      const tabContainer = document.getElementById("prefPrefs");
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
        errorMsg,
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
      UTIL.containerElement.getBoundingClientRect().right -
      prefspanel.offsetWidth +
      "px";
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
        prefActions.firstChild,
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
        UTIL.containerElement.getBoundingClientRect().right -
        prefspanel.offsetWidth +
        "px";
    }
  }

  // FUNCTION saveResetVals: save a copy of all the data needed to reset the heatMap state.
  //
  function saveResetVals() {
    const resetVals = {
      matrix: UPM.heatMap.getMapInformation(),
    };
    for (const axis of [ "row", "col" ]) {
      resetVals[axis+"Config"] = UPM.heatMap.getAxisConfig(axis);
      resetVals[axis+"LabelTypes"] = UPM.heatMap.getLabelTypes(axis);  // Comes from mapData.
    }
    // Turn resetVals into a string so the values don't change as the user changes
    // stuff in the preferences manager.
    UPM.resetValJSON = JSON.stringify(resetVals);
  }

  // FUNCTION resetAllPreferences: Reset the heatMap state and the UI to the saved values.
  //
  function resetAllPreferences() {
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
  function prefsValidateBreakPoints(colorMapAxis, colorMapName, prefPanel) {
    const colorMapMgr = UPM.heatMap.getColorMapManager();
    const colorMap = colorMapMgr.getColorMap(colorMapAxis, colorMapName);
    var thresholds = colorMap.getThresholds();
    var charBreak = false;
    var dupeBreak = false;
    var breakOrder = false;
    var prevBreakValue = MAPREP.minValues;
    var errorMsg = null;
    const elementIdPrefix =
      colorMapName +
      (colorMapAxis == "data" ? "" : "_" + colorMapAxis) +
      "_breakPt";
    //Loop thru colormap thresholds and validate for order and duplicates
    for (var i = 0; i < thresholds.length; i++) {
      const breakElementId = elementIdPrefix + i + "_breakPref";
      const breakElement = document.getElementById(breakElementId);
      if (!breakElement) {
        console.error("Unable to find breakElement for " + breakElementId);
        continue;
      }
      //If current breakpoint is not numeric
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
      for (var j = 0; j < thresholds.length; j++) {
        var be = document.getElementById(elementIdPrefix + j + "_breakPref");
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
      errorMsg = [
        colorMapName,
        prefPanel,
        "ERROR: Breakpoints must be numeric",
        colorMapAxis,
      ];
    }
    if (breakOrder) {
      errorMsg = [
        colorMapName,
        prefPanel,
        "ERROR: Breakpoints must be in increasing order",
        colorMapAxis,
      ];
    }
    if (dupeBreak) {
      errorMsg = [
        colorMapName,
        prefPanel,
        "ERROR: Duplicate breakpoint found",
        colorMapAxis,
      ];
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
  function prefsValidateBreakColors(colorMapName, type, prefPanel) {
    const colorMapMgr = UPM.heatMap.getColorMapManager();
    const colorMap = colorMapMgr.getColorMap(type, colorMapName);
    var key = colorMapName;
    if (type !== "data") {
      key = key + "_" + type;
    }
    var thresholds = colorMap.getThresholds();
    var colors = colorMap.getColors();
    var dupeColor = false;
    for (var i = 0; i < colors.length; i++) {
      for (var j = 0; j < thresholds.length; j++) {
        var ce = KAE(key, "color" + j, "colorPref");
        if (i != j) {
          if (colorElement.value === ce.value) {
            dupeColor = true;
            break;
          }
        }
      }
    }
    if (dupeColor) {
      return [key, prefPanel, "ERROR: Duplicate color setting found above"];
    }

    return null;
  }

  /**********************************************************************************
   * FUNCTION prefsApplyBreaks: Apply all user entered changes to the colors
   * and breakpoints of the specified color map.
   **********************************************************************************/
  function prefsApplyBreaks(colorMapName, colorMapAxis) {
    const colorMapMgr = UPM.heatMap.getColorMapManager();
    const colorMap = colorMapMgr.getColorMap(colorMapAxis, colorMapName);
    const newColors = getNewBreakColors(colorMapAxis, colorMapName);
    colorMap.setColors(newColors);
    if (colorMap.getType() != "discrete") {
      const newThresholds = getNewBreakThresholds(colorMapAxis, colorMapName);
      colorMap.setThresholds(newThresholds);
    }
    const key =
      colorMapName + (colorMapAxis == "data" ? "" : "_" + colorMapAxis);
    const missingElement = KAE(key,"missing","colorPref");
    colorMap.setMissingColor(missingElement.value);
    colorMapMgr.setColorMap(colorMapAxis, colorMapName, colorMap);
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
    let prevColorElement = getColorPrefElement(colorMapAxis, colorMapName, 0);
    if (pos == 0 && action == "add") {
      // Insert a color before the first color.
      newColors.push(UTIL.blendTwoColors("#000000", prevColorElement.value));
    }
    if (pos != 0 || action != "delete") {
      // Copy first color unless it is deleted.
      newColors.push(prevColorElement.value); // color0
    }
    for (let j = 1; j < thresholds.length; j++) {
      const colorElement = getColorPrefElement(colorMapAxis, colorMapName, j);
      //In case there are now less elements than the thresholds list on Reset.
      if (colorElement !== null) {
        //If being called from modifyDataLayerBreaks
        if (typeof pos !== "undefined") {
          if (action === "add") {
            if (j === pos) {
              //Blend previous and current breakpoint colors to get new color.
              newColors.push(
                UTIL.blendTwoColors(prevColorElement.value, colorElement.value),
              );
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
      const classBar =
        UPM.heatMap.getAxisCovariateConfig(colorMapAxis)[colorMapName];
      if (classBar.bar_type != "color_plot") {
        newColors[1] = classBar.fg_color;
      }
    } else {
      //Potentially on a data layer reset, there could be more color points than contained in the thresholds object
      //because a user may have deleted a breakpoint and then hit "reset". So we check for up to 50 preferences.
      for (let k = thresholds.length; k < 50; k++) {
        const colorElement = getColorPrefElement(colorMapAxis, colorMapName, k);
        if (colorElement !== null) {
          newColors.push(colorElement.value);
        }
      }
    }
    return newColors;
  }

  // Return the colorPref element at the specified position in the specified
  // color map (or null if none).
  function getColorPrefElement(colorMapAxis, colorMapName, position) {
    let id = colorMapName;
    if (colorMapAxis != "data") id += "_" + colorMapAxis;
    return KAE_OPT(id,"color"+position,"colorPref");
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
    let elementIdPrefix = colorMapName;
    if (colorMapAxis != "data") elementIdPrefix += "_" + colorMapAxis;
    const thresholds = colorMap.getThresholds();
    const newThresholds = [];
    let prevBreakElement = document.getElementById(
      elementIdPrefix + "_breakPt0_breakPref",
    );
    let prevBreakValue = Number(prevBreakElement.value);
    if (pos == 0 && action == "add") {
      newThresholds.push(prevBreakValue - 1);
    }
    if (pos != 0 || action != "delete") {
      newThresholds.push(prevBreakValue);
    }
    for (let j = 1; j < thresholds.length; j++) {
      const breakElement = document.getElementById(
        elementIdPrefix + "_breakPt" + j + "_breakPref",
      );
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
      const breakElement = KAE_OPT(elementIdPrefix,"breakPt" + k,"breakPref");
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
    PreferencesTab.call(this, "prefLayer_btn", "layerPrefs");
  }

  MapLayersTab.prototype.prepareErrorView = function (errorMsg) {
    // errorMsg[0] : layer name
    // Show the view of the layer containing the error.
    showDataLayerPanel(errorMsg[0]);
  };

  MapLayersTab.prototype.prepareView = function () {
    // Show the view of the heatMap's current layer.
    showDataLayerPanel(UPM.heatMap.getCurrentDL());
  };

  MapLayersTab.prototype.setupTab = function setupLayersTab() {
    const layerprefs = document.getElementById("layerPrefs");
    const prefContents = document.createElement("TABLE");
    const dataLayers = UPM.heatMap.getDataLayers();

    // Create the data-layer select dropdown.
    UHM.addBlankRow(prefContents);
    const dlSelect = UTIL.newElement(
      "SELECT#dlPref_list",
      { name: "dlPref_list" },
    );

    // Re-order options in datalayer order (which is lost on JSON save)
    const dls = new Array(Object.keys(dataLayers).length);
    const orderedKeys = new Array(Object.keys(dataLayers).length);
    for (let key in dataLayers) {
      const dlNext = key.substring(2, key.length);
      orderedKeys[dlNext - 1] = key;
      let displayName = dataLayers[key].name;
      if (displayName.length > 20) {
        displayName = displayName.substring(0, 17) + "...";
      }
      dls[dlNext - 1] = UTIL.newElement("OPTION", { value: key }, displayName);
    }
    for (let i = 0; i < dls.length; i++) {
      dlSelect.appendChild(dls[i]);
    }

    // Add the data-layer drop-down.
    UHM.setTableRow(prefContents, ["&nbsp;Data Layer: ", dlSelect]);
    UHM.addBlankRow(prefContents, 2);
    layerprefs.appendChild(prefContents);
    UHM.addBlankRow(prefContents);

    // Loop over the data layers, creating a panel div for each layer.
    for (let key in dataLayers) {
      const breakprefs = setupLayerBreaks("data", key);
      breakprefs.style.display = "none";
      layerprefs.appendChild(breakprefs);
    }

    // Add a change event handler for this tab.
    this.tabDiv.addEventListener("change", (ev) => {
      if (debug) console.log("DataLayersTab: Change handler", { target: ev.target });
      for (const target of this.targetGen(ev)) {
        if (target.id == "dlPref_list") {
          showDataLayerPanel();
          break;
        }
        if (target.classList.contains('spectrumColor')
        || target.classList.contains('ngchm-upm-input')) {
          startChange();
          break;
        }
      }
    });

    return layerprefs;
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
    for (let dl in resetVal.matrix.data_layer) {
      const layer = resetVal.matrix.data_layer[dl];

      // Reset the color map values.
      const cm = layer.color_map;
      const dlTable = KAE("breakPrefsTable",dl);
      fillBreaksTable(dlTable, "data", dl, cm.thresholds, cm.colors);
      const missingColor = KAE(dl,"missing","colorPref");
      missingColor.value = cm.missing;

      // Reset the other data layer values.
      const gridColor = KAE(dl,"gridColorPref");
      gridColor.value = layer.grid_color;
      const gridShow = KAE(dl,"gridPref");
      gridShow.checked = layer.grid_show == "Y";
      const selectionColor = KAE(dl,"selectionColorPref");
      selectionColor.value = layer.selection_color;
      const gapColor = KAE(dl,"gapColorPref");
      gapColor.value = layer.cuts_color;

      // Load the preview histogram for the layer.
      loadColorPreviewDiv(dl);
    }
  };

  // METHOD MapLayersTab.applyTabPrefs: Apply all user preference settings on the Layers
  // (aka Heat Map Colors) tab.
  //
  MapLayersTab.prototype.applyTabPrefs = function applyLayersTabPrefs() {
    // Apply Data Layer Preferences
    const dataLayers = UPM.heatMap.getDataLayers();
    for (let key in dataLayers) {
      // Apply the color map changes.
      prefsApplyBreaks(key, "data");

      // Apply the other data layer values.
      const showGrid = KAE(key,"gridPref");
      const gridColor = KAE(key,"gridColorPref");
      const selectionColor = KAE(key,"selectionColorPref");
      const gapColor = KAE(key,"gapColorPref");
      UPM.heatMap.setLayerGridPrefs(
        key,
        showGrid.checked,
        gridColor.value,
        selectionColor.value,
        gapColor.value,
      );

      // Load the preview histogram for the layer.
      loadColorPreviewDiv(key);
    }
  };

  /**********************************************************************************
   * FUNCTION setupLayerBreaks: Construct a DIV
   * containing a list of breakpoints/colors for a given matrix data layer.
   **********************************************************************************/
  function setupLayerBreaks(colorMapAxis, mapName) {
    const layerPrefs = UTIL.newElement("DIV#breakPrefs_" + mapName);
    // The layerPrefs division consists of four subparts:
    // - the layer's continuous color scheme
    // - a continuous color palette table
    // - the layer properties table
    // - the histogram preview.

    const colorMapMgr = UPM.heatMap.getColorMapManager();
    const colorMap = colorMapMgr.getColorMap(colorMapAxis, mapName);

    const thresholds = colorMap.getThresholds();
    const colors = colorMap.getColors();
    const dataLayers = UPM.heatMap.getDataLayers();
    const layer = dataLayers[mapName];

    const prefTable = TABLE.createTable({ columns: 3 });
    prefTable.addIndent();

    prefTable.addBlankSpace(2);
    prefTable.addRow([
      "Breakpoint",
      "Color",
      "&nbsp;",
    ], { underline: [true,true,false], fontWeight: [ "bold", "bold", "" ] });
    prefTable.addBlankSpace();

    const breakpts = UTIL.newElement("TABLE#breakPrefsTable_" + mapName);
    fillBreaksTable(breakpts, "data", mapName, thresholds, colors);
    prefTable.addRow([breakpts]);

    prefTable.addBlankSpace();
    prefTable.addRow([
      "Missing Color:",
      "<input class='spectrumColor' type='color' name='" +
        mapName +
        "_missing_colorPref' id='" +
        mapName +
        "_missing_colorPref' value='" +
        colorMap.getMissingColor() +
        "'>",
      "",
    ]);
    prefTable.addBlankSpace(2);
    layerPrefs.appendChild(prefTable.content);

    //-------------------------------------------------------------------------
    const paletteTable = TABLE.createTable({ columns: 3 });
    paletteTable.content.style.width = 'fit-content';
    paletteTable.addIndent();
    PALETTES.addPredefinedPalettes(paletteTable, mapName, setupLayerBreaksToPreset);
    layerPrefs.appendChild(paletteTable.content);

    //-------------------------------------------------------------------------
    const propsTable = TABLE.createTable({ columns: 4 });
    propsTable.content.style.width = 'fit-content';
    propsTable.addIndent();
    let gridShow =
      "<input class='ngchm-upm-input' name='" +
      mapName +
      "_gridPref' id='" +
      mapName +
      "_gridPref' type='checkbox' ";
    if (layer.grid_show == "Y") {
      gridShow = gridShow + "checked";
    }
    gridShow = gridShow + " >";

    let gridColorInput =
      "<input class='spectrumColor' type='color' name='" +
      mapName +
      "_gridColorPref' id='" +
      mapName +
      "_gridColorPref' value='" +
      layer.grid_color +
      "'>";

    let selectionColorInput =
      "<input class='spectrumColor' type='color' name='" +
      mapName +
      "_selectionColorPref' id='" +
      mapName +
      "_selectionColorPref' value='" +
      layer.selection_color +
      "'>";
    let gapColorInput =
      "<input class='spectrumColor' type='color' name='" +
      mapName +
      "_gapColorPref' id='" +
      mapName +
      "_gapColorPref' value='" +
      layer.cuts_color +
      "'>";

    propsTable.addBlankSpace(3);
    propsTable.addRow([
      "Grid Lines:",
      gridColorInput,
      "Grid Show:",
      gridShow,
    ], { fontWeight: [ "bold", "", "bold", "" ] });
    propsTable.addRow([
      "Selection Color:",
      selectionColorInput,
      "Gap Color:",
      gapColorInput,
    ], { fontWeight: [ "bold", "", "bold", "" ] });
    layerPrefs.appendChild(propsTable.content);

    //-------------------------------------------------------------------------

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
              loadColorPreviewDiv(mapName);
            };
            return el;
          },
        ),
      );

    const histogram = UTIL.newElement ("DIV.histogram");
    histogram.appendChild(header);
    histogram.appendChild(updateButton);

    const previewDiv = UTIL.newElement("DIV.histogram-preview");
    previewDiv.id = "previewWrapper" + mapName;
    histogram.appendChild(previewDiv);

    setTimeout(
      function (mapName) {
        loadColorPreviewDiv(mapName, true);
      },
      100,
      mapName,
    );
    layerPrefs.appendChild(histogram);

    return layerPrefs;
  }

  function fillBreaksTable(
    breakpts,
    colorMapAxis,
    layerName,
    thresholds,
    colors,
  ) {
    // Remove any existing elements.
    while (breakpts.firstChild) {
      breakpts.removeChild(breakpts.firstChild);
    }
    const elementIdPrefix =
      layerName + (colorMapAxis == "data" ? "" : "_" + colorMapAxis);
    for (let j = 0; j <= thresholds.length; j++) {
      const threshId = elementIdPrefix + "_breakPt" + j;
      const buttonsDiv = UTIL.newElement("DIV.colorTableButtons");
      const addButton = UTIL.newSvgButton(
        "icon-plus",
        {
          id: threshId + "_breakAdd",
        },
        function (el) {
          el.onclick = (function (j, layerName) {
            return function () {
              startChange();
              modifyDataLayerBreaks(colorMapAxis, layerName, j, "add");
            };
          })(j, layerName);
          return el;
        },
      );
      buttonsDiv.appendChild(addButton);
      if (j == thresholds.length) {
        UHM.setTableRow(breakpts, [null, null, buttonsDiv]);
        break;
      }
      var threshold = thresholds[j];
      var color = colors[j];
      var colorId = elementIdPrefix + "_color" + j;
      var breakPtInput =
        "&nbsp;&nbsp;<input class='ngchm-upm-input' name='" +
        threshId +
        "_breakPref' id='" +
        threshId +
        "_breakPref' value='" +
        threshold +
        "' maxlength='8' size='8'>";
      var colorInput =
        "<input class='spectrumColor' type='color' name='" +
        colorId +
        "_colorPref' id='" +
        colorId +
        "_colorPref' value='" +
        color +
        "'>";
      if (thresholds.length < 3) {
        UHM.setTableRow(breakpts, [breakPtInput, colorInput, buttonsDiv]);
      } else {
        const delButton = UTIL.newSvgButton(
          "icon-big-x",
          {
            id: threshId + "_breakDel",
          },
          function (el) {
            el.onclick = (function (j, layerName) {
              return function () {
                startChange();
                modifyDataLayerBreaks(colorMapAxis, layerName, j, "delete");
              };
            })(j, layerName);
            return el;
          },
        );
        buttonsDiv.appendChild(delButton);
        UHM.setTableRow(breakpts, [breakPtInput, colorInput, buttonsDiv]);
      }
    }
  }

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
        const bp = KAE_OPT(mapName,"breakPt" + i,"breakPref");
        const color = KAE_OPT(mapName,"color" + i,"colorPref");
        if (!bp || !color) {
          // Reached end of breakpoints and/or colors.
          break;
        }
        tempCM.colors.push(color.value);
        tempCM.thresholds.push(bp.value);
      }
      const missing = KAE(mapName,"missing","colorPref");
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
      var svg =
        "<svg class='preview-svg' id='previewSVG" +
        mapName +
        "' width='110' height='100'>";
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
   * FUNCTION setupLayerBreaksToPreset: This function will be executed when the user
   * selects a predefined color scheme. It will fill the first and last breakpoints with the
   * predefined colors and interpolate the breakpoints in between.
   * "preset" is an array of the colors in HEX of the predefined color scheme
   **********************************************************************************/
  function setupLayerBreaksToPreset(
    key,
    colors,
    missingColor,
    axis,
    type,
  ) {
    if (debug) console.log ("setupLayerBreaksToPreset:", {key, colors, missingColor, axis, type });
    startChange();
    const keyaxis = key + (typeof axis == "undefined" ? "" : "_" + axis);

    // Find the number of breakpoints in the color preference.
    let i = 0;
    while (KAE_OPT(keyaxis, "color" + ++i, "colorPref")) {}
    const lastShown = i - 1;

    // create dummy colorScheme
    const thresh = [];
    if (KAE_OPT(keyaxis,"breakPt0","breakPref")) {
      // if the breakpoints are changeable (data layer)...
      const firstBP = KAE(keyaxis,"breakPt0","breakPref").value;
      const lastBP = KAE(keyaxis,"breakPt"+lastShown,"breakPref").value;
      const range = lastBP - firstBP;
      for (let j = 0; j < colors.length; j++) {
        thresh[j] = Number(firstBP) + j * (range / (colors.length - 1));
      }
      const colorScheme = {
        type: "continuous",
        colors: colors,
        thresholds: thresh,
        missing: missingColor,
      };
      const csTemp = new CMM.ColorMap(UPM.heatMap, colorScheme);

      for (let j = 0; j < i; j++) {
        const threshId = "breakPt" + j;
        const colorId = "color" + j;
        if (debug) console.log ("Getting breakpoint value", { elementId: `${keyaxis}_${threshId}_breakPref` });
        const breakpoint = KAE(keyaxis,threshId,"breakPref").value;
        KAE(keyaxis,colorId,"colorPref").value = csTemp.getRgbToHex(csTemp.getColor(breakpoint));
      }
      if (debug) console.log ("Getting missing color", { elementId: keyaxis + "_missingColorPref" });
      KAE(keyaxis,"missing","colorPref").value =
        csTemp.getRgbToHex(csTemp.getColor("Missing"));
    } else {
      // if the breakpoints are not changeable (covariate bar)...
      if (type == "Discrete") {
        // if colors can be mapped directly
        for (let j = 0; j < i; j++) {
          // in case there are more breakpoints than predef colors, we cycle back
          KAE(keyaxis,"color"+j,"colorPref").value = colors[j % colors.length];
        }
        KAE(keyaxis,"missing","colorPref").value = missingColor;
      } else {
        // if colors need to be blended
        const colorMapMgr = UPM.heatMap.getColorMapManager();
        const colorMap = colorMapMgr.getColorMap(axis, key);
        const thresholds = colorMap.getThresholds();
        const range = thresholds[thresholds.length - 1] - thresholds[0];
        for (let j = 0; j < colors.length; j++) {
          thresh[j] = Number(thresholds[0]) + j * (range / (colors.length - 1));
        }
        const colorScheme = {
          type: "continuous",
          colors: colors,
          thresholds: thresh,
          missing: missingColor,
        };
        const csTemp = new CMM.ColorMap(UPM.heatMap, colorScheme);
        for (let j = 0; j < thresholds.length; j++) {
          const breakpoint = thresholds[j];
          KAE(keyaxis,"color"+j,"colorPref").value =
            csTemp.getRgbToHex(csTemp.getColor(breakpoint));
        }
        KAE(keyaxis,"missing","colorPref").value =
          csTemp.getRgbToHex(csTemp.getColor("Missing"));
      }
    }
  }

  /**********************************************************************************
   * FUNCTION showDataLayerPanel: Show the specified data layer panel.
   *
   * If selLayer is specified, set the layer drop down to that value.
   * Now show the selected layer panel and hide all others.
   *
   **********************************************************************************/
  function showDataLayerPanel(selLayer) {
    const layerBtn = document.getElementById("dlPref_list");
    // Change the selected panel to selLayer if provided.
    if (typeof selLayer != "undefined") {
      layerBtn.value = selLayer;
    }
    // Show the selected panel. Hide all others.
    for (let i = 0; i < layerBtn.length; i++) {
      const layerVal = layerBtn.options[i].value;
      const layerDiv = KAE("breakPrefs",layerVal);
      const layerSel = layerBtn.options[i].selected;
      if (layerSel) {
        layerDiv.style.display = "block";
      } else {
        layerDiv.style.display = "none";
      }
    }
  }

  /**********************************************************************************
   * FUNCTION modifyDataLayerBreaks: Add or remove a breakpoint from a data layer
   * color map.
   *
   * - action is either "add" or "delete"
   * - pos is the index to perform the action.
   **********************************************************************************/
  function modifyDataLayerBreaks(colorMapAxis, colorMapName, pos, action) {
    // Get the modified breaks and colors.
    const newThresholds = getNewBreakThresholds(
      colorMapAxis,
      colorMapName,
      pos,
      action,
    );
    const newColors = getNewBreakColors(
      colorMapAxis,
      colorMapName,
      pos,
      action,
    );
    // Change them in the color map.
    const colorMapMgr = UPM.heatMap.getColorMapManager();
    const colorMap = colorMapMgr.getColorMap(colorMapAxis, colorMapName);
    colorMap.setThresholds(newThresholds);
    colorMap.setColors(newColors);
    colorMapMgr.setColorMap(colorMapAxis, colorMapName, colorMap);
    // Remove the old color breaks.
    const oldBreakPrefs = getDataLayerBreakPrefs(colorMapAxis, colorMapName);
    if (oldBreakPrefs) {
      oldBreakPrefs.remove();
    }
    // Insert a new color break prefs.
    if (colorMapAxis == "data") {
      const newBreakPrefs = setupLayerBreaks(colorMapAxis, colorMapName);
      newBreakPrefs.style.display = "block";
      document.getElementById("layerPrefs").appendChild(newBreakPrefs);
    } else {
      setupCovariateBreaks(colorMapAxis, colorMapName);
    }
  }

  // Return the break prefs element for the specified colorMapAxis and colorMapName.
  function getDataLayerBreakPrefs(colorMapAxis, colorMapName) {
    let breakPrefsId = "breakPrefs_" + colorMapName;
    if (colorMapAxis != "data") breakPrefsId += "_" + colorMapAxis;
    return document.getElementById(breakPrefsId);
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

  // PROPERTY CovariatesPrefsTab.nextNumber - return a unique value on every access.
  //
  {
    let nextNumber = 0;
    Object.defineProperty(CovariatesPrefsTab.prototype, "nextNumber", {
      get: () => nextNumber++,
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
        align: "top",
      },
      [UTIL.newElement("SPAN.button", {}, "Filter Covariates")],
    );
    prefsTable.addRow([filterInput, filterButton], {
      colSpan: [2, 1],
      align: ["right", "left"],
    });
    prefsTable.addBlankSpace(2);

    // Add the covariate selection dropdown.
    const classSelect = UTIL.newElement("SELECT#classPref_list", {
      name: "classPref_list",
    });
    prefsTable.addRow(["Covariate Bar: ", classSelect]);
    prefsTable.addBlankSpace();

    // Add a hidden DIV for every covariate.
    // The DIV will be displayed if the user selects the covariate from the
    // covariate selection dropdown.
    const covariates = {
      row: UPM.heatMap.getRowClassificationConfig(),
      col: UPM.heatMap.getColClassificationConfig(),
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
      this.emptyNotice = prefsTable.addRow([
        "This Heat Map contains no covariate bars",
      ]);
    }

    this.addClassPrefOptions();

    // Add a click handler for the entire tab.
    this.tabDiv.addEventListener("click", (ev) => {
      if (debug) console.log("CovariatesPrefsTab: Click handler", { target: ev.target });
      for (const target of this.targetGen(ev)) {
        if (target.id == "all_searchPref_btn") {
          // The user clicked on the filter covariates button.
          this.filterClassPrefs();
          return;
        }
      }
    });
    // Add a change handler for the entire tab.
    this.tabDiv.addEventListener("change", (ev) => {
      if (debug) console.log("CovariatesPrefsTab: Change handler", { target: ev.target });
      for (const target of this.targetGen(ev)) {
        if (target.classList.contains("ngchm-upm-show-covariate")) {
          // A "Show" checkbox on a covariate row changed.
          startChange();
          this.setShowAll();
          break;
        } else if (target.id == "classPref_list") {
          // A new selection was made on the covariate bar dropdown.
          // Change view to new selection.
          this.showClassBreak();
          break;
        } else if (target.classList.contains('spectrumColor')) {
          startChange();
          break;
        }
      }
    });
    return this.tabDiv;
  };

  /**********************************************************************************
   * FUNCTION setupAllClassesPrefs: The purpose of this function is to construct a DIV
   * containing a list of all covariate bars with informational data and user preferences
   * that are common to all bars (show/hide and size).
   **********************************************************************************/
  CovariatesPrefsTab.prototype.setupAllClassesPrefs =
    function setupAllClassesPrefs() {
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
              tooltip:
                "Decrease the size of all selected covariate bars by one",
            },
          },
          function (el) {
            el.onclick = function () {
              startChange();
              decrementAllHeights();
            };
            return el;
          },
        ),
        UTIL.newSvgButton(
          "icon-plus",
          {
            dataset: {
              tooltip:
                "Increase the size of all selected covariate bars by one",
            },
          },
          function (el) {
            el.onclick = function () {
              startChange();
              incrementAllHeights();
            };
            return el;
          },
        ),
      ]);
      // Add the pair of size adjusting buttons to the table.
      UHM.setTableRow(prefContents, [
        "&nbsp;&nbsp;&nbsp;",
        "&nbsp;&nbsp;&nbsp;",
        "<b>Adjust All Heights: </b>",
        buttons,
      ]);
      // Create the header for the "Show" column.
      // Includes the "all_showPref" checkbox.
      const showHeader = UTIL.newFragment([
        UTIL.newElement(
          "INPUT#all_showPref",
          {
            name: "all_showPref",
            type: "checkbox",
          },
          null,
          function (el) {
            el.onchange = function () {
              startChange();
              thisTab.showAllBars();
            };
            return el;
          },
        ),
        UTIL.newElement("B", {}, UTIL.newElement("U", {}, "Show")),
      ]);
      // Add the header row to the table.
      UHM.setTableRow(prefContents, [
        "&nbsp;<u>" + "Covariate" + "</u>",
        "<b><u>" + "Position" + "</u></b>",
        showHeader,
        "<b><u>" + "Height" + "</u></b>",
      ]);
      // Add a row to the table of all covariates that pass the filter.
      const covariates = {
        row: UPM.heatMap.getRowClassificationConfig(),
        col: UPM.heatMap.getColClassificationConfig(),
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
    currentClassBar,
  ) {
    const keyaxis = key + "_" + axis;
    const showPref = keyaxis + "_showPref";
    const colShow = UTIL.newElement(
      "INPUT.ngchm-upm-show-covariate",
      {
        id: showPref,
        name: showPref,
        type: "checkbox",
      },
      null,
      function (el) {
        if (currentClassBar.show == "Y") {
          el.checked = true;
        }
        return el;
      },
    );
    const heightPref = keyaxis + "_heightPref";
    const colHeight = UTIL.newElement("INPUT", {
      id: heightPref,
      name: heightPref,
      maxlength: 2,
      size: 2,
      value: currentClassBar.height,
    });

    var displayName = key;
    if (key.length > 20) {
      displayName = key.substring(0, 17) + "...";
    }
    const tr = UHM.setTableRow(prefContents, [
      "&nbsp;&nbsp;" + displayName,
      UTIL.toTitleCase(axis),
      colShow,
      colHeight,
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
    var thresholds = colorMap.getThresholds();
    var colors = colorMap.getColors();

    // Create the covariatePrefPanel.
    const covariatePrefPanel = UTIL.newElement("DIV");
    covariatePrefPanel.id = "breakPrefs_" + keyaxis;

    const prefTable = TABLE.createTable({ columns: 3 });
    const prefContents = prefTable.content;
    UHM.addBlankRow(prefContents);

    var pos = UTIL.toTitleCase(axis);
    var typ = UTIL.toTitleCase(colorMap.getType());
    const barPlot = UTIL.toTitleCase(classBar.bar_type.replace("_", " "));
    UHM.setTableRow(prefContents, [
      "&nbsp;Axis: ",
      "<b>" + pos + "</b>",
    ]);

    UHM.setTableRow(prefContents, ["&nbsp;Covariate Type: ", "<b>" + typ + "</b>"]);
    UHM.addBlankRow(prefContents, 2);
    var bgColorInput =
      "<input class='spectrumColor' type='color' name='" +
      keyaxis +
      "_bgColorPref' id='" +
      keyaxis +
      "_bgColorPref' value='" +
      classBar.bg_color +
      "'>";
    var fgColorInput =
      "<input class='spectrumColor' type='color' name='" +
      keyaxis +
      "_fgColorPref' id='" +
      keyaxis +
      "_fgColorPref' value='" +
      classBar.fg_color +
      "'>";
    var lowBound =
      "<input name='" +
      keyaxis +
      "_lowBoundPref' id='" +
      keyaxis +
      "_lowBoundPref' value='" +
      classBar.low_bound +
      "' maxlength='10' size='8'>&emsp;";
    var highBound =
      "<input name='" +
      keyaxis +
      "_highBoundPref' id='" +
      keyaxis +
      "_highBoundPref' value='" +
      classBar.high_bound +
      "' maxlength='10' size='8'>&emsp;";
    if (typ === "Discrete") {
      UHM.setTableRow(prefContents, [
        "&nbsp;Bar Type: ",
        "<b>" + barPlot + "</b>",
      ]);
    } else {
      const typeOptionsId = KAID(key,axis,"barTypePref");
      const typeOptionsSelect = UTIL.newElement(
        "SELECT",
        {
          id: typeOptionsId,
          name: typeOptionsId,
        },
        [
          UTIL.newElement("OPTION", { value: "bar_plot" }, "Bar Plot"),
          UTIL.newElement("OPTION", { value: "color_plot" }, "Color Plot"),
          UTIL.newElement("OPTION", { value: "scatter_plot" }, "Scatter Plot"),
        ],
        function (el) {
          el.onchange = function () {
            startChange();
            showPlotTypeProperties(key, axis);
          };
          el.value = "color_plot";
          return el;
        },
      );
      UHM.setTableRow(prefContents, [
        "&nbsp;&nbsp;Bar Type:",
        typeOptionsSelect,
      ]);
    }

    UHM.addBlankRow(prefContents);
    var helpprefsCB = UTIL.newElement("DIV");
    helpprefsCB.id = keyaxis + "_breakPrefsCB";
    const prefTableCB = TABLE.createTable({ columns: 3 });
    const prefContentsCB = prefTableCB.content;
    if (typ === "Discrete") {
      UHM.setTableRow(prefContentsCB, [
        "&nbsp;<u>Category</u>",
        "<b><u>" + "Color" + "</b></u>",
      ]);
      for (var j = 0; j < thresholds.length; j++) {
        var threshold = thresholds[j];
        var color = colors[j];
        var threshId = keyaxis + "_breakPt" + j;
        var colorId = keyaxis + "_color" + j;
        var colorInput =
          "<input class='spectrumColor' type='color' name='" +
          colorId +
          "_colorPref' id='" +
          colorId +
          "_colorPref' value='" +
          color +
          "'>";
        UHM.setTableRow(prefContentsCB, [
          "&nbsp;&nbsp;" + threshold,
          colorInput,
        ]);
      }
    } else {
      UHM.setTableRow(prefContentsCB, [
        "&nbsp;<u>Breakpoint</u>",
        "<b><u>" + "Color" + "</b></u>",
      ]);
      UHM.addBlankRow(prefContentsCB);
      const colorScheme = document.createElement("TABLE");
      fillBreaksTable(colorScheme, axis, key, thresholds, colors);
      UHM.setTableRow(prefContentsCB, [colorScheme], 3);
    }
    UHM.addBlankRow(prefContentsCB);
    UHM.setTableRow(prefContentsCB, [
      "&nbsp;Missing Color:",
      "<input class='spectrumColor' type='color' name='" +
        keyaxis +
        "_missing_colorPref' id='" +
        keyaxis +
        "_missing_colorPref' value='" +
        colorMap.getMissingColor() +
        "'>",
    ]);

    prefTableCB.addBlankSpace(3);
    PALETTES.addPredefinedPalettes(prefTableCB, key, setupLayerBreaksToPreset, axis, typ);

    helpprefsCB.style.height = prefContentsCB.rows.length;
    helpprefsCB.appendChild(prefContentsCB);
    var helpprefsBB = UTIL.newElement("DIV");
    helpprefsBB.id = keyaxis + "_breakPrefsBB";
    var prefContentsBB = document.createElement("TABLE");
    UHM.setTableRow(prefContentsBB, ["&nbsp;&nbsp;Lower Bound:", lowBound]);
    UHM.setTableRow(prefContentsBB, ["&nbsp;&nbsp;Upper Bound:", highBound]);
    UHM.setTableRow(prefContentsBB, [
      "&nbsp;&nbsp;Foreground Color:",
      fgColorInput,
    ]);
    UHM.setTableRow(prefContentsBB, [
      "&nbsp;&nbsp;Background Color:",
      bgColorInput,
    ]);
    UHM.addBlankRow(prefContentsBB);
    helpprefsBB.appendChild(prefContentsBB);

    covariatePrefPanel.appendChild(prefContents);
    covariatePrefPanel.appendChild(helpprefsCB);
    covariatePrefPanel.appendChild(helpprefsBB);
    if (classBar.bar_type === "color_plot") {
      helpprefsBB.style.display = "none";
      helpprefsCB.style.display = "block";
    } else {
      helpprefsCB.style.display = "none";
      helpprefsBB.style.display = "block";
    }
    return covariatePrefPanel;
  }

  function setupCovariateBreaks(colorMapAxis, covariateName) {
    const bars = UPM.heatMap.getAxisCovariateConfig(colorMapAxis);
    const breakPrefs = setupClassBreaks(
      covariateName,
      colorMapAxis,
      bars[covariateName],
    );

    const classPrefs = document.getElementById("classPrefs");
    classPrefs.append(breakPrefs);
  }

  // Show the color plot options or the bar/scatter plot options, depending
  // on the value of the barType preference.
  function showPlotTypeProperties(key, axis) {
    const bbDiv = KAE(key,axis,"breakPrefsBB"); // Color plot options.
    const cbDiv = KAE(key,axis,"breakPrefsCB"); // Bar and scatter plot options.
    if (KAE(key,axis,"barTypePref").value === "color_plot") {
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
  CovariatesPrefsTab.prototype.showClassBreak = function showClassBreak(
    selClass,
    selAxis,
  ) {
    const classBtn = document.getElementById("classPref_list");
    if (typeof selClass != "undefined") {
      classBtn.value = selClass + (selAxis ? "_" + selAxis : "");
    }
    for (let i = 0; i < classBtn.length; i++) {
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
      const hidden =
        row.dataset.axis &&
        hiddenItems[row.dataset.axis].includes(row.dataset.key);
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
  CovariatesPrefsTab.prototype.addClassPrefOptions =
    function addClassPrefOptions() {
      // Empty covariate dropdown.
      const classSelect = document.getElementById("classPref_list");
      classSelect.options.length = 0;

      // Initialize the lists of hidden covariates to return.
      const hiddenOpts = {
        row: new Array(),
        col: new Array(),
      };

      classSelect.options[classSelect.options.length] = new Option(
        "ALL",
        "ALL",
      );
      // Add options for every covariate that passes the filter.
      // Add covariates that don't pass the filter to hiddenOpts.
      //
      if (this.hasClasses) {
        for (const { axis, key } of UPM.heatMap.genAllCovars()) {
          if (this.filterShow(key)) {
            const displayName =
              key.length <= 20 ? key : key.substring(0, 17) + "...";
            classSelect.options[classSelect.options.length] = new Option(
              displayName,
              key+"_"+axis,
            );
          } else {
            hiddenOpts[axis].push(key);
          }
          const barTypeEl = KAE_OPT(key,axis,"barTypePref");
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
          return [
            "ALL",
            "classPrefs",
            "ERROR: Bar heights must be between 0 and 100",
          ];
        }
        const barType = KAE_OPT(keyaxis, "barTypePref");
        if (barType !== null && barType.value !== "color_plot") {
          const lowBoundElement = KAE(keyaxis, "lowBoundPref");
          if (isNaN(lowBoundElement.value)) {
            return [
              keyaxis,
              "classPrefs",
              "ERROR: Covariate bar low bound must be numeric",
            ];
          }
          const highBoundElement = KAE(keyaxis, "highBoundPref");
          if (isNaN(highBoundElement.value)) {
            return [
              keyaxis,
              "classPrefs",
              "ERROR: Covariate bar high bound must be numeric",
            ];
          }
          const bgColorElement = KAE(keyaxis, "bgColorPref");
          const fgColorElement = KAE(keyaxis, "fgColorPref");
          if (bgColorElement.value === fgColorElement.value) {
            return [
              keyaxis,
              "classPrefs",
              "ERROR: Duplicate foreground and background colors found",
            ];
          }
        }
      }
      return null;
    }
  };

  CovariatesPrefsTab.prototype.resetTabPrefs = function resetCovariateTabPrefs(resetVal) {
    // Reset the Covariate preference items.
    for (const axis of [ "row", "col" ]) {
      const axisSavedCovariate = resetVal[axis+"Config"].classifications;
      for (let key in axisSavedCovariate) {
        const bar = axisSavedCovariate[key];
        KAE(key,axis,"showPref").checked = bar.show == "Y";
        KAE(key,axis,"heightPref").value = bar.height;
        KAE(key,axis,"missing_colorPref").value = bar.color_map.missing;

        if (bar.color_map.type == "discrete") {
          for (let i = 0; i < bar.color_map.colors.length; i++) {
            KAE(key,axis,"color"+i,"colorPref").value = bar.color_map.colors[i];
          }
        } else {
          KAE(key,axis,"barTypePref").value = bar.bar_type;
          showPlotTypeProperties(key,axis);
          if (["bar_plot","scatter_plot"].includes(bar.bar_type)) {
            KAE(key,axis,"lowBoundPref").value = bar.low_bound;
            KAE(key,axis,"highBoundPref").value = bar.high_bound;
            KAE(key,axis,"fgColorPref").value = bar.fg_color;
            KAE(key,axis,"bgColorPref").value = bar.bg_color;
          } else {
            // It's a normal color plot.
            for (let i = 0; i < bar.color_map.colors.length; i++) {
              KAE(key,axis,"color"+i,"colorPref").value = bar.color_map.colors[i];
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
      const showElement = KAE(key,axis,"showPref");
      const heightElement = KAE(key,axis,"heightPref");
      if (debug) console.log ("applyTabPrefs: ", { key, axis, show: showElement.value, height:heightElement.value, type: colorMapMan.getColorMap(axis,key).getType() });
      if (heightElement.value === "0") {
        showElement.checked = false;
      }
      UPM.heatMap.setClassificationPrefs(
        key,
        axis,
        showElement.checked,
        heightElement.value,
      );
      if (colorMapMan.getColorMap(axis, key).getType() === "continuous") {
        UPM.heatMap.setClassBarScatterPrefs(
          key,
          axis,
          KAE(key,axis,"barTypePref").value,
          KAE(key,axis,"lowBoundPref").value,
          KAE(key,axis,"highBoundPref").value,
          KAE(key,axis,"fgColorPref").value,
          KAE(key,axis,"bgColorPref").value,
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
    console.error ("KAE: Could not find element " + id);
    throw new Error ("KAE: Could not find element " +id);
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
    UHM.setTableRowX(prefContents, [
      "Size:",
      totalRows + " rows by " + totalCols + " columns",
    ]);
    UHM.setTableRowX(prefContents, ["Description:", mapInfo.description]);
    UHM.setTableRowX(prefContents, [
      "Build time:",
      mapInfo.attributes["chm.info.build.time"],
    ]);
    UHM.setTableRowX(prefContents, ["Read Only:", mapInfo.read_only]);

    UHM.setTableRowX(prefContents, ["VERSIONS:"], ["header"], [{ colSpan: 2 }]);
    UHM.setTableRowX(prefContents, ["Viewer Version:", COMPAT.version]);
    UHM.setTableRowX(prefContents, ["Map Version:", mapInfo.version_id]);
    UHM.setTableRowX(prefContents, [
      "Builder Version:",
      mapInfo.builder_version,
    ]);

    UHM.setTableRowX(prefContents, ["LAYERS:"], ["header"], [{ colSpan: 2 }]);
    for (let dl in mapInfo.data_layer) {
      UHM.setTableRowX(prefContents, [dl + ":", mapInfo.data_layer[dl].name]);
    }

    UHM.setTableRowX(
      prefContents,
      ["ATTRIBUTES:"],
      ["header"],
      [{ colSpan: 2 }],
    );
    const omit = [/^chm/, /^!/];
    const pass = [/^chm.info.external.url/, /^!extraparam/];
    for (let attr in mapInfo.attributes) {
      if (!matchAny(attr, omit) || matchAny(attr, pass)) {
        let attrVal = mapInfo.attributes[attr];
        if (/.external.url/.test(attr)) {
          attrVal = UTIL.newElement("A", { href: attrVal, target: "_blank" }, [
            attrVal,
          ]);
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
        UPM.heatMap.getTotalElementsForAxis(axis) -
        mapInfo["map_cut_" + axis + "s"];
      UHM.setTableRow(prefContents, [
        `&nbsp;&nbsp;Total ${camelAxis}s:`,
        totalElements,
      ]);
      addLabelTypeInputs(prefContents, UPM.heatMap, axis);
      UHM.setTableRow(prefContents, [
        "&nbsp;&nbsp;Ordering Method:",
        axisOrder,
      ]);
      if (axisOrder === "Hierarchical") {
        UHM.setTableRow(prefContents, [
          "&nbsp;&nbsp;Agglomeration Method:",
          axisOrganization["agglomeration_method"],
        ]);
        UHM.setTableRow(prefContents, [
          "&nbsp;&nbsp;Distance Metric:",
          axisOrganization["distance_metric"],
        ]);
        const dendroShowSelect = UTIL.newElement(
          "SELECT.ngchm-upm-input",
          { name: axis + "_DendroShowPref", id: axis + "_DendroShowPref" },
          dendroShowOptions(),
          function (el) {
            el.dataset.axis = axis;
            return el;
          },
        );
        UHM.setTableRow(prefContents, [
          "&nbsp;&nbsp;Show Dendrogram:",
          dendroShowSelect,
        ]);
        const dendroHeightSelect =
          `<select class='ngchm-upm-input' name='${axis}_DendroHeightPref' id='${axis}_DendroHeightPref'>` +
          dendroHeightOptions +
          "</select>";
        UHM.setTableRow(prefContents, [
          "&nbsp;&nbsp;Dendrogram Height:",
          dendroHeightSelect,
        ]);
      }
      UHM.setTableRow(prefContents, [
        "&nbsp;&nbsp;Maximum Label Length:",
        genLabelSizeSelect(axis),
      ]);
      UHM.setTableRow(prefContents, [
        "&nbsp;&nbsp;Trim Label Text From:",
        genLabelAbbrevSelect(axis),
      ]);

      addTopItemsSelector(prefContents, axis, camelAxis+"s");
      UHM.addBlankRow(prefContents);
    }

    rowcolprefs.appendChild(prefContents);

    this.tabDiv.addEventListener("change", (ev) => {
      if (debug) console.log("RowsColsTab: Change handler", { target: ev.target });
      for (const target of this.targetGen(ev)) {
        if (["row_DendroShowPref", "col_DendroShowPref"].includes(target.id)) {
          startChange();
          dendroShowChange(target.dataset.axis);
        } else if (target.id == KAID("row","TopItems")) {
          startChange();
          KAE("row","TopItemsTextRow").style.display = KAE("row","TopItems").value == "--text-entry--" ? "" : "none";
        } else if (target.id == KAID("col","TopItems")) {
          startChange();
          KAE("col","TopItemsTextRow").style.display = KAE("col","TopItems").value == "--text-entry--" ? "" : "none";
        } else if (target.classList.contains('ngchm-upm-input')) {
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
        type: "continuous",
      });
      const covarNames = Object.keys(covars);
      const selector = UTIL.newSelect(
        ["","--text-entry--"].concat(covarNames), // Values
        ["Not Selected", "Manual Entry"].concat(covarNames), // Option texts
      );
      selector.id = KAID(axis,"TopItems");
      selector.classList.add('ngchm-upm-input');
      selector.value = axisConfig.top_items_cv;
      UHM.setTableRow(prefContents, [
        `&nbsp;&nbsp;Top ${pluralAxisName}:`,
        selector,
      ]);
      const id = KAID(axis,"TopItemsText");
      const topItemsText = UTIL.newElement("TEXTAREA.ngchm-upm-input.ngchm-upm-top-items-text", {
        id: id,
        name: id,
        rows: 3,
      });
      topItemsText.value = axisConfig.top_items;
      const tr = UHM.setTableRow(prefContents, [
        `&nbsp;&nbsp;Top ${pluralAxisName} Input:`,
        topItemsText,
      ]);
      tr.id = KAID(axis,"TopItemsTextRow");
      tr.style.display = selector.value == "--text-entry--" ? "" : "none";
    }

    function dendroShowOptions() {
      return [
        UTIL.newElement("OPTION", { value: "ALL" }, "Summary and Detail"),
        UTIL.newElement("OPTION", { value: "SUMMARY" }, "Summary Only"),
        UTIL.newElement("OPTION", { value: "NONE" }, "Hide"),
      ];
    }

    function genLabelSizeSelect(axis) {
      const sizes = [10, 15, 20, 25, 30, 35, 40];
      const id = KAID(axis,"LabelSizePref");
      const sizeInput = UTIL.newElement('INPUT.ngchm-upm-input', {
        type: "number",
        id: id,
        name: id,
        min: 10,
        max: 99,
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
        value: type.type,
      });
      const showType = UTIL.newElement("INPUT.ngchm-upm-input", {
        type: "checkbox",
        name: idbase + "_show",
        id: idbase + "_show",
      });
      showType.checked = type.visible;
      UHM.setTableRow(userPreferencesTable, [
        idx == 0 ? "&nbsp;&nbsp;Labels Type(s):" : "",
        typeInput,
        showType,
      ]);
    });
  }

  // Reset the label type inputs to the values in savedLabelTypes.
  function resetLabelTypeInputs(axisName, savedLabelTypes) {
    axisName = MMGR.isRow(axisName) ? "Row" : "Col";
    savedLabelTypes.forEach((type, idx) => {
      const idbase = `upm_${axisName}_label_part_${idx}`;
      const typeInput = KAE(idbase,"type");
      typeInput.value = type.type;
      const checkBox = KAE(idbase,"show");
      checkBox.checked = type.visible;
    });
  }

  RowsColsTab.prototype.validateTab = function validateRowsColsTab() {
    for (const axis of ["row", "col"]) {
      let errorMsg = validateLabelTypeInputs(axis);
      if (errorMsg) return errorMsg;
      const sizePref = KAE(axis,"LabelSizePref").value;
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
        if (KAE(idbase,"type").value == "") {
          foundEmpty = true;
        }
        return KAE(idbase,"show").checked;
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
      if (KAE_OPT(axis,"DendroShowPref") !== null) {
        const dendroSaveVals = axisResetVal.dendrogram;
        KAE(axis,"DendroShowPref").value = dendroSaveVals.show;
        KAE(axis,"DendroHeightPref").value = dendroSaveVals.height;
        dendroShowChange(axis);
      }
      // Reset axis label options.
      KAE(axis,"LabelSizePref").value = axisResetVal.label_display_length;
      KAE(axis,"LabelAbbrevPref").value = axisResetVal.label_display_method;
      KAE(axis,"TopItems").value = axisResetVal.top_items_cv;
      KAE(axis,"TopItemsText").value = axisResetVal.top_items;
      KAE(axis,"TopItemsTextRow").style.display = axisResetVal.top_items_cv == "--text-entry--" ? "" : "none";
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
        axisConfig.dendrogram.show = KAE(axis,"DendroShowPref").value;
        axisConfig.dendrogram.height = KAE(axis,"DendroHeightPref").value;
      }
      // Apply Label Sizing Preferences.
      axisConfig.label_display_length = KAE(axis,"LabelSizePref").value;
      axisConfig.label_display_method = KAE(axis,"LabelAbbrevPref").value;
      // Top items preferences.
      axisConfig.top_items_cv = KAE(axis,"TopItems").value;
      axisConfig.top_items = [];
      for (const item of KAE(axis,"TopItemsText").value.split(/[;, \r\n]+/)) {
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
        type.type = KAE(idbase,"type").value;
        type.visible = KAE(idbase,"show").checked;
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
        KAE(axis,"DendroShowPref").value = dendroShowVal;
        const heightPref = KAE(axis,"DendroHeightPref");
        if (dendroShowVal === "NONE") {
          const opt = heightPref.options[6];  // options[6] is what the NA option below becomes.
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
    for (const axis of [ "row", "col" ]) {
      const axisConfig = UPM.heatMap.getAxisConfig(axis);
      KAE(axis,"LabelSizePref").value = axisConfig.label_display_length;
      KAE(axis,"LabelAbbrevPref").value = axisConfig.label_display_method;
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
    const newValue = KAE(axis,"DendroShowPref").value;
    const heightPref = KAE(axis,"DendroHeightPref");
    if (newValue === "NONE") {
      // Append an NA option (becomes options[6]) to the height-pref dropdown.
      const option = document.createElement("option");
      option.text = "NA";
      option.value = "10";
      heightPref.add(option);
      heightPref.value = "10";
      heightPref.disabled = true;
    } else if (heightPref.disabled) {
      const opt = heightPref.options[6];  // options[6] is what the NA element becomes.
      if (typeof opt != "undefined") {
        heightPref.options[6].remove();
      }
      heightPref.value = "100";
      heightPref.disabled = false;
    }
  }
})();
