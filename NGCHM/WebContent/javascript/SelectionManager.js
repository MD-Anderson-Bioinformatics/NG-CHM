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
NgChm.SEL.currentDl = "dl1";    // Set (default) to Data Layer 1 (set in application by user when flick views are toggled)
NgChm.SEL.currentRow = null;      // Top row of current selected position
NgChm.SEL.currentCol = null;      // Left column of the current selected position
NgChm.SEL.scrollTime = null;    // timer for scroll events to prevent multiple events firing after scroll ends

/*********************************************************************************************
 * FUNCTION:  updateSelection - The purpose of this function is to set the state of a given
 * detail heat map panel.  This function is called when the selected row / column is changed.
 * It is assumed that the caller modified currentRow, currentCol, dataPerRow, and dataPerCol 
 * as desired. This method does redrawing and notification as necessary.
 *********************************************************************************************/
NgChm.SEL.updateSelection = function (mapItem,noResize) {   
    //We have the summary heat map so redraw the yellow selection box.
    NgChm.SUM.drawLeftCanvasBox();
    NgChm.heatMap.setReadWindow(NgChm.SEL.getLevelFromMode(mapItem, NgChm.MMGR.DETAIL_LEVEL),NgChm.SEL.getCurrentDetRow(mapItem),NgChm.SEL.getCurrentDetCol(mapItem),NgChm.SEL.getCurrentDetDataPerCol(mapItem),NgChm.SEL.getCurrentDetDataPerRow(mapItem));
    NgChm.DET.setDrawDetailTimeout (mapItem, NgChm.DET.redrawSelectionTimeout,noResize);
}

/*********************************************************************************************
 * FUNCTION:  updateSelections - The purpose of this function is to call the updateSelection
 * function for each detail map panel.
 *********************************************************************************************/
NgChm.SEL.updateSelections = function (noResize) {   
	for (let i=0; i<NgChm.DMM.DetailMaps.length;i++ ) {
		if (typeof noResize !== 'undefined') {
			NgChm.SEL.updateSelection(NgChm.DMM.DetailMaps[i],noResize)
		} else {
			NgChm.SEL.updateSelection(NgChm.DMM.DetailMaps[i])
		}
	}
}

/**********************************************************************************
 * FUNCTION - getLevelFromMode: This function returns the level that is associated
 * with a given mode.  A level is passed in from either the summary or detail display
 * as a default value and returned if the mode is not one of the Ribbon modes.
 **********************************************************************************/
NgChm.SEL.getLevelFromMode = function(mapItem, lvl) {   
	if (mapItem.mode == 'RIBBONV') {
		return NgChm.MMGR.RIBBON_VERT_LEVEL;
	} else if (mapItem.mode == 'RIBBONH') {
		return NgChm.MMGR.RIBBON_HOR_LEVEL;
	} else if (mapItem.mode == 'FULL_MAP') {
		return NgChm.MMGR.SUMMARY_LEVEL;
	} else {
		return lvl;
	} 
}

/**********************************************************************************
 * FUNCTION - getLevelFromMode: This function sets the mode for the mapItem passed
 * in.
 **********************************************************************************/
NgChm.SEL.setMode = function(mapItem, newMode) {
	mapItem.prevMode = mapItem.mode;
	mapItem.mode = newMode;
}

/*********************************************************************************************
 * FUNCTION:  getDetailWindow - The purpose of this function is to return an object containing
 * selection information for a given detail heat map window.  
 *********************************************************************************************/
NgChm.SEL.getDetailWindow = function(mapItem) {  
	return {
		layer: mapItem.currentDl,
		level: NgChm.SEL.getLevelFromMode(mapItem, NgChm.MMGR.DETAIL_LEVEL),
		firstRow: NgChm.SEL.getCurrentDetRow(mapItem),
		firstCol: NgChm.SEL.getCurrentDetCol(mapItem),
		numRows: NgChm.SEL.getCurrentDetDataPerCol(mapItem),
		numCols: NgChm.SEL.getCurrentDetDataPerRow(mapItem)
	}
}

