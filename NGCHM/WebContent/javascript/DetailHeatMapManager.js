(function() {
    "use strict";
    NgChm.markFile();

    //Define Namespace for NgChm Drawing
    const DMM = NgChm.createNS('NgChm.DMM');

    const UTIL = NgChm.importNS('NgChm.UTIL');
    const MAPREP = NgChm.importNS('NgChm.MAPREP');
    const MMGR = NgChm.importNS('NgChm.MMGR');
    const DVW = NgChm.importNS('NgChm.DVW');
    const DET = NgChm.importNS('NgChm.DET');
    const DEV = NgChm.importNS('NgChm.DEV');
    const DETDDR = NgChm.importNS('NgChm.DETDDR');
    const PANE = NgChm.importNS('NgChm.Pane');
    const PIM = NgChm.importNS('NgChm.PIM');
    const SUM = NgChm.importNS('NgChm.SUM');
    const LNK = NgChm.importNS('NgChm.LNK');
    const SRCHSTATE = NgChm.importNS('NgChm.SRCHSTATE');
    const SRCH = NgChm.importNS('NgChm.SRCH');

//Next available heatmap object iterator (used for subscripting new map DOM elements) 
DMM.nextMapNumber = 1;

//Template for a Detail Heat Map object containing initialization values for all pertinent variables.
    const mapTemplate = {
	  pane: null, chm: null, version: 'P', panelNbr: 1, mode: 'NORMAL', prevMode: 'NORMAL', currentRow: 1, currentCol: 1, dataPerRow: null, dataPerCol: null,
	  selectedStart: 0, selectedStop: 0, colDendroCanvas: null, rowDendroCanvas: null, canvas: null, boxCanvas: null, labelElement: null, labelPostScript: null,
	  rowLabelDiv: null, colLabelDiv: null, gl: null, uScale: null, uTranslate: null, canvasScaleArray: new Float32Array([1.0, 1.0]), canvasTranslateArray: new Float32Array([0, 0]),
	  oldMousePos: [0, 0], offsetX: 0, offsetY: 0, pageX: 0, pageY: 0, latestTap: null, latestDoubleTap: null, latestPinchDistance: null, latestTapLocation: null,
	  saveRow: null, saveCol: null, dataBoxHeight: null, dataBoxWidth: null, rowDendro: null, colDendro: null, dendroHeight: 105, dendroWidth: 105,
	  dataViewHeight: DET.SIZE_NORMAL_MODE, dataViewWidth: DET.SIZE_NORMAL_MODE,
	  labelLastClicked: {}, dragOffsetX: null, dragOffsetY: null, rowLabelLen: 0, colLabelLen: 0,
	  rowLabelFont: 0, colLabelFont: 0,colClassLabelFont: 0, rowClassLabelFont: 0, labelElements: {}, oldLabelElements: {}, tmpLabelSizeElements: [], 
	  labelSizeWidthCalcPool: [], labelSizeCache: {},zoomOutNormal: null, zoomOutPos: null, subDendroMode: 'none',
	  selectedIsDendrogram: false,
	  searchOrientation: 'row',
	  allowedOrientations: 'any',
	  colClassScale: 1.5,  // Allow the size of covariate bars in detail maps to vary relative to the size of the detail map.
	  rowClassScale: 1.5,  // Constants for now. Should adjust so that absolute bar sizes do not vary excessively.

	  nextDrawWindow: null,  // DrawWindow to use on next redraw.
	  drawEventTimer: 0, // Timeout event until next window redraw
	  drawTimeoutStartTime: 0,  // When we first wanted to redraw panel.

	  //We keep a copy of the last rendered detail heat map for each layer.
	  //This enables quickly redrawing the heatmap when flicking between layers, which
	  //needs to be nearly instant to be effective.
	  //The copy will be invalidated and require drawing if any parameter affecting
	  //drawing of that heat map is changed or if a new tile that could affect it
	  //is received.
	  detailHeatMapCache: {},      // Last rendered detail heat map for each layer
	  detailHeatMapLevel: {},      // Level of last rendered heat map for each layer
	  detailHeatMapValidator: {},  // Encoded drawing parameters used to check heat map is current
	  detailHeatMapParams: {},     // Drawing parameters for this detail view (used by PDF generator)
	  detailHeatMapAccessWindow: null, // Last used access window (for preventing tileWindow garbage collection)
    };

    class DetailHeatMapView {
	constructor (template) {
	    Object.assign (this, template, {
		// When creating a new detail heat map view, the following fields must be
		// reset to their given values.
		glManager: null,
		version: 'S',
		labelElements: {},
		oldLabelElements: {},
		tmpLabelSizeElements: [],
		labelSizeWidthCalcPool: [],
		labelSizeCache: {},
		nextDrawWindow: null,
		drawEventTimer: 0,
		drawTimeoutStartTime: 0,  // When we first wanted to redraw panel.
		detailHeatMapCache: {},
		detailHeatMapLevel: {},
		detailHeatMapValidator: {},
		detailHeatMapParams: {},
		detailHeatMapAccessWindow: null,
	    });
	}

	/*********************************************************************************************
	 * GETTER:  heatMap - The heat map displayed in the mapItem.
	 *********************************************************************************************/
	get heatMap () {
	    return MMGR.getHeatMap();
	}

	/*********************************************************************************************
	 * FUNCTION:  isVisible - Return true if mapItem is visible (i.e. contained in a visible pane).
	 *********************************************************************************************/
	isVisible () {
	    const loc = PANE.findPaneLocation (this.chm);
	    return (!loc.pane.classList.contains('collapsed')) && (loc.pane.style.display !== 'none');
	}

	/*********************************************************************************************
	 * FUNCTION:  getScaledVisibleCovariates - Return the scaled covariates for the specified axis.
	 *********************************************************************************************/
	getScaledVisibleCovariates (axis) {
	    return this.heatMap.getScaledVisibleCovariates (axis, MMGR.isRow(axis) ? this.rowClassScale : this.colClassScale);
	}

	/*********************************************************************************************
	 * FUNCTION:  getCovariateBarLabelFont - Return the font to use for covariate bars on the specified axis.
	 *********************************************************************************************/
	getCovariateBarLabelFont (axis) {
	    return MMGR.isRow(axis) ? this.rowClassLabelFont : this.colClassLabelFont;
	}

	/*********************************************************************************************
	 * FUNCTION:  setCovariateBarLabelFont - Set the font to use for covariate bars on the specified axis.
	 *********************************************************************************************/
	setCovariateBarLabelFont (axis, font) {
	    if (MMGR.isRow(axis)) {
		this.rowClassLabelFont = font;
	    } else {
		this.colClassLabelFont = font;
	    }
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
	    DET.setDrawDetailTimeout (this, DET.redrawSelectionTimeout, noResize);
	}

	removeLabel (label) {
	    DET.removeLabel (this, label);
	}

	addLabelDiv (parent, id, className, text ,longText, left, top, fontSize, rotate, index,axis,xy) {
	    DET.addLabelDiv(this, parent, id, className, text ,longText, left, top, fontSize, rotate, index,axis,xy);
	}

	setButtons () {
	    DEV.setButtons(this);
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
	DMM.setDetailMapDisplay(newMapObj, restoreInfo);
	DEV.setButtons(newMapObj);
	if (isPrimary) {
	    DMM.setPrimaryDetailMap (newMapObj);
	} else {
	    DET.rowDendroResize(newMapObj, true);
	    DET.colDendroResize(newMapObj, true);
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
		PIM.postSelectionToPlugins(axis, clickType, 0, null);
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
		DMM.switchToPrimary(DVW.detailMaps[0]);
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
DMM.switchToPrimary = function (mapItem) {
	const chm = mapItem.chm;
	for (let i=0; i<DVW.detailMaps.length;i++ ) {
		const item = DVW.detailMaps[i];
		if (item.chm === chm) {
			DMM.setPrimaryDetailMap(mapItem);
		} else if (item.version === 'P') {
			const oldPrimaryLoc = PANE.findPaneLocation(item.chm);
			const makePrimaryButton = oldPrimaryLoc.paneHeader.querySelector('.make-primary');
			item.version = 'S';
			makePrimaryButton.dataset.version = 'S';
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
	const pane = PANE.findPaneLocation (mapItem.chm);
	const makePrimaryButton = pane.paneHeader.querySelector('.make-primary');
	makePrimaryButton.dataset.version = 'P';
	SUM.drawLeftCanvasBox ();
	if (SUM.rowDendro) {
	    SUM.rowDendro.clearSelectedRegion();
	    if (mapItem.selectedIsDendrogram && mapItem.mode.startsWith('RIBBONV')) {
		SUM.rowDendro.setRibbonModeBar (mapItem.selectedStart, mapItem.selectedStop);
	    }
	}
	if (SUM.colDendro) {
	    SUM.colDendro.clearSelectedRegion();
	    if (mapItem.selectedIsDendrogram && mapItem.mode.startsWith('RIBBONH')) {
		SUM.colDendro.setRibbonModeBar (mapItem.selectedStart, mapItem.selectedStop);
	    }
	}
}

/*********************************************************************************************
 * FUNCTION:  resizeDetailMapCanvases - Set the size of all detail canvases following a
 * potential size in change (such as changes to the covariate bars).
 *********************************************************************************************/
DMM.resizeDetailMapCanvases = function resizeDetailMapCanvases () {
    DVW.detailMaps.forEach (DET.setCanvasDimensions);
};


/*********************************************************************************************
 * FUNCTION:  setDetailMapDisplay - The purpose of this function is to complete the construction
 * of a detail heat map object and add it to the DetailMaps object array.
 *********************************************************************************************/
DMM.setDetailMapDisplay = function (mapItem, restoreInfo) {
	DET.setDendroShow(mapItem);
	//If we are opening the first detail "copy" of this map set the data sizing for initial display
	if (DVW.detailMaps.length === 0 && !restoreInfo) {
		DET.setInitialDetailDisplaySize(mapItem);
	}
	LNK.createLabelMenus();
	DET.setDendroShow(mapItem);
	if (mapItem.canvas) {
	    DET.setCanvasDimensions (mapItem);
	}

	setTimeout (function() {
		DET.detInitGl(mapItem);
		mapItem.updateSelection();
		if (UTIL.getURLParameter("selected") !== ""){
			const selected = UTIL.getURLParameter("selected").replace(","," ");
			document.getElementById("search_text").value = selected;
			if (mapItem.version === 'P') {
				SRCH.detailSearch();
				SUM.drawSelectionMarks();
				SUM.drawTopItems();
			}
		}
	}, 1);

	DVW.detailMaps.push(mapItem);
	if (mapItem.version === 'P') {
		DVW.primaryMap = mapItem;
	}
	if (restoreInfo) {
	    if (mapItem.rowDendro !== null) {
		mapItem.rowDendro.setZoomLevel(restoreInfo.rowZoomLevel || 1);
	    }
	    if (mapItem.colDendro !== null) {
		mapItem.colDendro.setZoomLevel(restoreInfo.colZoomLevel || 1);
	    }
	}
};

    LNK.addLinkout("Set selection as detail view", "Matrix", linkouts.MULTI_SELECT, setSelectionAsDetailView, null, 0);
    function setSelectionAsDetailView (searchLabels, axis) {
	const menuOpenCanvas = LNK.getMenuOpenCanvas();
	if (menuOpenCanvas) {
	    const mapItem = DVW.getMapItemFromCanvas (menuOpenCanvas);
	    if (mapItem == null) {
		console.error ("Cannot find the detail panel on which the menu popup was opened");
		return;
	    }
	    setDetailView(mapItem, searchLabels);
	}
    }

    //This matrix function allows users to create a special sub-ribbon view that matches
    //the currently selected box in the detail panel.  It just uses the first
    //row/col selected and last row/col selected so it will work well with a drag
    //selected box but not with random selections all over the map.
    function setDetailView (mapItem, searchLabels) {
	    let selRows = SRCHSTATE.getAxisSearchResults("Row");
	    if (selRows.length === 0) {
		    selRows = LNK.getEntireAxisSearchItems(searchLabels,"Row");
	    }
	    let selCols = SRCHSTATE.getAxisSearchResults("Column");
	    if (selCols.length === 0) {
		    selCols = LNK.getEntireAxisSearchItems(searchLabels,"Column");
	    }
	    var startCol = parseInt(selCols[0])
	    var endCol = parseInt(selCols[selCols.length-1])
	    var startRow = parseInt(selRows[0])
	    var endRow = parseInt(selRows[selRows.length-1])

	    SUM.rowDendro.clearSelectedRegion();
	    SUM.colDendro.clearSelectedRegion();
	    setSubRibbonView(mapItem, startRow, endRow, startCol, endCol);
    };

    //This is a helper function that can set a sub-ribbon view that best matches a user
    //selected region of the map.
    DMM.setSubRibbonView = setSubRibbonView;
    function setSubRibbonView  (mapItem, startRow, endRow, startCol, endCol) {
	    const selRows = Math.abs(endRow - startRow);
	    const selCols = Math.abs(endCol - startCol);

	    //In case there was a previous dendo selection - clear it.
	    SUM.clearSelectionMarks();
	    SUM.rowDendro.clearSelectedRegion();
	    SUM.colDendro.clearSelectedRegion();

	    if (!mapItem) return;
	    //If tiny tiny box was selected, discard and go back to previous selection size
	    if (endRow-startRow<1 && endCol-startCol<1) {
		    DET.setDetailDataSize (mapItem, mapItem.dataBoxWidth);
	    //If there are more rows than columns do a horizontal sub-ribbon view that fits the selection. 	
	    } else if (selRows >= selCols) {
		    var boxSize = DET.getNearestBoxSize(mapItem, "row", endRow - startRow + 1);
		    DET.setDetailDataHeight(mapItem,boxSize);
		    mapItem.selectedStart= startCol;
		    mapItem.selectedStop=endCol;
		    mapItem.currentRow = startRow;
		    mapItem.saveRow = startRow;
		    DET.callDetailDrawFunction('RIBBONH', mapItem);
	    } else {
		    //More columns than rows, do a vertical sub-ribbon view that fits the selection.
		    var boxSize = DET.getNearestBoxSize(mapItem, "column", endCol - startCol + 1);
		    DET.setDetailDataWidth(mapItem,boxSize);
		    mapItem.selectedStart=startRow;
		    mapItem.selectedStop=endRow;
		    mapItem.currentCol = startCol;
		    mapItem.saveCol = startCol;
		    DET.callDetailDrawFunction('RIBBONV', mapItem);
	    }
	    mapItem.updateSelection(mapItem);
	    SUM.drawSelectionMarks();
    }


(function() {
	// Define a function to switch a panel to the detail view.
	// Similar to the corresponding function for switching a pane to the summary view.
	// See additional comments in that function.
	DMM.switchPaneToDetail = switchPaneToDetail;
	PANE.registerPaneContentOption ('Detail heatmap', switchPaneToDetail);

	var initialSwitchPaneToDetail = true

	function switchPaneToDetail (loc, restoreInfo) {
		if (loc.pane === null) return;  //Builder logic for panels that don't show detail
		const debug = false;
		const paneId = loc.pane.id; // paneId needed by callbacks. loc may not be valid in callback.
		const isPrimary = restoreInfo ? restoreInfo.isPrimary : (DVW.primaryMap === null);
		const mapNumber = restoreInfo ? restoreInfo.mapNumber : DMM.nextMapNumber;

		PANE.clearExistingDialogs(paneId);
		if (initialSwitchPaneToDetail) {
			// First time detail NGCHM created.
			constructDetailMapDOMTemplate()
			initialSwitchPaneToDetail = false;
		}

		if (loc.pane.querySelector('.detail_chm') !== null) {
			// Cannot switch if already a detail_chm in this panel.
			return;
		}
		PANE.emptyPaneLocation (loc);
		if (restoreInfo) {
		    if (mapNumber >= DMM.nextMapNumber) {
			DMM.nextMapNumber = mapNumber+1;
		    }
		} else {
		    DMM.nextMapNumber++;
		}

		/* Clone DIV#detail_chm from DIV#templates. */
		let chm = cloneDetailChm (mapNumber);
		loc.pane.appendChild (chm);
		PANE.setPaneClientIcons(loc, DEV.createClientButtons(mapNumber, paneId, DMM.switchToPrimary));
		const mapItem = DMM.addDetailMap (chm, paneId, mapNumber, isPrimary, restoreInfo ? restoreInfo.paneInfo : null);
		// If primary is collapsed set chm detail of clone to visible
		if (!restoreInfo && chm.style.display === 'none') {
			chm.style.display = '';
		}
		SUM.drawLeftCanvasBox();
		DEV.addEvents(paneId);
		document.getElementById('primary_btn'+mapNumber).dataset.version = isPrimary ? 'P' : 'S';
		PANE.setPaneTitle (loc, 'Heat Map Detail');
		PANE.registerPaneEventHandler (loc.pane, 'empty', emptyDetailPane);
		PANE.registerPaneEventHandler (loc.pane, 'resize', resizeDetailPane);
		DET.setDrawDetailTimeout (mapItem, 0, false);
		SRCH.enableDisableSearchButtons (mapItem);
		loc.pane.dataset.title = 'Detail Heat Map';
		loc.pane.dataset.intro = 'This panel shows a detailed (zoomed) view of a section of the heat map.';
	}

	/*
		Construct DOM template for Detail Heat Map and append to div with id = 'template'
	*/
	function constructDetailMapDOMTemplate () {
		let detailTemplate = document.createElement('div')
		detailTemplate.setAttribute('id', 'detail_chm');
		detailTemplate.setAttribute('class','detail_chm')
		detailTemplate.setAttribute('style','position: absolute;')
		let columnDendro = document.createElement('canvas')
		columnDendro.setAttribute('id','detail_column_dendro_canvas')
		columnDendro.setAttribute('width','1200')
		columnDendro.setAttribute('height','500')
		columnDendro.setAttribute('style','position: absolute;')
		detailTemplate.appendChild(columnDendro)
		let rowDendro = document.createElement('canvas')
		rowDendro.setAttribute('id','detail_row_dendro_canvas')
		rowDendro.setAttribute('width','1200')
		rowDendro.setAttribute('height','500')
		rowDendro.setAttribute('style','position: absolute;')
		detailTemplate.appendChild(rowDendro)
		let detailCanvas = document.createElement('canvas')
		detailCanvas.setAttribute('id','detail_canvas')
		detailCanvas.setAttribute('class','detail_canvas')
		detailCanvas.setAttribute('tabindex','1')
		detailTemplate.appendChild(detailCanvas)
		let detailBoxCanvas = document.createElement('canvas')
		detailBoxCanvas.setAttribute('id','detail_box_canvas')
		detailBoxCanvas.setAttribute('class','detail_box_canvas')
		detailTemplate.appendChild(detailBoxCanvas)
		// labels div has children colLabels and rowLabels
		let labels = document.createElement('div')
		labels.setAttribute('id','labelDiv')
		labels.setAttribute('style','display: inline-block;')
		let colLabels = document.createElement('div')
		colLabels.setAttribute('id','colLabelDiv')
		colLabels.setAttribute('data-axis','Column')
		colLabels.setAttribute('style','display: inline-block; position: absolute; right: 0px;')
		colLabels.oncontextmenu = function(event) { DEV.labelRightClick(event); };
		labels.appendChild(colLabels)
		let rowLabels = document.createElement('div')
		rowLabels.setAttribute('id','rowLabelDiv')
		rowLabels.setAttribute('data-axis','Row')
		rowLabels.setAttribute('style','display: inline-block; position: absolute; bottom: 0px;')
		rowLabels.oncontextmenu = function(event) { DEV.labelRightClick(event); };
		labels.appendChild(rowLabels)
		detailTemplate.appendChild(labels)
		let templates = document.getElementById('templates')
		templates.appendChild(detailTemplate)
	}


	function cloneDetailChm (mapNumber) {
		const tmp = document.querySelector('#detail_chm');
		const pClone = tmp.cloneNode(true);
		pClone.id = 'detail_chm' + mapNumber;
		renameElements(pClone, mapNumber);
		// Return cloned client element.
		return pClone;
	}

	function renameElements (pClone, mapNumber) {
		// Rename all client elements on the pane.
		for (let idx = 0; idx < pClone.children.length; idx++) {
			const p = pClone.children[idx];
			p.id = p.id + mapNumber;
			if (p.children.length > 0) {
				let removals = [];
		        for (let idx2 = 0; idx2 < p.children.length; idx2++) {
					const q = p.children[idx2];
					//rename all but label elements and place label elements in a deletion array
					if ((q.id.includes('rowLabelDiv')) || (q.id.includes('colLabelDiv'))) {
						q.id = q.id + mapNumber;
					} else {
						removals.push(q.id);
					}
		        }
		        //strip out all label elements
		        for (let idx3 = 0; idx3 < removals.length; idx3++) {
					const rem = removals[idx3];
			        for (let idx4 = 0; idx4 < p.children.length; idx4++) {
						const q = p.children[idx4];
						if (rem === q.id) {
							q.remove();
							break;
						}
			        }
		        }
			}
		}
	}


	function emptyDetailPane (loc, elements) {
		DMM.RemoveDetailMap(loc.pane.id);
		SUM.drawLeftCanvasBox ();
	}

	function resizeDetailPane (loc) {
		const mapItem = DVW.getMapItemFromPane(loc.pane.id);
		DET.resizeMapItem(mapItem);
		DET.setDrawDetailTimeout(mapItem, DET.redrawSelectionTimeout, false);
	}

})();

})();
