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
import java.io.FileReader;
import java.util.ArrayList;

import org.json.simple.JSONObject;


public class InputFile {
	public String name;
	public String id;
	public String file;
	public String position; 
	public boolean hasSummary = false;
	public ColorMap map;
	public String reorgMatrix[][];
	public int rows;
	public int cols;
	public String summaryMethod;
	public ArrayList<ImportLayerData> importLayers = new ArrayList<>();
	
	
	public InputFile(JSONObject jo, String idv, String pos, RowColData rowData, RowColData colData) {
		name = (String) jo.get(NAME);
		name.trim();
		id = idv.trim();
		file = (String) jo.get(PATH);
		String sumMeth = (String) jo.get(SUMMARY_METHOD);
		if (sumMeth != null) {
	        summaryMethod = sumMeth.trim();
		} else {
	        summaryMethod = METHOD_AVERAGE;
		}
		file.trim();
		position = pos.trim();
		processInputFile(id, jo, rowData, colData);
	}
	
	private void processInputFile(String id, JSONObject jo,  RowColData rowData, RowColData colData) {
   		JSONObject jocm = (JSONObject) jo.get(COLORMAP);
		ColorMap cMap = new ColorMap();
		cMap.id = id; 
		if (jocm != null) {
			map = ColorMapGenerator.getJsonColors(jocm, cMap);
		} else {
			cMap.type = COLORTYPE_LINEAR;
			map = ColorMapGenerator.getDefaultColors(file,cMap);
		}
		setRowCols();
		reorgMatrix = new String[rows+1][cols+1]; 
		// Re-order the matrix file into the clustered order supplied be the R cluster order files 
		setReorderedInputMatrix(rowData, colData);
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
	 * METHOD: setRowCols
	 *
	 * This method reads the incoming matrix and extracts the number of
	 * data rows and columns.
	 ******************************************************************/
	private void setRowCols() {
		int rowId = 0;
		BufferedReader br = null;
	    try {
			br = new BufferedReader(new FileReader(new File(file)));
		    String sCurrentLine;
			while((sCurrentLine = br.readLine()) != null) {
				rowId++;
				if (rowId == 2) {
					String vals[] = sCurrentLine.split("\t");
					cols = vals.length - 1;

				}
			}	
		    br.close();
		    // Set number of rows (accounting for header)
		    rows = rowId - 1;
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
	 * METHOD: reorderInputMatrix
	 *
	 * This method re-orders the incoming data matrix into clustered order
	 * using the row/col clustering tsv files.  The output will be a matrix 
	 * with a matching number of rows and columns to the original but one that 
	 * is completely re-ordered using information in the order tsv files.  
	 * The result will be stored as a 2D String array (reorgMatrix) 
	 * on this ImportData object.
	 ******************************************************************/
	private void setReorderedInputMatrix(RowColData rowData, RowColData colData) {
		int rowCount = rows+1, colCount = cols+1;
	    try {
	        if (!(new File(file).exists())) {
	        	// TODO: processing if reordering file is missing
	        }
	        BufferedReader read = new BufferedReader(new FileReader(new File(file)));
	
	        // Construct a 2 dimensional array containing the data from the incoming
	        // (user provided) data matrix.
	        String matrix[][] = new String[rowCount][colCount];
	        // Read in first line
	        String line = read.readLine();
	        // Check to see if the column headers are lined up over the data or are
	        // offset by one to the left.  If the latter case is true, add a TAB to the line. 
            String headerCols[] = line.split("\t");
		    if (!line.substring(0,1).equals(TAB) && (headerCols.length == cols)) {
        		  line = TAB+line;
		    }
	        int pos = 0;
	        while(line !=null) {
				  String toks[] = line.split("\t");
	              for (int i = 0; i < toks.length; i++) {
	                     matrix[pos][i] = toks[i];
	              }      
	              pos++;
	              line = read.readLine();
	        }
	        read.close();
	
	        // Create a new 2D string array and populate it with data from the 
	        // initial 2D array placing it in the clustered row order.
	        String reorg[][] = new String[rowCount][colCount];
	        for (int row = 0; row < reorg.length; row++) {
	              reorg[rowData.orderArray[row]] = matrix[row];
	        }
	        
	        // Create a new 2D string array and populate it with data from the 
	        // row-ordered 2D array placing it in the clustered column order.
	        for (int col = 0; col < reorg[0].length; col++) {
	              int newCol = colData.orderArray[col];
	              for (int row = 0; row < reorg.length; row++) {
	            	  reorgMatrix[row][newCol] = reorg[row][col];
	              }
	        }
		
		 } catch (Exception e) {
		        System.out.println("Exception: " + e.getMessage());
		        e.printStackTrace();
		 }
	    return;

	}
	
	/*******************************************************************
	 * Getters AND Setters
	 ******************************************************************/
	public int getRows() {
		return rows;
	}

	public int getCols() {
		return cols;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getFile() {
		return file;
	}

	public void setFile(String file) {
		this.file = file;
	}

	public String getPosition() {
		return position;
	}

	public void setPosition(String position) {
		this.position = position;
	}

	public ColorMap getMap() {
		return map;
	}

	public void setMap(ColorMap map) {
		this.map = map;
	}
}
