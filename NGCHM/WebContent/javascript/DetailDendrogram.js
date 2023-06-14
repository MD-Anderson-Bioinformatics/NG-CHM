(function() {
    'use strict';
    NgChm.markFile();

    // Define Namespace for NgChm Dendrogram
    const DETDDR = NgChm.createNS('NgChm.DETDDR');

    const DDR = NgChm.importNS('NgChm.DDR');
    const MAPREP = NgChm.importNS('NgChm.MAPREP');
    const MMGR = NgChm.importNS('NgChm.MMGR');
    const UTIL = NgChm.importNS('NgChm.UTIL');


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

    function DetailDendrogram (summaryDendrogram, callbacks) {

	this.summaryDendrogram = summaryDendrogram;
	this.dendroConfig = summaryDendrogram.dendroConfig;
	this.dendroData = summaryDendrogram.dendroData;
	this.maxHeight = summaryDendrogram.maxHeight;
	this.numLeaves = summaryDendrogram.numLeaves;
	this.callbacks = callbacks;

	const PPL = this.summaryDendrogram.getPointsPerLeaf(); 
	
	this.isVisible = function() {
		if (this.dendroConfig.show !== "ALL" || !this.dendroCanvas) {
		    return false;
		}
		return this.callbacks.isVisible (this.dendroCanvas);
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
		delta = Math.min (600, Math.max (-600, delta)); // Limit delta to range -600..600
		let newLevel = this.zoomLevel * (1 - delta/800);
		if (newLevel < 1 && this.zoomLevel > 1 ||
		    newLevel > 1 && this.zoomLevel < 1) {
			// Pause at default zoom level.
			this.zoomLevel = 1;
			this.draw();
		} else {
			if (newLevel < 0.0001) newLevel = 0.0001;
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

		this.callbacks.setMouseDown();
		this.checkDendroHit (h3n, w3n, barIdx => {
			const sumIdx = this.bars[barIdx].idx;  // Get index of bar in summary dendrogram.
			const labelLastClicked = this.callbacks.getLabelLastClicked (this.axis);
			const modified = this.summaryDendrogram.addSelectedBar(sumIdx, e.shiftKey,e.metaKey||e.ctrlKey, labelLastClicked);
			if (modified) {
			    const clickType = (e.ctrlKey || e.metaKey) ? 'ctrlClick' : 'standardClick';
			    this.callbacks.searchResultsChanged (this.axis, clickType);
			    this.draw();
			}
		});
	};
	
	this.draw = function () {
		if (this.isVisible()) {
			this.buildView ();
			this.drawView ();
		}
	};
    }

    /**********************************************************************************************************/
    //
    // The functions below create the two detail dendrograms.
    // They must be called after the corresponding summary dendrograms
    // have been created.
    //

    /**************************
     *  DETAIL COL DENDROGRAM *
     **************************/
    DETDDR.DetailColumnDendrogram = function(mapItem, dendroCanvas, summaryDendro, callbacks) {

	// Get region of dendrogram currently visible.
	this.getWindow = function() {
		if (typeof mapItem === 'undefined') {
			return {};
		} else if (mapItem.mode === 'FULL_MAP') {
			return { startIdx: 1, numElements: mapItem.heatMap.getNumColumns(MAPREP.DETAIL_LEVEL) };
		} else {
			return { startIdx: mapItem.currentCol, numElements: mapItem.dataPerRow };
		}
	};

	DDR.Dendrogram.call (this, dendroCanvas);
	DDR.ColumnDendrogram.call (this);
	DetailDendrogram.call (this, summaryDendro, callbacks);
    };

    /**************************
     *  DETAIL ROW DENDROGRAM *
     **************************/
    DETDDR.DetailRowDendrogram = function(mapItem, dendroCanvas, summaryDendro, callbacks) {

	// Get region of dendrogram currently visible.
	this.getWindow = function() {
		if (typeof mapItem === 'undefined') {
			return {};
		} else if (mapItem.mode === 'FULL_MAP') {
			return { startIdx: 1, numElements: mapItem.heatMap.getNumRows(MAPREP.DETAIL_LEVEL) };
		} else {
			return { startIdx: mapItem.currentRow, numElements: mapItem.dataPerCol };
		}
	};

	DDR.Dendrogram.call (this, dendroCanvas);
	DDR.RowDendrogram.call (this);
	DetailDendrogram.call (this, summaryDendro, callbacks);
    };

})();
