(function() {
    'use strict';
    NgChm.markFile();

    /**
     * General purpose javascript helper funcitons
     */

    //Define Namespace for NgChm UI Manager.
    const UIMGR = NgChm.createNS('NgChm.UI-Manager');

    const UTIL = NgChm.importNS('NgChm.UTIL');
    const SUM = NgChm.importNS('NgChm.SUM');
    const PDF = NgChm.importNS('NgChm.PDF');
    const DET = NgChm.importNS('NgChm.DET');
    const DEV = NgChm.importNS('NgChm.DEV');
    const DMM = NgChm.importNS('NgChm.DMM');
    const LNK = NgChm.importNS('NgChm.LNK');
    const SEL = NgChm.importNS('NgChm.SEL');
    const MMGR = NgChm.importNS('NgChm.MMGR');
    const PANE = NgChm.importNS('NgChm.Pane');
    const SRCH = NgChm.importNS('NgChm.SRCH');
    const DRAW = NgChm.importNS('NgChm.DRAW');
    const RECPANES = NgChm.importNS('NgChm.RecPanes');
    const CUST = NgChm.importNS('NgChm.CUST');

    /**********************************************************************************
     * FUNCTION - redrawCanvases: The purpose of this function is to redraw the various
     * wegGl canvases in the viewer. It is called to deal with blurring issues occuring
     * on the canvases when modal panels are drawn over the viewer canvases.
     **********************************************************************************/
    UIMGR.redrawCanvases = function () {
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

    /**
    *  Function to show selected items when the 'SHOW' button in the Gear Dialog is clicked
    *
    *  @function redrawSearchResults
    */
    UIMGR.redrawSearchResults = function () {
	    DET.updateDisplayedLabels();
	    SUM.redrawSelectionMarks();
	    SEL.updateSelections();
	    SRCH.showSearchResults();
    };

    // Function configurePanelInterface must called once immediately after the HeatMap is loaded.
    // It configures the initial Panel user interface according to the heat map preferences and
    // the interface configuration parameters.
    //
    (function() {
	const debug = false;
	var firstTime = true;
	UIMGR.configurePanelInterface = function configurePanelInterface (event) {

	    if (event !== MMGR.Event_INITIALIZED) {
		return;
	    }
	    CUST.addCustomJS();
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
		UTIL.showLoader("Configuring interface...");
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
		const panelConfig = MMGR.getHeatMap().getPanelConfiguration();
		if (panelConfig) {
			RECPANES.reconstructPanelsFromMapConfig(initialLoc, panelConfig);
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
     * FUNCTION - onLoadCHM: This function performs "on load" processing for the NG_CHM
     * Viewer.  It will load either the file mode viewer, standard viewer, or widgetized
     * viewer.
     **********************************************************************************/
    UIMGR.onLoadCHM = function (sizeBuilderView) {

	    UTIL.isBuilderView = sizeBuilderView;
	    //Run startup checks that enable startup warnings button.
	    setDragPanels();


	    // See if we are running in file mode AND not from "widgetized" code - launcHed locally rather than from a web server (
	    if ((UTIL.mapId === "") && (UTIL.mapNameRef === "") && (MMGR.embeddedMapName === null)) {
		    //In local mode, need user to select the zip file with data (required by browser security)
		    var chmFileItem  = document.getElementById('fileButton');
		    document.getElementById('fileOpen_btn').style.display = '';
		    document.getElementById('detail_buttons').style.display = 'none';
		    chmFileItem.style.display = '';
		    chmFileItem.addEventListener('change', loadFileModeCHM, false);
		    UTIL.showSplashExample();
	    } else {
		    UTIL.showLoader("Loading NG-CHM from server...");
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
				    loadLocalModeCHM(sizeBuilderView);
			    }
		    } else {
			    if (MMGR.embeddedMapName !== null) {
				    mapName = MMGR.embeddedMapName;
				    dataSource = MMGR.LOCAL_SOURCE;
			    }
			    MMGR.createHeatMap(dataSource, mapName, [
				    UIMGR.configurePanelInterface,
				    SUM.processSummaryMapUpdate,
				    DET.processDetailMapUpdate
			    ]);
		    }
	    }
	    document.getElementById("summary_canvas").addEventListener('wheel', DEV.handleScroll, UTIL.passiveCompat({capture: false, passive: false}));
    };

    /**********************************************************************************
     * FUNCTION - loadLocalModeCHM: This function is called when running in local file mode and
     * with the heat map embedded in a "widgetized" web page.
     **********************************************************************************/
    function loadLocalModeCHM (sizeBuilderView) {
	    //Special case for embedded version where a blob is passed in.
	    if (MMGR.embeddedMapName instanceof Blob) {
		    loadBlobModeCHM(sizeBuilderView)
		    return;
	    }
	    if (UTIL.isValidURL(MMGR.embeddedMapName) === true) {
		    loadCHMFromURL(sizeBuilderView)
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
				    UTIL.showLoader("Failed to get NGCHM from server");
			    } else {
				    var chmBlob  =  new Blob([req.response],{type:'application/zip'});  // req.response;
				    var chmFile  =  new File([chmBlob], MMGR.embeddedMapName);
				    resetCHM();
				    var split = chmFile.name.split(".");
				    if (split[split.length-1].toLowerCase() !== "ngchm"){ // check if the file is a .ngchm file
					    UHM.invalidFileFormat();
				    } else {
					    displayFileModeCHM(chmFile,sizeBuilderView);
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
    function loadCHMFromURL (sizeBuilderView) {
	    var xhr = new XMLHttpRequest();
	    xhr.open('GET', MMGR.embeddedMapName, true);
	    xhr.setRequestHeader('Access-Control-Allow-Origin', '*');
	    xhr.responseType = 'blob';
	    xhr.onload = function(e) {
	      if (this.status == 200) {
		var myBlob = this.response;
		    resetCHM();
		    displayFileModeCHM(myBlob,sizeBuilderView);
	      }
	    };
	    xhr.send();
    }

    /**********************************************************************************
     * FUNCTION - loadCHMFromBlob: Works kind of like local mode but works when javascript
     * passes in the ngchm as a blob.
     **********************************************************************************/
    function loadBlobModeCHM (sizeBuilderView) {
	var chmFile = new File([MMGR.embeddedMapName], "ngchm");
	resetCHM();
	displayFileModeCHM (chmFile, sizeBuilderView);
    }

    /**********************************************************************************
     * FUNCTION - loadFileModeCHM: This function is called when running in stand-alone
     * file mode and  user selects the chm data .zip file.
     **********************************************************************************/
    function loadFileModeCHM () {
	UTIL.showLoader("Loading NG-CHM from file...");
	var chmFile  = document.getElementById('chmFile').files[0];
	var split = chmFile.name.split(".");
	if (split[split.length-1].toLowerCase() !== "ngchm"){ // check if the file is a .ngchm file
	    UHM.invalidFileFormat();
	} else {
	    displayFileModeCHM(chmFile);
	    SEL.openFileToggle();
	}
    }

    /**********************************************************************************
     * FUNCTION - displayFileModeCHM: This function performs functions shared by the
     * stand-alone and widgetized "file" versions of the application.
     **********************************************************************************/
    function displayFileModeCHM (chmFile, sizeBuilderView) {
	    zip.useWebWorkers = false;
	    resetCHM();
	initDisplayVars();
	MMGR.createHeatMap(MMGR.FILE_SOURCE, "",  [
		UIMGR.configurePanelInterface,
		SUM.processSummaryMapUpdate,
		DET.processDetailMapUpdate
	], chmFile);
	if ((typeof sizeBuilderView !== 'undefined') && (sizeBuilderView)) {
	    UTIL.showDetailPane = false;
	    PANE.showPaneHeader = false;
	    MMGR.getHeatMap().addEventListener(builderViewSizing);
	}
    }

    /**********************************************************************************
     * FUNCTION - builderViewSizing: This function handles the resizing of the summary
     * panel for the builder in cases where ONLY the summary panel is being drawn.
     **********************************************************************************/
    function builderViewSizing (event) {
	    if ((typeof event !== 'undefined') && (event !== MMGR.Event_INITIALIZED)) {
		    return;
	    }

	    const header = document.getElementById('mdaServiceHeader');
	    if (!header.classList.contains('hide')) {
		    header.classList.add('hide');
		    window.onresize();
	     }
    }

    /**********************************************************************************
     * FUNCTION - resetCHM: This function will reload CHM SelectionManager parameters
     * when loading a file mode heatmap.  Specifically for handling the case where switching
     * from one file-mode heatmap to another
     **********************************************************************************/
    function resetCHM () {
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
    }

    /**********************************************************************************
     * FUNCTION - initDisplayVars: This function reinitializes summary and detail
     * display values whenever a file-mode map is opened.  This is done primarily
     * to reset screens when a second, third, etc. map is opened.
     **********************************************************************************/
    function initDisplayVars () {
	    DRAW.widthScale = 1; // scalar used to stretch small maps (less than 250) to be proper size
	    DRAW.heightScale = 1;
	    SUM.summaryHeatMapCache = {};
	    SUM.colTopItemsWidth = 0;
	    SUM.rowTopItemsHeight = 0;
	    DMM.nextMapNumber = 1;
	    DET.detailHeatMapCache = {};
	    DET.detailHeatMapLevel = {};
	    DET.detailHeatMapValidator = {};
	    DET.mouseDown = false;
	    MMGR.initAxisLabels();
	    UTIL.removeElementsByClass("DynamicLabel");
	    SRCH.clearCurrentSearchItem ();
    }

    /**********************************************************************************
     * FUNCTION - setDragPanels: This function configures selected DIV panels as "drag
     * panels", allowing them to be moved on the screen.
     **********************************************************************************/
    function setDragPanels () {
	var panel = document.getElementById("prefs");
	if (panel !== null) {
	    UTIL.dragElement(document.getElementById("prefs"));
	    UTIL.dragElement(document.getElementById("pdfPrefs"));
	    UTIL.dragElement(document.getElementById("msgBox"));
	    UTIL.dragElement(document.getElementById("linkBox"));
	}
    }

    /**********************************************************************************
     * FUNCTION - embedCHM: This function is a special pre-processing function for the
     * widgetized version of the NG-CHM Viewer.  It will take the map name provided
     * by the user (embedded in an unaffiliated web page) and pass that on to the
     * on load processing for the viewer.  repository (default .) is the path to the
     * directory containing the specified map.
     **********************************************************************************/
    UIMGR.embedCHM = function (map, repository, sizeBuilderView) {
	    MMGR.embeddedMapName = map;
	    MMGR.localRepository = repository || ".";
	    //Reset dendros for local/widget load
	    SUM.colDendro = null;
	    SUM.rowDendro = null;
    //	DET.colDendro = null;
    //	DET.rowDendro = null;
	    UIMGR.onLoadCHM(sizeBuilderView);
    };

    function openHamburgerMenu (e) {
	    var menu = document.getElementById('burgerMenuPanel');
	    var parent = menu.parentElement;
	    var parentTop = parent.offsetTop+50;
	    menu.style.top = parentTop + 'px';
	    if (menu.style.display === 'none') {
		    menu.style.display = '';
		    if (MMGR.source !== MMGR.WEB_SOURCE) {
			    document.getElementById('menuAbout').style.display = 'none';
			    document.getElementById('menuSpaceAbout').style.display = 'none';
		    }
		    // Disable Save as PDF menu item if no heatmap window visble.
		    const pdfMenuItem = document.getElementById('menuPdf');
		    if (PDF.canGeneratePdf()) {
			    pdfMenuItem.classList.remove('disabled');
		    } else {
			    pdfMenuItem.classList.add('disabled');
		    }
		    // Disabled Save Thumbnail menu if summary heatmap not visble.
		    if (SUM.isVisible()) {
			    document.getElementById('menuPng').classList.remove('disabled');
		    } else {
			    document.getElementById('menuPng').classList.add('disabled');
		    }
	    } else {
		    menu.style.display = 'none';
	}
	UIMGR.redrawCanvases();
    }

    const hamburgerButton = document.getElementById('barMenu_btn');
    hamburgerButton.onclick = (ev) => {
	openHamburgerMenu(ev.target);
    };

})();
