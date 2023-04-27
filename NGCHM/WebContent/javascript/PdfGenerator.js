(function() {
    'use strict';
    NgChm.markFile();

    //Define Namespace for NgChm PdfGenerator
    const PDF = NgChm.createNS('NgChm.PDF');

    const UTIL = NgChm.importNS('NgChm.UTIL');
    const MAPREP = NgChm.importNS('NgChm.MAPREP');
    const MMGR = NgChm.importNS('NgChm.MMGR');
    const CMM = NgChm.importNS('NgChm.CMM');
    const UHM = NgChm.importNS('NgChm.UHM');
    const SUM = NgChm.importNS('NgChm.SUM');
    const DVW = NgChm.importNS('NgChm.DVW');
    const DET = NgChm.importNS('NgChm.DET');
    const DEV = NgChm.importNS('NgChm.DEV');
    const SRCHSTATE = NgChm.importNS('NgChm.SRCHSTATE');
    const PANE = NgChm.importNS('NgChm.Pane');

PDF.rowDendoWidth = null;
PDF.rowDendroHeight = null;
PDF.colDendroWidth = null;
PDF.colDendroHeight = null;
PDF.isWidget = false;
    var cancelPdfGeneration;

    PDF.ngchmLogo = null;
    (function () {
	// Obtain data URL for ngchmLogo.
	const ngchmLogo = document.getElementById ('ngchmLogo');
	if (ngchmLogo) {
	    fetch (ngchmLogo.src)
		.then ((res) => res.blob())
		.then ((blob) => {
		    const reader = new FileReader();
		    reader.onloadend = () => {
			PDF.ngchmLogo = reader.result;
		    };
		    reader.readAsDataURL (blob);
		});
	}
    })();

/**********************************************************************************
 * FUNCTION - openPdfPrefs: This function is called when the user clicks the pdf
 * button on the menu bar.  The PDF preferences panel is then launched
 **********************************************************************************/
PDF.canGeneratePdf = function() {
	return SUM.isVisible() || DVW.anyVisible();
};

PDF.pdfDialogClosed = function() {
	const prefspanel = document.getElementById('pdfPrefs');
	return prefspanel.classList.contains ('hide');
};

PDF.openPdfPrefs = function(e) {
	UHM.closeMenu();
	UHM.hlpC();
	const prefspanel = document.getElementById('pdfPrefs');
	if (e.classList.contains('disabled')) {
	    let whyDisabled = "Cannot open the PDF dialog since it's already open";
	    if (prefspanel.classList.contains('hide')) {
		whyDisabled = "Cannot generate a PDF when the Summary and all Detail heat map panels are closed.";
	    }
	    UHM.systemMessage("NG-CHM PDF Generator", whyDisabled);
	    return;
	}

	// Set maps to generate based on visible maps:
	const sumButton = document.getElementById ('pdfInputSummaryMap');
	const detButton = document.getElementById ('pdfInputDetailMap');
	const bothButton = document.getElementById ('pdfInputBothMaps');
	if (SUM.isVisible() && !DVW.anyVisible()) {
		sumButton.checked = true;
		sumButton.disabled = false;
		detButton.disabled = true;
		bothButton.disabled = true;
	} else if (DVW.anyVisible() && !SUM.isVisible()) {
		detButton.checked = true;
		sumButton.disabled = true;
		detButton.disabled = false;
		bothButton.disabled = true;
	} else if (SUM.isVisible() && DVW.anyVisible()) {
		bothButton.checked = true;
		sumButton.disabled = false;
		detButton.disabled = false;
		bothButton.disabled = false;
	} else {
		// Should not happen.
		UHM.systemMessage("NG-CHM PDF", "Cannot generate PDF: inconsistent visibility check");
		return;
	}
	updateShowBounds();
	document.getElementById('menuPdf').classList.add('disabled');
	let pdfPrefsHdr = document.getElementById("pdfPrefsHdr");
	if (pdfPrefsHdr.querySelector(".closeX")) { pdfPrefsHdr.querySelector(".closeX").remove(); }
	pdfPrefsHdr.appendChild(UHM.createCloseX(pdfCancelButton));
	var headerpanel = document.getElementById('mdaServiceHeader');
	//Add prefspanel table to the main preferences DIV and set position and display
	prefspanel.style.top = (headerpanel.offsetTop + 15) + 'px';
	prefspanel.classList.remove ('hide');
	prefspanel.style.left = ((window.innerWidth - prefspanel.offsetWidth) / 2) + 'px';
};

function updateShowBounds () {
    const bothButton = document.getElementById ('pdfInputBothMaps');
    const showBounds = document.getElementById ('pdfInputShowBounds');

    if (bothButton.checked) {
	showBounds.checked = true;
	showBounds.disabled = false;
    } else {
	showBounds.checked = false;
	showBounds.disabled = true;
    }
}

/**********************************************************************************
 * FUNCTION - pdfCancelButton: This function closes the PDF preferences panel when
 * the user presses the cancel button.
 **********************************************************************************/
    function pdfCancelButton () {
	document.getElementById ('pdfErrorMessage').style.display = 'none';
	document.getElementById('menuPdf').classList.remove('disabled');
	var prefspanel = document.getElementById('pdfPrefs');
	prefspanel.classList.add ('hide');
	document.body.style.cursor = 'default';
	if (DVW.primaryMap) DVW.primaryMap.canvas.focus();
};

    // Subtype of Error for issues that we detect.
    class PdfError extends Error {
	constructor (message) {
	    super (message);
	}
    }

    /**********************************************************************************
     * FUNCTION - getViewerHeatmapPDF: This function is called when the "create pdf" 
     * button is pressed. Its main job is to change the update the UI when starting
     * PDF generation and resetting it after PDF generation completes. It also initiates
     * saving of the complete PDF, if one is generated, and displaying an error message
     * dialog if an error occurred.
     **********************************************************************************/
    function getViewerHeatmapPDF (heatMap) {
	const debug = false;
	if (debug) console.log ('Called getViewerHeatmapPDF');
	// Change the cursor and disable the createPDF button
	// until PDF generation completes.
	document.body.style.cursor = 'wait';
	document.getElementById ('prefCreate_btn').disabled = true;
	cancelPdfGeneration = false;
	document.getElementById ('pdfProgressBarDiv').style.display = '';
	document.getElementById ('pdfProgressBar').value = 0;

	var removePdfDialog = true;

	generatePDF (heatMap)
	.then ((pdfDoc) => {
	    if (pdfDoc) {
		if (debug) console.log ('PDF generated');
		// Save the PDF document
		pdfDoc.doc.save( heatMap.getMapInformation().name + '.pdf');
	    }
	})
	.catch (error => {
	    // Show an appropriate error dialog to the user.
	    let message = error.message;
	    if (error instanceof PdfError) {
		if (message == '') {
		    // For PdfErrors with blank messages the user notification
		    // is made elsewhere.
		    removePdfDialog = false;
		    return;
		}
	    } else {
		console.error (error);
		const showResolutionHint = message == 'Invalid string length';
		message = "Unexpected error detected during PDF generation: " + message + ".";
		if (showResolutionHint) {
		    message += '<P>If this a large map, try using a smaller resolution (DPI).</P>';
		}
		message +=
		   `<P>Please consider making or contributing to a bug report on our
		    <A href='https://github.com/MD-Anderson-Bioinformatics/NG-CHM/issues?q=is%3Aissue+is%3Aopen+pdf+-label%3Aenhancement' target='_blank'>NG-CHM issues page</A>.
		    </P>`;
	    }
	    UHM.systemMessage("NG-CHM PDF Generator", message);
	})
	.finally(() => {
	    // PDF generation is complete:
	    // - Hide the PDF generation dialog.
	    // - Re-enable the PDF create button.
	    // - Reset the cursor to default
	    if (debug) console.log ('getViewerHeatmapPDF completed');
	    if (removePdfDialog) pdfCancelButton();
	    document.getElementById ('prefCreate_btn').disabled = false;
	    document.getElementById ('prefCancel_btn').disabled = false;
	    document.getElementById ('pdfProgressBarDiv').style.display = 'none';
	    document.getElementById ('pdfProgressBarDiv').style.opacity = 1;
	    document.body.style.cursor = 'default';
	});
    }

    /**********************************************************************************
     *
     * Generate the PDF using the jsPDF library.
     *
     * For a full list of jsPDF functions visit:
     * https://mrrio.github.io/jsPDF/doc/symbols/jsPDF.html#setLineCap
     *
     * The function returns a Promise because
     * - PDF generation is asynchronous, and
     * - any errors that occur can be conveniently returned via reject.
     *
     */
    function generatePDF (heatMap) {

	// Wrap the entire function body in a Promise to capture all errors.
	return new Promise ((resolve, reject) => {

	    // Allow user to inject error via console.
	    if (PDF.generateFakeError) {
		console.log (foobat);
	    }

	    document.getElementById ('pdfErrorMessage').style.display = 'none';

	    // Get a new jsPDF document
	    const pdfDoc = new getPdfDocument(heatMap);

	// Draw the heat map images (based upon user parameter selections)
	const mapsToShow = isChecked("pdfInputSummaryMap") ? "S" : isChecked("pdfInputDetailMap") ? "D" : "B";
	const includeSummaryMap = mapsToShow === "S" || mapsToShow === "B";
	const includeDetailMaps = mapsToShow === "D" || mapsToShow === "B";

	// PDF generation is accomplished by a sequence of possibly
	// asynchronous jobs that generate each component of the document.
	// These are:
	// - one job to generate the summary view (if it's included)
	// - a job for each detail view (if they're included)
	// - a job for the legends.
	//
	// P.S. Jobs are possibly asynchronous but not concurrent.
	// Only one job can be writing to the PDF at a time and the
	// order in which components are added to the PDF is important.
	//
	const drawJobs = [];

	if (includeSummaryMap) {
	    drawJobs.push ({ job: 'summary', mapItem: null });
	}
	if (includeDetailMaps) {
	    DVW.detailMaps.filter(mapItem => mapItem.isVisible()).forEach (mapItem => {
		drawJobs.push ({ job: 'detail', mapItem });
	    });
	}
	drawJobs.push ({ job: 'legends', mapItem: null });

	// Table of functions for performing each job.
	const jobFuncs = {
	    'summary': addSummaryPage,
	    'detail': addDetailPage,
	    'legends': addLegendPages,
	};

	const totalJobs = 1 + drawJobs.length;  // One for work done above.

	function updateProgress() {
	    const progress = (totalJobs - drawJobs.length) / totalJobs;
	    document.getElementById ('pdfProgressBar').value = progress;
	}

	// Execute the first job.  setTimeout allows the UI to update
	// before starting the job.
	updateProgress ();
	setTimeout (doNextJob);

	function doNextJob () {
	    if (drawJobs.length == 0) {
		// No jobs left.
		resolve(pdfDoc);
	    } else {
		// Obtain and execute next job.
		// Reject promise if error detected.
		// Let UI update between jobs.
		const { job, mapItem } = drawJobs.shift();
		jobFuncs[job](pdfDoc, mapItem)
		    .catch (error => { reject (error); })
		    .then(() => {
			if (cancelPdfGeneration) {
			    reject (new PdfError (''));
			    return;
			}
			updateProgress();
			setTimeout(doNextJob);
		    });
	    }
	}

	function addSummaryPage (pdfDoc) {
	    return new Promise ((resolve, reject) => {
		drawSummaryHeatMapPage (pdfDoc, includeDetailMaps && pdfDoc.showDetailBounds);
		resolve();
	    });
	}

	function addLegendPages (pdfDoc) {
	    const legends = new CovariateBarLegends (pdfDoc);
	    return legends.addLegendPages ();
	}

    });
    }

    initLegends();

    { // PDF dialog event handlers.
	const pdfResolution = document.getElementById('pdfResolution');
	const pdfCustomResolution = document.getElementById('pdfCustomResolution');
	const createPdfButton = document.getElementById('prefCreate_btn');
	const minDPI = 24;
	const maxDPI = 1200;
	pdfResolution.value = '50 dpi';
	pdfResolution.onchange = function (e) {
	    const pdfCustomResLabel = document.querySelector('label[for="pdfCustomResolution"]');
	    if (e.target.value == 'custom') {
		pdfCustomResLabel.classList.remove('hide');
		pdfCustomResolution.classList.remove('hide');
		checkResolution ();
	    } else {
		pdfCustomResLabel.classList.add('hide');
		pdfCustomResolution.classList.add('hide');
		createPdfButton.disabled = false;
	    }
	};
	pdfCustomResolution.dataset.tooltip = 'Enter DPI value between ' + minDPI + ' and ' + maxDPI;
	pdfCustomResolution.onchange = function (e) {
	    if (pdfResolution.value == 'custom') checkResolution();
	};

	function checkResolution () {
	    const val = parseInt (pdfCustomResolution.value);
		if (isNaN (val)) {
		    createPdfButton.disabled = true;
		    createPdfButton.dataset.disabledReason = 'Disabled because custom DPI is not a number.';
		    pdfCustomResolution.style.backgroundColor = '#ff00004d';
		    return;
		}
		if (val < minDPI) {
		    createPdfButton.disabled = true;
		    createPdfButton.dataset.disabledReason = 'Disabled because custom DPI is less than ' + minDPI + '.';
		    pdfCustomResolution.style.backgroundColor = '#ff00004d';
		    return;
		}

		if (val > maxDPI) {
		    createPdfButton.disabled = true;
		    createPdfButton.dataset.disabledReason = 'Disabled because custom DPI is greater than ' + maxDPI + '.';
		    pdfCustomResolution.style.backgroundColor = '#ff00004d';
		    return;
		}

		createPdfButton.disabled = false;
		createPdfButton.dataset.disabledReason = '';
		pdfCustomResolution.style.backgroundColor = '';
	}
    }


	//=================================================================================//
	//=================================================================================//
	//                        PDF OBJECT HELPER FUNCTIONS 
	//=================================================================================//
	//=================================================================================//

	/**********************************************************************************
	 * FUNCTION: getPdfDocument - This function creates and configures jsPDF Document object.
	 **********************************************************************************/

	const classBarHeaderSize = 12; // This is a font size
	const stdPDFRes = 72; // Standard PDF resolution is 72 points per inch

	getPdfDocument.prototype.addPageIfNeeded = addPageIfNeeded;
	getPdfDocument.prototype.createHeader = createHeader;
	getPdfDocument.prototype.setPadding = setPadding;

	function getPdfDocument(heatMap) {
	    // Must be invoked with new.

	    // Get document font and paper choices from the UI.
	    this.paperSize = [792,612];
	    if (document.getElementById("pdfPaperSize").value == "A4") {
		    this.paperSize = [842,595];
	    } else if (document.getElementById("pdfPaperSize").value == "A3") {
		    this.paperSize = [1224,792];
	    }
	    const pdfResolution = document.getElementById('pdfResolution');
	    const pdfCustomResolution = document.getElementById('pdfCustomResolution');
	    this.resolution = pdfResolution.value;
	    if (this.resolution == 'custom') {
		this.resolution = parseInt(pdfCustomResolution.value);
	    } else {
		this.resolution = parseInt(this.resolution.replace(/ dpi/,''));
	    }
	    if (isNaN (this.resolution)) {
		console.warn ('Unexpected non-numeric pdf resolution. Defaulting to 600 dpi.');
		this.resolution = 600;   // Shouldn't happen.
	    }
	    this.paperOrientation = isChecked("pdfInputPortrait") ? "p" : "l";
	    this.showDetailBounds = isChecked("pdfInputShowBounds");
	    this.fontStyle = document.getElementById("pdfFontStyle").value;

	    this.doc = new jspdf.jsPDF(this.paperOrientation,"pt",this.paperSize);
	    this.doc.setFont(this.fontStyle);
	    this.heatMap = heatMap;
	    this.firstPage = true;
	    this.pageHeight = this.doc.internal.pageSize.height;
	    this.pageWidth = this.doc.internal.pageSize.width;
	    this.pageHeaderHeight = calcPageHeaderHeight();

	    this.paddingLeft = 0;  // Placeholders
	    this.paddingTop = 0;
	}

	function setPadding (left, top) {
	    this.paddingLeft = left || this.paddingLeft;
	    this.paddingTop  = top || this.paddingTop;
	}

	// Output a new page to the PDF document except for the first time it's called.
	function addPageIfNeeded () {
	    if (this.firstPage) {
		this.firstPage = false;
	    } else {
		this.doc.addPage();
	    }
	}

	/**********************************************************************************
	 * FUNCTION: setLongestLabelUnits - This function converts longest label units to 
	 * actual length (11 is the max font size of the labels) these will be the bottom 
	 * and left padding space for the detail Heat Map
	 **********************************************************************************/
	function calcLongestLabelUnits(doc, allLabels, axis, fontSize) {
	    let longest = 0;
	    allLabels.forEach (label => {
		if (label.dataset.axis == axis) {
		    longest = Math.max(doc.getStringUnitWidth(label.innerHTML) * fontSize, longest);
		}
	    });
	    return longest * 1.05;
	}
	
	/**********************************************************************************
	 * FUNCTION: setTopItemsSizing - This function calculates the proper PDF
	 * display dimensions for row and column top items.  This calculation includes
	 * both the top items "lines" canvas and the area required for displaying top item
	 * labels.
	 **********************************************************************************/
	function setTopItemsSizing(doc, maxFontSize) {
	    const rowTopItems = SUM.rowTopItems;
	    const colTopItems = SUM.colTopItems;
	    const topItemsWidth = rowTopItems.length > 0 ? 10 : 0;  // Width of row top item lines
	    const topItemsHeight = colTopItems.length > 0 ? 10 : 0; // Height of column top item lines
	    let longestRowTopItems = 0;
	    let longestColTopItems = 0;
	    for (let i = 0; i < rowTopItems.length; i++){
		    longestRowTopItems = Math.max(doc.getStringUnitWidth(rowTopItems[i]),longestRowTopItems);
	    }
	    longestRowTopItems *= maxFontSize * 1.05;
	    for (let i = 0; i < colTopItems.length; i++){
		    longestColTopItems = Math.max(doc.getStringUnitWidth(colTopItems[i]),longestColTopItems);
	    }
	    longestColTopItems *= maxFontSize * 1.05;
	    const rowTopItemsLength = longestRowTopItems + topItemsWidth + 10;  // Padding between map and right edge of page
	    const colTopItemsLength = longestColTopItems + topItemsHeight + 10; // Padding between map and bottom edge of page
	    return { topItemsWidth, topItemsHeight, rowTopItemsLength, colTopItemsLength, };
	}	

	/**********************************************************************************
	 * FUNCTION: setSummaryDendroDimensions - This function calculates the proper PDF
	 * display dimensions for the Summary page dendrograms.  Since one dimension of 
	 * each is determined by the heat map width/height, only row dendro width and
	 * column dendro height need be calculated.
	 *
	 * Both the parameters and the return values are in document units.
	 *
	 **********************************************************************************/
	function setSummaryDendroDimensions(sumImgW, sumImgH, rowTopItemsLength, colTopItemsLength) {
	    // Convert dendrogram sizes in the summary view panel to percentages.
	    const rowDendroW = W(document.getElementById("row_dendro_canvas"));
	    const rowDendroPctg = rowDendroW / (W(SUM.boxCanvas) + W(SUM.rCCanvas) + rowDendroW);
	    const colDendroH = H(document.getElementById("column_dendro_canvas"));
	    const colDendroPctg = colDendroH / (H(SUM.boxCanvas) + H(SUM.cCCanvas) + colDendroH);

	    // Convert percentage sizes to document units.
	    const rowDendroWidth = (sumImgW - rowTopItemsLength) * rowDendroPctg;
	    const colDendroHeight = (sumImgH - colTopItemsLength) * colDendroPctg;
	    return { rowDendroWidth, colDendroHeight };
	}
	
	/**********************************************************************************
	 * FUNCTION: setSummaryClassDimensions - This function calculates the proper PDF
	 * display dimensions for the Summary page class bars.  Since one dimension of 
	 * each is determined by the heat map width/height, only row class width and
	 * column class height need be calculated.
	 *
	 * Both the parameters and the return values are in document units.
	 *
	 **********************************************************************************/
	function setSummaryClassDimensions(sumImgW, sumImgH, rowTopItemsLength, colTopItemsLength) {
	    const rowDendroW = W(document.getElementById("row_dendro_canvas"));
	    const rowClassBarPctg = W(SUM.rCCanvas) / (W(SUM.boxCanvas) + W(SUM.rCCanvas) + rowDendroW);
	    const colDendroH = H(document.getElementById("column_dendro_canvas"));
	    const colClassBarPctg = H(SUM.cCCanvas) / (H(SUM.boxCanvas) + H(SUM.cCCanvas) + colDendroH);
	    const rowClassWidth = (sumImgW - rowTopItemsLength) * rowClassBarPctg;
	    const colClassHeight = (sumImgH - colTopItemsLength) * colClassBarPctg;
	    return { rowClassWidth, colClassHeight };
	}

	/**********************************************************************************
	 * FUNCTION: setSummaryHeatmapDimensions - This function calculates the proper PDF
	 * display dimensions for the Summary Heat Map page.
	 **********************************************************************************/
	function setSummaryHeatmapDimensions(sumImgW, sumImgH, rowTopItemsLength, colTopItemsLength) {
	    const rowDendroW = W(document.getElementById("row_dendro_canvas"));
	    const sumMapWPctg = W(SUM.boxCanvas) / (W(SUM.boxCanvas) + W(SUM.rCCanvas) + rowDendroW);
	    const colDendroH = H(document.getElementById("column_dendro_canvas"));
	    const sumMapHPctg = H(SUM.boxCanvas) / (H(SUM.boxCanvas) + H(SUM.cCCanvas) + colDendroH);
	    const sumMapW = (sumImgW - rowTopItemsLength) * sumMapWPctg; //height of summary heatmap (and class bars)
	    const sumMapH = (sumImgH - colTopItemsLength) * sumMapHPctg; //width of summary heatmap (and class bars)
	    return { sumMapW, sumMapH };
	}

	// Return the width of element in pixels.
	function W (element) {
	    return +element.style.width.replace(/px/,'');
	}
	// Return the height of element in pixels.
	function H (element) {
	    return +element.style.height.replace(/px/,'');
	}

	/**********************************************************************************
	 * FUNCTION - createHeader: This function sets up the PDF page header bar used on all 
	 * of the PDF pages.  It makes the MDAnderson logo, the HM name, and the red divider 
	 * line at the top of each page
	 **********************************************************************************/
	function createHeader(titleText, options = {}) {
	    const logoLeft = 5;
	    const logoTop = 5;
	    const doc = this.doc;
	    const heatMap = this.heatMap;
	    const pageWidth = doc.getPageWidth();
	    const originalFontSize = doc.getFontSize();

	    const logo = document.getElementById('ngchmLogo');

		//If standard viewer version OR file viewer version show MDA logo 
		if (logo && PDF.ngchmLogo && ((PDF.isWidget === false) || (typeof isNgChmAppViewer !== 'undefined'))) {
			const logoHeight = this.pageHeaderHeight - 2 * logoTop;
			const logoWidth = (logo.clientWidth/logo.clientHeight) * logoHeight; // Preserve aspect ratio.
			doc.addImage(PDF.ngchmLogo, 'PNG', logoLeft, logoTop, logoWidth, logoHeight);

			const titleLeft = logoLeft + logoWidth + 2*logoLeft;
			const maxTitleWidth = pageWidth - titleLeft - 50;

			// Center Heat Map name in header whitespace to left of logo and step down the font if excessively long.
			let fullTitle = "";
			if (titleText !== null) {
				fullTitle = titleText + ": ";
			}
			/* top - y coordinate specifies the top of the text.  Small gap to text.
			 * hanging - y coordinate specifies just below the top of the text.  Intersects top stroke of text.
			 * middle - y coordinate specifies the middle of the text (excluding descenders)
			 * ideographic/default - y coordinate specifies the baseline of the text.
			 * bottom - y coordinate specifies the bottom of the descenders.
			 */
			fullTitle = fullTitle + heatMap.getMapInformation().name;
			let titlePositionY = this.pageHeaderHeight - 10;
			let fontSize = 18;
			doc.setFontSize(fontSize);
			let titleWidth = doc.getTextWidth (fullTitle);
			while (fontSize > 10 && titleWidth > maxTitleWidth) {
			    doc.setFontSize(-- fontSize);
			    titleWidth = doc.getTextWidth (fullTitle);
			}
			if (options.hasOwnProperty ("subTitle")) {
			    let subTitleFontSize = fontSize - 2;
			    let subTitle = options.subTitle;
			    let subTitleWidth = doc.getTextWidth (subTitle);
			    while (subTitleFontSize > 8 && subTitleWidth > maxTitleWidth) {
				doc.setFontSize(-- subTitleFontSize);
				titleWidth = doc.getTextWidth (subTitle);
			    }
			    if (titleWidth > maxTitleWidth) {
				subTitle = doc.splitTextToSize (subTitle, maxTitleWidth);
			    } else {
				subTitle = [ subTitle ];
			    }
			    titlePositionY -= subTitle.length * subTitleFontSize + 10;
			    doc.text (titleLeft, titlePositionY + fontSize, subTitle, null );
			}
			doc.setFontSize (fontSize);
			doc.setFont(this.fontStyle, "normal");
			doc.text (titleLeft, titlePositionY, fullTitle, null );
			doc.setFont(this.fontStyle, "bold");
			doc.setFillColor(255,0,0);
			doc.setDrawColor(255,0,0);
			doc.rect(5, logoHeight+10, pageWidth-10, 2, "FD");
			if (options.hasOwnProperty ("contText")) {
				doc.setFontSize(classBarHeaderSize);
				doc.text(10, this.paddingTop, options.contText, null);
			}
		} else {
			// If widgetized viewer exclude MDA logo and show compressed hear
			doc.setFontSize(8);
			doc.setFont(this.fontStyle, "bold");
			doc.text(10,10,"NG-CHM Heat Map: "+ heatMap.getMapInformation().name,null);
			doc.setFillColor(255,0,0);
			doc.setDrawColor(255,0,0);
			doc.rect(0, 15, pageWidth-10, 2, "FD");
		}
		doc.setFont(this.fontStyle, "normal");
		doc.setFontSize(originalFontSize);
	}

	/**********************************************************************************
	 * FUNCTION - isChecked: This function will check the checkboxes/radio buttons to see 
	 * how the PDF is to be created. 
	 **********************************************************************************/
	function isChecked(el){
		if(document.getElementById(el))
		return document.getElementById(el).checked;
	}

	function CovariateBarLegends (pdfDoc)
	{
	    this.pdfDoc = pdfDoc;
	}

	function initLegends () {
	Object.assign (CovariateBarLegends.prototype, {
	    addLegendPages,
	});

	const classBarHeaderSize = 12; // these are font sizes

	function addLegendPages () {
	    const pdfDoc = this.pdfDoc;
	    const heatMap = pdfDoc.heatMap;

	    pdfDoc.setPadding (5, pdfDoc.pageHeaderHeight+classBarHeaderSize + 10); // reset the top and left coordinates

	    return new Promise ((resolve, reject) => {
		var colorMap = heatMap.getCurrentColorMap();

		// Setup for class bar legends
		const barsInfo = {};
		barsInfo.covTitleRows = 1;
		barsInfo.classBarTitleSize = 10;
		barsInfo.classBarLegendTextSize = 9;
		barsInfo.classBarHeaderHeight = classBarHeaderSize+10;
		barsInfo.classBarFigureW = 150; // figure dimensions, unless discrete with 15+ categories
		barsInfo.classBarFigureH = 0;
		barsInfo.topSkip = barsInfo.classBarFigureH + classBarHeaderSize + 10;
		barsInfo.options = {
		    condenseClassBars: isChecked('pdfInputCondensed'),
		};
		barsInfo.rowClassBarData = heatMap.getRowClassificationData();
		barsInfo.colClassBarData = heatMap.getColClassificationData();
		barsInfo.rowClassBarConfig = heatMap.getRowClassificationConfig();
		barsInfo.colClassBarConfig = heatMap.getColClassificationConfig();

		barsInfo.rowBarsToDraw = [];
		barsInfo.colBarsToDraw = [];
		if (isChecked('pdfInputColumn')) {
			barsInfo.colBarsToDraw = heatMap.getColClassificationOrder("show");
		}
		if (isChecked('pdfInputRow')) {
			barsInfo.rowBarsToDraw = heatMap.getRowClassificationOrder("show");
		}
		barsInfo.topOff = pdfDoc.paddingTop + barsInfo.classBarTitleSize + 5;
		barsInfo.leftOff = 20;
		barsInfo.sectionHeader = 'undefined';

		// adding the data matrix distribution plot to legend page
		drawDataDistributionPlot(pdfDoc, barsInfo).then(() => {;
		    // add all row covariate bars to legend page
		    drawRowClassLegends(pdfDoc, barsInfo);

		    // add all column covariate bars to legend page
		    barsInfo.leftOff = 20; // ...reset leftOff...
		    drawColClassLegends(pdfDoc, barsInfo, barsInfo.classBarTitleSize);

		    // Complete this task.
		    resolve();
		});
	    });
	}

	/**********************************************************************************
	 * FUNCTION:  drawDataDistributionPlot - This function draws the matrix data 
	 * distribution plot on the legend page.
	 **********************************************************************************/
	function drawDataDistributionPlot(pdfDoc, barsInfo) {
		barsInfo.sectionHeader = "Data Matrix Distribution"
		pdfDoc.addPageIfNeeded();
		pdfDoc.createHeader(null);
		pdfDoc.doc.setFontSize(classBarHeaderSize);
		pdfDoc.doc.setFont(pdfDoc.fontStyle, "bold");
		pdfDoc.doc.text(10, pdfDoc.paddingTop, barsInfo.sectionHeader , null);
		pdfDoc.doc.setFont(pdfDoc.fontStyle, "normal");
		return getDataMatrixDistributionPlot(pdfDoc, barsInfo);
	}

	/**********************************************************************************
	 * FUNCTION - getDataMatrixDistributionPlot: This function creates the distribution 
	 * plot for the legend page.
	 **********************************************************************************/
	function getDataMatrixDistributionPlot(pdfDoc, barsInfo) {
		// function ripped from UPM used in the gear panel
		const doc = pdfDoc.doc;
		const heatMap = pdfDoc.heatMap;

		var currentDl = heatMap.getCurrentDL();
		var cm = heatMap.getColorMapManager().getColorMap("data",currentDl);
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
		var numCol = heatMap.getNumColumns(MAPREP.DETAIL_LEVEL);
		var numRow = heatMap.getNumRows(MAPREP.DETAIL_LEVEL)
		const accessWindow = heatMap.getNewAccessWindow ({
		    layer: currentDl,
		    level: MAPREP.DETAIL_LEVEL,
		    firstRow: 1,
		    firstCol: 1,
		    numRows: numRow,
		    numCols: numCol,
		});
		return accessWindow.onready().then (win => {
		    var nan=0;
		    for (var i=1; i<numCol+1;i++){
			for(var j=1;j<numRow+1;j++){
				var val = Number(Math.round(win.getValue(j,i)+'e4')+'e-4')  // BMB: WTF?
				if (isNaN(val) || val>=MAPREP.maxValues){ // is it Missing value?
					nan++;
				} else if (val <= MAPREP.minValues){ // is it a cut location?
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
		    var bartop = barsInfo.topOff+5;
		    var threshMaxLen = getThreshMaxLength(thresholds,barsInfo.classBarLegendTextSize);
		    var missingCount=0;

		    var barHeight = barsInfo.classBarLegendTextSize + 3;
		    for (var j = 0; j < breaks.length; j++){ // draw all the bars within the break points
			    var rgb = cm.getColor(breaks[j]);
			    doc.setFillColor(rgb.r,rgb.g,rgb.b);
			    doc.setDrawColor(0,0,0);
			    let value = bins[j];
			    if (isNaN(value) || value == undefined){
				    value = 0;
			    }
			    if (barsInfo.options.condenseClassBars){ // square
				    var barW = 10;
				    doc.rect(leftOff + threshMaxLen, bartop, barW, barHeight, "FD"); // make the square
				    doc.rect(leftOff + threshMaxLen-2, bartop+barHeight, 2, 1, "FD"); // make break bar
				    doc.setFontSize(barsInfo.classBarLegendTextSize);
				    doc.text(leftOff + threshMaxLen - doc.getStringUnitWidth(breaks[j].toString())*barsInfo.classBarLegendTextSize - 4, bartop + barsInfo.classBarLegendTextSize + barHeight/2, breaks[j].toString() , null);
				    doc.text(leftOff +barW + threshMaxLen + 10, bartop + barsInfo.classBarLegendTextSize, "n = " + value + " (" + (value/total*100).toFixed(2) + "%)" , null);
			    } else { // histogram
				    var barW = (value/binMax*barsInfo.classBarFigureW)*.65;  //scale bars to fit page
				    doc.rect(leftOff + threshMaxLen, bartop, barW, barHeight, "FD"); // make the histo bar
				    doc.rect(leftOff + threshMaxLen-2, bartop+barHeight, 2, 1, "FD"); // make break bar
				    doc.setFontSize(barsInfo.classBarLegendTextSize);
				    doc.text(leftOff + threshMaxLen - doc.getStringUnitWidth(breaks[j].toString())*barsInfo.classBarLegendTextSize - 4, bartop + barsInfo.classBarLegendTextSize + barHeight/2, breaks[j].toString() , null);
				    doc.text(leftOff + threshMaxLen +barW + 5, bartop + barsInfo.classBarLegendTextSize, "n = " + value + " (" + (value/total*100).toFixed(2) + "%)" , null);
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
		    if (barsInfo.options.condenseClassBars){ // square
			    var barW = 10;
			    doc.rect(leftOff + threshMaxLen, bartop, barW, barHeight, "FD"); // make the square
			    doc.setFontSize(barsInfo.classBarLegendTextSize);
			    doc.text(leftOff +barW + threshMaxLen + 10, bartop + barsInfo.classBarLegendTextSize, "n = " + value + " (" + (value/total*100).toFixed(2) + "%)" , null);
		    } else { // histogram
			    var barW = (value/binMax*barsInfo.classBarFigureW)*.65;  //scale bars to fit page
			    doc.rect(leftOff + threshMaxLen, bartop, barW, barHeight, "FD"); // make the histo bar
			    doc.setFontSize(barsInfo.classBarLegendTextSize);
			    doc.text(leftOff + threshMaxLen +barW + 5, bartop + barsInfo.classBarLegendTextSize, "n = " + value + " (" + (value/total*100).toFixed(2) + "%)" , null);
		    }
		    missingCount -= value;
		    bartop+=barHeight; // adjust top position for the next bar
		    // Draw missing values bar IF missing values > 0
		    missingCount = Math.max(0,nan); // just in case missingCount goes negative...
		    if (missingCount > 0) {
			    foundMissing = 1;
			    const rgb = cm.getColor("Missing");
			    doc.setFillColor(rgb.r,rgb.g,rgb.b);
			    doc.setDrawColor(0,0,0);
			    const barW = barsInfo.options.condenseClassBars ? 10 : missingCount/binMax*barsInfo.classBarFigureW;
			    doc.rect(leftOff + threshMaxLen, bartop, barW, barHeight, "FD");
			    doc.setFontSize(barsInfo.classBarLegendTextSize);
			    doc.text(leftOff + threshMaxLen - doc.getStringUnitWidth("Missing Value")*barsInfo.classBarLegendTextSize - 4, bartop + barsInfo.classBarLegendTextSize, "Missing Value" , null);
			    doc.text(leftOff + threshMaxLen +barW + 5, bartop + barsInfo.classBarLegendTextSize, "n = " + missingCount + " (" + (missingCount/total*100).toFixed(2) + "%)" , null);
		    }
		    var foundMissing = 0;
		    setClassBarFigureH(barsInfo, 10,'discrete',barsInfo.classBarLegendTextSize,false);
		});
	}
	
	/**********************************************************************************
	 * FUNCTION:  drawRowClassLegends - This function draws the legend blocks for each
	 * row covariate bar on the heat map to the PDF legends page.
	 **********************************************************************************/
	function drawRowClassLegends(pdfDoc, barsInfo) {
		const doc = pdfDoc.doc;
		barsInfo.sectionHeader = "Row Covariate Bar Legends";
		if (barsInfo.rowBarsToDraw.length > 0){
			barsInfo.leftOff = 20; // ...reset leftOff...
			const topSkip  = barsInfo.classBarFigureH + classBarHeaderSize + barsInfo.classBarTitleSize + 20; // return class bar height to original value in case it got changed in this row
			barsInfo.topOff += topSkip; // ... and move the next figure to the line below
			barsInfo.classBarFigureH = 0;
			barsInfo.topOff += barsInfo.classBarTitleSize + 5;
			for (let i = 0; i < barsInfo.rowBarsToDraw.length;i++){
			    const key = barsInfo.rowBarsToDraw[i];
			    doc.setFontSize(barsInfo.classBarTitleSize);
			    const barConfig = barsInfo.rowClassBarConfig[key];
			    const isDiscrete = barConfig.color_map.type === 'discrete';
			    const colorCount = isDiscrete ? barConfig.color_map.colors.length : 10;
			    if (i === 0) {
				drawLegendSubSectionHeader(pdfDoc, barsInfo, colorCount, key);
			    }
			    const barData = barsInfo.rowClassBarData[key];
			    if (isDiscrete) {
				getBarGraphForDiscreteClassBar(pdfDoc, key, 'row', barsInfo, barConfig, barData);
			    } else {
				getBarGraphForContinuousClassBar(pdfDoc, key, 'row', barsInfo, barConfig, barData);
			    }
			}
		}
	}
	
	/**********************************************************************************
	 * FUNCTION:  drawColClassLegends - This function draws the legend blocks for each
	 * column covariate bar on the heat map to the PDF legends page.
	 **********************************************************************************/
	function drawColClassLegends(pdfDoc, barsInfo) {
		const doc = pdfDoc.doc;
		barsInfo.sectionHeader = "Column Covariate Bar Legends"
		// Draw column class bar legends
		if (barsInfo.colBarsToDraw.length > 0){
			const topSkip = barsInfo.classBarFigureH + classBarHeaderSize + barsInfo.classBarTitleSize + 20; // return class bar height to original value in case it got changed in this row
			barsInfo.topOff += topSkip; // ... and move the next figure to the line below
			barsInfo.classBarFigureH = 0;
			barsInfo.topOff += barsInfo.classBarTitleSize + 5;
			for (let i = 0; i < barsInfo.colBarsToDraw.length;i++){
			    const key = barsInfo.colBarsToDraw[i];
			    doc.setFontSize(barsInfo.classBarTitleSize);
			    const barConfig = barsInfo.colClassBarConfig[key];
			    const isDiscrete = barConfig.color_map.type === 'discrete';
			    const colorCount = isDiscrete ? barConfig.color_map.colors.length : 10;
			    if (i === 0) {
				drawLegendSubSectionHeader(pdfDoc, barsInfo, colorCount, key, barsInfo.classBarFigureW);
			    }
			    const barData = barsInfo.colClassBarData[key];
			    if (isDiscrete) {
				getBarGraphForDiscreteClassBar(pdfDoc, key, 'col', barsInfo, barConfig, barData, barsInfo.classBarFigureW, barsInfo.classBarLegendTextSize);
			    } else {
				getBarGraphForContinuousClassBar(pdfDoc, key, 'col', barsInfo, barConfig, barData);
			    }
			}
		}
	}
	
	/**********************************************************************************
	 * FUNCTION:  drawLegendSubSectionHeader - This function draws bolded sub-section
	 * header on the legend page(s).  If the next group of legends breaks across a 
	 * page boundary, a new page is created.
	 **********************************************************************************/
	function drawLegendSubSectionHeader(pdfDoc, barsInfo, categories, key) {
	    const truncTitle = key.length > 40 ? key.substring(0,40) + "..." : key;
	    const splitTitle = pdfDoc.doc.splitTextToSize(truncTitle, barsInfo.classBarFigureW);
	    //Adjustment for multi-line covariate headers
	    if(splitTitle.length > 1) {
		barsInfo.classBarHeaderHeight = (classBarHeaderSize*splitTitle.length)+(4*splitTitle.length)+10;   
	    }
	    if ((barsInfo.topOff + barsInfo.classBarHeaderHeight + (categories*13) > pdfDoc.pageHeight)) {
		pdfDoc.addPageIfNeeded(); // ... make a new page and reset topOff
		pdfDoc.createHeader(null, { contText: barsInfo.sectionHeader });
		barsInfo.topOff = pdfDoc.paddingTop + 15;
	    } else {
		pdfDoc.doc.setFontSize(classBarHeaderSize);
		pdfDoc.doc.setFont(pdfDoc.fontStyle, "bold");
		pdfDoc.doc.text(10, barsInfo.topOff, barsInfo.sectionHeader , null);
	    }
	    pdfDoc.doc.setFontSize(barsInfo.classBarTitleSize);
	    pdfDoc.doc.setFont(pdfDoc.fontStyle, "normal");
	    barsInfo.topOff += barsInfo.classBarTitleSize + 5;
	    barsInfo.leftOff = 20; // ...reset leftOff...
	}

	/**********************************************************************************
	 * FUNCTION - getBarGraphForDiscreteClassBar: This functiio places the classBar legend 
	 * using the variables leftOff and topOff, which are updated after every classBar legend.
	 * inputs: classBar object, colorMap object, and string for name
	 **********************************************************************************/
	function getBarGraphForDiscreteClassBar(pdfDoc, key, type, barsInfo, classBarConfig, classBarData){
		const doc = pdfDoc.doc;
		var barScale = isChecked("pdfInputPortrait") ? .50 : .65;
		var foundMissing = 0;
		var truncTitle = key.length > 40 ? key.substring(0,40) + "..." : key;
		var splitTitle = doc.splitTextToSize(truncTitle, barsInfo.classBarFigureW);
		if (barsInfo.covTitleRows === 1) {
			barsInfo.covTitleRows = splitTitle.length;
		}
		var bartop = barsInfo.topOff+5 + (splitTitle.length-1)*barsInfo.classBarLegendTextSize*2;
		var colorMap = pdfDoc.heatMap.getColorMapManager().getColorMap(type, key);
		var thresholds = colorMap.getThresholds();
		var maxLabelLength = doc.getStringUnitWidth("XXXXXXXXXXXXXXXX")*barsInfo.classBarLegendTextSize;
		if (isChecked("pdfInputPortrait") && (thresholds.length > 56)) {
			doc.setFont(pdfDoc.fontStyle, "bold");
			doc.text(barsInfo.leftOff, barsInfo.topOff, splitTitle);
			doc.setFont(pdfDoc.fontStyle, "normal");
			doc.text(barsInfo.leftOff + 15, bartop + barsInfo.classBarLegendTextSize, "This discrete covariate bar contains too", null);
			doc.text(barsInfo.leftOff +15, bartop + barsInfo.classBarLegendTextSize+12, "many categories to print.", null);
			setClassBarFigureH(barsInfo, 2,'discrete',0);
		} else if (isChecked("pdfInputLandscape") && (thresholds.length > 40)) {
			doc.setFont(pdfDoc.fontStyle, "bold");
			doc.text(barsInfo.leftOff, barsInfo.topOff, splitTitle);
			doc.setFont(pdfDoc.fontStyle, "normal");
			doc.text(barsInfo.leftOff +15, bartop + barsInfo.classBarLegendTextSize,    "This discrete covariate bar contains too", null);
			doc.text(barsInfo.leftOff +15, bartop + barsInfo.classBarLegendTextSize+12, "many categories to print. You may try", null);
			doc.text(barsInfo.leftOff +15, bartop + barsInfo.classBarLegendTextSize+24, "printing in portrait mode.", null);
			setClassBarFigureH(barsInfo, 3,'discrete',0);
		} else {
			//Adjustment for multi-line covariate headers
			if(splitTitle.length > 1) {
				barsInfo.classBarHeaderHeight = (classBarHeaderSize*splitTitle.length)+(4*splitTitle.length)+10;  
			}
			if ((barsInfo.topOff + barsInfo.classBarHeaderHeight + (thresholds.length*13) > pdfDoc.pageHeight) && !isLastClassBarToBeDrawn(pdfDoc.heatMap,key,type)) {
				doc.addPage(); // ... make a new page and reset topOff
				pdfDoc.createHeader(null, { contText: barsInfo.sectionHeader + " (continued)"});
				barsInfo.topOff = pdfDoc.paddingTop + 15;
				barsInfo.leftOff = 20; // ...reset leftOff...
			}  
			bartop = barsInfo.topOff+5 + (splitTitle.length - 1)*(barsInfo.classBarLegendTextSize*2);
			//Adjustment for multi-line covariate headers
			if(splitTitle.length > 1) {
				barsInfo.classBarHeaderHeight = (classBarHeaderSize*splitTitle.length)+(4*splitTitle.length)+10;  
			}
			doc.setFont(pdfDoc.fontStyle, "bold");
			doc.text(barsInfo.leftOff, barsInfo.topOff, splitTitle);
			doc.setFont(pdfDoc.fontStyle, "normal");
		    
			var barHeight = barsInfo.classBarLegendTextSize + 3;
			var counts = {}, maxCount = 0;
			maxLabelLength = doc.getStringUnitWidth("XXXXXXXXXXXXXXXX")*barsInfo.classBarLegendTextSize;
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
				maxLabelLength = Math.max(maxLabelLength, doc.getStringUnitWidth(val)*barsInfo.classBarLegendTextSize);
			}
				
			// NOTE: missingCount will contain all elements that are not accounted for in the thresholds
			// ie: thresholds = [type1, type2, type3], typeX will get included in the missingCount
			var missingCount = classBarData.values.length-cutValues;
			// Get maximum length of threshhold title for use in separating counts from title
			var threshMaxLen = getThreshMaxLength(thresholds,barsInfo.classBarLegendTextSize);
			// Indent threshholds from class bar title
			barsInfo.leftOff += 10;
			// draw the bars
			for (var j = 0; j < thresholds.length; j++){ // make a gradient stop (and also a bucket for continuous)
				var rgb = colorMap.getClassificationColor(thresholds[j]);
				doc.setFillColor(rgb.r,rgb.g,rgb.b);
				doc.setDrawColor(0,0,0);
				var count = counts[thresholds[j]] ? counts[thresholds[j]] : 0;
				if (barsInfo.options.condenseClassBars){
					var barW = 10;
					doc.rect(barsInfo.leftOff, bartop, barW, barHeight, "FD");
					doc.setFontSize(barsInfo.classBarLegendTextSize);
					doc.text(barsInfo.leftOff +barW + 5, bartop + barsInfo.classBarLegendTextSize, thresholds[j].toString(), null);
					doc.text(barsInfo.leftOff +barW + threshMaxLen + 10, bartop + barsInfo.classBarLegendTextSize, "n = " + count + " (" + (count/classBarData.values.length*100).toFixed(2) + "%)", null);
				} else {
					var barW = (count/maxCount*barsInfo.classBarFigureW)*barScale;  //scale bars to fit page
					doc.rect(barsInfo.leftOff + maxLabelLength, bartop, barW, barHeight, "FD");
					doc.setFontSize(barsInfo.classBarLegendTextSize);
					doc.text(barsInfo.leftOff + maxLabelLength - doc.getStringUnitWidth(thresholds[j].toString())*barsInfo.classBarLegendTextSize - 4, bartop + barsInfo.classBarLegendTextSize, thresholds[j].toString() , null);
					doc.text(barsInfo.leftOff + maxLabelLength +barW + 5, bartop + barsInfo.classBarLegendTextSize, "n = " + count + " (" + (count/classBarData.values.length*100).toFixed(2) + "%)" , null);
				
				
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
				drawMissingColor(pdfDoc, barsInfo, bartop, barHeight, missingCount, maxCount, maxLabelLength, threshMaxLen, classBarData.values.length);
			}
			
			if (thresholds.length * barHeight > barsInfo.classBarFigureH){ // in case a discrete classbar has over 15 categories, make the topOff increment bigger
				barsInfo.topSkip = (thresholds.length+1) * barHeight+classBarHeaderSize;
			}
			setClassBarFigureH(barsInfo, thresholds.length,'discrete',foundMissing);
		}
		// adjust the location for the next class bar figure
		adjustForNextClassBar(pdfDoc, barsInfo, key,type,maxLabelLength);
	}

	/**********************************************************************************
	 * FUNCTION - getBarGraphForContinousClassBar: This function places the classBar 
	 * legend using the variables leftOff and topOff, which are updated after every 
	 * classBar legend. inputs: classBar object, colorMap object, and string for name
	 **********************************************************************************/
	function getBarGraphForContinuousClassBar(pdfDoc, key, type, barsInfo, classBarConfig, classBarData){
		const doc = pdfDoc.doc;
		const heatMap = pdfDoc.heatMap;

		var barScale = isChecked("pdfInputPortrait") ? .50 : .65;
		var foundMissing = 0;
		// Write class bar name to PDF
		var splitTitle = doc.splitTextToSize(key, barsInfo.classBarFigureW);
		if (barsInfo.covTitleRows === 1) {
			barsInfo.covTitleRows = splitTitle.length;
		}
		//Adjustment for multi-line covariate headers
		if(splitTitle.length > 1) {
			barsInfo.classBarHeaderHeight = (classBarHeaderSize*splitTitle.length)+(4*splitTitle.length)+10;   
		}
		if ((barsInfo.topOff + barsInfo.classBarHeaderHeight + 130) > pdfDoc.pageHeight) {
			doc.addPage(); // ... make a new page and reset topOff
			pdfDoc.createHeader(null, { contText: barsInfo.sectionHeader + " (continued)" });
			barsInfo.topOff = pdfDoc.paddingTop + 15;
			barsInfo.leftOff = 20; // ...reset leftOff...
		}  
		doc.setFont(pdfDoc.fontStyle, "bold");
		doc.text(barsInfo.leftOff, barsInfo.topOff, splitTitle);
		doc.setFont(pdfDoc.fontStyle, "normal");
		const classBars = heatMap.getAxisCovariateConfig(type);
		const classBar = classBars[key];
		//Adjustment for multi-line covariate headers
    //		if(splitTitle.length > 1) {
    //			barsInfo.classBarHeaderHeight = (classBarHeaderSize*splitTitle.length)+(4*splitTitle.length)+10;   
    //		}
		const colorMap = heatMap.getColorMapManager().getColorMap(type, key);

		// For Continuous Classifications: 
	// 1. Retrieve continuous threshold array from colorMapManager
	// 2. Retrieve threshold range size divided by 2 (1/2 range size)
	// 3. If remainder of half range > .75 set threshold value up to next value, Else use floor value.
		const thresholds = colorMap.getContinuousThresholdKeys();
		const threshSize = colorMap.getContinuousThresholdKeySize()/2;
		var thresholdSize;
		if ((threshSize%1) > .5) {
			// Used to calculate modified threshold size for all but first and last threshold
			// This modified value will be used for color and display later.
			thresholdSize = Math.floor(threshSize)+1;
		} else {
			thresholdSize = Math.floor(threshSize);
		}
		var barHeight = barsInfo.classBarLegendTextSize + 3;

		// get the number N in each threshold
		var counts = {};
		var maxCount = 0;
		var maxLabelLength = doc.getStringUnitWidth("XXXXXXXXXXXXXXXX")*barsInfo.classBarLegendTextSize;

		// get the continuous thresholds and find the counts for each bucket
		var cutValues = 0;
		for (let k = 0; k < thresholds.length; k++) {
		    counts[k] = 0;
		}
		for (let i = 0; i < classBarData.values.length; i++) {
		    if (classBarData.values[i] === '!CUT!') {
			cutValues++;
		    } else if (classBarData.values[i] !== 'null') {
			const num = parseFloat(classBarData.values[i]);
			if (isNaN (num)) {
			    console.warn ('Encountered bad continuous covariate value in ' + key + ': ' + classBarData.values[i]);
			} else {
			    let k;
			    if (num <= thresholds[0]) {
				k = 0;
			    } else if (num > thresholds[thresholds.length-1]) {
				k = thresholds.length-1; // Stick it into last bucket, even though it rightfully belongs in another.
			    } else {
				k = 1;
				while (num > thresholds[k]) {
				    // This loop must terminate because of the above test
				    // against the last threshold.
				    k++;
				}
			    }
			    counts[k] = counts[k]+1;
			}
		    }
		}

		// find the longest label length
		for (var val in counts){
			maxCount = Math.max(maxCount, counts[val]);
			maxLabelLength = Math.max(maxLabelLength, doc.getStringUnitWidth(''+val.length)*barsInfo.classBarLegendTextSize);
		}
		
		var bartop = barsInfo.topOff+5 + (splitTitle.length-1)*barsInfo.classBarLegendTextSize*2;
		var missingCount = classBarData.values.length - cutValues; // start at total number of labels and work down
		var value;
		// Get maximum length of threshhold title for use in separating counts from title
		var threshMaxLen = getThreshMaxLength(thresholds,barsInfo.classBarLegendTextSize);
		// Indent threshholds from class bar title
		barsInfo.leftOff += 10;
		const black = { r: 0, g: 0, b: 0, };
		for (var j = 0; j < thresholds.length; j++){
			const rgb = classBar.bar_type === 'color_plot' ? colorMap.getClassificationColor(thresholds[j]) : black;
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
			if (barsInfo.options.condenseClassBars){ // square
				var barW = 10;
				doc.rect(barsInfo.leftOff, bartop, barW, barHeight, "FD"); // make the square
				doc.setFontSize(barsInfo.classBarLegendTextSize);
				doc.text(barsInfo.leftOff +barW + 5, bartop + barsInfo.classBarLegendTextSize, valLabel, null);
				doc.text(barsInfo.leftOff +barW + threshMaxLen + 10, bartop + barsInfo.classBarLegendTextSize, "n = " + value + " (" + (value/classBarData.values.length*100).toFixed(2) + "%)" , null);
			} else { // histogram
				var barW = (value/maxCount*barsInfo.classBarFigureW)*barScale;  //scale bars to fit page
				doc.rect(barsInfo.leftOff + maxLabelLength, bartop, barW, barHeight, "FD"); // make the histo bar
				doc.setFontSize(barsInfo.classBarLegendTextSize);
				doc.text(barsInfo.leftOff + maxLabelLength - doc.getStringUnitWidth(valLabel)*barsInfo.classBarLegendTextSize - 4, bartop + barsInfo.classBarLegendTextSize, valLabel , null);
				doc.text(barsInfo.leftOff + maxLabelLength +barW + 5, bartop + barsInfo.classBarLegendTextSize, "n = " + value + " (" + (value/classBarData.values.length*100).toFixed(2) + "%)"  , null);
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
			drawMissingColor(pdfDoc, barsInfo, bartop, barHeight, missingCount, maxCount, maxLabelLength, threshMaxLen, classBarData.values.length);
		}
		setClassBarFigureH(barsInfo, 0,'continuous',foundMissing);
		adjustForNextClassBar(pdfDoc, barsInfo, key,type,maxLabelLength);
	}

	/**********************************************************************************
	 * FUNCTION - setClassBarFigureH: This function will set classification bar figure
	 * height for the class bar legend page.
	 **********************************************************************************/
	function setClassBarFigureH(barsInfo, threshCount, type, isMissing) {
		var bars = 9; //Set bar default to continuous with 9 bars
		if (type === 'discrete') {
			bars = threshCount; //Set bars to threshold count
		}
		bars += isMissing; // Add a bar if missing values exist
		var calcHeight = bars * (barsInfo.classBarLegendTextSize+3); //number of bars multiplied by display height
		if (calcHeight > barsInfo.classBarFigureH) {
			barsInfo.classBarFigureH = calcHeight;
		}
	}

	/**********************************************************************************
	 * FUNCTION - drawMissingColor: This function will set the missing color line for
	 * either type (row/col) of classification bar.
	 **********************************************************************************/
	function drawMissingColor(pdfDoc, barsInfo, bartop, barHeight, missingCount, maxCount, maxLabelLength, threshMaxLen, totalValues) {
		const doc = pdfDoc.doc;
		const barScale = isChecked("pdfInputPortrait") ? .50 : .65;
		if (barsInfo.options && barsInfo.options.condenseClassBars){
			var barW = 10;
			doc.rect(barsInfo.leftOff, bartop, barW, barHeight, "FD");
			doc.setFontSize(barsInfo.classBarLegendTextSize);
			doc.text(barsInfo.leftOff +barW + 5, bartop + barsInfo.classBarLegendTextSize, "Missing Value", null);
			doc.text(barsInfo.leftOff +barW + threshMaxLen + 10, bartop + barsInfo.classBarLegendTextSize, "n = " + missingCount + " (" + (missingCount/totalValues*100).toFixed(2) + "%)" , null);
		} else {
			var barW = (missingCount/maxCount*barsInfo.classBarFigureW)*barScale;
			doc.rect(barsInfo.leftOff + maxLabelLength, bartop, barW, barHeight, "FD");
			doc.setFontSize(barsInfo.classBarLegendTextSize);
			doc.text(barsInfo.leftOff + maxLabelLength - doc.getStringUnitWidth("Missing Value")*barsInfo.classBarLegendTextSize - 4, bartop + barsInfo.classBarLegendTextSize, "Missing Value" , null);
			doc.text(barsInfo.leftOff + maxLabelLength +barW + 5, bartop + barsInfo.classBarLegendTextSize, "n = " + missingCount + " (" + (missingCount/totalValues*100).toFixed(2) + "%)" , null);
		}
	}

	/**********************************************************************************
	 * FUNCTION - adjustForNextClassBar: This function will set the positioning for the
	 * next class bar to be drawn
	 **********************************************************************************/
	function adjustForNextClassBar(pdfDoc, barsInfo, key,type,maxLabelLength) {
		barsInfo.leftOff += barsInfo.classBarFigureW + maxLabelLength + 60;
		if (barsInfo.leftOff + barsInfo.classBarFigureW > pdfDoc.pageWidth){ // if the next class bar figure will go beyond the width of the page...
			barsInfo.leftOff = 20; // ...reset leftOff...
			barsInfo.topSkip  = barsInfo.classBarFigureH + barsInfo.classBarHeaderHeight + (10*barsInfo.covTitleRows);
			barsInfo.covTitleRows = 1;
			barsInfo.topOff += barsInfo.topSkip; // ... and move the next figure to the line below
			barsInfo.classBarHeaderHeight = classBarHeaderSize+10; //reset this value
			var nextClassBarFigureH = getNextLineClassBarFigureH(pdfDoc, barsInfo, key, type);
			if (barsInfo.topOff + barsInfo.classBarHeaderHeight + nextClassBarFigureH > pdfDoc.pageHeight && !isLastClassBarToBeDrawn(pdfDoc.heatMap,key,type)){ // if the next class bar goes off the page vertically...
				pdfDoc.addPageIfNeeded(); // ... make a new page and reset topOff
				pdfDoc.createHeader(null, { contText: barsInfo.sectionHeader + " (continued)" });
				barsInfo.topOff = pdfDoc.paddingTop + 15;
			}
			barsInfo.classBarFigureH = 0;
		}
	}

	/**********************************************************************************
	 * FUNCTION - getNextLineClassBarFigureH: This function is used to determine the
	 * height of the next few class bars when a new line of class bar legends needs to
	 * be drawn.
	 **********************************************************************************/
	function getNextLineClassBarFigureH(pdfDoc, barsInfo, key,type){
		var minLabelLength = pdfDoc.doc.getStringUnitWidth("Missing Value")*barsInfo.classBarLegendTextSize;
		var classBarsToDraw = type == "col" ? barsInfo.colBarsToDraw : barsInfo.rowBarsToDraw;
		var classBars = type == "col" ? pdfDoc.heatMap.getColClassificationConfig(): pdfDoc.heatMap.getRowClassificationConfig();
		var index = classBarsToDraw.indexOf(key);
		var classW = barsInfo.classBarFigureW;
		var maxThresh = 0;
		var numFigures = 0;
		var nextIdx = index+1;
		while (numFigures*(barsInfo.classBarFigureW+minLabelLength+60) < pdfDoc.pageWidth){
			var barName = classBarsToDraw[nextIdx];
			if (!barName) break;
			var thisBar = classBars[barName];
			var threshCount = thisBar.color_map.thresholds.length+1; // +1 added to assume that missing values will be present
			if (thisBar.color_map.type == "continuous"){threshCount = 10}
			if (threshCount > maxThresh) maxThresh = threshCount;
			nextIdx++,numFigures++;
		}
		return maxThresh*barsInfo.classBarLegendTextSize;
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
	function isLastClassBarToBeDrawn(heatMap,classBar,type){
		var isItLast = false;
		if (isChecked('pdfInputColumn')) {
			var colBars = heatMap.getColClassificationOrder("show");
			if ((type === 'col') && (classBar === colBars[colBars.length - 1])) {
				isItLast = true
			}
		}
		if (isChecked('pdfInputRow')) {
			var rowBars = heatMap.getRowClassificationOrder("show");
			if ((type === 'row') && (classBar === rowBars[rowBars.length - 1])) {
				isItLast = true
			}
		}
		return isItLast;
	}
	}

	/**********************************************************************************
	 * FUNCTION:  drawSummaryHeatMapPage - This function outputs the summary view page of
	 * the heat map to the PDF document doc.
	 *
	 * The 'green' outlines of the detail views are added to the summary view page iff
	 * showDetailViewBounds is true.
	 *
	 **********************************************************************************/
	function drawSummaryHeatMapPage (pdfDoc, showDetailViewBounds) {

	    const debug = false;

	    pdfDoc.setPadding (10, pdfDoc.pageHeaderHeight+15);

	    const heatMap = pdfDoc.heatMap;
	    // Calculate the maximum size for row/col top items (including area for arrows)
	    const topItemsFontSize = 5;

	    const { topItemsWidth, topItemsHeight, rowTopItemsLength, colTopItemsLength } = setTopItemsSizing(pdfDoc.doc, topItemsFontSize);
	    const sumPaddingWidth = 5;
	    const sumPaddingHeight = 5;
	    const sumImgW = pdfDoc.doc.getPageWidth() - pdfDoc.paddingLeft - sumPaddingWidth;  //width of available space for heatmap, class bars, and dendro
	    const sumImgH = pdfDoc.doc.getPageHeight() - pdfDoc.paddingTop - sumPaddingHeight; //height of available space for heatmap, class bars, and dendro

	    //Get Dimensions for Summary Row & Column Dendrograms
	    const { rowDendroWidth, colDendroHeight } = setSummaryDendroDimensions(sumImgW, sumImgH, rowTopItemsLength, colTopItemsLength);

	    //Get Dimensions for Summary Row & Column Class Bars
	    const { rowClassWidth, colClassHeight } = setSummaryClassDimensions(sumImgW, sumImgH, rowTopItemsLength, colTopItemsLength);

	    //Get Dimensions for the Summary Heat Map
	    const { sumMapW, sumMapH } = setSummaryHeatmapDimensions(sumImgW, sumImgH, rowTopItemsLength, colTopItemsLength);

	    const mapWidthScale = Math.max (1, Math.ceil (pdfDoc.resolution/stdPDFRes * sumImgW / heatMap.getNumColumns (MAPREP.SUMMARY_LEVEL)));
	    const mapHeightScale = Math.max (1, Math.ceil (pdfDoc.resolution/stdPDFRes * sumImgH / heatMap.getNumRows (MAPREP.SUMMARY_LEVEL)));

	    const mapInfo = heatMap.getMapInformation();
	    const headerOptions = {};
	    if (mapInfo.attributes.hasOwnProperty('chm.info.caption')) {
		headerOptions.subTitle = mapInfo.attributes['chm.info.caption'];
	    }
	    pdfDoc.addPageIfNeeded();
	    pdfDoc.createHeader("Summary", headerOptions);

	    const rowDendroConfig = heatMap.getRowDendroConfig();
	    const colDendroConfig = heatMap.getColDendroConfig();

	    // Determine the left edge of the row dendrogram, row class bars, and heat map.
	    const rowDendroLeft = pdfDoc.paddingLeft;
	    const rowClassLeft = rowDendroLeft + (rowDendroConfig.show !== 'NONE' ? rowDendroWidth+1 : 0);
	    const imgLeft = rowClassLeft + (rowClassWidth > 0 ? rowClassWidth+1 : 0);

	    // Determine the top edge of the column dendrogram, column class bars, and heat map.
	    const colDendroTop = pdfDoc.paddingTop;
	    const colClassTop = colDendroTop + (colDendroConfig.show !== 'NONE' ? colDendroHeight+1 : 0);
	    const imgTop = colClassTop + (colClassHeight > 0 ? colClassHeight+1 : 0);

	    // Add the row dendrogram and row covariate bars.
	    if (rowDendroConfig.show !== 'NONE') {
		if (debug) console.log ('rowDendro@', { left: rowDendroLeft, top: imgTop, width: rowDendroWidth, height: sumMapH });
		SUM.rowDendro.drawPDF (pdfDoc.doc, { left: rowDendroLeft, top: imgTop, width: rowDendroWidth, height: sumMapH });
	    }
	    if (SUM.rCCanvas.width > 0) {
		// Render row covariates to a renderBuffer, convert to a data URL, and add to the document.
		const rowCovBarSize = heatMap.getScaledVisibleCovariates('row', 1.0).totalHeight();
		const rowCovWidthScale = Math.max (1, Math.ceil (pdfDoc.resolution/stdPDFRes * rowClassWidth / rowCovBarSize));
		const renderBuffer = SUM.buildRowCovariateRenderBuffer (rowCovWidthScale, mapHeightScale);
		const sumRowClassData = createDataURLFromRenderBuffer (renderBuffer);

		if (debug) console.log('rowCovar@', { left: rowClassLeft, top: imgTop, width: rowClassWidth, height: sumMapH});
		pdfDoc.doc.addImage(sumRowClassData, 'PNG', rowClassLeft, imgTop, rowClassWidth, sumMapH);
	    }


	    // Add the column dendrogram and column covariate bars.
	    if (colDendroConfig.show !== 'NONE') {
		if (debug) console.log ('colDendro@', { left: imgLeft, top: colDendroTop, width: sumMapW, height: colDendroHeight });
		SUM.colDendro.drawPDF (pdfDoc.doc, { left: imgLeft, top: colDendroTop, width: sumMapW, height: colDendroHeight });
	    }
	    if (SUM.cCCanvas.height > 0) {
		// Render column covariates to a renderBuffer, convert to a data URL, and add to document.
		const colCovBarSize = heatMap.getScaledVisibleCovariates('column', 1.0).totalHeight();
		const colCovWidthScale = Math.max (1, Math.ceil (pdfDoc.resolution/stdPDFRes * colClassHeight / colCovBarSize));
		const renderBuffer = SUM.buildColCovariateRenderBuffer (mapWidthScale, colCovWidthScale);
		const sumColClassData = createDataURLFromRenderBuffer (renderBuffer);

		if (debug) console.log ('colCovar@', { left: imgLeft, top: colClassTop, width: sumMapW, height: colClassHeight});
		pdfDoc.doc.addImage(sumColClassData, 'PNG', imgLeft, colClassTop, sumMapW, colClassHeight);
	    }


	    // Render heatmap to a renderBuffer, convert to a data URL, and add to document.
	    {
		const renderBuffer = SUM.renderHeatMapToRenderBuffer (mapWidthScale, mapHeightScale);
		const sumImgData = createDataURLFromRenderBuffer (renderBuffer);
		if (debug) console.log ('map@', { left: imgLeft, top: imgTop, width: sumMapW, height: sumMapH});
		pdfDoc.doc.addImage(sumImgData, 'PNG', imgLeft, imgTop, sumMapW, sumMapH);
	    }

	    // Add the top item marks and labels.
	    if (SUM.rowTopItemPosns.length > 0 || SUM.colTopItemPosns.length > 0) {
		const ctx = pdfDoc.doc.context2d;
		const resScale = 100;
		ctx.save();
		ctx.scale (1.0/resScale, 1.0/resScale);
		ctx.lineWidth = 1;
		if (SUM.rowTopItemPosns.length > 0) {
		    // Each top item mark is drawn as a bezier curve from an origin point
		    // (the item position) through two intermediate control points to a
		    // destination point (the label position).
		    // For all row top items, the X coordinates of these control points
		    // are the same.
		    const X1 = (imgLeft + sumMapW + 1) * resScale;
		    const X2 = (imgLeft + sumMapW + 4) * resScale;
		    const X3 = (imgLeft + sumMapW + topItemsWidth - 3) * resScale;
		    const X4 = (imgLeft + sumMapW + topItemsWidth) * resScale;
		    ctx.beginPath();
		    SUM.rowTopItemPosns.forEach(tip => {
			// Compute Y coordinates for start and end of the curve.
			const Y1 = (imgTop + tip.itemFrac * sumMapH) * resScale;
			const Y2 = (imgTop + tip.labelFrac * sumMapH) * resScale;
			// Draw the curve.
			ctx.moveTo (X1, Y1);
			ctx.bezierCurveTo (X2, Y1, X3, Y2, X4, Y2);
		    });
		    ctx.stroke();
		}
		if (SUM.colTopItemPosns.length > 0) {
		    // For all column top items, the Y coordinates of all control points
		    // are the same.
		    const Y1 = (imgTop + sumMapH + 1) * resScale;
		    const Y2 = (imgTop + sumMapH + 4) * resScale;
		    const Y3 = (imgTop + sumMapH + topItemsHeight - 3) * resScale;
		    const Y4 = (imgTop + sumMapH + topItemsHeight) * resScale;
		    ctx.beginPath();
		    SUM.colTopItemPosns.forEach(tip => {
			// Compute X coordinates for start and end of the curve.
			const X1 = (imgLeft + tip.itemFrac * sumMapW) * resScale;
			const X2 = (imgLeft + tip.labelFrac * sumMapW) * resScale;
			// Draw the curve.
			ctx.moveTo (X1, Y1);
			ctx.bezierCurveTo (X1, Y2, X2, Y3, X2, Y4);
		    });
		    ctx.stroke();
		}
		ctx.restore();
		// Draw the top item labels.
		drawSummaryTopItemLabels(pdfDoc, "row", { left: imgLeft + sumMapW + topItemsWidth + 2, top: imgTop, width: undefined, height: sumMapH });
		drawSummaryTopItemLabels(pdfDoc, "col", { left: imgLeft, top: imgTop + sumMapH + topItemsHeight + 2, width: sumMapW, height: undefined });
	    }

	    // Draw the black border around the summary view.
	    const ctx = pdfDoc.doc.context2d;
	    ctx.save();
	    ctx.lineWidth = 1;
	    ctx.strokeRect(imgLeft,imgTop,sumMapW,sumMapH);

	    // Draw the 'green' boundary rectangles that outline the detail map views.
	    if (showDetailViewBounds) {
		const color = heatMap.getCurrentDataLayer().selection_color;
		pdfDoc.doc.setDrawColor (color);
		const yScale = sumMapH / heatMap.getNumRows(MAPREP.DETAIL_LEVEL);
		const xScale = sumMapW / heatMap.getNumColumns(MAPREP.DETAIL_LEVEL);
		DVW.detailMaps.forEach (mapItem => {
		    if (mapItem.isVisible()) {
			const left = (mapItem.currentCol-1) * xScale;
			const top = (mapItem.currentRow-1) * yScale;
			const width = mapItem.dataPerRow * xScale;
			const height = mapItem.dataPerCol * yScale;
			ctx.lineWidth = mapItem.version == 'P' ? 2 : 1;
			ctx.strokeRect (imgLeft + left, imgTop + top, width, height);
		    }
		});
	    }
	    ctx.restore();
	}

	/**********************************************************************************
	 * FUNCTION - drawSummaryTopItemLabels: This function draws the labels for the top
	 * items on the specific axis of the summary page.
	 **********************************************************************************/
	function drawSummaryTopItemLabels(pdfDoc, axis, vp) {
	    const debug = false;
	    const doc = pdfDoc.doc;
	    const origFontSize = doc.getFontSize();
	    const labelFontSize = 5;  // Use a small font for top items.
	    doc.setFontSize(labelFontSize);
	    const topItems = [...document.getElementsByClassName("topItems")].filter(ti => ti.axis === axis);
	    if (debug) {
		console.log ('Drawing ' + topItems.length + ' ' + axis + ' top items');
	    }
	    const chmCanvas = document.getElementById("summary_canvas");
	    const canvasRect = chmCanvas.getBoundingClientRect();
	    if (axis === "row") {
		topItems.forEach(item => {
		    const rect = item.getBoundingClientRect();
		    const relPosn = (rect.y - canvasRect.y) / canvasRect.height;
		    doc.text(vp.left, vp.top + vp.height * relPosn + labelFontSize * 0.75, item.innerHTML);
		    if (debug) {
			console.log ('Drew row label ' + item.innerHTML, { x: vp.left, y: vp.top + vp.height * relPosn + labelFontSize, relPosn: relPosn, rect });
		    }
		});
	    } else {
		topItems.forEach(item => {
		    const rect = item.getBoundingClientRect();
		    const relPosn = (rect.x - canvasRect.x) / canvasRect.width;
		    doc.text(vp.left + vp.width * relPosn + labelFontSize/2, vp.top, item.innerHTML, null, 270);
		    if (debug) {
			console.log ('Drew col label ' + item.innerHTML, { x: vp.left+vp.width*relPosn + labelFontSize/2, y: vp.top, relPosn: relPosn, rect });
		    }
		});
	    }
	    doc.setFontSize (origFontSize);
	}

	/**********************************************************************************
	 * FUNCTION:  addDetailPage - This function draws a detail canvases
	 * onto a detail heat map PDF page.
	 **********************************************************************************/
	function addDetailPage (pdfDoc, mapItem) {
	    pdfDoc.setPadding (10, pdfDoc.pageHeaderHeight + 10);
	    const doc = pdfDoc.doc;

	    return DVW.getDetailWindow (mapItem).onready().then (win => {
		const origFontSize = doc.getFontSize();
		pdfDoc.addPageIfNeeded();

		let detVer = "Primary";
		if (mapItem.version === 'S') {
			detVer = "Ver " + mapItem.panelNbr;
		}
		pdfDoc.createHeader("Detail - " + detVer);

		const mapLabelDivs = Object.entries(mapItem.labelElements).map (([id, label]) => label.div);
		const rowLabels = mapLabelDivs.filter (label => label.dataset.axis == "Row");
		const colLabels = mapLabelDivs.filter (label => label.dataset.axis == "Column");
		const columnCovarLabels = mapLabelDivs.filter (label => label.dataset.axis == "ColumnCovar");
		const rowCovarLabels = mapLabelDivs.filter (label => label.dataset.axis == "RowCovar");

		const labelFontSize = getFontSizeForLabels (rowLabels, mapItem.rowLabelFont, colLabels, mapItem.colLabelFont);

		const allLabels = [...mapItem.chm.getElementsByClassName("DynamicLabel")];
		const longestRowLabelUnits = calcLongestLabelUnits(doc, allLabels, "Row", labelFontSize);
		const longestColLabelUnits = calcLongestLabelUnits(doc, allLabels, "Column", labelFontSize);

		const longestRowCovarUnits = calcLongestLabelUnits(doc, allLabels, "RowCovar", mapItem.rowClassLabelFont);
		const longestColCovarUnits = calcLongestLabelUnits(doc, allLabels, "ColumnCovar", mapItem.colClassLabelFont);

		const paddingRight = 10;
		const paddingBottom = 10;

		// The following calculations use three coordinate systems:
		// - browser window coordinates (i.e. the size things appear in the browser, determined by CSS etc.)
		// - canvas coordinates (the sizes drawn inside the canvas. In general, these differ from browser coordinates.
		//   Recall the difference between canvas.width (canvas coordinates) and canvas.style.width (browser coordinates).
		// - PDF coordinates.

		// Determine total width and height available for map + dendrograms + covariate bars (in PDF units).
		const detImgH = pdfDoc.pageHeight - pdfDoc.paddingTop - Math.max(longestColLabelUnits,longestRowCovarUnits) - paddingBottom;
		const detImgW = pdfDoc.pageWidth - pdfDoc.paddingLeft - Math.max(longestRowLabelUnits,longestColCovarUnits) - paddingRight;

		const heatMap = pdfDoc.heatMap;

		// Determine the proportions in mapItem of (map+dendrograms) used by dendrograms.
		// (All calculations use browser window coordinates).
		const rowDendroConfig = heatMap.getRowDendroConfig();
		const colDendroConfig = heatMap.getColDendroConfig();
		const rcw = + mapItem.rowDendroCanvas.clientWidth;
		const cch = + mapItem.colDendroCanvas.clientHeight;
		const rowDendroPctg = rowDendroConfig.show == 'ALL' ? rcw / (mapItem.canvas.clientWidth + rcw) : 0;
		const colDendroPctg = colDendroConfig.show == 'ALL' ? cch / (mapItem.canvas.clientHeight + cch) : 0;

		// Determine the total width and height available for the map and the covariate bars (in PDF units).
		const detMapW = detImgW*(1-rowDendroPctg);
		const detMapH = detImgH*(1-colDendroPctg);

		// Determine the width of the row dendrograms and the height of the column dendrograms (in PDF units).
		const detRowDendroWidth = detImgW * rowDendroPctg;
		const detColDendroHeight = detImgH * colDendroPctg;

		// Determine the total width of the row covariate bars and height of the column covariate bars in PDF units.
		// (Intermediate proportions are calculated in canvas coordinates).
		const rowCovariates = mapItem.getScaledVisibleCovariates("row");
		const detRowClassWidth = detMapW*(rowCovariates.totalHeight()/mapItem.canvas.width);
		const colCovariates = mapItem.getScaledVisibleCovariates("column");
		const detColClassHeight = detMapH*(colCovariates.totalHeight()/mapItem.canvas.height);

		const rowDendroLeft = pdfDoc.paddingLeft;	// Left edge of row dendrogram
		const colDendroTop = pdfDoc.paddingTop;		// Top edge of column dendrogram

		// Note: the image includes both the heat map and the covariate bars.
		const imgLeft = pdfDoc.paddingLeft+detRowDendroWidth;	// Left edge of the image.
		const imgTop = pdfDoc.paddingTop+detColDendroHeight;	// Top edge of the image.

		if (rowDendroConfig.show === 'ALL') {
		    mapItem.rowDendro.drawPDF (doc, {
			left: rowDendroLeft,
			top: imgTop + detColClassHeight,	// Top of row dendrogram starts below the column covariates in the image.
			width: detRowDendroWidth-1,		// Leave a one point gap between the dendrogram and the image.
			height: detMapH - detColClassHeight,	// Height is the image height less the height of the column covariate bars.
		    });
		}
		if (colDendroConfig.show === 'ALL') {
		    mapItem.colDendro.drawPDF(doc, {
			left: imgLeft+detRowClassWidth,		// Left of column dendrogram starts after the row covariates in the image.
			top: colDendroTop,
			width: detMapW-detRowClassWidth,	// Width is the image height less the width of the row covariate bars.
			height: detColDendroHeight-1,		// Leave a one point gap between the dendrogram and the image.
		    });
		}

		// Render the image and add it to the document.
		{
		    const { drawWin, params } = mapItem.detailHeatMapParams[mapItem.heatMap._currentDl];
		    const renderBuffer = DET.getDetailHeatMap (mapItem, drawWin, params);
		    const detImgData = createDataURLFromRenderBuffer (renderBuffer);

		    doc.addImage(detImgData, 'PNG', imgLeft, imgTop, detMapW, detMapH);
		}

		// Scale the box canvas overlay.
		const level = DVW.getLevelFromMode (mapItem, MAPREP.DETAIL_LEVEL);
		const mapWidthScale = Math.max (1, Math.ceil (pdfDoc.resolution/stdPDFRes * detMapW / heatMap.getNumColumns (level)));
		const mapHeightScale = Math.max (1, Math.ceil (pdfDoc.resolution/stdPDFRes * detMapH / heatMap.getNumRows (level)));

		// Create a 'form object' aka subdocument that will be used for overlaying the
		// heat map with selection boxes etc. (Equivalent to the on-screen boxCanvas.)
		// The W and H parameters specify the maximum width and height of the form object.
		// H also specifies where the top of document is (i.e. what Y=0 denotes inside the
		// form object).
		// We have to increase W and H slightly above the target values so that jsPDF does
		// not crop objects out.  I.e. a strokeRect(0,0,W,H) will be dropped by jsPDF but
		// should not be.
		const boxMatrix = new doc.Matrix (1.0, 0.0, 0.0, 1.0, 0.0, 0.0);
		const boxDoc = doc.beginFormObject ( 0, 0, detMapW+1e-5, detMapH+1e-5, boxMatrix);
		boxDoc.context2d.save();
		boxDoc.context2d.scale (1.0/mapWidthScale, 1.0/mapHeightScale);
		const mapItemVars = DET.drawMapItemSelectionsOnTarget (mapItem, {
		    width: detMapW * mapWidthScale,
		    height: detMapH * mapHeightScale,
		    widthScale: mapWidthScale,
		    heightScale: mapHeightScale,
		    ctx: boxDoc.context2d,
		});
		boxDoc.context2d.restore();
		doc.endFormObject(mapItem.pane + '-box-matrix');

		// Insert the form object into the document.  The X, Y coordinates specify where to place the
		// bottom-left corner of the form object.
		const boxMatrix2 = new doc.Matrix (1.0, 0.0, 0.0, 1.0, imgLeft, pdfDoc.pageHeight - (imgTop + detMapH) );
		doc.doFormObject(mapItem.pane + '-box-matrix', boxMatrix2);

		// Determine the scaling factors between the browser window coordinates and
		// the PDF coordinates for both rows and columns.
		const detClient2PdfWRatio = mapItem.canvas.clientWidth/detMapW;  // scale factors to place the labels in their proper locations
		const detClient2PdfHRatio = mapItem.canvas.clientHeight/detMapH;
		Object.assign (mapItemVars, {
		    labelFontSize, longestRowLabelUnits, longestColLabelUnits,
		    detClient2PdfWRatio, detClient2PdfHRatio, detRowDendroWidth, detColDendroHeight,
		});
		drawDetailSelectionsAndLabels(pdfDoc, mapItem, mapItemVars);

		doc.setFontSize (origFontSize);
	    });

	    // Detail Map Helper Functions
	    //
	    /**********************************************************************************
	     * FUNCTION:  drawDetailSelectionsAndLabels - This function draws any selection
	     * boxes and then labels onto the detail heat map page.
	     **********************************************************************************/
	    function drawDetailSelectionsAndLabels(pdfDoc, mapItem, mapItemVars) {
		// Draw selection boxes first (this way they will not overlap text)
		drawDetailSelectionBoxes(pdfDoc.doc, mapItem, mapItemVars);
		// Draw labels last (so they write over any selection boxes present)
		doc.setFont (pdfDoc.fontStyle, 'normal');
		drawDetailLabels(pdfDoc.doc, mapItem, mapItemVars);
	    }

	    /**********************************************************************************
	     * FUNCTION:  drawDetailSelectionBoxes - This function draws any selection
	     * boxes and selected label boxes onto the detail heat map page.
	     **********************************************************************************/
	    function drawDetailSelectionBoxes (doc, mapItem, mapItemVars) {
		if (mapItem.labelElements.length == 0) return;
		// Draw selection boxes first (this way they will not overlap text)
		// Get selection color for current datalayer to be used in highlighting selected labels
		const layer = mapItem.heatMap.getCurrentDataLayer();
		const selectedColor = CMM.hexToRgba(layer.selection_color);
		doc.setFillColor(selectedColor.r, selectedColor.g, selectedColor.b);
		// Get row and column labels.
		const mapLabelDivs = Object.entries(mapItem.labelElements).map (([id, label]) => label.div);
		const rowLabels = mapLabelDivs.filter (label => label.dataset.axis == "Row");
		const colLabels = mapLabelDivs.filter (label => label.dataset.axis == "Column");
		rowLabels.forEach (label => {
		    if (SRCHSTATE.labelIndexInSearch("Row",label.dataset.index)) {
			const { x, y } = calcRowLabelPosn (mapItem, mapItemVars, label, mapItemVars.labelFontSize);
			doc.rect(x, y - mapItemVars.labelFontSize, mapItemVars.longestRowLabelUnits+2, mapItemVars.labelFontSize, 'F');
		    }
		});
		colLabels.forEach (label => {
		    if (SRCHSTATE.labelIndexInSearch("Column",label.dataset.index)) {
			const { x, y } = calcColLabelPosn (mapItem, mapItemVars, label, mapItemVars.labelFontSize);
			doc.rect(x-2, y, mapItemVars.labelFontSize+2.5, mapItemVars.longestColLabelUnits+2, 'F');
		    }
		});
	    }

	    // The following two functions attempt to calculate the best x and y PDF coordinates for label.
	    //
	    // They do so by calculating the position of the label in the mapItem (in window coordinates) relative
	    // to the mapItem canvas (in window coordinates), scaling the difference to PDF coordinates, and adding
	    // it to the image position (in PDF coordinates).
	    //
	    // There are several limitations with this approach:
	    // 1. The window coordinate positions are converted to integers, losing precision,
	    // 2. The window coordinate positions are tweaked to adjust for rotations, margins etc., that we would
	    //    ideally like to undo and reapply separately in PDF coordinates.  However, it's not easy to get
	    //    the extend of the tweaks to undo them.
	    // 3. It assumes that the covariate bars and the heat map are scaled by the same amount.  It is not
	    //    clear that we want to scale them exactly the same.

	    function calcRowLabelPosn (mapItem, mapItemVars, label, labelFontSize) {
		// The following line includes a labelFontSize/2 gap between the edge of the image and the label.
		const left = pdfDoc.paddingLeft + mapItemVars.detRowDendroWidth + labelFontSize/2;
		// The -3 in the following line undoes a corresponding +3 when positioning the label in DET/drawAxisLabels.
		const x = left + (label.offsetLeft-mapItem.canvas.offsetLeft-3) / mapItemVars.detClient2PdfWRatio;

		const top = pdfDoc.paddingTop + mapItemVars.detColDendroHeight + labelFontSize;
		let y = top + (label.offsetTop-mapItem.canvas.offsetTop) / mapItemVars.detClient2PdfHRatio;
		if (label.id.indexOf("legendDet") > -1) {
		    y--;
		}
		return { x, y };
	    }

	    function calcColLabelPosn (mapItem, mapItemVars, label, labelFontSize) {
		let x = (label.offsetLeft-mapItem.canvas.offsetLeft-3)/mapItemVars.detClient2PdfWRatio+mapItemVars.detRowDendroWidth + pdfDoc.paddingLeft
		    - labelFontSize;
		const y = (label.offsetTop-mapItem.canvas.offsetTop)/mapItemVars.detClient2PdfHRatio+pdfDoc.paddingTop+mapItemVars.detColDendroHeight;
		if (label.id.indexOf("legendDet") > -1) {
		    x += pdfDoc.paddingLeft;
		}
		return { x, y };
	    }

	    /**********************************************************************************
	     * FUNCTION:  drawDetailLabels - This function draws any labels onto
	     * the heat map page.
	     **********************************************************************************/
	    function drawDetailLabels(doc, mapItem, mapItemVars) {
		if (mapItem.labelElements.length == 0) return;
		// Determine row and column label divs.
		const mapLabelDivs = Object.entries(mapItem.labelElements).map (([id, label]) => label.div);
		const rowLabels = mapLabelDivs.filter (label => label.dataset.axis == "Row");
		const colLabels = mapLabelDivs.filter (label => label.dataset.axis == "Column");
		const columnCovarLabels = mapLabelDivs.filter (label => label.dataset.axis == "ColumnCovar");
		const rowCovarLabels = mapLabelDivs.filter (label => label.dataset.axis == "RowCovar");

		drawLabels (rowLabels, mapItemVars.labelFontSize, colLabels, mapItemVars.labelFontSize);
		drawLabels (columnCovarLabels, mapItem.colClassLabelFont, rowCovarLabels, mapItem.rowClassLabelFont);

		function drawLabels (rowLabels, rowLabelFont, colLabels, colLabelFont) {
		    // Draw row labels.
		    if (rowLabelFont > 0) {
			doc.setFontSize (rowLabelFont);
			rowLabels.forEach(label => {
			    const { x, y } = calcRowLabelPosn (mapItem, mapItemVars, label, rowLabelFont);
			    doc.text(x, y, label.innerHTML, null);
			});
		    }
		    // Draw column labels.
		    if (colLabelFont > 0) {
			doc.setFontSize (colLabelFont);
			colLabels.forEach(label => {
			    const { x, y } = calcColLabelPosn (mapItem, mapItemVars, label, colLabelFont);
			    doc.text(x, y, label.innerHTML, null, 270);
			});
		    }
		}
	    }
	}

    // Return fontsize of smallest visible labels
    function getFontSizeForLabels (rowLabels, rowLabelFont, colLabels, colLabelFont) {
	let labelFontSize = 10;
	if (rowLabelFont > 0 && rowLabels.length > 0) {
	    labelFontSize = Math.min (labelFontSize, 0.95*rowLabelFont);
	}
	if (colLabelFont > 0 && colLabels.length > 0) {
	    labelFontSize = Math.min (labelFontSize, 0.95*colLabelFont);
	}
	return labelFontSize;
    }

    // Calculate the height of the header on each page.
    function calcPageHeaderHeight() {
	const logo = document.getElementById('ngchmLogo');
	let h = 5;
	if (logo !== null) {
	    h += logo.clientHeight;
	}
	return h;
    }

    // Create a data URL from the image in renderBuffer.
    //
    // Uses a temporary canvas (same size as the
    // renderBuffer), copies the image to the canvas using
    // WebGL, then converts the image in the canvas to
    // a data URL.
    function createDataURLFromRenderBuffer (renderBuffer) {
	const canvas = document.createElement('canvas');
	canvas.width = renderBuffer.width;
	canvas.height = renderBuffer.height;
	const glMan = SUM.createSummaryGlManager ( canvas, () => {} );
	glMan.check(SUM.initSummaryGlContext);
	glMan.setTextureFromRenderBuffer (renderBuffer);
	glMan.drawTexture ();
	return canvas.toDataURL('image/png');
    }

    function isPdfProgressBarVisible () {
	return document.getElementById ('pdfProgressBarDiv').style.display == '';
    }

document.getElementById ('pdfInputSummaryMap').onchange = updateShowBounds;
document.getElementById ('pdfInputDetailMap').onchange = updateShowBounds;
document.getElementById ('pdfInputBothMaps').onchange = updateShowBounds;

document.getElementById('prefCancel_btn').onclick = function (event) {
    if (isPdfProgressBarVisible()) {
	cancelPdfGeneration = true;
	document.getElementById('prefCancel_btn').disabled = true;
	document.getElementById ('pdfProgressBarDiv').style.opacity = 0.5;
    } else {
	pdfCancelButton();
    }
};

document.getElementById('prefCreate_btn').onclick = function (event) {
    getViewerHeatmapPDF(MMGR.getHeatMap());
};

document.getElementById('menuPdf').onclick = function (event) {
    PDF.openPdfPrefs(event.target, null);
};

})();
