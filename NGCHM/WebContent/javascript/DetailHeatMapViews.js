(function() {
    'use strict';
    NgChm.markFile();

/**
 * This code is responsible for handling changes in position of selected heat map region.
 * It handles mouse, keyboard, and button events that change the position of the selected
 * region.  It also tracks whether the display is in a single window or split into two
 * separate windows.  If in separate windows, local storage events are used to communicate
 * changes between the two windows.  
 */

//Define Namespace for NgChm SelectionManager  
    const DVW = NgChm.createNS('NgChm.DVW');

    const MAPREP = NgChm.importNS('NgChm.MAPREP');
    const MMGR = NgChm.importNS('NgChm.MMGR');

    // Needed only for updateSelection.
    const SUM = NgChm.importNS('NgChm.SUM');
    const DET = NgChm.importNS('NgChm.DET');
    const DMM = NgChm.importNS('NgChm.DMM');

//Globals that provide information about heat map position selection.
DVW.currentRow = null;      // Top row of current selected position
DVW.currentCol = null;      // Left column of the current selected position
DVW.scrollTime = null;    // timer for scroll events to prevent multiple events firing after scroll ends

/*********************************************************************************************
 * FUNCTION:  updateSelection - The purpose of this function is to set the state of a given
 * detail heat map panel.  This function is called when the selected row / column is changed.
 * It is assumed that the caller modified currentRow, currentCol, dataPerRow, and dataPerCol
 * as desired. This method does redrawing and notification as necessary.
 *********************************************************************************************/
DVW.updateSelection = function (mapItem,noResize) {
    //We have the summary heat map so redraw the yellow selection box.
    SUM.drawLeftCanvasBox();
    MMGR.getHeatMap().setReadWindow(DVW.getLevelFromMode(mapItem, MAPREP.DETAIL_LEVEL),DVW.getCurrentDetRow(mapItem),DVW.getCurrentDetCol(mapItem),DVW.getCurrentDetDataPerCol(mapItem),DVW.getCurrentDetDataPerRow(mapItem));
    DET.setDrawDetailTimeout (mapItem, DET.redrawSelectionTimeout,noResize);
};

/*********************************************************************************************
 * FUNCTION:  updateSelections - The purpose of this function is to call the updateSelection
 * function for each detail map panel.
 *********************************************************************************************/
DVW.updateSelections = function (noResize) {
	for (let i=0; i<DMM.DetailMaps.length;i++ ) {
		if (typeof noResize !== 'undefined') {
			DVW.updateSelection(DMM.DetailMaps[i],noResize)
		} else {
			DVW.updateSelection(DMM.DetailMaps[i])
		}
	}
	MMGR.getHeatMap().setUnAppliedChanges(true);
};


/**********************************************************************************
 * FUNCTION - getLevelFromMode: This function returns the level that is associated
 * with a given mode.  A level is passed in from either the summary or detail display
 * as a default value and returned if the mode is not one of the Ribbon modes.
 **********************************************************************************/
DVW.getLevelFromMode = function(mapItem, lvl) {
	if (mapItem.mode == 'RIBBONV') {
		return MAPREP.RIBBON_VERT_LEVEL;
	} else if (mapItem.mode == 'RIBBONH') {
		return MAPREP.RIBBON_HOR_LEVEL;
	} else if (mapItem.mode == 'FULL_MAP') {
		return MAPREP.SUMMARY_LEVEL;
	} else {
		return lvl;
	} 
}

/**********************************************************************************
 * FUNCTION - getLevelFromMode: This function sets the mode for the mapItem passed
 * in.
 **********************************************************************************/
DVW.setMode = function(mapItem, newMode) {
	mapItem.prevMode = mapItem.mode;
	mapItem.mode = newMode;
}

/*********************************************************************************************
 * FUNCTION:  getDetailWindow - The purpose of this function is to return an object containing
 * selection information for a given detail heat map window.  
 *********************************************************************************************/
DVW.getDetailWindow = function(mapItem) {
	return {
		layer: mapItem.currentDl,
		level: DVW.getLevelFromMode(mapItem, MAPREP.DETAIL_LEVEL),
		firstRow: DVW.getCurrentDetRow(mapItem),
		firstCol: DVW.getCurrentDetCol(mapItem),
		numRows: DVW.getCurrentDetDataPerCol(mapItem),
		numCols: DVW.getCurrentDetDataPerRow(mapItem)
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
DVW.getCurrentSumRow = function(mapItem) {
	const currRow = mapItem.currentRow;
	// Convert selected current row value to Summary level
	const rowSummaryRatio = MMGR.getHeatMap().getRowSummaryRatio(MAPREP.SUMMARY_LEVEL);
	return  Math.round(currRow/rowSummaryRatio);
}
//Follow similar methodology for Column as is used in above row based function
DVW.getCurrentSumCol = function(mapItem) {
	const currCol =  mapItem.currentCol;
	const colSummaryRatio = MMGR.getHeatMap().getColSummaryRatio(MAPREP.SUMMARY_LEVEL);
	return  Math.round(currCol/colSummaryRatio);
}

/**********************************************************************************
 * FUNCTIONS - getCurrentDetRow(): These functions perform the conversion of 
 * currentRow and currentCol coordinates from full matrix position to detail view
 * position.  This is usually the same but when in ribbon view on a large matrix, 
 * the positions are scaled.
 **********************************************************************************/
DVW.getCurrentDetRow = function(mapItem) {
	let detRow = mapItem.currentRow;
	if ((mapItem.mode == 'RIBBONV') && (mapItem.selectedStart >= 1)) {
		const rvRatio = MMGR.getHeatMap().getRowSummaryRatio(MAPREP.RIBBON_VERT_LEVEL);
		detRow = Math.round(mapItem.selectedStart/rvRatio);
	}
	return  detRow;
};

//Follow similar methodology for Column as is used in above row based function
DVW.getCurrentDetCol = function(mapItem) {
	let detCol = mapItem.currentCol;
	if ((mapItem.mode == 'RIBBONH') && (mapItem.selectedStart >= 1)) {
		const rhRatio = MMGR.getHeatMap().getColSummaryRatio(MAPREP.RIBBON_HOR_LEVEL);
		detCol = Math.round(mapItem.selectedStart/rhRatio);
	}
	return  detCol;
};

/**********************************************************************************
 * FUNCTIONS - getCurrentDetDataPerRow(): DataPerRow/Col is in full matrix coordinates
 * and usually the detail view uses this value directly unless we are in ribbon
 * view where the value needs to be scaled in one dimension.
 **********************************************************************************/
DVW.getCurrentDetDataPerRow = function(mapItem) {
	// make sure dataPerCol is the correct value. 
	let	detDataPerRow = mapItem.dataPerRow;
	if ((mapItem.mode == 'RIBBONH') || (mapItem.mode == 'FULL_MAP')) {
		const rate = MMGR.getHeatMap().getColSummaryRatio(MAPREP.RIBBON_HOR_LEVEL);
		detDataPerRow = Math.ceil(detDataPerRow/rate);
	} 
	return detDataPerRow;
}
// Follow similar methodology for Column as is used in above row based function
DVW.getCurrentDetDataPerCol = function(mapItem) {
	// make sure dataPerCol is the correct value.  
	let	detDataPerCol = mapItem.dataPerCol;
	if ((mapItem.mode == 'RIBBONV') || (mapItem.mode == 'FULL_MAP')) {
		const rate = MMGR.getHeatMap().getRowSummaryRatio(MAPREP.RIBBON_VERT_LEVEL);
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
DVW.getCurrentSumDataPerRow = function(mapItem) {
	const rowSummaryRatio = MMGR.getHeatMap().getColSummaryRatio(MAPREP.SUMMARY_LEVEL);
	// Summary data per row for  using the summary ration for that level
	const	sumDataPerRow = Math.floor(mapItem.dataPerRow/rowSummaryRatio);
	return sumDataPerRow;
}
// Follow similar methodology for Column as is used in above row based function
DVW.getCurrentSumDataPerCol = function(mapItem) {
	const colSummaryRatio = MMGR.getHeatMap().getRowSummaryRatio(MAPREP.SUMMARY_LEVEL);
	const	sumDataPerCol = Math.floor(mapItem.dataPerCol/colSummaryRatio);
	return sumDataPerCol;
}

/**********************************************************************************
 * FUNCTIONS - setDataPerRowFromDet(): DataPerRow/Col is in full matrix coordinates
 * so sometimes in ribbon view this needs to be translated to full coordinates.
 **********************************************************************************/
DVW.setDataPerRowFromDet = function(detDataPerRow, mapItem) {
	const heatMap = MMGR.getHeatMap();
	const isPrimary = mapItem.version === 'P' ? true : false;
	mapItem.dataPerRow = detDataPerRow;
	if (isPrimary === true) mapItem.dataPerRow = detDataPerRow;
	if ((mapItem.mode == 'RIBBONH') || (mapItem.mode == 'FULL_MAP')) {
		if (mapItem.selectedStart==0) {
			mapItem.dataPerRow = heatMap.getNumColumns(MAPREP.DETAIL_LEVEL);
			if (isPrimary === true) mapItem.dataPerRow = heatMap.getNumColumns(MAPREP.DETAIL_LEVEL);
		} else {
			const rate = heatMap.getColSummaryRatio(MAPREP.RIBBON_HOR_LEVEL);
			mapItem.dataPerRow = detDataPerRow * rate;
			if (isPrimary === true) mapItem.dataPerRow = detDataPerRow * rate;
		}
	} 
}
// Follow similar methodology for Column as is used in above row based function
DVW.setDataPerColFromDet = function(detDataPerCol, mapItem) {
	const heatMap = MMGR.getHeatMap();
	const isPrimary = mapItem.version === 'P' ? true : false;
	mapItem.dataPerCol = detDataPerCol;
	if (isPrimary === true) mapItem.dataPerCol = detDataPerCol;
	if ((mapItem.mode == 'RIBBONV') || (mapItem.mode == 'FULL_MAP')) {
		if (mapItem.selectedStart==0) {
			mapItem.dataPerCol = heatMap.getNumRows(MAPREP.DETAIL_LEVEL);
			if (isPrimary === true) mapItem.dataPerCol = heatMap.getNumRows(MAPREP.DETAIL_LEVEL);
		} else {
			const rate = heatMap.getRowSummaryRatio(MAPREP.RIBBON_VERT_LEVEL);
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
DVW.setCurrentRowFromSum = function(mapItem,sumRow) {
	// Up scale current summary row to detail equivalent
	mapItem.currentRow = (sumRow*MMGR.getHeatMap().getRowSummaryRatio(MAPREP.SUMMARY_LEVEL));
	DVW.checkRow(mapItem);
}
DVW.setCurrentColFromSum = function(mapItem,sumCol) {
	mapItem.currentCol = (sumCol*MMGR.getHeatMap().getColSummaryRatio(MAPREP.SUMMARY_LEVEL));
	DVW.checkCol(mapItem);
}

/**********************************************************************************
 * FUNCTIONS - checkRow(and Col): This function makes sure the currentRow/Col setting 
 * is valid and adjusts that value into the viewing pane if it is not. It is called
 * just prior to calling UpdateSelection().
 **********************************************************************************/
DVW.checkRow = function(mapItem) {
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
	const numRows = MMGR.getHeatMap().getNumRows(MAPREP.DETAIL_LEVEL);
	if (mapItem.currentRow > ((numRows + 1) - mapItem.dataPerCol)) {
		mapItem.currentRow = (numRows + 1) - mapItem.dataPerCol;
		if (isPrimary === true) mapItem.currentRow = (numRows + 1) - mapItem.dataPerCol;
	}
}

DVW.checkCol = function(mapItem) {
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
    const numCols = MMGR.getHeatMap().getNumColumns(MAPREP.DETAIL_LEVEL);
    if (mapItem.currentCol > ((numCols + 1) -mapItem.dataPerRow)) {
    	mapItem.currentCol = (numCols + 1) - mapItem.dataPerRow;
    	if (isPrimary === true) mapItem.currentCol = (numCols + 1) - mapItem.dataPerRow;
    }
}

/*********************************************************************************************
 * FUNCTION:  getSamplingRatio - This function returns the appropriate row/col sampling ration
 * for the heat map based upon the screen mode.  
 *********************************************************************************************/
DVW.getSamplingRatio = function (mode,axis) {
	const heatMap = MMGR.getHeatMap();
	if (axis == 'row'){
		switch (mode){
			case 'RIBBONH': return heatMap.getRowSummaryRatio(MAPREP.RIBBON_HOR_LEVEL);
			case 'RIBBONV': return heatMap.getRowSummaryRatio(MAPREP.RIBBON_VERT_LEVEL);
			case 'FULL_MAP': return heatMap.getRowSummaryRatio(MAPREP.RIBBON_VERT_LEVEL);
			default:        return heatMap.getRowSummaryRatio(MAPREP.DETAIL_LEVEL);
		}
	} else {
		switch (mode){
			case 'RIBBONH': return heatMap.getColSummaryRatio(MAPREP.RIBBON_HOR_LEVEL);
			case 'RIBBONV': return heatMap.getColSummaryRatio(MAPREP.RIBBON_VERT_LEVEL);
			case 'FULL_MAP': return heatMap.getColSummaryRatio(MAPREP.RIBBON_HOR_LEVEL);
			default:        return  heatMap.getColSummaryRatio(MAPREP.DETAIL_LEVEL);
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
DVW.flickExists = function() {
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
DVW.flickIsOn = function() {
	var flickViews = document.getElementById("flickViews");
	if (flickViews.style.display === '') {
		return true;
	}
	return false;
}

/************************************************************************************************
 * FUNCTION: flickToggleOn - Opens the flick control.
 ***********************************************************************************************/ 
DVW.flickToggleOn = function() {
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
	DVW.flickInit();
	var flicks = document.getElementById("flicks");
	var flickViewsOff = document.getElementById("noFlickViews");
	var flickViewsOn = document.getElementById("flickViews");
	flickViewsOff.style.display="none";
	flickViewsOn.style.display='';
}

DVW.openFileToggle = function() {
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
DVW.flickToggleOff = function() {
	var flicks = document.getElementById("flicks");
	var flickViewsOff = document.getElementById("noFlickViews");
	var flickViewsOn = document.getElementById("flickViews");
	flickViewsOn.style.display="none";
	flickViewsOff.style.display='';
}

DVW.flickInit = function() {
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

    document.getElementById('fileOpen_btn').onclick = () => {
	DVW.openFileToggle();
    };

    document.getElementById('flickOff').onclick = () => {
	DVW.flickToggleOn();
    };

})();