/*==============================================================================================
 * 
 * HEATMAP POSITIONING FUNCTIONS
 * 
 *=============================================================================================*/

/**********************************************************************************
 * FUNCTIONS - getCurrentSumRow(): These functions perform the conversion of 
 * currentRow and currentCol coordinates from detail to summary.  This is done 
 * so that the  proper row/col location is set on the summary pane when a user clicks 
 * in the detail pane. This is used when the leftCanvasBox is drawn. The heat map 
 * row/col summary ratios (ratio of detail to summary) are used to  calculate the 
 * proper detail coordinates.
 **********************************************************************************/
NgChm.SEL.getCurrentSumRow = function(mapItem) {
	const currRow = mapItem.currentRow;
	// Convert selected current row value to Summary level
	const rowSummaryRatio = NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL);
	return  Math.round(currRow/rowSummaryRatio);
}
//Follow similar methodology for Column as is used in above row based function
NgChm.SEL.getCurrentSumCol = function(mapItem) {
	const currCol =  mapItem.currentCol;
	const colSummaryRatio = NgChm.heatMap.getColSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL);
	return  Math.round(currCol/colSummaryRatio);
}

/**********************************************************************************
 * FUNCTIONS - getCurrentDetRow(): These functions perform the conversion of 
 * currentRow and currentCol coordinates from full matrix position to detail view
 * position.  This is usually the same but when in ribbon view on a large matrix, 
 * the positions are scaled.
 **********************************************************************************/
NgChm.SEL.getCurrentDetRow = function(mapItem) { //SEL
	let detRow = mapItem.currentRow;
	if ((mapItem.mode == 'RIBBONV') && (mapItem.selectedStart >= 1)) {
		const rvRatio = NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.RIBBON_VERT_LEVEL);
		detRow = Math.round(mapItem.selectedStart/rvRatio);
	}
	return  detRow;
}
//Follow similar methodology for Column as is used in above row based function
NgChm.SEL.getCurrentDetCol = function(mapItem) { //SEL
	let detCol = mapItem.currentCol;
	if ((mapItem.mode == 'RIBBONH') && (mapItem.selectedStart >= 1)) {
		const rhRatio = NgChm.heatMap.getColSummaryRatio(NgChm.MMGR.RIBBON_HOR_LEVEL);
		detCol = Math.round(mapItem.selectedStart/rhRatio);
	}
	return  detCol;
}

/**********************************************************************************
 * FUNCTIONS - getCurrentDetDataPerRow(): DataPerRow/Col is in full matrix coordinates
 * and usually the detail view uses this value directly unless we are in ribbon
 * view where the value needs to be scaled in one dimension.
 **********************************************************************************/
NgChm.SEL.getCurrentDetDataPerRow = function(mapItem) { 
	// make sure dataPerCol is the correct value. 
	let	detDataPerRow = mapItem.dataPerRow;
	if ((mapItem.mode == 'RIBBONH') || (mapItem.mode == 'FULL_MAP')) {
		const rate = NgChm.heatMap.getColSummaryRatio(NgChm.MMGR.RIBBON_HOR_LEVEL);
		detDataPerRow = Math.ceil(detDataPerRow/rate);
	} 
	return detDataPerRow;
}
// Follow similar methodology for Column as is used in above row based function
NgChm.SEL.getCurrentDetDataPerCol = function(mapItem) { 
	// make sure dataPerCol is the correct value.  
	let	detDataPerCol = mapItem.dataPerCol;
	if ((mapItem.mode == 'RIBBONV') || (mapItem.mode == 'FULL_MAP')) {
		const rate = NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.RIBBON_VERT_LEVEL);
		detDataPerCol = Math.ceil(detDataPerCol/rate);
	} 
	return detDataPerCol;
}

/**********************************************************************************
 * FUNCTIONS - getCurrentSumDataPerRow(): These functions perform the conversion of 
 * dataPerRow and dataPerCol from detail to summary.  This is done so that the  
 * proper view pane can be calculated on the summary heat map when drawing the 
 * leftCanvasBox on that side of the screen.
 **********************************************************************************/
