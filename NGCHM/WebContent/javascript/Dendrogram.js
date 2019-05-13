//Define Namespace for NgChm Dendrogram
NgChm.createNS('NgChm.DDR');

NgChm.DDR.subDendroView = 'none';

//Class used to hold an in memory 2D boolean matrix of the dendrogram 
NgChm.DDR.DendroMatrix = function(numRows, numCols,isRow){
	// We've moved away from using a 2D matrix and have opted to use one long array for performance purposes.
	var matrixData = new Uint8Array(numRows * numCols);
	var numRows = numRows;
	var numCols = numCols;
	var isRow = isRow;
	
	this.getDataLength = function(){
		return matrixData.length;
	}
	
	this.setTrue = function(row, col, bold) {
		matrixData[(row * numCols) + col ] = bold ? 2 : 1;
	}
	
	this.isRow = function(){
		return isRow;
	}
	this.get = function(row, col){
		return (matrixData[(row * numCols) + col ]);
	}
	
	this.getArrayVal = function(i){
		return matrixData[i];
	}
	// These returns the "matrix positions" based on the index in the array
	this.getI = function(index){
		return Math.floor(index/numCols);
	}
	
	this.getJ = function(index){
		return index-Math.floor(index/numCols)*numCols;
	}
	
	this.getNumCols = function() {
		return numCols;
	};
	
	this.getNumRows = function() {
		return numRows;
	};
	
	//For performance on large maps, it is faster to reduce the matrix and draw than it is to
	//draw with scaling.  This function creates a reduced size representation of the matrix
	this.scaleMatrix =  function(newRows, newCols) {
		var newMatrix = new NgChm.DDR.DendroMatrix(newRows, newCols, isRow);
		
		var yRatio = newRows/numRows;
		var xRatio = newCols/numCols;
		var position = 0;
		
		for (var y=0; y<numRows; y++){
			for (var x=0; x<numCols; x++){
				val = matrixData[position];
				if (val > 0){
					newMatrix.setTrue(Math.floor(y*yRatio),Math.floor(x*xRatio),val==2)
				}
				position++;
			}
		}
		if (xRatio > 1) {
			newMatrix.fillHoles();
		} 
			
		return newMatrix;
	};
	
	//When a matrix is scaled up, sometimes the horizontal lines get holes. This routine
	//patches up the holes in the dendro matrix.
	this.fillHoles = function() {
		for (var y=numRows; y>0; y--){
			for (var x=0; x<numCols; x++){
				val = this.get(y, x);
				if (val > 0 && y > 1){
					below = this.get(y-1,x);
					above = this.get(y+1,x);
					left = this.get(y,x-1);
					if (below == 0 && this.get(y, x+1) == 0 && this.getNumCols()%(x+1) !==0){ // check to see if this is a gap in a cross bar
						this.setTrue(y, x+1, val==2);
					} else if (below > 0 && above == 0 && left ==0 && this.get(y,x+1)==0){ // check to see if this is a gap in a left branch
						this.setTrue(y, x+1, val==2);
					}
				}		
			}
		}	
	};
}

/******************************
 *  SUMMARY COLUMN DENDROGRAM *
 ******************************/
