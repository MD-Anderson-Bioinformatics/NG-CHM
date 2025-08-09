/**********************************************************************************
 * HEATMAP COMMANDS:  The following functions define commands for managing heatmaps.
 **********************************************************************************/
(function () {
  "use strict";
  NgChm.markFile();

  // Import required namespaces.
  const MAPREP = NgChm.importNS("NgChm.MAPREP");
  const MMGR = NgChm.importNS("NgChm.MMGR");
  const UTIL = NgChm.importNS("NgChm.UTIL");
  const EXEC = NgChm.importNS("NgChm.EXEC");
  const SRCHSTATE = NgChm.importNS("NgChm.SRCHSTATE");

  // Potentially useful for many commands.
  EXEC.mapOptions = new Map();
  EXEC.mapOptions.set ("--map", { field: "mapName", args: 1 });
  EXEC.helpMapOptions = function (req, res, next) {
    res.output.write(`--map name  : set the heat map (default is the current heat map).`);
    next();
  };
  EXEC.axisOptions = new Map();
  EXEC.axisOptions.set ("--row", {
    field: "--row",
    args: 0,
  });
  EXEC.axisOptions.set ("--column", {
    field: "--column",
    args: 0,
  });
  EXEC.helpAxisOptions = function (req, res, next) {
    res.output.write(`--row : use the heat map rows.`);
    res.output.write(`--column : use the heat map columns.`);
    next();
  };

  EXEC.getHeatMap = function getHeatMap (req, res, next) {
    if (!req.mapName) {
      req.heatMap = MMGR.getHeatMap();
      req.mapName = req.heatMap.getMapInformation().name;
    }
    for (const heatMap of MMGR.getAllHeatMaps()) {
      const info = heatMap.getMapInformation();
      if (info.name == req.mapName) {
        req.heatMap = heatMap;
        return next();
      }
    }
    throw `did not find a heatmap called ${req.mapName}`;
  };

  // Required covariate.
  EXEC.reqCovariate = function reqCovariate(req, res, next) {
    if (req.args.length == 0) {
      throw `Missing covariate name.`;
    }
    req.covariateName = req.args.shift();
    if (req.covariateName.length == 0) {
      throw `Covariate name cannot be empty.`;
    }
    if (req.axis) {
      // User specified the axis.
      const covBars = req.heatMap.getAxisCovariateConfig(req.axis);
      if (covBars.hasOwnProperty(req.covariateName)) {
        req.covar = covBars[req.covariateName];
        return next();
      }
      throw `unknown ${req.axis} covariate ${req.covariateName}`;
    } else {
      // Look for it on the columns.
      const columnBars = req.heatMap.getAxisCovariateConfig("column");
      const rowBars = req.heatMap.getAxisCovariateConfig("row");
      const onColumns = columnBars.hasOwnProperty(req.covariateName);
      const onRows = rowBars.hasOwnProperty(req.covariateName);
      if (onColumns && onRows) {
        throw `ambiguous axis for covariate ${req.covariateName}`;
      } else if (onColumns) {
        req.axis = "column";
        req.covar = columnBars[req.covariateName];
        return next();
      } else if (onRows) {
        req.axis = "row";
        req.covar = rowBars[req.covariateName];
        return next();
      } else {
        throw `unknown covariate ${req.covariateName}`;
      }
    }
  };

  const heatmapCommands = new Map();

  heatmapCommands.set("list", {
    synopsis: "",
    helpRoute: [
      function (req, res, next) {
        res.output.write("list all heatmaps");
        next();
      },
    ],
    route: [
      function (req, res) {
        const currentHeatmap = MMGR.getHeatMap();
        const output = res.output;
        output.write();
        output.write("Heatmaps:");
        output.indent();
        output.write();
        for (const heatMap of MMGR.getAllHeatMaps()) {
          const info = heatMap.getMapInformation();
          const flag = heatMap == currentHeatmap ? "(*) " : "";
          output.write (`${flag}${info.name}`);
        }
        output.unindent();
      }
    ]
  });

  heatmapCommands.set("show", {
    synopsis: "[--map name]",
    helpRoute: [
      function (req, res, next) {
        res.output.write("output details of the heatmap (defaults to the current heatmap).");
        next();
      },
      EXEC.showOptions([
        EXEC.helpMapOptions,
      ]),
    ],
    route: [
      EXEC.genGetOptions (EXEC.mapOptions),
      EXEC.getHeatMap,
      function (req, res) {
        const output = res.output;
        const info = req.heatMap.getMapInformation();
        output.write();
        output.write(`Heatmap: ${info.name}` );
        output.write(`Description:`);
        output.indent();
        output.write(info.description);
        output.unindent();
        const layers = req.heatMap.getSortedLayers();
        const layerNames = layers.map(entry => entry[1].name).join(", ");
        output.write(`${layers.length} layer(s): ${layerNames}.`);
        const numRows = req.heatMap.getNumRows(MAPREP.DETAIL_LEVEL);
        const numColumns = req.heatMap.getNumColumns(MAPREP.DETAIL_LEVEL);
        output.write(`Size: ${numRows} rows, ${numColumns} columns`);
        for (const axis of ["row","column"]) {
          const labelInfo = req.heatMap.getAxisLabels(axis);
          const labelTypes = labelInfo.labelTypes.map(label=>label.type).join(", ");
          output.write(`${UTIL.toTitleCase(axis)} label type(s): ${labelTypes}`);
        }
      }
    ]
  });

  heatmapCommands.set("get-label-types", {
    synopsis: "[--map name] axis",
    helpRoute: [
      function (req, res, next) {
        res.output.write(
          "get the types of the labels on the specified axis of the heatmap (defaults to the current heatmap).");
        next();
      },
      EXEC.showOptions([
        EXEC.helpMapOptions,
      ]),
    ],
    route: [
      EXEC.genGetOptions (EXEC.mapOptions),
      EXEC.getHeatMap,
      EXEC.reqAxis,
      function (req, res) {
        const labelInfo = req.heatMap.getAxisLabels(req.axis);
        res.value = labelInfo.labelTypes.map(label=>label.type);
      }
    ]
  });

  heatmapCommands.set("get-labels", {
    synopsis: "[--map name] axis",
    helpRoute: [
      function (req, res, next) {
    res.output.write(
    "get the labels on the specified axis of the heatmap (defaults to the current heatmap).");
        next();
      },
      EXEC.showOptions([
        EXEC.helpMapOptions,
      ]),
    ],
    route: [
      EXEC.genGetOptions (EXEC.mapOptions),
      EXEC.getHeatMap,
      EXEC.reqAxis,
      function (req, res) {
        const labelInfo = req.heatMap.getAxisLabels(req.axis);
        res.value = labelInfo.labels.slice();
      }
    ]
  });

  const helper = EXEC.genSubCommandHelp (heatmapCommands);

  UTIL.registerCommand ("heatmap", heatmapCommand, helper);

  function heatmapCommand(req, res, next) {
    EXEC.doSubCommand (heatmapCommands, helper, req, res, next);
  }

})();
