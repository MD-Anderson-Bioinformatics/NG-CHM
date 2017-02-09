//Define Namespace for NgChm Dendrogram
NgChm.createNS('NgChm.DDR');

/******************************
 *  SUMMARY COLUMN DENDROGRAM *
 ******************************/
NgChm.DDR.SummaryColumnDendrogram = function() {
	var dendroDisplaySize = 500; // this is a static number used to determine how big the dendro canvas will be in conjunction with the dendroConfig.heigh property
	var pointsPerLeaf = 3; // each leaf will get 3 points in the dendrogram array. This is to avoid lines being right next to each other
	var bars = [];
	var chosenBar = {}; // this is the bar that is clicked on the summary side (Subdendro selection)
	var dendroCanvas = document.getElementById('column_dendro_canvas');
	var dendroConfig = NgChm.heatMap.getColDendroConfig();
	var hasData = dendroConfig.show === 'NA' ? false : true;
	var dendroData = NgChm.heatMap.getColDendroData();
	var normDendroMatrixHeight = Math.max(500,dendroData.length); // this is the height of the dendro matrices created in buildDendroMatrix
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

	this.addSelectedBar = function(extremes, shift){
		var left = extremes.left;
		var right = extremes.right;
		var height = extremes.height;
		var addBar = true;
		var selectedBar = extremes;
		for (var i in selectedBars){
			var bar = selectedBars[i];
			if (bar.left >= selectedBar.left && bar.right <= selectedBar.right && bar.height <= selectedBar.height){
				selectedBars.splice(i,1);
				var selectLeft = Math.round((left+2)/3);
				var selectRight =Math.round((right+2)/3);
				for (var j = selectLeft; j < selectRight+1;j++){
					delete NgChm.SEL.searchItems["Column"][j];
				}
				NgChm.SUM.clearSelectionMarks();
				NgChm.SUM.drawColSelectionMarks();
				NgChm.SUM.drawRowSelectionMarks();
				if (bar.left == selectedBar.left && bar.right == selectedBar.right && bar.height == selectedBar.height){
					addBar = false;
				}
			}
		}
		
		var selectLeft = Math.round((left+2)/3);
		var selectRight = Math.round((right+2)/3);
		if (addBar){
			if (shift){
				for (var i = selectLeft; i < selectRight+1;i++){
					NgChm.SEL.searchItems["Column"][i] = 1;
				}
				
				selectedBars.push(selectedBar);
			} else {
				NgChm.DET.clearSearchItems("Column");
				for (var i = selectLeft; i < selectRight+1;i++){
					NgChm.SEL.searchItems["Column"][i] = 1;
				}
				
				selectedBars = [selectedBar];
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
		dendroCanvas.width = NgChm.SUM.canvas.clientWidth*NgChm.SUM.matrixWidth/NgChm.SUM.totalWidth;
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
		var clickX = event.offsetX, clickY = this.height-event.offsetY;
		var matrixX = Math.round(clickX/(this.width/dendroMatrix[0].length)), matrixY = Math.round(clickY/(this.height/dendroMatrix.length));
		NgChm.SUM.clearSelectionMarks();
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
		if (!NgChm.SEL.isSub) {
			dendroBoxLeftTopArray = new Float32Array([0, 0]);
			dendroBoxRightBottomArray = new Float32Array([0, 0]);
			if (NgChm.heatMap.showColDendrogram("summary")) {
				dendroMatrix = buildMatrix();
			}
		}
	}
	function resize(){
		dendroCanvas.style.width = NgChm.SUM.canvas.clientWidth*NgChm.SUM.matrixWidth/NgChm.SUM.totalWidth;
		dendroCanvas.style.left = NgChm.SUM.canvas.offsetLeft + (1-NgChm.SUM.matrixWidth/NgChm.SUM.totalWidth)*NgChm.SUM.canvas.offsetWidth;
		if (dendroConfig.show !== "NONE"){
			dendroCanvas.style.height = parseInt(dendroConfig.height)/dendroDisplaySize*sumChm.clientHeight*NgChm.SUM.heightPct; // the dendro should take 1/5 of the height at 100% dendro height
		}else{
			dendroCanvas.style.height = 0;
		}
	}
	
	function draw(){
		if (typeof dendroMatrix !== 'undefined') {
			var xRatio = dendroCanvas.width/dendroMatrix[0].length;
			var yRatio = dendroCanvas.height/dendroMatrix.length;
			var colgl = dendroCanvas.getContext("2d");
			colgl.fillStyle = "black";
			for (var i=0; i<dendroMatrix.length; i++){
				// draw the non-highlighted regions
				for (var j in dendroMatrix[i]){
					j = parseInt(j);
					// x,y,w,h
					var x = Math.floor(j*xRatio), y = Math.floor((dendroMatrix.length-i)*yRatio);
					if (dendroMatrix[i][j] == 1){colgl.fillRect(x,y,1,1);}
					if (xRatio >= 1 && dendroMatrix[i][j+1] == 1){ // this is to fill the spaces between each point on the horizontal bars
						var fill = 1;
						while(fill<xRatio){colgl.fillRect(x+fill,y,1,1),fill++;}
					}
				}
				// draw the highlighted area
				//colgl.fillStyle = "rgba(3,255,3,1)";
				for (var j in dendroMatrix[i]){
					j = parseInt(j);
					// x,y,w,h
					var x = Math.floor(j*xRatio), y = Math.floor((dendroMatrix.length-i)*yRatio);
					if (dendroMatrix[i][j] == 2){colgl.fillRect(x,y,2,2);} 
					if (xRatio >= 1 && dendroMatrix[i][j+1] == 2){
						var fill = 1;
						while(fill<xRatio){colgl.fillRect(x+fill,y,2,2),fill++;}
					}
				}
			}
		}
	}
	
	
	function buildMatrix(){
		bars = []; // clear out the bars array otherwise it will add more and more bars and slow everything down!
		var numNodes = dendroData.length;
		var matrix = new Array(normDendroMatrixHeight+1);
		for (var i = 0; i < normDendroMatrixHeight+1; i++){ // normDendroMatrixHeight many rows * (3xWidth)cols matrix
			matrix[i] = new Array(pointsPerLeaf*NgChm.heatMap.getNumColumns('d'));
		}
		if (normDendroMatrixHeight >= 5000){ // if the dendro matrix height is already at the highest possible, just build it
			for (var i = 0; i < numNodes; i++){
				var tokes = dendroData[i].split(",");
				var leftIndex = Number(tokes[0]); // index is the location of the bar in the clustered data
				var rightIndex = Number(tokes[1]);
				var height = Number(tokes[2]);
				var leftLoc = findLocationFromIndex(leftIndex); // this is the position it occupies in the dendroMatrix space
				var rightLoc = findLocationFromIndex(rightIndex);
				var normHeight = height < 0.000001*matrix.length ? 1 : Math.round(normDendroMatrixHeight*height/maxHeight); // if the height of the bar is close enough to 0, just place it at the lowest level
				bars.push({"left":leftLoc, "right":rightLoc, "height":normHeight});
				for (var j = leftLoc; j < rightLoc; j++){
					matrix[normHeight][j]=1;
				}
				var drawHeight = normHeight-1;
				while (drawHeight > 0 && matrix[drawHeight][leftLoc] != 1){	// this fills in any spaces 		
					matrix[drawHeight][leftLoc] = 1;
					drawHeight--;
				}
				drawHeight = normHeight;
				while (matrix[drawHeight][rightLoc] != 1 && drawHeight > 0){			
					matrix[drawHeight][rightLoc] = 1;
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
				var normHeight = height < 0.000001*matrix.length ? 1 : Math.round(normDendroMatrixHeight*height/maxHeight); // if the height of the bar is close enough to 0, just place it at the lowest level
				bars.push({"left":leftLoc, "right":rightLoc, "height":normHeight});
				for (var j = leftLoc; j < rightLoc; j++){
					if (!matrix[normHeight][j]){
						matrix[normHeight][j] = 1;
					} else {
						normDendroMatrixHeight += 1000; // if there is a bar overlap, increase the dendro matrix height by another 500
						return;
					}
				}
				var drawHeight = normHeight-1;
				while (drawHeight > 0 && matrix[drawHeight][leftLoc] != 1){	// this fills in any spaces 		
					matrix[drawHeight][leftLoc] = 1;
					drawHeight--;
				}
				drawHeight = normHeight;
				while (matrix[drawHeight][rightLoc] != 1 && drawHeight > 0){			
					matrix[drawHeight][rightLoc] = 1;
					drawHeight--;
				}
			}
		}
		
		return matrix;
		
		// returns the position in terms of the 3N space
		function findLocationFromIndex(index){
			if (index < 0){
				index = 0-index; // make index a positive number to find the leaf
				return pointsPerLeaf*index-2; // all leafs should occupy the middle space of the 3 points available
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
		var searchRadiusMax = 10;
		var ip = i, id = i, jr = j, jl = j, searchRadius = 0;
		while (dendroMatrix[id] && dendroMatrix[id][j]==undefined && dendroMatrix[ip] && dendroMatrix[ip][j]==undefined && dendroMatrix[i][jl]==undefined && dendroMatrix[i][jr]==undefined && searchRadius < searchRadiusMax){id--,ip++,jl--,jr++,searchRadius++;} // search up and down for for closest dendro bar
		if (!dendroMatrix[id] || !dendroMatrix[ip] || searchRadius == searchRadiusMax){
			return false;
		}
		if (dendroMatrix[id][j]!=undefined){
			i = id;
		} else if (dendroMatrix[ip][j]!=undefined){
			i = ip;
		} else if (dendroMatrix[i][jl]!=undefined){
			j = jl;
		} else if (dendroMatrix[i][jr]!=undefined){
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
			leftExtreme = NgChm.DDR.getTranslatedLocation(leftExtreme); // L and R extreme values gets converted to heatmap locations
			rightExtreme = NgChm.DDR.getTranslatedLocation(rightExtreme);
									
			
			// Set start and stop coordinates
			var rhRatio = NgChm.heatMap.getColSummaryRatio(NgChm.MMGR.RIBBON_HOR_LEVEL);
			var summaryRatio = NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL);
			NgChm.SEL.selectedStart = Math.round(leftExtreme*summaryRatio) +1;
			NgChm.SEL.selectedStop = Math.round(rightExtreme*summaryRatio) +1;
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
	var dendroDisplaySize = 500; // this is a static number used to determine how big the dendro canvas will be in conjunction with the dendroConfig.heigh property
	var pointsPerLeaf = 3; // each leaf will get 3 points in the dendrogram array. This is to avoid lines being right next to each other
	var bars = [];
	var chosenBar = {};
	var dendroCanvas = document.getElementById('row_dendro_canvas');
	var dendroConfig = NgChm.heatMap.getRowDendroConfig();
	var hasData = dendroConfig.show === 'NA' ? false : true;
	var dendroData = NgChm.heatMap.getRowDendroData();
	var normDendroMatrixHeight = Math.max(500,dendroData.length); // this is the height of the dendro matrices created in buildDendroMatrix
	var maxHeight = dendroData.length > 0 ? Number(dendroData[dendroData.length-1].split(",")[2]) : 0; // this assumes the heightData is ordered from lowest height to highest
	var dendroMatrix;
	if (hasData) {
		while(dendroMatrix == undefined){dendroMatrix = buildMatrix();}
	}
	var originalDendroMatrix = dendroMatrix;
	var selectedBars;
	var sumChm = document.getElementById("summary_chm");
	
	// event listeners
	dendroCanvas.addEventListener('click',subDendroClick);
	
	// public functions
	this.getDivWidth = function(){
		// the dendrogram will take up 1/5 of the summary side by default (100% = 1/5 of summary_chm).
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
	
	this.addSelectedBar = function(extremes, shift){		
		var left = extremes.left;
		var right = extremes.right;
		var height = extremes.height;
		var addBar = true;
		var selectedBar = extremes;
		for (var i in selectedBars){
			var bar = selectedBars[i];
			if (bar.left >= selectedBar.left && bar.right <= selectedBar.right && bar.height <= selectedBar.height){
				selectedBars.splice(i,1);
				var selectLeft = Math.round((left+2)/3);
				var selectRight =Math.round((right+2)/3);
				for (var j = selectLeft; j < selectRight+1;j++){
					delete NgChm.SEL.searchItems["Row"][j];
				}
				NgChm.SUM.clearSelectionMarks();
				NgChm.SUM.drawColSelectionMarks();
				NgChm.SUM.drawRowSelectionMarks();
				if (bar.left == selectedBar.left && bar.right == selectedBar.right && bar.height == selectedBar.height){
					addBar = false;		
				}
			}
		}
		
		var selectLeft = Math.round((left+2)/3);
		var selectRight = Math.round((right+2)/3);
		if (addBar){
			if (shift){
				for (var i = selectLeft; i < selectRight+1;i++){
					NgChm.SEL.searchItems["Row"][i] = 1;
				}
				
				selectedBars.push(selectedBar);
			} else {
				NgChm.DET.clearSearchItems("Row");
				for (var i = selectLeft; i < selectRight+1;i++){
					NgChm.SEL.searchItems["Row"][i] = 1;
				}
				
				selectedBars = [selectedBar];
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
		dendroCanvas.height = NgChm.SUM.canvas.clientHeight*NgChm.SUM.matrixHeight/NgChm.SUM.totalHeight;
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
		var clickX = event.offsetX, clickY = event.offsetY;
		var matrixX = Math.round(clickY/(this.height/dendroMatrix[0].length)), matrixY = Math.round((this.width-clickX)/(this.width/dendroMatrix.length));
		NgChm.SUM.clearSelectionMarks();
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
		if (!NgChm.SEL.isSub) {
			dendroBoxLeftTopArray = new Float32Array([0, 0]);
			dendroBoxRightBottomArray = new Float32Array([0, 0]);
			if (NgChm.heatMap.showRowDendrogram("summary")) {
				dendroMatrix = buildMatrix();
			}
		}
	}
	
	function resize(){
		dendroCanvas.style.height = NgChm.SUM.canvas.clientHeight*NgChm.SUM.matrixHeight/NgChm.SUM.totalHeight;
		dendroCanvas.style.top = NgChm.SUM.canvas.offsetTop + (NgChm.SUM.totalHeight - NgChm.SUM.matrixHeight)/NgChm.SUM.totalHeight*NgChm.SUM.canvas.offsetHeight;
		if (dendroConfig.show !== "NONE"){
			dendroCanvas.style.width = dendroConfig.height/dendroDisplaySize*sumChm.clientWidth*NgChm.SUM.widthPct;
		} else {
			dendroCanvas.style.width = 0;
		}
	}
	
	function draw(){
		if (typeof dendroMatrix !== 'undefined') {
			var xRatio = dendroCanvas.width/dendroMatrix.length;
			var yRatio = dendroCanvas.height/dendroMatrix[0].length;
			var rowgl = dendroCanvas.getContext("2d");
			for (var i=0; i<dendroMatrix.length; i++){
				// draw the non-highlighted regions
				rowgl.fillStyle = "black";
				for (var j in dendroMatrix[i]){
					j = parseInt(j);
					// x,y,w,h
					var x = Math.floor((dendroMatrix.length-i)*xRatio), y = Math.floor(j*yRatio);
					if (dendroMatrix[i][j] == 1){rowgl.fillRect(x,y,1,1);}
					if (yRatio >= 1 && dendroMatrix[i][j+1] == 1){
						var fill = 1;
						while(fill<yRatio){rowgl.fillRect(x,y+fill,1,1),fill++;}
					}
				}
				// draw the highlighted area
			//	rowgl.fillStyle = "rgba(3,255,3,1)";
				for (var j in dendroMatrix[i]){
					j = parseInt(j);
					// x,y,w,h
					var x = Math.floor((dendroMatrix.length-i)*xRatio), y = Math.floor(j*yRatio);
					if (dendroMatrix[i][j] == 2){rowgl.fillRect(x,y,2,2);}
					if (yRatio >= 1 && dendroMatrix[i][j+1] == 2){
						var fill = 1;
						while(fill<yRatio){rowgl.fillRect(x,y+fill,2,2),fill++;}
					}
				}
			}
		}
	}
	
	function buildMatrix(){
		bars = []; // clear out the bars array otherwise it will add more and more bars and slow everything down!
		var numNodes = dendroData.length;
		var maxHeight = getMaxHeight(dendroData);
		var matrix = new Array(normDendroMatrixHeight+1);
		for (var i = 0; i < normDendroMatrixHeight+1; i++){ // 500rows * (3xWidth)cols matrix
			matrix[i] = new Array(pointsPerLeaf*NgChm.heatMap.getNumRows('d'));
		}
		if (normDendroMatrixHeight >= 5000){ // if the dendro matrix height is already at the highest possible, just build it
			for (var i = 0; i < numNodes; i++){
				var tokes = dendroData[i].split(",");
				var leftIndex = Number(tokes[0]); // index is the location of the bar in the clustered data
				var rightIndex = Number(tokes[1]);
				var height = Number(tokes[2]);
				var leftLoc = findLocationFromIndex(leftIndex); // this is the position it occupies in the dendroMatrix space
				var rightLoc = findLocationFromIndex(rightIndex);
				var normHeight = height < 0.000001*matrix.length ? 1 : Math.round(normDendroMatrixHeight*height/maxHeight); // if the height of the bar is close enough to 0, just place it at the lowest level
				bars.push({"left":leftLoc, "right":rightLoc, "height":normHeight});
				for (var j = leftLoc; j < rightLoc; j++){
					matrix[normHeight][j]=1;
				}
				var drawHeight = normHeight-1;
				while (drawHeight > 0 && matrix[drawHeight][leftLoc] != 1){	// this fills in any spaces 		
					matrix[drawHeight][leftLoc] = 1;
					drawHeight--;
				}
				drawHeight = normHeight;
				while (matrix[drawHeight][rightLoc] != 1 && drawHeight > 0){			
					matrix[drawHeight][rightLoc] = 1;
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
				var normHeight = height < 0.000001*matrix.length ? 1 : Math.round(normDendroMatrixHeight*height/maxHeight); // if the height of the bar is close enough to 0, just place it at the lowest level
				bars.push({"left":leftLoc, "right":rightLoc, "height":normHeight});
				for (var j = leftLoc; j < rightLoc; j++){
					if (!matrix[normHeight][j]){
						matrix[normHeight][j] = 1;
					} else {
						normDendroMatrixHeight += 1000; // if there is a bar overlap, increase the dendro matrix height by another 500
						return;
					}
				}
				var drawHeight = normHeight-1;
				while (drawHeight > 0 && matrix[drawHeight][leftLoc] != 1){	// this fills in any spaces 		
					matrix[drawHeight][leftLoc] = 1;
					drawHeight--;
				}
				drawHeight = normHeight;
				while (matrix[drawHeight][rightLoc] != 1 && drawHeight > 0){			
					matrix[drawHeight][rightLoc] = 1;
					drawHeight--;
				}
			}
		}
		return matrix;
		
		// returns the position in terms of the 3N space
		function findLocationFromIndex(index){
			if (index < 0){
				index = 0-index; // make index a positive number to find the leaf
				return pointsPerLeaf*index-2; // all leafs should occupy the middle space of the 3 points available
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
		var searchRadiusMax = 10;
		var ip = i, id = i, jr = j, jl = j, searchRadius = 0;
		while (dendroMatrix[id] && dendroMatrix[id][j]==undefined && dendroMatrix[ip] && dendroMatrix[ip][j]==undefined && dendroMatrix[i][jl]==undefined && dendroMatrix[i][jr]==undefined && searchRadius < searchRadiusMax){id--,ip++,jl--,jr++,searchRadius++;} // search up and down for for closest dendro bar
		if (!dendroMatrix[id] || !dendroMatrix[ip] || searchRadius == searchRadiusMax){
			return false;
		}
		if (dendroMatrix[id][j]!=undefined){
			i = id;
		} else if (dendroMatrix[ip][j]!=undefined){
			i = ip;
		} else if (dendroMatrix[i][jl]!=undefined){
			j = jl;
		} else if (dendroMatrix[i][jr]!=undefined){
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
			
			leftExtreme = NgChm.DDR.getTranslatedLocation(leftExtreme); // L and R extreme values gets converted to heatmap locations
			rightExtreme = NgChm.DDR.getTranslatedLocation(rightExtreme);
			
			// Set start and stop coordinates
			var rvRatio = NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.RIBBON_VERT_LEVEL);
			var summaryRatio = NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL);
			NgChm.SEL.selectedStart = Math.round(leftExtreme*summaryRatio) +1;
			NgChm.SEL.selectedStop = Math.round(rightExtreme*summaryRatio) +1;
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
NgChm.DDR.pointsPerLeaf = 3; // each leaf will get 3 points in the dendrogram array. This is to avoid lines being right next to each other

NgChm.DDR.findExtremes = function(i,j,matrix) {
	var searchRadiusMax = 10; // this determines how far to search before giving up 
	var ip = i, id = i, jr = j, jl = j, searchRadius = 0;
	while (matrix[id] && matrix[id][j]==undefined && matrix[ip] && matrix[ip][j]==undefined && matrix[i][jl]==undefined && matrix[i][jr]==undefined && searchRadius < searchRadiusMax){id--,ip++,jl--,jr++,searchRadius++;} // search up and down for for closest dendro bar
	if (!matrix[id] || !matrix[ip]){
		return;
	}
	if (matrix[id][j]!=undefined){
		i = id;
	} else {
		i = ip;
	}
	var top = i;
	var left = j;
	var right = j;
	while (i != 0 && left != 0){ // as long as we aren't at the far left or the very bottom, keep moving
		if (matrix[i][left-1]){ // can we keep moving left?
			left--;
		} else {//if (dendroMatrix[i-1][j] == 1 ||dendroMatrix[i-1][j] == 2){ // can we move towards the bottom?
			i--;
		}
	}
	i = top;
	while (i != 0 && right <= matrix[1].length){
		if (matrix[i][right+1]){
			right++;
		} else {//if (dendroMatrix[i-1][j] == 1 ||dendroMatrix[i-1][j] == 2){
			i--;
		}
	}
	return {"left":left,"right":right,"height":top};
}

NgChm.DDR.getTranslatedLocation = function(location) {
	var summaryRatio = NgChm.heatMap.getRowSummaryRatio(NgChm.MMGR.SUMMARY_LEVEL);
	return (location/summaryRatio)/NgChm.DDR.pointsPerLeaf;
}

NgChm.DDR.exploreToEndOfBar = function(i,j, dendroMatrix) {
	var leftExtreme = j, rightExtreme = j;
	while (dendroMatrix[i][rightExtreme+1]==1 || dendroMatrix[i][rightExtreme+1]==2){ // now find the right and left end points of the line in the matrix and highlight as we go
		rightExtreme++;
	}
	while (dendroMatrix[i][leftExtreme-1]==1 || dendroMatrix[i][leftExtreme-1]==2){
		leftExtreme--;
	}
	return [leftExtreme,rightExtreme];
}

NgChm.DDR.findLeftEnd = function(i,j, dendroMatrix) {
	dendroMatrix[i][j] = 2;
	while (i != 0 && j != 0){ // as long as we aren't at the far left or the very bottom, keep moving
		if (dendroMatrix[i][j-1] == 1 ||dendroMatrix[i][j-1] == 2){ // can we keep moving left?
			j--;
			dendroMatrix[i][j] = 2;
		} else {//if (dendroMatrix[i-1][j] == 1 ||dendroMatrix[i-1][j] == 2){ // can we move towards the bottom?
			i--;
			dendroMatrix[i][j] = 2;
		}
	}
	return j;
}

NgChm.DDR.findRightEnd = function(i,j, dendroMatrix) {
	dendroMatrix[i][j] = 2;
	while (i != 0 && j <= dendroMatrix[1].length){
		if (dendroMatrix[i][j+1] == 1 ||dendroMatrix[i][j+1] == 2){
			j++;
			dendroMatrix[i][j] = 2;
		} else {//if (dendroMatrix[i-1][j] == 1 ||dendroMatrix[i-1][j] == 2){
			i--;
			dendroMatrix[i][j] = 2;
		}
	}
	return j;
}

NgChm.DDR.highlightAllBranchesInRange = function(height,leftExtreme,rightExtreme,dendroMatrix) {
	for (var i = height; i >= 0; i--){
		for (var loc in dendroMatrix[i]){
			if (leftExtreme < loc && loc < rightExtreme){
				dendroMatrix[i][loc] = 2;
			}
		}
	}
	return dendroMatrix;
}

NgChm.DDR.clearDendroSelection = function() {
	NgChm.SEL.selectedStart = 0;
	NgChm.SEL.selectedStop = 0;
	if (!NgChm.SEL.isSub) {
		dendroBoxLeftTopArray = new Float32Array([0, 0]);
		dendroBoxRightBottomArray = new Float32Array([0, 0]);
		if (NgChm.heatMap.showRowDendrogram("summary")) {
			NgChm.SUM.rowDendro.rebuildMatrix();
			NgChm.SUM.rowDendro.draw();
		}
		if (NgChm.heatMap.showColDendrogram("summary")) {
			NgChm.SUM.colDendro.rebuildMatrix();
			NgChm.SUM.colDendro.draw();
		}
	}
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