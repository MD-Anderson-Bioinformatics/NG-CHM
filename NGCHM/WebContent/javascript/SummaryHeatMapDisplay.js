(function() {
    'use strict';
    NgChm.markFile();

    const SUM = NgChm.createNS('NgChm.SUM');

    const MAPREP = NgChm.importNS('NgChm.MAPREP');
    const MMGR = NgChm.importNS('NgChm.MMGR');
    const DDR = NgChm.importNS('NgChm.DDR');
    const DET = NgChm.importNS('NgChm.DET');
    const DMM = NgChm.importNS('NgChm.DMM');
    const DEV = NgChm.importNS('NgChm.DEV');
    const UTIL = NgChm.importNS('NgChm.UTIL');
    const DRAW = NgChm.importNS('NgChm.DRAW');
    const DVW = NgChm.importNS('NgChm.DVW');
    const PANE = NgChm.importNS('NgChm.Pane');
    const SRCH = NgChm.importNS('NgChm.SRCH');

// Flags.
SUM.flagDrawClassBarLabels = false; // Labels are only drawn in NGCHM_GUI_Builder

//WebGl Canvas, Context, and Pixel Arrays
SUM.chmElement = null; // div containing summary heatmap
SUM.canvas = null; //Primary Heat Map Canvas
SUM.rCCanvas = null; //Row Class Bar Canvas
SUM.cCCanvas = null;  //Column Class Bar Canvas
SUM.boxCanvas = null;  //Secondary Heat Map Selection Box Canvas
SUM.mapGlManager = null; // WebGL manager for the primary heat map canvas
SUM.rcGlManager = null; // WebGL manager for the row covariate bar canvas
SUM.ccGlManager = null; // WebGL manager for the column covariate bar canvas
SUM.summaryHeatMapCache = {};	// Cached summary heat maps for each layer
SUM.summaryHeatMapValidator = {};	// Determines if the summary heat map for a layer needs to be rendered again
SUM.texRc = null;
SUM.texCc = null;

//Size of heat map components
SUM.heightPct = .96; // this is the amount of vertical space the col dendro and the map should take up on the summary chm div (taken from the css)
SUM.widthPct = .90; // this is the amount of horizontal space the row dendro and the map should take up on the summary chm div (taken from the css)
SUM.paddingHeight = 2;

SUM.colDendro = null;
SUM.rowDendro = null;
SUM.colTopItems = null;
SUM.rowTopItems = null;
SUM.colTopItemsIndex = null;
SUM.rowTopItemsIndex = null;
SUM.colTopItemsWidth = 0;
SUM.rowTopItemsHeight = 0;

SUM.rowClassPadding = 2;          // space between classification bars
SUM.colClassPadding = 2;          // space between classification bars
SUM.rowClassBarWidth = null;
SUM.colClassBarHeight = null;
SUM.rowClassScale = 1;
SUM.colClassScale = 1;
SUM.matrixWidth = null;
SUM.matrixHeight = null;
SUM.totalHeight = null;
SUM.totalWidth = null;
SUM.minDimensionSize = 100; // minimum size the data matrix canvas can be
SUM.widthScale = 1; // scalar used to stretch small maps (less than 250) to be proper size
SUM.heightScale = 1;

SUM.avgValue = {};           // Average value for each layer.
SUM.eventTimer = 0; // Used to delay draw updates
SUM.dragSelect=false;	  // Indicates if user has made a drag selection on the summary panel
SUM.clickStartRow=null;   // End row of current selected position
SUM.clickStartCol=null;   // Left column of the current selected position
SUM.mouseEventActive = false;

SUM.summaryHeatMapCache = {};
SUM.colTopItemsWidth = 0;
SUM.rowTopItemsHeight = 0;

// PRIVATE.
// To be called after the DOM elements for the summary panel have loaded.
// Ideally, not called until the first Summary panel is being created.
// Must be called before other summary panel initializations.
//
SUM.initSummaryDisplay = function() {
    
	SUM.canvas = document.getElementById('summary_canvas');
	SUM.boxCanvas = document.getElementById('summary_box_canvas');
	SUM.rCCanvas = document.getElementById('row_class_canvas');
	SUM.cCCanvas = document.getElementById('col_class_canvas');

	// Add necessary event listeners for canvas
	document.getElementById('summary_row_select_canvas').addEventListener("mouseup", SUM.onMouseUpSelRowCanvas);
	document.getElementById('summary_row_top_items_canvas').addEventListener("mouseup", SUM.onMouseUpSelRowCanvas);
	document.getElementById('summary_col_select_canvas').addEventListener("mouseup", SUM.onMouseUpSelColCanvas);
	document.getElementById('summary_col_top_items_canvas').addEventListener("mouseup", SUM.onMouseUpSelColCanvas);
	SUM.canvas.onmousedown = SUM.onMouseDownCanvas;
	SUM.canvas.onmouseup = SUM.onMouseUpCanvas;
	SUM.canvas.onmousemove = SUM.onMouseMoveCanvas;
	SUM.canvas.onmouseout = SUM.onMouseOut;
	SUM.canvas.ontouchstart = SUM.onMouseDownCanvas;
	SUM.canvas.ontouchmove = SUM.onMouseMoveCanvas;
	SUM.canvas.ontouchend = SUM.onMouseUpCanvas;
};

// Callback that is notified every time there is an update to the heat map 
// initialize, new data, etc.  This callback draws the summary heat map.
SUM.processSummaryMapUpdate = function(event, tile) {

	if (event === MMGR.Event_NEWDATA && tile.level === MAPREP.SUMMARY_LEVEL){
		//Summary tile - wait a bit to see if we get another tile quickly, then draw
		if (SUM.eventTimer != 0) {
			//New tile arrived - reset timer
			clearTimeout(SUM.eventTimer);
		}
		SUM.flushDrawingCache(tile);
		SUM.eventTimer = setTimeout(SUM.buildSummaryTexture, 200);
	} 
	//Ignore updates to other tile types.
}

// Initialize heatmap summary data that is independent of there being
// a summary panel.  This function is called once the heatmap data
// has been loaded, but before creating any view panels.
SUM.initSummaryData = function() {
	
	const heatMap = MMGR.getHeatMap();
	if (!SUM.colDendro){
		SUM.colDendro = new DDR.SummaryColumnDendrogram();
	}
	if (!SUM.rowDendro){
		SUM.rowDendro = new DDR.SummaryRowDendrogram ();
	}
	if (heatMap.getColConfig().top_items){
		SUM.colTopItems = heatMap.getColConfig().top_items.sort();
	}
	if (heatMap.getRowConfig().top_items){
		SUM.rowTopItems = heatMap.getRowConfig().top_items.sort();
	}
	
	SUM.matrixWidth = heatMap.getNumColumns(MAPREP.SUMMARY_LEVEL);
	SUM.matrixHeight = heatMap.getNumRows(MAPREP.SUMMARY_LEVEL);
	
	if (SUM.matrixWidth < SUM.minDimensionSize){
		SUM.widthScale = Math.max(2,Math.ceil(SUM.minDimensionSize /SUM.matrixWidth));
	}
	if (SUM.matrixHeight < SUM.minDimensionSize ){
		SUM.heightScale = Math.max(2,Math.ceil(SUM.minDimensionSize /SUM.matrixHeight));
	}
	SUM.calcTotalSize();
};

SUM.redrawSummaryPanel = function() {
	// Nothing to redraw if never initialized.
	if (!SUM.chmElement) return;
	SUM.initSummaryData();

	//Classificaton bars get stretched on small maps, scale down the bars and padding.
	SUM.rowClassBarWidth = SUM.calculateSummaryTotalClassBarHeight("row");
	SUM.colClassBarHeight = SUM.calculateSummaryTotalClassBarHeight("column");

	SUM.rCCanvas.width =  SUM.rowClassBarWidth;
	SUM.cCCanvas.height = SUM.colClassBarHeight;
	
	setTimeout (function() {
		SUM.initHeatMapGl();
		SUM.calcSummaryLayout();
		SUM.buildSummaryTexture();
		if (SUM.rCCanvas.width > 0) {
			SUM.buildRowClassTexture();
		}
		if (SUM.cCCanvas.height > 0) {
			SUM.buildColClassTexture();
		}
		SUM.drawLeftCanvasBox();
	
		SUM.setSelectionDivSize();
		SUM.clearSelectionMarks();
		SUM.drawSelectionMarks();
		SUM.drawTopItems();
		SUM.rowDendro.draw();
		SUM.colDendro.draw();
		if (SUM.flagDrawClassBarLabels) {
			SUM.drawColClassBarLabels();
			SUM.drawRowClassBarLabels();
		}
		if(document.getElementById("missingSumRowClassBars")) DVW.removeLabels("missingSumRowClassBars");
		if(document.getElementById("missingSumColClassBars")) DVW.removeLabels("missingSumColClassBars");
		SUM.drawMissingRowClassBarsMark();
		SUM.drawMissingColClassBarsMark();
		//SUM.drawColClassBarLegends(); Temporarily removed legends from summary
		//SUM.drawRowClassBarLegends(); they may or may not come back later
	}, 1);
}

//This function checks to see if the proposed summary width will allow for covariate bars,
//dendrogram, and some portion of the summary map.  If not, the minimum summary size is 
//reset to a larger size and the configuration for summary minimum width is updated. The
//mimimum width is also set for the summary chm so that the divider bar cannot be dragged
//further to the left.
SUM.setMinimumSummaryWidth = function(minSumWidth) {
	const heatMap = MMGR.getHeatMap();
	var sumPct = parseInt (heatMap.getMapInformation().summary_width);
	if (typeof NgChm.galaxy === "undefined") {  // FIXME: BMB: Implement a better way of determining Galaxy mode.
		if (SUM.chmElement.offsetWidth == 0) {
			return sumPct;
		}
		while (SUM.chmElement.offsetWidth < minSumWidth && sumPct < 90) {
			sumPct = sumPct + 5;
			SUM.chmElement.style.width = sumPct + "%";
		}
	}
	if (parseInt(heatMap.getMapInformation().summary_width) < sumPct) {
		heatMap.setDividerPref(sumPct.toString());
	}
	SUM.chmElement.style.minWidth = minSumWidth + 'px';

	return sumPct;
};

SUM.setTopItemsSize = function (){
	const heatMap = MMGR.getHeatMap();
	var colLabels = heatMap.getColLabels()["labels"];
	var rowLabels = heatMap.getRowLabels()["labels"];
	var colTopItemsIndex = [];
	SUM.colTopItemsIndex = colTopItemsIndex;
	var rowTopItemsIndex = [];
	SUM.rowTopItemsIndex = rowTopItemsIndex;
	SUM.colTopItemsWidth = 0;
	if (SUM.colTopItems){
		for (let i = 0; i < SUM.colTopItems.length; i++){
			let foundLabel = false;
			let p = document.createElement("p");
			p.innerText = MMGR.getLabelText(SUM.colTopItems[i].split("|")[0],"col");
			p.className = "topItems";
			SUM.chmElement.appendChild(p);
			for (let j = 0; j < colLabels.length; j++){
				if (SUM.colTopItems[i] == colLabels[j].split("|")[0] && colTopItemsIndex.length < 10){ // limit 10 items per axis
					foundLabel = true;
					colTopItemsIndex.push(j);
				} else if (colTopItemsIndex.length >= 10){
					break;
				}
			}
			if (foundLabel && (p.clientWidth+10) > SUM.colTopItemsWidth){
				SUM.colTopItemsWidth = p.clientWidth+10; // + 5 to add a margin in case of overlap
			}
			SUM.chmElement.removeChild(p);
		}
	}
	SUM.rowTopItemsHeight = 0;
	if (SUM.rowTopItems){
		for (let i = 0; i < SUM.rowTopItems.length; i++){
			let foundLabel = false;
			let p = document.createElement("p");
			p.innerText = MMGR.getLabelText(SUM.rowTopItems[i].split("|")[0],"row");
			p.className = "topItems";
			SUM.chmElement.appendChild(p);
			for (let j = 0; j < rowLabels.length; j++){
				if (SUM.rowTopItems[i] == rowLabels[j].split("|")[0] && rowTopItemsIndex.length < 10){ // limit 10 items per axis
					foundLabel = true;
					rowTopItemsIndex.push(j);
				} else if (rowTopItemsIndex.length >= 10){
					break;
				}
			}
			if (foundLabel && (p.clientWidth+10) > SUM.rowTopItemsHeight){
				SUM.rowTopItemsHeight = p.clientWidth+10; // + 5 to add a margin in case of overlap
			}
			SUM.chmElement.removeChild(p);
		}
	}
}

//Set the variables for the total size of the summary heat map - used to set canvas, WebGL texture, and viewport size.
SUM.calcTotalSize = function() {
	SUM.totalHeight = SUM.matrixHeight*SUM.heightScale;
	SUM.totalWidth = SUM.matrixWidth*SUM.widthScale;
};

SUM.setSelectionDivSize = function(width, height){ // input params used for PDF Generator to resize canvas based on PDF sizes
	const heatMap = MMGR.getHeatMap();
	var colSel = document.getElementById("summary_col_select_canvas");
	var rowSel = document.getElementById("summary_row_select_canvas");
	var colTI = document.getElementById("summary_col_top_items_canvas");
	var rowTI = document.getElementById("summary_row_top_items_canvas");
	//Size and position Column Selections Canvas
	const colSelVP = {
		top: SUM.colDendro.getDivHeight() + SUM.cCCanvas.clientHeight + SUM.canvas.clientHeight,
		width: SUM.canvas.clientWidth,
		height: 10
	};
	colSel.style.left = SUM.canvas.style.left;
	UTIL.setElementPositionSize (colSel, colSelVP, true);
	colSel.width = heatMap.getNumColumns("d");
	colSel.height = 10;

	//Size and position Column Top Items Canvas
	colTI.style.left = SUM.canvas.style.left;
	UTIL.setElementPositionSize (colTI, colSelVP, true);
	colTI.height = 10;
	
	//Size and position Row Selection Canvas
	const rowSelVP = {
		top: SUM.canvas.offsetTop,
		left: SUM.canvas.offsetLeft+SUM.canvas.offsetWidth,
		width: 10,
		height: SUM.canvas.clientHeight
	};
	UTIL.setElementPositionSize (rowSel, rowSelVP, true);
	rowSel.width = 10;
	rowSel.height = heatMap.getNumRows("d");
	
	//Size and position Row Top Items Canvas
	UTIL.setElementPositionSize (rowTI, rowSelVP, true);
	rowTI.width = 10;
	rowTI.height = height ? height*SUM.heightScale*SUM.matrixHeight/SUM.canvas.height :Math.round(SUM.canvas.clientHeight*((SUM.canvas.height-SUM.calculateSummaryTotalClassBarHeight("col"))/SUM.canvas.height));
};

/***************************
 * Summary Panel WebGL stuff
 **************************/

(function() {

    // The summary panel uses three WebGL canvases and thus contexts: one for the heatmap,
    // one for the row covariates, and one for the column covariates.  The WebGL context
    // elements and properties are the same for all three, so we use common functions for
    // creating the WebGL contexts and initializing (re-initializing) the context.

    //Initialize webGl for the Heat Map Canvas
    SUM.initHeatMapGl = function() {
	// First time: create the context manager.
	if (!SUM.mapGlManager) SUM.mapGlManager = createSummaryGlManager ( SUM.canvas, SUM.drawHeatMap );
	// Every time: check if (re-)initialization required and do so if needed.
	return SUM.mapGlManager.check(initSummaryGlContext);

    };

    //Initialize webGl for the Row Class Bar Canvas
    SUM.initRowClassGl = function() {
	if (!SUM.rcGlManager) SUM.rcGlManager = createSummaryGlManager ( SUM.rCCanvas, SUM.drawRowClassBars );
	return SUM.rcGlManager.check(initSummaryGlContext);
    };

    //Initialize webGl for the Column Class Bar Canvas
    SUM.initColClassGl = function() {
	if (!SUM.ccGlManager) SUM.ccGlManager = createSummaryGlManager ( SUM.cCCanvas, SUM.drawColClassBars );
	return SUM.ccGlManager.check(initSummaryGlContext);
    };

    // Create a GL manager that uses the summary map vertex and fragment shaders.
    function createSummaryGlManager (canvas, onRestore) {
	    return DRAW.GL.createGlManager (canvas, getVertexShader, getFragmentShader, onRestore, SUM.widthScale, SUM.heightScale);
    }

    // Vertex shader for summary heat maps.
    const vertexShaderSource = `
	attribute vec2 position;
	varying vec2 v_texPosition;
	void main () {
	    gl_Position = vec4(position, 0, 1);
	    v_texPosition = position * 0.5 + 0.5;
	 }
    `;
    function getVertexShader (gl) {
	const shader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(shader, vertexShaderSource);
	gl.compileShader(shader);
	return shader;
    }

    // Fragment shader for summary heat maps.
    const fragmentShaderSource = `
	precision mediump float;
	varying vec2 v_texPosition;
	varying float v_boxFlag;
	uniform sampler2D u_texture;
	void main () {
	   gl_FragColor = texture2D(u_texture, v_texPosition);
	}
    `;
    function getFragmentShader(gl) {
	const shader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(shader, fragmentShaderSource);
	gl.compileShader(shader);
	return shader;
    }

    // (Re-)initialize a summary GL context.
    function initSummaryGlContext (manager, ctx, program) {
	ctx.viewport(0, 0, ctx.drawingBufferWidth*SUM.widthScale, ctx.drawingBufferHeight*SUM.heightScale);
	ctx.clear(ctx.COLOR_BUFFER_BIT);

	manager.setClipRegion (DRAW.GL.fullClipSpace);
	return true;
    }

})();

//This function is called when a new summary tile is received.
//The summary heatmap for the tile's layer is marked so
//that it will be redrawn when buildSummaryTexture is called next.
SUM.flushDrawingCache = function(tile) {
	const debug = false;
	if (debug) console.log ('Flushing summary heat map for layer ' + tile.layer + ' at ' + performance.now());
	SUM.summaryHeatMapValidator[tile.layer] = '';	// Empty string will not match any validator
};

//Create a summary heat map for the current data layer and display it.
SUM.buildSummaryTexture = function() {
	const debug = false;

	const heatMap = MMGR.getHeatMap();
	const currentDl = heatMap.getCurrentDL();
	let renderBuffer;
	if (SUM.summaryHeatMapCache.hasOwnProperty(currentDl)) {
		renderBuffer = SUM.summaryHeatMapCache[currentDl];
	} else {
		renderBuffer = DRAW.createRenderBuffer (SUM.totalWidth*SUM.widthScale, SUM.totalHeight*SUM.heightScale, 1.0);
		SUM.summaryHeatMapCache[currentDl] = renderBuffer;
		SUM.summaryHeatMapValidator[currentDl] = '';
	}
	SUM.eventTimer = 0;

	const colorMap = heatMap.getColorMapManager().getColorMap("data",currentDl);

	// Together with the data, these parameters determine the color of a matrix value.
	const pixelColorScheme = {
		colors: colorMap.getColors(),
		thresholds: colorMap.getThresholds(),
		missingColor: colorMap.getMissingColor()
	};

	const summaryProps = {
		dataLayer: currentDl,
		width: renderBuffer.width,
		height: renderBuffer.height,
		widthScale: SUM.widthScale,
		heightScale: SUM.heightScale,
		colorScheme: pixelColorScheme
	};
	const validator = JSON.stringify(summaryProps);
	if (debug) console.log ({
		m: 'NgChm.SUM.buildSummaryTexture',
		summaryProps,
		'new data': SUM.summaryHeatMapValidator[currentDl] === '',
		valid: SUM.summaryHeatMapValidator[currentDl] === validator,
		t: performance.now()
	});

	// Render
	if (validator !== SUM.summaryHeatMapValidator[currentDl]) {
		SUM.renderSummaryHeatmap(renderBuffer);
		if (debug) console.log('Rendering summary heatmap finished at ' + performance.now());
		SUM.summaryHeatMapValidator[currentDl] = validator;
	}
	if (renderBuffer !== undefined) {
		SUM.drawHeatMapRenderBuffer(renderBuffer);
	}
};

// Redisplay the summary heat map for the current data layer.
SUM.drawHeatMap = function() {
	const heatMap = MMGR.getHeatMap();
	const currentDl = heatMap.getCurrentDL();
	if (SUM.summaryHeatMapCache[currentDl] !== undefined) {
		SUM.drawHeatMapRenderBuffer (SUM.summaryHeatMapCache[currentDl]);
	}
};

// Renders the Summary Heat Map for the current data layer into the specified renderBuffer.
SUM.renderSummaryHeatmap = function (renderBuffer) {
	const heatMap = MMGR.getHeatMap();
	const currentDl = heatMap.getCurrentDL();
	var colorMap = heatMap.getColorMapManager().getColorMap("data",currentDl);
	var colors = colorMap.getColors();
	var missing = colorMap.getMissingColor();
	var pos = 0;
	//Setup texture to draw on canvas.
	//Needs to go backward because WebGL draws bottom up.
	SUM.avgValue[currentDl] = 0;
	for (var i = heatMap.getNumRows(MAPREP.SUMMARY_LEVEL); i > 0; i--) {
		var line = new Array(heatMap.getNumColumns(MAPREP.SUMMARY_LEVEL)*SUM.widthScale*DRAW.BYTE_PER_RGBA);
		var linepos = 0;
		for (var j = 1; j <= heatMap.getNumColumns(MAPREP.SUMMARY_LEVEL); j++) { // draw the heatmap
			var val = heatMap.getValue(MAPREP.SUMMARY_LEVEL, i, j);
			if ((val < MAPREP.maxValues) && (val > MAPREP.minValues)) {
				SUM.avgValue[currentDl] += val;
			}
			var color = colorMap.getColor(val);
			for (var k = 0; k < SUM.widthScale; k++){
				line[linepos] = color['r'];
				line[linepos + 1] = color['g'];
				line[linepos + 2] = color['b'];
				line[linepos + 3] = color['a'];
				linepos+= DRAW.BYTE_PER_RGBA;
			}
		}
		for (var j = 0; j < SUM.heightScale*SUM.widthScale; j++) { // why is this heightScale * widthScale? why can't it just be heightScale??
			for (var k = 0; k < line.length; k++){
				renderBuffer.pixels[pos] = line[k];
				pos++;
			}
		}
	}
	SUM.avgValue[currentDl] = (SUM.avgValue[currentDl] / (heatMap.getNumRows(MAPREP.SUMMARY_LEVEL) * heatMap.getNumColumns(MAPREP.SUMMARY_LEVEL)));
};

//WebGL code to draw the Summary Heat Map.
SUM.drawHeatMapRenderBuffer = function(renderBuffer) {
	if (SUM.chmElement && SUM.initHeatMapGl ()) {
	    SUM.mapGlManager.setTextureFromRenderBuffer (renderBuffer);
	    SUM.mapGlManager.drawTexture ();
	}
};

//Draws Row Classification bars into the webGl texture array ("dataBuffer"). "names"/"colorSchemes" should be array of strings.
SUM.buildRowClassTexture = function() {
	const heatMap = MMGR.getHeatMap();

	SUM.texRc = DRAW.createRenderBuffer (SUM.rowClassBarWidth*SUM.widthScale, SUM.totalHeight, 1.0);
	var dataBuffer = SUM.texRc.pixels;
	var classBarsConfig = heatMap.getRowClassificationConfig();
	var classBarConfigOrder = heatMap.getRowClassificationOrder();
	var classBarsData = heatMap.getRowClassificationData();
	var colorMapMgr = heatMap.getColorMapManager();
	DVW.removeLabels("missingSumRowClassBars");
	var offset = 0;
	for (var i = 0; i < classBarConfigOrder.length; i++) {
		var remainingWidth = SUM.rowClassBarWidth;
		var key = classBarConfigOrder[i];
		var pos = 0 + offset;
		var currentClassBar = classBarsConfig[key];
		var height = SUM.getScaledHeight(currentClassBar.height, "row");
		remainingWidth -= height;
		if (currentClassBar.show === 'Y') {
			var colorMap = colorMapMgr.getColorMap("row",key); // assign the proper color scheme...
			var classBarValues = classBarsData[key].values;
			var classBarLength = classBarValues.length;
			if (typeof classBarsData[key].svalues != 'undefined') {
				classBarValues = classBarsData[key].svalues;
				classBarLength = classBarValues.length;
			}
			if (currentClassBar.bar_type === 'color_plot') {
				pos = SUM.drawColorPlotRowClassBar(dataBuffer, pos, height, classBarValues, classBarLength, colorMap, remainingWidth);
			} else {
				pos = SUM.drawScatterBarPlotRowClassBar(dataBuffer, pos, height-SUM.colClassPadding, classBarValues, classBarLength, colorMap, currentClassBar, remainingWidth);
			}
			offset+= height*DRAW.BYTE_PER_RGBA;
		} else {
			if (!document.getElementById("missingSumRowClassBars")){
				var x = SUM.canvas.offsetLeft;
				var y = SUM.canvas.offsetTop + SUM.canvas.clientHeight + 2;
				DET.addLabelDivs(document.getElementById('sumlabelDiv'), "missingSumRowClassBars", "ClassBar MarkLabel", "...", "...", x, y, 10, "T", null,"Row");
			}
		}
	}
	SUM.drawRowClassBars();
};

SUM.drawRowClassBars = function() {
	if (SUM.texRc && SUM.initRowClassGl()) {
		SUM.rcGlManager.setTextureFromRenderBuffer (SUM.texRc);
		SUM.rcGlManager.drawTexture();
	}
};

//Draws Column Classification bars into the webGl texture array ("dataBuffer"). "names"/"colorSchemes" should be array of strings.
SUM.buildColClassTexture = function() {
	const heatMap = MMGR.getHeatMap();
	SUM.texCc = DRAW.createRenderBuffer (SUM.totalWidth*SUM.widthScale, SUM.colClassBarHeight*SUM.heightScale, 1.0);
	var dataBuffer = SUM.texCc.pixels;
	DVW.removeLabels("missingSumColClassBars");
	var classBarsConfig = heatMap.getColClassificationConfig();
	var classBarConfigOrder = heatMap.getColClassificationOrder();
	var classBarsData = heatMap.getColClassificationData();
	var colorMapMgr = heatMap.getColorMapManager();
	var pos = 0;
	
	//We reverse the order of the classBars before drawing because we draw from bottom up
	for (var i = classBarConfigOrder.length -1; i >= 0; i--) {
		var key = classBarConfigOrder[i];
		var currentClassBar = classBarsConfig[key];
		if (currentClassBar.show === 'Y') {
			var height = SUM.getScaledHeight(currentClassBar.height, "col");
			var colorMap = colorMapMgr.getColorMap("col",key); // assign the proper color scheme...
			var classType = colorMap.getType();       
			var classBarValues = classBarsData[key].values;
			var classBarLength = classBarValues.length;
			if (typeof classBarsData[key].svalues != 'undefined') {
				classBarValues = classBarsData[key].svalues;
				classBarLength = classBarValues.length;
			}
			pos += (SUM.totalWidth)*SUM.colClassPadding*DRAW.BYTE_PER_RGBA*SUM.widthScale; // draw padding between class bars  ***not 100% sure why the widthscale is used as a factor here, but it works...
			if (currentClassBar.bar_type === 'color_plot') {
				pos = SUM.drawColorPlotColClassBar(dataBuffer, pos, height, classBarValues, classBarLength, colorMap);
			} else {
				pos = SUM.drawScatterBarPlotColClassBar(dataBuffer, pos, height-SUM.colClassPadding, classBarValues, classBarLength, colorMap, currentClassBar);
			}
		} else {
			if (!document.getElementById("missingSumColClassBars")){
				var x = SUM.canvas.offsetLeft + SUM.canvas.offsetWidth + 2;
				var y = SUM.canvas.offsetTop + SUM.canvas.clientHeight/SUM.totalHeight - 10;
				DET.addLabelDivs(document.getElementById('sumlabelDiv'), "missingSumColClassBars", "ClassBar MarkLabel", "...", "...", x, y, 10, "F", null,"Column");
			}		
		}
	}
	SUM.drawColClassBars();
};

//WebGL code to draw the Column Class Bars.
SUM.drawColClassBars = function() {
	if (SUM.texCc && SUM.initColClassGl()) {
		SUM.ccGlManager.setTextureFromRenderBuffer (SUM.texCc);
		SUM.ccGlManager.drawTexture ();
	}
};

SUM.onMouseDownCanvas = function(evt) {
	SUM.mouseEventActive = true;
	evt.preventDefault();
	evt.stopPropagation();	
	var boxY = ((SUM.colClassBarHeight)/SUM.canvas.height * SUM.boxCanvas.height);
	var sumOffsetX = evt.touches ? SUM.getTouchEventOffset(evt).offsetX : evt.offsetX;
	var sumOffsetY = evt.touches ? SUM.getTouchEventOffset(evt).offsetY : evt.offsetY;
	var sumRow = SUM.canvasToMatrixRow(SUM.getCanvasY(sumOffsetY));
	var sumCol = SUM.canvasToMatrixCol(SUM.getCanvasX(sumOffsetX));
	if ((sumRow > 0) && (sumCol > 0)) {
		SUM.canvas.style.cursor="crosshair";
	}
	const heatMap = MMGR.getHeatMap();
	SUM.clickStartRow = (sumRow*heatMap.getRowSummaryRatio(MAPREP.SUMMARY_LEVEL));
	SUM.clickStartCol = (sumCol*heatMap.getColSummaryRatio(MAPREP.SUMMARY_LEVEL));
}

SUM.onMouseOut = function(evt) {
	if (SUM.dragSelect) {
		SUM.onMouseUpCanvas(evt);
	}	
	SUM.mouseEventActive = false;
	SUM.canvas.style.cursor="default";
	//Gotta redraw everything because of event cascade occurring when mousing out of the layers that contain the canvas 
	// (container and summary_chm) we set the right position mousing up on the canvas above, but move events are still coming in.
	if (DVW.detailMaps.length > 0) { // only 'redraw everything' if there are detail maps showing
		DVW.primaryMap.updateSelection();
	}
}

SUM.onMouseMoveCanvas = function(evt) {
	if (SUM.mouseEventActive) {
		if (evt.which==1 || (evt.touches && evt.touches.length == 2)) {
			if (evt.shiftKey || evt.touches) {
				SUM.dragSelection(evt);
			} else {
				SUM.dragMove(evt);
			}
		}
	}
}

//Translate click into row column position and then draw select box.
SUM.onMouseUpCanvas = function(evt) {
	if (SUM.mouseEventActive) {
		evt.preventDefault();
		evt.stopPropagation();	
		var clickSection = 'Matrix';
		var sumOffsetX = evt.touches ? SUM.getTouchEventOffset(evt).offsetX : evt.offsetX;
		var sumOffsetY = evt.touches ? SUM.getTouchEventOffset(evt).offsetY : evt.offsetY;
		//When doing a shift drag, this block will actually do the selection on mouse up.
		if (SUM.dragSelect) {
			const heatMap = MMGR.getHeatMap();
			var totalRows = heatMap.getNumRows(MAPREP.SUMMARY_LEVEL);
			var totalCols = heatMap.getNumColumns(MAPREP.SUMMARY_LEVEL);
			var xPos = SUM.getCanvasX(sumOffsetX);
			var yPos = SUM.getCanvasY(sumOffsetY);
			var sumRow = SUM.canvasToMatrixRow(yPos);
			var sumCol = SUM.canvasToMatrixCol(xPos);
			if (sumRow > totalRows) {sumRow = totalRows;}
			if (sumCol > totalCols) {sumCol = totalCols;}
			var clickEndRow = Math.max(sumRow*heatMap.getRowSummaryRatio(MAPREP.SUMMARY_LEVEL),1);
			var clickEndCol = Math.max(sumCol*heatMap.getColSummaryRatio(MAPREP.SUMMARY_LEVEL),0);
			var startRow = Math.max(Math.min(SUM.clickStartRow,clickEndRow),1);
			var startCol = Math.max(Math.min(SUM.clickStartCol,clickEndCol)+1,1);
			var endRow = Math.max(SUM.clickStartRow,clickEndRow);
			var endCol = Math.max(SUM.clickStartCol,clickEndCol);
			SUM.setSubRibbonView(startRow, endRow, startCol, endCol);
		} else {
			var xPos = SUM.getCanvasX(sumOffsetX);
			var yPos = SUM.getCanvasY(sumOffsetY);
			SUM.clickSelection(xPos, yPos);
			SUM.clickStartRow = null;
			SUM.clickStartCol = null;
		} 
		SUM.dragSelect = false;
		SUM.canvas.style.cursor="default";
		//Make sure the selected row/column are within the bounds of the matrix.
		if (DVW.primaryMap) {
		    DVW.checkRow(DVW.primaryMap);
		    DVW.checkCol(DVW.primaryMap);
		}
		SUM.mouseEventActive = false;
	}
}

//This is a helper function that can set a sub-ribbon view that best matches a user
//selected region of the map.
SUM.setSubRibbonView  = function(startRow, endRow, startCol, endCol) {
	let mapItem = (DEV.targetCanvas !== null) ? DVW.getMapItemFromCanvas(DEV.targetCanvas) : DVW.primaryMap;
	DEV.targetCanvas = null;
	const selRows = Math.abs(endRow - startRow);
	const selCols = Math.abs(endCol - startCol);
	//In case there was a previous dendo selection - clear it.
	SUM.clearSelectionMarks();
	SUM.colDendro.draw();
	SUM.rowDendro.draw();

	if (!mapItem) return;
	//If tiny tiny box was selected, discard and go back to previous selection size
	if (endRow-startRow<1 && endCol-startCol<1) {
		DET.setDetailDataSize (mapItem, mapItem.dataBoxWidth);
	//If there are more rows than columns do a horizontal sub-ribbon view that fits the selection. 	
	} else if (selRows >= selCols) {
		var boxSize = DET.getNearestBoxHeight(mapItem, endRow - startRow + 1);
		DET.setDetailDataHeight(mapItem,boxSize);
		mapItem.selectedStart= startCol;
		mapItem.selectedStop=endCol;
		mapItem.currentRow = startRow;
		DEV.callDetailDrawFunction('RIBBONH', mapItem);
	} else {
		//More columns than rows, do a vertical sub-ribbon view that fits the selection. 	
		var boxSize = DET.getNearestBoxSize(mapItem, endCol - startCol + 1);
		DET.setDetailDataWidth(mapItem,boxSize);
		mapItem.selectedStart=startRow;
		mapItem.selectedStop=endRow;
		mapItem.currentCol = startCol; 
		DEV.callDetailDrawFunction('RIBBONV', mapItem);
	}
	mapItem.updateSelection();
}

SUM.clickSelection = function(xPos, yPos) {
	if (!DVW.primaryMap) return;
	var sumRow = SUM.canvasToMatrixRow(yPos) - Math.floor(DVW.getCurrentSumDataPerCol(DVW.primaryMap)/2);
	var sumCol = SUM.canvasToMatrixCol(xPos) - Math.floor(DVW.getCurrentSumDataPerRow(DVW.primaryMap)/2);
	DVW.setCurrentRowFromSum(DVW.primaryMap,sumRow);
	DVW.setCurrentColFromSum(DVW.primaryMap,sumCol);
	DVW.primaryMap.updateSelection();
}

SUM.dragMove = function(evt) {
	if (!DVW.primaryMap) return;
	var sumOffsetX = evt.touches ? SUM.getTouchEventOffset(evt).offsetX : evt.offsetX;
	var sumOffsetY = evt.touches ? SUM.getTouchEventOffset(evt).offsetY : evt.offsetY;
	var xPos = SUM.getCanvasX(sumOffsetX);
	var yPos = SUM.getCanvasY(sumOffsetY);
	var sumRow = SUM.canvasToMatrixRow(yPos) - Math.round(DVW.getCurrentSumDataPerCol(DVW.primaryMap)/2);
	var sumCol = SUM.canvasToMatrixCol(xPos) - Math.round(DVW.getCurrentSumDataPerRow(DVW.primaryMap)/2);
	DVW.setCurrentRowFromSum(DVW.primaryMap,sumRow);
	DVW.setCurrentColFromSum(DVW.primaryMap,sumCol);
	DVW.primaryMap.updateSelection();
	MMGR.getHeatMap().setUnAppliedChanges(true);
}

//This function now is just in charge of drawing the green box in the summary side as
//a shift drag is happening.  When mouse up occurs, the actual selection will be done.
SUM.dragSelection = function(evt) {
	const heatMap = MMGR.getHeatMap();
	var totalRows = heatMap.getNumRows(MAPREP.SUMMARY_LEVEL);
	var totalCols = heatMap.getNumColumns(MAPREP.SUMMARY_LEVEL);
	var sumOffsetX = evt.offsetX;
	var sumOffsetY = evt.offsetY;
	if (evt.touches){
		var rect = evt.target.getBoundingClientRect();
		sumOffsetX = Math.round(evt.targetTouches[0].pageX - rect.left);
		sumOffsetY = Math.round(evt.targetTouches[0].pageY - rect.top);
		var initSumOffsetX = Math.round(evt.targetTouches[1].pageX - rect.left);
		var initSumOffsetY = Math.round(evt.targetTouches[1].pageY - rect.top);
		var sumRow = SUM.canvasToMatrixRow(SUM.getCanvasY(initSumOffsetY));
		var sumCol = SUM.canvasToMatrixCol(SUM.getCanvasX(initSumOffsetX));

		SUM.clickStartRow = (sumRow*heatMap.getRowSummaryRatio(MAPREP.SUMMARY_LEVEL));
		SUM.clickStartCol = (sumCol*heatMap.getColSummaryRatio(MAPREP.SUMMARY_LEVEL));
	}
	var xPos = SUM.getCanvasX(sumOffsetX);
	var yPos = SUM.getCanvasY(sumOffsetY);
	var sumRow = SUM.canvasToMatrixRow(yPos);
	var sumCol = SUM.canvasToMatrixCol(xPos);
	if (sumRow > totalRows) {sumRow = totalRows;}
	if (sumCol > totalCols) {sumCol = totalCols;}
	var clickEndRow = Math.max(sumRow*heatMap.getRowSummaryRatio(MAPREP.SUMMARY_LEVEL),1);
	var clickEndCol = Math.max(sumCol*heatMap.getColSummaryRatio(MAPREP.SUMMARY_LEVEL),0);
	var startRow = Math.min(SUM.clickStartRow,clickEndRow);
	var startCol = Math.min(SUM.clickStartCol,clickEndCol)+1;
	if (startRow < 0 || startCol < 0){
		return;
	}
	var endRow = Math.max(SUM.clickStartRow,clickEndRow);
	var endCol = Math.max(SUM.clickStartCol,clickEndCol)+1;
	SUM.dragSelect = true;
	if (DVW.primaryMap) {
	    DVW.primaryMap.dataPerRow = endCol - startCol;
	    DVW.primaryMap.dataPerCol = endRow - startRow;
	    DVW.primaryMap.currentRow = startRow;
	    DVW.primaryMap.currentCol = startCol;
	}
	SUM.drawLeftCanvasBox();
}

//Browsers resizes the canvas.  This function translates from a click position
//back to the original (non-scaled) canvas position. 
SUM.getCanvasX = function(offsetX) {
	return (((offsetX/SUM.canvas.clientWidth) * SUM.canvas.width));
}

SUM.getCanvasY = function(offsetY) {
	return (((offsetY/SUM.canvas.clientHeight) * SUM.canvas.height));
}

//Return the summary row given an y position on the canvas
SUM.canvasToMatrixRow = function(y) {
	return Math.round(y/SUM.heightScale);
} 

SUM.canvasToMatrixCol = function(x) {
	return Math.round(x/SUM.widthScale);
}

//Given a matrix row, return the canvas position
SUM.getCanvasYFromRow = function(row) {
	return (row + SUM.colClassBarHeight);
}

SUM.getCanvasXFromCol = function(col) {
	return (col + SUM.rowClassBarWidth);
}

/**********************************************************************************
 * FUNCTION - resetBoxCanvas: This function resets the summary box canvas.  It takes
 * the canvas, clears it, and draws borders.  It is broken out from drawLeftCanvas
 * box so that the canvas with borders can be used in printing PDFs where only the
 * summary view is selected.
 **********************************************************************************/
SUM.resetBoxCanvas = function() {
	var ctx=SUM.boxCanvas.getContext("2d");
	ctx.clearRect(0, 0, SUM.boxCanvas.width, SUM.boxCanvas.height);
	ctx.lineWidth=1;
	ctx.strokeStyle="#000000";
	
	// If no row or column cuts, draw the heat map border in black
	if (MMGR.mapHasGaps() === false){
		ctx.strokeRect(0,0,SUM.boxCanvas.width,SUM.boxCanvas.height);
	}
	
	const heatMap = MMGR.getHeatMap();
	const primaryMap = DVW.primaryMap;
	if (primaryMap) {
	    //If in sub-dendro mode, draw rectangles outside of selected range.
	    //Furthermore, if the average color is dark make those rectangles
	    //lighter than the heatmap, otherwise, darker.
	    if (primaryMap.mode.startsWith('RIBBON')) {
		    const currentDl = heatMap.getCurrentDL();
		    var colorMap = heatMap.getColorMapManager().getColorMap("data",currentDl);
		    var color = colorMap.getColor(SUM.avgValue[currentDl]);
		    if (colorMap.isColorDark(color)) {
			    ctx.fillStyle="rgba(10, 10, 10, 0.25)"; 
		    } else {
			    ctx.fillStyle="rgba(255, 255, 255, 0.25)"; 
		    }
	    }

	    //Draw sub-dendro box
	    if (primaryMap.mode.startsWith('RIBBONH') && (primaryMap.selectedStart > 0)) {
		    var summaryRatio = heatMap.getColSummaryRatio(MAPREP.SUMMARY_LEVEL);
		    var adjustedStart = primaryMap.selectedStart*SUM.widthScale / summaryRatio;
		    var adjustedStop = primaryMap.selectedStop*SUM.widthScale / summaryRatio;
		    let boxX = 0;
		    let boxY = 0;
		    let boxW = (((adjustedStart - SUM.widthScale) / SUM.canvas.width) * SUM.boxCanvas.width);
		    let boxH = SUM.boxCanvas.height-boxY;
		    ctx.fillRect(boxX,boxY,boxW,boxH); 
		    boxX = ((adjustedStop / SUM.canvas.width) * SUM.boxCanvas.width);
		    boxW = (((SUM.canvas.width-adjustedStop)+1*SUM.widthScale) / SUM.canvas.width) * SUM.boxCanvas.width;
		    ctx.fillRect(boxX,boxY,boxW,boxH); 
	    } else if (primaryMap.mode.startsWith('RIBBONV')  && primaryMap.selectedStart > 0) {
		    var summaryRatio = heatMap.getRowSummaryRatio(MAPREP.SUMMARY_LEVEL);
		    var adjustedStart = primaryMap.selectedStart*SUM.heightScale / summaryRatio;
		    var adjustedStop = primaryMap.selectedStop*SUM.heightScale / summaryRatio;
		    let boxX = 0;
		    let boxY = 0;
		    let boxW = SUM.boxCanvas.width-boxX;
		    let boxH = (((adjustedStart-SUM.heightScale) / SUM.canvas.height) * SUM.boxCanvas.height);
		    ctx.fillRect(boxX,boxY,boxW,boxH); 
		    boxY = ((adjustedStop/SUM.canvas.height) * SUM.boxCanvas.height);
		    boxH = (((SUM.canvas.height-adjustedStop)+1*SUM.heightScale) / SUM.canvas.height) * SUM.boxCanvas.height;
		    ctx.fillRect(boxX,boxY,boxW,boxH); 
	    }
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
SUM.drawLeftCanvasBox = function() {
        // Cannot draw canvas box if no summary panel.
        if (!SUM.chmElement) return;
	// Reset the canvas (drawing borders and sub-dendro selections)
	const ctx = SUM.resetBoxCanvas(SUM.boxCanvas);
	DVW.detailMaps.forEach(mapItem => {
		// Draw the View Box using user-defined defined selection color 
		const boxX = ((((DVW.getCurrentSumCol(mapItem)-1) * SUM.widthScale) / SUM.canvas.width) * SUM.boxCanvas.width);
		const boxY = ((((DVW.getCurrentSumRow(mapItem)-1) * SUM.heightScale) / SUM.canvas.height) * SUM.boxCanvas.height);
		const boxW = (DVW.getCurrentSumDataPerRow(mapItem)*SUM.widthScale / SUM.canvas.width) * SUM.boxCanvas.width - 2;
		const boxH = (DVW.getCurrentSumDataPerCol(mapItem)*SUM.heightScale / SUM.canvas.height) * SUM.boxCanvas.height - 2;
		const heatMap = MMGR.getHeatMap();
		const dataLayers = heatMap.getDataLayers();
		const dataLayer = dataLayers[mapItem.currentDl];
		ctx.strokeStyle=dataLayer.selection_color;
		ctx.strokeStyle=dataLayer.selection_color;
		if (mapItem.version === 'P') {
			ctx.lineWidth=4;
		} else {
			ctx.lineWidth=2;
		}
		ctx.strokeRect(boxX,boxY,boxW,boxH);
	});
};

//=====================//
// 	CLASSBAR FUNCTIONS //
//=====================//

SUM.getScaledHeight = function(height, axis) {
	var scaledHeight;
	if (axis === "row") {
		scaledHeight = Math.max(height, 1 + SUM.rowClassPadding);
	} else {
		scaledHeight = Math.max(height, 1 + SUM.colClassPadding);
	}
	return scaledHeight;
}

SUM.drawColorPlotColClassBar = function(dataBuffer, pos, height, classBarValues, classBarLength, colorMap) {
	var line = new Uint8Array(new ArrayBuffer(classBarLength * DRAW.BYTE_PER_RGBA * SUM.widthScale)); // save a copy of the class bar
	var loc = 0;
	for (var k = 0; k < classBarLength; k++) { 
		var val = classBarValues[k];
		var color = colorMap.getClassificationColor(val);
		if (val == "null") {
			color = colorMap.getHexToRgba(colorMap.getMissingColor());
		}
		for (var i = 0; i < SUM.widthScale; i++){
			line[loc] = color['r'];
			line[loc + 1] = color['g'];
			line[loc + 2] = color['b'];
			line[loc + 3] = color['a'];
			loc += DRAW.BYTE_PER_RGBA;
		}
	}
	for (var j = 0; j < (height-SUM.colClassPadding)*SUM.widthScale; j++){ // draw the class bar into the dataBuffer  ***not 100% sure why the widthscale is used as a factor here, but it works...
		for (var k = 0; k < line.length; k++) { 
			dataBuffer[pos] = line[k];
			pos++;
		}
	}
	return pos;
}

SUM.drawScatterBarPlotColClassBar = function(dataBuffer, pos, height, classBarValues, classBarLength, colorMap, currentClassBar) {
	var barFgColor = colorMap.getHexToRgba(currentClassBar.fg_color);
	var barBgColor = colorMap.getHexToRgba(currentClassBar.bg_color);
	var barCutColor = colorMap.getHexToRgba("#FFFFFF");
	var matrix = SUM.buildScatterBarPlotMatrix(height*SUM.widthScale, classBarValues, 0, classBarLength, currentClassBar, MMGR.getHeatMap().getTotalCols(), true);
	
	for (var h = 0; h < matrix.length; h++) { 
		var row = matrix[h];
		for (var k = 0; k < row.length; k++) { 
			var posVal = row[k];
				for(var i=0;i<SUM.widthScale;i++){
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
					pos+=DRAW.BYTE_PER_RGBA;
				}
		}
	}
	return pos;
}

SUM.drawColClassBarLegend = function(key,currentClassBar,prevHeight,totalHeight, fewClasses) {
	//calculate where covariate bars end and heatmap begins by using the top items canvas (which is lined up with the heatmap)
	var rowCanvas = document.getElementById("summary_row_top_items_canvas");
	var classHgt = SUM.canvas.offsetHeight - rowCanvas.offsetHeight;
	//calculate where the previous bar ends and the current one begins.
	var prevEndPct = prevHeight/totalHeight;
	var currEndPct = (prevHeight+parseInt(currentClassBar.height))/totalHeight;
	//calculate where covariate bars begin and end and use that to calculate the total covariate bars height
	var beginClasses = SUM.canvas.offsetTop-6;
	var endClasses = beginClasses+classHgt-2;
	var classHeight = endClasses-beginClasses;
	//get your horizontal start position (to the right of bars)
	var leftPos = SUM.canvas.offsetLeft + SUM.canvas.offsetWidth;
	var midPos =  topPos+((endPos-topPos)/2);
	//Get your 3 values for the legend.
	var midVal = key;
	//Create div and place mid legend value
	SUM.setLabelDivElement(key+"ColLabel","- "+midVal,midPos,leftPos,false);
}

SUM.removeRowClassBarLabels = function () {
	var classLabels = document.getElementsByClassName("classLabelVertical");
	while (classLabels.length > 0) {
		classLabels[0].parentNode.removeChild(classLabels[0]);
	}
}

SUM.drawRowClassBarLabels = function () {
	const heatMap = MMGR.getHeatMap();
	SUM.removeRowClassBarLabels();
	var colCanvas = document.getElementById("summary_col_top_items_canvas");
	var rowCanvas = document.getElementById("summary_row_top_items_canvas");
	var sumCanvas = document.getElementById("summary_canvas");
	var classBarsConfig = heatMap.getRowClassificationConfig();
	var classBarConfigOrder = heatMap.getRowClassificationOrder();
	var totalHeight = 0;
	var matrixWidth = colCanvas.width;
	//Calc total width of all covariate bars
	for (var i = 0; i < classBarConfigOrder.length; i++) {
		var key = classBarConfigOrder[i];
		var currentClassBar = classBarsConfig[key];
		if (currentClassBar.show === 'Y') {
			totalHeight += parseInt(currentClassBar.height);
		}
	}
	//Set starting horizontal covariate position to the left edge of Summary canvas PLUS the font height of the label text
	var covPos = parseInt(SUM.rCCanvas.offsetLeft) + 10;
	//Set starting vertical covariate position to the bottom edge of Summary canvas PLUS a space factor adjustment
	var topPos = rowCanvas.offsetTop+rowCanvas.offsetHeight+5;
	//Loop thru the class bars retrieving label (truncating where necessary), figuring the percentage of the total width of bars
	//relfected in the current bar, draw label, and set the next position by off-setting the total width*that percentage.
	for (var j = 0; j < classBarConfigOrder.length; j++) {
		var key = classBarConfigOrder[j];
		var currentClassBar = classBarsConfig[key];
		if (currentClassBar.show === 'Y') {
			var covLabel = MMGR.getLabelText(key,'COL', true);
			var covPct = parseInt(currentClassBar.height) / totalHeight;
			//scaled width of current bar
			var barWidth = (SUM.rowClassBarWidth*covPct);
			//half the bar width minus half the font size for centered placement
			var halfBar = (barWidth / 2) - 5;
			SUM.setLabelDivElement(key+"RowLabel",covLabel,topPos,(covPos+halfBar),true);
			//Set position to beginning of next bar
			covPos = covPos + barWidth;
		}
	}
}

SUM.removeColClassBarLabels = function () {
	var classLabels = document.getElementsByClassName("classLabel");
	while (classLabels.length > 0) {
		classLabels[0].parentNode.removeChild(classLabels[0]);
	}
}

SUM.drawColClassBarLabels = function () {
	const heatMap = MMGR.getHeatMap();
	SUM.removeColClassBarLabels();
	var classBarsConfig = heatMap.getColClassificationConfig();
	var classBarConfigOrder = heatMap.getColClassificationOrder();
	var classBarsData = heatMap.getColClassificationData();
	var prevHeight = 0;
	for (var i = 0; i < classBarConfigOrder.length; i++) {
		var key = classBarConfigOrder[i];
		var currentClassBar = classBarsConfig[key];
		if (currentClassBar.show === 'Y') {
			SUM.drawColClassBarLabel(key, currentClassBar,prevHeight);
			prevHeight += parseInt(currentClassBar.height);
		}
	}
}

SUM.drawColClassBarLabel = function(key, currentClassBar, prevHeight) {
	//calculate where covariate bars end and heatmap begins by using the top items canvas (which is lined up with the heatmap)
	var beginClasses = SUM.cCCanvas.offsetTop;
	//get your horizontal start position (to the right of bars)
	var leftPos = SUM.canvas.offsetLeft + SUM.canvas.offsetWidth + 2;
	//find the first, middle, and last vertical positions for the bar legend being drawn
	var topPos =  beginClasses+prevHeight;
	var midPos =  topPos+((currentClassBar.height-15)/2)-1;
	var midVal = MMGR.getLabelText(key,'ROW', true);
	//Create div and place mid legend value
	SUM.setLabelDivElement(key+"ColLabel",midVal,midPos,leftPos,false);
}

SUM.setLabelDivElement = function (itemId,boundVal,topVal,leftVal,isRowVal) {
	//Create div and place high legend value
	var itemElem = document.getElementById(itemId);
	if (itemElem === null) {
		itemElem = document.createElement("Div"); 
		itemElem.id = itemId;
		itemElem.innerHTML = boundVal;
		itemElem.className = "classLabel";
		if (isRowVal) {
			itemElem.style.fontSize = '9pt';
			itemElem.style.fontFamily = 'arial';
			itemElem.style.fontWeight = 'bold';
			itemElem.style.transformOrigin = 'left top';
			itemElem.style.transform = 'rotate(90deg)';
			itemElem.style.webkitTransformOrigin = "left top";
			itemElem.style.webkitTransform = "rotate(90deg)";
		} else {
			itemElem.className = "classLabel";
		}
		SUM.chmElement.appendChild(itemElem);
	}
	itemElem.style.top = topVal + 'px';
	itemElem.style.left = leftVal + 'px';
}

SUM.drawColClassBarLegends = function () {
	const heatMap = MMGR.getHeatMap();
	var classBarsConfig = heatMap.getColClassificationConfig();
	var classBarConfigOrder = heatMap.getColClassificationOrder();
	var classBarsData = heatMap.getColClassificationData();
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
				SUM.drawColClassBarLegend(key, currentClassBar,prevHeight,totalHeight, fewClasses);
			}
			prevHeight += parseInt(currentClassBar.height);
		}
	}
}

// THIS FUNCTION NOT CURRENTLY CALLED BUT MAY BE ADDED BACK IN IN THE FUTURE
SUM.drawColClassBarLegend = function(key,currentClassBar,prevHeight,totalHeight, fewClasses) {
	//calculate where covariate bars end and heatmap begins by using the top items canvas (which is lined up with the heatmap)
	var rowCanvas = document.getElementById("summary_row_top_items_canvas");
	var classHgt = SUM.canvas.offsetHeight - rowCanvas.offsetHeight;
	//calculate where the previous bar ends and the current one begins.
	var prevEndPct = prevHeight/totalHeight;
	var currEndPct = (prevHeight+parseInt(currentClassBar.height))/totalHeight;
	//calculate where covariate bars begin and end and use that to calculate the total covariate bars height
	var beginClasses = SUM.canvas.offsetTop-6;
	var endClasses = beginClasses+classHgt-2;
	var classHeight = endClasses-beginClasses;
	//get your horizontal start position (to the right of bars)
	var leftPos = SUM.canvas.offsetLeft + SUM.canvas.offsetWidth;
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
	SUM.setLegendDivElement(key+"SumHigh-","-",topPos,leftPos,false,true);
	SUM.setLegendDivElement(key+"SumHigh",highVal,topPos+4,leftPos+3,false,true);
	//Create div and place mid legend value
	SUM.setLegendDivElement(key+"SumMid","- "+midVal,midPos,leftPos,false,true);
	//Create div and place low legend value
	SUM.setLegendDivElement(key+"SumLow",lowVal,endPos-3,leftPos+3,false,true);
	SUM.setLegendDivElement(key+"SumLow-","-",endPos,leftPos,false,true);
}



SUM.drawColorPlotRowClassBar = function(dataBuffer, pos, height, classBarValues, classBarLength, colorMap, remainingWidth) {
	for (var j = classBarLength; j > 0; j--){
		var val = classBarValues[j-1];
		var color = colorMap.getClassificationColor(val);
		if (val == "null") {
			color = colorMap.getHexToRgba(colorMap.getMissingColor());
		}
		for (var i = 0; i < SUM.widthScale; i++){
			for (var k = 0; k < (height-SUM.rowClassPadding); k++){
				dataBuffer[pos] = color['r'];
				dataBuffer[pos + 1] = color['g'];  
				dataBuffer[pos + 2] = color['b'];
				dataBuffer[pos + 3] = color['a'];
				pos+=DRAW.BYTE_PER_RGBA;	// 4 bytes per color
			}
			pos+=SUM.rowClassPadding*DRAW.BYTE_PER_RGBA+(remainingWidth*DRAW.BYTE_PER_RGBA);
		}
	}
	return pos;
}

SUM.drawScatterBarPlotRowClassBar = function(dataBuffer, pos, height, classBarValues, classBarLength, colorMap, currentClassBar, remainingWidth) {
	const heatMap = MMGR.getHeatMap();
	var barFgColor = colorMap.getHexToRgba(currentClassBar.fg_color);
	var barBgColor = colorMap.getHexToRgba(currentClassBar.bg_color); 
	var barCutColor = colorMap.getHexToRgba("#FFFFFF");
	var matrix = SUM.buildScatterBarPlotMatrix( height, classBarValues, 0, classBarLength, currentClassBar, heatMap.getTotalRows(), true);
	for (var h = (matrix[0].length-1); h >= 0 ; h--) { 
		for (var a=0; a<SUM.heightScale;a++){
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
				pos+=DRAW.BYTE_PER_RGBA;
			}
			// go total width of the summary canvas and back up the width of a single class bar to return to starting point for next row 
			pos+=SUM.rowClassPadding*DRAW.BYTE_PER_RGBA+(remainingWidth*DRAW.BYTE_PER_RGBA);
		}
	}
	return pos;
}

