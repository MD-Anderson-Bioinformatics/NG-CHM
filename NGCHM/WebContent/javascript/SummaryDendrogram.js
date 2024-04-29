(function () {
  "use strict";
  NgChm.markFile();

  // Define Namespace for NgChm Dendrogram
  const SUMDDR = NgChm.createNS("NgChm.SUMDDR");

  const DDR = NgChm.importNS("NgChm.DDR");

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
  function SummaryDendrogram(config, data, numLeaves, callbacks) {
    const debug = false;

    this.dendroConfig = config;
    this.dendroData = data;
    this.numLeaves = numLeaves;
    this.callbacks = callbacks;

    this.isVisible = function () {
      return this.dendroConfig.show !== "NONE";
    };

    // Return the local index of the bar with index globalIdx.
    // If that bar doesn't exist locally, return idx.
    // Our bar indices *are* the global indices, so just return it.
    this.getLocalBarIndex = function (globalIdx, idx) {
      return globalIdx < 0 ? idx : globalIdx;
    };

    // Determine the height of the highest bar.
    this.maxHeight = this.dendroData.reduce(
      (max, entry) => (entry.height > max ? entry.height : max),
      0,
    );
    const numBars = this.dendroData.length;

    // Usually 3N space has three points per leaf, but really small dendrograms might need more.
    // BMB: Is the additional PPL still needed?
    const pointsPerLeaf = (function () {
      let PPL = 3;
      // Increase PPL if necessary so that matrixWidth is wide enough.
      if (PPL * numLeaves < DDR.minDendroWidth) {
        PPL = Math.round(DDR.minDendroWidth / numLeaves);
      }
      return PPL;
    })();
    this.getPointsPerLeaf = function () {
      return pointsPerLeaf;
    };

    // Bars are stored in 'Dendrogram coordinates' aka 3N space.
    // Set the size of virtual 3N space in which the bars exist.  Normally there are PPL units of width
    // for each leaf and one unit of height for each bar.
    const normDendroWidth = pointsPerLeaf * numLeaves;
    const normDendroHeight = Math.min(
      Math.max(DDR.minDendroHeight, numBars),
      DDR.maxDendroHeight,
    );

    // Returns the object's position in 3N space.
    // If objid is negative, return the position of the leaf 0-objid.
    // If objid is positive, return the center of the bar objid.
    this.findLocation = function (objid) {
      if (objid < 0) {
        const leafid = 0 - objid; // make objid a positive number to find the leaf
        return pointsPerLeaf * leafid - pointsPerLeaf / 2;
      } else {
        const barid = objid - 1;
        return (this.bars[barid].left + this.bars[barid].right) / 2; // gets the middle point of the bar
      }
    };

    // Returns the left boundary of the object in 3N space.
    // If objid is negative, return the position of the leaf 0-objid.
    // If objid is positive, return the left edge of the leftmost descendent of bar objid-1.
    this.findLeftBoundary = function (objid) {
      if (objid < 0) {
        const leafid = 0 - objid; // make objid a positive number to find the leaf
        return pointsPerLeaf * leafid - pointsPerLeaf / 2;
      } else {
        const barid = objid - 1;
        return this.bars[barid].leftBoundary; // gets the left edge of subtree
      }
    };

    // Returns the right boundary of the object in 3N space.
    // If objid is negative, return the position of the leaf 0-objid.
    // If objid is positive, return the right edge of the rightmost descendent of bar objid-1.
    this.findRightBoundary = function (objid) {
      if (objid < 0) {
        const leafid = 0 - objid; // make objid a positive number to find the leaf
        return pointsPerLeaf * leafid - pointsPerLeaf / 2;
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
      this.dendroViewHeight = normDendroHeight + 1; // Add one for a space above top bar.
      this.dendroViewWidth = normDendroWidth;

      const scaleFactor = normDendroHeight / this.maxHeight;
      this.bars = this.dendroData.map((bar, index) => ({
        idx: index,
        height: Math.max(1, bar.height * scaleFactor),
      }));
      // findLocation requires bar positions to be evaluated in order.
      for (let i = 0; i < numNodes; i++) {
        const bar = this.bars[i];
        const dd = this.dendroData[i];
        // Set horizontal position of the left and right edges.
        bar.left = this.findLocation(dd.left);
        bar.right = this.findLocation(dd.right);
        // Set bottom of the left and right edges.
        bar.leftBot = dd.left < 0 ? 0 : this.bars[dd.left - 1].height;
        bar.rightBot = dd.right < 0 ? 0 : this.bars[dd.right - 1].height;
        // Find the left- and right-most leaves of this bar.
        bar.leftBoundary = this.findLeftBoundary(dd.left);
        bar.rightBoundary = this.findRightBoundary(dd.right);
      }
    };
    if (this.dendroConfig.show !== "NA") {
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
    this.clearSelectedRegion = function () {
      if (this.ribbonModeBar != -1) {
        this.ribbonModeBar = -1;
        this.draw();
      }
    };

    // Set ribbon mode
    this.setRibbonModeBar = function setRibbonModeBar(start, stop) {
      if (this.ribbonModeBar != -1) {
        console.error("Setting ribbon mode bar when it is already set");
        return;
      }
      for (let idx = 0; idx < this.bars.length; idx++) {
        const regionStart = Math.round(
          this.bars[idx].leftBoundary / pointsPerLeaf,
        );
        if (start != regionStart) {
          continue;
        }
        const regionStop = Math.round(
          this.bars[idx].rightBoundary / pointsPerLeaf,
        );
        if (stop == regionStop) {
          this.ribbonModeBar = idx;
          this.draw();
          return;
        }
      }
      console.warn("Unable to set ribbon bar");
    };

    // Enter/leave ribbon mode.  Called when the user has clicked near
    // a bar in the dendrogram.
    this.setSelectedBar = function (barIndex) {
      const sameBarClicked = barIndex === this.ribbonModeBar;
      if (debug) console.log("Same bar clicked: " + sameBarClicked);
      if (sameBarClicked) {
        this.clearSelectedRegion();
        this.callbacks.clearSelectedRegion(this.axis);
      } else {
        this.ribbonModeBar = barIndex;
        this.draw();

        const rmBar = this.bars[barIndex];
        const regionStart = Math.round(rmBar.leftBoundary / pointsPerLeaf);
        const regionStop = Math.round(rmBar.rightBoundary / pointsPerLeaf);
        if (debug) console.log({ rmBar, regionStart, regionStop });
        this.callbacks.setSelectedRegion(this.axis, regionStart, regionStop);
      }
    };

    // Listen for click events on our canvas.
    this.dendroCanvas.addEventListener("click", (e) =>
      this.subDendroClick(this.dendroCanvas, e),
    );
    this.subDendroClick = function (element, event) {
      const canvasPosn = this.canvasEventPosn(event);

      // Convert unit coordinates into application-level coordinates.
      const h3n = canvasPosn.h * this.dendroViewHeight; // Vertical position in 3N space.
      const w3n = canvasPosn.w * this.dendroViewWidth; // Horizontal position in 3N space.

      this.checkDendroHit(h3n, w3n, (selectedBar) => {
        this.setSelectedBar(selectedBar);
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
    this.getSelectedBars = function () {
      return this.selectedBars;
    };
    this.saveSelectedBars = function (bars) {
      // Get selected bars for adding to saved state.
      return this.selectedBars.map((bar) => bar.idx);
    };
    this.restoreSelectedBars = function (bars) {
      // Restore selected bars from saved state.
      // Saved state is assumed to include the resulting selection separately.
      this.selectedBars = bars.map((idx) => this.bars[idx]);
    };
    this.clearSelectedBars = function () {
      this.selectedBars = [];
    };

    this.addSelectedBar = function (barIdx, shift, ctrl, labelLastClicked) {
      const selectedBar = this.bars[barIdx];
      var left = selectedBar.leftBoundary;
      var right = selectedBar.rightBoundary;
      var height = selectedBar.height;
      var selectLeft = Math.round((left + pointsPerLeaf / 2) / pointsPerLeaf);
      var selectRight = Math.round((right + pointsPerLeaf / 2) / pointsPerLeaf);
      var addBar = true;
      let modified = false;

      // is it a standard click?
      if (!shift && !ctrl) {
        callbacks.clearSearchItems(this.axis);
        callbacks.setAxisSearchResults(this.axis, selectLeft, selectRight);

        this.selectedBars = [selectedBar];
        return true;
      }
      var deleteBar = []; // bars that need to be removed due to this new click
      for (var i in this.selectedBars) {
        var bar = this.selectedBars[i];
        if (bar.left <= left && bar.right >= right && bar.height > height) {
          addBar = false;
        }
        if (
          bar.left >= left &&
          bar.right <= right &&
          bar.height - 1 <= height
        ) {
          // if the new selected bar is in the bounds of an older one... (-1 added to height since highlighted bars can cause issues without it)
          deleteBar.push(i);
          // remove all the search items that were selected by that old bar
          callbacks.clearSearchRange(this.axis, selectLeft, selectRight);
          modified = true;
          if (
            bar.right == selectedBar.right &&
            bar.height == selectedBar.height
          ) {
            // a bar that's already selected has been selected so we remove it
            addBar = false;
          }
        }
      }

      for (var i = deleteBar.length - 1; i > -1; i--) {
        this.selectedBars.splice(deleteBar[i], 1); // remove that old bar
      }

      var selectLeft = Math.round((left + pointsPerLeaf / 2) / pointsPerLeaf);
      var selectRight = Math.round((right + pointsPerLeaf / 2) / pointsPerLeaf);
      if (addBar) {
        if (shift) {
          modified = true;
          callbacks.setAxisSearchResults(this.axis, selectLeft, selectRight);
          var numBars = this.selectedBars.length;
          var startIndex = 0,
            endIndex = -1;
          if (this.selectedBars[numBars - 1]) {
            if (this.selectedBars[numBars - 1].right < left) {
              startIndex = Math.round(
                (this.selectedBars[numBars - 1].right + pointsPerLeaf / 2) /
                  pointsPerLeaf,
              );
              endIndex = selectLeft;
            } else if (right < this.selectedBars[numBars - 1].left) {
              startIndex = selectRight;
              endIndex = Math.round(
                (this.selectedBars[numBars - 1].left + pointsPerLeaf / 2) /
                  pointsPerLeaf,
              );
            }
          } else if (labelLastClicked) {
            if (labelLastClicked < left) {
              startIndex = labelLastClicked;
              endIndex = selectLeft;
            } else if (right < labelLastClicked) {
              startIndex = selectRight;
              endIndex = labelLastClicked;
            }
          }

          callbacks.setAxisSearchResults(this.axis, startIndex, endIndex - 1);
          this.selectedBars.push(selectedBar);
        } else if (ctrl) {
          modified = true;
          callbacks.setAxisSearchResults(this.axis, selectLeft, selectRight);
          this.selectedBars.push(selectedBar);
        }
      }

      return modified;
    };

    // Generate a view of the dendrogram as vectors within a viewport of unit dimensions.
    // Note that width is always the size of the axis along the leaves of the dendrogram,
    // while height is the dimension that the bars rise above the base.
    var lastRibbonBar = -2;
    var lastVectorView;
    this._getScaledView = function () {
      // console.log (`Generating summary scale vector view ${height}x${width}`);
      // console.log (`Original view size: ${this.dendroViewHeight}x${this.dendroViewWidth}`);
      lastRibbonBar = this.ribbonModeBar;
      const xScale = 1.0 / this.dendroViewWidth;
      const yScale = 1.0 / this.dendroViewHeight;
      const ribbonBar =
        this.ribbonModeBar === -1 ? null : this.bars[this.ribbonModeBar];
      lastVectorView = this.bars.map((bar) => {
        const left = bar.left * xScale;
        const right = bar.right * xScale;
        const height = bar.height * yScale;
        const leftBot = bar.leftBot * yScale;
        const rightBot = bar.rightBot * yScale;
        // Draw thicker lines if bar is within the extremes of the ribbonBar.
        const thickness =
          (ribbonBar &&
            bar.left >= ribbonBar.leftBoundary &&
            bar.right <= ribbonBar.rightBoundary) + 1;
        return { left, right, height, leftBot, rightBot, thickness };
      });
    };
    this.getScaledView = function () {
      if (this.ribbonModeBar !== lastRibbonBar) {
        this._getScaledView();
      }
      return lastVectorView;
    };

    this.draw = function () {
      // Summary view doesn't require rebuilding, so just draw it.
      if (this.isVisible()) {
        this.drawView();
      }
    };
  }

  /**********************************************************************************************************/
  //
  // The functions below create the two summary dendrograms.
  //

  /******************************
   *  SUMMARY COLUMN DENDROGRAM *
   ******************************/
  SUMDDR.SummaryColumnDendrogram = function (heatMap, callbacks) {
    DDR.Dendrogram.call(this, document.getElementById("column_dendro_canvas"));
    DDR.ColumnDendrogram.call(this);
    SummaryDendrogram.call(
      this,
      heatMap.getColDendroConfig(),
      heatMap.getDendrogramData("column"),
      heatMap.getNumColumns("d"),
      callbacks,
    );
  };

  /******************************
   *  SUMMARY ROW DENDROGRAM *
   ******************************/
  SUMDDR.SummaryRowDendrogram = function (heatMap, callbacks) {
    DDR.Dendrogram.call(this, document.getElementById("row_dendro_canvas"));
    DDR.RowDendrogram.call(this);
    SummaryDendrogram.call(
      this,
      heatMap.getRowDendroConfig(),
      heatMap.getDendrogramData("row"),
      heatMap.getNumRows("d"),
      callbacks,
    );
  };
})();
