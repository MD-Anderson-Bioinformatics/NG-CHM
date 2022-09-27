/**********************************************************************************
 * USER HELP FUNCTIONS:  The following functions handle the processing 
 * for user help popup windows for the detail canvas and the detail canvas buttons.
 **********************************************************************************/
(function() {
    'use strict';
    NgChm.markFile();

    //Define Namespace for NgChm UserHelpManager
    const UHM = NgChm.createNS('NgChm.UHM');

    const MMGR = NgChm.importNS('NgChm.MMGR');
    const UTIL = NgChm.importNS('NgChm.UTIL');
    const SEL = NgChm.importNS('NgChm.SEL');
    const DET = NgChm.importNS('NgChm.DET');
    const SUM = NgChm.importNS('NgChm.SUM');
    const DMM = NgChm.importNS('NgChm.DMM');
    const SRCH = NgChm.importNS('NgChm.SRCH');
    const CUST = NgChm.importNS('NgChm.CUST');
    const UIMGR = NgChm.importNS('NgChm.UI-Manager');
    const COMPAT = NgChm.importNS('NgChm.CM');

    UHM.postMapDetails = false;	// Should we post map details to an enclosing document?
    UHM.postMapToWhom = null;		// Identity of the window to post map details to
    UHM.myNonce = 'N';			// Shared secret for vetting message sender

// Define action handlers for static UHM UI elements.
//
(function () {
    let uiElement;

    const aboutMenu = document.getElementById('aboutMenu_btn');
    aboutMenu.onclick = (ev) => {
	UHM.widgetHelp();
    };

    uiElement = document.getElementById('messageOpen_btn');
    uiElement.onclick = () => {
	UHM.displayStartupWarnings();
    };

    // Special tooltip with content populated from the loaded heat map.
    uiElement = document.getElementById('mapName');
    uiElement.addEventListener('mouseover', (ev) => {
	const heatMap = MMGR.getHeatMap();
	UHM.hlp(ev.target,"Map Name: " + (heatMap !== null ? heatMap.getMapInformation().name : "Not yet available") + "<br><br>Description: " + (heatMap !== null ? heatMap.getMapInformation().description : "N/A"),350);
    }, { passive: true });

    uiElement = document.getElementById('fileOpen_btn');
    uiElement.onclick = () => {
	SEL.openFileToggle();
    };

    uiElement = document.getElementById('flickOff');
    uiElement.onclick = () => {
	SEL.flickToggleOn();
    };

    uiElement = document.getElementById('mapLinks_btn');
    uiElement.onclick = () => {
	UHM.showMapPlugins();
    };

    uiElement = document.getElementById('allLinks_btn');
    uiElement.onclick = () => {
	UHM.showAllPlugins();
    };

    uiElement = document.getElementById('linkBoxFootCloseButton');
    uiElement.onclick = () => {
	UHM.linkBoxCancel();
    };

    uiElement = document.getElementById('menuSave');
    uiElement.onclick = () => {
	UHM.saveHeatMapChanges();
    };

    uiElement = document.getElementById('menuLink');
    uiElement.onclick = () => {
	UHM.openLinkoutHelp();
    };

    uiElement = document.getElementById('menuHelp');
    uiElement.onclick = () => {
	UHM.openHelp(this);
    };

    uiElement = document.getElementById('menuAbout');
    uiElement.onclick = () => {
	UHM.widgetHelp();
    };

})();

// Add a global event handler for processing mouseover and mouseout events.
//
// The handler adds the data-hovering property to an HTML element while the
// mouse is hovering over the element and removes it when the mouse moves away.
//
// The handler will display and clear tooltips if the mouse hovers over an element long enough.
// Add a tooltip to an HTML element by setting the data-tooltip property.
(function() {
    document.addEventListener("mouseover", mouseover, { passive: true });
    document.addEventListener("mouseout", mouseout, { passive: true });
    document.addEventListener("click", click, { passive: true });

    function click (ev) {
	// Clear any (pending) tooltips if the user clicks on the element.
	UHM.hlpC();
	UHM.closeMenu();
    }

    function mouseout (ev) {
	delete ev.target.dataset.hovering;
	if (ev.target.dataset.hasOwnProperty('nohoverImg')) {
	    ev.target.src = ev.target.dataset.nohoverImg;
	}
	UHM.hlpC();
    }

    function mouseover(ev) {
	ev.target.dataset.hovering = '';
	if (ev.target.dataset.hasOwnProperty('hoverImg')) {
	    if (!ev.target.dataset.hasOwnProperty('nohoverImg')) ev.target.dataset.nohoverImg = ev.target.src;
	    ev.target.src = UTIL.imageTable[ev.target.dataset.hoverImg];
	}
	if (ev.target.dataset.hasOwnProperty('tooltip')) {
	    UHM.hlp (ev.target, ev.target.dataset.tooltip || ev.target.dataset.intro || ev.target.dataset.title || "Undefined tooltip", 140, 0);
	}
    }
})();

// This function is called when the NgChm receives a message.  It is intended for
// customizing behavior when the NgChm is included in an iFrame.
//
// If the message includes override: 'ShowMapDetail' we will post map details to the
// enclosing window instead of displaying them within the NGCHM.
//
UHM.processMessage = function (e) {
	//console.log ('Got message');
	//console.log (e);

	// We should only process messages from the enclosing origin.

	// I tried using document.location.ancestorOrigins.
	// At least chrome knows about this, but at least firefox doesn't.
	// if (!document.location.ancestorOrigins || document.location.ancestorOrigins.length < 1 ||
	//     document.location.ancestorOrigins[0] != e.origin) {
	//     console.log ("Who's that?");
	//     return;
	// }
	// We could perhaps use document.referrer instead, but we would have to parse it.

	// Instead, we require that the enclosing document passes a secret nonce in our URL.
	// We only accept any messages that contain this secret.
	if (UHM.myNonce === '') UHM.myNonce = UTIL.getURLParameter('nonce');
	if (UHM.myNonce === '' || !e.data || e.data.nonce !== UHM.myNonce) {
		//console.log ("What's that?");
		return;
	}

	if (e.data.override === 'ShowMapDetail') {
		// Parent wants to display map details itself.
		UHM.postMapDetails = true;
		UHM.postMapToWhom = e.origin;
	}
	
	//If caller provided a unique ID to be returned with data point messages, save it.
	if (e.data.ngchm_id != null ) {
		UHM.postID = e.data.ngchm_id;
	}
}
window.addEventListener('message', UHM.processMessage, false);

/* Format the pixel information for display in the helpContents table.
 */
UHM.formatMapDetails = function (helpContents, pixelInfo) {
	helpContents.insertRow().innerHTML = UHM.formatBlankRow();
	UHM.setTableRow(helpContents, ["<u>"+"Data Details"+"</u>", "&nbsp;"], 2);
	UHM.setTableRow(helpContents,["&nbsp;Value:", pixelInfo.value]);
	UHM.setTableRow(helpContents,[ "&nbsp;Row:", pixelInfo.rowLabel]);
	UHM.setTableRow(helpContents,["&nbsp;Column:", pixelInfo.colLabel]);
	if (pixelInfo.rowCovariates.length > 0) {
		helpContents.insertRow().innerHTML = UHM.formatBlankRow();
		UHM.setTableRow(helpContents, ["&nbsp;<u>"+"Row Covariates"+"</u>", "&nbsp;"], 2);
		pixelInfo.rowCovariates.forEach ( cv => {
			const displayName = cv.name.length > 20 ? cv.name.substring(0,20) + "..." : cv.name;
			UHM.setTableRow(helpContents,["&nbsp;&nbsp;&nbsp;"+displayName+":"+"</u>", cv.value]);
		});
	}
	if (pixelInfo.colCovariates.length > 0) {
		helpContents.insertRow().innerHTML = UHM.formatBlankRow();
		UHM.setTableRow(helpContents, ["&nbsp;<u>"+"Column Covariates"+"</u>", "&nbsp;"], 2);
		pixelInfo.colCovariates.forEach ( cv => {
			const displayName = cv.name.length > 20 ? cv.name.substring(0,20) + "..." : cv.name;
			UHM.setTableRow(helpContents,["&nbsp;&nbsp;&nbsp;"+displayName+":"+"</u>", cv.value]);
		});
	}
}

/**********************************************************************************
 * FUNCTION - userHelpOpen: This function handles all of the tasks necessary to 
 * generate help pop-up panels for the detail heat map and the detail heat map 
 * classification bars.  
 *********************************************************************************/
UHM.userHelpOpen = function(mapItem) {
	const heatMap = MMGR.getHeatMap();
	UHM.hlpC();
    clearTimeout(DET.detailPoint);
	var helpContents = document.createElement("TABLE");
	helpContents.id = 'helpTable';
    var orgW = window.innerWidth+window.pageXOffset;
    var orgH = window.innerHeight+window.pageYOffset;
    var helptext = UHM.getDivElement("helptext");
    helptext.innerHTML=("<a align='left'>Copy To Clipboard</a><img id='redX_btn' src='images/redX.png' alt='Close Help' align='right'>");
    helptext.children[0].onclick = pasteHelpContents;  // The <A> element.
    helptext.onclick = function(event) { UHM.hlpC(); };
    helptext.style.position = "absolute";
    document.getElementsByTagName('body')[0].appendChild(helptext);
    var rowElementSize = mapItem.dataBoxWidth * mapItem.canvas.clientWidth/mapItem.canvas.width; // px/Glpoint
    var colElementSize = mapItem.dataBoxHeight * mapItem.canvas.clientHeight/mapItem.canvas.height;

    // pixels
    var rowClassWidthPx = DET.getRowClassPixelWidth(mapItem);
    var colClassHeightPx = DET.getColClassPixelHeight(mapItem);
	var mapLocY = mapItem.offsetY - colClassHeightPx;
	var mapLocX = mapItem.offsetX - rowClassWidthPx;
	var objectType = "none";
    if (mapItem.offsetY > colClassHeightPx) { 
    	if  (mapItem.offsetX > rowClassWidthPx) {
    		objectType = "map";
    	}
    	if  (mapItem.offsetX < rowClassWidthPx) {
    		objectType = "rowClass";
    	}
    } else {
    	if  (mapItem.offsetX > rowClassWidthPx) {
    		objectType = "colClass";
    	}
    }
    if (objectType === "map") {
	var row = Math.floor(mapItem.currentRow + (mapLocY/colElementSize)*SEL.getSamplingRatio('row'));
	var col = Math.floor(mapItem.currentCol + (mapLocX/rowElementSize)*SEL.getSamplingRatio('col'));
	if ((row <= heatMap.getNumRows('d')) && (col <= heatMap.getNumColumns('d'))) {
		// Gather the information about the current pixel.
		let matrixValue = heatMap.getValue(MMGR.DETAIL_LEVEL,row,col);
		if (matrixValue >= MMGR.maxValues) {
	    		matrixValue = "Missing Value";
		} else if (matrixValue <= MMGR.minValues) {
			return; // A gap.
	    	} else {
	    		matrixValue = matrixValue.toFixed(5);
	    	}
		if (DMM.primaryMap.mode === 'FULL_MAP') {
	    		matrixValue = matrixValue + "<br>(summarized)";
	    	}

		const rowLabels = heatMap.getRowLabels().labels;
		const colLabels = heatMap.getColLabels().labels;
		const pixelInfo = {
			value: matrixValue,
			rowLabel: rowLabels[row-1],
			colLabel: colLabels[col-1]
		};
		const rowClassBars = heatMap.getRowClassificationData();
		const rowClassConfig = heatMap.getRowClassificationConfig();
		pixelInfo.rowCovariates = heatMap
			.getRowClassificationOrder()
			.filter(key => rowClassConfig[key].show === 'Y')
			.map(key => ({
				name: key,
				value: rowClassBars[key].values[row-1]
			}));
		const colClassBars = heatMap.getColClassificationData();
		const colClassConfig = heatMap.getColClassificationConfig();
		pixelInfo.colCovariates = heatMap
			.getColClassificationOrder()
			.filter(key => colClassConfig[key].show === 'Y')
			.map(key => ({
				name: key,
				value: colClassBars[key].values[col-1]
			}));

		// If the enclosing window wants to display the pixel info, send it to them.
		// Otherwise, display it ourselves.
        if (UHM.postMapDetails) {
			var msg = { nonce: UHM.myNonce, msg: 'ShowMapDetail', data: pixelInfo };
			//If a unique identifier was provided, return it in the message.
			if (UHM.postID != null) {
				msg["id"] = UHM.postID;
			} 

			window.parent.postMessage (msg, UHM.postMapToWhom);
        } else {
			UHM.formatMapDetails (helpContents, pixelInfo);
			helptext.style.display="inline";
			helptext.appendChild(helpContents);
			UHM.locateHelpBox(helptext,mapItem);
		}
    	}
    } else if ((objectType === "rowClass") || (objectType === "colClass")) {
    	var pos, value, label;
	var hoveredBar, hoveredBarColorScheme, hoveredBarValues;
    	if (objectType === "colClass") {
		var col = Math.floor(mapItem.currentCol + (mapLocX/rowElementSize)*SEL.getSamplingRatio('col'));
		var colLabels = heatMap.getColLabels().labels;
        	label = colLabels[col-1];
    		var coveredHeight = 0;
    		pos = Math.floor(mapItem.currentCol + (mapLocX/rowElementSize));
		var classBarsConfig = heatMap.getColClassificationConfig();
		var classBarsConfigOrder = heatMap.getColClassificationOrder();
			for (var i = 0; i <  classBarsConfigOrder.length; i++) {
				var key = classBarsConfigOrder[i];
    			var currentBar = classBarsConfig[key];
    			if (currentBar.show === 'Y') {
	        		coveredHeight += mapItem.canvas.clientHeight*currentBar.height/mapItem.canvas.height;
	        		if (coveredHeight >= mapItem.offsetY) {
	        			hoveredBar = key;
					hoveredBarValues = heatMap.getColClassificationData()[key].values;
	        			break;
	        		}
    			}
    		}
		var colorMap = heatMap.getColorMapManager().getColorMap("col",hoveredBar);
    	} else {
		var row = Math.floor(mapItem.currentRow + (mapLocY/colElementSize)*SEL.getSamplingRatio('row'));
		var rowLabels = heatMap.getRowLabels().labels;
        	label = rowLabels[row-1];
    		var coveredWidth = 0;
    		pos = Math.floor(mapItem.currentRow + (mapLocY/colElementSize));
		var classBarsConfig = heatMap.getRowClassificationConfig();
		var classBarsConfigOrder = heatMap.getRowClassificationOrder();
			for (var i = 0; i <  classBarsConfigOrder.length; i++) {
				var key = classBarsConfigOrder[i];
				var currentBar = classBarsConfig[key];
    			if (currentBar.show === 'Y') {
	        		coveredWidth += mapItem.canvas.clientWidth*currentBar.height/mapItem.canvas.width;
	        		if (coveredWidth >= mapItem.offsetX){
	        			hoveredBar = key;
					hoveredBarValues = heatMap.getRowClassificationData()[key].values;
	        			break;
	        		}
    			}
    		}
		var colorMap = heatMap.getColorMapManager().getColorMap("row",hoveredBar);
    	}
    	var value = hoveredBarValues[pos-1];
    	//No help popup when clicking on a gap in the class bar
    	if (value === '!CUT!') {
    		return;
    	}
    	var colors = colorMap.getColors();
    	var classType = colorMap.getType();
    	if ((value === 'null') || (value === 'NA')) {
        	value = "Missing Value";
    	}
    	var thresholds = colorMap.getThresholds();
    	var thresholdSize = 0;
    	// For Continuous Classifications: 
    	// 1. Retrieve continuous threshold array from colorMapManager
    	// 2. Retrieve threshold range size divided by 2 (1/2 range size)
    	// 3. If remainder of half range > .75 set threshold value up to next value, Else use floor value.
    	if (classType == 'continuous') {
    		thresholds = colorMap.getContinuousThresholdKeys();
    		var threshSize = colorMap.getContinuousThresholdKeySize()/2;
    		if ((threshSize%1) > .5) {
    			// Used to calculate modified threshold size for all but first and last threshold
    			// This modified value will be used for color and display later.
    			thresholdSize = Math.floor(threshSize)+1;
    		} else {
    			thresholdSize = Math.floor(threshSize);
    		}
    	}
    	
    	// Build TABLE HTML for contents of help box
		var displayName = hoveredBar;
		if (hoveredBar.length > 20){
			displayName = displayName.substring(0,20) + "...";
		}
		UHM.setTableRow(helpContents, ["Label: ", "&nbsp;"+label]);
		UHM.setTableRow(helpContents, ["Covariate: ", "&nbsp;"+displayName]);
		UHM.setTableRow(helpContents, ["Value: ", "&nbsp;"+value]);
		helpContents.insertRow().innerHTML = UHM.formatBlankRow();
    	var rowCtr = 3 + thresholds.length;
    	var prevThresh = currThresh;
    	for (var i = 0; i < thresholds.length; i++){ // generate the color scheme diagram
        	var color = colors[i];
        	var valSelected = 0;
        	var valTotal = hoveredBarValues.length;
        	var currThresh = thresholds[i];
        	var modThresh = currThresh;
        	if (classType == 'continuous') {
        		// IF threshold not first or last, the modified threshold is set to the threshold value 
        		// less 1/2 of the threshold range ELSE the modified threshold is set to the threshold value.
        		if ((i != 0) &&  (i != thresholds.length - 1)) {
        			modThresh = currThresh - thresholdSize;
        		}
				color = colorMap.getRgbToHex(colorMap.getClassificationColor(modThresh));
        	}
        	
        	//Count classification value occurrences within each breakpoint.
        	for (var j = 0; j < valTotal; j++) {
			let classBarVal = hoveredBarValues[j];
        		if (classType == 'continuous') {
            		// Count based upon location in threshold array
            		// 1. For first threshhold, count those values <= threshold.
            		// 2. For second threshold, count those values >= threshold.
            		// 3. For penultimate threshhold, count those values > previous threshold AND values < final threshold.
            		// 3. For all others, count those values > previous threshold AND values <= final threshold.
        			if (i == 0) {
						if (classBarVal <= currThresh) {
       						valSelected++;
						}
        			} else if (i == thresholds.length - 1) {
        				if (classBarVal >= currThresh) {
        					valSelected++;
        				}
        			} else if (i == thresholds.length - 2) {
		        		if ((classBarVal > prevThresh) && (classBarVal < currThresh)) {
		        			valSelected++;
		        		}
        			} else {
		        		if ((classBarVal > prevThresh) && (classBarVal <= currThresh)) {
		        			valSelected++;
		        		}
        			}
        		} else {
                	var value = thresholds[i];
	        		if (classBarVal == value) {
	        			valSelected++;
	        		}
        		}
        	}
        	var selPct = Math.round(((valSelected / valTotal) * 100) * 100) / 100;  //new line
        	if (currentBar.bar_type === 'color_plot') {
		    UHM.setTableRow(helpContents, ["<div class='input-color'><div class='color-box' style='background-color: " + color + ";'></div></div>", modThresh + " (n = " + valSelected + ", " + selPct+ "%)"]);
        	} else {
		    UHM.setTableRow(helpContents, ["<div> </div></div>", modThresh + " (n = " + valSelected + ", " + selPct+ "%)"]);
        	}
        	prevThresh = currThresh;
    	}
    	var valSelected = 0;  
    	var valTotal = hoveredBarValues.length; 
    	for (var j = 0; j < valTotal; j++) { 
    		if ((hoveredBarValues[j] == "null") || (hoveredBarValues[j] == "NA")) { 
    			valSelected++;  
    		} 
    	} 
    	var selPct = Math.round(((valSelected / valTotal) * 100) * 100) / 100;  //new line
    	if (currentBar.bar_type === 'color_plot') {
			UHM.setTableRow(helpContents, ["<div class='input-color'><div class='color-box' style='background-color: " +  colorMap.getMissingColor() + ";'></div></div>", "Missing Color (n = " + valSelected + ", " + selPct+ "%)"]);
    	} else {
			UHM.setTableRow(helpContents, ["<div> </div></div>", "Missing Color (n = " + valSelected + ", " + selPct+ "%)"]);
    	}
    	
		// If the enclosing window wants to display the covarate info, send it to them.
		// Otherwise, display it ourselves.
        if (UHM.postMapDetails) {
			var msg = { nonce: UHM.myNonce, msg: 'ShowCovarDetail', data: helpContents.innerHTML };
			//If a unique identifier was provided, return it in the message.
			if (UHM.postID != null) {
				msg["id"] = UHM.postID;
			} 

			window.parent.postMessage (msg, UHM.postMapToWhom);
        } else {
        	helptext.style.display="inline";
        	helptext.appendChild(helpContents);
		UHM.locateHelpBox(helptext,mapItem);
        }	
    } else {  
    	// on the blank area in the top left corner
    }
    UIMGR.redrawCanvases();
}

/**********************************************************************************
 * FUNCTION - pasteHelpContents: This function opens a browser window and pastes
 * the contents of the user help panel into the window.  
 **********************************************************************************/
function pasteHelpContents() {
    var el = document.getElementById('helpTable')
    window.open("","",'width=500,height=330,resizable=1').document.write(el.innerText.replace(/(\r\n|\n|\r)/gm, "<br>"));
}

/**********************************************************************************
 * FUNCTION - locateHelpBox: This function determines and sets the location of a
 * popup help box.  
 **********************************************************************************/
UHM.locateHelpBox = function(helptext,mapItem) {
    var rowClassWidthPx = DET.getRowClassPixelWidth(mapItem);
    var colClassHeightPx = DET.getColClassPixelHeight(mapItem);
	var mapLocY = mapItem.offsetY - colClassHeightPx;
	var mapLocX = mapItem.offsetX - rowClassWidthPx;
	var mapH = mapItem.canvas.clientHeight - colClassHeightPx;
	var mapW = mapItem.canvas.clientWidth - rowClassWidthPx;
	var boxLeft = mapItem.pageX;
	if (mapLocX > (mapW / 2)) {
		boxLeft = mapItem.pageX - helptext.clientWidth - 10;
	}
	helptext.style.left = boxLeft + 'px';
	var boxTop = mapItem.pageY;
	if ((boxTop+helptext.clientHeight) > mapItem.canvas.clientHeight + 90) {
		if (helptext.clientHeight > mapItem.pageY) {
			boxTop = mapItem.pageY - (helptext.clientHeight/2);
		} else {
			boxTop = mapItem.pageY - helptext.clientHeight;
		}
	}
	//Keep box from going off top of screen so data values always visible.
	if (boxTop < 0) {
		boxTop = 0;
	}
	helptext.style.top = boxTop + 'px';
}


/**********************************************************************************
 * FUNCTION - hlp: The purpose of this function is to generate a 
 * pop-up help panel for the tool buttons at the top of the detail pane. It receives
 * text from chm.html. 
 **********************************************************************************/
UHM.hlp = function(e, text, width, reverse, delay=1500) {
	UHM.hlpC();
	UHM.detailPoint = setTimeout(function(){
		const bodyElem = document.querySelector('body');
		if (!bodyElem) return;

		const elemPos = UHM.getElemPosition(e);
		const title = UTIL.newElement('span.title', {}, [UTIL.newTxt(e.dataset.title || "")]);
		const content = UTIL.newElement('span.intro', {}, [e.dataset.intro || text]);
		const helptext = UTIL.newElement('div#bubbleHelp', {}, [title,content]);
		if (reverse !== undefined) {
			helptext.style.left = (elemPos.left - width) + 'px';
		} else {
			helptext.style.left = elemPos.left + 'px';
		}
		helptext.style.top = (elemPos.top + 20) + 'px';
		helptext.innerHTML = "<b><font size='2' color='#0843c1'>"+text+"</font></b>";
		helptext.style.display = "inherit";
		bodyElem.appendChild(helptext);
	}, delay);
}

/**********************************************************************************
 * FUNCTION - getElemPosition: This function finds the help element selected's 
 * position on the screen and passes it back to the help function for display. 
 * The position returned is the position on the entire screen (not the panel that
 * the control is embedded in).  In this way, the help text bubble may be placed
 * on the document body.
 **********************************************************************************/
UHM.getElemPosition = function(el) {
    var _x = 0;
    var _y = 0;
    while( el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop ) ) {
        _x += el.offsetLeft - el.scrollLeft;
        _y += el.offsetTop - el.scrollTop;
        el = el.offsetParent;
    }
    return { top: _y, left: _x };
}

/**********************************************************************************
 * FUNCTION - hlpC: This function clears any bubble help box displayed on the screen.
 **********************************************************************************/
UHM.hlpC = function() {
	clearTimeout(UHM.detailPoint);
	var helptext = document.getElementById('bubbleHelp');
	if (helptext === null) {
		var helptext = document.getElementById('helptext');
	}
	if (helptext){
		helptext.remove();
	}
}

/**********************************************************************************
 * FUNCTION - userHelpClose: The purpose of this function is to close any open 
 * user help pop-ups and any active timeouts associated with those pop-up panels.
 **********************************************************************************/
UHM.userHelpClose = function() {
	clearTimeout(DET.detailPoint);
	var helptext = document.getElementById('helptext');
	if (helptext){
		helptext.remove();
	}
}

/**********************************************************************************
 * FUNCTION - getDivElement: The purpose of this function is to create and 
 * return a DIV html element that is configured for a help pop-up panel.
 **********************************************************************************/
UHM.getDivElement = function(elemName) {
    var divElem = document.createElement('div');
    divElem.id = elemName;
    divElem.style.backgroundColor = '#CBDBF6'; 
    divElem.style.display="none";
    return divElem;
}

/**********************************************************************************
 * FUNCTION - setTableRow: The purpose of this function is to set a row into a help
 * or configuration html TABLE item for a given help pop-up panel. It receives text for 
 * the header column, detail column, and the number of columns to span as inputs.
 **********************************************************************************/
UHM.setTableRow = function(tableObj, tdArray, colSpan, align) {
	var tr = tableObj.insertRow();
	tr.className = "chmTblRow";
	for (var i = 0; i < tdArray.length; i++) {
		var td = tr.insertCell(i);
		if (typeof colSpan != 'undefined') {
			td.colSpan = colSpan;
		}
		if (i === 0) {
			td.style.fontWeight="bold";
		}
		if (['string', 'number'].includes(typeof tdArray[i]) || Array.isArray(tdArray[i])) {
		    td.innerHTML = tdArray[i];
		} else {
		    td.appendChild (tdArray[i]);
		}
		if (typeof align != 'undefined') {
			td.align = align;
		}
	}
}

/**********************************************************************************
 * FUNCTION - formatBlankRow: The purpose of this function is to return the html
 * text for a blank row.
 **********************************************************************************/
UHM.formatBlankRow = function() {
	return "<td style='line-height:4px;' colspan=2>&nbsp;</td>";
}

/**********************************************************************************
 * FUNCTION - addBlankRow: The purpose of this function is to return the html
 * text for a blank row.
 **********************************************************************************/
UHM.addBlankRow = function(addDiv, rowCnt) {
	addDiv.insertRow().innerHTML = UHM.formatBlankRow();
	if (typeof rowCnt !== 'undefined') {
		for (var i=1;i<rowCnt;i++) {
			addDiv.insertRow().innerHTML = UHM.formatBlankRow();
		}
	}
	return;
}

UHM.showSearchError = function(type) {
	var searchError = UHM.getDivElement('searchError');
	searchError.style.display = 'inherit';
	var searchBar = document.getElementById('search_text');
	searchError.style.top = (searchBar.offsetTop + searchBar.offsetHeight) + 'px';
	searchError.style.left = (searchBar.offsetLeft + searchBar.offsetWidth) + 'px';
	const searchItem = SRCH.getCurrentSearchItem();
	switch (type){
		case 0: searchError.innerHTML = "No matching labels found"; break;
		case 1: searchError.innerHTML = "Exit dendrogram selection to go to " + searchItem.label;break;
		case 2: searchError.innerHTML = "All " + searchItem.axis +  " items are visible. Change the view mode to see " + searchItem.label;break;
	}
	UHM.hlpC();
	document.body.appendChild(searchError);
	setTimeout(function(){
		searchError.remove();
	}, 2000);
	
}

/**********************************************************************************
 * FUNCTION - saveHeatMapChanges: This function handles all of the tasks necessary 
 * display a modal window whenever the user requests to save heat map changes.  
 **********************************************************************************/
UHM.saveHeatMapChanges = function() {
	const heatMap = MMGR.getHeatMap();
	var text;
	UHM.closeMenu();
	UHM.initMessageBox();
	UHM.setMessageBoxHeader("Save Heat Map");
	//Have changes been made?
	if (heatMap.getUnAppliedChanges()) {
		if ((heatMap.isFileMode()) || (typeof NgChm.galaxy !== "undefined")) {  // FIXME: BMB.  Improve Galaxy detection.
			if (typeof NgChm.galaxy !== "undefined") {
				text = "<br>Changes to the heatmap cannot be saved in the Galaxy history.  Your modifications to the heatmap may be written to a downloaded NG-CHM file.";
			} else {
				text = "<br>You have elected to save changes made to this NG-CHM heat map file.<br><br>You may save them to a new NG-CHM file that may be opened using the NG-CHM File Viewer application.<br><br>";
			}
			UHM.setMessageBoxText(text);
			UHM.setMessageBoxButton(1, UTIL.imageTable.saveNgchm, "Save To NG-CHM File", heatMap.saveHeatMapToNgchm);
			UHM.setMessageBoxButton(4, UTIL.imageTable.closeButton, "Cancel Save", UHM.messageBoxCancel);
		} else {
			// If so, is read only?
			if (heatMap.isReadOnly()) {
				text = "<br>You have elected to save changes made to this READ-ONLY heat map. READ-ONLY heat maps cannot be updated.<br><br>However, you may save these changes to an NG-CHM file that may be opened using the NG-CHM File Viewer application.<br><br>";
				UHM.setMessageBoxText(text);
				UHM.setMessageBoxButton(1, UTIL.imageTable.saveNgchm, "Save To NG-CHM File", heatMap.saveHeatMapToNgchm);
				UHM.setMessageBoxButton(4, UTIL.imageTable.closeButton, "Cancel Save", UHM.messageBoxCancel);
			} else {
				text = "<br>You have elected to save changes made to this heat map.<br><br>You have the option to save these changes to the original map OR to save them to an NG-CHM file that may be opened using the NG-CHM File Viewer application.<br><br>";
				UHM.setMessageBoxText(text);
				UHM.setMessageBoxButton(1, UTIL.imageTable.saveNgchm, "Save To NG-CHM File", heatMap.saveHeatMapToNgchm);
				UHM.setMessageBoxButton(2, "images/saveOriginal.png", "Save Original Heat Map", heatMap.saveHeatMapToServer);
				UHM.setMessageBoxButton(3, UTIL.imageTable.closeButton, "Cancel Save", UHM.messageBoxCancel);
			}
		}
	} else {
		text = "<br>There are no changes to save to this heat map at this time.<br><br>However, you may save the map as an NG-CHM file that may be opened using the NG-CHM File Viewer application.<br><br>";
		UHM.setMessageBoxText(text);
		UHM.setMessageBoxButton(1, UTIL.imageTable.saveNgchm, "Save To NG-CHM File", heatMap.saveHeatMapToNgchm);
		UHM.setMessageBoxButton(4, UTIL.imageTable.closeButton, "Cancel Save", UHM.messageBoxCancel);
	}
	UHM.displayMessageBox();
}

/**********************************************************************************
 * FUNCTION - widgetHelp: This function displays a special help popup box for
 * the widgetized version of the NG-CHM embedded viewer.  
 **********************************************************************************/
UHM.widgetHelp = function() {
	const heatMap = MMGR.getHeatMap();
	const logos = document.getElementById('ngchmLogos');
	// Logos are not included in the widgetized version.
	if (logos) { logos.style.display = ''; }
	UHM.initMessageBox();
	UHM.setMessageBoxHeader("About NG-CHM Viewer");
	var mapVersion = ((heatMap !== null) && heatMap.isMapLoaded()) === true ? heatMap.getMapInformation().version_id : "N/A";
	var text = "<p>The NG-CHM Heat Map Viewer is a dynamic, graphical environment for exploration of clustered or non-clustered heat map data in a web browser. It supports zooming, panning, searching, covariate bars, and link-outs that enable deep exploration of patterns and associations in heat maps.</p>";
	text = text + "<p><a href='https://bioinformatics.mdanderson.org/public-software/ngchm/' target='_blank'>Additional NG-CHM Information and Help</a></p>";
	text = text + "<p><b>Software Version: </b>" + COMPAT.version+"</p>";
	text = text + "<p><b>Linkouts Version: </b>" + linkouts.getVersion()+"</p>";
	text = text + "<p><b>Map Version: </b>" +mapVersion+"</p>";
	text = text + "<p><b>Citation:</b> Bradley M. Broom, Michael C. Ryan, Robert E. Brown, Futa Ikeda, Mark Stucky, David W. Kane, James Melott, Chris Wakefield, Tod D. Casasent, Rehan Akbani and John N. Weinstein, A Galaxy Implementation of Next-Generation Clustered Heatmaps for Interactive Exploration of Molecular Profiling Data. Cancer Research 77(21): e23-e26 (2017): <a href='http://cancerres.aacrjournals.org/content/77/21/e23' target='_blank'>http://cancerres.aacrjournals.org/content/77/21/e23</a></p>";
	text = text + "<p>The NG-CHM Viewer is also available for a variety of other platforms.</p>";
	UHM.setMessageBoxText(text);
	UHM.setMessageBoxButton(3, UTIL.imageTable.closeButton, "Close button", UHM.messageBoxCancel);
	UHM.displayMessageBox();
}

/**********************************************************************************
 * FUNCTION - zipSaveNotification: This function handles all of the tasks necessary 
 * display a modal window whenever a zip file is being saved. The textId passed in
 * instructs the code to display either the startup save OR preferences save message.  
 **********************************************************************************/
UHM.zipSaveNotification = function(autoSave) {
	var text;
	UHM.initMessageBox();
	UHM.setMessageBoxHeader("NG-CHM File Viewer");
	if (autoSave) {
		text = "<br>This NG-CHM archive file contains an out dated heat map configuration that has been updated locally to be compatible with the latest version of the NG-CHM Viewer.<br><br>In order to upgrade the NG-CHM and avoid this notice in the future, you will want to replace your original file with the version now being displayed.<br><br>";
		UHM.setMessageBoxButton(1, UTIL.imageTable.saveNgchm, "Save NG-CHM button", MMGR.getHeatMap().zipSaveNgchm);
	} else {
		text = "<br>You have just saved a heat map as a NG-CHM file.  In order to see your saved changes, you will want to open this new file using the NG-CHM File Viewer application.  If you have not already downloaded the application, press the Download Viewer button to get the latest version.<br><br>The application downloads as a single HTML file (ngchmApp.html).  When the download completes, you may run the application by simply double-clicking on the downloaded file.  You may want to save this file to a location of your choice on your computer for future use.<br><br>" 
		UHM.setMessageBoxButton(1, "images/downloadViewer.png", "Download NG-CHM Viewer App", UHM.zipAppDownload);
	}
	UHM.setMessageBoxText(text);
	UHM.setMessageBoxButton(3, UTIL.imageTable.cancelSmall, "Cancel button", UHM.messageBoxCancel);
	UHM.displayMessageBox();
}

/**********************************************************************************
 * FUNCTION - viewerAppVersionExpiredNotification: This function handles all of the tasks 
 * necessary display a modal window whenever a user's version of the file application 
 * has been superceded and a new version of the file application should be downloaded. 
 **********************************************************************************/
UHM.viewerAppVersionExpiredNotification = function(oldVersion, newVersion) {
	UHM.initMessageBox();
	UHM.setMessageBoxHeader("New NG-CHM File Viewer Version Available");
	UHM.setMessageBoxText("<br>The version of the NG-CHM File Viewer application that you are running ("+oldVersion+") has been superceded by a newer version ("+newVersion+"). You will be able to view all pre-existing heat maps with this new backward-compatible version. However, you may wish to download the latest version of the viewer.<br><br>The application downloads as a single HTML file (ngchmApp.html).  When the download completes, you may run the application by simply double-clicking on the downloaded file.  You may want to save this file to a location of your choice on your computer for future use.<br><br>");
	UHM.setMessageBoxButton(1, "images/downloadViewer.png", "Download NG-CHM Viewer App", UHM.zipAppDownload);
	UHM.setMessageBoxButton(3, UTIL.imageTable.closeButton, "Cancel button", UHM.messageBoxCancel);
	UHM.displayMessageBox();
}

/**********************************************************************************
 * FUNCTION - hamburgerLinkMissing: This function handles all of the tasks 
 * necessary display a modal window whenever a user's clicks on a hamburger menu
 * link that has not had it's callback destination defined. 
 **********************************************************************************/
UHM.hamburgerLinkMissing = function() {
	UHM.initMessageBox();
	UHM.setMessageBoxHeader("NG-CHM Menu Link Error");
	UHM.setMessageBoxText("<br>No destination has been defined for the menu link.");
	UHM.setMessageBoxButton(1, UTIL.imageTable.closeButton, "Cancel button", UHM.messageBoxCancel);
	UHM.displayMessageBox();
}

/**********************************************************************************
 * FUNCTION - systemMessage: This function handles all of the tasks necessary 
 * display a modal window whenever a given notification condition occurs. 
 **********************************************************************************/
UHM.systemMessage = function(header, message) {
	UHM.initMessageBox();
	UHM.setMessageBoxHeader(header);
	UHM.setMessageBoxText("<br>" + message);
	UHM.setMessageBoxButton(1, UTIL.imageTable.closeButton, "Cancel button", UHM.messageBoxCancel);
	UHM.displayMessageBox();
}

/**********************************************************************************
 * FUNCTION - zipAppDownload: This function calls the Matrix Manager to initiate
 * the download of the NG-CHM File Viewer application. 
 **********************************************************************************/
UHM.zipAppDownload = function() {
	var dlButton = document.getElementById('msgBoxBtnImg_1');
	dlButton.style.display = 'none';
	MMGR.getHeatMap().downloadFileApplication();
}

/**********************************************************************************
 * FUNCTION - noWebGlContext: This function displays an error when no WebGl context
 * is available on the user's machine.
 **********************************************************************************/
UHM.noWebGlContext = function(isDisabled) {
	UHM.initMessageBox();
	UHM.setMessageBoxHeader("ERROR: WebGL Initialization Failed");
	if (isDisabled) {
		UHM.setMessageBoxText("<br>WebGL is available but is not enabled on your machine.  The NG-CHM Application requires the WebGL Javascript API in order to render images of Next Generation Clustered Heat Maps.<br><br>Instructions for enabling WebGL, based on browser type, can be found via a web search.");
	} else {
		UHM.setMessageBoxText("<br>No WebGL context is available.  The NG-CHM Application requires the WebGL Javascript API in order to render images of Next Generation Clustered Heat Maps. Most web browsers and graphics processors support WebGL.<br><br>Please ensure that the browser that you are using and your computer's processor are WebGL compatible.");
	}
	UHM.setMessageBoxButton(3, UTIL.imageTable.prefCancel, "Cancel button", UHM.messageBoxCancel);
	UHM.displayMessageBox();
}

/**********************************************************************************
 * FUNCTION - mapNotFound: This function displays an error when a server NG-CHM
 * cannot be accessed.
 **********************************************************************************/
UHM.mapNotFound = function(heatMapName) {
	UHM.initMessageBox();
	UHM.setMessageBoxHeader("Requested Heat Map Not Found");
	UHM.setMessageBoxText("<br>The Heat Map (" + heatMapName + ") that you requested cannot be found OR connectivity to the Heat Map repository has been interrupted.<br><br>Please check the Heat Map name and try again.");
	UHM.setMessageBoxButton(3, UTIL.imageTable.prefCancel, "Cancel button", UHM.messageBoxCancel);
	UHM.displayMessageBox();
};

/**********************************************************************************
 * FUNCTION - mapLoadError: This function displays an error when a .ngchm file
 * cannot be loaded.
 **********************************************************************************/
UHM.mapLoadError = function(heatMapName, details) {
	UHM.initMessageBox();
	UHM.setMessageBoxHeader("Requested Heat Map Not Loaded");
	UHM.setMessageBoxText("<br>The Heat Map (" + heatMapName + ") that you selected cannot be loaded.<br><br>Reason: " + details);
	UHM.setMessageBoxButton(3, UTIL.imageTable.prefCancel, "Cancel button", UHM.messageBoxCancel);
	UHM.displayMessageBox();
};

/**********************************************************************************
 * FUNCTION - linkoutError: This function displays a linkout error message.
 **********************************************************************************/
UHM.linkoutError = function(msgText) {
	UHM.initMessageBox();
	UHM.setMessageBoxHeader("Heat Map Linkout");
	UHM.setMessageBoxText(msgText);
	UHM.setMessageBoxButton(3, UTIL.imageTable.prefCancel, "Cancel button", UHM.messageBoxCancel);
	UHM.displayMessageBox();
}


/**********************************************************************************
 * FUNCTION - invalidFileFormat: This function displays an error when the user selects
 * a file that is not an NG-CHM file.
 **********************************************************************************/
UHM.invalidFileFormat = function() {
	UHM.initMessageBox();
	UHM.setMessageBoxHeader("Invalid File Format");
	UHM.setMessageBoxText("<br>The file chosen is not an NG-CHM file.<br><br>Please select a .ngchm file and try again.");
	UHM.setMessageBoxButton(3, UTIL.imageTable.prefCancel, "Cancel button", UHM.messageBoxCancel);
	UHM.displayMessageBox();
}

/**********************************************************************************
 * FUNCTIONS - MESSAGE BOX FUNCTIONS
 * 
 * We use a generic message box for most of the modal request windows in the 
 * application.  The following functions support this message box:
 * 1. initMessageBox - Initializes and hides the message box panel
 * 2. setMessageBoxHeader - Places text in the message box header bar.
 * 3. setMessageBoxText - Places text in the message box body.
 * 4. setMessageBoxButton - Configures and places a button on the message box.
 * 5. messageBoxCancel - Closes the message box when a Cancel is requested.  
 **********************************************************************************/
UHM.initMessageBox = function() {
	var msgBox = document.getElementById('msgBox');
	UTIL.hideLoader();
	
	document.getElementById('msgBox').style.display = 'none';
	document.getElementById('msgBoxBtnImg_1').style.display = 'none';
	document.getElementById('msgBoxBtnImg_2').style.display = 'none';
	document.getElementById('msgBoxBtnImg_3').style.display = 'none';
	document.getElementById('msgBoxBtnImg_4').style.display = 'none';
	document.getElementById('msgBoxBtnImg_1')['onclick'] = null;
	document.getElementById('msgBoxBtnImg_2')['onclick'] = null;
	document.getElementById('msgBoxBtnImg_3')['onclick'] = null;
	document.getElementById('msgBoxBtnImg_4')['onclick'] = null;
	var msgButton = document.getElementById('messageOpen_btn');
    msgButton.style.display = 'none'; 
    if (SUM.texHmProgram !== undefined) {
        UIMGR.redrawCanvases();
    }
}

UHM.setMessageBoxHeader = function(headerText) {
	var msgBoxHdr = document.getElementById('msgBoxHdr');
	msgBoxHdr.innerHTML = headerText;
	if (msgBoxHdr.querySelector(".closeX")) { msgBoxHdr.querySelector(".closeX").remove(); }
	msgBoxHdr.appendChild(UHM.createCloseX(UHM.messageBoxCancel));
}

UHM.setMessageBoxText = function(text) {
	var msgBoxTxt = document.getElementById('msgBoxTxt');
	msgBoxTxt.innerHTML = text;
}

UHM.displayMessageBox = function() {
	let msgBox = document.getElementById('msgBox');
	msgBox.style.display = '';
	msgBox.style.left = ((window.innerWidth - msgBox.offsetWidth) / 2) + 'px'; // center horizontally
	let headerpanel = document.getElementById('mdaServiceHeader');
	msgBox.style.top = (headerpanel.offsetTop + 15) + 'px';
}

UHM.setMessageBoxButton = function(buttonId, imageSrc, altText, onClick) {
	var buttonImg = document.getElementById('msgBoxBtnImg_'+buttonId);
	buttonImg.style.display = '';
	buttonImg.src = imageSrc;
	buttonImg.alt = altText;
	if (onClick != undefined) {
		buttonImg.onclick = function() { onClick(); };
	}
}

UHM.messageBoxCancel = function() {
	UHM.initMessageBox();
}

UHM.openHelp = function() {
	UHM.closeMenu();
	if (MMGR.source !== MMGR.WEB_SOURCE) {
		UHM.widgetHelp();
	} else {
		var url = location.origin+location.pathname;
		window.open(url.replace("chm.html", "chmHelp.html"),'_blank');
	}
    UIMGR.redrawCanvases();
}

UHM.closeMenu = function() {
	const barMenuBtn = document.getElementById('barMenu_btn');
	if (barMenuBtn !== null) {
		if (!barMenuBtn.dataset.hasOwnProperty('hovering')) {
			const menu = document.getElementById('burgerMenuPanel');
			menu.style.display = 'none';
		}
	}
};

UHM.menuOver = function(val) {
	var menuBtn = document.getElementById('barMenu_btn')
	if (val === 0) {
		menuBtn.setAttribute('src', 'images/barMenu.png');
	} else {
		menuBtn.setAttribute('src', 'images/barMenuHover.png');
	}
	menuBtn.mouseIsOver=val;
}

UHM.colorOver = function(val) {
	var menuBtn = document.getElementById('colorMenu_btn')
	if (val === 0) {
		menuBtn.setAttribute('src', 'images/barColors.png');
	} else {
		menuBtn.setAttribute('src', 'images/barColorsHover.png');
	}
	menuBtn.mouseIsOver=val;
}

/**********************************************************************************
 * FUNCTION - displayStartupWarnings: The purpose of this function is to display any
 * heat map startup warnings in a popup box when the user opens a heat map.  Multiple
 * possible warnings may be displayed in the box.
 **********************************************************************************/
UHM.displayStartupWarnings = function() {
	UHM.hlpC();
	UHM.initMessageBox();
	var headingText = "NG-CHM Startup Warning";
	var warningText = "";
	var msgFound = false;
	var warningsFound = 1;
	if (UTIL.getBrowserType() === 'IE') {
		warningText = "<br><b>Unsupported Browser Warning:</b> Your current browser is Internet Explorer. The NG-CHM application is optimized for use with the Google Chrome and Mozilla Firefox browsers.  While you may view maps in IE, the performance of the application cannot be guaranteed.<br><br>You may wish to switch to one of these supported browsers.";
		msgFound = true;
	} else {
		if (UTIL.minLabelSize > 11) {
			if (msgFound) { warningText = warningText+"<br>" }
			warningText = warningText+"<br><b>Minimum Font Warning:</b> Current browser settings include a minimum font size setting that is too large. This will block the display of row, column, and covariate bar labels in the NG-CHM application. You may wish to turn off or adjust this setting in your browser."
			msgFound = true;
			warningsFound++;
		} 
		if (UTIL.minLabelSize > 5) {
			if (msgFound) { warningText = warningText+"<br>" }
			warningText = warningText+"<br><b>Minimum Font Warning:</b> Current browser settings include a minimum font size setting. This may interfere with the display of row, column, and covariate bar labels in the NG-CHM application. You may wish to turn off or adjust this setting in your browser."
			msgFound = true;
			warningsFound++;
		}
	}
	if (warningsFound > 2) {
		headingText = headingText+"s"
	}
	UHM.setMessageBoxHeader(headingText);
	UHM.setMessageBoxText(warningText);
	UHM.setMessageBoxButton(3, UTIL.imageTable.prefCancel, "Cancel button", UHM.messageBoxCancel);
	UHM.displayMessageBox();
    UIMGR.redrawCanvases();
}

/*===========================================================
 * 
 * LINKOUT HELP MENU ITEM FUNCTIONS
 * 
 *===========================================================*/

/**********************************************************************************
 * FUNCTION - openLinkoutHelp: The purpose of this function is to construct an 
 * HTML tables for plugins associated with the current heat map AND plugins 
 * installed for the NG-CHM instance. Then the logic to display the linkout 
 * help box is called. 
 **********************************************************************************/
UHM.openLinkoutHelp = function() {
	UHM.closeMenu();
	var mapLinksTbl = UHM.openMapLinkoutsHelp();
	var allLinksTbl = UHM.openAllLinkoutsHelp();
	UHM.linkoutHelp(mapLinksTbl,allLinksTbl);
    UIMGR.redrawCanvases();
}

/**********************************************************************************
 * FUNCTION - openMapLinkoutsHelp: The purpose of this function is to construct an 
 * HTML table object containing all of the linkout plugins that apply to a 
 * particular heat map. The table is created and then passed on to a linkout
 * popup help window.
 **********************************************************************************/
UHM.openMapLinkoutsHelp = function() {
	const heatMap = MMGR.getHeatMap();
	var validPluginCtr = 0;
	var pluginTbl = document.createElement("TABLE");
	var rowLabels = heatMap.getRowLabels().label_type;
	var colLabels = heatMap.getColLabels().label_type;
	pluginTbl.insertRow().innerHTML = UHM.formatBlankRow();
	var tr = pluginTbl.insertRow();
	var tr = pluginTbl.insertRow();
	for (var i=0;i<CUST.customPlugins.length;i++) {
		var plugin = CUST.customPlugins[i];
		var rowPluginFound = UHM.isPluginFound(plugin, rowLabels);
		var colPluginFound = UHM.isPluginFound(plugin, colLabels);
		var matrixPluginFound = UHM.isPluginMatrix(plugin);
		var axesFound = matrixPluginFound && rowPluginFound && colPluginFound ? "Row, Column, Matrix" : rowPluginFound && colPluginFound ? "Row, Column" : rowPluginFound ? "Row" : colPluginFound ? "Column" : "None";
		//If there is at least one available plugin, fill table with plugin rows containing 5 cells
		if (rowPluginFound || colPluginFound) {
			//If first plugin being written to table, write header row.
			if (validPluginCtr === 0) {
				tr.className = "chmHdrRow";
				let td = tr.insertCell(0);
				td.innerHTML = "<b>Plug-in Axes</b>";
				td = tr.insertCell(0);
				td.innerHTML = "<b>Description</b>";
				td = tr.insertCell(0);
				td.innerHTML = "<b>Plug-in Name and Website</b>";
				td.setAttribute("colspan", 2);
			}
			validPluginCtr++;
			//If there is no plugin logo, replace it with hyperlink using plugin name
			var logoImage = typeof plugin.logo !== 'undefined' ? "<img src='"+ plugin.logo+"' onerror='this.onerror=null; this.remove();' width='100px'>" : "<b>" + plugin.name + "</b>";
			var hrefSite = typeof plugin.site !== 'undefined' ? "<a href='"+plugin.site+"' target='_blank'> " : "<a>";
			var logo = hrefSite + logoImage + "</a>";
			var tr = pluginTbl.insertRow();
			tr.className = "chmTblRow";
			var tdLogo = tr.insertCell(0);
			tdLogo.className = "chmTblCell";
			tdLogo.innerHTML = logo;
			var tdName = tr.insertCell(1);
			tdName.className = "chmTblCell";
			tdName.style.fontWeight="bold";
			tdName.innerHTML = typeof plugin.site !== 'undefined' ? "<a href='" + plugin.site + "' target='_blank'>" + plugin.name + "</a>" : plugin.name;
			var tdDesc = tr.insertCell(2);
			tdDesc.className = "chmTblCell";
			tdDesc.innerHTML = plugin.description;
			var tdAxes = tr.insertCell(3);
			tdAxes.className = "chmTblCell";
			tdAxes.innerHTML = axesFound;
		} 
	}
	if (validPluginCtr === 0) {
		var tr = pluginTbl.insertRow();
		tr.className = "chmTblRow";
		var tdLogo = tr.insertCell(0);
		tdLogo.className = "chmTblCell";
		tdLogo.innerHTML = "<B>NO AVAILABLE PLUGINS WERE FOUND FOR THIS HEATMAP</B>";

	}
	return pluginTbl;
}

/**********************************************************************************
 * FUNCTION - openAllLinkoutsHelp: The purpose of this function is to construct an 
 * HTML table object containing all of the linkout plugins that are installed for
 * the NG-CHM instance. The table is created and then passed on to a linkout
 * popup help window.
 **********************************************************************************/
UHM.openAllLinkoutsHelp = function() {
	var validPluginCtr = 0;
	var pluginTbl = document.createElement("TABLE");
	pluginTbl.id = 'allPlugins';
	pluginTbl.insertRow().innerHTML = UHM.formatBlankRow();
	var tr = pluginTbl.insertRow();
	var tr = pluginTbl.insertRow();
	for (var i=0;i<CUST.customPlugins.length;i++) {
		var plugin = CUST.customPlugins[i];
			//If first plugin being written to table, write header row.
			if (validPluginCtr === 0) {
				tr.className = "chmHdrRow";
				let td = tr.insertCell(0);
				td.innerHTML = "<b>Description</b>";
				td = tr.insertCell(0);
				td.innerHTML = "<b>Plug-in Name and Website</b>";
				td.setAttribute('colspan', 2);
			}
			validPluginCtr++;
			//If there is no plugin logo, replace it with hyperlink using plugin name
			var logoImage = typeof plugin.logo !== 'undefined' ? "<img src='"+ plugin.logo+"' onerror='this.onerror=null; this.remove();' width='100px'>" : "<b>" + plugin.name + "</b>";
			var hrefSite = typeof plugin.site !== 'undefined' ? "<a href='"+plugin.site+"' target='_blank'> " : "<a>";
			var logo = hrefSite + logoImage + "</a>";
			var tr = pluginTbl.insertRow();
			tr.className = "chmTblRow";
			var tdLogo = tr.insertCell(0);
			tdLogo.className = "chmTblCell";
			tdLogo.innerHTML = logo;
			var tdName = tr.insertCell(1);
			tdName.className = "chmTblCell";
			tdName.style.fontWeight="bold";
			tdName.innerHTML = typeof plugin.site !== 'undefined' ? "<a href='" + plugin.site + "' target='_blank'>" + plugin.name + "</a>" : plugin.name;
			var tdDesc = tr.insertCell(2);
			tdDesc.className = "chmTblCell";
			tdDesc.innerHTML = plugin.description;
	}
	return pluginTbl;
}

/**********************************************************************************
 * FUNCTION - isPluginFound: The purpose of this function is to check to see if 
 * a given plugin is applicable for the current map based upon the label types.
 * Row or column label types are passed into this function.
 **********************************************************************************/
UHM.isPluginFound = function(plugin,labels) {
	var pluginFound = false;
	if (plugin.name === "TCGA") {
		for (var l=0;l<labels.length;l++) {
			var tcgaBase = "bio.tcga.barcode.sample";
			if (labels[l] === tcgaBase) {
				pluginFound = true;
			}
			if (typeof CUST.subTypes[tcgaBase] !== 'undefined') {
				for(var m=0;m<CUST.subTypes[tcgaBase].length;m++) {
					var subVal = CUST.subTypes[tcgaBase][m];
					if (labels[l] === subVal) {
						pluginFound = true;
					}
				}
			}
		}
	} else {
		for (var k=0;k<plugin.linkouts.length;k++) {
			var typeN = plugin.linkouts[k].typeName;
			for (var l=0;l<labels.length;l++) {
				var labelVal = labels[l];
				if (labelVal === typeN) {
					pluginFound = true;
				}
				if (typeof CUST.superTypes[labelVal] !== 'undefined') {
					for(var m=0;m<CUST.superTypes[labelVal].length;m++) {
						var superVal = CUST.superTypes[labelVal][m];
						if (superVal === typeN) {
							pluginFound = true;
						}
					}
				}
			}
		}
	}
	return pluginFound;
}

/**********************************************************************************
 * FUNCTION - isPluginMatrix: The purpose of this function is to determine whether
 * a given plugin is also a Matrix plugin.
 **********************************************************************************/
UHM.isPluginMatrix = function(plugin) {
	var pluginMatrix = false;
	if (typeof plugin.linkouts !== 'undefined') {
	for (var k=0;k<plugin.linkouts.length;k++) {
		var pluginName = plugin.linkouts[k].menuEntry;
		for (var l=0;l<linkouts.Matrix.length;l++) {
			var matrixName = linkouts.Matrix[l].title;
			if (pluginName === matrixName) {
				pluginMatrix = true;
			}
		}
	}
	}
	return pluginMatrix;
}

/**********************************************************************************
 * FUNCTION - linkoutHelp: The purpose of this function is to load and make visible
 * the linkout help popup window.
 **********************************************************************************/
UHM.linkoutHelp = function(mapLinksTbl, allLinksTbl) {
	var linkBox = document.getElementById('linkBox');
	var linkBoxHdr = document.getElementById('linkBoxHdr');
	var linkBoxTxt = document.getElementById('linkBoxTxt');
	var linkBoxAllTxt = document.getElementById('linkBoxAllTxt');
	var pluginCtr = allLinksTbl.rows.length;
	var headerpanel = document.getElementById('mdaServiceHeader');
	UTIL.hideLoader();
	linkBox.classList.add ('hide');
	linkBox.style.top = (headerpanel.offsetTop + 15) + 'px';
	linkBox.style.right = "5%";
	linkBoxHdr.innerHTML = "NG-CHM Plug-in Information";
	if (linkBoxHdr.querySelector(".closeX")) { linkBoxHdr.querySelector(".closeX").remove();}
	linkBoxHdr.appendChild(UHM.createCloseX(UHM.linkBoxCancel));
	linkBoxTxt.innerHTML = "";
	linkBoxTxt.appendChild(mapLinksTbl);
	mapLinksTbl.style.width = '100%';
	linkBoxAllTxt.innerHTML = "";
	linkBoxAllTxt.appendChild(allLinksTbl);
	allLinksTbl.style.width = '100%';
	UHM.linkBoxSizing();
	UHM.hideAllLinks();
	UHM.showMapPlugins();
	linkBox.classList.remove ('hide');
	linkBox.style.left = ((window.innerWidth - linkBox.offsetWidth) / 2) + 'px';
//	UTIL.dragElement(document.getElementById("linkBox"));
}

/*
  Returns a span with 'X' that can be used to close a dialog.
*/
UHM.createCloseX = function(closeFunction) {
	let closeX = document.createElement("span");
	closeX.setAttribute("class", "closeX");
	closeX.innerHTML = "&#x2715;"; // multiplication x 
	closeX.onclick = closeFunction;
	return closeX
}

/**********************************************************************************
 * FUNCTION - linkBoxCancel: The purpose of this function is to hide the linkout
 * help popup window.
 **********************************************************************************/
UHM.linkBoxCancel = function() {
	var linkBox = document.getElementById('linkBox');
	linkBox.classList.add ('hide');
}

/**********************************************************************************
 * FUNCTION - showMapPlugins: The purpose of this function is to show the map specific
 * plugins panel within the linkout help screen and toggle the appropriate
 * tab button.
 **********************************************************************************/
UHM.showMapPlugins = function() {
	//Turn off all tabs
	UHM.hideAllLinks();
	//Turn on map links div
	var linkBoxTxt = document.getElementById('linkBoxTxt');
	var mapLinksBtn = document.getElementById("mapLinks_btn");
	mapLinksBtn.setAttribute('src', 'images/mapLinksOn.png');
	linkBoxTxt.classList.remove('hide');
}

/**********************************************************************************
 * FUNCTION - showAllPlugins: The purpose of this function is to show the all
 * plugins installed panel within the linkout help screen and toggle the appropriate
 * tab button.
 **********************************************************************************/
UHM.showAllPlugins = function() {
	//Turn off all tabs
	UHM.hideAllLinks();
	//Turn on all links div
	var linkBoxAllTxt = document.getElementById('linkBoxAllTxt');
	var allLinksBtn = document.getElementById("allLinks_btn");
	allLinksBtn.setAttribute('src', 'images/allLinksOn.png');
	linkBoxAllTxt.classList.remove ('hide');
}

/**********************************************************************************
 * FUNCTION - hideAllLinks: The purpose of this function is to hide the linkout
 * help boxes and reset the tabs associated with them.
 **********************************************************************************/
UHM.hideAllLinks = function() {
	var linkBoxTxt = document.getElementById('linkBoxTxt');
	var linkBoxAllTxt = document.getElementById('linkBoxAllTxt');
	var mapLinksBtn = document.getElementById("mapLinks_btn");
	var allLinksBtn = document.getElementById("allLinks_btn");
	mapLinksBtn.setAttribute('src', 'images/mapLinksOff.png');
	linkBoxTxt.classList.add ('hide');
	allLinksBtn.setAttribute('src', 'images/allLinksOff.png');
	linkBoxAllTxt.classList.add ('hide');
}

/**********************************************************************************
 * FUNCTION - linkBoxSizing: The purpose of this function is to size the height
 * of the linkout help popup window depending on the number of plugins to be 
 * listed.
 **********************************************************************************/
UHM.linkBoxSizing = function() {
	var linkBox = document.getElementById('linkBox');
	var pluginCtr = 0;
	if (document.getElementById('allPlugins') !== null) {
		pluginCtr = document.getElementById('allPlugins').rows.length;
	}
	var linkBoxTxt = document.getElementById('linkBoxTxt');
	var linkBoxAllTxt = document.getElementById('linkBoxAllTxt');
	var container = document.getElementById('ngChmContainer');
	var contHeight = container.offsetHeight;
	if (pluginCtr === 0) {
		var boxHeight = contHeight *.30;
		var boxTextHeight = boxHeight * .40;
		if (boxHeight < 150) {
			boxHeight = contHeight *.35;
			boxTextHeight = boxHeight * .20;
		}
		linkBox.style.height = boxHeight;
		linkBoxTxt.style.height = boxTextHeight;
	} else {
		var boxHeight = contHeight *.92;
		linkBox.style.height = boxHeight;
		var boxTextHeight = boxHeight * .80;
		if (MMGR.embeddedMapName !== null) {
			boxTextHeight = boxHeight *.60;
		}
		if (boxHeight < 400) {
			if (MMGR.embeddedMapName !== null) {
				boxTextHeight = boxHeight *.60;
			} else {
				boxTextHeight = boxHeight * .70;
			}
		}
		linkBoxTxt.style.height = boxTextHeight;
		linkBoxAllTxt.style.height = boxTextHeight;
	}
}

})();
