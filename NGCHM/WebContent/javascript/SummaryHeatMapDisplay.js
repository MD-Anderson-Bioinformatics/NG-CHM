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
NgChm.SUM.colTopItems;
NgChm.SUM.rowTopItems;
NgChm.SUM.colTopItemsIndex;
NgChm.SUM.rowTopItemsIndex;
NgChm.SUM.colTopItemsWidth = 0;
NgChm.SUM.rowTopItemsHeight = 0;

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
NgChm.SUM.minDimensionSize = 100; // minimum size the data matrix canvas can be
NgChm.SUM.widthScale = 1; // scalar used to stretch small maps (less than 250) to be proper size
NgChm.SUM.heightScale = 1;

NgChm.SUM.maxValues = 2147483647;
NgChm.SUM.minValues = -2147483647;
NgChm.SUM.avgValue = 0;
NgChm.SUM.texProgram;
NgChm.SUM.eventTimer = 0; // Used to delay draw updates
NgChm.SUM.dragSelect=false;	  // Indicates if user has made a drag selection on the summary panel
NgChm.SUM.clickStartRow=null;   // End row of current selected position
NgChm.SUM.clickStartCol=null;   // Left column of the current selected position
NgChm.SUM.mouseEventActive = false;

//Main function that draws the summary heat map. chmFile is only used in file mode.
NgChm.SUM.initSummaryDisplay = function() {
	NgChm.CUST.addCustomJS();
    
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
		if (NgChm.MMGR.source !== NgChm.MMGR.LOCAL_SOURCE) {
			document.title = NgChm.heatMap.getMapInformation().name;
		}
		NgChm.SUM.summaryInit(false);  
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
NgChm.SUM.summaryInit = function(applying) {
	
	if (!NgChm.SUM.colDendro){
		NgChm.SUM.colDendro = new NgChm.DDR.SummaryColumnDendrogram();
	}
	if (!NgChm.SUM.rowDendro){
		NgChm.SUM.rowDendro = new NgChm.DDR.SummaryRowDendrogram ();
	}
	if (NgChm.heatMap.getColConfig().top_items){
		NgChm.SUM.colTopItems = NgChm.heatMap.getColConfig().top_items.sort();
	}
	if (NgChm.heatMap.getRowConfig().top_items){
		NgChm.SUM.rowTopItems = NgChm.heatMap.getRowConfig().top_items.sort();
	}
	
	NgChm.SUM.matrixWidth = NgChm.heatMap.getNumColumns(NgChm.MMGR.SUMMARY_LEVEL);
	NgChm.SUM.matrixHeight = NgChm.heatMap.getNumRows(NgChm.MMGR.SUMMARY_LEVEL);
	
	//Classificaton bars get stretched on small maps, scale down the bars and padding.
	NgChm.SUM.rowClassPadding = Math.ceil(NgChm.SUM.rowClassPadding * NgChm.SUM.rowClassScale);
	NgChm.SUM.colClassPadding = Math.ceil(NgChm.SUM.colClassPadding * NgChm.SUM.colClassScale);
	NgChm.SUM.rowClassBarWidth = NgChm.SUM.calculateSummaryTotalClassBarHeight("row");
	NgChm.SUM.colClassBarHeight = NgChm.SUM.calculateSummaryTotalClassBarHeight("column");

	if (NgChm.SUM.matrixWidth < NgChm.SUM.minDimensionSize){
		NgChm.SUM.widthScale = Math.max(2,Math.ceil(NgChm.SUM.minDimensionSize /NgChm.SUM.matrixWidth));
	}
	if (NgChm.SUM.matrixHeight < NgChm.SUM.minDimensionSize ){
		NgChm.SUM.heightScale = Math.max(2,Math.ceil(NgChm.SUM.minDimensionSize /NgChm.SUM.matrixHeight));
	}
	NgChm.SUM.calcTotalSize();
	//Resize summary area for small or skewed maps.
	NgChm.SUM.canvas.width =  NgChm.SUM.totalWidth;
	NgChm.SUM.canvas.height = NgChm.SUM.totalHeight;
	NgChm.SUM.initSummarySize(applying);
	NgChm.SUM.rowDendro.resize();
	NgChm.SUM.rowDendro.draw();
	NgChm.SUM.colDendro.resize();
	NgChm.SUM.colDendro.draw();
	var nameDiv = document.getElementById("mapName");
	var mapName = NgChm.heatMap.getMapInformation().name;
	if (mapName.length > 80){
		mapName = mapName.substring(0,80) + "...";
	}

	nameDiv.innerHTML = "<b>NG-CHM Heat Map:</b>&nbsp;&nbsp;"+mapName;
	NgChm.SUM.setupGl();
	NgChm.SUM.initGl();
	NgChm.SUM.buildSummaryTexture();
	NgChm.SUM.drawLeftCanvasBox();

	NgChm.SUM.setSelectionDivSize();
	NgChm.SUM.clearSelectionMarks();
	NgChm.SUM.drawRowSelectionMarks();
	NgChm.SUM.drawColSelectionMarks();
	NgChm.SUM.drawTopItems();
	//Labels only re-drawn in NGCHM_GUI_Builder and split screen mode
	if (document.getElementById('divider').style.display === 'none') {
	 	NgChm.SUM.drawColClassBarLabels(); 
		NgChm.SUM.drawRowClassBarLabels(); 
	}
 	//NgChm.SUM.drawColClassBarLegends(true); Temporarily removed legends from summary
	//NgChm.SUM.drawRowClassBarLegends(true); they may or may not come back later
}

// Sets summary and detail chm to the config height and width.
NgChm.SUM.initSummarySize = function(applying) {
	var summary = document.getElementById('summary_chm');
	var detail = document.getElementById('detail_chm');
	var sumPercent = Math.ceil(100*summary.clientWidth / container.clientWidth);
	//If we are reloading from a preferences apply, leave the divider where it is and do not set it to the saved width
	if (!applying) {
		sumPercent = NgChm.heatMap.getMapInformation().summary_width;
	}
	var detPercent = 100 - sumPercent;
	
	summary.style.width = sumPercent + "%";
	detail.style.width = detPercent + "%";
	summary.style.height = container.clientHeight*parseFloat(NgChm.heatMap.getMapInformation().summary_height)/100 + "px";
	detail.style.height = container.clientHeight*parseFloat(NgChm.heatMap.getMapInformation().detail_height)/100 + "px";
	
	NgChm.SUM.setTopItemsSize();
	NgChm.SUM.setSummarySize();
}

// Sets summary and detail chm to newly adjusted size.
NgChm.SUM.setSummarySize = function() {
	var msgButton = document.getElementById('messageOpen_btn');
	var left = NgChm.SUM.rowDendro.getDivWidth()*NgChm.SUM.widthPct + NgChm.SUM.paddingHeight;
	var top = NgChm.SUM.colDendro.getDivHeight() + NgChm.SUM.paddingHeight;
	var width = document.getElementById("summary_chm").clientWidth - NgChm.SUM.rowDendro.getDivWidth() - NgChm.SUM.rowTopItemsHeight;
	var height = document.getElementById("container").clientHeight*NgChm.SUM.heightPct - NgChm.SUM.colDendro.getDivHeight() - NgChm.SUM.colTopItemsWidth;

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

NgChm.SUM.setTopItemsSize = function (){
	var sumChm = document.getElementById("summary_chm");
	var colLabels = NgChm.heatMap.getColLabels()["labels"];
	var rowLabels = NgChm.heatMap.getRowLabels()["labels"];
	var colTopItemsIndex = [];
	NgChm.SUM.colTopItemsIndex = colTopItemsIndex;
	var rowTopItemsIndex = [];
	NgChm.SUM.rowTopItemsIndex = rowTopItemsIndex;
	if (NgChm.SUM.colTopItems){
		NgChm.SUM.colTopItemsWidth = 0;
		for (i = 0; i < NgChm.SUM.colTopItems.length; i++){
			var foundLabel = false;
			var p = document.createElement("p");
			p.innerHTML = NgChm.UTIL.getLabelText(NgChm.SUM.colTopItems[i].split("|")[0],"col");
			p.className = "topItems";
			sumChm.appendChild(p);
			for (var j = 0; j < colLabels.length; j++){
				if (NgChm.SUM.colTopItems[i] == colLabels[j].split("|")[0] && colTopItemsIndex.length < 10){ // limit 10 items per axis
					foundLabel = true;
					colTopItemsIndex.push(j);
				} else if (colTopItemsIndex.length >= 10){
					break;
				}
			}
			if (foundLabel && p.clientWidth > NgChm.SUM.colTopItemsWidth){
				NgChm.SUM.colTopItemsWidth = p.clientWidth+10; // + 5 to add a margin in case of overlap
			}
			sumChm.removeChild(p);
		}
	}
	if (NgChm.SUM.rowTopItems){
		NgChm.SUM.rowTopItemsHeight = 0;
		for (i = 0; i < NgChm.SUM.rowTopItems.length; i++){
			var foundLabel = false;
			var p = document.createElement("p");
			p.innerHTML = NgChm.UTIL.getLabelText(NgChm.SUM.rowTopItems[i].split("|")[0],"row");
			p.className = "topItems";
			sumChm.appendChild(p);
			for (var j = 0; j < rowLabels.length; j++){
				if (NgChm.SUM.rowTopItems[i] == rowLabels[j].split("|")[0] && rowTopItemsIndex.length < 10){ // limit 10 items per axis
					foundLabel = true;
					rowTopItemsIndex.push(j);
				} else if (rowTopItemsIndex.length >= 10){
					break;
				}
			}
			if (foundLabel && p.clientWidth > NgChm.SUM.rowTopItemsHeight){
				NgChm.SUM.rowTopItemsHeight = p.clientWidth+10; // + 5 to add a margin in case of overlap
			}
			sumChm.removeChild(p);
		}
	}
}

//Set the variables for the total size of the summary heat map - used to set canvas, WebGL texture, and viewport size.
NgChm.SUM.calcTotalSize = function() {
	NgChm.SUM.totalHeight = NgChm.SUM.matrixHeight*NgChm.SUM.heightScale + NgChm.SUM.colClassBarHeight;
	NgChm.SUM.totalWidth = NgChm.SUM.matrixWidth*NgChm.SUM.widthScale + NgChm.SUM.rowClassBarWidth;
}

NgChm.SUM.setSelectionDivSize = function(width, height){ // input params used for PDF Generator to resize canvas based on PDF sizes
	var colSel = document.getElementById("summary_col_select_canvas");
	var rowSel = document.getElementById("summary_row_select_canvas");
	var colTI = document.getElementById("summary_col_top_items_canvas");
	var rowTI = document.getElementById("summary_row_top_items_canvas");
	colSel.style.left = parseFloat(NgChm.SUM.canvas.style.left) + NgChm.SUM.canvas.clientWidth * ((NgChm.SUM.calculateSummaryTotalClassBarHeight("row"))/NgChm.SUM.canvas.width);;
	colSel.style.top = NgChm.SUM.colDendro.getDivHeight() + NgChm.SUM.canvas.clientHeight; 
	colSel.style.width = NgChm.SUM.canvas.clientWidth * ((NgChm.SUM.canvas.width-NgChm.SUM.calculateSummaryTotalClassBarHeight("row"))/NgChm.SUM.canvas.width);
	colSel.style.height = 10;
	colSel.width = NgChm.heatMap.getNumColumns("d");
	colSel.height = 10;
	colTI.style.left = parseFloat(NgChm.SUM.canvas.style.left) + NgChm.SUM.canvas.clientWidth * ((NgChm.SUM.calculateSummaryTotalClassBarHeight("row"))/NgChm.SUM.canvas.width);;
	colTI.style.top = NgChm.SUM.colDendro.getDivHeight() + NgChm.SUM.canvas.clientHeight; 
//	colTI.style.width = width? width*NgChm.SUM.matrixWidth/NgChm.SUM.canvas.width : NgChm.SUM.canvas.clientWidth * ((NgChm.SUM.canvas.width-NgChm.SUM.calculateSummaryTotalClassBarHeight("row"))/NgChm.SUM.canvas.width);
	colTI.style.width = width? width : NgChm.SUM.canvas.clientWidth * ((NgChm.SUM.canvas.width-NgChm.SUM.calculateSummaryTotalClassBarHeight("row"))/NgChm.SUM.canvas.width);
	colTI.style.height = 10;
//	colTI.width = width ? width*NgChm.SUM.matrixWidth/NgChm.SUM.canvas.width : Math.round(NgChm.SUM.canvas.clientWidth * ((NgChm.SUM.canvas.width-NgChm.SUM.calculateSummaryTotalClassBarHeight("row"))/NgChm.SUM.canvas.width));
	colTI.width = width ? width : Math.round(NgChm.SUM.canvas.clientWidth * ((NgChm.SUM.canvas.width-NgChm.SUM.calculateSummaryTotalClassBarHeight("row"))/NgChm.SUM.canvas.width));
	colTI.height = 10;
	
	rowSel.style.left = NgChm.SUM.canvas.offsetLeft+NgChm.SUM.canvas.offsetWidth;
	rowSel.style.top = NgChm.SUM.colDendro.getDivHeight() + NgChm.SUM.canvas.clientHeight*(NgChm.SUM.calculateSummaryTotalClassBarHeight("col")/NgChm.SUM.canvas.height);
	rowSel.style.width = 10;
	rowSel.style.height = NgChm.SUM.canvas.clientHeight*((NgChm.SUM.canvas.height-NgChm.SUM.calculateSummaryTotalClassBarHeight("col"))/NgChm.SUM.canvas.height);
	rowSel.width = 10;
	rowSel.height = NgChm.heatMap.getNumRows("d");
	rowTI.style.left = NgChm.SUM.canvas.offsetLeft+NgChm.SUM.canvas.offsetWidth;
	rowTI.style.top = NgChm.SUM.colDendro.getDivHeight() + NgChm.SUM.canvas.clientHeight*(NgChm.SUM.calculateSummaryTotalClassBarHeight("col")/NgChm.SUM.canvas.height);
	rowTI.style.width = 10;
	rowTI.style.height = height ? height*NgChm.SUM.heightScale*NgChm.SUM.matrixHeight/NgChm.SUM.canvas.height : NgChm.SUM.canvas.clientHeight*((NgChm.SUM.canvas.height-NgChm.SUM.calculateSummaryTotalClassBarHeight("col"))/NgChm.SUM.canvas.height);
	rowTI.width = 10;
	rowTI.height = height ? height*NgChm.SUM.heightScale*NgChm.SUM.matrixHeight/NgChm.SUM.canvas.height :Math.round(NgChm.SUM.canvas.clientHeight*((NgChm.SUM.canvas.height-NgChm.SUM.calculateSummaryTotalClassBarHeight("col"))/NgChm.SUM.canvas.height));
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
		var line = new Array(NgChm.heatMap.getNumColumns(NgChm.MMGR.SUMMARY_LEVEL)*NgChm.SUM.widthScale*NgChm.SUM.BYTE_PER_RGBA);
		var linepos = 0;
		for (var j = 1; j <= NgChm.heatMap.getNumColumns(NgChm.MMGR.SUMMARY_LEVEL); j++) { // draw the heatmap
			var val = NgChm.heatMap.getValue(NgChm.MMGR.SUMMARY_LEVEL, i, j);
			if ((val < NgChm.SUM.maxValues) && (val > NgChm.SUM.minValues)) {
				NgChm.SUM.avgValue += val;
			}
			var color = colorMap.getColor(val);
			for (var k = 0; k < NgChm.SUM.widthScale; k++){
				line[linepos] = color['r'];
				line[linepos + 1] = color['g'];
				line[linepos + 2] = color['b'];
				line[linepos + 3] = color['a'];
				linepos+= NgChm.SUM.BYTE_PER_RGBA;
			}
		}
		for (var j = 0; j < NgChm.SUM.heightScale*NgChm.SUM.widthScale; j++) { // why is this heightScale * widthScale? why can't it just be heightScale??
			pos += (NgChm.SUM.rowClassBarWidth)*NgChm.SUM.BYTE_PER_RGBA;
			for (var k = 0; k < line.length; k++){
				NgChm.SUM.texPixels[pos] = line[k];
				pos++;
			}
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
	if (NgChm.SUM.dragSelect) {
		NgChm.SUM.onMouseUpCanvas(evt);
	}	
	NgChm.SUM.mouseEventActive = false;
	NgChm.SUM.canvas.style.cursor="default";
	//Gotta redraw everything because of event cascade occurring when mousing out of the layers that contain the canvas 
	// (container and summary_chm) we set the right position mousing up on the canvas above, but move events are still coming in.
	NgChm.SEL.updateSelection();
}

NgChm.SUM.onMouseMoveCanvas = function(evt) {
	if (NgChm.SUM.mouseEventActive) {
		//if ((NgChm.SEL.mode === 'NORMAL') && (evt.which==1)) {
		if (evt.which==1) {
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
		//When doing a shift drag, this block will actually do the selection on mouse up.
		if (NgChm.SUM.dragSelect) {
			var totalRows = NgChm.heatMap.getNumRows(NgChm.MMGR.SUMMARY_LEVEL);
			var totalCols = NgChm.heatMap.getNumColumns(NgChm.MMGR.SUMMARY_LEVEL);
			var sumOffsetX = evt.touches ? evt.touches[0].offsetX : evt.offsetX;
			var sumOffsetY = evt.touches ? evt.touches[0].offsetY : evt.offsetY;
			var xPos = NgChm.SUM.getCanvasX(sumOffsetX);
			var yPos = NgChm.SUM.getCanvasY(sumOffsetY);
			var sumRow = NgChm.SUM.canvasToMatrixRow(yPos);
			var sumCol = NgChm.SUM.canvasToMatrixCol(xPos);
			if (sumRow > totalRows) {sumRow = totalRows;}
			if (sumCol > totalCols) {sumCol = totalCols;}
			var clickEndRow = Math.max(sumRow*NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL),1);
			var clickEndCol = Math.max(sumCol*NgChm.heatMap.getColSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL),0);
			var startRow = Math.max(Math.min(NgChm.SUM.clickStartRow,clickEndRow),1);
			var startCol = Math.max(Math.min(NgChm.SUM.clickStartCol,clickEndCol)+1,1);
			var endRow = Math.max(NgChm.SUM.clickStartRow,clickEndRow);
			var endCol = Math.max(NgChm.SUM.clickStartCol,clickEndCol);
			NgChm.SUM.setSubRibbonView(startRow, endRow, startCol, endCol);
		} else {
			var sumOffsetX = evt.touches ? evt.layerX : evt.offsetX;
			var sumOffsetY = evt.touches ? evt.layerY : evt.offsetY;
			var rowClassXLimit = NgChm.SUM.rowClassBarWidth/NgChm.SUM.canvas.width*NgChm.SUM.canvas.clientWidth;
			var colClassYLimit = NgChm.SUM.colClassBarHeight/NgChm.SUM.canvas.height*NgChm.SUM.canvas.clientHeight;
			if (sumOffsetX < rowClassXLimit || sumOffsetY < colClassYLimit){ // top left deadspace corner clicked
				return;
			}
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

//This is a helper function that can set a sub-ribbon view that best matches a user
//selected region of the map.
NgChm.SUM.setSubRibbonView  = function(startRow, endRow, startCol, endCol) {
	//In case there was a previous dendo selection - clear it.
	NgChm.SUM.colDendro.clearSelection();
	NgChm.SUM.rowDendro.clearSelection();
	NgChm.SUM.colDendro.draw();
	NgChm.SUM.rowDendro.draw();

	//If tiny tiny box was selected, discard and go back to previous selection size
	if (endRow-startRow<1 && endCol-startCol<1) {
		NgChm.DET.setDetailDataSize (NgChm.DET.dataBoxWidth);
	//If there are more rows than columns do a horizontal sub-ribbon view that fits the selection. 	
	} else if (NgChm.heatMap.getNumRows("d") >= NgChm.heatMap.getNumColumns("d")) {
		var boxSize = NgChm.DET.getNearestBoxHeight(endRow - startRow + 1);
		NgChm.DET.setDetailDataHeight(boxSize); 
		NgChm.SEL.selectedStart= startCol;
		NgChm.SEL.selectedStop=endCol;
		NgChm.SEL.currentRow = startRow;
		NgChm.SEL.changeMode('RIBBONH');
	} else {
		//More columns than rows, do a vertical sub-ribbon view that fits the selection. 	
		var boxSize = NgChm.DET.getNearestBoxSize(endCol - startCol + 1);
		NgChm.DET.setDetailDataWidth(boxSize); 
		NgChm.SEL.selectedStart=startRow;
		NgChm.SEL.selectedStop=endRow;
		NgChm.SEL.currentCol = startCol; 
		NgChm.SEL.changeMode('RIBBONV');
	}
	NgChm.SEL.updateSelection();
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
	var sumRow = NgChm.SUM.canvasToMatrixRow(yPos) - Math.round(NgChm.SEL.getCurrentSumDataPerCol()/2);
	var sumCol = NgChm.SUM.canvasToMatrixCol(xPos) - Math.round(NgChm.SEL.getCurrentSumDataPerRow()/2);
	NgChm.SEL.setCurrentRowFromSum(sumRow);
	NgChm.SEL.setCurrentColFromSum(sumCol); 
	NgChm.SEL.updateSelection();
}

//This function now is just in charge of drawing the green box in the summary side as
//a shift drag is happening.  When mouse up occurs, the actual selection will be done.
NgChm.SUM.dragSelection = function(evt) {
	var totalRows = NgChm.heatMap.getNumRows(NgChm.MMGR.SUMMARY_LEVEL);
	var totalCols = NgChm.heatMap.getNumColumns(NgChm.MMGR.SUMMARY_LEVEL);
	var sumOffsetX = evt.touches ? evt.touches[0].offsetX : evt.offsetX;
	var sumOffsetY = evt.touches ? evt.touches[0].offsetY : evt.offsetY;
	var xPos = NgChm.SUM.getCanvasX(sumOffsetX);
	var yPos = NgChm.SUM.getCanvasY(sumOffsetY);
	var sumRow = NgChm.SUM.canvasToMatrixRow(yPos);
	var sumCol = NgChm.SUM.canvasToMatrixCol(xPos);
	if (sumRow > totalRows) {sumRow = totalRows;}
	if (sumCol > totalCols) {sumCol = totalCols;}
	var clickEndRow = Math.max(sumRow*NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL),1);
	var clickEndCol = Math.max(sumCol*NgChm.heatMap.getColSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL),0);
	var startRow = Math.min(NgChm.SUM.clickStartRow,clickEndRow);
	var startCol = Math.min(NgChm.SUM.clickStartCol,clickEndCol)+1;
	if (startRow < 0 || startCol < 0){
		return;
	}
	var endRow = Math.max(NgChm.SUM.clickStartRow,clickEndRow);
	var endCol = Math.max(NgChm.SUM.clickStartCol,clickEndCol)+1;
	NgChm.SUM.dragSelect = true;
	NgChm.SEL.dataPerRow = endCol - startCol;
	NgChm.SEL.dataPerCol = endRow - startRow;
	NgChm.SEL.currentRow = startRow;
	NgChm.SEL.currentCol = startCol;
	NgChm.SUM.drawLeftCanvasBox();
}

//Browsers resizes the canvas.  This function translates from a click position
//back to the original (non-scaled) canvas position. 
NgChm.SUM.getCanvasX = function(offsetX) {
	return (((offsetX/NgChm.SUM.canvas.clientWidth) * NgChm.SUM.canvas.width));
}

NgChm.SUM.getCanvasY = function(offsetY) {
	return (((offsetY/NgChm.SUM.canvas.clientHeight) * NgChm.SUM.canvas.height));
}

//Return the summary row given an y position on the canvas
NgChm.SUM.canvasToMatrixRow = function(y) {
	return Math.round((y - NgChm.SUM.colClassBarHeight)/NgChm.SUM.heightScale);
} 

NgChm.SUM.canvasToMatrixCol = function(x) {
	return Math.round((x - NgChm.SUM.rowClassBarWidth)/NgChm.SUM.widthScale);
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
	var boxX = (NgChm.SUM.rowClassBarWidth / NgChm.SUM.canvas.width) * NgChm.SUM.boxCanvas.width;// + 2*NgChm.SUM.widthScale;
	var boxY = (NgChm.SUM.colClassBarHeight / NgChm.SUM.canvas.height) * NgChm.SUM.boxCanvas.height;
	var boxW = NgChm.SUM.boxCanvas.width-boxX;
	var boxH = NgChm.SUM.boxCanvas.height-boxY;
	ctx.lineWidth=1;
	ctx.strokeStyle="#000000";
	if (NgChm.heatMap.getMapInformation().map_cut_rows+NgChm.heatMap.getMapInformation().map_cut_cols == 0){
		ctx.strokeRect(boxX,boxY,boxW,boxH);
	}
	
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
		var adjustedStart = NgChm.SEL.selectedStart*NgChm.SUM.widthScale / summaryRatio;
		var adjustedStop = NgChm.SEL.selectedStop*NgChm.SUM.widthScale / summaryRatio;
		boxX = (((NgChm.SUM.rowClassBarWidth - 1*NgChm.SUM.widthScale) / NgChm.SUM.canvas.width) * NgChm.SUM.boxCanvas.width) + 1;
		boxY = ((NgChm.SUM.colClassBarHeight)/NgChm.SUM.canvas.height * NgChm.SUM.boxCanvas.height);
		boxW = (((adjustedStart) / NgChm.SUM.canvas.width) * NgChm.SUM.boxCanvas.width)-1;
		boxH = NgChm.SUM.boxCanvas.height-boxY;
		ctx.fillRect(boxX,boxY,boxW,boxH); 
		boxX = (((NgChm.SUM.rowClassBarWidth+adjustedStop) / NgChm.SUM.canvas.width) * NgChm.SUM.boxCanvas.width);
		boxW = (((NgChm.SUM.canvas.width-adjustedStop)+1*NgChm.SUM.widthScale) / NgChm.SUM.canvas.width) * NgChm.SUM.boxCanvas.width;
		ctx.fillRect(boxX,boxY,boxW,boxH); 
	} else if (NgChm.SEL.mode.startsWith('RIBBONV')  && NgChm.SEL.selectedStart > 0) {
		var summaryRatio = NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL);
		var adjustedStart = NgChm.SEL.selectedStart*NgChm.SUM.heightScale / summaryRatio;
		var adjustedStop = NgChm.SEL.selectedStop*NgChm.SUM.heightScale / summaryRatio;
		boxX = ((NgChm.SUM.rowClassBarWidth / NgChm.SUM.canvas.width) * NgChm.SUM.boxCanvas.width);
		boxY = ((NgChm.SUM.colClassBarHeight - 1*NgChm.SUM.heightScale)/NgChm.SUM.canvas.height * NgChm.SUM.boxCanvas.height);
		var boxW = NgChm.SUM.boxCanvas.width-boxX;
		var boxH = ((adjustedStart) / NgChm.SUM.canvas.height) * NgChm.SUM.boxCanvas.height;
		ctx.fillRect(boxX,boxY,boxW,boxH); 
		var boxY = ((NgChm.SUM.colClassBarHeight+adjustedStop)/NgChm.SUM.canvas.height * NgChm.SUM.boxCanvas.height);
		var boxH = (((NgChm.SUM.canvas.height-adjustedStop)+1*NgChm.SUM.heightScale) / NgChm.SUM.canvas.height) * NgChm.SUM.boxCanvas.height;
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
	boxX = (((NgChm.SEL.getCurrentSumCol()*NgChm.SUM.widthScale + NgChm.SUM.rowClassBarWidth - 1*NgChm.SUM.widthScale) / NgChm.SUM.canvas.width) * NgChm.SUM.boxCanvas.width) + 1;
	boxY = (((NgChm.SEL.getCurrentSumRow()*NgChm.SUM.heightScale + NgChm.SUM.colClassBarHeight - 1*NgChm.SUM.heightScale) / NgChm.SUM.canvas.height) * NgChm.SUM.boxCanvas.height);
//	if (NgChm.heatMap.getMapInformation().map_cut_rows+NgChm.heatMap.getMapInformation().map_cut_cols > 0){
//		boxX -= 1;
//		boxY -= 1;
//	}
	boxW = (NgChm.SEL.getCurrentSumDataPerRow()*NgChm.SUM.widthScale / NgChm.SUM.canvas.width) * NgChm.SUM.boxCanvas.width - 2;
	boxH = (NgChm.SEL.getCurrentSumDataPerCol()*NgChm.SUM.heightScale / NgChm.SUM.canvas.height) * NgChm.SUM.boxCanvas.height - 2;
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

	NgChm.SUM.gl.viewportWidth = NgChm.SUM.totalWidth*NgChm.SUM.widthScale;
	NgChm.SUM.gl.viewportHeight = NgChm.SUM.totalHeight*NgChm.SUM.heightScale;
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
	texWidth = NgChm.SUM.totalWidth*NgChm.SUM.widthScale;
	texHeight = NgChm.SUM.totalHeight*NgChm.SUM.heightScale;
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

//draws row classification bars into the texture array ("dataBuffer"). "names"/"colorSchemes" should be array of strings.
NgChm.SUM.drawColClassBars = function(dataBuffer) {
	if (document.getElementById("missingSumColClassBars"))document.getElementById("missingSumColClassBars").remove();
	var classBarsConfig = NgChm.heatMap.getColClassificationConfig(); 
	var classBarConfigOrder = NgChm.heatMap.getColClassificationOrder();
	var classBarsData = NgChm.heatMap.getColClassificationData(); 
	var colorMapMgr = NgChm.heatMap.getColorMapManager();
	var pos = NgChm.SUM.totalWidth * NgChm.SUM.matrixHeight * NgChm.SUM.BYTE_PER_RGBA * NgChm.SUM.heightScale*NgChm.SUM.widthScale;
	
	//We reverse the order of the classBars before drawing because we draw from bottom up
	for (var i = classBarConfigOrder.length -1; i >= 0; i--) {
		var key = classBarConfigOrder[i];
		var currentClassBar = classBarsConfig[key];
		if (currentClassBar.show === 'Y') {
			var height = NgChm.SUM.getScaledHeight(currentClassBar.height, "col"); 
			var colorMap = colorMapMgr.getColorMap("col",key); // assign the proper color scheme...
			var classType = colorMap.getType();       
			var classBarValues = classBarsData[key].values;
			var classBarLength = classBarValues.length;
			if (typeof classBarsData[key].svalues != 'undefined') {
				classBarValues = classBarsData[key].svalues;
				classBarLength = classBarValues.length;
			}
			pos += (NgChm.SUM.totalWidth)*NgChm.SUM.colClassPadding*NgChm.SUM.BYTE_PER_RGBA*NgChm.SUM.widthScale; // draw padding between class bars  ***not 100% sure why the widthscale is used as a factor here, but it works...
			if (currentClassBar.bar_type === 'color_plot') {
				pos = NgChm.SUM.drawColorPlotColClassBar(dataBuffer, pos, height, classBarValues, classBarLength, colorMap);
			} else {
				pos = NgChm.SUM.drawScatterBarPlotColClassBar(dataBuffer, pos, height-NgChm.SUM.colClassPadding, classBarValues, classBarLength, colorMap, currentClassBar);
			}
		} else {
			if (!document.getElementById("missingSumColClassBars")){
				var x = NgChm.SUM.canvas.offsetLeft + NgChm.SUM.canvas.offsetWidth + 2;
				var y = NgChm.SUM.canvas.offsetTop + NgChm.SUM.canvas.clientHeight/NgChm.SUM.totalHeight - 10;
				NgChm.DET.addLabelDiv(document.getElementById('sumlabelDiv'), "missingSumColClassBars", "ClassBar MarkLabel", "...", "...", x, y, 10, "F", null,"Column");
			}		
		}
	}
} 

NgChm.SUM.drawColorPlotColClassBar = function(dataBuffer, pos, height, classBarValues, classBarLength, colorMap) {
	var line = new Uint8Array(new ArrayBuffer(classBarLength * NgChm.SUM.BYTE_PER_RGBA * NgChm.SUM.widthScale)); // save a copy of the class bar
	var loc = 0;
	for (var k = 0; k < classBarLength; k++) { 
		var val = classBarValues[k];
		var color = colorMap.getClassificationColor(val);
		if (val == "null") {
			color = colorMap.getHexToRgba(colorMap.getMissingColor());
		}
		for (var i = 0; i < NgChm.SUM.widthScale; i++){
			line[loc] = color['r'];
			line[loc + 1] = color['g'];
			line[loc + 2] = color['b'];
			line[loc + 3] = color['a'];
			loc += NgChm.SUM.BYTE_PER_RGBA;
		}
	}
	for (var j = 0; j < (height-NgChm.SUM.colClassPadding)*NgChm.SUM.widthScale; j++){ // draw the class bar into the dataBuffer  ***not 100% sure why the widthscale is used as a factor here, but it works...
		pos += NgChm.SUM.rowClassBarWidth*NgChm.SUM.BYTE_PER_RGBA;
		for (var k = 0; k < line.length; k++) { 
			dataBuffer[pos] = line[k];
			pos++;
		}
	}
	return pos;
}

NgChm.SUM.drawScatterBarPlotColClassBar = function(dataBuffer, pos, height, classBarValues, classBarLength, colorMap, currentClassBar) {
	var barFgColor = colorMap.getHexToRgba(currentClassBar.fg_color);
	var barBgColor = colorMap.getHexToRgba(currentClassBar.bg_color);
	var barCutColor = colorMap.getHexToRgba("#FFFFFF");
	var matrix = NgChm.SUM.buildScatterBarPlotMatrix(height*NgChm.SUM.widthScale, classBarValues, 0, classBarLength, currentClassBar, NgChm.heatMap.getTotalCols(), true);
	//offset value for width of row class bars
	var offset = NgChm.SUM.rowClassBarWidth*NgChm.SUM.BYTE_PER_RGBA;
	
	for (var h = 0; h < matrix.length; h++) { 
		pos += offset;
		var row = matrix[h];
		for (var k = 0; k < row.length; k++) { 
			var posVal = row[k];
				for(var i=0;i<NgChm.SUM.widthScale;i++){
					if (posVal == 1) {
						dataBuffer[pos] = barFgColor['r'];
						dataBuffer[pos+1] = barFgColor['g'];
						dataBuffer[pos+2] = barFgColor['b'];
						dataBuffer[pos+3] = barFgColor['a'];
					} else if (posVal == 2) {
						dataBuffer[pos] = barCutColor['r'];
						dataBuffer[pos+1] = barCutColor['g'];
						dataBuffer[pos+2] = barCutColor['b'];
						dataBuffer[pos+3] = barCutColor['a'];
					} else {
						if (currentClassBar.subBgColor !== "#FFFFFF") {
							dataBuffer[pos] = barBgColor['r'];
							dataBuffer[pos+1] = barBgColor['g'];
							dataBuffer[pos+2] = barBgColor['b'];
							dataBuffer[pos+3] = barBgColor['a'];
						}
					}
					pos+=NgChm.SUM.BYTE_PER_RGBA;
				}
		}
	}
	return pos;
}

NgChm.SUM.drawColClassBarLegend = function(key,currentClassBar,prevHeight,totalHeight, fewClasses) {
	//calculate where covariate bars end and heatmap begins by using the top items canvas (which is lined up with the heatmap)
	var rowCanvas = document.getElementById("summary_row_top_items_canvas");
	var classHgt = NgChm.SUM.canvas.offsetHeight - rowCanvas.offsetHeight;
	//calculate where the previous bar ends and the current one begins.
	var prevEndPct = prevHeight/totalHeight;
	var currEndPct = (prevHeight+parseInt(currentClassBar.height))/totalHeight;
	//calculate where covariate bars begin and end and use that to calculate the total covariate bars height
	var beginClasses = NgChm.SUM.canvas.offsetTop-6;
	var endClasses = beginClasses+classHgt-2;
	var classHeight = endClasses-beginClasses;
	//get your horizontal start position (to the right of bars)
	var leftPos = NgChm.SUM.canvas.offsetLeft + NgChm.SUM.canvas.offsetWidth;
	var midPos =  topPos+((endPos-topPos)/2);
	//Get your 3 values for the legend.
	var midVal = key;
	//Create div and place mid legend value
	NgChm.SUM.setLabelDivElement(key+"Label","- "+midVal,midPos,leftPos,false);
}

NgChm.SUM.drawRowClassBarLabels = function () {
	var classBarsConfig = NgChm.heatMap.getRowClassificationConfig(); 
	var classBarConfigOrder = NgChm.heatMap.getRowClassificationOrder();
	var classBarsData = NgChm.heatMap.getRowClassificationData(); 
	var totalHeight = 0;
	for (var i = 0; i < classBarConfigOrder.length; i++) {
		var key = classBarConfigOrder[i];
		var currentClassBar = classBarsConfig[key];
		if (currentClassBar.show === 'Y') {
			totalHeight += parseInt(currentClassBar.height);
		}
	}
	var prevHeight = 0;
	for (var i = 0; i < classBarConfigOrder.length; i++) {
		var key = classBarConfigOrder[i];
		var currentClassBar = classBarsConfig[key];
		if (currentClassBar.show === 'Y') {
			NgChm.SUM.drawRowClassBarLabel(key,currentClassBar,prevHeight,totalHeight,i);
			prevHeight += parseInt(currentClassBar.height);
		}
	}
}

NgChm.SUM.drawRowClassBarLabel = function(key,currentClassBar,prevHeight,totalHeight,i) {
	var colCanvas = document.getElementById("summary_col_top_items_canvas");
	var classHgt = colCanvas.offsetLeft - NgChm.SUM.canvas.offsetLeft;
	var prevEndPct = prevHeight/totalHeight;
	var currEndPct = (prevHeight+parseInt(currentClassBar.height))/totalHeight;
	var beginClasses = NgChm.SUM.canvas.offsetLeft - 6;
	var endClasses = beginClasses+classHgt-2;
	var classesHeight = endClasses-beginClasses;
	var beginPos =  beginClasses+(classesHeight*prevEndPct)+(NgChm.SUM.rowClassPadding*(i+1));
	var endPos =  beginClasses+(classesHeight*currEndPct)-NgChm.SUM.rowClassPadding;
	var midPos =  beginPos+((endPos-beginPos)/2)-5;
	var rowCanvas = document.getElementById("summary_row_top_items_canvas");
	var midVal = key.length > 13 ? key.substr(0,10)+"..." : key;
	var addlOffset = 10;
	if (midVal.length > 7) {
		addlOffset = 25;
	}
	var topPos = rowCanvas.offsetTop+rowCanvas.offsetHeight+addlOffset;
	var midVal = key.length > 9 ? key.substr(0,6)+"..." : key;
	//Create div and place middle legend value
	NgChm.SUM.setLabelDivElement(key+"Label",midVal,topPos,midPos,true,true);
}

NgChm.SUM.drawColClassBarLabels = function () {
	var classBarsConfig = NgChm.heatMap.getColClassificationConfig(); 
	var classBarConfigOrder = NgChm.heatMap.getColClassificationOrder();
	var classBarsData = NgChm.heatMap.getColClassificationData(); 
	var totalHeight = 0;
	for (var i = 0; i < classBarConfigOrder.length; i++) {
		var key = classBarConfigOrder[i];
		var currentClassBar = classBarsConfig[key];
		if (currentClassBar.show === 'Y') {
			totalHeight += parseInt(currentClassBar.height);
		}
	}
	var prevHeight = 0;
	var fewClasses = classBarConfigOrder.length < 7 ? 2 : 0;
	for (var i = 0; i < classBarConfigOrder.length; i++) {
		var key = classBarConfigOrder[i];
		var currentClassBar = classBarsConfig[key];
		if (currentClassBar.show === 'Y') {
			NgChm.SUM.drawColClassBarLabel(key, currentClassBar,prevHeight,totalHeight, fewClasses);
			prevHeight += parseInt(currentClassBar.height);
		}
	}
}

NgChm.SUM.drawColClassBarLabel = function(key,currentClassBar,prevHeight,totalHeight, fewClasses) {
	//calculate where covariate bars end and heatmap begins by using the top items canvas (which is lined up with the heatmap)
	var rowCanvas = document.getElementById("summary_row_top_items_canvas");
	var classHgt = NgChm.SUM.canvas.offsetHeight - rowCanvas.offsetHeight;
	//calculate where the previous bar ends and the current one begins.
	var prevEndPct = prevHeight/totalHeight;
	var currEndPct = (prevHeight+parseInt(currentClassBar.height))/totalHeight;
	//calculate where covariate bars begin and end and use that to calculate the total covariate bars height
	var beginClasses = NgChm.SUM.canvas.offsetTop-6;
	var endClasses = beginClasses+classHgt-2;
	var classHeight = endClasses-beginClasses;
	//get your horizontal start position (to the right of bars)
	var leftPos = NgChm.SUM.canvas.offsetLeft + NgChm.SUM.canvas.offsetWidth + 2;
	//find the first, middle, and last vertical positions for the bar legend being drawn
	var topPos =  beginClasses+(classHeight*prevEndPct)+fewClasses;
	var endPos =  beginClasses+(classHeight*currEndPct)+fewClasses;
	var midPos =  topPos+((endPos-topPos)/2);
	var midVal = key.length > 13 ? key.substr(0,10)+"..." : key;
	//Create div and place mid legend value
	NgChm.SUM.setLabelDivElement(key+"Label",midVal,midPos,leftPos,false);
}

NgChm.SUM.setLabelDivElement = function (itemId,boundVal,topVal,leftVal,isRowVal) {
	//Create div and place high legend value
	var itemElem = document.getElementById(itemId);
	if (itemElem === null) {
		itemElem = document.createElement("Div"); 
		itemElem.id = itemId;
		itemElem.innerHTML = boundVal;
		itemElem.className = "classLabel";
		if (isRowVal) {
			itemElem.style.transform = "rotate(90deg)";
		}
		document.getElementById("summary_chm").appendChild(itemElem);
	}
	itemElem.style.top = topVal;
	itemElem.style.left = leftVal;
}

NgChm.SUM.drawColClassBarLegends = function (isSummary) {
	var classBarsConfig = NgChm.heatMap.getColClassificationConfig(); 
	var classBarConfigOrder = NgChm.heatMap.getColClassificationOrder();
	var classBarsData = NgChm.heatMap.getColClassificationData(); 
	var totalHeight = 0;
	for (var i = 0; i < classBarConfigOrder.length; i++) {
		var key = classBarConfigOrder[i];
		var currentClassBar = classBarsConfig[key];
		if (currentClassBar.show === 'Y') {
			totalHeight += parseInt(currentClassBar.height);
		}
	}
	var prevHeight = 0;
	var fewClasses = classBarConfigOrder.length < 7 ? 2 : 0;
	for (var i = 0; i < classBarConfigOrder.length; i++) {
		var key = classBarConfigOrder[i];
		var currentClassBar = classBarsConfig[key];
		if (currentClassBar.show === 'Y') {
			if (currentClassBar.bar_type !== 'color_plot') {
				if (isSummary) {
					NgChm.SUM.drawColClassBarLegend(key, currentClassBar,prevHeight,totalHeight, fewClasses);
				} else {
					NgChm.DET.drawColClassBarLegend(key,currentClassBar,prevHeight,totalHeight);
				}
			}
			prevHeight += parseInt(currentClassBar.height);
		}
	}
}

// THIS FUNCTION NOT CURRENTLY CALLED BUT MAY BE ADDED BACK IN IN THE FUTURE
NgChm.SUM.drawColClassBarLegend = function(key,currentClassBar,prevHeight,totalHeight, fewClasses) {
	//calculate where covariate bars end and heatmap begins by using the top items canvas (which is lined up with the heatmap)
	var rowCanvas = document.getElementById("summary_row_top_items_canvas");
	var classHgt = NgChm.SUM.canvas.offsetHeight - rowCanvas.offsetHeight;
	//calculate where the previous bar ends and the current one begins.
	var prevEndPct = prevHeight/totalHeight;
	var currEndPct = (prevHeight+parseInt(currentClassBar.height))/totalHeight;
	//calculate where covariate bars begin and end and use that to calculate the total covariate bars height
	var beginClasses = NgChm.SUM.canvas.offsetTop-6;
	var endClasses = beginClasses+classHgt-2;
	var classHeight = endClasses-beginClasses;
	//get your horizontal start position (to the right of bars)
	var leftPos = NgChm.SUM.canvas.offsetLeft + NgChm.SUM.canvas.offsetWidth;
	//find the first, middle, and last vertical positions for the bar legend being drawn
	var topPos =  beginClasses+(classHeight*prevEndPct)+fewClasses;
	var endPos =  beginClasses+(classHeight*currEndPct)+fewClasses;
	var midPos =  topPos+((endPos-topPos)/2);
	//Get your 3 values for the legend.
	var highVal = parseInt(currentClassBar.high_bound);
	var lowVal = parseInt(currentClassBar.low_bound);
	var midVal = Math.round((((highVal)-lowVal)/2)+lowVal);
	//extend values on legend to include decimal points if all values are below 1
	if (highVal <= 1) {
		highVal = parseFloat(currentClassBar.high_bound).toFixed(1);
		lowVal = parseFloat(currentClassBar.low_bound).toFixed(1);
		var midVal = ((parseFloat(currentClassBar.high_bound)-parseFloat(currentClassBar.low_bound))/2)+parseFloat(currentClassBar.low_bound);
		var midVal = midVal.toFixed(1)
	}
	NgChm.SUM.setLegendDivElement(key+"SumHigh-","-",topPos,leftPos,false,true);
	NgChm.SUM.setLegendDivElement(key+"SumHigh",highVal,topPos+4,leftPos+3,false,true);
	//Create div and place mid legend value
	NgChm.SUM.setLegendDivElement(key+"SumMid","- "+midVal,midPos,leftPos,false,true);
	//Create div and place low legend value
	NgChm.SUM.setLegendDivElement(key+"SumLow",lowVal,endPos-3,leftPos+3,false,true);
	NgChm.SUM.setLegendDivElement(key+"SumLow-","-",endPos,leftPos,false,true);
}

NgChm.SUM.drawRowClassBars = function(dataBuffer) {
	var classBarsConfig = NgChm.heatMap.getRowClassificationConfig(); 
	var classBarConfigOrder = NgChm.heatMap.getRowClassificationOrder();
	var classBarsData = NgChm.heatMap.getRowClassificationData(); 
	var colorMapMgr = NgChm.heatMap.getColorMapManager();
	if (document.getElementById("missingSumRowClassBars"))document.getElementById("missingSumRowClassBars").remove();
	var offset = 0;

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
			if (currentClassBar.bar_type === 'color_plot') {
				pos = NgChm.SUM.drawColorPlotRowClassBar(dataBuffer, pos, height, classBarValues, classBarLength, colorMap);
			} else {
				pos = NgChm.SUM.drawScatterBarPlotRowClassBar(dataBuffer, pos, height-NgChm.SUM.colClassPadding, classBarValues, classBarLength, colorMap, currentClassBar);
			}
			//offset starting point of one bar to the next by the width of one bar multiplied by BPR (e.g. 15 becomes 60)
			//offset+= height*NgChm.SUM.BYTE_PER_RGBA*NgChm.SUM.heightScale; 
			offset+= height*NgChm.SUM.BYTE_PER_RGBA; 
		} else {
			if (!document.getElementById("missingSumRowClassBars")){
				var x = NgChm.SUM.canvas.offsetLeft;
				var y = NgChm.SUM.canvas.offsetTop + NgChm.SUM.canvas.clientHeight + 2;
				NgChm.DET.addLabelDiv(document.getElementById('sumlabelDiv'), "missingSumRowClassBars", "ClassBar MarkLabel", "...", "...", x, y, 10, "T", null,"Row");
			}
		}
	}
}

NgChm.SUM.drawColorPlotRowClassBar = function(dataBuffer, pos, height, classBarValues, classBarLength, colorMap) {
	for (var j = classBarLength; j > 0; j--){
		var val = classBarValues[j-1];
		var color = colorMap.getClassificationColor(val);
		if (val == "null") {
			color = colorMap.getHexToRgba(colorMap.getMissingColor());
		}
		for (var i = 0; i < NgChm.SUM.heightScale; i++){
			for (var k = 0; k < (height-NgChm.SUM.rowClassPadding); k++){
				dataBuffer[pos] = color['r'];
				dataBuffer[pos + 1] = color['g'];
				dataBuffer[pos + 2] = color['b'];
				dataBuffer[pos + 3] = color['a'];
				pos+=NgChm.SUM.BYTE_PER_RGBA;	// 4 bytes per color
			}
			pos+=NgChm.SUM.rowClassPadding*NgChm.SUM.BYTE_PER_RGBA;
			pos+=(NgChm.SUM.totalWidth)*NgChm.SUM.BYTE_PER_RGBA*NgChm.SUM.widthScale - height*NgChm.SUM.BYTE_PER_RGBA;// + (NgChm.SUM.widthScale-NgChm.SUM.rowClassPadding)*NgChm.SUM.BYTE_PER_RGBA;// - (NgChm.SUM.widthScale-NgChm.SUM.rowClassPadding)*NgChm.SUM.BYTE_PER_RGBA;
		}
	}
	return pos;
}

NgChm.SUM.drawScatterBarPlotRowClassBar = function(dataBuffer, pos, height, classBarValues, classBarLength, colorMap, currentClassBar) {
	var barFgColor = colorMap.getHexToRgba(currentClassBar.fg_color);
	var barBgColor = colorMap.getHexToRgba(currentClassBar.bg_color); 
	var barCutColor = colorMap.getHexToRgba("#FFFFFF");
	var matrix = NgChm.SUM.buildScatterBarPlotMatrix( height, classBarValues, 0, classBarLength, currentClassBar, NgChm.heatMap.getTotalRows(), true);
	for (var h = (matrix[0].length-1); h >= 0 ; h--) { 
		for (var a=0; a<NgChm.SUM.heightScale;a++){
			for (var i = 0; i < height;i++) {
				var row = matrix[i];
				var posVal = row[h];
				if (posVal == 1) {
					dataBuffer[pos] = barFgColor['r'];
					dataBuffer[pos+1] = barFgColor['g'];
					dataBuffer[pos+2] = barFgColor['b'];
					dataBuffer[pos+3] = barFgColor['a'];
				} else if (posVal == 2) {
					dataBuffer[pos] = barCutColor['r'];
					dataBuffer[pos+1] = barCutColor['g'];
					dataBuffer[pos+2] = barCutColor['b'];
					dataBuffer[pos+3] = barCutColor['a'];
				} else {
					if (currentClassBar.subBgColor !== "#FFFFFF") {
						dataBuffer[pos] = barBgColor['r'];
						dataBuffer[pos+1] = barBgColor['g'];
						dataBuffer[pos+2] = barBgColor['b'];
						dataBuffer[pos+3] = barBgColor['a'];
					}
				}
				pos+=NgChm.SUM.BYTE_PER_RGBA;
			}
			// go total width of the summary canvas and back up the width of a single class bar to return to starting point for next row 
			pos+=(NgChm.SUM.totalWidth)*NgChm.SUM.BYTE_PER_RGBA*NgChm.SUM.widthScale - height*NgChm.SUM.BYTE_PER_RGBA;
		}
	}
	return pos;
}

//THIS FUNCTION NOT CURRENTLY FOR THE SUMMARY PANEL CALLED BUT MAY BE ADDED BACK IN IN THE FUTURE
NgChm.SUM.drawRowClassBarLegends = function (isSummary) {
	var classBarsConfig = NgChm.heatMap.getRowClassificationConfig(); 
	var classBarConfigOrder = NgChm.heatMap.getRowClassificationOrder();
	var classBarsData = NgChm.heatMap.getRowClassificationData(); 
	var totalHeight = 0;
	for (var i = 0; i < classBarConfigOrder.length; i++) {
		var key = classBarConfigOrder[i];
		var currentClassBar = classBarsConfig[key];
		if (currentClassBar.show === 'Y') {
			totalHeight += parseInt(currentClassBar.height);
		}
	}
	var prevHeight = 0;
	for (var i = 0; i < classBarConfigOrder.length; i++) {
		var key = classBarConfigOrder[i];
		var currentClassBar = classBarsConfig[key];
		if (currentClassBar.show === 'Y') {
			if (currentClassBar.bar_type !== 'color_plot') {
				if (isSummary) {
					NgChm.SUM.drawRowClassBarLegend(key,currentClassBar,prevHeight,totalHeight,i);
				} else {
					NgChm.DET.drawRowClassBarLegend(key,currentClassBar,prevHeight,totalHeight,i);
				}
			}
			prevHeight += parseInt(currentClassBar.height);
		}
	}
}

NgChm.SUM.drawRowClassBarLegend = function(key,currentClassBar,prevHeight,totalHeight,i) {
	var colCanvas = document.getElementById("summary_col_top_items_canvas");
	var classHgt = colCanvas.offsetLeft - NgChm.SUM.canvas.offsetLeft;
	var prevEndPct = prevHeight/totalHeight;
	var currEndPct = (prevHeight+parseInt(currentClassBar.height))/totalHeight;
	var beginClasses = NgChm.SUM.canvas.offsetLeft - 6;
	var endClasses = beginClasses+classHgt-2;
	var classesHeight = endClasses-beginClasses;
	var beginPos =  beginClasses+(classesHeight*prevEndPct)+(NgChm.SUM.rowClassPadding*(i+1));
	var endPos =  beginClasses+(classesHeight*currEndPct)-NgChm.SUM.rowClassPadding;
	var midPos =  beginPos+((endPos-beginPos)/2);
	var highVal = parseInt(currentClassBar.high_bound);
	var lowVal = parseInt(currentClassBar.low_bound);
	var midVal = Math.round((((highVal)-lowVal)/2)+lowVal);
	//adjust display values for 0-to-1 ranges
	if (highVal <= 1) {
		highVal = parseFloat(currentClassBar.high_bound).toFixed(1);
		lowVal = parseFloat(currentClassBar.low_bound).toFixed(1);
		var midVal = ((parseFloat(currentClassBar.high_bound)-parseFloat(currentClassBar.low_bound))/2)+parseFloat(currentClassBar.low_bound);
		var midVal = midVal.toFixed(1)
	}
	var rowCanvas = document.getElementById("summary_row_top_items_canvas");
	var topPos = rowCanvas.offsetTop+rowCanvas.offsetHeight+5;
	//Create div and place high legend value
	NgChm.SUM.setLegendDivElement(key+"SumHigh","-"+lowVal,topPos,beginPos,true,true);
	//Create div and place middle legend value
	NgChm.SUM.setLegendDivElement(key+"SumMid","-"+midVal,topPos,midPos,true,true);
	//Create div and place middle legend value
	NgChm.SUM.setLegendDivElement(key+"SumLow","-"+highVal,topPos,endPos,true,true);
}

NgChm.SUM.setLegendDivElement = function (itemId,boundVal,topVal,leftVal,isRowVal,isSummary) {
	//Create div and place high legend value
	var itemElem = document.getElementById(itemId);
	if (itemElem === null) {
		itemElem = document.createElement("Div"); 
		itemElem.id = itemId;
		itemElem.innerHTML = boundVal;
		if (isSummary) {
			itemElem.className = "classLegend";
			if (isRowVal) {
				itemElem.style.transform = "rotate(90deg)";
			}
			document.getElementById("summary_chm").appendChild(itemElem);
		} else {
			itemElem.className = "DynamicLabel ClassBar";
			if (isRowVal) {
				itemElem.style.transform = 'rotate(90deg)';
				itemElem.style.webkitTransform = "rotate(90deg)";
				itemElem.setAttribute('axis','RowCovar');
			} else {
				itemElem.setAttribute('axis','ColumnCovar');
			}
			itemElem.style.position = "absolute";
			itemElem.style.fontSize = '5pt';
			itemElem.style.fontFamily = 'sans-serif';
			itemElem.style.fontWeight = 'bold';
			NgChm.DET.labelElement.appendChild(itemElem);
		} 
	}
	itemElem.style.top = topVal;
	itemElem.style.left = leftVal;
}

NgChm.SUM.buildScatterBarPlotMatrix = function(height, classBarValues, start, classBarLength, currentClassBar, barSize, isSummary) {
	var matrix = new Array(height);
	var isBarPlot = currentClassBar.bar_type === 'scatter_plot' ? false : true;
	for (var j = 0; j < height; j++) {
		matrix[j] = new Uint8Array(classBarLength);
	}
	var highVal = parseInt(currentClassBar.high_bound);
	var lowVal = parseInt(currentClassBar.low_bound);
	var scaleVal = highVal - lowVal;
	var normalizedK = 0;
	for (var k = start; k < start+classBarLength; k++) { 
		var origVal = classBarValues[k];
		if (origVal === "!CUT!") {
			for (var l = 0; l < height; l++) {
				matrix[l][normalizedK] = 2;
			}
		} else {
			//For when the range is exclusive: Set for values out side range so that lower values register as the lowest value in the range
			//and higher values register as the highest value in the range. (Per Bradley Broom)
			if (origVal < lowVal) origVal = lowVal;
			if (origVal >= highVal) origVal = highVal;
			var adjVal = origVal-lowVal;
			var valScale = adjVal/scaleVal;
			var valHeight = Math.round(height*valScale) == height ? Math.round(height*valScale)-1 : Math.round(height*valScale);
			if ((origVal >= lowVal) && (origVal <= highVal)) {
				if (isBarPlot) {
					//select from the lower bound UP TO the current position in the matrix
					for (var l = 0; l <= valHeight; l++) {
						matrix[l][normalizedK] = 1;
					}
				} else {
					//select just the current position in the matrix
					matrix[valHeight][normalizedK] = 1;
					//if rows/cols large, select around the current position in the matrix
	/*				if ((isSummary) && (barSize > 500)) {
						matrix[valHeight][k+1] = 1;
						if (typeof matrix[valHeight+1] != 'undefined') {
							matrix[valHeight+1][k] = 1;
							if (typeof matrix[valHeight+1][k+1] != 'undefined') {
								matrix[valHeight+1][k+1] = 1;
							}
						} 
					} */
				}
			} 		
		}
		normalizedK++;
	} 
	return matrix;
}

NgChm.SUM.calculateSummaryTotalClassBarHeight = function(axis,stopOn) {
	var totalHeight = 0;
	if (axis === "row") {
		var classBars = NgChm.heatMap.getRowClassificationConfig();
	} else {
		var classBars = NgChm.heatMap.getColClassificationConfig();
	}
	for (var key in classBars){
		if ((typeof stopOn != 'undefined') && (key === stopOn)) {
			break;
		}
		if (classBars[key].show === 'Y') {
		   totalHeight += NgChm.SUM.getScaledHeight(parseInt(classBars[key].height), axis);
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
		NgChm.SUM.drawMissingRowClassBarsMark();
		NgChm.SUM.drawMissingColClassBarsMark();
		NgChm.SUM.drawTopItems();
		//Labels only drawn in NGCHM_GUI_Builder and split screen mode
		if (document.getElementById('divider').style.display === 'none') {
		 	NgChm.SUM.drawColClassBarLabels(); 
			NgChm.SUM.drawRowClassBarLabels(); 
		}
//		NgChm.SUM.drawColClassBarLegends(true); Removed for the time being
//		NgChm.SUM.drawRowClassBarLegends(true);
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

NgChm.SUM.drawMissingRowClassBarsMark = function (){
	if (document.getElementById("missingSumRowClassBars")){
		document.getElementById("missingSumRowClassBars").remove();
		var x = NgChm.SUM.canvas.offsetLeft;
		var y = NgChm.SUM.canvas.offsetTop + NgChm.SUM.canvas.clientHeight + 2;
		NgChm.DET.addLabelDiv(document.getElementById('sumlabelDiv'), "missingSumRowClassBars", "ClassBar MarkLabel", "...", "...", x, y, 10, "T", null,"Row");
	}
}

NgChm.SUM.drawMissingColClassBarsMark = function (){
	if (document.getElementById("missingSumColClassBars")){
		document.getElementById("missingSumColClassBars").remove();
		var x = NgChm.SUM.canvas.offsetLeft + NgChm.SUM.canvas.offsetWidth + 2;
		var y = NgChm.SUM.canvas.offsetTop + NgChm.SUM.canvas.clientHeight/NgChm.SUM.totalHeight - 10;
		NgChm.DET.addLabelDiv(document.getElementById('sumlabelDiv'), "missingSumColClassBars", "ClassBar MarkLabel", "...", "...", x, y, 10, "F", null,"Col");
	}
}

NgChm.SUM.clearSelectionMarks = function(){
	NgChm.SUM.clearRowSelectionMarks();
	NgChm.SUM.clearColSelectionMarks();
}

NgChm.SUM.clearRowSelectionMarks = function() {
	var rowSel = document.getElementById("summary_row_select_canvas");
	var rowCtx = rowSel.getContext('2d');
	rowCtx.clearRect(0,0,rowSel.width,rowSel.height);
}

NgChm.SUM.clearColSelectionMarks = function() {
	var colSel = document.getElementById("summary_col_select_canvas");
	var colCtx = colSel.getContext('2d');
	colCtx.clearRect(0,0,colSel.width,colSel.height);
}

NgChm.SUM.clearTopItems = function(){
	var oldMarks = document.getElementsByClassName("topItems");
	while (oldMarks.length > 0) {
		oldMarks[0].remove();
	}
	var colSel = document.getElementById("summary_col_top_items_canvas");
	var colCtx = colSel.getContext('2d');
	colCtx.clearRect(0,0,colSel.width,colSel.height);
	var rowSel = document.getElementById("summary_row_top_items_canvas");
	var rowCtx = rowSel.getContext('2d');
	rowCtx.clearRect(0,0,rowSel.width,rowSel.height);
}

NgChm.SUM.drawTopItems = function(){
	NgChm.SUM.clearTopItems();
	var summaryCanvas = document.getElementById("summary_canvas");
	var colTopItemsIndex = [];
	var rowTopItemsIndex = [];
	var colCanvas = document.getElementById("summary_col_top_items_canvas");
	var rowCanvas = document.getElementById("summary_row_top_items_canvas");
	var colCtx = colCanvas.getContext("2d");
	var rowCtx = rowCanvas.getContext("2d");
	colCtx.clearRect(0,0,colCanvas.width,colCanvas.height);
	rowCtx.clearRect(0,0,rowCanvas.width,rowCanvas.height);
	var colLabels = NgChm.heatMap.getColLabels()["labels"];
	var rowLabels = NgChm.heatMap.getRowLabels()["labels"];
	var colTop = summaryCanvas.offsetTop + summaryCanvas.offsetHeight + colCanvas.offsetHeight;
	var rowLeft = summaryCanvas.offsetLeft + summaryCanvas.offsetWidth + rowCanvas.offsetWidth;
	
	var matrixW = NgChm.SUM.matrixWidth;
	var matrixH = NgChm.SUM.matrixHeight;
	var colSumRatio = NgChm.heatMap.getColSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL);
	var rowSumRatio = NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL);
	
	var referenceItem = document.createElement("Div"); // create a reference top item div to space the elements properly. removed at end
	referenceItem.className = "topItems";
	referenceItem.innerHTML = "SampleItem";
	document.getElementById("summary_chm").appendChild(referenceItem);
	
	// draw the column top items
	if (NgChm.SUM.colTopItems){
		for (var i = 0; i < NgChm.SUM.colTopItems.length; i++){ // find the indices for each item to draw them later.
			var topItem = NgChm.SUM.colTopItems[i].trim();
			if (topItem == ""){
				continue;
			}
			for (var j = 0; j < colLabels.length; j++){
				var foundLabel = false;
				if (topItem == colLabels[j].split("|")[0] && colTopItemsIndex.length < 10){ // limit 10 items per axis
					foundLabel = true;
					colTopItemsIndex.push(j);
				} else if (colTopItemsIndex.length >= 10){
					break;
				}
			}
		}
		colTopItemsIndex = eliminateDuplicates(colTopItemsIndex.sort(sortNumber));
		NgChm.SUM.colTopItemsIndex = colTopItemsIndex;
		var colPositionArray = topItemPositions(colTopItemsIndex, matrixW, referenceItem.offsetHeight, colCanvas.width, colSumRatio);
		if (colPositionArray){
			var colTopItemsStart = Array(colTopItemsIndex.length);
			for (var i = 0; i < colTopItemsIndex.length; i++){ // fill in the proper start point for each item
				colTopItemsStart[i] = Math.round(colTopItemsIndex[i]/(colSumRatio*matrixW)*colCanvas.width);
			}
			var colAdjust = matrixW < 200 ? ((summaryCanvas.offsetWidth/matrixW)/2) : 0;
			for (var i = 0; i < colTopItemsIndex.length;i++){ // check for rightside overlap. move overlapping items to the left
 				var start = colTopItemsStart[i]+colAdjust;    
				var moveTo = colPositionArray[colTopItemsIndex[i]]*colCanvas.width;
				colCtx.moveTo(start,0);
				colCtx.bezierCurveTo(start,5,moveTo,5,moveTo,10);
				placeTopItemDiv(i, "col");
			}
		}
	}
	
	// draw row top items
	if (NgChm.SUM.rowTopItems){
		for (var i = 0; i < NgChm.SUM.rowTopItems.length; i++){ // find indices
			var foundLabel = false;
			var topItem = NgChm.SUM.rowTopItems[i].trim();
			if (topItem == ""){
				continue;
			}
			for (var j = 0; j < rowLabels.length; j++){
				if (topItem == rowLabels[j].split("|")[0] && rowTopItemsIndex.length < 10){ // limit 10 items per axis
					rowTopItemsIndex.push(j);
					foundLabel = true;
					break;
				} else if (rowTopItemsIndex.length >= 10){
					break;
				}
			}
		}
		rowTopItemsIndex = eliminateDuplicates(rowTopItemsIndex.sort(sortNumber));
		NgChm.SUM.rowTopItemsIndex = rowTopItemsIndex;
		var rowPositionArray = topItemPositions(rowTopItemsIndex, matrixH, referenceItem.offsetHeight, rowCanvas.height, rowSumRatio);
		if (rowPositionArray){
			var rowTopItemsStart = Array(rowTopItemsIndex.length);
			for (var i = 0; i < rowTopItemsIndex.length; i++){ // fill in the proper start point for each item
				rowTopItemsStart[i] = Math.round(rowTopItemsIndex[i]/(rowSumRatio*matrixH)*rowCanvas.height);
			}
			var rowAdjust = matrixH < 200 ? ((summaryCanvas.offsetHeight/matrixH)/2) : 0;
			for (var i = 0; i < rowTopItemsIndex.length;i++){ // draw the lines and the labels
				var start = rowTopItemsStart[i]+rowAdjust;
				var moveTo = rowPositionArray[rowTopItemsIndex[i]]*rowCanvas.height;
				rowCtx.moveTo(0,start);
				rowCtx.bezierCurveTo(5,start,5,moveTo,10,moveTo);
				placeTopItemDiv(i, "row");
			}
		}
	}
	
	
	referenceItem.remove();
	rowCtx.stroke();
	colCtx.stroke();
	
	
	// Helper functions for top items

	function eliminateDuplicates(arr) {
	  var i,
	      len=arr.length,
	      out=[],
	      obj={},
	      dupe=false;

	  for (i=0;i<len;i++) {
		  if (obj[arr[i]] == 0){
			  dupe=true;
		  }
	    obj[arr[i]]=0;
	  }
	  for (i in obj) {
	    out.push(i);
	  }
	  out.dupe=dupe;
	  return out;
	}

	function sortNumber(a,b) { // helper function to sort the indices properly
	    return a - b;
	}
	
	 //Find the optional position of a set of top items.  The index list of top items must be sorted.
    function topItemPositions(topItemsIndex, matrixSize, itemSize, canvasSize,summaryRatio) {
          //Array of possible top item positions is the size of the canvas divided by the size of each label.
          //Create a position array with initial value of -1
          var totalPositions = Math.round(canvasSize/itemSize)+1;
          if (totalPositions < topItemsIndex.length){
        	  return false;
          }
          var posList = Array.apply(null, Array(totalPositions)).map(Number.prototype.valueOf,-1)
         
          //Loop through the index position of each of the top items.
          for (var i = 0; i < topItemsIndex.length; i++) {
                var index = Number(topItemsIndex[i]);
                if (isNaN(index)){ // if the top item wasn't found in the labels array, it comes back as null
                	continue;  // so you can't draw it.
                }
                var bestPos = Math.min(Math.round(index * totalPositions / (summaryRatio * matrixSize)), posList.length-1);
                if (posList[bestPos] == -1)
                      posList[bestPos] = index;
                else {
                      //If position is occupied and there are an even number of items clumped here,
                      //shift them all to the left if possible to balance the label positions.
                      var edge = clumpEdge(posList, bestPos);
                      if (edge > -1) {
                            while (posList[edge] != -1 && edge <= posList.length-1){
                                  posList[edge-1] = posList[edge];
                                  edge++;
                            }
                            posList[edge-1]=-1;
                      }
                     
                      //Put this label in the next available slot
                      while (posList[bestPos] != -1)
                            bestPos++
                     
                      posList[bestPos] = index;    
                }
          }
         
          var relativePos = {}
          for (var i = 0; i < posList.length; i++) {
                if (posList[i] != -1) {
                      relativePos[posList[i]] = i/posList.length;
                }
          }
          return relativePos;    
    }
   
    //If there is a set of labels together in the position array and the number of labels in the
    //clump is even and it is not up against the left edge of the map, return the left most position
    //of the clump so it can then be shifted left.
    function clumpEdge (posList, position) {
          var rightEdge = position;
          var leftEdge = position;
         
          //First move to the right edge of the clump
          while (rightEdge < posList.length-1 && posList[rightEdge+1]!=-1) {
                rightEdge++
          }    
         
          //Now move to the left edge of the clump
          while (leftEdge > 0 && posList[leftEdge-1] != -1)
                leftEdge--;
         
          //If the clump should be shifted left, return the edge.
          if ((rightEdge==posList.length-1) || ((rightEdge - leftEdge + 1) % 2 == 0 && leftEdge > 0))
                return leftEdge;
          else
                return -1;
    }
	
	function placeTopItemDiv(index, axis){
		var isRow = axis.toLowerCase() == "row";
		var topItemIndex = isRow ? rowTopItemsIndex:colTopItemsIndex;
		var labels = isRow ? rowLabels : colLabels;
		var positionArray = isRow? rowPositionArray:colPositionArray;
		var item = document.createElement("Div"); // place middle/topmost item
		if (topItemIndex[index] == "null"){
			return;
		}
		item.axis = axis;
		item.index = topItemIndex[index];
		item.className = "topItems";
		item.innerHTML = NgChm.UTIL.getLabelText(labels[topItemIndex[index]].split("|")[0],axis);
		if (!isRow){
			item.style.transform = "rotate(90deg)";
		}
		document.getElementById("summary_chm").appendChild(item);
		item.style.top = isRow ? rowCanvas.offsetTop + positionArray[topItemIndex[index]]*rowCanvas.height - item.offsetHeight/2 : colTop + item.offsetWidth/2;
		item.style.left = isRow ? rowLeft: colCanvas.offsetLeft+ positionArray[topItemIndex[index]]*colCanvas.width - item.offsetWidth/2;
		return item;
	}
}

NgChm.SUM.dividerStart = function() {
	NgChm.UHM.userHelpClose();
	document.addEventListener('mousemove', NgChm.SUM.dividerMove);
	document.addEventListener('touchmove', NgChm.SUM.dividerMove);
	document.addEventListener('mouseup', NgChm.SUM.dividerEnd);
	document.addEventListener('touchend',NgChm.SUM.dividerEnd);
}

NgChm.SUM.dividerMove = function(e) {
	NgChm.heatMap.setUnAppliedChanges(true);
	e.preventDefault();
	var divider = document.getElementById('divider');
	if (e.touches){
    	if (e.touches.length > 1){
    		return false;
    	}
    }
	var summary = document.getElementById('summary_chm');
	var summaryX = summary.offsetWidth + e.movementX;
	summary.style.width=summaryX+'px';
	NgChm.SUM.setSummarySize();
	NgChm.SUM.colDendro.resize();
	NgChm.SUM.rowDendro.resize();
	if (summary.style.width == summary.style.maxWidth){
		return
	}
	var detail = document.getElementById('detail_chm');
	var detailX = detail.offsetWidth -e.movementX;
	detail.style.width=detailX+'px';
	if(document.getElementById("missingSumRowClassBars")) document.getElementById("missingSumRowClassBars").remove();
	if(document.getElementById("missingSumColClassBars")) document.getElementById("missingSumColClassBars").remove();
	NgChm.DET.clearLabels();
	NgChm.SUM.clearSelectionMarks();
	NgChm.SUM.clearTopItems();
	NgChm.SUM.setSelectionDivSize();
}

NgChm.SUM.dividerEnd = function(e) {
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
	NgChm.SUM.drawTopItems();
//	NgChm.SUM.drawColClassBarLegends(true);  Removed for the time being
//	NgChm.SUM.drawRowClassBarLegends(true);
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

