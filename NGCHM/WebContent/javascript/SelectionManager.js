/**
 * This code is responsible for handling changes in position of selected heat map region.
 * It handles mouse, keyboard, and button events that change the position of the selected
 * region.  It also tracks whether the display is in a single window or split into two
 * separate windows.  If in separate windows, local storage events are used to communicate
 * changes between the two windows.  
 */

//Define Namespace for NgChm SelectionManager  
NgChm.createNS('NgChm.SEL');

//Globals that provide information about heat map position selection.
NgChm.SEL.mode = 'NORMAL';      // Set to normal or ribbon vertical or ribbon horizontal 
NgChm.SEL.prevMode = 'NORMAL';  // When the mode changes, keep track of what it used to be 
NgChm.SEL.currentDl = "dl1";    // Set (default) to Data Layer 1 (set in application by user when flick views are toggled)
NgChm.SEL.currentRow=null;      // Top row of current selected position
NgChm.SEL.currentCol=null;      // Left column of the current selected position
NgChm.SEL.dataPerRow=null;      // How many rows are included in the current selection
NgChm.SEL.dataPerCol=null;      // How many columns in the current selection
NgChm.SEL.selectedStart=0;      // If dendrogram selection is used to limit ribbon view - which position to start selection.
NgChm.SEL.selectedStop=0;       // If dendrogram selection is used to limit ribbon view - which position is last of selection.
NgChm.SEL.searchItems={};
NgChm.SEL.scrollTime = null; // timer for scroll events to prevent multiple events firing after scroll ends

/* This function is called on detailInit to initialize the searchItems arrays */
NgChm.SEL.createEmptySearchItems = function() {
	NgChm.SEL.searchItems["Row"]= {};
	NgChm.SEL.searchItems["Column"]= {};
	NgChm.SEL.searchItems["RowCovar"] = {};
	NgChm.SEL.searchItems["ColumnCovar"]= {};
}
/* This routine is called when the selected row / column is changed.
 * It is assumed that the caller modified currentRow, currentCol, dataPerRow,
 * and dataPerCol as desired. This method does redrawing and notification as necessary.  
 */
NgChm.SEL.updateSelection = function() {
    //We have the summary heat map so redraw the yellow selection box.
    NgChm.SUM.drawLeftCanvasBox();
    // Redraw based on mode type and selection. 
    NgChm.heatMap.setReadWindow(NgChm.SEL.getLevelFromMode(NgChm.MMGR.DETAIL_LEVEL),NgChm.SEL.getCurrentDetRow(),NgChm.SEL.getCurrentDetCol(),NgChm.SEL.getCurrentDetDataPerCol(),NgChm.SEL.getCurrentDetDataPerRow());
    NgChm.DET.drawDetailHeatMap();
}

NgChm.SEL.changeMode = function(newMode) {
    NgChm.SEL.callDetailDrawFunction(newMode);
}

NgChm.SEL.setMode = function(newMode) {
	NgChm.SEL.prevMode = NgChm.SEL.mode;
	NgChm.SEL.mode = newMode;
}

/**********************************************************************************
 * FUNCTION - getLevelFromMode: This function returns the level that is associated
 * with a given mode.  A level is passed in from either the summary or detail display
 * as a default value and returned if the mode is not one of the Ribbon modes.
 **********************************************************************************/
NgChm.SEL.getLevelFromMode = function(lvl) {
	if (NgChm.SEL.mode == 'RIBBONV') {
		return NgChm.MMGR.RIBBON_VERT_LEVEL;
	} else if (NgChm.SEL.mode == 'RIBBONH') {
		return NgChm.MMGR.RIBBON_HOR_LEVEL;
	} else if (NgChm.SEL.mode == 'FULL_MAP') {
		return NgChm.MMGR.SUMMARY_LEVEL;
	} else {
		return lvl;
	} 
}

/* Handle mouse scroll wheel events to zoom in / out.
 */
