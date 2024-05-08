(function () {
  "use strict";
  NgChm.markFile();

  // Define Namespace for NgChm Dendrogram
  const DDR = NgChm.createNS("NgChm.DDR");

  const MAPREP = NgChm.importNS("NgChm.MAPREP");
  const MMGR = NgChm.importNS("NgChm.MMGR");

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

  const paddingHeight = 2; // Extra padding needed 'below' a dendrogram's leaves.

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
  DDR.Dendrogram = function (canvas) {
    // The bars in this dendrogram:
    this.bars = [];
    // The canvas on which the dendrogram will be drawn:
    //	this.dendroCanvas = document.getElementById(canvasId);
    this.dendroCanvas = canvas;

    // Returns the width of the dendrogram canvas.  Add a bit of padding below the leaves.
    this.getDivWidth = function () {
      return (
        this.dendroCanvas.clientWidth + (this.axis === "Row") * paddingHeight
      );
    };

    // Returns the height of the dendrogram canvas.  Add a bit of padding below the leaves.
    this.getDivHeight = function () {
      return (
        this.dendroCanvas.clientHeight +
        (this.axis === "Column") * paddingHeight
      );
    };

    // Return the proportion of the heat map element to use for the dendrogram.
    // 100 corresponds to 20% (determined by minDendroHeight).
    this.getConfigSize = function () {
      return this.dendroConfig.height / DDR.minDendroHeight;
    };

    // Determine if (y,x) is close to one of our bars.
    // If so, onhit is called with the index of the closest bar.
    // x,y must be in application level coordinates.
    this.checkDendroHit = function (y, x, onhit) {
      const debug = false;
      const vertSearchRadiusMax = this.dendroViewHeight / 20;
      const horSearchRadiusMax = this.dendroViewWidth / 60;
      let bestDist = 1e10;
      let bestIdx = -1;
      let bestWhere = "";
      function check(where, dh, dv, globalBarIdx, idx) {
        if (dh <= horSearchRadiusMax && dv <= vertSearchRadiusMax) {
          const d = dh * dh + dv * dv;
          if (d < bestDist) {
            bestDist = d;
            bestIdx = this.getLocalBarIndex(globalBarIdx, idx);
            bestWhere = where;
          }
        }
      }
      for (let idx = 0; idx < this.bars.length; idx++) {
        const bar = this.bars[idx];
        // Consider the top bar.
        let dh =
          x < bar.left ? bar.left - x : x > bar.right ? x - bar.right : 0;
        let dv = Math.abs(y - bar.height);
        check.call(this, "b", dh, dv, -1, idx);
        // Consider the left support.
        dh = Math.abs(x - bar.left);
        dv =
          y < bar.leftBot
            ? bar.leftBot - y
            : y > bar.height
              ? y - bar.height
              : 0;
        check.call(this, "l", dh, dv, this.dendroData[bar.idx].left - 1, idx);
        // Consider the right support.
        dh = Math.abs(x - bar.right);
        dv =
          y < bar.rightBot
            ? bar.rightBot - y
            : y > bar.height
              ? y - bar.height
              : 0;
        check.call(this, "r", dh, dv, this.dendroData[bar.idx].right - 1, idx);
      }
      if (debug)
        console.log(
          `Best bar (${x}, ${y}) : ${bestIdx} ${bestWhere} ${bestDist}`,
        );
      if (bestIdx !== -1) {
        const bar = this.bars[bestIdx];
        if (debug)
          console.log(
            `height: ${bar.height} left: ${bar.left}, right: ${bar.right}`,
          );
        onhit(bestIdx);
      }
    };

    this.setCanvasSize = function (width, height) {
      this.dendroCanvas.width = width;
      this.dendroCanvas.height = height;
    };

    // Draw the dendrogram into the canvas.
    this.timeout = null;
    this.drawView = function () {
      if (this.timeout == null && this.debouncedDraw) {
        setTimeout(() => {
          this.debouncedDraw();
          this.timeout = null;
        });
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
  DDR.ColumnDendrogram = function () {
    const debug = false;

    this.axis = "Column";

    // Convert the xy position of the event e from canvas coordinates
    // to unit coordinates:
    // - w is the fraction along the leaves,
    // - h is the fraction between the base and the top.
    this.canvasEventPosn = function (e) {
      const w = event.offsetX / this.dendroCanvas.clientWidth;
      const h =
        (this.dendroCanvas.clientHeight - event.offsetY) /
        this.dendroCanvas.clientHeight;
      if (debug) console.log({ w, h });
      return { w, h };
    };

    // Draw the dendrogram inside viewport vp of the jsdoc.
    this.drawPDF = function (jsdoc, vp) {
      if (debug) console.log({ vp });
      jsdoc.setDrawColor(0); // Black.
      const ctx = jsdoc.context2d;
      ctx.save();
      jsdoc.setLineCap("square");
      jsdoc.setLineJoin("square");
      const f = Math.floor;
      // Increase resolution over the jsdoc coordinate space (which defaults to 72-dpi)
      // by this factor:
      const resScale = 100;
      const h = f(resScale * vp.height); // Logical height of the drawing space.
      const w = f(resScale * vp.width); // Logical width of the drawing space.

      ctx.translate(vp.left, vp.top);
      ctx.scale(1.0 / resScale, 1.0 / resScale);

      // Draw the given bar into the viewport.
      // The bar's positions and heights must be in unit coordinates.
      function drawBar(bar) {
        // Convert unit coordinates to device coordinates.
        const left = f(bar.left * w);
        const right = f(bar.right * w);
        // Need to flip the verticle coordinates
        const barPosn = f(h - bar.height * h);
        const leftEnd = f(bar.leftBot * h);
        const rightEnd = f(bar.rightBot * h);

        // Draw the bar if it's within the viewport.
        if (barPosn >= 0 && barPosn < h) {
          ctx.moveTo(Math.max(0, left), barPosn);
          ctx.lineTo(Math.min(w, right), barPosn);
        }
        // Bar posn or the top edge of the viewport.
        const barPosnLim = Math.min(Math.max(0, barPosn), h - 1);
        if (debug)
          console.log({ left, right, barPosn, leftEnd, rightEnd, barPosnLim });
        // Draw the left edge if it's within the viewport.
        if (left >= 0 && left < w && leftEnd < h) {
          ctx.moveTo(left, barPosnLim);
          ctx.lineTo(left, h - 1 - leftEnd);
        }
        // Draw the right edge if it's within the viewport.
        if (right >= 0 && right < w && rightEnd < h) {
          ctx.moveTo(right, barPosnLim);
          ctx.lineTo(right, h - 1 - rightEnd);
        }
      }

      // Get bars to draw in unit coordinates.
      const vv = this.getScaledView();

      // It is more efficient to draw as many bars per 'stroke' as possible.
      // So, we draw all bars of each type as a group.

      // Draw all thin bars.
      const thinBars = vv.filter((v) => v.thickness === 1);
      if (thinBars.length > 0) {
        ctx.beginPath();
        ctx.lineWidth = 0;
        thinBars.forEach(drawBar);
        ctx.stroke();
      }

      // Draw all thick bars.
      const thickBars = vv.filter((v) => v.thickness === 2);
      if (thickBars.length > 0) {
        ctx.beginPath();
        ctx.lineWidth = resScale; // Translates to 1. Anything smaller is the same as 0.
        thickBars.forEach(drawBar);
        ctx.stroke();
      }

      if (debug)
        console.log(
          "Thin bars: " + thinBars.length + ", thick bars: " + thickBars.length,
        );
      ctx.restore();
    };

    // Do not call directly. Use drawView on base Dendrogram class.
    this.debouncedDraw = function () {
      if (debug) console.log("> ColumnDendrogram.drawView");
      const f = Math.floor;
      const ctx = this.dendroCanvas.getContext("2d");
      const h = this.dendroCanvas.height;
      const w = this.dendroCanvas.width;
      ctx.fillStyle = "black";
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, w, h);

      const vv = this.getScaledView();
      vv.forEach((bar) => {
        // Convert unit coordinates to canvas coordinates.
        const left = f(bar.left * w);
        const right = f(bar.right * w);
        const height = f(h - bar.height * h);
        const leftBot = f(bar.leftBot * h);
        const rightBot = f(bar.rightBot * h);
        // Draw bar if it's within the canvas.
        if (height < h) {
          const left0 = Math.max(0, left);
          ctx.fillRect(
            left0,
            height,
            Math.min(w, right + 1) - left0,
            bar.thickness,
          );
        }
        const sideTop = Math.min(Math.floor(bar.height * h), h);
        // Draw left edge if it's (partially) visible.
        if (left >= 0 && left < w && leftBot < h) {
          ctx.fillRect(left, h - sideTop, bar.thickness, sideTop - leftBot);
        }
        // Draw right edge if it's (partially) visible.
        if (right >= 0 && right < w && rightBot < h) {
          ctx.fillRect(right, h - sideTop, bar.thickness, sideTop - rightBot);
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
  DDR.RowDendrogram = function () {
    const debug = false;
    this.axis = "Row";

    // Convert the xy position of the event from canvas coordinates
    // to unit coordinates:
    // - w is the fraction along the leaves,
    // - h is the fraction between the base(0) and the top(1).
    this.canvasEventPosn = function (e) {
      const w = event.offsetY / this.dendroCanvas.clientHeight;
      const h =
        (this.dendroCanvas.clientWidth - event.offsetX) /
        this.dendroCanvas.clientWidth;
      return { w, h };
    };

    // Draw the dendrogram within the viewport vp within jsdoc.
    this.drawPDF = function (jsdoc, vp) {
      if (debug) console.log({ vp });
      const f = Math.floor;
      jsdoc.setDrawColor(0); // Black.
      const ctx = jsdoc.context2d;
      ctx.save();
      jsdoc.setLineCap("square");
      jsdoc.setLineJoin("square");
      const resScale = 100;

      ctx.translate(vp.left, vp.top);
      ctx.scale(1.0 / resScale, 1.0 / resScale);

      const h = f(resScale * vp.height);
      const w = f(resScale * vp.width);
      function drawBar(v) {
        const left = f(v.left * h);
        const right = f(v.right * h);
        const barPosn = f(w - v.height * w);
        const leftEnd = f(v.leftBot * w);
        const rightEnd = f(v.rightBot * w);

        // Draw top bar if it's in range.
        if (barPosn >= 0 && barPosn < w) {
          ctx.moveTo(barPosn, Math.max(0, left));
          ctx.lineTo(barPosn, Math.min(h, right));
        }
        // Limit left and right edges to viewport if bar out of range.
        const barPosnLim = Math.min(Math.max(0, barPosn), w - 1);
        if (debug)
          console.log({ left, right, barPosn, leftEnd, rightEnd, barPosnLim });
        // Draw left edge if it's (partly) in view
        if (left >= 0 && left < h && leftEnd < w) {
          ctx.moveTo(barPosnLim, left);
          ctx.lineTo(w - 1 - leftEnd, left);
        }
        // Draw right edge if it's (partly) in view
        if (right >= 0 && right < h && rightEnd < w) {
          ctx.moveTo(barPosnLim, right);
          ctx.lineTo(w - 1 - rightEnd, right);
        }
      }

      const vv = this.getScaledView();

      // Draw all thin bars.
      const thinBars = vv.filter((v) => v.thickness === 1);
      if (thinBars.length > 0) {
        ctx.beginPath();
        jsdoc.setLineWidth(0);
        thinBars.forEach(drawBar);
        ctx.stroke();
      }

      // Draw all thick bars.
      const thickBars = vv.filter((v) => v.thickness === 2);
      if (thickBars.length > 0) {
        ctx.beginPath();
        jsdoc.setLineWidth(resScale);
        thickBars.forEach(drawBar);
        ctx.stroke();
      }

      ctx.restore();
    };

    // Do not call directly. Use drawView on base Dendrogram class.
    // Draw the dendrogram into the canvas, rotating by 90 degrees.
    this.debouncedDraw = function () {
      if (debug)
        console.log(
          `> RowDendrogram.drawView ${this.dendroCanvas.width}x${this.dendroCanvas.height}`,
        );
      const f = Math.floor;
      const ctx = this.dendroCanvas.getContext("2d");
      const w = this.dendroCanvas.width;
      const h = this.dendroCanvas.height;
      ctx.fillStyle = "black";
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, w, h);

      const vv = this.getScaledView();
      vv.forEach((bar) => {
        const left = f(bar.left * h);
        const right = f(bar.right * h);
        const height = f(w - bar.height * w);
        const leftBot = f(bar.leftBot * w);
        const rightBot = f(bar.rightBot * w);
        if (height < w) {
          const left0 = Math.max(0, left);
          ctx.fillRect(
            height,
            Math.max(0, left),
            bar.thickness,
            Math.min(h, right + 1) - left0,
          );
        }
        const sideTop = Math.min(Math.floor(bar.height * w), w);
        if (left >= 0 && left < h && leftBot < w) {
          ctx.fillRect(w - sideTop, left, sideTop - leftBot, bar.thickness);
        }
        if (right >= 0 && right < h && rightBot < w) {
          ctx.fillRect(w - sideTop, right, sideTop - rightBot, bar.thickness);
        }
      });
    };
  };
})();
