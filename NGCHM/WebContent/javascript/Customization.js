// This module defines facilities for customizing an NG-CHM via 'plugins'.
// It builds on the linkouts machinery defined in Linkouts.js using the
// linkouts interface.

// Interfaces added at the end.
(function () {
  "use strict";
  NgChm.markFile();

  //Define Namespace for NgChm Customization
  const CUST = NgChm.createNS("NgChm.CUST");

  const UHM = NgChm.importNS("NgChm.UHM");
  const MMGR = NgChm.importNS("NgChm.MMGR");
  const CFG = NgChm.importNS("NgChm.CFG");

  CUST.verbose = false;

  function separator(sep) {
    if (sep === "space") return " ";
    if (sep === "colon") return ":";
    if (sep === "comma") return ",";
    if (sep === "semicolon") return ";";
    if (sep === "slash") return "/";
    if (sep === "tilde") return "~";
    if (sep === "exclamation") return "!";
    if (sep === "hash") return "#";
    if (sep === "amp") return "&";
    if (sep === "plus") return "+";
    if (sep === "minus" || sep === "dash") return "-";
    if (sep === "underscore") return "_";
    if (sep === "equals") return "=";
    if (sep === "period") return ".";
    if (sep.length === 1) return sep;
    if (CUST.verbose) console.log("CUST: Unknown type separator: " + sep);
    return sep;
  }

  // A label type may include one or more transforms appended to a primitive type name.
  // Values of the specified type will be transformed as specified before being passed
  // to linkouts defined for the primitive type.  If multiple transforms are specified,
  // they will be applied left-to-right.
  //
  // This function parses the transform specifications on a label type, if any, and
  // appends a vector of transforms to apply to CUST.transforms.
  //
  // The following transforms are accepted:
  // :list.separator, where separator is space, colon, comma, semicolon, slash, tilde,
  //                  exclamation, hash, amp, plus, minus (dash), underscore, equals, period,
  //                  or any single character.
  // :replace/pat/with/options, where pat, with, and options match those of javascript
  //                            string pattern replacement.
  function addTransform(typename) {
    if (CUST.verbose)
      console.log("NgChm.CUST: adding transforms for " + typename);
    var ff = typename.split(":");
    if (ff.length > 1) {
      var xforms = [];
      for (var fidx = 1; fidx < ff.length; fidx++) {
        if (ff[fidx].indexOf("list.") === 0) {
          xforms.push({
            xform: "list",
            separator: separator(ff[fidx].substr(5)),
          });
        } else if (ff[fidx].indexOf("replace/") === 0) {
          var m = /replace\/(.*)\/(.*)\/(.*)/.exec(ff[fidx]);
          if (m && m.length === 4) {
            xforms.push({
              xform: "replace",
              pattern: m[1],
              replacement: m[2],
              options: m[3],
            });
          } else {
            if (CUST.verbose)
              console.log("Error: badly formed type modifier " + ff[idx]);
          }
        } else {
          if (CUST.verbose)
            console.log("Error: unknown type modifier " + ff[idx]);
        }
      }
      CUST.transforms.push({
        baseType: ff[0],
        typeName: typename,
        doTypeTransform: doTypeTransform,
        xforms: xforms.reverse(),
      });
    }
  }

  function doTypeTransform(
    transform,
    menuEntry,
    linkoutType,
    selectMode,
    linkoutFn,
    attributes,
  ) {
    var supertypes = CUST.superTypes[transform.baseType] || [];
    if (
      linkoutType === transform.baseType ||
      supertypes.indexOf(linkoutType) >= 0
    ) {
      if (CUST.verbose)
        console.log(
          'Adding typetransform linkout "' +
            menuEntry +
            '" for type ' +
            transform.typeName +
            " mode " +
            selectMode,
        );
      linkouts.addLinkout(
        menuEntry,
        transform.typeName,
        selectMode,
        function (labels) {
          var xforms = transform.xforms;
          for (var xidx = 0; xidx < xforms.length; xidx++) {
            if (xforms[xidx].xform === "list") {
              if (selectMode === linkouts.SINGLE_SELECT) {
                labels = labels[0].split(xforms[xidx].separator);
              } else {
                labels = Array.from(
                  new Set(
                    [].concat.apply(
                      [],
                      labels.map(function (x) {
                        return x.split(xforms[xidx].separator);
                      }),
                    ),
                  ),
                );
              }
            } else if (xforms[xidx].xform === "replace") {
              var re = new RegExp(xform[xidx].pattern, xform[xidx].options);
              labels = labels.map(function (x) {
                return x.replace(re, xform[xidx].replacement);
              });
            }
          }
          linkoutFn(labels);
        },
        attributes,
      );
    }
  }

  function initLabelTypes(typeList) {
    CUST.superTypes = {};
    CUST.subTypes = {};

    CUST.allTypes = Array.from(new Set(typeList)); // make list of unique types
    CUST.transforms = [];
    CUST.allTypes.forEach(addTransform);
  }

  // Add type descriptions.  typelist is a vector of type descriptors.  Each type descriptor
  // is an object with the following fields:
  // - typeName: name of the type being described (mandatory)
  // - description: high-level description of the meaning of type values (mandatory)
  // - displayName: user friendly type name (optional)
  // - format: description of the lexical/syntactic rules of valid type values (optional)
  // - examples: one or more examples of type values (optional).
  // - the typelist is stored on CUST.linkoutTypes for use in the NG-CHM viewer
  // - and builder
  function describeTypes(typelist) {
    for (var i = 0; i < typelist.length; i++) {
      var typeItem = typelist[i];
      CUST.linkoutTypes.push(typeItem);
    }
  }

  // Add subtype relation.
  // We maintain two maps:
  // 1. a map from each type to all of its subtypes, and
  // 2. a map from each type to all of its supertypes.
  function addSubtype(subtype, supertype) {
    var supTypes = [supertype].concat(CUST.superTypes[supertype] || []).sort();
    var subTypes = [subtype].concat(CUST.subTypes[subtype] || []).sort();
    // Check for attempt to define a circular relationship.
    // supertype (plus its supertypes) cannot intersect subtype (plus its subtypes).
    var pidx = 0;
    var bidx = 0;
    while (bidx < subTypes.length && pidx < supTypes.length) {
      if (subTypes[bidx] < supTypes[pidx]) {
        bidx++;
      } else if (subTypes[bidx] > supTypes[pidx]) {
        pidx++;
      } else {
        // Found a type in common.
        console.log(
          "Adding " +
            subtype +
            " as a subtype of " +
            supertype +
            " would create a cycle. Ignored.",
        );
        if (subTypes[bidx] !== subtype) {
          if (subTypes[bidx] === supertype) {
            console.log("Type " + supertype + " is a subtype of " + subtype);
          } else {
            console.log(
              "Type " +
                subTypes[bidx] +
                " is a subtype of " +
                subtype +
                " as well as a supertype of " +
                supertype,
            );
          }
        } else {
          if (subtype === supertype) {
            console.log(
              "Type " + subtype + " was given as both subtype and supertype",
            );
          } else {
            console.log("Type " + subtype + " is a supertype of " + supertype);
          }
        }
        return;
      }
    }

    // Add relations from all subTypes to all supTypes.
    // We do not expect large subtype/supertype trees.
    for (pidx = 0; pidx < supTypes.length; pidx++) {
      supertype = supTypes[pidx];
      if (!CUST.subTypes.hasOwnProperty(supertype))
        CUST.subTypes[supertype] = [];
      for (bidx = 0; bidx < subTypes.length; bidx++) {
        subtype = subTypes[bidx];
        if (!CUST.superTypes.hasOwnProperty(subtype))
          CUST.superTypes[subtype] = [];
        if (CUST.subTypes[supertype].indexOf(subtype) < 0) {
          CUST.subTypes[supertype].push(subtype);
        }
        if (CUST.superTypes[subtype].indexOf(supertype) < 0) {
          CUST.superTypes[subtype].push(supertype);
        }
      }
    }
  }

  function createPluginLinkout(
    menuEntry,
    typeName,
    selectMode,
    linkoutFn,
    attributes,
  ) {
    if (CUST.verbose)
      console.log(
        'NgChm.CUST.createPluginLinkout "' +
          menuEntry +
          '" typeName: ' +
          typeName +
          " selectMode: " +
          selectMode,
      );

    // Wrap linkout in a check function that displays error message if no labels or if first label is '-'.
    // If the linkout callback is async, then check function is async. Otherwise, the check function is sync.
    if (selectMode === linkouts.SINGLE_SELECT) {
      linkoutFn = (function (lofn) {
        if (lofn.constructor.name === "AsyncFunction") { // plugin callback is async so check function is async
          return async function (labels) {
            if (labels.length === 0 || labels[0] === "-") {
              UHM.systemMessage("NG-CHM Plug-in", "No information known for the selected label.");
            } else {
              try {
                await lofn(labels);
              } catch (e) {
                UHM.linkoutError(e);
              }
            }
          }
        } else { // plugin callback is sync so check function is sync
          return function (labels) {
            if (labels.length === 0 || labels[0] === "-") {
              UHM.systemMessage("NG-CHM Plug-in", "No information known for the selected label.");
            } else {
              lofn(labels);
            }
          }
        }
      })(linkoutFn);
    } else if (selectMode === linkouts.MULTI_SELECT) {
      linkoutFn = (function (lofn) {
        if (lofn.constructor.name === "AsyncFunction") { // plugin callback is async so check function is async
          return async function (labels) {
            var idx = labels.indexOf("-");
            if (idx >= 0) labels.splice(idx, 1);
            if (labels.length === 0) {
              UHM.systemMessage("NG-CHM Plug-in", "No information known for any selected label.");
            } else {
              try {
                await lofn(labels);
              } catch (e) {
                UHM.linkoutError(e);
              }
            }
          }
        } else { // plugin callback is sync so check function is sync
          return function (labels) {
            var idx = labels.indexOf("-");
            if (idx >= 0) labels.splice(idx, 1);
            if (labels.length === 0) {
              UHM.systemMessage("NG-CHM Plug-in", "No information known for any selected label.");
            } else {
              lofn(labels);
            }
          };
        }
      })(linkoutFn);
    } else {
      console.log("Unknown selectMode: " + selectMode); //alert
    }

    if (CUST.allTypes.indexOf(typeName) >= 0) {
      if (CUST.verbose)
        console.log(
          'Adding type linkout for "' +
            menuEntry +
            '" typeName: ' +
            typeName +
            " selectMode: " +
            selectMode,
        );
      linkouts.addLinkout(
        menuEntry,
        typeName,
        selectMode,
        linkoutFn,
        attributes,
      );
    }
    CUST.transforms.forEach(function (tt) {
      tt.doTypeTransform(
        tt,
        menuEntry,
        typeName,
        selectMode,
        linkoutFn,
        attributes,
      );
    });
    var subtypes = CUST.subTypes[typeName] || [];
    subtypes.forEach(function (subtype) {
      if (CUST.allTypes.indexOf(subtype) >= 0) {
        if (CUST.verbose)
          console.log(
            'Adding subtype linkout for "' +
              menuEntry +
              '" typeName: ' +
              subtype +
              " selectMode: " +
              selectMode,
          );
        linkouts.addLinkout(
          menuEntry,
          subtype,
          selectMode,
          linkoutFn,
          attributes,
        );
      }
    });
  }

  // Executed before custom.js is loaded.
  CUST.beforeLoadCustom = function (heatMap) {
    var colTypes = heatMap.getColLabels().label_type;
    var rowTypes = heatMap.getRowLabels().label_type;
    if (CUST.verbose) {
      console.log("Column types:");
      colTypes.forEach(function (ty) {
        console.log(ty);
      });
      console.log("Row types:");
      rowTypes.forEach(function (ty) {
        console.log(ty);
      });
    }

    CUST.customPlugins = [];
    CUST.linkoutTypes = [];
    initLabelTypes([].concat(colTypes, rowTypes));
  };

  var pluginsLoaded = false;
  var pluginsLoadedCallbacks = [];

  CUST.waitForPlugins = function (callback) {
    if (pluginsLoaded) {
      setTimeout(callback, 0);
    } else {
      pluginsLoadedCallbacks.push(callback);
    }
  };

  // Executed after custom.js has been loaded.
  CUST.definePluginLinkouts = function () {
    for (var pidx = 0; pidx < CUST.customPlugins.length; pidx++) {
      var plugin = CUST.customPlugins[pidx];
      if (plugin.expandLinkOuts) plugin.expandLinkOuts();
    }

    for (var pidx = 0; pidx < CUST.customPlugins.length; pidx++) {
      var plugin = CUST.customPlugins[pidx];
      if (plugin.linkouts) {
        if (CUST.verbose)
          console.log("Defining custom linkouts for plugin " + plugin.name);
        for (var idx = 0; idx < plugin.linkouts.length; idx++) {
          var l = plugin.linkouts[idx];
          createPluginLinkout(
            l.menuEntry,
            l.typeName,
            l.selectMode,
            l.linkoutFn,
            l.attributes || [],
          );
        }
      }
      if (plugin.matrixLinkouts) {
        if (CUST.verbose)
          console.log(
            "Defining custom matrix linkouts for plugin " + plugin.name,
          );
        for (var idx = 0; idx < plugin.matrixLinkouts.length; idx++) {
          var l = plugin.matrixLinkouts[idx];
          linkouts.addMatrixLinkout(
            l.menuEntry,
            l.typeName1,
            l.typeName2,
            l.selectMode,
            l.linkoutFn,
            l.attributes || [],
          );
        }
      }
    }

    // Remove and call any waiting callbacks in order.
    pluginsLoaded = true;
    while (pluginsLoadedCallbacks.length > 0) {
      pluginsLoadedCallbacks.shift()();
    }
  };

  // Interface accessible to other modules.
  // Load the user's custom.js file.
  CUST.addCustomJS = function () {
    const heatMap = MMGR.getHeatMap();
    CUST.beforeLoadCustom(heatMap);
    const head = document.getElementsByTagName("head")[0];
    const script = document.createElement("script");
    if (CFG.custom_specified) {
      initScript();
    } else {
      // USE DEFAULT CUSTOM.JS
      // NOTE: These 3 lines of code are replaced when building ngchmApp.html and ngchmWidget-min.js (the "file mode" and "widget" versions of the application).
      initScript();
    }
    head.appendChild(script);

    function initScript() {
      script.type = "text/javascript";
      script.src = CFG.custom_script;
      // Most browsers:
      script.onload = CUST.definePluginLinkouts;
      // Internet explorer:
      script.onreadystatechange = function () {
        if (this.readyState == "complete") {
          CUST.definePluginLinkouts();
        }
      };
      script.onerror = function () {
        console.warn("Loading of " + CFG.custom_script + " failed.");
        CUST.definePluginLinkouts();
      };
    }
  };

  // Interface accessible to embedded maps that specify a custom js file
  // containing plugins.  Load the user specified JS file.
  CUST.addExtraCustomJS = function (customJs) {
    var head = document.getElementsByTagName("head")[0];
    var script = document.createElement("script");
    head.appendChild(script);
    script.src = customJs;
    script.onload = CUST.definePluginLinkouts;
    script.onerror = function () {
      console.warn("Loading of " + customJs + " failed.");
      CUST.definePluginLinkouts();
    };
    // Internet explorer:
    script.onreadystatechange = function () {
      if (this.readyState == "complete") {
        CUST.definePluginLinkouts();
      }
    }; //Leave this as one line for filemode version app builder
  };

  CUST.addSubtype = addSubtype;
  CUST.describeTypes = describeTypes;
})();
