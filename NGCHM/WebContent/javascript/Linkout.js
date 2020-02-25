/*************************************************************
 * Linkouts will be added to the Row/Column Menus according to 
 * the label_type attributes (found in the mapData.json file). 
 * These attributes will drive the input paramaters for the 
 * linkout functions. (Provided by getLabelsByType)
 * 
 * TODO: Need to find a way to pass in whole label for some linkout functions.
 **************************************************************/

/*******************************************
 * BEGIN EXTERNAL INTERFACE
 *******************************************/

var linkouts = {};
linkouts.VISIBLE_LABELS = "visibleLabels";
linkouts.HIDDEN_LABELS = "hiddenLabels";
linkouts.FULL_LABELS = "fullLabels";
linkouts.POSITION = "position";
linkouts.SINGLE_SELECT = "singleSelection";
linkouts.MULTI_SELECT = "multiSelection";

linkouts.getAttribute = function (attribute){
	return NgChm.heatMap.getMapInformation().attributes[attribute];
}

linkouts.getMapName = function(){
	return NgChm.heatMap.getMapInformation().name;
}

linkouts.getMapFileName = function(){
	return NgChm.UTIL.getURLParameter("map");
}

// returns type of object we're linking from.
linkouts.getSourceObjectType = function() {
	return "chm"; // CHM of course.
};

// returns a 'unique' identifier for the current source object.
linkouts.getSourceObjectUniqueId = function() {
	return NgChm.UTIL.getURLParameter("map");
};

//adds axis linkout objects to the linkouts global variable
linkouts.addLinkout = function(name, labelType, selectType, callback, reqAttributes, index){
	NgChm.LNK.addLinkout(name, labelType, selectType, callback, reqAttributes, index);
};

//adds matrix linkout objects to the linkouts global variable
linkouts.addMatrixLinkout = function (name, rowType, colType, selectType, callback, reqAttributes, index) {
	NgChm.LNK.addMatrixLinkout (name, rowType, colType, selectType, callback, reqAttributes, index);
};

linkouts.addPanePlugin = function (p) {
	NgChm.LNK.registerPanePlugin (p);
};

// Linkout to the specified url in a suitable 'window'.
// name identifies the linkout group (subsequent linkouts in the same group should display in the same window).
// options fine tunes the window display.
(function() {
	linkouts.openUrl = function openUrl (url, name, options) {
                options = options || {};
		const pane = NgChm.LNK.linkoutElement !== null && NgChm.Pane.findPaneLocation (NgChm.LNK.linkoutElement);
                if (!pane.pane || options.noframe) {
                        window.open (url, name);
                } else {
                        console.log ({ m: 'openUrl', url, name, options });
                        let ch = NgChm.LNK.linkoutElement.lastChild;
                        while (ch) {
                                NgChm.LNK.linkoutElement.removeChild (ch);
                                ch = NgChm.LNK.linkoutElement.lastChild;
                        }
                        ch = document.createElement('IFRAME');
                        ch.setAttribute('title', name);
                        ch.setAttribute('src', url);
                        NgChm.LNK.linkoutElement.appendChild(ch);
                        if (name) {
				NgChm.Pane.setPaneTitle (pane, name);
                        }
                }
	};
})();

linkouts.simplifyLabels = function (labels) {
        if (!Array.isArray(labels)) {
	        labels = labels.Row.concat(labels.Column);
        }
        // Remove duplicates.
        return labels.sort().filter(function(el,i,a){return i===a.indexOf(el);});
};

linkouts.addHamburgerLinkout = function(params){
	NgChm.LNK.addHamburgerLinkout(params);
}

/*******************************************
 * END EXTERNAL INTERFACE
 *******************************************/

//Define Namespace for NgChm Linkout
NgChm.createNS('NgChm.LNK');
//Used to store the label item that the user clicked-on
NgChm.LNK.selection = 0;
//Used to place items into the hamburger menu (incremented from starting point of 10 which is just after the gear in the menu.  this value MUST be edited if adding an item before the gear)
NgChm.LNK.hamburgerLinkCtr = 10;

NgChm.LNK.linkoutElement = null;

// Maintain a database of installed pane plugins.
//
(function() {
	const panePlugins = [];

	class PanePlugin {
		constructor({ name = '', helpText = '', params = {}, src = '' } = {}) {
			Object.assign (this, { name, helpText, params, src });
		}
	}

	NgChm.LNK.registerPanePlugin = function(p) {
		panePlugins.push (new PanePlugin (p));
	};

	NgChm.LNK.getPanePlugins = function() {
		return panePlugins;
	};
})();

//Add a linkout to the Hamburger menu
NgChm.LNK.addHamburgerLinkout = function(params) {
	var burgerMenu = document.getElementById('menuPanel');
	//Verify params and set defaults
	if (params.name === undefined) {return;}
	if (params.label === undefined) {params.label = params.name;}
	if (params.icon === undefined) {params.icon = 'images/link.png';}
	if (params.action === undefined) {params.action = 'NgChm.UHM.hamburgerLinkMissing();'}
	//Create linkout div using params
	var wrapper= document.createElement('div');
	wrapper.innerHTML= "<div id='"+params.name+"' class='menuitem' onclick='"+params.action+"'> <img id='menu"+params.name+"_btn' class='menuitem' name ='menu"+params.name+"' src='"+params.icon+"' align='middle'>&nbsp;&nbsp;"+params.label+"...<br><br></div>";
	var burgerLinkDiv= wrapper.firstChild;
	//Add linkout to burger menu
	burgerMenu.insertBefore(burgerLinkDiv, burgerMenu.children[NgChm.LNK.hamburgerLinkCtr]);
	NgChm.LNK.hamburgerLinkCtr++;
}

//the linkout object
NgChm.LNK.linkout = function(title, labelType, selectType, reqAttributes, callback){
	this.title = title;
	this.labelType = labelType; // input type of the callback function
	this.selectType = selectType;
	this.reqAttributes = reqAttributes;
	this.callback = callback;
}

NgChm.LNK.matrixLinkout = function(title, rowType, colType, selectType, reqAttributes, callback){
	this.title = title;
	this.rowType = rowType;
	this.colType = colType;
	this.selectType = selectType;
	this.reqAttributes = reqAttributes;
	this.callback = callback;
}

//this function is used to add standard linkouts to the row/col, covariate, and matrix menu
// labelType will decide which menu to place the linkout in.
// selectType decides when the linkout is executable. (passing in null or undefined, or false will allow the function to be executable for all selection types)
NgChm.LNK.addLinkout = function(name, labelType, selectType, callback, reqAttributes, index){ 
        var linkout = new NgChm.LNK.linkout(name, labelType, selectType,reqAttributes, callback);
	if (!linkouts[labelType]){
		linkouts[labelType] = [linkout];
	} else {
		if (index !== undefined){
			linkouts[labelType].splice(index, 0, linkout); 
		}else {
			NgChm.LNK.dupeLinkout(linkouts[labelType], linkout);
			linkouts[labelType].push(linkout);
		}
	}
}

//Check to see if the linkout being added already exists.  This would be in a case where a secondary custom.js is being used (embedded NG-CHM)
//If so, delete the existing linkout and allow the new linkout to be added in its place.
NgChm.LNK.dupeLinkout = function(linkouts, linkout) {
	for (var i=0;i<linkouts.length;i++) {
		var curLink = linkouts[i];
		if (curLink.title === linkout.title) {
			linkouts.splice(i,1);
		}
	}
}

NgChm.LNK.addMatrixLinkout = function(name, rowType, colType, selectType, callback, reqAttributes, index){ // this function is used to add linkouts to the matrix menu when the linkout needs a specific criteria for the row and column (ie: same attribute)
        var linkout = new NgChm.LNK.matrixLinkout(name, rowType, colType, selectType,reqAttributes, callback);
	if (!linkouts["Matrix"]){
		linkouts["Matrix"] = [linkout];
	} else {
		if (index !== undefined){
			linkouts["Matrix"].splice(index, 0, linkout );
		}else {
			linkouts["Matrix"].push(linkout);
		}
	}

}

