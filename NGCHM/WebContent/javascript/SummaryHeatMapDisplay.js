//Define Namespace for NgChm SummaryHeatMapDisplay
NgChm.createNS('NgChm.SUM');

NgChm.SUM.BYTE_PER_RGBA = 4;

NgChm.SUM.canvas;
NgChm.SUM.boxCanvas;  //canvas on top of WebGL canvas for selection box 
NgChm.SUM.gl; // WebGL contexts
NgChm.SUM.textureParams;
NgChm.SUM.texPixels;

//Size of heat map components
NgChm.SUM.heightPct = .96; // this is the amount of vertical space the col dendro and the map should take up on the summary chm div (taken from the css)
NgChm.SUM.widthPct = .90; // this is the amount of horizontal space the row dendro and the map should take up on the summary chm div (taken from the css)
NgChm.SUM.paddingHeight = 2;

NgChm.SUM.colDendro;
NgChm.SUM.rowDendro;

NgChm.SUM.rowClassPadding = 2;          // space between classification bars
NgChm.SUM.colClassPadding = 2;          // space between classification bars
NgChm.SUM.rowClassBarWidth;
NgChm.SUM.colClassBarHeight;
NgChm.SUM.rowClassScale = 1;
NgChm.SUM.colClassScale = 1;
NgChm.SUM.matrixWidth;
NgChm.SUM.matrixHeight;
NgChm.SUM.totalHeight;
NgChm.SUM.totalWidth;

NgChm.SUM.maxValues = 9999999999.99;
NgChm.SUM.avgValue = 0;
NgChm.SUM.texProgram;
NgChm.SUM.eventTimer = 0; // Used to delay draw updates
NgChm.SUM.dragSelect=false;	  // Indicates if user has made a drag selection on the summary panel
NgChm.SUM.clickStartRow=null;   // End row of current selected position
NgChm.SUM.clickStartCol=null;   // Left column of the current selected position
NgChm.SUM.mouseEventActive = false;

NgChm.SUM.displayInfoMessage = function() {
	NgChm.UHM.minimumFontSize();
}

//Main function that draws the summary heat map. chmFile is only used in file mode.
NgChm.SUM.initSummaryDisplay = function() {
	NgChm.SUM.addCustomJS();
    NgChm.SUM.setBrowserMinFontSize();
    if (NgChm.DET.minLabelSize > 5) {
    	var msgButton = document.getElementById('messageOpen_btn');
    	msgButton.style.display = ''; 
    }
  
	NgChm.SUM.canvas = document.getElementById('summary_canvas');
	NgChm.SUM.boxCanvas = document.getElementById('summary_box_canvas');
	
	//Add necessary event listeners for canvas
	NgChm.SUM.canvas.addEventListener("touchstart", NgChm.SUM.onMouseDownCanvas);
	NgChm.SUM.canvas.addEventListener("touchend", NgChm.SUM.onMouseUpCanvas);
	NgChm.SUM.canvas.onmousedown = NgChm.SUM.onMouseDownCanvas;
	NgChm.SUM.canvas.onmouseup = NgChm.SUM.onMouseUpCanvas;
	NgChm.SUM.canvas.onmousemove = NgChm.SUM.onMouseMoveCanvas;
	NgChm.SUM.canvas.onmouseout = NgChm.SUM.onMouseOut;
	document.addEventListener("keydown",NgChm.SEL.keyNavigate);
	
	// set the position to (1,1) so that the detail pane loads at the top left corner of the summary.
	NgChm.SEL.currentRow = 1;
	NgChm.SEL.currentCol = 1;
	if (NgChm.UTIL.getURLParameter("row") !== "" && !isNaN(Number(NgChm.UTIL.getURLParameter("row")))){
		NgChm.SEL.currentRow = Number(NgChm.UTIL.getURLParameter("row"))
	}
	if (NgChm.UTIL.getURLParameter("column") !== "" && !isNaN(Number(NgChm.UTIL.getURLParameter("column")))){
		NgChm.SEL.currentCol = Number(NgChm.UTIL.getURLParameter("column"))
	}
};

// Callback that is notified every time there is an update to the heat map 
// initialize, new data, etc.  This callback draws the summary heat map.
NgChm.SUM.processSummaryMapUpdate = function(event, level) {

	if (event == NgChm.MMGR.Event_INITIALIZED) {
		NgChm.heatMap.configureButtonBar();
		NgChm.heatMap.configureFlick();
		document.title = NgChm.heatMap.getMapInformation().name;
		NgChm.SUM.summaryInit();
	} else if (event == NgChm.MMGR.Event_NEWDATA && level == NgChm.MMGR.SUMMARY_LEVEL){
		//Summary tile - wait a bit to see if we get another tile quickly, then draw
		if (NgChm.SUM.eventTimer != 0) {
			//New tile arrived - reset timer
			clearTimeout(NgChm.SUM.eventTimer);
		}
		NgChm.SUM.eventTimer = setTimeout(NgChm.SUM.buildSummaryTexture, 200);
	} 
	//Ignore updates to other tile types.
}

