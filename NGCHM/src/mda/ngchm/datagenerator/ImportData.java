/*******************************************************************
 * CLASS: ImportData
 *
 * This class instantiates an ImportData object for a given user-
 * provided data matrix.  The ImportData object is the top tier of a 
 * three tiered data representation of the incoming matrix. The object 
 * contains row/col counters for the matrix and an array of 
 * ImportLayerData objects for each data layer (e.g. thumbnail, summary,
 * detail, ribbon horiz, and ribbon vert) in the matrix. The class 
 * also constructs 2 string arrayLists containing the labels for 
 * import rows and columns.
 * 
 * Author: Mark Stucky
 * Date: December 14, 2015
 ******************************************************************/

package mda.ngchm.datagenerator;

import java.awt.image.BufferedImage;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Set;

import org.json.simple.JSONObject;
import org.json.simple.JSONArray;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;

import static mda.ngchm.datagenerator.ImportConstants.*;

public class ImportData { 
	public String chmName;
	public String builderVersion;
	public String chmDescription;
	public int importRows;
	public int importCols;
	public String readOnly = NO;
	public String readMatrices = YES;
	public String writeTiles = YES;
	public boolean generatePDF = false;
	public boolean generateFullPDF = false;
	public boolean generateNGCHM = false;
	public boolean generateHTML = false;
	public ArrayList<AttributeData> chmAttributes = new ArrayList<AttributeData>();
	public String outputDir;
	public RowColData rowData;
	public RowColData colData;
	public List<InputFile> matrixFiles = new ArrayList<InputFile>();
	public Float tnMatrix[][];
	public BufferedImage tnImage;
	public String summaryWidth = "50";
	public String detailWidth = "50";
	public String summaryHeight = "100";
	public String detailHeight = "100";
	public List<Float[][]> pdfMatrices = new ArrayList<Float[][]>();
	public List<BufferedImage> matrixImages = new ArrayList<BufferedImage>();
	
	/*******************************************************************
	 * CONSTRUCTOR: ImportData
	 *
	 * This constructor creates an ImportData object containing an array
	 * of ImportLayerData objects for each data layer to be generated.
	 ******************************************************************/
	public ImportData(String[] fileInfo) throws Exception
	{
		if (fileInfo.length > 1) {
			for (int i=1;i< fileInfo.length;i++) {
				String infoItem = fileInfo[i];
				if (infoItem.equals(GENERATE_PDF)) {
					generatePDF = true;
				} else if (infoItem.equals(GENERATE_FULL_PDF)) {
					generateFullPDF = true;
				} else if (infoItem.equals(GENERATE_NGCHM)) {
					generateNGCHM = true;
				} else if (infoItem.equals(GENERATE_HTML)) {
					generateNGCHM = true;
					generateHTML = true;
				}
			}
		}
			
		// Retrieve heatmap properties
		setHeatmapProperties(new File(fileInfo[0]));
		
		//Get rows/cols values after adding cut rows and columns
		InputFile iFile = this.matrixFiles.get(0);
		int rows = iFile.rows;     
		int cols = iFile.cols; 
		if (colData.dendroFile != null) {
			colData.generateDendroMatrix(cols);
		}
		if (rowData.dendroFile != null) {
			rowData.generateDendroMatrix(rows);
		}
	}
	
