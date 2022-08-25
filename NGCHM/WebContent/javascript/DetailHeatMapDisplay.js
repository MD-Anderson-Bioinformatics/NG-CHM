//Define Namespace for NgChm DetailHeatMapDisplay
NgChm.createNS('NgChm.DET');


NgChm.DET.initialized = false;
NgChm.DET.labelLastClicked = {};
NgChm.DET.mouseDown = false;
NgChm.DET.minLabelSize = 5;
NgChm.DET.resizeOnNextDraw = false;
NgChm.DET.paddingHeight = 2;          // space between classification bars
NgChm.DET.SIZE_NORMAL_MODE = 506;
NgChm.DET.dataViewBorder = 2;
NgChm.DET.zoomBoxSizes = [1,2,3,4,6,7,8,9,12,14,18,21,24,28,36,42,56,63,72,84,126,168,252];
NgChm.DET.eventTimer = 0; // Used to delay draw updates
NgChm.DET.maxLabelSize = 11;
NgChm.DET.redrawSelectionTimeout = 0;   // Drawing delay in ms after the view has changed.
NgChm.DET.redrawUpdateTimeout = 10;	// Drawing delay in ms after a tile update (if needed).
NgChm.DET.minPixelsForGrid = 20;	// minimum element size for grid lines to display
NgChm.DET.detailPoint = null;
NgChm.DET.animating = false; 

//We keep a copy of the last rendered detail heat map for each layer.
//This enables quickly redrawing the heatmap when flicking between layers, which
//needs to be nearly instant to be effective.
//The copy will be invalidated and require drawing if any parameter affecting
//drawing of that heat map is changed or if a new tile that could affect it
//is received.
NgChm.DET.detailHeatMapCache = {};      // Last rendered detail heat map for each layer
NgChm.DET.detailHeatMapLevel = {};      // Level of last rendered heat map for each layer
NgChm.DET.detailHeatMapValidator = {};  // Encoded drawing parameters used to check heat map is current

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
NgChm.DET.processDetailMapUpdate = function (event, tile) {
	if (event == NgChm.MMGR.Event_INITIALIZED) {
		NgChm.DMM.InitDetailMap(document.getElementById('detail_chm'));
		NgChm.heatMap.configureButtonBar();
		//If URL search parameter has been specified, execute search upon initialization of the detail panel
		const searchParam = NgChm.UTIL.getURLParameter('search')
		if (searchParam !== "") {
			let searchElement = document.getElementById('search_text');
			searchElement.value = searchParam;
			NgChm.SRCH.detailSearch();
		}
	} else {
		NgChm.DET.flushDrawingCache(tile);
	} 
}

/*********************************************************************************************
 * FUNCTION:  setDrawDetailsTimeout - The purpose of this function is to call the drawing 
 * routine timer for all existing heat map panels.
 *********************************************************************************************/
NgChm.DET.setDrawDetailsTimeout = function (ms, noResize) {
	for (let i=0; i<NgChm.DMM.DetailMaps.length;i++ ) {
		const mapItem = NgChm.DMM.DetailMaps[i];
		NgChm.DET.setDrawDetailTimeout(mapItem,ms,noResize);
	}
}

/*********************************************************************************************
 * FUNCTION:  setDrawDetailTimeout - The purpose of this function is to redraw a detail 
 * heatmap after ms milliseconds to a detail heat map pane. noResize is used to skip the resize routine and help speed 
 * up the drawing routine for some cases. If noResize is true for every call to setDrawDetailTimeout, 
 * the resize routine will be skipped on the next redraw.
 *********************************************************************************************/
NgChm.DET.setDrawDetailTimeout = function (mapItem, ms, noResize) {
	if (NgChm.DET.drawEventTimer) {
		clearTimeout (NgChm.DET.drawEventTimer);
	}
	const drawWin = NgChm.SEL.getDetailWindow(mapItem);

	if (noResize) {
		NgChm.DET.resizeOnNextDraw = true;
		NgChm.DET.drawDetailHeatMap(mapItem, drawWin);
	} else {
		NgChm.DET.resizeOnNextDraw = true;
		NgChm.DET.drawEventTimer = setTimeout(function drawDetailTimeout () {
			if (mapItem.chm) {
				NgChm.DET.drawDetailHeatMap(mapItem, drawWin);
			}
		}, ms);
	}
}

/*********************************************************************************************
 * FUNCTION:  flushDrawingCache - The purpose of this function is to process the receipt of
 * a new data tile on the primary heat map panel. It causes any cached heat map affected by 
 * the new tile to be redrawn the next time it is displayed.  The currently displayed primary
 * heat map will be redrawn after a short delay if it might be affected by the tile.
 *********************************************************************************************/
NgChm.DET.flushDrawingCache = function (tile) {
	// The cached heat map for the tile's layer will be
	// invalidated if the tile's level matches the level
	// of the cached heat map.
	//
	// This assumes that only updates to the same level require an update.
	// Reasonable here since the only possible lower levels (thumbnail
	// and summary) are fully prefetched at initialization.
	// In any case, data for the drawing window's level should also arrive soon
	// and the heat map would be redrawn then.
	if (NgChm.DET.detailHeatMapCache.hasOwnProperty (tile.layer) &&
	    NgChm.DET.detailHeatMapLevel[tile.layer] === tile.level) {
		NgChm.DET.detailHeatMapValidator[tile.layer] = '';
		if (tile.layer === NgChm.DMM.primaryMap.currentDl) {
			// Redraw 'now' if the tile is for the currently displayed layer.
			NgChm.DET.setDrawDetailTimeout(NgChm.DMM.primaryMap,NgChm.DET.redrawUpdateTimeout);
		}
	}
}

/*********************************************************************************************
 * FUNCTION:  setDetailMapDisplay - The purpose of this function is to complete the construction
 * of a detail heat map object and add it to the DetailMaps object array.
 *********************************************************************************************/
NgChm.DET.setDetailMapDisplay = function (mapItem) {
	NgChm.DET.setDendroShow(mapItem);
	//If we are opening the first detail "copy" of this map set the data sizing for initial display
	if (NgChm.DMM.DetailMaps.length === 0) {
		NgChm.DET.setInitialDetailDisplaySize(mapItem);
	}
	NgChm.LNK.createLabelMenus();
	NgChm.DET.setDendroShow(mapItem);
	if (mapItem.canvas) {
		mapItem.canvas.width =  (mapItem.dataViewWidth + NgChm.DET.calculateTotalClassBarHeight("row"));
		mapItem.canvas.height = (mapItem.dataViewHeight + NgChm.DET.calculateTotalClassBarHeight("column"));
	}
	
	setTimeout (function() {
		NgChm.DET.detSetupGl(mapItem);
		NgChm.DET.detInitGl(mapItem);
		NgChm.SEL.updateSelection(mapItem);
		if (NgChm.UTIL.getURLParameter("selected") !== ""){
			const selected = NgChm.UTIL.getURLParameter("selected").replace(","," ");
			document.getElementById("search_text").value = selected;
			if (mapItem.version === 'P') {  
				NgChm.SRCH.detailSearch();
				NgChm.SUM.drawSelectionMarks();
				NgChm.SUM.drawTopItems();
			}
		}
	}, 1);
  	
  	NgChm.DMM.DetailMaps.push(mapItem);
  	if (mapItem.version === 'P') {
  		NgChm.DMM.primaryMap = mapItem;
  	}
}

/*********************************************************************************************
 * FUNCTION:  setInitialDetailDisplaySize - The purpose of this function is to set the initial
 * detail display sizing (dataPerRow/Col, dataViewHeight/Width) for the heat map.
 *********************************************************************************************/
NgChm.DET.setInitialDetailDisplaySize = function (mapItem) {
	// Small Maps - Set detail data size.  If there are less than 42 rows or columns
	// set the to show the box size closest to the lower value ELSE
	// set it to show 42 rows/cols.
	const rows = NgChm.heatMap.getNumRows(NgChm.MMGR.DETAIL_LEVEL);
	const cols = NgChm.heatMap.getNumColumns(NgChm.MMGR.DETAIL_LEVEL);
	if ((rows < 42) || (cols < 42)) {
		const boxSize = NgChm.DET.getNearestBoxSize(mapItem, Math.min(rows,cols));
		NgChm.DET.setDetailDataSize(mapItem,boxSize); 
	} else {
		NgChm.DET.setDetailDataSize(mapItem,12);
	}
}

/*********************************************************************************************
 * FUNCTION:  drawDetailHeatMap - The purpose of this function is to draw the region of the 
 * NGCHM specified by drawWin to a detail heat map pane.
 *********************************************************************************************/
NgChm.DET.drawDetailHeatMap = function (mapItem, drawWin) {
	NgChm.DET.setDendroShow(mapItem);
	if (NgChm.DET.resizeOnNextDraw) {
		NgChm.DMM.detailResize();
		NgChm.DET.resizeOnNextDraw = false;
	}
	NgChm.DET.setViewPort(mapItem);
	NgChm.DET.setDetBoxCanvasSize(mapItem);

	// Together with the data, these parameters determine the color of a matrix value.
	const colorMap = NgChm.heatMap.getColorMapManager().getColorMap("data", drawWin.layer);
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
		rowBarWidths: NgChm.heatMap.getCovariateBarHeights("row"),
		colBarHeights: NgChm.heatMap.getCovariateBarHeights("column"),
		rowBarTypes: NgChm.heatMap.getCovariateBarTypes("row"),
		colBarTypes: NgChm.heatMap.getCovariateBarTypes("column"),
		rowDendroHeight: NgChm.heatMap.getRowDendroConfig().height,
		colDendroHeight: NgChm.heatMap.getColDendroConfig().height,
		searchRows: NgChm.SRCH.getAxisSearchResults("Row"),
		searchCols: NgChm.SRCH.getAxisSearchResults("Column"),
		searchGridColor: [0,0,0]
	};

	// Set parameters that depend on the data layer properties.
	{
		const dataLayers = NgChm.heatMap.getDataLayers();
		const dataLayer = dataLayers[drawWin.layer];
		const showGrid = dataLayer.grid_show === 'Y';
		const detWidth = + mapItem.boxCanvas.style.width.replace("px","");
		const detHeight = + mapItem.boxCanvas.style.height.replace("px","");
		params.showVerticalGrid = showGrid && params.dataBoxWidth > mapItem.minLabelSize && NgChm.DET.minPixelsForGrid*drawWin.numCols <= detWidth;
		params.showHorizontalGrid = showGrid && params.dataBoxHeight > mapItem.minLabelSize && NgChm.DET.minPixelsForGrid*drawWin.numRows <= detHeight;
		params.grid_color = dataLayer.grid_color;
		params.selection_color = dataLayer.selection_color;
		params.cuts_color = dataLayer.cuts_color;
	}

	const renderBuffer = NgChm.DET.getDetailHeatMap (mapItem, drawWin, params);

	//WebGL code to draw the summary heat map.
	mapItem.gl.useProgram(mapItem.gl.program);
	mapItem.gl.activeTexture(mapItem.gl.TEXTURE0);
	mapItem.gl.texImage2D(
			mapItem.gl.TEXTURE_2D,
			0,
			mapItem.gl.RGBA,
			renderBuffer.width,
			renderBuffer.height,
			0,
			mapItem.gl.RGBA,
			mapItem.gl.UNSIGNED_BYTE,
			renderBuffer.pixels);
	mapItem.gl.uniform2fv(mapItem.uScale, mapItem.canvasScaleArray);
	mapItem.gl.uniform2fv(mapItem.uTranslate, mapItem.canvasTranslateArray);
	mapItem.gl.drawArrays(mapItem.gl.TRIANGLE_STRIP, 0, mapItem.gl.buffer.numItems);

	// Draw the dendrograms
	mapItem.colDendro.draw();
	mapItem.rowDendro.draw();

	//Draw any selection boxes defined by SearchRows/SearchCols
	NgChm.DET.drawSelections();
	NgChm.DET.initialized = true;
};

