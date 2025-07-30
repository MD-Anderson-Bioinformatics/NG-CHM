(function () {
  "use strict";
  NgChm.markFile();

  // MatrixManager is responsible for retrieving clustered heat maps.
  //
  // NG-CHMs can be loaded from either:
  // - the network, or
  // - an ngchm (zip) file.
  //
  // Once the maps have been loaded,
  // - MMGR.getAllHeatMaps() returns all maps.
  // - MMGR.getHeatMap() returns the current map.

  // Define Namespace for NgChm MatrixManager
  const MMGR = NgChm.createNS("NgChm.MMGR");

  const UTIL = NgChm.importNS("NgChm.UTIL");
  const FLICK = NgChm.importNS("NgChm.FLICK");
  const HEAT = NgChm.importNS("NgChm.HEAT");
  const CFG = NgChm.importNS("NgChm.CFG");

  const UHM = NgChm.importNS("NgChm.UHM");
  const COMPAT = NgChm.importNS("NgChm.CM");

  //For web-based NGCHMs, we will create a Worker process to overlap I/O and computation.
  MMGR.webLoader = null;

  MMGR.WEB_SOURCE = "W";
  MMGR.LOCAL_SOURCE = "L";
  MMGR.FILE_SOURCE = "F";

  MMGR.embeddedMapName = null;
  MMGR.localRepository = "/NGCHM";

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

  //Create a worker thread to request/receive json data and tiles.  Using a separate
  //thread allows the large I/O to overlap extended periods of heavy computation.
  function createWebLoader (fileSrc) {
    const debug = false;
    const baseURL = getLoaderBaseURL(fileSrc);

    var nameLookupURL = undefined;
    if (UTIL.mapNameRef !== "") {
      nameLookupURL = baseURL + "GetMapByName/" + UTIL.mapNameRef;
    }

    // Define worker script.
    // (it was seen to cause problems to include "use strict" in wS [code string passed to web worker])
    let wS = `const debug = ${debug};`;
    wS += `const maxActiveRequests = 2;`; // Maximum number of tile requests that can be in flight concurrently
    wS += `var active = 0;`; // Number of tile requests in flight
    wS += `const pending = [];`; // Additional tile requests
    wS += `const baseURL = "${baseURL}";`; // Base URL to prepend to requests.
    wS += `var mapId = "${UTIL.mapId}";`; // Map ID.
    //wS += `const mapNameRef = "${UTIL.mapNameRef}";`; // Map name (if specified).
    wS += `const nameLookupURL = "${nameLookupURL}";`;

    // Create a function that determines the get tile request.
    // Body of function depends on the fileSrc of the NG-CHM.
    wS += "function tileURL(job){return baseURL+";
    if (fileSrc === MMGR.WEB_SOURCE) {
      wS +=
        '"GetTile?map=" + mapId + "&datalayer=" + job.layer + "&level=" + job.level + "&tile=" + job.tileName';
    } else {
      // [bmb] Is LOCAL_SOURCE ever used?  ".bin" files were obsoleted years ago.
      wS += 'job.layer+"/"+job.level+"/"+job.tileName+".bin"';
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
            postMessage({ op: "tileLoadFailed", job });
          } else {
            // Transfer buffer to main thread.
            postMessage({ op: "tileLoaded", job, buffer: req.response }, [
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
    wS += "function jsonFileURL(name){return baseURL+";
    if (fileSrc === MMGR.WEB_SOURCE) {
      wS += '"GetDescriptor?map=" + mapId + "&type=" + name';
    } else {
      wS += 'name+".json"';
    }
    wS += ";}";

    // The following function is stringified and sent to the web loader.
    function loadJson(name) {
      const req = new XMLHttpRequest();
      req.open("GET", jsonFileURL(name), true);
      req.responseType = "json";
      req.onreadystatechange = function () {
        if (req.readyState == req.DONE) {
          if (req.status != 200) {
            postMessage({ op: "jsonLoadFailed", name });
          } else {
            // Send json to main thread.
            postMessage({ op: "jsonLoaded", name, json: req.response });
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
      } else if (e.data.op === "loadJSON") {
        loadJson(e.data.name);
      }
    }
    wS += handleMessage.toString();

    // This function will be stringified and sent to the web loader.
    function getConfigAndData() {
      // Retrieve all map configuration data.
      loadJson("mapConfig");
      // Retrieve all map supporting data (e.g. labels, dendros) from JSON.
      loadJson("mapData");
    }
    wS += getConfigAndData.toString();

    // If the map was specified by name, send the code to find the
    // map's id by name.  Otherwise just get the map's config
    // and data.

    function getMapId(url) {
      fetch(url).then((res) => {
        if (res.status === 200) {
          res.json().then((mapinfo) => {
            mapId = mapinfo.data.id;
            getConfigAndData();
          });
        } else {
          postMessage({ op: "jsonLoadFailed", name: "GetMapByName" });
        }
      });
    }
    wS += getMapId.toString();

    if (UTIL.mapId === "" && UTIL.mapNameRef !== "") {
      wS += getMapId.name + "(nameLookupURL);";
    } else {
      wS += getConfigAndData.name + "();";
    }

    wS += `onmessage = ${handleMessage.name};`;
    if (debug)
      wS += `console.log ({ m:'TileLoader loaded', t: performance.now() });`;

    // Create blob and start worker.
    const blob = new Blob([wS], { type: "application/javascript" });
    if (debug) console.log({ m: "MMGR.createWebLoader", blob, wS });
    MMGR.webLoader = new Worker(URL.createObjectURL(blob));
    // It is possible for the web worker to post a reply to the main thread
    // before the message handler is defined.  Stash any such messages away
    // and play them back once it has been.
    const pendingMessages = [];
    MMGR.webLoader.onmessage = function (e) {
      pendingMessages.push(e);
    };
    MMGR.webLoader.setMessageHandler = function (mh) {
      // Run asychronously so that the heatmap can be defined before processing messages.
      setTimeout(function () {
        while (pendingMessages.length > 0) {
          mh(pendingMessages.shift());
        }
        MMGR.webLoader.onmessage = mh;
      }, 0);
    };

    // Called locally.
    function getLoaderBaseURL(fileSrc) {
      var URL;
      if (fileSrc == MMGR.WEB_SOURCE) {
        // Because a tile worker thread doesn't share our origin, we have to pass it
        // an absolute URL, and to substitute in the CFG.api variable, we want to
        // build the URL using the same logic as a browser for relative vs. absolute
        // paths.
        URL = document.location.origin;
        if (CFG.api[0] !== "/") {
          // absolute
          URL +=
            "/" +
            window.location.pathname.substr(
              1,
              window.location.pathname.lastIndexOf("/"),
            );
        }
        URL += CFG.api;
      } else {
        console.log(`getLoaderBaseURL: fileSrc==${fileSrc}`);
        URL = MMGR.localRepository + "/" + MMGR.embeddedMapName + "/";
      }
      return URL;
    }
  }

  // Handle replies from tileio worker.
  function connectWebLoader(heatMap, addMapConfig, addMapData) {
    const debug = false;
    const jsonSetterFunctions = {
      mapConfig: addMapConfig,
      mapData: addMapData,
    };
    MMGR.webLoader.setMessageHandler(function (e) {
      if (debug) console.log({ m: "Received message from webLoader", e });
      if (e.data.op === "tileLoaded") {
        const tiledata = new Float32Array(e.data.buffer);
        heatMap.tileRequestComplete(e.data.job.tileCacheName, tiledata);
      } else if (e.data.op === "tileLoadFailed") {
        heatMap.tileRequestComplete(e.data.job.tileCacheName, null);
      } else if (e.data.op === "jsonLoaded") {
        if (!jsonSetterFunctions.hasOwnProperty(e.data.name)) {
          console.log({ m: "connectWebLoader: unknown JSON request", e });
          return;
        }
        jsonSetterFunctions[e.data.name](heatMap, e.data.json);
      } else if (e.data.op === "jsonLoadFailed") {
        console.error(
          `Failed to get JSON file ${e.data.name} for ${heatMap.mapName} from server`,
        );
        UHM.mapNotFound(heatMap.mapName);
      } else {
        console.log({ m: "connectWebLoader: unknown op", e });
      }
    });
  }

  /**********************************************************************************
   * FUNCTION - zipAppDownload: The user clicked on the "Download Viewer" button.
   * Hide the button and initiate download of the NG-CHM Viewer application.
   **********************************************************************************/
  MMGR.zipAppDownload = zipAppDownload;
  function zipAppDownload() {
    downloadFileApplication();
  }

  // Initiate download of NGCHM File Viewer application zip
  function downloadFileApplication() {
    const heatMap = MMGR.getHeatMap();
    if (typeof NgChm.galaxy !== "undefined") {
      // Current viewer is embedded within Galaxy.
      // FIXME: BMB: Use a better way to determine Galaxy embedding.
      window.open(
        "/plugins/visualizations/mda_heatmap_viz/static/ngChmApp.zip",
      );
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
  function viewerAppVersionExpiredNotification(oldVersion, newVersion) {
    const title = "New NG-CHM File Viewer Version Available";
    const text =
      "<br>The version of the NG-CHM File Viewer application that you are running (" +
      oldVersion +
      ") has been superceded by a newer version (" +
      newVersion +
      "). You will be able to view all pre-existing heat maps with this new backward-compatible version. However, you may wish to download the latest version of the viewer.<br><br>The application downloads as a single HTML file (ngchmApp.html).  When the download completes, you may run the application by simply double-clicking on the downloaded file.  You may want to save this file to a location of your choice on your computer for future use.<br><br>";
    showDownloadViewerNotification(title, text);
  }

  MMGR.showDownloadViewerNotification = showDownloadViewerNotification;
  function showDownloadViewerNotification(title, bodyText) {
    const msgBox = UHM.initMessageBox();
    msgBox.classList.add("file-viewer");
    UHM.setMessageBoxHeader(title);
    UHM.setMessageBoxText(bodyText);
    UHM.setMessageBoxButton(
      "download",
      { type: "text", text: "Download Viewer" },
      "Download viewer button",
      () => {
        MMGR.zipAppDownload();
        UHM.messageBoxCancel();
      },
    );
    UHM.setMessageBoxButton(
      "cancel",
      { type: "text", text: "Cancel", default: true },
      "Cancel button",
      UHM.messageBoxCancel,
    );
    UHM.displayMessageBox();
  }

  // Compare the version of this NG-CHM viewer to the one recent available.
  // Notify the user if they're using a standalone viewer and it is out of date.
  //
  function checkViewerVersion(heatMap) {
    const debug = false;
    const req = new XMLHttpRequest();
    const baseVersion = COMPAT.version.replace(/-.*$/, "");
    req.open("GET", COMPAT.versionCheckUrl + baseVersion, true);
    req.onreadystatechange = function () {
      if (req.readyState == req.DONE) {
        if (req.status != 200) {
          //Log failure, otherwise, do nothing.
          console.log("Failed to get software version: " + req.status);
        } else {
          const latestVersion = req.response;
          if (debug)
            console.log("Compare versions", {
              latestVersion,
              thisVersion: COMPAT.version,
              newer: newer(latestVersion, baseVersion),
            });
          if (
            newer(latestVersion, baseVersion) &&
            typeof NgChm.galaxy === "undefined" &&
            MMGR.embeddedMapName === null &&
            heatMap.source() != MMGR.WEB_SOURCE
          ) {
            viewerAppVersionExpiredNotification(COMPAT.version, latestVersion);
          }
        }
      }
    };
    req.send();

    // v1 and v2 are version numbers consisting of integers separated by periods.
    // This function returns true if v1 is greater than v2.
    function newer(v1, v2) {
      // Split each into fields and convert each field to integer.
      v1 = v1.split(".").map((v) => v | 0);
      v2 = v2.split(".").map((v) => v | 0);
      for (let i = 0; ; i++) {
        if (i == v1.length && i == v2.length) return false; // Reached end of both with no differences.
        if (i == v2.length) return true; // Exhausted v2 (we treat 2.21.0 > 2.21)
        if (i == v1.length) return false; // Exhausted v1.
        if (v1[i] > v2[i]) return true;
        if (v1[i] < v2[i]) return false;
      }
    }
  }

  // Load the JSON files from the heatMap's zip file.
  // First constructs an index of the zip file entries in fileInfo.zipFiles.
  // Then loads the mapConfig and mapData json files and calls
  // addMapConfig and addMapData respectively to load them into
  // the heatMap.
  //
  // On success, returns fileInfo object for fetching tiles.
  function loadNgChmFromZip(chmFile, heatMap, addMapConfig, addMapData) {
    if (chmFile.size === 0) {
      UHM.mapLoadError(chmFile.name, "File is empty (zero bytes)");
      return;
    }
    const reader = new zip.ZipReader(new zip.BlobReader(chmFile));
    const fileInfo = {};
    // get all entries from the zip
    reader
      .getEntries()
      .then(function (entries) {
        //Inspect the first entry path to grab the true heatMapName.
        //The user may have renamed the zip file OR it was downloaded
        //as a second+ generation of a file by the same name (e.g. with a " (1)"
        //in the name).
        if (entries.length == 0) {
          UHM.mapLoadError(chmFile.name, "Empty zip file");
          return;
        }
        const entryName = entries[0].filename;
        const slashIdx = entryName.indexOf("/");
        if (slashIdx < 0) {
          UHM.mapLoadError(chmFile.name, "File format not recognized");
          return;
        }
        fileInfo.mapName = entryName.substring(0, slashIdx);
        fileInfo.zipFiles = {};
        for (let i = 0; i < entries.length; i++) {
          fileInfo.zipFiles[entries[i].filename] = entries[i];
        }
        const mapConfigName = fileInfo.mapName + "/mapConfig.json";
        const mapDataName = fileInfo.mapName + "/mapData.json";
        if (
          mapConfigName in fileInfo.zipFiles &&
          mapDataName in fileInfo.zipFiles
        ) {
          heatMap.mapName = fileInfo.mapName;
          setTimeout(() => {
            zipFetchJson(
              heatMap,
              fileInfo.zipFiles[mapConfigName],
              addMapConfig,
            );
          });
          setTimeout(() => {
            zipFetchJson(heatMap, fileInfo.zipFiles[mapDataName], addMapData);
          });
          return fileInfo;
        } else {
          UHM.mapLoadError(chmFile.name, "Missing NGCHM content");
        }
      })
      .catch(function (error) {
        console.log("Zip file read error " + error);
        UHM.mapLoadError(chmFile.name, error);
      });
    return fileInfo;

      // Helper function to fetch a json file from zip file using a zip file entry.
      function zipFetchJson(heatMap, entry, setterFunction) {
        entry.getData(new zip.TextWriter(), {}).then((text) => {
          setterFunction(heatMap, JSON.parse(text));
        });
      }
  }

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
        const zipKeys = Object.keys(heatMap.zipFiles);

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
            const entry = heatMap.zipFiles[keyVal];
            let promise;
            if (keyVal.indexOf("bin") >= 0 || keyVal.indexOf("tile") >= 0) {
              // Directly add all binary zip entries directly to the new zip file
              promise = zipCopyBin(entry);
            } else if (keyVal.indexOf("mapConfig") >= 0) {
              // For mapConfig, add the modified config data.
              promise = addTextContents(
                entry.filename,
                JSON.stringify(mapConf || heatMap.mapConfig),
              );
            } else if (keyVal.indexOf("mapData") >= 0) {
              // For mapData, add the potentially modified data.
              promise = addTextContents(
                entry.filename,
                JSON.stringify(heatMap.mapData),
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
    var name = CFG.api + "SaveMapProperties?map=" + heatMap.mapName;
    var req = new XMLHttpRequest();
    req.open("POST", name, false);
    req.setRequestHeader("Content-Type", "application/json");
    req.onreadystatechange = function () {
      if (req.readyState == req.DONE) {
        if (req.status != 200) {
          console.log(
            "Failed in call to save propeties from server: " + req.status,
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
    var success = "";
    var name = CFG.api + "ZippedMap?map=" + heatMap.mapName;
    callServlet("POST", name, jsonData);
    return true;
  }

  // Matrix Manager block.
  {
    var heatMap = null;
    var mapStatusDB = new WeakMap();

    function getMapStatus(heatMap) {
      let status = mapStatusDB.get(heatMap);
      if (!status) {
        status = {
          flickInitialized: false,
        };
        mapStatusDB.set(heatMap, status);
      }
      return status;
    }

    MMGR.mapUpdatedOnLoad = function (heatMap) {
      return heatMap.mapUpdatedOnLoad;
    };

    //Main function of the matrix manager - create a heat map object.
    //mapFile parameter is only used for local file based heat maps.
    //This function is called from a number of places:
    //It is called from UIMGR.onLoadCHM when displaying a map in the NG-CHM Viewer and for embedded NG-CHM maps
    //It is called from displayFileModeCHM (in UIMGR) when displaying a map in the stand-alone NG-CHM Viewer
    //It is called in script in the mda_heatmap_viz.mako file when displaying a map in the Galaxy NG-CHM Viewer
    MMGR.createHeatMap = function createHeatMap(
      fileSrc,
      heatMapName,
      updateCallbacks,
      mapFile,
    ) {
      heatMap = new HEAT.HeatMap(
        heatMapName,
        updateCallbacks,
        fileSrc,
        mapFile ? createFileLoader (mapFile) : connectLoader,
        onMapReady,
      );
    };

    function connectLoader (heatMap, addMapConfig, addMapData) {
      if (heatMap.source() === MMGR.FILE_SOURCE) {
        throw `Trying to connect web loader to a file`;
      }
      // WEB_SOURCE created the WebLoader on module initialization.
      if (heatMap.source() !== MMGR.WEB_SOURCE) createWebLoader(heatMap.source());
      connectWebLoader(heatMap, addMapConfig, addMapData);
      return {
        loadTile: function (job) {
          MMGR.webLoader.postMessage({ op: "loadTile", job });
        },
      };
    }

    function createFileLoader (mapFile) {
      //Check file mode viewer software version (excepting when using embedded widget)
      return function (heatMap, addMapConfig, addMapData) {
        if (typeof embedDiv === "undefined") {
          checkViewerVersion(heatMap);
        }
        const fileInfo = loadNgChmFromZip(mapFile, heatMap, addMapConfig, addMapData);
        return {
          loadTile: function (job) {
            zipFetchTile (fileInfo, heatMap, job);
          },
        };
      };
    }

    // Read the tile specified by job from the HeatMap's zip file.
    //
    // Calls heatMap.tileRequestComplete when done.
    //
    function zipFetchTile(fileInfo, heatMap, job) {
      const debug = false;
      const baseName =
        fileInfo.mapName + "/" + job.layer + "/" + job.level + "/" + job.tileName;
      let entry = fileInfo.zipFiles[baseName + ".tile"];
      if (typeof entry === "undefined") {
        // Tiles in ancient NG-CHMs had a .bin extension.
        entry = fileInfo.zipFiles[baseName + ".bin"];
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
    }

    // Return the current heat map.
    MMGR.getHeatMap = function getHeatMap() {
      return heatMap;
    };

    // Return all heat maps.
    MMGR.getAllHeatMaps = function getAllHeatMaps() {
      return [heatMap];  // Only 1 for now.
    };

    /*
     * Set the 'flick' control and data layer
     */
    function onMapReady(heatMap) {
      const status = getMapStatus(heatMap);
      if (!status.flickInitialized) {
        configurePageHeader(heatMap);
        const dl = heatMap.getDataLayers();
        const numLayers = Object.keys(dl).length;
        if (numLayers > 1) {
          const dls = new Array(numLayers);
          const orderedKeys = new Array(numLayers);
          for (let key in dl) {
            const dlNext = +key.substring(2, key.length); // Requires data layer ids to be dl1, dl2, etc.
            orderedKeys[dlNext - 1] = key;
            let displayName = dl[key].name;
            if (displayName.length > 20) {
              displayName = displayName.substring(0, 17) + "...";
            }
            dls[dlNext - 1] =
              '<option value="' + key + '">' + displayName + "</option>";
          }
          const panelConfig = heatMap.getPanelConfiguration();
          const flickInfo =
            panelConfig && panelConfig.flickInfo ? panelConfig.flickInfo : {};
          const layer = FLICK.enableFlicks(
            orderedKeys,
            dls.join(""),
            flickInfo,
          );
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

  if (
    MMGR.embeddedMapName === null &&
    (UTIL.mapId !== "" || UTIL.mapNameRef !== "")
  ) {
    createWebLoader(MMGR.WEB_SOURCE);
  }

  // Special tooltip with content populated from the loaded heat map.
  document.getElementById("mapName").addEventListener(
    "mouseover",
    (ev) => {
      const heatMap = MMGR.getHeatMap();
      UHM.hlp(
        ev.target,
        "Map Name: " +
          (heatMap !== null
            ? heatMap.getMapInformation().name
            : "Not yet available") +
          "<br><br>Description: " +
          (heatMap !== null ? heatMap.getMapInformation().description : "N/A"),
        350,
      );
    },
    { passive: true },
  );
})();
