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

//adds linkout objects to the linkouts global variable
linkouts.addLinkout = function(name, labelType, selectType, callback, reqAttributes, index){
	NgChm.LNK.addLinkout(name, labelType, selectType, callback, reqAttributes, index);
}

/*******************************************
 * END EXTERNAL INTERFACE
 *******************************************/

//Define Namespace for NgChm Linkout
NgChm.createNS('NgChm.LNK');

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
	if (!linkouts[labelType]){
		linkouts[labelType] = [new NgChm.LNK.linkout(name, labelType, selectType,reqAttributes, callback)];
	} else {
		if (index !== undefined){
			linkouts[labelType].splice(index, 0, new NgChm.LNK.linkout(name,labelType, selectType, reqAttributes, callback)); 
		}else {
			linkouts[labelType].push(new NgChm.LNK.linkout(name,labelType,selectType, reqAttributes, callback));
		}
	}
}


NgChm.LNK.addMatrixLinkout = function(name, rowType, colType, selectType, callback, reqAttributes, index){ // this function is used to add linkouts to the matrix menu when the linkout needs a specific criteria for the row and column (ie: same attribute)
	if (!linkouts["Matrix"]){
		linkouts["Matrix"] = [new NgChm.LNK.matrixLinkout(name, rowType, colType, selectType,reqAttributes, callback)];
	} else {
		if (index !== undefined){
			linkouts["Matrix"].splice(index, 0, new NgChm.LNK.matrixLinkout(name, rowType, colType, selectType,reqAttributes, callback));
		}else {
			linkouts["Matrix"].push(new NgChm.LNK.matrixLinkout(name, rowType, colType, selectType,reqAttributes, callback));
		}
	}
	
}

