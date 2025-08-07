(function () {
  "use strict";
  NgChm.markFile();

  // MatrixManager is responsible for retrieving clustered heat maps.
  //

  // Once the maps have been loaded,
  // - MMGR.getAllHeatMaps() returns all maps.
  // - MMGR.getHeatMap() returns the current map.

  // Define Namespace for NgChm MatrixManager
  const MMGR = NgChm.createNS("NgChm.MMGR");

  const UTIL = NgChm.importNS("NgChm.UTIL");
  const HEAT = NgChm.importNS("NgChm.HEAT");

  const UHM = NgChm.importNS("NgChm.UHM");
  const COMPAT = NgChm.importNS("NgChm.CM");

  const debugMMGR = UTIL.getDebugFlag("mmgr");
  const debugWorker = UTIL.getDebugFlag("mmgr-worker");

  // NG-CHMs can be loaded from the following types of sources:
  //
  MMGR.API_SOURCE = "api"; // NG-CHM can be accessed via API (e.g. shaidy server).
  MMGR.WEB_SOURCE = "web"; // NG-CHM can be accessed in a web folder.
  MMGR.ZIP_SOURCE = "zip"; // NG-CHM is stored in a zip archive.

  // The loader we are using to access all NG-CHMs. It will be created and
  // initialized when we know the type of the source.
  var ngchmLoader = null;

  MMGR.getSource = function getSource() {
    if (!ngchmLoader) {
      throw `trying to get NG-CHM source before it has been determined`;
    }
    return ngchmLoader.fileSrc;
  };

  // Send request to a server (not necessarily the API server).
  MMGR.callServlet = callServlet;
  function callServlet(verb, url, data) {
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
    form.style.display = "none";
    document.body.appendChild(form);
    form.submit();
  }

  // For both API_SOURCE and WEB_SOURCE, we will create a Worker process to overlap I/O and computation.
  function WebLoader () {
    this.worker = null;
    this.mapsInitialized = 0;
  }

  // Return the API endpoint for NG-CHMs loaded from an API endpoint.
  MMGR.getApi = function () {
    if (!ngchmLoader) {
      throw `cannot get API before ngchmLoader defined`;
    }
    if (ngchmLoader.fileSrc != MMGR.API_SOURCE) {
      throw `cannot get API for source type ${ngchmLoader.fileSrc}`;
    }
    return ngchmLoader.baseURL;
  };

  // Create a worker thread to request/receive json data and tiles.  Using a separate
  // thread allows large I/O to overlap extended periods of heavy computation.
  //
  // srcInfo.fileSrc determines the type of URLs used to load data/tiles.
  // API_SOURCE:
  // - The baseURL is srcInfo.options.api, which may be absolute or relative to document.location.origin.
  // - Tile URLs look like "${baseURL}/GetTile?map=" + mapId + "&datalayer=" + job.layer + "&level=" + job.level + "&tile=" + job.tileName
  // - JSON URLS look like "${baseURL}/GetDescriptor?map=" + mapId + "&type=" + name
  // - API servers can also be used to lookup NG-CHMs by name
  // WEB_SOURCE:
  // - spec can be a comma-separated list of mapIds
  // - For each NG-CHM, the baseURL is srcInfo.options.repository + "/"
  // - Tile URLs look like "${baseURL}/" + mapId + "/" + job.layer + "/" + job.level + "/" + job.tileName+".tile"'
  //   - (A very long time ago, tiles had .bin extensions. When we discoved many ngchm files were being blocked by
  //     security scanners because of this, the extension was changed to .tile. If you look inside a very old ngchm file,
  //     you might find tiles named .bin.  You will have to rename all such files from <x>.bin to <x>.tile.
  // - JSON URLS look like "${baseURL}/" + name + ".json"
  //
  // ngChmsLoaded is a function that will be called when all requested NG-CHMs have loaded.
  // updateCallbacks is an array of callbacks that will be passed to every heatmap created by
  // the loader.
  WebLoader.prototype.createWorker = function createWorker (srcInfo, updateCallbacks, ngChmsLoaded) {
    const fileSrc = srcInfo.fileSrc;
    this.baseURL = getLoaderBaseURL(fileSrc);
    this.fileSrc = fileSrc;
    this.updateCallbacks = updateCallbacks;
    this.ngChmsLoaded = ngChmsLoaded;

    // Define worker script.
    // (it was seen to cause problems to include "use strict" in wS [code string passed to web worker])
    let wS = `const debug = ${debugWorker};`;
    wS += `const maxActiveRequests = 2;`; // Maximum number of tile requests that can be in flight concurrently
    wS += `var active = 0;`; // Number of tile requests in flight
    wS += `const pending = [];`; // Additional tile requests
    wS += `const baseURL = "${this.baseURL}";`; // Base URL to prepend to requests.
    if (fileSrc == MMGR.API_SOURCE) {
      wS += `const nameLookupURL = "${this.baseURL}/GetMapByName/";`;
    }

    // Create a function that determines the get tile request.
    // Body of function depends on fileSrc.
    wS += "function tileURL(job){return baseURL+";
    if (fileSrc === MMGR.API_SOURCE) {
      wS +=
        '"GetTile?map=" + job.mapId + "&datalayer=" + job.layer + "&level=" + job.level + "&tile=" + job.tileName';
    } else {
      wS += 'job.mapId+"/"+job.layer+"/"+job.level+"/"+job.tileName+".tile"';
    }
    wS += ";}";

    // The following function is stringified and sent to the web loader.
    function loadTile(job) {
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
            loadTile(pending.shift());
          }
          if (req.status != 200) {
            postMessage({ op: "tileLoadFailed", mapId: job.mapId, job });
          } else {
            // Transfer buffer to main thread.
            postMessage({ op: "tileLoaded", mapId: job.mapId, job, buffer: req.response }, [
              req.response,
            ]);
          }
        }
      };
      req.send();
    }
    wS += loadTile.toString();

    // Create a function that determines the get JSON file request.
    // Body of function depends on the fileSrc of the NG-CHM.
    wS += "function jsonFileURL(name, mapId){return baseURL+";
    if (fileSrc === MMGR.API_SOURCE) {
      wS += '"GetDescriptor?map=" + mapId + "&type=" + name';
    } else {
      wS += 'mapId+"/"+name+".json"';
    }
    wS += ";}";

    // The following function is stringified and sent to the web loader.
    function loadJson(name, mapId, mapName) {
      const req = new XMLHttpRequest();
      req.open("GET", jsonFileURL(name, mapId), true);
      req.responseType = "json";
      req.onreadystatechange = function () {
        if (req.readyState == req.DONE) {
          if (req.status != 200) {
            postMessage({ op: "jsonLoadFailed", mapName, mapId, name });
          } else {
            // Send json to main thread.
            postMessage({ op: "jsonLoaded", mapName, mapId, name, json: req.response });
          }
        }
      };
      req.send();
    }
    wS += loadJson.toString();

    // This function will be stringified and sent to the web loader.
    function handleMessage(e) {
      if (debug)
        console.log({ m: "Worker: got message", e, t: performance.now() });
      if (e.data.op === "loadTile") {
        loadTile(e.data.job);
      } else if (e.data.op === "loadMapById") {
        getConfigAndData(e.data.mapId, "");
      } else if (e.data.op === "loadMapByName") {
        getMapId(e.data.mapName);
      } else {
        console.error ("WebWorker: Unknown message received", { message: e.data });
      }
    }
    wS += handleMessage.toString();

    // This function will be stringified and sent to the web loader.
    function getConfigAndData(mapId, mapName) {
      // Retrieve all map configuration data.
      loadJson("mapConfig", mapId, mapName);
      // Retrieve all map supporting data (e.g. labels, dendros) from JSON.
      loadJson("mapData", mapId, mapName);
    }
    wS += getConfigAndData.toString();

    // If the map was specified by name, send the code to find the
    // map's id by name.  Otherwise just get the map's config
    // and data.
    function getMapId(mapName) {
      const url = nameLookupURL + mapName;
      fetch(url).then((res) => {
        if (res.status === 200) {
          res.json().then((mapinfo) => {
            mapId = mapinfo.data.id;
            getConfigAndData(mapId, mapName);
          });
        } else {
          postMessage({ op: "jsonLoadFailed", name: "GetMapByName", mapName });
        }
      });
    }
    if (fileSrc == MMGR.API_SOURCE) {
      wS += getMapId.toString();
    }

    wS += `onmessage = ${handleMessage.name};`;
    if (debugWorker)
      wS += `console.log ({ m:'TileLoader loaded', t: performance.now() });`;

    // Create blob and start worker.
    const blob = new Blob([wS], { type: "application/javascript" });
    if (debugWorker) console.log({ m: "WebLoader.createWorker", blob, wS });
    this.worker = new Worker(URL.createObjectURL(blob));
    // It is possible for the web worker to post a reply to the main thread
    // before the message handler is defined.  Stash any such messages away
    // and play them back once it has been.
    {
      const thisLoader = this;
      const pendingMessages = [];

      // Create a temporary message handler that will buffer messages until the
      // application can set the actual message handler (via setMessageHandler).
      thisLoader.worker.onmessage = function (e) {
        if (debugWorker) {
          console.log ('Saving pending message', { data: e.data });
        }
        if (e.data.op === "jsonLoaded" && e.data.name == "mapConfig") {
          if (debugWorker) {
            console.log ('Peeking at mapConfig', { data: e.data });
          }
          // Currently need this to create the first HeatMap, which will
          // initialize the broader environment, which will then initiate
          // creation of the full message handler.  Not ideal.
          thisLoader.getHeatMap (e.data);
        }
        pendingMessages.push(e);
      };

      // Define an instance method for setting the message handler. The instance
      // method has access to pendingMessages, which is not otherwise accessible.
      //
      // When the specified messageHandler is set, it is first called with each of
      // the messages in pendingMessages, so that all messages are processed in
      // order of receipt.
      thisLoader.setMessageHandler = function (mh) {
        // Run asychronously so that the heatmap can be defined before processing messages.
        setTimeout(function () {
          while (pendingMessages.length > 0) {
            mh(pendingMessages.shift());
          }
          thisLoader.worker.onmessage = mh;
        }, 0);
      };
    }

    // Called locally.
    function getLoaderBaseURL() {
        // Because a tile worker thread doesn't share our origin, we have to pass it
        // an absolute URL, and to substitute in the srcInfo.options.api variable, we want to
        // build the URL using the same logic as a browser for relative vs. absolute
        // paths.
      let URL = document.location.origin;
      const api = srcInfo.options.repository;
      if (api.substring(0,4) == "http") {
        if (!UTIL.isValidURL(api)) {
          throw `badly formed URL ${api}`;
        }
        URL = api;
      } else {
        if (api[0] !== "/") {
          // Convert a path relative to the document location to an absolute path
          // on the same server.
          URL +=
            "/" +
            window.location.pathname.substring(
              1,
              window.location.pathname.lastIndexOf("/")+1,
            );
        }
        URL += api;
      }
      // Ensure URL is terminated by a slash.
      if (URL[URL.length-1] != "/") {
        URL += "/";
      }
      return URL;
    }
    this.connectMessageHandler();
  };

  WebLoader.prototype.openMapsById = function (ids) {
    for (const mapId of ids) {
      this.worker.postMessage({ op: "loadMapById", mapId });
    }
  };
  WebLoader.prototype.openMapsByName = function (names) {
    for (const mapName of names) {
      this.worker.postMessage({ op: "loadMapByName", mapName });
    }
  };

  const heatMapCache = new Map();
  WebLoader.prototype.getHeatMap = function getHeatMap (msgData) {
    let map;
    if (heatMapCache.has(msgData.mapId)) {
      map = heatMapCache.get(msgData.mapId);
    } else {
      map = new HEAT.HeatMap(
        msgData.mapName,  // Speculative.
        this.updateCallbacks,
        this.getTileLoaderGetter(msgData.mapId),
        () => this.noteInitialized(),
      );
      // Save loadSpec details in case we can and want to save it later.
      map.loadSpec = { mapId: msgData.mapId, mapName: msgData.mapName };
      heatMapCache.set(msgData.mapId, map);
    }
    if (msgData.op == "jsonLoaded" && msgData.name == "mapConfig") {
      map.mapName = msgData.json.data_configuration.map_information.name;
    }
    return map;
  };

  // Returns a function that
  // - takes a HeatMap as a parameter, and
  // - returns a function that will load a tile
  //   for that HeatMap.
  //
  // In this case, the mapId is not known to the
  // HeatMap, so we have an extra level of
  // encapsulation and the HeatMap parameter is
  // not used.
  //
  WebLoader.prototype.getTileLoaderGetter = function getTileLoaderGetter (mapId) {
    const worker = this.worker;
    return function getTileLoader (heatMap) {
      return function loadTile (job) {
        if (debugWorker) {
          console.log ("loadTile " + mapId, { job });
        }
        // Inject the mapId into the job.
        job.mapId = mapId;
        worker.postMessage({ op: "loadTile", job });
      };
    };
  };

  WebLoader.prototype.noteInitialized = function () {
    this.mapsInitialized++;
    if (debugWorker) {
      console.log (`WebLoader: ${this.mapsInitialized}/${this.mapCount} maps initialized`);
    }
    if (this.mapsInitialized == this.mapCount) {
      this.ngChmsLoaded.call(null, [...heatMapCache.values()]);
    }
  };

  // Handle replies from tileio worker.
  WebLoader.prototype.connectMessageHandler = function connectMessageHandler() {
    if (debugWorker) console.log("Connecting worker message handler");
    const theLoader= this;
    this.setMessageHandler(function (e) {
      if (debugWorker) console.log("Received message from WebLoader: " + e.data.op, { data: e.data });
      if (!e.data.mapId) {
        console.warn ('webworker message does not have expected heatmap id');
      }
      if (!e.data.mapName && !["tileLoaded","tileLoadFailed"].includes(e.data.op)) {
        console.warn ('webworker message does not have expected heatmap name');
      }
      const heatMap = theLoader.getHeatMap (e.data);
      if (e.data.op === "tileLoaded") {
        const tiledata = new Float32Array(e.data.buffer);
        heatMap.tileRequestComplete(e.data.job.tileCacheName, tiledata);
      } else if (e.data.op === "tileLoadFailed") {
        heatMap.tileRequestComplete(e.data.job.tileCacheName, null);
      } else if (e.data.op === "jsonLoaded") {
        heatMap.addJson (e.data.name, e.data.json);
      } else if (e.data.op === "jsonLoadFailed") {
        console.error(
          `Failed to get JSON file ${e.data.name} for ${e.data.mapName} (${heatMap.mapName}) from server`,
        );
        UHM.mapNotFound(heatMap.mapName);
      } else {
        console.error("connectWebLoader: unknown op", { data: e.data });
      }
    });
  };

  // Create
  // Determine whether srcInfo specifies that the NG-CHM(s) will be loaded from the
  // network.
  //
  // If not, the function returns false and no further actions are taken.
  // - Determine
  //
  // Otherwise:
  // - A web worker is created.
  // - Loading of the map(s)' configuration and data is initiated.
  // - The function returns true.
  //
  WebLoader.prototype.loadWebMaps =
  function loadWebMaps (srcInfo, updateCallbacks, mapsReady) {
    if (debugMMGR || debugWorker) {
      console.log ("Loading web maps", { srcInfo });
    }
    let reason = 'Trying to load web maps but ';
    // - Embedded && sourceType == WEB_SOURCE.
    // - Not embedded && either ?map or ?name options specified.
    if (srcInfo.embedded) {
      if (srcInfo.options.sourceType == MMGR.WEB_SOURCE) {
        srcInfo.fileSrc = MMGR.WEB_SOURCE;
        srcInfo.mapIds = srcInfo.spec.split(',');
        srcInfo.mapNames = [];
        ngchmLoader.createWorker(srcInfo, updateCallbacks, mapsReady);
        ngchmLoader.mapCount = srcInfo.mapIds.length;
        ngchmLoader.openMapsById (srcInfo.mapIds);
        return;
      } else {
        reason += `sourceType ${srcInfo.options.sourceType} is not an option for embedded maps.`;
      }
    }
    else if (srcInfo.mapIds.length + srcInfo.mapNames.length > 0) {
      srcInfo.fileSrc = srcInfo.options.sourceType == MMGR.API_SOURCE ? MMGR.API_SOURCE : MMGR.WEB_SOURCE;
      ngchmLoader.mapCount = srcInfo.mapIds.length + srcInfo.mapNames.length;
      ngchmLoader.createWorker(srcInfo, updateCallbacks, mapsReady);
      if (srcInfo.mapIds.length > 0) {
        ngchmLoader.openMapsById (srcInfo.mapIds);
      }
      if (srcInfo.mapNames.length > 0) {
        ngchmLoader.openMapsByName (srcInfo.mapNames);
      }
      return;
    } else {
      reason += `no mapIds or mapNames were specified`;
    }
    UHM.mapLoadError("", reason);
  }

  // Save an NG-CHM loaded from a zip file.
  //
  // heatMap is current heatMap.
  // mapConfig is mapConfig of current map with current state.
  MMGR.zipSaveMapProperties = zipSaveMapProperties;
  function zipSaveMapProperties(heatMap, mapConf, progressMeter) {
    // Start the zip file creation process by instantiating a
    // zipWriter.
    return new Promise((resolve, reject) => {
      resolve(new zip.ZipWriter(new zip.BlobWriter()));
    })
      .then((zipWriter) => addAllZipEntries(zipWriter))
      .then((zipWriter) => {
        // Convert zipWriter contents into a blob.
        return zipWriter.close();
      })
      .then((blob) => {
        saveAs(blob, heatMap.mapName + ".ngchm");
        return true;
      })
      .catch((error) => {
        if (error != "Cancelled by user") {
          const msgBox = UHM.newMessageBox("error-saving-ngchm");
          msgBox.style.width = "20em";
          UHM.setNewMessageBoxHeader(msgBox, "Failed to save NG-CHM");
          const txtBox = UHM.getNewMessageTextBox(msgBox);
          txtBox.innerHTML =
            "<P><B>The NG-CHM was not saved.</B></P><P>The following error details were recorded:</P><P><B>" +
            error +
            "</B></P>";
          UHM.setNewMessageBoxButton(msgBox, "close", {
            type: "text",
            text: "Close",
            tooltip: "Closes this dialog",
            default: true,
          });
          UHM.displayNewMessageBox(msgBox);
        }
        return false;
      });

    // Returns a promise to add all the entries in heatMap.zipFiles
    // to the zipWriter.
    function addAllZipEntries(zipWriter) {
      return new Promise((resolve, reject) => {
        const zipKeys = Object.keys(ngchmLoader.zipFiles);

        // Add the first entry in zipFiles.  It will add
        // the next entry when it completes and so on,
        // until all have been added.
        addEntry(0);

        // Add the next entry from zipKeys.
        // Resolve the promise when done.
        function addEntry(fileIndex) {
          // Update the progressMeter.
          const progress = (1 + fileIndex) / (1 + zipKeys.length);
          if (progressMeter) {
            const keepGoing = progressMeter(progress);
            if (!keepGoing) {
              reject("Cancelled by user");
            }
          }

          if (fileIndex == zipKeys.length) {
            resolve(zipWriter); /* No more files to add: resolve promise */
          } else {
            // Get a promise to add the zip entry depending on its type.
            const keyVal = zipKeys[fileIndex];
            const entry = ngchmLoader.zipFiles[keyVal];
            let promise;
            if (keyVal.indexOf("bin") >= 0 || keyVal.indexOf("tile") >= 0) {
              // Directly add all binary zip entries directly to the new zip file
              promise = zipCopyBin(entry);
            } else if (keyVal.indexOf("/mapConfig.json") > 0) {
              const mapName = keyVal.substring(0, keyVal.indexOf("/mapConfig.json"));
              const map = getHeatMapByName (mapName);
              // Add the modified config data.
              promise = addTextContents(
                entry.filename,
                JSON.stringify(heatMap == map ? (mapConf || heatMap.mapConfig) : map.mapConfig),
              );
            } else if (keyVal.indexOf("/mapData.json") >= 0) {
              // Add the potentially modified data.
              const mapName = keyVal.substring(0, keyVal.indexOf("/mapData.json"));
              const map = getHeatMapByName (mapName);
              promise = addTextContents(
                entry.filename,
                JSON.stringify(map.mapData),
              );
            } else {
              // Directly add all other text zip entries to the new zip file.
              promise = zipCopyText(entry);
            }
            // When the promise resolves, advance to the next entry.
            promise.then(() => addEntry(fileIndex + 1));
          }
        }
      });

      function getHeatMapByName (name) {
        for (const heatMap of MMGR.getAllHeatMaps()) {
          const info = heatMap.getMapInformation();
          if (info.name == name) {
            return heatMap;
          }
        }
        return null;
      }

      // Return a promise to copy the text zip entry
      // to the new zip file.
      function zipCopyText(entry) {
        return entry.getData(new zip.TextWriter()).then((text) => {
          return addTextContents(entry.filename, text);
        });
      }

      // Return a promise to copy a binary zip entry
      // to the new zip file.
      function zipCopyBin(entry) {
        return entry.getData(new zip.BlobWriter()).then((blob) => {
          return addBinContents(entry.filename, blob);
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
    var name = MMGR.getApi() + "SaveMapProperties?map=" + heatMap.mapName;
    var req = new XMLHttpRequest();
    req.open("POST", name, false);
    req.setRequestHeader("Content-Type", "application/json");
    req.onreadystatechange = function () {
      if (req.readyState == req.DONE) {
        if (req.status != 200) {
          console.log(
            "Failed in call to save properties from server: " + req.status,
          );
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
    const url = MMGR.getApi() + "ZippedMap?map=" + heatMap.loadSpec.mapId;
    callServlet("POST", url, jsonData);
    return true;
  }

  // CLASS ZipFileLoader.
  //
  function ZipFileLoader() {
    this.fileSrc = MMGR.ZIP_SOURCE;
    this.mapNames = [];
    this.zipFiles = {};
  }

  // Load the NG-CHMs contained in an open zip file.
  //
  // - Adds an entry for each file in the zip file to zipFiles.
  // - Determines all the top-level directories in zipFiles.
  // - Determines which directories contain an NG-CHM.
  // - Initiates loading of those NG-CHMs.
  // - Returns.
  //
  // - Later, when all the maps have been initialized, an array
  //   containing the loaded maps is passed to ngChmsLoaded().
  //
  ZipFileLoader.prototype.readZipFile = async function readZipFile (chmFile, updateCallbacks, ngChmsLoaded) {
    if (chmFile.size === 0) {
      UHM.mapLoadError(chmFile.name, "File is empty (zero bytes)");
      return;
    }
    const reader = new zip.ZipReader(new zip.BlobReader(chmFile));
    const loader = this;
    // get all entries from the zip
    return reader
      .getEntries()
      .then(function (entries) {
        //Inspect the first entry path to grab the true heatMapName.
        //The user may have renamed the zip file OR it was downloaded
        //as a second+ generation of a file by the same name (e.g. with a " (1)"
        //in the name).
        if (entries.length == 0) {
          throw "Empty zip file";
        }
        const dirs = [];
        for (let i = 0; i < entries.length; i++) {
          // Save entry to zipFiles.
          const entryName = entries[i].filename;
          loader.zipFiles[entryName] = entries[i];
          // Collect all top-level directory names.
          const slashIdx = entryName.indexOf("/");
          if (slashIdx > 0) {
            const dirName = entryName.substring(0,slashIdx);
            if (!dirs.includes(dirName)) {
              dirs.push (dirName);
            }
          }
        }
        // Determine which directories contain an NGCHM.
        for (const dir of dirs) {
          const mapConfigName = dir + "/mapConfig.json";
          if (mapConfigName in loader.zipFiles) {
            loader.mapNames.push (dir);
          }
        }
        // If none do, it's not an ngchm file.
        if (loader.mapNames.length == 0) {
          throw "File format not recognized";
        }
        // Create the heatmaps.
        loader.createHeatMaps(updateCallbacks, ngChmsLoaded);
      })
      .catch(function (error) {
        console.error ("Error opening zip file: " + error);
        UHM.mapLoadError(chmFile.name, error);
      });
  };

  // Create the heat maps that were found in the zip file.
  // - Keeps track of the created maps and how many have been
  //   initialized.
  // - When all maps have been initialized, passes the array of
  //   maps to ngChmsLoaded.
  ZipFileLoader.prototype.createHeatMaps =
    function createHeatMaps(updateCallbacks, ngChmsLoaded) {
      // zipFile might contain multiple maps.
      const numMaps = this.mapNames.length;
      const maps = [];
      let numInitialized = 0;
      // Maps will initialize asynchronously.
      for (const heatMapName of this.mapNames) {
        maps.push (new HEAT.HeatMap(
          heatMapName,
          updateCallbacks,
          this.getTileLoaderGetter(),
          noteInitialized
        ));
      }
      // Helper function.
      function noteInitialized () {
        numInitialized++;
        if (numInitialized == numMaps) {
          // All maps initialized.
          ngChmsLoaded(maps);
        }
      }
    };

  // Initiates loading of the heatMap's configuration files from the zip file.
  ZipFileLoader.prototype.loadConfigFiles = function loadNgChmFromZip(heatMap) {
    const mapConfigName = heatMap.mapName + "/mapConfig.json";
    const mapDataName = heatMap.mapName + "/mapData.json";
    if (mapConfigName in this.zipFiles && mapDataName in this.zipFiles) {
      setTimeout(() => { this.zipFetchJson(heatMap, "mapConfig"); });
      setTimeout(() => { this.zipFetchJson(heatMap, "mapData"); });
    } else {
      UHM.mapLoadError(heatMap.mapName, "Missing NG-CHM content");
    }
  };

  // Fetch a json file "${name}.json" for ${heatMap} from the zip file
  // and add it to the heatmap.
  ZipFileLoader.prototype.zipFetchJson = function zipFetchJson(heatMap, name) {
    const entry = this.zipFiles[`${heatMap.mapName}/${name}.json`];
    entry.getData(new zip.TextWriter(), {}).then((text) => {
      heatMap.addJson (name, JSON.parse(text));
    });
  };

  // Returns a function that
  // - takes a HeatMap as a parameter.
  // - initiates loading of the HeatMap's configuration files.
  // - returns a function for loading tiles for that HeatMap
  //   from the zip file.
  //
  ZipFileLoader.prototype.getTileLoaderGetter = function getTileLoaderGetter() {
    const loader = this;
    return function getTileLoader (heatMap) {
      loader.loadConfigFiles(heatMap);
      return function loadTile (job) {
        loader.fetchTile (heatMap, job);
      };
    };
  };

  // Read the tile specified by job from the HeatMap's zip file.
  //
  // Calls heatMap.tileRequestComplete when done.
  //
  ZipFileLoader.prototype.fetchTile = function zipFetchTile(heatMap, job) {
    const debug = false;
    const baseName =
      heatMap.mapName + "/" + job.layer + "/" + job.level + "/" + job.tileName;
    let entry = this.zipFiles[baseName + ".tile"];
    if (typeof entry === "undefined") {
      // Tiles in ancient NG-CHMs had a .bin extension.
      entry = this.zipFiles[baseName + ".bin"];
    }
    if (typeof entry === "undefined") {
      console.error("Request for unknown zip tile: " + baseName);
      heatMap.tileRequestComplete(job.tileCacheName, null);
    } else {
      setTimeout(function getEntryData() {
        entry
          .getData(new zip.BlobWriter())
          .then(function (blob) {
            if (debug) console.log("Got blob for tile " + job.tileCacheName);
            const fr = new FileReader();

            fr.onerror = function () {
              console.error("Error in zip file reader", fr.error);
              heatMap.tileRequestComplete(job.tileCacheName, null);
            };
            fr.onload = function (e) {
              const arrayBuffer = fr.result;
              const far32 = new Float32Array(arrayBuffer);
              heatMap.tileRequestComplete(job.tileCacheName, far32);
            };
            fr.readAsArrayBuffer(blob);
          })
          .catch((error) => {
            console.error("Error getting zip tile data", error);
          });
      }, 1);
    }
  };

  // Matrix Manager block.
  {
    var allHeatMaps = [];
    var heatMap = null;

    // Return the current heat map.
    MMGR.getHeatMap = function getHeatMap() {
      return heatMap;
    };

    // Return all heat maps.
    MMGR.getAllHeatMaps = function getAllHeatMaps() {
      return allHeatMaps;
    };

    // Return true iff any heatmap has unsaved changes.
    MMGR.hasUnsavedChanges = function () {
      for (const heatmap of allHeatMaps) {
        if (heatmap.getUnAppliedChanges()) {
          return true;
        }
      }
      return false;
    };

    // Return true iff any read-only heatmap has unsaved changes.
    MMGR.hasReadOnlyChanges = function () {
      for (const heatmap of allHeatMaps) {
        if (heatMap.isReadOnly() && heatmap.getUnAppliedChanges()) {
          return true;
        }
      }
      return false;
    };

    // Clear unsaved changes flag on all heat maps.
    MMGR.clearUnsavedChanges = function () {
      for (const heatmap of allHeatMaps) {
        heatmap.setUnAppliedChanges(false);
      }
    };

    // Return true if any heatmap was updated on load.
    MMGR.mapUpdatedOnLoad = function () {
      for (const heatmap of allHeatMaps) {
        if (heatmap.mapUpdatedOnLoad) {
          return true;
        }
      }
      return false;
    };

    // Initiates loading NG-CHM(s) from either a web or api source.
    // - srcInfo specifies source details.
    //
    // - When all maps have completed loading, ngChmsLoaded() is called.
    //
    MMGR.loadWebMaps = function loadWebMaps (srcInfo, updateCallbacks, ngChmsLoaded) {
      ngchmLoader = new WebLoader();
      ngchmLoader.loadWebMaps (srcInfo, updateCallbacks, saveMaps(ngChmsLoaded));
    };

    // Initiates loading NG-CHM(s) from an open zip file.
    // - mapFile is an open zip file.
    //
    // - When all maps have completed loading, ngChmsLoaded() is called.
    //
    MMGR.loadZipMaps = function loadZipMaps (mapFile, updateCallbacks, ngChmsLoaded) {
      ngchmLoader = new ZipFileLoader ();
      ngchmLoader.readZipFile (mapFile, updateCallbacks, saveMaps(ngChmsLoaded));
    };

    // Helper function.
    // Create an onMapsLoaded function that can be passed to
    // createWebWorker/loadZipMaps that:
    // - saves the loaded maps to allHeatMaps.
    // - picks the initial heatMap.
    // - calls the callback function to indicate that all maps have loaded.
    function saveMaps (callback) {
      return function onMapsLoaded (maps) {
        allHeatMaps = maps;
        heatMap = allHeatMaps[0];
        callback();
      };
    }

  }
})();
