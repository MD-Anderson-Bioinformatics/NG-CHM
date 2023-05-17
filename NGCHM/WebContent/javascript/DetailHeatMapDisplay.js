(function() {
    'use strict';
    NgChm.markFile();

    //Define Namespace for NgChm DetailHeatMapDisplay
    const DET = NgChm.createNS('NgChm.DET');

    const MAPREP = NgChm.importNS('NgChm.MAPREP');
    const MMGR = NgChm.importNS('NgChm.MMGR');
    const CMM = NgChm.importNS('NgChm.CMM');
    const SRCHSTATE = NgChm.importNS('NgChm.SRCHSTATE');
    const SUM = NgChm.importNS('NgChm.SUM');
    const DVW = NgChm.importNS('NgChm.DVW');
    const UTIL = NgChm.importNS('NgChm.UTIL');
    const DRAW = NgChm.importNS('NgChm.DRAW');
    const UHM = NgChm.importNS('NgChm.UHM');
    const PANE = NgChm.importNS('NgChm.Pane');

DET.labelLastClicked = {};
DET.paddingHeight = 2;          // space between classification bars
DET.SIZE_NORMAL_MODE = 506;
DET.dataViewBorder = 2;
// zoomBoxSizes are chosen such that they evenly divide SIZE_NORMAL_MODE - dataViewBorder = 504.
// prime factors of 504 are 2,2,2,3,3,7
// Thus, data element box sizes in a normal mode view will all have the same number of pixels.
DET.zoomBoxSizes = [1,2,3,4,6,7,8,9,12,14,18,21,24,28,36,42,56,63,72,84,126,168,252];
DET.eventTimer = 0; // Used to delay draw updates
DET.maxLabelSize = 11;
DET.redrawSelectionTimeout = 0;   // Drawing delay in ms after the view has changed.
DET.redrawUpdateTimeout = 10;	// Drawing delay in ms after a tile update (if needed).
DET.minPixelsForGrid = 20;	// minimum element size for grid lines to display
DET.animating = false;

    /*********************************************************************************************
     * FUNCTION:  setDataViewSize - Set the display size, in canvas units, of the specified axis
     * of the detail map view shown in mapItem.
     *
     * We also multiply the covariate bar scale factor for that axis by the ratio of the new to
     * old display sizes.  This preserves the relative sizes of the covariate bars and the heat
     * map view.
     *********************************************************************************************/
    DET.setDataViewSize = setDataViewSize;
    function setDataViewSize (mapItem, axis, size) {
	if (MMGR.isRow (axis)) {
	    mapItem.rowClassScale *= size / mapItem.dataViewWidth;
	    mapItem.dataViewWidth = size|0;
	} else {
	    mapItem.colClassScale *= size / mapItem.dataViewHeight;
	    mapItem.dataViewHeight = size|0;
	}
    }

//----------------------------------------------------------------------------------------------//
//----------------------------------------------------------------------------------------------//
//BEGIN HEAT MAP DRAWING RELATED DETAIL DISPLAY FUNCTIONS
//----------------------------------------------------------------------------------------------//
//----------------------------------------------------------------------------------------------//

/*********************************************************************************************
 * FUNCTION:  updateSelections - The purpose of this function is to call the updateSelection
 * function for each detail map panel.
 *********************************************************************************************/
DET.updateSelections = function (noResize) {
	for (let i=0; i<DVW.detailMaps.length;i++ ) {
		if (typeof noResize !== 'undefined') {
			DVW.detailMaps[i].updateSelection(noResize)
		} else {
			DVW.detailMaps[i].updateSelection()
		}
	}
	MMGR.getHeatMap().setUnAppliedChanges(true);
};

/*********************************************************************************************
 * FUNCTION:  processDetailMapUpdate - The purpose of this function is to serve as a Callback
 * that is notified every time there is an update to the heat map initialize, new data, etc.
 * This callback draws the summary heat map.
 *********************************************************************************************/
DET.processDetailMapUpdate = function (event, tile) {
	if (event !== MMGR.Event_INITIALIZED) {
		DET.flushDrawingCache(tile);
	}
};

/*********************************************************************************************
 * FUNCTION:  setDrawDetailsTimeout - The purpose of this function is to call the drawing
 * routine timer for all existing heat map panels.
 *********************************************************************************************/
DET.setDrawDetailsTimeout = function (ms, noResize) {
	for (let i=0; i< DVW.detailMaps.length;i++ ) {
		const mapItem = DVW.detailMaps[i];
		DET.setDrawDetailTimeout(mapItem,ms,noResize);
	}
}

/*********************************************************************************************
 * FUNCTION:  setDrawDetailTimeout - The purpose of this function is to redraw a detail
 * heatmap after ms milliseconds to a detail heat map pane. noResize is used to skip the resize routine and help speed
 * up the drawing routine for some cases. If noResize is true for every call to setDrawDetailTimeout,
 * the resize routine will be skipped on the next redraw.
 *********************************************************************************************/
DET.setDrawDetailTimeout = function (mapItem, ms, noResize) {
	if (!noResize) mapItem.resizeOnNextDraw = true;
	if (!mapItem.isVisible()) { return false }
	mapItem.nextDrawWindow = DVW.getDetailWindow(mapItem);

	const now = performance.now();
	const redrawDelayLimit = 100; // ms

	if (mapItem.drawEventTimer) {
	    const redrawDelay = now - mapItem.drawTimeoutStartTime;
	    if (redrawDelay < redrawDelayLimit) {
		// redraw has not waited too long.
		// replace previous redraw with the latest one.
		clearTimeout (mapItem.drawEventTimer);
	    } else {
		// Allow existing redraw to proceed, but
		// also start a new one with latest view.
		mapItem.drawTimeoutStartTime = now;
	    }
	} else {
	    mapItem.drawTimeoutStartTime = now;
	}
	mapItem.drawEventTimer = setTimeout(function drawDetailTimeout () {
		mapItem.drawEventTimer = 0;
		if (mapItem.nextDrawWindow != null && mapItem.chm && mapItem.isVisible()) {
			const drawWin = mapItem.nextDrawWindow;
			mapItem.nextDrawWindow = null;
			DET.drawDetailHeatMap(mapItem, drawWin.win);
		}
	}, ms);
};

/*********************************************************************************************
 * FUNCTION:  flushDrawingCache - The purpose of this function is to process the receipt of
 * a new data tile on the primary heat map panel. It causes any cached heat map affected by
 * the new tile to be redrawn the next time it is displayed.  The currently displayed primary
 * heat map will be redrawn after a short delay if it might be affected by the tile.
 *********************************************************************************************/
DET.flushDrawingCache = function (tile) {
	// The cached heat map for the tile's layer will be
	// invalidated if the tile's level matches the level
	// of the cached heat map.
	//
	// This assumes that only updates to the same level require an update.
	// Reasonable here since the only possible lower levels (thumbnail
	// and summary) are fully prefetched at initialization.
	// In any case, data for the drawing window's level should also arrive soon
	// and the heat map would be redrawn then.
	DVW.detailMaps.forEach (mapItem => {
	    const aw = mapItem.detailHeatMapAccessWindow;
	    if (!aw || aw.isTileInWindow (tile)) {
		mapItem.detailHeatMapValidator[tile.layer] = '';
		// Redraw 'now', without resizing, if the tile is for the currently displayed layer.
		DET.setDrawDetailTimeout(mapItem, DET.redrawUpdateTimeout, true);
	    }
	});
}

/*********************************************************************************************
 * FUNCTION:  setInitialDetailDisplaySize - The purpose of this function is to set the initial
 * detail display sizing (dataPerRow/Col, dataViewHeight/Width) for the heat map.
 *********************************************************************************************/
DET.setInitialDetailDisplaySize = function (mapItem) {
	// Small Maps - Set detail data size.  If there are less than 42 rows or columns
	// set the to show the box size closest to the lower value ELSE
	// set it to show 42 rows/cols.
	const rows = mapItem.heatMap.getNumRows(MAPREP.DETAIL_LEVEL);
	const cols = mapItem.heatMap.getNumColumns(MAPREP.DETAIL_LEVEL);
	if ((rows < 42) || (cols < 42)) {
		const boxSize = DET.getNearestBoxSize(mapItem, "column", Math.min(rows,cols));
		DET.setDetailDataSize(mapItem,boxSize);
	} else {
		DET.setDetailDataSize(mapItem,12);
	}
};


/**********************************************************************************
 * FUNCTION - callDetailDrawFunction: The purpose of this function is to respond to
 * mode changes on the Summary Panel by calling the appropriate detail drawing
 * function. It acts only on the Primary heat map pane.
 **********************************************************************************/
DET.callDetailDrawFunction = function(modeVal, target) {
    let mapItem = (typeof target !== 'undefined') ? target : DVW.primaryMap;
    if (!mapItem) return;
    if (modeVal == 'RIBBONH' || modeVal == 'RIBBONH_DETAIL')
	    DET.detailHRibbon(mapItem);
    if (modeVal == 'RIBBONV' || modeVal == 'RIBBONV_DETAIL')
	    DET.detailVRibbon(mapItem);
    if (modeVal == 'FULL_MAP')
	    DET.detailFullMap(mapItem);
    if (modeVal == 'NORMAL') {
	    DET.detailNormal(mapItem);
    }
};

/*********************************************************************************************
 * FUNCTION:  drawDetailHeatMap - The purpose of this function is to draw the region of the
 * NGCHM specified by drawWin to a detail heat map pane.
 *********************************************************************************************/
DET.drawDetailHeatMap = function (mapItem, drawWin) {
	const heatMap = mapItem.heatMap;
	DET.setDendroShow(mapItem);
	if (mapItem.resizeOnNextDraw) {
		DET.resizeMapItem(mapItem);
		mapItem.resizeOnNextDraw = false;
	}
	setViewPort(mapItem);
	DET.setDetBoxCanvasSize(mapItem);

	// Together with the data, these parameters determine the color of a matrix value.
	const colorMap = heatMap.getColorMapManager().getColorMap("data", drawWin.layer);
	const pixelColorScheme = {
		colors: colorMap.getColors(),
		thresholds: colorMap.getThresholds(),
		missingColor: colorMap.getMissingColor()
	};

	// Determine all the parameters that can affect the generated heat map.
	const params = {
		pixelColorScheme,
		mapWidth: mapItem.dataViewWidth,
		mapHeight: mapItem.dataViewHeight,
		dataBoxWidth: mapItem.dataBoxWidth,
		dataBoxHeight: mapItem.dataBoxHeight,
		rowBars: mapItem.getScaledVisibleCovariates("row"),
		colBars: mapItem.getScaledVisibleCovariates("column"),
		rowDendroHeight: heatMap.getRowDendroConfig().height,
		colDendroHeight: heatMap.getColDendroConfig().height,
		searchRows: SRCHSTATE.getAxisSearchResults("Row"),
		searchCols: SRCHSTATE.getAxisSearchResults("Column"),
		searchGridColor: [0,0,0]
	};

	// Set parameters that depend on the data layer properties.
	{
		const dataLayers = heatMap.getDataLayers();
		const dataLayer = dataLayers[drawWin.layer];
		const showGrid = dataLayer.grid_show === 'Y';
		const detWidth = + mapItem.boxCanvas.style.width.replace("px","");
		const detHeight = + mapItem.boxCanvas.style.height.replace("px","");
		params.showVerticalGrid = showGrid && params.dataBoxWidth > UTIL.minLabelSize && DET.minPixelsForGrid*drawWin.numCols <= detWidth;
		params.showHorizontalGrid = showGrid && params.dataBoxHeight > UTIL.minLabelSize && DET.minPixelsForGrid*drawWin.numRows <= detHeight;
		params.grid_color = dataLayer.grid_color;
		params.selection_color = dataLayer.selection_color;
		params.cuts_color = dataLayer.cuts_color;
	}

	const renderBuffer = DET.getDetailHeatMap (mapItem, drawWin, params);

	//WebGL code to draw the renderBuffer.
	if (DET.detInitGl (mapItem)) {
	    const ctx = mapItem.glManager.context;
	    mapItem.glManager.setTextureFromRenderBuffer(renderBuffer);
	    ctx.uniform2fv(mapItem.uScale, mapItem.canvasScaleArray);
	    ctx.uniform2fv(mapItem.uTranslate, mapItem.canvasTranslateArray);
	    mapItem.glManager.drawTexture();
	}

	// Draw the dendrograms
	mapItem.colDendro.draw();
	mapItem.rowDendro.draw();

	//Draw any selection boxes defined by SearchRows/SearchCols
	DET.drawSelections();
};

/*********************************************************************************************
 * FUNCTION:  getDetailHeatMap - The purpose of this function is to return a renderBuffer
 * containing an image of the region of the NGCHM specified by drawWin rendered using the
 * parameters in params.handle a user mouse down event.
 *********************************************************************************************/
DET.getDetailHeatMap = function (mapItem, drawWin, params) {

	const layer = drawWin.layer;

	// Update detailHeatMapParams to indicate the desired view.
	{
	    const { level, firstRow, firstCol, numRows, numCols } = drawWin;
	    mapItem.detailHeatMapParams[layer] = {
		drawWin: { layer, level, firstRow, firstCol, numRows, numCols },  // Just the window params.
		params: params,
	    };
	}

	const paramCheck = JSON.stringify(mapItem.detailHeatMapParams[layer]);
	if (mapItem.detailHeatMapValidator[layer] === paramCheck) {
		//Cached image exactly matches what we need.
		return mapItem.detailHeatMapCache[layer];
	}

	// Determine size of required image.
	const rowClassBarWidth = params.rowBars.totalHeight();
	const colClassBarHeight = params.colBars.totalHeight();
	const texWidth = params.mapWidth + rowClassBarWidth;
	const texHeight = params.mapHeight + colClassBarHeight;

	if (mapItem.detailHeatMapCache.hasOwnProperty(layer)) {
		// Resize the existing renderBuffer if needed.
		mapItem.detailHeatMapCache[layer].resize (texWidth, texHeight);
	} else {
		// Or create a new one if needed.
		mapItem.detailHeatMapCache[layer] = DRAW.createRenderBuffer (texWidth, texHeight, 1.0);
	}
	// Save data needed for determining if the heat map image will match the next request.
	mapItem.detailHeatMapValidator[layer] = paramCheck;
	mapItem.detailHeatMapLevel[layer] = drawWin.level;

	// create these variables now to prevent having to call them in the for-loop
	const currDetRow = drawWin.firstRow;
	const currDetCol = drawWin.firstCol;
	const detDataPerRow = drawWin.numCols;
	const detDataPerCol = drawWin.numRows;

	// Define a function for outputting reps copy of line
	// to the renderBuffer for this layer.
	const renderBuffer = mapItem.detailHeatMapCache[layer];
	const emitLines = (function() {
		// Start outputting data to the renderBuffer after one line
		// of blank space.
		// Line must be renderBuffer.width pixels wide.
		// Using |0 ensures values are converted to integers.
		const lineBytes = (renderBuffer.width * DRAW.BYTE_PER_RGBA)|0;
		let pos = lineBytes; // Start with one line of blank space.
		return function emitLines (line, reps) {
			reps = reps | 0;
			// Output required number of replicas of line.
			while (reps > 0) {
				for (let k = 0; k < lineBytes; k++) {
					renderBuffer.pixels[pos+k] = line[k];
				}
				pos += lineBytes;
				reps--;
			}
		};
	})();

	const heatMap = mapItem.heatMap;
	const colorMap = heatMap.getColorMapManager().getColorMap("data",layer).getContColorMap();

	const dataGridColor = CMM.hexToRgba(params.grid_color);
	const dataSelectionColorRGB = CMM.hexToRgba(params.selection_color);
	const dataSelectionColor = [dataSelectionColorRGB.r/255, dataSelectionColorRGB.g/255, dataSelectionColorRGB.b/255, 1];
	const regularGridColor = [dataGridColor.r, dataGridColor.g, dataGridColor.b];
	const cutsColor = CMM.hexToRgba(params.cuts_color);

	// Create and keep reference to access window (the latter to prevent garbage collection
	// of active tileWindows).
	const accessWindow = heatMap.getNewAccessWindow (drawWin);
	mapItem.detailHeatMapAccessWindow = accessWindow;

	//Build a horizontal grid line for use between data lines. Tricky because some dots will be selected color if a column is in search results.
	const linelen = texWidth * DRAW.BYTE_PER_RGBA;
	const gridLine = new Uint8Array(new ArrayBuffer(linelen));
	//Build a horizontal cuts line using the cut color defined for the data layer.
	const cutsLine = new Uint8Array(new ArrayBuffer(linelen));
	if ((cutsColor !== null) && (cutsColor !== undefined)) {
		for (let i=0;i<linelen;i++) {
			cutsLine[i] = cutsColor.r;i++;
			cutsLine[i] = cutsColor.g;i++;
			cutsLine[i] = cutsColor.b;i++;
			cutsLine[i] = cutsColor.a;
		}
	}
	if (params.showHorizontalGrid) {
		let linePos = (rowClassBarWidth)*DRAW.BYTE_PER_RGBA;
		linePos+=DRAW.BYTE_PER_RGBA;
		// Get value generator for this row.
		const valueGen = accessWindow.getRowValues(currDetRow)[Symbol.iterator]();
		// We need to lookahead one column when checking for vertical cuts.
		// Get lookahead for column 0.
		let nextVal = (v=>v&&v.value)(valueGen.next().value);
		for (let j = 0; j < detDataPerRow; j++) {
			// Advance to column j and get lookahead to column j+1.
			const val = nextVal;
			nextVal = (v=>v&&v.value)(valueGen.next().value);

			const gridColor = ((params.searchCols.indexOf(mapItem.currentCol+j) > -1) || (params.searchCols.indexOf(mapItem.currentCol+j+1) > -1)) ? params.searchGridColor : regularGridColor;
			for (let k = 0; k < mapItem.dataBoxWidth; k++) {
				//If current column contains a cut value, write an empty white position to the gridline, ELSE write out appropriate grid color
				if (val <= MAPREP.minValues) {
					if ((k === mapItem.dataBoxWidth - 1) && (nextVal > MAPREP.minValues)) {
						gridLine[linePos] = gridColor[0]; gridLine[linePos+1] = gridColor[1]; gridLine[linePos+2] = gridColor[2];	gridLine[linePos+3] = 255;
					} else {
						gridLine[linePos] = cutsColor.r; gridLine[linePos+1] = cutsColor.g; gridLine[linePos+2] = cutsColor.b;	gridLine[linePos+3] = cutsColor.a;
					}
				} else {
					if (k==mapItem.dataBoxWidth-1){ // should the grid line be drawn?
						gridLine[linePos] = gridColor[0]; gridLine[linePos+1] = gridColor[1]; gridLine[linePos+2] = gridColor[2];	gridLine[linePos+3] = 255;
					} else {
						gridLine[linePos]=regularGridColor[0]; gridLine[linePos + 1]=regularGridColor[1]; gridLine[linePos + 2]=regularGridColor[2]; gridLine[linePos + 3]=255;
					}
				}
				linePos += DRAW.BYTE_PER_RGBA;
			}
		}
		linePos+=DRAW.BYTE_PER_RGBA;
	}
	
	let line = new Uint8Array(new ArrayBuffer((rowClassBarWidth + mapItem.dataViewWidth) * DRAW.BYTE_PER_RGBA));

	//Needs to go backward because WebGL draws bottom up.
	for (let i = detDataPerCol-1; i >= 0; i--) {
	    let linePos = (rowClassBarWidth)*DRAW.BYTE_PER_RGBA;
	    //If all values in a line are "cut values" AND (because we want gridline at bottom of a row with data values) all values in the
	    // preceding line are "cut values" mark the current line as as a horizontal cut
	    const isHorizCut = isLineACut(accessWindow,i) && isLineACut(accessWindow,i-1);
	    linePos+=DRAW.BYTE_PER_RGBA;
	    // Get value generator for this row.
	    const valueGen = accessWindow.getRowValues(currDetRow+i)[Symbol.iterator]();
	    // We need to lookahead one column when checking for cuts.
	    // Get lookahead for column 0.
	    let nextVal = (v=>v&&v.value)(valueGen.next().value);
	    for (let j = 0; j < detDataPerRow; j++) { // for every data point...
		// Advance to column j.  Get lookahead for column j+1.
		const val = nextVal;
		nextVal = (v=>v&&v.value)(valueGen.next().value);

		if (val === undefined) {
		    console.error ('accessWindow value generator returned undefined', { accessWindow, row: currDetRow+i, col: currDetCol+j, detDataPerRow });
		} else {
		    const { r, g, b, a } = colorMap.getColor(val);

		    //For each data point, write it several times to get correct data point width.
		    for (let k = 0; k < mapItem.dataBoxWidth; k++) {
			if (params.showVerticalGrid && k===mapItem.dataBoxWidth-1 && j < detDataPerRow-1 ){ // should the grid line be drawn?
			    if (j < detDataPerRow-1) {
				//If current value being drawn into the line is a cut value, draw a transparent white position for the grid
				if ((val <= MAPREP.minValues) && (nextVal <= MAPREP.minValues)) {
					line[linePos] = cutsColor.r; line[linePos+1] = cutsColor.g; line[linePos+2] = cutsColor.b;	line[linePos+3] = cutsColor.a;
				} else {
					line[linePos] = regularGridColor[0]; line[linePos+1] = regularGridColor[1]; line[linePos+2] = regularGridColor[2];	line[linePos+3] = 255;
				}
			    }
			} else {
				line[linePos]     = r;
				line[linePos + 1] = g;
				line[linePos + 2] = b;
				line[linePos + 3] = a;
			}
			linePos += DRAW.BYTE_PER_RGBA;
		    }
		}
	    }
	    linePos+=DRAW.BYTE_PER_RGBA;

	    //Write each line several times to get correct data point height.
	    const numGridLines = params.showHorizontalGrid && i > 0 ? 1 : 0;
	    emitLines (line, mapItem.dataBoxHeight - numGridLines)
	    emitLines (isHorizCut ? cutsLine : gridLine, numGridLines);
	}

	//Draw covariate bars.
	DET.detailDrawColClassBars(mapItem, renderBuffer.pixels);
	DET.detailDrawRowClassBars(mapItem, renderBuffer.pixels);

	return renderBuffer;
}

    /**********************************************************************************
     * FUNCTION - isLineACut: Return true iff the given row/line is a cut (or gap) line.
     *
     * row is a zero-based index within the accessWindow.
     *
     * To improve efficiency, memoise the results of the test if possible.  Although the
     * heat map data itself is constant, it's possible one or more data tiles are not
     * yet available.  In that case, just compute a temporary answer for now.
     *
     **********************************************************************************/
    function isLineACut (accessWindow, row) {

	// Catch attempt to check row before accessWindow.
	if (row < 0) return false;

	const baseRowIdx = accessWindow.win.firstRow - 1;  // Convert to 0-based row index.
	const resultsMemo = accessWindow.heatMap.datalevels[accessWindow.win.level].isLineACut;

	// If we already have a memoized answer, return it.
	if (resultsMemo[baseRowIdx+row] !== undefined) {
	    return resultsMemo[baseRowIdx+row];
	}

	if (accessWindow.allTilesAvailable()) {
	    // Compute and memoize answers for all rows in the accessWindow.
	    for (let rr = 0; rr < accessWindow.win.numRows; rr++) {
		if (resultsMemo[baseRowIdx+rr] == undefined) {
		    resultsMemo[baseRowIdx+rr] = isRowACut (baseRowIdx+rr);
		}
	    }
	    // Return result for the desired row.
	    return resultsMemo[baseRowIdx+row];
	} else {
	    // At least one tile is missing.
	    // Return a temporary answer for the desired row.
	    return isRowACut (baseRowIdx+row);
	}

	function isRowACut (row) {
	    // Get value iterator for the row.
	    // N.B. getRowValues requires a 1-based row index.
	    const valueIter = accessWindow.getRowValues(row+1);
	    // If any value on the row is not a cut value, then the row is not a cut.
	    for (let {value} of valueIter) {
		if (value > MAPREP.minValues) {
		    return false;
		}
	    }
	    // All values on the row are cuts, so the row is too.
	    return true;
	}
    }

/*********************************************************************************************
 * FUNCTION:  setDetBoxCanvasSize - The purpose of this function is to set the size of the
 * detail box canvas to match that of the heat map canvas.
 *********************************************************************************************/
DET.setDetBoxCanvasSize = function (mapItem) {
	mapItem.boxCanvas.width =  mapItem.canvas.clientWidth;
	mapItem.boxCanvas.height = mapItem.canvas.clientHeight;
	mapItem.boxCanvas.style.left=mapItem.canvas.style.left;
	mapItem.boxCanvas.style.top=mapItem.canvas.style.top;
}

/*********************************************************************************************
 * FUNCTION: getNearestBoxSize  -  The purpose of this function is to loop zoomBoxSizes to
 * pick the one that will be large enough to encompass user-selected area
 *********************************************************************************************/
DET.getNearestBoxSize = function (mapItem, axis, sizeToGet) {
	const smallestMapDimension = Math.min(mapItem.heatMap.getTotalRows(),mapItem.heatMap.getTotalCols());
	const dataViewSize = (MMGR.isRow(axis) ? mapItem.dataViewHeight : mapItem.dataViewWidth) - DET.dataViewBorder;
	let boxSize = 0;
	for (let i=DET.zoomBoxSizes.length-1; i>=0;i--) {
		boxSize = DET.zoomBoxSizes[i];
		const boxCalcVal = dataViewSize / boxSize;
		if (boxCalcVal >= sizeToGet) {
			// Down size box if greater than smallest map dimension.
			if (boxCalcVal > smallestMapDimension) {
				boxSize = DET.zoomBoxSizes[i+1];
			}
			break;
		}
	}
	return boxSize;
};

/*********************************************************************************************
 * FUNCTION: getDetailSaveState  -  Return save state required for restoring this detail view.
 *********************************************************************************************/
DET.getDetailSaveState = function (dm) {
	// Subtract dataViewBorder from dataViewWidth/Height in case it ever changes.
	// Such a change may break restoring an identical view.

	return {
	    'currentCol': dm.currentCol,
	    'currentRow': dm.currentRow,
	    'colZoomLevel': dm.colDendro ? dm.colDendro.zoomLevel : 0,
	    'rowZoomLevel': dm.rowDendro ? dm.rowDendro.zoomLevel : 0,
	    'dataBoxHeight': dm.dataBoxHeight,
	    'dataBoxWidth': dm.dataBoxWidth,
	    'dataPerCol': dm.dataPerCol,
	    'dataPerRow': dm.dataPerRow,
	    'dataViewWidth': dm.dataViewWidth - DET.dataViewBorder,
	    'dataViewHeight': dm.dataViewHeight - DET.dataViewBorder,
	    'mode': dm.mode,
	    'type': 'detailMap',
	    'version': dm.version,
	    'versionNumber': dm.panelNbr,
	    'subDendroMode': dm.subDendroMode,
	    'selectedStart': dm.selectedStart,
	    'selectedStop': dm.selectedStop,
	    'selectedIsDendrogram': dm.selectedIsDendrogram,
	};
};

/**********************************************************************************
 * FUNCTION - scaleViewWidth: For maps that have less rows/columns than the size
 * of the detail panel, matrix elements get  width more  than 1 pixel, scale calculates
 * the appropriate height/width.
 **********************************************************************************/
DET.scaleViewWidth = function (mapItem) {
	const numColumns = mapItem.heatMap.getNumColumns (MAPREP.SUMMARY_LEVEL);
	const scale = Math.max(Math.floor(500/numColumns), 1);
	setDataViewSize (mapItem, "row", (numColumns * scale) + DET.dataViewBorder);
	DET.setDetailDataWidth (mapItem, scale);
}

/**********************************************************************************
 * FUNCTION - scaleViewHeight: For maps that have less rows/columns than the size
 * of the detail panel, matrix elements get height more than 1 pixel, scale calculates
 * the appropriate height/width.
 **********************************************************************************/
DET.scaleViewHeight = function (mapItem) {
	const numRows = mapItem.heatMap.getNumRows (MAPREP.SUMMARY_LEVEL);
	const scale = Math.max(Math.floor(500/numRows), 1);
	setDataViewSize (mapItem, "column", (numRows * scale) + DET.dataViewBorder);
	DET.setDetailDataHeight(mapItem, scale);
}

/**********************************************************************************
 * FUNCTION - setDetailDataSize: The purpose of this function is to determine and
 * set how big each data point should be in a given detail pane.
 **********************************************************************************/
DET.setDetailDataSize = function (mapItem, size) {
	DET.setDetailDataWidth (mapItem, size);
	DET.setDetailDataHeight(mapItem, size);
}

/**********************************************************************************
 * FUNCTION - setDetailDataWidth: The purpose of this function is to determine and
 * set how big the detail data width should be for a given detail pane.
 **********************************************************************************/
DET.setDetailDataWidth = function (mapItem, size) {
	const prevDataPerRow = mapItem.dataPerRow;
	mapItem.dataBoxWidth = size;
	DVW.setDataPerRowFromDet(Math.floor((mapItem.dataViewWidth-DET.dataViewBorder)/mapItem.dataBoxWidth), mapItem);

	// Adjust the current column based on zoom but don't go outside of the heat map matrix dimensions.
	if (!mapItem.modeHistory) mapItem.modeHistory = [];
	if ((prevDataPerRow != null) && (mapItem.modeHistory.length === 0)){
		if (prevDataPerRow > mapItem.dataPerRow) {
			mapItem.currentCol += Math.floor((prevDataPerRow - mapItem.dataPerRow) / 2);
		} else {
			mapItem.currentCol -= Math.floor((mapItem.dataPerRow - prevDataPerRow) / 2);
		}
	}
	DVW.checkCol(mapItem);
}

/**********************************************************************************
 * FUNCTION - setDetailDataHeight: The purpose of this function is to determine and
 * set how big the detail data height should be for a given detail pane.
 **********************************************************************************/
DET.setDetailDataHeight = function (mapItem, size) {
	const prevDataPerCol = mapItem.dataPerCol;
	mapItem.dataBoxHeight = size;
	DVW.setDataPerColFromDet(Math.floor((mapItem.dataViewHeight-DET.dataViewBorder)/mapItem.dataBoxHeight), mapItem);
	if (!mapItem.modeHistory) mapItem.modeHistory = [];
	
	//Adjust the current row but don't go outside of the current heat map dimensions
	if ((prevDataPerCol != null) && (mapItem.modeHistory.length === 0)){
		if (prevDataPerCol > mapItem.dataPerCol)
			mapItem.currentRow += Math.floor((prevDataPerCol - mapItem.dataPerCol) / 2);
		else
			mapItem.currentRow -= Math.floor((mapItem.dataPerCol - prevDataPerCol) / 2);
	}
	DVW.checkRow(mapItem);
};

    /***********************************************************************************
     * FUNCTION - clearModeHistory: Clears mode history.  Should be done every time the
     * user explicitly changes the zoom mode.
     ***********************************************************************************/
    DET.clearModeHistory = function (mapItem) {
	mapItem.modeHistory = [];
    };

    /**********************************************************************************
     * FUNCTION - detailFullMap: The purpose of this function is to show the whole map
     * in the detail pane. Processes ribbon h/v differently. In these cases, one axis
     * is kept static so that the "full view" stays within the selected sub-dendro.
     **********************************************************************************/
    DET.detailFullMap = function (mapItem) {
	UHM.hlpC();
	mapItem.saveRow = mapItem.currentRow;
	mapItem.saveCol = mapItem.currentCol;
	let setFullMap = false;

	//For maps that have less rows/columns than the size of the detail panel, matrix elements get height / width more
	//than 1 pixel, scale calculates the appropriate height/width.
	if (mapItem.mode.startsWith('RIBBONH') && mapItem.selectedStart != 0) { // mapItem.subDendroMode === 'Row') {
	    if (mapItem.currentRow == 1 && mapItem.dataPerCol == mapItem.heatMap.getTotalRows()) {
		setFullMap = true;
	    } else {
		DET.scaleViewHeight(mapItem);
	    }
	} else if (mapItem.mode.startsWith('RIBBONV') && mapItem.selectedStart != 0) { // subDendroMode === 'Column') {
	    if (mapItem.currentCol == 1 && mapItem.dataPerRow == mapItem.heatMap.getTotalCols()) {
		setFullMap = true;
	    } else {
		DET.scaleViewWidth(mapItem);
	    }
	} else {
	    setFullMap = true;
	}

	if (setFullMap) {
	    // Clear any restricted mode and dendrograms.
	    mapItem.selectedStart = 0;
	    if (SUM.rowDendro) {
		SUM.rowDendro.clearSelectedRegion();
	    }
	    if (SUM.colDendro) {
		SUM.colDendro.clearSelectedRegion();
	    }
	    DVW.setMode(mapItem, 'FULL_MAP');
	    DET.scaleViewHeight(mapItem);
	    DET.scaleViewWidth(mapItem);
	}

	//Canvas is adjusted to fit the number of rows/columns and matrix height/width of each element.
	setCanvasDimensions (mapItem);
	DET.detInitGl(mapItem);
	mapItem.updateSelection();
    };

    // Set the canvas dimensions (canvas.width and canvas.height) based on the current data view size and the size
    // of the currently visible covariate bars.
    DET.setCanvasDimensions = setCanvasDimensions;
    function setCanvasDimensions (mapItem) {
	mapItem.canvas.width =  mapItem.dataViewWidth + mapItem.getScaledVisibleCovariates("row").totalHeight();
	mapItem.canvas.height = mapItem.dataViewHeight + mapItem.getScaledVisibleCovariates("column").totalHeight();
    }

    /**********************************************************************************
     * FUNCTION - detailHRibbon: The purpose of this function is to change the view for
     * a given heat map panel to horizontal ribbon view.  Note there is a standard full
     * ribbon view and also a sub-selection ribbon view if the user clicks on the dendrogram.
     * If a dendrogram selection is in effect, then selectedStart and selectedStop will be set.
     **********************************************************************************/
    DET.detailHRibbon = function (mapItem, restoreInfo) {
	UHM.hlpC();
	const previousMode = mapItem.mode;
	const prevWidth = mapItem.dataBoxWidth;
	mapItem.saveCol = mapItem.currentCol;
	if (!restoreInfo) DVW.setMode(mapItem,'RIBBONH');
	mapItem.setButtons();

	if (previousMode=='FULL_MAP') {
	    DET.setDetailDataHeight(mapItem, DET.zoomBoxSizes[0]);
	}
	// If normal (full) ribbon, set the width of the detail display to the size of the horizontal ribbon view
	// and data size to 1.
	if (mapItem.selectedStart == null || mapItem.selectedStart == 0) {
	    const numRibbonColumns = mapItem.heatMap.getNumColumns (MAPREP.RIBBON_HOR_LEVEL);
	    let ddw = 1;
	    while (ddw*numRibbonColumns < 250 - DET.dataViewBorder) { // make the width wider to prevent blurry/big dendros for smaller maps
		ddw += ddw;
	    }
	    setDataViewSize (mapItem, "row", ddw*numRibbonColumns + DET.dataViewBorder);
	    DET.setDetailDataWidth(mapItem, ddw);
	    mapItem.currentCol = 1;
	} else {
	    mapItem.saveCol = mapItem.selectedStart;
	    let numViewColumns = mapItem.selectedStop - mapItem.selectedStart + 1;
	    mapItem.mode='RIBBONH_DETAIL'
	    const scale = Math.max(1, Math.floor(500/numViewColumns));
	    setDataViewSize (mapItem, "row", (numViewColumns * scale) + DET.dataViewBorder);
	    DET.setDetailDataWidth(mapItem, scale);
	    mapItem.currentCol = mapItem.selectedStart;
	}

	if (!restoreInfo) {
	    setDataViewSize (mapItem, "column", DET.SIZE_NORMAL_MODE);
	    if ((previousMode=='RIBBONV') || (previousMode == 'RIBBONV_DETAIL') || (previousMode == 'FULL_MAP')) {
		if (previousMode == 'FULL_MAP') {
		    DET.setDetailDataHeight(mapItem,DET.zoomBoxSizes[0]);
		} else {
		    DET.setDetailDataHeight(mapItem,prevWidth);
		}
		mapItem.currentRow = mapItem.saveRow;
	    }

	    //On some maps, one view (e.g. ribbon view) can show bigger data areas than will fit for other view modes.  If so, zoom back out to find a workable zoom level.
	    const numDetailRows = mapItem.heatMap.getNumRows (MAPREP.DETAIL_LEVEL);
	    const dataViewSize = mapItem.dataViewHeight - DET.dataViewBorder;
	    while (Math.floor(dataViewSize / DET.zoomBoxSizes[DET.zoomBoxSizes.indexOf(mapItem.dataBoxHeight)]) > numDetailRows) {
		DET.setDetailDataHeight(mapItem,DET.zoomBoxSizes[DET.zoomBoxSizes.indexOf(mapItem.dataBoxHeight)+1]);
	    }
	}

	DVW.checkRow(mapItem);

	setCanvasDimensions (mapItem);
	DET.detInitGl(mapItem);
	mapItem.updateSelection();
    };

    /**********************************************************************************
     * FUNCTION - detailVRibbon: The purpose of this function is to change the view for
     * a given heat map panel to vertical ribbon view.  Note there is a standard full
     * ribbon view and also a sub-selection ribbon view if the user clicks on the dendrogram.
     * If a dendrogram selection is in effect, then selectedStart and selectedStop will be set.
     *
     * restoreInfo is set when restoring view from a saved state.  In this, the view's mode
     * abd related state will be set to the desired values and the role of this function is
     * to create the view in the correct mode.
     *
     * If restoreInfo is not set, we are changing from another mode.  We need to set the corrrect
     * view mode and related state as well as switching the view to the correct mode.
     *
     **********************************************************************************/
    DET.detailVRibbon = function (mapItem, restoreInfo) {
	UHM.hlpC();
	const previousMode = mapItem.mode;
	const prevHeight = mapItem.dataBoxHeight;
	mapItem.saveRow = mapItem.currentRow;

	if (!restoreInfo) DVW.setMode(mapItem, 'RIBBONV');
	mapItem.setButtons();

	// If normal (full) ribbon, set the width of the detail display to the size of the horizontal ribbon view
	// and data size to 1.
	if (mapItem.selectedStart == null || mapItem.selectedStart == 0) {
	    const numRibbonRows = mapItem.heatMap.getNumRows (MAPREP.RIBBON_VERT_LEVEL);
	    let ddh = 1;
	    while (ddh*numRibbonRows < 250 - DET.dataViewBorder) { // make the height taller to prevent blurry/big dendros for smaller maps
		ddh += ddh;
	    }
	    DET.setDataViewSize (mapItem, "column", ddh*numRibbonRows + DET.dataViewBorder);
	    DET.setDetailDataHeight(mapItem,ddh);
	    mapItem.currentRow = 1;
	} else {
	    mapItem.saveRow = mapItem.selectedStart;
	    let selectionSize = mapItem.selectedStop - mapItem.selectedStart + 1;
	    if (selectionSize < 500) {
		DVW.setMode(mapItem, 'RIBBONV_DETAIL');
	    } else {
		const rvRate = mapItem.heatMap.getRowSummaryRatio(MAPREP.RIBBON_VERT_LEVEL);
		selectionSize = Math.floor(selectionSize / rvRate);
	    }
	    const height = Math.max(1, Math.floor(500/selectionSize));
	    setDataViewSize (mapItem, "column", (selectionSize * height) + DET.dataViewBorder);
	    DET.setDetailDataHeight(mapItem, height);
	    mapItem.currentRow = mapItem.selectedStart;
	}

	if (!restoreInfo) {
	    setDataViewSize (mapItem, "row", DET.SIZE_NORMAL_MODE);
	    if ((previousMode=='RIBBONH') || (previousMode=='RIBBONH_DETAIL') || (previousMode == 'FULL_MAP')) {
		if (previousMode == 'FULL_MAP') {
		    DET.setDetailDataWidth(mapItem, DET.zoomBoxSizes[0]);
		} else {
		    DET.setDetailDataWidth(mapItem, prevHeight);
		}
		mapItem.currentCol = mapItem.saveCol;
	    }

	    //On some maps, one view (e.g. ribbon view) can show bigger data areas than will fit for other view modes.  If so, zoom back out to find a workable zoom level.
	    const numDetailColumns = mapItem.heatMap.getNumColumns (MAPREP.DETAIL_LEVEL);
	    while (Math.floor((mapItem.dataViewWidth-DET.dataViewBorder)/DET.zoomBoxSizes[DET.zoomBoxSizes.indexOf(mapItem.dataBoxWidth)]) > numDetailColumns) {
		DET.setDetailDataWidth(mapItem,DET.zoomBoxSizes[DET.zoomBoxSizes.indexOf(mapItem.dataBoxWidth)+1]);
	    }
	}

	DVW.checkCol(mapItem);

	setCanvasDimensions (mapItem);
	DET.detInitGl(mapItem);
	mapItem.updateSelection();
	try {
	    const viewport = document.getElementById ("viewport");
	    if (viewport) {
		// In case viewport element is missing in widgetized applications.
		viewport.setAttribute("content", "height=device-height");
		viewport.setAttribute("content", "");
	    }
	} catch(err) {
	    console.error("Unable to adjust viewport content attribute");
	}
    };

    /**********************************************************************************
     * FUNCTION - detailNormal: The purpose of this function is to handle all of
     * the processing necessary to return a heat map panel to normal mode.
     * mapItem is the detail view map item.
     **********************************************************************************/
    DET.detailNormal = function (mapItem, restoreInfo) {
	UHM.hlpC();
	const previousMode = mapItem.mode;
	DVW.setMode(mapItem,'NORMAL');
	mapItem.setButtons();
	if (!restoreInfo) {
	    setDataViewSize (mapItem, "column", DET.SIZE_NORMAL_MODE);
	    setDataViewSize (mapItem, "row", DET.SIZE_NORMAL_MODE);
	    if ((previousMode=='RIBBONV') || (previousMode=='RIBBONV_DETAIL')) {
		DET.setDetailDataSize(mapItem, mapItem.dataBoxWidth);
	    } else if ((previousMode=='RIBBONH') || (previousMode=='RIBBONH_DETAIL')) {
		DET.setDetailDataSize(mapItem,mapItem.dataBoxHeight);
	    } else if (previousMode=='FULL_MAP') {
		DET.setDetailDataSize(mapItem,DET.zoomBoxSizes[0]);
	    }

	    //On some maps, one view (e.g. ribbon view) can show bigger data areas than will fit for other view modes.  If so, zoom back out to find a workable zoom level.
	    const numDetailRows = mapItem.heatMap.getNumRows (MAPREP.DETAIL_LEVEL);
	    const numDetailColumns = mapItem.heatMap.getNumColumns (MAPREP.DETAIL_LEVEL);
	    while ((Math.floor((mapItem.dataViewHeight-DET.dataViewBorder)/DET.zoomBoxSizes[DET.zoomBoxSizes.indexOf(mapItem.dataBoxHeight)]) > numDetailRows) ||
	       (Math.floor((mapItem.dataViewWidth-DET.dataViewBorder)/DET.zoomBoxSizes[DET.zoomBoxSizes.indexOf(mapItem.dataBoxWidth)]) > numDetailColumns)) {
		DET.setDetailDataSize(mapItem, DET.zoomBoxSizes[DET.zoomBoxSizes.indexOf(mapItem.dataBoxWidth)+1]);
	    }

	    if ((previousMode=='RIBBONV') || (previousMode=='RIBBONV_DETAIL')) {
		mapItem.currentRow = mapItem.saveRow;
	    } else if ((previousMode=='RIBBONH') || (previousMode=='RIBBONH_DETAIL')) {
		mapItem.currentCol = mapItem.saveCol;
	    } else if (previousMode=='FULL_MAP') {
		mapItem.currentRow = mapItem.saveRow;
		mapItem.currentCol = mapItem.saveCol;
	    }
	}

	DVW.checkRow(mapItem);
	DVW.checkCol(mapItem);

	setCanvasDimensions (mapItem);
	DET.detInitGl(mapItem);
	clearDendroSelection(mapItem);
	mapItem.updateSelection();
	try {
	    const viewport = document.getElementById ("viewport");
	    if (viewport) {
		// In case viewport element is missing in widgetized applications.
		viewport.setAttribute("content", "height=device-height");
		viewport.setAttribute("content", "");
	    }
	} catch(err) {
	    console.error("Unable to adjust viewport content attribute");
	}
    };

    DET.clearDendroSelection = clearDendroSelection;
    /* Clear any dendrogram selection / restricted region for the
     * specified mapItem.
     * If mapItem is the current primary map, also clear any selection
     * on the dendrograms of the summary map.
     */
    function clearDendroSelection (mapItem) {
	if (mapItem.selectedStart != 0) {
	    mapItem.selectedStart = 0;
	    mapItem.selectedStop = 0;
	    mapItem.selectedIsDendrogram = false;
	    if (mapItem == DVW.primaryMap) {
		SUM.rowDendro.clearSelectedRegion();
		SUM.colDendro.clearSelectedRegion();
		if (!DVW.isSub) {
		    if (mapItem.heatMap.showRowDendrogram("summary")) {
			    SUM.rowDendro.draw();
		    }
		    if (mapItem.heatMap.showColDendrogram("summary")) {
			    SUM.colDendro.draw();
		    }
		}
	    }
	}
    }

    /*********************************************************************************************
     * FUNCTION: restoreFromSavedState  -  Restore detail view from saved state.
     *********************************************************************************************/
    DET.restoreFromSavedState = function (mapItem, savedState) {
	mapItem.currentCol = savedState.currentCol;
	mapItem.currentRow = savedState.currentRow;
	DET.setDataViewSize (mapItem, "row", savedState.dataViewWidth + DET.dataViewBorder);
	DET.setDataViewSize (mapItem, "column", savedState.dataViewHeight + DET.dataViewBorder);
	mapItem.dataBoxHeight = savedState.dataBoxHeight;
	mapItem.dataBoxWidth = savedState.dataBoxWidth;
	mapItem.dataPerCol = savedState.dataPerCol;
	mapItem.dataPerRow = savedState.dataPerRow;
	mapItem.mode = savedState.mode;
	mapItem.subDendroMode = savedState.subDendroMode || "none";
	mapItem.selectedStart = savedState.selectedStart || 0;
	mapItem.selectedStop = savedState.selectedStop || 0;
	mapItem.selectedIsDendrogram = savedState.selectedIsDendrogram || false;
	// RESTORE CANVAS SIZE
	let zoomBoxSizeIdx = DET.zoomBoxSizes.indexOf(savedState.dataBoxWidth);
	switch (savedState.mode) {
	    case "RIBBONV":
	    case "RIBBONV_DETAIL":
		DET.detailVRibbon(mapItem, {});
		break;
	    case "RIBBONH":
	    case "RIBBONH_DETAIL":
		DET.detailHRibbon(mapItem, {});
		break;
	    case "FULL_MAP":
		DET.detailFullMap(mapItem);
		break;
	    case "NORMAL":
	    default: // Fall through. Use the 'NORMAL' case for unknown modes.
		DET.setDetailDataSize(mapItem, DET.zoomBoxSizes[zoomBoxSizeIdx]);
		DET.detailNormal (mapItem, {});
	};
    };

//----------------------------------------------------------------------------------------------//
//----------------------------------------------------------------------------------------------//
//BEGIN SELECTION BOX DETAIL DISPLAY FUNCTIONS
//----------------------------------------------------------------------------------------------//
//----------------------------------------------------------------------------------------------//
(function() {

    /*********************************************************************************************
     * FUNCTION:  drawSelections - This function calls a function that will generate 2 arrays
     * containing the contiguous search ranges (row/col).  It then iterates thru those arrays
     * that users have selected and calls the function that will draw line OR boxes on the
     * heatMap detail box canvas.  If either of the 2 arrays is empty, lines will be drawn
     * otherwise boxes.
     *********************************************************************************************/

    /* IIFE-scoped variables. */

    const debug = false;
    const mapItemVars = {}; /* Variables that depend on the current map item. */

    DET.drawSelections = function drawSelections () {
	DVW.detailMaps.forEach (DET.drawMapItemSelectionsOnScreen);
    };

    // Need to export outside the IIFE.
    // The function draws the detail map selections on the mapItem's boxCanvas.
    DET.drawMapItemSelectionsOnScreen = drawMapItemSelectionsOnScreen;
    function drawMapItemSelectionsOnScreen (mapItem) {
	drawMapItemSelectionsOnTarget (mapItem, {
	    // Width and height of the target:
	    width: mapItem.boxCanvas.width,
	    height: mapItem.boxCanvas.height,
	    // Scaling to apply to mapItem
	    widthScale: 1,
	    heightScale: 1,
	    // Context-like output device.
	    ctx: mapItem.boxCanvas.getContext("2d"),
	});
    }

    /* This function draws a thin black line around the entire detail map
     * and thicker selection color lines around any selection rectangles
     * visible in that detail map.
     *
     * The second parameter specifies the canvas-like target onto which
     * the rectangles are drawn as well as some additional properties
     * associated with it.
     */
    DET.drawMapItemSelectionsOnTarget = drawMapItemSelectionsOnTarget;
    function drawMapItemSelectionsOnTarget (mapItem, target) {

	// Retrieve contiguous row and column search arrays
	const searchRows = SRCHSTATE.getAxisSearchResults("Row");
	const rowRanges = UTIL.getContigRanges(searchRows);
	const searchCols = SRCHSTATE.getAxisSearchResults("Column");
	const colRanges = UTIL.getContigRanges(searchCols);

	// Get context for this detail map.
	const dataLayers = mapItem.heatMap.getDataLayers();
	const mapNumRows = mapItem.heatMap.getNumRows('d');
	const mapNumCols = mapItem.heatMap.getNumColumns('d');

	// Get total row and column bar "heights".

	mapItemVars.ctx = target.ctx;
	calcMapItemVariables (mapItem, target);

	// Clear entire target canvas.
	target.ctx.clearRect(0, 0, target.width, target.height);

	// Draw the border
	if (!mapItem.heatMap.hasGaps()) {
	    // Determine total width and height of map and covariate bars in canvas coordinates.
	    const canH = mapItem.dataViewHeight + mapItemVars.totalColBarHeight;
	    const canW = mapItem.dataViewWidth + mapItemVars.totalRowBarHeight;
	    // Determine top-left of map only in target coordinates.
	    const boxX = (mapItemVars.totalRowBarHeight / canW) * target.width;
	    const boxY = (mapItemVars.totalColBarHeight / canH) * target.height;
	    // Determine width and height of map only in target coordinates.
	    const boxW = target.width-boxX;
	    const boxH = target.height-boxY;
	    // Draw the map border.
	    target.ctx.lineWidth= Math.min (target.widthScale, target.heightScale);
	    target.ctx.strokeStyle="#000000";
	    target.ctx.strokeRect(boxX,boxY,boxW,boxH);
	}
	
	if (rowRanges.length > 0 || colRanges.length > 0) {
		// Retrieve the selection color for and set the context for coloring the selection boxes.
		const dataLayer = dataLayers[mapItem.heatMap._currentDl];
		mapItemVars.ctx.lineWidth = 3 * Math.min (target.widthScale, target.heightScale);
		mapItemVars.ctx.strokeStyle = dataLayer.selection_color;

		if (rowRanges.length === 0) {
			//Draw vertical lines across entire heatMap
			const topY = mapItemVars.topY;
			const bottom = target.height;
			calcVisColRanges (colRanges, target.widthScale, mapItem).forEach(([left, right]) => {
				drawSearchBox(mapItem, topY, bottom, left, right);
			});
		} else if (colRanges.length === 0) {
			//Draw horizontal lines across entire heatMap
			const left = mapItemVars.topX;
			const right = target.width;
			calcVisRowRanges (rowRanges, target.heightScale, mapItem).forEach(([topY,bottom]) => {
				drawSearchBox(mapItem, topY, bottom, left, right);
			});
		} else {
			//Draw discrete selection boxes on heatMap
			const visColRanges = calcVisColRanges (colRanges, target.widthScale, mapItem);
			if (visColRanges.length > 0) {
				calcVisRowRanges (rowRanges, target.heightScale, mapItem).forEach(([topY,bottom]) => {
					visColRanges.forEach(([left, right]) => {
						drawSearchBox(mapItem,topY,bottom,left,right);
					});
				});
			}
		}
	}
	if (debug) {
		const elapsedTime = Math.round(10*(performance.now() - mapItemVars.start))/10;
		console.log ("Detail map ", k+1, ": Drew ", mapItemVars.strokes, " boxes in ", elapsedTime, " ms.");
	}
	delete mapItemVars.ctx;   // Remove reference to the context.
	return mapItemVars;
    }

    /**********************************************************************************
     * FUNCTION calcMapItemVariables. Calculate variables that depend on the mapItem but
     * not the current search box.
     **********************************************************************************/
    function calcMapItemVariables (mapItem, target) {

	mapItemVars.target = target;
	mapItemVars.ctx = target.ctx;

	// in mapItem coordinates:
	mapItemVars.totalRowBarHeight = mapItem.getScaledVisibleCovariates("row").totalHeight();
	mapItemVars.totalColBarHeight = mapItem.getScaledVisibleCovariates("column").totalHeight();

	//top-left corner of visible area
	// in target coordinates:
	mapItemVars.topX = ((mapItemVars.totalRowBarHeight / mapItem.canvas.width) * target.width);
	mapItemVars.topY = ((mapItemVars.totalColBarHeight / mapItem.canvas.height) * target.height);
	
	//height/width of heat map rectangle in pixels
	// in target coordinates:
	mapItemVars.mapXWidth = target.width - mapItemVars.topX;
	mapItemVars.mapYHeight = target.height - mapItemVars.topY;

	// width of a data cell in pixels
	// in target coordinates:
	if (mapItem.mode === 'NORMAL' || mapItem.mode === 'RIBBONV') {
		mapItemVars.cellWidth = mapItemVars.mapXWidth / (DVW.getCurrentDetDataPerRow(mapItem) * target.widthScale);
	} else {
		mapItemVars.cellWidth = mapItemVars.mapXWidth / (mapItem.dataPerRow * target.widthScale);
	}
	mapItemVars.maxColFontSize = 0.95 * mapItemVars.cellWidth;

	// height of a data cell in pixels
	// in target coordinates:
	if (mapItem.mode === 'NORMAL' || mapItem.mode === 'RIBBONH') {
		mapItemVars.cellHeight = mapItemVars.mapYHeight / (DVW.getCurrentDetDataPerCol(mapItem) * target.heightScale);
	} else {
		mapItemVars.cellHeight = mapItemVars.mapYHeight / (mapItem.dataPerCol * target.heightScale);
	}
	mapItemVars.maxRowFontSize = 0.95 * mapItemVars.cellHeight;

	if (debug) {
		mapItemVars.strokes = 0;
		mapItemVars.start = performance.now();
	}
    }

    /**********************************************************************************
     * FUNCTION - calcVisRanges: Convert selectionRanges into visibleRanges
     *
     * Parameters:
     * axis : the axis concerned
     * ranges : an array of selectionRanges
     * currentPosn : start coordinate of the current view for the specified axis
     *
     * These three in target coordinates:
     * viewportStart : top/left pixel of the viewport
     * viewportEnd : bottom/right pixel of the viewport
     * cellSize : number of pixels in a cell
     *
     * Output:
     * an array of visible pixel ranges (each an array of two target coordinate values)
     *
     * Only at least partially visible ranges are included in the output array.
     *
     **********************************************************************************/
    function calcVisRanges (axis, ranges, currentPosn, viewScale, viewportStart, viewportEnd, cellSize) {
	const visRanges = [];
	ranges.forEach (([selStart,selEnd]) => {
	    const adjustedStart = (selStart - currentPosn)*cellSize*viewScale;
	    const adjustedEnd = ((selEnd - selStart)+1)*cellSize*viewScale;
	    const boxStart = viewportStart+adjustedStart;
	    const boxEnd = boxStart+adjustedEnd;
	    if (boxStart < viewportEnd && boxEnd > viewportStart) {
		visRanges.push([boxStart, boxEnd]);
	    }
	});
	if (debug) console.log ("Found ", visRanges.length, " visible ", axis, " ranges");
	return visRanges;
    }

    /**********************************************************************************
     * FUNCTION - calcVisColRanges: Convert column selectionRanges into column visibleRanges
     */
    function calcVisColRanges (ranges, widthScale, mapItem) {
	return calcVisRanges ("column", ranges, mapItem.currentCol, widthScale, mapItemVars.topX, mapItemVars.target.width, mapItemVars.cellWidth);
    }

    /**********************************************************************************
     * FUNCTION - calcVisRowRanges: Convert row selectionRanges into row visibleRanges
     */
    function calcVisRowRanges (ranges, heightScale, mapItem) {
	return calcVisRanges ("row", ranges, mapItem.currentRow, heightScale, mapItemVars.topY, mapItemVars.target.height, mapItemVars.cellHeight);
    }

    /**********************************************************************************
     * FUNCTION - drawSearchBox: The purpose of this function is to draw the search
     * box on a given heat map panel.
     * At least one edge of the box should be visible.
     * boxY: top edge
     * boxY2: bottom edge
     * boxX; left edge
     * boxX2: right edge
     **********************************************************************************/
    function drawSearchBox (mapItem, boxY, boxY2, boxX, boxX2) {

	mapItemVars.ctx.beginPath();

	// draw top horizontal line
	if (isHorizLineVisible(boxY)) {
		drawHorizLine(boxX, boxX2, boxY);
	}
	// draw left side line
	if (isVertLineVisible(boxX)) {
		drawVertLine(boxY, boxY2, boxX);
	}
	// draw bottom line
	if (isHorizLineVisible(boxY2)) {
		drawHorizLine(boxX, boxX2, boxY2);
	}
	// draw right side line
	if (isVertLineVisible(boxX2)) {
		drawVertLine(boxY, boxY2, boxX2);
	}

	// Stroke the path.
	if (debug) mapItemVars.strokes++;
	mapItemVars.ctx.stroke();

	/*********************************************************************************************
	 * FUNCTIONS:  isHorizLineVisible AND isVertLineVisible
	 *
	 * These functions check the position of a horizontal/vertical line to see if it is currently
	 * visible in the detail viewport.
	 *********************************************************************************************/
	function isHorizLineVisible (boxY) {
	    return (boxY >= mapItemVars.topY) && (boxY <= mapItemVars.target.height);
	}

	function isVertLineVisible (boxX) {
	    return (boxX >= mapItemVars.topX) && (boxX <= mapItemVars.target.width);
	}

	/**********************************************************************************
	 * FUNCTION - drawHorizLine: The purpose of this function is to draw a search
	 * box horizontal line on a given heat map panel.
	 **********************************************************************************/
	function drawHorizLine (boxX, boxX2, boxY) {
	    const topX = mapItemVars.topX;
	    const lineStart = boxX >= topX ? boxX : topX;
	    const lineEnd = boxX2 >= topX ? boxX2 : topX;
	    if (lineStart !== lineEnd) {
		    strokeLine(lineStart,boxY,lineEnd, boxY);
	    }
	}

	/**********************************************************************************
	 * FUNCTION - drawVertLine: The purpose of this function is to draw a search
	 * box vertical line on a given heat map panel.
	 **********************************************************************************/
	function drawVertLine (boxY, boxY2, boxX) {
	    const topY = mapItemVars.topY;
	    const lineStart = boxY >= topY ? boxY : topY;
	    const lineEnd = boxY2 >= topY ? boxY2 : topY;
	    if (lineStart !== lineEnd) {
		    strokeLine(boxX,lineStart,boxX, lineEnd);
	    }
	}

	/**********************************************************************************
	 * FUNCTION - strokeLine: This function draws a line on the target.
	 **********************************************************************************/
	function strokeLine (fromX, fromY, toX, toY) {
	    mapItemVars.ctx.moveTo(fromX, fromY);
	    mapItemVars.ctx.lineTo(toX, toY);
	}
    }
})();
//END SELECTION BOX DETAIL DISPLAY FUNCTIONS

//----------------------------------------------------------------------------------------------//
//----------------------------------------------------------------------------------------------//
//BEGIN LABEL DETAIL DISPLAY FUNCTIONS
//----------------------------------------------------------------------------------------------//
//----------------------------------------------------------------------------------------------//

    /************************************************************************************************
     * FUNCTION - sizeCanvasForLabels: Resize the row heat map canvas for the specified
     * heat map panel instance.  It sets the sizes of the main canvas, the box canvas, and the
     * row/col lavel DIVs. It calculates and adjusts the size of the detail canvas and box canvas
     * in order to best accommodate the maximum label sizes for each axis.
     ************************************************************************************************/
    function sizeCanvasForLabels (mapItem) {
	resetLabelLengths(mapItem);
	if (mapItem.pane !== "") {  //Used by builder which does not contain the detail pane necessary, nor the use, for this logic
	    calcRowAndColLabels(mapItem);
	    calcClassRowAndColLabels(mapItem);
	    setViewPort(mapItem);
	}
    }

    /************************************************************************************************
     * FUNCTION - setViewPort: This function resizes the heat map, row label, and column label
     * canvases for mapItem (an open detail heat map panel).
     * It sets the sizes of the main canvas, the box canvas, and the row/col label DIVs.
     ************************************************************************************************/
    function setViewPort (mapItem) {
	const detPane = PANE.findPaneLocation (mapItem.chm);

	//Get available width/height
	const dFullW = detPane.pane.clientWidth;
	const dFullH = detPane.pane.clientHeight - detPane.paneHeader.offsetHeight;

	let left = 0;
	if ((mapItem.rowDendro !== null) && (mapItem.rowDendro !== undefined)) {
		left = mapItem.rowDendro.getDivWidth();
	}
	let top = 0;
	if ((mapItem.colDendro !== null) && (mapItem.colDendro !== undefined)) {
		top = mapItem.colDendro.getDivHeight();
	}

	//Set sizes of canvas and boxCanvas based upon width, label, and an offset for whitespace
	const heatmapVP = {
		top, left,
		width: dFullW - (mapItem.rowLabelLen + 10) - left,
		height: dFullH - (mapItem.colLabelLen + 10) - top
	};
	UTIL.setElementPositionSize (mapItem.canvas, heatmapVP, true);
	UTIL.setElementPositionSize (mapItem.boxCanvas, heatmapVP, true);

	// Set sizes for the label divs
	const rowLabelVP = {
		top: mapItem.chm.offsetTop,
		left: mapItem.canvas.offsetLeft + mapItem.canvas.clientWidth,
		width: dFullW - mapItem.canvas.offsetLeft - mapItem.canvas.offsetWidth,
		height: dFullH - (mapItem.colLabelLen + 15)
	};
	UTIL.setElementPositionSize (document.getElementById(mapItem.rowLabelDiv), rowLabelVP, true);

	const heightCalc = dFullH - mapItem.canvas.offsetTop - mapItem.canvas.offsetHeight;
	const colLabelVP = {
		top: mapItem.canvas.offsetTop + mapItem.canvas.offsetHeight,
		left: 0,
		width: dFullW - (mapItem.rowLabelLen + 10),
		height:  heightCalc === 0 ? 11 : heightCalc
	};
	UTIL.setElementPositionSize (document.getElementById(mapItem.colLabelDiv), colLabelVP, true);
    }

    /************************************************************************************************
     * FUNCTION - calcRowAndColLabels: This function determines if labels are to be drawn on each
     * axis and calls the appropriate function to calculate the maximum label size for each axis.
     ************************************************************************************************/
    function calcRowAndColLabels (mapItem) {
	mapItem.rowLabelFont = calcAxisLabelFontSize(mapItem, "row");
	mapItem.colLabelFont = calcAxisLabelFontSize(mapItem, "column");
	let fontSize;
	if (mapItem.rowLabelFont >= UTIL.minLabelSize && mapItem.colLabelFont >= UTIL.minLabelSize){
		fontSize = Math.min(mapItem.colLabelFont,mapItem.rowLabelFont);
		calcAxisLabelsLen(mapItem, "column", fontSize);
		calcAxisLabelsLen(mapItem, "row", fontSize);
	} else if (mapItem.rowLabelFont >= UTIL.minLabelSize){
		calcAxisLabelsLen(mapItem, "row", mapItem.rowLabelFont);
	} else if (mapItem.colLabelFont >= UTIL.minLabelSize){
		calcAxisLabelsLen(mapItem, "column", mapItem.colLabelFont);
	}
    }

    /************************************************************************************************
     * FUNCTION - calcClassRowAndColLabels: This function calls the functions necessary to calculate
     * the maximum row/col class bar label sizes and update maximum label size variables (if necessary)
     ************************************************************************************************/
    function calcClassRowAndColLabels (mapItem) {
	calcCovariateBarLabels(mapItem, "row");
	calcCovariateBarLabels(mapItem, "column");
    }

    /************************************************************************************************
     * FUNCTION - calcCovariateBarLabels: This function calculates the maximum size of all covariate
     * bar labels for the specified axis and updates the map item's labelLen for the axis if the value
     * of any label exceeds the existing maximum.
     ************************************************************************************************/
    function calcCovariateBarLabels (mapItem, axis) {
	const bars = mapItem.getScaledVisibleCovariates (axis);
	if (bars.length > 0) {
	    const barLabelFont = calcCovariateBarLabelFont (mapItem, axis, bars);
	    mapItem.setCovariateBarLabelFont (axis, barLabelFont);
	    if ((barLabelFont > 0)  && (barLabelFont < DET.maxLabelSize)) {
		const otherAxis = MMGR.isRow (axis) ? "COL" : "ROW";
		const legendText = bars.containsLegend() ? "XXX" : "";
		bars.forEach (bar => {
		    addTmpLabelForSizeCalc(mapItem, legendText + MMGR.getLabelText(bar.label, otherAxis), barLabelFont);
		});
		calcLabelDiv(mapItem, otherAxis);
	    }	
	}
    }

    /************************************************************************************************
     * FUNCTION - calcCovariateBarLabelFont: This function calculates the font size of the
     * smallest visible covariate bar labels on the specified axis.  Returns 0 if none are
     * visible.
     ************************************************************************************************/
    function calcCovariateBarLabelFont (mapItem, axis, bars) {
	// For the specified axis, determine the scaling factor between the mapItem's canvas size in canvas
	// coordinates and its size in CSS coordinates.
	let scale;
	if (MMGR.isRow(axis)) {
	    scale =  mapItem.canvas.clientWidth / (mapItem.dataViewWidth + bars.totalHeight());
	} else {
	    scale =  mapItem.canvas.clientHeight / (mapItem.dataViewHeight + bars.totalHeight());
	}

	// For each bar, determine the largest font size that can be used for that bar.
	// Find the smallest of those fonts that are larger than the minimum font size.
	// Bar labels will not be drawn for bars that are <= the minimum font size.
	let minFont = 999;
	bars.forEach (classBar => {
	    const fontSize = Math.min(((classBar.height - DET.paddingHeight) * scale) - 1, 10);
	    if ((fontSize > UTIL.minLabelSize) && (fontSize < minFont)) {
		minFont = fontSize;
	    }
	});
	return minFont === 999 ? 0 : minFont;
    }

    /************************************************************************************************
     * FUNCTION - addTmpLabelForSizeCalc: This function adds an entry to tmpLabelSizeElements for the
     * specified text and fontSize.  If the combination of text and fontSize has not been seen before,
     * a pool label element for performing the width calculation is also created.
     ************************************************************************************************/
    function addTmpLabelForSizeCalc (mapItem, text, fontSize) {
	 const key = text + fontSize.toString();
	 if (mapItem.labelSizeCache.hasOwnProperty(key)) {
	     mapItem.tmpLabelSizeElements.push({ key, el: null });
	    } else {
		 // Haven't seen this combination of font and fontSize before.
		 // Set the contents of our label size div and calculate its width.
		    const el = getPoolElement(mapItem);
		    el.style.fontSize = fontSize.toString() +'pt';
		    el.innerText = text;
		    mapItem.labelElement.appendChild(el);
		    mapItem.tmpLabelSizeElements.push({ key, el });
	 }
    }

    /************************************************************************************************
     * FUNCTION - getPoolElement: This function gets a labelSizeWidthCalc div from the pool if possible.
     * Otherwise create and return a new pool element.
     ************************************************************************************************/
     function getPoolElement (mapItem) {
	if (mapItem.labelSizeWidthCalcPool.length > 0) {
	    return mapItem.labelSizeWidthCalcPool.pop();
	} else {
	    const div = document.createElement('div');
	    div.className = 'DynamicLabel';
	    div.style.position = "absolute";
	    div.style.fontFamily = 'sans-serif';
	    div.style.fontWeight = 'bold';
	    return div;
	}
    }

    /************************************************************************************************
     * FUNCTION - calcAxisLabelsLen: This function calculates the maximum label length (in CSS coordinates)
     * for the current labels on the specified axis.
     ************************************************************************************************/
    function calcAxisLabelsLen (mapItem, axis, fontSize) {
	// Calculate the sizes (in canvas coordinates) of the dendrogram, covariate bars, and map.
	const otherAxis = MMGR.isRow (axis) ? "column" : "row";
	const barsHeight = mapItem.getScaledVisibleCovariates(otherAxis).totalHeight();
	const mapSize = MMGR.isRow (axis) ? mapItem.dataViewHeight : mapItem.dataViewWidth;

	// Determine the fraction of the canvas used by the map.
	const mapFraction = mapSize / (mapSize + barsHeight);

	// Determine the space available for each label by dividing the client size (in CSS coordinates) by the number
	// of labels.
	const clientSize = MMGR.isRow (axis) ? mapItem.canvas.clientHeight : mapItem.canvas.clientWidth;
	const numLabels = MMGR.isRow (axis) ? mapItem.dataPerCol : mapItem.dataPerRow;
	const skip = clientSize * mapFraction / numLabels;

	if (skip > UTIL.minLabelSize) {
	    const firstLabel = MMGR.isRow (axis) ? mapItem.currentRow : mapItem.currentCol;
	    const shownLabels = MMGR.getShownLabels(axis);
	    for (let i = firstLabel; i < firstLabel + numLabels; i++) {
		addTmpLabelForSizeCalc(mapItem, shownLabels[i-1], fontSize);
	    }
	    calcLabelDiv(mapItem, axis);
	}
    }

    /************************************************************************************************
     * FUNCTION - calcLabelDiv: This function assesses the size of the entries that have been added
     * to tmpLabelSizeElements and increases the row/col label length if the longest label is longer
     * than those already processed. rowLabelLen and colLabelLen are used to size the detail screen
     * to accommodate labels on both axes.
     ************************************************************************************************/
    function calcLabelDiv (mapItem, axis) {
	    let maxLen = MMGR.isRow (axis) ? mapItem.rowLabelLen : mapItem.colLabelLen;
	    let w;

	    for (let ii = 0; ii < mapItem.tmpLabelSizeElements.length; ii++) {
		    const { key, el } = mapItem.tmpLabelSizeElements[ii];
		    if (el === null) {
			    w = mapItem.labelSizeCache[key];
		    } else {
			    mapItem.labelSizeCache[key] = w = el.clientWidth;
		    }
		    if (w > 1000) {
			    console.log('Ridiculous label length ' + w + ' ' + key);
		    }
		    if (w > maxLen) {
			    maxLen = w;
		    }
	    }
	    if (MMGR.isRow(axis)) {
		    if (maxLen > mapItem.rowLabelLen) mapItem.rowLabelLen = maxLen;
	    } else {
		    if (maxLen > mapItem.colLabelLen) mapItem.colLabelLen = maxLen;
	    }
	    // Remove and return tmp label divs to the pool.
	    while (mapItem.tmpLabelSizeElements.length > 0) {
		    const { key, el } = mapItem.tmpLabelSizeElements.pop();
		    if (el) {
			    mapItem.labelElement.removeChild(el);
			    mapItem.labelSizeWidthCalcPool.push (el);
		    }
	    }
    }

    /************************************************************************************************
     * FUNCTION - calcAxisLabelFontSize: This function calculates the font size to be used for matrix
     * labels on the specified axis of mapItem.
     *
     * The space for labels is the size of the data matrix in CSS coordinates.  To get the label font
     * size, we divide the space for labels in CSS cordinates by the number of labels and subtract 2
     * (so that there's some space between the labels).
     *
     * Calculating the space for labels in CSS coordinates is tricky since the data view size, dendrogram
     * size, and covariate bar sizes are all in canvas coordinates.
     *
     * To calculate the space for labels we multiply the total size in CSS coordinates (canvas.clientWidth
     * or canvas.clientHeight) by the proportion of the total space used by the data view.
     *
     ************************************************************************************************/
    const fontSizeMap = new Map();
    function calcAxisLabelFontSize (mapItem, axis) {
	// Determine the sizes of the three view components: data view, dendrogram, and covariate bars.
	const dataViewSize = MMGR.isRow (axis) ? mapItem.dataViewHeight : mapItem.dataViewWidth;
	const otherAxis = MMGR.isRow (axis) ? "column" : "row";
	const barsHeight = mapItem.getScaledVisibleCovariates(otherAxis).totalHeight();

	// Determine proportion of total space used just by the data view.
	const mapFraction = dataViewSize / (dataViewSize + barsHeight);

	// Determine font size from CSS size of map, map fraction used by data view, and number of labels.
	const numLabels = MMGR.isRow(axis) ? mapItem.dataPerCol : mapItem.dataPerRow;
	const clientSize = MMGR.isRow (axis) ? mapItem.canvas.clientHeight : mapItem.canvas.clientWidth;
	const skip = Math.floor(clientSize * mapFraction / numLabels); // Min space between labels.

	const targetSize = Math.min (DET.maxLabelSize, Math.max (UTIL.minLabelSize, skip));
	if (!fontSizeMap.has(targetSize)) {
	    // Find and memoize a font size that is exactly targetSize pixels high.
	    // Get and initialize a temporary element for determining label size.
	    const el = getPoolElement (mapItem);
	    el.innerText = 'Sp';
	    mapItem.labelElement.appendChild(el);
	    // Binary search to find the font size.
	    let high = DET.maxLabelSize;
	    let low = UTIL.minLabelSize / 2;
	    let mid;
	    for (let tries = 0; tries < 10; tries++) {
		mid = (low+high)/2;
		el.style.fontSize = mid.toFixed(2) +'pt';
		const testHeight = el.getBoundingClientRect().height;
		if (testHeight > targetSize) {
		    high = mid;
		} else if (testHeight < targetSize) {
		    low = mid;
		} else {
		    break;
		}
	    }
	    fontSizeMap.set (targetSize, +mid.toFixed(2));
	    // Return temporary element to pool.
	    mapItem.labelElement.removeChild(el);
	    mapItem.labelSizeWidthCalcPool.push (el);
	}
	return fontSizeMap.get (targetSize);
    }

    /************************************************************************************************
     * FUNCTION - updateDisplayedLabels: This function updates detail labels when the user scrolls or
     * zooms on the detail pane. The existing labels are first moved to oldLabelElements. Adding a
     * label will first check to see if the label element already exists in oldLabelElements and if
     * so update it and move it to labelElements. After all elements have been added/updated, any
     * remaining dynamic labels
     ************************************************************************************************/
    DET.updateDisplayedLabels = function () {
	DVW.detailMaps.forEach (updateMapItemLabels);
    };

    function updateMapItemLabels (mapItem) {
	if (!mapItem.isVisible()) {
	    return;
	}
	const debug = false;

	const prevNumLabels = Object.keys(mapItem.labelElements).length;
	mapItem.oldLabelElements = mapItem.labelElements;
	mapItem.labelElements = {};

	// Temporarily hide labelElement while we update labels.
	const oldDisplayStyle = mapItem.labelElement.style.display;
	mapItem.labelElement.style.setProperty('display', 'none');

	// Update existing labels / draw new labels.
	DET.detailDrawRowClassBarLabels(mapItem);
	DET.detailDrawColClassBarLabels(mapItem);
	DET.drawRowAndColLabels(mapItem);

	// Remove old dynamic labels that did not get updated.
	for (let oldEl in mapItem.oldLabelElements) {
		const e = mapItem.oldLabelElements[oldEl];
		if (e.div.classList.contains('DynamicLabel')) {
			if (e.parent.contains(e.div)) {
				e.parent.removeChild(e.div);
			}
		} else {
			// Move non-dynamic labels (e.g. missingCovariateBar indicators) to current labels.
			mapItem.labelElements[oldEl] = e;
			delete mapItem.oldLabelElements[oldEl];
		}
	}
	if (debug) {
		const currNumLabels = Object.keys(mapItem.labelElements).length;
		const numOldLabels = Object.keys(mapItem.oldLabelElements).length;
		console.log({ m: 'updateMapItemLabels', prevNumLabels, currNumLabels, numOldLabels });
	}
	mapItem.oldLabelElements = {};

	// Restore visibility of labelElement
	mapItem.labelElement.style.setProperty('display', oldDisplayStyle);
    }

/************************************************************************************************
 * FUNCTION - drawRowAndColLabels: This function determines if labels are to be drawn on each
 * axis and calls the appropriate function to draw those labels on the screen.
 ************************************************************************************************/
DET.drawRowAndColLabels = function (mapItem) {
	if (mapItem.rowLabelFont >= UTIL.minLabelSize && mapItem.colLabelFont >= UTIL.minLabelSize){
		const fontSize = Math.min(mapItem.colLabelFont,mapItem.rowLabelFont);
		drawAxisLabels (mapItem, "row", fontSize);
		drawAxisLabels (mapItem, "column", fontSize);
	} else if (mapItem.rowLabelFont >= UTIL.minLabelSize){
		drawAxisLabels (mapItem, "row", mapItem.rowLabelFont);
	} else if (mapItem.colLabelFont >= UTIL.minLabelSize){
		drawAxisLabels (mapItem, "column", mapItem.colLabelFont);
	}
}

    /************************************************************************************************
     * FUNCTION - drawAxisLabels: This function draws all axis labels for the specified axis of mapItem.
     *
     * Labels are drawn at absolute positions on a special labelElement DIV within the mapItem pane.
     *
     * To determine the correct position to draw the labels, we need to determine how to convert
     * label indices into label coordinates in CSS coordinates.
     *
     ************************************************************************************************/
    function drawAxisLabels (mapItem, axis, fontSize) {
	const isRow = MMGR.isRow (axis);

	// Determine the size (in canvas coordinates) of the map and the covariate bars.
	const otherAxis = isRow ? "column" : "row";
	const barsHeight = mapItem.getScaledVisibleCovariates(otherAxis).totalHeight();
	const mapSize = isRow ? mapItem.dataViewHeight : mapItem.dataViewWidth;

	// Determine the fraction of the map+dendrogram canvas used for the map.
	const mapFraction = mapSize / (mapSize + barsHeight);

	// Determine the space per map label, in CSS coordinates.
	const clientSize = isRow ? mapItem.canvas.clientHeight : mapItem.canvas.clientWidth;
	const numLabels = isRow ? mapItem.dataPerCol : mapItem.dataPerRow;
	const skip = clientSize * mapFraction / numLabels;
	
	if (skip > UTIL.minLabelSize) {
	    // Adjust for centering the label within its space.
	    const centerAdjust = Math.max ((skip - fontSize)/2, 0);
	    // Determine the size of the covariate bars in CSS coordinates.
	    const covariateBarsSize = clientSize * (1 - mapFraction);

	    // Determine base x & y coordinates for the labels.
	    // We start at the top left of the map+covariates canvas
	    // and adjust as needed depending on the axis.
	    let xBase = mapItem.canvas.offsetLeft;
	    let yBase = mapItem.canvas.offsetTop;
	    if (isRow) {
		// Position row labels to the right of the map and covariates canvas.
	        xBase += mapItem.canvas.clientWidth + 3;
		// Position row labels below the column covariate bars and try to center vertically.
	       	yBase += covariateBarsSize + centerAdjust - 2;
	    } else {
		// Position column labels to the right of the row covariate bars and try to center horizontally.
		xBase += covariateBarsSize + fontSize + centerAdjust + 3;
		// Position column labels below the map and covariates canvas.
		yBase += mapItem.canvas.clientHeight + 3;
	    }

	    // Calculate label independent constants.
	    const actualLabels = MMGR.getActualLabels(axis);
	    const shownLabels = MMGR.getShownLabels(axis);
	    const firstLabelIdx = isRow ? mapItem.currentRow : mapItem.currentCol;
	    const rotate = isRow ? 'F' : 'T';
	    const labelDivAxis = isRow ? "Row" : "Column"; // Must match SearchState.js/searchResults

	    // Add a LabelDiv for each label.
	    for (let i = 0; i < numLabels; i++) {
		const idx = i + firstLabelIdx;
		if (actualLabels[idx-1] !== undefined) { // an occasional problem in subdendro view
		    DET.addLabelDiv(
			/* mapItem   */ mapItem,
			/* parent    */ mapItem.labelElement,
			/* id        */ 'detail_' + axis + idx + mapItem.labelPostScript,
			/* className */ 'DynamicLabel',
			/* text      */ shownLabels[idx-1],
			/* longText  */ actualLabels[idx-1],
			/* left      */ isRow ? xBase : xBase + i * skip,
			/* top       */ isRow ? yBase + i * skip : yBase,
			/* fontSize  */ fontSize,
			/* rotate    */ rotate,
			/* index     */ idx,
			/* axis      */ labelDivAxis
			/* xy        */ /* Not specified */
			);
		}
	    }
	}
    }

    /************************************************************************************************
     * FUNCTION - resetLabelLengths: This function resets the maximum //label size variables for each
     * axis in preparation for a screen redraw.
     ************************************************************************************************/
    function resetLabelLengths (mapItem) {
	mapItem.rowLabelLen = 0;
	mapItem.colLabelLen = 0;
    }

    /************************************************************************************************
     * FUNCTION - detailDrawRowClassBarLabels: This function draws row class bar labels on the detail panel.
     ************************************************************************************************/
    DET.detailDrawRowClassBarLabels = function (mapItem) {

	// Draw visible row covariate bar labels
	if (mapItem.rowClassLabelFont > UTIL.minLabelSize) {
	    const rowBars = mapItem.getScaledVisibleCovariates("row");
	    if (rowBars.length > 0) {
		// Determine scale factor from canvas coordinates to CSS coordinates.
		const scale = mapItem.canvas.clientWidth / (mapItem.dataViewWidth + rowBars.totalHeight());
		// Position row covariate bar labels below the map / covariate bar canvas.
		let yPos = mapItem.canvas.offsetTop + mapItem.canvas.clientHeight + 4;
		if (rowBars.containsLegend()) {
		    yPos += 12; // add extra space for bar legend(s)
		}
		let startingPoint = mapItem.canvas.offsetLeft + mapItem.rowClassLabelFont + 2;
		rowBars.forEach ((currentClassBar, index) => {
		    const barWidth = currentClassBar.height*scale;
		    // Offset label so it's centered within the bar.
		    let xPos = startingPoint + (barWidth - mapItem.rowClassLabelFont) / 2;
		    DET.removeClassBarLegendElements(currentClassBar.label, mapItem);
		    drawCovariateBarLegends(mapItem, "row");
		    const availableSpace = Math.min((currentClassBar.height - DET.paddingHeight) * scale, DET.maxLabelSize);
		    if (availableSpace >= mapItem.rowClassLabelFont) {
			const labelText = MMGR.getLabelText(currentClassBar.label,'COL');
			DET.addLabelDiv(mapItem, mapItem.labelElement, 'detail_classrow' + index + mapItem.labelPostScript, 'DynamicLabel ClassBar', labelText, currentClassBar.label, xPos, yPos, mapItem.rowClassLabelFont, 'T', currentClassBar.idx, "RowCovar",currentClassBar.label);
		    }
		    startingPoint += barWidth;
		});
	    }	
	}

	// Draw indicator for hidden row covariate bars, if any.
	mapItem.removeLabel ("missingDetRowClassBars");
	if (mapItem.heatMap.hasHiddenCovariates ("row")) {
	    if (!document.getElementById("missingDetRowClassBars")){
		const x = mapItem.canvas.offsetLeft + 10;
		const y = mapItem.canvas.offsetTop + mapItem.canvas.clientHeight+2;
		DET.addLabelDiv(mapItem, mapItem.labelElement, 'missingDetRowClassBars' + mapItem.labelPostScript, "ClassBar MarkLabel", "...", "...", x, y, 10, 'T', null, "Row");
	    }
	    if (!document.getElementById("missingSumRowClassBars") && SUM.canvas){
		const x = SUM.canvas.offsetLeft;
		const y = SUM.canvas.offsetTop + SUM.canvas.clientHeight + 2;
		const sumlabelDiv = document.getElementById('sumlabelDiv');
		if (sumlabelDiv !== null) {
		    DET.addLabelDiv(mapItem, document.getElementById('sumlabelDiv'), 'missingSumRowClassBars' + mapItem.labelPostScript, "ClassBar MarkLabel", "...", "...", x, y, 10, "T", null,"Row");
		}
	    }
	}
    };

    /************************************************************************************************
     * FUNCTION - detailDrawRowClassBarLabels: This function draws column class bar labels on the
     * detail panel.
     ************************************************************************************************/
    DET.detailDrawColClassBarLabels = function (mapItem) {
	// Display labels for visible column covariates.
	if (mapItem.colClassLabelFont > UTIL.minLabelSize) {
	    const colBars = mapItem.getScaledVisibleCovariates ("column");
	    const scale = mapItem.canvas.clientHeight / (mapItem.dataViewHeight + colBars.totalHeight());
	    if (colBars.length > 0) {
		let xPos = mapItem.canvas.offsetLeft + mapItem.canvas.clientWidth + 3;
		if (colBars.containsLegend()) {
		    xPos += 14; //add spacing for bar legend(s)
		}
		let yPos = mapItem.canvas.offsetTop - 1;
		colBars.forEach ((currentClassBar, index) => {
		    DET.removeClassBarLegendElements(currentClassBar.label, mapItem);
		    drawCovariateBarLegends(mapItem, "column");
		    const spaceAvailable = Math.min((currentClassBar.height - DET.paddingHeight) * scale, DET.maxLabelSize);
		    const barHeightScaled = currentClassBar.height * scale;
		    if (spaceAvailable >= mapItem.colClassLabelFont) {
			// Try to center label in large-height bars
			const delta = Math.max ((barHeightScaled - mapItem.colClassLabelFont)/2 - 3, 0);
			const labelText = MMGR.getLabelText(currentClassBar.label,'ROW');
			DET.addLabelDiv(mapItem, mapItem.labelElement, 'detail_classcol' + index + mapItem.labelPostScript, 'DynamicLabel ClassBar', labelText, currentClassBar.label, xPos, yPos + delta, mapItem.colClassLabelFont, 'F', currentClassBar.idx, "ColumnCovar");
		    }
		    yPos += barHeightScaled;
		});	
	    }
	}

	// Draw indicator for hidden column covariate bars, if any.
	mapItem.removeLabel ("missingDetColClassBars");
	if (mapItem.heatMap.hasHiddenCovariates ("column")) {
	    if (!document.getElementById("missingDetColClassBars")){
		const x = mapItem.canvas.offsetLeft + mapItem.canvas.clientWidth+2;
		const y = mapItem.canvas.offsetTop-15;
		DET.addLabelDiv(mapItem, mapItem.labelElement, 'missingDetColClassBars' + mapItem.labelPostScript, "ClassBar MarkLabel", "...", "...", x, y, 10, "F", null,"Column");
	    }
	    if (!document.getElementById("missingSumColClassBars") && SUM.canvas && SUM.chmElement) {
		const x = SUM.canvas.offsetLeft + SUM.canvas.offsetWidth + 2;
		const y = SUM.canvas.offsetTop + SUM.canvas.clientHeight/SUM.totalHeight - 10;
		DET.addLabelDiv(mapItem, document.getElementById('sumlabelDiv'), 'missingSumColClassBars' + mapItem.labelPostScript, "ClassBar MarkLabel", "...", "...", x, y, 10, "F", null,"Column");
	    }
	}
    };

    /************************************************************************************************
     * FUNCTION - drawCovariateBarLegends: This function draws all covariate bar legends for the
     * specified axis on the specified detail panel for maps that contain bar/scatter plot covariates.
     * It calls a second function (drawRowClassBarLegend or drawColClassBarLegend) to draw each legend.
     ************************************************************************************************/
    function drawCovariateBarLegends (mapItem, axis) {
	const bars = mapItem.getScaledVisibleCovariates (axis);
	const totalHeight = bars.totalHeight();
	const drawBarLegend = MMGR.isRow(axis) ? DET.drawRowClassBarLegend : DET.drawColClassBarLegend;
	let prevHeight = 0;
	bars.forEach (bar => {
	    if (bar.bar_type !== 'color_plot') {
		drawBarLegend (mapItem, bar, prevHeight, totalHeight);
	    }
	    prevHeight += bar.height;
	});
    }

    /************************************************************************************************
     * FUNCTION - drawRowClassBarLegend: This function draws a specific row class bar legend on the
     * detail panel for maps that contain bar/scatter plot covariates.
     ************************************************************************************************/
    DET.bullet = "* ";
    DET.drawRowClassBarLegend = function(mapItem, currentClassBar, barStartPosn, totalHeight) {
	// Scale factor for converting canvas coordinates to CSS coordinates.
	const scale =  mapItem.canvas.clientWidth / (mapItem.dataViewWidth + totalHeight);

	// Don't draw legend if the bar is not large enough.
	if (currentClassBar.height * scale < 18) return;

	// Boundaries of the current bar, as fractions of the space used by all the covariate bars.
	const startFrac = barStartPosn/totalHeight;
	const endFrac = (barStartPosn+currentClassBar.height)/totalHeight;

	// Boundaries of all the covariate bars in CSS coordinates.
	const beginClasses = mapItem.canvas.offsetLeft;
	const endClasses = beginClasses + totalHeight*scale;

	// Calculate x CSS coordinates for the start, end, and middle of the current bar. 
	const beginPos = beginClasses + totalHeight*scale*startFrac + 3.5;
	const endPos = beginClasses + totalHeight*scale*endFrac - 3.5;
	const midPos = beginPos+(endPos-beginPos)/2;

	// Calculate y CSS coordinate for the legend.
	const topPos = mapItem.canvas.offsetTop + mapItem.canvas.offsetHeight + 2;

	// Calculate the high, middle, and low values to display in the bar's legend.
	let highVal = parseFloat(currentClassBar.high_bound);
	let lowVal = parseFloat(currentClassBar.low_bound);
	let midVal = lowVal + (highVal-lowVal)/2;

	// Convert the legend value to strings with fixed number of digits after the decimal.
	// Normally 0, but increase up to 3 for small ranges.
	const digits = Math.min (3, Math.max (0, Math.ceil (1-Math.log10(highVal - lowVal))));
	highVal = highVal.toFixed (digits);
	midVal = midVal.toFixed (digits);
	lowVal = lowVal.toFixed (digits);

	// Create div and place low legend value
	DET.setLegendDivElement(mapItem,currentClassBar.label+mapItem.panelNbr+"legendDetLow",DET.bullet+lowVal,topPos,beginPos,true);
	// Create div and place middle legend value
	DET.setLegendDivElement(mapItem,currentClassBar.label+mapItem.panelNbr+"legendDetMid",DET.bullet+midVal,topPos,midPos,true);
	// Create div and place high legend value
	DET.setLegendDivElement(mapItem,currentClassBar.label+mapItem.panelNbr+"legendDetHigh",DET.bullet+highVal,topPos,endPos,true);
    };

/************************************************************************************************
 * FUNCTION - drawColClassBarLegend: This function draws a specific column class bar legend on the
 * detail panel for maps that contain bar/scatter plot covariates.
 ************************************************************************************************/
DET.drawColClassBarLegend = function(mapItem, currentClassBar, startPosn, totalHeight) {
	const scale = mapItem.canvas.clientHeight / (mapItem.dataViewHeight + totalHeight);

	// Don't draw legend if bar is not large enough
	if (currentClassBar.height * scale < 18) return;

	//calculate where the previous bar ends and the current one begins.
	const prevEndPct = startPosn/totalHeight;
	const currEndPct = (startPosn+currentClassBar.height)/totalHeight;

	//calculate where covariate bars begin and end and use that to calculate the total covariate bars height
	const beginClasses = mapItem.canvas.offsetTop - 1;
	const endClasses = beginClasses+(totalHeight*scale);

	//find the first, middle, and last vertical positions for the bar legend being drawn
	const topPos = beginClasses + totalHeight * scale * prevEndPct;
	const barHeight = currentClassBar.height * scale - DET.paddingHeight;
	const endPos = topPos + barHeight;
	const midPos = topPos + barHeight/2;

	//get your horizontal start position (to the right of bars)
	const leftPos = mapItem.canvas.offsetLeft + mapItem.canvas.offsetWidth;

	//Get your 3 values for the legend.
	let highVal = parseFloat(currentClassBar.high_bound);
	let lowVal = parseFloat(currentClassBar.low_bound);
	let midVal = lowVal + (highVal-lowVal)/2;

	//adjust display values for 0-to-1 ranges
	const digits = Math.min (3, Math.max (0, Math.ceil (1-Math.log10(highVal - lowVal))));
	highVal = highVal.toFixed (digits);
	midVal = midVal.toFixed (digits);
	lowVal = lowVal.toFixed (digits);

	//Create div and place high legend value
	DET.setLegendDivElement(mapItem,currentClassBar.label+mapItem.panelNbr+"legendDetHigh-",DET.bullet,topPos,leftPos,false);
	DET.setLegendDivElement(mapItem,currentClassBar.label+mapItem.panelNbr+"legendDetHigh",highVal,topPos-1,leftPos+3,false);
	//Create div and place mid legend value
	DET.setLegendDivElement(mapItem,currentClassBar.label+mapItem.panelNbr+"legendDetMid",DET.bullet+midVal,midPos,leftPos,false);
	//Create div and place low legend value
	DET.setLegendDivElement(mapItem,currentClassBar.label+mapItem.panelNbr+"legendDetLow",lowVal,endPos-3,leftPos+3,false);
	DET.setLegendDivElement(mapItem,currentClassBar.label+mapItem.panelNbr+"legendDetLow-",DET.bullet,endPos-1,leftPos,false);
};

/************************************************************************************************
 * FUNCTION - removeColClassBarLegendElements: This function removes any existing legend elements
 * for a bar/scatter plot class bar that is being redrawn.
 ************************************************************************************************/
DET.removeClassBarLegendElements = function(key,mapItem) {
	let legItem = document.getElementById(key+mapItem.panelNbr+"legendDetHigh-");
	if (legItem !== null) legItem.remove();
	legItem = document.getElementById(key+mapItem.panelNbr+"legendDetHigh");
	if (legItem !== null) legItem.remove();
	legItem = document.getElementById(key+mapItem.panelNbr+"legendDetMid");
	if (legItem !== null) legItem.remove();
	legItem = document.getElementById(key+mapItem.panelNbr+"legendDetLow");
	if (legItem !== null) legItem.remove();
	legItem = document.getElementById(key+mapItem.panelNbr+"legendDetLow-");
	if (legItem !== null) legItem.remove();
}

/************************************************************************************************
 * FUNCTION - setLegendDivElement: This function sets the position for a bar/scatter plot
 * covariates legend on the detail panel.
 ************************************************************************************************/
DET.setLegendDivElement = function (mapItem,itemId,boundVal,topVal,leftVal,isRowVal) {
	//Create div and place high legend value
	let itemElem = document.getElementById(itemId);
	if (itemElem === null) {
		itemElem = document.createElement("Div");
		itemElem.id = itemId;
		itemElem.innerHTML = boundVal;
		itemElem.className = "DynamicLabel ClassBar";
		if (isRowVal) {
			itemElem.style.transformOrigin = 'left top';
			itemElem.style.transform = 'rotate(90deg)';
			itemElem.style.webkitTransform = "rotate(90deg)";
			itemElem.dataset.axis = 'RowCovar';
		} else {
			itemElem.dataset.axis = 'ColumnCovar';
		}
		itemElem.style.position = "absolute";
		itemElem.style.fontSize = '5pt';
		itemElem.style.fontFamily = 'sans-serif';
		itemElem.style.fontWeight = 'bold';
		mapItem.labelElement.appendChild(itemElem);
	}
	itemElem.style.top = topVal + 'px';
	itemElem.style.left = leftVal + 'px';
}

/************************************************************************************************
 * FUNCTION - removeLabel: This function removes a label from a specific detail map item.
 ************************************************************************************************/
DET.removeLabel = function (mapItem, label) {
	if (mapItem.oldLabelElements.hasOwnProperty (label)) {
		const e = mapItem.oldLabelElements[label];
		e.parent.removeChild(e.div);
		delete mapItem.oldLabelElements[label];
	}
};

/************************************************************************************************
 * FUNCTION - addLabelDiv: This function adds a label div element to a specific detail map item
 ************************************************************************************************/
DET.addLabelDiv = function (mapItem, parent, id, className, text ,longText, left, top, fontSize, rotate, index,axis,xy) {
	if (mapItem.oldLabelElements.hasOwnProperty(id)) {
	    DET.updateLabelDiv (mapItem, parent, id, className, text ,longText, left, top, fontSize, rotate, index,axis,xy);
	    return;
	}
	let div = document.getElementById (id);
	if (div) {
	    if (parent !== div.parentElement) {
		console.log ({ m: 'parent mismatch', parent, div });
	    }
	    mapItem.oldLabelElements[id] = { div, parent: div.parentElement };
	    DET.updateLabelDiv (mapItem, parent, id, className, text ,longText, left, top, fontSize, rotate, index,axis,xy);
	    return;
	}
	div = document.createElement('div');
	mapItem.labelElements[id] = { div, parent };
	div.id = id;
	div.className = className;
	div.dataset.index = index;
	if (div.classList.contains('ClassBar')){
		div.dataset.axis = 'ColumnCovar';
	} else {
		div.dataset.axis = 'Row';
	}
	if (SRCHSTATE.labelIndexInSearch(axis,index)) {
		div.classList.add('inSelection');
	}
	if (rotate == 'T') {
		div.style.transformOrigin = 'left top';
		div.style.transform = 'rotate(90deg)';
		div.style.webkitTransformOrigin = "left top";
		div.style.webkitTransform = "rotate(90deg)";
		if (div.classList.contains('ClassBar')){
			div.dataset.axis = 'RowCovar';
		} else {
			div.dataset.axis = 'Column';
		}
	}
	
	div.style.position = "absolute";
	div.style.left = left + 'px';
	div.style.top = top + 'px';
	div.style.fontSize = fontSize.toString() +'pt';
	div.style.fontFamily = 'sans-serif';
	div.style.fontWeight = 'bold';
	div.innerHTML = text;
	
	parent.appendChild(div);
	if (div.parentElement !== parent) {
		console.log ({ m: 'mismatch after insertion', parentElement: div.parentElement, parent });
	}
	
	if (text !== "<" && text !== "..." && text.length > 0){
		div.addEventListener('click', mapItem.labelCallbacks.labelClick, UTIL.passiveCompat({ capture: false, passive: false }));
		div.addEventListener('contextmenu', mapItem.labelCallbacks.labelRightClick, UTIL.passiveCompat({ capture: false, passive: false }));
		div.onmouseover = function(){UHM.hlp(this,longText,longText.length*9,0);}
		div.onmouseleave = UHM.hlpC;
		div.addEventListener("touchstart", function(e){
			UHM.hlpC();
			const now = new Date().getTime();
			const timesince = now - mapItem.latestTap;
			DET.labelLastClicked[this.dataset.axis] = this.dataset.index;
			mapItem.latestLabelTap = now;
		}, UTIL.passiveCompat({ passive: true }));
		div.addEventListener("touchend", function(e){
			if (e.touches.length == 0 && mapItem.latestLabelTap){
				const now = new Date().getTime();
				const timesince = now - mapItem.latestLabelTap;
				if (timesince > 500){
				    mapItem.labelCallbacks.labelRightClick(e);
				}
			}
		}, UTIL.passiveCompat({ passive: false }));
		div.addEventListener("touchmove", mapItem.labelCallbacks.labelDrag, UTIL.passiveCompat({ passive: false }));
	}
	if (text == "..."){
		const listenOpts = UTIL.passiveCompat({ capture: false, passive: false });
		div.addEventListener('mouseover', (function() {
		    return function(e) {UHM.hlp(this,"Some covariate bars are hidden",160,0); };
		}) (this), listenOpts);
		div.addEventListener('mouseleave', (function() {
		    return function(e) {UHM.hlpC(); };
		}) (this), listenOpts);
	}
}


/************************************************************************************************
 * FUNCTION - updateLabelDiv: This function updates a label DIV and removes it from the
 * oldLabelElements array if it is no longer visible on the detail panel.
 ************************************************************************************************/
DET.updateLabelDiv = function (mapItem, parent, id, className, text ,longText, left, top, fontSize, rotate, index,axis,xy) {
	if (mapItem.oldLabelElements[id].parent !== parent) {
		return; // sometimes this if statement is triggered during recreation of panes from a saved state
	}
	// Get existing label element and move from old to current collection.
	const div = mapItem.oldLabelElements[id].div;
	if (div.parentElement !== parent) {
		console.log ({ m: 'mismatch during update', parentElement: div.parentElement, parent });
	}
	mapItem.labelElements[id] = { div, parent };
	delete mapItem.oldLabelElements[id];

	if (SRCHSTATE.labelIndexInSearch(axis,index)) {
		div.classList.add ('inSelection');
	} else {
		div.classList.remove ('inSelection');
	}
	
	//div.style.position = "absolute";
	div.style.left = left + 'px';
	div.style.top = top + 'px';
	div.style.fontSize = fontSize.toString() +'pt';
	//div.style.fontFamily = 'sans-serif';
	//div.style.fontWeight = 'bold';
	div.innerText = text;
	div.dataset.index = index;
}

//----------------------------------------------------------------------------------------------//
//----------------------------------------------------------------------------------------------//
//BEGIN DENDROGRAM RELATED DETAIL DISPLAY FUNCTIONS
//----------------------------------------------------------------------------------------------//
//----------------------------------------------------------------------------------------------//

/**********************************************************************************
 * FUNCTION - setDendroShow: The purpose of this function is to set the display
 * height and width for row and column dendrograms for a given heat map panel.
 **********************************************************************************/
DET.setDendroShow = function (mapItem) {
	const heatMap = mapItem.heatMap;
	const rowDendroConfig = heatMap.getRowDendroConfig();
	const colDendroConfig = heatMap.getColDendroConfig();
	if (!heatMap.showRowDendrogram("DETAIL")) {
		mapItem.dendroWidth = 15;
	} else {
		mapItem.dendroWidth = Math.floor(parseInt(rowDendroConfig.height) * heatMap.getRowDendroConfig().height/100+5);
	}
	if (!heatMap.showColDendrogram("DETAIL")) {
		mapItem.dendroHeight = 15;
	} else {
		mapItem.dendroHeight = Math.floor(parseInt(colDendroConfig.height) * heatMap.getColDendroConfig().height/100+5);
	}
}

/************************************************************************************************
 * FUNCTION - colDendroResize: This function resizes the column dendrogram of the specified detail
 * heat map panel instance.
 ************************************************************************************************/
DET.colDendroResize = function(mapItem, drawIt) {
	if (mapItem.colDendroCanvas !== null) {
		const dendroCanvas = mapItem.colDendroCanvas;
		const left = mapItem.canvas.offsetLeft;
		const canW = mapItem.dataViewWidth + mapItem.getScaledVisibleCovariates("row").totalHeight();
		dendroCanvas.style.left = (left + mapItem.canvas.clientWidth * (1-mapItem.dataViewWidth/canW)) + 'px';
		if (mapItem.colDendro.isVisible()){
			//If summary side is hidden, retain existing dendro height
			const totalDetHeight = mapItem.chm.offsetHeight - 50;
			let height = parseInt (dendroCanvas.style.height, 10) | 0;
			height = mapItem.colDendro.summaryDendrogram.callbacks.calcDetailDendrogramSize ('column', height, totalDetHeight);
			dendroCanvas.style.height = height + 'px';
			dendroCanvas.style.width = (mapItem.canvas.clientWidth * (mapItem.dataViewWidth/canW)) + 'px';
			mapItem.colDendro.setCanvasSize (
			    Math.round(mapItem.canvas.clientWidth * (mapItem.dataViewWidth/mapItem.canvas.width)),
			    Math.round(height));
			if (drawIt) mapItem.colDendro.draw();
		} else {
			dendroCanvas.style.height = '0px';
		}
	}
}

/************************************************************************************************
 * FUNCTION - rowDendroResize: This function resizes the row dendrogram of the specified detail
 * heat map panel instance.
 ************************************************************************************************/
DET.rowDendroResize = function(mapItem, drawIt) {
	if (mapItem.rowDendroCanvas !== null) {
		const dendroCanvas = mapItem.rowDendroCanvas;
		const top = mapItem.colDendro.getDivHeight() + DET.paddingHeight;
		const canH = mapItem.dataViewHeight + mapItem.getScaledVisibleCovariates("column").totalHeight();
		dendroCanvas.style.top = (top + mapItem.canvas.clientHeight * (1-mapItem.dataViewHeight/canH)) + 'px';
		if (mapItem.rowDendro.isVisible()){
			//If summary side is hidden, retain existing dendro width
			const totalDetWidth = (mapItem.chm.offsetWidth - 50);
			let width = parseInt (dendroCanvas.style.width, 10) | 0;

			width = mapItem.rowDendro.summaryDendrogram.callbacks.calcDetailDendrogramSize ('row', width, totalDetWidth);
			dendroCanvas.style.width = width + 'px';

			const height = mapItem.canvas.clientHeight * (mapItem.dataViewHeight/canH);
			dendroCanvas.style.height = (height-2) + 'px';
			mapItem.rowDendro.setCanvasSize (Math.round(width), Math.round(height));
			if (drawIt) mapItem.rowDendro.draw();
		} else {
			dendroCanvas.style.width = '0px';
		}
	}
}

/*********************************************************************************************
 * FUNCTION: getColDendroPixelHeight  -  The purpose of this function is to get the pixel height
 * of the column dendrogram.
 *********************************************************************************************/
DET.getColDendroPixelHeight = function (mapItem) {
	return mapItem.canvas.clientHeight*(mapItem.dendroHeight/mapItem.canvas.height);
}

/*********************************************************************************************
 * FUNCTION: getRowDendroPixelWidth  -  The purpose of this function is to get the pixel width
 * of the row dendrogram.
 *********************************************************************************************/
DET.getRowDendroPixelWidth = function (mapItem) {
	return mapItem.canvas.clientWidth*(mapItem.dendroWidth/mapItem.canvas.width);
}



//----------------------------------------------------------------------------------------------//
//----------------------------------------------------------------------------------------------//
//BEGIN COVARIATE BAR RELATED DETAIL DISPLAY FUNCTIONS
//----------------------------------------------------------------------------------------------//
//----------------------------------------------------------------------------------------------//

/*********************************************************************************************
 * FUNCTION: getColClassPixelHeight  -  The purpose of this function is to set the pixel height
 * of column covariate bars.
 *********************************************************************************************/
DET.getColClassPixelHeight = function (mapItem) {
	const classbarHeight = mapItem.getScaledVisibleCovariates("column").totalHeight();
	return mapItem.canvas.clientHeight*(classbarHeight/mapItem.canvas.height);
}

/*********************************************************************************************
 * FUNCTION: getRowClassPixelWidth  -  The purpose of this function is to set the pixel width
 * of row covariate bars.
 *********************************************************************************************/
DET.getRowClassPixelWidth = function (mapItem) {
	const classbarWidth = mapItem.getScaledVisibleCovariates("row").totalHeight();
	return mapItem.canvas.clientWidth*(classbarWidth/mapItem.canvas.width);
}

/**********************************************************************************
 * FUNCTION - detailDrawColClassBars: The purpose of this function is to column
 * class bars on a given detail heat map canvas.
 **********************************************************************************/
DET.detailDrawColClassBars = function (mapItem, pixels) {
	const bars = mapItem.getScaledVisibleCovariates ("column");
	const colClassBarData = mapItem.heatMap.getColClassificationData();
	const rowClassBarWidth = mapItem.getScaledVisibleCovariates("row").totalHeight();
	const fullWidth = mapItem.dataViewWidth + rowClassBarWidth;
	const mapHeight = mapItem.dataViewHeight;
	const colorMapMgr = mapItem.heatMap.getColorMapManager();
	const rhRate = mapItem.heatMap.getColSummaryRatio(MAPREP.RIBBON_HOR_LEVEL);
	
	let pos = fullWidth*mapHeight*DRAW.BYTE_PER_RGBA;
	bars.reverse().forEach (currentClassBar => {
	    const colorMap = colorMapMgr.getColorMap("col",currentClassBar.label); // assign the proper color scheme...
	    let classBarValues = colClassBarData[currentClassBar.label].values;
	    pos += fullWidth*DET.paddingHeight*DRAW.BYTE_PER_RGBA; // draw padding between class bars
	    let start = mapItem.currentCol;
	    const length = DVW.getCurrentDetDataPerRow(mapItem);
	    if (((mapItem.mode == 'RIBBONH') || (mapItem.mode == 'FULL_MAP')) &&  (typeof colClassBarData[currentClassBar.label].svalues !== 'undefined')) {
		//Special case on large maps - if we are showing the whole row or a large part of it, use the summary classification values.
		classBarValues = colClassBarData[currentClassBar.label].svalues;
		start = Math.ceil(start/rhRate);
	    }
	    if (currentClassBar.bar_type === 'color_plot') {
		pos = DET.drawColorPlotColClassBar(mapItem, pixels, pos, rowClassBarWidth, start, length, currentClassBar, classBarValues, colorMap);
	    } else {
		pos = DET.drawScatterBarPlotColClassBar(mapItem, pixels, pos, rowClassBarWidth, start, length, currentClassBar, classBarValues, colorMap);
	    }
	});
}

/**********************************************************************************
 * FUNCTION - drawColorPlotColClassBar: The purpose of this function is to column
 * color plot class bars on a given detail heat map canvas.
 **********************************************************************************/
DET.drawColorPlotColClassBar = function(mapItem, pixels, pos, rowClassBarWidth, start, length, currentClassBar, classBarValues, colorMap) {
	const barLength = mapItem.dataViewWidth - DET.paddingHeight;
	const line = new Uint8Array(new ArrayBuffer(barLength * DRAW.BYTE_PER_RGBA)); // one row of the covariate bar

	// Fill the line buffer with one row of the covariate bar.
	let loc = 0;
	for (let k = start; k <= start + length -1; k++) {
		const val = classBarValues[k-1];
		const { r, g, b, a } = colorMap.getClassificationColor(val);
		for (let j = 0; j < mapItem.dataBoxWidth; j++) {
			line[loc] = r;
			line[loc + 1] = g;
			line[loc + 2] = b;
			line[loc + 3] = a;
			loc += DRAW.BYTE_PER_RGBA;
		}
	}

	// Copy currentClassBar.height - DET.paddingHeight replicates of the line buffer into the pixel buffer.
	// Additional pixel to skip to align the column covariate bar with the heat map and dendrograms.
	const align = 1;
	for (let j = 0; j < currentClassBar.height-DET.paddingHeight; j++){ // draw the class bar into the dataBuffer
		pos += (rowClassBarWidth + align)*DRAW.BYTE_PER_RGBA;
		for (let k = 0; k < line.length; k++) {
			pixels[pos] = line[k];
			pos++;
		}
		pos += (DET.paddingHeight - align) * DRAW.BYTE_PER_RGBA;
	}
	return pos;
}

/**********************************************************************************
 * FUNCTION - drawScatterBarPlotColClassBar: The purpose of this function is to column
 * bar and scatter plot class bars on a given detail heat map canvas.
 **********************************************************************************/
DET.drawScatterBarPlotColClassBar = function(mapItem, pixels, pos, rowClassBarWidth, start, length, currentClassBar, classBarValues, colorMap) {
	// Don't attempt to draw zero height (or less) covariate bar.
	if (currentClassBar.height <= DET.paddingHeight) {
	    return pos;
	}

	const colors = currentClassBar.getScatterBarPlotColors ();
	const matrix = SUM.buildScatterBarPlotMatrix(currentClassBar.height - DET.paddingHeight, 1, classBarValues.slice (start-1, start-1+length), currentClassBar);

	// Additional pixel to skip to align the column covariate bar with the heat map and dendrograms.
	const align = 1;
	// Offset from the start of the row to the start of the column covariate bar
	const offset = (rowClassBarWidth + align)*DRAW.BYTE_PER_RGBA;
	// Padding required to output a total of dataViewWidth pixels for the covariate bar.
	const padding = mapItem.dataViewWidth - length * mapItem.dataBoxWidth - align;
	if (padding < 0) {
	    console.error ('Negative padding in drawScatterBarPlotColClassBar', padding, mapItem.dataViewWidth, length, mapItem.dataBoxWidth);
	}
	for (let h = 0; h < matrix.length; h++) {
		pos += offset;
		const row = matrix[h];
		for (let k = 0; k < row.length; k++) {
			const { r, g, b, a } = colors[row[k]];
			for (let j = 0; j < mapItem.dataBoxWidth; j++) {
			    pixels[pos]   = r;
			    pixels[pos+1] = g;
			    pixels[pos+2] = b;
			    pixels[pos+3] = a;
			    pos+=DRAW.BYTE_PER_RGBA;
			}
		}
		pos += padding * DRAW.BYTE_PER_RGBA;
	}
	return pos;
};

/**********************************************************************************
 * FUNCTION - detailDrawRowClassBars: The purpose of this function is to row
 * class bars on a given detail heat map canvas.
 **********************************************************************************/
DET.detailDrawRowClassBars = function (mapItem, pixels) {
	const heatMap = mapItem.heatMap;
	const bars = mapItem.getScaledVisibleCovariates("row");
	const rowClassBarWidth = bars.totalHeight();
	const detailTotalWidth = rowClassBarWidth + mapItem.dataViewWidth;
	const rowClassBarData = heatMap.getRowClassificationData();
	const mapWidth = detailTotalWidth;
	const mapHeight = mapItem.dataViewHeight;
	const colorMapMgr = heatMap.getColorMapManager();
	let offset = ((detailTotalWidth*DET.dataViewBorder/2)) * DRAW.BYTE_PER_RGBA; // start position of very bottom dendro
	bars.forEach (currentClassBar => {
	    const colorMap = colorMapMgr.getColorMap ("row", currentClassBar.label); // assign the proper color scheme...
	    let classBarValues = rowClassBarData[currentClassBar.label].values;
	    const classBarLength = classBarValues.length;
	    let start = mapItem.currentRow;
	    const length = DVW.getCurrentDetDataPerCol(mapItem);
	    if (((mapItem.mode == 'RIBBONV') || (mapItem.mode == 'FULL_MAP')) &&  (typeof rowClassBarData[currentClassBar.label].svalues !== 'undefined')) {
		//Special case on large maps, if we are showing the whole column, switch to the summary classificaiton values
		classBarValues = rowClassBarData[currentClassBar.label].svalues;
		const rvRate = heatMap.getRowSummaryRatio(MAPREP.RIBBON_VERT_LEVEL);
		start = Math.ceil(start/rvRate);
	    }
	    let pos = offset; // move past the dendro and the other class bars...
	    if (currentClassBar.bar_type === 'color_plot') {
		    pos = DET.drawColorPlotRowClassBar(mapItem, pixels, pos, start, length, currentClassBar, classBarValues, mapWidth, colorMap);
	    } else {
		    pos = DET.drawScatterBarPlotRowClassBar(mapItem, pixels, pos, start, length, currentClassBar, classBarValues, mapWidth, colorMap);
	    }
	    offset += currentClassBar.height*DRAW.BYTE_PER_RGBA;
	});	
}

/**********************************************************************************
 * FUNCTION - drawColorPlotRowClassBar: The purpose of this function is to row
 * color plot class bars on a given detail heat map canvas.
 **********************************************************************************/
DET.drawColorPlotRowClassBar = function(mapItem, pixels, pos, start, length, currentClassBar, classBarValues, mapWidth, colorMap) {
	for (let j = start + length - 1; j >= start; j--){ // for each row shown in the detail panel
		const val = classBarValues[j-1];
		const { r, g, b, a } = colorMap.getClassificationColor(val);
		for (let boxRows = 0; boxRows < mapItem.dataBoxHeight; boxRows++) { // draw this color to the proper height
			for (let k = 0; k < currentClassBar.height-DET.paddingHeight; k++){ // draw this however thick it needs to be
				pixels[pos]     = r;
				pixels[pos + 1] = g;
				pixels[pos + 2] = b;
				pixels[pos + 3] = a;
				pos+=DRAW.BYTE_PER_RGBA;	// 4 bytes per color
			}
			// padding between class bars
			pos+=DET.paddingHeight*DRAW.BYTE_PER_RGBA;
			pos+=(mapWidth - currentClassBar.height)*DRAW.BYTE_PER_RGBA;
		}
	}
	return pos;
}

/**********************************************************************************
 * FUNCTION - drawScatterBarPlotRowClassBar: The purpose of this function is to row
 * bar and scatter plot class bars on a given detail heat map canvas.
 **********************************************************************************/
DET.drawScatterBarPlotRowClassBar = function(mapItem, pixels, pos, start, length, currentClassBar, classBarValues, mapWidth, colorMap) {
	const height = currentClassBar.height - DET.paddingHeight;
	const colors = currentClassBar.getScatterBarPlotColors ();
	const matrix = SUM.buildScatterBarPlotMatrix(height, 1, classBarValues.slice (start-1, start-1+length), currentClassBar);
	for (let h = matrix[0].length-1; h >= 0 ; h--) {
		for (let j = 0; j < mapItem.dataBoxHeight; j++) {
			for (let i = 0; i < height;i++) {
			    const { r, g, b, a } = colors[matrix[i][h]];
			    pixels[pos]   = r;
			    pixels[pos+1] = g;
			    pixels[pos+2] = b;
			    pixels[pos+3] = a;
			    pos+=DRAW.BYTE_PER_RGBA;
			}
			// go total width of the summary canvas and back up the width of a single class bar to return to starting point for next row
			// padding between class bars
			pos+=DET.paddingHeight*DRAW.BYTE_PER_RGBA;
			pos+=(mapWidth - currentClassBar.height)*DRAW.BYTE_PER_RGBA;
		}
	}
	return pos;
};

    /************************************************************************************************
     * FUNCTION - detailResize: This function calls all of the functions necessary to resize all
     * of the open detail panel instances.
     ************************************************************************************************/
    DET.detailResize = function () {
	DVW.detailMaps.forEach(resizeMapItem);
    };

    DET.resizeMapItem = resizeMapItem;
    function resizeMapItem (mapItem) {
	DET.rowDendroResize(mapItem, false);
	DET.colDendroResize(mapItem, false);
	calculateCovariateBarScale (mapItem, "row");
	calculateCovariateBarScale (mapItem, "column");
	sizeCanvasForLabels(mapItem);
	//Done twice because changing canvas size affects fonts selected for drawing labels
	sizeCanvasForLabels(mapItem);
	updateMapItemLabels(mapItem);
	DET.drawMapItemSelectionsOnScreen(mapItem);
	DET.rowDendroResize(mapItem, true);
	DET.colDendroResize(mapItem, true);
    }

    function calculateCovariateBarScale (mapItem, axis) {
	const debug = false;
	const origScale = Math.max (1.0, MMGR.isRow (axis) ? mapItem.rowClassScale : mapItem.colClassScale);
	let bars = mapItem.heatMap.getScaledVisibleCovariates (axis, origScale);
	if (bars.length === 0) return;

	// Aim for larger covariate bars if there are only a few of them.
	const targetFontSize = 7.5 + Math.max (0, 11 - bars.length) * 0.25;
	const clientSize = MMGR.isRow (axis) ? mapItem.canvas.clientWidth : mapItem.canvas.clientHeight;
	const dataViewSize = MMGR.isRow (axis) ? mapItem.dataViewWidth : mapItem.dataViewHeight;

	if (debug) console.log ({ m: '> calculateCovariateBarScale', clientSize, dataViewSize, });
	let loops = 0;
	let totalBarHeight = 0;
	let scale = origScale;
	for (;;) {
	    totalBarHeight = Math.max (bars.totalHeight(), bars.length * (DET.paddingHeight + 1));
	    let fontScale = clientSize / (dataViewSize + totalBarHeight);
	    let minFont = 999;
	    let maxFont = 0;
	    bars.forEach (bar => {
		const fontSize = Math.max (bar.height - DET.paddingHeight, 1) * fontScale;
		if (fontSize < minFont) minFont = fontSize;
		if (fontSize > maxFont) maxFont = fontSize;
	    });
	    let midFont = (minFont + maxFont) / 2;
	    const scaleRatio = targetFontSize / (minFont - 1);
	    if (debug) console.log ({ scale, totalBarHeight, fontScale, minFont, maxFont, midFont, scaleRatio, });
	    loops++;
	    if (Math.abs(scaleRatio-1) < 0.1 || loops >= 10) break;
	    scale = Math.max (scale*scaleRatio, 1e-5);
	    bars = mapItem.heatMap.getScaledVisibleCovariates (axis, scale);
	}
	// Don't let the covariates grow to more than a third of the map size.
	if (3.0 * totalBarHeight >= dataViewSize) {
	    scale *= dataViewSize / (totalBarHeight * 3.0);
	}
	const scaleRatio = scale/origScale;
	if (scaleRatio <= 0.9 || scaleRatio >= 1.1) {
	    if (MMGR.isRow(axis)) {
		mapItem.rowClassScale = scale;
	    } else {
		mapItem.colClassScale = scale;
	    }
	    setCanvasDimensions (mapItem);
	}
    }

//----------------------------------------------------------------------------------------------//
//----------------------------------------------------------------------------------------------//
//BEGIN WEBGL RELATED DETAIL DISPLAY FUNCTIONS
//----------------------------------------------------------------------------------------------//
//----------------------------------------------------------------------------------------------//

(function() {

    /*********************************************************************************************
     * FUNCTION:  detInitGl - The purpose of this function is to initialize a WebGl canvas for
     * the presentation of a detail heat map.
     *
     * This function *must* be called after any context switch and before any GL functions.
     * The window may lose the GL context at any context switch (for details, see DRAW.GL.createGlManager).
     * If we don't have the GL context (glManager.OK is false), do not execute any GL functions.
     *
     *********************************************************************************************/
    DET.detInitGl = function (mapItem) {
	    if (!mapItem.glManager) {
		mapItem.glManager = DRAW.GL.createGlManager (mapItem.canvas, getDetVertexShader, getDetFragmentShader, () => {
		    const drawWin = DVW.getDetailWindow(mapItem);
		    DET.drawDetailHeatMap(mapItem, drawWin);
		});
	    }
	    const ready = mapItem.glManager.check(initDetailContext);
	    if (ready) {
		const ctx = mapItem.glManager.context;
		ctx.viewportWidth = mapItem.dataViewWidth+mapItem.getScaledVisibleCovariates("row").totalHeight();
		ctx.viewportHeight = mapItem.dataViewHeight+mapItem.getScaledVisibleCovariates("column").totalHeight();
		ctx.viewport(0, 0, ctx.viewportWidth, ctx.viewportHeight);
	    }
	    return ready;

	    // (Re-)intialize a WebGl context for a detail map.
	    // Each detail pane uses a different canvas and hence WebGl Context.
	    // Each detail map uses a single context for the heat map and the covariate bars.
	    function initDetailContext (manager, ctx, program) {

		ctx.clear(ctx.COLOR_BUFFER_BIT);

		manager.setClipRegion (DRAW.GL.fullClipSpace);
		manager.setTextureRegion (DRAW.GL.fullTextureSpace);

		mapItem.uScale = ctx.getUniformLocation(program, 'u_scale');
		mapItem.uTranslate = ctx.getUniformLocation(program, 'u_translate');

		return true;
	    }
    };

    const vertexShaderSource = `
	attribute vec2 position;
	attribute vec2 texCoord;
	varying vec2 v_texPosition;
	uniform vec2 u_translate;
	uniform vec2 u_scale;
	void main () {
	  vec2 scaledPosition = position * u_scale;
	  vec2 translatedPosition = scaledPosition + u_translate;
	  gl_Position = vec4(translatedPosition, 0, 1);
	  v_texPosition = texCoord;
	}
    `;
    //'   v_texPosition = position * 0.5 + 0.5;                   ' +
    function getDetVertexShader (theGL) {
	    const shader = theGL.createShader(theGL.VERTEX_SHADER);
	    theGL.shaderSource(shader, vertexShaderSource);
	    theGL.compileShader(shader);
	    if (!theGL.getShaderParameter(shader, theGL.COMPILE_STATUS)) {
		    console.error(theGL.getShaderInfoLog(shader)); //alert
	    }
	    return shader;
    }

    const fragmentShaderSource = `
	precision mediump float;
	varying vec2 v_texPosition;
	varying float v_boxFlag;
	uniform sampler2D u_texture;
	void main () {
		  gl_FragColor = texture2D(u_texture, v_texPosition);
	}
    `;
    function getDetFragmentShader (theGL) {
	    const shader = theGL.createShader(theGL.FRAGMENT_SHADER);
	    theGL.shaderSource(shader, fragmentShaderSource);
	    theGL.compileShader(shader);
	    if (!theGL.getShaderParameter(shader, theGL.COMPILE_STATUS)) {
		    console.error(theGL.getShaderInfoLog(shader)); //alert
	    }
	    return shader;
    }

})();

})();
