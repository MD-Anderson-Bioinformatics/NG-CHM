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
}

// returns a 'unique' identifier for the current source object.
linkouts.getSourceObjectUniqueId = function() {
	return NgChm.UTIL.getURLParameter("map");
}

//adds axis linkout objects to the linkouts global variable
linkouts.addLinkout = function(name, labelType, selectType, callback, reqAttributes, index){
	NgChm.LNK.addLinkout(name, labelType, selectType, callback, reqAttributes, index);
}

//adds matrix linkout objects to the linkouts global variable
linkouts.addMatrixLinkout = function (name, rowType, colType, selectType, callback, reqAttributes, index) {
	NgChm.LNK.addMatrixLinkout (name, rowType, colType, selectType, callback, reqAttributes, index);
}

// Linkout to the specified url in a suitable 'window'.
// name identifies the linkout group (subsequent linkouts in the same group should display in the same window).
// options fine tunes the window display.
linkouts.openUrl = function (url, name, options) {
        window.open (url, name, options);
};

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
		for (var i = 0; i < indexes.length; i++){
			searchLabel += label.split("|")[indexes[i]] + "|";
		}
		searchLabel = searchLabel.slice(0,-1); // remove the last character (the extra "|")
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
}