NgChm.DDR.SummaryColumnDendrogram = function() {
	var dendroDisplaySize = NgChm.DDR.minDendroMatrixHeight; // this is a static number used to determine how big the dendro canvas will be in conjunction with the dendroConfig.heigh property
	var pointsPerLeaf = 3; // each leaf will get 3 points in the dendrogram array. This is to avoid lines being right next to each other
	var bars = [];
	var chosenBar = {}; // this is the bar that is clicked on the summary side (Subdendro selection)
	var dendroCanvas = document.getElementById('column_dendro_canvas');
	var dendroConfig = NgChm.heatMap.getColDendroConfig();
	var hasData = dendroConfig.show === 'NA' ? false : true;
	var dendroData = NgChm.heatMap.getColDendroData();
	var normDendroMatrixHeight = Math.min(Math.max(NgChm.DDR.minDendroMatrixHeight,dendroData.length),NgChm.DDR.maxDendroMatrixHeight); // this is the height of the dendro matrices created in buildDendroMatrix
	var maxHeight = dendroData.length > 0 ? getMaxHeight(dendroData) : 0; 
	var dendroMatrix;                       
	if (hasData) {
		while(dendroMatrix == undefined){dendroMatrix = buildMatrix();}
	}
	var originalDendroMatrix = dendroMatrix;
	var selectedBars = []; // these are the bars/areas that are selected from the detail side
	var sumChm = document.getElementById("summary_chm");
	dendroCanvas.addEventListener('click',subDendroClick);
	this.getDivWidth = function(){
		return parseInt(dendroCanvas.clientWidth);
	}
	this.getDivHeight = function(){
		if (dendroConfig.show == "NONE" || dendroConfig.show == "NA"){
			return 0;
		}
		return parseInt(dendroConfig.height)/dendroDisplaySize*sumChm.clientHeight*NgChm.SUM.heightPct;
	}
	this.getBars = function(){
		return bars;
	}
	this.getDendroMatrixHeight = function(){
		return normDendroMatrixHeight;
	}
	this.getDendroMatrix = function(){
		return dendroMatrix;
	}
	this.getPointsPerLeaf = function(){
		return pointsPerLeaf;
	}

	this.addSelectedBar = function(extremes, shift, ctrl){
		var left = extremes.left;
		var right = extremes.right;
		var height = extremes.height;
		var selectLeft = Math.round((left+pointsPerLeaf/2)/pointsPerLeaf);
		var selectRight =Math.round((right+pointsPerLeaf/2)/pointsPerLeaf);
		var addBar = true;
		var selectedBar = extremes;
		// is it a standard click?
		if (!shift && !ctrl){
			NgChm.DET.clearSearchItems("Column");
			for (var i = selectLeft; i < selectRight+1;i++){
				NgChm.SEL.searchItems["Column"][i] = 1;
			}
			
			selectedBars = [selectedBar];
			return;
		}
		var deleteBar = [];  // bars that need to be removed due to this new click
		for (var i in selectedBars){
			var bar = selectedBars[i];
			if (bar.left <= left && bar.right >= right && bar.height > height){
				addBar = false;
			} 
			if (bar.left >= left && bar.right <= right && bar.height-1 <= height){ // if the new selected bar is in the bounds of an older one... (-1 added to height since highlighted bars can cause issues without it)
				deleteBar.push(i);
				for (var j = selectLeft; j < selectRight+1;j++){ // remove all the search items that were selected by that old bar 
					delete NgChm.SEL.searchItems["Column"][j];
				}
				NgChm.SUM.clearSelectionMarks();
				NgChm.SUM.drawColSelectionMarks();
				NgChm.SUM.drawRowSelectionMarks();
				if (bar.left == left && bar.right == selectedBar.right && bar.height == selectedBar.height){ // a bar that's already selected has been selected so we remove it
					addBar = false;
				}
			}
		}
		
		for (var i =deleteBar.length-1; i > -1; i--){
			selectedBars.splice(deleteBar[i],1); // remove that old bar
		}
		
		var selectLeft = Math.round((left+pointsPerLeaf/2)/pointsPerLeaf);
		var selectRight = Math.round((right+pointsPerLeaf/2)/pointsPerLeaf);
		if (addBar){
			if (shift){
				for (var i = selectLeft; i < selectRight+1;i++){
					NgChm.SEL.searchItems["Column"][i] = 1;
				}
				var numBars = selectedBars.length;
				var startIndex = 0, endIndex = -1;
				if (selectedBars[numBars-1]){
					if (selectedBars[numBars-1].right < left){
						startIndex = Math.round((selectedBars[numBars-1].right+pointsPerLeaf/2)/pointsPerLeaf);
						endIndex = selectLeft;
					} else if (right < selectedBars[numBars-1].left){
						startIndex = selectRight;
						endIndex = Math.round((selectedBars[numBars-1].left+pointsPerLeaf/2)/pointsPerLeaf);
					}
				} else if (NgChm.DET.labelLastClicked["Column"]){
					if (NgChm.DET.labelLastClicked["Column"] < left){
						startIndex = NgChm.DET.labelLastClicked["Column"];
						endIndex = selectLeft;
					} else if (right < NgChm.DET.labelLastClicked["Column"]){
						startIndex = selectRight;
						endIndex = NgChm.DET.labelLastClicked["Column"];
					}
				}
				
				for (var i = startIndex; i < endIndex; i++){
					NgChm.SEL.searchItems["Column"][i] = 1;
				}
				selectedBars.push(selectedBar);
			} else if (ctrl) {
				for (var i = selectLeft; i < selectRight+1;i++){
					NgChm.SEL.searchItems["Column"][i] = 1;
				}
				selectedBars.push(selectedBar);
			}
		}
	}
	
	this.getSelectedBars = function(){
		return selectedBars;
	}
	
	this.clearSelectedBars = function(){
		selectedBars = [];
	}
	
	this.rebuildMatrix = function(){
		dendroMatrix = buildMatrix();
	}
	
	this.findExtremes = function(i,j){
		return NgChm.DDR.findExtremes(i,j,dendroMatrix);
	}
	
	this.resize = function(){
		resize();
	}

	this.draw = function(){
		resize();
		dendroCanvas.width = NgChm.SUM.canvas.clientWidth*NgChm.SUM.matrixWidth*NgChm.SUM.widthScale/NgChm.SUM.totalWidth;
		dendroCanvas.height = parseInt(dendroConfig.height)/dendroDisplaySize * sumChm.clientHeight*NgChm.SUM.heightPct;
		draw();
	}
	
	this.drawNoResize = function () {
		draw();
	}
	
	this.clearSelection = function(){
		clearSelection();
	}
	
	function subDendroClick(event){
        NgChm.DDR.subDendroView = 'column';		
        var clickX = event.offsetX, clickY = this.height-event.offsetY;
		var matrixX = Math.round(clickX/(this.width/dendroMatrix.getNumCols())), matrixY = Math.round(clickY/(this.height/dendroMatrix.getNumRows()));
		NgChm.SUM.clearColSelectionMarks();
		NgChm.SUM.rowDendro.clearSelection();
		NgChm.SUM.colDendro.clearSelection();
		dendroMatrix = buildMatrix();
		var newDendro = highlightMatrix(matrixY,matrixX);
		if (newDendro){   
			NgChm.SUM.rowDendro.draw();
			NgChm.SUM.colDendro.draw();
		}
	}
	
	function clearSelection(){
		chosenBar = {};
		NgChm.SEL.selectedStart = 0;
		NgChm.SEL.selectedStop = 0;
        dendroBoxLeftTopArray = new Float32Array([0, 0]);
        dendroBoxRightBottomArray = new Float32Array([0, 0]);
        if (NgChm.heatMap.showColDendrogram("summary")) {
            dendroMatrix = buildMatrix();
        }
	}
	function resize(){
		dendroCanvas.style.width = NgChm.SUM.canvas.clientWidth*NgChm.SUM.matrixWidth*NgChm.SUM.widthScale/NgChm.SUM.totalWidth;
		dendroCanvas.style.left = NgChm.SUM.canvas.offsetLeft + (1-NgChm.SUM.matrixWidth*NgChm.SUM.widthScale/NgChm.SUM.totalWidth)*NgChm.SUM.canvas.offsetWidth;
		if (dendroConfig.show !== "NONE" || dendroConfig.show !== "NA"){
			dendroCanvas.style.height = parseInt(dendroConfig.height)/dendroDisplaySize*sumChm.clientHeight*NgChm.SUM.heightPct; // the dendro should take 1/5 of the height at 100% dendro height
		}else{
			dendroCanvas.style.height = 0;
		}
	}
	
	function draw(){
		if (typeof dendroMatrix !== 'undefined') {
			//get a scaled version of the dendro matrix that matches the canvas size.
			var scaledMatrix = dendroMatrix.scaleMatrix(dendroCanvas.height, dendroCanvas.width);
			var colgl = dendroCanvas.getContext("2d");
			var numRows = scaledMatrix.getNumRows()
			colgl.fillStyle = "black";

			for (var y=0; y<scaledMatrix.getNumRows(); y++){
				for (var x=0; x<scaledMatrix.getNumCols(); x++){
					// draw the non-highlighted regions
					var val = scaledMatrix.get(y, x);
					if (val > 0){
						colgl.fillRect(x,numRows-y,val,val);
					} 
				}
			}
		}
	}
	
	
	function buildMatrix(){
		bars = []; // clear out the bars array otherwise it will add more and more bars and slow everything down!
		var numNodes = dendroData.length;
		var matrixWidth = pointsPerLeaf*NgChm.heatMap.getNumColumns('d');
		if (matrixWidth < NgChm.DDR.minDendroMatrixWidth){
			pointsPerLeaf = Math.round(NgChm.DDR.minDendroMatrixWidth/NgChm.heatMap.getNumColumns('d'));
			matrixWidth = pointsPerLeaf*NgChm.heatMap.getNumColumns('d');
		} 
		var matrix = new NgChm.DDR.DendroMatrix(normDendroMatrixHeight+1, matrixWidth,false);
		
		if (normDendroMatrixHeight >= NgChm.DDR.maxDendroMatrixHeight){ // if the dendro matrix height is already at the highest possible, just build it
			for (var i = 0; i < numNodes; i++){
				var tokes = dendroData[i].split(",");
				var leftIndex = Number(tokes[0]); // index is the location of the bar in the clustered data
				var rightIndex = Number(tokes[1]);
				var height = Number(tokes[2]);
				var leftLoc = findLocationFromIndex(leftIndex); // this is the position it occupies in the dendroMatrix space
				var rightLoc = findLocationFromIndex(rightIndex);
				var normHeight = height < 0.000001*matrix.getNumRows() ? 1 : Math.round(normDendroMatrixHeight*height/maxHeight); // if the height of the bar is close enough to 0, just place it at the lowest level
				bars.push({"left":leftLoc, "right":rightLoc, "height":normHeight});
				for (var j = leftLoc; j < rightLoc; j++){
					matrix.setTrue(normHeight,j);
				}
				var drawHeight = normHeight-1;
				while (drawHeight > 0 && matrix.get(drawHeight,leftLoc) != 1){	// this fills in any spaces 		
					matrix.setTrue(drawHeight,leftLoc);
					drawHeight--;
				}
				drawHeight = normHeight;
				while (matrix.get(drawHeight,rightLoc) != 1 && drawHeight > 0){			
					matrix.setTrue(drawHeight,rightLoc);
					drawHeight--;
				}
			}
		} else { // otherwise build it and increase height as necessary
			for (var i = 0; i < numNodes; i++){
				var tokes = dendroData[i].split(",");
				var leftIndex = Number(tokes[0]); // index is the location of the bar in the clustered data
				var rightIndex = Number(tokes[1]);
				var height = Number(tokes[2]);
				var leftLoc = findLocationFromIndex(leftIndex); // this is the position it occupies in the dendroMatrix space
				var rightLoc = findLocationFromIndex(rightIndex);
				var normHeight = height < 0.000001*matrix.getNumRows() ? 1 : Math.round(normDendroMatrixHeight*height/maxHeight); // if the height of the bar is close enough to 0, just place it at the lowest level
				bars.push({"left":leftLoc, "right":rightLoc, "height":normHeight});
				for (var j = leftLoc; j < rightLoc; j++){
					if (matrix.get(normHeight,j) == 0){
						matrix.setTrue(normHeight,j);
					} else {
						normDendroMatrixHeight += 1000; // if there is a bar overlap, increase the dendro matrix height by another 500
						return;
					}
				}
				var drawHeight = normHeight-1;
				while (drawHeight > 0 && matrix.get(drawHeight,leftLoc) != 1){	// this fills in any spaces 		
					matrix.setTrue(drawHeight,leftLoc);
					drawHeight--;
				}
				drawHeight = normHeight;
				while (matrix.get(drawHeight,rightLoc) != 1 && drawHeight > 0){			
					matrix.setTrue(drawHeight,rightLoc);
					drawHeight--;
				}
			}
		}
		
		return matrix;
		
		// returns the position in terms of the 3N space
		function findLocationFromIndex(index){
			if (index < 0){
				index = 0-index; // make index a positive number to find the leaf
				return Math.round(pointsPerLeaf*index-pointsPerLeaf/2);
			} else {
				index--;
				return Math.round((bars[index].left + bars[index].right)/2); // gets the middle point of the bar
			}
		}
	}

	//Find the maximum dendro height.
	function getMaxHeight(dendroData) {
		var max = 0;
		for (var i = 0; i < dendroData.length; i++){
			var height = Number(dendroData[i].split(",")[2]);
			if (height > max)
				max = height;
		}
		return max;
	}	
	
	function highlightMatrix(i,j){
		var leftExtreme, rightExtreme;
		var vertSearchRadiusMax = Math.floor(dendroMatrix.getNumRows()/20);
		var horSearchRadiusMax = Math.floor(dendroMatrix.getNumCols()/60);
		var ip = i, id = i, jr = j, jl = j, horSearchRadius = 0,vertSearchRadius = 0;
		// search up and down for for closest dendro bar
		while (dendroMatrix.getNumRows() > ip && id > 0 && dendroMatrix.get(id,j)==0 && dendroMatrix.get(ip,j)==0 && vertSearchRadius < vertSearchRadiusMax){
			id--,ip++,vertSearchRadius++;
		}
		// search left and right for for closest dendro bar
		while (jl % dendroMatrix.getNumCols() !== 0 && jr % dendroMatrix.getNumCols() !== 0 && dendroMatrix.get(i,jl)==0 && dendroMatrix.get(i,jr)==0 && horSearchRadius < horSearchRadiusMax){
			jl--,jr++,horSearchRadius++;
		}
		if (id == 0 || ip == dendroMatrix.getNumRows() || (horSearchRadius == horSearchRadiusMax && vertSearchRadius == vertSearchRadiusMax)){
			return false;
		}
		if (dendroMatrix.get(id,j)!=0){
			i = id;
		} else if (dendroMatrix.get(ip,j)!=0){
			i = ip;
		} else if (dendroMatrix.get(i,jl)!=0){
			j = jl;
		} else if (dendroMatrix.get(i,jr)!=0){
			j = jr;
		}
		var leftAndRightExtremes = NgChm.DDR.exploreToEndOfBar(i,j,dendroMatrix); // find the endpoints of the highest level node
		var thisBar = {height:i, left: leftAndRightExtremes[0], right: leftAndRightExtremes[1]};
		var sameBarClicked = true;
		for (var key in thisBar){ 
			if (thisBar[key] != chosenBar[key]){
				sameBarClicked = false;
			}
		}
		leftExtreme = leftAndRightExtremes[0], rightExtreme = leftAndRightExtremes[1];
		if (!sameBarClicked){ // new bar clicked
			chosenBar = {height:i, left: leftExtreme, right: rightExtreme};
			leftExtreme = NgChm.DDR.findLeftEnd(i,leftExtreme,dendroMatrix);
			rightExtreme = NgChm.DDR.findRightEnd(i,rightExtreme,dendroMatrix); // L and R extreme values are in dendro matrix coords right now
			NgChm.DDR.highlightAllBranchesInRange(i,leftExtreme,rightExtreme,dendroMatrix);
			leftExtreme = NgChm.DDR.getTranslatedLocation(leftExtreme,"Column"); // L and R extreme values gets converted to heatmap locations
			rightExtreme = NgChm.DDR.getTranslatedLocation(rightExtreme,"Column");
									
			
			// Set start and stop coordinates
			var rhRatio = NgChm.heatMap.getColSummaryRatio(NgChm.MMGR.RIBBON_HOR_LEVEL);
			var summaryRatio = NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL);
			NgChm.SEL.selectedStart = Math.round(leftExtreme*summaryRatio);// +1;
			NgChm.SEL.selectedStop = Math.round(rightExtreme*summaryRatio);// +1;
			NgChm.DET.clearSearchItems("Column");
			NgChm.SUM.drawColSelectionMarks();
			NgChm.SEL.changeMode('RIBBONH');
		} else { // same bar clicked
			chosenBar = {};
			NgChm.SUM.clearSelectionMarks();
			NgChm.DET.clearSearchItems("Column");
			NgChm.SUM.drawColSelectionMarks();
			if (NgChm.DET.getSearchLabelsByAxis("Column").length == 0){
				NgChm.DET.clearSearch();
			}
			NgChm.SEL.selectedStart = 0;
			NgChm.SEL.selectedStop = 0;
			NgChm.SEL.changeMode('NORMAL');
		}
		return true;
	}
}




