/**********************************************************************************
 * USER PREFERENCE FUNCTIONS:  The following functions handle the processing 
 * for user preference editing. 
 **********************************************************************************/

//Define Namespace for NgChm UserPreferenceManager
NgChm.createNS('NgChm.UPM');

//Global variables for preference processing
NgChm.UPM.bkpColorMaps = null;
NgChm.UPM.filterVal;
NgChm.UPM.searchPerformed = false;

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
NgChm.UPM.editPreferences = function(e,errorMsg) {
	NgChm.UHM.userHelpClose();

	// If helpPrefs element already exists, the user is pressing the gear button
	// when preferences are already open. Disregard.
	var helpExists = document.getElementById('rowsColsprefs');
	if ((NgChm.SEL.isSub) || (helpExists !== null)) {
		return;
	}

	//If first time thru, save the dataLayer colorMap
	//This is done because the colorMap must be edited to add/delete breakpoints while retaining their state
	if (NgChm.UPM.bkpColorMaps === null) {
		NgChm.UPM.bkpColorMaps = new Array();
		var dataLayers = NgChm.heatMap.getDataLayers();
		for (var key in dataLayers){
			NgChm.UPM.bkpColorMaps.push(NgChm.heatMap.getColorMapManager().getColorMap("data",key));
		}
	} 
	var prefspanel = document.getElementById("prefsPanel");
	var prefprefs = document.getElementById("prefPrefs");

	if (errorMsg !== null) {
		var prefBtnsDiv = document.getElementById('prefActions');
		prefBtnsDiv.innerHTML=errorMsg[2]+"<br/><br/><img id='prefApply_btn' src='" + NgChm.staticPath + "images/applyChangesButton.png' alt='Apply changes' onclick='NgChm.UPM.prefsApplyButton();' align='top'/>&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;<img id='prefCancel_btn' src='" + NgChm.staticPath + "images/cancelChangesButton.png' alt='Cancel changes' onclick='NgChm.UPM.prefsCancelButton();' align='top'/>";
	} else {
		//Create and populate row & col preferences DIV and add to parent DIV
		var rowcolprefs = NgChm.UPM.setupRowColPrefs(e, prefprefs);
		prefprefs.appendChild(rowcolprefs);

		//Create and populate classifications preferences DIV and add to parent DIV
		var classprefs = NgChm.UPM.setupClassPrefs(e, prefprefs);
		prefprefs.appendChild(classprefs);
		
		//Create and populate breakpoint preferences DIV and add to parent DIV
		var layerprefs = NgChm.UPM.setupLayerPrefs(e, prefprefs);
		prefprefs.appendChild(layerprefs);

		// Set DIV containing both class and break DIVs to visible and append to prefspanel table
		prefprefs.style.display="block";
		prefspanel.appendChild(prefprefs);
		
		var prefBtnsDiv = document.createElement('div');
		prefBtnsDiv.id='prefActions';
		prefBtnsDiv.innerHTML="<img id='prefApply_btn' src='" + NgChm.staticPath + "images/applyChangesButton.png' alt='Apply changes' onclick='NgChm.UPM.prefsApplyButton();' align='top'/>&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;<img id='prefCancel_btn' src='" + NgChm.staticPath + "images/cancelChangesButton.png' alt='Cancel changes' onclick='NgChm.UPM.prefsCancelButton();' align='top'/>";
		prefspanel.appendChild(prefBtnsDiv);
	}
	prefspanel.style.display= '';
	NgChm.UPM.prefsResize();

	//If errors exist and they are NOT on the currently visible DIV (dataLayer1),
	//hide the dataLayers DIV, set the tab to "Covariates", and open the appropriate
	//covariate bar DIV.
	NgChm.UPM.addClassPrefOptions();
	NgChm.UPM.showDendroSelections();
	NgChm.UPM.showLabelSelections();
	NgChm.UPM.setShowAll();
	if ((errorMsg != null) && (errorMsg[1] === "classPrefs")) {
		NgChm.UPM.showClassBreak(errorMsg[0]);
		NgChm.UPM.showClassPrefs();
	} else if ((errorMsg != null) && (errorMsg[1] === "layerPrefs")){ 
		NgChm.UPM.showLayerBreak(errorMsg[0]);
		NgChm.UPM.showLayerPrefs();
	} else if (NgChm.UPM.searchPerformed){ 
		NgChm.UPM.searchPerformed = false;
		NgChm.UPM.showClassPrefs();
	} else {
		NgChm.UPM.showLayerBreak(NgChm.SEL.currentDl);
		NgChm.UPM.showRowsColsPrefs();
	}
	errorMsg = null;

}

/**********************************************************************************
 * FUNCTION - prefsResize: The purpose of this function is to handle the resizing
 * of the preferences panel when the window is resized.
 **********************************************************************************/
NgChm.UPM.prefsResize = function() {
	var prefprefs = document.getElementById('prefPrefs');
	if (window.innerHeight > 730) {
		prefprefs.style.height = "85%";
	} else if (window.innerHeight > 500) {
		prefprefs.style.height = "80%";
	} else {
		prefprefs.style.height = "70%";
	}
}

/**********************************************************************************
 * FUNCTION - showRowsColsPrefs: The purpose of this function is to perform the 
 * processing for the preferences tab when the user selects the "Rows & Cols" tab.
 **********************************************************************************/
NgChm.UPM.showRowsColsPrefs = function() {
	//Turn off all tabs
	NgChm.UPM.hideAllPrefs();
	//Turn on layer prefs tab
	var rowsColsBtn = document.getElementById("prefRowsCols_btn");
	rowsColsBtn.setAttribute('src', NgChm.staticPath + 'images/rowsColsOn.png');
	var rowsColsDiv = document.getElementById("rowsColsPrefs");
	rowsColsDiv.style.display="block";
}


/**********************************************************************************
 * FUNCTION - showLayerPrefs: The purpose of this function is to perform the 
 * processing for the preferences tab when the user selects the "Data Layers" tab.
 **********************************************************************************/
NgChm.UPM.showLayerPrefs = function() {
	//Turn off all tabs
	NgChm.UPM.hideAllPrefs();
	//Turn on layer prefs tab
	var layerBtn = document.getElementById("prefLayer_btn");
	layerBtn.setAttribute('src', NgChm.staticPath + 'images/dataLayersOn.png');
	var layerDiv = document.getElementById("layerPrefs");
	layerDiv.style.display="block";
	NgChm.UPM.showLayerBreak();
}

/**********************************************************************************
 * FUNCTION - showClassPrefs: The purpose of this function is to perform the 
 * processing for the preferences tab when the user selects the "Covariates" tab.
 **********************************************************************************/
NgChm.UPM.showClassPrefs = function() {
	//Turn off all tabs
	NgChm.UPM.hideAllPrefs();
	//Turn on classification prefs tab
	var classBtn = document.getElementById("prefClass_btn");
	classBtn.setAttribute('src', NgChm.staticPath + 'images/covariateBarsOn.png');
	var classDiv = document.getElementById("classPrefs");
	classDiv.style.display="block";
}

/**********************************************************************************
 * FUNCTION - hideAllPrefs: The purpose of this function is to set all tabs off. It 
 * is called whenever a tab is clicked.  All tabs are set to hidden with their
 * image set to the "off" image.
 **********************************************************************************/
NgChm.UPM.hideAllPrefs = function() {
	var classBtn = document.getElementById("prefClass_btn");
	classBtn.setAttribute('src', NgChm.staticPath + 'images/covariateBarsOff.png');
	var classDiv = document.getElementById("classPrefs");
	classDiv.style.display="none";
	var layerBtn = document.getElementById("prefLayer_btn");
	layerBtn.setAttribute('src', NgChm.staticPath + 'images/dataLayersOff.png');
	var layerDiv = document.getElementById("layerPrefs");
	layerDiv.style.display="none";
	var rowsColsBtn = document.getElementById("prefRowsCols_btn");
	rowsColsBtn.setAttribute('src', NgChm.staticPath + 'images/rowsColsOff.png');
	var rowsColsDiv = document.getElementById("rowsColsPrefs");
	rowsColsDiv.style.display="none";
}