NgChm.SEL.getCurrentSumDataPerRow = function(mapItem) {  
	const rowSummaryRatio = NgChm.heatMap.getColSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL);
	// Summary data per row for  using the summary ration for that level
	const	sumDataPerRow = Math.floor(mapItem.dataPerRow/rowSummaryRatio);
	return sumDataPerRow;
}
// Follow similar methodology for Column as is used in above row based function
NgChm.SEL.getCurrentSumDataPerCol = function(mapItem) {  
	const colSummaryRatio = NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL);
	const	sumDataPerCol = Math.floor(mapItem.dataPerCol/colSummaryRatio);
	return sumDataPerCol;
}

/**********************************************************************************
 * FUNCTIONS - setDataPerRowFromDet(): DataPerRow/Col is in full matrix coordinates
 * so sometimes in ribbon view this needs to be translated to full coordinates.
 **********************************************************************************/
NgChm.SEL.setDataPerRowFromDet = function(detDataPerRow, mapItem) {
	const isPrimary = mapItem.version === 'P' ? true : false;
	mapItem.dataPerRow = detDataPerRow;
	if (isPrimary === true) mapItem.dataPerRow = detDataPerRow;
	if ((mapItem.mode == 'RIBBONH') || (mapItem.mode == 'FULL_MAP')) {
		if (mapItem.selectedStart==0) {
			mapItem.dataPerRow = NgChm.heatMap.getNumColumns(NgChm.MMGR.DETAIL_LEVEL);
			if (isPrimary === true) mapItem.dataPerRow = NgChm.heatMap.getNumColumns(NgChm.MMGR.DETAIL_LEVEL);
		} else {
			const rate = NgChm.heatMap.getColSummaryRatio(NgChm.MMGR.RIBBON_HOR_LEVEL);
			mapItem.dataPerRow = detDataPerRow * rate;
			if (isPrimary === true) mapItem.dataPerRow = detDataPerRow * rate;
		}
	} 
}
// Follow similar methodology for Column as is used in above row based function
NgChm.SEL.setDataPerColFromDet = function(detDataPerCol, mapItem) {
	const isPrimary = mapItem.version === 'P' ? true : false;
	mapItem.dataPerCol = detDataPerCol;
	if (isPrimary === true) mapItem.dataPerCol = detDataPerCol;
	if ((mapItem.mode == 'RIBBONV') || (mapItem.mode == 'FULL_MAP')) {
		if (mapItem.selectedStart==0) {
			mapItem.dataPerCol = NgChm.heatMap.getNumRows(NgChm.MMGR.DETAIL_LEVEL);
			if (isPrimary === true) mapItem.dataPerCol = NgChm.heatMap.getNumRows(NgChm.MMGR.DETAIL_LEVEL);
		} else {
			const rate = NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.RIBBON_VERT_LEVEL);
			mapItem.dataPerCol = detDataPerCol * rate;
			if (isPrimary === true) mapItem.dataPerCol = detDataPerCol * rate;
		}
	} 
}


/**********************************************************************************
 * FUNCTIONS - setCurrentRow(Col)FromSum: These function perform the conversion 
 * of currentRow and currentCol coordinates from summary to detail.  This is done 
 * so that the proper row/col location is set on the detail pane when a user clicks 
 * in the summary pane. The heatmap row/col summary ratios (ratio of detail to summary) 
 * are used to calculate the proper detail coordinates.  
 **********************************************************************************/
NgChm.SEL.setCurrentRowFromSum = function(mapItem,sumRow) {  
	// Up scale current summary row to detail equivalent
	mapItem.currentRow = (sumRow*NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL));
	NgChm.SEL.checkRow(mapItem);
}
NgChm.SEL.setCurrentColFromSum = function(mapItem,sumCol) {  
	mapItem.currentCol = (sumCol*NgChm.heatMap.getColSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL));
	NgChm.SEL.checkCol(mapItem);
}

/**********************************************************************************
 * FUNCTIONS - checkRow(and Col): This function makes sure the currentRow/Col setting 
 * is valid and adjusts that value into the viewing pane if it is not. It is called
 * just prior to calling UpdateSelection().
 **********************************************************************************/