/***************************
 *  SUMMARY ROW DENDROGRAM *
 ***************************/
NgChm.DDR.SummaryRowDendrogram = function() {
	// internal variables
	var dendroDisplaySize = NgChm.DDR.minDendroMatrixHeight; // this is a static number used to determine how big the dendro canvas will be in conjunction with the dendroConfig.heigh property
	var pointsPerLeaf = 3; // each leaf will get 3 points in the dendrogram array. This is to avoid lines being right next to each other
	var bars = [];
	var chosenBar = {};
	var dendroCanvas = document.getElementById('row_dendro_canvas');
	var dendroConfig = NgChm.heatMap.getRowDendroConfig();
	var hasData = dendroConfig.show === 'NA' ? false : true;
	var dendroData = NgChm.heatMap.getRowDendroData();
	var normDendroMatrixHeight = Math.min(Math.max(NgChm.DDR.minDendroMatrixHeight,dendroData.length),NgChm.DDR.maxDendroMatrixHeight); // this is the height of the dendro matrices created in buildDendroMatrix
	var maxHeight = dendroData.length > 0 ? getMaxHeight(dendroData) : 0; // this assumes the heightData is ordered from lowest height to highest
	var dendroMatrix;
	if (hasData) {
		while(dendroMatrix == undefined){dendroMatrix = buildMatrix();}
	}
	var originalDendroMatrix = dendroMatrix;
	var selectedBars = [];
	var sumChm = document.getElementById("summary_chm");
	
	// event listeners
	dendroCanvas.addEventListener('click',subDendroClick);
	
	// public functions
	this.getDivWidth = function(){
		// the dendrogram will take up 1/5 of the summary side by default (100% = 1/5 of summary_chm).
		if (dendroConfig.show == "NONE" || dendroConfig.show == "NA"){
			return 0;
		}
		return parseInt(dendroConfig.height)/dendroDisplaySize*sumChm.clientWidth;
	}
	this.getDivHeight = function(){
		return parseInt(dendroCanvas.clientHeight);
	}
	this.getBars = function(){
		return bars;
	}
	this.getDendroMatrixHeight = function(){
		return normDendroMatrixHeight;
	}
	this.getDendroMatrix = function(){
		return dendroMatrix;
	}
	this.getPointsPerLeaf = function(){
		return pointsPerLeaf;
	}
	
	this.addSelectedBar = function(extremes, shift,ctrl){
		var left = extremes.left;
		var right = extremes.right;
		var height = extremes.height;
		var selectLeft = Math.round((left+pointsPerLeaf/2)/pointsPerLeaf);
		var selectRight =Math.round((right+pointsPerLeaf/2)/pointsPerLeaf);
		var addBar = true;
		var selectedBar = extremes;
		// is it a standard click?
		if (!shift && !ctrl){
			NgChm.DET.clearSearchItems("Row");
			for (var i = selectLeft; i < selectRight+1;i++){
				NgChm.SEL.searchItems["Row"][i] = 1;
			}
			
			selectedBars = [selectedBar];
			return;
		}
		
		var deleteBar = []; // bars that need to be removed due to this new click
		for (var i in selectedBars){
			var bar = selectedBars[i];
			if (bar.left <= left && bar.right >= right && bar.height > height){
				addBar = false;
			} 
			if (bar.left >= left && bar.right <= right && bar.height-1 <= height){ // if the new selected bar is in the bounds of an older one... (-1 added to height since highlighted bars can cause issues without it)
				deleteBar.push(i);
				for (var j = selectLeft; j < selectRight+1;j++){ // remove all the search items that were selected by that old bar 
					delete NgChm.SEL.searchItems["Row"][j];
				}
				NgChm.SUM.clearSelectionMarks();
				NgChm.SUM.drawColSelectionMarks();
				NgChm.SUM.drawRowSelectionMarks();
				if (bar.left == left && bar.right == selectedBar.right && bar.height == selectedBar.height){ // a bar that's already selected has been selected so we remove it
					addBar = false;
				}
			}
		}
		
		for (var i =deleteBar.length-1; i > -1; i--){
			selectedBars.splice(deleteBar[i],1); // remove that old bar
		}
		
		var selectLeft = Math.round((left+pointsPerLeaf/2)/pointsPerLeaf);
		var selectRight = Math.round((right+pointsPerLeaf/2)/pointsPerLeaf);
		if (addBar){
			if (shift){
				for (var i = selectLeft; i < selectRight+1;i++){
					NgChm.SEL.searchItems["Row"][i] = 1;
				}
				var numBars = selectedBars.length;
				var startIndex = 0, endIndex = -1;
				if (selectedBars[numBars-1]){
					if (selectedBars[numBars-1].right < left){
						startIndex = Math.round((selectedBars[numBars-1].right+pointsPerLeaf/2)/pointsPerLeaf);
						endIndex = selectLeft;
					} else if (right < selectedBars[numBars-1].left){
						startIndex = selectRight;
						endIndex = Math.round((selectedBars[numBars-1].left+pointsPerLeaf/2)/pointsPerLeaf);
					}
				} else if (NgChm.DET.labelLastClicked["Row"]){
					if (NgChm.DET.labelLastClicked["Row"] < left){
						startIndex = NgChm.DET.labelLastClicked["Row"];
						endIndex = selectLeft;
					} else if (right < NgChm.DET.labelLastClicked["Row"]){
						startIndex = selectRight;
						endIndex = NgChm.DET.labelLastClicked["Row"];
					}
				}
				
				for (var i = startIndex; i < endIndex; i++){
					NgChm.SEL.searchItems["Row"][i] = 1;
				}
				selectedBars.push(selectedBar);
			} else if (ctrl) {
				for (var i = selectLeft; i < selectRight+1;i++){
					NgChm.SEL.searchItems["Row"][i] = 1;
				}
				selectedBars.push(selectedBar);
			}
		}
	}
	
	this.getSelectedBars = function(){
		return selectedBars;
	}	
	
	this.clearSelectedBars = function(){
		selectedBars = [];
	}
	
	this.rebuildMatrix = function(){
		dendroMatrix = buildMatrix();
	}
	this.resize = function(){
		resize();
	}
	
	this.findExtremes = function(i,j){
		return NgChm.DDR.findExtremes(i,j,dendroMatrix);
	}
	
	this.draw = function(){
		resize();
		dendroCanvas.height = NgChm.SUM.canvas.clientHeight*NgChm.SUM.matrixHeight*NgChm.SUM.heightScale/NgChm.SUM.totalHeight;
		dendroCanvas.width = dendroConfig.height/dendroDisplaySize*sumChm.clientWidth*NgChm.SUM.widthPct;
		draw();
	}
	
	this.drawNoResize = function(){
		draw();
	}
	
	this.clearSelection = function(){
		clearSelection();
	}
	
	// internal functions
	function subDendroClick(event){
         NgChm.DDR.subDendroView = 'row';		
		var clickX = event.offsetX, clickY = event.offsetY;
        var matrixX = Math.round(clickY/(this.height/dendroMatrix.getNumCols()));
        var matrixY = Math.round((this.width-clickX)/(this.width/dendroMatrix.getNumRows()));
		NgChm.SUM.clearRowSelectionMarks();
		NgChm.SUM.colDendro.clearSelection();
		NgChm.SUM.rowDendro.clearSelection();
		dendroMatrix = buildMatrix();
		var newDendro = highlightMatrix(matrixY,matrixX);
		if (newDendro){
			NgChm.SUM.rowDendro.draw();
			NgChm.SUM.colDendro.draw();
		}
	}
	function clearSelection(){
		chosenBar = {};
		NgChm.SEL.selectedStart = 0;
		NgChm.SEL.selectedStop = 0;
        dendroBoxLeftTopArray = new Float32Array([0, 0]);
        dendroBoxRightBottomArray = new Float32Array([0, 0]);
        if (NgChm.heatMap.showRowDendrogram("summary")) {
            dendroMatrix = buildMatrix();
        }
	}
	
	function resize(){
		dendroCanvas.style.height = NgChm.SUM.canvas.clientHeight*NgChm.SUM.matrixHeight/NgChm.SUM.totalHeight*NgChm.SUM.heightScale;
		dendroCanvas.style.top = NgChm.SUM.canvas.offsetTop + (NgChm.SUM.totalHeight - NgChm.SUM.matrixHeight*NgChm.SUM.heightScale)/NgChm.SUM.totalHeight*NgChm.SUM.canvas.offsetHeight;
		if (dendroConfig.show !== "NONE" || dendroConfig.show !== "NA"){
			dendroCanvas.style.width = dendroConfig.height/dendroDisplaySize*sumChm.clientWidth*NgChm.SUM.widthPct;
		} else {
			dendroCanvas.style.width = 0;
		}
	}
	
	function draw(){
		if (typeof dendroMatrix !== 'undefined') {
			//get a scaled version of the dendro matrix that matches the canvas size.
			var scaledMatrix = dendroMatrix.scaleMatrix(dendroCanvas.width, dendroCanvas.height);

			var rowgl = dendroCanvas.getContext("2d");
			rowgl.fillStyle = "black";
			var numRows = scaledMatrix.getNumRows();
			var numCols = scaledMatrix.getNumCols();

			for (var x=0; x<scaledMatrix.getNumCols(); x++){
				for (var y=0; y<scaledMatrix.getNumRows(); y++){
					// draw the non-highlighted regions
					var val = scaledMatrix.get(y, x);
					if (val > 0){
						rowgl.fillRect(numRows-y, x, val,val);
					}
				}
			}	
		}
	}
	
	function buildMatrix(){
		bars = []; // clear out the bars array otherwise it will add more and more bars and slow everything down!
		var numNodes = dendroData.length;
		var maxHeight = getMaxHeight(dendroData);
		var matrixWidth = pointsPerLeaf*NgChm.heatMap.getNumRows('d');
		if (matrixWidth < NgChm.DDR.minDendroMatrixWidth){
			pointsPerLeaf = Math.round(NgChm.DDR.minDendroMatrixWidth/NgChm.heatMap.getNumRows('d'));
			matrixWidth = pointsPerLeaf*NgChm.heatMap.getNumRows('d');
		} 
		var matrix = new NgChm.DDR.DendroMatrix(normDendroMatrixHeight+1, matrixWidth,true);
		
		if (normDendroMatrixHeight >= NgChm.DDR.maxDendroMatrixHeight){ // if the dendro matrix height is already at the highest possible, just build it
			for (var i = 0; i < numNodes; i++){
				var tokes = dendroData[i].split(",");
				var leftIndex = Number(tokes[0]); // index is the location of the bar in the clustered data
				var rightIndex = Number(tokes[1]);
				var height = Number(tokes[2]);
				var leftLoc = findLocationFromIndex(leftIndex); // this is the position it occupies in the dendroMatrix space
				var rightLoc = findLocationFromIndex(rightIndex);
				var normHeight = height < 0.000001*matrix.getNumRows() ? 1 : Math.round(normDendroMatrixHeight*height/maxHeight); // if the height of the bar is close enough to 0, just place it at the lowest level
				bars.push({"left":leftLoc, "right":rightLoc, "height":normHeight});
				for (var j = leftLoc; j < rightLoc; j++){
					matrix.setTrue(normHeight,j);
				}
				var drawHeight = normHeight-1;
				while (drawHeight > 0 && matrix.get(drawHeight,leftLoc) != 1){	// this fills in any spaces 		
					matrix.setTrue(drawHeight,leftLoc);
					drawHeight--;
				}
				drawHeight = normHeight;
				while (matrix.get(drawHeight,rightLoc) != 1 && drawHeight > 0){			
					matrix.setTrue(drawHeight,rightLoc);
					drawHeight--;
				}
			}
		} else { // otherwise build it and increase height as necessary
			for (var i = 0; i < numNodes; i++){
				var tokes = dendroData[i].split(",");
				var leftIndex = Number(tokes[0]); // index is the location of the bar in the clustered data
				var rightIndex = Number(tokes[1]);
				var height = Number(tokes[2]);
				var leftLoc = findLocationFromIndex(leftIndex); // this is the position it occupies in the dendroMatrix space
				var rightLoc = findLocationFromIndex(rightIndex);
				var normHeight = height < 0.000001*matrix.getNumRows() ? 1 : Math.round(normDendroMatrixHeight*height/maxHeight); // if the height of the bar is close enough to 0, just place it at the lowest level
				bars.push({"left":leftLoc, "right":rightLoc, "height":normHeight});
				for (var j = leftLoc; j < rightLoc; j++){
					if (matrix.get(normHeight,j) == 0){
						matrix.setTrue(normHeight,j);
					} else {
						normDendroMatrixHeight += 1000; // if there is a bar overlap, increase the dendro matrix height by another 500
						return;
					}
				}
				var drawHeight = normHeight-1;
				while (drawHeight > 0 && matrix.get(drawHeight,leftLoc) != 1){	// this fills in any spaces 		
					matrix.setTrue(drawHeight,leftLoc);
					drawHeight--;
				}
				drawHeight = normHeight;
				while (matrix.get(drawHeight,rightLoc) != 1 && drawHeight > 0){			
					matrix.setTrue(drawHeight,rightLoc);
					drawHeight--;
				}
			}
		}
	
		return matrix;
		
		// returns the position in terms of the 3N space
		function findLocationFromIndex(index){
			if (index < 0){
				index = 0-index; // make index a positive number to find the leaf
				return Math.round(pointsPerLeaf*index-pointsPerLeaf/2); // all leafs should occupy the middle space of the 3 points available
			} else {
				index--;
				return Math.round((bars[index].left + bars[index].right)/2); // gets the middle point of the bar
			}
		}
	}
	
	//Find the maximum dendro height.
	function getMaxHeight(dendroData) {
		var max = 0;
		for (var i = 0; i < dendroData.length; i++){
			var height = Number(dendroData[i].split(",")[2]);
			if (height > max)
				max = height;
		}
		return max;
	}
	
	function highlightMatrix(i, j){ // i-th row, j-th column of dendro matrix
		var leftExtreme, rightExtreme;
		var vertSearchRadiusMax = Math.floor(dendroMatrix.getNumRows()/20);
		var horSearchRadiusMax = Math.floor(dendroMatrix.getNumCols()/60);
		var ip = i, id = i, jr = j, jl = j, horSearchRadius = 0,vertSearchRadius = 0;
		// search up and down for for closest dendro bar
		while (dendroMatrix.getNumRows() > ip && id > 0 && dendroMatrix.get(id,j)==0 && dendroMatrix.get(ip,j)==0 && vertSearchRadius < vertSearchRadiusMax){
			id--,ip++,vertSearchRadius++;
		}
		// search left and right for for closest dendro bar
		while (jl % dendroMatrix.getNumCols() !== 0 && jr % dendroMatrix.getNumCols() !== 0 && dendroMatrix.get(i,jl)==0 && dendroMatrix.get(i,jr)==0 && horSearchRadius < horSearchRadiusMax){
			jl--,jr++,horSearchRadius++;
		}
		if (id == 0 || ip == dendroMatrix.getNumRows() || (horSearchRadius == horSearchRadiusMax && vertSearchRadius == vertSearchRadiusMax)){
			return false;
		}
		if (dendroMatrix.get(id,j)!=0){
			i = id;
		} else if (dendroMatrix.get(ip,j)!=0){
			i = ip;
		} else if (dendroMatrix.get(i,jl)!=0){
			j = jl;
		} else if (dendroMatrix.get(i,jr)!=0){
			j = jr;
		}
		var leftAndRightExtremes = NgChm.DDR.exploreToEndOfBar(i,j,dendroMatrix); // find the endpoints of the highest level node
		var thisBar = {height:i, left: leftAndRightExtremes[0], right: leftAndRightExtremes[1]};
		var sameBarClicked = true;
		for (var key in thisBar){ 
			if (thisBar[key] != chosenBar[key]){
				sameBarClicked = false;
			}
		}
		leftExtreme = leftAndRightExtremes[0], rightExtreme = leftAndRightExtremes[1];
		if (!sameBarClicked){ // new bar clicked
			chosenBar = {height:i, left: leftExtreme, right: rightExtreme};
			leftExtreme = NgChm.DDR.findLeftEnd(i,leftExtreme,dendroMatrix);
			rightExtreme = NgChm.DDR.findRightEnd(i,rightExtreme,dendroMatrix); // L and R extreme values are in dendro matrix coords right now
			NgChm.DDR.highlightAllBranchesInRange(i,leftExtreme,rightExtreme,dendroMatrix);
			
			leftExtreme = NgChm.DDR.getTranslatedLocation(leftExtreme,"Row"); // L and R extreme values gets converted to heatmap locations
			rightExtreme = NgChm.DDR.getTranslatedLocation(rightExtreme,"Row");
			
			// Set start and stop coordinates
			var rvRatio = NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.RIBBON_VERT_LEVEL);
			var summaryRatio = NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL);
			NgChm.SEL.selectedStart = Math.round(leftExtreme*summaryRatio);// +1;
			NgChm.SEL.selectedStop = Math.round(rightExtreme*summaryRatio);// +1;
			NgChm.DET.clearSearchItems("Row");
			NgChm.SEL.changeMode('RIBBONV');
			NgChm.SUM.drawRowSelectionMarks();
		}else{
			chosenBar = {};
			NgChm.SUM.clearSelectionMarks();
			NgChm.DET.clearSearchItems("Row");
			NgChm.SUM.drawRowSelectionMarks();
			if (NgChm.DET.getSearchLabelsByAxis("Row").length == 0){
				clearSearch();
			}
			NgChm.SEL.selectedStart = 0;
			NgChm.SEL.selectedStop = 0;
			dendroBoxLeftTopArray = new Float32Array([0, 0]); 
			dendroBoxRightBottomArray = new Float32Array([0, 0]);  
			NgChm.SEL.changeMode('NORMAL');
		}
		return true;
	}
	
}


