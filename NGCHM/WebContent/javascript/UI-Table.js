/**********************************************************************************
 * UI Table:  Define a class for creating and manipulating tables in the user
 * interface.
 **********************************************************************************/
(function () {
  "use strict";
  NgChm.markFile();

  // Define Namespace for NgChm UI Tables.
  const TABLE = NgChm.createNS("NgChm.UI.TABLE");

  // Import other required name spaces.
  const UTIL = NgChm.importNS("NgChm.UTIL");

  // Only export is a function for creating a new UI table.
  TABLE.createTable = function(opts = {}) {
    return new Table(opts);
  };

  const defaultProperties = {
    columns: 2,
  };

  // CLASS Table - Create a new Table using TABLE.createTable.
  //
  function Table (opts) {
    this.props = Object.assign({}, defaultProperties, opts);
    this.content = UTIL.newElement("TABLE.ngchm-ui-table");
    if (this.props.id) {
      this.content.id = this.props.id;
    }
    this.indents = [];
    this.insertPosn = -1;
  }

  const blankSpaceUnit = 0.3125;// One unit of blank space (in em) for separator rows.
  const indentUnit = 0.28;      // One unit of indent (in em).

  // METHOD Table.addBlankSpace: Append some vertical blank space to the table.
  //
  // - count is the relative amount of space to add, in blankSpaceUnits.
  //
  Table.prototype.addBlankSpace = function(count) {
    if (typeof count === "undefined") count = 1;
    const newRow = this.content.insertRow(this.insertPosn);
    if (this.insertPosn != -1) this.insertPosn++;
    const blankSpace = newRow.insertCell(0);
    blankSpace.style.lineHeight = (count * blankSpaceUnit).toFixed(3) + 'em';  // toFixed because of limited precision generating ridiculously many digits.
    blankSpace.setAttribute ('colspan', this.props.columns);
    blankSpace.innerHTML = "&nbsp;";
  };

  Table.prototype.addIndent = function(count) {
    if (typeof count === "undefined") count = 1;
    this.indents.push(count);
  };

  Table.prototype.popIndent = function() {
    this.indents.pop();
  };

  // METHOD - Table.addRow: Append a row to the table.
  //
  // - contents is an array containing the contents of the cells in the new row.
  // - options is an object that may contain the following fields:
  //   - colSpan: an array of the colspans for each cell
  //   - fontWeight: fontWeight for each cell
  //   - underline: underline text in each cell
  //   - align: an array of alignments for each cell
  //
  Table.prototype.addRow = function (contents, options = {}) {
    if (typeof contents == "undefined") {
      throw new Error ("Table.addRow: no contents provided.");
    }
    if (contents.length > this.props.columns) {
      console.warn ("Table.addRow: adding row with more columns than the table", { contents, tableColumns: this.props.columns });
    }

    if (options.hasOwnProperty('indent')) {
      console.error ("Table.addRow: obsolete indent in options", { options });
    }

    // Set default options.
    options = Object.assign({}, { fontWeight: ["bold","normal"], paddingRight: "0.5em" }, options);

    // Determine span of each column.
    const colSpan = calcColumnSpans (this.props.columns, contents.length, options);
    const tr = this.content.insertRow(this.insertPosn);
    if (this.insertPosn != -1) this.insertPosn++;
    tr.className = "chmTblRow";

    // Replicate other options, if needed.
    const align = replicateOption ("align", contents.length, options);
    const fontWeight = replicateOption ("fontWeight", contents.length, options);
    const paddingRight = replicateOption ("paddingRight", contents.length, options);
    const underline = replicateOption ("underline", contents.length, options);

    // Create cells.
    for (let i = 0; i < contents.length; i++) {
      const td = tr.insertCell(i);
      td.colSpan = colSpan[i];
      if (fontWeight[i]) td.style.fontWeight = fontWeight[i];
      if (align[i]) td.align = align[i];
      if (paddingRight[i]) td.style.paddingRight = paddingRight[i];
      if (underline[i]) td.style.textDecoration = 'underline';
      for (const item of contents.slice(i,i+1).flat()) {
        if (["string", "number"].includes(typeof item)) {
          const span = document.createElement("SPAN");
          span.innerHTML = item;
          td.appendChild (span);
        } else {
          td.appendChild (item);
        }
      }
    }
    // Add indent to first cell if requested.
    if (this.indents.length > 0 && tr.firstChild) {
      const indent = this.indents.reduce((acc,amt) => acc+amt);
      tr.firstChild.style.paddingLeft = (indent * indentUnit).toFixed(3) + "em";
    }

    // Return the row.
    return tr;
  };

  // METHOD setInsertPosn - set the row insert position
  //
  // If posn == -1, new rows will be appended to the table.
  // Otherwise, rows will be inserted before the specified row.
  Table.prototype.setInsertPosn = function (posn) {
    this.insertPosn = posn;
  };

  // METHOD addRowX: eXperimental/eXtended version of addRow.
  // or configuration html TABLE item for a given help pop-up panel. It receives text for
  // the header column, detail column, and the number of columns to span as inputs.
  Table.prototype.addRowX = function (rowContent, options = {}) {

    // Set default options.
    options = Object.assign({}, { cellClasses: ["label","value"],  cellProperties: {} }, options);

    // Determine span of each column.
    const colSpan = calcColumnSpans (this.props.columns, rowContent.length, options);

    // Append a new row and set class chmTblRow.
    const tr = this.content.insertRow();
    tr.classList.add("chmTblRow");

    // Add one or more additional classes to the row.
    if (options.hasOwnProperty("rowClasses")) {
      if (Array.isArray(options.rowClasses)) {
        options.rowClasses.forEach(opt => tr.classList.add(opt));
      } else {
        tr.classList.add(options.rowClasses);
      }
    }

    // ???? Why do this?
    if (tr.classList.length == 1) {
      tr.classList.add("entry");
    }

    const cellProperties = replicateOption ("cellProperties", rowContent.length, options);
    const cellClasses = replicateOption ("cellClasses", rowContent.length, options);

    for (let i = 0; i < rowContent.length; i++) {
      // Create cell.
      const td = tr.insertCell(i);

      // Add any specified cell classes.
      if (callClasses[i]) {
        if (Array.isArray(cellClasses[i])) {
          cellClasses[i].forEach(cls => td.classList.add(cls));
        } else {
          td.classList.add(cellClasses[i]);
        }
      }
      // Add any specified cell properties.
      if (cellProperties[i]) {
        for (let [key, value] of Object.entries(cellProperties[i])) {
          if (typeof value != "object") {
            td[key] = value;
          } else if (key == "style") {
            for (let [k2, v2] of Object.entries(value)) {
              td.style[k2] = v2;
            }
          } else if (key == "classList") {
            value.forEach((className) => td.classList.add(className));
          } else if (key == "dataset") {
            for (let [k2, v2] of Object.entries(value)) {
              td.dataset[k2] = v2;
            }
          } else {
            console.error("Table.addRowX: Unknown object in cellProperties: ", { i, key, value });
          }
        }
      }
      // Add cell content.
      if (
        ["string", "number"].includes(typeof rowContent[i]) ||
        Array.isArray(rowContent[i])
      ) {
        td.innerHTML = rowContent[i];
      } else if (rowContent[i]) {
        td.appendChild(rowContent[i]);
      }
    }
  };

  // FUNCTION replicateOption - replicate an option length times.
  //
  // Parameters:
  // - optionName: the name of the option to replicate.
  // - length: the number of replicates.
  // - options: an object that may contain an entry for optionName.
  //
  // If options does not include optionName, returns an empty array.
  // Otherwise returns an array of at least length values.
  //
  // If options[optionName] is not an array the contents of the returned array
  // will be options[optionName].
  //
  // If options[optionName] is an array, its contents will be copied to the
  // returned array. If it contains fewer than length elements, the last
  // element will be replicated until the returned array contains length elements.
  //
  function replicateOption (optionName, length, options) {
    const replicates = [];
    if (options.hasOwnProperty(optionName)) {
      const value = options[optionName];
      if (Array.isArray(value)) {
        for (let ii = 0; ii < value.length; ii++) {
          replicates.push (value[ii]);
        }
      } else {
        replicates.push(value);
      }
      if (replicates.length > 0) {
        const lastValue = replicates[replicates.length-1];
        while (replicates.length < length) {
          replicates.push (lastValue);
        }
      }
    }
    return replicates;
  }

  // FUNCTION calcColumnSpans - Calculate the number of table columns spanned by each column in a row.
  //
  // Parameters:
  // - tableColumns: the number of columns in the table
  // - numColumnsInRow: the number of columns in the row
  // - options: an object, which may contain the following option:
  //   - colSpan: the number of columns spanned by each row column.
  //
  // If:
  // colSpan is not specified: each row column will span one table column.
  // colSpan is specified and is not an array: every column will span that many table columns.
  // colSpan is specified and is an array:
  // - it will determine the number of table columns spanned by each row column.
  // - if it is shorter than the number of row columns, each additional column will span one table column.
  //
  // If the total number of assigned columns is less than the number of table columns,
  // the excess columns will be silently added to the last column.
  //
  // If the total number of assigned columns exceeds the number of table columns,
  // a warning will be issued.
  //
  // Returns:
  // - an array of length numColumnsInRow containing the number of table columns spanned
  //   by each row column.
  function calcColumnSpans (tableColumns, numColumnsInRow, options) {
    const colSpans = [];
    let span = options.hasOwnProperty('colSpan') ? options.colSpan : 1;
    if (Array.isArray(span)) {
      if (span.length > numColumnsInRow) {
        console.error ("Table.calcColumnSpans: colSpan has more columns than the row:", { colSpan: span, numColumnsInRow });
      }
      for (let ii = 0; ii < Math.min(span.length,numColumnsInRow); ii++) {
        colSpans.push (span[ii]);
      }
      while (colSpans.length < numColumnsInRow) {
        colSpans.push (1);
      }
    } else {
      for (let ii = 0; ii < numColumnsInRow; ii++) {
        colSpans.push (span);
      }
    }
    const totalColumns = colSpans.reduce((acc,val) => acc+val, 0);
    if (totalColumns > tableColumns) {
      console.warn ("Table.calcColumnSpans: assigned columns exceeds number of columns in table", { totalColumns, tableColumns, colSpans });
    } else if (totalColumns < tableColumns) {
      const excess = tableColumns - totalColumns;
      colSpans[numColumnsInRow-1] += excess;
    }
    return colSpans;
  }

})();