NgChm.SEL.handleScroll = function(evt) {
	evt.preventDefault();
	if (NgChm.SEL.scrollTime == null || evt.timeStamp - NgChm.SEL.scrollTime > 150){
		NgChm.SEL.scrollTime = evt.timeStamp;
		if (evt.wheelDelta < -30 || evt.deltaY > 0 || evt.scale < 1) { //Zoom out
            NgChm.DET.detailDataZoomOut();
		} else if ((evt.wheelDelta > 30 || evt.deltaY < 0 || evt.scale > 1)){ // Zoom in
            NgChm.DET.zoomAnimation();
		}	
	}
	return false;
} 		


NgChm.SEL.keyNavigate = function(e) {
	NgChm.UHM.hlpC();
    clearTimeout(NgChm.DET.detailPoint);
    if (e.target.type != "text" && e.target.type != "textarea"){
		switch(e.keyCode){ // prevent default added redundantly to each case so that other key inputs won't get ignored
			case 37: // left key 
				if (document.activeElement.id !== "search_text"){
					e.preventDefault();
					if (e.shiftKey){NgChm.SEL.currentCol -= NgChm.SEL.dataPerRow;} 
					else if (e.ctrlKey){NgChm.SEL.currentCol -= 1;NgChm.SEL.selectedStart -= 1;NgChm.SEL.selectedStop -= 1; NgChm.SEL.changeMode(NgChm.SEL.mode);} 
					else {NgChm.SEL.currentCol--;}
				}
				break;
			case 38: // up key
				if (document.activeElement.id !== "search_text"){
					e.preventDefault();
					if (e.shiftKey){NgChm.SEL.currentRow -= NgChm.SEL.dataPerCol;} 
					else if (e.ctrlKey){NgChm.SEL.selectedStop += 1; NgChm.SEL.changeMode(NgChm.SEL.mode);} 
					else {NgChm.SEL.currentRow--;}
				}
				break;
			case 39: // right key
				if (document.activeElement.id !== "search_text"){
					e.preventDefault();
					if (e.shiftKey){NgChm.SEL.currentCol += NgChm.SEL.dataPerRow;} 
					else if (e.ctrlKey){NgChm.SEL.currentCol += 1;NgChm.SEL.selectedStart += 1;NgChm.SEL.selectedStop += 1; NgChm.SEL.changeMode(NgChm.SEL.mode);} 
					else {NgChm.SEL.currentCol++;}
				}
				break;
			case 40: // down key
				if (document.activeElement.id !== "search_text"){
					e.preventDefault();
					if (e.shiftKey){NgChm.SEL.currentRow += NgChm.SEL.dataPerCol;} 
					else if (e.ctrlKey){NgChm.SEL.selectedStop -= 1; NgChm.SEL.changeMode(NgChm.SEL.mode);} 
					else {NgChm.SEL.currentRow++;}
				}
				break;
			case 33: // page up
				e.preventDefault();
				if (e.shiftKey){
					var newMode;
					NgChm.DDR.clearDendroSelection();
					switch(NgChm.SEL.mode){
						case "RIBBONV": newMode = 'RIBBONH'; break;
						case "RIBBONH": newMode = 'NORMAL'; break;
						default: newMode = NgChm.SEL.mode;break;
					}
					NgChm.SEL.changeMode(newMode);
				} else {
					NgChm.DET.zoomAnimation();
				}
				break;
			case 34: // page down 
				e.preventDefault();
				if (e.shiftKey){
					var newMode;
					NgChm.DDR.clearDendroSelection();
					switch(NgChm.SEL.mode){
						case "NORMAL": newMode = 'RIBBONH'; break;
						case "RIBBONH": newMode = 'RIBBONV'; break;
						default: newMode = NgChm.SEL.mode;break;
					}
					NgChm.SEL.changeMode(newMode);
				} else {
					NgChm.DET.detailDataZoomOut();
				}
				break;
			case 113: // F2 key 
				if (NgChm.SEL.flickIsOn()) {
					var flickBtn = document.getElementById("flick_btn");
					if (flickBtn.name === 'flickUp') {
						NgChm.SEL.flickChange("toggle2");
					} else {
						NgChm.SEL.flickChange("toggle1");
					}
				}
				break;
			case 191: // "divide key" BUT not "? key"/
				if (!e.shiftKey) {
					NgChm.DET.detailSplit();
				}
				break;
			default:
				return;
		}
    }
	
	NgChm.SEL.checkRow();
	NgChm.SEL.checkColumn();
    
    NgChm.SEL.updateSelection();
}

