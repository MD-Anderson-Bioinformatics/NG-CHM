//
// MatrixManager is responsible for retrieving clustered heat map data.  Heat map
// data is available at different 'zoom' levels - Summary, Ribbon Vertical, Ribbon
// Horizontal, and Full.  To use this code, create MatrixManger by calling the 
// MatrixManager function.  The MatrixManager lets you retrieve a HeatmapData object
// given a heat map name and summary level.  The HeatMapData object has various
// attributes of the map including the size an number of tiles the map is broken up 
// into.  getTile() is called on the HeatmapData to get each tile of the data.  Tile
// retrieval is asynchronous so you need to provide a callback that is triggered when
// the tile is retrieved.
//

//Define Namespace for NgChm Application
var NgChm = NgChm || {
};

// Function: createNS
// This function is called from other JS files to define their individual namespaces.
NgChm.createNS = function (namespace) {
    var nsparts = namespace.split(".");
    var parent = NgChm;
 
    // we want to be able to include or exclude the root namespace so we strip
    // it if it's in the namespace
    if (nsparts[0] === "NgChm") {
        nsparts = nsparts.slice(1);
    }
 
    // loop through the parts and create a nested namespace if necessary
    for (var i = 0; i < nsparts.length; i++) {
        var partname = nsparts[i];
        // check if the current parent already has the namespace declared
        // if it isn't, then create it
        if (typeof parent[partname] === "undefined") {
            parent[partname] = {};
        }
        // get a reference to the deepest element in the hierarchy so far
        parent = parent[partname];
    }
    // the parent is now constructed with empty namespaces and can be used.
    // we return the outermost namespace
    return parent;
};

//Define Namespace for NgChm MatrixManager
NgChm.createNS('NgChm.MMGR');

//For web-based NGCHMs, we will create a Worker process to overlap I/O and computation.
NgChm.MMGR.tileLoader = null;

//Supported map data summary levels.
NgChm.MMGR.THUMBNAIL_LEVEL = 'tn';
NgChm.MMGR.SUMMARY_LEVEL = 's';
NgChm.MMGR.RIBBON_VERT_LEVEL = 'rv';
NgChm.MMGR.RIBBON_HOR_LEVEL = 'rh';
NgChm.MMGR.DETAIL_LEVEL = 'd';

NgChm.MMGR.WEB_SOURCE = 'W';
NgChm.MMGR.LOCAL_SOURCE = 'L';
NgChm.MMGR.FILE_SOURCE = 'F';

NgChm.MMGR.Event_INITIALIZED = 'Init';
NgChm.MMGR.Event_JSON = 'Json';
NgChm.MMGR.Event_NEWDATA = 'NewData';
NgChm.MMGR.source= null;
NgChm.MMGR.embeddedMapName= null;
NgChm.MMGR.localRepository= '/NGCHM';


//Create a MatrixManager to retrieve heat maps. 
//Need to specify a fileSrc of heat map data - 
//web server or local file.
NgChm.MMGR.MatrixManager = function(fileSrc) {
	
	//Main function of the matrix manager - retrieve a heat map object.
	//mapFile parameter is only used for local file based heat maps.
	this.getHeatMap = function (heatMapName, updateCallback, mapFile) {
		return  new NgChm.MMGR.HeatMap(heatMapName, updateCallback, fileSrc, mapFile);
	}	
};    	


//Create a worker thread to request/receive tiles.  Using a separate
//thread allows the large tile I/O to overlap extended periods of heavy
//computation.
NgChm.MMGR.createWebTileLoader = function () {
	const debug = false;

	// Define worker script.
//	let wS = `"use strict";`
let	wS = `const debug = ${debug};`;
	wS += `const maxActiveRequests = 2;`; // Maximum number of tile requests that can be in flight concurrently
	wS += `var active = 0;`;              // Number of tile requests in flight
	wS += `const pending = [];`;          // Additional tile requests

	// The following function is stringified and sent to the web loader.
	function loadTile (job) {
		if (active === maxActiveRequests) {
			pending.push(job);
			return;
		}
		active++;
		const req = new XMLHttpRequest();
		req.open("GET", job.URL, true);
		req.responseType = "arraybuffer";
		req.onreadystatechange = function () {
			if (req.readyState == req.DONE) {
				active--;
				if (pending.length > 0) {
					loadTile (pending.shift());
				}
				if (req.status != 200) {
					postMessage({ op: 'tileLoadFailed', job });
				} else {
					// Transfer buffer to main thread.
					postMessage({ op: 'tileLoaded', job, buffer: req.response }, [req.response]);
				}
			}
		};
		req.send();
	}
	wS += loadTile.toString();

	// This function will be stringified and sent to the web loader.
	function handleMessage(e) {
		if (debug) console.log({ m: 'Worker: got message', e, t: performance.now() });
		if (e.data.op === 'loadTile') { loadTile (e.data.job); }
	}
	wS += handleMessage.toString();

	wS += `onmessage = handleMessage;`;
	if (debug) wS += `console.log ({ m:'TileLoader loaded', t: performance.now() });`;

	// Create blob and start worker.
	const blob = new Blob([wS], {type: 'application/javascript'});
	if (debug) console.log({ m: 'MMGR.createWebTileLoader', blob, wS });
	NgChm.MMGR.tileLoader = new Worker(URL.createObjectURL(blob));
};

