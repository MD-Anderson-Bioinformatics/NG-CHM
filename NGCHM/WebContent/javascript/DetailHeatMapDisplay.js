//Define Namespace for NgChm DetailHeatMapDisplay
NgChm.createNS('NgChm.DET');

NgChm.DET.canvas;
NgChm.DET.boxCanvas;  //canvas on top of WebGL canvas for selection box 
NgChm.DET.gl; // WebGL contexts
NgChm.DET.textureParams;
NgChm.DET.texPixels;
NgChm.DET.uScale;
NgChm.DET.uTranslate;

NgChm.DET.canvasScaleArray = new Float32Array([1.0, 1.0]);
NgChm.DET.canvasTranslateArray = new Float32Array([0, 0]);

NgChm.DET.labelElement; 
NgChm.DET.chmElement;
NgChm.DET.oldMousePos = [0, 0];
NgChm.DET.eventTimer = 0; // Used to delay draw updates

NgChm.DET.saveRow;
NgChm.DET.saveCol;
NgChm.DET.dataBoxHeight;
NgChm.DET.dataBoxWidth;

NgChm.DET.paddingHeight = 2;          // space between classification bars
NgChm.DET.dendroHeight = 105;
NgChm.DET.dendroWidth = 105;
NgChm.DET.normDendroMatrixHeight = 200;
NgChm.DET.rowDendroMatrix
NgChm.DET.colDendroMatrix;
NgChm.DET.SIZE_NORMAL_MODE = 506;
NgChm.DET.dataViewHeight = 506;
NgChm.DET.dataViewWidth = 506;
NgChm.DET.dataViewBorder = 2;
NgChm.DET.zoomBoxSizes = [1,2,3,4,6,7,8,9,12,14,18,21,24,28,36,42,56,63,72,84,126,168,252];
NgChm.DET.minLabelSize = 5;
NgChm.DET.maxLabelSize = 11;
NgChm.DET.currentSearchItem = {};
NgChm.DET.labelLastClicked = {};

NgChm.DET.mouseDown = false;
NgChm.DET.dragOffsetX;
NgChm.DET.dragOffsetY;
NgChm.DET.detailPoint;

NgChm.DET.rowLabelLen = 0;
NgChm.DET.colLabelLen = 0;
NgChm.DET.rowLabelFont = 0;
NgChm.DET.colLabelFont = 0;
NgChm.DET.colClassLabelFont = 0;
NgChm.DET.rowClassLabelFont = 0;


//Call once to hook up detail drawing routines to a heat map and initialize the webGl 
NgChm.DET.initDetailDisplay = function () {
	NgChm.DET.canvas = document.getElementById('detail_canvas');
	NgChm.DET.boxCanvas = document.getElementById('detail_box_canvas');
	NgChm.DET.labelElement = document.getElementById('labelDiv');
	NgChm.DET.chmElement = document.getElementById('detail_chm');

	if (NgChm.SEL.isSub) {
 		document.getElementById('summary_chm').style.display = 'none';
 		document.getElementById('divider').style.display = 'none';
 		document.getElementById('detail_chm').style.width = '100%';
 		document.getElementById('flicks').style.display = '';
 		document.getElementById('detail_buttons').style.display = '';
 		document.getElementById('split_btn').src= NgChm.staticPath + "images/join.png";
 		document.getElementById('gear_btn').src= NgChm.staticPath + "images/gearDis.png";
 		document.getElementById('pdf_btn').style.display = 'none';
	}
	if (NgChm.heatMap.isInitialized() > 0) {
 		document.getElementById('flicks').style.display = '';
		document.getElementById('detail_buttons').style.display = '';
		NgChm.DET.canvas.width =  (NgChm.DET.dataViewWidth + NgChm.DET.calculateTotalClassBarHeight("row") + NgChm.DET.dendroWidth);
		NgChm.DET.canvas.height = (NgChm.DET.dataViewHeight + NgChm.DET.calculateTotalClassBarHeight("column") + NgChm.DET.dendroHeight);
		NgChm.DET.detSetupGl();
		NgChm.DET.detInitGl();
		NgChm.LNK.createLabelMenus();
		NgChm.SEL.updateSelection();
	}
	
	NgChm.DET.canvas.oncontextmenu = NgChm.DET.matrixRightClick;
	NgChm.DET.canvas.onmousedown = NgChm.DET.clickStart;
	NgChm.DET.canvas.onmouseup = NgChm.DET.clickEnd;
	NgChm.DET.canvas.onmousemove = NgChm.DET.handleMouseMove;
	NgChm.DET.canvas.onmouseout = NgChm.DET.handleMouseOut;
	NgChm.DET.canvas.onkeydown = NgChm.SEL.keyNavigate;

	document.addEventListener("touchmove", function(e){
		e.preventDefault();
		if (e.touches){
	    	if (e.touches.length > 1){
	    		return false;
	    	}
	    }
	})
	NgChm.DET.canvas.addEventListener("touchstart", function(e){
		NgChm.UHM.userHelpClose();
		NgChm.DET.clickStart(e);
	}, false);
	NgChm.DET.canvas.addEventListener("touchmove", function(e){
		e.stopPropagation();
		e.preventDefault();
		NgChm.DET.handleMouseMove(e);
	}, false);
	NgChm.DET.canvas.addEventListener("touchend", function(e){NgChm.DET.clickEnd(e)}, false);
	
	NgChm.DET.canvas.addEventListener("gestureend",function(e){
		if (e.scale > 1){
			NgChm.DET.detailDataZoomIn();
		} else if (e.scale < 1){
			NgChm.DET.detailDataZoomOut();
		}
	},false)
	
}

/*********************************************************************************************
 * FUNCTION:  getCursorPosition
 * 
 * The purpose of this function is to return the cursor position over the canvas.  
 *********************************************************************************************/
NgChm.DET.getCursorPosition = function (e) {
    var x = e.touches ? e.touches[0].clientX : e.offsetX;
    var y = e.touches ? e.touches[0].clientY : e.offsetY;
    return {x:x, y:y}
}

/*********************************************************************************************
 * FUNCTION:  clickStart
 * 
 * The purpose of this function is to handle a user mouse down event.  
 *********************************************************************************************/
NgChm.DET.clickStart = function (e) {
	e.preventDefault();
	NgChm.SUM.mouseEventActive = true;
	var clickType = NgChm.DET.getClickType(e);
	NgChm.UHM.userHelpClose();
	if (clickType === 0) { 
		NgChm.DET.canvas = document.getElementById('detail_canvas');
		var coords = NgChm.DET.getCursorPosition(e);
		NgChm.DET.dragOffsetX = coords.x;  //canvas X coordinate 
		NgChm.DET.dragOffsetY = coords.y;
		NgChm.DET.mouseDown = true;
		// client space
		var divW = e.target.clientWidth;
		var divH = e.target.clientHeight;
		// texture space
		var rowTotalW = NgChm.DET.dataViewWidth + NgChm.DET.calculateTotalClassBarHeight("row") + NgChm.DET.dendroWidth;
		var colTotalH = NgChm.DET.dataViewHeight + NgChm.DET.calculateTotalClassBarHeight("column") + NgChm.DET.dendroHeight;
		// proportion space
		var rowDendroW = NgChm.DET.dendroWidth/rowTotalW;
		var colDendroH = NgChm.DET.dendroHeight/colTotalH;
		var rowClassW = NgChm.DET.calculateTotalClassBarHeight("row")/rowTotalW;
		var colClassH = NgChm.DET.calculateTotalClassBarHeight("column")/colTotalH;
		var mapW = NgChm.DET.dataViewWidth/rowTotalW;
		var mapH = NgChm.DET.dataViewHeight/colTotalH;
		var clickX = coords.x/divW;
		var clickY = coords.y/divH;
		if (clickX > rowDendroW + rowClassW && clickY < colDendroH){ // col dendro clicked
			var heightRatio = NgChm.heatMap.getNumColumns(NgChm.MMGR.DETAIL_LEVEL)/NgChm.SEL.dataPerRow;
			var X = (NgChm.SEL.currentCol + (NgChm.SEL.dataPerRow*(clickX-rowDendroW-rowClassW)/mapW));
			var Y = (colDendroH-clickY)/colDendroH/heightRatio;
			var matrixX = Math.round(X*3-2);
			var matrixY = Math.round(Y*NgChm.SUM.colDendro.getDendroMatrixHeight());
			var extremes = NgChm.SUM.colDendro.findExtremes(matrixY,matrixX);
			if (extremes){
				NgChm.DET.colDendroMatrix = NgChm.DET.buildDetailDendroMatrix('col', NgChm.SEL.currentCol, NgChm.SEL.currentCol+NgChm.SEL.dataPerRow, NgChm.heatMap.getNumColumns(NgChm.MMGR.DETAIL_LEVEL)/NgChm.SEL.dataPerRow);	
				NgChm.SUM.colDendro.addSelectedBar(extremes,e.shiftKey);
				NgChm.DET.detailDrawColDendrogram(NgChm.DET.texPixels);
			}
			NgChm.SUM.clearSelectionMarks();
			NgChm.SEL.updateSelection();
			NgChm.SUM.drawColSelectionMarks();
			NgChm.SUM.drawRowSelectionMarks();
		} else if (clickX < rowDendroW && clickY > colDendroH + colClassH){ // row dendro clicked
			var heightRatio = NgChm.heatMap.getNumRows(NgChm.MMGR.DETAIL_LEVEL)/NgChm.SEL.dataPerCol;
			var X = (NgChm.SEL.currentRow + (NgChm.SEL.dataPerCol*(clickY-colDendroH-colClassH)/mapH));
			var Y = (rowDendroW-clickX)/rowDendroW/heightRatio; // this is a percentage of how high up on the entire dendro matrix (not just the detail view) the click occured
			var matrixX = Math.round(X*3-2);
			var matrixY = Math.round(Y*NgChm.SUM.rowDendro.getDendroMatrixHeight());
			var extremes = NgChm.SUM.rowDendro.findExtremes(matrixY,matrixX);
			if (extremes){
				NgChm.DET.rowDendroMatrix = NgChm.DET.buildDetailDendroMatrix('row', NgChm.SEL.currentRow, NgChm.SEL.currentRow+NgChm.SEL.dataPerCol, NgChm.heatMap.getNumRows(NgChm.MMGR.DETAIL_LEVEL)/NgChm.SEL.dataPerCol);
				NgChm.SUM.rowDendro.addSelectedBar(extremes,e.shiftKey);
				NgChm.DET.detailDrawRowDendrogram(NgChm.DET.texPixels);
			}
			NgChm.SUM.clearSelectionMarks();
			NgChm.SEL.updateSelection();
			NgChm.SUM.drawColSelectionMarks();
			NgChm.SUM.drawRowSelectionMarks();
		}
	    
	    if (NgChm.DET.isOnObject(e,"map")) {
			//Set cursor for drag move or drag select
			if (e.shiftKey) {
				NgChm.DET.canvas.style.cursor="crosshair";
		    }
		    else {
				NgChm.DET.canvas.style.cursor="move";
		    }
	    }
	}
}

/*********************************************************************************************
 * FUNCTION:  clickEnd
 * 
 * The purpose of this function is to handle a user mouse up event.  If the mouse has not 
 * moved out of a given detail row/col between clickStart and clickEnd, user help is opened
 * for that cell.
 *********************************************************************************************/
NgChm.DET.clickEnd = function (e) {
	if (NgChm.SUM.mouseEventActive) {
		var clickType = NgChm.DET.getClickType(e);
		if (clickType === 0) {
			NgChm.DET.mouseDown = false;
//			var dragEndX = e.changedTouches ? e.changedTouches[0].pageX : e.layerX;  //etouches is for tablets = number of fingers touches on screen
//			var dragEndY = e.changedTouches ? e.changedTouches[0].pageY : e.layerY;
			var coords = NgChm.DET.getCursorPosition(e);
			var dragEndX = coords.x;  //etouches is for tablets = number of fingers touches on screen
			var dragEndY = coords.y;
			var rowElementSize = NgChm.DET.dataBoxWidth * NgChm.DET.canvas.clientWidth/NgChm.DET.canvas.width;
		    var colElementSize = NgChm.DET.dataBoxHeight * NgChm.DET.canvas.clientHeight/NgChm.DET.canvas.height;
		    //If cursor did not move from the column/row between click start/end, display User Help
			if (Math.abs(dragEndX - NgChm.DET.dragOffsetX) < colElementSize/10 && Math.abs(dragEndY - NgChm.DET.dragOffsetY) < rowElementSize/10){
				NgChm.UHM.userHelpOpen(e);
			}
			//Set cursor back to default
			NgChm.DET.canvas.style.cursor="default";
		}
		NgChm.SUM.mouseEventActive = false;
	}
}

/*********************************************************************************************
 * FUNCTION:  handleMouseOut
 * 
 * The purpose of this function is to handle the situation where the user clicks on and drags
 * off the detail canvas without letting up the mouse button.  In these cases, we cancel 
 * the mouse event that we are tracking, reset mouseDown, and reset the cursor to default.
 *********************************************************************************************/
NgChm.DET.handleMouseOut = function (e) {
	NgChm.DET.canvas.style.cursor="default";
    NgChm.DET.mouseDown = false;
	NgChm.SUM.mouseEventActive = false;
}

/*********************************************************************************************
 * FUNCTION:  getClickType
 * 
 * The purpose of this function returns an integer. 0 for left click; 1 for right.  It could
 * be expanded further for wheel clicks, browser back, and browser forward 
 *********************************************************************************************/
NgChm.DET.getClickType = function (e) {
	 var clickType = 0;
	 e = e || window.event;
	 if ( !e.which && (typeof e.button !== 'undefined') ) {
	    e.which = ( e.button & 1 ? 1 : ( e.button & 2 ? 3 : ( e.button & 4 ? 2 : 0 ) ) );
	 }
	 switch (e.which) {
	    case 3: clickType = 1;
	    break; 
	}
	 return clickType;
}

/*********************************************************************************************
 * FUNCTION:  handleMouseMove
 * 
 * The purpose of this function is to handle a user drag event.  The type of move (drag-move or
 * drag-select is determined, based upon keys pressed and the appropriate function is called
 * to perform the function.
 *********************************************************************************************/
NgChm.DET.handleMouseMove = function (e) {
    // Do not clear help if the mouse position did not change. Repeated firing of the mousemove event can happen on random 
    // machines in all browsers but FireFox. There are varying reasons for this so we check and exit if need be.
	var eX = e.touches ? e.touches[0].clientX : e.clientX;
	var eY = e.touches ? e.touches[0].clientY : e.clientY;
	if(NgChm.DET.oldMousePos[0] != eX || NgChm.DET.oldMousePos[1] != eY) {
		NgChm.DET.oldMousePos = [eX, eY];
	} 
	if (NgChm.DET.mouseDown && NgChm.SUM.mouseEventActive){
		//If mouse is down and shift key is pressed, perform a drag selection
		//Else perform a drag move
		if (e.shiftKey) {
			NgChm.DET.clearSearch(e);
			NgChm.DET.handleSelectDrag(e);
	    }
	    else {
    		NgChm.DET.handleMoveDrag(e);
	    }
	} 
}

/*********************************************************************************************
 * FUNCTION:  handleMoveDrag
 * 
 * The purpose of this function is to handle a user "move drag" event.  This is when the user
 * clicks and drags across the detail heat map viewport. When this happens, the current position
 * of the heatmap viewport is changed and the detail heat map is redrawn 
 *********************************************************************************************/
NgChm.DET.handleMoveDrag = function (e) {
    if(!NgChm.DET.mouseDown) return;
    var rowElementSize = NgChm.DET.dataBoxWidth * NgChm.DET.canvas.clientWidth/NgChm.DET.canvas.width;
    var colElementSize = NgChm.DET.dataBoxHeight * NgChm.DET.canvas.clientHeight/NgChm.DET.canvas.height;
    if (e.touches){  //If more than 2 fingers on, don't do anything
    	if (e.touches.length > 1){
    		return false;
    	}
    } 
	var coords = NgChm.DET.getCursorPosition(e);
//    var xDrag = e.touches ? e.layerX - NgChm.DET.dragOffsetX : e.layerX - NgChm.DET.dragOffsetX;
//    var yDrag = e.touches ? e.layerY - NgChm.DET.dragOffsetY : e.layerY - NgChm.DET.dragOffsetY;
    var xDrag = e.touches ? coords.x - NgChm.DET.dragOffsetX : coords.x - NgChm.DET.dragOffsetX;
    var yDrag = e.touches ? coords.y - NgChm.DET.dragOffsetY : coords.y - NgChm.DET.dragOffsetY;
    if ((Math.abs(xDrag/rowElementSize) > 1) || (Math.abs(yDrag/colElementSize) > 1)) {
    	NgChm.SEL.currentRow = Math.round(NgChm.SEL.currentRow - (yDrag/colElementSize));
    	NgChm.SEL.currentCol = Math.round(NgChm.SEL.currentCol - (xDrag/rowElementSize));
		NgChm.DET.dragOffsetX = coords.x;  //canvas X coordinate 
		NgChm.DET.dragOffsetY = coords.y;
	    NgChm.SEL.checkRow();
	    NgChm.SEL.checkColumn();
	    NgChm.SEL.updateSelection();
    } 
}	

/*********************************************************************************************
 * FUNCTION:  handleSelectDrag
 * 
 * The purpose of this function is to handle a user "select drag" event.  This is when the user
 * clicks, holds down the SHIFT key, and drags across the detail heat map viewport. Starting
 * and ending row/col positions are calculated and the row/col search items arrays are populated
 * with those positions (representing selected items on each axis).  Finally, selection marks
 * on the Summary heatmap are drawn and the detail heat map is re-drawn 
 *********************************************************************************************/
