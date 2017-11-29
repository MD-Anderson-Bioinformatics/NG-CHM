/*******************************************************************
 * CLASS: InputFile
 *
 * This class instantiates an InputFile object for a given matrix
 * data layer file.  It is called when the heatmapProperties.json file
 * is parsed by the ImportData class for each incoming data matrix layer. 
 * An object is created; A colormap is created for the matrix; The matrix
 * data is re-ordered in clustered order, and all of the ImportLayerData and
 * ImportTileData objects are created for the matrix.
 * 
 * Author: Mark Stucky
 * Date: March 29, 2016
 ******************************************************************/
package mda.ngchm.datagenerator;

import static mda.ngchm.datagenerator.ImportConstants.*;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileReader;
import java.util.ArrayList;
import java.util.Scanner;
import java.util.HashMap;
import java.util.Map;


import org.json.simple.JSONObject;


public class InputFile {
	public String name;
	public String id;
	public String file;
	public String position; 
	public boolean hasSummary = false;
	public ColorMap map;
	public float reorgMatrix[][];
	public int rows;
	public int cols;
	public int rowStart = 0;
	public int colStart = 0;
	public int rowEnd = 0;
	public int rowDataStart = 1;
	public int colDataStart = 1;
	public int rowCovs;
	public int colCovs;
	public String summaryMethod;
	public ArrayList<ImportLayerData> importLayers = new ArrayList<>();
	public String origMatrix[][];
	
	public InputFile(JSONObject jo, String idv, String pos, int importRows, int importCols) throws Exception {
		name = (String) jo.get(NAME);
		name.trim();
		id = idv.trim();
		file = (String) jo.get(PATH);
		rows = importRows;
		cols = importCols;
		String sumMeth = (String) jo.get(SUMMARY_METHOD);
		if (sumMeth != null) {
	        summaryMethod = sumMeth.trim();
		} else {
	        summaryMethod = METHOD_AVERAGE;
		}
		file.trim();
		position = pos.trim();
   		rowStart = jo.get(DATA_START_ROW) != null ? Integer.parseInt((String) jo.get(DATA_START_ROW)) : 1;
   		colStart = jo.get(DATA_START_COL) != null ? Integer.parseInt((String) jo.get(DATA_START_COL)) : 1;
   		rowCovs = jo.get(ROW_COVARIATES) != null ? Integer.parseInt((String) jo.get(ROW_COVARIATES)) : 0;
   		colCovs = jo.get(COL_COVARIATES) != null ? Integer.parseInt((String) jo.get(COL_COVARIATES)) : 0;
   		rowEnd = jo.get(DATA_END_ROW) != null ? Integer.parseInt((String) jo.get(DATA_END_ROW)) : 0;
   		rowDataStart = rowStart+colCovs;
   		colDataStart = colStart+rowCovs;
   		rowStart--;colStart--;
	   		
   		origMatrix = readInputMatrix();
		//Construct colorMap if map provided on JSON
		JSONObject jocm = (JSONObject) jo.get(COLORMAP);
		ColorMap cMap = new ColorMap();
		cMap.id = id; 
		if (jocm != null) {
			map = ColorMapGenerator.getJsonColors(jocm, cMap);
		} else {
			cMap.type = COLORTYPE_LINEAR;
			map = cMap;
		}
	}
	  