// Perform all initialization functions for Summary heat map
NgChm.SUM.summaryInit = function() {
	if (!NgChm.SUM.colDendro){
		NgChm.SUM.colDendro = new NgChm.DDR.SummaryColumnDendrogram();
	}
	if (!NgChm.SUM.rowDendro){
		NgChm.SUM.rowDendro = new NgChm.DDR.SummaryRowDendrogram ();
	}
	
	NgChm.SUM.matrixWidth = NgChm.heatMap.getNumColumns(NgChm.MMGR.SUMMARY_LEVEL);
	NgChm.SUM.matrixHeight = NgChm.heatMap.getNumRows(NgChm.MMGR.SUMMARY_LEVEL);
	
	//Classificaton bars get stretched on small maps, scale down the bars and padding.
	NgChm.SUM.rowClassScale = Math.min(NgChm.SUM.matrixWidth / 500, 1);
	NgChm.SUM.rowClassPadding = Math.ceil(NgChm.SUM.rowClassPadding * NgChm.SUM.rowClassScale);
	NgChm.SUM.colClassScale = Math.min(NgChm.SUM.matrixHeight / 500, 1);
	NgChm.SUM.colClassPadding = Math.ceil(NgChm.SUM.colClassPadding * NgChm.SUM.colClassScale);
	NgChm.SUM.rowClassBarWidth = NgChm.SUM.calculateSummaryTotalClassBarHeight("row");
	NgChm.SUM.colClassBarHeight = NgChm.SUM.calculateSummaryTotalClassBarHeight("column");

	NgChm.SUM.calcTotalSize();
	//Resize summary area for small or skewed maps.
	NgChm.SUM.initSummarySize();
	NgChm.SUM.rowDendro.resize();
	NgChm.SUM.rowDendro.draw();
	NgChm.SUM.colDendro.resize();
	NgChm.SUM.colDendro.draw();
	NgChm.SUM.canvas.width =  NgChm.SUM.totalWidth;
	NgChm.SUM.canvas.height = NgChm.SUM.totalHeight;
	
	var nameDiv = document.getElementById("mapName");
	var mapName = NgChm.heatMap.getMapInformation().name;
	if (mapName.length > 80){
		mapName = mapName.substring(0,80) + "...";
	}

	nameDiv.innerHTML = "<b>Map Name:</b>&nbsp;&nbsp;"+mapName;
	NgChm.SUM.setupGl();
	NgChm.SUM.initGl();
	NgChm.SUM.buildSummaryTexture();
	NgChm.SUM.drawLeftCanvasBox();

	NgChm.SUM.setSelectionDivSize();
	NgChm.SUM.clearSelectionMarks();
	NgChm.SUM.drawRowSelectionMarks();
	NgChm.SUM.drawColSelectionMarks();
}

NgChm.SUM.addCustomJS = function(){
	if (NgChm.heatMap.isInitialized()){
		var head = document.getElementsByTagName('head')[0];
	    var script = document.createElement('script');
	    script.type = 'text/javascript';
	    script.src = NgChm.staticPath + 'javascript/custom.js';
	    head.appendChild(script);
	} else {
		setTimeout(function(){ NgChm.SUM.addCustomJS();}, 100);
	}
}

// Sets summary and detail chm to the config height and width.
NgChm.SUM.initSummarySize = function() {
	var summary = document.getElementById('summary_chm');
	var divider = document.getElementById('divider');
	var detail = document.getElementById('detail_chm');
	summary.style.width = parseFloat(NgChm.heatMap.getMapInformation().summary_width)*.96 + "%";
	
	summary.style.height = container.clientHeight*parseFloat(NgChm.heatMap.getMapInformation().summary_height)/100 + "px";
	
	detail.style.width = parseFloat(NgChm.heatMap.getMapInformation().detail_width)*.96 + "%";
	detail.style.height = container.clientHeight*parseFloat(NgChm.heatMap.getMapInformation().detail_height)/100 + "px";
	divider.style.height = document.getElementById("summary_chm").clientHeight*NgChm.SUM.heightPct;
	
	NgChm.SUM.setSummarySize();
}

// Sets summary and detail chm to newly adjusted size.
NgChm.SUM.setSummarySize = function() {
	var left = NgChm.SUM.rowDendro.getDivWidth()*NgChm.SUM.widthPct + NgChm.SUM.paddingHeight;
	var top = NgChm.SUM.colDendro.getDivHeight() + NgChm.SUM.paddingHeight;
	var width = document.getElementById("summary_chm").clientWidth - NgChm.SUM.rowDendro.getDivWidth();
	var height = document.getElementById("summary_chm").clientHeight*NgChm.SUM.heightPct - NgChm.SUM.colDendro.getDivHeight();

	NgChm.SUM.canvas.style.left=left;
	NgChm.SUM.canvas.style.top=top;
	NgChm.SUM.canvas.style.width=width;
	NgChm.SUM.canvas.style.height=height;
	NgChm.SUM.setSelectionDivSize();
	//The selection box canvas is on top of the webGL canvas but
	//is always resized to the actual on screen size to draw boxes clearly.
	NgChm.SUM.boxCanvas.style.left=left;
	NgChm.SUM.boxCanvas.style.top=NgChm.SUM.canvas.style.top;
	NgChm.SUM.boxCanvas.width = width+1;
	NgChm.SUM.boxCanvas.height = height+1;
	NgChm.DET.setDetCanvasBoxSize();
}

//Set the variables for the total size of the summary heat map - used to set canvas, WebGL texture, and viewport size.
NgChm.SUM.calcTotalSize = function() {
	NgChm.SUM.totalHeight = NgChm.SUM.matrixHeight + NgChm.SUM.colClassBarHeight;
	NgChm.SUM.totalWidth = NgChm.SUM.matrixWidth + NgChm.SUM.rowClassBarWidth;
}

NgChm.SUM.setSelectionDivSize = function(){
	var colSel = document.getElementById("summary_col_select_canvas");
	var rowSel = document.getElementById("summary_row_select_canvas");
	colSel.style.left = parseFloat(NgChm.SUM.canvas.style.left) + NgChm.SUM.canvas.clientWidth * ((NgChm.SUM.calculateSummaryTotalClassBarHeight("row"))/NgChm.SUM.canvas.width);;
	colSel.style.top = NgChm.SUM.colDendro.getDivHeight() + NgChm.SUM.canvas.clientHeight; 
	colSel.style.width = NgChm.SUM.canvas.clientWidth * ((NgChm.SUM.canvas.width-NgChm.SUM.calculateSummaryTotalClassBarHeight("row"))/NgChm.SUM.canvas.width);
	colSel.style.height = 10;
	colSel.width = NgChm.heatMap.getNumColumns("d");
	colSel.height = 10;
	
	rowSel.style.left = NgChm.SUM.canvas.offsetLeft+NgChm.SUM.canvas.offsetWidth;
	rowSel.style.top = NgChm.SUM.colDendro.getDivHeight() + NgChm.SUM.canvas.clientHeight*(NgChm.SUM.calculateSummaryTotalClassBarHeight("col")/NgChm.SUM.canvas.height);
	rowSel.style.width = 10;
	rowSel.style.height = NgChm.SUM.canvas.clientHeight*((NgChm.SUM.canvas.height-NgChm.SUM.calculateSummaryTotalClassBarHeight("col"))/NgChm.SUM.canvas.height);
	rowSel.width = 10;
	rowSel.height = NgChm.heatMap.getNumRows("d");
}