NgChm.SEL.callDetailDrawFunction = function(modeVal) {
	if (modeVal == 'RIBBONH' || modeVal == 'RIBBONH_DETAIL')
		NgChm.DET.detailHRibbon();
	if (modeVal == 'RIBBONV' || modeVal == 'RIBBONV_DETAIL')
		NgChm.DET.detailVRibbon();
	if (modeVal == 'FULL_MAP')
		NgChm.DET.detailFullMap();
	if (modeVal == 'NORMAL') {
		NgChm.DET.detailNormal();	
	}
}

/*==============================================================================================
 * 
 * HEATMAP POSITIONING FUNCTIONS
 * 
 *=============================================================================================*/

/**********************************************************************************
 * FUNCTIONS - checkRow(and Col): This function makes sure the currentRow/Col setting 
 * is valid and adjusts that value into the viewing pane if it is not. It is called
 * just prior to calling UpdateSelection().
 **********************************************************************************/
NgChm.SEL.checkRow = function() {
    //Set column to one if off the row boundary when in ribbon vert view
	if ((NgChm.SEL.currentRow < 1) || ((NgChm.SEL.mode == 'RIBBONV') && (NgChm.SEL.selectedStart==0))) NgChm.SEL.currentRow = 1;
	if (((NgChm.SEL.mode == 'RIBBONV') || (NgChm.SEL.mode == 'RIBBONV_DETAIL')) && (NgChm.SEL.selectedStart != 0)) NgChm.SEL.currentRow = NgChm.SEL.selectedStart;
	//Check row against detail boundaries
	var numRows = NgChm.heatMap.getNumRows(NgChm.MMGR.DETAIL_LEVEL);
	if (NgChm.SEL.currentRow > ((numRows + 1) - NgChm.SEL.dataPerCol)) NgChm.SEL.currentRow = (numRows + 1) - NgChm.SEL.dataPerCol;
}

NgChm.SEL.checkColumn = function() {
    //Set column to one if off the column boundary when in ribbon horiz view
    if ((NgChm.SEL.currentCol < 1) || ((NgChm.SEL.mode == 'RIBBONH') && NgChm.SEL.selectedStart==0)) NgChm.SEL.currentCol = 1;
    if (((NgChm.SEL.mode == 'RIBBONH') || (NgChm.SEL.mode=='RIBBONH_DETAIL')) && NgChm.SEL.selectedStart!= 0) NgChm.SEL.currentCol = NgChm.SEL.selectedStart;
    //Check column against detail boundaries
    var numCols = NgChm.heatMap.getNumColumns(NgChm.MMGR.DETAIL_LEVEL);
    if (NgChm.SEL.currentCol > ((numCols + 1) - NgChm.SEL.dataPerRow)) {
    	NgChm.SEL.currentCol = (numCols + 1) - NgChm.SEL.dataPerRow;
    }
}

/**********************************************************************************
 * FUNCTIONS - setCurrentRow(Col)FromSum: These function perform the conversion 
 * of currentRow and currentCol coordinates from summary to detail.  This is done 
 * so that the proper row/col location is set on the detail pane when a user clicks 
 * in the summary pane. The heatmap row/col summary ratios (ratio of detail to summary) 
 * are used to calculate the proper detail coordinates.  
 **********************************************************************************/
