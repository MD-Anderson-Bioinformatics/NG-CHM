//Define Namespace for NgChm PdfGenerator
NgChm.createNS('NgChm.PDF');

NgChm.PDF.rowDendoWidth = null;
NgChm.PDF.rowDendroHeight = null;
NgChm.PDF.colDendroWidth = null;
NgChm.PDF.colDendroHeight = null;
NgChm.PDF.customFont = false;
NgChm.PDF.isWidget = false;
NgChm.PDF.mdaLogo = "data:image/png;base64,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";
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
	var header = document.getElementById('mdaLogo');
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
			doc.addImage(NgChm.PDF.mdaLogo, 'PNG',5,5,header.clientWidth,header.clientHeight);
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
			doc.text(150, headerHeight - 10, fullTitle, null);
			doc.setFontType("bold");
			doc.setFillColor(255,0,0);
			doc.setDrawColor(255,0,0);
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
				if (NgChm.DET.labelIndexInSearch(mapItem.currentRow+i,"Row")) {
					doc.setFillColor(selectedColor.r, selectedColor.g, selectedColor.b);
					doc.rect((label.offsetLeft-mapItem.canvas.offsetLeft)/detClient2PdfWRatio+rowDendroWidth+paddingLeft, (label.offsetTop-mapItem.canvas.offsetTop)/detClient2PdfHRatio+paddingTop+colDendroHeight, longestRowLabelUnits+2, theFont,'F');
				}
				rowLabels++;
			} else if (label.dataset.axis == "Column") {
				if (NgChm.DET.labelIndexInSearch(mapItem.currentCol+i-rowLabels,"Column")) {
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
		sectionHeader = "Row Covariate Bar Legends"  
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
		sectionHeader = "Column Covariate Bar Legends"
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
