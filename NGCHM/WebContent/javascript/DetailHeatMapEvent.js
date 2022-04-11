//"use strict";

//Define Namespace for NgChm Events
NgChm.createNS('NgChm.DEV');

NgChm.DEV.targetCanvas = null;

/**********************************************************************************
 * FUNCTION - addEvents: These function adds event listeners to canvases on a
 * given heat map panel.  
 **********************************************************************************/
NgChm.DEV.addEvents = function (paneId) {
	const mapItem = NgChm.DMM.getMapItemFromPane(paneId);
	mapItem.canvas.oncontextmenu = NgChm.DEV.matrixRightClick;
	mapItem.canvas.onmouseup = NgChm.DEV.clickEnd;
	mapItem.canvas.onmousemove = NgChm.DEV.handleMouseMove;
	mapItem.canvas.onmouseout = NgChm.DEV.handleMouseOut;
	
	mapItem.canvas.onmousedown = NgChm.DEV.clickStart;
	mapItem.canvas.ondblclick = NgChm.DEV.dblClick;
	
	mapItem.canvas.addEventListener('wheel', NgChm.DEV.handleScroll, NgChm.UTIL.passiveCompat({capture: false, passive: false}));

	
	mapItem.canvas.addEventListener("touchstart", function(e){
		NgChm.UHM.hlpC();
		const now = new Date().getTime();
		const timesince = now - mapItem.latestTap;
		if((timesince < 600) && (timesince > 0) && e.touches.length == 1){ // double tap
		}else if (e.touches.length == 2){ // two finger tap
		} else if (e.touches.length == 1) { // single finger tap
			mapItem.latestTapLocation = NgChm.UTIL.getCursorPosition(e);
			NgChm.DET.clickStart(e);
		}
		mapItem.latestTap = now;
	}, NgChm.UTIL.passiveCompat({ passive: false }));
	
	mapItem.canvas.addEventListener("touchmove", function(e){
		if (e.touches){
	    	if (e.touches.length > 2){
	    		clearTimeout(NgChm.DET.eventTimer);
	    		return false;
	    	} else if (e.touches.length == 2){
	    		clearTimeout(NgChm.DET.eventTimer);
	    		e.preventDefault();
	    		mapItem.latestTap = null;
	    		const distance = Math.hypot(
	    			    e.touches[0].pageX - e.touches[1].pageX,
	    			    e.touches[0].pageY - e.touches[1].pageY);
	    		const distanceX = Math.abs(e.touches[0].clientX - e.touches[1].clientX);
	    		const distanceY = Math.abs(e.touches[0].clientY - e.touches[1].clientY);
	    		if (!mapItem.latestPinchDistance){
	    			mapItem.latestPinchDistance = distance;
	    		} else if (distance > mapItem.latestPinchDistance){ // pinch inward
	    			NgChm.DEV.detailDataZoomIn(mapItem);
	    		} else if (mapItem.latestPinchDistance > distance){ // pinch outward
	    			NgChm.DEV.detailDataZoomOut(e);
	    		}
	    		mapItem.latestPinchDistance = distance;
	    	} else if (e.touches.length == 1){
	    		clearTimeout(NgChm.DET.eventTimer);
	    		NgChm.DET.mouseDown = true;
	    		NgChm.DET.handleMoveDrag(e);
	    	}
	    }
	}, NgChm.UTIL.passiveCompat({ capture: false, passive: false }));
	
	mapItem.canvas.addEventListener("touchend", function(e){
		if (e.touches.length == 0){
			NgChm.DET.mouseDown = false;
			mapItem.latestPinchDistance = null;
			const now = new Date().getTime();
			if (mapItem.latestTap){
				const timesince = now - mapItem.latestTap;
				const coords = NgChm.UTIL.getCursorPosition(e);
				const diffX = Math.abs(coords.x - mapItem.latestTapLocation.x); 
				const diffY = Math.abs(coords.y - mapItem.latestTapLocation.y);
				const diffMax = Math.max(diffX,diffY);
				if (timesince > 500 && diffMax < 20){
					clearTimeout(NgChm.DET.eventTimer);
					NgChm.UHM.hlpC();
					NgChm.DEV.matrixRightClick(e);
				} else if (timesince < 500 && diffMax < 20){
					NgChm.UHM.userHelpOpen();
				}
			}
	    }
	}, NgChm.UTIL.passiveCompat({ capture: false, passive: false }));
		
	// set up touch events for row and column labels
	const rowLabelDiv = document.getElementById(mapItem.rowLabelDiv);
	const colLabelDiv = document.getElementById(mapItem.colLabelDiv);
	
	rowLabelDiv.addEventListener("touchstart", function(e){
		NgChm.UHM.hlpC();
		const now = new Date().getTime();
		mapItem.latestLabelTap = now;
	}, NgChm.UTIL.passiveCompat({ passive: true }));
		
	rowLabelDiv.addEventListener("touchend", function(e){
		if (e.touches.length == 0){
			const now = new Date().getTime();
			const timesince = now - mapItem.latestLabelTap;
			if (timesince > 500){
				NgChm.DEV.labelRightClick(e);
			}
		}
	}, NgChm.UTIL.passiveCompat({ passive: false }));
	
	colLabelDiv.addEventListener("touchstart", function(e){
		NgChm.UHM.hlpC();
		const now = new Date().getTime();
		mapItem.latestLabelTap = now;
	}, NgChm.UTIL.passiveCompat({ passive: true }));
	
	colLabelDiv.addEventListener("touchend", function(e){
		if (e.touches.length == 0){
			const now = new Date().getTime();
			const timesince = now - mapItem.latestLabelTap;
			if (timesince > 500){
				NgChm.DEV.labelRightClick(e);
			}
		}
	}, NgChm.UTIL.passiveCompat({ passive: false }));	
	
}

/*********************************************************************************************
 * FUNCTION:  handleScroll - The purpose of this function is to handle mouse scroll wheel 
 * events to zoom in / out.
 *********************************************************************************************/
NgChm.DEV.handleScroll = function(evt) {
	evt.preventDefault();
	let parentElement = evt.target.parentElement;
	if (!parentElement.classList.contains('detail_chm')) {
	        if (!NgChm.DMM.primaryMap) return;
		parentElement = NgChm.DMM.primaryMap.chm;
	}
	if (NgChm.SEL.scrollTime == null || evt.timeStamp - NgChm.SEL.scrollTime > 150){
		NgChm.SEL.scrollTime = evt.timeStamp;
		if (evt.wheelDelta < -30 || evt.deltaY > 0 || evt.scale < 1) { //Zoom out
            NgChm.DEV.detailDataZoomOut(parentElement);
		} else if ((evt.wheelDelta > 30 || evt.deltaY < 0 || evt.scale > 1)){ // Zoom in
            NgChm.DEV.zoomAnimation(parentElement);
		}	
	}
	return false;
} 		


/*********************************************************************************************
 * FUNCTION:  keyNavigate - The purpose of this function is to handle a user key press event. 
 * As key presses are received at the document level, their detail processing will be routed to
 * the primary detail panel. 
 *********************************************************************************************/
