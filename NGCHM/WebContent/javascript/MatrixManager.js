(function() {
    'use strict';
    NgChm.markFile();

// MatrixManager is responsible for retrieving clustered heat maps.  Currently the
// system supports only a single HeatMap at a time.  Create it by calling 
// MMGR.createHeatMap and retrieve it at a later time by calling MMGR.getHeatMap.
//
// HeatMaps provide a vast number of methods for accessing map configuration,
// covariate data, and other data.
//
// HeatMaps optionally contain data for multiple layers at a variety of summarization
// levels.  Clients can access HeatMap data via one or more AccessWindows. An
// AccessWindow describes the data layer, level, and rows and columns that the
// client wants access to.  AccessWindows are the basis for managing asynchronous
// data retrieval and caching.  See the class AccessWindow below for an in depth
// description of the system's data caching architecture.
//

    // Define Namespace for NgChm MatrixManager
    const MMGR = NgChm.importNS('NgChm.MMGR');


    const UTIL = NgChm.importNS('NgChm.UTIL');
    const FLICK = NgChm.importNS('NgChm.FLICK');
    const MAPREP = NgChm.importNS('NgChm.MAPREP');
    const CFG = NgChm.importNS('NgChm.CFG');

    const CMM = NgChm.importNS('NgChm.CMM');
    const UHM = NgChm.importNS('NgChm.UHM');
    const COMPAT = NgChm.importNS('NgChm.CM');

//For web-based NGCHMs, we will create a Worker process to overlap I/O and computation.
MMGR.webLoader = null;

MMGR.WEB_SOURCE = 'W';
MMGR.LOCAL_SOURCE = 'L';
MMGR.FILE_SOURCE = 'F';

MMGR.Event_INITIALIZED = 'Init';
MMGR.Event_JSON = 'Json';
MMGR.Event_NEWDATA = 'NewData';
MMGR.embeddedMapName= null;
MMGR.localRepository= '/NGCHM';

    function callServlet (verb, url, data) {
	const form = document.createElement("form");
	form.action = url;
	form.method = verb;
	if (data) {
	    const input = document.createElement("textarea");
	    input.name = "configData";
	    input.id = "configData";
	    input.value = data;
	    form.appendChild(input);
	}
	form.style.display = 'none';
	document.body.appendChild(form);
	form.submit();
    }


    // Handle replies from tileio worker.
    function connectWebLoader (heatMap, addMapConfig, addMapData) {
	const debug = false;
	const jsonSetterFunctions = { mapConfig: addMapConfig, mapData: addMapData };
	MMGR.webLoader.setMessageHandler (function(e) {
	    if (debug) console.log({ m: 'Received message from webLoader', e });
	    if (e.data.op === 'tileLoaded') {
		const tiledata = new Float32Array(e.data.buffer);
		heatMap.tileRequestComplete (e.data.job.tileCacheName, tiledata);
	    } else if (e.data.op === 'tileLoadFailed') {
		heatMap.tileRequestComplete (e.data.job.tileCacheName, null);
	    } else if (e.data.op === 'jsonLoaded') {
		if (!jsonSetterFunctions.hasOwnProperty(e.data.name)) {
		    console.log({ m: 'connectWebLoader: unknown JSON request', e });
		    return;
		}
		jsonSetterFunctions[e.data.name] (heatMap, e.data.json);
	    } else if (e.data.op === 'jsonLoadFailed') {
		console.error(`Failed to get JSON file ${e.data.name} for ${heatMap.mapName} from server`);
		UHM.mapNotFound(heatMap.mapName);
	    } else {
		console.log({ m: 'connectWebLoader: unknown op', e });
	    }
	});
    }

    MMGR.isRow = isRow;
    function isRow (axis) {
	return axis && axis.toLowerCase() === 'row';
    }

    ///////////////////////////////////////////////////////////////////////////
    //
    // BEGIN class TileWindow.
    //
    // TileWindows are the middle level of the system's data management
    // hierarchy.  See the class AccessWindow below for an in depth description
    // of the system's data caching architecture.
    //
    // Briefly, one or more AccessWindows can contain a hard reference to a
    // TileWindow, which will contain hard references to any tile data in
    // the system for the tiles concerned.  These hard references are the
    // primary tile data caching mechanism.
    //
    // A HeatMap also contains weak references to all of its TileWindows.  These
    // weak references are used to find an existing TileWindow, if any, that meets
    // the needs of a new AccessWindow.  It is also used to detect when unused
    // TileWindows are garbage collected by the system.
    //
    class TileWindow {

	constructor (heatMap, tileSpec) {
	    const { layer, level, startRowTile, endRowTile, startColTile, endColTile } = tileSpec;
	    const heatMapLevel = heatMap.datalevels[level];
	    if (startRowTile < 1 || endRowTile > heatMapLevel.numTileRows ||
	        startColTile < 1 || endColTile > heatMapLevel.numTileColumns ||
		endRowTile < startRowTile || endColTile < startColTile) {
		console.error ('Constructing TileWindow with out-of-range tiles', tileSpec, heatMapLevel);
	    }
	    this.heatMap = heatMap;
	    this.layer = layer;
	    this.level = level;
	    this.startRowTile = startRowTile;
	    this.endRowTile = endRowTile;
	    this.startColTile = startColTile;
	    this.endColTile = endColTile;
	    this.numColumnTiles = endColTile - startColTile + 1;
	    this.totalTiles = (endRowTile - startRowTile + 1) * this.numColumnTiles;
	    this.tiles = new Array({ length: this.totalTiles });

	    // Get hard references to tile data if it's already in the TileCache.
	    // Set _allTilesAvailable to false if any tile's data is not available.
	    this._allTilesAvailable = true;
	    let idx = 0;
	    for (let row = this.startRowTile; row <= this.endRowTile; row++) {
		for (let col = this.startColTile; col <= this.endColTile; col++) {
		    const tileCacheName = this.layer + "." + this.level + "." + row + "." + col;
		    this.tiles[idx] = this.heatMap.tileCache.getTileCacheData(tileCacheName);
		    if (!this.tiles[idx]) {
			this._allTilesAvailable = false;
		    }
		    idx++;
		}
	    }
	    this.tileStatusValid = true;
	}

	myKey () {
	    return [ this.layer, this.level, this.startRowTile, this.endRowTile, this.startColTile, this.endColTile, ] .join('.');
	}

	isTileInWindow (tile) {
	    return (tile.layer === this.layer && tile.level === this.level &&
		    tile.row >= this.startRowTile && tile.row <= this.endRowTile &&
		    tile.col >= this.startColTile && tile.col <= this.endColTile);
	}

	checkTile (tile) {
	    if (!tile.hasOwnProperty('data')) {
		console.error ('NEWDATA message has no data field', tile);
	    }
	    // Determines if a tile update applies to one of the tiles in this
	    // TileWindow.  If so, it invalidates the status of _allTilesAvailable.
	    if (this.isTileInWindow (tile)) {
		const idx = (tile.row - this.startRowTile) * this.numColumnTiles + tile.col - this.startColTile;
		if (idx >= this.totalTiles) console.error ('Tile idx out of range', { idx, tile, tileWindow: this });
		this.tiles[idx] = tile.data;
		this.tileStatusValid = false;
	    }
	}

	getTileData (tileRow, tileCol) {
	    if (tileRow >= this.startRowTile && tileRow <= this.endRowTile &&
	        tileCol >= this.startColTile && tileCol <= this.endColTile) {
		const idx = (tileRow - this.startRowTile) * this.numColumnTiles + tileCol - this.startColTile;
		return this.tiles[idx];
	    }
	    console.error ('getTileData out of limits', { tileRow, tileCol, tileWindow: this });
	    return null;
	}

	fetchTiles () {
	    // Initiates fetches for any tiles without data in the TileWindow.
	    let idx = 0;
	    for (let row = this.startRowTile; row <= this.endRowTile; row++) {
		for (let col = this.startColTile; col <= this.endColTile; col++) {
		    if (!this.tiles[idx]) {
			const tileCacheName = this.layer + "." + this.level + "." + row + "." + col;
			this.tiles[idx] = this.heatMap.tileCache.getTileCacheData(tileCacheName);
			if (!this.tiles[idx]) {
			    this.tiles[idx] = this.heatMap.tileCache.getTile(this.layer, this.level, row, col);
			}
		    }
		    idx++;
		}
	    }
	}

	allTilesAvailable () {
	    // Returns true iff all tiles in this TileWindow are in the heatMap's
	    // tileCache.  Memoizes the result until invalidated by a tile
	    // within the window becoming available.  Particularly helpful once
	    // _allTilesAvailable becomes true.
	    if (this.tileStatusValid) {
		return this._allTilesAvailable;
	    }
	    for (let idx = 0; idx < this.totalTiles; idx++) {
		if (!this.tiles[idx]) {
		    this._allTilesAvailable = false;
		    this.tileStatusValid = true;
		    return false;
		}
	    }
	    this._allTilesAvailable = true;
	    this.tileStatusValid = true;
	    return true;
	}

	// This method waits until all tiles in the tilewindow are available.
	//
	// If callback is undefined, onready returns a promise that
	// resolves when all tiles in the TileWindow are available.
	//
	// If callback is defined, onready returns undefined and calls callback
	// when all tiles in the TileWindow are available.
	//
	// The TileWindow is passed to callback or is the result of the Promise.
	//
	// NB: Currently, tiles are never expunged from the cache.
	// If they ever can be, there will need to be a way to prevent
	// tiles from being expunged while a TileWindow is interested in them.
	// Perhaps something as simple as preventing expunging while
	// the tileWindowListeners array is non-empty.
	onready (callback) {
	    const tileWindow = this;
	    const p = new Promise((resolve, reject) => {
		if (tileWindow.allTilesAvailable()) {
		    resolve(tileWindow);
		} else {
		    tileWindow.heatMap.tileWindowListeners.push ({ tileWindow: tileWindow, checkReady: checkReady, });
		}

		function checkReady (tileWindow, tile) {
		    // First two conditions below are optimizations: only tiles for tileWindow's layer & level can
		    // affect its allTilesAvailable.  Saves a potentially large nested loop.
		    if (tile.layer == tileWindow.layer && tile.level == tileWindow.level && tileWindow.allTilesAvailable()) {
			// Resolve promise and remove entry from
			// tileWindowListeners.
			resolve(tileWindow);
			return true;
		    }
		    // Keep listening.
		    return false;
		}
	    });
	    if (callback) {
		// Callback provided: call it when the Promise resolves.
		p.then(callback);
	    } else {
		// No callback: return Promise.
		return p;
	    }
	}
    }
    // END of the TileWindow class.

    ///////////////////////////////////////////////////////////////////////////
    //
    // BEGIN class TileCache.
    //
    // The TileCache is the lowest level of the system's data management
    // hierarchy.  See the class AccessWindow below for an in depth description
    // of the system's data caching architecture.
    //
    // Briefly, the TileCache contains an entry for every tile accessed by the
    // system.  TileCache entries may also contain a weak reference to the
    // tile's data.  These weak references are used to quickly determine if
    // the system has a copy of the tile's data.  The primary mechanism for
    // maintaining the tile's data in the system is the hard links to the tile
    // data in the TileWindows (which are referenced by the AccessWindows).
    //
    class TileCache {

	// Construct a TileCache for the specified heatMap.
	constructor (heatMap) {
	    this.heatMap = heatMap;
	    this.cacheEntries = {};
	    this.longestLoadTime = 0.0;
	}

	// Create the specified cache entry.
	//
	// These entries are permanent, but the WeakRef to data is not.
	//
	createTileCacheEntry (tileCacheName) {
	    const [ layer, level, row, col ] = tileCacheName.split('.');
	    return this.cacheEntries[tileCacheName] = {
		    props: { layer, level, row: row|0, col: col|0 },
		    data: null,		// WeakRef to this tile's data.
		    fetchTime: 0.0,	// Placeholder : start time of last fetch
		    loadTime: 0.0,	// Placeholder : end time of last fetch
		    fetches: 0,		// Number of times we've fetched the tile.
		    failedFetches: 0,	// Number of times we've failed to fetch the tile.
		    dataSize: 0,	// Placeholder : size of data in last fetch
	    };
	}

	// Return true iff the specified tile has completed loading into the tile cache.
	haveTileData (tileCacheName) {
	    return this.getTileCacheData (tileCacheName) != null;
	}

	// Fetch the data tile specified by layer, level, tileRow, and tileColumn, if needed.
	//
	// Returns the tile's data if it's already in the TileCache, otherwise null.
	//
	// In the latter case, the specified data tile may appear in the tile cache
	// at some later time (depending on whether there's still a TileWindow that
	// wants it).
	//
	// When it does so, an Event_NEWDATA will be posted to heatmap listeners.
	// No event will be posted if the data is already in the cache.
	//
	getTile (layer, level, tileRow, tileColumn) {
	    const debug = false;
	    const tileCacheName = layer + "." +level + "." + tileRow + "." + tileColumn;
	    let setFetchTime = true;
	    let entry = this.cacheEntries[tileCacheName];
	    if (entry) {
		const data = this.getEntryData(tileCacheName, entry);
		if (data) {
		    // Already have tile data in cache - do nothing.
		    return data;
		}
		if (entry.fetchTime > 0.0) {
		    // Outstanding request for tile.
		    if (performance.now() - entry.fetchTime < Math.max(3000, 1.25 * this.longestLoadTime)) {
			// Hasn't been too long.
			// Just need to ensure fetcher still has an outstanding request.
			setFetchTime = false;
		    }
		    else {
			// The previous fetch has been outstanding for at least three
			// seconds and at least 25% longer than the slowest successfull
			// send up until now.  Consider the previous fetch to have failed.
			entry.failedFetches++;
		    }
		}
	    } else {
		// No cache entry present. Create cache entry.
		if (debug) console.log('Creating tileCacheEntry for ' + tileCacheName);
		entry = this.createTileCacheEntry(tileCacheName);
	    }

	    // Request tile from source.
	    if (setFetchTime) {
		entry.fetches++;
		entry.fetchTime = performance.now();
	    }
	    const tileName = level + "." + tileRow + "." + tileColumn;
	    this.heatMap.loadHeatMapTile ({ tileCacheName, layer, level, tileName });

	    return null;
	}

	// Display statistics about each loaded tile cache entry.
	showTileCacheStats () {
	    for (let tileCacheName in this.cacheEntries) {
		const e = this.cacheEntries[tileCacheName];
		if (e.data) {
		    const loadTime = e.loadTime - e.fetchTime;
		    const loadTimePerKByte = loadTime / e.dataSize * 1024;
		    console.log ({ tileCacheName, fetches: e.fetches, KBytes: e.dataSize / 1024, loadTime, loadTimePerKByte });
		}
	    }
	    console.log ('Longest load time: ' + this.longestLoadTime);
	}

	// Reset a tile cache entry.
	resetTileCacheEntry (tileCacheName) {
	    const entry = this.cacheEntries[tileCacheName];
	    if (entry) {
		const data = this.getEntryData (tileCacheName, entry);  // For clearing garbage collected data.
		entry.fetchTime = 0.0;
		if (!data) {
		    entry.failedFetches++;
		}
	    }
	}

	// Get the data for a tile, if it's loaded.
	getTileCacheData (tileCacheName) {
	    const entry = this.cacheEntries[tileCacheName];
	    return entry ? this.getEntryData (tileCacheName, entry) : null;
	}

	// Returns the data for the cache entry, if it is loaded
	// and has not been garbage collected.
	getEntryData (tileCacheName, entry) {
	    if (entry.data === null) {
		// Data has never been received or we've previously determined
		// that it's been garbage collected.
		return null;
	    }
	    // Determine if we still have access to the data.
	    const data = entry.data.deref();
	    if (data == null) {
		// We had the data, but it's been garbage collected.
		entry.data = null;
	    }
	    // We still have the data.  Return a hard reference to it.
	    return data;
	}

	// Called when the data for the specified tile has arrived.
	// Saves a WeakRef to the data in the tile's cache entry.
	// Maintains various statistics about this request.
	//
	// Finally, it broadcasts a message to all of the HeatMap's
	// event listeners that the tile's data has been received.
	// The message includes a hard link to the data to ensure
	// it's not garbage collected before all listeners have
	// been informed of its arrival.
	//
	setTileCacheEntry (tileCacheName, arrayData) {
	    const entry = this.cacheEntries[tileCacheName];
	    entry.loadTime = performance.now();
	    const loadTime = entry.loadTime - entry.fetchTime;
	    if (loadTime > this.longestLoadTime) {
		this.longestLoadTime = loadTime;
	    }
	    entry.data = new WeakRef(arrayData);
	    entry.dataSize = arrayData.length;

	    this.heatMap.updateTileWindows (Object.assign ({}, entry.props, { data: arrayData }));
	}

    }
    // END class TileCache.

    ///////////////////////////////////////////////////////////////////////////
    //
    // BEGIN class AccessWindow
    //
    // AccessWindows are the highest level of the system's three-tiered data
    // management hierarchy: AccessWindows, TileWindows, and the TileCache.
    //
    // All client access to HeatMap data goes through an AccessWindow.  The
    // AccessWindow specifies what region of a HeatMap the client wants to
    // access, including its data layer, level, and rows and columns.
    //
    // When an AccessWindow is created, it automatically initiates requests
    // for any unavailable data tiles needed by the AccessWindow.  But it does
    // not wait for them by default.  Clients can use the onready method to
    // wait for all outstanding tiles to be loaded.
    //
    // AccessWindows are relatively light-weight objects that can be created
    // and discarded easily.  But they ultimately determine what data tiles
    // are cached by the system.
    //
    // When an AccessWindow is created, it obtains a hard reference to either
    // an existing or a new TileWindow that contains exactly those tiles needed
    // by the AccessWindow.  Multiple AccessWindows can reference the same
    // TileWindow.  For example, many AccessWindows for default size detail
    // views (42x42) can all reference the same TileWindow for a large
    // 1000x1000 data tile.
    //
    // The TileWindows contain hard references to any data the system has for
    // the tiles in the TileWindow.  When all AccessWindows that reference
    // a TileWindow have been garbage collected, the TileWindow can also be
    // garbage collected.  When all TileWindows that reference a specific
    // data tile have been garbage collected, that tile's data can also be
    // garbage collected.
    //
    // Experiments with Chrome indicate that it is relatively aggressive with
    // garbage collecting unreferenced Objects, as expected.  To prevent
    // tile data from being garbage collected too early, the system holds on to
    // AccessWindows that reference the needed data.  For instance, the
    // flick system keeps AccessWindows for the entirety of the summary levels
    // for the (up to) two layers in the flick control.  And DetailWindows
    // keep the AccessWindow last used to draw the detail view.  This
    // prevents the detail tiles beneath the current view from being garbage
    // collected.
    //
    // The HeatMap also maintains WeakReferences to all of the TileWindows
    // and the TileCache maintains WeakReferences to the tile data.  These
    // are used for quickly obtaining a reference to objects strongly held
    // by other objects (AccessWindows and TileWindows, respectively) without
    // having to maintain and search through complex systems for keeping
    // track of these objects.  Occasionally, we may also reacquire a hard
    // reference to a previously no-longer-referenced object, but this is
    // of marginal utility.
    //
    class AccessWindow {
	constructor (heatMap, win) {
	    this.heatMap = heatMap;
	    this.win = { layer: win.layer, level: win.level, firstRow: win.firstRow|0, firstCol: win.firstCol|0, numRows: win.numRows|0, numCols: win.numCols|0 };
	    this.tileWindow = heatMap.getTileWindow (this.win);
	    this.tileWindow.fetchTiles();
	    this.datalevel = heatMap.datalevels[this.win.level];
	}

	// Return the value of a data element within the AccessWindow.
	// row and column are specified in HeatMap coordinates but must be
	// within the range of the rows and columns specified when the
	// AccessWindow was created.
	getValue (row, column) {
	    return this.datalevel.getLayerValue (this.win.layer, this.tileWindow, row|0, column|0);
	}

	// Return an iterator for the numCols values starting from firstCol
	// on row row.  Firstcol and row are in HeatMap coordinates.
	// row and firstCol through firstCol+numCols-1 must be within the
	// AccessWindow.
	//
	// If firstCol is omitted, it defaults to the first column in the AccessWindow.
	// If numCols is omitted, it defaults to the number of columns until the end of the AccessWindow.
	// Thus getRowValues (row) returns an iterator for all columns within the AccessWindow.
	//
	// The value of each iteration is an object { i, col, value } where i is a zero-based index,
	// col is the value's column (i.e. i + firstCol), and value is the datavalue at (row, col).
	//
	// Example use: for (let { i, col, value } of accessWindow.getRowValues (row)) { ... }
	//
	getRowValues (row, firstCol, numCols) {
	    if (!firstCol) firstCol = this.win.firstCol;
	    if (!numCols) numCols = this.win.firstCol + this.win.numCols - firstCol;
	    return this.datalevel.getRowValues (this.tileWindow, row, firstCol, numCols);
	}

	allTilesAvailable () {
	    return this.tileWindow.allTilesAvailable();
	}

	onready (callback) {
	    const p = this.tileWindow.onready();
	    if (callback) {
		p.then(() => callback (this));
	    } else {
		return p.then(() => this);
	    }
	}

	isTileInWindow (tile) {
	    return this.tileWindow.isTileInWindow (tile);
	}
    }
    // END class AccessWindow

    ///////////////////////////////////////////////////////////////////////////
    //
    // BEGIN class HeatMap
    //
    // Class HeatMap is currently implemented using the prototype mechanism.
    //
    //
    {

	// Functions for getting and setting the data layer of this heat map
	// currently being displayed.
	// Set in the application by the user when, for exanple, flick views are toggled.
	HeatMap.prototype.setCurrentDL = function (dl) {
	    // Set the current data layer to dl.
	    // If the current data layer changes, the colors used for
	    // highlighting labels etc. will be automatically
	    // updated.  The colors of heat map views etc. will
	    // not be updated here.
	    if (this._currentDl != dl) {
		this._currentDl = dl;
		this.setSelectionColors();
	    }
	};

	HeatMap.prototype.getCurrentDL = function (dl) {
	    return this._currentDl;
	};

	/********************************************************************************************
	 * FUNCTION:  getCurrentColorMap - Get the color map for the heat map's current data layer.
	 ********************************************************************************************/
	HeatMap.prototype.getCurrentColorMap = function () {
	    return this.getColorMapManager().getColorMap("data", this.getCurrentDL());
	};

	/*********************************************************************************************
	 * FUNCTION:  setSelectionColors - Set the colors for selected labels based on the
	 * current layer's color scheme.
	 *********************************************************************************************/
	HeatMap.prototype.setSelectionColors = function () {
	    const colorMap = this.getColorMapManager().getColorMap("data",this._currentDl);
	    const dataLayer = this.getDataLayers()[this._currentDl];
	    const selColor = CMM.hexToRgba(dataLayer.selection_color);
	    const textColor = colorMap.isColorDark(selColor) ? "#000000" : "#FFFFFF";
	    const root = document.documentElement;
	    root.style.setProperty('--in-selection-color', textColor);
	    root.style.setProperty('--in-selection-background-color', dataLayer.selection_color);
	};

	HeatMap.prototype.getMapConfig = function() {
	    return this.mapConfig;
	};

	HeatMap.prototype.isMapLoaded = function () {
		return this.mapConfig !== null;
	};

	HeatMap.prototype.isFileMode = function () {
	    return this.source() === MMGR.FILE_SOURCE;
	};

	HeatMap.prototype.isReadOnly = function(){
		return this.mapConfig.data_configuration.map_information.read_only === 'Y';
	};

	HeatMap.prototype.getAxisConfig = function(axis) {
		return isRow (axis) ? this.getRowConfig() : this.getColConfig();
	};

	HeatMap.prototype.getRowConfig = function() {
		return this.mapConfig.row_configuration;
	}

	HeatMap.prototype.getColConfig = function() {
		return this.mapConfig.col_configuration;
	}

	HeatMap.prototype.getAxisCovariateConfig = function (axis) {
		return this.getAxisConfig(axis).classifications;
	}

	HeatMap.prototype.getAxisCovariateOrder = function (axis) {
		return isRow(axis) ? this.getRowClassificationOrder() : this.getColClassificationOrder();
	};

	HeatMap.prototype.getRowClassificationConfig = function() {
		return this.mapConfig.row_configuration.classifications;
	}
	
	HeatMap.prototype.getRowClassificationConfigOrder = function() {
		return this.mapConfig.row_configuration.classifications_order;
	}
	
	HeatMap.prototype.getColClassificationConfig = function() {
		return this.mapConfig.col_configuration.classifications;
	}
	
	HeatMap.prototype.getColClassificationConfigOrder = function() {
		return this.mapConfig.col_configuration.classifications_order;
	}
	
	// Return an array of the display types of all covariate bars on an axis.
	// Hidden bars have a height of zero.  The order of entries is fixed but not
	// specified.
	HeatMap.prototype.getCovariateBarTypes = function (axis) {
		return Object.entries(this.getAxisCovariateConfig(axis))
		.map(([key,config]) => config.show === 'Y' ? (config.bar_type) : 0)
	}

	// Return an array of the display parameters of all visible covariate bars on an axis.
	// Hidden bars have no parameters.  The order of entries is fixed but not
	// specified.
	HeatMap.prototype.getCovariateBarParams = function (axis) {
	    return Object.entries(this.getAxisCovariateConfig(axis))
	    .map(([key,config]) => config.show === 'Y' ? barParams(config) : {})
	};

	function barParams (config) {
	    if (config.bar_type == 'color_plot') {
		return { color_map: config.color_map };
	    } else {
		return { bg_color: config.bg_color, fg_color: config.fg_color, low_bound: config.low_bound, high_bound: config.high_bound };
	    }
	}

	HeatMap.prototype.getRowClassificationOrder = function(showOnly) {
		var rowClassBarsOrder = this.mapConfig.row_configuration.classifications_order;
		// If configuration not found, create order from classifications config
		if (typeof rowClassBarsOrder === 'undefined') {
			rowClassBarsOrder = [];
			for (key in this.mapConfig.row_configuration.classifications) {
				rowClassBarsOrder.push(key);
			}
		}
		// Filter order for ONLY shown bars (if requested)
		if (typeof showOnly === 'undefined') {
			return rowClassBarsOrder;
		} else {
			const filterRowClassBarsOrder = [];
			for (var i = 0; i < rowClassBarsOrder.length; i++) {
				var newKey = rowClassBarsOrder[i];
				var currConfig = this.mapConfig.row_configuration.classifications[newKey];
				if (currConfig.show == "Y") {
					filterRowClassBarsOrder.push(newKey);
				}
			}
			return filterRowClassBarsOrder;
		}
	}
	
	HeatMap.prototype.setRowClassificationOrder = function() {
		if (this.mapConfig !== null) {this.mapConfig.row_configuration.classifications_order = this.getRowClassificationOrder();}
	}
	
	HeatMap.prototype.getColClassificationOrder = function(showOnly){
		var colClassBarsOrder = this.mapConfig.col_configuration.classifications_order;
		// If configuration not found, create order from classifications config
		if (typeof colClassBarsOrder === 'undefined') {
			colClassBarsOrder = [];
			for (key in this.mapConfig.col_configuration.classifications) {
				colClassBarsOrder.push(key);
			}
		}
		// Filter order for ONLY shown bars (if requested)
		if (typeof showOnly === 'undefined') {
			return colClassBarsOrder;
		} else {
			const filterColClassBarsOrder = [];
			for (var i = 0; i < colClassBarsOrder.length; i++) {
				var newKey = colClassBarsOrder[i];
				var currConfig = this.mapConfig.col_configuration.classifications[newKey];
				if (currConfig.show == "Y") {
					filterColClassBarsOrder.push(newKey);
				}
			}
			return filterColClassBarsOrder;
		}
	}

	const transparent = { 'r': 0, 'g': 0, 'b': 0, 'a': 0 };
	const white = CMM.hexToRgba("#FFFFFF");
	class VisibleCovariateBar {

	    constructor (key, idx, details, scale) {
		Object.assign (this, details, { idx, label: key, height: (details.height * scale) | 0 });
	    }

	    // Return an array of colors to use when creating scatter or bar plots.
	    // The order of the colors matches the matrix values produced by SUM.buildScatterBarPlotMatrix.
	    // Specifically:
	    // [0] Background color
	    // [1] Foreground color
	    // [2] Cuts color
	    getScatterBarPlotColors () {
		const fgColor = CMM.hexToRgba (this.fg_color);
		const bgColor = this.subBgColor === "#FFFFFF" ? transparent : CMM.hexToRgba(this.bg_color);
		return [ bgColor, fgColor, white ];
	    }
	}

	/* Returns an array of the visible covariates on the specified axis of the heat map.
	 * The height of each covariable is scaled by scale.
	 *
	 * The returned array has two additional methods:
	 * - totalHeight, which returns the total height of all bars in the array
	 * - containsLegend, which returns true iff there's a bar with a bar/scatter plot legend.
	 */
	HeatMap.prototype.getScaledVisibleCovariates = function (axis, scale) {
	    const axisConfig = isRow (axis) ? this.mapConfig.row_configuration : this.mapConfig.col_configuration;
	    const order = axisConfig.hasOwnProperty('classifications_order') ? axisConfig.classifications_order : Object.keys(axisConfig.classifications);
	    const bars = order.map ((key, idx) => new VisibleCovariateBar (key, idx, axisConfig.classifications[key], scale)).filter (bar => bar.show === 'Y');
	    Object.defineProperty (bars, 'totalHeight', {
	        value: totalHeight,
		enumerable: false
	    });
	    Object.defineProperty (bars, 'containsLegend', {
	        value: containsLegend,
		enumerable: false
	    });
	    return bars;

	    function totalHeight () {
		return this.map (bar => bar.height).reduce((t,h) => t+h, 0);
	    }

	    function containsLegend () {
		return this.filter (bar => bar.bar_type !== 'color_plot').length > 0;
	    }
	};
	
	/* Returns true iff there are hidden covariates on the specified axis of the heat map.
	 */
	HeatMap.prototype.hasHiddenCovariates = function (axis) {
	    const axisConfig = isRow (axis) ? this.mapConfig.row_configuration : this.mapConfig.col_configuration;
	    const order = axisConfig.hasOwnProperty('classifications_order') ? axisConfig.classifications_order : Object.keys(axisConfig.classifications);
	    return order.map (key => axisConfig.classifications[key].show).filter (show => show !== 'Y').length > 0;
	};

	HeatMap.prototype.setColClassificationOrder = function() {
		if (this.mapConfig !== null) {this.mapConfig.col_configuration.classifications_order = this.getColClassificationOrder();}
	}

	HeatMap.prototype.getMapInformation = function() {
		return this.mapConfig.data_configuration.map_information;
	}
	
	HeatMap.prototype.getDataLayers = function() {
		return this.mapConfig.data_configuration.map_information.data_layer;
	}

	HeatMap.prototype.getCurrentDataLayer = function() {
		return this.getDataLayers()[this.getCurrentDL()];
	};

	HeatMap.prototype.getDividerPref = function() {
		return this.mapConfig.data_configuration.map_information.summary_width;
	}

	HeatMap.prototype.setDividerPref = function(sumSize) {
		var sumPercent = 50;
		if (sumSize === undefined) {
			var container = document.getElementById('ngChmContainer');
			var summary = document.getElementById('summary_chm');
			sumPercent = Math.ceil(100*summary.clientWidth / container.clientWidth);
		} else {
			sumPercent = sumSize;
		}
		this.mapConfig.data_configuration.map_information.summary_width = sumPercent;
		this.mapConfig.data_configuration.map_information.detail_width = 100 - sumPercent;
	}
	
	HeatMap.prototype.setClassificationPrefs = function(classname, axis, showVal, heightVal) {
		if (isRow (axis)) {
			this.mapConfig.row_configuration.classifications[classname].show = showVal ? 'Y' : 'N';
			this.mapConfig.row_configuration.classifications[classname].height = parseInt(heightVal);
		} else {
			this.mapConfig.col_configuration.classifications[classname].show = showVal ? 'Y' : 'N';
			this.mapConfig.col_configuration.classifications[classname].height = parseInt(heightVal);
		}
	}

	HeatMap.prototype.setClassBarScatterPrefs = function(classname, axis, barType, lowBound, highBound, fgColorVal, bgColorVal) {
		if (isRow (axis)) {
			this.mapConfig.row_configuration.classifications[classname].bar_type = barType;
			if (typeof lowBound !== 'undefined') {
				this.mapConfig.row_configuration.classifications[classname].low_bound = lowBound;
				this.mapConfig.row_configuration.classifications[classname].high_bound = highBound;
				this.mapConfig.row_configuration.classifications[classname].fg_color = fgColorVal;
				this.mapConfig.row_configuration.classifications[classname].bg_color = bgColorVal;
			}
		} else {
			this.mapConfig.col_configuration.classifications[classname].bar_type = barType;
			if (typeof lowBound !== 'undefined') {
				this.mapConfig.col_configuration.classifications[classname].low_bound = lowBound;
				this.mapConfig.col_configuration.classifications[classname].high_bound = highBound;
				this.mapConfig.col_configuration.classifications[classname].fg_color = fgColorVal;
				this.mapConfig.col_configuration.classifications[classname].bg_color = bgColorVal;
			}
		}
	}

	HeatMap.prototype.setLayerGridPrefs = function(key, showVal, gridColorVal, selectionColorVal, gapColorVal) {
		this.mapConfig.data_configuration.map_information.data_layer[key].grid_show = showVal ? 'Y' : 'N';
		this.mapConfig.data_configuration.map_information.data_layer[key].grid_color = gridColorVal;
		this.mapConfig.data_configuration.map_information.data_layer[key].cuts_color = gapColorVal;
		this.mapConfig.data_configuration.map_information.data_layer[key].selection_color = selectionColorVal;
		if (key == this.getCurrentDL()) {
		    this.setSelectionColors ();
		}
	}
	
	//Get Row Organization
	HeatMap.prototype.getRowOrganization = function() {
		return this.mapConfig.row_configuration.organization;
	}
	
	//Get Column Organization
	HeatMap.prototype.getColOrganization = function() {
		return this.mapConfig.col_configuration.organization;
	}

	//Get map information config data
	HeatMap.prototype.getMapInformation = function() {
		return this.mapConfig.data_configuration.map_information;
	}

	// Get panel configuration from mapConfig.json
	HeatMap.prototype.getPanelConfiguration = function() {
		return this.mapConfig.panel_configuration;
	}

	HeatMap.prototype.getRowDendroConfig = function() {
		return this.mapConfig.row_configuration.dendrogram;
	}
	
	HeatMap.prototype.getColDendroConfig = function() {
		return this.mapConfig.col_configuration.dendrogram;
	}
	
	HeatMap.prototype.setRowDendrogramShow = function(value) {
		this.mapConfig.row_configuration.dendrogram.show = value;
	}
	
	HeatMap.prototype.setColDendrogramShow = function(value) {
		this.mapConfig.col_configuration.dendrogram.show = value;
	}
	
	HeatMap.prototype.setRowDendrogramHeight = function(value) {
		this.mapConfig.row_configuration.dendrogram.height = value;
	}
	
	HeatMap.prototype.setColDendrogramHeight = function(value) {
		this.mapConfig.col_configuration.dendrogram.col_dendro_height = value;
	}
	
	HeatMap.prototype.showRowDendrogram = function(layer) {
		var showDendro = true;
		var showVal = this.mapConfig.row_configuration.dendrogram.show;
		if ((showVal === 'NONE') || (showVal === 'NA')) {
			showDendro = false;
		}
		if ((layer === 'DETAIL') && (showVal === 'SUMMARY')) {
			showDendro = false;
		}
		return showDendro;
	}

	HeatMap.prototype.showColDendrogram = function(layer) {
		var showDendro = true;
		var showVal = this.mapConfig.col_configuration.dendrogram.show;
		if ((showVal === 'NONE') || (showVal === 'NA')) {
			showDendro = false;
		}
		if ((layer === 'DETAIL') && (showVal === 'SUMMARY')) {
			showDendro = false;
		}
		return showDendro;
	}

	HeatMap.prototype.setReadOnly = function() {
	    this.mapConfig.data_configuration.map_information.read_only = 'Y';
	};

	/**
	* Save data sent to plugin to mapConfig 
	*/
	HeatMap.prototype.saveDataSentToPluginToMapConfig = function(nonce, postedConfig, postedData) {
		try {
			var pane = document.querySelectorAll('[data-nonce="'+nonce+'"]')[0].parentElement.parentElement
		} catch(err) {
			throw "Cannot determine pane for given nonce"
			return false
		}
		const paneId = pane.id;
		if (!this.mapConfig.hasOwnProperty('panel_configuration')) {
			this.mapConfig['panel_configuration'] = {};
		}
		if (!this.mapConfig.panel_configuration.hasOwnProperty(paneId) || this.mapConfig.panel_configuration[paneId] == null) {
			this.mapConfig.panel_configuration[paneId] = {};
		}
		if (postedConfig) this.mapConfig.panel_configuration[paneId].config = postedConfig;
		if (postedData) this.mapConfig.panel_configuration[paneId].data = postedData;
		this.mapConfig.panel_configuration[paneId].type = 'plugin';
		this.mapConfig.panel_configuration[paneId].pluginName = pane.dataset.pluginName;
	}

	HeatMap.prototype.removePaneInfoFromMapConfig = function(paneid) {
		if (this.mapConfig.hasOwnProperty('panel_configuration')) {
			this.mapConfig.panel_configuration[paneid] = null;
		}
	};

	/**
	* Save linkout pane data to mapConfig
	*/
	HeatMap.prototype.saveLinkoutPaneToMapConfig = function(paneid, url, paneTitle) {
		if (!this.mapConfig.hasOwnProperty('panel_configuration')) {
			this.mapConfig['panel_configuration'] = {};
		}
		this.mapConfig.panel_configuration[paneid] = {
			'type': 'linkout',
			'url': url,
			'paneTitle': paneTitle
		} 
	};

	/*
	  Saves data from plugin to mapConfig--this is data that did NOT originally come from the NGCHM.
	*/
	HeatMap.prototype.saveDataFromPluginToMapConfig = function (nonce, dataFromPlugin) {
		try {
			var paneId = document.querySelectorAll('[data-nonce="'+nonce+'"]')[0].parentElement.parentElement.id;
		} catch(err) {
			throw "Cannot determine pane for given nonce";
			return false;
		}
		if (!this.mapConfig.hasOwnProperty('panel_configuration')) {
			this.mapConfig['panel_configuration'] = {};
		}
		if (!this.mapConfig.panel_configuration.hasOwnProperty(paneId) || this.mapConfig.panel_configuration[paneId] == null) {
			this.mapConfig.panel_configuration[paneId] = {};
		}
		this.mapConfig.panel_configuration[paneId].dataFromPlugin = dataFromPlugin;
	};

	/***********  Methods for accessing mapData ****************/

	HeatMap.prototype.getAxisCovariateData = function (axis) {
		return isRow(axis) ? this.mapData.row_data.classifications : this.mapData.col_data.classifications;
	};
	
	HeatMap.prototype.getRowClassificationData = function() {
		return this.mapData.row_data.classifications;
	}

	HeatMap.prototype.getColClassificationData = function() {
		return this.mapData.col_data.classifications;
	}
	
	//Get Axis Labels
	HeatMap.prototype.getAxisLabels = function(axis) {
		return isRow (axis) ? this.mapData.row_data.label : this.mapData.col_data.label;
	};

	//Get Row Labels
	HeatMap.prototype.getRowLabels = function() {
		return this.mapData.row_data.label;
	}

	//Get Column Labels
	HeatMap.prototype.getColLabels = function() {
		return this.mapData.col_data.label;
	}

	HeatMap.prototype.getDendrogramData = function(axis) {
	    const data = isRow(axis) ? this.mapData.row_data.dendrogram : this.mapData.col_data.dendrogram;
	    return (data || [])
	    .map(entry => {
		const tokes = entry.split(",");
		return { left: Number(tokes[0]), right: Number(tokes[1]), height: Number(tokes[2]) };
	    });
	}

	/***********  Methods for accessing datalevels ****************/

	//Return the total number of detail rows
	HeatMap.prototype.getTotalRows = function(){
		return this.datalevels[MAPREP.DETAIL_LEVEL].totalRows;
	}
	
	//Return the summary row ratio
	HeatMap.prototype.getSummaryRowRatio = function(){
		if (this.datalevels[MAPREP.SUMMARY_LEVEL] !== null) {
			return this.datalevels[MAPREP.SUMMARY_LEVEL].rowSummaryRatio;
		} else {
			return this.datalevels[MAPREP.THUMBNAIL_LEVEL].rowSummaryRatio;
		}
	}
	
	//Return the summary row ratio
	HeatMap.prototype.getSummaryColRatio = function(){
		if (this.datalevels[MAPREP.SUMMARY_LEVEL] !== null) {
			return this.datalevels[MAPREP.SUMMARY_LEVEL].colSummaryRatio;
		} else {
			return this.datalevels[MAPREP.THUMBNAIL_LEVEL].col_summaryRatio;
		}
	}
	//Return the total number of detail rows
	HeatMap.prototype.getTotalRows = function(){
		return this.datalevels[MAPREP.DETAIL_LEVEL].totalRows;
	}
	
	//Return the total number of detail rows
	HeatMap.prototype.getTotalCols = function(){
		return this.datalevels[MAPREP.DETAIL_LEVEL].totalColumns;
	}

	//Return the total number of rows/columns on the specified axis.
	HeatMap.prototype.getTotalElementsForAxis = function(axis) {
		const level = this.datalevels[MAPREP.DETAIL_LEVEL];
		return isRow(axis) ? level.totalRows : level.totalColumns;
	};

	//Return the number of rows for a given level
	HeatMap.prototype.getNumRows = function(level){
		return this.datalevels[level].totalRows;
	};

	//Return the number of columns for a given level
	HeatMap.prototype.getNumColumns = function(level){
		return this.datalevels[level].totalColumns;
	};

	//Return the row summary ratio for a given level
	HeatMap.prototype.getRowSummaryRatio = function(level){
		return this.datalevels[level].rowSummaryRatio;
	}
	
	//Return the column summary ratio for a given level
	HeatMap.prototype.getColSummaryRatio = function(level){
		return this.datalevels[level].colSummaryRatio;
	}
	
	// Get a data value in a given row / column
	// This is very inefficient.  Consider creating and using an
	// AccessWindow if possible.
	HeatMap.prototype.getValue = function(level, row, column) {
		const accessWindow = this.getNewAccessWindow ({
		    layer: this._currentDl,
		    level: level,
		    firstRow: row,
		    firstCol: column,
		    numRows: 1,
		    numCols: 1,
		});
		return accessWindow.getValue(row,column);
	}

	// Recursively determine all levels for which level is an alternate.
	HeatMap.prototype.getAllAlternateLevels = function (level) {
	    const alternateLevels = this.alternateLevels;
	    return getAlternates (level);

	    function getAlternates (level) {
		const altlevs = alternateLevels.hasOwnProperty (level) ? alternateLevels[level] : [];
		const pal = altlevs.map(lev => getAlternates(lev));
		return [...new Set(pal.concat(altlevs).flat())];  // Use [...Set] to ensure uniqueness
	    }
	}	

	/***********  EventListener Methods ****************/

	Object.assign (HeatMap.prototype, {
	    initEventListeners: function initEventListeners (updateCallbacks) {
		this.eventListeners = updateCallbacks.slice(0);  // Create a copy.
	    },

	    // Register another callback function for a user that wants to be notifed
	    // of updates to the status of heat map data.
	    addEventListener: function addEventListener (callback) {
		this.eventListeners.push(callback.bind (this));
	    },

	    // Send event to all listeners.
	    sendAllListeners: function sendAllListeners (event, tile){
		// Send the event to all listeners.
		this.eventListeners.forEach(callback => callback(event, tile));
		if (event === MMGR.Event_NEWDATA) {
			// Also broadcast NEWDATA events to all levels for which tile.level is an alternate.
			const { layer, level: mylevel, row, col, data } = tile;
			const alts = this.getAllAlternateLevels (mylevel);
			while (alts.length > 0) {
				const altTile = { layer, level: alts.shift(), row, col, data };
				this.eventListeners.forEach(callback => callback(event, altTile));
			}
		}
	    },
	});

	// Retrieve color map Manager for this heat map.
	HeatMap.prototype.getColorMapManager = function() {
		if (this.mapConfig == null)
			return null;

		if (this.colorMapMgr == null) {
			this.colorMapMgr = new CMM.ColorMapManager(this);
		}
		return this.colorMapMgr;
	};

	HeatMap.prototype.initTileWindows = function () {
	    // Array of TileWindow onready functions waiting for all tiles in the
	    // window to load.
	    this.tileWindowListeners = [];
	    this.tileWindowRefs = new Map();
	};

	// Listen for tile load notifications.  For each, check each TileWindow
	// listener to see if all required tiles have been received.
	//
	// This approach uses a single permanent event listener for the entire
	// heatMap.  Currently there is no way to remove 'transient' event
	// listeners, such as TileWindow listeners.
	HeatMap.prototype.updateTileWindows = function (tile) {
	    const debug = false;
	    // Iterate over all the tileWindowRefs, remove any that have been reclaimed,
	    // and check all others for tile updates.
	    this.tileWindowRefs.forEach ((value, key) => {
		const tileWin = value.deref();
		if (tileWin) {
		    tileWin.checkTile (tile);
		} else {
		    if (debug) console.log ('Removing garbage collected tileWindow', key);
		    this.tileWindowRefs.delete(key);
		}
	    });
	    // Iterate over all the tileWindowListeners.
	    let i = 0;
	    while (i < this.tileWindowListeners.length) {
		const entry = this.tileWindowListeners[i];
		// Check if all tiles in the window are now available
		// and the listener's onready promise has been resolved.
		if (entry.checkReady(entry.tileWindow, tile)) {
		    // If so, delete the entry.
		    this.tileWindowListeners.splice (i, 1);
		} else {
		    // Otherwise, advance to next entry.
		    i ++;
		}
	    }

	    this.sendCallBack(MMGR.Event_NEWDATA, tile);
	};

	HeatMap.prototype.tileIdReferenced = function (tileId) {
	    const [ layer, level, row, col ] = tileId.split('.');
	    var referenced = false;
	    this.tileWindowRefs.forEach ((value, key) => {
		const [ tlayer, tlevel, firstRow, lastRow, firstCol, lastCol ] = key.split('.');
		if (tlayer == layer && tlevel == level &&
		    (row|0) >= (firstRow|0) && (row|0) <= (lastRow|0) &&
		    (col|0) >= (firstCol|0) && (col|0) <= (lastCol|0)) {
		    referenced = true;
		}
	    });
	    return referenced;
	};

	/**********************************************************************************
	 * FUNCTION - hasGaps: Returns true iff the heatMap has gaps, otherwise false.
	 **********************************************************************************/
	HeatMap.prototype.hasGaps = function () {
	    return this.getMapInformation().map_cut_rows+this.getMapInformation().map_cut_cols != 0;
	};

	// Return the source of this heat map.
	HeatMap.prototype.source = function() {
	    return this.fileSrc;
	};

	// unAppliedChanges is true iff the map has been changed
	// but not saved.
	//
	// setUnAppliedChanges (true) is called when something
	// changes the map configuration.
	//
	// setUnAppliedChanges (false) is called when something
	// saves or resets the map configuration.
	HeatMap.prototype.setUnAppliedChanges = function(value) {
	    this.unAppliedChanges = value;
	}

	// Return the current value of unAppliedChanges.
	HeatMap.prototype.getUnAppliedChanges = function(){
	    return this.unAppliedChanges;
	}

	// Call the users call back function to let them know the chm is initialized or updated.
	HeatMap.prototype.sendCallBack = function sendCallBack(event, tile) {
	    //Initialize event
	    if ((event === MMGR.Event_INITIALIZED) || (event === MMGR.Event_JSON) ||
		    ((event === MMGR.Event_NEWDATA) && (tile.level === MAPREP.THUMBNAIL_LEVEL))) {
		    //Only send initialized status if several conditions are met: need all summary JSON and thumb nail.
		    if ((this.mapData != null) &&
			    (this.mapConfig != null) &&
			    (Object.keys(this.datalevels).length > 0) &&
			    (this.tileCache.haveTileData(this.getCurrentDL()+"."+MAPREP.THUMBNAIL_LEVEL+".1.1")) &&
			     !this.initialized) {
				    this.initialized = true;
				    configurePageHeader(this);
				    if (!this.mapConfig.hasOwnProperty('panel_configuration')) {
					UTIL.hideLoader(true);
				    }
				    this.sendAllListeners(MMGR.Event_INITIALIZED);
		    }
		    //Unlikely, but possible to get init finished after all the summary tiles.
		    //As a back stop, if we already have the top left summary tile, send a data update event too.
		    const data = this.tileCache.getTileCacheData(this.getCurrentDL()+"."+MAPREP.SUMMARY_LEVEL+".1.1");
		    if (data) {
			    this.sendAllListeners(MMGR.Event_NEWDATA, { layer: this.getCurrentDL(), level: MAPREP.SUMMARY_LEVEL, row: 1, col: 1, data });
		    }
	    }
	    if ((event === MMGR.Event_NEWDATA) && this.initialized) {
		    this.sendAllListeners(event, tile);
	    }
	};

	// Private method used to obtain a new or existing TileWindow
	// given a tileSpec.
	//
	HeatMap.prototype.getNewTileWindow = function (tileSpec) {
	    const debug = false;
	    const tileKey = [tileSpec.layer, tileSpec.level, tileSpec.startRowTile, tileSpec.endRowTile,
		tileSpec.startColTile, tileSpec.endColTile].join('.');
	    if (this.tileWindowRefs.has (tileKey)) {
		const tileRef = this.tileWindowRefs.get(tileKey).deref();
		if (tileRef) {
		    if (debug) {
			console.log ('Found existing tileWindow for ', tileKey);
		    }
		    return tileRef;
		}
		if (debug) {
		    console.log ('Encountered garbage collected tileWindow for ', tileKey);
		}
	    }
	    // Create a new tileWindow and keep a weak reference to it.
	    if (debug) {
		console.log ('Creating new tileWindow for ', tileKey);
	    }
	    const tileRef = new TileWindow (this, tileSpec);
	    this.tileWindowRefs.set (tileKey, new WeakRef(tileRef));
	    return tileRef;
	};

	// Private method used to obtain a TileWindow for a new AccessWindow.
	//
	HeatMap.prototype.getTileWindow = function (win) {
	    // Call getTileAccessWindow from the appropriate data level to determine
	    // the tileSpec for the desired TileWindow, then call
	    // this.getNewTileWindow to obtain either an existing or a new
	    // TileWindow for that tileSpec.
	    //
	    return this.datalevels[win.level].getTileAccessWindow (win.layer, win.firstRow, win.firstCol, win.numRows, win.numCols,
		    tileSpec => this.getNewTileWindow(tileSpec));
	};

	/* Obtain an access window for the specified view window.
	 * The access window contains four entries:
	 * - win: The view window.
	 * - getValue (row, column) Function to return the value at row, column in heatMap coordinates.
	 * - getRowValues (row, firstCol, numCols)  Returns an iterator over the values (row, firstCol...firstCol+numCols-1).
	 *   Each iteration produces a tuple { i, col, value }, where i is a zero-based index and col = firstCol+i.
	 * - onready (callback) When all data ready, call callback if specified with the access window as its parameter or return a promise for the access window.  
	 *
	 * The returned access window will have its data tiles requested, but they may not be available immediately.
	 * Use the onready method to request a promise/callback when all tiles in the access window are ready.
	 */
	HeatMap.prototype.getNewAccessWindow = function (win) {
	    return new AccessWindow (this, win);
	};

	/* Obtain a promise for a histogram of the map's summary values.
	 *
	 * The returned histogram includes the following fields:
	 * - breaks : break points between bins,
	 * - bins : an array of histogram bins, each containing a count.
	 * - binMax : maximum value in bins
	 * - total : total of bins
	 * - nan : number of missing values / NaN's in the data (not in the bins)
	 *
	 * bins.length == breaks.length+1
	 */
	HeatMap.prototype.getSummaryHist = function (layer, lowBP, highBP) {
	    const diff = highBP-lowBP;
	    const bins = new Array(10+1).join('0').split('').map(parseFloat); // make array of 0's to start the counters
	    const breaks = new Array(9+1).join('0').split('').map(parseFloat);
	    for (let i=0; i <breaks.length;i++){
		    breaks[i]+=lowBP+diff/(breaks.length-1)*i; // array of the breakpoints shown in the preview div
	    }
	    const numCol = heatMap.getNumColumns(MAPREP.SUMMARY_LEVEL);
	    const numRow = heatMap.getNumRows(MAPREP.SUMMARY_LEVEL);
	    const accessWindow = this.getNewAccessWindow ({
		layer: layer,
		level: MAPREP.SUMMARY_LEVEL,
		firstRow: 1,
		firstCol: 1,
		numRows: numRow,
		numCols: numCol,
	    });
	    return accessWindow.onready().then (win => {
		let nan=0;
		for(let row=1;row<=numRow;row++){
		    for (let {value} of accessWindow.getRowValues(row)) {
			if (isNaN(value) || value>=MAPREP.maxValues){ // is it Missing value?
			    nan++;
			} else if (value > MAPREP.minValues) { // Don't count cut locations.
			    let k = 0;
			    while (k < breaks.length && value >= breaks[k]) {
				k++;
			    }
			    bins[k]++;  // N.B. One more bin than breaks.
			}
		    }
		}
		let total = 0;
		let binMax = nan;
		for (let i=0;i<bins.length;i++){
			if (bins[i]>binMax)
				binMax=bins[i];
			total+=bins[i];
		}
		return { breaks, bins, binMax, total, nan };
	    });
	}

    }
    /********************************************************************************************
     *
     * End of prototype methods for HeatMap "class".
     *
     ********************************************************************************************/

    // Creator function for HeatMap class.
    //
    // HeatMap class - holds heat map properties and a tile cache
    // Used to get HeatMapLevel object.
    function HeatMap (heatMapName, updateCallbacks, fileSrc, chmFile, compat) {
	this.initialized = false;	// True once the minimum components have loaded.
	this.unAppliedChanges = false;	// True iff map has unsaved changes.
	this.mapName = heatMapName;	// Name of the map.
	this.mapConfig = null;		// Map configuration.
	this.mapData = null;		// Map data (excluding tiles).
	this.datalevels = {};		// HeatMapLevels for tile data at each level.
	this.alternateLevels = {};	// Alternate level to use for unloaded data.
	this.colorMapMgr = null;	// The heatMap's color map manager.
	this.fileSrc = fileSrc;		// The source of the map (Web, File, etc.)
	this.chmFile = chmFile;		// Reference to zip file (for NGCHMs from files only)
	this.zipFiles = {};		// Index of files inside the zip file (").
	this.currentTileRequests = [];	// Tiles we are currently reading
	this.pendingTileRequests = [];	// Tiles we want to read

	this.initEventListeners (updateCallbacks);  // Initialize this.eventListeners
	this.initTileWindows ();	// Initialize this.tileWindowListeners and this.tileWindowRefs
	this.tileCache = new TileCache(this); // Initialize this.tileCache.

	//Initialization - this code is run once when the map is created.

	if (this.source() !== MMGR.FILE_SOURCE) {
	    // WEB_SOURCE created the WebLoader on module initialization.
	    if (this.source() !== MMGR.WEB_SOURCE) createWebLoader(this.source());
	    connectWebLoader(this, compat.addMapConfig, compat.addMapData);
	} else {
		//Check file mode viewer software version (excepting when using embedded widget)
		if (typeof embedDiv === 'undefined') {
			checkViewerVersion(this);
		}
		loadNgChmFromZip (this, compat.addMapConfig, compat.addMapData);
	}
    }
    // End class HeatMap

    //  Helper function to initialize the data levels once we know the tile structure.
    //  heatMap.mapConfig must be set.
    //
    function addDataLayers (heatMap) {
	const mapConfig = heatMap.mapConfig;

	// Each data level keeps a pointer to the next lower level.
	const levelsConf = mapConfig.data_configuration.map_information.levels;

	// Create a HeatMapLevel object for level levelId if it's defined in the map configuration.
	// Set the level's lower level to the HeatMapLevel object for lowerLevelId (if it's defined).
	// If levelId is not defined in the map configuration, create an alias to the
	// HeatMapLevel object for altLevelId (if it's defined).
	function createLevel (levelId, lowerLevelId, altLevelId) {
	    if (levelsConf.hasOwnProperty (levelId)) {
		heatMap.datalevels[levelId] = new HeatMapLevel(heatMap.tileCache,
						levelId,
						levelsConf[levelId],
						lowerLevelId ? heatMap.datalevels[lowerLevelId] : null);
	    } else if (altLevelId) {
		heatMap.datalevels[levelId] = heatMap.datalevels[altLevelId];
		// Record all levels for which altLevelId is serving as an immediate alternate.
		if (!heatMap.alternateLevels.hasOwnProperty(altLevelId)) {
		    heatMap.alternateLevels[altLevelId] = [];
		}
		heatMap.alternateLevels[altLevelId].push (levelId);
	    }
	}

	createLevel (MAPREP.THUMBNAIL_LEVEL);
	createLevel (MAPREP.SUMMARY_LEVEL, MAPREP.THUMBNAIL_LEVEL, MAPREP.THUMBNAIL_LEVEL);
	createLevel (MAPREP.DETAIL_LEVEL, MAPREP.SUMMARY_LEVEL, MAPREP.SUMMARY_LEVEL);
	createLevel (MAPREP.RIBBON_VERT_LEVEL, MAPREP.SUMMARY_LEVEL, MAPREP.DETAIL_LEVEL);
	createLevel (MAPREP.RIBBON_HOR_LEVEL, MAPREP.SUMMARY_LEVEL, MAPREP.DETAIL_LEVEL);

	prefetchInitialTiles(heatMap);
	heatMap.sendCallBack(MMGR.Event_INITIALIZED);
    }

    // Helper function to permanently associate an AccessWindow for
    // the thumbnail level of every layer with the heatMap.
    //
    // Has the effect of prefetching and preserving the thumbnail
    // level tiles for all layers.
    function prefetchInitialTiles(heatMap) {
	const datalayers = heatMap.mapConfig.data_configuration.map_information.data_layer;
	heatMap.thumbnailWindowRefs =
	    Object.keys(datalayers).map (layer =>
		heatMap.getNewAccessWindow ({
		    layer: layer,
		    level: MAPREP.THUMBNAIL_LEVEL,
		    firstRow: 1,
		    firstCol: 1,
		    numRows: heatMap.getNumRows(MAPREP.THUMBNAIL_LEVEL),
		    numCols: heatMap.getNumColumns(MAPREP.THUMBNAIL_LEVEL),
		})
	    );
    }


    ///////////////////////////////////////////////////////////////////////////
    //
    // BEGIN class HeatMapLevel
    //
    // HeatMapLevel implements support for accessing the HeatMap's data at a
    // specific summarization level.  It is primarily concerned with
    // computing the differences in scales and indices between the different
    // levels.
    //
    class HeatMapLevel {

	constructor (tileCache, level, jsonData, lowerLevel) {
	    this.tileCache = tileCache;
	    this.level = level;
	    this.totalRows = jsonData.total_rows;
	    this.totalColumns = jsonData.total_cols;
	    this.numTileRows = jsonData.tile_rows;
	    this.numTileColumns = jsonData.tile_cols;
	    this.rowsPerTile = jsonData.rows_per_tile;
	    this.colsPerTile = jsonData.cols_per_tile;
	    this.rowSummaryRatio = jsonData.row_summary_ratio;
	    this.colSummaryRatio = jsonData.col_summary_ratio;
	    this.lowerLevel = lowerLevel;
	    this.rowToLower = (lowerLevel === null ? null : this.totalRows/lowerLevel.totalRows);
	    this.colToLower = (lowerLevel === null ? null : this.totalColumns/lowerLevel.totalColumns);
	    this.lastTileWindow = null;
	    // For memoizing whether heat map rows are cuts.  See DetailHeatMapDisplay.
	    this.isLineACut = Array(this.totalRows);

	    // Determine the number of columns in the last tile column.
	    this.colsInLastTile = this.totalColumns % this.colsPerTile;
	    if (this.colsInLastTile == 0) this.colsInLastTile = this.colsPerTile;

	    // Determine the number of rows in the last tile row.
	    this.rowsInLastTile = this.totalRows % this.rowsPerTile;
	    if (this.rowsInLastTile == 0) this.rowsInLastTile = this.rowsPerTile;
	}

	// Determine the number of rows per tile in the specified tile row.
	// Normally it is this.rowsPerTile, but there may be less in the last row of tiles.
	numRowsInTile (tileRow) {
	    return tileRow < this.numTileRows ? this.rowsPerTile : this.rowsInLastTile;
	}

	// Determine the number of columns per tile in the specified tile column.
	// Normally it is this.colsPerTile, but there may be less in the last column of tiles.
	numColsInTile (tileCol) {
	    return tileCol < this.numTileColumns ? this.colsPerTile : this.colsInLastTile;
	}

	//Get a value for a row / column.  If the tile with that value is not available, get the down sampled value from
	//the lower data level.
	getLayerValue (layer, tileWindow, row, column) {
	    //Calculate which tile holds the row / column we are looking for.
	    const tileRow = Math.floor((row-1)/this.rowsPerTile) + 1;
	    const tileCol = Math.floor((column-1)/this.colsPerTile) + 1;
	    if (!tileWindow && this.lastTileWindow && this.lastTileWindow.layer == layer &&
		tileRow >= this.lastTileWindow.startRowTile && tileRow <= this.lastTileWindow.endRowTile &&
		tileCol >= this.lastTileWindow.startColTile && tileCol <= this.lastTileWindow.endColTile) {
		tileWindow = this.lastTileWindow;
	    } else if (!tileWindow) {
		const tileSpec = {
		    layer,
		    level: this.level,
		    startRowTile: tileRow,
		    endRowTile: this.numTileRows,
		    startColTile: 1,
		    endColTile: this.numTileColumns,
		};
		tileWindow = this.tileCache.heatMap.getNewTileWindow (tileSpec);
		this.lastTileWindow = tileWindow;
	    }
	    const arrayData = tileWindow.getTileData (tileRow, tileCol);

	    // If we have the tile, use it.  Otherwise, use a lower resolution tile to provide a value.
	    if (arrayData) {
		const thisTileColsPerRow = this.numColsInTile (tileCol);
		//Tile data is in one long list of numbers.  Calculate which position maps to the row/column we want.
		return arrayData[(row-1)%this.rowsPerTile * thisTileColsPerRow + (column-1)%this.colsPerTile];
	    } else if (this.lowerLevel != null) {
		return this.lowerLevel.getLayerValue(layer, null, Math.floor((row-1)/this.rowToLower) + 1, Math.floor((column-1)/this.colToLower) + 1);
	    } else {
	    	return 0;
	    }	
	}

	getRowValues (tileWindow, row, firstCol, numCols) {
	    const layer = tileWindow.layer;
	    row = row|0;
	    firstCol = firstCol|0;
	    const tileRow = Math.floor((row-1)/this.rowsPerTile) + 1;
	    const rowIndexInTile = (row-1) % this.rowsPerTile;
	    const myIterable = {};
	    const thisLevel = this;
	    const lowerLevel = this.lowerLevel;
	    const colsPerTile = this.colsPerTile;
	    const lowerRow = (((row-1)/this.rowToLower)|0) + 1;
	    const colToLower = this.colToLower;
	    const invColToLower = 1.0 / this.colToLower;
	    myIterable[Symbol.iterator] = function* () {
		for (let nextCol = 0; nextCol < numCols; ) {
		    const tileCol = (((firstCol+nextCol-1)/colsPerTile)|0) + 1;
		    const thisTileColsPerRow = thisLevel.numColsInTile (tileCol);
		    const arrayData = tileWindow.getTileData (tileRow, tileCol);
		    const colsLeftInTile = Math.min (tileCol * colsPerTile - firstCol - nextCol + 1, numCols - nextCol);
		    let i = nextCol;
		    if (arrayData) {
			const idx = rowIndexInTile * thisTileColsPerRow + (firstCol+nextCol-1) % colsPerTile;
			for (let j = 0; j < colsLeftInTile; j++) {
			    yield { i, col: firstCol+i, value: arrayData[idx+j] };
			    i++;
			}
		    } else if (lowerLevel) {
			const firstLowerCol = (((firstCol+nextCol-1) * invColToLower)|0) + 1;
			const lastLowerCol = (((firstCol+nextCol+colsLeftInTile-2) * invColToLower)|0) + 1;
			const lowerAW = lowerLevel.tileCache.heatMap.getNewAccessWindow ({
			    layer: layer,
			    level: lowerLevel.level,
			    firstRow: lowerRow,
			    firstCol: firstLowerCol,
			    numRows: 1,
			    numCols: lastLowerCol - firstLowerCol + 1,
			});
			const lowerVals = lowerAW.getRowValues(lowerRow);
			let j = 0;
			for (let { i: lowI, col: lowCol, value } of lowerVals) {
			    const endOfUpperPixel = Math.min (((lowI+1)*colToLower)|0, colsLeftInTile);
			    while (j < endOfUpperPixel) {
				const col = firstCol+i;
				yield { i, col, value };
				i++;
				j++;
			    }
			}
			// Sometimes colToLower expansion ratio can be one short.
			while (j < colsLeftInTile) {
			    yield { i: j, col: firstCol+i, value: 0 };
			    j++;
			}
		    } else {
			for (let j = 0; j < colsLeftInTile; j++) {
			    yield { i, col: firstCol+i, value: 0 };
			    i++;
			}
		    }
		    nextCol += colsLeftInTile;
		}
	    };
	    return myIterable;
	}

	getTileAccessWindow (layer, row, column, numRows, numColumns, getTileWindow) {
	    const startRowTile = Math.floor((row-1)/this.rowsPerTile) + 1;
	    const startColTile = Math.floor((column-1)/this.colsPerTile) + 1;
	    const endRowCalc = (row+numRows-1)/this.rowsPerTile;
	    const endColCalc = (column+numColumns-1)/this.colsPerTile;
	    const endRowTile = Math.ceil(endRowCalc);
	    const endColTile = Math.ceil(endColCalc);
	    const tileSpec = { layer, level: this.level, startRowTile, endRowTile, startColTile, endColTile };
	    return getTileWindow (tileSpec);
	}
    }
    // END class HeatMapLevel

    /* Submodule for caching Actual/Shown labels.
     */
    (function() {
	var actualAxisLabels;
	var shownAxisLabels;
	var shownAxisLabelParams;

	MMGR.initAxisLabels = function () {
	    actualAxisLabels = {};
	    shownAxisLabels = { ROW: [], COLUMN: [] };
	    shownAxisLabelParams = { ROW: {}, COLUMN: {} };
	};
	MMGR.initAxisLabels();

	MMGR.getActualLabels = function (axis) {
		axis = MMGR.isRow(axis) ? "ROW" : "COLUMN";
		if (!actualAxisLabels.hasOwnProperty(axis)) {
			const labels = MMGR.getHeatMap().getAxisLabels(axis)["labels"];
			actualAxisLabels[axis] = labels.map(text => {
				return text === undefined ? undefined : text.split("|")[0];
			});
		}
		return actualAxisLabels[axis];
	};
	MMGR.getShownLabels = function (axis) {
		axis = MMGR.isRow(axis) ? "ROW" : "COLUMN";
		const config = MMGR.getHeatMap().getAxisConfig(axis);
		// Recalculate shown labels if parameters affecting them have changed.
		if (shownAxisLabelParams[axis].label_display_length !== config.label_display_length ||
		    shownAxisLabelParams[axis].label_display_method !== config.label_display_method) {
			shownAxisLabelParams[axis].label_display_length = config.label_display_length;
			shownAxisLabelParams[axis].label_display_method = config.label_display_method;
			const labels = MMGR.getActualLabels(axis);
			shownAxisLabels[axis] = labels.map(text => {
				return text === undefined ? "" : MMGR.getLabelText (text, axis);
			});
		}
		return shownAxisLabels[axis];
	};
    })();

    /**********************************************************************************
     * FUNCTION - getLabelText: The purpose of this function examine label text and
     * shorten the text if the label exceeds the 20 character allowable length.  If the
     * label is in excess, the first 9 and last 8 characters will be written out
     * separated by ellipsis (...);
     **********************************************************************************/
    MMGR.getLabelText = function(text,type,builder) {
	const heatMap = MMGR.getHeatMap();
	    var size = parseInt(heatMap.getColConfig().label_display_length);
	    var elPos = heatMap.getColConfig().label_display_method;
	    if (type.toUpperCase() === "ROW") {
		    size = parseInt(heatMap.getRowConfig().label_display_length);
		    elPos = heatMap.getRowConfig().label_display_method;
	    }
	    //Done for displaying labels on Summary side in builder
	    if (typeof builder !== 'undefined') {	/* FIXME: BMB */
		    size = 16;
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
    };

    /**********************************************************************************
     * FUNCTION - zipAppDownload: The user clicked on the "Download Viewer" button.
     * Hide the button and initiate download of the NG-CHM Viewer application.
     **********************************************************************************/
    MMGR.zipAppDownload = zipAppDownload;
    function zipAppDownload () {
	downloadFileApplication();
    }

    // Initiate download of NGCHM File Viewer application zip
    function downloadFileApplication () {
	const heatMap = MMGR.getHeatMap();
	if (typeof NgChm.galaxy !== 'undefined') {
	    // Current viewer is embedded within Galaxy.
	    // FIXME: BMB: Use a better way to determine Galaxy embedding.
	    window.open("/plugins/visualizations/mda_heatmap_viz/static/ngChmApp.zip");
	} else if (!heatMap || heatMap.source() === MMGR.FILE_SOURCE) {
	    // Heat map came from a disk file, not from a server.
	    // (This does not mean the viewer is not from a server, so this could be
	    // refined further for that case i.e. the "api" condition might be more appropriate)
	    // Use full URL, which must be complete!
	    callServlet("GET", COMPAT.viewerAppUrl, false);
	} else {
	    // Heat map came from a server.
	    // Use server "api" + special endpoint name
	    callServlet("GET", CFG.api + "ZipAppDownload", false);
	}
    }

    /**********************************************************************************
     * FUNCTION - viewerAppVersionExpiredNotification: This function handles all of the tasks
     * necessary display a modal window whenever a user's version of the file application
     * has been superceded and a new version of the file application should be downloaded.
     **********************************************************************************/
    function viewerAppVersionExpiredNotification (oldVersion, newVersion) {
	    const title = "New NG-CHM File Viewer Version Available";
	    const text = "<br>The version of the NG-CHM File Viewer application that you are running ("+oldVersion+") has been superceded by a newer version ("+newVersion+"). You will be able to view all pre-existing heat maps with this new backward-compatible version. However, you may wish to download the latest version of the viewer.<br><br>The application downloads as a single HTML file (ngchmApp.html).  When the download completes, you may run the application by simply double-clicking on the downloaded file.  You may want to save this file to a location of your choice on your computer for future use.<br><br>";
	    showDownloadViewerNotification (title, text);
    }

    MMGR.showDownloadViewerNotification = showDownloadViewerNotification;
    function showDownloadViewerNotification (title, bodyText) {
	    const msgBox = UHM.initMessageBox();
	    msgBox.classList.add ('file-viewer');
	    UHM.setMessageBoxHeader(title);
	    UHM.setMessageBoxText(bodyText);
	    UHM.setMessageBoxButton(
		'download',
		{ type: 'text', text: "Download Viewer", },
	        "Download viewer button",
		() => {
		    MMGR.zipAppDownload();
		    UHM.messageBoxCancel();
		}
	    );
	    UHM.setMessageBoxButton(
		'cancel',
		{ type: 'text', text: "Cancel", default: true },
		"Cancel button",
		UHM.messageBoxCancel
	    );
	    UHM.displayMessageBox();
    }

    // Compare the version of this NG-CHM viewer to the one recent available.
    // Notify the user if they're using a standalone viewer and it is out of date.
    //
    function checkViewerVersion(heatMap) {
	    const debug = false;
	    const req = new XMLHttpRequest();
	    const baseVersion = COMPAT.version.replace(/-.*$/, '');
	    req.open("GET", COMPAT.versionCheckUrl+baseVersion , true);
	    req.onreadystatechange = function () {
		    if (req.readyState == req.DONE) {
		    if (req.status != 200) {
			//Log failure, otherwise, do nothing.
			console.log('Failed to get software version: ' + req.status);
		    } else {
			    const latestVersion = req.response;
			    if (debug) console.log ('Compare versions', { latestVersion, thisVersion: COMPAT.version, newer: newer(latestVersion,baseVersion) });
			    if (newer (latestVersion, baseVersion) && (typeof NgChm.galaxy === 'undefined') && (MMGR.embeddedMapName === null) && (heatMap.source() != MMGR.WEB_SOURCE)) {
				viewerAppVersionExpiredNotification(COMPAT.version, latestVersion);
			    }
			}
		    }
	    };
	    req.send();

	    // v1 and v2 are version numbers consisting of integers separated by periods.
	    // This function returns true if v1 is greater than v2.
	    function newer (v1, v2) {
		// Split each into fields and convert each field to integer.
		v1 = v1.split('.').map(v => v|0);
		v2 = v2.split('.').map(v => v|0);
		for (let i = 0; ; i++) {
		    if (i == v1.length && i == v2.length) return false;   // Reached end of both with no differences.
		    if (i == v2.length) return true;  // Exhausted v2 (we treat 2.21.0 > 2.21)
		    if (i == v1.length) return false; // Exhausted v1.
		    if (v1[i] > v2[i]) return true;
		    if (v1[i] < v2[i]) return false;
		}
	    }
    }

    // Load the JSON files from the heatMap's zip file.
    // First constructs an index of the zip file entries in heatMap.zipFiles.
    // Then loads the mapConfig and mapData json files and calls
    // addMapConfig and addMapData respectively to load them into
    // the heatMap.
    function loadNgChmFromZip (heatMap, addMapConfig, addMapData) {
	if (heatMap.chmFile.size === 0) {
		UHM.mapLoadError (heatMap.chmFile.name, "File is empty (zero bytes)");
		return;
	}
	const reader = new zip.ZipReader (new zip.BlobReader(heatMap.chmFile));
	// get all entries from the zip
	reader.getEntries()
	.then (function (entries) {
	    //Inspect the first entry path to grab the true heatMapName.
	    //The user may have renamed the zip file OR it was downloaded
	    //as a second+ generation of a file by the same name (e.g. with a " (1)"
	    //in the name).
	    if (entries.length == 0) {
		UHM.mapLoadError (heatMap.chmFile.name, "Empty zip file");
		return;
	    }
	    const entryName = entries[0].filename;
	    const slashIdx = entryName.indexOf("/");
	    if (slashIdx < 0) {
		UHM.mapLoadError (heatMap.chmFile.name, "File format not recognized");
		return;
	    }
	    heatMap.mapName = entryName.substring(0,slashIdx);
	    for (let i = 0; i < entries.length; i++) {
		heatMap.zipFiles[entries[i].filename] = entries[i];
	    }
	    const mapConfigName = heatMap.mapName + "/mapConfig.json";
	    const mapDataName = heatMap.mapName + "/mapData.json";
	    if ((mapConfigName in heatMap.zipFiles) && (mapDataName in heatMap.zipFiles)) {
		setTimeout (() => {
		    zipFetchJson(heatMap, heatMap.zipFiles[mapConfigName], addMapConfig);
		});
		setTimeout (() => {
		    zipFetchJson(heatMap, heatMap.zipFiles[mapDataName], addMapData);
		});
	    } else {
		UHM.mapLoadError (heatMap.chmFile.name, "Missing NGCHM content");
	    }
	})
	.catch (function (error) {
		console.log('Zip file read error ' + error);
		UHM.mapLoadError (heatMap.chmFile.name, error);
	});

	// Helper function to fetch a json file from zip file using a zip file entry.
	function zipFetchJson(heatMap, entry, setterFunction) {
	    entry.getData (new zip.TextWriter(), {})
	    .then((text) => {
		setterFunction(heatMap, JSON.parse(text));
	    });
	}
    }

    /* Load the specified tile from the heatMap.
     *
     * On success, calls heatMap.setTileCacheData (tileCacheName, tileData), where
     * tileData is the Float32Array containing the tile's data that was
     * read from the heatMap.
     */
    HeatMap.prototype.loadHeatMapTile = function loadHeatMapTile (job) {
	const debug = false;
	const tileCacheName = job.tileCacheName;
	const cacheData = this.tileCache.getTileCacheData(tileCacheName);
	if (cacheData) {
	    if (debug) console.log ('Request for tile currently in cache: ', { tileCacheName });
	    return;
	}
	if (debug) console.log ('Request for tile', { tileCacheName, pending: this.pendingTileRequests.length, current: this.currentTileRequests.length });
	if (this.currentTileRequests.includes(tileCacheName)) {
	    if (debug) console.log ('Request for tile we are currently reading: ' + tileCacheName);
	    return;
	}
	let idx = this.pendingTileRequests.map(p => p.tileCacheName).indexOf(tileCacheName);
	if (idx >= 0) {
	    // Remove it so we can put it on the end.
	    if (debug) console.log ('Request for tile in pending queue: ' + tileCacheName);
	    this.pendingTileRequests.splice (idx, 1);
	}
	this.pendingTileRequests.push (job);

	if (debug) {
	    // Validate that there are no duplicates in pendingZipTile + currentTileRequests.
	    const pendingBaseNames = this.pendingTileRequests.map (p => p.tileCacheName);
	    for (let i = 0; i < pendingBaseNames.length; i++) {
		const idx = pendingBaseNames.indexOf (pendingBaseNames[i]);
		if (idx !== i) {
		    console.error ('Duplicate pending tileCachenames', { i, idx, ei: this.pendingTileRequests[i], eidx: this.pendingTileRequests[idx] });
		}
		const cidx = this.currentTileRequests.indexOf (pendingBaseNames[i]);
		if (cidx !== -1) {
		    console.error ('Pending tileCachename in current tileCacheNames', { i, cidx, ei: this.pendingTileRequests[i], tileCacheName: this.currentTileRequests[cidx] });
		}
	    }
	}

	// Tradeoff. More concurrent jobs allows readers to do more in parallel.
	// Too many concurrent jobs can overwhelm readers and provides fewer
	// oppportunities to cancel requests for no longer needed tiles.
	if (this.currentTileRequests.length > 10) {
	    if (debug) console.log ('Too many tiles being read: ' + this.currentTileRequests.length);
	    return;
	}
	this.submitFirstPendingTileRequest ();
    }

    // HeatMap tile readers call tileRequestComplete when the request for the
    // tile specified by tileCacheName has completed.
    //
    // This function removes the tile from the list of current tile requests
    // and starts a new tile request (to replace the one that just finished).
    //
    // If tileData is not null, it adds the new tile data to the TileCache.
    //
    // tileData equal to null signifies that an error occurred and the tile data
    // cannot be obtained.
    HeatMap.prototype.tileRequestComplete = function tileRequestComplete (tileCacheName, tileData) {
	const debug = false;
	const idx = this.currentTileRequests.indexOf (tileCacheName);
	if (idx < 0) {
	    console.error ('Tile has disappeared from currentTileRequests', { tileCacheName, currentTileRequests: this.currentTileRequests });
	} else {
	    if (debug) {
		const mesg = 'Got ' + (tileData ? 'data' : 'error') + ' for tile ';
		console.log (mesg, { tileCacheName, pendingJobs: this.pendingTileRequests.length });
	    }
	    this.currentTileRequests.splice (idx, 1);
	    this.submitFirstPendingTileRequest ();
	}
	if (tileData) {
	    this.tileCache.setTileCacheEntry (tileCacheName, tileData);
	} else {
	    this.tileCache.resetTileCacheEntry (tileCacheName);  // Allow additional fetch attempts.
	}
    };

    // This function submits a pending TileRequest.
    //
    // The most recent TileRequest is removed from the pending request queue, added to the
    // current request list, and the appropriate tile loader is called.
    //
    // Requests for tiles that are no longer needed by any current TileWindow are simply
    // discarded.
    //
    HeatMap.prototype.submitFirstPendingTileRequest = function submitFirstPendingTileRequest () {
	const debug = false;

	// Read most recent non-abandoned tile request first. More likely to be needed.
	let job = this.pendingTileRequests.length == 0 ? null : this.pendingTileRequests.pop();
	while (job && !this.tileIdReferenced(job.tileCacheName)) {
	    if (debug) console.log ('Abandoning request for unreferenced tile: ' + job.tileCacheName);
	    job = this.pendingTileRequests.length == 0 ? null : this.pendingTileRequests.pop();
	}
	if (!job) {
	    return;
	}

	if (debug && this.currentTileRequests.indexOf (job.tileCacheName) != -1) {
	    console.log ('Starting duplicate fetch of', { tileCacheName: job.tileCacheName, job });
	}
	this.currentTileRequests.push (job.tileCacheName);

	if ((this.source() == MMGR.WEB_SOURCE) || (this.source() == MMGR.LOCAL_SOURCE)) {
	    // Heat map came from the web.
	    MMGR.webLoader.postMessage({ op: 'loadTile', job });
	} else {
	    // Heat map came from a zip file
	    zipFetchTile (this, job);
	}
    };

    // Read the tile specified by job from the HeatMap's zip file.
    //
    // Calls heatMap.tileRequestComplete when done.
    //
    function zipFetchTile (heatMap, job) {
	const debug = false;
	const baseName = heatMap.mapName + "/" + job.layer + "/"+ job.level + "/" + job.tileName;
	let entry = heatMap.zipFiles[baseName + '.tile'];
	if (typeof entry === 'undefined') {
	    // Tiles in ancient NG-CHMs had a .bin extension.
	    entry = heatMap.zipFiles[baseName + '.bin'];
	}
	if (typeof entry === "undefined") {
	    console.error ('Request for unknown zip tile: ' + baseName);
	    heatMap.tileRequestComplete (job.tileCacheName, null);
	} else {
	    setTimeout (function getEntryData () {
		entry.getData(new zip.BlobWriter())
	       .then (function(blob) {
		    if (debug) console.log('Got blob for tile ' + job.tileCacheName);
		    const fr = new FileReader();

		    fr.onerror = function() {
			console.error ('Error in zip file reader', fr.error);
			heatMap.tileRequestComplete (job.tileCacheName, null);
		    }
		    fr.onload = function(e) {
			const arrayBuffer = fr.result;
			const far32 = new Float32Array(arrayBuffer);
			heatMap.tileRequestComplete (job.tileCacheName, far32);
		     };
		     fr.readAsArrayBuffer(blob);
		})
		.catch (error => {
		    console.error ('Error getting zip tile data', error);
		});
	    }, 1);
	}
    }

    MMGR.zipSaveMapProperties = zipSaveMapProperties;
    function zipSaveMapProperties(heatMap, mapConf, progressMeter) {

	// Start the zip file creation process by instantiating a
	// zipWriter.
	return new Promise ((resolve, reject) => {
	    resolve (new zip.ZipWriter(new zip.BlobWriter()));
	})
        .then (zipWriter => addAllZipEntries (zipWriter))
	.then (zipWriter => {
	    // Convert zipWriter contents into a blob.
	    return zipWriter.close();
	})
	.then (blob => {
	    saveAs(blob, heatMap.mapName+".ngchm");
	    return true;
	})
	.catch (error => {
	    if (error != 'Cancelled by user') {
		const msgBox = UHM.newMessageBox('error-saving-ngchm');
		msgBox.style.width = '20em';
		UHM.setNewMessageBoxHeader (msgBox, 'Failed to save NG-CHM');
		const txtBox = UHM.getNewMessageTextBox (msgBox);
		txtBox.innerHTML = '<P><B>The NG-CHM was not saved.</B></P><P>The following error details were recorded:</P><P><B>' + error + '</B></P>';
		UHM.setNewMessageBoxButton(msgBox, 'close', {
		    type: 'text',
		    text: 'Close',
		    tooltip: 'Closes this dialog',
		    default: true,
		});
		UHM.displayNewMessageBox(msgBox);
	    }
	    return false;
	});

	// Returns a promise to add all the entries in heatMap.zipFiles
	// to the zipWriter.
	function addAllZipEntries (zipWriter) {
	    return new Promise ((resolve, reject) => {
		const zipKeys = Object.keys(heatMap.zipFiles);

	        // Add the first entry in zipFiles.  It will add
		// the next entry when it completes and so on,
		// until all have been added.
		addEntry (0);

		// Add the next entry from zipKeys.
		// Resolve the promise when done.
		function addEntry (fileIndex) {
		    // Update the progressMeter.
		    const progress = (1 + fileIndex) / (1 + zipKeys.length);
		    if (progressMeter) {
			const keepGoing = progressMeter (progress);
			if (!keepGoing) {
			    reject('Cancelled by user');
			}
		    }

		    if (fileIndex == zipKeys.length) {
		      resolve (zipWriter);  /* No more files to add: resolve promise */;
		    } else {
			// Get a promise to add the zip entry depending on its type.
			const keyVal = zipKeys[fileIndex];
			const entry = heatMap.zipFiles[keyVal];
			let promise;
			if ((keyVal.indexOf('bin') >= 0) || (keyVal.indexOf('tile') >= 0)) {
			    // Directly add all binary zip entries directly to the new zip file
			    promise = zipCopyBin(entry);
			} else if (keyVal.indexOf('mapConfig') >= 0) {
			    // For mapConfig, add the modified config data.
			    promise = addTextContents(entry.filename, JSON.stringify(mapConf || heatMap.mapConfig));
			} else {
			    // Directly add all other text zip entries to the new zip file.
			    promise = zipCopyText(entry);
			}
			// When the promise resolves, advance to the next entry.
			promise.then (() => addEntry (fileIndex+1));
		    }
		}
	    });

	    // Return a promise to copy the text zip entry
	    // to the new zip file.
	    function zipCopyText(entry) {
		return entry.getData(new zip.TextWriter())
		   .then (text => {
			return addTextContents(entry.filename, text);
		   });
	    }

	    // Return a promise to copy a binary zip entry
	    // to the new zip file.
	    function zipCopyBin(entry) {
		return entry.getData(new zip.BlobWriter())
	        .then (blob => {
		    return addBinContents (entry.filename, blob);
		});
	    }

	    // Return a promise to add text contents to the zip file.
	    function addTextContents(name, contents) {
		return zipWriter.add(name, new zip.TextReader(contents));
	    }

	    // Return a promise to add binary contents to the zip file.
	    function addBinContents(name, contents) {
		return zipWriter.add(name, new zip.BlobReader(contents));
	    }
	}
    }

    MMGR.webSaveMapProperties = webSaveMapProperties;
    function webSaveMapProperties(heatMap) {
	    const jsonData = JSON.stringify(heatMap.getMapConfig());
	    var success = "false";
	    var name = CFG.api + "SaveMapProperties?map=" + heatMap.mapName;
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

    MMGR.zipMapProperties = zipMapProperties;
    function zipMapProperties(heatMap, jsonData) {
	    var success = "";
	    var name = CFG.api + "ZippedMap?map=" + heatMap.mapName;
	    callServlet("POST", name, jsonData);
	    return true;
    }


// Matrix Manager block.
{
    var heatMap = null;
    var mapStatusDB = new WeakMap();

    const compat = { addMapConfig, addMapData };

    function getMapStatus (heatMap) {
	let status = mapStatusDB.get (heatMap);
	if (!status) {
	    status = {
		mapUpdatedOnLoad: false,
	        flickInitialized: false,
	    };
	    mapStatusDB.set (heatMap, status);
	}
	return status;
    }

    function addMapData(heatMap, md) {
	heatMap.mapData = md;
	if (COMPAT.mapDataCompatibility(heatMap.mapData)) {
	    const status = getMapStatus (heatMap);
	    status.mapUpdatedOnLoad = true;
	}
	heatMap.sendCallBack(MMGR.Event_JSON);
    }

    function addMapConfig(heatMap, mc) {
	if (COMPAT.CompatibilityManager(mc)) {
	    const status = getMapStatus (heatMap);
	    status.mapUpdatedOnLoad = true;
	}
	heatMap.mapConfig = mc;
	addDataLayers(heatMap);
	configureFlick(heatMap);
	heatMap.sendCallBack(MMGR.Event_JSON);
    }

    MMGR.mapUpdatedOnLoad = function(heatMap) {
	const status = getMapStatus (heatMap);
	return status.mapUpdatedOnLoad;
    };

    //Main function of the matrix manager - retrieve a heat map object.
    //mapFile parameter is only used for local file based heat maps.
    //This function is called from a number of places:
    //It is called from UIMGR.onLoadCHM when displaying a map in the NG-CHM Viewer and for embedded NG-CHM maps
    //It is called from displayFileModeCHM (in UIMGR) when displaying a map in the stand-alone NG-CHM Viewer
    //It is called in script in the mda_heatmap_viz.mako file when displaying a map in the Galaxy NG-CHM Viewer
    MMGR.createHeatMap = function createHeatMap (fileSrc, heatMapName, updateCallbacks, mapFile) {
	heatMap = new HeatMap(heatMapName, updateCallbacks, fileSrc, mapFile, compat);
    };

    // Return the current heat map.
    MMGR.getHeatMap = function getHeatMap() {
	return heatMap;
    };

    /*
     * Set the 'flick' control and data layer
    */
    function configureFlick (heatMap) {
	const status = getMapStatus (heatMap);
	if (!status.flickInitialized) {
	    const dl = heatMap.getDataLayers();
	    const numLayers = Object.keys(dl).length;
	    if (numLayers > 1) {
		const dls = new Array(numLayers);
		const orderedKeys = new Array(numLayers);
		for (let key in dl){
		    const dlNext = +key.substring(2, key.length); // Requires data layer ids to be dl1, dl2, etc.
		    orderedKeys[dlNext-1] = key;
		    let displayName = dl[key].name;
		    if (displayName.length > 20) {
			displayName = displayName.substring(0,17) + "...";
		    }
		    dls[dlNext-1] = '<option value="'+key+'">'+displayName+'</option>';
		}
		const panelConfig = heatMap.getPanelConfiguration();
		const flickInfo = panelConfig && panelConfig.flickInfo ? panelConfig.flickInfo : {};
		const layer = FLICK.enableFlicks (orderedKeys, dls.join(""), flickInfo);
		heatMap.setCurrentDL(layer);
	    } else {
		    heatMap.setCurrentDL("dl1");
		    FLICK.disableFlicks();
	    }
	    status.flickInitialized = true;
	}
    }

}

    // Configure elements of the page header and top bar that depend on the
    // loaded NGCHM.
    function configurePageHeader(heatMap) {
	    // Set document title if not a local file.
	    if (heatMap.source() !== MMGR.LOCAL_SOURCE) {
		    document.title = heatMap.getMapInformation().name;
	    }

	    // Populate the header's nameDiv.
	    const nameDiv = document.getElementById("mapName");
	    nameDiv.innerHTML = heatMap.getMapInformation().name;
    }

/**********************************************************************************
 * Perform Early Initializations.
 *
 * Perform latency sensitive initializations.  Note that the complete sources
 * have not loaded yet.
 **********************************************************************************/

if (MMGR.embeddedMapName === null && (UTIL.mapId !== '' || UTIL.mapNameRef !== '')) {
	MMGR.createWebLoader(MMGR.WEB_SOURCE);
}

// Special tooltip with content populated from the loaded heat map.
document.getElementById('mapName').addEventListener('mouseover', (ev) => {
    const heatMap = MMGR.getHeatMap();
    UHM.hlp(ev.target,"Map Name: " + (heatMap !== null ? heatMap.getMapInformation().name : "Not yet available") + "<br><br>Description: " + (heatMap !== null ? heatMap.getMapInformation().description : "N/A"),350);
}, { passive: true });

})();