NgChm.SEL.checkRow = function(mapItem) {
	const isPrimary = mapItem.version === 'P' ? true : false;
    //Set column to one if off the row boundary when in ribbon vert view
	if ((mapItem.currentRow < 1) || ((mapItem.mode == 'RIBBONV') && (mapItem.selectedStart==0))) {
		mapItem.currentRow = 1;
		if (isPrimary === true) mapItem.currentRow = 1;
	}
	if (((mapItem.mode == 'RIBBONV') || (mapItem.mode == 'RIBBONV_DETAIL')) && (mapItem.selectedStart != 0)) {
		mapItem.currentRow = mapItem.selectedStart;
		if (isPrimary === true) mapItem.currentRow = mapItem.selectedStart;
	}
	//Check row against detail boundaries
	const numRows = NgChm.heatMap.getNumRows(NgChm.MMGR.DETAIL_LEVEL);
	if (mapItem.currentRow > ((numRows + 1) - mapItem.dataPerCol)) {
		mapItem.currentRow = (numRows + 1) - mapItem.dataPerCol;
		if (isPrimary === true) mapItem.currentRow = (numRows + 1) - mapItem.dataPerCol;
	}
}

NgChm.SEL.checkCol = function(mapItem) {
	const isPrimary = mapItem.version === 'P' ? true : false;
    //Set column to one if off the column boundary when in ribbon horiz view
    if ((mapItem.currentCol < 1) || ((mapItem.mode == 'RIBBONH') && mapItem.selectedStart==0)) {
    	mapItem.currentCol = 1;
    	if (isPrimary === true) mapItem.currentCol = 1;
    }
    if (((mapItem.mode == 'RIBBONH') || (mapItem.mode=='RIBBONH_DETAIL')) && mapItem.selectedStart!= 0) {
    	mapItem.currentCol = mapItem.selectedStart;
    	if (isPrimary === true) mapItem.currentCol = mapItem.selectedStart;
    }
    //Check column against detail boundaries
    const numCols = NgChm.heatMap.getNumColumns(NgChm.MMGR.DETAIL_LEVEL);
    if (mapItem.currentCol > ((numCols + 1) -mapItem.dataPerRow)) {
    	mapItem.currentCol = (numCols + 1) - mapItem.dataPerRow;
    	if (isPrimary === true) mapItem.currentCol = (numCols + 1) - mapItem.dataPerRow;
    }
}

/*********************************************************************************************
 * FUNCTION:  getSamplingRatio - This function returns the appropriate row/col sampling ration
 * for the heat map based upon the screen mode.  
 *********************************************************************************************/
NgChm.SEL.getSamplingRatio = function (mode,axis) {
	if (axis == 'row'){
		switch (mode){
			case 'RIBBONH': return NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.RIBBON_HOR_LEVEL);
			case 'RIBBONV': return NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.RIBBON_VERT_LEVEL);
			case 'FULL_MAP': return NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.RIBBON_VERT_LEVEL);
			default:        return NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.DETAIL_LEVEL);
		}
	} else {
		switch (mode){
			case 'RIBBONH': return NgChm.heatMap.getColSummaryRatio(NgChm.MMGR.RIBBON_HOR_LEVEL);
			case 'RIBBONV': return NgChm.heatMap.getColSummaryRatio(NgChm.MMGR.RIBBON_VERT_LEVEL);
			case 'FULL_MAP': return NgChm.heatMap.getColSummaryRatio(NgChm.MMGR.RIBBON_HOR_LEVEL);
			default:        return  NgChm.heatMap.getColSummaryRatio(NgChm.MMGR.DETAIL_LEVEL);
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
	var detailButtons = document.getElementById('detail_buttons');
	if (fileButton.style.display === 'none') {
		location.reload(); 
	} else {
		fileButton.style.display = 'none';
		detailButtons.style.display = '';
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
	if ((flickBtn.dataset.state === 'flickUp')) {
		flickDrop1.style.backgroundColor="yellow";
		flickDrop2.style.backgroundColor="white";
	} else {
		flickDrop1.style.backgroundColor="white";
		flickDrop2.style.backgroundColor="yellow";
	}
}