NgChm.DEV.keyNavigate = function(e) {
	const mapItem = NgChm.DMM.primaryMap;
	NgChm.UHM.hlpC();
    clearTimeout(NgChm.DET.detailPoint);
    if (e.target.type != "text" && e.target.type != "textarea"){
		switch(e.keyCode){ // prevent default added redundantly to each case so that other key inputs won't get ignored
			case 37: // left key 
				if (document.activeElement.id !== "search_text"){
					e.preventDefault();
					if (e.shiftKey){mapItem.currentCol -= mapItem.dataPerRow;} 
					else if (e.ctrlKey){mapItem.currentCol -= 1;mapItem.selectedStart -= 1;mapItem.selectedStop -= 1; NgChm.DEV.callDetailDrawFunction(mapItem.mode);} 
					else {mapItem.currentCol--;}
				}
				break;
			case 38: // up key
				if (document.activeElement.id !== "search_text"){
					e.preventDefault();
					if (e.shiftKey){mapItem.currentRow -= mapItem.dataPerCol;} 
					else if (e.ctrlKey){mapItem.selectedStop += 1; NgChm.DEV.callDetailDrawFunction(mapItem.mode);} 
					else {mapItem.currentRow--;}
				}
				break;
			case 39: // right key
				if (document.activeElement.id !== "search_text"){
					e.preventDefault();
					if (e.shiftKey){mapItem.currentCol += mapItem.dataPerRow;} 
					else if (e.ctrlKey){mapItem.currentCol += 1;mapItem.selectedStart += 1;mapItem.selectedStop += 1; NgChm.DEV.callDetailDrawFunction(mapItem.mode);} 
					else {mapItem.currentCol++;}
				}
				break;
			case 40: // down key
				if (document.activeElement.id !== "search_text"){
					e.preventDefault();
					if (e.shiftKey){mapItem.currentRow += mapItem.dataPerCol;} 
					else if (e.ctrlKey){mapItem.selectedStop -= 1; NgChm.DEV.callDetailDrawFunction(mapItem.mode);} 
					else {mapItem.currentRow++;}
				}
				break;
			case 33: // page up
				e.preventDefault();
				if (e.shiftKey){
					let newMode;
					NgChm.DDR.clearDendroSelection();
					switch(mapItem.mode){
						case "RIBBONV": newMode = 'RIBBONH'; break;
						case "RIBBONH": newMode = 'NORMAL'; break;
						default: newMode = mapItem.mode;break;
					}
					NgChm.DEV.callDetailDrawFunction(newMode);
				} else {
					NgChm.DEV.zoomAnimation(mapItem.chm);
				}
				break;
			case 34: // page down 
				e.preventDefault();
				if (e.shiftKey){
					let newMode;
					NgChm.DDR.clearDendroSelection();
					switch(mapItem.mode){
						case "NORMAL": newMode = 'RIBBONH'; break;
						case "RIBBONH": newMode = 'RIBBONV'; break;
						default: newMode = mapItem.mode;break;
					}
					NgChm.DEV.callDetailDrawFunction(newMode);
				} else {
					NgChm.DEV.detailDataZoomOut(mapItem.chm);
				}
				break;
			case 113: // F2 key 
				if (NgChm.SEL.flickIsOn()) {
					let flickBtn = document.getElementById("flick_btn");
					if (flickBtn.dataset.state === 'flickUp') {
						NgChm.SEL.flickChange("toggle2");
					} else {
						NgChm.SEL.flickChange("toggle1");
					}
				}
				break;
			default:
				return;
		}
		NgChm.SEL.checkRow(mapItem);
		NgChm.SEL.checkCol(mapItem);
	    NgChm.SEL.updateSelection(mapItem);
    } else {
    	if ((document.activeElement.id === "search_text") && (e.keyCode === 13)) {
    		NgChm.SRCH.detailSearch();    		
    	}
    }
	
}

/*********************************************************************************************
 * FUNCTION:  clickStart - The purpose of this function is to handle a user mouse down event.  
 *********************************************************************************************/
NgChm.DEV.clickStart = function (e) {
	e.preventDefault();
	const mapItem = NgChm.DMM.getMapItemFromCanvas(e.currentTarget);
	NgChm.SUM.mouseEventActive = true;
	const clickType = NgChm.UTIL.getClickType(e);
	NgChm.UHM.hlpC();
	if (clickType === 0) { 
		const coords = NgChm.UTIL.getCursorPosition(e);
		mapItem.dragOffsetX = coords.x;  //canvas X coordinate 
		mapItem.dragOffsetY = coords.y;
		NgChm.DET.mouseDown = true;
		// client space
		const divW = e.target.clientWidth;
		const divH = e.target.clientHeight;
		// texture space
		const rowTotalW = mapItem.dataViewWidth + NgChm.DET.calculateTotalClassBarHeight("row");
		const colTotalH = mapItem.dataViewHeight + NgChm.DET.calculateTotalClassBarHeight("column");
		// proportion space
		const rowDendroW = mapItem.dendroWidth/rowTotalW;
		const colDendroH = mapItem.dendroHeight/colTotalH;
		const rowClassW = NgChm.DET.calculateTotalClassBarHeight("row")/rowTotalW;
		const colClassH = NgChm.DET.calculateTotalClassBarHeight("column")/colTotalH;
		const mapW = mapItem.dataViewWidth/rowTotalW;
		const mapH = mapItem.dataViewHeight/colTotalH;
		const clickX = coords.x/divW;
		const clickY = coords.y/divH;
		mapItem.offsetX = coords.x;
		mapItem.offsetY = coords.y;
		mapItem.pageX = e.targetTouches ? e.targetTouches[0].pageX : e.pageX;
		mapItem.pageY = e.targetTouches ? e.targetTouches[0].pageY : e.pageY;
		if (NgChm.DET.eventTimer != 0) {
			clearTimeout(NgChm.DET.eventTimer);
		}
		NgChm.DET.eventTimer = setTimeout(NgChm.UHM.userHelpOpen.bind('mapItem', mapItem), 500);
	}
}

/*********************************************************************************************
 * FUNCTION:  clickEnd - The purpose of this function is to handle a user mouse up event.  
 * If the mouse has not moved out of a given detail row/col between clickStart and clickEnd, 
 * user help is opened for that cell.
 *********************************************************************************************/
NgChm.DEV.clickEnd = function (e) {
	const mapItem = NgChm.DMM.getMapItemFromCanvas(e.currentTarget);
	if (NgChm.SUM.mouseEventActive) {
		const clickType = NgChm.UTIL.getClickType(e);
		if (clickType === 0) {
			//Reset mouse event indicators
			NgChm.DET.mouseDown = false;
			//Set cursor back to default
			mapItem.canvas.style.cursor="default";
		}
	}
	NgChm.SUM.mouseEventActive = false;
}

/*********************************************************************************************
 * FUNCTION:  dblClick -  The purpose of this function is to handle the situation where the 
 * user double-clicks on the detail heat map canvas.  In this case a zoom action is performed.  
 * Zoom in if the shift key is not held down and zoom out if the key is held down.
 *********************************************************************************************/
NgChm.DEV.dblClick = function(e) {
	const mapItem = NgChm.DMM.getMapItemFromCanvas(e.currentTarget);
	//turn off single click help if double click
	clearTimeout(NgChm.DET.eventTimer);
	NgChm.UHM.hlpC();
	//Get cursor position and convert to matrix row / column
	const rowElementSize = mapItem.dataBoxWidth * mapItem.canvas.clientWidth/mapItem.canvas.width; 
	const colElementSize = mapItem.dataBoxHeight * mapItem.canvas.clientHeight/mapItem.canvas.height;
	const coords = NgChm.UTIL.getCursorPosition(e);
	const mapLocY = coords.y - NgChm.DET.getColClassPixelHeight(mapItem);
	const mapLocX = coords.x - NgChm.DET.getRowClassPixelWidth(mapItem);

	const clickRow = Math.floor(mapItem.currentRow + (mapLocY/colElementSize)*NgChm.SEL.getSamplingRatio('row'));
	const clickCol = Math.floor(mapItem.currentCol + (mapLocX/rowElementSize)*NgChm.SEL.getSamplingRatio('col'));
	const destRow = clickRow + 1 - Math.floor(NgChm.SEL.getCurrentDetDataPerCol(mapItem)/2);
	const destCol = clickCol + 1 - Math.floor(NgChm.SEL.getCurrentDetDataPerRow(mapItem)/2);
	
	// set up panning animation 
	const diffRow =  clickRow + 1 - Math.floor(NgChm.SEL.getCurrentDetDataPerCol(mapItem)/2) - mapItem.currentRow;
	const diffCol =  clickCol + 1 - Math.floor(NgChm.SEL.getCurrentDetDataPerRow(mapItem)/2) - mapItem.currentCol;
	const diffMax = Math.max(diffRow,diffCol);
	const numSteps = 7;
	const rowStep = diffRow/numSteps;
	const colStep = diffCol/numSteps;
	let steps = 1;
	//Special case - if in full map view, skip panning and jump to zoom
	if (mapItem.mode == 'FULL_MAP') 
		steps = numSteps;
		
	drawScene();
	function drawScene(now){
		steps++;
		if (steps < numSteps && !(mapItem.currentRow == destRow && mapItem.currentCol == destCol)){ // if we have not finished the animation, continue redrawing
			mapItem.currentRow = clickRow + 1 - Math.floor(NgChm.SEL.getCurrentDetDataPerCol(mapItem)/2 + (numSteps-steps)*rowStep);
			mapItem.currentCol = clickCol + 1 - Math.floor(NgChm.SEL.getCurrentDetDataPerCol(mapItem)/2 + (numSteps-steps)*colStep);
			NgChm.SEL.checkRow(mapItem);
			NgChm.SEL.checkCol(mapItem);
			NgChm.SEL.updateSelection(mapItem);
			requestAnimationFrame(drawScene); // requestAnimationFrame is a native JS function that calls drawScene after a short time delay
		} else { // if we are done animating, zoom in
			mapItem.currentRow = destRow;
			mapItem.currentCol = destCol;
			
			if (e.shiftKey) {
				NgChm.DEV.detailDataZoomOut(e);
			} else {
				NgChm.DEV.zoomAnimation(mapItem.chm, clickRow, clickCol);
			}
			//Center the map on the cursor position
			NgChm.SEL.checkRow(mapItem);
			NgChm.SEL.checkCol(mapItem);
			NgChm.SEL.updateSelection(mapItem);
		}
	}
}

