//Define Namespace for NgChm SummaryHeatMapDisplay
NgChm.createNS('NgChm.SUM');

NgChm.SUM.BYTE_PER_RGBA = 4;

// Flags.
NgChm.SUM.flagDrawClassBarLabels = false; // Labels are only drawn in NGCHM_GUI_Builder

//WebGl Canvas, Context, and Pixel Arrays
NgChm.SUM.chmElement = null; // div containing summary heatmap
NgChm.SUM.canvas = null; //Primary Heat Map Canvas
NgChm.SUM.rCCanvas = null; //Row Class Bar Canvas
NgChm.SUM.cCCanvas = null;  //Column Class Bar Canvas
NgChm.SUM.boxCanvas = null;  //Secondary Heat Map Selection Box Canvas
NgChm.SUM.gl = null; // WebGL Heat Map context
NgChm.SUM.rcGl = null; // WebGL Row Class Bar context
NgChm.SUM.ccGl = null; // WebGL Column Class Bar context
NgChm.SUM.summaryHeatMapCache = {};	// Cached summary heat maps for each layer
NgChm.SUM.summaryHeatMapValidator = {};	// Determines if the summary heat map for a layer needs to be rendered again
NgChm.SUM.texRc = null;
NgChm.SUM.texCc = null;
NgChm.SUM.texHmProgram = null;
NgChm.SUM.texRcProgram = null;
NgChm.SUM.texCcProgram = null;

//Size of heat map components
NgChm.SUM.heightPct = .96; // this is the amount of vertical space the col dendro and the map should take up on the summary chm div (taken from the css)
NgChm.SUM.widthPct = .90; // this is the amount of horizontal space the row dendro and the map should take up on the summary chm div (taken from the css)
NgChm.SUM.paddingHeight = 2;

NgChm.SUM.colDendro = null;
NgChm.SUM.rowDendro = null;
NgChm.SUM.colTopItems = null;
NgChm.SUM.rowTopItems = null;
NgChm.SUM.colTopItemsIndex = null;
NgChm.SUM.rowTopItemsIndex = null;
NgChm.SUM.colTopItemsWidth = 0;
NgChm.SUM.rowTopItemsHeight = 0;

NgChm.SUM.rowClassPadding = 2;          // space between classification bars
NgChm.SUM.colClassPadding = 2;          // space between classification bars
NgChm.SUM.rowClassBarWidth = null;
NgChm.SUM.colClassBarHeight = null;
NgChm.SUM.rowClassScale = 1;
NgChm.SUM.colClassScale = 1;
NgChm.SUM.matrixWidth = null;
NgChm.SUM.matrixHeight = null;
NgChm.SUM.totalHeight = null;
NgChm.SUM.totalWidth = null;
NgChm.SUM.minDimensionSize = 100; // minimum size the data matrix canvas can be
NgChm.SUM.widthScale = 1; // scalar used to stretch small maps (less than 250) to be proper size
NgChm.SUM.heightScale = 1;

NgChm.SUM.maxValues = 2147483647;
NgChm.SUM.minValues = -2147483647;
NgChm.SUM.avgValue = {};           // Average value for each layer.
NgChm.SUM.eventTimer = 0; // Used to delay draw updates
NgChm.SUM.dragSelect=false;	  // Indicates if user has made a drag selection on the summary panel
NgChm.SUM.clickStartRow=null;   // End row of current selected position
NgChm.SUM.clickStartCol=null;   // Left column of the current selected position
NgChm.SUM.mouseEventActive = false;

//Main function that draws the summary heat map. chmFile is only used in file mode.
NgChm.SUM.initSummaryDisplay = function() {

	NgChm.SUM.canvas = document.getElementById('summary_canvas');
	NgChm.SUM.boxCanvas = document.getElementById('summary_box_canvas');
	NgChm.SUM.rCCanvas = document.getElementById('row_class_canvas');
	NgChm.SUM.cCCanvas = document.getElementById('col_class_canvas');

	//Add necessary event listeners for canvas
	document.getElementById('summary_row_select_canvas').addEventListener("mouseup", NgChm.SUM.onMouseUpSelRowCanvas);
	document.getElementById('summary_row_top_items_canvas').addEventListener("mouseup", NgChm.SUM.onMouseUpSelRowCanvas);
	document.getElementById('summary_col_select_canvas').addEventListener("mouseup", NgChm.SUM.onMouseUpSelColCanvas);
	document.getElementById('summary_col_top_items_canvas').addEventListener("mouseup", NgChm.SUM.onMouseUpSelColCanvas);
	NgChm.SUM.canvas.onmousedown = NgChm.SUM.onMouseDownCanvas;
	NgChm.SUM.canvas.onmouseup = NgChm.SUM.onMouseUpCanvas;
	NgChm.SUM.canvas.onmousemove = NgChm.SUM.onMouseMoveCanvas;
	NgChm.SUM.canvas.onmouseout = NgChm.SUM.onMouseOut;
	NgChm.SUM.canvas.ontouchstart = NgChm.SUM.onMouseDownCanvas;
	NgChm.SUM.canvas.ontouchmove = NgChm.SUM.onMouseMoveCanvas;
	NgChm.SUM.canvas.ontouchend = NgChm.SUM.onMouseUpCanvas;

	NgChm.SUM.summaryHeatMapCache = {};
	NgChm.SUM.widthScale = 1;
	NgChm.SUM.heightScale = 1;
	NgChm.SUM.colTopItemsWidth = 0;
	NgChm.SUM.rowTopItemsHeight = 0;
};

// Callback that is notified every time there is an update to the heat map
// initialize, new data, etc.  This callback draws the summary heat map.
NgChm.SUM.processSummaryMapUpdate = function(event, tile) {

	if (event == NgChm.MMGR.Event_INITIALIZED) {
		NgChm.heatMap.configureButtonBar();
		NgChm.heatMap.configureFlick();
		NgChm.heatMap.configSearchCovars();

		if (NgChm.MMGR.source !== NgChm.MMGR.LOCAL_SOURCE) {
			document.title = NgChm.heatMap.getMapInformation().name;
		}
		NgChm.SUM.summaryInit();
	} else if (event === NgChm.MMGR.Event_NEWDATA && tile.level === NgChm.MMGR.SUMMARY_LEVEL){
		//Summary tile - wait a bit to see if we get another tile quickly, then draw
		if (NgChm.SUM.eventTimer != 0) {
			//New tile arrived - reset timer
			clearTimeout(NgChm.SUM.eventTimer);
		}
		NgChm.SUM.flushDrawingCache(tile);
		NgChm.SUM.eventTimer = setTimeout(NgChm.SUM.buildSummaryTexture, 200);
	}
	//Ignore updates to other tile types.
}

// Perform all initialization functions for Summary heat map
NgChm.SUM.summaryInit = function() {

	if (NgChm.SUM.chmElement == null) {
		return;
	}
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
	NgChm.SUM.boxCanvas.width =  NgChm.SUM.totalWidth;
	NgChm.SUM.boxCanvas.height = NgChm.SUM.totalHeight;
	NgChm.SUM.rCCanvas.width =  NgChm.SUM.rowClassBarWidth;
	NgChm.SUM.rCCanvas.height = NgChm.SUM.totalHeight;
	NgChm.SUM.cCCanvas.width =  NgChm.SUM.totalWidth;
  
	setTimeout (function() {
		NgChm.SUM.setupHeatMapGl();
		NgChm.SUM.initHeatMapGl();
		NgChm.SUM.calcSummaryLayout();
		NgChm.SUM.buildSummaryTexture();
		if (NgChm.SUM.rCCanvas.width > 0) {
			NgChm.SUM.setupRowClassGl();
			NgChm.SUM.initRowClassGl();
			NgChm.SUM.buildRowClassTexture();
		}
		if (NgChm.SUM.cCCanvas.height > 0) {
			NgChm.SUM.setupColClassGl();
			NgChm.SUM.initColClassGl();
			NgChm.SUM.buildColClassTexture();
		}
		NgChm.SUM.drawLeftCanvasBox();

		NgChm.SUM.setSelectionDivSize();
		NgChm.SUM.clearSelectionMarks();
		NgChm.SUM.drawSelectionMarks();
		NgChm.SUM.drawTopItems();
		NgChm.SUM.rowDendro.draw();
		NgChm.SUM.colDendro.draw();
		if (NgChm.SUM.flagDrawClassBarLabels) {
		 	NgChm.SUM.drawColClassBarLabels();
			NgChm.SUM.drawRowClassBarLabels();
		}
		if(document.getElementById("missingSumRowClassBars")) NgChm.DET.removeLabels("missingSumRowClassBars");
		if(document.getElementById("missingSumColClassBars")) NgChm.DET.removeLabels("missingSumColClassBars");
		NgChm.SUM.drawMissingRowClassBarsMark();
		NgChm.SUM.drawMissingColClassBarsMark();
	 	//NgChm.SUM.drawColClassBarLegends(); Temporarily removed legends from summary
		//NgChm.SUM.drawRowClassBarLegends(); they may or may not come back later
	}, 1);
}

//This function checks to see if the proposed summary width will allow for covariate bars,
//dendrogram, and some portion of the summary map.  If not, the minimum summary size is
//reset to a larger size and the configuration for summary minimum width is updated. The
//mimimum width is also set for the summary chm so that the divider bar cannot be dragged
//further to the left.
NgChm.SUM.setMinimumSummaryWidth = function(minSumWidth) {
	var sumPct = parseInt (NgChm.heatMap.getMapInformation().summary_width);
	if (typeof NgChm.galaxy === "undefined") {
		if (NgChm.SUM.chmElement.offsetWidth == 0) {
			return sumPct;
		}
		while (NgChm.SUM.chmElement.offsetWidth < minSumWidth && sumPct < 90) {
			sumPct = sumPct + 5;
			NgChm.SUM.chmElement.style.width = sumPct + "%";
		}
	}
	if (parseInt(NgChm.heatMap.getMapInformation().summary_width) < sumPct) {
		NgChm.heatMap.setDividerPref(sumPct.toString());
	}
	NgChm.SUM.chmElement.style.minWidth = minSumWidth + 'px';

	return sumPct;
};

