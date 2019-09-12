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

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.FileInputStream;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Scanner;

import org.json.simple.JSONArray;
import org.json.simple.JSONObject;


public class InputFile {
	public String name;
	public String id;
	public String file;
	public String position; 
	public boolean hasSummary = false;
	public boolean hasDetail = false;
	public boolean hasHorizontalRibbon = false;
	public boolean hasVerticalRibbon = false;
	public ColorMap map;
//	public float reorgMatrix[][];
	public int rows;
	public int cols;
	public int origRows;
	public int origCols;
	public int rowStart = 0;
	public int colStart = 0;
	public int rowEnd = 0;
	public int rowDataStart = 1;
	public int colDataStart = 1;
	public int rowCovs;
	public int colCovs;
	public String summaryMethod = METHOD_AVERAGE;
	public String gridShow = YES;
	public String gridColor = COLOR_WHITE;
	public String cutsColor = COLOR_WHITE;
	public String selectionColor = COLOR_LIME;
	public ArrayList<ImportLayerData> importLayers = new ArrayList<>();
	public BufferedImage distributionLegend;
	public int[] distributionCounts;
	public int missingCount;
	public float[] distributionBreaks;
	
	public InputFile(JSONObject jo, String idv, String pos, int importRows, int importCols) throws Exception {
		name = (String) jo.get(NAME);
		name.trim();
		id = idv.trim();
		file = (String) jo.get(PATH);
		rows = importRows;
		cols = importCols;
		origCols = cols;
		origRows = rows;
		String sumMeth = (String) jo.get(SUMMARY_METHOD);
		if (sumMeth != null) {
	        summaryMethod = sumMeth.trim();
		}
		String gridShw = (String) jo.get(GRID_SHOW);
		if (gridShw != null) {
	        gridShow = gridShw.trim();
		}
		String gridCol = (String) jo.get(GRID_COLOR);
		if (gridCol != null) {
	        gridColor = gridCol.trim();
		}
		String cutsCol = (String) jo.get(CUTS_COLOR);
		if (cutsCol != null) {
	        cutsColor = cutsCol.trim();
		}
		String selColor = (String) jo.get(SELECTION_COLOR);
		if (selColor != null) {
	        selectionColor = selColor.trim();
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
	   		
   		//Construct colorMap if map provided on JSON
		JSONObject jocm = (JSONObject) jo.get(COLORMAP);
		ColorMap cMap = new ColorMap();
		cMap.id = id; 
		if (jocm != null) {
			JSONArray breaks = (JSONArray) jocm.get(COLORMAP_THRESHOLDS);
 			if (breaks != null) {
	        	float preValue = Float.valueOf(breaks.get(0).toString());
		        for (int i=1; i < breaks.size();i++) {
		        	float curValue = Float.valueOf(breaks.get(i).toString());
		        	if (curValue <= preValue) {
		        		System.out.println("GALAXY PARAMETER ERROR: Supplied Matrix Breakpoint values are not in ascending order. Heat map generation halted.");
		        		break;
		        	}
		        	preValue = curValue;
		        }
			}
			map = ColorMapGenerator.getJsonColors(jocm, cMap);
		} else {
			cMap.type = COLORTYPE_LINEAR;
			map = cMap;
		}
	}
	  
	public void processInputFile(RowColData rowData, RowColData colData) throws Exception { 
		//update input file rows and columns to account for cuts added to the matrix
	    cols += colData.cutLocations.length*colData.cutWidth;
	    rows += rowData.cutLocations.length*rowData.cutWidth;
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
				if (ild.rowInterval > 1) {
					hasHorizontalRibbon = true;
				}
				if (ild.colInterval > 1) {
					hasVerticalRibbon = true;
				}
				if (ild.rowInterval > 1 || ild.colInterval > 1) {
					hasDetail = true;
				}
				ild = new ImportLayerData(LAYER_DETAIL, rows, cols);
				importLayers.add(ild);
				ild = new ImportLayerData(LAYER_RIBBONVERT, rows, cols);
				importLayers.add(ild);
				ild = new ImportLayerData(LAYER_RIBBONHORIZ, rows, cols);
				importLayers.add(ild);
			}
		}
		
	}
	  
	/*====================================================================
	 * BEGIN: ORIGINAL MATRIX READ  METHODS
	 *
	 * The methods that follow are concerned with reading the original 
	 * matrix file provided by the user.  The primary method here is 
	 * readInputMatrix which is called one time for each data layer,
	 * and creates a float array that is processed for reordering and then
	 * deleted. Methods for reading row/col embedded 
	 * classifications and labels are only called under specific 
	 * circumstances.  The embedded class methods when the matrix has
	 * classification data placed within and the label methods when
	 * ordering is Original or Random (i.e. NOT clustered)
	 *====================================================================*/

	/*******************************************************************
	 * METHOD: getReorderedInputMatrix
	 *
	 * This method reads in the data matrix file, converts matrix data 
	 * from string to float and re-orders the incoming data matrix into
	 * clustered order using the row/col clustering tsv files.  
	 ******************************************************************/
	public float[][] getReorderedInputMatrix(RowColData rowData, RowColData colData) throws Exception {
		String errMsg = null;
        if (!(new File(file).exists())) {
        	throw new Exception("ERROR: Data matrix file cannot be found");
        }
        FileInputStream inputStream = null;
        Scanner sc = null;
		float[][] matrix = new float[rows+1][cols+1];
		initializeMatrix(matrix);
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
		            if ((headerCols.length-rowCovs-colStart) < (origCols+1)) {
		        		  line = TAB+line;
		            } 
		            headerLength = line.split("\t").length;
		        } else if (pos >= rowDataStart - rowStart) {
		        	int dataRowLen = line.split("\t",-1).length;
	            	errMsg = MatrixValidator.validateMatrixRowLength(headerLength, dataRowLen);
            		if (errMsg != null) {
            			errMsg += " Matrix Row: " + (pos + rowStart + 1);
            			throw new Exception(errMsg);
             		}
	            }
	    		if ((pos == 0) || (pos>colCovs)) {
		        	String toks[] = line.split("\t",-1);
		        	int lineLen = (pos == 0 && headerLength < toks.length) ? headerLength : toks.length;
		    		//new row position based on clustering order file
	    			int yPos = pos == 0 ? 0 : pos-colCovs;
	    			int newRow = rowData.orderArray[yPos];
		            for (int i = colStart; i < lineLen; i++) {
	        			float fVal = 0;
		            	if (pos == 0) {
			            	if ((i > colStart) && (i < headerLength)) {
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
			            		} else {
			            			if (NA_VALUES.contains(toks[i])) {
			            				fVal = MAX_VALUES;
			            			} else {
			            				fVal = (float) Float.parseFloat(toks[i]);
			            			}
			            		}
		            		}
		            	}
			    		int xPos = i == 0 ? 0 : i-rowCovs;
			    		int newCol = colData.orderArray[xPos];
	            		matrix[newRow][newCol] = fVal;
	 	            }
		            // If data in matrix file ends before last line (i.e. there is anything after the matrix data including another matrix)
		            // stop pulling data for this layer
		            if((rowEnd>0) && (pos==(rowEnd-1) - rowStart)) {  
		            	break;
		            }
	    		}
                pos++;
		        // note that Scanner suppresses exceptions
		        if (sc.ioException() != null) {
		            //do nothing
		        }
	         }
		 } catch (Exception e) {
			 throw e;
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
	 * METHOD: readEmbeddedColClass
	 *
	 * This method reads in the data matrix file and returns a map 
	 * containing matching string pairs with the column label and 
	 * classification data for a column covariate bar.
	 ******************************************************************/
	public Map<String,String> readEmbeddedColClass(String name) throws Exception {
		String errMsg = null;
        if (!(new File(file).exists())) {
        	throw new Exception("ERROR: Data matrix file cannot be found");
        }
		Map<String, String> classBar = new HashMap<String, String>();
        FileInputStream inputStream = null;
        Scanner sc = null;
        String colLabels[]= new String[origCols];
        String colValues[]= new String[origCols];
	    try {
	        inputStream = new FileInputStream(file);
	        sc = new Scanner(inputStream, "UTF-8");
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
		            if ((headerCols.length-rowCovs-colStart) < (origCols+1)) {
		        		  line = TAB+line;
		            } 
		            headerLength = line.split("\t").length;
		        } else if (pos >= rowDataStart - rowStart) {
		        	int dataRowLen = line.split("\t",-1).length;
	            	errMsg = MatrixValidator.validateMatrixRowLength(headerLength, dataRowLen);
            		if (errMsg != null) {
            			errMsg += " Matrix Row: " + (pos + rowStart + 1);
            			throw new Exception(errMsg);
             		}
	            }
	        	String toks[] = line.split("\t",-1);
	        	int lineLen = (pos == 0 && headerLength < toks.length) ? headerLength : toks.length;
	            for (int i = colStart; i < lineLen; i++) {
	            	if (pos == 0) {
		            	if ((i > colStart) && (i < headerLength)) {
			            	if ((i > (colStart+rowCovs)) && (i < headerLength)) {
			            		colLabels[i-(colStart+rowCovs+1)] = toks[i];
			            	}
		            	}
	            	} else {
	            		if (i == colStart) {  //right here we check label for column covar
		            		if (!name.contentEquals(toks[i])) {
			            		break;
		            		}
	            		} else if(i >= colDataStart) {  //if 
		            		colValues[i-(colStart+rowCovs+1)] = toks[i];
	            		}
	            	}
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
	        
	    	for (int i=0;i<colLabels.length;i++) {
               	classBar.put(colLabels[i], colValues[i]);
	    	}
		 } catch (Exception e) {
			 throw e;
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
	    return classBar;
	}
	
	/*******************************************************************
	 * METHOD: readEmbeddedRowClass
	 *
	 * This method reads in the data matrix file and returns a map 
	 * containing matching string pairs with the row label and 
	 * classification data for a row covariate bar.
	 ******************************************************************/
	public Map<String,String> readEmbeddedRowClass(String name) throws Exception {
		String errMsg = null;
        if (!(new File(file).exists())) {
        	throw new Exception("ERROR: Data matrix file cannot be found");
        }
		Map<String, String> classBar = new HashMap<String, String>();
        FileInputStream inputStream = null;
        Scanner sc = null;
        String rowLabels[]= new String[origRows];
        String rowValues[]= new String[origRows];
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
		    int dataCol = 0;
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
		            if ((headerCols.length-rowCovs-colStart) < (origCols+1)) {
		        		  line = TAB+line;
		            } 
		            headerLength = line.split("\t").length;
		        } else if (pos >= rowDataStart - rowStart) {
		        	int dataRowLen = line.split("\t",-1).length;
	            	errMsg = MatrixValidator.validateMatrixRowLength(headerLength, dataRowLen);
            		if (errMsg != null) {
            			errMsg += " Matrix Row: " + (pos + rowStart + 1);
            			throw new Exception(errMsg);
             		}
	            }
	        	String toks[] = line.split("\t",-1);
	        	int lineLen = (pos == 0 && headerLength < toks.length) ? headerLength : toks.length;
	            for (int i = colStart; i < lineLen; i++) {
	            	if (pos == 0) {
		            	if ((i > colStart) && (i < headerLength)) {
			            	if (name.equals(toks[i])) {
			            		dataCol = i;
			            		break;
			            	}
		            	}
	            	} else if (pos > (rowStart+colCovs)) {
	            		if (i == colStart) {  //right here we check label for column covar
		            		rowLabels[pos-(colCovs+1)] = toks[i];
	            		} else if (i == dataCol) {  //if 
		            		rowValues[pos-(colCovs+1)] = toks[i];
	            		}
	            	}
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
	        
	    	for (int i=0;i<rowLabels.length;i++) {
               	classBar.put(rowLabels[i], rowValues[i]);
	    	}
		 } catch (Exception e) {
			 throw e;
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
	    return classBar;
	}
	
	/*******************************************************************
	 * METHOD: readRowLabels
	 *
	 * This method reads in the data matrix file and returns a string 
	 * array containing the row labels from the matrix.
	 ******************************************************************/
	public String[] readRowLabels() throws Exception {
		System.out.println("Begin readRowLabels: " + id + " @: " + new Date());  
		String errMsg = null;
        if (!(new File(file).exists())) {
        	throw new Exception("ERROR: Data matrix file cannot be found");
        }
        FileInputStream inputStream = null;
        Scanner sc = null;
        String rowLabels[]= new String[origRows];
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
		            if ((headerCols.length-rowCovs-colStart) < (origCols+1)) {
		        		  line = TAB+line;
		            } 
		            headerLength = line.split("\t").length;
		        } else if (pos >= rowDataStart - rowStart) {
		        	int dataRowLen = line.split("\t",-1).length;
	            	errMsg = MatrixValidator.validateMatrixRowLength(headerLength, dataRowLen);
            		if (errMsg != null) {
            			errMsg += " Matrix Row: " + (pos + rowStart + 1);
            			throw new Exception(errMsg);
             		}
	            }
	        	String toks[] = line.split("\t",-1);
	        	int lineLen = (pos == 0 && headerLength < toks.length) ? headerLength : toks.length;
	            for (int i = colStart; i < lineLen; i++) {
	            	if (pos > (rowStart+colCovs)) {
	            		if (i == colStart) {  //right here we check label for column covar
		            		rowLabels[pos-(colCovs+1)] = toks[i];
	            		} else {
	            			break;
	            		}
	            	} else {
	            		break;
	            	}
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
			System.out.println("End readRowLabels: " + id + " @: " + new Date());  
		 } catch (Exception e) {
			 throw e;
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
	    return rowLabels;
	}
	
	/*******************************************************************
	 * METHOD: readColLabels
	 *
	 * This method reads in the data matrix file and returns a string 
	 * array containing the column labels from the matrix.
	 ******************************************************************/
	public String[] readColLabels() throws Exception {
		System.out.println("Begin readColLabels: " + id + " @: " + new Date());  
		String errMsg = null;
        if (!(new File(file).exists())) {
        	throw new Exception("ERROR: Data matrix file cannot be found");
        }
        FileInputStream inputStream = null;
        Scanner sc = null;
        String colLabels[]= new String[origCols];
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
	        while ((sc.hasNextLine() && pos < 1)) {
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
		            if ((headerCols.length-rowCovs-colStart) < (origCols+1)) {
		        		  line = TAB+line;
		            } 
		            headerLength = line.split("\t").length;
		        } else if (pos >= rowDataStart - rowStart) {
		        	int dataRowLen = line.split("\t",-1).length;
	            	errMsg = MatrixValidator.validateMatrixRowLength(headerLength, dataRowLen);
            		if (errMsg != null) {
            			errMsg += " Matrix Row: " + (pos + rowStart + 1);
            			throw new Exception(errMsg);
             		}
	            }
	        	String toks[] = line.split("\t",-1);
	        	int lineLen = (pos == 0 && headerLength < toks.length) ? headerLength : toks.length;
	            for (int i = colStart; i < lineLen; i++) {
	            	if (pos == 0) {
		            	if ((i > colStart) && (i < headerLength)) {
			            	if ((i > (colStart+rowCovs)) && (i < headerLength)) {
			            		colLabels[i-(colStart+rowCovs+1)] = toks[i];
			            	}
		            	}
	            	} 
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
			System.out.println("End readColLabels: " + id + " @: " + new Date());  
		 } catch (Exception e) {
			 throw e;
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
	    return colLabels;
	}
	
	/*====================================================================
	 * END: ORIGINAL MATRIX READ  METHODS
	 *==================================================================*/

	/*******************************************************************
	 * METHOD: initializeMatrix
	 *
	 * This method initializes a 2 dimensional float matrix to contain
	 * low values in every data cell (excluding header row/col cells).
	 ******************************************************************/
	private void initializeMatrix(float matrix[][]) throws Exception {
        for (int i = 1; i < matrix.length; i++) {
	        for (int j = 1; j < matrix[0].length; j++) {
	        	matrix[i][j] = MIN_VALUES;
	        }
        }

	}

	/*******************************************************************
	 * METHOD: createDistributionLegendImg
	 *
	 * This method creates a bufferedImage for the legend of the  
	 * classification bar using summary level info its color map. It is
	 * used in generating the heat map PDF.
	 ******************************************************************/
	public void createDistributionLegendImg(float[][] clusteredMatrix) throws Exception {
		
		ColorMap cm = getMap();
        float lowBP = Float.parseFloat(cm.breaks.get(0));
        float highBP = Float.parseFloat(cm.breaks.get(cm.breaks.size()-1));
        float range = highBP - lowBP;
        int missingNum = 0;
        int gapCount = 0;
        int binNums = 10;
        int threshNums = binNums - 1; 
        int[] countBins = new int[binNums];
        float[] thresh = new float[threshNums];
        for (int i = 0; i < threshNums; i++) {
     	   thresh[i] = lowBP + i*(range/(threshNums-1));
        }
        int asdf = 0;
        asdf = asdf +1;
        for (int i = 1; i < clusteredMatrix.length; i++) {
     	   for (int j = 1; j < clusteredMatrix[i].length; j++) {
     		   float v = clusteredMatrix[i][j];
     		   boolean gap = v == MIN_VALUES ? true : false;
     		   if (v == MAX_VALUES) {
     			  missingNum ++;
     		   } else if (gap) {
     			   gapCount ++;
     		   } else if (v < lowBP) {
     			   countBins[0]++;
     		   } else if (highBP <= v) {
     			   countBins[threshNums]++;
     		   } else {
     			   for (int k = 0; k < threshNums; k++) {
     				   if ( v < thresh[k]) {
     					   countBins[k]++;
     					   break;
     				   }
     			   }
     		   }
     	   }
        }
        asdf = asdf + 1;
        int maxCountInt = missingNum;
        for (int a = 0; a < binNums; a++) {
     	   if (countBins[a] > maxCountInt) {
     		  maxCountInt = countBins[a];
     	   }
        }
		int legendWidth = 110;
		int legendHeight = binNums*10+10+1; // +10 for the missing data, +1 for the border
		float maxCount = (float) maxCountInt/legendWidth;
		BufferedImage image = new BufferedImage(legendWidth, legendHeight, BufferedImage.TYPE_INT_ARGB);
		Color elemColor;
		int rgb = 0;
		for (int b = 0; b < threshNums; b++) {
			float eVal = thresh[b];
			int i = 0;
			// find the breakpoints that this value is between
			while (Float.parseFloat(cm.breaks.get(i)) <= eVal && i < cm.breaks.size()-1){
				i++;
			};
			Color lowCol = cm.colors.get(i-1);
			Color hiCol = cm.colors.get(i);
			float low = Float.parseFloat(cm.breaks.get(i-1));
			float hi = Float.parseFloat(cm.breaks.get(i));
			float ratio = (hi-eVal)/(hi-low);
			Color breakColor = ColorMapGenerator.blendColors(hiCol,lowCol,ratio);
			rgb = breakColor.getRGB();
			float length = Math.max(1,countBins[b]/maxCount-1);
			for (int c = 0; c < length; c++) {
				image.setRGB(c, b*10, RGB_BLACK);
				image.setRGB(c, b*10+10, RGB_BLACK);
				for (int d = 1; d < 10; d++) {
					image.setRGB(c, b*10+d, rgb);
				}
			}
			for (int d = 0; d < 11; d++) {
				image.setRGB((int)length, b*10+d, RGB_BLACK);
			}
		}
		elemColor = cm.colors.get(cm.colors.size()-1);
		rgb = elemColor.getRGB();
		float length = Math.max(1,countBins[threshNums]/maxCount-1);
		for (int e = 0; e < length; e++) {
			image.setRGB(e, threshNums*10, RGB_BLACK);
			image.setRGB(e, threshNums*10+10, RGB_BLACK);
			for (int f = legendHeight-20; f < legendHeight-11; f++) {
				image.setRGB(e, f, rgb);
			}
		}
		for (int d = 0; d < 11; d++) {
			image.setRGB((int)length, threshNums*10+d, RGB_BLACK);
		}
		elemColor = cm.missingColor;
		rgb = elemColor.getRGB();
		length = Math.max(1,missingCount/maxCount-1);
		for (int e = 0; e < length; e++) {
			image.setRGB(e, legendHeight-1, RGB_BLACK);
			image.setRGB(e, legendHeight-10, RGB_BLACK);
			for (int f = 0; f < 10; f++) {
				image.setRGB(e, legendHeight-10+f, rgb);
			}
		}
		for (int d = 0; d < 10; d++) {
			image.setRGB((int)length, legendHeight-10 + d, RGB_BLACK);
		}
		missingCount = missingNum;
		distributionCounts = countBins;
		distributionBreaks = thresh;
		distributionLegend = image;
	}
	

	public ColorMap getMap() {
		return map;
	}
}