NgChm.DET.handleSelectDrag = function (e) {
    if(!NgChm.DET.mouseDown) return;
    var rowElementSize = NgChm.DET.dataBoxWidth * NgChm.DET.canvas.clientWidth/NgChm.DET.canvas.width;
    var colElementSize = NgChm.DET.dataBoxHeight * NgChm.DET.canvas.clientHeight/NgChm.DET.canvas.height;
    if (e.touches){  //If more than 2 fingers on, don't do anything
    	if (e.touches.length > 1){
    		return false;
    	}
    }
	var coords = NgChm.DET.getCursorPosition(e);
    var xDrag = e.touches ? e.touches[0].layerX - NgChm.DET.dragOffsetX : coords.x - NgChm.DET.dragOffsetX;
    var yDrag = e.touches ? e.touches[0].layerY - NgChm.DET.dragOffsetY : coords.y - NgChm.DET.dragOffsetY;
    
    if ((Math.abs(xDrag/rowElementSize) > 1) || (Math.abs(yDrag/colElementSize) > 1)) {
    	//Retrieve drag corners but set to max/min values in case user is dragging
    	//bottom->up or left->right.
    	var endRow = Math.max(NgChm.DET.getRowFromLayerY(coords.y),NgChm.DET.getRowFromLayerY(NgChm.DET.dragOffsetY));
    	var endCol = Math.max(NgChm.DET.getColFromLayerX(coords.x),NgChm.DET.getColFromLayerX(NgChm.DET.dragOffsetX));
		var startRow = Math.min(NgChm.DET.getRowFromLayerY(coords.y),NgChm.DET.getRowFromLayerY(NgChm.DET.dragOffsetY));
		var startCol = Math.min(NgChm.DET.getColFromLayerX(coords.x),NgChm.DET.getColFromLayerX(NgChm.DET.dragOffsetX));
		NgChm.DET.clearSearch(e);
    	for (var i = startRow; i <= endRow; i++){
    		NgChm.SEL.searchItems["Row"][i] = 1;
    	}
    	for (var i = startCol; i <= endCol; i++){
    		NgChm.SEL.searchItems["Column"][i] = 1;
    	}
    	if (NgChm.SEL.isSub){
    		localStorage.setItem('selected', JSON.stringify(NgChm.SEL.searchItems));
    	} else {
    		NgChm.SUM.drawRowSelectionMarks();
    		NgChm.SUM.drawColSelectionMarks();
    	}
	   	 NgChm.DET.clearLabels();
		 NgChm.DET.drawSelections();
		 NgChm.DET.drawRowAndColLabels();
		 NgChm.DET.detailDrawColClassBarLabels();
		 NgChm.DET.detailDrawRowClassBarLabels();
    }
}	

/*********************************************************************************************
 * FUNCTIONS:  getRowFromLayerY AND getColFromLayerX
 * 
 * The purpose of this function is to retrieve the row/col in the data matrix that matched a given
 * mouse location.  They utilize event.layerY/X for the mouse position.
 *********************************************************************************************/
NgChm.DET.getRowFromLayerY = function (layerY) {
    var rowElementSize = NgChm.DET.dataBoxWidth * NgChm.DET.canvas.clientWidth/NgChm.DET.canvas.width; // px/Glpoint
    var colElementSize = NgChm.DET.dataBoxHeight * NgChm.DET.canvas.clientHeight/NgChm.DET.canvas.height;
	var colClassHeightPx = NgChm.DET.getColClassPixelHeight();
	var colDendroHeightPx = NgChm.DET.getColDendroPixelHeight();
	var mapLocY = layerY - colClassHeightPx - colDendroHeightPx;
	return Math.floor(NgChm.SEL.currentRow + (mapLocY/colElementSize)*NgChm.DET.getSamplingRatio('row'));
}

NgChm.DET.getColFromLayerX = function (layerX) {
    var rowElementSize = NgChm.DET.dataBoxWidth * NgChm.DET.canvas.clientWidth/NgChm.DET.canvas.width; // px/Glpoint
    var colElementSize = NgChm.DET.dataBoxHeight * NgChm.DET.canvas.clientHeight/NgChm.DET.canvas.height;
	var rowClassWidthPx = NgChm.DET.getRowClassPixelWidth();
	var rowDendroWidthPx =  NgChm.DET.getRowDendroPixelWidth();
	var mapLocX = layerX - rowClassWidthPx - rowDendroWidthPx;
	return Math.floor(NgChm.SEL.currentCol + (mapLocX/rowElementSize)*NgChm.DET.getSamplingRatio('col'));
}

/*********************************************************************************************
 * FUNCTIONS:  getDetCanvasYFromRow AND getDetCanvasXFromCol
 * 
 * Given a detail matrix row, these function return the canvas Y (vertical) OR canvas x 
 * (or horizontal) position. 
 *********************************************************************************************/
NgChm.DET.getDetCanvasYFromRow = function (row) {
	return ((row*(NgChm.DET.dataViewHeight/NgChm.SEL.getCurrentDetDataPerCol())) + NgChm.DET.getDetColMapOffset());
}

NgChm.DET.getDetCanvasXFromCol = function (col) {
	return ((col*(NgChm.DET.dataViewWidth/NgChm.SEL.getCurrentDetDataPerRow())) + NgChm.DET.getDetRowMapOffset());
}

/*********************************************************************************************
 * FUNCTIONS:  getDetRowMapOffset AND getDetColMapOffset
 * 
 * These functions return the col/row offset of position 0,0 on the heatmap from the top of 
 * the detail canvas.  The position includes the dendro, classbar, and border
 *********************************************************************************************/
NgChm.DET.getDetColMapOffset = function () {
	return (NgChm.DET.calculateTotalClassBarHeight("column") + NgChm.DET.dendroHeight);
}

NgChm.DET.getDetRowMapOffset = function () {
	return (NgChm.DET.calculateTotalClassBarHeight("row") + NgChm.DET.dendroWidth);
}

/*********************************************************************************************
 * FUNCTION:  drawSelections
 * 
 * This function calls a function that will generate 2 arrays containing the contiguous search 
 * ranges (row/col).  It then iterates thru those arrays that users have selected and calls the 
 * function that will draw line OR boxes on the heatMap detail box canvas.  If either of the 
 * 2 arrays is empty, lines will be drawn otherwise boxes.  
 *********************************************************************************************/
NgChm.DET.drawSelections = function () {
	var ctx=NgChm.DET.boxCanvas.getContext("2d");
	ctx.clearRect(0, 0, NgChm.DET.boxCanvas.width, NgChm.DET.boxCanvas.height);
	//Retrieve contiguous row and column search arrays
	var searchRows = NgChm.DET.getSearchRows();
	var rowRanges = NgChm.DET.getContigSearchRanges(searchRows);
	var searchCols = NgChm.DET.getSearchCols();
	var colRanges = NgChm.DET.getContigSearchRanges(searchCols);
	if (rowRanges.length > 0 || colRanges.length > 0) {
    	NgChm.DET.showSrchBtns();
		if (rowRanges.length === 0) {
			//Draw horizontal lines across entire heatMap
			for (var i=0;i<colRanges.length;i++) {
				var range = colRanges[i];
				var colStart = range[0];
				var colEnd = range[1];
				NgChm.DET.drawSearchBox(0,NgChm.heatMap.getNumRows('d'),colStart,colEnd);
			}
		} else if (colRanges.length === 0) {
			//Draw vertical lines across entire heatMap
			for (var i=0;i<rowRanges.length;i++) {
				var range = rowRanges[i];
				var rowStart = range[0];
				var rowEnd = range[1];
				NgChm.DET.drawSearchBox(rowStart,rowEnd,0,NgChm.heatMap.getNumColumns('d'));
			}
		} else {
			for (var i=0;i<rowRanges.length;i++) {
				//Draw discrete selection boxes on heatMap
				var rowRange = rowRanges[i];
				var rowStart = rowRange[0];
				var rowEnd = rowRange[1];
				for (var j=0;j<colRanges.length;j++) {
					var colRange = colRanges[j];
					var colStart = colRange[0];
					var colEnd = colRange[1];
					NgChm.DET.drawSearchBox(rowStart,rowEnd,colStart,colEnd);
				}				
			}
		}
	}
}

/*********************************************************************************************
 * FUNCTION:  getContigSearchRanges
 * 
 * This function iterates thru a searchArray (searchRows or searchCols) and writes an array 
 * containing entries for each contiguous range selected in the /searchArray.  This array will 
 * contain sub-arrays that have 2 entries (one for starting position and the other for ending)
 *********************************************************************************************/