/*********************************************************************************************
 * FUNCTION:  labelClick -  The purpose of this function is to handle a label click on a given
 * detail panel.
 *********************************************************************************************/
NgChm.DEV.labelClick = function (e) {
	const mapItem = NgChm.DMM.getMapItemFromChm(e.target.parentElement.parentElement);
	NgChm.SRCH.showSearchResults();	
	//These were changed from vars defined multiple times below
	let searchIndex = null;
	let axis = this.dataset.axis;
	const index = this.dataset.index;
	if (e.shiftKey || e.type == "touchmove"){ // shift + click
		const selection = window.getSelection();
		selection.removeAllRanges();
		const focusNode = e.type == "touchmove" ? e.target : this;
		const focusIndex = Number(focusNode.dataset.index);
		axis = focusNode.dataset.axis;
		if (NgChm.DET.labelLastClicked[axis]){ // if label in the same axis was clicked last, highlight all
			const anchorIndex = Number(NgChm.DET.labelLastClicked[axis]);
			const startIndex = Math.min(focusIndex,anchorIndex), endIndex = Math.max(focusIndex,anchorIndex);
			NgChm.SRCH.setAxisSearchResults (axis, startIndex, endIndex);
		} else { // otherwise, treat as normal click
			NgChm.SRCH.clearSearchItems(focusNode.dataset.axis);
			searchIndex = NgChm.SRCH.labelIndexInSearch(axis,focusIndex);
			if (searchIndex ){
				NgChm.SRCH.clearAxisSearchItems (axis, index, index);
			} else {
				NgChm.SRCH.setAxisSearchResults (axis, focusIndex, focusIndex);
			}
		}
		NgChm.DET.labelLastClicked[axis] = focusIndex;
	} else if (e.ctrlKey || e.metaKey){ // ctrl or Mac key + click
		searchIndex = NgChm.SRCH.labelIndexInSearch(axis, index);
		if (searchIndex){ // if already searched, remove from search items
			NgChm.SRCH.clearAxisSearchItems (axis, index, index);
		} else {
			NgChm.SRCH.setAxisSearchResults (axis, index, index);
		}
		NgChm.DET.labelLastClicked[axis] = index;
	} else { // standard click
		NgChm.SRCH.clearSearchItems(axis);
		NgChm.SRCH.setAxisSearchResults (axis, index, index);
		NgChm.DET.labelLastClicked[axis] = index;
	}
	const clickType = (e.ctrlKey || e.metaKey) ? 'ctrlClick' : 'standardClick';
	const lastClickedIndex = (typeof index == 'undefined') ? focusIndex : index;
	NgChm.LNK.postSelectionToLinkouts(this.dataset.axis, clickType, index, null);
	const searchElement = document.getElementById('search_text');
	searchElement.value = "";
	document.getElementById('prev_btn').style.display='';
	document.getElementById('next_btn').style.display='';
	document.getElementById('cancel_btn').style.display='';
	NgChm.SUM.clearSelectionMarks();
	NgChm.DET.updateDisplayedLabels();
	NgChm.SEL.updateSelections();
	NgChm.SUM.drawSelectionMarks();
	NgChm.SUM.drawTopItems();
	NgChm.SRCH.showSearchResults();	
}

/*********************************************************************************************
 * FUNCTION:  labelDrag -  The purpose of this function is to handle a label drag on a given
 * detail panel.
 *********************************************************************************************/
NgChm.DEV.labelDrag = function(e){
	const mapItem = NgChm.DMM.getMapItemFromChm(e.target.parentElement.parentElement);
	e.preventDefault();
	mapItem.latestLabelTap = null;
	const selection = window.getSelection();
	selection.removeAllRanges();
	const focusNode = e.type == "touchmove" ? document.elementFromPoint(e.touches[0].pageX, e.touches[0].pageY) : this;
	const focusIndex = Number(focusNode.dataset.index);
	const axis = focusNode.dataset.axis;
	if (NgChm.DET.labelLastClicked[axis]){ // if label in the same axis was clicked last, highlight all
		const anchorIndex = Number(NgChm.DET.labelLastClicked[axis]);
		const startIndex = Math.min(focusIndex,anchorIndex), endIndex = Math.max(focusIndex,anchorIndex);
		NgChm.SRCH.setAxisSearchResults (axis, startIndex, endIndex);
	} else { // otherwise, treat as normal click
		NgChm.SRCH.clearSearchItems(focusNode.dataset.axis);
		const searchIndex = NgChm.SRCH.labelIndexInSearch(axis,focusIndex);
		if (searchIndex ){
			NgChm.SRCH.clearAxisSearchItems (axis, index, index);
		} else {
			NgChm.SRCH.setAxisSearchResults (axis, focusIndex, focusIndex);
		}
	}
	NgChm.DET.labelLastClicked[axis] = focusIndex;
	let searchElement = document.getElementById('search_text');
	searchElement.value = "";
	document.getElementById('prev_btn').style.display='';
	document.getElementById('next_btn').style.display='';
	document.getElementById('cancel_btn').style.display='';
	NgChm.DET.updateDisplayedLabels();
	NgChm.SRCH.showSearchResults();	
	NgChm.SEL.updateSelections();
	NgChm.SUM.drawSelectionMarks();
	NgChm.SUM.drawTopItems();
	NgChm.SRCH.showSearchResults();	
	return;
}

/*********************************************************************************************
 * FUNCTION:  labelRightClick -  The purpose of this function is to handle a label right click on a given
 * detail panel.
 *********************************************************************************************/
NgChm.DEV.labelRightClick = function (e) {
    e.preventDefault();
    const axis = e.target.dataset.axis;
    NgChm.LNK.labelHelpClose(axis);
    NgChm.LNK.labelHelpOpen(axis,e);
    let selection = window.getSelection();
    selection.removeAllRanges();
    return false;
}

/*********************************************************************************************
 * FUNCTION:  matrixRightClick -  The purpose of this function is to handle a matrix right 
 * click on a given detail panel.
 *********************************************************************************************/
NgChm.DEV.matrixRightClick = function (e) {
	e.preventDefault();
	NgChm.LNK.labelHelpClose("Matrix");
    NgChm.LNK.labelHelpOpen("Matrix",e);
    let selection = window.getSelection();
    selection.removeAllRanges();
    return false;
};

/************************************************************************************************
 * FUNCTION: flickChange - Responds to a change in the flick view control.  All of these actions 
 * depend upon the flick control being visible (i.e. active) There are 3 types of changes 
 * (1) User clicks on the toggle control. (2) User changes the value of one of the 2 dropdowns 
 * AND the toggle control is on that dropdown. (3) The user presses the one or two key, corresponding
 * to the 2 dropdowns, AND the current visible data layer is for the opposite dropdown. 
 * If any of the above cases are met, the currentDl is changed and the screen is redrawn.
 ***********************************************************************************************/ 
