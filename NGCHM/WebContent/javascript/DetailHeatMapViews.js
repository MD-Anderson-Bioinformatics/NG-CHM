(function() {
    'use strict';
    NgChm.markFile();

/**
 * This code tracks detailed heat map views (called mapItems) and their locations.
 * It is responsible for handling changes in position of selected heat map region.
 * It handles mouse, keyboard, and button events that change the position of the selected
 * region.
 */

    // Define Namespace for NgChm DetailHeatMapViews
    const DVW = NgChm.createNS('NgChm.DVW');

    const MAPREP = NgChm.importNS('NgChm.MAPREP');
    const MMGR = NgChm.importNS('NgChm.MMGR');

    // DVW.detailMaps is an array of mapItems for all current
    // detailHeatMapViews.
    //
    // This array is defined here for read-only access.
    // All updates to it should be in functions in the DisplayHeatMapManager (DMM).
    DVW.detailMaps = [];

    // DVW.primaryMap references the primary DetailHeatMap.
    // It is defined here for read-only access.
    // All updates to it should be in functions in the DisplayHeatMapManager (DMM).
    DVW.primaryMap = null;

    // This is a utility function to support the getMapItemFrom... functions below.
    // matches is a function(mapItem) that returns true iff the mapItem matches
    // the type of DetailheatMap required.
    // The function returns the first map that matches the required criteria.
    // If no match is found, it issues a console warning/error and returns DVW.primaryMap.
    function getMatchingMap (matches) {
	for (let i=0; i<DVW.detailMaps.length; i++) {
	    const mapItem = DVW.detailMaps[i];
	    if (matches (mapItem)) {
		return mapItem;
	    }
	}
	if (DVW.primaryMap !== null) {
	    console.warn ("Cannot find the required detail map. Returning the primary detail map.");
	    return DVW.primaryMap;
	}
	console.error ("Cannot find the required detail map and there is no primary detail map. Returning null.");
	return null;
    }

    /*********************************************************************************************
     * FUNCTION:  getMapItemFromChm - The purpose of this function is to retrieve a detail heat map
     * object using the chm.
     *********************************************************************************************/
    DVW.getMapItemFromChm = function (chm) {
	return getMatchingMap (mapItem => mapItem.chm === chm);
    };

    /*********************************************************************************************
     * FUNCTION:  getMapItemFromPane - The purpose of this function is to retrieve a detail heat map
     * object using the panel id associated with that map object.
     *********************************************************************************************/
    DVW.getMapItemFromPane = function (paneId) {
	return getMatchingMap (mapItem => mapItem.pane === paneId);
    };

    /*********************************************************************************************
     * FUNCTION:  getMapItemFromPane - The purpose of this function is to retrieve a detail heat map
     * object using the canvas associated with that map object.
     *********************************************************************************************/
    DVW.getMapItemFromCanvas = function (canvas) {
	return getMatchingMap (mapItem => mapItem.canvas === canvas);
    };

    /*********************************************************************************************
     * FUNCTION:  getMapItemFromDendro - The purpose of this function is to retrieve a detail heat map
     * object using the dendrogram associated with that map object.
     *********************************************************************************************/
    DVW.getMapItemFromDendro = function (dendro) {
	return getMatchingMap (mapItem => mapItem.rowDendro === dendro || mapItem.colDendro == dendro);
    };

    /*********************************************************************************************
     * FUNCTION:  getMapItemFromEvent - The purpose of this function is to retrieve a detail heat map
     * object using the event.
     * FIXME: BMB: Function not used.
     *********************************************************************************************/
    DVW.getMapItemFromEvent = function (e) {
	    let mapItem = null;
	    if (e.pane !== null) {
		    mapItem = DVW.getMapItemFromPane(e.pane);
	    } else if (e.currentTarget !== null) {
		    mapItem = DVW.getMapItemFromCanvas(e.currentTarget);
	    } else {
		console.error ("mapItem event has neither paneId or currentTarget. Returning null.");
	    }
	    return mapItem;
    };

    /*********************************************************************************************
     * FUNCTION:  anyVisible - Return true if any Detail View is visible.
     *********************************************************************************************/
    DVW.anyVisible = function anyVisible () {
	for (let i=0; i<DVW.detailMaps.length;i++ ) {
	    if (DVW.detailMaps[i].isVisible()) {
		return true;
	    };
	}
	return false;
    };

    /************************************************************************************************
     * FUNCTION - removeLabels: This function removes a label from all detail map items.
     ************************************************************************************************/
    DVW.removeLabels = function (label) {
	    for (let i=0; i<DVW.detailMaps.length;i++ ) {
		    const mapItem = DVW.detailMaps[i];
		    mapItem.removeLabel(label);
	    }
    };

    /************************************************************************************************
     * FUNCTION - addLabelDivs: This function adds a label div to all detail map items.
     ************************************************************************************************/
    DVW.addLabelDivs = function (parent, id, className, text ,longText, left, top, fontSize, rotate, index,axis,xy) {
	    for (let i=0; i<DVW.detailMaps.length;i++ ) {
		    const mapItem = DVW.detailMaps[i];
		    mapItem.addLabelDiv(parent, id, className, text ,longText, left, top, fontSize, rotate, index,axis,xy);
	    }
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
};

// Follow similar methodology for Column as is used in above row based function
DVW.getCurrentSumDataPerCol = function(mapItem) {
    const colSummaryRatio = MMGR.getHeatMap().getRowSummaryRatio(MAPREP.SUMMARY_LEVEL);
    const sumDataPerCol = Math.floor(mapItem.dataPerCol/colSummaryRatio);
    return sumDataPerCol;
};

/**********************************************************************************
 * FUNCTIONS - setDataPerRowFromDet(): DataPerRow/Col is in full matrix coordinates
 * so sometimes in ribbon view this needs to be translated to full coordinates.
 **********************************************************************************/
DVW.setDataPerRowFromDet = function(detDataPerRow, mapItem) {
    const heatMap = MMGR.getHeatMap();
    const isPrimary = mapItem.version === 'P';
    mapItem.dataPerRow = detDataPerRow;
    if (isPrimary) mapItem.dataPerRow = detDataPerRow;
    if ((mapItem.mode == 'RIBBONH') || (mapItem.mode == 'FULL_MAP')) {
	if (mapItem.selectedStart==0) {
	    mapItem.dataPerRow = heatMap.getNumColumns(MAPREP.DETAIL_LEVEL);
	    if (isPrimary) mapItem.dataPerRow = heatMap.getNumColumns(MAPREP.DETAIL_LEVEL);
	} else {
	    const rate = heatMap.getColSummaryRatio(MAPREP.RIBBON_HOR_LEVEL);
	    mapItem.dataPerRow = detDataPerRow * rate;
	    if (isPrimary) mapItem.dataPerRow = detDataPerRow * rate;
	}
    }
};

// Follow similar methodology for Column as is used in above row based function
DVW.setDataPerColFromDet = function(detDataPerCol, mapItem) {
    const heatMap = MMGR.getHeatMap();
    const isPrimary = mapItem.version === 'P';
    mapItem.dataPerCol = detDataPerCol;
    if (isPrimary) mapItem.dataPerCol = detDataPerCol;
    if ((mapItem.mode == 'RIBBONV') || (mapItem.mode == 'FULL_MAP')) {
	if (mapItem.selectedStart==0) {
	    mapItem.dataPerCol = heatMap.getNumRows(MAPREP.DETAIL_LEVEL);
	    if (isPrimary) mapItem.dataPerCol = heatMap.getNumRows(MAPREP.DETAIL_LEVEL);
	} else {
	    const rate = heatMap.getRowSummaryRatio(MAPREP.RIBBON_VERT_LEVEL);
	    mapItem.dataPerCol = detDataPerCol * rate;
	    if (isPrimary) mapItem.dataPerCol = detDataPerCol * rate;
	}
    }
};

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
};

DVW.setCurrentColFromSum = function(mapItem,sumCol) {
    mapItem.currentCol = (sumCol*MMGR.getHeatMap().getColSummaryRatio(MAPREP.SUMMARY_LEVEL));
    DVW.checkCol(mapItem);
};

/**********************************************************************************
 * FUNCTIONS - checkRow(and Col): This function makes sure the currentRow/Col setting 
 * is valid and adjusts that value into the viewing pane if it is not. It is called
 * just prior to calling UpdateSelection().
 **********************************************************************************/
DVW.checkRow = function(mapItem) {
    // FIXME: BMB: all three tests below actually do the same thing for both primary
    // and secondary maps.  What was the original motivation for implementing all the
    // tests and can we assume it didn't work out and can we remove the tests?
    const isPrimary = mapItem.version === 'P';

    //Set column to one if off the row boundary when in ribbon vert view
    if ((mapItem.currentRow < 1) || ((mapItem.mode == 'RIBBONV') && (mapItem.selectedStart==0))) {
	mapItem.currentRow = 1;
	if (isPrimary) mapItem.currentRow = 1;
    }
    if (((mapItem.mode == 'RIBBONV') || (mapItem.mode == 'RIBBONV_DETAIL')) && (mapItem.selectedStart != 0)) {
	mapItem.currentRow = mapItem.selectedStart;
	if (isPrimary) mapItem.currentRow = mapItem.selectedStart;
    }
    //Check row against detail boundaries
    const numRows = MMGR.getHeatMap().getNumRows(MAPREP.DETAIL_LEVEL);
    if (mapItem.currentRow > ((numRows + 1) - mapItem.dataPerCol)) {
	mapItem.currentRow = (numRows + 1) - mapItem.dataPerCol;
	if (isPrimary) mapItem.currentRow = (numRows + 1) - mapItem.dataPerCol;
    }
};

DVW.checkCol = function(mapItem) {
    // FIXME: BMB: all three tests below actually do the same thing for both primary
    // and secondary maps.  What was the original motivation for implementing all the
    // tests and can we assume it didn't work out and can we remove the tests?
    const isPrimary = mapItem.version === 'P';

    //Set column to one if off the column boundary when in ribbon horiz view
    if ((mapItem.currentCol < 1) || ((mapItem.mode == 'RIBBONH') && mapItem.selectedStart==0)) {
    	mapItem.currentCol = 1;
	if (isPrimary) mapItem.currentCol = 1;
    }
    if (((mapItem.mode == 'RIBBONH') || (mapItem.mode=='RIBBONH_DETAIL')) && mapItem.selectedStart!= 0) {
    	mapItem.currentCol = mapItem.selectedStart;
	if (isPrimary) mapItem.currentCol = mapItem.selectedStart;
    }

    //Check column against detail boundaries
    const numCols = MMGR.getHeatMap().getNumColumns(MAPREP.DETAIL_LEVEL);
    if (mapItem.currentCol > ((numCols + 1) -mapItem.dataPerRow)) {
    	mapItem.currentCol = (numCols + 1) - mapItem.dataPerRow;
	if (isPrimary) mapItem.currentCol = (numCols + 1) - mapItem.dataPerRow;
    }
};

})();
