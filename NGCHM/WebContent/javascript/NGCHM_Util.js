/**
 * General purpose javascript helper funcitons
 */

//Define Namespace for NgChm UTIL
NgChm.createNS('NgChm.UTIL');

//Get a value for a parm passed in the URL.
NgChm.UTIL.getURLParameter = function(name) {
  return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||'';
}

/**********************************************************************************
 * FUNCTION - toTitleCase: The purpose of this function is to change the case of
 * the first letter of the first word in each sentence passed in.
 **********************************************************************************/
NgChm.UTIL.toTitleCase = function(string) {
    // \u00C0-\u00ff for a happy Latin-1
    return string.toLowerCase().replace(/_/g, ' ').replace(/\b([a-z\u00C0-\u00ff])/g, function (_, initial) {
        return initial.toUpperCase();
    }).replace(/(\s(?:de|a|o|e|da|do|em|ou|[\u00C0-\u00ff]))\b/ig, function (_, match) {
        return match.toLowerCase();
    });
}

/**********************************************************************************
 * FUNCTION - getStyle: The purpose of this function is to return the style 
 * property requested for a given screen object.
 **********************************************************************************/
NgChm.UTIL.getStyle = function(x,styleProp) {
    if (x.currentStyle)
        var y = x.currentStyle[styleProp];
    else if (window.getComputedStyle)
        var y = document.defaultView.getComputedStyle(x,null).getPropertyValue(styleProp);
    return y;
}

/**********************************************************************************
 * FUNCTION - returnToHome: The purpose of this function is to open a "home" URL
 * in the same tab as the heatMap (when a link is present).
 **********************************************************************************/
NgChm.UTIL.returnToHome = function() {
	var collectionhomeurl = NgChm.UTIL.getURLParameter("collectionHome");
	if (collectionhomeurl !== "") {
		window.open(collectionhomeurl,"_self");
	}
}

/**********************************************************************************
 * FUNCTION - ReverseObject: The purpose of this function is to reverse the order
 * of key elements in an object.
 **********************************************************************************/
NgChm.UTIL.reverseObject = function(Obj) {
    var TempArr = [];
    var NewObj = [];
    for (var Key in Obj){
        TempArr.push(Key);
    }
    for (var i = TempArr.length-1; i >= 0; i--){
        NewObj[TempArr[i]] = [];
    }
    return NewObj;
}

/**********************************************************************************
 * FUNCTION - getLabelText: The purpose of this function examine label text and 
 * shorten the text if the label exceeds the 20 character allowable length.  If the
 * label is in excess, the first 9 and last 8 characters will be written out 
 * separated by ellipsis (...);
 **********************************************************************************/
NgChm.UTIL.getLabelText = function(text,type) { 
	var size = parseInt(NgChm.heatMap.getColConfig().label_display_length);
	var elPos = NgChm.heatMap.getColConfig().label_display_method;
	if (type.toUpperCase() === "ROW") {
		size = parseInt(NgChm.heatMap.getRowConfig().label_display_length);
		elPos = NgChm.heatMap.getRowConfig().label_display_method;
	}
	if (text.length > size) {
		if (elPos === 'END') {
			text = text.substr(0,size - 3)+"...";
		} else if (elPos === 'MIDDLE') {
			text = text.substr(0,(size/2 - 1))+"..."+text.substr(text.length-(size/2 - 2),text.length);
		} else {
			text = "..."+text.substr(text.length - (size - 3), text.length);
		}
	}
	return text;
}

/**********************************************************************************
 * FUNCTION - isScreenZoomed: The purpose of this function is to determine if the 
 * browser zoom level, set by the user, is zoomed (other than 100%)
 **********************************************************************************/
NgChm.UTIL.isScreenZoomed = function () {
	var zoomVal = 0;
	if (window.devicePixelRatio < .89) {
		zoomVal = -1;
	} else if (window.devicePixelRatio > 1.375) {
		zoomVal = 1;
	}
	return zoomVal;
}

/**********************************************************************************
 * FUNCTION - getBrowserType: The purpose of this function is to determine the type
 * of web browser being utilized and return that value as a string.
 **********************************************************************************/
