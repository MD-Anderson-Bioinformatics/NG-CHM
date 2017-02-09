//Define Namespace for NgChm CompatibilityManager
NgChm.createNS('NgChm.CM');

// This string contains the entire configuration.json file.  This was previously located in a JSON file stored with the application code
// but has been placed here at the top of the CompatibilityManager class so that the configuration can be utilized in File Mode.
NgChm.CM.jsonConfigStr = "{\"row_configuration\": {\"classifications\": {\"show\": \"Y\",\"height\": 15},\"classifications_order\": 1,\"organization\": {\"agglomeration_method\": \"unknown\","+
			"\"order_method\": \"unknown\",\"distance_metric\": \"unknown\"},\"dendrogram\": {\"show\": \"ALL\",\"height\": \"100\"}},"+
			"\"col_configuration\": {\"classifications\": {\"show\": \"Y\",\"height\": 15},\"classifications_order\": 1,"+ 
		    "\"organization\": {\"agglomeration_method\": \"unknown\",\"order_method\": \"unknown\",\"distance_metric\": \"unknown\"},"+
		    "\"dendrogram\": {\"show\": \"ALL\",\"height\": \"100\"}},\"data_configuration\": {\"map_information\": {\"data_layer\": {"+
		    "\"name\": \"Data Layer\",\"grid_show\": \"Y\",\"grid_color\": \"#FFFFFF\",\"selection_color\": \"#00FF38\"},\"name\": \"CHM Name\",\"description\": \""+
		    "Full length description of this heatmap\",\"summary_width\": \"50\",\"summary_height\": \"100\",\"detail_width\": \"50\",\"detail_height\": \"100\",\"read_only\": \"N\",\"version_id\": \"1.0.0\",\"label_display_length\": \"20\",\"label_display_truncation\": \"END\"}}}";

NgChm.CM.classOrderStr = ".classifications_order";

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
NgChm.CM.CompatibilityManager = function(mapConfig) {
	var foundUpdate = false;
	var jsonConfig = JSON.parse(NgChm.CM.jsonConfigStr);
	//Construct comparison object tree from default configuration
	var configObj = {}
	NgChm.CM.buildConfigComparisonObject(jsonConfig, '', configObj, mapConfig);
	//Construct comparison object tree from the heatmap's configuration
	var mapObj = {}
	NgChm.CM.buildConfigComparisonObject(mapConfig, '', mapObj);
	
	//Loop thru the default configuration object tree searching for matching
	//config items in the heatmap's config obj tree.
	for (var key in configObj) {
		var searchItem = key;

		//Check to see if we are processing one of the 2 classifications_order entries
		var classOrderFound = false;
		if (searchItem.includes(NgChm.CM.classOrderStr)) {
    		searchItem += ".0";
			classOrderFound = true;
		}
		var searchValue = configObj[key];
		var found = false;
		for (var key in mapObj) {
			if (key === searchItem) {
					found = true;
					break;
			}
		}
		//If config object not found in heatmap config, add object with default
		if (!found) {
	    	if (!classOrderFound) { 
				var searchPath = searchItem.substring(1, searchItem.lastIndexOf("."));
				var newItem = searchItem.substring(searchItem.lastIndexOf(".")+1, searchItem.length);
				var parts = searchPath.split(".");
				var obj = mapConfig;
				for (i=0;i<parts.length;i++) {
					obj = obj[parts[i]];
				}
				obj[newItem] = searchValue;
				foundUpdate = true;
	    	} else {
	    		//If we are processing for missing classification order, check to see if there
	    		//are any classifications defined before requiring an update.
	    		if (NgChm.CM.hasClasses(mapConfig, searchItem)) {
	    			foundUpdate = true;
	    		}
	    	}
		}
	}
	//If any new configs were added to the heatmap's config, save the config file.
	if (foundUpdate === true) {
		var success = NgChm.heatMap.autoSaveHeatMap();
	}
}

/**********************************************************************************
 * FUNCTION - hasClasses: The purpose of this function is determine, IF column or
 * row classifications exist in the current config.  The reason for this is that
 * if classification_order is NOT found, we only need to update the auto save 
 * the heatmap's config if classifications exist.
 * *******************************************************************************/
NgChm.CM.hasClasses = function(config, item) {
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
 * FUNCTION - buildConfigComparisonObject: The purpose of this function is to construct
 * a 2 column "comparison" object from either the default heatmap properties OR the
 * heatmap properties of the map that is currently being opened.
 * 
 * For the current map, the full path to each configuration item is added, along 
 * with its associated value, to the comparison object.
 * 
 * For the default configuration, an additional step is performed using the contents
 * of the current map.  The default configuration does not know how many data layers
 * and/or classification bars that the current heatmap has.  So we loop thru the 
 * current heatmap's list of layers/classes and add a default layer/class config for 
 * each layer/class to the default configuration comparison tree.
 **********************************************************************************/
NgChm.CM.buildConfigComparisonObject = function(obj, stack, configObj, mapConfig) {
    for (var property in obj) {
        if (obj.hasOwnProperty(property)) {
            if (typeof obj[property] == "object") {
            	NgChm.CM.buildConfigComparisonObject(obj[property], stack + '.' + property, configObj, mapConfig);
            } else {
               var jsonPath = stack+"."+property;
                //If we are processing the default config object tree, use the heatmap's config object to retrieve
                //and insert keys for each data layer or classification bar that exists in the heatmap.
                if (typeof mapConfig !== 'undefined') {
	                if (stack.indexOf("row_configuration.classifications") > -1) {
		    			var classes = mapConfig.row_configuration.classifications;
		    			for (key in classes) {
							var jsonPathNew = stack+"."+key+"."+property;
	                		configObj[jsonPathNew] = obj[property];
		    			}
	                } else if (stack.indexOf("col_configuration.classifications") > -1) {
		    			var classes = mapConfig.col_configuration.classifications;
		    			for (key in classes) {
							var jsonPathNew = stack+"."+key+"."+property;
	                		configObj[jsonPathNew] = obj[property];
		    			}
	                } else if (stack.indexOf("data_layer") > -1) {
		    			var layers = mapConfig.data_configuration.map_information.data_layer;
		    			for (key in layers) {
							var jsonPathNew = stack+"."+key+"."+property;
							var value = obj[property];
							if (property === 'name') {
								value = value + " " + key;
							}
	                		configObj[jsonPathNew] = value;
		    			}
	                } else {
						configObj[jsonPath] = obj[property];
	                }
               } else {
					configObj[jsonPath] = obj[property];
                }
            }
        }
    }
}