NgChm.SUM.setTopItemsSize = function (){
	var colLabels = NgChm.heatMap.getColLabels()["labels"];
	var rowLabels = NgChm.heatMap.getRowLabels()["labels"];
	var colTopItemsIndex = [];
	NgChm.SUM.colTopItemsIndex = colTopItemsIndex;
	var rowTopItemsIndex = [];
	NgChm.SUM.rowTopItemsIndex = rowTopItemsIndex;
	NgChm.SUM.colTopItemsWidth = 0;
	if (NgChm.SUM.colTopItems){
		for (let i = 0; i < NgChm.SUM.colTopItems.length; i++){
			let foundLabel = false;
			let p = document.createElement("p");
			p.innerHTML = NgChm.UTIL.getLabelText(NgChm.SUM.colTopItems[i].split("|")[0],"col");
			p.className = "topItems";
			NgChm.SUM.chmElement.appendChild(p);
			for (let j = 0; j < colLabels.length; j++){
				if (NgChm.SUM.colTopItems[i] == colLabels[j].split("|")[0] && colTopItemsIndex.length < 10){ // limit 10 items per axis
					foundLabel = true;
					colTopItemsIndex.push(j);
				} else if (colTopItemsIndex.length >= 10){
					break;
				}
			}
			if (foundLabel && (p.clientWidth+10) > NgChm.SUM.colTopItemsWidth){
				NgChm.SUM.colTopItemsWidth = p.clientWidth+10; // + 5 to add a margin in case of overlap
			}
			NgChm.SUM.chmElement.removeChild(p);
		}
	}
	NgChm.SUM.rowTopItemsHeight = 0;
	if (NgChm.SUM.rowTopItems){
		for (let i = 0; i < NgChm.SUM.rowTopItems.length; i++){
			let foundLabel = false;
			let p = document.createElement("p");
			p.innerHTML = NgChm.UTIL.getLabelText(NgChm.SUM.rowTopItems[i].split("|")[0],"row");
			p.className = "topItems";
			NgChm.SUM.chmElement.appendChild(p);
			for (let j = 0; j < rowLabels.length; j++){
				if (NgChm.SUM.rowTopItems[i] == rowLabels[j].split("|")[0] && rowTopItemsIndex.length < 10){ // limit 10 items per axis
					foundLabel = true;
					rowTopItemsIndex.push(j);
				} else if (rowTopItemsIndex.length >= 10){
					break;
				}
			}
			if (foundLabel && (p.clientWidth+10) > NgChm.SUM.rowTopItemsHeight){
				NgChm.SUM.rowTopItemsHeight = p.clientWidth+10; // + 5 to add a margin in case of overlap
			}
			NgChm.SUM.chmElement.removeChild(p);
		}
	}
}

//Set the variables for the total size of the summary heat map - used to set canvas, WebGL texture, and viewport size.
NgChm.SUM.calcTotalSize = function() {
	NgChm.SUM.totalHeight = NgChm.SUM.matrixHeight*NgChm.SUM.heightScale;
	NgChm.SUM.totalWidth = NgChm.SUM.matrixWidth*NgChm.SUM.widthScale;
}