(function() {
    // Table of flick button images so that Widgetizer only adds one
    // data: URL for each to the widget.
    const toggleButtons = {
	flickUp: 'images/toggleUp.png',
	flickDown: 'images/toggleDown.png'
    };
    NgChm.DEV.flickChange = function(fromList) {
	const mapItem = NgChm.DMM.primaryMap;
	const flickBtn = document.getElementById("flick_btn");
	const flickDrop1 = document.getElementById("flick1");
	const flickDrop2 = document.getElementById("flick2");
	if (typeof fromList === 'undefined') {
		if (flickBtn.dataset.state === 'flickUp') {
			flickBtn.dataset.state = 'flickDown';
			mapItem.currentDl = flickDrop2.value;
		} else {
			flickBtn.dataset.state = 'flickUp';
			mapItem.currentDl = flickDrop1.value;
		}
		flickBtn.setAttribute('src', toggleButtons[flickBtn.dataset.state]);
	} else if (fromList === null) {
		if (flickBtn.dataset.state === 'flickUp') {
			flickBtn.dataset.state = 'flickUp';
			mapItem.currentDl = flickDrop1.value === "" ? 'dl1' : flickDrop1.value;
		} else {
			flickBtn.dataset.state = 'flickDown';
			mapItem.currentDl = flickDrop2.value === "" ? 'dl1' : flickDrop2.value;
		}
		flickBtn.setAttribute('src', toggleButtons[flickBtn.dataset.state]);
	} else {
		if ((fromList === "flick1") && (flickBtn.dataset.state === 'flickUp')) {
			mapItem.currentDl = document.getElementById(fromList).value;
		} else if ((fromList === "flick2") && (flickBtn.dataset.state === 'flickDown')) {
			mapItem.currentDl = document.getElementById(fromList).value;
		} else if ((fromList === "toggle1") && (flickBtn.dataset.state === 'flickDown')) {
			flickBtn.dataset.state = 'flickUp';
			flickBtn.setAttribute('src', toggleButtons[flickBtn.dataset.state]);
			mapItem.currentDl = flickDrop1.value;
		} else if ((fromList === "toggle2") && (flickBtn.dataset.state === 'flickUp')) {
			flickBtn.dataset.state = 'flickDown';
			flickBtn.setAttribute('src', toggleButtons[flickBtn.dataset.state]);
			mapItem.currentDl = flickDrop2.value;
		} else {
			return;
		}
	} 
	NgChm.SEL.setCurrentDL (mapItem.currentDl);
	NgChm.SEL.flickInit();
    NgChm.SUM.buildSummaryTexture();
	NgChm.DMM.DetailMaps.forEach(dm => {
		dm.currentDl = mapItem.currentDl;
	})
	NgChm.DET.setDrawDetailsTimeout(NgChm.DET.redrawSelectionTimeout,true);
	NgChm.SEL.updateSelections(true);
    };
})();

/*********************************************************************************************
 * FUNCTION:  handleMouseOut - The purpose of this function is to handle the situation where 
 * the user clicks on and drags off the detail canvas without letting up the mouse button.  
 * In these cases, we cancel the mouse event that we are tracking, reset mouseDown, and 
 * reset the cursor to default.
 *********************************************************************************************/
NgChm.DEV.handleMouseOut = function (e) {
	const mapItem = NgChm.DMM.getMapItemFromCanvas(e.currentTarget);
	mapItem.canvas.style.cursor="default";
	NgChm.DET.mouseDown = false;
	NgChm.SUM.mouseEventActive = false;
}

/*********************************************************************************************
 * FUNCTION:  handleMouseMove - The purpose of this function is to handle a user drag event.  
 * The type of move (drag-move or drag-select is determined, based upon keys pressed and the 
 * appropriate function is called to perform the function.
 *********************************************************************************************/
NgChm.DEV.handleMouseMove = function (e) {
	const mapItem = NgChm.DMM.getMapItemFromCanvas(e.currentTarget);
    // Do not clear help if the mouse position did not change. Repeated firing of the mousemove event can happen on random 
    // machines in all browsers but FireFox. There are varying reasons for this so we check and exit if need be.
	const eX = e.touches ? e.touches[0].clientX : e.clientX;
	const eY = e.touches ? e.touches[0].clientY : e.clientY;
	if(mapItem.oldMousePos[0] != eX ||mapItem.oldMousePos[1] != eY) {
		mapItem.oldMousePos = [eX, eY];
	} 
	if (NgChm.DET.mouseDown && NgChm.SUM.mouseEventActive){
		clearTimeout(NgChm.DET.eventTimer);
		//If mouse is down and shift key is pressed, perform a drag selection
		//Else perform a drag move
		if (e.shiftKey) {
	        //process select drag only if the mouse is down AND the cursor is on the heat map.
            if((NgChm.DET.mouseDown) && (NgChm.UTIL.isOnObject(e,"map"))) {
			    NgChm.SRCH.clearSearch(e);
			    NgChm.DEV.handleSelectDrag(e);
            }
	    }
	    else {
    		NgChm.DEV.handleMoveDrag(e);
	    }
	} 
 }

/*********************************************************************************************
 * FUNCTION:  handleMoveDrag - The purpose of this function is to handle a user "move drag" 
 * event.  This is when the user clicks and drags across the detail heat map viewport. When 
 * this happens, the current position of the heatmap viewport is changed and the detail heat 
 * map is redrawn 
 *********************************************************************************************/
NgChm.DEV.handleMoveDrag = function (e) {
	const mapItem = NgChm.DMM.getMapItemFromCanvas(e.currentTarget);
    if(!NgChm.DET.mouseDown) return;
    mapItem.canvas.style.cursor="move"; 
    const rowElementSize = mapItem.dataBoxWidth * mapItem.canvas.clientWidth/mapItem.canvas.width;
    const colElementSize = mapItem.dataBoxHeight * mapItem.canvas.clientHeight/mapItem.canvas.height;
    if (e.touches){  //If more than 2 fingers on, don't do anything
    	if (e.touches.length > 1){
    		return false;
    	}
    } 
    const coords = NgChm.UTIL.getCursorPosition(e);
    const xDrag = coords.x - mapItem.dragOffsetX;
    const yDrag = coords.y - mapItem.dragOffsetY;
    if ((Math.abs(xDrag/rowElementSize) > 1) || (Math.abs(yDrag/colElementSize) > 1)) {
    	//Disregard vertical movement if the cursor is not on the heat map.
		if (!NgChm.UTIL.isOnObject(e,"colClass")) {
			mapItem.currentRow = Math.round(mapItem.currentRow - (yDrag/colElementSize));
			mapItem.dragOffsetY = coords.y;
		}
		if (!NgChm.UTIL.isOnObject(e,"rowClass")) {
			mapItem.currentCol = Math.round(mapItem.currentCol - (xDrag/rowElementSize));
			mapItem.dragOffsetX = coords.x;  //canvas X coordinate 
		}
	    NgChm.SEL.checkRow(mapItem);
	    NgChm.SEL.checkCol(mapItem);
	    NgChm.SEL.updateSelection(mapItem);
    } 
}	

/*********************************************************************************************
 * FUNCTION:  handleSelectDrag - The purpose of this function is to handle a user "select drag" 
 * event.  This is when the user clicks, holds down the SHIFT key, and drags across the detail 
 * heat map viewport. Starting and ending row/col positions are calculated and the row/col 
 * search items arrays are populated with those positions (representing selected items on each 
 * axis).  Finally, selection markson the Summary heatmap are drawn and the detail heat map is 
 * re-drawn 
 *********************************************************************************************/
NgChm.DEV.handleSelectDrag = function (e) {
	const mapItem = NgChm.DMM.getMapItemFromCanvas(e.currentTarget);
	mapItem.canvas.style.cursor="crosshair";
	const rowElementSize = mapItem.dataBoxWidth * mapItem.canvas.clientWidth/mapItem.canvas.width;
	const colElementSize = mapItem.dataBoxHeight * mapItem.canvas.clientHeight/mapItem.canvas.height;
    if (e.touches){  //If more than 2 fingers on, don't do anything
    	if (e.touches.length > 1){
    		return false;
    	}
    }
    const coords = NgChm.UTIL.getCursorPosition(e);
    const xDrag = e.touches ? e.touches[0].layerX - mapItem.dragOffsetX : coords.x - mapItem.dragOffsetX;
    const yDrag = e.touches ? e.touches[0].layerY - mapItem.dragOffsetY : coords.y - mapItem.dragOffsetY;
   
    if ((Math.abs(xDrag/rowElementSize) > 1) || (Math.abs(yDrag/colElementSize) > 1)) {
    	//Retrieve drag corners but set to max/min values in case user is dragging
    	//bottom->up or left->right.
    	const endRow = Math.max(NgChm.DEV.getRowFromLayerY(mapItem, coords.y),NgChm.DEV.getRowFromLayerY(mapItem, mapItem.dragOffsetY));
    	const endCol = Math.max(NgChm.DEV.getColFromLayerX(mapItem, coords.x),NgChm.DEV.getColFromLayerX(mapItem, mapItem.dragOffsetX));
    	const startRow = Math.min(NgChm.DEV.getRowFromLayerY(mapItem, coords.y),NgChm.DEV.getRowFromLayerY(mapItem, mapItem.dragOffsetY));
    	const startCol = Math.min(NgChm.DEV.getColFromLayerX(mapItem, coords.x),NgChm.DEV.getColFromLayerX(mapItem, mapItem.dragOffsetX));
	NgChm.SRCH.clearSearch(e);
	NgChm.SRCH.setAxisSearchResults ("Row", startRow, endRow);
	NgChm.SRCH.setAxisSearchResults ("Column", startCol, endCol);
        NgChm.SUM.drawSelectionMarks();
        NgChm.SUM.drawTopItems();
        NgChm.DET.updateDisplayedLabels();
        NgChm.DET.drawSelections();
        NgChm.SRCH.updateLinkoutSelections();
        NgChm.UTIL.redrawCanvases();
    }
}	

