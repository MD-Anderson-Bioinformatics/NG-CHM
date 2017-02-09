/*******************************************************************
 * CLASS: ImportTileData
 *
 * This class instantiates an ImportTileData object for a given matrix
 * data tile.  This object contains all of the information
 * necessary to process a given data tile (within a layer). The filename
 * for the tile and the row/col start and ending positions, within the
 * data matrix, are calculated.  These are used by the HeatmapDataGenerator
 * to iterate thru the clustered data matrix.
 * 
 * Author: Mark Stucky
 * Date: December 14, 2015
 ******************************************************************/

package mda.ngchm.datagenerator;

import java.io.File;
import mda.ngchm.datagenerator.ImportLayerData;

import static mda.ngchm.datagenerator.ImportConstants.*;

public class ImportTileData {
	public String fileName;
	public int rowStartPos;
	public int rowEndPos;
	public int colStartPos;
	public int colEndPos;

	/*******************************************************************
	 * CONSTRUCTOR: ImportTileData
	 *
	 * This constructor creates an ImportTileData object.  It is called
	 * for each data layer and performs processing specific to the type
	 * of layer that is being created. The purpouse of this data object is
	 * to calculate and store the fileName and data matrix row/column
	 * starting and ending positions for the HeatmapDataGenerator.
	 ******************************************************************/
	public ImportTileData(ImportLayerData layerData, int tileCol, int tileRow)
	{
	    fileName = File.separator+layerData.layer+File.separator+layerData.layer+"."+(tileRow+1)+"."+(tileCol+1)+BIN_FILE;
	    
		switch (layerData.layer) {
	        case "tn": setupThumbnailTile(layerData);  
	                 break;
	        case "s":  setupSummaryTile(layerData, tileCol, tileRow);
	                 break;
	        case "d":  setupDetailTile(layerData, tileCol, tileRow);
	                 break;
	        case "rh":  setupRibbonHorizTile(layerData, tileCol, tileRow);
            		break;
	        case "rv":  setupRibbonVertTile(layerData, tileCol, tileRow);
    				break;
		}
	}
	
	/*******************************************************************
	 * METHOD: setupThumbnailTile
	 *
	 * This method sets up the row/col start and ending positions for
	 * the thumbnail layer tile.
	 ******************************************************************/
	private void setupThumbnailTile(ImportLayerData layerData) {
		rowStartPos = 1;
		rowEndPos = layerData.importRows+1;
		colStartPos = 1;
		colEndPos = layerData.importCols+1;
	}

	/*******************************************************************
	 * METHOD: setupSummaryTile
	 *
	 * This method sets up the row/col start and ending positions for
	 * a summary layer tile.
	 ******************************************************************/
	private void setupSummaryTile(ImportLayerData layerData, int tileCol, int tileRow) {
		int rowStartingPos = 1;
		int rowMidPoint = (layerData.rowsPerTile*layerData.rowInterval)+rowStartingPos;
		if (tileRow == 0) {
			rowStartPos = rowStartingPos;
			rowEndPos = rowMidPoint;
		} else {
			rowStartPos = rowMidPoint;
			rowEndPos = layerData.importRows + 1;
		}
	    int colStartingPos = 1;
		int colMidPoint = (layerData.colsPerTile*layerData.colInterval)+colStartingPos;
		if (tileCol == 0) {
			colStartPos = colStartingPos;
			colEndPos = colMidPoint;
		} else {
			colStartPos = colMidPoint;
			colEndPos = layerData.importCols + 1;
		}
	}

	/*******************************************************************
	 * METHOD: setupDetailTile
	 *
	 * This method sets up the row/col start and ending positions for
	 * a detail layer tile.
	 ******************************************************************/
	private void setupDetailTile(ImportLayerData layerData, int tileCol, int tileRow) {
		//Set Row starting and ending positions for layer
		if (tileRow == 0) {
			rowStartPos = 1;
		} else {
			rowStartPos = (tileRow*TILE_SIZE)+1; 
		}
		rowEndPos = (TILE_SIZE+rowStartPos);
		if (rowEndPos > layerData.importRows) {
			rowEndPos = layerData.importRows + 1;
		}
		//Set Column starting and ending positions for layer
		if (tileCol == 0) {
			colStartPos = 1;
		} else {
			colStartPos = (tileCol*TILE_SIZE)+1; 
		}
		colEndPos = (TILE_SIZE+colStartPos);
		if (colEndPos > layerData.importCols) {
			colEndPos = layerData.importCols + 1;
		}

	}

	/*******************************************************************
	 * METHOD: setupRibbonHorizTile
	 *
	 * This method sets up the row/col start and ending positions for
	 * a horizontal ribbon layer tile.
	 ******************************************************************/
	private void setupRibbonVertTile(ImportLayerData layerData, int tileCol, int tileRow) {
		//Set Row starting and ending positions for layer
		int rowStartingPos = 1;
		int rowMidPoint = (layerData.rowsPerTile*layerData.rowInterval)+rowStartingPos;
		if (tileRow == 0) {
			rowStartPos = rowStartingPos;
			rowEndPos = rowMidPoint;
		} else {
			rowStartPos = rowMidPoint;
			rowEndPos = layerData.importRows + 1;
		}
		//Set Column starting and ending positions for layer
		if (tileCol == 0) {
			colStartPos = 1;
		} else {
			colStartPos = (tileCol*TILE_SIZE)+1; 
		}
		colEndPos = (TILE_SIZE+colStartPos);
		if (colEndPos > layerData.importCols) {
			colEndPos = layerData.importCols + 1;
		}
	}

	/*******************************************************************
	 * METHOD: setupRibbonVertTile
	 *
	 * This method sets up the row/col start and ending positions for
	 * a vertical ribbon layer tile.
	 ******************************************************************/
	private void setupRibbonHorizTile(ImportLayerData layerData, int tileCol, int tileRow) {
		//Set Row starting and ending positions for layer
		if (tileRow == 0) {
			rowStartPos = 1;
			rowEndPos = (TILE_SIZE+rowStartPos);
		} else {
			rowStartPos = (tileRow*TILE_SIZE); 
			rowEndPos = (TILE_SIZE+rowStartPos)+1;
		}
		if (rowEndPos > layerData.importRows) {
			rowEndPos = layerData.importRows + 1;
		}
		//Set Column starting and ending positions for layer
	    int colStartingPos = 1;
		int colMidPoint = (layerData.colsPerTile*layerData.colInterval)+colStartingPos;
		if (tileCol == 0) {
			colStartPos = colStartingPos;
			colEndPos = colMidPoint;
		} else {
			colStartPos = colMidPoint;
			colEndPos = layerData.importCols + 1;
		}
	}
}
