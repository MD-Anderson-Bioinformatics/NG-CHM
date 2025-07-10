/**********************************************************************************
 * COLOR PALETTE MANAGER:  Manage color palettes.
 **********************************************************************************/
(function () {
  "use strict";
  NgChm.markFile();

  // Define the NgChm Color Palettes namespace.
  const PALETTES = NgChm.createNS("NgChm.PALETTES");
  PALETTES.addPredefinedPalettes = addPredefinedPalettes;  // Export this function.

  // Import other namespaces we need.
  const UTIL = NgChm.importNS("NgChm.UTIL");

  const presetPalettes = new Map();

  presetPalettes.set ("Data Layer", [
    new ColorPreset({
      name: "Blue Red",
      colors: ["#0000FF", "#FFFFFF", "#FF0000"],
      missing: "#000000",
    }),
    new ColorPreset({
      name: "Rainbow",
      colors: [
        "#FF0000",
        "#FF8000",
        "#FFFF00",
        "#00FF00",
        "#0000FF",
        "#FF00FF",
      ],
      missing: "#000000",
    }),
    new ColorPreset({
      name: "Green Red",
      colors: ["#00FF00", "#000000", "#FF0000"],
      missing: "#FFFFFF",
    }),
    new ColorPreset({
      name: "Greyscale",
      colors: ["#000000", "#A0A0A0", "#FFFFFF"],
      missing: "#EBEB00",
    }),
    new ColorPreset({
      name: "Heat",
      colors: [[0,100,100], [60,100,100], [60,0,100]].map(hsv => UTIL.hsvToRgb.apply(null,hsv)),
      missing: "#000000",
    }),
  ]);
  presetPalettes.set ("Discrete", [
    new ColorPreset({
      name: "Palette 1",
      colors: [
        "#1f77b4",
        "#ff7f0e",
        "#2ca02c",
        "#d62728",
        "#9467bd",
        "#8c564b",
        "#e377c2",
        "#7f7f7f",
        "#bcbd22",
        "#17becf",
      ],
      missing: "#ffffff",
    }),
    new ColorPreset({
      name: "Palette 2",
      colors: [
        "#1f77b4",
        "#aec7e8",
        "#ff7f0e",
        "#ffbb78",
        "#2ca02c",
        "#98df8a",
        "#d62728",
        "#ff9896",
        "#9467bd",
        "#c5b0d5",
        "#8c564b",
        "#c49c94",
        "#e377c2",
        "#f7b6d2",
        "#7f7f7f",
        "#c7c7c7",
        "#bcbd22",
        "#dbdb8d",
        "#17becf",
        "#9edae5",
      ],
      missing: "#ffffff",
    }),
    new ColorPreset({
      name: "Palette 3",
      colors: [
        "#393b79",
        "#637939",
        "#8c6d31",
        "#843c39",
        "#7b4173",
        "#5254a3",
        "#8ca252",
        "#bd9e39",
        "#ad494a",
        "#a55194",
        "#6b6ecf",
        "#b5cf6b",
        "#e7ba52",
        "#d6616b",
        "#ce6dbd",
        "#9c9ede",
        "#cedb9c",
        "#e7cb94",
        "#e7969c",
        "#de9ed6",
      ],
      missing: "#ffffff",
    }),
    new ColorPreset({
      name: "Cyan Yellow",
      colors: new Array(121).fill(0).map ((v,idx) => UTIL.hsvToRgb (180-idx, 80, 80)),
      missing: "#000000",
      interpolation: "spread",
    }),
    new ColorPreset({
      name: "Green Magenta",
      colors: [[100,100,100], [200,10,100], [300,100,100]].map(hsv => UTIL.hsvToRgb.apply(null,hsv)),
      missing: "#000000",
      interpolation: "ramp",
    }),
  ]);
  presetPalettes.set ("Continuous", [
    new ColorPreset ({
      name: "Greyscale",
      colors: ["#FFFFFF", "#000000"],
      missing: "#FF0000",
    }),
    new ColorPreset({
      name: "Rainbow",
      colors: ["#FF0000", "#FF8000", "#FFFF00", "#00FF00", "#0000FF", "#FF00FF"],
      missing: "#000000",
    }),
    new ColorPreset ({
      name: "Green Red",
      colors: ["#00FF00", "#000000", "#FF0000"],
      missing: "#ffffff",
    }),
  ]);

  function ColorPreset (props) {
    this.name = props.name;
    this.colors = props.colors;
    this.missing = props.missing || "#000000";
    this.interpolation = props.interpolation || "cycle";
  }
  // Return an array of n colors.
  ColorPreset.prototype.getColorArray = function getColorArray (n) {
    const colors = [];
    if (this.interpolation == "spread") {
      // Pick colors evenly from preset.
      for (const idx of UTIL.pick (n, this.colors.length)) {
        colors.push(this.colors[idx]);
      }
    } else if (this.interpolation == "ramp") {
      for (let j = 0; j < n; j++) {
        const posn = j/(n-1) * (this.colors.length-1);
        const idx = Math.floor(posn);
        if (idx == this.colors.length-1) {
          colors.push(this.colors[idx]);
        } else {
          const c1 = this.colors[idx];
          const c2 = this.colors[idx+1];
          colors.push(UTIL.blendTwoColors (this.colors[idx], this.colors[idx+1], posn-idx));
        }
      }
    } else {
      // Pick colors sequentially from preset.
      // If more than the number of predefined colors, we just cycle back (for now).
      for (let j = 0; j < n; j++) {
        colors.push (this.colors[j % this.colors.length]);
      }
    }
    return colors;
  };

  // Add the predefined color schemes put here
  // colorMapAxis: "row", "col", or undefined (for data layer),
  // colorMapType: "Discrete", "Continuous", or undefined (for data layer)
  function addPredefinedPalettes(prefTable, key, clickHandler, colorMapAxis, colorMapType) {
    prefTable.addRow( ["Choose a pre-defined color palette:"], { underline: true });
    prefTable.addBlankSpace();
    prefTable.addIndent();

    // Iterate over the palette definitions.
    // Add rows of at most three palettes per row.
    const presets = [];
    const names = [];
    for (const preset of presetPalettes.get(colorMapType? colorMapType : "Data Layer")) {
      presets.push(genPreset(key, clickHandler, preset, colorMapAxis, colorMapType));
      names.push(`&nbsp;<b>${preset.name}</b>`);
      if (names.length == 3) {
        prefTable.addRow(presets.slice());
        prefTable.addRow(names.slice(), { fontWeight: 'bold' });
        presets.length = 0;
        names.length = 0;
      }
    }
    if (names.length > 0) {
      prefTable.addRow(presets.slice());
      prefTable.addRow(names.slice(), { fontWeight: 'bold' });
    }
    prefTable.popIndent();
  }

  /* Generate a color scheme preset element.
   * It consists of a gradient bar for the colors in the color scheme
   * followed by a box containing the color for missing values.
   * When clicked, the layer (based on key, axis, and mapType) breaks
   * are set to those of the preset.
   *
   * A unique id is assigned to each new preset to assist automated tests.
   */
  var presetId = 0;
  function genPreset(key, clickHandler, preset, axis, mapType) {
    ++presetId;
    const gradient = "linear-gradient(to right, " + preset.colors.join(", ") + ")";
    const onclick = genHandler (key, preset, axis, mapType);
    const colorsEl = UTIL.newElement(
      "DIV.presetPalette",
      { id: "preset" + presetId, style: { background: gradient } },
      null,
      function (el) {
        el.onclick = onclick;
        return el;
      },
    );
    const missingEl = UTIL.newElement(
      "DIV.presetPaletteMissingColor",
      { style: { background: preset.missing } },
      null,
      function (el) {
        el.onclick = onclick;
        return el;
      },
    );
    return UTIL.newElement("DIV", { style: { display: "flex" } }, [
      colorsEl,
      missingEl,
    ]);
    function genHandler (key, preset, axis, mapType) {
      return function () {
        clickHandler(key, preset, axis, mapType);
      }
    }
  }

})();
