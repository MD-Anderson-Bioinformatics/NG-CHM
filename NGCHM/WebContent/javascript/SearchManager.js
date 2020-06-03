//Define Namespace for NgChm SearchManager
NgChm.createNS('NgChm.SRCH');

NgChm.SRCH.discCovRowState = "";
NgChm.SRCH.discCovColState = "";
NgChm.SRCH.currentSearchItem = {};

/***********************************************************
 * SEARCH FUNCTIONS SECTION
 ***********************************************************/

/**********************************************************************************
 * FUNCTION - detailSearch: The purpose of this function is to serve as a driver
 * for the entire search process.  It will fork search processing depending upon
 * the search_on target (label or covar) and perform any functions that are common
 * to both.  It is called when search string is entered.
  **********************************************************************************/
NgChm.SRCH.detailSearch = function () {
	NgChm.UTIL.closeCheckBoxDropdown('srchCovSelectBox','srchCovCheckBoxes');
	NgChm.SRCH.clearSearchRequest();
	NgChm.SRCH.showSearchResults();
	const searchOn = document.getElementById('search_on');
	if (searchOn.value === 'labels') {
		NgChm.SRCH.labelSearch();
	} else {
		NgChm.SRCH.covarSearch();
	}
    NgChm.SUM.redrawSelectionMarks();
    NgChm.SUM.drawTopItems();
	NgChm.SRCH.showSearchResults();	
	let dc = document.getElementById("detail_canvas");
	if (dc != null) dc.focus();
}

/**********************************************************************************
 * FUNCTION - searchOnSel: The purpose of this function is to manage the display
 * of the various search boxes (std label search text box, continuous covariate search
 * text box, and discrete dropdown checkbox) depending upon the entry that the user
 * selects in the search on dropdown control.
  **********************************************************************************/
NgChm.SRCH.searchOnSel = function() {
	NgChm.UTIL.closeCheckBoxDropdown('srchCovSelectBox','srchCovCheckBoxes');
	const searchOn = document.getElementById('search_on');
	var searchTarget = document.getElementById('search_target');
	const covType = searchOn.value.split("|")[0];
	const covVal = searchOn.value.split("|")[1];
	const searchCovDisc = document.getElementById('search_cov_disc');
	const searchCovCont = document.getElementById('search_cov_cont');
	const searchTxt = document.getElementById('search_text');
	let classBarsConfig;
	if (searchOn.value !== 'labels') {
		if (covType === "row") {
			classBarsConfig = NgChm.heatMap.getRowClassificationConfig(); 
			searchTarget.value = "Row"; 
		} else if (covType === "col") {
			classBarsConfig = NgChm.heatMap.getColClassificationConfig();
			searchTarget.value = "Column"; 
		} 
		searchTarget.disabled = true; 
		const currentClassBar = classBarsConfig[covVal];
		if (currentClassBar.color_map.type === 'continuous') {
			searchTxt.style.display = 'none';
			searchCovCont.style.display = '';
			searchCovDisc.style.display = 'none';
		} else {
			NgChm.SRCH.loadCovarSearch();
			searchTxt.style.display = 'none';
			searchCovCont.style.display = 'none';
			searchCovDisc.style.display = 'inline-flex';
		} 
	} else {
		searchTarget.disabled = false; 
		searchTxt.style.display = '';
		searchCovCont.style.display = 'none';
		searchCovDisc.style.display = 'none';
	} 
}

/**********************************************************************************
 * FUNCTION - loadCovarSearch: The purpose of this function is to populate
 * a discrete covariate check box dropdown with items for a specific covariate
 * bar selected from the search_on dropdown select box.
 **********************************************************************************/
NgChm.SRCH.loadCovarSearch = function() {
	const searchOn = document.getElementById('search_on');
	const searchTarget = document.getElementById('search_target');
	const checkBoxes = document.getElementById('srchCovCheckBoxes');
	const selectBox = document.getElementById('srchCovSelectBox');
	const covType = searchOn.value.split("|")[0];
	const covVal = searchOn.value.split("|")[1];
	let classBarsConfig = NgChm.heatMap.getRowClassificationConfig(); 
	if (covType !== "row") {
		classBarsConfig = NgChm.heatMap.getColClassificationConfig();
	}
	const currentClassBar = classBarsConfig[covVal];
	const thresholds = currentClassBar.color_map.thresholds.sort();
	NgChm.UTIL.createCheckBoxDropDown('srchCovSelectBox','srchCovCheckBoxes',"Select Category(s)", thresholds,"300px");
	checkBoxes.innerHTML = checkBoxes.innerHTML + "<label for='Missing'><input type='checkBox' class='srchCovCheckBox' value='missing'>Missing</input></label>";
	NgChm.SRCH.loadSavedCovarState(covType,covVal);
}

/**********************************************************************************
 * FUNCTION - saveCovarState: The purpose of this function is to save the check
 * box state of a discrete covariate checkbox dropdown when a search is run;
  **********************************************************************************/