NgChm.SUM.buildSummaryTexture = function() {
	NgChm.SUM.eventTimer = 0;

	var colorMap = NgChm.heatMap.getColorMapManager().getColorMap("data",NgChm.SEL.currentDl);
	var colors = colorMap.getColors();
	var missing = colorMap.getMissingColor();
	
	var pos = 0;
	
	//Setup texture to draw on canvas.
	//Needs to go backward because WebGL draws bottom up.
	NgChm.SUM.avgValue = 0;
	for (var i = NgChm.heatMap.getNumRows(NgChm.MMGR.SUMMARY_LEVEL); i > 0; i--) {
		pos += (NgChm.SUM.rowClassBarWidth)*NgChm.SUM.BYTE_PER_RGBA; // SKIP SPACE RESERVED FOR ROW CLASSBARS + ROW DENDRO
		for (var j = 1; j <= NgChm.heatMap.getNumColumns(NgChm.MMGR.SUMMARY_LEVEL); j++) { // draw the heatmap
			var val = NgChm.heatMap.getValue(NgChm.MMGR.SUMMARY_LEVEL, i, j);
			if (val < NgChm.SUM.maxValues) {
				NgChm.SUM.avgValue += val;
			}
			var color = colorMap.getColor(val);

			NgChm.SUM.texPixels[pos] = color['r'];
			NgChm.SUM.texPixels[pos + 1] = color['g'];
			NgChm.SUM.texPixels[pos + 2] = color['b'];
			NgChm.SUM.texPixels[pos + 3] = color['a'];
			pos+=NgChm.SUM.BYTE_PER_RGBA;
		}
	}
	NgChm.SUM.avgValue = (NgChm.SUM.avgValue / (NgChm.heatMap.getNumRows(NgChm.MMGR.SUMMARY_LEVEL) * NgChm.heatMap.getNumColumns(NgChm.MMGR.SUMMARY_LEVEL)));
	// draw column classifications after the map
	NgChm.SUM.drawColClassBars(NgChm.SUM.texPixels);
	
	// draw row classifications after that
	NgChm.SUM.drawRowClassBars(NgChm.SUM.texPixels);
	
	NgChm.SUM.drawSummaryHeatMap();
}
	
//WebGL code to draw the summary heat map.
NgChm.SUM.drawSummaryHeatMap = function() {
	NgChm.SUM.gl.useProgram(NgChm.SUM.texProgram);
	var buffer = NgChm.SUM.gl.createBuffer();
	NgChm.SUM.gl.buffer = buffer;
	NgChm.SUM.gl.bindBuffer(NgChm.SUM.gl.ARRAY_BUFFER, buffer);
	var vertices = [ -1, -1, 1, -1, 1, 1, -1, -1, -1, 1, 1, 1 ];
	NgChm.SUM.gl.bufferData(NgChm.SUM.gl.ARRAY_BUFFER, new Float32Array(vertices), NgChm.SUM.gl.STATIC_DRAW);
	var byte_per_vertex = Float32Array.BYTES_PER_ELEMENT;
	var component_per_vertex = 2;
	buffer.numItems = vertices.length / component_per_vertex;
	var stride = component_per_vertex * byte_per_vertex;
	//var program = gl.program;
	var position = NgChm.SUM.gl.getAttribLocation(NgChm.SUM.texProgram, 'position');	
	NgChm.SUM.gl.enableVertexAttribArray(position);
	NgChm.SUM.gl.vertexAttribPointer(position, 2, NgChm.SUM.gl.FLOAT, false, stride, 0);
	NgChm.SUM.gl.activeTexture(NgChm.SUM.gl.TEXTURE0);
	NgChm.SUM.gl.texImage2D(
			NgChm.SUM.gl.TEXTURE_2D, 
			0, 
			NgChm.SUM.gl.RGBA, 
			NgChm.SUM.textureParams['width'], 
			NgChm.SUM.textureParams['height'], 
			0, 
			NgChm.SUM.gl.RGBA,
			NgChm.SUM.gl.UNSIGNED_BYTE, 
			NgChm.SUM.texPixels);
	NgChm.SUM.gl.drawArrays(NgChm.SUM.gl.TRIANGLE_STRIP, 0, NgChm.SUM.gl.buffer.numItems);
}

NgChm.SUM.onMouseDownCanvas = function(evt) {
	NgChm.SUM.mouseEventActive = true;
	evt.preventDefault();
	evt.stopPropagation();	
	var boxY = ((NgChm.SUM.colClassBarHeight)/NgChm.SUM.canvas.height * NgChm.SUM.boxCanvas.height);
	var sumOffsetX = evt.touches ? evt.touches[0].offsetX : evt.offsetX;
	var sumOffsetY = evt.touches ? evt.touches[0].offsetY : evt.offsetY;
	var sumRow = NgChm.SUM.canvasToMatrixRow(NgChm.SUM.getCanvasY(sumOffsetY));
	var sumCol = NgChm.SUM.canvasToMatrixCol(NgChm.SUM.getCanvasX(sumOffsetX));
	if ((sumRow > 0) && (sumCol > 0)) {
		NgChm.SUM.canvas.style.cursor="crosshair";
	}
	NgChm.SUM.clickStartRow = (sumRow*NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL));
	NgChm.SUM.clickStartCol = (sumCol*NgChm.heatMap.getColSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL));
}

NgChm.SUM.onMouseOut = function(evt) {
	NgChm.SUM.mouseEventActive = false;
	NgChm.SUM.canvas.style.cursor="default";
}

NgChm.SUM.onMouseMoveCanvas = function(evt) {
	if (NgChm.SUM.mouseEventActive) {
		if ((NgChm.SEL.mode === 'NORMAL') && (evt.which==1)) {
			if (evt.shiftKey) {
				NgChm.SUM.dragSelection(evt);
			} else {
				NgChm.SUM.dragMove(evt);
			}
		}
	}
}

//Translate click into row column position and then draw select box.
NgChm.SUM.onMouseUpCanvas = function(evt) {
	if (NgChm.SUM.mouseEventActive) {
		evt.preventDefault();
		evt.stopPropagation();	
		var clickSection = 'Matrix';
		//Drag selection has already navigated so only move selection box if simple click has occurred.
		if (!NgChm.SUM.dragSelect) {
			var sumOffsetX = evt.touches ? evt.layerX : evt.offsetX;
			var sumOffsetY = evt.touches ? evt.layerY : evt.offsetY;
			var xPos = NgChm.SUM.getCanvasX(sumOffsetX);
			var yPos = NgChm.SUM.getCanvasY(sumOffsetY);
			NgChm.SUM.clickSelection(xPos, yPos);
			NgChm.SUM.clickStartRow = null;
			NgChm.SUM.clickStartCol = null;
		} 
		NgChm.SUM.dragSelect = false;
		NgChm.SUM.canvas.style.cursor="default";
	
		//Make sure the selected row/column are within the bounds of the matrix.
		NgChm.SEL.checkRow();
		NgChm.SEL.checkColumn();
		NgChm.SUM.mouseEventActive = false;
	}
}