	public void processInputFile(RowColData rowData, RowColData colData) throws Exception { 
		int origCols = cols;
		//update input file rows and columns to account for cuts added to the matrix
	    cols += colData.cutLocations.length*colData.cutWidth;
	    rows += rowData.cutLocations.length*rowData.cutWidth;
		// Re-order the matrix file into the clustered order supplied be the R cluster order files 
		reorgMatrix = new float[rows+1][cols+1];   
		initMatrix(reorgMatrix);
		setReorderedInputMatrix(rowData, colData, origCols);
		//If map was not defined on original JSON, generate default map colors
		if (map.colors.isEmpty()) {
			map = ColorMapGenerator.getDefaultMapColors(map,this);
		}
		// Create thumbnail level ImportDataLayer
		ImportLayerData ild = new ImportLayerData(LAYER_THUMBNAIL, rows, cols);
		importLayers.add(ild);
		// If thumb is not already at a 1-to-1 ratio, create summary level ImportDataLayer.
		if (ild.rowInterval > 1 || ild.colInterval > 1) {
			hasSummary = true;
			ild = new ImportLayerData(LAYER_SUMMARY, rows, cols);
			importLayers.add(ild);
			// If summary is not already at a 1-to-1 ratio, create detail level,
			// ribbon vertical and ribbon horizontal level ImportDataLayers.
			if (ild.rowInterval > 1 || ild.colInterval > 1) {
				ild = new ImportLayerData(LAYER_DETAIL, rows, cols);
				importLayers.add(ild);
				ild = new ImportLayerData(LAYER_RIBBONVERT, rows, cols);
				importLayers.add(ild);
				ild = new ImportLayerData(LAYER_RIBBONHORIZ, rows, cols);
				importLayers.add(ild);
			}
		}
	}
	  
	/*******************************************************************
	 * METHOD: initMatrix
	 *
	 * This method initializes a 2 dimensional float matrix to contain
	 * low values in every data cell (excluding header row/col cells).
	 ******************************************************************/
	private void initMatrix(float matrix[][]) throws Exception {
        for (int i = 1; i < matrix.length; i++) {
	        for (int j = 1; j < matrix[0].length; j++) {
	        	matrix[i][j] = MIN_VALUES;
	        }
        }

	}
	
	/*******************************************************************
	 * METHOD: readInputMatrix
	 *
	 * This method reads in the data matrix file, finds the top left 
	 * corner of the matrix (which may be somewhere other than row 1, col 1),
	 * and writes JUST the matrix labels, covariate data (if app), and matrix
	 * data into a 2-dimensional array that will be stored on the InputFile
	 * object as the origData array.
	 ******************************************************************/
	private String[][] readInputMatrix() throws Exception {
		String errMsg = null;
		int rowCount = rows+colCovs+1, colCount = cols+rowCovs+1;
        if (!(new File(file).exists())) {
        	throw new Exception("ERROR: Data matrix file cannot be found");
        }
        FileInputStream inputStream = null;
        Scanner sc = null;
        String matrix[][] = new String[rowCount][colCount];
	    try {
	        inputStream = new FileInputStream(file);
	        sc = new Scanner(inputStream, "UTF-8");
	        // Construct a 2 dimensional array containing the data from the incoming
	        // (user provided) data matrix.
	        int pos = 0;
		    //Move to beginning of matrix data
		    for (int i=0;i<rowStart;i++) {
		    	sc.nextLine();
		    }
		    int headerLength = 0;
	        while (sc.hasNextLine()) {
        		if (errMsg != null) {
					throw new Exception(errMsg);
        		}
	            String line = sc.nextLine();
				if (!line.contains("\t")) {
			    	errMsg = "Matrix file ("+ name +") is not tab delimited";
					break; 
				}
		        // Check to see if the column headers are lined up over the data or are
		        // offset by one to the left.  If the latter case is true, add a TAB to the line. 
	            if (pos == 0) {
		            String headerCols[] = line.split("\t");
		            if ((headerCols.length-rowCovs-colStart) < (cols+1)) {
		        		  line = TAB+line;
		            }
		            headerLength = line.split("\t").length;
	            } else if (pos >= rowDataStart - rowStart) {
	            	int dataRowLen = line.split("\t").length;
	            	errMsg = MatrixValidator.validateMatrixRowLength(headerLength, dataRowLen);
            		if (errMsg != null) {
            			errMsg += " Matrix Row: " + (pos + rowStart + 1);
            			throw new Exception(errMsg);
             		}
	            }
		        String toks[] = line.split("\t");
	            for (int i = colStart; i < toks.length; i++) {
	            	if (pos == 0) {
		            	if (i > colStart) {
		            		errMsg = MatrixValidator.validateMatrixLabelValue(toks[i], false);
		            		if (errMsg != null) {
			            		errMsg += (i+1);
			            		break;
		            		}
		            	}
	            	} else {
	            		if (i == colStart) {
		            		errMsg = MatrixValidator.validateMatrixLabelValue(toks[i], true);
		            		if (errMsg != null) {
			            		errMsg += (pos+rowStart+1);
			            		break;
		            		}
	            		} else if ((pos > colCovs) && (i >= colDataStart)) {
		            		errMsg = MatrixValidator.validateMatrixDataValue(toks[i]);
		            		if (errMsg != null) {
			            		errMsg += " Row: " + (pos+rowStart+1) + " Column: " + (i+1);
			            		break;
		            		}
	            		}
	            	}
            		matrix[pos][i-colStart] = toks[i];
	            }
	            // If data in matrix file ends before last line (i.e. there is anything after the matrix data including another matrix)
	            // stop pulling data for this layer
	            if((rowEnd>0) && (pos==(rowEnd-1) - rowStart)) {  
	            	break;
	            }
                pos++;
		        // note that Scanner suppresses exceptions
		        if (sc.ioException() != null) {
		            //do nothing
		        }
	         }
		 } finally {
	        if (inputStream != null) {
	        	try {
	        		inputStream.close();
	        	} catch (Exception ex) {
	        		//do nothing
	        	}
	        }
	        if (sc != null) {
	            sc.close();
	        }
	    }
	    return matrix;
	}

