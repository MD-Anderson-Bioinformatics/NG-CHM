(function () {
  "use strict";
  NgChm.markFile();

  //Define Namespace for NgChm CompatibilityManager
  const CM = NgChm.createNS("NgChm.CM");

  const UTIL = NgChm.importNS("NgChm.UTIL");
  const debugCM = UTIL.getURLParameter("debug").split(",").includes("compatibility");


  // This string contains the entire configuration.json file.  This was previously located in a JSON file stored with the application code
  // but has been placed here at the top of the CompatibilityManager class so that the configuration can be utilized in File Mode.
  CM.jsonConfigStr =
    '{"row_configuration": {"classifications": {"show": "Y","height": 15,"bar_type": "color_plot","fg_color": "#000000","bg_color": "#FFFFFF","low_bound": "0","high_bound": "100"},"classifications_order": 1,"organization": {"agglomeration_method": "unknown",' +
    '"order_method": "unknown","distance_metric": "unknown"},"dendrogram": {"show": "ALL","height": "100"},"label_display_length": "20","label_display_method": "END","top_items_cv": ""},' +
    '"col_configuration": {"classifications": {"show": "Y","height": 15,"bar_type": "color_plot","fg_color": "#000000","bg_color": "#FFFFFF","low_bound": "0","high_bound": "100"},"classifications_order": 1,' +
    '"organization": {"agglomeration_method": "unknown","order_method": "unknown","distance_metric": "unknown"},' +
    '"dendrogram": {"show": "ALL","height": "100"},"label_display_length": "20","label_display_method": "END","top_items_cv": ""},"data_configuration": {"map_information": {"data_layer": {' +
    '"name": "Data Layer","grid_show": "Y","grid_color": "#FFFFFF","selection_color": "#00FF38","cuts_color": "#FFFFFF' +
    '"},"name": "CHM Name","description": "' +
    'Full length description of this heatmap","summary_width": "50","builder_version": "NA","summary_height": "100","detail_width": "50","detail_height": "100","read_only": "N","version_id": "1.0.0","map_cut_rows": "0","map_cut_cols": "0"}}}';

  // CURRENT VERSION NUMBER
  // WARNING: The line starting with 'CM.version = ' is used by .github/workflows/create-build-tag.yml for creating build tags
  // If making changes to the string 'CM.version = ', make corresponding changes to the 'start_string' in that action.
  CM.version = "2.26.0"; // Please increment rightmost digit for each interim version
  CM.versionCheckUrl =
    "https://bioinformatics.mdanderson.org/versioncheck/NGCHM/";
  CM.viewerAppUrl =
    "https://bioinformatics.mdanderson.org/ngchm/ZipAppDownload";
  CM.classOrderStr = ".classifications_order";

  /**********************************************************************************
   * FUNCTION - CompatibilityManager: The purpose of the compatibility manager is to
   * find any standard configuration items that might be missing from the configuration
   * of the heat map that is currrently being opened.  There is a "current" configuration
   * default file (configuration.json) stored as a string variable at the top of this
   * javascript file.
   *
   * This function retrieves that JSON object and constructs a comparison object tree
   * (jsonpath/default value).  Then another comparison object tree is created from
   * the mapConfig JSON object (jsonpath/value) representing the heatmap being opened.
   *
   * For each element in the default configuration object tree, the heatmap configuration
   * object tree is searched.  If no matching object is found, one is created in the
   * heatmap configuration file.  If an edit was required during the comparison process,
   * the heatmaps mapConfig file is updated to permanently add the new properties.
   **********************************************************************************/
  CM.CompatibilityManager = function (mapConfig) {
    let foundUpdate = false;

    // Construct a flattened entry map from the standard map configuration.
    // Each key is a flattened path to the entry in the standard map config.
    // Example entry: ".col_configuration.dendrogram.show" with value "ALL".
    //
    // The input mapConfig is used to replicate the prototype entries in the
    // standardMapConfig for each data layer and classification bar that
    // mapConfig contains.
    //
    const standardMapConfig = JSON.parse(CM.jsonConfigStr);
    const standardMapEntries = buildConfigComparisonObject(standardMapConfig, mapConfig);

    // Construct a flattened entry map from the heatmap's configuration, for comparison.
    const mapConfigEntries = buildConfigComparisonObject(mapConfig);

    // For any standardMapEntries that are not present in mapConfigEntries, add its
    // value to the corresponding sub-object of mapConfig.
    for (let [propertyPath, propertyValue] of standardMapEntries.entries()) {

      // If we are processing one of the 2 classifications_order entries in
      // the prototypical standard map.
      const classOrderFound = propertyPath.includes(CM.classOrderStr);
      if (classOrderFound) {
        propertyPath += ".0";
      }

      // If a standard config entry is missing in the heatmap config, add an entry to mapConfig
      // with the value from the standard config entry and set foundUpdate to true.
      if (!mapConfigEntries.has(propertyPath)) {
        if (classOrderFound) {
          // If we are processing for missing classification order, check to see if there
          // are any classifications defined before requiring an update.
          if (hasClasses(mapConfig, propertyPath)) {
            foundUpdate = true;
          }
        } else {
          // Find:
          // - the path to the subobject of mapConfig to update, and
          // - the name of the property within that subobject to add.
          const subobjectPath = propertyPath.substring(1, propertyPath.lastIndexOf("."));
          const propertyName = propertyPath.substring(
            propertyPath.lastIndexOf(".") + 1,
            propertyPath.length,
          );
          // Split the subobjectPath into its component paths.
          const parts = subobjectPath.split(".");
          // Repair any entries for classification bars whose bar labels were
          // split apart because they contained a period character.
          if (parts[1] === "classifications") {
            parts[2] = rebuildClassLabel(parts);
          }
          // Find the subobject in mapConfig to update.
          const obj = getObjectPart(mapConfig, parts);
          // Set the item's value.
          obj[propertyName] = propertyValue;
          foundUpdate = true;
        }
      }
    }

    return foundUpdate;
  };

  // Checks the specified axis in mapConfig and mapData for compatibility issues and
  // updates mapConfig and mapData appropriately.
  //
  // Checks performed:
  // + If there is no top_items_cv entry but there is a top_items entry, create a continuous
  //   covariate bar from the top_items, set top_items_cv to its name, and remove top_items.
  //
  CM.checkAxis = function checkAxis (mapConfig, mapData, axis) {
    let changed = false;
    const axisConfig = mapConfig[axis+"_configuration"];
    const classData =  mapData[axis+"_data"];
    if (axisConfig.top_items_cv == "" && axisConfig.top_items && axisConfig.top_items.length > 0) {
      let suffix = "";
      while (axisConfig.classifications.hasOwnProperty ("LabelPriority" + suffix)) {
        suffix = +suffix + 1;
      }
      const topClass = "LabelPriority" + suffix;
      axisConfig.classifications[topClass] = {
        bar_type: "color_plot",
        bg_color: "#ffffff",
        fg_color: "#000000",
        height: "15",
        low_bound: "1.0",
        high_bound: "2.0",
        show: "N",
        color_map: {
          type: "continuous",
          thresholds: [ 1, 2 ],
          colors: [ "#ffffff", "#ff0000" ],
          missing: "#b3b3b3",
        }
      };
      axisConfig.classifications_order.push(topClass);
      classData.classifications[topClass] = { values: classData.label.labels.map (label => axisConfig.top_items.includes(label) ? "1" : "NA") };
      axisConfig.top_items_cv = topClass;
      if (debugCM) {
        console.log("CM.checkAxis", { axis, topClass, top_items: axisConfig.top_items });
      }
      delete axisConfig.top_items;
      changed = true;
    }
    return changed;
  };

  function getObjectPart (obj, parts) {
    for (let i = 0; i < parts.length; i++) {
      obj = obj[parts[i]];
    }
    return obj;
  }

  /**********************************************************************************
   * FUNCTION - rebuildClassLabel: The purpose of this function is to determine if the
   * classification label contains the period (.) character and combine the pieces, that
   * have been previously split on that character, back into a single string.
   *
   * On entry, parts will have the form:
   * [ prefix, "classifications", labelpart1, labelpart2, ... labelpartN ]
   *
   * The return value will be "labelpart1.labelpart2. ... .labelpartN".
   *
   * *******************************************************************************/
  function rebuildClassLabel (parts) {
    return parts.slice(2).join(".");
  }

  /**********************************************************************************
   * FUNCTION - hasClasses: The purpose of this function is determine, IF column or
   * row classifications exist in the current config.  The reason for this is that
   * if classification_order is NOT found, we only need to update the auto save
   * the heatmap's config if classifications exist.
   * *******************************************************************************/
  function hasClasses (config, item) {
    if (item.includes(".row_configuration.")) {
      if (Object.keys(config.row_configuration.classifications).length > 0) {
        return true;
      }
    } else {
      if (Object.keys(config.col_configuration.classifications).length > 0) {
        return true;
      }
    }
    return false;
  }

  /**********************************************************************************
   * FUNCTION - buildConfigComparisonObject:
   *
   * Returns a map from flattened entry names in obj to their values.
   * For instance, if obj contains { items: { target: '123' }}, then the returned
   * map will contain an entry '.items.target' => '123'.
   *
   * obj is either
   * + the default heatmap properties, OR
   * + the heatmap properties of the map that is currently being opened.
   *
   * For the current map, the full path to each configuration item is added, along
   * with its associated value, to the comparison object.
   *
   * If obj is the default heatmap properties:
   * + It does not know how many data layers and/or classification bars there are in
   *   the current heatmap.
   * + It contains a prototype entry for each.
   * + So, the heatmap properties of the map being opened should be passed in mapConfig.
   * + We loop through the layers/classes in mapConfig and add a copy of each default
   *   layer/class config for each to the returned map.
   **********************************************************************************/
  function buildConfigComparisonObject (obj, mapConfig) {
    // Initialize configMap.  Populate it recursively.
    const configMap = new Map();
    buildRecursively (obj, "");
    return configMap;

    // Populates configMap recursively.
    // - obj is the current subobject.
    // - stack is the path to that subobject.
    function buildRecursively (obj, stack) {
      for (var property in obj) {
        if (obj.hasOwnProperty(property)) {
          // Path to the current property.
          const jsonPath = stack + "." + property;
          if (typeof obj[property] == "object") {
            // Recursively add sub objects.
            buildRecursively (obj[property], jsonPath);
          } else if (typeof mapConfig === "undefined") {
            // If no mapConfig, use the input path.
            configMap.set(jsonPath, obj[property]);
          } else {
            // If mapConfig is provided, we insert a copy of the input property for each data layer or
            // classification bar in mapConfig.
            //
            // The name of the data layer or classification bar is inserted into the path before the
            // current item's name.
            //
            if (stack.indexOf("row_configuration.classifications") > -1) {
              // Insert a copy of the current property for each row covariate in mapConfig.
              let classes = mapConfig.row_configuration.classifications;
              for (let key in classes) {
                let jsonPathNew = stack + "." + key + "." + property;
                configMap.set(jsonPathNew, obj[property]);
              }
            } else if (stack.indexOf("col_configuration.classifications") > -1) {
              // Insert a copy of the current property for each column covariate in mapConfig.
              let classes = mapConfig.col_configuration.classifications;
              for (let key in classes) {
                let jsonPathNew = stack + "." + key + "." + property;
                configMap.set(jsonPathNew, obj[property]);
              }
            } else if (stack.indexOf("data_layer") > -1) {
              // Insert a copy of the current property for each data layer.
              // - For the data layer name, append the data layer index to the base name in mapConfig.
              let layers = mapConfig.data_configuration.map_information.data_layer;
              for (let key in layers) {
                let jsonPathNew = stack + "." + key + "." + property;
                let value = obj[property];
                if (property === "name") {
                  value = value + " " + key;
                }
                configMap.set(jsonPathNew, value);
              }
            } else {
              // None of the above.  Insert the property value at its input path.
              configMap.set(jsonPath, obj[property]);
            }
          }
        }
      }
    }
  }

  /************************************************
   * mapData compatibility fixes
   * return true iff the mapData was updated.
   ***********************************************/
  CM.mapDataCompatibility = function (mapData) {
    let updated = false;
    fixAxisTypes ("Column", mapData.col_data);
    fixAxisTypes ("Row", mapData.row_data);
    function fixAxisTypes (axis, axisData) {
      // If labelTypes is defined, it is up to date.
      if (axisData.label.labelTypes) return;

      // Get old label type(s).
      let types = axisData.label.label_type;
      // Update to an array if needed.
      if (!Array.isArray(types)) types = [types];
      // Fix label types that were erroneously joined by ".bar.".
      types = types.map((x) => x.split(".bar.")).flat();
      // Convert to object and add visibility.
      types = types.map((type,idx) => ({ type: type, visible: idx == 0 }));

      if (debugCM) {
        console.log("CM.checkAxis", { axis, oldLabelTypes: classData.label.label_type, newLabelTypes: types });
      }
      axisData.label.labelTypes = types;
      delete axisData.label.label_type;
      updated = true;
    }
    return updated;
  };
})();