//THIS FUNCTION NOT CURRENTLY FOR THE SUMMARY PANEL CALLED BUT MAY BE ADDED BACK IN IN THE FUTURE
SUM.drawRowClassBarLegends = function () {
	const heatMap = MMGR.getHeatMap();
	var classBarsConfig = heatMap.getRowClassificationConfig();
	var classBarConfigOrder = heatMap.getRowClassificationOrder();
	var classBarsData = heatMap.getRowClassificationData();
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
				SUM.drawRowClassBarLegend(key,currentClassBar,prevHeight,totalHeight,i);
			}
			prevHeight += parseInt(currentClassBar.height);
		}
	}
}

SUM.drawRowClassBarLegend = function(key,currentClassBar,prevHeight,totalHeight,i) {
	var colCanvas = document.getElementById("summary_col_top_items_canvas");
	var classHgt = colCanvas.offsetLeft - SUM.canvas.offsetLeft;
	var prevEndPct = prevHeight/totalHeight;
	var currEndPct = (prevHeight+parseInt(currentClassBar.height))/totalHeight;
	var beginClasses = SUM.canvas.offsetLeft - 6;
	var endClasses = beginClasses+classHgt-2;
	var classesHeight = endClasses-beginClasses;
	var beginPos =  beginClasses+(classesHeight*prevEndPct)+(SUM.rowClassPadding*(i+1));
	var endPos =  beginClasses+(classesHeight*currEndPct)-SUM.rowClassPadding;
	var midPos =  beginPos+((endPos-beginPos)/2);
	var highVal = parseFloat(currentClassBar.high_bound);
	var lowVal = parseFloat(currentClassBar.low_bound);
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
	SUM.setLegendDivElement(key+"SumHigh","-"+lowVal,topPos,beginPos,true);
	//Create div and place middle legend value
	SUM.setLegendDivElement(key+"SumMid","-"+midVal,topPos,midPos,true);
	//Create div and place middle legend value
	SUM.setLegendDivElement(key+"SumLow","-"+highVal,topPos,endPos,true);
}