NgChm.SUM.clickSelection = function(xPos, yPos) {
	var sumRow = NgChm.SUM.canvasToMatrixRow(yPos) - Math.floor(NgChm.SEL.getCurrentSumDataPerCol()/2);
	var sumCol = NgChm.SUM.canvasToMatrixCol(xPos) - Math.floor(NgChm.SEL.getCurrentSumDataPerRow()/2);
	NgChm.SEL.setCurrentRowFromSum(sumRow);
	NgChm.SEL.setCurrentColFromSum(sumCol); 
	NgChm.SEL.updateSelection();
}

NgChm.SUM.dragMove = function(evt) {
	var sumOffsetX = evt.touches ? evt.layerX : evt.offsetX;
	var sumOffsetY = evt.touches ? evt.layerY : evt.offsetY;
	var xPos = NgChm.SUM.getCanvasX(sumOffsetX);
	var yPos = NgChm.SUM.getCanvasY(sumOffsetY);
	var sumRow = NgChm.SUM.canvasToMatrixRow(yPos) - Math.floor(NgChm.SEL.getCurrentSumDataPerCol()/2);
	var sumCol = NgChm.SUM.canvasToMatrixCol(xPos) - Math.floor(NgChm.SEL.getCurrentSumDataPerRow()/2);
	NgChm.SEL.setCurrentRowFromSum(sumRow);
	NgChm.SEL.setCurrentColFromSum(sumCol); 
	NgChm.SEL.updateSelection();
}

NgChm.SUM.dragSelection = function(evt) {
	var sumOffsetX = evt.touches ? evt.touches[0].offsetX : evt.offsetX;
	var sumOffsetY = evt.touches ? evt.touches[0].offsetY : evt.offsetY;
	var xPos = NgChm.SUM.getCanvasX(sumOffsetX);
	var yPos = NgChm.SUM.getCanvasY(sumOffsetY);
	var sumRow = NgChm.SUM.canvasToMatrixRow(yPos);
	var sumCol = NgChm.SUM.canvasToMatrixCol(xPos);
	var clickEndRow = (sumRow*NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL));
	var clickEndCol = (sumCol*NgChm.heatMap.getColSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL));
	//If movement less than 5 rows and cols, disregard drag selection
	if ((Math.abs(NgChm.SUM.clickStartRow - clickEndRow) < 5) && (Math.abs(NgChm.SUM.clickStartCol - clickEndCol) < 5)) {
		NgChm.SUM.dragSelect = false;
		return;
	} else {
		NgChm.SUM.dragSelect = true;
	}
	var startRow = Math.min(NgChm.SUM.clickStartRow,clickEndRow);
	var startCol = Math.min(NgChm.SUM.clickStartCol,clickEndCol);
	var endRow = Math.max(NgChm.SUM.clickStartRow,clickEndRow);
	var endCol = Math.max(NgChm.SUM.clickStartCol,clickEndCol);
	//Size the selected box and assign the larger dimension as a 
	//value to be used in selecting zoom level to apply.
	var colVal = (endRow - startRow);
	var rowVal = (endCol - startCol);
	
	var zoomCalcVal = Math.max(colVal,rowVal);
	var boxSize = NgChm.DET.getNearestBoxSize(zoomCalcVal);
	var boxCalcVal = (NgChm.DET.dataViewWidth-NgChm.DET.dataViewBorder)/boxSize;
	if (boxCalcVal < Math.min(NgChm.heatMap.getTotalRows(),NgChm.heatMap.getTotalCols())) {
		NgChm.DET.setDetailDataSize(boxSize); 
		NgChm.SEL.currentRow = startRow;
		NgChm.SEL.currentCol = startCol;
		NgChm.SEL.checkRow();
		NgChm.SEL.checkColumn();
		NgChm.SEL.updateSelection();
	}
}

//Browsers resizes the canvas.  This function translates from a click position
//back to the original (non-scaled) canvas position. 
NgChm.SUM.getCanvasX = function(offsetX) {
	return (Math.floor((offsetX/NgChm.SUM.canvas.clientWidth) * NgChm.SUM.canvas.width));
}

NgChm.SUM.getCanvasY = function(offsetY) {
	return (Math.floor((offsetY/NgChm.SUM.canvas.clientHeight) * NgChm.SUM.canvas.height));
}

//Return the summary row given an y position on the canvas
NgChm.SUM.canvasToMatrixRow = function(y) {
	return (y - NgChm.SUM.colClassBarHeight  );
} 

NgChm.SUM.canvasToMatrixCol = function(x) {
	return (x - NgChm.SUM.rowClassBarWidth );
}

//Given a matrix row, return the canvas position
NgChm.SUM.getCanvasYFromRow = function(row) {
	return (row + NgChm.SUM.colClassBarHeight);
}

NgChm.SUM.getCanvasXFromCol = function(col) {
	return (col + NgChm.SUM.rowClassBarWidth);
}

/**********************************************************************************
 * FUNCTION - resetBoxCanvas: This function resets the summary box canvas.  It takes
 * the canvas, clears it, and draws borders.  It is broken out from drawLeftCanvas
 * box so that the canvas with borders can be used in printing PDFs where only the
 * summary view is selected.
 **********************************************************************************/