/*********************************************************************************************
 * FUNCTIONS:  getRowFromLayerY AND getColFromLayerX -  The purpose of this function is to 
 * retrieve the row/col in the data matrix that matched a given mouse location.  They utilize 
 * event.layerY/X for the mouse position.
 *********************************************************************************************/
NgChm.DEV.getRowFromLayerY = function (mapItem,layerY) {
	const colElementSize = mapItem.dataBoxHeight * mapItem.canvas.clientHeight/mapItem.canvas.height;
	const colClassHeightPx = NgChm.DET.getColClassPixelHeight(mapItem);
	const mapLocY = layerY - colClassHeightPx;
	return Math.floor(mapItem.currentRow + (mapLocY/colElementSize)*NgChm.SEL.getSamplingRatio(mapItem.mode,'row'));
}

NgChm.DEV.getColFromLayerX = function (mapItem,layerX) {
	const rowElementSize = mapItem.dataBoxWidth * mapItem.canvas.clientWidth/mapItem.canvas.width; // px/Glpoint
	const rowClassWidthPx = NgChm.DET.getRowClassPixelWidth(mapItem);
	const mapLocX = layerX - rowClassWidthPx;
	return Math.floor(mapItem.currentCol + (mapLocX/rowElementSize)*NgChm.SEL.getSamplingRatio(mapItem.mode,'col'));
}



/**********************************************************************************
 * FUNCTION - detailDataZoomIn: The purpose of this function is to handle all of
 * the processing necessary to zoom inwards on a given heat map panel.
 *
 * Zooming out may change the user-selected mode from normal mode, to a ribbon mode,
 * eventually to full map mode.  To enable the user-selected mode to be restored on
 * zoom in, each zoom out pushes the zoom mode onto a stack which is used here to
 * determine if we should undo the automatic changes in zoom mode.  Explicit user
 * changes to the zoom mode will clear the mode history.
 **********************************************************************************/
NgChm.DEV.detailDataZoomIn = function (mapItem) {
	NgChm.UHM.hlpC();	
	NgChm.LNK.labelHelpCloseAll();
	if (!mapItem.modeHistory) mapItem.modeHistory = [];
	if (mapItem.mode == 'FULL_MAP') {
	        let mode = mapItem.mode, row=1, col=1;
		if (mapItem.modeHistory.length > 0) {
		        ({ mode, row, col } = mapItem.modeHistory[mapItem.modeHistory.length-1]);
		}
		if ((mode == 'RIBBONH') || (mode == 'RIBBONH_DETAIL')) {
			mapItem.currentRow = row;
			NgChm.DEV.detailHRibbonButton(mapItem);
		} else if  ((mode == 'RIBBONV') || (mode == 'RIBBONV_DETAIL')) {
			mapItem.currentCol = col;
			NgChm.DEV.detailVRibbonButton(mapItem);
		} else {
			mapItem.saveRow = row;
			mapItem.saveCol = col;
			NgChm.DEV.detailNormal(mapItem);
		}
		mapItem.modeHistory.pop();
	} else if (mapItem.mode == 'NORMAL') {
		if (mapItem.modeHistory.length > 0) {
		        mapItem.modeHistory = [];
		}
		let current = NgChm.DET.zoomBoxSizes.indexOf(mapItem.dataBoxWidth);
		if (current < NgChm.DET.zoomBoxSizes.length - 1) {
			let zoomBoxSize = NgChm.DET.zoomBoxSizes[current+1];
			NgChm.DET.setDetailDataSize (mapItem, zoomBoxSize);
		}
		NgChm.SEL.updateSelection(mapItem, false);
	} else if ((mapItem.mode == 'RIBBONH') || (mapItem.mode == 'RIBBONH_DETAIL')) {
	        let mode = mapItem.mode, col;
		if (mapItem.modeHistory.length > 0) {
		    ({ mode, col } = mapItem.modeHistory[mapItem.modeHistory.length-1]);
		    if (mode == 'NORMAL') {
		        mapItem.saveCol = col;
		    }
		}
		if (mode == 'NORMAL') {
			NgChm.DEV.detailNormal (mapItem);
		} else {
			let current = NgChm.DET.zoomBoxSizes.indexOf(mapItem.dataBoxHeight);
			if (current < NgChm.DET.zoomBoxSizes.length - 1) {
				NgChm.DET.setDetailDataHeight (mapItem,NgChm.DET.zoomBoxSizes[current+1]);
			}
			NgChm.SEL.updateSelection(mapItem, false);
		}
		mapItem.modeHistory.pop();
	} else if ((mapItem.mode == 'RIBBONV') || (mapItem.mode == 'RIBBONV_DETAIL')) {
	        let mode = mapItem.mode, row;
		if (mapItem.modeHistory.length > 0) {
		    ({ mode, row } = mapItem.modeHistory[mapItem.modeHistory.length-1]);
		    if (mode == 'NORMAL') {
		        mapItem.saveRow = row;
		    }
		}
		if (mode == 'NORMAL') {
			NgChm.DEV.detailNormal (mapItem);
		} else {
			let current = NgChm.DET.zoomBoxSizes.indexOf(mapItem.dataBoxWidth);
			if (current < NgChm.DET.zoomBoxSizes.length - 1) {
				NgChm.DET.setDetailDataWidth(mapItem,NgChm.DET.zoomBoxSizes[current+1]);
			}
			NgChm.SEL.updateSelection(mapItem, false);
		}
		mapItem.modeHistory.pop();
	}
};

/**********************************************************************************
 * FUNCTION - detailDataZoomOut: The purpose of this function is to handle all of
 * the processing necessary to zoom outwards on a given heat map panel.
 **********************************************************************************/
NgChm.DEV.detailDataZoomOut = function (chm) {
	const mapItem = NgChm.DMM.getMapItemFromChm(chm);
	if (mapItem.mode == 'FULL_MAP') {
	    // Already in full map view. We actually can't zoom out any further.
	    return;
	}
	NgChm.UHM.hlpC();	
	NgChm.LNK.labelHelpCloseAll();
	if (!mapItem.modeHistory) mapItem.modeHistory = [];
	mapItem.modeHistory.push ({ mode: mapItem.mode, row: mapItem.currentRow, col: mapItem.currentCol });
	if (mapItem.mode == 'NORMAL') {
		const current = NgChm.DET.zoomBoxSizes.indexOf(mapItem.dataBoxWidth);
		if ((current > 0) &&
		    (Math.floor((mapItem.dataViewHeight-NgChm.DET.dataViewBorder)/NgChm.DET.zoomBoxSizes[current-1]) <= NgChm.heatMap.getNumRows(NgChm.MMGR.DETAIL_LEVEL)) &&
		    (Math.floor((mapItem.dataViewWidth-NgChm.DET.dataViewBorder)/NgChm.DET.zoomBoxSizes[current-1]) <= NgChm.heatMap.getNumColumns(NgChm.MMGR.DETAIL_LEVEL))){
			NgChm.DET.setDetailDataSize (mapItem,NgChm.DET.zoomBoxSizes[current-1]);
			NgChm.SEL.updateSelection(mapItem);
		} else {
			//If we can't zoom out anymore see if ribbon mode would show more of the map or , switch to full map view.
			if ((current > 0) && (NgChm.heatMap.getNumRows(NgChm.MMGR.DETAIL_LEVEL) <= NgChm.heatMap.getNumColumns(NgChm.MMGR.DETAIL_LEVEL)) ) {
				NgChm.DEV.detailVRibbonButton(mapItem);
			} else if ((current > 0) && (NgChm.heatMap.getNumRows(NgChm.MMGR.DETAIL_LEVEL) > NgChm.heatMap.getNumColumns(NgChm.MMGR.DETAIL_LEVEL)) ) {
				NgChm.DEV.detailHRibbonButton(mapItem);
			} else {
				NgChm.DEV.detailFullMap(mapItem);
			}	
		}	
	} else if ((mapItem.mode == 'RIBBONH') || (mapItem.mode == 'RIBBONH_DETAIL')) {
		const current = NgChm.DET.zoomBoxSizes.indexOf(mapItem.dataBoxHeight);
		if ((current > 0) &&
		    (Math.floor((mapItem.dataViewHeight-NgChm.DET.dataViewBorder)/NgChm.DET.zoomBoxSizes[current-1]) <= NgChm.heatMap.getNumRows(NgChm.MMGR.DETAIL_LEVEL))) {
			// Additional zoom out in ribbon mode.
			NgChm.DET.setDetailDataHeight (mapItem,NgChm.DET.zoomBoxSizes[current-1]);
			NgChm.SEL.updateSelection(mapItem);
		} else {
			// Switch to full map view.
			NgChm.DEV.detailFullMap(mapItem);
		}	
	} else if ((mapItem.mode == 'RIBBONV') || (mapItem.mode == 'RIBBONV_DETAIL')) {
		const current = NgChm.DET.zoomBoxSizes.indexOf(mapItem.dataBoxWidth);
		if ((current > 0) &&
		    (Math.floor((mapItem.dataViewWidth-NgChm.DET.dataViewBorder)/NgChm.DET.zoomBoxSizes[current-1]) <= NgChm.heatMap.getNumColumns(NgChm.MMGR.DETAIL_LEVEL))){
			// Additional zoom out in ribbon mode.
			NgChm.DET.setDetailDataWidth (mapItem,NgChm.DET.zoomBoxSizes[current-1]);
			NgChm.SEL.updateSelection(mapItem);
		} else {
			// Switch to full map view.
			NgChm.DEV.detailFullMap(mapItem);
		}	
        } else {
	    console.error ('Unknown zoom mode ', mapItem.mode);
	}
};

