/**********************************************************************************
 * USER PREFERENCE FUNCTIONS:  The following functions handle the processing 
 * for user preference editing. 
 **********************************************************************************/
(function() {
    'use strict';
    NgChm.markFile();

    //Define Namespace for NgChm UserPreferenceManager
    const UPM = NgChm.createNS('NgChm.UPM');

    const UHM = NgChm.importNS('NgChm.UHM');
    const MAPREP = NgChm.importNS('NgChm.MAPREP');
    const MMGR = NgChm.importNS('NgChm.MMGR');
    const UTIL = NgChm.importNS('NgChm.UTIL');
    const DVW = NgChm.importNS('NgChm.DVW');
    const SUM = NgChm.importNS('NgChm.SUM');
    const DET = NgChm.importNS('NgChm.DET');
    const DEV = NgChm.importNS('NgChm.DEV');
    const DMM = NgChm.importNS('NgChm.DMM');
    const CMM = NgChm.importNS('NgChm.CMM');
    const COMPAT = NgChm.importNS('NgChm.CM');

// Define action handlers for static UPM UI elements.
(function () {
    let uiElement;

    uiElement = document.getElementById('colorMenu_btn');
    uiElement.onclick = (ev) => {
	UPM.editPreferences(ev.target, null);
    };

    uiElement = document.getElementById('prefsMove_btn');
    uiElement.onclick = () => {
	UPM.prefsMoveButton();
    };

    uiElement = document.getElementById('redX_btn');
    uiElement.onclick = () => {
	UPM.prefsCancelButton();
    };

    uiElement = document.getElementById('prefMapInfo_btn');
    uiElement.onclick = () => {
	UPM.showInfoPrefs();
    };

    uiElement = document.getElementById('prefLayer_btn');
    uiElement.onclick = () => {
	UPM.showLayerPrefs();
    };

    uiElement = document.getElementById('prefRowsCols_btn');
    uiElement.onclick = () => {
	UPM.showRowsColsPrefs();
    };

    uiElement = document.getElementById('prefClass_btn');
    uiElement.onclick = () => {
	UPM.showClassPrefs();
    };

    uiElement = document.getElementById('menuGear');
    uiElement.onclick = (ev) => {
	UPM.editPreferences(ev.target,null);
    };
})();

//Global variables for preference processing
UPM.bkpColorMaps = null;
UPM.filterVal = null;
UPM.searchPerformed = false;
UPM.resetVal = {};
UPM.applyDone = true;
UHM.previewDiv = null;
UPM.hasClasses = false;

/*===================================================================================
 *  COMMON PREFERENCE PROCESSING FUNCTIONS
 *  
 *  The following functions are utilized to present the entire heat map preferences
 *  dialog and, therefore, sit above those functions designed specifically for processing
 *  individual data layer and covariate classification bar preferences:
 *  	- editPreferences
 *  	- setPrefsDivSizing
 *  	- showLayerPrefs
 *      - showClassPrefs
 *      - showRowsColsPrefs
 *      - prefsCancel
 *      - prefsApply
 *      - prefsValidate
 *      - prefsValidateBreakPoints
 *      - prefsValidateBreakColors
 *      - prefsApplyBreaks
 *      - getNewBreakColors
 *      - getNewBreakThresholds  
 *      - prefsSave
 =================================================================================*/

/**********************************************************************************
 * FUNCTION - editPreferences: This is the MAIN driver function for edit 
 * preferences processing.  It is called under two conditions (1) The Edit 
 * preferences "gear" button is pressed on the main application screen 
 * (2) User preferences have been applied BUT errors have occurred.
 * 
 * Processing for this function is documented in detail in the body of the function.
 **********************************************************************************/
UPM.editPreferences = function(e,errorMsg) {
	UHM.closeMenu();
	UHM.hlpC();

	const prefspanel = document.getElementById("prefs");
	const prefsPanelAlreadyOpen = prefspanel.style.display !== 'none';
	const heatMap = MMGR.getHeatMap();

	var rowClassBarsOrder = heatMap.getRowClassificationOrder();
	var colClassBarsOrder = heatMap.getColClassificationOrder();
	if ((colClassBarsOrder.length > 0) || (rowClassBarsOrder.length > 0)) {
		UPM.hasClasses = true;
	}

	// If helpPrefs element already exists, the user is pressing the gear button
	// when preferences are already open. Disregard.
	var helpExists = document.getElementById('rowsColsprefs');
	if (helpExists !== null) {
		return;
	}

	//If first time thru, save the dataLayer colorMap
	//This is done because the colorMap must be edited to add/delete breakpoints while retaining their state
	if (UPM.bkpColorMaps === null) {
		UPM.bkpColorMaps = new Array();
		var dataLayers = heatMap.getDataLayers();
		for (var key in dataLayers){
			UPM.bkpColorMaps.push(heatMap.getColorMapManager().getColorMap("data",key));
		}
	} 
	
	UPM.resetVal = UPM.getResetVals();
	
	var prefprefs = document.getElementById("prefPrefs");

	if (errorMsg !== null) {
		UPM.setMessage(errorMsg[2]);
	} else {
		//Create and populate map info preferences DIV and add to parent DIV
		const mapinfoprefs = UPM.setupMapInfoPrefs(e, prefprefs);

		//Create and populate row & col preferences DIV and add to parent DIV
		const rowcolprefs = UPM.setupRowColPrefs(e, prefprefs);

		//Create and populate classifications preferences DIV and add to parent DIV
		const classprefs = UPM.setupClassPrefs(e, prefprefs);
		
		//Create and populate breakpoint preferences DIV and add to parent DIV
		const layerprefs = UPM.setupLayerPrefs(e, prefprefs);

		// Set DIV containing both class and break DIVs to visible and append to prefspanel table
		prefprefs.style.display="block";
		
		UPM.setMessage("");
	}

	//If errors exist and they are NOT on the currently visible DIV (dataLayer1),
	//hide the dataLayers DIV, set the tab to "Covariates", and open the appropriate
	//covariate bar DIV.
	if (errorMsg === null) {
		UPM.addClassPrefOptions();
	}
	UPM.showDendroSelections();
	UPM.showLabelSelections();
	UPM.setShowAll();
	if ((errorMsg != null) && (errorMsg[1] === "classPrefs")) {
		UPM.showClassBreak(errorMsg[0], errorMsg[3]);
		UPM.showClassPrefs();
	} else if ((errorMsg != null) && (errorMsg[1] === "layerPrefs")) {
		UPM.showLayerBreak(errorMsg[0]);
		UPM.showLayerPrefs();
	} else if ((errorMsg != null) && (errorMsg[1] === "infoPrefs")) {
		UPM.showInfoPrefs();
	} else if ((errorMsg != null) && (errorMsg[1] === "rowColPrefs")) {
		UPM.showRowsColsPrefs();
	} else if (UPM.searchPerformed) {
		UPM.searchPerformed = false;
		UPM.showClassPrefs();
	} else {
		UPM.showLayerBreak(heatMap.getCurrentDL());
		UPM.showLayerPrefs();
	}
	errorMsg = null;
	if (!prefsPanelAlreadyOpen) {
	    prefspanel.style.display= '';
	    UPM.locatePrefsPanel();
	}
}

/**********************************************************************************
 * FUNCTION - locatePrefsPanel: The purpose of this function is to place the prefs 
 * panel on the screen.
 **********************************************************************************/
UPM.locatePrefsPanel = function() {
	const prefspanel = document.getElementById("prefs");
	const icon = document.querySelector("*[data-prefs-panel-locator]");
	const contBB = UTIL.containerElement.getBoundingClientRect();
	const iconBB = icon.getBoundingClientRect();
	const container = UTIL.containerElement.parentElement;
	prefspanel.style.top = container.offsetTop + 'px';
	prefspanel.style.height = container.offsetHeight + 'px';
	//done for builder panel sizing ONLY
	const screenNotes = document.getElementById('screenNotesDisplay');
	if (screenNotes !== null) {
		notesBB = screenNotes.getBoundingClientRect();
		prefspanel.style.top = (iconBB.top - notesBB.height) + 'px';
	} 
	
	document.getElementById("prefsMove_btn").dataset.state = 'moveLeft';
	prefspanel.style.left = (UTIL.containerElement.getBoundingClientRect().right - (prefspanel.offsetWidth)) + 'px';
}

/**********************************************************************************
 * FUNCTION - setMessage: The purpose of this function is to set the message at 
 * the bottom of the preferences panel when it is drawn or re-drawn.
 **********************************************************************************/
UPM.setMessage = function(errorMsgTxt) {
	const prefActions = document.getElementById ('prefActions');
	const errMsg = prefActions.querySelector ('.errorMessage');
	if (errMsg) {
	    // Remove any existing error message.
	    prefActions.removeChild (errMsg);
	}
	if (errorMsgTxt) {
	    // Add new error message node before the buttons row (first child of prefActions).
	    prefActions.insertBefore (UTIL.newElement('DIV.errorMessage', {}, UTIL.newTxt(errorMsgTxt)), prefActions.firstChild);
	}
	document.getElementById('prefApply_btn').onclick = function() { UPM.prefsApplyButton(); };
	document.getElementById('prefReset_btn').onclick = function() { UPM.prefsResetButton(); };
	document.getElementById('prefClose_btn').onclick = function() { UPM.prefsCancelButton(); };
}

/**********************************************************************************
 * FUNCTION - showRowsColsPrefs: The purpose of this function is to perform the 
 * processing for the preferences tab when the user selects the "Rows & Cols" tab.
 **********************************************************************************/
UPM.showRowsColsPrefs = function() {
    UTIL.showTab ('prefRowsCols_btn');
}

UPM.showInfoPrefs = function() {
    UTIL.showTab ('prefMapInfo_btn');
};

/**********************************************************************************
 * FUNCTION - showLayerPrefs: The purpose of this function is to perform the 
 * processing for the preferences tab when the user selects the "Data Layers" tab.
 **********************************************************************************/
UPM.showLayerPrefs = function() {
    UTIL.showTab ('prefLayer_btn');
	UPM.showLayerBreak();  // ??
}

/**********************************************************************************
 * FUNCTION - showClassPrefs: The purpose of this function is to perform the 
 * processing for the preferences tab when the user selects the "Covariates" tab.
 **********************************************************************************/
UPM.showClassPrefs = function() {
    UTIL.showTab ('prefClass_btn');
}

/**********************************************************************************
 * FUNCTION - prefsCancelButton: The purpose of this function is to perform all processing
 * necessary to exit the user preferences dialog WITHOUT applying or saving any 
 * changes made by the user when the Cancel button is pressed on the ColorMap 
 * preferences dialog.  Since the dataLayer colormap must be edited to add/delete
 * breakpoints, the backup colormap (saved when preferences are first opened) is re-
 * applied to the colorMapManager.  Then the preferences DIV is retrieved and removed.
 **********************************************************************************/
UPM.prefsCancelButton = function() {
	if (UPM.bkpColorMaps !== null) {
		const heatMap = MMGR.getHeatMap();
		var colorMapMgr = heatMap.getColorMapManager();
		var dataLayers = heatMap.getDataLayers();
		var i = 0;
		for (var key in dataLayers){
			colorMapMgr.setColorMap(key, UPM.bkpColorMaps[i], "data");
			i++;
		}
	}
	UPM.removeSettingsPanels();
	//Hide the preferences panel
	document.getElementById('prefs').style.display= 'none';
	UPM.searchPerformed = false;
}

/**********************************************************************************
 * FUNCTION - prefsMoveButton: The purpose of this function is to toggle the preferences
 * editing panel from the left side of the screen to the right (or vice-versa).
 **********************************************************************************/
UPM.prefsMoveButton = function() {
	UHM.hlpC();
	var prefspanel = document.getElementById("prefs");
	var moveBtn = document.getElementById("prefsMove_btn");
	if (moveBtn.dataset.state === 'moveLeft') {
		moveBtn.dataset.state = 'moveRight';
		prefspanel.style.right = "";
		prefspanel.style.left = UTIL.containerElement.offsetLeft + 'px';
	} else {
		moveBtn.dataset.state = 'moveLeft';
		prefspanel.style.right = "";
		prefspanel.style.left = (UTIL.containerElement.getBoundingClientRect().right - (prefspanel.offsetWidth)) + 'px';
	}
}

/**********************************************************************************
 * FUNCTION - removeSettingsPanels: The purpose of this function is to remove all 
 * panels that are content specific before closing the preferences dialog.
 **********************************************************************************/
UPM.removeSettingsPanels = function() {
	
	//Remove all panels that are content specific before closing
	UPM.setMessage ('');
	
	const prefTabs = [...document.getElementById("prefPrefs").children];

	prefTabs.forEach (tab => {
	    while (tab.firstChild) {
		tab.removeChild(tab.firstChild);
	    }
	});
}

/**********************************************************************************
 * FUNCTION - prefsApplyButton: The purpose of this function is to perform all processing
 * necessary to reconfigure the "current" presentation of the heat map in the 
 * viewer when the Apply button is pressed on the ColorMap Preferences Dialog.  
 * First validations are performed.  If errors are found, preference 
 * changes are NOT applied and the user is re-presented with the preferences dialog
 * and the error found.  If no errors are found, all changes are applied to the heatmap 
 * and the summary panel, detail panel, and covariate bars are redrawn.  However, 
 * these changes are not yet permanently  saved to the JSON files that are used to 
 * configure heat map presentation.
 **********************************************************************************/
UPM.prefsApplyButton = function(isReset) {
	disableApplyButton();
	setTimeout(function(){ // wait until the disable button has been updated, otherwise the disable button never shows up
        UPM.doApply(isReset);
   },10);
}

UPM.doApply = function(isReset){
	//Normal processing when not reset
	const heatMap = MMGR.getHeatMap();
	if (typeof isReset === 'undefined') {
		//Perform validations of all user-entered data layer and covariate bar
		//preference changes.
		var errorMsg = UPM.prefsValidate();
		if (errorMsg !== null) {
			UPM.prefsError(errorMsg);
			UPM.applyDone = true;
			enableApplyButton();
		} else {
			UPM.prefsApply();
			heatMap.setUnAppliedChanges(true);
			UPM.prefsSuccess();
			enableApplyButton();
		}
	} else {
		//When resetting no validations need be performed and, if they were, 
		//additional modifications to validation logic would be required.
		UPM.prefsApply();
		heatMap.setUnAppliedChanges(true);
		UPM.prefsSuccess();
		enableApplyButton();
	}
}

/**********************************************************************************
 * FUNCTION - disableApplyButton: This function toggles the Apply button to the   
 * greyed out version when the Apply or Reset button is pressed
 **********************************************************************************/

    function disableApplyButton () {
	const applyButton = document.getElementById("prefApply_btn");
	applyButton.disabled = true;
	UPM.applyDone = false;
    }

/**********************************************************************************
 * FUNCTION - enableApplyButton: This function toggles the Apply button back to the   
 * standard/blue one after the apply/reset has finished
 **********************************************************************************/

    function enableApplyButton () {
	if (UPM.applyDone){ // make sure the apply is done
		const applyButton = document.getElementById("prefApply_btn");
		applyButton.disabled = false;
	} else { // otherwise try again in a bit
		setTimeout(enableApplyButton,500);
	}
    }

/**********************************************************************************
 * FUNCTION - prefsSuccess: The purpose of this function perform the functions
 * necessary when preferences are determined to be valid. It is shared by the
 * Apply and Save buttons.
 **********************************************************************************/
UPM.prefsSuccess = function() {
	UPM.filterVal = null;
	//Remove the backup color map (used to reinstate colors if user cancels)
	//and formally apply all changes to the heat map, re-draw, and exit preferences.
	UPM.bkpColorMaps = null;
	SUM.redrawSummaryPanel();
	DMM.resizeDetailMapCanvases ();
	DET.updateSelections(false); // Do not skip resize: covariate bar changes may require resize
	UPM.applyDone = true;
	UPM.setMessage("");
}

/**********************************************************************************
 * FUNCTION - prefsError: The purpose of this function perform the functions
 * necessary when preferences are determined to be invalid. It is shared by the
 * Apply and Save buttons.
 **********************************************************************************/
UPM.prefsError = function(errorMsg) {
	//If a validation error exists, re-present the user preferences
	//dialog with the error message displayed in red. 
	UPM.filterVal = null;
	UPM.editPreferences(document.getElementById('gear_btn'),errorMsg);
}

/**********************************************************************************
 * FUNCTION - prefsApply: The purpose of this function is to apply all user
 * ColorMap preferences settings.  It is shared by the Apply and Save buttons.
 **********************************************************************************/
UPM.prefsApply = function() {
	// Apply Row & Column Preferences
	const heatMap = MMGR.getHeatMap();
	var rowDendroConfig = heatMap.getRowDendroConfig();
	var rowOrganization = heatMap.getRowOrganization();
	var rowOrder = rowOrganization['order_method'];
	if (rowOrder === "Hierarchical") {
		var rowDendroShowVal = document.getElementById("rowDendroShowPref").value;
		rowDendroConfig.show = rowDendroShowVal;
		rowDendroConfig.height = document.getElementById("rowDendroHeightPref").value;
	}	
	var rowTopItems = document.getElementById("rowTopItems").value.split(/[;, \r\n]+/);
	//Flush top items array
	heatMap.getRowConfig().top_items = [];
	//Fill top items array from prefs element contents
	for (var i=0;i<rowTopItems.length;i++) {
		if (rowTopItems[i]!==""){ 
			heatMap.getRowConfig().top_items.push(rowTopItems[i]);
		}
	}
	var colDendroConfig = heatMap.getColDendroConfig();
	var colOrganization = heatMap.getColOrganization();
	var colOrder = colOrganization['order_method'];
	if (colOrder === "Hierarchical") {
		var colDendroShowVal = document.getElementById("colDendroShowPref").value;
		colDendroConfig.show = colDendroShowVal;
		colDendroConfig.height = document.getElementById("colDendroHeightPref").value;
	}	
	var colTopItems = document.getElementById("colTopItems").value.split(/[;, \r\n]+/);
	heatMap.getColConfig().top_items = [];
	for (var i=0;i<colTopItems.length;i++) {
		if (colTopItems[i]!==""){
			heatMap.getColConfig().top_items.push(colTopItems[i]);
		}
	}
	// Apply Covariate Bar Preferences
	var rowClassBars = heatMap.getRowClassificationConfig();
	for (var key in rowClassBars){
		var currentClassBar = rowClassBars[key];
		var colorMap = heatMap.getColorMapManager().getColorMap("row", key);
		var keyrow = key+"_row";
		var showElement = document.getElementById(keyrow+"_showPref");
		var heightElement = document.getElementById(keyrow+"_heightPref");
		if (heightElement.value === "0") {
			showElement.checked = false;
		}
		heatMap.setClassificationPrefs(key,"row",showElement.checked,heightElement.value);
		var barTypeElement = document.getElementById(keyrow+"_barTypePref");
		var bgColorElement = document.getElementById(keyrow+"_bgColorPref");
		var fgColorElement = document.getElementById(keyrow+"_fgColorPref");
		var lowBoundElement = document.getElementById(keyrow+"_lowBoundPref");
		var highBoundElement = document.getElementById(keyrow+"_highBoundPref");
		if (colorMap.getType() === 'continuous') {
			heatMap.setClassBarScatterPrefs(key, "row", barTypeElement.value, lowBoundElement.value, highBoundElement.value, fgColorElement.value, bgColorElement.value);
		}
		UPM.prefsApplyBreaks(key,"row");
	}
	var colClassBars = heatMap.getColClassificationConfig();
	for (var key in colClassBars){
		var currentClassBar = colClassBars[key];
		var colorMap = heatMap.getColorMapManager().getColorMap("col", key);
		var keycol = key+"_col";
		var showElement = document.getElementById(keycol+"_showPref");
		var heightElement = document.getElementById(keycol+"_heightPref");
		if (heightElement.value === "0") {
			showElement.checked = false;
		}
		heatMap.setClassificationPrefs(key,"col",showElement.checked,heightElement.value);
		var barTypeElement = document.getElementById(keycol+"_barTypePref");
		var bgColorElement = document.getElementById(keycol+"_bgColorPref");
		var fgColorElement = document.getElementById(keycol+"_fgColorPref");
		var lowBoundElement = document.getElementById(keycol+"_lowBoundPref");
		var highBoundElement = document.getElementById(keycol+"_highBoundPref");
		if (colorMap.getType() === 'continuous') {
			heatMap.setClassBarScatterPrefs(key, "col", barTypeElement.value, lowBoundElement.value, highBoundElement.value, fgColorElement.value, bgColorElement.value);
		}
		UPM.prefsApplyBreaks(key,"col");
	} 
	
	// Apply Label Sizing Preferences
	heatMap.getColConfig().label_display_length = document.getElementById("colLabelSizePref").value;
	heatMap.getColConfig().label_display_method = document.getElementById("colLabelAbbrevPref").value;
	heatMap.getRowConfig().label_display_length = document.getElementById("rowLabelSizePref").value;
	heatMap.getRowConfig().label_display_method = document.getElementById("rowLabelAbbrevPref").value;

	// Apply Data Layer Preferences 
	var dataLayers = heatMap.getDataLayers();
	for (var key in dataLayers){
		var showGrid = document.getElementById(key+'_gridPref');
		var gridColor = document.getElementById(key+'_gridColorPref');
		var selectionColor = document.getElementById(key+'_selectionColorPref');
		var gapColor = document.getElementById(key+'_gapColorPref');
		heatMap.setLayerGridPrefs(key, showGrid.checked,gridColor.value,selectionColor.value,gapColor.value)
		UPM.prefsApplyBreaks(key,"data");
		UHM.loadColorPreviewDiv(key);
	}
}

/**********************************************************************************
 * FUNCTION - prefsValidate: The purpose of this function is to validate all user
 * changes to the heatmap properties. When the very first error is found, an error 
 * message (string array containing error information) is created and returned to 
 * the prefsApply function. 
 **********************************************************************************/
UPM.prefsValidate = function() {
	const heatMap = MMGR.getHeatMap();

	if (document.getElementById("rowTopItems").value.split(/[;, ]+/).length > 10) {
		return  ["ALL", "rowColPrefs", "ERROR: Top Row entries cannot exceed 10"];
	};
	if (document.getElementById("colTopItems").value.split(/[;, ]+/).length > 10) {
		return  ["ALL", "rowColPrefs", "ERROR: Top Column entries cannot exceed 10"];
	};
	return UPM.prefsValidateForNumeric() || validateDataLayers() || validateAxis ("row") || validateAxis ("col");

	function validateDataLayers () {
	    const dataLayers = heatMap.getDataLayers();
	    for (let key in dataLayers) {
		const errorMsg = prefsValidateBreakPoints("data", key,"layerPrefs");
		if (errorMsg != null) return errorMsg;
	    }
	    return null;
	}

	function validateAxis (axis) {
	    const covBars = heatMap.getAxisCovariateConfig(axis);
	    for (let [key,config] of Object.entries(covBars)) {
		if (config.color_map.type == 'continuous') {
		    const errorMsg = prefsValidateBreakPoints(axis, key, "classPrefs");
		    if (errorMsg != null) return errorMsg;
		}
	    }
	    return null;
	}
}


/**********************************************************************************
 * FUNCTION - prefsValidateInputBoxs: The purpose of this function is to validate 
 * all user text input boxes that require positive numeric values. 
 **********************************************************************************/
UPM.prefsValidateForNumeric = function() {
	const heatMap = MMGR.getHeatMap();
	var errorMsg = null;
	var rowClassBars = heatMap.getRowClassificationConfig();
	for (var key in rowClassBars) {
		var currentClassBar = rowClassBars[key];
		var keyrow = key+"_row";
		var elem = document.getElementById(key+"_row_heightPref");
		var elemVal = elem.value;
		var rowBarType = document.getElementById(key + "_row_barTypePref");
		if ((isNaN(elemVal)) || (parseInt(elemVal) < 0) || (elemVal === "")) {
			errorMsg =  ["ALL", "classPrefs", "ERROR: Bar heights must be between 0 and 99"];
		    return errorMsg;
		}
		if ((rowBarType !== null) && (rowBarType.value !== 'color_plot')) {
			var lowBoundElement = document.getElementById(keyrow+"_lowBoundPref");
			if (isNaN(lowBoundElement.value)) {
				errorMsg =  [keyrow, "classPrefs", "ERROR: Covariate bar low bound must be numeric"];
			    return errorMsg;
			}
			var highBoundElement = document.getElementById(keyrow+"_highBoundPref");
			if (isNaN(highBoundElement.value)) {
				errorMsg =  [keyrow, "classPrefs", "ERROR: Covariate bar high bound must be numeric"];
			    return errorMsg;
			}
			var bgColorElement = document.getElementById(keyrow+"_bgColorPref");
			var fgColorElement = document.getElementById(keyrow+"_fgColorPref");
			if (bgColorElement.value === fgColorElement.value) {
				errorMsg =  [keyrow, "classPrefs", "ERROR: Duplicate foreground and background colors found"];
			    return errorMsg;
			}
		}
	}
	if (errorMsg === null) {
		var colClassBars = heatMap.getColClassificationConfig();
		for (var key in colClassBars) {
			var keycol = key+"_col";
			var currentClassBar = colClassBars[key];
			var elem = document.getElementById(key+"_col_heightPref");
			var elemVal = elem.value;
			var colBarType = document.getElementById(key + "_col_barTypePref");
			if ((isNaN(elemVal)) || (parseInt(elemVal) < 0) || (elemVal === "")) {
				errorMsg =  ["ALL", "classPrefs", "ERROR: Bar heights must be between 0 and 99"];
				 return errorMsg;
			}
			if ((colBarType !== null) && (colBarType.value !== 'color_plot')) {
				var lowBoundElement = document.getElementById(keycol+"_lowBoundPref");
				if (isNaN(lowBoundElement.value)) {
					errorMsg =  [keycol, "classPrefs", "ERROR: Covariate bar low bound must be numeric"];
				    return errorMsg;
				}
				var highBoundElement = document.getElementById(keycol+"_highBoundPref");
				if (isNaN(highBoundElement.value)) {
					errorMsg =  [keycol, "classPrefs", "ERROR: Covariate bar high bound must be numeric"];
				    return errorMsg;
				}
				var bgColorElement = document.getElementById(keycol+"_bgColorPref");
				var fgColorElement = document.getElementById(keycol+"_fgColorPref");
				if (bgColorElement.value === fgColorElement.value) {
					errorMsg =  [keycol, "classPrefs", "ERROR: Duplicate foreground and background colors found"];
				    return errorMsg;
				}
			}
		}
	}
	
	return errorMsg;
}

/**********************************************************************************
 * FUNCTION - prefsValidateBreakPoints: The purpose of this function is to validate 
 * all user breakpoint and color changes to heatmap data layer properties. When the  
 * first error is found, an error  message (string array containing error information) 
 * is created and returned to the prefsApply function. 
 **********************************************************************************/
    function prefsValidateBreakPoints (colorMapAxis, colorMapName, prefPanel) {
	const heatMap = MMGR.getHeatMap();
	var colorMap = heatMap.getColorMapManager().getColorMap(colorMapAxis, colorMapName);
	var thresholds = colorMap.getThresholds();
	var colors = colorMap.getColors();
	var charBreak = false;
	var dupeBreak = false;
	var breakOrder = false;
	var prevBreakValue = MAPREP.minValues;
	var errorMsg = null;
	const elementIdPrefix = colorMapName + (colorMapAxis == "data" ? "" : "_" + colorMapAxis) + "_breakPt";
	//Loop thru colormap thresholds and validate for order and duplicates
	for (var i = 0; i < thresholds.length; i++) {
		const breakElementId = elementIdPrefix+i+"_breakPref";
		const breakElement = document.getElementById(breakElementId);
		if (!breakElement) {
		    console.error ('Unable to find breakElement for ' + breakElementId);
		    continue;
		}
		//If current breakpoint is not numeric
		if ((isNaN(breakElement.value)) || (breakElement.value === "")) {
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
			var be = document.getElementById(elementIdPrefix+j+"_breakPref");
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
		errorMsg =  [colorMapName, prefPanel, "ERROR: Breakpoints must be numeric", colorMapAxis];
	}
	if (breakOrder) {
		errorMsg =  [colorMapName, prefPanel, "ERROR: Breakpoints must be in increasing order", colorMapAxis];
	}
	if (dupeBreak) {
		errorMsg =  [colorMapName, prefPanel, "ERROR: Duplicate breakpoint found", colorMapAxis];
	}
	
	return errorMsg;
    }

/**********************************************************************************
 * FUNCTION - prefsValidateBreakColors: The purpose of this function is to validate 
 * all user color changes to heatmap classification and data layer properties. When the  
 * first error is found, an error  message (string array containing error information) 
 * is created and returned to the prefsApply function. 
 **********************************************************************************/
UPM.prefsValidateBreakColors = function(colorMapName,type, prefPanel) {
	const heatMap = MMGR.getHeatMap();
	var colorMap = heatMap.getColorMapManager().getColorMap(type,colorMapName);
	var key = colorMapName;
	if (type !== "data") {
		key = key+"_"+type;
	}
	var thresholds = colorMap.getThresholds();
	var colors = colorMap.getColors();
	var dupeColor = false;
	for (var i = 0; i < colors.length; i++) {
		for (var j = 0; j < thresholds.length; j++) {
			var ce = document.getElementById(key+"_color"+j+"_colorPref"); 
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
 * FUNCTION - prefsApplyBreaks: The purpose of this function is to apply all 
 * user entered changes to colors and breakpoints. 
 **********************************************************************************/
UPM.prefsApplyBreaks = function(colorMapName, colorMapAxis) {

	const heatMap = MMGR.getHeatMap();
	var colorMap = heatMap.getColorMapManager().getColorMap(colorMapAxis,colorMapName);
	var thresholds = colorMap.getThresholds();
	var colors = colorMap.getColors();
	var newColors = getNewBreakColors(colorMapAxis, colorMapName);
	colorMap.setColors(newColors);
	var key = colorMapName;
	if (colorMap.getType() != 'discrete') {
	    const newThresholds = getNewBreakThresholds(colorMapAxis, colorMapName);
	    colorMap.setThresholds(newThresholds);
	}
	if (colorMapAxis !== "data") {
	    key += "_" + colorMapAxis;
	}
	var missingElement = document.getElementById(key+"_missing_colorPref");
	colorMap.setMissingColor(missingElement.value);
	var colorMapMgr = heatMap.getColorMapManager();
	colorMapMgr.setColorMap(colorMapName, colorMap, colorMapAxis);
}

/**********************************************************************************
 * FUNCTION - getNewBreakColors: The purpose of this function is to grab all user
 * color entries for a given colormap and place them on a string array.  It will 
 * iterate thru the screen elements, pulling the current color entry for each 
 * element, placing it in a new array, and returning that array. This function is 
 * called by the prefsApplyBreaks function.  It is ALSO called from the data layer
 * addLayerBreak and deleteLayerBreak functions with parameters passed in for 
 * the position to add/delete and the action to be performed (add/delete).
 **********************************************************************************/
    function getNewBreakColors (colorMapAxis, colorMapName, pos, action) {
	const heatMap = MMGR.getHeatMap();
	var colorMap = heatMap.getColorMapManager().getColorMap(colorMapAxis,colorMapName);
	var thresholds = colorMap.getThresholds();
	var newColors = [];
	var key = colorMapName;
	if (colorMapAxis !== "data") {
		key = key+"_"+colorMapAxis;
	}
	let prevColorElement = document.getElementById(key+"_color0_colorPref");
	if (pos == 0 && action == 'add') {
	    newColors.push (UTIL.blendTwoColors("#000000", prevColorElement.value));
	}
	if (pos != 0 || action != 'delete') {
	    newColors.push (prevColorElement.value);  // color0
	}
	for (let j = 1; j < thresholds.length; j++) {
		const colorElement = document.getElementById(key+"_color"+j+"_colorPref");
		//In case there are now less elements than the thresholds list on Reset.
		if (colorElement !== null) {
			//If being called from addLayerBreak or deleteLayerBreak
			if (typeof pos !== 'undefined') {
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
	if (pos == thresholds.length && action == 'add') {
	    newColors.push (UTIL.blendTwoColors("#000000", prevColorElement.value));
	}
	
	//If this color map is for a row/col class bar AND that bar is a scatter or
	//bar plot (colormap will always be continuous), set the upper colormap color
	//to the foreground color set by the user for the bar/scatter plot. This is
	//default behavior that happens when a map is built but must be managed as
	//users change preferences and bar types.
	if (colorMapAxis !== "data") {
		var classBar = heatMap.getColClassificationConfig()[colorMapName];
		if (colorMapAxis === "row") {
			classBar = heatMap.getRowClassificationConfig()[colorMapName];
		}
		if (classBar.bar_type != 'color_plot') {
			newColors[1] = classBar.fg_color;
		}
	} else {
		//Potentially on a data layer reset, there could be more color points than contained in the thresholds object
		//because a user may have deleted a breakpoint and then hit "reset". So we check for up to 50 preferences.
		for (var k = thresholds.length; k < 50; k++) {
			var colorElement = document.getElementById(key+"_color"+k+"_colorPref");
			if (colorElement !== null) {
				newColors.push(colorElement.value);
			} 
		} 
	}
	return newColors;
}

/**********************************************************************************
 * FUNCTION - getNewBreakThresholds: The purpose of this function is to grab all user
 * data layer breakpoint entries for a given colormap and place them on a string array.  
 * It will  iterate thru the screen elements, pulling the current breakpoint entry for each 
 * element, placing it in a new array, and returning that array. This function is 
 * called by the prefsApplyBreaks function (only for data layers).  It is ALSO called 
 * from the data layer addLayerBreak and deleteLayerBreak functions with parameters 
 * passed in for the position to add/delete and the action to be performed (add/delete).
 **********************************************************************************/
function getNewBreakThresholds (colorMapAxis, colorMapName, pos, action) {
	const heatMap = MMGR.getHeatMap();
	var colorMap = heatMap.getColorMapManager().getColorMap(colorMapAxis,colorMapName);
	let elementIdPrefix = colorMapName;
	if (colorMapAxis != "data") elementIdPrefix += "_" + colorMapAxis;
	var thresholds = colorMap.getThresholds();
	var newThresholds = [];
	let prevBreakElement = document.getElementById(elementIdPrefix+"_breakPt0_breakPref");
	let prevBreakValue = Number(prevBreakElement.value);
	if (pos == 0 && action == 'add') {
		newThresholds.push(prevBreakValue - 1);
	}
	if (pos != 0 || action != 'delete') {
	    newThresholds.push(prevBreakValue);
	}
	for (let j = 1; j < thresholds.length; j++) {
		const breakElement = document.getElementById(elementIdPrefix+"_breakPt"+j+"_breakPref");
		const breakValue = Number(breakElement.value);
		//In case there are now less elements than the thresholds list on Reset.
		if (breakElement !== null) {
			if (typeof pos !== 'undefined') {
				if (action === "add") {
					if (j === pos) {
						//calculate the difference between last and next breakpoint values and divide by 2 to get the mid-point between.
						const breakDiff = breakValue - prevBreakValue;
						//add mid-point to last breakpoint.
						const calcdBreak = (prevBreakValue + breakDiff/2).toFixed(4);
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
	for (var k = thresholds.length; k < 50; k++) {
		var breakElement = document.getElementById(elementIdPrefix+"_breakPt"+k+"_breakPref");
		if (breakElement !== null) {
			newThresholds.push(breakElement.value);
		}
	} 
	
	return newThresholds;
}

/*===================================================================================
  *  DATA LAYER PREFERENCE PROCESSING FUNCTIONS
  *  
  *  The following functions are utilized to present heat map data layer 
  *  configuration options:
  *  	- setupLayerPrefs
  *  	- setupLayerBreaks
  *     - addLayerBreak
  *     - deleteLayerBreak
  *     - reloadLayerBreaksColorMap
  =================================================================================*/

/**********************************************************************************
 * FUNCTION - setupLayerPrefs: The purpose of this function is to construct a DIV 
 * panel containing all data layer preferences.  A dropdown list containing all 
 * data layers is presented and individual DIVs for each data layer, containing 
 * breakpoints/colors, are added.
 **********************************************************************************/
UPM.setupLayerPrefs = function(e, prefprefs) {
	const heatMap = MMGR.getHeatMap();
	const layerprefs = document.getElementById ("layerPrefs");
	const prefContents = document.createElement("TABLE");
	const dataLayers = heatMap.getDataLayers();

	UHM.addBlankRow(prefContents);
	const dlSelect = UTIL.newElement("SELECT", { name: 'dlPref_list', id: 'dlPref_list' }, null, function (el) {
	   el.onchange = function () { UPM.showLayerBreak(); }
	   return el;
	});

	// Re-order options in datalayer order (which is lost on JSON save)
	const dls = new Array(Object.keys(dataLayers).length);
	const orderedKeys = new Array(Object.keys(dataLayers).length);
	for (let key in dataLayers) {
		const dlNext = key.substring(2, key.length);
		orderedKeys[dlNext-1] = key;
		let displayName = dataLayers[key].name;
		if (displayName.length > 20){
			displayName = displayName.substring(0,17) + "...";
		}
		dls[dlNext-1] = UTIL.newElement('OPTION', { value: key }, displayName);
	}
	for (let i=0;i<dls.length;i++) {
		dlSelect.appendChild (dls[i]);
	}

	UHM.setTableRow(prefContents,["&nbsp;Data Layer: ", dlSelect]);
	UHM.addBlankRow(prefContents, 2)
	layerprefs.appendChild(prefContents);
	UHM.addBlankRow(prefContents)

	// Loop data layers, setting up a panel div for each layer
	for (let key in dataLayers) {
		const breakprefs = setupLayerBreaks("data", key);
		breakprefs.style.display="none";
		layerprefs.appendChild(breakprefs);
	}

	return layerprefs;
}

    /* Generate a color scheme preset element.
     * It consists of a gradient bar for the colors in the color scheme
     * followed by a box containing the color for missing values.
     * When clicked, the layer (based on key, axis, and mapType) breaks
     * are set to those of the preset.
     *
     * A unique id is assigned to each new preset to assist automated tests.
     */
    var presetId = 0;
    function genPreset (key, colors, missingColor, axis, mapType) {
	++presetId;
	const gradient = 'linear-gradient(to right, ' + colors.join(', ') + ')';
	const colorsEl = UTIL.newElement ('DIV.presetPalette', { id: 'preset' + presetId, style: { background: gradient }}, null, function(el) {
	    el.onclick = onclick;
	    return el;
	});
	const missingEl = UTIL.newElement ('DIV.presetPaletteMissingColor', { style: { background: missingColor }}, null, function(el) {
	    el.onclick = onclick;
	    return el;
	});
	return UTIL.newElement ('DIV', { style: { display: 'flex' }}, [ colorsEl, missingEl ]);
	function onclick(event) { UPM.setupLayerBreaksToPreset(event, key, colors, missingColor, axis, mapType); }
    }

/**********************************************************************************
 * FUNCTION - setupLayerBreaks: The purpose of this function is to construct a DIV 
 * containing a list of breakpoints/colors for a given matrix data layer.
 **********************************************************************************/
    function setupLayerBreaks (colorMapAxis, mapName) {
	const heatMap = MMGR.getHeatMap();
	var colorMap = heatMap.getColorMapManager().getColorMap(colorMapAxis,mapName);
	var thresholds = colorMap.getThresholds();
	var colors = colorMap.getColors();
	var helpprefs = UTIL.newElement("DIV#breakPrefs_"+mapName);
	var prefContents = document.createElement("TABLE"); 
	var dataLayers = heatMap.getDataLayers();
	var layer = dataLayers[mapName];
	var gridShow = "<input name='"+mapName+"_gridPref' id='"+mapName+"_gridPref' type='checkbox' ";
	if (layer.grid_show == 'Y') {
		gridShow = gridShow+"checked"
	}
	gridShow = gridShow+ " >";
	var gridColorInput = "<input class='spectrumColor' type='color' name='"+mapName+"_gridColorPref' id='"+mapName+"_gridColorPref' value='"+layer.grid_color+"'>"; 
	var selectionColorInput = "<input class='spectrumColor' type='color' name='"+mapName+"_selectionColorPref' id='"+mapName+"_selectionColorPref' value='"+layer.selection_color+"'>"; 
	var gapColorInput = "<input class='spectrumColor' type='color' name='"+mapName+"_gapColorPref' id='"+mapName+"_gapColorPref' value='"+layer.cuts_color+"'>"; 
	UHM.addBlankRow(prefContents, 2)
	UHM.setTableRow(prefContents, ["&nbsp;<u>Breakpoint</u>", "<u><b>Color</b></u>","&nbsp;"]);
	UHM.setTableRow(prefContents, ["&nbsp;",null,null]);

	const breakpts = UTIL.newElement("TABLE#breakPrefsTable_"+mapName);
	fillBreaksTable (breakpts, "data", mapName, thresholds, colors);
	UHM.setTableRow(prefContents, [breakpts], 3);
	UHM.addBlankRow(prefContents)
	UHM.setTableRow(prefContents, ["&nbsp;Missing Color:",  "<input class='spectrumColor' type='color' name='"+mapName+"_missing_colorPref' id='"+mapName+"_missing_colorPref' value='"+colorMap.getMissingColor()+"'>"]);
	UHM.addBlankRow(prefContents, 3)
	// predefined color schemes put here
	UHM.setTableRow(prefContents, ["&nbsp;<u>Choose a pre-defined color palette:</u>"],3);
	UHM.addBlankRow(prefContents);
	var rainbow = genPreset (mapName, ["#FF0000","#FF8000","#FFFF00","#00FF00","#0000FF","#FF00FF"], "#000000");
	var redWhiteBlue = genPreset (mapName, ["#0000FF","#FFFFFF","#ff0000"],"#000000");
	var redBlackGreen = genPreset (mapName, ["#00FF00","#000000","#FF0000"],"#ffffff");
	UHM.setTableRow(prefContents, [ redWhiteBlue, rainbow, redBlackGreen ]);
	UHM.setTableRow(prefContents, ["&nbsp;Blue Red",  "&nbsp;<b>Rainbow</b>","&nbsp;<b>Green Red</b>"]);
	UHM.addBlankRow(prefContents, 3)
	UHM.setTableRow(prefContents, ["&nbsp;Grid Lines:", gridColorInput, "<b>Grid Show:&nbsp;&nbsp;</b>"+gridShow]);
	UHM.setTableRow(prefContents, ["&nbsp;Selection Color:", selectionColorInput, "<b>Gap Color:&nbsp;&nbsp;</b>"+gapColorInput]);
	
	UHM.addBlankRow(prefContents, 3);
	UHM.setTableRow(prefContents, [
		"&nbsp;Color Histogram:",
		UTIL.newElement('DIV.buttonGroup', {},
		    UTIL.newElement('BUTTON', { type: 'button' },
			UTIL.newElement('SPAN.button', {}, 'Update'),
			function(el) {
			   el.onclick = function() { UHM.loadColorPreviewDiv(mapName); };
			   return el;
			}),
		),
	]);
	var previewDiv = "<div id='previewWrapper"+mapName+"' style='display:flex; height: 100px; width: 110px;position:relative;' ></div>";//UHM.loadColorPreviewDiv(mapName,true);
	UHM.setTableRow(prefContents, [previewDiv]);
	UHM.addBlankRow(prefContents, 3);
	helpprefs.style.height = prefContents.rows.length;
	helpprefs.appendChild(prefContents);
	setTimeout(function(mapName){UHM.loadColorPreviewDiv(mapName,true)},100,mapName);
	return helpprefs;
}	

	function fillBreaksTable (breakpts, colorMapAxis, layerName, thresholds, colors) {
	    // Remove any existing elements.
	    while (breakpts.firstChild) {
		breakpts.removeChild (breakpts.firstChild);
	    }
	    const elementIdPrefix = layerName + (colorMapAxis == "data" ? "" : "_" + colorMapAxis);
	    for (let j = 0; j <= thresholds.length; j++) {
		    const threshId =  elementIdPrefix + "_breakPt" + j;
		    const buttonsDiv = UTIL.newElement('DIV.colorTableButtons');
		    const addButton = UTIL.newSvgButton('icon-plus', {
			id: threshId+'_breakAdd',
		    }, function (el) {
			el.onclick = (function(j,layerName) { return function() { addLayerBreak(colorMapAxis, j, layerName); }; })(j, layerName);
			return el;
		    });
		    buttonsDiv.appendChild (addButton);
		    if (j == thresholds.length) {
			UHM.setTableRow(breakpts, [null, null, buttonsDiv]);
			break;
		    }
		    var threshold = thresholds[j];
		    var color = colors[j];
		    var colorId = elementIdPrefix + "_color" + j;
		    var breakPtInput = "&nbsp;&nbsp;<input name='"+threshId+"_breakPref' id='"+threshId+"_breakPref' value='"+threshold+"' maxlength='8' size='8'>";
		    var colorInput = "<input class='spectrumColor' type='color' name='"+colorId+"_colorPref' id='"+colorId+"_colorPref' value='"+color+"'>";
		    if (thresholds.length == 1) {
			    UHM.setTableRow(breakpts, [breakPtInput, colorInput, buttonsDiv]);
		    } else {
			    const delButton = UTIL.newSvgButton ('icon-big-x', {
				id: threshId+'_breakDel',
			    }, function (el) {
				el.onclick = (function(j,layerName) { return function() { deleteLayerBreak(colorMapAxis, j, layerName); }; })(j, layerName);
				return el;
			    });
			    buttonsDiv.appendChild (delButton);
			    UHM.setTableRow(breakpts, [breakPtInput,  colorInput, buttonsDiv ]);
		    }
	    }
	}

/**********************************************************************************
 * FUNCTION - getTempCM: This function  will create a dummy color map object to be 
 * used by loadColorPreviewDiv. If the gear menu has just been opened (firstLoad), the
 * saved values from the color map manager will be used. Otherwise, it will read the 
 * values stored in the input boxes, as these values may differ from the ones stored
 * in the color map manager.
 **********************************************************************************/
UHM.getTempCM = function(mapName,firstLoad){
	var tempCM = {"colors":[],"missing":"","thresholds":[],"type":"linear"};
	if (firstLoad){
		var colorMap = MMGR.getHeatMap().getColorMapManager().getColorMap("data",mapName);
		tempCM.thresholds = colorMap.getThresholds();
		tempCM.colors = colorMap.getColors();
		tempCM.missing = colorMap.getMissingColor();
	} else {
		var i=0;
		var bp = document.getElementById(mapName+"_breakPt"+[i]+"_breakPref");
		var color = document.getElementById(mapName+"_color"+[i]+"_colorPref");
		while(bp && color){
			tempCM.colors.push(color.value);
			tempCM.thresholds.push(bp.value);
			i++;
			bp = document.getElementById(mapName+"_breakPt"+[i]+"_breakPref");
			color = document.getElementById(mapName+"_color"+[i]+"_colorPref");
		}
		var missing = document.getElementById(mapName+"_missing_colorPref");
		tempCM.missing = missing.value;
	}
	return tempCM;
}

/**********************************************************************************
 * FUNCTION - loadColorPreviewDiv: This function will update the color distribution
 * preview div to the current color palette in the gear panel
 **********************************************************************************/
UHM.loadColorPreviewDiv = function(mapName,firstLoad){
	var cm = UHM.getTempCM(mapName,firstLoad);
	var gradient = "linear-gradient(to right"
	var numBreaks = cm.thresholds.length;
	var highBP = parseFloat(cm.thresholds[numBreaks-1]);
	var lowBP = parseFloat(cm.thresholds[0]);
	var diff = highBP-lowBP;
	for (var i=0;i<numBreaks;i++){
		var bp = cm.thresholds[i];
		var col = cm.colors[i];
		var pct = Math.round((bp-lowBP)/diff*100);
		gradient += "," + col + " " + pct + "%";
	}
	gradient += ")";
	var wrapper = document.getElementById("previewWrapper"+mapName);

	const heatMap = MMGR.getHeatMap();

	heatMap
	.getSummaryHist (mapName, lowBP, highBP)
	.then (hist => {
	    var svg = "<svg id='previewSVG"+mapName+"' width='110' height='100' style='position:absolute;left:10px;top:20px;'>"
	    for (var i=0;i<hist.bins.length;i++){
		    var rect = "<rect x='" +i*10+ "' y='" +(1-hist.bins[i]/hist.binMax)*100+ "' width='10' height='" +hist.bins[i]/hist.binMax*100+ "' style='fill:rgb(0,0,0);fill-opacity:0;stroke-width:1;stroke:rgb(0,0,0)'> "/*<title>"+hist.bins[i]+"</title>*/+ "</rect>";
		    svg+=rect;
	    }
	    var missingRect = "<rect x='100' y='" +(1-hist.nan/hist.binMax)*100+ "' width='10' height='" +hist.nan/hist.binMax*100+ "' style='fill:rgb(255,255,255);fill-opacity:1;stroke-width:1;stroke:rgb(0,0,0)'> "/* <title>"+hist.nan+"</title>*/+"</rect>";
	    svg+= missingRect;
	    svg+="</svg>";
	    var binNums = "";//"<p class='previewLegend' style='position:absolute;left:0;top:100;font-size:10;'>0</p><p class='previewLegend' style='position:absolute;left:0;top:0;font-size:10;'>"+hist.binMax+"</p>"
	    var boundNums = "<p class='previewLegend' style='position:absolute;left:10px;top:110px;font-size:10px;'>"+lowBP.toFixed(2)+"</p><p class='previewLegend' style='position:absolute;left:90px;top:110px;font-size:10px;'>"+highBP.toFixed(2)+"</p>"

	    var preview = "<div id='previewMainColor"+mapName+"' style='height: 100px; width:100px;background:"+gradient+";position:absolute; left: 10px; top: 20px;'></div>"
		    +"<div id='previewMissingColor"+mapName+"'style='height: 100px; width:10px;background:"+cm.missing+";position:absolute;left:110px;top:20px;'></div>"
		    +svg+binNums+boundNums;
	    wrapper.innerHTML= preview;
	});
}

/**********************************************************************************
 * FUNCTION - setupLayerBreaksToPreset: This function will be executed when the user
 * selects a predefined color scheme. It will fill the first and last breakpoints with the 
 * predefined colors and interpolate the breakpoints in between.
 * "preset" is an array of the colors in HEX of the predefined color scheme
 **********************************************************************************/
UPM.setupLayerBreaksToPreset = function(e, mapName, preset, missingColor,axis,type) {
	var elemName = mapName;
	if (typeof axis != 'undefined') {
		elemName += "_"+axis;
	}
	var i = 0; // find number of breakpoints in the 
	while(document.getElementById(elemName+"_color"+ ++i+"_colorPref")){};
	var lastShown = i-1;
	// create dummy colorScheme
	var thresh = [];
	const heatMap = MMGR.getHeatMap();
	if (document.getElementById(elemName+"_breakPt0_breakPref")){ // if the breakpoints are changeable (data layer)...
		var firstBP = document.getElementById(elemName+"_breakPt0_breakPref").value;
		var lastBP = document.getElementById(elemName+"_breakPt"+ lastShown +"_breakPref").value;
		var range = lastBP-firstBP;
		for (var j = 0; j < preset.length; j++){
			thresh[j] =Number(firstBP)+j*(range/(preset.length-1));
		}
		var colorScheme = {"missing": missingColor,"thresholds": thresh,"colors": preset,"type": "continuous"};
		var csTemp = new CMM.ColorMap(heatMap, colorScheme);
		
		for (var j = 0; j < i; j++) {
			var threshId = mapName+"_breakPt"+j;
			var colorId = mapName+"_color"+j;
			var breakpoint = document.getElementById(threshId+"_breakPref").value;
			document.getElementById(colorId+"_colorPref").value = csTemp.getRgbToHex(csTemp.getColor(breakpoint)); 
		} 
		document.getElementById(mapName+"_missing_colorPref").value = csTemp.getRgbToHex(csTemp.getColor("Missing")); 
	} else { // if the breakpoints are not changeable (covariate bar)...
		if (type == "Discrete"){ // if colors can be mapped directly
			for (var j = 0; j < i; j++) {
				var colorId = elemName+"_color"+j;
				if (j > preset.length){ // in case there are more breakpoints than predef colors, we cycle back
					document.getElementById(colorId+"_colorPref").value = preset[j%preset.length];
				}else{
					document.getElementById(colorId+"_colorPref").value = preset[j];
				} 
			} 
			document.getElementById(elemName+"_missing_colorPref").value = missingColor; 
		} else { // if colors need to be blended
			var colorMap = heatMap.getColorMapManager().getColorMap(axis, mapName)
			var thresholds = colorMap.getThresholds();
			var range = thresholds[thresholds.length-1]-thresholds[0];
			for (var j = 0; j < preset.length; j++){
				thresh[j] = Number(thresholds[0])+j*(range/(preset.length-1));
			}
			var colorScheme = {"missing": missingColor,"thresholds": thresh,"colors": preset,"type": "continuous"};
			var csTemp = new CMM.ColorMap(heatMap, colorScheme);
			for (var j = 0; j < thresholds.length; j++) {
				var colorId = elemName+"_color"+j;
				var breakpoint = thresholds[j];
				document.getElementById(colorId+"_colorPref").value = csTemp.getRgbToHex(csTemp.getColor(breakpoint)); 
			} 
			document.getElementById(elemName+"_missing_colorPref").value = csTemp.getRgbToHex(csTemp.getColor("Missing")); 
		}
	}
}	

/**********************************************************************************
 * FUNCTION - showLayerBreak: The purpose of this function is to show the 
 * appropriate data layer panel based upon the user selection of the 
 * data layer dropdown on the data layer tab of the preferences screen.  This 
 * function is also called when an error is trappped, opening the data layer DIV
 * that contains the erroneous data entry.
 **********************************************************************************/
UPM.showLayerBreak = function(selLayer) {
	var layerBtn = document.getElementById('dlPref_list');
	if (typeof selLayer != 'undefined') {
		layerBtn.value = selLayer;
	} 
	for (var i=0; i<layerBtn.length; i++){
		var layerVal = layerBtn.options[i].value;
		var layerDiv = document.getElementById("breakPrefs_"+layerVal);
		var layerSel = layerBtn.options[i].selected;
		if (layerSel) {
			layerDiv.style.display="block";
		} else {
			layerDiv.style.display="none";
		}
	}
}

/**********************************************************************************
 * FUNCTION - addLayerBreak: The purpose of this function is to add a breakpoint
 * row to a data layer colormap. A new row is created using the preceding row as a 
 * template (i.e. breakpt value and color same as row clicked on).  
 **********************************************************************************/
    function addLayerBreak (colorMapAxis, pos, colorMapName) {
	//Retrieve colormap for data layer
	const colorMap = MMGR.getHeatMap().getColorMapManager().getColorMap(colorMapAxis,colorMapName);
	const newThresholds = getNewBreakThresholds(colorMapAxis, colorMapName, pos, "add");
	const newColors = getNewBreakColors(colorMapAxis, colorMapName, pos, "add");
	colorMap.setThresholds(newThresholds);
	colorMap.setColors(newColors);
	reloadLayerBreaksColorMap(colorMapAxis, colorMapName, colorMap);
    }

/**********************************************************************************
 * FUNCTION - deleteLayerBreak: The purpose of this function is to remove a breakpoint
 * row from a data layer colormap.   
 **********************************************************************************/
    function deleteLayerBreak (colorMapAxis, pos, colorMapName) {
	var colorMap = MMGR.getHeatMap().getColorMapManager().getColorMap(colorMapAxis,colorMapName);
	var thresholds = colorMap.getThresholds();
	var colors = colorMap.getColors();
	var newThresholds = getNewBreakThresholds(colorMapAxis, colorMapName, pos, "delete");
	var newColors = getNewBreakColors(colorMapAxis, colorMapName, pos, "delete");
	//Apply new arrays for thresholds and colors to the datalayer
	//and reload the colormap.
	colorMap.setThresholds(newThresholds);
	colorMap.setColors(newColors);
	reloadLayerBreaksColorMap(colorMapAxis, colorMapName, colorMap);
    }

/**********************************************************************************
 * FUNCTION - reloadLayerBreaksColorMap: The purpose of this function is to reload
 * the colormap for a given data layer.  The add/deleteLayerBreak methods call
 * this common function.  The layerPrefs DIV is retrieved and the setupLayerBreaks
 * method is called, passing in the newly edited colormap. 
 **********************************************************************************/
    function reloadLayerBreaksColorMap (colorMapAxis, colorMapName, colorMap) {
	const colorMapMgr = MMGR.getHeatMap().getColorMapManager();
	colorMapMgr.setColorMap(colorMapName, colorMap, colorMapAxis);
	let breakPrefsId = 'breakPrefs_' + colorMapName;
	if (colorMapAxis != 'data') breakPrefsId += "_" + colorMapAxis;
	let breakPrefs = document.getElementById(breakPrefsId);
	if (breakPrefs){
		breakPrefs.remove();
	}
	if (colorMapAxis == "data") {
	    breakPrefs = setupLayerBreaks(colorMapAxis, colorMapName);
	    breakPrefs.style.display="block";
	    document.getElementById('layerPrefs').appendChild(breakPrefs);
	} else {
	    setupCovariateBreaks (colorMapAxis, colorMapName);
	}
    }

/*===================================================================================
 *  COVARIATE CLASSIFICATION PREFERENCE PROCESSING FUNCTIONS
 *  
 *  The following functions are utilized to present heat map covariate classfication
 *  bar configuration options:
 *  	- setupClassPrefs
 *  	- setupClassBreaks
 *  	- setupAllClassesPrefs
 *      - showAllBars
 *      - setShowAll
 =================================================================================*/

/**********************************************************************************
 * FUNCTION - setupClassPrefs: The purpose of this function is to construct a DIV 
 * panel containing all covariate bar preferences.  A dropdown list containing all 
 * covariate classification bars is presented and individual DIVs for each data layer, 
 * containing  breakpoints/colors, are added. Additionally, a "front panel" DIV is
 * created for "ALL" classification bars that contains preferences that are global
 * to all of the individual bars.
 **********************************************************************************/
UPM.setupClassPrefs = function(e, prefprefs) {
	const heatMap = MMGR.getHeatMap();
	var rowClassBars = heatMap.getRowClassificationConfig();
	var rowClassBarsOrder = heatMap.getRowClassificationOrder();
	var colClassBars = heatMap.getColClassificationConfig();
	var colClassBarsOrder = heatMap.getColClassificationOrder();
	const classprefs = document.getElementById("classPrefs");
	var prefContents = document.createElement("TABLE");
	UHM.addBlankRow(prefContents);
	if (UPM.hasClasses) {
		var filterInput = "<input name='all_searchPref' id='all_searchPref'>";
		const filterButton = UTIL.newElement('BUTTON#all_searchPref_btn.text-button', {
		    align: 'top',
		}, [
		    UTIL.newElement('SPAN.button', {}, 'Filter Covariates'),
		], function (el) {
		    el.onclick = function () { UPM.filterClassPrefs(true); };
		    return el;
		});
		UHM.setTableRow(prefContents,[filterInput,filterButton], 4, 'right');
		UHM.addBlankRow(prefContents,2);
		var classSelect = UTIL.newElement('SELECT#classPref_list', { name: 'classPref_list' }, null, function(el) {
		    el.onchange = function() { UPM.showClassBreak(); };
		    return el;
		});
		UHM.setTableRow(prefContents,["&nbsp;Covariate Bar: ", classSelect]);
		UHM.addBlankRow(prefContents);
		classprefs.appendChild(prefContents);
		var i = 0;
		for (var i = 0; i < rowClassBarsOrder.length;i++){
			var key = rowClassBarsOrder[i];
			var currentClassBar = rowClassBars[key];
			if (UPM.filterShow(key)) {
				var breakprefs = UPM.setupClassBreaks(e, key, "row", currentClassBar);
				breakprefs.style.display="none";
				//breakprefs.style.width = 300;
				classprefs.appendChild(breakprefs);
			}
		}
		for (var i = 0; i < colClassBarsOrder.length;i++){
			var key = colClassBarsOrder[i];
			var currentClassBar = colClassBars[key];
			if (UPM.filterShow(key)) {
				var breakprefs = UPM.setupClassBreaks(e, key, "col", currentClassBar);
				breakprefs.style.display="none";
				//breakprefs.style.width = 300;
				classprefs.appendChild(breakprefs);
			}
		}
		// Append a DIV panel for all of the covariate class bars 
		var allPrefs = UPM.setupAllClassesPrefs();
		allPrefs.style.display="block";
		classprefs.appendChild(allPrefs);
	} else {
		UHM.setTableRow(prefContents,["This Heat Map contains no covariate bars"]);
		classprefs.appendChild(prefContents);
	}
	
	return classprefs;
}

/**********************************************************************************
 * FUNCTION - setupAllClassesPrefs: The purpose of this function is to construct a DIV 
 * containing a list of all covariate bars with informational data and user preferences 
 * that are common to all bars (show/hide and size).  
 **********************************************************************************/
UPM.setupAllClassesPrefs = function() {
	const heatMap = MMGR.getHeatMap();
	var allprefs = UTIL.newElement("DIV#breakPrefs_ALL");
	var prefContents = document.createElement("TABLE");
	prefContents.id = "tableAllClasses";
	UHM.addBlankRow(prefContents);
	var rowClassBars = heatMap.getRowClassificationConfig();
	var rowClassBarsOrder = heatMap.getRowClassificationOrder();
	var colClassBars = heatMap.getColClassificationConfig();
	var colClassBarsOrder = heatMap.getColClassificationOrder();
	const buttons = UTIL.newElement ('DIV.icon_group', {}, [
	    UTIL.newSvgButton('icon-minus', {
		dataset: {
		    tooltip: 'Decrease the size of all selected covariate bars by one',
		},
	    }, function (el) {
		el.onclick = function () { UPM.decrementAllHeights(); };
		return el;
	    }),
	    UTIL.newSvgButton('icon-plus', {
		dataset: {
		    tooltip: 'Increase the size of all selected covariate bars by one',
		},
	    }, function (el) {
		el.onclick = function () { UPM.incrementAllHeights(); };
		return el;
	    }),
	]);
	UHM.setTableRow(prefContents, [
		"&nbsp;&nbsp;&nbsp;",
		"&nbsp;&nbsp;&nbsp;",
		"<b>Adjust All Heights: </b>",
		buttons
	]);
	const showHeader = UTIL.newFragment ([
	    UTIL.newElement("INPUT#all_showPref", {
		name: 'all_showPref',
		type: 'checkbox'
	    }, null, function (el) {
		el.onchange = function() { UPM.showAllBars(); };
		return el;
	    }),
	    UTIL.newElement("B", {}, UTIL.newElement("U", {}, "Show")),
	]);
	UHM.setTableRow(prefContents,[
		"&nbsp;<u>"+"Covariate"+"</u>",
		"<b><u>"+"Position"+"</u></b>",
		showHeader,
		"<b><u>"+"Height"+"</u></b>"
	]);
	var checkState = true;
	for (var i = 0;  i < rowClassBarsOrder.length; i++){
		var key = rowClassBarsOrder[i];
		var currentClassBar = rowClassBars[key];
		var keyrow = key+"_row";
		if (UPM.filterShow(key)) {
			const showPref = keyrow + "_showPref";
			const colShow = UTIL.newElement('INPUT', {
			    id: showPref,
			    name: showPref,
			    type: 'checkbox'
			}, null, function (el) {
			    el.onchange = function() { UPM.setShowAll(); };
			    if (currentClassBar.show == 'Y') {
				el.checked = true;
			    }
			    return el;
			});
			const heightPref = keyrow + "_heightPref";
			const colHeight = UTIL.newElement('INPUT', {
			    id: heightPref,
			    name: heightPref,
			    maxlength: 2,
			    size: 2,
			    value: currentClassBar.height,
			});

			var displayName = key;
			if (key.length > 20){
				displayName = key.substring(0,17) + "...";
			}
			UHM.setTableRow(prefContents,["&nbsp;&nbsp;"+displayName,"Row",colShow,colHeight]);
		}
	}
	for (var i = 0; i < colClassBarsOrder.length; i++){
		var key = colClassBarsOrder[i];
		var currentClassBar = colClassBars[key];
		var keycol = key+"_col";
		if (UPM.filterShow(key)) {
			const showPref = keycol + "_showPref";
			const colShow = UTIL.newElement('INPUT', {
			    id: showPref,
			    name: showPref,
			    type: 'checkbox'
			}, null, function (el) {
			    el.onchange = function() { UPM.setShowAll(); };
			    if (currentClassBar.show == 'Y') {
				el.checked = true;
			    }
			    return el;
			});
			const heightPref = keycol + "_heightPref";
			const colHeight = UTIL.newElement('INPUT', {
			    id: heightPref,
			    name: heightPref,
			    maxlength: 2,
			    size: 2,
			    value: currentClassBar.height,
			});

			var displayName = key;
			if (key.length > 20){
				displayName = key.substring(0,17) + "...";
			}
			UHM.setTableRow(prefContents,["&nbsp;&nbsp;"+displayName,"Col",colShow,colHeight]);
		}
	}
	allprefs.appendChild(prefContents);

	return allprefs;
}	

/**********************************************************************************
 * FUNCTION - setupClassBreaks: The purpose of this function is to construct a DIV 
 * containing a set informational data and a list of categories/colors for a given
 * covariate classfication bar.  
 **********************************************************************************/
UPM.setupClassBreaks = function(e, key, barType, classBar) {
	//must add barType to key when adding objects to DOM
	var keyRC = key+"_"+barType;
	var colorMap = MMGR.getHeatMap().getColorMapManager().getColorMap(barType, key);
	var thresholds = colorMap.getThresholds();
	var colors = colorMap.getColors();
	var helpprefs = UTIL.newElement("DIV");
	helpprefs.id = "breakPrefs_"+keyRC;

	var prefContents = document.createElement("TABLE"); 
	UHM.addBlankRow(prefContents);
	var pos = UTIL.toTitleCase(barType);
	var typ = UTIL.toTitleCase(colorMap.getType());
	var barPlot = UTIL.toTitleCase(classBar.bar_type.replace("_", " "));
	UHM.setTableRow(prefContents,["&nbsp;Bar Position: ","<b>"+pos+"</b>"]);
	UHM.setTableRow(prefContents,["&nbsp;Color Type: ","<b>"+typ+"</b>"]);
	UHM.addBlankRow(prefContents, 3);
	var bgColorInput = "<input class='spectrumColor' type='color' name='"+keyRC+"_bgColorPref' id='"+keyRC+"_bgColorPref' value='"+classBar.bg_color+"'>"; 
	var fgColorInput = "<input class='spectrumColor' type='color' name='"+keyRC+"_fgColorPref' id='"+keyRC+"_fgColorPref' value='"+classBar.fg_color+"'>"; 
	var lowBound = "<input name='"+keyRC+"_lowBoundPref' id='"+keyRC+"_lowBoundPref' value='"+classBar.low_bound+"' maxlength='10' size='8'>&emsp;";
	var highBound = "<input name='"+keyRC+"_highBoundPref' id='"+keyRC+"_highBoundPref' value='"+classBar.high_bound+"' maxlength='10' size='8'>&emsp;";
	if (typ === 'Discrete') {
		UHM.setTableRow(prefContents,["&nbsp;Bar Type: ","<b>"+barPlot+"</b>"]);
	} else {
		const typeOptionsId = keyRC + "_barTypePref";
		const typeOptionsSelect = UTIL.newElement ('SELECT', {
		    id: typeOptionsId,
		    name: typeOptionsId,
		}, [
		    UTIL.newElement ('OPTION', { value: 'bar_plot' }, 'Bar Plot' ),
		    UTIL.newElement ('OPTION', { value: 'color_plot' }, 'Color Plot' ),
		    UTIL.newElement ('OPTION', { value: 'scatter_plot' }, 'Scatter Plot' ),
		], function (el) {
		    el.onchange = function () { UPM.showPlotTypeProperties (keyRC); };
		    return el;
		});
		UHM.setTableRow(prefContents, ["&nbsp;&nbsp;Bar Type:", typeOptionsSelect]);
	}
	
	
	UHM.addBlankRow(prefContents);
	var helpprefsCB = UTIL.newElement("DIV");
	helpprefsCB.id = keyRC+"_breakPrefsCB";
	var prefContentsCB = document.createElement("TABLE"); 
	if (typ === 'Discrete') {
	    UHM.setTableRow(prefContentsCB, ["&nbsp;<u>Category</u>","<b><u>"+"Color"+"</b></u>"]);
	    for (var j = 0; j < thresholds.length; j++) {
		    var threshold = thresholds[j];
		    var color = colors[j];
		    var threshId = keyRC+"_breakPt"+j;
		    var colorId = keyRC+"_color"+j;
		    var colorInput = "<input class='spectrumColor' type='color' name='"+colorId+"_colorPref' id='"+colorId+"_colorPref' value='"+color+"'>";
		    UHM.setTableRow(prefContentsCB, ["&nbsp;&nbsp;"+threshold, colorInput]);
	    }
	} else {
	    UHM.setTableRow(prefContentsCB, ["&nbsp;<u>Breakpoint</u>","<b><u>"+"Color"+"</b></u>"]);
	    const colorScheme = document.createElement("TABLE");
	    fillBreaksTable (colorScheme, barType, key, thresholds, colors);
	    UHM.setTableRow (prefContentsCB, [ colorScheme ], 3);
	}
	UHM.addBlankRow(prefContentsCB);
	UHM.setTableRow(prefContentsCB, ["&nbsp;Missing Color:",  "<input class='spectrumColor' type='color' name='"+keyRC+"_missing_colorPref' id='"+keyRC+"_missing_colorPref' value='"+colorMap.getMissingColor()+"'>"]);
	UHM.addBlankRow(prefContentsCB, 3);
	UHM.setTableRow(prefContentsCB, ["&nbsp;<u>Choose a pre-defined color palette:</u>"],3);
	UHM.addBlankRow(prefContentsCB);
	if (typ == "Discrete"){
		var scheme1 = genPreset (key, ["#1f77b4","#ff7f0e","#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"],"#ffffff",barType,typ);
		var scheme2 = genPreset (key, ["#1f77b4","#aec7e8","#ff7f0e","#ffbb78","#2ca02c","#98df8a","#d62728","#ff9896","#9467bd","#c5b0d5","#8c564b","#c49c94","#e377c2","#f7b6d2","#7f7f7f","#c7c7c7","#bcbd22","#dbdb8d","#17becf","#9edae5"],"#ffffff",barType,typ);
		var scheme3 = genPreset (key, ["#393b79", "#637939", "#8c6d31", "#843c39", "#7b4173", "#5254a3", "#8ca252", "#bd9e39", "#ad494a", "#a55194", "#6b6ecf", "#b5cf6b", "#e7ba52", "#d6616b", "#ce6dbd", "#9c9ede", "#cedb9c", "#e7cb94", "#e7969c", "#de9ed6"],"#ffffff",barType,typ);
		UHM.setTableRow(prefContentsCB, [scheme1,scheme2,scheme3]);
		UHM.setTableRow(prefContentsCB, ["&nbsp;Palette1",  "&nbsp;<b>Palette2</b>","&nbsp;<b>Palette3</b>"]);
	} else {
		var rainbow = genPreset (key, ["#FF0000","#FF8000","#FFFF00","#00FF00","#0000FF","#FF00FF"],"#000000", barType, typ);
		var greyscale = genPreset (key, ["#FFFFFF","#000000"],"#FF0000",barType,typ);
		var redBlackGreen = genPreset (key, ["#00FF00","#000000","#FF0000"],"#ffffff",barType,typ);
		UHM.setTableRow(prefContentsCB, [greyscale,rainbow,redBlackGreen]);
		UHM.setTableRow(prefContentsCB, ["&nbsp;Greyscale",  "&nbsp;<b>Rainbow</b>","&nbsp;<b>Green Red</b>"]);
	}
	helpprefsCB.style.height = prefContentsCB.rows.length;
	helpprefsCB.appendChild(prefContentsCB);
	var helpprefsBB = UTIL.newElement("DIV");
	helpprefsBB.id = keyRC+"_breakPrefsBB";
	var prefContentsBB = document.createElement("TABLE"); 
	UHM.setTableRow(prefContentsBB, ["&nbsp;&nbsp;Lower Bound:", lowBound]);
	UHM.setTableRow(prefContentsBB, ["&nbsp;&nbsp;Upper Bound:", highBound]);
	UHM.setTableRow(prefContentsBB, ["&nbsp;&nbsp;Foreground Color:", fgColorInput]);
	UHM.setTableRow(prefContentsBB, ["&nbsp;&nbsp;Background Color:", bgColorInput]);
	UHM.addBlankRow(prefContentsBB);
	helpprefsBB.appendChild(prefContentsBB);
	helpprefs.appendChild(prefContents);
	helpprefs.appendChild(helpprefsCB);
	helpprefs.appendChild(helpprefsBB);
	if (classBar.bar_type === 'color_plot') {
		helpprefsBB.style.display="none";
		helpprefsCB.style.display="block";
	} else {
		helpprefsCB.style.display="none";
		helpprefsBB.style.display="block";
	}
	return helpprefs;
}	

    function setupCovariateBreaks (colorMapAxis, covariateName) {
	const bars = NgChm.MMGR.getHeatMap().getAxisCovariateConfig(colorMapAxis);
	const breakPrefs = UPM.setupClassBreaks({}, covariateName, colorMapAxis, bars[covariateName]);

	const classPrefs = document.getElementById ('classPrefs');
	classPrefs.append (breakPrefs);
    }

UPM.showPlotTypeProperties = function(keyRC) {
	var barTypeSel = document.getElementById(keyRC+"_barTypePref");
	var barTypeVal = barTypeSel.value;
	var bbDiv = document.getElementById(keyRC+"_breakPrefsBB");
	var cbDiv = document.getElementById(keyRC+"_breakPrefsCB");
	if (barTypeVal === 'color_plot') {
		bbDiv.style.display="none";
		cbDiv.style.display="block";
	} else {
		cbDiv.style.display="none";
		bbDiv.style.display="block";
	}
}

/**********************************************************************************
 * FUNCTION - showAllBars: The purpose of this function is to set the condition of
 * the "show" checkbox for all covariate bars on the covariate bars tab of the user 
 * preferences dialog. These checkboxes are located on the DIV that is visible when 
 * the ALL entry of the covariate dropdown is selected. Whenever a  user checks the 
 * show all box, all other boxes are checked.  
 **********************************************************************************/
UPM.showAllBars = function() {
	const heatMap = MMGR.getHeatMap();
	var showAllBox = document.getElementById('all_showPref');
	var checkState = false;
	if (showAllBox.checked) {
		checkState = true;
	}
	var rowClassBars = heatMap.getRowClassificationConfig();
	for (var key in rowClassBars){
		if (UPM.filterShow(key)) {
			var colShow = document.getElementById(key+"_row"+'_showPref');
			colShow.checked = checkState;
		}
	}
	var colClassBars = heatMap.getColClassificationConfig();
	for (var key in colClassBars){
		if (UPM.filterShow(key)) {
			var colShow = document.getElementById(key+"_col"+'_showPref');
			colShow.checked = checkState;
		}
	}
	
	return;
}	

UPM.incrementAllHeights = function() {
	const heatMap = MMGR.getHeatMap();
	var rowClassBars = heatMap.getRowClassificationConfig();
	for (var key in rowClassBars){
		var heightItem = document.getElementById(key+"_row"+'_heightPref');
		//increment if value < 100, limit height to 99
		if (parseInt(heightItem.value) < 99) {
			heightItem.value = parseInt(heightItem.value)+1;
		}
	}
	var colClassBars = heatMap.getColClassificationConfig();
	for (var key in colClassBars){
		var heightItem = document.getElementById(key+"_col"+'_heightPref');
		//increment if value < 100, limit height to 99
		if (parseInt(heightItem.value) < 99) {
			heightItem.value = parseInt(heightItem.value)+1;
		}
	}
}	

UPM.decrementAllHeights = function() {
	const heatMap = MMGR.getHeatMap();
	var rowClassBars = heatMap.getRowClassificationConfig();
	for (var key in rowClassBars){
		var heightItem = document.getElementById(key+"_row"+'_heightPref');
		//decrement if value > 0, prevent negative values
		if (parseInt(heightItem.value) > 0) {
			heightItem.value = parseInt(heightItem.value)-1;
		}
	}
	var colClassBars = heatMap.getColClassificationConfig();
	for (var key in colClassBars){
		var heightItem = document.getElementById(key+"_col"+'_heightPref');
		//decrement if value > 0, prevent negative values
		if (parseInt(heightItem.value) > 0) {
			heightItem.value = parseInt(heightItem.value)-1;
		}
	}
}	


/**********************************************************************************
 * FUNCTION - setShowAll: The purpose of this function is to set the condition of
 * the "show all" checkbox on the covariate bars tab of the user preferences dialog.
 * This checkbox is located on the DIV that is visible when the ALL entry of the 
 * covariate dropdown is selected. If a user un-checks a single box in the list of 
 * covariate bars, the show all box is un-checked. Conversely, if a user checks a box 
 * resulting in all of the boxes being selected, the show all box will be checked.
 **********************************************************************************/
UPM.setShowAll = function() {
	const heatMap = MMGR.getHeatMap();
	var rowClassBarsOrder = heatMap.getRowClassificationOrder();
	var colClassBarsOrder = heatMap.getColClassificationOrder();
	if (UPM.hasClasses) {
		var checkState = true;
		var rowClassBars = heatMap.getRowClassificationConfig();
		for (var key in rowClassBars){
			var colShow = document.getElementById(key+"_row"+'_showPref');
			if (UPM.filterShow(key)) {
				if (!colShow.checked) {
					checkState = false;
					break;
				}
			}
		}
		var colClassBars = heatMap.getColClassificationConfig();
		for (var key in colClassBars){
			var colShow = document.getElementById(key+"_col"+'_showPref');
			if (UPM.filterShow(key)) {
				if (colShow && !colShow.checked) {
					checkState = false;
					break;
				}
			}
		}
		var showAllBox = document.getElementById('all_showPref');
		showAllBox.checked = checkState;
	}
	
	return;
}	

/**********************************************************************************
 * FUNCTION - showClassBreak: The purpose of this function is to show the 
 * appropriate classification bar panel based upon the user selection of the 
 * covariate dropdown on the covariates tab of the preferences screen.  This 
 * function is also called when an error is trappped, opening the covariate DIV
 * that contains the erroneous data entry.
 **********************************************************************************/
UPM.showClassBreak = function(selClass, selAxis) {
	var classBtn = document.getElementById("classPref_list");
	if (typeof selClass != 'undefined') {
		classBtn.value = selClass + (selAxis ? "_" + selAxis : "");
	} 
	for (var i=0; i<classBtn.length; i++){
		var classVal = "breakPrefs_"+classBtn.options[i].value;
		var classDiv = document.getElementById(classVal);
		var classSel = classBtn.options[i].selected;
		if (classSel) {
			classDiv.style.display="block";
		} else {
			classDiv.style.display="none";
		}
	}
}

/**********************************************************************************
 * FUNCTION - filterClassPrefs: The purpose of this function is to initiate the 
 * process of filtering option choices for classifications. It is fired when either
 * the "Filter Covariates" or "Clear Filters" button is pressed on the covariates 
 * preferences dialog.  The global filter value variable is set when filtering and 
 * cleared when clearing and the editPreferences function is called to reload all
 * preferences.
 **********************************************************************************/
UPM.filterClassPrefs = function(filterOn) {
	UPM.searchPerformed = true;
	UPM.showClassBreak("ALL");
	const filterButton = document.getElementById('all_searchPref_btn');
	const textSpan = filterButton.querySelector('span');
	if (!textSpan) return;
	var searchPrefSelect = document.getElementById('all_searchPref');
	var searchPrefVal = searchPrefSelect.value;
	if (filterOn) {
		if (searchPrefVal != "") {
			UPM.filterVal = searchPrefVal;
			textSpan.innerText = "Remove filter";
			filterButton.onclick=function (){UPM.filterClassPrefs(false);};
		}
	} else {
		textSpan.innerText = "Filter covariates";
		filterButton.onclick=function (){UPM.filterClassPrefs(true);};
		searchPrefSelect.value = "";
		UPM.filterVal = null;
	}
	var allprefs = document.getElementById("breakPrefs_ALL");
	var hiddenItems = UPM.addClassPrefOptions();
	UPM.filterAllClassesTable(hiddenItems);
	UPM.showClassBreak("ALL");
}

/**********************************************************************************
 * FUNCTION - filterAllClassesTable: The purpose of this function is to assign option
 * values to the Covariates dropdown control on the Covariates preferences tab.  All 
 * covariates will be loaded at startup.  The filter control, however, is used to 
 * limit the visible options in this dropdown.
 **********************************************************************************/
UPM.filterAllClassesTable = function(hiddenItems) {
    var table=document.getElementById('tableAllClasses');
    for(var i=0; i<table.rows.length;i++){
        var row  = table.rows[i];
        var td = row.cells[0];
        var tdText = td.innerHTML.replace(/&nbsp;/g,'');
	let hidden = false;
        for (var j=0;j<hiddenItems.length;j++) {
        	if (hiddenItems[j] === tdText) {
			hidden = true;
			break;
        	}
        }
	if (hidden) {
		row.classList.add ("hide");
	} else {
		row.classList.remove ("hide");
	}
     }
}

/**********************************************************************************
 * FUNCTION - addClassPrefOptions: The purpose of this function is to assign option
 * values to the Covariates dropdown control on the Covariates preferences tab.  All 
 * covariates will be loaded at startup.  The filter control, however, is used to 
 * limit the visible options in this dropdown.  This function returns a string 
 * array containing a list of all options that are NOT being displayed.  This list
 * is used to hide rows on the ALL covariates panel.
 **********************************************************************************/
UPM.addClassPrefOptions = function() {
	const heatMap = MMGR.getHeatMap();
	var rowClassBars = heatMap.getRowClassificationConfig();
	var colClassBars = heatMap.getColClassificationConfig();
	var rowClassBarsOrder = heatMap.getRowClassificationOrder();
	var colClassBarsOrder = heatMap.getColClassificationOrder();
	var hiddenOpts = new Array();
	if (UPM.hasClasses) {
		var classSelect = document.getElementById('classPref_list');
		classSelect.options.length = 0;
		classSelect.options[classSelect.options.length] = new Option('ALL', 'ALL');
		for (var i=0; i < rowClassBarsOrder.length;i++){
			var key = rowClassBarsOrder[i];
			var keyrow = key+"_row";
			var displayName = key;
			if (key.length > 20){
				displayName = key.substring(0,20) + "...";
			}
			if (UPM.filterShow(key)) {
				classSelect.options[classSelect.options.length] = new Option(displayName, keyrow);
			} else {
				hiddenOpts.push(displayName);
			}
			var barType = document.getElementById(keyrow+"_barTypePref");
			if (barType !== null) {
				var currentClassBar = rowClassBars[key];
				barType.value = currentClassBar.bar_type;
			}
		}
		for (var i=0; i < colClassBarsOrder.length;i++){
			var key = colClassBarsOrder[i];
			var keycol = key+"_col";
			var displayName = key;
			if (key.length > 20){
				displayName = key.substring(0,20) + "...";
			}
			if (UPM.filterShow(key)) {
				classSelect.options[classSelect.options.length] = new Option(displayName, keycol);
			} else {
				hiddenOpts.push(displayName);
			}
			var barType = document.getElementById(keycol+"_barTypePref");
			if (barType !== null) {
				var currentClassBar = colClassBars[key];
				barType.value = currentClassBar.bar_type;
			}
		}
	}
	
	return hiddenOpts;
}

/**********************************************************************************
 * FUNCTION - filterShow: The purpose of this function is to determine whether a 
 * given covariates bar is to be shown given the state of the covariates filter
 * search text box.
 **********************************************************************************/
UPM.filterShow = function(key) {
	var filterShow = false;
	var lowerkey = key.toLowerCase();
	if (UPM.filterVal != null) {
		if (lowerkey.indexOf(UPM.filterVal.toLowerCase()) >= 0) {
			filterShow = true;
		}
	} else {
		filterShow = true;
	}
	
	return filterShow;
}

/*===================================================================================
 *  ROW COLUMN PREFERENCE PROCESSING FUNCTIONS
 *  
 *  The following functions are utilized to present heat map covariate classification
 *  bar configuration options:
 *  	- setupRowColPrefs
 *  	- showDendroSelections
 *      - dendroRowShowChange
 *      - dendroColShowChange
 =================================================================================*/

UPM.setupMapInfoPrefs = function (e, prefprefs) {
	const heatMap = MMGR.getHeatMap();
	const mapInfo = heatMap.getMapInformation();
	const mapInfoPrefs = document.getElementById("infoPrefs");
	const prefContents = document.createElement("TABLE");

	const totalRows = heatMap.getTotalRows()-mapInfo.map_cut_rows;
	const totalCols = heatMap.getTotalCols()-mapInfo.map_cut_cols;

	UHM.setTableRowX(prefContents,["ABOUT:"], ['header'], [ { colSpan: 2 }]);
	UHM.setTableRowX(prefContents,["Name:", mapInfo.name]);
	UHM.setTableRowX(prefContents,["Size:", totalRows + " rows by " + totalCols + " columns"]);
	UHM.setTableRowX(prefContents,["Description:", mapInfo.description]);
	UHM.setTableRowX(prefContents,["Build time:", mapInfo.attributes['chm.info.build.time']]);
	UHM.setTableRowX(prefContents,["Read Only:", mapInfo.read_only]);

	UHM.setTableRowX(prefContents,["VERSIONS:"], ['header'], [ { colSpan: 2}]);
	UHM.setTableRowX(prefContents,["Viewer Version:", COMPAT.version]);
	UHM.setTableRowX(prefContents,["Map Version:", mapInfo.version_id]);
	UHM.setTableRowX(prefContents,["Builder Version:", mapInfo.builder_version]);

	UHM.setTableRowX(prefContents,["LAYERS:"], ['header'], [{ colSpan: 2 }]);
	for (let dl in mapInfo.data_layer) {
	    UHM.setTableRowX(prefContents,[dl + ':', mapInfo.data_layer[dl].name]);
	}

	UHM.setTableRowX(prefContents,["ATTRIBUTES:"], ['header'], [{ colSpan: 2 }]);
	const omit = [ /^chm/, /^!/, ];
	const pass = [ /^chm.info.external.url/, /^!extraparam/ ];
	for (let attr in mapInfo.attributes) {
	    if (!matchAny (attr, omit) || matchAny (attr, pass)) {
		let attrVal = mapInfo.attributes[attr];
		if (/.external.url/.test(attr)) {
		    attrVal = UTIL.newElement ('A', { href: attrVal, target: '_blank', }, [ attrVal ]);
		}
		UHM.setTableRowX(prefContents,[attr + ':', attrVal]);
	    }
	}

	UHM.addBlankRow(prefContents,2);
	mapInfoPrefs.appendChild(prefContents);

	return mapInfoPrefs;

	function matchAny (str, regExpArray) {
	    for (let regExp of regExpArray) {
		if (regExp.test(str)) return true;
	    }
	    return false;
	}
};

/**********************************************************************************
 * FUNCTION - setupRowColPrefs: The purpose of this function is to construct a DIV 
 * panel containing all row & col preferences.  Two sections are presented, one for
 * rows and the other for cols.  Informational data begins each section and 
 * properties for modifying the appearance of row/col dendograms appear at the end.
 **********************************************************************************/
UPM.setupRowColPrefs = function(e, prefprefs) {
	const heatMap = MMGR.getHeatMap();
	const rowcolprefs = document.getElementById("rowsColsPrefs");
	var prefContents = document.createElement("TABLE");
	UHM.addBlankRow(prefContents);
	UHM.setTableRow(prefContents,["ROW INFORMATION:"], 2);
	var rowLabels = heatMap.getRowLabels();
	var rowOrganization = heatMap.getRowOrganization();
	var rowOrder = rowOrganization['order_method'];
	var totalRows = heatMap.getTotalRows()-heatMap.getMapInformation().map_cut_rows;
	UHM.setTableRow(prefContents,["&nbsp;&nbsp;Total Rows:",totalRows]);
	UHM.setTableRow(prefContents,["&nbsp;&nbsp;Labels Type:",rowLabels['label_type']]);
	UHM.setTableRow(prefContents,["&nbsp;&nbsp;Ordering Method:",rowOrder]);
	function  dendroShowOptions () {
	    return [
		UTIL.newElement ('OPTION', { value: 'ALL' },     'Summary and Detail' ),
		UTIL.newElement ('OPTION', { value: 'SUMMARY' }, 'Summary Only' ),
		UTIL.newElement ('OPTION', { value: 'NONE' },    'Hide' ),
	    ];
	}
	var dendroHeightOptions = "<option value='50'>50%</option><option value='75'>75%</option><option value='100'>100%</option><option value='125'>125%</option><option value='150'>150%</option><option value='200'>200%</option></select>";
	if (rowOrder === "Hierarchical") {
		UHM.setTableRow(prefContents,["&nbsp;&nbsp;Agglomeration Method:",rowOrganization['agglomeration_method']]);
		UHM.setTableRow(prefContents,["&nbsp;&nbsp;Distance Metric:",rowOrganization['distance_metric']]);
		const rowDendroShowSelect = UTIL.newElement ('SELECT', { name:'rowDendroShowPref', id: 'rowDendroShowPref' }, dendroShowOptions(),
		    function(el) {
		       el.onchange= function() { UPM.dendroRowShowChange(); };
		       return el;
		});
		UHM.setTableRow(prefContents,["&nbsp;&nbsp;Show Dendrogram:",rowDendroShowSelect]);
		var rowDendroHeightSelect = "<select name='rowDendroHeightPref' id='rowDendroHeightPref'>"
		rowDendroHeightSelect = rowDendroHeightSelect+dendroHeightOptions;
		UHM.setTableRow(prefContents,["&nbsp;&nbsp;Dendrogram Height:",rowDendroHeightSelect]);
	}  
	var rowLabelSizeSelect = "<select name='rowLabelSizePref' id='rowLabelSizePref'><option value='10'>10 Characters</option><option value='15'>15 Characters</option><option value='20'>20 Characters</option><option value='25'>25 Characters</option><option value='30'>30 Characters</option><option value='35'>35 Characters</option><option value='40'>40 Characters</option>"
	var rowLabelAbbrevSelect = "<select name='rowLabelAbbrevPref' id='rowLabelAbbrevPref'><option value='START'>Beginning</option><option value='MIDDLE'>Middle</option><option value='END'>End</option>"
	UHM.setTableRow(prefContents,["&nbsp;&nbsp;Maximum Label Length:",rowLabelSizeSelect]);
	UHM.setTableRow(prefContents,["&nbsp;&nbsp;Trim Label Text From:",rowLabelAbbrevSelect]);

	var topRowItemData = heatMap.getRowConfig().top_items.toString();
	var topRowItems = "<textarea name='rowTopItems' id='rowTopItems' rows='3' cols='80'>"+topRowItemData+"</textarea>";
	UHM.setTableRow(prefContents,["&nbsp;&nbsp;Top Rows:"]);
	UHM.setTableRow(prefContents,[topRowItems],2);

	UHM.addBlankRow(prefContents);
	UHM.setTableRow(prefContents,["COLUMN INFORMATION:"], 2);
	
	var colLabels = heatMap.getColLabels();
	var colOrganization = heatMap.getColOrganization();
	var colOrder = colOrganization['order_method'];
	var totalCols = heatMap.getTotalCols()-heatMap.getMapInformation().map_cut_cols;
	UHM.setTableRow(prefContents,["&nbsp;&nbsp;Total Columns:",totalCols]);
	UHM.setTableRow(prefContents,["&nbsp;&nbsp;Labels Type:",colLabels['label_type']]);
	UHM.setTableRow(prefContents,["&nbsp;&nbsp;Ordering Method:",colOrder]);
	if (colOrder === "Hierarchical") {
		UHM.setTableRow(prefContents,["&nbsp;&nbsp;Agglomeration Method:",colOrganization['agglomeration_method']]);
		UHM.setTableRow(prefContents,["&nbsp;&nbsp;Distance Metric:",colOrganization['distance_metric']]);
		const colDendroShowSelect = UTIL.newElement ('SELECT', { name:'colDendroShowPref', id: 'colDendroShowPref' }, dendroShowOptions(),
		    function(el) {
		       el.onchange= function() { UPM.dendroColShowChange(); };
		       return el;
		});
		var colDendroHeightSelect = "<select name='colDendroHeightPref' id='colDendroHeightPref'>"
		colDendroHeightSelect = colDendroHeightSelect+dendroHeightOptions;
		UHM.setTableRow(prefContents,["&nbsp;&nbsp;Show Dendrogram:",colDendroShowSelect]);
		UHM.setTableRow(prefContents,["&nbsp;&nbsp;Dendrogram Height:",colDendroHeightSelect]);
	}
	var colLabelSizeSelect = "<select name='colLabelSizePref' id='colLabelSizePref'><option value='10'>10 Characters</option><option value='15'>15 Characters</option><option value='20'>20 Characters</option><option value='25'>25 Characters</option><option value='30'>30 Characters</option><option value='35'>35 Characters</option><option value='40'>40 Characters</option>"
	var colLabelAbbrevSelect = "<select name='colLabelAbbrevPref' id='colLabelAbbrevPref'><option value='START'>Beginning</option><option value='MIDDLE'>Middle</option><option value='END'>End</option>"
	UHM.setTableRow(prefContents,["&nbsp;&nbsp;Maximum Label Length:",colLabelSizeSelect]);
	UHM.setTableRow(prefContents,["&nbsp;&nbsp;Trim Label Text From:",colLabelAbbrevSelect]);
	var topColItemData = heatMap.getColConfig().top_items.toString();
	var topColItems = "<textarea name='colTopItems' id='colTopItems' rows='3' cols='80'>"+topColItemData+"</textarea>";
	UHM.setTableRow(prefContents,["&nbsp;&nbsp;Top Columns:"]);
	UHM.setTableRow(prefContents,[topColItems],2);
	rowcolprefs.appendChild(prefContents);

	return rowcolprefs;
}

/**********************************************************************************
 * FUNCTION - showDendroSelections: The purpose of this function is to set the 
 * states of the row/column dendrogram show and height preferences.
 **********************************************************************************/
UPM.showDendroSelections = function() {
	const heatMap = MMGR.getHeatMap();
	var rowDendroConfig = heatMap.getRowDendroConfig();
	var rowOrganization = heatMap.getRowOrganization();
	var rowOrder = rowOrganization['order_method'];
	if (rowOrder === "Hierarchical") {
		var dendroShowVal = rowDendroConfig.show;
		document.getElementById("rowDendroShowPref").value = dendroShowVal;
		var rowHeightPref = document.getElementById("rowDendroHeightPref");
		if (dendroShowVal === 'NONE') {
			var opt = rowHeightPref.options[6];
			if (typeof opt != 'undefined') {
				rowHeightPref.options[6].remove();
			}
			var option = document.createElement("option");
			option.text = "NA";
			option.value = '10';
			rowHeightPref.add(option);
			rowHeightPref.disabled = true;
			rowHeightPref.value = option.value;
		} else {
			rowHeightPref.value = rowDendroConfig.height;
		}
	}
	var colOrganization = heatMap.getColOrganization();
	var colOrder = colOrganization['order_method'];
	var colDendroConfig = heatMap.getColDendroConfig();
	if (colOrder === "Hierarchical") {
		var dendroShowVal = colDendroConfig.show;
		document.getElementById("colDendroShowPref").value = dendroShowVal;
		var colHeightPref = document.getElementById("colDendroHeightPref");
		if (dendroShowVal === 'NONE') {
			var opt = colHeightPref.options[6];
			if (typeof opt != 'undefined') {
				colHeightPref.options[6].remove();
			}
			var option = document.createElement("option");
			option.text = "NA";
			option.value = '10';
			colHeightPref.add(option);
			colHeightPref.disabled = true;
			colHeightPref.value = option.value;
		} else {
			colHeightPref.value = colDendroConfig.height;
		}
	}
}

/**********************************************************************************
 * FUNCTION - showLabelSelections: The purpose of this function is to set the 
 * states of the label length and truncation preferences.
 **********************************************************************************/
UPM.showLabelSelections = function() {
	const heatMap = MMGR.getHeatMap();
	document.getElementById("colLabelSizePref").value =  heatMap.getColConfig().label_display_length;
	document.getElementById("colLabelAbbrevPref").value = heatMap.getColConfig().label_display_method;
	document.getElementById("rowLabelSizePref").value =  heatMap.getRowConfig().label_display_length;
	document.getElementById("rowLabelAbbrevPref").value = heatMap.getRowConfig().label_display_method;
}

/**********************************************************************************
 * FUNCTION - dendroRowShowChange: The purpose of this function is to respond to
 * a change event on the show row dendrogram dropdown.  If the change is to Hide, 
 * the row dendro height is set to 10 and the dropdown disabled. If the change is to
 * one of the 2 Show options AND was previously Hide, set height to the default
 * value of 100 and enable the dropdown.
 **********************************************************************************/
UPM.dendroRowShowChange = function() {
	var newValue = document.getElementById("rowDendroShowPref").value;
	var rowHeightPref = document.getElementById("rowDendroHeightPref");
	if (newValue === 'NONE') {
		var option = document.createElement("option");
		option.text = "NA";
		option.value = '10';
		rowHeightPref.add(option);
		rowHeightPref.value = '10';
		rowHeightPref.disabled = true;
	} else if (rowHeightPref.disabled) {
		var opt = rowHeightPref.options[6];
		if (typeof opt != 'undefined') {
			rowHeightPref.options[6].remove();
		}
		rowHeightPref.value = '100';
		rowHeightPref.disabled = false;
	}
}

/**********************************************************************************
 * FUNCTION - dendroColShowChange: The purpose of this function is to respond to
 * a change event on the show row dendrogram dropdown.  If the change is to Hide, 
 * the row dendro height is set to 10 and the dropdown disabled. If the change is to
 * one of the 2 Show options AND was previously Hide, set height to the default
 * value of 100 and enable the dropdown.
 **********************************************************************************/
UPM.dendroColShowChange = function() {
	var newValue = document.getElementById("colDendroShowPref").value;
	var colHeightPref = document.getElementById("colDendroHeightPref");
	if (newValue === 'NONE') {
		var option = document.createElement("option");
		option.text = "NA";
		option.value = '10';
		colHeightPref.add(option);
		colHeightPref.value = '10';
		colHeightPref.disabled = true;
	} else if (colHeightPref.disabled) {
		var opt = colHeightPref.options[6];
		if (typeof opt != 'undefined') {
			colHeightPref.options[6].remove();
		}
		colHeightPref.value = '100';
		colHeightPref.disabled = false;
	}
}



UPM.getResetVals = function(){
	const heatMap = MMGR.getHeatMap();
	var rowDendroConfig = heatMap.getRowDendroConfig();
	var colDendroConfig = heatMap.getColDendroConfig();
	var rowConfig = heatMap.getRowConfig();
	var colConfig = heatMap.getColConfig();
	var matrix = heatMap.getMapInformation();
	var rowClassification = heatMap.getRowClassificationConfig();
	var colClassification = heatMap.getColClassificationConfig();
	var returnObj = {"rowDendroConfig":rowDendroConfig,
					"colDendroConfig":colDendroConfig,
					"rowConfig":rowConfig,
					"colConfig":colConfig,
					"matrix":matrix,
					"rowClassification":rowClassification,
					"colClassification":colClassification
					};
	returnObj = JSON.stringify(returnObj); // turn the object into a string so the values don't change as the user changes stuff in the pref manager
	return returnObj;
}

UPM.prefsResetButton = function(){
	var resetVal = JSON.parse(UPM.resetVal);
	// Reset the Row/Col panel items
	if (document.getElementById("rowDendroShowPref") !== null) {
		document.getElementById("rowDendroShowPref").value = resetVal.rowDendroConfig.show;
		document.getElementById("rowDendroHeightPref").value = resetVal.rowDendroConfig.height;
		UPM.dendroRowShowChange();
	}
	if (document.getElementById("colDendroShowPref") !== null) {
		document.getElementById("colDendroShowPref").value = resetVal.colDendroConfig.show;
		document.getElementById("colDendroHeightPref").value = resetVal.colDendroConfig.height;
		UPM.dendroColShowChange();
	}
	document.getElementById("rowLabelSizePref").value = resetVal.rowConfig.label_display_length;
	document.getElementById("colLabelSizePref").value = resetVal.colConfig.label_display_length;
	document.getElementById("rowLabelAbbrevPref").value = resetVal.rowConfig.label_display_method;
	document.getElementById("colLabelAbbrevPref").value = resetVal.colConfig.label_display_method;
	document.getElementById("rowTopItems").value = resetVal.rowConfig.top_items.toString();
	document.getElementById("colTopItems").value = resetVal.colConfig.top_items.toString();
	
	// Reset the Data Matrix panel items
	for (var dl in resetVal.matrix.data_layer){
		var layer = resetVal.matrix.data_layer[dl];
		var cm = layer.color_map;
		const dlTable = document.getElementById("breakPrefsTable_" + dl);
		fillBreaksTable (dlTable, "data", dl, cm.thresholds, cm.colors);
		var gridColor = document.getElementById(dl + "_gridColorPref");
		gridColor.value = layer.grid_color;
		var gridShow = document.getElementById(dl + "_gridPref");
		gridShow.checked = layer.grid_show == "Y";
		var selectionColor = document.getElementById(dl + "_selectionColorPref");
		selectionColor.value = layer.selection_color;
		var gapColor = document.getElementById(dl + "_gapColorPref");
		gapColor.value = layer.cuts_color;
		UHM.loadColorPreviewDiv(dl);
	}
	
	// Reset the Covariate bar panel items
	for (var name in resetVal.colClassification){
		var bar = resetVal.colClassification[name];
		var show = document.getElementById(name + "_col_showPref");
		show.checked = bar.show == "Y";
		var height = document.getElementById(name + "_col_heightPref");
		height.value = bar.height;
		
		if (bar.color_map.type == "discrete"){
			for (var i = 0; i < bar.color_map.colors.length; i++){
				var prefcolor = document.getElementById(name + "_col_color" + i +"_colorPref");
				prefcolor.value = bar.color_map.colors[i];
			}
		} else {
			var type = document.getElementById(name + "_col_barTypePref");
			type.value = bar.bar_type;
			UPM.showPlotTypeProperties(name+"_col");
			if (bar.bar_type == "bar_plot" || bar.bar_type == "scatter_plot"){
				var lowBound = document.getElementById(name + "_col_lowBoundPref");
				lowBound.value = bar.low_bound;
				var highBound = document.getElementById(name + "_col_highBoundPref");
				highBound.value = bar.high_bound;
				var fgColor = document.getElementById(name+"_col_fgColorPref");
				fgColor.value = bar.fg_color;
				var bgColor = document.getElementById(name+"_col_bgColorPref");
				bgColor.value = bar.bg_color;
			} else { // it's a normal color plot
				for (var i = 0; i < bar.color_map.colors.length; i++){
					var prefcolor = document.getElementById(name + "_col_color" + i +"_colorPref");
					prefcolor.value = bar.color_map.colors[i];
				}
			}
		}
	}
	for (var name in resetVal.rowClassification){
		var bar = resetVal.rowClassification[name];
		var show = document.getElementById(name + "_row_showPref");
		show.checked = bar.show == "Y";
		var height = document.getElementById(name + "_row_heightPref");
		height.value = bar.height;
		if (bar.bar_type == "bar_plot" || bar.bar_type == "scatter_plot"){
			var lowBound = document.getElementById(name + "_row_lowBoundPref");
			lowBound.value = bar.low_bound;
			var highBound = document.getElementById(name + "_row_highBoundPref");
			highBound.value = bar.high_bound;
			var fgColor = document.getElementById(name+"_row_fgColorPref");
			fgColor.value = bar.fg_color;
			var bgColor = document.getElementById(name+"_row_bgColorPref");
			bgColor.value = bar.bg_color;
		} else { // it's a normal color plot
			for (var i = 0; i < bar.color_map.colors.length; i++){
				var prefcolor = document.getElementById(name + "_row_color" + i +"_colorPref");
				prefcolor.value = bar.color_map.colors[i];
			}
		}
	}
	UPM.prefsApplyButton(1);
}

})();