NgChm.SUM.resetBoxCanvas = function() {
	var ctx=NgChm.SUM.boxCanvas.getContext("2d");
	ctx.clearRect(0, 0, NgChm.SUM.boxCanvas.width, NgChm.SUM.boxCanvas.height);
	
	// Draw the heat map border in black
	var boxX = (NgChm.SUM.rowClassBarWidth / NgChm.SUM.totalWidth) * NgChm.SUM.boxCanvas.width;
	var boxY = (NgChm.SUM.colClassBarHeight / NgChm.SUM.totalHeight) * NgChm.SUM.boxCanvas.height;
	var boxW = NgChm.SUM.boxCanvas.width-boxX;
	var boxH = NgChm.SUM.boxCanvas.height-boxY;
	ctx.lineWidth=1;
	ctx.strokeStyle="#000000";
	ctx.strokeRect(boxX,boxY,boxW,boxH);
	
	//If in sub-dendro mode, draw rectangles outside of selected range.
	//Furthermore, if the average color is dark make those rectangles
	//lighter than the heatmap, otherwise, darker.
	if (NgChm.SEL.mode.startsWith('RIBBON')) {
		var colorMap = NgChm.heatMap.getColorMapManager().getColorMap("data",NgChm.SEL.currentDl);
		var color = colorMap.getColor(NgChm.SUM.avgValue);
		if (colorMap.isColorDark(color)) {
			ctx.fillStyle="rgba(10, 10, 10, 0.25)"; 
		} else {
			ctx.fillStyle="rgba(255, 255, 255, 0.25)"; 
		}
	}

	//Draw sub-dendro box
	if (NgChm.SEL.mode.startsWith('RIBBONH') && (NgChm.SEL.selectedStart > 0)) {
		var summaryRatio = NgChm.heatMap.getColSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL);
		var adjustedStart = NgChm.SEL.selectedStart / summaryRatio;
		var adjustedStop = NgChm.SEL.selectedStop / summaryRatio;
		boxX = (((NgChm.SUM.rowClassBarWidth - 1) / NgChm.SUM.canvas.width) * NgChm.SUM.boxCanvas.width) + 1;
		boxY = ((NgChm.SUM.colClassBarHeight)/NgChm.SUM.canvas.height * NgChm.SUM.boxCanvas.height);
		boxW = ((adjustedStart) / NgChm.SUM.canvas.width) * NgChm.SUM.boxCanvas.width;
		boxH = NgChm.SUM.boxCanvas.height-boxY;
		ctx.fillRect(boxX,boxY,boxW,boxH); 
		boxX = (((NgChm.SUM.rowClassBarWidth+adjustedStop) / NgChm.SUM.canvas.width) * NgChm.SUM.boxCanvas.width) + 1;
		boxW = (((NgChm.SUM.canvas.width-adjustedStop)+1) / NgChm.SUM.canvas.width) * NgChm.SUM.boxCanvas.width;
		ctx.fillRect(boxX,boxY,boxW,boxH); 
	} else if (NgChm.SEL.mode.startsWith('RIBBONV')  && NgChm.SEL.selectedStart > 0) {
		var summaryRatio = NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL);
		var adjustedStart = NgChm.SEL.selectedStart / summaryRatio;
		var adjustedStop = NgChm.SEL.selectedStop / summaryRatio;
		boxX = ((NgChm.SUM.rowClassBarWidth / NgChm.SUM.canvas.width) * NgChm.SUM.boxCanvas.width);
		boxY = ((NgChm.SUM.colClassBarHeight - 1)/NgChm.SUM.canvas.height * NgChm.SUM.boxCanvas.height);
		var boxW = NgChm.SUM.boxCanvas.width-boxX;
		var boxH = ((adjustedStart) / NgChm.SUM.canvas.height) * NgChm.SUM.boxCanvas.height;
		ctx.fillRect(boxX,boxY,boxW,boxH); 
		var boxY = ((NgChm.SUM.colClassBarHeight+adjustedStop)/NgChm.SUM.canvas.height * NgChm.SUM.boxCanvas.height);
		var boxH = (((NgChm.SUM.canvas.height-adjustedStop)+1) / NgChm.SUM.canvas.height) * NgChm.SUM.boxCanvas.height;
		ctx.fillRect(boxX,boxY,boxW,boxH); 
	}

	return ctx;
}

/**********************************************************************************
 * FUNCTION - drawLeftCanvasBox: This function draws the view box on the summary
 * pane whenever the position in the detail pane has changed. (e.g. on load, on click,
 * on drag, etc...). A conversion is done from detail to summary coordinates, the 
 * new box position is calculated, and the summary pane is re-drawn.  It also draws
 * the black border around the summary heat map and gray panels that bracket sub-
 * dendro selections when in sub-dendro mode.
 **********************************************************************************/
NgChm.SUM.drawLeftCanvasBox = function() {
	// Reset the canvas (drawing borders and sub-dendro selections)
	var ctx = NgChm.SUM.resetBoxCanvas(NgChm.SUM.boxCanvas);

	// Draw the View Box using user-defined defined selection color 
	boxX = (((NgChm.SEL.getCurrentSumCol() + NgChm.SUM.rowClassBarWidth - 1) / NgChm.SUM.canvas.width) * NgChm.SUM.boxCanvas.width) + 2;
	boxY = (((NgChm.SEL.getCurrentSumRow() + NgChm.SUM.colClassBarHeight - 1) / NgChm.SUM.canvas.height) * NgChm.SUM.boxCanvas.height) + 1;
	boxW = (NgChm.SEL.getCurrentSumDataPerRow() / NgChm.SUM.canvas.width) * NgChm.SUM.boxCanvas.width - 2;
	boxH = (NgChm.SEL.getCurrentSumDataPerCol() / NgChm.SUM.canvas.height) * NgChm.SUM.boxCanvas.height - 2;
	var dataLayers = NgChm.heatMap.getDataLayers();
	var dataLayer = dataLayers[NgChm.SEL.currentDl];
	ctx.strokeStyle=dataLayer.selection_color;
	ctx.lineWidth=3;
	ctx.strokeRect(boxX,boxY,boxW,boxH);
}

/***************************
 * WebGL stuff
 **************************/
NgChm.SUM.webGlGetContext = function(canvas) {
    if (!!window.WebGLRenderingContext) {
        var names = ["webgl", "experimental-webgl", "moz-webgl", "webkit-3d"];
        var context = false;
        for(var i=0;i<4;i++) {
            try {
                context = canvas.getContext(names[i], {preserveDrawingBuffer: true});
                if (context && typeof context.getParameter == "function") {
                    // WebGL is enabled
                    return context;
                }
            } catch(e) {}
        }
        // WebGL is supported, but disabled
        NgChm.UHM.noWebGlContext(true);
        return null;
    }
    // WebGL not supported
    NgChm.UHM.noWebGlContext(false);
    return null;
}


