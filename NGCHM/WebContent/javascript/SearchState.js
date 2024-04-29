(function () {
  "use strict";
  NgChm.markFile();

  //Define Namespace for NgChm SearchState
  const SRCHSTATE = NgChm.createNS("NgChm.SRCHSTATE");

  const MMGR = NgChm.importNS("NgChm.MMGR");

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
  // Initialize this to avoid bug #320 when loading old maps via shaid
  const searchResults = { Row: {}, Column: {}, RowCovar: {}, ColumnCovar: {} };

  // currentSearchItems contains the axis and index of the current
  // search item (used by the forward and backward search arrow buttons)
  // for each mapItem.
  var currentSearchItems = new WeakMap();

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
   * These functions can be called from any module.
   ***********************************************************/

  SRCHSTATE.getSearchSaveState = function () {
    const state = {};
    state["row"] = SRCHSTATE.getAxisSearchResults("Row");
    state["col"] = SRCHSTATE.getAxisSearchResults("Column");
    return state;
  };

  SRCHSTATE.getGapItems = function (axis) {
    return axis in gapItems ? gapItems[axis] : null;
  };

  SRCHSTATE.getDiscCovState = function (axis) {
    return discCovStates[axis];
  };

  /**********************************************************************************
   * FUNCTION - getCurrentSearchItem: This function returns the current search item.
   **********************************************************************************/
  SRCHSTATE.getCurrentSearchItem = function (mapItem) {
    return currentSearchItems.get(mapItem) || {};
  };

  /**********************************************************************************
   * FUNCTION - getAxisSearchResults: get indices of all search results on the
   * specified axis.
   ***********************************************************************************/
  SRCHSTATE.getAxisSearchResults = function (axis) {
    if (MMGR.isRow(axis)) axis = "Row";
    if (axis == "column") axis = "Column";
    return Object.keys(searchResults[axis]).map((val) => +val);
  };

  // FIXME: BMB: Rename this function or the one above.
  SRCHSTATE.getSearchResults = function (axis) {
    return searchResults[axis];
  };

  /*********************************************************************************************
   * FUNCTION:  labelIndexInSearch - Returns true iff index is included in axis search results.
   *********************************************************************************************/
  SRCHSTATE.labelIndexInSearch = function (axis, index) {
    return index != null && axis != null && searchResults[axis][index] == 1;
  };

  /*********************************************************************************************
   * FUNCTION:  getSearchLabelsByAxis - This function retrieves and array of search labels based
   * upon type an axis.
   *********************************************************************************************/
  SRCHSTATE.getSearchLabelsByAxis = function (axis, labelType) {
    let searchLabels = [];
    const heatMap = MMGR.getHeatMap();
    const labels =
      axis == "Row"
        ? heatMap.getRowLabels()["labels"]
        : axis == "Column"
          ? heatMap.getColLabels()["labels"]
          : axis == "ColumnCovar"
            ? Object.keys(heatMap.getColClassificationConfig())
            : axis == "RowCovar"
              ? Object.keys(heatMap.getRowClassificationConfig())
              : [
                  heatMap.getRowLabels()["labels"],
                  heatMap.getColLabels()["labels"],
                ];
    // FIXME: BMB: HIDDEN_LABELS search only works with the first hidden label.
    // QUERY: BMB: if axis is other, what happens if labelType == VISIBLE_LABELS or HIDDEN_LABELS.
    SRCHSTATE.getAxisSearchResults(axis).forEach((i) => {
      if (axis.includes("Covar")) {
        if (labelType == linkouts.VISIBLE_LABELS) {
          searchLabels.push(labels[i].split("|")[0]);
        } else if (labelType == linkouts.HIDDEN_LABELS) {
          searchLabels.push(labels[i].split("|")[1]);
        } else {
          searchLabels.push(labels[i]);
        }
      } else {
        if (labelType == linkouts.VISIBLE_LABELS) {
          searchLabels.push(labels[i - 1].split("|")[0]);
        } else if (labelType == linkouts.HIDDEN_LABELS) {
          searchLabels.push(labels[i - 1].split("|")[1]);
        } else {
          searchLabels.push(labels[i - 1]);
        }
      }
    });
    return searchLabels;
  };

  /*#########################################################################*/

  /***********************************************************
   * The following functions modify the search state and must
   * be called from the NgChm.SRCH module only.
   ***********************************************************/

  SRCHSTATE.clearAllSearchResults = function () {
    searchResults["Row"] = {};
    searchResults["Column"] = {};
    searchResults["RowCovar"] = {};
    searchResults["ColumnCovar"] = {};

    currentSearchItems = new WeakMap();
    discCovStates["Row"] = "";
    discCovStates["Column"] = "";
    for (let axis in gapItems) delete gapItems[axis];
  };

  SRCHSTATE.setGapItems = function (axis, items) {
    gapItems[axis] = items;
  };

  SRCHSTATE.setDiscCovState = function (axis, items) {
    discCovStates[axis] = items;
  };

  /**********************************************************************************
   * FUNCTION - clearAllCurrentSearchItems: This function clears the current search item.
   **********************************************************************************/
  SRCHSTATE.clearAllCurrentSearchItems = function () {
    currentSearchItems = new WeakMap();
  };

  /**********************************************************************************
   * FUNCTION - setSearchItem: The purpose of this function is to set the current
   * search item with the supplied axis and curr values. It is called by both the "next"
   * and "previous" searches.
   **********************************************************************************/
  SRCHSTATE.setSearchItem = function (mapItem, axis, curr) {
    let searchItem = currentSearchItems.get(mapItem);
    if (!searchItem) {
      searchItem = {};
      currentSearchItems.set(mapItem, searchItem);
    }
    searchItem["axis"] = axis;
    searchItem["index"] = curr;
  };

  /**********************************************************************************
   * FUNCTION - setAxisSearchResults: set all search items from left to right (inclusive)
   * on the specified axis.
   ***********************************************************************************/

  SRCHSTATE.setAxisSearchResults = function (axis, left, right) {
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
  SRCHSTATE.setAxisSearchResultsVec = function (axis, vec) {
    const axisResults = searchResults[axis];
    const gaps = getGaps(axis);
    vec.forEach((i) => {
      if (!gaps[i]) axisResults[i] = 1;
    });
  };

  /**********************************************************************************
   * FUNCTION - clearSearchRange: clear search items from left to right (inclusive)
   * on the specified axis.
   ***********************************************************************************/
  SRCHSTATE.clearSearchRange = function (axis, left, right) {
    for (let j = +left; j < +right + 1; j++) {
      delete searchResults[axis][j];
    }
  };

  SRCHSTATE.clearAllAxisSearchItems = function (axis) {
    searchResults[axis] = {};
  };

  // Private function getGaps returns a dictionary object
  // for the specified axis that contains a true entry for the
  // indices of any gap elements.
  function getGaps(axis) {
    // Get and cache which labels are gap items the first
    // time we access the specified axis.
    let gapItems = SRCHSTATE.getGapItems(axis);
    if (!gapItems) {
      let labels = MMGR.getHeatMap().getAxisLabels(axis).labels;
      gapItems = {};
      // Note: indices for row and column labels are 1-origin.
      labels.forEach((label, index) => {
        if (label == "") gapItems[index + 1] = true;
      });
      SRCHSTATE.setGapItems(axis, gapItems);
    }
    return gapItems;
  }
})();