NgChm.SUM.setSelectionDivSize = function(width, height){ // input params used for PDF Generator to resize canvas based on PDF sizes
	var colSel = document.getElementById("summary_col_select_canvas");
	var rowSel = document.getElementById("summary_row_select_canvas");
	var colTI = document.getElementById("summary_col_top_items_canvas");
	var rowTI = document.getElementById("summary_row_top_items_canvas");
	//Size and position Column Selections Canvas
	const colSelVP = {
		top: NgChm.SUM.colDendro.getDivHeight() + NgChm.SUM.cCCanvas.clientHeight + NgChm.SUM.canvas.clientHeight,
		width: NgChm.SUM.canvas.clientWidth,
		height: 10
	};
	colSel.style.left = NgChm.SUM.canvas.style.left;
	NgChm.UTIL.setElementPositionSize (colSel, colSelVP, true);
	colSel.width = NgChm.heatMap.getNumColumns("d");
	colSel.height = 10;

	//Size and position Column Top Items Canvas
	colTI.style.left = NgChm.SUM.canvas.style.left;
	NgChm.UTIL.setElementPositionSize (colTI, colSelVP, true);
	colTI.height = 10;

	//Size and position Row Selection Canvas
	const rowSelVP = {
		top: NgChm.SUM.canvas.offsetTop,
		left: NgChm.SUM.canvas.offsetLeft+NgChm.SUM.canvas.offsetWidth,
		width: 10,
		height: NgChm.SUM.canvas.clientHeight
	};
	NgChm.UTIL.setElementPositionSize (rowSel, rowSelVP, true);
	rowSel.width = 10;
	rowSel.height = NgChm.heatMap.getNumRows("d");

	//Size and position Row Top Items Canvas
	NgChm.UTIL.setElementPositionSize (rowTI, rowSelVP, true);
	rowTI.width = 10;
	rowTI.height = height ? height*NgChm.SUM.heightScale*NgChm.SUM.matrixHeight/NgChm.SUM.canvas.height :Math.round(NgChm.SUM.canvas.clientHeight*((NgChm.SUM.canvas.height-NgChm.SUM.calculateSummaryTotalClassBarHeight("col"))/NgChm.SUM.canvas.height));
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

//Configure webGl for the Heat Map Canvas
NgChm.SUM.setupHeatMapGl = function() {
	NgChm.SUM.gl = NgChm.SUM.webGlGetContext(NgChm.SUM.canvas);
	if (!NgChm.SUM.gl) { return; }
	NgChm.SUM.gl.clearColor(1, 1, 1, 1);
	//Texture shaders
	NgChm.SUM.texHmProgram = NgChm.SUM.gl.createProgram();
	var vertexShader = NgChm.SUM.getVertexShader(NgChm.SUM.gl);
	var fragmentShader = NgChm.SUM.getFragmentShader(NgChm.SUM.gl);
	NgChm.SUM.gl.program = NgChm.SUM.texHmProgram;
	NgChm.SUM.gl.attachShader(NgChm.SUM.texHmProgram, vertexShader);
	NgChm.SUM.gl.attachShader(NgChm.SUM.texHmProgram, fragmentShader);
	NgChm.SUM.gl.linkProgram(NgChm.SUM.texHmProgram);
}

//Configure webGl for the Row Class Bar Canvas
NgChm.SUM.setupRowClassGl = function() {
	NgChm.SUM.rcGl = NgChm.SUM.webGlGetContext(NgChm.SUM.rCCanvas);
	if (!NgChm.SUM.rcGl) { return; }
	NgChm.SUM.rcGl.clearColor(1, 1, 1, 1);
	//Texture shaders
	NgChm.SUM.texRcProgram = NgChm.SUM.rcGl.createProgram();
	var vertexShader = NgChm.SUM.getVertexShader(NgChm.SUM.rcGl);
	var fragmentShader = NgChm.SUM.getFragmentShader(NgChm.SUM.rcGl);
	NgChm.SUM.rcGl.program = NgChm.SUM.texRcProgram;
	NgChm.SUM.rcGl.attachShader(NgChm.SUM.texRcProgram, vertexShader);
	NgChm.SUM.rcGl.attachShader(NgChm.SUM.texRcProgram, fragmentShader);
	NgChm.SUM.rcGl.linkProgram(NgChm.SUM.texRcProgram);
}

//Configure webGl for the Column Class Bar Canvas
NgChm.SUM.setupColClassGl = function() {
	NgChm.SUM.ccGl = NgChm.SUM.webGlGetContext(NgChm.SUM.cCCanvas);
	if (!NgChm.SUM.ccGl) { return; }
	NgChm.SUM.ccGl.clearColor(1, 1, 1, 1);
	//Texture shaders
	NgChm.SUM.texCcProgram = NgChm.SUM.ccGl.createProgram();
	var vertexShader = NgChm.SUM.getVertexShader(NgChm.SUM.ccGl);
	var fragmentShader = NgChm.SUM.getFragmentShader(NgChm.SUM.ccGl);
	NgChm.SUM.ccGl.program = NgChm.SUM.texCcProgram;
	NgChm.SUM.ccGl.attachShader(NgChm.SUM.texCcProgram, vertexShader);
	NgChm.SUM.ccGl.attachShader(NgChm.SUM.texCcProgram, fragmentShader);
	NgChm.SUM.ccGl.linkProgram(NgChm.SUM.texCcProgram);
}

//Initialize webGl for the Heat Map Canvas
NgChm.SUM.initHeatMapGl = function() {
	NgChm.SUM.gl.useProgram(NgChm.SUM.texHmProgram);
	NgChm.SUM.gl.viewport(0, 0, NgChm.SUM.gl.drawingBufferWidth*NgChm.SUM.widthScale, NgChm.SUM.gl.drawingBufferHeight*NgChm.SUM.heightScale);
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
	var position = NgChm.SUM.gl.getAttribLocation(NgChm.SUM.texHmProgram, 'position');

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

}

//Initialize webGl for the Row Class Bar Canvas
NgChm.SUM.initRowClassGl = function() {
	NgChm.SUM.rcGl.useProgram(NgChm.SUM.texRcProgram);
	NgChm.SUM.rcGl.viewport(0, 0, NgChm.SUM.rcGl.drawingBufferWidth*NgChm.SUM.widthScale, NgChm.SUM.rcGl.drawingBufferHeight*NgChm.SUM.heightScale);
	NgChm.SUM.rcGl.clear(NgChm.SUM.rcGl.COLOR_BUFFER_BIT);
	// Vertices
	var buffer = NgChm.SUM.rcGl.createBuffer();
	NgChm.SUM.rcGl.buffer = buffer;
	NgChm.SUM.rcGl.bindBuffer(NgChm.SUM.rcGl.ARRAY_BUFFER, buffer);
	var vertices = [ -1, -1, 1, -1, 1, 1, -1, -1, -1, 1, 1, 1 ];
	NgChm.SUM.rcGl.bufferData(NgChm.SUM.rcGl.ARRAY_BUFFER, new Float32Array(vertices), NgChm.SUM.rcGl.STATIC_DRAW);
	var byte_per_vertex = Float32Array.BYTES_PER_ELEMENT;
	var component_per_vertex = 2;
	buffer.numItems = vertices.length / component_per_vertex;
	var stride = component_per_vertex * byte_per_vertex;
	var position = NgChm.SUM.rcGl.getAttribLocation(NgChm.SUM.texRcProgram, 'position');
	NgChm.SUM.rcGl.enableVertexAttribArray(position);
	NgChm.SUM.rcGl.vertexAttribPointer(position, 2, NgChm.SUM.rcGl.FLOAT, false, stride, 0);
	// Texture
	var texture = NgChm.SUM.rcGl.createTexture();
	NgChm.SUM.rcGl.bindTexture(NgChm.SUM.rcGl.TEXTURE_2D, texture);
	NgChm.SUM.rcGl.texParameteri(
			NgChm.SUM.rcGl.TEXTURE_2D,
			NgChm.SUM.rcGl.TEXTURE_WRAP_S,
			NgChm.SUM.rcGl.CLAMP_TO_EDGE);
	NgChm.SUM.rcGl.texParameteri(
			NgChm.SUM.rcGl.TEXTURE_2D,
			NgChm.SUM.rcGl.TEXTURE_WRAP_T,
			NgChm.SUM.rcGl.CLAMP_TO_EDGE);
	NgChm.SUM.rcGl.texParameteri(
			NgChm.SUM.rcGl.TEXTURE_2D,
			NgChm.SUM.rcGl.TEXTURE_MIN_FILTER,
			NgChm.SUM.rcGl.NEAREST);
	NgChm.SUM.rcGl.texParameteri(
			NgChm.SUM.rcGl.TEXTURE_2D,
			NgChm.SUM.rcGl.TEXTURE_MAG_FILTER,
			NgChm.SUM.rcGl.NEAREST);

	NgChm.SUM.texRc = NgChm.DRAW.createRenderBuffer (NgChm.SUM.rowClassBarWidth*NgChm.SUM.widthScale, NgChm.SUM.totalHeight, 1.0);
}

//Initialize webGl for the Column Class Bar Canvas
NgChm.SUM.initColClassGl = function() {
	NgChm.SUM.ccGl.useProgram(NgChm.SUM.texCcProgram);
	NgChm.SUM.ccGl.viewport(0, 0, NgChm.SUM.ccGl.drawingBufferWidth*NgChm.SUM.widthScale, NgChm.SUM.ccGl.drawingBufferHeight*NgChm.SUM.heightScale);
	NgChm.SUM.ccGl.clear(NgChm.SUM.ccGl.COLOR_BUFFER_BIT);
	// Vertices
	var buffer = NgChm.SUM.ccGl.createBuffer();
	NgChm.SUM.ccGl.buffer = buffer;
	NgChm.SUM.ccGl.bindBuffer(NgChm.SUM.ccGl.ARRAY_BUFFER, buffer);
	var vertices = [ -1, -1, 1, -1, 1, 1, -1, -1, -1, 1, 1, 1 ];
	NgChm.SUM.ccGl.bufferData(NgChm.SUM.ccGl.ARRAY_BUFFER, new Float32Array(vertices), NgChm.SUM.ccGl.STATIC_DRAW);
	var byte_per_vertex = Float32Array.BYTES_PER_ELEMENT;
	var component_per_vertex = 2;
	buffer.numItems = vertices.length / component_per_vertex;
	var stride = component_per_vertex * byte_per_vertex;
	var position = NgChm.SUM.ccGl.getAttribLocation(NgChm.SUM.texCcProgram, 'position');
	NgChm.SUM.ccGl.enableVertexAttribArray(position);
	NgChm.SUM.ccGl.vertexAttribPointer(position, 2, NgChm.SUM.ccGl.FLOAT, false, stride, 0);
	// Texture
	var texture = NgChm.SUM.ccGl.createTexture();
	NgChm.SUM.ccGl.bindTexture(NgChm.SUM.ccGl.TEXTURE_2D, texture);
	NgChm.SUM.ccGl.texParameteri(
			NgChm.SUM.ccGl.TEXTURE_2D,
			NgChm.SUM.ccGl.TEXTURE_WRAP_S,
			NgChm.SUM.ccGl.CLAMP_TO_EDGE);
	NgChm.SUM.ccGl.texParameteri(
			NgChm.SUM.ccGl.TEXTURE_2D,
			NgChm.SUM.ccGl.TEXTURE_WRAP_T,
			NgChm.SUM.ccGl.CLAMP_TO_EDGE);
	NgChm.SUM.ccGl.texParameteri(
			NgChm.SUM.ccGl.TEXTURE_2D,
			NgChm.SUM.ccGl.TEXTURE_MIN_FILTER,
			NgChm.SUM.ccGl.NEAREST);
	NgChm.SUM.ccGl.texParameteri(
			NgChm.SUM.ccGl.TEXTURE_2D,
			NgChm.SUM.ccGl.TEXTURE_MAG_FILTER,
			NgChm.SUM.ccGl.NEAREST);

	NgChm.SUM.texCc = NgChm.DRAW.createRenderBuffer (NgChm.SUM.totalWidth*NgChm.SUM.widthScale, NgChm.SUM.colClassBarHeight*NgChm.SUM.heightScale, 1.0);
}

//This function is called when a new summary tile is received.
//The summary heatmap for the tile's layer is marked so
//that it will be redrawn when buildSummaryTexture is called next.
NgChm.SUM.flushDrawingCache = function(tile) {
	const debug = false;
	if (debug) console.log ('Flushing summary heat map for layer ' + tile.layer + ' at ' + performance.now());
	NgChm.SUM.summaryHeatMapValidator[tile.layer] = '';	// Empty string will not match any validator
};

//Create a summary heat map for the current data layer and display it.
NgChm.SUM.buildSummaryTexture = function() {
	const debug = false;

	const currentDl = NgChm.SEL.getCurrentDL();
	let renderBuffer;
	if (NgChm.SUM.summaryHeatMapCache.hasOwnProperty(currentDl)) {
		renderBuffer = NgChm.SUM.summaryHeatMapCache[currentDl];
	} else {
		renderBuffer = NgChm.DRAW.createRenderBuffer (NgChm.SUM.totalWidth*NgChm.SUM.widthScale, NgChm.SUM.totalHeight*NgChm.SUM.heightScale, 1.0);
		NgChm.SUM.summaryHeatMapCache[currentDl] = renderBuffer;
		NgChm.SUM.summaryHeatMapValidator[currentDl] = '';
	}
	NgChm.SUM.eventTimer = 0;

	const colorMap = NgChm.heatMap.getColorMapManager().getColorMap("data",currentDl);

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
		widthScale: NgChm.SUM.widthScale,
		heightScale: NgChm.SUM.heightScale,
		colorScheme: pixelColorScheme
	};
	const validator = JSON.stringify(summaryProps);
	if (debug) console.log ({
		m: 'NgChm.SUM.buildSummaryTexture',
		summaryProps,
		'new data': NgChm.SUM.summaryHeatMapValidator[currentDl] === '',
		valid: NgChm.SUM.summaryHeatMapValidator[currentDl] === validator,
		t: performance.now()
	});

	// Render
	if (validator !== NgChm.SUM.summaryHeatMapValidator[currentDl]) {
		NgChm.SUM.renderSummaryHeatmap(renderBuffer);
		if (debug) console.log('Rendering summary heatmap finished at ' + performance.now());
		NgChm.SUM.summaryHeatMapValidator[currentDl] = validator;
	}
	if ((NgChm.SUM.gl) && (renderBuffer !== undefined)) {
		NgChm.SUM.drawHeatMapRenderBuffer(renderBuffer);
	}
}

// Redisplay the summary heat map for the current data layer.
NgChm.SUM.drawHeatMap = function() {
	const currentDl = NgChm.SEL.getCurrentDL();
	if ((NgChm.SUM.gl)  && (NgChm.SUM.summaryHeatMapCache[currentDl] !== undefined)) {
		NgChm.SUM.drawHeatMapRenderBuffer (NgChm.SUM.summaryHeatMapCache[currentDl]);
	}
}

