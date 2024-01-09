(function() {
    'use strict';
    NgChm.markFile();

    //Define Namespace for NgChm CompatibilityManager
    const CM = NgChm.createNS('NgChm.CM');

    const UTIL = NgChm.importNS('NgChm.UTIL');
 
// This string contains the entire configuration.json file.  This was previously located in a JSON file stored with the application code
// but has been placed here at the top of the CompatibilityManager class so that the configuration can be utilized in File Mode.
CM.jsonConfigStr = "{\"row_configuration\": {\"classifications\": {\"show\": \"Y\",\"height\": 15,\"bar_type\": \"color_plot\",\"fg_color\": \"#000000\",\"bg_color\": \"#FFFFFF\",\"low_bound\": \"0\",\"high_bound\": \"100\"},\"classifications_order\": 1,\"organization\": {\"agglomeration_method\": \"unknown\","+
			"\"order_method\": \"unknown\",\"distance_metric\": \"unknown\"},\"dendrogram\": {\"show\": \"ALL\",\"height\": \"100\"},\"label_display_length\": \"20\",\"label_display_method\": \"END\",\"top_items\": \"[]\"},"+
			"\"col_configuration\": {\"classifications\": {\"show\": \"Y\",\"height\": 15,\"bar_type\": \"color_plot\",\"fg_color\": \"#000000\",\"bg_color\": \"#FFFFFF\",\"low_bound\": \"0\",\"high_bound\": \"100\"},\"classifications_order\": 1,"+ 
		    "\"organization\": {\"agglomeration_method\": \"unknown\",\"order_method\": \"unknown\",\"distance_metric\": \"unknown\"},"+
		    "\"dendrogram\": {\"show\": \"ALL\",\"height\": \"100\"},\"label_display_length\": \"20\",\"label_display_method\": \"END\",\"top_items\": \"[]\"},\"data_configuration\": {\"map_information\": {\"data_layer\": {"+
		    "\"name\": \"Data Layer\",\"grid_show\": \"Y\",\"grid_color\": \"#FFFFFF\",\"selection_color\": \"#00FF38\",\"cuts_color\": \"#FFFFFF" +
		    "\"},\"name\": \"CHM Name\",\"description\": \""+
		    "Full length description of this heatmap\",\"summary_width\": \"50\",\"builder_version\": \"NA\",\"summary_height\": \"100\",\"detail_width\": \"50\",\"detail_height\": \"100\",\"read_only\": \"N\",\"version_id\": \"1.0.0\",\"map_cut_rows\": \"0\",\"map_cut_cols\": \"0\"}}}";

// CURRENT VERSION NUMBER
// WARNING: The line starting with 'CM.version = ' is used by .github/workflows/create-build-tag.yml for creating build tags
// If making changes to the string 'CM.version = ', make corresponding changes to the 'start_string' in that action.
CM.version = "2.24.3";	// Please increment rightmost digit for each interim version
CM.versionCheckUrl = "https://bioinformatics.mdanderson.org/versioncheck/NGCHM/";
CM.viewerAppUrl = "https://bioinformatics.mdanderson.org/ngchm/ZipAppDownload";
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
CM.CompatibilityManager = function(mapConfig) {
	var foundUpdate = false;
	var jsonConfig = JSON.parse(CM.jsonConfigStr);
	//Construct comparison object tree from default configuration
	var configObj = {}
	CM.buildConfigComparisonObject(jsonConfig, '', configObj, mapConfig);
	//Construct comparison object tree from the heatmap's configuration
	var mapObj = {}
	CM.buildConfigComparisonObject(mapConfig, '', mapObj);
	
	//Loop thru the default configuration object tree searching for matching
	//config items in the heatmap's config obj tree.
	for (var key in configObj) {
		var searchItem = key;

		//Check to see if we are processing one of the 2 classifications_order entries
		var classOrderFound = false;
		if (searchItem.includes(CM.classOrderStr)) {
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
				//Here we search any entries for classification bars to reconstruct bar labels that have been
				//split apart due to the period character being contained in the label.
				if (parts[1] === 'classifications') {
					parts[2] = CM.trimClassLabel(parts);
				}
				var obj = mapConfig;
				for (let i=0;i<parts.length;i++) {
					obj = obj[parts[i]];
				}
				//For adding empty array for top_items
				if (searchValue == "[]") {
					searchValue = [];
				}
				obj[newItem] = searchValue;
				foundUpdate = true;
	    	} else {
	    		//If we are processing for missing classification order, check to see if there
	    		//are any classifications defined before requiring an update.
			if (CM.hasClasses(mapConfig, searchItem)) {
	    			foundUpdate = true;
	    		}
	    	}
		}
	}

	return foundUpdate;
};

/**********************************************************************************
 * FUNCTION - trimClassLabel: The purpose of this function is to determine if the 
 * classification label contains the period (.) character and combine the pieces, that
 * have been previously split on that character, back into a single string.
 * *******************************************************************************/
CM.trimClassLabel = function(parts) {
	var classLabel = "";
	if (parts.length > 3) {
		var remItem = "";
		for (var i = parts.length - 1; i >= 3; i--) {
			remItem = "."+parts[i]+remItem;
			parts.splice(i, 1);
		}
		classLabel = parts[2] + remItem;
	} else {
		classLabel = parts[2];
	}
	return classLabel;
}

/**********************************************************************************
 * FUNCTION - hasClasses: The purpose of this function is determine, IF column or
 * row classifications exist in the current config.  The reason for this is that
 * if classification_order is NOT found, we only need to update the auto save 
 * the heatmap's config if classifications exist.
 * *******************************************************************************/
CM.hasClasses = function(config, item) {
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
CM.buildConfigComparisonObject = function(obj, stack, configObj, mapConfig) {
    for (var property in obj) {
        if (obj.hasOwnProperty(property)) {
            if (typeof obj[property] == "object") {
            	if ((typeof mapConfig === 'undefined') && (property === 'top_items')) {
            		configObj[stack+"."+property] = obj[property];
            	} else {
			CM.buildConfigComparisonObject(obj[property], stack + '.' + property, configObj, mapConfig);
            	}
            } else {
               var jsonPath = stack+"."+property;
                //If we are processing the default config object tree, use the heatmap's config object to retrieve
                //and insert keys for each data layer or classification bar that exists in the heatmap.
                if (typeof mapConfig !== 'undefined') {
	                if (stack.indexOf("row_configuration.classifications") > -1) {
				let classes = mapConfig.row_configuration.classifications;
				for (let key in classes) {
					let jsonPathNew = stack+"."+key+"."+property;
					configObj[jsonPathNew] = obj[property];
				}
	                } else if (stack.indexOf("col_configuration.classifications") > -1) {
				let classes = mapConfig.col_configuration.classifications;
				for (let key in classes) {
					let jsonPathNew = stack+"."+key+"."+property;
					configObj[jsonPathNew] = obj[property];
				}
	                } else if (stack.indexOf("data_layer") > -1) {
				let layers = mapConfig.data_configuration.map_information.data_layer;
				for (let key in layers) {
					let jsonPathNew = stack+"."+key+"."+property;
					let value = obj[property];
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

/************************************************
 * mapData compatibility fixes
 * return true iff the mapData was updated.
 ***********************************************/
CM.mapDataCompatibility = function(mapData) {
	let updated = false;
	if (!Array.isArray(mapData.col_data.label.label_type)) {
		var valArr = UTIL.convertToArray(mapData.col_data.label.label_type);
		mapData.col_data.label.label_type = valArr;
		updated = true;
	}
	if (!Array.isArray(mapData.row_data.label.label_type)) {
		var valArr = UTIL.convertToArray(mapData.row_data.label.label_type);
		mapData.row_data.label.label_type = valArr;
		updated = true;
	}
	return updated;
};

})();