/********************************************
 *  FUNCTIONS SHARED BY ROW AND COL DENDROS *
*********************************************/
NgChm.DDR.maxDendroMatrixHeight = 3000;
NgChm.DDR.minDendroMatrixHeight = 500;
NgChm.DDR.minDendroMatrixWidth = 500;
NgChm.DDR.pointsPerLeaf = 3; // each leaf will get 3 points in the dendrogram array. This is to avoid lines being right next to each other

NgChm.DDR.findExtremes = function(i,j,matrix) { // uses summary dendro matrix (even for detail clicks) to find the selected bar and ends of the selected it
	var searchRadiusMaxX = matrix.isRow() ? Math.ceil(NgChm.SEL.dataPerCol/NgChm.heatMap.getColSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL)/10) : 
											Math.ceil(NgChm.SEL.dataPerRow/NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL)/10);
	var searchRadiusMaxY = matrix.isRow() ? Math.ceil((matrix.getNumRows()*NgChm.SEL.dataPerCol/NgChm.SUM.matrixHeight)/NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL)/10) : 
											Math.ceil((matrix.getNumRows()*NgChm.SEL.dataPerRow/NgChm.SUM.matrixWidth)/NgChm.heatMap.getColSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL)/10);
	var ip = i, id = i, jr = j, jl = j, searchRadius = 0,searchRadiusX = 0,searchRadiusY = 0;
	while (matrix.getNumRows() > ip && id > 0 && matrix.get(id,j)==0 && matrix.get(ip,j)==0 && searchRadiusY < searchRadiusMaxY){
		id--,ip++,searchRadiusY++;
	}
	while (jl % matrix.getNumCols() !== 0 && jr % matrix.getNumCols() !== 0 && matrix.get(i,jl)==0 && matrix.get(i,jr)==0 && searchRadiusX < searchRadiusMaxX){
		jl--,jr++,searchRadiusX++;
	}
	if (id == 0 || ip == matrix.getNumRows() || (searchRadiusX == searchRadiusMaxX && searchRadiusY == searchRadiusMaxY)){
		return false;
	}
	if (matrix.get(id,j)!=0){
		i = id;
	} else if (matrix.get(ip,j)!=0){
		i = ip;
	} else if (matrix.get(i,jl)!=0){
		j = jl;
	} else if (matrix.get(i,jr)!=0){
		j = jr;
	}
	var top = i;
	var left = j;
	var right = j;
	while (i != 0 && left != 0){ // as long as we aren't at the far left or the very bottom, keep moving
		if (matrix.get(i,left-1) !== 0){ // can we keep moving left?
			left--;
		} else {//if (dendroMatrix[i-1][j] == 1 ||dendroMatrix[i-1][j] == 2){ // can we move towards the bottom?
			i--;
		}
	}
	i = top;
	while (i != 0 && right <= matrix.getNumCols()){
		if (matrix.get(i,right+1) !== 0){
			right++;
		} else {//if (dendroMatrix[i-1][j] == 1 ||dendroMatrix[i-1][j] == 2){
			i--;
		}
	}
	return {"left":left,"right":right,"height":top};
}