NgChm.SRCH.saveCovarState = function (covVal) {
	const searchTarget = document.getElementById('search_target').value;
	const currElems = document.getElementsByClassName('srchCovCheckBox');
	if (searchTarget === 'Row') {
		NgChm.SRCH.discCovRowState = covVal+"|"
	} else {
		NgChm.SRCH.discCovColState = covVal+"|"
	}
	for (let i=0; i<currElems.length;i++) {
		if (currElems[i].checked) {
			if (searchTarget === 'Row') {
				NgChm.SRCH.discCovRowState = NgChm.SRCH.discCovRowState + i + "|";
			} else {
				NgChm.SRCH.discCovColState = NgChm.SRCH.discCovColState + i + "|";
			}
		}
	}
}

/**********************************************************************************
 * FUNCTION - loadSavedCovarState: The purpose of this function is to load the 
 * saved state of a discrete covariate bar's checkboxes and check those boxes
 * that have been used in a current search.
  **********************************************************************************/
NgChm.SRCH.loadSavedCovarState = function (covType, covVal) {
	const searchTarget = document.getElementById('search_target').value;
	if ((searchTarget === 'Row') && (NgChm.SRCH.discCovRowState === "")) {
		return;
	}
	if ((searchTarget === 'Column') && (NgChm.SRCH.discCovColState === "")) {
		return;
	}
	const checkBoxes = document.getElementById('srchCovCheckBoxes');
	let stateElems = NgChm.SRCH.discCovRowState.split("|");
	if (searchTarget === 'Column') {
		stateElems = NgChm.SRCH.discCovColState.split("|");
	}
	if ((stateElems[0] === covType) && (stateElems[1] === covVal)) {
		for (let i=2;i<stateElems.length-1;i++) {
			let stateElem = parseInt(stateElems[i]);
			checkBoxes.children[stateElem].children[0].click();
		}
	}
}

/**********************************************************************************
 * FUNCTION - cleanseSearchString: The purpose of this function is primarily to strip 
 * duplicate delimiter characters from a Label search string.  These result in 
 * selecting every row. It also replaces all delimiters with a comma.  The resulting
 * cleansed string is later placed in the search text box.
  **********************************************************************************/
NgChm.SRCH.cleanseSearchString = function (searchStr) {
	const srchItems = searchStr.split(/[|;, ]+/);
	let cleanStr = "";
	for (let j = 0; j < srchItems.length; j++) {
		let item = srchItems[j];
		item = item.replace(/^\|+|\.+|\,+|\;+|\,+|\;+|\|+|\.+$/g, '');
		if (item !== '') {
			cleanStr = cleanStr + item + ',';
		}
	}
	cleanStr = cleanStr.substring(0,cleanStr.length - 1);
	if ((cleanStr === ',') || (cleanStr === ';')) {
		cleanStr = '';
	}
	return cleanStr;
}

/**********************************************************************************
 * FUNCTION - covarSearch: The purpose of this function is to perform
 * a covariate-bar based search. It calls the sub-functions necessary to execute
 * the search and manages the appearance of the covariate search text box.
  **********************************************************************************/
NgChm.SRCH.covarSearch = function () {
	let searchElement = document.getElementById('overSelect');
	const covBoxes = document.getElementsByClassName("srchCovCheckBox");
	const searchOn = document.getElementById("search_on");
	const covType = searchOn.value.split("|")[0];
	const covVal = searchOn.value.split("|")[1];
	const axis = covType === 'row' ? 'Row' : 'Column';
	let classBarsConfig; 
	let classDataValues;
	if (covType === "row") {
		classBarsConfig = NgChm.heatMap.getRowClassificationConfig(); 
		classDataValues = NgChm.heatMap.getRowClassificationData()[covVal].values;
	} else {
		classBarsConfig = NgChm.heatMap.getColClassificationConfig();
		classDataValues = NgChm.heatMap.getColClassificationData()[covVal].values;
	}
	const currentClassBar = classBarsConfig[covVal];
	let itemsFound = false;
	if (currentClassBar.color_map.type === 'discrete') {
		let cats = [];
		for (let i=0;i<covBoxes.length;i++) {
			if (covBoxes[i].checked) {
				cats.push(covBoxes[i].value);
			}
		}
		itemsFound = NgChm.SRCH.getSelectedDiscreteSelections(axis,cats,classDataValues);
		NgChm.SRCH.saveCovarState(searchOn.value);

	} else {
		searchElement = document.getElementById('search_cov_cont');
		itemsFound = NgChm.SRCH.getSelectedContinuousSelections(axis,classDataValues);
	}

	NgChm.SRCH.searchNext(true);
	if (itemsFound === false){
		searchElement.style.backgroundColor = "rgba(255,0,0,0.3)";
		//Clear previous matches when search is empty.
		NgChm.SEL.updateSelection();
	} else {
		searchElement.style.backgroundColor = "rgba(255,255,255,0.3)";
	}
}	

