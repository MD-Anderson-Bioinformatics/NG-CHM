(function() {
    'use strict';
    NgChm.markFile();

    //Define Namespace for NgChm DetailHeatMapDisplay
    const DET = NgChm.createNS('NgChm.DET');

    const MAPREP = NgChm.importNS('NgChm.MAPREP');
    const MMGR = NgChm.importNS('NgChm.MMGR');
    const SUM = NgChm.importNS('NgChm.SUM');
    const DMM = NgChm.importNS('NgChm.DMM');
    const SEL = NgChm.importNS('NgChm.SEL');
    const LNK = NgChm.importNS('NgChm.LNK');
    const UTIL = NgChm.importNS('NgChm.UTIL');
    const SRCH = NgChm.importNS('NgChm.SRCH');
    const DRAW = NgChm.importNS('NgChm.DRAW');
    const DEV = NgChm.importNS('NgChm.DEV');
    const UHM = NgChm.importNS('NgChm.UHM');
    const PANE = NgChm.importNS('NgChm.Pane');

DET.labelLastClicked = {};
DET.mouseDown = false;
DET.paddingHeight = 2;          // space between classification bars
DET.SIZE_NORMAL_MODE = 506;
DET.dataViewBorder = 2;
DET.zoomBoxSizes = [1,2,3,4,6,7,8,9,12,14,18,21,24,28,36,42,56,63,72,84,126,168,252];
DET.eventTimer = 0; // Used to delay draw updates
DET.maxLabelSize = 11;
DET.redrawSelectionTimeout = 0;   // Drawing delay in ms after the view has changed.
DET.redrawUpdateTimeout = 10;	// Drawing delay in ms after a tile update (if needed).
DET.minPixelsForGrid = 20;	// minimum element size for grid lines to display
DET.animating = false;

//We keep a copy of the last rendered detail heat map for each layer.
//This enables quickly redrawing the heatmap when flicking between layers, which
//needs to be nearly instant to be effective.
//The copy will be invalidated and require drawing if any parameter affecting
//drawing of that heat map is changed or if a new tile that could affect it
//is received.
DET.detailHeatMapCache = {};      // Last rendered detail heat map for each layer
DET.detailHeatMapLevel = {};      // Level of last rendered heat map for each layer
DET.detailHeatMapValidator = {};  // Encoded drawing parameters used to check heat map is current

//----------------------------------------------------------------------------------------------//
//----------------------------------------------------------------------------------------------//
//BEGIN HEAT MAP DRAWING RELATED DETAIL DISPLAY FUNCTIONS
//----------------------------------------------------------------------------------------------//
//----------------------------------------------------------------------------------------------//

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
	for (let i=0; i<DMM.DetailMaps.length;i++ ) {
		const mapItem = DMM.DetailMaps[i];
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
	if (mapItem.drawEventTimer) {
		clearTimeout (mapItem.drawEventTimer);
	}
	if (!noResize) mapItem.resizeOnNextDraw = true;
	if (!DMM.isVisible(mapItem)) { return false }

	const drawWin = SEL.getDetailWindow(mapItem);
	mapItem.drawEventTimer = setTimeout(function drawDetailTimeout () {
		if (mapItem.chm) {
			DET.drawDetailHeatMap(mapItem, drawWin);
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
	if (DET.detailHeatMapCache.hasOwnProperty (tile.layer) &&
	    DET.detailHeatMapLevel[tile.layer] === tile.level) {
		const heatMap = MMGR.getHeatMap();
		DET.detailHeatMapValidator[tile.layer] = '';
		if (tile.layer === heatMap.getCurrentDL()) {
			// Redraw 'now' if the tile is for the currently displayed layer.
			DET.setDrawDetailsTimeout (DET.redrawUpdateTimeout, false);
		}
	}
}

/*********************************************************************************************
 * FUNCTION:  setDetailMapDisplay - The purpose of this function is to complete the construction
 * of a detail heat map object and add it to the DetailMaps object array.
 *********************************************************************************************/
DET.setDetailMapDisplay = function (mapItem, restoreInfo) {
	DET.setDendroShow(mapItem);
	//If we are opening the first detail "copy" of this map set the data sizing for initial display
	if (DMM.DetailMaps.length === 0 && !restoreInfo) {
		DET.setInitialDetailDisplaySize(mapItem);
	}
	LNK.createLabelMenus();
	DET.setDendroShow(mapItem);
	if (mapItem.canvas) {
		mapItem.canvas.width =  (mapItem.dataViewWidth + DET.calculateTotalClassBarHeight("row"));
		mapItem.canvas.height = (mapItem.dataViewHeight + DET.calculateTotalClassBarHeight("column"));
	}
	
	setTimeout (function() {
		DET.detInitGl(mapItem);
		SEL.updateSelection(mapItem);
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
  	
	DMM.DetailMaps.push(mapItem);
  	if (mapItem.version === 'P') {
		DMM.primaryMap = mapItem;
  	}
	if (restoreInfo) {
	    if (mapItem.rowDendro !== null) {
		mapItem.rowDendro.setZoomLevel(restoreInfo.rowZoomLevel || 1);
	    }
	    if (mapItem.colDendro !== null) {
		mapItem.colDendro.setZoomLevel(restoreInfo.colZoomLevel || 1);
	    }
	}
	DET.setButtons(mapItem);
}

/*********************************************************************************************
 * FUNCTION:  setInitialDetailDisplaySize - The purpose of this function is to set the initial
 * detail display sizing (dataPerRow/Col, dataViewHeight/Width) for the heat map.
 *********************************************************************************************/
DET.setInitialDetailDisplaySize = function (mapItem) {
	// Small Maps - Set detail data size.  If there are less than 42 rows or columns
	// set the to show the box size closest to the lower value ELSE
	// set it to show 42 rows/cols.
	const heatMap = MMGR.getHeatMap();
	const rows = heatMap.getNumRows(MAPREP.DETAIL_LEVEL);
	const cols = heatMap.getNumColumns(MAPREP.DETAIL_LEVEL);
	if ((rows < 42) || (cols < 42)) {
		const boxSize = DET.getNearestBoxSize(mapItem, Math.min(rows,cols));
		DET.setDetailDataSize(mapItem,boxSize);
	} else {
		DET.setDetailDataSize(mapItem,12);
	}
}

/*********************************************************************************************
 * FUNCTION:  drawDetailHeatMap - The purpose of this function is to draw the region of the 
 * NGCHM specified by drawWin to a detail heat map pane.
 *********************************************************************************************/
DET.drawDetailHeatMap = function (mapItem, drawWin) {
	const heatMap = MMGR.getHeatMap();
	DET.setDendroShow(mapItem);
	if (mapItem.resizeOnNextDraw) {
		DMM.detailResize();
		mapItem.resizeOnNextDraw = false;
	}
	DET.setViewPort(mapItem);
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
		rowBarWidths: heatMap.getCovariateBarHeights("row"),
		colBarHeights: heatMap.getCovariateBarHeights("column"),
		rowBarTypes: heatMap.getCovariateBarTypes("row"),
		colBarTypes: heatMap.getCovariateBarTypes("column"),
		rowDendroHeight: heatMap.getRowDendroConfig().height,
		colDendroHeight: heatMap.getColDendroConfig().height,
		searchRows: SRCH.getAxisSearchResults("Row"),
		searchCols: SRCH.getAxisSearchResults("Column"),
		searchGridColor: [0,0,0]
	};

	// Set parameters that depend on the data layer properties.
	{
		const dataLayers = heatMap.getDataLayers();
		const dataLayer = dataLayers[drawWin.layer];
		const showGrid = dataLayer.grid_show === 'Y';
		const detWidth = + mapItem.boxCanvas.style.width.replace("px","");
		const detHeight = + mapItem.boxCanvas.style.height.replace("px","");
		params.showVerticalGrid = showGrid && params.dataBoxWidth > mapItem.minLabelSize && DET.minPixelsForGrid*drawWin.numCols <= detWidth;
		params.showHorizontalGrid = showGrid && params.dataBoxHeight > mapItem.minLabelSize && DET.minPixelsForGrid*drawWin.numRows <= detHeight;
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
	const paramCheck = JSON.stringify({ drawWin, params });
	if (DET.detailHeatMapValidator[layer] === paramCheck) {
		//Cached image exactly matches what we need.
		return DET.detailHeatMapCache[layer];
	}

	// Determine size of required image.
	const rowClassBarWidth = params.rowBarWidths.reduce((t,w) => t+w, 0);
	const colClassBarHeight = params.colBarHeights.reduce((t,h) => t+h, 0);
	const texWidth = params.mapWidth + rowClassBarWidth;
	const texHeight = params.mapHeight + colClassBarHeight;

	if (DET.detailHeatMapCache.hasOwnProperty(layer)) {
		// Resize the existing renderBuffer if needed.
		DET.detailHeatMapCache[layer].resize (texWidth, texHeight);
	} else {
		// Or create a new one if needed.
		DET.detailHeatMapCache[layer] = DRAW.createRenderBuffer (texWidth, texHeight, 1.0);
	}
	// Save data needed for determining if the heat map image will match the next request.
	DET.detailHeatMapValidator[layer] = paramCheck;
	DET.detailHeatMapLevel[layer] = drawWin.level;

	// create these variables now to prevent having to call them in the for-loop
	const currDetRow = drawWin.firstRow;
	const currDetCol = drawWin.firstCol;
	const detDataPerRow = drawWin.numCols;
	const detDataPerCol = drawWin.numRows;

	// Define a function for outputting reps copy of line
	// to the renderBuffer for this layer.
	const renderBuffer = DET.detailHeatMapCache[layer];
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

	const heatMap = MMGR.getHeatMap();
	const colorMap = heatMap.getColorMapManager().getColorMap("data",layer);

	const dataGridColor = colorMap.getHexToRgba(params.grid_color);
	const dataSelectionColorRGB = colorMap.getHexToRgba(params.selection_color);
	const dataSelectionColor = [dataSelectionColorRGB.r/255, dataSelectionColorRGB.g/255, dataSelectionColorRGB.b/255, 1];
	const regularGridColor = [dataGridColor.r, dataGridColor.g, dataGridColor.b];
	const cutsColor = colorMap.getHexToRgba(params.cuts_color);


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
		for (let j = 0; j < detDataPerRow; j++) {
			//When building grid line check for vertical cuts by grabbing value of currentRow (any row really) and column being iterated to
			const val = heatMap.getValue(drawWin.level, currDetRow, currDetCol+j);
			const nextVal = heatMap.getValue(drawWin.level, currDetRow, currDetCol+j+1);
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
		const isHorizCut = DET.isLineACut(mapItem,i) && DET.isLineACut(mapItem,i-1);
		linePos+=DRAW.BYTE_PER_RGBA;
		for (let j = 0; j < detDataPerRow; j++) { // for every data point...
			let val = heatMap.getValue(drawWin.level, currDetRow+i, currDetCol+j);
	        let nextVal = heatMap.getValue(drawWin.level, currDetRow+i, currDetCol+j+1);
	        if (val !== undefined) {
	            const color = colorMap.getColor(val);

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
						line[linePos] = color['r'];	line[linePos + 1] = color['g'];	line[linePos + 2] = color['b'];	line[linePos + 3] = color['a'];
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
 * FUNCTION - isLineACut: The purpose of this function is to determine if a given
 * row line is a cut (or gap) line and return a true/false boolean.
 **********************************************************************************/
DET.isLineACut = function (mapItem, row) {
	let lineIsCut = true;
	const heatMap = MMGR.getHeatMap();
	const level = SEL.getLevelFromMode(mapItem, MAPREP.DETAIL_LEVEL);
	const currDetRow = SEL.getCurrentDetRow(mapItem);
	const currDetCol = SEL.getCurrentDetCol(mapItem);
	const detDataPerRow = SEL.getCurrentDetDataPerRow(mapItem);
	for (let x = 0; x < detDataPerRow; x++) { // for every data point...
		const val = heatMap.getValue(level, currDetRow+row, currDetCol+x);
		//If any values on the row contain a value other than the cut value, mark lineIsCut as false
		if (val > MAPREP.minValues) {
			return false;
		}
	}
	return true;
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
DET.getNearestBoxSize = function (mapItem, sizeToGet) {
	const heatMap = MMGR.getHeatMap();
	let boxSize = 0;
	for (let i=DET.zoomBoxSizes.length-1; i>=0;i--) {
		boxSize = DET.zoomBoxSizes[i];
		const boxCalcVal = (mapItem.dataViewWidth-DET.dataViewBorder)/boxSize;
		if (boxCalcVal >= sizeToGet) {
			//Down size box if greater than map dimensions.
			if (boxCalcVal > Math.min(heatMap.getTotalRows(),heatMap.getTotalCols())) {
				boxSize = DET.zoomBoxSizes[i+1];
			}
			break;
		}
	}
	return boxSize;
}

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
	};
};

/*********************************************************************************************
 * FUNCTION: restoreFromSavedState  -  Restore detail view from saved state.
 *********************************************************************************************/
DET.restoreFromSavedState = function (mapItem, savedState) {
	mapItem.currentCol = savedState.currentCol;
	mapItem.currentRow = savedState.currentRow;
	mapItem.dataViewWidth = savedState.dataViewWidth + DET.dataViewBorder;
	mapItem.dataViewHeight = savedState.dataViewHeight + DET.dataViewBorder;
	mapItem.dataBoxHeight = savedState.dataBoxHeight;
	mapItem.dataBoxWidth = savedState.dataBoxWidth;
	mapItem.dataPerCol = savedState.dataPerCol;
	mapItem.dataPerRow = savedState.dataPerRow;
	mapItem.mode = savedState.mode;
	// RESTORE CANVAS SIZE
	let zoomBoxSizeIdx = DET.zoomBoxSizes.indexOf(savedState.dataBoxWidth);
	switch (savedState.mode) {
		case "RIBBONV":
			DEV.detailVRibbon(mapItem, {});
			break;
		case "RIBBONH":
			DEV.detailHRibbon(mapItem, {});
			break;
		case "FULL_MAP":
			DEV.detailFullMap(mapItem);
			break;
		case "NORMAL":
		default: // Fall through. Use the 'NORMAL' case for unknown modes.
			DET.setDetailDataSize(mapItem, DET.zoomBoxSizes[zoomBoxSizeIdx]);
			DEV.detailNormal (mapItem, {});
	};
};

/*********************************************************************************************
 * FUNCTION: getNearestBoxHeight  -  The purpose of this function is to loop zoomBoxSizes to pick the one that 
 * will be large enough to encompass user-selected area.
 *********************************************************************************************/
DET.getNearestBoxHeight = function (mapItem, sizeToGet) {
	const heatMap = MMGR.getHeatMap();
	let boxSize = 0;
	for (let i=DET.zoomBoxSizes.length-1; i>=0;i--) {
		boxSize = DET.zoomBoxSizes[i];
		const boxCalcVal = (mapItem.dataViewHeight-DET.dataViewBorder)/boxSize;
		if (boxCalcVal >= sizeToGet) {
			//Down size box if greater than map dimensions.
			if (boxCalcVal > Math.min(heatMap.getTotalRows(),heatMap.getTotalCols())) {
				boxSize = DET.zoomBoxSizes[i+1];
			}
			break;
		}
	}
	return boxSize;
}

/**********************************************************************************
 * FUNCTION - scaleViewWidth: For maps that have less rows/columns than the size
 * of the detail panel, matrix elements get  width more  than 1 pixel, scale calculates
 * the appropriate height/width.
 **********************************************************************************/
DET.scaleViewWidth = function (mapItem) {
	const heatMap = MMGR.getHeatMap();
	const scale = Math.max(Math.floor(500/heatMap.getNumColumns(MAPREP.SUMMARY_LEVEL)), 1)
	mapItem.dataViewWidth=(heatMap.getNumColumns(MAPREP.SUMMARY_LEVEL) * scale) + DET.dataViewBorder;
	DET.setDetailDataWidth(mapItem, scale);
}

/**********************************************************************************
 * FUNCTION - scaleViewHeight: For maps that have less rows/columns than the size
 * of the detail panel, matrix elements get height more than 1 pixel, scale calculates
 * the appropriate height/width.
 **********************************************************************************/
DET.scaleViewHeight = function (mapItem) {
	const heatMap = MMGR.getHeatMap();
	const scale = Math.max(Math.floor(500/heatMap.getNumRows(MAPREP.SUMMARY_LEVEL)), 1)
	mapItem.dataViewHeight= (heatMap.getNumRows(MAPREP.SUMMARY_LEVEL) * scale) + DET.dataViewBorder;
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
	SEL.setDataPerRowFromDet(Math.floor((mapItem.dataViewWidth-DET.dataViewBorder)/mapItem.dataBoxWidth), mapItem);

	//Adjust the current column based on zoom but don't go outside or the heat map matrix dimensions.
	if (!mapItem.modeHistory) mapItem.modeHistory = [];
	if ((prevDataPerRow != null) && (mapItem.modeHistory.length === 0)){
		if (prevDataPerRow > mapItem.dataPerRow) {
			mapItem.currentCol += Math.floor((prevDataPerRow - mapItem.dataPerRow) / 2);
		} else {
			mapItem.currentCol -= Math.floor((mapItem.dataPerRow - prevDataPerRow) / 2);
		}
	}
	SEL.checkCol(mapItem);
}

/**********************************************************************************
 * FUNCTION - setDetailDataHeight: The purpose of this function is to determine and
 * set how big the detail data height should be for a given detail pane.
 **********************************************************************************/
DET.setDetailDataHeight = function (mapItem, size) {
	const prevDataPerCol = mapItem.dataPerCol;
	mapItem.dataBoxHeight = size;
	SEL.setDataPerColFromDet(Math.floor((mapItem.dataViewHeight-DET.dataViewBorder)/mapItem.dataBoxHeight), mapItem);
	if (!mapItem.modeHistory) mapItem.modeHistory = [];
	
	//Adjust the current row but don't go outside of the current heat map dimensions
	if ((prevDataPerCol != null) && (mapItem.modeHistory.length === 0)){
		if (prevDataPerCol > mapItem.dataPerCol)
			mapItem.currentRow += Math.floor((prevDataPerCol - mapItem.dataPerCol) / 2);
		else
			mapItem.currentRow -= Math.floor((mapItem.dataPerCol - prevDataPerCol) / 2);
	}
	SEL.checkRow(mapItem);
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
    var totalColBarHeight;  /* Total height of all column covariate bars. */
    var totalRowBarHeight;  /* Total width of all row covariate bars. */

    DET.drawSelections = function drawSelections () {

	// Determine values that are constant across all detail panes.
	//
	const heatMap = MMGR.getHeatMap();
        const dataLayers = heatMap.getDataLayers();
	const mapNumRows = heatMap.getNumRows('d');
	const mapNumCols = heatMap.getNumColumns('d');

	// Retrieve contiguous row and column search arrays
	const searchRows = SRCH.getAxisSearchResults("Row");
	const rowRanges = DET.getContigSearchRanges(searchRows);
	const searchCols = SRCH.getAxisSearchResults("Column");
	const colRanges = DET.getContigSearchRanges(searchCols);

	// Get total row and column bar "heights".
	totalColBarHeight = DET.calculateTotalClassBarHeight("column");
	totalRowBarHeight = DET.calculateTotalClassBarHeight("row");

	for (let k=0; k<DMM.DetailMaps.length;k++ ) {
	        // Get context for this detail map.
		const mapItem = DMM.DetailMaps[k];
		mapItemVars.ctx = mapItem.boxCanvas.getContext("2d");
		calcMapItemVariables (mapItem);

		// Clear entire box canvas.
		mapItemVars.ctx.clearRect(0, 0, mapItem.boxCanvas.width, mapItem.boxCanvas.height);
	
		//Draw the border
		if (MMGR.mapHasGaps() === false) {
			const canH = mapItem.dataViewHeight + totalColBarHeight;
			const canW = mapItem.dataViewWidth + totalRowBarHeight;
			const boxX = (totalRowBarHeight / canW) * mapItem.boxCanvas.width;
			const boxY = (totalColBarHeight / canH) * mapItem.boxCanvas.height;
			const boxW = mapItem.boxCanvas.width-boxX;
			const boxH = mapItem.boxCanvas.height-boxY;
			mapItemVars.ctx.lineWidth=1;
			mapItemVars.ctx.strokeStyle="#000000";
			mapItemVars.ctx.strokeRect(boxX,boxY,boxW,boxH);
		}
		
	        // Retrieve selection color for and set ctx for coloring search boxes.
	        const dataLayer = dataLayers[mapItem.currentDl];
	        mapItemVars.ctx.lineWidth=3;
	        mapItemVars.ctx.strokeStyle=dataLayer.selection_color;

		if (rowRanges.length > 0 || colRanges.length > 0) {
			if (rowRanges.length === 0) {
				//Draw vertical lines across entire heatMap
				const topY = mapItemVars.topY;
				const bottom = mapItemVars.boxCanvasHeight;
				calcVisColRanges (colRanges, mapItem).forEach(([left, right]) => {
					drawSearchBox(mapItem, topY, bottom, left, right);
				});
			} else if (colRanges.length === 0) {
				//Draw horizontal lines across entire heatMap
			        const left = mapItemVars.topX;
				const right = mapItemVars.boxCanvasWidth;
				calcVisRowRanges (rowRanges, mapItem).forEach(([topY,bottom]) => {
					drawSearchBox(mapItem, topY, bottom, left, right);
				});
			} else {
				//Draw discrete selection boxes on heatMap
				const visColRanges = calcVisColRanges (colRanges, mapItem);
				if (visColRanges.length > 0) {
				        calcVisRowRanges (rowRanges, mapItem).forEach(([topY,bottom]) => {
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
	}
	mapItemVars.ctx = null;   // Remove reference to last context.
    };

    /**********************************************************************************
     * FUNCTION calcMapItemVariables. Calculate variables that depend on the mapItem but
     * not the current search box.
     **********************************************************************************/
    function calcMapItemVariables (mapItem) {

	//top-left corner of visible area
	mapItemVars.topX = ((totalRowBarHeight / mapItem.canvas.width) * mapItem.boxCanvas.width);
	mapItemVars.topY = ((totalColBarHeight / mapItem.canvas.height) * mapItem.boxCanvas.height);
	
	//height/width of heat map rectangle in pixels
	mapItemVars.mapXWidth = mapItem.boxCanvas.width - mapItemVars.topX;
	mapItemVars.mapYHeight = mapItem.boxCanvas.height - mapItemVars.topY;

	// width of a data cell in pixels
	if (mapItem.mode === 'NORMAL' || mapItem.mode === 'RIBBONV') {
		mapItemVars.cellWidth = mapItemVars.mapXWidth/SEL.getCurrentDetDataPerRow(mapItem);
	} else {
		mapItemVars.cellWidth = mapItemVars.mapXWidth/mapItem.dataPerRow;
	}
	// height of a data cell in pixels
	if (mapItem.mode === 'NORMAL' || mapItem.mode === 'RIBBONH') {
		mapItemVars.cellHeight = mapItemVars.mapYHeight/SEL.getCurrentDetDataPerCol(mapItem);
	} else {
		mapItemVars.cellHeight = mapItemVars.mapYHeight/mapItem.dataPerCol;
	}

	// Save a copy of these in case querying boxCanvas a lot is expensive.
	mapItemVars.boxCanvasWidth = mapItem.boxCanvas.width;
	mapItemVars.boxCanvasHeight = mapItem.boxCanvas.height;

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
     * viewportStart : top/left pixel of the viewport
     * viewportEnd : bottom/right pixel of the viewport
     * cellSize : number of pixels in a cell
     *
     * Output:
     * an array of visible pixel ranges (each an array of two pixel coordinate values)
     *
     * Only at least partially visible ranges are included in the output array.
     *
     **********************************************************************************/
    function calcVisRanges (axis, ranges, currentPosn, viewportStart, viewportEnd, cellSize) {
	const visRanges = [];
	ranges.forEach (([selStart,selEnd]) => {
	    const adjustedStart = (selStart - currentPosn)*cellSize;
	    const adjustedEnd = ((selEnd - selStart)+1)*cellSize;
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
    function calcVisColRanges (ranges, mapItem) {
	return calcVisRanges ("column", ranges, mapItem.currentCol, mapItemVars.topX, mapItemVars.boxCanvasWidth, mapItemVars.cellWidth);
    }

    /**********************************************************************************
     * FUNCTION - calcVisRowRanges: Convert row selectionRanges into row visibleRanges
     */
    function calcVisRowRanges (ranges, mapItem) {
	return calcVisRanges ("row", ranges, mapItem.currentRow, mapItemVars.topY, mapItemVars.boxCanvasHeight, mapItemVars.cellHeight);
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
	    return (boxY >= mapItemVars.topY) && (boxY <= mapItemVars.boxCanvasHeight);
	}

	function isVertLineVisible (boxX) {
	    return (boxX >= mapItemVars.topX) && (boxX <= mapItemVars.boxCanvasWidth);
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
	 * FUNCTION - drawVertLine: The purpose of this function is to draw a line
	 * on a given heat map canvas.
	 **********************************************************************************/
	function strokeLine (fromX, fromY, toX, toY) {
	    mapItemVars.ctx.moveTo(fromX,fromY);
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
 * FUNCTION - sizeCanvasForLabels: This function resizes the row heat map canvas on all open detail
 * heat map panel instances.  It sets the sizes of the main canvas, the box canvas, and the 
 * row/col lavel DIVs. It calculates and adjusts the size of the detail canvas and box canvas
 * in order to best accommodate the maximum label sizes for each axis.
 ************************************************************************************************/
DET.sizeCanvasForLabels = function() {
	for (let i=0; i<DMM.DetailMaps.length;i++ ) {
		const mapItem = DMM.DetailMaps[i];
		DET.resetLabelLengths(mapItem);
		if (mapItem.pane !== "") {  //Used by builder which does not contain the detail pane necessary, nor the use, for this logic
			DET.calcRowAndColLabels(mapItem);
			DET.calcClassRowAndColLabels(mapItem);
			DET.setViewPort(mapItem);
		}
	}
};

/************************************************************************************************
 * FUNCTION - setViewPort: This function resizes the heat map, row label, and column label
 * canvases for mapItem (an open detail heat map panel).
 * It sets the sizes of the main canvas, the box canvas, and the row/col label DIVs.
 ************************************************************************************************/
DET.setViewPort = function (mapItem) {
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
};

/************************************************************************************************
 * FUNCTION - calcRowAndColLabels: This function determines if labels are to be drawn on each 
 * axis and calls the appropriate function to calculate the maximum label size for each axis.
 ************************************************************************************************/
DET.calcRowAndColLabels = function (mapItem) {
	mapItem.rowLabelFont = DET.getRowLabelFontSize(mapItem);
	mapItem.colLabelFont = DET.getColLabelFontSize(mapItem);
	let fontSize;
	if (mapItem.rowLabelFont >= mapItem.minLabelSize && mapItem.colLabelFont >= mapItem.minLabelSize){
		fontSize = Math.min(mapItem.colLabelFont,mapItem.rowLabelFont);
		DET.calcColLabels(mapItem, fontSize);
		DET.calcRowLabels(mapItem, fontSize);
	} else if (mapItem.rowLabelFont >= mapItem.minLabelSize){
		DET.calcRowLabels(mapItem, mapItem.rowLabelFont);
	} else if (mapItem.colLabelFont >= mapItem.minLabelSize){
		DET.calcColLabels(mapItem, mapItem.colLabelFont);
	}
}

/************************************************************************************************
 * FUNCTION - calcClassRowAndColLabels: This function calls the functions necessary to calculate 
 * the maximum row/col class bar label sizes and update maximum label size variables (if necessary)
 ************************************************************************************************/
DET.calcClassRowAndColLabels = function (mapItem) {
	DET.calcRowClassBarLabels(mapItem);
	DET.calcColClassBarLabels(mapItem);
}

/************************************************************************************************
 * FUNCTION - calcRowClassBarLabels: This function calculates the maximum size of all row class 
 * bar labels and update the map item's rowLabelLen if the value of any label exceeds the existing 
 * maximum stored in that variable
 ************************************************************************************************/
DET.calcRowClassBarLabels = function (mapItem) {
	const heatMap = MMGR.getHeatMap();
	const rowClassBarConfigOrder = heatMap.getRowClassificationOrder();
	const scale =  mapItem.canvas.clientWidth / (mapItem.dataViewWidth + DET.calculateTotalClassBarHeight("row") + mapItem.dendroWidth);
	const rowClassBarConfig = heatMap.getRowClassificationConfig();
	const rowClassLength = Object.keys(rowClassBarConfig).length;
	const containsLegend = DET.classLabelsContainLegend("row");
	if (rowClassBarConfig != null && rowClassLength > 0) {
		mapItem.rowClassLabelFont = DET.rowClassBarLabelFont(mapItem);
		if ((mapItem.rowClassLabelFont > mapItem.minLabelSize)  && (mapItem.colClassLabelFont < DET.maxLabelSize)) {
			for (let i=0;i< rowClassBarConfigOrder.length;i++) {
				const key = rowClassBarConfigOrder[i];
				const currentClassBar = rowClassBarConfig[rowClassBarConfigOrder[i]];
				if (currentClassBar.show === 'Y') {
					const currFont = Math.min((currentClassBar.height - DET.paddingHeight) * scale, DET.maxLabelSize);
					let labelText = MMGR.getLabelText(key,'COL');
					if (containsLegend) {
						labelText = "XXX"+labelText; //calculate spacing for bar legend
					}
					DET.addTmpLabelForSizeCalc(mapItem, labelText, mapItem.rowClassLabelFont);
				} 
			} 
			DET.calcLabelDiv(mapItem, 'COL');
		}	
	}
}

/************************************************************************************************
 * FUNCTION - calcColClassBarLabels: This function calculates the maximum size of all column 
 * class bar labels and update the mapItem's colLabelLen if the value of any label exceeds the 
 * existing maximum stored in that variable
 ************************************************************************************************/
DET.calcColClassBarLabels = function (mapItem) {
	const heatMap = MMGR.getHeatMap();
	const scale =  mapItem.canvas.clientHeight / (mapItem.dataViewHeight + DET.calculateTotalClassBarHeight("column") + mapItem.dendroHeight);
	const colClassBarConfig = heatMap.getColClassificationConfig();
	const colClassBarConfigOrder = heatMap.getColClassificationOrder();
	const colClassLength = Object.keys(colClassBarConfig).length;
	const containsLegend = DET.classLabelsContainLegend("col");
	if (colClassBarConfig != null && colClassLength > 0) {
		mapItem.colClassLabelFont = DET.colClassBarLabelFont(mapItem);
		if ((mapItem.colClassLabelFont > mapItem.minLabelSize) && (mapItem.colClassLabelFont < DET.maxLabelSize)){
			for (let i=0;i< colClassBarConfigOrder.length;i++) {
				const key = colClassBarConfigOrder[i];
				const currentClassBar = colClassBarConfig[key];
				if (currentClassBar.show === 'Y') {
					const currFont = Math.min((currentClassBar.height - DET.paddingHeight) * scale, DET.maxLabelSize);
					let labelText = MMGR.getLabelText(key,'ROW');
					if (containsLegend) {
						labelText = "XXXX"+labelText; //calculate spacing for bar legend
					}
					DET.addTmpLabelForSizeCalc(mapItem, labelText, mapItem.colClassLabelFont);
				} 
			}	
			DET.calcLabelDiv(mapItem, 'ROW');
		}
	}
}

/************************************************************************************************
 * FUNCTION - rowClassBarLabelFont: This function calculates the appropriate font size for row 
 * class bar labels
 ************************************************************************************************/
DET.rowClassBarLabelFont = function(mapItem) {
	const heatMap = MMGR.getHeatMap();
	const scale =  mapItem.canvas.clientWidth / (mapItem.dataViewWidth + DET.calculateTotalClassBarHeight("row")+mapItem.dendroWidth);
	const rowClassBarConfig = heatMap.getRowClassificationConfig();
	const fontSize = DET.getClassBarLabelFontSize(mapItem, rowClassBarConfig,scale);
	return fontSize;
}

/************************************************************************************************
 * FUNCTION - colClassBarLabelFont: This function calculates the appropriate font size for 
 * column class bar labels
 ************************************************************************************************/
DET.colClassBarLabelFont = function(mapItem) {
	const heatMap = MMGR.getHeatMap();
	const scale =  mapItem.canvas.clientHeight / (mapItem.dataViewHeight + DET.calculateTotalClassBarHeight("column")+mapItem.dendroHeight);
	const colClassBarConfig = heatMap.getColClassificationConfig();
	const fontSize = DET.getClassBarLabelFontSize(mapItem, colClassBarConfig,scale);
	return fontSize;
}

/************************************************************************************************
 * FUNCTION - classLabelsContainLegend: This function returns a boolean indicating if the 
 * provided class bar axis contains a label with a bar or scatter plot legend.
 ************************************************************************************************/
DET.classLabelsContainLegend = function (type) {
	const heatMap = MMGR.getHeatMap();
	let containsLegend = false;
	let classBarOrder = heatMap.getColClassificationOrder();
	let classBarConfig = heatMap.getColClassificationConfig();
	if (type === "row") {
		classBarOrder = heatMap.getRowClassificationOrder();
		classBarConfig = heatMap.getRowClassificationConfig();
	}
	for (let i=0;i< classBarOrder.length;i++) {
		const key = classBarOrder[i];
		const currentClassBar = classBarConfig[key];
		if ((currentClassBar.show === 'Y') && (currentClassBar.bar_type !== 'color_plot')) {
			containsLegend = true;
		}
	}
	return containsLegend;
}

/************************************************************************************************
 * FUNCTION - addTmpLabelForSizeCalc: This function adds an entry to tmpLabelSizeElements for the 
 * specified text and fontSize.  If the combination of text and fontSize has not been seen before, 
 * a pool label element for performing the width calculation is also created.
 ************************************************************************************************/
DET.addTmpLabelForSizeCalc = function (mapItem, text, fontSize) {
     const key = text + fontSize.toString();
     if (mapItem.labelSizeCache.hasOwnProperty(key)) {
    	 mapItem.tmpLabelSizeElements.push({ key, el: null });
	} else {
             // Haven't seen this combination of font and fontSize before.
             // Set the contents of our label size div and calculate its width.
		const el = DET.getPoolElement(mapItem);
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
 DET.getPoolElement = function (mapItem) {
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
 * FUNCTION - getClassBarLabelFontSize: This function searches for the minimum font size for all 
 * classification bars in a set (row/col) that have a size greater than 7.  Those <= 7 are ignored 
 * as they will have "..." placed next to them as labels.
 ************************************************************************************************/
DET.getClassBarLabelFontSize = function (mapItem, classBarConfig,scale) {
	let minFont = 999;
	for (let key in classBarConfig) {
		const classBar = classBarConfig[key];
		const fontSize = Math.min(((classBar.height - DET.paddingHeight) * scale) - 1, 10);
		if ((fontSize > mapItem.minLabelSize) && (fontSize < minFont)) {
			minFont = fontSize;
		}
	}
	return minFont === 999 ? mapItem.minLabelSize : minFont;
}

/************************************************************************************************
 * FUNCTION - calcRowLabels: This function calculates the maximum label size (in pixels) on the 
 * row axis.
 ************************************************************************************************/
DET.calcRowLabels = function (mapItem, fontSize) {
	let headerSize = 0;
	const colHeight = DET.calculateTotalClassBarHeight("column") + mapItem.dendroHeight;
	if (colHeight > 0) {
		headerSize = mapItem.canvas.clientHeight * (colHeight / (mapItem.dataViewHeight + colHeight));
	}
	const skip = (mapItem.canvas.clientHeight - headerSize) / mapItem.dataPerCol;
	if (skip > mapItem.minLabelSize) {
		const shownLabels = MMGR.getShownLabels('ROW');
		for (let i = mapItem.currentRow; i < mapItem.currentRow + mapItem.dataPerCol; i++) {
			DET.addTmpLabelForSizeCalc(mapItem, shownLabels[i-1], fontSize);
		}
		DET.calcLabelDiv(mapItem, 'ROW');
	}
}

/************************************************************************************************
 * FUNCTION - calcRowLabels: This function calculates the maximum label size (in pixels) on the 
 * column axis.
 ************************************************************************************************/
DET.calcColLabels = function (mapItem, fontSize) {
	let headerSize = 0;
	const rowHeight = DET.calculateTotalClassBarHeight("row") + mapItem.dendroWidth;
	if (rowHeight > 0) {
		headerSize = mapItem.canvas.clientWidth * (rowHeight / (mapItem.dataViewWidth + rowHeight));
	}
	const skip = (mapItem.canvas.clientWidth - headerSize) / mapItem.dataPerRow;
	if (skip > mapItem.minLabelSize) {
		const shownLabels = MMGR.getShownLabels('COLUMN');
		for (let i = mapItem.currentCol; i < mapItem.currentCol + mapItem.dataPerRow; i++) {
			DET.addTmpLabelForSizeCalc(mapItem, shownLabels[i-1], fontSize);
		}
		DET.calcLabelDiv(mapItem, 'COL');
	}
}

/************************************************************************************************
 * FUNCTION - calcLabelDiv: This function assesses the size of the entries that have been added 
 * to tmpLabelSizeElements and increases the row/col label length if the longest label is longer 
 * than those already processed. rowLabelLen and colLabelLen are used to size the detail screen
 * to accommodate labels on both axes.
 ************************************************************************************************/
DET.calcLabelDiv = function (mapItem, axis) {
	let maxLen = axis === 'ROW' ? mapItem.rowLabelLen : mapItem.colLabelLen;
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
	if (axis === 'ROW') {
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
};

/************************************************************************************************
 * FUNCTION - getRowLabelFontSize: This function calculates the font size to be used for row labels.
 ************************************************************************************************/
DET.getRowLabelFontSize = function (mapItem) {
	let headerSize = 0;
	const colHeight = DET.calculateTotalClassBarHeight("column") + mapItem.dendroHeight;
	if (colHeight > 0) {
		headerSize = mapItem.canvas.clientHeight * (colHeight / (mapItem.dataViewHeight + colHeight));
	}
	const skip = Math.floor((mapItem.canvas.clientHeight - headerSize) / mapItem.dataPerCol) - 2;
	return Math.min(skip, DET.maxLabelSize);
};

/************************************************************************************************
 * FUNCTION - getRowLabelFontSize: This function calculates the font size to be used for column labels.
 ************************************************************************************************/
DET.getColLabelFontSize = function (mapItem) {
	let headerSize = 0;
	const rowHeight = DET.calculateTotalClassBarHeight("row") + mapItem.dendroWidth;
	if (rowHeight > 0) {
		headerSize = mapItem.canvas.clientWidth * (rowHeight / (mapItem.dataViewWidth + rowHeight));
	}
	const skip = Math.floor((mapItem.canvas.clientWidth - headerSize) / mapItem.dataPerRow) - 2;
	return Math.min(skip, DET.maxLabelSize);
};

/************************************************************************************************
 * FUNCTION - updateDisplayedLabels: This function updates detail labels when the user scrolls or
 * zooms on the detail pane. The existing labels are first moved to oldLabelElements. Adding a 
 * label will first check to see if the label element already exists in oldLabelElements and if 
 * so update it and move it to labelElements. After all elements have been added/updated, any 
 * remaining dynamic labels
 ************************************************************************************************/
DET.updateDisplayedLabels = function () {
	for (let i=0; i<DMM.DetailMaps.length;i++ ) {
		const mapItem = DMM.DetailMaps[i];
		if (!DMM.isVisible(mapItem)) {
		    continue;
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
			console.log({ m: 'DET.updateDisplayedLabels', prevNumLabels, currNumLabels, numOldLabels });
		}
		mapItem.oldLabelElements = {};
	
		// Restore visibility of labelElement
		mapItem.labelElement.style.setProperty('display', oldDisplayStyle);
	}
}

/************************************************************************************************
 * FUNCTION - drawRowAndColLabels: This function determines if labels are to be drawn on each 
 * axis and calls the appropriate function to draw those labels on the screen.
 ************************************************************************************************/
DET.drawRowAndColLabels = function (mapItem) {
	let fontSize;
	if (mapItem.rowLabelFont >= mapItem.minLabelSize && mapItem.colLabelFont >= mapItem.minLabelSize){
		fontSize = Math.min(mapItem.colLabelFont,mapItem.rowLabelFont);
		DET.drawRowLabels(mapItem,fontSize);
		DET.drawColLabels(mapItem,fontSize);
	} else if (mapItem.rowLabelFont >= mapItem.minLabelSize){
		DET.drawRowLabels(mapItem,mapItem.rowLabelFont);
	} else if (mapItem.colLabelFont >= mapItem.minLabelSize){
		DET.drawColLabels(mapItem,mapItem.colLabelFont);
	}
}

/************************************************************************************************
 * FUNCTION - drawRowLabels: This function draws all row axis labels on the screen.
 ************************************************************************************************/
DET.drawRowLabels = function (mapItem, fontSize) {
	let headerSize = 0;
	const colHeight = DET.calculateTotalClassBarHeight("column");
	if (colHeight > 0) {
		headerSize = mapItem.canvas.clientHeight * (colHeight / (mapItem.dataViewHeight + colHeight));
	}
	const skip = (mapItem.canvas.clientHeight - headerSize) / mapItem.dataPerCol;
	const start = Math.max((skip - fontSize)/2, 0) + headerSize-2;
	
	if (skip > mapItem.minLabelSize) {
		const actualLabels = MMGR.getActualLabels('ROW');
		const shownLabels = MMGR.getShownLabels('ROW');
		const xPos = mapItem.canvas.offsetLeft + mapItem.canvas.clientWidth + 3;
		for (let i = mapItem.currentRow; i < mapItem.currentRow + mapItem.dataPerCol; i++) {
			const yPos = mapItem.canvas.offsetTop + start + ((i-mapItem.currentRow) * skip);
			if (actualLabels[i-1] !== undefined){ // an occasional problem in subdendro view
				DET.addLabelDiv(mapItem,mapItem.labelElement, 'detail_row' + i + mapItem.labelPostScript, 'DynamicLabel', shownLabels[i-1], actualLabels[i-1], xPos, yPos, fontSize, 'F',i,"Row");
			}
		}
	}
}

/************************************************************************************************
 * FUNCTION - drawColLabels: This function draws all column axis labels on the screen.
 ************************************************************************************************/
DET.drawColLabels = function (mapItem, fontSize) {
	let headerSize = 0;
	const rowHeight = DET.calculateTotalClassBarHeight("row");
	if (rowHeight > 0) {
		headerSize = mapItem.canvas.clientWidth * (rowHeight / (mapItem.dataViewWidth + rowHeight));
	}
	const skip = (mapItem.canvas.clientWidth - headerSize) / mapItem.dataPerRow;
	const start = headerSize + fontSize + Math.max((skip - fontSize)/2, 0) + 3;

	if (skip > mapItem.minLabelSize) {
		const actualLabels = MMGR.getActualLabels('COLUMN');
		const shownLabels = MMGR.getShownLabels('COLUMN');
		const yPos = mapItem.canvas.offsetTop + mapItem.canvas.clientHeight + 3;
		for (let i = mapItem.currentCol; i < mapItem.currentCol + mapItem.dataPerRow; i++) {
			const xPos = mapItem.canvas.offsetLeft + start + ((i-mapItem.currentCol) * skip);
			if (actualLabels[i-1] !== undefined){ // an occasional problem in subdendro view
				DET.addLabelDiv(mapItem, mapItem.labelElement, 'detail_col' + i + mapItem.labelPostScript, 'DynamicLabel', shownLabels[i-1], actualLabels[i-1], xPos, yPos, fontSize, 'T',i,"Column");
				if (shownLabels[i-1].length > mapItem.colLabelLen) {
					mapItem.colLabelLen = shownLabels[i-1].length;
				}
			}
		}
	}
}

/************************************************************************************************
 * FUNCTION - resetLabelLengths: This function resets the maximum //label size variables for each 
 * axis in preparation for a screen redraw.
 ************************************************************************************************/
DET.resetLabelLengths = function (mapItem) {
	mapItem.rowLabelLen = 0;
	mapItem.colLabelLen = 0;
}

/************************************************************************************************
 * FUNCTION - detailDrawRowClassBarLabels: This function draws row class bar labels on the detail panel.
 ************************************************************************************************/
DET.detailDrawRowClassBarLabels = function (mapItem) {
	const heatMap = MMGR.getHeatMap();
	const rowClassBarConfigOrder = heatMap.getRowClassificationOrder();
	DET.removeLabel (mapItem, "missingDetRowClassBars");
	const scale =  mapItem.canvas.clientWidth / (mapItem.dataViewWidth + DET.calculateTotalClassBarHeight("row"));
	const classBarAreaWidth = DET.calculateTotalClassBarHeight("row")*scale;
	const dataAreaWidth = mapItem.dataViewWidth*scale;
	const rowClassBarConfig = heatMap.getRowClassificationConfig();
	const rowClassLength = Object.keys(rowClassBarConfig).length;
	const containsLegend = DET.classLabelsContainLegend("row");
	if (rowClassBarConfig != null && rowClassLength > 0) {
		let startingPoint = mapItem.canvas.offsetLeft + mapItem.rowClassLabelFont + 2;
		if (mapItem.rowClassLabelFont > mapItem.minLabelSize) {
			let prevClassBarHeight = 0;
			for (let i=0;i< rowClassBarConfigOrder.length;i++) {
				const key = rowClassBarConfigOrder[i];
				const currentClassBar = rowClassBarConfig[rowClassBarConfigOrder[i]];
				const barWidth = (currentClassBar.height*scale);
				let xPos = startingPoint + (barWidth/2) - (mapItem.rowClassLabelFont/2);
				let yPos = mapItem.canvas.offsetTop + mapItem.canvas.clientHeight + 4;
				DET.removeClassBarLegendElements(key,mapItem);
				if (currentClassBar.show === 'Y') {
					DET.drawRowClassBarLegends(mapItem);
					const currFont = Math.min((currentClassBar.height - DET.paddingHeight) * scale, DET.maxLabelSize);
					const labelText = MMGR.getLabelText(key,'COL');
					if (containsLegend) {
						yPos += 12; //add spacing for bar legend
					}
					if (currFont >= mapItem.rowClassLabelFont) {
						DET.addLabelDiv(mapItem, mapItem.labelElement, 'detail_classrow' + i + mapItem.labelPostScript, 'DynamicLabel ClassBar', labelText, key, xPos, yPos, mapItem.rowClassLabelFont, 'T', i, "RowCovar",key);
					}
					yPos += (currentClassBar.height * scale);
					startingPoint += barWidth;
				} else {
					if (!document.getElementById("missingDetRowClassBars")){
						const x = mapItem.canvas.offsetLeft + 10;
						const y = mapItem.canvas.offsetTop + mapItem.canvas.clientHeight+2;
						DET.addLabelDiv(mapItem, mapItem.labelElement, 'missingDetRowClassBars' + mapItem.labelPostScript, "ClassBar MarkLabel", "...", "...", x, y, 10, 'T', i, "Row");
					}
					if (!document.getElementById("missingSumRowClassBars") && SUM.canvas){
						const x = SUM.canvas.offsetLeft;
						const y = SUM.canvas.offsetTop + SUM.canvas.clientHeight + 2;
						const sumlabelDiv = document.getElementById('sumlabelDiv')
						if (sumlabelDiv !== null) {
							DET.addLabelDiv(mapItem, document.getElementById('sumlabelDiv'), 'missingSumRowClassBars' + mapItem.labelPostScript, "ClassBar MarkLabel", "...", "...", x, y, 10, "T", null,"Row");
						}
					}
				}
				prevClassBarHeight = currentClassBar.height;
			} 
		}	
	}
}

/************************************************************************************************
 * FUNCTION - detailDrawRowClassBarLabels: This function draws column class bar labels on the 
 * detail panel.
 ************************************************************************************************/
DET.detailDrawColClassBarLabels = function (mapItem) {
	const heatMap = MMGR.getHeatMap();
	DET.removeLabel (mapItem, "missingDetColClassBars");
	const scale =  mapItem.canvas.clientHeight / (mapItem.dataViewHeight + DET.calculateTotalClassBarHeight("column"));
	const colClassBarConfig = heatMap.getColClassificationConfig();
	const colClassBarConfigOrder = heatMap.getColClassificationOrder();
	const colClassLength = Object.keys(colClassBarConfig).length;
	const containsLegend = DET.classLabelsContainLegend("col");
	if (colClassBarConfig != null && colClassLength > 0) {
		if (mapItem.colClassLabelFont > mapItem.minLabelSize) {
			let yPos = mapItem.canvas.offsetTop;
			for (let i=0;i< colClassBarConfigOrder.length;i++) {
				let xPos = mapItem.canvas.offsetLeft + mapItem.canvas.clientWidth + 3;
				const key = colClassBarConfigOrder[i];
				const currentClassBar = colClassBarConfig[key];
				DET.removeClassBarLegendElements(key,mapItem);
				if (currentClassBar.show === 'Y') {
					DET.drawColClassBarLegends(mapItem);
					const currFont = Math.min((currentClassBar.height - DET.paddingHeight) * scale, DET.maxLabelSize);
					if (currFont >= mapItem.colClassLabelFont) {
						let yOffset = yPos - 1;
						//Reposition label to center of large-height bars
						if (currentClassBar.height >= 20) {
							yOffset += ((((currentClassBar.height/2) - (mapItem.colClassLabelFont/2)) - 3) * scale);
						}
						const labelText = MMGR.getLabelText(key,'ROW');
						if (containsLegend) {
							xPos += 14; //add spacing for bar legend
						}
						DET.addLabelDiv(mapItem, mapItem.labelElement, 'detail_classcol' + i + mapItem.labelPostScript, 'DynamicLabel ClassBar', labelText, key, xPos, yOffset, mapItem.colClassLabelFont, 'F', i, "ColumnCovar");
					}
					yPos += (currentClassBar.height * scale);
				} else {
					if (!document.getElementById("missingDetColClassBars")){
						const x =  mapItem.canvas.offsetLeft + mapItem.canvas.clientWidth+2;
						const y = mapItem.canvas.offsetTop-15;
						DET.addLabelDiv(mapItem, mapItem.labelElement, 'missingDetColClassBars' + mapItem.labelPostScript, "ClassBar MarkLabel", "...", "...", x, y, 10, "F", null,"Column");
					}
					if (!document.getElementById("missingSumColClassBars") && SUM.canvas && SUM.chmElement) {
					    const x = SUM.canvas.offsetLeft + SUM.canvas.offsetWidth + 2;
					    const y = SUM.canvas.offsetTop + SUM.canvas.clientHeight/SUM.totalHeight - 10;
					    DET.addLabelDiv(mapItem, document.getElementById('sumlabelDiv'), 'missingSumColClassBars' + mapItem.labelPostScript, "ClassBar MarkLabel", "...", "...", x, y, 10, "F", null,"Column");
					}
				}
			}	
		}
	}
}

/************************************************************************************************
 * FUNCTION - drawRowClassBarLegends: This function draws all row class bar legends on the 
 * detail panel for maps that contain bar/scatter plot covariates.  It calls a second function
 * (drawRowClassBarLegend) to draw each legend.
 ************************************************************************************************/
DET.drawRowClassBarLegends = function (mapItem) {
	const heatMap = MMGR.getHeatMap();
	const classBarsConfig = heatMap.getRowClassificationConfig();
	const classBarConfigOrder = heatMap.getRowClassificationOrder();
	const classBarsData = heatMap.getRowClassificationData();
	let totalHeight = 0;
	for (let i = 0; i < classBarConfigOrder.length; i++) {
		const key = classBarConfigOrder[i];
		const currentClassBar = classBarsConfig[key];
		if (currentClassBar.show === 'Y') {
			totalHeight += parseInt(currentClassBar.height);
		}
	}
	let prevHeight = 0;
	for (let i = 0; i < classBarConfigOrder.length; i++) {
		const key = classBarConfigOrder[i];
		const currentClassBar = classBarsConfig[key];
		if (currentClassBar.show === 'Y') {
			if (currentClassBar.bar_type !== 'color_plot') {
					DET.drawRowClassBarLegend(mapItem,key,currentClassBar,prevHeight,totalHeight,i);
			}
			prevHeight += parseInt(currentClassBar.height);
		}
	}
}

/************************************************************************************************
 * FUNCTION - drawRowClassBarLegend: This function draws a specific row class bar legend on the 
 * detail panel for maps that contain bar/scatter plot covariates.  
 ************************************************************************************************/
DET.drawRowClassBarLegend = function(mapItem,key,currentClassBar,prevHeight,totalHeight,i) {
	const classHgt = DET.calculateTotalClassBarHeight("row");
	const scale =  mapItem.canvas.clientWidth / (mapItem.dataViewWidth + classHgt);
	totalHeight *= scale;
	const prevEndPct = prevHeight/totalHeight;
	const currEndPct = (prevHeight+parseInt(currentClassBar.height))/totalHeight;
	const beginClasses = mapItem.canvas.offsetLeft-5;
	const endClasses = beginClasses+(classHgt*scale)-3;
	const classHeight = (endClasses-beginClasses)*scale;
	//Don't draw legend if bar is not wide enough
	if (classHeight < 18) return;
	const beginPos =  beginClasses+(classHeight*prevEndPct)+(DET.paddingHeight*(i+1));
	const endPos =  beginClasses+(classHeight*currEndPct);
	const midPos =  beginPos+((endPos-beginPos)/2);
	const topPos = mapItem.canvas.offsetTop + mapItem.canvas.offsetHeight + 2;
	let highVal = parseFloat(currentClassBar.high_bound);
	let lowVal = parseFloat(currentClassBar.low_bound);
	let midVal = Math.round((((highVal)-lowVal)/2)+lowVal);
	//adjust display values for 0-to-1 ranges
	if (highVal <= 1) {
		highVal = parseFloat(currentClassBar.high_bound).toFixed(1);
		lowVal = parseFloat(currentClassBar.low_bound).toFixed(1);
		midVal = ((parseFloat(currentClassBar.high_bound)-parseFloat(currentClassBar.low_bound))/2)+parseFloat(currentClassBar.low_bound);
		midVal = midVal.toFixed(1)
	}
	//Create div and place high legend value
	DET.setLegendDivElement(mapItem,key+mapItem.panelNbr+"legendDetLow","-"+lowVal,topPos,beginPos,true);
	//Create div and place middle legend value
	DET.setLegendDivElement(mapItem,key+mapItem.panelNbr+"legendDetMid","-"+midVal,topPos,midPos,true);
	//Create div and place middle legend value
	DET.setLegendDivElement(mapItem,key+mapItem.panelNbr+"legendDetHigh","-"+highVal,topPos,endPos,true);
}

/************************************************************************************************
 * FUNCTION - drawColClassBarLegends: This function draws column class bar legends on the 
 * detail panel for maps that contain bar/scatter plot covariates.  It calls a second function
 * (drawColClassBarLegend) to draw each legend.
 ************************************************************************************************/
DET.drawColClassBarLegends = function (mapItem) {
	const heatMap = MMGR.getHeatMap();
	const classBarsConfig = heatMap.getColClassificationConfig();
	const classBarConfigOrder = heatMap.getColClassificationOrder();
	const classBarsData = heatMap.getColClassificationData();
	let totalHeight = 0;
	for (let i = 0; i < classBarConfigOrder.length; i++) {
		const key = classBarConfigOrder[i];
		const currentClassBar = classBarsConfig[key];
		if (currentClassBar.show === 'Y') {
			totalHeight += parseInt(currentClassBar.height);
		}
	}
	let prevHeight = 0;
	const fewClasses = classBarConfigOrder.length < 7 ? 2 : 0;
	for (let i = 0; i < classBarConfigOrder.length; i++) {
		const key = classBarConfigOrder[i];
		const currentClassBar = classBarsConfig[key];
		if (currentClassBar.show === 'Y') {
			if (currentClassBar.bar_type !== 'color_plot') {
				DET.drawColClassBarLegend(mapItem,key,currentClassBar,prevHeight,totalHeight);
			}
			prevHeight += parseInt(currentClassBar.height);
		}
	}
}

/************************************************************************************************
 * FUNCTION - drawColClassBarLegend: This function draws a specific column class bar legend on the 
 * detail panel for maps that contain bar/scatter plot covariates.  
 ************************************************************************************************/
DET.drawColClassBarLegend = function(mapItem,key,currentClassBar,prevHeight,totalHeight) {
	const classHgt = DET.calculateTotalClassBarHeight("column");
	const scale =  mapItem.canvas.clientHeight / (mapItem.dataViewHeight + classHgt);

	//calculate where the previous bar ends and the current one begins.
	totalHeight *= scale;
	const prevEndPct = prevHeight/totalHeight;
	const currEndPct = (prevHeight+parseInt(currentClassBar.height))/totalHeight;

	//calculate where covariate bars begin and end and use that to calculate the total covariate bars height
	const beginClasses = mapItem.canvas.offsetTop-5;
	const endClasses = beginClasses+(classHgt*scale)-3;
	const classHeight = (endClasses-beginClasses)*scale;

	//find the first, middle, and last vertical positions for the bar legend being drawn
	const topPos =  beginClasses+(classHeight*prevEndPct);
	const barHeight = ((currentClassBar.height*scale) - DET.paddingHeight);
	//Don't draw legend if bar is not tall enough
	if (barHeight < 18) return;
	const endPos =  topPos + barHeight;
	const midPos =  topPos+(barHeight/2);

	//get your horizontal start position (to the right of bars)
	const leftPos = mapItem.canvas.offsetLeft + mapItem.canvas.offsetWidth;

	//Get your 3 values for the legend.
	let highVal = parseFloat(currentClassBar.high_bound);
	let lowVal = parseFloat(currentClassBar.low_bound);
	let midVal = Math.round((((highVal)-lowVal)/2)+lowVal);
	//adjust display values for 0-to-1 ranges
	if (highVal <= 1) {
		highVal = parseFloat(currentClassBar.high_bound).toFixed(1);
		lowVal = parseFloat(currentClassBar.low_bound).toFixed(1);
		midVal = ((parseFloat(currentClassBar.high_bound)-parseFloat(currentClassBar.low_bound))/2)+parseFloat(currentClassBar.low_bound);
		midVal = midVal.toFixed(1)
	}
	
	//Create div and place high legend value
	DET.setLegendDivElement(mapItem,key+mapItem.panelNbr+"legendDetHigh-","-",topPos,leftPos,false);
	DET.setLegendDivElement(mapItem,key+mapItem.panelNbr+"legendDetHigh",highVal,topPos+4,leftPos+3,false);
	//Create div and place mid legend value
	DET.setLegendDivElement(mapItem,key+mapItem.panelNbr+"legendDetMid","- "+midVal,midPos,leftPos,false);
	//Create div and place low legend value
	DET.setLegendDivElement(mapItem,key+mapItem.panelNbr+"legendDetLow",lowVal,endPos-3,leftPos+3,false);
	DET.setLegendDivElement(mapItem,key+mapItem.panelNbr+"legendDetLow-","-",endPos,leftPos,false);
}

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
 * FUNCTION - removeLabels: This function removes a label from all detail map items.  
 ************************************************************************************************/
DET.removeLabels = function (label) {
	for (let i=0; i<DMM.DetailMaps.length;i++ ) {
		const mapItem = DMM.DetailMaps[i];
		DET.removeLabel(mapItem, label);
	}
};

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
 * FUNCTION - addLabelDivs: This function adds a label div to all detail map items.  
 ************************************************************************************************/
DET.addLabelDivs = function (parent, id, className, text ,longText, left, top, fontSize, rotate, index,axis,xy) {
	for (let i=0; i<DMM.DetailMaps.length;i++ ) {
		const mapItem = DMM.DetailMaps[i];
		DET.addLabelDiv(mapItem, parent, id, className, text ,longText, left, top, fontSize, rotate, index,axis,xy);
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
	if (SRCH.labelIndexInSearch && SRCH.labelIndexInSearch(axis,index)) {
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
		div.addEventListener('click',DEV.labelClick , UTIL.passiveCompat({ capture: false, passive: false }));
		div.addEventListener('contextmenu',DEV.labelRightClick, UTIL.passiveCompat({ capture: false, passive: false }));
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
					DEV.labelRightClick(e);
				}
			}
		}, UTIL.passiveCompat({ passive: false }));
		div.addEventListener("touchmove", DEV.labelDrag, UTIL.passiveCompat({ passive: false }));
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

	if (SRCH.labelIndexInSearch(axis,index)) {
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
}

//----------------------------------------------------------------------------------------------//
//----------------------------------------------------------------------------------------------//
// BEGIN SEARCH RELATED DETAIL DISPLAY FUNCTIONS
//----------------------------------------------------------------------------------------------//
//----------------------------------------------------------------------------------------------//

/*********************************************************************************************
 * FUNCTION:  getContigSearchRanges - This function iterates thru a searchArray (searchRows
 *  or searchCols) and writes an array containing entries for each contiguous range selected 
 *  in the /searchArray.  This array will contain sub-arrays that have 2 entries (one for 
 *  starting position and the other for ending)
 *********************************************************************************************/
DET.getContigSearchRanges = function (searchArr) {
	let ranges = [];
	let prevVal=searchArr[0];
	let startVal = searchArr[0];
	if (searchArr.length >  0) {
		for (let i=0;i<searchArr.length;i++) {
			let currVal = searchArr[i];
			//If a contiguous range has been found, write array entry
			if (currVal - prevVal > 1) {
				ranges.push([startVal,prevVal]);
				startVal = currVal;
				//If this is ALSO the last entry, write one more array for
				//for the current single row/col selection
				if (i === searchArr.length -1) {
					ranges.push([currVal,currVal]);
				}
			} else {
				//If last entry, write array entry
				if (i === searchArr.length -1) {
					ranges.push([startVal,currVal]);
				}
			}
			prevVal = currVal;
		}
	}
	return ranges;
}

/*********************************************************************************************
 * FUNCTION:  getAllLabelsByAxis - This function retrieves and array of search labels containing
 * every label on a given axis.
 *********************************************************************************************/
DET.getAllLabelsByAxis = function (axis, labelType) {
	const heatMap = MMGR.getHeatMap();
	const labels = axis == 'Row' ? heatMap.getRowLabels()["labels"] : axis == "Column" ? heatMap.getColLabels()['labels'] :
		axis == "ColumnCovar" ? Object.keys(heatMap.getColClassificationConfig()) : axis == "ColumnCovar" ? Object.keys(heatMap.getRowClassificationConfig()) : 
			[heatMap.getRowLabels()["labels"], heatMap.getColLabels()['labels'] ];
	let searchLabels = [];
	if (axis === "Row") {
		for (let i in labels){
			if (labelType == linkouts.VISIBLE_LABELS){
				searchLabels.push(labels[i].split("|")[0]);
			}else if (labelType == linkouts.HIDDEN_LABELS){
				searchLabels.push(labels[i].split("|")[1]);
			} else {
				searchLabels.push(labels[i])
			}
		}
	} else {
		for (let i in labels){
				if (labelType == linkouts.VISIBLE_LABELS){
					searchLabels.push(labels[i].split("|")[0]);
				}else if (labelType == linkouts.HIDDEN_LABELS){
					searchLabels.push(labels[i].split("|")[1]);
				} else {
					searchLabels.push(labels[i])
				}
			}
	}
	return searchLabels;
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
	const heatMap = MMGR.getHeatMap();
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
DET.colDendroResize = function(mapItem) {
	if (mapItem.colDendroCanvas !== null) {
		const dendroCanvas = mapItem.colDendroCanvas;
		const left = mapItem.canvas.offsetLeft;
		const canW = mapItem.dataViewWidth + DET.calculateTotalClassBarHeight("row");
		dendroCanvas.style.left = (left + mapItem.canvas.clientWidth * (1-mapItem.dataViewWidth/canW)) + 'px';
		if (mapItem.colDendro.isVisible()){
			//If summary side is hidden, retain existing dendro height
			const totalDetHeight = mapItem.chm.offsetHeight - 50;
			let height = parseInt (dendroCanvas.style.height, 10) | 0;
			const sumMinimized = parseInt(SUM.colDendro.dendroCanvas.style.height, 10) < 5;
			if (!SUM.chmElement || sumMinimized) {
				const minHeight = totalDetHeight * 0.1;
				if (height < minHeight) {
				    height = minHeight;
				}
			} else {
				const dendroSumPct = parseInt(SUM.colDendro.dendroCanvas.style.height, 10) / (parseInt(SUM.canvas.style.height, 10) + parseInt(SUM.colDendro.dendroCanvas.style.height, 10) + parseInt(SUM.cCCanvas.style.height, 10));
				height = totalDetHeight * dendroSumPct; 
			}
			dendroCanvas.style.height = height + 'px';
			dendroCanvas.height = Math.round(height);
			dendroCanvas.style.width = (mapItem.canvas.clientWidth * (mapItem.dataViewWidth/canW)) + 'px';
			dendroCanvas.width = Math.round(mapItem.canvas.clientWidth * (mapItem.dataViewWidth/mapItem.canvas.width));
			mapItem.colDendro.draw();
		} else {
			dendroCanvas.style.height = '0px';
		}
	}
}

/************************************************************************************************
 * FUNCTION - rowDendroResize: This function resizes the row dendrogram of the specified detail
 * heat map panel instance.
 ************************************************************************************************/
DET.rowDendroResize = function(mapItem) {
	if (mapItem.rowDendroCanvas !== null) {
		const dendroCanvas = mapItem.rowDendroCanvas;
		const top = mapItem.colDendro.getDivHeight() + SUM.paddingHeight;
		const canH = mapItem.dataViewHeight + DET.calculateTotalClassBarHeight("column")
		dendroCanvas.style.top = (top + mapItem.canvas.clientHeight * (1-mapItem.dataViewHeight/canH)) + 'px';
		if (mapItem.rowDendro.isVisible()){
			//If summary side is hidden, retain existing dendro width
			const totalDetWidth = (mapItem.chm.offsetWidth - 50);
			const sumMinimized = parseInt(SUM.rowDendro.dendroCanvas.style.width, 10) < 5 ? true : false;
			const height = mapItem.canvas.clientHeight * (mapItem.dataViewHeight/canH);
			let width = parseInt (dendroCanvas.style.width, 10) | 0;
			if (!SUM.chmElement || sumMinimized) {
			    const minWidth = totalDetWidth * 0.1;
			    if (width < minWidth) {
				width = minWidth;
			    }
			} else {
			    const dendroSumPct = (parseInt(SUM.rowDendro.dendroCanvas.style.width, 10) / (parseInt(SUM.canvas.style.width, 10) + parseInt(SUM.rowDendro.dendroCanvas.style.width, 10) + parseInt(SUM.rCCanvas.style.width, 10)));
			    width = (totalDetWidth * dendroSumPct); 
			}
			dendroCanvas.style.width = width + 'px';
			dendroCanvas.width = Math.round(width);
			dendroCanvas.style.height = (height-2) + 'px';
			dendroCanvas.height = Math.round(height);
			mapItem.rowDendro.draw();
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
	const classbarHeight = DET.calculateTotalClassBarHeight("column");
	return mapItem.canvas.clientHeight*(classbarHeight/mapItem.canvas.height);
}

/*********************************************************************************************
 * FUNCTION: getRowClassPixelWidth  -  The purpose of this function is to set the pixel width
 * of row covariate bars.
 *********************************************************************************************/
DET.getRowClassPixelWidth = function (mapItem) {
	const classbarWidth = DET.calculateTotalClassBarHeight("row");
	return mapItem.canvas.clientWidth*(classbarWidth/mapItem.canvas.width);
}

/*********************************************************************************************
 * FUNCTION:  calculateTotalClassBarHeight - This function calculates the total class bar 
 * height for detail covariates on a given axis. Covariate bars in the detail pane are just 
 * their specified height, with no rescaling.
 *********************************************************************************************/
DET.calculateTotalClassBarHeight = function (axis) {
	return MMGR.getHeatMap().calculateTotalClassBarHeight (axis);
}

/**********************************************************************************
 * FUNCTION - detailDrawColClassBars: The purpose of this function is to column 
 * class bars on a given detail heat map canvas.
 **********************************************************************************/
DET.detailDrawColClassBars = function (mapItem, pixels) {
	const heatMap = MMGR.getHeatMap();
	const colClassBarConfig = heatMap.getColClassificationConfig();
	const colClassBarConfigOrder = heatMap.getColClassificationOrder();
	const colClassBarData = heatMap.getColClassificationData();
	const rowClassBarWidth = DET.calculateTotalClassBarHeight("row");
	const fullWidth = mapItem.dataViewWidth + rowClassBarWidth;
	const mapHeight = mapItem.dataViewHeight;
	let pos = fullWidth*mapHeight*DRAW.BYTE_PER_RGBA;
	pos += fullWidth*DET.paddingHeight*DRAW.BYTE_PER_RGBA;
	const colorMapMgr = heatMap.getColorMapManager();
	
	for (let i=colClassBarConfigOrder.length-1; i>= 0;i--) {
		const key = colClassBarConfigOrder[i];
		if (!colClassBarConfig.hasOwnProperty(key)) {
		    continue;
		  }
		const currentClassBar = colClassBarConfig[key];
		if (currentClassBar.show === 'Y') {
			const colorMap = colorMapMgr.getColorMap("col",key); // assign the proper color scheme...
			let classBarValues = colClassBarData[key].values;
			const classBarLength = SEL.getCurrentDetDataPerRow(mapItem) * mapItem.dataBoxWidth;
			pos += fullWidth*DET.paddingHeight*DRAW.BYTE_PER_RGBA; // draw padding between class bars
			let start = mapItem.currentCol;
			const length = SEL.getCurrentDetDataPerRow(mapItem);
			if (((mapItem.mode == 'RIBBONH') || (mapItem.mode == 'FULL_MAP')) &&  (typeof colClassBarData[key].svalues !== 'undefined')) {
				//Special case on large maps - if we are showing the whole row or a large part of it, use the summary classification values.
				classBarValues = colClassBarData[key].svalues;
				const rhRate = heatMap.getColSummaryRatio(MAPREP.RIBBON_HOR_LEVEL);
			    start = Math.ceil(start/rhRate);
			}
			if (currentClassBar.bar_type === 'color_plot') {
				pos = DET.drawColorPlotColClassBar(mapItem, pixels, pos, rowClassBarWidth, start, length, currentClassBar, classBarValues, classBarLength, colorMap);
			} else {
				pos = DET.drawScatterBarPlotColClassBar(mapItem, pixels, pos, currentClassBar.height-DET.paddingHeight, classBarValues, start, length, currentClassBar, colorMap);
			}
		  }

	}
}

/**********************************************************************************
 * FUNCTION - drawColorPlotColClassBar: The purpose of this function is to column 
 * color plot class bars on a given detail heat map canvas.
 **********************************************************************************/
DET.drawColorPlotColClassBar = function(mapItem, pixels, pos, rowClassBarWidth, start, length, currentClassBar, classBarValues, classBarLength, colorMap) {
	const line = new Uint8Array(new ArrayBuffer(classBarLength * DRAW.BYTE_PER_RGBA)); // save a copy of the class bar
	let loc = 0;
	for (let k = start; k <= start + length -1; k++) { 
		const val = classBarValues[k-1];
		const color = colorMap.getClassificationColor(val);
		for (let j = 0; j < mapItem.dataBoxWidth; j++) {
			line[loc] = color['r'];
			line[loc + 1] = color['g'];
			line[loc + 2] = color['b'];
			line[loc + 3] = color['a'];
			loc += DRAW.BYTE_PER_RGBA;
		}
	}
	for (let j = 0; j < currentClassBar.height-DET.paddingHeight; j++){ // draw the class bar into the dataBuffer
		pos += (rowClassBarWidth + 1)*DRAW.BYTE_PER_RGBA;
		for (let k = 0; k < line.length; k++) { 
			pixels[pos] = line[k];
			pos++;
		}
		pos+=DRAW.BYTE_PER_RGBA;
	}
	return pos;
}

/**********************************************************************************
 * FUNCTION - drawScatterBarPlotColClassBar: The purpose of this function is to column 
 * bar and scatter plot class bars on a given detail heat map canvas.
 **********************************************************************************/
DET.drawScatterBarPlotColClassBar = function(mapItem, pixels, pos, height, classBarValues, start, length, currentClassBar, colorMap) {
	const barFgColor = colorMap.getHexToRgba(currentClassBar.fg_color);
	const barBgColor = colorMap.getHexToRgba(currentClassBar.bg_color);
	const barCutColor = colorMap.getHexToRgba("#FFFFFF");
	const matrix = SUM.buildScatterBarPlotMatrix(height, classBarValues, start-1, length, currentClassBar, 100, false);
	const rowClassBarWidth = DET.calculateTotalClassBarHeight("row");

	//offset value for width of row class bars
	let offset = (rowClassBarWidth + 2)*DRAW.BYTE_PER_RGBA;
	for (let h = 0; h < matrix.length; h++) { 
		pos += offset;
		let row = matrix[h];
		for (let k = 0; k < row.length; k++) { 
			let posVal = row[k];
			for (let j = 0; j < mapItem.dataBoxWidth; j++) {
				if (posVal == 1) {
					pixels[pos] = barFgColor['r'];
					pixels[pos+1] = barFgColor['g'];
					pixels[pos+2] = barFgColor['b'];
					pixels[pos+3] = barFgColor['a'];
				} else if (posVal == 2) {
					pixels[pos] = barCutColor['r'];
					pixels[pos+1] = barCutColor['g'];
					pixels[pos+2] = barCutColor['b'];
					pixels[pos+3] = barCutColor['a'];
				} else {
					if (currentClassBar.subBgColor !== "#FFFFFF") {
						pixels[pos] = barBgColor['r'];
						pixels[pos+1] = barBgColor['g'];
						pixels[pos+2] = barBgColor['b'];
						pixels[pos+3] = barBgColor['a'];
					}
				}
				pos+=DRAW.BYTE_PER_RGBA;
			}
		}
	}
	return pos;
}

/**********************************************************************************
 * FUNCTION - detailDrawRowClassBars: The purpose of this function is to row 
 * class bars on a given detail heat map canvas.
 **********************************************************************************/
DET.detailDrawRowClassBars = function (mapItem, pixels) {
	const heatMap = MMGR.getHeatMap();
	const rowClassBarConfig = heatMap.getRowClassificationConfig();
	const rowClassBarConfigOrder = heatMap.getRowClassificationOrder();
	const rowClassBarData = heatMap.getRowClassificationData();
	const rowClassBarWidth = DET.calculateTotalClassBarHeight("row");
	const detailTotalWidth = DET.calculateTotalClassBarHeight("row") + mapItem.dataViewWidth;
	const mapWidth =  DET.calculateTotalClassBarHeight("row") + mapItem.dataViewWidth;
	const mapHeight = mapItem.dataViewHeight;
	const colorMapMgr = heatMap.getColorMapManager();
	let offset = ((detailTotalWidth*DET.dataViewBorder/2)) * DRAW.BYTE_PER_RGBA; // start position of very bottom dendro
	for (let i=0;i< rowClassBarConfigOrder.length;i++) {
		const key = rowClassBarConfigOrder[i];
		if (!rowClassBarConfig.hasOwnProperty(key)) {
		    continue;
		  }
		const currentClassBar = rowClassBarConfig[key];
		if (currentClassBar.show === 'Y') {
			const colorMap = colorMapMgr.getColorMap("row",key); // assign the proper color scheme...
			let classBarValues = rowClassBarData[key].values;
			const classBarLength = classBarValues.length;
			let start = mapItem.currentRow;
			const length = SEL.getCurrentDetDataPerCol(mapItem);
			if (((mapItem.mode == 'RIBBONV') || (mapItem.mode == 'FULL_MAP')) &&  (typeof rowClassBarData[key].svalues !== 'undefined')) {
				//Special case on large maps, if we are showing the whole column, switch to the summary classificaiton values
				classBarValues = rowClassBarData[key].svalues;
				const rvRate = heatMap.getRowSummaryRatio(MAPREP.RIBBON_VERT_LEVEL);
			    start = Math.ceil(start/rvRate);
			}
			let pos = offset; // move past the dendro and the other class bars...
			if (currentClassBar.bar_type === 'color_plot') {
				pos = DET.drawColorPlotRowClassBar(mapItem, pixels, pos, start, length, currentClassBar, classBarValues, mapWidth, colorMap);
			} else {
				pos = DET.drawScatterBarPlotRowClassBar(mapItem, pixels, pos, start, length, currentClassBar.height-DET.paddingHeight, classBarValues, mapWidth, colorMap, currentClassBar);
			}
			offset+= currentClassBar.height*DRAW.BYTE_PER_RGBA;
		}
	}	
}

/**********************************************************************************
 * FUNCTION - drawColorPlotRowClassBar: The purpose of this function is to row 
 * color plot class bars on a given detail heat map canvas.
 **********************************************************************************/
DET.drawColorPlotRowClassBar = function(mapItem, pixels, pos, start, length, currentClassBar, classBarValues, mapWidth, colorMap) {
	for (let j = start + length - 1; j >= start; j--){ // for each row shown in the detail panel
		const val = classBarValues[j-1];
		const color = colorMap.getClassificationColor(val);
		for (let boxRows = 0; boxRows < mapItem.dataBoxHeight; boxRows++) { // draw this color to the proper height
			for (let k = 0; k < currentClassBar.height-DET.paddingHeight; k++){ // draw this however thick it needs to be
				pixels[pos] = color['r'];
				pixels[pos + 1] = color['g'];
				pixels[pos + 2] = color['b'];
				pixels[pos + 3] = color['a'];
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
DET.drawScatterBarPlotRowClassBar = function(mapItem, pixels, pos, start, length, height, classBarValues, mapWidth, colorMap, currentClassBar) {
	const barFgColor = colorMap.getHexToRgba(currentClassBar.fg_color);
	const barBgColor = colorMap.getHexToRgba(currentClassBar.bg_color);
	const barCutColor = colorMap.getHexToRgba("#FFFFFF");
	const matrix = SUM.buildScatterBarPlotMatrix(height, classBarValues, start-1, length, currentClassBar, MMGR.getHeatMap().getTotalRows(), false);
	for (let h = matrix[0].length-1; h >= 0 ; h--) { 
		for (let j = 0; j < mapItem.dataBoxHeight; j++) {
			for (let i = 0; i < height;i++) {
				const row = matrix[i];
				const posVal = row[h];
				if (posVal == 1) {
					pixels[pos] = barFgColor['r'];
					pixels[pos+1] = barFgColor['g'];
					pixels[pos+2] = barFgColor['b'];
					pixels[pos+3] = barFgColor['a'];
				} else if (posVal == 2) {
					pixels[pos] = barCutColor['r'];
					pixels[pos+1] = barCutColor['g'];
					pixels[pos+2] = barCutColor['b'];
					pixels[pos+3] = barCutColor['a'];
				} else {
					if (currentClassBar.subBgColor !== "#FFFFFF") {
						pixels[pos] = barBgColor['r'];
						pixels[pos+1] = barBgColor['g'];
						pixels[pos+2] = barBgColor['b'];
						pixels[pos+3] = barBgColor['a'];
					}
				}
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
		    const drawWin = SEL.getDetailWindow(mapItem);
		    DET.drawDetailHeatMap(mapItem, drawWin);
		});
	    }
	    const ready = mapItem.glManager.check(initDetailContext);
	    if (ready) {
		const ctx = mapItem.glManager.context;
		ctx.viewportWidth = mapItem.dataViewWidth+DET.calculateTotalClassBarHeight("row");
		ctx.viewportHeight = mapItem.dataViewHeight+DET.calculateTotalClassBarHeight("column");
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

(function() {
	// Define a function to switch a panel to the detail view.
	// Similar to the corresponding function for switching a pane to the summary view.
	// See additional comments in that function.
	DET.switchPaneToDetail = switchPaneToDetail;
	PANE.registerPaneContentOption ('Detail heatmap', switchPaneToDetail);
	DET.setButtons = setButtons;

	var initialSwitchPaneToDetail = true

	function switchPaneToDetail (loc, restoreInfo) {
		if (loc.pane === null) return;  //Builder logic for panels that don't show detail
		const debug = false;
		const paneId = loc.pane.id; // paneId needed by callbacks. loc may not be valid in callback.
		const isPrimary = restoreInfo ? restoreInfo.isPrimary : (DMM.primaryMap === null);
		const mapNumber = restoreInfo ? restoreInfo.mapNumber : DMM.nextMapNumber;

		PANE.clearExistingGearDialog(paneId);
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
		if (!restoreInfo) { DMM.nextMapNumber++; }

		/* Clone DIV#detail_chm from DIV#templates. */
		let chm = cloneDetailChm (mapNumber);
		loc.pane.appendChild (chm);
		PANE.setPaneClientIcons(loc, [
		    zoomButton ('primary_btn'+mapNumber, 'images/primary.png', 'images/primaryHover.png', 'Set to Primary', 75, DMM.switchToPrimary.bind('chm', loc.pane.children[1])),
		    zoomButton ('zoomOut_btn'+mapNumber, 'images/zoomOut.png', 'images/zoomOutHover.png', 'Zoom Out', 50, DEV.detailDataZoomOut.bind('chm', loc.pane.children[1])),
		    zoomButton ('zoomIn_btn'+mapNumber, 'images/zoomIn.png', 'images/zoomInHover.png', 'Zoom In', 40, DEV.zoomAnimation.bind('chm', loc.pane.children[1])),
		    modeButton (mapNumber, paneId, true,  'NORMAL',  'Normal View', 65, DEV.detailNormal),
		    modeButton (mapNumber, paneId, false, 'RIBBONH', 'Horizontal Ribbon View', 115, DEV.detailHRibbonButton),
		    modeButton (mapNumber, paneId, false, 'RIBBONV', 'Vertical Ribbon View', 100, DEV.detailVRibbonButton)
		]);
		const mapItem = DMM.addDetailMap (chm, paneId, mapNumber, isPrimary, restoreInfo ? restoreInfo.paneInfo : null);
		// If primary is collapsed set chm detail of clone to visible
		if (!restoreInfo && chm.style.display === 'none') {
			chm.style.display = '';
		}
		SUM.drawLeftCanvasBox();
		DEV.addEvents(paneId);
		if (isPrimary) {
			document.getElementById('primary_btn'+mapNumber).style.display = 'none';
			PANE.setPaneTitle (loc, 'Heat Map Detail - Primary');
		} else {
			document.getElementById('primary_btn'+mapNumber).style.display = '';
			PANE.setPaneTitle (loc, 'Heat Map Detail - Ver ' + mapNumber);
		}
		PANE.registerPaneEventHandler (loc.pane, 'empty', emptyDetailPane);
		PANE.registerPaneEventHandler (loc.pane, 'resize', resizeDetailPane);
		DET.setDrawDetailTimeout (mapItem, 0, true);
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
		colLabels.oncontextmenu = function(event) { DET.labelRightClick(event); };
		labels.appendChild(colLabels)
		let rowLabels = document.createElement('div')
		rowLabels.setAttribute('id','rowLabelDiv')
		rowLabels.setAttribute('data-axis','Row')
		rowLabels.setAttribute('style','display: inline-block; position: absolute; bottom: 0px;')
		rowLabels.oncontextmenu = function(event) { DET.labelRightClick(event); };
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


	// Table to convert image names to image source names.
	// A table is required for this otherwise trivial conversion
	// because the minimizer will convert all the filenames in the
	// table to inline data sources.
	const imageTable = {
	    full: 'images/full.png',
	    fullHover: 'images/fullHover.png',
	    full_selected: 'images/full_selected.png',
	    ribbonH: 'images/ribbonH.png',
	    ribbonHHover: 'images/ribbonHHover.png',
	    ribbonH_selected: 'images/ribbonH_selected.png',
	    ribbonV: 'images/ribbonV.png',
	    ribbonVHover: 'images/ribbonVHover.png',
	    ribbonV_selected: 'images/ribbonV_selected.png',
	};

	// Return the baseName of the zoom mode buttons.
	function buttonBaseName (buttonMode) {
		if (buttonMode == 'RIBBONH') return 'ribbonH';
		if (buttonMode == 'RIBBONV') return 'ribbonV';
		return 'full';
	}

	/**********************************************************************************
	 * FUNCTION - setButtons: The purpose of this function is to set the state of
	 * buttons on the detail pane header bar when the user selects a button.
	 **********************************************************************************/
	function setButtons (mapItem) {
		const full_btn = document.getElementById('full_btn'+mapItem.panelNbr);
		const ribbonH_btn = document.getElementById('ribbonH_btn'+mapItem.panelNbr);
		const ribbonV_btn = document.getElementById('ribbonV_btn'+mapItem.panelNbr);
		let full_src= "full";
		let ribbonH_src= "ribbonH";
		let ribbonV_src= "ribbonV";
		if (mapItem.mode=='RIBBONV')
			ribbonV_src += "_selected";
		else if (mapItem.mode == "RIBBONH")
			ribbonH_src += "_selected";
		else
			full_src += "_selected";
		full_btn.src = imageTable[full_src];
		ribbonH_btn.src = imageTable[ribbonH_src];
		ribbonV_btn.src = imageTable[ribbonV_src];
	}


	// Update a mode button image when the mouse enters/leaves the button.
	// btn is the IMG element for the button.
	// It should have data.mode set to NORMAL, RIBBONH, or RIBBONV.
	// The button's image is updated according to the following rules:
	//
	// - If in a zoom mode that matches the button, the image is not changed.
	//   (The button's image should already be set to the _selected image variant.)
	//   The "includes" check is used so that e.g. both the RIBBONH and RIBBONH_DETAIL
	//   zoom modes will match the RIBBONH button.
	//
	// - Otherwise, if the mouse is hovering over the image: the hover image is used.
	//
	// - Otherwise, the base image is used.
	//
	function updateButtonImage (btn, hovering) {
	        const loc = PANE.findPaneLocation (btn);
		const mapItem = DMM.getMapItemFromPane (loc.pane.id);
		const buttonMode = btn.dataset.mode;
		if (!mapItem.mode.includes(buttonMode)) {
			let buttonSrc = buttonBaseName (buttonMode);
			if (hovering) {
			        buttonSrc += 'Hover';
			}
			btn.setAttribute('src', imageTable[buttonSrc]);
		}
	}

	function emptyDetailPane (loc, elements) {
		DMM.RemoveDetailMap(loc.pane.id);
		SUM.drawLeftCanvasBox ();
	}

	function resizeDetailPane (loc) {
		DMM.detailResize();
		DET.setDrawDetailTimeout(DMM.getMapItemFromPane(loc.pane.id), DET.redrawSelectionTimeout, false);
	}

	function zoomButton (btnId, btnIcon, btnHoverIcon, btnHelp, btnSize, clickFn) {
	    const img = UTIL.newElement ('IMG#'+btnId, { src: btnIcon, alt: btnHelp });
	    img.onmouseout = function (e) {
			img.setAttribute ('src', btnIcon);
			UHM.hlpC();
	    };
	    img.onmouseover = function (e) {
			img.setAttribute ('src', btnHoverIcon);
			UHM.hlp(img, btnHelp, btnSize);
	    };
	    img.onclick = function (e) {
			clickFn();
	    };
	    return UTIL.newElement ('SPAN.tdTop', {}, [img]);
	}

	// Create a zoomModeButton when creating a new zoomed view.
	// Parameters:
	// mapNumber - the number of the new zoomed view
	// paneId - the panel id containing the new zoomed view
	// selected - is this button selected initially (must be set for exactly one button in the map)
	// mode - the type of zoom mode set by pressing the button (NORMAL, RIBBONH, RIBBONV)
	// btnHelp - help text to display when the user hovers over the button for a while
	// btnSize - size of the button help text
	// clickFn - function called when the button is clicked.
	function modeButton (mapNumber, paneId, selected, mode, btnHelp, btnSize, clickFn) {
		const baseName = buttonBaseName (mode);
		const selStr = selected ? '_selected' : '';
		const img = UTIL.newElement ('IMG', { src: imageTable[baseName+selStr], alt: btnHelp });
		img.id = baseName + '_btn' + mapNumber;
		img.dataset.mode = mode;
		img.onmouseout = function (e) {
			updateButtonImage (img, false);
			UHM.hlpC();
		};
		img.onmouseover = function (e) {
			updateButtonImage (img, true);
			UHM.hlp(img, btnHelp, btnSize);
		};
		img.onclick = function (e) {
			const mapItem = DMM.getMapItemFromPane(paneId);
			DEV.clearModeHistory (mapItem);
			clickFn(mapItem);
		};
		return UTIL.newElement ('SPAN.tdTop', {}, [img]);
	}

})();

})();
