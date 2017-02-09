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

//Supported map data summary levels.
NgChm.MMGR.THUMBNAIL_LEVEL = 'tn';
NgChm.MMGR.SUMMARY_LEVEL = 's';
NgChm.MMGR.RIBBON_VERT_LEVEL = 'rv';
NgChm.MMGR.RIBBON_HOR_LEVEL = 'rh';
NgChm.MMGR.DETAIL_LEVEL = 'd';

NgChm.MMGR.WEB_SOURCE = 'W';
NgChm.MMGR.FILE_SOURCE = 'F';

NgChm.MMGR.Event_INITIALIZED = 'Init';
NgChm.MMGR.Event_JSON = 'Json';
NgChm.MMGR.Event_NEWDATA = 'NewData';
NgChm.MMGR.source= null;


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


//HeatMap Object - holds heat map properties and a tile cache
//Used to get HeatMapData object.
//ToDo switch from using heat map name to blob key?
NgChm.MMGR.HeatMap = function(heatMapName, updateCallback, fileSrc, chmFile) {
	//This holds the various zoom levels of data.
	var mapConfig = null;
	var mapData = null;
	var datalevels = {};
	var tileCache = {};
	var zipFiles = {};
	var colorMapMgr;
	var initialized = 0;
	var eventListeners = [];
	var flickInitialized = false;
	var unAppliedChanges = false;
	NgChm.MMGR.source= fileSrc;
	
	this.isFileMode = function () {
		if (NgChm.MMGR.source=== "F") 
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
			return filterRowClassBarsOrder
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
			return filterColClassBarsOrder
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
	
	this.setClassificationPrefs = function(classname, type, showVal, heightVal) {
		if (type === "row") {
			mapConfig.row_configuration.classifications[classname].show = showVal ? 'Y' : 'N';
			mapConfig.row_configuration.classifications[classname].height = parseInt(heightVal);
		} else {
			mapConfig.col_configuration.classifications[classname].show = showVal ? 'Y' : 'N';
			mapConfig.col_configuration.classifications[classname].height = parseInt(heightVal);
		}
	}
	
	this.setLayerGridPrefs = function(key, showVal, gridColorVal, selectionColorVal) {
		mapConfig.data_configuration.map_information.data_layer[key].grid_show = showVal ? 'Y' : 'N';
		mapConfig.data_configuration.map_information.data_layer[key].grid_color = gridColorVal;
		mapConfig.data_configuration.map_information.data_layer[key].selection_color = selectionColorVal;
	}
	
	//Get Row Organization
	this.getRowOrganization = function() {
		return mapConfig.row_configuration.organization;
	}
	
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
		return mapData.row_data.dendrogram ? mapData.row_data.dendrogram : [];
	}
	
	this.getColDendroData = function() {
		return mapData.col_data.dendrogram ? mapData.col_data.dendrogram : [];
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
		if (fileSrc !== "F") {
			success = zipMapProperties(JSON.stringify(mapConfig)); 
			NgChm.UHM.zipSaveNotification(false);
		} else {
			zipSaveMapProperties();
			if (NgChm.staticPath !== "") {
				NgChm.UHM.zipSaveNotification(false);
			}
		}
		NgChm.heatMap.setUnAppliedChanges(false);
	}
	
	this.autoSaveHeatMap = function () {
		this.setRowClassificationOrder();
		this.setColClassificationOrder();
		var success = true;
		if (fileSrc !== "F") {
			success = webSaveMapProperties(JSON.stringify(mapConfig)); 
		} else {
			zipSaveMapProperties();
			NgChm.UHM.zipSaveNotification(true);
		}
		return success;
	}

	// Call download of NGCHM File Viewer application zip
	this.downloadFileApplication = function () { 
		if (NgChm.staticPath != "") {
			window.open(NgChm.staticPath + "ngchmApp.zip");
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
		return initialized;
	}

	//If collectionHome param exists on URL, add "back" button to screen.
	this.configureButtonBar = function(){
		var splitButton = document.getElementById("split_btn");
		if ((splitButton != null) && (fileSrc === "F")) {
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
			}
			flickInitialized = true;
			var gearBtnPanel = document.getElementById("pdf_gear");
			if (maxDisplay > 15) {
				gearBtnPanel.style.minWidth = '320px';
			} else if (maxDisplay === 0) {
				gearBtnPanel.style.minWidth = '80px';
			} else {	
				gearBtnPanel.style.minWidth = '250px'
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
	
	if (fileSrc == NgChm.MMGR.WEB_SOURCE){
		//fileSrc is web so get JSON files from server
		//Retrieve  all map configuration data.
		webFetchJson('mapConfig', addMapConfig);
		//Retrieve  all map supporting data (e.g. labels, dendros) from JSON.
		webFetchJson('mapData', addMapData);
	} else {
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
							if (keyVal.indexOf('bin') < 0) {
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
		var name = "SaveMapProperties?map=" + heatMapName;
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
		var success = "";
		var name = "ZipAppDownload"; 
		callServlet("POST", name, false);
		return true;
	}
	
	function zipMapProperties(jsonData) {
		var success = "";
		var name = "ZippedMap?map=" + heatMapName; 
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
		levels = mapConfig.data_configuration.map_information.levels;
		datalayers = mapConfig.data_configuration.map_information.data_layer
        
        //Thumb nail
		if (levels.tn !== undefined) {
			datalevels[NgChm.MMGR.THUMBNAIL_LEVEL] = new NgChm.MMGR.HeatMapData(heatMapName, 
                                                         NgChm.MMGR.THUMBNAIL_LEVEL,
                                                         levels.tn,
                                                         datalayers,
                                                         null,
                                                         tileCache,
                                                         getTile); //special callback for thumb nail.
			//Kickoff retrieve of thumb nail data tile.
			datalevels[NgChm.MMGR.THUMBNAIL_LEVEL].loadTiles(levels.tn.tile_rows, levels.tn.tile_cols);
		}
      

		//Summary
		if (levels.s !== undefined) {
			datalevels[NgChm.MMGR.SUMMARY_LEVEL] = new NgChm.MMGR.HeatMapData(heatMapName, 
                                                       NgChm.MMGR.SUMMARY_LEVEL,
                                                       levels.s,
                                                       datalayers,
                                                       datalevels[NgChm.MMGR.THUMBNAIL_LEVEL],
                                                       tileCache,
                                                       getTile);
			//Kickoff retrieve of summary data tiles.
			datalevels[NgChm.MMGR.SUMMARY_LEVEL].loadTiles(levels.s.tile_rows, levels.s.tile_cols);
		} else {			
			//If no summary level, set the summary to be the thumb nail.
			datalevels[NgChm.MMGR.SUMMARY_LEVEL] = datalevels[NgChm.MMGR.THUMBNAIL_LEVEL];
		}

		//Detail level
		if (levels.d !== undefined) {
			datalevels[NgChm.MMGR.DETAIL_LEVEL] = new NgChm.MMGR.HeatMapData(heatMapName, 
                                                    NgChm.MMGR.DETAIL_LEVEL,
                                                    levels.d,
                                                    datalayers,
                                                    datalevels[NgChm.MMGR.SUMMARY_LEVEL],
                                                    tileCache,
                                                    getTile);
		} else {
			//If no detail layer, set it to summary.
			datalevels[NgChm.MMGR.DETAIL_LEVEL] = datalevels[NgChm.MMGR.SUMMARY_LEVEL];
		}

		
				
		//Ribbon Vertical
		if (levels.rv !== undefined) {
			datalevels[NgChm.MMGR.RIBBON_VERT_LEVEL] = new NgChm.MMGR.HeatMapData(heatMapName, 
	        		                                         NgChm.MMGR.RIBBON_VERT_LEVEL,
	        		                                         levels.rv,
	                                                         datalayers,
	        		                                         datalevels[NgChm.MMGR.SUMMARY_LEVEL],
	        		                                         tileCache,
	        		                                         getTile);
		} else {
			datalevels[NgChm.MMGR.RIBBON_VERT_LEVEL] = datalevels[NgChm.MMGR.DETAIL_LEVEL];
		}
      
		//Ribbon Horizontal
		if (levels.rh !== undefined) {
			datalevels[NgChm.MMGR.RIBBON_HOR_LEVEL] = new NgChm.MMGR.HeatMapData(heatMapName, 
	        		                                         NgChm.MMGR.RIBBON_HOR_LEVEL,
	        		                                         levels.rh,
	                                                         datalayers,
	        		                                         datalevels[NgChm.MMGR.SUMMARY_LEVEL],
	        		                                         tileCache,
	        		                                         getTile);
		} else {
			datalevels[NgChm.MMGR.RIBBON_HOR_LEVEL] = datalevels[NgChm.MMGR.DETAIL_LEVEL];
		}
		
		sendCallBack(NgChm.MMGR.Event_INITIALIZED);
	}
	
	function addMapData(md) {
		mapData = md;
		sendCallBack(NgChm.MMGR.Event_JSON);
	}
	
	function addMapConfig(mc) {
		mapConfig = mc;
		addDataLayers(mc);
		NgChm.CM.CompatibilityManager(mapConfig);
		sendCallBack(NgChm.MMGR.Event_JSON);
	}
	
	//Call the users call back function to let them know the chm is initialized or updated.
	function sendCallBack(event, level) {
		
		//Initialize event
		if ((event == NgChm.MMGR.Event_INITIALIZED) || (event == NgChm.MMGR.Event_JSON) ||
			((event == NgChm.MMGR.Event_NEWDATA) && (level == NgChm.MMGR.THUMBNAIL_LEVEL))) {
			//Only send initialized status if several conditions are met: need all summary JSON and thumb nail.
			if ((mapData != null) &&
				(mapConfig != null) &&
				(Object.keys(datalevels).length > 0) &&
				(tileCache[NgChm.SEL.currentDl+"."+NgChm.MMGR.THUMBNAIL_LEVEL+".1.1"] != null)) {
				initialized = 1;
				sendAllListeners(NgChm.MMGR.Event_INITIALIZED);
			}
			//Unlikely, but possible to get init finished after all the summary tiles.  
			//As a back stop, if we already have the top left summary tile, send a data update event too.
			if (tileCache[NgChm.SEL.currentDl+"."+NgChm.MMGR.SUMMARY_LEVEL+".1.1"] != null) {
				sendAllListeners(NgChm.MMGR.Event_NEWDATA, NgChm.MMGR.SUMMARY_LEVEL);
			}
		} else	if ((event == NgChm.MMGR.Event_NEWDATA) && (initialized == 1)) {
			//Got a new tile, notify drawing code via callback.
			sendAllListeners(event, level);
		}
	}
	
	//send to all event listeners
	function sendAllListeners(event, level){
		for (var i = 0; i < eventListeners.length; i++) {
			eventListeners[i](event, level);
		}
	}
	
	//Fetch a data tile if needed.
	function getTile(layer, level, tileRow, tileColumn) {      
		var tileCacheName=layer + "." +level + "." + tileRow + "." + tileColumn;  
		if (tileCache.hasOwnProperty(tileCacheName)) {
			//Already have tile in cache - do nothing.
			return;
		}
		var tileName=level + "." + tileRow + "." + tileColumn;  

  	//ToDo: need to limit the number of tiles retrieved.
  	//ToDo: need to remove items from the cache if it is maxed out. - don't get rid of thumb nail or summary.

		if (fileSrc == NgChm.MMGR.WEB_SOURCE) {
			var name = "GetTile?map=" + heatMapName + "&datalayer=" + layer + "&level=" + level + "&tile=" + tileName;
			var req = new XMLHttpRequest();
			req.open("GET", name, true);
			req.responseType = "arraybuffer";
			req.onreadystatechange = function () {
				if (req.readyState == req.DONE) {
					if (req.status != 200) {
						console.log('Failed in call to get tile from server: ' + req.status);
					} else {
						var arrayData = new Float32Array(req.response);
						tileCache[tileCacheName] = arrayData;
						sendCallBack(NgChm.MMGR.Event_NEWDATA, level);
					}
				}
			};	
			req.send();	
		} else {
			//File fileSrc - get tile from zip
			var entry = zipFiles[heatMapName + "/" + layer + "/"+ level + "/" + tileName + '.bin'];
			entry.getData(new zip.BlobWriter(), function(blob) {
				var fr = new FileReader();
				
				fr.onload = function(e) {
			        var arrayBuffer = fr.result;
			        var far32 = new Float32Array(arrayBuffer);
			        tileCache[tileCacheName] = far32;
					sendCallBack(NgChm.MMGR.Event_NEWDATA, level);
			     }
			    	  
			     fr.readAsArrayBuffer(blob);		
			}, function(current, total) {
				// onprogress callback
			});		
		}
	};
	
	//Helper function to fetch a json file from server.  
	//Specify which file to get and what funciton to call when it arrives.
	function webFetchJson(jsonFile, setterFunction) {
		var req = new XMLHttpRequest();
		req.open("GET", "GetDescriptor?map=" + heatMapName + "&type=" + jsonFile, true);
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
NgChm.MMGR.HeatMapData = function(heatMapName, level, jsonData, datalayers, lowerLevel, tileCache, getTile) {
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
		arrayData = tileCache[NgChm.SEL.currentDl+"."+level+"."+tileRow+"."+tileCol];   

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

	// External user of the matix data lets us know where they plan to read.
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
    			if (tileCache[NgChm.SEL.currentDl+"."+level+"."+i+"."+j] === undefined)  
    				getTile(NgChm.SEL.currentDl, level, i, j);    
    		}
    	}
    }

	// External user of the matix data lets us know where they plan to read.
	// Pull tiles for that area if we don't already have them.
    this.loadTiles = function(rowTiles, colTiles) {
    	for (var key in datalayers){
        	var layer = key;
        	for (var i = 1; i <= rowTiles; i++) {
        		for (var j = 1; j <= colTiles; j++) {
        			if (tileCache[key+"."+level+"."+i+"."+j] === undefined)  
        				getTile(key, level, i, j);    
        		}
        	}
    	}
    }

};