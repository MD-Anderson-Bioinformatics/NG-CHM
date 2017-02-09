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
NgChm.SEL.currentDl = "dl1";    // Set (default) to Data Layer 1 (set in application by user when flick views are toggled)
NgChm.SEL.currentRow=null;      // Top row of current selected position
NgChm.SEL.currentCol=null;      // Left column of the current selected position
NgChm.SEL.dataPerRow=null;      // How many rows are included in the current selection
NgChm.SEL.dataPerCol=null;      // How many columns in the current selection
NgChm.SEL.selectedStart=0;      // If dendrogram selection is used to limit ribbon view - which position to start selection.
NgChm.SEL.selectedStop=0;       // If dendrogram selection is used to limit ribbon view - which position is last of selection.
NgChm.SEL.searchItems={};
NgChm.SEL.isSub = NgChm.UTIL.getURLParameter('sub') == 'true';  //isSub will be set to true if windows are split and this is the child.
NgChm.SEL.hasSub = false;       //hasSub set to true if windows are split and this is the parent.
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
	if (!NgChm.SEL.isSub) {
		//We have the summary heat map so redraw the yellow selection box.
		NgChm.SUM.drawLeftCanvasBox();
	} 
	if (!NgChm.SEL.hasSub) {
		// Redraw based on mode type and selection. 
		NgChm.heatMap.setReadWindow(NgChm.SEL.getLevelFromMode(NgChm.MMGR.DETAIL_LEVEL),NgChm.SEL.getCurrentDetRow(),NgChm.SEL.getCurrentDetCol(),NgChm.SEL.getCurrentDetDataPerCol(),NgChm.SEL.getCurrentDetDataPerRow());
		NgChm.DET.drawDetailHeatMap();
	} 
	
 	//If summary and detail as split into two browsers.  Communicate the selection change
	//to the other browser.
	if (NgChm.SEL.isSub || NgChm.SEL.hasSub) {
		localStorage.removeItem('event');
		localStorage.setItem('currentDl', '' + NgChm.SEL.currentDl);
		localStorage.setItem('currentRow', '' + NgChm.SEL.currentRow);
		localStorage.setItem('currentCol', '' + NgChm.SEL.currentCol);
		localStorage.setItem('dataPerRow', '' + NgChm.SEL.dataPerRow);
		localStorage.setItem('dataPerCol', '' + NgChm.SEL.dataPerCol); 
		localStorage.setItem('selectedStart', '' + NgChm.SEL.selectedStart);
		localStorage.setItem('selectedStop', '' + NgChm.SEL.selectedStop);
		localStorage.setItem('mode', NgChm.SEL.mode);
		localStorage.setItem('selected', JSON.stringify(NgChm.SEL.searchItems));
		localStorage.setItem('event', 'changePosition');
	}		
}

NgChm.SEL.changeMode = function(newMode) {
	
	if (!NgChm.SEL.hasSub) {
		NgChm.SEL.callDetailDrawFunction(newMode);
	} else {
		NgChm.SEL.mode = newMode;
		localStorage.removeItem('event');
		localStorage.setItem('selectedStart', '' + NgChm.SEL.selectedStart);
		localStorage.setItem('selectedStop', '' + NgChm.SEL.selectedStop);
		localStorage.setItem('mode', newMode);
		localStorage.setItem('event', 'changeMode');
		localStorage.setItem('selected', JSON.stringify(NgChm.SEL.searchItems));
	}
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
			if (!NgChm.SEL.hasSub)
				NgChm.DET.detailDataZoomOut();
			else {
				localStorage.removeItem('event');
				localStorage.setItem('event', 'zoomOut' )
			}
		} else if ((evt.wheelDelta > 30 || evt.deltaY < 0 || evt.scale > 1)){ // Zoom in
			if (!NgChm.SEL.hasSub)
				NgChm.DET.detailDataZoomIn();
			else {
				localStorage.removeItem('event');
				localStorage.setItem('event', 'zoomIn' )
			}
		}	
	}
	return false;
} 		