SUM.setLegendDivElement = function (itemId,boundVal,topVal,leftVal,isRowVal) {
	//Create div and place high legend value
	var itemElem = document.getElementById(itemId);
	if (itemElem === null) {
		itemElem = document.createElement("Div"); 
		itemElem.id = itemId;
		itemElem.innerHTML = boundVal;
		itemElem.className = "classLegend";
		if (isRowVal) {
			itemElem.style.transform = "rotate(90deg)";
		}
		SUM.chmElement.appendChild(itemElem);
	}
	itemElem.style.top = topVal + 'px';
	itemElem.style.left = leftVal + 'px';
}

SUM.buildScatterBarPlotMatrix = function(height, classBarValues, start, classBarLength, currentClassBar, barSize, isSummary) {
	var matrix = new Array(height);
	var isBarPlot = currentClassBar.bar_type === 'scatter_plot' ? false : true;
	for (var j = 0; j < height; j++) {
		matrix[j] = new Uint8Array(classBarLength);
	}
	var highVal = parseFloat(currentClassBar.high_bound);
	var lowVal = parseFloat(currentClassBar.low_bound);
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

//Return the scaled heights of all covariate bars on the specified axis.
//Hidden bars will have height zero.  The order of entries is fixed but
//not specified.
SUM.getSummaryCovariateBarHeights = function (axis) {
	return MMGR.getHeatMap().getCovariateBarHeights(axis)
	.map(h => h === 0 ? 0 : SUM.getScaledHeight(h,axis));
}

//Return the total scaled heights of all covariate bars on the specified axis.
SUM.calculateSummaryTotalClassBarHeight = function(axis) {
	return SUM.getSummaryCovariateBarHeights(axis)
	.reduce((t,h) => t+h, 0);
}

// Return true iff the Summary View is visible (i.e. contained in a visible pane).
SUM.isVisible = function isVisible () {
	if (SUM.chmElement === null) return false;
	const loc = PANE.findPaneLocation (SUM.chmElement);
	if (loc.pane.style.display === 'none') return false;
	return !loc.pane.classList.contains('collapsed');
};

//***************************//
//Selection Label Functions *//
//***************************//

SUM.summaryResize = function() {
	var embedDiv = document.getElementById("NGCHMEmbed");
	if ((embedDiv !== null) && (embedDiv.style.display === 'none')) {
		return;
	}
	if (SUM.chmElement) {
		const loc = PANE.findPaneLocation (SUM.chmElement);
		SUM.summaryPaneResizeHandler (loc);
	}
};

// Redraw the summary pane.  Prerequisite: summary pane layout is valid.
// To make resizing smoother, we break drawing into two phases.
// In phase 1, we draw enough to give the user reasonable feedback during resizing, but
// avoid time-consuming operations.
// We also set a timeout to perform the remaining "Phase 2" drawing operations.
// However, for as long as redrawSummaryPane is called again before that timeout fires,
// we postpone phase 2 drawing so that it is only performed during a lull in updates.
(function() {
	var T = 0;
	var XT = 0;

	SUM.redrawSummaryPane = function redrawSummaryPane () {
		const debug = false;
		if (debug) console.log({ m: 'redrawSummaryPane', rowDendro: SUM.rowDendro, colDendro: SUM.colDendro });
		if (SUM.chmElement && T === 0) {
			if (XT !== 0) {
				window.clearTimeout (XT);
				XT = 0;
			}
			T = window.requestAnimationFrame (() => {
				T = 0;
				if (SUM.rowDendro) SUM.rowDendro.draw();
				if (SUM.colDendro) SUM.colDendro.draw();
				SUM.clearSelectionMarks();
				SUM.clearTopItems();
				if(document.getElementById("missingSumRowClassBars")) DVW.removeLabels("missingSumRowClassBars");
				if(document.getElementById("missingSumColClassBars")) DVW.removeLabels("missingSumColClassBars");
				XT = window.setTimeout (() => {
					XT = 0;
					SUM.buildRowClassTexture ();
					SUM.buildColClassTexture ();
					if (debug) {
						console.log ('Drawing summary heatmap:');
						console.log ({ layout: SUM.layout,
								top: SUM.canvas.style.top,
								left: SUM.canvas.style.left,
								height: SUM.canvas.style.height,
								width: SUM.canvas.style.width });
					}
					SUM.buildSummaryTexture(SUM.canvas)
					SUM.drawLeftCanvasBox();
					SUM.setSelectionDivSize();
					SUM.drawSelectionMarks();
					SUM.drawMissingRowClassBarsMark();
					SUM.drawMissingColClassBarsMark();
					SUM.drawTopItems();
					if (SUM.flagDrawClassBarLabels) {
						SUM.drawColClassBarLabels();
						SUM.drawRowClassBarLabels();
					}
			//		SUM.drawColClassBarLegends(); Removed for the time being
			//		SUM.drawRowClassBarLegends();
				}, 48);
			});
		}
	};
})();

SUM.initSummarySize = function() {
	SUM.setTopItemsSize();
	SUM.calcSummaryLayout ();
}

// Calculate the summary NGCHM's layout based on the newly adjusted size of its enclosing pane.
SUM.calcSummaryLayout = function() {
	const debug = false;

	if (SUM.chmElement && SUM.canvas) {

		SUM.setTopItemsSize();

		const selectCanvasSize = 10;
		//Leave room for labels in GUI Builder "summary only" screens
		let colLabelTopItemsHeight = SUM.flagDrawClassBarLabels === true ? 70 : 0;
		let rowLabelTopItemsWidth = SUM.flagDrawClassBarLabels === true ? 110 : 0;
		//Check to see if top items is longer than labels (if labels are drawn)
		colLabelTopItemsHeight = colLabelTopItemsHeight < SUM.colTopItemsWidth ? SUM.colTopItemsWidth : colLabelTopItemsHeight;
		rowLabelTopItemsWidth = rowLabelTopItemsWidth < SUM.rowTopItemsHeight ? SUM.rowTopItemsHeight : rowLabelTopItemsWidth;

		const layout = {
			borderThickness: 1,
			marginThickness: 1,
			colTopItems: { top: 0, left: 0, height: selectCanvasSize + colLabelTopItemsHeight, width: 0 },
			rowTopItems: { top: 0, left: 0, height: 0, width: selectCanvasSize + rowLabelTopItemsWidth },
			colSelection: { top: 0, left: 0, height: selectCanvasSize, width: 0 },
			rowSelection: { top: 0, left: 0, height: 0, width: selectCanvasSize },
			colDendro: { top: 0, left: 0, height: 0, width: 0 },
			rowDendro: { top: 0, left: 0, height: 0, width: 0 },
			colClassBars: { top: 0, left: 0, height: 0, width: 0 },
			rowClassBars: { top: 0, left: 0, height: 0, width: 0 },
			matrix: { top: 0, left: 0, height: 0, width: 0 }
		};
		SUM.layout = layout;

		// Y-axis: (topItems + margin) + colSelections + mapBorder + map + mapBorder + (margin + colClassBars) + (margin + colDendrogram)
		let ydecor = layout.colSelection.height + 2 * layout.borderThickness;
		if (layout.colTopItems.height > 0) { ydecor += layout.colTopItems.height + layout.marginThickness; }
		if (SUM.colClassBarHeight > 0) { ydecor += layout.marginThickness; }
		const hFrac = SUM.colDendro ? SUM.colDendro.getConfigSize() : 0;
		if (hFrac > 0) { ydecor += layout.marginThickness; }
		//const ytotal = Math.floor (SUM.chmElement.clientHeight * SUM.heightPct) - 35;
		const ytotal = Math.floor (SUM.chmElement.clientHeight) - 1;
		let ccBarHeight = SUM.colClassBarHeight;
		const yScale = Math.min(1.0, (ytotal/2 - ydecor) / (ccBarHeight + ytotal/2*hFrac));
		// console.log ({ ydecor, ccBarHeight, hFrac, ytotal, yScale });

		layout.colClassBars.height = Math.floor(yScale * SUM.colClassBarHeight);
		layout.colDendro.height = Math.floor((ytotal - ydecor - layout.colClassBars.height) * (hFrac/(1+hFrac)) * yScale);
		layout.matrix.height = Math.floor(ytotal - ydecor - layout.colClassBars.height - layout.colDendro.height);
		//console.log ({ ytotal, ydecor, colClassBarsHeight: layout.colClassBars.height, colDendroHeight: layout.colDendro.height, matrixHeight: layout.matrix.height });

		// X-axis: (rowDendrogram + margin) + (rowClassBars + margin) + mapBorder + map + mapBorder + rowSelections + (margin + rowTopItems)
		let xdecor = layout.rowSelection.width + 2 * layout.borderThickness;
		if (layout.rowTopItems.width > 0) { xdecor += layout.rowTopItems.width + layout.marginThickness; }
		if (SUM.rowClassBarWidth > 0) { xdecor += layout.marginThickness; }
		const wFrac = SUM.rowDendro ? SUM.rowDendro.getConfigSize() : 0;
		if (wFrac > 0) { xdecor += layout.marginThickness; }
		const xtotal = SUM.chmElement.clientWidth; // * SUM.widthPct;
		let rcBarWidth = SUM.rowClassBarWidth;
		const xScale = Math.min(1.0, (xtotal/2 - xdecor) / (rcBarWidth + xtotal/2*wFrac));
		//console.log ({ xdecor, rcBarWidth, wFrac, xtotal, xScale });

		layout.colClassBars.top = layout.colDendro.height > 0 ? layout.colDendro.height + layout.marginThickness : 0;
		layout.matrix.top = layout.colClassBars.top + (layout.colClassBars.height > 0 ? layout.colClassBars.height + layout.marginThickness : 0) + layout.borderThickness;
		layout.colSelection.top = layout.matrix.top + layout.matrix.height + layout.borderThickness;

		layout.rowClassBars.width = Math.floor(xScale * SUM.rowClassBarWidth);
		layout.rowDendro.width = Math.floor((xtotal - xdecor - layout.rowClassBars.width) * (wFrac/(1+wFrac)) * xScale);
		layout.matrix.width = Math.floor(xtotal - xdecor - layout.rowClassBars.width - layout.rowDendro.width);

		layout.rowClassBars.left = layout.rowDendro.width > 0 ? layout.rowDendro.width + layout.marginThickness : 0;
		layout.matrix.left = layout.rowClassBars.left + (layout.rowClassBars.width > 0 ? layout.rowClassBars.width + layout.marginThickness : 0) + layout.borderThickness;
		layout.rowSelection.left = layout.matrix.left + layout.matrix.width + layout.borderThickness;

		layout.colDendro.width = layout.matrix.width; layout.colDendro.left = layout.matrix.left;
		layout.colTopItems.width = layout.matrix.width; layout.colTopItems.left = layout.matrix.left;
		layout.colSelection.width = layout.matrix.width; layout.colSelection.left = layout.matrix.left;
		layout.colClassBars.width = layout.matrix.width; layout.colClassBars.left = layout.matrix.left;

		layout.rowDendro.height = layout.matrix.height; layout.rowDendro.top = layout.matrix.top;
		layout.rowTopItems.height = layout.matrix.height; layout.rowTopItems.top = layout.matrix.top;
		layout.rowSelection.height = layout.matrix.height; layout.rowSelection.top = layout.matrix.top;
		layout.rowClassBars.height = layout.matrix.height; layout.rowClassBars.top = layout.matrix.top;

		layout.colTopItems.top = layout.colSelection.top;
		layout.rowTopItems.left = layout.rowSelection.left;

		if (debug) console.log(layout);

		UTIL.setElementPositionSize(SUM.rCCanvas, layout.rowClassBars, true);
		UTIL.setElementPositionSize(SUM.cCCanvas, layout.colClassBars, true);
		SUM.setSelectionDivSize(layout);

		if (SUM.rowDendro) UTIL.setElementPositionSize(SUM.rowDendro.dendroCanvas, layout.rowDendro);
		if (SUM.colDendro) UTIL.setElementPositionSize(SUM.colDendro.dendroCanvas, layout.colDendro);
		UTIL.setElementPositionSize(SUM.canvas, layout.matrix, true);
		UTIL.setElementPositionSize(SUM.boxCanvas, layout.matrix, false);
	}
};

// Clear and redraw the selection marks on both axes.
SUM.redrawSelectionMarks = function() {
	SUM.clearSelectionMarks();
	SUM.drawSelectionMarks();
};

// Draw the selection marks on both axes.
SUM.drawSelectionMarks = function() {
	SUM.drawAxisSelectionMarks('row');
	SUM.drawAxisSelectionMarks('column');
};

// Draw the selection marks on the specified axis.
SUM.drawAxisSelectionMarks = function(axis) {
	const heatMap = MMGR.getHeatMap();
	const isRow = MMGR.isRow (axis);
	const selection = SRCH.getAxisSearchResults(axis);
	const canvas = document.getElementById (isRow ? "summary_row_select_canvas" : "summary_col_select_canvas");
	if (canvas === null) { return;}
	const limit = isRow ? canvas.height : canvas.width;
	const scale = limit / heatMap.getTotalElementsForAxis(axis);
	const summaryRatio = axis === 'Row' ? heatMap.getSummaryRowRatio() : heatMap.getSummaryColRatio();
	const minSelectionMarkSize = summaryRatio === 1 ? 1 : ((2*summaryRatio)*window.devicePixelRatio);

	const marks = DET.getContigSearchRanges(selection).map(range => {
		let posn = Math.floor (range[0] * scale) - 1;
		let size = Math.ceil ((range[1] - range[0]) * scale) + 1;
		if (size < minSelectionMarkSize) {
			const dposn = Math.floor((minSelectionMarkSize-size)/2);
			const newposn = Math.max(0, posn - dposn);
			size = summaryRatio === 1 ? size : (2*summaryRatio);
			posn = newposn + size <= limit ? newposn : limit - size;
		} 
		return { posn, size };
	});

	const dataLayer = heatMap.getCurrentDataLayer();
	const darkenedColor = UTIL.shadeColor(dataLayer.selection_color, -25);

	const ctx = canvas.getContext('2d');
	ctx.imageSmoothingEnabled = false;
	ctx.fillStyle = darkenedColor;

	if (isRow) {
		marks.forEach(mark => ctx.fillRect(0,mark.posn,canvas.width,mark.size));
	} else {
		marks.forEach(mark => ctx.fillRect(mark.posn,0,mark.size,canvas.height));
	}
};

SUM.drawMissingRowClassBarsMark = function (){
	if (document.getElementById("missingSumRowClassBars")){
		DVW.removeLabels("missingSumRowClassBars");
		var x = SUM.canvas.offsetLeft;
		var y = SUM.canvas.offsetTop + SUM.canvas.clientHeight + 2;
		DET.addLabelDivs(document.getElementById('sumlabelDiv'), "missingSumRowClassBars", "ClassBar MarkLabel", "...", "...", x, y, 10, "T", null,"Row");
	}
}

SUM.drawMissingColClassBarsMark = function (){
	if (document.getElementById("missingSumColClassBars")){
		DVW.removeLabels("missingSumColClassBars");
		var x = SUM.canvas.offsetLeft + SUM.canvas.offsetWidth + 2;
		var y = SUM.canvas.offsetTop + SUM.canvas.clientHeight/SUM.totalHeight - 10;
		DET.addLabelDivs(document.getElementById('sumlabelDiv'), "missingSumColClassBars", "ClassBar MarkLabel", "...", "...", x, y, 10, "F", null,"Col");
	}
}

SUM.clearSelectionMarks = function(searchTarget){
	if (typeof searchTarget !== 'undefined') {
		if (searchTarget === "Row") {
			SUM.clearRowSelectionMarks();
		} else if (searchTarget === "Column") {
			SUM.clearColSelectionMarks();
		} else {
			SUM.clearRowSelectionMarks();
			SUM.clearColSelectionMarks();
		}	
	} else {
		SUM.clearRowSelectionMarks();
		SUM.clearColSelectionMarks();
	}
}

SUM.clearAxisSelectionMarks = function (axis) {
	if (MMGR.isRow(axis)) SUM.clearRowSelectionMarks(); else SUM.clearColSelectionMarks();
};

SUM.clearRowSelectionMarks = function() {
	var rowSel = document.getElementById("summary_row_select_canvas");
	if (rowSel) {
		var rowCtx = rowSel.getContext('2d');
		rowCtx.clearRect(0,0,rowSel.width,rowSel.height);
	}
}

SUM.clearColSelectionMarks = function() {
	var colSel = document.getElementById("summary_col_select_canvas");
	if (colSel) {
		var colCtx = colSel.getContext('2d');
		colCtx.clearRect(0,0,colSel.width,colSel.height);
	}
}

SUM.clearTopItems = function(){
	var oldMarks = document.getElementsByClassName("topItems");
	while (oldMarks.length > 0) {
		oldMarks[0].remove();
	}
	var colSel = document.getElementById("summary_col_top_items_canvas");
	if (colSel) {
		var colCtx = colSel.getContext('2d');
		colCtx.clearRect(0,0,colSel.width,colSel.height);
	}
	var rowSel = document.getElementById("summary_row_top_items_canvas");
	if (rowSel) {
		var rowCtx = rowSel.getContext('2d');
		rowCtx.clearRect(0,0,rowSel.width,rowSel.height);
	}
}

SUM.drawTopItems = function(){
        // Cannot draw top items if no summary panel.
        if (!SUM.chmElement) return;
	SUM.clearTopItems();
	var summaryCanvas = document.getElementById("summary_canvas");
	var colCanvas = document.getElementById("summary_col_top_items_canvas");
	var rowCanvas = document.getElementById("summary_row_top_items_canvas");
	if (summaryCanvas == null || rowCanvas == null || colCanvas == null) {
		return;
	}
	const heatMap = MMGR.getHeatMap();
	var colTopItemsIndex = [];
	var rowTopItemsIndex = [];
	var colCtx = colCanvas.getContext("2d");
	var rowCtx = rowCanvas.getContext("2d");
	colCtx.clearRect(0,0,colCanvas.width,colCanvas.height);
	rowCtx.clearRect(0,0,rowCanvas.width,rowCanvas.height);
	var colLabels = heatMap.getColLabels()["labels"];
	var rowLabels = heatMap.getRowLabels()["labels"];
	var colTop = summaryCanvas.offsetTop + summaryCanvas.offsetHeight + colCanvas.offsetHeight;
	var rowLeft = summaryCanvas.offsetLeft + summaryCanvas.offsetWidth + rowCanvas.offsetWidth;
	
	var matrixW = SUM.matrixWidth;
	var matrixH = SUM.matrixHeight;
	var colSumRatio = heatMap.getColSummaryRatio(MAPREP.SUMMARY_LEVEL);
	var rowSumRatio = heatMap.getRowSummaryRatio(MAPREP.SUMMARY_LEVEL);
	
	var referenceItem = document.createElement("Div"); // create a reference top item div to space the elements properly. removed at end
	referenceItem.className = "topItems";
	referenceItem.innerHTML = "SampleItem";
	SUM.chmElement.appendChild(referenceItem);
	
	// draw the column top items
	if (SUM.colTopItems){
		for (var i = 0; i < SUM.colTopItems.length; i++){ // find the indices for each item to draw them later.
			var topItem = SUM.colTopItems[i].trim();
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
		SUM.colTopItemsIndex = colTopItemsIndex;
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
	if (SUM.rowTopItems){
		for (var i = 0; i < SUM.rowTopItems.length; i++){ // find indices
			var foundLabel = false;
			var topItem = SUM.rowTopItems[i].trim();
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
		SUM.rowTopItemsIndex = rowTopItemsIndex;
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
	 if (canvasSize === 0 || itemSize === 0) { return;}
    	
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
		item.innerHTML = MMGR.getLabelText(labels[topItemIndex[index]].split("|")[0],axis);
		if (!isRow){
			item.style.transform = "rotate(90deg)";
		}
		SUM.chmElement.appendChild(item);
		item.style.top = (isRow ? rowCanvas.offsetTop + positionArray[topItemIndex[index]]*rowCanvas.clientHeight - item.offsetHeight/2 : colTop + item.offsetWidth/2) + 'px';
		item.style.left = (isRow ? rowLeft: colCanvas.offsetLeft+ positionArray[topItemIndex[index]]*colCanvas.clientWidth - item.offsetWidth/2) + 'px';
		return item;
	}
}

SUM.onMouseUpSelRowCanvas = function(evt) {
	evt.preventDefault();
	evt.stopPropagation();	
	//When doing a shift drag, this block will actually do the selection on mouse up.
	var sumOffsetX = evt.touches ? evt.layerX : evt.offsetX;
	var sumOffsetY = evt.touches ? evt.layerY : evt.offsetY;
	var xPos = SUM.getCanvasX(sumOffsetX);
	var yPos = SUM.getCanvasY(sumOffsetY);
	var sumRow = SUM.canvasToMatrixRow(yPos) - Math.floor(DVW.getCurrentSumDataPerCol(DVW.primaryMap)/2);
	DVW.setCurrentRowFromSum(DVW.primaryMap, sumRow);
	DVW.primaryMap.updateSelection();
	SUM.clickStartRow = null;
	SUM.clickStartCol = null;
	//Make sure the selected row/column are within the bounds of the matrix.
	DVW.checkRow(DVW.primaryMap);
	DVW.checkCol(DVW.primaryMap);
	SUM.mouseEventActive = false;
}

SUM.onMouseUpSelColCanvas = function(evt) {
	evt.preventDefault();
	evt.stopPropagation();	
	//When doing a shift drag, this block will actually do the selection on mouse up.
	var sumOffsetX = evt.touches ? evt.layerX : evt.offsetX;
	var sumOffsetY = evt.touches ? evt.layerY : evt.offsetY;
	var xPos = SUM.getCanvasX(sumOffsetX);
	var yPos = SUM.getCanvasY(sumOffsetY);
	var sumCol = SUM.canvasToMatrixCol(xPos) - Math.floor(DVW.getCurrentSumDataPerRow(DVW.primaryMap)/2);
	DVW.setCurrentColFromSum(DVW.primaryMap, sumCol);
	DVW.primaryMap.updateSelection();
	SUM.clickStartRow = null;
	SUM.clickStartCol = null;
	//Make sure the selected row/column are within the bounds of the matrix.
	DVW.checkRow(DVW.primaryMap);
	DVW.checkCol(DVW.primaryMap);
	SUM.mouseEventActive = false;
}

SUM.getTouchEventOffset = function (evt) {
	var x, y;
	if (evt.touches.length > 0){
		var rect = evt.target.getBoundingClientRect();
		x = sumOffsetX = Math.round(evt.targetTouches[0].pageX - rect.left);
		y = sumOffsetY = Math.round(evt.targetTouches[0].pageY - rect.top);
	} else {
		var rect = evt.target.getBoundingClientRect();
		x = sumOffsetX = Math.round(evt.changedTouches[0].pageX - rect.left);
		y = sumOffsetY = Math.round(evt.changedTouches[0].pageY - rect.top);
	}
	return {"offsetX": x, "offsetY": y}
};

    /**********************************************************************************
     * FUNCTION - redrawCanvases: The purpose of this function is to redraw the various
     * wegGl canvases in the viewer. It is called to deal with blurring issues occuring
     * on the canvases when modal panels are drawn over the viewer canvases.
     **********************************************************************************/
    SUM.redrawCanvases = function () {
	if ((UTIL.getBrowserType() !== "Firefox") && (MMGR.getHeatMap() !== null)) {
	    SUM.drawHeatMap();
	    DET.setDrawDetailsTimeout (DET.redrawSelectionTimeout);
	    if (SUM.rCCanvas && SUM.rCCanvas.width > 0) {
		SUM.drawRowClassBars();
	    }
	    if (SUM.cCCanvas && SUM.cCCanvas.height > 0) {
		SUM.drawColClassBars();
	    }
	}
    };

(function() {
	// Define a function to switch a panel to the summary view.
	SUM.switchPaneToSummary = switchPaneToSummary;
	PANE.registerPaneContentOption ('Summary heatmap', switchPaneToSummary);
	SUM.summaryPaneResizeHandler = resizeSummaryPane;

	// There is a single summary view that, at any particular time,
	// may or may not be displayed in a visible pane.
	// If a pane showing the summary view is switched to something else,
	// we remove the summary view elements but preserve them in DIV#templates.
	// These elements are then copied back into the DOM when switchPaneToSummary is called.

	// SUM.chmElement is set to a DOM element iff the summary NG-CHM is
	// contained in a visible pane.  If SUM.chmElement == null, the summary
	// NG-CHM is not visible.

	function switchPaneToSummary (loc) {
		PANE.clearExistingGearDialog(loc.pane.id);
		if (SUM.chmElement) {
			// The summary NGCHM is currently showing in a pane.
			// Proceed only if the current and target panes are different.
			const oldLoc = PANE.findPaneLocation (SUM.chmElement);
			if (oldLoc.pane === loc.pane) return;
			// Remove the summary NGCHM from its current pane
			PANE.emptyPaneLocation (oldLoc);
		}
		PANE.emptyPaneLocation (loc);
		initializeSummaryPanel(loc.pane);
		PANE.setPaneTitle (loc, 'Heat Map Summary');
		PANE.registerPaneEventHandler (loc.pane, 'empty', emptySummaryPane);
		PANE.registerPaneEventHandler (loc.pane, 'resize', resizeSummaryPane);
	}

	// Initialize summary information required for drawing summary views.
	//
	function initializeSummaryPanel (pane) {
		if (SUM.chmElement !== null) {
			// Execute at most once.
			return;
		}

		SUM.chmElement = document.getElementById('summary_chm');
		pane.appendChild (SUM.chmElement);
		SUM.chmElement.style.display = '';
		SUM.initSummaryDisplay();

		//Resize summary area for small or skewed maps.
		SUM.canvas.width =  SUM.totalWidth;
		SUM.canvas.height = SUM.totalHeight;
		SUM.boxCanvas.width =  SUM.totalWidth;
		SUM.boxCanvas.height = SUM.totalHeight;
		SUM.rCCanvas.height = SUM.totalHeight;
		SUM.cCCanvas.width =  SUM.totalWidth;

		SUM.redrawSummaryPanel ();
	};

	// This function is called when a pane showing the summary NG-CHM is emptied.
	// Save SUM.chmElement in templates and clear it.
	function emptySummaryPane (pane, elements) {
		document.getElementById ('templates').appendChild (SUM.chmElement);
		SUM.chmElement = null;
	}

	// This function is called when a pane showing the summary NG-CHM is resized.
	// Calculate a new layout and redraw the pane's contents.
	function resizeSummaryPane (loc) {
		if (document.getElementById('summary_chm') == null) {return;}
		SUM.calcSummaryLayout();
		SUM.redrawSummaryPane ();
	}
})();

})();