/**********************************************************************************
 * FUNCTION - getSelectedDiscreteSelections: The purpose of this function is to 
 * find rows/cols that match the discrete category selections checked by the user. 
 * It iterates the classDataValues data configuration for a given covariate bar
 * for either a direct match on category or, if missing is selected, missing values
 * on the covariate bar. If a value match is found, an item is added to the 
 * searchItems array for the appropriate axis.
  **********************************************************************************/
NgChm.SRCH.getSelectedDiscreteSelections = function (axis, cats,classDataValues) {
	let itemFound = false;
	for (let i=0;i<classDataValues.length;i++) {
		if (cats.indexOf(classDataValues[i]) > -1) {
			NgChm.SEL.searchItems[axis][i+1] = 1;
			itemFound = true;
		} else if (((classDataValues[i] === 'null') || (classDataValues[i] === 'NA')) && (cats.indexOf("missing")> -1)) {
			NgChm.SEL.searchItems[axis][i+1] = 1;
			itemFound = true;
		}
	}
	return itemFound;
}

/**********************************************************************************
 * FUNCTION - getSelectedContinuousSelections: The purpose of this function is to 
 * find rows/cols that match the user-entered search expressions for continuous
 * covariate bars.  It iterates the classDataValues data configuration for a given 
 * covariate bar and evaluates each value against an array of user entered expressions.
 * If a value is found to exist within the parameters of an expression, that value
 * is selected. This function also searches for missing values if the user enters
 * an expression that contains the word "miss".  If a value match is found, an item 
 * is added to the searchItems array for the appropriate axis.
  **********************************************************************************/
NgChm.SRCH.getSelectedContinuousSelections = function (axis, classDataValues) {
	let itemFound = false;
	const searchElement = document.getElementById('search_cov_cont');
	let searchString = searchElement.value.trim();
	//Remove all spaces from expression
	searchString = searchString.replace(/ /g,'');
	searchElement.value = searchString;
	if (searchString === "" || searchString === null || searchString === " "){
		return itemFound;
	}
	const tmpSearchItems = searchString.split(/[;,]+/);
	for (let i=0;i<classDataValues.length;i++) {
		let classDataValue = classDataValues[i];
		for (let j=0;j<tmpSearchItems.length;j++) {
			let expr = tmpSearchItems[j].trim().toLowerCase();
			//Parse the expression for all components
			const results = NgChm.SRCH.parseSearchExpression(expr);
			if (results === null) { break; }
			//If we are doing a search for missing values
			if (results.firstValue.includes("miss")) {
				if ((classDataValue === 'null') || (classDataValue === "NA")) {
					NgChm.SEL.searchItems[axis][i+1] = 1;
					itemFound = true;
				}
			} else {
				//Validate expression and execute if valid
				if (NgChm.SRCH.isSearchValid(results.firstOper, results.firstValue, results.secondOper, results.secondValue) === true) {
					let selectItem = NgChm.SRCH.evaluateExpression(results.firstOper,parseFloat(results.firstValue), parseFloat(classDataValue));
					if ((results.secondOper !== null) && (selectItem === true)) {
						selectItem = NgChm.SRCH.evaluateExpression(results.secondOper,parseFloat(results.secondValue), parseFloat(classDataValue));
					}
					if (selectItem === true) {
						NgChm.SEL.searchItems[axis][i+1] = 1;
						itemFound = true;
					}
				}
			}
		}
	}
	return itemFound;
}

/**********************************************************************************
 * FUNCTION - evaluateExpression: The purpose of this function is to evaluate
 * a user entered expression against a value from the classDataValues for a given
 * covariate. It checks first for values that meet the greater than operators
 * (> and >=).  Then it checks for values that meet the less than operators.
 * Finally, it checks for values that meet the equal to operators (===,>=,<=).
 * If a value satisfies any of these conditions a true value is returned.   
  **********************************************************************************/
NgChm.SRCH.evaluateExpression = function(oper, srchValue, dataValue) {
	let selectItem = false;
	if (oper.charAt(0) === '>') {
			if (dataValue > srchValue) {
				selectItem = true;
			}
	} 
	if (oper.charAt(0) === '<') {
		if (dataValue < srchValue) {
			selectItem = true;
		}
	}
	if (oper.charAt(1) === '=') {
		if (dataValue === srchValue) {
			selectItem = true;
		}	
	}
	return selectItem;
}

/**********************************************************************************
 * FUNCTION - getSelectedContinuousSelections: The purpose of this function is to 
 * take a search expression (>44,>45<=90,88, etc...), parse that expression, and 
 * return an object with 4 variables (the first expression operator, the first 
 * expression value, second operator, and second value.  If an expression is just
 * a single number, the first oper will be "=" and the first value, the expression.
 * A null is returned if no valid expression is found.
  **********************************************************************************/