	/*******************************************************************
	 * METHOD: setReorderedInputMatrix
	 *
	 * This method re-orders the incoming data matrix into clustered order
	 * using the row/col clustering tsv files.  The output will be a matrix 
	 * with a matching number of rows and columns to the original but one that 
	 * is completely re-ordered using information in the order tsv files.  
	 * The result will be stored as a 2D String array (reorgMatrix) 
	 * on this ImportData object.
	 ******************************************************************/
	private void setReorderedInputMatrix(RowColData rowData, RowColData colData, int origCols) throws Exception {
		int rowCount = rows+1, colCount = cols+1;
        if (!(new File(file).exists())) {
        	throw new Exception("ERROR: Data matrix file cannot be found");
        }
        float matrix[][] = new float[rowCount][colCount];
        initMatrix(matrix);
	    try {
	    	for (int i=0;i<origMatrix.length;i++) {
	    		if ((i == 0) || (i>colCovs)) {
		    		String[] matrixRow = origMatrix[i];
		    		for (int j=0;j<matrixRow.length;j++) {
			    		if ((j == 0) || (j>rowCovs)) {
			            	float val = 0;
			            	try {
			            		if (NA_VALUES.contains(matrixRow[j]))	 {
			            			val = MAX_VALUES;
			            		} else {
			            			val = Float.parseFloat(matrixRow[j]);
			            		}
			            	} catch (NumberFormatException e) {
			            		if ((i != 0) && (j != 0)) {
			            			val = MAX_VALUES;
				            		System.out.println("Exception in InputFile.setReorderedInputMatrix Non-numeric or NA data found in matrix. Column: " + i + " Value: "+ matrixRow[j]); 
			            		}
			            	}
				    		int yPos = i == 0 ? 0 : i-colCovs;
				    		int xPos = j == 0 ? 0 : j-rowCovs;
				    		matrix[yPos][xPos]= val;
			    		}
			    		
		    		}
		    		
	    		}
	         }
	        // Create a new 2D string array and populate it with data from the 
	        // initial 2D array placing it in the clustered row order.
	        float reorg[][] = new float[rowCount][colCount];
	        initMatrix(reorg);
	        for (int row = 0; row < rowData.orderArray.length; row++) {
	              reorg[rowData.orderArray[row]] = matrix[row];
	        }
	
	        // Create a new 2D string array and populate it with data from the 
	        // row-ordered 2D array placing it in the clustered column order.
	        for (int col = 0; col < colData.orderArray.length; col++) {
	              int newCol = colData.orderArray[col];
	              for (int row = 0; row < reorg.length; row++) {
	            	  reorgMatrix[row][newCol] = reorg[row][col];
	              }
	        }
		} catch (Exception ex) {
	    	System.out.println("Exception in InputFile.setReorderedInputMatrix: Reading Matrix. "+ ex.toString());
	        throw ex;
	    }
	}
	
	public ColorMap getMap() {
		return map;
	}
}
