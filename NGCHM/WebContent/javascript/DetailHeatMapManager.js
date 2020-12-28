//"use strict";

//Define Namespace for NgChm Drawing
NgChm.createNS('NgChm.DMM');

//Array to contain all active detail heat map objects
NgChm.DMM.DetailMaps = [];

//Array to contain all active detail heat map objects
NgChm.DMM.primaryMap = null;

//Next available heatmap object iterator (used for subscripting new map DOM elements) 
NgChm.DMM.nextMapNumber = 1;

//Template for a Detail Heat Map object containing initialization values for all pertinent variables.
NgChm.DMM.mapTemplate = { 
	  pane: null, chm: null, version: 'P', panelNbr: 1, mode: 'NORMAL', prevMode: 'NORMAL', currentDl: 'dl1', currentRow: 1, currentCol: 1, dataPerRow: null, dataPerCol: null,
	  selectedStart: 0, selectedStop: 0, colDendroCanvas: null, rowDendroCanvas: null, canvas: null, boxCanvas: null, labelElement: null, labelPostScript: null,
	  rowLabelDiv: null, colLabelDiv: null, gl: null, uScale: null, uTranslate: null, canvasScaleArray: new Float32Array([1.0, 1.0]), canvasTranslateArray: new Float32Array([0, 0]),
	  oldMousePos: [0, 0], offsetX: 0, offsetY: 0, pageX: 0, pageY: 0, latestTap: null, latestDoubleTap: null, latestPinchDistance: null, latestTapLocation: null,
	  saveRow: null, saveCol: null, dataBoxHeight: null, dataBoxWidth: null, rowDendro: null, colDendro: null, dendroHeight: 105, dendroWidth: 105, dataViewHeight: 506,
	  dataViewWidth: 506, minLabelSize: 5, labelLastClicked: {}, dragOffsetX: null, dragOffsetY: null, rowLabelLen: 0, colLabelLen: 0,
	  rowLabelFont: 0, colLabelFont: 0,colClassLabelFont: 0, rowClassLabelFont: 0, labelElements: {}, oldLabelElements: {}, tmpLabelSizeElements: [], 
	  labelSizeWidthCalcPool: [], labelSizeCache: {}
} 

/*********************************************************************************************
 * FUNCTION:  getMapTemplate - The purpose of this function is to clone and return a copy
 * of the map template for a new primary detail map.
 *********************************************************************************************/
NgChm.DMM.getMapTemplate = function () {
	return Object.assign({}, NgChm.DMM.mapTemplate);
}

/*********************************************************************************************
 * FUNCTION:  InitDetailMap - The purpose of this function is to add the Primary heat map
 * object to the DetailMaps object array. It is called when a new map is opened. This object will 
 * be populated based upon an initial values map template.
 *********************************************************************************************/
NgChm.DMM.InitDetailMap = function (chm){
	document.getElementById('aboutMenu_btn').style.display = 'none';
	document.getElementById('detail_buttons').style.display = '';
	document.getElementById('loader').style.display = 'none';
	let newMapObj = NgChm.DMM.getMapTemplate();
	NgChm.DMM.primaryMap = newMapObj;
	newMapObj.pane = chm.parentElement.id;
	NgChm.DMM.completeMapItemConfig(chm,newMapObj);
	NgChm.DEV.addEvents(newMapObj.pane); 
}

/*********************************************************************************************
 * FUNCTION:  AddDetailMap - The purpose of this function is to add a new detail heat map
 * object to the DetailMaps object array. This object will be based upon the settings of the
 * Primary heat map object and will be marked as a 'Secondary' heat map object.
 *********************************************************************************************/
NgChm.DMM.AddDetailMap = function (chm,pane){
	let newMapObj = Object.assign({}, NgChm.DMM.primaryMap);
	newMapObj.pane = pane;
	newMapObj.version = 'S';
	NgChm.DMM.completeMapItemConfig(chm,newMapObj);
	 NgChm.DET.rowDendroResize();
	 NgChm.DET.colDendroResize();
}

/*********************************************************************************************
 * FUNCTION:  completeMapItemConfig - The purpose of this function is to flesh out the mapItem
 * (either intial or copy) being created.
 *********************************************************************************************/