/**********************************************************************************
 * FUNCTION - callDetailDrawFunction: The purpose of this function is to respond to
 * mode changes on the Summary Panel by calling the appropriate detail drawing
 * function. It acts only on the Primary heat map pane.
 **********************************************************************************/
NgChm.DEV.callDetailDrawFunction = function(modeVal, target) { 
	let mapItem = (typeof target !== 'undefined') ? target : NgChm.DMM.primaryMap;
	if (!mapItem) return;
	if (modeVal == 'RIBBONH' || modeVal == 'RIBBONH_DETAIL')
		NgChm.DEV.detailHRibbon(mapItem);
	if (modeVal == 'RIBBONV' || modeVal == 'RIBBONV_DETAIL')
		NgChm.DEV.detailVRibbon(mapItem);
	if (modeVal == 'FULL_MAP')
		NgChm.DEV.detailFullMap(mapItem);
	if (modeVal == 'NORMAL') {
		NgChm.DEV.detailNormal(mapItem);	
	}
}

/***********************************************************************************
 * FUNCTION - clearModeHistory: Clears mode history.  Should be done every time the
 * user explicitly changes the zoom mode.
 ***********************************************************************************/
NgChm.DEV.clearModeHistory = function (mapItem) {
	mapItem.modeHistory = [];
};

/**********************************************************************************
 * FUNCTION - detailNormal: The purpose of this function is to handle all of
 * the processing necessary to return a heat map panel to normal mode.
 * mapItem is the detail view map item.
 **********************************************************************************/