// Renders the Summary Heat Map for the current data layer into the specified renderBuffer.
NgChm.SUM.renderSummaryHeatmap = function (renderBuffer) {
	const currentDl = NgChm.SEL.getCurrentDL();
	var colorMap = NgChm.heatMap.getColorMapManager().getColorMap("data",currentDl);
	var colors = colorMap.getColors();
	var missing = colorMap.getMissingColor();
	var pos = 0;
	//Setup texture to draw on canvas.
	//Needs to go backward because WebGL draws bottom up.
	NgChm.SUM.avgValue[currentDl] = 0;
	for (var i = NgChm.heatMap.getNumRows(NgChm.MMGR.SUMMARY_LEVEL); i > 0; i--) {
		var line = new Array(NgChm.heatMap.getNumColumns(NgChm.MMGR.SUMMARY_LEVEL)*NgChm.SUM.widthScale*NgChm.SUM.BYTE_PER_RGBA);
		var linepos = 0;
		for (var j = 1; j <= NgChm.heatMap.getNumColumns(NgChm.MMGR.SUMMARY_LEVEL); j++) { // draw the heatmap
			var val = NgChm.heatMap.getValue(NgChm.MMGR.SUMMARY_LEVEL, i, j);
			if ((val < NgChm.SUM.maxValues) && (val > NgChm.SUM.minValues)) {
				NgChm.SUM.avgValue[currentDl] += val;
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
			for (var k = 0; k < line.length; k++){
				renderBuffer.pixels[pos] = line[k];
				pos++;
			}
		}
	}
	NgChm.SUM.avgValue[currentDl] = (NgChm.SUM.avgValue[currentDl] / (NgChm.heatMap.getNumRows(NgChm.MMGR.SUMMARY_LEVEL) * NgChm.heatMap.getNumColumns(NgChm.MMGR.SUMMARY_LEVEL)));
};

//WebGL code to draw the Summary Heat Map.
NgChm.SUM.drawHeatMapRenderBuffer = function(renderBuffer) {
	NgChm.SUM.gl.useProgram(NgChm.SUM.texHmProgram);
	var buffer = NgChm.SUM.gl.createBuffer();
	NgChm.SUM.gl.buffer = buffer;
	NgChm.SUM.gl.bindBuffer(NgChm.SUM.gl.ARRAY_BUFFER, buffer);
	var vertices = [ -1, -1, 1, -1, 1, 1, -1, -1, -1, 1, 1, 1 ];
	NgChm.SUM.gl.bufferData(NgChm.SUM.gl.ARRAY_BUFFER, new Float32Array(vertices), NgChm.SUM.gl.STATIC_DRAW);
	var byte_per_vertex = Float32Array.BYTES_PER_ELEMENT;
	var component_per_vertex = 2;
	buffer.numItems = vertices.length / component_per_vertex;
	var stride = component_per_vertex * byte_per_vertex;
	var position = NgChm.SUM.gl.getAttribLocation(NgChm.SUM.texHmProgram, 'position');
	NgChm.SUM.gl.enableVertexAttribArray(position);
	NgChm.SUM.gl.vertexAttribPointer(position, 2, NgChm.SUM.gl.FLOAT, false, stride, 0);
	NgChm.SUM.gl.activeTexture(NgChm.SUM.gl.TEXTURE0);
	NgChm.SUM.gl.texImage2D(
			NgChm.SUM.gl.TEXTURE_2D,
			0,
			NgChm.SUM.gl.RGBA,
			renderBuffer.width,
			renderBuffer.height,
			0,
			NgChm.SUM.gl.RGBA,
			NgChm.SUM.gl.UNSIGNED_BYTE,
			renderBuffer.pixels);
	NgChm.SUM.gl.drawArrays(NgChm.SUM.gl.TRIANGLE_STRIP, 0, NgChm.SUM.gl.buffer.numItems);
};

//Draws Row Classification bars into the webGl texture array ("dataBuffer"). "names"/"colorSchemes" should be array of strings.
NgChm.SUM.buildRowClassTexture = function() {
	if (!NgChm.SUM.texRc) return;

	var dataBuffer = NgChm.SUM.texRc.pixels;
	var classBarsConfig = NgChm.heatMap.getRowClassificationConfig();
	var classBarConfigOrder = NgChm.heatMap.getRowClassificationOrder();
	var classBarsData = NgChm.heatMap.getRowClassificationData();
	var colorMapMgr = NgChm.heatMap.getColorMapManager();
	NgChm.DET.removeLabels("missingSumRowClassBars");
	var offset = 0;
	for (var i = 0; i < classBarConfigOrder.length; i++) {
		var remainingWidth = NgChm.SUM.rowClassBarWidth;
		var key = classBarConfigOrder[i];
		var pos = 0 + offset;
		var currentClassBar = classBarsConfig[key];
		var height = NgChm.SUM.getScaledHeight(currentClassBar.height, "row");
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
				pos = NgChm.SUM.drawColorPlotRowClassBar(dataBuffer, pos, height, classBarValues, classBarLength, colorMap, remainingWidth);
			} else {
				pos = NgChm.SUM.drawScatterBarPlotRowClassBar(dataBuffer, pos, height-NgChm.SUM.colClassPadding, classBarValues, classBarLength, colorMap, currentClassBar, remainingWidth);
			}
			offset+= height*NgChm.SUM.BYTE_PER_RGBA;
		} else {
			if (!document.getElementById("missingSumRowClassBars")){
				var x = NgChm.SUM.canvas.offsetLeft;
				var y = NgChm.SUM.canvas.offsetTop + NgChm.SUM.canvas.clientHeight + 2;
				NgChm.DET.addLabelDivs(document.getElementById('sumlabelDiv'), "missingSumRowClassBars", "ClassBar MarkLabel", "...", "...", x, y, 10, "T", null,"Row");
			}
		}
	}
	NgChm.SUM.drawRowClassBars();
}

NgChm.SUM.drawRowClassBars = function() {
	if (NgChm.SUM.rcGl !== null) {
		NgChm.SUM.drawRowClassBarsRenderBuffer(NgChm.SUM.texRc);
	}
};

//WebGL code to draw the Row Class Bars.
NgChm.SUM.drawRowClassBarsRenderBuffer = function(renderBuffer) {
	NgChm.SUM.rcGl.useProgram(NgChm.SUM.texRcProgram);
	var buffer = NgChm.SUM.rcGl.createBuffer();
	NgChm.SUM.rcGl.buffer = buffer;
	NgChm.SUM.rcGl.bindBuffer(NgChm.SUM.rcGl.ARRAY_BUFFER, buffer);
	var vertices = [ -1, -1, 1, -1, 1, 1, -1, -1, -1, 1, 1, 1 ];
	NgChm.SUM.rcGl.bufferData(NgChm.SUM.rcGl.ARRAY_BUFFER, new Float32Array(vertices), NgChm.SUM.rcGl.STATIC_DRAW);
	var byte_per_vertex = Float32Array.BYTES_PER_ELEMENT;
	var component_per_vertex = 2;
	buffer.numItems = vertices.length / component_per_vertex;
	var stride = component_per_vertex * byte_per_vertex;
	var position = NgChm.SUM.rcGl.getAttribLocation(NgChm.SUM.texRcProgram, 'position');
	NgChm.SUM.rcGl.enableVertexAttribArray(position);
	NgChm.SUM.rcGl.vertexAttribPointer(position, 2, NgChm.SUM.rcGl.FLOAT, false, stride, 0);
	NgChm.SUM.rcGl.activeTexture(NgChm.SUM.rcGl.TEXTURE0);
	NgChm.SUM.rcGl.texImage2D(
			NgChm.SUM.rcGl.TEXTURE_2D,
			0,
			NgChm.SUM.rcGl.RGBA,
			renderBuffer.width,
			renderBuffer.height,
			0,
			NgChm.SUM.rcGl.RGBA,
			NgChm.SUM.rcGl.UNSIGNED_BYTE,
			renderBuffer.pixels);
	NgChm.SUM.rcGl.drawArrays(NgChm.SUM.rcGl.TRIANGLE_STRIP, 0, NgChm.SUM.rcGl.buffer.numItems);
};

//Draws Column Classification bars into the webGl texture array ("dataBuffer"). "names"/"colorSchemes" should be array of strings.
NgChm.SUM.buildColClassTexture = function() {
	if (!NgChm.SUM.texCc) return;
	var dataBuffer = NgChm.SUM.texCc.pixels;
	NgChm.DET.removeLabels("missingSumColClassBars");
	var classBarsConfig = NgChm.heatMap.getColClassificationConfig();
	var classBarConfigOrder = NgChm.heatMap.getColClassificationOrder();
	var classBarsData = NgChm.heatMap.getColClassificationData();
	var colorMapMgr = NgChm.heatMap.getColorMapManager();
	var pos = 0;

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
				NgChm.DET.addLabelDivs(document.getElementById('sumlabelDiv'), "missingSumColClassBars", "ClassBar MarkLabel", "...", "...", x, y, 10, "F", null,"Column");
			}
		}
	}
	NgChm.SUM.drawColClassBars();
}

//WebGL code to draw the Column Class Bars.
NgChm.SUM.drawColClassBars = function() {
	if (NgChm.SUM.ccGl !== null) {
		NgChm.SUM.drawColClassBarsRenderBuffer(NgChm.SUM.texCc);
	}
};

NgChm.SUM.drawColClassBarsRenderBuffer = function (renderBuffer) {
	NgChm.SUM.ccGl.useProgram(NgChm.SUM.texCcProgram);
	var buffer = NgChm.SUM.ccGl.createBuffer();
	NgChm.SUM.ccGl.buffer = buffer;
	NgChm.SUM.ccGl.bindBuffer(NgChm.SUM.ccGl.ARRAY_BUFFER, buffer);
	var vertices = [ -1, -1, 1, -1, 1, 1, -1, -1, -1, 1, 1, 1 ];
	NgChm.SUM.ccGl.bufferData(NgChm.SUM.ccGl.ARRAY_BUFFER, new Float32Array(vertices), NgChm.SUM.ccGl.STATIC_DRAW);
	var byte_per_vertex = Float32Array.BYTES_PER_ELEMENT;
	var component_per_vertex = 2;
	buffer.numItems = vertices.length / component_per_vertex;
	var stride = component_per_vertex * byte_per_vertex;
	var position = NgChm.SUM.ccGl.getAttribLocation(NgChm.SUM.texCcProgram, 'position');
	NgChm.SUM.ccGl.enableVertexAttribArray(position);
	NgChm.SUM.ccGl.vertexAttribPointer(position, 2, NgChm.SUM.ccGl.FLOAT, false, stride, 0);
	NgChm.SUM.ccGl.activeTexture(NgChm.SUM.ccGl.TEXTURE0);
	NgChm.SUM.ccGl.texImage2D(
			NgChm.SUM.ccGl.TEXTURE_2D,
			0,
			NgChm.SUM.ccGl.RGBA,
			renderBuffer.width,
			renderBuffer.height,
			0,
			NgChm.SUM.ccGl.RGBA,
			NgChm.SUM.ccGl.UNSIGNED_BYTE,
			renderBuffer.pixels);
	NgChm.SUM.ccGl.drawArrays(NgChm.SUM.ccGl.TRIANGLE_STRIP, 0, NgChm.SUM.ccGl.buffer.numItems);
};

NgChm.SUM.onMouseDownCanvas = function(evt) {
	NgChm.SUM.mouseEventActive = true;
	evt.preventDefault();
	evt.stopPropagation();
	var boxY = ((NgChm.SUM.colClassBarHeight)/NgChm.SUM.canvas.height * NgChm.SUM.boxCanvas.height);
	var sumOffsetX = evt.touches ? NgChm.SUM.getTouchEventOffset(evt).offsetX : evt.offsetX;
	var sumOffsetY = evt.touches ? NgChm.SUM.getTouchEventOffset(evt).offsetY : evt.offsetY;
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
	NgChm.SEL.updateSelection(NgChm.DMM.primaryMap);
}