NgChm.DMM.completeMapItemConfig = function (chm,mapItem) {
	mapItem.chm = chm;
	mapItem.version = NgChm.DMM.DetailMaps.length === 0 ? 'P' : 'S';
	mapItem.colDendroCanvas = chm.children[0];
	mapItem.rowDendroCanvas = chm.children[1];
	mapItem.canvas = chm.children[2];
	mapItem.boxCanvas = chm.children[3];
	mapItem.labelElement = chm.children[4];
	mapItem.rowDendro = new NgChm.DDR.DetailRowDendrogram(chm.children[1]); 
	mapItem.colDendro = new NgChm.DDR.DetailColumnDendrogram(chm.children[0]);
	mapItem.panelNbr = NgChm.DMM.nextMapNumber;
	mapItem.labelPostScript = NgChm.DMM.nextMapNumber === 1 ? '' : '_' + NgChm.DMM.nextMapNumber;
	mapItem.rowLabelDiv =  'rowL'+mapItem.labelElement.id.substring(1);
	mapItem.colLabelDiv =  'colL'+mapItem.labelElement.id.substring(1);
	NgChm.DET.setDetailMapDisplay(chm,mapItem);	
}

/*********************************************************************************************
 * FUNCTION:  RemoveDetailMap - The purpose of this function is to remove a detail heat map 
 * object from the DetailMaps array.
 *********************************************************************************************/
NgChm.DMM.RemoveDetailMap = function (pane) {
	for (let i=0; i<NgChm.DMM.DetailMaps.length;i++ ) {
		const mapItem = NgChm.DMM.DetailMaps[i];
		if (mapItem.pane === pane) {
			NgChm.DMM.DetailMaps.splice(i, 1);
			break;
		}
	}
	if (NgChm.DMM.DetailMaps.length === 1) {
		NgChm.DMM.switchToPrimary(NgChm.DMM.DetailMaps[0].chm); 
	}
}

/*********************************************************************************************
 * FUNCTION:  getPrimaryDetailMap - The purpose of this function is to retrieve the Primary
 * detail heat map object from the DetailMaps array.
 *********************************************************************************************/
NgChm.DMM.getPrimaryDetailMap = function () {
	for (let i=0; i<NgChm.DMM.DetailMaps.length;i++ ) {
		const mapItem = NgChm.DMM.DetailMaps[i];
		if (mapItem.version === 'P') {
			return mapItem;
		}
	}
}

/*********************************************************************************************
 * FUNCTION:  switchToPrimary - The purpose of this function is to switch one map item from
 * Secondary to Primary and set all others to Secondary.
 *********************************************************************************************/
NgChm.DMM.switchToPrimary = function (chm) {
	const newPrimaryLoc = NgChm.Pane.findPaneLocation(chm);
	const mapItem = NgChm.DMM.getMapItemFromChm(chm);
	for (let i=0; i<NgChm.DMM.DetailMaps.length;i++ ) {
		if (NgChm.DMM.DetailMaps[i].chm === chm) {
			NgChm.DMM.setPrimaryDetailMap(mapItem);
			NgChm.Pane.setPaneTitle(newPrimaryLoc, 'Heat Map Detail - Primary');
		} else {
			const item = NgChm.DMM.DetailMaps[i];
			if (item.version === 'P') {
				const oldPrimaryLoc = NgChm.Pane.findPaneLocation(item.chm);
				item.version = 'S';
				NgChm.Pane.setPaneTitle(oldPrimaryLoc, 'Heat Map Detail - Ver '+item.panelNbr);
				document.getElementById('primary_btn'+NgChm.DMM.DetailMaps[i].panelNbr).style.display = '';
			}
		}
	}
}

/*********************************************************************************************
 * FUNCTION:  setPrimaryDetailMap - The purpose of this function is to set a Secondary map
 * item to the Primary map item. This will happen when either the primary map is closed and a
 * secondary map is open OR when assigned by the user.
 *********************************************************************************************/