NgChm.SEL.keyNavigate = function(e) {
	NgChm.UHM.userHelpClose();
    clearTimeout(NgChm.DET.detailPoint);
    if (e.target.type != "text"){
		switch(e.keyCode){ // prevent default added redundantly to each case so that other key inputs won't get ignored
			case 37: // left key 
				if (document.activeElement.id !== "search_text"){
					e.preventDefault();
					if (e.shiftKey){NgChm.SEL.currentCol -= NgChm.SEL.dataPerRow;} 
					else {NgChm.SEL.currentCol--;}
				}
				break;
			case 38: // up key
				if (document.activeElement.id !== "search_text"){
					e.preventDefault();
					if (e.shiftKey){NgChm.SEL.currentRow -= NgChm.SEL.dataPerCol;} 
					else {NgChm.SEL.currentRow--;}
				}
				break;
			case 39: // right key
				if (document.activeElement.id !== "search_text"){
					e.preventDefault();
					if (e.shiftKey){NgChm.SEL.currentCol += NgChm.SEL.dataPerRow;} 
					else {NgChm.SEL.currentCol++;}
				}
				break;
			case 40: // down key
				if (document.activeElement.id !== "search_text"){
					e.preventDefault();
					if (e.shiftKey){NgChm.SEL.currentRow += NgChm.SEL.dataPerCol;} 
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
					NgChm.DET.detailDataZoomIn();
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
					var flickBtnSrc = document.getElementById("flick_btn").src;
					if (flickBtnSrc.indexOf("Up") >= 0) {
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

/*==============================================================================================
 * 
 * LOCAL STORAGE (SPLIT SCREEN) FUNCTIONS
 * 
 *=============================================================================================*/

/************************************************************************************************
 * FUNCTION: setupLocalStorage - Local storage is used to communicate between two browser windows 
 * when the display is split. Setup an event to be notified when contents of local storage are 
 * modified.
 ***********************************************************************************************/ 
NgChm.SEL.setupLocalStorage = function() {
	window.addEventListener('storage', function (evt) {
		//console.log('localstorage event ' + evt.key);  USE FOR DEBUGGING SPLIT SCREEN (when necessary)
		if (evt.key == 'event') {
			NgChm.SEL.handleLocalStorageEvent(evt);
		} 
	}, false);
}

/************************************************************************************************
 * FUNCTION: handleLocalStorageEvent - When the detail pane is in a separate window, local storage 
 * is used to send it updates from clicks in the summary view.
 ***********************************************************************************************/ 
NgChm.SEL.handleLocalStorageEvent = function(evt) {
	if (evt.newValue == null)
		return;
	
	var type = localStorage.getItem('event');

	if (type == 'changePosition') {
		NgChm.SEL.currentRow = Number(localStorage.getItem('currentRow'));
		NgChm.SEL.currentCol = Number(localStorage.getItem('currentCol'));
		NgChm.SEL.dataPerRow = Number(localStorage.getItem('dataPerRow'));
		NgChm.SEL.dataPerCol = Number(localStorage.getItem('dataPerCol'));
		NgChm.SEL.selectedStart = Number(localStorage.getItem('selectedStart'));
		NgChm.SEL.selectedStop = Number(localStorage.getItem('selectedStop'));
		NgChm.DET.dataBoxHeight = (NgChm.DET.SIZE_NORMAL_MODE-NgChm.DET.dataViewBorder)/NgChm.SEL.dataPerCol;
		NgChm.DET.dataBoxWidth = (NgChm.DET.SIZE_NORMAL_MODE-NgChm.DET.dataViewBorder)/NgChm.SEL.dataPerRow;
		if (NgChm.SEL.mode != localStorage.getItem('mode') && NgChm.SEL.selectedStart == 0 && NgChm.SEL.selectedStop == 0){
			NgChm.DDR.clearDendroSelection();
		}
		NgChm.SEL.mode = localStorage.getItem('mode');
		if (NgChm.SEL.hasSub) {
			if (NgChm.SEL.currentDl != localStorage.getItem('currentDl')) {
				NgChm.SEL.currentDl = localStorage.getItem('currentDl');
				NgChm.SUM.buildSummaryTexture();
			}
			// if the selection changes, redraw the selection marks
			NgChm.SEL.searchItems = JSON.parse(localStorage.getItem('selected'));
			NgChm.SUM.clearSelectionMarks();
			NgChm.SUM.drawRowSelectionMarks();
			NgChm.SUM.drawColSelectionMarks();
			// Redraw the yellow selection box.
			NgChm.SUM.drawLeftCanvasBox();
		} 
		if (NgChm.SEL.isSub) {
			NgChm.SEL.callDetailDrawFunction(NgChm.SEL.mode);
		} 
	} else if (type == 'zoomIn'){
		NgChm.DET.detailDataZoomIn();
	} else if (type == 'zoomOut') {
		NgChm.DET.detailDataZoomOut();
	} else if ((type == 'changeMode') && (NgChm.SEL.isSub))	{
		NgChm.DDR.clearDendroSelection();
		var newMode = localStorage.getItem('mode');
		NgChm.SEL.selectedStart = Number(localStorage.getItem('selectedStart'));
		NgChm.SEL.selectedStop = Number(localStorage.getItem('selectedStop'));
		NgChm.SEL.searchItems = JSON.parse(localStorage.getItem('selected'));
		NgChm.SEL.callDetailDrawFunction(newMode);
	} else if ((type == 'join') && NgChm.SEL.hasSub) {
		NgChm.SEL.hasSub=false;
		NgChm.DET.detailJoin();
	}
}

/************************************************************************************************
 * FUNCTION: initFromLocalStorage - If a second detail browser window is launched, use local 
 * storage when first setting up the detail chm to get current mode and selection settings.
 ***********************************************************************************************/ 
NgChm.SEL.initFromLocalStorage = function() {
	NgChm.SEL.getLocalStorageValues();
	if (NgChm.heatMap.showColDendrogram("DETAIL")) {
		NgChm.SUM.colDendro = new NgChm.DDR.SummaryColumnDendrogram(); 
	} 
	if (NgChm.heatMap.showRowDendrogram("DETAIL")) {
		NgChm.SUM.rowDendro = new NgChm.DDR.SummaryRowDendrogram ();
	}
	NgChm.heatMap.configureFlick();
	var nameDiv = document.getElementById("mapName");
	nameDiv.innerHTML = "<b>Map Name:</b>&nbsp;&nbsp;"+NgChm.heatMap.getMapInformation().name;
	NgChm.SEL.callDetailDrawFunction(NgChm.SEL.mode);
}

NgChm.SEL.callDetailDrawFunction = function(modeVal) {
	if (modeVal == 'RIBBONH' || modeVal == 'RIBBONH_DETAIL')
		NgChm.DET.detailHRibbon();
	if (modeVal == 'RIBBONV' || modeVal == 'RIBBONV_DETAIL')
		NgChm.DET.detailVRibbon();
	if (modeVal == 'NORMAL') {
		NgChm.DET.detailNormal();	
	}
}

NgChm.SEL.getLocalStorageValues = function() {
	NgChm.SEL.currentDl = localStorage.getItem('currentDl');
	NgChm.SEL.currentRow = Number(localStorage.getItem('currentRow'));
	NgChm.SEL.currentCol = Number(localStorage.getItem('currentCol'));
	NgChm.SEL.dataPerRow = Number(localStorage.getItem('dataPerRow'));
	NgChm.SEL.dataPerCol = Number(localStorage.getItem('dataPerCol'));
	NgChm.SEL.selectedStart = Number(localStorage.getItem('selectedStart'));
	NgChm.SEL.selectedStop = Number(localStorage.getItem('selectedStop'));
	NgChm.SEL.searchItems = JSON.parse(localStorage.getItem('selected'));
	NgChm.SEL.mode = localStorage.getItem('mode');

	NgChm.heatMap.configureFlick();

	NgChm.DET.dataBoxHeight = (NgChm.DET.SIZE_NORMAL_MODE-NgChm.DET.dataViewBorder)/NgChm.SEL.dataPerCol;
	NgChm.DET.dataBoxWidth = (NgChm.DET.SIZE_NORMAL_MODE-NgChm.DET.dataViewBorder)/NgChm.SEL.dataPerRow;
}

/************************************************************************************************
 * FUNCTION: rejoinNotice - Called when a separate detail map window is joined back into the 
 * main chm browser window.
 ***********************************************************************************************/ 
NgChm.SEL.rejoinNotice = function() {
	localStorage.removeItem('event');
	localStorage.setItem('event', 'join');	
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
	// make sure dataPerCol is the correct value. split screen can cause issues with values updating properly.
	var	detDataPerRow = NgChm.SEL.dataPerRow;
	if (NgChm.SEL.mode == 'RIBBONH') {
		var rate = NgChm.heatMap.getColSummaryRatio(NgChm.MMGR.RIBBON_HOR_LEVEL);
		detDataPerRow = Math.round(detDataPerRow/rate);
	} 
	return detDataPerRow;
}
// Follow similar methodology for Column as is used in above row based function
NgChm.SEL.getCurrentDetDataPerCol = function() {
	// make sure dataPerCol is the correct value. split screen can cause issues with values updating properly.
	var	detDataPerCol = NgChm.SEL.dataPerCol;
	if (NgChm.SEL.mode == 'RIBBONV') {
		var rate = NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.RIBBON_VERT_LEVEL);
		detDataPerCol = Math.round(detDataPerCol/rate);
	} 
	return detDataPerCol;
}

/**********************************************************************************
 * FUNCTIONS - setDataPerRowFromDet(): DataPerRow/Col is in full matrix coordinates
 * so sometimes in ribbon view this needs to be translated to full coordinates.
 **********************************************************************************/
NgChm.SEL.setDataPerRowFromDet = function(detDataPerRow) {
	NgChm.SEL.dataPerRow = detDataPerRow;
	if (NgChm.SEL.mode == 'RIBBONH') {
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
	if (NgChm.SEL.mode == 'RIBBONV') {
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
	//Make sure upon return from split screen that dropdowns contain different
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
	var flickBtnSrc = flickBtn.src;
	var flickDrop1 = document.getElementById("flick1");
	var flickDrop2 = document.getElementById("flick2");
	if (flickBtnSrc.indexOf("Up") >= 0) {
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
	var flickBtnSrc = flickBtn.src;
	if (typeof fromList === 'undefined') {
		if (flickBtnSrc.indexOf("Up") >= 0) {
			flickBtn.setAttribute('src', NgChm.staticPath + 'images/toggleDown.png');
			NgChm.SEL.currentDl = flickDrop2.value;
		} else {
			flickBtn.setAttribute('src', NgChm.staticPath + 'images/toggleUp.png');
			NgChm.SEL.currentDl = flickDrop1.value;
			flickDrop1.style.backgroundColor="yellow";
		}
	} else {
		if ((fromList === "flick1") && (flickBtnSrc.indexOf("Up") >= 0)) {
			NgChm.SEL.currentDl = document.getElementById(fromList).value;
		} else if ((fromList === "flick2") && (flickBtnSrc.indexOf("Down") >= 0)) {
			NgChm.SEL.currentDl = document.getElementById(fromList).value;
		} else if ((fromList === "toggle1") && (flickBtnSrc.indexOf("Down") >= 0)) {
			flickBtn.setAttribute('src', NgChm.staticPath + 'images/toggleUp.png');
			NgChm.SEL.currentDl = flickDrop1.value;
		} else if ((fromList === "toggle2") && (flickBtnSrc.indexOf("Up") >= 0)) {
			flickBtn.setAttribute('src', NgChm.staticPath + 'images/toggleDown.png');
			NgChm.SEL.currentDl = flickDrop2.value;
		} else {
			return;
		}
	} 
	NgChm.SEL.flickInit();
	
	if (!NgChm.SEL.isSub) {
		NgChm.SUM.summaryInit();
	} else {
		localStorage.removeItem('event');
		localStorage.setItem('currentDl', NgChm.SEL.currentDl);
		localStorage.setItem('event', 'changePosition');
	}
	NgChm.DET.drawDetailHeatMap();
}