NgChm.SUM.onMouseMoveCanvas = function(evt) {
	if (NgChm.SUM.mouseEventActive) {
		if (evt.which==1 || (evt.touches && evt.touches.length == 2)) {
			if (evt.shiftKey || evt.touches) {
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
		var sumOffsetX = evt.touches ? NgChm.SUM.getTouchEventOffset(evt).offsetX : evt.offsetX;
		var sumOffsetY = evt.touches ? NgChm.SUM.getTouchEventOffset(evt).offsetY : evt.offsetY;
		//When doing a shift drag, this block will actually do the selection on mouse up.
		if (NgChm.SUM.dragSelect) {
			var totalRows = NgChm.heatMap.getNumRows(NgChm.MMGR.SUMMARY_LEVEL);
			var totalCols = NgChm.heatMap.getNumColumns(NgChm.MMGR.SUMMARY_LEVEL);
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
			var xPos = NgChm.SUM.getCanvasX(sumOffsetX);
			var yPos = NgChm.SUM.getCanvasY(sumOffsetY);
			NgChm.SUM.clickSelection(xPos, yPos);
			NgChm.SUM.clickStartRow = null;
			NgChm.SUM.clickStartCol = null;
		}
		NgChm.SUM.dragSelect = false;
		NgChm.SUM.canvas.style.cursor="default";
		//Make sure the selected row/column are within the bounds of the matrix.
		NgChm.SEL.checkRow(NgChm.DMM.primaryMap);
		NgChm.SEL.checkCol(NgChm.DMM.primaryMap);
		NgChm.SUM.mouseEventActive = false;
	}
}

//This is a helper function that can set a sub-ribbon view that best matches a user
//selected region of the map.
NgChm.SUM.setSubRibbonView  = function(startRow, endRow, startCol, endCol) {
	let mapItem = (NgChm.DEV.targetCanvas !== null) ? NgChm.DMM.getMapItemFromCanvas(NgChm.DEV.targetCanvas) : NgChm.DMM.primaryMap;
	NgChm.DEV.targetCanvas = null;
	const selRows = Math.abs(endRow - startRow);
	const selCols = Math.abs(endCol - startCol);
	//In case there was a previous dendo selection - clear it.
	NgChm.SUM.clearSelectionMarks();
	NgChm.SUM.colDendro.draw();
	NgChm.SUM.rowDendro.draw();
	//If tiny tiny box was selected, discard and go back to previous selection size
	if (endRow-startRow<1 && endCol-startCol<1) {
		NgChm.DET.setDetailDataSize (mapItem, mapItem.dataBoxWidth);
	} else {
		// Get the best height zoom level for our selection box and set it
		var boxSizeH = NgChm.DET.getNearestBoxHeight(mapItem, endRow - startRow + 1);
		NgChm.DET.setDetailDataHeight(mapItem,boxSizeH);

		// Get the best width zoom level for our selection box and set it
		var boxSizeV = NgChm.DET.getNearestBoxSize(mapItem, endCol - startCol + 1);
		NgChm.DET.setDetailDataWidth(mapItem,boxSizeV);

		mapItem.selectedStart= startCol;
		mapItem.selectedStop=endCol;
		mapItem.currentRow = startRow;
	}
	NgChm.SEL.updateSelection(mapItem);
}

NgChm.SUM.clickSelection = function(xPos, yPos) {
	var sumRow = NgChm.SUM.canvasToMatrixRow(yPos) - Math.floor(NgChm.SEL.getCurrentSumDataPerCol(NgChm.DMM.primaryMap)/2);
	var sumCol = NgChm.SUM.canvasToMatrixCol(xPos) - Math.floor(NgChm.SEL.getCurrentSumDataPerRow(NgChm.DMM.primaryMap)/2);
	NgChm.SEL.setCurrentRowFromSum(NgChm.DMM.primaryMap,sumRow);
	NgChm.SEL.setCurrentColFromSum(NgChm.DMM.primaryMap,sumCol);
	NgChm.SEL.updateSelection(NgChm.DMM.primaryMap);
}

NgChm.SUM.dragMove = function(evt) {
	var sumOffsetX = evt.touches ? NgChm.SUM.getTouchEventOffset(evt).offsetX : evt.offsetX;
	var sumOffsetY = evt.touches ? NgChm.SUM.getTouchEventOffset(evt).offsetY : evt.offsetY;
	var xPos = NgChm.SUM.getCanvasX(sumOffsetX);
	var yPos = NgChm.SUM.getCanvasY(sumOffsetY);
	var sumRow = NgChm.SUM.canvasToMatrixRow(yPos) - Math.round(NgChm.SEL.getCurrentSumDataPerCol(NgChm.DMM.primaryMap)/2);
	var sumCol = NgChm.SUM.canvasToMatrixCol(xPos) - Math.round(NgChm.SEL.getCurrentSumDataPerRow(NgChm.DMM.primaryMap)/2);
	NgChm.SEL.setCurrentRowFromSum(NgChm.DMM.primaryMap,sumRow);
	NgChm.SEL.setCurrentColFromSum(NgChm.DMM.primaryMap,sumCol);
	NgChm.SEL.updateSelection(NgChm.DMM.primaryMap);
}

//This function now is just in charge of drawing the green box in the summary side as
//a shift drag is happening.  When mouse up occurs, the actual selection will be done.
NgChm.SUM.dragSelection = function(evt) {
	var totalRows = NgChm.heatMap.getNumRows(NgChm.MMGR.SUMMARY_LEVEL);
	var totalCols = NgChm.heatMap.getNumColumns(NgChm.MMGR.SUMMARY_LEVEL);
	var sumOffsetX = evt.offsetX;
	var sumOffsetY = evt.offsetY;
	if (evt.touches){
		var rect = evt.target.getBoundingClientRect();
		sumOffsetX = Math.round(evt.targetTouches[0].pageX - rect.left);
		sumOffsetY = Math.round(evt.targetTouches[0].pageY - rect.top);
		var initSumOffsetX = Math.round(evt.targetTouches[1].pageX - rect.left);
		var initSumOffsetY = Math.round(evt.targetTouches[1].pageY - rect.top);
		var sumRow = NgChm.SUM.canvasToMatrixRow(NgChm.SUM.getCanvasY(initSumOffsetY));
		var sumCol = NgChm.SUM.canvasToMatrixCol(NgChm.SUM.getCanvasX(initSumOffsetX));

		NgChm.SUM.clickStartRow = (sumRow*NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL));
		NgChm.SUM.clickStartCol = (sumCol*NgChm.heatMap.getColSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL));
	}
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
	NgChm.DMM.primaryMap.dataPerRow = endCol - startCol;
	NgChm.DMM.primaryMap.dataPerCol = endRow - startRow;
	NgChm.DMM.primaryMap.currentRow = startRow;
	NgChm.DMM.primaryMap.currentCol = startCol;
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
	return Math.round(y/NgChm.SUM.heightScale);
}

NgChm.SUM.canvasToMatrixCol = function(x) {
	return Math.round(x/NgChm.SUM.widthScale);
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
	ctx.lineWidth=1;
	ctx.strokeStyle="#000000";

	// If no row or column cuts, draw the heat map border in black
	if (NgChm.UTIL.mapHasGaps() === false){
		ctx.strokeRect(0,0,NgChm.SUM.boxCanvas.width,NgChm.SUM.boxCanvas.height);
	}

	//If in sub-dendro mode, draw rectangles outside of selected range.
	//Furthermore, if the average color is dark make those rectangles
	//lighter than the heatmap, otherwise, darker.
	if (NgChm.DMM.primaryMap.mode.startsWith('RIBBON')) {
		const currentDl = NgChm.SEL.getCurrentDL();
		var colorMap = NgChm.heatMap.getColorMapManager().getColorMap("data",currentDl);
		var color = colorMap.getColor(NgChm.SUM.avgValue[currentDl]);
		if (colorMap.isColorDark(color)) {
			ctx.fillStyle="rgba(10, 10, 10, 0.25)";
		} else {
			ctx.fillStyle="rgba(255, 255, 255, 0.25)";
		}
	}

	//Draw sub-dendro box
	if (NgChm.DMM.primaryMap.mode.startsWith('RIBBONH') && (NgChm.DMM.primaryMap.selectedStart > 0)) {
		var summaryRatio = NgChm.heatMap.getColSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL);
		var adjustedStart = NgChm.DMM.primaryMap.selectedStart*NgChm.SUM.widthScale / summaryRatio;
		var adjustedStop = NgChm.DMM.primaryMap.selectedStop*NgChm.SUM.widthScale / summaryRatio;
		boxX = 0;
		boxY = 0;
		boxW = (((adjustedStart - NgChm.SUM.widthScale) / NgChm.SUM.canvas.width) * NgChm.SUM.boxCanvas.width);
		boxH = NgChm.SUM.boxCanvas.height-boxY;
		ctx.fillRect(boxX,boxY,boxW,boxH);
		boxX = ((adjustedStop / NgChm.SUM.canvas.width) * NgChm.SUM.boxCanvas.width);
		boxW = (((NgChm.SUM.canvas.width-adjustedStop)+1*NgChm.SUM.widthScale) / NgChm.SUM.canvas.width) * NgChm.SUM.boxCanvas.width;
		ctx.fillRect(boxX,boxY,boxW,boxH);
	} else if (NgChm.DMM.primaryMap.mode.startsWith('RIBBONV')  && NgChm.DMM.primaryMap.selectedStart > 0) {
		var summaryRatio = NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL);
		var adjustedStart = NgChm.DMM.primaryMap.selectedStart*NgChm.SUM.heightScale / summaryRatio;
		var adjustedStop = NgChm.DMM.primaryMap.selectedStop*NgChm.SUM.heightScale / summaryRatio;
		boxX = 0;
		boxY = 0;
		var boxW = NgChm.SUM.boxCanvas.width-boxX;
		var boxH = (((adjustedStart-NgChm.SUM.heightScale) / NgChm.SUM.canvas.height) * NgChm.SUM.boxCanvas.height);
		ctx.fillRect(boxX,boxY,boxW,boxH);
		var boxY = ((adjustedStop/NgChm.SUM.canvas.height) * NgChm.SUM.boxCanvas.height);
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
	let maps = NgChm.DMM.DetailMaps;
	if (maps.length === 0) {
		maps = [NgChm.DMM.primaryMap];
	}
	// Reset the canvas (drawing borders and sub-dendro selections)
	var ctx = NgChm.SUM.resetBoxCanvas(NgChm.SUM.boxCanvas);
	for (let i=0; i<maps.length;i++ ) {
		const mapItem = maps[i];
		// Draw the View Box using user-defined defined selection color
		const boxX = ((((NgChm.SEL.getCurrentSumCol(mapItem)-1) * NgChm.SUM.widthScale) / NgChm.SUM.canvas.width) * NgChm.SUM.boxCanvas.width);
		const boxY = ((((NgChm.SEL.getCurrentSumRow(mapItem)-1) * NgChm.SUM.heightScale) / NgChm.SUM.canvas.height) * NgChm.SUM.boxCanvas.height);
		const boxW = (NgChm.SEL.getCurrentSumDataPerRow(mapItem)*NgChm.SUM.widthScale / NgChm.SUM.canvas.width) * NgChm.SUM.boxCanvas.width - 2;
		const boxH = (NgChm.SEL.getCurrentSumDataPerCol(mapItem)*NgChm.SUM.heightScale / NgChm.SUM.canvas.height) * NgChm.SUM.boxCanvas.height - 2;
		const dataLayers = NgChm.heatMap.getDataLayers();
		const dataLayer = dataLayers[mapItem.currentDl];
		ctx.strokeStyle=dataLayer.selection_color;
		ctx.strokeStyle=dataLayer.selection_color;
		if (mapItem.version === 'P') {
			ctx.lineWidth=4;
		} else {
			ctx.lineWidth=2;
		}
		ctx.strokeRect(boxX,boxY,boxW,boxH);

	}
}

