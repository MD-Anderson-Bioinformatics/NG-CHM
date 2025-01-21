(function () {
  "use strict";
  NgChm.markFile();

  // Define Namespace for NgChm ColorMapManager
  const CMM = NgChm.createNS("NgChm.CMM");

  const MAPREP = NgChm.importNS("NgChm.MAPREP");

  CMM.ColorMap = function (heatMap, colorMapObj) {
    this.heatMap = heatMap;
    var type = colorMapObj["type"];
    var thresholds;
    if (type == "quantile") {
      thresholds = colorMapObj["linearEquiv"];
    } else {
      thresholds = colorMapObj["thresholds"];
    }
    var numBreaks = thresholds.length;

    // Hex colors
    var colors = colorMapObj["colors"];
    var missingColor = colorMapObj["missing"];

    // RGBA colors
    var rgbaColors = [];
    var rgbaMissingColor;

    if (colorMapObj["rgbaColors"] != undefined) {
      rgbaColors = colorMapObj["rgbaColors"];
    } else {
      for (var i = 0; i < numBreaks; i++) {
        rgbaColors[i] = hexToRgba(colors[i]);
      }
    }

    if (colorMapObj["rgbaMissingColor"] != undefined) {
      rgbaMissingColors = colorMapObj["rgbaMissingColor"];
    } else {
      rgbaMissingColor = hexToRgba(missingColor);
    }

    this.getThresholds = function () {
      return thresholds;
    };

    this.setThresholds = function (newthresholds) {
      thresholds = newthresholds;
    };
    /**********************************************************************************
     * FUNCTION - getContinuousThresholdKeys: This function calculates and returns an
     * array containing 10 continuous threshold breakpoint keys from the original thresholds
     * submitted.  It is used only for rendering a continuous classification bar help.
     **********************************************************************************/
    this.getContinuousThresholdKeys = function () {
      const conThresh = new Array();
      const bottomThresh = thresholds[0];
      const threshSize = this.getContinuousThresholdKeySize();
      // Add first threshold from original threshold list
      conThresh.push(bottomThresh);
      // Calculate and create "interim" 8 thresholds
      for (let i = 1; i <= 8; i++) {
        conThresh.push(bottomThresh + threshSize * i);
      }
      // Add last threshold from original threshold list
      conThresh.push(thresholds[thresholds.length - 1]);
      return conThresh;
    };

    /**********************************************************************************
     * FUNCTION - getContinuousThresholdKeySize: This function calculates the size
     * separating each "interim" threshold key for a continuous classification bar.
     **********************************************************************************/
    this.getContinuousThresholdKeySize = function () {
      const bottomThresh = thresholds[0];
      const topThresh = thresholds[thresholds.length - 1];
      return (topThresh - bottomThresh) / 9;
    };

    this.getColors = function () {
      return colors;
    };
    this.setColors = function (newcolors) {
      colors = newcolors;
    };
    this.getType = function () {
      return type;
    };
    this.getMissingColor = function () {
      return missingColor;
    };
    this.setMissingColor = function (color) {
      missingColor = color;
    };

    class ContColorMap {
      constructor(colorMap, thresholds) {
        this.minBreak = thresholds[0];
        this.maxIdx = thresholds.length - 1;
        this.maxBreak = thresholds[this.maxIdx];
        this.thresholds = thresholds;
        this.cutsColor = colorMap.getCutsColor();
      }

      getColor(value) {
        if (value === "Missing" || isNaN(value)) {
          return rgbaMissingColor;
        }
        return this.contColor(+value);
      }

      contColor(value) {
        if (value <= this.minBreak) {
          return value <= MAPREP.minValues ? this.cutsColor : rgbaColors[0];
        } else if (value >= this.maxBreak) {
          return value >= MAPREP.maxValues
            ? rgbaMissingColor
            : rgbaColors[this.maxIdx];
        } else {
          let idx;
          //  Since we know value < this.maxBreak, tests below are valid and loop must terminate.
          if (value < this.thresholds[1]) {
            idx = 0;
          } else if (value < this.thresholds[2]) {
            idx = 1;
          } else {
            idx = 2;
            while (value >= this.thresholds[idx + 1]) {
              idx++;
            }
          }
          // Assert: this.thresholds[idx] <= value < this.thresholds[idx+1]
          return blendColors(value, idx, this.thresholds);
        }
      }
    }

    this.getContColorMap = function () {
      return new ContColorMap(this, thresholds);
    };

    this.getCutsColor = function () {
      const dl = this.heatMap.getDataLayers()[this.heatMap.getCurrentDL()];
      if (typeof dl.cuts_color !== "undefined") {
        return hexToRgba(dl.cuts_color);
      } else {
        return { r: 255, g: 255, b: 255, a: 255 };
      }
    };

    // returns an RGBA value from the given value
    this.getColor = function (value) {
      var color;

      if (value >= MAPREP.maxValues || value == "Missing" || isNaN(value)) {
        color = rgbaMissingColor;
      } else if (value <= MAPREP.minValues) {
        color = this.getCutsColor();
      } else if (value <= thresholds[0]) {
        color = rgbaColors[0]; // return color for lowest threshold if value is below range
      } else if (value >= thresholds[numBreaks - 1]) {
        color = rgbaColors[numBreaks - 1]; // return color for highest threshold if value is above range
      } else {
        const bounds = findBounds(value, thresholds);
        color = blendColors(value, bounds["lower"], thresholds);
      }

      return color;
    };

    this.getClassificationColor = function (value) {
      var color;
      if (value == "!CUT!") {
        return { r: 255, g: 255, b: 255, a: 255 };
      }
      if (value === "All Black") {
        return { r: 0, g: 0, b: 0, a: 255 };
      }
      if (type == "discrete") {
        for (var i = 0; i < thresholds.length; i++) {
          if (value == thresholds[i]) {
            color = rgbaColors[i];
            return color;
          }
        }
        return rgbaMissingColor;
      } else {
        if (isNaN(value)) {
          color = rgbaMissingColor;
        } else {
          color = this.getColor(value);
        }
      }

      return color;
    };

    this.addBreakpoint = function (value, color) {
      var bounds = findBounds(value, thresholds);
      thresholds.splice(bounds["lower"], 0, value);
      colors.splice(bounds["lower"], 0, color);
      rgbaColors.splice(bounds["lower"], 0, hexToRgba(color));
    };

    this.changeBreakpoint = function (value, newColor) {
      var bounds = findBounds(value, thresholds);
      thresholds.splice(bounds["lower"], 1, value);
      colors.splice(bounds["lower"], 1, newColor);
      rgbaColors.splice(bounds["lower"], 1, hexToRgba(newColor));
    };

    this.removeBreakpoint = function (value) {
      var bounds = findBounds(value, thresholds);
      thresholds.splice(bounds["lower"], 1);
      colors.splice(bounds["lower"], 1);
      rgbaColors.splice(bounds["lower"], 1);
    };

    //===========================//
    // internal helper functions //
    //===========================//

    function findBounds(value, thresholds) {
      var bounds = {};
      var i = 0;
      while (i < numBreaks) {
        if (thresholds[i] <= value && value < thresholds[i + 1]) {
          bounds["upper"] = i + 1;
          bounds["lower"] = i;
          break;
        }
        i++;
      }
      return bounds;
    }

    function blendColors(value, idx, thresholds) {
      const ratio =
        (value - thresholds[idx]) / (thresholds[idx + 1] - thresholds[idx]);
      const lowerColor = rgbaColors[idx];
      const upperColor = rgbaColors[idx + 1];
      // lowerColor and upperColor should be in { r:###, g:###, b:### } format
      const color = {};
      color["r"] = Math.round(
        lowerColor["r"] * (1.0 - ratio) + upperColor["r"] * ratio,
      );
      color["g"] = Math.round(
        lowerColor["g"] * (1.0 - ratio) + upperColor["g"] * ratio,
      );
      color["b"] = Math.round(
        lowerColor["b"] * (1.0 - ratio) + upperColor["b"] * ratio,
      );
      color["a"] = 255;
      return color;
    }

    function hexToRgb(hex) {
      var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
          }
        : null;
    }

    this.getColorLuminance = function (color) {
      var rgb = hexToRgb(color);
      if (!rgb) {
        return null;
      } else {
        return 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
      }
    };

    this.isColorDark = function (rgb) {
      if (!rgb) {
        return false;
      } else {
        var luminanceVal = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
        if (luminanceVal < 60) {
          return false;
        } else {
          return true;
        }
      }
    };

    this.getRgbToHex = function (rgb) {
      var a = rgb.a;
      var r = rgb.r;
      var g = rgb.g;
      var b = rgb.b;
      return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
    };

    function rgbToHex(rgb) {
      const { r, g, b } = rgb;
      return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
    }

    function componentToHex(c) {
      var hex = c.toString(16);
      return hex.length == 1 ? "0" + hex : hex;
    }

    // Return the hex color that is ratio*color1 + (1-ratio)*color2.
    // 0.0 <= ratio <= 1.0
    function blendHexColors(color1, color2, ratio) {
      const rgba1 = hexToRgba(color1);
      const rgba2 = hexToRgba(color2);
      return rgbToHex({
        r: (rgba1.r * ratio + rgba2.r * (1.0 - ratio)) | 0,
        g: (rgba1.g * ratio + rgba2.g * (1.0 - ratio)) | 0,
        b: (rgba1.b * ratio + rgba2.b * (1.0 - ratio)) | 0,
        a: (rgba1.a * ratio + rgba2.a * (1.0 - ratio)) | 0,
      });
    }
    CMM.blendHexColors = blendHexColors;

    function darkenHexColorIfNeeded(hex) {
      const { r, g, b } = hexToRgba(hex);
      const low = Math.min(r, g, b);
      if (low <= 240) {
        return hex;
      } else {
        const s = 240.0 / low;
        return rgbToHex({ r: (r * s) | 0, g: (g * s) | 0, b: (b * s) | 0 });
      }
    }
    CMM.darkenHexColorIfNeeded = darkenHexColorIfNeeded;
  };

  // All color maps and current color maps are stored here.
  CMM.ColorMapManager = function (heatMap) {
    this.heatMap = heatMap;

    const mapConfig = heatMap.mapConfig;
    const colorMapCollection = [
      mapConfig.data_configuration.map_information.data_layer,
      mapConfig.row_configuration.classifications,
      mapConfig.col_configuration.classifications,
    ];

    this.getColorMap = function (type, colorMapName) {
      const colorMapIdx = type === "data" ? 0 : type === "row" ? 1 : 2;
      const colorMap = new CMM.ColorMap(
        this.heatMap,
        colorMapCollection[colorMapIdx][colorMapName].color_map,
      );
      return colorMap;
    };

    this.setColorMap = function (colorMapName, colorMap, type) {
      const colorMapIdx = type === "data" ? 0 : type === "row" ? 1 : 2;
      const existingColorMap =
        colorMapCollection[colorMapIdx][colorMapName].color_map;
      existingColorMap.colors = colorMap.getColors();
      existingColorMap.thresholds = colorMap.getThresholds();
      existingColorMap.missing = colorMap.getMissingColor();
    };
  };

  CMM.hexToRgba = hexToRgba;
  function hexToRgba(hex) {
    // I didn't write this function. I'm not that clever. Thanks stackoverflow
    var rgbColor = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return rgbColor
      ? {
          r: parseInt(rgbColor[1], 16),
          g: parseInt(rgbColor[2], 16),
          b: parseInt(rgbColor[3], 16),
          a: 255,
        }
      : null;
  }
})();
