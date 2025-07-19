(function () {
  "use strict";
  NgChm.markFile();

  //Define Namespace for NgChm SearchManager
  const SRCH = NgChm.createNS("NgChm.SRCH");

  const SRCHSTATE = NgChm.importNS("NgChm.SRCHSTATE");
  const MAPREP = NgChm.importNS("NgChm.MAPREP");
  const UTIL = NgChm.importNS("NgChm.UTIL");
  const SUM = NgChm.importNS("NgChm.SUM");
  const DVW = NgChm.importNS("NgChm.DVW");
  const DET = NgChm.importNS("NgChm.DET");
  const UHM = NgChm.importNS("NgChm.UHM");
  const PIM = NgChm.importNS("NgChm.PIM");
  const PANE = NgChm.importNS("NgChm.Pane");
  const HEAT = NgChm.importNS("NgChm.HEAT");

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

  const debugNumeric = UTIL.getDebugFlag("srch-num");

  // CLASS SearchInterface.
  //
  // An instance of this class is used to manage all the UI elements
  // related to searching.
  //
  // When we instantiate the class, we will grab references to all of
  // the static search UI elements and setup event handlers.
  //
  class SearchInterface {
    constructor () {
      this.ui = {};
      // Discover UI elements and connect to event handlers.
      this.ui.searchOn = document.getElementById("search_on");
      this.ui.searchOn.onchange = () => this.searchOnChange();
      this.ui.cancelBtn = document.getElementById("cancel_btn");
      if (this.ui.cancelBtn) this.ui.cancelBtn.onclick = () => SRCH.clearSearch();
      this.ui.goBtn = document.getElementById("go_btn");
      if (this.ui.goBtn) this.ui.goBtn.onclick = () => SRCH.detailSearch();

      // Discover other UI elements.
      this.ui.searchAxis = document.getElementById("search_target");
      this.ui.searchAxis.onchange = this.getAxisChangeHandler();
      this.ui.searchForText = document.getElementById("search_text");
      this.ui.searchForCont = document.getElementById("search_cov_cont");
      this.ui.searchForDisc = document.getElementById("search_cov_disc");
      this.ui.checkBoxes = document.getElementById("srchCovCheckBoxes");
      this.ui.searchResults = document.getElementById("search_display_text");
    }
  }

  // METHOD SearchInterface.getAxisChangeHandler - Returns an event handler
  // that sets the search interface's searchFor.axis.
  //
  SearchInterface.prototype.getAxisChangeHandler = function () {
    const searchInterface = this;
    return function axisChangeHandler (ev) {
      console.log ("Search axis change", ev);
      switch (ev.target.value) {
        case "Row":
        case "Column":
          searchInterface.searchFor.axis = ev.target.value;
          break;
        case "Both":
          searchInterface.searchFor.axis = "";
          break;
        default:
          throw `axisChangeHandler: Unknown axis value ${ev.target.value}`;
      }
    };
  };

  // METHOD SearchInterface.reset - Reset the searchOn options so that only
  // label search entry is available.
  //
  SearchInterface.prototype.reset = function resetSearchInterface(heatMap) {
    // Record current heatMap.
    this.heatMap = heatMap;
    // Remove any existing options after the first (Labels).
    for (let i = this.ui.searchOn.options.length - 1; i >= 1; i--) {
      this.ui.searchOn.remove(i);
    }
    // Initialize search options for the labels entry.
    this.searchOnOpts = [
      {
        type: "text",
        axis: "",
        key: "",
        onSelect: null,
      }
    ];
    this.searchOnChange();
  };

  // METHOD SearchInterface.addSearchOption - Add an option to the searchOn dropdown
  // for opts.axis and opts.key.
  //
  SearchInterface.prototype.addSearchOption = function addSearchOption(opts) {
    // create new option element
    const option = document.createElement("option");
    const covname = opts.key.length > 20 ? opts.key.substring(0, 17) + "..." : opts.key;
    option.appendChild(document.createTextNode(covname));
    option.value = opts.axis + "|" + opts.key;
    // add opt to end of select box
    this.ui.searchOn.appendChild(option);
    this.searchOnOpts.push(opts);
  };

  SearchInterface.prototype.setSearchAxis = function setSearchAxis (axis) {
    this.ui.searchAxis.value = axis;
    this.searchFor.axis = axis;
  };

  // METHOD - SearchInterface.searchOnChange
  //
  // Change handler for the searchOn dropdown.
  //
  // - close the discrete target selector if it's open.
  // - display the appropriate search input element (text box, and discrete
  //   dropdown checkbox) depending upon the entry that the user selects.
  //
  SearchInterface.prototype.searchOnChange = function searchOnChange() {
    UTIL.closeCheckBoxDropdown("srchCovSelectBox", "srchCovCheckBoxes");

    const index = this.ui.searchOn.selectedIndex;
    const opts = this.searchOnOpts[index];

    // Set default searchFor values.
    this.searchFor = {
      type: opts.type, // text, discrete, or continuous
      axis: opts.axis, // "Row" or "Column" (forcing), or ""
      key: opts.key,
      discreteValues: [],
      doSearch: labelSearch
    };
    // Set option-specific searchFor values.
    if (opts.onSelect) opts.onSelect(opts, this.searchFor);
    // Force the axis dropdown to a specific value if specified.
    if (this.searchFor.axis) {
      this.searchFor.axis = MAPREP.isRow(this.searchFor.axis) ? "Row" : "Column";
      this.ui.searchAxis.value = this.searchFor.axis;
      this.ui.searchAxis.disabled = true;
    } else {
      this.ui.searchAxis.disabled = false;
      if (this.ui.searchAxis.value != "Both") {
        this.searchFor.axis = this.ui.searchAxis.value;
      }
    }
    // For discrete covariates, create the available options.
    if (this.searchFor.type == "discrete") {
      setDiscreteCheckBoxOptions(this.searchFor.discreteValues);
      // This element is created when the discrete options are created.
      this.ui.searchForDiscOverlay = document.getElementById("overSelect");
      // Pre-populate those options from saved state if possiible.
      this.loadDiscreteState();
    }
    // Display the appropriate searchFor input based on searchFor.type.
    switch (this.searchFor.type) {
      case "continuous":
        this.ui.searchForText.style.display = "none";
        this.ui.searchForCont.style.display = "";
        this.ui.searchForDisc.style.display = "none";
        break;
      case "discrete":
        this.ui.searchForText.style.display = "none";
        this.ui.searchForCont.style.display = "none";
        this.ui.searchForDisc.style.display = "inline-flex";
        break;
      case "text":
        this.ui.searchForText.style.display = "";
        this.ui.searchForCont.style.display = "none";
        this.ui.searchForDisc.style.display = "none";
        break;
      default:
        throw `searchOnChange: unknown searchFor.type ${this.searchFor.type}`;
    }

    // Helper FUNCTION - Set the options of the discrete covariate check box dropdown.
    function setDiscreteCheckBoxOptions(options) {
      UTIL.createCheckBoxDropDown(
        "srchCovSelectBox",
        "srchCovCheckBoxes",
        "Select Category(s)",
        options,
        "300px"
      );
    }
  };

  // METHOD SearchInterface.getDiscCheckBoxes - returns an array of the
  // discrete checkbox elements.
  //
  SearchInterface.prototype.getDiscCheckBoxes = function getDiscCheckBoxes() {
    return this.ui.checkBoxes.getElementsByClassName("srchCovCheckBox");
  };

  /**********************************************************************************
   * Method SearchInterface.saveDiscreteState: Save the state of the discrete covariate
   * checkbox dropdown.
   *
   * A string is saved for the current search axis.
   * The string consists of multiple fields separated by vertical bars ("|"):
   * - The first two fields are the current search axis and key (e.g. the covariate name).
   * - All subsequent fields, if any, are the indices of the checked boxes.
   **********************************************************************************/
  SearchInterface.prototype.saveDiscreteState = function saveDiscreteState() {
    const currElems = this.getDiscCheckBoxes();
    const state = [this.searchFor.axis, this.searchFor.key];
    for (let i = 0; i < currElems.length; i++) {
      if (currElems[i].checked) {
        state.push(i);
      }
    }
    SRCHSTATE.setDiscreteState(this.searchFor.axis, state.join("|"));
  };

  /**********************************************************************************
   * Method loadDiscreteState: Load the
   * saved state of a discrete covariate bar's checkboxes and check those boxes
   * that have been used in a current search.
   ***********************************************************************************/
  SearchInterface.prototype.loadDiscreteState = function loadDiscreteState() {
    const targetState = SRCHSTATE.getDiscreteState(this.searchFor.axis);
    if (typeof targetState !== "string" || targetState.length == 0) {
      // No saved state for this axis.
      return;
    }
    const stateElems = targetState.split("|");
    if (stateElems[0] === this.searchFor.axis && stateElems[1] === this.searchFor.key) {
      // The save state matches the current searchFor value.
      for (let i = 2; i < stateElems.length; i++) {
        const checkBoxIndex = parseInt(stateElems[i]);
        this.ui.checkBoxes.children[checkBoxIndex].children[0].click();
      }
    }
  };

  // Colors to set the search input to after a search, depending on how many
  // search items were matched: all, some but not all, or none.
  const textColors = {
    all: "rgba(255,255,255,0.3)", // white
    some: "rgba(255,255,0,0.3)", // yellow
    none: "rgba(255,0,0,0.3)" // red
  };

  // METHOD SearchInterface.setBackgroundColor - sets the background color of
  // the search element to reflect whether the last search matched none, some,
  // or all of the searchItems. The specific UI element to set the background
  // color on depends on the type of search that was performed.
  SearchInterface.prototype.setBackgroundColor = function setBackgroundColor(matches) {
    // Determine the color to set.
    let color;
    if (textColors.hasOwnProperty(matches)) {
      color = textColors[matches];
    } else {
      console.error (`SearchInterface.setBackgroundColor: unknown matches ${matches}`);
      color = textColors.none;
    }
    // Determine the UI element to color.
    let colorizableSearchElement;
    switch (this.searchFor.type) {
      case "text":
        colorizableSearchElement = this.ui.searchForText;
        break;
      case "continuous":
        colorizableSearchElement = this.ui.searchForCont;
        break;
      case "discrete":
        colorizableSearchElement = this.ui.searchForDiscOverlay;
        break;
      default:
        throw `SearchInterface.setSearchBackgroundColor: unknown searchFor.type ${this.searchFor.type}`;
    }
    // Set the UI element to the desired color.
    colorizableSearchElement.style.backgroundColor = color;
  };

  // METHOD SearchInterface.resetBackgroundColor - Clear the coloring of the search input box.
  //
  SearchInterface.prototype.resetBackgroundColor = function resetBackgroundColor() {
    this.setBackgroundColor("all");
  };

  // METHOD SearchInterface.getSearchString - Returns the value of the text search
  // input element.
  SearchInterface.prototype.getSearchString = function getSearchString() {
    return this.ui.searchForText.value;
  };

  // METHOD SearchInterface.setSearchString - Sets the value of the text search
  // input element.
  SearchInterface.prototype.setSearchString = function setSearchString(str) {
    this.ui.searchForText.value = str;
  };

  // METHOD SearchInterface.getSelectedCategories - Returns an array containing the values
  // of the selected search category boxes.
  SearchInterface.prototype.getSelectedCategories = function getSelectedCategories() {
    const cats = [];
    for (const checkBox of this.getDiscCheckBoxes()) {
      if (checkBox.checked) {
        cats.push(checkBox.value);
      }
    }
    return cats;
  };

  // METHOD SearchInterface.getContinuousSelectors - returns the continuous search criteria.
  //
  // The continuous search criteria input is updated to the canonical format.
  //
  SearchInterface.prototype.getContinuousSelectors = function getContinuousSelectors() {
    // Remove all spaces from continuous selector(s).
    const searchString = this.ui.searchForCont.value.trim().replace(/ /g, "");
    this.ui.searchForCont.value = searchString;
    return parseContinuousSearchString (searchString);
  };

  // FUNCTION parseContinuousSearchString - Parse a continuous search string into an
  // array of selectors. If the continuous search string is invalid, null is returned.
  //
  // Otherwise, an array of selectors is returned. Each selector contains up to five
  // values:
  // - missing: matches a missing value if true
  // - firstOper: (required if missing is false) - match operator for firstValue
  // - firstValue: (required if missing is false) - firstValue to match against
  // - secondOper: (optional) - match operator for secondValue
  // - secondValue: (optional) - secondValue to match against.
  //
  // Non-missing values must match against firstOper (<, <=, =, >=, >) and firstValue.
  // If secondOper is present, values must match that also.
  //
  // A value will match if it matches any selector in the array.
  //
  function parseContinuousSearchString (searchString) {
    const operators = [">=", ">", "<=", "<"]; // Longer ops before shorter ones.
    // Parse out the individual selectors.
    const selectors = parseSearchString(searchString);

    // Check all selectors are valid.
    for (const selector of selectors) {
      if (!selector) {
        return null;
      }
    }

    // Return the array of valid selectors.
    return selectors;

    // Helper function.
    // Split searchString into individual selectors and parse each one.
    function parseSearchString(searchString) {
      return searchString.split(/[;,]+/).map((expr) => parseSelector(expr.trim().toLowerCase()));
    }

    // Helper function.
    // Parse an individual search selector (such as >44, >45<=90, 88, or miss)
    // and return a selector object with five variables (missing, firstOper,
    // firstValue, secondOper, and secondValue).
    //
    // If expression begins with "miss", missing will be true.
    //
    // If expression is just a single number, firstOper will be "===" and firstValue will
    // be the expression value.
    //
    // Null is returned if no valid expression is found.
    function parseSelector(expr) {
      try {
        // Selector to return, if we find a valid one.
        const selector = {
          missing: false,
          firstOper: "",
          firstValue: 0,
          secondOper: "",
          secondValue: 0
        };

        // If expr starts with "miss", match against missing values.
        if (expr.startsWith("miss")) {
          selector.missing = true;
          return selector;
        }

        // Get first operator, if any.
        selector.firstOper = findInitialOperator(expr);

        // If just a plain number, use the 'is equal' test to evaluate the expression.
        if (selector.firstOper === "") {
          if (UTIL.isNaN(expr)) {
            throw `Unknown numeric operator ${expr}`;
          }
          selector.firstOper = "==";
          selector.firstValue = parseFloat(expr);
          return selector;
        }

        // See if there's a valid second operator.
        const part2 = findSecondOperator(expr.substring(selector.firstOper.length));
        // Check values are numeric.
        if (UTIL.isNaN(part2.firstValue)) {
          throw `Unknown numeric value ${part2.firstValue}`;
        }
        part2.firstValue = parseFloat(part2.firstValue);
        if (part2.secondOper) {
          if (UTIL.isNaN(part2.secondValue)) {
            throw `Unknown numeric value ${part2.secondValue}`;
          }
          part2.secondValue = parseFloat(part2.secondValue);
        }
        return Object.assign({}, selector, part2);
      } catch (err) {
        if (debugNumeric) {
          console.error("Error parsing numeric search string: " + err);
        }
        return null;
      }
    }

    // Helper function.
    // If str starts with an operator, return it. Otherwise return the empty string.
    function findInitialOperator(str) {
      for (const op of operators) {
        if (str.startsWith(op)) {
          return op;
        }
      }
      return "";
    }

    // Helper function.
    // Parses remain, which is what follows the first operator, into an object
    // with one or three fields, depending on whether remain contains a second
    // operator.
    // firstValue will be set to the value following the first operator.
    // secondOper will be set to the second operator, if there is one, and if so,
    // secondValue will be set to the value following the second operator.
    function findSecondOperator(remain) {
      // Look for a second operator.
      for (const op of operators) {
        const idx = remain.indexOf(op);
        if (idx !== -1) {
          // Found a second operator.
          // Split remain into three fields as described above.
          return {
            firstValue: remain.substring(0, idx),
            secondOper: op,
            secondValue: remain.substring(idx + op.length)
          };
        }
      }
      // No second operator was found.
      return { firstValue: remain };
    }
  }

  /**********************************************************************************
   * FUNCTION evaluateOperator: Returns true iff dataValue matches
   * against the specified operator and srchValue.
   **********************************************************************************/
  function evaluateOperator(operator, srchValue, dataValue) {
    if (operator.charAt(0) === ">" && dataValue > srchValue) return true;
    if (operator.charAt(0) === "<" && dataValue < srchValue) return true;
    if (operator.charAt(1) === "=" && dataValue === srchValue) return true;
    return false;
  }

  /**********************************************************************************
   * METHOD SearchInterface.clearSearchElement: Clear the search data entry element.
   **********************************************************************************/
  SearchInterface.prototype.clearSearchElement = function clearSearchElement() {
    // Clear the search box for the type of search selected.
    switch (this.searchFor.type) {
      case "text":
        if (getSearchResultsCounts(this.searchFor.axis) != 0) {
          return;
        }
        this.ui.searchForText.value = "";
        break;
      case "continuous":
        this.ui.searchForCont.value = "";
        break;
      case "discrete":
        UTIL.resetCheckBoxDropdown("srchCovCheckBoxes");
        break;
      default:
        throw `Unknown searchFor.type ${this.searchFor.type}`;
    }
    // Clear the saved state for the search axis (axes).
    switch (this.searchFor.axis) {
      case "Row":
      case "Column":
        SRCHSTATE.setDiscreteState(this.searchFor.axis, "");
        break;
      case "":
      case "Both":
        SRCHSTATE.setDiscreteState("Row", "");
        SRCHSTATE.setDiscreteState("Column", "");
        break;
      default:
        throw `Unknown searchFor.axis ${this.searchFor.axis}`;
    }
  };

  // METHOD SearchInterface.setSearchResults: Set the search results text area
  // below the search controls.
  //
  SearchInterface.prototype.setSearchResults = function setSearchResults(text) {
    this.ui.searchResults.innerText = text;
  };

  // Called from SRCH.detailSearch.
  // Perform search based on options selected in the search interface.
  // After the search completes, call postFn(valid, matches) where valid == true iff the
  // search was valid and matches is one of "none", "some", or "all".
  SearchInterface.prototype.doSearch = function doSearch(postFn) {
    this.searchFor.doSearch(this, this.searchFor, postFn);
  };

  // Instantiate the search interface.
  const searchInterface = new SearchInterface();

  SRCH.heatMapListener = function heatMapListener (heatMap, event) {
    if (searchInterface.heatMap == heatMap && event == HEAT.Event_PLUGINS) {
      SRCH.configSearchInterface (heatMap);
    }
  };

  /**********************************************************************************
   * FUNCTION SRCH.configSearchInterface: Initialize/reset the search interface
   * for the specified heatMap.  It is called from the UI-Manager after the
   * heatMap has initialized.
   *
   * Specifically, it:
   * - resets the search interface.
   * - adds searchOn options for each covariate of the heatMap.
   *
   **********************************************************************************/
  SRCH.configSearchInterface = function (heatMap) {
    searchInterface.reset(heatMap);
    addCovariateOptions("col");
    addCovariateOptions("row");
    for (const searchOption of heatMap.getSearchOptions()) {
      searchInterface.addSearchOption(searchOption);
    }
    return;
    // Helper function.
    // Add a search option for every covariate on the specified axis.
    function addCovariateOptions(axis) {
      for (const key of heatMap.getAxisCovariateOrder(axis)) {
        searchInterface.addSearchOption({
          type: heatMap.getCovariateType(axis, key),
          axis,
          key,
          onSelect: configCovarSearch,
        });
      }
    }
    // Helper function.
    // Configure the search interface for searching the specified covariate.
    // Called when the covariate is selected on the searchOn dropdown.
    function configCovarSearch(opts, searchFor) {
      searchFor.doSearch = covarSearch;
      if (opts.type == "discrete") {
        // Set the discrete values that can be searched for.
        searchFor.discreteValues = heatMap.getCovariateThresholds(opts.axis, opts.key);
      }
    }
  };

  // FUNCTION SRCH.doInitialSearch - Perform initial search if the search parameter
  // was specified on the URL.
  // To be called after initialization of the panels.
  SRCH.doInitialSearch = function () {
    const searchParam = UTIL.getURLParameter("search");
    if (typeof searchParam === "string" && searchParam.trim() !== "") {
      SRCH.searchForLabel(searchParam, { axis: "Both", regex: true });
    }
  };

  // FUNCTION SRCH.searchForLabel - Search for a label.
  // To be called after initialization of the panels.
  SRCH.searchForLabel = function searchForLabel(searchString, options) {
    if (searchString !== "") {
      // Wrap search string in double quotes if not using regex.
      if (!options.regex) searchString = `"${searchString}"`;
      if (options.axis) searchInterface.setSearchAxis(options.axis);
      searchInterface.setSearchString(searchString);
      SRCH.detailSearch();
    }
  };

  /**********************************************************************************
   * FUNCTION SRCH.detailSearch: The top-level driver for the search process.
   *
   * It is called when:
   * - the user initiates a search using the UI.
   * - programmatically (e.g. on initialization, or during a command execution)
   *
   * As well as performing the search itself, it updates the other aspects of the
   * NG-CHM's user interface that display the search results.
   *
   ***********************************************************************************/
  SRCH.detailSearch = function () {
    // Clear the results of any previous search.
    UTIL.closeCheckBoxDropdown("srchCovSelectBox", "srchCovCheckBoxes");
    // Clear any previous search parameters.
    clearSearchRequest();
    SRCH.showSearchResults();
    // Perform the actual search.
    searchInterface.doSearch(postFn);
    return;
    // Helper function.
    // Update the NG-CHM UI with the search results.
    function postFn (validSearch, matches) {
      searchInterface.setBackgroundColor(matches);
      SRCH.showSearchResults(validSearch);
      SRCH.updateLinkoutSelections();
      SUM.redrawSelectionMarks();
      SUM.drawTopItems();
      if (DVW.primaryMap) {
        DET.updateSelections();
        searchNext(true, DVW.primaryMap);
        DVW.primaryMap.canvas.focus();
      }
    }
  };

  /**********************************************************************************
   * FUNCTION - clearAllSearchResults: This function initializes/resets all
   * search-related state variables.
   **********************************************************************************/
  SRCH.clearAllSearchResults = function () {
    SRCHSTATE.clearAllSearchResults();
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
  function covarSearch(searchInterface, searchFor, postFn) {
    const heatMap = searchInterface.heatMap;
    const classDataValues = heatMap.getAxisCovariateData(searchFor.axis)[searchFor.key].values;
    const currentClassBar = heatMap.getAxisCovariateConfig(searchFor.axis)[searchFor.key];
    let validSearch = true;
    let results = [];
    if (currentClassBar.color_map.type === "discrete") {
      const cats = searchInterface.getSelectedCategories();
      results = SRCH.getSelectedDiscreteSelections(cats, classDataValues);
      searchInterface.saveDiscreteState();
    } else {
      let selectors = searchInterface.getContinuousSelectors();
      if (selectors) {
        results = getSelectedContinuousSelections(selectors, classDataValues);
      } else {
        validSearch = false;
      }
    }
    if (results.length === 0) {
      postFn(validSearch, "none");
    } else {
      SRCHSTATE.setAxisSearchResultsVec(searchFor.axis, results);
      postFn(validSearch, "all");
    }
  }

  /**********************************************************************************
   * FUNCTION - continuousCovarSearch returns the indices of elements that match
   * searchString on the specified axis for a continuous covariate covar.
   ***********************************************************************************/
  SRCH.continuousCovarSearch = function (heatMap, axis, covar, searchString) {
    axis = MAPREP.isRow(axis) ? "Row" : "Column";
    const classDataValues = heatMap.getAxisCovariateData(axis)[covar].values;

    const searchExprs = parseContinuousSearchString(searchString.trim().replace(/ /g, ""));
    const validSearch = searchExprs != null;
    const results = validSearch
      ? getSelectedContinuousSelections(searchExprs, classDataValues)
      : [];
    return [validSearch, results];
  };

  /**********************************************************************************
   * FUNCTION - getSelectedDiscreteSelections: The purpose of this function is to
   * find rows/cols that match the discrete category selections checked by the user.
   * It iterates the classDataValues data configuration for a given covariate bar
   * for either a direct match on category or, if missing is selected, missing values
   * on the covariate bar. If a value match is found, an item is added to the
   * searchResults array for the appropriate axis.
   ***********************************************************************************/
  SRCH.getSelectedDiscreteSelections = function getSelectedDiscreteSelections(
    cats,
    classDataValues
  ) {
    const includeMissing = cats.indexOf("missing") > -1;
    const results = [];
    classDataValues.forEach((value, index) => {
      if (cats.includes(value) || (includeMissing && (value === "null" || value === "NA"))) {
        results.push(index + 1);
      }
    });
    return results;
  };

  /**********************************************************************************
   * Internal function getSelectedContinuousSelections returns an array of the
   * "search indexes" of the dataValues that match the continuous search selectors.
   * "search indexes" begin at 1.
   **********************************************************************************/
  function getSelectedContinuousSelections(selectors, dataValues) {
    // Determine if any search selector matches missing values.
    const findMissing = selectors.map((s) => s.missing).reduce((t, a) => t || a);
    /* Determine which values, if any, match at least one selector. */
    const searchResults = [];
    for (let index = 0; index < dataValues.length; index++) {
      const value = dataValues[index];
      if (value === "null" || value === "NA") {
        if (findMissing) searchResults.push(index + 1);
      } else {
        const floatValue = parseFloat(value);
        for (const selector of selectors) {
          let selectItem = evaluateOperator(selector.firstOper, selector.firstValue, floatValue);
          if (selectItem && selector.secondOper) {
            selectItem = evaluateOperator(selector.secondOper, selector.secondValue, floatValue);
          }
          if (selectItem) {
            searchResults.push(index + 1);
            break;
          }
        }
      }
    }
    // Return the search indexes of the matching values.
    return searchResults;
  }

  /**********************************************************************************
   * Internal FUNCTION - labelSearch: The purpose of this function is to perform
   * a label based search. It calls the sub-functions necessary to execute
   * the search and manages the appearance of the label search text box.
   ***********************************************************************************/
  function labelSearch(searchInterface, searchFor, postFn) {
    let searchString = searchInterface.getSearchString().trim();
    searchString = cleanseSearchString(searchString);
    searchInterface.setSearchString (searchString);

    if (searchString == "" || searchString == null || searchString == " ") {
      postFn (false, "all");
      return;
    }

    const searchItems = searchString.split(/[;, ]+/);
    const itemsFound = [];

    // Put labels into the global search item list if they match a user search string.
    // Regular expression is built for partial matches if the search string contains '*'.
    // toUpperCase is used to make the search case insensitive.
    // Search on rows, columns, or both (rows then columns).
    if (searchFor.axis !== "Column") {
      searchLabels("Row");
    }
    if (searchFor.axis !== "Row") {
      searchLabels("Column");
    }

    // Determine whether we matched none, some, or all of the searchItems.
    let matches;
    if (itemsFound.length == 0) {
      matches = "none";
    } else if (itemsFound.length != searchItems.length) {
      matches = "some";
    } else {
      matches = "all";
    }
    postFn (true, matches);
    return;

    // Helper function.
    // Find matches against labels on the specified axis.
    function searchLabels(axis) {
      // Searches are case independent, so we map everything to upper case.
      const labels = searchInterface.heatMap.actualLabels(axis).map(label => label.toUpperCase());
      for (const searchItem of searchItems) {
        if (searchItem == "." || searchItem == "*") {
          // if this is a search item that's going to return everything, skip it.
          continue;
        }
        let reg;
        // Catch bad search strings that throw exceptions when creating RegExp.
        try {
          if (searchItem.charAt(0) === '"' && searchItem.slice(-1) === '"') {
            // Escape all regex meta-chars.
            const literal = searchItem.slice(1, -1).toUpperCase()
              .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            reg = new RegExp("^" + literal + "$");
          } else {
            reg = new RegExp(searchItem.toUpperCase());
          }
        } catch (e) {
          // Mark search invalid and stop.
          postFn(false, "none");
          return;
        }
        let matches = [];
        labels.forEach((label, index) => {
          if (reg.test(label)) matches.push(index + 1);
        });
        if (matches.length > 0) {
          // Save matches and note we found matches for this searchItem.
          SRCHSTATE.setAxisSearchResultsVec(axis, matches);
          if (itemsFound.indexOf(searchItem) == -1) itemsFound.push(searchItem);
        }
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
    if (firstTime || !currentSearchItem["index"] || !currentSearchItem["axis"]) {
      // Start new search.  If searchAxis == "any", start on the rows.
      findNextSearchItem(mapItem, -1, searchAxis === "column" ? "Column" : "Row");
    } else if (searchAxis === "any" || currentSearchItem["axis"].toLowerCase() === searchAxis) {
      // Continue search on current axis if permitted.
      findNextSearchItem(mapItem, currentSearchItem["index"], currentSearchItem["axis"]);
    } else {
      // Start search from beginning of requested axis otherwise.
      findNextSearchItem(mapItem, -1, searchAxis == "column" ? "Column" : "Row");
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
      if (searchAxis === "any" || currentSearchItem["axis"].toLowerCase() === searchAxis) {
        // Continue on current search axis if permitted.
        findPrevSearchItem(mapItem, currentSearchItem["index"], currentSearchItem["axis"]);
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
    axis = MAPREP.isRow(axis) ? "Row" : "Column";

    // Try to find previous item on current axis.
    let curr = findPrevAxisSearchItem(mapItem, axis, index);
    if (curr >= 0) {
      SRCHSTATE.setSearchItem(mapItem, axis, curr);
      return;
    }

    // That failed, try other axis if allowed.
    const allowedAxes = mapItem.allowedOrientations;
    if (allowedAxes === "any") {
      const otherAxis = MAPREP.isRow(axis) ? "Column" : "Row";
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
  const orientMenuIcons = ["icon-small-circle", "icon-horizontal-bar", "icon-horizontal-bar"];
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
      if (orientMenuRotate[i] != "") menuIcon.firstChild.style.rotate = orientMenuRotate[i];
      const menuItem = UTIL.newElement(
        "DIV.menuItem",
        { dataset: { orient: orientMenuValues[i] } },
        [menuIcon, orientMenuItems[i]]
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
      console.error("mapItem has unknown orientation: " + mapItem.allowedOrientations);
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
      "<SVG width='1em' height='1em'><USE href='icons.svg#" + orientMenuIcons[idx] + "'/></SVG>";
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
        mapItem.dataPerCol
      );
      srchPrev.disabled = !rowOK;
      srchNext.disabled = !rowOK;
    } else if (mapItem.allowedOrientations == "column") {
      const colOK = anyOutsideSearchResults(
        SRCHSTATE.getAxisSearchResults("column"),
        mapItem.currentCol,
        mapItem.dataPerRow
      );
      srchPrev.disabled = !colOK;
      srchNext.disabled = !colOK;
    } else {
      const rowOK = anyOutsideSearchResults(
        SRCHSTATE.getAxisSearchResults("row"),
        mapItem.currentRow,
        mapItem.dataPerCol
      );
      const colOK = anyOutsideSearchResults(
        SRCHSTATE.getAxisSearchResults("column"),
        mapItem.currentCol,
        mapItem.dataPerRow
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
    if (srchPrev.length > 0) srchPrev[0].style.rotate = MAPREP.isRow(axis) ? "90deg" : "";
    const srchNext = pane.getElementsByClassName("srchNext");
    if (srchNext.length > 0) srchNext[0].style.rotate = MAPREP.isRow(axis) ? "90deg" : "";
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
    return;
    // Helper function.
    // Display a popup explaining why the detail view cannot move
    // to display the searchItem.
    function showSearchError(reason, searchItem) {
      const searchError = UTIL.createPopupPanel("searchError");
      searchError.style.display = "inherit";
      // Position popup at the bottom right of text input.
      const searchBar = searchInterface.ui.searchForText;
      searchError.style.top = searchBar.offsetTop + searchBar.offsetHeight + "px";
      searchError.style.left = searchBar.offsetLeft + searchBar.offsetWidth + "px";
      const labels = mapItem.heatMap.actualLabels(currentSearchItem.axis);
      const label = labels[currentSearchItem.index-1];
      switch (reason) {
        case 0:
          searchError.textContent = "No matching labels found";
          break;
        case 1:
          searchError.textContent = "Exit dendrogram selection to go to " + label;
          break;
        case 2:
          searchError.textContent =
            "All " +
            searchItem.axis +
            " items are visible. Change the view mode to see " +
            label;
          break;
        default:
          searchError.textContent = `Unknown search error ${reason}`;
      }
      UHM.hlpC();
      document.body.appendChild(searchError);
      setTimeout(function () {
        searchError.remove();
      }, 2000);
    }
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
    searchInterface.clearSearchElement();
    SRCH.showSearchResults();
    DET.updateSelections();
    SRCH.updateLinkoutSelections();
    searchInterface.resetBackgroundColor();
  };

  /**********************************************************************************
   * FUNCTION - clearSearchRequest: The purpose of this function is to clear the search
   * items on one OR both axes.
   ***********************************************************************************/
  function clearSearchRequest() {
    const searchAxis = searchInterface.searchFor.axis;
    if (searchAxis === "Both" || searchAxis == "") {
      SRCH.clearSearchItems("Row");
      SRCH.clearSearchItems("Column");
    } else {
      SRCH.clearSearchItems(searchAxis);
    }
    SUM.clearSelectionMarks(searchAxis);
  }

  /**********************************************************************************
   * FUNCTION - clearSearchItems: The purpose of this function is to clear all search
   * items on a particular axis.
   ***********************************************************************************/
  SRCH.clearSearchItems = function (clickAxis) {
    SRCHSTATE.clearAllAxisSearchItems(UTIL.capitalize(clickAxis));
    // Clear any dendrogram selections on the Summary View.
    clickAxis = clickAxis.toLowerCase();
    if (clickAxis === "row") {
      if (SUM.rowDendro) SUM.rowDendro.clearSelectedBars();
    } else if (clickAxis === "column") {
      if (SUM.colDendro) SUM.colDendro.clearSelectedBars();
    }
    // Clear tick marks
    const markLabels = document.getElementsByClassName("MarkLabel");
    for (const label of markLabels) {
      DVW.removeLabels(label.id);
    }
  };

  /**********************************************************************************
   * FUNCTION - showSearchResults: The purpose of this function is to show the
   * search results text area below the search controls with the row/col count
   * results from the just-executed search IF there are search results to show.
   ***********************************************************************************/
  SRCH.showSearchResults = function (validSearch) {
    const rowCount = getSearchResultsCounts("Row");
    const colCount = getSearchResultsCounts("Column");
    if (rowCount + colCount > 0) {
      searchInterface.setSearchResults("Selected: Rows - " + rowCount + " Columns - " + colCount);
      enableDisableAllSearchButtons();
    } else if (typeof validSearch !== "undefined" && validSearch === false) {
      searchInterface.setSearchResults("Invalid search expression entered");
    } else {
      enableDisableAllSearchButtons();
      searchInterface.setSearchResults("");
    }
  };

  /**********************************************************************************
   * Internal FUNCTION - getSearchResultsCounts: Return the number of search results
   * for the specified axis.
   ***********************************************************************************/
  function getSearchResultsCounts(axis) {
    switch (axis) {
      case "Row":
      case "Column":
        return SRCHSTATE.getAxisSearchResults(axis).length;
      case "":
      case "Both":
        return (
          SRCHSTATE.getAxisSearchResults("Row").length +
          SRCHSTATE.getAxisSearchResults("Column").length
        );
      default:
        throw `Unknown searchFor.axis ${axis}`;
    }
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