//=====================//
// 	CLASSBAR FUNCTIONS //
//=====================//

NgChm.SUM.getScaledHeight = function(height, axis) {
	var scaledHeight;
	if (axis === "row") {
		scaledHeight = Math.max(height, 1 + NgChm.SUM.rowClassPadding);
    } else {
    	scaledHeight = Math.max(height, 1 + NgChm.SUM.colClassPadding);
    }
    return scaledHeight;
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

	for (var h = 0; h < matrix.length; h++) {
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
	NgChm.SUM.setLabelDivElement(key+"ColLabel","- "+midVal,midPos,leftPos,false);
}

NgChm.SUM.removeRowClassBarLabels = function () {
	var classLabels = document.getElementsByClassName("classLabelVertical");
	while (classLabels.length > 0) {
		classLabels[0].parentNode.removeChild(classLabels[0]);
	}
}

NgChm.SUM.drawRowClassBarLabels = function () {
	NgChm.SUM.removeRowClassBarLabels();
	var colCanvas = document.getElementById("summary_col_top_items_canvas");
	var rowCanvas = document.getElementById("summary_row_top_items_canvas");
	var sumCanvas = document.getElementById("summary_canvas");
	var classBarsConfig = NgChm.heatMap.getRowClassificationConfig();
	var classBarConfigOrder = NgChm.heatMap.getRowClassificationOrder();
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
	var covPos = parseInt(NgChm.SUM.rCCanvas.offsetLeft) + 10;
	//Set starting vertical covariate position to the bottom edge of Summary canvas PLUS a space factor adjustment
	var topPos = rowCanvas.offsetTop+rowCanvas.offsetHeight+5;
	//Loop thru the class bars retrieving label (truncating where necessary), figuring the percentage of the total width of bars
	//relfected in the current bar, draw label, and set the next position by off-setting the total width*that percentage.
	for (var j = 0; j < classBarConfigOrder.length; j++) {
		var key = classBarConfigOrder[j];
		var currentClassBar = classBarsConfig[key];
		if (currentClassBar.show === 'Y') {
			var covLabel = NgChm.UTIL.getLabelText(key,'COL', true);
			var covPct = parseInt(currentClassBar.height) / totalHeight;
			//scaled width of current bar
			var barWidth = (NgChm.SUM.rowClassBarWidth*covPct);
			//half the bar width minus half the font size for centered placement
			var halfBar = (barWidth / 2) - 5;
			NgChm.SUM.setLabelDivElement(key+"RowLabel",covLabel,topPos,(covPos+halfBar),true);
			//Set position to beginning of next bar
			covPos = covPos + barWidth;
		}
	}
}

NgChm.SUM.removeColClassBarLabels = function () {
	var classLabels = document.getElementsByClassName("classLabel");
	while (classLabels.length > 0) {
		classLabels[0].parentNode.removeChild(classLabels[0]);
	}
}

NgChm.SUM.drawColClassBarLabels = function () {
	NgChm.SUM.removeColClassBarLabels();
	var classBarsConfig = NgChm.heatMap.getColClassificationConfig();
	var classBarConfigOrder = NgChm.heatMap.getColClassificationOrder();
	var classBarsData = NgChm.heatMap.getColClassificationData();
	var prevHeight = 0;
	for (var i = 0; i < classBarConfigOrder.length; i++) {
		var key = classBarConfigOrder[i];
		var currentClassBar = classBarsConfig[key];
		if (currentClassBar.show === 'Y') {
			NgChm.SUM.drawColClassBarLabel(key, currentClassBar,prevHeight);
			prevHeight += parseInt(currentClassBar.height);
		}
	}
}

NgChm.SUM.drawColClassBarLabel = function(key, currentClassBar, prevHeight) {
	//calculate where covariate bars end and heatmap begins by using the top items canvas (which is lined up with the heatmap)
	var beginClasses = NgChm.SUM.cCCanvas.offsetTop;
	//get your horizontal start position (to the right of bars)
	var leftPos = NgChm.SUM.canvas.offsetLeft + NgChm.SUM.canvas.offsetWidth + 2;
	//find the first, middle, and last vertical positions for the bar legend being drawn
	var topPos =  beginClasses+prevHeight;
	var midPos =  topPos+((currentClassBar.height-15)/2)-1;
	var midVal = NgChm.UTIL.getLabelText(key,'ROW', true);
	//Create div and place mid legend value
	NgChm.SUM.setLabelDivElement(key+"ColLabel",midVal,midPos,leftPos,false);
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
		NgChm.SUM.chmElement.appendChild(itemElem);
	}
	itemElem.style.top = topVal + 'px';
	itemElem.style.left = leftVal + 'px';
}

NgChm.SUM.drawColClassBarLegends = function () {
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
				NgChm.SUM.drawColClassBarLegend(key, currentClassBar,prevHeight,totalHeight, fewClasses);
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



NgChm.SUM.drawColorPlotRowClassBar = function(dataBuffer, pos, height, classBarValues, classBarLength, colorMap, remainingWidth) {
	for (var j = classBarLength; j > 0; j--){
		var val = classBarValues[j-1];
		var color = colorMap.getClassificationColor(val);
		if (val == "null") {
			color = colorMap.getHexToRgba(colorMap.getMissingColor());
		}
		for (var i = 0; i < NgChm.SUM.widthScale; i++){
			for (var k = 0; k < (height-NgChm.SUM.rowClassPadding); k++){
				dataBuffer[pos] = color['r'];
				dataBuffer[pos + 1] = color['g'];
				dataBuffer[pos + 2] = color['b'];
				dataBuffer[pos + 3] = color['a'];
				pos+=NgChm.SUM.BYTE_PER_RGBA;	// 4 bytes per color
			}
			pos+=NgChm.SUM.rowClassPadding*NgChm.SUM.BYTE_PER_RGBA+(remainingWidth*NgChm.SUM.BYTE_PER_RGBA);
		}
	}
	return pos;
}

NgChm.SUM.drawScatterBarPlotRowClassBar = function(dataBuffer, pos, height, classBarValues, classBarLength, colorMap, currentClassBar, remainingWidth) {
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
			pos+=NgChm.SUM.rowClassPadding*NgChm.SUM.BYTE_PER_RGBA+(remainingWidth*NgChm.SUM.BYTE_PER_RGBA);
		}
	}
	return pos;
}

//THIS FUNCTION NOT CURRENTLY FOR THE SUMMARY PANEL CALLED BUT MAY BE ADDED BACK IN IN THE FUTURE
NgChm.SUM.drawRowClassBarLegends = function () {
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
				NgChm.SUM.drawRowClassBarLegend(key,currentClassBar,prevHeight,totalHeight,i);
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
	NgChm.SUM.setLegendDivElement(key+"SumHigh","-"+lowVal,topPos,beginPos,true);
	//Create div and place middle legend value
	NgChm.SUM.setLegendDivElement(key+"SumMid","-"+midVal,topPos,midPos,true);
	//Create div and place middle legend value
	NgChm.SUM.setLegendDivElement(key+"SumLow","-"+highVal,topPos,endPos,true);
}

NgChm.SUM.setLegendDivElement = function (itemId,boundVal,topVal,leftVal,isRowVal) {
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
		NgChm.SUM.chmElement.appendChild(itemElem);
	}
	itemElem.style.top = topVal + 'px';
	itemElem.style.left = leftVal + 'px';
}

