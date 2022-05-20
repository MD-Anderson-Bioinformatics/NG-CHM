(function() {
    'use strict';
    NgChm.markFile();

    // Define Namespace for NgChm Dendrogram
    const DDR = NgChm.createNS('NgChm.DDR');

    const DMM = NgChm.importNS('NgChm.DMM');
    const SUM = NgChm.importNS('NgChm.SUM');
    const SEL = NgChm.importNS('NgChm.SEL');
    const MMGR = NgChm.importNS('NgChm.MMGR');
    const DEV = NgChm.importNS('NgChm.DEV');
    const DET = NgChm.importNS('NgChm.DET');
    const SRCH = NgChm.importNS('NgChm.SRCH');
    const PANE = NgChm.importNS('NgChm.Pane');
    const UTIL = NgChm.importNS('NgChm.UTIL');
    const LNK = NgChm.importNS('NgChm.LNK');

// About Dendrogram Coordinates.
//
// There are three 'levels' of dendrogram coordinates:
// - Application level coordinates, also known as 3N space.
//   The width of the dendrogram, which is always along the
//   leaves of the dendrogram, and is 3 units per leaf.
//   The height of the dendrogram is defined by the dendrogram
//   specification.
// - Unit coordinates.
//   The dendrogram scaled so that the *visible* part of the dendrogram has
//   width 1 and height 1.  The width is along the leaves of the dendrogram.
// - Canvas coordinates.
//   The dimensions are determined by the size of the viewport/canvas
//   and the orientation of the dendrogram.
//
// Dendrogram bars are stored and maniupulated in application level coordinates.
// For drawing, they are converted first to unit coordinates and then to
// device coordinates.
// Input events are converted from device coordinates to unit coordinates
// and then to application level coordinates.

// Size limits (in 3N space):
DDR.maxDendroHeight = 3000;
DDR.minDendroHeight = 500;
DDR.minDendroWidth = 500;

DDR.clearDendroSelection = function() {
	if (DMM.primaryMap && DMM.primaryMap.selectedStart != 0) {
		DMM.primaryMap.selectedStart = 0;
		DMM.primaryMap.selectedStop = 0;
		SUM.rowDendro.clearRibbonMode();
		SUM.colDendro.clearRibbonMode();
		if (!SEL.isSub) {
			const heatMap = MMGR.getHeatMap();
			if (heatMap.showRowDendrogram("summary")) {
				SUM.rowDendro.draw();
			}
			if (heatMap.showColDendrogram("summary")) {
				SUM.colDendro.draw();
			}
		}
	}
};

/*******************************************************************************
 *
 * Dendrograms are defined by three 'classes'
 *
 * - features/methods common to all dendrograms.
 * - features/methods common to either row or column dendrograms.
 * - features/methods common to either summary or detail dendrograms.
 */

//******************************************************************************
//
// Define properties and methods common to all dendrograms.
//
// All dendrograms contain an array of dendrogram bars:
// - Each bar consists of a left edge, a right edge, and a bar joining them at
//   a specified height.
// - The left and right edges may extend all the way to the base of the
//   dendrogram or may stop earlier if the edge joins to a lower bar.
// - Bars are ordered in ascending height.
//
// All dendrograms are displayed on a canvas.  The parameter canvasId is the id of
// the dendrogram's canvas element.
//
DDR.Dendrogram = function(canvas) {
	// The bars in this dendrogram:
	this.bars = [];
	// The canvas on which the dendrogram will be drawn:
//	this.dendroCanvas = document.getElementById(canvasId);
	this.dendroCanvas = canvas;

	// Returns the width of the dendrogram canvas.  Add a bit of padding below the leaves.
	this.getDivWidth = function() {
		return this.dendroCanvas.clientWidth + (this.axis === 'Row') * SUM.paddingHeight;
	};

	// Returns the height of the dendrogram canvas.  Add a bit of padding below the leaves.
	this.getDivHeight = function() {
		return this.dendroCanvas.clientHeight + (this.axis === 'Column') * SUM.paddingHeight;
	};

	// Return the proportion of the heat map element to use for the dendrogram.
	// 100 corresponds to 20% (determined by minDendroHeight).
	this.getConfigSize = function() {
		return this.dendroConfig.height / DDR.minDendroHeight;
	};

	// Determine if (y,x) is close to one of our bars.
	// If so, onhit is called with the index of the closest bar.
	// x,y must be in application level coordinates.
	this.checkDendroHit = function (y, x, onhit) {
		const debug = false;
		const vertSearchRadiusMax = (this.dendroViewHeight/20);
		const horSearchRadiusMax = (this.dendroViewWidth/60);
        	let bestDist = 1e10;
        	let bestIdx = -1;
		let bestWhere = '';
		function check (where, dh, dv, globalBarIdx, idx) {
			if (dh <= horSearchRadiusMax && dv <= vertSearchRadiusMax) {
				const d = dh*dh + dv*dv;
				if (d < bestDist) {
					bestDist = d;
					bestIdx = this.getLocalBarIndex (globalBarIdx, idx);
					bestWhere = where;
				}
			}
		}
        	for (let idx = 0; idx < this.bars.length; idx++) {
			const bar = this.bars[idx];
                        // Consider the top bar.
                        let dh = x < bar.left ? bar.left - x : x > bar.right ? x - bar.right : 0;
                        let dv = Math.abs (y - bar.height);
			check.call (this, 'b', dh, dv, -1, idx);
                        // Consider the left support.
                        dh = Math.abs(x - bar.left);
                        dv = y < bar.leftBot ? bar.leftBot - y : y > bar.height ? y - bar.height : 0;
			check.call (this, 'l', dh, dv, this.dendroData[bar.idx].left-1, idx);
                        // Consider the right support.
                        dh = Math.abs(x - bar.right);
                        dv = y < bar.rightBot ? bar.rightBot - y : y > bar.height ? y - bar.height : 0;
			check.call (this, 'r', dh, dv, this.dendroData[bar.idx].right-1, idx);
        	}
                if (debug) console.log (`Best bar (${x}, ${y}) : ${bestIdx} ${bestWhere} ${bestDist}`);
		if (bestIdx !== -1) {
			const bar = this.bars[bestIdx];
			if (debug) console.log (`height: ${bar.height} left: ${bar.left}, right: ${bar.right}`);
			onhit (bestIdx);
		}
	};
};


/*****************************************************************************
 *
 * Define properties and methods specific to column dendrograms.
 *
 * Column dendrograms are oriented 'naturally' so their width and
 * height match the orientation of the canvas.
 *
 */
DDR.ColumnDendrogram = function() {
	const debug = false;

	this.axis = 'Column';
	
	// Convert the xy position of the event e from canvas coordinates
	// to unit coordinates:
	// - w is the fraction along the leaves,
	// - h is the fraction between the base and the top.
	this.canvasEventPosn = function (e) {
		const w = event.offsetX / this.dendroCanvas.clientWidth;
		const h = (this.dendroCanvas.clientHeight-event.offsetY) / this.dendroCanvas.clientHeight;
		if (debug) console.log ({ w, h });
		return { w, h };
	};

	// Draw the dendrogram inside viewport vp of the jsdoc.
	this.drawPDF = function(jsdoc, vp) {
		if (debug) console.log({ vp });
		jsdoc.setDrawColor (0); // Black.
		const ctx = jsdoc.context2d;
		ctx.save();
		ctx.setLineCap ('square');
		ctx.setLineJoin ('square');
		const f = Math.floor;
		// Increase resolution over the jsdoc coordinate space (which defaults to 72-dpi)
		// by this factor:
		const resScale = 100;
		const h = f(resScale * vp.height);	// Logical height of the drawing space.
		const w = f(resScale * vp.width);	// Logical width of the drawing space.

		ctx.translate (vp.left, vp.top);
		ctx.scale (1.0/resScale, 1.0/resScale);

		// Draw the given bar into the viewport.
		// The bar's positions and heights must be in unit coordinates.
		function drawBar (bar) {
			// Convert unit coordinates to device coordinates.
			const left = f(bar.left * w);
			const right = f(bar.right * w);
			// Need to flip the verticle coordinates
			const barPosn = f(h - bar.height * h);
			const leftEnd = f(bar.leftBot * h);
			const rightEnd = f(bar.rightBot * h);

			// Draw the bar if it's within the viewport.
			if (barPosn >= 0 && barPosn < h) {
				ctx.moveTo (Math.max(0,left), barPosn);
				ctx.lineTo (Math.min(w,right), barPosn);
			}
			// Bar posn or the top edge of the viewport.
			const barPosnLim = Math.min(Math.max(0,barPosn), h-1);
			if (debug) console.log({ left, right, barPosn, leftEnd, rightEnd, barPosnLim });
			// Draw the left edge if it's within the viewport.
			if (left >= 0 && left < w && leftEnd < h) {
				ctx.moveTo (left, barPosnLim);
				ctx.lineTo (left, h - 1 - leftEnd);
			}
			// Draw the right edge if it's within the viewport.
			if (right >= 0 && right < w && rightEnd < h) {
				ctx.moveTo (right, barPosnLim);
				ctx.lineTo (right, h - 1 - rightEnd);
			}
		};

		// Get bars to draw in unit coordinates.
		const vv = this.getScaledView();

		// It is more efficient to draw as many bars per 'stroke' as possible.
		// So, we draw all bars of each type as a group.

		// Draw all thin bars.
		ctx.beginPath();
		ctx.setLineWidth (0);
		const thinBars = vv.filter(v => v.thickness === 1);
		thinBars.forEach(drawBar);
		ctx.stroke();

		// Draw all thick bars.
		ctx.beginPath();
		ctx.setLineWidth (1);
		const thickBars = vv.filter(v => v.thickness === 2);
		thickBars.forEach(drawBar);
		ctx.stroke();

		if (debug) console.log ('Thin bars: ' + thinBars.length + ', thick bars: ' + thickBars.length);
		ctx.restore();
	};

	// Draw the dendrogram into the canvas.
	this.drawView = function() {
		if (debug) console.log('> ColumnDendrogram.drawView');
		const f = Math.floor;
		const ctx = this.dendroCanvas.getContext("2d");
		const h = this.dendroCanvas.height;
		const w = this.dendroCanvas.width;
		ctx.fillStyle = "black";
		ctx.imageSmoothingEnabled = false;
		ctx.clearRect(0,0,w,h);

		const vv = this.getScaledView();
		vv.forEach( bar => {
			// Convert unit coordinates to canvas coordinates.
			const left = f(bar.left * w);
			const right = f(bar.right * w);
			const height = f(h - bar.height * h);
			const leftBot = f(bar.leftBot * h);
			const rightBot = f(bar.rightBot * h);
			// Draw bar if it's within the canvas.
			if (height < h) {
				const left0 = Math.max (0, left);
				ctx.fillRect (left0, height, Math.min(w,right+1)-left0, bar.thickness);
			}
			const sideTop = Math.min(Math.floor(bar.height*h), h);
			// Draw left edge if it's (partially) visible.
			if (left >= 0 && left < w && leftBot < h) {
				ctx.fillRect (left, h - sideTop, bar.thickness, sideTop - leftBot);
			}
			// Draw right edge if it's (partially) visible.
			if (right >= 0 && right < w && rightBot < h) {
				ctx.fillRect (right, h - sideTop, bar.thickness, sideTop - rightBot);
			}
		});
	};
};

// Define properties and methods specific to row dendrograms.
// 
// Row dendrograms are rotated 90 degrees to their 'natural'
// orientation.  So, the 'width' of the dendrogram is the height
// of the canvas, and their height is the width of the canvas.
//
DDR.RowDendrogram = function() {
	const debug = false;
	this.axis = 'Row';
	
	// Convert the xy position of the event from canvas coordinates
	// to unit coordinates:
	// - w is the fraction along the leaves,
	// - h is the fraction between the base(0) and the top(1).
	this.canvasEventPosn = function (e) {
		const w = event.offsetY / this.dendroCanvas.clientHeight;
		const h = (this.dendroCanvas.clientWidth-event.offsetX) / this.dendroCanvas.clientWidth;
		return { w, h };
	};

	// Draw the dendrogram within the viewport vp within jsdoc.
	this.drawPDF = function(jsdoc, vp) {
		if (debug) console.log({ vp });
		const f = Math.floor;
		jsdoc.setDrawColor (0); // Black.
		const ctx = jsdoc.context2d;
		ctx.save();
		ctx.setLineCap ('square');
		ctx.setLineJoin ('square');
		const resScale = 100;

		ctx.translate (vp.left, vp.top);
		ctx.scale (1.0/resScale, 1.0/resScale);

		const h = f(resScale * vp.height);
		const w = f(resScale * vp.width);
		function drawBar (v) {
			const left = f(v.left * h);
			const right = f(v.right * h);
			const barPosn = f(w - v.height * w);
			const leftEnd = f(v.leftBot * w);
			const rightEnd = f(v.rightBot * w);

			// Draw top bar if it's in range.
			if (barPosn >= 0 && barPosn < w) {
				ctx.moveTo (barPosn, Math.max(0,left));
				ctx.lineTo (barPosn, Math.min(h,right));
			}
			// Limit left and right edges to viewport if bar out of range.
			const barPosnLim = Math.min(Math.max(0,barPosn), w-1);
			if (debug) console.log({ left, right, barPosn, leftEnd, rightEnd, barPosnLim });
			// Draw left edge if it's (partly) in view
			if (left >= 0 && left < h && leftEnd < w) {
				ctx.moveTo (barPosnLim, left);
				ctx.lineTo (w - 1 - leftEnd, left);
			}
			// Draw right edge if it's (partly) in view
			if (right >= 0 && right < h && rightEnd < w) {
				ctx.moveTo (barPosnLim, right);
				ctx.lineTo (w - 1 - rightEnd, right);
			}
		}

		const vv = this.getScaledView();

		// Draw all thin bars.
		const thinBars = vv.filter(v => v.thickness === 1);
		ctx.beginPath();
		ctx.setLineWidth (0);
		thinBars.forEach( drawBar );
		ctx.stroke();

		// Draw all thick bars.
		ctx.beginPath();
		ctx.setLineWidth (1);
		const thickBars = vv.filter(v => v.thickness === 2);
		thickBars.forEach( drawBar );
		ctx.stroke();

		ctx.restore();
	};

	// Draw the dendrogram into the canvas, rotating by 90 degrees.
	this.drawView = function() {
		if (debug) console.log(`> RowDendrogram.drawView ${this.dendroCanvas.width}x${this.dendroCanvas.height}`);
		const f = Math.floor;
		const ctx = this.dendroCanvas.getContext("2d");
		const w = this.dendroCanvas.width;
		const h = this.dendroCanvas.height;
		ctx.fillStyle = "black";
		ctx.imageSmoothingEnabled = false;
		ctx.clearRect(0,0,w,h);

		const vv = this.getScaledView();
		vv.forEach( bar => {
			const left = f(bar.left * h);
			const right = f(bar.right * h);
			const height = f(w - bar.height * w);
			const leftBot = f(bar.leftBot * w);
			const rightBot = f(bar.rightBot * w);
			if (height < w) {
				const left0 = Math.max(0,left);
				ctx.fillRect (height, Math.max(0,left), bar.thickness, Math.min(h,right+1)-left0);
			}
			const sideTop = Math.min(Math.floor(bar.height*w), w);
			if (left >= 0 && left < h && leftBot < w) {
				ctx.fillRect (w - sideTop, left, sideTop - leftBot, bar.thickness);
			}
			if (right >= 0 && right < h && rightBot < w) {
				ctx.fillRect (w - sideTop, right, sideTop - rightBot, bar.thickness);
			}
		});
	};
};


/*****************************************************************************
 *
 * Define properties and methods applicable to summary dendrograms.
 *
 * Summary dendrograms set:
 * - the number of leaves in 3N space
 * - the spacing between adjacent leaves (points per leaf)
 * - an array of selected bars (set by the detail dendrogram)
 * - the chosen bar for ribbon mode selection
 *
 */
DDR.SummaryDendrogram = function(config, data, numLeaves) {

	const debug = false;

	this.dendroConfig = config;
	this.dendroData = data;
	this.numLeaves = numLeaves;

	this.isVisible = function() {
		return this.dendroConfig.show !== "NONE";
	};

	// Return the local index of the bar with index globalIdx.
	// If that bar doesn't exist locally, return idx.
	// Our bar indices *are* the global indices, so just return it.
	this.getLocalBarIndex = function (globalIdx, idx) {
		return globalIdx < 0 ? idx : globalIdx;
	};

	// Determine the height of the highest bar.
	this.maxHeight = this.dendroData.reduce((max,entry) => entry.height > max ? entry.height : max, 0);
	const numBars = this.dendroData.length;

	// Usually 3N space has three points per leaf, but really small dendrograms might need more.
	// BMB: Is the additional PPL still needed?
	const pointsPerLeaf = (function() {
		let PPL = 3;
		// Increase PPL if necessary so that matrixWidth is wide enough.
		if (PPL*numLeaves < DDR.minDendroWidth) {
			PPL = Math.round(DDR.minDendroWidth/numLeaves);
		} 
		return PPL;
	})();
	this.getPointsPerLeaf = function(){
		return pointsPerLeaf;
	};

	// Bars are stored in 'Dendrogram coordinates' aka 3N space.
	// Set the size of virtual 3N space in which the bars exist.  Normally there are PPL units of width
	// for each leaf and one unit of height for each bar.
	const normDendroWidth = pointsPerLeaf*numLeaves;
	const normDendroHeight = Math.min(Math.max(DDR.minDendroHeight,numBars),DDR.maxDendroHeight);

	// Returns the object's position in 3N space.
	// If objid is negative, return the position of the leaf 0-objid.
	// If objid is positive, return the center of the bar objid.
	this.findLocation = function (objid){
		if (objid < 0){
			const leafid = 0-objid; // make objid a positive number to find the leaf
			return (pointsPerLeaf*leafid-pointsPerLeaf/2);
		} else {
			const barid = objid - 1;
			return ((this.bars[barid].left + this.bars[barid].right)/2); // gets the middle point of the bar
		}
	};

	// Returns the left boundary of the object in 3N space.
	// If objid is negative, return the position of the leaf 0-objid.
	// If objid is positive, return the left edge of the leftmost descendent of bar objid-1.
	this.findLeftBoundary = function(objid){
		if (objid < 0){
			const leafid = 0-objid; // make objid a positive number to find the leaf
			return (pointsPerLeaf*leafid-pointsPerLeaf/2);
		} else {
			const barid = objid - 1;
			return this.bars[barid].leftBoundary; // gets the left edge of subtree
		}
	};

	// Returns the right boundary of the object in 3N space.
	// If objid is negative, return the position of the leaf 0-objid.
	// If objid is positive, return the right edge of the rightmost descendent of bar objid-1.
	this.findRightBoundary = function(objid){
		if (objid < 0){
			const leafid = 0-objid; // make objid a positive number to find the leaf
			return (pointsPerLeaf*leafid-pointsPerLeaf/2);
		} else {
			const barid = objid - 1;
			return this.bars[barid].rightBoundary; // gets the right edge of subtree
		}
	};

	// Create the dendrogram bars.
	// All bars in the dendrogram data are mapped into 3N space.
	// Each bar has a left edge, a right edge, and a bar joining them.
	// The edges may reach all the way to the base, or they may
	// terminate above that if the edge is to a lower bar.
	// All bars are stored in ascending order of the bar height.
	// 
	this.buildDendrogram = function () {
		const numNodes = this.dendroData.length;
		
		// Set the size of the 3N space.
		this.dendroViewHeight = normDendroHeight+1; // Add one for a space above top bar.
		this.dendroViewWidth = normDendroWidth;

                const scaleFactor = normDendroHeight/this.maxHeight;
		this.bars = this.dendroData.map((bar, index) => ({
		    idx: index,
                    height: Math.max(1, (bar.height*scaleFactor))
                }));
                // findLocation requires bar positions to be evaluated in order.
		for (let i = 0; i < numNodes; i++){
		    const bar = this.bars[i];
		    const dd = this.dendroData[i];
		    // Set horizontal position of the left and right edges.
                    bar.left = this.findLocation(dd.left);
                    bar.right = this.findLocation(dd.right);
		    // Set bottom of the left and right edges.
                    bar.leftBot = dd.left < 0 ? 0 : this.bars[dd.left-1].height;
                    bar.rightBot = dd.right < 0 ? 0 : this.bars[dd.right-1].height;
		    // Find the left- and right-most leaves of this bar.
		    bar.leftBoundary = this.findLeftBoundary(dd.left);
		    bar.rightBoundary = this.findRightBoundary(dd.right);
                }
	};
	if (this.dendroConfig.show !== 'NA') {
		this.buildDendrogram();
	}

	/*********************************************************************
	 *
	 * Support for dendrogram bar selection of ribbon mode.
	 *
	 */

	// In ribbon mode, this is the index of the bar that the user has selected.
	this.ribbonModeBar = -1;

	// Clear ribbon mode for this dendrogram.
	this.clearRibbonMode = function() {
		this.ribbonModeBar = -1;
		if (DMM.primaryMap) {
		    DMM.primaryMap.selectedStart = 0;
		    DMM.primaryMap.selectedStop = 0;
		}
	};

	// Enter/leave ribbon mode.  Called when the user has clicked near
	// a bar in the dendrogram.
	this.setRibbonMode = function (barIndex) {
		const sameBarClicked = barIndex === this.ribbonModeBar;
                if (debug) console.log ('Same bar clicked: ' + sameBarClicked);
		if (sameBarClicked) {
			this.clearRibbonMode();
			this.draw();
			DEV.callDetailDrawFunction('NORMAL');
		} else {
			// Clear any previous ribbon mode on either axis.
			SUM.rowDendro.clearRibbonMode();
			SUM.colDendro.clearRibbonMode();

			this.clearSelectionMarks();
			SRCH.clearSearchItems(this.axis);

			this.ribbonModeBar = barIndex;
			// Redraw both summary dendrograms:
			// - to highlight the newly selected bar on this axis
			// - to clear any highlighted bar on the other axis.
			SUM.rowDendro.draw();
			SUM.colDendro.draw();

			// Set start and stop coordinates
			if (DMM.primaryMap) {
			    const rmBar = this.bars[barIndex];
			    DMM.primaryMap.selectedStart = Math.round(rmBar.leftBoundary / pointsPerLeaf);
			    DMM.primaryMap.selectedStop = Math.round(rmBar.rightBoundary / pointsPerLeaf);
			    if (debug) console.log ({ rmBar, start: DMM.primaryMap.selectedStart, stop: DMM.primaryMap.selectedStop });
			}
			SRCH.showSearchResults();

			DEV.callDetailDrawFunction(this.axis === 'Row' ? 'RIBBONV' : 'RIBBONH');
		}
	};
	this.clearSelectionMarks = function () {
		SUM.clearAxisSelectionMarks(this.axis);
	};
	this.drawSelectionMarks = function () {
		SUM.drawAxisSelectionMarks(this.axis);
	};

	// Listen for click events on our canvas.
	this.dendroCanvas.addEventListener('click', e => this.subDendroClick(this.dendroCanvas, e));
	this.subDendroClick = function(element, event){
		const canvasPosn = this.canvasEventPosn (event);

		// Convert unit coordinates into application-level coordinates.
		const h3n = canvasPosn.h * this.dendroViewHeight;	// Vertical position in 3N space.
		const w3n = canvasPosn.w * this.dendroViewWidth;	// Horizontal position in 3N space.

		this.checkDendroHit (h3n, w3n, selectedBar => {
			this.setRibbonMode (selectedBar);
		});
	};
	
	/*********************************************************************
	 *
	 * Support for selecting bars.
	 *
	 * The user selects bars in the detail window.  We record their selection
	 * status here.
	 *
	 */
	// The user can select multiple bars in the dendrogram.  This array
	// stores a copy of each selected bar.
	this.selectedBars = [];
	this.getSelectedBars = function(){
		return this.selectedBars;
	};
	this.saveSelectedBars = function(bars) {
		// Get selected bars for adding to saved state.
		return this.selectedBars.map(bar => bar.idx);
	}
	this.restoreSelectedBars = function(bars) {
		// Restore selected bars from saved state.
		// Saved state is assumed to include the resulting selection separately.
		this.selectedBars = bars.map(idx => this.bars[idx]);
	};
	this.clearSelectedBars = function(){
		this.selectedBars = [];
	};
	
	this.addSelectedBar = function(barIdx, shift, ctrl){
		const selectedBar = this.bars[barIdx];
		var left = selectedBar.leftBoundary;
		var right = selectedBar.rightBoundary;
		var height = selectedBar.height;
		var selectLeft = Math.round((left+pointsPerLeaf/2)/pointsPerLeaf);
		var selectRight =Math.round((right+pointsPerLeaf/2)/pointsPerLeaf);
		var addBar = true;
		// is it a standard click?
		if (!shift && !ctrl){
			SRCH.clearSearchItems(this.axis);
			SRCH.setAxisSearchResults(this.axis, selectLeft, selectRight);
			SRCH.showSearchResults();
			
			this.selectedBars = [selectedBar];
			return;
		}
		var deleteBar = [];  // bars that need to be removed due to this new click
		for (var i in this.selectedBars){
			var bar = this.selectedBars[i];
			if (bar.left <= left && bar.right >= right && bar.height > height){
				addBar = false;
			} 
			if (bar.left >= left && bar.right <= right && bar.height-1 <= height){ // if the new selected bar is in the bounds of an older one... (-1 added to height since highlighted bars can cause issues without it)
				deleteBar.push(i);
				// remove all the search items that were selected by that old bar
				SRCH.clearAxisSearchItems(this.axis, selectLeft, selectRight);
				SUM.redrawSelectionMarks();
				if (bar.right == selectedBar.right && bar.height == selectedBar.height){ // a bar that's already selected has been selected so we remove it
					addBar = false;
				}
			}
		}
		
		for (var i = deleteBar.length-1; i > -1; i--){
			this.selectedBars.splice(deleteBar[i],1); // remove that old bar
		}
		
		var selectLeft = Math.round((left+pointsPerLeaf/2)/pointsPerLeaf);
		var selectRight = Math.round((right+pointsPerLeaf/2)/pointsPerLeaf);
		if (addBar){
			if (shift){
				SRCH.setAxisSearchResults(this.axis, selectLeft, selectRight);
				var numBars = this.selectedBars.length;
				var startIndex = 0, endIndex = -1;
				if (this.selectedBars[numBars-1]){
					if (this.selectedBars[numBars-1].right < left){
						startIndex = Math.round((this.selectedBars[numBars-1].right+pointsPerLeaf/2)/pointsPerLeaf);
						endIndex = selectLeft;
					} else if (right < this.selectedBars[numBars-1].left){
						startIndex = selectRight;
						endIndex = Math.round((this.selectedBars[numBars-1].left+pointsPerLeaf/2)/pointsPerLeaf);
					}
				} else if (DET.labelLastClicked[this.axis]){
					if (DET.labelLastClicked[this.axis] < left){
						startIndex = DET.labelLastClicked[this.axis];
						endIndex = selectLeft;
					} else if (right < DET.labelLastClicked[this.axis]){
						startIndex = selectRight;
						endIndex = DET.labelLastClicked[this.axis];
					}
				}
				
				SRCH.setAxisSearchResults(this.axis, startIndex, endIndex-1);
				this.selectedBars.push(selectedBar);
			} else if (ctrl) {
				SRCH.setAxisSearchResults(this.axis, selectLeft, selectRight);
				this.selectedBars.push(selectedBar);
			}
		}
	};

	// Generate a view of the dendrogram as vectors within a viewport of unit dimensions.
	// Note that width is always the size of the axis along the leaves of the dendrogram,
	// while height is the dimension that the bars rise above the base.
	var lastRibbonBar = -2;
	var lastVectorView;
        this._getScaledView = function() {
		// console.log (`Generating summary scale vector view ${height}x${width}`);
		// console.log (`Original view size: ${this.dendroViewHeight}x${this.dendroViewWidth}`);
		lastRibbonBar = this.ribbonModeBar;
                const xScale = 1.0/this.dendroViewWidth;
                const yScale = 1.0/this.dendroViewHeight;
		const ribbonBar = this.ribbonModeBar === -1 ? null : this.bars[this.ribbonModeBar];
		lastVectorView = this.bars.map(bar => {
                    const left = bar.left * xScale;
                    const right = bar.right * xScale;
                    const height = bar.height * yScale;
                    const leftBot = bar.leftBot * yScale;
                    const rightBot = bar.rightBot * yScale;
		    // Draw thicker lines if bar is within the extremes of the ribbonBar.
		    const thickness = (ribbonBar && bar.left >= ribbonBar.leftBoundary && bar.right <= ribbonBar.rightBoundary) + 1;
		    return ({ left, right, height, leftBot, rightBot, thickness });
		});
        };
	this.getScaledView = function() {
		if (this.ribbonModeBar !== lastRibbonBar) {
			this._getScaledView();
		}
		return lastVectorView;
	};

	this.draw = function(){
		// Summary view doesn't require rebuilding, so just draw it.
		if (this.isVisible()) {
			this.drawView();
		}
	};
};



/*****************************************************************************
 *
 * Define properties and methods specific to a detail dendrogram.
 *
 * Detail dendrograms (DD) are linked to a summary dendrogram (SD) from which
 * they obtain many of their properties, including:
 * - The universe of bars.
 * - 3N space (spacing between leaves, bar height scale).
 *
 * Properies specific to detail dendrograms include:
 * - a zoom level
 * - a view window (the DD includes only those bars in the SD that are at
 *   least partially visible in the view window).
 */

DDR.DetailDendrogram = function(summaryDendrogram) {

	this.summaryDendrogram = summaryDendrogram;
	this.dendroConfig = summaryDendrogram.dendroConfig;
	this.dendroData = summaryDendrogram.dendroData;
	this.maxHeight = summaryDendrogram.maxHeight;
	this.numLeaves = summaryDendrogram.numLeaves;

	const PPL = this.summaryDendrogram.getPointsPerLeaf(); 
	
	this.isVisible = function() {
		if (this.dendroConfig.show !== "ALL" || !this.dendroCanvas) {
		    return false;
		}
		const loc = PANE.findPaneLocation (this.dendroCanvas);
		return !loc.pane.classList.contains('collapsed');
	};

	// Return the local index of the bar with index globalIdx.
	// If that bar doesn't exist locally, return idx.
	this.getLocalBarIndex = function (globalIdx, idx) {
		if (globalIdx < 0) return idx;
		for (let lidx = 0; lidx < this.bars.length; lidx++) {
			if (this.bars[lidx].idx === globalIdx) {
				return lidx;
			}
		}
		return idx;
	};

	// Define the dendrogram bars that are currently within the detail window.
	// That is, for the numElements leaves starting from startIdx.
	this.windowStartIdx = -1;	// First bar in the detail window.
	this.windowNumElements = 0;	// Number of bars in the detail window.
	// Bars that (ignoring height) are at least partially within the window.
	this.windowBars = [];
	// Select the bars that are within the current detail window.
	this.selectWindowBars = function () {
		const win = this.getWindow();

		if (win.startIdx !== this.windowStartIdx || win.numElements !== this.windowNumElements || this.windowBars.length === 0) {
			// Convert the boundaries of the viewport into 3N space.
			function convertMapIndexTo3NSpace (index){
				return index*PPL - PPL/2;
			}
			this.start3NIndex = convertMapIndexTo3NSpace(win.startIdx);
			this.stop3NIndex = convertMapIndexTo3NSpace(win.startIdx+win.numElements);

			// Default height scale is the proportion of leaves in the view.
			this.heightRatio = this.numLeaves / win.numElements;

			// Number of columns in the view (in 3N space).
			this.dendroViewWidth = this.stop3NIndex - this.start3NIndex;

			// Half the width of a detail element in 3N space.
			this.halfBox = this.dendroViewWidth / win.numElements / 2;

			// Find all bars than occur somewhere in the detail window.
			// Note that all bar positions are in 3N space.
			this.windowStartIdx = win.startIdx;
			this.windowNumElements = win.numElements;
			this.windowBars = this.summaryDendrogram.bars.filter(bar => {
				// Accept bars that at least partially overlap viewport.
				// i.e. reject any bars that are completely to the left
				// or right of the detail window.
				return (bar.right >= this.start3NIndex && bar.left < this.stop3NIndex);
			});
			this.barsMaxHeight = -1; // Force height reselection.
		}
	};

	// Current zoom level.
	this.zoomLevel = 1;
	this.zoomInitialized = false;

	// Bars that are at least partially within the window.
	this.bars = [];
	this.barsMaxHeight = -1;

	this.setZoomLevel = function (zoomLevel) {
	    if (zoomLevel != undefined) {
		this.zoomLevel = +zoomLevel;
		this.zoomInitialized = true;
	    }
	};

	this.buildView = function () {
		// Step 1: select bars between the left and right edges of the window.
		this.selectWindowBars();
		if (this.windowBars.length === 0) {
			/* Can't imagine a case where this occurs, but just in case. */
			this.bars = [];
			this.dendroViewHeight = 0;
			return;
		}

		// Step 2: select bars below the top edge of the window.

		let maxHeight;	// Maximum visible bar height based on heightRatio and zoomLevel.
		let visBars;	// Number of visible bars.

		// Determine those bars that are (partially) visible within the detail window height.
		// If not initialized yet, automagically zoom out if too few bars are visible.
		while (true) {
			maxHeight = this.summaryDendrogram.dendroViewHeight/this.heightRatio/this.zoomLevel;
			visBars = 0;
			if (this.barsMaxHeight !== maxHeight || !this.bars) {
				this.bars = this.windowBars.filter(bar => {
					// Accept bars with a visible top bar.
					if (bar.height < maxHeight) {
						visBars++;
						return true;
					}
					// Also accept bars if either vertical edge line is visible.
					return (bar.left >= this.start3NIndex && bar.leftBot < maxHeight) ||
					       (bar.right < this.stop3NIndex && bar.rightBot < maxHeight);
				});
				this.barsMaxHeight = maxHeight;
				this.scaledView = null;		// Force scaled view recalculation.
			} else {
				visBars = this.bars.length;
			}
	        // Done if initialized or if at least 75% of the
	        // bars spanning the view are visible.
	        if (this.zoomInitialized || (visBars/this.windowBars.length) > 0.75) {
	        	break;
	        }
			// Guaranteed stop. Really expect to stop before this becomes true.
			if (this.zoomLevel < 0.0001) {
			    break;
			}
			// If not, zoom out a little and try again.
	        this.zoomLevel *= 0.75;
		}
		this.dendroViewHeight = maxHeight;
		this.zoomInitialized = true;
	};

	// Create a scaled view of the detail window as bars within the unit square [0..1) x [0..1).
	// Recalculate iff:
	// - there is no scaled view (e.g. if the bars in the detail window have changed), or
	// - the selected bars have changed (affects bar thickness).
	//
	this.scaledViewSelectedBarsCheck = "";
        this.getScaledView = function () {
		const selectedBarsCheck = JSON.stringify(this.summaryDendrogram.selectedBars);
		if (!this.scaledView || this.scaledViewSelectedBarsCheck !== selectedBarsCheck) {
			this.scaledViewSelectedBarsCheck = selectedBarsCheck;
			//console.log (`In detail genScaleMatrix`);
			const origWidth = this.summaryDendrogram.dendroViewWidth;
			const origHeight = this.summaryDendrogram.dendroViewHeight;
			//console.log (`Original size: ${origHeight}x${origWidth}`);
			const xScale = 1.0 / this.dendroViewWidth;
			const yScale = 1.0 / this.dendroViewHeight;
			this.scaledView = this.bars.map( bar => {
			    // Generate coordinates in scaled space.
			    const height = bar.height * yScale;
			    if (height === 0) return [];
			    const left = (bar.left - this.start3NIndex + this.halfBox) * xScale;
			    const right = (bar.right - this.start3NIndex + this.halfBox) * xScale;
			    const leftBot = bar.leftBot * yScale;
			    const rightBot = bar.rightBot * yScale;
			    let selected = false;
			    let sidx = 0;
			    while (sidx < this.summaryDendrogram.selectedBars.length && !selected) {
				const sb = this.summaryDendrogram.selectedBars[sidx];
				selected = bar.left >= sb.leftBoundary && bar.right <= sb.rightBoundary;
				sidx++;
			    }
			    const thickness = 1 + selected;
			    return ({ left, right, height, leftBot, rightBot, thickness });
			});
		}
                return this.scaledView;
        };

	// event listeners
	this.dendroCanvas.addEventListener("wheel", e => this.scroll(e), UTIL.passiveCompat({ passive: false }));
	this.dendroCanvas.onclick = e => this.click(e);
	this.dendroCanvas.ontouchmove = e => this.scroll(e);
	this.dendroCanvas.ontouchend = e => this.touchEnd(e);
	
	this.scroll = function(e){
		e.preventDefault();
		e.stopPropagation();
		let delta;

		if (e.touches) {
			// Determine delta from change in touch
			const touchLoc = this.axis === 'Column' ? e.touches[0].clientY : e.touches[0].clientX;
			if (!this.lastTouchLoc) {
				this.lastTouchLoc = touchLoc;
				return;
			}
			delta = touchLoc - this.lastTouchLoc;
			this.lastTouchLoc = touchLoc;
		} else {
			// Determine delta from scroll event
			delta = e.deltaY;
		}
		let newLevel = this.zoomLevel - delta/800;
		if (newLevel < 1 && this.zoomLevel > 1 ||
		    newLevel > 1 && this.zoomLevel < 1) {
			// Pause at default zoom level.
			this.zoomLevel = 1;
			this.draw();
		} else {
			if (newLevel < 0.1) newLevel = 0.1;
			if (newLevel > 100) newLevel = 100;
			if (newLevel !== this.zoomLevel) {
				this.zoomLevel = newLevel;
				this.draw();
			}
		}
	};
	
	this.touchEnd = function (e) {
		this.lastTouchLoc = null;
	};
	
	this.click = function(e){
		// console.log ('Click on detail dendrogram');
		// Convert canvas coordinates into unit coordinates.
		const canvasPosn = this.canvasEventPosn (e);

		// Convert unit coordinates into application coordinates (3N space).
		const win = this.getWindow();
		const heightScale = this.zoomLevel*this.numLeaves/win.numElements;
		const w3n = (canvasPosn.w * win.numElements + win.startIdx - 1) * this.summaryDendrogram.getPointsPerLeaf();
		const h3n = canvasPosn.h * this.summaryDendrogram.dendroViewHeight / heightScale;
		// console.log ({ w3n, h3n });

		DET.mouseDown = true;
		this.checkDendroHit (h3n, w3n, barIdx => {
			const sumIdx = this.bars[barIdx].idx;  // Get index of bar in summary dendrogram.
			SUM.clearSelectionMarks();
			this.summaryDendrogram.addSelectedBar(sumIdx, e.shiftKey,e.metaKey||e.ctrlKey);
			SEL.updateSelection(DMM.getMapItemFromDendro(this));
			SUM.drawSelectionMarks();
			SUM.drawTopItems();
			let clickType = (e.ctrlKey || e.metaKey) ? 'ctrlClick' : 'standardClick';
			LNK.postSelectionToLinkouts(this.axis, clickType, 0, null);
			this.draw();
		});
	};
	
	this.draw = function () {
		if (this.isVisible()) {
			this.buildView ();
			this.drawView ();
		}
	};
};

/**********************************************************************************************************/
//
// The functions below create the two summary dendrograms.
//

/******************************
 *  SUMMARY COLUMN DENDROGRAM *
 ******************************/
DDR.SummaryColumnDendrogram = function() {

	const heatMap = MMGR.getHeatMap();
	DDR.Dendrogram.call (this, document.getElementById('column_dendro_canvas'));
        DDR.ColumnDendrogram.call (this);
	DDR.SummaryDendrogram.call (this,
		heatMap.getColDendroConfig(),
		heatMap.getColDendroData(),
		heatMap.getNumColumns('d')
	);
};

/******************************
 *  SUMMARY ROW DENDROGRAM *
 ******************************/
DDR.SummaryRowDendrogram = function() {

	const heatMap = MMGR.getHeatMap();
	DDR.Dendrogram.call (this, document.getElementById('row_dendro_canvas'));
        DDR.RowDendrogram.call (this);
	DDR.SummaryDendrogram.call (this,
		heatMap.getRowDendroConfig(),
		heatMap.getRowDendroData(),
		heatMap.getNumRows('d')
	);
};

/**********************************************************************************************************/
//
// The functions below create the two detail dendrograms.
// They must be called after the corresponding summary dendrograms
// have been created.
//

/**************************
 *  DETAIL COL DENDROGRAM *
 **************************/
DDR.DetailColumnDendrogram = function(dendroCanvas) {

	// Get region of dendrogram currently visible.
	this.getWindow = function() {
		const mapItem = DMM.getMapItemFromDendro(this);
		if (typeof mapItem === 'undefined') {
			return {};
		} else if (mapItem.mode === 'FULL_MAP') {
			return { startIdx: 1, numElements: MMGR.getHeatMap().getNumColumns(MMGR.DETAIL_LEVEL) };
		} else {
			return { startIdx: mapItem.currentCol, numElements: mapItem.dataPerRow };
		}
	};

	DDR.Dendrogram.call (this, dendroCanvas);
	DDR.ColumnDendrogram.call (this);
	DDR.DetailDendrogram.call (this, SUM.colDendro);
};

/**************************
 *  DETAIL ROW DENDROGRAM *
 **************************/
DDR.DetailRowDendrogram = function(dendroCanvas) {

	// Get region of dendrogram currently visible.
	this.getWindow = function() {
		const mapItem = DMM.getMapItemFromDendro(this);
		if (typeof mapItem === 'undefined') {
			return {};
		} else if (mapItem.mode === 'FULL_MAP') {
			return { startIdx: 1, numElements: MMGR.getHeatMap().getNumRows(MMGR.DETAIL_LEVEL) };
		} else {
			return { startIdx: mapItem.currentRow, numElements: mapItem.dataPerCol };
		}
	};

	DDR.Dendrogram.call (this, dendroCanvas);
	DDR.RowDendrogram.call (this);
	DDR.DetailDendrogram.call (this, SUM.rowDendro);
};

})();