//this function goes through searchItems and returns the proper label type for linkout functions to use
NgChm.LNK.getLabelsByType = function(axis, linkout){
	var searchLabels;
	var labelDataMatrix;
	var labels = axis == 'Row' ? NgChm.heatMap.getRowLabels()["labels"] : axis == "Column" ? NgChm.heatMap.getColLabels()['labels'] : 
		axis == "ColumnCovar" ? NgChm.heatMap.getColClassificationConfigOrder() : axis == "RowCovar" ? NgChm.heatMap.getRowClassificationConfigOrder() : 
			[NgChm.heatMap.getRowLabels()["labels"], NgChm.heatMap.getColLabels()['labels'] ];

	var types;

	if (linkout.labelType){ // if this is a standard linkout (ie: added using addLinkout and not addMatrixLinkout)
		types = linkout.labelType.split("|"); // split 'types' into an array if a combined label type is requested
		if (!Array.isArray(types)){ // make sure it's an array!
			types = [types];
		}
		
		// matrix and class bar linkouts can only access the visible labeltype right now. TODO: find a way to let matrix and class bar linkouts access specific labeltypes.
		var formatIndex = [];
		for (var i = 0; i < types.length; i++){
			var type = types[i];
			formatIndex[i] = !type || axis == "Matrix" ? 0 : axis == 'Row' ? NgChm.heatMap.getRowLabels()["label_type"].indexOf(type) : axis == "Column" ? NgChm.heatMap.getColLabels()['label_type'].indexOf(type) : 0;
		}
		if (axis !== "Matrix"){
			searchLabels = [];
			//IF the linkout is single select, load ONLY the item that was clicked on to searchLabels.
			if (linkout.selectType === linkouts.SINGLE_SELECT) {
				searchLabels.push( generateSearchLabel(NgChm.LNK.selection,formatIndex));
			} else {
			//ELSE the linkout is multi select, load all selected items to searchLabels (not necessarily the item that was clicked on)
				for (var i in NgChm.SEL.searchItems[axis]){
					if (axis.includes("Covar")){ // Covariate linkouts have not been tested very extensively. May need revision in future. 
						searchLabels.push( generateSearchLabel(labels[i],formatIndex)) ;
					} else {
						searchLabels.push( generateSearchLabel(labels[i-1],formatIndex));
					}
				}
			}
		} else {
		   	searchLabels = {"Row" : [], "Column" : []};
			for (var i in NgChm.SEL.searchItems["Row"]){
				searchLabels["Row"].push( generateSearchLabel(labels[0][i-1],[formatIndex[0]]) );
			}
			for (var i in NgChm.SEL.searchItems["Column"]){
				searchLabels["Column"].push( generateSearchLabel(labels[1][i-1],[formatIndex[0]]) );
			}
			if (linkout.title === 'Download selected matrix data to file') {
				labelDataMatrix = NgChm.LNK.createMatrixData(searchLabels);
				return labelDataMatrix;
			}
		}
	} else { // if this linkout was added using addMatrixLinkout
		searchLabels = {"Row" : [], "Column" : []};
		types = {"row" : linkout.rowType, "col" : linkout.colType};
		var formatIndex = {"row" : [], "col" : []};
		if (!Array.isArray(types.row))types.row = [types.row];
		if (!Array.isArray(types.col))types.col = [types.col];
		// Build the formatIndex array to help build the labels
		for (var i = 0; i < types.row.length; i++){
			var type = types.row[i];
			formatIndex.row[i] = NgChm.heatMap.getRowLabels()["label_type"].indexOf(type);
		}
		for (var i = 0; i < types.col.length; i++){
			var type = types.col[i];
			formatIndex.col[i] = NgChm.heatMap.getColLabels()["label_type"].indexOf(type);
		}
		// Build the searchLabels and put them into the return object
		for (var i in NgChm.SEL.searchItems["Row"]){
			searchLabels["Row"].push( generateSearchLabel(labels[0][i-1],formatIndex.row) );
		}
		for (var i in NgChm.SEL.searchItems["Column"]){
			searchLabels["Column"].push( generateSearchLabel(labels[1][i-1],formatIndex.col) );
		} 
		
	}
	return searchLabels;

	// This is a helper function that will create the proper label types
	// 'label' is the full row/column label, and 'indexes' is an array that tells you how  to put the searchLabel together
	function generateSearchLabel(label,indexes){
		var searchLabel = "";
		if (label !== undefined) {
			for (var i = 0; i < indexes.length; i++){
				searchLabel += label.split("|")[indexes[i]] + "|";
			}
			searchLabel = searchLabel.slice(0,-1); // remove the last character (the extra "|")
		}
		return searchLabel;
	}
}

//This function creates a two dimensional array which contains all of the row and
//column labels along with the data for a given selection
NgChm.LNK.createMatrixData = function(searchLabels) {
	var matrix = new Array();
	for (var j = 0; j < searchLabels["Row"].length+1; j++) {
		matrix[j] = new Array();
		if (j == 0) {
			matrix[j].push(" ");
			for (var i = 0; i < searchLabels["Column"].length; i++) {
				matrix[j].push(searchLabels["Column"][i])
			}
		}
	}
	var dataMatrix = new Array();
	for (var x in NgChm.SEL.searchItems["Row"]){
		for (var y in NgChm.SEL.searchItems["Column"]){
	    	var matrixValue = NgChm.heatMap.getValue(NgChm.MMGR.DETAIL_LEVEL,x,y);
	    	dataMatrix.push(matrixValue);
		}
	}
	var dataIdx = 0;
	for (var k = 1; k < matrix.length; k++) {
		matrix[k].push(searchLabels["Row"][k-1]);
		for (var i = 1; i < searchLabels["Column"].length+1; i++) {
			matrix[k].push(dataMatrix[dataIdx])
			dataIdx++;
		}
	}
	return matrix;
}


NgChm.LNK.createLabelMenus = function(){
	if (!document.getElementById("RowLabelMenu")){
		NgChm.LNK.createLabelMenu('Column'); // create the menu divs if they don't exist yet
		NgChm.LNK.createLabelMenu('ColumnCovar');
		NgChm.LNK.createLabelMenu('Row');
		NgChm.LNK.createLabelMenu('RowCovar');
		NgChm.LNK.createLabelMenu('Matrix');
		NgChm.LNK.getDefaultLinkouts();
	}
}

NgChm.LNK.labelHelpCloseAll = function(){
	NgChm.LNK.labelHelpClose("Matrix");
	NgChm.LNK.labelHelpClose("Column");
	NgChm.LNK.labelHelpClose("Row");
}


NgChm.LNK.labelHelpClose = function(axis){
	var labelMenu = axis !== "Matrix" ? document.getElementById(axis + 'LabelMenu') : document.getElementById("MatrixMenu");
    var tableBody = labelMenu.getElementsByTagName("TBODY")[0];
    var tempClass = tableBody.className;
    var newTableBody = document.createElement('TBODY');
    newTableBody.className = tempClass;
    tableBody.parentElement.replaceChild(newTableBody,tableBody);
    if (labelMenu){
	labelMenu.classList.add ('hide');
    }
}

NgChm.LNK.labelHelpOpen = function(axis, e){
	NgChm.LNK.labelHelpCloseAll();
	//Get the label item that the user clicked on (by axis) and save that value for use in NgChm.LNK.selection
    var index = e.target.dataset.index;
    NgChm.LNK.selection = '';
    if (axis === "Row") {
        NgChm.LNK.selection = NgChm.heatMap.getRowLabels().labels[index-1];
    } else if (axis === "Column") {
        NgChm.LNK.selection = NgChm.heatMap.getColLabels().labels[index-1];
    } else if (axis === "RowCovar"){
	NgChm.LNK.selection = NgChm.heatMap.getRowClassificationConfigOrder()[index];
    } else if (axis === "ColumnCovar"){
	NgChm.LNK.selection = NgChm.heatMap.getColClassificationConfigOrder()[index];
    }

	var labelMenu =  axis !== "Matrix" ? document.getElementById(axis + 'LabelMenu') : document.getElementById("MatrixMenu");
	var labelMenuTable = axis !== "Matrix" ? document.getElementById(axis + 'LabelMenuTable') : document.getElementById('MatrixMenuTable');
    var axisLabelsLength = axis !== "Matrix" ? NgChm.DET.getSearchLabelsByAxis(axis).length : {"Row":NgChm.DET.getSearchLabelsByAxis("Row").length ,"Column":  NgChm.DET.getSearchLabelsByAxis("Column").length};
    var header = labelMenu.getElementsByClassName('labelMenuHeader')[0];
    var row = header.getElementsByTagName('TR')[0];
    if (((axisLabelsLength > 0) || (NgChm.LNK.selection !== '')) && axis !== "Matrix"){
	row.innerHTML = "Selected " + axis.replace("Covar"," Classification") + "s : " + axisLabelsLength;
	labelMenuTable.getElementsByTagName("TBODY")[0].style.display = 'inherit';
	NgChm.LNK.populateLabelMenu(axis,axisLabelsLength);
    } else if (axisLabelsLength["Row"] > 0 && axisLabelsLength["Column"] > 0 && axis == "Matrix"){
	row.innerHTML = "Selected Rows: " + axisLabelsLength["Row"] + "<br>Selected Columns: " + axisLabelsLength["Column"];
	NgChm.LNK.populateLabelMenu(axis,axisLabelsLength);
    } else {
	row.innerHTML = "Please select a " + axis.replace("Covar"," Classification");
	labelMenuTable.getElementsByTagName("TBODY")[0].style.display = 'none';
    }
    
    if (labelMenu){
	labelMenu.classList.remove('hide');
	var pageX = e.changedTouches ? e.changedTouches[0].pageX : e.pageX;
	var pageY = e.changedTouches ? e.changedTouches[0].pageY : e.pageY;
	const left = pageX + labelMenu.offsetWidth > window.innerWidth ? window.innerWidth-labelMenu.offsetWidth-15 : pageX; // -15 added in for the scroll bars
	const top = pageY + labelMenu.offsetHeight > window.innerHeight ? window.innerHeight-labelMenu.offsetHeight-15 : pageY;
	labelMenu.style.left = left + 'px';
	labelMenu.style.top = top + 'px';
    }
}