//this function goes through searchItems and returns the proper label type for linkout functions to use
NgChm.LNK.getLabelsByType = function(axis, linkout){
	var searchLabels;
	var labels = axis == 'Row' ? NgChm.heatMap.getRowLabels()["labels"] : axis == "Column" ? NgChm.heatMap.getColLabels()['labels'] : 
		axis == "ColumnCovar" ? Object.keys(NgChm.heatMap.getColClassificationConfig()) : axis == "RowCovar" ? Object.keys(NgChm.heatMap.getRowClassificationConfig()) : 
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
			for (var i in NgChm.SEL.searchItems[axis]){
				if (axis.includes("Covar")){ // Covariate linkouts have not been tested very extensively. May need revision in future. 
					searchLabels.push( generateSearchLabel(labels[i],formatIndex)) ;
				} else {
					searchLabels.push( generateSearchLabel(labels[i-1],formatIndex) );
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
    	labelMenu.style.display = 'none';
    }
}

NgChm.LNK.labelHelpOpen = function(axis, e){
	var labelMenu =  axis !== "Matrix" ? document.getElementById(axis + 'LabelMenu') : document.getElementById("MatrixMenu");
	var labelMenuTable = axis !== "Matrix" ? document.getElementById(axis + 'LabelMenuTable') : document.getElementById('MatrixMenuTable');
    var axisLabelsLength = axis !== "Matrix" ? NgChm.DET.getSearchLabelsByAxis(axis).length : {"Row":NgChm.DET.getSearchLabelsByAxis("Row").length ,"Column":  NgChm.DET.getSearchLabelsByAxis("Column").length};
    var header = labelMenu.getElementsByClassName('labelMenuHeader')[0];
    var row = header.getElementsByTagName('TR')[0];
    if (axisLabelsLength > 0 && axis !== "Matrix"){
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
    	labelMenu.style.display = 'inherit';
    	labelMenu.style.left = e.pageX + labelMenu.offsetWidth > window.innerWidth ? window.innerWidth-labelMenu.offsetWidth-15 : e.pageX; // -15 added in for the scroll bars
    	labelMenu.style.top = e.pageY + labelMenu.offsetHeight > window.innerHeight ? window.innerHeight-labelMenu.offsetHeight-15 : e.pageY;
    }
}

//creates the divs for the label menu
NgChm.LNK.createLabelMenu = function(axis){
	var labelMenu = axis !== "Matrix" ? NgChm.UHM.getDivElement(axis + 'LabelMenu') : NgChm.UHM.getDivElement(axis + 'Menu');
	document.body.appendChild(labelMenu);
	labelMenu.style.position = 'absolute';
	labelMenu.classList.add('labelMenu');
	var topDiv = document.createElement("DIV");
	topDiv.classList.add("labelMenuCaption");
	topDiv.innerHTML = axis !== "Matrix" ? axis.replace("Covar"," Classification") + ' Label Menu:' : axis + ' Menu';
	var closeMenu = document.createElement("IMG");
	closeMenu.src = NgChm.staticPath +"images/closeButton.png";
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
}

//adds the row linkouts and the column linkouts to the menus
NgChm.LNK.populateLabelMenu = function(axis, axisLabelsLength){
	var table = axis !== "Matrix" ? document.getElementById(axis + 'LabelMenuTable') : document.getElementById("MatrixMenuTable");
	var labelType = axis == "Row" ? NgChm.heatMap.getRowLabels()["label_type"] : 
					axis == "Column" ? NgChm.heatMap.getColLabels()["label_type"] : axis == "ColumnCovar" ? ["ColumnCovar"] : axis == "RowCovar"  ? ["RowCovar"] : ["Matrix"];
	var linkoutsKeys = Object.keys(linkouts);
	for (var i = 0; i < labelType.length; i++){ // for every labeltype that the map has...
		var type = labelType[i];
		if (linkouts[type]){ // and for every linkout that the label type has, we add the linkout to the menu
			for (var j = 0; j < linkouts[type].length; j++){
				var linkout = linkouts[type][j];
				var clickable;
				if (labelType == "ColumnCovar" && NgChm.DET.getSearchLabelsByAxis("Column").length == 0 && linkout.selectType){
					clickable = false;
				} else if (labelType == "RowCovar" && NgChm.DET.getSearchLabelsByAxis("Row").length == 0 && linkout.selectType){
					clickable = false;
				} else if (linkout.selectType == linkouts.SINGLE_SELECT && axisLabelsLength > 1 && (axis == "Row" || axis == "Column")){
					clickable = false;
				} else if (linkout.selectType == linkouts.SINGLE_SELECT && (axisLabelsLength["Row"] > 1 || axisLabelsLength["Column"] > 1) && axis == "Matrix"){
					clickable = false;
				}else {
					clickable = true;
				}
				
				if (linkout.rowType &&  linkout.colType && type == "Matrix"){// if this is a MatrixLinkout...
					handleMatrixLinkout(axis,table, linkout,clickable);
				} else {
					NgChm.LNK.addMenuItemToTable(axis, table, linkout, clickable);
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
					var clickable;
					if (labelType == "ColumnCovar" && NgChm.DET.getSearchLabelsByAxis("Column").length == 0){
						clickable = false;
					} else if (labelType == "RowCovar" && NgChm.DET.getSearchLabelsByAxis("Row").length == 0){
						clickable = false;
					} else if (linkouts[type][j].selectType == linkouts.SINGLE_SELECT && axisLabelsLength > 1){
						clickable = false;
					} else {
						clickable = true;
					}
					NgChm.LNK.addMenuItemToTable(axis, table, linkouts[type][j], clickable);
				}
			}
		}
	}
	
	// Helper functions for populateLabelMenu
	function handleMatrixLinkout(axis, table, linkout,clickable){
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
		NgChm.LNK.addMenuItemToTable(axis, table, linkout, clickable);
	}
}

NgChm.LNK.addMenuItemToTable = function(axis, table, linkout,clickable){
	var body = table.getElementsByClassName('labelMenuBody')[0];
	
	var functionWithParams = function(){ // this is the function that gets called when the linkout is clicked
		var input = NgChm.LNK.getLabelsByType(axis,linkout)
		linkout.callback(input,axis); // linkout functions will have inputs that correspond to the labelType used in the addlinkout function used to make them.
	};
	if (linkout.reqAttributes == null){
		var row = body.insertRow();
		var cell = row.insertCell();
		if (clickable){
			cell.innerHTML = linkout.title;
			cell.addEventListener('click', functionWithParams);
		} else{
			cell.innerHTML = linkout.title;
			cell.classList.add('unclickable');
			cell.addEventListener("click", NgChm.LNK.selectionError)
		}
	} else {
		if (typeof(linkout.reqAttributes) == 'string' && linkouts.getAttribute(linkout.reqAttributes)){
			var row = body.insertRow();
			var cell = row.insertCell();
			if (clickable){
				cell.innerHTML = linkout.title;
				cell.addEventListener('click', functionWithParams);
			} else{
				cell.innerHTML = linkout.title;
				cell.classList.add('unclickable');
				cell.addEventListener("click", NgChm.LNK.selectionError)
			}
		} else if (typeof(linkout.reqAttributes) == 'object'){
			var add = true;
			for (var i = 0; i < linkout.reqAttributes.length; i++){
				if (!linkouts.getAttribute(linkout.reqAttributes[i])){
					add = false;
				}
			}
			if (add){
				var row = body.insertRow();
				var cell = row.insertCell();
				if (clickable){
					cell.innerHTML = linkout.title;
					cell.addEventListener('click', functionWithParams);
				} else{
					cell.innerHTML = linkout.title;
					cell.classList.add('unclickable');
					cell.addEventListener("click", NgChm.LNK.selectionError)
				}
			}
		}
	}
}

NgChm.LNK.selectionError = function(e){
	var message = "Please select only one label in this axis to use the following linkout:\n\n" + e.currentTarget.innerHTML;
	alert(message);
}

NgChm.LNK.getDefaultLinkouts = function(){
	var colLabelType = NgChm.heatMap.getColLabels().label_type;
	var rowLabelType = NgChm.heatMap.getRowLabels().label_type;
	NgChm.LNK.addLinkout("Copy " + (colLabelType[0].length < 20 ? colLabelType[0] : "Column Labels") +" to Clipboard", colLabelType[0], linkouts.MULTI_SELECT, NgChm.LNK.copyToClipBoard,null,0);
	if (rowLabelType[0] !== colLabelType[0]){
		NgChm.LNK.addLinkout("Copy " + (rowLabelType[0].length < 20 ? rowLabelType[0] : "Row Labels") + " to Clipboard", rowLabelType[0], linkouts.MULTI_SELECT, NgChm.LNK.copyToClipBoard,null,0);
	}
	
	NgChm.LNK.addLinkout("Copy bar data for all labels", "ColumnCovar", null, NgChm.LNK.copyEntireClassBarToClipBoard,null,0);
	NgChm.LNK.addLinkout("Copy bar data for selected labels", "ColumnCovar", linkouts.MULTI_SELECT,NgChm.LNK.copyPartialClassBarToClipBoard,null,1);
	NgChm.LNK.addLinkout("Copy bar data for all labels", "RowCovar", null,NgChm.LNK.copyEntireClassBarToClipBoard,null,0);
	NgChm.LNK.addLinkout("Copy bar data for selected labels", "RowCovar", linkouts.MULTI_SELECT,NgChm.LNK.copyPartialClassBarToClipBoard,null,1);
	NgChm.LNK.addLinkout("Copy selected items to clipboard", "Matrix", linkouts.MULTI_SELECT,NgChm.LNK.copySelectionToClipboard,null,0);
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