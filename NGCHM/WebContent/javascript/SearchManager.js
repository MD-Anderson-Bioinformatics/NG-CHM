//Define Namespace for NgChm SearchManager
NgChm.createNS('NgChm.SRCH');

(function() {

    /***********************************************************
     * STATE VARIABLES SECTION
     ***********************************************************/

    // searchResults maintains the database of all search results
    // and/or manual selections on each axis. e.g. searchResults["Row"]
    // is an object that contains the search results for the row axis.
    // Each axis object contains an entry with value 1 for the indices
    // of all selected items and no entry for all other items.
    // e.g.  if rows 2, 4, and 6 are selected,
    //     searchResults["Row"] == { "2": 1, "4": 1, "6": 1 }.
    //
    const searchResults = {};

    // currentSearchItem contains the axis and index of the current
    // search item (used by the forward and backward search arrow buttons).
    var currentSearchItem = {};

    // discCovStates stores for each axis the selected options in the select drop down
    // for a discrete covariate.  Used to preserve selection state of the drop down
    // as the user switches between label and covariate searches and axis changes.
    const discCovStates = {};

    // gapItems is a cache of which label indices are gap items.  It is
    // not directly affect user-visible state.  It is used to prevent
    // gapItems from being selected.
    const gapItems = {};

    /***********************************************************
     * SEARCH FUNCTIONS SECTION
     ***********************************************************/

    /**********************************************************************************
     * FUNCTION - clearAllSearchResults: This function initializes/resets all
     * search-related state variables.
     **********************************************************************************/
    NgChm.SRCH.clearAllSearchResults = function() {
	searchResults["Row"]= {};
	searchResults["Column"]= {};
	searchResults["RowCovar"] = {};
	searchResults["ColumnCovar"]= {};

	currentSearchItem = {};
	discCovStates["Row"] = "";
	discCovStates["Column"] = "";
	for (let axis in gapItems) delete gapItems[axis];

	// Connect UI elements to onclick handlers.
	let e = document.getElementById('next_btn');
	if (e) e.onclick = () => searchNext(false);
	e = document.getElementById('prev_btn');
	if (e) e.onclick = () => searchPrev(false);
	e = document.getElementById('cancel_btn');
	if (e) e.onclick = () => NgChm.SRCH.clearSearch();
	e = document.getElementById('go_btn');
	if (e) e.onclick = () => NgChm.SRCH.detailSearch();

	// Connect UI elements to onchange handlers.
	e = document.getElementById('search_on');
	if (e) e.onchange = () => searchOnSel();
    };

	// Add keyup event listener to search on Enter key press
	window.addEventListener("keyup", function(event){
		if(event.keyCode === 13) {NgChm.SRCH.detailSearch(); return false;}
	});

    // Private function getGaps returns a dictionary object
    // for the specified axis that contains a true entry for the
    // indices of any gap elements.
    function getGaps (axis) {
	// Get and cache which labels are gap items the first
	// time we access the specified axis.
	if (!(axis in gapItems)) {
	    let labels = NgChm.heatMap.getAxisLabels(axis).labels;
	    gapItems[axis] = {};
            // Note: indices for row and column labels are 1-origin.
	    labels.forEach((label, index) => {
		if (label == "") gapItems[axis][index+1] = true;
	    });
	}
	return gapItems[axis];
    }

    /**********************************************************************************
     * FUNCTION - getAxisSearchResults: get indices of all search results on the
     * specified axis.
     ***********************************************************************************/
    NgChm.SRCH.getAxisSearchResults = function (axis) {
	// axis is capitalized in so many ways :-(.
	axis = NgChm.MMGR.isRow (axis) ? 'Row' : 'Column';
	// Convert keys to integers so that callers don't have to.
	return Object.keys(searchResults[axis]).map (val => +val);
    };

    /**********************************************************************************
     * FUNCTION - setAxisSearchResults: set all search items from left to right (inclusive)
     * on the specified axis.
     ***********************************************************************************/
    NgChm.SRCH.setAxisSearchResults = function (axis, left, right) {
        const axisResults = searchResults[axis];
	const gaps = getGaps(axis);
	for (let i = left; i <= right; i++) {
	    if (!gaps[i]) axisResults[i] = 1;
	}
    };

    /**********************************************************************************
     * FUNCTION - setAxisSearchResultsVec: set all label indices in vec as search results
     * on the specified axis.
     ***********************************************************************************/
    NgChm.SRCH.setAxisSearchResultsVec = function (axis, vec) {
        const axisResults = searchResults[axis];
	const gaps = getGaps(axis);
	vec.forEach (i => {
	    if (!gaps[i]) axisResults[i] = 1;
	});
    };

    /**********************************************************************************
     * FUNCTION - clearAxisSearchItems: clear all search items from left to right (inclusive)
     * on the specified axis.
     ***********************************************************************************/
    NgChm.SRCH.clearAxisSearchItems = function (axis, left, right) {
	for (let j = +left; j < +right+1; j++) {
	    delete searchResults[axis][j];
	}
    };

    NgChm.SRCH.clearAllAxisSearchItems = function (axis) {
        searchResults[axis] = {};
    };

    /*********************************************************************************************
     * FUNCTION:  labelIndexInSearch - Returns true iff index is included in axis search results.
     *********************************************************************************************/
    NgChm.SRCH.labelIndexInSearch = function (axis, index) {
	return index != null && axis != null && searchResults[axis][index] == 1;
    };

    /*********************************************************************************************
     * FUNCTION:  labelIndexInSearch - This function retrieves and array of search labels based
     * upon type an axis.
     *********************************************************************************************/
    NgChm.SRCH.getSearchLabelsByAxis = function (axis, labelType) {
	let searchLabels = [];
	const labels = axis == 'Row' ? NgChm.heatMap.getRowLabels()["labels"] : axis == "Column" ? NgChm.heatMap.getColLabels()['labels'] :
		axis == "ColumnCovar" ? Object.keys(NgChm.heatMap.getColClassificationConfig()) : axis == "ColumnCovar" ? Object.keys(NgChm.heatMap.getRowClassificationConfig()) : 
			[NgChm.heatMap.getRowLabels()["labels"], NgChm.heatMap.getColLabels()['labels'] ];
	NgChm.SRCH.getAxisSearchResults(axis).forEach(i => {
		if (axis.includes("Covar")){
			if (labelType == linkouts.VISIBLE_LABELS){
				searchLabels.push(labels[i].split("|")[0]);
			} else if (labelType == linkouts.HIDDEN_LABELS){
				searchLabels.push(labels[i].split("|")[1]);
			} else {
				searchLabels.push(labels[i]);
			}
		} else {
			if (labelType == linkouts.VISIBLE_LABELS){
				searchLabels.push(labels[i-1].split("|")[0]);
			} else if (labelType == linkouts.HIDDEN_LABELS){
				searchLabels.push(labels[i-1].split("|")[1]);
			} else {
				searchLabels.push(labels[i-1]);
			}
		}
	});
	return searchLabels;
    };

    /**********************************************************************************
     * FUNCTION - detailSearch: The purpose of this function is to serve as a driver
     * for the entire search process.  It will fork search processing depending upon
     * the search_on target (label or covar) and perform any functions that are common
     * to both.  It is called when search string is entered.
     ***********************************************************************************/
    NgChm.SRCH.detailSearch = function () {
	NgChm.UTIL.closeCheckBoxDropdown('srchCovSelectBox','srchCovCheckBoxes');
	clearSearchRequest();
	NgChm.SRCH.showSearchResults();
	let validSearch = true;
	const searchOn = document.getElementById('search_on');
	if (searchOn.value === 'labels') {
		labelSearch();
	} else {
		validSearch = covarSearch();
	}
	NgChm.SUM.redrawSelectionMarks();
	NgChm.SUM.drawTopItems();
	NgChm.SRCH.showSearchResults(validSearch);	
	NgChm.SRCH.updateLinkoutSelections();
	let dc = document.getElementById("detail_canvas");
	if (dc != null) dc.focus();
    };

    /**********************************************************************************
     * FUNCTION - updateLinkoutSelections: The purpose of this function to post
     * all selections (both row and column) to linkouts.
     ***********************************************************************************/
    NgChm.SRCH.updateLinkoutSelections = function () {
	NgChm.LNK.postSelectionToLinkouts("column", "standardClick");
	NgChm.LNK.postSelectionToLinkouts("row", "standardClick");
    };

    /**********************************************************************************
     * Internal FUNCTION - searchOnSel: The purpose of this function is to manage the display
     * of the various search boxes (std label search text box, continuous covariate search
     * text box, and discrete dropdown checkbox) depending upon the entry that the user
     * selects in the search on dropdown control.
      **********************************************************************************/
    function searchOnSel () {
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
			loadCovarSearch();
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
     * Internal FUNCTION - loadCovarSearch: The purpose of this function is to populate
     * a discrete covariate check box dropdown with items for a specific covariate
     * bar selected from the search_on dropdown select box.
     **********************************************************************************/
    function loadCovarSearch () {
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
	NgChm.UTIL.createCheckBoxDropDown('srchCovSelectBox','srchCovCheckBoxes',"Select Category(s)", currentClassBar.color_map.thresholds,"300px");
	checkBoxes.innerHTML = checkBoxes.innerHTML + "<label for='Missing'><input type='checkBox' class='srchCovCheckBox' value='missing'>Missing</input></label>";
	loadSavedCovarState(covType,covVal);
    }

    /**********************************************************************************
     * Internal FUNCTION - saveCovarState: The purpose of this function is to save the check
     * box state of a discrete covariate checkbox dropdown when a search is run;
     **********************************************************************************/
    function saveCovarState (covVal) {
	const searchTarget = document.getElementById('search_target').value;
	const currElems = document.getElementsByClassName('srchCovCheckBox');
	let state = covVal+"|"
	for (let i=0; i<currElems.length;i++) {
	    if (currElems[i].checked) {
		state = state + i + "|";
	    }
	}
	discCovStates[searchTarget] = state;
    }

    /**********************************************************************************
     * Internal FUNCTION - loadSavedCovarState: The purpose of this function is to load the
     * saved state of a discrete covariate bar's checkboxes and check those boxes
     * that have been used in a current search.
     ***********************************************************************************/
    function loadSavedCovarState (covType, covVal) {
	const searchTarget = document.getElementById('search_target').value;
	if (discCovStates[searchTarget] === "") {
		return;
	}
	const checkBoxes = document.getElementById('srchCovCheckBoxes');
	const stateElems = discCovStates[searchTarget].split("|");
	if ((stateElems[0] === covType) && (stateElems[1] === covVal)) {
		for (let i=2;i<stateElems.length-1;i++) {
			let stateElem = parseInt(stateElems[i]);
			checkBoxes.children[stateElem].children[0].click();
		}
	}
    }

    /**********************************************************************************
     * Internal FUNCTION - cleanseSearchString: The purpose of this function is primarily to strip
     * duplicate delimiter characters from a Label search string.  These result in
     * selecting every row. It also replaces all delimiters with a comma.  The resulting
     * cleansed string is later placed in the search text box.
     ***********************************************************************************/
    function cleanseSearchString (searchStr) {
	const srchItems = searchStr.split(/[|;, ]+/);
	let cleanStr = "";
	for (let j = 0; j < srchItems.length; j++) {
		let item = srchItems[j];
		item = item.replace(/^\|+|\..$/g, '');
		item = item.replace(/^\|+|\,+|\;+|\,+|\;+|\|+$/g, '');
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
     * Internal FUNCTION - covarSearch: The purpose of this function is to perform
     * a covariate-bar based search. It calls the sub-functions necessary to execute
     * the search and manages the appearance of the covariate search text box.
     **********************************************************************************/
    function covarSearch () {
	const searchOn = document.getElementById("search_on");
	const [covType, covVal] = searchOn.value.split("|");

	const axis = NgChm.MMGR.isRow (covType) ? 'Row' : 'Column';
	const classDataValues = NgChm.heatMap.getAxisCovariateData(axis)[covVal].values;
	const currentClassBar = NgChm.heatMap.getAxisCovariateConfig(axis)[covVal];
	let validSearch = true;
	let searchElement;
	let results = [];
	if (currentClassBar.color_map.type === 'discrete') {
		searchElement = document.getElementById('overSelect');
		// Get the values of the selected category boxes.
		const cats = [...document.getElementsByClassName("srchCovCheckBox")]
		    .filter (cb => cb.checked)
		    .map (cb => cb.value);
		results = getSelectedDiscreteSelections (axis, cats, classDataValues);
		saveCovarState(searchOn.value);

	} else {
		searchElement = document.getElementById('search_cov_cont');
		//Remove all spaces from expression
		const searchString = searchElement.value.trim().replace(/ /g,'');
		searchElement.value = searchString;
		const searchExprs = parseContinuousSearchString (searchString);
		validSearch = validateContinuousSearch(searchExprs);
		if (validSearch) {
			results = getSelectedContinuousSelections(axis, searchExprs, classDataValues);
		}
	}
	if (results.length === 0) {
	    //Clear previous matches when search is empty.
	    NgChm.SEL.updateSelections();
	    searchElement.style.backgroundColor = "rgba(255,0,0,0.3)";
	} else {
	    NgChm.SRCH.setAxisSearchResultsVec(axis, results);
	    searchElement.style.backgroundColor = "rgba(255,255,255,0.3)";
	}
	searchNext(true);
	return validSearch;
    };

    /**********************************************************************************
     * FUNCTION - continuousCovarSearch returns the indices of elements that match
     * searchString on the specified axis for a continuous covariate covar.
     ***********************************************************************************/
    NgChm.SRCH.continuousCovarSearch = function (axis, covar, searchString) {
	axis = NgChm.MMGR.isRow (axis) ? 'Row' : 'Column';
	const classDataValues = NgChm.heatMap.getAxisCovariateData(axis)[covar].values;

	const searchExprs = parseContinuousSearchString (searchString.trim().replace(/ /g,''));
	const validSearch = validateContinuousSearch(searchExprs);
	const results = validSearch ? getSelectedContinuousSelections(axis, searchExprs, classDataValues) : [];
	return [ validSearch, results ];
    };

    /**********************************************************************************
     * Internal FUNCTION - getSelectedDiscreteSelections: The purpose of this function is to
     * find rows/cols that match the discrete category selections checked by the user.
     * It iterates the classDataValues data configuration for a given covariate bar
     * for either a direct match on category or, if missing is selected, missing values
     * on the covariate bar. If a value match is found, an item is added to the
     * searchResults array for the appropriate axis.
     ***********************************************************************************/
    function getSelectedDiscreteSelections (axis, cats, classDataValues) {
	const includeMissing = cats.indexOf("missing") > -1;
	const results = [];
	classDataValues.forEach((value,index) => {
	    if (cats.includes(value) || (includeMissing && ((value === 'null') || (value === 'NA')))) {
		results.push(index+1);
	    }
	});
	return results;
    };

/**********************************************************************************
 * FUNCTION - validateContinuousSearch: The purpose of this function it to validate
 * the  user entered continuous covariate search expressions and return a true/false
  **********************************************************************************/
    function parseContinuousSearchString (searchString) {
	return searchString.split(/[;,]+/).map(expr => parseSearchExpression(expr.trim().toLowerCase()));
    }

    function validateContinuousSearch (exprs) {
	for (let j=0;j<exprs.length;j++) {
	    if (isSearchValid(exprs[j].firstOper, exprs[j].firstValue, exprs[j].secondOper, exprs[j].secondValue) === false) {
		return false;
	    }
	}
	return true;
    }

    /**********************************************************************************
     * Internal function getSelectedContinuousSelections finds the
     * rows/cols that match the user-entered search expressions for continuous
     * covariate bars.  It iterates the classDataValues data configuration for a given
     * covariate bar and evaluates each value against an array of user entered expressions.
     * If a value is found to exist within the parameters of an expression, that value
     * is selected. This function also searches for missing values if the user enters
     * an expression that contains the word "miss".  If a value match is found, an item
     * is added to the searchResults array for the appropriate axis.
      **********************************************************************************/
    function getSelectedContinuousSelections (axis, searchExprs, classDataValues) {
	/* Expand and convert searchExprs.  Determine if any matches missing values. */
	var findMissing = false;
	const firstOpers = [];
	const firstValues = [];
	const secondOpers = [];
	const secondValues = [];
	searchExprs.forEach(({firstOper,firstValue,secondOper,secondValue}) => {
	    if (firstValue.includes("miss")) findMissing = true;
	    firstOpers.push(firstOper);
	    firstValues.push(parseFloat(firstValue)); // Pushes NaN for missing values
	    secondOpers.push(secondOper);
	    secondValues.push(parseFloat(secondValue));
	});
	/* Determine which values, if any, match at least one search expression. */
	const searchResults = [];
	classDataValues.forEach ((value, index) => {
	    if ((value === 'null') || (value === "NA")) {
		// Match if any search expression matches missing values.
		if (findMissing) searchResults.push(index+1);
	    } else {
		const floatValue = parseFloat (value);
		for (let j=0; j<searchExprs.length; j++) {
		    let selectItem = evaluateExpression (firstOpers[j], firstValues[j], floatValue);
		    if (selectItem && (secondOpers[j] !== null)) {
			selectItem = evaluateExpression (secondOpers[j], secondValues[j], floatValue);
		    }
		    if (selectItem) {
			searchResults.push(index+1);
			return;
		    }
		}
	    }
	});
	return searchResults;
    };

    /**********************************************************************************
     * Internal FUNCTION - evaluateExpression: The purpose of this function is to evaluate
     * a user entered expression against a value from the classDataValues for a given
     * covariate. It checks first for values that meet the greater than operators
     * (> and >=).  Then it checks for values that meet the less than operators.
     * Finally, it checks for values that meet the equal to operators (===,>=,<=).
     * If a value satisfies any of these conditions a true value is returned.
     **********************************************************************************/
    function evaluateExpression (oper, srchValue, dataValue) {
	if (oper.charAt(0) === '>' && dataValue > srchValue) return true;
	if (oper.charAt(0) === '<' && dataValue < srchValue) return true;
	if (oper.charAt(1) === '=' && dataValue === srchValue) return true;
	return false;
    }

    /**********************************************************************************
     * Internal FUNCTION - parseSearchExpression: The purpose of this function is to
     * take a search expression (>44,>45<=90,88, etc...), parse that expression, and
     * return an object with 4 variables (the first expression operator, the first
     * expression value, second operator, and second) value.  If an expression is just
     * a single number, the first oper will be "===" and the first value, the expression.
     * A null is returned if no valid expression is found.
     ***********************************************************************************/
    function parseSearchExpression (expr) {
	//Make a first pass thru the expression
	const firstPass = examineExpression(expr);
	if (firstPass === null) { return null; }
	let firstOper = null;
	let firstValue = null;
	let secondOper = null;
	let secondValue = null;
	// If we have an "equal to" expression (either a number OR 'missing') there is only one oper.
	if (firstPass.oper === "===" || firstPass.oper === "txt") {
		// Use the 'is equal' test to evaluate the expression
		firstOper = firstPass.oper;
		firstValue = firstPass.remainder;
	} else {
		// We have a numeric oper.
		// We need to do a second pass to see if there's a second oper.
		// examineExpression will find greater than operators first, even if they're later in the expr,
		// so we check the position to see if the operator occurs first.
		if (firstPass.position === 0) {
			// The first pass found an operator in position 0.
			// The firstOper is set AND the rest of the string needs a second pass
			firstOper = firstPass.oper;
			if (NgChm.UTIL.isNaN(firstPass.remainder) === false) {
			    // The first pass remainder is a numeric value so we have identified the first value
			    // and there is no second operator.
			    firstValue = firstPass.remainder;
			} else {
			    const secondPass = examineExpression(firstPass.remainder);
			    secondOper = secondPass.oper
			    firstValue = firstPass.remainder.substring(0,secondPass.position);
			    secondValue = secondPass.remainder;
			}
		} else {
			// If the first pass found an operator in position other than 0:
			// the operator found is the second operator and the remainder is the second value
			// AND the first half of the string needs a second pass
			secondOper = firstPass.oper;
			secondValue = firstPass.remainder;
			const secondPass = examineExpression(expr.substring(0, firstPass.position));
			//With the results of the second pass we have now identified both operators and both values
			firstValue = secondPass.remainder;
			firstOper = secondPass.oper;
		}
	}
	return {firstOper: firstOper, firstValue: firstValue, secondOper: secondOper, secondValue};
    }

/**********************************************************************************
 * Internal FUNCTION - examineExpression: The purpose of this function is to evaluate an incoming
 * string and pull out the components of the expression.  It returns an object
 * containing the following values: The first operator (>,<,>=,<=) found, the position
 * that the operator was found in, and the string remainder of that expression
 * UNLESS the expression contains none of those above operators.  If none of them
 * are found, the expression is evaluated to see if it contains a numeric value. If
 * so, the first operator is "=" and the remainder is the expression.  Null is 
 * returned if the expression yields no results.
  **********************************************************************************/
    function examineExpression (expr) {
	const ops = [ ">=", ">", "<=", "<" ];  // Longer ops before shorter ones.
	for (let i = 0; i < ops.length; i++) {
	    const idx = expr.indexOf(ops[i]);
	    if (idx !== -1) {
		return { oper: ops[i], position: idx, remainder: expr.substring(idx+ops[i].length,expr.length) };
	    }
	}
	const oper = NgChm.UTIL.isNaN(expr) ? "txt" : "===";
	return { oper: oper, position: 0, remainder: expr }; // Position included for type compatibility.
    }

    /**********************************************************************************
     * Internal FUNCTION - isSearchValid: The purpose of this function is to evaluate the operators
     * and values entered by the user ensure that they are actual operators and float values
     * BEFORE using them in an EVAL statement.  This is done to preclude code injection.
      **********************************************************************************/
    function isSearchValid (firstOper, firstValue, secondOper, secondValue) {
	if ((firstOper !== '>') && (firstOper !== '<') && (firstOper !== '>=') && (firstOper !== '<=')  && (firstOper !== '===')) {
		return false;
	}
	if (NgChm.UTIL.isNaN(firstValue)) {
	    if (firstOper !== "===") return false;
	    if (!firstValue.includes("miss")) return false;
	}
	if (secondOper !== null) {
		if ((secondOper !== '>') && (secondOper !== '<') && (secondOper !== '>=') && (secondOper !== '<=')) {
			return false;
		}
		if (NgChm.UTIL.isNaN(secondValue) === true) {
			return false;
		}
		if (firstOper === '===') {
			return false;
		}
	}
	return true;
    }

    /**********************************************************************************
     * Internal FUNCTION - labelSearch: The purpose of this function is to perform
     * a label based search. It calls the sub-functions necessary to execute
     * the search and manages the appearance of the label search text box.
     ***********************************************************************************/
    function labelSearch () {
	let searchElement = document.getElementById('search_text');
	let searchString = searchElement.value.trim();
	searchString = cleanseSearchString(searchString);
	searchElement.value = searchString;

	if (searchString == "" || searchString == null || searchString == " ") {
		return false;
	}
	
	let tmpSearchItems = searchString.split(/[;, ]+/);
	const itemsFound = [];
	
	const searchTarget = document.getElementById('search_target').value;
	
	// Put labels into the global search item list if they match a user search string.
	// Regular expression is built for partial matches if the search string contains '*'.
	// toUpperCase is used to make the search case insensitive.
	if (searchTarget !== 'Column') {
		searchLabels("Row", tmpSearchItems, itemsFound);
	}
	if (searchTarget !== 'Row') {
		searchLabels("Column", tmpSearchItems, itemsFound);
	}

	// Jump to the first match
	if (searchString == null || searchString == ""){
		return;
	}

	searchNext(true);
	searchElement.style.backgroundColor = "rgba(255,255,255,0.3)";
	if (currentSearchItem.index && currentSearchItem.axis){
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
		NgChm.SEL.updateSelections();
	}
    }

    /**********************************************************************************
     * Internal FUNCTION - searchLabels: The purpose of this function is to search through
     * labels collections for matches.
     ***********************************************************************************/
    function searchLabels (axis,tmpSearchItems,itemsFound) {
	const labels = NgChm.heatMap.getAxisLabels(axis)["labels"]
	    .map (label => {
		label = label.toUpperCase();
		if (label.indexOf('|') > -1) {
			label = label.substring(0,label.indexOf('|'));
		}
		return label;
	    });
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
		let matches = [];
		labels.forEach((label,index) => { if (reg.test(label)) matches.push (index+1); });
		if (matches.length > 0) {
		    NgChm.SRCH.setAxisSearchResultsVec(axis, matches);
		    if (itemsFound.indexOf(searchItem) == -1)
			    itemsFound.push(searchItem);
		}	
	}
    }

    /**********************************************************************************/

    /**********************************************************************************
     * FUNCTION - getCurrentSearchItem: This function returns the current search item.
     **********************************************************************************/
    NgChm.SRCH.getCurrentSearchItem = function() {
	    return currentSearchItem;
    };

    /**********************************************************************************
     * FUNCTION - clearCurrentSearchItem: This function clears the current search item.
     **********************************************************************************/
    NgChm.SRCH.clearCurrentSearchItem = function() {
	    currentSearchItem = {};
    };

    /**********************************************************************************
     * FUNCTION - searchNext: The purpose of this function is to find the
     * next search item, set it as the current search item, and move the focus of
     * the heat map detail panel to that item.
     ***********************************************************************************/
    function searchNext (firstTime) {
	const searchAxis = document.getElementById('search_target').value;
	NgChm.UTIL.closeCheckBoxDropdown('srchCovSelectBox','srchCovCheckBoxes');
	if (firstTime || !currentSearchItem["index"] || !currentSearchItem["axis"]) {
	    // Start new search.  If searchAxis == "Both", start on the columns.
	    findNextSearchItem(-1, searchAxis === "Column" ? "Column" : "Row");
	} else if ((searchAxis === 'Both') || (currentSearchItem["axis"] === searchAxis)) {
	    // Continue search on current axis if permitted.
	    findNextSearchItem(currentSearchItem["index"], currentSearchItem["axis"]);
	} else {
	    // Start search from beginning of requested axis otherwise.
	    findNextSearchItem(-1, searchAxis);
	}
	goToCurrentSearchItem();
    }


    /**********************************************************************************
     * Internal FUNCTION - findNextAxisSearchItem: Returns the index of the next search item
     * after index on the specified axis.  If no search item found, returns -1.
     ***********************************************************************************/
    function findNextAxisSearchItem (axis, index) {
	const axisLength = NgChm.heatMap.getAxisLabels(axis).labels.length;
        const axisItems = searchResults[axis];
	while( ++index <= axisLength) {
	    if (axisItems[index]) return index;
	}
	return -1;
    }

    /**********************************************************************************
     * Internal FUNCTION - findPrevAxisSearchItem: Returns the index of the previous search item
     * before index on the specified axis.  If index is -1, start from the last index.
     * If no search item found, returns -1.
     ***********************************************************************************/
    function findPrevAxisSearchItem (axis, index) {
        const axisItems = searchResults[axis];
	if (index == -1) {
	    index = NgChm.heatMap.getAxisLabels(axis).labels.length + 1;
	}
	while( --index >= 0) {
	   if (axisItems[index]) return index;
	}
	return -1;
    }

    /**********************************************************************************
     * Internal FUNCTION - findNextSearchItem: The purpose of this function is to find the
     * next search item, based upon the search target (row/col/both) and set that item
     * as the current search item.
     ***********************************************************************************/
    function findNextSearchItem (index, axis) {

	// Find next search item on current axis.
	let curr = findNextAxisSearchItem (axis, index);
	if (curr >= 0) {
	        // Found it. Set search item.
		setSearchItem(axis, curr);
	} else {
		const searchTarget = document.getElementById('search_target').value;
	        // if no more searchResults exist in first axis, move to other axis if possible.
		if (searchTarget === 'Both') {
			const otherAxis = axis == "Row" ? "Column" : "Row";
			curr = findNextAxisSearchItem (otherAxis, -1);
			if (curr >= 0) {
				// Found it. Set search item.
				setSearchItem(otherAxis, curr);
				return;
			}
		}
		// Either can't search other axis, or no matches on that axis.
		// Try from beginning of current axis.
		curr = findNextAxisSearchItem (axis, -1);
		if (curr >= 0) {
			// Found it. Set search item.
			setSearchItem(axis, curr);
		}
	}
    }

    /**********************************************************************************
     * Internal FUNCTION - setSearchItem: The purpose of this function is to set the current
     * search item with the supplied axis and curr values. It is called by both the "next"
     * and "previous" searches.
      **********************************************************************************/
    function setSearchItem (axis, curr) {
	currentSearchItem["axis"] = axis;
	currentSearchItem["index"] = curr;
    }

    /**********************************************************************************
     * FUNCTION - searchPrev: The purpose of this function is to find the
     * previous search item, set it as the current search item, and move the focus of
     * the heat map detail panel to that item.
     ***********************************************************************************/
    function searchPrev () {
	NgChm.UTIL.closeCheckBoxDropdown('srchCovSelectBox','srchCovCheckBoxes');
	const searchAxis = document.getElementById('search_target').value;
	if ((searchAxis === 'Both') || (currentSearchItem["axis"] === searchAxis)) {
	    // Continue on current search axis if permitted.
	    findPrevSearchItem(currentSearchItem["index"],currentSearchItem["axis"]);
	} else {
	    // Start new search on requested axis.
	    findPrevSearchItem(-1, searchAxis);
	}
	goToCurrentSearchItem();
    }

    /**********************************************************************************
     * Internal FUNCTION - findPrevSearchItem: The purpose of this function is to find the
     * previous search item, based upon the search target (row/col/both) and set that item
     * as the current search item.
     ***********************************************************************************/
    function findPrevSearchItem (index, axis) {
	const axisLength = axis == "Row" ? NgChm.heatMap.getRowLabels().labels.length : NgChm.heatMap.getColLabels().labels.length;
	let curr = findPrevAxisSearchItem (axis, index);
	if (curr < 0) { // if no searchResults exist in first axis, move to other axis
		if (document.getElementById('search_target').value === 'Both') { 
			const otherAxis = axis == "Row" ? "Column" : "Row";
			curr = findPrevAxisSearchItem (otherAxis, -1);
			if (curr > 0){
				setSearchItem(otherAxis, curr);
				return;
			}
		}
		// Either other axis locked, or no matches on other axis.
		// Try from end of current axis.
		curr = findPrevAxisSearchItem (axis, -1);
		if (curr >= 0) {
			setSearchItem(axis, curr);
		}
	} else {
		setSearchItem(axis, curr);
	}
    }

    /**********************************************************************************
     * Internal FUNCTION - goToCurrentSearchItem: The purpose of this function is to move the
     * focus of the detail heat map panel to the current search item.
     ***********************************************************************************/
    function goToCurrentSearchItem () {
	const mapItem = NgChm.DMM.primaryMap;
	if (currentSearchItem.axis == "Row") {
		mapItem.currentRow = currentSearchItem.index;
		if ((mapItem.mode == 'RIBBONV') && mapItem.selectedStart!= 0 && (mapItem.currentRow < mapItem.selectedStart-1 || mapItem.selectedStop-1 < mapItem.currentRow)){
			NgChm.UHM.showSearchError(1);
		} else if (mapItem.mode == 'RIBBONV' && mapItem.selectedStart == 0){
			NgChm.UHM.showSearchError(2);
		} 
		NgChm.SEL.checkRow(mapItem);
	} else if (currentSearchItem.axis == "Column"){
		mapItem.currentCol = currentSearchItem.index;
		if ((mapItem.mode == 'RIBBONH') && mapItem.selectedStart!= 0 && (mapItem.currentCol < mapItem.selectedStart-1 || mapItem.selectedStop-1 < mapItem.currentCol )){
			NgChm.UHM.showSearchError(1)
		} else if (mapItem.mode == 'RIBBONH' && mapItem.selectedStart == 0){
			NgChm.UHM.showSearchError(2);
		} 
		NgChm.SEL.checkCol(mapItem);
	}
	NgChm.SEL.updateSelections();
    }

    /**********************************************************************************
     * FUNCTION - clearSearch: The purpose of this function is to process the user
     * selection to clear the current search when the red search 'X' is clicked. For
     * searches where the target is BOTH all searches will be cleared (row and column).
     * For ROW or COL searches, only the search for that axis will be cleared and the
     * next search item will move to the other axis.
     ***********************************************************************************/
    NgChm.SRCH.clearSearch = function () {
	NgChm.UTIL.closeCheckBoxDropdown('srchCovSelectBox','srchCovCheckBoxes');
	const searchTarget = document.getElementById('search_target').value;
	NgChm.SUM.clearSelectionMarks(searchTarget);
	clearSearchRequest(searchTarget);
	if (searchTarget === "Row") {
		if (currentSearchItem["axis"] === "Row") {
			findNextSearchItem(-1,"Column");
			goToCurrentSearchItem();
		}
		NgChm.SUM.rowDendro.clearSelectedBars();
		NgChm.SRCH.showSearchResults();	
	} else if (searchTarget === "Column") {
		if (currentSearchItem["axis"] === "Column") {
			findNextSearchItem(-1,"Row");
			goToCurrentSearchItem();
		}
		NgChm.SUM.colDendro.clearSelectedBars();
		NgChm.SRCH.showSearchResults();	
	} else {
		NgChm.SRCH.clearCurrentSearchItem();
		NgChm.DET.labelLastClicked = {};
		NgChm.SUM.rowDendro.clearSelectedBars();
		NgChm.SUM.colDendro.clearSelectedBars();
	}
	clearSearchElement();
	NgChm.SRCH.showSearchResults();	
	NgChm.SEL.updateSelections();
	NgChm.SRCH.updateLinkoutSelections();
	resetSearchBoxColor()
    };

    /**********************************************************************************
     * FUNCTION - resetSearchBoxColor: The purpose of this function is to clear the coloring
     * of the label and continuous covariate search boxes when the search is cleared
     ***********************************************************************************/
    function resetSearchBoxColor () {
	let searchElement = document.getElementById('search_text');
	searchElement.style.backgroundColor = "rgba(255,255,255,0.3)";
	searchElement = document.getElementById('search_cov_cont');
	searchElement.style.backgroundColor = "rgba(255,255,255,0.3)";
    }

    /**********************************************************************************
     * FUNCTION - clearSearchRequest: The purpose of this function is to clear the search
     * items on one OR both axes.
     ***********************************************************************************/
    function clearSearchRequest () {
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
     * FUNCTION - clearSearchItems: The purpose of this function is to clear the search
     * items on a particular axis.
     ***********************************************************************************/
    NgChm.SRCH.clearSearchItems = function (clickAxis) {
	searchResults[clickAxis] = {};
	if (clickAxis === "Row"){
		NgChm.SUM.rowDendro.clearSelectedBars();
	} else if (clickAxis === "Column"){
		NgChm.SUM.colDendro.clearSelectedBars();
	}
	let markLabels = document.getElementsByClassName('MarkLabel');
	for (let ii = 0; ii < markLabels.length; ii++){ // clear tick marks
		NgChm.DET.removeLabels(markLabels[ii].id);
	}
    };

    /**********************************************************************************
     * FUNCTION - clearSearchElement: The purpose of this function is to clear the appropriate
     * search data entry element.
      **********************************************************************************/
    function clearSearchElement () {
	const searchOn = document.getElementById('search_on').value;
	const searchTarget = document.getElementById('search_target').value.toLowerCase();
	const covType = searchOn.split("|")[0];
	const covVal = searchOn.split("|")[1];
	let classBarsConfig; 
	let classDataValues;
	const covAxis = covType === 'row' ? 'row' : 'column';
	if (searchOn === 'labels') {
		const resultsCnts = getSearchResultsCounts();
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
		discCovRowState = "";
		
	} else if (searchTarget === 'column') {
		discCovColState = "";
		
	} else {
		discCovRowState = "";
		discCovColState = "";
	}
    }

    /**********************************************************************************
     * FUNCTION - showSearchResults: The purpose of this function is to show the
     * search results text area below the search controls with the row/col count
     * results from the just-executed search IF there are search results to show.
     ***********************************************************************************/
    NgChm.SRCH.showSearchResults = function (validSearch) {
	const resultsCnts = getSearchResultsCounts();
	if (resultsCnts[2] > 0) {
		document.getElementById("search_display_text").innerHTML = "Found: Rows - " + resultsCnts[0] + " Columns - " + resultsCnts[1];
	} else if ((typeof validSearch !== 'undefined') && (validSearch === false)) {
		document.getElementById("search_display_text").innerHTML = "Invalid search expression entered";
	} else {
		hideSearchResults();
	}
    };

    /**********************************************************************************
     * Internal FUNCTION - hideSearchResults: The purpose of this function is to hide the
     * search results text area below the search controls.
     ***********************************************************************************/
    function hideSearchResults () {
	document.getElementById("search_display_text").innerHTML = "";
    }

    /**********************************************************************************
     * Internal FUNCTION - getSearchResultsCounts: The purpose of this function is to retrieve
     * counts for search results. It returns an integer array containing 3 values:
     * total row search results, total column results, and total combined results.
     ***********************************************************************************/
    function getSearchResultsCounts () {
        const rowCount = NgChm.SRCH.getAxisSearchResults("Row").length;
        const colCount = NgChm.SRCH.getAxisSearchResults("Column").length;
	return [ rowCount, colCount, rowCount+colCount ];
    }

/***********************************************************
 * End - Search Functions
 ***********************************************************/
})();