NgChm.DET.getContigSearchRanges = function (searchArr) {
	var ranges = [];
	var prevVal=searchArr[0];
	var startVal = searchArr[0];
	if (searchArr.length >  0) {
		for (var i=0;i<searchArr.length;i++) {
			var currVal = searchArr[i];
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
 * FUNCTION:  drawSearchBox
 * 
 * This function draws lines on the heatMap detail box canvas for each contiguous search 
 * range that the user has specified (by click dragging, label selecting, or dendro clicking).
 *********************************************************************************************/
NgChm.DET.drawSearchBox = function (csRowStart, csRowEnd, csColStart, csColEnd) {

	//top-left corner of visible area
	var topX = (((NgChm.DET.getDetRowMapOffset()) / NgChm.DET.canvas.width) * NgChm.DET.boxCanvas.width);
	var topY = ((NgChm.DET.getDetColMapOffset() / NgChm.DET.canvas.height) * NgChm.DET.boxCanvas.height);
	
	//height/width of heat map rectangle in pixels
	var mapXWidth = NgChm.DET.boxCanvas.width - topX;
	var mapYHeight = NgChm.DET.boxCanvas.height - topY;
	//height/width of a data cell in pixels
	var cellWidth = mapXWidth/NgChm.SEL.getCurrentDetDataPerRow();
	var cellHeight = mapYHeight/NgChm.SEL.getCurrentDetDataPerCol();
	//bottom-right corner of visible area
	var bottomX = topX + (NgChm.SEL.getCurrentDetDataPerCol()*cellWidth);
	var bottomY = topY + (NgChm.SEL.getCurrentDetDataPerRow()*cellHeight);
	
	//how much to move row/col offset from currentRow in pixels
	var adjustedRowStart = (csRowStart - NgChm.SEL.currentRow)*cellHeight;
	var adjustedColStart = (csColStart - NgChm.SEL.currentCol)*cellWidth;
	var adjustedRowEnd = ((csRowEnd - csRowStart)+1)*cellHeight;
	var adjustedColEnd = ((csColEnd - csColStart)+1)*cellWidth;
	
	//adjusted row/col start position (without regard to visibility in the viewport)
	var boxX = topX+adjustedColStart;
	var boxY = topY+adjustedRowStart;
	var boxX2 = boxX+adjustedColEnd;
	var boxY2 = boxY+adjustedRowEnd; 
	
	//Retrieve selection color for coloring search box
	var ctx=NgChm.DET.boxCanvas.getContext("2d");
	var dataLayers = NgChm.heatMap.getDataLayers();
	var dataLayer = dataLayers[NgChm.SEL.currentDl];
	ctx.lineWidth=3;
	ctx.strokeStyle=dataLayer.selection_color;

	// draw top horizontal line
	if (NgChm.DET.isHorizLineVisible(topY, boxY)) {
		NgChm.DET.drawHorizLine(topX,boxX, boxX2, boxY);
	}
	// draw left side line
	if (NgChm.DET.isVertLineVisible(topX, boxX)) {
		NgChm.DET.drawVertLine(topY, boxY, boxY2, boxX);
	}
	// draw bottom line
	if (NgChm.DET.isHorizLineVisible(topY, boxY2)) {
		NgChm.DET.drawHorizLine(topX,boxX, boxX2, boxY2);
	}
	// draw right side line
	if (NgChm.DET.isVertLineVisible(topX, boxX2)) {
		NgChm.DET.drawVertLine(topY, boxY, boxY2, boxX2);
	}
}

/*********************************************************************************************
 * FUNCTIONS:  isHorizLineVisible AND isVertLineVisible
 * 
 * These functions check the position of a horizontal/vertical line to see if it is currently 
 * visible in the detail viewport.
 *********************************************************************************************/
NgChm.DET.isHorizLineVisible = function (topY, boxY) {
	return (boxY >= topY);
}

NgChm.DET.isVertLineVisible = function (topX, boxX) {
	return (boxX >= topX);
}

/*********************************************************************************************
 * FUNCTIONS:  drawHorizLine AND drawVertLine
 * 
 * These functions call the logic necessary to draw a horizontal/vertical line on the detail 
 * viewport.   If only a portion of the line is visible on the top or left border, the length 
 * of the line will be amended to stop at the border.
 *********************************************************************************************/
NgChm.DET.drawHorizLine = function (topX, boxX, boxX2, boxY) {
	var lineStart = boxX >= topX ? boxX : topX;
	var lineEnd = boxX2 >= topX ? boxX2 : topX;
	if (lineStart !== lineEnd) {
		NgChm.DET.strokeLine(lineStart,boxY,lineEnd, boxY);
	}
}

NgChm.DET.drawVertLine = function (topY, boxY, boxY2, boxX) {
	var lineStart = boxY >= topY ? boxY : topY;
	var lineEnd = boxY2 >= topY ? boxY2 : topY;
	if (lineStart !== lineEnd) {
		NgChm.DET.strokeLine(boxX,lineStart,boxX, lineEnd);
	}
}

/*********************************************************************************************
 * FUNCTION:  strokeLine
 * 
 * This function draws lines on the heatMap detail box canvas for each contiguous search 
 * range that the user has specified (by click dragging, label selecting, or dendro clicking).
 *********************************************************************************************/
NgChm.DET.strokeLine = function (fromX, fromY, toX,toY) {
	var ctx=NgChm.DET.boxCanvas.getContext("2d");
	ctx.beginPath();
	ctx.moveTo(fromX,fromY);
	ctx.lineTo(toX, toY); 
	ctx.stroke(); 
}

NgChm.DET.getColClassPixelHeight = function () {
	var classbarHeight = NgChm.DET.calculateTotalClassBarHeight("column");
	return NgChm.DET.canvas.clientHeight*(classbarHeight/NgChm.DET.canvas.height);
}

NgChm.DET.getRowClassPixelWidth = function () {
	var classbarWidth = NgChm.DET.calculateTotalClassBarHeight("row");
	return NgChm.DET.canvas.clientWidth*(classbarWidth/NgChm.DET.canvas.width);
}

NgChm.DET.getColDendroPixelHeight = function () {
	return NgChm.DET.canvas.clientHeight*(NgChm.DET.dendroHeight/NgChm.DET.canvas.height);
}

NgChm.DET.getRowDendroPixelWidth = function () {
	return NgChm.DET.canvas.clientWidth*(NgChm.DET.dendroWidth/NgChm.DET.canvas.width);
}

NgChm.DET.isOnObject = function (e,type) {
    var rowClassWidthPx =  NgChm.DET.getRowClassPixelWidth();
    var colClassHeightPx = NgChm.DET.getColClassPixelHeight();
    var rowDendroWidthPx =  NgChm.DET.getRowDendroPixelWidth();
    var colDendroHeightPx = NgChm.DET.getColDendroPixelHeight();
	var coords = NgChm.DET.getCursorPosition(e);
    if (coords.y > colClassHeightPx + colDendroHeightPx) { 
    	if  ((type == "map") && coords.x > rowClassWidthPx + rowDendroWidthPx) {
    		return true;
    	}
    	if  ((type == "rowClass") && coords.x < rowClassWidthPx + rowDendroWidthPx && coords.x > rowDendroWidthPx) {
    		return true;
    	}
    } else if (coords.y > colDendroHeightPx) {
    	if  ((type == "colClass") && coords.x > rowClassWidthPx + rowDendroWidthPx) {
    		return true;
    	}
    }
    return false;
}	

NgChm.DET.detailDataZoomIn = function () {
	NgChm.UHM.userHelpClose();	
	if (NgChm.SEL.mode == 'NORMAL') {
		var current = NgChm.DET.zoomBoxSizes.indexOf(NgChm.DET.dataBoxWidth);
		if (current < NgChm.DET.zoomBoxSizes.length - 1) {
			NgChm.DET.setDetailDataSize (NgChm.DET.zoomBoxSizes[current+1]);
			NgChm.SEL.updateSelection();
		}
	} else if ((NgChm.SEL.mode == 'RIBBONH') || (NgChm.SEL.mode == 'RIBBONH_DETAIL')) {
		var current = NgChm.DET.zoomBoxSizes.indexOf(NgChm.DET.dataBoxHeight);
		if (current < NgChm.DET.zoomBoxSizes.length - 1) {
			NgChm.DET.setDetailDataHeight (NgChm.DET.zoomBoxSizes[current+1]);
			NgChm.SEL.updateSelection();
		}
	} else if ((NgChm.SEL.mode == 'RIBBONV') || (NgChm.SEL.mode == 'RIBBONV_DETAIL')) {
		var current = NgChm.DET.zoomBoxSizes.indexOf(NgChm.DET.dataBoxWidth);
		if (current < NgChm.DET.zoomBoxSizes.length - 1) {
			NgChm.DET.setDetailDataWidth(NgChm.DET.zoomBoxSizes[current+1]);
			NgChm.SEL.updateSelection();
		}
	}
}	

NgChm.DET.detailDataZoomOut = function () {
	NgChm.UHM.userHelpClose();	
	if (NgChm.SEL.mode == 'NORMAL') {
		var current = NgChm.DET.zoomBoxSizes.indexOf(NgChm.DET.dataBoxWidth);
		if ((current > 0) &&
		    (Math.floor((NgChm.DET.dataViewHeight-NgChm.DET.dataViewBorder)/NgChm.DET.zoomBoxSizes[current-1]) <= NgChm.heatMap.getNumRows(NgChm.MMGR.DETAIL_LEVEL)) &&
		    (Math.floor((NgChm.DET.dataViewWidth-NgChm.DET.dataViewBorder)/NgChm.DET.zoomBoxSizes[current-1]) <= NgChm.heatMap.getNumColumns(NgChm.MMGR.DETAIL_LEVEL))){
			NgChm.DET.setDetailDataSize (NgChm.DET.zoomBoxSizes[current-1]);
			NgChm.SEL.updateSelection();
		}	
	} else if ((NgChm.SEL.mode == 'RIBBONH') || (NgChm.SEL.mode == 'RIBBONH_DETAIL')) {
		var current = NgChm.DET.zoomBoxSizes.indexOf(NgChm.DET.dataBoxHeight);
		if ((current > 0) &&
		    (Math.floor((NgChm.DET.dataViewHeight-NgChm.DET.dataViewBorder)/NgChm.DET.zoomBoxSizes[current-1]) <= NgChm.heatMap.getNumRows(NgChm.MMGR.DETAIL_LEVEL))) {
			NgChm.DET.setDetailDataHeight (NgChm.DET.zoomBoxSizes[current-1]);
			NgChm.SEL.updateSelection();
		}	
	} else if ((NgChm.SEL.mode == 'RIBBONV') || (NgChm.SEL.mode == 'RIBBONV_DETAIL')){
		var current = NgChm.DET.zoomBoxSizes.indexOf(NgChm.DET.dataBoxWidth);
		if ((current > 0) &&
		    (Math.floor((NgChm.DET.dataViewWidth-NgChm.DET.dataViewBorder)/NgChm.DET.zoomBoxSizes[current-1]) <= NgChm.heatMap.getNumColumns(NgChm.MMGR.DETAIL_LEVEL))){
			NgChm.DET.setDetailDataWidth (NgChm.DET.zoomBoxSizes[current-1]);
			NgChm.SEL.updateSelection();
		}	
	}
}

//How big each data point should be in the detail pane.  
NgChm.DET.setDetailDataSize = function (size) {
	NgChm.DET.setDetailDataWidth (size);
	NgChm.DET.setDetailDataHeight(size);
}
 
//How big each data point should be in the detail pane.  
NgChm.DET.setDetailDataWidth = function (size) {
	var prevDataPerRow = NgChm.SEL.dataPerRow;
	NgChm.DET.dataBoxWidth = size;
	NgChm.SEL.setDataPerRowFromDet(Math.floor((NgChm.DET.dataViewWidth-NgChm.DET.dataViewBorder)/NgChm.DET.dataBoxWidth));

	//Adjust the current column based on zoom but don't go outside or the heat map matrix dimensions.
	if (prevDataPerRow != null) {
		if (prevDataPerRow > NgChm.SEL.dataPerRow) {
			NgChm.SEL.currentCol += Math.floor((prevDataPerRow - NgChm.SEL.dataPerRow) / 2);
		} else {
			NgChm.SEL.currentCol -= Math.floor((NgChm.SEL.dataPerRow - prevDataPerRow) / 2);
		}
		NgChm.SEL.checkColumn();
	}
}

//How big each data point should be in the detail pane.  
NgChm.DET.setDetailDataHeight = function (size) {
	var prevDataPerCol = NgChm.SEL.dataPerCol;
	NgChm.DET.dataBoxHeight = size;
	NgChm.SEL.setDataPerColFromDet(Math.floor((NgChm.DET.dataViewHeight-NgChm.DET.dataViewBorder)/NgChm.DET.dataBoxHeight));
	
	//Adjust the current row but don't go outside of the current heat map dimensions
	if (prevDataPerCol != null) {
		if (prevDataPerCol > NgChm.SEL.dataPerCol)
			NgChm.SEL.currentRow += Math.floor((prevDataPerCol - NgChm.SEL.dataPerCol) / 2);
		else
			NgChm.SEL.currentRow -= Math.floor((NgChm.SEL.dataPerCol - prevDataPerCol) / 2);
		NgChm.SEL.checkRow();
	}
}

NgChm.DET.detailHRibbonButton = function () {
	NgChm.DDR.clearDendroSelection();
	NgChm.DET.detailHRibbon();
}

NgChm.DET.detailVRibbonButton = function () {
	NgChm.DDR.clearDendroSelection();
	NgChm.DET.detailVRibbon();
}

//Change to horizontal ribbon view.  Note there is a standard full ribbon view and also a sub-selection
//ribbon view if the user clicks on the dendrogram.  If a dendrogram selection is in effect, then
//selectedStart and selectedStop will be set.
NgChm.DET.detailHRibbon = function () {
	NgChm.UHM.userHelpClose();	
	var previousMode = NgChm.SEL.mode;
	var prevWidth = NgChm.DET.dataBoxWidth;
	NgChm.DET.saveCol = NgChm.SEL.currentCol;
	
		
	NgChm.SEL.mode='RIBBONH';
	NgChm.DET.setButtons();
	
	// If normal (full) ribbon, set the width of the detail display to the size of the horizontal ribbon view
	// and data size to 1.
	if (NgChm.SEL.selectedStart == null || NgChm.SEL.selectedStart == 0) {
		NgChm.DET.dataViewWidth = NgChm.heatMap.getNumColumns(NgChm.MMGR.RIBBON_HOR_LEVEL) + NgChm.DET.dataViewBorder;
		var ddw = 1;
		while(2*NgChm.DET.dataViewWidth < 500){ // make the width wider to prevent blurry/big dendros for smaller maps
			ddw *=2;
			NgChm.DET.dataViewWidth = ddw*NgChm.heatMap.getNumColumns(NgChm.MMGR.RIBBON_HOR_LEVEL) + NgChm.DET.dataViewBorder;
		}
		NgChm.DET.setDetailDataWidth(ddw);
		NgChm.SEL.currentCol = 1;
	} else {
		NgChm.DET.saveCol = NgChm.SEL.selectedStart;
		var selectionSize = NgChm.SEL.selectedStop - NgChm.SEL.selectedStart + 1;
		if (selectionSize < 500) {
			NgChm.SEL.mode='RIBBONH_DETAIL'
		} else {
			var rvRate = NgChm.heatMap.getColSummaryRatio(NgChm.MMGR.RIBBON_HOR_LEVEL);
			selectionSize = Math.floor(selectionSize/rvRate);
		}
		var width = Math.max(1, Math.floor(500/selectionSize));
		NgChm.DET.dataViewWidth = (selectionSize * width) + NgChm.DET.dataViewBorder;
		NgChm.DET.setDetailDataWidth(width);	
		NgChm.SEL.currentCol = NgChm.SEL.selectedStart;
	}
	
	NgChm.DET.dataViewHeight = NgChm.DET.SIZE_NORMAL_MODE;
	if ((previousMode=='RIBBONV') || (previousMode == 'RIBBONV_DETAIL')) {
		NgChm.DET.setDetailDataHeight(prevWidth);
		NgChm.SEL.currentRow=NgChm.DET.saveRow;
	}	

	//On some maps, one view (e.g. ribbon view) can show bigger data areas than will fit for other view modes.  If so, zoom back out to find a workable zoom level.
	while (Math.floor((NgChm.DET.dataViewHeight-NgChm.DET.dataViewBorder)/NgChm.DET.zoomBoxSizes[NgChm.DET.zoomBoxSizes.indexOf(NgChm.DET.dataBoxHeight)]) > NgChm.heatMap.getNumRows(NgChm.MMGR.DETAIL_LEVEL)) {
		NgChm.DET.setDetailDataHeight(NgChm.DET.zoomBoxSizes[NgChm.DET.zoomBoxSizes.indexOf(NgChm.DET.dataBoxHeight)+1]);
	}	
	
	NgChm.DET.canvas.width =  (NgChm.DET.dataViewWidth + NgChm.DET.calculateTotalClassBarHeight("row") + NgChm.DET.dendroWidth);
	NgChm.DET.canvas.height = (NgChm.DET.dataViewHeight + NgChm.DET.calculateTotalClassBarHeight("column") + NgChm.DET.dendroHeight);
	NgChm.DET.detSetupGl();
	NgChm.DET.detInitGl();
	NgChm.SEL.updateSelection();
	document.getElementById("viewport").setAttribute("content", "height=device-height");
    document.getElementById("viewport").setAttribute("content", "");
}

NgChm.DET.detailVRibbon = function () {
	NgChm.UHM.userHelpClose();	
	var previousMode = NgChm.SEL.mode;
	var prevHeight = NgChm.DET.dataBoxHeight;
	NgChm.DET.saveRow = NgChm.SEL.currentRow;
	
	NgChm.SEL.mode='RIBBONV';
	NgChm.DET.setButtons();

	// If normal (full) ribbon, set the width of the detail display to the size of the horizontal ribbon view
	// and data size to 1.
	if (NgChm.SEL.selectedStart == null || NgChm.SEL.selectedStart == 0) {
		NgChm.DET.dataViewHeight = NgChm.heatMap.getNumRows(NgChm.MMGR.RIBBON_VERT_LEVEL) + NgChm.DET.dataViewBorder;
		var ddh = 1;
		while(2*NgChm.DET.dataViewHeight < 500){ // make the height taller to prevent blurry/big dendros for smaller maps
			ddh *=2;
			NgChm.DET.dataViewHeight = ddh*NgChm.heatMap.getNumRows(NgChm.MMGR.RIBBON_VERT_LEVEL) + NgChm.DET.dataViewBorder;
		}
		NgChm.DET.setDetailDataHeight(ddh);
		NgChm.SEL.currentRow = 1;
	} else {
		NgChm.DET.saveRow = NgChm.SEL.selectedStart;
		var selectionSize = NgChm.SEL.selectedStop - NgChm.SEL.selectedStart + 1;
		if (selectionSize < 500) {
			NgChm.SEL.mode = 'RIBBONV_DETAIL';
		} else {
			var rvRate = NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.RIBBON_VERT_LEVEL);
			selectionSize = Math.floor(selectionSize / rvRate);			
		}
		var height = Math.max(1, Math.floor(500/selectionSize));
    	NgChm.DET.dataViewHeight = (selectionSize * height) + NgChm.DET.dataViewBorder;
		NgChm.DET.setDetailDataHeight(height);
		NgChm.SEL.currentRow = NgChm.SEL.selectedStart;
	}
	
	NgChm.DET.dataViewWidth = NgChm.DET.SIZE_NORMAL_MODE;
	if ((previousMode=='RIBBONH') || (previousMode=='RIBBONH_DETAIL')) {
		NgChm.DET.setDetailDataWidth(prevHeight);
		NgChm.SEL.currentCol = NgChm.DET.saveCol;
	}
	
	//On some maps, one view (e.g. ribbon view) can show bigger data areas than will fit for other view modes.  If so, zoom back out to find a workable zoom level.
	while (Math.floor((NgChm.DET.dataViewWidth-NgChm.DET.dataViewBorder)/NgChm.DET.zoomBoxSizes[NgChm.DET.zoomBoxSizes.indexOf(NgChm.DET.dataBoxWidth)]) > NgChm.heatMap.getNumColumns(NgChm.MMGR.DETAIL_LEVEL)) {
		NgChm.DET.setDetailDataWidth(NgChm.DET.zoomBoxSizes[NgChm.DET.zoomBoxSizes.indexOf(NgChm.DET.dataBoxWidth)+1]);
	}	
		
	NgChm.DET.canvas.width =  (NgChm.DET.dataViewWidth + NgChm.DET.calculateTotalClassBarHeight("row") + NgChm.DET.dendroWidth);
	NgChm.DET.canvas.height = (NgChm.DET.dataViewHeight + NgChm.DET.calculateTotalClassBarHeight("column") + NgChm.DET.dendroHeight);
	NgChm.DET.detSetupGl();
	NgChm.DET.detInitGl();
	NgChm.SEL.updateSelection();
	document.getElementById("viewport").setAttribute("content", "height=device-height");
    document.getElementById("viewport").setAttribute("content", "");
}

NgChm.DET.detailNormal = function () {
	NgChm.UHM.userHelpClose();	
	var previousMode = NgChm.SEL.mode;
	NgChm.SEL.mode = 'NORMAL';
	NgChm.DET.setButtons();
	NgChm.DET.dataViewHeight = NgChm.DET.SIZE_NORMAL_MODE;
	NgChm.DET.dataViewWidth = NgChm.DET.SIZE_NORMAL_MODE;
	if ((previousMode=='RIBBONV') || (previousMode=='RIBBONV_DETAIL')) {
		NgChm.DET.setDetailDataSize(NgChm.DET.dataBoxWidth);
		NgChm.SEL.currentRow = NgChm.DET.saveRow;
	} else if ((previousMode=='RIBBONH') || (previousMode=='RIBBONH_DETAIL')) {
		NgChm.DET.setDetailDataSize(NgChm.DET.dataBoxHeight);
		NgChm.SEL.currentCol = NgChm.DET.saveCol;
	} else {
		
	}	

	//On some maps, one view (e.g. ribbon view) can show bigger data areas than will fit for other view modes.  If so, zoom back out to find a workable zoom level.
	while ((Math.floor((NgChm.DET.dataViewHeight-NgChm.DET.dataViewBorder)/NgChm.DET.zoomBoxSizes[NgChm.DET.zoomBoxSizes.indexOf(NgChm.DET.dataBoxHeight)]) > NgChm.heatMap.getNumRows(NgChm.MMGR.DETAIL_LEVEL)) ||
           (Math.floor((NgChm.DET.dataViewWidth-NgChm.DET.dataViewBorder)/NgChm.DET.zoomBoxSizes[NgChm.DET.zoomBoxSizes.indexOf(NgChm.DET.dataBoxWidth)]) > NgChm.heatMap.getNumColumns(NgChm.MMGR.DETAIL_LEVEL))) {
		NgChm.DET.setDetailDataSize(NgChm.DET.zoomBoxSizes[NgChm.DET.zoomBoxSizes.indexOf(NgChm.DET.dataBoxWidth)+1]);
	}	
	
	NgChm.SEL.checkRow();
	NgChm.SEL.checkColumn();
	NgChm.DET.canvas.width =  (NgChm.DET.dataViewWidth + NgChm.DET.calculateTotalClassBarHeight("row") + NgChm.DET.dendroWidth);
	NgChm.DET.canvas.height = (NgChm.DET.dataViewHeight + NgChm.DET.calculateTotalClassBarHeight("column") + NgChm.DET.dendroHeight);
	 
	NgChm.DET.detSetupGl();
	NgChm.DET.detInitGl();
	NgChm.DDR.clearDendroSelection();
	NgChm.SEL.updateSelection();
	document.getElementById("viewport").setAttribute("content", "height=device-height");
    document.getElementById("viewport").setAttribute("content", "");
}

NgChm.DET.getNearestBoxSize = function (sizeToGet) {
	var boxSize = 0;
	//Loop zoomBoxSizes to pick the one that will be large enough
	//to encompass user-selected area
	for (var i=NgChm.DET.zoomBoxSizes.length-1; i>=0;i--) {
		boxSize = NgChm.DET.zoomBoxSizes[i];
		boxCalcVal = (NgChm.DET.dataViewWidth-NgChm.DET.dataViewBorder)/boxSize;
		if (boxCalcVal > sizeToGet) {
			//Down size box if greater than map dimensions.
			if (boxCalcVal >= Math.min(NgChm.heatMap.getTotalRows(),NgChm.heatMap.getTotalCols())) {
				boxSize = NgChm.DET.zoomBoxSizes[i+1];
			}
			break;
		}
	}
	return boxSize
}


NgChm.DET.setButtons = function () {
	var full = document.getElementById('full_btn');
	var ribbonH = document.getElementById('ribbonH_btn');
	var ribbonV = document.getElementById('ribbonV_btn');
	full.src= NgChm.staticPath+ "images/full.png";
	ribbonH.src= NgChm.staticPath + "images/ribbonH.png";
	ribbonV.src= NgChm.staticPath + "images/ribbonV.png";
	if (NgChm.SEL.mode=='RIBBONV')
		ribbonV.src= NgChm.staticPath + "images/ribbonV_selected.png";
	else if (NgChm.SEL.mode == "RIBBONH")
		ribbonH.src= NgChm.staticPath + "images/ribbonH_selected.png";
	else
		full.src= NgChm.staticPath + "images/full_selected.png";	
}

NgChm.DET.setDetCanvasBoxSize = function () {
	NgChm.DET.boxCanvas.width =  NgChm.DET.canvas.clientWidth;
	NgChm.DET.boxCanvas.height = NgChm.DET.canvas.clientHeight;
	NgChm.DET.boxCanvas.style.left=NgChm.DET.canvas.style.left;
	NgChm.DET.boxCanvas.style.top=NgChm.DET.canvas.style.top;
}

//Called when split/join button is pressed
NgChm.DET.detailSplit = function () {
	if (!NgChm.heatMap.getUnAppliedChanges()) {
		NgChm.UHM.userHelpClose();
		NgChm.heatMap.setFlickInitialized(false);
		// If the summary and detail are in a single browser window, this is a split action.  
		if (!NgChm.SEL.isSub) {
			//Set flick button to top selection for later screen join
			var flickBtn = document.getElementById("flick_btn");
			flickBtn.setAttribute('src', NgChm.staticPath + 'images/toggleUp.png');
			//Write current selection settings to the local storage
			NgChm.SEL.hasSub=true;
			NgChm.DET.clearLabels();
			NgChm.SUM.clearSelectionMarks();
			NgChm.SEL.updateSelection();
			//Create a new detail browser window
			detWindow = window.open(window.location.href + '&sub=true', '_blank', 'modal=yes, width=' + (window.screen.availWidth / 2) + ', height='+ window.screen.availHeight + ',top=0, left=' + (window.screen.availWidth / 2));
			detWindow.moveTo(window.screen.availWidth / 2, 0);
			detWindow.onbeforeunload = function(){NgChm.SEL.rejoinNotice(),NgChm.SEL.hasSub=false,NgChm.DET.detailJoin();} // when you close the subwindow, it will return to the original window
			var detailDiv = document.getElementById('detail_chm');
			detailDiv.style.display = 'none';
			var dividerDiv = document.getElementById('divider');
			dividerDiv.style.display = 'none';
			//In summary window, hide the action buttons and expand the summary to 100% of the window.
			var detailButtonDiv = document.getElementById('bottom_buttons');
			var detailFlickDiv = document.getElementById('flicks');
			detailButtonDiv.style.display = 'none';
			detailFlickDiv.style.display = 'none';
			var summaryDiv = document.getElementById('summary_chm');
			summaryDiv.style.width = '100%';
			NgChm.SUM.setSummarySize();
			NgChm.SUM.rowDendro.draw();
			NgChm.SUM.colDendro.draw();
			NgChm.SUM.drawRowSelectionMarks();
			NgChm.SUM.drawColSelectionMarks();
	 		document.getElementById('pdf_gear').style.display = 'none';
		} else {
			NgChm.SEL.updateSelection();
			NgChm.SEL.rejoinNotice();
			window.close();
		}
	} else {
		NgChm.UHM.unappliedChangeNotification();
	}
}

//Called when a separate detail window is joined back into the main window.
NgChm.DET.detailJoin = function () {
	var detailDiv = document.getElementById('detail_chm');
	detailDiv.style.display = '';
	var detailButtonDiv = document.getElementById('bottom_buttons');
	detailButtonDiv.style.display = '';
	var dividerDiv = document.getElementById('divider');
	dividerDiv.style.display = '';
	NgChm.SUM.initSummarySize();
	NgChm.SUM.rowDendro.draw();
	NgChm.SUM.colDendro.draw();
	NgChm.SEL.initFromLocalStorage();
	NgChm.SUM.clearSelectionMarks();
	NgChm.SUM.drawRowSelectionMarks();
	NgChm.SUM.drawColSelectionMarks();
	NgChm.heatMap.configureFlick();
	NgChm.SEL.flickToggleOff();
	document.getElementById('pdf_gear').style.display = '';
	if (NgChm.SEL.flickExists()){
		document.getElementById('pdf_gear').style.minWidth = '340px';
	} else {
		document.getElementById('pdf_gear').style.minWidth = '140px';
	}
}


// Callback that is notified every time there is an update to the heat map 
// initialize, new data, etc.  This callback draws the summary heat map.
NgChm.DET.processDetailMapUpdate = function (event, level) {

	if (event == NgChm.MMGR.Event_INITIALIZED) {
		NgChm.DET.detailInit();
		NgChm.heatMap.configureButtonBar();
	} else {
		//Data tile update - wait a bit to see if we get another new tile quickly, then draw
		if (NgChm.DET.eventTimer != 0) {
			//New tile arrived - reset timer
			clearTimeout(NgChm.DET.eventTimer);
		}
		NgChm.DET.eventTimer = setTimeout(NgChm.DET.drawDetailHeatMap, 200);
	} 
}

NgChm.DET.setDendroShow = function () {
	var rowDendroConfig = NgChm.heatMap.getRowDendroConfig();
	var colDendroConfig = NgChm.heatMap.getColDendroConfig();
	if (!NgChm.heatMap.showRowDendrogram("DETAIL")) {
		NgChm.DET.dendroWidth = 15;
	} else {
		NgChm.DET.dendroWidth = Math.floor(parseInt(rowDendroConfig.height) * NgChm.heatMap.getRowDendroConfig().height/100+5);
	}
	if (!NgChm.heatMap.showColDendrogram("DETAIL")) {
		NgChm.DET.dendroHeight = 15;
	} else {
		NgChm.DET.dendroHeight = Math.floor(parseInt(colDendroConfig.height) * NgChm.heatMap.getColDendroConfig().height/100+5);
	}
}
 
//Perform all initialization functions for Detail heat map
NgChm.DET.detailInit = function () {
	NgChm.DET.setDendroShow();
	document.getElementById('detail_buttons').style.display = '';
	NgChm.DET.canvas.width =  (NgChm.DET.dataViewWidth + NgChm.DET.calculateTotalClassBarHeight("row") + NgChm.DET.dendroWidth);
	NgChm.DET.canvas.height = (NgChm.DET.dataViewHeight + NgChm.DET.calculateTotalClassBarHeight("column") + NgChm.DET.dendroHeight);
	NgChm.LNK.createLabelMenus();
	NgChm.SEL.createEmptySearchItems();
	
	// Small Maps - Set detail data size.  If there are less than 42 rows or columns
	// set the to show the box size closest to the lower value ELSE
	// set it to show 42 rows/cols.
	var rows = NgChm.heatMap.getNumRows(NgChm.MMGR.DETAIL_LEVEL);
	var cols = NgChm.heatMap.getNumColumns(NgChm.MMGR.DETAIL_LEVEL);
	if ((rows < 42) || (cols < 42)) {
		var zoomCalcVal = Math.min(rows,cols);
		var boxSize = NgChm.DET.getNearestBoxSize(zoomCalcVal);
		NgChm.DET.setDetailDataSize(boxSize); 
	} else {
		NgChm.DET.setDetailDataSize(12);
	}
	
	NgChm.DET.detSetupGl();
	NgChm.DET.detInitGl();
	if (NgChm.SEL.isSub)  {
		NgChm.SEL.initFromLocalStorage();
	} else {
		NgChm.SEL.updateSelection();
	}
	if (NgChm.UTIL.getURLParameter("selected") !== ""){
		var selected = NgChm.UTIL.getURLParameter("selected").replace(","," ");
		document.getElementById("search_text").value = selected;
		NgChm.DET.detailSearch();
		NgChm.SUM.drawRowSelectionMarks();
		NgChm.SUM.drawColSelectionMarks();
	}
}

NgChm.DET.drawDetailHeatMap = function () {
 	
	NgChm.DET.setDetCanvasBoxSize();
	if ((NgChm.SEL.currentRow == null) || (NgChm.SEL.currentRow == 0)) {
		return;
	}
	NgChm.DET.setDendroShow();
	var colorMap = NgChm.heatMap.getColorMapManager().getColorMap("data",NgChm.SEL.currentDl);
	var dataLayers = NgChm.heatMap.getDataLayers();
	var dataLayer = dataLayers[NgChm.SEL.currentDl];
	var showGrid = false;
	if (dataLayer.grid_show === 'Y') {
		showGrid = true;
	}
	var rowClassBarWidth = NgChm.DET.calculateTotalClassBarHeight("row");
	var searchRows = NgChm.DET.getSearchRows();
	var searchCols = NgChm.DET.getSearchCols();
	var searchGridColor = [0,0,0];
	var dataGridColor = colorMap.getHexToRgba(dataLayer.grid_color);
	var dataSelectionColorRGB = colorMap.getHexToRgba(dataLayer.selection_color);
	var dataSelectionColor = [dataSelectionColorRGB.r/255, dataSelectionColorRGB.g/255, dataSelectionColorRGB.b/255, 1];
	var regularGridColor = [dataGridColor.r, dataGridColor.g, dataGridColor.b];
	var detDataPerRow = NgChm.SEL.getCurrentDetDataPerRow();
	var detDataPerCol = NgChm.SEL.getCurrentDetDataPerCol();
 
	//Build a horizontal grid line for use between data lines. Tricky because some dots will be selected color if a column is in search results.
	var gridLine = new Uint8Array(new ArrayBuffer((NgChm.DET.dendroWidth + rowClassBarWidth + NgChm.DET.dataViewWidth) * NgChm.SUM.BYTE_PER_RGBA));
	if (showGrid == true) {
		var linePos = (NgChm.DET.dendroWidth+rowClassBarWidth)*NgChm.SUM.BYTE_PER_RGBA;
		gridLine[linePos]=0; gridLine[linePos+1]=0;gridLine[linePos+2]=0;gridLine[linePos+3]=255;linePos+=NgChm.SUM.BYTE_PER_RGBA;
		for (var j = 0; j < detDataPerRow; j++) {
			var gridColor = ((searchCols.indexOf(NgChm.SEL.currentCol+j) > -1) || (searchCols.indexOf(NgChm.SEL.currentCol+j+1) > -1)) ? searchGridColor : regularGridColor;
			for (var k = 0; k < NgChm.DET.dataBoxWidth; k++) {
				if (k==NgChm.DET.dataBoxWidth-1 && showGrid == true && NgChm.DET.dataBoxWidth > NgChm.DET.minLabelSize ){ // should the grid line be drawn?
					gridLine[linePos] = gridColor[0]; gridLine[linePos+1] = gridColor[1]; gridLine[linePos+2] = gridColor[2];	gridLine[linePos+3] = 255;
				} else {
					gridLine[linePos]=regularGridColor[0]; gridLine[linePos + 1]=regularGridColor[1]; gridLine[linePos + 2]=regularGridColor[2]; gridLine[linePos + 3]=255;
				}
				linePos += NgChm.SUM.BYTE_PER_RGBA;
			}
		}
		gridLine[linePos]=0; gridLine[linePos+1]=0;gridLine[linePos+2]=0;gridLine[linePos+3]=255;linePos+=NgChm.SUM.BYTE_PER_RGBA;
	}
	
	//Setup texture to draw on canvas.
	
	//Draw black border line
	var pos = (rowClassBarWidth+NgChm.DET.dendroWidth)*NgChm.SUM.BYTE_PER_RGBA;
	for (var i = 0; i < NgChm.DET.dataViewWidth; i++) {
		NgChm.DET.texPixels[pos]=0;
		NgChm.DET.texPixels[pos+1]=0;
		NgChm.DET.texPixels[pos+2]=0;
		NgChm.DET.texPixels[pos+3]=255;
		pos+=NgChm.SUM.BYTE_PER_RGBA;
	}
	
	// create the search objects outside of the for-loops so we don't have to use indexOf for a potentially large array in the loop
	var searchRowObj = {};
	for (var idx = 0; idx < searchRows.length; idx++){
		searchRowObj[searchRows[idx]] = 1;
	}
	var searchColObj = {};
	for (var idx = 0; idx < searchCols.length; idx++){
		searchColObj[searchCols[idx]] = 1;
	}
	// create these variables now to prevent having to call them in the for-loop
	var level = NgChm.SEL.getLevelFromMode(NgChm.MMGR.DETAIL_LEVEL);
	var currDetRow = NgChm.SEL.getCurrentDetRow();
	var currDetCol = NgChm.SEL.getCurrentDetCol();
	//Needs to go backward because WebGL draws bottom up.
	var line = new Uint8Array(new ArrayBuffer((rowClassBarWidth + NgChm.DET.dendroWidth + NgChm.DET.dataViewWidth) * NgChm.SUM.BYTE_PER_RGBA));
	for (var i = detDataPerCol-1; i >= 0; i--) {
		var linePos = (rowClassBarWidth + NgChm.DET.dendroWidth)*NgChm.SUM.BYTE_PER_RGBA;
		//Add black boarder
		line[linePos]=0; line[linePos+1]=0;line[linePos+2]=0;line[linePos+3]=255;linePos+=NgChm.SUM.BYTE_PER_RGBA;
		for (var j = 0; j < detDataPerRow; j++) { // for every data point...
			var val = NgChm.heatMap.getValue(level, currDetRow+i, currDetCol+j);
			var color = colorMap.getColor(val);

			//For each data point, write it several times to get correct data point width.
			for (var k = 0; k < NgChm.DET.dataBoxWidth; k++) {
				if (k==NgChm.DET.dataBoxWidth-1 && showGrid == true && NgChm.DET.dataBoxWidth > NgChm.DET.minLabelSize ){ // should the grid line be drawn?
					line[linePos] = regularGridColor[0]; line[linePos+1] = regularGridColor[1]; line[linePos+2] = regularGridColor[2];	line[linePos+3] = 255;
				} else {
					line[linePos] = color['r'];	line[linePos + 1] = color['g'];	line[linePos + 2] = color['b'];	line[linePos + 3] = color['a'];
				}
				linePos += NgChm.SUM.BYTE_PER_RGBA;
			}
		}
		line[linePos]=0; line[linePos+1]=0;line[linePos+2]=0;line[linePos+3]=255;linePos+=NgChm.SUM.BYTE_PER_RGBA;


		//Write each line several times to get correct data point height.
		for (dup = 0; dup < NgChm.DET.dataBoxHeight; dup++) {
			if (dup == NgChm.DET.dataBoxHeight-1 && showGrid == true && NgChm.DET.dataBoxHeight > NgChm.DET.minLabelSize){ // do we draw gridlines?
				for (k = 0; k < line.length; k++) {
					NgChm.DET.texPixels[pos]=gridLine[k];
					pos++;
				}
			} else {
				for (k = 0; k < line.length; k++) {
					NgChm.DET.texPixels[pos]=line[k];
					pos++;
				}
			}
		}
	}

	//Draw black border line
	pos += (rowClassBarWidth + NgChm.DET.dendroWidth)*NgChm.SUM.BYTE_PER_RGBA;
	for (var i = 0; i < NgChm.DET.dataViewWidth; i++) {
		NgChm.DET.texPixels[pos]=0;NgChm.DET.texPixels[pos+1]=0;NgChm.DET.texPixels[pos+2]=0;NgChm.DET.texPixels[pos+3]=255;pos+=NgChm.SUM.BYTE_PER_RGBA;
	}
	NgChm.DET.clearDetailDendrograms();
	if (NgChm.heatMap.showRowDendrogram("DETAIL")) {
		NgChm.DET.rowDendroMatrix = NgChm.DET.buildDetailDendroMatrix('row', NgChm.SEL.currentRow, NgChm.SEL.currentRow+NgChm.SEL.dataPerCol, NgChm.heatMap.getNumRows(NgChm.MMGR.DETAIL_LEVEL)/NgChm.SEL.dataPerCol);
		NgChm.DET.detailDrawRowDendrogram(NgChm.DET.texPixels);
	}
	if (NgChm.heatMap.showColDendrogram("DETAIL")) {
		NgChm.DET.colDendroMatrix = NgChm.DET.buildDetailDendroMatrix('col', NgChm.SEL.currentCol, NgChm.SEL.currentCol+NgChm.SEL.dataPerRow, NgChm.heatMap.getNumColumns(NgChm.MMGR.DETAIL_LEVEL)/NgChm.SEL.dataPerRow);
		NgChm.DET.detailDrawColDendrogram(NgChm.DET.texPixels);
	}
	//Draw column classification bars.
	NgChm.DET.detailDrawColClassBars();
	NgChm.DET.detailDrawRowClassBars();
	
	//Draw any selection boxes defined by SearchRows/SearchCols
	NgChm.DET.drawSelections();
	
	//WebGL code to draw the summary heat map.
	NgChm.DET.gl.activeTexture(NgChm.DET.gl.TEXTURE0);
	NgChm.DET.gl.texImage2D(
			NgChm.DET.gl.TEXTURE_2D, 
			0, 
			NgChm.DET.gl.RGBA, 
			NgChm.DET.textureParams['width'], 
			NgChm.DET.textureParams['height'], 
			0, 
			NgChm.DET.gl.RGBA,
			NgChm.DET.gl.UNSIGNED_BYTE, 
			NgChm.DET.texPixels);
	NgChm.DET.gl.uniform2fv(NgChm.DET.uScale, NgChm.DET.canvasScaleArray);
	NgChm.DET.gl.uniform2fv(NgChm.DET.uTranslate, NgChm.DET.canvasTranslateArray);
	NgChm.DET.gl.drawArrays(NgChm.DET.gl.TRIANGLE_STRIP, 0, NgChm.DET.gl.buffer.numItems);
	NgChm.DET.detailResize();
}

NgChm.DET.detailResize = function () {
	 var divider = document.getElementById('divider');
	 divider.style.height=Math.max(document.getElementById('detail_canvas').offsetHeight,document.getElementById('summary_canvas').offsetHeight + NgChm.SUM.colDendro.getDivHeight())+'px';
	 NgChm.DET.clearLabels();
	 NgChm.DET.sizeCanvasForLabels();
	 //Done twice because changing canvas size affects fonts selected for drawing labels
	 NgChm.DET.sizeCanvasForLabels();
	 NgChm.DET.drawRowAndColLabels();
	 NgChm.DET.drawSelections();
	 NgChm.DET.detailDrawColClassBarLabels();
	 NgChm.DET.detailDrawRowClassBarLabels();
}

//This function calculates and adjusts the size of the detail canvas and box canvas
//in order to best accommodate the maximum label sizes for each axis.
NgChm.DET.sizeCanvasForLabels = function() {
	NgChm.DET.calcRowAndColLabels();
	NgChm.DET.calcClassRowAndColLabels();
	var cont = document.getElementById('container');
	var dChm = document.getElementById('detail_chm');
	var sChm = document.getElementById('summary_chm');
	var div = document.getElementById('divider');
	//Calculate the total horizontal width of the screen
	var sumWidths = sChm.clientWidth + div.clientWidth + dChm.clientWidth;
	//Calculate the remainder on right-hand side not covered by the detail_chm 
	//(labels are partially drawn on this area)
	var remainW = cont.clientWidth - sumWidths;
	//Calculate the remainder on bottom not covered by the container 
	//(labels are partially drawn on this area)
	var remainH = cont.clientHeight - dChm.clientHeight;
	//Add remainders to width/height for computation
	var dFullW = dChm.clientWidth + remainW;
	var dFullH = dChm.clientHeight + remainH;
	//Set sizes of canvas and boxCanvas based upon width, label, and an offset for whitespace
	NgChm.DET.canvas.style.width = dFullW - (NgChm.DET.rowLabelLen + 35);
	NgChm.DET.canvas.style.height = dFullH - (NgChm.DET.colLabelLen + 15);
	NgChm.DET.boxCanvas.style.width = NgChm.DET.canvas.style.width;
	NgChm.DET.boxCanvas.style.height = NgChm.DET.canvas.style.height;
}

//This function clears all labels on the detail panel and resets the maximum
//label size variables for each axis in preparation for a screen redraw.
NgChm.DET.clearLabels = function () {
	var oldLabels = document.getElementsByClassName("DynamicLabel");
	while (oldLabels.length > 0) {
		NgChm.DET.labelElement.removeChild(oldLabels[0]);
	}
	NgChm.DET.rowLabelLen = 0;
	NgChm.DET.colLabelLen = 0;
}

//This function determines if labels are to be drawn on each axis and calls the appropriate
//function to calculate the maximum label size for each axis.
NgChm.DET.calcRowAndColLabels = function () {
	NgChm.DET.rowLabelFont = NgChm.DET.getRowLabelFontSize();
	NgChm.DET.colLabelFont = NgChm.DET.getColLabelFontSize();
	var fontSize;
	if (NgChm.DET.rowLabelFont >= NgChm.DET.minLabelSize && NgChm.DET.colLabelFont >= NgChm.DET.minLabelSize){
		fontSize = Math.min(NgChm.DET.colLabelFont,NgChm.DET.rowLabelFont);
		NgChm.DET.calcColLabels(fontSize);
		NgChm.DET.calcRowLabels(fontSize);
	} else if (NgChm.DET.rowLabelFont >= NgChm.DET.minLabelSize){
		NgChm.DET.calcRowLabels(NgChm.DET.rowLabelFont);
	} else if (NgChm.DET.colLabelFont >= NgChm.DET.minLabelSize){
		NgChm.DET.calcColLabels(NgChm.DET.colLabelFont);
	}
}

//This function calculates the font size to be used for row axis labels.
NgChm.DET.getRowLabelFontSize = function () {
	var headerSize = 0;
	var colHeight = NgChm.DET.calculateTotalClassBarHeight("column") + NgChm.DET.dendroHeight;
	if (colHeight > 0) {
		headerSize = NgChm.DET.canvas.clientHeight * (colHeight / (NgChm.DET.dataViewHeight + colHeight));
	}
	var skip = Math.floor((NgChm.DET.canvas.clientHeight - headerSize) / NgChm.SEL.dataPerCol) - 2;
	return Math.min(skip, NgChm.DET.maxLabelSize);	
}

//This function calculates the font size to be used for column axis labels.
NgChm.DET.getColLabelFontSize = function () {
	headerSize = 0;
	var rowHeight = NgChm.DET.calculateTotalClassBarHeight("row") + NgChm.DET.dendroWidth;
	if (rowHeight > 0) {
		headerSize = NgChm.DET.canvas.clientWidth * (rowHeight / (NgChm.DET.dataViewWidth + rowHeight));
	}
	skip = Math.floor((NgChm.DET.canvas.clientWidth - headerSize) / NgChm.SEL.dataPerRow) - 2;
	return Math.min(skip, NgChm.DET.maxLabelSize);
}


//This function calculates the maximum label size (in pixels) on the row axis.
NgChm.DET.calcRowLabels = function (fontSize) {
	var headerSize = 0;
	var colHeight = NgChm.DET.calculateTotalClassBarHeight("column") + NgChm.DET.dendroHeight;
	if (colHeight > 0) {
		headerSize = NgChm.DET.canvas.clientHeight * (colHeight / (NgChm.DET.dataViewHeight + colHeight));
	}
	var skip = (NgChm.DET.canvas.clientHeight - headerSize) / NgChm.SEL.dataPerCol;
	var labels = NgChm.heatMap.getRowLabels()["labels"];
	if (skip > NgChm.DET.minLabelSize) {
		for (var i = NgChm.SEL.currentRow; i < NgChm.SEL.currentRow + NgChm.SEL.dataPerCol; i++) {
			if (labels[i-1] == undefined){ // an occasional problem in subdendro view
				continue;
			}
			var shownLabel = NgChm.UTIL.getLabelText(labels[i-1].split("|")[0]);
			NgChm.DET.calcLabelDiv(shownLabel, fontSize, 'ROW');
		}
	}
}

//This function calculates the maximum label size (in pixels) on the column axis.
NgChm.DET.calcColLabels = function (fontSize) {
	var headerSize = 0;
	var rowHeight = NgChm.DET.calculateTotalClassBarHeight("row") + NgChm.DET.dendroWidth;
	if (rowHeight > 0) {
		headerSize = NgChm.DET.canvas.clientWidth * (rowHeight / (NgChm.DET.dataViewWidth + rowHeight));
	}
	var skip = (NgChm.DET.canvas.clientWidth - headerSize) / NgChm.SEL.dataPerRow;
	var labels = NgChm.heatMap.getColLabels()["labels"];
	if (skip > NgChm.DET.minLabelSize) {
		for (var i = NgChm.SEL.currentCol; i < NgChm.SEL.currentCol + NgChm.SEL.dataPerRow; i++) {
			if (labels[i-1] == undefined){ // an occasional problem in subdendro view
				continue;
			}
			var shownLabel = NgChm.UTIL.getLabelText(labels[i-1].split("|")[0]);
			NgChm.DET.calcLabelDiv(shownLabel, fontSize, 'COL');
		}
	}
}

//This function creates a complete div for a given label item, assesses the 
//size of the label and increases the row/col label length if the label
//is larger than those already processed.  rowLabelLen and colLabelLen
//are used to size the detail screen to accomodate labels on both axes
NgChm.DET.calcLabelDiv = function (text, fontSize, axis) {
	var div = document.createElement('div');
	var divFontColor = "#FFFFFF";
	div.className = 'DynamicLabel';
	div.style.position = "absolute";
	div.style.fontSize = fontSize.toString() +'pt';
	div.style.fontFamily = 'sans-serif';
	div.style.fontWeight = 'bold';
	div.innerHTML = text;
	
	NgChm.DET.labelElement.appendChild(div);
	if (axis == 'ROW') {
		if (div.clientWidth > NgChm.DET.rowLabelLen) {
			NgChm.DET.rowLabelLen = div.clientWidth;
		}
	} else {
		if (div.clientWidth > NgChm.DET.colLabelLen) {
			NgChm.DET.colLabelLen = div.clientWidth;
		}
	}
	NgChm.DET.labelElement.removeChild(div);
}

//This function determines if labels are to be drawn on each axis and calls the appropriate
//function to draw those labels on the screen.
NgChm.DET.drawRowAndColLabels = function () {
	var fontSize;
	if (NgChm.DET.rowLabelFont >= NgChm.DET.minLabelSize && NgChm.DET.colLabelFont >= NgChm.DET.minLabelSize){
		fontSize = Math.min(NgChm.DET.colLabelFont,NgChm.DET.rowLabelFont);
		NgChm.DET.drawRowLabels(fontSize);
		NgChm.DET.drawColLabels(fontSize);
	} else if (NgChm.DET.rowLabelFont >= NgChm.DET.minLabelSize){
		NgChm.DET.drawRowLabels(NgChm.DET.rowLabelFont);
	} else if (NgChm.DET.colLabelFont >= NgChm.DET.minLabelSize){
		NgChm.DET.drawColLabels(NgChm.DET.colLabelFont);
	}
}

NgChm.DET.drawRowLabels = function (fontSize) {
	var headerSize = 0;
	var colHeight = NgChm.DET.calculateTotalClassBarHeight("column") + NgChm.DET.dendroHeight;
	if (colHeight > 0) {
		headerSize = NgChm.DET.canvas.clientHeight * (colHeight / (NgChm.DET.dataViewHeight + colHeight));
	}
	var skip = (NgChm.DET.canvas.clientHeight - headerSize) / NgChm.SEL.dataPerCol;
	var start = Math.max((skip - fontSize)/2, 0) + headerSize-2;
	var labels = NgChm.heatMap.getRowLabels()["labels"];
	
	if (skip > NgChm.DET.minLabelSize) {
		var xPos = NgChm.DET.canvas.clientWidth + 3;
		for (var i = NgChm.SEL.currentRow; i < NgChm.SEL.currentRow + NgChm.SEL.dataPerCol; i++) {
			var yPos = start + ((i-NgChm.SEL.currentRow) * skip);
			if (labels[i-1] == undefined){ // an occasional problem in subdendro view
				continue;
			}
			var shownLabel = NgChm.UTIL.getLabelText(labels[i-1].split("|")[0]);
			NgChm.DET.addLabelDiv(NgChm.DET.labelElement, 'detail_row' + i, 'DynamicLabel', shownLabel, xPos, yPos, fontSize, 'F',i,"Row");
		}
	}
}

NgChm.DET.drawColLabels = function (fontSize) {
	var headerSize = 0;
	var rowHeight = NgChm.DET.calculateTotalClassBarHeight("row") + NgChm.DET.dendroWidth;
	if (rowHeight > 0) {
		headerSize = NgChm.DET.canvas.clientWidth * (rowHeight / (NgChm.DET.dataViewWidth + rowHeight));
	}
	var skip = (NgChm.DET.canvas.clientWidth - headerSize) / NgChm.SEL.dataPerRow;
	var start = headerSize + fontSize + Math.max((skip - fontSize)/2, 0) + 3;
	var labels = NgChm.heatMap.getColLabels()["labels"];
		
	if (skip > NgChm.DET.minLabelSize) {
		var yPos = NgChm.DET.canvas.clientHeight + 3;
		for (var i = NgChm.SEL.currentCol; i < NgChm.SEL.currentCol + NgChm.SEL.dataPerRow; i++) {
			var xPos = start + ((i-NgChm.SEL.currentCol) * skip);
			if (labels[i-1] == undefined){ // an occasional problem in subdendro view
				continue;
			}
			var shownLabel = NgChm.UTIL.getLabelText(labels[i-1].split("|")[0]);
			NgChm.DET.addLabelDiv(NgChm.DET.labelElement, 'detail_col' + i, 'DynamicLabel', shownLabel, xPos, yPos, fontSize, 'T',i,"Column");
			if (shownLabel.length > NgChm.DET.colLabelLen) {
				NgChm.DET.colLabelLen = shownLabel.length;
			}
		}
	}
}

NgChm.DET.addLabelDiv = function (parent, id, className, text, left, top, fontSize, rotate, index,axis,xy) {
	var colorMap = NgChm.heatMap.getColorMapManager().getColorMap("data",NgChm.SEL.currentDl);
	var dataLayer = NgChm.heatMap.getDataLayers()[NgChm.SEL.currentDl];
	var selectionRgba = colorMap.getHexToRgba(dataLayer.selection_color);
	var div = document.createElement('div');
	var divFontColor = "#FFFFFF";
	var selColor = colorMap.getHexToRgba(dataLayer.selection_color);
	if (colorMap.isColorDark(selColor)) {
		divFontColor = "#000000";
	}
	div.id = id;
	div.className = className;
	div.setAttribute("index",index)
	if (div.classList.contains('ClassBar')){
		div.setAttribute('axis','ColumnCovar');
	} else {
		div.setAttribute('axis', 'Row');
	}
	if (NgChm.DET.labelIndexInSearch(index,axis)) {
		div.style.backgroundColor = dataLayer.selection_color;
		div.style.color = divFontColor;
	}
	if (text == "<") {
	//	div.style.backgroundColor = "rgba(3,255,3,0.2)";
		div.style.color = divFontColor;
		div.style.backgroundColor = "rgba("+selectionRgba.r+","+selectionRgba.g+","+selectionRgba.b+",0.2)";
	}
	if (rotate == 'T') {
		div.style.transformOrigin = 'left top';
		div.style.transform = 'rotate(90deg)';
		div.style.webkitTransformOrigin = "left top";
		div.style.webkitTransform = "rotate(90deg)";
		if (div.classList.contains('ClassBar')){
			div.setAttribute('axis','RowCovar');
		} else {
			div.setAttribute('axis','Column');
		}
	}
	
	div.style.position = "absolute";
	div.style.left = left;
	div.style.top = top;
	div.style.fontSize = fontSize.toString() +'pt';
	div.style.fontFamily = 'sans-serif';
	div.style.fontWeight = 'bold';
	div.innerHTML = text;
	
	parent.appendChild(div);
	
	if (text !== "<" && text !== "..." && text.length > 0){
		div.addEventListener('click',NgChm.DET.labelClick ,false);
		div.addEventListener('contextmenu',NgChm.DET.labelRightClick,false);
		div.onmouseover = function(){NgChm.UHM.detailDataToolHelp(this,text);}
		div.onmouseleave = NgChm.UHM.userHelpClose;
	}
	if (text == "..."){
		div.addEventListener('mouseover', (function() {
		    return function(e) {NgChm.UHM.detailDataToolHelp(this, "Some covariate bars are hidden"); };
		}) (this), false);
	}   
}

NgChm.DET.labelClick = function (e) {
	if (e.shiftKey){ // shift + click
		var selection = window.getSelection();
		selection.removeAllRanges();
		var focusNode = this;
		var focusIndex = Number(this.getAttribute('index'));
		var axis = focusNode.getAttribute("axis");
		if (NgChm.DET.labelLastClicked[axis]){ // if label in the same axis was clicked last, highlight all
			var anchorIndex = Number(NgChm.DET.labelLastClicked[axis]);
			var startIndex = Math.min(focusIndex,anchorIndex), endIndex = Math.max(focusIndex,anchorIndex);
			for (var i = startIndex; i <= endIndex; i++){
				if (!NgChm.DET.labelIndexInSearch(i, axis)){
					NgChm.SEL.searchItems[axis][i] = 1;
				}
			}
		} else { // otherwise, treat as normal click
			NgChm.DET.clearSearchItems(this.getAttribute('axis'));
			var searchIndex = NgChm.DET.labelIndexInSearch(focusIndex,axis);
			if (searchIndex ){
				delete NgChm.SEL.searchItems[axis][index];
			} else {
				NgChm.SEL.searchItems[axis][focusIndex] = 1;
			}
		}
		NgChm.DET.labelLastClicked[axis] = focusIndex;
	} else if (e.ctrlKey || e.metaKey){ // ctrl or Mac key + click
		var axis = this.getAttribute("axis");
		var index = this.getAttribute("index");
		var searchIndex = NgChm.DET.labelIndexInSearch(index, axis);
		if (searchIndex){ // if already searched, remove from search items
			delete NgChm.SEL.searchItems[axis][index];
		} else {
			NgChm.SEL.searchItems[axis][index] = 1;
		}
		NgChm.DET.labelLastClicked[axis] = index;
	} else { // standard click
		var axis = this.getAttribute("axis");
		var index = this.getAttribute("index");
		NgChm.DET.clearSearchItems(axis);
		NgChm.SEL.searchItems[axis][index] = 1;
		NgChm.DET.labelLastClicked[axis] = index;
	}
	var searchElement = document.getElementById('search_text');
	searchElement.value = "";
	document.getElementById('prev_btn').style.display='';
	document.getElementById('next_btn').style.display='';
	document.getElementById('cancel_btn').style.display='';
	NgChm.DET.clearLabels();
	NgChm.SUM.clearSelectionMarks();
	NgChm.DET.detailDrawRowClassBarLabels();
	NgChm.DET.detailDrawColClassBarLabels();
	NgChm.DET.drawRowAndColLabels();
	NgChm.SEL.updateSelection();
	if (NgChm.SEL.isSub){
		localStorage.setItem('selected', JSON.stringify(NgChm.SEL.searchItems));
	}
	if (!NgChm.SEL.isSub){
		NgChm.SUM.drawRowSelectionMarks();
		NgChm.SUM.drawColSelectionMarks();
	}
}

//clears the search items on a particular axis
NgChm.DET.clearSearchItems = function (clickAxis) {
	var length = NgChm.SEL.searchItems[clickAxis].length;
	NgChm.SEL.searchItems[clickAxis] = {};
	if (clickAxis == "Row"){
		NgChm.SUM.rowDendro.clearSelectedBars();
	} else if (clickAxis == "Column"){
		NgChm.SUM.colDendro.clearSelectedBars();
	}
	var markLabels = document.getElementsByClassName('MarkLabel');
	while (markLabels.length>0){ // clear tick marks
		markLabels[0].remove();
	}
}

NgChm.DET.labelRightClick = function (e) {
    e.preventDefault();
    var axis = e.target.getAttribute('axis');
    var labels = NgChm.SEL.searchItems;
    NgChm.LNK.labelHelpClose(axis);
    NgChm.LNK.labelHelpOpen(axis,e);
    var selection = window.getSelection();
    selection.removeAllRanges();
    return false;
}

NgChm.DET.matrixRightClick = function (e) {
	e.preventDefault();
	NgChm.LNK.labelHelpClose("Matrix");
    NgChm.LNK.labelHelpOpen("Matrix",e);
    var selection = window.getSelection();
    selection.removeAllRanges();
    return false;
}

//basically a Array.contains function, but for searchItems
NgChm.DET.labelIndexInSearch = function (index,axis) {
	if (index == null || axis == null){
		return false;
	}
	if (NgChm.SEL.searchItems[axis][index] == 1){
		return true;
	}else{
		return false;
	}
}

NgChm.DET.getSearchLabelsByAxis = function (axis, labelType) {
	var searchLabels;
	var keys = Object.keys(NgChm.heatMap.getColClassificationConfig());
	var labels = axis == 'Row' ? NgChm.heatMap.getRowLabels()["labels"] : axis == "Column" ? NgChm.heatMap.getColLabels()['labels'] : 
		axis == "ColumnCovar" ? Object.keys(NgChm.heatMap.getColClassificationConfig()) : axis == "ColumnCovar" ? Object.keys(NgChm.heatMap.getRowClassificationConfig()) : 
			[NgChm.heatMap.getRowLabels()["labels"], NgChm.heatMap.getColLabels()['labels'] ];
	if (axis !== "Matrix"){
		searchLabels = [];
		for (var i in NgChm.SEL.searchItems[axis]){
			if (axis.includes("Covar")){
				if (labelType == linkouts.VISIBLE_LABELS){
					searchLabels.push(labels[i].split("|")[0])
				}else if (labelType == linkouts.HIDDEN_LABELS){
					searchLabels.push(labels[i].split("|")[1])
				} else {
					searchLabels.push(labels[i])
				}
			} else {
				if (labelType == linkouts.VISIBLE_LABELS){
					searchLabels.push(labels[i-1].split("|")[0])
				}else if (labelType == linkouts.HIDDEN_LABELS){
					searchLabels.push(labels[i-1].split("|")[1])
				} else {
					searchLabels.push(labels[i-1])
				}
			}
		}
	} else {
		searchLabels = {"Row" : [], "Column" : []};
		for (var i in NgChm.SEL.searchItems["Row"]){
			if (labelType == linkouts.VISIBLE_LABELS){
				searchLabels["Row"].push(labels[0][i-1].split("|")[0])
			}else if (labelType == linkouts.HIDDEN_LABELS){
				searchLabels["Row"].push(labels[0][i-1].split("|")[1])
			} else {
				searchLabels["Row"].push(labels[0][i-1])
			}
		}
		for (var i in NgChm.SEL.searchItems["Column"]){
			if (labelType == linkouts.VISIBLE_LABELS){
				searchLabels["Column"].push(labels[1][i-1].split("|")[0])
			}else if (labelType == linkouts.HIDDEN_LABELS){
				searchLabels["Column"].push(labels[1][i-1].split("|")[1])
			} else {
				searchLabels["Column"].push(labels[1][i-1])
			}
		}
	}
	return searchLabels;
}

//This function draws column class bars on the detail heat map canvas
NgChm.DET.detailDrawColClassBars = function () {
	var colClassBarConfig = NgChm.heatMap.getColClassificationConfig();
	var colClassBarConfigOrder = NgChm.heatMap.getColClassificationOrder();
	var colClassBarData = NgChm.heatMap.getColClassificationData();
	var rowClassBarWidth = NgChm.DET.calculateTotalClassBarHeight("row");
	var fullWidth = NgChm.DET.dataViewWidth + rowClassBarWidth + NgChm.DET.dendroWidth;
	var mapHeight = NgChm.DET.dataViewHeight;
	var pos = fullWidth*mapHeight*NgChm.SUM.BYTE_PER_RGBA;
	var colorMapMgr = NgChm.heatMap.getColorMapManager();
	
	for (var i=colClassBarConfigOrder.length-1; i>= 0;i--) {
		var key = colClassBarConfigOrder[i];
		if (!colClassBarConfig.hasOwnProperty(key)) {
		    continue;
		  }
		var currentClassBar = colClassBarConfig[key];
		if (currentClassBar.show === 'Y') {
			var colorMap = colorMapMgr.getColorMap("col",key); // assign the proper color scheme...
			var classBarValues = colClassBarData[key].values;
			var classBarLength = NgChm.SEL.getCurrentDetDataPerRow() * NgChm.DET.dataBoxWidth;
			pos += fullWidth*NgChm.DET.paddingHeight*NgChm.SUM.BYTE_PER_RGBA; // draw padding between class bars
			var line = new Uint8Array(new ArrayBuffer(classBarLength * NgChm.SUM.BYTE_PER_RGBA)); // save a copy of the class bar
			var loc = 0;
			for (var k = NgChm.SEL.currentCol; k <= NgChm.SEL.currentCol + NgChm.SEL.getCurrentDetDataPerRow() -1; k++) { 
				var val = classBarValues[k-1];
				var color = colorMap.getClassificationColor(val);
				for (var j = 0; j < NgChm.DET.dataBoxWidth; j++) {
					line[loc] = color['r'];
					line[loc + 1] = color['g'];
					line[loc + 2] = color['b'];
					line[loc + 3] = color['a'];
					loc += NgChm.SUM.BYTE_PER_RGBA;
				}
			}
			for (var j = 0; j < currentClassBar.height-NgChm.DET.paddingHeight; j++){ // draw the class bar into the dataBuffer
				pos += (rowClassBarWidth + NgChm.DET.dendroWidth + 1)*NgChm.SUM.BYTE_PER_RGBA;
				for (var k = 0; k < line.length; k++) { 
					NgChm.DET.texPixels[pos] = line[k];
					pos++;
				}
				pos+=NgChm.SUM.BYTE_PER_RGBA;
			}
		  }

	}

}

// Call the functions necessary to calculate the maximum row/col class bar label sizes and
// update maximum label size variables (if necessary)
NgChm.DET.calcClassRowAndColLabels = function () {
	NgChm.DET.calcRowClassBarLabels();
	NgChm.DET.calcColClassBarLabels();
}

//This function calculates the appropriate font size for column class bar labels
NgChm.DET.colClassBarLabelFont = function() {
	var scale =  NgChm.DET.canvas.clientHeight / (NgChm.DET.dataViewHeight + NgChm.DET.calculateTotalClassBarHeight("column")+NgChm.DET.dendroHeight);
	var colClassBarConfig = NgChm.heatMap.getColClassificationConfig();
	var fontSize = NgChm.DET.getClassBarLabelFontSize(colClassBarConfig,scale);
	return fontSize;
}

// This function calculates the maximum size of all column class bar labels and update NgChm.DET.colLabelLen if the value
// of any label exceeds the existing maximum stored in that variable
NgChm.DET.calcColClassBarLabels = function () {
	var scale =  NgChm.DET.canvas.clientHeight / (NgChm.DET.dataViewHeight + NgChm.DET.calculateTotalClassBarHeight("column")+NgChm.DET.dendroHeight);
	var colClassBarConfig = NgChm.heatMap.getColClassificationConfig();
	var colClassBarConfigOrder = NgChm.heatMap.getColClassificationOrder();
	var colClassLength = Object.keys(colClassBarConfig).length;
	if (colClassBarConfig != null && colClassLength > 0) {
		NgChm.DET.colClassLabelFont = NgChm.DET.colClassBarLabelFont();
		if ((NgChm.DET.colClassLabelFont > NgChm.DET.minLabelSize) && (NgChm.DET.colClassLabelFont < NgChm.DET.maxLabelSize)){
			for (var i=0;i< colClassBarConfigOrder.length;i++) {
				var key = colClassBarConfigOrder[i];
				var currentClassBar = colClassBarConfig[key];
				if (currentClassBar.show === 'Y') {
					var currFont = Math.min((currentClassBar.height - NgChm.DET.paddingHeight) * scale, NgChm.DET.maxLabelSize);
					var labelText = NgChm.UTIL.getLabelText(key);
					NgChm.DET.calcLabelDiv(labelText, NgChm.DET.colClassLabelFont, 'ROW');
				} 
			}	
		}
	}
}

// This function draws column class bar labels on the detail panel
NgChm.DET.detailDrawColClassBarLabels = function () {
	if (document.getElementById("missingDetColClassBars"))document.getElementById("missingDetColClassBars").remove();
	var scale =  NgChm.DET.canvas.clientHeight / (NgChm.DET.dataViewHeight + NgChm.DET.calculateTotalClassBarHeight("column")+NgChm.DET.dendroHeight);
	var colClassBarConfig = NgChm.heatMap.getColClassificationConfig();
	var colClassBarConfigOrder = NgChm.heatMap.getColClassificationOrder();
	var colClassLength = Object.keys(colClassBarConfig).length;
	if (colClassBarConfig != null && colClassLength > 0) {
		if (NgChm.DET.colClassLabelFont > NgChm.DET.minLabelSize) {
			var xPos = NgChm.DET.canvas.clientWidth + 3;
			var startingPoint = NgChm.DET.dendroHeight*scale-2;
			var yPos = NgChm.DET.dendroHeight*scale;
			for (var i=0;i< colClassBarConfigOrder.length;i++) {
				var key = colClassBarConfigOrder[i];
				var currentClassBar = colClassBarConfig[key];
				if (currentClassBar.show === 'Y') {
					var currFont = Math.min((currentClassBar.height - NgChm.DET.paddingHeight) * scale, NgChm.DET.maxLabelSize);
					if (currFont >= NgChm.DET.colClassLabelFont) {
						var yOffset = yPos - 1;
						//Reposition label to center of large-height bars
						if (currentClassBar.height >= 20) {
							yOffset += ((((currentClassBar.height/2) - (NgChm.DET.colClassLabelFont/2)) - 3) * scale);
						}
						var labelText = NgChm.UTIL.getLabelText(key);
						NgChm.DET.addLabelDiv(NgChm.DET.labelElement, 'detail_classcol' + i, 'DynamicLabel ClassBar', labelText, xPos, yOffset, NgChm.DET.colClassLabelFont, 'F', i, "ColumnCovar");
					}
					yPos += (currentClassBar.height * scale);
				} else {
					if (!document.getElementById("missingDetColClassBars")){
						var x =  NgChm.DET.canvas.clientWidth+2;
						var y = NgChm.DET.dendroHeight*scale-13;
						NgChm.DET.addLabelDiv(NgChm.DET.labelElement, "missingDetColClassBars", "ClassBar MarkLabel", "...", x, y, 10, "F", null,"Column")
					}
					if (!NgChm.SEL.isSub) {  //we can't draw on the summary side from a split screen detail window
						if (!document.getElementById("missingColClassBars")){
							var x = NgChm.SUM.canvas.offsetLeft + NgChm.SUM.canvas.offsetWidth + 2;
							var y = NgChm.SUM.canvas.offsetTop + NgChm.SUM.canvas.clientHeight/NgChm.SUM.totalHeight - 10;
							NgChm.DET.addLabelDiv(document.getElementById('sumlabelDiv'), "missingColClassBars", "ClassBar MarkLabel", "...", x, y, 10, "F", null,"Column")
						}	
					}
				}
			}	
		}
	}
}

// This function searches for the minimum font size for all classification bars in a set (row/col) that have 
// a size greater than 7.  Those <= 7 are ignored as they will have "..." placed next to them as labels.
NgChm.DET.getClassBarLabelFontSize = function (classBarConfig,scale) {
	var minFont = 999;
	for (key in classBarConfig) {
		var classBar = classBarConfig[key];
		var fontSize = Math.min(((classBar.height - NgChm.DET.paddingHeight) * scale) - 1, 10);
		if ((fontSize > NgChm.DET.minLabelSize) && (fontSize < minFont)) {
			minFont = fontSize
		}
	}
	return minFont;
}

// This function calculates the appropriate font size for row class bar labels
NgChm.DET.rowClassBarLabelFont = function() {
	var scale =  NgChm.DET.canvas.clientWidth / (NgChm.DET.dataViewWidth + NgChm.DET.calculateTotalClassBarHeight("row")+NgChm.DET.dendroWidth);
	var rowClassBarConfig = NgChm.heatMap.getRowClassificationConfig();
	var fontSize = NgChm.DET.getClassBarLabelFontSize(rowClassBarConfig,scale);
	return fontSize;
}

//This function draws row class bars on the detail heat map canvas
NgChm.DET.detailDrawRowClassBars = function () {
	var rowClassBarConfig = NgChm.heatMap.getRowClassificationConfig();
	var rowClassBarConfigOrder = NgChm.heatMap.getRowClassificationOrder();
	var rowClassBarData = NgChm.heatMap.getRowClassificationData();
	var rowClassBarWidth = NgChm.DET.calculateTotalClassBarHeight("row");
	var detailTotalWidth = NgChm.DET.dendroWidth + NgChm.DET.calculateTotalClassBarHeight("row") + NgChm.DET.dataViewWidth;
	var offset = ((detailTotalWidth*NgChm.DET.dataViewBorder/2)+NgChm.DET.dendroWidth) * NgChm.SUM.BYTE_PER_RGBA; // start position of very bottom dendro
	var mapWidth = NgChm.DET.dendroWidth + NgChm.DET.calculateTotalClassBarHeight("row") + NgChm.DET.dataViewWidth;
	var mapHeight = NgChm.DET.dataViewHeight;
	var colorMapMgr = NgChm.heatMap.getColorMapManager();
	for (var i=0;i< rowClassBarConfigOrder.length;i++) {
		var key = rowClassBarConfigOrder[i];
		if (!rowClassBarConfig.hasOwnProperty(key)) {
		    continue;
		  }
		var currentClassBar = rowClassBarConfig[key];
		if (currentClassBar.show === 'Y') {
			var pos = offset; // move past the dendro and the other class bars...
			var colorMap = colorMapMgr.getColorMap("row",key); // assign the proper color scheme...
			var classBarValues = rowClassBarData[key].values;
			var classBarLength = classBarValues.length;
			for (var j = NgChm.SEL.currentRow + NgChm.SEL.getCurrentDetDataPerCol() - 1; j >= NgChm.SEL.currentRow; j--){ // for each row shown in the detail panel
				var val = classBarValues[j-1];
				var color = colorMap.getClassificationColor(val);
				for (var boxRows = 0; boxRows < NgChm.DET.dataBoxHeight; boxRows++) { // draw this color to the proper height
					for (var k = 0; k < currentClassBar.height-NgChm.DET.paddingHeight; k++){ // draw this however thick it needs to be
						NgChm.DET.texPixels[pos] = color['r'];
						NgChm.DET.texPixels[pos + 1] = color['g'];
						NgChm.DET.texPixels[pos + 2] = color['b'];
						NgChm.DET.texPixels[pos + 3] = color['a'];
						pos+=NgChm.SUM.BYTE_PER_RGBA;	// 4 bytes per color
					}
	
					// padding between class bars
					pos+=NgChm.DET.paddingHeight*NgChm.SUM.BYTE_PER_RGBA;
					pos+=(mapWidth - currentClassBar.height)*NgChm.SUM.BYTE_PER_RGBA;
				}
			}
			offset+= currentClassBar.height*NgChm.SUM.BYTE_PER_RGBA;
		}
	}	
}

//Calculate the maximum size of all row class bar labels and update NgChm.DET.rowLabelLen if the value
//of any label exceeds the existing maximum stored in that variable
NgChm.DET.calcRowClassBarLabels = function () {
	var rowClassBarConfigOrder = NgChm.heatMap.getRowClassificationOrder();
	var scale =  NgChm.DET.canvas.clientWidth / (NgChm.DET.dataViewWidth + NgChm.DET.calculateTotalClassBarHeight("row")+NgChm.DET.dendroWidth);
	var rowClassBarConfig = NgChm.heatMap.getRowClassificationConfig();
	var rowClassLength = Object.keys(rowClassBarConfig).length;
	if (rowClassBarConfig != null && rowClassLength > 0) {
		NgChm.DET.rowClassLabelFont = NgChm.DET.rowClassBarLabelFont();
		if ((NgChm.DET.rowClassLabelFont > NgChm.DET.minLabelSize)  && (NgChm.DET.colClassLabelFont < NgChm.DET.maxLabelSize)) {
			for (var i=0;i< rowClassBarConfigOrder.length;i++) {
				var key = rowClassBarConfigOrder[i];
				var currentClassBar = rowClassBarConfig[rowClassBarConfigOrder[i]];
				if (currentClassBar.show === 'Y') {
					var currFont = Math.min((currentClassBar.height - NgChm.DET.paddingHeight) * scale, NgChm.DET.maxLabelSize);
					var labelText = NgChm.UTIL.getLabelText(key);
					NgChm.DET.calcLabelDiv(labelText, NgChm.DET.rowClassLabelFont, 'COL');
				} 
			} 
		}	
	}
}

//This function draws row class bar labels on the detail panel
NgChm.DET.detailDrawRowClassBarLabels = function () {
	var rowClassBarConfigOrder = NgChm.heatMap.getRowClassificationOrder();
	if (document.getElementById("missingDetRowClassBars"))document.getElementById("missingDetRowClassBars").remove();
	var scale =  NgChm.DET.canvas.clientWidth / (NgChm.DET.dataViewWidth + NgChm.DET.calculateTotalClassBarHeight("row")+NgChm.DET.dendroWidth);
	var rowClassBarConfig = NgChm.heatMap.getRowClassificationConfig();
	var rowClassLength = Object.keys(rowClassBarConfig).length;
	if (rowClassBarConfig != null && rowClassLength > 0) {
		var startingPoint = (NgChm.DET.dendroWidth*scale)+NgChm.DET.rowClassLabelFont + 2;
		if (NgChm.DET.rowClassLabelFont > NgChm.DET.minLabelSize) {
			for (var i=0;i< rowClassBarConfigOrder.length;i++) {
				var key = rowClassBarConfigOrder[i];
				var currentClassBar = rowClassBarConfig[rowClassBarConfigOrder[i]];
				var textLoc = (currentClassBar.height/2) - Math.floor(NgChm.DET.rowClassLabelFont/2);
				var xPos = startingPoint+(textLoc*scale);
				var yPos = NgChm.DET.canvas.clientHeight + 4;
				if (currentClassBar.show === 'Y') {
					var currFont = Math.min((currentClassBar.height - NgChm.DET.paddingHeight) * scale, NgChm.DET.maxLabelSize);
					var labelText = NgChm.UTIL.getLabelText(key);
					if (currFont >= NgChm.DET.rowClassLabelFont) {
						NgChm.DET.addLabelDiv(NgChm.DET.labelElement, 'detail_classrow' + i, 'DynamicLabel ClassBar', labelText, xPos, yPos, NgChm.DET.rowClassLabelFont, 'T', i, "RowCovar");
					}
					yPos += (currentClassBar.height * scale);
				} else {
					if (!document.getElementById("missingDetRowClassBars")){
						var x = NgChm.DET.dendroWidth*scale + 10;
						var y = NgChm.DET.canvas.clientHeight+2;
						NgChm.DET.addLabelDiv(NgChm.DET.labelElement, "missingDetRowClassBars", "ClassBar MarkLabel", "...", x, y, 10, 'T', i, "Row");
					}
					if (!document.getElementById("missingRowClassBars")){
						var x = NgChm.DET.canvas.clientWidth/NgChm.SUM.totalWidth + 10;
						var y = NgChm.DET.canvas.clientHeight + 2;
						NgChm.DET.addLabelDiv(document.getElementById('sumlabelDiv'), "missingRowClassBars", "ClassBar MarkLabel", "...", x, y, 10, "T", null,"Row");
					}
				}
				startingPoint += (currentClassBar.height*scale);
			} 
		}	
	}
}

NgChm.DET.calculateTotalClassBarHeight = function (axis) {
	var totalHeight = 0;
	if (axis === "row") {
		var classBars = NgChm.heatMap.getRowClassificationConfig();
	} else {
		var classBars = NgChm.heatMap.getColClassificationConfig();
	}
	for (var key in classBars){
		if (classBars[key].show === 'Y') {
		   totalHeight += parseInt(classBars[key].height);
		}
	}
	return totalHeight;
}

/******************************************************
 *****  DETAIL DENDROGRAM FUNCTIONS START HERE!!! *****
 ******************************************************/

//Note: stop position passed in is actually one past the last row/column to be displayed.

NgChm.DET.buildDetailDendroMatrix = function (axis, start, stop, heightRatio) {
	var start3NIndex = convertMapIndexTo3NSpace(start);
	var stop3NIndex = convertMapIndexTo3NSpace(stop);
	var boxLength, currentIndex, matrixWidth, dendroBars, dendroInfo;
	
	var selectedBars;
	
	if (axis =='col'){ // assign proper axis-specific variables
		dendroInfo = NgChm.heatMap.getColDendroData(); // dendro JSON object
		boxLength = NgChm.DET.dataBoxWidth;
		matrixWidth = NgChm.DET.dataViewWidth;
		dendroBars = NgChm.SUM.colDendro.getBars(); // array of the dendro bars
		selectedBars = NgChm.SUM.colDendro.getSelectedBars(); 
	} else {
		dendroInfo = NgChm.heatMap.getRowDendroData(); // dendro JSON object
		boxLength = NgChm.DET.dataBoxHeight;
		matrixWidth = NgChm.DET.dataViewHeight;
		dendroBars = NgChm.SUM.rowDendro.getBars();
		selectedBars = NgChm.SUM.rowDendro.getSelectedBars();
	}
	var numNodes = dendroInfo.length;
	var lastRow = dendroInfo[numNodes-1];
	var matrix = new Array(NgChm.DET.normDendroMatrixHeight+1);
	for (var i = 0; i < NgChm.DET.normDendroMatrixHeight+1; i++){
		matrix[i] = new Array(matrixWidth-1);
	}
	var topLineArray = new Array(matrixWidth-1); // this array is made to keep track of which bars have vertical lines that extend outside the matrix
	var maxHeight = Number(lastRow.split(",")[2])/(heightRatio); // this assumes the heightData is ordered from lowest height to highest
	
	// check the left and right endpoints of each bar, and see if they are within the bounds.
	// then check if the bar is in the desired height. 
	// if it is, draw it in its entirety, otherwise, see if the bar has a vertical connection with any of the bars in view
	for (var i = 0; i < numNodes; i++){
		var bar = dendroInfo[i];
		var tokes = bar.split(",");
		var leftJsonIndex = Number(tokes[0]);
		var rightJsonIndex = Number(tokes[1]);
		var height = Number(tokes[2]);
		var left3NIndex = convertJsonIndexTo3NSpace(leftJsonIndex); // location in dendroBars space
		var right3NIndex = convertJsonIndexTo3NSpace(rightJsonIndex);
		if (right3NIndex < start3NIndex || stop3NIndex < left3NIndex){continue} //if the bar exists outside of the viewport, skip it
		
		var leftLoc = convertJsonIndexToDataViewSpace(leftJsonIndex); // Loc is the location in the dendro matrix
		var rightLoc = convertJsonIndexToDataViewSpace(rightJsonIndex);
		var normHeight = height < 0.0001*matrix.length ? 1 : Math.round(NgChm.DET.normDendroMatrixHeight*height/maxHeight); // height in matrix (if height is roughly 0, treat as such)
		var leftEnd = Math.max(leftLoc, 0);
		var rightEnd = Math.min(rightLoc, matrixWidth-1);
		
		//  determine if the bar is within selection??
		var value = 1;
		if (selectedBars){
			for (var k = 0; k < selectedBars.length; k++){
				var selectedBar = selectedBars[k];
				if ((selectedBar.left <= left3NIndex && right3NIndex <= selectedBar.right) && Math.round(500*height/(maxHeight*heightRatio)) <= selectedBar.height)
				value = 2;
			}
		}
		
		if (height > maxHeight){ // if this line is beyond the viewport max height
			if (start3NIndex < right3NIndex &&  right3NIndex< stop3NIndex && topLineArray[rightLoc] != 1){ // check to see if it will be connecting vertically to a line in the matrix 
				var drawHeight = NgChm.DET.normDendroMatrixHeight;
				while (drawHeight > 0 && !matrix[drawHeight][rightLoc]){ // these are the lines that will be connected to the highest level dendro leaves
					matrix[drawHeight][rightLoc] = value;
					drawHeight--;
				}
			}
			if (start3NIndex < left3NIndex &&  left3NIndex< stop3NIndex && topLineArray[leftLoc] != 1){// these are the lines that will be connected to the highest level dendro leaves
				var drawHeight = NgChm.DET.normDendroMatrixHeight;
				while (drawHeight > 0 && !matrix[drawHeight][leftLoc]){
					matrix[drawHeight][leftLoc] = value;
					drawHeight--;
				}
			}
			for (var loc = leftEnd; loc < rightEnd; loc++){
				topLineArray[loc] = 1; // mark that the area covered by this bar can no longer be drawn in  by another, higher level bar
			}
		} else { // this line is within the viewport height
			for (var j = leftEnd; j < rightEnd; j++){ // draw horizontal lines
				matrix[normHeight][j] = value;
			}
			var drawHeight = normHeight-1;
			while (drawHeight > 0 && !matrix[drawHeight][leftLoc] && leftLoc > 0){	// draw left vertical line
				matrix[drawHeight][leftLoc] = value;
				drawHeight--;
			}
			drawHeight = normHeight;
			while (!matrix[drawHeight][rightLoc] && drawHeight > 0 && rightLoc < matrixWidth-1){ // draw right vertical line
				matrix[drawHeight][rightLoc] = value;
				drawHeight--;
			}
		}
	}
	
	// fill in any missing leaves but only if the viewport is zoomed in far enough to tell.
	if (stop - start < 100){
		var numLeafsDrawn = 0;
		for (var j in matrix[1]){numLeafsDrawn++}
		var pos = Math.round(boxLength/2);
		if (numLeafsDrawn < stop-start){ // have enough lines been drawn?
			for (var i = 0; i < stop-start; i++){
				var height = 1;
				if (matrix[height][pos] != 1){
					while (height < NgChm.DET.normDendroMatrixHeight+1){
						matrix[height][pos] = 1;
						height++;
					}
				}
				pos += boxLength;
			}
		}
	}
	
	return matrix;
	
	// HELPER FUNCTIONS
	function convertMapIndexTo3NSpace(index){
		return index*NgChm.DDR.pointsPerLeaf - 2;
	}
	function convertJsonIndexTo3NSpace(index){
		if (index < 0){
			index = 0-index; // make index a positive number to find the leaf
			return index*NgChm.DDR.pointsPerLeaf - 2;
		} else {
			index--; // dendroBars is stored in 3N, so we convert back
			return Math.round((dendroBars[index].left + dendroBars[index].right)/2); // gets the middle point of the bar
		}
	}
	function convertJsonIndexToDataViewSpace(index){
		if (index < 0){
			index = 0-index; // make index a positive number to find the leaf
			return (index - start)*boxLength+ Math.round(boxLength/2)
		} else {
			index--; // dendroBars is stored in 3N, so we convert back
			var normDistance = (Math.round((dendroBars[index].left+ dendroBars[index].right)/2)-start3NIndex) / (stop3NIndex-start3NIndex); // gets the middle point of the bar
			return Math.round(normDistance*matrixWidth);
		}
	}
}

NgChm.DET.colDendroMatrixCoordToDetailTexturePos = function (matrixRow,matrixCol) {
	var mapx = matrixCol*NgChm.DET.getSamplingRatio('row');
	var mapy = Math.round(matrixRow/NgChm.DET.normDendroMatrixHeight * (NgChm.DET.dendroHeight-1));
	var detailTotalWidth = NgChm.DET.dendroWidth + NgChm.DET.calculateTotalClassBarHeight("row") + NgChm.DET.dataViewWidth;
	var pos = (detailTotalWidth*(NgChm.DET.calculateTotalClassBarHeight("column") + NgChm.DET.dataViewHeight))*NgChm.SUM.BYTE_PER_RGBA;
	pos += (NgChm.DET.dendroWidth + NgChm.DET.calculateTotalClassBarHeight("row")-1)*NgChm.SUM.BYTE_PER_RGBA;
	pos += ((mapy)*detailTotalWidth)*NgChm.SUM.BYTE_PER_RGBA + matrixCol*NgChm.SUM.BYTE_PER_RGBA;
	return pos;
}

//convert matrix coord to data buffer position (leftmost column of matrix corresponds to the top row of the map)
NgChm.DET.rowDendroMatrixCoordToDetailTexturePos = function (matrixRow,matrixCol) {
	var mapx = NgChm.DET.dataViewHeight - matrixCol-NgChm.DET.dataViewBorder/2;
	var mapy = NgChm.DET.dendroWidth - Math.round(matrixRow/NgChm.DET.normDendroMatrixHeight * NgChm.DET.dendroWidth); // bottom most row of matrix is at the far-right of the map dendrogram 
	var detailTotalWidth = NgChm.DET.dendroWidth + NgChm.DET.calculateTotalClassBarHeight("row") + NgChm.DET.dataViewWidth;
	var pos = (mapx*detailTotalWidth)*NgChm.SUM.BYTE_PER_RGBA + (mapy)*NgChm.SUM.BYTE_PER_RGBA; // pass the empty space (if any) and the border width, to get to the height on the map
	return pos;
}

NgChm.DET.detailDrawColDendrogram = function (dataBuffer, shift) {
	var detailTotalWidth = NgChm.DET.dendroWidth + NgChm.DET.calculateTotalClassBarHeight("row") + NgChm.DET.dataViewWidth;
	shift = !shift || isNaN(shift) ? 0 : shift;
	for (var i = 0; i < NgChm.DET.colDendroMatrix.length; i++){
		var line = NgChm.DET.colDendroMatrix[i]; // line = each row of the col dendro matrix
		for (var j in line){
			var pos = NgChm.DET.colDendroMatrixCoordToDetailTexturePos(i,Number(j));// + shift*NgChm.SUM.BYTE_PER_RGBA;
			if (j > NgChm.DET.dataViewWidth){ // TODO: find out why some rows in the dendro matrix are longer than they should be
				continue;
			}else {
				if (NgChm.DET.colDendroMatrix[i][j] == 1)
					dataBuffer[pos] = 3,dataBuffer[pos+1] = 3,dataBuffer[pos+2] = 3,dataBuffer[pos+3] = 255;
				else if (NgChm.DET.colDendroMatrix[i][j] == 2) {
					var posB = pos-4;
					dataBuffer[posB] = 3,dataBuffer[posB+1] = 3,dataBuffer[posB+2] = 3,dataBuffer[posB+3] = 255;
					dataBuffer[pos] = 3,dataBuffer[pos+1] = 3,dataBuffer[pos+2] = 3,dataBuffer[pos+3] = 255;
					posB = pos+4;
					dataBuffer[posB] = 3,dataBuffer[posB+1] = 3,dataBuffer[posB+2] = 3,dataBuffer[posB+3] = 255;
				}
				//	dataBuffer[pos] = 3,dataBuffer[pos+1] = 255,dataBuffer[pos+2] = 3,dataBuffer[pos+3] = 255;
				// if the dendro size has been changed in preferences, make sure the pixels above and below are filled in
				if (NgChm.heatMap.getColDendroConfig().height/100 > 1.5 && NgChm.DET.colDendroMatrix[i+1] && NgChm.DET.colDendroMatrix[i+1][j] && NgChm.DET.colDendroMatrix[i-1][j]){
					pos -= (NgChm.DET.dendroWidth + NgChm.DET.calculateTotalClassBarHeight("row") + NgChm.DET.dataViewWidth)*NgChm.SUM.BYTE_PER_RGBA;
					dataBuffer[pos] = 3,dataBuffer[pos+1] = 3,dataBuffer[pos+2] = 3,dataBuffer[pos+3] = 255;
					pos += (NgChm.DET.dendroWidth + NgChm.DET.calculateTotalClassBarHeight("row") + NgChm.DET.dataViewWidth)*2*NgChm.SUM.BYTE_PER_RGBA;
					dataBuffer[pos] = 3,dataBuffer[pos+1] = 3,dataBuffer[pos+2] = 3,dataBuffer[pos+3] = 255;
				}
			}
		}
	}
}

NgChm.DET.drawDetMap = function () { // draw the green dots *** is this a debug function? ***
	
	NgChm.DET.gl.activeTexture(NgChm.DET.gl.TEXTURE0);
	NgChm.DET.gl.texImage2D(
			NgChm.DET.gl.TEXTURE_2D, 
			0, 
			NgChm.DET.gl.RGBA, 
			NgChm.DET.textureParams['width'], 
			NgChm.DET.textureParams['height'], 
			0, 
			NgChm.DET.gl.RGBA,
			NgChm.DET.gl.UNSIGNED_BYTE, 
			NgChm.DET.texPixels);
	NgChm.DET.gl.uniform2fv(NgChm.DET.uScale, NgChm.DET.canvasScaleArray);
	NgChm.DET.gl.uniform2fv(NgChm.DET.uTranslate, NgChm.DET.canvasTranslateArray);
	NgChm.DET.gl.drawArrays(NgChm.DET.gl.TRIANGLE_STRIP, 0, NgChm.DET.gl.buffer.numItems);
}

NgChm.DET.detailDrawRowDendrogram = function (dataBuffer) {
	var selectionColor = "#000000";
	for (var i = 0; i <= NgChm.DET.rowDendroMatrix.length+1; i++){
		var line = NgChm.DET.rowDendroMatrix[i]; // line = each row of the col dendro matrix
		for (var j  in line){
			var pos = NgChm.DET.rowDendroMatrixCoordToDetailTexturePos(i,Number(j));
			if (j > NgChm.DET.dataViewHeight){ // TODO: find out why some rows in the dendro matrix are longer than they should be
				continue;
			} else {
				if (NgChm.DET.rowDendroMatrix[i][j] == 1)
					dataBuffer[pos] = 3,dataBuffer[pos+1] = 3,dataBuffer[pos+2] = 3,dataBuffer[pos+3] = 255;
				else if (NgChm.DET.rowDendroMatrix[i][j] == 2) {
					var posB = pos-4;
					dataBuffer[posB] = 3,dataBuffer[posB+1] = 3,dataBuffer[posB+2] = 3,dataBuffer[posB+3] = 255;
					dataBuffer[pos] = 3,dataBuffer[pos+1] = 3,dataBuffer[pos+2] = 3,dataBuffer[pos+3] = 255;
					posB = pos+4;
					dataBuffer[posB] = 3,dataBuffer[posB+1] = 3,dataBuffer[posB+2] = 3,dataBuffer[posB+3] = 255;
				}
				// this prevents gaps from appearing in the dendro when the user scales the dendro beyond 150%
				if (NgChm.heatMap.getRowDendroConfig().height/100 > 1.5 && NgChm.DET.rowDendroMatrix[i+1] && NgChm.DET.rowDendroMatrix[i+1][j] && NgChm.DET.rowDendroMatrix[i-1][j]){
					pos -= NgChm.SUM.BYTE_PER_RGBA;
					dataBuffer[pos] = 3,dataBuffer[pos+1] = 3,dataBuffer[pos+2] = 3,dataBuffer[pos+3] = 255;
					pos += 2*NgChm.SUM.BYTE_PER_RGBA;
					dataBuffer[pos] = 3,dataBuffer[pos+1] = 3,dataBuffer[pos+2] = 3,dataBuffer[pos+3] = 255;
				}
			}
		}
	}
}

NgChm.DET.clearDetailDendrograms = function () {
	var rowClassWidth = NgChm.DET.calculateTotalClassBarHeight('row');
	var detailFullWidth = NgChm.DET.dendroWidth + rowClassWidth  + NgChm.DET.dataViewWidth;
	var pos = 0;
	// clear the row dendro pixels
	for (var i =0; i < NgChm.DET.dataViewHeight*NgChm.SUM.BYTE_PER_RGBA; i++){
		for (var j = 0; j < NgChm.DET.dendroWidth*NgChm.SUM.BYTE_PER_RGBA; j++){
			NgChm.DET.texPixels[pos] = 0;
			pos++;
		};
		pos += ( NgChm.DET.dataViewWidth + rowClassWidth)*NgChm.SUM.BYTE_PER_RGBA;
	}
	//clear the column dendro pixels
	pos = (detailFullWidth) * (NgChm.DET.dataViewHeight + NgChm.DET.calculateTotalClassBarHeight("column")) * NgChm.SUM.BYTE_PER_RGBA;
	for (var i =0; i < NgChm.DET.dendroHeight; i++){
		for (var j = 0; j < detailFullWidth*NgChm.SUM.BYTE_PER_RGBA; j++){
			NgChm.DET.texPixels[pos] = 0;
			pos++;
		}
	}
}

NgChm.DET.getSamplingRatio = function (axis) {
	if (axis == 'row'){
		switch (NgChm.SEL.mode){
			case 'RIBBONH': return NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.RIBBON_HOR_LEVEL);
			case 'RIBBONV': return NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.RIBBON_VERT_LEVEL);
			default:        return NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.DETAIL_LEVEL);
		}
	} else {
		switch (NgChm.SEL.mode){
			case 'RIBBONH': return NgChm.heatMap.getColSummaryRatio(NgChm.MMGR.RIBBON_HOR_LEVEL);
			case 'RIBBONV': return NgChm.heatMap.getColSummaryRatio(NgChm.MMGR.RIBBON_VERT_LEVEL);
			default:        return  NgChm.heatMap.getColSummaryRatio(NgChm.MMGR.DETAIL_LEVEL);
		}
	}
}

