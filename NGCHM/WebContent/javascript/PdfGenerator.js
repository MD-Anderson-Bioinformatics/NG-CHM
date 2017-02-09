//Define Namespace for NgChm PdfGenerator
NgChm.createNS('NgChm.PDF');

NgChm.PDF.boxCanvasWidth;
NgChm.PDF.boxCanvasHeight;
NgChm.PDF.colDendroWidth;
NgChm.PDF.colDendroHeight;
NgChm.PDF.rowDendoWidth;
NgChm.PDF.rowDendroHeight;

/**********************************************************************************
 * FUNCTION - openPdfPrefs: This function is called when the user clicks the pdf
 * button on the menu bar.  The PDF preferences panel is then launched
 **********************************************************************************/
NgChm.PDF.openPdfPrefs = function(e) {
	maxRows = 0;
	NgChm.UHM.userHelpClose();
	var prefspanel = document.getElementById('pdfPrefsPanel');
	//Add prefspanel table to the main preferences DIV and set position and display
	prefspanel.style.top = e.offsetTop + 15;
	prefspanel.style.display="inherit";
	prefspanel.style.left = e.getBoundingClientRect().left - prefspanel.clientWidth;
}

/**********************************************************************************
 * FUNCTION - getPDF: This function is called when the "create pdf" button is pressed.
 * It will check the checkboxes/radio buttons to see how the PDF is to be created using
 * the isChecked function. for a full list of jsPDF functions, visit here:
 * https://mrrio.github.io/jsPDF/doc/symbols/jsPDF.html#setLineCap
 **********************************************************************************/
