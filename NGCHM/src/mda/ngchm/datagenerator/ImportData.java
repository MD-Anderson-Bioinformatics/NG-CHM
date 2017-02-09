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
	public String chmDescription;
	public int importRows;
	public int importCols;
	public String readOnly = NO;
	public boolean generatePDF = false;
	public ArrayList<AttributeData> chmAttributes = new ArrayList<AttributeData>();
	public String outputDir;
	public RowColData rowData;
	public RowColData colData;
	public List<InputClass> rowClassFiles = new ArrayList<InputClass>();
	public List<InputClass> colClassFiles = new ArrayList<InputClass>();
	public List<InputFile> matrixFiles = new ArrayList<InputFile>();
	//Image data elements used in PDF generation
	public Float tnMatrix[][];
	public BufferedImage tnImage;
	public List<Float[][]> pdfMatrices = new ArrayList<Float[][]>();
	public List<BufferedImage> matrixImages = new ArrayList<BufferedImage>();
	public List<BufferedImage> rowClassImages = new ArrayList<BufferedImage>();
	public List<BufferedImage> rowClassLegends = new ArrayList<BufferedImage>();
	public List<String[]> rowClassValues = new ArrayList<String[]>();
	public List<String> rowDendroValues = new ArrayList<String>();
	public int[][] rowDendroMatrix;
	public List<BufferedImage> colClassImages = new ArrayList<BufferedImage>();
	public List<BufferedImage> colClassLegends = new ArrayList<BufferedImage>();
	public List<String[]> colClassValues = new ArrayList<String[]>();
	public List<String> colDendroValues = new ArrayList<String>();
	public int[][] colDendroMatrix;
	public BufferedImage colDendroImage;
	public BufferedImage rowDendroImage;

	/*******************************************************************
	 * CONSTRUCTOR: ImportData
	 *
	 * This constructor creates an ImportData object containing an array
	 * of ImportLayerData objects for each data layer to be generated.
	 ******************************************************************/
	public ImportData(String[] fileInfo)
	{
		if ((fileInfo.length > 1) && (fileInfo[1].equals("-PDF"))) {
			generatePDF = true;
		}
		// Retrieve heatmap properties
		setHeatmapProperties(new File(fileInfo[0]));
	}
	
	/*******************************************************************
	 * METHOD: getInputFileRowCols
	 *
	 * This method reads the incoming matrix and extracts the number of
	 * data rows and columns.
	 ******************************************************************/

	private void setInputFileRowCols(String matrixFile) {
		int rowId = 0;
		BufferedReader br = null;
	    try {
			br = new BufferedReader(new FileReader(new File(matrixFile)));
		    String sCurrentLine;
			while((sCurrentLine = br.readLine()) != null) {
				rowId++;
				if (rowId == 2) {
					String vals[] = sCurrentLine.split("\t");
					importCols = vals.length - 1;

				}
			}	
		    br.close();
		    // Set number of rows (accounting for header)
		    importRows = rowId - 1;
	    } catch (Exception ex) {
	    	System.out.println("Exception: "+ ex.toString());
	    } finally {
	    	try {
	    		br.close();
	    	} catch (Exception ex) {}
	    }
		return;
	}

	/*******************************************************************
	 * METHOD: setHeatmapProperties
	 *
	 * This method retrieves and sets all heatmap properties on the 
	 * ImportData object. 
	 ******************************************************************/
	private void setHeatmapProperties(File filename) {
        JSONParser parser = new JSONParser();

        try {     
            Object obj = parser.parse(new FileReader(filename));
            JSONObject jsonObject =  (JSONObject) obj;
            JSONArray inputfiles = (JSONArray) jsonObject.get(MATRIX_FILES);
            //Get first matrix file and set importRows and importCols
       		JSONObject jof = (JSONObject) inputfiles.get(0);
       		String jofPath = (String) jof.get(PATH);
       		setInputFileRowCols(jofPath);
       		String readonly = (String) jsonObject.get(READ_ONLY);
       		if (readonly != null) {
       			readOnly = readonly;
       		}
            chmName = (String) jsonObject.get(CHM_NAME);
            chmDescription = (String) jsonObject.get(CHM_DESC);
            JSONArray tags = (JSONArray) jsonObject.get(CHM_ATTRS);
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
            JSONObject rowConfigData = (JSONObject) jsonObject.get(ROW_CONFIGURATION);
            rowData = setRowColData(ROW, importRows, rowConfigData);
            JSONObject colConfigData = (JSONObject) jsonObject.get(COL_CONFIGURATION);
            colData = setRowColData(COL, importCols, colConfigData);
            for (int i=0; i < inputfiles.size();i++) {
           		JSONObject jo = (JSONObject) inputfiles.get(i);
            	InputFile iFile = new InputFile(jo, DATA_LAYER+(i+1), DATA_POSITION+(i+1), rowData, colData);
        		matrixFiles.add(iFile);
        	}
        	outputDir = (String) jsonObject.get(OUTPUT_LOC);
        	JSONArray classfiles = (JSONArray) jsonObject.get(CLASS_FILES);
            int rowCtr = 0;
            int colCtr = 0;
            for (int i=0; i < classfiles.size();i++) {
           		JSONObject jo = (JSONObject) classfiles.get(i);
           		String pos = (String) jo.get(POSITION);
           		String id;
        		if (pos.equals("row")) {
        			rowCtr++;
            		id = ROW_CLASS+(rowCtr);
            		InputClass iFile = new InputClass(jo, id, pos);
        			rowClassFiles.add(iFile);
        		} else {
        			colCtr++;
            		id = COL_CLASS+(colCtr);
            		InputClass iFile = new InputClass(jo ,id, pos);
        			colClassFiles.add(iFile);
        		}
        	}

        } catch (FileNotFoundException e) {
            //Do nothing for now
        } catch (IOException e) {
            e.printStackTrace();
        } catch (ParseException e) {
            e.printStackTrace();
        }
    }	
	
	private RowColData setRowColData(String type, int rowColSize, JSONObject configData) {
		RowColData rcData;
        String order = (String) configData.get(ORDER_METHOD);
        String extraFile = (configData.get(EXTRA_FILE)!=null) ? (String) configData.get(EXTRA_FILE): null;
        if (ORDER_HIERARCHICAL.equals(order)) {
        	rcData = new RowColData(jsonArrayToStringArray((JSONArray)configData.get(DATA_TYPE)), type, rowColSize, (String) configData.get(ORDER_FILE), (String) configData.get(ORDER_METHOD), (String) configData.get(DISTANCE_METRIC), (String) configData.get(AGGLOMERATION_METHOD), (String) configData.get(DENDRO_FILE), extraFile);
       } else {
        	rcData = new RowColData(jsonArrayToStringArray((JSONArray)configData.get(DATA_TYPE)), type, rowColSize, (String) configData.get(ORDER_FILE), (String) configData.get(ORDER_METHOD));
       }
		return rcData;
	}
	
	private String[] jsonArrayToStringArray(JSONArray jsnArr) {
		String[] strArr = new String[jsnArr.size()];
		for (int i = 0; i < jsnArr.size(); i++) {
			strArr[i] = (String)jsnArr.get(i);
		}
		return strArr;
	}
}
