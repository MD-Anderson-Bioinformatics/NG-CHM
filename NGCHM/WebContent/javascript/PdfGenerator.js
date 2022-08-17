//Define Namespace for NgChm PdfGenerator
NgChm.createNS('NgChm.PDF');

NgChm.PDF.rowDendoWidth = null;
NgChm.PDF.rowDendroHeight = null;
NgChm.PDF.colDendroWidth = null;
NgChm.PDF.colDendroHeight = null;
NgChm.PDF.customFont = false;
NgChm.PDF.isWidget = false;
NgChm.PDF.absLogo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQYAAAA/CAYAAAACN2btAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAAAZdEVYdFNvZnR3YXJlAEFkb2JlIEltYWdlUmVhZHlxyWU8AAADh2lUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNy4wLWMwMDAgNzkuZGFiYWNiYiwgMjAyMS8wNC8xNC0wMDozOTo0NCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDo0OGQwNmYxMC0xZGU4LTRlYjAtOTIwYi1hNDUzYjEwYmNjNmUiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6ODM3MTk5NzBGRDRBMTFFQjlGRjNENTVGNURCQUQ5RTciIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6ODM3MTk5NkZGRDRBMTFFQjlGRjNENTVGNURCQUQ5RTciIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTcgKE1hY2ludG9zaCkiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDphYWU3MTVhNC1hNDc0LTRhZWUtOWE3NC05YjA2MmI5ZGVmOTYiIHN0UmVmOmRvY3Vt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";
NgChm.PDF.isGenerating = false;

/**********************************************************************************
 * FUNCTION - openPdfPrefs: This function is called when the user clicks the pdf
 * button on the menu bar.  The PDF preferences panel is then launched
 **********************************************************************************/
NgChm.PDF.canGeneratePdf = function() {
	return NgChm.SUM.isVisible() || NgChm.DMM.isVisible();
};

NgChm.PDF.openPdfPrefs = function(e) {
	NgChm.PDF.isGenerating = true;
	NgChm.UHM.closeMenu();
	NgChm.UHM.hlpC();
	if (e.classList.contains('disabled')) {
		NgChm.UHM.systemMessage("NG-CHM PDF Generator", "Cannot generate the PDF when both the Summary and Detail heat map panels are closed.");
		return;
	}

	// Set maps to generate based on visible maps:
	const sumButton = document.getElementById ('pdfInputSummaryMap');
	const detButton = document.getElementById ('pdfInputDetailMap');
	const bothButton = document.getElementById ('pdfInputBothMaps');
	if (NgChm.SUM.isVisible() && !NgChm.DMM.isVisible()) {
		sumButton.checked = true;
		sumButton.disabled = false;
		detButton.disabled = true;
		bothButton.disabled = true;
	} else if (NgChm.DMM.isVisible() && !NgChm.SUM.isVisible()) {
		detButton.checked = true;
		sumButton.disabled = true;
		detButton.disabled = false;
		bothButton.disabled = true;
	} else if (NgChm.SUM.isVisible() && NgChm.DMM.isVisible()) {
		bothButton.checked = true;
		sumButton.disabled = false;
		detButton.disabled = false;
		bothButton.disabled = false;
	} else {
		// Should not happen.
		NgChm.UHM.systemMessage("NG-CHM PDF", "Cannot generate PDF when the Summary or Detail heat map panels are closed.");
		return;
	}
	var prefspanel = document.getElementById('pdfPrefs');
	var headerpanel = document.getElementById('mdaServiceHeader');
	//Add prefspanel table to the main preferences DIV and set position and display
	prefspanel.style.top = (headerpanel.offsetTop + 15) + 'px';
	prefspanel.classList.remove ('hide');
	let labels = document.getElementsByClassName("DynamicLabel");
	if (labels.length > 0) {
		document.getElementById("pdfInputFont").value = parseInt(labels[0].style["font-size"]);
	} else {
		const fSize = Math.min(NgChm.DMM.primaryMap.colLabelFont,NgChm.DMM.primaryMap.rowLabelFont);
		if (fSize > 0) {
			document.getElementById("pdfInputFont").value = fSize;
		} else {
			document.getElementById("pdfInputFont").value = NgChm.DET.minLabelSize;
		}
	}
    NgChm.UTIL.redrawCanvases();
}

/**********************************************************************************
 * FUNCTION - pdfCancelButton: This function closes the PDF preferences panel when
 * the user presses the cancel button.
 **********************************************************************************/
NgChm.PDF.pdfCancelButton = function() {
	NgChm.PDF.isGenerating = false;
	document.getElementById('pdfErrorMessage').style.display="none";
	var prefspanel = document.getElementById('pdfPrefs');
	prefspanel.classList.add ('hide');
	NgChm.DMM.primaryMap.canvas.focus();
}

/**********************************************************************************
 * FUNCTION - getBuilderCreationLogPDF: This function is called from the NG-CHM
 * GUI Builder.  It is provided with a heat map name and a text string pre-built for
 * printing.  It takes that string and loops thru it applying font and style 
 * formatting to the string and downloads the resulting PDF file to the desktop.
 **********************************************************************************/
NgChm.PDF.getBuilderCreationLogPDF = function(name, text) {
	var doc = new jsPDF("p","pt",[792,612]); 
	doc.setFont("helvetica");
	doc.setFontType("bold");
	doc.setFontSize(15);
	var lineEndPos = text.indexOf("\n");
	var headtx = text.substring(0, lineEndPos);
	doc.text(140,30,headtx);
	headtx += " (cont)"
	text = text.substring(lineEndPos + 1, text.length);
	doc.setFontSize(10);
	var pos = 40;
	var pageNbr = 1;
	while (text.indexOf("\n") >= 0) {
		lineEndPos = text.indexOf("\n");
		NgChm.PDF.setBuilderLogText(doc, text, pos, lineEndPos);
		text = text.substring(lineEndPos + 1, text.length);
		if ((pos + 15) > 760) {
			doc.text(20,780,"* Bold-italicized responses represent changes from NG-CHM defaults");
			doc.text(550,780,"page " + pageNbr);
			pageNbr++;
			NgChm.PDF.addBuilderLogPage(doc, headtx);
			pos = 60;
		} else {
			pos += 15;
		}
	}
	doc.text(20,780,"* Bold-italicized responses represent changes from NG-CHM defaults");
	if (pageNbr > 1) {
		doc.text(550,780,"page " + pageNbr);
	}
	doc.save(name+'_HeatMapCreationLog.pdf');
}

/**********************************************************************************
 * FUNCTION - addBuilderLogPage: This function adds a page to the NG-CHM Builder
 * Creation Log and writes a header onto the page.
 **********************************************************************************/
NgChm.PDF.addBuilderLogPage = function (doc, headtx) {
	doc.addPage();
	doc.setFontType("bold");
	doc.setFontSize(15);
	doc.text(120,30,headtx);
	doc.setFontType("normal");
	doc.setFontSize(10);
}

/**********************************************************************************
 * FUNCTION - setBuilderLogText: This function writes out a builder log entry to 
 * the NG-CHM GUI Builder creation log pdf.
 **********************************************************************************/
NgChm.PDF.setBuilderLogText = function (doc, text, pos, end) {
	var isChanged =  text.substring(0,1) === "*" ? true : false;
	var temptx = text.substring(0, end);
	if (isChanged === true) {
		temptx = text.substring(1, end);
	}
	var textHeader = temptx.substring(0,temptx.indexOf(":") + 1);
	var textValue = temptx.substring(temptx.indexOf(":") + 2, temptx.length);
	doc.setFontType("bold");  
	doc.text(20,pos,textHeader);
	if (isChanged === true) {
		doc.setFontType("bolditalic"); 
	} else {
		doc.setFontType("normal");
	}
	doc.text(165,pos,textValue);
	doc.setFontType("normal");
}

/**********************************************************************************
 * FUNCTION - callViewerHeatmapPDF: This function is called when the "create pdf" 
 * button is pressed. Since the data distribution requires all data tiles to be
 * loaded, it sets a read window to guarantee that they are all there, allows
 * for the process to complete, and then calls the "get" functioon to create the PDF.
 **********************************************************************************/
NgChm.PDF.callViewerHeatmapPDF = function() {
	document.body.style.cursor = 'wait';
    const details = NgChm.heatMap.setReadWindow(NgChm.SEL.getLevelFromMode(NgChm.DMM.primaryMap, NgChm.MMGR.DETAIL_LEVEL),1,1,NgChm.heatMap.getNumRows(NgChm.MMGR.DETAIL_LEVEL),NgChm.heatMap.getNumColumns(NgChm.MMGR.DETAIL_LEVEL));
    let tilesReady = NgChm.heatMap.allTilesAvailable();
    if (tilesReady === true) {
    	 NgChm.PDF.getViewerHeatmapPDF();
    } else {
    	NgChm.heatMap.addEventListener(NgChm.PDF.pdfDataReady);
    }
}

/**********************************************************************************
 * FUNCTION - pdfDataReady: This function is called when the PDF creation process
 * cannot continue until all the necessary tiles are loaded into the cache. In this 
 * case the processing of the PDF awaits an asynchronous load of data tiles.
 **********************************************************************************/
NgChm.PDF.pdfDataReady = function(event, tile) {
    let tilesReady = NgChm.heatMap.allTilesAvailable();
    if (tilesReady === true) {
    	NgChm.MMGR.latestReadWindow= null;
    	 NgChm.PDF.getViewerHeatmapPDF();
    }
}

/**********************************************************************************
 * FUNCTION - getViewerHeatmapPDF: This function is called when the "create pdf" 
 * button is pressed. It will check the checkboxes/radio buttons to see how the PDF 
 * is to be created using the isChecked function. 
 * 
 * For a full list of jsPDF functions visit here: 
 * https://mrrio.github.io/jsPDF/doc/symbols/jsPDF.html#setLineCap
 **********************************************************************************/
NgChm.PDF.getViewerHeatmapPDF = function() {
	NgChm.SEL.updateSelections(true);
	setTimeout(function(){ NgChm.PDF.genViewerHeatmapPDF(); }, 1500);
}

