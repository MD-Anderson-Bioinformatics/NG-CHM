//Define Namespace for NgChm ColorMapManager
NgChm.createNS('NgChm.CMM');

NgChm.CMM.ColorMap = function(colorMapObj) {
	var type = colorMapObj["type"];
	var thresholds;
	if (type == "quantile"){
		thresholds = colorMapObj["linearEquiv"];
	}	else {
		thresholds = colorMapObj["thresholds"];
	}
	var numBreaks = thresholds.length;
	
	// Hex colors
	var colors = colorMapObj["colors"];
	var missingColor = colorMapObj["missing"];
	
	// RGBA colors
	var rgbaColors = [];
	var rgbaMissingColor;
	
	if (colorMapObj["rgbaColors"] != undefined){
		rgbaColors = colorMapObj["rgbaColors"];
	} else {
		for (var i =0; i<numBreaks; i++){
			rgbaColors[i] = hexToRgba(colors[i]);
		}
	}
	
	if (colorMapObj["rgbaMissingColor"] != undefined){
		rgbaMissingColors = colorMapObj["rgbaMissingColor"];
	} else {
		rgbaMissingColor = hexToRgba(missingColor);
	}
	
	this.getThresholds = function(){
		return thresholds;
	}
	
	this.setThresholds = function(newthresholds){
		thresholds = newthresholds;
	}
	/**********************************************************************************
	 * FUNCTION - getContinuousThresholdKeys: This function calculates and returns an
	 * array containing 10 continuous threshold breakpoint keys from the original thresholds 
	 * submitted.  It is used only for rendering a continuous classification bar help.  
	 **********************************************************************************/
	this.getContinuousThresholdKeys = function(){
    	var conThresh = new Array();
    	var bottomThresh = thresholds[0];
    	var threshSize = this.getContinuousThresholdKeySize();
    	//Add first threshold from original threshold list
    	conThresh.push(bottomThresh);
    	//Calculate and create "interim" 8 thresholds
    	for (var i = 1; i <= 8; i++){
	    	conThresh.push(bottomThresh+threshSize*i);
    	}
    	//Add last threshold from original threshold list
    	conThresh.push(thresholds[thresholds.length - 1]);  
    	return conThresh;
	}
	
	/**********************************************************************************
	 * FUNCTION - getContinuousThresholdKeySize: This function calculates the size 
	 * separating each "interim" threshold key for a continuous classification bar.  
	 **********************************************************************************/
	this.getContinuousThresholdKeySize = function(){
    	var bottomThresh = thresholds[0];
    	var topThresh = thresholds[thresholds.length - 1]; 
    	return (topThresh - bottomThresh) / 8;
	}
	
	this.getColors = function(){
		return colors;
	}
	this.setColors = function(newcolors){
		colors = newcolors;
	}
	this.getType = function(){
		return type;
	}
	this.getMissingColor = function(){
		return missingColor;
	}
	this.setMissingColor = function(color){
		missingColor = color;
	}
	
	
	// returns an RGBA value from the given value
	this.getColor = function(value){
		var color;
	
		if (value >= NgChm.SUM.maxValues){
			color = rgbaMissingColor;
		}else if(value <= thresholds[0]){
			color = rgbaColors[0]; // return color for lowest threshold if value is below range
		} else if (value >= thresholds[numBreaks-1]){
			color = rgbaColors[numBreaks-1]; // return color for highest threshold if value is above range
		} else {
			var bounds = findBounds(value, thresholds);
			color = blendColors(value, bounds);
		}
		
		return color;
	}
	
	this.getClassificationColor = function(value){
		var color;
		if (type == "discrete"){
			for (var i = 0; i < thresholds.length; i++){
				if (value == thresholds[i]){
					color = rgbaColors[i];
					return color;
				}
			}
			return rgbaMissingColor;
		} else {
			if (isNaN(value)){
				color = rgbaMissingColor;
			}else{
				color = this.getColor(value);
			}
		}
		
		return color;
	}
	
	this.addBreakpoint = function(value,color){
		var bounds = findBounds(value, thresholds);
		thresholds.splice(bounds["lower"],0,value);
		colors.splice(bounds["lower"],0,color);
		rgbaColors.splice(bounds["lower"],0,hexToRgba(color));
	}
	
	this.changeBreakpoint = function(value,newColor){
		var bounds = findBounds(value, thresholds);
		thresholds.splice(bounds["lower"],1,value);
		colors.splice(bounds["lower"],1,newColor);
		rgbaColors.splice(bounds["lower"],1,hexToRgba(newColor));
	}
	
	this.removeBreakpoint = function(value){
		var bounds = findBounds(value, thresholds);
		thresholds.splice(bounds["lower"],1);
		colors.splice(bounds["lower"],1);
		rgbaColors.splice(bounds["lower"],1);
	}
	
	//===========================//
	// internal helper functions //
	//===========================//
	
	function findBounds(value, thresholds){
		var bounds = {};
		var i =0;
		while (i<numBreaks){
			if (thresholds[i] <= value && value < thresholds[i+1]){
				bounds["upper"] = i+1;
				bounds["lower"] = i;
				break;
			}
			i++;
		}
		return bounds;
	}
	
	function blendColors(value, bounds){
		var ratio = (value - thresholds[bounds["lower"]])/(thresholds[bounds["upper"]]-thresholds[bounds["lower"]]);
		var lowerColor = rgbaColors[bounds["lower"]];
		var upperColor = rgbaColors[bounds["upper"]];
		// lowerColor and upperColor should be in { r:###, g:###, b:### } format
		var color = {};
		color["r"] = Math.round(lowerColor["r"] * (1.0 - ratio) + upperColor["r"] * ratio);
	    color["g"] = Math.round(lowerColor["g"] * (1.0 - ratio) + upperColor["g"] * ratio);
	    color["b"] = Math.round(lowerColor["b"] * (1.0 - ratio) + upperColor["b"] * ratio);
	    color["a"] = 255;
	    return color;
	}
	
	function hexToRgba(hex) { // I didn't write this function. I'm not that clever. Thanks stackoverflow
	    var rgbColor = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	    return rgbColor ? {
	        r: parseInt(rgbColor[1], 16),
	        g: parseInt(rgbColor[2], 16),
	        b: parseInt(rgbColor[3], 16),
	        a: 255
	    } : null;
	}

	function hexToRgb(hex) {
	    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	    return result ? {
	        r: parseInt(result[1], 16),
	        g: parseInt(result[2], 16),
	        b: parseInt(result[3], 16)
	    } : null;
	}
	this.getHexToRgba = function(hex){
		return hexToRgba(hex);
	}
	
	this.getColorLuminance = function(color) {
		var rgb = hexToRgb(color);
	    if (!rgb) {
	    	return null;
	    } else {
	        return 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
	    }
	}	
	
	this.isColorDark = function(rgb) {
	    if (!rgb) {
	    	return false;
	    } else {
	    	var luminanceVal = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
	       if (luminanceVal < 60) {
	    	   return false;
	       } else {
	    	   return true;
	       }
	    }
	}	
	
	this.getRgbToHex = function(rgb) {
		var a = rgb.a
		var r = rgb.r
		var g = rgb.g
		var b = rgb.b
	    return ('#' + componentToHex(r) + componentToHex(g) + componentToHex(b));
	}
	
	function componentToHex(c) {
	    var hex = c.toString(16);
	    return hex.length == 1 ? "0" + hex : hex;
	}

}
		