NgChm.UTIL.getBrowserType = function () { 
	var type = 'unknown';
    if((navigator.userAgent.indexOf("Opera") || navigator.userAgent.indexOf('OPR')) != -1 ) {
       type = 'Opera';
    } else if(navigator.userAgent.indexOf("Chrome") != -1 ) {
        type = 'Chrome';
    } else if(navigator.userAgent.indexOf("Safari") != -1) {
        type = 'Safari';
    } else if(navigator.userAgent.indexOf("Firefox") != -1 )  {
        type = 'Firefox';
    } else if((navigator.userAgent.indexOf("MSIE") != -1 ) || (!!document.documentMode == true )) {
    	type = 'IE';
    } 
    return type;
}

/**********************************************************************************
 * FUNCTION - setBrowserMinFontSize: The purpose of this function is to determine if the 
 * user has set a minimum font size on their browser and set the detail minimum label
 * size accordingly.
 **********************************************************************************/
NgChm.UTIL.setBrowserMinFontSize = function () {
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

/**********************************************************************************
 * FUNCTION - iESupport: The purpose of this function is to allow for the support
 * of javascript functions that Internet Explorer does not recognize.
 **********************************************************************************/
NgChm.UTIL.iESupport = function () {
	if (!String.prototype.startsWith) {
	    String.prototype.startsWith = function(searchString, position){
	      position = position || 0;
	      return this.substr(position, searchString.length) === searchString;
	  };
	}
	
	if (!Element.prototype.remove) {
 		Element.prototype.remove = function() {
 		    this.parentElement.removeChild(this);
 		};
	}
}

/**********************************************************************************
 * FUNCTION - startupChecks: The purpose of this function is to check for warning
 * conditions that will be flagged for a given heat map at startup.  These include:
 * Browser type = IE, zoom level other than 100%, and a minimum font size browser
 * setting greater than 5pt.
 **********************************************************************************/
NgChm.UTIL.startupChecks = function () {
	var warningsRequired = false;
	var msgButton = document.getElementById('messageOpen_btn');
	if (NgChm.UTIL.getBrowserType() === 'IE') {
    	warningsRequired = true;
	}
    if (NgChm.DET.minLabelSize > 5) {
    	warningsRequired = true;
    }
    
    if (warningsRequired) {
    	msgButton.style.display = ''; 
    } else {
    	msgButton.style.display = 'none'; 
    }
}

/**********************************************************************************
 * FUNCTION - blendTwoColors: The purpose of this function is to blend two 6-character
 * hex color code values into a single value that is half way between.
 **********************************************************************************/
NgChm.UTIL.blendTwoColors = function(color1, color2) {
    // check input
    color1 = color1 || '#000000';
    color2 = color2 || '#ffffff';
    percentage = 0.5;

    //convert colors to rgb
    color1 = color1.substring(1);
    color2 = color2.substring(1);   
    color1 = [parseInt(color1[0] + color1[1], 16), parseInt(color1[2] + color1[3], 16), parseInt(color1[4] + color1[5], 16)];
    color2 = [parseInt(color2[0] + color2[1], 16), parseInt(color2[2] + color2[3], 16), parseInt(color2[4] + color2[5], 16)];

    //blend colors
    var color3 = [ 
        (1 - percentage) * color1[0] + percentage * color2[0], 
        (1 - percentage) * color1[1] + percentage * color2[1], 
        (1 - percentage) * color1[2] + percentage * color2[2]
    ];
    //Convert to hex
    color3 = '#' + NgChm.UTIL.intToHex(color3[0]) + NgChm.UTIL.intToHex(color3[1]) + NgChm.UTIL.intToHex(color3[2]);
    // return hex
    return color3;
}

/**********************************************************************************
 * FUNCTION - intToHex: The purpose of this function is to convert integer
 * value into a hex value;
 **********************************************************************************/
NgChm.UTIL.intToHex = function(num) {
    var hex = Math.round(num).toString(16);
    if (hex.length == 1)
        hex = '0' + hex;
    return hex;
}

/**********************************************************************************
 * FUNCTION - convertToArray: The purpose of this function is to convert a single
 * var value into an array containing just that value.  It is used for compatibility
 * management.
 **********************************************************************************/
NgChm.UTIL.convertToArray = function(value) {
	var valArr = [];
	valArr.push(value);
	return valArr;
}

/**********************************************************************************
 * FUNCTION - onLoadCHM: This function performs "on load" processing for the NG_CHM
 * Viewer.  It will load either the file mode viewer, standard viewer, or widgetized
 * viewer.  
 **********************************************************************************/
NgChm.UTIL.onLoadCHM = function (sizeBuilderView) {
	//Call functions that enable viewing in IE.
	NgChm.UTIL.iESupport();
	NgChm.UTIL.setBrowserMinFontSize();
	//Run startup checks that enable startup warnings button.
	NgChm.UTIL.startupChecks();
	// See if we are running in file mode AND not from "widgetized" code - launcHed locally rather than from a web server (
	if ((NgChm.UTIL.getURLParameter('map') === "") && (NgChm.MMGR.embeddedMapName === null)) {
		//In local mode, need user to select the zip file with data (required by browser security)
		var chmFileItem  = document.getElementById('fileButton');
		document.getElementById('fileOpen_btn').style.display = '';
		chmFileItem.style.display = '';
		chmFileItem.addEventListener('change', NgChm.UTIL.loadFileModeCHM, false);
	} else {
		document.getElementById('loader').style.display = '';
		//Run from a web server.
		var mapName = NgChm.UTIL.getURLParameter('map');
		var dataSource = NgChm.MMGR.WEB_SOURCE;
		if ((NgChm.MMGR.embeddedMapName !== null) && (ngChmWidgetMode !== "web")) { 
			mapName = NgChm.MMGR.embeddedMapName;
			dataSource = NgChm.MMGR.FILE_SOURCE;
			var embedButton = document.getElementById('NGCHMEmbedButton');
			if (embedButton !== null) {
				document.getElementById('NGCHMEmbed').style.display = 'none';
			} else {
				document.getElementById('NGCHMEmbed').style.display = '';
				NgChm.UTIL.loadLocalModeCHM(sizeBuilderView);
			}
		} else {  
			// New temp
			//		}  // old put back
			if (NgChm.MMGR.embeddedMapName !== null) {
				mapName = NgChm.MMGR.embeddedMapName;
				dataSource = NgChm.MMGR.LOCAL_SOURCE;
			}
			var matrixMgr = new NgChm.MMGR.MatrixManager(dataSource);
			if (!NgChm.SEL.isSub) {
				NgChm.heatMap = matrixMgr.getHeatMap(mapName, NgChm.SUM.processSummaryMapUpdate);
				NgChm.heatMap.addEventListener(NgChm.DET.processDetailMapUpdate);
				NgChm.SUM.initSummaryDisplay();
			} else {  // separated detail browser 
				NgChm.heatMap = matrixMgr.getHeatMap(mapName, NgChm.DET.processDetailMapUpdate);
			}
			NgChm.DET.initDetailDisplay();
		}

		NgChm.SEL.setupLocalStorage();
		document.getElementById("container").addEventListener('wheel', NgChm.SEL.handleScroll, false);	
		document.getElementById("detail_canvas").focus();
	} // NewTemp

}

/**********************************************************************************
 * FUNCTION - loadLocalModeCHM: This function is called when running in local file mode and 
 * with the heat map embedded in a "widgetized" web page.
 **********************************************************************************/
NgChm.UTIL.loadLocalModeCHM = function (sizeBuilderView) {
	//Special case for embedded version where a blob is passed in.
	if (NgChm.MMGR.embeddedMapName instanceof Blob) {
		NgChm.UTIL.loadBlobModeCHM(sizeBuilderView)
		return;
	}
	
	//Else, fetch the .ngchm file
	var req = new XMLHttpRequest();
	req.open("GET", NgChm.MMGR.localRepository+"/"+NgChm.MMGR.embeddedMapName);
	req.responseType = "blob";
	req.onreadystatechange = function () {
		if (req.readyState == req.DONE) {
			if (req.status != 200) {
				console.log('Failed in call to get NGCHM from server: ' + req.status);
				document.getElementById('loader').innerHTML = "Failed in call to get NGCHM from server";
			} else {
				var chmBlob  =  new Blob([req.response],{type:'application/zip'});  // req.response;
				var chmFile  =  new File([chmBlob], NgChm.MMGR.embeddedMapName);
				NgChm.UTIL.resetCHM();
				var split = chmFile.name.split("."); 
				if (split[split.length-1].toLowerCase() !== "ngchm"){ // check if the file is a .ngchm file
					NgChm.UHM.invalidFileFormat();
				} else {
					NgChm.UTIL.displayFileModeCHM(chmFile,sizeBuilderView);
				}
			}
		}
	};	
	req.send();	
}

/**********************************************************************************
 * FUNCTION - loadCHMFromBlob: Works kind of like local mode but works when javascript
 * passes in the ngchm as a blob.
 **********************************************************************************/
NgChm.UTIL.loadBlobModeCHM = function (sizeBuilderView) {
	var chmFile  =  new File([NgChm.MMGR.embeddedMapName], "ngchm");
	NgChm.UTIL.resetCHM();
	NgChm.UTIL.displayFileModeCHM(chmFile,sizeBuilderView);
}

/**********************************************************************************
 * FUNCTION - loadFileModeCHM: This function is called when running in stand-alone
 * file mode and  user selects the chm data .zip file.
 **********************************************************************************/
NgChm.UTIL.loadFileModeCHM = function () {
	document.getElementById('loader').style.display = '';
	var chmFile  = document.getElementById('chmFile').files[0];
	var split = chmFile.name.split("."); 
	if (split[split.length-1].toLowerCase() !== "ngchm"){ // check if the file is a .ngchm file
		NgChm.UHM.invalidFileFormat();
	} else {
		NgChm.UTIL.displayFileModeCHM(chmFile);
		NgChm.SEL.openFileToggle();
	}
}

/**********************************************************************************
 * FUNCTION - displayFileModeCHM: This function performs functions shared by the
 * stand-alone and widgetized "file" versions of the application.
 **********************************************************************************/
NgChm.UTIL.displayFileModeCHM = function (chmFile, sizeBuilderView) {
	var matrixMgr = new NgChm.MMGR.MatrixManager(NgChm.MMGR.FILE_SOURCE);
	zip.useWebWorkers = false;
	if (!NgChm.SEL.isSub) {
		NgChm.heatMap = matrixMgr.getHeatMap("",  NgChm.SUM.processSummaryMapUpdate, chmFile);
		NgChm.heatMap.addEventListener(NgChm.DET.processDetailMapUpdate);
		if ((typeof sizeBuilderView !== 'undefined') && (sizeBuilderView)) {
			NgChm.heatMap.addEventListener(NgChm.UTIL.builderViewSizing);
		}
		NgChm.SUM.initSummaryDisplay();
	} else { // separated detail browser
		NgChm.heatMap = matrixMgr.getHeatMap("",  NgChm.DET.processDetailMapUpdate, chmFile);			
	}	
	NgChm.DET.initDetailDisplay();
}

/**********************************************************************************
 * FUNCTION - builderViewSizing: This function handles the resizing of the summary
 * panel for the builder in cases where ONLY the summary panel is being drawn.  
 **********************************************************************************/
NgChm.UTIL.builderViewSizing = function (event, level) {
	if (event == NgChm.MMGR.Event_INITIALIZED) {
		document.getElementById('detail_chm').style.width = '4%';
		document.getElementById('summary_chm').style.width = '75%';
		NgChm.SUM.summaryResize();  
	 }
}


/**********************************************************************************
 * FUNCTION - chmResize: This function handles the resizing of the NG-CHM Viewer.  
 **********************************************************************************/
NgChm.UTIL.chmResize = function () {
		if ((NgChm.SUM.rowDendro === null) || (NgChm.SUM.colDendro === null)) {
			return;
		}
 		NgChm.SUM.summaryResize();
 		NgChm.DET.detailResize();
 		NgChm.UPM.prefsResize();
 		NgChm.DET.detailResize();
 		if (document.getElementById('linkBox').style.display !== 'none') {
 			NgChm.UHM.linkBoxSizing();
 		}
}

/**********************************************************************************
 * FUNCTION - resetCHM: This function will reload CHM SelectionManager parameters 
 * when loading a file mode heatmap.  Specifically for handling the case where switching 
 * from one file-mode heatmap to another
 **********************************************************************************/
NgChm.UTIL.resetCHM = function () {
		NgChm.SEL.mode = 'NORMAL';      
		NgChm.SEL.currentDl = "dl1"; 
		NgChm.SEL.currentRow=null; 
		NgChm.SEL.currentCol=null; 
		NgChm.SEL.dataPerRow=null; 
		NgChm.SEL.dataPerCol=null; 
		NgChm.SEL.selectedStart=0; 
		NgChm.SEL.selectedStop=0; 
		NgChm.SEL.searchItems={};
		NgChm.SEL.isSub = false; 
		NgChm.SEL.hasSub = false;  
		NgChm.SEL.scrollTime = null; 
	NgChm.SUM.colDendro = null;
	NgChm.SUM.rowDendro = null;
}

/**********************************************************************************
 * FUNCTION - shadeColor: This function darken or lighten a color given a percentage.
 * Percentages are represented from 0 to 100.  Positive percentages lighten a color 
 * (100 = white) and negative percentages will darken a color (-100 = black).
 **********************************************************************************/
NgChm.UTIL.shadeColor = function (color, pct) {   
	var percent = pct/100;
    var f=parseInt(color.slice(1),16),t=percent<0?0:255,p=percent<0?percent*-1:percent,R=f>>16,G=f>>8&0x00FF,B=f&0x0000FF;
    return "#"+(0x1000000+(Math.round((t-R)*p)+R)*0x10000+(Math.round((t-G)*p)+G)*0x100+(Math.round((t-B)*p)+B)).toString(16).slice(1);
}


/**********************************************************************************
 * BEGIN: EMBEDDED MAP FUNCTIONS AND GLOBALS
 * 
 * embedLoaded: Global for whether a given iFrame's heat map has been loaded already.  
 * We only only load once.
 * 
 **********************************************************************************/
NgChm.UTIL.embedLoaded = false;
NgChm.UTIL.embedThumbSize = '75px';

/**********************************************************************************
 * FUNCTION - embedCHM: This function is a special pre-processing function for the
 * widgetized version of the NG-CHM Viewer.  It will take the map name provided 
 * by the user (embedded in an unaffiliated web page) and pass that on to the 
 * on load processing for the viewer.  repository (default .) is the path to the
 * directory containing the specified map.
 **********************************************************************************/
NgChm.UTIL.embedCHM = function (map, repository, sizeBuilderView) {
	NgChm.MMGR.embeddedMapName = map;
	NgChm.MMGR.localRepository = repository || ".";
	//Reset dendros for local/widget load
	NgChm.SUM.colDendro = null;
	NgChm.SUM.rowDendro = null;
	NgChm.DET.colDendro = null;
	NgChm.DET.rowDendro = null;
	NgChm.UTIL.onLoadCHM(sizeBuilderView);
}

/**********************************************************************************
 * FUNCTION - showEmbed: This function shows the embedded heat map when the
 * user clicks on the embedded map image.
 **********************************************************************************/
NgChm.UTIL.showEmbed = function (baseDiv) {
	var embeddedWrapper = document.getElementById('NGCHMEmbedWrapper');
	NgChm.UTIL.embedThumbSize = embeddedWrapper.style.height;
	var embeddedCollapse = document.getElementById('NGCHMEmbedCollapse');
	var embeddedMap = document.getElementById('NGCHMEmbed');
	var iFrame = window.frameElement; // reference to iframe element container
	iFrame.style.height = '100%';
	embeddedMap.style.height = '90%';
	embeddedMap.style.width = '90%';
	embeddedMap.style.display = '';
	embeddedWrapper.style.display = 'none';
	embeddedCollapse.style.display = '';
	if (NgChm.UTIL.embedLoaded === false) {
		NgChm.UTIL.embedLoaded = true;
		NgChm.UTIL.loadLocalModeCHM(false);
	}
}

/**********************************************************************************
 * FUNCTION - hideEmbed: This function hides the embedded map when the user 
 * clicks on the collapse map button.
 **********************************************************************************/
NgChm.UTIL.hideEmbed = function (baseDiv) {
	var iFrame = window.frameElement; // reference to iframe element container
	var embeddedWrapper = document.getElementById('NGCHMEmbedWrapper');
	iFrame.style.height = NgChm.UTIL.embedThumbSize;
	embeddedWrapper.style.height = NgChm.UTIL.embedThumbSize;
	embeddedWrapper.style.width = NgChm.UTIL.embedThumbSize;
	var embeddedMap = document.getElementById('NGCHMEmbed');
	embeddedMap.style.height = NgChm.UTIL.embedThumbSize;
	embeddedWrapper.style.height = NgChm.UTIL.embedThumbSize;
	embeddedWrapper.style.width = NgChm.UTIL.embedThumbSize;
	var embeddedCollapse = document.getElementById('NGCHMEmbedCollapse');
	embeddedMap.style.display = 'none';
	embeddedCollapse.style.display = 'none';
	embeddedWrapper.style.display = '';
}

/**********************************************************************************
 * FUNCTION - embedExpandableMap: This function constructs the html for embedding
 * a heat map widget within an iFrame object.  The name of the div that the iframe
 * will reside in, the name of heat map ngchm file, and the name of the thumbnail
 * image file are required parameters.  The size for the thumbnail (in pixels) is
 * an optional parameter. 
 **********************************************************************************/
NgChm.UTIL.embedExpandableMap = function(baseDiv,ngchmFile,thumbFile,thumbSize) {
	if (typeof thumbSize !== 'undefined') {
		NgChm.UTIL.embedThumbSize = thumbSize;
	}
	var embeddedDiv = document.getElementById(baseDiv);
	var ngchmIFrame = document.createElement('iframe');
	ngchmIFrame.id = baseDiv+"_iframe";
	ngchmIFrame.scrolling = "no";
	ngchmIFrame.style = "height:"+NgChm.UTIL.embedThumbSize+"; width:100%; border-style:none; ";
	ngchmIFrame.sandbox = 'allow-scripts allow-same-origin allow-popups'; 
	embeddedDiv.appendChild(ngchmIFrame);
	var doc = ngchmIFrame.contentWindow.document;
	doc.open();
	doc.write("<HTML><BODY style='margin:0px'><div id='NGCHMEmbedWrapper' class='NGCHMEmbedWrapper' style='height: "+NgChm.UTIL.embedThumbSize+"; width: "+NgChm.UTIL.embedThumbSize+"'><img img id='NGCHMEmbedButton' src='"+thumbFile+"' alt='Show Heat Map' onclick='NgChm.UTIL.showEmbed(this);' /><div class='NGCHMEmbedOverlay' onclick='NgChm.UTIL.showEmbed(this);' ><div id='NGCHMEmbedOverText'>Expand<br>Map</div></div></div><div id='NGCHMEmbedCollapse' style='display: none;width: 100px; height: 20px;'><img img id='NGCHMEmbedButton' src='images/buttonCollapseMap.png' alt='Collapse Heat Map' onclick='NgChm.UTIL.hideEmbed();' /></div><br/><div id='NGCHMEmbed' style='display: none; background-color: white; height: 5%; width: 100%; border: 2px solid gray; padding: 5px'></div><script src='ngchmWidget-min.js'><\/script><script type='text/Javascript'>NgChm.UTIL.embedCHM('"+ngchmFile+"');<\/script></BODY></HTML>");
	doc.close();
}

/**********************************************************************************
 * END: EMBEDDED MAP FUNCTIONS AND GLOBALS
 **********************************************************************************/