NgChm.SUM.setupGl = function() {
	NgChm.SUM.gl = NgChm.SUM.webGlGetContext(NgChm.SUM.canvas);
	if (!NgChm.SUM.gl) { return; }

	NgChm.SUM.gl.viewportWidth = NgChm.SUM.totalWidth;
	NgChm.SUM.gl.viewportHeight = NgChm.SUM.totalHeight;
	NgChm.SUM.gl.clearColor(1, 1, 1, 1);

	//Texture shaders
	NgChm.SUM.texProgram = NgChm.SUM.gl.createProgram();
	var vertexShader = NgChm.SUM.getVertexShader(NgChm.SUM.gl);
	var fragmentShader = NgChm.SUM.getFragmentShader(NgChm.SUM.gl);
	NgChm.SUM.gl.program = NgChm.SUM.texProgram;
	NgChm.SUM.gl.attachShader(NgChm.SUM.texProgram, vertexShader);
	NgChm.SUM.gl.attachShader(NgChm.SUM.texProgram, fragmentShader);
	NgChm.SUM.gl.linkProgram(NgChm.SUM.texProgram);
}


NgChm.SUM.getVertexShader = function(gl) {
	var source = 'attribute vec2 position;    ' +
		         'varying vec2 v_texPosition; ' +
		         'void main () {              ' +
		         '  gl_Position = vec4(position, 0, 1);           ' +
		         '  v_texPosition = position * 0.5 + 0.5;                   ' +
		         '}';


	var shader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	return shader;
}

NgChm.SUM.getFragmentShader = function(gl) {
	var source = 'precision mediump float;        ' +
    'varying vec2 v_texPosition;     ' +
    'varying float v_boxFlag;        ' +
    'uniform sampler2D u_texture;    ' +
    'void main () {                  ' +
    '   gl_FragColor = texture2D(u_texture, v_texPosition); ' +
    '}';


	var shader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	return shader;
}

NgChm.SUM.initGl = function() {
	NgChm.SUM.gl.useProgram(NgChm.SUM.texProgram);
	NgChm.SUM.gl.viewport(0, 0, NgChm.SUM.gl.viewportWidth, NgChm.SUM.gl.viewportHeight);
	NgChm.SUM.gl.clear(NgChm.SUM.gl.COLOR_BUFFER_BIT);

	// Vertices
	var buffer = NgChm.SUM.gl.createBuffer();
	NgChm.SUM.gl.buffer = buffer;
	NgChm.SUM.gl.bindBuffer(NgChm.SUM.gl.ARRAY_BUFFER, buffer);
	var vertices = [ -1, -1, 1, -1, 1, 1, -1, -1, -1, 1, 1, 1 ];
	NgChm.SUM.gl.bufferData(NgChm.SUM.gl.ARRAY_BUFFER, new Float32Array(vertices), NgChm.SUM.gl.STATIC_DRAW);
	var byte_per_vertex = Float32Array.BYTES_PER_ELEMENT;
	var component_per_vertex = 2;
	buffer.numItems = vertices.length / component_per_vertex;
	var stride = component_per_vertex * byte_per_vertex;
	var position = NgChm.SUM.gl.getAttribLocation(NgChm.SUM.texProgram, 'position');
	
	NgChm.SUM.gl.enableVertexAttribArray(position);
	NgChm.SUM.gl.vertexAttribPointer(position, 2, NgChm.SUM.gl.FLOAT, false, stride, 0);

	// Texture
	var texture = NgChm.SUM.gl.createTexture();
	NgChm.SUM.gl.bindTexture(NgChm.SUM.gl.TEXTURE_2D, texture);
	NgChm.SUM.gl.texParameteri(
			NgChm.SUM.gl.TEXTURE_2D, 
			NgChm.SUM.gl.TEXTURE_WRAP_S, 
			NgChm.SUM.gl.CLAMP_TO_EDGE);
	NgChm.SUM.gl.texParameteri(
			NgChm.SUM.gl.TEXTURE_2D, 
			NgChm.SUM.gl.TEXTURE_WRAP_T, 
			NgChm.SUM.gl.CLAMP_TO_EDGE);
	NgChm.SUM.gl.texParameteri(
			NgChm.SUM.gl.TEXTURE_2D, 
			NgChm.SUM.gl.TEXTURE_MIN_FILTER,
			NgChm.SUM.gl.NEAREST);
	NgChm.SUM.gl.texParameteri(
			NgChm.SUM.gl.TEXTURE_2D, 
			NgChm.SUM.gl.TEXTURE_MAG_FILTER, 
			NgChm.SUM.gl.NEAREST);
	
	NgChm.SUM.textureParams = {};
	var texWidth = null, texHeight = null, texData;
	texWidth = NgChm.SUM.totalWidth;
	texHeight = NgChm.SUM.totalHeight;
	texData = new ArrayBuffer(texWidth * texHeight * NgChm.SUM.BYTE_PER_RGBA);
	NgChm.SUM.texPixels = new Uint8Array(texData);
	NgChm.SUM.textureParams['width'] = texWidth;
	NgChm.SUM.textureParams['height'] = texHeight;
}

//=====================//
// 	CLASSBAR FUNCTIONS //
//=====================//

NgChm.SUM.getScaledHeight = function(height, axis) {
	var scaledHeight;
	if (axis === "row") {
		scaledHeight = Math.max(Math.round(height * NgChm.SUM.rowClassScale), 1 + NgChm.SUM.rowClassPadding);
    } else {
    	scaledHeight = Math.max(Math.round(height * NgChm.SUM.colClassScale), 1 + NgChm.SUM.colClassPadding);
    }   
    return scaledHeight;
}