NgChm.SRCH.parseSearchExpression= function (expr) {
	//Make a first pass thru the expression
	const firstPass = NgChm.SRCH.examineExpression(expr);
	if (firstPass === null) { return null; }
	let secondPass = null;
	let firstValue = null;
	let secondValue = null;
	let firstOper = null;
	let secondOper = null;
	//If the first pass has a length of 1 we have an "equal to" expression (either a number OR 'missing')
	if (firstPass.oper === "===") {
		//Use the 'is equal' test to evaluate the expression
		firstOper = firstPass.oper;
		firstValue = firstPass.remainder;
	} else {
		//If the first pass array has 4 values, we need to do a second pass
		if (firstPass.position === 0) {
			//If the first pass found an operator in position 0, the firstOper is set AND the rest of the string needs a second pass
			firstOper = firstPass.oper;
			//If the first pass remainder is a numeric value, we have identified the first value.
			if (NgChm.UTIL.isNaN(firstPass.remainder) === false) {
				firstValue = firstPass.remainder;
			} else {
				secondPass = NgChm.SRCH.examineExpression(firstPass.remainder);
				secondOper = secondPass.oper
				firstValue = firstPass.remainder.substring(0,secondPass.position);
				secondValue = secondPass.remainder;
			}
		} else {
			//If the first pass found an operator a in position other than 0, the remainder is the second value and the operator found is the second operator
			//AND the first half of the string needs a second pass
			secondOper = firstPass.oper;
			secondValue = firstPass.remainder;
			secondPass = NgChm.SRCH.examineExpression(expr.substring(0, firstPass.position));
			//With the results of the second pass we have now identified both operators and both values
			firstValue = secondPass.remainder;
			firstOper = secondPass.oper;
		}
	}
	return {firstOper: firstOper, firstValue: firstValue, secondOper: secondOper, secondValue};
}

/**********************************************************************************
 * FUNCTION - examineExpression: The purpose of this function is to evaluate an incoming
 * string and pull out the components of the expression.  It returns an object
 * containing the following values: The first operator (>,<,>=,<=) found, the position
 * that the operator was found in, and the string remainder of that expression
 * UNLESS the expression contains none of those above operators.  If none of them
 * are found, the expression is evaluated to see if it contains a numeric value. If
 * so, the first operator is "=" and the remainder is the expression.  Null is 
 * returned if the expression yields no results.
  **********************************************************************************/
NgChm.SRCH.examineExpression = function (expr) {
	let gteIdx = (expr.indexOf(">="));
	let lteIdx = (expr.indexOf("<="));
	let gtIdx = gteIdx > -1 ? -1 : (expr.indexOf(">"));
	let ltIdx = lteIdx > -1 ? -1 : (expr.indexOf("<"));
    
	if (gteIdx !== -1) {
		return { oper: ">=", position: gteIdx, remainder: expr.substring(gteIdx+2,expr.length) }
	} else if (lteIdx !== -1) {
		return { oper: "<=", position: lteIdx, remainder: expr.substring(lteIdx+2,expr.length) }
	} else if (gtIdx !== -1) {
		return { oper: ">", position: gtIdx, remainder: expr.substring(gtIdx+1,expr.length) }
	} else if (ltIdx !== -1) {
		return { oper: "<", position: ltIdx, remainder:  expr.substring(ltIdx+1,expr.length) }
	} else {
		if (NgChm.UTIL.isNaN(expr) === false) {	
			return { oper: "===", remainder: expr }
		} else {
			return { oper: "txt", remainder: expr }
		}
	}
}

/**********************************************************************************
 * FUNCTION - isSearchValid: The purpose of this function is to evaluate the operators 
 * and values entered by the user ensure that they are actual operators and float values 
 * BEFORE using them in an EVAL statement.  This is done to preclude code injection.
  **********************************************************************************/
NgChm.SRCH.isSearchValid = function (firstOper, firstValue, secondOper, secondValue) {
	let srchValid = true;
	if ((firstOper !== '>') && (firstOper !== '<') && (firstOper !== '>=') && (firstOper !== '<=')  && (firstOper !== '===')) {
		srchValid = false;
	}
	if (NgChm.UTIL.isNaN(firstValue) === true) {
		srchValid = false;
	}
	if (secondOper !== null) {
		if ((secondOper !== '>') && (secondOper !== '<') && (secondOper !== '>=') && (secondOper !== '<=')) {
			srchValid = false;
		}
		if (NgChm.UTIL.isNaN(secondValue) === true) {
			srchValid = false;
		}
	}
	return srchValid;
}

/**********************************************************************************
 * FUNCTION - labelSearch: The purpose of this function is to perform
 * a label based search. It calls the sub-functions necessary to execute
 * the search and manages the appearance of the label search text box.
  **********************************************************************************/