NgChm.DDR.getTranslatedLocation = function(location,axis) {
	var PPL = axis == "Row" ? NgChm.SUM.rowDendro.getPointsPerLeaf() : NgChm.SUM.colDendro.getPointsPerLeaf(); 
	var summaryRatio = NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL);//  This line doesn't look right, but it works this way. This method doesn't work: axis == "Row" ? NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL) :  NgChm.heatMap.getColSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL);;
	return (location/summaryRatio)/PPL;
}

NgChm.DDR.exploreToEndOfBar = function(i,j, dendroMatrix) {
	var leftExtreme = j, rightExtreme = j;
	while (dendroMatrix.get(i,rightExtreme+1)==1 || dendroMatrix.get(i,rightExtreme+1)==2){ // now find the right and left end points of the line in the matrix and highlight as we go
		rightExtreme++;
	}
	while (dendroMatrix.get(i,leftExtreme-1)==1 || dendroMatrix.get(i,leftExtreme-1)==2){
		leftExtreme--;
	}
	return [leftExtreme,rightExtreme];
}

NgChm.DDR.findLeftEnd = function(i,j, dendroMatrix) {
	dendroMatrix.setTrue(i,j,true);
	while (i != 0 && j != 0){ // as long as we aren't at the far left or the very bottom, keep moving
		if (dendroMatrix.get(i,j-1) == 1 ||dendroMatrix.get(i,j-1) == 2){ // can we keep moving left?
			j--;
			dendroMatrix.setTrue(i,j,true);
		} else {//if (dendroMatrix[i-1][j] == 1 ||dendroMatrix[i-1][j] == 2){ // can we move towards the bottom?
			i--;
			dendroMatrix.setTrue(i,j,true);
		}
	}
	return j;
}

NgChm.DDR.findRightEnd = function(i,j, dendroMatrix) {
	dendroMatrix.setTrue(i,j,true);
	while (i != 0 && j <= dendroMatrix.getNumCols()){
		if (dendroMatrix.get(i,j+1) == 1 ||dendroMatrix.get(i,j+1) == 2){
			j++;
			dendroMatrix.setTrue(i,j,true);
		} else {//if (dendroMatrix[i-1][j] == 1 ||dendroMatrix[i-1][j] == 2){
			i--;
			dendroMatrix.setTrue(i,j,true);
		}
	}
	return j;
}

NgChm.DDR.highlightAllBranchesInRange = function(height,leftExtreme,rightExtreme,dendroMatrix) {
	for (var i = 0; i < height; i++){
		for (var j = leftExtreme; j < rightExtreme; j++){
			if (dendroMatrix.get(i,j) !== 0){
				dendroMatrix.setTrue(i,j,true);
			}
		}
	}
	return dendroMatrix;
}

NgChm.DDR.clearDendroSelection = function() {
	if (NgChm.SEL.selectedStart != 0) {
		NgChm.SEL.selectedStart = 0;
		NgChm.SEL.selectedStop = 0;
        dendroBoxLeftTopArray = new Float32Array([0, 0]);
        dendroBoxRightBottomArray = new Float32Array([0, 0]);
        if (NgChm.heatMap.showRowDendrogram("summary") &&  (NgChm.DDR.subDendroView === 'row')) {
            NgChm.SUM.rowDendro.rebuildMatrix();
            NgChm.SUM.rowDendro.draw();
        }
        if (NgChm.heatMap.showColDendrogram("summary")  &&  (NgChm.DDR.subDendroView === 'column')) {
            NgChm.SUM.colDendro.rebuildMatrix();
            NgChm.SUM.colDendro.draw();
        }
	}
     NgChm.DDR.subDendroView = 'none';  
}

NgChm.DDR.matrixToAsciiPrint = function(matrix) { // this is just a debug function to see if the dendrogram looks correct. paste "line" into a text editor and decrease the font. input is the dendrogram matrix.
	var line = "";
	for (var i = matrix.length-1; i > -1; i--){
		for (var j = 0; j < matrix[i].length; j++){
			if (matrix[i][j] == 1){
				line += "=";
			}else if (matrix[i][j] == 2){
				line += "+";
			}else{
				line += ".";
			}
		}
		line += "\n";
	}
	console.log(line);
}
NgChm.DDR.dendroMatrixToAsciiPrint = function(matrix) { // this is just a debug function to see if the dendrogram looks correct. paste "line" into a text editor and decrease the font. input is the dendrogram matrix.
	var line = "";
	for (var y=matrix.getNumRows(); y>-1; y--){
		for (var x=0; x<matrix.getNumCols(); x++){
			// draw the non-highlighted regions
			var val = matrix.get(y, x);
			if (val > 0){
				line += "=";
			} else {
				line += ".";
			}
		}
		line += "\n";
	}	
	console.log(line);
}

/**************************
 *  DETAIL ROW DENDROGRAM *
 **************************/