/****************************************************
 *****  DETAIL DENDROGRAM FUNCTIONS END HERE!!! *****
 ****************************************************/

/***********************************************************
 * Search Functions Section
 ***********************************************************/

//Called when search string is entered.
NgChm.DET.detailSearch = function () {
	var searchElement = document.getElementById('search_text');
	var searchString = searchElement.value;
	if (searchString == "" || searchString == null){
		return;
	}
	NgChm.SEL.createEmptySearchItems();
	NgChm.SUM.clearSelectionMarks();
	var tmpSearchItems = searchString.split(/[;, ]+/);
	itemsFound = [];
	
	//Put labels into the global search item list if they match a user search string.
	//Regular expression is built for partial matches if the search string contains '*'.
	//toUpperCase is used to make the search case insensitive.
	var labels = NgChm.heatMap.getRowLabels()["labels"];
	for (var j = 0; j < tmpSearchItems.length; j++) {
		var reg;
		var searchItem = tmpSearchItems[j];
		if (searchItem.charAt(0) == "\"" && searchItem.slice(-1) == "\""){ // is it wrapped in ""?
			reg = new RegExp("^" + searchItem.toUpperCase().slice(1,-1) + "$");
		} else {
			reg = new RegExp(searchItem.toUpperCase());
		}
		for (var i = 0; i < labels.length; i++) {
			var label = labels[i].toUpperCase();
			if (label.indexOf('|') > -1)
				label = label.substring(0,label.indexOf('|'));
			
			if  (reg.test(label)) {
				NgChm.SEL.searchItems["Row"][i+1] = 1;
				if (itemsFound.indexOf(searchItem) == -1)
					itemsFound.push(searchItem);
			} 
		}	
	}

	labels = NgChm.heatMap.getColLabels()["labels"];
	for (var j = 0; j < tmpSearchItems.length; j++) {
		var reg;
		var searchItem = tmpSearchItems[j];
		if (searchItem.charAt(0) == "\"" && searchItem.slice(-1) == "\""){ // is it wrapped in ""?
			reg = new RegExp("^" + searchItem.toUpperCase().slice(1,-1) + "$");
		} else {
			reg = new RegExp(searchItem.toUpperCase());
		}
		for (var i = 0; i < labels.length; i++) {
			var label = labels[i].toUpperCase();
			if (label.indexOf('|') > -1)
				label = label.substring(0,label.indexOf('|'));
			
			if  (reg.test(label)) {
				NgChm.SEL.searchItems["Column"][i+1] = 1;
				if (itemsFound.indexOf(searchItem) == -1)
					itemsFound.push(searchItem);
			} 
		}	
	}

	//Jump to the first match
	if (searchString == null || searchString == ""){
		return;
	}
	NgChm.DET.searchNext();
	if (!NgChm.SEL.isSub){
		NgChm.SUM.drawRowSelectionMarks();
		NgChm.SUM.drawColSelectionMarks();
	}
	if (NgChm.DET.currentSearchItem.index && NgChm.DET.currentSearchItem.axis){
		if (itemsFound.length != tmpSearchItems.length && itemsFound.length > 0) {
			searchElement.style.backgroundColor = "rgba(255,255,0,0.3)";
		} else if (itemsFound.length == 0){
			searchElement.style.backgroundColor = "rgba(255,0,0,0.3)";
		}
	} else {
		if (searchString != null && searchString.length> 0) {
			searchElement.style.backgroundColor = "rgba(255,0,0,0.3)";
		}	
		//Clear previous matches when search is empty.
		NgChm.SEL.updateSelection();
	}
    
}