NgChm.SRCH.labelSearch = function () {
	let searchElement = document.getElementById('search_text');
	let searchString = searchElement.value.trim();
	searchString = NgChm.SRCH.cleanseSearchString(searchString);
	searchElement.value = searchString;
	if (searchString === "" || searchString === null || searchString === " "){
		return false;
	}
	
	let tmpSearchItems = searchString.split(/[;, ]+/);
	const itemsFound = [];
	
	const searchTarget = document.getElementById('search_target').value;
	
	//Put labels into the global search item list if they match a user search string.
	//Regular expression is built for partial matches if the search string contains '*'.
	//toUpperCase is used to make the search case insensitive.
	if (searchTarget !== 'Column') {
		NgChm.SRCH.searchLabels("Row", tmpSearchItems, itemsFound);
	}

	if (searchTarget !== 'Row') {
		NgChm.SRCH.searchLabels("Column", tmpSearchItems, itemsFound);
	}

	//Jump to the first match
	if (searchString == null || searchString == ""){
		return;
	}

	NgChm.SRCH.searchNext(true);
	searchElement.style.backgroundColor = "rgba(255,255,255,0.3)";
	if (NgChm.SRCH.currentSearchItem.index && NgChm.SRCH.currentSearchItem.axis){
		if (itemsFound.length != tmpSearchItems.length && itemsFound.length > 0) {
			searchElement.style.backgroundColor = "rgba(255,255,0,0.3)";
		} else if (itemsFound.length == 0){
			searchElement.style.backgroundColor = "rgba(255,0,0,0.3)";
		}
	} else {
		if (searchString != null && searchString.length> 0) {
			searchElement.style.backgroundColor = "rgba(255,0,0,0.3)";
		}	
		//Clear previous matches when search is empty.
		NgChm.SEL.updateSelection();
	}
}	

/**********************************************************************************
 * FUNCTION - searchLabels: The purpose of this function is to search through
 * labels collections for matches.
  **********************************************************************************/
NgChm.SRCH.searchLabels = function (axis,tmpSearchItems,itemsFound) {
	const labels = axis === "Row" ? NgChm.heatMap.getRowLabels()["labels"] : NgChm.heatMap.getColLabels()["labels"];
	for (let j = 0; j < tmpSearchItems.length; j++) {
		let reg;
		const searchItem = tmpSearchItems[j];
		if (searchItem == "." || searchItem == "*"){ // if this is a search item that's going to return everything, skip it.
			continue;
		}
		if (searchItem.charAt(0) == "\"" && searchItem.slice(-1) == "\""){ // is it wrapped in ""?
			reg = new RegExp("^" + searchItem.toUpperCase().slice(1,-1).replace(".","\\.") + "$");
		} else {
			reg = new RegExp(searchItem.toUpperCase());
		}
		for (let i = 0; i < labels.length; i++) {
			let label = labels[i].toUpperCase();
			if (label.indexOf('|') > -1) {
				label = label.substring(0,label.indexOf('|'));
			}
			if  (reg.test(label)) {
				NgChm.SEL.searchItems[axis][i+1] = 1;
				if (itemsFound.indexOf(searchItem) == -1)
					itemsFound.push(searchItem);
			} 
		}	
	}
}

/**********************************************************************************
 * FUNCTION - searchNext: The purpose of this function is to find the 
 * next search item, set it as the current search item, and move the focus of 
 * the heat map detail panel to that item.
  **********************************************************************************/
NgChm.SRCH.searchNext = function (firstTime) {
	const searchTarget = document.getElementById('search_target').value;
	NgChm.UTIL.closeCheckBoxDropdown('srchCovSelectBox','srchCovCheckBoxes');
	if ((typeof firstTime !== 'undefined') || (!NgChm.SRCH.currentSearchItem["index"] || !NgChm.SRCH.currentSearchItem["axis"])) { // if currentSeachItem isnt set (first time search)
		if (searchTarget !== 'Column') {
			NgChm.SRCH.findNextSearchItem(-1,"Row");
		} else {
			NgChm.SRCH.findNextSearchItem(-1,"Column");
		}
	} else {
		if (searchTarget !== 'Both') {
			if (NgChm.SRCH.currentSearchItem["axis"] === searchTarget) {
				NgChm.SRCH.findNextSearchItem(NgChm.SRCH.currentSearchItem["index"],NgChm.SRCH.currentSearchItem["axis"]);
			} else {
				NgChm.SRCH.findNextSearchItem(-1,searchTarget);
			}
		} else {
			NgChm.SRCH.findNextSearchItem(NgChm.SRCH.currentSearchItem["index"],NgChm.SRCH.currentSearchItem["axis"]);
		} 
	}
	NgChm.SRCH.goToCurrentSearchItem();
}

/**********************************************************************************
 * FUNCTION - findNextSearchItem: The purpose of this function is to find the 
 * next search item, based upon the search target (row/col/both) and set that item
 * as the current search item.
  **********************************************************************************/