NgChm.PDF.getPDF = function() {

	// close the PDF menu when you download
	NgChm.PDF.pdfCancelButton();	
	

	var mapsToShow = isChecked("pdfInputSummaryMap") ? "S" : isChecked("pdfInputDetailMap") ? "D" : "B";
	var doc = isChecked("pdfInputPortrait") ? new jsPDF("p","pt",[792,612]) :new jsPDF("l","pt",[792,612]); // landscape or portrait?
	doc.setFont("helvetica");

	var pageHeight = doc.internal.pageSize.height;
	var pageWidth = doc.internal.pageSize.width;
	var rowDendroConfig = NgChm.heatMap.getRowDendroConfig();
	var colDendroConfig = NgChm.heatMap.getColDendroConfig();
	
	// Convert longest label units to actual length (11 is the max font size of the labels)
	// these will be the bottom and left padding space for the detail Heat Map
	var allLabels = document.getElementsByClassName("DynamicLabel");
	var longestRowLabelUnits = 1, longestColLabelUnits = 1;
	for (var i = 0; i < allLabels.length; i++){ // go through all the labels and find the one that takes the most space
		var label = allLabels[i];
		if (label.getAttribute('axis') == "Row" || label.getAttribute('axis') == "ColumnCovar"){
			longestRowLabelUnits = Math.max(doc.getStringUnitWidth(label.innerHTML),longestRowLabelUnits);
		} else {
			longestColLabelUnits = Math.max(doc.getStringUnitWidth(label.innerHTML),longestColLabelUnits);
		}
	} 
	longestColLabelUnits *= 11; //Set initially to maximum font sizing for rough page sizing
	longestRowLabelUnits *= 11;
	
	// Header
	var headerCanvas = document.createElement('CANVAS'); // Load the MDAnderson logo into a canvas, since you can't load an img directly
	var headerCtx = headerCanvas.getContext('2d'); 
	var header = document.getElementsByClassName('mdaServiceHeaderLogo')[0];
	headerCanvas.height = 108; // Logo png's actual dimensions
	headerCanvas.width = 262;
	headerCtx.drawImage(header.children[0].children[0], 0, 0);
	var headerData = headerCanvas.toDataURL('image/png');
	var headerHeight = header.clientHeight + 5;
	
	var rowDendroScale = parseInt(NgChm.heatMap.getRowDendroConfig().height)/100;
	var colDendroScale = parseInt(NgChm.heatMap.getColDendroConfig().height)/100;

	// These are the variables that we will be using repeatedly to place items
	var paddingLeft = 10;
	var paddingTop = headerHeight+15; 
	var detImgH = pageHeight - paddingTop - longestColLabelUnits;
	var detImgW = pageWidth - longestRowLabelUnits - 2*paddingLeft;
	var sumImgW = pageWidth - 2*paddingLeft  //width of available space for heatmap, class bars, and dendro
	var sumImgH = pageHeight - paddingTop - paddingLeft; //height of available space for heatmap, class bars, and dendro
	var detImgL = paddingLeft;
	var rowDendroWidth = (sumImgW/5)*rowDendroScale;
	var colDendroHeight = (sumImgH/5)*colDendroScale;
	var rowDendroPctg = 1 - (rowDendroWidth/sumImgW);
	var colDendroPctg = 1 - (colDendroHeight/sumImgH);
	var sumMapH = sumImgH*colDendroPctg; //width of summary heatmap (and class bars)
	var sumMapW = sumImgW*rowDendroPctg; //height of summary heatmap (and class bars)
	var colClassHeight = sumMapH*(NgChm.SUM.totalHeight-NgChm.SUM.matrixHeight)/NgChm.SUM.totalHeight;
	var rowClassWidth = sumMapW*(NgChm.SUM.totalWidth-NgChm.SUM.matrixWidth)/NgChm.SUM.totalWidth;

	// Create and set the fontSize using the minimum of the calculated sizes for row and column labels
	// Calculate the font size for rows and columns. Take the lowest of the two.  If the result is greater than 11 set the font to 11.  If the result is less than 6 set the font to 6.
	var preFont = Math.min(Math.min((detImgH - colDendroHeight - colClassHeight) /  NgChm.SEL.dataPerCol, 11), Math.min((detImgW - rowDendroWidth - rowClassWidth) /  NgChm.SEL.dataPerRow, 11));
	var colLabelAdj = 0
	if (preFont < 4) { colLabelAdj = 3.5; } //offset tweak for column label placement when labels are very small
	var theFont = Math.max(Math.min(Math.min((detImgH - colDendroHeight - colClassHeight) /  NgChm.SEL.dataPerCol, 11), Math.min((detImgW - rowDendroWidth - rowClassWidth) /  NgChm.SEL.dataPerRow, 11)),6);
	
	var colclassctr = NgChm.heatMap.getColClassificationOrder("show").length
	var theClassFont = Math.floor((colClassHeight-(colclassctr-2))/colclassctr);
	theFont = Math.min(theFont,theClassFont);
	doc.setFontSize(theFont);
	
	// Reset "longest label units" using newly calculated font
	longestColLabelUnits = (longestColLabelUnits/11)*theFont;  
	longestRowLabelUnits = (longestRowLabelUnits/11)*theFont;
	detImgH = pageHeight - paddingTop - longestColLabelUnits - 10;
	detImgW = pageWidth - longestRowLabelUnits - 2*paddingLeft - 5;
	
	// Scale canvases for PDF page size and Redraw because otherwise they can show up blank
	resizeCanvas(sumMapW, sumMapH, rowDendroWidth, colDendroHeight);
	NgChm.SEL.updateSelection(); 
	
	
	//Dimensions of summary canvas are sometimes a poor match for the size it will be in the PDF.
	//Create a temporary canvas matching the PDF summary image dimensions, turn off image smoothing
	//and copy the current summary canvas to the temporary one.  This will resize the image without
	//smoothing to the target size so the PDF viewer will not need to stretch/compress the image
	//much.  Prevents blurry summary on some heat maps.
	var tmpCan = document.createElement('canvas');
	tmpCan.width = sumMapW;
	tmpCan.height = sumMapH;
	var destCtx = tmpCan.getContext("2d");
	destCtx.mozImageSmoothingEnabled = false;
	destCtx.imageSmoothingEnabled = false;
	destCtx.scale(sumMapW/NgChm.SUM.canvas.width,sumMapH/NgChm.SUM.canvas.height);
	destCtx.drawImage(NgChm.SUM.canvas,0,0);
	
	
	// Canvas elements need to be converted to DataUrl to be loaded into PDF
	var sumImgData = tmpCan.toDataURL('image/png');
	var sumRowDendroData = document.getElementById("row_dendro_canvas").toDataURL('image/png');
	var sumColDendroData = document.getElementById("column_dendro_canvas").toDataURL('image/png');
	var detImgData = NgChm.DET.canvas.toDataURL('image/png');
	var sumBoxImgData = NgChm.SUM.boxCanvas.toDataURL('image/png');
	var detBoxImgData = NgChm.DET.boxCanvas.toDataURL('image/png');

	//Put the canvases back the way we found them.
	restoreCanvas();
	NgChm.SEL.updateSelection();

	// Create first page header
	createHeader(theFont);
	
	// Draw the heat map images (based upon user parameter selections)
	if (mapsToShow == "D") {
		doc.addImage(detImgData, 'PNG', paddingLeft, paddingTop, detImgW,detImgH);
		doc.addImage(detBoxImgData, 'PNG', paddingLeft, paddingTop, detImgW,detImgH);
	} else {
		var rowDendroLeft = paddingLeft;
		var imgLeft = paddingLeft+rowDendroWidth;
		var colDendroTop = paddingTop;
		var imgTop = paddingTop+colDendroHeight;
		if (rowDendroConfig.show === 'NONE') {
			imgLeft = paddingLeft;
		} else {
			doc.addImage(sumRowDendroData, 'PNG', rowDendroLeft, imgTop+colClassHeight, rowDendroWidth, sumMapH*NgChm.SUM.matrixHeight/NgChm.SUM.totalHeight);
		}
		if (colDendroConfig.show === 'NONE') {
			imgTop = paddingTop;
		} else {
			doc.addImage(sumColDendroData, 'PNG', imgLeft+rowClassWidth, colDendroTop, sumMapW*NgChm.SUM.matrixWidth/NgChm.SUM.totalWidth,colDendroHeight);
		}
		doc.addImage(sumImgData, 'PNG', imgLeft, imgTop, sumMapW,sumMapH);
		// If showing both sum and det, add the box to the summary image, add a page, print the header, and add the detail image to the PDF
		if (mapsToShow === 'B') {
			doc.addImage(sumBoxImgData, 'PNG', imgLeft, imgTop, sumMapW,sumMapH);
			doc.addPage();
			createHeader(theFont);
			doc.addImage(detImgData, 'PNG', detImgL, paddingTop, detImgW,detImgH);
			doc.addImage(detBoxImgData, 'PNG', detImgL, paddingTop, detImgW,detImgH);
		} else {
			NgChm.SUM.resetBoxCanvas();
			sumBoxImgData = NgChm.SUM.boxCanvas.toDataURL('image/png');
			doc.addImage(sumBoxImgData, 'PNG', imgLeft, imgTop, sumMapW,sumMapH);
			NgChm.SUM.drawLeftCanvasBox();
		}
	}

	// Add row and column labels to the PDF
	if (mapsToShow !== "S"){
		var detClient2PdfWRatio = NgChm.DET.canvas.clientWidth/detImgW;  // scale factor to place the labels in their proper locations
		var detClient2PdfHRatio = NgChm.DET.canvas.clientHeight/detImgH;
		var headerSize = 0;
		var colHeight = NgChm.DET.calculateTotalClassBarHeight("column") + NgChm.DET.dendroHeight;
		if (colHeight > 0) {
			headerSize += detImgH * (colHeight / (NgChm.DET.dataViewHeight + colHeight));
		}
		// Get selection color for current datalayer to be used in highlighting selected labels
		var dataLayers = NgChm.heatMap.getDataLayers();
		var colorMap = NgChm.heatMap.getColorMapManager().getColorMap("data",NgChm.SEL.currentDl);
		var layer = dataLayers[NgChm.SEL.currentDl];
		var selectedColor = colorMap.getHexToRgba(layer.selection_color);
		var rowLabels = 0;

		// Draw row selection boxes first (this way they will not overlap text)
		for (var i = 0; i < allLabels.length; i++){
			var label = allLabels[i];
			if (label.getAttribute("axis") == "Row"){
				if (NgChm.DET.labelIndexInSearch(NgChm.SEL.currentRow+i,"Row")) {
					doc.setFillColor(selectedColor.r, selectedColor.g, selectedColor.b);
					doc.rect(label.offsetLeft/detClient2PdfWRatio+detImgL, label.offsetTop/detClient2PdfHRatio+paddingTop+1, longestRowLabelUnits+2, theFont+10,'F'); 
				} else {
					doc.setFillColor(255, 255, 255);
					doc.rect(label.offsetLeft/detClient2PdfWRatio+detImgL, label.offsetTop/detClient2PdfHRatio+paddingTop+1, longestRowLabelUnits+2, theFont+2,'F'); 
				}
				rowLabels++;
			}
		}
		// Draw row labels 
		for (var i = 0; i < allLabels.length; i++){
			var label = allLabels[i];
			if (label.getAttribute("axis") == "Row"){
				doc.text(label.offsetLeft/detClient2PdfWRatio+detImgL, label.offsetTop/detClient2PdfHRatio+paddingTop+theFont+.5, label.innerHTML);
			} else if (label.getAttribute("axis") == "ColumnCovar"){ // change font for class bars
				doc.text(label.offsetLeft/detClient2PdfWRatio+detImgL, label.offsetTop/detClient2PdfHRatio+paddingTop+theFont, label.innerHTML, null);
			}
		}
		// Draw column selection boxes first
		for (var i = 0; i < allLabels.length; i++){
			var label = allLabels[i];
			if (label.getAttribute("axis") == "Column"){
				if (NgChm.DET.labelIndexInSearch(NgChm.SEL.currentCol+i-rowLabels,"Column")) {
					doc.setFillColor(selectedColor.r, selectedColor.g, selectedColor.b);
					doc.rect((label.offsetLeft/detClient2PdfWRatio)-2.5, label.offsetTop/detClient2PdfHRatio+paddingTop,  theFont+2.5, longestColLabelUnits+2,'F'); 
				}
			}
		}
		// Draw column labels
		for (var i = 0; i < allLabels.length; i++){
			var label = allLabels[i];
			if (label.getAttribute("axis") == "Column"){
				doc.text((label.offsetLeft/detClient2PdfWRatio)+colLabelAdj, label.offsetTop/detClient2PdfHRatio+paddingTop, label.innerHTML, null, 270);
			} else if (label.getAttribute("axis") == "RowCovar"){
				doc.text(label.offsetLeft/detClient2PdfWRatio, label.offsetTop/detClient2PdfHRatio+paddingTop, label.innerHTML, null, 270);
			}
		}
	 
	}
	
	// Setup for class bar legends
	var classBarHeaderSize = 12; // these are font sizes
	var classBarHeaderHeight = classBarHeaderSize+10; 
	var classBarTitleSize = 10;
	var classBarLegendTextSize = 9;
	var classBarFigureW = 150; // figure dimensions, unless discrete with 15+ categories
	var classBarFigureH = 0;  
	var topSkip = classBarFigureH + classBarHeaderSize+10; 
	var condenseClassBars = isChecked('pdfInputCondensed');
	paddingLeft = 5;
	paddingTop = headerHeight+classBarHeaderSize + 10; // reset the top and left coordinates
	
	// Draw row class bar legends
	var rowClassBarData = NgChm.heatMap.getRowClassificationData();
	var colClassBarData = NgChm.heatMap.getColClassificationData();
	var rowClassBarConfig = NgChm.heatMap.getRowClassificationConfig();
	var colClassBarConfig = NgChm.heatMap.getColClassificationConfig();
	
	var rowBarsToDraw = [];
	var colBarsToDraw = [];
	if (isChecked('pdfInputColumn')) {
		colBarsToDraw = NgChm.heatMap.getColClassificationOrder("show");
	}
	if (isChecked('pdfInputRow')) {
		rowBarsToDraw = NgChm.heatMap.getRowClassificationOrder("show");
	}
	var topOff = paddingTop + classBarTitleSize + 5;
	var sectionHeader = "Row Covariate Bar Legends"
	if (rowBarsToDraw.length > 0){
		doc.addPage();
		createHeader(theFont);
		doc.setFontSize(classBarHeaderSize);
		doc.setFontType("bold");
		doc.text(10, paddingTop, sectionHeader , null);
		doc.setFontType("normal");
		var leftOff = 20;
		for (var i = 0; i < rowBarsToDraw.length;i++){
			var key = rowBarsToDraw[i];
			var colorMap = NgChm.heatMap.getColorMapManager().getColorMap("row", key);
			doc.setFontSize(classBarTitleSize);
			if (rowClassBarConfig[key].color_map.type === 'discrete') {
				getBarGraphForDiscreteClassBar(key, 'row'); 
			} else {
				getBarGraphForContinuousClassBar(key, 'row');
			}
		}
	}
	sectionHeader = "Column Covariate Bar Legends"
	// Draw column class bar legends
	if (colBarsToDraw.length > 0){
		if (rowBarsToDraw.length === 0){
			doc.addPage();
			createHeader(theFont);
			topOff = paddingTop;
		} else {
			leftOff = 20; // ...reset leftOff...
			topSkip  = classBarFigureH + classBarHeaderSize + 10; // return class bar height to original value in case it got changed in this row
			topOff += topSkip; // ... and move the next figure to the line below
		}
		doc.setFontSize(classBarHeaderSize);
		doc.setFontType("bold");
		doc.text(10, topOff, sectionHeader , null);
		doc.setFontType("normal");
		var leftOff=20;
		topOff += classBarTitleSize + 5;
		for (var i = 0; i < colBarsToDraw.length;i++){
			var key = colBarsToDraw[i];
			doc.setFontSize(classBarTitleSize);
			if (colClassBarConfig[key].color_map.type === 'discrete') {
				getBarGraphForDiscreteClassBar(key, 'col');
			} else {
				getBarGraphForContinuousClassBar(key, 'col');
			}
		}
	}
	NgChm.DET.canvas.focus();
	// TODO: in case there is an empty page after the class bar legends, delete it
	doc.save( NgChm.heatMap.getMapInformation().name + '.pdf');
	
	function setClassBarFigureH(threshCount, type, isMissing) {  
		var bars = 9; //Set bar default to continuous with 9 bars
		if (type === 'discrete') {
			bars = threshCount; //Set bars to threshold count 
		}
		bars += isMissing; // Add a bar if missing values exist
		var calcHeight = bars * 13; //number of bars multiplied by display height
		if (calcHeight > classBarFigureH) {
			classBarFigureH = calcHeight;
		}
	}
	
	//==================//
	// HELPER FUNCTIONS //
	//==================//
	
	// makes the MDAnderson logo, the HM name, and the red divider line at the top of each page
	function createHeader(theFont, contText) {
		doc.addImage(headerData, 'PNG',5,5,header.clientWidth,header.clientHeight);
		// Center Heat Map name in header whitespace to left of logo and step down the font if excessively long.
		if (NgChm.heatMap.getMapInformation().name.length > 60) {
			doc.setFontSize(10);
			doc.text(pageWidth/1.7 - doc.getStringUnitWidth(NgChm.heatMap.getMapInformation().name)*10/2, headerHeight - 10, NgChm.heatMap.getMapInformation().name, null);
		} else {
			doc.setFontSize(20);
			doc.text(pageWidth/1.7 - doc.getStringUnitWidth(NgChm.heatMap.getMapInformation().name)*20/2, headerHeight - 10, NgChm.heatMap.getMapInformation().name, null);
		}
		doc.setFontType("bold");
		doc.setFillColor(255,0,0);
		doc.setDrawColor(255,0,0);
		doc.rect(5, header.clientHeight+10, pageWidth-10, 2, "FD");
		doc.setFontSize(theFont);
		if (typeof contText !== 'undefined') {
			doc.setFontSize(classBarHeaderSize);
			doc.text(10, paddingTop, contText, null);
		}
		doc.setFontType("normal");
	}

	/**********************************************************************************
	 * FUNCTION - getBarGraphForDiscreteClassBar: places the classBar legend using the
	 * variables leftOff and topOff, which are updated after every classBar legend.
	 * inputs: classBar object, colorMap object, and string for name
	 **********************************************************************************/
	function getBarGraphForDiscreteClassBar(key, type){
		var foundMissing = 0;
		var splitTitle = doc.splitTextToSize(key, classBarFigureW);
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
			if ((topOff + (thresholds.length*13) > pageHeight) && !isLastClassBarToBeDrawn(key,type)) {
				doc.addPage(); // ... make a new page and reset topOff
				createHeader(theFont, sectionHeader + " (continued)");
				topOff = paddingTop + 15;
				leftOff = 20; // ...reset leftOff...
			}
			bartop = topOff+5 + (splitTitle.length - 1)*(classBarLegendTextSize*2);
			//Adjustment for multi-line covariate headers
			if(splitTitle.length > 1) {
				classBarHeaderHeight = (classBarHeaderSize*splitTitle.length)+(4*splitTitle.length)+10;  //TEST
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
			var barHeight = 12;
			var counts = {}, maxCount = 0, maxLabelLength = doc.getStringUnitWidth("Missing Value")*classBarLegendTextSize;
			// get the number N in each threshold
			for(var i = 0; i< classBarData.values.length; i++) {
			    var num = classBarData.values[i];
			    counts[num] = counts[num] ? counts[num]+1 : 1;
			}
			for (var val in counts){
				maxCount = Math.max(maxCount, counts[val]);
				maxLabelLength = Math.max(maxLabelLength, doc.getStringUnitWidth(val.length)*classBarLegendTextSize);
			}
				
			// NOTE: missingCount will contain all elements that are not accounted for in the thresholds
			// ie: thresholds = [type1, type2, type3], typeX will get included in the missingCount
			var missingCount = classBarData.values.length;
			// Get maximum length of threshhold title for use in separating counts from title
			var threshMaxLen = getThreshMaxLength(thresholds);
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
					doc.text(leftOff +barW + threshMaxLen + 10, bartop + classBarLegendTextSize, "n = " + count, null);
				} else {
					var barW = (count/maxCount*classBarFigureW)*.65;  //scale bars to fit page
					doc.rect(leftOff + maxLabelLength, bartop, barW, barHeight, "FD");
					doc.setFontSize(classBarLegendTextSize);
					doc.text(leftOff + maxLabelLength - doc.getStringUnitWidth(thresholds[j].toString())*classBarLegendTextSize - 4, bartop + classBarLegendTextSize, thresholds[j].toString() , null);
					doc.text(leftOff + maxLabelLength +barW + 5, bartop + classBarLegendTextSize, "n = " + count , null);
				
				
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
				drawMissingColor(bartop, barHeight, missingCount, maxCount, maxLabelLength, threshMaxLen);
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
	 * FUNCTION - getBarGraphForContinousClassBar: places the classBar legend using the
	 * variables leftOff and topOff, which are updated after every classBar legend.
	 * inputs: classBar object, colorMap object, and string for name
	 **********************************************************************************/
	function getBarGraphForContinuousClassBar(key, type){
		var foundMissing = 0;
		// Write class bar name to PDF
		var splitTitle = doc.splitTextToSize(key, classBarFigureW);
		doc.setFontType("bold");
		doc.text(leftOff, topOff, splitTitle);
		doc.setFontType("normal");

		//Adjustment for multi-line covariate headers
		if(splitTitle.length > 1) {
			classBarHeaderHeight = (classBarHeaderSize*splitTitle.length)+(4*splitTitle.length)+10;   
		}

		var colorMap = NgChm.heatMap.getColorMapManager().getColorMap(type, key);
		var classBarConfig = rowClassBarConfig[key];
		var classBarData = rowClassBarData[key];
		if (type !== 'row') {
			classBarConfig = colClassBarConfig[key];
			classBarData = colClassBarData[key];
		}
		var thresholds = colorMap.getContinuousThresholdKeys();
		var barHeight = 12;		

		// get the number N in each threshold
		var counts = {};
		var maxCount = 0;
		maxLabelLength = doc.getStringUnitWidth("Missing Value")*classBarLegendTextSize;

		// get the continuous thresholds and find the counts for each bucket
		for(var i = 0; i < classBarData.values.length; i++) {
		    var num = classBarData.values[i];
		    for (var k = 0; k < thresholds.length; k++){
				var thresh = thresholds[k];
				if (k == 0 && num < thresholds[k]){
					counts[thresh] = counts[thresh] ? counts[thresh]+1 : 1;
				} else if (k == thresholds.length-1 && num > thresholds[thresholds.length-1]){
					counts[thresh] = counts[thresh] ? counts[thresh]+1 : 1;
				} else if (num <= thresh){
					counts[thresh] = counts[thresh] ? counts[thresh]+1 : 1;
					break;
				}
			}
		}
		
		// find the longest label length
		for (var val in counts){
			maxCount = Math.max(maxCount, counts[val]);
			maxLabelLength = Math.max(maxLabelLength, doc.getStringUnitWidth(val.length)*classBarLegendTextSize);
		}
		
		var bartop = topOff+5 + (splitTitle.length-1)*classBarLegendTextSize*2;
		var missingCount = classBarData.values.length; // start at total number of labels and work down
		var value;
		// Get maximum length of threshhold title for use in separating counts from title
		var threshMaxLen = getThreshMaxLength(thresholds);
		// Indent threshholds from class bar title
		leftOff += 10;
		for (var j = 0; j < thresholds.length-1; j++){
			var rgb = colorMap.getClassificationColor(thresholds[j]);
			doc.setFillColor(rgb.r,rgb.g,rgb.b);
			doc.setDrawColor(0,0,0);
			value = counts[thresholds[j]];
			if (isNaN(value) || value == undefined){
				value = 0;
			}
			if (condenseClassBars){ // square
				var barW = 10;
				doc.rect(leftOff, bartop, barW, barHeight, "FD"); // make the square
				doc.setFontSize(classBarLegendTextSize);
				doc.text(leftOff +barW + 5, bartop + classBarLegendTextSize, thresholds[j].toString(), null);
				doc.text(leftOff +barW + threshMaxLen + 10, bartop + classBarLegendTextSize, "n = " + value , null);
			} else { // histogram
				var barW = (value/maxCount*classBarFigureW)*.65;  //scale bars to fit page
				doc.rect(leftOff + maxLabelLength, bartop, barW, barHeight, "FD"); // make the histo bar
				doc.setFontSize(classBarLegendTextSize);
				doc.text(leftOff + maxLabelLength - doc.getStringUnitWidth(thresholds[j].toString())*classBarLegendTextSize - 4, bartop + classBarLegendTextSize, thresholds[j].toString() , null);
				doc.text(leftOff + maxLabelLength +barW + 5, bartop + classBarLegendTextSize, "n = " + value , null);
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
			drawMissingColor(bartop, barHeight, missingCount, maxCount, maxLabelLength, threshMaxLen);
		}
		setClassBarFigureH(0,'continuous',foundMissing);   
		adjustForNextClassBar(key,type,maxLabelLength);
	}

	/**********************************************************************************
	 * FUNCTION - drawMissingColor: This function will set the missing color line for
	 * either type (row/col) of classification bar.
	 **********************************************************************************/
	function drawMissingColor(bartop, barHeight, missingCount, maxCount, maxLabelLength, threshMaxLen) {
		if (condenseClassBars){
			var barW = 10;
			doc.rect(leftOff, bartop, barW, barHeight, "FD");
			doc.setFontSize(classBarLegendTextSize);
			doc.text(leftOff +barW + 5, bartop + classBarLegendTextSize, "Missing Value", null);
			doc.text(leftOff +barW + threshMaxLen + 10, bartop + classBarLegendTextSize, "n = " + missingCount , null);
		} else {
			var barW = missingCount/maxCount*classBarFigureW;
			doc.rect(leftOff + maxLabelLength, bartop, barW, barHeight, "FD");
			doc.setFontSize(classBarLegendTextSize);
			doc.text(leftOff + maxLabelLength - doc.getStringUnitWidth("Missing Value")*classBarLegendTextSize - 4, bartop + classBarLegendTextSize, "Missing Value" , null);
			doc.text(leftOff + maxLabelLength +barW + 5, bartop + classBarLegendTextSize, "n = " + missingCount , null);
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
			topSkip  = classBarFigureH + classBarHeaderHeight; 
			topOff += topSkip; // ... and move the next figure to the line below
			classBarHeaderHeight = classBarHeaderSize+10; //reset this value
			if (topOff + classBarFigureH > pageHeight && !isLastClassBarToBeDrawn(key,type)){ // if the next class bar goes off the page vertically...
				doc.addPage(); // ... make a new page and reset topOff
				createHeader(theFont, sectionHeader + " (continued)");
				topOff = paddingTop + 15;
			}
			classBarFigureH = 0;   
		}
	}
	
	/**********************************************************************************
	 * FUNCTION - isChecked: This function will check the checkboxes/radio buttons to see 
	 * how the PDF is to be created. 
	 **********************************************************************************/
	function isChecked(el){
		if(document.getElementById(el))
		return document.getElementById(el).checked;
	}
	
	function getThreshMaxLength(thresholds) {
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
		threshMaxLen *= 6;
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
	
	/*
	 * The summary box canvas and summary dendro canvases are sized based on the size of the browser so 
	 * that the lines drawn in them are the correct width.  We are going to draw these canvases on a PDF
	 * page so temporarily resize these canvases to the correct size for a normal page.
	 */
	function resizeCanvas (sumMapW, sumMapH, rowDendroWidth, colDendroHeight) {
		//Save the current settings.
		NgChm.PDF.boxCanvasWidth = NgChm.SUM.boxCanvas.width;
		NgChm.PDF.boxCanvasHeight = NgChm.SUM.boxCanvas.height;
		NgChm.PDF.colDendroWidth = document.getElementById('column_dendro_canvas').width;
		NgChm.PDF.colDendroHeight = document.getElementById('column_dendro_canvas').height;
		NgChm.PDF.rowDendoWidth = document.getElementById('row_dendro_canvas').width;
		NgChm.PDF.rowDendroHeight = document.getElementById('row_dendro_canvas').height;
		NgChm.SUM.boxCanvas.width =  sumMapW;
		NgChm.SUM.boxCanvas.height = sumMapH;
		document.getElementById('column_dendro_canvas').width = sumMapW * (NgChm.SUM.matrixWidth/NgChm.SUM.totalWidth);
		document.getElementById('column_dendro_canvas').height = colDendroHeight;
		document.getElementById('row_dendro_canvas').width = rowDendroWidth;
		document.getElementById('row_dendro_canvas').height = sumMapH * (NgChm.SUM.matrixHeight/NgChm.SUM.totalHeight);
		NgChm.SUM.drawSummaryHeatMap();
		NgChm.SUM.colDendro.drawNoResize();
		NgChm.SUM.rowDendro.drawNoResize();
	}
	
	/*
	 * Put the box canvas and summary canvas back the way we found them.
	 */
	function restoreCanvas () {
		//Restore saved height/width settings and redraw.
		NgChm.SUM.boxCanvas.width =  NgChm.PDF.boxCanvasWidth;
		NgChm.SUM.boxCanvas.height = NgChm.PDF.boxCanvasHeight;
		document.getElementById('column_dendro_canvas').width = NgChm.PDF.colDendroWidth;
		document.getElementById('column_dendro_canvas').height = NgChm.PDF.colDendroHeight;
		document.getElementById('row_dendro_canvas').width = NgChm.PDF.rowDendoWidth;
		document.getElementById('row_dendro_canvas').height = NgChm.PDF.rowDendroHeight;
		NgChm.SUM.drawSummaryHeatMap();
		NgChm.SUM.colDendro.drawNoResize();
		NgChm.SUM.rowDendro.drawNoResize();
	}

}

/**********************************************************************************
 * FUNCTION - pdfCancelButton: This function closes the PDF preferences panel when
 * the user presses the cancel button.
 **********************************************************************************/
NgChm.PDF.pdfCancelButton = function() {
	var prefspanel = document.getElementById('pdfPrefsPanel');
	prefspanel.style.display = "none";
    NgChm.DET.canvas.focus();
}