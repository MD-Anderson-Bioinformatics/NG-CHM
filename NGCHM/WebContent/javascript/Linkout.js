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
var linkoutsVersion = 'undefined';

linkouts.VISIBLE_LABELS = "visibleLabels";
linkouts.HIDDEN_LABELS = "hiddenLabels";
linkouts.FULL_LABELS = "fullLabels";
linkouts.POSITION = "position";
linkouts.SINGLE_SELECT = "singleSelection";
linkouts.MULTI_SELECT = "multiSelection";

linkouts.getAttribute = function (attribute){
	return NgChm.heatMap.getMapInformation().attributes[attribute];
}

linkouts.setVersion = function (v) {
	linkoutsVersion = '' + v;
};

linkouts.getVersion = function () {
	return linkoutsVersion;
};

linkouts.getMapName = function(){
	return NgChm.heatMap.getMapInformation().name;
}

linkouts.getMapFileName = function(){
	return NgChm.UTIL.mapId;
}

// returns type of object we're linking from.
linkouts.getSourceObjectType = function() {
	return "chm"; // CHM of course.
};

// returns a 'unique' identifier for the current source object.
linkouts.getSourceObjectUniqueId = function() {
	return NgChm.UTIL.mapId;
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
linkouts.openUrl = function openUrl (url, name, options) {
	NgChm.LNK.openUrl (url, name, options);
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

(function() {

	//Used to store the label item that the user clicked-on
	NgChm.LNK.selection = 0;
	//Used to place items into the hamburger menu (incremented from starting point of 10 which is just after the gear in the menu.  this value MUST be edited if adding an item before the gear)
	NgChm.LNK.hamburgerLinkCtr = 10;

	NgChm.LNK.linkoutElement = null;

	NgChm.LNK.openUrl = function openUrl (url, name, options) {
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

	//Add a linkout to the Hamburger menu
	NgChm.LNK.addHamburgerLinkout = function(params) {
		var burgerMenu = document.getElementById('burgerMenuPanel');
		//Verify params and set defaults
		if (params.name === undefined) {return;}
		params.name = "plugin-" + params.name;
		if (params.label === undefined) {params.label = params.name;}
		if (params.icon === undefined) {params.icon = 'images/link.png';}
		if (params.action === undefined) {params.action = NgChm.UHM.hamburgerLinkMissing;}
		//Create linkout div using params
		var wrapper= document.createElement('div');
		wrapper.innerHTML= "<div id='"+params.name+"' class='menuItem'> <img id='plugin-"+params.name+"_btn' src='"+params.icon+"'>"+params.label+"...</div>";
		var burgerLinkDiv= wrapper.firstChild;
		burgerLinkDiv.onclick = params.action;
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
					NgChm.SRCH.getAxisSearchResults(axis).forEach(i => {
						if (axis.includes("Covar")){ // Covariate linkouts have not been tested very extensively. May need revision in future. 
							searchLabels.push( generateSearchLabel(labels[i],formatIndex)) ;
						} else {
							searchLabels.push( generateSearchLabel(labels[i-1],formatIndex));
						}
					});
				}
			} else {
				searchLabels = {"Row" : [], "Column" : []};
				NgChm.SRCH.getAxisSearchResults("Row").forEach (i => {
					searchLabels["Row"].push( generateSearchLabel(labels[0][i-1],[formatIndex[0]]) );
				});
				NgChm.SRCH.getAxisSearchResults("Column").forEach (i => {
					searchLabels["Column"].push( generateSearchLabel(labels[1][i-1],[formatIndex[0]]) );
				});
				if (linkout.title !== 'Copy selected labels to clipboard') {
					if (searchLabels["Row"].length === 0) {
						searchLabels["Row"] = NgChm.DET.getAllLabelsByAxis("Row");
					}
					if (searchLabels["Column"].length === 0) {
						searchLabels["Column"] = NgChm.DET.getAllLabelsByAxis("Column");
					}
				}
				if (linkout.title === 'Download selected matrix data to file') {
					labelDataMatrix = NgChm.LNK.createMatrixData(searchLabels);
				}
				if (linkout.title === 'Set selection as detail view') {
					NgChm.LNK.setDetailView(searchLabels);
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
			NgChm.SRCH.getAxisSearchResults("Row").forEach( i => {
				searchLabels["Row"].push( generateSearchLabel(labels[0][i-1],formatIndex.row) );
			});
			NgChm.SRCH.getAxisSearchResults("Column").forEach( i => {
				searchLabels["Column"].push( generateSearchLabel(labels[1][i-1],formatIndex.col) );
			});
			
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


	NgChm.LNK.createMatrixData = function(searchLabels) {
		let tilesReady = false;
		if (NgChm.SRCH.getAxisSearchResults("Row").length === 0) {
		    NgChm.heatMap.setReadWindow(NgChm.SEL.getLevelFromMode(NgChm.DMM.primaryMap, NgChm.MMGR.DETAIL_LEVEL),1,1,NgChm.heatMap.getNumRows(NgChm.MMGR.DETAIL_LEVEL),NgChm.heatMap.getNumColumns(NgChm.MMGR.DETAIL_LEVEL));
		    tilesReady = NgChm.heatMap.allTilesAvailable();
		} else if (NgChm.SRCH.getAxisSearchResults("Column").length === 0) {
		    NgChm.heatMap.setReadWindow(NgChm.SEL.getLevelFromMode(NgChm.DMM.primaryMap, NgChm.MMGR.DETAIL_LEVEL),1,1,NgChm.heatMap.getNumRows(NgChm.MMGR.DETAIL_LEVEL),NgChm.heatMap.getNumColumns(NgChm.MMGR.DETAIL_LEVEL));
		    tilesReady = NgChm.heatMap.allTilesAvailable();
		} else {
			return NgChm.LNK.createMatrixDataTsv(searchLabels);
		} 
		if (tilesReady === true) {
			NgChm.LNK.createMatrixDataTsv(searchLabels);
		} else {
			NgChm.heatMap.addEventListener(NgChm.LNK.matrixDataReady.bind('payload', searchLabels));
		}
	}

	//This function gets called asynchronously if tiles need to be loaded in order
	//to satisfy the matrix data tsv request.
	NgChm.LNK.matrixDataReady = function(searchLabels, event, tile) {
	    let tilesReady = NgChm.heatMap.allTilesAvailable();
	    if (tilesReady === true) {
	    	NgChm.MMGR.latestReadWindow= null;
	        NgChm.LNK.createMatrixDataTsv(searchLabels);
	    }
	}
	
	//This function creates a two dimensional array which contains all of the row and
	//column labels along with the data for a given selection
	NgChm.LNK.createMatrixDataTsv = function(searchLabels) {
		var matrix = new Array();

		let rowSearchItems = NgChm.SRCH.getAxisSearchResults("Row");
		//Check to see if we need new searchItems because entire axis is selected by 
		//default of no items being selected on opposing axis, Otherwise, use
		//searchItems selected.
		if (rowSearchItems.length === 0) {
			rowSearchItems = NgChm.LNK.getEntireAxisSearchItems(searchLabels,"Row");
		}
		let colSearchItems = NgChm.SRCH.getAxisSearchResults("Column");
		if (colSearchItems.length === 0) {
			colSearchItems = NgChm.LNK.getEntireAxisSearchItems(searchLabels,"Column");
		}
		
		//Load up initial array with column headers
		let matrixCtr = 0;
		for (var j = 0; j < searchLabels["Row"].length+1; j++) {
			//Skip any gaps in data (matrixCtr counts rows actually written to new matrix)
			if (searchLabels["Row"][j] !== '') {
				matrix[matrixCtr] = new Array();
				if (j == 0) {
					matrix[matrixCtr].push(" ");
					for (var i = 0; i < searchLabels["Column"].length; i++) {
						if (searchLabels["Column"][i] !== "") {
							matrix[matrixCtr].push(searchLabels["Column"][i])
						}
					}
 				}
				matrixCtr++;
			}
		}
		
		//Load up an array containing data values for the selected data matrix
		var dataMatrix = new Array();
		rowSearchItems.forEach( x => {
			colSearchItems.forEach( y => {
				let matrixValue = NgChm.heatMap.getValue(NgChm.MMGR.DETAIL_LEVEL,x,y);
				//Skip any values representing gaps in the heat map (minValues has been rounded down by 1)
				if (matrixValue !== NgChm.SUM.minValues-1) {
					dataMatrix.push(matrixValue);
				}
			});
		});
		//Fill in the remainder of the matrix with labels from searchLabels and data from dataMatrix
		var dataIdx = 0;
		matrixCtr = 1;
		for (var k = 1; k <= searchLabels["Row"].length; k++) {
			//Skip row labels representing gaps in heat map
			if (searchLabels["Row"][k-1] !== '') {
				matrix[matrixCtr].push(searchLabels["Row"][k-1]);
				for (var i = 1; i < searchLabels["Column"].length+1; i++) {
					//Skip column labels representing gaps in heat map
					if (searchLabels["Column"][i-1] !== '') {
						matrix[matrixCtr].push(dataMatrix[dataIdx])
						dataIdx++;
					}
				}
				matrixCtr++;
			}
		}
		NgChm.LNK.copySelectedDataToClipboard(matrix,"Matrix");
	}

	//This function creates a temporary searchItems object array and
	//is called when the selection box spans an entire axis
	//(e.g. the selection is the result of a dendro selection on one
	//axis with nothing selected on the other)
	NgChm.LNK.getEntireAxisSearchItems = function(searchLabels,axis) {
		let searchItems = [];
		for (let i=1;i<=searchLabels[axis].length;i++) {
			if (searchLabels[axis][i-1] !== '') {
				searchItems.push(i);
			}
		}
		return searchItems;
	};

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
		NgChm.DEV.targetCanvas = e.currentTarget;
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
	    var axisLabelsLength = axis !== "Matrix" ? NgChm.SRCH.getSearchLabelsByAxis(axis).length : {"Row":NgChm.SRCH.getSearchLabelsByAxis("Row").length ,"Column":  NgChm.SRCH.getSearchLabelsByAxis("Column").length};
	    var header = labelMenu.getElementsByClassName('labelMenuHeader')[0];
	    var row = header.getElementsByTagName('TR')[0];
	    if (((axisLabelsLength > 0) || (NgChm.LNK.selection !== '')) && axis !== "Matrix"){
			row.innerHTML = "Selected " + axis.replace("Covar"," Classification") + "s : " + axisLabelsLength;
			labelMenuTable.getElementsByTagName("TBODY")[0].style.display = 'inherit';
			NgChm.LNK.populateLabelMenu(axis,axisLabelsLength);
	    } else if ((axisLabelsLength["Row"] > 0 || axisLabelsLength["Column"] > 0) && axis == "Matrix"){
	    	if (axisLabelsLength["Row"] === 0) {
	    		axisLabelsLength["Row"] = NgChm.DET.getAllLabelsByAxis("Row").length;
	    	} else if (axisLabelsLength["Column"] === 0) {
	    		axisLabelsLength["Column"] = NgChm.DET.getAllLabelsByAxis("Column").length;
	    	}
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
		const labels = axis == "Row" ? NgChm.heatMap.getRowLabels() : axis == "Column" ? NgChm.heatMap.getColLabels() : axis == "RowCovar" ? NgChm.heatMap.getRowClassificationConfigOrder() : axis == "ColumnCovar" ? NgChm.heatMap.getColClassificationConfigOrder() : []; 
		NgChm.SRCH.getAxisSearchResults(axis).forEach( key => {
			let selItem;
			if (axis.includes("Covar")){
				selItem = labels[key];
			} else {
				selItem = labels[key-1];
			}
			if (selItem === NgChm.LNK.selection) {
				return true;
			}
		});
		return false;
	}

	//Check to see if we have selections
	NgChm.LNK.hasSelection = function (axis) {
		// Check to see if clicked item is part of selected labels group
		return NgChm.SRCH.getAxisSearchResults(axis).length > 0;
	};

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
			if (linkout.callback !== null)
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
					NgChm.SRCH.getAxisSearchResults(axis).forEach( j => {
						var name = NgChm.heatMap.getColClassificationConfigOrder()[j];
						if (NgChm.heatMap.getColClassificationConfig()[name].data_type == linkout.reqAttributes[i]){
							add = true;
						}
					});
					if (NgChm.heatMap.getColClassificationConfig()[NgChm.LNK.selection].data_type == linkout.reqAttributes[i]){
						add = true;
					}
				}
			} else if (linkout.labelType == "RowCovar"){
				for (var i=0; i < linkout.reqAttributes.length; i++){
					NgChm.SRCH.getAxisSearchResults(axis).forEach( j => {
						var name = NgChm.heatMap.getRowClassificationConfigOrder()[j];
						if (NgChm.heatMap.getRowClassificationConfig()[name].data_type == linkout.reqAttributes[i]){
							add = true;
						}
					});
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
		NgChm.LNK.addLinkout("Download selected matrix data to file", "Matrix", linkouts.MULTI_SELECT,null,null,0);
		NgChm.LNK.addLinkout("Set selection as detail view", "Matrix", linkouts.MULTI_SELECT,null,null,0);
	}


	//===================//
	// DEFAULT FUNCTIONS //
	//===================//

	NgChm.LNK.copyToClipBoard = function(labels,axis){
		window.open("","",'width=335,height=330,resizable=1').document.write(labels.join("<br>"));
	}

	NgChm.LNK.copyEntireClassBarToClipBoard = function(labels,covarAxis){
		const newWindow = window.open("","",'width=335,height=330,resizable=1');
		const newDoc = newWindow.document;
		const axis = covarAxis == "ColumnCovar" ? "Column" : "Row";
		const axisLabels = NgChm.heatMap.getAxisLabels(axis)["labels"];
		const classBars = NgChm.heatMap.getAxisCovariateData(axis);
		newDoc.write("Sample&emsp;" + labels.join("&emsp;") + ":<br>");
		for (let i = 0; i < axisLabels.length; i++){
			newDoc.write(axisLabels[i].split("|")[0] + "&emsp;");
			for (let j = 0; j < labels.length; j++){
				newDoc.write(classBars[labels[j]].values[i] + "&emsp;");
			}
			newDoc.write("<br>");
		}
	};

	NgChm.LNK.copyPartialClassBarToClipBoard = function(labels, covarAxis){
		const newWindow = window.open("","",'width=335,height=330,resizable=1');
		const newDoc = newWindow.document;
		const axis = covarAxis == "ColumnCovar" ? "Column" : "Row";
		const axisLabels = NgChm.SRCH.getSearchLabelsByAxis(axis);
		const labelIndex = NgChm.SRCH.getAxisSearchResults(axis);
		const classBars = NgChm.heatMap.getAxisCovariateData(axis);
		newDoc.write("Sample&emsp;" + labels.join("&emsp;") + ":<br>");
		for (let i = 0; i < axisLabels.length; i++){
			newDoc.write(axisLabels[i].split("|")[0] + "&emsp;");
			for (let j = 0; j < labels.length; j++){
				newDoc.write(classBars[labels[j]].values[labelIndex[i]-1] + "&emsp;");
			}
			newDoc.write("<br>");
		}
	};

	NgChm.LNK.copySelectionToClipboard = function(labels,axis){
		window.open("","",'width=335,height=330,resizable=1').document.write("<b>Rows:</b><br>" + labels["Row"].join("<br>") + "<br><br><b>Columns:</b><br>" + labels["Column"].join("<br>"));
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
	NgChm.LNK.setDetailView = function(searchLabels){
		let selRows = NgChm.SRCH.getAxisSearchResults("Row");
		if (selRows.length === 0) {
			selRows = NgChm.LNK.getEntireAxisSearchItems(searchLabels,"Row");
		}
		let selCols = NgChm.SRCH.getAxisSearchResults("Column");
		if (selCols.length === 0) {
			selCols = NgChm.LNK.getEntireAxisSearchItems(searchLabels,"Column");
		}
		var startCol = parseInt(selCols[0])
		var endCol = parseInt(selCols[selCols.length-1])
		var startRow = parseInt(selRows[0])
		var endRow = parseInt(selRows[selRows.length-1])

		NgChm.SUM.setSubRibbonView(startRow, endRow, startCol, endCol);
	};

	NgChm.LNK.switchPaneToLinkouts = function switchPaneToLinkouts (loc) {
		NgChm.Pane.clearExistingGearDialog(loc.pane.id);
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
			const pp = new PanePlugin (p);
			// Replace any existing plugin with the same name.
			for (let idx = 0; idx < panePlugins.length; idx++) {
			    if (panePlugins[idx].name === pp.name) {
				panePlugins[idx] = pp;
				return;
			    }
			}
			// Add new pane plugin if no plugin with the same name already exists.
			panePlugins.push (pp);
		};

		NgChm.LNK.getPanePlugins = function() {
			return Array.from(new Set(panePlugins.map(a => a.name))).map(name => { return panePlugins.find(a => a.name === name)})
		};
	})();

	// Maintain a database of current plugin instances.
	(function() {
	    // Every plugin instance is identified by a unique nonce.
	    // The following object maps nonces to plugin instances.
	    const instances = {};

	    // Class for a plugin instance.
	    class PluginInstance {
	        constructor ({ kind, nonce, source, plugin, params, iframe, config, dataFromPlugin} = {}) {
	            if (kind === undefined) kind = "panel-plugin";
	            if (["panel-plugin", "linkout-plugin", "hamburger-plugin"].indexOf(kind) === -1) { alert("Unknown plugin kind"); }
	            Object.assign (this, { kind, nonce, source, plugin, params, iframe, config, dataFromPlugin});
		}
	    }

	    NgChm.LNK.getPluginInstance = function getPluginInstance (nonce) {
	        return instances[nonce];
	    };
		NgChm.LNK.getPluginInstances = function getPluginInstances() {
			return instances;
		}

	    NgChm.LNK.removePluginInstance = function removePluginInstance(nonceToRemove) {
	    	delete instances[nonceToRemove];
	    }

	    NgChm.LNK.getPluginInstanceByName = function getPluginInstanceByName (name) {
		let p = 0;
		const k = Object.keys(instances);
		while (p < k.length && instances[k[p]].plugin.name !== name) p++;
		return p === k.length ? null : instances[k[p]];
	    };

	    // Set the parameters for a panel plugin instance.
	    // Element is a DOM element within the panel plugin.
	    // Options contains the parameters to set.
	    // Also sets the panel's title bar.
	    NgChm.LNK.setPanePluginOptions = function (element, options) {
		const loc = NgChm.Pane.findPaneLocation (element);
		const iframe = loc.pane.getElementsByTagName('IFRAME')[0];
		const nonce = iframe.dataset.nonce;
		instances[nonce].params = options;
		loc.paneTitle.innerText = instances[nonce].plugin.name + '. ' + options.plotTitle;
		NgChm.LNK.initializePanePlugin (nonce, options);
	    };

	    // Create a new, unique nonce.
	    NgChm.LNK.getNewNonce = function getNewNonce () {
		const ta = new Uint8Array(16);
		window.crypto.getRandomValues(ta);
		return Array.from(ta).map(x => x.toString(16)).join("");
	    };

	    // Create a new instance of the specified plugin and return the
	    // iframe associated with the new instance.  The caller is
	    // responsible for inserting the iframe into the correct place
	    // in the DOM.
	    NgChm.LNK.createPluginInstance = function createPluginInstance (kind, plugin) {
		const nonce = NgChm.LNK.getNewNonce();
		const isBlob = /^blob:/.test(plugin.src);
		const url = isBlob ? plugin.src : plugin.src + (plugin.src.indexOf('?') == -1 ? '?' : '&') + 'nonce=' + nonce;

		const iframe = document.createElement('IFRAME');
		iframe.dataset.nonce = nonce;
		instances[nonce] = new PluginInstance ({ kind, nonce, plugin, params: {}, iframe, config: plugin.config });

		iframe.setAttribute('title', plugin.name);
		if (isBlob) {
		    iframe.onload = function() {
			NgChm.LNK.sendMessageToPlugin ({ nonce, op: 'nonce' });
		    };
		}
		iframe.setAttribute('src', url);

	        return iframe;
	    };

	    // Send a Vanodi message to the plugin instance identified by msg.nonce.
	    NgChm.LNK.sendMessageToPlugin = function sendMessageToPlugin (msg) {
		const src = instances[msg.nonce].source || instances[msg.nonce].iframe.contentWindow;
		if (src !== null) {
			src.postMessage({ vanodi: msg }, '*');
		} else {
			console.warn("Plugin with nonce "+msg.nonce+" does not exist");
		}
	    };

	    /* Request data generated by plugin and required to recreate state of plugin
	       (e.g. the zoom level on a scatter plot)
	    */
	    NgChm.LNK.requestDataFromPlugins = function requestDataFromPlugins() {
		let pluginInstances = NgChm.LNK.getPluginInstances();
		for (const nonce of Object.keys(pluginInstances)) {
			NgChm.LNK.sendMessageToPlugin ({ nonce, op: 'requestForPluginData'});
		}
	    }

	    /* Check if all plugins have reported their data
	    */
	    NgChm.LNK.havePluginData = function havePluginData() {
		let pluginInstances = NgChm.LNK.getPluginInstances();
		let havePluginDataList = [];
		Object.keys(pluginInstances).forEach(pi => {
			if (typeof pluginInstances[pi]['dataFromPlugin'] != 'undefined') {
				havePluginDataList.push(pluginInstances[pi]['nonce']);
			}
		})
		if (JSON.stringify(havePluginDataList.sort()) === JSON.stringify(Object.keys(pluginInstances).sort())) {
			return true;
		} else {
			return false;
		}
	    }

	    /* Display warning message if some plugins did not provide their data
	    */
	    NgChm.LNK.warnAboutMissingPluginData = function warnAboutMissingPluginData() {
		if (NgChm.LNK.havePluginData()) {
			return false; // have all plugins' data...no need for warning message
		}
		let warningText = "Unable to save some date elements from the following plugins: <br>"
		let pluginInstances = NgChm.LNK.getPluginInstances();
		Object.keys(pluginInstances).forEach(pi => {
			if (typeof pluginInstances[pi]['dataFromPlugin'] == 'undefined') {
				warningText += "<br>&nbsp;&nbsp;" + pluginInstances[pi]['plugin']['name'];
			}
		});
		let dialog = document.getElementById('msgBox');
		NgChm.UHM.initMessageBox();
		NgChm.UHM.setMessageBoxHeader("Warning: Unable to save some plugin data");
		NgChm.UHM.setMessageBoxText(warningText);
		NgChm.UHM.setMessageBoxButton(1, 'images/okButton.png', 'OK Button');
		dialog.style.display = '';
		let okButton = dialog.querySelector('#msgBoxBtnImg_1');
		okButton.addEventListener('click', function handleOkClick(e) {
			okButton.removeEventListener('click', handleOkClick);
			NgChm.UHM.messageBoxCancel();
		})
	    }

	    // Send a Vanodi message to all plugin instances except the one identified by srcNonce.
	    NgChm.LNK.sendMessageToAllOtherPlugins = function sendMessageToAllOtherPlugins (srcNonce, msg) {
		const iframes = document.getElementsByTagName('iframe');
		for (let i = 0; i < iframes.length; i++) {
		    const nonce = iframes[i].dataset.nonce;
		    if (nonce && nonce !== srcNonce ) {
			NgChm.LNK.sendMessageToPlugin (Object.assign ({}, msg, {nonce}));
		    }
		}
	    };

	    // Add a linkout or hamburger plugin.
	    NgChm.LNK.addLinkoutPlugin = function addLinkoutPlugin (kind, spec) {
	       if ((kind === 'linkout-plugin' || kind === 'hamburger-plugin') && spec.src) {
		   // Create an instance of the plugin.
		   const iframe = NgChm.LNK.createPluginInstance (kind, spec);
		   iframe.classList.add('hide');
		   document.body.append(iframe);

		   // For each linkout, create a function that sends a Vanodi message to the instance.
		   if (kind === 'linkout-plugin') {
		       for (let idx = 0; idx < spec.linkouts.length; idx++) {
			   spec.linkouts[idx].linkoutFn = ((spec, nonce) => function(labels) {
			       NgChm.LNK.sendMessageToPlugin ({ nonce, op: 'linkout', id: spec.messageId, labels });
			   })(spec.linkouts[idx], iframe.dataset.nonce);
		       }
		       for (let idx = 0; idx < spec.matrixLinkouts.length; idx++) {
			   spec.matrixLinkouts[idx].linkoutFn = ((spec, nonce) => function(labels) {
			       NgChm.LNK.sendMessageToPlugin({ nonce, op: 'matrixLinkout', id: spec.messageId, labels });
			   })(spec.matrixLinkouts[idx], iframe.dataset.nonce);
		       }
		       linkouts.addPlugin(spec);
		   } else {
		       spec.action = ((spec, nonce) => function() {
			   NgChm.LNK.sendMessageToPlugin({ nonce, op: 'hamburgerLinkout', id: spec.messageId });
		       })(spec, iframe.dataset.nonce);
		       linkouts.addHamburgerLinkout(spec);
		   }
		   // Regenerate the linkout menus.
		   NgChm.CUST.definePluginLinkouts();
	       }
	    };
	})();

	// Switch the empty pane identified by PaneLocation loc to a new
	// instance of the specified panel plugin.
	NgChm.LNK.switchPaneToPlugin = function (loc, plugin) {
	    NgChm.heatMap.setUnAppliedChanges(true);
	    const params = plugin.params;
	    if (!params) {
		const help = NgChm.UTIL.newElement('DIV.linkouts');
		help.innerText = plugin.helpText;
		loc.pane.appendChild (help);
		return;
	    }

	    const linkoutElement = NgChm.UTIL.newElement ('DIV.linkouts');
	    loc.paneTitle.innerText = plugin.name;
	    loc.pane.appendChild (linkoutElement);

	    let pluginIframe = NgChm.LNK.createPluginInstance('panel-plugin', plugin);
	    loc.pane.nonce = pluginIframe.dataset.nonce;
	    linkoutElement.appendChild(pluginIframe);
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
		const uniqueClassValues = Array.from(new Set(NgChm.heatMap.getAxisCovariateData(axis)[label].values));
		const classColors = [];
		for (let i=0; i<uniqueClassValues.length; i++) {
		    if (uniqueClassValues[i] !== '!CUT!') {
			classColors.push({
				"Class": uniqueClassValues[i],
				"Color": NgChm.CMM.darkenHexColorIfNeeded(colorMap.getRgbToHex(colorMap.getClassificationColor(uniqueClassValues[i])))
			});
		    }
		}
		// for each of the values input, get the corresponding class color to return
		var valColors = []  // array of colors for each value
		var tmpColor
		values.forEach( val => {
			tmpColor = classColors.filter(cc => {
				return cc.Class == val;
			});
			if (tmpColor.length != 1) { console.error('Error getting color for discrete covariate'); tmpColor = [{Color: '#000000'}]}
			valColors.push(tmpColor[0].Color);
		});
		return { classColors, colors: valColors };
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
		return { values: valClasses, colors: valColors, colorMap: getVanodiColorMap (cfg.color_map.thresholds, cfg.color_map.colors) };
	}

	function getVanodiColorMap (thresholds, colors) {
		const classColors = [];
		for (let idx = 0; idx < thresholds.length; idx++) {
		    if (thresholds[idx] !== "!CUT!") {
		        classColors.push({ 'Class': thresholds[idx], 'Color': colors[idx] });
		    }
		}
		return classColors;
	}

	// Return an array of values for the rows/columns specified by idx along axis.
	function getDataValues (axis, idx) {
		const isRow = NgChm.MMGR.isRow (axis);
		const colorMap = NgChm.heatMap.getColorMapManager().getColorMap("data", NgChm.SEL.getCurrentDL());
		const colorThresholds = colorMap.getThresholds();
		idx = idx === undefined ? [] : Array.isArray(idx) ? idx : [idx];
		const win = {
			layer: NgChm.SEL.getCurrentDL(),
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
	/* If axis == 'row' axisIdx = indices of the rows to summarize, groupIdx = indices of columns to include.
	 * Result will a vector with one value for each axisIdx value.
	 */
	function getSummaryStatistics(axis, axisIdx, groupIdx) {
		const isRow = NgChm.MMGR.isRow (axis);
		axisIdx = axisIdx === undefined ? [] : Array.isArray(axisIdx) ? axisIdx : [axisIdx];
		groupIdx = groupIdx === undefined ? [] : Array.isArray(groupIdx) ? groupIdx : [groupIdx];
		const values = [];
		// Both axisIdx and groupIdx can be disjoint.
		// TODO: Improve efficiency by grouping adjacent indices.
		for (let i=0; i < axisIdx.length; i++) {
			// Get access window for each axisIdx (one vector per iteration)
			const win = {
				layer: NgChm.SEL.getCurrentDL(),
				level: NgChm.MMGR.DETAIL_LEVEL,
				firstRow: isRow ? 1+axisIdx[i] : 1,
				firstCol: isRow ? 1 : 1+axisIdx[i],
				numRows: isRow ? 1 : NgChm.heatMap.getNumRows(NgChm.MMGR.DETAIL_LEVEL),
				numCols: isRow ? NgChm.heatMap.getNumColumns(NgChm.MMGR.DETAIL_LEVEL) : 1
			};
			const accessWindow = NgChm.heatMap.getAccessWindow(win)
			const thisVec = []
			// Iterate over groupIdx to get vector of values from heatmap for summarization.
			if (isRow) {
				for (let j=0; j < groupIdx.length; j++) {
					const val = accessWindow.getValue(win.firstRow, 1+groupIdx[j]);
					thisVec.push(val);
				}
			} else {
				for (let j=0; j < groupIdx.length; j++) {
					const val = accessWindow.getValue(1+groupIdx[j], win.firstCol);
					thisVec.push(val);
				}
			}
			var statsForVec = getStats(thisVec)
			values.push(statsForVec)
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
		const colorMap = NgChm.heatMap.getColorMapManager().getColorMap("data", NgChm.SEL.getCurrentDL());
		const { breaks, classColors } = getDiscMapFromContMap (colorMap.getThresholds(), colorMap.getColors());
		const values = getDataValues (axis, idx);
		const valClasses = getValueClassesColors (values, breaks, classColors, colorMap.getMissingColor(),'Class');
		return { values: valClasses, colors: classColors };
	}
	// end bunch of helper functions

	NgChm.LNK.initializePanePlugin = function(nonce, config) {
		const data = {
			axes: []
		};
		for (let ai = 0; ai < config.axes.length; ai++) {
			const axis = config.axes[ai];
			const fullLabels = NgChm.heatMap.getAxisLabels(axis.axisName).labels;
		        const searchItemsIdx = NgChm.SRCH.getAxisSearchResults (axis.axisName);
			let selectedLabels = []
			for (let i=0; i<searchItemsIdx.length; i++) {
				let selectedLabel = fullLabels[searchItemsIdx[i] - 1];
				selectedLabel = selectedLabel.indexOf('|') !== -1 ? selectedLabel.substring(0,selectedLabel.indexOf('|')) : selectedLabel;
				selectedLabels.push(selectedLabel)
			}
			const gapIndices = [];
			fullLabels.forEach((value,index) => { if (value === "") gapIndices.push (index); });
			data.axes.push({
				fullLabels: filterGaps (fullLabels, gapIndices),
				actualLabels: filterGaps (NgChm.UTIL.getActualLabels(axis.axisName), gapIndices),
				selectedLabels: selectedLabels 
			});
			for (let idx = 0; idx < axis.cocos.length; idx++) {
				setAxisCoCoData (data.axes[ai], axis, axis.cocos[idx], gapIndices);
			}
			for (let idx = 0; idx < axis.groups.length; idx++) {
				setAxisGroupData (data.axes[ai], axis, axis.groups[idx]);
			}
		}
		NgChm.heatMap.setUnAppliedChanges(true);
		NgChm.LNK.sendMessageToPlugin ({ nonce, op: 'plot', config, data });
		NgChm.MMGR.saveDataSentToPluginToMapConfig(nonce, config, data);
	}; // end of initializePanePlugin

	function filterGaps (data, gapIndices) {
	    return data.filter ((value,index) => !(gapIndices.includes(index)));
	}

	/**
		Using information in msg about which tests to perform, performs statistical tests and returns results.

		Called from vanodiSendTestData

		@function getAxisTestData
		@param {Object} msg same format as vanodiSendTestData
		@return {Object} cocodata
		@option {Array<String>} labels NGCHM / plugin labels
		@option {Array<>} results Array of results. Below describes an example element

						{
							'colorMap': {
							              'colors': Array of hex colors
							              'missing': color for missing
							              'thresholds': thresholds for the color map
							            },
							'label': string name for the test
							'values': array of numerical results of the test
						}
	*/
		// Keys in msg: 
		// axisName: 'row',
		// axisLabels: labels of nodes from plugin (e.g. gene symbols from PathwayMapper)
		// testToRun: name of test to run
		// group1: labels of other axis elements in group 1
		// group2: labels of other axis elements in group 2 (optional)
	function getAxisTestData (msg) {
		//console.log ({ m: '> getAxisTestData', msg });
		if (msg.axisLabels.length < 1) {
			NgChm.UHM.systemMessage("NG-CHM PathwayMapper", "No pathway present in PathwayMapper. Please import or create a pathway and try again."); 
			return false;
		}
		var allSummaries = [];
		var nResultsToReturn;
		var otherAxisName = NgChm.MMGR.isRow(msg.axisName) ? 'column' : 'row';
		var otherAxisLabels = NgChm.UTIL.getActualLabels (otherAxisName);
		var heatMapAxisLabels = NgChm.UTIL.getActualLabels (msg.axisName); //<-- axis labels from heatmap (e.g. gene names in heatmap)
		heatMapAxisLabels = heatMapAxisLabels.map (l => l.toUpperCase());
		var axisIdx = [];
		const pluginLabels = [];
		for (let i = 0; i < msg.axisLabels.length; i++) {
			let idx = heatMapAxisLabels.indexOf(msg.axisLabels[i].toUpperCase());
			if (idx !== -1) {
				axisIdx.push(idx);
				pluginLabels.push(msg.axisLabels[i]);
			}
		}
		if (axisIdx.length < 1) {NgChm.UHM.systemMessage("NG-CHM PathwayMapper", "Heatmap and pathway have no genes in common."); return;}
		var idx1 = [];
		var idx2 = [];
		if (msg.group2 == null || msg.group2.length == 0) {
			for (let i = 0; i < otherAxisLabels.length; i++) {
				if (msg.group1.indexOf(otherAxisLabels[i]) === -1) {
					idx2.push (i);
				} else {
					idx1.push (i);
				}
			}
		} else {
			for (let i = 0; i < otherAxisLabels.length; i++) {
				if (msg.group1.indexOf(otherAxisLabels[i]) !== -1) {
					idx1.push (i);
				}
				if (msg.group2.indexOf(otherAxisLabels[i]) !== -1) {
					idx2.push (i);
				}
			}
		}
		if (idx1.length < 2) {
			NgChm.UHM.systemMessage('Group too small','Group 1 must have at least 2 members.')
			return false;
		} else if (idx2.length < 2) {
			NgChm.UHM.systemMessage('Group too small','Group 2 must have at least 2 members.')
			return false;
		}
		var summaryStatistics1 = getSummaryStatistics(msg.axisName, axisIdx, idx1);
		var summaryStatistics2 = getSummaryStatistics(msg.axisName, axisIdx, idx2);

		var cocodata = {
			labels: [],
			results: []
		};

		if (msg.testToRun === 'Mean') {
		    const colorMap = NgChm.heatMap.getColorMapManager().getColorMap("data", NgChm.SEL.getCurrentDL());
		    const vColorMap = {
		        thresholds: colorMap.getThresholds(),
			colors: colorMap.getColors().map(NgChm.CMM.darkenHexColorIfNeeded),
		        type: "linear",
		        missing: '#fefefe'
		    };
		    cocodata.results.push({
			    label: "mean",
			    values: [],
			    colorMap: vColorMap
		    });
		    for (let i=0; i < axisIdx.length; i++) {
			    const summary1 = summaryStatistics1[i];
			    cocodata.labels.push (pluginLabels[i]);
			    if (msg.group2 == null || msg.group2.length == 0) {
				cocodata.results[0].values.push(summary1.mu);
			    } else {
			        const summary2 = summaryStatistics2[i];
				cocodata.results[0].values.push(summary1.mu - summary2.mu);
			    }
		    }
		} else if (msg.testToRun === 'T-test') {
		    cocodata.results.push({
			    label: "t_statistics",
			    values: [],
			    colorMap: {
				    type: "linear",
				    thresholds: [ -3.291, -1.96, 1.96, 3.291 ],
				    colors: [ '#1c2ed4', '#cbcff7', '#f9d4d4', '#d41c1c' ],
				    missing: '#fefefe'
			    }
		    });
		    cocodata.results.push({
			    label: "p_values",
			    values: [],
			    colorMap: {
				    type: "linear",
				    thresholds: [ 0.001, 0.05, 1 ],
				    colors: [ '#fefefe', '#777777', '#000000' ],
				    missing: '#fefefe'
			    }
		    });

		    for (let i=0; i < axisIdx.length; i++) {
			    const summary1 = summaryStatistics1[i];
			    const summary2 = summaryStatistics2[i];
			    const tvalue = Welch_tValue(summary1, summary2);
			    const dof = degreesOfFreedom(summary1, summary2);
			    const pvalue = pValue(tvalue, dof);
			    cocodata.labels.push (pluginLabels[i]);
			    cocodata.results[0].values.push(tvalue);
			    cocodata.results[1].values.push(pvalue);
		    }
		}
		//console.log ({ m: '< getAxisTestData', msg, cocodata });
		return cocodata;
	} // end function getAxisTestData

	// Add the values and colors to cocodata for the 'coco' attributes of axis.
	// Currently, 'coco' is either coordinate or covariate.
	function setAxisCoCoData (cocodata, axis, coco, gapIndices) {
		const colorMapMgr = NgChm.heatMap.getColorMapManager();
		const colClassificationData = NgChm.heatMap.getAxisCovariateData('column');
		const rowClassificationData = NgChm.heatMap.getAxisCovariateData('row');
		const isRow = NgChm.MMGR.isRow (axis.axisName);
		const covData = isRow ? rowClassificationData : colClassificationData;
		const axisCovCfg = NgChm.heatMap.getAxisCovariateConfig (axis.axisName);
		const valueField = coco + 's';
		const colorField = coco + 'Colors';
		const colorMapField = coco + 'ColorMap';
		cocodata[valueField] = [];
		cocodata[colorField] = [];
		cocodata[colorMapField] = [];
		for (let ci = 0; ci < axis[valueField].length; ci++) { 
			const ctype = axis[valueField][ci].type; // one of 'covariate' (i.e. from covariate bar) or 'data' (i.e. from map values)
			const label = axis[valueField][ci].covName;
			if (ctype === 'covariate') { // i.e. from one of the covariate bars
				if (axisCovCfg.hasOwnProperty (label)) {
					const cfg = axisCovCfg[label];
					const values = filterGaps (covData[label].values, gapIndices);
					if (cfg.color_map.type === 'continuous') { // i.e. from covariate bar w/ continuous values
						const { classValues, colors, colorMap } = getContCovariateColors (cfg, values);
						cocodata[colorMapField].push(colorMap);
						cocodata[colorField].push(colors); // the color corresponding to the 'Class' for each value
						cocodata[valueField].push(values) // the actual values (not 'Class' values)
					} else { // i.e. from covariate bar w/ discrete values
						const { classColors, colors } = getDiscCovariateColors (axis.axisName, label, values, colorMapMgr);
						cocodata[colorMapField].push(classColors);
						cocodata[colorField].push(colors);
						cocodata[valueField].push(values);
					}
				} else {
					console.log ('heatmap ' + axis.axisName + ' axis: no such covariate: ' + label);
				}
			} else if (ctype === 'data') { // i.e. from selections on the map values
				const idx = axis[valueField][ci].labelIdx; 
				const values = filterGaps (getDataValues(isRow ? 'column' : 'row', idx), gapIndices);
				cocodata[valueField].push(values);
				const colorMap = NgChm.heatMap.getColorMapManager().getColorMap("data", NgChm.SEL.getCurrentDL());

				const colorsForThisData = []
				for (let idv = 0; idv < values.length; idv++) {
				    colorsForThisData.push(NgChm.CMM.darkenHexColorIfNeeded(colorMap.getRgbToHex(colorMap.getColor(values[idv]))));
				}
				cocodata[colorMapField].push(getVanodiColorMap (colorMap.getThresholds(), colorMap.getColors().map(NgChm.CMM.darkenHexColorIfNeeded)));
				cocodata[colorField].push(colorsForThisData);
			} else {
				console.log ('Unknown coco data type ' + ctype);
			}
		}
		//console.log ({ m: 'setAxisCoCoData', axis, coco, cocodata });
	}

	/**
		Pushes user-specified group labels and NGCHM labels for group members to cocodata object.

		As an example, if 'group' = 'ugroup', then the following will be added to the cocodata object:

				[
					{
						'grouplabels': Array of strings to label each of the groups. length = 2. E.g. ['my group 1', 'my group 2']
						'labels': Array of arrays of strings. Each array will have the NGCHM labels of the items in 
						        each group. E.g. [['sample1', 'sample2'], ['sample5', 'sample9']]
					}
				]

		@function setAxisGroupData
		@param {object} cocodata
		@option {Array<String>} actualLabels The actual labels from the NGCHM
		@option {Array<String>} fullLabels The full labels from the NGCHM
		@param {object} axis
		@option {String} axisName 'column' or 'row
		@option {Array<String>} cocos Array of strings that are names for coordinates or covariates. For each item in this array, an additional key will be present in axis, with an 's' added to the name. For example if axis.cocos = ['coordinate','covariate'] then there are two additional keys for axis: 'coordinates' and 'covariates'.
		@option {Array<>} [coordinates] Present only if 'coordinate' is an element of axisName.cocos
		@option {Array<>} [covariates] Present only if 'covariate' is an element of axisName.cocos
		@option {Array<>} data
		@option {Array<String>} groups Array of string that are names for groups. Similar to axis.cocos, for each item in this array,an additional key will be present in axis, with and 's' added to the name. For example, if axis.groups = ['ugroup'] then there will be an additional key to axis: 'ugroups'
		@option {Array<>} [ugroups] Present only if the 'ugroup' is an element of axisName.groups. Describes the groups for 
		                            the statistical tests. Below is a brief description of the elements in the object

			[ 
				{
					'covName': if present, name of covariate choosen
					'labelIdx': Array of length two (one for each group). Each array has the label index from the NGCHM of the items in the groups
					'labels': User-specified labels for each group
					'selectValue': covariate selected. How this is different from covName, I am not sure
					'type': 'covariate' or 'data'. 'covariate' seems to be for when a covariate is choosen from the selector dropdown, 
					      'data' seems to be for when the GRAB/SHOW buttons are being used.
				}
			]

		@param {String} group In this example, 'ugroup'
	*/
	function setAxisGroupData (cocodata, axis, group) {
		const colClassificationData = NgChm.heatMap.getAxisCovariateData('column');
		const rowClassificationData = NgChm.heatMap.getAxisCovariateData('row');
		const isRow = NgChm.MMGR.isRow (axis.axisName);
		const covData = isRow ? rowClassificationData : colClassificationData;
		const axisCovCfg = NgChm.heatMap.getAxisCovariateConfig (axis.axisName);
		const valueField = group + 's';
		cocodata[valueField] = [];
		for (let ci = 0; ci < axis[valueField].length; ci++) { 
			const ctype = axis[valueField][ci].type; // one of 'covariate' (i.e. from covariate bar) or 'data' (i.e. from map values)
			const label = axis[valueField][ci].covName;
			if (ctype === 'covariate') { // i.e. from one of the covariate bars
				if (axisCovCfg.hasOwnProperty (label)) {
					const cfg = axisCovCfg[label];
					if (cfg.color_map.type === 'continuous') { // i.e. from covariate bar w/ continuous values
						const idx = axis[valueField][ci].labelIdx; 
						const labels = idx.map(y => y.map(x => cocodata.fullLabels[parseInt(x)])); 
						cocodata[valueField].push({ grouplabels: axis[valueField][ci].labels, labels });
					} else { // i.e. from covariate bar w/ discrete values
						const idx = axis[valueField][ci].labelIdx; 
						const labels = idx.map(y => y.map(x => cocodata.fullLabels[parseInt(x)])); 
						cocodata[valueField].push({ grouplabels: axis[valueField][ci].labels, labels });
					}
				} else {
					console.log ('heatmap ' + axis.axisName + ' axis: no such covariate: ' + label);
				}
			} else if (ctype === 'data') { // i.e. from selections on the map values (GRAB/SHOW buttons)
				const idx = axis[valueField][ci].labelIdx; 
				const labels = idx.map(y => y.map(x => cocodata.fullLabels[parseInt(x)-1]));
				cocodata[valueField].push({ grouplabels: axis[valueField][ci].labels, labels });
			} else {
				console.log ('Unknown group data type ' + ctype);
			}
		}
	}

	// Create a gear dialog for the pane identified by the DOM element icon.
	NgChm.LNK.newGearDialog = newGearDialog;
	function newGearDialog (icon, paneId) {
		const debug = false;
		const loc = NgChm.Pane.findPaneLocation (icon);
		if (!loc || !loc.pane || loc.pane.getElementsByTagName('IFRAME').length == 0) {
			console.log('No options');  //alert
			return;
		}

		const iframe = loc.pane.getElementsByTagName('IFRAME')[0];
		const nonce = iframe.dataset.nonce;
		const { plugin, params } = NgChm.LNK.getPluginInstance (nonce);
		if (debug) console.log ({ m: 'newGearDialog', loc, plugin, params });

		const config = plugin.config;
		let lastApplied = params.lastApplied;
		if (lastApplied === undefined) {
			lastApplied = []
			lastApplied.push({rangeStrings: ['','']})
		}
		//Remove any other open gear panels
		removeOpenGearPanels();

		let panel = NgChm.UTIL.newElement('DIV.gearPanel');
		panel.id = paneId + "Gear";

		function removeOpenGearPanels () {
			const gears = document.getElementsByClassName('gearPanel');
			for (item of gears) { 
				const paneId = item.id.substring(0,item.id.indexOf("Gear"));
				NgChm.Pane.clearExistingGearDialog(paneId); 
	        } 
		}
		
		function optionNode (type, value) {
			const optNode = NgChm.UTIL.newElement('OPTION');
			optNode.appendChild(NgChm.UTIL.newTxt(value));
			optNode.dataset.type = type;
			return optNode;
		}

		/** Creates text for option to use GRAB/SHOW */
		function selectedElementsOptionName (axis, uname) {
			return 'Selected ' + (NgChm.MMGR.isRow(axis) ? 'columns' : 'rows') + uname;
		}

		/** Add covariate options to dropdown

			@function addCovariateOptions
			@param {} defaultOpt
			@param {Object} axisConfig
			@param {Object} selectElement
			@param {Object} selectedElementsOption
			@param {Boolean} onlyContinuous if true, only add continuous covariates to dropdown.
		*/
		function addCovariateOptions (defaultOpt, axisConfig, selectElement, selectedElementsOption, onlyContinuous) {
			let defaultIndex = 0;
			for (let [cv,cvProperties] of Object.entries(axisConfig)) {
				if (cv === defaultOpt) defaultIndex = selectElement.children.length;
				if (cvProperties.color_map.type === 'continuous') {
					selectElement.add (optionNode ('covariate', cv));
				} else if (!onlyContinuous) {
					selectElement.add (optionNode ('covariate',cv));
				}
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

		const axisParams = plugin.config.axes;
		const axesOptions = []; // this is the list that will get sent to the plugin
		for (let axisId = 0; axisId < config.axes.length; axisId++) {
			{
				const labelText = textN(axisParams[axisId].axisLabel || 'Heat map axis', axisId+1, config.axes.length);
				optionsBox.appendChild (NgChm.UTIL.newElement('SPAN.leftLabel', {}, [NgChm.UTIL.newTxt (labelText)]));
			}
			const axis1Select = NgChm.UTIL.newElement('SELECT');
			axis1Select.add (optionNode ('axis', 'column'));
			axis1Select.add (optionNode ('axis', 'row'));
			optionsBox.appendChild (axis1Select);

			const axis1Coco = {};
			const axis1Data = [];

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
				const axis1cvOrder = NgChm.heatMap.getAxisCovariateOrder (axis);
				otherAxis = NgChm.MMGR.isRow (axis) ? 'Column' : 'Row';
				defaultCoord = axis1cvOrder.filter(x => /\.coordinate\.1/.test(x));
				defaultCoord = defaultCoord.length === 0 ? null : defaultCoord[0].replace(/1$/, '');
				defaultCovar = axis1cvOrder.filter(x => !/\.coordinate\.\d+$/.test(x));
				defaultCovar = defaultCovar.length === 0 ? null : defaultCovar[defaultCovar.length-1];
			}

			let selectedAxis;
			if (lastApplied[0].hasOwnProperty('axis')) {
				selectedAxis = lastApplied[0].axis 
			} else {
				selectedAxis = NgChm.MMGR.isRow(axisParams[axisId].axisName) ? 'row' : 'column';
			}
			if (selectedAxis === 'row') axis1Select.selectedIndex = 1;
			setAxis (selectedAxis);

			function createLinearSelectors (sss, numSelectors, selectorName, params, helpText) {
				params = params || [];
				for (let cid = 0; cid < numSelectors; cid++) {
					const selParams = cid < params.length ? params[cid] : {};
					const selectEl = NgChm.UTIL.newElement('SELECT')
					optionsBox.appendChild (
						NgChm.UTIL.newElement('SPAN.leftLabel', {}, [
							NgChm.UTIL.newTxt(textN(NgChm.UTIL.capitalize(selectorName), cid+1, numSelectors)),
						])
					);
					if (helpText != undefined) { 
						optionsBox.appendChild (
							NgChm.UTIL.newElement('a.helpQuestionMark',{},[], e=> {
								e.onmouseover = function() {NgChm.UHM.hlp(this, helpText, 200, true, 0)};
								e.onmouseout = function() {NgChm.UHM.hlpC()};
								return e;
							})
						)
					}
					optionsBox.appendChild (
						selectEl
					);
					sss.push ({
						select: selectEl,
						axisName: thisAxis,
						data: [],
						updateAxis
					});
					function updateAxis() {
						while (selectEl.firstChild) selectEl.removeChild(selectEl.firstChild);
						const uname = textN (' for ' + selectorName, cid+1, numSelectors);
						const selectedElementsOption = selectedElementsOptionName (thisAxis, uname);
						let defaultOpt;
						if (selParams.type === 'data') {
							defaultOpt = selectedElementsOption;
						} else if (selParams.type === 'covariate' && selParams.covName) {
							defaultOpt = selParams.covName;
						} else if (selectorName === 'Coordinate') {
							defaultOpt = defaultCoord ? defaultCoord + (cid+1) : null;
						} else {
							defaultOpt = defaultCovar;
						}
						let onlyContinuous = selectorName === 'Coordinate'
						sss[cid].selOpt = addCovariateOptions (defaultOpt, axis1Config, selectEl, selectedElementsOption, onlyContinuous);
					}
					updateAxis();
					const userLabel = createLabeledTextInput(selParams.label);
					optionsBox.appendChild (userLabel.element);
					sss[cid].userLabel = userLabel;

					sss[cid].grabbers = {};

					const countNode = NgChm.UTIL.newTxt ('0 ' + otherAxis + 's');
					const infoEl = NgChm.UTIL.newElement ('DIV.nodeSelector.hide', {}, [
						NgChm.UTIL.newElement('SPAN.leftLabel', {}, [
							NgChm.UTIL.newTxt ('Selected')
						]),
						countNode,
						NgChm.UTIL.newButton('GRAB', {}, {}),
						NgChm.UTIL.newButton('SHOW', {}, {})
					]);
					sss[cid].grabbers.clearData = function() {
						while (sss[cid].data.length > 0) sss[cid].data.pop();
					};
					if (selParams.type === 'data' && selParams.labelIdx) {
						for (let ii = 0; ii < selParams.labelIdx.length; ii++) {
							sss[cid].data.push (selParams.labelIdx[ii]);
						}
					}
					sss[cid].grabbers.setSummary = function(label) {
						const data = sss[cid].data;
						countNode.textContent = '' + data.length + ' ' + otherAxis + 's';
						const selectedItem = sss[cid].select.children[sss[cid].select.selectedIndex];
						if (sss[cid].select.selectedIndex === sss[cid].select.length-1) {
							infoEl.classList.remove ('hide');
							if (label) {
								userLabel.setLabel ( label);
							} else if (data.length === 0) {
								if (selectorName === 'Coordinate') {
									userLabel.setLabel ( 'Undefined');
								} else {
									userLabel.setLabel ( '');
								}
							} else if (data.length === 1) {
								userLabel.setLabel ( NgChm.heatMap.getAxisLabels(otherAxis).labels[data[0]-1]);
							} else {
								userLabel.setLabel ( 'Average of ' + countNode.textContent);
							}
						} else {
							infoEl.classList.add ('hide');
							if (label) {
								userLabel.setLabel ( label);
							} else {
								userLabel.setLabel ( selectedItem.value.replace(/\.coordinate\./, ' '));
							}
						}
					};
					sss[cid].setSummary = function setSummary (label) {
						sss[cid].grabbers.setSummary (label);
					};
					sss[cid].setSummary (selParams.label);

					infoEl.children[1].onclick = function (e) {
						if (debug) console.log ('GRAB');
						const results = NgChm.SRCH.getAxisSearchResults(otherAxis)
						if (results.length < 1) {
							NgChm.UHM.systemMessage('Nothing to GRAB','To add to the selection: highlight labels on the appropriate axis of the NG-CHM and click "GRAB"');
							return;
						}
						sss[cid].grabbers.clearData();
						sss[cid].data = NgChm.SRCH.getAxisSearchResults(otherAxis);
						if (debug) console.log ({ m: 'Grabbed', results: sss[cid].data });
						sss[cid].grabbers.setSummary();
					};
					infoEl.children[2].onclick = function (e) {
						if (debug) console.log ('SHOW');
						if (sss[cid].data.length < 1) {
							NgChm.UHM.systemMessage('Nothing to SHOW','To add to the selection: highlight labels on the appropriate axis of the NG-CHM and click "GRAB"');
							return;
						}
						NgChm.SRCH.clearAllAxisSearchItems (otherAxis);
						NgChm.SRCH.setAxisSearchResultsVec (otherAxis, sss[cid].data);
						NgChm.UTIL.redrawSearchResults ();
					};
					optionsBox.appendChild (infoEl);
					selectEl.onchange = function (e) {
						sss[cid].setSummary();
					};
				}
			}  // end function createLinearSelectors

			/**
				Creates the selectors for choosing groups in the gear menu.
				@function createGroupSelectors
				@param {object} sss
				@param {int} numSelectors Number of selectors to create
				@param {string} selectorName
				@param {object} params
			*/
			function createGroupSelectors (sss, numSelectors, selectorName, params, lastApplied) {
				const debug = false;
				params = params || [];
				var thisText = textN(NgChm.UTIL.capitalize(selectorName))
				for (let cid = 0; cid < 1+0*numSelectors; cid++) {
					optionsBox.appendChild (
						NgChm.UTIL.newElement('SPAN.leftLabel', {}, [
							NgChm.UTIL.newTxt(textN(NgChm.UTIL.capitalize(selectorName), cid+1, 1+0*numSelectors))
						])
					)
					optionsBox.appendChild(
						NgChm.UTIL.newElement('a.helpQuestionMark',{},[], e=> {
							e.onmouseover = function() {
								let helpText = 'Specify groups for statistical tests by first selecting a covariate or'
								helpText += ' \'Selected '+thisAxis+'s for Group(s):\' from this dropdown.';
								NgChm.UHM.hlp(this, helpText, 400, 0, 0)
							};
							e.onmouseout = function() { NgChm.UHM.hlpC()};
							return e;
						})
					)
					const selectEl = NgChm.UTIL.newElement('SELECT#gearDialogCovariateSelect');
					optionsBox.appendChild (
						selectEl
					);
					sss.push ({
						select: selectEl,
						axisName: otherAxis,
						data: [],
						updateAxis
					});

					const selParams = cid < params.length ? params[cid] : {};
					sss[cid].updateAxis();

					sss[cid].userLabels = [];
					sss[cid].grabbers = [];
					sss[cid].rangeSelectors = []
					sss[cid].discreteSelectors = []
					for (let idx = 0; idx < numSelectors; idx++) {
						sss[cid].data.push([]);
						const groupName = selParams.labels && idx < selParams.labels.length ? selParams.labels[idx] : 'Undefined';
						sss[cid].userLabels.push(createLabeledTextInput(groupName, idx+1, numSelectors));
						optionsBox.appendChild (sss[cid].userLabels[idx].element); // append text box for label
						sss[cid].grabbers.push(createLabelGrabber (thisAxis, sss[cid].userLabels[idx], idx));
						optionsBox.appendChild (sss[cid].grabbers[idx].element); // append GRAB/SHOW
						sss[cid].rangeSelectors.push(createRangeSelector(idx+1, numSelectors));
						optionsBox.appendChild (sss[cid].rangeSelectors[idx].element) // append range selector
						sss[cid].discreteSelectors.push(createDiscreteSelector(idx+1, numSelectors));
						optionsBox.appendChild (sss[cid].discreteSelectors[idx].element) // append range selector
					}

					function isGrabberSelected () {
						const idx = sss[cid].select.selectedIndex;
						const item = sss[cid].select.children[idx];
						if (debug) console.log ({ m: 'isGrabberSelected', cid, idx, item, isSelected: item === sss[cid].selOpt });
						return item === sss[cid].selOpt;
					}

					function updateAxis() {
						// Remove choices for previous axis, if any.
						while (selectEl.firstChild) selectEl.removeChild(selectEl.firstChild);
						const uname = ' for ' + selectorName;
						const selectedElementsOption = selectedElementsOptionName (otherAxis, uname);
						let defaultOpt;
						if (selParams.type === 'data') {
							defaultOpt = selectedElementsOption;
						} else if (selParams.type === 'covariate' && selParams.covName) {
							defaultOpt = selParams.covName;
						} else if (selectorName === 'Coordinate') {
							defaultOpt = defaultCoord ? defaultCoord + (cid+1) : null;
						} else {
							defaultOpt = defaultCovar;
						}
						sss[cid].selOpt = addCovariateOptions (defaultOpt, axis1Config, selectEl, selectedElementsOption, false);
						if (selParams.type === 'data' && selParams.labelIdx) {
							for (let ii = 0; ii < selParams.labelIdx.length; ii++) {
								sss[cid].data.push (selParams.labelIdx[ii]);
							}
						}
						if (sss[cid].grabbers) {
							for (let idx = 0; idx < numSelectors; idx++) {
								sss[cid].grabbers[idx].updateAxis (thisAxis);
							}
						}
					}

					function clearData(idx) {
						while (sss[cid].data[idx].length > 0) sss[cid].data[idx].pop();
					}

					/**
						Creates the 'GRAB' and 'SHOW' buttons and their functionality
						@function createLabelGrabbber
						@param {String} axisName
						@param {Object} userLabel
						@param {int} idx group index (starts at 0)
						@return {Object} 
						@option {element} infoEl DIV element
						@option {function} clearData is actually defined outside this function
						@option {function} setSummary maybe sets the value? I'm not 100% sure
						@option {function} updateAxis
					*/
					function createLabelGrabber (axisName, userLabel, idx) {
						const countNode = NgChm.UTIL.newTxt ('0 ' + axisName + 's');
						const infoEl = NgChm.UTIL.newElement ('DIV.nodeSelector.hide', {}, [
							NgChm.UTIL.newElement('SPAN.leftLabel', {}, [
								NgChm.UTIL.newTxt ('Selected')
							]),
							countNode,
							NgChm.UTIL.newButton('GRAB', {}, { click: doGrab }),
							NgChm.UTIL.newButton('SHOW', {}, { click: doShow })
						]);
						let axisNameU;
						updateAxis(axisName);

						function doGrab (e) {
							if (debug) console.log ('GRAB');
							if (NgChm.SRCH.getAxisSearchResults(axisNameU).length < 1) {
								NgChm.UHM.systemMessage('Nothing to GRAB','To add to the selection: highlight labels on the appropriate axis of the NG-CHM and click "GRAB"');
								return;
							}
							clearData(idx);
							let count = 0;
							NgChm.SRCH.getAxisSearchResults(axisNameU).forEach(si => {
								if (debug) console.log ({ m: 'Grabbed', si });
								sss[cid].data[idx].push (si);
								count++;
							});
							setSummary(true);
						}
						function doShow (e) {
							if (debug) console.log ('SHOW');
							if (sss[cid].data[idx].length < 1) {
								NgChm.UHM.systemMessage('Nothing to SHOW','To add to the selection: highlight labels on the appropriate axis of the NG-CHM and click "GRAB"');
								return;
							}
							NgChm.SRCH.clearAllAxisSearchItems (axisNameU);
							NgChm.SRCH.setAxisSearchResultsVec (axisNameU, sss[cid].data[idx]);
							NgChm.UTIL.redrawSearchResults ();
						}
						function updateAxis (newAxis) {
							axisName = newAxis;
							axisNameU = NgChm.MMGR.isRow(axisName) ? "Row" : "Column";
						}
						function setSummary (selected, label) {
							const data = sss[cid].data[idx];
							countNode.textContent = '' + data.length + ' ' + axisName + 's';
							if (selected) {
								infoEl.classList.remove ('hide');
								if (label) {
									userLabel.setLabel ( label );
								} else if (data.length === 0) {
									if (selectorName === 'Coordinate') {
										userLabel.setLabel ( 'Undefined');
									} else {
										userLabel.setLabel ( 'Undefined');
									}
								} else if (data.length === 1) {
									userLabel.setLabel ( NgChm.heatMap.getAxisLabels(axisName).labels[data[0]-1]);
								} else {
									userLabel.setLabel ( 'Group of ' + countNode.textContent);
								}
							} else {
								infoEl.classList.add ('hide');
							}
						}
						return { element: infoEl, clearData, setSummary, updateAxis };
					} // end function createLabelGrabber

					/**
							Function to create the div for choosing groups from cont covariates.

							This function creates the DIV.rangeSelector, which has the DOM elemnts that
							allow the user to choose ranges (e.g. '>=1.3<3') for making groups 
							from continuous covariates.

							@function createRangeSelector
							@param {int} nth group number
							@param {int} nmax max number of groups
							@return {Object} 
							@option {element} element reange selector DIV element
							@option {function} setRange function to set value of the range element
							@option {function} getRange function to get value of the range element
							@option {function} setSummary function for showing/hiding the element 
							@option {function} showMinMax function to show the min/max covariates to help user
					*/
					function createRangeSelector(nth, nmax) {
						let label = 'Group ';
						const groupIdx = nth - 1;
						if (nmax && nmax > 1) {
							label = label + ' ' + nth;
						}
						const rangeSelectorEl = NgChm.UTIL.newElement ('DIV.rangeSelector.hide', {}, [
							NgChm.UTIL.newElement('SPAN.leftLabel', {}, [NgChm.UTIL.newTxt (label)]),
							NgChm.UTIL.newElement('a.helpQuestionMark',{},[],e => {
								e.onmouseover = function() {
									let helpText = 'Use the text boxes to enter a range for selection of groups based on continuous covariate values.'
									let testElem = document.getElementById('gearDialogTestSelect');
									let selectedTest = testElem.options[testElem.selectedIndex].value;
									if (selectedTest == 'Mean') {
										helpText += '<br><br><u>Mean:</u> <br>If only Group 1 is specified, the mean value of Group 1 will be calculated.'
										helpText += '<br>If both groups are specified, the difference in means between Group 1 and Group 2 will be calculated.';
									} else if (selectedTest == 'T-test') {
										helpText += '<br><br><u>T-test:</u><br>If only Group 1 is specified, then Group 2 is automatically all elements NOT in Group 1.';
									}
									NgChm.UHM.hlp(this, helpText, 200, undefined, 0)
								};
								e.onmouseout = function(){NgChm.UHM.hlpC()};
								return e;
							}),
							NgChm.UTIL.newElement('BR'),NgChm.UTIL.newElement('SPAN.gear-menu-spacing'),
							NgChm.UTIL.newElement('SPAN.leftLabel', {}, [ NgChm.UTIL.newTxt ('')]),
							NgChm.UTIL.newElement('BR'),NgChm.UTIL.newElement('SPAN.gear-menu-spacing'),
							NgChm.UTIL.newElement('INPUT',{'data-covariate-group':groupIdx})
						]);
						rangeSelectorEl.lastChild.type = 'text';
						rangeSelectorEl.lastChild.placeholder = 'e.g.: >=1.1<3.2';
						rangeSelectorEl.lastChild.onchange = getIndexes
						return {element: rangeSelectorEl, setSummary, showMinMax, setRange, getRange}

						/** Function to show / hide the range DIV */
						function setSummary(show) {
							if (show) {
								rangeSelectorEl.classList.remove('hide')
							} else {
								rangeSelectorEl.classList.add('hide')
							}
						}
						/** Function to show the min & max values as text to help user in making ranges */
						function showMinMax(v) {  
							rangeSelectorEl.children[4].innerHTML = v;
						}
						/** Function to set value of range */
						function setRange(v) { 
							rangeSelectorEl.lastChild.value = v;
						}
						/** Function to get value of range */
						function getRange() { 
							return rangeSelectorEl.lastChild.value;
						}
						/* Function to parse range string and get indexes for covariates that fall within the range string.
						   This is the onchange function for the range INPUT boxes (rangeSelectorEl.lastChild).
						*/
						function getIndexes(e) { // gets index values from range to add to sss
							const selectedCov = selectEl.options[selectEl.selectedIndex].value;
							const [ isValid, searchResults ] = NgChm.SRCH.continuousCovarSearch (thisAxis, selectedCov, e.target.value);
							if (!isValid) {
								NgChm.UHM.systemMessage('Invalid Range Text','ERROR: Range selection text is not valid. Examples of acceptable ranges: ">2<=5", ">=1<10"');
								return;
							}
							const groupIndex = e.target.getAttribute('data-covariate-group')
							sss[cid].data[groupIndex] = searchResults;
							const common = sss[cid].data[0].filter(value => sss[cid].data[1].includes(value))
							if (common.length > 0) {
								NgChm.UHM.systemMessage('Group Selection Warning',
									  "WARNING: Groups are not mutually exclusive in Gear Dialog.")
							}
						}
					}  // end function createRangeSelector

					/**
							Function to create the div for choosing groups from discrete covariates.

							This function creates the DIV.discreteSelector, which has the DOM elemnts that
							allow the user to check checkboxes of discrete covariates for making groups 
							from discrete covariates.

							@function createDiscreteSelector
							@param {int} nth group number
							@param {int} nmax max number of groups
							@return {Object} 
							@option {element} element reange selector DIV element
							@option {function} setRange function to set value of the range element
							@option {function} setSummary function for showing/hiding the element 
							@option {function} showMinMax function to show the min/max covariates to help user
					*/
					function createDiscreteSelector(nth, nmax) {
						const groupIdx = nth - 1;
						let label = 'Group';
						if (nmax && nmax > 1) {
							label = label + ' ' + nth;
						}
						const discreteSelectorEl = NgChm.UTIL.newElement ('DIV.discreteSelector.hide', {}, [
							NgChm.UTIL.newElement('SPAN.leftLabel', {}, [NgChm.UTIL.newTxt (label)]),
							NgChm.UTIL.newElement('a.helpQuestionMark',{},[],e=>{
								e.onmouseover = function(){
									let helpText = 'Use the checkboxes to select groups based on covariate value.'
									let testElem = document.getElementById('gearDialogTestSelect');
									let selectedTest = testElem.options[testElem.selectedIndex].value;
									if (selectedTest == 'Mean') {
										helpText += '<br><br><u>Mean:</u> <br>If only Group 1 is specified, the mean value of Group 1 will be calculated.'
										helpText += '<br>If both groups are specified, the difference in means between Group 1 and Group 2 will be calculated.';
									} else if (selectedTest == 'T-test') {
										helpText += '<br><br><u>T-test:</u><br>If only Group 1 is specified, then Group 2 is automatically all elements NOT in Group 1.';
									}
									NgChm.UHM.hlp(this, helpText, 200, undefined, 0)
								};
								e.onmouseout = function(){NgChm.UHM.hlpC()};
								return e;
							})
						])
						return { element: discreteSelectorEl, setSummary, getCheckBoxes, setCheckBoxes };

						/** Function to set values of checkboxes */
						function setCheckBoxes(checkboxValues) {
							for (let i=0; i<checkboxValues.length; i++) {
								discreteSelectorEl.lastChild.children[i].children[0].value = checkboxValues[i].value;
								discreteSelectorEl.lastChild.children[i].children[0].checked = checkboxValues[i].checked;
							}
						}

						/** Function to get current values of checkboxes */
						function getCheckBoxes() {
							let checkboxValues = [];
							discreteSelectorEl.lastChild.children
							for (let i=0; i<discreteSelectorEl.lastChild.children.length; i++) {
								checkboxValues.push({
									value: discreteSelectorEl.lastChild.children[i].children[0].value,
									checked: discreteSelectorEl.lastChild.children[i].children[0].checked
								})
							}
							return checkboxValues;
						}

						/** Function to show/hide DIV.discreteSelector, and to create checkboxes for selected covariate */
						function setSummary(show) {
							if (show) {
								while (discreteSelectorEl.children.length > 2) {
									discreteSelectorEl.removeChild(discreteSelectorEl.lastChild);
								}
								discreteSelectorEl.classList.remove('hide')
								let checkboxDivElem = NgChm.UTIL.newElement('DIV.gear-dialog-dropDownCheckBoxes-inline')
								const selectedCov = selectEl.options[selectEl.selectedIndex].value;
								const covariateThresholds = NgChm.heatMap.getAxisCovariateConfig(thisAxis)[selectedCov].color_map.thresholds;
								document.querySelectorAll('[data-checkbox-label-group="'+groupIdx+'"]').forEach(el => el.parentNode.removeChild(el)); // rm old ones
								covariateThresholds.forEach((covThresh,ctIdx) => { // create checkbox for each value
									let checkboxElem = NgChm.UTIL.newElement('LABEL.gear-dialog-checkboxes',{'data-checkbox-label-group': groupIdx}, [
										NgChm.UTIL.newElement('INPUT',{type:'checkbox',value:covThresh,'data-checkbox-covariate-group': groupIdx}),
										NgChm.UTIL.newTxt(covThresh)
									]);
									checkboxElem.appendChild(NgChm.UTIL.newElement('BR'))
									checkboxElem.onchange = getIndexes
									checkboxDivElem.appendChild(checkboxElem);
								})
								discreteSelectorEl.appendChild(checkboxDivElem);
							} else {
								discreteSelectorEl.classList.add('hide')
							}
						}

						/** Function to get indexes for covariates for the checked boxes for each group
						   This is the onchange function for each of the checkboxes (checkboxElem.onchange above).
						   This is because of the exclusivity requirement between the groups. 
						   Somewhat differently from the range selectors, here the sss[cid].data is updated for all
						   groups when any of the checkboxes are changed. This is also somewhat inefficient.
						*/
						function getIndexes(e) { 
							document.querySelectorAll('[value="'+e.target.value+'"]').forEach(cb => { // ensure mutually exclusive groups
								if (cb !== e.target) {cb.checked = false;}
							})
							const selectedCov = selectEl.options[selectEl.selectedIndex].value;
							const covariateValues = NgChm.heatMap.getAxisCovariateData(thisAxis)[selectedCov].values;
							for (let groupIndex=0; groupIndex<nmax; groupIndex++) {
								sss[cid].data[groupIndex] = [] // clear any old values
								let checkedValues = []
								const checkboxEls = sss[cid].discreteSelectors[groupIndex].element.children.item(2).children;
								Array.from(checkboxEls).forEach((cb, i) => {
									if (cb.firstChild.checked === true) { checkedValues.push(cb.firstChild.value) }
								})
								covariateValues.forEach((cv,i) => {
									if (checkedValues.indexOf(cv) > -1) { sss[cid].data[groupIndex].push(String(i)) }
								})
							}
						}
					} // end function createDiscreteSelector


					/*
							Function to set sub-options for the group selector after the user has chosen
							something from the dropdown for this group selector. For example, if the
							user has chosen 'Selected columns for Groups(s)', the SHOW & GRAB buttons are displayed.
						
						This is the main setSummary for choosing groups.
						This will fill in the last applied values if they exist.
					*/
					sss[cid].setSummary = function setSummary (selectedValue, labels) {
						if (isGrabberSelected()) {
							sss[cid].rangeSelectors.forEach((s) => s.setSummary(false)); // hide the range selectors
							sss[cid].discreteSelectors.forEach((s) => s.setSummary(false)); // hide the discrete selectors
							for (let idx = 0; idx < numSelectors; idx++) {
								sss[cid].grabbers[idx].setSummary(true, selectedValue);
							}
						} else {  // covariate bar selected
							const selectedIndex = sss[cid].select.selectedIndex;
							const selectedCovariate = sss[cid].select.children[selectedIndex].value;
							const typeContOrDisc = NgChm.heatMap.getAxisCovariateConfig(thisAxis)[selectedCovariate].color_map.type;
							if (typeContOrDisc === 'continuous') {
								sss[cid].rangeSelectors.forEach((s) => s.setSummary(true)); // show the range selectors
								sss[cid].discreteSelectors.forEach((s) => s.setSummary(false)); // hide the discrete selectors
								const covariateValues = NgChm.heatMap.getAxisCovariateData(thisAxis)[selectedCovariate].values
								                              .filter(x=>{return !isNaN(x)})
								                              .map(x => parseFloat(x));
								let minCovValue = Math.min(...covariateValues);
								let maxCovValue = Math.max(...covariateValues);
								let rangeMinMaxText = '(Min: '+minCovValue+', Max: '+maxCovValue+')';
								sss[cid].rangeSelectors.forEach((s) => s.showMinMax(rangeMinMaxText)); // show user the min/max values
								if (lastApplied[cid].hasOwnProperty('rangeStrings') && lastApplied[cid].covariate == selectedValue) {
									sss[cid].rangeSelectors.forEach((s,sidx) => s.setRange(lastApplied[cid].rangeStrings[sidx])); // <-- set value to last applied
									sss[cid].rangeSelectors.forEach((s) => {let e = new Event('change'); s.element.lastChild.dispatchEvent(e)}); // <-- trigger onchange event
								}
							} else if (typeContOrDisc === 'discrete') {
								sss[cid].rangeSelectors.forEach((s) => s.setSummary(false)); // hide the range selectors
								sss[cid].discreteSelectors.forEach((s) => s.setSummary(true)); // show the discrete selectors
								if (lastApplied[cid].hasOwnProperty('discreteCheckboxes') && lastApplied[cid].covariate == selectedValue) { 
									sss[cid].discreteSelectors.forEach((s,sidx) => s.setCheckBoxes(lastApplied[cid].discreteCheckboxes[sidx])) // set last applied values
									sss[cid].discreteSelectors.forEach((s) => {let e = new Event('change'); s.element.lastChild.lastChild.dispatchEvent(e)}); // trigger onchange
								}
							} else { console.error('Unknown covariate type') }
							const item = sss[cid].select.children[selectedIndex];
							if (debug) console.log ({ m: 'selector setSummary', cid, selectedIndex, item, isGrabber: item === sss[cid].selOpt });
							for (let idx = 0; idx < numSelectors; idx++) {
								sss[cid].grabbers[idx].setSummary(false);
								if (labels) {  
									sss[cid].userLabels[idx].setLabel ( labels[idx]);
								} else {
									let groupNumber = idx + 1
									sss[cid].userLabels[idx].setLabel ('Group '+groupNumber+' for '+ item.value.replace(/\.coordinate\./, ' '));
								}
							}
						}
					}; // end setSummary for group selection

					sss[cid].setSummary (selParams.selectValue, selParams.labels, lastApplied);
					selectEl.onchange = function (e) {
						sss[cid].setSummary();
					};
				}
			}  // end function createGroupSelectors

			if (config.axes[axisId].coco == null) config.axes[axisId].coco = [];
			const pa = params.axes && axisId < params.axes.length ? params.axes[axisId] : { cocos:[], groups: [] };
			// create UI for choosing coordiantes / covariates 
			for (let cocoidx = 0; cocoidx < config.axes[axisId].coco.length; cocoidx++) {
				const coco = config.axes[axisId].coco[cocoidx];
				axis1Coco[coco.baseid] = [];
				let helpText = coco.helpText;
				createLinearSelectors (axis1Coco[coco.baseid], coco.max, coco.name, pa[pa.cocos[cocoidx]+'s'], helpText); 
			}
			if (config.axes[axisId].group == null) config.axes[axisId].group = [];
			// create UI for choosing groups 
			for (let groupidx = 0; groupidx < config.axes[axisId].group.length; groupidx++) {
				const group = config.axes[axisId].group[groupidx];
				axis1Coco[group.baseid] = [];
				createGroupSelectors (axis1Coco[group.baseid], group.max, group.label, pa[pa.groups[groupidx]+'s'], lastApplied);
			}
			const theseOpts = {
				select: axis1Select,
				data: axis1Data,
				dataTypeName: 'group',
				groups: [],
				cocos: []
			};
			// add coordiante/covariate information to theseOpts
			for (let cocoidx = 0; cocoidx < config.axes[axisId].coco.length; cocoidx++) {
				const coco = config.axes[axisId].coco[cocoidx];
				theseOpts[coco.baseid+'s'] = axis1Coco[coco.baseid];
				theseOpts.cocos.push (coco.baseid);
			}
			// add groups information to theseOpts
			for (let groupidx = 0; groupidx < config.axes[axisId].group.length; groupidx++) {
				const group = config.axes[axisId].group[groupidx];
				theseOpts[group.baseid+'s'] = axis1Coco[group.baseid];
				theseOpts.groups.push (group.baseid);
			}
			axesOptions.push (theseOpts);
			axis1Select.onchange = function(e) { // this is when the selector with 'data-type = axis' changes
				setAxis (e.srcElement.value);
				if (debug) console.log ('Selected axis changed to ' + thisAxis);
				for (let coco of config.axes[axisId].coco) { updateSelector (coco); }
				for (let group of config.axes[axisId].group) { updateSelector (group); }
				function updateSelector (coco) {
					axis1Coco[coco.baseid][0].updateAxis();
					for (let cid = 0; cid < coco.max; cid++) {
						axis1Coco[coco.baseid][cid].updateAxis();
						//while (axis1Coco[coco.baseid][cid].data.length > 0) {axis1Coco[coco.baseid][cid].data.pop()}
						for (let gidx=0; gidx<axis1Coco[coco.baseid][cid].grabbers.length; gidx++) {
							axis1Coco[coco.baseid][cid].grabbers[gidx].clearData(gidx);
						}
						axis1Coco[coco.baseid][cid].setSummary();
						if (axis1Coco[coco.baseid][cid].hasOwnProperty('userLabel')) {axis1Coco[coco.baseid][cid].userLabel.setLabel('')}
						axis1Coco[coco.baseid][cid].select.onchange(null);
					}
				}
			};
		}   // end for loop over  config.axes.length (loop variable = axisId)

		// Create a DIV.userLabel that displays as Label: <text input>
		// If specified, iValue is the initial value of the text input.
		// The returned value is an object with the following fields:
		// .element  The created DIV element.
		// .setLabel Method for changing the labels value.
		//
		function createLabeledTextInput (iValue, nth, nmax) {
			let label = 'Label';
			if (nmax && nmax > 1) {
				label = label + ' ' + nth;
			}
			const userLabelEl = NgChm.UTIL.newElement ('DIV.userLabel', {}, [
				NgChm.UTIL.newElement('SPAN.leftLabel', {}, [ NgChm.UTIL.newTxt (label) ]),
				NgChm.UTIL.newElement('INPUT',{maxlength: "50"})
			]);
			userLabelEl.children[1].type = 'text';
			if (iValue) userLabelEl.children[1].value = iValue;
			return { element: userLabelEl, setLabel };

			function setLabel (v) {
				userLabelEl.children[1].value = v;
			}
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
				if (opts[oi].helpText) {
					let helpElem = NgChm.UTIL.newElement('a.helpQuestionMark',{},[], e=> {
						e.onmouseover = function() {NgChm.UHM.hlp(this, opts[oi].helpText, 200, true, 0)};
						e.onmouseout = function() {NgChm.UHM.hlpC()};
						return e;
					})
					opt.appendChild(helpElem);
				}
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
				} else if (opts[oi].type === 'text') {
					const input = NgChm.UTIL.newElement('INPUT');
					input.type = opts[oi].type;
					input.value = optParam !== null ? optParam : opts[oi].default;
					opt.append (input);
				} else if (opts[oi].type === 'dropdown') {
					const input = NgChm.UTIL.newElement('SELECT');
					let selectedIndex = 0;
					let choices = opts[oi].choices;
					if (!Array.isArray(choices)) choices = [ choices ];
					let idx = 0;
					for (const cc of choices) {
						if (typeof cc === "string") {
							if (cc === "STANDARD TESTS") {
								input.id = 'gearDialogTestSelect';
								for (const t of vanodiKnownTests) {
									const choice = NgChm.UTIL.newElement('OPTION');
									choice.value = t.value;
									if (t.value === optParam) selectedIndex = idx;
									choice.innerText = t.label;
									input.append(choice);
									idx++;
								}
							} else {
								console.log ("Unknown choice string: " + cc);
							}
						} else {
							const choice = NgChm.UTIL.newElement('OPTION');
							choice.value = cc.value;
							if (cc.value == optParam) selectedIndex = idx;
							choice.innerText = cc.label;
							input.append(choice);
							idx++;
						}
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
				let e = Array.from(element.children[oi].children).filter(ele => {return (ele.nodeName === 'SELECT' || ele.nodeName === 'INPUT')})[0]
				if (o.type === 'checkbox') {
					values[o.label] = e.checked;
				} else if (o.type === 'dropdown' || o.type === 'text') {
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
			const label = coord.userLabel.element.children[1].value; //.select.value.replace(/\.coordinate\./, ' ');
			const choice = coord.select.children[coord.select.selectedIndex];
			const type = choice.dataset.type;
			if (type === 'data') {
				return ({ type, label, labelIdx: coord.data });
			} else {
				return ({ type, label, covName: coord.select.value });
			}
		}

		function selectToGroups (coord) {
			const labels = coord.userLabels.map(ul => ul.element.children[1].value);
			const choice = coord.select.children[coord.select.selectedIndex];
			const type = choice.dataset.type;
			return ({ type, selectValue: coord.select.value, labels, labelIdx: coord.data, covName: coord.select.value });
		}

		/**
			Function to convert the user selections from DOM elements in the Gear Dialog into data to send to the plugins.
			
			The aEls object has additional key/value pairs depending on the arrays 'cocos' and 'groups'. For example,
			if cocos = ['coordinate', 'covariate'] and groups = ['ugroup'], there will be three additional keys
			in aEls: 'coordinates', 'covariates', and 'ugroups'. Note the additional 's' on the name.

			- coordaintes: Array of objects relating to DOM elements for user selection of 'coordinates',
			- covariates: Array of objects relating to DOM elements for user selection of 'covariates',
			- ugroups: Array of objects relating to DOM elements for user selection of 'ugroups'.
			
			The return value of this function will become the 'axes' key to the plotParams object. This is part
			of the data sent to the plugins. This return object has the same general structure as the aEls input 
			object. Below is some description of the structure of this 'ops' return object:

			- cocos: Same as input
			- coordinates: Specific to this example. Array of objects of information extracted from DOM element. Example:

					[
						{
							type: 'covariate' // for data obtained from covariate bar
							label: <user-specified label> // from the text box in Gear Menu
							covName: <name of covariate bar>
						},
						{
							type: 'data' // for data obtained from GRAB/SHOW
							label: <user-specified label> // from the text box in Gear Menu
							labelIdx: Array of indexes of NGCHM rows or columns 
						}
					]

			- groups: Same as input
			- ugroups: Specific to this example. Array of objects of information extracted from DOM element. Example:

					[
						{
							labelIdx: Array of arrays of indexes of NGCHM rows or columns. One array for each group,
							labels: Array of user-specified labels // from the text boxes in the Gear Menu
							selectValue: value from the, in this example, 'Group(s)' dropdown. In this example this is one of the covariate bars or something to let you know the GRAB/SHOW was used
							type: 'data'
						}
					]

			- data:  ??


				@param {object} aEls Object of selection-element stuff
				@option {Array<String>} cocos Array of names of coordinate/covariate data to send to plugin. E.g.: ['coordiante', 'covariate'].
					       There will be an additional key in the aEls object for each item in this list, with and added 's'. 
					       In this example, that means there are two additional keys: 'coordinates' and 'covariates'
				@option {Array<String>} groups Similar to 'cocos'. Array of names of group data to send to plugin. E.g.: ['ugroup']
					        There will be an additional key in the aEls object for each item in this list, with and added 's'.
					        In this example, that means there is an additional key: 'ugroups'.
				@option {String} dataTypeName ??
				@option {Array<>} data 
				@option {Element} select DOM element for selecting between 'row' and 'column'
				@return {object} The value for the 'axes' key to the plotParams object. This is part of the data sent to the plugins. The 
				       same general structure as for the 'aEls' input object. See the more detailed description below.
		*/
		function axesElementsToOps (aEls) {
			const ops = {
				axisName: aEls.select.value,
				data: aEls.data.map(axisC => selectToCoordinate (axisC)),
				cocos: aEls.cocos,
				groups: aEls.groups
			};
			for (let idx = 0; idx < aEls.cocos.length; idx++) {
				const f = aEls.cocos[idx] + 's';
				ops[f] = aEls[f].map(axisC => selectToCoordinate (axisC));
			};
			for (let idx = 0; idx < aEls.groups.length; idx++) {
				const f = aEls.groups[idx] + 's';
				ops[f] = aEls[f].map(axisC => selectToGroups (axisC));
			};
			return ops;
		}

		function saveLastApplied(aEls) {
			let lastApplied = {};
			lastApplied.axis = aEls.select.value;
			lastApplied.rangeStrings = [];
			lastApplied.discreteCheckboxes = [];
			for (let idx=0; idx<aEls.groups.length; idx++) {
				const f = aEls.groups[idx] + 's';
				let selectedCovElem = Array.from(aEls[f][idx].select.children).filter(e => {
					return e.selected === true;
				})
				if (selectedCovElem.length != 1) { console.error('Expecting 1 coviariate') }
				lastApplied.covariate = selectedCovElem[0].value;
				for (let jdx=0; jdx<aEls[f][idx].rangeSelectors.length; jdx++) {
					lastApplied.rangeStrings[jdx] = aEls[f][idx].rangeSelectors[jdx].getRange()
					lastApplied.discreteCheckboxes[jdx] = aEls[f][idx].discreteSelectors[jdx].getCheckBoxes();
				}
			}
			if (aEls.hasOwnProperty('coordinates')) {
				lastApplied.coordinates = aEls.coordinates.map(elem => {return elem.data})
			}
			if (aEls.hasOwnProperty('covariates')) {
				lastApplied.covariates = aEls.covariates.map(elem => {return elem.data})
			}
			return lastApplied;
		}

		/**
			Function to verify minimum required entries for coordinates and groups are present
			before sending data to plugin.

			This function verifies that the labelIdx entries are non-empty, alerts the user, and returns 'false'.
			Otherwise this function returns 'true'.
			
			The config object is used to determine which plotParams to validate.
			
			For cocos: since user is choosing from a dropdown, we only need to test the type = 'data' (because 
			otherwise the values are comming from a covariate bar).
			
			@function validateParams
			@param {Object} plotParams Parameters sent to plugin
		*/
		function validateParams(plotParams) {
			var minNumberRequired, thingToCheck
			for (var a=0; a<config.axes.length; a++) {
				for (var c=0; c<config.axes[a].coco.length; c++) { 
					minNumberRequired = config.axes[a].coco[c].min 
					for (var i=0; i<minNumberRequired; i++) {
						thingToCheck = config.axes[a].coco[c].baseid + 's'
						var cocoToCheck = plotParams.axes[a][thingToCheck]
						for (var j=0; j<minNumberRequired; j++) { 
							if (cocoToCheck[j].type == 'data' && cocoToCheck[j].labelIdx.length == 0) { 
								var entryNumber = j+1         
								NgChm.UHM.systemMessage('Missing Selection',
								   "Missing selection for " + config.axes[a].coco[c].name + " "+entryNumber+ " in Gear Dialog.")
								return false
							}
						}
					}
				} // end loop over config.axes.coco 
				for (var g=0; g<config.axes[a].group.length; g++) {
					minNumberRequired = config.axes[a].group[g].min
					for (var i=0; i<minNumberRequired; i++) {
						thingToCheck = config.axes[a].group[g].baseid + 's'
						var groupToCheck = plotParams.axes[a][thingToCheck][0]
						for (var j=0; j<minNumberRequired; j++) {
							if (groupToCheck.labelIdx[j].length == 0) {
								NgChm.UHM.systemMessage('Missing Selection',
								   "Missing selection for "+config.axes[a].group[g].label+" in Gear Dialog. At least " + minNumberRequired + " is required.")
								return false;
							}
						}
					}
				} // end loop over config.axes.group
			} // end loop over config.axes
			return true
		}

		/**
				Invoked when user clicks 'APPLY' button on gear menu. 

			This function constructs the plotParams object with:

					{
						axes: via a call to axesElementsToOps
						options: via a call to getPluginOptionValues
					}


			@function applyPanel
		*/
		function applyPanel() {
			let plotTitle = 'Heat Map Data';
			if (axesOptions.length === 1) {
				plotTitle = "Heat Map " + NgChm.UTIL.capitalize (axesOptions[0].select.value) + 's';
			}
			const plotParams = {
				plotTitle,
				axes: axesOptions.map(ao => axesElementsToOps (ao)),
				options: getPluginOptionValues (config.options, pluginOptions),
				lastApplied: axesOptions.map(ao => saveLastApplied(ao))
			};
			var paramsOK = validateParams(plotParams); 
			if (paramsOK) {
				NgChm.LNK.setPanePluginOptions (icon, plotParams);
			}
		}

		function resetPanel() {
			closePanel()
			newGearDialog(icon)
		}

		function closePanel() {
			NgChm.Pane.removePopupNearIcon (panel, icon);
		}

		panel.appendChild (NgChm.UTIL.newElement('DIV.buttonBox', {}, [
			NgChm.UTIL.newButton('APPLY', {}, { click: applyPanel }),
			NgChm.UTIL.newButton('RESET', {}, { click: resetPanel }),
			NgChm.UTIL.newButton('CLOSE', {}, { click: closePanel })
		]));

		NgChm.Pane.insertPopupNearIcon (panel, icon);
	}

	/**
		Processes messages from plugins

		@function processVanodiMessage
		@param {string} nonce nonce for plugin
		@param {} loc location of plugin
		@param {object} msg
		@option {string} op operation to perform. E.g. 'getTestData'
		@option {string} axisName 'row' or 'column'
		@option {Array<String>} axisLabels lNGCHM labels in heatmap along axisName dimension
		@option {Array<String>} group1 Optional. NGCHM labels in heat map for group 1
		@option {Array<Striong>} group2 Optional. NGCHM labels in heat map for group 2
		@option {String} testToRun Optional. String denoting tests to run. E.g. 'T-test'
	*/
	const vanodiMessageHandlers = {};
	function defineVanodiMessageHandler (op, fn) {
	    vanodiMessageHandlers[op] = fn;
	};
	function processVanodiMessage (instance, msg) {
	    const debug = false;
	    const fn = vanodiMessageHandlers[msg.op];
	    if (debug) console.log({ m: 'Processing Vanodi message', instance, msg, fn });
	    if (fn) fn (instance, msg);
	}

	defineVanodiMessageHandler ('register', function vanodiRegister (instance, msg) {
	        const loc = NgChm.Pane.findPaneLocation (instance.iframe);
		instance.plugin.config = { name: msg.name, axes: msg.axes, options: msg.options };
		if (Object.entries(instance.params).length === 0) {
		        NgChm.LNK.sendMessageToPlugin ({ nonce: msg.nonce, op: 'none' }); // Let plugin know we heard it.
			NgChm.Pane.switchToPlugin (loc, instance.plugin.name);
		} else {
			loc.paneTitle.innerText = instance.plugin.name;
			NgChm.LNK.initializePanePlugin (msg.nonce, instance.params);
		}
		NgChm.RecPanes.initializePluginWithMapConfigData(instance)
	});

	defineVanodiMessageHandler ('getLabels', function vanodiSendLabels (instance, msg) {
		if (msg.axisName === 'row' || msg.axisName === 'column') {
			NgChm.LNK.sendMessageToPlugin ({ nonce: msg.nonce, op: 'labels', labels: NgChm.UTIL.getActualLabels(msg.axisName) });
		} else {
			console.log ({ m: 'Malformed getLabels request', msg, detail: 'msg.axisName must equal row or column' });
		}
	});

	/* Message handler for when plugins send their data
	*/
	defineVanodiMessageHandler('sendingPluginData', function vanodiSaveData (instance, msg) {
		let pluginInstances = NgChm.LNK.getPluginInstances();
		pluginInstances[instance.nonce]['dataFromPlugin'] = msg.pluginData;
		NgChm.MMGR.saveDataFromPluginToMapConfig(instance.nonce, pluginInstances[instance.nonce]['dataFromPlugin']);
	})

	/*
		Send an NGCHM property to plugin.
		
		Post message to plugin with value of given property, typically in response to a 
		'getProperty' message from a plugin. 
		Example incoming message: {vanodi: {op: 'getProperty', propertyName: 'ndexUUIDs', nonce: <nonce>}}.
		These are properties added to the NGCHM at build time, for example by using
		the R function 'chmAddProperty()'. 
		
		Inputs:
			loc: location of plugin.
			msg: message from plugin. Should have attribute 'propertyName',
			     whose value is the name of the property to retrieve from the NGCHM.
	*/
	defineVanodiMessageHandler ('getProperty', function vanodiSendProperty (loc, msg) {
		if (!msg.hasOwnProperty('propertyName')) {
			console.error('Incoming message missing attribute "propertyName"')
			return
		}
		NgChm.LNK.sendMessageToPlugin ({
			nonce: msg.nonce,
			op: 'property',
			propertyName: msg.propertyName,
			propertyValue: linkouts.getAttribute(msg.propertyName) 
		});
	});

	const vanodiKnownTests = [
		{ label: 'Mean', value: 'Mean' },
		{ label: 'T-test', value: 'T-test' }
	];

	defineVanodiMessageHandler ('getTestData',
	    /**
		Calls getAxisTestData to perform statistical tests, and posts results to plugin

		@function vanodiSendTestData
		@param {object} instance Plugin instance msg applies to
		@param {object} msg
		@option {String} op Specifices operation to perform. here 'getTestData'
		@option {String} testToRun Specifies tests to perform
		@option {String} axisName 'row' or 'column'
		@option {Array<String>} axisLabels labels of nodes from plugin (e.g. gene symbols from PathwayMapper)
		@option {Array<String>} group1 NGCHM labels for group 1
		@option {Array<String>} group2 NGCHM labels for group 2
	    */
	    function vanodiSendTestData (instance, msg) {
		// axisName: 'row',
		// axisLabels: labels of axisName elements to test
		// testToRun: name of test to run
		// group1: labels of other axis elements in group 1
		// group2: labels of other axis elements in group 2 (optional)

		// msg.axisName
		if (msg.axisName != 'row' && msg.axisName != 'column') {
			console.log ({ m: 'Malformed getTestData request', msg, detail: 'msg.axisName must equal row or column' });
		} else if (vanodiKnownTests.map(t => t.label).indexOf(msg.testToRun) === -1) {
			console.log ({ m: 'Malformed getTestData request', msg, detail: 'unknown test msg.testToRun', vanodiKnownTests });
		} else if (msg.group1 == null) {
			console.log ({ m: 'Malformed getTestData request', msg, detail: 'group1 is required' });
		} else {
			var testData = getAxisTestData (msg);
			if (testData == false) {return;} // return if no data to send
			NgChm.LNK.sendMessageToPlugin ({ nonce: msg.nonce, op: 'testData', data: testData });
		}
	});

	/*
		Function to post message to linkouts regarding selected labels.

		@function postSelectionToLinkouts
		@param {String} axis 'Column' (if column label clicked) or 'Row' (if row label clicked)
		@parram {String} clickType Denotes type of click. Choices: 'standardClick' & 'ctrlClick'
		@param {int} lastClickIndex Index of last-clicked label. Can be '0' (e.g. if clicked dendogram).
		@param {String} srcNonce nonce for plugin
		TODO: make this work with specific registered linkouts
	*/
	NgChm.LNK.postSelectionToLinkouts = function(axis, clickType, lastClickIndex, srcNonce) {
		const allLabels = NgChm.heatMap.getAxisLabels(axis).labels;
	        const searchItems = NgChm.SRCH.getAxisSearchResults (axis);
		const pointLabelNames = [];
		for (let i=0; i<searchItems.length; i++) {
			let pointId = allLabels[searchItems[i] - 1];
			pointId = pointId.indexOf("|") !== -1 ? pointId.substring(0,pointId.indexOf("|")) : pointId;
			pointLabelNames.push(pointId);
		}
		const lastClickText = lastClickIndex > 0 ? allLabels[lastClickIndex] : '';
		NgChm.LNK.sendMessageToAllOtherPlugins (srcNonce, {
		    op: 'makeHiLite',
		    data: { axis, pointIds:pointLabelNames, clickType, lastClickText }
		});
	};

	/*
		Process message from plugins to highlight points selected in plugin
	*/
	defineVanodiMessageHandler ('selectLabels', function vanodiSelectLabels(instance, msg) {
		const axis = NgChm.MMGR.isRow(msg.selection.axis) ? 'Row' : 'Column';
		const pluginLabels = msg.selection.pointIds.map(l => l.toUpperCase()) // labels from plugin
		var heatMapAxisLabels;
		if (pluginLabels.length > 0 && pluginLabels[0].indexOf('|') !== -1) {
			// Plugin sent full labels
			heatMapAxisLabels = NgChm.heatMap.getAxisLabels(axis).labels;
		} else {
			// Plugin sent actual labels (or actual and full are identical).
			heatMapAxisLabels = NgChm.UTIL.getActualLabels(axis);
		}
		heatMapAxisLabels = heatMapAxisLabels.map(l => l.toUpperCase());
		var setSelected = new Set(pluginLabels) // make a set for faster access below, and avoiding use of indexOf
		NgChm.SRCH.clearSearchItems(axis);
		var indexes = []
		for (var i=0; i<heatMapAxisLabels.length; i++) { // loop over all labels
			if (setSelected.has(heatMapAxisLabels[i])) {  // if set of selected points has label, add index to array of indexes
				indexes.push(i+1);  
			}
		}
		if (indexes.length > 0) {
		    NgChm.SRCH.setAxisSearchResultsVec (axis, indexes);
		    NgChm.DET.labelLastClicked[axis] = indexes[indexes.length-1];
		}
		NgChm.DET.updateDisplayedLabels();
		NgChm.SUM.redrawSelectionMarks();
		NgChm.SEL.updateSelections();
		NgChm.SRCH.showSearchResults();
		NgChm.LNK.postSelectionToLinkouts (axis, msg.selection.clickType, 0, msg.nonce);
	});

	/*
		Process message from scatter plot to highlight single point under mouse on plot
	*/
	defineVanodiMessageHandler('mouseover', function vanodiMouseover(instance, msg) {
		const axis = NgChm.MMGR.isRow(msg.selection.axis) ? 'Row' : 'Column';
		const allLabels = NgChm.UTIL.getActualLabels(axis);
		const pointId = msg.selection.pointId
		const ptIdx = allLabels.indexOf(pointId) + 1;
		NgChm.SRCH.setAxisSearchResults(axis, ptIdx, ptIdx);
		NgChm.DET.labelLastClicked[axis] = ptIdx;
		NgChm.DET.updateDisplayedLabels();
		NgChm.SEL.updateSelections();
		NgChm.SRCH.showSearchResults();
		NgChm.SUM.redrawSelectionMarks();
	});

	// Listen for messages from plugins.
	(function() {
		window.addEventListener('message', processMessage, false);
		function processMessage(e) {
			if (e.data.hasOwnProperty('vanodi')) {
				const msg = e.data.vanodi;
				if (!msg.hasOwnProperty('nonce')) {
					console.warn ('Vanodi message received with no nonce: op==' + msg.op);
					return;
				}
				if (msg.nonce == 'prompt' && msg.op == 'register') {
					// Intercept special case: register message from a plugin instance that can't get a nonce automatically.
					// Ask user for permission.
					const instance = NgChm.LNK.getPluginInstanceByName (msg.name);
					if (!instance) {
						console.warn ('Vanodi registration message received for unknown plugin: name==' + msg.name);
						return;
					}
					if (confirm ("Grant access to plugin " + msg.name + "?")) {
						// Post special message containing actual nonce to the plugin.
						instance.source = e.source;
						e.source.postMessage({ vanodi: { op: 'changeNonce', nonce: msg.actualNonce, newNonce: instance.nonce }}, '*');
						// Then proceed as if a normal register message for the instance's nonce was received.
						msg.nonce = instance.nonce;
					} else {
						return;
					}
				}
				const instance = NgChm.LNK.getPluginInstance (msg.nonce);
				if (instance) {
				    processVanodiMessage (instance, msg);
				}
			}
		}
	})();


        NgChm.LNK.loadLinkoutSpec = function loadLinkoutSpec (kind, spec) {
	   console.log ({ m: 'loadLinkoutSpec', kind, spec });
	   if (kind === 'panel-plugin') {
	       // Panel plugin was dropped.  Add plugin to available panel plugins.
	       NgChm.LNK.registerPanePlugin(spec);
	       NgChm.UHM.hlp (document.getElementById('barMenu_btn'), 'Added panel plugin ' + spec.name, 150, false, 0);
	       setTimeout (NgChm.UHM.hlpC, 5000);
	   } else {
	       NgChm.LNK.addLinkoutPlugin(kind, spec);
	   }
	};
})(); // end of big IIFE