NgChm.SEL.setCurrentRowFromSum = function(sumRow) {
	// Up scale current summary row to detail equivalent
	NgChm.SEL.currentRow = (sumRow*NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL));
	NgChm.SEL.checkRow();
}
NgChm.SEL.setCurrentColFromSum = function(sumCol) {
	NgChm.SEL.currentCol = (sumCol*NgChm.heatMap.getColSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL));
	NgChm.SEL.checkColumn();
}

/**********************************************************************************
 * FUNCTIONS - getCurrentSumRow(): These functions perform the conversion of 
 * currentRow and currentCol coordinates from detail to summary.  This is done 
 * so that the  proper row/col location is set on the summary pane when a user clicks 
 * in the detail pane. This is used when the leftCanvasBox is drawn. The heat map 
 * row/col summary ratios (ratio of detail to summary) are used to  calculate the 
 * proper detail coordinates.
 **********************************************************************************/
NgChm.SEL.getCurrentSumRow = function() {
	var currRow = NgChm.SEL.currentRow;
	// Convert selected current row value to Summary level
	var rowSummaryRatio = NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL);
	return  Math.round(currRow/rowSummaryRatio);
}
//Follow similar methodology for Column as is used in above row based function
NgChm.SEL.getCurrentSumCol = function() {
	var currCol = NgChm.SEL.currentCol;
	var colSummaryRatio = NgChm.heatMap.getColSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL);
	return  Math.round(currCol/colSummaryRatio);
}

/**********************************************************************************
 * FUNCTIONS - getCurrentSumDataPerRow(): These functions perform the conversion of 
 * dataPerRow and dataPerCol from detail to summary.  This is done so that the  
 * proper view pane can be calculated on the summary heat map when drawing the 
 * leftCanvasBox on that side of the screen.
 **********************************************************************************/
NgChm.SEL.getCurrentSumDataPerRow = function() {
	var rowSummaryRatio = NgChm.heatMap.getColSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL);
	// Summary data per row for  using the summary ration for that level
	var	sumDataPerRow = Math.floor(NgChm.SEL.dataPerRow/rowSummaryRatio);
	return sumDataPerRow;
}
// Follow similar methodology for Column as is used in above row based function
NgChm.SEL.getCurrentSumDataPerCol = function() {
	var colSummaryRatio = NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL);
	var	sumDataPerCol = Math.floor(NgChm.SEL.dataPerCol/colSummaryRatio);
	return sumDataPerCol;
}


/**********************************************************************************
 * FUNCTIONS - getCurrentDetRow(): These functions perform the conversion of 
 * currentRow and currentCol coordinates from full matrix position to detail view
 * position.  This is usually the same but when in ribbon view on a large matrix, 
 * the positions are scaled.
 **********************************************************************************/
NgChm.SEL.getCurrentDetRow = function() {
	var detRow = NgChm.SEL.currentRow;
	if ((NgChm.SEL.mode == 'RIBBONV') && (NgChm.SEL.selectedStart >= 1)) {
		var rvRatio = NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.RIBBON_VERT_LEVEL);
		detRow = Math.round(NgChm.SEL.selectedStart/rvRatio);
	}
	return  detRow;
}
//Follow similar methodology for Column as is used in above row based function
NgChm.SEL.getCurrentDetCol = function() {
	var detCol = NgChm.SEL.currentCol;
	if ((NgChm.SEL.mode == 'RIBBONH') && (NgChm.SEL.selectedStart >= 1)) {
		var rhRatio = NgChm.heatMap.getColSummaryRatio(NgChm.MMGR.RIBBON_HOR_LEVEL);
		detCol = Math.round(NgChm.SEL.selectedStart/rhRatio);
	}
	return  detCol;
}

/**********************************************************************************
 * FUNCTIONS - getCurrentDetDataPerRow(): DataPerRow/Col is in full matrix coordinates
 * and usually the detail view uses this value directly unless we are in ribbon
 * view where the value needs to be scaled in one dimension.
 **********************************************************************************/