/*********************************************************************************************
 * FUNCTION:  getDetailHeatMap - The purpose of this function is to return a renderBuffer 
 * containing an image of the region of the NGCHM specified by drawWin rendered using the 
 * parameters in params.handle a user mouse down event.  
 *********************************************************************************************/
NgChm.DET.getDetailHeatMap = function (mapItem, drawWin, params) {

	const layer = drawWin.layer;
	const paramCheck = JSON.stringify({ drawWin, params });
	if (NgChm.DET.detailHeatMapValidator[layer] === paramCheck) {
		//Cached image exactly matches what we need.
		return NgChm.DET.detailHeatMapCache[layer];
	}

	// Determine size of required image.
	const rowClassBarWidth = params.rowBarWidths.reduce((t,w) => t+w, 0);
	const colClassBarHeight = params.colBarHeights.reduce((t,h) => t+h, 0);
	const texWidth = params.mapWidth + rowClassBarWidth;
	const texHeight = params.mapHeight + colClassBarHeight;

	if (NgChm.DET.detailHeatMapCache.hasOwnProperty(layer)) {
		// Resize the existing renderBuffer if needed.
		NgChm.DET.detailHeatMapCache[layer].resize (texWidth, texHeight);
	} else {
		// Or create a new one if needed.
		NgChm.DET.detailHeatMapCache[layer] = NgChm.DRAW.createRenderBuffer (texWidth, texHeight, 1.0);
	}
	// Save data needed for determining if the heat map image will match the next request.
	NgChm.DET.detailHeatMapValidator[layer] = paramCheck;
	NgChm.DET.detailHeatMapLevel[layer] = drawWin.level;

	// create these variables now to prevent having to call them in the for-loop
	const currDetRow = drawWin.firstRow;
	const currDetCol = drawWin.firstCol;
	const detDataPerRow = drawWin.numCols;
	const detDataPerCol = drawWin.numRows;

	// Define a function for outputting reps copy of line
	// to the renderBuffer for this layer.
	const renderBuffer = NgChm.DET.detailHeatMapCache[layer];
	const emitLines = (function() {
		// Start outputting data to the renderBuffer after one line
		// of blank space.
		// Line must be renderBuffer.width pixels wide.
		// Using |0 ensures values are converted to integers.
		const lineBytes = (renderBuffer.width * NgChm.SUM.BYTE_PER_RGBA)|0;
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

	const colorMap = NgChm.heatMap.getColorMapManager().getColorMap("data",layer);

	const dataGridColor = colorMap.getHexToRgba(params.grid_color);
	const dataSelectionColorRGB = colorMap.getHexToRgba(params.selection_color);
	const dataSelectionColor = [dataSelectionColorRGB.r/255, dataSelectionColorRGB.g/255, dataSelectionColorRGB.b/255, 1];
	const regularGridColor = [dataGridColor.r, dataGridColor.g, dataGridColor.b];
	const cutsColor = colorMap.getHexToRgba(params.cuts_color);


	//Build a horizontal grid line for use between data lines. Tricky because some dots will be selected color if a column is in search results.
	const linelen = texWidth * NgChm.SUM.BYTE_PER_RGBA;
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
		let linePos = (rowClassBarWidth)*NgChm.SUM.BYTE_PER_RGBA;
		linePos+=NgChm.SUM.BYTE_PER_RGBA;
		for (let j = 0; j < detDataPerRow; j++) {
			//When building grid line check for vertical cuts by grabbing value of currentRow (any row really) and column being iterated to
			const val = NgChm.heatMap.getValue(drawWin.level, currDetRow, currDetCol+j);
			const nextVal = NgChm.heatMap.getValue(drawWin.level, currDetRow, currDetCol+j+1);
			const gridColor = ((params.searchCols.indexOf(mapItem.currentCol+j) > -1) || (params.searchCols.indexOf(mapItem.currentCol+j+1) > -1)) ? params.searchGridColor : regularGridColor;
			for (let k = 0; k < mapItem.dataBoxWidth; k++) {
				//If current column contains a cut value, write an empty white position to the gridline, ELSE write out appropriate grid color
				if (val <= NgChm.SUM.minValues) {
					if ((k === mapItem.dataBoxWidth - 1) && (nextVal > NgChm.SUM.minValues)) {
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
				linePos += NgChm.SUM.BYTE_PER_RGBA;
			}
		}
		linePos+=NgChm.SUM.BYTE_PER_RGBA;
	}
	
	let line = new Uint8Array(new ArrayBuffer((rowClassBarWidth + mapItem.dataViewWidth) * NgChm.SUM.BYTE_PER_RGBA));

	//Needs to go backward because WebGL draws bottom up.
	for (let i = detDataPerCol-1; i >= 0; i--) {
		let linePos = (rowClassBarWidth)*NgChm.SUM.BYTE_PER_RGBA;
		//If all values in a line are "cut values" AND (because we want gridline at bottom of a row with data values) all values in the 
		// preceding line are "cut values" mark the current line as as a horizontal cut
		const isHorizCut = NgChm.DET.isLineACut(mapItem,i) && NgChm.DET.isLineACut(mapItem,i-1);
		linePos+=NgChm.SUM.BYTE_PER_RGBA;
		for (let j = 0; j < detDataPerRow; j++) { // for every data point...
			let val = NgChm.heatMap.getValue(drawWin.level, currDetRow+i, currDetCol+j);
	        let nextVal = NgChm.heatMap.getValue(drawWin.level, currDetRow+i, currDetCol+j+1);
	        if (val !== undefined) {
	            const color = colorMap.getColor(val);
	            
				//For each data point, write it several times to get correct data point width.
				for (let k = 0; k < mapItem.dataBoxWidth; k++) {
					if (params.showVerticalGrid && k===mapItem.dataBoxWidth-1 && j < detDataPerRow-1 ){ // should the grid line be drawn?
						if (j < detDataPerRow-1) {
							//If current value being drawn into the line is a cut value, draw a transparent white position for the grid
							if ((val <= NgChm.SUM.minValues) && (nextVal <= NgChm.SUM.minValues)) {
								line[linePos] = cutsColor.r; line[linePos+1] = cutsColor.g; line[linePos+2] = cutsColor.b;	line[linePos+3] = cutsColor.a;
							} else {
								line[linePos] = regularGridColor[0]; line[linePos+1] = regularGridColor[1]; line[linePos+2] = regularGridColor[2];	line[linePos+3] = 255;
							}
						}
					} else {
						line[linePos] = color['r'];	line[linePos + 1] = color['g'];	line[linePos + 2] = color['b'];	line[linePos + 3] = color['a'];
					}
					linePos += NgChm.SUM.BYTE_PER_RGBA;
				}
	        }
		}
		linePos+=NgChm.SUM.BYTE_PER_RGBA;
		
		//Write each line several times to get correct data point height.
		const numGridLines = params.showHorizontalGrid && i > 0 ? 1 : 0;
		emitLines (line, mapItem.dataBoxHeight - numGridLines)
		emitLines (isHorizCut ? cutsLine : gridLine, numGridLines);
	}

	//Draw covariate bars.
	NgChm.DET.detailDrawColClassBars(mapItem, renderBuffer.pixels);
	NgChm.DET.detailDrawRowClassBars(mapItem, renderBuffer.pixels);

	return renderBuffer;
}

/**********************************************************************************
 * FUNCTION - isLineACut: The purpose of this function is to determine if a given
 * row line is a cut (or gap) line and return a true/false boolean.
 **********************************************************************************/
NgChm.DET.isLineACut = function (mapItem, row) {
	let lineIsCut = true;
	const level = NgChm.SEL.getLevelFromMode(mapItem, NgChm.MMGR.DETAIL_LEVEL);
	const currDetRow = NgChm.SEL.getCurrentDetRow(mapItem);
	const currDetCol = NgChm.SEL.getCurrentDetCol(mapItem);
	const detDataPerRow = NgChm.SEL.getCurrentDetDataPerRow(mapItem);
	for (let x = 0; x < detDataPerRow; x++) { // for every data point...
		const val = NgChm.heatMap.getValue(level, currDetRow+row, currDetCol+x);
		//If any values on the row contain a value other than the cut value, mark lineIsCut as false
		if (val > NgChm.SUM.minValues) {
			return false;
		}
	}
	return true;
}

/*********************************************************************************************
 * FUNCTION:  setDetBoxCanvasSize - The purpose of this function is to set the size of the 
 * detail box canvas to match that of the heat map canvas.  
 *********************************************************************************************/
NgChm.DET.setDetBoxCanvasSize = function (mapItem) {
	mapItem.boxCanvas.width =  mapItem.canvas.clientWidth;
	mapItem.boxCanvas.height = mapItem.canvas.clientHeight;
	mapItem.boxCanvas.style.left=mapItem.canvas.style.left;
	mapItem.boxCanvas.style.top=mapItem.canvas.style.top;
}

/*********************************************************************************************
 * FUNCTION: getNearestBoxSize  -  The purpose of this function is to loop zoomBoxSizes to 
 * pick the one that will be large enough to encompass user-selected area
 *********************************************************************************************/
NgChm.DET.getNearestBoxSize = function (mapItem, sizeToGet) {
	let boxSize = 0;
	for (let i=NgChm.DET.zoomBoxSizes.length-1; i>=0;i--) {
		boxSize = NgChm.DET.zoomBoxSizes[i];
		boxCalcVal = (mapItem.dataViewWidth-NgChm.DET.dataViewBorder)/boxSize;
		if (boxCalcVal >= sizeToGet) {
			//Down size box if greater than map dimensions.
			if (boxCalcVal > Math.min(NgChm.heatMap.getTotalRows(),NgChm.heatMap.getTotalCols())) {
				boxSize = NgChm.DET.zoomBoxSizes[i+1];
			}
			break;
		}
	}
	return boxSize;
}

/*********************************************************************************************
 * FUNCTION: getNearestBoxHeight  -  The purpose of this function is to loop zoomBoxSizes to pick the one that 
 * will be large enough to encompass user-selected area.
 *********************************************************************************************/
NgChm.DET.getNearestBoxHeight = function (mapItem, sizeToGet) {
	let boxSize = 0;
	for (let i=NgChm.DET.zoomBoxSizes.length-1; i>=0;i--) {
		boxSize = NgChm.DET.zoomBoxSizes[i];
		const boxCalcVal = (mapItem.dataViewHeight-NgChm.DET.dataViewBorder)/boxSize;
		if (boxCalcVal >= sizeToGet) {
			//Down size box if greater than map dimensions.
			if (boxCalcVal > Math.min(NgChm.heatMap.getTotalRows(),NgChm.heatMap.getTotalCols())) {
				boxSize = NgChm.DET.zoomBoxSizes[i+1];
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
NgChm.DET.scaleViewWidth = function (mapItem) {
  scale = Math.max(Math.floor(500/NgChm.heatMap.getNumColumns(NgChm.MMGR.SUMMARY_LEVEL)), 1)
  mapItem.dataViewWidth=(NgChm.heatMap.getNumColumns(NgChm.MMGR.SUMMARY_LEVEL) * scale) + NgChm.DET.dataViewBorder;
  NgChm.DET.setDetailDataWidth(mapItem, scale);
}

/**********************************************************************************
 * FUNCTION - scaleViewHeight: For maps that have less rows/columns than the size 
 * of the detail panel, matrix elements get height more than 1 pixel, scale calculates 
 * the appropriate height/width.
 **********************************************************************************/
NgChm.DET.scaleViewHeight = function (mapItem) {
  scale = Math.max(Math.floor(500/NgChm.heatMap.getNumRows(NgChm.MMGR.SUMMARY_LEVEL)), 1)
  mapItem.dataViewHeight= (NgChm.heatMap.getNumRows(NgChm.MMGR.SUMMARY_LEVEL) * scale) + NgChm.DET.dataViewBorder;
  NgChm.DET.setDetailDataHeight(mapItem, scale);
  
}

/**********************************************************************************
 * FUNCTION - setDetailDataSize: The purpose of this function is to determine and
 * set how big each data point should be in a given detail pane.
 **********************************************************************************/
NgChm.DET.setDetailDataSize = function (mapItem, size) {
	NgChm.DET.setDetailDataWidth (mapItem, size);
	NgChm.DET.setDetailDataHeight(mapItem, size);
}
 
/**********************************************************************************
 * FUNCTION - setDetailDataWidth: The purpose of this function is to determine and
 * set how big the detail data width should be for a given detail pane.
 **********************************************************************************/
NgChm.DET.setDetailDataWidth = function (mapItem, size) {
	const prevDataPerRow = mapItem.dataPerRow;
	mapItem.dataBoxWidth = size;
	NgChm.SEL.setDataPerRowFromDet(Math.floor((mapItem.dataViewWidth-NgChm.DET.dataViewBorder)/mapItem.dataBoxWidth), mapItem);

	//Adjust the current column based on zoom but don't go outside or the heat map matrix dimensions.
	if (!mapItem.modeHistory) mapItem.modeHistory = [];
	if ((prevDataPerRow != null) && (mapItem.modeHistory.length === 0)){
		if (prevDataPerRow > mapItem.dataPerRow) {
			mapItem.currentCol += Math.floor((prevDataPerRow - mapItem.dataPerRow) / 2);
		} else {
			mapItem.currentCol -= Math.floor((mapItem.dataPerRow - prevDataPerRow) / 2);
		}
	}
	NgChm.SEL.checkCol(mapItem);
}

/**********************************************************************************
 * FUNCTION - setDetailDataHeight: The purpose of this function is to determine and
 * set how big the detail data height should be for a given detail pane.
 **********************************************************************************/
NgChm.DET.setDetailDataHeight = function (mapItem, size) {
	const prevDataPerCol = mapItem.dataPerCol;
	mapItem.dataBoxHeight = size;
	NgChm.SEL.setDataPerColFromDet(Math.floor((mapItem.dataViewHeight-NgChm.DET.dataViewBorder)/mapItem.dataBoxHeight), mapItem);
	if (!mapItem.modeHistory) mapItem.modeHistory = [];
	
	//Adjust the current row but don't go outside of the current heat map dimensions
	if ((prevDataPerCol != null) && (mapItem.modeHistory.length === 0)){
		if (prevDataPerCol > mapItem.dataPerCol)
			mapItem.currentRow += Math.floor((prevDataPerCol - mapItem.dataPerCol) / 2);
		else
			mapItem.currentRow -= Math.floor((mapItem.dataPerCol - prevDataPerCol) / 2);
	}
	NgChm.SEL.checkRow(mapItem);
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

    NgChm.DET.drawSelections = function drawSelections () {

	// Determine values that are constant across all detail panes.
	//
        const dataLayers = NgChm.heatMap.getDataLayers();
	const mapNumRows = NgChm.heatMap.getNumRows('d');
	const mapNumCols = NgChm.heatMap.getNumColumns('d');

	// Retrieve contiguous row and column search arrays
	const searchRows = NgChm.SRCH.getAxisSearchResults("Row");
	const rowRanges = NgChm.DET.getContigSearchRanges(searchRows);
	const searchCols = NgChm.SRCH.getAxisSearchResults("Column");
	const colRanges = NgChm.DET.getContigSearchRanges(searchCols);

	// Get total row and column bar "heights".
	totalColBarHeight = NgChm.DET.calculateTotalClassBarHeight("column");
	totalRowBarHeight = NgChm.DET.calculateTotalClassBarHeight("row");

	for (let k=0; k<NgChm.DMM.DetailMaps.length;k++ ) {
	        // Get context for this detail map.
		const mapItem = NgChm.DMM.DetailMaps[k];
		mapItemVars.ctx = mapItem.boxCanvas.getContext("2d");
		calcMapItemVariables (mapItem);

		// Clear entire box canvas.
		mapItemVars.ctx.clearRect(0, 0, mapItem.boxCanvas.width, mapItem.boxCanvas.height);
	
		//Draw the border
		if (NgChm.UTIL.mapHasGaps() === false) {
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
		mapItemVars.cellWidth = mapItemVars.mapXWidth/NgChm.SEL.getCurrentDetDataPerRow(mapItem);
	} else {
		mapItemVars.cellWidth = mapItemVars.mapXWidth/mapItem.dataPerRow;
	}
	// height of a data cell in pixels
	if (mapItem.mode === 'NORMAL' || mapItem.mode === 'RIBBONH') {
		mapItemVars.cellHeight = mapItemVars.mapYHeight/NgChm.SEL.getCurrentDetDataPerCol(mapItem);
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
NgChm.DET.sizeCanvasForLabels = function() {
	for (let i=0; i<NgChm.DMM.DetailMaps.length;i++ ) {
		const mapItem = NgChm.DMM.DetailMaps[i];
		NgChm.DET.resetLabelLengths(mapItem);
		if (mapItem.pane !== "") {  //Used by builder which does not contain the detail pane necessary, nor the use, for this logic
			NgChm.DET.calcRowAndColLabels(mapItem);
			NgChm.DET.calcClassRowAndColLabels(mapItem);
			NgChm.DET.setViewPort(mapItem);
		}
	}
};

/************************************************************************************************
 * FUNCTION - setViewPort: This function resizes the heat map, row label, and column label
 * canvases for mapItem (an open detail heat map panel).
 * It sets the sizes of the main canvas, the box canvas, and the row/col label DIVs.
 ************************************************************************************************/
NgChm.DET.setViewPort = function (mapItem) {
    const detPane = NgChm.Pane.findPaneLocation (mapItem.chm);

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
    NgChm.UTIL.setElementPositionSize (mapItem.canvas, heatmapVP, true);
    NgChm.UTIL.setElementPositionSize (mapItem.boxCanvas, heatmapVP, true);

    // Set sizes for the label divs
    const rowLabelVP = {
	    top: mapItem.chm.offsetTop,
	    left: mapItem.canvas.offsetLeft + mapItem.canvas.clientWidth,
	    width: dFullW - mapItem.canvas.offsetLeft - mapItem.canvas.offsetWidth,
	    height: dFullH - (mapItem.colLabelLen + 15)
    };
    NgChm.UTIL.setElementPositionSize (document.getElementById(mapItem.rowLabelDiv), rowLabelVP, true);

    const heightCalc = dFullH - mapItem.canvas.offsetTop - mapItem.canvas.offsetHeight;
    const colLabelVP = {
	    top: mapItem.canvas.offsetTop + mapItem.canvas.offsetHeight,
	    left: 0,
	    width: dFullW - (mapItem.rowLabelLen + 10),
	    height:  heightCalc === 0 ? 11 : heightCalc
    };
    NgChm.UTIL.setElementPositionSize (document.getElementById(mapItem.rowLabelDiv), colLabelVP, true);
};

/************************************************************************************************
 * FUNCTION - calcRowAndColLabels: This function determines if labels are to be drawn on each 
 * axis and calls the appropriate function to calculate the maximum label size for each axis.
 ************************************************************************************************/
NgChm.DET.calcRowAndColLabels = function (mapItem) {
	mapItem.rowLabelFont = NgChm.DET.getRowLabelFontSize(mapItem);
	mapItem.colLabelFont = NgChm.DET.getColLabelFontSize(mapItem);
	let fontSize;
	if (mapItem.rowLabelFont >= mapItem.minLabelSize && mapItem.colLabelFont >= mapItem.minLabelSize){
		fontSize = Math.min(mapItem.colLabelFont,mapItem.rowLabelFont);
		NgChm.DET.calcColLabels(mapItem, fontSize);
		NgChm.DET.calcRowLabels(mapItem, fontSize);
	} else if (mapItem.rowLabelFont >= mapItem.minLabelSize){
		NgChm.DET.calcRowLabels(mapItem, mapItem.rowLabelFont);
	} else if (mapItem.colLabelFont >= mapItem.minLabelSize){
		NgChm.DET.calcColLabels(mapItem, mapItem.colLabelFont);
	}
}

/************************************************************************************************
 * FUNCTION - calcClassRowAndColLabels: This function calls the functions necessary to calculate 
 * the maximum row/col class bar label sizes and update maximum label size variables (if necessary)
 ************************************************************************************************/
NgChm.DET.calcClassRowAndColLabels = function (mapItem) {
	NgChm.DET.calcRowClassBarLabels(mapItem);
	NgChm.DET.calcColClassBarLabels(mapItem);
}

/************************************************************************************************
 * FUNCTION - calcRowClassBarLabels: This function calculates the maximum size of all row class 
 * bar labels and update the map item's rowLabelLen if the value of any label exceeds the existing 
 * maximum stored in that variable
 ************************************************************************************************/
NgChm.DET.calcRowClassBarLabels = function (mapItem) {
	const rowClassBarConfigOrder = NgChm.heatMap.getRowClassificationOrder();
	const scale =  mapItem.canvas.clientWidth / (mapItem.dataViewWidth + NgChm.DET.calculateTotalClassBarHeight("row") + mapItem.dendroWidth);
	const rowClassBarConfig = NgChm.heatMap.getRowClassificationConfig();
	const rowClassLength = Object.keys(rowClassBarConfig).length;
	const containsLegend = NgChm.DET.classLabelsContainLegend("row");
	if (rowClassBarConfig != null && rowClassLength > 0) {
		mapItem.rowClassLabelFont = NgChm.DET.rowClassBarLabelFont(mapItem);
		if ((mapItem.rowClassLabelFont > mapItem.minLabelSize)  && (mapItem.colClassLabelFont < NgChm.DET.maxLabelSize)) {
			for (let i=0;i< rowClassBarConfigOrder.length;i++) {
				const key = rowClassBarConfigOrder[i];
				const currentClassBar = rowClassBarConfig[rowClassBarConfigOrder[i]];
				if (currentClassBar.show === 'Y') {
					const currFont = Math.min((currentClassBar.height - NgChm.DET.paddingHeight) * scale, NgChm.DET.maxLabelSize);
					let labelText = NgChm.UTIL.getLabelText(key,'COL');
					if (containsLegend) {
						labelText = "XXX"+labelText; //calculate spacing for bar legend
					}
					NgChm.DET.addTmpLabelForSizeCalc(mapItem, labelText, mapItem.rowClassLabelFont);
				} 
			} 
			NgChm.DET.calcLabelDiv(mapItem, 'COL');
		}	
	}
}

/************************************************************************************************
 * FUNCTION - calcColClassBarLabels: This function calculates the maximum size of all column 
 * class bar labels and update the mapItem's colLabelLen if the value of any label exceeds the 
 * existing maximum stored in that variable
 ************************************************************************************************/
NgChm.DET.calcColClassBarLabels = function (mapItem) {
	const scale =  mapItem.canvas.clientHeight / (mapItem.dataViewHeight + NgChm.DET.calculateTotalClassBarHeight("column") + mapItem.dendroHeight);
	const colClassBarConfig = NgChm.heatMap.getColClassificationConfig();
	const colClassBarConfigOrder = NgChm.heatMap.getColClassificationOrder();
	const colClassLength = Object.keys(colClassBarConfig).length;
	const containsLegend = NgChm.DET.classLabelsContainLegend("col");
	if (colClassBarConfig != null && colClassLength > 0) {
		mapItem.colClassLabelFont = NgChm.DET.colClassBarLabelFont(mapItem);
		if ((mapItem.colClassLabelFont > mapItem.minLabelSize) && (mapItem.colClassLabelFont < NgChm.DET.maxLabelSize)){
			for (let i=0;i< colClassBarConfigOrder.length;i++) {
				const key = colClassBarConfigOrder[i];
				const currentClassBar = colClassBarConfig[key];
				if (currentClassBar.show === 'Y') {
					const currFont = Math.min((currentClassBar.height - NgChm.DET.paddingHeight) * scale, NgChm.DET.maxLabelSize);
					let labelText = NgChm.UTIL.getLabelText(key,'ROW');
					if (containsLegend) {
						labelText = "XXXX"+labelText; //calculate spacing for bar legend
					}
					NgChm.DET.addTmpLabelForSizeCalc(mapItem, labelText, mapItem.colClassLabelFont);
				} 
			}	
			NgChm.DET.calcLabelDiv(mapItem, 'ROW');
		}
	}
}

/************************************************************************************************
 * FUNCTION - rowClassBarLabelFont: This function calculates the appropriate font size for row 
 * class bar labels
 ************************************************************************************************/
NgChm.DET.rowClassBarLabelFont = function(mapItem) {
	const scale =  mapItem.canvas.clientWidth / (mapItem.dataViewWidth + NgChm.DET.calculateTotalClassBarHeight("row")+mapItem.dendroWidth);
	const rowClassBarConfig = NgChm.heatMap.getRowClassificationConfig();
	const fontSize = NgChm.DET.getClassBarLabelFontSize(mapItem, rowClassBarConfig,scale);
	return fontSize;
}

/************************************************************************************************
 * FUNCTION - colClassBarLabelFont: This function calculates the appropriate font size for 
 * column class bar labels
 ************************************************************************************************/
NgChm.DET.colClassBarLabelFont = function(mapItem) {
	const scale =  mapItem.canvas.clientHeight / (mapItem.dataViewHeight + NgChm.DET.calculateTotalClassBarHeight("column")+mapItem.dendroHeight);
	const colClassBarConfig = NgChm.heatMap.getColClassificationConfig();
	const fontSize = NgChm.DET.getClassBarLabelFontSize(mapItem, colClassBarConfig,scale);
	return fontSize;
}

/************************************************************************************************
 * FUNCTION - classLabelsContainLegend: This function returns a boolean indicating if the 
 * provided class bar axis contains a label with a bar or scatter plot legend.
 ************************************************************************************************/
NgChm.DET.classLabelsContainLegend = function (type) {
	let containsLegend = false;
	let classBarOrder = NgChm.heatMap.getColClassificationOrder();
	let classBarConfig = NgChm.heatMap.getColClassificationConfig();
	if (type === "row") {
		classBarOrder = NgChm.heatMap.getRowClassificationOrder();
		classBarConfig = NgChm.heatMap.getRowClassificationConfig();
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
NgChm.DET.addTmpLabelForSizeCalc = function (mapItem, text, fontSize) {
     const key = text + fontSize.toString();
     if (mapItem.labelSizeCache.hasOwnProperty(key)) {
    	 mapItem.tmpLabelSizeElements.push({ key, el: null });
	} else {
             // Haven't seen this combination of font and fontSize before.
             // Set the contents of our label size div and calculate its width.
		const el = NgChm.DET.getPoolElement(mapItem);
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
 NgChm.DET.getPoolElement = function (mapItem) {
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
NgChm.DET.getClassBarLabelFontSize = function (mapItem, classBarConfig,scale) {
	let minFont = 999;
	for (let key in classBarConfig) {
		const classBar = classBarConfig[key];
		const fontSize = Math.min(((classBar.height - NgChm.DET.paddingHeight) * scale) - 1, 10);
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
NgChm.DET.calcRowLabels = function (mapItem, fontSize) {
	let headerSize = 0;
	const colHeight = NgChm.DET.calculateTotalClassBarHeight("column") + mapItem.dendroHeight;
	if (colHeight > 0) {
		headerSize = mapItem.canvas.clientHeight * (colHeight / (mapItem.dataViewHeight + colHeight));
	}
	const skip = (mapItem.canvas.clientHeight - headerSize) / mapItem.dataPerCol;
	if (skip > mapItem.minLabelSize) {
		const shownLabels = NgChm.UTIL.getShownLabels('ROW');
		for (let i = mapItem.currentRow; i < mapItem.currentRow + mapItem.dataPerCol; i++) {
			NgChm.DET.addTmpLabelForSizeCalc(mapItem, shownLabels[i-1], fontSize);
		}
		NgChm.DET.calcLabelDiv(mapItem, 'ROW');
	}
}

/************************************************************************************************
 * FUNCTION - calcRowLabels: This function calculates the maximum label size (in pixels) on the 
 * column axis.
 ************************************************************************************************/
NgChm.DET.calcColLabels = function (mapItem, fontSize) {
	let headerSize = 0;
	const rowHeight = NgChm.DET.calculateTotalClassBarHeight("row") + mapItem.dendroWidth;
	if (rowHeight > 0) {
		headerSize = mapItem.canvas.clientWidth * (rowHeight / (mapItem.dataViewWidth + rowHeight));
	}
	const skip = (mapItem.canvas.clientWidth - headerSize) / mapItem.dataPerRow;
	if (skip > mapItem.minLabelSize) {
		const shownLabels = NgChm.UTIL.getShownLabels('COLUMN');
		for (let i = mapItem.currentCol; i < mapItem.currentCol + mapItem.dataPerRow; i++) {
			NgChm.DET.addTmpLabelForSizeCalc(mapItem, shownLabels[i-1], fontSize);
		}
		NgChm.DET.calcLabelDiv(mapItem, 'COL');
	}
}

/************************************************************************************************
 * FUNCTION - calcLabelDiv: This function assesses the size of the entries that have been added 
 * to tmpLabelSizeElements and increases the row/col label length if the longest label is longer 
 * than those already processed. rowLabelLen and colLabelLen are used to size the detail screen
 * to accommodate labels on both axes.
 ************************************************************************************************/
NgChm.DET.calcLabelDiv = function (mapItem, axis) {
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
NgChm.DET.getRowLabelFontSize = function (mapItem) {
	let headerSize = 0;
	const colHeight = NgChm.DET.calculateTotalClassBarHeight("column") + mapItem.dendroHeight;
	if (colHeight > 0) {
		headerSize = mapItem.canvas.clientHeight * (colHeight / (mapItem.dataViewHeight + colHeight));
	}
	const skip = Math.floor((mapItem.canvas.clientHeight - headerSize) / mapItem.dataPerCol) - 2;
	return Math.min(skip, NgChm.DET.maxLabelSize);	
};

/************************************************************************************************
 * FUNCTION - getRowLabelFontSize: This function calculates the font size to be used for column labels.
 ************************************************************************************************/
NgChm.DET.getColLabelFontSize = function (mapItem) {
	let headerSize = 0;
	const rowHeight = NgChm.DET.calculateTotalClassBarHeight("row") + mapItem.dendroWidth;
	if (rowHeight > 0) {
		headerSize = mapItem.canvas.clientWidth * (rowHeight / (mapItem.dataViewWidth + rowHeight));
	}
	const skip = Math.floor((mapItem.canvas.clientWidth - headerSize) / mapItem.dataPerRow) - 2;
	return Math.min(skip, NgChm.DET.maxLabelSize);
};

/************************************************************************************************
 * FUNCTION - updateDisplayedLabels: This function updates detail labels when the user scrolls or
 * zooms on the detail pane. The existing labels are first moved to oldLabelElements. Adding a 
 * label will first check to see if the label element already exists in oldLabelElements and if 
 * so update it and move it to labelElements. After all elements have been added/updated, any 
 * remaining dynamic labels
 ************************************************************************************************/
NgChm.DET.updateDisplayedLabels = function () {
	for (let i=0; i<NgChm.DMM.DetailMaps.length;i++ ) {
		const mapItem = NgChm.DMM.DetailMaps[i];
		const debug = false;
	
		const prevNumLabels = Object.keys(mapItem.labelElements).length;
		mapItem.oldLabelElements = mapItem.labelElements;
		mapItem.labelElements = {};
	
		// Temporarily hide labelElement while we update labels.
		const oldDisplayStyle = mapItem.labelElement.style.display;
		mapItem.labelElement.style.setProperty('display', 'none');
	
		// Update existing labels / draw new labels.
		NgChm.DET.detailDrawRowClassBarLabels(mapItem);
		NgChm.DET.detailDrawColClassBarLabels(mapItem);
		NgChm.DET.drawRowAndColLabels(mapItem);
	
		// Remove old dynamic labels that did not get updated.
		for (let oldEl in mapItem.oldLabelElements) {
			const e = mapItem.oldLabelElements[oldEl];
			if (e.div.classList.contains('DynamicLabel')) {
				try {
					e.parent.removeChild(e.div);
				} catch (err) {
					console.log({ m: 'Unable to remove old label element ', oldEl, e });
					console.error(err);
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
NgChm.DET.drawRowAndColLabels = function (mapItem) {
	let fontSize;
	if (mapItem.rowLabelFont >= mapItem.minLabelSize && mapItem.colLabelFont >= mapItem.minLabelSize){
		fontSize = Math.min(mapItem.colLabelFont,mapItem.rowLabelFont);
		NgChm.DET.drawRowLabels(mapItem,fontSize);
		NgChm.DET.drawColLabels(mapItem,fontSize);
	} else if (mapItem.rowLabelFont >= mapItem.minLabelSize){
		NgChm.DET.drawRowLabels(mapItem,mapItem.rowLabelFont);
	} else if (mapItem.colLabelFont >= mapItem.minLabelSize){
		NgChm.DET.drawColLabels(mapItem,mapItem.colLabelFont);
	}
}

/************************************************************************************************
 * FUNCTION - drawRowLabels: This function draws all row axis labels on the screen.
 ************************************************************************************************/
NgChm.DET.drawRowLabels = function (mapItem, fontSize) {
	let headerSize = 0;
	const colHeight = NgChm.DET.calculateTotalClassBarHeight("column");
	if (colHeight > 0) {
		headerSize = mapItem.canvas.clientHeight * (colHeight / (mapItem.dataViewHeight + colHeight));
	}
	const skip = (mapItem.canvas.clientHeight - headerSize) / mapItem.dataPerCol;
	const start = Math.max((skip - fontSize)/2, 0) + headerSize-2;
	
	if (skip > mapItem.minLabelSize) {
		const actualLabels = NgChm.UTIL.getActualLabels('ROW');
		const shownLabels = NgChm.UTIL.getShownLabels('ROW');
		const xPos = mapItem.canvas.offsetLeft + mapItem.canvas.clientWidth + 3;
		for (let i = mapItem.currentRow; i < mapItem.currentRow + mapItem.dataPerCol; i++) {
			const yPos = mapItem.canvas.offsetTop + start + ((i-mapItem.currentRow) * skip);
			if (actualLabels[i-1] !== undefined){ // an occasional problem in subdendro view
				NgChm.DET.addLabelDiv(mapItem,mapItem.labelElement, 'detail_row' + i + mapItem.labelPostScript, 'DynamicLabel', shownLabels[i-1], actualLabels[i-1], xPos, yPos, fontSize, 'F',i,"Row");
			}
		}
	}
}

/************************************************************************************************
 * FUNCTION - drawColLabels: This function draws all column axis labels on the screen.
 ************************************************************************************************/
NgChm.DET.drawColLabels = function (mapItem, fontSize) {
	let headerSize = 0;
	const rowHeight = NgChm.DET.calculateTotalClassBarHeight("row");
	if (rowHeight > 0) {
		headerSize = mapItem.canvas.clientWidth * (rowHeight / (mapItem.dataViewWidth + rowHeight));
	}
	const skip = (mapItem.canvas.clientWidth - headerSize) / mapItem.dataPerRow;
	const start = headerSize + fontSize + Math.max((skip - fontSize)/2, 0) + 3;

	if (skip > mapItem.minLabelSize) {
		const actualLabels = NgChm.UTIL.getActualLabels('COLUMN');
		const shownLabels = NgChm.UTIL.getShownLabels('COLUMN');
		const yPos = mapItem.canvas.offsetTop + mapItem.canvas.clientHeight + 3;
		for (let i = mapItem.currentCol; i < mapItem.currentCol + mapItem.dataPerRow; i++) {
			const xPos = mapItem.canvas.offsetLeft + start + ((i-mapItem.currentCol) * skip);
			if (actualLabels[i-1] !== undefined){ // an occasional problem in subdendro view
				NgChm.DET.addLabelDiv(mapItem, mapItem.labelElement, 'detail_col' + i + mapItem.labelPostScript, 'DynamicLabel', shownLabels[i-1], actualLabels[i-1], xPos, yPos, fontSize, 'T',i,"Column");
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
NgChm.DET.resetLabelLengths = function (mapItem) {
	mapItem.rowLabelLen = 0;
	mapItem.colLabelLen = 0;
}

/************************************************************************************************
 * FUNCTION - detailDrawRowClassBarLabels: This function draws row class bar labels on the detail panel.
 ************************************************************************************************/
NgChm.DET.detailDrawRowClassBarLabels = function (mapItem) {
	const rowClassBarConfigOrder = NgChm.heatMap.getRowClassificationOrder();
	NgChm.DET.removeLabel (mapItem, "missingDetRowClassBars");
	const scale =  mapItem.canvas.clientWidth / (mapItem.dataViewWidth + NgChm.DET.calculateTotalClassBarHeight("row"));
	const classBarAreaWidth = NgChm.DET.calculateTotalClassBarHeight("row")*scale;
	const dataAreaWidth = mapItem.dataViewWidth*scale;
	const rowClassBarConfig = NgChm.heatMap.getRowClassificationConfig();
	const rowClassLength = Object.keys(rowClassBarConfig).length;
	const containsLegend = NgChm.DET.classLabelsContainLegend("row");
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
				NgChm.DET.removeClassBarLegendElements(key,mapItem);
				if (currentClassBar.show === 'Y') {
					NgChm.DET.drawRowClassBarLegends(mapItem);
					const currFont = Math.min((currentClassBar.height - NgChm.DET.paddingHeight) * scale, NgChm.DET.maxLabelSize);
					const labelText = NgChm.UTIL.getLabelText(key,'COL');
					if (containsLegend) {
						yPos += 12; //add spacing for bar legend
					}
					if (currFont >= mapItem.rowClassLabelFont) {
						NgChm.DET.addLabelDiv(mapItem, mapItem.labelElement, 'detail_classrow' + i + mapItem.labelPostScript, 'DynamicLabel ClassBar', labelText, key, xPos, yPos, mapItem.rowClassLabelFont, 'T', i, "RowCovar",key);
					}
					yPos += (currentClassBar.height * scale);
					startingPoint += barWidth;
				} else {
					if (!document.getElementById("missingDetRowClassBars")){
						const x = mapItem.canvas.offsetLeft + 10;
						const y = mapItem.canvas.offsetTop + mapItem.canvas.clientHeight+2;
						NgChm.DET.addLabelDiv(mapItem, mapItem.labelElement, 'missingDetRowClassBars' + mapItem.labelPostScript, "ClassBar MarkLabel", "...", "...", x, y, 10, 'T', i, "Row");
					}
					if (!document.getElementById("missingSumRowClassBars") && NgChm.SUM.canvas){
						const x = NgChm.SUM.canvas.offsetLeft;
						const y = NgChm.SUM.canvas.offsetTop + NgChm.SUM.canvas.clientHeight + 2;
						const sumlabelDiv = document.getElementById('sumlabelDiv')
						if (sumlabelDiv !== null) {
							NgChm.DET.addLabelDiv(mapItem, document.getElementById('sumlabelDiv'), 'missingSumRowClassBars' + mapItem.labelPostScript, "ClassBar MarkLabel", "...", "...", x, y, 10, "T", null,"Row");
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
NgChm.DET.detailDrawColClassBarLabels = function (mapItem) {
	NgChm.DET.removeLabel (mapItem, "missingDetColClassBars");
	const scale =  mapItem.canvas.clientHeight / (mapItem.dataViewHeight + NgChm.DET.calculateTotalClassBarHeight("column"));
	const colClassBarConfig = NgChm.heatMap.getColClassificationConfig();
	const colClassBarConfigOrder = NgChm.heatMap.getColClassificationOrder();
	const colClassLength = Object.keys(colClassBarConfig).length;
	const containsLegend = NgChm.DET.classLabelsContainLegend("col");
	if (colClassBarConfig != null && colClassLength > 0) {
		if (mapItem.colClassLabelFont > mapItem.minLabelSize) {
			let yPos = mapItem.canvas.offsetTop;
			for (let i=0;i< colClassBarConfigOrder.length;i++) {
				let xPos = mapItem.canvas.offsetLeft + mapItem.canvas.clientWidth + 3;
				const key = colClassBarConfigOrder[i];
				const currentClassBar = colClassBarConfig[key];
				NgChm.DET.removeClassBarLegendElements(key,mapItem);
				if (currentClassBar.show === 'Y') {
					NgChm.DET.drawColClassBarLegends(mapItem);  
					const currFont = Math.min((currentClassBar.height - NgChm.DET.paddingHeight) * scale, NgChm.DET.maxLabelSize);
					if (currFont >= mapItem.colClassLabelFont) {
						let yOffset = yPos - 1;
						//Reposition label to center of large-height bars
						if (currentClassBar.height >= 20) {
							yOffset += ((((currentClassBar.height/2) - (mapItem.colClassLabelFont/2)) - 3) * scale);
						}
						const labelText = NgChm.UTIL.getLabelText(key,'ROW');
						if (containsLegend) {
							xPos += 14; //add spacing for bar legend
						}
						NgChm.DET.addLabelDiv(mapItem, mapItem.labelElement, 'detail_classcol' + i + mapItem.labelPostScript, 'DynamicLabel ClassBar', labelText, key, xPos, yOffset, mapItem.colClassLabelFont, 'F', i, "ColumnCovar");
					}
					yPos += (currentClassBar.height * scale);
				} else {
					if (!document.getElementById("missingDetColClassBars")){
						const x =  mapItem.canvas.offsetLeft + mapItem.canvas.clientWidth+2;
						const y = mapItem.canvas.offsetTop-15;
						NgChm.DET.addLabelDiv(mapItem, mapItem.labelElement, 'missingDetColClassBars' + mapItem.labelPostScript, "ClassBar MarkLabel", "...", "...", x, y, 10, "F", null,"Column");
					}
                    if (!document.getElementById("missingSumColClassBars") && NgChm.SUM.canvas && NgChm.SUM.chmElement){
                    	const x = NgChm.SUM.canvas.offsetLeft + NgChm.SUM.canvas.offsetWidth + 2;
                    	const y = NgChm.SUM.canvas.offsetTop + NgChm.SUM.canvas.clientHeight/NgChm.SUM.totalHeight - 10;
						NgChm.DET.addLabelDiv(mapItem, document.getElementById('sumlabelDiv'), 'missingSumColClassBars' + mapItem.labelPostScript, "ClassBar MarkLabel", "...", "...", x, y, 10, "F", null,"Column");
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
NgChm.DET.drawRowClassBarLegends = function (mapItem) {
	const classBarsConfig = NgChm.heatMap.getRowClassificationConfig(); 
	const classBarConfigOrder = NgChm.heatMap.getRowClassificationOrder();
	const classBarsData = NgChm.heatMap.getRowClassificationData(); 
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
					NgChm.DET.drawRowClassBarLegend(mapItem,key,currentClassBar,prevHeight,totalHeight,i);
			}
			prevHeight += parseInt(currentClassBar.height);
		}
	}
}

/************************************************************************************************
 * FUNCTION - drawRowClassBarLegend: This function draws a specific row class bar legend on the 
 * detail panel for maps that contain bar/scatter plot covariates.  
 ************************************************************************************************/
NgChm.DET.drawRowClassBarLegend = function(mapItem,key,currentClassBar,prevHeight,totalHeight,i) {
	const classHgt = NgChm.DET.calculateTotalClassBarHeight("row");
	const scale =  mapItem.canvas.clientWidth / (mapItem.dataViewWidth + classHgt);
	totalHeight *= scale;
	const prevEndPct = prevHeight/totalHeight;
	const currEndPct = (prevHeight+parseInt(currentClassBar.height))/totalHeight;
	const beginClasses = mapItem.canvas.offsetLeft-5;
	const endClasses = beginClasses+(classHgt*scale)-3;
	const classHeight = (endClasses-beginClasses)*scale;
	//Don't draw legend if bar is not wide enough
	if (classHeight < 18) return;
	const beginPos =  beginClasses+(classHeight*prevEndPct)+(NgChm.DET.paddingHeight*(i+1));
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
	NgChm.DET.setLegendDivElement(mapItem,key+mapItem.panelNbr+"legendDetLow","-"+lowVal,topPos,beginPos,true);
	//Create div and place middle legend value
	NgChm.DET.setLegendDivElement(mapItem,key+mapItem.panelNbr+"legendDetMid","-"+midVal,topPos,midPos,true);
	//Create div and place middle legend value
	NgChm.DET.setLegendDivElement(mapItem,key+mapItem.panelNbr+"legendDetHigh","-"+highVal,topPos,endPos,true);
}

/************************************************************************************************
 * FUNCTION - drawColClassBarLegends: This function draws column class bar legends on the 
 * detail panel for maps that contain bar/scatter plot covariates.  It calls a second function
 * (drawColClassBarLegend) to draw each legend.
 ************************************************************************************************/
NgChm.DET.drawColClassBarLegends = function (mapItem) {
	const classBarsConfig = NgChm.heatMap.getColClassificationConfig(); 
	const classBarConfigOrder = NgChm.heatMap.getColClassificationOrder();
	const classBarsData = NgChm.heatMap.getColClassificationData(); 
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
				NgChm.DET.drawColClassBarLegend(mapItem,key,currentClassBar,prevHeight,totalHeight);
			}
			prevHeight += parseInt(currentClassBar.height);
		}
	}
}

/************************************************************************************************
 * FUNCTION - drawColClassBarLegend: This function draws a specific column class bar legend on the 
 * detail panel for maps that contain bar/scatter plot covariates.  
 ************************************************************************************************/
NgChm.DET.drawColClassBarLegend = function(mapItem,key,currentClassBar,prevHeight,totalHeight) {
	const classHgt = NgChm.DET.calculateTotalClassBarHeight("column");
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
	const barHeight = ((currentClassBar.height*scale) - NgChm.DET.paddingHeight);
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
	NgChm.DET.setLegendDivElement(mapItem,key+mapItem.panelNbr+"legendDetHigh-","-",topPos,leftPos,false);
	NgChm.DET.setLegendDivElement(mapItem,key+mapItem.panelNbr+"legendDetHigh",highVal,topPos+4,leftPos+3,false);
	//Create div and place mid legend value
	NgChm.DET.setLegendDivElement(mapItem,key+mapItem.panelNbr+"legendDetMid","- "+midVal,midPos,leftPos,false);
	//Create div and place low legend value
	NgChm.DET.setLegendDivElement(mapItem,key+mapItem.panelNbr+"legendDetLow",lowVal,endPos-3,leftPos+3,false);
	NgChm.DET.setLegendDivElement(mapItem,key+mapItem.panelNbr+"legendDetLow-","-",endPos,leftPos,false);
}

/************************************************************************************************
 * FUNCTION - removeColClassBarLegendElements: This function removes any existing legend elements
 * for a bar/scatter plot class bar that is being redrawn.  
 ************************************************************************************************/
NgChm.DET.removeClassBarLegendElements = function(key,mapItem) {
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
NgChm.DET.setLegendDivElement = function (mapItem,itemId,boundVal,topVal,leftVal,isRowVal) {
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
NgChm.DET.removeLabels = function (label) {
	for (let i=0; i<NgChm.DMM.DetailMaps.length;i++ ) {
		const mapItem = NgChm.DMM.DetailMaps[i];
		NgChm.DET.removeLabel(mapItem, label);
	}
};

/************************************************************************************************
 * FUNCTION - removeLabel: This function removes a label from a specific detail map item.  
 ************************************************************************************************/
NgChm.DET.removeLabel = function (mapItem, label) {
	if (mapItem.oldLabelElements.hasOwnProperty (label)) {
		const e = mapItem.oldLabelElements[label];
		e.parent.removeChild(e.div);
		delete mapItem.oldLabelElements[label];
	}
};

/************************************************************************************************
 * FUNCTION - addLabelDivs: This function adds a label div to all detail map items.  
 ************************************************************************************************/
NgChm.DET.addLabelDivs = function (parent, id, className, text ,longText, left, top, fontSize, rotate, index,axis,xy) {
	for (let i=0; i<NgChm.DMM.DetailMaps.length;i++ ) {
		const mapItem = NgChm.DMM.DetailMaps[i];
		NgChm.DET.addLabelDiv(mapItem, parent, id, className, text ,longText, left, top, fontSize, rotate, index,axis,xy);
	}
};

/************************************************************************************************
 * FUNCTION - addLabelDiv: This function adds a label div element to a specific detail map item  
 ************************************************************************************************/
NgChm.DET.addLabelDiv = function (mapItem, parent, id, className, text ,longText, left, top, fontSize, rotate, index,axis,xy) {
	if (mapItem.oldLabelElements.hasOwnProperty(id)) {
	    NgChm.DET.updateLabelDiv (mapItem, parent, id, className, text ,longText, left, top, fontSize, rotate, index,axis,xy);
	    return;
	}
	let div = document.getElementById (id);
	if (div) {
	    if (parent !== div.parentElement) {
		console.log ({ m: 'parent mismatch', parent, div });
	    }
	    mapItem.oldLabelElements[id] = { div, parent: div.parentElement };
	    NgChm.DET.updateLabelDiv (mapItem, parent, id, className, text ,longText, left, top, fontSize, rotate, index,axis,xy);
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
	if (NgChm.SRCH.labelIndexInSearch && NgChm.SRCH.labelIndexInSearch(axis,index)) {
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
		div.addEventListener('click',NgChm.DEV.labelClick , NgChm.UTIL.passiveCompat({ capture: false, passive: false }));
		div.addEventListener('contextmenu',NgChm.DEV.labelRightClick, NgChm.UTIL.passiveCompat({ capture: false, passive: false }));
		div.onmouseover = function(){NgChm.UHM.hlp(this,longText,longText.length*9,0);}
		div.onmouseleave = NgChm.UHM.hlpC;
		div.addEventListener("touchstart", function(e){
			NgChm.UHM.hlpC();
			const now = new Date().getTime();
			const timesince = now - mapItem.latestTap;
			NgChm.DET.labelLastClicked[this.dataset.axis] = this.dataset.index;
			mapItem.latestLabelTap = now;
		}, NgChm.UTIL.passiveCompat({ passive: true }));
		div.addEventListener("touchend", function(e){
			if (e.touches.length == 0 && mapItem.latestLabelTap){
				const now = new Date().getTime();
				const timesince = now - mapItem.latestLabelTap;
				if (timesince > 500){
					NgChm.DEV.labelRightClick(e);
				}
			}
		}, NgChm.UTIL.passiveCompat({ passive: false }));
		div.addEventListener("touchmove", NgChm.DEV.labelDrag, NgChm.UTIL.passiveCompat({ passive: false }));
	}
	if (text == "..."){
		const listenOpts = NgChm.UTIL.passiveCompat({ capture: false, passive: false });
		div.addEventListener('mouseover', (function() {
		    return function(e) {NgChm.UHM.hlp(this,"Some covariate bars are hidden",160,0); };
		}) (this), listenOpts);
		div.addEventListener('mouseleave', (function() {
		    return function(e) {NgChm.UHM.hlpC(); };
		}) (this), listenOpts);
	}   
}

/************************************************************************************************
 * FUNCTION - updateLabelDiv: This function updates a label DIV and removes it from the 
 * oldLabelElements array if it is no longer visible on the detail panel.  
 ************************************************************************************************/
NgChm.DET.updateLabelDiv = function (mapItem, parent, id, className, text ,longText, left, top, fontSize, rotate, index,axis,xy) {
	if (mapItem.oldLabelElements[id].parent !== parent) {
		console.error (new Error ('updateLabelDiv: parent elements do not match'));
		console.log ({ id, parent, oldElement: NgChm.DET.oldLabelElements[id] });
	}
	// Get existing label element and move from old to current collection.
	const div = mapItem.oldLabelElements[id].div;
	if (div.parentElement !== parent) {
		console.log ({ m: 'mismatch during update', parentElement: div.parentElement, parent });
	}
	mapItem.labelElements[id] = { div, parent };
	delete mapItem.oldLabelElements[id];

	if (NgChm.SRCH.labelIndexInSearch(axis,index)) {
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
NgChm.DET.getContigSearchRanges = function (searchArr) {
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
NgChm.DET.getAllLabelsByAxis = function (axis, labelType) {
	const labels = axis == 'Row' ? NgChm.heatMap.getRowLabels()["labels"] : axis == "Column" ? NgChm.heatMap.getColLabels()['labels'] : 
		axis == "ColumnCovar" ? Object.keys(NgChm.heatMap.getColClassificationConfig()) : axis == "ColumnCovar" ? Object.keys(NgChm.heatMap.getRowClassificationConfig()) : 
			[NgChm.heatMap.getRowLabels()["labels"], NgChm.heatMap.getColLabels()['labels'] ];
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
NgChm.DET.setDendroShow = function (mapItem) {
	const rowDendroConfig = NgChm.heatMap.getRowDendroConfig();
	const colDendroConfig = NgChm.heatMap.getColDendroConfig();
	if (!NgChm.heatMap.showRowDendrogram("DETAIL")) {
		mapItem.dendroWidth = 15;
	} else {
		mapItem.dendroWidth = Math.floor(parseInt(rowDendroConfig.height) * NgChm.heatMap.getRowDendroConfig().height/100+5);
	}
	if (!NgChm.heatMap.showColDendrogram("DETAIL")) {
		mapItem.dendroHeight = 15;
	} else {
		mapItem.dendroHeight = Math.floor(parseInt(colDendroConfig.height) * NgChm.heatMap.getColDendroConfig().height/100+5);
	}
}

/************************************************************************************************
 * FUNCTION - colDendroResize: This function resizes the column dendrogram on all open detail
 * heat map panel instances.
 ************************************************************************************************/
NgChm.DET.colDendroResize = function() {
	for (let i=0; i<NgChm.DMM.DetailMaps.length;i++ ) {
		const mapItem = NgChm.DMM.DetailMaps[i];
		if (mapItem.colDendroCanvas !== null) {
			const dendroCanvas = mapItem.colDendroCanvas;
			const left = mapItem.canvas.offsetLeft;
			const canW = mapItem.dataViewWidth + NgChm.DET.calculateTotalClassBarHeight("row");
			dendroCanvas.style.left = (left + mapItem.canvas.clientWidth * (1-mapItem.dataViewWidth/canW)) + 'px';
			if (mapItem.colDendro.isVisible()){
				//If summary side is hidden, retain existing dendro height
				const sumMinimized = parseInt(NgChm.SUM.colDendro.dendroCanvas.style.height, 10) < 5 ? true : false;
				const dendroSumPct = (parseInt(NgChm.SUM.colDendro.dendroCanvas.style.height, 10) / (parseInt(NgChm.SUM.canvas.style.height, 10) + parseInt(NgChm.SUM.colDendro.dendroCanvas.style.height, 10) + parseInt(NgChm.SUM.cCCanvas.style.height, 10)));
				const totalDetHeight = (mapItem.chm.offsetHeight - 50);
				const height = (totalDetHeight * dendroSumPct); 
				if (sumMinimized === false) {
					dendroCanvas.style.height = parseInt(height, 10) + 'px';
					dendroCanvas.height = Math.round(height);
				}
				dendroCanvas.style.width = (mapItem.canvas.clientWidth * (mapItem.dataViewWidth/canW)) + 'px';
				dendroCanvas.width = Math.round(mapItem.canvas.clientWidth * (mapItem.dataViewWidth/mapItem.canvas.width));
				mapItem.colDendro.draw();
			} else {
				dendroCanvas.style.height = '0px';
			}
		}
	}
}

/************************************************************************************************
 * FUNCTION - rowDendroResize: This function resizes the row dendrogram on all open detail
 * heat map panel instances.
 ************************************************************************************************/
NgChm.DET.rowDendroResize = function() {
	for (let i=0; i<NgChm.DMM.DetailMaps.length;i++ ) {
		const mapItem = NgChm.DMM.DetailMaps[i];
		if (mapItem.rowDendroCanvas !== null) {
			const dendroCanvas = mapItem.rowDendroCanvas;
			const top = mapItem.colDendro.getDivHeight() + NgChm.SUM.paddingHeight;
			const canH = mapItem.dataViewHeight + NgChm.DET.calculateTotalClassBarHeight("column")
			dendroCanvas.style.top = (top + mapItem.canvas.clientHeight * (1-mapItem.dataViewHeight/canH)) + 'px';
			if (mapItem.rowDendro.isVisible()){
				//If summary side is hidden, retain existing dendro width
				const sumMinimized = parseInt(NgChm.SUM.rowDendro.dendroCanvas.style.width, 10) < 5 ? true : false;
				const height = mapItem.canvas.clientHeight * (mapItem.dataViewHeight/canH);
				const dendroSumPct = (parseInt(NgChm.SUM.rowDendro.dendroCanvas.style.width, 10) / (parseInt(NgChm.SUM.canvas.style.width, 10) + parseInt(NgChm.SUM.rowDendro.dendroCanvas.style.width, 10) + parseInt(NgChm.SUM.rCCanvas.style.width, 10)));
				const totalDetWidth = (mapItem.chm.offsetWidth - 50);
				const width = (totalDetWidth * dendroSumPct); 
				if (sumMinimized === false) {
					dendroCanvas.style.width = parseInt(width, 10) + 'px';
					dendroCanvas.width = Math.round(width);
				}
				dendroCanvas.style.height = (height-2) + 'px';
				dendroCanvas.height = Math.round(height);
				mapItem.rowDendro.draw();
			} else {
				dendroCanvas.style.width = '0px';
			}
		}
	}
}

/*********************************************************************************************
 * FUNCTION: getColDendroPixelHeight  -  The purpose of this function is to get the pixel height
 * of the column dendrogram.
 *********************************************************************************************/
NgChm.DET.getColDendroPixelHeight = function (mapItem) {
	return mapItem.canvas.clientHeight*(mapItem.dendroHeight/mapItem.canvas.height);
}

/*********************************************************************************************
 * FUNCTION: getRowDendroPixelWidth  -  The purpose of this function is to get the pixel width
 * of the row dendrogram.
 *********************************************************************************************/
NgChm.DET.getRowDendroPixelWidth = function (mapItem) {
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
NgChm.DET.getColClassPixelHeight = function (mapItem) {
	const classbarHeight = NgChm.DET.calculateTotalClassBarHeight("column");
	return mapItem.canvas.clientHeight*(classbarHeight/mapItem.canvas.height);
}

/*********************************************************************************************
 * FUNCTION: getRowClassPixelWidth  -  The purpose of this function is to set the pixel width
 * of row covariate bars.
 *********************************************************************************************/
NgChm.DET.getRowClassPixelWidth = function (mapItem) {
	const classbarWidth = NgChm.DET.calculateTotalClassBarHeight("row");
	return mapItem.canvas.clientWidth*(classbarWidth/mapItem.canvas.width);
}

/*********************************************************************************************
 * FUNCTION:  calculateTotalClassBarHeight - This function calculates the total class bar 
 * height for detail covariates on a given axis. Covariate bars in the detail pane are just 
 * their specified height, with no rescaling.
 *********************************************************************************************/
NgChm.DET.calculateTotalClassBarHeight = function (axis) {
	return NgChm.heatMap.calculateTotalClassBarHeight (axis);
}

/**********************************************************************************
 * FUNCTION - detailDrawColClassBars: The purpose of this function is to column 
 * class bars on a given detail heat map canvas.
 **********************************************************************************/
NgChm.DET.detailDrawColClassBars = function (mapItem, pixels) {
	const colClassBarConfig = NgChm.heatMap.getColClassificationConfig();
	const colClassBarConfigOrder = NgChm.heatMap.getColClassificationOrder();
	const colClassBarData = NgChm.heatMap.getColClassificationData();
	const rowClassBarWidth = NgChm.DET.calculateTotalClassBarHeight("row");
	const fullWidth = mapItem.dataViewWidth + rowClassBarWidth;
	const mapHeight = mapItem.dataViewHeight;
	let pos = fullWidth*mapHeight*NgChm.SUM.BYTE_PER_RGBA;
	pos += fullWidth*NgChm.DET.paddingHeight*NgChm.SUM.BYTE_PER_RGBA;
	const colorMapMgr = NgChm.heatMap.getColorMapManager();
	
	for (let i=colClassBarConfigOrder.length-1; i>= 0;i--) {
		const key = colClassBarConfigOrder[i];
		if (!colClassBarConfig.hasOwnProperty(key)) {
		    continue;
		  }
		const currentClassBar = colClassBarConfig[key];
		if (currentClassBar.show === 'Y') {
			const colorMap = colorMapMgr.getColorMap("col",key); // assign the proper color scheme...
			let classBarValues = colClassBarData[key].values;
			const classBarLength = NgChm.SEL.getCurrentDetDataPerRow(mapItem) * mapItem.dataBoxWidth;
			pos += fullWidth*NgChm.DET.paddingHeight*NgChm.SUM.BYTE_PER_RGBA; // draw padding between class bars
			let start = mapItem.currentCol;
			const length = NgChm.SEL.getCurrentDetDataPerRow(mapItem);
			if (((mapItem.mode == 'RIBBONH') || (mapItem.mode == 'FULL_MAP')) &&  (typeof colClassBarData[key].svalues !== 'undefined')) {
				//Special case on large maps - if we are showing the whole row or a large part of it, use the summary classification values.
				classBarValues = colClassBarData[key].svalues;
				const rhRate = NgChm.heatMap.getColSummaryRatio(NgChm.MMGR.RIBBON_HOR_LEVEL);
			    start = Math.ceil(start/rhRate);
			}
			if (currentClassBar.bar_type === 'color_plot') {
				pos = NgChm.DET.drawColorPlotColClassBar(mapItem, pixels, pos, rowClassBarWidth, start, length, currentClassBar, classBarValues, classBarLength, colorMap);
			} else {
				pos = NgChm.DET.drawScatterBarPlotColClassBar(mapItem, pixels, pos, currentClassBar.height-NgChm.DET.paddingHeight, classBarValues, start, length, currentClassBar, colorMap);
			}
		  }

	}
}

/**********************************************************************************
 * FUNCTION - drawColorPlotColClassBar: The purpose of this function is to column 
 * color plot class bars on a given detail heat map canvas.
 **********************************************************************************/
NgChm.DET.drawColorPlotColClassBar = function(mapItem, pixels, pos, rowClassBarWidth, start, length, currentClassBar, classBarValues, classBarLength, colorMap) {
	const line = new Uint8Array(new ArrayBuffer(classBarLength * NgChm.SUM.BYTE_PER_RGBA)); // save a copy of the class bar
	let loc = 0;
	for (let k = start; k <= start + length -1; k++) { 
		const val = classBarValues[k-1];
		const color = colorMap.getClassificationColor(val);
		for (let j = 0; j < mapItem.dataBoxWidth; j++) {
			line[loc] = color['r'];
			line[loc + 1] = color['g'];
			line[loc + 2] = color['b'];
			line[loc + 3] = color['a'];
			loc += NgChm.SUM.BYTE_PER_RGBA;
		}
	}
	for (let j = 0; j < currentClassBar.height-NgChm.DET.paddingHeight; j++){ // draw the class bar into the dataBuffer
		pos += (rowClassBarWidth + 1)*NgChm.SUM.BYTE_PER_RGBA;
		for (let k = 0; k < line.length; k++) { 
			pixels[pos] = line[k];
			pos++;
		}
		pos+=NgChm.SUM.BYTE_PER_RGBA;
	}
	return pos;
}

/**********************************************************************************
 * FUNCTION - drawScatterBarPlotColClassBar: The purpose of this function is to column 
 * bar and scatter plot class bars on a given detail heat map canvas.
 **********************************************************************************/
NgChm.DET.drawScatterBarPlotColClassBar = function(mapItem, pixels, pos, height, classBarValues, start, length, currentClassBar, colorMap) {
	const barFgColor = colorMap.getHexToRgba(currentClassBar.fg_color);
	const barBgColor = colorMap.getHexToRgba(currentClassBar.bg_color);
	const barCutColor = colorMap.getHexToRgba("#FFFFFF");
	const matrix = NgChm.SUM.buildScatterBarPlotMatrix(height, classBarValues, start-1, length, currentClassBar, 100, false);
	const rowClassBarWidth = NgChm.DET.calculateTotalClassBarHeight("row");

	//offset value for width of row class bars
	let offset = (rowClassBarWidth + 2)*NgChm.SUM.BYTE_PER_RGBA;
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
				pos+=NgChm.SUM.BYTE_PER_RGBA;
			}
		}
	}
	return pos;
}

/**********************************************************************************
 * FUNCTION - detailDrawRowClassBars: The purpose of this function is to row 
 * class bars on a given detail heat map canvas.
 **********************************************************************************/
NgChm.DET.detailDrawRowClassBars = function (mapItem, pixels) {
	const rowClassBarConfig = NgChm.heatMap.getRowClassificationConfig();
	const rowClassBarConfigOrder = NgChm.heatMap.getRowClassificationOrder();
	const rowClassBarData = NgChm.heatMap.getRowClassificationData();
	const rowClassBarWidth = NgChm.DET.calculateTotalClassBarHeight("row");
	const detailTotalWidth = NgChm.DET.calculateTotalClassBarHeight("row") + mapItem.dataViewWidth;
	const mapWidth =  NgChm.DET.calculateTotalClassBarHeight("row") + mapItem.dataViewWidth;
	const mapHeight = mapItem.dataViewHeight;
	const colorMapMgr = NgChm.heatMap.getColorMapManager();
	let offset = ((detailTotalWidth*NgChm.DET.dataViewBorder/2)) * NgChm.SUM.BYTE_PER_RGBA; // start position of very bottom dendro
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
			const length = NgChm.SEL.getCurrentDetDataPerCol(mapItem);
			if (((mapItem.mode == 'RIBBONV') || (mapItem.mode == 'FULL_MAP')) &&  (typeof rowClassBarData[key].svalues !== 'undefined')) {
				//Special case on large maps, if we are showing the whole column, switch to the summary classificaiton values
				classBarValues = rowClassBarData[key].svalues;
				const rvRate = NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.RIBBON_VERT_LEVEL);
			    start = Math.ceil(start/rvRate);
			}
			let pos = offset; // move past the dendro and the other class bars...
			if (currentClassBar.bar_type === 'color_plot') {
				pos = NgChm.DET.drawColorPlotRowClassBar(mapItem, pixels, pos, start, length, currentClassBar, classBarValues, mapWidth, colorMap);
			} else {
				pos = NgChm.DET.drawScatterBarPlotRowClassBar(mapItem, pixels, pos, start, length, currentClassBar.height-NgChm.DET.paddingHeight, classBarValues, mapWidth, colorMap, currentClassBar);
			}
			offset+= currentClassBar.height*NgChm.SUM.BYTE_PER_RGBA;
		}
	}	
}

/**********************************************************************************
 * FUNCTION - drawColorPlotRowClassBar: The purpose of this function is to row 
 * color plot class bars on a given detail heat map canvas.
 **********************************************************************************/
NgChm.DET.drawColorPlotRowClassBar = function(mapItem, pixels, pos, start, length, currentClassBar, classBarValues, mapWidth, colorMap) {
	for (let j = start + length - 1; j >= start; j--){ // for each row shown in the detail panel
		const val = classBarValues[j-1];
		const color = colorMap.getClassificationColor(val);
		for (let boxRows = 0; boxRows < mapItem.dataBoxHeight; boxRows++) { // draw this color to the proper height
			for (let k = 0; k < currentClassBar.height-NgChm.DET.paddingHeight; k++){ // draw this however thick it needs to be
				pixels[pos] = color['r'];
				pixels[pos + 1] = color['g'];
				pixels[pos + 2] = color['b'];
				pixels[pos + 3] = color['a'];
				pos+=NgChm.SUM.BYTE_PER_RGBA;	// 4 bytes per color
			}
			// padding between class bars
			pos+=NgChm.DET.paddingHeight*NgChm.SUM.BYTE_PER_RGBA;
			pos+=(mapWidth - currentClassBar.height)*NgChm.SUM.BYTE_PER_RGBA;
		}
	}
	return pos;
}

/**********************************************************************************
 * FUNCTION - drawScatterBarPlotRowClassBar: The purpose of this function is to row 
 * bar and scatter plot class bars on a given detail heat map canvas.
 **********************************************************************************/
NgChm.DET.drawScatterBarPlotRowClassBar = function(mapItem, pixels, pos, start, length, height, classBarValues, mapWidth, colorMap, currentClassBar) {
	const barFgColor = colorMap.getHexToRgba(currentClassBar.fg_color);
	const barBgColor = colorMap.getHexToRgba(currentClassBar.bg_color);
	const barCutColor = colorMap.getHexToRgba("#FFFFFF");
	const matrix = NgChm.SUM.buildScatterBarPlotMatrix(height, classBarValues, start-1, length, currentClassBar, NgChm.heatMap.getTotalRows(), false);
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
				pos+=NgChm.SUM.BYTE_PER_RGBA;
			}
			// go total width of the summary canvas and back up the width of a single class bar to return to starting point for next row 
			// padding between class bars
			pos+=NgChm.DET.paddingHeight*NgChm.SUM.BYTE_PER_RGBA;
			pos+=(mapWidth - currentClassBar.height)*NgChm.SUM.BYTE_PER_RGBA;
		}
	}
	return pos;
}

//----------------------------------------------------------------------------------------------//
//----------------------------------------------------------------------------------------------//
//BEGIN WEBGL RELATED DETAIL DISPLAY FUNCTIONS
//----------------------------------------------------------------------------------------------//
//----------------------------------------------------------------------------------------------//

/*********************************************************************************************
 * FUNCTION:  detSetupGl - The purpose of this function is to set up the WebGl context for
 * a detail heat map canvas.
 *********************************************************************************************/
NgChm.DET.detSetupGl = function (mapItem) {
	mapItem.gl = NgChm.SUM.webGlGetContext(mapItem.canvas);
	if (!mapItem.gl) { return; }
	mapItem.gl.viewportWidth = mapItem.dataViewWidth+NgChm.DET.calculateTotalClassBarHeight("row");
	mapItem.gl.viewportHeight = mapItem.dataViewHeight+NgChm.DET.calculateTotalClassBarHeight("column");
	mapItem.gl.clearColor(1, 1, 1, 1);

	const program = mapItem.gl.createProgram();
	const vertexShader = NgChm.DET.getDetVertexShader(mapItem.gl);
	const fragmentShader = NgChm.DET.getDetFragmentShader(mapItem.gl);
	mapItem.gl.program = program;
	mapItem.gl.attachShader(program, vertexShader);
	mapItem.gl.attachShader(program, fragmentShader);
	mapItem.gl.linkProgram(program);
	mapItem.gl.useProgram(program);
}

/*********************************************************************************************
 * FUNCTION:  detInitGl - The purpose of this function is to initialize a WebGl canvas for 
 * the presentation of a detail heat map
 *********************************************************************************************/
NgChm.DET.detInitGl = function (mapItem) {
	if (!mapItem.gl) return;

	mapItem.gl.viewport(0, 0, mapItem.gl.viewportWidth, mapItem.gl.viewportHeight);
	mapItem.gl.clear(mapItem.gl.COLOR_BUFFER_BIT);

	// Vertices
	const buffer = mapItem.gl.createBuffer();
	mapItem.gl.buffer = buffer;
	mapItem.gl.bindBuffer(mapItem.gl.ARRAY_BUFFER, buffer);
	const vertices = [ -1, -1, 1, -1, 1, 1, -1, -1, -1, 1, 1, 1 ];
	mapItem.gl.bufferData(mapItem.gl.ARRAY_BUFFER, new Float32Array(vertices), mapItem.gl.STATIC_DRAW);
	const byte_per_vertex = Float32Array.BYTES_PER_ELEMENT;
	const component_per_vertex = 2;
	buffer.numItems = vertices.length / component_per_vertex;
	const stride = component_per_vertex * byte_per_vertex;
	const program = mapItem.gl.program;
	const position = mapItem.gl.getAttribLocation(program, 'position');
 	
	
	mapItem.uScale = mapItem.gl.getUniformLocation(program, 'u_scale');
	mapItem.uTranslate = mapItem.gl.getUniformLocation(program, 'u_translate');
	mapItem.gl.enableVertexAttribArray(position);
	mapItem.gl.vertexAttribPointer(position, 2, mapItem.gl.FLOAT, false, stride, 0);

	// Texture coordinates for map.
	const texcoord = mapItem.gl.getAttribLocation(program, "texCoord");
	const texcoordBuffer = mapItem.gl.createBuffer();
	mapItem.gl.bindBuffer(mapItem.gl.ARRAY_BUFFER, texcoordBuffer);
	mapItem.gl.bufferData(mapItem.gl.ARRAY_BUFFER, new Float32Array([ 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1 ]), mapItem.gl.STATIC_DRAW);
	mapItem.gl.enableVertexAttribArray(texcoord);
	mapItem.gl.vertexAttribPointer(texcoord, 2, mapItem.gl.FLOAT, false, 0, 0)
	
	// Texture
	const texture = mapItem.gl.createTexture();
	mapItem.gl.bindTexture(mapItem.gl.TEXTURE_2D, texture);
	mapItem.gl.texParameteri(
			mapItem.gl.TEXTURE_2D, 
			mapItem.gl.TEXTURE_WRAP_S, 
			mapItem.gl.CLAMP_TO_EDGE);
	mapItem.gl.texParameteri(
			mapItem.gl.TEXTURE_2D, 
			mapItem.gl.TEXTURE_WRAP_T, 
			mapItem.gl.CLAMP_TO_EDGE);
	mapItem.gl.texParameteri(
			mapItem.gl.TEXTURE_2D, 
			mapItem.gl.TEXTURE_MIN_FILTER,
			mapItem.gl.NEAREST);
	mapItem.gl.texParameteri(
			mapItem.gl.TEXTURE_2D, 
			mapItem.gl.TEXTURE_MAG_FILTER, 
			mapItem.gl.NEAREST);
}

NgChm.DET.getDetVertexShader = function (theGL) {
	const source = 'attribute vec2 position;    ' +
	             'attribute vec2 texCoord;    ' +
		         'varying vec2 v_texPosition; ' +
		         'uniform vec2 u_translate;   ' +
		         'uniform vec2 u_scale;       ' +
		         'void main () {              ' +
		         '  vec2 scaledPosition = position * u_scale;               ' +
		         '  vec2 translatedPosition = scaledPosition + u_translate; ' +
		         '  gl_Position = vec4(translatedPosition, 0, 1);           ' +
		         '  v_texPosition = texCoord;                               ' +
		         '}';
    //'  v_texPosition = position * 0.5 + 0.5;                   ' +

	const shader = theGL.createShader(theGL.VERTEX_SHADER);
	theGL.shaderSource(shader, source);
	theGL.compileShader(shader);
	if (!theGL.getShaderParameter(shader, theGL.COMPILE_STATUS)) {
		console.log(theGL.getShaderInfoLog(shader)); //alert
    }

	return shader;
}

NgChm.DET.getDetFragmentShader = function (theGL) {
	const source = 'precision mediump float;        ' +
		  		 'varying vec2 v_texPosition;     ' +
 		 		 'varying float v_boxFlag;        ' +
 		 		 'uniform sampler2D u_texture;    ' +
 		 		 'void main () {                  ' +
 		 		 '	  gl_FragColor = texture2D(u_texture, v_texPosition); ' +
 		 		 '}'; 


	const shader = theGL.createShader(theGL.FRAGMENT_SHADER);
	theGL.shaderSource(shader, source);
	theGL.compileShader(shader);
	if (!theGL.getShaderParameter(shader, theGL.COMPILE_STATUS)) {
		console.log(theGL.getShaderInfoLog(shader)); //alert
    }

	return shader;
};

(function() {
	// Define a function to switch a panel to the detail view.
	// Similar to the corresponding function for switching a pane to the summary view.
	// See additional comments in that function.
	NgChm.DET.switchPaneToDetail = switchPaneToDetail;
	NgChm.Pane.registerPaneContentOption ('Detail heatmap', switchPaneToDetail);

	let savedChmElements = [];
	let firstSwitch = true;

	function switchPaneToDetail (loc) { 
		if (loc.pane === null) return;  //Builder logic for panels that don't show detail
		const debug = false;
		let isPrimary = false;
		if (firstSwitch) {
			// First time detail NGCHM created.
			NgChm.SRCH.clearAllSearchResults();
			NgChm.Pane.emptyPaneLocation (loc);
			loc.pane.appendChild (document.getElementById('detail_chm'));
			firstSwitch = false;
			isPrimary = true;
		} else {
			NgChm.Pane.clearExistingGearDialog(loc.pane.id);
			if (savedChmElements.length > 0) {
				// Detail NGCHM not currently showing in a pane.
				NgChm.DMM.primaryMap.pane = loc.pane.id;
			  	NgChm.DMM.DetailMaps.push(NgChm.DMM.primaryMap);
				NgChm.Pane.emptyPaneLocation (loc);
				isPrimary = true;
			} else {
				// Detail NGCHM currently showing in a pane.
				const oldLoc = NgChm.Pane.findPaneLocation (NgChm.DMM.primaryMap.chm);
				if (oldLoc.pane === loc.pane) return;
				NgChm.Pane.emptyPaneLocation (loc);
				// Remove from previous location. Will set savedChmElements.
				savedChmElements = NgChm.Pane.openDetailPaneLocation (oldLoc, loc.pane.id);
			}
			while (savedChmElements.length > 0) {
				const el = savedChmElements.shift(); 
				loc.pane.appendChild (el);
			}
			NgChm.DEV.addEvents(loc.pane.id);
			NgChm.SUM.drawLeftCanvasBox();
		}
		NgChm.Pane.setPaneClientIcons(loc, [
		    zoomButton ('primary_btn'+NgChm.DMM.nextMapNumber, 'images/primary.png', 'images/primaryHover.png', 'Set to Primary', 75, NgChm.DMM.switchToPrimary.bind('chm', loc.pane.children[1])),
		    zoomButton ('zoomOut_btn'+NgChm.DMM.nextMapNumber, 'images/zoomOut.png', 'images/zoomOutHover.png', 'Zoom Out', 50, NgChm.DEV.detailDataZoomOut.bind('chm', loc.pane.children[1])),
		    zoomButton ('zoomIn_btn'+NgChm.DMM.nextMapNumber, 'images/zoomIn.png', 'images/zoomInHover.png', 'Zoom In', 40, NgChm.DEV.zoomAnimation.bind('chm', loc.pane.children[1])),
		    modeButton ('full_btn'+NgChm.DMM.nextMapNumber, 'images/full_selected.png', NgChm.UHM.fullBtnOver, 'Normal View', 65, () => {
			const mapItem = NgChm.DMM.getMapItemFromPane(loc.pane.id);
			NgChm.DEV.clearModeHistory (mapItem);
			NgChm.DEV.detailNormal (mapItem);
		    }),
		    modeButton ('ribbonH_btn'+NgChm.DMM.nextMapNumber, 'images/ribbonH.png', NgChm.UHM.ribbonHBtnOver, 'Horizontal Ribbon View: Show all columns/samples', 115, () => {
			const mapItem = NgChm.DMM.getMapItemFromPane(loc.pane.id);
			NgChm.DEV.clearModeHistory (mapItem);
			NgChm.DEV.detailHRibbonButton (mapItem);
		    }),
		    modeButton ('ribbonV_btn'+NgChm.DMM.nextMapNumber, 'images/ribbonV.png', NgChm.UHM.ribbonVBtnOver, 'Vertical Ribbon View: Show all rows/targets', 100, () => {
			const mapItem = NgChm.DMM.getMapItemFromPane(loc.pane.id);
			NgChm.DEV.clearModeHistory (mapItem);
			NgChm.DEV.detailVRibbonButton (mapItem)
		    })
		]);
		if (isPrimary === true) {
			document.getElementById('primary_btn'+NgChm.DMM.nextMapNumber).style.display = 'none';
			NgChm.Pane.setPaneTitle (loc, 'Detailed View');
		} else {
			document.getElementById('primary_btn'+NgChm.DMM.nextMapNumber).style.display = '';
			NgChm.Pane.setPaneTitle (loc, 'Heat Map Detail - Ver '+NgChm.DMM.nextMapNumber);
		}
		NgChm.Pane.registerPaneEventHandler (loc.pane, 'empty', emptyDetailPane);
		NgChm.Pane.registerPaneEventHandler (loc.pane, 'resize', resizeDetailPane);
	}

	function emptyDetailPane (pane, elements) {
		//Save chm elements if Primary detail pane is being closed.
		if ((NgChm.DMM.getMapItemFromPane(pane.pane.id).version === 'P') && (NgChm.DMM.DetailMaps.length === 1)) {
			savedChmElements = elements;
		}
		NgChm.DMM.RemoveDetailMap(pane.pane.id); 
	}

	function resizeDetailPane (loc) {
		NgChm.DMM.detailResize();    
		NgChm.DET.setDrawDetailTimeout(NgChm.DMM.getMapItemFromPane(loc.pane.id), NgChm.DET.redrawSelectionTimeout, false);
	}

	function zoomButton (btnId, btnIcon, btnHoverIcon, btnHelp, btnSize, clickFn) {
	    const img = NgChm.UTIL.newElement ('IMG#'+btnId, { src: btnIcon, alt: btnHelp });
	    img.onmouseout = function (e) {
			img.setAttribute ('src', btnIcon);
			NgChm.UHM.hlpC();
	    };
	    img.onmouseover = function (e) {
			img.setAttribute ('src', btnHoverIcon);
			NgChm.UHM.hlp(img, btnHelp, btnSize);
	    };
	    img.onclick = function (e) {
			clickFn();
	    };
	    return NgChm.UTIL.newElement ('SPAN.tdTop', {}, [img]);
	}

	function modeButton (btnId, btnIcon, btnOverFn, btnHelp, btnSize, clickFn) {
	    const img = NgChm.UTIL.newElement ('IMG#'+btnId, { src: btnIcon, alt: btnHelp });
	    img.onmouseout = function (e) {
			btnOverFn (img, 0);
			NgChm.UHM.hlpC();
	    };
	    img.onmouseover = function (e) {
			btnOverFn (img, 1);
			NgChm.UHM.hlp(img, btnHelp, btnSize);
	    };
	    img.onclick = function (e) {
			clickFn();
	    };
	    return NgChm.UTIL.newElement ('SPAN.tdTop', {}, [img]);
	}

})();