NgChm.SRCH.findNextSearchItem = function (index, axis) {
	const axisLength = axis == "Row" ? NgChm.heatMap.getRowLabels().labels.length : NgChm.heatMap.getColLabels().labels.length;
	const otherAxis = axis == "Row" ? "Column" : "Row";
	const otherAxisLength = axis == "Column" ? NgChm.heatMap.getRowLabels().labels.length : NgChm.heatMap.getColLabels().labels.length;
	const searchTarget = document.getElementById('search_target').value;
	let curr = index;
	while( !NgChm.SEL.searchItems[axis][++curr] && curr <  axisLength){}; // find first searchItem in row
	if (curr >= axisLength) { // if no searchItems exist in first axis, move to other axis
		if (document.getElementById('search_target').value === 'Both') {
			curr = -1;
			while( !NgChm.SEL.searchItems[otherAxis][++curr] && curr <  otherAxisLength){};
			if (curr >=otherAxisLength){ // if no matches in the other axis, check the earlier indices of the first axis (loop back)
				NgChm.SRCH.findNextReturnOnAxis(curr, index, axis);
			} else {
				NgChm.SRCH.setSearchItem(otherAxis, curr);
			}
		} else { //if axis is locked by search_target, check the earlier indices of the first axis (loop back)
			NgChm.SRCH.findNextReturnOnAxis(curr, index, axis);
		}
	} else {
		NgChm.SRCH.setSearchItem(axis, curr);
	}
}

/**********************************************************************************
 * FUNCTION - findNextReturnOnAxis: The purpose of this function is to reset the
 * search within the same axis. It is called if either the axis is locked by the 
 * search target OR there are no items to move to on the other axis.
  **********************************************************************************/
NgChm.SRCH.findNextReturnOnAxis = function (curr, index, axis) {
	curr = -1;
	while( !NgChm.SEL.searchItems[axis][++curr] && curr <  index){};
	if (curr < index && index != -1){
		NgChm.SRCH.currentSearchItem["axis"] = axis;
		NgChm.SRCH.currentSearchItem["index"] = curr;
	}
}

/**********************************************************************************
 * FUNCTION - setSearchItem: The purpose of this function is to set the current
 * search item with the supplied axis and curr values. It is called by both the "next"
 * and "previous" searches.
  **********************************************************************************/
NgChm.SRCH.setSearchItem = function (axis, curr) {
	NgChm.SRCH.currentSearchItem["axis"] = axis;
	NgChm.SRCH.currentSearchItem["index"] = curr;
}

/**********************************************************************************
 * FUNCTION - searchNext: The purpose of this function is to find the 
 * previous search item, set it as the current search item, and move the focus of 
 * the heat map detail panel to that item.
  **********************************************************************************/
NgChm.SRCH.searchPrev = function () {
	NgChm.UTIL.closeCheckBoxDropdown('srchCovSelectBox','srchCovCheckBoxes');
	const searchTarget = document.getElementById('search_target').value;
	if (searchTarget !== 'Both') {
		if (NgChm.SRCH.currentSearchItem["axis"] === searchTarget) {
			NgChm.SRCH.findPrevSearchItem(NgChm.SRCH.currentSearchItem["index"],NgChm.SRCH.currentSearchItem["axis"]);
		} else {
			NgChm.SRCH.findPrevSearchItem(-1,searchTarget);
		}
	} else {
		NgChm.SRCH.findPrevSearchItem(NgChm.SRCH.currentSearchItem["index"],NgChm.SRCH.currentSearchItem["axis"]);
	}
	NgChm.SRCH.goToCurrentSearchItem();
}

/**********************************************************************************
 * FUNCTION - findPrevSearchItem: The purpose of this function is to find the 
 * previous search item, based upon the search target (row/col/both) and set that item
 * as the current search item.
  **********************************************************************************/
NgChm.SRCH.findPrevSearchItem = function (index, axis) {
	const axisLength = axis == "Row" ? NgChm.heatMap.getRowLabels().labels.length : NgChm.heatMap.getColLabels().labels.length;
	const otherAxis = axis == "Row" ? "Column" : "Row";
	const otherAxisLength = axis == "Column" ? NgChm.heatMap.getRowLabels().labels.length : NgChm.heatMap.getColLabels().labels.length;
	let curr = index;
	while( !NgChm.SEL.searchItems[axis][--curr] && curr > -1 ){}; // find first searchItem in row
	if (curr < 0){ // if no searchItems exist in first axis, move to other axis
		if (document.getElementById('search_target').value === 'Both') { 
			curr = otherAxisLength;
			while( !NgChm.SEL.searchItems[otherAxis][--curr] && curr > -1){};
			if (curr > 0){
				NgChm.SRCH.setSearchItem(otherAxis, curr);
			} else {  //if axis is locked by search_target, check the earlier indices of the first axis (loop back)
				NgChm.SRCH.findPrevReturnOnAxis(axisLength, index, axis);
			}
		} else {
			NgChm.SRCH.findPrevReturnOnAxis(axisLength, index, axis);
		}
	} else {
		NgChm.SRCH.setSearchItem(axis, curr);
	}
}

/**********************************************************************************
 * FUNCTION - findPrevReturnOnAxis: The purpose of this function is to reset the
 * search within the same axis. It is called if either the axis is locked by the 
 * search target OR there are no items to move to on the other axis.
  **********************************************************************************/