NgChm.SEL.getCurrentDetDataPerRow = function() {
	// make sure dataPerCol is the correct value. 
	var	detDataPerRow = NgChm.SEL.dataPerRow;
	if ((NgChm.SEL.mode == 'RIBBONH') || (NgChm.SEL.mode == 'FULL_MAP')) {
		var rate = NgChm.heatMap.getColSummaryRatio(NgChm.MMGR.RIBBON_HOR_LEVEL);
		detDataPerRow = Math.ceil(detDataPerRow/rate);
	} 
	return detDataPerRow;
}
// Follow similar methodology for Column as is used in above row based function
NgChm.SEL.getCurrentDetDataPerCol = function() {
	// make sure dataPerCol is the correct value. 
	var	detDataPerCol = NgChm.SEL.dataPerCol;
	if ((NgChm.SEL.mode == 'RIBBONV') || (NgChm.SEL.mode == 'FULL_MAP')) {
		var rate = NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.RIBBON_VERT_LEVEL);
		detDataPerCol = Math.ceil(detDataPerCol/rate);
	} 
	return detDataPerCol;
}

/**********************************************************************************
 * FUNCTIONS - setDataPerRowFromDet(): DataPerRow/Col is in full matrix coordinates
 * so sometimes in ribbon view this needs to be translated to full coordinates.
 **********************************************************************************/
NgChm.SEL.setDataPerRowFromDet = function(detDataPerRow) {
	NgChm.SEL.dataPerRow = detDataPerRow;
	if ((NgChm.SEL.mode == 'RIBBONH') || (NgChm.SEL.mode == 'FULL_MAP')) {
		if (NgChm.SEL.selectedStart==0) {
			NgChm.SEL.dataPerRow = NgChm.heatMap.getNumColumns(NgChm.MMGR.DETAIL_LEVEL);
		} else {
			var rate = NgChm.heatMap.getColSummaryRatio(NgChm.MMGR.RIBBON_HOR_LEVEL);
			NgChm.SEL.dataPerRow = detDataPerRow * rate;
		}
	} 
}
// Follow similar methodology for Column as is used in above row based function
NgChm.SEL.setDataPerColFromDet = function(detDataPerCol) {
	NgChm.SEL.dataPerCol = detDataPerCol;
	if ((NgChm.SEL.mode == 'RIBBONV') || (NgChm.SEL.mode == 'FULL_MAP')) {
		if (NgChm.SEL.selectedStart==0) {
			NgChm.SEL.dataPerCol = NgChm.heatMap.getNumRows(NgChm.MMGR.DETAIL_LEVEL);
		} else {
			var rate = NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.RIBBON_VERT_LEVEL);
			NgChm.SEL.dataPerCol = detDataPerCol * rate;
		}
	} 
}

/*==============================================================================================
 * 
 * FLICK VIEW PROCESSING FUNCTIONS
 * 
 *=============================================================================================*/

/************************************************************************************************
 * FUNCTION: flickExists - Returns true if the heatmap contains multiple data layers by checking
 * to see if the "FLICK" button is present on the screen.
 ***********************************************************************************************/ 
NgChm.SEL.flickExists = function() {
	var flicks = document.getElementById("flicks");
	if ((flicks != null) && (flicks.style.display === '')) {
		return true;
	}
	return false;
}

/************************************************************************************************
 * FUNCTION: flickIsOn - Returns true if the user has opened the flick control by checking to 
 * see if the flickViews DIV is visible.
 ***********************************************************************************************/ 
NgChm.SEL.flickIsOn = function() {
	var flickViews = document.getElementById("flickViews");
	if (flickViews.style.display === '') {
		return true;
	}
	return false;
}

/************************************************************************************************
 * FUNCTION: flickToggleOn - Opens the flick control.
 ***********************************************************************************************/ 
