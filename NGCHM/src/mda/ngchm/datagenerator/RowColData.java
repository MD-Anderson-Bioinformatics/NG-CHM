/*******************************************************************
 * CLASS: RowColData
 *
 * This class instantiates an RowColData object for a given user-
 * provided row and column configuration. 
 * 
 * Author: Mark Stucky
 * Date: March 8, 2016
 ******************************************************************/

package mda.ngchm.datagenerator;

import static mda.ngchm.datagenerator.ImportConstants.*;

import java.awt.image.BufferedImage;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileReader;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Random;
import java.util.Scanner;

import org.json.simple.JSONArray;
import org.json.simple.JSONObject;

public class RowColData { 
	public int dataSize = 0;
	public String dataTypes[] = null;
	public String orderType = null;
	public String orderFile = null;
	public String orderMethod = null;
	public String labelMaxLength = null;
	public String labelAbbrevMethod = null;
	public String distanceMetric = null;
	public String agglomerationMethod = null;
	public String dendroFile = null; 
	public int orderArray[];
	public String classArray[];
	public String labelExtraFile = null;
	public int[] cutLocations = null;
	public int cutWidth = 2;
	public int treeCuts = 0;
	public List<String> dendroValues = new ArrayList<String>();
	public int[][] dendroMatrix;
	public BufferedImage dendroImage;
	public List<InputClass> classFiles = new ArrayList<InputClass>();
	public String[] topItems = null;
	public BufferedImage topItemImage;
	public List<Object[]> topItemsLines = new ArrayList<Object[]>();

	private int TOP_ITEMS_IMAGE_WIDTH = 44;


	/*******************************************************************
	 * CONSTRUCTOR: RowColData
	 *
	 * This constructor creates an RowColData object containing row/column
	 * configuration data.
	 ******************************************************************/
	public RowColData(String type, int length, JSONObject configData, InputFile iFile) throws Exception
	{
		try {
			dataSize = length;
			dataTypes = jsonArrayToStringArray((JSONArray)configData.get(DATA_TYPE));
			orderType = type.trim();
			orderMethod = (String) configData.get(ORDER_METHOD);
			orderFile = (String) configData.get(ORDER_FILE);
			String[] orderArr = constructOrderArray(iFile);
			topItems = (JSONArray)configData.get(TOP_ITEMS) != null ? jsonArrayToStringArray((JSONArray)configData.get(TOP_ITEMS)) : null;
			cutLocations = jsonArrayToIntArray((JSONArray)configData.get(CUT_LOCATIONS));
			if (cutLocations.length == 0) {
				String treeCutStr = (String) configData.get(TREE_CUTS);
				treeCuts = treeCutStr != null ? Integer.parseInt(treeCutStr) : 0;
			}
			String cutWidthStr = (String) configData.get(CUT_WIDTH);
			cutWidth = cutWidthStr != null ? Integer.parseInt(cutWidthStr) : 2;
			orderArray = new int[length+1];
			classArray = new String[length+(cutLocations.length*cutWidth)+1];
			labelMaxLength = (String) configData.get(LABEL_MAXIMUM_LENGTH) != null ? (String) configData.get(LABEL_MAXIMUM_LENGTH) : "20";
			labelAbbrevMethod = (String) configData.get(LABEL_ABBREV_METHOD) != null ? (String) configData.get(LABEL_ABBREV_METHOD) : "END";
			setClassificationOrder(orderArr);
	        String extraFile = (configData.get(EXTRA_FILE)!=null) ? (String) configData.get(EXTRA_FILE): null;
	        labelExtraFile = extraFile;
			distanceMetric = (String) configData.get(DISTANCE_METRIC);
			agglomerationMethod = (String) configData.get(AGGLOMERATION_METHOD);
			dendroFile = (String) configData.get(DENDRO_FILE);
	        if (dendroFile != null) {
	            setDendroValues();
	            // If config file specifies that cuts be calculated based on a number
	            // of "tree cuts". Calculate those cut positions and reconfigure required
	            // object properties. Must be ordered hierarchically.
	    		if (treeCuts > 0){
	    			int[] cutLocs = getTreeCutPositions();
	    			ResetForTreeCuts(length, cutLocs, orderArr);
	    		}
	        }
			if (topItems != null) {
				buildTopItemsArray();
			}
		} catch (Exception ex) {
	    	System.out.println("Exception instantiating RowColData Object: "+ ex.toString());
	        throw ex;
		}
	}
	
