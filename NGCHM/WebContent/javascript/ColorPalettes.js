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
    {
      name: "Blue Red",
      colors: ["#0000FF", "#FFFFFF", "#FF0000"],
      missing: "#000000",
    },
    {
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
    },
    {
      name: "Green Red",
      colors: ["#00FF00", "#000000", "#FF0000"],
      missing: "#FFFFFF",
    },
    {
      name: "Greyscale",
      colors: ["#000000", "#A0A0A0", "#FFFFFF"],
      missing: "#EBEB00",
    },
  ]);
  presetPalettes.set ("Discrete", [
    {
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
      },
    {
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
    },
    {
      name: "Palette3 3",
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
    },
  ]);
  presetPalettes.set ("Continuous", [
    { name: "Greyscale",
      colors: ["#FFFFFF", "#000000"],
        missing: "#FF0000",
    },
    {
      name: "Rainbow",
        colors: ["#FF0000", "#FF8000", "#FFFF00", "#00FF00", "#0000FF", "#FF00FF"],
        missing: "#000000",
    },
    { name: "Green Red",
      colors: ["#00FF00", "#000000", "#FF0000"],
        missing: "#ffffff",
    },
  ]);

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
      presets.push(genPreset(key, clickHandler, preset.colors, preset.missing, colorMapAxis, colorMapType));
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
  function genPreset(key, clickHandler, colors, missingColor, axis, mapType) {
    ++presetId;
    const gradient = "linear-gradient(to right, " + colors.join(", ") + ")";
    const onclick = genHandler (key, colors, missingColor, axis, mapType);
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
      { style: { background: missingColor } },
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
    function genHandler (key, colors, missingColor, axis, mapType) {
      return function () {
        clickHandler(key, colors, missingColor, axis, mapType);
      }
    }
  }

})();