//creates the divs for the label menu
NgChm.LNK.createLabelMenu = function(axis){
	var labelMenu = axis !== "Matrix" ? NgChm.UHM.getDivElement(axis + 'LabelMenu') : NgChm.UHM.getDivElement(axis + 'Menu');
	document.body.appendChild(labelMenu);
	labelMenu.style.display = 'block';
	labelMenu.style.position = 'absolute';
	labelMenu.classList.add('labelMenu');
	labelMenu.classList.add('hide');
	var topDiv = document.createElement("DIV");
	topDiv.classList.add("labelMenuCaption");
	topDiv.innerHTML = axis !== "Matrix" ? axis.replace("Covar"," Classification") + ' Label Menu:' : axis + ' Menu';
	var closeMenu = document.createElement("IMG");
	closeMenu.src = "images/closeButton.png";
	closeMenu.alt = "close menu";
	closeMenu.classList.add('labelMenuClose')
	closeMenu.addEventListener('click', function(){NgChm.LNK.labelHelpClose(axis)},false);
	var table = document.createElement("TABLE");
	table.id = axis !== "Matrix" ? axis + 'LabelMenuTable' : axis+'MenuTable';
	var tableHead = table.createTHead();
	tableHead.classList.add('labelMenuHeader');
	var row = tableHead.insertRow();
	labelMenu.appendChild(topDiv);
	labelMenu.appendChild(table);
	labelMenu.appendChild(closeMenu);
	var tableBody = table.createTBody();
	tableBody.classList.add('labelMenuBody');
	var labelHelpCloseAxis = function(){ NgChm.LNK.labelHelpClose(axis)};
    document.addEventListener('click', labelHelpCloseAxis);
    labelMenu.addEventListener("contextmenu",function(e){e.preventDefault()},true);
}

// Check to see if the item that the user clicked on is part of selected labels group
NgChm.LNK.itemInSelection = function (axis) {
	var labels = axis == "Row" ? NgChm.heatMap.getRowLabels() : axis == "Column" ? NgChm.heatMap.getColLabels() : axis == "RowCovar" ? NgChm.heatMap.getRowClassificationConfigOrder() : axis == "ColumnCovar" ? NgChm.heatMap.getColClassificationConfigOrder() : []; 
	for (var key in NgChm.SEL.searchItems[axis]){
		var selItem 
		if (axis.includes("Covar")){
			selItem = labels[key];
		} else {
			selItem = labels[key-1];
		}
		if (selItem === NgChm.LNK.selection) {
			return true;
		}
	}
	return false;
}
//Check to see if we have selections
NgChm.LNK.hasSelection = function (axis) {
	// Check to see if clicked item is part of selected labels group
	var ctr = 0;
	for (var key in NgChm.SEL.searchItems[axis]){
		ctr++;
	}
	return ctr > 0 ? true : false;
}

//adds the row linkouts and the column linkouts to the menus
NgChm.LNK.populateLabelMenu = function(axis, axisLabelsLength){
	var table = axis !== "Matrix" ? document.getElementById(axis + 'LabelMenuTable') : document.getElementById("MatrixMenuTable");
	var labelType = axis == "Row" ? NgChm.heatMap.getRowLabels()["label_type"] : 
					axis == "Column" ? NgChm.heatMap.getColLabels()["label_type"] : axis == "ColumnCovar" ? ["ColumnCovar"] : axis == "RowCovar"  ? ["RowCovar"] : ["Matrix"];
	var linkoutsKeys = Object.keys(linkouts);
	//Arrays here are used to store linkouts by type (e.g. individual OR group)
	var indLinkouts = [];
	var grpLinkouts = [];
	var itemInSelection = NgChm.LNK.itemInSelection(axis);
	for (var i = 0; i < labelType.length; i++){ // for every labeltype that the map has...
		var type = labelType[i];
		if (linkouts[type]){ // and for every linkout that the label type has, we add the linkout to the menu
			for (var j = 0; j < linkouts[type].length; j++){
				var linkout = linkouts[type][j];
				if (linkout.rowType &&  linkout.colType && type == "Matrix"){// if this is a MatrixLinkout...
					handleMatrixLinkout(axis,table, linkout,grpLinkouts);
				} else { 
					if (linkout.selectType == linkouts.SINGLE_SELECT) {
						indLinkouts.push({"linkout":linkout});
					} else {
						grpLinkouts.push({"linkout":linkout})
					}
				}
			}
		}
		// add combined labels to the linkout menu
		var combinedLinkouts = []; // list of all  combined linkouts starting with this given type
		for (var j = 0; j < linkoutsKeys.length; j++){
			if (linkoutsKeys[j].includes(type+"|")){ // if the linkout contains a 
				combinedLinkouts.push(linkoutsKeys[j]);
			}
		}
		
		for (var j = 0; j < combinedLinkouts.length; j++){
			var type=combinedLinkouts[j];
			var typelist = type.split("|");
			var add = true;
			for (var ii = 0; ii < typelist.length; ii++){
				if (!labelType.includes(typelist[ii])){
					add = false;
					continue;
				}
			}
			if (linkouts[type] && add){ // and for every linkout that the label type has, we add the linkout to the menu
				for (var j = 0; j < linkouts[type].length; j++){
                                        var linkout = linkouts[type][j];
					if (linkout.selectType == linkouts.SINGLE_SELECT) {
						indLinkouts.push({"linkout":linkout});
					} else {
						grpLinkouts.push({"linkout":linkout})
					}
				}
			}
		}
	}
	if (axis === "Matrix") {
		for (var l=0; l < grpLinkouts.length;l++ ) {
			NgChm.LNK.addMenuItemToTable(axis, table, grpLinkouts[l].linkout, true);
		}
	} else {
		//Always add clipboard link at top of list
		NgChm.LNK.addMenuItemToTable(axis, table, grpLinkouts[0].linkout, true);
		if ((indLinkouts.length > 0) && (NgChm.LNK.selection !== undefined)) {
			var addedHeader = false;
			for (var k=0; k < indLinkouts.length;k++ ) {
				addedHeader = NgChm.LNK.addMenuItemToTable(axis, table, indLinkouts[k].linkout, addedHeader);
			}
		}
		if (grpLinkouts.length > 1) {
			var addedHeader = false;
			for (var l=1; l < grpLinkouts.length;l++ ) {
				addedHeader = NgChm.LNK.addMenuItemToTable(axis, table, grpLinkouts[l].linkout, addedHeader);
			}
		}
	}
	//Add blank row so links don't overlay close button
	var body = table.getElementsByClassName('labelMenuBody')[0];
	body.insertRow();

	// Helper functions for populateLabelMenu
	function handleMatrixLinkout(axis, table, linkout,grpLinkouts){
		var rowLabelTypes = NgChm.heatMap.getRowLabels().label_type;
		var colLabelTypes = NgChm.heatMap.getColLabels().label_type;
		if (Array.isArray(linkout.rowType)){ // if there are mutliple rowTypes required
			for (var i=0;i<linkout.rowType.length;i++){
				if (rowLabelTypes.indexOf(linkout.rowType[i]) == -1){
					return;
				}
			}
		} else {
			if (rowLabelTypes.indexOf(linkout.rowType) == -1){
				return;
			}
		}
		if (Array.isArray(linkout.colType)){ // if there are mutliple colTypes required
			for (var i=0;i<linkout.colType.length;i++){
				if (colLabelTypes.indexOf(linkout.colType[i]) == -1){
					return;
				}
			}
		} else {
			if (colLabelTypes.indexOf(linkout.colType) == -1){
				return;
			}
		}
		grpLinkouts.push({"linkout": linkout});
	}
}

// Helper functions to add header comment lines to help box
NgChm.LNK.addTextRowToTable = function(table, type, axis) {
	var body = table.getElementsByClassName('labelMenuBody')[0];
	var row = body.insertRow();
	var cell = row.insertCell();
	if (type === "multi") {
		cell.innerHTML = ("<b>Linkouts for entire selection:</b>");
	} else {
		var labelVal = NgChm.LNK.selection.indexOf("|") > 0 ? NgChm.LNK.selection.substring(0,NgChm.LNK.selection.indexOf("|")) : NgChm.LNK.selection; 
		labelVal = NgChm.UTIL.getLabelText(labelVal,axis);
		cell.innerHTML = ("<b>Linkouts for: " + labelVal +"</b>");
	}
}

