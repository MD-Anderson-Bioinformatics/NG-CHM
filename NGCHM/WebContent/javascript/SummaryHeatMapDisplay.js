(function () {
  "use strict";
  NgChm.markFile();

  const SUM = NgChm.createNS("NgChm.SUM");

  const MAPREP = NgChm.importNS("NgChm.MAPREP");
  const HEAT = NgChm.importNS("NgChm.HEAT");
  const MMGR = NgChm.importNS("NgChm.MMGR");
  const CMM = NgChm.importNS("NgChm.CMM");
  const SUMDDR = NgChm.importNS("NgChm.SUMDDR");
  const UTIL = NgChm.importNS("NgChm.UTIL");
  const DRAW = NgChm.importNS("NgChm.DRAW");
  const DVW = NgChm.importNS("NgChm.DVW");
  const PANE = NgChm.importNS("NgChm.Pane");
  const SRCHSTATE = NgChm.importNS("NgChm.SRCHSTATE");

  // Flags.
  SUM.flagDrawClassBarLabels = false; // Labels are only drawn in NGCHM_GUI_Builder

  //WebGl Canvas, Context, and Pixel Arrays
  SUM.chmElement = null; // div containing summary heatmap
  SUM.canvas = null; //Primary Heat Map Canvas
  SUM.rCCanvas = null; //Row Class Bar Canvas
  SUM.cCCanvas = null; //Column Class Bar Canvas
  SUM.boxCanvas = null; //Secondary Heat Map Selection Box Canvas
  SUM.mapGlManager = null; // WebGL manager for the primary heat map canvas
  SUM.rcGlManager = null; // WebGL manager for the row covariate bar canvas
  SUM.ccGlManager = null; // WebGL manager for the column covariate bar canvas
  SUM.summaryHeatMapCache = {}; // Cached summary heat maps for each layer
  SUM.summaryHeatMapValidator = {}; // Determines if the summary heat map for a layer needs to be rendered again
  SUM.texRc = null;
  SUM.texCc = null;

  //Size of heat map components
  SUM.heightPct = 0.96; // this is the amount of vertical space the col dendro and the map should take up on the summary chm div (taken from the css)
  SUM.widthPct = 0.9; // this is the amount of horizontal space the row dendro and the map should take up on the summary chm div (taken from the css)
  SUM.paddingHeight = 2;

  SUM.colDendro = null;
  SUM.rowDendro = null;

  SUM.colTopItems = null;
  SUM.rowTopItems = null;
  SUM.colTopItemsWidth = 0;
  SUM.rowTopItemsHeight = 0;
  SUM.colTopItemPosns = [];
  SUM.rowTopItemPosns = [];

  SUM.rowClassPadding = 2; // space between classification bars
  SUM.colClassPadding = 2; // space between classification bars
  SUM.rowClassBarWidth = null;
  SUM.colClassBarHeight = null;
  SUM.rowClassScale = 1;
  SUM.colClassScale = 1;
  SUM.matrixWidth = null;
  SUM.matrixHeight = null;
  SUM.totalHeight = null;
  SUM.totalWidth = null;
  SUM.minDimensionSize = 100; // minimum size the data matrix canvas can be
  SUM.widthScale = 1; // scalar used to stretch small maps (less than 250) to be proper size
  SUM.heightScale = 1;

  SUM.avgValue = {}; // Average value for each layer.
  SUM.eventTimer = 0; // Used to delay draw updates

  SUM.summaryHeatMapCache = {};
  SUM.colTopItemsWidth = 0;
  SUM.rowTopItemsHeight = 0;

  // PRIVATE.
  // To be called after the DOM elements for the summary panel have loaded.
  // Ideally, not called until the first Summary panel is being created.
  // Must be called before other summary panel initializations.
  //
  SUM.initSummaryDisplay = function () {
    SUM.canvas = document.getElementById("summary_canvas");
    SUM.boxCanvas = document.getElementById("summary_box_canvas");
    SUM.rCCanvas = document.getElementById("row_class_canvas");
    SUM.cCCanvas = document.getElementById("col_class_canvas");
  };

  // Callback that is notified every time there is an update to the heat map
  // initialize, new data, etc.  This callback draws the summary heat map.
  SUM.processSummaryMapUpdate = function (heatMap, event, tile) {
    // Ignore updates to any maps other than the one we are showing.
    if (heatMap !== MMGR.getHeatMap()) {
      return;
    }
    if (event === HEAT.Event_NEWDATA && tile.level === MAPREP.SUMMARY_LEVEL) {
      if (!heatMap.initialized) {
        return;
      }
      //Summary tile - wait a bit to see if we get another tile quickly, then draw
      if (SUM.eventTimer != 0) {
        //New tile arrived - reset timer
        clearTimeout(SUM.eventTimer);
      }
      SUM.flushDrawingCache(tile);
      SUM.eventTimer = setTimeout(SUM.buildSummaryTexture, 200);
    } else if (event === HEAT.Event_PLUGINS) {
      SUM.redrawSummaryPanel();
    }
    //Ignore updates to other tile types.
  };

  // Initialize heatmap summary data that is independent of there being
  // a summary panel.  This function is called once the heatmap data
  // has been loaded, but before creating any view panels.
  SUM.initSummaryData = function (callbacks) {
    const ddrCallbacks = {
      clearSelectedRegion: function (axis) {
        callbacks.callDetailDrawFunction("NORMAL");
        if (DVW.primaryMap) {
          DVW.primaryMap.selectedStart = 0;
          DVW.primaryMap.selectedStop = 0;
        }
      },
      setSelectedRegion: function (axis, regionStart, regionStop) {
        // Clear any previous ribbon mode on either axis.
        const otherDendro = MAPREP.isRow(axis) ? SUM.colDendro : SUM.rowDendro;

        otherDendro.clearSelectedRegion();
        SUM.clearAxisSelectionMarks(axis);
        callbacks.clearSearchItems(axis);

        // Set start and stop coordinates
        if (DVW.primaryMap) {
          DVW.primaryMap.subDendroMode = axis;
          DVW.primaryMap.selectedStart = regionStart;
          DVW.primaryMap.selectedStop = regionStop;
          DVW.primaryMap.selectedIsDendrogram = true;
        }
        callbacks.showSearchResults();
        callbacks.callDetailDrawFunction(
          axis === "Row" ? "RIBBONV" : "RIBBONH",
        );
      },

      clearSearchItems: function (axis) {
        // Clear axis search results,
        // Don't redraw yet. Will be followed by
        // call to setAxisSearchResults.
        callbacks.clearSearchItems(axis);
      },
      setAxisSearchResults: function (axis, left, right) {
        // Set axis search results and redraw.
        // May or may not be preceeded by a call to clearSearchItems.
        callbacks.setAxisSearchResults(axis, left, right);
        callbacks.showSearchResults();
      },
      clearSearchRange: function (axis, left, right) {
        // Clear range of search results and redraw
        callbacks.clearSearchRange(axis, left, right);
        callbacks.showSearchResults();
      },

      calcDetailDendrogramSize: function (axis, size, totalSize) {
        // axis is 'row' or 'column'
        // - For rows, calculate the dendrogram width.
        // - For columns, calculate the dendrogram height.
        // size is the current width/height of the detail dendrogram.
        // totalSize is maximum available width/height of the entire detail canvas.
        const sumDendro = MAPREP.isRow(axis) ? SUM.rowDendro : SUM.colDendro;
        const covarCanvas = MAPREP.isRow(axis) ? SUM.rCCanvas : SUM.cCCanvas;
        const sizeProperty = MAPREP.isRow(axis) ? "width" : "height";
        const sumDendroSize = parseInt(
          sumDendro.dendroCanvas.style[sizeProperty],
          10,
        );
        if (!SUM.chmElement || sumDendroSize < 5) {
          // Either no SUM element or it's minimized.
          // Retain existing dendro size but ensure that it is
          // no smaller than 10% of the total detail size.
          const minSize = totalSize * 0.1;
          if (size < minSize) {
            size = minSize;
          }
        } else {
          // Summary view consists of three relevant canvases: dendrogram, covariates, and the map.
          // Compute the proportion of the total used by the dendrogram.
          const sumMapSize = parseInt(SUM.canvas.style[sizeProperty], 10);
          const sumCovarSize = parseInt(covarCanvas.style[sizeProperty], 10);
          const dendroSumPct =
            sumDendroSize / (sumMapSize + sumDendroSize + sumCovarSize);
          // Calculate size as the same proportion of the total detail width.
          size = totalSize * dendroSumPct;
        }
        return size;
      },
    };

    SUM.reinitSummaryData = function () {
      const heatMap = MMGR.getHeatMap();
      if (!SUM.colDendro) {
        SUM.colDendro = new SUMDDR.SummaryColumnDendrogram(
          heatMap,
          ddrCallbacks,
        );
      }
      if (!SUM.rowDendro) {
        SUM.rowDendro = new SUMDDR.SummaryRowDendrogram(heatMap, ddrCallbacks);
      }
      SUM.colTopItems = heatMap.getTopItems("column", { count: 10 });
      SUM.rowTopItems = heatMap.getTopItems("row", { count: 10 });

      SUM.matrixWidth = heatMap.getNumColumns(MAPREP.SUMMARY_LEVEL);
      SUM.matrixHeight = heatMap.getNumRows(MAPREP.SUMMARY_LEVEL);

      if (SUM.matrixWidth < SUM.minDimensionSize) {
        SUM.widthScale = Math.max(
          2,
          Math.ceil(SUM.minDimensionSize / SUM.matrixWidth),
        );
      }
      if (SUM.matrixHeight < SUM.minDimensionSize) {
        SUM.heightScale = Math.max(
          2,
          Math.ceil(SUM.minDimensionSize / SUM.matrixHeight),
        );
      }
      SUM.calcTotalSize();
    };
    SUM.reinitSummaryData();
  };

  SUM.redrawSummaryPanel = function () {
    // Nothing to redraw if never initialized.
    if (!SUM.chmElement) return;
    SUM.reinitSummaryData();

    //Classificaton bars get stretched on small maps, scale down the bars and padding.
    SUM.rowClassBarWidth = SUM.calculateSummaryTotalClassBarHeight("row");
    SUM.colClassBarHeight = SUM.calculateSummaryTotalClassBarHeight("column");

    SUM.rCCanvas.width = SUM.rowClassBarWidth;
    SUM.cCCanvas.height = SUM.colClassBarHeight;

    setTimeout(function () {
      SUM.initHeatMapGl();
      SUM.calcSummaryLayout();
      SUM.buildSummaryTexture();
      if (SUM.rCCanvas.width > 0) {
        SUM.buildRowClassTexture();
      }
      if (SUM.cCCanvas.height > 0) {
        SUM.buildColClassTexture();
      }
      SUM.drawLeftCanvasBox();

      SUM.setSelectionDivSize();
      SUM.clearSelectionMarks();
      SUM.drawSelectionMarks();
      SUM.drawTopItems();
      SUM.rowDendro.draw();
      SUM.colDendro.draw();
      if (SUM.flagDrawClassBarLabels) {
        SUM.drawColClassBarLabels();
        SUM.drawRowClassBarLabels();
      }
      if (document.getElementById("missingSumRowClassBars"))
        DVW.removeLabels("missingSumRowClassBars");
      if (document.getElementById("missingSumColClassBars"))
        DVW.removeLabels("missingSumColClassBars");
      SUM.drawMissingRowClassBarsMark();
      SUM.drawMissingColClassBarsMark();
      //SUM.drawColClassBarLegends(); Temporarily removed legends from summary
      //SUM.drawRowClassBarLegends(); they may or may not come back later
    }, 1);
  };

  //This function checks to see if the proposed summary width will allow for covariate bars,
  //dendrogram, and some portion of the summary map.  If not, the minimum summary size is
  //reset to a larger size and the configuration for summary minimum width is updated. The
  //mimimum width is also set for the summary chm so that the divider bar cannot be dragged
  //further to the left.
  SUM.setMinimumSummaryWidth = function (minSumWidth) {
    const heatMap = MMGR.getHeatMap();
    var sumPct = parseInt(heatMap.getMapInformation().summary_width);
    if (typeof NgChm.galaxy === "undefined") {
      // FIXME: BMB: Implement a better way of determining Galaxy mode.
      if (SUM.chmElement.offsetWidth == 0) {
        return sumPct;
      }
      while (SUM.chmElement.offsetWidth < minSumWidth && sumPct < 90) {
        sumPct = sumPct + 5;
        SUM.chmElement.style.width = sumPct + "%";
      }
    }
    if (parseInt(heatMap.getMapInformation().summary_width) < sumPct) {
      heatMap.setDividerPref(sumPct.toString());
    }
    SUM.chmElement.style.minWidth = minSumWidth + "px";

    return sumPct;
  };

  //Set the variables for the total size of the summary heat map - used to set canvas, WebGL texture, and viewport size.
  SUM.calcTotalSize = function () {
    SUM.totalHeight = SUM.matrixHeight * SUM.heightScale;
    SUM.totalWidth = SUM.matrixWidth * SUM.widthScale;
  };

  SUM.setSelectionDivSize = function (width, height) {
    // input params used for PDF Generator to resize canvas based on PDF sizes
    const heatMap = MMGR.getHeatMap();
    var colSel = document.getElementById("summary_col_select_canvas");
    var rowSel = document.getElementById("summary_row_select_canvas");
    var colTI = document.getElementById("summary_col_top_items_canvas");
    var rowTI = document.getElementById("summary_row_top_items_canvas");
    //Size and position Column Selections Canvas
    const colSelVP = {
      top:
        SUM.colDendro.getDivHeight() +
        SUM.cCCanvas.clientHeight +
        SUM.canvas.clientHeight,
      width: SUM.canvas.clientWidth,
      height: 10,
    };
    colSel.style.left = SUM.canvas.style.left;
    UTIL.setElementPositionSize(colSel, colSelVP, true);
    colSel.width = heatMap.getNumColumns("d");
    colSel.height = 10;

    //Size and position Column Top Items Canvas
    colTI.style.left = SUM.canvas.style.left;
    UTIL.setElementPositionSize(colTI, colSelVP, true);
    colTI.height = 10;

    //Size and position Row Selection Canvas
    const rowSelVP = {
      top: SUM.canvas.offsetTop,
      left: SUM.canvas.offsetLeft + SUM.canvas.offsetWidth,
      width: 10,
      height: SUM.canvas.clientHeight,
    };
    UTIL.setElementPositionSize(rowSel, rowSelVP, true);
    rowSel.width = 10;
    rowSel.height = heatMap.getNumRows("d");

    //Size and position Row Top Items Canvas
    UTIL.setElementPositionSize(rowTI, rowSelVP, true);
    rowTI.width = 10;
    rowTI.height = height
      ? (height * SUM.heightScale * SUM.matrixHeight) / SUM.canvas.height
      : Math.round(
          SUM.canvas.clientHeight *
            ((SUM.canvas.height -
              SUM.calculateSummaryTotalClassBarHeight("col")) /
              SUM.canvas.height),
        );
  };

  /***************************
   * Summary Panel WebGL stuff
   **************************/

  (function () {
    // The summary panel uses three WebGL canvases and thus contexts: one for the heatmap,
    // one for the row covariates, and one for the column covariates.  The WebGL context
    // elements and properties are the same for all three, so we use common functions for
    // creating the WebGL contexts and initializing (re-initializing) the context.

    //Initialize webGl for the Heat Map Canvas
    SUM.initHeatMapGl = function () {
      // First time: create the context manager.
      if (!SUM.mapGlManager)
        SUM.mapGlManager = createSummaryGlManager(SUM.canvas, SUM.drawHeatMap);
      // Every time: check if (re-)initialization required and do so if needed.
      return SUM.mapGlManager.check(initSummaryGlContext);
    };

    //Initialize webGl for the Row Class Bar Canvas
    SUM.initRowClassGl = function () {
      if (!SUM.rcGlManager)
        SUM.rcGlManager = createSummaryGlManager(
          SUM.rCCanvas,
          SUM.drawRowClassBars,
        );
      return SUM.rcGlManager.check(initSummaryGlContext);
    };

    //Initialize webGl for the Column Class Bar Canvas
    SUM.initColClassGl = function () {
      if (!SUM.ccGlManager)
        SUM.ccGlManager = createSummaryGlManager(
          SUM.cCCanvas,
          SUM.drawColClassBars,
        );
      return SUM.ccGlManager.check(initSummaryGlContext);
    };

    // Create a GL manager that uses the summary map vertex and fragment shaders.
    SUM.createSummaryGlManager = createSummaryGlManager;
    function createSummaryGlManager(canvas, onRestore) {
      return DRAW.GL.createGlManager(
        canvas,
        getVertexShader,
        getFragmentShader,
        onRestore,
        1,
        1,
      );
    }

    // Vertex shader for summary heat maps.
    const vertexShaderSource = `
	attribute vec2 position;
	varying vec2 v_texPosition;
	void main () {
	    gl_Position = vec4(position, 0, 1);
	    v_texPosition = position * 0.5 + 0.5;
	 }
    `;
    function getVertexShader(gl) {
      const shader = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(shader, vertexShaderSource);
      gl.compileShader(shader);
      return shader;
    }

    // Fragment shader for summary heat maps.
    const fragmentShaderSource = `
	precision mediump float;
	varying vec2 v_texPosition;
	varying float v_boxFlag;
	uniform sampler2D u_texture;
	void main () {
	   gl_FragColor = texture2D(u_texture, v_texPosition);
	}
    `;
    function getFragmentShader(gl) {
      const shader = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(shader, fragmentShaderSource);
      gl.compileShader(shader);
      return shader;
    }

    // (Re-)initialize a summary GL context.
    SUM.initSummaryGlContext = initSummaryGlContext;
    function initSummaryGlContext(manager, ctx, program) {
      ctx.viewport(
        0,
        0,
        ctx.drawingBufferWidth * manager._widthScale,
        ctx.drawingBufferHeight * manager._heightScale,
      );
      ctx.clear(ctx.COLOR_BUFFER_BIT);

      manager.setClipRegion(DRAW.GL.fullClipSpace);
      return true;
    }
  })();

  //This function is called when a new summary tile is received.
  //The summary heatmap for the tile's layer is marked so
  //that it will be redrawn when buildSummaryTexture is called next.
  SUM.flushDrawingCache = function (tile) {
    const debug = false;
    if (debug)
      console.log(
        "Flushing summary heat map for layer " +
          tile.layer +
          " at " +
          performance.now(),
      );
    SUM.summaryHeatMapValidator[tile.layer] = ""; // Empty string will not match any validator
  };

  //Create a summary heat map for the current data layer and display it.
  SUM.buildSummaryTexture = function () {
    const debug = false;

    const heatMap = MMGR.getHeatMap();
    const currentDl = heatMap.getCurrentDL();
    let renderBuffer;
    if (SUM.summaryHeatMapCache.hasOwnProperty(currentDl)) {
      renderBuffer = SUM.summaryHeatMapCache[currentDl];
    } else {
      //renderBuffer = DRAW.createRenderBuffer (SUM.matrixWidth*SUM.widthScale, SUM.matrixHeight*SUM.heightScale, 1.0);
      renderBuffer = DRAW.createRenderBuffer(
        SUM.matrixWidth,
        SUM.matrixHeight,
        1.0,
      );
      SUM.summaryHeatMapCache[currentDl] = renderBuffer;
      SUM.summaryHeatMapValidator[currentDl] = "";
    }
    SUM.eventTimer = 0;

    const colorMap = heatMap
      .getColorMapManager()
      .getColorMap("data", currentDl);

    // Together with the data, these parameters determine the color of a matrix value.
    const pixelColorScheme = {
      colors: colorMap.getColors(),
      thresholds: colorMap.getThresholds(),
      missingColor: colorMap.getMissingColor(),
      cutsColor: colorMap.getCutsColor(),
    };

    const summaryProps = {
      dataLayer: currentDl,
      width: renderBuffer.width,
      height: renderBuffer.height,
      //widthScale: SUM.widthScale,
      //heightScale: SUM.heightScale,
      colorScheme: pixelColorScheme,
    };
    const validator = JSON.stringify(summaryProps);
    if (debug)
      console.log({
        m: "NgChm.SUM.buildSummaryTexture",
        summaryProps,
        "new data": SUM.summaryHeatMapValidator[currentDl] === "",
        valid: SUM.summaryHeatMapValidator[currentDl] === validator,
        t: performance.now(),
      });

    // Render
    if (validator !== SUM.summaryHeatMapValidator[currentDl]) {
      //renderSummaryHeatMap(renderBuffer, SUM.widthScale, SUM.heightScale);
      renderSummaryHeatMap(renderBuffer, 1, 1);
      if (debug)
        console.log(
          "Rendering summary heatmap finished at " + performance.now(),
        );
      SUM.summaryHeatMapValidator[currentDl] = validator;
    }
    if (renderBuffer !== undefined) {
      drawHeatMapRenderBuffer(renderBuffer);
    }
  };

  // Redisplay the summary heat map for the current data layer.
  SUM.drawHeatMap = function () {
    const heatMap = MMGR.getHeatMap();
    const currentDl = heatMap.getCurrentDL();
    if (SUM.summaryHeatMapCache[currentDl] !== undefined) {
      drawHeatMapRenderBuffer(SUM.summaryHeatMapCache[currentDl]);
    }
  };

  SUM.renderHeatMapToRenderBuffer = renderHeatMapToRenderBuffer;
  function renderHeatMapToRenderBuffer(widthScale, heightScale) {
    const renderBuffer = DRAW.createRenderBuffer(
      SUM.matrixWidth * widthScale,
      SUM.matrixHeight * heightScale,
      1.0,
    );
    renderSummaryHeatMap(renderBuffer, widthScale, heightScale);
    return renderBuffer;
  }

  // Renders the Summary Heat Map for the current data layer into the specified renderBuffer.
  function renderSummaryHeatMap(renderBuffer, widthScale, heightScale) {
    const heatMap = MMGR.getHeatMap();
    const currentDl = heatMap.getCurrentDL();
    const colorMap = heatMap
      .getColorMapManager()
      .getColorMap("data", currentDl);
    //Setup texture to draw on canvas.
    //Needs to go backward because WebGL draws bottom up.
    const numRows = heatMap.getNumRows(MAPREP.SUMMARY_LEVEL);
    const numColumns = heatMap.getNumColumns(MAPREP.SUMMARY_LEVEL);
    const accessWindow = heatMap.getNewAccessWindow({
      layer: currentDl,
      level: MAPREP.SUMMARY_LEVEL,
      firstRow: 1,
      firstCol: 1,
      numRows: numRows,
      numCols: numColumns,
    });
    const contColorMap = colorMap.getContColorMap();
    const line = new Array(numColumns * widthScale * DRAW.BYTE_PER_RGBA);
    let pos = 0;
    SUM.avgValue[currentDl] = 0;
    for (let i = numRows; i > 0; i--) {
      let linepos = 0;
      for (let { value } of accessWindow.getRowValues(i)) {
        if (value < MAPREP.maxValues && value > MAPREP.minValues) {
          SUM.avgValue[currentDl] += value;
        }
        const { r, g, b, a } = contColorMap.getColor(value);
        for (let k = 0; k < widthScale; k++) {
          line[linepos] = r;
          line[linepos + 1] = g;
          line[linepos + 2] = b;
          line[linepos + 3] = a;
          linepos += DRAW.BYTE_PER_RGBA;
        }
      }
      for (let j = 0; j < heightScale; j++) {
        for (let k = 0; k < line.length; k++) {
          renderBuffer.pixels[pos] = line[k];
          pos++;
        }
      }
    }
    SUM.avgValue[currentDl] = SUM.avgValue[currentDl] / (numRows * numColumns);
    if (pos !== renderBuffer.pixels.length) {
      console.error("renderSummaryHeatMap did not end properly", {
        pos,
        renderBuffer,
      });
    }
  }

  // Draw the summary map render in renderBuffer to the summary map canvas
  // using WebGL.
  function drawHeatMapRenderBuffer(renderBuffer) {
    if (SUM.chmElement && SUM.initHeatMapGl()) {
      SUM.mapGlManager.setTextureFromRenderBuffer(renderBuffer);
      SUM.mapGlManager.drawTexture();
    }
  }

  //Draws Row Classification bars into the webGl texture array ("dataBuffer"). "names"/"colorSchemes" should be array of strings.
  SUM.buildRowClassTexture = function buildRowClassTexture() {
    const heatMap = MMGR.getHeatMap();
    SUM.texRc = buildRowCovariateRenderBuffer(SUM.widthScale, SUM.heightScale);

    DVW.removeLabels("missingSumRowClassBars");
    if (heatMap.hasHiddenCovariates("row")) {
      if (!document.getElementById("missingSumRowClassBars")) {
        const x = SUM.canvas.offsetLeft;
        const y = SUM.canvas.offsetTop + SUM.canvas.clientHeight + 2;
        DVW.addLabelDivs(
          document.getElementById("sumlabelDiv"),
          "missingSumRowClassBars",
          "ClassBar MarkLabel",
          "...",
          "...",
          x,
          y,
          10,
          "T",
          null,
          "Row",
        );
      }
    }
    SUM.drawRowClassBars();
  };

  SUM.buildRowCovariateRenderBuffer = buildRowCovariateRenderBuffer;
  function buildRowCovariateRenderBuffer(widthScale, heightScale) {
    const heatMap = MMGR.getHeatMap();

    const renderBuffer = DRAW.createRenderBuffer(
      SUM.rowClassBarWidth * widthScale,
      SUM.matrixHeight * heightScale,
      1.0,
    );
    var dataBuffer = renderBuffer.pixels;
    dataBuffer.fill(255);
    var classBarsData = heatMap.getRowClassificationData();
    var colorMapMgr = heatMap.getColorMapManager();
    var offset = 0;

    const bars = heatMap.getScaledVisibleCovariates("row", 1.0);
    bars.forEach((currentClassBar) => {
      const barWidth = SUM.getScaledHeight(currentClassBar.height, "row");
      var colorMap = colorMapMgr.getColorMap("row", currentClassBar.label); // assign the proper color scheme...
      var classBarValues = classBarsData[currentClassBar.label].values;
      var classBarLength = classBarValues.length;
      if (typeof classBarsData[currentClassBar.label].svalues != "undefined") {
        classBarValues = classBarsData[currentClassBar.label].svalues;
        classBarLength = classBarValues.length;
      }
      if (currentClassBar.bar_type === "color_plot") {
        SUM.drawColorPlotRowClassBar(
          renderBuffer,
          offset,
          barWidth,
          classBarValues,
          classBarLength,
          colorMap,
          widthScale,
          heightScale,
        );
      } else {
        SUM.drawScatterBarPlotRowClassBar(
          renderBuffer,
          offset,
          barWidth - SUM.colClassPadding,
          classBarValues,
          currentClassBar,
          widthScale,
          heightScale,
        );
      }
      offset += barWidth * widthScale * DRAW.BYTE_PER_RGBA;
    });

    return renderBuffer;
  }

  SUM.drawRowClassBars = function () {
    if (SUM.texRc && SUM.initRowClassGl()) {
      SUM.rcGlManager.setTextureFromRenderBuffer(SUM.texRc);
      SUM.rcGlManager.drawTexture();
    }
  };

  //Draws Column Classification bars into the webGl texture array ("dataBuffer"). "names"/"colorSchemes" should be array of strings.
  SUM.buildColClassTexture = function () {
    const heatMap = MMGR.getHeatMap();
    SUM.texCc = SUM.buildColCovariateRenderBuffer(
      SUM.widthScale,
      SUM.heightScale,
    );
    DVW.removeLabels("missingSumColClassBars");
    if (heatMap.hasHiddenCovariates("column")) {
      if (!document.getElementById("missingSumColClassBars")) {
        const x = SUM.canvas.offsetLeft + SUM.canvas.offsetWidth + 2;
        const y =
          SUM.canvas.offsetTop + SUM.canvas.clientHeight / SUM.totalHeight - 10;
        DVW.addLabelDivs(
          document.getElementById("sumlabelDiv"),
          "missingSumColClassBars",
          "ClassBar MarkLabel",
          "...",
          "...",
          x,
          y,
          10,
          "F",
          null,
          "Column",
        );
      }
    }

    SUM.drawColClassBars();
  };

  SUM.buildColCovariateRenderBuffer = function (widthScale, heightScale) {
    const heatMap = MMGR.getHeatMap();
    // SUM.totalWidth includes a factor of SUM.widthScale, so we need to get the width without that scaling.
    const baseWidth = SUM.totalWidth / SUM.widthScale;
    const renderBuffer = DRAW.createRenderBuffer(
      baseWidth * widthScale,
      SUM.colClassBarHeight * heightScale,
      1.0,
    );
    renderBuffer.pixels.fill(255);
    var classBarsData = heatMap.getColClassificationData();
    var colorMapMgr = heatMap.getColorMapManager();
    const bars = heatMap.getScaledVisibleCovariates("column", 1.0);
    // Determine padding between class bars in bytes.
    // Need to multiply totalWidth by widthScale and lines of padding by heightScale.
    const paddingSkip =
      baseWidth *
      widthScale *
      SUM.colClassPadding *
      heightScale *
      DRAW.BYTE_PER_RGBA;
    var pos = 0;

    //We reverse the order of the classBars before drawing because we draw from bottom up
    for (let i = bars.length - 1; i >= 0; i--) {
      const currentClassBar = bars[i];
      const colorMap = colorMapMgr.getColorMap("col", currentClassBar.label); // assign the proper color scheme...
      let classBarValues = classBarsData[currentClassBar.label].values;
      let classBarLength = classBarValues.length;
      if (typeof classBarsData[currentClassBar.label].svalues != "undefined") {
        classBarValues = classBarsData[currentClassBar.label].svalues;
        classBarLength = classBarValues.length;
      }
      pos += paddingSkip; // advance over padding before each bar
      const barHeight = SUM.getScaledHeight(currentClassBar.height, "col");
      if (currentClassBar.bar_type === "color_plot") {
        pos = SUM.drawColorPlotColClassBar(
          renderBuffer,
          pos,
          barHeight - SUM.colClassPadding,
          classBarValues,
          classBarLength,
          colorMap,
          widthScale,
          heightScale,
        );
      } else {
        pos = SUM.drawScatterBarPlotColClassBar(
          renderBuffer,
          pos,
          barHeight - SUM.colClassPadding,
          classBarValues,
          currentClassBar,
          widthScale,
          heightScale,
        );
      }
    }

    return renderBuffer;
  };

  //WebGL code to draw the Column Class Bars.
  SUM.drawColClassBars = function () {
    if (SUM.texCc && SUM.initColClassGl()) {
      SUM.ccGlManager.setTextureFromRenderBuffer(SUM.texCc);
      SUM.ccGlManager.drawTexture();
    }
  };

  //Browsers resizes the canvas.  This function translates from a click position
  //back to the original (non-scaled) canvas position.
  SUM.getCanvasX = function (offsetX) {
    return (offsetX / SUM.canvas.clientWidth) * SUM.canvas.width;
  };

  SUM.getCanvasY = function (offsetY) {
    return (offsetY / SUM.canvas.clientHeight) * SUM.canvas.height;
  };

  //Return the summary row given an y position on the canvas
  SUM.canvasToMatrixRow = function (y) {
    return Math.round(y / SUM.heightScale);
  };

  SUM.canvasToMatrixCol = function (x) {
    return Math.round(x / SUM.widthScale);
  };

  //Given a matrix row, return the canvas position
  SUM.getCanvasYFromRow = function (row) {
    return row + SUM.colClassBarHeight;
  };

  SUM.getCanvasXFromCol = function (col) {
    return col + SUM.rowClassBarWidth;
  };

  /**********************************************************************************
   * FUNCTION - resetBoxCanvas: This function resets the summary box canvas.  It takes
   * the canvas, clears it, and draws borders.  It is broken out from drawLeftCanvas
   * box so that the canvas with borders can be used in printing PDFs where only the
   * summary view is selected.
   **********************************************************************************/
  SUM.resetBoxCanvas = function () {
    var ctx = SUM.boxCanvas.getContext("2d");
    ctx.clearRect(0, 0, SUM.boxCanvas.width, SUM.boxCanvas.height);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#000000";

    const heatMap = MMGR.getHeatMap();

    // If no row or column cuts, draw the heat map border in black
    if (!heatMap.hasGaps()) {
      ctx.strokeRect(0, 0, SUM.boxCanvas.width, SUM.boxCanvas.height);
    }

    const primaryMap = DVW.primaryMap;
    if (primaryMap) {
      //If in sub-dendro mode, draw rectangles outside of selected range.
      //Furthermore, if the average color is dark make those rectangles
      //lighter than the heatmap, otherwise, darker.
      if (primaryMap.mode.startsWith("RIBBON")) {
        const currentDl = heatMap.getCurrentDL();
        var colorMap = heatMap
          .getColorMapManager()
          .getColorMap("data", currentDl);
        var color = colorMap.getColor(SUM.avgValue[currentDl]);
        if (colorMap.isColorDark(color)) {
          ctx.fillStyle = "rgba(10, 10, 10, 0.25)";
        } else {
          ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
        }
      }

      //Draw sub-dendro box
      if (
        primaryMap.mode.startsWith("RIBBONH") &&
        primaryMap.selectedStart > 0
      ) {
        var summaryRatio = heatMap.getColSummaryRatio(MAPREP.SUMMARY_LEVEL);
        var adjustedStart =
          (primaryMap.selectedStart * SUM.widthScale) / summaryRatio;
        var adjustedStop =
          (primaryMap.selectedStop * SUM.widthScale) / summaryRatio;
        let boxX = 0;
        let boxY = 0;
        let boxW =
          ((adjustedStart - SUM.widthScale) / SUM.canvas.width) *
          SUM.boxCanvas.width;
        let boxH = SUM.boxCanvas.height - boxY;
        ctx.fillRect(boxX, boxY, boxW, boxH);
        boxX = (adjustedStop / SUM.canvas.width) * SUM.boxCanvas.width;
        boxW =
          ((SUM.canvas.width - adjustedStop + 1 * SUM.widthScale) /
            SUM.canvas.width) *
          SUM.boxCanvas.width;
        ctx.fillRect(boxX, boxY, boxW, boxH);
      } else if (
        primaryMap.mode.startsWith("RIBBONV") &&
        primaryMap.selectedStart > 0
      ) {
        var summaryRatio = heatMap.getRowSummaryRatio(MAPREP.SUMMARY_LEVEL);
        var adjustedStart =
          (primaryMap.selectedStart * SUM.heightScale) / summaryRatio;
        var adjustedStop =
          (primaryMap.selectedStop * SUM.heightScale) / summaryRatio;
        let boxX = 0;
        let boxY = 0;
        let boxW = SUM.boxCanvas.width - boxX;
        let boxH =
          ((adjustedStart - SUM.heightScale) / SUM.canvas.height) *
          SUM.boxCanvas.height;
        ctx.fillRect(boxX, boxY, boxW, boxH);
        boxY = (adjustedStop / SUM.canvas.height) * SUM.boxCanvas.height;
        boxH =
          ((SUM.canvas.height - adjustedStop + 1 * SUM.heightScale) /
            SUM.canvas.height) *
          SUM.boxCanvas.height;
        ctx.fillRect(boxX, boxY, boxW, boxH);
      }
    }

    return ctx;
  };

  /**********************************************************************************
   * FUNCTION - drawLeftCanvasBox: This function draws the view box on the summary
   * pane whenever the position in the detail pane has changed. (e.g. on load, on click,
   * on drag, etc...). A conversion is done from detail to summary coordinates, the
   * new box position is calculated, and the summary pane is re-drawn.  It also draws
   * the black border around the summary heat map and gray panels that bracket sub-
   * dendro selections when in sub-dendro mode.
   **********************************************************************************/
  SUM.drawLeftCanvasBox = function () {
    // Cannot draw canvas box if no summary panel.
    if (!SUM.chmElement) return;
    // Reset the canvas (drawing borders and sub-dendro selections)
    const ctx = SUM.resetBoxCanvas(SUM.boxCanvas);
    const heatMap = MMGR.getHeatMap();
    const dataLayers = heatMap.getDataLayers();
    DVW.detailMaps.forEach((mapItem) => {
      // Draw the View Box using user-defined defined selection color
      const boxX =
        (((DVW.getCurrentSumCol(mapItem) - 1) * SUM.widthScale) /
          SUM.canvas.width) *
        SUM.boxCanvas.width;
      const boxY =
        (((DVW.getCurrentSumRow(mapItem) - 1) * SUM.heightScale) /
          SUM.canvas.height) *
        SUM.boxCanvas.height;
      const boxW =
        ((DVW.getCurrentSumDataPerRow(mapItem) * SUM.widthScale) /
          SUM.canvas.width) *
          SUM.boxCanvas.width -
        2;
      const boxH =
        ((DVW.getCurrentSumDataPerCol(mapItem) * SUM.heightScale) /
          SUM.canvas.height) *
          SUM.boxCanvas.height -
        2;
      const dataLayer = dataLayers[heatMap._currentDl];
      ctx.strokeStyle = dataLayer.selection_color;
      if (mapItem.version === "P") {
        ctx.lineWidth = 4;
      } else {
        ctx.lineWidth = 2;
      }
      ctx.strokeRect(boxX, boxY, boxW, boxH);
    });
  };

  //=====================//
  //  CLASSBAR FUNCTIONS //
  //=====================//

  SUM.getScaledHeight = function (height, axis) {
    var scaledHeight;
    if (axis === "row") {
      scaledHeight = Math.max(height, 1 + SUM.rowClassPadding);
    } else {
      scaledHeight = Math.max(height, 1 + SUM.colClassPadding);
    }
    return scaledHeight;
  };

  SUM.drawColorPlotColClassBar = drawColorPlotColClassBar;
  function drawColorPlotColClassBar(
    renderBuffer,
    pos,
    height,
    classBarValues,
    classBarLength,
    colorMap,
    widthScale,
    heightScale,
  ) {
    // Create one row of the color values for the covariate bar.
    const line = new Uint8Array(
      new ArrayBuffer(classBarLength * DRAW.BYTE_PER_RGBA * widthScale),
    );
    var loc = 0;
    for (var k = 0; k < classBarLength; k++) {
      var val = classBarValues[k];
      var color = colorMap.getClassificationColor(val);
      if (val == "null") {
        color = CMM.hexToRgba(colorMap.getMissingColor());
      }
      for (let i = 0; i < widthScale; i++) {
        line[loc] = color["r"];
        line[loc + 1] = color["g"];
        line[loc + 2] = color["b"];
        line[loc + 3] = color["a"];
        loc += DRAW.BYTE_PER_RGBA;
      }
    }
    // Copy the covariate bar color row the required number of times into the dataBuffer.
    const dataBuffer = renderBuffer.pixels;
    const numLines = height * heightScale;
    for (let j = 0; j < numLines; j++) {
      for (let k = 0; k < line.length; k++) {
        dataBuffer[pos] = line[k];
        pos++;
      }
    }
    return pos;
  }

  // Copy a column scatter/bar plot for the specified covariateBar into renderBuffer.
  // The copied covariateBar will have one entry for each value in the barValues array. Each entry will be widthScale pixels wide.
  // The copied covariateBar will be height*heightScale pixels high.
  // pos is the starting position within renderBuffer at which to write the covariateBar.
  // (Consequently, renderBuffer must be at least pos+height*heightScale*barValues.length*widthScale*DRAW.BYTE_PER_RGBA in length.)
  //
  // The function returns the next writing position within renderBuffer (if you don't want any gap between bars).
  //
  SUM.drawScatterBarPlotColClassBar = function (
    renderBuffer,
    pos,
    height,
    barValues,
    covariateBar,
    widthScale,
    heightScale,
  ) {
    // Get matrix of scatter/bar plot color index values.
    // The matrix height is scaled by heightScale to allow better resolution.
    const matrix = SUM.buildScatterBarPlotMatrix(
      height,
      heightScale,
      barValues,
      covariateBar,
    );
    // Get colors to use in this bar.
    const colors = covariateBar.getScatterBarPlotColors();

    // Copy colors corresponding to the color index values into the renderBuffer.
    // Each matrix column is replicated widthScale times.
    const dataBuffer = renderBuffer.pixels;
    for (let h = 0; h < matrix.length; h++) {
      const row = matrix[h];
      for (let k = 0; k < row.length; k++) {
        const { r, g, b, a } = colors[row[k]];
        for (let i = 0; i < widthScale; i++) {
          dataBuffer[pos] = r;
          dataBuffer[pos + 1] = g;
          dataBuffer[pos + 2] = b;
          dataBuffer[pos + 3] = a;
          pos += DRAW.BYTE_PER_RGBA;
        }
      }
    }
    return pos;
  };

  SUM.drawColClassBarLegend = function (
    key,
    currentClassBar,
    prevHeight,
    totalHeight,
    fewClasses,
  ) {
    //calculate where covariate bars end and heatmap begins by using the top items canvas (which is lined up with the heatmap)
    var rowCanvas = document.getElementById("summary_row_top_items_canvas");
    var classHgt = SUM.canvas.offsetHeight - rowCanvas.offsetHeight;
    //calculate where the previous bar ends and the current one begins.
    var prevEndPct = prevHeight / totalHeight;
    var currEndPct =
      (prevHeight + parseInt(currentClassBar.height)) / totalHeight;
    //calculate where covariate bars begin and end and use that to calculate the total covariate bars height
    var beginClasses = SUM.canvas.offsetTop - 6;
    var endClasses = beginClasses + classHgt - 2;
    var classHeight = endClasses - beginClasses;
    //get your horizontal start position (to the right of bars)
    var leftPos = SUM.canvas.offsetLeft + SUM.canvas.offsetWidth;
    var midPos = topPos + (endPos - topPos) / 2;
    //Get your 3 values for the legend.
    var midVal = key;
    //Create div and place mid legend value
    SUM.setLabelDivElement(
      key + "ColLabel",
      "- " + midVal,
      midPos,
      leftPos,
      false,
    );
  };

  SUM.removeRowClassBarLabels = function () {
    var classLabels = document.getElementsByClassName("classLabelVertical");
    while (classLabels.length > 0) {
      classLabels[0].parentNode.removeChild(classLabels[0]);
    }
  };

  SUM.drawRowClassBarLabels = function () {
    const heatMap = MMGR.getHeatMap();
    SUM.removeRowClassBarLabels();
    var colCanvas = document.getElementById("summary_col_top_items_canvas");
    var rowCanvas = document.getElementById("summary_row_top_items_canvas");
    var sumCanvas = document.getElementById("summary_canvas");
    var classBarsConfig = heatMap.getRowClassificationConfig();
    var classBarConfigOrder = heatMap.getRowClassificationOrder();
    var totalHeight = 0;
    var matrixWidth = colCanvas.width;
    //Calc total width of all covariate bars
    for (var i = 0; i < classBarConfigOrder.length; i++) {
      var key = classBarConfigOrder[i];
      var currentClassBar = classBarsConfig[key];
      if (currentClassBar.show === "Y") {
        totalHeight += parseInt(currentClassBar.height);
      }
    }
    //Set starting horizontal covariate position to the left edge of Summary canvas PLUS the font height of the label text
    var covPos = parseInt(SUM.rCCanvas.offsetLeft) + 10;
    //Set starting vertical covariate position to the bottom edge of Summary canvas PLUS a space factor adjustment
    var topPos = rowCanvas.offsetTop + rowCanvas.offsetHeight + 5;
    //Loop thru the class bars retrieving label (truncating where necessary), figuring the percentage of the total width of bars
    //relfected in the current bar, draw label, and set the next position by off-setting the total width*that percentage.
    for (var j = 0; j < classBarConfigOrder.length; j++) {
      var key = classBarConfigOrder[j];
      var currentClassBar = classBarsConfig[key];
      if (currentClassBar.show === "Y") {
        var covLabel = heatMap.getLabelText(key, "COL", true);
        var covPct = parseInt(currentClassBar.height) / totalHeight;
        //scaled width of current bar
        var barWidth = SUM.rowClassBarWidth * covPct;
        //half the bar width minus half the font size for centered placement
        var halfBar = barWidth / 2 - 5;
        SUM.setLabelDivElement(
          key + "RowLabel",
          covLabel,
          topPos,
          covPos + halfBar,
          true,
        );
        //Set position to beginning of next bar
        covPos = covPos + barWidth;
      }
    }
  };

  SUM.removeColClassBarLabels = function () {
    var classLabels = document.getElementsByClassName("classLabel");
    while (classLabels.length > 0) {
      classLabels[0].parentNode.removeChild(classLabels[0]);
    }
  };

  SUM.drawColClassBarLabels = function () {
    const heatMap = MMGR.getHeatMap();
    SUM.removeColClassBarLabels();
    var classBarsConfig = heatMap.getColClassificationConfig();
    var classBarConfigOrder = heatMap.getColClassificationOrder();
    var classBarsData = heatMap.getColClassificationData();
    var prevHeight = 0;
    for (var i = 0; i < classBarConfigOrder.length; i++) {
      var key = classBarConfigOrder[i];
      var currentClassBar = classBarsConfig[key];
      if (currentClassBar.show === "Y") {
        SUM.drawColClassBarLabel(key, currentClassBar, prevHeight);
        prevHeight += parseInt(currentClassBar.height);
      }
    }
  };

  SUM.drawColClassBarLabel = function (key, currentClassBar, prevHeight) {
    //calculate where covariate bars end and heatmap begins by using the top items canvas (which is lined up with the heatmap)
    var beginClasses = SUM.cCCanvas.offsetTop;
    //get your horizontal start position (to the right of bars)
    var leftPos = SUM.canvas.offsetLeft + SUM.canvas.offsetWidth + 2;
    //find the first, middle, and last vertical positions for the bar legend being drawn
    var topPos = beginClasses + prevHeight;
    var midPos = topPos + (currentClassBar.height - 15) / 2 - 1;
    var midVal = MMGR.getHeatMap().getLabelText(key, "ROW", true);
    //Create div and place mid legend value
    SUM.setLabelDivElement(key + "ColLabel", midVal, midPos, leftPos, false);
  };

  SUM.setLabelDivElement = function (
    itemId,
    boundVal,
    topVal,
    leftVal,
    isRowVal,
  ) {
    //Create div and place high legend value
    var itemElem = document.getElementById(itemId);
    if (itemElem === null) {
      itemElem = document.createElement("Div");
      itemElem.id = itemId;
      itemElem.innerHTML = boundVal;
      itemElem.className = "classLabel";
      if (isRowVal) {
        itemElem.style.fontSize = "9pt";
        itemElem.style.fontFamily = "arial";
        itemElem.style.fontWeight = "bold";
        itemElem.style.transformOrigin = "left top";
        itemElem.style.transform = "rotate(90deg)";
        itemElem.style.webkitTransformOrigin = "left top";
        itemElem.style.webkitTransform = "rotate(90deg)";
      } else {
        itemElem.className = "classLabel";
      }
      SUM.chmElement.appendChild(itemElem);
    }
    itemElem.style.top = topVal + "px";
    itemElem.style.left = leftVal + "px";
  };

  SUM.drawColClassBarLegends = function () {
    const heatMap = MMGR.getHeatMap();
    var classBarsConfig = heatMap.getColClassificationConfig();
    var classBarConfigOrder = heatMap.getColClassificationOrder();
    var classBarsData = heatMap.getColClassificationData();
    var totalHeight = 0;
    for (var i = 0; i < classBarConfigOrder.length; i++) {
      var key = classBarConfigOrder[i];
      var currentClassBar = classBarsConfig[key];
      if (currentClassBar.show === "Y") {
        totalHeight += parseInt(currentClassBar.height);
      }
    }
    var prevHeight = 0;
    var fewClasses = classBarConfigOrder.length < 7 ? 2 : 0;
    for (var i = 0; i < classBarConfigOrder.length; i++) {
      var key = classBarConfigOrder[i];
      var currentClassBar = classBarsConfig[key];
      if (currentClassBar.show === "Y") {
        if (currentClassBar.bar_type !== "color_plot") {
          SUM.drawColClassBarLegend(
            key,
            currentClassBar,
            prevHeight,
            totalHeight,
            fewClasses,
          );
        }
        prevHeight += parseInt(currentClassBar.height);
      }
    }
  };

  // THIS FUNCTION NOT CURRENTLY CALLED BUT MAY BE ADDED BACK IN IN THE FUTURE
  SUM.drawColClassBarLegend = function (
    key,
    currentClassBar,
    prevHeight,
    totalHeight,
    fewClasses,
  ) {
    //calculate where covariate bars end and heatmap begins by using the top items canvas (which is lined up with the heatmap)
    var rowCanvas = document.getElementById("summary_row_top_items_canvas");
    var classHgt = SUM.canvas.offsetHeight - rowCanvas.offsetHeight;
    //calculate where the previous bar ends and the current one begins.
    var prevEndPct = prevHeight / totalHeight;
    var currEndPct =
      (prevHeight + parseInt(currentClassBar.height)) / totalHeight;
    //calculate where covariate bars begin and end and use that to calculate the total covariate bars height
    var beginClasses = SUM.canvas.offsetTop - 6;
    var endClasses = beginClasses + classHgt - 2;
    var classHeight = endClasses - beginClasses;
    //get your horizontal start position (to the right of bars)
    var leftPos = SUM.canvas.offsetLeft + SUM.canvas.offsetWidth;
    //find the first, middle, and last vertical positions for the bar legend being drawn
    var topPos = beginClasses + classHeight * prevEndPct + fewClasses;
    var endPos = beginClasses + classHeight * currEndPct + fewClasses;
    var midPos = topPos + (endPos - topPos) / 2;
    //Get your 3 values for the legend.
    var highVal = parseInt(currentClassBar.high_bound);
    var lowVal = parseInt(currentClassBar.low_bound);
    var midVal = Math.round((highVal - lowVal) / 2 + lowVal);
    //extend values on legend to include decimal points if all values are below 1
    if (highVal <= 1) {
      highVal = parseFloat(currentClassBar.high_bound).toFixed(1);
      lowVal = parseFloat(currentClassBar.low_bound).toFixed(1);
      var midVal =
        (parseFloat(currentClassBar.high_bound) -
          parseFloat(currentClassBar.low_bound)) /
          2 +
        parseFloat(currentClassBar.low_bound);
      var midVal = midVal.toFixed(1);
    }
    SUM.setLegendDivElement(
      key + "SumHigh-",
      "-",
      topPos,
      leftPos,
      false,
      true,
    );
    SUM.setLegendDivElement(
      key + "SumHigh",
      highVal,
      topPos + 4,
      leftPos + 3,
      false,
      true,
    );
    //Create div and place mid legend value
    SUM.setLegendDivElement(
      key + "SumMid",
      "- " + midVal,
      midPos,
      leftPos,
      false,
      true,
    );
    //Create div and place low legend value
    SUM.setLegendDivElement(
      key + "SumLow",
      lowVal,
      endPos - 3,
      leftPos + 3,
      false,
      true,
    );
    SUM.setLegendDivElement(key + "SumLow-", "-", endPos, leftPos, false, true);
  };

  SUM.drawColorPlotRowClassBar = function drawColorPlotRowClassBar(
    renderBuffer,
    pos,
    barWidth,
    classBarValues,
    classBarLength,
    colorMap,
    widthScale,
    heightScale,
  ) {
    const dataBuffer = renderBuffer.pixels;
    const pixelsToDraw = (barWidth - SUM.rowClassPadding) * widthScale;
    const rowSkip = (renderBuffer.width - pixelsToDraw) * DRAW.BYTE_PER_RGBA;
    for (let j = classBarLength; j > 0; j--) {
      // Determine color of the current element.
      let val = classBarValues[j - 1];
      let color = colorMap.getClassificationColor(val);
      if (val == "null") {
        color = CMM.hexToRgba(colorMap.getMissingColor());
      }
      // Output heightScale rows of the element's color.
      for (let i = 0; i < heightScale; i++) {
        // Output barWidth copies of color.
        for (let k = 0; k < pixelsToDraw; k++) {
          dataBuffer[pos] = color["r"];
          dataBuffer[pos + 1] = color["g"];
          dataBuffer[pos + 2] = color["b"];
          dataBuffer[pos + 3] = color["a"];
          pos += DRAW.BYTE_PER_RGBA; // 4 bytes per color
        }
        // Skip to start of bar in next output row.
        pos += rowSkip;
      }
    }
    return pos;
  };

  SUM.drawScatterBarPlotRowClassBar = function (
    renderBuffer,
    offset,
    height,
    classBarValues,
    covariateBar,
    widthScale,
    heightScale,
  ) {
    // height is the width of the covariate bar
    // Matrix is a vector of length height*widthScale
    // Each element of matrix is a vector of length classBarValues.length
    const matrix = SUM.buildScatterBarPlotMatrix(
      height,
      widthScale,
      classBarValues,
      covariateBar,
    );
    const colors = covariateBar.getScatterBarPlotColors();
    const dataBuffer = renderBuffer.pixels;
    for (let h = matrix[0].length - 1; h >= 0; h--) {
      // Output one row covariate.  Draw the first row.
      const firstRowPos = offset;
      let pos = firstRowPos;
      for (let i = 0; i < matrix.length; i++) {
        const { r, g, b, a } = colors[matrix[i][h]];
        dataBuffer[pos] = r;
        dataBuffer[pos + 1] = g;
        dataBuffer[pos + 2] = b;
        dataBuffer[pos + 3] = a;
        pos += DRAW.BYTE_PER_RGBA;
      }
      // Advance one output row.
      offset += renderBuffer.width * DRAW.BYTE_PER_RGBA;
      // Each row covariate requires a total of heightScale repetitions.
      // Duplicate the first row if needed.
      const bytesToDup = matrix.length * DRAW.BYTE_PER_RGBA;
      for (let rep = 1; rep < heightScale; rep++) {
        for (let i = 0; i < bytesToDup; i++) {
          dataBuffer[offset + i] = dataBuffer[firstRowPos + i];
        }
        // Advance one output row.
        offset += renderBuffer.width * DRAW.BYTE_PER_RGBA;
      }
    }
  };

  //THIS FUNCTION NOT CURRENTLY FOR THE SUMMARY PANEL CALLED BUT MAY BE ADDED BACK IN IN THE FUTURE
  SUM.drawRowClassBarLegends = function () {
    const heatMap = MMGR.getHeatMap();
    var classBarsConfig = heatMap.getRowClassificationConfig();
    var classBarConfigOrder = heatMap.getRowClassificationOrder();
    var classBarsData = heatMap.getRowClassificationData();
    var totalHeight = 0;
    for (var i = 0; i < classBarConfigOrder.length; i++) {
      var key = classBarConfigOrder[i];
      var currentClassBar = classBarsConfig[key];
      if (currentClassBar.show === "Y") {
        totalHeight += parseInt(currentClassBar.height);
      }
    }
    var prevHeight = 0;
    for (var i = 0; i < classBarConfigOrder.length; i++) {
      var key = classBarConfigOrder[i];
      var currentClassBar = classBarsConfig[key];
      if (currentClassBar.show === "Y") {
        if (currentClassBar.bar_type !== "color_plot") {
          SUM.drawRowClassBarLegend(
            key,
            currentClassBar,
            prevHeight,
            totalHeight,
            i,
          );
        }
        prevHeight += parseInt(currentClassBar.height);
      }
    }
  };

  SUM.drawRowClassBarLegend = function (
    key,
    currentClassBar,
    prevHeight,
    totalHeight,
    i,
  ) {
    var colCanvas = document.getElementById("summary_col_top_items_canvas");
    var classHgt = colCanvas.offsetLeft - SUM.canvas.offsetLeft;
    var prevEndPct = prevHeight / totalHeight;
    var currEndPct =
      (prevHeight + parseInt(currentClassBar.height)) / totalHeight;
    var beginClasses = SUM.canvas.offsetLeft - 6;
    var endClasses = beginClasses + classHgt - 2;
    var classesHeight = endClasses - beginClasses;
    var beginPos =
      beginClasses + classesHeight * prevEndPct + SUM.rowClassPadding * (i + 1);
    var endPos =
      beginClasses + classesHeight * currEndPct - SUM.rowClassPadding;
    var midPos = beginPos + (endPos - beginPos) / 2;
    var highVal = parseFloat(currentClassBar.high_bound);
    var lowVal = parseFloat(currentClassBar.low_bound);
    var midVal = Math.round((highVal - lowVal) / 2 + lowVal);
    //adjust display values for 0-to-1 ranges
    if (highVal <= 1) {
      highVal = parseFloat(currentClassBar.high_bound).toFixed(1);
      lowVal = parseFloat(currentClassBar.low_bound).toFixed(1);
      var midVal =
        (parseFloat(currentClassBar.high_bound) -
          parseFloat(currentClassBar.low_bound)) /
          2 +
        parseFloat(currentClassBar.low_bound);
      var midVal = midVal.toFixed(1);
    }
    var rowCanvas = document.getElementById("summary_row_top_items_canvas");
    var topPos = rowCanvas.offsetTop + rowCanvas.offsetHeight + 5;
    //Create div and place high legend value
    SUM.setLegendDivElement(
      key + "SumHigh",
      "-" + lowVal,
      topPos,
      beginPos,
      true,
    );
    //Create div and place middle legend value
    SUM.setLegendDivElement(key + "SumMid", "-" + midVal, topPos, midPos, true);
    //Create div and place middle legend value
    SUM.setLegendDivElement(
      key + "SumLow",
      "-" + highVal,
      topPos,
      endPos,
      true,
    );
  };

  SUM.setLegendDivElement = function (
    itemId,
    boundVal,
    topVal,
    leftVal,
    isRowVal,
  ) {
    //Create div and place high legend value
    var itemElem = document.getElementById(itemId);
    if (itemElem === null) {
      itemElem = document.createElement("Div");
      itemElem.id = itemId;
      itemElem.innerHTML = boundVal;
      itemElem.className = "classLegend";
      if (isRowVal) {
        itemElem.style.transform = "rotate(90deg)";
      }
      SUM.chmElement.appendChild(itemElem);
    }
    itemElem.style.top = topVal + "px";
    itemElem.style.left = leftVal + "px";
  };

  // Return a matrix for drawing a scatter or bar plot for barValues and covariateBar.
  //
  // The returned matrix:
  // - contains values: 0 (bg color index), 1 (fg color index), or 2 (cut color index).
  // - has height*heightScale rows and barValues.length columns.
  //
  // The matrix orientation corresponds to column covariate bars.  It will need to be
  // 'transposed' for row covariate bars.
  //
  // Rendering of the scatter/bar plot is determined by the covariateBar properties
  // bar_type, low_bound, and high_bound.
  //
  SUM.buildScatterBarPlotMatrix = function (
    height,
    heightScale,
    barValues,
    covariateBar,
  ) {
    const matrix = new Array(height * heightScale);
    const isBarPlot = covariateBar.bar_type !== "scatter_plot";
    for (let j = 0; j < matrix.length; j++) {
      matrix[j] = new Uint8Array(barValues.length);
    }
    const highVal = parseFloat(covariateBar.high_bound);
    const lowVal = parseFloat(covariateBar.low_bound);
    const scaleVal = highVal - lowVal;
    for (let k = 0; k < barValues.length; k++) {
      let origVal = barValues[k];
      if (origVal === "!CUT!") {
        for (let l = 0; l < matrix.length; l++) {
          matrix[l][k] = 2;
        }
      } else {
        //For when the range is exclusive: Set for values out side range so that lower values register as the lowest value in the range
        //and higher values register as the highest value in the range. (Per Bradley Broom)
        if (origVal < lowVal) origVal = lowVal;
        if (origVal >= highVal) origVal = highVal;
        const adjVal = origVal - lowVal;
        const valScale = adjVal / scaleVal;
        const valHeight = Math.min(
          Math.round(matrix.length * valScale),
          matrix.length - 1,
        );
        if (origVal >= lowVal && origVal <= highVal) {
          // Start BarPlots at 0
          //       ScatterPlots from heightScale rows below the calculated height
          const lo = isBarPlot ? 0 : Math.max(0, valHeight - heightScale + 1);
          for (let l = lo; l <= valHeight; l++) {
            matrix[l][k] = 1;
          }
        }
      }
    }
    return matrix;
  };

  //Return the scaled heights of all covariate bars on the specified axis.
  //Hidden bars will have height zero.  The order of entries is fixed but
  //not specified.
  SUM.getSummaryCovariateBarHeights = function (axis) {
    return MMGR.getHeatMap()
      .getScaledVisibleCovariates(axis, 1.0)
      .map((bar) => SUM.getScaledHeight(bar.height, axis));
  };

  //Return the total scaled heights of all covariate bars on the specified axis.
  SUM.calculateSummaryTotalClassBarHeight = function (axis) {
    return SUM.getSummaryCovariateBarHeights(axis).reduce((t, h) => t + h, 0);
  };

  // Return true iff the Summary View is visible (i.e. contained in a visible pane).
  SUM.isVisible = function isVisible() {
    if (SUM.chmElement === null) return false;
    const loc = PANE.findPaneLocation(SUM.chmElement);
    if (loc.pane.style.display === "none") return false;
    return !loc.pane.classList.contains("collapsed");
  };

  //***************************//
  //Selection Label Functions *//
  //***************************//

  // Redraw the summary pane.  Prerequisite: summary pane layout is valid.
  // To make resizing smoother, we break drawing into two phases.
  // In phase 1, we draw enough to give the user reasonable feedback during resizing, but
  // avoid time-consuming operations.
  // We also set a timeout to perform the remaining "Phase 2" drawing operations.
  // However, for as long as redrawSummaryPane is called again before that timeout fires,
  // we postpone phase 2 drawing so that it is only performed during a lull in updates.
  (function () {
    var T = 0;
    var XT = 0;

    SUM.redrawSummaryPane = function redrawSummaryPane() {
      const debug = false;
      if (debug)
        console.log({
          m: "redrawSummaryPane",
          rowDendro: SUM.rowDendro,
          colDendro: SUM.colDendro,
        });
      if (SUM.chmElement && T === 0) {
        if (XT !== 0) {
          window.clearTimeout(XT);
          XT = 0;
        }
        T = window.requestAnimationFrame(() => {
          T = 0;
          if (SUM.rowDendro) SUM.rowDendro.draw();
          if (SUM.colDendro) SUM.colDendro.draw();
          SUM.clearSelectionMarks();
          SUM.clearTopItems();
          if (document.getElementById("missingSumRowClassBars"))
            DVW.removeLabels("missingSumRowClassBars");
          if (document.getElementById("missingSumColClassBars"))
            DVW.removeLabels("missingSumColClassBars");
          XT = window.setTimeout(() => {
            XT = 0;
            SUM.buildRowClassTexture();
            SUM.buildColClassTexture();
            if (debug) {
              console.log("Drawing summary heatmap:");
              console.log({
                layout: SUM.layout,
                top: SUM.canvas.style.top,
                left: SUM.canvas.style.left,
                height: SUM.canvas.style.height,
                width: SUM.canvas.style.width,
              });
            }
            SUM.buildSummaryTexture();
            SUM.drawLeftCanvasBox();
            SUM.setSelectionDivSize();
            SUM.drawSelectionMarks();
            SUM.drawMissingRowClassBarsMark();
            SUM.drawMissingColClassBarsMark();
            SUM.drawTopItems();
            if (SUM.flagDrawClassBarLabels) {
              SUM.drawColClassBarLabels();
              SUM.drawRowClassBarLabels();
            }
            //		SUM.drawColClassBarLegends(); Removed for the time being
            //		SUM.drawRowClassBarLegends();
          }, 48);
        });
      }
    };
  })();

  SUM.initSummarySize = function () {
    SUM.setTopItemsSize();
    SUM.calcSummaryLayout();
  };

  // Calculate the summary NGCHM's layout based on the newly adjusted size of its enclosing pane.
  SUM.calcSummaryLayout = function () {
    const debug = false;

    if (SUM.chmElement && SUM.canvas) {
      SUM.setTopItemsSize();

      const selectCanvasSize = 10;
      //Leave room for labels in GUI Builder "summary only" screens
      let colLabelTopItemsHeight = SUM.flagDrawClassBarLabels === true ? 70 : 0;
      let rowLabelTopItemsWidth = SUM.flagDrawClassBarLabels === true ? 110 : 0;
      //Check to see if top items is longer than labels (if labels are drawn)
      colLabelTopItemsHeight =
        colLabelTopItemsHeight < SUM.colTopItemsWidth
          ? SUM.colTopItemsWidth
          : colLabelTopItemsHeight;
      rowLabelTopItemsWidth =
        rowLabelTopItemsWidth < SUM.rowTopItemsHeight
          ? SUM.rowTopItemsHeight
          : rowLabelTopItemsWidth;

      const layout = {
        borderThickness: 1,
        marginThickness: 1,
        colTopItems: {
          top: 0,
          left: 0,
          height: selectCanvasSize + colLabelTopItemsHeight,
          width: 0,
        },
        rowTopItems: {
          top: 0,
          left: 0,
          height: 0,
          width: selectCanvasSize + rowLabelTopItemsWidth,
        },
        colSelection: { top: 0, left: 0, height: selectCanvasSize, width: 0 },
        rowSelection: { top: 0, left: 0, height: 0, width: selectCanvasSize },
        colDendro: { top: 0, left: 0, height: 0, width: 0 },
        rowDendro: { top: 0, left: 0, height: 0, width: 0 },
        colClassBars: { top: 0, left: 0, height: 0, width: 0 },
        rowClassBars: { top: 0, left: 0, height: 0, width: 0 },
        matrix: { top: 0, left: 0, height: 0, width: 0 },
      };
      SUM.layout = layout;

      // Y-axis: (topItems + margin) + colSelections + mapBorder + map + mapBorder + (margin + colClassBars) + (margin + colDendrogram)
      let ydecor = layout.colSelection.height + 2 * layout.borderThickness;
      if (layout.colTopItems.height > 0) {
        ydecor += layout.colTopItems.height + layout.marginThickness;
      }
      if (SUM.colClassBarHeight > 0) {
        ydecor += layout.marginThickness;
      }
      const hFrac = SUM.colDendro ? SUM.colDendro.getConfigSize() : 0;
      if (hFrac > 0) {
        ydecor += layout.marginThickness;
      }
      //const ytotal = Math.floor (SUM.chmElement.clientHeight * SUM.heightPct) - 35;
      const ytotal = Math.floor(SUM.chmElement.clientHeight) - 1;
      let ccBarHeight = SUM.colClassBarHeight;
      const yScale = Math.min(
        1.0,
        (ytotal / 2 - ydecor) / (ccBarHeight + (ytotal / 2) * hFrac),
      );
      // console.log ({ ydecor, ccBarHeight, hFrac, ytotal, yScale });

      layout.colClassBars.height = Math.floor(yScale * SUM.colClassBarHeight);
      layout.colDendro.height = Math.floor(
        (ytotal - ydecor - layout.colClassBars.height) *
          (hFrac / (1 + hFrac)) *
          yScale,
      );
      layout.matrix.height = Math.floor(
        ytotal - ydecor - layout.colClassBars.height - layout.colDendro.height,
      );
      //console.log ({ ytotal, ydecor, colClassBarsHeight: layout.colClassBars.height, colDendroHeight: layout.colDendro.height, matrixHeight: layout.matrix.height });

      // X-axis: (rowDendrogram + margin) + (rowClassBars + margin) + mapBorder + map + mapBorder + rowSelections + (margin + rowTopItems)
      let xdecor = layout.rowSelection.width + 2 * layout.borderThickness;
      if (layout.rowTopItems.width > 0) {
        xdecor += layout.rowTopItems.width + layout.marginThickness;
      }
      if (SUM.rowClassBarWidth > 0) {
        xdecor += layout.marginThickness;
      }
      const wFrac = SUM.rowDendro ? SUM.rowDendro.getConfigSize() : 0;
      if (wFrac > 0) {
        xdecor += layout.marginThickness;
      }
      const xtotal = SUM.chmElement.clientWidth; // * SUM.widthPct;
      let rcBarWidth = SUM.rowClassBarWidth;
      const xScale = Math.min(
        1.0,
        (xtotal / 2 - xdecor) / (rcBarWidth + (xtotal / 2) * wFrac),
      );
      //console.log ({ xdecor, rcBarWidth, wFrac, xtotal, xScale });

      layout.colClassBars.top =
        layout.colDendro.height > 0
          ? layout.colDendro.height + layout.marginThickness
          : 0;
      layout.matrix.top =
        layout.colClassBars.top +
        (layout.colClassBars.height > 0
          ? layout.colClassBars.height + layout.marginThickness
          : 0) +
        layout.borderThickness;
      layout.colSelection.top =
        layout.matrix.top + layout.matrix.height + layout.borderThickness;

      layout.rowClassBars.width = Math.floor(xScale * SUM.rowClassBarWidth);
      layout.rowDendro.width = Math.floor(
        (xtotal - xdecor - layout.rowClassBars.width) *
          (wFrac / (1 + wFrac)) *
          xScale,
      );
      layout.matrix.width = Math.floor(
        xtotal - xdecor - layout.rowClassBars.width - layout.rowDendro.width,
      );

      layout.rowClassBars.left =
        layout.rowDendro.width > 0
          ? layout.rowDendro.width + layout.marginThickness
          : 0;
      layout.matrix.left =
        layout.rowClassBars.left +
        (layout.rowClassBars.width > 0
          ? layout.rowClassBars.width + layout.marginThickness
          : 0) +
        layout.borderThickness;
      layout.rowSelection.left =
        layout.matrix.left + layout.matrix.width + layout.borderThickness;

      layout.colDendro.width = layout.matrix.width;
      layout.colDendro.left = layout.matrix.left;
      layout.colTopItems.width = layout.matrix.width;
      layout.colTopItems.left = layout.matrix.left;
      layout.colSelection.width = layout.matrix.width;
      layout.colSelection.left = layout.matrix.left;
      layout.colClassBars.width = layout.matrix.width;
      layout.colClassBars.left = layout.matrix.left;

      layout.rowDendro.height = layout.matrix.height;
      layout.rowDendro.top = layout.matrix.top;
      layout.rowTopItems.height = layout.matrix.height;
      layout.rowTopItems.top = layout.matrix.top;
      layout.rowSelection.height = layout.matrix.height;
      layout.rowSelection.top = layout.matrix.top;
      layout.rowClassBars.height = layout.matrix.height;
      layout.rowClassBars.top = layout.matrix.top;

      layout.colTopItems.top = layout.colSelection.top;
      layout.rowTopItems.left = layout.rowSelection.left;

      if (debug) console.log(layout);

      UTIL.setElementPositionSize(SUM.rCCanvas, layout.rowClassBars, true);
      UTIL.setElementPositionSize(SUM.cCCanvas, layout.colClassBars, true);
      SUM.setSelectionDivSize(layout);

      if (SUM.rowDendro)
        UTIL.setElementPositionSize(
          SUM.rowDendro.dendroCanvas,
          layout.rowDendro,
        );
      if (SUM.colDendro)
        UTIL.setElementPositionSize(
          SUM.colDendro.dendroCanvas,
          layout.colDendro,
        );
      UTIL.setElementPositionSize(SUM.canvas, layout.matrix, true);
      UTIL.setElementPositionSize(SUM.boxCanvas, layout.matrix, false);
    }
  };

  // Clear and redraw the selection marks on both axes.
  SUM.redrawSelectionMarks = function () {
    SUM.clearSelectionMarks();
    SUM.drawSelectionMarks();
  };

  // Draw the selection marks on both axes.
  SUM.drawSelectionMarks = function () {
    SUM.drawAxisSelectionMarks("row");
    SUM.drawAxisSelectionMarks("column");
  };

  // Draw the selection marks on the specified axis.
  SUM.drawAxisSelectionMarks = function (axis) {
    const heatMap = MMGR.getHeatMap();
    const isRow = MAPREP.isRow(axis);
    const selection = SRCHSTATE.getAxisSearchResults(isRow ? "Row" : "Column");
    const canvas = document.getElementById(
      isRow ? "summary_row_select_canvas" : "summary_col_select_canvas",
    );
    if (canvas === null) {
      return;
    }
    const limit = isRow ? canvas.height : canvas.width;
    const scale = limit / heatMap.getTotalElementsForAxis(axis);
    const summaryRatio =
      axis === "Row"
        ? heatMap.getSummaryRowRatio()
        : heatMap.getSummaryColRatio();
    const minSelectionMarkSize =
      summaryRatio === 1 ? 1 : 2 * summaryRatio * window.devicePixelRatio;

    const marks = UTIL.getContigRanges(selection).map((range) => {
      let posn = Math.floor(range[0] * scale) - 1;
      let size = Math.ceil((range[1] - range[0]) * scale) + 1;
      if (size < minSelectionMarkSize) {
        const dposn = Math.floor((minSelectionMarkSize - size) / 2);
        const newposn = Math.max(0, posn - dposn);
        size = summaryRatio === 1 ? size : 2 * summaryRatio;
        posn = newposn + size <= limit ? newposn : limit - size;
      }
      return { posn, size };
    });

    const dataLayer = heatMap.getCurrentDataLayer();
    const darkenedColor = UTIL.shadeColor(dataLayer.selection_color, -25);

    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = darkenedColor;

    if (isRow) {
      marks.forEach((mark) =>
        ctx.fillRect(0, mark.posn, canvas.width, mark.size),
      );
    } else {
      marks.forEach((mark) =>
        ctx.fillRect(mark.posn, 0, mark.size, canvas.height),
      );
    }
  };

  SUM.drawMissingRowClassBarsMark = function () {
    if (document.getElementById("missingSumRowClassBars")) {
      DVW.removeLabels("missingSumRowClassBars");
      var x = SUM.canvas.offsetLeft;
      var y = SUM.canvas.offsetTop + SUM.canvas.clientHeight + 2;
      DVW.addLabelDivs(
        document.getElementById("sumlabelDiv"),
        "missingSumRowClassBars",
        "ClassBar MarkLabel",
        "...",
        "...",
        x,
        y,
        10,
        "T",
        null,
        "Row",
      );
    }
  };

  SUM.drawMissingColClassBarsMark = function () {
    if (document.getElementById("missingSumColClassBars")) {
      DVW.removeLabels("missingSumColClassBars");
      var x = SUM.canvas.offsetLeft + SUM.canvas.offsetWidth + 2;
      var y =
        SUM.canvas.offsetTop + SUM.canvas.clientHeight / SUM.totalHeight - 10;
      DVW.addLabelDivs(
        document.getElementById("sumlabelDiv"),
        "missingSumColClassBars",
        "ClassBar MarkLabel",
        "...",
        "...",
        x,
        y,
        10,
        "F",
        null,
        "Col",
      );
    }
  };

  SUM.clearSelectionMarks = function (searchTarget) {
    if (typeof searchTarget !== "undefined") {
      if (searchTarget === "Row") {
        SUM.clearRowSelectionMarks();
      } else if (searchTarget === "Column") {
        SUM.clearColSelectionMarks();
      } else {
        SUM.clearRowSelectionMarks();
        SUM.clearColSelectionMarks();
      }
    } else {
      SUM.clearRowSelectionMarks();
      SUM.clearColSelectionMarks();
    }
  };

  SUM.clearAxisSelectionMarks = function (axis) {
    if (MAPREP.isRow(axis)) SUM.clearRowSelectionMarks();
    else SUM.clearColSelectionMarks();
  };

  SUM.clearRowSelectionMarks = function () {
    var rowSel = document.getElementById("summary_row_select_canvas");
    if (rowSel) {
      var rowCtx = rowSel.getContext("2d");
      rowCtx.clearRect(0, 0, rowSel.width, rowSel.height);
    }
  };

  SUM.clearColSelectionMarks = function () {
    var colSel = document.getElementById("summary_col_select_canvas");
    if (colSel) {
      var colCtx = colSel.getContext("2d");
      colCtx.clearRect(0, 0, colSel.width, colSel.height);
    }
  };

  /******************************************************************************
   *
   * TopItem Related Functions
   *
   */
  {
    SUM.clearTopItems = function () {
      const oldMarks = document.getElementsByClassName("topItems");
      while (oldMarks.length > 0) {
        oldMarks[0].remove();
      }
      const colSel = document.getElementById("summary_col_top_items_canvas");
      if (colSel) {
        const colCtx = colSel.getContext("2d");
        colCtx.clearRect(0, 0, colSel.width, colSel.height);
      }
      const rowSel = document.getElementById("summary_row_top_items_canvas");
      if (rowSel) {
        const rowCtx = rowSel.getContext("2d");
        rowCtx.clearRect(0, 0, rowSel.width, rowSel.height);
      }
    };

    // Set the size required for the row and column top items.
    SUM.setTopItemsSize = function () {
      SUM.colTopItemsWidth = 0;
      SUM.rowTopItemsHeight = 0;

      if (SUM.colTopItems || SUM.rowTopItems) {
        // Create temporary element for measuring text properties.
        const p = UTIL.newElement("p.topItems");
        SUM.chmElement.appendChild(p);

        if (SUM.colTopItems) {
          SUM.colTopItemsWidth = calcTopItemsMaxWidth("column");
        }
        if (SUM.rowTopItems) {
          SUM.rowTopItemsHeight = calcTopItemsMaxWidth("row");
        }

        // Remove temporary measuring element.
        SUM.chmElement.removeChild(p);

        // Helper function. Determine maximum width of top items on the specified axis.
        function calcTopItemsMaxWidth(axis) {
          const shownLabels = MMGR.getHeatMap().shownLabels(axis);
          const topItems = getTopItemLabelIndices(axis);
          let maxWidth = 0;
          topItems.forEach((ti) => {
            p.innerText = shownLabels[ti];
            maxWidth = Math.max(maxWidth, p.clientWidth + 10); // Include a small margin in case of overlap.
          });
          return maxWidth;
        }
      }
    };

    // Draw the top items on the summary panel.
    SUM.drawTopItems = function () {
      // Remove/clear any existing top items.
      SUM.clearTopItems();
      SUM.colTopItemPosns = [];
      SUM.rowTopItemPosns = [];

      // Cannot draw top items if no summary panel.
      if (!SUM.chmElement) return;

      const summaryCanvas = document.getElementById("summary_canvas");
      if (summaryCanvas == null) {
        return;
      }

      const heatMap = MMGR.getHeatMap();

      if (SUM.colTopItems || SUM.rowTopItems) {
        // create a reference top item div to space the elements properly. removed at end
        const referenceItem = UTIL.newElement("div.topItems");
        referenceItem.innerText = "SampleItem";
        SUM.chmElement.appendChild(referenceItem);

        // draw the column top items
        if (SUM.colTopItems) {
          const colCanvas = document.getElementById(
            "summary_col_top_items_canvas",
          );
          if (colCanvas != null) {
            const labelIndices = getTopItemLabelIndices("column");
            const matrixW = SUM.matrixWidth;
            const colSumRatio = heatMap.getColSummaryRatio(
              MAPREP.SUMMARY_LEVEL,
            );
            SUM.colTopItemPosns = topItemPositions(
              labelIndices,
              matrixW,
              referenceItem.offsetHeight,
              colCanvas.width,
              colSumRatio,
            );

            // Draw curves from the top item map positions to the label positions.
            const colAdjust =
              matrixW < 200 ? summaryCanvas.offsetWidth / matrixW / 2 : 0;
            const colCtx = colCanvas.getContext("2d");
            colCtx.beginPath();
            SUM.colTopItemPosns.forEach((tip) => {
              const start =
                Math.round(tip.itemFrac * colCanvas.width) + colAdjust;
              const moveTo = tip.labelFrac * colCanvas.width;
              colCtx.moveTo(start, 0);
              colCtx.bezierCurveTo(start, 5, moveTo, 5, moveTo, 10);
            });
            colCtx.stroke();

            // Determine top position of the column top items.
            const colTop =
              summaryCanvas.offsetTop +
              summaryCanvas.offsetHeight +
              colCanvas.offsetHeight;
            placeTopItemLabels(colCanvas, SUM.colTopItemPosns, "col", colTop);
          }
        }

        // draw the row top items
        if (SUM.rowTopItems) {
          const rowCanvas = document.getElementById(
            "summary_row_top_items_canvas",
          );
          if (rowCanvas != null) {
            const labelIndices = getTopItemLabelIndices("row");
            const matrixH = SUM.matrixHeight;
            const rowSumRatio = heatMap.getRowSummaryRatio(
              MAPREP.SUMMARY_LEVEL,
            );
            SUM.rowTopItemPosns = topItemPositions(
              labelIndices,
              matrixH,
              referenceItem.offsetHeight,
              rowCanvas.height,
              rowSumRatio,
            );

            // Draw curves from the top item map positions to the label positions.
            const rowAdjust =
              matrixH < 200 ? summaryCanvas.offsetHeight / matrixH / 2 : 0;
            const rowCtx = rowCanvas.getContext("2d");
            rowCtx.beginPath();
            SUM.rowTopItemPosns.forEach((tip) => {
              const start =
                Math.round(tip.itemFrac * rowCanvas.height) + rowAdjust;
              const moveTo = tip.labelFrac * rowCanvas.height;
              rowCtx.moveTo(0, start);
              rowCtx.bezierCurveTo(5, start, 5, moveTo, 10, moveTo);
            });
            rowCtx.stroke();

            // Determine left position of the row top items.
            const rowLeft =
              summaryCanvas.offsetLeft +
              summaryCanvas.offsetWidth +
              rowCanvas.offsetWidth;
            placeTopItemLabels(rowCanvas, SUM.rowTopItemPosns, "row", rowLeft);
          }
        }
        referenceItem.remove();
      }

      // Helper functions for top items

      // Find the optional positions of a set of top items.
      //
      // Parameters:
      // - topItemsIndex: array of label indices. Must be a sorted array of non-negative integers.
      // - matrixSize   : number of rows/columns in the summary level matrix
      // - itemSize     : pixel width/height of each label along the label axis
      // - canvasSize   : width/height of the top item's label canvas
      // - summaryRatio : ratio between summary and detail matrices along the label axis
      //
      // Returns an array of top item positions.  Each element is an object containing
      // - labelIndex : index of the label for this top item
      // - itemFrac   : fraction of way along the canvas axis for this top item
      // - labelFrac  : fraction of way along the canvas axis for this top item's label
      //
      // The returned array may not contain entries for all top items in topItemsIndex.
      // In particular, it can be empty if no top items can be placed.
      //
      function topItemPositions(
        topItemsIndex,
        matrixSize,
        itemSize,
        canvasSize,
        summaryRatio,
      ) {
        if (!topItemsIndex || canvasSize === 0 || itemSize === 0) {
          return [];
        }

        // We divide the label axis into a fixed number of non-overlapping positions.
        // totalPositions is the number of such positions available, based on the canvas size
        // and the size of each label.
        const totalPositions = Math.round(canvasSize / itemSize) + 1;
        if (totalPositions < topItemsIndex.length) {
          return [];
        }

        // posList is an array of the top item in each possible top item position.
        // Create it with each element set to -1 (no top item in that position).
        const posList = Array.from({ length: totalPositions }, () => -1);

        // Determine the position of each top item.
        topItemsIndex.forEach((index) => {
          // Start with best position.
          let bestPos = Math.min(
            Math.round((index * totalPositions) / (summaryRatio * matrixSize)),
            posList.length - 1,
          );
          if (posList[bestPos] != -1) {
            // bestPos is occupied.

            // Determine if the clump of items here should be shifted left.
            let edge = clumpEdge(posList, bestPos);
            if (edge > -1) {
              // Move the clump one position to the left.
              // N.B. We know edge > 0 and posList[edge-1] is empty.
              //
              // Move posList[edge] to posList[edge-1] and advance edge
              // until we come to end of the clump (either the end of the
              // array or an unoccupied position).
              while (edge < posList.length && posList[edge] != -1) {
                posList[edge - 1] = posList[edge];
                edge++;
              }
              // Indicate that the last position we moved is now empty.
              posList[edge - 1] = -1;
            }

            // Find the next available slot (we know it must exist).
            // Since we are adding top items in increasing order, the
            // first available slot after the current clump is the
            // best available position.
            while (posList[bestPos] != -1) {
              bestPos++;
            }
          }
          // Put this top item into the position.
          posList[bestPos] = index;
        });

        // Construct a mapping from top items to their relative position
        // in the posList array.
        const relativePos = {};
        posList.forEach((v, i) => {
          if (v !== -1) relativePos[v] = i / posList.length;
        });

        return topItemsIndex.map((ii) => ({
          labelIndex: ii,
          itemFrac: ii / (summaryRatio * matrixSize),
          labelFrac: relativePos[ii],
        }));
      }

      // Determine if the clump of adjacent labels in the position array
      // should be moved one position to the left.  Position is the index
      // of any label in the clump (i.e. posList[position] != -1).
      //
      // Returns the index of the leftmost label in the clump if it should
      // be shifted or -1 otherwise.
      //
      // The clump should be shifted if:
      // - the clump is up against the right edge of posList, OR
      // - the clump contains an even number of labels AND
      //   the clump is NOT up against the left edge of posList.
      //
      // The first and third conditions above are necessary for correctness.
      // The second condition aims to keep clumps of labels roughly
      // centered around their ideal positions.
      function clumpEdge(posList, position) {
        // Determine the right edge of the clump.
        let rightEdge = position;
        while (rightEdge < posList.length - 1 && posList[rightEdge + 1] != -1) {
          rightEdge++;
        }

        // Determine the left edge of the clump.
        let leftEdge = position;
        while (leftEdge > 0 && posList[leftEdge - 1] != -1) {
          leftEdge--;
        }

        // If the clump should be shifted left, return the left edge.
        if (
          rightEdge == posList.length - 1 ||
          ((rightEdge - leftEdge + 1) % 2 == 0 && leftEdge > 0)
        ) {
          return leftEdge;
        } else {
          return -1;
        }
      }

      // Add a topItem label to SUM.chmElement for each topItem in
      // the topItemPosns array (returned from the topItemPosns
      // function above).
      function placeTopItemLabels(canvas, topItemPosns, axis, otherAxisPosn) {
        const isRow = MAPREP.isRow(axis);
        const shownLabels = MMGR.getHeatMap().shownLabels(axis);
        topItemPosns.forEach((tip) => {
          const item = document.createElement("Div");
          item.classList.add("topItems");
          item.axis = axis;
          item.index = tip.labelIndex;
          item.innerText = shownLabels[tip.labelIndex];
          if (!isRow) {
            item.style.transform = "rotate(90deg)";
          }
          SUM.chmElement.appendChild(item);
          if (isRow) {
            item.style.top =
              canvas.offsetTop +
              tip.labelFrac * canvas.clientHeight -
              item.offsetHeight / 2 +
              "px";
            item.style.left = otherAxisPosn + "px";
          } else {
            item.style.top = otherAxisPosn + item.offsetWidth / 2 + "px";
            item.style.left =
              canvas.offsetLeft +
              tip.labelFrac * canvas.clientWidth -
              item.offsetWidth / 2 +
              "px";
          }
        });
      }
    };

    // Return an array of the label indices of the top items on the specified axis.
    function getTopItemLabelIndices(axis) {
      const topItems = MAPREP.isRow(axis) ? SUM.rowTopItems : SUM.colTopItems;
      const mapLabels = MMGR.getHeatMap().actualLabels(axis);
      // Trim top items, filter out empty items, uniqify.
      const uniqTopItems = topItems
        .map((l) => l.trim())
        .filter((l) => l != "")
        .filter((v, i, a) => a.indexOf(v) === i);
      // Determine label indices of top items. Remove any top items that aren't labels.
      const labelIndices = uniqTopItems
        .map((ti) => mapLabels.indexOf(ti))
        .filter((idx) => idx >= 0);
      if (labelIndices.length > 10) labelIndices.splice(10); // Keep at most ten.
      // Sort remaining indices into increasing numerical order.
      labelIndices.sort((a, b) => a - b);
      return labelIndices;
    }
  } // END TopItems submodule.
})();