NgChm.SEL.flickToggleOn = function() {
	var flickDrop1 = document.getElementById("flick1");
	var flickDrop2 = document.getElementById("flick2");
	//Make sure that dropdowns contain different
	//options (with the selected option in the top box)
	if (flickDrop1.selectedIndex === flickDrop2.selectedIndex) {
		if (flickDrop1.selectedIndex === 0) {
			flickDrop2.selectedIndex = 1;
		} else {
			flickDrop2.selectedIndex = 0;
		}
	}
	NgChm.SEL.flickInit();
	var flicks = document.getElementById("flicks");
	var flickViewsOff = document.getElementById("noFlickViews");
	var flickViewsOn = document.getElementById("flickViews");
	flickViewsOff.style.display="none";
	flickViewsOn.style.display='';
}
NgChm.SEL.openFileToggle = function() {
	var fileButton = document.getElementById('fileButton');
	if (fileButton.style.display === 'none') {
		fileButton.style.display = '';
	} else {
		fileButton.style.display = 'none';
	}
}

/************************************************************************************************
 * FUNCTION: flickToggleOff - Closes (hides) the flick control.
 ***********************************************************************************************/ 
NgChm.SEL.flickToggleOff = function() {
	var flicks = document.getElementById("flicks");
	var flickViewsOff = document.getElementById("noFlickViews");
	var flickViewsOn = document.getElementById("flickViews");
	flickViewsOn.style.display="none";
	flickViewsOff.style.display='';
}

NgChm.SEL.flickInit = function() {
	var flickBtn = document.getElementById("flick_btn");
	var flickDrop1 = document.getElementById("flick1");
	var flickDrop2 = document.getElementById("flick2");
	if ((flickBtn.name === 'flickUp')) {
		flickDrop1.style.backgroundColor="yellow";
		flickDrop2.style.backgroundColor="white";
	} else {
		flickDrop1.style.backgroundColor="white";
		flickDrop2.style.backgroundColor="yellow";
	}
}

/************************************************************************************************
 * FUNCTION: flickChange - Responds to a change in the flick view control.  All of these actions 
 * depend upon the flick control being visible (i.e. active) There are 3 types of changes 
 * (1) User clicks on the toggle control. (2) User changes the value of one of the 2 dropdowns 
 * AND the toggle control is on that dropdown. (3) The user presses the one or two key, corresponding
 * to the 2 dropdowns, AND the current visible data layer is for the opposite dropdown. 
 * If any of the above cases are met, the currentDl is changed and the screen is redrawn.
 ***********************************************************************************************/ 
NgChm.SEL.flickChange = function(fromList) {
	var flickBtn = document.getElementById("flick_btn");
	var flickDrop1 = document.getElementById("flick1");
	var flickDrop2 = document.getElementById("flick2");
	if (typeof fromList === 'undefined') {
		if (flickBtn.name === 'flickUp') {
			flickBtn.setAttribute('src', 'images/toggleDown.png');
			flickBtn.name = 'flickDown';
			NgChm.SEL.currentDl = flickDrop2.value;
		} else {
			flickBtn.setAttribute('src', 'images/toggleUp.png');
			flickBtn.name = 'flickUp';
			NgChm.SEL.currentDl = flickDrop1.value;
		}
	} else {
		if ((fromList === "flick1") && (flickBtn.name === 'flickUp')) {
			NgChm.SEL.currentDl = document.getElementById(fromList).value;
		} else if ((fromList === "flick2") && (flickBtn.name === 'flickDown')) {
			NgChm.SEL.currentDl = document.getElementById(fromList).value;
		} else if ((fromList === "toggle1") && (flickBtn.name === 'flickDown')) {
			flickBtn.setAttribute('src', 'images/toggleUp.png');
			flickBtn.name = 'flickUp';
			NgChm.SEL.currentDl = flickDrop1.value;
		} else if ((fromList === "toggle2") && (flickBtn.name === 'flickUp')) {
			flickBtn.setAttribute('src', 'images/toggleDown.png');
			flickBtn.name = 'flickDown';
			NgChm.SEL.currentDl = flickDrop2.value;
		} else {
			return;
		}
	} 
	NgChm.SEL.flickInit();
    NgChm.SUM.buildSummaryTexture();
	NgChm.DET.drawDetailHeatMap();
	NgChm.SEL.updateSelection();
}