NgChm.DDR.DetailRowDendrogram = function() {
	
	// internal variables
	var dendroDisplaySize = NgChm.DDR.minDendroMatrixHeight; // this is a static number used to determine how big the dendro canvas will be in conjunction with the dendroConfig.heigh property
	var pointsPerLeaf = 3; // each leaf will get 3 points in the dendrogram array. This is to avoid lines being right next to each other
	var bars = [];
	var chosenBar = {};
	var detailCanvas = document.getElementById('detail_canvas');
	var dendroCanvas = document.getElementById('detail_row_dendro_canvas');
	var dendroConfig = NgChm.heatMap.getRowDendroConfig();
	var hasData = dendroConfig.show === 'NA' ? false : true;
	var dendroData = NgChm.heatMap.getRowDendroData();
	var normDendroMatrixHeight = Math.min(Math.max(NgChm.DDR.minDendroMatrixHeight,dendroData.length),NgChm.DDR.maxDendroMatrixHeight); // this is the height of the dendro matrices created in buildDendroMatrix
	var maxHeight = dendroData.length > 0 ? getMaxHeight(dendroData) : 0; // this assumes the heightData is ordered from lowest height to highest
	var dendroMatrix;
	var zoomLevel = 1;
	var lastTouchLoc;
	
	dendroCanvas.onwheel = scroll;
	dendroCanvas.onclick = click;
	dendroCanvas.ontouchmove = scroll;
	dendroCanvas.ontouchend = touchEnd;
	
	this.getDivWidth = function(){
		return dendroCanvas.clientWidth;
	}
	this.getDivHeight = function(){
		return dendroCanvas.clientHeight;
	}
	this.resize = function(){
		resize();
	}
	this.draw = function(){
		draw();
	}
	this.resizeAndDraw = function(){
		resize();
		draw();
	}
	
	function scroll(e){
		e.preventDefault();
		e.stopPropagation();
		if (!lastTouchLoc && e.touches){
			lastTouchLoc = e.touches[0].clientX;
			return;
		}
		var deltaY = e.touches ? e.touches[0].clientX - lastTouchLoc : e.deltaY;
		if (e.touches){
			lastTouchLoc = e.touches[0].clientX;
		}
		zoomLevel -= deltaY/400;
		if (zoomLevel < 0.1) zoomLevel = .1;
		if (zoomLevel > 100) zoomLevel = 100;
		draw();
	}
	
	function touchEnd(e){
		lastTouchLoc = null;
	}
	
	function click(e){
		var offsetX = e.offsetX;
		var offsetY = e.offsetY;
		NgChm.DET.mouseDown = true;		
		var heightRatio = zoomLevel*NgChm.heatMap.getNumRows(NgChm.MMGR.DETAIL_LEVEL)/NgChm.SEL.dataPerCol;
		var X = NgChm.SEL.currentRow + (NgChm.SEL.dataPerCol*(offsetY/dendroCanvas.height));
		var Y = (dendroCanvas.clientWidth-offsetX)/dendroCanvas.clientWidth/heightRatio;
		var matrixX = Math.round(X*NgChm.SUM.rowDendro.getPointsPerLeaf()-NgChm.SUM.rowDendro.getPointsPerLeaf()/2);
		var matrixY = Math.round(Y*NgChm.SUM.rowDendro.getDendroMatrixHeight());
		var extremes = NgChm.SUM.rowDendro.findExtremes(matrixY,matrixX);
		if (extremes){
			NgChm.SUM.rowDendro.addSelectedBar(extremes,e.shiftKey,e.metaKey||e.ctrlKey);
			draw();
		}
		NgChm.SUM.clearSelectionMarks();
		NgChm.SEL.updateSelection();
		NgChm.SUM.drawColSelectionMarks();
		NgChm.SUM.drawRowSelectionMarks();
		NgChm.SUM.drawTopItems();
	}
	
	
	function draw(){
		var dendroConfig = NgChm.heatMap.getRowDendroConfig();
		var hasData = dendroConfig.show === 'NA' ? false : true;
		if (hasData) {
			dendroMatrix = buildMatrix(NgChm.SEL.currentRow, NgChm.SEL.currentRow+NgChm.SEL.dataPerCol, NgChm.heatMap.getNumRows(NgChm.MMGR.DETAIL_LEVEL)/NgChm.SEL.dataPerCol*zoomLevel);
			if (typeof dendroMatrix !== 'undefined') {
				//get a scaled version of the dendro matrix that matches the canvas size.
				var scaledMatrix = dendroMatrix.scaleMatrix(dendroCanvas.width, dendroCanvas.height);
				var rowgl = dendroCanvas.getContext("2d");
				rowgl.clearRect(0, 0, dendroCanvas.width, dendroCanvas.height);
				rowgl.fillStyle = "black";
				var numRows = scaledMatrix.getNumRows();
				var numCols = scaledMatrix.getNumCols();
	
				for (var x=0; x<scaledMatrix.getNumCols(); x++){
					for (var y=0; y<scaledMatrix.getNumRows(); y++){
						// draw the non-highlighted regions
						var val = scaledMatrix.get(y, x);
						if (val > 0){
							rowgl.fillRect(numRows-y, x, val,val);
						}
					}
				}
			}
		}
	}
	
	function resize(){
		var width = dendroConfig.height/dendroDisplaySize*document.getElementById('detail_chm').clientWidth+ NgChm.SUM.paddingHeight;
		var top = NgChm.DET.colDendro.getDivHeight() + NgChm.SUM.paddingHeight;
		dendroCanvas.style.top = top + NgChm.DET.canvas.clientHeight * (1-NgChm.DET.dataViewHeight/NgChm.DET.canvas.height);
		if (dendroConfig.show == "ALL"){
			dendroCanvas.style.width = width;
			dendroCanvas.style.height = NgChm.DET.canvas.clientHeight * (NgChm.DET.dataViewHeight/NgChm.DET.canvas.height)-2;
			dendroCanvas.width = Math.round(width);
			dendroCanvas.height = Math.round(NgChm.DET.canvas.clientHeight * (NgChm.DET.dataViewHeight/NgChm.DET.canvas.height));
		} else {
			dendroCanvas.style.width = 0;
		}
	}
	
	function buildMatrix(start, stop, heightRatio) {
		var start3NIndex = convertMapIndexTo3NSpace(start);
		var stop3NIndex = convertMapIndexTo3NSpace(stop);
		var boxLength, currentIndex, matrixWidth, dendroBars, dendroInfo, PPL;
		
		var selectedBars;
		
		dendroInfo = NgChm.heatMap.getRowDendroData(); // dendro JSON object
		boxLength = NgChm.DET.dataBoxHeight;
		matrixWidth = NgChm.DET.dataViewHeight;
		dendroBars = NgChm.SUM.rowDendro.getBars();
		selectedBars = NgChm.SUM.rowDendro.getSelectedBars();
		PPL = NgChm.SUM.rowDendro.getPointsPerLeaf();
		var numNodes = dendroInfo.length;
		var lastRow = dendroInfo[numNodes-1];
		var matrix = new NgChm.DDR.DendroMatrix(normDendroMatrixHeight+1, matrixWidth-1,true);
		var topLineArray = new Array(matrixWidth-1); // this array is made to keep track of which bars have vertical lines that extend outside the matrix
		var maxHeight = getMaxHeight(dendroData)/(heightRatio); // this assumes the heightData is ordered from lowest height to highest
		var branchCount = 0;
		
		// check the left and right endpoints of each bar, and see if they are within the bounds.
		// then check if the bar is in the desired height. 
		// if it is, draw it in its entirety, otherwise, see if the bar has a vertical connection with any of the bars in view
		for (var i = 0; i < numNodes; i++){
			var bar = dendroInfo[i];
			var tokes = bar.split(",");
			var leftJsonIndex = Number(tokes[0]);
			var rightJsonIndex = Number(tokes[1]);
			var height = Number(tokes[2]);
			var left3NIndex = convertJsonIndexTo3NSpace(leftJsonIndex); // location in dendroBars space
			var right3NIndex = convertJsonIndexTo3NSpace(rightJsonIndex);
			if (right3NIndex < start3NIndex || stop3NIndex < left3NIndex){continue;} //if the bar exists outside of the viewport, skip it
			
			var leftLoc = convertJsonIndexToDataViewSpace(leftJsonIndex); // Loc is the location in the dendro matrix
			var rightLoc = convertJsonIndexToDataViewSpace(rightJsonIndex);
			var normHeight = height < 0.000001*matrix.getNumCols() ? 1 : Math.max(Math.round(normDendroMatrixHeight*height/maxHeight),1); // height in matrix (if height is roughly 0, treat as such)
			var leftEnd = Math.max(leftLoc, 1);
			var rightEnd = Math.min(rightLoc, matrixWidth-1);
			
			//  determine if the bar is within selection??
			var bold = false;
			if (selectedBars){
				for (var k = 0; k < selectedBars.length; k++){
					var selectedBar = selectedBars[k];
					if ((selectedBar.left <= left3NIndex && right3NIndex <= selectedBar.right) && Math.round(500*height/(maxHeight*heightRatio)) <= selectedBar.height){
						bold = true;
					}
				}
			}
			
			if (height > maxHeight){ // if this line is beyond the viewport max height
				if (start3NIndex > 1 && start3NIndex <= right3NIndex &&  right3NIndex < stop3NIndex -PPL/2 && topLineArray[rightLoc] != 1){ // check to see if it will be connecting vertically to a line in the matrix 
					var drawHeight = normDendroMatrixHeight;
					while (drawHeight > 0 && !matrix.get(drawHeight,rightLoc)){ // these are the lines that will be connected to the highest level dendro leaves
						matrix.setTrue(drawHeight,rightLoc, bold);
						drawHeight--;
					}
				}
				if (start3NIndex > 1 && start3NIndex <= left3NIndex &&  left3NIndex < stop3NIndex-PPL/2 && topLineArray[leftLoc] != 1){// these are the lines that will be connected to the highest level dendro leaves (stop3NIndex-1 to prevent extra line on far right)
					var drawHeight = normDendroMatrixHeight;
					while (drawHeight > 0 && !matrix.get(drawHeight,leftLoc)){
						matrix.setTrue(drawHeight,leftLoc, bold);
						drawHeight--;
					}
				}
				for (var loc = leftEnd; loc < rightEnd; loc++){
					topLineArray[loc] = 1; // mark that the area covered by this bar can no longer be drawn in  by another, higher level bar
				}
			} else { // this line is within the viewport height
				branchCount++;
				for (var j = leftEnd; j < rightEnd; j++){ // draw horizontal lines
					matrix.setTrue(normHeight,j,bold);
				}
				var drawHeight = normHeight-1;
				while (drawHeight > 0 && !matrix.get(drawHeight,leftLoc) && Math.floor(boxLength/2-1) <= leftLoc  && leftLoc <= matrixWidth-Math.floor(boxLength/2)){	// draw left vertical line
					matrix.setTrue(drawHeight,leftLoc,bold);
					drawHeight--;
				}
				drawHeight = normHeight;
				while (!matrix.get(drawHeight,rightLoc) && drawHeight > 0 && Math.floor(boxLength/2-1) <= rightLoc && rightLoc <= matrixWidth-Math.floor(boxLength/2)){ // draw right vertical line
					matrix.setTrue(drawHeight,rightLoc,bold);
					drawHeight--;
				}
			}
		}

		// this counts the number of spots that are heatmap breaks.
		var gapBreaks = 0;
		var numLeafsToShow = 0;
		for (var j = 0; j < stop-start; j++){ // this counts the number of spots that are not heatmap breaks. if we don't do this, we get the weird "comb"
			if (NgChm.heatMap.getValue(NgChm.MMGR.DETAIL_LEVEL,1,start+j) > NgChm.SUM.minValues){
				numLeafsToShow++;
			} else {
				gapBreaks++;
			}
		}
		
		var numPoints = NgChm.SEL.getCurrentDetDataPerCol();
		if ((branchCount+gapBreaks) < numPoints/2 && NgChm.DET.initialized == false){
			zoomLevel *=.5;
			buildMatrix (start, stop, NgChm.heatMap.getNumRows(NgChm.MMGR.DETAIL_LEVEL)/NgChm.SEL.dataPerCol*zoomLevel);
		}
		
		// fill in any missing leaves but only if the viewport is zoomed in far enough to tell.
		if (stop - start < 100){
			var numLeafsDrawn = 0;
			for (var j in matrix[1]){
				if (j < NgChm.DET.SIZE_NORMAL_MODE)numLeafsDrawn++; // tally up the number of leaves drawn
			}

			var pos = Math.round(boxLength/2);
			if (numLeafsDrawn < numLeafsToShow){ // have enough lines been drawn?
				for (var i = 0; i < stop-start; i++){
			    	var matrixValue = NgChm.heatMap.getValue(NgChm.MMGR.DETAIL_LEVEL,start+i,1);
					var height = 1;
					if ((matrix.get(height,pos) != 1 && (matrix.get(height,pos) != 2))&& (matrixValue > NgChm.SUM.minValues)) {
						while (height < NgChm.DET.normDendroMatrixHeight+1){
							matrix.setTrue(height,pos);
							height++;
						}
					}
					pos += boxLength;
				}
			}
		}

		return matrix;
		
		// HELPER FUNCTIONS
		function convertMapIndexTo3NSpace(index){
			var PPL = NgChm.SUM.rowDendro.getPointsPerLeaf(); 
			return Math.round(index*PPL - PPL/2);
		}
		function convertJsonIndexTo3NSpace(index){
			if (index < 0){
				index = 0-index; // make index a positive number to find the leaf
				var PPL = NgChm.SUM.rowDendro.getPointsPerLeaf(); 
				return Math.round(index*PPL - PPL/2);
			} else {
				index--; // dendroBars is stored in 3N, so we convert back
				return Math.round((dendroBars[index].left + dendroBars[index].right)/2); // gets the middle point of the bar
			}
		}
		function convertJsonIndexToDataViewSpace(index){
			var PPL = NgChm.SUM.rowDendro.getPointsPerLeaf(); 
			if (index < 0){
				index = 0-index; // make index a positive number to find the leaf
				return (index - start)*boxLength+ Math.round(boxLength/2)
			} else {
				index--; // dendroBars is stored in 3N, so we convert back
				var normDistance = ( (dendroBars[index].left+ dendroBars[index].right)/2-start3NIndex + PPL/2)/ (stop3NIndex-start3NIndex); // gets the middle point of the bar
				return Math.round(normDistance*matrixWidth);
			}
		}
	}
	
	//Find the maximum dendro height.
	function getMaxHeight(dendroData) {
		var max = 0;
		for (var i = 0; i < dendroData.length; i++){
			var height = Number(dendroData[i].split(",")[2]);
			if (height > max)
				max = height;
		}
		return max;
	}
}