/**********************************************************************************
 * FUNCTION - prefsCancelButton: The purpose of this function is to perform all processing
 * necessary to exit the user preferences dialog WITHOUT applying or saving any 
 * changes made by the user when the Cancel button is pressed on the ColorMap 
 * preferences dialog.  Since the dataLayer colormap must be edited to add/delete
 * breakpoints, the backup colormap (saved when preferences are first opened) is re-
 * applied to the colorMapManager.  Then the preferences DIV is retrieved and removed.
 **********************************************************************************/
NgChm.UPM.prefsCancelButton = function() {
	if (NgChm.UPM.bkpColorMaps !== null) {
		var colorMapMgr = NgChm.heatMap.getColorMapManager();
		var dataLayers = NgChm.heatMap.getDataLayers();
		var i = 0;
		for (var key in dataLayers){
			colorMapMgr.setColorMap(key, NgChm.UPM.bkpColorMaps[i], "data");		
			i++;
		}
	}
	NgChm.UPM.removeSettingsPanels();
	//Hide the preferences panel
	document.getElementById('prefsPanel').style.display= 'none';
	NgChm.UPM.searchPerformed = false;
}

/**********************************************************************************
 * FUNCTION - removeSettingsPanels: The purpose of this function is to remove all 
 * panels that are content specific before closing the preferences dialog.
 **********************************************************************************/
