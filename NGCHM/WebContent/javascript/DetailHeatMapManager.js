(function() {
    "use strict";
    NgChm.markFile();

    //Define Namespace for NgChm Drawing
    const DMM = NgChm.createNS('NgChm.DMM');

    const MAPREP = NgChm.importNS('NgChm.MAPREP');
    const MMGR = NgChm.importNS('NgChm.MMGR');
    const DVW = NgChm.importNS('NgChm.DVW');
    const DET = NgChm.importNS('NgChm.DET');
    const DEV = NgChm.importNS('NgChm.DEV');
    const DETDDR = NgChm.importNS('NgChm.DETDDR');
    const PANE = NgChm.importNS('NgChm.Pane');
    const SUM = NgChm.importNS('NgChm.SUM');

//Next available heatmap object iterator (used for subscripting new map DOM elements) 
DMM.nextMapNumber = 1;

//Template for a Detail Heat Map object containing initialization values for all pertinent variables.
    const mapTemplate = {
	  pane: null, chm: null, version: 'P', panelNbr: 1, mode: 'NORMAL', prevMode: 'NORMAL', currentDl: 'dl1', currentRow: 1, currentCol: 1, dataPerRow: null, dataPerCol: null,
	  selectedStart: 0, selectedStop: 0, colDendroCanvas: null, rowDendroCanvas: null, canvas: null, boxCanvas: null, labelElement: null, labelPostScript: null,
	  rowLabelDiv: null, colLabelDiv: null, gl: null, uScale: null, uTranslate: null, canvasScaleArray: new Float32Array([1.0, 1.0]), canvasTranslateArray: new Float32Array([0, 0]),
	  oldMousePos: [0, 0], offsetX: 0, offsetY: 0, pageX: 0, pageY: 0, latestTap: null, latestDoubleTap: null, latestPinchDistance: null, latestTapLocation: null,
	  saveRow: null, saveCol: null, dataBoxHeight: null, dataBoxWidth: null, rowDendro: null, colDendro: null, dendroHeight: 105, dendroWidth: 105, dataViewHeight: 506,
	  dataViewWidth: 506, minLabelSize: 5, labelLastClicked: {}, dragOffsetX: null, dragOffsetY: null, rowLabelLen: 0, colLabelLen: 0,
	  rowLabelFont: 0, colLabelFont: 0,colClassLabelFont: 0, rowClassLabelFont: 0, labelElements: {}, oldLabelElements: {}, tmpLabelSizeElements: [], 
	  labelSizeWidthCalcPool: [], labelSizeCache: {},zoomOutNormal: null, zoomOutPos: null, subDendroMode: 'none'
    };

    class DetailHeatMapView {
	constructor (template) {
	    Object.assign (this, template, { glManager: null, version: 'S', });
	}

	/*********************************************************************************************
	 * FUNCTION:  isVisible - Return true if mapItem is visible (i.e. contained in a visible pane).
	 *********************************************************************************************/
	isVisible () {
	    const loc = PANE.findPaneLocation (this.chm);
	    return (!loc.pane.classList.contains('collapsed')) && (loc.pane.style.display !== 'none');
	}

	/*********************************************************************************************
	 * FUNCTION:  updateSelection - The purpose of this function is to set the state of a given
	 * detail heat map panel.  This function is called when the selected row / column is changed.
	 * It is assumed that the caller modified currentRow, currentCol, dataPerRow, and dataPerCol
	 * as desired. This method does redrawing and notification as necessary.
	 *
	 * To update all detailViews, see DVW.updateSelections.
	 *********************************************************************************************/
	updateSelection (noResize) {
	    //We have the summary heat map so redraw the yellow selection box.
	    SUM.drawLeftCanvasBox();
	    MMGR.getHeatMap().setReadWindow(DVW.getLevelFromMode(this, MAPREP.DETAIL_LEVEL),DVW.getCurrentDetRow(this),DVW.getCurrentDetCol(this),DVW.getCurrentDetDataPerCol(this),DVW.getCurrentDetDataPerRow(this));
	    DET.setDrawDetailTimeout (this, DET.redrawSelectionTimeout,noResize);
	}

	removeLabel (label) {
	    DET.removeLabel (this, label);
	}

	addLabelDiv (parent, id, className, text ,longText, left, top, fontSize, rotate, index,axis,xy) {
	    DET.addLabelDiv(this, parent, id, className, text ,longText, left, top, fontSize, rotate, index,axis,xy);
	}

	setButtons () {
	    DET.setButtons(this);
	}
    };


/*********************************************************************************************
 * FUNCTION:  addDetailMap - Add a new detail heat map object to the DetailMaps object array.
 *
 * If there is no primary map, it will be populated based on an initial values template.
 * Otherwise, it will be populated from Primary heat map object and marked as a 'Secondary'
 * heat map.
 *********************************************************************************************/
DMM.addDetailMap = function (chm, pane, mapNumber, isPrimary, restoreInfo) {
	const template = DVW.primaryMap || mapTemplate;
	const newMapObj = new DetailHeatMapView (template);
	newMapObj.pane = pane;
	DMM.completeMapItemConfig(newMapObj, chm, mapNumber);
	if (restoreInfo) {
	    DET.restoreFromSavedState (newMapObj, restoreInfo);
	}
	DET.setDetailMapDisplay(newMapObj, restoreInfo);
	if (isPrimary) {
	    DMM.setPrimaryDetailMap (newMapObj);
	} else {
	    DET.rowDendroResize(newMapObj);
	    DET.colDendroResize(newMapObj);
	}
	return newMapObj;
};

/*********************************************************************************************
 * FUNCTION:  completeMapItemConfig - The purpose of this function is to flesh out the mapItem
 * (either intial or copy) being created.
 *********************************************************************************************/
DMM.completeMapItemConfig = function (mapItem, chm, mapNumber) {
        const dendroCallbacks = {
	    setMouseDown: function () {
		DEV.setMouseDown (true);
	    },
	    getLabelLastClicked: function (axis) {
		return DET.labelLastClicked[axis];
	    },
	    isVisible: function (canvas) {
		const loc = PANE.findPaneLocation (canvas);
		return !loc.pane.classList.contains('collapsed');
	    },
	    searchResultsChanged: function (axis, clickType) {
		SRCH.showSearchResults();
		DET.setDrawDetailTimeout(mapItem, DET.redrawSelectionTimeout, true);
		DET.updateDisplayedLabels();
		SUM.clearAxisSelectionMarks(axis);
		SUM.drawAxisSelectionMarks(axis);
		SUM.drawTopItems();
		LNK.postSelectionToLinkouts(axis, clickType, 0, null);
	    },
	};
	const labelCallbacks = {
	    labelClick: DEV.labelClick,
	    labelDrag: DEV.labelDrag,
	    labelRightClick: DEV.labelRightClick,
	};
	mapItem.chm = chm;
	mapItem.version = DVW.detailMaps.length === 0 ? 'P' : 'S';
	mapItem.colDendroCanvas = chm.children[0];
	mapItem.rowDendroCanvas = chm.children[1];
	mapItem.canvas = chm.children[2];
	mapItem.boxCanvas = chm.children[3];
	mapItem.labelElement = chm.children[4];
	mapItem.rowDendro = new DETDDR.DetailRowDendrogram(mapItem, chm.children[1], SUM.rowDendro, dendroCallbacks);
	mapItem.colDendro = new DETDDR.DetailColumnDendrogram(mapItem, chm.children[0], SUM.colDendro, dendroCallbacks);
	mapItem.panelNbr = mapNumber;
	mapItem.labelPostScript = mapNumber === 1 ? '' : '_' + mapNumber;
	mapItem.rowLabelDiv =  'rowL'+mapItem.labelElement.id.substring(1);
	mapItem.colLabelDiv =  'colL'+mapItem.labelElement.id.substring(1);
	mapItem.labelCallbacks = labelCallbacks;
};

/*********************************************************************************************
 * FUNCTION:  RemoveDetailMap - The purpose of this function is to remove a detail heat map 
 * object from the DetailMaps array.
 *********************************************************************************************/
DMM.RemoveDetailMap = function (pane) {
	let wasPrime = false;
	for (let i=0; i<DVW.detailMaps.length;i++ ) {
		const mapItem = DVW.detailMaps[i];
		if (mapItem.pane === pane) {
			if (mapItem.version === 'P') {
				wasPrime = true;
			}
			DVW.detailMaps.splice(i, 1);
			break;
		}
	}
	if (wasPrime) {
	   if (DVW.detailMaps.length > 0) {
		DMM.switchToPrimary(DVW.detailMaps[0].chm);
	   } else {
	       DVW.primaryMap = null;
	   }
	}
}

/*********************************************************************************************
 * FUNCTION:  getPrimaryDetailMap - The purpose of this function is to retrieve the Primary
 * detail heat map object from the DetailMaps array.
 *********************************************************************************************/
DMM.getPrimaryDetailMap = function () {
	for (let i=0; i<DVW.detailMaps.length;i++ ) {
		const mapItem = DVW.detailMaps[i];
		if (mapItem.version === 'P') {
			return mapItem;
		}
	}
}

/*********************************************************************************************
 * FUNCTION:  switchToPrimary - The purpose of this function is to switch one map item from
 * Secondary to Primary and set all others to Secondary.
 *********************************************************************************************/
DMM.switchToPrimary = function (chm) {
	const newPrimaryLoc = PANE.findPaneLocation(chm);
	const mapItem = DVW.getMapItemFromChm(chm);
	for (let i=0; i<DVW.detailMaps.length;i++ ) {
		if (DVW.detailMaps[i].chm === chm) {
			DMM.setPrimaryDetailMap(mapItem);
			PANE.setPaneTitle(newPrimaryLoc, 'Heat Map Detail - Primary');
		} else {
			const item = DVW.detailMaps[i];
			if (item.version === 'P') {
				const oldPrimaryLoc = PANE.findPaneLocation(item.chm);
				item.version = 'S';
				PANE.setPaneTitle(oldPrimaryLoc, 'Heat Map Detail - Ver '+item.panelNbr);
				document.getElementById('primary_btn'+DVW.detailMaps[i].panelNbr).style.display = '';
			}
		}
	}
}

/*********************************************************************************************
 * FUNCTION:  setPrimaryDetailMap - The purpose of this function is to set a Secondary map
 * item to the Primary map item. This will happen when either the primary map is closed and a
 * secondary map is open OR when assigned by the user.
 *********************************************************************************************/
DMM.setPrimaryDetailMap = function (mapItem) {
	mapItem.version = 'P';
	DVW.primaryMap = mapItem;
	document.getElementById('primary_btn'+mapItem.panelNbr).style.display = 'none';
}

/*********************************************************************************************
 * FUNCTION:  resizeDetailMapCanvases - Set the size of all detail canvases following a
 * potential size in change (such as changes to the covariate bars).
 *********************************************************************************************/
DMM.resizeDetailMapCanvases = function resizeDetailMapCanvases () {
	const rowBarsWidth = DET.calculateTotalClassBarHeight("row");
	const colBarsHeight = DET.calculateTotalClassBarHeight("column");
	for (let i=0; i<DVW.detailMaps.length; i++) {
		const mapItem = DVW.detailMaps[i];
		mapItem.canvas.width =  mapItem.dataViewWidth + rowBarsWidth;
		mapItem.canvas.height = mapItem.dataViewHeight + colBarsHeight;
	}
};

/************************************************************************************************
 * FUNCTION - detailResize: This function calls all of the functions necessary to resize all 
 * of the open detail panel instances.
 ************************************************************************************************/
DMM.detailResize = function () {
	DVW.detailMaps.forEach(mapItem => {
	    DET.rowDendroResize(mapItem);
	    DET.colDendroResize(mapItem);
	});
	if (DVW.detailMaps.length > 0) {
		 DET.sizeCanvasForLabels();
		 //Done twice because changing canvas size affects fonts selected for drawing labels
		 DET.sizeCanvasForLabels();
		 DET.updateDisplayedLabels();
		 DET.drawSelections();
	}
	DVW.detailMaps.forEach(mapItem => {
	    DET.rowDendroResize(mapItem);
	    DET.colDendroResize(mapItem);
	});
}

})();
