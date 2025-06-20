(function () {
  "use strict";
  NgChm.markFile();

  //Define Namespace for NgChm Events
  const DEV = NgChm.createNS("NgChm.DEV");

  const MAPREP = NgChm.importNS("NgChm.MAPREP");
  const MMGR = NgChm.importNS("NgChm.MMGR");
  const DVW = NgChm.importNS("NgChm.DVW");
  const DET = NgChm.importNS("NgChm.DET");
  const UTIL = NgChm.importNS("NgChm.UTIL");
  const TABLE = NgChm.importNS("NgChm.UI.TABLE");
  const UHM = NgChm.importNS("NgChm.UHM");
  const SRCHSTATE = NgChm.importNS("NgChm.SRCHSTATE");
  const SRCH = NgChm.importNS("NgChm.SRCH");
  const SUM = NgChm.importNS("NgChm.SUM");
  const LNK = NgChm.importNS("NgChm.LNK");
  const DRAW = NgChm.importNS("NgChm.DRAW");
  const PANE = NgChm.importNS("NgChm.Pane");
  const PIM = NgChm.importNS("NgChm.PIM");

  var mouseEventActive = false;
  var mouseDown = false;

  var scrollTime = null; // timer for scroll events to prevent multiple events firing after scroll ends

  DEV.clearScrollTime = function () {
    scrollTime = null;
  };

  DEV.setMouseDown = function (isDown) {
    mouseDown = isDown;
  };

  /**********************************************************************************
   * FUNCTION - addEvents: These function adds event listeners to canvases on a
   * given heat map panel.
   **********************************************************************************/
  DEV.addEvents = function (paneId) {
    const mapItem = DVW.getMapItemFromPane(paneId);
    mapItem.canvas.oncontextmenu = DEV.matrixRightClick;
    mapItem.canvas.onmouseup = DEV.clickEnd;
    mapItem.canvas.onmousemove = DEV.handleMouseMove;
    mapItem.canvas.onmouseout = DEV.handleMouseOut;

    mapItem.canvas.onmousedown = DEV.clickStart;
    mapItem.canvas.ondblclick = DEV.dblClick;

    mapItem.canvas.addEventListener(
      "wheel",
      DEV.handleScroll,
      UTIL.passiveCompat({ capture: false, passive: false }),
    );

    mapItem.canvas.addEventListener(
      "touchstart",
      function (e) {
        UHM.hlpC();
        const now = new Date().getTime();
        const timesince = now - mapItem.latestTap;
        if (timesince < 600 && timesince > 0 && e.touches.length == 1) {
          // double tap
        } else if (e.touches.length == 2) {
          // two finger tap
        } else if (e.touches.length == 1) {
          // single finger tap
          mapItem.latestTapLocation = UTIL.getCursorPosition(e);
          DEV.clickStart(e);
        }
        mapItem.latestTap = now;
      },
      UTIL.passiveCompat({ passive: false }),
    );

    mapItem.canvas.addEventListener(
      "touchmove",
      function (e) {
        if (e.touches) {
          if (e.touches.length > 2) {
            clearTimeout(DET.eventTimer);
            return false;
          } else if (e.touches.length == 2) {
            clearTimeout(DET.eventTimer);
            e.preventDefault();
            mapItem.latestTap = null;
            const distance = Math.hypot(
              e.touches[0].pageX - e.touches[1].pageX,
              e.touches[0].pageY - e.touches[1].pageY,
            );
            const distanceX = Math.abs(
              e.touches[0].clientX - e.touches[1].clientX,
            );
            const distanceY = Math.abs(
              e.touches[0].clientY - e.touches[1].clientY,
            );
            if (!mapItem.latestPinchDistance) {
              mapItem.latestPinchDistance = distance;
            } else if (distance > mapItem.latestPinchDistance) {
              // pinch inward
              DEV.detailDataZoomIn(mapItem);
            } else if (mapItem.latestPinchDistance > distance) {
              // pinch outward
              DEV.detailDataZoomOut(mapItem);
            }
            mapItem.latestPinchDistance = distance;
          } else if (e.touches.length == 1) {
            clearTimeout(DET.eventTimer);
            mouseDown = true;
            DET.handleMoveDrag(e);
          }
        }
      },
      UTIL.passiveCompat({ capture: false, passive: false }),
    );

    mapItem.canvas.addEventListener(
      "touchend",
      function (e) {
        if (e.touches.length == 0) {
          mouseDown = false;
          mapItem.latestPinchDistance = null;
          const now = new Date().getTime();
          if (mapItem.latestTap) {
            const timesince = now - mapItem.latestTap;
            const coords = UTIL.getCursorPosition(e);
            const diffX = Math.abs(coords.x - mapItem.latestTapLocation.x);
            const diffY = Math.abs(coords.y - mapItem.latestTapLocation.y);
            const diffMax = Math.max(diffX, diffY);
            if (timesince > 500 && diffMax < 20) {
              clearTimeout(DET.eventTimer);
              UHM.hlpC();
              DEV.matrixRightClick(e);
            } else if (timesince < 500 && diffMax < 20) {
              DEV.userHelpOpen(mapItem);
            }
          }
        }
      },
      UTIL.passiveCompat({ capture: false, passive: false }),
    );

    // set up touch events for row and column labels
    const rowLabelDiv = document.getElementById(mapItem.rowLabelDiv);
    const colLabelDiv = document.getElementById(mapItem.colLabelDiv);

    addLabelTouchEventHandlers(mapItem, rowLabelDiv);
    addLabelTouchEventHandlers(mapItem, colLabelDiv);

    function addLabelTouchEventHandlers(mapItem, labelDiv) {
      labelDiv.addEventListener(
        "touchstart",
        function (e) {
          UHM.hlpC();
          const now = new Date().getTime();
          mapItem.latestLabelTap = now;
        },
        UTIL.passiveCompat({ passive: true }),
      );

      labelDiv.addEventListener(
        "touchend",
        function (e) {
          if (e.touches.length == 0) {
            const now = new Date().getTime();
            const timesince = now - mapItem.latestLabelTap;
            if (timesince > 500) {
              mapItem.labelCallbacks.labelRightClick(e);
            }
          }
        },
        UTIL.passiveCompat({ passive: false }),
      );
    }
  };

  /**********************************************************************************
   * FUNCTION - userHelpOpen: This function handles all of the tasks necessary to
   * generate help pop-up panels for the detail heat map and the detail heat map
   * classification bars.
   *********************************************************************************/
  DEV.userHelpOpen = function (mapItem) {
    const heatMap = mapItem.heatMap;
    UHM.hlpC();

    const A = UTIL.newElement("A", { href: "" }, "Copy to Clipboard");
    A.onclick = function (ev) {
      ev.preventDefault();
      UHM.pasteHelpContents();
    };
    const CLOSE = UHM.createCloseX(() => {
      UHM.hlpC();
    });
    const HDR = UTIL.newElement("DIV.userHelpHeader", {}, [
      UTIL.newElement("SPAN"),
      A,
      UTIL.newElement("SPAN"),
      CLOSE,
    ]);
    const helptext = UHM.getDivElement("helptext");
    helptext.style.position = "absolute";
    helptext.appendChild(HDR);
    document.getElementsByTagName("body")[0].appendChild(helptext);

    const rowElementSize =
      (mapItem.dataBoxWidth * mapItem.canvas.clientWidth) /
      mapItem.canvas.width; // px/Glpoint
    const colElementSize =
      (mapItem.dataBoxHeight * mapItem.canvas.clientHeight) /
      mapItem.canvas.height;

    // pixels
    var rowClassWidthPx = DET.getRowClassPixelWidth(mapItem);
    var colClassHeightPx = DET.getColClassPixelHeight(mapItem);
    var mapLocY = mapItem.offsetY - colClassHeightPx;
    var mapLocX = mapItem.offsetX - rowClassWidthPx;
    var objectType = "none";
    if (mapItem.offsetY > colClassHeightPx) {
      if (mapItem.offsetX > rowClassWidthPx) {
        objectType = "map";
      }
      if (mapItem.offsetX < rowClassWidthPx) {
        objectType = "rowClass";
      }
    } else {
      if (mapItem.offsetX > rowClassWidthPx) {
        objectType = "colClass";
      }
    }

    const helpTable = TABLE.createTable({ id: "helpTable", columns: 2 });
    const helpContents = helpTable.content;
    if (objectType === "map") {
      var row = Math.floor(
        mapItem.currentRow +
          (mapLocY / colElementSize) * getSamplingRatio(mapItem.mode,"row"),
      );
      var col = Math.floor(
        mapItem.currentCol +
          (mapLocX / rowElementSize) * getSamplingRatio(mapItem.mode,"col"),
      );
      if (row <= heatMap.getNumRows("d") && col <= heatMap.getNumColumns("d")) {
        // Gather the information about the current pixel.
        let matrixValue = heatMap.getValue(MAPREP.DETAIL_LEVEL, row, col);
        if (matrixValue >= MAPREP.maxValues) {
          matrixValue = "Missing Value";
        } else if (matrixValue <= MAPREP.minValues) {
          return; // A gap.
        } else {
          matrixValue = matrixValue.toFixed(5);
        }
        if (DVW.primaryMap.mode === "FULL_MAP") {
          matrixValue = matrixValue + "<br>(summarized)";
        }

        const rowLabels = heatMap.getRowLabels().labels;
        const colLabels = heatMap.getColLabels().labels;
        const pixelInfo = {
          value: matrixValue,
          rowLabel: rowLabels[row - 1],
          colLabel: colLabels[col - 1],
        };
        const rowClassBars = heatMap.getRowClassificationData();
        const rowClassConfig = heatMap.getRowClassificationConfig();
        pixelInfo.rowCovariates = heatMap
          .getRowClassificationOrder()
          .filter((key) => rowClassConfig[key].show === "Y")
          .map((key) => ({
            name: key,
            value: rowClassBars[key].values[row - 1],
          }));
        const colClassBars = heatMap.getColClassificationData();
        const colClassConfig = heatMap.getColClassificationConfig();
        pixelInfo.colCovariates = heatMap
          .getColClassificationOrder()
          .filter((key) => colClassConfig[key].show === "Y")
          .map((key) => ({
            name: key,
            value: colClassBars[key].values[col - 1],
          }));

        // If the enclosing window wants to display the pixel info, send it to them.
        // Otherwise, display it ourselves.
        if (UHM.postMapDetails) {
          var msg = {
            nonce: UHM.myNonce,
            msg: "ShowMapDetail",
            data: pixelInfo,
          };
          //If a unique identifier was provided, return it in the message.
          if (UHM.postID != null) {
            msg["id"] = UHM.postID;
          }

          window.parent.postMessage(msg, UHM.postMapToWhom);
        } else {
          UHM.formatMapDetails(helpContents, pixelInfo);
          helptext.style.display = "inline";
          helptext.appendChild(helpContents);
          locateHelpBox(helptext, mapItem);
        }
      }
    } else if (objectType === "rowClass" || objectType === "colClass") {
      // Clicked on a covariate bar.
      const axis = objectType == "rowClass" ? "row" : "col";
      // Based on the axis, determine:
      // - the index of the element (1-based) the user clicked on.
      // - the offset of the mouse click in canvas units.
      let itemIndex;
      let clickOffset;
      if (axis === "col") {
        itemIndex = Math.floor(
          mapItem.currentCol +
            (mapLocX / rowElementSize) * getSamplingRatio(mapItem.mode,axis),
        );
        // Convert pixel offset to canvas offset.
        clickOffset = mapItem.offsetY / mapItem.canvas.getBoundingClientRect().height * mapItem.canvas.height;
      } else {
        itemIndex = Math.floor(
          mapItem.currentRow +
            (mapLocY / colElementSize) * getSamplingRatio(mapItem.mode,axis),
        );
        clickOffset = mapItem.offsetX / mapItem.canvas.getBoundingClientRect().width * mapItem.canvas.width;
      }
      // Get the label for the row/column that the user clicked on.
      const label = heatMap.getAxisLabels(axis).labels[itemIndex];
      // Get the visible covariate bars, scaled to the canvas.
      const covBarScale = axis == "row" ? mapItem.rowClassScale : mapItem.colClassScale;
      const bars = heatMap.getScaledVisibleCovariates(axis,covBarScale);
      // Find the covariate bar that the user clicked on.
      // This will be the first bar that "covers" (i.e. the end of the bar
      // is past) the mouse clickOffset.
      let hoveredBar;
      let covered = 0;
      for (const bar of bars) {
        covered += bar.height;
        if (covered > clickOffset) {
          hoveredBar = bar;
          break;
        }
      }
      if (!hoveredBar) {
        console.warn (`Did not find expected covariate bar`, { covered, clickOffset });
        hoveredBar = bars[bars.length-1];  // Fall back to the last bar.
      }
      const hoveredBarValues = heatMap.getAxisCovariateData(axis)[hoveredBar.label].values;
      let value = hoveredBarValues[itemIndex - 1];
      //No help popup when clicking on a gap in the class bar
      if (value === "!CUT!") {
        return;
      }
      if (value === "null" || value === "NA") {
        value = "Missing Value";
      }
      const colorMapManager = heatMap.getColorMapManager();
      const colorMap = colorMapManager.getColorMap(axis, hoveredBar.label);
      const colors = colorMap.getColors();
      const classType = colorMap.getType();
      const thresholds = classType == "discrete" ? colorMap.getThresholds() : colorMap.getContinuousThresholdKeys();

      // Build TABLE HTML for contents of help box
      let displayName = hoveredBar.label;
      if (displayName.length > 20) {
        displayName = displayName.substring(0, 20) + "...";
      }
      helpTable.addBlankSpace();
      helpTable.addRow(["Covariate:", displayName]);
      helpTable.addBlankSpace();
      helpTable.addRow(["Label:", label]);
      helpTable.addRow(["Value:", value]);
      helpTable.addBlankSpace();

      // Generate the color scheme diagram
      //
      let prevThresh = 0;
      let overRange = 0;
      for (let i = 0; i < thresholds.length; i++) {

        // Count the number of covariates within each breakpoint.
        let valSelected = 0;
        if (classType == "discrete") {
          const currThresh = thresholds[i];
          for (const classBarVal of hoveredBarValues) {
            if (classBarVal == currThresh) {
              valSelected++;
            }
          }
          const threshBox = thresholds[i] + " " + countPctStr (valSelected, hoveredBarValues.length);
          helpTable.addRow([ genColorBox(colors[i]), threshBox ]);
        } else {
          const thresh = Number(thresholds[i]);
          for (const classBarVal of hoveredBarValues) {
            const value = Number(classBarVal);
            // Count the number less or equal the current threshold and greater
            // than the previous one (if any).
            if (value <= thresh && (i == 0 || value > prevThresh)) {
              valSelected++;
            }
            // Also count the number over the last threshold.
            if (i == thresholds.length - 1 && value > thresh) {
              overRange++;
            }
          }
          prevThresh = thresh;

          const color = colorMap.getRgbToHex(colorMap.getClassificationColor(thresh));
          const threshBox = "<= " + thresh.toFixed(4) + " " + countPctStr (valSelected, hoveredBarValues.length);
          const colorBox = hoveredBar.bar_type === "color_plot" ? genColorBox(color) : "";
          helpTable.addRow([ colorBox, threshBox ]);
        }
      }
      if (classType == "continuous") {
        const npct = countPctStr (overRange, hoveredBarValues.length);
        helpTable.addRow([ "", `> ${prevThresh.toFixed(4)} ${npct}` ]);
      }

      let numMissing = 0;
      for (let j = 0; j < hoveredBarValues.length; j++) {
        if (hoveredBarValues[j] == "null" || hoveredBarValues[j] == "NA") {
          numMissing++;
        }
      }
      const npct = countPctStr (numMissing, hoveredBarValues.length);
      helpTable.addRow([ genColorBox(colorMap.getMissingColor()), "Missing " + npct, ]);

      // If the enclosing window wants to display the covarate info, send it to them.
      // Otherwise, display it ourselves.
      if (UHM.postMapDetails) {
        var msg = {
          nonce: UHM.myNonce,
          msg: "ShowCovarDetail",
          data: helpContents.innerHTML,
        };
        //If a unique identifier was provided, return it in the message.
        if (UHM.postID != null) {
          msg["id"] = UHM.postID;
        }

        window.parent.postMessage(msg, UHM.postMapToWhom);
      } else {
        helptext.style.display = "inline";
        helptext.appendChild(helpContents);
        locateHelpBox(helptext, mapItem);
      }
    } else {
      // Clicked on the blank area in the top left corner.
    }
    // Helper functions.
    // Return a color box div with the specified background color.
    function genColorBox (color) {
      const colorBox =
        `<div class='input-color'>
           <div class='color-box' style='background-color: ${color};'></div>
         </div>`;
      return colorBox;
    }
    // Return a string with the number of items, and its percentage of total.
    function countPctStr (num, total) {
      const pct = (100 * num / total).toFixed(2);
      return `(n = ${num}, ${pct}%)`;
    }
  };

  /*********************************************************************************************
   * FUNCTION:  handleScroll - The purpose of this function is to handle mouse scroll wheel
   * events to zoom in / out.
   *********************************************************************************************/
  DEV.handleScroll = function (evt) {
    evt.preventDefault();
    const parentElement = evt.currentTarget.parentElement;
    const isDetail = parentElement.classList.contains("detail_chm");
    const mapItem = isDetail
      ? DVW.getMapItemFromChm(parentElement)
      : DVW.primaryMap;
    if (!mapItem) return; // Nothing to scroll if no detail map.
    if (scrollTime == null || evt.timeStamp - scrollTime > 150) {
      scrollTime = evt.timeStamp;
      if (evt.wheelDelta < -30 || evt.deltaY > 0 || evt.scale < 1) {
        //Zoom out
        DEV.detailDataZoomOut(mapItem);
      } else if (evt.wheelDelta > 30 || evt.deltaY < 0 || evt.scale > 1) {
        // Zoom in
        DEV.zoomAnimation(mapItem);
      }
    }
    return false;
  };

  /*********************************************************************************************
   * FUNCTION:  clickStart - The purpose of this function is to handle a user mouse down event.
   *********************************************************************************************/
  DEV.clickStart = function (e) {
    e.preventDefault();
    const mapItem = DVW.getMapItemFromCanvas(e.currentTarget);
    mouseEventActive = true;
    const clickType = UTIL.getClickType(e);
    UHM.hlpC();
    if (clickType === 0) {
      const coords = UTIL.getCursorPosition(e);
      mapItem.dragOffsetX = coords.x; //canvas X coordinate
      mapItem.dragOffsetY = coords.y;
      mouseDown = true;
      // client space
      const divW = e.target.clientWidth;
      const divH = e.target.clientHeight;
      // texture space
      const rowBarW = mapItem.getScaledVisibleCovariates("row").totalHeight();
      const rowTotalW = mapItem.dataViewWidth + rowBarW;
      const colBarH = mapItem
        .getScaledVisibleCovariates("column")
        .totalHeight();
      const colTotalH = mapItem.dataViewHeight + colBarH;
      // proportion space
      const rowDendroW = mapItem.dendroWidth / rowTotalW;
      const colDendroH = mapItem.dendroHeight / colTotalH;
      const rowClassW = rowBarW / rowTotalW;
      const colClassH = colBarH / colTotalH;
      const mapW = mapItem.dataViewWidth / rowTotalW;
      const mapH = mapItem.dataViewHeight / colTotalH;
      const clickX = coords.x / divW;
      const clickY = coords.y / divH;
      mapItem.offsetX = coords.x;
      mapItem.offsetY = coords.y;
      mapItem.pageX = e.targetTouches ? e.targetTouches[0].pageX : e.pageX;
      mapItem.pageY = e.targetTouches ? e.targetTouches[0].pageY : e.pageY;
      if (DET.eventTimer != 0) {
        clearTimeout(DET.eventTimer);
      }
      DET.eventTimer = setTimeout(DEV.userHelpOpen.bind(null, mapItem), 500);
    }
  };

  /*********************************************************************************************
   * FUNCTION:  clickEnd - The purpose of this function is to handle a user mouse up event.
   * If the mouse has not moved out of a given detail row/col between clickStart and clickEnd,
   * user help is opened for that cell.
   *********************************************************************************************/
  DEV.clickEnd = function (e) {
    const mapItem = DVW.getMapItemFromCanvas(e.currentTarget);
    if (mouseEventActive) {
      const clickType = UTIL.getClickType(e);
      if (clickType === 0) {
        //Reset mouse event indicators
        mouseDown = false;
        //Set cursor back to default
        mapItem.canvas.style.cursor = "default";
      }
    }
    mouseEventActive = false;
  };

  /*********************************************************************************************
   * FUNCTION:  dblClick -  The purpose of this function is to handle the situation where the
   * user double-clicks on the detail heat map canvas.  In this case a zoom action is performed.
   * Zoom in if the shift key is not held down and zoom out if the key is held down.
   *********************************************************************************************/
  DEV.dblClick = function (e) {
    const mapItem = DVW.getMapItemFromCanvas(e.currentTarget);
    //turn off single click help if double click
    clearTimeout(DET.eventTimer);
    UHM.hlpC();
    //Get cursor position and convert to matrix row / column
    const rowElementSize =
      (mapItem.dataBoxWidth * mapItem.canvas.clientWidth) /
      mapItem.canvas.width;
    const colElementSize =
      (mapItem.dataBoxHeight * mapItem.canvas.clientHeight) /
      mapItem.canvas.height;
    const coords = UTIL.getCursorPosition(e);
    const mapLocY = coords.y - DET.getColClassPixelHeight(mapItem);
    const mapLocX = coords.x - DET.getRowClassPixelWidth(mapItem);

    const clickRow = Math.floor(
      mapItem.currentRow + (mapLocY / colElementSize) * getSamplingRatio(mapItem.mode,"row"),
    );
    const clickCol = Math.floor(
      mapItem.currentCol + (mapLocX / rowElementSize) * getSamplingRatio(mapItem.mode,"col"),
    );
    const destRow =
      clickRow + 1 - Math.floor(DVW.getCurrentDetDataPerCol(mapItem) / 2);
    const destCol =
      clickCol + 1 - Math.floor(DVW.getCurrentDetDataPerRow(mapItem) / 2);

    // set up panning animation
    const diffRow =
      clickRow +
      1 -
      Math.floor(DVW.getCurrentDetDataPerCol(mapItem) / 2) -
      mapItem.currentRow;
    const diffCol =
      clickCol +
      1 -
      Math.floor(DVW.getCurrentDetDataPerRow(mapItem) / 2) -
      mapItem.currentCol;
    const diffMax = Math.max(diffRow, diffCol);
    const numSteps = 7;
    const rowStep = diffRow / numSteps;
    const colStep = diffCol / numSteps;
    let steps = 1;
    //Special case - if in full map view, skip panning and jump to zoom
    if (mapItem.mode == "FULL_MAP") steps = numSteps;

    drawScene();
    function drawScene(now) {
      steps++;
      if (
        steps < numSteps &&
        !(mapItem.currentRow == destRow && mapItem.currentCol == destCol)
      ) {
        // if we have not finished the animation, continue redrawing
        mapItem.currentRow =
          clickRow +
          1 -
          Math.floor(
            DVW.getCurrentDetDataPerCol(mapItem) / 2 +
              (numSteps - steps) * rowStep,
          );
        mapItem.currentCol =
          clickCol +
          1 -
          Math.floor(
            DVW.getCurrentDetDataPerCol(mapItem) / 2 +
              (numSteps - steps) * colStep,
          );
        DVW.checkRow(mapItem);
        DVW.checkCol(mapItem);
        mapItem.updateSelection();
        requestAnimationFrame(drawScene); // requestAnimationFrame is a native JS function that calls drawScene after a short time delay
      } else {
        // if we are done animating, zoom in
        mapItem.currentRow = destRow;
        mapItem.currentCol = destCol;

        if (e.shiftKey) {
          DEV.detailDataZoomOut(mapItem);
        } else {
          DEV.zoomAnimation(mapItem, clickRow, clickCol);
        }
        //Center the map on the cursor position
        DVW.checkRow(mapItem);
        DVW.checkCol(mapItem);
        mapItem.updateSelection();
      }
    }
  };

  /*********************************************************************************************
   * FUNCTION:  matrixRightClick -  The purpose of this function is to handle a matrix right
   * click on a given detail panel.
   *********************************************************************************************/
  DEV.matrixRightClick = function (e) {
    const mapItem = DVW.getMapItemFromCanvas(e.currentTarget);
    e.preventDefault();
    LNK.openLinkoutMenu(mapItem.heatMap, "Matrix", e);
    let selection = window.getSelection();
    selection.removeAllRanges();
    return false;
  };

  /*********************************************************************************************
   * FUNCTION:  handleMouseOut - The purpose of this function is to handle the situation where
   * the user clicks on and drags off the detail canvas without letting up the mouse button.
   * In these cases, we cancel the mouse event that we are tracking, reset mouseDown, and
   * reset the cursor to default.
   *********************************************************************************************/
  DEV.handleMouseOut = function (e) {
    const mapItem = DVW.getMapItemFromCanvas(e.currentTarget);
    mapItem.canvas.style.cursor = "default";
    mouseDown = false;
    mouseEventActive = false;
  };

  /*********************************************************************************************
   * FUNCTION:  isOnObject - The purpose of this function is to tell us if the cursor is over
   * a given screen object.
   *********************************************************************************************/
  function isOnObject(e, type) {
    const mapItem = DVW.getMapItemFromCanvas(e.currentTarget);
    var rowClassWidthPx = DET.getRowClassPixelWidth(mapItem);
    var colClassHeightPx = DET.getColClassPixelHeight(mapItem);
    var rowDendroWidthPx = DET.getRowDendroPixelWidth(mapItem);
    var colDendroHeightPx = DET.getColDendroPixelHeight(mapItem);
    var coords = UTIL.getCursorPosition(e);
    if (coords.y > colClassHeightPx) {
      if (type == "map" && coords.x > rowClassWidthPx) {
        return true;
      }
      if (
        type == "rowClass" &&
        coords.x < rowClassWidthPx + rowDendroWidthPx &&
        coords.x > rowDendroWidthPx
      ) {
        return true;
      }
    } else if (coords.y > colDendroHeightPx) {
      if (type == "colClass" && coords.x > rowClassWidthPx + rowDendroWidthPx) {
        return true;
      }
    }
    return false;
  }

  /*********************************************************************************************
   * FUNCTION:  getSamplingRatio - This function returns the appropriate row/col sampling ration
   * for the heat map based upon the screen mode.
   *********************************************************************************************/
  function getSamplingRatio(mode, axis) {
    const heatMap = MMGR.getHeatMap();
    const isRow = MAPREP.isRow(axis);
    let level;
    switch (mode) {
      case "RIBBONH":
        level = MAPREP.RIBBON_HOR_LEVEL;
        break;
      case "RIBBONV":
        level = MAPREP.RIBBON_VERT_LEVEL;
        break;
      case "FULL_MAP":
        level = isRow ? MAPREP.RIBBON_VERT_LEVEL : MAPREP.RIBBON_HOR_LEVEL;
        break;
      default:
        level = MAPREP.DETAIL_LEVEL;
    }

    if (isRow) {
      return heatMap.getRowSummaryRatio(level);
    } else {
      return heatMap.getColSummaryRatio(level);
    }
  }

  /*********************************************************************************************
   * FUNCTION:  handleMouseMove - The purpose of this function is to handle a user drag event.
   * The type of move (drag-move or drag-select is determined, based upon keys pressed and the
   * appropriate function is called to perform the function.
   *********************************************************************************************/
  DEV.handleMouseMove = function (e) {
    const mapItem = DVW.getMapItemFromCanvas(e.currentTarget);
    // Do not clear help if the mouse position did not change. Repeated firing of the mousemove event can happen on random
    // machines in all browsers but FireFox. There are varying reasons for this so we check and exit if need be.
    const eX = e.touches ? e.touches[0].clientX : e.clientX;
    const eY = e.touches ? e.touches[0].clientY : e.clientY;
    if (mapItem.oldMousePos[0] != eX || mapItem.oldMousePos[1] != eY) {
      mapItem.oldMousePos = [eX, eY];
    }
    if (mouseDown && mouseEventActive) {
      clearTimeout(DET.eventTimer);
      //If mouse is down and shift key is pressed, perform a drag selection
      //Else perform a drag move
      if (e.shiftKey) {
        //process select drag only if the mouse is down AND the cursor is on the heat map.
        if (mouseDown && isOnObject(e, "map")) {
          SRCH.clearSearch(e);
          DEV.handleSelectDrag(e);
        }
      } else {
        DEV.handleMoveDrag(e);
      }
    }
  };

  /*********************************************************************************************
   * FUNCTION:  handleMoveDrag - The purpose of this function is to handle a user "move drag"
   * event.  This is when the user clicks and drags across the detail heat map viewport. When
   * this happens, the current position of the heatmap viewport is changed and the detail heat
   * map is redrawn
   *********************************************************************************************/
  DEV.handleMoveDrag = function (e) {
    const mapItem = DVW.getMapItemFromCanvas(e.currentTarget);
    if (!mouseDown) return;
    mapItem.canvas.style.cursor = "move";
    const rowElementSize =
      (mapItem.dataBoxWidth * mapItem.canvas.clientWidth) /
      mapItem.canvas.width;
    const colElementSize =
      (mapItem.dataBoxHeight * mapItem.canvas.clientHeight) /
      mapItem.canvas.height;
    if (e.touches) {
      //If more than 2 fingers on, don't do anything
      if (e.touches.length > 1) {
        return false;
      }
    }
    const coords = UTIL.getCursorPosition(e);
    const xDrag = coords.x - mapItem.dragOffsetX;
    const yDrag = coords.y - mapItem.dragOffsetY;
    if (
      Math.abs(xDrag / rowElementSize) > 1 ||
      Math.abs(yDrag / colElementSize) > 1
    ) {
      //Disregard vertical movement if the cursor is not on the heat map.
      if (!isOnObject(e, "colClass")) {
        mapItem.currentRow = Math.round(
          mapItem.currentRow - yDrag / colElementSize,
        );
        mapItem.dragOffsetY = coords.y;
      }
      if (!isOnObject(e, "rowClass")) {
        mapItem.currentCol = Math.round(
          mapItem.currentCol - xDrag / rowElementSize,
        );
        mapItem.dragOffsetX = coords.x; //canvas X coordinate
      }
      DVW.checkRow(mapItem);
      DVW.checkCol(mapItem);
      SRCH.enableDisableSearchButtons(mapItem);
      mapItem.updateSelection();
    }
  };

  /*********************************************************************************************
   * FUNCTION:  handleSelectDrag - The purpose of this function is to handle a user "select drag"
   * event.  This is when the user clicks, holds down the SHIFT key, and drags across the detail
   * heat map viewport. Starting and ending row/col positions are calculated and the row/col
   * search items arrays are populated with those positions (representing selected items on each
   * axis).  Finally, selection markson the Summary heatmap are drawn and the detail heat map is
   * re-drawn
   *********************************************************************************************/
  DEV.handleSelectDrag = function (e) {
    const mapItem = DVW.getMapItemFromCanvas(e.currentTarget);
    mapItem.canvas.style.cursor = "crosshair";
    const rowElementSize =
      (mapItem.dataBoxWidth * mapItem.canvas.clientWidth) /
      mapItem.canvas.width;
    const colElementSize =
      (mapItem.dataBoxHeight * mapItem.canvas.clientHeight) /
      mapItem.canvas.height;
    if (e.touches) {
      //If more than 2 fingers on, don't do anything
      if (e.touches.length > 1) {
        return false;
      }
    }
    const coords = UTIL.getCursorPosition(e);
    const xDrag = e.touches
      ? e.touches[0].layerX - mapItem.dragOffsetX
      : coords.x - mapItem.dragOffsetX;
    const yDrag = e.touches
      ? e.touches[0].layerY - mapItem.dragOffsetY
      : coords.y - mapItem.dragOffsetY;

    if (
      Math.abs(xDrag / rowElementSize) > 1 ||
      Math.abs(yDrag / colElementSize) > 1
    ) {
      //Retrieve drag corners but set to max/min values in case user is dragging
      //bottom->up or left->right.
      const endRow = Math.max(
        DEV.getRowFromLayerY(mapItem, coords.y),
        DEV.getRowFromLayerY(mapItem, mapItem.dragOffsetY),
      );
      const endCol = Math.max(
        DEV.getColFromLayerX(mapItem, coords.x),
        DEV.getColFromLayerX(mapItem, mapItem.dragOffsetX),
      );
      const startRow = Math.min(
        DEV.getRowFromLayerY(mapItem, coords.y),
        DEV.getRowFromLayerY(mapItem, mapItem.dragOffsetY),
      );
      const startCol = Math.min(
        DEV.getColFromLayerX(mapItem, coords.x),
        DEV.getColFromLayerX(mapItem, mapItem.dragOffsetX),
      );
      SRCH.clearSearch(e);
      if (endRow > 0)
        SRCH.setAxisSearchResults("Row", Math.max(1, startRow), endRow);
      if (endCol > 0)
        SRCH.setAxisSearchResults("Column", Math.max(1, startCol), endCol);
      SUM.drawSelectionMarks();
      SUM.drawTopItems();
      DET.updateDisplayedLabels();
      DET.drawSelections();
      SRCH.updateLinkoutSelections();
      SRCH.showSearchResults();
    }
  };

  /*********************************************************************************************
   * FUNCTIONS:  getRowFromLayerY AND getColFromLayerX -  The purpose of this function is to
   * retrieve the row/col in the data matrix that matched a given mouse location.  They utilize
   * event.layerY/X for the mouse position.
   *********************************************************************************************/
  DEV.getRowFromLayerY = function (mapItem, layerY) {
    const colElementSize =
      (mapItem.dataBoxHeight * mapItem.canvas.clientHeight) /
      mapItem.canvas.height;
    const colClassHeightPx = DET.getColClassPixelHeight(mapItem);
    const mapLocY = layerY - colClassHeightPx;
    const maxRow = mapItem.currentRow + mapItem.dataPerCol - 1;
    const ratio = getSamplingRatio(mapItem.mode, "row");
    return Math.min(
      maxRow,
      Math.floor(mapItem.currentRow + (mapLocY / colElementSize) * ratio),
    );
  };

  DEV.getColFromLayerX = function (mapItem, layerX) {
    const rowElementSize =
      (mapItem.dataBoxWidth * mapItem.canvas.clientWidth) /
      mapItem.canvas.width; // px/Glpoint
    const rowClassWidthPx = DET.getRowClassPixelWidth(mapItem);
    const mapLocX = layerX - rowClassWidthPx;
    const maxCol = mapItem.currentCol + mapItem.dataPerRow - 1;
    const ratio = getSamplingRatio(mapItem.mode, "col");
    return Math.min(
      maxCol,
      Math.floor(mapItem.currentCol + (mapLocX / rowElementSize) * ratio),
    );
  };

  /**********************************************************************************
   * FUNCTION - detailDataZoomIn: The purpose of this function is to handle all of
   * the processing necessary to zoom inwards on a given heat map panel.
   *
   * Zooming out may change the user-selected mode from normal mode, to a ribbon mode,
   * eventually to full map mode.  To enable the user-selected mode to be restored on
   * zoom in, each zoom out pushes the zoom mode onto a stack which is used here to
   * determine if we should undo the automatic changes in zoom mode.  Explicit user
   * changes to the zoom mode will clear the mode history.
   **********************************************************************************/
  DEV.detailDataZoomIn = function (mapItem) {
    UHM.hlpC();
    LNK.closeAllLinkoutMenus();
    if (!mapItem.modeHistory) mapItem.modeHistory = [];
    if (mapItem.mode == "FULL_MAP") {
      let mode = mapItem.mode,
        row = 1,
        col = 1;
      let selectedStart = 0,
        selectedStop = 0;
      if (mapItem.modeHistory.length > 0) {
        ({ mode, row, col, selectedStart, selectedStop } =
          mapItem.modeHistory.pop());
      }
      if (mode == "RIBBONH" || mode == "RIBBONH_DETAIL") {
        mapItem.currentRow = row;
        if (selectedStart != 0) {
          mapItem.selectedStart = selectedStart;
          mapItem.selectedStop = selectedStop;
        }
        DET.detailHRibbon(mapItem);
        if (selectedStart != 0) {
          // Go back into 'full ribbon' mode
          DEV.detailDataZoomOut(mapItem);
          // Remove unwanted mode history
          mapItem.modeHistory.pop();
        }
      } else if (mode == "RIBBONV" || mode == "RIBBONV_DETAIL") {
        mapItem.currentCol = col;
        if (selectedStart != 0) {
          mapItem.selectedStart = selectedStart;
          mapItem.selectedStop = selectedStop;
        }
        DET.detailVRibbon(mapItem);
        if (selectedStart != 0) {
          // Go back into 'full ribbon' mode
          DEV.detailDataZoomOut(mapItem);
          // Remove unwanted mode history
          mapItem.modeHistory.pop();
        }
      } else {
        mapItem.saveRow = row;
        mapItem.saveCol = col;
        DET.detailNormal(mapItem);
      }
    } else if (mapItem.mode == "NORMAL") {
      if (mapItem.modeHistory.length > 0) {
        mapItem.modeHistory = [];
      }
      let current = DET.zoomBoxSizes.indexOf(mapItem.dataBoxWidth);
      if (current < DET.zoomBoxSizes.length - 1) {
        let zoomBoxSize = DET.zoomBoxSizes[current + 1];
        DET.setDetailDataSize(mapItem, zoomBoxSize);
      }
      mapItem.updateSelection(false);
    } else if (mapItem.mode == "RIBBONH" || mapItem.mode == "RIBBONH_DETAIL") {
      let mode = mapItem.mode,
        col = 1,
        row = 1;
      if (mapItem.modeHistory.length > 0) {
        ({ mode, row, col } =
          mapItem.modeHistory[mapItem.modeHistory.length - 1]);
        mapItem.saveRow = row;
        mapItem.currentRow = row;
        if (mode == "NORMAL") {
          mapItem.saveCol = col;
        }
      }
      if (mode == "NORMAL") {
        DET.detailNormal(mapItem);
      } else {
        let current = DET.zoomBoxSizes.indexOf(mapItem.dataBoxHeight);
        if (current == -1) {
          //On some maps, one view (e.g. ribbon view) can show bigger data areas than will fit for other view modes.  If so, zoom back out to find a workable zoom level.
          mapItem.dataBoxHeight = DET.zoomBoxSizes[0];
          DET.setDataViewSize(mapItem, "column", DET.SIZE_NORMAL_MODE);
          const numDetailRows = mapItem.heatMap.getNumRows(MAPREP.DETAIL_LEVEL);
          const viewSize = mapItem.dataViewHeight - DET.dataViewBorder;
          while (
            Math.floor(
              viewSize /
                DET.zoomBoxSizes[
                  DET.zoomBoxSizes.indexOf(mapItem.dataBoxHeight)
                ],
            ) >= numDetailRows
          ) {
            DET.setDetailDataHeight(
              mapItem,
              DET.zoomBoxSizes[
                DET.zoomBoxSizes.indexOf(mapItem.dataBoxHeight) + 1
              ],
            );
          }
          DET.setCanvasDimensions(mapItem);
          DET.detInitGl(mapItem);
        } else if (current < DET.zoomBoxSizes.length - 1) {
          DET.setDetailDataHeight(mapItem, DET.zoomBoxSizes[current + 1]);
        }
        mapItem.updateSelection(false);
      }
      mapItem.modeHistory.pop();
    } else if (mapItem.mode == "RIBBONV" || mapItem.mode == "RIBBONV_DETAIL") {
      let mode = mapItem.mode,
        row,
        col;
      if (mapItem.modeHistory.length > 0) {
        ({ mode, row, col } =
          mapItem.modeHistory[mapItem.modeHistory.length - 1]);
        mapItem.saveCol = col;
        mapItem.currentCol = col;
        if (mode == "NORMAL") {
          mapItem.saveRow = row;
        }
      }
      if (mode == "NORMAL") {
        DET.detailNormal(mapItem);
      } else {
        let current = DET.zoomBoxSizes.indexOf(mapItem.dataBoxWidth);
        if (current == -1) {
          //On some maps, one view (e.g. ribbon view) can show bigger data areas than will fit for other view modes.  If so, zoom back out to find a workable zoom level.
          mapItem.dataBoxWidth = DET.zoomBoxSizes[0];
          DET.setDataViewSize(mapItem, "row", DET.SIZE_NORMAL_MODE);
          const numDetailColumns = mapItem.heatMap.getNumColumns(
            MAPREP.DETAIL_LEVEL,
          );
          const viewSize = mapItem.dataViewWidth - DET.dataViewBorder;
          while (
            Math.floor(
              viewSize /
                DET.zoomBoxSizes[
                  DET.zoomBoxSizes.indexOf(mapItem.dataBoxWidth)
                ],
            ) >= numDetailColumns
          ) {
            DET.setDetailDataWidth(
              mapItem,
              DET.zoomBoxSizes[
                DET.zoomBoxSizes.indexOf(mapItem.dataBoxWidth) + 1
              ],
            );
          }

          DET.setCanvasDimensions(mapItem);
          DET.detInitGl(mapItem);
        } else if (current < DET.zoomBoxSizes.length - 1) {
          DET.setDetailDataWidth(mapItem, DET.zoomBoxSizes[current + 1]);
        }
        mapItem.updateSelection(false);
      }
      mapItem.modeHistory.pop();
    }
    SRCH.enableDisableSearchButtons(mapItem);
  };

  /**********************************************************************************
   * FUNCTION - detailDataZoomOut: The purpose of this function is to handle all of
   * the processing necessary to zoom outwards on a given heat map panel.
   **********************************************************************************/
  DEV.detailDataZoomOut = function (mapItem) {
    if (mapItem.mode == "FULL_MAP") {
      // Already in full map view. We actually can't zoom out any further.
      return;
    }
    const chm = mapItem.chm;
    const heatMap = mapItem.heatMap;
    UHM.hlpC();
    LNK.closeAllLinkoutMenus();
    if (!mapItem.modeHistory) mapItem.modeHistory = [];
    mapItem.modeHistory.push({
      mode: mapItem.mode,
      row: mapItem.currentRow,
      col: mapItem.currentCol,
      selectedStart: mapItem.selectedStart,
      selectedStop: mapItem.selectedStop,
    });
    if (mapItem.mode == "NORMAL") {
      const current = DET.zoomBoxSizes.indexOf(mapItem.dataBoxWidth);
      if (
        current > 0 &&
        Math.floor(
          (mapItem.dataViewHeight - DET.dataViewBorder) /
            DET.zoomBoxSizes[current - 1],
        ) <= heatMap.getNumRows(MAPREP.DETAIL_LEVEL) &&
        Math.floor(
          (mapItem.dataViewWidth - DET.dataViewBorder) /
            DET.zoomBoxSizes[current - 1],
        ) <= heatMap.getNumColumns(MAPREP.DETAIL_LEVEL)
      ) {
        DET.setDetailDataSize(mapItem, DET.zoomBoxSizes[current - 1]);
        mapItem.updateSelection();
      } else {
        //If we can't zoom out anymore see if ribbon mode would show more of the map or , switch to full map view.
        if (
          current > 0 &&
          heatMap.getNumRows(MAPREP.DETAIL_LEVEL) <=
            heatMap.getNumColumns(MAPREP.DETAIL_LEVEL)
        ) {
          DEV.detailVRibbonButton(mapItem);
        } else if (
          current > 0 &&
          heatMap.getNumRows(MAPREP.DETAIL_LEVEL) >
            heatMap.getNumColumns(MAPREP.DETAIL_LEVEL)
        ) {
          DEV.detailHRibbonButton(mapItem);
        } else {
          DET.detailFullMap(mapItem);
        }
      }
    } else if (mapItem.mode == "RIBBONH" || mapItem.mode == "RIBBONH_DETAIL") {
      const current = DET.zoomBoxSizes.indexOf(mapItem.dataBoxHeight);
      if (
        current > 0 &&
        Math.floor(
          (mapItem.dataViewHeight - DET.dataViewBorder) /
            DET.zoomBoxSizes[current - 1],
        ) <= heatMap.getNumRows(MAPREP.DETAIL_LEVEL)
      ) {
        // Additional zoom out in ribbon mode.
        DET.setDetailDataHeight(mapItem, DET.zoomBoxSizes[current - 1]);
        mapItem.updateSelection();
      } else {
        // Switch to full map view.
        DET.detailFullMap(mapItem);
      }
    } else if (mapItem.mode == "RIBBONV" || mapItem.mode == "RIBBONV_DETAIL") {
      const current = DET.zoomBoxSizes.indexOf(mapItem.dataBoxWidth);
      if (
        current > 0 &&
        Math.floor(
          (mapItem.dataViewWidth - DET.dataViewBorder) /
            DET.zoomBoxSizes[current - 1],
        ) <= heatMap.getNumColumns(MAPREP.DETAIL_LEVEL)
      ) {
        // Additional zoom out in ribbon mode.
        DET.setDetailDataWidth(mapItem, DET.zoomBoxSizes[current - 1]);
        mapItem.updateSelection();
      } else {
        // Switch to full map view.
        DET.detailFullMap(mapItem);
      }
    } else {
      console.error("Unknown zoom mode ", mapItem.mode);
    }
    SRCH.enableDisableSearchButtons(mapItem);
  };

  /**********************************************************************************
   * FUNCTION - detailHRibbonButton: The purpose of this function is to clear dendro
   * selections and call processing to change to Horizontal Ribbon Mode.
   **********************************************************************************/
  DEV.detailHRibbonButton = function (mapItem) {
    DET.clearDendroSelection(mapItem);
    DET.clearModeHistory(mapItem);
    DET.detailHRibbon(mapItem);
  };

  /**********************************************************************************
   * FUNCTION - detailVRibbonButton: The purpose of this function is to clear dendro
   * selections and call processing to change to Vertical Ribbon Mode.
   **********************************************************************************/
  DEV.detailVRibbonButton = function (mapItem) {
    DET.clearDendroSelection(mapItem);
    DET.clearModeHistory(mapItem);
    DET.detailVRibbon(mapItem);
  };

  /*********************************************************************************************
   * FUNCTION:  labelClick -  The purpose of this function is to handle a label click on a given
   * detail panel.
   *********************************************************************************************/
  DEV.labelClick = labelClick;
  function labelClick(e) {
    const mapItem = DVW.getMapItemFromChm(e.target.parentElement.parentElement);
    SRCH.showSearchResults();
    //These were changed from vars defined multiple times below
    let searchIndex = null;
    let axis = this.dataset.axis;
    const index = this.dataset.index;
    if (e.shiftKey || e.type == "touchmove") {
      // shift + click
      const selection = window.getSelection();
      selection.removeAllRanges();
      const focusNode = e.type == "touchmove" ? e.target : this;
      const focusIndex = Number(focusNode.dataset.index);
      axis = focusNode.dataset.axis;
      if (DET.labelLastClicked[axis]) {
        // if label in the same axis was clicked last, highlight all
        const anchorIndex = Number(DET.labelLastClicked[axis]);
        const startIndex = Math.min(focusIndex, anchorIndex),
          endIndex = Math.max(focusIndex, anchorIndex);
        if (axis.indexOf("Covar") == -1) {
          SRCH.setAxisSearchResults(axis, startIndex, endIndex);
        } else {
          // Can select covariate bar clicked on, but
          SRCH.setAxisSearchResults(axis, focusIndex, focusIndex);
          // Some intermediate covariate bars may be hidden, so need to test for presence of each one.
          for (let idx = startIndex + 1; idx < endIndex; idx++) {
            if (
              document.querySelector(
                '.ClassBar[data-axis="' + axis + '"][data-index="' + idx + '"]',
              )
            ) {
              SRCH.setAxisSearchResults(axis, idx, idx);
            }
          }
        }
      } else {
        // otherwise, treat as normal click
        SRCH.clearSearchItems(focusNode.dataset.axis);
        searchIndex = SRCHSTATE.labelIndexInSearch(axis, focusIndex);
        if (searchIndex) {
          SRCH.clearSearchRange(axis, index, index);
        } else {
          SRCH.setAxisSearchResults(axis, focusIndex, focusIndex);
        }
      }
      DET.labelLastClicked[axis] = focusIndex;
    } else if (e.ctrlKey || e.metaKey) {
      // ctrl or Mac key + click
      searchIndex = SRCHSTATE.labelIndexInSearch(axis, index);
      if (searchIndex) {
        // if already searched, remove from search items
        SRCH.clearSearchRange(axis, index, index);
      } else {
        SRCH.setAxisSearchResults(axis, index, index);
      }
      DET.labelLastClicked[axis] = index;
    } else {
      // standard click
      SRCH.clearSearchItems(axis);
      SRCH.setAxisSearchResults(axis, index, index);
      DET.labelLastClicked[axis] = index;
    }
    const clickType = e.ctrlKey || e.metaKey ? "ctrlClick" : "standardClick";
    const lastClickedIndex = typeof index == "undefined" ? focusIndex : index;
    PIM.postSelectionToPlugins(this.dataset.axis, clickType, index, null);
    const searchElement = document.getElementById("search_text");
    searchElement.value = "";
    document.getElementById("cancel_btn").style.display = "";
    SUM.clearSelectionMarks();
    DET.updateDisplayedLabels();
    DET.updateSelections();
    SUM.drawSelectionMarks();
    SUM.drawTopItems();
    SRCH.showSearchResults();
  }

  /*********************************************************************************************
   * FUNCTION:  labelDrag -  The purpose of this function is to handle a label drag on a given
   * detail panel.
   *********************************************************************************************/
  DEV.labelDrag = labelDrag;
  function labelDrag(e) {
    const mapItem = DVW.getMapItemFromChm(e.target.parentElement.parentElement);
    e.preventDefault();
    mapItem.latestLabelTap = null;
    const selection = window.getSelection();
    selection.removeAllRanges();
    const focusNode =
      e.type == "touchmove"
        ? document.elementFromPoint(e.touches[0].pageX, e.touches[0].pageY)
        : this;
    const focusIndex = Number(focusNode.dataset.index);
    const axis = focusNode.dataset.axis;
    if (DET.labelLastClicked[axis]) {
      // if label in the same axis was clicked last, highlight all
      const anchorIndex = Number(DET.labelLastClicked[axis]);
      const startIndex = Math.min(focusIndex, anchorIndex),
        endIndex = Math.max(focusIndex, anchorIndex);
      SRCH.setAxisSearchResults(axis, startIndex, endIndex);
    } else {
      // otherwise, treat as normal click
      SRCH.clearSearchItems(focusNode.dataset.axis);
      const searchIndex = SRCHSTATE.labelIndexInSearch(axis, focusIndex);
      if (searchIndex) {
        SRCH.clearSearchRange(axis, index, index);
      } else {
        SRCH.setAxisSearchResults(axis, focusIndex, focusIndex);
      }
    }
    DET.labelLastClicked[axis] = focusIndex;
    let searchElement = document.getElementById("search_text");
    searchElement.value = "";
    document.getElementById("cancel_btn").style.display = "";
    DET.updateDisplayedLabels();
    SRCH.showSearchResults();
    DET.updateSelections();
    SUM.drawSelectionMarks();
    SUM.drawTopItems();
    SRCH.showSearchResults();
  }

  /*********************************************************************************************
   * FUNCTION:  labelRightClick -  The purpose of this function is to handle a label right click on a given
   * detail panel.
   *********************************************************************************************/
  DEV.labelRightClick = labelRightClick;
  function labelRightClick(e) {
    const loc = PANE.findPaneLocation (e.currentTarget);
    const mapItem = DVW.getMapItemFromPane(loc.pane.id);
    e.preventDefault();
    const axis = e.target.dataset.axis;
    LNK.openLinkoutMenu(mapItem.heatMap, axis, e);
    let selection = window.getSelection();
    selection.removeAllRanges();
    return false;
  }

  (function () {
    DEV.createClientButtons = function (mapNumber, paneId, switchToPrimaryFn) {
      const icons = [
        UTIL.newElement("DIV.buttonSet", {}, [
          zoomButton("primary_btn" + mapNumber, "icon-make-primary", (ev) => {
            switchToPrimaryFn(findMapItem(ev));
          }),
        ]),

        UTIL.newElement("DIV.buttonSet", {}, [
          srchButton(mapNumber, "srchPrev", paneId, "180deg", (ev) => {
            SRCH.searchPrev(findMapItem(ev));
          }),
          UTIL.newSvgButton(
            "icon-small-circle.srchOrient",
            {
              dataset: {
                tooltip:
                  "Choose the selection movement axis (long click for menu)",
                title: "Choose the selection movement axis",
                intro:
                  "Choose the axis or axes the selection movement buttons can use: both axes, rows only, or columns only. Cycles among allowed values by default. Use a long click for a menu.",
              },
            },
            (el) => {
              el.onmousedown = (ev) => {
                let button = ev.target;
                while (button && button.tagName.toLowerCase() != "button") {
                  button = button.parentElement;
                }
                if (button) {
                  button.dataset.mouseDownTime = "" + performance.now();
                }
              };
              el.onclick = (ev) => {
                ev.stopPropagation();
                let button = ev.target;
                while (button && button.tagName.toLowerCase() != "button") {
                  button = button.parentElement;
                }
                if (button) {
                  const mapItem = findMapItem(ev);
                  if (
                    button.dataset.mouseDownTime &&
                    performance.now() - button.dataset.mouseDownTime < 100
                  ) {
                    SRCH.showNextOrientation(mapItem, button);
                  } else {
                    SRCH.showOrientDialog(mapItem, button);
                  }
                }
              };
              return el;
            },
          ),
          srchButton(mapNumber, "srchNext", paneId, "", (ev) => {
            SRCH.searchNext(false, findMapItem(ev));
          }),
        ]),

        UTIL.newElement("DIV.buttonSet", {}, [
          zoomButton("zoomOut_btn" + mapNumber, "icon-zoom-out", (ev) => {
            DEV.detailDataZoomOut(findMapItem(ev));
          }),
          zoomButton("zoomIn_btn" + mapNumber, "icon-zoom-in", (ev) => {
            DEV.zoomAnimation(findMapItem(ev));
          }),
        ]),

        UTIL.newElement("DIV.buttonSet", {}, [
          modeButton(
            mapNumber,
            paneId,
            true,
            "NORMAL",
            "Normal View",
            65,
            DET.detailNormal,
          ),
          modeButton(
            mapNumber,
            paneId,
            false,
            "RIBBONH",
            "Horizontal Ribbon View",
            115,
            DEV.detailHRibbonButton,
          ),
          modeButton(
            mapNumber,
            paneId,
            false,
            "RIBBONV",
            "Vertical Ribbon View",
            100,
            DEV.detailVRibbonButton,
          ),
        ]),

        UTIL.newElement("DIV.buttonSet", {}, [
          UTIL.newSvgButton("icon-gear.hide"),
        ]),
      ];
      const template = "fit-content(0) auto auto auto fit-content(0)";
      return { template, icons };

      function findMapItem(ev) {
        return DVW.getMapItemFromPane(PANE.findPaneLocation(ev.target).pane.id);
      }
    };

    const srchButtonAttrs = {
      srchPrev: {
        dataset: {
          tooltip: "Move to previous selection.",
          title: "Move to Previous Selection",
          intro:
            "Moves the top or left of the view to the previous selection on the current axis, if any, or to last selection on the other axis if the orientation control is set to any",
          disabledReason:
            "Disabled when no selections on allowed axis/axes outside current view.",
        },
      },
      srchNext: {
        dataset: {
          tooltip: "Move to next selection.",
          title: "Move to Next Selection",
          intro:
            "Moves the top or left of the view to the next selection on the current axis, if any, or to the first selection on the other axis if the orientation control is set to any",
          disabledReason:
            "Disabled when no selections on allowed axis/axes outside current view.",
        },
      },
    };
    function srchButton(mapNumber, buttonClass, paneId, rotate, srchFn) {
      const button = UTIL.newSvgButton(
        "icon-arrow-right-path." + buttonClass,
        srchButtonAttrs[buttonClass],
      );
      const SVG = button.firstChild;
      if (rotate) {
        SVG.style.rotate = rotate;
      }
      button.onclick = srchFn;
      return button;
    }

    const zoomButtonAttrs = {
      "icon-make-primary": {
        dataset: {
          tooltip:
            "Make primary. A green background indicates the primary map.",
          title: "Make Primary",
          intro:
            "Make the current detail view the primary detail view.  Keyboard navigation, the search button, and other controls affect the primary detail view.",
        },
      },
      "icon-zoom-in": {
        dataset: {
          tooltip: "Zoom in",
          title: "Zoom In",
          intro: "Zooms into the view.",
        },
      },
      "icon-zoom-out": {
        dataset: {
          tooltip: "Zoom out",
          title: "Zoom Out",
          intro:
            "Zooms out of the view.  If necessary, it will automatically change the current view mode to a ribbon view or the full map.",
        },
      },
    };
    function zoomButton(btnId, btnIcon, clickFn) {
      const button = UTIL.newSvgButton(btnIcon, zoomButtonAttrs[btnIcon]);
      if (btnIcon == "icon-make-primary") {
        button.classList.add("make-primary");
      }
      button.id = btnId;
      button.onclick = clickFn;
      return button;
    }

    // Create a zoomModeButton when creating a new zoomed view.
    // Parameters:
    // mapNumber - the number of the new zoomed view
    // paneId - the panel id containing the new zoomed view
    // selected - is this button selected initially (must be set for exactly one button in the map)
    // mode - the type of zoom mode set by pressing the button (NORMAL, RIBBONH, RIBBONV)
    // btnHelp - help text to display when the user hovers over the button for a while
    // btnSize - size of the button help text
    // clickFn - function called when the button is clicked.
    const modeButtonAttrs = {
      NORMAL: {
        dataset: {
          tooltip: "Set normal view mode",
          title: "Set normal mode",
          intro:
            "Sets the view mode in this panel to normal. The button will be highlighted in green in normal view mode.",
        },
      },
      RIBBONV: {
        dataset: {
          tooltip: "Set vertical ribbon view mode",
          title: "Set vertical ribbon mode",
          intro:
            "Sets the view mode in this panel to vertical ribbon. The button will be highlighted in green in vertical ribbon mode.",
        },
      },
      RIBBONH: {
        dataset: {
          tooltip: "Set horizontal ribbon view mode",
          title: "Set horizontal ribbon mode",
          intro:
            "Sets the view mode in this panel to horizontal ribbon. The button will be highlighted in green in horizontal ribbon mode.",
        },
      },
    };
    function modeButton(
      mapNumber,
      paneId,
      selected,
      mode,
      btnHelp,
      btnSize,
      clickFn,
    ) {
      const icon = mode == "NORMAL" ? "icon-arrow-quad" : "icon-arrow-double";
      const button = UTIL.newSvgButton(icon, modeButtonAttrs[mode]);
      if (mode == "RIBBONV") button.firstChild.style.rotate = "90deg";
      const baseName = buttonBaseName(mode);
      button.id = baseName + "_btn" + mapNumber;
      button.dataset.mode = mode;
      button.onmouseout = function (e) {
        UHM.hlpC();
      };
      button.onmouseover = function (e) {
        UHM.hlp(button, btnHelp, btnSize);
      };
      button.onclick = function (e) {
        const mapItem = DVW.getMapItemFromPane(paneId);
        DET.clearModeHistory(mapItem);
        clickFn(mapItem);
      };
      return button;
    }

    // Return the baseName of the zoom mode buttons.
    function buttonBaseName(buttonMode) {
      if (buttonMode == "RIBBONH") return "ribbonH";
      if (buttonMode == "RIBBONV") return "ribbonV";
      return "full";
    }

    /**********************************************************************************
     * FUNCTION - setButtons: The purpose of this function is to set the state of
     * buttons on the detail pane header bar when the user selects a button.
     **********************************************************************************/
    DEV.setButtons = setButtons;
    function setButtons(mapItem) {
      const full_btn = document.getElementById("full_btn" + mapItem.panelNbr);
      const ribbonH_btn = document.getElementById(
        "ribbonH_btn" + mapItem.panelNbr,
      );
      const ribbonV_btn = document.getElementById(
        "ribbonV_btn" + mapItem.panelNbr,
      );
      const ribbonV =
        mapItem.mode == "RIBBONV" || mapItem.mode == "RIBBONV_DETAIL";
      const ribbonH =
        mapItem.mode == "RIBBONH" || mapItem.mode == "RIBBONH_DETAIL";
      const normal = !ribbonV && !ribbonH;

      setActive(ribbonV_btn, ribbonV);
      setActive(ribbonH_btn, ribbonH);
      setActive(full_btn, normal);

      function setActive(button, active) {
        if (active) {
          button.classList.add("pressed");
        } else {
          button.classList.remove("pressed");
        }
      }
    }
  })();

  /**********************************************************************************
   * FUNCTION - zoomAnimation: The purpose of this function is to perform a zoom
   * animation when users are zooming out on a given heat map canvas.
   **********************************************************************************/
  DEV.zoomAnimation = function (mapItem, destRow, destCol) {
    const chm = mapItem.chm;
    // set proportion variables for heatmap canvas
    const detViewW = mapItem.dataViewWidth;
    const detViewH = mapItem.dataViewHeight;
    const classBarW = mapItem.getScaledVisibleCovariates("row").totalHeight();
    const classBarH = mapItem
      .getScaledVisibleCovariates("column")
      .totalHeight();
    const dendroW = mapItem.dendroWidth;
    const dendroH = mapItem.dendroHeight;
    const rowTotalW = detViewW + classBarW;
    const colTotalH = detViewH + classBarH;
    const mapWRatio = detViewW / rowTotalW;
    const mapHRatio = detViewH / colTotalH;
    const dendroClassWRatio = 1 - mapWRatio;
    const dendroClassHRatio = 1 - mapHRatio;

    const currentWIndex = DET.zoomBoxSizes.indexOf(mapItem.dataBoxWidth);
    const currentHIndex = DET.zoomBoxSizes.indexOf(mapItem.dataBoxHeight);
    const currentW = mapItem.dataBoxWidth;
    const currentH = mapItem.dataBoxHeight;
    const nextW = DET.zoomBoxSizes[currentWIndex + 1];
    const nextH = DET.zoomBoxSizes[currentHIndex + 1];
    const currentNumCols = (detViewW - 2) / currentW;
    const currentNumRows = (detViewH - 2) / currentH;

    const nextNumCols = (detViewW - 2) / nextW;
    const nextNumRows = (detViewH - 2) / nextH;

    // this is the percentage to zoom in by
    const zoomRatioW = (1 - nextNumCols / currentNumCols) * mapWRatio;
    const zoomRatioH = (1 - nextNumRows / currentNumRows) * mapHRatio;

    // set proportion variables for box canvas
    const boxCtx = mapItem.boxCanvas.getContext("2d");
    const boxW = boxCtx.canvas.width;
    const boxH = boxCtx.canvas.height;

    // if we can't go in any further, don't proceed
    if (
      (mapItem.mode !== "RIBBONH" && nextW == undefined) ||
      (mapItem.mode !== "RIBBONV" && nextH == undefined) ||
      DET.animating == true
    ) {
      return;
    }
    boxCtx.clearRect(0, 0, boxCtx.canvas.width, boxCtx.canvas.height);
    let animationZoomW = 0;
    let animationZoomH = 0;
    let animateCount = 0;
    let animateCountMax = 10;

    animate(mapItem, destRow, destCol);
    function getAnimate() {
      animate(mapItem, destRow, destCol);
    }
    function animate(mapItem, destRow, destCol) {
      const heatMap = MMGR.getHeatMap();
      DET.animating = true;

      DET.detInitGl(mapItem);
      // create new buffer to draw over the current map

      if (animateCount < animateCountMax) {
        // do we keep animating?
        animateCount++;
        if (!mapItem.mode.includes("RIBBONH")) {
          animationZoomW += zoomRatioW / animateCountMax;
        }
        if (!mapItem.mode.includes("RIBBONV")) {
          animationZoomH += zoomRatioH / animateCountMax;
        }
        let texBottom, texLeft, texTop, texRight;
        if (mapItem.mode == "FULL_MAP") {
          let saveRow = mapItem.saveRow;
          let saveCol = mapItem.saveCol;
          if (destRow && destCol) {
            saveRow = destRow * heatMap.getRowSummaryRatio("s");
            saveCol = destCol * heatMap.getColSummaryRatio("s");
          }
          let detWidth = DET.SIZE_NORMAL_MODE - DET.paddingHeight;
          let detHeight = DET.SIZE_NORMAL_MODE - DET.paddingHeight;
          if (
            DET.SIZE_NORMAL_MODE - DET.paddingHeight >
            heatMap.getNumRows("d")
          ) {
            for (let i = 0; i < DET.zoomBoxSizes.length; i++) {
              if (
                (DET.SIZE_NORMAL_MODE - DET.paddingHeight) /
                  DET.zoomBoxSizes[i] <
                heatMap.getNumRows("d")
              ) {
                detHeight =
                  (DET.SIZE_NORMAL_MODE - DET.paddingHeight) /
                  DET.zoomBoxSizes[i];
                break;
              }
            }
          }

          if (
            DET.SIZE_NORMAL_MODE - DET.paddingHeight >
            heatMap.getNumColumns("d")
          ) {
            for (let i = 0; i < DET.zoomBoxSizes.length; i++) {
              if (
                (DET.SIZE_NORMAL_MODE - DET.paddingHeight) /
                  DET.zoomBoxSizes[i] <
                heatMap.getNumColumns("d")
              ) {
                detWidth =
                  (DET.SIZE_NORMAL_MODE - DET.paddingHeight) /
                  DET.zoomBoxSizes[i];
                break;
              }
            }
          }

          const detNum = Math.min(detWidth, detHeight);
          if (destRow && destCol) {
            saveRow = Math.max(1, saveRow - detNum / 2);
            saveCol = Math.max(1, saveCol - detNum / 2);
            mapItem.saveRow = saveRow;
            mapItem.saveCol = saveCol;
          }

          //TODO: do we need to account for summary ratio???
          const leftRatio =
            ((saveCol - 1) * mapWRatio) /
            mapItem.dataPerRow /
            animateCountMax /
            heatMap.getColSummaryRatio("d");
          const rightRatio = Math.max(
            0,
            ((DVW.getCurrentDetDataPerRow(mapItem) *
              heatMap.getColSummaryRatio("d") -
              saveCol -
              1 -
              detNum) *
              mapWRatio) /
              DVW.getCurrentDetDataPerRow(mapItem) /
              animateCountMax /
              heatMap.getColSummaryRatio("d"),
          ); // this one works for maps that are not too big!!
          const topRatio =
            ((saveRow - 1) * mapHRatio) /
            mapItem.dataPerCol /
            animateCountMax /
            heatMap.getRowSummaryRatio("d");
          const bottomRatio = Math.max(
            0,
            ((DVW.getCurrentDetDataPerCol(mapItem) *
              heatMap.getRowSummaryRatio("d") -
              saveRow -
              1 -
              detNum) *
              mapHRatio) /
              DVW.getCurrentDetDataPerCol(mapItem) /
              animateCountMax /
              heatMap.getRowSummaryRatio("d"),
          ); // this one works for maps that are not too big!

          texLeft = dendroClassWRatio + animateCount * leftRatio;
          texBottom = animateCount * bottomRatio;
          texRight = 1 - animateCount * rightRatio;
          texTop = mapHRatio - animateCount * topRatio;
        } else if ((currentNumRows - nextNumRows) % 2 == 0) {
          // an even number of data points are going out of view
          // we zoom the same amount from the top/left as the bottom/right
          // (0,0) is the bottom left corner, (1,1) is the top right
          texLeft = dendroClassWRatio + animationZoomW / 2;
          texBottom = animationZoomH / 2;
          texRight = 1 - animationZoomW / 2;
          texTop = mapHRatio - animationZoomH / 2;
        } else {
          // an odd number of data points are going out of view (ie: if the difference in points shown is 9, move 4 from the top/left, move 5 from the bottom/right)
          // we zoom one less point on the top/left than we do the bottom/right
          const rowDiff = currentNumRows - nextNumRows;
          const colDiff = currentNumCols - nextNumCols;
          const topRatio = Math.floor(rowDiff / 2) / rowDiff;
          const bottomRatio = Math.ceil(rowDiff / 2) / rowDiff;
          const leftRatio = Math.floor(colDiff / 2) / colDiff;
          const rightRatio = Math.ceil(colDiff / 2) / colDiff;
          texLeft = dendroClassWRatio + animationZoomW * leftRatio;
          texBottom = animationZoomH * bottomRatio;
          texRight = 1 - animationZoomW * rightRatio;
          texTop = mapHRatio - animationZoomH * topRatio;
        }

        requestAnimationFrame(getAnimate);
        // draw the updated animation map
        if (mapItem.glManager.OK) {
          // Set the clip region to just the matrix area.
          // (-1,-1 is the bottom left corner of the detail canvas, (1,1) is the top right corner
          const right = 1;
          const bottom = -1;
          const left = -1 + 2 * dendroClassWRatio;
          const top = 1 - 2 * dendroClassHRatio;
          mapItem.glManager.setClipRegion(
            DRAW.GL.rectToTriangles(bottom, left, top, right),
          );
          mapItem.glManager.setTextureRegion(
            DRAW.GL.rectToTriangles(texBottom, texLeft, texTop, texRight),
          );
          mapItem.glManager.drawTexture();
        }
      } else {
        // animation stops and actual zoom occurs
        animationZoomW = 0;
        animationZoomH = 0;
        if (mapItem.glManager.OK) {
          const ctx = mapItem.glManager.context;
          ctx.clear(ctx.COLOR_BUFFER_BIT);
          mapItem.glManager.setClipRegion(DRAW.GL.fullClipSpace);
          mapItem.glManager.setTextureRegion(DRAW.GL.fullTextureSpace);
        }
        DEV.detailDataZoomIn(mapItem);
        DET.animating = false;
      }
    }
  };

  /**********************************************************************************
   * FUNCTION - locateHelpBox: This function determines and sets the location of a
   * popup help box.
   **********************************************************************************/
  function locateHelpBox(helptext, mapItem) {
    var rowClassWidthPx = DET.getRowClassPixelWidth(mapItem);
    var colClassHeightPx = DET.getColClassPixelHeight(mapItem);
    var mapLocY = mapItem.offsetY - colClassHeightPx;
    var mapLocX = mapItem.offsetX - rowClassWidthPx;
    var mapH = mapItem.canvas.clientHeight - colClassHeightPx;
    var mapW = mapItem.canvas.clientWidth - rowClassWidthPx;
    var boxLeft = mapItem.pageX;
    if (mapLocX > mapW / 2) {
      boxLeft = mapItem.pageX - helptext.clientWidth - 10;
    }
    helptext.style.left = boxLeft + "px";
    var boxTop = mapItem.pageY;
    if (boxTop + helptext.clientHeight > mapItem.canvas.clientHeight + 90) {
      if (helptext.clientHeight > mapItem.pageY) {
        boxTop = mapItem.pageY - helptext.clientHeight / 2;
      } else {
        boxTop = mapItem.pageY - helptext.clientHeight;
      }
    }
    //Keep box from going off top of screen so data values always visible.
    if (boxTop < 0) {
      boxTop = 0;
    }
    helptext.style.top = boxTop + "px";
  }
})();