// All color maps and current color maps are stored here.
NgChm.CMM.ColorMapManager = function(mapConfig) {
	
	var colorMapCollection = [mapConfig.data_configuration.map_information.data_layer,mapConfig.row_configuration.classifications,mapConfig.col_configuration.classifications];
	
	this.getColorMap = function(type, colorMapName){
		if (type === "data") {
			var colorMap = new NgChm.CMM.ColorMap(colorMapCollection[0][colorMapName].color_map);
		} else if (type === "row") {
			var colorMap = new NgChm.CMM.ColorMap(colorMapCollection[1][colorMapName].color_map);
		} else {
			var colorMap = new NgChm.CMM.ColorMap(colorMapCollection[2][colorMapName].color_map);
		}
		return colorMap;
	}
	
	this.setColorMap = function(colorMapName, colorMap, type) {
		if (type === "row") {
			var existingColorMap = colorMapCollection[1][colorMapName].color_map;
		} else if (type === "col") {
			var existingColorMap = colorMapCollection[2][colorMapName].color_map;
		} else {
		    var existingColorMap = colorMapCollection[0][colorMapName].color_map;
		}
		existingColorMap.colors = colorMap.getColors();
		existingColorMap.thresholds = colorMap.getThresholds();
		existingColorMap.missing = colorMap.getMissingColor();
	}
}