// draws row classification bars into the texture array ("dataBuffer"). "names"/"colorSchemes" should be array of strings.
NgChm.SUM.drawColClassBars = function(dataBuffer) {
	if (document.getElementById("missingColClassBars"))document.getElementById("missingColClassBars").remove();
	var classBarsConfig = NgChm.heatMap.getColClassificationConfig(); 
	var classBarConfigOrder = NgChm.heatMap.getColClassificationOrder();
	var classBarsData = NgChm.heatMap.getColClassificationData(); 
	var colorMapMgr = NgChm.heatMap.getColorMapManager();
	var pos = NgChm.SUM.totalWidth * NgChm.SUM.matrixHeight * NgChm.SUM.BYTE_PER_RGBA;
	
	//We reverse the order of the classBars before drawing because we draw from bottom up
	for (var i = classBarConfigOrder.length -1; i >= 0; i--) {
		var key = classBarConfigOrder[i];
		var currentClassBar = classBarsConfig[key];
		if (currentClassBar.show === 'Y') {
			var height = NgChm.SUM.getScaledHeight(currentClassBar.height, "col"); 
			var colorMap = colorMapMgr.getColorMap("col",key); // assign the proper color scheme...
			var classBarValues = classBarsData[key].values;
			var classBarLength = classBarValues.length;
			if (typeof classBarsData[key].svalues != 'undefined') {
				classBarValues = classBarsData[key].svalues;
				classBarLength = classBarValues.length;
			}
			// Small Maps - Do not generate padding when less than 42 rows
			if (NgChm.heatMap.getNumRows(NgChm.MMGR.DETAIL_LEVEL) > 41) {
				pos += (NgChm.SUM.totalWidth)*NgChm.SUM.colClassPadding*NgChm.SUM.BYTE_PER_RGBA; // draw padding between class bars
			}
			var line = new Uint8Array(new ArrayBuffer(classBarLength * NgChm.SUM.BYTE_PER_RGBA)); // save a copy of the class bar
			var loc = 0;
			for (var k = 0; k < classBarLength; k++) { 
				var val = classBarValues[k];
				var color = colorMap.getClassificationColor(val);
				if (val == "null") {
					color = colorMap.getHexToRgba(colorMap.getMissingColor());
				}
				line[loc] = color['r'];
				line[loc + 1] = color['g'];
				line[loc + 2] = color['b'];
				line[loc + 3] = color['a'];
				loc += NgChm.SUM.BYTE_PER_RGBA;
			}
			loc = 0;
			for (var j = 0; j < height-NgChm.SUM.colClassPadding; j++){ // draw the class bar into the dataBuffer
				pos += NgChm.SUM.rowClassBarWidth*NgChm.SUM.BYTE_PER_RGBA;
				for (var k = 0; k < line.length; k++) { 
					dataBuffer[pos] = line[k];
					pos++;
				}
			}		
		} else {
			if (!document.getElementById("missingColClassBars")){
				var x = NgChm.SUM.canvas.offsetLeft + NgChm.SUM.canvas.offsetWidth + 2;
				var y = NgChm.SUM.canvas.offsetTop + NgChm.SUM.canvas.clientHeight/NgChm.SUM.totalHeight - 10;
				NgChm.DET.addLabelDiv(document.getElementById('sumlabelDiv'), "missingColClassBars", "ClassBar MarkLabel", "...", x, y, 10, "F", null,"Column")
			}		
		}
	}
}

NgChm.SUM.drawRowClassBars = function(dataBuffer) {
	var classBarsConfig = NgChm.heatMap.getRowClassificationConfig(); 
	var classBarConfigOrder = NgChm.heatMap.getRowClassificationOrder();
	var classBarsData = NgChm.heatMap.getRowClassificationData(); 
	var colorMapMgr = NgChm.heatMap.getColorMapManager();
	if (document.getElementById("missingRowClassBars"))document.getElementById("missingRowClassBars").remove();
	var offset = (NgChm.SUM.totalWidth)*NgChm.SUM.BYTE_PER_RGBA;
	// Small Maps - Don't offset if map is really small
	if (NgChm.heatMap.getNumRows(NgChm.MMGR.SUMMARY_LEVEL) < 40) {
		offset = 0;
	}

	for (var i = 0; i < classBarConfigOrder.length; i++) {
		var key = classBarConfigOrder[i];
		var pos = 0 + offset;
		var currentClassBar = classBarsConfig[key];
		var height = NgChm.SUM.getScaledHeight(currentClassBar.height, "row"); 
		if (currentClassBar.show === 'Y') {
			var colorMap = colorMapMgr.getColorMap("row",key); // assign the proper color scheme...
			var classBarValues = classBarsData[key].values;
			var classBarLength = classBarValues.length;
			if (typeof classBarsData[key].svalues != 'undefined') {
				classBarValues = classBarsData[key].svalues;
				classBarLength = classBarValues.length;
			}
			for (var j = classBarLength; j > 0; j--){
				var val = classBarValues[j-1];
				var color = colorMap.getClassificationColor(val);
				if (val == "null") {
					color = colorMap.getHexToRgba(colorMap.getMissingColor());
				}
				for (var k = 0; k < height-NgChm.SUM.rowClassPadding; k++){
					dataBuffer[pos] = color['r'];
					dataBuffer[pos + 1] = color['g'];
					dataBuffer[pos + 2] = color['b'];
					dataBuffer[pos + 3] = color['a'];
					pos+=NgChm.SUM.BYTE_PER_RGBA;	// 4 bytes per color
				}
				// padding between class bars
				pos+=NgChm.SUM.rowClassPadding*NgChm.SUM.BYTE_PER_RGBA;
				// go total width of the summary canvas and back up the width of a single class bar to return to starting point for next row 
				pos+=(NgChm.SUM.totalWidth - height)*NgChm.SUM.BYTE_PER_RGBA; 
			}
			//offset starting point of one bar to the next by the width of one bar multiplied by BPR (e.g. 15 becomes 60)
			offset+= height*NgChm.SUM.BYTE_PER_RGBA; 
		} else {
			if (!document.getElementById("missingRowClassBars")){
				var x = NgChm.SUM.canvas.clientWidth/NgChm.SUM.totalWidth + 10;
				var y = NgChm.SUM.canvas.clientHeight + 2;
				NgChm.DET.addLabelDiv(document.getElementById('sumlabelDiv'), "missingRowClassBars", "ClassBar MarkLabel", "...", x, y, 10, "T", null,"Row");
			}
		}
	}
}

NgChm.SUM.calculateSummaryTotalClassBarHeight = function(axis) {
	var totalHeight = 0;
	if (axis === "row") {
		var classBars = NgChm.heatMap.getRowClassificationConfig();
	} else {
		var classBars = NgChm.heatMap.getColClassificationConfig();
	}
	for (var key in classBars){
		if (classBars[key].show === 'Y') {
		   totalHeight += NgChm.SUM.getScaledHeight(parseInt(classBars[key].height), axis);
		}
	}
	// Small Maps - halve bar height if rows/cols less than 42
	if (axis === "row") {
		if (NgChm.heatMap.getNumColumns(NgChm.MMGR.DETAIL_LEVEL) < 42) {
			totalHeight = totalHeight/2;
		}
	} else {
		if (NgChm.heatMap.getNumRows(NgChm.MMGR.DETAIL_LEVEL) < 42) {
			totalHeight = totalHeight/2;
		}
	}
	

	return totalHeight;
}

