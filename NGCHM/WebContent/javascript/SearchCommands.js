/**********************************************************************************
 * SEARCH COMMANDS:  The following functions define commands for searching and selecting.
 **********************************************************************************/
(function () {
  "use strict";
  NgChm.markFile();

  // Import required namespaces.
  const UTIL = NgChm.importNS("NgChm.UTIL");
  const EXEC = NgChm.importNS("NgChm.EXEC");
  const SRCH = NgChm.importNS("NgChm.SRCH");
  const MAPREP = NgChm.importNS("NgChm.MAPREP");
  const SRCHSTATE = NgChm.importNS("NgChm.SRCHSTATE");

  const debug = UTIL.getDebugFlag('cmd-search');
  const searchCommands = new Map();

  const axes = [ "row", "column" ];
  searchCommands.set("clear", {
    synopsis: "[--map name] [axis]",
    helpRoute: [
      function (req, res, next) {
        res.output.write(`Clear all search results. If axis is specified,
          only the search results on that axis will be cleared.`);
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
        if (req.args.length == 0) {
          SRCH.clearSearchItems("Row");
          SRCH.clearSearchItems("Column");
        } else {
          const axis = EXEC.mustMatch (req.args[0], axes);
          SRCH.clearSearchItems (UTIL.toTitleCase(axis));
        }
        SRCH.redrawSearchResults();
      }
    ]
  });

  const searchOptions = new Map();
  searchOptions.set("--regex", { field: "regex", args: 0 });

  searchCommands.set("labels", {
    synopsis: "{--map name|--row|--column|--regex} string",
    helpRoute: [
      function (req, res, next) {
        res.output.write(`Search the labels for the specified string. If an axis is specified,
           only that axis will be searched.
           If --regex is specified, string will be interpreted as a regular
           expression. Otherwise, a substring match will be performed.`);
        next();
      },
      EXEC.showOptions([
        EXEC.helpMapOptions,
        EXEC.helpAxisOptions,
        helpRegexOption,
      ]),
    ],
    route: [
      EXEC.genGetOptions(EXEC.mapOptions, EXEC.axisOptions, searchOptions),
      EXEC.getHeatMap,
      EXEC.genRequired("string"),
      EXEC.noMoreParams,
      function (req, res) {
        // FIXME: Does not handle axis restrictions.
        // FIXME: Does not handle regex searching as described above.
        SRCH.searchForString(req.string);
        SRCH.redrawSearchResults ();
      }
    ]
  });

  searchCommands.set("covariate", {
    synopsis: "{--map name|--row|--column} covariate string...",
    helpRoute: [
      function (req, res, next) {
        res.output.write(`Search the specified covariate for the specified categories/values.
           The appropriate axis will be determined automatically, unless there
           is a covariate with the same name on both axes. If so, --row or
           --column can be used to specify the required covariate.
           If multiple search terms are specified, values matching any search
           term will be selected.`);
        next();
      },
      EXEC.showOptions([
        EXEC.helpMapOptions,
        EXEC.helpAxisOptions,
      ]),
    ],
    route: [
      EXEC.genGetOptions(EXEC.mapOptions, EXEC.axisOptions),
      EXEC.getHeatMap,
      EXEC.reqCovariate,
      EXEC.genRequired("string"),
      EXEC.noMoreParams,
      function (req, res) {
        if (debug) {
          console.log ("search covariate: ", { covar: req.covar });
        }
        let searchResult;
        if (req.covar.color_map.type == 'discrete') {
          const classDataValues = req.heatMap.getAxisCovariateData(req.axis)[req.covariateName].values;
          const currentClassBar = req.heatMap.getAxisCovariateConfig(req.axis)[req.covariateName];
          searchResult = SRCH.getSelectedDiscreteSelections([req.string], classDataValues);
        } else {
          const [ valid, results ] = SRCH.continuousCovarSearch (req.heatMap, req.axis, req.covariateName, req.string);
          if (valid) {
            searchResult = results;
          } else {
            throw 'search failed';
          }
        }
        if (searchResult) {
          SRCHSTATE.setAxisSearchResultsVec(UTIL.toTitleCase(req.axis), searchResult);
        }
        SRCH.redrawSearchResults ();
      }
    ]
  });

  searchCommands.set("get-selected", {
    synopsis: "[--map name] axis",
    helpRoute: [
      function (req, res, next) {
        res.output.write(`Return the indices (0-based) of the selected labels on the specified axis.`),
        next();
      },
      EXEC.showOptions([
        EXEC.helpMapOptions,
      ]),
    ],
    route: [
      EXEC.genGetOptions(EXEC.mapOptions),
      EXEC.getHeatMap,
      EXEC.reqAxis,
      EXEC.noMoreParams,
      function (req, res) {
        res.value = SRCHSTATE.getAxisSearchResults(req.axis).map(idx => idx-1);
      }
    ]
  });

  searchCommands.set("select", {
    synopsis: "[--map name] axis index...",
    helpRoute: [
      function (req, res, next) {
        res.output.write (`Set the selected labels on the specified axis by specifying one or more 0-based indices.
           Every index must be in the range 0 to the number of elements on the axis less one.`),
        next();
      },
      EXEC.showOptions([
        EXEC.helpMapOptions,
      ]),
    ],
    route: [
      EXEC.genGetOptions(EXEC.mapOptions),
      EXEC.getHeatMap,
      EXEC.reqAxis,
      function (req, res) {
        const numLabels = req.heatMap.getNumAxisElements(req.axis,MAPREP.DETAIL_LEVEL);
        const selected = [];
        while (req.args.length > 0) {
          const val = parseInt(req.args[0]);  // Don't shift now to preserve args[0] for error messages.
          if (isNaN(val)) {
            throw `index ${req.args[0]} is not an integer`;
          }
          if (val < 0 || val >= numLabels) {
            throw `index ${req.args[0]} is not in the range 0 .. ${numLabels-1}`;
          }
          req.args.shift(); // Okay to move past args[0] now.
          selected.push (val+1);  // SRCH module uses 1-based indices.
        }
        if (selected.length == 0) {
          throw `no indices were specified`;
        }
        SRCH.clearSearchItems(req.axis);
        SRCH.setAxisSearchResultsVec(req.axis, selected);
        SRCH.redrawSearchResults();
      }
    ]
  });

  const helper = [
    EXEC.genSubCommandHelp (searchCommands),
    EXEC.showOptions([
      EXEC.helpMapOptions,
      EXEC.helpAxisOptions,
      helpRegexOption,
    ]),
  ];

  function helpRegexOption (req, res, next) {
    res.output.write(`--regex    : interpret string as a regular expression.`);
    next();
  }

  UTIL.registerCommand ("search", searchCommand, helper);

  function searchCommand(req, res, next) {
    EXEC.doSubCommand (searchCommands, helper, req, res, next);
  }

})();