NgChm.DEV.detailNormal = function (mapItem, restoreInfo) {
	NgChm.UHM.hlpC();	
	const previousMode = mapItem.mode;
	NgChm.SEL.setMode(mapItem,'NORMAL');
	NgChm.DET.setButtons(mapItem);
	if (!restoreInfo) {
	    mapItem.dataViewHeight = NgChm.DET.SIZE_NORMAL_MODE;
	    mapItem.dataViewWidth = NgChm.DET.SIZE_NORMAL_MODE;
	    if ((previousMode=='RIBBONV') || (previousMode=='RIBBONV_DETAIL')) {
		NgChm.DET.setDetailDataSize(mapItem, mapItem.dataBoxWidth);
	    } else if ((previousMode=='RIBBONH') || (previousMode=='RIBBONH_DETAIL')) {
		NgChm.DET.setDetailDataSize(mapItem,mapItem.dataBoxHeight);
	    } else if (previousMode=='FULL_MAP') {
		NgChm.DET.setDetailDataSize(mapItem,NgChm.DET.zoomBoxSizes[0]);
	    }

	    //On some maps, one view (e.g. ribbon view) can show bigger data areas than will fit for other view modes.  If so, zoom back out to find a workable zoom level.
	    while ((Math.floor((mapItem.dataViewHeight-NgChm.DET.dataViewBorder)/NgChm.DET.zoomBoxSizes[NgChm.DET.zoomBoxSizes.indexOf(mapItem.dataBoxHeight)]) > NgChm.heatMap.getNumRows(NgChm.MMGR.DETAIL_LEVEL)) ||
	       (Math.floor((mapItem.dataViewWidth-NgChm.DET.dataViewBorder)/NgChm.DET.zoomBoxSizes[NgChm.DET.zoomBoxSizes.indexOf(mapItem.dataBoxWidth)]) > NgChm.heatMap.getNumColumns(NgChm.MMGR.DETAIL_LEVEL))) {
		NgChm.DET.setDetailDataSize(mapItem, NgChm.DET.zoomBoxSizes[NgChm.DET.zoomBoxSizes.indexOf(mapItem.dataBoxWidth)+1]);
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
	
	NgChm.SEL.checkRow(mapItem);
	NgChm.SEL.checkCol(mapItem);
	mapItem.canvas.width =  (mapItem.dataViewWidth + NgChm.DET.calculateTotalClassBarHeight("row"));
	mapItem.canvas.height = (mapItem.dataViewHeight + NgChm.DET.calculateTotalClassBarHeight("column"));
	 
	NgChm.DET.detInitGl(mapItem);
	NgChm.DDR.clearDendroSelection();
	NgChm.SEL.updateSelection(mapItem);
	document.getElementById("viewport").setAttribute("content", "height=device-height");
	document.getElementById("viewport").setAttribute("content", "");
}

/**********************************************************************************
 * FUNCTION - detailFullMap: The purpose of this function is to show the whole map 
 * in the detail pane. Processes ribbon h/v differently. In these cases, one axis 
 * is kept static so that the "full view" stays within the selected sub-dendro.
 **********************************************************************************/
NgChm.DEV.detailFullMap = function (mapItem) {
	NgChm.UHM.hlpC();	
	mapItem.saveRow = mapItem.currentRow;
	mapItem.saveCol = mapItem.currentCol;
	
	//For maps that have less rows/columns than the size of the detail panel, matrix elements get height / width more 
	//than 1 pixel, scale calculates the appropriate height/width.
	if (NgChm.DDR.subDendroView === 'column') {
	    NgChm.DET.scaleViewHeight(mapItem);
	} else if (NgChm.DDR.subDendroView === 'row') {
	    NgChm.DET.scaleViewWidth(mapItem);
	} else {
	    NgChm.SEL.setMode(mapItem, 'FULL_MAP');
	    NgChm.DET.scaleViewHeight(mapItem);
	    NgChm.DET.scaleViewWidth(mapItem);
	}

	//Canvas is adjusted to fit the number of rows/columns and matrix height/width of each element.
  	mapItem.canvas.width =  (mapItem.dataViewWidth + NgChm.DET.calculateTotalClassBarHeight("row"));
  	mapItem.canvas.height = (mapItem.dataViewHeight + NgChm.DET.calculateTotalClassBarHeight("column"));
	NgChm.DET.detInitGl(mapItem);
	NgChm.SEL.updateSelection(mapItem);	
}

/**********************************************************************************
 * FUNCTION - detailHRibbonButton: The purpose of this function is to clear dendro
 * selections and call processing to change to Horizontal Ribbon Mode.
 **********************************************************************************/
NgChm.DEV.detailHRibbonButton = function (mapItem) {
	NgChm.DDR.clearDendroSelection(mapItem);
	NgChm.DEV.detailHRibbon(mapItem);
}

/**********************************************************************************
 * FUNCTION - detailHRibbon: The purpose of this function is to change the view for
 * a given heat map panel to horizontal ribbon view.  Note there is a standard full 
 * ribbon view and also a sub-selection ribbon view if the user clicks on the dendrogram.  
 * If a dendrogram selection is in effect, then selectedStart and selectedStop will be set.
 **********************************************************************************/
NgChm.DEV.detailHRibbon = function (mapItem, restoreInfo) {
	NgChm.UHM.hlpC();	
	const previousMode = mapItem.mode;
	const prevWidth = mapItem.dataBoxWidth;
	mapItem.saveCol = mapItem.currentCol;
	NgChm.SEL.setMode(mapItem,'RIBBONH');
	NgChm.DET.setButtons(mapItem);

	if (!restoreInfo) {
	    if (previousMode=='FULL_MAP') {
		NgChm.DET.setDetailDataHeight(mapItem, NgChm.DET.zoomBoxSizes[0]);
	    }
	    // If normal (full) ribbon, set the width of the detail display to the size of the horizontal ribbon view
	    // and data size to 1.
	    if (mapItem.selectedStart == null || mapItem.selectedStart == 0) {
		mapItem.dataViewWidth = NgChm.heatMap.getNumColumns(NgChm.MMGR.RIBBON_HOR_LEVEL) + NgChm.DET.dataViewBorder;
		let ddw = 1;
		while(2*mapItem.dataViewWidth < 500){ // make the width wider to prevent blurry/big dendros for smaller maps
			ddw *=2;
			mapItem.dataViewWidth = ddw*NgChm.heatMap.getNumColumns(NgChm.MMGR.RIBBON_HOR_LEVEL) + NgChm.DET.dataViewBorder;
		}
		NgChm.DET.setDetailDataWidth(mapItem,ddw);
		mapItem.currentCol = 1;
	    } else {
		mapItem.saveCol = mapItem.selectedStart;
		let selectionSize = mapItem.selectedStop - mapItem.selectedStart + 1;
		NgChm.DEV.clearModeHistory (mapItem);
		mapItem.mode='RIBBONH_DETAIL'
		const width = Math.max(1, Math.floor(500/selectionSize));
		mapItem.dataViewWidth = (selectionSize * width) + NgChm.DET.dataViewBorder;
		NgChm.DET.setDetailDataWidth(mapItem,width);	
		mapItem.currentCol = mapItem.selectedStart;
	    }
	
	    mapItem.dataViewHeight = NgChm.DET.SIZE_NORMAL_MODE;
	    if ((previousMode=='RIBBONV') || (previousMode == 'RIBBONV_DETAIL') || (previousMode == 'FULL_MAP')) {
		if (previousMode == 'FULL_MAP') {
		    NgChm.DET.setDetailDataHeight(mapItem,NgChm.DET.zoomBoxSizes[0]);
		} else {
		    NgChm.DET.setDetailDataHeight(mapItem,prevWidth);
		}
		mapItem.currentRow = mapItem.saveRow;
	    }

	    //On some maps, one view (e.g. ribbon view) can show bigger data areas than will fit for other view modes.  If so, zoom back out to find a workable zoom level.
	    while (Math.floor((mapItem.dataViewHeight-NgChm.DET.dataViewBorder)/NgChm.DET.zoomBoxSizes[NgChm.DET.zoomBoxSizes.indexOf(mapItem.dataBoxHeight)]) > NgChm.heatMap.getNumRows(NgChm.MMGR.DETAIL_LEVEL)) {
		NgChm.DET.setDetailDataHeight(mapItem,NgChm.DET.zoomBoxSizes[NgChm.DET.zoomBoxSizes.indexOf(mapItem.dataBoxHeight)+1]);
	    }
	}

	mapItem.canvas.width =  (mapItem.dataViewWidth + NgChm.DET.calculateTotalClassBarHeight("row"));
	mapItem.canvas.height = (mapItem.dataViewHeight + NgChm.DET.calculateTotalClassBarHeight("column"));
	NgChm.DET.detInitGl(mapItem);
	NgChm.SEL.updateSelection(mapItem);
}

/**********************************************************************************
 * FUNCTION - detailVRibbonButton: The purpose of this function is to clear dendro
 * selections and call processing to change to Vertical Ribbon Mode.
 **********************************************************************************/
NgChm.DEV.detailVRibbonButton = function (mapItem) {
	NgChm.DDR.clearDendroSelection(mapItem);
	NgChm.DEV.detailVRibbon(mapItem);
}

/**********************************************************************************
 * FUNCTION - detailVRibbon: The purpose of this function is to change the view for
 * a given heat map panel to vertical ribbon view.  Note there is a standard full 
 * ribbon view and also a sub-selection ribbon view if the user clicks on the dendrogram.  
 * If a dendrogram selection is in effect, then selectedStart and selectedStop will be set.
 **********************************************************************************/
NgChm.DEV.detailVRibbon = function (mapItem, restoreInfo) {
	NgChm.UHM.hlpC();	
	const previousMode = mapItem.mode;
	const prevHeight = mapItem.dataBoxHeight;
	mapItem.saveRow = mapItem.currentRow;
	
	NgChm.SEL.setMode(mapItem, 'RIBBONV');
	NgChm.DET.setButtons(mapItem);

	// If normal (full) ribbon, set the width of the detail display to the size of the horizontal ribbon view
	// and data size to 1.
	if (mapItem.selectedStart == null || mapItem.selectedStart == 0) {
		mapItem.dataViewHeight = NgChm.heatMap.getNumRows(NgChm.MMGR.RIBBON_VERT_LEVEL) + NgChm.DET.dataViewBorder;
		let ddh = 1;
		while(2*mapItem.dataViewHeight < 500){ // make the height taller to prevent blurry/big dendros for smaller maps
			ddh *=2;
			mapItem.dataViewHeight = ddh*NgChm.heatMap.getNumRows(NgChm.MMGR.RIBBON_VERT_LEVEL) + NgChm.DET.dataViewBorder;
		}
		NgChm.DET.setDetailDataHeight(mapItem,ddh);
		mapItem.currentRow = 1;
	} else {
		mapItem.saveRow = mapItem.selectedStart;
		let selectionSize = mapItem.selectedStop - mapItem.selectedStart + 1;
		if (selectionSize < 500) {
			NgChm.DEV.clearModeHistory (mapItem);
			NgChm.SEL.setMode(mapItem, 'RIBBONV_DETAIL');
		} else {
			const rvRate = NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.RIBBON_VERT_LEVEL);
			selectionSize = Math.floor(selectionSize / rvRate);			
		}
		const height = Math.max(1, Math.floor(500/selectionSize));
		mapItem.dataViewHeight = (selectionSize * height) + NgChm.DET.dataViewBorder;
		NgChm.DET.setDetailDataHeight(mapItem, height);
		mapItem.currentRow = mapItem.selectedStart;
	}
	
	if (!restoreInfo) {
	    mapItem.dataViewWidth = NgChm.DET.SIZE_NORMAL_MODE;
	    if ((previousMode=='RIBBONH') || (previousMode=='RIBBONH_DETAIL') || (previousMode == 'FULL_MAP')) {
		if (previousMode == 'FULL_MAP') {
			NgChm.DET.setDetailDataWidth(mapItem, NgChm.DET.zoomBoxSizes[0]);
		} else {
			NgChm.DET.setDetailDataWidth(mapItem, prevHeight);
		}
		mapItem.currentCol = mapItem.saveCol;
	    }
	
	    //On some maps, one view (e.g. ribbon view) can show bigger data areas than will fit for other view modes.  If so, zoom back out to find a workable zoom level.
	    while (Math.floor((mapItem.dataViewWidth-NgChm.DET.dataViewBorder)/NgChm.DET.zoomBoxSizes[NgChm.DET.zoomBoxSizes.indexOf(mapItem.dataBoxWidth)]) > NgChm.heatMap.getNumColumns(NgChm.MMGR.DETAIL_LEVEL)) {
		NgChm.DET.setDetailDataWidth(mapItem,NgChm.DET.zoomBoxSizes[NgChm.DET.zoomBoxSizes.indexOf(mapItem.dataBoxWidth)+1]);
	    }
	}

	mapItem.canvas.width =  (mapItem.dataViewWidth + NgChm.DET.calculateTotalClassBarHeight("row"));
	mapItem.canvas.height = (mapItem.dataViewHeight + NgChm.DET.calculateTotalClassBarHeight("column"));
	NgChm.DET.detInitGl(mapItem);
	NgChm.SEL.updateSelection(mapItem);
	document.getElementById("viewport").setAttribute("content", "height=device-height");
	document.getElementById("viewport").setAttribute("content", "");
}

/**********************************************************************************
 * FUNCTION - zoomAnimation: The purpose of this function is to perform a zoom 
 * animation when users are zooming out on a given heat map canvas.
 **********************************************************************************/
NgChm.DEV.zoomAnimation = function (chm,destRow,destCol) {
	const mapItem = NgChm.DMM.getMapItemFromChm(chm);
	// set proportion variables for heatmap canvas
	const detViewW = mapItem.dataViewWidth;
	const detViewH = mapItem.dataViewHeight;
	const classBarW = NgChm.DET.calculateTotalClassBarHeight("row");
	const classBarH = NgChm.DET.calculateTotalClassBarHeight("column");
	const dendroW = mapItem.dendroWidth;
	const dendroH = mapItem.dendroHeight;
	const rowTotalW = detViewW + classBarW;
	const colTotalH = detViewH + classBarH;
	const mapWRatio = detViewW / rowTotalW;
	const mapHRatio = detViewH / colTotalH;
	const dendroClassWRatio = 1 - mapWRatio;
	const dendroClassHRatio = 1 - mapHRatio;
	
	const currentWIndex = NgChm.DET.zoomBoxSizes.indexOf(mapItem.dataBoxWidth);
	const currentHIndex = NgChm.DET.zoomBoxSizes.indexOf(mapItem.dataBoxHeight);
	const currentW = mapItem.dataBoxWidth;
	const currentH = mapItem.dataBoxHeight;
	const nextW = NgChm.DET.zoomBoxSizes[currentWIndex+1];
	const nextH = NgChm.DET.zoomBoxSizes[currentHIndex+1];
	const currentNumCols = (detViewW-2)/currentW;
	const currentNumRows = (detViewH-2)/currentH;
	
	const nextNumCols = (detViewW-2)/nextW;
	const nextNumRows = (detViewH-2)/nextH;
	
	// this is the percentage to zoom in by
	const zoomRatioW = (1-(nextNumCols/currentNumCols))*mapWRatio;
	const zoomRatioH = (1-(nextNumRows/currentNumRows))*mapHRatio; 
	
	// set proportion variables for box canvas
	const boxCtx = mapItem.boxCanvas.getContext("2d");
	const boxW = boxCtx.canvas.width;
	const boxH = boxCtx.canvas.height;
	
	
	// if we can't go in any further, don't proceed
	if ((mapItem.mode !== "RIBBONH" && nextW == undefined) || (mapItem.mode !== "RIBBONV" && nextH == undefined) || NgChm.DET.animating == true){
		return;
	}
	boxCtx.clearRect(0, 0, boxCtx.canvas.width, boxCtx.canvas.height);
	let animationZoomW = 0;
	let animationZoomH = 0;
	let animateCount = 0;
	let animateCountMax = 10;
	
	animate(mapItem,destRow,destCol);
	function getAnimate(){
		animate(mapItem,destRow,destCol);
	}
	function animate(mapItem,destRow,destCol){
		NgChm.DET.animating = true;

		NgChm.DET.detInitGl (mapItem);
		// create new buffer to draw over the current map

		if (animateCount < animateCountMax) { // do we keep animating?
			animateCount++;
			if (!mapItem.mode.includes("RIBBONH")){
				animationZoomW += zoomRatioW/animateCountMax;
			}
			if (!mapItem.mode.includes("RIBBONV")){
				animationZoomH += zoomRatioH/animateCountMax;
			}
			let texBottom, texLeft, texTop, texRight;;
			if (mapItem.mode == "FULL_MAP"){
				let saveRow = mapItem.saveRow;
				let saveCol = mapItem.saveCol;
				if (destRow && destCol){
					saveRow = destRow*NgChm.heatMap.getRowSummaryRatio("s");
					saveCol = destCol*NgChm.heatMap.getColSummaryRatio("s");
				}
				let detWidth = NgChm.DET.SIZE_NORMAL_MODE-NgChm.DET.paddingHeight;
				let detHeight = NgChm.DET.SIZE_NORMAL_MODE-NgChm.DET.paddingHeight;
				if ((NgChm.DET.SIZE_NORMAL_MODE-NgChm.DET.paddingHeight) > NgChm.heatMap.getNumRows("d")){
					for (let i = 0; i<NgChm.DET.zoomBoxSizes.length; i++){
						if ((NgChm.DET.SIZE_NORMAL_MODE-NgChm.DET.paddingHeight)/NgChm.DET.zoomBoxSizes[i] < NgChm.heatMap.getNumRows("d")){
							detHeight = (NgChm.DET.SIZE_NORMAL_MODE-NgChm.DET.paddingHeight)/NgChm.DET.zoomBoxSizes[i];
							break;
						}
					}
				}
				
				if ((NgChm.DET.SIZE_NORMAL_MODE-NgChm.DET.paddingHeight) > NgChm.heatMap.getNumColumns("d")){
					for (let i = 0;i< NgChm.DET.zoomBoxSizes.length; i++){
						if ((NgChm.DET.SIZE_NORMAL_MODE-NgChm.DET.paddingHeight)/NgChm.DET.zoomBoxSizes[i] < NgChm.heatMap.getNumColumns("d")){
							detWidth = (NgChm.DET.SIZE_NORMAL_MODE-NgChm.DET.paddingHeight)/NgChm.DET.zoomBoxSizes[i];
							break;
						}
					}
				}
				
				const detNum = Math.min(detWidth,detHeight);
				if (destRow && destCol){
					saveRow = Math.max(1,saveRow-detNum/2);
					saveCol = Math.max(1,saveCol-detNum/2);
					mapItem.saveRow = saveRow;
					mapItem.saveCol = saveCol;
				}
								
				//TODO: do we need to account for summary ratio???
				const leftRatio=(saveCol-1)*mapWRatio /mapItem.dataPerRow /animateCountMax/NgChm.heatMap.getColSummaryRatio("d");
				const rightRatio=Math.max(0,(NgChm.SEL.getCurrentDetDataPerRow(mapItem)*NgChm.heatMap.getColSummaryRatio("d")-saveCol-1-detNum)*mapWRatio /NgChm.SEL.getCurrentDetDataPerRow(mapItem) /animateCountMax/NgChm.heatMap.getColSummaryRatio("d")); // this one works for maps that are not too big!!
				const topRatio = (saveRow-1)*mapHRatio /mapItem.dataPerCol /animateCountMax/NgChm.heatMap.getRowSummaryRatio("d");
				const bottomRatio = Math.max(0,(NgChm.SEL.getCurrentDetDataPerCol(mapItem)*NgChm.heatMap.getRowSummaryRatio("d")-saveRow-1-detNum)*mapHRatio   /NgChm.SEL.getCurrentDetDataPerCol(mapItem) /animateCountMax/NgChm.heatMap.getRowSummaryRatio("d")); // this one works for maps that are not too big!
				
				texLeft = dendroClassWRatio+animateCount*leftRatio;
			        texBottom = animateCount*bottomRatio;
			        texRight = 1-animateCount*rightRatio;
			        texTop = mapHRatio-animateCount*topRatio;
			} else if ((currentNumRows-nextNumRows)%2 == 0){ // an even number of data points are going out of view
				// we zoom the same amount from the top/left as the bottom/right
				// (0,0) is the bottom left corner, (1,1) is the top right
				texLeft = dendroClassWRatio+animationZoomW/2;
			        texBottom = animationZoomH/2;
			        texRight = 1-animationZoomW/2;
			        texTop = mapHRatio-animationZoomH/2;
			} else { // an odd number of data points are going out of view (ie: if the difference in points shown is 9, move 4 from the top/left, move 5 from the bottom/right)
				// we zoom one less point on the top/left than we do the bottom/right
				const rowDiff = currentNumRows-nextNumRows;
				const colDiff = currentNumCols-nextNumCols;
				const topRatio = Math.floor(rowDiff/2)/rowDiff;
				const bottomRatio = Math.ceil(rowDiff/2)/rowDiff;
				const leftRatio = Math.floor(colDiff/2)/colDiff;
				const rightRatio = Math.ceil(colDiff/2)/colDiff;
				texLeft = dendroClassWRatio+animationZoomW*leftRatio;
			        texBottom = animationZoomH*bottomRatio;
			        texRight = 1-animationZoomW*rightRatio;
			        texTop = mapHRatio-animationZoomH*topRatio;
			}
			
			requestAnimationFrame(getAnimate);
			// draw the updated animation map
			if (mapItem.glManager.OK) {
				// Set the clip region to just the matrix area.
				// (-1,-1 is the bottom left corner of the detail canvas, (1,1) is the top right corner
			        const right = 1;
				const bottom = -1;
			        const left = -1 + 2 * dendroClassWRatio;
			        const top = 1 - 2 * dendroClassHRatio;
				mapItem.glManager.setClipRegion (NgChm.DRAW.GL.rectToTriangles(bottom,left,top,right));
				mapItem.glManager.setTextureRegion (NgChm.DRAW.GL.rectToTriangles(texBottom,texLeft,texTop,texRight));
				mapItem.glManager.drawTexture ();
			}
		} else { // animation stops and actual zoom occurs
			animationZoomW = 0;
			animationZoomH = 0;
			if (mapItem.glManager.OK) {
			    const ctx = mapItem.glManager.context;
			    ctx.clear(ctx.COLOR_BUFFER_BIT);
			    mapItem.glManager.setClipRegion (NgChm.DRAW.GL.fullClipSpace);
			    mapItem.glManager.setTextureRegion (NgChm.DRAW.GL.fullTextureSpace);
			}
			NgChm.DEV.detailDataZoomIn(mapItem);
			NgChm.DET.animating = false;

		}	
	}

}