NgChm.SRCH.findPrevReturnOnAxis = function (curr, index, axis) {
	while( !NgChm.SEL.searchItems[axis][--curr] && curr > index ){};
	if (curr > index){
		NgChm.SRCH.currentSearchItem["axis"] = axis;
		NgChm.SRCH.currentSearchItem["index"] = curr;
	}
}

/**********************************************************************************
 * FUNCTION - goToCurrentSearchItem: The purpose of this function is to move the
 * focus of the detail heat map panel to the current search item.
  **********************************************************************************/
NgChm.SRCH.goToCurrentSearchItem = function () {
	if (NgChm.SRCH.currentSearchItem.axis == "Row") {
		NgChm.SEL.currentRow = NgChm.SRCH.currentSearchItem.index;
		if ((NgChm.SEL.mode == 'RIBBONV') && NgChm.SEL.selectedStart!= 0 && (NgChm.SEL.currentRow < NgChm.SEL.selectedStart-1 || NgChm.SEL.selectedStop-1 < NgChm.SEL.currentRow)){
			NgChm.UHM.showSearchError(1);
		} else if (NgChm.SEL.mode == 'RIBBONV' && NgChm.SEL.selectedStart == 0){
			NgChm.UHM.showSearchError(2);
		} 
		NgChm.SEL.checkRow();
	} else if (NgChm.SRCH.currentSearchItem.axis == "Column"){
		NgChm.SEL.currentCol = NgChm.SRCH.currentSearchItem.index;
		if ((NgChm.SEL.mode == 'RIBBONH') && NgChm.SEL.selectedStart!= 0 && (NgChm.SEL.currentCol < NgChm.SEL.selectedStart-1 || NgChm.SEL.selectedStop-1 < NgChm.SEL.currentCol )){
			NgChm.UHM.showSearchError(1)
		} else if (NgChm.SEL.mode == 'RIBBONH' && NgChm.SEL.selectedStart == 0){
			NgChm.UHM.showSearchError(2);
		} 
		NgChm.SEL.checkColumn();
	}
	NgChm.SEL.updateSelection();
}

/**********************************************************************************
 * FUNCTION - clearSearch: The purpose of this function is to process the user
 * selection to clear the current search when the red search 'X' is clicked. For
 * searches where the target is BOTH all searches will be cleared (row and column).
 * For ROW or COL searches, only the search for that axis will be cleared and the
 * next search item will move to the other axis.
  **********************************************************************************/
NgChm.SRCH.clearSearch = function (event) {
	NgChm.UTIL.closeCheckBoxDropdown('srchCovSelectBox','srchCovCheckBoxes');
	const searchTarget = document.getElementById('search_target').value;
	NgChm.SUM.clearSelectionMarks(searchTarget);
	NgChm.SRCH.clearSearchRequest(searchTarget);
	if (searchTarget === "Row") {
		if (NgChm.SRCH.currentSearchItem["axis"] === "Row") {
			NgChm.SRCH.findNextSearchItem(-1,"Column");
			NgChm.SRCH.goToCurrentSearchItem();
		}
		NgChm.SUM.rowDendro.clearSelectedBars();
		NgChm.SRCH.showSearchResults();	
	} else if (searchTarget === "Column") {
		if (NgChm.SRCH.currentSearchItem["axis"] === "Column") {
			NgChm.SRCH.findNextSearchItem(-1,"Row");
			NgChm.SRCH.goToCurrentSearchItem();
		}
		NgChm.SUM.colDendro.clearSelectedBars();
		NgChm.SRCH.showSearchResults();	
	} else {
		NgChm.SRCH.currentSearchItem = {};
		NgChm.DET.labelLastClicked = {};
		NgChm.SUM.rowDendro.clearSelectedBars();
		NgChm.SUM.colDendro.clearSelectedBars();
	}
	NgChm.SRCH.clearSearchElement();
	NgChm.SRCH.showSearchResults();	
	NgChm.SEL.updateSelection();
}

/**********************************************************************************
 * FUNCTION - clearSearch: The purpose of this function is to clear the search 
 * items on one OR both axes.
  **********************************************************************************/
NgChm.SRCH.clearSearchRequest = function() {
	const searchTarget = document.getElementById('search_target').value;
	if (searchTarget === 'Both') {
		NgChm.SRCH.clearSearchItems("Row");
		NgChm.SRCH.clearSearchItems("Column");
	} else {
		NgChm.SRCH.clearSearchItems(searchTarget)
	}
	NgChm.SUM.clearSelectionMarks(searchTarget);
}

/**********************************************************************************
 * FUNCTION - clearSearch: The purpose of this function is to clear the search 
 * items on a particular axis.
  **********************************************************************************/
NgChm.SRCH.clearSearchItems = function (clickAxis) {
	NgChm.SEL.searchItems[clickAxis] = {};
	if (clickAxis === "Row"){
		NgChm.SUM.rowDendro.clearSelectedBars();
	} else if (clickAxis === "Column"){
		NgChm.SUM.colDendro.clearSelectedBars();
	}
	let markLabels = document.getElementsByClassName('MarkLabel');
	for (let ii = 0; ii < markLabels.length; ii++){ // clear tick marks
		NgChm.DET.removeLabel(markLabels[ii].id);
	}
}