NgChm.DMM.setPrimaryDetailMap = function (mapItem) {
	mapItem.version = 'P';
	NgChm.DMM.primaryMap = mapItem;
	document.getElementById('primary_btn'+mapItem.panelNbr).style.display = 'none';
	if (NgChm.heatMap.getColorMapManager() !== null) {
		NgChm.DEV.flickChange(null);
	}
}

/*********************************************************************************************
 * FUNCTION:  getMapItemFromEvent - The purpose of this function is to retrieve a detail heat map 
 * object using the event. 
 *********************************************************************************************/
NgChm.DMM.getMapItemFromEvent = function (e) {
	let mapItem = null;
	if (e.pane !== null) {
		mapItem = NgChm.DMM.getMapItemFromPane(e.pane);
	} else if (e.currentTarget !== null) {
		mapItem = NgChm.DMM.getMapItemFromCanvas(e.currentTarget);
	}
	return mapItem;
}

/*********************************************************************************************
 * FUNCTION:  getMapItemFromChm - The purpose of this function is to retrieve a detail heat map 
 * object using the chm. 
 *********************************************************************************************/
NgChm.DMM.getMapItemFromChm = function (chm) {
	for (let i=0; i<NgChm.DMM.DetailMaps.length;i++ ) {
		const mapItem = NgChm.DMM.DetailMaps[i];
		if (mapItem.chm === chm) {
			return mapItem;
		}
	}
}

/*********************************************************************************************
 * FUNCTION:  getMapItemFromPane - The purpose of this function is to retrieve a detail heat map 
 * object using the panel id associated with that map object. 
 *********************************************************************************************/
NgChm.DMM.getMapItemFromPane = function (paneId) {
	for (let i=0; i<NgChm.DMM.DetailMaps.length;i++ ) {
		const mapItem = NgChm.DMM.DetailMaps[i];
		if (mapItem.pane === paneId) {
			return mapItem;
		}
	}
}

/*********************************************************************************************
 * FUNCTION:  getMapItemFromPane - The purpose of this function is to retrieve a detail heat map 
 * object using the canvas associated with that map object. 
 *********************************************************************************************/
NgChm.DMM.getMapItemFromCanvas = function (canvas) {
	for (let i=0; i<NgChm.DMM.DetailMaps.length;i++ ) {
		const mapItem = NgChm.DMM.DetailMaps[i];
		if (mapItem.canvas === canvas) {
			return mapItem;
		}
	}
}

/*********************************************************************************************
 * FUNCTION:  getMapItemFromDendro - The purpose of this function is to retrieve a detail heat map 
 * object using the dendrogram associated with that map object. 
 *********************************************************************************************/
NgChm.DMM.getMapItemFromDendro = function (dendro) {
	for (let i=0; i<NgChm.DMM.DetailMaps.length;i++ ) {
		const mapItem = NgChm.DMM.DetailMaps[i];
		if (mapItem.rowDendro === dendro) {
			return mapItem;
		}
		if (mapItem.colDendro === dendro) {
			return mapItem;
		}
	}
}

/*********************************************************************************************
 * FUNCTION:  isVisible - The purpose of this function is to return true if the Detail View 
 * is visible (i.e. contained in a visible pane).
 *********************************************************************************************/
NgChm.DMM.isVisible = function isVisible () {
	if (NgChm.DMM.DetailMaps.length > 0) {
		return true;
	} else {
		return false;
	}
}

/************************************************************************************************
 * FUNCTION - detailResize: This function calls all of the functions necessary to resize all 
 * of the open detail panel instances.
 ************************************************************************************************/
NgChm.DMM.detailResize = function () {
	 if (NgChm.DMM.DetailMaps.length > 0) {
		 NgChm.DET.rowDendroResize();
		 NgChm.DET.colDendroResize();
		 NgChm.DET.sizeCanvasForLabels();
		 //Done twice because changing canvas size affects fonts selected for drawing labels
		 NgChm.DET.sizeCanvasForLabels();
		 NgChm.DET.updateDisplayedLabels();
		 NgChm.DET.drawSelections();  
		 NgChm.DET.rowDendroResize();
		 NgChm.DET.colDendroResize();
		 NgChm.DET.dendroDraw();
	 }
}




