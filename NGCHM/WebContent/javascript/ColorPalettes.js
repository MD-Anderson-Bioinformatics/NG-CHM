/**********************************************************************************
 * COLOR PALETTE MANAGER:  Manage color palettes.
 **********************************************************************************/
(function () {
  "use strict";
  NgChm.markFile();

  // Define the NgChm Color Palettes namespace.
  const PALETTES = NgChm.createNS("NgChm.PALETTES");
  PALETTES.addPredefinedPalettes = addPredefinedPalettes; // Export this function.

  // Import other namespaces we need.
  const UTIL = NgChm.importNS("NgChm.UTIL");
  const EXEC = NgChm.importNS("NgChm.EXEC");

  const presetPalettes = new Map();

  presetPalettes.set("continuous", [
    new ColorPreset({
      name: "Blue Red",
      colors: ["#0000FF", "#FFFFFF", "#FF0000"],
      missing: "#000000"
    }),
    new ColorPreset({
      name: "Green Red",
      colors: ["#00FF00", "#000000", "#FF0000"],
      missing: "#ffffff"
    }),
    new ColorPreset({
      name: "Rainbow",
      colors: ["#FF0000", "#FF8000", "#FFFF00", "#00FF00", "#0000FF", "#FF00FF"],
      missing: "#000000"
    }),
    new ColorPreset({
      name: "Greyscale",
      colors: ["#FFFFFF", "#000000"],
      missing: "#FF0000"
    }),
    new ColorPreset({
      name: "Heat",
      colors: [
        [0, 100, 100],
        [60, 100, 100],
        [60, 0, 100]
      ].map((hsv) => UTIL.hsvToRgb.apply(null, hsv)),
      missing: "#000000"
    }),
    new ColorPreset({
      name: "Heat 2",
      colors: [
        [0, 100, 0],
        [0, 100, 100],
        [60, 100, 100],
        [60, 0, 100]
      ].map((hsv) => UTIL.hsvToRgb.apply(null, hsv)),
      missing: "#00ffff"
    })
  ]);
  presetPalettes.set("discrete", [
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
        "#17becf"
      ],
      missing: "#ffffff"
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
        "#9edae5"
      ],
      missing: "#ffffff"
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
        "#de9ed6"
      ],
      missing: "#ffffff"
    }),
    new ColorPreset({
      name: "Greyscale",
      colors: [ "#ffffff", "#555555" ],
      missing: "#ff0000",
      interpolation: "ramp"
    }),
    new ColorPreset({
      name: "Cyan Yellow",
      colors: new Array(121).fill(0).map((v, idx) => UTIL.hsvToRgb(180 - idx, 80, 80)),
      missing: "#000000",
      interpolation: "spread"
    }),
    new ColorPreset({
      name: "Green Magenta",
      colors: [
        [100, 100, 100],
        [200, 10, 100],
        [300, 100, 100]
      ].map((hsv) => UTIL.hsvToRgb.apply(null, hsv)),
      missing: "#000000",
      interpolation: "ramp"
    })
  ]);

  function ColorPreset(props) {
    this.name = props.name;
    this.colors = props.colors;
    this.missing = props.missing || "#000000";
    this.interpolation = props.interpolation || "cycle";
  }
  // Return an array of n colors.
  ColorPreset.prototype.getColorArray = function getColorArray(n) {
    const colors = [];
    if (this.interpolation == "spread") {
      // Pick colors evenly from preset.
      for (const idx of UTIL.pick(n, this.colors.length)) {
        colors.push(this.colors[idx]);
      }
    } else if (this.interpolation == "ramp") {
      for (let j = 0; j < n; j++) {
        const posn = (j / (n - 1)) * (this.colors.length - 1);
        const idx = Math.floor(posn);
        if (idx == this.colors.length - 1) {
          colors.push(this.colors[idx]);
        } else {
          const c1 = this.colors[idx];
          const c2 = this.colors[idx + 1];
          colors.push(UTIL.blendTwoColors(c1, c2, posn - idx));
        }
      }
    } else {
      // Pick colors sequentially from preset.
      // If more than the number of predefined colors, we just cycle back (for now).
      for (let j = 0; j < n; j++) {
        colors.push(this.colors[j % this.colors.length]);
      }
    }
    return colors;
  };

  // Add the predefined color schemes put here
  // colorMapAxis: "row" or "col".
  // colorMapType: "discrete" or "continuous".
  function addPredefinedPalettes(prefTable, key, clickHandler, colorMapAxis, colorMapType) {
    prefTable.addRow(["Choose a pre-defined color palette:"], { underline: true });
    prefTable.addBlankSpace();
    prefTable.addIndent();

    // Iterate over the palette definitions.
    // Add rows of at most three palettes per row.
    const presets = [];
    const names = [];
    for (const preset of presetPalettes.get(colorMapType)) {
      presets.push(genPreset(key, clickHandler, preset, colorMapAxis, colorMapType));
      names.push(`&nbsp;<b>${preset.name}</b>`);
      if (names.length == 3) {
        prefTable.addRow(presets.slice());
        prefTable.addRow(names.slice(), { fontWeight: "bold" });
        presets.length = 0;
        names.length = 0;
      }
    }
    if (names.length > 0) {
      prefTable.addRow(presets.slice());
      prefTable.addRow(names.slice(), { fontWeight: "bold" });
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
    const onclick = genHandler(key, preset, axis, mapType);
    const colorsEl = UTIL.newElement(
      "DIV.presetPalette",
      { id: "preset" + presetId, style: { background: gradient } },
      null,
      function (el) {
        el.onclick = onclick;
        return el;
      }
    );
    const missingEl = UTIL.newElement(
      "DIV.presetPaletteMissingColor",
      { style: { background: preset.missing } },
      null,
      function (el) {
        el.onclick = onclick;
        return el;
      }
    );
    return UTIL.newElement("DIV", { style: { display: "flex" } }, [colorsEl, missingEl]);

    // Helper function.
    // Return a clickHandler that has access to the
    // specified parameters.
    function genHandler(key, preset, axis, mapType) {
      return function () {
        clickHandler(key, preset, axis, mapType);
      };
    }

  }

  // Support for querying/modifying presets via execCommand.
  //
  const presetCommands = new Map();
  presetCommands.set ("list", {
    synopsis: "",
    helpRoute: [
      function (req, res, next) {
        res.output.write("list the available presets");
        next();
      },
    ],
    route: [
      EXEC.noMoreParams,
      function listPresets(req, res) {
        const output = res.output;
        for (const datatype of ["discrete", "continuous"]) {
          output.write (`${UTIL.toTitleCase(datatype)} presets:`);
          output.write();
          output.indent();
          for (const preset of presetPalettes.get(datatype)) {
            output.write (`${preset.name}: ${preset.colors.length} colors.`);
          }
          output.unindent();
          output.write();
        }
      }
    ]
  });
  presetCommands.set ("set-colors", {
    synopsis: "datatype name color1 color2...",
    helpRoute: [
      function (req, res, next) {
        res.output.write("set the colors on a new or existing preset");
        next();
      },
      helpPresetName,
      EXEC.helpDataType,
      EXEC.helpColorValue,
    ],
    route: [
      EXEC.reqDataType,
      EXEC.genRequired("name"),
      EXEC.reqColorArray,
      function (req, res) {
        if (req.colors.length < 2) {
          throw `${req.command} ${req.subcommand}: Not enough parameters. At least two colors are required.`;
        }
        return setPresetColors(req.datatype, req.name, req.colors, res.output);
      }
    ]
  });
  presetCommands.set ("set-missing", {
    synopsis: "datatype name color",
    helpRoute: [
      function (req, res, next) {
        res.output.write("set the missing color on an existing preset");
        next();
      },
      helpPresetName,
      EXEC.helpDataType,
      EXEC.helpColorValue,
    ],
    route: [
      EXEC.reqDataType,
      EXEC.genRequired("name"),
      EXEC.reqColor,
      EXEC.noMoreParams,
      function (req, res) {
        const preset = getPreset (req.datatype, req.name, res.output);
        if (preset) {
          preset.missing = req.color;
          res.output.write(`Replaced missing color in ${req.datatype} preset '${req.name}'`);
        }
      }
    ]
  });
  presetCommands.set ("show", {
    synopsis: "datatype name",
    helpRoute: [
      function (req, res, next) {
        res.output.write("show an existing preset");
        next();
      },
      helpPresetName,
      EXEC.helpDataType,
    ],
    route: [
      EXEC.reqDataType,
      EXEC.genRequired("name"),
      EXEC.noMoreParams,
      function (req, res) {
        return showPreset(req.datatype, req.name, res.output);
      }
    ]
  });
  presetCommands.set ("remove", {
    synopsis: "datatype name",
    helpRoute: [
      function (req, res, next) {
        res.output.write("remove an existing preset");
        next();
      },
      helpPresetName,
      EXEC.helpDataType,
    ],
    route: [
      EXEC.reqDataType,
      EXEC.genRequired("name"),
      EXEC.noMoreParams,
      function (req, res) {
        return removePreset(req.datatype, req.name, res.output);
      }
    ]
  });
  presetCommands.set ("get-colors", {
    synopsis: "datatype name",
    helpRoute: [
      function (req, res, next) {
        res.output.write("get the colors of an existing preset");
        next();
      },
      helpPresetName,
      EXEC.helpDataType,
    ],
    route: [
      EXEC.reqDataType,
      EXEC.genRequired("name"),
      EXEC.noMoreParams,
      function (req, res) {
        const preset = getPreset (req.datatype, req.name, res.output);
        res.value = preset ? preset.colors : null;
      }
    ]
  });
  presetCommands.set ("get-missing", {
    synopsis: "datatype name",
    helpRoute: [
      function (req, res, next) {
        res.output.write("get the missing color of an existing preset");
        next();
      },
      helpPresetName,
      EXEC.helpDataType,
    ],
    route: [
      EXEC.reqDataType,
      EXEC.genRequired("name"),
      EXEC.noMoreParams,
      function (req, res) {
        const preset = getPreset (req.datatype, req.name, res.output);
        res.value = preset ? preset.missing : null;
      }
    ]
  });

  const helper = [
    EXEC.genSubCommandHelp (presetCommands),
    helpPresetName,
    EXEC.helpDataType,
    EXEC.helpColorValue,
  ];

  function helpPresetName (req, res, next) {
    res.output.write();
    res.output.write("Name is the name of a color preset.");
    next();
  }

  UTIL.registerCommand ("preset", presetCommand, helper);

  function presetCommand(req, res, next) {
    EXEC.doSubCommand (presetCommands, helper, req, res, next);
  }

  function getPreset(datatype, name, output) {
    const presets = presetPalettes.get(datatype);
    const index = presets.map((p) => p.name).indexOf(name);
    if (index < 0) {
      output.error (`${UTIL.toTitleCase(datatype)} preset ${name} does not exist.`);
      return null;
    }
    return presets[index];
  }

  function showPreset(datatype, name, output) {
    const preset = getPreset (datatype, name, output);
    if (preset) {
      output.write (`${preset.name} (${preset.colors.length} colors):`);
      output.write (`${preset.colors.join(', ')}`);
      output.write (`Missing: ${preset.missing}`);
    }
  }

  function setPresetColors(datatype, name, colors, output) {
    const presets = presetPalettes.get(datatype);
    const index = presets.map((p) => p.name).indexOf(name);
    if (index < 0) {
      const newPreset = new ColorPreset({ name, colors, missing: "#000000" });
      presets.push(newPreset);
      output.write(`Added ${datatype} preset '${name}'`);
    } else {
      presets[index].colors = colors;
      output.write(`Replaced colors in ${datatype} preset '${name}'`);
    }
  }

  function removePreset(datatype, name, output) {
    const presets = presetPalettes.get(datatype);
    const index = presets.map((p) => p.name).indexOf(name);
    if (index < 0) {
      throw `Unable to remove ${datatype} preset ${name}: no such preset`;
      return;
    }
    presets.splice(index, index + 1);
    output.write(`Removed ${datatype} preset '${name}'`);
  }
})();
