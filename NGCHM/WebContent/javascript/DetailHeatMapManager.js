(function() {
    "use strict";
    NgChm.markFile();

    //Define Namespace for NgChm Drawing
    const DMM = NgChm.createNS('NgChm.DMM');

    const DET = NgChm.importNS('NgChm.DET');
    const DDR = NgChm.importNS('NgChm.DDR');
    const PANE = NgChm.importNS('NgChm.Pane');

//Array to contain all active detail heat map objects
DMM.DetailMaps = [];

//Array to contain all active detail heat map objects
DMM.primaryMap = null;

//Next available heatmap object iterator (used for subscripting new map DOM elements) 
DMM.nextMapNumber = 1;

//Template for a Detail Heat Map object containing initialization values for all pertinent variables.
DMM.mapTemplate = {
	  pane: null, chm: null, version: 'P', panelNbr: 1, mode: 'NORMAL', prevMode: 'NORMAL', currentDl: 'dl1', currentRow: 1, currentCol: 1, dataPerRow: null, dataPerCol: null,
	  selectedStart: 0, selectedStop: 0, colDendroCanvas: null, rowDendroCanvas: null, canvas: null, boxCanvas: null, labelElement: null, labelPostScript: null,
	  rowLabelDiv: null, colLabelDiv: null, gl: null, uScale: null, uTranslate: null, canvasScaleArray: new Float32Array([1.0, 1.0]), canvasTranslateArray: new Float32Array([0, 0]),
	  oldMousePos: [0, 0], offsetX: 0, offsetY: 0, pageX: 0, pageY: 0, latestTap: null, latestDoubleTap: null, latestPinchDistance: null, latestTapLocation: null,
	  saveRow: null, saveCol: null, dataBoxHeight: null, dataBoxWidth: null, rowDendro: null, colDendro: null, dendroHeight: 105, dendroWidth: 105, dataViewHeight: 506,
	  dataViewWidth: 506, minLabelSize: 5, labelLastClicked: {}, dragOffsetX: null, dragOffsetY: null, rowLabelLen: 0, colLabelLen: 0,
	  rowLabelFont: 0, colLabelFont: 0,colClassLabelFont: 0, rowClassLabelFont: 0, labelElements: {}, oldLabelElements: {}, tmpLabelSizeElements: [], 
	  labelSizeWidthCalcPool: [], labelSizeCache: {},zoomOutNormal: null, zoomOutPos: null, subDendroMode: 'none'
} 

/*********************************************************************************************
 * FUNCTION:  addDetailMap - Add a new detail heat map object to the DetailMaps object array.
 *
 * If there is no primary map, it will be populated based on an initial values template.
 * Otherwise, it will be populated from Primary heat map object and marked as a 'Secondary'
 * heat map.
 *********************************************************************************************/
DMM.addDetailMap = function (chm, pane, mapNumber, isPrimary, restoreInfo) {
	const template = DMM.primaryMap || DMM.mapTemplate;
	const newMapObj = Object.assign({}, template, { glManager: null, version: 'S', });
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
	mapItem.chm = chm;
	mapItem.version = DMM.DetailMaps.length === 0 ? 'P' : 'S';
	mapItem.colDendroCanvas = chm.children[0];
	mapItem.rowDendroCanvas = chm.children[1];
	mapItem.canvas = chm.children[2];
	mapItem.boxCanvas = chm.children[3];
	mapItem.labelElement = chm.children[4];
	mapItem.rowDendro = new DDR.DetailRowDendrogram(chm.children[1]);
	mapItem.colDendro = new DDR.DetailColumnDendrogram(chm.children[0]);
	mapItem.panelNbr = mapNumber;
	mapItem.labelPostScript = mapNumber === 1 ? '' : '_' + mapNumber;
	mapItem.rowLabelDiv =  'rowL'+mapItem.labelElement.id.substring(1);
	mapItem.colLabelDiv =  'colL'+mapItem.labelElement.id.substring(1);
}

/*********************************************************************************************
 * FUNCTION:  RemoveDetailMap - The purpose of this function is to remove a detail heat map 
 * object from the DetailMaps array.
 *********************************************************************************************/
DMM.RemoveDetailMap = function (pane) {
	let wasPrime = false;
	for (let i=0; i<DMM.DetailMaps.length;i++ ) {
		const mapItem = DMM.DetailMaps[i];
		if (mapItem.pane === pane) {
			if (mapItem.version === 'P') {
				wasPrime = true;
			}
			DMM.DetailMaps.splice(i, 1);
			break;
		}
	}
	if (wasPrime) {
	   if (DMM.DetailMaps.length > 0) {
		DMM.switchToPrimary(DMM.DetailMaps[0].chm);
	   } else {
	       DMM.primaryMap = null;
	   }
	}
}

/*********************************************************************************************
 * FUNCTION:  getPrimaryDetailMap - The purpose of this function is to retrieve the Primary
 * detail heat map object from the DetailMaps array.
 *********************************************************************************************/
DMM.getPrimaryDetailMap = function () {
	for (let i=0; i<DMM.DetailMaps.length;i++ ) {
		const mapItem = DMM.DetailMaps[i];
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
	const mapItem = DMM.getMapItemFromChm(chm);
	for (let i=0; i<DMM.DetailMaps.length;i++ ) {
		if (DMM.DetailMaps[i].chm === chm) {
			DMM.setPrimaryDetailMap(mapItem);
			PANE.setPaneTitle(newPrimaryLoc, 'Heat Map Detail - Primary');
		} else {
			const item = DMM.DetailMaps[i];
			if (item.version === 'P') {
				const oldPrimaryLoc = PANE.findPaneLocation(item.chm);
				item.version = 'S';
				PANE.setPaneTitle(oldPrimaryLoc, 'Heat Map Detail - Ver '+item.panelNbr);
				document.getElementById('primary_btn'+DMM.DetailMaps[i].panelNbr).style.display = '';
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
	DMM.primaryMap = mapItem;
	document.getElementById('primary_btn'+mapItem.panelNbr).style.display = 'none';
}

/*********************************************************************************************
 * FUNCTION:  getMapItemFromEvent - The purpose of this function is to retrieve a detail heat map 
 * object using the event. 
 *********************************************************************************************/
DMM.getMapItemFromEvent = function (e) {
	let mapItem = null;
	if (e.pane !== null) {
		mapItem = DMM.getMapItemFromPane(e.pane);
	} else if (e.currentTarget !== null) {
		mapItem = DMM.getMapItemFromCanvas(e.currentTarget);
	}
	return mapItem;
}

/*********************************************************************************************
 * FUNCTION:  resizeDetailMapCanvases - Set the size of all detail canvases following a
 * potential size in change (such as changes to the covariate bars).
 *********************************************************************************************/
DMM.resizeDetailMapCanvases = function resizeDetailMapCanvases () {
	const rowBarsWidth = DET.calculateTotalClassBarHeight("row");
	const colBarsHeight = DET.calculateTotalClassBarHeight("column");
	for (let i=0; i<DMM.DetailMaps.length; i++) {
		const mapItem = DMM.DetailMaps[i];
		mapItem.canvas.width =  mapItem.dataViewWidth + rowBarsWidth;
		mapItem.canvas.height = mapItem.dataViewHeight + colBarsHeight;
	}
};

/*********************************************************************************************
 * FUNCTION:  getMapItemFromChm - The purpose of this function is to retrieve a detail heat map 
 * object using the chm. 
 *********************************************************************************************/
DMM.getMapItemFromChm = function (chm) {
	if (DMM.DetailMaps.length === 0) {
		return DMM.primaryMap;
	} else {
		for (let i=0; i<DMM.DetailMaps.length;i++ ) {
			const mapItem = DMM.DetailMaps[i];
			if (mapItem.chm === chm) {
				return mapItem;
			}
		}
	}
}

/*********************************************************************************************
 * FUNCTION:  getMapItemFromPane - The purpose of this function is to retrieve a detail heat map 
 * object using the panel id associated with that map object. 
 *********************************************************************************************/
DMM.getMapItemFromPane = function (paneId) {
	if (DMM.DetailMaps.length === 0) {
		return DMM.primaryMap;
	} else {
		for (let i=0; i<DMM.DetailMaps.length;i++ ) {
			const mapItem = DMM.DetailMaps[i];
			if (mapItem.pane === paneId) {
				return mapItem;
			}
		}
	}
}

/*********************************************************************************************
 * FUNCTION:  getMapItemFromPane - The purpose of this function is to retrieve a detail heat map 
 * object using the canvas associated with that map object. 
 *********************************************************************************************/
DMM.getMapItemFromCanvas = function (canvas) {
	if (DMM.DetailMaps.length === 0) {
		return DMM.primaryMap;
	} else {
		for (let i=0; i<DMM.DetailMaps.length;i++ ) {
			const mapItem = DMM.DetailMaps[i];
			if (mapItem.canvas === canvas) {
				return mapItem;
			}
		}
	}
}

/*********************************************************************************************
 * FUNCTION:  getMapItemFromDendro - The purpose of this function is to retrieve a detail heat map 
 * object using the dendrogram associated with that map object. 
 *********************************************************************************************/
DMM.getMapItemFromDendro = function (dendro) {
	for (let i=0; i<DMM.DetailMaps.length;i++ ) {
		const mapItem = DMM.DetailMaps[i];
		if (mapItem.rowDendro === dendro) {
			return mapItem;
		}
		if (mapItem.colDendro === dendro) {
			return mapItem;
		}
	}
}

/*********************************************************************************************
 * FUNCTION:  isVisible - Return true if mapItem is visible (i.e. contained in a visible pane).
 *********************************************************************************************/
DMM.isVisible = isVisible;

function isVisible (mapItem) {
	const loc = PANE.findPaneLocation (mapItem.chm);
	return (!loc.pane.classList.contains('collapsed')) && (loc.pane.style.display !== 'none');
}

/*********************************************************************************************
 * FUNCTION:  anyVisible - Return true if any Detail View is visible.
 *********************************************************************************************/
DMM.anyVisible = function anyVisible () {
	for (let i=0; i<DMM.DetailMaps.length;i++ ) {
		if (isVisible(DMM.DetailMaps[i])) {
		    return true;
		};
	}
	return false;
};

/************************************************************************************************
 * FUNCTION - detailResize: This function calls all of the functions necessary to resize all 
 * of the open detail panel instances.
 ************************************************************************************************/
DMM.detailResize = function () {
	DMM.DetailMaps.forEach(mapItem => {
	    DET.rowDendroResize(mapItem);
	    DET.colDendroResize(mapItem);
	});
	if (DMM.DetailMaps.length > 0) {
		 DET.sizeCanvasForLabels();
		 //Done twice because changing canvas size affects fonts selected for drawing labels
		 DET.sizeCanvasForLabels();
		 DET.updateDisplayedLabels();
		 DET.drawSelections();
	}
	DMM.DetailMaps.forEach(mapItem => {
	    DET.rowDendroResize(mapItem);
	    DET.colDendroResize(mapItem);
	});
}

})();