/**************************
 *  DETAIL COL DENDROGRAM *
 **************************/
NgChm.DDR.DetailColumnDendrogram = function() {
	// internal variables
	var dendroDisplaySize = NgChm.DDR.minDendroMatrixHeight; // this is a static number used to determine how big the dendro canvas will be in conjunction with the dendroConfig.heigh property
	var pointsPerLeaf = 3; // each leaf will get 3 points in the dendrogram array. This is to avoid lines being right next to each other
	var bars = [];
	var chosenBar = {};
	var detailCanvas = document.getElementById('detail_canvas');
	var dendroCanvas = document.getElementById('detail_column_dendro_canvas');
	var dendroConfig = NgChm.heatMap.getColDendroConfig();
	var hasData = dendroConfig.show === 'NA' ? false : true;
	var dendroData = NgChm.heatMap.getColDendroData();
	var normDendroMatrixHeight = Math.min(Math.max(NgChm.DDR.minDendroMatrixHeight,dendroData.length),NgChm.DDR.maxDendroMatrixHeight); // this is the height of the dendro matrices created in buildDendroMatrix
	var maxHeight = dendroData.length > 0 ? getMaxHeight(dendroData) : 0; // this assumes the heightData is ordered from lowest height to highest
	var zoomLevel = 1;
	var dendroMatrix;
	var lastTouchLoc;
	
	// event listeners
	dendroCanvas.onwheel = scroll;
	dendroCanvas.onclick = click;
	dendroCanvas.ontouchmove = scroll;
	dendroCanvas.ontouchend = touchEnd;
	
	this.getDivHeight = function(){
		return dendroCanvas.clientWidth;
	}
	this.getDivHeight = function(){
		return dendroCanvas.clientHeight;
	}
	this.resize = function(){
		resize();
	}
	this.draw = function(){
		draw();
	}
	this.resizeAndDraw = function(){
		resize();
		draw();
	}
	
	function scroll(e){
		e.preventDefault();
		e.stopPropagation();
		if (!lastTouchLoc && e.touches){
			lastTouchLoc = e.touches[0].clientY;
			return;
		}
		var deltaY = e.touches ? e.touches[0].clientY - lastTouchLoc : e.deltaY;
		if (e.touches){
			lastTouchLoc = e.touches[0].clientY;
		}
		zoomLevel -= deltaY/400;
		if (zoomLevel < 0.1) zoomLevel = .1;
		if (zoomLevel > 100) zoomLevel = 100;
		draw();
	}
	
	function touchEnd(e){
		lastTouchLoc = null;
	}
	
	function click(e){
		var offsetX = e.offsetX;
		var offsetY = e.offsetY;
		NgChm.DET.mouseDown = true;
		var heightRatio = zoomLevel*NgChm.heatMap.getNumColumns(NgChm.MMGR.DETAIL_LEVEL)/NgChm.SEL.dataPerRow;
		var X = NgChm.SEL.currentCol + (NgChm.SEL.dataPerRow*(offsetX/dendroCanvas.width));
		var Y = (dendroCanvas.clientHeight-offsetY)/dendroCanvas.clientHeight/heightRatio;
		var matrixX = Math.round(X*NgChm.SUM.colDendro.getPointsPerLeaf()-NgChm.SUM.colDendro.getPointsPerLeaf()/2);
		var matrixY = Math.round(Y*NgChm.SUM.colDendro.getDendroMatrixHeight());
		var extremes = NgChm.SUM.colDendro.findExtremes(matrixY,matrixX);
		if (extremes){
			NgChm.SUM.colDendro.addSelectedBar(extremes,e.shiftKey,e.metaKey||e.ctrlKey);
			draw();
		}
		NgChm.SUM.clearSelectionMarks();
		NgChm.SEL.updateSelection();
		NgChm.SUM.drawColSelectionMarks();
		NgChm.SUM.drawRowSelectionMarks();
		NgChm.SUM.drawTopItems();
	}
	
	function resize(){		
		var left = NgChm.DET.canvas.offsetLeft;
		var height = dendroConfig.height/dendroDisplaySize*document.getElementById('detail_chm').clientHeight + NgChm.SUM.paddingHeight;
		dendroCanvas.style.left = left + NgChm.DET.canvas.clientWidth * (1-NgChm.DET.dataViewWidth/NgChm.DET.canvas.width);
		if (dendroConfig.show == "ALL"){
			dendroCanvas.style.height = height;
			dendroCanvas.style.width = NgChm.DET.canvas.clientWidth * (NgChm.DET.dataViewWidth/NgChm.DET.canvas.width);
			dendroCanvas.height = Math.round(height);
			dendroCanvas.width = Math.round(NgChm.DET.canvas.clientWidth * (NgChm.DET.dataViewWidth/NgChm.DET.canvas.width));
		} else {
			dendroCanvas.style.height = 0;
		}
	}

	function draw(){
		var dendroConfig = NgChm.heatMap.getColDendroConfig();
		var hasData = dendroConfig.show === 'NA' ? false : true;
		if (hasData) {
			dendroMatrix = buildMatrix(NgChm.SEL.currentCol, NgChm.SEL.currentCol+NgChm.SEL.dataPerRow, NgChm.heatMap.getNumColumns(NgChm.MMGR.DETAIL_LEVEL)/NgChm.SEL.dataPerRow*zoomLevel);
			if (typeof dendroMatrix !== 'undefined') {
				//get a scaled version of the dendro matrix that matches the canvas size.
				var scaledMatrix = dendroMatrix.scaleMatrix(dendroCanvas.height, dendroCanvas.clientWidth);
				var colgl = dendroCanvas.getContext("2d");
				colgl.clearRect(0, 0, dendroCanvas.width, dendroCanvas.height);
				var numRows = scaledMatrix.getNumRows();
				colgl.fillStyle = "black";
	
				for (var y=0; y<scaledMatrix.getNumRows(); y++){
					for (var x=0; x<scaledMatrix.getNumCols(); x++){
						// draw the non-highlighted regions
						var val = scaledMatrix.get(y, x);
						if (val > 0){
							colgl.fillRect(x,numRows-y,val,val);
						} 
					}
				}
			}
		}
	}
	
	function buildMatrix (start, stop, heightRatio) {
		var start3NIndex = convertMapIndexTo3NSpace(start);
		var stop3NIndex = convertMapIndexTo3NSpace(stop);
		var boxLength, currentIndex, matrixWidth, dendroBars, dendroInfo, PPL;
		var selectedBars;
		dendroInfo = NgChm.heatMap.getColDendroData(); // dendro JSON object
		boxLength = NgChm.DET.dataBoxWidth;
		matrixWidth = NgChm.DET.dataViewWidth;
		dendroBars = NgChm.SUM.colDendro.getBars(); // array of the dendro bars
		selectedBars = NgChm.SUM.colDendro.getSelectedBars(); 
		PPL = NgChm.SUM.colDendro.getPointsPerLeaf();
		var numNodes = dendroInfo.length;
		var lastRow = dendroInfo[numNodes-1];
		var matrix = new NgChm.DDR.DendroMatrix(normDendroMatrixHeight+1, matrixWidth-1,false);
		var topLineArray = new Array(matrixWidth-1); // this array is made to keep track of which bars have vertical lines that extend outside the matrix
		var maxHeight = getMaxHeight(dendroInfo)/(heightRatio); // this assumes the heightData is ordered from lowest height to highest
		var branchCount = 0;
		
		// check the left and right endpoints of each bar, and see if they are within the bounds.
		// then check if the bar is in the desired height. 
		// if it is, draw it in its entirety, otherwise, see if the bar has a vertical connection with any of the bars in view
		for (var i = 0; i < numNodes; i++){
			var bar = dendroInfo[i];
			var tokes = bar.split(",");
			var leftJsonIndex = Number(tokes[0]);
			var rightJsonIndex = Number(tokes[1]);
			var height = Number(tokes[2]);
			var left3NIndex = convertJsonIndexTo3NSpace(leftJsonIndex); // location in dendroBars space
			var right3NIndex = convertJsonIndexTo3NSpace(rightJsonIndex);
			if (right3NIndex < start3NIndex || stop3NIndex < left3NIndex){continue;} //if the bar exists outside of the viewport, skip it
			
			var leftLoc = convertJsonIndexToDataViewSpace(leftJsonIndex); // Loc is the location in the dendro matrix
			var rightLoc = convertJsonIndexToDataViewSpace(rightJsonIndex);
			var normHeight = height < 0.000001*matrix.getNumRows() ? 1 : Math.max(Math.round(normDendroMatrixHeight*height/maxHeight),1); // height in matrix (if height is roughly 0, treat as such)
			var leftEnd = Math.max(leftLoc, Math.round(PPL/2));
			var rightEnd = Math.min(rightLoc, Math.round(matrixWidth-PPL/2));
			
			//  determine if the bar is within selection??
			var bold = false;
			if (selectedBars){
				for (var k = 0; k < selectedBars.length; k++){
					var selectedBar = selectedBars[k];
					if ((selectedBar.left <= left3NIndex && right3NIndex <= selectedBar.right) && Math.round(500*height/(maxHeight*heightRatio)) <= selectedBar.height)
					bold = true;
				}
			}
			
			if (height > maxHeight){ // if this line is beyond the viewport max height
				if ( start3NIndex > 1 && start3NIndex <= right3NIndex &&  right3NIndex < stop3NIndex -PPL/2 && topLineArray[rightLoc] != 1){ // check to see if it will be connecting vertically to a line in the matrix 
					var drawHeight = normDendroMatrixHeight;
					while (drawHeight > 0 && !matrix.get(drawHeight,rightLoc)){ // these are the lines that will be connected to the highest level dendro leaves
						matrix.setTrue(drawHeight,rightLoc,bold);
						drawHeight--;
					}
				}
				if (start3NIndex > 1 && start3NIndex  <= left3NIndex &&  left3NIndex < stop3NIndex-PPL/2 && topLineArray[leftLoc] != 1){// these are the lines that will be connected to the highest level dendro leaves (stop3NIndex-1 to prevent extra line on far right)
					var drawHeight = normDendroMatrixHeight;
					while (drawHeight > 0 && !matrix.get(drawHeight,leftLoc)){
						matrix.setTrue(drawHeight,leftLoc,bold);
						drawHeight--;
					}
				}
				for (var loc = leftEnd; loc < rightEnd; loc++){
					topLineArray[loc] = 1; // mark that the area covered by this bar can no longer be drawn in  by another, higher level bar
				}
			} else { // this line is within the viewport height
				branchCount++;
				for (var j = leftEnd; j < rightEnd; j++){ // draw horizontal lines
					matrix.setTrue(normHeight,j,bold);
				}
				var drawHeight = normHeight-1;
				while (drawHeight > 0 && !matrix.get(drawHeight,leftLoc) && Math.floor(boxLength/2-1) <= leftLoc  && leftLoc <= matrixWidth-Math.floor(boxLength/2)){	// draw left vertical line
					matrix.setTrue(drawHeight,leftLoc,bold);
					drawHeight--;
				}
				drawHeight = normHeight;
				while (!matrix.get(drawHeight,rightLoc) && drawHeight > 0 && Math.floor(boxLength/2-1) <= rightLoc && rightLoc <= matrixWidth-Math.floor(boxLength/2)){ // draw right vertical line
					matrix.setTrue(drawHeight,rightLoc,bold);
					drawHeight--;
				}
			}
		}
		
		// this counts the number of spots that are heatmap breaks.
		var gapBreaks = 0;
		var numLeafsToShow = 0;
		for (var j = 0; j < stop-start; j++){ 
			if (NgChm.heatMap.getValue(NgChm.MMGR.DETAIL_LEVEL,start+j,1) > NgChm.SUM.minValues){
				numLeafsToShow++;
			} else {
				gapBreaks++;
			}
		}
		
		var numPoints = NgChm.SEL.getCurrentDetDataPerRow();
		if ((branchCount+gapBreaks) < numPoints/2 && NgChm.DET.initialized == false){
			zoomLevel*=.5;
			buildMatrix (start, stop, NgChm.heatMap.getNumColumns(NgChm.MMGR.DETAIL_LEVEL)/NgChm.SEL.dataPerRow*zoomLevel);
		}
		
		// fill in any missing leaves but only if the viewport is zoomed in far enough to tell.
		if (stop - start < 100){
			var numLeafsDrawn = 0;
			for (var j in matrix[1]){
				if (j < NgChm.DET.SIZE_NORMAL_MODE)numLeafsDrawn++; // tally up the number of leaves drawn
			}

			var pos = Math.round(boxLength/2);
			if (numLeafsDrawn < numLeafsToShow){ // have enough lines been drawn?
				for (var i = 0; i < stop-start; i++){
			    	var matrixValue = NgChm.heatMap.getValue(NgChm.MMGR.DETAIL_LEVEL,1,start+i);
					var height = 1;
					if (((matrix.get(height,pos) != 1) && (matrix.get(height,pos) != 2))&& (matrixValue > NgChm.SUM.minValues)) {
						while (height < NgChm.DET.normDendroMatrixHeight+1){
							matrix.setTrue(height,pos);
							height++;
						}
					}
					pos += boxLength;
				}
			}
		}

		return matrix;
		
		// HELPER FUNCTIONS
		function convertMapIndexTo3NSpace(index){
			var PPL = NgChm.SUM.colDendro.getPointsPerLeaf(); 
			return Math.round(index*PPL - PPL/2);
		}
		function convertJsonIndexTo3NSpace(index){
			if (index < 0){
				index = 0-index; // make index a positive number to find the leaf
				var PPL = NgChm.SUM.colDendro.getPointsPerLeaf(); 
				return Math.round(index*PPL - PPL/2);
			} else {
				index--; // dendroBars is stored in 3N, so we convert back
				return Math.round((dendroBars[index].left + dendroBars[index].right)/2); // gets the middle point of the bar
			}
		}
		function convertJsonIndexToDataViewSpace(index){
			var PPL = NgChm.SUM.colDendro.getPointsPerLeaf(); 
			if (index < 0){
				index = 0-index; // make index a positive number to find the leaf
				return (index - start)*boxLength+ Math.round(boxLength/2)
			} else {
				index--; // dendroBars is stored in 3N, so we convert back
				var normDistance = ( (dendroBars[index].left+ dendroBars[index].right)/2-start3NIndex + PPL/2)/ (stop3NIndex-start3NIndex); // gets the middle point of the bar
				return Math.round(normDistance*matrixWidth);
			}
		}
	}
	
	//Find the maximum dendro height.
	function getMaxHeight(dendroData) {
		var max = 0;
		for (var i = 0; i < dendroData.length; i++){
			var height = Number(dendroData[i].split(",")[2]);
			if (height > max)
				max = height;
		}
		return max;
	}
}