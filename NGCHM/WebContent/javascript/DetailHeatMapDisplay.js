//Define Namespace for NgChm DetailHeatMapDisplay
NgChm.createNS('NgChm.DET');

NgChm.DET.canvas = null;
NgChm.DET.boxCanvas = null;  //canvas on top of WebGL canvas for selection box 
NgChm.DET.gl = null; // WebGL contexts
NgChm.DET.uScale = null;
NgChm.DET.uTranslate = null;

NgChm.DET.canvasScaleArray = new Float32Array([1.0, 1.0]);
NgChm.DET.canvasTranslateArray = new Float32Array([0, 0]);

NgChm.DET.labelElement = null; 
NgChm.DET.chmElement = null;

NgChm.DET.oldMousePos = [0, 0];
NgChm.DET.eventTimer = 0; // Used to delay draw updates
NgChm.DET.offsetX = 0;
NgChm.DET.offsetY = 0;
NgChm.DET.pageX = 0;
NgChm.DET.pageY = 0;

NgChm.DET.latestTap = null;
NgChm.DET.latestDoubleTap = null;
NgChm.DET.latestPinchDistance = null;
NgChm.DET.latestLabelTap = null;
NgChm.DET.latestTapLocation = null;

NgChm.DET.saveRow = null;
NgChm.DET.saveCol = null;
NgChm.DET.dataBoxHeight = null;
NgChm.DET.dataBoxWidth = null;

NgChm.DET.paddingHeight = 2;          // space between classification bars
NgChm.DET.rowDendro = null;
NgChm.DET.colDendro = null;
NgChm.DET.dendroHeight = 105;
NgChm.DET.dendroWidth = 105;
NgChm.DET.normDendroMatrixHeight = 200;
NgChm.DET.rowDendroMatrix = null;
NgChm.DET.colDendroMatrix = null;
NgChm.DET.rowZoomLevel = 1;
NgChm.DET.colZoomLevel = 1;
NgChm.DET.SIZE_NORMAL_MODE = 506;
NgChm.DET.dataViewHeight = 506;
NgChm.DET.dataViewWidth = 506;
NgChm.DET.dataViewBorder = 2;
NgChm.DET.zoomBoxSizes = [1,2,3,4,6,7,8,9,12,14,18,21,24,28,36,42,56,63,72,84,126,168,252];
NgChm.DET.minLabelSize = 5;
NgChm.DET.maxLabelSize = 11;
NgChm.DET.redrawSelectionTimeout = 0;   // Drawing delay in ms after the view has changed.
NgChm.DET.redrawUpdateTimeout = 10;	// Drawing delay in ms after a tile update (if needed).
NgChm.DET.minPixelsForGrid = 20;	// minimum element size for grid lines to display
NgChm.DET.labelLastClicked = {};

NgChm.DET.mouseDown = false;
NgChm.DET.dragOffsetX = null;
NgChm.DET.dragOffsetY = null;
NgChm.DET.detailPoint = null;
NgChm.DET.initialized = false;

NgChm.DET.rowLabelLen = 0;
NgChm.DET.colLabelLen = 0;
NgChm.DET.rowLabelFont = 0;
NgChm.DET.colLabelFont = 0;
NgChm.DET.colClassLabelFont = 0;
NgChm.DET.rowClassLabelFont = 0;

// Return true iff the Detail View is visible (i.e. contained in a visible pane).
NgChm.DET.isVisible = function isVisible () {
	if (NgChm.DET.chmElement == null) return false;
	const loc = NgChm.Pane.findPaneLocation (NgChm.DET.chmElement);
	return !loc.pane.classList.contains('collapsed');
};


//Call once to hook up detail drawing routines to a heat map and initialize the webGl 
NgChm.DET.initDetailDisplay = function () {

	NgChm.DET.currentSearchItem = {};
	NgChm.DET.labelLastClicked = {};

	NgChm.DET.canvas = document.getElementById('detail_canvas');
	NgChm.DET.boxCanvas = document.getElementById('detail_box_canvas');
	NgChm.DET.labelElement = document.getElementById('labelDiv');
	NgChm.DET.rowLabelDiv = document.getElementById("rowLabelDiv");
	NgChm.DET.colLabelDiv = document.getElementById("colLabelDiv");

	if (NgChm.heatMap.isInitialized() > 0) {
 		document.getElementById('flicks').style.display = '';
		document.getElementById('detail_buttons').style.display = '';
		document.getElementById('aboutMenu_btn').style.display = 'none';
		NgChm.DET.canvas.width =  (NgChm.DET.dataViewWidth + NgChm.DET.calculateTotalClassBarHeight("row"));
		NgChm.DET.canvas.height = (NgChm.DET.dataViewHeight + NgChm.DET.calculateTotalClassBarHeight("column"));
		NgChm.DET.detSetupGl();
		NgChm.DET.detInitGl();
		NgChm.LNK.createLabelMenus();
		NgChm.SEL.updateSelection();
	}
	
	NgChm.DET.canvas.oncontextmenu = NgChm.DET.matrixRightClick;
	NgChm.DET.canvas.onmouseup = NgChm.DET.clickEnd;
	NgChm.DET.canvas.onmousemove = NgChm.DET.handleMouseMove;
	NgChm.DET.canvas.onmouseout = NgChm.DET.handleMouseOut;
	
	NgChm.DET.canvas.onmousedown = NgChm.DET.clickStart;
	NgChm.DET.canvas.ondblclick = NgChm.DET.dblClick;
	
	
	NgChm.DET.canvas.addEventListener("touchstart", function(e){
		NgChm.UHM.hlpC();
		var now = new Date().getTime();
		var timesince = now - NgChm.DET.latestTap;
		if((timesince < 600) && (timesince > 0) && e.touches.length == 1){ // double tap
		}else if (e.touches.length == 2){ // two finger tap
		} else if (e.touches.length == 1) { // single finger tap
			NgChm.DET.latestTapLocation = NgChm.DET.getCursorPosition(e);
			NgChm.DET.clickStart(e);
		}
		NgChm.DET.latestTap = now;
	});
	
	NgChm.DET.canvas.addEventListener("touchmove", function(e){
		if (e.touches){
	    	if (e.touches.length > 2){
	    		clearTimeout(NgChm.DET.eventTimer);
	    		return false;
	    	} else if (e.touches.length == 2){
	    		clearTimeout(NgChm.DET.eventTimer);
	    		e.preventDefault();
	    		NgChm.DET.latestTap = null;
	    		var distance = Math.hypot(
	    			    e.touches[0].pageX - e.touches[1].pageX,
	    			    e.touches[0].pageY - e.touches[1].pageY);
	    		var distanceX = Math.abs(e.touches[0].clientX - e.touches[1].clientX);
	    		var distanceY = Math.abs(e.touches[0].clientY - e.touches[1].clientY);
	    		if (!NgChm.DET.latestPinchDistance){
	    			NgChm.DET.latestPinchDistance = distance;
	    		} else if (distance > NgChm.DET.latestPinchDistance){ // pinch inward
	    			NgChm.DET.detailDataZoomIn();
	    		} else if (NgChm.DET.latestPinchDistance > distance){ // pinch outward
	    			NgChm.DET.detailDataZoomOut();
	    		}
	    		NgChm.DET.latestPinchDistance = distance;
	    	} else if (e.touches.length == 1){
	    		clearTimeout(NgChm.DET.eventTimer);
	    		NgChm.DET.mouseDown = true;
	    		NgChm.DET.handleMoveDrag(e);
	    	}
	    }
	},false);
	
	NgChm.DET.canvas.addEventListener("touchend", function(e){
		if (e.touches.length == 0){
			NgChm.DET.mouseDown = false;
			NgChm.DET.latestPinchDistance = null;
			var now = new Date().getTime();
			if (NgChm.DET.latestTap){
				var timesince = now - NgChm.DET.latestTap;
				var coords = NgChm.DET.getCursorPosition(e);
				var diffX = Math.abs(coords.x - NgChm.DET.latestTapLocation.x); 
				var diffY = Math.abs(coords.y - NgChm.DET.latestTapLocation.y);
				var diffMax = Math.max(diffX,diffY);
				if (timesince > 500 && diffMax < 20){
					clearTimeout(NgChm.DET.eventTimer);
					NgChm.UHM.hlpC();
					NgChm.DET.matrixRightClick(e);
				} else if (timesince < 500 && diffMax < 20){
					NgChm.UHM.userHelpOpen();
				}
			}
	    }
	},false);
	
	
	// set up touch events for row and column labels
	
	NgChm.DET.rowLabelDiv.addEventListener("touchstart", function(e){
		NgChm.UHM.hlpC();
		var now = new Date().getTime();
		NgChm.DET.latestLabelTap = now;
	});
	
	NgChm.DET.rowLabelDiv.addEventListener("touchend", function(e){
		if (e.touches.length == 0){
			var now = new Date().getTime();
			var timesince = now - NgChm.DET.latestLabelTap;
			if (timesince > 500){
				NgChm.DET.labelRightClick(e);
			}
		}
	});
	
	NgChm.DET.colLabelDiv.addEventListener("touchstart", function(e){
		NgChm.UHM.hlpC();
		var now = new Date().getTime();
		NgChm.DET.latestLabelTap = now;
	});
	
	NgChm.DET.colLabelDiv.addEventListener("touchend", function(e){
		if (e.touches.length == 0){
			var now = new Date().getTime();
			var timesince = now - NgChm.DET.latestLabelTap;
			if (timesince > 500){
				NgChm.DET.labelRightClick(e);
			}
		}
	});
}

/*********************************************************************************************
 * FUNCTION:  getCursorPosition
 * 
 * The purpose of this function is to return the cursor position over the canvas.  
 *********************************************************************************************/
NgChm.DET.getCursorPosition = function (e) {
	var x,y;
	if (e.touches){
		if (e.touches.length > 0){
			var rect = e.target.getBoundingClientRect();
			x = Math.round(e.targetTouches[0].pageX - rect.left);
			y = Math.round(e.targetTouches[0].pageY - rect.top);
		} else {
			var rect = e.target.getBoundingClientRect();
			x = Math.round(e.changedTouches[0].pageX - rect.left);
			y = Math.round(e.changedTouches[0].pageY - rect.top);
		}
	} else {
		x = e.offsetX;
	    y = e.offsetY;
	}
    return {x:x, y:y};
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
	NgChm.UHM.hlpC();
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
		var rowTotalW = NgChm.DET.dataViewWidth + NgChm.DET.calculateTotalClassBarHeight("row");
		var colTotalH = NgChm.DET.dataViewHeight + NgChm.DET.calculateTotalClassBarHeight("column");
		// proportion space
		var rowDendroW = NgChm.DET.dendroWidth/rowTotalW;
		var colDendroH = NgChm.DET.dendroHeight/colTotalH;
		var rowClassW = NgChm.DET.calculateTotalClassBarHeight("row")/rowTotalW;
		var colClassH = NgChm.DET.calculateTotalClassBarHeight("column")/colTotalH;
		var mapW = NgChm.DET.dataViewWidth/rowTotalW;
		var mapH = NgChm.DET.dataViewHeight/colTotalH;
		var clickX = coords.x/divW;
		var clickY = coords.y/divH;
		NgChm.DET.offsetX = coords.x;
		NgChm.DET.offsetY = coords.y;
		NgChm.DET.pageX = e.targetTouches ? e.targetTouches[0].pageX : e.pageX;
		NgChm.DET.pageY = e.targetTouches ? e.targetTouches[0].pageY : e.pageY;
		if (NgChm.DET.eventTimer != 0) {
			clearTimeout(NgChm.DET.eventTimer);
		}
		NgChm.DET.eventTimer = setTimeout(NgChm.UHM.userHelpOpen, 500);
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
			//Reset mouse event indicators
			NgChm.DET.mouseDown = false;
			//Set cursor back to default
			NgChm.DET.canvas.style.cursor="default";
		}
	}
	NgChm.SUM.mouseEventActive = false;
}

/*********************************************************************************************
 * FUNCTION:  dblClick
 * 
 * The purpose of this function is to handle the situation where the user double-clicks on the
 * detail heat map canvas.  In this case a zoom action is performed.  Zoom in if the shift key
 * is not held down and zoom out if the key is held down.
 *********************************************************************************************/