NgChm.LNK.addMenuItemToTable = function(axis, table, linkout,addedHeader){
	var body = table.getElementsByClassName('labelMenuBody')[0];

	var functionWithParams = function(){ // this is the function that gets called when the linkout is clicked
		var input = NgChm.LNK.getLabelsByType(axis,linkout)
		linkout.callback(input,axis); // linkout functions will have inputs that correspond to the labelType used in the addlinkout function used to make them.
	};
	//Add indentation to linkout title if the link does not contain the word "clipboard" and it is not a Matrix linkout
	var linkTitle = linkout.title.indexOf("clipboard") > 0 && axis !== "Matrix"? linkout.title : "&nbsp;&nbsp"+linkout.title;
	if (linkout.reqAttributes == null || (linkout.reqAttributes.constructor === Array && linkout.reqAttributes.length === 0)){
		if (addedHeader === false) {
			//If sub-sectional header has not been added to the popup (before single/multi links) AND a link is being added...put in the header
			if (linkout.selectType === 'multiSelection') {
				//Don't add a subsection header for multi links IF only one link has been selected
				if (NgChm.LNK.hasSelection(axis)) {
					NgChm.LNK.addTextRowToTable(table, "multi",axis);
				}
			} else {
				NgChm.LNK.addTextRowToTable(table, "ind",axis);
			}
			addedHeader = true;
		}
		if ((!NgChm.LNK.hasSelection(axis)) && (linkout.selectType === 'multiSelection') && (axis !== 'Matrix')) {
			return addedHeader;
		} else {
			var row = body.insertRow();
			var cell = row.insertCell();
			cell.innerHTML = linkTitle;
			cell.addEventListener('click', functionWithParams);
		}
	} else {
		if (typeof(linkout.reqAttributes) == 'string'){
			linkout.reqAttributes = [linkout.reqAttributes];
		}
		var add = false;
		if ( linkout.labelType == "ColumnCovar"){
			for (var i=0; i < linkout.reqAttributes.length; i++){
				for (var j in NgChm.SEL.searchItems[axis]){
					var name = NgChm.heatMap.getColClassificationConfigOrder()[j];
					if (NgChm.heatMap.getColClassificationConfig()[name].data_type == linkout.reqAttributes[i]){
						add = true;
					}
				}
				if (NgChm.heatMap.getColClassificationConfig()[NgChm.LNK.selection].data_type == linkout.reqAttributes[i]){
					add = true;
				}
			}
		} else if (linkout.labelType == "RowCovar"){
			for (var i=0; i < linkout.reqAttributes.length; i++){
				for (var j in NgChm.SEL.searchItems[axis]){
					var name = NgChm.heatMap.getRowClassificationConfigOrder()[j];
					if (NgChm.heatMap.getRowClassificationConfig()[name].data_type == linkout.reqAttributes[i]){
						add = true;
					}
				}
				if (NgChm.heatMap.getRowClassificationConfig()[NgChm.LNK.selection].data_type == linkout.reqAttributes[i]){
					add = true;
				}
			}
		} else {
			for (var i = 0; i < linkout.reqAttributes.length; i++){
				if (linkouts.getAttribute(linkout.reqAttributes[i])){
					add = true;
				}
			}
		}
		if (add){
			if (addedHeader === false) {
				if (linkout.selectType === 'multiSelection') {
					if (NgChm.LNK.hasSelection(axis)) {
						NgChm.LNK.addTextRowToTable(table, "multi",axis);
					}
				} else {
					NgChm.LNK.addTextRowToTable(table, "ind",axis);
				}
				addedHeader = true;
			}
			if ((!NgChm.LNK.hasSelection(axis)) && (linkout.selectType === 'multiSelection')) {
				return addedHeader;
			} else {
				var row = body.insertRow();
				var cell = row.insertCell();
				cell.innerHTML = linkTitle;
				cell.addEventListener('click', functionWithParams);
			}
		}
	}
	return addedHeader;
}

NgChm.LNK.selectionError = function(e){
	var message = "<br>Please select only one label in this axis to use the following linkout:<br><br><b>" + e.currentTarget.innerHTML+"</b>";
	NgChm.UHM.linkoutError(message);
}

NgChm.LNK.getDefaultLinkouts = function(){
	var colLabelType = NgChm.heatMap.getColLabels().label_type;
	var rowLabelType = NgChm.heatMap.getRowLabels().label_type;
//	NgChm.LNK.addLinkout("Copy " + (colLabelType[0].length < 20 ? colLabelType[0] : "Column Labels") +" to Clipboard", colLabelType[0], linkouts.MULTI_SELECT, NgChm.LNK.copyToClipBoard,null,0);
	NgChm.LNK.addLinkout("Copy selected labels to clipboard", colLabelType[0], linkouts.MULTI_SELECT, NgChm.LNK.copyToClipBoard,null,0); // text changed from the full label type to just "Column/Row Label" to prevent misreading of this linkout
	if (rowLabelType[0] !== colLabelType[0]){
//		NgChm.LNK.addLinkout("Copy " + (rowLabelType[0].length < 20 ? rowLabelType[0] : "Row Labels") + " to Clipboard", rowLabelType[0], linkouts.MULTI_SELECT, NgChm.LNK.copyToClipBoard,null,0);
		NgChm.LNK.addLinkout("Copy selected labels to clipboard", rowLabelType[0], linkouts.MULTI_SELECT, NgChm.LNK.copyToClipBoard,null,0);
	}

	NgChm.LNK.addLinkout("Copy bar data for all labels", "ColumnCovar", null, NgChm.LNK.copyEntireClassBarToClipBoard,null,0);
	NgChm.LNK.addLinkout("Copy bar data for selected labels", "ColumnCovar", linkouts.MULTI_SELECT,NgChm.LNK.copyPartialClassBarToClipBoard,null,1);
	NgChm.LNK.addLinkout("Copy bar data for all labels", "RowCovar", null,NgChm.LNK.copyEntireClassBarToClipBoard,null,0);
	NgChm.LNK.addLinkout("Copy bar data for selected labels", "RowCovar", linkouts.MULTI_SELECT,NgChm.LNK.copyPartialClassBarToClipBoard,null,1);
	NgChm.LNK.addLinkout("Copy selected labels to clipboard", "Matrix", linkouts.MULTI_SELECT,NgChm.LNK.copySelectionToClipboard,null,0);
	NgChm.LNK.addLinkout("Download selected matrix data to file", "Matrix", linkouts.MULTI_SELECT,NgChm.LNK.copySelectedDataToClipboard,null,0);
	NgChm.LNK.addLinkout("Set selection as detail view.", "Matrix", linkouts.MULTI_SELECT,NgChm.LNK.setDetailView,null,0);
}


//===================//
// DEFAULT FUNCTIONS //
//===================//

NgChm.LNK.copyToClipBoard = function(labels,axis){
	window.open("","",'width=335,height=330,resizable=1').document.write(labels.join(", "));
}

NgChm.LNK.copyEntireClassBarToClipBoard = function(labels,axis){
	var newWindow = window.open("","",'width=335,height=330,resizable=1');
	var newDoc = newWindow.document;
	var axisLabels = axis == "ColumnCovar" ? NgChm.heatMap.getColLabels()["labels"] : NgChm.heatMap.getRowLabels()["labels"]; 
	var classBars = axis == "ColumnCovar" ? NgChm.heatMap.getColClassificationData() : NgChm.heatMap.getRowClassificationData(); 
	newDoc.write("Sample&emsp;" + labels.join("&emsp;") + ":<br>");
	for (var i = 0; i < axisLabels.length; i++){
		newDoc.write(axisLabels[i].split("|")[0] + "&emsp;");
		for (var j = 0; j < labels.length; j++){
			newDoc.write(classBars[labels[j]].values[i] + "&emsp;");
		}
		newDoc.write("<br>");
	}
}

NgChm.LNK.copyPartialClassBarToClipBoard = function(labels,axis){
	var newWindow = window.open("","",'width=335,height=330,resizable=1');
	var newDoc = newWindow.document;
	var axisLabels = axis == "ColumnCovar" ? NgChm.DET.getSearchLabelsByAxis("Column") : NgChm.DET.getSearchLabelsByAxis("Row");
	var labelIndex = axis == "ColumnCovar" ? NgChm.DET.getSearchCols() : NgChm.DET.getSearchRows(); 
	var classBars = axis == "ColumnCovar" ? NgChm.heatMap.getColClassificationData() : NgChm.heatMap.getRowClassificationData(); 
	newDoc.write("Sample&emsp;" + labels.join("&emsp;") + ":<br>");
	for (var i = 0; i < axisLabels.length; i++){
		newDoc.write(axisLabels[i].split("|")[0] + "&emsp;");
		for (var j = 0; j < labels.length; j++){
			newDoc.write(classBars[labels[j]].values[labelIndex[i]-1] + "&emsp;");
		}
		newDoc.write("<br>");
	}
}

NgChm.LNK.copySelectionToClipboard = function(labels,axis){
	window.open("","",'width=335,height=330,resizable=1').document.write("Rows: " + labels["Row"].join(", ") + "<br><br> Columns: " + labels["Column"].join(", "));
}

NgChm.LNK.copySelectedDataToClipboard = function(matrixData,axis){
	var dataStr = "";
	for (var i = 0; i<matrixData.length;i++) {
		var rowData = matrixData[i].join('\t');
		dataStr += rowData+"\n";
	}
	var fileName = NgChm.heatMap.getMapInformation().name+" Matrix Data.tsv";
	download(fileName,dataStr);
	//window.open("","",'width=335,height=330,resizable=1').document.write(dataStr);
}

function download(filename, text) {
	var element = document.createElement('a');
	element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
	element.setAttribute('download', filename);
	element.style.display = 'none';
	document.body.appendChild(element);
	element.click();
	document.body.removeChild(element);
}


//This matrix function allows users to create a special sub-ribbon view that matches
//the currently selected box in the detail panel.  It just uses the first
//row/col selected and last row/col selected so it will work well with a drag
//selected box but not with random selections all over the map.
NgChm.LNK.setDetailView = function(labels,axis){
	var selCols = Object.keys(NgChm.SEL.searchItems["Column"])
	var selRows = Object.keys(NgChm.SEL.searchItems["Row"])
	var startCol = parseInt(selCols[0])
	var endCol = parseInt(selCols[selCols.length-1])
	var startRow = parseInt(selRows[0])
	var endRow = parseInt(selRows[selRows.length-1])

	NgChm.SUM.setSubRibbonView(startRow, endRow, startCol, endCol);
};