NgChm.PDF.genViewerHeatmapPDF = function() {
	//Validate User-entered font size
	if (validateInputFont() === false) {
		document.body.style.cursor = 'default';
		return
	}
	NgChm.PDF.isGenerating = true;

	// close the PDF menu when you download
	NgChm.PDF.pdfCancelButton();

	// Draw the heat map images (based upon user parameter selections)
	const mapsToShow = isChecked("pdfInputSummaryMap") ? "S" : isChecked("pdfInputDetailMap") ? "D" : "B";
	const includeSummaryMap = mapsToShow === "S" || mapsToShow === "B";
	const includeDetailMap = mapsToShow === "D" || mapsToShow === "B";
	const rowDendroConfig = NgChm.heatMap.getRowDendroConfig();
	const colDendroConfig = NgChm.heatMap.getColDendroConfig();
	
	// get a jsPDF document
	var pageHeight, pageWidth;
	var doc = getPdfDocument();
	var maxFontSize = Number(document.getElementById("pdfInputFont").value);

	// Calculate longest labels on each axis
	var allLabels = getPrimaryLabels();
	var longestRowLabelUnits,longestColLabelUnits;
	setLongestLabelUnits();

	// Calculate the maximum size for row/col top items (including area for arrows)
	var topItemsWidth, topItemsHeight, rowTopItemsLength, colTopItemsLength; 
	setTopItemsSizing();

	// Header
	var header = document.getElementById('absLogo');
	var headerHeight = 5;
	if (header !== null) {
		headerHeight = headerHeight + header.clientHeight;
	}

	// Set up PDF Page Dimension variables (These are the variables that we will be using repeatedly to place items)
	var paddingLeft = 10;
	var paddingTop = headerHeight+15; 
	var sumImgW = pageWidth - 2*paddingLeft  //width of available space for heatmap, class bars, and dendro
	var sumImgH = pageHeight - paddingTop - paddingLeft; //height of available space for heatmap, class bars, and dendro
	var detImgH = pageHeight - paddingTop - longestColLabelUnits - 2*paddingLeft;
	var detImgW = pageWidth - longestRowLabelUnits - 2*paddingLeft;
	var detImgL = paddingLeft;
	var covTitleRows = 1;
	
	var rowDendroWidth, colDendroHeight;
	var rowClassWidth, colClassHeight;
	var sumMapW, sumMapH;
	if (includeSummaryMap) {
		//Get Dimensions for Summary Row & Column Dendrograms
		setSummaryDendroDimensions();

		//Get Dimensions for Summary Row & Column Class Bars
		setSummaryClassDimensions();

		//Get Dimensions for the Summary Heat Map
		setSummaryHeatmapDimensions();
	}

	//Get Dimensions for the Detail Heat Map and derive row/col class bar height/width
	var detMapW, detMapH, detColClassHeight, detRowClassWidth;
	var detRowDendroWidth, detColDendroHeight;

	// Create and set the fontSize using the minimum of the calculated sizes for row and column labels
	// Calculate the font size for rows and columns. Take the lowest of the two.  If the result is greater than 11 set the font to 11.  If the result is less than 6 set the font to 6.
	var colLabelAdj = 0
	
	var colclassctr = NgChm.heatMap.getColClassificationOrder("show").length
	var theClassFont = Math.floor((colClassHeight-(colclassctr-2))/colclassctr);
	var theFont = maxFontSize;
	doc.setFontSize(maxFontSize);

	var sumMapCanvas; var sumBoxCanvas;
	var rowClassCanvas; var colClassCanvas;
	var rowTICanvas; var colTICanvas;
	var sumImgData; var sumBoxImgData;
	var sumRowClassData; var sumColClassData;
	var sumRowDendroData; var sumColDendroData;
	var sumRowTopItemsData; var sumColTopItemsData;
	if (includeSummaryMap) {
		// Scale summary dendro canvases for PDF page size and Redraw because otherwise they can show up blank
		resizeSummaryDendroCanvases(sumMapW, sumMapH, rowDendroWidth, colDendroHeight);

		sumMapCanvas = document.createElement('canvas');
		configureCanvas(sumMapCanvas, NgChm.SUM.canvas, sumMapW*2, sumMapH*2);

		sumBoxCanvas = document.createElement('canvas');
		configureCanvas(sumBoxCanvas, NgChm.SUM.boxCanvas, sumMapW*2, sumMapH*2);

		rowClassCanvas = document.createElement('canvas');
		if (NgChm.SUM.rCCanvas.width > 0) {
			configureCanvas(rowClassCanvas, NgChm.SUM.rCCanvas, rowClassWidth*2, sumMapH*2)
		}

		colClassCanvas = document.createElement('canvas');
		if (NgChm.SUM.cCCanvas.height > 0) {
			configureCanvas(colClassCanvas, NgChm.SUM.cCCanvas, sumMapW*2, colClassHeight*2);
		}

		rowTICanvas = document.createElement('canvas');
		configureCanvas(rowTICanvas, document.getElementById("summary_row_top_items_canvas"), 20, sumMapH*2)

		colTICanvas = document.createElement('canvas');
		configureCanvas(colTICanvas, document.getElementById("summary_col_top_items_canvas"), sumMapW*2, 20);

		// Canvas elements need to be converted to DataUrl to be loaded into PDF
			// Summary Canvases
		sumImgData = sumMapCanvas.toDataURL('image/png');
		sumRowClassData = rowClassCanvas.toDataURL('image/png');
		sumColClassData = colClassCanvas.toDataURL('image/png');
		sumRowDendroData = document.getElementById("row_dendro_canvas").toDataURL('image/png');
		sumColDendroData = document.getElementById("column_dendro_canvas").toDataURL('image/png');
		sumRowTopItemsData = rowTICanvas.toDataURL('image/png');
		sumColTopItemsData = colTICanvas.toDataURL('image/png');
		sumBoxImgData = sumBoxCanvas.toDataURL('image/png');
		//Put the dendro canvases back the way we found them.
		restoreSummaryDendroCanvases();
	}

	if (mapsToShow == "D") {
		drawDetailHeatMapPages(theFont)
	} else {
		var imgLeft, imgTop;
		drawSummaryHeatMapPage(theFont);
		if (mapsToShow === 'B') {
			// If showing both sum and det, add the box to the summary image, add a page, print the header, and add the detail image to the PDF
			doc.addImage(sumBoxImgData, 'PNG', imgLeft, imgTop, sumMapW,sumMapH);
			doc.addPage();
			drawDetailHeatMapPages(theFont)
		} else {
			// If showing ONLY summary, Clear the box canvas and draw it 'empty' on the summary page (we do this just for the border w/o selection box)
			NgChm.SUM.resetBoxCanvas();
			sumBoxImgData = NgChm.SUM.boxCanvas.toDataURL('image/png');
			doc.addImage(sumBoxImgData, 'PNG', imgLeft, imgTop, sumMapW,sumMapH);
			NgChm.SUM.drawLeftCanvasBox();  
		}

	}
	var colorMap = NgChm.heatMap.getColorMapManager().getColorMap("data",NgChm.SEL.getCurrentDL());

	// Add row and column labels to the PDF
	if (mapsToShow !== "S") {
//		drawDetailSelectionsAndLabels();
	}
	
	// Setup for class bar legends
	var customFont = NgChm.PDF.customFont;
	NgChm.PDF.customFont = false; // reset this variable once it has been referenced
	var classBarTitleSize = customFont ? maxFontSize : 10;
	var classBarLegendTextSize = customFont ? maxFontSize : 9;
	var classBarHeaderSize = 12; // these are font sizes
	var classBarHeaderHeight = classBarHeaderSize+10; 
	var classBarFigureW = 150; // figure dimensions, unless discrete with 15+ categories
	var classBarFigureH = 0;  
	var topSkip = classBarFigureH + classBarHeaderSize+10; 
	var condenseClassBars = isChecked('pdfInputCondensed');
	var rowClassBarData = NgChm.heatMap.getRowClassificationData();
	var colClassBarData = NgChm.heatMap.getColClassificationData();
	var rowClassBarConfig = NgChm.heatMap.getRowClassificationConfig();
	var colClassBarConfig = NgChm.heatMap.getColClassificationConfig();
	paddingLeft = 5;
	paddingTop = headerHeight+classBarHeaderSize + 10; // reset the top and left coordinates
	
	var rowBarsToDraw = [];
	var colBarsToDraw = [];
	if (isChecked('pdfInputColumn')) {
		colBarsToDraw = NgChm.heatMap.getColClassificationOrder("show");
	}
	if (isChecked('pdfInputRow')) {
		rowBarsToDraw = NgChm.heatMap.getRowClassificationOrder("show");
	}
	var topOff = paddingTop + classBarTitleSize + 5;
	var leftOff = 20;
	var sectionHeader;
	
	// adding the data matrix distribution plot to legend page
	drawDataDistributionPlot();

	// adding all row covariate bars to legend page
	drawRowClassLegends();

	// adding all column covariate bars to legend page
	leftOff = 20; // ...reset leftOff...
	drawColClassLegends();

	NgChm.SUM.summaryInit();

	// Reset Summary and Detail Panels on Viewer Screen
	if (includeDetailMap) {
		NgChm.DMM.primaryMap.canvas.focus();
		NgChm.DMM.detailResize();
	}
	
	// Reset cursor to default
	document.body.style.cursor = 'default';
	NgChm.PDF.isGenerating = false;

	
	// Save the PDF document 
	doc.save( NgChm.heatMap.getMapInformation().name + '.pdf');
	
	//=================================================================================//
	//=================================================================================//
	//                        PDF OBJECT HELPER FUNCTIONS 
	//=================================================================================//
	//=================================================================================//

	/**********************************************************************************
	 * FUNCTION: getPdfDocument - This function creates and configures jsPDF Document object.
	 **********************************************************************************/
	function getPdfDocument() {
		var newDoc;
		var paperSize = [792,612];
		if (document.getElementById("pdfPaperSize").value == "A4") {
			paperSize = [842,595];
		} else if (document.getElementById("pdfPaperSize").value == "A3") {
			paperSize = [1224,792];
		}
		var newDoc = isChecked("pdfInputPortrait") ? new jsPDF("p","pt",paperSize) :new jsPDF("l","pt",paperSize); // landscape or portrait?  210 × 297  2.83465  595x842
		newDoc.setFont(document.getElementById("pdfFontStyle").value);
		pageHeight = newDoc.internal.pageSize.height;
		pageWidth = newDoc.internal.pageSize.width;
		return newDoc;
	}

	/**********************************************************************************
	 * FUNCTION: validateInputFont - This function validates user-input font size.
	 **********************************************************************************/
	function validateInputFont() {
		if (document.getElementById("pdfInputFont").value < 1 || document.getElementById("pdfInputFont").value > 36){
			document.getElementById('pdfErrorMessage').style.display="inherit";
			return false;
		} else {
			document.getElementById('pdfErrorMessage').style.display="none";
			return true;
			
		}
	}

	/**********************************************************************************
	 * FUNCTION: setLongestLabelUnits - This function converts longest label units to 
	 * actual length (11 is the max font size of the labels) these will be the bottom 
	 * and left padding space for the detail Heat Map
	 **********************************************************************************/
	function setLongestLabelUnits() {
		longestRowLabelUnits = 1
		longestColLabelUnits = 1;
		for (var i = 0; i < allLabels.length; i++){ // go through all the labels and find the one that takes the most space
			var label = allLabels[i];
			if (label.dataset.axis == "Row" || label.dataset.axis == "ColumnCovar"){
				longestRowLabelUnits = Math.max(doc.getStringUnitWidth(label.innerHTML),longestRowLabelUnits);
			} else {
				longestColLabelUnits = Math.max(doc.getStringUnitWidth(label.innerHTML),longestColLabelUnits);
			}
		} 
		longestColLabelUnits += longestColLabelUnits*maxFontSize+30; //Set initially to maximum font sizing for rough page sizing
		longestRowLabelUnits += longestRowLabelUnits*maxFontSize+30;
	}
	
	/**********************************************************************************
	 * FUNCTION: setTopItemsSizing - This function calculates the proper PDF
	 * display dimensions for row and column top items.  This calculation includes
	 * both the top items "lines" canvas and the area required for displaying top item
	 * labels.
	 **********************************************************************************/
	function setTopItemsSizing(){
		topItemsWidth = 10;
		topItemsHeight = 10;
		var rowTopItems = NgChm.SUM.rowTopItems;
		var colTopItems = NgChm.SUM.colTopItems;
		var longestRowTopItems = 0;
		var longestColTopItems = 0;
		for (var i = 0; i < rowTopItems.length; i++){
			longestRowTopItems = Math.max(doc.getStringUnitWidth(rowTopItems[i]),longestRowTopItems);
		}
		longestRowTopItems *= maxFontSize;
		for (var i = 0; i < colTopItems.length; i++){
			longestColTopItems = Math.max(doc.getStringUnitWidth(colTopItems[i]),longestColTopItems);
		}
		longestColTopItems *= maxFontSize;
		rowTopItemsLength = longestRowTopItems + topItemsWidth + 10; 
		colTopItemsLength = longestColTopItems + topItemsHeight + 40; 
		if (isChecked("pdfInputPortrait")) {
			rowTopItemsLength += 20;
			colTopItemsLength -= 20;
		}
	}	

	/**********************************************************************************
	 * FUNCTION: setSummaryDendroDimensions - This function calculates the proper PDF
	 * display dimensions for the Summary page dendrograms.  Since one dimension of 
	 * each is determined by the heat map width/height, only row dendro width and
	 * column dendro height need be calculated.
	 **********************************************************************************/
	function setSummaryDendroDimensions() {
		var rowDendroPctg = document.getElementById("row_dendro_canvas").width / (NgChm.SUM.boxCanvas.width + NgChm.SUM.rCCanvas.width + document.getElementById("row_dendro_canvas").width + rowTopItemsLength);
		var colDendroPctg = document.getElementById("column_dendro_canvas").height / (NgChm.SUM.boxCanvas.height + NgChm.SUM.cCCanvas.height + document.getElementById("column_dendro_canvas").height + colTopItemsLength);
		rowDendroWidth = sumImgW * rowDendroPctg;
		colDendroHeight = sumImgH * colDendroPctg;
	}
	
	/**********************************************************************************
	 * FUNCTION: setSummaryClassDimensions - This function calculates the proper PDF
	 * display dimensions for the Summary page class bars.  Since one dimension of 
	 * each is determined by the heat map width/height, only row class width and
	 * column class height need be calculated.
	 **********************************************************************************/
	function setSummaryClassDimensions() {
		var rowClassBarPctg = NgChm.SUM.rCCanvas.width / (NgChm.SUM.boxCanvas.width + NgChm.SUM.rCCanvas.width + document.getElementById("row_dendro_canvas").width + rowTopItemsLength);
		var colClassBarPctg = NgChm.SUM.cCCanvas.height / (NgChm.SUM.boxCanvas.height + NgChm.SUM.cCCanvas.height + document.getElementById("column_dendro_canvas").height + colTopItemsLength);
		rowClassWidth = sumImgW * rowClassBarPctg;
		colClassHeight = sumImgH * colClassBarPctg;
	}

	/**********************************************************************************
	 * FUNCTION: setSummaryHeatmapDimensions - This function calculates the proper PDF
	 * display dimensions for the Summary Heat Map page.
	 **********************************************************************************/
	function setSummaryHeatmapDimensions() {
		var sumMapWPctg = NgChm.SUM.boxCanvas.width / (NgChm.SUM.boxCanvas.width + NgChm.SUM.rCCanvas.width + document.getElementById("row_dendro_canvas").width + rowTopItemsLength);
		var sumMapHPctg = NgChm.SUM.boxCanvas.height / (NgChm.SUM.boxCanvas.height + NgChm.SUM.cCCanvas.height + document.getElementById("column_dendro_canvas").height + colTopItemsLength);
		sumMapW = sumImgW * sumMapWPctg //height of summary heatmap (and class bars)
		sumMapH = sumImgH * sumMapHPctg; //width of summary heatmap (and class bars)
	}

	/**********************************************************************************
	 * FUNCTION: setDetailHeatmapDimensions - This function calculates the proper PDF
	 * display dimensions for the Detail Heat Map page.
	 **********************************************************************************/
	function setDetailHeatmapDimensions(rcw,cch,hmw,hmh) {
		var rowDendroPctg = rcw / (hmw + rcw);
		var colDendroPctg = cch / (hmh + cch);
		detMapW = detImgW*(1-rowDendroPctg);
		detMapH = detImgH*(1-colDendroPctg);
		detRowDendroWidth = detImgW * rowDendroPctg;
		detColDendroHeight = detImgH * colDendroPctg;
		detColClassHeight = detMapH*(NgChm.DET.calculateTotalClassBarHeight("col")/hmh);
		detRowClassWidth = detMapW*(NgChm.DET.calculateTotalClassBarHeight("row")/hmw);
//		console.log ({ m: 'setDetailHeatmapDimensions', detMapW, detMapH, detRowDendroWidth, detColDendroHeight, detColClassHeight, detRowClassWidth, rcw, cch, hmw, hmh, rowDendroPctg, colDendroPctg });
	}
	
	/**********************************************************************************
	 * FUNCTION: configureCanvas - Dimensions of summary and covariate bar canvases are 
	 * sometimes a poor match for the size they will be in the PDF. Create a temporary 
	 * canvas matching the PDF image dimensions, turn off image smoothing and 
	 * copy the current canvas to the temporary one.  This will resize the image 
	 * without smoothing to the target size so the PDF viewer will not need to 
	 * stretch/compress the image much.  Prevents blurry images on some heat maps.
	 **********************************************************************************/
	function configureCanvas(newCanvas, origCanvas, newWidth, newHeight) {
		newCanvas.width = newWidth;
		newCanvas.height = newHeight;
		var destCtx = newCanvas.getContext("2d");
		destCtx.mozImageSmoothingEnabled = false;
		destCtx.imageSmoothingEnabled = false;
		destCtx.scale(newWidth/origCanvas.width,newHeight/origCanvas.height);
		destCtx.drawImage(origCanvas,0,0);
	}

	/**********************************************************************************
	 * FUNCTION - createHeader: This function sets up the PDF page header bar used on all 
	 * of the PDF pages.  It makes the MDAnderson logo, the HM name, and the red divider 
	 * line at the top of each page
	 **********************************************************************************/
	function createHeader(theFont, titleText, contText) {
		//If standard viewer version OR file viewer version show MDA logo 
		if ((NgChm.PDF.isWidget === false) || (typeof isNgChmAppViewer !== 'undefined')) {
			doc.addImage(NgChm.PDF.absLogo, 'PNG',5,5,header.clientWidth,header.clientHeight);
			// Center Heat Map name in header whitespace to left of logo and step down the font if excessively long.
			let fullTitle = "";
			if (titleText !== null) {
				fullTitle = titleText + ": ";
			}
			fullTitle = fullTitle + NgChm.heatMap.getMapInformation().name
			if (NgChm.heatMap.getMapInformation().name.length > 60) {
				doc.setFontSize(12);
			} else {
				doc.setFontSize(18);
			}
			doc.text(250, headerHeight - 10, fullTitle, null);
			doc.setFontType("bold");
			doc.setFillColor(94,68,146);
			doc.setDrawColor(94,68,146);
			doc.rect(5, header.clientHeight+10, pageWidth-10, 2, "FD");
			doc.setFontSize(theFont);
			if (typeof contText !== 'undefined') {
				doc.setFontSize(classBarHeaderSize);
				doc.text(10, paddingTop, contText, null);
			}
		} else {
			// If widgetized viewer exclude MDA logo and show compressed hear
			doc.setFontSize(8);
			doc.setFontType("bold");
			doc.text(10,10,"NG-CHM Heat Map: "+ NgChm.heatMap.getMapInformation().name,null);
			doc.setFillColor(255,0,0);
			doc.setDrawColor(255,0,0);
			doc.rect(0, 15, pageWidth-10, 2, "FD");
			doc.setFontSize(theFont);
		}
		doc.setFontType("normal");
	}
	
	/**********************************************************************************
	 * FUNCTION - setClassBarFigureH: This function will set classification bar figure
	 * height for the class bar legend page.  
	 **********************************************************************************/
	function setClassBarFigureH(threshCount, type, isMissing) {  
		var bars = 9; //Set bar default to continuous with 9 bars
		if (type === 'discrete') {
			bars = threshCount; //Set bars to threshold count 
		}
		bars += isMissing; // Add a bar if missing values exist
		var calcHeight = bars * (classBarLegendTextSize+3); //number of bars multiplied by display height
		if (calcHeight > classBarFigureH) {
			classBarFigureH = calcHeight;
		}
	}
	
	/**********************************************************************************
	 * FUNCTION - drawMissingColor: This function will set the missing color line for
	 * either type (row/col) of classification bar.
	 **********************************************************************************/
	function drawMissingColor(bartop, barHeight, missingCount, maxCount, maxLabelLength, threshMaxLen, totalValues) {
		var barScale = isChecked("pdfInputPortrait") ? .50 : .65;
		if (condenseClassBars){
			var barW = 10;
			doc.rect(leftOff, bartop, barW, barHeight, "FD");
			doc.setFontSize(classBarLegendTextSize);
			doc.text(leftOff +barW + 5, bartop + classBarLegendTextSize, "Missing Value", null);
			doc.text(leftOff +barW + threshMaxLen + 10, bartop + classBarLegendTextSize, "n = " + missingCount + " (" + (missingCount/totalValues*100).toFixed(2) + "%)" , null);
		} else {
			var barW = (missingCount/maxCount*classBarFigureW)*barScale;
			doc.rect(leftOff + maxLabelLength, bartop, barW, barHeight, "FD");
			doc.setFontSize(classBarLegendTextSize);
			doc.text(leftOff + maxLabelLength - doc.getStringUnitWidth("Missing Value")*classBarLegendTextSize - 4, bartop + classBarLegendTextSize, "Missing Value" , null);
			doc.text(leftOff + maxLabelLength +barW + 5, bartop + classBarLegendTextSize, "n = " + missingCount + " (" + (missingCount/totalValues*100).toFixed(2) + "%)" , null);
		}
	}
	
	/**********************************************************************************
	 * FUNCTION - adjustForNextClassBar: This function will set the positioning for the
	 * next class bar to be drawn
	 **********************************************************************************/
	function adjustForNextClassBar(key,type,maxLabelLength) {
		leftOff+= classBarFigureW + maxLabelLength + 60;
		if (leftOff + classBarFigureW > pageWidth){ // if the next class bar figure will go beyond the width of the page...
			leftOff = 20; // ...reset leftOff...
			topSkip  = classBarFigureH + classBarHeaderHeight + (10*covTitleRows); 
			covTitleRows = 1;
			topOff += topSkip; // ... and move the next figure to the line below
			classBarHeaderHeight = classBarHeaderSize+10; //reset this value
			var nextClassBarFigureH = getNextLineClassBarFigureH(key,type);
			if (topOff + classBarHeaderHeight + nextClassBarFigureH > pageHeight && !isLastClassBarToBeDrawn(key,type)){ // if the next class bar goes off the page vertically...
				doc.addPage(); // ... make a new page and reset topOff
				createHeader(theFont, null, sectionHeader + " (continued)");
				topOff = paddingTop + 15;
			}
			classBarFigureH = 0;   
		}
	}
	
	/**********************************************************************************
	 * FUNCTION - getNextLineClassBarFigureH: This function is used to determine the
	 * height of the next few class bars when a new line of class bar legends needs to 
	 * be drawn.
	 **********************************************************************************/
	function getNextLineClassBarFigureH(key,type){
		var minLabelLength = doc.getStringUnitWidth("Missing Value")*classBarLegendTextSize;
		var classBarsToDraw = type == "col" ? colBarsToDraw : rowBarsToDraw;
		var classBars = type == "col" ? NgChm.heatMap.getColClassificationConfig(): NgChm.heatMap.getRowClassificationConfig();
		var index = classBarsToDraw.indexOf(key);
		var classW = classBarFigureW;
		var maxThresh = 0;
		var numFigures = 0;
		var nextIdx = index+1;
		while (numFigures*(classBarFigureW+minLabelLength+60) < pageWidth){
			var barName = classBarsToDraw[nextIdx];
			if (!barName) break;
			var thisBar = classBars[barName];
			var threshCount = thisBar.color_map.thresholds.length+1; // +1 added to assume that missing values will be present
			if (thisBar.color_map.type == "continuous"){threshCount = 10}
			if (threshCount > maxThresh) maxThresh = threshCount;
			nextIdx++,numFigures++;
		}
		return maxThresh*classBarLegendTextSize;
	}
	
	/**********************************************************************************
	 * FUNCTION - isChecked: This function will check the checkboxes/radio buttons to see 
	 * how the PDF is to be created. 
	 **********************************************************************************/
	function isChecked(el){
		if(document.getElementById(el))
		return document.getElementById(el).checked;
	}
	
	/**********************************************************************************
	 * FUNCTION - getThreshMaxLength: This function will calculate the threshold maximum
	 * length used in creating the legends page(s)
	 **********************************************************************************/
	function getThreshMaxLength(thresholds,fontSize) {
		var threshMaxLen = 0;
		for (var i = 0; i < thresholds.length; i++){ // make a gradient stop (and also a bucket for continuous)
			var thresh = thresholds[i];
			if (thresh.length > threshMaxLen) {
				threshMaxLen = thresh.length;
			}
		}
		//Account for "Missing Values" label
		if (threshMaxLen < 13) {
			threshMaxLen = 13;
		}
		threshMaxLen *= fontSize/2;
		return threshMaxLen;
	}

	/**********************************************************************************
	 * FUNCTION - isLastClassBarToBeDrawn: Checks if this is the last class bar to be 
	 * drawn. Used to determine if we add a new page when drawing class bars.
	 **********************************************************************************/
	function isLastClassBarToBeDrawn(classBar,type){
		var isItLast = false;
		if (isChecked('pdfInputColumn')) {
			var colBars = NgChm.heatMap.getColClassificationOrder("show");
			if ((type === 'col') && (classBar === colBars[colBars.length - 1])) {
				isItLast = true
			}
		}
		if (isChecked('pdfInputRow')) {
			var rowBars = NgChm.heatMap.getRowClassificationOrder("show");
			if ((type === 'row') && (classBar === rowBars[rowBars.length - 1])) {
				isItLast = true
			}
		}
		return isItLast;
	}
	
	/**********************************************************************************
	 * FUNCTION:  resizeSummaryDendroCanvases - This page resizes the summary canvases 
	 * prior to their use in constructing PDF pages.  The summary box canvas and summary 
	 * dendro canvases are sized based on the size of the browser so  that the lines drawn 
	 * in them are the correct width.  We are going to draw these canvases on a PDF  
	 * page so temporarily resize these canvases to the correct size for a normal page.
	 **********************************************************************************/
	function resizeSummaryDendroCanvases (sumMapW, sumMapH, rowDendroWidth, colDendroHeight, rowClassWidth, colClassHeight) {
		//Save the current settings.
		NgChm.PDF.rowDendoWidth = document.getElementById('row_dendro_canvas').width;
		NgChm.PDF.rowDendroHeight = document.getElementById('row_dendro_canvas').height;
		NgChm.PDF.colDendroWidth = document.getElementById('column_dendro_canvas').width;
		NgChm.PDF.colDendroHeight = document.getElementById('column_dendro_canvas').height;

		//Set canvas sizes to new sizes
		document.getElementById('row_dendro_canvas').width = rowDendroWidth;
		document.getElementById('row_dendro_canvas').height = sumMapH;
		document.getElementById('column_dendro_canvas').width = sumMapW;
		document.getElementById('column_dendro_canvas').height = colDendroHeight;

		//Redraw the summary canvases so that they may be used in creating PDF images
		NgChm.SUM.drawHeatMap();
		NgChm.SUM.drawTopItems();
		NgChm.SUM.colDendro.draw();
		NgChm.SUM.rowDendro.draw();
	}
	
	/**********************************************************************************
	 * FUNCTION:  restoreSummaryDendroCanvases - This page resizes the summary canvases back
	 * to their original sizes after creating the images used for these canvases on the PDF.
	 * This is required so that the Summary side of the viewer screen is redrawn 
	 * correctly after PDF creation.
	 **********************************************************************************/
	function restoreSummaryDendroCanvases () {
		//Restore saved height/width settings and redraw.
		document.getElementById('row_dendro_canvas').width = NgChm.PDF.rowDendoWidth;
		document.getElementById('row_dendro_canvas').height = NgChm.PDF.rowDendroHeight;
		document.getElementById('column_dendro_canvas').width = NgChm.PDF.colDendroWidth;
		document.getElementById('column_dendro_canvas').height = NgChm.PDF.colDendroHeight;
		NgChm.SUM.drawHeatMap();
		NgChm.SUM.drawTopItems();
		NgChm.SUM.colDendro.draw();
		NgChm.SUM.rowDendro.draw();
	}

	/**********************************************************************************
	 * FUNCTION:  resizeDetailDendroCanvases - This page resizes the detail dendroram
	 * canvases for the PDF and redraws them.  
	 **********************************************************************************/
	function resizeDetailDendroCanvases(mapItem,detMapW,detMapH, rowDendroW, colDendroH){
        mapItem.canvas.style.height = detMapH + 'px';
        mapItem.canvas.style.width = detMapW+ 'px';
 		NgChm.DET.updateDisplayedLabels();
		mapItem.rowDendroCanvas.height = detMapH;
		mapItem.rowDendroCanvas.style.height = detMapH + 'px';
		mapItem.rowDendroCanvas.width = rowDendroW;
		mapItem.rowDendroCanvas.style.width = rowDendroW + 'px';
		mapItem.colDendroCanvas.width = detMapW;
		mapItem.colDendroCanvas.style.width = detMapW + 'px';
		mapItem.colDendroCanvas.height = colDendroH;
		mapItem.colDendroCanvas.style.height = colDendroH + 'px';
		mapItem.rowDendro.draw();
		mapItem.colDendro.draw();
		NgChm.DET.detailDrawColClassBarLabels(mapItem);
		NgChm.DET.detailDrawRowClassBarLabels(mapItem);
	}
	
	/**********************************************************************************
	 * FUNCTION:  drawSummaryHeatMapPage - This function draws the various summary canvases
	 * onto the summary heat map PDF page.
	 **********************************************************************************/
	function drawSummaryHeatMapPage(theFont) {
		createHeader(theFont, "Summary");
		// Draw the Summary Top Items on the Summary Page
		drawSummaryTopItems();
		var rowDendroLeft = paddingLeft;
		var colDendroTop = paddingTop;
		var rowClassLeft = rowDendroLeft+rowDendroWidth;
		var colClassTop = colDendroTop+colDendroHeight;
		imgLeft = paddingLeft+rowDendroWidth+rowClassWidth;
		imgTop = paddingTop+colDendroHeight+colClassHeight;
		if (rowDendroConfig.show === 'NONE') {
			imgLeft = paddingLeft;
		} else {
			doc.addImage(sumRowDendroData, 'PNG', rowDendroLeft, imgTop, rowDendroWidth, sumMapH);
		}
		doc.addImage(sumRowClassData, 'PNG', rowClassLeft, imgTop, rowClassWidth, sumMapH);
		if (colDendroConfig.show === 'NONE') {
			imgTop = paddingTop;
		} else {
			doc.addImage(sumColDendroData, 'PNG', imgLeft, colDendroTop, sumMapW, colDendroHeight);
		}
		doc.addImage(sumColClassData, 'PNG', imgLeft, colClassTop, sumMapW, colClassHeight);
		doc.addImage(sumImgData, 'PNG', imgLeft, imgTop, sumMapW,sumMapH);
		
		// Add top item marks
		doc.addImage(sumRowTopItemsData, 'PNG', imgLeft + sumMapW, imgTop, topItemsWidth,sumMapH); 
		doc.addImage(sumColTopItemsData, 'PNG', imgLeft, imgTop + sumMapH, sumMapW,topItemsHeight);
	}
	
	/**********************************************************************************
	 * FUNCTION - getPrimaryLabels: This function retrieves an array filled with the
	 * labels for the Primary heat map panel.
	 **********************************************************************************/
	function getPrimaryLabels(){
		var allLabels = document.getElementsByClassName("DynamicLabel");
		var primaryLabels = [];
		for (var i = 0; i < allLabels.length; i++) {
			var label = allLabels[i];
			if ((label.id.split("_").length) < 3) {
				primaryLabels.push(label);
			}
		}
		return primaryLabels;
	}
	
	/**********************************************************************************
	 * FUNCTION - drawSummaryTopItems: This function draws the labels for Summary Top
	 * Items on the Summary page.
	 **********************************************************************************/
	function drawSummaryTopItems(){
		var topItems = document.getElementsByClassName("topItems");
		var rowAdj = 0;
		var colAdj = 0;
		if (isChecked("pdfInputPortrait")) {
			rowAdj += 10;
			colAdj -= 10;
		}
		var sumPct = NgChm.heatMap.getDividerPref();
		var sumDiff = (50 - sumPct) * .7;
//		var sumDiff = 0;
		for (var i = 0; i < topItems.length; i++){
			var item = topItems[i];
			if (item.axis == "row"){
				var left = paddingLeft+rowDendroWidth + rowClassWidth + sumMapW+topItemsWidth + 2;
				var topOffPct = item.offsetTop / document.getElementById("summary_chm").clientHeight;
				var topAdj = topOffPct > .5 ? 2 : 0;
				var topPos = (sumImgH * topOffPct) + 2;
				doc.text(left, paddingTop + topPos + rowAdj + topAdj, item.innerHTML);
			} else {
				var top = paddingTop + colDendroHeight + sumMapH + colClassHeight+ topItemsHeight +2;
				var leftOffsetPct = item.offsetLeft / document.getElementById("summary_chm").clientWidth;
				var lftAdj = leftOffsetPct > .6 ? 7 : 0;
				var leftPos = (sumImgW * leftOffsetPct) + 25;
				doc.text(leftPos+paddingLeft+colAdj+lftAdj+sumDiff, top, item.innerHTML, null, 270);
			}
		}
	}
	
	/**********************************************************************************
	 * FUNCTION:  drawDetailHeatMapPages - This function draws the various detail canvases
	 * onto the detail heat map PDF page.
	 **********************************************************************************/
	function drawDetailHeatMapPages(theFont) {
		for (let i=0; i<NgChm.DMM.DetailMaps.length;i++ ) {
			const mapItem = NgChm.DMM.DetailMaps[i];
			const loc = NgChm.Pane.findPaneLocation (mapItem.chm);
			if (loc.pane.classList.contains('collapsed')) {
				break;
			}

			if (i > 0) {
				doc.addPage();
			}
			let detVer = "Primary";
			if (mapItem.version === 'S') {
				detVer = "Ver " + mapItem.panelNbr;
			}
			createHeader(theFont, "Detail - " + detVer);
			const rcw = + mapItem.rowDendroCanvas.clientWidth;
			const cch = + mapItem.colDendroCanvas.clientHeight;
			const hmw = + mapItem.canvas.width;
			const hmh = + mapItem.canvas.height;
			const rowDendroPctg = rcw / (hmw + rcw);
			const colDendroPctg = cch / (hmh + cch);
			let detMapW = detImgW*(1-rowDendroPctg);
			let detMapH = detImgH*(1-colDendroPctg);
			let detRowDendroWidth = detImgW * rowDendroPctg;
			let detColDendroHeight = detImgH * colDendroPctg;
			let detColClassHeight = detMapH*(NgChm.DET.calculateTotalClassBarHeight("col")/hmh);
			let detRowClassWidth = detMapW*(NgChm.DET.calculateTotalClassBarHeight("row")/hmw);
			setDetailHeatmapDimensions(rcw,cch,hmw,hmh)
			let rowDendroLeft = paddingLeft;
			let imgLeft = paddingLeft+detRowDendroWidth;
			let colDendroTop = paddingTop;
			let imgTop = paddingTop+detColDendroHeight;
			if (rowDendroConfig.show !== 'ALL') {
				imgLeft = paddingLeft;
				detMapW = detImgW;
				detRowClassWidth = detMapW*(NgChm.DET.calculateTotalClassBarHeight("row")/mapItem.canvas.width);
				detRowDendroWidth = 0;
			}
			if (colDendroConfig.show !== 'ALL') {
				imgTop = paddingTop;
				detMapH = detImgH;
				detColClassHeight = detMapH*(NgChm.DET.calculateTotalClassBarHeight("col")/mapItem.canvas.height);
				detColDendroHeight = 0;
			}
			resizeDetailDendroCanvases(mapItem,detMapW,detMapH,detRowDendroWidth,detColDendroHeight);
			
			var detRowDendroData = mapItem.rowDendroCanvas.toDataURL('image/png');
			var detColDendroData = mapItem.colDendroCanvas.toDataURL('image/png');
			var detImgData = mapItem.canvas.toDataURL('image/png'); 
			const blankCanvas = getBlankCanvas(mapItem.canvas);
			const blankImgData = blankCanvas.toDataURL('image/png');
			if (detImgData === blankImgData) {
				doc.setFontSize(12);
				doc.setFontType("bold");
				doc.text(70, 90, "The image for this detail panel was not retrieved. Please try again.", null);
			} else {
				var detBoxImgData = mapItem.boxCanvas.toDataURL('image/png');  
				if (rowDendroConfig.show === 'ALL') {
					doc.addImage(detRowDendroData, 'PNG', rowDendroLeft, imgTop+detColClassHeight, detRowDendroWidth, detMapH-detColClassHeight);
				}
				if (colDendroConfig.show === 'ALL') {
					doc.addImage(detColDendroData, 'PNG',imgLeft+detRowClassWidth, colDendroTop, detMapW-detRowClassWidth,detColDendroHeight);
				}
				doc.addImage(detImgData, 'PNG', imgLeft, imgTop, detMapW, detMapH);
				doc.addImage(detBoxImgData, 'PNG', imgLeft, imgTop, detMapW, detMapH);
				drawDetailSelectionsAndLabels(mapItem);  
			}
		}
	}

	function getBlankCanvas(canvas) {  
		var blankCanvas = document.createElement("canvas");	
		blankCanvas.width = canvas.width;
		blankCanvas.height = canvas.height;
		return blankCanvas
	}

	/**********************************************************************************
	 * FUNCTION:  drawDetailSelectionsAndLabels - This function draws any selection 
	 * boxes and then labels onto the detail heat map page.
	 **********************************************************************************/
	function drawDetailSelectionsAndLabels(mapItem) {
		var detClient2PdfWRatio = mapItem.canvas.clientWidth/detMapW;  // scale factor to place the labels in their proper locations
		var detClient2PdfHRatio = mapItem.canvas.clientHeight/detMapH;
		// Draw selection boxes first (this way they will not overlap text)
		drawDetailSelectionBoxes(mapItem, detClient2PdfWRatio,detClient2PdfHRatio);
		// Draw selection boxes first (this way they will not overlap text)
		drawDetailLabels(mapItem,detClient2PdfWRatio,detClient2PdfHRatio);
	}

	/**********************************************************************************
	 * FUNCTION:  drawDetailSelectionsAndLabels - This function draws any selection 
	 * boxes and selected label boxes onto the detail heat map page.
	 **********************************************************************************/
	function drawDetailSelectionBoxes(mapItem,detClient2PdfWRatio,detClient2PdfHRatio,selectedColor) {
		var colorMap = NgChm.heatMap.getColorMapManager().getColorMap("data",NgChm.SEL.getCurrentDL());
		const mapLabels = mapItem.labelElements;
		// Draw selection boxes first (this way they will not overlap text)
		var rowLabels = 0;
		// Get selection color for current datalayer to be used in highlighting selected labels
		var dataLayers = NgChm.heatMap.getDataLayers();
		var layer = dataLayers[mapItem.currentDl];
		var selectedColor = colorMap.getHexToRgba(layer.selection_color);
		for (var i in mapLabels) {
			var label = mapLabels[i].div;		
			if (label.dataset.axis == "Row"){
				if (NgChm.SRCH.labelIndexInSearch("Row",mapItem.currentRow+i)) {
					doc.setFillColor(selectedColor.r, selectedColor.g, selectedColor.b);
					doc.rect((label.offsetLeft-mapItem.canvas.offsetLeft)/detClient2PdfWRatio+rowDendroWidth+paddingLeft, (label.offsetTop-mapItem.canvas.offsetTop)/detClient2PdfHRatio+paddingTop+colDendroHeight, longestRowLabelUnits+2, theFont,'F');
				}
				rowLabels++;
			} else if (label.dataset.axis == "Column") {
				if (NgChm.SRCH.labelIndexInSearch("Column",mapItem.currentCol+i-rowLabels)) {
					doc.setFillColor(selectedColor.r, selectedColor.g, selectedColor.b);
					doc.rect((label.offsetLeft-mapItem.canvas.offsetLeft)/detClient2PdfWRatio+rowDendroWidth-2, (label.offsetTop-mapItem.canvas.offsetTop)/detClient2PdfHRatio+paddingTop+colDendroHeight,  theFont+2.5, longestColLabelUnits+2,'F'); 
				}
			}
		}
	}
	
	/**********************************************************************************
	 * FUNCTION:  drawDetailLabels - This function draws any labels onto
	 * the heat map page.
	 **********************************************************************************/
	function drawDetailLabels(mapItem,detClient2PdfWRatio,detClient2PdfHRatio) {
		const mapLabels = mapItem.labelElements;
		for (var j in mapLabels) {
			var label = mapLabels[j].div;		
			if ((label.dataset.axis == "Row") || (label.dataset.axis == "ColumnCovar")) {
				if (label.id.indexOf("legendDet") > -1) {
					doc.text((label.offsetLeft-mapItem.canvas.offsetLeft)/detClient2PdfWRatio+detRowDendroWidth+paddingLeft, (label.offsetTop-mapItem.canvas.offsetTop)/detClient2PdfHRatio+paddingTop+detColDendroHeight+theFont*.75-1, label.innerHTML, null);
				} else {
					doc.text((label.offsetLeft-mapItem.canvas.offsetLeft)/detClient2PdfWRatio+detRowDendroWidth+paddingLeft, (label.offsetTop-mapItem.canvas.offsetTop)/detClient2PdfHRatio+paddingTop+detColDendroHeight+theFont*.75, label.innerHTML, null);
				}
				
			} else if ((label.dataset.axis == "Column") || (label.dataset.axis == "RowCovar")) {
				if (label.id.indexOf("legendDet") > -1) {
					doc.text((label.offsetLeft-mapItem.canvas.offsetLeft)/detClient2PdfWRatio+detRowDendroWidth+paddingLeft, (label.offsetTop-mapItem.canvas.offsetTop)/detClient2PdfHRatio+paddingTop+detColDendroHeight, label.innerHTML, null, 270);
				} else {
					doc.text((label.offsetLeft-mapItem.canvas.offsetLeft)/detClient2PdfWRatio+detRowDendroWidth, (label.offsetTop-mapItem.canvas.offsetTop)/detClient2PdfHRatio+paddingTop+detColDendroHeight, label.innerHTML, null, 270);
				}
			} 
		}
	}
	
	/**********************************************************************************
	 * FUNCTION:  drawDataDistributionPlot - This function draws the matrix data 
	 * distribution plot on the legend page.
	 **********************************************************************************/
	function drawDataDistributionPlot() {
		sectionHeader = "Data Matrix Distribution"
		doc.addPage();
		createHeader(theFont, null);
		doc.setFontSize(classBarHeaderSize);
		doc.setFontType("bold");
		doc.text(10, paddingTop, sectionHeader , null);
		doc.setFontType("normal");
		getDataMatrixDistributionPlot();
	}

	/**********************************************************************************
	 * FUNCTION - getDataMatrixDistributionPlot: This function creates the distribution 
	 * plot for the legend page.
	 **********************************************************************************/
	function getDataMatrixDistributionPlot(){
		// function ripped from UPM used in the gear panel
		var currentDl = NgChm.SEL.getCurrentDL();
		var cm = NgChm.heatMap.getColorMapManager().getColorMap("data",currentDl);
		var thresholds = cm.getThresholds();
		var numBreaks = thresholds.length;
		var highBP = parseFloat(thresholds[numBreaks-1]);
		var lowBP = parseFloat(thresholds[0]);
		var diff = highBP-lowBP;
		var bins = new Array(10+1).join('0').split('').map(parseFloat); // make array of 0's to start the counters
		var breaks = new Array(9+1).join('0').split('').map(parseFloat);
		for (var i=0; i <breaks.length;i++){
			breaks[i]+=lowBP+diff/(breaks.length-1)*i; // array of the breakpoints shown in the preview div
			breaks[i]=parseFloat(breaks[i].toFixed(2));
		}
		var numCol = NgChm.heatMap.getNumColumns(NgChm.MMGR.DETAIL_LEVEL);
		var numRow = NgChm.heatMap.getNumRows(NgChm.MMGR.DETAIL_LEVEL)
		var count = 0;
		var nan=0;
		for (var i=1; i<numCol+1;i++){
			for(var j=1;j<numRow+1;j++){
				count++;
				var val = Number(Math.round(NgChm.heatMap.getValue(NgChm.MMGR.DETAIL_LEVEL,j,i)+'e4')+'e-4')
				if (isNaN(val) || val>=NgChm.SUM.maxValues){ // is it Missing value?
					nan++;
				} else if (val <= NgChm.SUM.minValues){ // is it a cut location?
					continue;
				}
				if (val <= breaks[0]){
					bins[0]++;
					continue;
				} else if (highBP < val){
					bins[bins.length-1]++;
					continue;
				}
				for (var k=0;k<breaks.length;k++){
					if (breaks[k]<=val && val < breaks[k+1]){
						bins[k+1]++;
						break;
					}
				}
			}
		}
		var total = 0;
		var binMax = nan;
		for (var i=0;i<bins.length;i++){
			if (bins[i]>binMax)
				binMax=bins[i];
			total+=bins[i];
		}
		
		var leftOff = 20;
		var bartop = topOff+5;
		var threshMaxLen = getThreshMaxLength(thresholds,classBarLegendTextSize);
		var missingCount=0;
		
		var barHeight = classBarLegendTextSize + 3;
		for (var j = 0; j < breaks.length; j++){ // draw all the bars within the break points
			var rgb = cm.getColor(breaks[j]);
			doc.setFillColor(rgb.r,rgb.g,rgb.b);
			doc.setDrawColor(0,0,0);
			let value = bins[j];
			if (isNaN(value) || value == undefined){
				value = 0;
			}
			if (condenseClassBars){ // square
				var barW = 10;
				doc.rect(leftOff + threshMaxLen, bartop, barW, barHeight, "FD"); // make the square
				doc.rect(leftOff + threshMaxLen-2, bartop+barHeight, 2, 1, "FD"); // make break bar
				doc.setFontSize(classBarLegendTextSize);
				doc.text(leftOff + threshMaxLen - doc.getStringUnitWidth(breaks[j].toString())*classBarLegendTextSize - 4, bartop + classBarLegendTextSize + barHeight/2, breaks[j].toString() , null);
				doc.text(leftOff +barW + threshMaxLen + 10, bartop + classBarLegendTextSize, "n = " + value + " (" + (value/total*100).toFixed(2) + "%)" , null);
			} else { // histogram
				var barW = (value/binMax*classBarFigureW)*.65;  //scale bars to fit page
				doc.rect(leftOff + threshMaxLen, bartop, barW, barHeight, "FD"); // make the histo bar
				doc.rect(leftOff + threshMaxLen-2, bartop+barHeight, 2, 1, "FD"); // make break bar
				doc.setFontSize(classBarLegendTextSize);
				doc.text(leftOff + threshMaxLen - doc.getStringUnitWidth(breaks[j].toString())*classBarLegendTextSize - 4, bartop + classBarLegendTextSize + barHeight/2, breaks[j].toString() , null);
				doc.text(leftOff + threshMaxLen +barW + 5, bartop + classBarLegendTextSize, "n = " + value + " (" + (value/total*100).toFixed(2) + "%)" , null);
			}
			missingCount -= value; 
			bartop+=barHeight; // adjust top position for the next bar
		}
		// draw the last bar in the color plot
		var rgb = cm.getColor(breaks[breaks.length-1]);
		doc.setFillColor(rgb.r,rgb.g,rgb.b);
		doc.setDrawColor(0,0,0);
		let value = bins[bins.length-1];
		if (isNaN(value) || value == undefined){
			value = 0;
		}
		if (condenseClassBars){ // square
			var barW = 10;
			doc.rect(leftOff + threshMaxLen, bartop, barW, barHeight, "FD"); // make the square
			doc.setFontSize(classBarLegendTextSize);
			doc.text(leftOff +barW + threshMaxLen + 10, bartop + classBarLegendTextSize, "n = " + value + " (" + (value/total*100).toFixed(2) + "%)" , null);
		} else { // histogram
			var barW = (value/binMax*classBarFigureW)*.65;  //scale bars to fit page
			doc.rect(leftOff + threshMaxLen, bartop, barW, barHeight, "FD"); // make the histo bar
			doc.setFontSize(classBarLegendTextSize);
			doc.text(leftOff + threshMaxLen +barW + 5, bartop + classBarLegendTextSize, "n = " + value + " (" + (value/total*100).toFixed(2) + "%)" , null);
		}
		missingCount -= value; 
		bartop+=barHeight; // adjust top position for the next bar
		// Draw missing values bar IF missing values > 0
		missingCount = Math.max(0,nan); // just in case missingCount goes negative...
		if (missingCount > 0) {
			foundMissing = 1;
			var rgb = colorMap.getColor("Missing");
			doc.setFillColor(rgb.r,rgb.g,rgb.b);
			doc.setDrawColor(0,0,0);
			var barW = missingCount/binMax*classBarFigureW;
			if (condenseClassBars) {
				barW = 10;
			}
			doc.rect(leftOff + threshMaxLen, bartop, barW, barHeight, "FD");
			doc.setFontSize(classBarLegendTextSize);
			doc.text(leftOff + threshMaxLen - doc.getStringUnitWidth("Missing Value")*classBarLegendTextSize - 4, bartop + classBarLegendTextSize, "Missing Value" , null);
			doc.text(leftOff + threshMaxLen +barW + 5, bartop + classBarLegendTextSize, "n = " + missingCount + " (" + (missingCount/total*100).toFixed(2) + "%)" , null);
		}
		var foundMissing = 0;
		setClassBarFigureH(10,'discrete',false);   
	}
	
	/**********************************************************************************
	 * FUNCTION:  drawRowClassLegends - This function draws the legend blocks for each
	 * row covariate bar on the heat map to the PDF legends page.
	 **********************************************************************************/
	function drawRowClassLegends() {
		sectionHeader = "Target Covariate Bar Legends"  
		if (rowBarsToDraw.length > 0){
			leftOff = 20; // ...reset leftOff...
			topSkip  = classBarFigureH + classBarHeaderSize + classBarTitleSize + 20; // return class bar height to original value in case it got changed in this row
			topOff += topSkip; // ... and move the next figure to the line below
			classBarFigureH = 0;   
			topOff += classBarTitleSize + 5;
			for (var i = 0; i < rowBarsToDraw.length;i++){
				var key = rowBarsToDraw[i];
				var colorMap = NgChm.heatMap.getColorMapManager().getColorMap("row", key);
				doc.setFontSize(classBarTitleSize);
				var isDiscrete = rowClassBarConfig[key].color_map.type === 'discrete';
				var colorCount = 10;
				if (isDiscrete) {
					colorCount = rowClassBarConfig[key].color_map.colors.length;
				}
				if (i === 0) {
					drawLegendSubSectionHeader(sectionHeader, colorCount, key);
				}
				if (isDiscrete) {
					getBarGraphForDiscreteClassBar(key, 'row'); 
				} else {
					getBarGraphForContinuousClassBar(key, 'row');
				}
			}
		}
	}
	
	/**********************************************************************************
	 * FUNCTION:  drawColClassLegends - This function draws the legend blocks for each
	 * column covariate bar on the heat map to the PDF legends page.
	 **********************************************************************************/
	function drawColClassLegends() {
		sectionHeader = "Sample Covariate Bar Legends"
		// Draw column class bar legends
		if (colBarsToDraw.length > 0){
			topSkip  = classBarFigureH + classBarHeaderSize + classBarTitleSize + 20; // return class bar height to original value in case it got changed in this row
			topOff += topSkip; // ... and move the next figure to the line below
			classBarFigureH = 0;   
			topOff += classBarTitleSize + 5;
			for (var i = 0; i < colBarsToDraw.length;i++){
				var key = colBarsToDraw[i];
				doc.setFontSize(classBarTitleSize);
				var colorCount = 10;
				var isDiscrete = colClassBarConfig[key].color_map.type === 'discrete';
				if (isDiscrete) {
					colorCount = colClassBarConfig[key].color_map.colors.length;
				}
				if (i === 0) {
					drawLegendSubSectionHeader(sectionHeader, colorCount, key);
				}
				if (isDiscrete) {
					getBarGraphForDiscreteClassBar(key, 'col');
				} else {
					getBarGraphForContinuousClassBar(key, 'col');
				}
			}
		}
	}
	
	/**********************************************************************************
	 * FUNCTION:  drawLegendSubSectionHeader - This function draws bolded sub-section
	 * header on the legend page(s).  If the next group of legends breaks across a 
	 * page boundary, a new page is created.
	 **********************************************************************************/
    function drawLegendSubSectionHeader(headerText, categories, key) {
    	var truncTitle = key.length > 40 ? key.substring(0,40) + "..." : key;
		var splitTitle = doc.splitTextToSize(truncTitle, classBarFigureW);
		//Adjustment for multi-line covariate headers
		if(splitTitle.length > 1) {
			classBarHeaderHeight = (classBarHeaderSize*splitTitle.length)+(4*splitTitle.length)+10;   
		}
    	if ((topOff + classBarHeaderHeight + (categories*13) > pageHeight)) {
    		doc.addPage(); // ... make a new page and reset topOff
    		createHeader(theFont, null, sectionHeader);
    		topOff = paddingTop + 15;
    	} else {
			doc.setFontSize(classBarHeaderSize);
			doc.setFontType("bold");
			doc.text(10, topOff, sectionHeader , null);
    	}
		doc.setFontSize(classBarTitleSize);
		doc.setFontType("normal");
		topOff += classBarTitleSize + 5;
		leftOff = 20; // ...reset leftOff...
    }

	/**********************************************************************************
	 * FUNCTION - getBarGraphForDiscreteClassBar: This functiio places the classBar legend 
	 * using the variables leftOff and topOff, which are updated after every classBar legend.
	 * inputs: classBar object, colorMap object, and string for name
	 **********************************************************************************/
	function getBarGraphForDiscreteClassBar(key, type){
		var barScale = isChecked("pdfInputPortrait") ? .50 : .65;
		var foundMissing = 0;
    	var truncTitle = key.length > 40 ? key.substring(0,40) + "..." : key;
		var splitTitle = doc.splitTextToSize(truncTitle, classBarFigureW);
		if (covTitleRows === 1) {
			covTitleRows = splitTitle.length;
		}
		var bartop = topOff+5 + (splitTitle.length-1)*classBarLegendTextSize*2;
		var colorMap = NgChm.heatMap.getColorMapManager().getColorMap(type, key);
		var thresholds = colorMap.getThresholds();
		if (isChecked("pdfInputPortrait") && (thresholds.length > 56)) {
			doc.setFontType("bold");
		    doc.text(leftOff, topOff, splitTitle);
			doc.setFontType("normal");
			doc.text(leftOff + 15, bartop + classBarLegendTextSize, "This discrete covariate bar contains too", null);
			doc.text(leftOff +15, bartop + classBarLegendTextSize+12, "many categories to print.", null);
			setClassBarFigureH(2,'discrete',0);   
		} else if (isChecked("pdfInputLandscape") && (thresholds.length > 40)) {
			doc.setFontType("bold");
		    doc.text(leftOff, topOff, splitTitle);
			doc.setFontType("normal");
			doc.text(leftOff +15, bartop + classBarLegendTextSize,    "This discrete covariate bar contains too", null);
			doc.text(leftOff +15, bartop + classBarLegendTextSize+12, "many categories to print. You may try", null);
			doc.text(leftOff +15, bartop + classBarLegendTextSize+24, "printing in portrait mode.", null);
			setClassBarFigureH(3,'discrete',0);   
		} else {
			//Adjustment for multi-line covariate headers
			if(splitTitle.length > 1) {
				classBarHeaderHeight = (classBarHeaderSize*splitTitle.length)+(4*splitTitle.length)+10;  
			}
			if ((topOff + classBarHeaderHeight + (thresholds.length*13) > pageHeight) && !isLastClassBarToBeDrawn(key,type)) {
				doc.addPage(); // ... make a new page and reset topOff
				createHeader(theFont, null, sectionHeader + " (continued)");
				topOff = paddingTop + 15;
				leftOff = 20; // ...reset leftOff...
			}  
			bartop = topOff+5 + (splitTitle.length - 1)*(classBarLegendTextSize*2);
			//Adjustment for multi-line covariate headers
			if(splitTitle.length > 1) {
				classBarHeaderHeight = (classBarHeaderSize*splitTitle.length)+(4*splitTitle.length)+10;  
			}
			doc.setFontType("bold");
		    doc.text(leftOff, topOff, splitTitle);
			doc.setFontType("normal");
		    
			var classBarConfig = rowClassBarConfig[key];
			var classBarData = rowClassBarData[key];
			if (type !== 'row') {
				classBarConfig = colClassBarConfig[key];
				classBarData = colClassBarData[key];
			}
			var barHeight = classBarLegendTextSize + 3;
            var counts = {}, maxCount = 0;
		    var maxLabelLength = doc.getStringUnitWidth("XXXXXXXXXXXXXXXX")*classBarLegendTextSize;
			// get the number N in each threshold
			var cutValues = 0;
			for(var i = 0; i< classBarData.values.length; i++) {
			    var num = classBarData.values[i];
			    if (num !== '!CUT!') {
			    	counts[num] = counts[num] ? counts[num]+1 : 1;
			    } else {
			    	cutValues++;
			    }
			}
			for (var val in counts){
				maxCount = Math.max(maxCount, counts[val]);
				maxLabelLength = Math.max(maxLabelLength, doc.getStringUnitWidth(val,classBarLegendTextSize)*classBarLegendTextSize);
			}
				
			// NOTE: missingCount will contain all elements that are not accounted for in the thresholds
			// ie: thresholds = [type1, type2, type3], typeX will get included in the missingCount
			var missingCount = classBarData.values.length-cutValues;
			// Get maximum length of threshhold title for use in separating counts from title
			var threshMaxLen = getThreshMaxLength(thresholds,classBarLegendTextSize);
			// Indent threshholds from class bar title
			leftOff += 10;
			// draw the bars
			for (var j = 0; j < thresholds.length; j++){ // make a gradient stop (and also a bucket for continuous)
				var rgb = colorMap.getClassificationColor(thresholds[j]);
				doc.setFillColor(rgb.r,rgb.g,rgb.b);
				doc.setDrawColor(0,0,0);
				var count = counts[thresholds[j]] ? counts[thresholds[j]] : 0;
				if (condenseClassBars){
					var barW = 10;
					doc.rect(leftOff, bartop, barW, barHeight, "FD");
					doc.setFontSize(classBarLegendTextSize);
					doc.text(leftOff +barW + 5, bartop + classBarLegendTextSize, thresholds[j].toString(), null);
					doc.text(leftOff +barW + threshMaxLen + 10, bartop + classBarLegendTextSize, "n = " + count + " (" + (count/classBarData.values.length*100).toFixed(2) + "%)", null);
				} else {
					var barW = (count/maxCount*classBarFigureW)*barScale;  //scale bars to fit page
					doc.rect(leftOff + maxLabelLength, bartop, barW, barHeight, "FD");
					doc.setFontSize(classBarLegendTextSize);
					doc.text(leftOff + maxLabelLength - doc.getStringUnitWidth(thresholds[j].toString())*classBarLegendTextSize - 4, bartop + classBarLegendTextSize, thresholds[j].toString() , null);
					doc.text(leftOff + maxLabelLength +barW + 5, bartop + classBarLegendTextSize, "n = " + count + " (" + (count/classBarData.values.length*100).toFixed(2) + "%)" , null);
				
				
				}
				missingCount -= count;
				bartop+=barHeight;
			}
			// Draw missing values bar IF missing values > 0
			missingCount = Math.max(0,missingCount); // just in case missingCount goes negative...
			if (missingCount > 0) {
				foundMissing = 1;
				var rgb = colorMap.getClassificationColor("Missing Value");
				doc.setFillColor(rgb.r,rgb.g,rgb.b);
				doc.setDrawColor(0,0,0);
				drawMissingColor(bartop, barHeight, missingCount, maxCount, maxLabelLength, threshMaxLen, classBarData.values.length);
			}
			
			if (thresholds.length * barHeight > classBarFigureH){ // in case a discrete classbar has over 15 categories, make the topOff increment bigger
				topSkip = (thresholds.length+1) * barHeight+classBarHeaderSize;
			}
			setClassBarFigureH(thresholds.length,'discrete',foundMissing);   
		}
		// adjust the location for the next class bar figure
		adjustForNextClassBar(key,type,maxLabelLength);
	}

	/**********************************************************************************
	 * FUNCTION - getBarGraphForContinousClassBar: This function places the classBar 
	 * legend using the variables leftOff and topOff, which are updated after every 
	 * classBar legend. inputs: classBar object, colorMap object, and string for name
	 **********************************************************************************/
	function getBarGraphForContinuousClassBar(key, type){
		var barScale = isChecked("pdfInputPortrait") ? .50 : .65;
		var foundMissing = 0;
		// Write class bar name to PDF
		var splitTitle = doc.splitTextToSize(key, classBarFigureW);
		if (covTitleRows === 1) {
			covTitleRows = splitTitle.length;
		}
		//Adjustment for multi-line covariate headers
		if(splitTitle.length > 1) {
			classBarHeaderHeight = (classBarHeaderSize*splitTitle.length)+(4*splitTitle.length)+10;   
		}
		if ((topOff + classBarHeaderHeight + 130) > pageHeight) {
			doc.addPage(); // ... make a new page and reset topOff
			createHeader(theFont, null, sectionHeader + " (continued)");
			topOff = paddingTop + 15;
			leftOff = 20; // ...reset leftOff...
		}  
		doc.setFontType("bold");
		doc.text(leftOff, topOff, splitTitle);
		doc.setFontType("normal");
		var classBars = NgChm.heatMap.getColClassificationConfig();
		if (type === 'row') {
			classBars = NgChm.heatMap.getRowClassificationConfig();
		}
		var classBar = classBars[key];
		//Adjustment for multi-line covariate headers
//		if(splitTitle.length > 1) {
//			classBarHeaderHeight = (classBarHeaderSize*splitTitle.length)+(4*splitTitle.length)+10;   
//		}
		var colorMap = NgChm.heatMap.getColorMapManager().getColorMap(type, key);
		var classBarConfig = rowClassBarConfig[key];
		var classBarData = rowClassBarData[key];
		if (type !== 'row') {
			classBarConfig = colClassBarConfig[key];
			classBarData = colClassBarData[key];
		}

		// For Continuous Classifications: 
    	// 1. Retrieve continuous threshold array from colorMapManager
    	// 2. Retrieve threshold range size divided by 2 (1/2 range size)
    	// 3. If remainder of half range > .75 set threshold value up to next value, Else use floor value.
		var thresholds = colorMap.getContinuousThresholdKeys();
		var threshSize = colorMap.getContinuousThresholdKeySize()/2;
		var thresholdSize;
		if ((threshSize%1) > .5) {
			// Used to calculate modified threshold size for all but first and last threshold
			// This modified value will be used for color and display later.
			thresholdSize = Math.floor(threshSize)+1;
		} else {
			thresholdSize = Math.floor(threshSize);
		}
		var barHeight = classBarLegendTextSize + 3;

		// get the number N in each threshold
		var counts = {};
		var maxCount = 0;
		var maxLabelLength = doc.getStringUnitWidth("XXXXXXXXXXXXXXXX")*classBarLegendTextSize;

		// get the continuous thresholds and find the counts for each bucket
		var cutValues = 0;
		for(var i = 0; i < classBarData.values.length; i++) {
		    var num = parseFloat(classBarData.values[i]);
		    if (classBarData.values[i] !== '!CUT!') {
		    	var prevThresh = 0;
			    for (var k = 0; k < thresholds.length; k++){
					var thresh = thresholds[k];
					if (k == 0 && num <= thresholds[k]){
						counts[k] = counts[k] ? counts[k]+1 : 1;
						break;
					} else if (k == thresholds.length-2 && ((num < thresh) && (num > prevThresh))) {
						counts[k] = counts[k] ? counts[k]+1 : 1;
						break;
					} else if (k == thresholds.length-1) {
						if (num >= thresholds[thresholds.length-1]) {
							counts[k] = counts[k] ? counts[k]+1 : 1;
						}
						break;
					} else if ((k < thresholds.length-2) && ((num <= thresh) && (num > prevThresh))) {
						counts[k] = counts[k] ? counts[k]+1 : 1;
						break;
					}
					prevThresh = thresh;
				}
		    } else {
		    	cutValues++;
		    }
		}

		// find the longest label length
		for (var val in counts){
			maxCount = Math.max(maxCount, counts[val]);
			maxLabelLength = Math.max(maxLabelLength, doc.getStringUnitWidth(val.length)*classBarLegendTextSize);
		}
		
		var bartop = topOff+5 + (splitTitle.length-1)*classBarLegendTextSize*2;
		var missingCount = classBarData.values.length - cutValues; // start at total number of labels and work down
		var value;
		// Get maximum length of threshhold title for use in separating counts from title
		var threshMaxLen = getThreshMaxLength(thresholds,classBarLegendTextSize);
		// Indent threshholds from class bar title
		leftOff += 10;
		for (var j = 0; j < thresholds.length; j++){
			var rgb = colorMap.getClassificationColor(thresholds[j]);
			if (classBar.bar_type !== 'color_plot') {
				rgb = colorMap.getClassificationColor(thresholds[thresholds.length-1]);
			}
			doc.setFillColor(rgb.r,rgb.g,rgb.b);
			doc.setDrawColor(0,0,0);
			let value = counts[j];
			if (isNaN(value) || value == undefined){
				value = 0;
			}
			var valLabel = thresholds[j].toString();
			if ((j !== 0) && (j !== thresholds.length-1)) {
				valLabel = (thresholds[j] - thresholdSize).toString();
			}
			var decimalVal = 4; // go out to 3 decimal places
			if (valLabel.indexOf(".") > 0){
				valLabel = valLabel.substring(0, valLabel.indexOf(".") + decimalVal);
			}
			if (condenseClassBars){ // square
				var barW = 10;
				doc.rect(leftOff, bartop, barW, barHeight, "FD"); // make the square
				doc.setFontSize(classBarLegendTextSize);
				doc.text(leftOff +barW + 5, bartop + classBarLegendTextSize, valLabel, null);
				doc.text(leftOff +barW + threshMaxLen + 10, bartop + classBarLegendTextSize, "n = " + value + " (" + (value/classBarData.values.length*100).toFixed(2) + "%)" , null);
			} else { // histogram
				var barW = (value/maxCount*classBarFigureW)*barScale;  //scale bars to fit page
				doc.rect(leftOff + maxLabelLength, bartop, barW, barHeight, "FD"); // make the histo bar
				doc.setFontSize(classBarLegendTextSize);
				doc.text(leftOff + maxLabelLength - doc.getStringUnitWidth(valLabel)*classBarLegendTextSize - 4, bartop + classBarLegendTextSize, valLabel , null);
				doc.text(leftOff + maxLabelLength +barW + 5, bartop + classBarLegendTextSize, "n = " + value + " (" + (value/classBarData.values.length*100).toFixed(2) + "%)"  , null);
			}
			missingCount -= value; 
			bartop+=barHeight; // adjust top position for the next bar
		}
		// Draw missing values bar IF missing values > 0
		missingCount = Math.max(0,missingCount); // just in case missingCount goes negative...
		if (missingCount > 0) {
			foundMissing = 1;
			var rgb = colorMap.getClassificationColor("Missing Value");
			doc.setFillColor(rgb.r,rgb.g,rgb.b);
			doc.setDrawColor(0,0,0);
			drawMissingColor(bartop, barHeight, missingCount, maxCount, maxLabelLength, threshMaxLen, classBarData.values.length);
		}
		setClassBarFigureH(0,'continuous',foundMissing);   
		adjustForNextClassBar(key,type,maxLabelLength);
	}

	
}