NgChm.DET.goToCurrentSearchItem = function () {
	if (NgChm.DET.currentSearchItem.axis == "Row") {
		NgChm.SEL.currentRow = NgChm.DET.currentSearchItem.index;
		if ((NgChm.SEL.mode == 'RIBBONV') && NgChm.SEL.selectedStart!= 0 && (NgChm.SEL.currentRow < NgChm.SEL.selectedStart-1 || NgChm.SEL.selectedStop-1 < NgChm.SEL.currentRow)){
			NgChm.UHM.showSearchError(1);
		} else if (NgChm.SEL.mode == 'RIBBONV' && NgChm.SEL.selectedStart == 0){
			NgChm.UHM.showSearchError(2);
		} 
		NgChm.SEL.checkRow();
	} else if (NgChm.DET.currentSearchItem.axis == "Column"){
		NgChm.SEL.currentCol = NgChm.DET.currentSearchItem.index;
		if ((NgChm.SEL.mode == 'RIBBONH') && NgChm.SEL.selectedStart!= 0 && (NgChm.SEL.currentCol < NgChm.SEL.selectedStart-1 || NgChm.SEL.selectedStop-1 < NgChm.SEL.currentCol )){
			NgChm.UHM.showSearchError(1)
		} else if (NgChm.SEL.mode == 'RIBBONH' && NgChm.SEL.selectedStart == 0){
			NgChm.UHM.showSearchError(2);
		} 
		NgChm.SEL.checkColumn();
	}
	NgChm.DET.showSrchBtns();
	NgChm.SEL.updateSelection();
}