	/*******************************************************************
	 * METHOD: ResetForTreeCuts
	 *
	 * This method resets a few object variables and re-calculates 
	 * orders and values for previously calculated treecut positions.
	 ******************************************************************/
	private void ResetForTreeCuts(int length, int[] treeCuts, String[] orderArr) throws Exception
	{
		dendroValues.clear();
		cutLocations = treeCuts;
		orderArray = new int[length+1];
		classArray = new String[length+(cutLocations.length*cutWidth)+1];
		setClassificationOrder(orderArr);
        setDendroValues();
	}
	
	/*******************************************************************
	 * METHOD: generateDendroMatrix
	 *
	 * This method generates a 3 points per leaf matrix for a given
	 * dendrogram (row/col).  This matrix will be used to generate 
	 * dendrogram images for both the PDF and the thumbnail PNG.
	 ******************************************************************/
	public void generateDendroMatrix(int length) throws Exception {
		int normDendroMatrixHeight = 160;
		int pointsPerLeaf = 3;
		int[][] matrix = new int[normDendroMatrixHeight+1][pointsPerLeaf*length];
		int numNodes = dendroValues.size();
		Float maxHeight = new Float(0);
		if (dendroValues.size() > 0) {
			for (int j = 0; j < numNodes; j++){
				String dendValue = dendroValues.get(j);
				String[] dTokes = dendValue.split(COMMA);
				Float dHeight = new Float(dTokes[2]);
				if (dHeight > maxHeight) {
					maxHeight = dHeight;
				}
			}
		} else {
			return;
		}
		List<Integer> barsLeft = new ArrayList<Integer>();
		List<Integer> barsRight = new ArrayList<Integer>();
		for (int i = 0; i < numNodes; i++){
			String colValue = dendroValues.get(i);
			String[] tokes = colValue.split(COMMA);
			int leftIndex = Integer.parseInt(tokes[0]); // index is the location of the bar in the clustered data
			int rightIndex = Integer.parseInt(tokes[1]);
			Float height = new Float(tokes[2]);
			int normHeight = Math.round(normDendroMatrixHeight*height/maxHeight);
			int leftLoc = findLocationFromIndex(leftIndex, barsLeft, barsRight);
			int rightLoc = findLocationFromIndex(rightIndex, barsLeft, barsRight);
			barsLeft.add(leftLoc);
			barsRight.add(rightLoc);
			for (int j = leftLoc; j < rightLoc; j++){
				matrix[normHeight][j] = 1;
			}
			int drawHeight = normHeight-1;
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
		dendroMatrix = matrix;
	}
	
	/*******************************************************************
	 * METHOD: findLocationFromIndex
	 *
	 * This method finds the leaf associated with a given dendrogram 
	 * point when constructing the dendrogram matrix used to generate
	 * dendrogram images for PNG images and the heat map PDF.
	 ******************************************************************/
	private int findLocationFromIndex(int index, List<Integer> barsLeft, List<Integer> barsRight)  throws Exception {
		if (index < 0){
			index = 0-index; // make index a positive number to find the leaf
			return 3*index-2; // all leafs should occupy the middle space of the 3 points available
		} else {
			index--;
			return (int) Math.round(new Float(barsLeft.get(index) + barsRight.get(index))/2); // gets the middle point of the bar
		}
	}
	
	/*******************************************************************
	 * METHOD: setDendroValues
	 *
	 * This method populates the dendro values array, reordering the
	 * values to the proper clustered order.
	 ******************************************************************/
	private void setDendroValues()  throws Exception {
        // Reading the data file and writing the output file
        BufferedReader br = new BufferedReader(new FileReader(dendroFile));
        String line = br.readLine(); // skip the first line since it's just labels
        line = br.readLine();
        while (line != null) {
            String[] tokes = line.split(TAB);
            int a = Integer.parseInt(tokes[0]);
            int b = Integer.parseInt(tokes[1]);
            if (a<0){ // Check if first column is referring to a sample
                a = 0-orderArray[0-a];
            }
            if (b<0){ // Check if second column is referring to a sample
                b = 0-orderArray[0-b];
            }
            String dendroLineData = a+COMMA+b+COMMA+tokes[2];
            dendroValues.add(dendroLineData);
            line = br.readLine();
        }
        br.close();
	}

	/*******************************************************************
	 * METHOD: jsonArrayToStringArray
	 *
	 * This method parses a JSON String array into a JAVA String array. 
	 ******************************************************************/
	private String[] jsonArrayToStringArray(JSONArray jsnArr)  throws Exception {
		String[] strArr = new String[jsnArr.size()];
		for (int i = 0; i < jsnArr.size(); i++) {
			strArr[i] = (String)jsnArr.get(i);
		}
		return strArr;
	}

	/*******************************************************************
	 * METHOD: jsonArrayToIntArray
	 *
	 * This method parses a JSON String array into a JAVA String array. 
	 ******************************************************************/
	private int[] jsonArrayToIntArray(JSONArray jsnArr)  throws Exception {
		if (jsnArr != null) {
			int[] intArr = new int[jsnArr.size()];
			for (int i = 0; i < jsnArr.size(); i++) {
				intArr[i] = (int)(long)jsnArr.get(i);
			}
			return intArr;
		} else {
			return new int[0];
		}
	}
	
	/*****************************************************************************
	 * METHOD: constructOrderArray
	 *
	 * This method constructs an order array based upon the method of 
	 * ordering selected for the heatmap.  This order array contains a string
	 * with a matrix label and position (separated by a TAB).  
	 * 1. If the method is HEIRARCHICAL the array is constructed using the row/col 
	 * labels and positions supplied in the order file provided. 
	 * 2. If the method is ORIGINAL, an integer array is constructed ordered from 1 
	 * to the length of the rows/cols. That array is then used in conjunction with 
	 * row/col labels retrieved from the data matrix provided with the heatmap.  
	 * 3. RANDOM works the same as original except that an intermediary method is 
	 * called on the integer array to randomize row/col positions. 
	 ******************************************************************/
	private String[] constructOrderArray(InputFile iFile)  throws Exception {
		String[] orderArr = null;
		//If order file is provided, use it to generate order
		if ((orderFile != null) && (!orderFile.equals(EMPTY))) {
			orderArr = constructOrderArrayFromFile();
			if (orderMethod.equals(ORDER_ORIGINAL)) {
				String[] matrixOrder = constructOrderArrayFromMatrixData(iFile);
				//validate user supplied original order file against matrix order
				if (!Arrays.equals(orderArr, matrixOrder)) {
					throw new Exception("Exception: Original Order file provided is not in the order of the matrix provided.");
				}
			}
		} else {
			//Order file not provided... so generate original order or random order from matrix
			orderArr = constructOrderArrayFromMatrixData(iFile);		
		}
		return orderArr;
	}

	/*****************************************************************************
	 * METHOD: constructOrderArrayFromFile
	 *
	 * This method constructs an order array based upon the order file submitted
	 * with the heat map properties.
	 ****************************************************************************/
	private String[] constructOrderArrayFromFile()  throws Exception {
		String[] orderArr = new String[dataSize];
		File order = new File(orderFile);
        if (!order.exists()) {
        	// processing if classification order file is missing
        }
        BufferedReader rowRead;
        rowRead = new BufferedReader(new FileReader(order));
        // Read in the clustered Row Ordering data
        String line = rowRead.readLine();
        line = rowRead.readLine();
        int pos = 0;
        // Construct an integer array containing the row numbers of the clustered data
        while(line !=null) {
           String toks[] = line.split("\t"); 
           orderArr[pos] = toks[0]+"\t"+toks[1];  
           pos++;
           line = rowRead.readLine();
        }
        rowRead.close();
        return orderArr;
	}
	
	/*****************************************************************************
	 * METHOD: constructOrderArrayFromMatrixData
	 *
	 * This method constructs an order array based upon the order of the data 
	 * matrix provided with the heat map configuration.
	 ****************************************************************************/
	private String[] constructOrderArrayFromMatrixData(InputFile iFile)  throws Exception {
		String[] orderArr = new String[dataSize];
		try {
			//Order method is ORIGINAL or RANDOM
			int[] posArr = new int[dataSize];
			for (int i=0;i<dataSize;i++) {
				posArr[i] = i+1;
			}
			if (orderMethod.equals(ORDER_RANDOM)) {
				shuffleArray(posArr);
			}
	        String matrix[][] = iFile.origMatrix;
		    if (orderType.equals(COL)) {
		    	String colHeaders[] = matrix[0];
		    	int colStart = 1+iFile.rowCovs;
		    	for (int i=0;i<colHeaders.length-colStart;i++) {
		    		orderArr[i] = colHeaders[colStart+i]+"\t"+posArr[i];  
		    	}
		    } else if (orderType.equals(ROW)) {
		    	int rowStart = 1+iFile.colCovs;
		    	for (int i=rowStart;i<matrix.length;i++) {
			    	String rowData[] = matrix[i];
		    		orderArr[i-rowStart] = rowData[0]+"\t"+posArr[i-rowStart];  
		    	}
		    }        
		} catch (Exception ex) {
		    	System.out.println("Exception in RowColData.constructOrderArray: Reading Matrix. "+ ex.toString());
		        throw ex;
	    }
	    return orderArr;
	}
	
	/*******************************************************************
	 * METHOD: shuffleArray
	 *
	 * This method sorts an int array into random order. 
	 ******************************************************************/
	private static void shuffleArray(int[] array) throws Exception {
	    int index;
	    Random random = new Random();
	    for (int i = array.length - 1; i > 0; i--) {
	        index = random.nextInt(i + 1);
	        if (index != i) {
	            array[index] ^= array[i];
	            array[i] ^= array[index];
	            array[index] ^= array[i];
	        }
	    }
	}
	
	/*******************************************************************
	 * METHOD: setClassficationOrder
	 *
	 * This method populates this class' colOrder and rowOrder integer
	 * arrays with the contents of the orderArray passed in.  These 
	 * arrays will be used to reorganize the incoming data matrix into
	 * clustered order AND to reorganize any incoming row/col classification 
	 * files in clustered order. 
	 ******************************************************************/
	private void setClassificationOrder(String[] orderArr) throws Exception {
    	orderArray[0] = 0;
    	for (int i=0;i<orderArr.length;i++) {
    		String toks[] = orderArr[i].split("\t");
            int toks1 = Integer.parseInt(toks[1]);
  	        for (int j=0;j<+cutLocations.length;j++) {
	        	int cut = cutLocations[j]+j*cutWidth;
	        	//Place special cut markers into classArray file.  These will be read to 
	        	//color the bar white in the viewer wherever cuts are located
	        	if (toks1 == cut) {
	        		for (int k=cut; k < cut+cutWidth; k++) {
	        			classArray[k] = CUT_VALUE;
	        		}
	        	  }
	        	  if (toks1 >= cut) {
	        		toks1 = toks1+cutWidth;
	        	  }
	          }
              orderArray[i+1] = toks1;
              classArray[toks1] = toks[0];
    	}
	}
	
	/*******************************************************************
	 * METHOD: getTreeCutPositions
	 *
	 * This method calculates tree cut positions. It is only used when
	 * the heatmapProperties.json file contains a TREE_CUT node in the 
	 * row/column information. 
	 ******************************************************************/
	private int[] getTreeCutPositions()  throws Exception {
		int[] cutLocs = null;
		int [] cuts = new int[treeCuts];
		int firstCut = dendroValues.size()-(treeCuts-1);
		int[] cutBars = new int[treeCuts];
		cutBars[0] = firstCut;
		int cutCtr = 1;
		//Construct array for the bars that represent each tree cut.
		for (int i=dendroValues.size()-1; i >= firstCut; i--) {
			String colValue = dendroValues.get(i);
			String[] tokes = colValue.split(COMMA);
			int leftIndex = Integer.parseInt(tokes[0]); // index is the location of the bar in the clustered data
			int rightIndex = Integer.parseInt(tokes[1]);
			if(leftIndex < firstCut) {
				cutBars[cutCtr] = leftIndex;
				cutCtr++;
			}
			if(rightIndex < firstCut) {
				cutBars[cutCtr] = rightIndex;
				cutCtr++;
			}
		}
		for (int j=0; j < cutBars.length; j++) {
			int cutBar = cutBars[j];
			int leftIndex = cutBar;
			while (leftIndex > 0) {
				String currBar = dendroValues.get(leftIndex-1);
				String[] tokes = currBar.split(COMMA);
				leftIndex = Integer.parseInt(tokes[0]); // index is the location of the bar in the clustered data
			}
			cuts[j] = leftIndex*-1;
		}
		cutLocs = new int[cuts.length-1];
		java.util.Arrays.sort(cuts);
		for (int i=0;i<cuts.length;i++) {
			if (i > 0) {
				cutLocs[i-1]=cuts[i];
			}
		}
		return cutLocs;
	}
	
	/*******************************************************************
	 * METHOD: getVisibleRowClasses
	 *
	 * This method calculates returns a list of visible (i.e. show = 'Y')
	 * classification bar files. 
	 ******************************************************************/
	public List<InputClass> getVisibleClasses()  throws Exception {
		List<InputClass> cFiles = new ArrayList<InputClass>();
		for (int i=0;i<classFiles.size();i++) {
			InputClass iClass = classFiles.get(i);
			if (iClass.show.equals(YES)) {
				cFiles.add(iClass);
			}
		}
		return cFiles;
	}
	
	/*******************************************************************
	 * METHOD: buildTopItemsArray
	 *
	 * This method constructs a topItemLines array. This array contains: 
	 * starting point, ending point, and label for a top item.  The start 
	 * is where the arrow begins next to the heatmap and the end point
	 * is where that arrow ends.  If there is enough room, the arrow
	 * will be straight.  If not it will be adjusted upward or downward.
	 ******************************************************************/
	private void buildTopItemsArray()  throws Exception {
		int itemsFound = 0;
		for (int j=0;j<classArray.length;j++) {
			String currElem = classArray[j];
			if (currElem != null) {
				for (int i=0; i <topItems.length; i++ ) {
					String currItem = topItems[i];
					if (currElem.equals(currItem)) {
						Object[] itemsetup = new Object[3];
						itemsetup[0] = j;
						itemsetup[1] = j;
						itemsetup[2] = getLabelText(currItem);
						topItemsLines.add(itemsetup);
						itemsFound++;
					}
				}
			}
		}
		if (itemsFound == 0) {
			System.out.println("Warning: No top items found for axis: " + orderType + ".  All parameter entries skipped..");
		} else if (topItems.length != itemsFound) {
			System.out.println("Warning: Not all top items found for axis: " + orderType + ". Those parameter entries skipped.");
		}
		if ((classArray.length > 80) && (itemsFound > 0)){
			boolean found = true;
			while (found) {
				found = adjustTopItemLines();
			}
		}
	}

	/*******************************************************************
	 * METHOD: adjustTopItemLines
	 *
	 * This method iterates thru the topItemLines array and adjusts the
	 * endpoints (array position 1) so that all end points are 5 positions
	 * apart.  This is done so that labels can be printed on the PDF without
	 * overlapping 
	 ******************************************************************/
	private boolean adjustTopItemLines()  throws Exception {
		boolean changesFound = false;
		boolean drawDown = false;
		//Set adjustment size to reflect size of map (larger adjustment for bigger maps)
		int adjSize = 6;
		if (classArray.length > 1000)  { adjSize =  6*(classArray.length/500);
		} else if (classArray.length < 200) { adjSize =  2;}
		
		//If you are within 3 positions of the top of the heatmap,
		//set the positioning so that endpoints are below the start
		if ((int)topItemsLines.get(0)[1] < 4) {
			topItemsLines.get(0)[1] = 4;
			drawDown = true;
		}
		int changeCtr = 0;
		for (int i=0;i<topItemsLines.size()-1;i++) {
			int currItem = (int)topItemsLines.get(i)[1];
			int nextItem = (int)topItemsLines.get(i+1)[1];
			//If this item is within the adjustment size # positions of the last... adjust up/down
			if (nextItem - currItem < adjSize) {
				changeCtr++;
				//If you are within 3 positions of the top of the heatmap OR 5 items have 
				// already been routed upward, set the positioning so that endpoints are below the start
				if (((currItem - adjSize) < 4) || changeCtr > 4) {
					drawDown = true;
				}
				//If you are within 3 positions of the bottom of the heatmap draw upward
				if ((currItem + adjSize) > dataSize) {
					drawDown = false;
				}
				//Adjust the endpoint according to the current "draw" direction
				if (drawDown) {
					topItemsLines.get(i+1)[1] = currItem + adjSize;
				} else {
					topItemsLines.get(i)[1] = currItem - adjSize;
				}
				changesFound = true;
			}
		}
		return changesFound;
	}
	
	/******************************************************************
	 * METHOD: createTopItemsImg
	 *
	 * This method constructs a BufferedImage containing the arrows for
	 * each top item, drawing a line from the heatmap to the label.  This
	 * image is used to create the PDF version of the heatmap.
	 ******************************************************************/
	public void createTopItemsImg(int size)  throws Exception {
		Float sizeTo = new Float(8);
		//This factor reduces the dendro size to the number of inches on a BufferedImage divides by 5.5 
		//to determine how many values to factor to make the dendro approximately 5.5 inches tall
		Float lowSample = new Float(new Float(size)/120)/new Float(8);
		boolean lowSampInd = false;
		if (lowSample < .5) {
			lowSampInd = true;
		}
		Float sampleFactor = new Float(Math.round((size/120)/sizeTo)); 
		sampleFactor = sampleFactor > 0 ? sampleFactor : 1;
		if (lowSampInd) {
			sampleFactor = new Float(Math.round(1/lowSample));
			//Set sampling factor to an even number
			if ((sampleFactor%2)!=0) sampleFactor--;
			//Factor up the width of the image
			size *= sampleFactor;
		} else {
			//Factor down the width of the image
			size /= sampleFactor;
		} 
        if (orderType.equals(ROW)) {
        	createTopItemsRowImg(size, sampleFactor, lowSampInd);
        } else {
        	createTopItemsColImg(size, sampleFactor, lowSampInd);
        }
	}
	
	/******************************************************************
	 * METHOD: createTopItemsRowImg
	 *
	 * This method constructs a BufferedImage containing the arrows for
	 * each row top item.  This image is narrow in width and the height
	 * of the heatmap 
	 ******************************************************************/
	private void createTopItemsRowImg(int size, Float sampleFactor, boolean lowSampInd)  throws Exception {
        BufferedImage image = new BufferedImage(TOP_ITEMS_IMAGE_WIDTH, size, BufferedImage.TYPE_INT_RGB);
        HeatmapDataGenerator.fillDendroImage(image, size, TOP_ITEMS_IMAGE_WIDTH, RGB_WHITE);
        int upCtr = 0;
        int downCtr = 0;
        for (int i = 0; i < topItemsLines.size();i++) {
        	Object[] line = topItemsLines.get(i);
        	int startpos = (Math.round((new Float((int)line[0]))*sampleFactor)) - (sampleFactor.intValue()/2);
        	int endpos = (Math.round((new Float((int)line[1]))*sampleFactor)) - (sampleFactor.intValue()/2);
        	if (!lowSampInd) {
	        	startpos = (Math.round((new Float((int)line[0]))/(sampleFactor+new Float(.0001))));
	        	endpos = (Math.round((new Float((int)line[1]))/sampleFactor));
        	}
        	startpos = startpos >= size ? size-= 1 : startpos;
        	endpos = endpos >= size ? size-= 1 : endpos;
        	int breakpt = TOP_ITEMS_IMAGE_WIDTH;
        	if (startpos == endpos) {
        		upCtr = 0;
        		downCtr = 0;
        	} else if (startpos > endpos) {
        		upCtr++;
        		downCtr = 0;
        		breakpt = upCtr*4;
        	}  else {
        		upCtr = 0;
        		downCtr++;
        		breakpt = TOP_ITEMS_IMAGE_WIDTH - (downCtr*4);
        	}
        	drawImgHorizLine(image, startpos, 0, breakpt);
        	if (breakpt < TOP_ITEMS_IMAGE_WIDTH) {
        		drawImgHorizLine(image, endpos, breakpt, TOP_ITEMS_IMAGE_WIDTH);
        		drawImgVertLine(image, breakpt, startpos > endpos ? endpos : startpos,  startpos > endpos ? startpos : endpos);
        	}
        }
        topItemImage = image;
	}
	
	/******************************************************************
	 * METHOD: createTopItemsColImg
	 *
	 * This method constructs a BufferedImage containing the arrows for
	 * each column top item.  This image is narrow in height and the width
	 * of the heatmap 
	 ******************************************************************/
	public void createTopItemsColImg(int size, Float sampleFactor, boolean lowSampInd)  throws Exception {
        BufferedImage image = new BufferedImage(size, TOP_ITEMS_IMAGE_WIDTH, BufferedImage.TYPE_INT_RGB);
        HeatmapDataGenerator.fillDendroImage(image, TOP_ITEMS_IMAGE_WIDTH, size, RGB_WHITE);
        int upCtr = 0;
        int downCtr = 0;
        for (int i = 0; i < topItemsLines.size();i++) {
        	Object[] line = topItemsLines.get(i);
        	int startpos = (Math.round((new Float((int)line[0]))*sampleFactor)) - (sampleFactor.intValue()/2);
        	int endpos = (Math.round((new Float((int)line[1]))*sampleFactor)) - (sampleFactor.intValue()/2);
        	if (!lowSampInd) {
	        	startpos = (Math.round((new Float((int)line[0]))/(sampleFactor+new Float(.0001))));
	        	endpos = (Math.round((new Float((int)line[1]))/sampleFactor));
        	}
        	startpos = startpos >= size ? size-= 1 : startpos;
        	endpos = endpos >= size ? size-= 1 : endpos;
        	int breakpt = TOP_ITEMS_IMAGE_WIDTH;
        	if (startpos == endpos) {
        		upCtr = 0;
        		downCtr = 0;
        	} else if (startpos > endpos) {
        		upCtr++;
        		downCtr = 0;
        		breakpt = upCtr*4;
        	}  else {
        		upCtr = 0;
        		downCtr++;
        		breakpt = TOP_ITEMS_IMAGE_WIDTH - (downCtr*4);
        	}
        	drawImgVertLine(image, startpos, 0, breakpt);
        	if (breakpt < TOP_ITEMS_IMAGE_WIDTH) {
        		drawImgVertLine(image, endpos, breakpt, TOP_ITEMS_IMAGE_WIDTH);
        		drawImgHorizLine(image, breakpt, startpos > endpos ? endpos : startpos,  startpos > endpos ? startpos : endpos);
        	}
        }
        topItemImage = image;
	}

	/******************************************************************
	 * METHOD: drawImgHorizLine
	 *
	 * This method draws a horizontal line on the BufferedImage containing
	 * top item arrows for the PDF.
	 ******************************************************************/
	private void drawImgHorizLine(BufferedImage bI, int loc, int start, int end)  throws Exception {
    	if (orderType.equals(ROW)) {
    		for (int i=start;i<end;i++) {
        		bI.setRGB(i, loc, RGB_BLACK);
    		}
    	} else {
    		int length = (end - start)+1;
    		for (int i=start;i<start+length;i++) {
        		bI.setRGB(i, loc, RGB_BLACK);
    		}
    	}
	}

	/******************************************************************
	 * METHOD: drawImgVertLine
	 *
	 * This method draws a vertical line on the BufferedImage containing
	 * top item arrows for the PDF.
	 ******************************************************************/
	private void drawImgVertLine(BufferedImage bI, int loc, int start, int end)  throws Exception {
    	if (orderType.equals(ROW)) {
    		int length = (end - start)+1;
    		for (int i=start;i<start+length;i++) {
        		bI.setRGB(loc, i, RGB_BLACK);
    		}
    	} else {
    		for (int i=start;i<end;i++) {
        		bI.setRGB(loc, i, RGB_BLACK);
    		}
    	}
	}
	
	/******************************************************************
	 * METHOD: getLabelText
	 *
	 * This method abbreviates label text (if necessary) according to the
	 * parameters for maximum label length and abbreviation method.  It
	 * is used to generate label text for the PDF.
	 ******************************************************************/
	private String getLabelText(String label)  throws Exception {
		int maxLength = Integer.parseInt(labelMaxLength);
		String newLabel = label;
		if (label.length() > Integer.parseInt(labelMaxLength)) {
			if (labelAbbrevMethod.equals("END")) {
				newLabel = label.substring(0,maxLength - 3)+"...";
			} else if (labelAbbrevMethod.equals("MIDDLE")) {
				newLabel = label.substring(0,(maxLength/2 - 1))+"..."+label.substring(label.length()-(maxLength/2 - 2),label.length());
			} else {
				newLabel = "..."+label.substring(0,maxLength - 3);
			}
		}
		return newLabel;
	}
}
