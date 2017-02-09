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

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;

public class RowColData { 
	public String dataTypes[] = null;
	public String orderType = null;
	public String orderFile = null;
	public String orderMethod = null;
	public String distanceMetric = null;
	public String agglomerationMethod = null;
	public String dendroFile = null;
	public int orderArray[];
	public String classArray[];
	public String labelExtraFile = null;

	/*******************************************************************
	 * CONSTRUCTOR: ImportData
	 *
	 * This constructor creates an ImportData object containing an array
	 * of ImportLayerData objects for each data layer to be generated.
	 ******************************************************************/
	public RowColData(String dtypes[], String otype, int length, String fileO, String method, String distance, String agglomeration, String fileD, String fileEx)
	{
		dataTypes = dtypes;
		orderType = otype.trim();
		orderFile = fileO.trim();
		orderMethod = method.trim();
		distanceMetric = distance.trim();
		agglomerationMethod = agglomeration.trim();
		dendroFile = fileD.trim();
		labelExtraFile = fileEx;
		orderArray = new int[length+1];
		classArray = new String[length+1];
		setClassificationOrder(new File(orderFile));
	}

	public RowColData(String dtypes[], String type, int length, String file, String method)
	{
		dataTypes = dtypes;
		orderType = type.trim();
		orderFile = file.trim();
		orderMethod = method.trim();
		orderArray = new int[length+1];
		classArray = new String[length+1];
		setClassificationOrder(new File(orderFile));
	}

	/*******************************************************************
	 * METHOD: setClassficationOrder
	 *
	 * This method populates this class' colOrder and rowOrder integer
	 * arrays with the contents of the Row/Col_HCOrder files.  These 
	 * arrays will be used to reorganize the incoming data matrix into
	 * clustered order AND to reorganize any incoming row/col classification 
	 * files in clustered order. 
	 ******************************************************************/
	private void setClassificationOrder(File filename) {
	    try {
	        if (!filename.exists()) {
	        	// processing if classification order file is missing
	        }
	        BufferedReader rowRead = new BufferedReader(new FileReader(filename));
	        // Read in the clustered Row Ordering data
	        String line = rowRead.readLine();
	        line = rowRead.readLine();
	        int pos = 1;
	        // Construct an integer array containing the row numbers of the clustered data
	        while(line !=null) {
	              String toks[] = line.split("\t");
	              orderArray[pos] = Integer.parseInt(toks[1]);
	              classArray[Integer.parseInt(toks[1])] = toks[0];
	              pos++;
	              line = rowRead.readLine();
	        }
	        rowRead.close();

		 } catch (Exception e) {
		        System.out.println("Exception: " + e.getMessage());
		        e.printStackTrace();
		 }
	    return;
	}
}
