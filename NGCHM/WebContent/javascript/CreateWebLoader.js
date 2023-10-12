(function() {
    'use strict';
    NgChm.markFile();

    const MMGR = NgChm.createNS('NgChm.MMGR');
    const CFG = NgChm.importNS('NgChm.CFG');
    const UTIL = NgChm.importNS('NgChm.UTIL');

//Create a worker thread to request/receive json data and tiles.  Using a separate
//thread allows the large I/O to overlap extended periods of heavy computation.
MMGR.createWebLoader = function (fileSrc) {

	const debug = false;
	const baseURL = getLoaderBaseURL (fileSrc);

	// Define worker script.
	// (it was seen to cause problems to include "use strict" in wS [code string passed to web worker])
let	wS = `const debug = ${debug};`;
	wS += `const maxActiveRequests = 2;`; // Maximum number of tile requests that can be in flight concurrently
	wS += `var active = 0;`;              // Number of tile requests in flight
	wS += `const pending = [];`;          // Additional tile requests
	wS += `const baseURL = "${baseURL}";`; // Base URL to prepend to requests.
	wS += `var mapId = "${UTIL.mapId}";`; // Map ID.
	wS += `const mapNameRef = "${UTIL.mapNameRef}";`; // Map name (if specified).

	// Create a function that determines the get tile request.
	// Body of function depends on the fileSrc of the NG-CHM.
	wS += 'function tileURL(job){return baseURL+';
	if (fileSrc === MMGR.WEB_SOURCE) {
		wS += '"GetTile?map=" + mapId + "&datalayer=" + job.layer + "&level=" + job.level + "&tile=" + job.tileName';
	} else {
		// [bmb] Is LOCAL_SOURCE ever used?  ".bin" files were obsoleted years ago.
		wS += 'job.layer+"/"+job.level+"/"+job.tileName+".bin"';
	}
	wS += ";}";

	// The following function is stringified and sent to the web loader.
	function loadTile (job) {
		if (active === maxActiveRequests) {
			pending.push(job);
			return;
		}
		active++;
		const req = new XMLHttpRequest();
		req.open("GET", tileURL(job), true);
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

	// Create a function that determines the get JSON file request.
	// Body of function depends on the fileSrc of the NG-CHM.
	wS += 'function jsonFileURL(name){return baseURL+';
	if (fileSrc === MMGR.WEB_SOURCE) {
		wS += '"GetDescriptor?map=" + mapId + "&type=" + name';
	} else {
		wS += 'name+".json"';
	}
	wS += ";}";

	// The following function is stringified and sent to the web loader.
	function loadJson (name) {
		const req = new XMLHttpRequest();
		req.open("GET", jsonFileURL(name), true);
		req.responseType = "json";
		req.onreadystatechange = function () {
			if (req.readyState == req.DONE) {
				if (req.status != 200) {
					postMessage({ op: 'jsonLoadFailed', name });
				} else {
					// Send json to main thread.
					postMessage({ op:'jsonLoaded', name, json: req.response });
				}
			}
		};
		req.send();
	};
	wS += loadJson.toString();

	// This function will be stringified and sent to the web loader.
	function handleMessage(e) {
		if (debug) console.log({ m: 'Worker: got message', e, t: performance.now() });
		if (e.data.op === 'loadTile') { loadTile (e.data.job); }
		else if (e.data.op === 'loadJSON') { loadJson (e.data.name); }
	}
	wS += handleMessage.toString();

	// This function will be stringified and sent to the web loader.
	function getConfigAndData() {
		// Retrieve all map configuration data.
		loadJson('mapConfig');
		// Retrieve all map supporting data (e.g. labels, dendros) from JSON.
		loadJson('mapData');
	}
	wS += getConfigAndData.toString();

	// If the map was specified by name, send the code to find the
	// map's id by name.  Otherwise just get the map's config
	// and data.
	if (UTIL.mapId === '' && UTIL.mapNameRef !== '') {
		function getMapId () {
			fetch (baseURL + "GetMapByName/" + mapNameRef)
			.then (res => {
				if (res.status === 200) {
					res.json().then (mapinfo => {
						mapId = mapinfo.data.id;
						getConfigAndData();
					});
				} else {
					postMessage({ op: 'jsonLoadFailed', name: 'GetMapByName' });
				}
			});
		}
		wS += getMapId.toString();
		wS += getMapId.name + '();';
	} else {
		wS += getConfigAndData.name + '();';
	}

	wS += `onmessage = ${handleMessage.name};`;
	if (debug) wS += `console.log ({ m:'TileLoader loaded', t: performance.now() });`;

	// Create blob and start worker.
	const blob = new Blob([wS], {type: 'application/javascript'});
	if (debug) console.log({ m: 'MMGR.createWebLoader', blob, wS });
	MMGR.webLoader = new Worker(URL.createObjectURL(blob));
	// It is possible for the web worker to post a reply to the main thread
	// before the message handler is defined.  Stash any such messages away
	// and play them back once it has been.
	const pendingMessages = [];
	MMGR.webLoader.onmessage = function(e) {
		pendingMessages.push(e);
	};
	MMGR.webLoader.setMessageHandler = function (mh) {
		// Run asychronously so that the heatmap can be defined before processing messages.
		setTimeout(function() {
		    while (pendingMessages.length > 0) {
			    mh (pendingMessages.shift());
		    }
		    MMGR.webLoader.onmessage = mh;
		}, 0);
	};

	// Called locally.
	function getLoaderBaseURL (fileSrc) {
		var URL;
		if (fileSrc == MMGR.WEB_SOURCE) {
			// Because a tile worker thread doesn't share our origin, we have to pass it
			// an absolute URL, and to substitute in the CFG.api variable, we want to
			// build the URL using the same logic as a browser for relative vs. absolute
			// paths.
			URL = document.location.origin;
			if (CFG.api[0] !== '/') {	// absolute
				URL += '/' + window.location.pathname.substr(1, window.location.pathname.lastIndexOf('/'));
			}
			URL += CFG.api;
		} else {
			console.log (`getLoaderBaseURL: fileSrc==${fileSrc}`);
			URL = MMGR.localRepository+"/"+MMGR.embeddedMapName+"/";
		}
		return URL;
	}
};

})();