//HeatMap Object - holds heat map properties and a tile cache
//Used to get HeatMapData object.
//ToDo switch from using heat map name to blob key?
NgChm.MMGR.HeatMap = function(heatMapName, updateCallback, fileSrc, chmFile) {
	//This holds the various zoom levels of data.
	var mapConfig = null;
	var mapData = null;
	var datalevels = {};
	const alternateLevels = {};	
	var tileCache = {};
	var zipFiles = {};
	var colorMapMgr;
	var initialized = 0;
	var eventListeners = [];
	var flickInitialized = false;
	var unAppliedChanges = false;
	NgChm.MMGR.source= fileSrc;
	
	this.isMapLoaded = function () {
		if (mapConfig !== null)  
			return true;
		else
			return false;
	}
	
	this.isFileMode = function () {
		if (NgChm.MMGR.source=== NgChm.MMGR.FILE_SOURCE) 
			return true;
		else
			return false;
	}
	
	this.isReadOnly = function(){
		if (mapConfig.data_configuration.map_information.read_only === 'Y') {
			return true;
		} else {
			return false;
		}
	}
	
	this.setUnAppliedChanges = function(value){
		unAppliedChanges = value;
		return;
	}
	
	this.getUnAppliedChanges = function(){
		return unAppliedChanges;
	}
	
	//Return the total number of detail rows
	this.getTotalRows = function(){
		return datalevels[NgChm.MMGR.DETAIL_LEVEL].totalRows;
	}
	
	this.setFlickInitialized = function(value){
		flickInitialized = value;
	}
	
	//Return the total number of detail rows
	this.getTotalCols = function(){
		return datalevels[NgChm.MMGR.DETAIL_LEVEL].totalColumns;
	}
	
	//Return the number of rows for a given level
	this.getNumRows = function(level){
		return datalevels[level].totalRows;
	}
	
	//Return the number of columns for a given level
	this.getNumColumns = function(level){
		return datalevels[level].totalColumns;
	}
	
	//Return the row summary ratio for a given level
	this.getRowSummaryRatio = function(level){
		return datalevels[level].rowSummaryRatio;
	}
	
	//Return the column summary ratio for a given level
	this.getColSummaryRatio = function(level){
		return datalevels[level].colSummaryRatio;
	}
	
	//Get a data value in a given row / column
	this.getValue = function(level, row, column) {
		return datalevels[level].getValue(row,column);
	}
	
	// Retrieve color map Manager for this heat map.
	this.getColorMapManager = function() {
		if (initialized != 1)
			return null;
		
		if (colorMapMgr == null ) {
			colorMapMgr = new NgChm.CMM.ColorMapManager(mapConfig);
		}
		return colorMapMgr;
	}
	
	this.getAxisConfig = function(axis) {
		return axis.toUpperCase() === "ROW" ? this.getRowConfig() : this.getColConfig();
	};

	this.getRowConfig = function() {
		return mapConfig.row_configuration;
	}
	
	this.getColConfig = function() {
		return mapConfig.col_configuration;
	}
	
	this.getAxisCovariateConfig = function (axis) {
		return this.getAxisConfig(axis).classifications;
	}
	
	this.getRowClassificationConfig = function() {
		return mapConfig.row_configuration.classifications;
	}
	
	this.getRowClassificationConfigOrder = function() {
		return mapConfig.row_configuration.classifications_order;
	}
	
	this.getColClassificationConfig = function() {
		return mapConfig.col_configuration.classifications;
	}
	
	this.getColClassificationConfigOrder = function() {
		return mapConfig.col_configuration.classifications_order;
	}
	
	// Return an array of the display heights of all covariate bars on an axis.
	// Hidden bars have a height of zero.  The order of entries is fixed but not
	// specified.
	this.getCovariateBarHeights = function (axis) {
		return Object.entries(this.getAxisCovariateConfig(axis))
		.map(([key,config]) => config.show === 'Y' ? (config.height|0) : 0)
	}

	// Return the total display height of all covariate bars on an axis.
	this.calculateTotalClassBarHeight = function (axis) {
		return this.getCovariateBarHeights(axis).reduce((t,h) => t+h, 0);
	}
	
	this.getRowClassificationOrder = function(showOnly) {
		var rowClassBarsOrder = mapConfig.row_configuration.classifications_order;
		// If configuration not found, create order from classifications config
		if (typeof rowClassBarsOrder === 'undefined') {
			rowClassBarsOrder = [];
			for (key in mapConfig.row_configuration.classifications) {
				rowClassBarsOrder.push(key);
			}
		}
		// Filter order for ONLY shown bars (if requested)
		if (typeof showOnly === 'undefined') {
			return rowClassBarsOrder;
		} else {
			filterRowClassBarsOrder = [];
			for (var i = 0; i < rowClassBarsOrder.length; i++) {
				var newKey = rowClassBarsOrder[i];
				var currConfig = mapConfig.row_configuration.classifications[newKey];
				if (currConfig.show == "Y") {
					filterRowClassBarsOrder.push(newKey);
				}
			}
			return filterRowClassBarsOrder;
		}
	}
	
	this.setRowClassificationOrder = function() {
		mapConfig.row_configuration.classifications_order = this.getRowClassificationOrder();
	}
	
	this.getColClassificationOrder = function(showOnly){
		var colClassBarsOrder = mapConfig.col_configuration.classifications_order;
		// If configuration not found, create order from classifications config
		if (typeof colClassBarsOrder === 'undefined') {
			colClassBarsOrder = [];
			for (key in mapConfig.col_configuration.classifications) {
				colClassBarsOrder.push(key);
			}
		}
		// Filter order for ONLY shown bars (if requested)
		if (typeof showOnly === 'undefined') {
			return colClassBarsOrder;
		} else {
			filterColClassBarsOrder = [];
			for (var i = 0; i < colClassBarsOrder.length; i++) {
				var newKey = colClassBarsOrder[i];
				var currConfig = mapConfig.col_configuration.classifications[newKey];
				if (currConfig.show == "Y") {
					filterColClassBarsOrder.push(newKey);
				}
			}
			return filterColClassBarsOrder;
		}
	}
	
	this.setColClassificationOrder = function() {
		mapConfig.col_configuration.classifications_order = this.getColClassificationOrder();
	}
	
	this.getRowClassificationData = function() {
		return mapData.row_data.classifications;
	}
	
	this.getColClassificationData = function() {
		return mapData.col_data.classifications;
	}
	
	this.getMapInformation = function() {
		return mapConfig.data_configuration.map_information;
	}
	
	this.getDataLayers = function() {
		return mapConfig.data_configuration.map_information.data_layer;
	}
	
	this.getDividerPref = function() {
		return mapConfig.data_configuration.map_information.summary_width;
	}

	this.setDividerPref = function(sumSize) {
		var sumPercent = 50;
		if (sumSize === undefined) {
			var container = document.getElementById('container');
			var summary = document.getElementById('summary_chm');
			sumPercent = Math.ceil(100*summary.clientWidth / container.clientWidth);
		} else {
			sumPercent = sumSize;
		}
		mapConfig.data_configuration.map_information.summary_width = sumPercent;
		mapConfig.data_configuration.map_information.detail_width = 100 - sumPercent;
	}
	
	this.setClassificationPrefs = function(classname, type, showVal, heightVal) {
		if (type === "row") {
			mapConfig.row_configuration.classifications[classname].show = showVal ? 'Y' : 'N';
			mapConfig.row_configuration.classifications[classname].height = parseInt(heightVal);
		} else {
			mapConfig.col_configuration.classifications[classname].show = showVal ? 'Y' : 'N';
			mapConfig.col_configuration.classifications[classname].height = parseInt(heightVal);
		}
	}
	
	this.setClassBarScatterPrefs = function(classname, type, barType, lowBound, highBound, fgColorVal, bgColorVal) {
		if (type === "row") {
			mapConfig.row_configuration.classifications[classname].bar_type = barType;
			if (typeof lowBound !== 'undefined') {
				mapConfig.row_configuration.classifications[classname].low_bound = lowBound;
				mapConfig.row_configuration.classifications[classname].high_bound = highBound;
				mapConfig.row_configuration.classifications[classname].fg_color = fgColorVal;
				mapConfig.row_configuration.classifications[classname].bg_color = bgColorVal;
			}
		} else {
			mapConfig.col_configuration.classifications[classname].bar_type = barType;
			if (typeof lowBound !== 'undefined') {
				mapConfig.col_configuration.classifications[classname].low_bound = lowBound;
				mapConfig.col_configuration.classifications[classname].high_bound = highBound;
				mapConfig.col_configuration.classifications[classname].fg_color = fgColorVal;
				mapConfig.col_configuration.classifications[classname].bg_color = bgColorVal;
			}
		}
	}

	this.setLayerGridPrefs = function(key, showVal, gridColorVal, selectionColorVal, gapColorVal) {
		mapConfig.data_configuration.map_information.data_layer[key].grid_show = showVal ? 'Y' : 'N';
		mapConfig.data_configuration.map_information.data_layer[key].grid_color = gridColorVal;
		mapConfig.data_configuration.map_information.data_layer[key].cuts_color = gapColorVal;
		mapConfig.data_configuration.map_information.data_layer[key].selection_color = selectionColorVal;
	}
	
	//Get Row Organization
	this.getRowOrganization = function() {
		return mapConfig.row_configuration.organization;
	}
	
	//Get Axis Labels
	this.getAxisLabels = function(axis) {
		return axis.toUpperCase() === 'ROW' ? mapData.row_data.label : mapData.col_data.label;
	};

	//Get Row Labels
	this.getRowLabels = function() {
		return mapData.row_data.label;
	}
	
	//Get Column Organization
	this.getColOrganization = function() {
		return mapConfig.col_configuration.organization;
	}
	
	//Get Column Labels
	this.getColLabels = function() {
		return mapData.col_data.label;
	}
	
	//Get map information config data
	this.getMapInformation = function() {
		return mapConfig.data_configuration.map_information; 
	}

	this.getRowDendroConfig = function() {
		return mapConfig.row_configuration.dendrogram;
	}
	
	this.getColDendroConfig = function() {
		return mapConfig.col_configuration.dendrogram;
	}
	
	this.getRowDendroData = function() {
		return parseDendroData (mapData.row_data.dendrogram);
	}
	
	this.getColDendroData = function() {
		return parseDendroData (mapData.col_data.dendrogram);
	}
	
	this.setRowDendrogramShow = function(value) {
		mapConfig.row_configuration.dendrogram.show = value;
	}
	
	this.setColDendrogramShow = function(value) {
		mapConfig.col_configuration.dendrogram.show = value;
	}
	
	this.setRowDendrogramHeight = function(value) {
		mapConfig.row_configuration.dendrogram.height = value;
	}
	
	this.setColDendrogramHeight = function(value) {
		mapConfig.col_configuration.dendrogram.col_dendro_height = value;
	}
	
	this.showRowDendrogram = function(layer) {
		var showDendro = true;
		var showVal = mapConfig.row_configuration.dendrogram.show;
		if ((showVal === 'NONE') || (showVal === 'NA')) {
			showDendro = false;
		}
		if ((layer === 'DETAIL') && (showVal === 'SUMMARY')) {
			showDendro = false;
		}
		return showDendro;
	}

	this.showColDendrogram = function(layer) {
		var showDendro = true;
		var showVal = mapConfig.col_configuration.dendrogram.show;
		if ((showVal === 'NONE') || (showVal === 'NA')) {
			showDendro = false;
		}
		if ((layer === 'DETAIL') && (showVal === 'SUMMARY')) {
			showDendro = false;
		}
		return showDendro;
	}

	this.saveHeatMapToServer = function () {
		var success = true;
		NgChm.UHM.initMessageBox();
		success = webSaveMapProperties(JSON.stringify(mapConfig)); 
		if (success !== "false") {
			NgChm.heatMap.setUnAppliedChanges(false);
		} else {
			mapConfig.data_configuration.map_information.read_only = 'Y';
			NgChm.UHM.saveHeatMapChanges();
		}
		return success;
	}
	
	this.saveHeatMapToNgchm = function () {
		var success = true;
		NgChm.UHM.initMessageBox();
		if (fileSrc === NgChm.MMGR.WEB_SOURCE) {
			success = zipMapProperties(JSON.stringify(mapConfig)); 
			NgChm.UHM.zipSaveNotification(false);
		} else {
			zipSaveMapProperties();
			NgChm.UHM.zipSaveNotification(false);
		}
		NgChm.heatMap.setUnAppliedChanges(false);
	}
	
	this.autoSaveHeatMap = function () {
		this.setRowClassificationOrder();
		this.setColClassificationOrder();
		var success = true;
		if (fileSrc !== NgChm.MMGR.FILE_SOURCE) {
			success = webSaveMapProperties(JSON.stringify(mapConfig)); 
		} else if (NgChm.MMGR.embeddedMapName === null) {
			NgChm.UHM.zipSaveNotification(true);
		}
		return success;
	}

	this.zipSaveNgchm = function () {
		zipSaveMapProperties();
		NgChm.UHM.messageBoxCancel();
	}

	// Call download of NGCHM File Viewer application zip
	this.downloadFileApplication = function () { 
		if (typeof NgChm.galaxy !== 'undefined') {
			window.open("/plugins/visualizations/mda_heatmap_viz/static/ngChmApp.zip");
		} else {
			zipAppFileMode();
		}	
	}

	
	//This function is used to set a read window for high resolution data layers.
	//Calling setReadWindow will cause the HeatMap object to retrieve tiles needed
	//for reading this area if the tiles are not already in the cache.
    this.setReadWindow = function(level, row, column, numRows, numColumns) {
  	//Thumb nail and summary level are always kept in the cache.  Don't do fetch for them.
  	if (level != NgChm.MMGR.THUMBNAIL_LEVEL && level != NgChm.MMGR.SUMMARY_LEVEL)
  		datalevels[level].setReadWindow(row, column, numRows, numColumns);
    } 	

	
	//Method used to register another callback function for a user that wants to be notifed
	//of updates to the status of heat map data.
	this.addEventListener = function(callback) {
		eventListeners.push(callback);
	}
	
	//Is the heat map ready for business 
	this.isInitialized = function() {
		if (initialized === 1) {
	 		document.getElementById('loader').style.display = 'none';
		}
		return initialized;
	}

	//If collectionHome param exists on URL, add "back" button to screen.
	this.configureButtonBar = function(){
		var splitButton = document.getElementById("split_btn");
		if ((splitButton != null) && (fileSrc === NgChm.MMGR.FILE_SOURCE)) {
			splitButton.style.display = 'none';
		}
		var backButton = document.getElementById("back_btn");
		var url = NgChm.UTIL.getURLParameter("collectionHome");
		if (url !== "") {
			backButton.style.display = '';
		}
	}
	
	this.configureFlick = function(){
		if (!flickInitialized) {
			var flicks = document.getElementById("flicks");
			var flickViewsOff = document.getElementById("noFlickViews");
			var flickViewsDiv = document.getElementById("flickViews");
			var flick1 = document.getElementById("flick1");
			var flick2 = document.getElementById("flick2");
			var dl = this.getDataLayers();
			var maxDisplay = 0;
			if (Object.keys(dl).length > 1) {
				var dls = new Array(Object.keys(dl).length);
				var orderedKeys = new Array(Object.keys(dl).length);
				var flickOptions = "";
				for (var key in dl){
					var dlNext = key.substring(2, key.length);
					orderedKeys[dlNext-1] = key;
					var displayName = dl[key].name;
					if (displayName.length > maxDisplay) {
						maxDisplay = displayName.length;
					}
					if (displayName.length > 20){
						displayName = displayName.substring(0,20) + "...";
					}
					dls[dlNext-1] = '<option value="'+key+'">'+displayName+'</option>';
				}
				for(var i=0;i<dls.length;i++) {
					flickOptions += dls[i];
				}
				flick1.innerHTML=flickOptions;
				flick2.innerHTML=flickOptions;
				flick1.value=NgChm.SEL.currentDl;
				flick2.value=orderedKeys[1];
				flicks.style.display='';
				flicks.style.right=1;
				if (flickViewsDiv.style.display === 'none') {;
					flickViewsOff.style.display='';
				}
			} else {
				NgChm.SEL.currentDl = "dl1";
				flicks.style.display='none';
			}
			flickInitialized = true;
			var gearBtnPanel = document.getElementById("pdf_gear");
			if (maxDisplay > 15) {
				gearBtnPanel.style.minWidth = '320px';
			} else if (maxDisplay === 0) {
				gearBtnPanel.style.minWidth = '80px';
			} else {	
				gearBtnPanel.style.minWidth = '250px';
			}
			
		}
	}

	
	//************************************************************************************************************
	//
	// Internal Heat Map Functions.  Users of the heat map object don't need to use / understand these.
	//
	//************************************************************************************************************
	
	//Initialization - this code is run once when the map is created.
	
	//Add the original update call back to the event listeners list.
	eventListeners.push(updateCallback);
	
	if (fileSrc !== NgChm.MMGR.FILE_SOURCE){
		//fileSrc is web so get JSON files from server
		//Retrieve  all map configuration data.
		webFetchJson('mapConfig', addMapConfig);
		//Retrieve  all map supporting data (e.g. labels, dendros) from JSON.
		webFetchJson('mapData', addMapData);
		connectWebTileLoader();
	} else {
		//Check file mode viewer software version (excepting when using embedded widget)
		if (typeof embedDiv === 'undefined') {
			fileModeFetchVersion();
		}
		//fileSrc is file so get the JSON files from the zip file.
		//First create a dictionary of all the files in the zip.
		var zipBR = new zip.BlobReader(chmFile);
		zip.createReader(zipBR, function(reader) {
			// get all entries from the zip
			reader.getEntries(function(entries) {
				//Inspect the first entry path to grab the true heatMapName.
				//The user may have renamed the zip file OR it was downloaded
				//as a second+ generation of a file by the same name (e.g. with a " (1)" 
				//in the name).
				var entryName = entries[0].filename;
				heatMapName = entryName.substring(0,entryName.indexOf("/"));
				for (var i = 0; i < entries.length; i++) {
					zipFiles[entries[i].filename] = entries[i];
				}
				zipFetchJson(zipFiles[heatMapName + "/mapConfig.json"], addMapConfig);	 
				zipFetchJson(zipFiles[heatMapName + "/mapData.json"], addMapData);	 
			});
		}, function(error) {
			console.log('Zip file read error ' + error);
		});	
	}
	
	// Parse dendrogram data.
	function parseDendroData (data) {
		return (data || [])
		.map(entry => {
			const tokes = entry.split(",");
			return { left: Number(tokes[0]), right: Number(tokes[1]), height: Number(tokes[2]) };
		});
	}
	
	function zipSaveMapProperties() {

		  function onProgress(a, b) {
			  // For debug use - console.log("current", a, "end", b);
		  }

		  var zipper = (function buildZipFile() {
		    var zipWriter;

		    return {
		      addTexts : function addEntriesToZipFile(callback) {
					// Loop thru all entries in zipFiles, adding them to the new zip file.
			    	function add(fileIndex) {
						var zipLen = Object.keys(zipFiles).length;
						var keyVal = Object.keys(zipFiles)[fileIndex];
						var entry = zipFiles[keyVal];
						if (fileIndex < zipLen) {
							if ((keyVal.indexOf('bin') < 0) && (keyVal.indexOf('tile') < 0)) {
								// Directly add all text zip entries directly to the new zip file
								// except for mapConfig.  For this entry, add the modified config data.
								if (keyVal.indexOf('mapConfig') > -1) {
									addTextContents(entry.filename, fileIndex, JSON.stringify(mapConfig));
								} else {
									zipFetchText(entry, fileIndex, addTextContents);
								}
							} else {
								// Directly add all binary zip entries directly to the new zip file
								zipFetchBin(entry, fileIndex, addBinContents);
							}
						} else {
						  callback() /* [2] no more files to add: callback is called */;
						}
			        }
					// Get the text data for a given zip entry and execute the 
					// callback to add that data to the zip file.
					function zipFetchText(entry, fileIndex, setterFunction) {
						entry.getData(new zip.TextWriter(), function(text) {
							// got the json, now call the appropriate setter
							setterFunction(entry.filename, fileIndex, text);
						}, function(current, total) {
							// onprogress callback
						});
					}
					// Get the binary data for a given zip entry and execute the 
					// callback to add that data to the zip file.
			    	function zipFetchBin(entry, fileIndex, setterFunction) {
						entry.getData(new zip.BlobWriter(), function(blob) {
			    			setterFunction(entry.filename, fileIndex, blob);
						}, function(current, total) {
							// onprogress callback
						});		
			    	}
					// Add text contents to the zip file and call the add function 
					// to process the next zip entry stored in zipFiles.
			        function addTextContents(name, fileIndex, contents) {
		                zipWriter.add(name, new zip.TextReader(contents), function() {
			                add(fileIndex + 1); /* [1] add the next file */
			              }, onProgress);
			        }
					// Add binary contents to the zip file and call the add function 
					// to process the next zip entry stored in zipFiles.
			        function addBinContents(name, fileIndex, contents) {
		                zipWriter.add(name, new zip.BlobReader(contents), function() {
			                add(fileIndex + 1); /* [1] add the next file */
			              }, onProgress);
			        }
			      // Start the zip file creation process by instantiating a writer
			      // and calling the add function for the first entry in zipFiles.
		          zip.createWriter(new zip.BlobWriter(), function(writer) {
		            zipWriter = writer;
		            add(0); /* [1] add the first file */
		          });
		      },
		      getBlob : function(callback) {
		        zipWriter.close(callback);
		      }
		    };
		  })();

		  zipper.addTexts(function addTextsCallback() {
		    zipper.getBlob(function getBlobCallback(blob) {
		      saveAs(blob, heatMapName+".ngchm");   
		    });
		  });  
		}
	
	function webSaveMapProperties(jsonData) {
		var success = "false";
		var name = NgChm.CFG.api + "SaveMapProperties?map=" + heatMapName;
		var req = new XMLHttpRequest();
		req.open("POST", name, false);
		req.setRequestHeader("Content-Type", "application/json");
		req.onreadystatechange = function () {
			if (req.readyState == req.DONE) {
				if (req.status != 200) {
					console.log('Failed in call to save propeties from server: ' + req.status);
					success = "false";
				} else {
					success = req.response;
				}
			}
		};	
		req.send(jsonData);
		return success;
	}

	function zipAppFileMode() {
		var name = "";
		if (fileSrc === NgChm.MMGR.FILE_SOURCE){
			name += NgChm.CM.viewerAppUrl;
		} else {
			name = NgChm.CFG.api;
		}		
		name += "ZipAppDownload"; 
		callServlet("POST", name, false);
		return true;
	}
	
	function zipMapProperties(jsonData) {
		var success = "";
		var name = NgChm.CFG.api + "ZippedMap?map=" + heatMapName; 
		callServlet("POST", name, jsonData);
		return true;
	}
	
	callServlet = function(verb, url, data) {
		  var form = document.createElement("form");
		  form.action = url;
		  form.method = verb;
		  if (data) { 
		    var input = document.createElement("textarea");
	        input.name = "configData";
	        input.id = "configData";
	        input.value = data;
	        form.appendChild(input);
		  }
		  form.style.display = 'none';
		  document.body.appendChild(form);
		  form.submit();
		};
	
	//  Initialize the data layers once we know the tile structure.
		//  JSON structure object describing available data layers passed in.
		function addDataLayers(mapConfig) {
			//Create heat map data objects for each data level.  All maps should have thumb nail and full level.
			//Each data layer keeps a pointer to the next lower level data layer.
			const levelsConf = mapConfig.data_configuration.map_information.levels;
			const datalayers = mapConfig.data_configuration.map_information.data_layer

			// Create a HeatMapData object for level levelId if it's defined in the map configuration.
			// Set the level's lower level to the HeatMapData object for lowerLevelId (if it's defined).
			// If levelId is not defined in the map configuration, create an alias to the
			// HeatMapData object for altLevelId (if it's defined).
			function createLevel (levelId, lowerLevelId, altLevelId) {
				if (levelsConf.hasOwnProperty (levelId)) {
					datalevels[levelId] = new NgChm.MMGR.HeatMapData(heatMapName,
									levelId,
									levelsConf[levelId],
									datalayers,
									lowerLevelId ? datalevels[lowerLevelId] : null,
									getTileCacheData,
									getTile);
				} else if (altLevelId) {
					datalevels[levelId] = datalevels[altLevelId];
					// Record all levels for which altLevelId is serving as an immediate alternate.
					if (!alternateLevels.hasOwnProperty(altLevelId)) {
						alternateLevels[altLevelId] = [];
					}
					alternateLevels[altLevelId].push (levelId);				}
			}

			createLevel (NgChm.MMGR.THUMBNAIL_LEVEL);
			createLevel (NgChm.MMGR.SUMMARY_LEVEL, NgChm.MMGR.THUMBNAIL_LEVEL, NgChm.MMGR.THUMBNAIL_LEVEL);
			createLevel (NgChm.MMGR.DETAIL_LEVEL, NgChm.MMGR.SUMMARY_LEVEL, NgChm.MMGR.SUMMARY_LEVEL);
			createLevel (NgChm.MMGR.RIBBON_VERT_LEVEL, NgChm.MMGR.SUMMARY_LEVEL, NgChm.MMGR.DETAIL_LEVEL);
			createLevel (NgChm.MMGR.RIBBON_HOR_LEVEL, NgChm.MMGR.SUMMARY_LEVEL, NgChm.MMGR.DETAIL_LEVEL);

			prefetchInitialTiles(datalayers, datalevels, levelsConf);
			sendCallBack(NgChm.MMGR.Event_INITIALIZED);
	}
	
	function addMapData(md) {
		mapData = md;
		NgChm.CM.mapDataCompatibility(mapData);
		sendCallBack(NgChm.MMGR.Event_JSON);
	}
	
	function addMapConfig(mc) {
		mapConfig = mc;
		addDataLayers(mc);
		NgChm.CM.CompatibilityManager(mapConfig);
		sendCallBack(NgChm.MMGR.Event_JSON);
	}
	
	function prefetchInitialTiles(datalayers, datalevels, levels) {
		const layerNames = Object.keys(datalayers);
		const layers1 = [layerNames[0]];
		const otherLayers = layerNames.slice(1);

		// Prefetch tiles for initial (first) layer.
		if (levels.tn !== undefined) {
			//Kickoff retrieve of thumb nail data tile.
			datalevels[NgChm.MMGR.THUMBNAIL_LEVEL].loadTiles(layers1, levels.tn.tile_rows, levels.tn.tile_cols);
		}
		if (levels.d !== undefined) {
			// Initial tile for detail pane only. (Assume top-left tile.)
			datalevels[NgChm.MMGR.DETAIL_LEVEL].loadTiles(layers1, 1, 1);
		}
		if (levels.s !== undefined) {
			//Kickoff retrieve of summary data tiles.
			datalevels[NgChm.MMGR.SUMMARY_LEVEL].loadTiles(layers1, levels.s.tile_rows, levels.s.tile_cols);
		}

		if (otherLayers.length > 0) {
			setTimeout (function prefetchOtherLayers() {
		// Prefetch tiles for other layers.
		if (levels.tn !== undefined) {
			//Kickoff retrieve of thumb nail data tile.
			datalevels[NgChm.MMGR.THUMBNAIL_LEVEL].loadTiles(otherLayers, levels.tn.tile_rows, levels.tn.tile_cols);
		}
		if (levels.s !== undefined) {
			//Kickoff retrieve of summary data tiles.
			datalevels[NgChm.MMGR.SUMMARY_LEVEL].loadTiles(otherLayers, levels.s.tile_rows, levels.s.tile_cols);
		}
			}, 0);
		}
	}
	
	// Return the tile cache (For debugging.)
	NgChm.MMGR.getTileCache = function getTileCache () {
		return tileCache;
	};

	// Display statistics about each loaded tile cache entry.
	NgChm.MMGR.showTileCacheStats = function () {
		for (let tileCacheName in tileCache) {
			const e = tileCache[tileCacheName];
			if (e.state === 'ready') {
				const loadTime = e.loadTime - e.fetchTime;
				const loadTimePerKByte = loadTime / e.data.length * 1024;
				console.log ({ tileCacheName, KBytes: e.data.length / 1024, loadTime, loadTimePerKByte });
			}
		}
	};

	// Remove a tile cache entry.
	function removeTileCacheEntry (tileCacheName) {
		delete tileCache[tileCacheName];
	}

	// Get the data for a tile, if it's loaded.
	function getTileCacheData (tileCacheName) {
		const entry = tileCache[tileCacheName];
		if (entry && entry.state === 'ready') {
			return entry.data;
		} else {
			return null;
		}
	}

	// Set the data for the specified tile.
	// Also broadcasts a message that the tile has been received.
	function setTileCacheEntry (tileCacheName, arrayData) {
		const entry = tileCache[tileCacheName];
		entry.loadTime = performance.now();
		entry.data = arrayData;

		entry.state = 'ready';
		sendCallBack(NgChm.MMGR.Event_NEWDATA, Object.assign({},entry.props));
	}
	
	// Handle replies from tileio worker.
	function connectWebTileLoader () {
		const debug = false;
		NgChm.MMGR.tileLoader.onmessage = function(e) {
			if (debug) console.log({ m: 'Received message from tileLoader', e });
			if (e.data.op === 'tileLoaded') {
				const tiledata = new Float32Array(e.data.buffer);
				setTileCacheEntry (e.data.job.tileCacheName, tiledata);
			} else if (e.data.op === 'tileLoadFailed') {
				removeTileCacheEntry (e.data.job.tileCacheName);  // Allow another fetch attempt.
			} else {
				console.log({ m: 'connectWebTileLoader: unknown op', e });
			}
		};

	};

	// Create the specified cache entry.
	function createTileCacheEntry (tileCacheName) {
		const [ layer, level, row, col ] = tileCacheName.split('.');
		return tileCache[tileCacheName] = {
			state: 'new',
			data: null,
			props: { layer, level, row: row|0, col: col|0 },
			fetchTime: performance.now(),
			loadTime: 0.0	// Placeholder
		};
	}
	
	// Return true iff the specified tile has completed loading into the tile cache.
	function haveTileData (tileCacheName) {
		const td = tileCache[tileCacheName];
		return td && td.state === 'ready';
	}
	
	//Call the users call back function to let them know the chm is initialized or updated.
	function sendCallBack(event, tile) {

		//Initialize event
		if ((event === NgChm.MMGR.Event_INITIALIZED) || (event === NgChm.MMGR.Event_JSON) ||
			((event === NgChm.MMGR.Event_NEWDATA) && (tile.level === NgChm.MMGR.THUMBNAIL_LEVEL))) {
			//Only send initialized status if several conditions are met: need all summary JSON and thumb nail.
			if ((mapData != null) &&
				(mapConfig != null) &&
				(Object.keys(datalevels).length > 0) &&
				(haveTileData(NgChm.SEL.currentDl+"."+NgChm.MMGR.THUMBNAIL_LEVEL+".1.1")) &&
				 (initialized == 0)) {
					initialized = 1;
					sendAllListeners(NgChm.MMGR.Event_INITIALIZED);
			}
			//Unlikely, but possible to get init finished after all the summary tiles.
			//As a back stop, if we already have the top left summary tile, send a data update event too.
			if (haveTileData(NgChm.SEL.currentDl+"."+NgChm.MMGR.SUMMARY_LEVEL+".1.1")) {
				sendAllListeners(NgChm.MMGR.Event_NEWDATA, { layer: NgChm.SEL.currentDl, level: NgChm.MMGR.SUMMARY_LEVEL, row: 1, col: 1});
			}
		} else	if ((event === NgChm.MMGR.Event_NEWDATA) && (initialized === 1)) {
			sendAllListeners(event, tile);
		}
	}	
	
	//send to all event listeners
	function sendAllListeners(event, tile){
		sendAll (event, tile);
		if (event === NgChm.MMGR.Event_NEWDATA) {
			// Also broadcast NEWDATA events to all layers for which tile.level is an alternate.
			const { layer, level: mylevel, row, col } = tile;
			const alts = getAllAlternateLevels (mylevel);
			while (alts.length > 0) {
				const level = alts.shift();
				sendAll (NgChm.MMGR.Event_NEWDATA, {layer, level, row, col});
			}
		}

		function sendAll (event, tile) {
			for (var i = 0; i < eventListeners.length; i++) {
				eventListeners[i](event, tile);
			}
		}
	}

	// Recursively determine all levels for which level is an alternate.
	function getAllAlternateLevels (level) {
		const altlevs = alternateLevels.hasOwnProperty (level) ? alternateLevels[level] : [];
		const pal = altlevs.map(lev => getAllAlternateLevels(lev));
		return [...new Set(pal.concat(altlevs).flat())];  // Use [...Set] to ensure uniqueness
	}	
	
	//Fetch a data tile if needed.
	function getTile(layer, level, tileRow, tileColumn) {
		var tileCacheName=layer + "." +level + "." + tileRow + "." + tileColumn;
		if (tileCache.hasOwnProperty(tileCacheName)) {
			//Already have tile in cache - do nothing.
			return;
		}
		createTileCacheEntry(tileCacheName);
		var tileName=level + "." + tileRow + "." + tileColumn;  

  	//ToDo: need to limit the number of tiles retrieved.
  	//ToDo: need to remove items from the cache if it is maxed out. - don't get rid of thumb nail or summary.

		if ((fileSrc == NgChm.MMGR.WEB_SOURCE) || (fileSrc == NgChm.MMGR.LOCAL_SOURCE)) {
			let URL;
			if (fileSrc == NgChm.MMGR.WEB_SOURCE) {
				let getTileString = "GetTile?map=" + heatMapName + "&datalayer=" + layer + "&level=" + level + "&tile=" + tileName;
				// Because a tile worker thread doesn't share our origin, we have to pass it
				// an absolute URL, and to substitute in the CFG.api variable, we want to
				// build the URL using the same logic as a browser for relative vs. absolute
				// paths.
				if (NgChm.CFG.api[0] === '/') {	// absolute
					URL = document.location.origin + NgChm.CFG.api + getTileString;
				} else {
					URL = document.location.origin + '/' +
						window.location.pathname.substr(1, window.location.pathname.lastIndexOf('/')) +
						NgChm.CFG.api + getTileString;
				}

//				if (NgChm.CFG.api !== "") {
//					URL = NgChm.CFG.api + getTileString;
//				} else {
//					var appPath = window.location.pathname.substr(1, window.location.pathname.lastIndexOf('/'));
//					URL = appPath + getTileString;
//				}
//				// Tile worker doesn't share our origin, so prepend it to URL.
//				URL = document.location.origin + (URL[0] === '/' ? '' : '/') + URL;
			} else {
				URL = NgChm.MMGR.localRepository+"/"+NgChm.MMGR.embeddedMapName+"/"+layer+"/"+level+"/"+tileName+".bin";
			}
			NgChm.MMGR.tileLoader.postMessage({ op: 'loadTile', job: { tileCacheName, URL } });
		} else {
			//File fileSrc - get tile from zip
			var entry = zipFiles[heatMapName + "/" + layer + "/"+ level + "/" + tileName + '.tile'];
			if (typeof entry === 'undefined') {
				entry = zipFiles[heatMapName + "/" + layer + "/"+ level + "/" + tileName + '.bin'];
			}
			if (typeof entry !== "undefined") {
				entry.getData(new zip.BlobWriter(), function(blob) {
					var fr = new FileReader();
					
					fr.onload = function(e) {
				        var arrayBuffer = fr.result;
				        var far32 = new Float32Array(arrayBuffer);
				    	  
				        setTileCacheEntry(tileCacheName, far32);
				     }
	
				     fr.readAsArrayBuffer(blob);		
				}, function(current, total) {
					// onprogress callback
				});		
			}
		}
	};	
	
	//Helper function to fetch a json file from server.  
	//Specify which file to get and what funciton to call when it arrives.
	function webFetchJson(jsonFile, setterFunction) {
		var req = new XMLHttpRequest();
		if (fileSrc !== NgChm.MMGR.WEB_SOURCE) {
			req.open("GET", NgChm.MMGR.localRepository+"/"+NgChm.MMGR.embeddedMapName+"/"+jsonFile+".json");
		} else {
			req.open("GET", NgChm.CFG.api + "GetDescriptor?map=" + heatMapName + "&type=" + jsonFile, true);
		}
		req.onreadystatechange = function () {
			if (req.readyState == req.DONE) {
		        if (req.status != 200) {
		            console.log('Failed to get json file ' + jsonFile + ' for ' + heatMapName + ' from server: ' + req.status);
		            NgChm.UHM.mapNotFound(heatMapName);
		        } else {
		        	//Got the result - call appropriate setter.
		        	setterFunction(JSON.parse(req.response));
			    }
			}
		};
		req.send();
	}
	
	//Helper function to fetch a json file from server.  
	//Specify which file to get and what function to call when it arrives.
	function fileModeFetchVersion() {
		var req = new XMLHttpRequest();
		req.open("GET", NgChm.CM.versionCheckUrl+NgChm.CM.version , true);
		req.onreadystatechange = function () {
			if (req.readyState == req.DONE) {
		        if (req.status != 200) {
		        	//Log failure, otherwise, do nothing.
		            console.log('Failed to get software version: ' + req.status);
		        } else {
		        	var latestVersion = req.response;
		        	if ((latestVersion > NgChm.CM.version) && (typeof NgChm.galaxy === 'undefined') && (NgChm.MMGR.embeddedMapName === null) && (fileSrc == NgChm.MMGR.WEB_SOURCE)) {
		        		NgChm.UHM.viewerAppVersionExpiredNotification(NgChm.CM.version, latestVersion);   
		        	}
			    } 
			}
		};
		req.send();
	}
	
	//Helper function to fetch a json file from zip file using a zip file entry.  
	function zipFetchJson(entry, setterFunction) {
		entry.getData(new zip.TextWriter(), function(text) {
			// got the json, now call the appropriate setter
			setterFunction(JSON.parse(text));
		}, function(current, total) {
			// onprogress callback
		});
	}
	
};


