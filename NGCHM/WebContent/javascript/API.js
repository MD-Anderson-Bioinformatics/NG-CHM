(function() {
    'use strict';
    NgChm.markFile();

    /**
     * Exported javascript functions.
     */

    // Define Namespace for NgChm API.
    //
    // Functions that are exported from the viewer but not used by it can be
    // defined in this file.
    //
    // Functions that are used by the viewer should be defined in the appropriate
    // module and re-exported here.
    //
    const exports = {
	'downloadSummaryPng': downloadSummaryPng,
	'downloadSummaryMapPng': downloadSummaryMapPng,
	'editWidget': editWidget,
	'hideEmbed': hideEmbed,
	'loadAllTilesTimer': loadAllTilesTimer,
	'heatMapLoaded': heatMapLoaded,
	'getSummaryHist': getSummaryHist,
	'getLinkoutTypes': getLinkoutTypes,
    };
    const API = NgChm.createNS('NgChm.API', exports);

    const UTIL = NgChm.importNS('NgChm.UTIL');
    const MAPREP = NgChm.importNS('NgChm.MAPREP');
    const MMGR = NgChm.importNS('NgChm.MMGR');
    const SUM = NgChm.importNS('NgChm.SUM');
    const PANE = NgChm.importNS('NgChm.Pane');
    const DEV = NgChm.importNS('NgChm.DEV');
    const PDF = NgChm.importNS('NgChm.PDF');
    const LNK = NgChm.importNS('NgChm.LNK');

    // Re-exports.
    NgChm.exportToNS ('NgChm.API', {
	'b64toBlob': UTIL.b64toBlob,
	// Export of jsPDF complicated by fact that jsPDF may not be loaded before API.js in the
	// standalone version of the system.  The following approach lets us avoid having to
	// know any details about the parameters / arguments of the jsPDF call.
	'jsPDF': (...args) => jspdf.jsPDF.apply (null, args),
	'generatePDF': PDF.openPdfPrefs,
	'chmResize': () => PANE.resizeNGCHM(),  // Function not initialized before panes initialized
    });

    // Also add the deprecated API functions to UTIL module for the time being.
    // Use Object.assign instead of exportToNS to avoid the module graph.
    Object.assign (UTIL, exports);

    // Return true if there is a heat map loaded. Otherwise false.
    function heatMapLoaded () {
	return MMGR.getHeatMap() !== null;
    }

    // Return a histogram of the summary values of the current data layer.
    // Thresholds is an array of numeric thresholds, but we currently only use
    // the first and last values.
    function getSummaryHist (thresholds) {
	const heatMap = MMGR.getHeatMap();
	return heatMap.getSummaryHist (heatMap.getCurrentDL(), +thresholds[0], +thresholds[thresholds.length-1]);
    }

    // Return a promise for an array of all linkout types available for the NG-CHM.
    // The promise resolves after the NG-CHM's customization file has loaded.
    //
    function getLinkoutTypes () {
	return new Promise ((resolve) => {
	    NgChm.CUST.waitForPlugins (() => {
		resolve (NgChm.CUST.linkoutTypes.slice(0));
	    });
	});
    }

    /**********************************************************************************
     * FUNCTION - downloadSummaryPng: This function downloads a PNG image of the
     * summary canvas including dendrograms.
     **********************************************************************************/
    function downloadSummaryPng (e) {
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
	scalePngImage(colDCanvas, 200, 50, dl, function(canvas){
	    colDCImg.onload = function(){
		scalePngImage(rowDCanvas, 50, 200, dl, function(canvas){
		    colDRImg.onload = function(){
			scalePngImage(SUM.canvas, 200, 200, dl, function(canvas){
			    mapImg.onload = function(){
				combinePngImage(colDCImg, colDRImg, mapImg, 200, 200, dl, function(canvas){
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
     * FUNCTION - downloadSummaryMapPng: This function downloads a PNG image of the
     * summary canvas without dendrograms.
     **********************************************************************************/
    function downloadSummaryMapPng () {
	    var mapName = MMGR.getHeatMap().getMapInformation().name;
	    var dataURL = SUM.canvas.toDataURL('image/png');
	    var dl = document.createElement('a');
	    scalePngImage(dataURL, 200, 200, dl, function(canvas){
			    dl.setAttribute('href', canvas.toDataURL('image/png'));
			    dl.setAttribute('download', mapName+'_tnMap.png');
			    document.body.appendChild(dl);
			    dl.click();
			    dl.remove();
	    });
    }

    /**********************************************************************************
     * FUNCTION - combinePngImage: This function takes the scaled row dendro image,
     * scaled column dendro image, and heat map image and combines them into one
     * 200x200 image png.
     **********************************************************************************/
    function combinePngImage (img1, img2,img3, width, height, dl, callback) {
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
    }

    /**********************************************************************************
     * FUNCTION - scaleSummaryPng: This function scales the summary PNG file down to
     * the width and height specified (currently this is set to 200x200 pixels).
     **********************************************************************************/
    function scalePngImage (origCanvas, width, height, dl, callback) {
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
    // * "showSummaryCovariateLabels":
    //   - show covariate bar labels in the summary view.
    //
    function editWidget (options) {
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
	    if (options.indexOf('showSummaryCovariateLabels') !== -1) {
		    SUM.flagDrawClassBarLabels = true;
	    }
	    if (options.indexOf('noBuilderUploads') !== -1) {
		LNK.enableBuilderUploads = false;
	    }
	    if (options.indexOf('requireFocus') !== -1) {
		UTIL.setKeyData ('require-focus', true);
	    }
    }

    /**********************************************************************************
     * FUNCTION - hideEmbed: This function hides the embedded map when the user
     * clicks on the collapse map button.
     **********************************************************************************/
    function hideEmbed (thumbStyle) {
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
     * FUNCTION - loadAllTilesTimer: This function checks the dimensions of the heat map
     * and returns a delay timer value to be used when setting the read window to the
     * entire map.
     *
     * FIXME: BMB: What uses this?  I think the intended use should be accommodated by
     * a callback from MMGR when all the tiles concerned are ready instead of some
     * "guessed" timings.
     **********************************************************************************/
    function loadAllTilesTimer () {
	    const heatMap = MMGR.getHeatMap();
	    const dimensionVal = heatMap.getNumRows(MAPREP.DETAIL_LEVEL) + heatMap.getNumColumns(MAPREP.DETAIL_LEVEL);
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

    document.getElementById('menuPng').onclick = function (event) {
	downloadSummaryPng (event.target);
    };
})();