NgChm.DET.findNextSearchItem = function (index, axis) {
	var axisLength = axis == "Row" ? NgChm.heatMap.getRowLabels().labels.length : NgChm.heatMap.getColLabels().labels.length;
	var otherAxis = axis == "Row" ? "Column" : "Row";
	var otherAxisLength = axis == "Column" ? NgChm.heatMap.getRowLabels().labels.length : NgChm.heatMap.getColLabels().labels.length;
	var curr = index;
	while( !NgChm.SEL.searchItems[axis][++curr] && curr <  axisLength); // find first searchItem in row
	if (curr >= axisLength){ // if no searchItems exist in first axis, move to other axis
		curr = -1;
		while( !NgChm.SEL.searchItems[otherAxis][++curr] && curr <  otherAxisLength);
		if (curr >=otherAxisLength){ // if no matches in the other axis, check the earlier indices of the first axis (loop back)
			curr = -1;
			while( !NgChm.SEL.searchItems[axis][++curr] && curr <  index);
			if (curr < index && index != -1){
				NgChm.DET.currentSearchItem["axis"] = axis;
				NgChm.DET.currentSearchItem["index"] = curr;
			}
		} else {
			NgChm.DET.currentSearchItem["axis"] = otherAxis;
			NgChm.DET.currentSearchItem["index"] = curr;
		}
	} else {
		NgChm.DET.currentSearchItem["axis"] = axis;
		NgChm.DET.currentSearchItem["index"] = curr;
	}
	
}