NgChm.UPM.removeSettingsPanels = function() {
	
	//Remove all panels that are content specific before closing
	var pActions = document.getElementById("prefActions");
	pActions.parentNode.removeChild(pActions);
	
	var rcPrefs = document.getElementById("rowsColsPrefs");
	rcPrefs.parentNode.removeChild(rcPrefs);
	
	var lPrefs = document.getElementById("layerPrefs");
	lPrefs.parentNode.removeChild(lPrefs);
	
	var cPrefs = document.getElementById("classPrefs");
	cPrefs.parentNode.removeChild(cPrefs);

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
NgChm.UPM.prefsApplyButton = function() {
	//Perform validations of all user-entered data layer and covariate bar
	//preference changes.
	var errorMsg = NgChm.UPM.prefsValidate();
	if (errorMsg !== null) {
		NgChm.UPM.prefsError(errorMsg);
	} else { 
		NgChm.UPM.prefsApply();
		NgChm.heatMap.setUnAppliedChanges(true);
		NgChm.UPM.prefsSuccess();
	}
}

/**********************************************************************************
 * FUNCTION - prefsSuccess: The purpose of this function perform the functions
 * necessary when preferences are determined to be valid. It is shared by the
 * Apply and Save buttons.
 **********************************************************************************/
NgChm.UPM.prefsSuccess = function() {
	NgChm.UPM.filterVal = null;
	//Remove the backup color map (used to reinstate colors if user cancels)
	//and formally apply all changes to the heat map, re-draw, and exit preferences.
	NgChm.UPM.bkpColorMaps = null;
	NgChm.SUM.summaryInit();
	NgChm.DET.drawDetailHeatMap();
	NgChm.SEL.changeMode('NORMAL');
	NgChm.UPM.prefsCancelButton();
}

/**********************************************************************************
 * FUNCTION - prefsError: The purpose of this function perform the functions
 * necessary when preferences are determined to be invalid. It is shared by the
 * Apply and Save buttons.
 **********************************************************************************/
NgChm.UPM.prefsError = function(errorMsg) {
	//If a validation error exists, re-present the user preferences
	//dialog with the error message displayed in red. 
	NgChm.UPM.filterVal = null;
	NgChm.UPM.editPreferences(document.getElementById('gear_btn'),errorMsg);
}

/**********************************************************************************
 * FUNCTION - prefsApply: The purpose of this function is to apply all user
 * ColorMap preferences settings.  It is shared by the Apply and Save buttons.
 **********************************************************************************/
NgChm.UPM.prefsApply = function() {
	// Apply Row & Column Preferences
	var rowDendroConfig = NgChm.heatMap.getRowDendroConfig();   
	var rowOrganization = NgChm.heatMap.getRowOrganization();
	var rowOrder = rowOrganization['order_method'];
	if (rowOrder === "Hierarchical") {
		var rowDendroShowVal = document.getElementById("rowDendroShowPref").value;
		rowDendroConfig.show = rowDendroShowVal;
		rowDendroConfig.height = document.getElementById("rowDendroHeightPref").value;
	}	
	var colDendroConfig = NgChm.heatMap.getColDendroConfig();
	var colOrganization = NgChm.heatMap.getColOrganization();
	var colOrder = colOrganization['order_method'];
	if (colOrder === "Hierarchical") {
		var colDendroShowVal = document.getElementById("colDendroShowPref").value;
		colDendroConfig.show = colDendroShowVal;
		colDendroConfig.height = document.getElementById("colDendroHeightPref").value;
	}	
	// Apply Covariate Bar Preferences
	var rowClassBars = NgChm.heatMap.getRowClassificationConfig();
	for (var key in rowClassBars){
		var keyrow = key+"_row";
		var showElement = document.getElementById(keyrow+"_showPref");
		var heightElement = document.getElementById(keyrow+"_heightPref");
		if (heightElement.value === "0") {
			showElement.checked = false;
		}
		NgChm.heatMap.setClassificationPrefs(key,"row",showElement.checked,heightElement.value);
		NgChm.UPM.prefsApplyBreaks(key,"row");
	}
	var colClassBars = NgChm.heatMap.getColClassificationConfig();
	for (var key in colClassBars){
		var keycol = key+"_col";
		var showElement = document.getElementById(keycol+"_showPref");
		var heightElement = document.getElementById(keycol+"_heightPref");
		if (heightElement.value === "0") {
			showElement.checked = false;
		}
		NgChm.heatMap.setClassificationPrefs(key,"col",showElement.checked,heightElement.value);
		NgChm.UPM.prefsApplyBreaks(key,"col");
	}
/*	THIS CODE WAS COMMENTED OUT TO REMOVE MAP SIZING FEATURE BUT MAY RETURN
	// Apply Map Sizing Preferences
	var sumSize = document.getElementById("summaryWidthPref").value;
	var detSize = document.getElementById("detailWidthPref").value;
	var heightSize = document.getElementById("mapHeightPref").value;
	NgChm.heatMap.getMapInformation().summary_width = sumSize;
	NgChm.heatMap.getMapInformation().detail_width = detSize;
	NgChm.heatMap.getMapInformation().summary_height = heightSize;
	NgChm.heatMap.getMapInformation().detail_height = heightSize; */
	
	// Apply Label Sizing Preferences
	NgChm.heatMap.getMapInformation().label_display_length = document.getElementById("labelSizePref").value;
	NgChm.heatMap.getMapInformation().label_display_truncation = document.getElementById("labelTruncPref").value;  
	
	// Apply Data Layer Preferences
	var dataLayers = NgChm.heatMap.getDataLayers();
	for (var key in dataLayers){
		var showGrid = document.getElementById(key+'_gridPref');
		var gridColor = document.getElementById(key+'_gridColorPref');
		var selectionColor = document.getElementById(key+'_selectionColorPref');
		NgChm.heatMap.setLayerGridPrefs(key, showGrid.checked,gridColor.value,selectionColor.value)
		NgChm.UPM.prefsApplyBreaks(key,"data");
	}
}

/**********************************************************************************
 * FUNCTION - prefsValidate: The purpose of this function is to validate all user
 * changes to the heatmap properties. When the very first error is found, an error 
 * message (string array containing error information) is created and returned to 
 * the prefsApply function. 
 **********************************************************************************/
NgChm.UPM.prefsValidate = function() {
	var errorMsg = null;
	errorMsg = NgChm.UPM.prefsValidateForNumeric();
	//Validate all breakpoints and colors for the main data layer
	if (errorMsg === null) {
		var dataLayers = NgChm.heatMap.getDataLayers();
		for (var key in dataLayers){
			errorMsg = NgChm.UPM.prefsValidateBreakPoints(key,"layerPrefs");
			if (errorMsg != null) break;
		}
	}
	
	return errorMsg;
}


/**********************************************************************************
 * FUNCTION - prefsValidateInputBoxs: The purpose of this function is to validate 
 * all user text input boxes that require positive numeric values. 
 **********************************************************************************/
NgChm.UPM.prefsValidateForNumeric = function() {
	var errorMsg = null;
	var rowClassBars = NgChm.heatMap.getRowClassificationConfig();
	for (var key in rowClassBars) {
		var elem = document.getElementById(key+"_row_heightPref");
		var elemVal = elem.value;
		if ((isNaN(elemVal)) || (parseInt(elemVal) < 0) || (elemVal === "")) {
			errorMsg =  ["ALL", "classPrefs", "ERROR: Bar heights must be between 0 and 99"];
		    return errorMsg;
		}
	}
	if (errorMsg === null) {
		var colClassBars = NgChm.heatMap.getColClassificationConfig();
		for (var key in colClassBars) {
			var elem = document.getElementById(key+"_col_heightPref");
			var elemVal = elem.value;
			if ((isNaN(elemVal)) || (parseInt(elemVal) < 0) || (elemVal === "")) {
				errorMsg =  ["ALL", "classPrefs", "ERROR: Bar heights must be between 0 and 99"];
				 return errorMsg;
			}
		}
	}
	/*	THIS CODE WAS COMMENTED OUT TO REMOVE MAP SIZING FEATURE BUT MAY RETURN
	if (errorMsg === null) {
		var elem = document.getElementById("summaryWidthPref");
		var elemVal = elem.value;
		if ((isNaN(elemVal)) || (parseInt(elemVal) < 0) || (parseInt(elemVal) > 100)) {
			errorMsg =  [null, "rowsColsPrefs", "ERROR: Summary Width % must be between 0 and 100"];
			 return errorMsg;
		}
		var elem = document.getElementById("detailWidthPref");
		var elemVal = elem.value;
		if ((isNaN(elemVal)) || (parseInt(elemVal) < 0) || (parseInt(elemVal) > 100)) {
			errorMsg =  [null, "rowsColsPrefs", "ERROR: Detail Width % must be between 0 and 100"];
			 return errorMsg;
		}
		var elem = document.getElementById("mapHeightPref");
		var elemVal = elem.value;
		if ((isNaN(elemVal)) || (parseInt(elemVal) < 0) || (parseInt(elemVal) > 100)) {
			errorMsg =  [null, "rowsColsPrefs", "ERROR: Map Height % must be between 0 and 100"];
			 return errorMsg;
		}
	} */
	return errorMsg;
}

/**********************************************************************************
 * FUNCTION - prefsValidateBreakPoints: The purpose of this function is to validate 
 * all user breakpoint and color changes to heatmap data layer properties. When the  
 * first error is found, an error  message (string array containing error information) 
 * is created and returned to the prefsApply function. 
 **********************************************************************************/
NgChm.UPM.prefsValidateBreakPoints = function(colorMapName,prefPanel) {
	var colorMap = NgChm.heatMap.getColorMapManager().getColorMap("data",colorMapName);
	var thresholds = colorMap.getThresholds();
	var colors = colorMap.getColors();
	var charBreak = false;
	var dupeBreak = false;
	var breakOrder = false;
	var prevBreakValue = -99999;
	var errorMsg = null;
	//Loop thru colormap thresholds and validate for order and duplicates
	for (var i = 0; i < thresholds.length; i++) {
		var breakElement = document.getElementById(colorMapName+"_breakPt"+i+"_breakPref");
		//If current breakpoint is not numeric
		if (isNaN(breakElement.value)) {
			charBreak = true;
			break;
		}
		
		//If current breakpoint is not greater than previous, throw order error
		if (parseInt(breakElement.value) < prevBreakValue) {
			breakOrder = true;
			break;
		}
		//Loop thru thresholds, skipping current element, searching for a match to the 
		//current selection.  If found, throw duplicate error
		for (var j = 0; j < thresholds.length; j++) {
			var be = document.getElementById(colorMapName+"_breakPt"+j+"_breakPref");
			if (i != j) {
				if (Number(breakElement.value) === Number(be.value)) {
					dupeBreak = true;
					break;
				}
			}
		}
		prevBreakValue = breakElement.value;
	}
	if (charBreak) {
		errorMsg =  [colorMapName, prefPanel, "ERROR: Data layer breakpoints must be numeric"];
	}
	if (breakOrder) {
		errorMsg =  [colorMapName, prefPanel, "ERROR: Data layer breakpoints must be in order"];
	}
	if (dupeBreak) {
		errorMsg =  [colorMapName, prefPanel, "ERROR: Duplicate data layer breakpoint found"];
	}
	
	return errorMsg;
}

/**********************************************************************************
 * FUNCTION - prefsValidateBreakColors: The purpose of this function is to validate 
 * all user color changes to heatmap classification and data layer properties. When the  
 * first error is found, an error  message (string array containing error information) 
 * is created and returned to the prefsApply function. 
 **********************************************************************************/
NgChm.UPM.prefsValidateBreakColors = function(colorMapName,type, prefPanel) {
	var colorMap = NgChm.heatMap.getColorMapManager().getColorMap(type,colorMapName);
	var key = colorMapName;
	if (type !== "data") {
		key = key+"_"+type;
	}
	var thresholds = colorMap.getThresholds();
	var colors = colorMap.getColors();
	var dupeColor = false;
	for (var i = 0; i < colors.length; i++) {
		c
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
NgChm.UPM.prefsApplyBreaks = function(colorMapName, type) {
	var colorMap = NgChm.heatMap.getColorMapManager().getColorMap(type,colorMapName);
	var thresholds = colorMap.getThresholds();
	var colors = colorMap.getColors();
	var newColors = NgChm.UPM.getNewBreakColors(colorMapName, type);
	colorMap.setColors(newColors);
	var key = colorMapName;
	if (type === "data") {
		var newThresholds = NgChm.UPM.getNewBreakThresholds(colorMapName);
		colorMap.setThresholds(newThresholds);
	} else {
		key = key+"_"+type;
	}
	var missingElement = document.getElementById(key+"_missing_colorPref");
	colorMap.setMissingColor(missingElement.value);
	var colorMapMgr = NgChm.heatMap.getColorMapManager();
	colorMapMgr.setColorMap(colorMapName, colorMap, type);
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
NgChm.UPM.getNewBreakColors = function(colorMapName, type, pos, action) {
	var colorMap = NgChm.heatMap.getColorMapManager().getColorMap(type,colorMapName);
	var thresholds = colorMap.getThresholds();
	var newColors = [];
	var key = colorMapName;
	if (type !== "data") {
		key = key+"_"+type;
	}
	for (var j = 0; j < thresholds.length; j++) {
		var colorElement = document.getElementById(key+"_color"+j+"_colorPref");
		//If being called from addLayerBreak or deleteLayerBreak
		if (typeof pos !== 'undefined') {
			if (action === "add") {
				newColors.push(colorElement.value);
				if (j === pos) {
					newColors.push(colorElement.value);
				}
			} else {
				if (j !== pos) {
					newColors.push(colorElement.value);
				}
			}
		} else {
			newColors.push(colorElement.value);
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
NgChm.UPM.getNewBreakThresholds = function(colorMapName, pos, action) {
	var colorMap = NgChm.heatMap.getColorMapManager().getColorMap("data",colorMapName);
	var thresholds = colorMap.getThresholds();
	var newThresholds = [];
	for (var j = 0; j < thresholds.length; j++) {
		var breakElement = document.getElementById(colorMapName+"_breakPt"+j+"_breakPref");
		if (typeof pos !== 'undefined') {
			if (action === "add") {
				newThresholds.push(breakElement.value);
				if (j === pos) {
					newThresholds.push(breakElement.value);
				}
			} else {
				if (j !== pos) {
					newThresholds.push(breakElement.value);
				}
			}
		} else {
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
NgChm.UPM.setupLayerPrefs = function(e, prefprefs) {
	var layerprefs = NgChm.UHM.getDivElement("layerPrefs");
	var prefContents = document.createElement("TABLE");
	var dataLayers = NgChm.heatMap.getDataLayers();
	var colorMapName = "dl1";
	NgChm.UHM.addBlankRow(prefContents);
	var dlSelect = "<select name='dlPref_list' id='dlPref_list' onchange='NgChm.UPM.showLayerBreak();'>"
	// Re-order options in datalayer order (which is lost on JSON save)
	var dls = new Array(Object.keys(dataLayers).length);
	var orderedKeys = new Array(Object.keys(dataLayers).length);
	var dlOptions = "";
	for (var key in dataLayers){
		var dlNext = key.substring(2, key.length);
		orderedKeys[dlNext-1] = key;
		var displayName = dataLayers[key].name;
		if (displayName.length > 20){
			displayName = displayName.substring(0,20) + "...";
		}
		dls[dlNext-1] = '<option value="'+key+'">'+displayName+'</option>';
	}
	for(var i=0;i<dls.length;i++) {
		dlOptions += dls[i];
	}
	dlSelect += dlOptions+"</select>";  
	NgChm.UHM.setTableRow(prefContents,["&nbsp;Data Layer: ", dlSelect]);
	NgChm.UHM.addBlankRow(prefContents, 2)
	layerprefs.appendChild(prefContents);
	NgChm.UHM.addBlankRow(prefContents)
	// Loop data layers, setting up a panel div for each layer
	for (var key in dataLayers){
		var breakprefs = NgChm.UPM.setupLayerBreaks(e, key);
		breakprefs.style.display="none";
		layerprefs.appendChild(breakprefs);
	}

	return layerprefs;
}

/**********************************************************************************
 * FUNCTION - setupLayerBreaks: The purpose of this function is to construct a DIV 
 * containing a list of breakpoints/colors for a given matrix data layer.
 **********************************************************************************/
NgChm.UPM.setupLayerBreaks = function(e, mapName) {
	var colorMap = NgChm.heatMap.getColorMapManager().getColorMap("data",mapName);
	var thresholds = colorMap.getThresholds();
	var colors = colorMap.getColors();
	var helpprefs = NgChm.UHM.getDivElement("breakPrefs_"+mapName);
	var prefContents = document.createElement("TABLE"); 
	var dataLayers = NgChm.heatMap.getDataLayers();
	var layer = dataLayers[mapName];
	var gridShow = "<input name='"+mapName+"_gridPref' id='"+mapName+"_gridPref' type='checkbox' ";
	if (layer.grid_show == 'Y') {
		gridShow = gridShow+"checked"
	}
	gridShow = gridShow+ " >";
	var gridColorInput = "<input class='spectrumColor' type='color' name='"+mapName+"_gridColorPref' id='"+mapName+"_gridColorPref' value='"+layer.grid_color+"'>"; 
	var selectionColorInput = "<input class='spectrumColor' type='color' name='"+mapName+"_selectionColorPref' id='"+mapName+"_selectionColorPref' value='"+layer.selection_color+"'>"; 
	NgChm.UHM.addBlankRow(prefContents, 2)
	NgChm.UHM.setTableRow(prefContents, ["&nbsp;<u>Breakpoint</u>", "<u><b>Color</b></u>","&nbsp;"]); 
	for (var j = 0; j < thresholds.length; j++) {
		var threshold = thresholds[j];    
		var color = colors[j];
		var threshId = mapName+"_breakPt"+j;
		var colorId = mapName+"_color"+j;
		var breakPtInput = "&nbsp;&nbsp;<input name='"+threshId+"_breakPref' id='"+threshId+"_breakPref' value='"+threshold+"' maxlength='8' size='8'>";
		var colorInput = "<input class='spectrumColor' type='color' name='"+colorId+"_colorPref' id='"+colorId+"_colorPref' value='"+color+"'>"; 
		var addButton = "<img id='"+threshId+"_breakAdd' src='" + NgChm.staticPath + "images/plusButton.png' alt='Add Breakpoint' onclick='NgChm.UPM.addLayerBreak("+j+",\""+mapName+"\");' align='top'/>"
		var delButton = "<img id='"+threshId+"_breakDel' src='" + NgChm.staticPath + "images/minusButton.png' alt='Remove Breakpoint' onclick='NgChm.UPM.deleteLayerBreak("+j+",\""+mapName+"\");' align='top'/>"
		if (j === 0) {
			NgChm.UHM.setTableRow(prefContents, [breakPtInput, colorInput, addButton]);
		} else {
			NgChm.UHM.setTableRow(prefContents, [breakPtInput,  colorInput, addButton+ delButton]);
		}
	} 
	NgChm.UHM.addBlankRow(prefContents)
	NgChm.UHM.setTableRow(prefContents, ["&nbsp;Missing Color:",  "<input class='spectrumColor' type='color' name='"+mapName+"_missing_colorPref' id='"+mapName+"_missing_colorPref' value='"+colorMap.getMissingColor()+"'>"]);
	NgChm.UHM.addBlankRow(prefContents, 3)
	// predefined color schemes put here
	NgChm.UHM.setTableRow(prefContents, ["&nbsp;<u>Choose a pre-defined color palette:</u>"],3);
	NgChm.UHM.addBlankRow(prefContents);
	var rainbow = "<div style='display:flex'><div id='setROYGBV' class='presetPalette' style='background: linear-gradient(to right, red,orange,yellow,green,blue,violet);' onclick='NgChm.UPM.setupLayerBreaksToPreset(event, \""+ mapName+ "\", [\"#FF0000\",\"#FF8000\",\"#FFFF00\",\"#00FF00\",\"#0000FF\",\"#FF00FF\"],\"#000000\")' > </div>" +
			"<div class='presetPaletteMissingColor' style='background:black'></div></div>";
	var redWhiteBlue = "<div style='display:flex'><div id='setRedWhiteBlue' class='presetPalette' style='background: linear-gradient(to right, blue,white,red);' onclick='NgChm.UPM.setupLayerBreaksToPreset(event, \""+ mapName+ "\", [\"#0000FF\",\"#FFFFFF\",\"#ff0000\"],\"#000000\")'> </div>" +
			"<div class='presetPaletteMissingColor' style='background:black'></div></div>";
	var redBlackGreen = "<div style='display:flex'><div id='setRedBlackGreen' class='presetPalette' style='background: linear-gradient(to right, green,black,red);' onclick='NgChm.UPM.setupLayerBreaksToPreset(event, \""+ mapName+ "\", [\"#00FF00\",\"#000000\",\"#FF0000\"],\"#ffffff\")'> </div>" +
			"<div class='presetPaletteMissingColor' style='background:white'></div></div>"
	NgChm.UHM.setTableRow(prefContents, [ redWhiteBlue, rainbow, redBlackGreen ]);
	NgChm.UHM.setTableRow(prefContents, ["&nbsp;Blue Red",  "&nbsp;<b>Rainbow</b>","&nbsp;<b>Green Red</b>"]);
	NgChm.UHM.addBlankRow(prefContents, 3)
	NgChm.UHM.setTableRow(prefContents, ["&nbsp;Grid Lines:", gridColorInput, "<b>Show:&nbsp;&nbsp;</b>"+gridShow]); 
	NgChm.UHM.setTableRow(prefContents, ["&nbsp;Selection Color:", selectionColorInput]); 
	helpprefs.style.height = prefContents.rows.length;
	helpprefs.appendChild(prefContents);
	
	return helpprefs;
}	

/**********************************************************************************
 * FUNCTION - setupLayerBreaksToPreset: This function will be executed when the user
 * selects a predefined color scheme. It will fill the first and last breakpoints with the 
 * predefined colors and interpolate the breakpoints in between.
 * "preset" is an array of the colors in HEX of the predefined color scheme
 **********************************************************************************/
NgChm.UPM.setupLayerBreaksToPreset = function(e, mapName, preset, missingColor,axis,type) {
	var elemName = mapName;
	if (typeof axis != 'undefined') {
		elemName += "_"+axis;
	}
	var i = 0; // find number of breakpoints in the 
	while(document.getElementById(elemName+"_color"+ ++i+"_colorPref"));
	var lastShown = i-1;
	// create dummy colorScheme
	var thresh = [];
	if (document.getElementById(elemName+"_breakPt0_breakPref")){ // if the breakpoints are changeable (data layer)...
		var firstBP = document.getElementById(elemName+"_breakPt0_breakPref").value;
		var lastBP = document.getElementById(elemName+"_breakPt"+ lastShown +"_breakPref").value;
		var range = lastBP-firstBP;
		for (var j = 0; j < preset.length; j++){
			thresh[j] =Number(firstBP)+j*(range/(preset.length-1));
		}
		var colorScheme = {"missing": missingColor,"thresholds": thresh,"colors": preset,"type": "continuous"};
		var csTemp = new NgChm.CMM.ColorMap(colorScheme);
		
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
			var colorMap = NgChm.heatMap.getColorMapManager().getColorMap(axis, mapName)
			var thresholds = colorMap.getThresholds();
			var range = thresholds[thresholds.length-1]-thresholds[0];
			for (var j = 0; j < preset.length; j++){
				thresh[j] = Number(thresholds[0])+j*(range/(preset.length-1));
			}
			var colorScheme = {"missing": missingColor,"thresholds": thresh,"colors": preset,"type": "continuous"};
			var csTemp = new NgChm.CMM.ColorMap(colorScheme);
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
NgChm.UPM.showLayerBreak = function(selLayer) {
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
NgChm.UPM.addLayerBreak = function(pos,colorMapName) {
	//Retrieve colormap for data layer
	var colorMap = NgChm.heatMap.getColorMapManager().getColorMap("data",colorMapName);
	var newThresholds = NgChm.UPM.getNewBreakThresholds(colorMapName, pos, "add");
	var newColors = NgChm.UPM.getNewBreakColors(colorMapName, "data", pos, "add");
	colorMap.setThresholds(newThresholds);
	colorMap.setColors(newColors);
	NgChm.UPM.reloadLayerBreaksColorMap(colorMapName, colorMap);
}

/**********************************************************************************
 * FUNCTION - deleteLayerBreak: The purpose of this function is to remove a breakpoint
 * row from a data layer colormap.   
 **********************************************************************************/
NgChm.UPM.deleteLayerBreak = function(pos,colorMapName) {
	var colorMap = NgChm.heatMap.getColorMapManager().getColorMap("data",colorMapName);
	var thresholds = colorMap.getThresholds();
	var colors = colorMap.getColors();
	var newThresholds = NgChm.UPM.getNewBreakThresholds(colorMapName, pos, "delete");
	var newColors = NgChm.UPM.getNewBreakColors(colorMapName, "data", pos, "delete");
	//Apply new arrays for thresholds and colors to the datalayer
	//and reload the colormap.
	colorMap.setThresholds(newThresholds);
	colorMap.setColors(newColors);
	NgChm.UPM.reloadLayerBreaksColorMap(colorMapName, colorMap);
}

/**********************************************************************************
 * FUNCTION - reloadLayerBreaksColorMap: The purpose of this function is to reload
 * the colormap for a given data layer.  The add/deleteLayerBreak methods call
 * this common function.  The layerPrefs DIV is retrieved and the setupLayerBreaks
 * method is called, passing in the newly edited colormap. 
 **********************************************************************************/
NgChm.UPM.reloadLayerBreaksColorMap = function(colorMapName, colorMap) {
	var e = document.getElementById('gear_btn')
	var colorMapMgr = NgChm.heatMap.getColorMapManager();
	colorMapMgr.setColorMap(colorMapName, colorMap, "data");
	var breakPrefs = document.getElementById('breakPrefs_'+colorMapName);
	if (breakPrefs){
		breakPrefs.remove();
	}
	var layerprefs = NgChm.UHM.getDivElement("layerPrefs");
	var breakPrefs = NgChm.UPM.setupLayerBreaks(e, colorMapName, colorMapName);
	breakPrefs.style.display="block";
	layerPrefs.appendChild(breakPrefs);
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
NgChm.UPM.setupClassPrefs = function(e, prefprefs) {
	var rowClassBars = NgChm.heatMap.getRowClassificationConfig();
	var rowClassBarsOrder = NgChm.heatMap.getRowClassificationOrder();
	var colClassBars = NgChm.heatMap.getColClassificationConfig();
	var colClassBarsOrder = NgChm.heatMap.getColClassificationOrder();
	var classprefs = NgChm.UHM.getDivElement("classPrefs");
	var prefContents = document.createElement("TABLE");
	NgChm.UHM.addBlankRow(prefContents);
	var filterInput = "<input name='all_searchPref' id='all_searchPref'>";
	var filterButton = "<img id='all_searchPref_btn' src='" + NgChm.staticPath + "images/filterClassButton.png' alt='Filter Covariates' onclick='NgChm.UPM.filterClassPrefs(true);' align='top'/>";
	var searchClasses = filterInput+"&nbsp;&nbsp;"+filterButton+"&emsp;&emsp;";
	NgChm.UHM.setTableRow(prefContents,[searchClasses], 4, 'right');
	NgChm.UHM.addBlankRow(prefContents,2);
	var classSelect = "<select name='classPref_list' id='classPref_list' onchange='NgChm.UPM.showClassBreak();'></select>"
	NgChm.UHM.setTableRow(prefContents,["&nbsp;Covariate Bar: ", classSelect]);
	NgChm.UHM.addBlankRow(prefContents);
	classprefs.appendChild(prefContents);
	var i = 0;
	for (var i = 0; i < rowClassBarsOrder.length;i++){
		var key = rowClassBarsOrder[i];
		var currentClassBar = rowClassBars[key];
		if (NgChm.UPM.filterShow(key)) {
			var breakprefs = NgChm.UPM.setupClassBreaks(e, key, "row", currentClassBar);
			breakprefs.style.display="none";
			//breakprefs.style.width = 300;
			classprefs.appendChild(breakprefs);
		}
	}
	for (var i = 0; i < colClassBarsOrder.length;i++){
		var key = colClassBarsOrder[i];
		var currentClassBar = colClassBars[key];
		if (NgChm.UPM.filterShow(key)) {
			var breakprefs = NgChm.UPM.setupClassBreaks(e, key, "col", currentClassBar);
			breakprefs.style.display="none";
			//breakprefs.style.width = 300;
			classprefs.appendChild(breakprefs);
		}
	}
	// Append a DIV panel for all of the covariate class bars 
	var allPrefs = NgChm.UPM.setupAllClassesPrefs(); 
	allPrefs.style.display="block";
	classprefs.appendChild(allPrefs);
	
	return classprefs;
}

/**********************************************************************************
 * FUNCTION - setupAllClassesPrefs: The purpose of this function is to construct a DIV 
 * containing a list of all covariate bars with informational data and user preferences 
 * that are common to all bars (show/hide and size).  
 **********************************************************************************/
NgChm.UPM.setupAllClassesPrefs = function() {
	var allprefs = NgChm.UHM.getDivElement("breakPrefs_ALL");
	allprefs.style.height="100px";
	var prefContents = document.createElement("TABLE");
	prefContents.id = "tableAllClasses";
	NgChm.UHM.addBlankRow(prefContents);
	var colShowAll = "<input name='all_showPref' id='all_showPref' type='checkbox' onchange='NgChm.UPM.showAllBars();'> ";
	NgChm.UHM.setTableRow(prefContents,["&nbsp;<u>"+"Covariate"+"</u>", "<b><u>"+"Position"+"</u></b>", colShowAll+"<b><u>"+"Show"+"</u></b>", "<b><u>"+"Height"+"</u></b>"]);
	var checkState = true;
	var rowClassBars = NgChm.heatMap.getRowClassificationConfig();
	var rowClassBarsOrder = NgChm.heatMap.getRowClassificationOrder();
	for (var i = 0;  i < rowClassBarsOrder.length; i++){
		var key = rowClassBarsOrder[i];
		var currentClassBar = rowClassBars[key];
		var keyrow = key+"_row";
		if (NgChm.UPM.filterShow(key)) {
			var colShow = "&emsp;&emsp;<input name='"+keyrow+"_showPref' id='"+keyrow+"_showPref' type='checkbox' onchange='NgChm.UPM.setShowAll();'";
			if (currentClassBar.show == 'Y') {
				colShow = colShow+"checked"
			}
			colShow = colShow+ " >";
			var colHeight = "<input name='"+keyrow+"_heightPref' id='"+keyrow+"_heightPref' value='"+currentClassBar.height+"' maxlength='2' size='2'>&emsp;";
			var displayName = key;
			if (key.length > 20){
				displayName = key.substring(0,20) + "...";
			}
			NgChm.UHM.setTableRow(prefContents,["&nbsp;&nbsp;"+displayName,"Row",colShow,colHeight]); 
		}
	}
	var colClassBars = NgChm.heatMap.getColClassificationConfig();
	var colClassBarsOrder = NgChm.heatMap.getColClassificationOrder();
	for (var i = 0; i < colClassBarsOrder.length; i++){
		var key = colClassBarsOrder[i];
		var currentClassBar = colClassBars[key];
		var keycol = key+"_col";
		if (NgChm.UPM.filterShow(key)) {
			var colShow = "&emsp;&emsp;<input name='"+keycol+"_showPref' id='"+keycol+"_showPref' type='checkbox' onchange='NgChm.UPM.setShowAll();'";
			if (currentClassBar.show == 'Y') {
				colShow = colShow+"checked"
			}
			colShow = colShow+ " >";
			var colHeight = "<input name='"+keycol+"_heightPref' id='"+keycol+"_heightPref' value='"+currentClassBar.height+"' maxlength='2' size='2'>&emsp;";
			var displayName = key;
			if (key.length > 20){
				displayName = key.substring(0,20) + "...";
			}
			NgChm.UHM.setTableRow(prefContents,["&nbsp;&nbsp;"+displayName,"Col",colShow,colHeight]); 
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
NgChm.UPM.setupClassBreaks = function(e, key, barType, classBar) {
	//must add barType to key when adding objects to DOM
	var keyRC = key+"_"+barType;
	var colorMap = NgChm.heatMap.getColorMapManager().getColorMap(barType, key);
	var thresholds = colorMap.getThresholds();
	var colors = colorMap.getColors();
	var helpprefs = NgChm.UHM.getDivElement("breakPrefs_"+keyRC);
	var prefContents = document.createElement("TABLE"); 
	NgChm.UHM.addBlankRow(prefContents);
	var pos = NgChm.UTIL.toTitleCase(barType);
	var typ = NgChm.UTIL.toTitleCase(colorMap.getType());
	NgChm.UHM.setTableRow(prefContents,["&nbsp;Bar Position: ","<b>"+pos+"</b>"]);
	NgChm.UHM.setTableRow(prefContents,["&nbsp;Bar Type: ","<b>"+typ+"</b>"]);
	NgChm.UHM.addBlankRow(prefContents, 3);
	NgChm.UHM.setTableRow(prefContents, ["&nbsp;<u>Category</u>","<b><u>"+"Color"+"</b></u>"]); 
	for (var j = 0; j < thresholds.length; j++) {
		var threshold = thresholds[j];
		var color = colors[j];
		var threshId = keyRC+"_breakPt"+j;
		var colorId = keyRC+"_color"+j;
		var colorInput = "<input class='spectrumColor' type='color' name='"+colorId+"_colorPref' id='"+colorId+"_colorPref' value='"+color+"'>"; 
		NgChm.UHM.setTableRow(prefContents, ["&nbsp;&nbsp;"+threshold, colorInput]);
	} 
	NgChm.UHM.addBlankRow(prefContents);
	NgChm.UHM.setTableRow(prefContents, ["&nbsp;Missing Color:",  "<input class='spectrumColor' type='color' name='"+keyRC+"_missing_colorPref' id='"+keyRC+"_missing_colorPref' value='"+colorMap.getMissingColor()+"'>"]);
	NgChm.UHM.addBlankRow(prefContents, 3);
	NgChm.UHM.setTableRow(prefContents, ["&nbsp;<u>Choose a pre-defined color palette:</u>"],3);
	NgChm.UHM.addBlankRow(prefContents);
	if (typ == "Discrete"){
		var scheme1 = "<div style='display:flex'><div class='presetPalette' style='background: linear-gradient(to right, #1f77b4,#ff7f0e,#2ca02c,#d62728,#9467bd,#8c564b,#e377c2,#7f7f7f,#bcbd22,#17becf);' onclick='NgChm.UPM.setupLayerBreaksToPreset(event, \""+ key+ "\", [\"#1f77b4\",\"#ff7f0e\",\"#2ca02c\", \"#d62728\", \"#9467bd\", \"#8c564b\", \"#e377c2\", \"#7f7f7f\", \"#bcbd22\", \"#17becf\"],\"#ffffff\",\""+barType+"\",\""+typ+"\")'> </div><div class='presetPaletteMissingColor' style='background:white'></div></div>";
		var scheme2 = "<div style='display:flex'><div class='presetPalette' style='background: linear-gradient(to right, #1f77b4,#aec7e8,#ff7f0e,#ffbb78,#2ca02c,#98df8a,#d62728,#ff9896,#9467bd,#c5b0d5,#8c564b,#c49c94,#e377c2,#f7b6d2,#7f7f7f,#c7c7c7,#bcbd22,#dbdb8d,#17becf,#9edae5);' onclick='NgChm.UPM.setupLayerBreaksToPreset(event, \""+ key+ "\", [\"#1f77b4\",\"#aec7e8\",\"#ff7f0e\",\"#ffbb78\",\"#2ca02c\",\"#98df8a\",\"#d62728\",\"#ff9896\",\"#9467bd\",\"#c5b0d5\",\"#8c564b\",\"#c49c94\",\"#e377c2\",\"#f7b6d2\",\"#7f7f7f\",\"#c7c7c7\",\"#bcbd22\",\"#dbdb8d\",\"#17becf\",\"#9edae5\"],\"#ffffff\",\""+barType+"\",\""+typ+"\")'> </div><div class='presetPaletteMissingColor' style='background:white'></div></div>";
		var scheme3 = "<div style='display:flex'><div class='presetPalette' style='background: linear-gradient(to right,#393b79, #637939, #8c6d31, #843c39, #7b4173, #5254a3, #8ca252, #bd9e39, #ad494a, #a55194, #6b6ecf, #b5cf6b, #e7ba52, #d6616b, #ce6dbd, #9c9ede, #cedb9c, #e7cb94, #e7969c, #de9ed6);' onclick='NgChm.UPM.setupLayerBreaksToPreset(event, \""+ key+ "\", [\"#393b79\", \"#637939\", \"#8c6d31\", \"#843c39\", \"#7b4173\", \"#5254a3\", \"#8ca252\", \"#bd9e39\", \"#ad494a\", \"#a55194\", \"#6b6ecf\", \"#b5cf6b\", \"#e7ba52\", \"#d6616b\", \"#ce6dbd\", \"#9c9ede\", \"#cedb9c\", \"#e7cb94\", \"#e7969c\", \"#de9ed6\"],\"#ffffff\",\""+barType+"\",\""+typ+"\")'> </div><div class='presetPaletteMissingColor' style='background:white'></div></div>";
		NgChm.UHM.setTableRow(prefContents, [scheme1,scheme2,scheme3]);
		NgChm.UHM.setTableRow(prefContents, ["&nbsp;Palette1",  "&nbsp;<b>Palette2</b>","&nbsp;<b>Palette3</b>"]);
	} else {
		var rainbow = "<div style='display:flex'><div class='presetPalette' style='background: linear-gradient(to right, red,orange,yellow,green,blue,violet);' onclick='NgChm.UPM.setupLayerBreaksToPreset(event, \""+ key+ "\", [\"#FF0000\",\"#FF8000\",\"#FFFF00\",\"#00FF00\",\"#0000FF\",\"#FF00FF\"],\"#000000\",\""+barType+"\",\""+typ+"\")' > </div><div class='presetPaletteMissingColor' style='background:black'></div></div>";
		var greyscale = "<div style='display:flex'><div class='presetPalette' style='background: linear-gradient(to right, white,black);' onclick='NgChm.UPM.setupLayerBreaksToPreset(event, \""+ key+ "\", [\"#FFFFFF\",\"#000000\"],\"#FF0000\",\""+barType+"\",\""+typ+"\")' > </div><div class='presetPaletteMissingColor' style='background:red'></div></div>";
		var redBlackGreen = "<div style='display:flex'><div id='setRedBlackGreen' class='presetPalette' style='background: linear-gradient(to right, green,black,red);' onclick='NgChm.UPM.setupLayerBreaksToPreset(event, \""+ key +"\", [\"#00FF00\",\"#000000\",\"#FF0000\"],\"#ffffff\",\""+barType+"\",\""+typ+"\")'> </div>" +
		"<div class='presetPaletteMissingColor' style='background:white'></div></div>"
		NgChm.UHM.setTableRow(prefContents, [greyscale,rainbow,redBlackGreen]);
		NgChm.UHM.setTableRow(prefContents, ["&nbsp;Greyscale",  "&nbsp;<b>Rainbow</b>","&nbsp;<b>Green Red</b>"]);
	}
	helpprefs.style.height = prefContents.rows.length;
	helpprefs.appendChild(prefContents);

	return helpprefs;
}	

/**********************************************************************************
 * FUNCTION - showAllBars: The purpose of this function is to set the condition of
 * the "show" checkbox for all covariate bars on the covariate bars tab of the user 
 * preferences dialog. These checkboxes are located on the DIV that is visible when 
 * the ALL entry of the covariate dropdown is selected. Whenever a  user checks the 
 * show all box, all other boxes are checked.  
 **********************************************************************************/
NgChm.UPM.showAllBars = function() {
	var showAllBox = document.getElementById('all_showPref');
	var checkState = false;
	if (showAllBox.checked) {
		checkState = true;
	}
	var rowClassBars = NgChm.heatMap.getRowClassificationConfig();
	for (var key in rowClassBars){
		if (NgChm.UPM.filterShow(key)) {
			var colShow = document.getElementById(key+"_row"+'_showPref');
			colShow.checked = checkState;
		}
	}
	var colClassBars = NgChm.heatMap.getColClassificationConfig();
	for (var key in colClassBars){
		if (NgChm.UPM.filterShow(key)) {
			var colShow = document.getElementById(key+"_col"+'_showPref');
			colShow.checked = checkState;
		}
	}
	
	return;
}	

/**********************************************************************************
 * FUNCTION - setShowAll: The purpose of this function is to set the condition of
 * the "show all" checkbox on the covariate bars tab of the user preferences dialog.
 * This checkbox is located on the DIV that is visible when the ALL entry of the 
 * covariate dropdown is selected. If a user un-checks a single box in the list of 
 * covariate bars, the show all box is un-checked. Conversely, if a user checks a box 
 * resulting in all of the boxes being selected, the show all box will be checked.
 **********************************************************************************/
NgChm.UPM.setShowAll = function() {
	var checkState = true;
	var rowClassBars = NgChm.heatMap.getRowClassificationConfig();
	for (var key in rowClassBars){
		var colShow = document.getElementById(key+"_row"+'_showPref');
		if (NgChm.UPM.filterShow(key)) {
			if (!colShow.checked) {
				checkState = false;
				break;
			}
		}
	}
	var colClassBars = NgChm.heatMap.getColClassificationConfig();
	for (var key in colClassBars){
		var colShow = document.getElementById(key+"_col"+'_showPref');
		if (NgChm.UPM.filterShow(key)) {
			if (!colShow.checked) {
				checkState = false;
				break;
			}
		}
	}
	var showAllBox = document.getElementById('all_showPref');
	showAllBox.checked = checkState;
	
	return;
}	

/**********************************************************************************
 * FUNCTION - showClassBreak: The purpose of this function is to show the 
 * appropriate classification bar panel based upon the user selection of the 
 * covariate dropdown on the covariates tab of the preferences screen.  This 
 * function is also called when an error is trappped, opening the covariate DIV
 * that contains the erroneous data entry.
 **********************************************************************************/
NgChm.UPM.showClassBreak = function(selClass) {
	var classBtn = document.getElementById("classPref_list");
	if (typeof selClass != 'undefined') {
		classBtn.value = selClass;
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
NgChm.UPM.filterClassPrefs = function(filterOn) {
	NgChm.UPM.searchPerformed = true;
	NgChm.UPM.showClassBreak("ALL");
	var filterButton = document.getElementById('all_searchPref_btn');
	var searchPrefSelect = document.getElementById('all_searchPref');
	var searchPrefVal = searchPrefSelect.value;
	if (filterOn) {
		if (searchPrefVal != "") {
			NgChm.UPM.filterVal = searchPrefVal;
			filterButton.src = NgChm.staticPath + "images/removeFilterClassButton.png";
			filterButton.onclick=function (){NgChm.UPM.filterClassPrefs(false);};
		}
	} else {
		filterButton.src = NgChm.staticPath + "images/filterClassButton.png";
		filterButton.onclick=function (){NgChm.UPM.filterClassPrefs(true);};
		searchPrefSelect.value = "";
		NgChm.UPM.filterVal = null;
	}
	var allprefs = document.getElementById("breakPrefs_ALL");
	hiddenItems = NgChm.UPM.addClassPrefOptions();
	NgChm.UPM.filterAllClassesTable(hiddenItems);
	NgChm.UPM.showClassBreak("ALL");
}

/**********************************************************************************
 * FUNCTION - filterAllClassesTable: The purpose of this function is to assign option
 * values to the Covariates dropdown control on the Covariates preferences tab.  All 
 * covariates will be loaded at startup.  The filter control, however, is used to 
 * limit the visible options in this dropdown.
 **********************************************************************************/
NgChm.UPM.filterAllClassesTable = function(hiddenItems) {
    var table=document.getElementById('tableAllClasses');
    for(var i=0; i<table.rows.length;i++){
        var row  = table.rows[i];
        row.className = "show";
        var td = row.cells[0];
        var tdText = td.innerHTML.replace(/&nbsp;/g,'');
        for (var j=0;j<hiddenItems.length;j++) {
        	if (hiddenItems[j] === tdText) {
            	row.className = "hide";
        	}
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
NgChm.UPM.addClassPrefOptions = function() {
	var rowClassBars = NgChm.heatMap.getRowClassificationConfig();
	var colClassBars = NgChm.heatMap.getColClassificationConfig();
	var rowClassBarsOrder = NgChm.heatMap.getRowClassificationOrder();
	var colClassBarsOrder = NgChm.heatMap.getColClassificationOrder();
	var classSelect = document.getElementById('classPref_list');
	var hiddenOpts = new Array();
	classSelect.options.length = 0;
	classSelect.options[classSelect.options.length] = new Option('ALL', 'ALL');
	for (var i=0; i < rowClassBarsOrder.length;i++){
		var key = rowClassBarsOrder[i];
		var keyrow = key+"_row";
		var displayName = key;
		if (key.length > 20){
			displayName = key.substring(0,20) + "...";
		}
		if (NgChm.UPM.filterShow(key)) {
			classSelect.options[classSelect.options.length] = new Option(displayName, keyrow);
		} else {
			hiddenOpts.push(displayName);
		}
	}
	for (var i=0; i < colClassBarsOrder.length;i++){
		var key = colClassBarsOrder[i];
		var keycol = key+"_col";
		var displayName = key;
		if (key.length > 20){
			displayName = key.substring(0,20) + "...";
		}
		if (NgChm.UPM.filterShow(key)) {
			classSelect.options[classSelect.options.length] = new Option(displayName, keycol);
		} else {
			hiddenOpts.push(displayName);
		}
	}
	
	return hiddenOpts;
}

/**********************************************************************************
 * FUNCTION - filterShow: The purpose of this function is to determine whether a 
 * given covariates bar is to be shown given the state of the covariates filter
 * search text box.
 **********************************************************************************/
NgChm.UPM.filterShow = function(key) {
	var filterShow = false;
	var lowerkey = key.toLowerCase();
	if (NgChm.UPM.filterVal != null) {
		if (lowerkey.indexOf(NgChm.UPM.filterVal.toLowerCase()) >= 0) {
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

/**********************************************************************************
 * FUNCTION - setupRowColPrefs: The purpose of this function is to construct a DIV 
 * panel containing all row & col preferences.  Two sections are presented, one for
 * rows and the other for cols.  Informational data begins each section and 
 * properties for modifying the appearance of row/col dendograms appear at the end.
 **********************************************************************************/
NgChm.UPM.setupRowColPrefs = function(e, prefprefs) {
	var rowcolprefs = NgChm.UHM.getDivElement("rowsColsPrefs");
	var prefContents = document.createElement("TABLE");
	NgChm.UHM.addBlankRow(prefContents);
	NgChm.UHM.setTableRow(prefContents,["MAP INFORMATION:"], 2);
	NgChm.UHM.addBlankRow(prefContents);
	NgChm.UHM.setTableRow(prefContents,["&nbsp;&nbsp;Version Id:", NgChm.heatMap.getMapInformation().version_id]);
	NgChm.UHM.setTableRow(prefContents,["&nbsp;&nbsp;Read Only:", NgChm.heatMap.getMapInformation().read_only]);
	NgChm.UHM.addBlankRow(prefContents,2);
	NgChm.UHM.setTableRow(prefContents,["ROW INFORMATION:"], 2);
	NgChm.UHM.addBlankRow(prefContents);
	var rowLabels = NgChm.heatMap.getRowLabels();
	var rowOrganization = NgChm.heatMap.getRowOrganization();
	var rowOrder = rowOrganization['order_method'];
	NgChm.UHM.setTableRow(prefContents,["&nbsp;&nbsp;Total Rows:",NgChm.heatMap.getTotalRows()]);
	NgChm.UHM.setTableRow(prefContents,["&nbsp;&nbsp;Labels Type:",rowLabels['label_type']]);
	NgChm.UHM.setTableRow(prefContents,["&nbsp;&nbsp;Ordering Method:",rowOrder]);
	var dendroShowOptions = "<option value='ALL'>Summary and Detail</option><option value='SUMMARY'>Summary Only</option><option value='NONE'>Hide</option></select>";
	var dendroHeightOptions = "<option value='50'>50%</option><option value='75'>75%</option><option value='100'>100%</option><option value='125'>125%</option><option value='150'>150%</option><option value='200'>200%</option><option value='300'>300%</option></select>";
	if (rowOrder === "Hierarchical") {
		NgChm.UHM.setTableRow(prefContents,["&nbsp;&nbsp;Agglomeration Method:",rowOrganization['agglomeration_method']]);
		NgChm.UHM.setTableRow(prefContents,["&nbsp;&nbsp;Distance Metric:",rowOrganization['distance_metric']]);
		var rowDendroSelect = "<select name='rowDendroShowPref' id='rowDendroShowPref' onchange='NgChm.UPM.dendroRowShowChange()'>"
		rowDendroSelect = rowDendroSelect+dendroShowOptions;
		NgChm.UHM.setTableRow(prefContents,["&nbsp;&nbsp;Show Dendrogram:",rowDendroSelect]);  
		var rowDendroHeightSelect = "<select name='rowDendroHeightPref' id='rowDendroHeightPref'>"
		rowDendroHeightSelect = rowDendroHeightSelect+dendroHeightOptions;
		NgChm.UHM.setTableRow(prefContents,["&nbsp;&nbsp;Dendrogram Height:",rowDendroHeightSelect]); 
	}  
	NgChm.UHM.addBlankRow(prefContents,2);
	NgChm.UHM.setTableRow(prefContents,["COLUMN INFORMATION:"], 2);
	NgChm.UHM.addBlankRow(prefContents);
	
	var colLabels = NgChm.heatMap.getColLabels();
	var colOrganization = NgChm.heatMap.getColOrganization();
	var colOrder = colOrganization['order_method'];
	NgChm.UHM.setTableRow(prefContents,["&nbsp;&nbsp;Total Columns:",NgChm.heatMap.getTotalCols()]);
	NgChm.UHM.setTableRow(prefContents,["&nbsp;&nbsp;Labels Type:",colLabels['label_type']]);
	NgChm.UHM.setTableRow(prefContents,["&nbsp;&nbsp;Ordering Method:",colOrder]);
	if (colOrder === "Hierarchical") {
		NgChm.UHM.setTableRow(prefContents,["&nbsp;&nbsp;Agglomeration Method:",colOrganization['agglomeration_method']]);
		NgChm.UHM.setTableRow(prefContents,["&nbsp;&nbsp;Distance Metric:",colOrganization['distance_metric']]);
		var colDendroShowSelect = "<select name='colDendroShowPref' id='colDendroShowPref' onchange='NgChm.UPM.dendroColShowChange()'>"
		colDendroShowSelect = colDendroShowSelect+dendroShowOptions;
		var colDendroHeightSelect = "<select name='colDendroHeightPref' id='colDendroHeightPref'>"
		colDendroHeightSelect = colDendroHeightSelect+dendroHeightOptions;
		NgChm.UHM.setTableRow(prefContents,["&nbsp;&nbsp;Show Dendrogram:",colDendroShowSelect]);
		NgChm.UHM.setTableRow(prefContents,["&nbsp;&nbsp;Dendrogram Height:",colDendroHeightSelect]);
	}
	NgChm.UHM.addBlankRow(prefContents,2);
/*	THIS CODE WAS COMMENTED OUT TO REMOVE MAP SIZING FEATURE BUT MAY RETURN
 * NgChm.UHM.setTableRow(prefContents,["MAP SIZING:"]);
	var sumWidth = Math.round(document.getElementById('summary_chm').offsetWidth/(.96*document.getElementById('container').offsetWidth)*100);
	var detWidth = Math.round(document.getElementById('detail_chm').offsetWidth/(.96*document.getElementById('container').offsetWidth)*100);
	var mapHeight = Math.round(document.getElementById('detail_chm').clientHeight/container.clientHeight*100);
	NgChm.UHM.setTableRow(prefContents,["&nbsp;&nbsp;Summary Width:","<input type=\"text\" name=\"summaryWidthPref\" id=\"summaryWidthPref\" style=\"width:40px\" value=\"" + sumWidth+"\">%"]);
	NgChm.UHM.setTableRow(prefContents,["&nbsp;&nbsp;Detail Width:","<input type=\"text\" name=\"detailWidthPref\" id=\"detailWidthPref\" style=\"width:40px\" value=\"" + detWidth + "\">%"]);
	NgChm.UHM.setTableRow(prefContents,["&nbsp;&nbsp;Map Height:","<input type=\"text\" name=\"mapHeightPref\" id=\"mapHeightPref\" style=\"width:40px\" value=\"" + mapHeight + "\">%"]);
	NgChm.UHM.addBlankRow(prefContents,2); */
	NgChm.UHM.setTableRow(prefContents,["LABEL SIZING:"]);
	var labelSizeSelect = "<select name='labelSizePref' id='labelSizePref'><option value='10'>10 Characters</option><option value='15'>15 Characters</option><option value='20'>20 Characters</option><option value='25'>25 Characters</option><option value='30'>30 Characters</option><option value='35'>35 Characters</option><option value='40'>40 Characters</option>"
	var labelTruncSelect = "<select name='labelTruncPref' id='labelTruncPref'><option value='START'>Beginning</option><option value='MIDDLE'>Middle</option><option value='END'>End</option>"
	NgChm.UHM.setTableRow(prefContents,["&nbsp;&nbsp;Maximum Length:",labelSizeSelect]);
	NgChm.UHM.setTableRow(prefContents,["&nbsp;&nbsp;Trim Text From:",labelTruncSelect]);
	
	rowcolprefs.appendChild(prefContents);

	return rowcolprefs;
}

/**********************************************************************************
 * FUNCTION - showDendroSelections: The purpose of this function is to set the 
 * states of the row/column dendrogram show and height preferences.
 **********************************************************************************/
NgChm.UPM.showDendroSelections = function() {
	var rowDendroConfig = NgChm.heatMap.getRowDendroConfig();
	var rowOrganization = NgChm.heatMap.getRowOrganization();
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
	var colOrganization = NgChm.heatMap.getColOrganization();
	var colOrder = colOrganization['order_method'];
	var colDendroConfig = NgChm.heatMap.getColDendroConfig();
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
NgChm.UPM.showLabelSelections = function() {
	var labelSize = NgChm.heatMap.getMapInformation().label_display_length;
	var labelTrunc = NgChm.heatMap.getMapInformation().label_display_truncation;
	var labelSizePref = document.getElementById("labelSizePref");
	var labelTruncPref = document.getElementById("labelTruncPref");
	labelSizePref.value = labelSize;
	labelTruncPref.value = labelTrunc;
}

/**********************************************************************************
 * FUNCTION - dendroRowShowChange: The purpose of this function is to respond to
 * a change event on the show row dendrogram dropdown.  If the change is to Hide, 
 * the row dendro height is set to 10 and the dropdown disabled. If the change is to
 * one of the 2 Show options AND was previously Hide, set height to the default
 * value of 100 and enable the dropdown.
 **********************************************************************************/
NgChm.UPM.dendroRowShowChange = function() {
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
NgChm.UPM.dendroColShowChange = function() {
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



