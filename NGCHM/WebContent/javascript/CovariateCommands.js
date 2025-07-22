/**********************************************************************************
 * COVARIATE COMMANDS:  The following functions define commands for managing covariates.
 **********************************************************************************/
(function () {
  "use strict";
  NgChm.markFile();

  // Import required namespaces.
  const MMGR = NgChm.importNS("NgChm.MMGR");
  const UTIL = NgChm.importNS("NgChm.UTIL");
  const EXEC = NgChm.importNS("NgChm.EXEC");
  const SRCHSTATE = NgChm.importNS("NgChm.SRCHSTATE");

  const covarCommands = new Map();

  covarCommands.set("list", {
    synopsis: "[--map name]",
    helpRoute: [
      function (req, res, next) {
        res.output.write("List all covariates.");
        next();
      },
      EXEC.showOptions([
        EXEC.helpMapOptions,
      ]),
    ],
    route: [
      function (req, res) {
        const output = res.output;
        for (const axis of ["row", "column"]) {
          output.write(`${UTIL.toTitleCase(axis)} covariates:`);
          output.write();
          output.indent();
          const covBars = req.heatMap.getAxisCovariateConfig(axis);
          for (let key in covBars) {
            output.write(key);
          }
          output.unindent();
          output.write();
        }
      }
    ]
  });

  const setOptions = new Map();
  setOptions.set ("--all", { field: "--all", args: 0 });

  // Used by set, add, and scale commands.
  const calcRoute = [
    EXEC.genGetOptions (EXEC.axisOptions, setOptions),
    function (req, res, next) {
      if (req["--row"] && req["--column"]) {
        throw `specify either --row or --column, not both.`;
      } else if (req["--row"]) {
        req.axis = "row";
      } else if (req["--column"]) {
        req.axis = "column";
      }
      next();
    },
    EXEC.reqCovariate,
    EXEC.genRequired("value", true),
    function (req, res, next) {
      // Check value appropriate for covariate data type.
      req.dataType = req.covar.color_map.type;
      if (req.dataType == 'discrete') {
        if (req.subcommand != 'set') {
          throw `cannot perform arithmetic on discrete covariates`;
        }
        const okay = req.value == "" || req.covar.color_map.thresholds.includes(req.value);
        if (!okay) {
          throw `value must be either empty (missing) or a known category, not ${req.value}`;
        }
      } else {
        if (["", "NA", "NAN"].includes(req.value.toUpperCase())) {
          if (req.command != 'set') {
            throw `cannot perform arithmetic using missing value`;
          }
          req.value = "NA";
        } else {
          const value = Number(req.value);
          if (isNaN(value)) {
            if (req.command == 'set') {
              throw `value must be empty/NA/NAN (missing) or a number, not ${req.value}`
            } else {
              throw `value must be a number, not ${req.value}`
            }
          }
        }
      }
      next();
    },
    function (req, res) {
      const cvData = req.heatMap.getAxisCovariateData(req.axis)[req.covariateName];
      const op = { set: setOp, add: addOp, scale: scaleOp } [req.subcommand];
      const value = req.dataType == "discrete" ? req.value : Number(req.value);
      req.heatMap.setUnAppliedChanges(true);
      if (req["--all"]) {
        for (let ii = 0; ii < cvData.values.length; ii++) {
          op(ii);
        }
      } else {
        const selected = SRCHSTATE.getAxisSearchResults(req.axis);
        if (selected.length == 0) {
          throw `no ${req.axis}s selected`;
        }
        for (let ii = 0; ii < selected.length; ii++) {
          // Selections indices start at 1.
          op(selected[ii]-1);
        }
      }
      req.heatMap.summarizeCovariate (req.axis, req.covariateName, req.dataType);
      // Helper functions.
      function setOp (idx) {
        cvData.values[idx] = value;
      }
      function addOp (idx) {
        cvData.values[idx] = Number(cvData.values[idx]) + value;
      }
      function scaleOp (idx) {
        cvData.values[idx] = Number(cvData.values[idx]) * value;
      }
    }
  ];
  covarCommands.set("set", {
    synopsis: "{--map name|--all|--row|--column} name value",
    helpRoute: [
      function (req, res, next) {
        res.output.write(
    `Set the value of either all elements (if --all is specified) or the selected elements of the
     specified covariate bar. If possible, the system will automatically determine the covariate's
     axis. If a covariate with the same name is on both axes, the desired axis must be specified
     using either --row or --column.`);
        next();
      },
      EXEC.showOptions([
        EXEC.helpMapOptions,
        EXEC.helpAxisOptions,
      ]),
    ],
    route: calcRoute
  });
  covarCommands.set("add", {
    synopsis: "{--map name|--all|--row|--column} name value",
    helpRoute: [
      function (req, res, next) {
    res.output.write(
    `Add value to either all elements (if --all is specified) or to the selected elements of the
     specified continuous covariate bar. If possible, the system will automatically determine the
     covariate's axis. If a covariate with the same name is on both axes, the desired axis must be
     specified using either --row or --column.`);
        next();
      },
      EXEC.showOptions([
        EXEC.helpMapOptions,
      ]),
    ],
    route: calcRoute
  });
  covarCommands.set("scale", {
    synopsis: "{--map name|--all|--row|--column} name value",
    helpRoute: [
      function (req, res, next) {
    res.output.write(`Scale either all elements (if --all is specified) or the selected elements of the specified
     continuous covariate bar by value. If possible, the system will automatically determine the
     covariate's axis. If a covariate with the same name is on both axes, the desired axis must be
     specified using either --row or --column.`);
        next();
      },
      EXEC.showOptions([
        EXEC.helpMapOptions,
      ]),
    ],
    route: calcRoute
  });

  covarCommands.set("create", {
    synopsis: "[--map name] axis name dataType",
    helpRoute: [
      function (req, res, next) {
        res.output.write(`create a new covariate with the given name and dataType on the specified axis.`);
        next();
      },
      EXEC.showOptions([
        EXEC.helpMapOptions,
      ]),
    ],
    route: [
      EXEC.reqAxis,
      EXEC.genRequired("name"),
      EXEC.reqDataType,
      EXEC.noMoreParams,
      function (req, res, next) {
        // Check value appropriate for covariate data type.
        const order = req.heatMap.getAxisCovariateOrder(req.axis);
        if (order.includes(req.name)) {
          throw `${UTIL.toTitleCase(req.axis)} ${req.name} already exists`;
        }
        req.heatMap.addCovariate (req.axis, req.name, req.datatype);
        res.output.write (`Created ${req.datatype} ${req.axis} covariate ${req.name}`);
      }
    ]
  });

  covarCommands.set("move", {
    synopsis: "[--map name] axis name index",
    helpRoute: [
      function (req, res, next) {
        res.output.write("Reorder the covariates on the specified axis so that the named covariate is at index (0 based).");
        next();
      },
      EXEC.showOptions([
        EXEC.helpMapOptions,
      ]),
    ],
    route: [
      EXEC.reqAxis,
      EXEC.reqCovariate,
      reqIndex,
      function (req, res) {
        const order = req.heatMap.getAxisCovariateOrder(req.axis);
        if (req.index > order.length) {
          throw `index must be between zero and the number of covariates, inclusive`;
        }
        const oldIndex = order.indexOf (req.covariateName);
        if (oldIndex < 0) {
          throw new Error('covariate is awol');
        }
        if (oldIndex == req.index) {
          // Moving it to the same position is a noop.
          res.output.write(`the move has no effect`);
          return;
        }
        const barAtIndex = order[req.index];
        // Remove covariate, and insert before barAtIndex.
        order.splice(oldIndex, 1);
        order.splice(order.indexOf(barAtIndex), 0, req.covariateName);
        res.output.write(`Reordered ${req.axis} covariates`);
      }
    ]
  });

  covarCommands.set("get-list", {
    synopsis: "[--map name] axis",
    helpRoute: [
      function (req, res, next) {
        res.output.write("Returns an array containing all covariates on the specified axis.");
        next();
      },
      EXEC.showOptions([
        EXEC.helpMapOptions,
      ]),
    ],
    route: [
      EXEC.reqAxis,
      function (req, res) {
        const covBars = req.heatMap.getAxisCovariateConfig(req.axis);
        const keys = [];
        for (let key in covBars) {
          keys.push(key);
        }
        res.value = keys;
      }
    ]
  });

  covarCommands.set("show", {
    synopsis: "[--map name] axis name",
    helpRoute: [
      function (req, res, next) {
        res.output.write("Shows details of the covariate with the specified axis and name.");
        next();
      },
      EXEC.showOptions([
        EXEC.helpMapOptions,
      ]),
    ],
    route: [
      EXEC.reqAxis,
      EXEC.reqCovariate,
      function (req, res) {
        const cov = req.covar;
        const output = res.output;
        output.write(`${UTIL.toTitleCase(req.axis)} covariate ${req.covariateName}:`);
        output.write();
        output.indent();
        output.write(`Bar type: ${cov.bar_type}, Bar height: ${cov.height}, Show: ${cov.show}.`);
        if (cov.bar_type == "color_plot") {
          output.write(`Data type: ${cov.color_map.type}, ${cov.color_map.colors.length} colors.`);
          output.write(cov.color_map.type == "continuous" ? "Breakpoints:" : "Categories:");
          output.indent();
          for (let ii = 0; ii < cov.color_map.thresholds.length; ii++) {
            output.write(`${cov.color_map.thresholds[ii]}: ${cov.color_map.colors[ii]}`);
          }
          output.write(`Missing: ${cov.color_map.missing}`);
          output.unindent();
        } else {
          output.write(
            `Data type: ${cov.color_map.type}, Low bound: ${cov.low_bound}, High bound: ${cov.high_bound}.`
          );
          output.write(
            `Foreground: ${cov.fg_color}, Background: ${cov.bg_color}, Missing: ${cov.missing}`
          );
        }
        output.unindent();
        output.write();
      }
    ]
  });

  covarCommands.set("add-break", {
    synopsis: "[--map name] axis name break/category color [index]",
    helpRoute: [
      function (req, res, next) {
        res.output.write(`Add a new break/category to the covariate with the specified axis and name.
     For continuous covariates, the new breakpoint will inserted in numerical order.
     For discrete covariates, the new category will be appended at the end of the
     existing categories unless index is specified. If index is specified, the
     new category will be inserted at that index (0 based).`);
        next();
      },
      EXEC.showOptions([
        EXEC.helpMapOptions,
      ]),
    ],
    route: [
      EXEC.reqAxis,
      EXEC.reqCovariate,
      reqNewBreakPt,
      EXEC.reqColor,
      function (req, res, next) {
        // Determine the index before which to insert the breakpoint.
        const color_map = req.covar.color_map;
        if (color_map.type == "continuous") {
          if (req.args.length > 0) {
            throw `cannot specify an index for continuous covariates.`;
          }
          // Determine new breakpoint insert position specified.
          // N.B. We know from reqNewBreakPt that req.breakPt does not
          // equal any existing breakpoint.
          req.index = 0;
          while (
            req.index < color_map.thresholds.length &&
            req.breakPt > Number(color_map.thresholds[req.index])
          ) {
            req.index++;
          }
        } else if (req.args.length == 0) {
          // Append new category if no insert position specified.
          req.index = color_map.colors.length;
        } else {
          // Validate user provided insert position.
          const index = req.args.shift();
          req.index = parseInt(index);
          if (isNaN(req.index)) {
            throw `breakpoint index must be an integer, not ${index}.`;
          }
          if (req.index < 0 || req.index > color_map.colors.length) {
            throw `breakpoint index must be between 0 and ${color_map.colors.length}, not ${index}.`;
          }
        }
        next();
      },
      EXEC.noMoreParams,
      function (req, res) {
        // Ready to insert req.breakPt with req.color before req.index.
        req.covar.color_map.thresholds.splice(req.index, 0, req.breakPt);
        req.covar.color_map.colors.splice(req.index, 0, req.color);
        res.output.write(`Inserted new breakpoint/category ${req.breakPt} ${req.color}`);
        req.heatMap.setUnAppliedChanges(true);
      }
    ]
  });

  covarCommands.set("get-values", {
    synopsis: "[--map name] axis name",
    helpRoute: [
      function (req, res, next) {
        res.output.write(`Returns the covariate's values as an array.`);
        next();
      },
      EXEC.showOptions([
        EXEC.helpMapOptions,
      ]),
    ],
    route: [
      EXEC.reqAxis,
      EXEC.reqCovariate,
      function (req, res, next) {
        res.value = req.heatMap.getAxisCovariateData(req.axis)[req.covariateName].values.slice();
      }
    ]
  });

  covarCommands.set("change-break", {
    synopsis: "[--map name] axis name index break/category color",
    helpRoute: [
      function (req, res, next) {
    res.output.write(
    `Change the existing break/category at index (0 based) of the covariate with the
     specified axis and name.
     For continuous covariates, the new breakpoint must be strictly between the breakpoints
     (if they exist) immediately before and after the breakpoint being changed.
     For discrete covariates, the new category cannot be identical to another category. The
     covariate's data will also be updated.`);
        next();
      },
      EXEC.showOptions([
        EXEC.helpMapOptions,
      ]),
    ],
    route: [
      EXEC.reqAxis,
      EXEC.reqCovariate,
      reqExistingIndex,
      function (req, res, next) {
        // breakPt.
        if (req.args.length == 0) {
          throw `missing breakpoint/category.`;
        }
        const arg = req.args.shift().trim();
        if (arg == "") {
          throw `breakpoint/category cannot be empty.`;
        }
        const color_map = req.covar.color_map;
        if (color_map.type == "continuous") {
          // Check continuous breakpoint is a number between the previous and next breakpoints.
          const breakPt = Number(arg);
          if (isNaN(breakPt)) {
            throw `continuous breakpoint must be a number, not ${arg}.`;
          }
          if (req.index > 0) {
            const prevBreak = color_map.thresholds[req.index - 1];
            if (breakPt <= Number(prevBreak)) {
              throw `continuous breakpoint ${arg} must be greater than the previous breakpoint (${prevBreak}).`;
            }
          }
          if (req.index < color_map.thresholds.length - 1) {
            const nextBreak = color_map.thresholds[req.index + 1];
            if (breakPt >= Number(nextBreak)) {
              throw `continuous breakpoint ${arg} must be less than the next breakpoint (${nextBreak}).`;
            }
          }
        } else {
          // Check discrete category does not match any other existing category.
          for (let idx = 0; idx < color_map.thresholds.length; idx++) {
            if (idx != req.index && arg == color_map.thresholds[idx]) {
              throw `category cannot be identical to an existing category.`;
            }
          }
        }
        req.breakPt = arg;
        next();
      },
      EXEC.reqColor,
      function (req, res) {
        // Ready to replace breakpoint at req.index with req.breakPt and req.color.
        const cov = req.covar;
        const oldBreakPt = cov.color_map.thresholds[req.index];
        if (cov.color_map.type == "discrete" && oldBreakPt != req.breakPt) {
          // Update categories in the covariate bar data.
          const values = req.heatMap.getAxisCovariateData(req.axis)[req.covariateName].values;
          for (let ii = 0; ii < values.length; ii++) {
            if (values[ii] == oldBreakPt) {
              values[ii] = req.breakPt;
            }
          }
        }
        let action = "is still";
        if (oldBreakPt != req.breakPt || cov.color_map.colors[req.index] != req.color) {
          cov.color_map.thresholds[req.index] = req.breakPt;
          cov.color_map.colors[req.index] = req.color;
          req.heatMap.setUnAppliedChanges(true);
          action = "changed to";
        }
        res.output.write(`Breakpoint #${req.index} ${action} ${req.breakPt} ${req.color}`);
      }
    ]
  });

  covarCommands.set("change-missing", {
    synopsis: "axis name color",
    helpRoute: [
      function (req, res, next) {
        res.output.write(`Change the missing color of the covariate with the specified axis and name.`);
        next();
      },
      EXEC.showOptions([
        EXEC.helpMapOptions,
      ]),
    ],
    route: [
      EXEC.reqAxis,
      EXEC.reqCovariate,
      EXEC.reqColor,
      function (req, res) {
        if (req.covar.color_map.missing != req.color) {
          req.covar.color_map.missing = req.color;
          req.heatMap.setUnAppliedChanges(true);
          res.output.write(
            `Updated ${req.axis} ${req.covariateName} missing color to ${req.color}`
          );
        }
      }
    ]
  });

  function reqNewBreakPt(req, res, next) {
    if (req.args.length == 0) {
      throw `missing breakpoint/category.`;
    }
    const breakPt = req.args.shift().trim();
    req.breakPt = breakPt;
    if (req.breakPt == "") {
      throw `breakpoint cannot be empty.`;
    }
    if (req.covar.color_map.type == "continuous") {
      // Check continuous breakPt does not exist already.
      req.breakPt = Number(req.breakPt);
      if (isNaN(req.breakPt)) {
        throw `continuous breakpoint must be a number, not ${breakPt}.`;
      }
      const breaks = req.covar.color_map.thresholds;
      let index = 0;
      while (index < breaks.length && req.breakPt > Number(breaks[index])) {
        index++;
      }
      if (index < breaks.length && req.breakPt == Number(breaks[index])) {
        throw `breakpoint ${breakPt} is the same as existing breakpoint #${index}.`;
      }
    } else {
      // Check discrete category does not exist already.
      req.breakPt = breakPt;
      const categories = req.covar.color_map.thresholds;
      let index = 0;
      while (index < categories.length && req.breakPt != categories[index]) {
        index++;
      }
      if (index < categories.length) {
        throw `breakpoint '${breakPt}' is the same as existing breakpoint #${index}`;
      }
    }
    next();
  }

  function reqIndex (req, res, next) {
    if (req.args.length == 0) {
      throw `required index is missing.`;
    }
    const arg = req.args.shift();
    req.index = parseInt(arg);
    if (isNaN(req.index)) {
      throw `index must be an integer, not ${arg}.`;
    }
    if (req.index < 0) {
      throw `index must be non-negative, not ${arg}`;
    }
    next();
  }

  function reqExistingIndex (req, res, next) {
    const color_map = req.covar.color_map;
    // Get index of existing breakpoint.
    if (req.args.length == 0) {
      throw `breakpoint index missing.`;
    }
    const arg = req.args.shift();
    req.index = parseInt(arg);
    if (isNaN(req.index)) {
      throw `breakpoint index must be an integer, not ${arg}.`;
    }
    if (req.index < 0 || req.index >= color_map.colors.length) {
      throw `breakpoint index must be between 0 and ${color_map.colors.length - 1}, not ${arg}.`;
    }
    next();
  }

  // Optional covariate.
  function optCovariate(req, res, next) {
    if (req.args.length == 0) {
      throw `Missing parameter.`;
    }
    req.covariateName = req.args.shift();
    const covBars = req.heatMap.getAxisCovariateConfig(req.axis);
    req.covar = covBars.hasOwnProperty(req.covariateName) ? covBars[req.covariateName] : null;
    next();
  }

  const helper = [ EXEC.genSubCommandHelp (covarCommands) ];

  UTIL.registerCommand ("covar", covarCommand, helper);

  function covarCommand(req, res, next) {
    req.heatMap = MMGR.getHeatMap();
    EXEC.doSubCommand (covarCommands, helper, req, res, next);
  }

})();
