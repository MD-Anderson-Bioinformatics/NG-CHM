(function () {
  "use strict";
  NgChm.markFile();

  //Define Namespace for NgChm SearchManager
  const SRCH = NgChm.createNS("NgChm.SRCH");

  const SRCHSTATE = NgChm.importNS("NgChm.SRCHSTATE");
  const MMGR = NgChm.importNS("NgChm.MMGR");
  const UTIL = NgChm.importNS("NgChm.UTIL");
  const SUM = NgChm.importNS("NgChm.SUM");
  const DVW = NgChm.importNS("NgChm.DVW");
  const DET = NgChm.importNS("NgChm.DET");
  const UHM = NgChm.importNS("NgChm.UHM");
  const PIM = NgChm.importNS("NgChm.PIM");
  const PANE = NgChm.importNS("NgChm.Pane");

  SRCH.clearAllCurrentSearchItems = function () {
    SRCHSTATE.clearAllCurrentSearchItems();
  };

  SRCH.setAxisSearchResults = function (axis, left, right) {
    SRCHSTATE.setAxisSearchResults(axis, left, right);
  };

  SRCH.setAxisSearchResultsVec = function (axis, vec) {
    SRCHSTATE.setAxisSearchResultsVec(axis, vec);
  };

  SRCH.clearSearchRange = function (axis, left, right) {
    SRCHSTATE.clearSearchRange(axis, left, right);
  };

  /**********************************************************************************
   * FUNCTION - configSearchInterface: This function initializes/resets all
   * search-related user interface elements.  It is called from the UI-Manager after the
   * heatMap has initialized.
   **********************************************************************************/
  SRCH.configSearchInterface = configSearchInterface;
  function configSearchInterface(heatMap) {
    const searchOn = document.getElementById("search_on");

    // Clear any existing options after the first (Labels).
    for (let i = searchOn.options.length - 1; i >= 1; i--) {
      searchOn.remove(i);
    }
    // Add additional options for all covariate bars.
    addCovariateOptions("col", heatMap.getColClassificationOrder());
    addCovariateOptions("row", heatMap.getRowClassificationOrder());
    searchOn.onchange = () => searchOnSel();

    // Connect UI elements to onclick handlers.
    let e = document.getElementById("cancel_btn");
    if (e) e.onclick = () => SRCH.clearSearch();
    e = document.getElementById("go_btn");
    if (e) e.onclick = () => SRCH.detailSearch();

    function addCovariateOptions(axis, barOrder) {
      barOrder.forEach((key) => {
        // create new option element
        const opt = document.createElement("option");
        const covname = key.length > 20 ? key.substring(0, 20) + "..." : key;
        opt.appendChild(document.createTextNode(covname));
        opt.value = axis + "|" + key;
        // add opt to end of select box
        searchOn.appendChild(opt);
      });
    }
  }

  /**********************************************************************************
   * FUNCTION - clearAllSearchResults: This function initializes/resets all
   * search-related state variables.
   **********************************************************************************/
  SRCH.clearAllSearchResults = function () {
    SRCHSTATE.clearAllSearchResults();
  };

  SRCH.doInitialSearch = function () {
    // Perform initial search if search parameter has been specified.
    // To be called after initialization of the panels.
    const searchParam = UTIL.getURLParameter("search");
    if (searchParam !== "") {
      let searchElement = document.getElementById("search_text");
      searchElement.value = searchParam;
      SRCH.detailSearch();
    }
  };

  /**********************************************************************************
   * FUNCTION - detailSearch: The purpose of this function is to serve as a driver
   * for the entire search process.  It will fork search processing depending upon
   * the search_on target (label or covar) and perform any functions that are common
   * to both.  It is called when search string is entered.
   ***********************************************************************************/
  SRCH.detailSearch = function () {
    UTIL.closeCheckBoxDropdown("srchCovSelectBox", "srchCovCheckBoxes");
    clearSearchRequest();
    SRCH.showSearchResults();
    let validSearch = true;
    const searchOn = document.getElementById("search_on");
    if (searchOn.value === "labels") {
      labelSearch();
    } else {
      validSearch = covarSearch();
    }
    SUM.redrawSelectionMarks();
    SUM.drawTopItems();
    SRCH.showSearchResults(validSearch);
    SRCH.updateLinkoutSelections();
    let dc = document.getElementById("detail_canvas");
    if (dc != null) dc.focus();
  };

  /**********************************************************************************
   * FUNCTION - updateLinkoutSelections: The purpose of this function to post
   * all selections (both row and column) to linkouts.
   ***********************************************************************************/
  SRCH.updateLinkoutSelections = function () {
    PIM.postSelectionToPlugins("column", "standardClick");
    PIM.postSelectionToPlugins("row", "standardClick");
  };

  /**********************************************************************************
   * Internal FUNCTION - searchOnSel: The purpose of this function is to manage the display
   * of the various search boxes (std label search text box, continuous covariate search
   * text box, and discrete dropdown checkbox) depending upon the entry that the user
   * selects in the search on dropdown control.
   **********************************************************************************/
  function searchOnSel() {
    UTIL.closeCheckBoxDropdown("srchCovSelectBox", "srchCovCheckBoxes");
    const searchOn = document.getElementById("search_on");
    var searchTarget = document.getElementById("search_target");
    const covType = searchOn.value.split("|")[0];
    const covVal = searchOn.value.split("|")[1];
    const searchCovDisc = document.getElementById("search_cov_disc");
    const searchCovCont = document.getElementById("search_cov_cont");
    const searchTxt = document.getElementById("search_text");
    const heatMap = MMGR.getHeatMap();
    let classBarsConfig;
    if (searchOn.value !== "labels") {
      if (covType === "row") {
        classBarsConfig = heatMap.getRowClassificationConfig();
        searchTarget.value = "Row";
      } else if (covType === "col") {
        classBarsConfig = heatMap.getColClassificationConfig();
        searchTarget.value = "Column";
      }
      searchTarget.disabled = true;
      const currentClassBar = classBarsConfig[covVal];
      if (currentClassBar.color_map.type === "continuous") {
        searchTxt.style.display = "none";
        searchCovCont.style.display = "";
        searchCovDisc.style.display = "none";
      } else {
        loadCovarSearch();
        searchTxt.style.display = "none";
        searchCovCont.style.display = "none";
        searchCovDisc.style.display = "inline-flex";
      }
    } else {
      searchTarget.disabled = false;
      searchTxt.style.display = "";
      searchCovCont.style.display = "none";
      searchCovDisc.style.display = "none";
    }
  }

  /**********************************************************************************
   * Internal FUNCTION - loadCovarSearch: The purpose of this function is to populate
   * a discrete covariate check box dropdown with items for a specific covariate
   * bar selected from the search_on dropdown select box.
   **********************************************************************************/
  function loadCovarSearch() {
    const searchOn = document.getElementById("search_on");
    const searchTarget = document.getElementById("search_target");
    const checkBoxes = document.getElementById("srchCovCheckBoxes");
    const selectBox = document.getElementById("srchCovSelectBox");
    const covAxis = searchOn.value.split("|")[0];
    const covVal = searchOn.value.split("|")[1];
    const heatMap = MMGR.getHeatMap();
    const classBarsConfig = heatMap.getAxisCovariateConfig(covAxis);
    const currentClassBar = classBarsConfig[covVal];
    UTIL.createCheckBoxDropDown(
      "srchCovSelectBox",
      "srchCovCheckBoxes",
      "Select Category(s)",
      currentClassBar.color_map.thresholds,
      "300px",
    );
    loadSavedCovarState(covAxis, covVal);
  }

  /**********************************************************************************
   * Internal FUNCTION - saveCovarState: The purpose of this function is to save the check
   * box state of a discrete covariate checkbox dropdown when a search is run;
   **********************************************************************************/
  function saveCovarState(covVal) {
    const searchTarget = document.getElementById("search_target").value;
    const currElems = document.getElementsByClassName("srchCovCheckBox");
    let state = covVal + "|";
    for (let i = 0; i < currElems.length; i++) {
      if (currElems[i].checked) {
        state = state + i + "|";
      }
    }
    SRCHSTATE.setDiscCovState(searchTarget, state);
  }

  /**********************************************************************************
   * Internal FUNCTION - loadSavedCovarState: The purpose of this function is to load the
   * saved state of a discrete covariate bar's checkboxes and check those boxes
   * that have been used in a current search.
   ***********************************************************************************/
  function loadSavedCovarState(covType, covVal) {
    const searchTarget = document.getElementById("search_target").value;
    const targetState = SRCHSTATE.getDiscCovState(searchTarget);
    if (targetState === "") {
      return;
    }
    const checkBoxes = document.getElementById("srchCovCheckBoxes");
    const stateElems = targetState.split("|");
    if (stateElems[0] === covType && stateElems[1] === covVal) {
      for (let i = 2; i < stateElems.length - 1; i++) {
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
  function cleanseSearchString(searchStr) {
    const srchItems = searchStr.split(/[|;, ]+/);
    let cleanStr = "";
    for (let j = 0; j < srchItems.length; j++) {
      let item = srchItems[j];
      item = item.replace(/^\|+|\..$/g, "");
      item = item.replace(/^\|+|\,+|\;+|\,+|\;+|\|+$/g, "");
      if (item !== "") {
        cleanStr = cleanStr + item + ",";
      }
    }
    cleanStr = cleanStr.substring(0, cleanStr.length - 1);
    if (cleanStr === "," || cleanStr === ";") {
      cleanStr = "";
    }
    return cleanStr;
  }

  /**********************************************************************************
   * Internal FUNCTION - covarSearch: The purpose of this function is to perform
   * a covariate-bar based search. It calls the sub-functions necessary to execute
   * the search and manages the appearance of the covariate search text box.
   **********************************************************************************/
  function covarSearch() {
    const searchOn = document.getElementById("search_on");
    const [covType, covVal] = searchOn.value.split("|");

    const axis = MMGR.isRow(covType) ? "Row" : "Column";
    const heatMap = MMGR.getHeatMap();
    const classDataValues = heatMap.getAxisCovariateData(axis)[covVal].values;
    const currentClassBar = heatMap.getAxisCovariateConfig(axis)[covVal];
    let validSearch = true;
    let searchElement;
    let results = [];
    if (currentClassBar.color_map.type === "discrete") {
      searchElement = document.getElementById("overSelect");
      // Get the values of the selected category boxes.
      const cats = [...document.getElementsByClassName("srchCovCheckBox")]
        .filter((cb) => cb.checked)
        .map((cb) => cb.value);
      results = getSelectedDiscreteSelections(axis, cats, classDataValues);
      saveCovarState(searchOn.value);
    } else {
      searchElement = document.getElementById("search_cov_cont");
      //Remove all spaces from expression
      const searchString = searchElement.value.trim().replace(/ /g, "");
      searchElement.value = searchString;
      const searchExprs = parseContinuousSearchString(searchString);
      validSearch = validateContinuousSearch(searchExprs);
      if (validSearch) {
        results = getSelectedContinuousSelections(
          axis,
          searchExprs,
          classDataValues,
        );
      }
    }
    if (results.length === 0) {
      //Clear previous matches when search is empty.
      DET.updateSelections();
      searchElement.style.backgroundColor = "rgba(255,0,0,0.3)";
    } else {
      SRCHSTATE.setAxisSearchResultsVec(axis, results);
      searchElement.style.backgroundColor = "rgba(255,255,255,0.3)";
    }
    if (DVW.primaryMap) searchNext(true, DVW.primaryMap);
    return validSearch;
  }

  /**********************************************************************************
   * FUNCTION - continuousCovarSearch returns the indices of elements that match
   * searchString on the specified axis for a continuous covariate covar.
   ***********************************************************************************/
  SRCH.continuousCovarSearch = function (axis, covar, searchString) {
    axis = MMGR.isRow(axis) ? "Row" : "Column";
    const heatMap = MMGR.getHeatMap();
    const classDataValues = heatMap.getAxisCovariateData(axis)[covar].values;

    const searchExprs = parseContinuousSearchString(
      searchString.trim().replace(/ /g, ""),
    );
    const validSearch = validateContinuousSearch(searchExprs);
    const results = validSearch
      ? getSelectedContinuousSelections(axis, searchExprs, classDataValues)
      : [];
    return [validSearch, results];
  };

  /**********************************************************************************
   * Internal FUNCTION - getSelectedDiscreteSelections: The purpose of this function is to
   * find rows/cols that match the discrete category selections checked by the user.
   * It iterates the classDataValues data configuration for a given covariate bar
   * for either a direct match on category or, if missing is selected, missing values
   * on the covariate bar. If a value match is found, an item is added to the
   * searchResults array for the appropriate axis.
   ***********************************************************************************/
  function getSelectedDiscreteSelections(axis, cats, classDataValues) {
    const includeMissing = cats.indexOf("missing") > -1;
    const results = [];
    classDataValues.forEach((value, index) => {
      if (
        cats.includes(value) ||
        (includeMissing && (value === "null" || value === "NA"))
      ) {
        results.push(index + 1);
      }
    });
    return results;
  }

  /**********************************************************************************
   * FUNCTION - validateContinuousSearch: The purpose of this function it to validate
   * the  user entered continuous covariate search expressions and return a true/false
   **********************************************************************************/
  function parseContinuousSearchString(searchString) {
    return searchString
      .split(/[;,]+/)
      .map((expr) => parseSearchExpression(expr.trim().toLowerCase()));
  }

  function validateContinuousSearch(exprs) {
    for (let j = 0; j < exprs.length; j++) {
      if (
        isSearchValid(
          exprs[j].firstOper,
          exprs[j].firstValue,
          exprs[j].secondOper,
          exprs[j].secondValue,
        ) === false
      ) {
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
  function getSelectedContinuousSelections(axis, searchExprs, classDataValues) {
    /* Expand and convert searchExprs.  Determine if any matches missing values. */
    var findMissing = false;
    const firstOpers = [];
    const firstValues = [];
    const secondOpers = [];
    const secondValues = [];
    searchExprs.forEach(
      ({ firstOper, firstValue, secondOper, secondValue }) => {
        if (firstValue.includes("miss")) findMissing = true;
        firstOpers.push(firstOper);
        firstValues.push(parseFloat(firstValue)); // Pushes NaN for missing values
        secondOpers.push(secondOper);
        secondValues.push(parseFloat(secondValue));
      },
    );
    /* Determine which values, if any, match at least one search expression. */
    const searchResults = [];
    classDataValues.forEach((value, index) => {
      if (value === "null" || value === "NA") {
        // Match if any search expression matches missing values.
        if (findMissing) searchResults.push(index + 1);
      } else {
        const floatValue = parseFloat(value);
        for (let j = 0; j < searchExprs.length; j++) {
          let selectItem = evaluateExpression(
            firstOpers[j],
            firstValues[j],
            floatValue,
          );
          if (selectItem && secondOpers[j] !== null) {
            selectItem = evaluateExpression(
              secondOpers[j],
              secondValues[j],
              floatValue,
            );
          }
          if (selectItem) {
            searchResults.push(index + 1);
            return;
          }
        }
      }
    });
    return searchResults;
  }

  /**********************************************************************************
   * Internal FUNCTION - evaluateExpression: The purpose of this function is to evaluate
   * a user entered expression against a value from the classDataValues for a given
   * covariate. It checks first for values that meet the greater than operators
   * (> and >=).  Then it checks for values that meet the less than operators.
   * Finally, it checks for values that meet the equal to operators (===,>=,<=).
   * If a value satisfies any of these conditions a true value is returned.
   **********************************************************************************/
  function evaluateExpression(oper, srchValue, dataValue) {
    if (oper.charAt(0) === ">" && dataValue > srchValue) return true;
    if (oper.charAt(0) === "<" && dataValue < srchValue) return true;
    if (oper.charAt(1) === "=" && dataValue === srchValue) return true;
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
  function parseSearchExpression(expr) {
    //Make a first pass thru the expression
    const firstPass = examineExpression(expr);
    if (firstPass === null) {
      return null;
    }
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
        if (UTIL.isNaN(firstPass.remainder) === false) {
          // The first pass remainder is a numeric value so we have identified the first value
          // and there is no second operator.
          firstValue = firstPass.remainder;
        } else {
          const secondPass = examineExpression(firstPass.remainder);
          secondOper = secondPass.oper;
          firstValue = firstPass.remainder.substring(0, secondPass.position);
          secondValue = secondPass.remainder;
        }
      } else {
        // If the first pass found an operator in position other than 0:
        // the operator found is the second operator and the remainder is the second value
        // AND the first half of the string needs a second pass
        secondOper = firstPass.oper;
        secondValue = firstPass.remainder;
        const secondPass = examineExpression(
          expr.substring(0, firstPass.position),
        );
        //With the results of the second pass we have now identified both operators and both values
        firstValue = secondPass.remainder;
        firstOper = secondPass.oper;
      }
    }
    return {
      firstOper: firstOper,
      firstValue: firstValue,
      secondOper: secondOper,
      secondValue,
    };
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
  function examineExpression(expr) {
    const ops = [">=", ">", "<=", "<"]; // Longer ops before shorter ones.
    for (let i = 0; i < ops.length; i++) {
      const idx = expr.indexOf(ops[i]);
      if (idx !== -1) {
        return {
          oper: ops[i],
          position: idx,
          remainder: expr.substring(idx + ops[i].length, expr.length),
        };
      }
    }
    const oper = UTIL.isNaN(expr) ? "txt" : "===";
    return { oper: oper, position: 0, remainder: expr }; // Position included for type compatibility.
  }

  /**********************************************************************************
   * Internal FUNCTION - isSearchValid: The purpose of this function is to evaluate the operators
   * and values entered by the user ensure that they are actual operators and float values
   * BEFORE using them in an EVAL statement.  This is done to preclude code injection.
   **********************************************************************************/
  function isSearchValid(firstOper, firstValue, secondOper, secondValue) {
    if (
      firstOper !== ">" &&
      firstOper !== "<" &&
      firstOper !== ">=" &&
      firstOper !== "<=" &&
      firstOper !== "==="
    ) {
      return false;
    }
    if (UTIL.isNaN(firstValue)) {
      if (firstOper !== "===") return false;
      if (!firstValue.includes("miss")) return false;
    }
    if (secondOper !== null) {
      if (
        secondOper !== ">" &&
        secondOper !== "<" &&
        secondOper !== ">=" &&
        secondOper !== "<="
      ) {
        return false;
      }
      if (UTIL.isNaN(secondValue) === true) {
        return false;
      }
      if (firstOper === "===") {
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
  function labelSearch() {
    let searchElement = document.getElementById("search_text");
    let searchString = searchElement.value.trim();
    searchString = cleanseSearchString(searchString);
    searchElement.value = searchString;

    if (searchString == "" || searchString == null || searchString == " ") {
      return false;
    }

    let tmpSearchItems = searchString.split(/[;, ]+/);
    const itemsFound = [];

    const searchTarget = document.getElementById("search_target").value;

    // Put labels into the global search item list if they match a user search string.
    // Regular expression is built for partial matches if the search string contains '*'.
    // toUpperCase is used to make the search case insensitive.
    if (searchTarget !== "Column") {
      searchLabels("Row", tmpSearchItems, itemsFound);
    }
    if (searchTarget !== "Row") {
      searchLabels("Column", tmpSearchItems, itemsFound);
    }

    // Jump to the first match
    if (searchString == null || searchString == "") {
      return;
    }

    searchElement.style.backgroundColor = "rgba(255,255,255,0.3)";
    if (DVW.primaryMap) {
      searchNext(true, DVW.primaryMap);
      const currentSearchItem = SRCHSTATE.getCurrentSearchItem(DVW.primaryMap);
      if (currentSearchItem.index && currentSearchItem.axis) {
        if (
          itemsFound.length != tmpSearchItems.length &&
          itemsFound.length > 0
        ) {
          searchElement.style.backgroundColor = "rgba(255,255,0,0.3)";
        } else if (itemsFound.length == 0) {
          searchElement.style.backgroundColor = "rgba(255,0,0,0.3)";
        }
      } else {
        if (searchString != null && searchString.length > 0) {
          searchElement.style.backgroundColor = "rgba(255,0,0,0.3)";
        }
        //Clear previous matches when search is empty.
        DET.updateSelections();
      }
    }
  }

  /**********************************************************************************
   * Internal FUNCTION - searchLabels: The purpose of this function is to search through
   * labels collections for matches.
   ***********************************************************************************/
  function searchLabels(axis, tmpSearchItems, itemsFound) {
    const heatMap = MMGR.getHeatMap();
    const labels = heatMap.getAxisLabels(axis)["labels"].map((label) => {
      label = label.toUpperCase();
      if (label.indexOf("|") > -1) {
        label = label.substring(0, label.indexOf("|"));
      }
      return label;
    });
    for (let j = 0; j < tmpSearchItems.length; j++) {
      let reg;
      const searchItem = tmpSearchItems[j];
      if (searchItem == "." || searchItem == "*") {
        // if this is a search item that's going to return everything, skip it.
        continue;
      }
      if (searchItem.charAt(0) == '"' && searchItem.slice(-1) == '"') {
        // is it wrapped in ""?
        reg = new RegExp(
          "^" + searchItem.toUpperCase().slice(1, -1).replace(".", "\\.") + "$",
        );
      } else {
        reg = new RegExp(searchItem.toUpperCase());
      }
      let matches = [];
      labels.forEach((label, index) => {
        if (reg.test(label)) matches.push(index + 1);
      });
      if (matches.length > 0) {
        SRCHSTATE.setAxisSearchResultsVec(axis, matches);
        if (itemsFound.indexOf(searchItem) == -1) itemsFound.push(searchItem);
      }
    }
  }

  /**********************************************************************************/

  /**********************************************************************************
   * FUNCTION - searchNext: The purpose of this function is to find the
   * next selected item, set it as the current selected item, and move the view of
   * the heat map detail panel to that item.
   ***********************************************************************************/
  SRCH.searchNext = searchNext;
  function searchNext(firstTime, mapItem) {
    const searchAxis = mapItem.allowedOrientations;
    const currentSearchItem = SRCHSTATE.getCurrentSearchItem(mapItem);

    UTIL.closeCheckBoxDropdown("srchCovSelectBox", "srchCovCheckBoxes");
    if (
      firstTime ||
      !currentSearchItem["index"] ||
      !currentSearchItem["axis"]
    ) {
      // Start new search.  If searchAxis == "any", start on the rows.
      findNextSearchItem(
        mapItem,
        -1,
        searchAxis === "column" ? "Column" : "Row",
      );
    } else if (
      searchAxis === "any" ||
      currentSearchItem["axis"].toLowerCase() === searchAxis
    ) {
      // Continue search on current axis if permitted.
      findNextSearchItem(
        mapItem,
        currentSearchItem["index"],
        currentSearchItem["axis"],
      );
    } else {
      // Start search from beginning of requested axis otherwise.
      findNextSearchItem(
        mapItem,
        -1,
        searchAxis == "column" ? "Column" : "Row",
      );
    }
    goToCurrentSearchItem(mapItem);
  }

  /**********************************************************************************
   * Internal FUNCTION - findNextAxisSearchItem: Returns the index of the next search item
   * after index on the specified axis.  If no search item found, returns -1.
   ***********************************************************************************/
  function findNextAxisSearchItem(mapItem, axis, index) {
    const axisLength = mapItem.heatMap.getAxisLabels(axis).labels.length;
    const axisItems = SRCHSTATE.getSearchResults(axis);
    while (++index <= axisLength) {
      if (axisItems[index]) return index;
    }
    return -1;
  }

  /**********************************************************************************
   * Internal FUNCTION - findPrevAxisSearchItem: Returns the index of the previous search item
   * before index on the specified axis.  If index is -1, start from the last index.
   * If no search item found, returns -1.
   ***********************************************************************************/
  function findPrevAxisSearchItem(mapItem, axis, index) {
    if (!axis) return -1;
    const axisItems = SRCHSTATE.getSearchResults(axis);
    if (index == -1) {
      index = mapItem.heatMap.getAxisLabels(axis).labels.length + 1;
    }
    while (--index >= 0) {
      if (axisItems[index]) return index;
    }
    return -1;
  }

  /**********************************************************************************
   * Internal FUNCTION - findNextSearchItem: The purpose of this function is to find the
   * next search item, based upon the search target (row/col/both) and set that item
   * as the current search item.
   ***********************************************************************************/
  function findNextSearchItem(mapItem, index, axis) {
    // Find next search item on current axis.
    let curr = findNextAxisSearchItem(mapItem, axis, index);
    if (curr >= 0) {
      // Found it. Set search item.
      SRCHSTATE.setSearchItem(mapItem, axis, curr);
    } else {
      const allowedAxes = mapItem.allowedOrientations;
      // if no more searchResults exist in first axis, move to other axis if possible.
      if (allowedAxes === "any") {
        const otherAxis = axis == "Row" ? "Column" : "Row";
        curr = findNextAxisSearchItem(mapItem, otherAxis, -1);
        if (curr >= 0) {
          // Found it. Set search item.
          SRCHSTATE.setSearchItem(mapItem, otherAxis, curr);
          return;
        }
      }
      // Either can't search other axis, or no matches on that axis.
      // Try from beginning of current axis.
      curr = findNextAxisSearchItem(mapItem, axis, -1);
      if (curr >= 0) {
        // Found it. Set search item.
        SRCHSTATE.setSearchItem(mapItem, axis, curr);
      }
    }
  }

  /**********************************************************************************
   * FUNCTION - searchPrev: The purpose of this function is to find the
   * previous search item, set it as the current search item, and move the focus of
   * the heat map detail panel to that item.
   ***********************************************************************************/
  SRCH.searchPrev = searchPrev;
  function searchPrev(mapItem) {
    UTIL.closeCheckBoxDropdown("srchCovSelectBox", "srchCovCheckBoxes");
    const currentSearchItem = SRCHSTATE.getCurrentSearchItem(mapItem);
    const searchAxis = mapItem.allowedOrientations;
    if (!currentSearchItem["index"] || !currentSearchItem["axis"]) {
      // No search result.
      return;
    } else {
      if (
        searchAxis === "any" ||
        currentSearchItem["axis"].toLowerCase() === searchAxis
      ) {
        // Continue on current search axis if permitted.
        findPrevSearchItem(
          mapItem,
          currentSearchItem["index"],
          currentSearchItem["axis"],
        );
      } else {
        // Start new search on requested axis.
        findPrevSearchItem(mapItem, -1, searchAxis);
      }
    }
    goToCurrentSearchItem(mapItem);
  }

  /**********************************************************************************
   * Internal FUNCTION - findPrevSearchItem: The purpose of this function is to find the
   * previous search item, based upon the search target (row/col/both) and set that item
   * as the current search item.
   ***********************************************************************************/
  function findPrevSearchItem(mapItem, index, axis) {
    axis = MMGR.isRow(axis) ? "Row" : "Column";

    // Try to find previous item on current axis.
    let curr = findPrevAxisSearchItem(mapItem, axis, index);
    if (curr >= 0) {
      SRCHSTATE.setSearchItem(mapItem, axis, curr);
      return;
    }

    // That failed, try other axis if allowed.
    const allowedAxes = mapItem.allowedOrientations;
    if (allowedAxes === "any") {
      const otherAxis = MMGR.isRow(axis) ? "Column" : "Row";
      curr = findPrevAxisSearchItem(mapItem, otherAxis, -1);
      if (curr > 0) {
        SRCHSTATE.setSearchItem(mapItem, otherAxis, curr);
        return;
      }
    }

    // Either a) other axis is not allowed, or b) no matches on other axis.
    // Try from end of the current axis.
    curr = findPrevAxisSearchItem(mapItem, axis, -1);
    if (curr >= 0) {
      SRCHSTATE.setSearchItem(mapItem, axis, curr);
    }
  }

  const orientMenuItems = ["Any axis", "Rows", "Columns"];
  const orientMenuIcons = [
    "icon-small-circle",
    "icon-horizontal-bar",
    "icon-horizontal-bar",
  ];
  const orientMenuValues = ["any", "row", "column"];
  const orientMenuRotate = ["", "90deg", ""];
  SRCH.showOrientDialog = showOrientDialog;
  function showOrientDialog(mapItem, button) {
    const btnPosn = button.getBoundingClientRect();
    const dialog = UTIL.newElement("DIV.menuPanel.remove-on-click");
    dialog.style.position = "absolute";
    dialog.style.top = btnPosn.y + btnPosn.height + 5 + "px";
    dialog.style.left = btnPosn.x + "px";
    for (let i = 0; i < 3; i++) {
      const menuIcon = UTIL.newSvgMenuItem(orientMenuIcons[i]);
      if (orientMenuRotate[i] != "")
        menuIcon.firstChild.style.rotate = orientMenuRotate[i];
      const menuItem = UTIL.newElement(
        "DIV.menuItem",
        { dataset: { orient: orientMenuValues[i] } },
        [menuIcon, orientMenuItems[i]],
      );
      dialog.appendChild(menuItem);
    }
    dialog.onclick = (ev) => {
      let target = ev.target;
      while (
        target &&
        !target.classList.contains("menuPanel") &&
        !target.classList.contains("menuItem")
      ) {
        target = target.parentElement;
      }
      if (target) {
        if (!target.classList.contains("menuPanel")) {
          const idx = orientMenuValues.indexOf(target.dataset.orient);
          if (idx < 0) {
            console.error("Illegal orientation: " + target.dataset.orient);
            return;
          }
          setAllowedMapOrientations(mapItem, button, idx);
        }
        while (target && !target.classList.contains("menuPanel")) {
          target = target.parentElement;
        }
        if (target) {
          document.body.removeChild(target);
        }
      }
    };
    document.body.appendChild(dialog);
  }

  SRCH.showNextOrientation = showNextOrientation;
  function showNextOrientation(mapItem, button) {
    const idx = orientMenuValues.indexOf(mapItem.allowedOrientations);
    if (idx < 0) {
      console.error(
        "mapItem has unknown orientation: " + mapItem.allowedOrientations,
      );
      return;
    }
    const newidx = (idx + 1) % orientMenuValues.length;
    setAllowedMapOrientations(mapItem, button, newidx);
  }

  function setAllowedMapOrientations(mapItem, button, idx) {
    const neworient = orientMenuValues[idx];
    mapItem.allowedOrientations = neworient;
    if (neworient != "any") {
      setSearchButtonsAxis(mapItem, neworient);
      mapItem.searchOrientation = neworient;
    }
    button.innerHTML =
      "<SVG width='1em' height='1em'><USE href='icons.svg#" +
      orientMenuIcons[idx] +
      "'/></SVG>";
    button.style.rotate = orientMenuRotate[idx];
    enableDisableSearchButtons(mapItem);
  }

  SRCH.enableDisableAllSearchButtons = enableDisableAllSearchButtons;
  function enableDisableAllSearchButtons(mapItem) {
    DVW.detailMaps.forEach(enableDisableSearchButtons);
  }

  SRCH.enableDisableSearchButtons = enableDisableSearchButtons;
  function enableDisableSearchButtons(mapItem) {
    const pane = PANE.findPaneLocation(mapItem.chm).pane;
    const srchPrev = pane.getElementsByClassName("srchPrev")[0];
    const srchNext = pane.getElementsByClassName("srchNext")[0];

    if (mapItem.allowedOrientations == "row") {
      const rowOK = anyOutsideSearchResults(
        SRCHSTATE.getAxisSearchResults("row"),
        mapItem.currentRow,
        mapItem.dataPerCol,
      );
      srchPrev.disabled = !rowOK;
      srchNext.disabled = !rowOK;
    } else if (mapItem.allowedOrientations == "column") {
      const colOK = anyOutsideSearchResults(
        SRCHSTATE.getAxisSearchResults("column"),
        mapItem.currentCol,
        mapItem.dataPerRow,
      );
      srchPrev.disabled = !colOK;
      srchNext.disabled = !colOK;
    } else {
      const rowOK = anyOutsideSearchResults(
        SRCHSTATE.getAxisSearchResults("row"),
        mapItem.currentRow,
        mapItem.dataPerCol,
      );
      const colOK = anyOutsideSearchResults(
        SRCHSTATE.getAxisSearchResults("column"),
        mapItem.currentCol,
        mapItem.dataPerRow,
      );
      srchPrev.disabled = !rowOK && !colOK;
      srchNext.disabled = !rowOK && !colOK;
    }
  }

  function anyOutsideSearchResults(searchResults, first, count) {
    const last = first + count - 1;
    for (let i = 0; i < searchResults.length; i++) {
      if (searchResults[i] < first || searchResults[i] > last) {
        return true;
      }
    }
    return false;
  }

  /* Set the orientation of the searchPrev and searchNext buttons of mapItem to match axis.
   */
  function setSearchButtonsAxis(mapItem, axis) {
    if (axis == "any") return;
    const pane = PANE.findPaneLocation(mapItem.chm).pane;
    const srchPrev = pane.getElementsByClassName("srchPrev");
    if (srchPrev.length > 0)
      srchPrev[0].style.rotate = MMGR.isRow(axis) ? "90deg" : "";
    const srchNext = pane.getElementsByClassName("srchNext");
    if (srchNext.length > 0)
      srchNext[0].style.rotate = MMGR.isRow(axis) ? "90deg" : "";
  }

  /**********************************************************************************
   * Internal FUNCTION - goToCurrentSearchItem: The purpose of this function is to move the
   * focus of the detail heat map panel to the current search item.
   ***********************************************************************************/
  function goToCurrentSearchItem(mapItem) {
    mapItem = mapItem || DVW.primaryMap;
    if (!mapItem) return;
    const currentSearchItem = SRCHSTATE.getCurrentSearchItem(mapItem);

    setSearchButtonsAxis(mapItem, currentSearchItem.axis);

    if (currentSearchItem.axis == "Row") {
      mapItem.currentRow = currentSearchItem.index;
      if (
        mapItem.mode == "RIBBONV" &&
        mapItem.selectedStart != 0 &&
        (mapItem.currentRow < mapItem.selectedStart - 1 ||
          mapItem.selectedStop - 1 < mapItem.currentRow)
      ) {
        showSearchError(1, currentSearchItem);
      } else if (mapItem.mode == "RIBBONV" && mapItem.selectedStart == 0) {
        showSearchError(2, currentSearchItem);
      }
      DVW.checkRow(mapItem);
    } else if (currentSearchItem.axis == "Column") {
      mapItem.currentCol = currentSearchItem.index;
      if (
        mapItem.mode == "RIBBONH" &&
        mapItem.selectedStart != 0 &&
        (mapItem.currentCol < mapItem.selectedStart - 1 ||
          mapItem.selectedStop - 1 < mapItem.currentCol)
      ) {
        showSearchError(1, currentSearchItem);
      } else if (mapItem.mode == "RIBBONH" && mapItem.selectedStart == 0) {
        showSearchError(2, currentSearchItem);
      }
      DVW.checkCol(mapItem);
    }
    enableDisableSearchButtons(mapItem);
    DET.updateSelections();
  }

  /**********************************************************************************
   * FUNCTION - clearSearch: The purpose of this function is to process the user
   * selection to clear the current search when the red search 'X' is clicked. For
   * searches where the target is BOTH all searches will be cleared (row and column).
   * For ROW or COL searches, only the search for that axis will be cleared and the
   * next search item will move to the other axis.
   ***********************************************************************************/
  SRCH.clearSearch = function () {
    UTIL.closeCheckBoxDropdown("srchCovSelectBox", "srchCovCheckBoxes");
    const searchTarget = document.getElementById("search_target").value;
    SUM.clearSelectionMarks(searchTarget);
    clearSearchRequest(searchTarget);
    if (searchTarget === "Row") {
      DVW.detailMaps.forEach((mapItem) => {
        const currentSearchItem = SRCHSTATE.getCurrentSearchItem(mapItem);
        if (currentSearchItem["axis"] === "Row") {
          findNextSearchItem(mapItem, -1, "Column");
          goToCurrentSearchItem(mapItem);
        }
      });
      SUM.rowDendro.clearSelectedBars();
      SRCH.showSearchResults();
    } else if (searchTarget === "Column") {
      DVW.detailMaps.forEach((mapItem) => {
        const currentSearchItem = SRCHSTATE.getCurrentSearchItem(mapItem);
        if (currentSearchItem["axis"] === "Column") {
          findNextSearchItem(mapItem, -1, "Row");
          goToCurrentSearchItem(mapItem);
        }
      });
      SUM.colDendro.clearSelectedBars();
      SRCH.showSearchResults();
    } else {
      SRCHSTATE.clearAllCurrentSearchItems();
      DET.labelLastClicked = {};
      SUM.rowDendro.clearSelectedBars();
      SUM.colDendro.clearSelectedBars();
    }
    clearSearchElement();
    SRCH.showSearchResults();
    DET.updateSelections();
    SRCH.updateLinkoutSelections();
    resetSearchBoxColor();
  };

  /**********************************************************************************
   * FUNCTION - resetSearchBoxColor: The purpose of this function is to clear the coloring
   * of the label and continuous covariate search boxes when the search is cleared
   ***********************************************************************************/
  function resetSearchBoxColor() {
    let searchElement = document.getElementById("search_text");
    searchElement.style.backgroundColor = "rgba(255,255,255,0.3)";
    searchElement = document.getElementById("search_cov_cont");
    searchElement.style.backgroundColor = "rgba(255,255,255,0.3)";
  }

  /**********************************************************************************
   * FUNCTION - clearSearchRequest: The purpose of this function is to clear the search
   * items on one OR both axes.
   ***********************************************************************************/
  function clearSearchRequest() {
    const searchTarget = document.getElementById("search_target").value;
    if (searchTarget === "Both") {
      SRCH.clearSearchItems("Row");
      SRCH.clearSearchItems("Column");
    } else {
      SRCH.clearSearchItems(searchTarget);
    }
    SUM.clearSelectionMarks(searchTarget);
  }

  /**********************************************************************************
   * FUNCTION - clearSearchItems: The purpose of this function is to clear all search
   * items on a particular axis.
   ***********************************************************************************/
  SRCH.clearSearchItems = function (clickAxis) {
    SRCHSTATE.clearAllAxisSearchItems(clickAxis);
    if (clickAxis === "Row") {
      SUM.rowDendro.clearSelectedBars();
    } else if (clickAxis === "Column") {
      SUM.colDendro.clearSelectedBars();
    }
    let markLabels = document.getElementsByClassName("MarkLabel");
    for (let ii = 0; ii < markLabels.length; ii++) {
      // clear tick marks
      DVW.removeLabels(markLabels[ii].id);
    }
  };

  /**********************************************************************************
   * FUNCTION - clearSearchElement: The purpose of this function is to clear the appropriate
   * search data entry element.
   **********************************************************************************/
  function clearSearchElement() {
    const searchOn = document.getElementById("search_on").value;
    const searchTarget = document
      .getElementById("search_target")
      .value.toLowerCase();
    const covType = searchOn.split("|")[0];
    const covVal = searchOn.split("|")[1];
    let classBarsConfig;
    let classDataValues;
    const covAxis = covType === "row" ? "row" : "column";
    const heatMap = MMGR.getHeatMap();
    if (searchOn === "labels") {
      const resultsCnts = getSearchResultsCounts();
      if (searchTarget === "both" && resultsCnts[2] !== 0) {
        return;
      } else if (searchTarget === "row" && resultsCnts[0] !== 0) {
        return;
      } else if (searchTarget === "col" && resultsCnts[1] !== 0) {
        return;
      }
      document.getElementById("search_text").value = "";
    } else {
      if (covAxis === searchTarget || searchTarget === "both") {
        if (covType === "row") {
          classBarsConfig = heatMap.getRowClassificationConfig();
        } else if (covType === "col") {
          classBarsConfig = heatMap.getColClassificationConfig();
        }
        const currentClassBar = classBarsConfig[covVal];
        if (currentClassBar.color_map.type === "continuous") {
          document.getElementById("search_cov_cont").value = "";
        } else {
          UTIL.resetCheckBoxDropdown("srchCovCheckBox");
        }
      }
    }
    if (searchTarget === "row") {
      SRCHSTATE.setDiscCovState("Row", "");
    } else if (searchTarget === "column") {
      SRCHSTATE.setDiscCovState("Column", "");
    } else {
      SRCHSTATE.setDiscCovState("Row", "");
      SRCHSTATE.setDiscCovState("Column", "");
    }
  }

  /**********************************************************************************
   * FUNCTION - showSearchResults: The purpose of this function is to show the
   * search results text area below the search controls with the row/col count
   * results from the just-executed search IF there are search results to show.
   ***********************************************************************************/
  SRCH.showSearchResults = function (validSearch) {
    const resultsCnts = getSearchResultsCounts();
    if (resultsCnts[2] > 0) {
      document.getElementById("search_display_text").innerHTML =
        "Selected: Rows - " + resultsCnts[0] + " Columns - " + resultsCnts[1];
      enableDisableAllSearchButtons();
    } else if (typeof validSearch !== "undefined" && validSearch === false) {
      document.getElementById("search_display_text").innerHTML =
        "Invalid search expression entered";
    } else {
      enableDisableAllSearchButtons();
      hideSearchResults();
    }
  };

  /**********************************************************************************
   * Internal FUNCTION - hideSearchResults: The purpose of this function is to hide the
   * search results text area below the search controls.
   ***********************************************************************************/
  function hideSearchResults() {
    document.getElementById("search_display_text").innerHTML = "";
  }

  /**********************************************************************************
   * Internal FUNCTION - getSearchResultsCounts: The purpose of this function is to retrieve
   * counts for search results. It returns an integer array containing 3 values:
   * total row search results, total column results, and total combined results.
   ***********************************************************************************/
  function getSearchResultsCounts() {
    const rowCount = SRCHSTATE.getAxisSearchResults("Row").length;
    const colCount = SRCHSTATE.getAxisSearchResults("Column").length;
    return [rowCount, colCount, rowCount + colCount];
  }

  function showSearchError(type, searchItem) {
    var searchError = UHM.getDivElement("searchError");
    searchError.style.display = "inherit";
    var searchBar = document.getElementById("search_text");
    searchError.style.top = searchBar.offsetTop + searchBar.offsetHeight + "px";
    searchError.style.left =
      searchBar.offsetLeft + searchBar.offsetWidth + "px";
    switch (type) {
      case 0:
        searchError.innerHTML = "No matching labels found";
        break;
      case 1:
        searchError.innerHTML =
          "Exit dendrogram selection to go to " + searchItem.label;
        break;
      case 2:
        searchError.innerHTML =
          "All " +
          searchItem.axis +
          " items are visible. Change the view mode to see " +
          searchItem.label;
        break;
    }
    UHM.hlpC();
    document.body.appendChild(searchError);
    setTimeout(function () {
      searchError.remove();
    }, 2000);
  }

  /**
   *  Function to show selected items when the 'SHOW' button in the Gear Dialog is clicked
   *
   *  @function redrawSearchResults
   */
  SRCH.redrawSearchResults = function () {
    DET.updateDisplayedLabels();
    SUM.redrawSelectionMarks();
    DET.updateSelections();
    SRCH.showSearchResults();
  };

  /***********************************************************
   * End - Search Functions
   ***********************************************************/
})();