NgChm.DET.findPrevSearchItem = function (index, axis) {
	var axisLength = axis == "Row" ? NgChm.heatMap.getRowLabels().labels.length : NgChm.heatMap.getColLabels().labels.length;
	var otherAxis = axis == "Row" ? "Column" : "Row";
	var otherAxisLength = axis == "Column" ? NgChm.heatMap.getRowLabels().labels.length : NgChm.heatMap.getColLabels().labels.length;
	var curr = index;
	while( !NgChm.SEL.searchItems[axis][--curr] && curr > -1 ); // find first searchItem in row
	if (curr < 0){ // if no searchItems exist in first axis, move to other axis
		curr = otherAxisLength;
		while( !NgChm.SEL.searchItems[otherAxis][--curr] && curr > -1);
		if (curr > 0){
			NgChm.DET.currentSearchItem["axis"] = otherAxis;
			NgChm.DET.currentSearchItem["index"] = curr;
		} else {
			curr = axisLength;
			while( !NgChm.SEL.searchItems[axis][--curr] && curr > index );
			if (curr > index){
				NgChm.DET.currentSearchItem["axis"] = axis;
				NgChm.DET.currentSearchItem["index"] = curr;
			}
		}
	} else {
		NgChm.DET.currentSearchItem["axis"] = axis;
		NgChm.DET.currentSearchItem["index"] = curr;
	}
}