//Internal object for traversing the data at a given zoom level.
NgChm.MMGR.HeatMapData = function(heatMapName, level, jsonData, datalayers, lowerLevel, getTileCacheData, getTile) {
	this.totalRows = jsonData.total_rows;
	this.totalColumns = jsonData.total_cols;
    var numTileRows = jsonData.tile_rows;
    var numTileColumns = jsonData.tile_cols;
    var rowsPerTile = jsonData.rows_per_tile;
    var colsPerTile = jsonData.cols_per_tile;
    this.rowSummaryRatio = jsonData.row_summary_ratio;
    this.colSummaryRatio = jsonData.col_summary_ratio;
	var rowToLower = (lowerLevel === null ? null : this.totalRows/lowerLevel.totalRows);
	var colToLower = (lowerLevel === null ? null : this.totalColumns/lowerLevel.totalColumns);
	
	//Get a value for a row / column.  If the tile with that value is not available, get the down sampled value from
	//the lower data level.
	this.getValue = function(row, column) {
		//Calculate which tile holds the row / column we are looking for.
		var tileRow = Math.floor((row-1)/rowsPerTile) + 1;
		var tileCol = Math.floor((column-1)/colsPerTile) + 1;
		arrayData = getTileCacheData(NgChm.SEL.currentDl+"."+level+"."+tileRow+"."+tileCol);

		//If we have the tile, use it.  Otherwise, use a lower resolution tile to provide a value.
	    if (arrayData != undefined) {
	    	//for end tiles, the # of columns can be less than the colsPerTile - figure out the correct num columns.
			var thisTileColsPerRow = tileCol == numTileColumns ? ((this.totalColumns % colsPerTile) == 0 ? colsPerTile : this.totalColumns % colsPerTile) : colsPerTile; 
			//Tile data is in one long list of numbers.  Calculate which position maps to the row/column we want.
	    	return arrayData[(row-1)%rowsPerTile * thisTileColsPerRow + (column-1)%colsPerTile];
	    } else if (lowerLevel != null) {
	    	return lowerLevel.getValue(Math.floor(row/rowToLower) + 1, Math.floor(column/colToLower) + 1);
	    } else {
	    	return 0;
	    }	
	};

	// External user of the matrix data lets us know where they plan to read.
	// Pull tiles for that area if we don't already have them.
    this.setReadWindow = function(row, column, numRows, numColumns) {
    	var startRowTile = Math.floor(row/rowsPerTile) + 1;
    	var startColTile = Math.floor(column/colsPerTile) + 1;
    	var endRowCalc = (row+(numRows-1))/rowsPerTile;
    	var endColCalc = (column+(numColumns-1))/colsPerTile;
		var endRowTile = Math.floor(endRowCalc)+(endRowCalc%1 > 0 ? 1 : 0);
		var endColTile = Math.floor(endColCalc)+(endColCalc%1 > 0 ? 1 : 0);
    	
    	for (var i = startRowTile; i <= endRowTile; i++) {
    		for (var j = startColTile; j <= endColTile; j++) {
			getTile(NgChm.SEL.currentDl, level, i, j);
    		}
    	}
    }

	// External user of the matrix data lets us know where they plan to read.
	// Pull tiles for that area if we don't already have them.
    this.loadTiles = function(datalayers, rowTiles, colTiles) {
		datalayers.forEach(dlayer => {
			for (let i = 1; i <= rowTiles; i++) {
				for (let j = 1; j <= colTiles; j++) {
					getTile(dlayer, level, i, j);
				}
			}
		});
    }

};