NgChm.DET.dblClick = function(e) {
	//turn off single click help if double click
	clearTimeout(NgChm.DET.eventTimer);
	NgChm.UHM.hlpC();
	//Get cursor position and convert to matrix row / column
	var rowElementSize = NgChm.DET.dataBoxWidth * NgChm.DET.canvas.clientWidth/NgChm.DET.canvas.width; 
	var colElementSize = NgChm.DET.dataBoxHeight * NgChm.DET.canvas.clientHeight/NgChm.DET.canvas.height;
	var coords = NgChm.DET.getCursorPosition(e);
	var mapLocY = coords.y - NgChm.DET.getColClassPixelHeight();
	var mapLocX = coords.x - NgChm.DET.getRowClassPixelWidth();

	var clickRow = Math.floor(NgChm.SEL.currentRow + (mapLocY/colElementSize)*NgChm.DET.getSamplingRatio('row'));
	var clickCol = Math.floor(NgChm.SEL.currentCol + (mapLocX/rowElementSize)*NgChm.DET.getSamplingRatio('col'));
	var destRow = clickRow + 1 - Math.floor(NgChm.SEL.getCurrentDetDataPerCol()/2);
	var destCol = clickCol + 1 - Math.floor(NgChm.SEL.getCurrentDetDataPerRow()/2);
	
	// set up panning animation 
	var diffRow =  clickRow + 1 - Math.floor(NgChm.SEL.getCurrentDetDataPerCol()/2) - NgChm.SEL.currentRow;
	var diffCol =  clickCol + 1 - Math.floor(NgChm.SEL.getCurrentDetDataPerRow()/2) - NgChm.SEL.currentCol;
	var diffMax = Math.max(diffRow,diffCol);
	var numSteps = 7;
	var rowStep = diffRow/numSteps;
	var colStep = diffCol/numSteps;
	var steps = 1;
	//Special case - if in full map view, skip panning and jump to zoom
	if (NgChm.SEL.mode == 'FULL_MAP') 
		steps = numSteps;
		
	drawScene();
	function drawScene(now){
		steps++;
		if (steps < numSteps && !(NgChm.SEL.currentRow == destRow && NgChm.SEL.currentCol == destCol)){ // if we have not finished the animation, continue redrawing
			NgChm.SEL.currentRow = clickRow + 1 - Math.floor(NgChm.SEL.getCurrentDetDataPerCol()/2 + (numSteps-steps)*rowStep);
			NgChm.SEL.currentCol = clickCol + 1 - Math.floor(NgChm.SEL.getCurrentDetDataPerCol()/2 + (numSteps-steps)*colStep);
			NgChm.SEL.checkRow();
			NgChm.SEL.checkColumn();
			NgChm.SEL.updateSelection();
			requestAnimationFrame(drawScene); // requestAnimationFrame is a native JS function that calls drawScene after a short time delay
		} else { // if we are done animating, zoom in
			NgChm.SEL.currentRow = destRow;
			NgChm.SEL.currentCol = destCol;
			
			if (e.shiftKey) {
				NgChm.DET.detailDataZoomOut();
			} else {
				NgChm.DET.zoomAnimation(clickRow, clickCol);
			}
			//Center the map on the cursor position
			NgChm.SEL.checkRow();
			NgChm.SEL.checkColumn();
			NgChm.SEL.updateSelection();
		}
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
		clearTimeout(NgChm.DET.eventTimer);
		//If mouse is down and shift key is pressed, perform a drag selection
		//Else perform a drag move
		if (e.shiftKey) {
	        //process select drag only if the mouse is down AND the cursor is on the heat map.
            if((NgChm.DET.mouseDown) && (NgChm.DET.isOnObject(e,"map"))) {
			    NgChm.DET.clearSearch(e);
			    NgChm.DET.handleSelectDrag(e);
            }
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
	NgChm.DET.canvas.style.cursor="move"; 
    var rowElementSize = NgChm.DET.dataBoxWidth * NgChm.DET.canvas.clientWidth/NgChm.DET.canvas.width;
    var colElementSize = NgChm.DET.dataBoxHeight * NgChm.DET.canvas.clientHeight/NgChm.DET.canvas.height;
    if (e.touches){  //If more than 2 fingers on, don't do anything
    	if (e.touches.length > 1){
    		return false;
    	}
    } 
	var coords = NgChm.DET.getCursorPosition(e);
    var xDrag = coords.x - NgChm.DET.dragOffsetX;
    var yDrag = coords.y - NgChm.DET.dragOffsetY;
    if ((Math.abs(xDrag/rowElementSize) > 1) || (Math.abs(yDrag/colElementSize) > 1)) {
    	//Disregard vertical movement if the cursor is not on the heat map.
		if (!NgChm.DET.isOnObject(e,"colClass")) {
	    	NgChm.SEL.currentRow = Math.round(NgChm.SEL.currentRow - (yDrag/colElementSize));
			NgChm.DET.dragOffsetY = coords.y;
		}
		if (!NgChm.DET.isOnObject(e,"rowClass")) {
	    	NgChm.SEL.currentCol = Math.round(NgChm.SEL.currentCol - (xDrag/rowElementSize));
			NgChm.DET.dragOffsetX = coords.x;  //canvas X coordinate 
		}
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
	NgChm.DET.canvas.style.cursor="crosshair";
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
        NgChm.SUM.drawRowSelectionMarks();
        NgChm.SUM.drawColSelectionMarks();
        NgChm.SUM.drawTopItems();
        NgChm.DET.updateDisplayedLabels();
        NgChm.DET.drawSelections();
    }
}	


/*********************************************************************************************
 * FUNCTIONS:  getRowFromLayerY AND getColFromLayerX
 * 
 * The purpose of this function is to retrieve the row/col in the data matrix that matched a given
 * mouse location.  They utilize event.layerY/X for the mouse position.
 *********************************************************************************************/
NgChm.DET.getRowFromLayerY = function (layerY) {
    var colElementSize = NgChm.DET.dataBoxHeight * NgChm.DET.canvas.clientHeight/NgChm.DET.canvas.height;
	var colClassHeightPx = NgChm.DET.getColClassPixelHeight();
	var mapLocY = layerY - colClassHeightPx;
	return Math.floor(NgChm.SEL.currentRow + (mapLocY/colElementSize)*NgChm.DET.getSamplingRatio('row'));
}

NgChm.DET.getColFromLayerX = function (layerX) {
    var rowElementSize = NgChm.DET.dataBoxWidth * NgChm.DET.canvas.clientWidth/NgChm.DET.canvas.width; // px/Glpoint
	var rowClassWidthPx = NgChm.DET.getRowClassPixelWidth();
	var mapLocX = layerX - rowClassWidthPx;
	return Math.floor(NgChm.SEL.currentCol + (mapLocX/rowElementSize)*NgChm.DET.getSamplingRatio('col'));
}

/*********************************************************************************************
 * FUNCTIONS:  getDetCanvasYFromRow AND getDetCanvasXFromCol
 * 
 * Given a detail matrix row, these function return the canvas Y (vertical) OR canvas x 
 * (or horizontal) position. 
 *********************************************************************************************/
NgChm.DET.getDetCanvasYFromRow = function (row) {
	return ((row*(NgChm.DET.dataViewHeight/NgChm.SEL.getCurrentDetDataPerCol())) + NgChm.DET.calculateTotalClassBarHeight("column"));
}

NgChm.DET.getDetCanvasXFromCol = function (col) {
	return ((col*(NgChm.DET.dataViewWidth/NgChm.SEL.getCurrentDetDataPerRow())) + NgChm.DET.calculateTotalClassBarHeight("row"));
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

	//Draw the border
	if (NgChm.heatMap.getMapInformation().map_cut_rows+NgChm.heatMap.getMapInformation().map_cut_cols == 0) {
		var ctx=NgChm.DET.boxCanvas.getContext("2d");
		var boxX = (NgChm.DET.calculateTotalClassBarHeight("row") / NgChm.DET.canvas.width) * NgChm.DET.boxCanvas.width;
		var boxY = (NgChm.DET.calculateTotalClassBarHeight("column") / NgChm.DET.canvas.height) * NgChm.DET.boxCanvas.height;
		var boxW = NgChm.DET.boxCanvas.width-boxX;
		var boxH = NgChm.DET.boxCanvas.height-boxY;
		ctx.lineWidth=1;
		ctx.strokeStyle="#000000";
		ctx.strokeRect(boxX,boxY,boxW,boxH);
	}

	
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
	var topX = ((NgChm.DET.calculateTotalClassBarHeight("row") / NgChm.DET.canvas.width) * NgChm.DET.boxCanvas.width);
	var topY = ((NgChm.DET.calculateTotalClassBarHeight("column") / NgChm.DET.canvas.height) * NgChm.DET.boxCanvas.height);
	
	//height/width of heat map rectangle in pixels
	var mapXWidth = NgChm.DET.boxCanvas.width - topX;
	var mapYHeight = NgChm.DET.boxCanvas.height - topY;
	//height/width of a data cell in pixels
	var cellWidth = mapXWidth/NgChm.SEL.getCurrentDetDataPerRow();
	var cellHeight = mapYHeight/NgChm.SEL.getCurrentDetDataPerCol();
	if (NgChm.SEL.mode === 'FULL_MAP') {
		cellWidth = mapXWidth/NgChm.SEL.dataPerRow;
		cellHeight = mapYHeight/NgChm.SEL.dataPerCol;
	}
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
    if (coords.y > colClassHeightPx) { 
        if  ((type == "map") && coords.x > rowClassWidthPx) {
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
	NgChm.UHM.hlpC();	
	if (NgChm.SEL.mode == 'FULL_MAP') {
		if ((NgChm.SEL.prevMode == 'RIBBONH') || (NgChm.SEL.prevMode == 'RIBBONH_DETAIL')) {
			NgChm.DET.detailHRibbonButton();
		} else if  ((NgChm.SEL.prevMode == 'RIBBONV') || (NgChm.SEL.prevMode == 'RIBBONV_DETAIL')) {
            NgChm.DET.detailVRibbonButton();
		} else {
			NgChm.DET.detailNormal();
		}
	} else if (NgChm.SEL.mode == 'NORMAL') {
		var current = NgChm.DET.zoomBoxSizes.indexOf(NgChm.DET.dataBoxWidth);
		if (current < NgChm.DET.zoomBoxSizes.length - 1) {
			NgChm.DET.setDetailDataSize (NgChm.DET.zoomBoxSizes[current+1]);
			NgChm.SEL.updateSelection(true);
		}
	} else if ((NgChm.SEL.mode == 'RIBBONH') || (NgChm.SEL.mode == 'RIBBONH_DETAIL')) {
		var current = NgChm.DET.zoomBoxSizes.indexOf(NgChm.DET.dataBoxHeight);
		if (current < NgChm.DET.zoomBoxSizes.length - 1) {
			NgChm.DET.setDetailDataHeight (NgChm.DET.zoomBoxSizes[current+1]);
			NgChm.SEL.updateSelection(true);
		}
	} else if ((NgChm.SEL.mode == 'RIBBONV') || (NgChm.SEL.mode == 'RIBBONV_DETAIL')) {
		var current = NgChm.DET.zoomBoxSizes.indexOf(NgChm.DET.dataBoxWidth);
		if (current < NgChm.DET.zoomBoxSizes.length - 1) {
			NgChm.DET.setDetailDataWidth(NgChm.DET.zoomBoxSizes[current+1]);
			NgChm.SEL.updateSelection(true);
		}
	}
}	

NgChm.DET.detailDataZoomOut = function () {
	NgChm.UHM.hlpC();	
	if (NgChm.SEL.mode == 'NORMAL') {
		var current = NgChm.DET.zoomBoxSizes.indexOf(NgChm.DET.dataBoxWidth);
		if ((current > 0) &&
		    (Math.floor((NgChm.DET.dataViewHeight-NgChm.DET.dataViewBorder)/NgChm.DET.zoomBoxSizes[current-1]) <= NgChm.heatMap.getNumRows(NgChm.MMGR.DETAIL_LEVEL)) &&
		    (Math.floor((NgChm.DET.dataViewWidth-NgChm.DET.dataViewBorder)/NgChm.DET.zoomBoxSizes[current-1]) <= NgChm.heatMap.getNumColumns(NgChm.MMGR.DETAIL_LEVEL))){
			NgChm.DET.setDetailDataSize (NgChm.DET.zoomBoxSizes[current-1]);
			NgChm.SEL.updateSelection();
		} else {
			//If we can't zoom out anymore see if ribbon mode would show more of the map or , switch to full map view.
			if ((current > 0) && (NgChm.heatMap.getNumRows(NgChm.MMGR.DETAIL_LEVEL) <= NgChm.heatMap.getNumColumns(NgChm.MMGR.DETAIL_LEVEL)) ) {
				NgChm.DET.detailVRibbonButton();
			} else if ((current > 0) && (NgChm.heatMap.getNumRows(NgChm.MMGR.DETAIL_LEVEL) > NgChm.heatMap.getNumColumns(NgChm.MMGR.DETAIL_LEVEL)) ) {
				NgChm.DET.detailHRibbonButton();
			} else {
				NgChm.DET.detailFullMap();
			}	
		}	
	} else if ((NgChm.SEL.mode == 'RIBBONH') || (NgChm.SEL.mode == 'RIBBONH_DETAIL')) {
		var current = NgChm.DET.zoomBoxSizes.indexOf(NgChm.DET.dataBoxHeight);
		if ((current > 0) &&
		    (Math.floor((NgChm.DET.dataViewHeight-NgChm.DET.dataViewBorder)/NgChm.DET.zoomBoxSizes[current-1]) <= NgChm.heatMap.getNumRows(NgChm.MMGR.DETAIL_LEVEL))) {
			NgChm.DET.setDetailDataHeight (NgChm.DET.zoomBoxSizes[current-1]);
			NgChm.SEL.updateSelection();
		}	else {
            NgChm.DET.detailFullMap();
		}	
	} else if ((NgChm.SEL.mode == 'RIBBONV') || (NgChm.SEL.mode == 'RIBBONV_DETAIL')){
		var current = NgChm.DET.zoomBoxSizes.indexOf(NgChm.DET.dataBoxWidth);
		if ((current > 0) &&
		    (Math.floor((NgChm.DET.dataViewWidth-NgChm.DET.dataViewBorder)/NgChm.DET.zoomBoxSizes[current-1]) <= NgChm.heatMap.getNumColumns(NgChm.MMGR.DETAIL_LEVEL))){
			NgChm.DET.setDetailDataWidth (NgChm.DET.zoomBoxSizes[current-1]);
			NgChm.SEL.updateSelection();
		}	else {
            NgChm.DET.detailFullMap();
		}	
    }
    NgChm.UTIL.redrawCanvases();
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

//Change to horizontal ribbon view.  Note there is a standard full ribbon view and also a sub-selection
//ribbon view if the user clicks on the dendrogram.  If a dendrogram selection is in effect, then
//selectedStart and selectedStop will be set.
NgChm.DET.detailHRibbon = function () {
	NgChm.UHM.hlpC();	
	var previousMode = NgChm.SEL.mode;
	var prevWidth = NgChm.DET.dataBoxWidth;
	NgChm.DET.saveCol = NgChm.SEL.currentCol;
	
		
	NgChm.SEL.setMode('RIBBONH');
	NgChm.DET.setButtons();
	if (previousMode=='FULL_MAP') {
		NgChm.DET.setDetailDataHeight(NgChm.DET.zoomBoxSizes[0]);
	}
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
//		if (selectionSize < 500) {
			NgChm.SEL.mode='RIBBONH_DETAIL'
//		} else {
//			var rvRate = NgChm.heatMap.getColSummaryRatio(NgChm.MMGR.RIBBON_HOR_LEVEL);
//			selectionSize = Math.floor(selectionSize/rvRate);
//		}
		var width = Math.max(1, Math.floor(500/selectionSize));
		NgChm.DET.dataViewWidth = (selectionSize * width) + NgChm.DET.dataViewBorder;
		NgChm.DET.setDetailDataWidth(width);	
		NgChm.SEL.currentCol = NgChm.SEL.selectedStart;
	}
	
	NgChm.DET.dataViewHeight = NgChm.DET.SIZE_NORMAL_MODE;
	if ((previousMode=='RIBBONV') || (previousMode == 'RIBBONV_DETAIL') || (previousMode == 'FULL_MAP')) {
		if (previousMode != 'FULL_MAP') {
			NgChm.DET.setDetailDataHeight(prevWidth);
		} else {
            NgChm.DET.setDetailDataHeight(NgChm.DET.zoomBoxSizes[0]);
        }	
		NgChm.SEL.currentRow=NgChm.DET.saveRow;
	}	

	//On some maps, one view (e.g. ribbon view) can show bigger data areas than will fit for other view modes.  If so, zoom back out to find a workable zoom level.
	while (Math.floor((NgChm.DET.dataViewHeight-NgChm.DET.dataViewBorder)/NgChm.DET.zoomBoxSizes[NgChm.DET.zoomBoxSizes.indexOf(NgChm.DET.dataBoxHeight)]) > NgChm.heatMap.getNumRows(NgChm.MMGR.DETAIL_LEVEL)) {
		NgChm.DET.setDetailDataHeight(NgChm.DET.zoomBoxSizes[NgChm.DET.zoomBoxSizes.indexOf(NgChm.DET.dataBoxHeight)+1]);
	}	
	
	NgChm.DET.canvas.width =  (NgChm.DET.dataViewWidth + NgChm.DET.calculateTotalClassBarHeight("row"));
	NgChm.DET.canvas.height = (NgChm.DET.dataViewHeight + NgChm.DET.calculateTotalClassBarHeight("column"));
	NgChm.DET.detSetupGl();
	NgChm.DET.detInitGl();
	NgChm.SEL.updateSelection();
}

NgChm.DET.detailVRibbonButton = function () {
	NgChm.DDR.clearDendroSelection();
	NgChm.DET.detailVRibbon();
}

NgChm.DET.detailVRibbon = function () {
	NgChm.UHM.hlpC();	
	var previousMode = NgChm.SEL.mode;
	var prevHeight = NgChm.DET.dataBoxHeight;
	NgChm.DET.saveRow = NgChm.SEL.currentRow;
	
	NgChm.SEL.setMode('RIBBONV');
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
			NgChm.SEL.setMode('RIBBONV_DETAIL');
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
	if ((previousMode=='RIBBONH') || (previousMode=='RIBBONH_DETAIL') || (previousMode == 'FULL_MAP')) {
		if (previousMode != 'FULL_MAP') {
			NgChm.DET.setDetailDataWidth(prevHeight);
		} else {
 		    NgChm.DET.setDetailDataWidth(NgChm.DET.zoomBoxSizes[0]);
        }
		NgChm.SEL.currentCol = NgChm.DET.saveCol;
	}
	
	//On some maps, one view (e.g. ribbon view) can show bigger data areas than will fit for other view modes.  If so, zoom back out to find a workable zoom level.
	while (Math.floor((NgChm.DET.dataViewWidth-NgChm.DET.dataViewBorder)/NgChm.DET.zoomBoxSizes[NgChm.DET.zoomBoxSizes.indexOf(NgChm.DET.dataBoxWidth)]) > NgChm.heatMap.getNumColumns(NgChm.MMGR.DETAIL_LEVEL)) {
		NgChm.DET.setDetailDataWidth(NgChm.DET.zoomBoxSizes[NgChm.DET.zoomBoxSizes.indexOf(NgChm.DET.dataBoxWidth)+1]);
	}	
		
	NgChm.DET.canvas.width =  (NgChm.DET.dataViewWidth + NgChm.DET.calculateTotalClassBarHeight("row"));
	NgChm.DET.canvas.height = (NgChm.DET.dataViewHeight + NgChm.DET.calculateTotalClassBarHeight("column"));
	NgChm.DET.detSetupGl();
	NgChm.DET.detInitGl();
	NgChm.SEL.updateSelection();
	document.getElementById("viewport").setAttribute("content", "height=device-height");
    document.getElementById("viewport").setAttribute("content", "");
}

NgChm.DET.detailNormal = function () {
	NgChm.UHM.hlpC();	
	var previousMode = NgChm.SEL.mode;
	NgChm.SEL.setMode('NORMAL');
	NgChm.DET.setButtons();
	NgChm.DET.dataViewHeight = NgChm.DET.SIZE_NORMAL_MODE;
	NgChm.DET.dataViewWidth = NgChm.DET.SIZE_NORMAL_MODE;
	if ((previousMode=='RIBBONV') || (previousMode=='RIBBONV_DETAIL')) {
		NgChm.DET.setDetailDataSize(NgChm.DET.dataBoxWidth);
	} else if ((previousMode=='RIBBONH') || (previousMode=='RIBBONH_DETAIL')) {
		NgChm.DET.setDetailDataSize(NgChm.DET.dataBoxHeight);
	} else if (previousMode=='FULL_MAP') {
		NgChm.DET.setDetailDataSize(NgChm.DET.zoomBoxSizes[0]);
	}	

	//On some maps, one view (e.g. ribbon view) can show bigger data areas than will fit for other view modes.  If so, zoom back out to find a workable zoom level.
	while ((Math.floor((NgChm.DET.dataViewHeight-NgChm.DET.dataViewBorder)/NgChm.DET.zoomBoxSizes[NgChm.DET.zoomBoxSizes.indexOf(NgChm.DET.dataBoxHeight)]) > NgChm.heatMap.getNumRows(NgChm.MMGR.DETAIL_LEVEL)) ||
           (Math.floor((NgChm.DET.dataViewWidth-NgChm.DET.dataViewBorder)/NgChm.DET.zoomBoxSizes[NgChm.DET.zoomBoxSizes.indexOf(NgChm.DET.dataBoxWidth)]) > NgChm.heatMap.getNumColumns(NgChm.MMGR.DETAIL_LEVEL))) {
		NgChm.DET.setDetailDataSize(NgChm.DET.zoomBoxSizes[NgChm.DET.zoomBoxSizes.indexOf(NgChm.DET.dataBoxWidth)+1]);
	}	
	
	if ((previousMode=='RIBBONV') || (previousMode=='RIBBONV_DETAIL')) {
		NgChm.SEL.currentRow = NgChm.DET.saveRow;
	} else if ((previousMode=='RIBBONH') || (previousMode=='RIBBONH_DETAIL')) {
		NgChm.SEL.currentCol = NgChm.DET.saveCol;
	} else if (previousMode=='FULL_MAP') {
		NgChm.SEL.currentRow = NgChm.DET.saveRow;
		NgChm.SEL.currentCol = NgChm.DET.saveCol;		
	}	
	
	NgChm.SEL.checkRow();
	NgChm.SEL.checkColumn();
	NgChm.DET.canvas.width =  (NgChm.DET.dataViewWidth + NgChm.DET.calculateTotalClassBarHeight("row"));
	NgChm.DET.canvas.height = (NgChm.DET.dataViewHeight + NgChm.DET.calculateTotalClassBarHeight("column"));
	 
	NgChm.DET.detSetupGl();
	NgChm.DET.detInitGl();
	NgChm.DDR.clearDendroSelection();
	NgChm.SEL.updateSelection();
	document.getElementById("viewport").setAttribute("content", "height=device-height");
    document.getElementById("viewport").setAttribute("content", "");
}

//Special mode - show the whole map in the detail pane. Processes ribbon h/v differently.
//In these cases, one axis is kept static so that the "full view" stays within the selected
//sub-dendro.
NgChm.DET.detailFullMap = function () {
	NgChm.UHM.hlpC();	
	NgChm.DET.saveRow = NgChm.SEL.currentRow;
	NgChm.DET.saveCol = NgChm.SEL.currentCol;
	
	//For maps that have less rows/columns than the size of the detail panel, matrix elements get height / width more 
	//than 1 pixel, scale calculates the appropriate height/width.
    if (NgChm.DDR.subDendroView === 'column') {
        NgChm.DET.scaleViewHeight();
    } else if (NgChm.DDR.subDendroView === 'row') {
        NgChm.DET.scaleViewWidth();
    } else {
        NgChm.SEL.setMode('FULL_MAP');
        NgChm.DET.scaleViewHeight();
        NgChm.DET.scaleViewWidth();
    }

	//Canvas is adjusted to fit the number of rows/columns and matrix height/width of each element.
	NgChm.DET.canvas.width =  (NgChm.DET.dataViewWidth + NgChm.DET.calculateTotalClassBarHeight("row"));
	NgChm.DET.canvas.height = (NgChm.DET.dataViewHeight + NgChm.DET.calculateTotalClassBarHeight("column"));
	NgChm.DET.detSetupGl();
	NgChm.DET.detInitGl();
	NgChm.SEL.updateSelection();	
}

//For maps that have less rows/columns than the size of the detail panel, matrix elements get  width more 
//than 1 pixel, scale calculates the appropriate height/width.
NgChm.DET.scaleViewWidth = function () {
    scale = Math.max(Math.floor(500/NgChm.heatMap.getNumColumns(NgChm.MMGR.SUMMARY_LEVEL)), 1)
    NgChm.DET.dataViewWidth=(NgChm.heatMap.getNumColumns(NgChm.MMGR.SUMMARY_LEVEL) * scale) + NgChm.DET.dataViewBorder;
    NgChm.DET.setDetailDataWidth(scale);
}

//For maps that have less rows/columns than the size of the detail panel, matrix elements get height more 
//than 1 pixel, scale calculates the appropriate height/width.
NgChm.DET.scaleViewHeight = function () {
    scale = Math.max(Math.floor(500/NgChm.heatMap.getNumRows(NgChm.MMGR.SUMMARY_LEVEL)), 1)
    NgChm.DET.dataViewHeight= (NgChm.heatMap.getNumRows(NgChm.MMGR.SUMMARY_LEVEL) * scale) + NgChm.DET.dataViewBorder;
    NgChm.DET.setDetailDataHeight(scale);
    
}

NgChm.DET.getNearestBoxSize = function (sizeToGet) {
	var boxSize = 0;
	//Loop zoomBoxSizes to pick the one that will be large enough
	//to encompass user-selected area
	for (var i=NgChm.DET.zoomBoxSizes.length-1; i>=0;i--) {
		boxSize = NgChm.DET.zoomBoxSizes[i];
		boxCalcVal = (NgChm.DET.dataViewWidth-NgChm.DET.dataViewBorder)/boxSize;
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

NgChm.DET.getNearestBoxHeight = function (sizeToGet) {
	var boxSize = 0;
	//Loop zoomBoxSizes to pick the one that will be large enough
	//to encompass user-selected area
	for (var i=NgChm.DET.zoomBoxSizes.length-1; i>=0;i--) {
		boxSize = NgChm.DET.zoomBoxSizes[i];
		const boxCalcVal = (NgChm.DET.dataViewHeight-NgChm.DET.dataViewBorder)/boxSize;
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


NgChm.DET.setButtons = function () {
	var full = document.getElementById('full_btn');
	var ribbonH = document.getElementById('ribbonH_btn');
	var ribbonV = document.getElementById('ribbonV_btn');
	full.src= "images/full.png";
	ribbonH.src= "images/ribbonH.png";
	ribbonV.src= "images/ribbonV.png";
	if (NgChm.SEL.mode=='RIBBONV')
		ribbonV.src= "images/ribbonV_selected.png";
	else if (NgChm.SEL.mode == "RIBBONH")
		ribbonH.src= "images/ribbonH_selected.png";
	else
		full.src= "images/full_selected.png";	
}

NgChm.DET.setDetCanvasBoxSize = function () {
	NgChm.DET.boxCanvas.width =  NgChm.DET.canvas.clientWidth;
	NgChm.DET.boxCanvas.height = NgChm.DET.canvas.clientHeight;
	NgChm.DET.boxCanvas.style.left=NgChm.DET.canvas.style.left;
	NgChm.DET.boxCanvas.style.top=NgChm.DET.canvas.style.top;
}

// Callback that is notified every time there is an update to the heat map 
// initialize, new data, etc.  This callback draws the summary heat map.
NgChm.DET.processDetailMapUpdate = function (event, tile) {

	if (event == NgChm.MMGR.Event_INITIALIZED) {
		NgChm.DET.detailInit();
		NgChm.heatMap.configureButtonBar();
		//If URL search parameter has been specified, execute search upon initialization of the detail panel
		var searchParam = NgChm.UTIL.getURLParameter('search')
		if (searchParam !== "") {
			var searchElement = document.getElementById('search_text');
			searchElement.value = searchParam;
			NgChm.DET.detailSearch();
		}
	} else {
		NgChm.DET.flushDrawingCache(tile);
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
	if (!NgChm.DET.colDendro){
		NgChm.DET.colDendro = new NgChm.DDR.DetailColumnDendrogram();
	}
	if (!NgChm.DET.rowDendro){
		NgChm.DET.rowDendro = new NgChm.DDR.DetailRowDendrogram();
	}
	NgChm.DET.setDendroShow();
	document.getElementById('detail_buttons').style.display = '';
	document.getElementById('aboutMenu_btn').style.display = 'none';
	document.getElementById('loader').style.display = 'none';
	if (NgChm.DET.canvas) {
		NgChm.DET.canvas.width =  (NgChm.DET.dataViewWidth + NgChm.DET.calculateTotalClassBarHeight("row"));
		NgChm.DET.canvas.height = (NgChm.DET.dataViewHeight + NgChm.DET.calculateTotalClassBarHeight("column"));
	}
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

	setTimeout (function() {
		NgChm.DET.detSetupGl();
		NgChm.DET.detInitGl();
		NgChm.SEL.updateSelection();
		if (NgChm.UTIL.getURLParameter("selected") !== ""){
			var selected = NgChm.UTIL.getURLParameter("selected").replace(","," ");
			document.getElementById("search_text").value = selected;
			NgChm.DET.detailSearch();
			NgChm.SUM.drawRowSelectionMarks();
			NgChm.SUM.drawColSelectionMarks();
			NgChm.SUM.drawTopItems();
		}
		NgChm.DET.initialized = true;
	}, 1);
}

//We keep a copy of the last rendered detail heat map for each layer.
//This enables quickly redrawing the heatmap when flicking between layers, which
//needs to be nearly instant to be effective.
//The copy will be invalidated and require drawing if any parameter affecting
//drawing of that heat map is changed or if a new tile that could affect it
//is received.
NgChm.DET.detailHeatMapCache = {};      // Last rendered detail heat map for each layer
NgChm.DET.detailHeatMapLevel = {};      // Level of last rendered heat map for each layer
NgChm.DET.detailHeatMapValidator = {};  // Encoded drawing parameters used to check heat map is current

//This function is called when any new data tile is received.
//It causes any cached heat map affected by the new tile to be
//redrawn the next time it is displayed.  The currently
//displayed heat map will be redrawn after a short delay
//if it might be affected by the tile.
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
		if (tile.layer === NgChm.SEL.currentDl) {
			// Redraw 'now' if the tile is for the currently displayed layer.
			NgChm.DET.setDrawDetailTimeout(NgChm.DET.redrawUpdateTimeout);
		}
	}
};

//This function will redraw the detail heatmap after ms milliseconds.
//
//noResize is used to skip the resize routine and help speed up the drawing routine for some cases
//If noResize is true for every call to setDrawDetailTimeout, the resize routine
//will be skipped on the next redraw.
NgChm.DET.resizeOnNextDraw = false;
NgChm.DET.setDrawDetailTimeout = function (ms, noResize) {
	if (NgChm.DET.drawEventTimer) {
		clearTimeout (NgChm.DET.drawEventTimer);
	}
	const drawWin = NgChm.DET.getDetailWindow();

	if (noResize) {
		NgChm.DET.resizeOnNextDraw = true;
		NgChm.DET.drawDetailHeatMap(drawWin);
	} else {
		NgChm.DET.resizeOnNextDraw = true;
		NgChm.DET.drawEventTimer = setTimeout(function drawDetailTimeout () {
			if (NgChm.DET.chmElement) {
				NgChm.DET.drawDetailHeatMap(drawWin);
			}
		}, ms);
	}
};


//Get the layer, level, and selected region of the current detail
//heat map display.
NgChm.DET.getDetailWindow = function() {
	return {
		layer: NgChm.SEL.currentDl,
		level: NgChm.SEL.getLevelFromMode(NgChm.MMGR.DETAIL_LEVEL),
		firstRow: NgChm.SEL.getCurrentDetRow(),
		firstCol: NgChm.SEL.getCurrentDetCol(),
		numRows: NgChm.SEL.getCurrentDetDataPerCol(),
		numCols: NgChm.SEL.getCurrentDetDataPerRow()
	};
};


//Draw the region of the NGCHM specified by drawWin to the detail heat map
//pane.
NgChm.DET.drawDetailHeatMap = function (drawWin) {
	NgChm.DET.setDendroShow();
	if (NgChm.DET.resizeOnNextDraw) {
		NgChm.DET.detailResize();
		NgChm.DET.resizeOnNextDraw = false;
	}
	NgChm.DET.setDetCanvasBoxSize();

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
		mapWidth: NgChm.DET.dataViewWidth,
		mapHeight: NgChm.DET.dataViewHeight,
		dataBoxWidth: NgChm.DET.dataBoxWidth,
		dataBoxHeight: NgChm.DET.dataBoxHeight,
		rowBarWidths: NgChm.heatMap.getCovariateBarHeights("row"),
		colBarHeights: NgChm.heatMap.getCovariateBarHeights("column"),

		searchRows: NgChm.DET.getSearchRows(),
		searchCols: NgChm.DET.getSearchCols(),
		searchGridColor: [0,0,0]
	};

	// Set parameters that depend on the data layer properties.
	{
		const dataLayers = NgChm.heatMap.getDataLayers();
		const dataLayer = dataLayers[drawWin.layer];
		const showGrid = dataLayer.grid_show === 'Y';
		const detWidth = +NgChm.DET.boxCanvas.style.width.replace("px","");
		const detHeight = +NgChm.DET.boxCanvas.style.height.replace("px","");
		params.showVerticalGrid = showGrid && params.dataBoxWidth > NgChm.DET.minLabelSize && NgChm.DET.minPixelsForGrid*drawWin.numCols <= detWidth;
		params.showHorizontalGrid = showGrid && params.dataBoxHeight > NgChm.DET.minLabelSize && NgChm.DET.minPixelsForGrid*drawWin.numRows <= detHeight;
		params.grid_color = dataLayer.grid_color;
		params.selection_color = dataLayer.selection_color;
		params.cuts_color = dataLayer.cuts_color;
	}

	const renderBuffer = NgChm.DET.getDetailHeatMap (drawWin, params);

	//WebGL code to draw the summary heat map.
	NgChm.DET.gl.activeTexture(NgChm.DET.gl.TEXTURE0);
	NgChm.DET.gl.texImage2D(
			NgChm.DET.gl.TEXTURE_2D,
			0,
			NgChm.DET.gl.RGBA,
			renderBuffer.width,
			renderBuffer.height,
			0,
			NgChm.DET.gl.RGBA,
			NgChm.DET.gl.UNSIGNED_BYTE,
			renderBuffer.pixels);
	NgChm.DET.gl.uniform2fv(NgChm.DET.uScale, NgChm.DET.canvasScaleArray);
	NgChm.DET.gl.uniform2fv(NgChm.DET.uTranslate, NgChm.DET.canvasTranslateArray);
	NgChm.DET.gl.drawArrays(NgChm.DET.gl.TRIANGLE_STRIP, 0, NgChm.DET.gl.buffer.numItems);

	// Draw the dendrograms
	NgChm.DET.colDendro.draw();
	NgChm.DET.rowDendro.draw();

	//Draw any selection boxes defined by SearchRows/SearchCols
	NgChm.DET.drawSelections();
};


//Returns a renderBuffer containing an image of the region of the NGCHM
//specified by drawWin rendered using the parameters in params.
NgChm.DET.getDetailHeatMap = function (drawWin, params) {
	//console.log("NgChm.DET.getDetailHeatMap");

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

	var dataGridColor = colorMap.getHexToRgba(params.grid_color);
	var dataSelectionColorRGB = colorMap.getHexToRgba(params.selection_color);
	var dataSelectionColor = [dataSelectionColorRGB.r/255, dataSelectionColorRGB.g/255, dataSelectionColorRGB.b/255, 1];
	var regularGridColor = [dataGridColor.r, dataGridColor.g, dataGridColor.b];
	var cutsColor = colorMap.getHexToRgba(params.cuts_color);


	//Build a horizontal grid line for use between data lines. Tricky because some dots will be selected color if a column is in search results.
	const linelen = texWidth * NgChm.SUM.BYTE_PER_RGBA;
	const gridLine = new Uint8Array(new ArrayBuffer(linelen));
	//Build a horizontal cuts line using the cut color defined for the data layer.
	const cutsLine = new Uint8Array(new ArrayBuffer(linelen));
	if ((cutsColor !== null) && (cutsColor !== undefined)) {
		for (var i=0;i<linelen;i++) {
			cutsLine[i] = cutsColor.r;i++;
			cutsLine[i] = cutsColor.g;i++;
			cutsLine[i] = cutsColor.b;i++;
			cutsLine[i] = cutsColor.a;
		}
	}
	if (params.showHorizontalGrid) {
		var linePos = (rowClassBarWidth)*NgChm.SUM.BYTE_PER_RGBA;
		linePos+=NgChm.SUM.BYTE_PER_RGBA;
		for (var j = 0; j < detDataPerRow; j++) {
			//When building grid line check for vertical cuts by grabbing value of currentRow (any row really) and column being iterated to
			var val = NgChm.heatMap.getValue(drawWin.level, currDetRow, currDetCol+j);
			var nextVal = NgChm.heatMap.getValue(drawWin.level, currDetRow, currDetCol+j+1);
			var gridColor = ((params.searchCols.indexOf(NgChm.SEL.currentCol+j) > -1) || (params.searchCols.indexOf(NgChm.SEL.currentCol+j+1) > -1)) ? params.searchGridColor : regularGridColor;
			for (var k = 0; k < NgChm.DET.dataBoxWidth; k++) {
				//If current column contains a cut value, write an empty white position to the gridline, ELSE write out appropriate grid color
				if (val <= NgChm.SUM.minValues) {
					if ((k === NgChm.DET.dataBoxWidth - 1) && (nextVal > NgChm.SUM.minValues)) {
						gridLine[linePos] = gridColor[0]; gridLine[linePos+1] = gridColor[1]; gridLine[linePos+2] = gridColor[2];	gridLine[linePos+3] = 255;
					} else {
						gridLine[linePos] = cutsColor.r; gridLine[linePos+1] = cutsColor.g; gridLine[linePos+2] = cutsColor.b;	gridLine[linePos+3] = cutsColor.a;
					}
				} else {
					if (k==NgChm.DET.dataBoxWidth-1){ // should the grid line be drawn?
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
	
	var line = new Uint8Array(new ArrayBuffer((rowClassBarWidth + NgChm.DET.dataViewWidth) * NgChm.SUM.BYTE_PER_RGBA));

	//Needs to go backward because WebGL draws bottom up.
	for (var i = detDataPerCol-1; i >= 0; i--) {
		var linePos = (rowClassBarWidth)*NgChm.SUM.BYTE_PER_RGBA;
		//If all values in a line are "cut values" AND (because we want gridline at bottom of a row with data values) all values in the 
		// preceding line are "cut values" mark the current line as as a horizontal cut
		var isHorizCut = NgChm.DET.isLineACut(i) && NgChm.DET.isLineACut(i-1);
		linePos+=NgChm.SUM.BYTE_PER_RGBA;
		for (var j = 0; j < detDataPerRow; j++) { // for every data point...
			var val = NgChm.heatMap.getValue(drawWin.level, currDetRow+i, currDetCol+j);
         var nextVal = NgChm.heatMap.getValue(drawWin.level, currDetRow+i, currDetCol+j+1);
         if (val !== undefined) {
	            var color = colorMap.getColor(val);
	            
				//For each data point, write it several times to get correct data point width.
				for (var k = 0; k < NgChm.DET.dataBoxWidth; k++) {
					if (params.showVerticalGrid && k===NgChm.DET.dataBoxWidth-1 && j < detDataPerRow-1 ){ // should the grid line be drawn?
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
		emitLines (line, NgChm.DET.dataBoxHeight - numGridLines)
		emitLines (isHorizCut ? cutsLine : gridLine, numGridLines);
	}

	//Draw covariate bars.
	NgChm.DET.detailDrawColClassBars(renderBuffer.pixels);
	NgChm.DET.detailDrawRowClassBars(renderBuffer.pixels);

	return renderBuffer;
}
NgChm.DET.isLineACut = function (row) {
	var lineIsCut = true;
	var level = NgChm.SEL.getLevelFromMode(NgChm.MMGR.DETAIL_LEVEL);
	var currDetRow = NgChm.SEL.getCurrentDetRow();
	var currDetCol = NgChm.SEL.getCurrentDetCol();
	var detDataPerRow = NgChm.SEL.getCurrentDetDataPerRow();
	for (var x = 0; x < detDataPerRow; x++) { // for every data point...
		var val = NgChm.heatMap.getValue(level, currDetRow+row, currDetCol+x);
		//If any values on the row contain a value other than the cut value, mark lineIsCut as false
		if (val > NgChm.SUM.minValues) {
			return false;
		}
	}
	return true;
}

NgChm.DET.rowDendroResize = function() {
	if (NgChm.DET.rowDendro.dendroCanvas !== null) {
		const dendroCanvas = NgChm.DET.rowDendro.dendroCanvas;
		const top = NgChm.DET.colDendro.getDivHeight() + NgChm.SUM.paddingHeight;
		dendroCanvas.style.top = (top + NgChm.DET.canvas.clientHeight * (1-NgChm.DET.dataViewHeight/NgChm.DET.canvas.height)) + 'px';
		if (NgChm.DET.rowDendro.isVisible()){
			const width = NgChm.DET.rowDendro.getConfigSize() * NgChm.DET.chmElement.clientWidth + NgChm.SUM.paddingHeight;
			const height = NgChm.DET.canvas.clientHeight * (NgChm.DET.dataViewHeight/NgChm.DET.canvas.height);
			dendroCanvas.style.width = width + 'px';
			dendroCanvas.style.height = (height-2) + 'px';
			dendroCanvas.width = Math.round(width);
			dendroCanvas.height = Math.round(height);
		} else {
			dendroCanvas.style.width = '0px';
		}
	}
}

NgChm.DET.colDendroResize = function() {
	if (NgChm.DET.colDendro.dendroCanvas !== null) {
		const dendroCanvas = NgChm.DET.colDendro.dendroCanvas;
		const left = NgChm.DET.canvas.offsetLeft;
		dendroCanvas.style.left = (left + NgChm.DET.canvas.clientWidth * (1-NgChm.DET.dataViewWidth/NgChm.DET.canvas.width)) + 'px';
		if (NgChm.DET.colDendro.isVisible()){
			const height = NgChm.DET.colDendro.getConfigSize() * NgChm.DET.chmElement.clientHeight + NgChm.SUM.paddingHeight;
			dendroCanvas.style.height = height + 'px';
			dendroCanvas.style.width = (NgChm.DET.canvas.clientWidth * (NgChm.DET.dataViewWidth/NgChm.DET.canvas.width)) + 'px';
			dendroCanvas.height = Math.round(height);
			dendroCanvas.width = Math.round(NgChm.DET.canvas.clientWidth * (NgChm.DET.dataViewWidth/NgChm.DET.canvas.width));
		} else {
			dendroCanvas.style.height = '0px';
		}
	}
}

NgChm.DET.detailResize = function () {
	 if (NgChm.DET.canvas !== undefined) {
		 NgChm.DET.rowDendroResize();
		 NgChm.DET.colDendroResize();
		 NgChm.DET.sizeCanvasForLabels();
		 //Done twice because changing canvas size affects fonts selected for drawing labels
		 NgChm.DET.sizeCanvasForLabels();
		 NgChm.DET.updateDisplayedLabels();
		 NgChm.DET.drawSelections();
		 NgChm.DET.rowDendroResize();
		 NgChm.DET.colDendroResize();
		 NgChm.DET.rowDendro.draw();
		 NgChm.DET.colDendro.draw();
	 }
};

//This function calculates and adjusts the size of the detail canvas and box canvas
//in order to best accommodate the maximum label sizes for each axis.
NgChm.DET.sizeCanvasForLabels = function() {
	NgChm.DET.calcRowAndColLabels();
	NgChm.DET.calcClassRowAndColLabels();

	const detPane = NgChm.Pane.findPaneLocation (NgChm.DET.chmElement);
	//Get full available width/height for detail NGCHM
	var dFullW = detPane.pane.clientWidth;
	var dFullH = detPane.pane.clientHeight - detPane.paneHeader.offsetHeight;
	var left = 0;
	if ((NgChm.DET.rowDendro !== null) && (NgChm.DET.rowDendro !== undefined)) {
		left = NgChm.DET.rowDendro.getDivWidth();
	}
	var top = 0;
	if ((NgChm.DET.colDendro !== null) && (NgChm.DET.colDendro !== undefined)) {
		top = NgChm.DET.colDendro.getDivHeight();
	}
	//Set sizes of canvas and boxCanvas based upon width, label, and an offset for whitespace
	const heatmapVP = {
		top, left,
		width: dFullW - (NgChm.DET.rowLabelLen + 10) - left,
		height: dFullH - (NgChm.DET.colLabelLen + 10) - top
	};
	NgChm.UTIL.setElementPositionSize (NgChm.DET.canvas, heatmapVP, true);
	NgChm.UTIL.setElementPositionSize (NgChm.DET.boxCanvas, heatmapVP, true);

	// Set sizes for the label divs
	const rowLabelVP = {
		top: NgChm.DET.chmElement.offsetTop,
		left: NgChm.DET.canvas.offsetLeft + NgChm.DET.canvas.clientWidth,
		width: dFullW - NgChm.DET.canvas.offsetLeft - NgChm.DET.canvas.offsetWidth,
		height: dFullH - (NgChm.DET.colLabelLen + 15)
	};
	NgChm.UTIL.setElementPositionSize (NgChm.DET.rowLabelDiv, rowLabelVP, true);

	const heightCalc = dFullH - NgChm.DET.canvas.offsetTop - NgChm.DET.canvas.offsetHeight;
	const colLabelVP = {
		top: NgChm.DET.canvas.offsetTop + NgChm.DET.canvas.offsetHeight,
		left: 0,
		width: dFullW - (NgChm.DET.rowLabelLen + 10),
		height:  heightCalc === 0 ? 11 : heightCalc
	};
	NgChm.UTIL.setElementPositionSize (NgChm.DET.colLabelDiv, colLabelVP, true);
};

//This function resets the maximum
//label size variables for each axis in preparation for a screen redraw.
NgChm.DET.resetLabelLengths = function () {
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
	if (skip > NgChm.DET.minLabelSize) {
		const shownLabels = NgChm.UTIL.getShownLabels('ROW');
		for (let i = NgChm.SEL.currentRow; i < NgChm.SEL.currentRow + NgChm.SEL.dataPerCol; i++) {
			NgChm.DET.addTmpLabelForSizeCalc(shownLabels[i-1], fontSize);
		}
		NgChm.DET.calcLabelDiv('ROW');
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
	if (skip > NgChm.DET.minLabelSize) {
		const shownLabels = NgChm.UTIL.getShownLabels('COLUMN');
		for (let i = NgChm.SEL.currentCol; i < NgChm.SEL.currentCol + NgChm.SEL.dataPerRow; i++) {
			NgChm.DET.addTmpLabelForSizeCalc(shownLabels[i-1], fontSize);
		}
		NgChm.DET.calcLabelDiv('COL');
	}
}

/* Memoize label sizes to avoid repeatedly calculating
 * label widths.
 */
const labelSizeCache = {};
/* Create a pool of divs just for calculating label widths.
 */
const labelSizeWidthCalcPool = [];

/* Get a labelSizeWidthCalc div from the pool if possible.
 * Otherwise create and return a new pool element.
 */
function getPoolElement () {
	if (labelSizeWidthCalcPool.length > 0) {
		return labelSizeWidthCalcPool.pop();
	} else {
		const div = document.createElement('div');
		div.className = 'DynamicLabel';
		div.style.position = "absolute";
		div.style.fontFamily = 'sans-serif';
		div.style.fontWeight = 'bold';
		return div;
	}
}

/* Temporary label elements that have been added to the document for width calculation.
 * Each entry consists of:
 *  - key: a key for labelSizeCache, and
 *  - el:  null if labelSizeCache already contains key, or a pool element for
 *         calculating the width for key.
 */
const tmpLabelSizeElements = [];

// This function adds an entry to tmpLabelSizeElements for the specified text
// and fontSize.  If the combination of text and fontSize has not been seen
// before, a pool label element for performing the width calculation is also
// created.
NgChm.DET.addTmpLabelForSizeCalc = function (text, fontSize) {
        const key = text + fontSize.toString();
        if (labelSizeCache.hasOwnProperty(key)) {
		tmpLabelSizeElements.push({ key, el: null });
	} else {
                // Haven't seen this combination of font and fontSize before.
                // Set the contents of our label size div and calculate its width.
		const el = getPoolElement();
		el.style.fontSize = fontSize.toString() +'pt';
		el.innerText = text;
		NgChm.DET.labelElement.appendChild(el);
		tmpLabelSizeElements.push({ key, el });
        }
};

// This function assesses the size of the entries that have been
// added to tmpLabelSizeElements and increases the row/col label
// length if the longest label is longer than those already processed.
// rowLabelLen and colLabelLen are used to size the detail screen
// to accomodate labels on both axes.
NgChm.DET.calcLabelDiv = function (axis) {
	let maxLen = axis === 'ROW' ? NgChm.DET.rowLabelLen : NgChm.DET.colLabelLen;
	let w;

	for (let ii = 0; ii < tmpLabelSizeElements.length; ii++) {
		const { key, el } = tmpLabelSizeElements[ii];
		if (el === null) {
			w = labelSizeCache[key];
		} else {
			labelSizeCache[key] = w = el.clientWidth;
		}
		if (w > 1000) {
			console.log('Ridiculous label length ' + w + ' ' + key);
		}
		if (w > maxLen) {
			maxLen = w;
		}
	}
	if (axis === 'ROW') {
		if (maxLen > NgChm.DET.rowLabelLen) NgChm.DET.rowLabelLen = maxLen;
	} else {
		if (maxLen > NgChm.DET.colLabelLen) NgChm.DET.colLabelLen = maxLen;
	}
	// Remove and return tmp label divs to the pool.
	while (tmpLabelSizeElements.length > 0) {
		const { key, el } = tmpLabelSizeElements.pop();
		if (el) {
			NgChm.DET.labelElement.removeChild(el);
			labelSizeWidthCalcPool.push (el);
		}
	}
};

// All new labels are added to NgChm.DET.labelElements.  It enables
// existing label elements to be reused when updating the labels.
// Entries are of the form:
// label: { div, parent }
// where div is the div element created for the label
// and parent is the enclosing div to which it's added.
NgChm.DET.labelElements = {};

// Remove a label element.
NgChm.DET.removeLabel = function (label) {
	if (NgChm.DET.oldLabelElements.hasOwnProperty (label)) {
		const e = NgChm.DET.oldLabelElements[label];
		e.parent.removeChild(e.div);
		delete NgChm.DET.oldLabelElements[label];
	}
};

// Update displayed labels, reusing existing label elements where possible.
//
// The existing labels are first moved to oldLabelElements.
// Adding a label will first check to see if the label element already exists
// in oldLabelElements and if so update it and move it to labelElements.
// After all elements have been added/updated, any remaining dynamic labels
// in oldElements will be removed.
NgChm.DET.oldLabelElements = {};
NgChm.DET.updateDisplayedLabels = function () {
	const debug = false;

	const prevNumLabels = Object.keys(NgChm.DET.labelElements).length;
	NgChm.DET.oldLabelElements = NgChm.DET.labelElements;
	NgChm.DET.labelElements = {};

	// Temporarily hide labelElement while we update labels.
	const oldDisplayStyle = NgChm.DET.labelElement.style.display;
	NgChm.DET.labelElement.style.setProperty('display', 'none');

	// Update existing labels / draw new labels.
	NgChm.DET.resetLabelLengths();
	NgChm.DET.detailDrawRowClassBarLabels();
	NgChm.DET.detailDrawColClassBarLabels();
	NgChm.DET.drawRowAndColLabels();

	// Remove old dynamic labels that did not get updated.
	for (let oldEl in NgChm.DET.oldLabelElements) {
		const e = NgChm.DET.oldLabelElements[oldEl];
		if (e.div.classList.contains('DynamicLabel')) {
			try {
				e.parent.removeChild(e.div);
			} catch (err) {
				console.log({ m: 'Unable to remove old label element ', oldEl, e });
				console.error(err);
			}
		} else {
			// Move non-dynamic labels (e.g. missingCovariateBar indicators) to current labels.
			NgChm.DET.labelElements[oldEl] = e;
			delete NgChm.DET.oldLabelElements[oldEl];
		}
	}
	if (debug) {
		const currNumLabels = Object.keys(NgChm.DET.labelElements).length;
		const numOldLabels = Object.keys(NgChm.DET.oldLabelElements).length;
		console.log({ m: 'DET.updateDisplayedLabels', prevNumLabels, currNumLabels, numOldLabels });
	}
	NgChm.DET.oldLabelElements = {};

	// Restore visibilty of labelElement
	NgChm.DET.labelElement.style.setProperty('display', oldDisplayStyle);
};

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
	var colHeight = NgChm.DET.calculateTotalClassBarHeight("column");
	if (colHeight > 0) {
		headerSize = NgChm.DET.canvas.clientHeight * (colHeight / (NgChm.DET.dataViewHeight + colHeight));
	}
	var skip = (NgChm.DET.canvas.clientHeight - headerSize) / NgChm.SEL.dataPerCol;
	var start = Math.max((skip - fontSize)/2, 0) + headerSize-2;
	
	if (skip > NgChm.DET.minLabelSize) {
		const actualLabels = NgChm.UTIL.getActualLabels('ROW');
		const shownLabels = NgChm.UTIL.getShownLabels('ROW');
		var xPos = NgChm.DET.canvas.offsetLeft + NgChm.DET.canvas.clientWidth + 3;
		for (var i = NgChm.SEL.currentRow; i < NgChm.SEL.currentRow + NgChm.SEL.dataPerCol; i++) {
			var yPos = NgChm.DET.canvas.offsetTop + start + ((i-NgChm.SEL.currentRow) * skip);
			if (actualLabels[i-1] !== undefined){ // an occasional problem in subdendro view
				NgChm.DET.addLabelDiv(NgChm.DET.labelElement, 'detail_row' + i, 'DynamicLabel', shownLabels[i-1], actualLabels[i-1], xPos, yPos, fontSize, 'F',i,"Row");
			}
		}
	}
}

NgChm.DET.drawColLabels = function (fontSize) {
	var headerSize = 0;
	var rowHeight = NgChm.DET.calculateTotalClassBarHeight("row");
	if (rowHeight > 0) {
		headerSize = NgChm.DET.canvas.clientWidth * (rowHeight / (NgChm.DET.dataViewWidth + rowHeight));
	}
	var skip = (NgChm.DET.canvas.clientWidth - headerSize) / NgChm.SEL.dataPerRow;
	var start = headerSize + fontSize + Math.max((skip - fontSize)/2, 0) + 3;

	if (skip > NgChm.DET.minLabelSize) {
		const actualLabels = NgChm.UTIL.getActualLabels('COLUMN');
		const shownLabels = NgChm.UTIL.getShownLabels('COLUMN');
		var yPos = NgChm.DET.canvas.offsetTop + NgChm.DET.canvas.clientHeight + 3;
		for (var i = NgChm.SEL.currentCol; i < NgChm.SEL.currentCol + NgChm.SEL.dataPerRow; i++) {
			var xPos = NgChm.DET.canvas.offsetLeft + start + ((i-NgChm.SEL.currentCol) * skip);
			if (actualLabels[i-1] !== undefined){ // an occasional problem in subdendro view
				NgChm.DET.addLabelDiv(NgChm.DET.labelElement, 'detail_col' + i, 'DynamicLabel', shownLabels[i-1], actualLabels[i-1], xPos, yPos, fontSize, 'T',i,"Column");
				if (shownLabels[i-1].length > NgChm.DET.colLabelLen) {
					NgChm.DET.colLabelLen = shownLabels[i-1].length;
				}
			}
		}
	}
}

NgChm.DET.updateLabelDiv = function (parent, id, className, text ,longText, left, top, fontSize, rotate, index,axis,xy) {
	if (NgChm.DET.oldLabelElements[id].parent !== parent) {
		console.error (new Error ('updateLabelDiv: parent elements do not match'));
		console.log ({ id, parent, oldElement: NgChm.DET.oldLabelElements[id] });
	}
	// Get existing label element and move from old to current collection.
	const div = NgChm.DET.oldLabelElements[id].div;
	if (div.parentElement !== parent) {
		console.log ({ m: 'mismatch during update', parentElement: div.parentElement, parent });
	}
	NgChm.DET.labelElements[id] = { div, parent };
	delete NgChm.DET.oldLabelElements[id];

	const colorMap = NgChm.heatMap.getColorMapManager().getColorMap("data",NgChm.SEL.currentDl);
	const dataLayer = NgChm.heatMap.getDataLayers()[NgChm.SEL.currentDl];
	const selectionRgba = colorMap.getHexToRgba(dataLayer.selection_color);
	const selColor = colorMap.getHexToRgba(dataLayer.selection_color);
	const divFontColor = colorMap.isColorDark(selColor) ? "#000000" : "#FFFFFF";

	// Assumes the properties defined by the commented out code below don't change:
	// div.id = id;
	// div.className = className;
	// div.dataset.index = index;
	// if (div.classList.contains('ClassBar')){
		// div.dataset.axis = 'ColumnCovar';
	// } else {
		// div.dataset.axis = 'Row';
	// }
	if (NgChm.DET.labelIndexInSearch(index,axis)) {
		div.style.backgroundColor = dataLayer.selection_color;
		div.style.color = divFontColor;
	} else {
		div.style.removeProperty('background-color');
		div.style.removeProperty('color');
	}
	//if (text == "<") {
	//	div.style.color = divFontColor;
	//	div.style.backgroundColor = "rgba("+selectionRgba.r+","+selectionRgba.g+","+selectionRgba.b+",0.2)";
	//}
	//if (rotate == 'T') {
	//	div.style.transformOrigin = 'left top';
	//	div.style.transform = 'rotate(90deg)';
	//	div.style.webkitTransformOrigin = "left top";
	//	div.style.webkitTransform = "rotate(90deg)";
	//	if (div.classList.contains('ClassBar')){
	//		div.dataset.axis = 'RowCovar';
	//	} else {
	//		div.dataset.axis = 'Column';
	//	}
	//}
	
	//div.style.position = "absolute";
	div.style.left = left + 'px';
	div.style.top = top + 'px';
	div.style.fontSize = fontSize.toString() +'pt';
	//div.style.fontFamily = 'sans-serif';
	//div.style.fontWeight = 'bold';
	div.innerText = text;
}

NgChm.DET.addLabelDiv = function (parent, id, className, text ,longText, left, top, fontSize, rotate, index,axis,xy) {
	if (NgChm.DET.oldLabelElements.hasOwnProperty(id)) {
	    NgChm.DET.updateLabelDiv (parent, id, className, text ,longText, left, top, fontSize, rotate, index,axis,xy);
	    return;
	}
	div = document.getElementById (id);
	if (div) {
	    if (parent !== div.parentElement) {
		console.log ({ m: 'parent mismatch', parent, div });
	    }
	    NgChm.DET.oldLabelElements[id] = { div, parent: div.parentElement };
	    NgChm.DET.updateLabelDiv (parent, id, className, text ,longText, left, top, fontSize, rotate, index,axis,xy);
	    return;
	}
	var colorMap = NgChm.heatMap.getColorMapManager().getColorMap("data",NgChm.SEL.currentDl);
	var dataLayer = NgChm.heatMap.getDataLayers()[NgChm.SEL.currentDl];
	var selectionRgba = colorMap.getHexToRgba(dataLayer.selection_color);
	var div = document.createElement('div');
	NgChm.DET.labelElements[id] = { div, parent };
	var divFontColor = "#FFFFFF";
	var selColor = colorMap.getHexToRgba(dataLayer.selection_color);
	if (colorMap.isColorDark(selColor)) {
		divFontColor = "#000000";
	}
	div.id = id;
	div.className = className;
	div.dataset.index = index;
	if (div.classList.contains('ClassBar')){
		div.dataset.axis = 'ColumnCovar';
	} else {
		div.dataset.axis = 'Row';
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
		div.addEventListener('click',NgChm.DET.labelClick ,false);
		div.addEventListener('contextmenu',NgChm.DET.labelRightClick,false);
		div.onmouseover = function(){NgChm.UHM.hlp(this,longText,longText.length*9,0);}
		div.onmouseleave = NgChm.UHM.hlpC;
		div.addEventListener("touchstart", function(e){
			NgChm.UHM.hlpC();
			var now = new Date().getTime();
			var timesince = now - NgChm.DET.latestTap;
			NgChm.DET.labelLastClicked[this.dataset.axis] = this.dataset.index;
			NgChm.DET.latestLabelTap = now;
		});
		div.addEventListener("touchend", function(e){
			if (e.touches.length == 0 && NgChm.DET.latestLabelTap){
				var now = new Date().getTime();
				var timesince = now - NgChm.DET.latestLabelTap;
				if (timesince > 500){
					NgChm.DET.labelRightClick(e);
				}
			}
		});
		div.addEventListener("touchmove", NgChm.DET.labelDrag);
	}
	if (text == "..."){
		div.addEventListener('mouseover', (function() {
		    return function(e) {NgChm.UHM.hlp(this,"Some covariate bars are hidden",160,0); };
		}) (this), false);
		div.addEventListener('mouseleave', (function() {
		    return function(e) {NgChm.UHM.hlpC(); };
		}) (this), false);
	}   
}

NgChm.DET.labelClick = function (e) {
	NgChm.DET.hideSearchResults();	
	if (e.shiftKey || e.type == "touchmove"){ // shift + click
		var selection = window.getSelection();
		selection.removeAllRanges();
		var focusNode = e.type == "touchmove" ? e.target : this;
		var focusIndex = Number(focusNode.dataset.index);
		var axis = focusNode.dataset.axis;
		if (NgChm.DET.labelLastClicked[axis]){ // if label in the same axis was clicked last, highlight all
			var anchorIndex = Number(NgChm.DET.labelLastClicked[axis]);
			var startIndex = Math.min(focusIndex,anchorIndex), endIndex = Math.max(focusIndex,anchorIndex);
			for (var i = startIndex; i <= endIndex; i++){
				if (!NgChm.DET.labelIndexInSearch(i, axis)){
					NgChm.SEL.searchItems[axis][i] = 1;
				}
			}
		} else { // otherwise, treat as normal click
			NgChm.DET.clearSearchItems(focusNode.dataset.axis);
			var searchIndex = NgChm.DET.labelIndexInSearch(focusIndex,axis);
			if (searchIndex ){
				delete NgChm.SEL.searchItems[axis][index];
			} else {
				NgChm.SEL.searchItems[axis][focusIndex] = 1;
			}
		}
		NgChm.DET.labelLastClicked[axis] = focusIndex;
	} else if (e.ctrlKey || e.metaKey){ // ctrl or Mac key + click
		var axis = this.dataset.axis;
		var index = this.dataset.index;
		var searchIndex = NgChm.DET.labelIndexInSearch(index, axis);
		if (searchIndex){ // if already searched, remove from search items
			delete NgChm.SEL.searchItems[axis][index];
		} else {
			NgChm.SEL.searchItems[axis][index] = 1;
		}
		NgChm.DET.labelLastClicked[axis] = index;
	} else { // standard click
		var axis = this.dataset.axis;
		var index = this.dataset.index;
		NgChm.DET.clearSearchItems(axis);
		NgChm.SEL.searchItems[axis][index] = 1;
		NgChm.DET.labelLastClicked[axis] = index;
	}
	var searchElement = document.getElementById('search_text');
	searchElement.value = "";
	document.getElementById('prev_btn').style.display='';
	document.getElementById('next_btn').style.display='';
	document.getElementById('cancel_btn').style.display='';
	NgChm.SUM.clearSelectionMarks();
	NgChm.DET.updateDisplayedLabels();
	NgChm.SEL.updateSelection();
	NgChm.SUM.drawRowSelectionMarks();
	NgChm.SUM.drawColSelectionMarks();
	NgChm.SUM.drawTopItems();
	NgChm.DET.showSearchResults();	
}

NgChm.DET.labelDrag = function(e){
	e.preventDefault();
	NgChm.DET.latestLabelTap = null;
	var selection = window.getSelection();
	selection.removeAllRanges();
	var focusNode = e.type == "touchmove" ? document.elementFromPoint(e.touches[0].pageX, e.touches[0].pageY) : this;
	var focusIndex = Number(focusNode.dataset.index);
	var axis = focusNode.dataset.axis;
	if (NgChm.DET.labelLastClicked[axis]){ // if label in the same axis was clicked last, highlight all
		var anchorIndex = Number(NgChm.DET.labelLastClicked[axis]);
		var startIndex = Math.min(focusIndex,anchorIndex), endIndex = Math.max(focusIndex,anchorIndex);
		for (var i = startIndex; i <= endIndex; i++){
			if (!NgChm.DET.labelIndexInSearch(i, axis)){
				NgChm.SEL.searchItems[axis][i] = 1;
			}
		}
	} else { // otherwise, treat as normal click
		NgChm.DET.clearSearchItems(focusNode.dataset.axis);
		var searchIndex = NgChm.DET.labelIndexInSearch(focusIndex,axis);
		if (searchIndex ){
			delete NgChm.SEL.searchItems[axis][index];
		} else {
			NgChm.SEL.searchItems[axis][focusIndex] = 1;
		}
	}
	NgChm.DET.labelLastClicked[axis] = focusIndex;
	var searchElement = document.getElementById('search_text');
	searchElement.value = "";
	document.getElementById('prev_btn').style.display='';
	document.getElementById('next_btn').style.display='';
	document.getElementById('cancel_btn').style.display='';
	NgChm.DET.updateDisplayedLabels();
	NgChm.SUM.clearSelectionMarks();
	NgChm.DET.showSearchResults();	
	NgChm.SEL.updateSelection();
	NgChm.SUM.drawRowSelectionMarks();
	NgChm.SUM.drawColSelectionMarks();
	NgChm.SUM.drawTopItems();
	NgChm.DET.showSearchResults();	
	return;
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
	for (let ii = 0; ii < markLabels.length; ii++){ // clear tick marks
		NgChm.DET.removeLabel(markLabels[ii].id);
	}
}

NgChm.DET.labelRightClick = function (e) {
    e.preventDefault();
    var axis = e.target.dataset.axis;
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
					searchLabels.push(labels[i].split("|")[0]);
				}else if (labelType == linkouts.HIDDEN_LABELS){
					searchLabels.push(labels[i].split("|")[1]);
				} else {
					searchLabels.push(labels[i]);
				}
			} else {
				if (labelType == linkouts.VISIBLE_LABELS){
					searchLabels.push(labels[i-1].split("|")[0]);
				}else if (labelType == linkouts.HIDDEN_LABELS){
					searchLabels.push(labels[i-1].split("|")[1]);
				} else {
					searchLabels.push(labels[i-1]);
				}
			}
		}
	} else {
		searchLabels = {"Row" : [], "Column" : []};
		for (var i in NgChm.SEL.searchItems["Row"]){
			if (labelType == linkouts.VISIBLE_LABELS){
				searchLabels["Row"].push(labels[0][i-1].split("|")[0]);
			}else if (labelType == linkouts.HIDDEN_LABELS){
				searchLabels["Row"].push(labels[0][i-1].split("|")[1]);
			} else {
				searchLabels["Row"].push(labels[0][i-1])
			}
		}
		for (var i in NgChm.SEL.searchItems["Column"]){
			if (labelType == linkouts.VISIBLE_LABELS){
				searchLabels["Column"].push(labels[1][i-1].split("|")[0]);
			}else if (labelType == linkouts.HIDDEN_LABELS){
				searchLabels["Column"].push(labels[1][i-1].split("|")[1]);
			} else {
				searchLabels["Column"].push(labels[1][i-1]);
			}
		}
	}
	return searchLabels;
}


//This function draws column class bars on the detail heat map canvas
NgChm.DET.detailDrawColClassBars = function (pixels) {
	var colClassBarConfig = NgChm.heatMap.getColClassificationConfig();
	var colClassBarConfigOrder = NgChm.heatMap.getColClassificationOrder();
	var colClassBarData = NgChm.heatMap.getColClassificationData();
	var rowClassBarWidth = NgChm.DET.calculateTotalClassBarHeight("row");
	var fullWidth = NgChm.DET.dataViewWidth + rowClassBarWidth;
	var mapHeight = NgChm.DET.dataViewHeight;
	var pos = fullWidth*mapHeight*NgChm.SUM.BYTE_PER_RGBA;
	pos += fullWidth*NgChm.DET.paddingHeight*NgChm.SUM.BYTE_PER_RGBA;
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
			var start = NgChm.SEL.currentCol;
			var length = NgChm.SEL.getCurrentDetDataPerRow();
			if (((NgChm.SEL.mode == 'RIBBONH') || (NgChm.SEL.mode == 'FULL_MAP')) &&  (typeof colClassBarData[key].svalues !== 'undefined')) {
				//Special case on large maps - if we are showing the whole row or a large part of it, use the summary classification values.
				classBarValues = colClassBarData[key].svalues;
				var rhRate = NgChm.heatMap.getColSummaryRatio(NgChm.MMGR.RIBBON_HOR_LEVEL);
			    start = Math.ceil(start/rhRate);
			}
			if (currentClassBar.bar_type === 'color_plot') {
				pos = NgChm.DET.drawColorPlotColClassBar(pixels, pos, rowClassBarWidth, start, length, currentClassBar, classBarValues, classBarLength, colorMap);
			} else {
				pos = NgChm.DET.drawScatterBarPlotColClassBar(pixels, pos, currentClassBar.height-NgChm.DET.paddingHeight, classBarValues, start, length, currentClassBar, colorMap);
			}
		  }

	}
}

NgChm.DET.drawColorPlotColClassBar = function(pixels, pos, rowClassBarWidth, start, length, currentClassBar, classBarValues, classBarLength, colorMap) {
	var line = new Uint8Array(new ArrayBuffer(classBarLength * NgChm.SUM.BYTE_PER_RGBA)); // save a copy of the class bar
	var loc = 0;
	for (var k = start; k <= start + length -1; k++) { 
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
		pos += (rowClassBarWidth + 1)*NgChm.SUM.BYTE_PER_RGBA;
		for (var k = 0; k < line.length; k++) { 
			pixels[pos] = line[k];
			pos++;
		}
		pos+=NgChm.SUM.BYTE_PER_RGBA;
	}
	return pos;
}

NgChm.DET.drawScatterBarPlotColClassBar = function(pixels, pos, height, classBarValues, start, length, currentClassBar, colorMap) {
	var barFgColor = colorMap.getHexToRgba(currentClassBar.fg_color);
	var barBgColor = colorMap.getHexToRgba(currentClassBar.bg_color);
	var barCutColor = colorMap.getHexToRgba("#FFFFFF");
	var matrix = NgChm.SUM.buildScatterBarPlotMatrix(height, classBarValues, start-1, length, currentClassBar, 100, false);
	var rowClassBarWidth = NgChm.DET.calculateTotalClassBarHeight("row");

	//offset value for width of row class bars
	var offset = (rowClassBarWidth + 2)*NgChm.SUM.BYTE_PER_RGBA;
	for (var h = 0; h < matrix.length; h++) { 
		pos += offset;
		var row = matrix[h];
		for (var k = 0; k < row.length; k++) { 
			var posVal = row[k];
			for (var j = 0; j < NgChm.DET.dataBoxWidth; j++) {
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

NgChm.DET.drawColClassBarLegend = function(key,currentClassBar,prevHeight,totalHeight) {
	var scale =  NgChm.DET.canvas.clientHeight / (NgChm.DET.dataViewHeight + NgChm.DET.calculateTotalClassBarHeight("column"));
	var classHgt = NgChm.DET.calculateTotalClassBarHeight("column");

	//calculate where the previous bar ends and the current one begins.
	totalHeight *= scale;
	var prevEndPct = prevHeight/totalHeight;
	var currEndPct = (prevHeight+parseInt(currentClassBar.height))/totalHeight;

	//calculate where covariate bars begin and end and use that to calculate the total covariate bars height
	var beginClasses = NgChm.DET.canvas.offsetTop-5;
	var endClasses = beginClasses+(classHgt*scale)-3;
	var classHeight = (endClasses-beginClasses)*scale;

	//find the first, middle, and last vertical positions for the bar legend being drawn
	var topPos =  beginClasses+(classHeight*prevEndPct)+NgChm.DET.paddingHeight;
	var endPos =  beginClasses+(classHeight*currEndPct)+NgChm.DET.paddingHeight;
	var midPos =  topPos+((endPos-topPos)/2);

	//get your horizontal start position (to the right of bars)
	var leftPos = NgChm.DET.canvas.offsetLeft + NgChm.DET.canvas.offsetWidth;

	//Get your 3 values for the legend.
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
	
	//Create div and place high legend value
	NgChm.SUM.setLegendDivElement(key+"legendDetHigh-","-",topPos,leftPos,false,false);
	NgChm.SUM.setLegendDivElement(key+"legendDetHigh",highVal,topPos+4,leftPos+3,false,false);
	//Create div and place mid legend value
	NgChm.SUM.setLegendDivElement(key+"legendDetMid","- "+midVal,midPos,leftPos,false,false);
	//Create div and place low legend value
	NgChm.SUM.setLegendDivElement(key+"legendDetLow",lowVal,endPos-3,leftPos+3,false,false);
	NgChm.SUM.setLegendDivElement(key+"legendDetLow-","-",endPos,leftPos,false,false);
}

NgChm.DET.colClassLabelsContainLegend = function (type) {
	var containsLegend = false;
	var classBarOrder = NgChm.heatMap.getColClassificationOrder();
	var classBarConfig = NgChm.heatMap.getColClassificationConfig();
	if (type === "row") {
		classBarOrder = NgChm.heatMap.getRowClassificationOrder();
		classBarConfig = NgChm.heatMap.getRowClassificationConfig();
	}
	for (var i=0;i< classBarOrder.length;i++) {
		var key = classBarOrder[i];
		var currentClassBar = classBarConfig[key];
		if ((currentClassBar.show === 'Y') && (currentClassBar.bar_type !== 'color_plot')) {
			containsLegend = true;
		}
	}
	return containsLegend;
}

// This function calculates the maximum size of all column class bar labels and update NgChm.DET.colLabelLen if the value
// of any label exceeds the existing maximum stored in that variable
NgChm.DET.calcColClassBarLabels = function () {
	var scale =  NgChm.DET.canvas.clientHeight / (NgChm.DET.dataViewHeight + NgChm.DET.calculateTotalClassBarHeight("column")+NgChm.DET.dendroHeight);
	var colClassBarConfig = NgChm.heatMap.getColClassificationConfig();
	var colClassBarConfigOrder = NgChm.heatMap.getColClassificationOrder();
	var colClassLength = Object.keys(colClassBarConfig).length;
	var containsLegend = NgChm.DET.colClassLabelsContainLegend("col");
	if (colClassBarConfig != null && colClassLength > 0) {
		NgChm.DET.colClassLabelFont = NgChm.DET.colClassBarLabelFont();
		if ((NgChm.DET.colClassLabelFont > NgChm.DET.minLabelSize) && (NgChm.DET.colClassLabelFont < NgChm.DET.maxLabelSize)){
			for (var i=0;i< colClassBarConfigOrder.length;i++) {
				var key = colClassBarConfigOrder[i];
				var currentClassBar = colClassBarConfig[key];
				if (currentClassBar.show === 'Y') {
					var currFont = Math.min((currentClassBar.height - NgChm.DET.paddingHeight) * scale, NgChm.DET.maxLabelSize);
					var labelText = NgChm.UTIL.getLabelText(key,'ROW');
					if (containsLegend) {
						labelText = "XXXX"+labelText; //calculate spacing for bar legend
					}
					NgChm.DET.addTmpLabelForSizeCalc(labelText, NgChm.DET.colClassLabelFont);
				} 
			}	
			NgChm.DET.calcLabelDiv('ROW');
		}
	}
}

// This function draws column class bar labels on the detail panel
NgChm.DET.detailDrawColClassBarLabels = function () {
	NgChm.DET.removeLabel ("missingDetColClassBars");
	var scale =  NgChm.DET.canvas.clientHeight / (NgChm.DET.dataViewHeight + NgChm.DET.calculateTotalClassBarHeight("column"));
	var colClassBarConfig = NgChm.heatMap.getColClassificationConfig();
	var colClassBarConfigOrder = NgChm.heatMap.getColClassificationOrder();
	var colClassLength = Object.keys(colClassBarConfig).length;
	var containsLegend = NgChm.DET.colClassLabelsContainLegend("col");
	if (colClassBarConfig != null && colClassLength > 0) {
		if (NgChm.DET.colClassLabelFont > NgChm.DET.minLabelSize) {
			var yPos = NgChm.DET.canvas.offsetTop;
			for (var i=0;i< colClassBarConfigOrder.length;i++) {
				var xPos = NgChm.DET.canvas.offsetLeft + NgChm.DET.canvas.clientWidth + 3;
				var key = colClassBarConfigOrder[i];
				var currentClassBar = colClassBarConfig[key];
				if (currentClassBar.show === 'Y') {
					NgChm.SUM.drawColClassBarLegends(false);
					var currFont = Math.min((currentClassBar.height - NgChm.DET.paddingHeight) * scale, NgChm.DET.maxLabelSize);
					if (currFont >= NgChm.DET.colClassLabelFont) {
						var yOffset = yPos - 1;
						//Reposition label to center of large-height bars
						if (currentClassBar.height >= 20) {
							yOffset += ((((currentClassBar.height/2) - (NgChm.DET.colClassLabelFont/2)) - 3) * scale);
						}
						var labelText = NgChm.UTIL.getLabelText(key,'ROW');
						if (containsLegend) {
							xPos += 14; //add spacing for bar legend
						}
						NgChm.DET.addLabelDiv(NgChm.DET.labelElement, 'detail_classcol' + i, 'DynamicLabel ClassBar', labelText, key, xPos, yOffset, NgChm.DET.colClassLabelFont, 'F', i, "ColumnCovar");
					}
					yPos += (currentClassBar.height * scale);
				} else {
					if (!document.getElementById("missingDetColClassBars")){
						var x =  NgChm.DET.canvas.offsetLeft + NgChm.DET.canvas.clientWidth+2;
						var y = NgChm.DET.canvas.offsetTop-15;
						NgChm.DET.addLabelDiv(NgChm.DET.labelElement, "missingDetColClassBars", "ClassBar MarkLabel", "...", "...", x, y, 10, "F", null,"Column");
					}
                    if (!document.getElementById("missingSumColClassBars") && NgChm.SUM.canvas && NgChm.SUM.chmElement){
                        var x = NgChm.SUM.canvas.offsetLeft + NgChm.SUM.canvas.offsetWidth + 2;
                        var y = NgChm.SUM.canvas.offsetTop + NgChm.SUM.canvas.clientHeight/NgChm.SUM.totalHeight - 10;
                        NgChm.DET.addLabelDiv(document.getElementById('sumlabelDiv'), "missingSumColClassBars", "ClassBar MarkLabel", "...", "...", x, y, 10, "F", null,"Column");
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
	for (let key in classBarConfig) {
		var classBar = classBarConfig[key];
		var fontSize = Math.min(((classBar.height - NgChm.DET.paddingHeight) * scale) - 1, 10);
		if ((fontSize > NgChm.DET.minLabelSize) && (fontSize < minFont)) {
			minFont = fontSize;
		}
	}
	return minFont === 999 ? NgChm.DET.minLabelSize : minFont;
}

// This function calculates the appropriate font size for row class bar labels
NgChm.DET.rowClassBarLabelFont = function() {
	var scale =  NgChm.DET.canvas.clientWidth / (NgChm.DET.dataViewWidth + NgChm.DET.calculateTotalClassBarHeight("row")+NgChm.DET.dendroWidth);
	var rowClassBarConfig = NgChm.heatMap.getRowClassificationConfig();
	var fontSize = NgChm.DET.getClassBarLabelFontSize(rowClassBarConfig,scale);
	return fontSize;
}

//This function draws row class bars on the detail heat map canvas
NgChm.DET.detailDrawRowClassBars = function (pixels) {
	var rowClassBarConfig = NgChm.heatMap.getRowClassificationConfig();
	var rowClassBarConfigOrder = NgChm.heatMap.getRowClassificationOrder();
	var rowClassBarData = NgChm.heatMap.getRowClassificationData();
	var rowClassBarWidth = NgChm.DET.calculateTotalClassBarHeight("row");
	var detailTotalWidth = NgChm.DET.calculateTotalClassBarHeight("row") + NgChm.DET.dataViewWidth;
	var mapWidth =  NgChm.DET.calculateTotalClassBarHeight("row") + NgChm.DET.dataViewWidth;
	var mapHeight = NgChm.DET.dataViewHeight;
	var colorMapMgr = NgChm.heatMap.getColorMapManager();
	var offset = ((detailTotalWidth*NgChm.DET.dataViewBorder/2)) * NgChm.SUM.BYTE_PER_RGBA; // start position of very bottom dendro
	for (var i=0;i< rowClassBarConfigOrder.length;i++) {
		var key = rowClassBarConfigOrder[i];
		if (!rowClassBarConfig.hasOwnProperty(key)) {
		    continue;
		  }
		var currentClassBar = rowClassBarConfig[key];
		if (currentClassBar.show === 'Y') {
			var colorMap = colorMapMgr.getColorMap("row",key); // assign the proper color scheme...
			var classBarValues = rowClassBarData[key].values;
			var classBarLength = classBarValues.length;
			var start = NgChm.SEL.currentRow;
			var length = NgChm.SEL.getCurrentDetDataPerCol();
			if (((NgChm.SEL.mode == 'RIBBONV') || (NgChm.SEL.mode == 'FULL_MAP')) &&  (typeof rowClassBarData[key].svalues !== 'undefined')) {
				//Special case on large maps, if we are showing the whole column, switch to the summary classificaiton values
				classBarValues = rowClassBarData[key].svalues;
				var rvRate = NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.RIBBON_VERT_LEVEL);
			    start = Math.ceil(start/rvRate);
			}
			var pos = offset; // move past the dendro and the other class bars...
			if (currentClassBar.bar_type === 'color_plot') {
				pos = NgChm.DET.drawColorPlotRowClassBar(pixels, pos, start, length, currentClassBar, classBarValues, mapWidth, colorMap);
			} else {
				pos = NgChm.DET.drawScatterBarPlotRowClassBar(pixels, pos, start, length, currentClassBar.height-NgChm.DET.paddingHeight, classBarValues, mapWidth, colorMap, currentClassBar);
			}
			offset+= currentClassBar.height*NgChm.SUM.BYTE_PER_RGBA;
		}
	}	
}

NgChm.DET.drawRowClassBarLegend = function(key,currentClassBar,prevHeight,totalHeight,i) {
	var scale =  NgChm.DET.canvas.clientWidth / (NgChm.DET.dataViewWidth + NgChm.DET.calculateTotalClassBarHeight("row"));
	var classHgt = NgChm.DET.calculateTotalClassBarHeight("row");
	totalHeight *= scale;
	var prevEndPct = prevHeight/totalHeight;
	var currEndPct = (prevHeight+parseInt(currentClassBar.height))/totalHeight;
	var beginClasses = NgChm.DET.canvas.offsetLeft-5;
	var endClasses = beginClasses+(classHgt*scale)-3;
	var classHeight = (endClasses-beginClasses)*scale;
	var beginPos =  beginClasses+(classHeight*prevEndPct)+(NgChm.DET.paddingHeight*(i+1));
	var endPos =  beginClasses+(classHeight*currEndPct);
	var midPos =  beginPos+((endPos-beginPos)/2);
	var topPos = NgChm.DET.canvas.offsetTop + NgChm.DET.canvas.offsetHeight + 2;
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
	//Create div and place high legend value
	NgChm.SUM.setLegendDivElement(key+"legendDetLow","-"+lowVal,topPos,beginPos,true,false);
	//Create div and place middle legend value
	NgChm.SUM.setLegendDivElement(key+"legendDetMid","-"+midVal,topPos,midPos,true,false);
	//Create div and place middle legend value
	NgChm.SUM.setLegendDivElement(key+"legendDetHigh","-"+highVal,topPos,endPos,true,false);
}

NgChm.DET.drawColorPlotRowClassBar = function(pixels, pos, start, length, currentClassBar, classBarValues, mapWidth, colorMap) {
	for (var j = start + length - 1; j >= start; j--){ // for each row shown in the detail panel
		var val = classBarValues[j-1];
		var color = colorMap.getClassificationColor(val);
		for (var boxRows = 0; boxRows < NgChm.DET.dataBoxHeight; boxRows++) { // draw this color to the proper height
			for (var k = 0; k < currentClassBar.height-NgChm.DET.paddingHeight; k++){ // draw this however thick it needs to be
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

NgChm.DET.drawScatterBarPlotRowClassBar = function(pixels, pos, start, length, height, classBarValues, mapWidth, colorMap, currentClassBar) {
	var barFgColor = colorMap.getHexToRgba(currentClassBar.fg_color);
	var barBgColor = colorMap.getHexToRgba(currentClassBar.bg_color);
	var barCutColor = colorMap.getHexToRgba("#FFFFFF");
	var matrix = NgChm.SUM.buildScatterBarPlotMatrix(height, classBarValues, start-1, length, currentClassBar, NgChm.heatMap.getTotalRows(), false);
	for (var h = matrix[0].length-1; h >= 0 ; h--) { 
		for (var j = 0; j < NgChm.DET.dataBoxHeight; j++) {
			for (var i = 0; i < height;i++) {
				var row = matrix[i];
				var posVal = row[h];
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

//Calculate the maximum size of all row class bar labels and update NgChm.DET.rowLabelLen if the value
//of any label exceeds the existing maximum stored in that variable
NgChm.DET.calcRowClassBarLabels = function () {
	var rowClassBarConfigOrder = NgChm.heatMap.getRowClassificationOrder();
	var scale =  NgChm.DET.canvas.clientWidth / (NgChm.DET.dataViewWidth + NgChm.DET.calculateTotalClassBarHeight("row")+NgChm.DET.dendroWidth);
	var rowClassBarConfig = NgChm.heatMap.getRowClassificationConfig();
	var rowClassLength = Object.keys(rowClassBarConfig).length;
	var containsLegend = NgChm.DET.colClassLabelsContainLegend("row");
	if (rowClassBarConfig != null && rowClassLength > 0) {
		NgChm.DET.rowClassLabelFont = NgChm.DET.rowClassBarLabelFont();
		if ((NgChm.DET.rowClassLabelFont > NgChm.DET.minLabelSize)  && (NgChm.DET.colClassLabelFont < NgChm.DET.maxLabelSize)) {
			for (var i=0;i< rowClassBarConfigOrder.length;i++) {
				var key = rowClassBarConfigOrder[i];
				var currentClassBar = rowClassBarConfig[rowClassBarConfigOrder[i]];
				if (currentClassBar.show === 'Y') {
					var currFont = Math.min((currentClassBar.height - NgChm.DET.paddingHeight) * scale, NgChm.DET.maxLabelSize);
					var labelText = NgChm.UTIL.getLabelText(key,'COL');
					if (containsLegend) {
						labelText = "XXX"+labelText; //calculate spacing for bar legend
					}
					NgChm.DET.addTmpLabelForSizeCalc(labelText, NgChm.DET.rowClassLabelFont);
				} 
			} 
			NgChm.DET.calcLabelDiv('COL');
		}	
	}
}

//This function draws row class bar labels on the detail panel
NgChm.DET.detailDrawRowClassBarLabels = function () {
	var rowClassBarConfigOrder = NgChm.heatMap.getRowClassificationOrder();
	NgChm.DET.removeLabel ("missingDetRowClassBars");
	var scale =  NgChm.DET.canvas.clientWidth / (NgChm.DET.dataViewWidth + NgChm.DET.calculateTotalClassBarHeight("row"));
	var classBarAreaWidth = NgChm.DET.calculateTotalClassBarHeight("row")*scale;
	var dataAreaWidth = NgChm.DET.dataViewWidth*scale;
	var rowClassBarConfig = NgChm.heatMap.getRowClassificationConfig();
	var rowClassLength = Object.keys(rowClassBarConfig).length;
	var containsLegend = NgChm.DET.colClassLabelsContainLegend("row");
	if (rowClassBarConfig != null && rowClassLength > 0) {
		var startingPoint = NgChm.DET.canvas.offsetLeft+NgChm.DET.rowClassLabelFont + 2;
		if (NgChm.DET.rowClassLabelFont > NgChm.DET.minLabelSize) {
			var prevClassBarHeight = 0;
			for (var i=0;i< rowClassBarConfigOrder.length;i++) {
				var key = rowClassBarConfigOrder[i];
				var currentClassBar = rowClassBarConfig[rowClassBarConfigOrder[i]];
				var barWidth = (currentClassBar.height*scale);
				var xPos = startingPoint + (barWidth/2) - (NgChm.DET.rowClassLabelFont/2);
				var yPos = NgChm.DET.canvas.offsetTop + NgChm.DET.canvas.clientHeight + 4;
				if (currentClassBar.show === 'Y') {
					NgChm.SUM.drawRowClassBarLegends(false);
					var currFont = Math.min((currentClassBar.height - NgChm.DET.paddingHeight) * scale, NgChm.DET.maxLabelSize);
					var labelText = NgChm.UTIL.getLabelText(key,'COL');
					if (containsLegend) {
						yPos += 12; //add spacing for bar legend
					}
					if (currFont >= NgChm.DET.rowClassLabelFont) {
						NgChm.DET.addLabelDiv(NgChm.DET.labelElement, 'detail_classrow' + i, 'DynamicLabel ClassBar', labelText, key, xPos, yPos, NgChm.DET.rowClassLabelFont, 'T', i, "RowCovar",key);
					}
					yPos += (currentClassBar.height * scale);
					startingPoint += barWidth;
				} else {
					if (!document.getElementById("missingDetRowClassBars")){
						var x = NgChm.DET.canvas.offsetLeft + 10;
						var y = NgChm.DET.canvas.offsetTop + NgChm.DET.canvas.clientHeight+2;
						NgChm.DET.addLabelDiv(NgChm.DET.labelElement, "missingDetRowClassBars", "ClassBar MarkLabel", "...", "...", x, y, 10, 'T', i, "Row");
					}
					if (!document.getElementById("missingSumRowClassBars") && NgChm.SUM.canvas){
						var x = NgChm.SUM.canvas.offsetLeft;
						var y = NgChm.SUM.canvas.offsetTop + NgChm.SUM.canvas.clientHeight + 2;
						NgChm.DET.addLabelDiv(document.getElementById('sumlabelDiv'), "missingSumRowClassBars", "ClassBar MarkLabel", "...", "...", x, y, 10, "T", null,"Row");
					}
				}
				prevClassBarHeight = currentClassBar.height;
			} 
		}	
	}
}

//Covariate bars in the detail pane are just their specified height,
//with no rescaling.
NgChm.DET.calculateTotalClassBarHeight = function (axis) {
	return NgChm.heatMap.calculateTotalClassBarHeight (axis);
}

/******************************************************
 *****  DETAIL DENDROGRAM FUNCTIONS START HERE!!! *****
 ******************************************************/

NgChm.DET.getSamplingRatio = function (axis) {
	if (axis == 'row'){
		switch (NgChm.SEL.mode){
			case 'RIBBONH': return NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.RIBBON_HOR_LEVEL);
			case 'RIBBONV': return NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.RIBBON_VERT_LEVEL);
			case 'FULL_MAP': return NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.RIBBON_VERT_LEVEL);
			default:        return NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.DETAIL_LEVEL);
		}
	} else {
		switch (NgChm.SEL.mode){
			case 'RIBBONH': return NgChm.heatMap.getColSummaryRatio(NgChm.MMGR.RIBBON_HOR_LEVEL);
			case 'RIBBONV': return NgChm.heatMap.getColSummaryRatio(NgChm.MMGR.RIBBON_VERT_LEVEL);
			case 'FULL_MAP': return NgChm.heatMap.getColSummaryRatio(NgChm.MMGR.RIBBON_HOR_LEVEL);
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
	NgChm.DET.hideSearchResults();	
	var searchElement = document.getElementById('search_text');
	var searchString = searchElement.value.trim();
	if (searchString == "" || searchString == null || searchString == " " || searchString == "."){
		return;
	}
	NgChm.SEL.createEmptySearchItems();
	NgChm.SUM.clearSelectionMarks();
	var tmpSearchItems = searchString.split(/[;, ]+/);
	const itemsFound = [];
	
	//Put labels into the global search item list if they match a user search string.
	//Regular expression is built for partial matches if the search string contains '*'.
	//toUpperCase is used to make the search case insensitive.
	var labels = NgChm.heatMap.getRowLabels()["labels"];
	for (var j = 0; j < tmpSearchItems.length; j++) {
		var reg;
		var searchItem = tmpSearchItems[j];
		if (searchItem == "." || searchItem == "*"){ // if this is a search item that's going to return everything, skip it.
			continue;
		}
		if (searchItem.charAt(0) == "\"" && searchItem.slice(-1) == "\""){ // is it wrapped in ""?
			reg = new RegExp("^" + searchItem.toUpperCase().slice(1,-1).replace(".","\\.") + "$");
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
		if (searchItem == "." || searchItem == "*"){ // if this is a search item that's going to return everything, skip it.
			continue;
		}
		if (searchItem.charAt(0) == "\"" && searchItem.slice(-1) == "\""){ // is it wrapped in ""?
			reg = new RegExp("^" + searchItem.toUpperCase().slice(1,-1).replace(".","\\.") + "$");
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
	NgChm.DET.searchNext(true);
    NgChm.SUM.drawRowSelectionMarks();
    NgChm.SUM.drawColSelectionMarks();
    NgChm.SUM.drawTopItems();
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
	NgChm.DET.showSearchResults();	
	let dc = document.getElementById("detail_canvas");
	if (dc != null) dc.focus();
}

NgChm.DET.showSearchResults = function () {
	document.getElementById("search_display_text").innerHTML = NgChm.DET.getSearchResultsTxt();
}
NgChm.DET.hideSearchResults = function () {
	document.getElementById("search_display_text").innerHTML = "";
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
	while( !NgChm.SEL.searchItems[axis][++curr] && curr <  axisLength){}; // find first searchItem in row
	if (curr >= axisLength){ // if no searchItems exist in first axis, move to other axis
		curr = -1;
		while( !NgChm.SEL.searchItems[otherAxis][++curr] && curr <  otherAxisLength){};
		if (curr >=otherAxisLength){ // if no matches in the other axis, check the earlier indices of the first axis (loop back)
			curr = -1;
			while( !NgChm.SEL.searchItems[axis][++curr] && curr <  index){};
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
	while( !NgChm.SEL.searchItems[axis][--curr] && curr > -1 ){}; // find first searchItem in row
	if (curr < 0){ // if no searchItems exist in first axis, move to other axis
		curr = otherAxisLength;
		while( !NgChm.SEL.searchItems[otherAxis][--curr] && curr > -1){};
		if (curr > 0){
			NgChm.DET.currentSearchItem["axis"] = otherAxis;
			NgChm.DET.currentSearchItem["index"] = curr;
		} else {
			curr = axisLength;
			while( !NgChm.SEL.searchItems[axis][--curr] && curr > index ){};
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
NgChm.DET.searchNext = function (firstTime) {
	if (typeof firstTime !== 'undefined') {
		NgChm.DET.findNextSearchItem(-1,"Row");
	} else if (!NgChm.DET.currentSearchItem["index"] || !NgChm.DET.currentSearchItem["axis"]){ // if currentSeachItem isnt set (first time search)
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
 	NgChm.DET.hideSearchResults();
	var searchElement = document.getElementById('search_text');
	searchElement.value = "";
	NgChm.DET.currentSearchItem = {};
	NgChm.DET.labelLastClicked = {};
	NgChm.SEL.createEmptySearchItems();
	NgChm.SUM.rowDendro.clearSelectedBars();
	NgChm.SUM.colDendro.clearSelectedBars();
    NgChm.SUM.clearSelectionMarks();
	NgChm.DET.clearSrchBtns(event);
	NgChm.SEL.updateSelection();
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

//Generates search results text to be displayed on button bar
NgChm.DET.getSearchResultsTxt = function () {
	var rowItems = Object.keys(NgChm.SEL.searchItems["Row"]).length;
	var colItems = Object.keys(NgChm.SEL.searchItems["Column"]).length;
	return "Found: Rows - " + rowItems + " Columns - " + colItems;	
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
	NgChm.DET.gl.viewportWidth = NgChm.DET.dataViewWidth+NgChm.DET.calculateTotalClassBarHeight("row");
	NgChm.DET.gl.viewportHeight = NgChm.DET.dataViewHeight+NgChm.DET.calculateTotalClassBarHeight("column");
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
	if (!NgChm.DET.gl) return;

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

	// Texture coordinates for map.
	var texcoord = NgChm.DET.gl.getAttribLocation(program, "texCoord");
	var texcoordBuffer = NgChm.DET.gl.createBuffer();
	NgChm.DET.gl.bindBuffer(NgChm.DET.gl.ARRAY_BUFFER, texcoordBuffer);
	NgChm.DET.gl.bufferData(NgChm.DET.gl.ARRAY_BUFFER, new Float32Array([ 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1 ]), NgChm.DET.gl.STATIC_DRAW);
	NgChm.DET.gl.enableVertexAttribArray(texcoord);
	NgChm.DET.gl.vertexAttribPointer(texcoord, 2, NgChm.DET.gl.FLOAT, false, 0, 0)
	
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
}


NgChm.DET.animating = false; 
NgChm.DET.zoomAnimation = function (destRow,destCol) {
	// set proportion variables for heatmap canvas
	var detViewW = NgChm.DET.dataViewWidth;
	var detViewH = NgChm.DET.dataViewHeight;
	var classBarW = NgChm.DET.calculateTotalClassBarHeight("row");
	var classBarH = NgChm.DET.calculateTotalClassBarHeight("column");
	var dendroW = NgChm.DET.dendroWidth;
	var dendroH = NgChm.DET.dendroHeight;
	var rowTotalW = detViewW + classBarW;
	var colTotalH = detViewH + classBarH;
	var mapWRatio = detViewW / rowTotalW;
	var mapHRatio = detViewH / colTotalH;
	var dendroClassWRatio = 1 - mapWRatio;
	var dendroClassHRatio = 1 - mapHRatio;
	
	var currentWIndex = NgChm.DET.zoomBoxSizes.indexOf(NgChm.DET.dataBoxWidth);
	var currentHIndex = NgChm.DET.zoomBoxSizes.indexOf(NgChm.DET.dataBoxHeight);
	var currentW = NgChm.DET.dataBoxWidth;
	var currentH = NgChm.DET.dataBoxHeight;
	var nextW = NgChm.DET.zoomBoxSizes[currentWIndex+1];
	var nextH = NgChm.DET.zoomBoxSizes[currentHIndex+1];
	var currentNumCols = (detViewW-2)/currentW;
	var currentNumRows = (detViewH-2)/currentH;
	
	var nextNumCols = (detViewW-2)/nextW;
	var nextNumRows = (detViewH-2)/nextH;
	
	// this is the percentage to zoom in by
	var zoomRatioW = (1-(nextNumCols/currentNumCols))*mapWRatio;
	var zoomRatioH = (1-(nextNumRows/currentNumRows))*mapHRatio; 
	
	// set proportion variables for box canvas
	var boxCtx = NgChm.DET.boxCanvas.getContext("2d");
	var boxW = boxCtx.canvas.width;
	var boxH = boxCtx.canvas.height;
	
	
	// if we can't go in any further, don't proceed
	if ((NgChm.SEL.mode !== "RIBBONH" && nextW == undefined) || (NgChm.SEL.mode !== "RIBBONV" && nextH == undefined) || NgChm.DET.animating == true){
		return;
	}
	boxCtx.clearRect(0, 0, boxCtx.canvas.width, boxCtx.canvas.height);
	var animationZoomW = 0;
	var animationZoomH = 0;
	var animateCount = 0;
	var animateCountMax = 10;
	
	animate(destRow,destCol);
	function getAnimate(){
		animate(destRow,destCol);
	}
	function animate(destRow,destCol){
		NgChm.DET.animating = true;

		// create new buffer to draw over the current map
		var buffer = NgChm.DET.gl.createBuffer();
		NgChm.DET.gl.buffer = buffer;
		NgChm.DET.gl.bindBuffer(NgChm.DET.gl.ARRAY_BUFFER, buffer);
		// (-1,-1 is the bottom left corner of the detail canvas, (1,1) is the top right corner
		var vertices = [    -1 + 2*dendroClassWRatio,  		  -1, // this new buffer will only cover up the matrix area and not the entire detail side
		                    				1,   		  -1,   
		                    				1, 1-2*dendroClassHRatio,   
		                     -1 + 2*dendroClassWRatio,   		  -1,  
		                     -1 + 2*dendroClassWRatio, 1-2*dendroClassHRatio,   
		                    				1, 1-2*dendroClassHRatio ];
		NgChm.DET.gl.bufferData(NgChm.DET.gl.ARRAY_BUFFER, new Float32Array(vertices), NgChm.DET.gl.STATIC_DRAW);
		var byte_per_vertex = Float32Array.BYTES_PER_ELEMENT;
		var component_per_vertex = 2;
		buffer.numItems = vertices.length / component_per_vertex;
		var stride = component_per_vertex * byte_per_vertex;
		var program = NgChm.DET.gl.program;
		var position = NgChm.DET.gl.getAttribLocation(program, 'position');
		NgChm.DET.gl.enableVertexAttribArray(position);
		NgChm.DET.gl.vertexAttribPointer(position, 2, NgChm.DET.gl.FLOAT, false, stride, 0);
		var texcoord = NgChm.DET.gl.getAttribLocation(NgChm.DET.gl.program, "texCoord");
		var texcoordBuffer = NgChm.DET.gl.createBuffer();
		NgChm.DET.gl.bindBuffer(NgChm.DET.gl.ARRAY_BUFFER, texcoordBuffer);

		if (animateCount < animateCountMax){ // do we keep animating?
			animateCount++;
			if (!NgChm.SEL.mode.includes("RIBBONH")){
				animationZoomW += zoomRatioW/animateCountMax;
			}
			if (!NgChm.SEL.mode.includes("RIBBONV")){
				animationZoomH += zoomRatioH/animateCountMax;
			}
			if (NgChm.SEL.mode == "FULL_MAP"){
				var saveRow = NgChm.DET.saveRow;
				var saveCol = NgChm.DET.saveCol;
				if (destRow && destCol){
					var saveRow = destRow*NgChm.heatMap.getRowSummaryRatio("s");
					var saveCol = destCol*NgChm.heatMap.getColSummaryRatio("s");
				}
				var detWidth = NgChm.DET.SIZE_NORMAL_MODE-NgChm.DET.paddingHeight;
				var detHeight = NgChm.DET.SIZE_NORMAL_MODE-NgChm.DET.paddingHeight;
				if ((NgChm.DET.SIZE_NORMAL_MODE-NgChm.DET.paddingHeight) > NgChm.heatMap.getNumRows("d")){
					for (var i = 0; i<NgChm.DET.zoomBoxSizes.length; i++){
						if ((NgChm.DET.SIZE_NORMAL_MODE-NgChm.DET.paddingHeight)/NgChm.DET.zoomBoxSizes[i] < NgChm.heatMap.getNumRows("d")){
							detHeight = (NgChm.DET.SIZE_NORMAL_MODE-NgChm.DET.paddingHeight)/NgChm.DET.zoomBoxSizes[i];
							break;
						}
					}
				}
				
				if ((NgChm.DET.SIZE_NORMAL_MODE-NgChm.DET.paddingHeight) > NgChm.heatMap.getNumColumns("d")){
					for (var i = 0;i< NgChm.DET.zoomBoxSizes.length; i++){
						if ((NgChm.DET.SIZE_NORMAL_MODE-NgChm.DET.paddingHeight)/NgChm.DET.zoomBoxSizes[i] < NgChm.heatMap.getNumColumns("d")){
							detWidth = (NgChm.DET.SIZE_NORMAL_MODE-NgChm.DET.paddingHeight)/NgChm.DET.zoomBoxSizes[i];
							break;
						}
					}
				}
				
				var detNum = Math.min(detWidth,detHeight);
				if (destRow && destCol){
					saveRow = Math.max(1,saveRow-detNum/2);
					saveCol = Math.max(1,saveCol-detNum/2);
					NgChm.DET.saveRow = saveRow;
					NgChm.DET.saveCol = saveCol;
				}
								
				//TODO: do we need to account for summary ratio???
				var leftRatio=(saveCol-1)*mapWRatio /NgChm.SEL.dataPerRow /animateCountMax/NgChm.heatMap.getColSummaryRatio("d");
				var rightRatio=Math.max(0,(NgChm.SEL.getCurrentDetDataPerRow()*NgChm.heatMap.getColSummaryRatio("d")-saveCol-1-detNum)*mapWRatio /NgChm.SEL.getCurrentDetDataPerRow() /animateCountMax/NgChm.heatMap.getColSummaryRatio("d")); // this one works for maps that are not too big!!
				var topRatio = (saveRow-1)*mapHRatio /NgChm.SEL.dataPerCol /animateCountMax/NgChm.heatMap.getRowSummaryRatio("d");
				var bottomRatio = Math.max(0,(NgChm.SEL.getCurrentDetDataPerCol()*NgChm.heatMap.getRowSummaryRatio("d")-saveRow-1-detNum)*mapHRatio   /NgChm.SEL.getCurrentDetDataPerCol() /animateCountMax/NgChm.heatMap.getRowSummaryRatio("d")); // this one works for maps that are not too big!
				
				NgChm.DET.gl.bufferData(NgChm.DET.gl.ARRAY_BUFFER, new Float32Array([ dendroClassWRatio+animateCount*leftRatio, animateCount*bottomRatio,
				                                                                      1-animateCount*rightRatio, animateCount*bottomRatio,
				                                                                      1-animateCount*rightRatio, mapHRatio-animateCount*topRatio,
				                                                                      dendroClassWRatio+animateCount*leftRatio, animateCount*bottomRatio,
				                                                                      dendroClassWRatio+animateCount*leftRatio, mapHRatio-animateCount*topRatio,
				                                                                      1-animateCount*rightRatio, mapHRatio-animateCount*topRatio ]), NgChm.DET.gl.STATIC_DRAW);
			} else if ((currentNumRows-nextNumRows)%2 == 0){ // an even number of data points are going out of view
				// we zoom the same amount from the top/left as the bottom/right
				// (0,0) is the bottom left corner, (1,1) is the top right
				NgChm.DET.gl.bufferData(NgChm.DET.gl.ARRAY_BUFFER, new Float32Array([ dendroClassWRatio+animationZoomW/2, animationZoomH/2,
				                                                                      1-animationZoomW/2, animationZoomH/2,
				                                                                      1-animationZoomW/2, mapHRatio-animationZoomH/2,
				                                                                      dendroClassWRatio+animationZoomW/2, animationZoomH/2,
				                                                                      dendroClassWRatio+animationZoomW/2, mapHRatio-animationZoomH/2,
				                                                                      1-animationZoomW/2, mapHRatio-animationZoomH/2 ]), NgChm.DET.gl.STATIC_DRAW);
			} else { // an odd number of data points are going out of view (ie: if the difference in points shown is 9, move 4 from the top/left, move 5 from the bottom/right)
				// we zoom one less point on the top/left than we do the bottom/right
				var rowDiff = currentNumRows-nextNumRows;
				var colDiff = currentNumCols-nextNumCols;
				var topRatio = Math.floor(rowDiff/2)/rowDiff;
				var bottomRatio = Math.ceil(rowDiff/2)/rowDiff;
				var leftRatio = Math.floor(colDiff/2)/colDiff;
				var rightRatio = Math.ceil(colDiff/2)/colDiff;
				NgChm.DET.gl.bufferData(NgChm.DET.gl.ARRAY_BUFFER, new Float32Array([ dendroClassWRatio+animationZoomW*leftRatio, animationZoomH*bottomRatio,
				                                                                      1-animationZoomW*rightRatio, animationZoomH*bottomRatio,
				                                                                      1-animationZoomW*rightRatio, mapHRatio-animationZoomH*topRatio,
				                                                                      dendroClassWRatio+animationZoomW*leftRatio, animationZoomH*bottomRatio,
				                                                                      dendroClassWRatio+animationZoomW*leftRatio, mapHRatio-animationZoomH*topRatio,
				                                                                      1-animationZoomW*rightRatio, mapHRatio-animationZoomH*topRatio ]), NgChm.DET.gl.STATIC_DRAW);
			}
			
			requestAnimationFrame(getAnimate);
			// draw the updated animation map
			NgChm.DET.gl.enableVertexAttribArray(texcoord);
			NgChm.DET.gl.vertexAttribPointer(texcoord, 2, NgChm.DET.gl.FLOAT, false, 0, 0)
			NgChm.DET.gl.drawArrays(NgChm.DET.gl.TRIANGLE_STRIP, 0, NgChm.DET.gl.buffer.numItems);
		} else { // animation stops and actual zoom occurs
			animationZoomW = 0;
			animationZoomH = 0;
			NgChm.DET.gl.clear(NgChm.DET.gl.COLOR_BUFFER_BIT);
			var buffer = NgChm.DET.gl.createBuffer();
			NgChm.DET.gl.buffer = buffer;
			NgChm.DET.gl.bindBuffer(NgChm.DET.gl.ARRAY_BUFFER, buffer);
			var vertices = [ -1, -1, 1, -1, 1, 1, -1, -1, -1, 1, 1, 1 ]; // reset the vertices to show the full detail side
			NgChm.DET.gl.bufferData(NgChm.DET.gl.ARRAY_BUFFER, new Float32Array(vertices), NgChm.DET.gl.STATIC_DRAW);
			var byte_per_vertex = Float32Array.BYTES_PER_ELEMENT;
			var component_per_vertex = 2;
			buffer.numItems = vertices.length / component_per_vertex;
			var stride = component_per_vertex * byte_per_vertex;
			var program = NgChm.DET.gl.program;
			var position = NgChm.DET.gl.getAttribLocation(program, 'position');	 	
			NgChm.DET.gl.enableVertexAttribArray(position);
			NgChm.DET.gl.vertexAttribPointer(position, 2, NgChm.DET.gl.FLOAT, false, stride, 0);

			// Texture coordinates for map.
			var texcoord = NgChm.DET.gl.getAttribLocation(program, "texCoord");
			var texcoordBuffer = NgChm.DET.gl.createBuffer();
			NgChm.DET.gl.bindBuffer(NgChm.DET.gl.ARRAY_BUFFER, texcoordBuffer);
			NgChm.DET.gl.bufferData(NgChm.DET.gl.ARRAY_BUFFER, new Float32Array([ 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1 ]), NgChm.DET.gl.STATIC_DRAW);
			NgChm.DET.gl.enableVertexAttribArray(texcoord);
			NgChm.DET.gl.vertexAttribPointer(texcoord, 2, NgChm.DET.gl.FLOAT, false, 0, 0)
			NgChm.DET.detailDataZoomIn();
			NgChm.DET.animating = false;

		}	
	}
	
};

(function() {
	// Define a function to switch a panel to the detail view.
	// Similar to the corresponding function for switching a pane to the summary view.
	// See additional comments in that function.
	NgChm.DET.switchPaneToDetail = switchPaneToDetail;
	NgChm.Pane.registerPaneContentOption ('Detail heatmap', switchPaneToDetail);

	var savedChmElements = [];
	var firstSwitch = true;

	function switchPaneToDetail (loc) {
		const debug = false;
		if (firstSwitch) {
			// First time detail NGCHM created.
			NgChm.Pane.emptyPaneLocation (loc);
			NgChm.DET.chmElement = document.getElementById('detail_chm');
			loc.pane.appendChild (NgChm.DET.chmElement);
			firstSwitch = false;
		} else {
			if (savedChmElements.length > 0) {
				// Detail NGCHM not currently showing in a pane.
				NgChm.Pane.emptyPaneLocation (loc);
			} else {
				// Detail NGCHM currently showing in a pane.
				const oldLoc = NgChm.Pane.findPaneLocation (NgChm.DET.chmElement);
				if (oldLoc.pane === loc.pane) return;
				if (debug) console.log ({ m: 'Emptying target pane', chmElement: NgChm.DET.chmElement, savedChmElements: savedChmElements.length });
				NgChm.Pane.emptyPaneLocation (loc);
				// Remove from previous location. Will set savedChmElements.
				if (debug) console.log ({ m: 'Emptying old pane', chmElement: NgChm.DET.chmElement, savedChmElements: savedChmElements.length });
				NgChm.Pane.emptyPaneLocation (oldLoc);
			}
			if (debug) console.log ({ m: 'Copying saved elements to target pane', chmElement: NgChm.DET.chmElement, savedChmElements: savedChmElements.length });
			while (savedChmElements.length > 0) {
				const el = savedChmElements.shift();
				if (el.id === 'detail_chm') NgChm.DET.chmElement = el;
				loc.pane.appendChild (el);
			}
			if (debug) console.log ({ m: 'Finished copying to target pane', chmElement: NgChm.DET.chmElement, savedChmElements: savedChmElements.length });
		}
		NgChm.DET.chmElement.style.display = '';
		NgChm.Pane.setPaneTitle (loc, 'Heatmap Detail');
		NgChm.Pane.registerPaneEventHandler (loc.pane, 'empty', emptyDetailPane);
		NgChm.Pane.registerPaneEventHandler (loc.pane, 'resize', resizeDetailPane);
	}

	function emptyDetailPane (pane, elements) {
		savedChmElements = elements;
		NgChm.DET.chmElement = null;
	}

	function resizeDetailPane (loc) {
		NgChm.DET.detailResize();
		NgChm.DET.setDrawDetailTimeout(NgChm.DET.redrawSelectionTimeout, false);
	}
})();