	/*******************************************************************
	 * METHOD: getInputFileRowCols
	 *
	 * This method reads the incoming matrix and extracts the number of
	 * data rows and columns.
	 ******************************************************************/
	private int[] getImportRowsCols(JSONObject matrix) throws Exception {
		int[] rowsCols = new int[2];
   		String matrixFile = (String) matrix.get(PATH);
   		int rowStart = matrix.get(DATA_START_ROW) != null ? Integer.parseInt((String) matrix.get(DATA_START_ROW)) : 1;
   		int colStart = matrix.get(DATA_START_COL) != null ? Integer.parseInt((String) matrix.get(DATA_START_COL)) : 1;
   		int rowCov = matrix.get(ROW_COVARIATES) != null ? Integer.parseInt((String) matrix.get(ROW_COVARIATES)) : 0;
   		int colCov = matrix.get(COL_COVARIATES) != null ? Integer.parseInt((String) matrix.get(COL_COVARIATES)) : 0;
   		int rowEnd = matrix.get(DATA_END_ROW) != null ? Integer.parseInt((String) matrix.get(DATA_END_ROW)) : 0;
   		int rowDataStart = rowStart+colCov;
   		int colDataStart = colStart+rowCov;
   		int rowId = 0;
		BufferedReader br = null;
	    try {
			br = new BufferedReader(new FileReader(new File(matrixFile)));
		    //Move to beginning of matrix data
		    for (int i=0;i<rowDataStart;i++) {
		    	br.readLine();
		    }
		    String sCurrentLine;
			while((sCurrentLine = br.readLine()) != null) {
				rowId++;
				String vals[] = sCurrentLine.split("\t");
				rowsCols[1] = (vals.length - colDataStart);
	            if((rowEnd>0) && (rowEnd==rowId+rowDataStart)) {
	            	break;
	            }
			}	
		    br.close();
		    // Set number of rows (accounting for header)
		    rowsCols[0] = rowId;
	        if ((rowsCols[0] < 0) || (rowsCols[1] < 0)) {
	        	throw new Exception("CONFIGURATION INVALID: Configured data start and end rows invalid in heatmapProperties.json");
	        }

	    } finally {
	    	try {
	    		br.close();
	    	} catch (Exception ex) {}
	    }
	    return rowsCols;
	}