//Go to next search item
NgChm.DET.searchNext = function () {
	if (!NgChm.DET.currentSearchItem["index"] || !NgChm.DET.currentSearchItem["axis"]){ // if currentSeachItem isnt set (first time search)
		NgChm.DET.findNextSearchItem(-1,"Row");
	} else {
		NgChm.DET.findNextSearchItem(NgChm.DET.currentSearchItem["index"],NgChm.DET.currentSearchItem["axis"]);
	}
	NgChm.DET.goToCurrentSearchItem();
}

//Go back to previous search item.
NgChm.DET.searchPrev = function () {
	NgChm.DET.findPrevSearchItem(NgChm.DET.currentSearchItem["index"],NgChm.DET.currentSearchItem["axis"]);
	NgChm.DET.goToCurrentSearchItem();
}

//Called when red 'X' is clicked.
NgChm.DET.clearSearch = function (event) {
	var searchElement = document.getElementById('search_text');
	searchElement.value = "";
	NgChm.DET.currentSearchItem = {};
	NgChm.DET.labelLastClicked = {};
	NgChm.SEL.createEmptySearchItems();
	if (NgChm.SEL.isSub){
		localStorage.setItem('selected', JSON.stringify(NgChm.SEL.searchItems));
		NgChm.SEL.updateSelection();
	} else {
		NgChm.SUM.clearSelectionMarks();
	}
	NgChm.SUM.colDendro.clearSelectedBars();
	NgChm.SUM.rowDendro.clearSelectedBars();
	NgChm.DET.clearSrchBtns(event);
	NgChm.DET.detailResize();
	//NgChm.DET.drawDetailHeatMap();  //DO WE NEED THIS???
}

NgChm.DET.clearSrchBtns = function (event) {
	if ((event != null) && (event.keyCode == 13))
		return;
	
	document.getElementById('prev_btn').style.display='none';
	document.getElementById('next_btn').style.display='none';	
	document.getElementById('cancel_btn').style.display='none';	
	var srchText = document.getElementById('search_text');
	srchText.style.backgroundColor = "white";
}

NgChm.DET.showSrchBtns = function () {
	document.getElementById('prev_btn').style.display='';
	document.getElementById('next_btn').style.display='';
	document.getElementById('cancel_btn').style.display='';
}

//Return the column number of any columns meeting the current user search.
NgChm.DET.getSearchCols = function () {
	var selected = [];
	for (var i in NgChm.SEL.searchItems["Column"]) {
		selected.push(i);
	}
	return selected;	
}

//Return row numbers of any rows meeting current user search.
NgChm.DET.getSearchRows = function () {
	var selected = [];
	for (var i in NgChm.SEL.searchItems["Row"]) {
		selected.push(i);
	}
	return selected;
}

/***********************************************************
 * End - Search Functions
 ***********************************************************/

/****************************************************
 *****  WebGL stuff *****
 ****************************************************/

NgChm.DET.detSetupGl = function () {
	NgChm.DET.gl = NgChm.SUM.webGlGetContext(NgChm.DET.canvas);
	if (!NgChm.DET.gl) { return; }
	NgChm.DET.gl.viewportWidth = NgChm.DET.dataViewWidth+NgChm.DET.calculateTotalClassBarHeight("row")+NgChm.DET.dendroWidth;
	NgChm.DET.gl.viewportHeight = NgChm.DET.dataViewHeight+NgChm.DET.calculateTotalClassBarHeight("column")+NgChm.DET.dendroHeight;
	NgChm.DET.gl.clearColor(1, 1, 1, 1);

	var program = NgChm.DET.gl.createProgram();
	var vertexShader = NgChm.DET.getDetVertexShader(NgChm.DET.gl);
	var fragmentShader = NgChm.DET.getDetFragmentShader(NgChm.DET.gl);
	NgChm.DET.gl.program = program;
	NgChm.DET.gl.attachShader(program, vertexShader);
	NgChm.DET.gl.attachShader(program, fragmentShader);
	NgChm.DET.gl.linkProgram(program);
	NgChm.DET.gl.useProgram(program);
}

NgChm.DET.getDetVertexShader = function (theGL) {
	var source = 'attribute vec2 position;    ' +
		         'varying vec2 v_texPosition; ' +
		         'uniform vec2 u_translate;   ' +
		         'uniform vec2 u_scale;       ' +
		         'void main () {              ' +
		         '  vec2 scaledPosition = position * u_scale;               ' +
		         '  vec2 translatedPosition = scaledPosition + u_translate; ' +
		         '  gl_Position = vec4(translatedPosition, 0, 1);           ' +
		         '  v_texPosition = position * 0.5 + 0.5;                   ' +
		         '}';


	var shader = theGL.createShader(theGL.VERTEX_SHADER);
	theGL.shaderSource(shader, source);
	theGL.compileShader(shader);
	if (!theGL.getShaderParameter(shader, theGL.COMPILE_STATUS)) {
        alert(theGL.getShaderInfoLog(shader));
    }

	return shader;
}

NgChm.DET.getDetFragmentShader = function (theGL) {
	var source = 'precision mediump float;        ' +
		  		 'varying vec2 v_texPosition;     ' +
 		 		 'varying float v_boxFlag;        ' +
 		 		 'uniform sampler2D u_texture;    ' +
 		 		 'void main () {                  ' +
 		 		 '	  gl_FragColor = texture2D(u_texture, v_texPosition); ' +
 		 		 '}'; 


	var shader = theGL.createShader(theGL.FRAGMENT_SHADER);
	theGL.shaderSource(shader, source);
	theGL.compileShader(shader);
	if (!theGL.getShaderParameter(shader, theGL.COMPILE_STATUS)) {
        alert(theGL.getShaderInfoLog(shader));
    }

	return shader;
}

NgChm.DET.detInitGl = function () {
	NgChm.DET.gl.viewport(0, 0, NgChm.DET.gl.viewportWidth, NgChm.DET.gl.viewportHeight);
	NgChm.DET.gl.clear(NgChm.DET.gl.COLOR_BUFFER_BIT);

	// Vertices
	var buffer = NgChm.DET.gl.createBuffer();
	NgChm.DET.gl.buffer = buffer;
	NgChm.DET.gl.bindBuffer(NgChm.DET.gl.ARRAY_BUFFER, buffer);
	var vertices = [ -1, -1, 1, -1, 1, 1, -1, -1, -1, 1, 1, 1 ];
	NgChm.DET.gl.bufferData(NgChm.DET.gl.ARRAY_BUFFER, new Float32Array(vertices), NgChm.DET.gl.STATIC_DRAW);
	var byte_per_vertex = Float32Array.BYTES_PER_ELEMENT;
	var component_per_vertex = 2;
	buffer.numItems = vertices.length / component_per_vertex;
	var stride = component_per_vertex * byte_per_vertex;
	var program = NgChm.DET.gl.program;
	var position = NgChm.DET.gl.getAttribLocation(program, 'position');
	NgChm.DET.uScale = NgChm.DET.gl.getUniformLocation(program, 'u_scale');
	NgChm.DET.uTranslate = NgChm.DET.gl.getUniformLocation(program, 'u_translate');
	NgChm.DET.gl.enableVertexAttribArray(position);
	NgChm.DET.gl.vertexAttribPointer(position, 2, NgChm.DET.gl.FLOAT, false, stride, 0);

	// Texture
	var texture = NgChm.DET.gl.createTexture();
	NgChm.DET.gl.bindTexture(NgChm.DET.gl.TEXTURE_2D, texture);
	NgChm.DET.gl.texParameteri(
			NgChm.DET.gl.TEXTURE_2D, 
			NgChm.DET.gl.TEXTURE_WRAP_S, 
			NgChm.DET.gl.CLAMP_TO_EDGE);
	NgChm.DET.gl.texParameteri(
			NgChm.DET.gl.TEXTURE_2D, 
			NgChm.DET.gl.TEXTURE_WRAP_T, 
			NgChm.DET.gl.CLAMP_TO_EDGE);
	NgChm.DET.gl.texParameteri(
			NgChm.DET.gl.TEXTURE_2D, 
			NgChm.DET.gl.TEXTURE_MIN_FILTER,
			NgChm.DET.gl.NEAREST);
	NgChm.DET.gl.texParameteri(
			NgChm.DET.gl.TEXTURE_2D, 
			NgChm.DET.gl.TEXTURE_MAG_FILTER, 
			NgChm.DET.gl.NEAREST);
	
	NgChm.DET.textureParams = {};

	var texWidth = null, texHeight = null, texData;
	texWidth = NgChm.DET.dataViewWidth + NgChm.DET.calculateTotalClassBarHeight("row")+NgChm.DET.dendroWidth;
	texHeight = NgChm.DET.dataViewHeight + NgChm.DET.calculateTotalClassBarHeight("column")+NgChm.DET.dendroHeight;
	texData = new ArrayBuffer(texWidth * texHeight * 4);
	NgChm.DET.texPixels = new Uint8Array(texData);
	NgChm.DET.textureParams['width'] = texWidth;
	NgChm.DET.textureParams['height'] = texHeight; 
	
}

NgChm.DET.detSizerStart = function () {
	NgChm.UHM.userHelpClose();
	document.addEventListener('mousemove', NgChm.DET.detSizerMove);
	document.addEventListener('touchmove', NgChm.DET.detSizerMove);
	document.addEventListener('mouseup', NgChm.DET.detSizerEnd);
	document.addEventListener('touchend',NgChm.DET.detSizerEnd);
}

NgChm.DET.detSizerMove = function (e) {
	var summary = document.getElementById('summary_chm');
	var detail = document.getElementById('detail_chm');
	var divider = document.getElementById('divider');
	var detSizer = document.getElementById('detSizer');
	if (e.touches){
    	if (e.touches.length > 1){
    		return;
    	}
    }
	var Xmove = e.touches ? detSizer.getBoundingClientRect().right - e.touches[0].pageX : detSizer.getBoundingClientRect().right - e.pageX;
	var Ymove = e.touches ? detSizer.getBoundingClientRect().bottom - e.touches[0].pageY : detSizer.getBoundingClientRect().bottom - e.pageY;
	var detailX = detail.offsetWidth - Xmove;
	var detailY = detail.offsetHeight - Ymove;
	if (e.clientX > window.innerWidth || e.clientY > window.innerHeight){
		return;
	}
	if (!(detail.getBoundingClientRect().right > container.clientLeft+container.clientWidth && Xmove < 0)){
		detail.style.width=detailX+'px';
	}
	
	detail.style.height=detailY+'px';
	divider.style.height=Math.max(document.getElementById('detail_canvas').offsetHeight,document.getElementById('summary_canvas').offsetHeight + NgChm.SUM.colDendro.getDivHeight())+'px';
	NgChm.DET.clearLabels();
	NgChm.SUM.clearSelectionMarks();
}

NgChm.DET.detSizerEnd = function () {
	document.removeEventListener('mousemove', NgChm.DET.detSizerMove);
	document.removeEventListener('mouseup', NgChm.DET.detSizerEnd);
	document.removeEventListener('touchmove',NgChm.DET.detSizerMove);
	document.removeEventListener('touchend',NgChm.DET.detSizerEnd);
	// set summary and detail canvas sizes to percentages to avoid map getting pushed down on resize
	var container = document.getElementById('container');
	var summary = document.getElementById('summary_chm');
	var sumPercent = 100*summary.clientWidth / container.clientWidth;
	summary.style.width = sumPercent + "%";
	var detail = document.getElementById('detail_chm');
	var detPercent = 100*detail.clientWidth/container.clientWidth;
	detail.style.width = detPercent + "%";
	if (!NgChm.SEL.isSub){
		NgChm.SUM.summaryResize();
	}
	NgChm.DET.detailResize();
	NgChm.DET.drawRowAndColLabels();  
}

