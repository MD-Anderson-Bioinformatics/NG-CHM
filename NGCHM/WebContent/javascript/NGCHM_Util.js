(function() {
    'use strict';
    NgChm.markFile();

    /**
     * General purpose javascript helper funcitons
     */

    //Define Namespace for NgChm UTIL
    const UTIL = NgChm.createNS('NgChm.UTIL');

    const PANE = NgChm.importNS('NgChm.Pane');
    const SUM = NgChm.importNS('NgChm.SUM');
    const DET = NgChm.importNS('NgChm.DET');
    const SRCH = NgChm.importNS('NgChm.SRCH');
    const MMGR = NgChm.importNS('NgChm.MMGR');
    const DMM = NgChm.importNS('NgChm.DMM');
    const LNK = NgChm.importNS('NgChm.LNK');
    const RECPANES = NgChm.importNS('NgChm.RecPanes');
    const DEV = NgChm.importNS('NgChm.DEV');
    const UHM = NgChm.importNS('NgChm.UHM');
    const SEL = NgChm.importNS('NgChm.SEL');
    const CUST = NgChm.importNS('NgChm.CUST');

//Get a value for a parm passed in the URL.
UTIL.getURLParameter = function(name) {
  return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||'';
}

UTIL.mapId = UTIL.getURLParameter('map');
UTIL.mapNameRef = UTIL.getURLParameter('name');

UTIL.capitalize = function capitalize (str) {
	return str.substr(0,1).toUpperCase() + str.substr(1);
};

// UTIL.passiveCompat is a function that accepts an options
// object for addEventListener and depending on the browser's
// support for the passive flag returns either:
// the unmodified object (if the browser supports passive), or
// the truthiness of object.capture for backwards compatibility.
(function() {
	UTIL.passiveCompat = supportsPassive() ? f => f : f => !!f.capture;
	// Determine if the browser supports the passive flag.
	function supportsPassive() {

		var cold = false;
		const hike = function() {};

		try {
			var aid = Object.defineProperty({}, 'passive', {
				get() {cold = true}
			});
			window.addEventListener('test', hike, aid);
			window.removeEventListener('test', hike, aid);
		} catch (e) {}

		return cold;
	}
})();

// Load the dynamic script file.
UTIL.addScript = function(src, callback) {
	const head = document.getElementsByTagName('head')[0];
	const script = UTIL.newEl('script', { type: 'text/javascript', src });
	head.appendChild(script);
	// Most browsers:   NOTE: The next 2 lines of code are replaced when building ngchmApp.html and ngchmWidget-min.js (the "file mode" and "widget" versions of the application)
	script.onload = callback;
	// Internet explorer:
	script.onreadystatechange = function() { if (this.readyState == 'complete') { callback();}};  //Leave this as one line for filemode version app builder
};

UTIL.addScripts = function(srcs, callback) {
	UTIL.addScript(srcs[0], () => {
		if (srcs.length === 1) {
			callback();
		} else {
			UTIL.addScripts (srcs.slice(1), callback);
		}
	});
};

// Set the position and size of the DOM element el to the size in vp.
// If el is a canvas and styleOnly is not truthy, set the canvas
// width and height properties to the same width and height as el.
UTIL.setElementPositionSize = function (el, vp, styleOnly) {
	if (!el || !el.style) {
	    console.error ("setElemetPositionSize on non-element", el);
	    let foo = 1;
	}
	if (vp.left) el.style.left = vp.left + 'px';
	if (vp.top) el.style.top = vp.top + 'px';
	el.style.width = vp.width + 'px';
	el.style.height = vp.height + 'px';
	if (!styleOnly && el.tagName === 'CANVAS') {
		el.width = Math.round (vp.width);
		el.height = Math.round (vp.height);
	}
};

// Create a new text node.
UTIL.newTxt = function newTxt(txt) {
	return document.createTextNode(txt);
};

// Create a new DOM element.
//
// Spec consists of an element tag name,
//     optionally followed by a single '#' and node id,
//     followed by any number of '.' and class id.
// E.g. div#id.class1.class2
//
// Attrs is a dictionary of attributes to add to the new node.
//
// Content, if defined, is either a DOM node or an array of DOM nodes to
// include as children of the new DOM element.
//
// Fn, if defined, is a function that is called with the new node as a
// parameter after it's constructed but before it's returned.
//
UTIL.newElement = function newElement (spec, attrs, content, fn) {
	const classes = spec.split('.');
	const names = classes.shift().split('#');
	content = content || [];
	if (!Array.isArray(content)) content = [content];
	if (names.length > 2) {
		console.log ({ m: 'UTIL.newElement: too many ids', spec, attrs, names });
		throw new Error ('UTIL.newElement: too many ids');
	}
	const el = document.createElement(names[0]);
	if (names.length > 1) {
		el.setAttribute ('id', names[1]);
	}
	while (classes.length > 0) {
		el.classList.add (classes.shift());
	}
	if (attrs) {
		Object.entries(attrs).forEach(([key,value]) => {
			if (key === 'style') {
				Object.entries(value).forEach(([key,value]) => {
					el.style[key] = value;
				});
			} else if (key === 'dataset') {
				Object.entries(value).forEach(([key,value]) => {
					el.dataset[key] = value;
				});
			} else {
				el.setAttribute(key,value);
			}
		});
	}
	while (content.length > 0) {
		let c = content.shift();
		if (typeof c == "string") {
		    let tmp = document.createElement('div');
		    tmp.innerHTML = c;
		    while (tmp.firstChild) el.appendChild(tmp.firstChild);
		} else {
		    el.appendChild (c);
		}
	}
	if (fn) {
		const x = fn (el);
		if (x instanceof HTMLElement) {
			return x;
		} else {
			console.error (new Error('UTIL.newElement decorator function did not return a DOM node'));
		}
	}
	return el;
};

// Create a DOM fragment from an array of DOM nodes.
UTIL.newFragment = function newFragement (nodes) {
    const frag = document.createDocumentFragment();
    nodes.forEach (node => {
	frag.appendChild (node);
    });
    return frag;
};

// Create a new button element.
UTIL.newButton = function newButton (buttonName, properties, handlers) {
	const button = UTIL.newElement('SPAN.button', { }, [ UTIL.newTxt(buttonName) ]);
	for (const h of Object.entries(handlers)) {
		button.addEventListener (h[0], h[1]);
	}
	return button;
};

UTIL.chmResize = function() {
	if (PANE.resizeNGCHM) {
		PANE.resizeNGCHM ();
	}
};

/**********************************************************************************
 * FUNCTION - redrawCanvases: The purpose of this function is to redraw the various
 * wegGl canvases in the viewer. It is called to deal with blurring issues occuring
 * on the canvases when modal panels are drawn over the viewer canvases.
 **********************************************************************************/
UTIL.redrawCanvases = function () {
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
}

/**********************************************************************************
 * FUNCTION - toTitleCase: The purpose of this function is to change the case of
 * the first letter of the first word in each sentence passed in.
 **********************************************************************************/
UTIL.toTitleCase = function(string) {
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
UTIL.getStyle = function(x,styleProp) {
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
UTIL.returnToHome = function() {
	var collectionhomeurl = UTIL.getURLParameter("collectionHome");
	if (collectionhomeurl !== "") {
		window.open(collectionhomeurl,"_self");
	}
}

/**********************************************************************************
 * FUNCTION - ReverseObject: The purpose of this function is to reverse the order
 * of key elements in an object.
 **********************************************************************************/
UTIL.reverseObject = function(Obj) {
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
 * FUNCTION - isScreenZoomed: The purpose of this function is to determine if the 
 * browser zoom level, set by the user, is zoomed (other than 100%)
 **********************************************************************************/
UTIL.isScreenZoomed = function () {
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
UTIL.getBrowserType = function () {
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
 * FUNCTION - setMinFontSize: The purpose of this function is to determine if the
 * user has set a minimum font size on their browser and set the detail minimum label
 * size accordingly.
 **********************************************************************************/
    UTIL.minLabelSize = 5;
    function setMinFontSize () {
	  const minMinLabelSize = 5;
	  var minSettingFound = 0;
	  var el = document.createElement('div');
	  el.innerHTML = "<div><p>a b c d e f g h i j k l m n o p q r s t u v w x y z</p></div>";
	  el.style.position = 'absolute';
	  el.style.fontSize = '1px';
	  el.style.width = '64px';
	  document.body.appendChild(el);
	  var minimumHeight = el.offsetHeight;
	  var least = 0;
	  var most = 64;
	  var middle; 
	  for (var i = 0; i < 32 && most >= minMinLabelSize; ++i) {
	    middle = (least + most)/2;
	    el.style.fontSize = middle + 'px';
	    if (el.offsetHeight === minimumHeight) {
	      least = middle;
	    } else {
	      most = middle;
	    }
	  }
	  if (middle > minMinLabelSize) {
		  minSettingFound = middle;
		  UTIL.minLabelSize = Math.floor(middle) - 1;
	  }
	  document.body.removeChild(el);
	  return minSettingFound;
    }

/**********************************************************************************
 * FUNCTION - iESupport: The purpose of this function is to allow for the support
 * of javascript functions that Internet Explorer does not recognize.
 **********************************************************************************/
UTIL.iESupport = function () {
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
UTIL.startupChecks = function () {
	var warningsRequired = false;
	var msgButton = document.getElementById('messageOpen_btn');
	if (UTIL.getBrowserType() === 'IE') {
    	warningsRequired = true;
	}
    if (UTIL.minLabelSize > 5) {
    	warningsRequired = true;
    }
    
    if (msgButton != undefined) {
        if (warningsRequired) {
             msgButton.style.display = '';
         } else {
             msgButton.style.display = 'none';
         }
    }
}

// Panel interface configuration parameters that can be set by UTIL.editWidget:
UTIL.showSummaryPane = true;
UTIL.showDetailPane = true;

// Function configurePanelInterface must called once immediately after the HeatMap is loaded.
// It configures the initial Panel user interface according to the heat map preferences and
// the interface configuration parameters.
//
(function() {
	const debug = false;
	var firstTime = true;
	UTIL.configurePanelInterface = function configurePanelInterface (mapConfig) {
		if (MMGR.source === MMGR.FILE_SOURCE) {
			firstTime = true;
			if (SUM.chmElement) {
				PANE.emptyPaneLocation (PANE.findPaneLocation (SUM.chmElement));
			}
			if (DMM.DetailMaps.length > 0) {
				for (let i=0; i<DMM.DetailMaps.length;i++ ) {
					PANE.emptyPaneLocation (PANE.findPaneLocation (DMM.DetailMaps[i].chm));
				}
			}
		}
		// Split the initial pane horizontally and insert the
		// summary and detail NGCHMs into the children.
		if (firstTime) {
			firstTime = false;
		} else {
			return;
		}
		UTIL.UI.showLoader("Configuring interface...");
		//
		// Define the DROP TARGET and set the drop event handler(s).
		if (debug) console.log ('Configuring drop event handler');
		const dropTarget = document.getElementById('droptarget');
		function handleDropData (txt) {
		       if (debug) console.log ({ m: 'Got drop data', txt });
		       const j = JSON.parse (txt);
		       if (j && j.type === 'linkout.spec' && j.kind && j.spec) {
			   LNK.loadLinkoutSpec (j.kind, j.spec);
		       }
		}
		['dragenter','dragover','dragleave','drop'].forEach(eventName => {
		    dropTarget.addEventListener(eventName, function dropHandler(ev) {
		        ev.preventDefault();
			ev.stopPropagation();
			if (eventName == 'drop') {
			    if (debug) console.log({ m: 'drop related event', eventName, ev });
			    const dt = ev.dataTransfer;
			    const files = dt.files;
			    ([...files]).forEach(file => {
			        if (debug) console.log ({ m: 'dropFile', file });
				if (file.type == 'application/json') {
				    const reader = new FileReader();
				    reader.onloadend = () => { handleDropData (reader.result); };
				    reader.readAsText(file);
				}
			    });
			    const txt = dt.getData("Application/json");
			    if (txt) handleDropData (txt);
			    dropTarget.classList.remove('visible');
			} else if (eventName === 'dragenter') {
			    dropTarget.classList.add('visible');
			} else if (eventName === 'dragleave') {
			    dropTarget.classList.remove('visible');
			}
		    });
		});
		SUM.initSummaryData();
		const initialLoc = PANE.initializePanes ();
		if (mapConfig.hasOwnProperty('panel_configuration')) {
			RECPANES.reconstructPanelsFromMapConfig(initialLoc, mapConfig['panel_configuration']);
		} else if (UTIL.showSummaryPane && UTIL.showDetailPane) {
			const s = PANE.splitPane (false, initialLoc);
			PANE.setPanePropWidths (MMGR.getHeatMap().getDividerPref(), s.child1, s.child2, s.divider);
			SUM.switchPaneToSummary (PANE.findPaneLocation(s.child1));
			DET.switchPaneToDetail (PANE.findPaneLocation(s.child2));
			SRCH.doInitialSearch();
		} else if (UTIL.showSummaryPane) {
			SUM.switchPaneToSummary (initialLoc);
			SRCH.doInitialSearch();
		} else if (UTIL.showDetailPane) {
			DET.switchPaneToDetail (initialLoc);
			SRCH.doInitialSearch();
		} 
	};
})();

/**********************************************************************************
 * FUNCTION - blendTwoColors: The purpose of this function is to blend two 6-character
 * hex color code values into a single value that is half way between.
 **********************************************************************************/
UTIL.blendTwoColors = function(color1, color2) {
    // check input
    color1 = color1 || '#000000';
    color2 = color2 || '#ffffff';
    var percentage = 0.5;

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
    color3 = '#' + UTIL.intToHex(color3[0]) + UTIL.intToHex(color3[1]) + UTIL.intToHex(color3[2]);
    // return hex
    return color3;
};

/**********************************************************************************
 * FUNCTION - intToHex: The purpose of this function is to convert integer
 * value into a hex value;
 **********************************************************************************/
UTIL.intToHex = function(num) {
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
UTIL.convertToArray = function(value) {
	var valArr = [];
	valArr.push(value);
	return valArr;
};

UTIL.isBuilderView = false;
UTIL.containerElement = document.getElementById('ngChmContainer');

/**********************************************************************************
 * FUNCTION - onLoadCHM: This function performs "on load" processing for the NG_CHM
 * Viewer.  It will load either the file mode viewer, standard viewer, or widgetized
 * viewer.  
 **********************************************************************************/
UTIL.onLoadCHM = function (sizeBuilderView) {
	
	UTIL.isBuilderView = sizeBuilderView;
	setMinFontSize();
	//Run startup checks that enable startup warnings button.
	UTIL.startupChecks();
	UTIL.setDragPanels();


	// See if we are running in file mode AND not from "widgetized" code - launcHed locally rather than from a web server (
	if ((UTIL.mapId === "") && (UTIL.mapNameRef === "") && (MMGR.embeddedMapName === null)) {
		//In local mode, need user to select the zip file with data (required by browser security)
		var chmFileItem  = document.getElementById('fileButton');
		document.getElementById('fileOpen_btn').style.display = '';
		document.getElementById('detail_buttons').style.display = 'none';
		chmFileItem.style.display = '';
		chmFileItem.addEventListener('change', UTIL.loadFileModeCHM, false);
		UTIL.UI.showSplashExample();
	} else {
		UTIL.UI.showLoader("Loading NG-CHM from server...");
		//Run from a web server.
		var mapName = UTIL.mapId;
		var dataSource = MMGR.WEB_SOURCE;
		if ((MMGR.embeddedMapName !== null) && (ngChmWidgetMode !== "web")) {
			mapName = MMGR.embeddedMapName;
			dataSource = MMGR.FILE_SOURCE;
			var embedButton = document.getElementById('NGCHMEmbedButton');
			if (embedButton !== null) {
				document.getElementById('NGCHMEmbed').style.display = 'none';
			} else {
				UTIL.loadLocalModeCHM(sizeBuilderView);
			}
		} else {  
			if (MMGR.embeddedMapName !== null) {
				mapName = MMGR.embeddedMapName;
				dataSource = MMGR.LOCAL_SOURCE;
			}
			MMGR.createHeatMap(dataSource, mapName, [SUM.processSummaryMapUpdate, DET.processDetailMapUpdate]);
		}
 	} 
	document.getElementById("summary_canvas").addEventListener('wheel', DEV.handleScroll, UTIL.passiveCompat({capture: false, passive: false}));
};

/**********************************************************************************
 * FUNCTION - loadLocalModeCHM: This function is called when running in local file mode and 
 * with the heat map embedded in a "widgetized" web page.
 **********************************************************************************/
UTIL.loadLocalModeCHM = function (sizeBuilderView) {
	//Special case for embedded version where a blob is passed in.
	if (MMGR.embeddedMapName instanceof Blob) {
		UTIL.loadBlobModeCHM(sizeBuilderView)
		return;
	}
	if (UTIL.isValidURL(MMGR.embeddedMapName) === true) {
		UTIL.loadCHMFromURL(sizeBuilderView)
		return;
	}
	//Else, fetch the .ngchm file
	var req = new XMLHttpRequest();
	req.open("GET", MMGR.localRepository+"/"+MMGR.embeddedMapName);
	req.responseType = "blob";
	req.onreadystatechange = function () {
		if (req.readyState == req.DONE) {
			if (req.status != 200) {
				console.log('Failed in call to get NGCHM from server: ' + req.status);
				UTIL.UI.showLoader("Failed to get NGCHM from server");
			} else {
				var chmBlob  =  new Blob([req.response],{type:'application/zip'});  // req.response;
				var chmFile  =  new File([chmBlob], MMGR.embeddedMapName);
				UTIL.resetCHM();
				var split = chmFile.name.split("."); 
				if (split[split.length-1].toLowerCase() !== "ngchm"){ // check if the file is a .ngchm file
					UHM.invalidFileFormat();
				} else {
					UTIL.displayFileModeCHM(chmFile,sizeBuilderView);
				}
			}
		}
	};	
	req.send();	
}

/**********************************************************************************
 * FUNCTION - loadCHMFromURL: Works kind of like local mode but works when javascript
 * passes in the ngchm as a blob.
 **********************************************************************************/
UTIL.loadCHMFromURL = function (sizeBuilderView) {
	var xhr = new XMLHttpRequest();
	xhr.open('GET', MMGR.embeddedMapName, true);
	xhr.setRequestHeader('Access-Control-Allow-Origin', '*');
	xhr.responseType = 'blob';
	xhr.onload = function(e) {
	  if (this.status == 200) {
	    var myBlob = this.response;
		UTIL.resetCHM();
		UTIL.displayFileModeCHM(myBlob,sizeBuilderView);
	  }
	};
	xhr.send();
}

/**********************************************************************************
 * FUNCTION - loadCHMFromBlob: Works kind of like local mode but works when javascript
 * passes in the ngchm as a blob.
 **********************************************************************************/
UTIL.loadBlobModeCHM = function (sizeBuilderView) {
	var chmFile  =  new File([MMGR.embeddedMapName], "ngchm");
	UTIL.resetCHM();
	UTIL.displayFileModeCHM(chmFile,sizeBuilderView);
}

/**********************************************************************************
 * FUNCTION - loadFileModeCHM: This function is called when running in stand-alone
 * file mode and  user selects the chm data .zip file.
 **********************************************************************************/
UTIL.loadFileModeCHM = function () {
	UTIL.UI.showLoader("Loading NG-CHM from file...");
	var chmFile  = document.getElementById('chmFile').files[0];
	var split = chmFile.name.split("."); 
	if (split[split.length-1].toLowerCase() !== "ngchm"){ // check if the file is a .ngchm file
		UHM.invalidFileFormat();
	} else {
		UTIL.displayFileModeCHM(chmFile);
		SEL.openFileToggle();
	}
};

// The editWidget function can optionally be called from a page that embeds the NG-CHM widget
// to specialize it.  (Currently used by the GUI builder, for example.)
//
// The parameter options is an array of standard widget features to turn off.
// * "noheader":
//   - Hides the service header.
// * "nodetailview":
//   - Shows only the summary panel.
//   - Hides the summary box canvas.
// * "nopanelheaders":
//   - Hides the panel headers.
//
UTIL.editWidget = function editWidget (options) {
	options = options || [];
	if (options.indexOf('noheader') !== -1) {
		document.getElementById('mdaServiceHeader').classList.add('hide');
	}
	if (options.indexOf('nopanelheaders') !== -1) {
		PANE.showPaneHeader = false;
	}
	if (options.indexOf('nodetailview') !== -1) {
		UTIL.showDetailPane = false;
		document.getElementById('summary_box_canvas').classList.add('hide');
	}
};

/**********************************************************************************
 * FUNCTION - displayFileModeCHM: This function performs functions shared by the
 * stand-alone and widgetized "file" versions of the application.
 **********************************************************************************/
UTIL.displayFileModeCHM = function (chmFile, sizeBuilderView) {
	zip.useWebWorkers = false;
	UTIL.resetCHM();
    UTIL.initDisplayVars();
    MMGR.createHeatMap(MMGR.FILE_SOURCE, "",  [SUM.processSummaryMapUpdate, DET.processDetailMapUpdate], chmFile);
    if ((typeof sizeBuilderView !== 'undefined') && (sizeBuilderView)) {
	UTIL.showDetailPane = false;
	PANE.showPaneHeader = false;
        MMGR.getHeatMap().addEventListener(UTIL.builderViewSizing);
    }
};

/**********************************************************************************
 * FUNCTION - builderViewSizing: This function handles the resizing of the summary
 * panel for the builder in cases where ONLY the summary panel is being drawn.  
 **********************************************************************************/
UTIL.builderViewSizing = function (event) {
	if ((typeof event !== 'undefined') && (event !== MMGR.Event_INITIALIZED)) {
		return;
	}

	const header = document.getElementById('mdaServiceHeader');
	if (!header.classList.contains('hide')) {
		header.classList.add('hide');
		window.onresize();
	 }
};

/**********************************************************************************
 * FUNCTION - resetCHM: This function will reload CHM SelectionManager parameters 
 * when loading a file mode heatmap.  Specifically for handling the case where switching 
 * from one file-mode heatmap to another
 **********************************************************************************/
UTIL.resetCHM = function () {
//	SEL.mode = 'NORMAL';
	SEL.setCurrentDL ("dl1");
	SEL.currentRow=null;
	SEL.currentCol=null;
//	SEL.dataPerRow=null;
//	SEL.dataPerCol=null;
//	SEL.selectedStart=0;
//	SEL.selectedStop=0;
	SRCH.clearAllSearchResults ();
	SEL.scrollTime = null;
	SUM.colDendro = null;
	SUM.rowDendro = null;
};

/**********************************************************************************
 * FUNCTION - removeElementsByClass: This function removes all DOM elements with
 * a given className.  
 **********************************************************************************/
UTIL.removeElementsByClass = function(className) {
    var elements = document.getElementsByClassName(className);
    while(elements.length > 0){
        elements[0].parentNode.removeChild(elements[0]);
    }
};

/**********************************************************************************
 * FUNCTION - initDisplayVars: This function reinitializes summary and detail 
 * display values whenever a file-mode map is opened.  This is done primarily
 * to reset screens when a second, third, etc. map is opened.  
 **********************************************************************************/
UTIL.initDisplayVars = function() {
	DMM.nextMapNumber = 1;
	SUM.summaryHeatMapCache = {};
	SUM.widthScale = 1; // scalar used to stretch small maps (less than 250) to be proper size
	SUM.heightScale = 1;
	SUM.colTopItemsWidth = 0;
	SUM.rowTopItemsHeight = 0;
	DET.detailHeatMapCache = {};
	DET.detailHeatMapLevel = {};
	DET.detailHeatMapValidator = {};
	DET.mouseDown = false;
	MMGR.initAxisLabels();
	UTIL.removeElementsByClass("DynamicLabel");
	SRCH.clearCurrentSearchItem ();
};

/**********************************************************************************
 * FUNCTION - shadeColor: This function darken or lighten a color given a percentage.
 * Percentages are represented from 0 to 100.  Positive percentages lighten a color 
 * (100 = white) and negative percentages will darken a color (-100 = black).
 **********************************************************************************/
UTIL.shadeColor = function (color, pct) {
	var percent = pct/100;
    var f=parseInt(color.slice(1),16),t=percent<0?0:255,p=percent<0?percent*-1:percent,R=f>>16,G=f>>8&0x00FF,B=f&0x0000FF;
    return "#"+(0x1000000+(Math.round((t-R)*p)+R)*0x10000+(Math.round((t-G)*p)+G)*0x100+(Math.round((t-B)*p)+B)).toString(16).slice(1);
}

/**********************************************************************************
 * FUNCTION - downloadSummaryPng: This function downloads a PNG image of the 
 * summary canvas.
 **********************************************************************************/
UTIL.downloadSummaryMapPng = function () {
	var mapName = MMGR.getHeatMap().getMapInformation().name;
	var dataURL = SUM.canvas.toDataURL('image/png');
	var dl = document.createElement('a');
	UTIL.scalePngImage(dataURL, 200, 200, dl, function(canvas){
			dl.setAttribute('href', canvas.toDataURL('image/png'));
			dl.setAttribute('download', mapName+'_tnMap.png');
			document.body.appendChild(dl);
			dl.click();
			dl.remove();
	});
	UTIL.redrawCanvases();
}

UTIL.downloadSummaryPng = function (e) {
	if (typeof e !== 'undefined') {
		if (e.classList.contains('disabled')) {
			return;
		}
	}
    var mapName = MMGR.getHeatMap().getMapInformation().name;
    var colDCanvas = document.getElementById("column_dendro_canvas");
    var rowDCanvas = document.getElementById("row_dendro_canvas");
    var dl = document.createElement('a');
    var colDCImg = new Image();
    var colDRImg = new Image();
    var mapImg = new Image();
    UTIL.scalePngImage(colDCanvas, 200, 50, dl, function(canvas){
        colDCImg.onload = function(){
            UTIL.scalePngImage(rowDCanvas, 50, 200, dl, function(canvas){
                colDRImg.onload = function(){
                    UTIL.scalePngImage(SUM.canvas, 200, 200, dl, function(canvas){
                        mapImg.onload = function(){
                            UTIL.combinePngImage(colDCImg, colDRImg, mapImg, 200, 200, dl, function(canvas){
                                dl.setAttribute('href', canvas.toDataURL('image/png'));
                                dl.setAttribute('download', mapName+'_tn.png');
                                document.body.appendChild(dl);
                                dl.click();
                                dl.remove();
                            });
                        }
                        mapImg.src = canvas.toDataURL('image/png');
                    });
                }
                colDRImg.src = canvas.toDataURL('image/png');
            });
        }
        colDCImg.src = canvas.toDataURL('image/png');
    });
}



/**********************************************************************************
 * FUNCTION - combinePngImage: This function takes the scaled row dendro image,
 * scaled column dendro image, and heat map image and combines them into one
 * 200x200 image png.
 **********************************************************************************/
UTIL.combinePngImage = function (img1, img2,img3, width, height, dl, callback) {
		var canvas = document.createElement("canvas");
		var ctx = canvas.getContext("2d");
		ctx.imageSmoothingEnabled = false;
		const heatMap = MMGR.getHeatMap();
		const rowDConfShow = heatMap.getRowDendroConfig().show;
		const colDConfShow = heatMap.getColDendroConfig().show;
		var cDShow = (colDConfShow === 'NONE') || (colDConfShow === 'NA') ? false : true;
		var rDShow = (rowDConfShow === 'NONE') || (rowDConfShow === 'NA') ? false : true;
		var mapWidth = width;
		var mapHeight = height;
		var cDWidth = width;
		var cDHeight = (cDShow === false) ? 0 : height/4;
		var rDWidth = (rDShow === false) ? 0 : width/4;
		var rDHeight = height;
		canvas.width = width + rDWidth;
		canvas.height= height + cDHeight;
		var mapStartX = 0;
		var mapStartY = 0;
		// draw the img into canvas
		if (cDShow === true){
			ctx.drawImage(img1, rDWidth, 0, cDWidth, cDHeight);
			mapStartY = cDHeight;
		} else {
			mapHeight = mapHeight + cDHeight;
		}
		if (rDShow === true){
			ctx.drawImage(img2, 0, cDHeight, rDWidth, rDHeight);
			mapStartX = rDWidth;
		} else {
			mapWidth = mapWidth + rDWidth;
		}
		ctx.drawImage(img3, mapStartX, mapStartY, mapWidth, mapHeight);
		// Run the callback on what to do with the canvas element.
		callback(canvas, dl);
};


UTIL.imageCanvas = function (canvas) {
	let inMemCanvas = document.createElement('canvas');
	const inMemCtx = inMemCanvas.getContext('2d');
	inMemCanvas.width = canvas.width;
	inMemCanvas.height = canvas.height;
	inMemCtx.drawImage(canvas, 0, 0);
	return inMemCanvas;
}

/**********************************************************************************
 * FUNCTION - scaleSummaryPng: This function scales the summary PNG file down to 
 * the width and height specified (currently this is set to 200x200 pixels).
 **********************************************************************************/
UTIL.scalePngImage = function (origCanvas, width, height, dl, callback) {
	var img = new Image();
    var url = origCanvas.toDataURL('image/png');
	if (url.length < 10) {
		UHM.systemMessage("Download Thumbnail Warning", "The Summary Pane must be open and visible in the NG-CHM Viewer in order to download a thumbnail image of the heat map.")
		return;
	}

	// When the images is loaded, resize it in canvas.
	img.onload = function(){
		var canvas = document.createElement("canvas");
        var ctx = canvas.getContext("2d");
        ctx.imageSmoothingQuality = "high";
		ctx.mozImageSmoothingEnabled = false;
		ctx.imageSmoothingEnabled = false;
        canvas.width = width*2;
        canvas.height= height*2;
        // draw the img into canvas
        ctx.drawImage(img, 0, 0, width*2, height*2);
        var img2 = new Image();
        img2.onload = function(){
            var canvas2 = document.createElement("canvas");
            var ctx2 = canvas2.getContext("2d");
            ctx2.imageSmoothingQuality = "high";
            ctx2.mozImageSmoothingEnabled = false;
            ctx2.imageSmoothingEnabled = false;
            canvas2.width = width;
            canvas2.height= height;
            // draw the img into canvas
            ctx2.drawImage(img2, 0, 0, width, height);
            // Run the callback on what to do with the canvas element.
            callback(canvas2, dl);
        };

        img2.src = canvas.toDataURL('image/png');
	};
	img.src = url;
}

/**********************************************************************************
 * FUNCTION - setDragPanels: This function configures selected DIV panels as "drag
 * panels", allowing them to be moved on the screen.
 **********************************************************************************/
UTIL.setDragPanels = function () {
	var panel = document.getElementById("prefs");
	if (panel !== null) {
		UTIL.dragElement(document.getElementById("prefs"));
		UTIL.dragElement(document.getElementById("pdfPrefs"));
		UTIL.dragElement(document.getElementById("msgBox"));
		UTIL.dragElement(document.getElementById("linkBox"));
	}
}

/**********************************************************************************
 * FUNCTION - isNaN: This function checks for a numeric (float or integer) value
 * and returns true/false.
 **********************************************************************************/
UTIL.isNaN = function (n) {
	let nan = false;
	nan = isNaN(n);
	if (n.trim() === '') {
		nan = true;
	}
    return nan;
}

/**********************************************************************************
 * FUNCTION - validURL: This function checks to see if a string contains a valid
 * URL address.
 **********************************************************************************/
UTIL.isValidURL = function (str) {
	  let url;
	  try {
	    url = new URL(str);
	  } catch (_) {
	    return false;  
	  }
	  return true;
}

/**********************************************************************************
 * FUNCTION - dragElement: This function adds drag/move functionality to the DIV
 * passed in.
 **********************************************************************************/
UTIL.dragElement = function (elmnt) {
	  let deltaMouseElementX = 0;
	  let deltaMouseElementY = 0;
	  if (document.getElementById(elmnt.id + "Hdr")) {
	    /* if present, the header is where you move the DIV from:*/
	    document.getElementById(elmnt.id + "Hdr").onmousedown = dragMouseDown;
	  }

	  function dragMouseDown(e) {
	    e = e || window.event;
	    e.preventDefault();
	    deltaMouseElementX = e.clientX - elmnt.getBoundingClientRect().x;
	    deltaMouseElementY = e.clientY - elmnt.getBoundingClientRect().y;
	    document.onmouseup = closeDragElement;
	    // call a function whenever the cursor moves:
	    document.onmousemove = elementDrag;
	  }

	  function elementDrag(e) {
	    e = e || window.event;
	    e.preventDefault();
	    // calculate the new cursor position:
	    elmnt.style.left = (e.clientX - deltaMouseElementX) + 'px';
	    elmnt.style.top = (e.clientY - deltaMouseElementY) + 'px';
	  }

	  function closeDragElement() {
	    /* stop moving when mouse button is released:*/
	    document.onmouseup = null;
	    document.onmousemove = null;
	  }
	}

/**********************************************************************************
 * FUNCTION - roundUpDown: The purpose of this function is to take an input number
 * and round it up OR down depending upon where it is in the range either between
 * 1 and 5 OR 1 and 10 depending on the limit set.  For example:  16 becomes 15 if
 * limit set to 5 but 20 with a limit of 10).
 **********************************************************************************/
UTIL.roundUpDown = function(inVal, limit) {
	var roundedVal = inVal;
	var lastDigit = inVal % 10;
	if (limit === 5) {
		if (((lastDigit < 5) && (lastDigit >= 3)) ||  ((lastDigit > 5) && (lastDigit >= 7))) {
			roundedVal = Math.ceil(inVal/5)*5;
		} else {
			roundedVal = Math.floor(inVal/5)*5;
		}
	} else if (limit === 10) {
		if (lastDigit >= 5) {
			roundedVal = Math.ceil(inVal/10)*10;
		} else {
			roundedVal = Math.floor(inVal/10)*10;
		}
	} 
	return roundedVal; 
}

/**********************************************************************************
 * FUNCTION - createCheckBoxDropDown: The purpose of this function is to dynamically
 * populate the html of a discrete check box dropdown with items.
 **********************************************************************************/
UTIL.createCheckBoxDropDown = function(selectBoxId,checkBoxesId,boxText,items,maxHeight) {
	var checkBoxes = document.getElementById(checkBoxesId);
	var selectBox = document.getElementById(selectBoxId);
	//Order categories (in case they are out of order in properties)
	let orderedItems = [];
	for (let i=0;i<items.length;i++) {
		orderedItems.push(items[i])
	}
	orderedItems.sort((a, b) => a.localeCompare(b, undefined, {sensitivity: 'base'}))
	//Set text to display on closed check box dropdown (can be set to '' for no text)
	selectBox.innerHTML = "<select><option>"+boxText+"</option></select><div id='overSelect' class='dropDownOverSelect'></div>";
	//Create html for all check box rows
	var boxes = "";
	for (var i = 0; i < orderedItems.length; i++){
		boxes = boxes + "<label for='" + orderedItems[i] + "' ><input type='checkBox' class='srchCovCheckBox' value='" + orderedItems[i] + "' name='" + orderedItems[i] + "'>" + orderedItems[i] + "</input></label>";
	}
	if (items.length > 20) {
		checkBoxes.style.height = maxHeight;
	} else {
		checkBoxes.style.height = (items.length + 1) * 18 + 'px';
	}
	checkBoxes.innerHTML = boxes + "<label for='Missing'><input type='checkBox' class='srchCovCheckBox' value='missing' name='missing'>Missing</input></label>";
	checkBoxes.querySelectorAll('label').forEach (label => {
	    label.onclick = toggleLabel;
	});

	function toggleLabel (event) {
	    UTIL.toggleCheckBox(event, event.target);
	}
}

/**********************************************************************************
 * FUNCTION - clearCheckBoxDropdown: The purpose of this function is to remove all
 * check box rows from within a given checkBox dropdown control.
 **********************************************************************************/
UTIL.clearCheckBoxDropdown = function(checkBoxesId) {
	document.getElementById(checkBoxesId).innerHTML = "";
}

/**********************************************************************************
 * FUNCTION - resetCheckBoxDropdown: The purpose of this function is to reset all
 * check boxes in a check box dropdown control to unselected.
 **********************************************************************************/
UTIL.resetCheckBoxDropdown = function(checkBoxClass) {
	var checkboxes =  document.getElementsByClassName(checkBoxClass);
	for (var i = 0; i < checkboxes.length; i++){
        checkboxes[i].checked = false;
    }
}

/**********************************************************************************
 * FUNCTION - toggleCheckBox: The purpose of this function is to toggle the value
 * of a check box.  This is inherent to the check box itself BUT you need this 
 * code to enable the toggle when the user clicks on a check box row (highlighted
 * LABEL element) but not directly on the box itself. 
 **********************************************************************************/
UTIL.toggleCheckBox = function(event, item) {
	if (event.target.nodeName === 'LABEL') {
		item.children[0].checked = !item.children[0].checked;
	}
}

/**********************************************************************************
 * FUNCTION - showCheckBoxDropDown: The purpose of this function is open up
 * the contents (checkboxes) of a check box dropdown control. 
 **********************************************************************************/
UTIL.showCheckBoxDropDown = function(checkBoxesId) {
	var checkboxes = document.getElementById(checkBoxesId);
	if (checkboxes.style.display ===  "none") {
		checkboxes.style.display = "block";
	} else {
		checkboxes.style.display = "none";
	}
}

/**********************************************************************************
 * FUNCTION - closeCheckBoxDropdown: The purpose of this function is to close
 * the contents of a check box dropdown control. It is similar the the show
 * function but can be called from anywhere. The idea being that if the 
 * dropdown has been left open and you click somewhere else, it will be closed. 
 **********************************************************************************/
UTIL.closeCheckBoxDropdown = function(selectBoxId,checkBoxesId) {
	var offP = document.getElementById(checkBoxesId).offsetParent;
	  if (offP !== null) {
		 document.getElementById(selectBoxId).click();
	  }
}


/**********************************************************************************
 * BEGIN: EMBEDDED MAP FUNCTIONS AND GLOBALS
 * 
 * embedLoaded: Global for whether a given iFrame's heat map has been loaded already.  
 * We only only load once.
 * 
 **********************************************************************************/
UTIL.embedLoaded = false;
UTIL.embedThumbWidth = '150px';
UTIL.embedThumbHeight = '150px';
UTIL.defaultNgchmWidget = 'ngchmWidget-min.js';

/**********************************************************************************
 * FUNCTION - embedCHM: This function is a special pre-processing function for the
 * widgetized version of the NG-CHM Viewer.  It will take the map name provided 
 * by the user (embedded in an unaffiliated web page) and pass that on to the 
 * on load processing for the viewer.  repository (default .) is the path to the
 * directory containing the specified map.
 **********************************************************************************/
UTIL.embedCHM = function (map, repository, sizeBuilderView) {
	MMGR.embeddedMapName = map;
	MMGR.localRepository = repository || ".";
	//Reset dendros for local/widget load
	SUM.colDendro = null;
	SUM.rowDendro = null;
//	DET.colDendro = null;
//	DET.rowDendro = null;
	UTIL.onLoadCHM(sizeBuilderView);
}

/**********************************************************************************
 * FUNCTION - showEmbed: This function shows the embedded heat map when the
 * user clicks on the embedded map image.
 **********************************************************************************/
UTIL.showEmbed = function (baseDiv,dispWidth,dispHeight,customJS) {
	var embeddedWrapper = document.getElementById('NGCHMEmbedWrapper');
	UTIL.embedThumbWidth = embeddedWrapper.style.width;
	UTIL.embedThumbHeight = embeddedWrapper.style.height;
	var embeddedCollapse = document.getElementById('NGCHMEmbedCollapse');
	var embeddedMap = document.getElementById('NGCHMEmbed');
	var iFrame = window.frameElement; // reference to iframe element container
	iFrame.className='ngchm';
	var wid = 100;
	if (dispWidth < 100) {
		wid = wid*(dispWidth/100);
	}
	var hgt = 100;
	if (dispHeight < 100) {
		hgt = hgt*(dispHeight/100);
	}
	iFrame.style.height = hgt + 'vh';
	iFrame.style.width = wid + 'vw';
	iFrame.style.display = 'flex';
	embeddedMap.style.height = '92vh';
	embeddedMap.style.width = '97vw';
	embeddedMap.style.display = 'flex';
	embeddedMap.style.flexDirection = 'column';
	embeddedWrapper.style.display = 'none';
	embeddedCollapse.style.display = ''; 
	if (UTIL.embedLoaded === false) {
		UTIL.embedLoaded = true;
		UTIL.loadLocalModeCHM(false);
		if (customJS !== "") {
			setTimeout(function(){ CUST.addExtraCustomJS(customJS);}, 2000);
		}
	}
}

/**********************************************************************************
 * FUNCTION - showEmbed: This function shows the embedded heat map when the
 * user clicks on the embedded map image.  It is used by NGCHM_Embed.js from 
 * the minimized file ngchmEmbed-min.js
 **********************************************************************************/
UTIL.showEmbedded = function (baseDiv,iframeStyle,customJS) {
	var embeddedWrapper = document.getElementById('NGCHMEmbedWrapper');
	UTIL.embedThumbWidth = embeddedWrapper.style.width;
	UTIL.embedThumbHeight = embeddedWrapper.style.height;
	var embeddedCollapse = document.getElementById('NGCHMEmbedCollapse');
	var embeddedMap = document.getElementById('NGCHMEmbed');
	var iFrame = window.frameElement; // reference to iframe element container
	iFrame.className='ngchm';
	iFrame.style = iframeStyle;
	iFrame.style.display = 'flex';
	embeddedMap.style.height = '92vh';
	embeddedMap.style.width = '97vw';
	embeddedMap.style.display = 'flex';
	embeddedMap.style.flexDirection = 'column';
	embeddedWrapper.style.display = 'none';
	embeddedCollapse.style.display = ''; 
	if (UTIL.embedLoaded === false) {
		UTIL.embedLoaded = true;
		UTIL.loadLocalModeCHM(false);
		if (customJS !== "") {
			setTimeout(function(){ CUST.addExtraCustomJS(customJS);}, 2000);
		}
	}
}

/**********************************************************************************
 * FUNCTION - hideEmbed: This function hides the embedded map when the user 
 * clicks on the collapse map button.
 **********************************************************************************/
UTIL.hideEmbed = function (thumbStyle) {
	var iFrame = window.frameElement; // reference to iframe element container
	iFrame.className='ngchmThumbnail';
	var embeddedWrapper = document.getElementById('NGCHMEmbedWrapper');
	var embeddedMap = document.getElementById('NGCHMEmbed');
	if (typeof thumbStyle === 'undefined') {
		iFrame.style.height = UTIL.embedThumbHeight;
		embeddedWrapper.style.height = UTIL.embedThumbHeight;
		embeddedMap.style.height = UTIL.embedThumbHeight;
	} else {
		iFrame.style = thumbStyle;
		embeddedWrapper.style = thumbStyle;
		embeddedMap.style = thumbStyle;
	}
	var embeddedCollapse = document.getElementById('NGCHMEmbedCollapse');
	embeddedMap.style.display = 'none';
	embeddedCollapse.style.display = 'none';
	embeddedWrapper.style.display = '';
}

/**********************************************************************************
 * FUNCTION - setNgchmWidget: This function allows the user to modify the default
 * for the nghcmWidget-min.js file to a fully pathed location for that file (which
 * may be under a different name than the file itself)
 **********************************************************************************/
UTIL.setNgchmWidget = function (path) {UTIL.defaultNgchmWidget = path};

/**********************************************************************************
 * FUNCTION - embedExpandableMap: This function constructs the html for embedding
 * a heat map widget within an iFrame object.  It takes a javascript object (options)
 * as an input.  The minimum parameters within this object is the ngchm file entry.
 * Optional entries may be provided for the thumbnail, height, width, and widget JS
 * location.
 **********************************************************************************/
UTIL.embedExpandableMap = function (options) {
	//Exit if no ngchm has been provided
	if (options.ngchm === undefined) {return;}
	
	//Set all option parameters to defaults if not provided
	if (options.divId === undefined) options.divId = 'NGCHM';
    if (options.thumbnail === undefined) options.thumbnail = options.ngchm.replace(/\.ngchm$/, '.png');
    if (options.thumbnailWidth === undefined) options.thumbnailWidth = '150px';
    if (options.thumbnailHeight === undefined) options.thumbnailHeight = options.thumbnailWidth;
    if (options.ngchmWidget === undefined) options.ngchmWidget = UTIL.defaultNgchmWidget;
    var displayWidth = (options.displayWidth === undefined) ? '100' : options.displayWidth.substring(0,options.displayWidth.length-1);
    var customJS = (options.customJS === undefined) ? "" : options.customJS;
	var displayHeight = displayWidth;
    if (displayWidth <= 70) {
    	displayHeight = 70;
    }
    
    //set "memory" variables for width/height for collapse functionality
    UTIL.embedThumbWidth = options.thumbnailWidth;
    UTIL.embedThumbWidth = options.thumbnailHeight;

    //Construct a fully configured embedded iframe and add it to the html page
	var embeddedDiv = document.getElementById(options.divId);
	var ngchmIFrame = document.createElement('iframe');
	ngchmIFrame.id = options.divId+"_iframe"; 
	ngchmIFrame.scrolling = "no";
	ngchmIFrame.style = "height:"+options.thumbnailHeight+"; width:100%; border-style:none; ";
	ngchmIFrame.sandbox = 'allow-scripts allow-same-origin allow-popups allow-forms allow-modals allow-downloads'; 
	ngchmIFrame.className='ngchmThumbnail';
	embeddedDiv.appendChild(ngchmIFrame); 
	var doc = ngchmIFrame.contentWindow.document;
	doc.open();
	doc.write("<!DOCTYPE html><HTML><BODY style='margin:0px;width:100vw;height: 100vh;display: flex;flex-direction: column;'><div id='NGCHMEmbedWrapper' class='NGCHMEmbedWrapper' style='height: "+options.thumbnailHeight+"; width: "+options.thumbnailWidth+"'><img img id='NGCHMEmbedButton' src='"+options.thumbnail+"' alt='Show Heat Map' onclick='NgChm.UTIL.showEmbed(this,\""+displayWidth+"\",\""+displayHeight+"\",\""+customJS+"\");' /><div class='NGCHMEmbedOverlay' onclick='NgChm.UTIL.showEmbed(this,\""+displayWidth+"\",\""+displayHeight+"\",\""+customJS+"\");' ><div id='NGCHMEmbedOverText'>Expand<br>Map</div></div></div><div id='NGCHMEmbedCollapse' style='display: none;width: 100px; height: 20px;'><div><img img id='NGCHMEmbedButton' src='images/buttonCollapseMap.png' alt='Collapse Heat Map' onclick='NgChm.UTIL.hideEmbed();' /></div></div><br/><div id='NGCHMEmbed' style='display: none; background-color: white; height: 100%; width: 98%; border: 2px solid gray; padding: 5px;'></div><script src='"+options.ngchmWidget+"'><\/script><script type='text/Javascript'>NgChm.UTIL.embedCHM('"+options.ngchm+"');<\/script></BODY></HTML><br><br>");
	doc.close();
};
UTIL.defaultNgchmWidget = 'ngchmWidget-min.js';
    
/**********************************************************************************
 * END: EMBEDDED MAP FUNCTIONS AND GLOBALS
 **********************************************************************************/

/**
*  Function to show selected items when the 'SHOW' button in the Gear Dialog is clicked
* 
*  @function redrawSearchResults
*/
UTIL.redrawSearchResults = function () {
	DET.updateDisplayedLabels();
	SUM.redrawSelectionMarks();
	SEL.updateSelections();
	SRCH.showSearchResults();
};

/**********************************************************************************
 * FUNCTION - loadAllTilesTimer: This function checks the dimensions of the heat map
 * and returns a delay timer value to be used when setting the read window to the
 * entire map.
 **********************************************************************************/
UTIL.loadAllTilesTimer = function() {
	const heatMap = MMGR.getHeatMap();
	const dimensionVal = heatMap.getNumRows(MMGR.DETAIL_LEVEL) + heatMap.getNumColumns(MMGR.DETAIL_LEVEL);
	if (dimensionVal <= 1000) {
		return 500;
	} else if (dimensionVal <= 2000) {
		return 1000;
	} else if (dimensionVal <= 3000) {
		return 2000;
	} else if (dimensionVal <= 4000) {
		return 3000;
	} else if (dimensionVal <= 5000) {
		return 4000;
	} else if (dimensionVal <= 6000) {
		return 5000;
	} else {
		return 10000;
	}
}

/**********************************************************************************
 * FUNCTION - b64toBlob: This function reads a .ngchm file from a blob.  It is used
 * in html pages that contain an entire heat map (.ngchm, widget, html, embed)
 **********************************************************************************/
UTIL.b64toBlob = function (b64Data) {
	  const sliceSize = 512;
	  let byteCharacters = atob(b64Data);
	  let byteArrays = [];
	  for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
	    const slice = byteCharacters.slice(offset, offset + sliceSize);
	    let byteNumbers = new Array(slice.length);
	    for (var i = 0; i < slice.length; i++) {
	      byteNumbers[i] = slice.charCodeAt(i);
	    }
	    let byteArray = new Uint8Array(byteNumbers);
	    byteArrays.push(byteArray);
	  }
	  const blob = new Blob(byteArrays);
	  return blob;
}

/*********************************************************************************************
 * FUNCTION:  getClickType - The purpose of this function returns an integer. 0 for left click; 
 * 1 for right.  It could be expanded further for wheel clicks, browser back, and browser forward 
 *********************************************************************************************/
UTIL.getClickType = function (e) {
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
 * FUNCTION:  getCursorPosition - The purpose of this function is to return the cursor 
 * position over the canvas.  
 *********************************************************************************************/
UTIL.getCursorPosition = function (e) {
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
 * FUNCTION:  isOnObject - The purpose of this function is to tell us if the cursor is over 
 * a given scrreen object.
 *********************************************************************************************/
UTIL.isOnObject = function (e,type) {
	const mapItem = DMM.getMapItemFromCanvas(e.currentTarget);
    var rowClassWidthPx =  DET.getRowClassPixelWidth(mapItem);
    var colClassHeightPx = DET.getColClassPixelHeight(mapItem);
    var rowDendroWidthPx =  DET.getRowDendroPixelWidth(mapItem);
    var colDendroHeightPx = DET.getColDendroPixelHeight(mapItem);
	var coords = UTIL.getCursorPosition(e);
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

/*********************************************************************************************
 * FUNCTION:  hexToComplimentary - The purpose of this function is to convert a hex color value 
 * to a complimentary hex color value.  It shifts hue by 45 degrees and then converts hex, 
 * returning complimentary color as a hex value
 *********************************************************************************************/
 UTIL.hexToComplimentary = function(hex){

    // Convert hex to rgb
    // Credit to Denis http://stackoverflow.com/a/36253499/4939630
    var rgb = 'rgb(' + (hex = hex.replace('#', '')).match(new RegExp('(.{' + hex.length/3 + '})', 'g')).map(function(l) { return parseInt(hex.length%2 ? l+l : l, 16); }).join(',') + ')';

    // Get array of RGB values
    rgb = rgb.replace(/[^\d,]/g, '').split(',');

    var r = rgb[0], g = rgb[1], b = rgb[2];

    // Convert RGB to HSL
    // Adapted from answer by 0x000f http://stackoverflow.com/a/34946092/4939630
    r /= 255.0;
    g /= 255.0;
    b /= 255.0;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2.0;

    if(max == min) {
        h = s = 0;  //achromatic
    } else {
        var d = max - min;
        s = (l > 0.5 ? d / (2.0 - max - min) : d / (max + min));

        if(max == r && g >= b) {
            h = 1.0472 * (g - b) / d ;
        } else if(max == r && g < b) {
            h = 1.0472 * (g - b) / d + 6.2832;
        } else if(max == g) {
            h = 1.0472 * (b - r) / d + 2.0944;
        } else if(max == b) {
            h = 1.0472 * (r - g) / d + 4.1888;
        }
    }

    h = h / 6.2832 * 360.0 + 0;

    // Shift hue to opposite side of wheel and convert to [0-1] value
    h+= 45;
    if (h > 360) { h -= 360; }
    h /= 360;

    // Convert h s and l values into r g and b values
    // Adapted from answer by Mohsen http://stackoverflow.com/a/9493060/4939630
    if(s === 0){
        r = g = b = l; // achromatic
    } else {
        var hue2rgb = function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;

        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    r = Math.round(r * 255);
    g = Math.round(g * 255); 
    b = Math.round(b * 255);

    // Convert r b and g values to hex
    rgb = b | (g << 8) | (r << 16); 
    return "#" + (0x1000000 | rgb).toString(16).substring(1);
};  

// A table of frequently used images.
// Used to reduce widget size by having a single data: URL for each image instead of one per use.
UTIL.imageTable = {
    cancelSmall: 'images/cancelSmall.png',
    closeButton: 'images/closeButton.png',
    okButton: 'images/okButton.png',
    prefCancel: 'images/prefCancel.png',
    saveNgchm: 'images/saveNgchm.png',
    openMapHover: 'images/openMapHover.png',
    goHover: 'images/goHover.png',
    prevHover: 'images/prevHover.png',
    nextHover: 'images/nextHover.png',
    cancelHover: 'images/cancelHover.png',
    barColorsHover: 'images/barColorsHover.png',
    barMenuHover: 'images/barMenuHover.png',
};

(function() {
    const exports = { showSplashExample, showLoader, hideLoader };
    NgChm.createNS ("NgChm.UTIL.UI", exports);
    var firstLoaderMessage = true;
    var messages = "";

    // Add event handler for closing splash screen.
    (function() {
	const closeBtn = document.getElementById('closeSplash');
	if (closeBtn) {
	    closeBtn.addEventListener('click', () => {
		const splash = document.getElementById('splash');
		splash.classList.add('hide');
	    }, { passive: true });
	}
    })();

    function showSplashExample () {
	const splashWaiting = document.getElementById('splashWaiting');
	// Splash screen removed in widget.
	if (!splashWaiting) return;
	const splashExample = document.getElementById('splashExample');
        splashWaiting.classList.add('hide');
        splashExample.classList.remove('hide');
    }

    // Replace splash screen with loader screen.
    function showLoader (message) {
	const splash = document.getElementById('splash');
	const loader = document.getElementById('loader');
	messages += '<P>' + message;
	loader.innerHTML = messages;
	if (firstLoaderMessage) {
	    loader.classList.replace('faded', 'fadeinslow');
	    // Splash screen removed in widget.
	    if (splash) splash.classList.replace('fadeinslow', 'fadeout');
	    firstLoaderMessage = false;
	}
    }

    // Replace loader screen with NgCHM.
    function hideLoader () {
	const loader = document.getElementById('loader');
	loader.classList.replace('fadeinslow', 'fadeout');
	[...document.querySelectorAll('*[data-hide-on-load]')].forEach(e => e.classList.add('hide'));
	UTIL.containerElement.classList.replace('faded', 'fadein');
	[...document.querySelectorAll('*[data-show-on-load]')].forEach(e => e.classList.remove('hide'));
    }
})();

})();
