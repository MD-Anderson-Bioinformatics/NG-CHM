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
    const UHM = NgChm.importNS('NgChm.UHM');

    /***
    *  Functions related to saving Ng-Chms.
    */
    function saveHeatMapToNgchm () {
	    const heatMap = MMGR.getHeatMap();
	    LNK.requestDataFromPlugins();
	    var success = true;
	    UHM.initMessageBox();
	    if (MMGR.source === MMGR.WEB_SOURCE) {
		    success = MMGR.zipMapProperties(JSON.stringify(mapConfig));
		    zipSaveNotification(heatMap, false);
	    } else {
		    let waitForPluginDataCount = 0;
		    let awaitingPluginData = setInterval(function() {
			    waitForPluginDataCount = waitForPluginDataCount + 1; // only wait so long
			    if (LNK.havePluginData() || waitForPluginDataCount > 3) {
				    clearInterval(awaitingPluginData);
				    LNK.warnAboutMissingPluginData();
				    heatMap.zipSaveMapProperties(addSaveStateToMapConfig());
			    }
		    }, 1000);
		    zipSaveNotification(heatMap, false);
	    }
	    heatMap.setUnAppliedChanges(false);
    }

    function autoSaveHeatMap (heatMap) {
	    let success = true;
	    if (MMGR.embeddedMapName === null) {
		    heatMap.setRowClassificationOrder();
		    heatMap.setColClassificationOrder();
		    if (MMGR.source !== MMGR.FILE_SOURCE) {
			// FIXME: BMB. Verify this does what it's required to do.
			// This appears to only be saving mapConfig.
			// What about mapData?
			success = MMGR.webSaveMapProperties(JSON.stringify(heatMap.getMapConfig()));
		    } else {
			zipSaveNotification(heatMap, true);
		    }
	    }
	    return success;
    }

    function addSaveStateToMapConfig () {
	const mapConfig = MMGR.getHeatMap().getMapConfig();
	if (!mapConfig.hasOwnProperty('panel_configuration')) {
	    mapConfig['panel_configuration'] = {};
	}

	savePaneLayoutToMapConfig();
	saveSummaryMapInfoToMapConfig();
	saveDetailMapInfoToMapConfig();
	saveFlickInfoToMapConfig();
	saveSelectionsToMapConfig();
	return mapConfig;

	/**
	* Save the pane layout to mapConfig
	*/
	function savePaneLayoutToMapConfig() {
		let layoutToSave = document.getElementById('ngChmContainer');
		let layoutJSON = PANE.paneLayout(layoutToSave);
		mapConfig['panel_configuration']['panel_layout'] = layoutJSON;
	}

	/**
	 * Save the summary pane details to mapConfig.
	 * (This just saves which pane, if any, is the summary pane.)
	 */
	function saveSummaryMapInfoToMapConfig() {
		const pane = SUM.chmElement && SUM.chmElement.parentElement;
		if (pane && pane.classList.contains("pane")) {
			mapConfig.panel_configuration[pane.id] = {
			    type: 'summaryMap'
			};
		}
	}

	/**
	* Save enough information from the detail map to reconstruct the zoom/pan state
	*/
	function saveDetailMapInfoToMapConfig() {
		DMM.DetailMaps.forEach(dm => {
			mapConfig.panel_configuration[dm.pane] = DET.getDetailSaveState (dm);
		})
	}

	/**
	* Save information about the data layers (i.e. 'flick info') to mapConfig
	*/
	function saveFlickInfoToMapConfig() {
		mapConfig.panel_configuration['flickInfo'] = {};
		try {
			mapConfig.panel_configuration.flickInfo['flick_btn_state'] = document.getElementById('flick_btn').dataset.state;
			mapConfig.panel_configuration.flickInfo['flick1'] = document.getElementById('flick1').value;
			mapConfig.panel_configuration.flickInfo['flick2'] = document.getElementById('flick2').value;
		} catch(err) {
			console.error(err);
		}
	}

	function saveSelectionsToMapConfig () {
		mapConfig.panel_configuration['selections'] = SRCH.getSearchSaveState();
		if (SUM.rowDendro) {
		    const bars = SUM.rowDendro.saveSelectedBars();
		    if (bars.length > 0) {
			mapConfig.panel_configuration['selections']['selectedRowDendroBars'] = bars;
		    }
		}
		if (SUM.colDendro) {
		    const bars = SUM.colDendro.saveSelectedBars();
		    if (bars.length > 0) {
			mapConfig.panel_configuration['selections']['selectedColDendroBars'] = bars;
		    }
		}
	}

    }

    /**********************************************************************************
     * FUNCTION - zipSaveNotification: This function handles all of the tasks necessary
     * display a modal window whenever a zip file is being saved. The textId passed in
     * instructs the code to display either the startup save OR preferences save message.
     **********************************************************************************/
    function zipSaveNotification (heatMap, autoSave) {
	    var text;
	    UHM.initMessageBox();
	    UHM.setMessageBoxHeader("NG-CHM File Viewer");
	    if (autoSave) {
		    text = "<br>This NG-CHM archive file contains an out dated heat map configuration that has been updated locally to be compatible with the latest version of the NG-CHM Viewer.<br><br>In order to upgrade the NG-CHM and avoid this notice in the future, you will want to replace your original file with the version now being displayed.<br><br>";
		    UHM.setMessageBoxButton(1, UTIL.imageTable.saveNgchm, "Save NG-CHM button", () => {
			heatMap.zipSaveMapProperties(addSaveStateToMapConfig());
			UHM.messageBoxCancel();
		    });
	    } else {
		    text = "<br>You have just saved a heat map as a NG-CHM file.  In order to see your saved changes, you will want to open this new file using the NG-CHM File Viewer application.  If you have not already downloaded the application, press the Download Viewer button to get the latest version.<br><br>The application downloads as a single HTML file (ngchmApp.html).  When the download completes, you may run the application by simply double-clicking on the downloaded file.  You may want to save this file to a location of your choice on your computer for future use.<br><br>" 
		    UHM.setMessageBoxButton(1, "images/downloadViewer.png", "Download NG-CHM Viewer App", MMGR.zipAppDownload);
	    }
	    UHM.setMessageBoxText(text);
	    UHM.setMessageBoxButton(3, UTIL.imageTable.cancelSmall, "Cancel button", UHM.messageBoxCancel);
	    UHM.displayMessageBox();
    }

    function saveHeatMapToServer () {
	    const heatMap = MMGR.getHeatMap();
	    const mapConfig = heatMap.getMapConfig();
	    UHM.initMessageBox();
	    const success = MMGR.webSaveMapProperties(JSON.stringify(mapConfig));
	    if (success !== "false") {
		    heatMap.setUnAppliedChanges(false);
	    } else {
		    heatMap.setReadOnly();
		    UHM.saveHeatMapChanges();
	    }
	    return success;
    }
    // End of map save functions.


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

	    //If any new configs were added to the heatmap's config, save the config file.
	    const heatMap = MMGR.getHeatMap();
	    if (MMGR.mapUpdatedOnLoad() && heatMap.getMapInformation().read_only !== "Y") {
		    var success = autoSaveHeatMap(heatMap);
	    }

	    CUST.addCustomJS();
	    document.addEventListener ("keydown", DEV.keyNavigate);
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

    /**********************************************************************************
     * FUNCTION - widgetHelp: This function displays a special help popup box for
     * the widgetized version of the NG-CHM embedded viewer.
     **********************************************************************************/
    UIMGR.widgetHelp = function() {
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
	SUM.redrawCanvases();
    }

    /**********************************************************************************
     * FUNCTION - saveHeatMapChanges: This function handles all of the tasks necessary
     * display a modal window whenever the user requests to save heat map changes.
     **********************************************************************************/
    function saveHeatMapChanges () {
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
			    UHM.setMessageBoxButton(1, UTIL.imageTable.saveNgchm, "Save To NG-CHM File", saveHeatMapToNgchm);
			    UHM.setMessageBoxButton(4, UTIL.imageTable.closeButton, "Cancel Save", UHM.messageBoxCancel);
		    } else {
			    // If so, is read only?
			    if (heatMap.isReadOnly()) {
				    text = "<br>You have elected to save changes made to this READ-ONLY heat map. READ-ONLY heat maps cannot be updated.<br><br>However, you may save these changes to an NG-CHM file that may be opened using the NG-CHM File Viewer application.<br><br>";
				    UHM.setMessageBoxText(text);
				    UHM.setMessageBoxButton(1, UTIL.imageTable.saveNgchm, "Save To NG-CHM File", saveHeatMapToNgchm);
				    UHM.setMessageBoxButton(4, UTIL.imageTable.closeButton, "Cancel Save", UHM.messageBoxCancel);
			    } else {
				    text = "<br>You have elected to save changes made to this heat map.<br><br>You have the option to save these changes to the original map OR to save them to an NG-CHM file that may be opened using the NG-CHM File Viewer application.<br><br>";
				    UHM.setMessageBoxText(text);
				    UHM.setMessageBoxButton(1, UTIL.imageTable.saveNgchm, "Save To NG-CHM File", saveHeatMapToNgchm);
				    UHM.setMessageBoxButton(2, "images/saveOriginal.png", "Save Original Heat Map", saveHeatMapToServer);
				    UHM.setMessageBoxButton(3, UTIL.imageTable.closeButton, "Cancel Save", UHM.messageBoxCancel);
			    }
		    }
	    } else {
		    text = "<br>There are no changes to save to this heat map at this time.<br><br>However, you may save the map as an NG-CHM file that may be opened using the NG-CHM File Viewer application.<br><br>";
		    UHM.setMessageBoxText(text);
		    UHM.setMessageBoxButton(1, UTIL.imageTable.saveNgchm, "Save To NG-CHM File", saveHeatMapToNgchm);
		    UHM.setMessageBoxButton(4, UTIL.imageTable.closeButton, "Cancel Save", UHM.messageBoxCancel);
	    }
	    UHM.displayMessageBox();
    }

    const hamburgerButton = document.getElementById('barMenu_btn');
    hamburgerButton.onclick = (ev) => {
	openHamburgerMenu(ev.target);
    };

    (function() {
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
	function openLinkoutHelp () {
	    UHM.closeMenu();
	    const mapLinksTbl = openMapLinkoutsHelp();
	    const allLinksTbl = openAllLinkoutsHelp();
	    linkoutHelp(mapLinksTbl,allLinksTbl);
	    SUM.redrawCanvases();
	}

	/**********************************************************************************
	 * FUNCTION - openMapLinkoutsHelp: The purpose of this function is to construct an
	 * HTML table object containing all of the linkout plugins that apply to a
	 * particular heat map. The table is created and then passed on to a linkout
	 * popup help window.
	 **********************************************************************************/
	function openMapLinkoutsHelp () {
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
			var rowPluginFound = isPluginFound(plugin, rowLabels);
			var colPluginFound = isPluginFound(plugin, colLabels);
			var matrixPluginFound = isPluginMatrix(plugin);
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
	function openAllLinkoutsHelp () {
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
	function isPluginFound (plugin,labels) {
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
	function isPluginMatrix (plugin) {
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
	function linkoutHelp (mapLinksTbl, allLinksTbl) {
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
		linkBoxHdr.appendChild(UHM.createCloseX(linkBoxCancel));
		linkBoxTxt.innerHTML = "";
		linkBoxTxt.appendChild(mapLinksTbl);
		mapLinksTbl.style.width = '100%';
		linkBoxAllTxt.innerHTML = "";
		linkBoxAllTxt.appendChild(allLinksTbl);
		allLinksTbl.style.width = '100%';
		linkBoxSizing();
		hideAllLinks();
		showMapPlugins();
		linkBox.classList.remove ('hide');
		linkBox.style.left = ((window.innerWidth - linkBox.offsetWidth) / 2) + 'px';
	//	UTIL.dragElement(document.getElementById("linkBox"));
	}

	/**********************************************************************************
	 * FUNCTION - linkBoxCancel: The purpose of this function is to hide the linkout
	 * help popup window.
	 **********************************************************************************/
	function linkBoxCancel () {
		var linkBox = document.getElementById('linkBox');
		linkBox.classList.add ('hide');
	}

	/**********************************************************************************
	 * FUNCTION - hideAllLinks: The purpose of this function is to hide the linkout
	 * help boxes and reset the tabs associated with them.
	 **********************************************************************************/
	function hideAllLinks () {
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
	function linkBoxSizing () {
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

	/**********************************************************************************
	 * FUNCTION - showMapPlugins: The purpose of this function is to show the map specific
	 * plugins panel within the linkout help screen and toggle the appropriate
	 * tab button.
	 **********************************************************************************/
	function showMapPlugins () {
		//Turn off all tabs
		hideAllLinks();
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
	function showAllPlugins () {
		//Turn off all tabs
		hideAllLinks();
		//Turn on all links div
		var linkBoxAllTxt = document.getElementById('linkBoxAllTxt');
		var allLinksBtn = document.getElementById("allLinks_btn");
		allLinksBtn.setAttribute('src', 'images/allLinksOn.png');
		linkBoxAllTxt.classList.remove ('hide');
	}


	document.getElementById('menuLink').onclick = () => {
	    openLinkoutHelp();
	};

	document.getElementById('mapLinks_btn').onclick = () => {
	    showMapPlugins();
	};

	document.getElementById('allLinks_btn').onclick = () => {
	    showAllPlugins();
	};

	document.getElementById('linkBoxFootCloseButton').onclick = () => {
	    linkBoxCancel();
	};

    })();

    document.getElementById('menuHelp').onclick = () => {
	UHM.closeMenu();
	if (MMGR.source !== MMGR.WEB_SOURCE) {
	    UIMGR.widgetHelp();
	} else {
	    let url = location.origin+location.pathname;
	    window.open(url.replace("chm.html", "chmHelp.html"),'_blank');
	}
	SUM.redrawCanvases();
    };

    document.getElementById('aboutMenu_btn').onclick = (ev) => {
	UIMGR.widgetHelp();
    };

    document.getElementById('menuAbout').onclick = () => {
	UIMGR.widgetHelp();
    };

    document.getElementById('menuSave').onclick = () => {
	saveHeatMapChanges();
    };

})();