(function() {
	const debug = false;

	NgChm.LNK.switchPaneToLinkouts = function switchPaneToLinkouts (loc) {
		const oldLinkoutPane = NgChm.LNK.linkoutElement && NgChm.Pane.findPaneLocation (NgChm.LNK.linkoutElement);
		if (oldLinkoutPane && oldLinkoutPane.paneTitle && oldLinkoutPane.paneTitle.innerText === 'Linkouts') {
			NgChm.Pane.setPaneTitle (oldLinkoutPane, 'Empty');
		}
		NgChm.Pane.emptyPaneLocation (loc);
		NgChm.LNK.linkoutElement = NgChm.UTIL.newElement ('DIV.linkouts');
		NgChm.Pane.setPaneTitle (loc, 'Linkouts');
		loc.pane.appendChild (NgChm.LNK.linkoutElement);
	};
	NgChm.Pane.registerPaneContentOption ('Linkouts', NgChm.LNK.switchPaneToLinkouts);

	// Maintain a database of installed pane plugins.
	//
	(function() {
		const panePlugins = [];

		class PanePlugin {
			constructor({ name = '', helpText = '', params = {}, src = '' } = {}) {
				Object.assign (this, { name, helpText, params, src });
			}
		}

		NgChm.LNK.registerPanePlugin = function(p) {
			panePlugins.push (new PanePlugin (p));
		};

		NgChm.LNK.getPanePlugins = function() {
			return panePlugins;
		};
	})();

	// Data for current plugins.
	var pluginData = {};

	NgChm.LNK.setPanePluginOptions = function (element, options) {
		const loc = NgChm.Pane.findPaneLocation (element);
		const iframe = loc.pane.getElementsByTagName('IFRAME')[0];
		const nonce = iframe.dataset.nonce;
		const { plugin, params } = pluginData[nonce];
		pluginData[nonce].params = options;
		loc.paneTitle.innerText = plugin.name + '. ' + options.plotTitle;
		NgChm.LNK.initializePanePlugin (nonce, options);
	};

	(function() {
		var nextNonce = 1234543;
		NgChm.LNK.getNewNonce = function() {
			const nonce = '' + nextNonce;
			nextNonce += 3353;
			return nonce;
		};
	})();

	// Switch the empty pane identified by PaneLocation loc to the specified plugin.
	NgChm.LNK.switchPaneToPlugin = function (loc, plugin) {

		const params = plugin.params;
		if (!params) {
			const help = NgChm.UTIL.newElement('DIV.linkouts');
			help.innerText = plugin.helpText;
			loc.pane.appendChild (help);
			return;
		}

		const nonce = NgChm.LNK.getNewNonce();
		const isBlob = /^blob:/.test(plugin.src);
		const url = isBlob ? plugin.src : plugin.src + (plugin.src.indexOf('?') == -1 ? '?' : '&') + 'nonce=' + nonce;

		const linkoutElement = NgChm.UTIL.newElement ('DIV.linkouts');
		loc.paneTitle.innerText = plugin.name;
		loc.pane.appendChild (linkoutElement);

		const iframe = document.createElement('IFRAME');
		iframe.dataset.nonce = nonce;
		pluginData[nonce] = { plugin, params, iframe };

		iframe.setAttribute('title', plugin.name);
		if (isBlob) {
			iframe.onload = function() {
				iframe.contentWindow.postMessage({ vanodi: { nonce, op: 'nonce' }}, '*');
			};
		}
		iframe.setAttribute('src', url);
		linkoutElement.appendChild(iframe);
	};

	// Start bunch of private helper functions for collecting/packaging data to send to plugin

	/* For a discrete covariate, return array of hex colors for each value
	   Inputs:
	      axis: 'row' or 'column'
	      label: name of covariate bar
	      values: array of values for covariate bar
	   Outputs:
	      valColors: array of hex color values corresponding to input 'values'
	*/
	function getDiscCovariateColors (axis, label, values, colorMapMgr) {
		const colorMap = colorMapMgr.getColorMap (axis, label);
		const uniqueClassValues = Array.from(new Set(NgChm.heatMap.getAxisCovariateData(axis)[label].values))
		const classColors = [];
		for (let i=0; i<uniqueClassValues.length; i++) {
			classColors.push({
				"Class": uniqueClassValues[i],
				"Color": NgChm.CMM.darkenHexColorIfNeeded(colorMap.getRgbToHex(colorMap.getClassificationColor(uniqueClassValues[i])))
			});
		}
		// for each of the values input, get the corresponding class color to return
		var valColors = []  // array of colors for each value
		var tmpColor
		values.forEach( val => {
			tmpColor = classColors.filter(cc => {
				return cc.Class == val;
			})
			if (tmpColor.length != 1) { console.error('Error getting color for discrete covariate'); tmpColor = [{Color: '#000000'}]}
			valColors.push(tmpColor[0].Color)
		})
		return valColors;
	}

	/* Return object of class values (list of values)  and corresponding hex colors (list of hex colors)
	 Input:
	     cfg:
	     vals: array of values
	 Output:
	   {
	     values: array of class values (the 'Class' corresponding to each of 'vals')
	     colors: array of corresponding hex colors (the 'Color' for the 'Class' of each of the 'vals')
	   }
	*/
	function getContCovariateColors (cfg, vals) {
		const { breaks, classColors } = getDiscMapFromContMap (cfg.color_map.thresholds, cfg.color_map.colors);
		// get list of Class values for each of vals:
		const valClasses = getValueClassesColors (vals, breaks, classColors, cfg.color_map.missing,'Class');
		// get list of corresponding hex colors for each of vals:
		const valColors = getValueClassesColors (vals, breaks, classColors, cfg.color_map.missing,'Color');
		return { values: valClasses, colors: valColors };
	}

	// Return an array of values for the rows/columns specified by idx along axis.
	function getDataValues (axis, idx) {
		const isRow = NgChm.MMGR.isRow (axis);
		const colorMap = NgChm.heatMap.getColorMapManager().getColorMap("data", NgChm.SEL.currentDl);
		const colorThresholds = colorMap.getThresholds();
		idx = idx === undefined ? [] : Array.isArray(idx) ? idx : [idx];
		const win = {
			layer: NgChm.SEL.currentDl,
			level: NgChm.MMGR.DETAIL_LEVEL,
			firstRow: 1,
			firstCol: 1,
			numRows: isRow ? 1 : NgChm.heatMap.getNumRows(NgChm.MMGR.DETAIL_LEVEL),
			numCols: isRow ? NgChm.heatMap.getNumColumns(NgChm.MMGR.DETAIL_LEVEL) : 1
		};
		const values = [];
		const rawValues = [];
		const rawCounts = [];
		for (let j= 0; j < win.numRows; j++) {
			for (let i=0;  i< win.numCols; i++) {
				rawValues.push(0.0);
				rawCounts.push(0);
			}
		}
		for (let dd = 0; dd < idx.length; dd++) {
			if (isRow) win.firstRow = idx[dd]; else win.firstCol = idx[dd];
			const awin = NgChm.heatMap.getAccessWindow(win);
			for (let j= 0; j < win.numRows; j++) {
				for (let i=0;  i< win.numCols; i++) {
					const val = awin.getValue (j + win.firstRow, i + win.firstCol);
					if (!isNaN(val) && val > NgChm.SUM.minValues && val < NgChm.SUM.maxValues) {
						rawValues[j*win.numCols+i] += val;
						rawCounts[j*win.numCols+i] ++;
					}
				}
			}
		}
		for (let i = 0; i < rawValues.length; i++) {
			values.push (rawCounts[i] === 0 ? NaN : rawValues[i] / rawCounts[i]);
		}
		return values;
	} // end function getDataValues

	/*  Function to return mean, variance, and number of items in a group of rows/columns

	    Returns mean, variance, and number of items for each
	    Inputs:
	        axis: 'column' or 'row'.
	        idx: list of indexes in column or row with data of interest
	    Exmple:  axis = 'column' and idx = ['1', '2', '3'] means we are looking at
	             the data in the first, second, and third columns of the heatmap.
	    Output:
	        summaryStatistics: a list of objects, each object having a mean, variance,
	             and number of items.
	    Example: if the input is axis = 'column' and idx = ['1', '2', '3'], this means we
	             are looking at the first, second, and third columns in the heatmap. The output
	             will be a list of objects, one entry for each ROW in the heatmap. Each object
	             will have the mean, variance, and number of entries (there might be missing data)
	             for a row in the heatmap of the first three columns.
	*/
	function getSummaryStatistics(axis, idx)  {
		const isRow = NgChm.MMGR.isRow (axis);
		idx = idx === undefined ? [] : Array.isArray(idx) ? idx : [idx];
		const win = {
			layer: NgChm.SEL.currentDl,
			level: NgChm.MMGR.DETAIL_LEVEL,
			firstRow: 1,
			firstCol: 1,
			numRows: isRow ? idx.length : NgChm.heatMap.getNumRows(NgChm.MMGR.DETAIL_LEVEL),
			numCols: isRow ? NgChm.heatMap.getNumColumns(NgChm.MMGR.DETAIL_LEVEL) : idx.length
		};
		const values = [];
		const accessWindow = NgChm.heatMap.getAccessWindow(win)
		// Iterate over access window to get values from heatmap
		for (let i=0; i<win.numRows; i++) {
			const thisRow = []
			for (let j=0; j<win.numCols; j++) {
				const val = accessWindow.getValue(i+win.firstRow, j+win.firstCol);
				thisRow.push(val)
			}
			var statsForRow = getStats(thisRow)
			values.push(statsForRow)
		}
		return values;
	} // end function getSummaryStatistics

	function getDiscMapFromContMap (colorThresholds, colorVec) {
		colorVec = colorVec.map(NgChm.CMM.darkenHexColorIfNeeded);
		const precision = colorThresholds
			// Determine length of each threshold, excluding any minus sign, leading zero, period, or exponent.
			.map(t => (''+t).replace('-','').replace(/^0*/,'').replace('.','').replace(/[eE]\d*/,'').length)
			// Get longest length and increase by 1.
			.reduce((m,l) => l > m ? l : m, 0) + 1;
		const iColorVec = [colorVec[0]];
		const iColorThresholds = [+colorThresholds[0]];
		for (let i = 1; i < colorVec.length; i++) {
			iColorVec.push (NgChm.CMM.blendHexColors (colorVec[i-1], colorVec[i], 0.75));
			iColorThresholds.push ((3*colorThresholds[i-1] + +colorThresholds[i]) / 4.0);
			iColorVec.push (NgChm.CMM.blendHexColors (colorVec[i-1], colorVec[i], 0.5));
			iColorThresholds.push ((+colorThresholds[i-1] + +colorThresholds[i]) / 2.0);
			iColorVec.push (NgChm.CMM.blendHexColors (colorVec[i-1], colorVec[i], 0.25));
			iColorThresholds.push ((+colorThresholds[i-1] + 3*colorThresholds[i]) / 4.0);
			iColorVec.push (colorVec[i]);
			iColorThresholds.push (+colorThresholds[i]);
		}
		const classColors = [];
		const breaks = [];
		for (let i=0; i < iColorVec.length; i++) {
			classColors.push({
				"Class": iColorThresholds[i].toPrecision(precision),
				"Color": iColorVec[i]
			});
			if (i > 0) {
				breaks.push ((iColorThresholds[i-1] + iColorThresholds[i])/2.0);
			}
		}
		return { breaks, classColors };
	} // end function getDiscMapFromContMap

	/* Map the continuous values into discrete classColors according to breaks.
	 If values contains at least one NA, "NA" is added to classColors.
	 Returns either Class value or Color value based on 'wantClassOrColor'
	    Inputs:
	       values: array of values
	       breaks: array of breakpoints from heatmap
	       classColors:
	       naColor:
	       wantClassOrColor: string. Either 'Class' or 'Color.
	    Outputs:
	       array of classes or hex color values. One for each of input 'values'
	*/
	function getValueClassesColors (values, breaks, classColors, naColor, wantClassOrColor) {
		if (wantClassOrColor != 'Class' && wantClassOrColor != 'Color') {console.error("must request 'Class' or 'Color'"); return}
		let firstNaN = true;
		return values.map (val => {
			let k = -1;
			if (isNaN (val)) {
				if (firstNaN) {
					classColors.push({
						"Class": "NA",
						"Color": naColor
					});
					firstNaN = false;
				}
				return 'NA';
			} else if (val <= breaks[0]) {
				k = 0;
			} else if (breaks[breaks.length-1] <= val){
				k = breaks.length;
			} else {
				k = 1;
				while (val >= breaks[k]) k++;
			}
			if (wantClassOrColor == 'Class') {
				return classColors[k].Class;
			} else {
				return classColors[k].Color;
			}
		});
	}

	function getDataColors (axis, idx) {
		const colorMap = NgChm.heatMap.getColorMapManager().getColorMap("data", NgChm.SEL.currentDl);
		const { breaks, classColors } = getDiscMapFromContMap (colorMap.getThresholds(), colorMap.getColors());
		const values = getDataValues (axis, idx);
		const valClasses = getValueClassesColors (values, breaks, classColors, colorMap.getMissingColor(),'Class');
		return { values: valClasses, colors: classColors };
	}
	// end bunch of helper functions

	NgChm.LNK.maryWasHere = function(one,two) {
		console.log('testing function')
		return one
	}
	NgChm.LNK.initializePanePlugin = function(nonce, config) {
		var colorMapMgr = NgChm.heatMap.getColorMapManager();
		var covariateBarOrder = NgChm.heatMap.getAxisCovariateOrder(config.axes[0].axisName) //<-- array of axis covariate labels
		var colClassificationData = NgChm.heatMap.getAxisCovariateData('column');
		var rowClassificationData = NgChm.heatMap.getAxisCovariateData('row');
		var heatMap = NgChm.heatMap;
		const data = {
			axes: []
		};
		for (let ai = 0; ai < config.axes.length; ai++) {
			const axis = config.axes[ai];
			const isRow = NgChm.MMGR.isRow (axis.axisName);
			const covData = isRow ? rowClassificationData : colClassificationData;
			data.axes.push({
				fullLabels: NgChm.heatMap.getAxisLabels(axis.axisName).labels,
				actualLabels: NgChm.UTIL.getActualLabels(axis.axisName),
				tvalues: [],
				pvalues: [],
				coordinates: [],
				covariates: [],
				covariateColors: [],
				coordinateColors: []
			});
			const axisCovCfg = NgChm.heatMap.getAxisCovariateConfig (axis.axisName);
			var allSummaries = []
			var nResultsToReturn = 0;
			if (axis.data != null) {
				for (let ci = 0; ci < axis.data.length; ci++) {
					const ctype = axis.data[ci].type // one of 'covariate' (i.e. from covariate bar) or 'data' (i.e. from map values)
					const idx = axis.data[ci].labelIdx // list of ids in collection
					if (ctype != 'data') {console.error('This has not been implemented yet.')}
					var summaryStatistics = getSummaryStatistics(axis.axisName === 'row' ? 'column' : 'row', idx);
					allSummaries.push(summaryStatistics)
				}
			}
			if (allSummaries.length > 0) nResultsToReturn = allSummaries[0].length;
			for (let i=0; i<nResultsToReturn; i++) {
				var summary1 = allSummaries[0][i]
				var summary2 = allSummaries[1][i]
				var tvalue = Welch_tValue(summary1, summary2)
				var dof = degreesOfFreedom(summary1, summary2)
				var pvalue = pValue(tvalue, dof)
				data.axes[ai].tvalues.push(tvalue)
				data.axes[ai].pvalues.push(pvalue)
			}
		}
		const src = pluginData[nonce].source || pluginData[nonce].iframe.contentWindow;
		src.postMessage({ vanodi: { nonce, op: 'plot', config, data }}, '*');
	}; // end of initializePanePlugin

	// Create a gear dialog for the pane identified by the DOM element icon.
	NgChm.LNK.newGearDialog = newGearDialog;
	function newGearDialog (icon) {
		const loc = NgChm.Pane.findPaneLocation (icon);
		if (!loc || !loc.pane || loc.pane.getElementsByTagName('IFRAME').length == 0) {
			alert ('No options');
			return;
		}

		const iframe = loc.pane.getElementsByTagName('IFRAME')[0];
		const nonce = iframe.dataset.nonce;
		const { plugin, params } = pluginData[nonce];
		if (debug) console.log ({ m: 'newGearDialog', loc, plugin, params });

		const config = plugin.config;
		const panel = NgChm.UTIL.newElement('DIV.gearPanel');

		function optionNode (type, value) {
			const optNode = NgChm.UTIL.newElement('OPTION');
			optNode.appendChild(NgChm.UTIL.newTxt(value));
			optNode.dataset.type = type;
			return optNode;
		}

		function selectedElementsOptionName (axis, uname) {
			return 'Selected ' + (NgChm.MMGR.isRow(axis) ? 'columns' : 'rows') + uname;
		}

		function addCovariateOptions (defaultOpt, axisConfig, selectElement, selectedElementsOption) {
			let defaultIndex = 0;
			for (let cv in axisConfig) {
				if (cv === defaultOpt) defaultIndex = selectElement.children.length;
				selectElement.add (optionNode ('covariate', cv));
			}
			if (defaultOpt === null) defaultIndex = selectElement.children.length;
			const selOpt = optionNode ('data', selectedElementsOption);
			if (defaultOpt === selectedElementsOption) defaultIndex = selectElement.children.length;
			selectElement.add (selOpt);
			selectElement.selectedIndex = defaultIndex;
			return selOpt;
		}

		const optionsBox = NgChm.UTIL.newElement('DIV.optionsBox');
		panel.appendChild (optionsBox);

		function textN (base, id, len) {
			return base + (len === 1 ? '' : (' ' + id));
		}

		const axesOptions = [];
		for (let axisId = 0; axisId < config.axes.length; axisId++) {
			//const axis1 = NgChm.UTIL.newElement('DIV');
			//optionsBox.appendChild (axis1);
			const axis1Label = NgChm.UTIL.newElement('SPAN.leftLabel');
			axis1Label.appendChild(NgChm.UTIL.newTxt (textN('Heat map axis', axisId+1, config.axes.length)));
			optionsBox.appendChild (axis1Label);
			const axis1Select = NgChm.UTIL.newElement('SELECT');
			optionsBox.appendChild (axis1Select);
			axis1Select.add (optionNode ('axis', 'column'));
			axis1Select.add (optionNode ('axis', 'row'));

			const axis1coordinates = [];
			const axis1covariates = [];

			// Variables that depend on the current axis.
			let thisAxis;
			let axis1Config;
			let otherAxis;
			let defaultCoord;
			let defaultCovar;

			function setAxis (axis) {
				thisAxis = axis;
				if (debug) console.log ({ m: 'setAxis', axis, params });
				axis1Config = NgChm.heatMap.getAxisCovariateConfig (axis);
				otherAxis = NgChm.MMGR.isRow (axis) ? 'Column' : 'Row';
				defaultCoord = Object.keys(axis1Config).filter(x => /\.coordinate\.1/.test(x));
				defaultCoord = defaultCoord.length === 0 ? null : defaultCoord[0].replace(/1$/, '');
				defaultCovar = Object.keys(axis1Config).filter(x => !/\.coordinate\.\d+$/.test(x));
				defaultCovar = defaultCovar.length === 0 ? null : defaultCovar[defaultCovar.length-1];
			}

			const axisParams = params.axes && params.axes.length > axisId ? params.axes[axisId] : {};
			const selectedAxis = axisParams.axisName === 'row' ? 'row' : 'column';
			if (selectedAxis === 'row') axis1Select.selectedIndex = 1;
			setAxis (selectedAxis);

			function createLinearSelectors (sss, numSelectors, selectorName, params) {

			params = params || [];
			for (let cid = 0; cid < numSelectors; cid++) {
				const selParams = cid < params.length ? params[cid] : {};
				const selectEl = NgChm.UTIL.newElement('SELECT');
				optionsBox.appendChild (
					NgChm.UTIL.newElement('SPAN.leftLabel', {}, [
						NgChm.UTIL.newTxt(textN(NgChm.UTIL.capitalize(selectorName), cid+1, numSelectors))
					])
				);
				optionsBox.appendChild (
					selectEl
				);
				sss.push ({ select: selectEl, data: [] });

				const uname = textN (' for ' + selectorName, cid+1, numSelectors);
				const selectedElementsOption = selectedElementsOptionName (thisAxis, uname);
				let defaultOpt;
				if (selParams.type === 'data') {
					defaultOpt = selectedElementsOption;
				} else if (selParams.type === 'covariate' && selParams.covName) {
					defaultOpt = selParams.covName;
				} else if (selectorName === 'coordinate') {
					defaultOpt = defaultCoord ? defaultCoord + (cid+1) : null;
				} else {
					defaultOpt = defaultCovar;
				}
				sss[cid].selOpt = addCovariateOptions (defaultOpt, axis1Config, selectEl, selectedElementsOption);

				const userLabelEl = NgChm.UTIL.newElement ('DIV.userLabel', {}, [
					NgChm.UTIL.newElement('SPAN.leftLabel', {}, [ NgChm.UTIL.newTxt ('Label') ]),
					NgChm.UTIL.newElement('INPUT')
				]);
				userLabelEl.children[1].type = 'text';
				if (selParams.label) userLabelEl.children[1].value = selParams.label;
				optionsBox.appendChild (userLabelEl);
				sss[cid].userLabelEl = userLabelEl;

				const countNode = NgChm.UTIL.newTxt ('0 ' + otherAxis + 's');
				const infoEl = NgChm.UTIL.newElement ('DIV.nodeSelector.hide', {}, [
					NgChm.UTIL.newElement('SPAN.leftLabel', {}, [
						NgChm.UTIL.newTxt ('Selected')
					]),
					countNode,
					NgChm.UTIL.newElement('SPAN.button', {}, [NgChm.UTIL.newTxt('GRAB')]),
					NgChm.UTIL.newElement('SPAN.button', {}, [NgChm.UTIL.newTxt('SHOW')])
				]);
				sss[cid].clearData = function() {
					while (sss[cid].data.length > 0) sss[cid].data.pop();
				};
				if (selParams.type === 'data' && selParams.labelIdx) {
					for (let ii = 0; ii < selParams.labelIdx.length; ii++) {
						sss[cid].data.push (selParams.labelIdx[ii]);
					}
				}
				sss[cid].setSummary = function(label) {
					const data = sss[cid].data;
					countNode.textContent = '' + data.length + ' ' + otherAxis + 's';
					const idx = sss[cid].select.selectedIndex;
					const item = sss[cid].select.children[idx];
					if (debug) console.log ({ m: 'selector setSummary', cid, idx, item, isDataOpt: item === sss[cid].selOpt });
					if (item === sss[cid].selOpt) {
						infoEl.classList.remove ('hide');
						if (label) {
							userLabelEl.children[1].value = label;
						} else if (data.length === 0) {
							if (selectorName === 'coordinate') {
								userLabelEl.children[1].value = 'Undefined';
							} else {
								userLabelEl.children[1].value = '';
							}
						} else if (data.length === 1) {
							userLabelEl.children[1].value = NgChm.heatMap.getAxisLabels(otherAxis).labels[data[0]-1];
						} else {
							userLabelEl.children[1].value = 'Average of ' + countNode.textContent;
						}
					} else {
						infoEl.classList.add ('hide');
						if (label) {
							userLabelEl.children[1].value = label;
						} else {
							userLabelEl.children[1].value = item.value.replace(/\.coordinate\./, ' ');
						}
					}
				};
				sss[cid].setSummary (selParams.label);

				infoEl.children[1].onclick = function (e) {
					if (debug) console.log ('GRAB');
					sss[cid].clearData();
					let count = 0;
					for (let i in NgChm.SEL.searchItems[otherAxis]) {
						if (debug) console.log ({ m: 'Grabbed', i });
						sss[cid].data.push (i);
						count++;
					}
					sss[cid].setSummary();
				};
				infoEl.children[2].onclick = function (e) {
					if (debug) console.log ('SHOW');
					for (let i in NgChm.SEL.searchItems[otherAxis]) {
						delete NgChm.SEL.searchItems[otherAxis][i];
					}
					for (let i = 0; i < sss[cid].data.length; i++) {
						NgChm.SEL.searchItems[otherAxis][sss[cid].data[i]] = 1;
					}
					NgChm.UTIL.redrawSearchResults ();
				};
				optionsBox.appendChild (infoEl);
				selectEl.onchange = function (e) {
					sss[cid].setSummary();
				};
			}
			}
			createLinearSelectors (axis1coordinates, config.axes[axisId].maxCoordinates, 'coordinate', axisParams.coordinates);
			createLinearSelectors (axis1covariates, config.axes[axisId].maxCovariates, 'covariate', axisParams.covariates);
			axesOptions.push ({ select: axis1Select, coordinates: axis1coordinates, covariates: axis1covariates });
			axis1Select.onchange = function(e) {
				setAxis (e.srcElement.value);
				if (debug) console.log ('Selected axis changed to ' + thisAxis);
				for (let cid = 0; cid < config.axes[axisId].maxCoordinates; cid++) {
					const s = axis1coordinates[cid].select;
					while (s.firstChild) s.removeChild(s.firstChild);
					const defaultOpt = defaultCoord ? defaultCoord + (cid+1) : null;
					const uname = textN (' for coordinate', cid+1, config.axes[axisId].maxCoordinates);
					const selectedElementsOption = selectedElementsOptionName (thisAxis, uname);
					axis1coordinates[cid].selOpt = addCovariateOptions (defaultOpt, axis1Config, s, selectedElementsOption);
					axis1coordinates[cid].clearData();
					axis1coordinates[cid].setSummary();
					s.onchange(null);
				}
				for (let cid = 0; cid < config.axes[axisId].maxCovariates; cid++) {
					const s = axis1covariates[cid].select;
					while (s.firstChild) s.removeChild(s.firstChild);
					const uname = textN (' for covariate', cid+1, config.axes[axisId].maxCovariates);
					const selectedElementsOption = selectedElementsOptionName (thisAxis, uname);
					axis1covariates[cid].selOpt = addCovariateOptions (defaultCovar, axis1Config, s, selectedElementsOption);
					axis1covariates[cid].clearData();
					axis1covariates[cid].setSummary();
					s.onchange(null);
				}
			};
		}

		const pluginOptions = genPluginOptions (config.options, 0, params.options);
		optionsBox.appendChild (pluginOptions);

		function genPluginOptions (opts, level, params) {
			level = level || 0;
			const box = NgChm.UTIL.newElement('DIV.grouper');
			for (let oi = 0; oi < opts.length; oi++) {
				const opt = NgChm.UTIL.newElement('DIV.grouper', {}, [
					NgChm.UTIL.newElement ('SPAN.leftLabel', {}, [NgChm.UTIL.newTxt(opts[oi].label)])
				]);
				const optParam = params && params.hasOwnProperty(opts[oi].label) ? params[opts[oi].label] : null;
				if (debug) console.log ({ m: 'genOption', label: opts[oi].label, optParam });
				if (level > 0) {
					opt.children[0].style.marginLeft = (level * 1.25) + 'em';
				}
				if (opts[oi].type === 'checkbox') {
					const input = NgChm.UTIL.newElement('INPUT');
					input.type = opts[oi].type;
					input.checked = optParam !== null ? optParam : opts[oi].default;
					opt.append (input);
				} else if (opts[oi].type === 'dropdown') {
					const input = NgChm.UTIL.newElement('SELECT');
					const entries = Object.entries(opts[oi].choices);
					let selectedIndex = 0;
					let idx = 0;
					for (const [label,value] of entries) {
						const choice = NgChm.UTIL.newElement('OPTION');
						choice.value = value;
						if (value === optParam) selectedIndex = idx;
						choice.innerHTML = label;
						input.append(choice);
						idx++;
					}
					input.selectedIndex = selectedIndex;
					opt.append(input);
				} else if (opts[oi].type === 'group') {
					opt.append (genPluginOptions (opts[oi].options, level+1, optParam));
				} else {
					console.error ('Unknown option type ' + opts[oi].type);
				}
				box.append (opt);
			}
			return box;
		}

		function getPluginOptionValues (opts, element) {
			const values = {};
			for (let oi = 0; oi < opts.length; oi++) {
				const o = opts[oi];
				const e = element.children[oi].children[1];
				if (o.type === 'checkbox') {
					values[o.label] = e.checked;
				} else if (o.type === 'dropdown') {
					values[o.label] = e.value;
				} else if (o.type === 'group') {
					values[o.label] = getPluginOptionValues (o.options, e);
				} else {
					console.error ('Unknown option type ' + o.type);
				}
			}
			return values;
		}

		function selectToCoordinate (coord) {
			const label = coord.userLabelEl.children[1].value; //.select.value.replace(/\.coordinate\./, ' ');
			const choice = coord.select.children[coord.select.selectedIndex];
			const type = choice.dataset.type;
			if (type === 'data') {
				return ({ type, label, labelIdx: coord.data });
			} else {
				return ({ type, label, covName: coord.select.value });
			}
		}

		function axesElementsToOps (aEls) {
			return {
				axisName: aEls.select.value,
				coordinates: aEls.coordinates.map(axisC => selectToCoordinate (axisC)),
				covariates: aEls.covariates.map(axisC => selectToCoordinate (axisC))
			};
		}

		function applyPanel() {
			let plotTitle = 'Special';
			if (axesOptions.length === 1) {
				plotTitle = NgChm.UTIL.capitalize (axesOptions[0].select.value) + 's';
				if (axesOptions[0].covariates.length === 1) {
					const groupName = axesOptions[0].covariates[0].userLabelEl.children[1].value;
					if (groupName !== '') {
						plotTitle = plotTitle + ': ' + groupName;
					}
				} else {
					plotTitle = plotTitle + ': special';
				}
			}
			const plotParams = {
				plotTitle,
				axes: axesOptions.map(ao => axesElementsToOps (ao)),
				options: getPluginOptionValues (config.options, pluginOptions)
			};
			NgChm.LNK.setPanePluginOptions (icon, plotParams);
		}

		function resetPanel() {
		}

		function closePanel() {
			NgChm.Pane.removePopupNearIcon (panel, icon);
		}

		const buttonBox = NgChm.UTIL.newElement('DIV.buttonBox', {}, NgChm.UTIL.newElement('SPAN.fill'));
		panel.appendChild (buttonBox);

		const applyBtn = NgChm.UTIL.newElement('SPAN.button');
		applyBtn.onclick = applyPanel;
		applyBtn.appendChild(NgChm.UTIL.newTxt('APPLY'));
		buttonBox.appendChild (applyBtn);

		const resetBtn = NgChm.UTIL.newElement('SPAN.button');
		resetBtn.onclick = resetPanel;
		resetBtn.appendChild(NgChm.UTIL.newTxt('RESET'));
		buttonBox.appendChild (resetBtn);

		const closeBtn = NgChm.UTIL.newElement('SPAN.button');
		closeBtn.onclick = closePanel;
		closeBtn.appendChild(NgChm.UTIL.newTxt('CLOSE'));
		buttonBox.appendChild (closeBtn);

		NgChm.Pane.insertPopupNearIcon (panel, icon);
	}

	function processVanodiMessage (nonce, loc, msg) {
		// process message from plot plugin
		if (msg.op === 'register') vanodiRegister (nonce, loc, msg);
		if (msg.op === 'selectLabels') vanodiSelectLabels (nonce, loc, msg);
		if (msg.op === 'mouseover') vanodiMouseover (nonce, loc, msg);
	}

	function vanodiRegister (nonce, loc, msg) {
		console.log ({ 'Vanodi register': msg, loc:loc });
		const { plugin, params, iframe, source } = pluginData[nonce];
		plugin.config = { name: msg.name, axes: msg.axes, options: msg.options };
		if (Object.entries(params).length === 0) {
			(source||iframe.contentWindow).postMessage({ vanodi: { nonce, op: 'none' }}, '*');  // Let plugin know we heard it.
			NgChm.Pane.switchToPlugin (loc, plugin.name);
		} else {
			alert ('Params has length > 0');
			loc.paneTitle.innerText = plugin.name;
			NgChm.LNK.initializePanePlugin (nonce, params);
		}
	}

	/*
		Initial function to send message to linkouts.
		TODO: make this work with specific registered linkouts
	*/
	NgChm.LNK.postSelectionToLinkouts = function(axis, clickType, lastClickIndex, srcNonce) {
		const allLabels = NgChm.heatMap.getAxisLabels(axis).labels;
		const searchItems = NgChm.MMGR.isRow(axis) ? NgChm.DET.getSearchRows() : NgChm.DET.getSearchCols();
		const pointLabelNames = [];
		for (let i=0; i<searchItems.length; i++) {
			const pointId = allLabels[searchItems[i] - 1];
			pointLabelNames.push(pointId);
		}
		const iframes = document.getElementsByTagName('iframe');
		const lastClickText = lastClickIndex > 0 ? allLabels[lastClickIndex] : '';
		for (let i = 0; i < iframes.length; i++) {
			const nonce = iframes[i].dataset.nonce;
			if (srcNonce === nonce) {
				continue;
			}
			const src = pluginData[nonce].source || iframes[i].contentWindow;
			src.postMessage({vanodi: {
				nonce,
				op: 'makeHiLite',
				data: { axis, pointIds:pointLabelNames, clickType, lastClickText }
			}}, '*');
		}
	};

	/*
		Process message from scatter plot to highlight points selected on the plot
	*/
	function vanodiSelectLabels(nonce, loc, msg) {
		const axis = NgChm.MMGR.isRow(msg.selection.axis) ? 'Row' : 'Column';
		const allLabels = NgChm.heatMap.getAxisLabels(axis).labels;

	/*
		var setSelected = new Set(msg.selection.pointIds); // make set for faster access below
		NgChm.DET.clearSearchItems(axis);
		var indexes = []
		for (var i=0; i<allLabels.length; i++) { // loop over all labels
			if (setSelected.has(allLabels[i])) {  // if set of selected points has label, add index to array of indexes
				indexes.push(i+1);
			}
		}
		for (var i=0; i<indexes.length; i++) { // add those indexes to the search items
			NgChm.SEL.searchItems[axis][indexes[i]] = 1;
			NgChm.DET.labelLastClicked[axis] = indexes[i]
		}
		NgChm.DET.updateDisplayedLabels();
		NgChm.SUM.redrawSelectionMarks();
		NgChm.SEL.updateSelection();
		NgChm.DET.showSearchResults();
	*/
		const pointIds = msg.selection.pointIds
		const clickType = msg.selection.clickType || 'standardClick';
		const lastClickIndex = msg.selection.lastClickText ? allLabels.indexOf (msg.selection.lastClickText) : -1;
		//console.log ({ m: 'vanodiSelectLabels', axis, pointIds, msg });
		NgChm.UTIL.setSearchItems (axis, pointIds, clickType, lastClickIndex, nonce);

		// I don't thing we need this here...maybe it was for something else? Or something no-longer used? Not sure so leaving it for now.
		//NgChm.LNK.postSelectionToLinkouts (axis, clickType, lastClickIndex, nonce);
	}

	/*
		Process message from scatter plot to highlight single point under mouse on plot
	*/
	function vanodiMouseover(nonce, loc, msg) {
		const axis = NgChm.MMGR.isRow(msg.selection.axis) ? 'Row' : 'Column';
		const allLabels = NgChm.UTIL.getActualLabels(axis);
		const pointId = msg.selection.pointId
		const ptIdx = allLabels.indexOf(pointId) + 1;
		NgChm.SEL.searchItems[axis][ptIdx] = 1;
		NgChm.DET.labelLastClicked[axis] = ptIdx;
		NgChm.DET.updateDisplayedLabels();
		NgChm.SEL.updateSelection();
		NgChm.DET.showSearchResults();
		NgChm.SUM.redrawSelectionMarks();
	}

	var vanodiRegisterMsg

	// Listen for messages from plugins.
	(function() {
		window.addEventListener('message', processMessage, false)
		function processMessage(e) {
			if (e.data.hasOwnProperty('vanodi')) {
				const vanodi = e.data.vanodi;
				if (!vanodi.hasOwnProperty('nonce')) {
					console.warn ('Vanodi message received with no nonce: op==' + vanodi.op);
					return;
				}
				if (vanodi.nonce == 'prompt' && vanodi.op == 'register') {
					let p = 0;
					const k = Object.keys(pluginData);
					while (p < k.length && pluginData[k[p]].plugin.name !== vanodi.name) p++;
					if (p === k.length) {
						console.warn ('Vanodi registration message received for unknown plugin: name==' + vanodi.name);
						return;
					}
					if (confirm ("Grant access to plugin " + vanodi.name + "?")) {
						//linkouts.addPanePlugin (e.data.plugin, e.source);
						vanodiRegisterMsg = e;
						pluginData[k[p]].source = e.source;
						e.source.postMessage({ vanodi: { op: 'changeNonce', nonce: vanodi.actualNonce, newNonce: k[p] }}, '*');
						vanodi.nonce = k[p];
					}
				}
				const iframe = pluginData[vanodi.nonce].iframe;
				const loc = NgChm.Pane.findPaneLocation (iframe);
				if (loc && loc.pane) processVanodiMessage (vanodi.nonce, loc, vanodi);
			}
		}
	})();

})(); // end of big IIFE