NgChm.SUM.buildScatterBarPlotMatrix = function(height, classBarValues, start, classBarLength, currentClassBar, barSize, isSummary) {
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
NgChm.SUM.getSummaryCovariateBarHeights = function (axis) {
	return NgChm.heatMap.getCovariateBarHeights(axis)
	.map(h => h === 0 ? 0 : NgChm.SUM.getScaledHeight(h,axis));
}

//Return the total scaled heights of all covariate bars on the specified axis.
NgChm.SUM.calculateSummaryTotalClassBarHeight = function(axis) {
	return NgChm.SUM.getSummaryCovariateBarHeights(axis)
	.reduce((t,h) => t+h, 0);
}

// Return true iff the Summary View is visible (i.e. contained in a visible pane).
NgChm.SUM.isVisible = function isVisible () {
	if (NgChm.SUM.chmElement == null) return false;
	const loc = NgChm.Pane.findPaneLocation (NgChm.SUM.chmElement);
	if (loc.pane.style.display === 'none') return false;
	return !loc.pane.classList.contains('collapsed');
};

//***************************//
//Selection Label Functions *//
//***************************//

NgChm.SUM.summaryResize = function() {
	var embedDiv = document.getElementById("NGCHMEmbed");
	if ((embedDiv !== null) && (embedDiv.style.display === 'none')) {
		return;
	}
	if (NgChm.SUM.chmElement) {
		const loc = NgChm.Pane.findPaneLocation (NgChm.SUM.chmElement);
		NgChm.SUM.summaryPaneResizeHandler (loc);
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

	NgChm.SUM.redrawSummaryPane = function redrawSummaryPane () {
		const debug = false;
		if (debug) console.log({ m: 'redrawSummaryPane', rowDendro: NgChm.SUM.rowDendro, colDendro: NgChm.SUM.colDendro });
		if (NgChm.SUM.chmElement && T === 0) {
			if (XT !== 0) {
				window.clearTimeout (XT);
				XT = 0;
			}
			T = window.requestAnimationFrame (() => {
				T = 0;
				if (NgChm.SUM.rowDendro) NgChm.SUM.rowDendro.draw();
				if (NgChm.SUM.colDendro) NgChm.SUM.colDendro.draw();
				NgChm.SUM.clearSelectionMarks();
				NgChm.SUM.clearTopItems();
				if(document.getElementById("missingSumRowClassBars")) NgChm.DET.removeLabels("missingSumRowClassBars");
				if(document.getElementById("missingSumColClassBars")) NgChm.DET.removeLabels("missingSumColClassBars");
				XT = window.setTimeout (() => {
					XT = 0;
					NgChm.SUM.buildRowClassTexture ();
					NgChm.SUM.buildColClassTexture ();
					if (debug) {
						console.log ('Drawing summary heatmap:');
						console.log ({ layout: NgChm.SUM.layout,
								top: NgChm.SUM.canvas.style.top,
								left: NgChm.SUM.canvas.style.left,
								height: NgChm.SUM.canvas.style.height,
								width: NgChm.SUM.canvas.style.width });
					}
					NgChm.SUM.buildSummaryTexture(NgChm.SUM.canvas)
					NgChm.SUM.drawLeftCanvasBox();
					NgChm.SUM.setSelectionDivSize();
					NgChm.SUM.drawSelectionMarks();
					NgChm.SUM.drawMissingRowClassBarsMark();
					NgChm.SUM.drawMissingColClassBarsMark();
					NgChm.SUM.drawTopItems();
					if (NgChm.SUM.flagDrawClassBarLabels) {
						NgChm.SUM.drawColClassBarLabels();
						NgChm.SUM.drawRowClassBarLabels();
					}
			//		NgChm.SUM.drawColClassBarLegends(); Removed for the time being
			//		NgChm.SUM.drawRowClassBarLegends();
				}, 48);
			});
		}
	};
})();

NgChm.SUM.initSummarySize = function() {
	NgChm.SUM.setTopItemsSize();
	NgChm.SUM.calcSummaryLayout ();
}

// Calculate the summary NGCHM's layout based on the newly adjusted size of its enclosing pane.
NgChm.SUM.calcSummaryLayout = function() {
	const debug = false;

	if (NgChm.SUM.chmElement && NgChm.SUM.canvas) {

		NgChm.SUM.setTopItemsSize();

		const selectCanvasSize = 10;
		//Leave room for labels in GUI Builder "summary only" screens
		let colLabelTopItemsHeight = NgChm.SUM.flagDrawClassBarLabels === true ? 70 : 0;
		let rowLabelTopItemsWidth = NgChm.SUM.flagDrawClassBarLabels === true ? 110 : 0;
		//Check to see if top items is longer than labels (if labels are drawn)
		colLabelTopItemsHeight = colLabelTopItemsHeight < NgChm.SUM.colTopItemsWidth ? NgChm.SUM.colTopItemsWidth : colLabelTopItemsHeight;
		rowLabelTopItemsWidth = rowLabelTopItemsWidth < NgChm.SUM.rowTopItemsHeight ? NgChm.SUM.rowTopItemsHeight : rowLabelTopItemsWidth;

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
		NgChm.SUM.layout = layout;

		// Y-axis: (topItems + margin) + colSelections + mapBorder + map + mapBorder + (margin + colClassBars) + (margin + colDendrogram)
		let ydecor = layout.colSelection.height + 2 * layout.borderThickness;
		if (layout.colTopItems.height > 0) { ydecor += layout.colTopItems.height + layout.marginThickness; }
		if (NgChm.SUM.colClassBarHeight > 0) { ydecor += layout.marginThickness; }
		const hFrac = NgChm.SUM.colDendro ? NgChm.SUM.colDendro.getConfigSize() : 0;
		if (hFrac > 0) { ydecor += layout.marginThickness; }
		//const ytotal = Math.floor (NgChm.SUM.chmElement.clientHeight * NgChm.SUM.heightPct) - 35;
		const ytotal = Math.floor (NgChm.SUM.chmElement.clientHeight) - 35;
		let ccBarHeight = NgChm.SUM.colClassBarHeight;
		const yScale = Math.min(1.0, (ytotal/2 - ydecor) / (ccBarHeight + ytotal/2*hFrac));
		// console.log ({ ydecor, ccBarHeight, hFrac, ytotal, yScale });

		layout.colClassBars.height = Math.floor(yScale * NgChm.SUM.colClassBarHeight);
		layout.colDendro.height = Math.floor((ytotal - ydecor - layout.colClassBars.height) * (hFrac/(1+hFrac)) * yScale);
		layout.matrix.height = Math.floor(ytotal - ydecor - layout.colClassBars.height - layout.colDendro.height);
		//console.log ({ ytotal, ydecor, colClassBarsHeight: layout.colClassBars.height, colDendroHeight: layout.colDendro.height, matrixHeight: layout.matrix.height });

		// X-axis: (rowDendrogram + margin) + (rowClassBars + margin) + mapBorder + map + mapBorder + rowSelections + (margin + rowTopItems)
		let xdecor = layout.rowSelection.width + 2 * layout.borderThickness;
		if (layout.rowTopItems.width > 0) { xdecor += layout.rowTopItems.width + layout.marginThickness; }
		if (NgChm.SUM.rowClassBarWidth > 0) { xdecor += layout.marginThickness; }
		const wFrac = NgChm.SUM.rowDendro ? NgChm.SUM.rowDendro.getConfigSize() : 0;
		if (wFrac > 0) { xdecor += layout.marginThickness; }
		const xtotal = NgChm.SUM.chmElement.clientWidth; // * NgChm.SUM.widthPct;
		let rcBarWidth = NgChm.SUM.rowClassBarWidth;
		const xScale = Math.min(1.0, (xtotal/2 - xdecor) / (rcBarWidth + xtotal/2*wFrac));
		//console.log ({ xdecor, rcBarWidth, wFrac, xtotal, xScale });

		layout.colClassBars.top = layout.colDendro.height > 0 ? layout.colDendro.height + layout.marginThickness : 0;
		layout.matrix.top = layout.colClassBars.top + (layout.colClassBars.height > 0 ? layout.colClassBars.height + layout.marginThickness : 0) + layout.borderThickness;
		layout.colSelection.top = layout.matrix.top + layout.matrix.height + layout.borderThickness;

		layout.rowClassBars.width = Math.floor(xScale * NgChm.SUM.rowClassBarWidth);
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

		NgChm.UTIL.setElementPositionSize(NgChm.SUM.rCCanvas, layout.rowClassBars, true);
		NgChm.UTIL.setElementPositionSize(NgChm.SUM.cCCanvas, layout.colClassBars, true);
		NgChm.SUM.setSelectionDivSize(layout);

		if (NgChm.SUM.rowDendro) NgChm.UTIL.setElementPositionSize(NgChm.SUM.rowDendro.dendroCanvas, layout.rowDendro);
		if (NgChm.SUM.colDendro) NgChm.UTIL.setElementPositionSize(NgChm.SUM.colDendro.dendroCanvas, layout.colDendro);
		NgChm.UTIL.setElementPositionSize(NgChm.SUM.canvas, layout.matrix, true);
		NgChm.UTIL.setElementPositionSize(NgChm.SUM.boxCanvas, layout.matrix, false);
	}
};

// Clear and redraw the selection marks on both axes.
NgChm.SUM.redrawSelectionMarks = function() {
	NgChm.SUM.clearSelectionMarks();
	NgChm.SUM.drawSelectionMarks();
};

// Draw the selection marks on both axes.
NgChm.SUM.drawSelectionMarks = function() {
	NgChm.SUM.drawAxisSelectionMarks('row');
	NgChm.SUM.drawAxisSelectionMarks('column');
};

// Draw the selection marks on the specified axis.
NgChm.SUM.drawAxisSelectionMarks = function(axis) {
	const isRow = NgChm.MMGR.isRow (axis);
	const selection = NgChm.SRCH.getAxisSearchResults(axis);
	const canvas = document.getElementById (isRow ? "summary_row_select_canvas" : "summary_col_select_canvas");
	if (canvas === null) { return;}
	const limit = isRow ? canvas.height : canvas.width;
	const scale = limit / NgChm.heatMap.getTotalElementsForAxis(axis);
	const summaryRatio = axis === 'Row' ? NgChm.heatMap.getSummaryRowRatio() : NgChm.heatMap.getSummaryColRatio();
	const minSelectionMarkSize = summaryRatio === 1 ? 1 : ((2*summaryRatio)*window.devicePixelRatio);

	const marks = NgChm.DET.getContigSearchRanges(selection).map(range => {
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

	const dataLayer = NgChm.heatMap.getCurrentDataLayer();
	const darkenedColor = NgChm.UTIL.shadeColor(dataLayer.selection_color, -25);

	const ctx = canvas.getContext('2d');
	ctx.imageSmoothingEnabled = false;
	ctx.fillStyle = darkenedColor;

	if (isRow) {
		marks.forEach(mark => ctx.fillRect(0,mark.posn,canvas.width,mark.size));
	} else {
		marks.forEach(mark => ctx.fillRect(mark.posn,0,mark.size,canvas.height));
	}
};

NgChm.SUM.drawMissingRowClassBarsMark = function (){
	if (document.getElementById("missingSumRowClassBars")){
		NgChm.DET.removeLabels("missingSumRowClassBars");
		var x = NgChm.SUM.canvas.offsetLeft;
		var y = NgChm.SUM.canvas.offsetTop + NgChm.SUM.canvas.clientHeight + 2;
		NgChm.DET.addLabelDivs(document.getElementById('sumlabelDiv'), "missingSumRowClassBars", "ClassBar MarkLabel", "...", "...", x, y, 10, "T", null,"Row");
	}
}

NgChm.SUM.drawMissingColClassBarsMark = function (){
	if (document.getElementById("missingSumColClassBars")){
		NgChm.DET.removeLabels("missingSumColClassBars");
		var x = NgChm.SUM.canvas.offsetLeft + NgChm.SUM.canvas.offsetWidth + 2;
		var y = NgChm.SUM.canvas.offsetTop + NgChm.SUM.canvas.clientHeight/NgChm.SUM.totalHeight - 10;
		NgChm.DET.addLabelDivs(document.getElementById('sumlabelDiv'), "missingSumColClassBars", "ClassBar MarkLabel", "...", "...", x, y, 10, "F", null,"Col");
	}
}

NgChm.SUM.clearSelectionMarks = function(searchTarget){
	if (typeof searchTarget !== 'undefined') {
		if (searchTarget === "Row") {
			NgChm.SUM.clearRowSelectionMarks();
		} else if (searchTarget === "Column") {
			NgChm.SUM.clearColSelectionMarks();
		} else {
			NgChm.SUM.clearRowSelectionMarks();
			NgChm.SUM.clearColSelectionMarks();
		}
	} else {
		NgChm.SUM.clearRowSelectionMarks();
		NgChm.SUM.clearColSelectionMarks();
	}
}

NgChm.SUM.clearAxisSelectionMarks = function (axis) {
	if (NgChm.MMGR.isRow(axis)) NgChm.SUM.clearRowSelectionMarks(); else NgChm.SUM.clearColSelectionMarks();
};

NgChm.SUM.clearRowSelectionMarks = function() {
	var rowSel = document.getElementById("summary_row_select_canvas");
	if (rowSel) {
		var rowCtx = rowSel.getContext('2d');
		rowCtx.clearRect(0,0,rowSel.width,rowSel.height);
	}
}

NgChm.SUM.clearColSelectionMarks = function() {
	var colSel = document.getElementById("summary_col_select_canvas");
	if (colSel) {
		var colCtx = colSel.getContext('2d');
		colCtx.clearRect(0,0,colSel.width,colSel.height);
	}
}

NgChm.SUM.clearTopItems = function(){
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

NgChm.SUM.drawTopItems = function(){
	NgChm.SUM.clearTopItems();
	var summaryCanvas = document.getElementById("summary_canvas");
	var colCanvas = document.getElementById("summary_col_top_items_canvas");
	var rowCanvas = document.getElementById("summary_row_top_items_canvas");
	if (summaryCanvas == null || rowCanvas == null || colCanvas == null) {
		return;
	}
	var colTopItemsIndex = [];
	var rowTopItemsIndex = [];
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
	NgChm.SUM.chmElement.appendChild(referenceItem);

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
		item.innerHTML = NgChm.UTIL.getLabelText(labels[topItemIndex[index]].split("|")[0],axis);
		if (!isRow){
			item.style.transform = "rotate(90deg)";
		}
		NgChm.SUM.chmElement.appendChild(item);
		item.style.top = (isRow ? rowCanvas.offsetTop + positionArray[topItemIndex[index]]*rowCanvas.clientHeight - item.offsetHeight/2 : colTop + item.offsetWidth/2) + 'px';
		item.style.left = (isRow ? rowLeft: colCanvas.offsetLeft+ positionArray[topItemIndex[index]]*colCanvas.clientWidth - item.offsetWidth/2) + 'px';
		return item;
	}
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

NgChm.SUM.onMouseUpSelRowCanvas = function(evt) {
	evt.preventDefault();
	evt.stopPropagation();
	//When doing a shift drag, this block will actually do the selection on mouse up.
	var sumOffsetX = evt.touches ? evt.layerX : evt.offsetX;
	var sumOffsetY = evt.touches ? evt.layerY : evt.offsetY;
	var xPos = NgChm.SUM.getCanvasX(sumOffsetX);
	var yPos = NgChm.SUM.getCanvasY(sumOffsetY);
	var sumRow = NgChm.SUM.canvasToMatrixRow(yPos) - Math.floor(NgChm.SEL.getCurrentSumDataPerCol(NgChm.DMM.primaryMap)/2);
	NgChm.SEL.setCurrentRowFromSum(NgChm.DMM.primaryMap, sumRow);
	NgChm.SEL.updateSelection(NgChm.DMM.primaryMap);
	NgChm.SUM.clickStartRow = null;
	NgChm.SUM.clickStartCol = null;
	//Make sure the selected row/column are within the bounds of the matrix.
	NgChm.SEL.checkRow(NgChm.DMM.primaryMap);
	NgChm.SEL.checkCol(NgChm.DMM.primaryMap);
	NgChm.SUM.mouseEventActive = false;
}

NgChm.SUM.onMouseUpSelColCanvas = function(evt) {
	evt.preventDefault();
	evt.stopPropagation();
	//When doing a shift drag, this block will actually do the selection on mouse up.
	var sumOffsetX = evt.touches ? evt.layerX : evt.offsetX;
	var sumOffsetY = evt.touches ? evt.layerY : evt.offsetY;
	var xPos = NgChm.SUM.getCanvasX(sumOffsetX);
	var yPos = NgChm.SUM.getCanvasY(sumOffsetY);
	var sumCol = NgChm.SUM.canvasToMatrixCol(xPos) - Math.floor(NgChm.SEL.getCurrentSumDataPerRow(NgChm.DMM.primaryMap)/2);
	NgChm.SEL.setCurrentColFromSum(NgChm.DMM.primaryMap, sumCol);
	NgChm.SEL.updateSelection(NgChm.DMM.primaryMap);
	NgChm.SUM.clickStartRow = null;
	NgChm.SUM.clickStartCol = null;
	//Make sure the selected row/column are within the bounds of the matrix.
	NgChm.SEL.checkRow(NgChm.DMM.primaryMap);
	NgChm.SEL.checkCol(NgChm.DMM.primaryMap);
	NgChm.SUM.mouseEventActive = false;
}

NgChm.SUM.getTouchEventOffset = function (evt) {
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

(function() {
	// Define a function to switch a panel to the summary view.
	NgChm.SUM.switchPaneToSummary = switchPaneToSummary;
	NgChm.Pane.registerPaneContentOption ('Summary heatmap', switchPaneToSummary);
	NgChm.SUM.summaryPaneResizeHandler = resizeSummaryPane;

	// There is a single summary view that, at any particular time,
	// may or may not be displayed in a visible pane.
	// If a pane showing the summary view is switched to something else,
	// we remove the summary view elements but preserve them in savedChmElements.
	// These elements are then copied back into the DOM when switchPaneToSummary is called.

	// NgChm.SUM.chmElement is set to a DOM element iff the summary NG-CHM is
	// contained in a visible pane.  If NgChm.SUM.chmElement == null, the summary
	// NG-CHM is not visible.

	var savedChmElements = [];
	var firstSwitch = true;

	function switchPaneToSummary (loc) {
		if (firstSwitch) {
			// This is the first time a summary NGCHM is displayed.
			// Simply move the template element into the target pane.
			NgChm.Pane.emptyPaneLocation (loc);
			NgChm.SUM.chmElement = document.getElementById('summary_chm');
			loc.pane.appendChild (NgChm.SUM.chmElement);
			firstSwitch = false;
		} else {
			NgChm.Pane.clearExistingGearDialog(loc.pane.id);
			// The summary NGCHM has already been created.
			if (savedChmElements.length > 0) {
				// The summary NGCHM not is currently showing in a pane.
				NgChm.Pane.emptyPaneLocation (loc);
			} else {
				// The summary NGCHM is currently showing in a pane.
				const oldLoc = NgChm.Pane.findPaneLocation (NgChm.SUM.chmElement);
				// Check that the current and target panes are different.
				if (oldLoc.pane === loc.pane) return;
				// Empty the target pane.
				NgChm.Pane.emptyPaneLocation (loc);
				// Remove the summary NGCHM from its current pane
				// and save contents in savedChmElements.
				NgChm.Pane.emptyPaneLocation (oldLoc);
			}
			// Move the saved summary NGCHM view into the target pane.
			while (savedChmElements.length > 0) {
				const el = savedChmElements.shift();
				if (el.id === 'summary_chm') NgChm.SUM.chmElement = el;
				loc.pane.appendChild (el);
			}
		}
		NgChm.SUM.chmElement.style.display = '';
		NgChm.Pane.setPaneTitle (loc, 'Summary View');
		NgChm.Pane.registerPaneEventHandler (loc.pane, 'empty', emptySummaryPane);
		NgChm.Pane.registerPaneEventHandler (loc.pane, 'resize', resizeSummaryPane);
	}

	// This function is called when a pane showing the summary NG-CHM is emptied.
	// Preserve the removed elements and clear NgChm.SUM.chmElement.
	function emptySummaryPane (pane, elements) {
		savedChmElements = elements;
		NgChm.SUM.chmElement = null;
	}

	// This function is called when a pane showing the summary NG-CHM is resized.
	// Calculate a new layout and redraw the pane's contents.
	function resizeSummaryPane (loc) {
		NgChm.SUM.calcSummaryLayout();
		NgChm.SUM.redrawSummaryPane ();
	}
})();