//***************************//
//Selection Label Functions *//
//***************************//
NgChm.SUM.summaryResize = function() {
	if(!NgChm.SEL.isSub){
		NgChm.SUM.setSummarySize();
		NgChm.SUM.colDendro.resize();
		NgChm.SUM.colDendro.draw();
		NgChm.SUM.rowDendro.resize();
		NgChm.SUM.rowDendro.draw();
		NgChm.SUM.drawLeftCanvasBox();
		NgChm.SUM.clearSelectionMarks();
		NgChm.SUM.setSelectionDivSize();
		NgChm.SUM.drawRowSelectionMarks();
		NgChm.SUM.drawColSelectionMarks();
	}
}

NgChm.SUM.drawRowSelectionMarks = function() {
	var selectedRows = NgChm.DET.getSearchRows();
	var dataLayers = NgChm.heatMap.getDataLayers();
	var dataLayer = dataLayers[NgChm.SEL.currentDl];
	var rowSel = document.getElementById("summary_row_select_canvas");
	var rowCtx = rowSel.getContext('2d');
	rowCtx.fillStyle=dataLayer.selection_color;
	var height = Math.max(1,rowSel.height/300);
	for (var i = 0; i < selectedRows.length; i++) {
		rowCtx.fillRect(0,selectedRows[i]-1,rowSel.width,height);
	}
}

NgChm.SUM.drawColSelectionMarks = function() {
	var selectedCols = NgChm.DET.getSearchCols();
	var dataLayers = NgChm.heatMap.getDataLayers();
	var dataLayer = dataLayers[NgChm.SEL.currentDl];
	var colSel = document.getElementById("summary_col_select_canvas");
	var colCtx = colSel.getContext('2d');
	colCtx.fillStyle = dataLayer.selection_color;
	var width = Math.max(1,colSel.width/300);
	for (var i = 0; i < selectedCols.length; i++) {
		colCtx.fillRect(selectedCols[i]-1,0,width,colSel.height);
	}
}

NgChm.SUM.clearSelectionMarks = function() {
	var oldMarks = document.getElementsByClassName("MarkLabel");
	while (oldMarks.length > 0) {
		oldMarks[0].remove();
	}
	var colSel = document.getElementById("summary_col_select_canvas");
	var colCtx = colSel.getContext('2d');
	colCtx.clearRect(0,0,colSel.width,colSel.height);
	var rowSel = document.getElementById("summary_row_select_canvas");
	var rowCtx = rowSel.getContext('2d');
	rowCtx.clearRect(0,0,rowSel.width,rowSel.height);
}

NgChm.SUM.dividerStart = function() {
	NgChm.UHM.userHelpClose();
	document.addEventListener('mousemove', NgChm.SUM.dividerMove);
	document.addEventListener('touchmove', NgChm.SUM.dividerMove);
	document.addEventListener('mouseup', NgChm.SUM.dividerEnd);
	document.addEventListener('touchend',NgChm.SUM.dividerEnd);
}

NgChm.SUM.dividerMove = function(e) {
	var divider = document.getElementById('divider');
	if (e.touches){
    	if (e.touches.length > 1){
    		return false;
    	}
    }
	var Xmove = e.touches ? divider.offsetLeft - e.touches[0].pageX : divider.offsetLeft - e.pageX;
	var summary = document.getElementById('summary_chm');
	var summaryX = summary.offsetWidth - Xmove;
	summary.style.width=summaryX+'px';
	NgChm.SUM.setSummarySize();
	NgChm.SUM.colDendro.resize();
	NgChm.SUM.rowDendro.resize();
	if (summary.style.width == summary.style.maxWidth){
		return
	}
	var sumScale = summaryX/summary.clientWidth;
	var container = document.getElementById("container");
	var originalW = Math.max(Math.max(Math.round(NgChm.SUM.matrixWidth/250 * 48), 3))*container.clientWidth;
	var originalH = Math.max(Math.max(Math.round(NgChm.SUM.matrixHeight/250 * 48), 3))*container.clientHeight;
	var originalAR = originalW/originalH;
	var detail = document.getElementById('detail_chm');
	var detailX = detail.offsetWidth + Xmove;
	detail.style.width=detailX+'px';
	NgChm.DET.clearLabels();
	NgChm.SUM.clearSelectionMarks();
	NgChm.SUM.setSelectionDivSize();
}

NgChm.SUM.dividerEnd = function() {
	document.removeEventListener('mousemove', NgChm.SUM.dividerMove);
	document.removeEventListener('mouseup', NgChm.SUM.dividerEnd);
	document.removeEventListener('touchmove',NgChm.SUM.dividerMove);
	document.removeEventListener('touchend',NgChm.SUM.dividerEnd);
	// set summary and detail canvas sizes to percentages to avoid map getting pushed down on resize
	var container = document.getElementById('container');
	var summary = document.getElementById('summary_chm');
	var sumPercent = 100*summary.clientWidth / container.clientWidth;
	summary.style.width = sumPercent + "%";
	var detail = document.getElementById('detail_chm');
	var detPercent = 100 - sumPercent;
	detail.style.width = detPercent + "%";
	NgChm.SUM.summaryResize();
	NgChm.DET.detailResize();
	NgChm.DET.drawRowAndColLabels();
	NgChm.SUM.setSelectionDivSize();
	NgChm.SUM.drawRowSelectionMarks();
	NgChm.SUM.drawColSelectionMarks();
}

NgChm.SUM.setBrowserMinFontSize = function () {
	  var minSettingFound = 0;
	  var el = document.createElement('div');
	  document.body.appendChild(el);
	  el.innerHTML = "<div><p>a b c d e f g h i j k l m n o p q r s t u v w x y z</p></div>";
	  el.style.fontSize = '1px';
	  el.style.width = '64px';
	  var minimumHeight = el.offsetHeight;
	  var least = 0;
	  var most = 64;
	  var middle; 
	  for (var i = 0; i < 32; ++i) {
	    middle = (least + most)/2;
	    el.style.fontSize = middle + 'px';
	    if (el.offsetHeight === minimumHeight) {
	      least = middle;
	    } else {
	      most = middle;
	    }
	  }
	  if (middle > 5) {
		  minSettingFound = middle;
		  NgChm.DET.minLabelSize = Math.floor(middle) - 1;
	  }
	  document.body.removeChild(el);
	  return minSettingFound;
}
