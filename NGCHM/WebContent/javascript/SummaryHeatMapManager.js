(function() {
    'use strict';
    NgChm.markFile();

    // Define Namespace for NgChm SummaryHeatMapManager
    const SMM = NgChm.createNS('NgChm.SMM');

    const MAPREP = NgChm.importNS('NgChm.MAPREP');
    const MMGR = NgChm.importNS('NgChm.MMGR');
    const SUM = NgChm.importNS('NgChm.SUM');
    const DVW = NgChm.importNS('NgChm.DVW');
    const DMM = NgChm.importNS('NgChm.DMM');
    const PANE = NgChm.importNS('NgChm.Pane');
    const SRCH = NgChm.importNS('NgChm.SRCH');

    var mouseEventActive = false;
    var dragSelect = false;	  // Indicates if user has made a drag selection on the summary panel
    var clickStartRow = null;   // End row of current selected position
    var clickStartCol = null;   // Left column of the current selected position

    SMM.onMouseUpSelRowCanvas = function(evt) {
	    evt.preventDefault();
	    evt.stopPropagation();
	    //When doing a shift drag, this block will actually do the selection on mouse up.
	    var sumOffsetX = evt.touches ? evt.layerX : evt.offsetX;
	    var sumOffsetY = evt.touches ? evt.layerY : evt.offsetY;
	    var xPos = SUM.getCanvasX(sumOffsetX);
	    var yPos = SUM.getCanvasY(sumOffsetY);
	    var sumRow = SUM.canvasToMatrixRow(yPos) - Math.floor(DVW.getCurrentSumDataPerCol(DVW.primaryMap)/2);
	    DVW.setCurrentRowFromSum(DVW.primaryMap, sumRow);
	    DVW.primaryMap.updateSelection();
	    clickStartRow = null;
	    clickStartCol = null;
	    //Make sure the selected row/column are within the bounds of the matrix.
	    DVW.checkRow(DVW.primaryMap);
	    DVW.checkCol(DVW.primaryMap);
	    mouseEventActive = false;
	    SRCH.enableDisableSearchButtons (DVW.primaryMap);
    }

    SMM.onMouseUpSelColCanvas = function(evt) {
	    evt.preventDefault();
	    evt.stopPropagation();
	    //When doing a shift drag, this block will actually do the selection on mouse up.
	    var sumOffsetX = evt.touches ? evt.layerX : evt.offsetX;
	    var sumOffsetY = evt.touches ? evt.layerY : evt.offsetY;
	    var xPos = SUM.getCanvasX(sumOffsetX);
	    var yPos = SUM.getCanvasY(sumOffsetY);
	    var sumCol = SUM.canvasToMatrixCol(xPos) - Math.floor(DVW.getCurrentSumDataPerRow(DVW.primaryMap)/2);
	    DVW.setCurrentColFromSum(DVW.primaryMap, sumCol);
	    DVW.primaryMap.updateSelection();
	    clickStartRow = null;
	    clickStartCol = null;
	    //Make sure the selected row/column are within the bounds of the matrix.
	    DVW.checkRow(DVW.primaryMap);
	    DVW.checkCol(DVW.primaryMap);
	    mouseEventActive = false;
	    SRCH.enableDisableSearchButtons (DVW.primaryMap);
    }

    SMM.getTouchEventOffset = function (evt) {
	    var x, y;
	    if (evt.touches.length > 0){
		    var rect = evt.target.getBoundingClientRect();
		    x = sumOffsetX = Math.round(evt.targetTouches[0].pageX - rect.left);
		    y = sumOffsetY = Math.round(evt.targetTouches[0].pageY - rect.top);
	    } else {
		    var rect = evt.target.getBoundingClientRect();
		    x = sumOffsetX = Math.round(evt.changedTouches[0].pageX - rect.left);
		    y = sumOffsetY = Math.round(evt.changedTouches[0].pageY - rect.top);
	    }
	    return {"offsetX": x, "offsetY": y}
    };

    SMM.onMouseDownCanvas = function(evt) {
	    mouseEventActive = true;
	    evt.preventDefault();
	    evt.stopPropagation();
	    var boxY = ((SUM.colClassBarHeight)/SUM.canvas.height * SUM.boxCanvas.height);
	    var sumOffsetX = evt.touches ? SUM.getTouchEventOffset(evt).offsetX : evt.offsetX;
	    var sumOffsetY = evt.touches ? SUM.getTouchEventOffset(evt).offsetY : evt.offsetY;
	    var sumRow = SUM.canvasToMatrixRow(SUM.getCanvasY(sumOffsetY));
	    var sumCol = SUM.canvasToMatrixCol(SUM.getCanvasX(sumOffsetX));
	    if ((sumRow > 0) && (sumCol > 0)) {
		    SUM.canvas.style.cursor="crosshair";
	    }
	    const heatMap = MMGR.getHeatMap();
	    clickStartRow = (sumRow*heatMap.getRowSummaryRatio(MAPREP.SUMMARY_LEVEL));
	    clickStartCol = (sumCol*heatMap.getColSummaryRatio(MAPREP.SUMMARY_LEVEL));
    }

    SMM.onMouseOut = function(evt) {
	    if (dragSelect) {
		    SMM.onMouseUpCanvas(evt);
	    }
	    mouseEventActive = false;
	    SUM.canvas.style.cursor="default";
	    //Gotta redraw everything because of event cascade occurring when mousing out of the layers that contain the canvas
	    // (container and summary_chm) we set the right position mousing up on the canvas above, but move events are still coming in.
	    if (DVW.detailMaps.length > 0) { // only 'redraw everything' if there are detail maps showing
		    DVW.primaryMap.updateSelection();
	    }
    }

    SMM.onMouseMoveCanvas = function(evt) {
	    if (mouseEventActive) {
		    if (evt.which==1 || (evt.touches && evt.touches.length == 2)) {
			    if (evt.shiftKey || evt.touches) {
				    SMM.dragSelection(evt);
			    } else {
				    SMM.dragMove(evt);
			    }
		    }
	    }
    }

    //Translate click into row column position and then draw select box.
    SMM.onMouseUpCanvas = function(evt) {
	    if (mouseEventActive) {
		    evt.preventDefault();
		    evt.stopPropagation();
		    var clickSection = 'Matrix';
		    var sumOffsetX = evt.touches ? SUM.getTouchEventOffset(evt).offsetX : evt.offsetX;
		    var sumOffsetY = evt.touches ? SUM.getTouchEventOffset(evt).offsetY : evt.offsetY;
		    //When doing a shift drag, this block will actually do the selection on mouse up.
		    if (dragSelect) {
			    const heatMap = MMGR.getHeatMap();
			    var totalRows = heatMap.getNumRows(MAPREP.SUMMARY_LEVEL);
			    var totalCols = heatMap.getNumColumns(MAPREP.SUMMARY_LEVEL);
			    var xPos = SUM.getCanvasX(sumOffsetX);
			    var yPos = SUM.getCanvasY(sumOffsetY);
			    var sumRow = SUM.canvasToMatrixRow(yPos);
			    var sumCol = SUM.canvasToMatrixCol(xPos);
			    if (sumRow > totalRows) {sumRow = totalRows;}
			    if (sumCol > totalCols) {sumCol = totalCols;}
			    var clickEndRow = Math.max(sumRow*heatMap.getRowSummaryRatio(MAPREP.SUMMARY_LEVEL),1);
			    var clickEndCol = Math.max(sumCol*heatMap.getColSummaryRatio(MAPREP.SUMMARY_LEVEL),0);
			    var startRow = Math.max(Math.min(clickStartRow,clickEndRow),1);
			    var startCol = Math.max(Math.min(clickStartCol,clickEndCol)+1,1);
			    var endRow = Math.max(clickStartRow,clickEndRow);
			    var endCol = Math.max(clickStartCol,clickEndCol);
			    DVW.primaryMap.selectedIsDendrogram = false;
			    DMM.setSubRibbonView(DVW.primaryMap, startRow, endRow, startCol, endCol);
		    } else {
			    var xPos = SUM.getCanvasX(sumOffsetX);
			    var yPos = SUM.getCanvasY(sumOffsetY);
			    SMM.clickSelection(xPos, yPos);
			    clickStartRow = null;
			    clickStartCol = null;
		    }
		    dragSelect = false;
		    SUM.canvas.style.cursor="default";
		    //Make sure the selected row/column are within the bounds of the matrix.
		    if (DVW.primaryMap) {
			DVW.checkRow(DVW.primaryMap);
			DVW.checkCol(DVW.primaryMap);
			SRCH.enableDisableSearchButtons (DVW.primaryMap);
		    }
		    mouseEventActive = false;
	    }
    }

    SMM.clickSelection = function(xPos, yPos) {
	    if (!DVW.primaryMap) return;
	    var sumRow = SUM.canvasToMatrixRow(yPos) - Math.floor(DVW.getCurrentSumDataPerCol(DVW.primaryMap)/2);
	    var sumCol = SUM.canvasToMatrixCol(xPos) - Math.floor(DVW.getCurrentSumDataPerRow(DVW.primaryMap)/2);
	    DVW.setCurrentRowFromSum(DVW.primaryMap,sumRow);
	    DVW.setCurrentColFromSum(DVW.primaryMap,sumCol);
	    DVW.primaryMap.updateSelection();
	    SRCH.enableDisableSearchButtons (DVW.primaryMap);
    }

    SMM.dragMove = function(evt) {
	    if (!DVW.primaryMap) return;
	    var sumOffsetX = evt.touches ? SUM.getTouchEventOffset(evt).offsetX : evt.offsetX;
	    var sumOffsetY = evt.touches ? SUM.getTouchEventOffset(evt).offsetY : evt.offsetY;
	    var xPos = SUM.getCanvasX(sumOffsetX);
	    var yPos = SUM.getCanvasY(sumOffsetY);
	    var sumRow = SUM.canvasToMatrixRow(yPos) - Math.round(DVW.getCurrentSumDataPerCol(DVW.primaryMap)/2);
	    var sumCol = SUM.canvasToMatrixCol(xPos) - Math.round(DVW.getCurrentSumDataPerRow(DVW.primaryMap)/2);
	    DVW.setCurrentRowFromSum(DVW.primaryMap,sumRow);
	    DVW.setCurrentColFromSum(DVW.primaryMap,sumCol);
	    DVW.primaryMap.updateSelection();
	    SRCH.enableDisableSearchButtons (DVW.primaryMap);
	    MMGR.getHeatMap().setUnAppliedChanges(true);
    }

    //This function now is just in charge of drawing the green box in the summary side as
    //a shift drag is happening.  When mouse up occurs, the actual selection will be done.
    SMM.dragSelection = function(evt) {
	    const heatMap = MMGR.getHeatMap();
	    var totalRows = heatMap.getNumRows(MAPREP.SUMMARY_LEVEL);
	    var totalCols = heatMap.getNumColumns(MAPREP.SUMMARY_LEVEL);
	    var sumOffsetX = evt.offsetX;
	    var sumOffsetY = evt.offsetY;
	    if (evt.touches){
		    var rect = evt.target.getBoundingClientRect();
		    sumOffsetX = Math.round(evt.targetTouches[0].pageX - rect.left);
		    sumOffsetY = Math.round(evt.targetTouches[0].pageY - rect.top);
		    var initSumOffsetX = Math.round(evt.targetTouches[1].pageX - rect.left);
		    var initSumOffsetY = Math.round(evt.targetTouches[1].pageY - rect.top);
		    var sumRow = SUM.canvasToMatrixRow(SUM.getCanvasY(initSumOffsetY));
		    var sumCol = SUM.canvasToMatrixCol(SUM.getCanvasX(initSumOffsetX));

		    clickStartRow = (sumRow*heatMap.getRowSummaryRatio(MAPREP.SUMMARY_LEVEL));
		    clickStartCol = (sumCol*heatMap.getColSummaryRatio(MAPREP.SUMMARY_LEVEL));
	    }
	    var xPos = SUM.getCanvasX(sumOffsetX);
	    var yPos = SUM.getCanvasY(sumOffsetY);
	    var sumRow = SUM.canvasToMatrixRow(yPos);
	    var sumCol = SUM.canvasToMatrixCol(xPos);
	    if (sumRow > totalRows) {sumRow = totalRows;}
	    if (sumCol > totalCols) {sumCol = totalCols;}
	    var clickEndRow = Math.max(sumRow*heatMap.getRowSummaryRatio(MAPREP.SUMMARY_LEVEL),1);
	    var clickEndCol = Math.max(sumCol*heatMap.getColSummaryRatio(MAPREP.SUMMARY_LEVEL),0);
	    var startRow = Math.min(clickStartRow,clickEndRow);
	    var startCol = Math.min(clickStartCol,clickEndCol)+1;
	    if (startRow < 0 || startCol < 0){
		    return;
	    }
	    var endRow = Math.max(clickStartRow,clickEndRow);
	    var endCol = Math.max(clickStartCol,clickEndCol)+1;
	    dragSelect = true;
	    if (DVW.primaryMap) {
		DVW.primaryMap.dataPerRow = endCol - startCol;
		DVW.primaryMap.dataPerCol = endRow - startRow;
		DVW.primaryMap.currentRow = startRow;
		DVW.primaryMap.currentCol = startCol;
		SRCH.enableDisableSearchButtons (DVW.primaryMap);
	    }
	    SUM.drawLeftCanvasBox();
    }

    SMM.initSummaryEventHandlers = function() {
	    // Add necessary event listeners for canvas
	    document.getElementById('summary_row_select_canvas').addEventListener("mouseup", SMM.onMouseUpSelRowCanvas);
	    document.getElementById('summary_row_top_items_canvas').addEventListener("mouseup", SMM.onMouseUpSelRowCanvas);
	    document.getElementById('summary_col_select_canvas').addEventListener("mouseup", SMM.onMouseUpSelColCanvas);
	    document.getElementById('summary_col_top_items_canvas').addEventListener("mouseup", SMM.onMouseUpSelColCanvas);
	    SUM.canvas.onmousedown = SMM.onMouseDownCanvas;
	    SUM.canvas.onmouseup = SMM.onMouseUpCanvas;
	    SUM.canvas.onmousemove = SMM.onMouseMoveCanvas;
	    SUM.canvas.onmouseout = SMM.onMouseOut;
	    SUM.canvas.ontouchstart = SMM.onMouseDownCanvas;
	    SUM.canvas.ontouchmove = SMM.onMouseMoveCanvas;
	    SUM.canvas.ontouchend = SMM.onMouseUpCanvas;
    };

    // Function for resizing the summary map.
    // FIXME: BMB: Does not appear to be used.
    SMM.summaryResize = function() {
	var embedDiv = document.getElementById("NGCHMEmbed");
	if ((embedDiv !== null) && (embedDiv.style.display === 'none')) {
		return;
	}
	if (SUM.chmElement) {
		const loc = PANE.findPaneLocation (SUM.chmElement);
		SMM.summaryPaneResizeHandler (loc);
	}
    };

    (function() {
	    // Define a function to switch a panel to the summary view.
	    SMM.switchPaneToSummary = switchPaneToSummary;
	    PANE.registerPaneContentOption ('Summary heatmap', switchPaneToSummary);
	    SMM.summaryPaneResizeHandler = resizeSummaryPane;

	    // There is a single summary view that, at any particular time,
	    // may or may not be displayed in a visible pane.
	    // If a pane showing the summary view is switched to something else,
	    // we remove the summary view elements but preserve them in DIV#templates.
	    // These elements are then copied back into the DOM when switchPaneToSummary is called.

	    // SUM.chmElement is set to a DOM element iff the summary NG-CHM is
	    // contained in a visible pane.  If SUM.chmElement == null, the summary
	    // NG-CHM is not visible.

	    function switchPaneToSummary (loc) {
		    PANE.clearExistingDialogs(loc.pane.id);
		    if (SUM.chmElement) {
			    // The summary NGCHM is currently showing in a pane.
			    // Proceed only if the current and target panes are different.
			    const oldLoc = PANE.findPaneLocation (SUM.chmElement);
			    if (oldLoc.pane === loc.pane) return;
			    // Remove the summary NGCHM from its current pane
			    PANE.emptyPaneLocation (oldLoc);
		    }
		    PANE.emptyPaneLocation (loc);
		    initializeSummaryPanel(loc.pane);
		    PANE.setPaneTitle (loc, 'Heat Map Summary');
		    PANE.registerPaneEventHandler (loc.pane, 'empty', emptySummaryPane);
		    PANE.registerPaneEventHandler (loc.pane, 'resize', resizeSummaryPane);
		    loc.pane.dataset.title = 'Summary Heat Map';
		    loc.pane.dataset.intro = '<P>This panel shows an overview of the entire map.  Clicking on this map moves the primary detail panel to that location.</P>';
	    }

	    // Initialize summary information required for drawing summary views.
	    //
	    function initializeSummaryPanel (pane) {
		    if (SUM.chmElement !== null) {
			    // Execute at most once.
			    return;
		    }

		    SUM.chmElement = document.getElementById('summary_chm');
		    pane.appendChild (SUM.chmElement);
		    SUM.chmElement.style.display = '';
		    SUM.initSummaryDisplay();
		    SMM.initSummaryEventHandlers();

		    //Resize summary area for small or skewed maps.
		    SUM.canvas.width =  SUM.totalWidth;
		    SUM.canvas.height = SUM.totalHeight;
		    SUM.boxCanvas.width =  SUM.totalWidth;
		    SUM.boxCanvas.height = SUM.totalHeight;
		    SUM.rCCanvas.height = SUM.totalHeight;
		    SUM.cCCanvas.width =  SUM.totalWidth;

		    SUM.redrawSummaryPanel ();
	    };

	    // This function is called when a pane showing the summary NG-CHM is emptied.
	    // Save SUM.chmElement in templates and clear it.
	    function emptySummaryPane (pane, elements) {
		    document.getElementById ('templates').appendChild (SUM.chmElement);
		    SUM.chmElement = null;
	    }

	    // This function is called when a pane showing the summary NG-CHM is resized.
	    // Calculate a new layout and redraw the pane's contents.
	    function resizeSummaryPane (loc) {
		    if (document.getElementById('summary_chm') == null) {return;}
		    SUM.calcSummaryLayout();
		    SUM.redrawSummaryPane ();
	    }
    })();
})();