/**********************************************************************************
 * FUNCTION - clearSearchElement: The purpose of this function is to clear the appropriate
 * search data entry element.
  **********************************************************************************/
NgChm.SRCH.clearSearchElement = function () {
	const searchOn = document.getElementById('search_on').value;
	const searchTarget = document.getElementById('search_target').value.toLowerCase();
	const covType = searchOn.split("|")[0];
	const covVal = searchOn.split("|")[1];
	let classBarsConfig; 
	let classDataValues;
	const covAxis = covType === 'row' ? 'row' : 'column';
	if (searchOn === 'labels') {
		const resultsCnts = NgChm.SRCH.getSearchResultsCounts();
		if ((searchTarget === 'both') && (resultsCnts[2] !== 0)) {
			return;
		} else if ((searchTarget === 'row') && (resultsCnts[0] !== 0)) {
			return;
		}  else if ((searchTarget === 'col') && (resultsCnts[1] !== 0)) {
			return;
		}
		document.getElementById('search_text').value = "";
	} else {
		if ((covAxis === searchTarget) || (searchTarget === 'both')) {
			if (covType === 'row') {
				classBarsConfig = NgChm.heatMap.getRowClassificationConfig(); 
			} else if (covType === 'col') {
				classBarsConfig = NgChm.heatMap.getColClassificationConfig();
			}
			const currentClassBar = classBarsConfig[covVal];
			if (currentClassBar.color_map.type === 'continuous') {
				document.getElementById('search_cov_cont').value = "";
			} else {
				NgChm.UTIL.resetCheckBoxDropdown('srchCovCheckBox');		
			}
		}
	}
	if (searchTarget === 'row') {
		NgChm.SRCH.discCovRowState = "";
		
	} else if (searchTarget === 'column') {
		NgChm.SRCH.discCovColState = "";
		
	} else {
		NgChm.SRCH.discCovRowState = "";
		NgChm.SRCH.discCovColState = "";
	}
}

/**********************************************************************************
 * FUNCTION - showSearchResults: The purpose of this function is to show the 
 * search results text area below the search controls with the row/col count
 * results from the just-executed search IF there are search results to show.
  **********************************************************************************/
NgChm.SRCH.showSearchResults = function () {
	const resultsCnts = NgChm.SRCH.getSearchResultsCounts();
	if (resultsCnts[2] > 0) {
		document.getElementById("search_display_text").innerHTML = "Found: Rows - " + resultsCnts[0] + " Columns - " + resultsCnts[1];
	} else {
		NgChm.SRCH.hideSearchResults();
	}
}

/**********************************************************************************
 * FUNCTION - hideSearchResults: The purpose of this function is to hide the 
 * search results text area below the search controls.
  **********************************************************************************/
NgChm.SRCH.hideSearchResults = function () {
	document.getElementById("search_display_text").innerHTML = "";
}

/**********************************************************************************
 * FUNCTION - getSearchResultsCounts: The purpose of this function is to retrieve
 * counts for search results. It returns an integer array containing 3 values:
 * total row search results, total column results, and total combined results.
  **********************************************************************************/
NgChm.SRCH.getSearchResultsCounts = function () {
	return [Object.keys(NgChm.SEL.searchItems["Row"]).length, Object.keys(NgChm.SEL.searchItems["Column"]).length, Object.keys(NgChm.SEL.searchItems["Row"]).length + Object.keys(NgChm.SEL.searchItems["Column"]).length];
}

/**********************************************************************************
 * FUNCTION - getSearchCols: The purpose of this function is to return the 
 * column number of any columns meeting the current user search.
  **********************************************************************************/
NgChm.SRCH.getSearchCols = function () {
	const selected = [];
	for (let i in NgChm.SEL.searchItems["Column"]) {
		selected.push(i);
	}
	return selected;	
}

/**********************************************************************************
 * FUNCTION - getSearchCols: The purpose of this function is to return the 
 * row numbers of any rows meeting the current user search.
  **********************************************************************************/
NgChm.SRCH.getSearchRows = function () {
	const selected = [];
	for (let i in NgChm.SEL.searchItems["Row"]) {
		selected.push(i);
	}
	return selected;
}

/**********************************************************************************
 * FUNCTION - getSearchItemsForAxis: The purpose of this function is to return 
 * indices of rows/columns meeting current user search. 
  **********************************************************************************/
NgChm.SRCH.getSearchItemsForAxis = function (axis) {
	// axis is capitalized in so many ways :-(.
	axis = NgChm.MMGR.isRow (axis) ? 'Row' : 'Column';
	return Object.keys(NgChm.SEL.searchItems[axis] || {});
};

/***********************************************************
 * End - Search Functions
 ***********************************************************/