	/*******************************************************************
	 * METHOD: setHeatmapProperties
	 *
	 * This method retrieves and sets all heatmap properties on the 
	 * ImportData object. 
	 ******************************************************************/
	private void setHeatmapProperties(File filename) throws Exception {
        JSONParser parser = new JSONParser();
        FileReader propsFile = new FileReader(filename);
        try {     
            Object obj = parser.parse(propsFile); 
            JSONObject jsonObject =  (JSONObject) obj;
            JSONArray inputfiles = (JSONArray) jsonObject.get(MATRIX_FILES);
       		JSONObject matrix = (JSONObject) inputfiles.get(0);
    		int[] rowsCols = getImportRowsCols(matrix);
    		importRows = rowsCols[0];
    		importCols = rowsCols[1];
            for (int i=0; i < inputfiles.size();i++) {
           		JSONObject jo = (JSONObject) inputfiles.get(i);
            	InputFile iFile = new InputFile(jo, DATA_LAYER+(i+1), DATA_POSITION+(i+1), importRows, importCols);
        		int[] inputRowsCols = getImportRowsCols(jo);
        		iFile.rows = inputRowsCols[0];
        		iFile.cols = inputRowsCols[1];
        		matrixFiles.add(iFile);
        	}

       		String readonly = (String) jsonObject.get(READ_ONLY);
       		if (readonly != null) {
       			readOnly = readonly;
       		}
       		String mapname = (String) jsonObject.get(CHM_NAME);
       		String matrixRead = (String)jsonObject.get(READ_MATRICES);
       		if ((matrixRead != null)  && (YESNO_VALUES.contains(matrixRead))) {
       			readMatrices = matrixRead;
       		}
       		String tileWrite = (String)jsonObject.get(WRITE_TILES);
       		if ((tileWrite != null) && (YESNO_VALUES.contains(tileWrite))) {
       			writeTiles = tileWrite;
       			//If tile write, then MUST read matrices
       			if (tileWrite.equals(YES)) {
          			readMatrices = tileWrite;
       			}
       		}
       		String builderV = (String) jsonObject.get(BUILDER_VER);
       		if (builderV != null) {
       			builderVersion = builderV;
       		} else {
       			builderVersion = NA;
       		};
       		//Cleanup slashes in mapname and replace with underscore char
       		mapname = mapname.replace("/","_");
       		mapname = mapname.replace("\\","_");
            chmName = mapname;
            chmDescription = (String) jsonObject.get(CHM_DESC);
            String sumWidth = (String) jsonObject.get(SUMMARY_WIDTH);
			if (sumWidth != null) {
				summaryWidth = sumWidth;
				detailWidth = String.valueOf(100 - Integer.parseInt(summaryWidth));
			}
            String sumHgt = (String) jsonObject.get(SUMMARY_HEIGHT); 
			if (sumHgt != null) {
				summaryHeight = sumHgt;
			}
            String detHgt = (String) jsonObject.get(DETAIL_HEIGHT); 
			if (detHgt != null) {
				detailHeight = detHgt;
			}
            JSONArray tags = (JSONArray) jsonObject.get(CHM_ATTRS);
            if (tags != null) {
	            for (int i=0; i < tags.size();i++) {
	           		JSONObject jo = (JSONObject) tags.get(i);
					@SuppressWarnings("unchecked")
					Set<String> keyset = jo.keySet();
	            	Iterator<String> ki = keyset.iterator();
	                while(ki.hasNext()) {
	                    String elem = ki.next();
	                    String elemVal = (String) jo.get(elem);
	                    AttributeData aData = new AttributeData(elem, elemVal);
	                    chmAttributes.add(aData);
	                 }
	        	}
            }
            JSONObject rowConfigData = (JSONObject) jsonObject.get(ROW_CONFIGURATION);
            InputFile iFile = matrixFiles.get(0);
            rowData = new RowColData(ROW, importRows,rowConfigData, iFile);
            JSONObject colConfigData = (JSONObject) jsonObject.get(COL_CONFIGURATION);
            colData = new RowColData(COL, importCols, colConfigData, iFile);
            for (int i=0; i < matrixFiles.size();i++) {
           		InputFile ifl = matrixFiles.get(i);
           		ifl.processInputFile(rowData, colData);
        	}
        	outputDir = (String) jsonObject.get(OUTPUT_LOC);
        	JSONArray classfiles = (JSONArray) jsonObject.get(CLASS_FILES);
            int rowCtr = 0;
            int colCtr = 0;
            ArrayList<String> rowClassNames= new ArrayList<String>();
            ArrayList<String> colClassNames= new ArrayList<String>();
            for (int i=0; i < classfiles.size();i++) {
           		JSONObject jo = (JSONObject) classfiles.get(i);
           		String pos = (String) jo.get(POSITION);
           		String id = EMPTY;
    			String classFile = (String) jo.get(PATH);
        		if (pos.equals("row")) {
        			if ((classFile.equals("treecut")) && (!rowData.orderMethod.equals(ORDER_HIERARCHICAL))) {
        				//Do nothing: Skip treecut covariate if data not clustered]
        			} else {
	        			rowCtr++;
	            		id = ROW_CLASS+(rowCtr);
	            		InputClass iClass = new InputClass(jo, pos, rowData, rowCtr, iFile,rowClassNames);
	            		rowClassNames.add((String) jo.get(NAME));
	        			rowData.classFiles.add(iClass);
        			}
        		} else {
        			if ((classFile.equals("treecut")) && (!colData.orderMethod.equals(ORDER_HIERARCHICAL))) {
        				//Do nothing: Skip treecut covariate if data not clustered
        			} else {
            			colCtr++;
                		id = COL_CLASS+(colCtr);
                		InputClass iClass = new InputClass(jo , pos, colData, colCtr, iFile,colClassNames);
	            		colClassNames.add((String) jo.get(NAME));
             			colData.classFiles.add(iClass);
        			}
        		}
        	}
            propsFile.close();
       } catch (FileNotFoundException e) {
            System.out.println("heatmapProperties.JSON file not found. Terminating HeatmapDataGenerator");
            e.printStackTrace();
        } catch (IOException e) {
            e.printStackTrace();
        } catch (ParseException e) {
            e.printStackTrace();
        } finally {
            propsFile.close();
            propsFile = null;
        }
    }

}
