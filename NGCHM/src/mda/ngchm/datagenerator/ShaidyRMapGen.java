package mda.ngchm.datagenerator;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;


//This program takes a heat map produced by the NGCHM R code (Shaidy version) and reformats the 
//various configuration / data files produced by R and stored in different directories into a
//heatmap.json and runs HeatmapDataGenerator to create the files needed by the NGCHM viewer.
public class ShaidyRMapGen {
	private static String FILE_SEP = File.separator + File.separator; // On windows "\" path separator characters need to be doubled in json strings
	
	
	private static StringBuffer errors = new StringBuffer();
	private static StringBuffer warnings = new StringBuffer();
	
	//Parse the "chm.json" file produced by R
	private static JSONObject getChmJson(String chmJson) throws IOException, ParseException {
		BufferedReader br = new BufferedReader(new FileReader(chmJson));
        JSONParser parser = new JSONParser();
        JSONObject jsonObject  = (JSONObject) parser.parse(br);
        return(jsonObject);
	}
		
	//Parse the color break point information to pull out the break point values. 
	private static ArrayList<String> getBreaks(JSONArray points) {
		ArrayList<String> breaks = new ArrayList<String>();
		for (int i = 0; i < points.size(); i++) {
			JSONObject pt = (JSONObject)points.get(i);
			String val = "" + pt.get("value");
			breaks.add(val);
		}
		return breaks;
	}

	//Parse the color break point information to pull out the colors values 
	//If the color is a string like "blue" translate it to a hex value.
	private static ArrayList<String> getColors(JSONArray points) {
		ArrayList<String> cols = new ArrayList<String>();
		for (int i = 0; i < points.size(); i++) {
			JSONObject pt = (JSONObject)points.get(i);
			String col = (String)pt.get("color");
			if (!col.startsWith("#")) {
				col = ColorMapGenerator.hexForColor(col);
			}
			cols.add(col);
		}
		return cols;
	}
	
	//Turn a 'render' into a color map for the heat map generator
	private static String colorMap(JSONObject color, String type) {
		StringBuffer jsonCMap = new StringBuffer();
		//Color map

		jsonCMap.append("\t\t\t\"color_map\": {\n");
		jsonCMap.append("\t\t\t\t\"type\": \"" + type + "\",\n");
		if (color != null) {
			String missing = (String)color.get("missing");
			if (missing != null ) {
				if (!missing.startsWith("#")) {
					missing = ColorMapGenerator.hexForColor(missing);
				}	
				jsonCMap.append("\t\t\t\t\"missing\": \"" + missing + "\",\n");
			} else {
				warnings.append("Warning: renderer does not specify color for missing values\n");
			}
			JSONArray points = (JSONArray)color.get("points");
			if (points != null) {
				ArrayList<String> colorStrs = getColors(points);
				ArrayList<String> breaks = getBreaks(points);
				if (colorStrs.size() != breaks.size())
					errors.append("ERROR: Renderer points must each have a color and value");
				if (colorStrs.size()==0 && breaks.size() == 0)
					warnings.append("Warning: Renderer did not provide point colors/values, color map will be generated."); 	

				jsonCMap.append("\t\t\t\t\"colors\": [");
				for (int j = 0; j < colorStrs.size(); j++) { 
					jsonCMap.append("\"" + colorStrs.get(j) + "\"");
					if (j!=colorStrs.size()-1)
						jsonCMap.append(", ");
				}
				jsonCMap.append("],\n");
				jsonCMap.append("\t\t\t\t\"thresholds\": [");
				for (int j = 0; j < breaks.size(); j++) { 
					if (type.toLowerCase().equals("discrete"))
						jsonCMap.append("\"" + breaks.get(j) + "\"");
					else
						jsonCMap.append("" + breaks.get(j) + "");
					if (j!=breaks.size()-1)
						jsonCMap.append(", ");
				}
				jsonCMap.append("]\n");
			}
		}

		jsonCMap.append("\t\t\t}\n");

		return jsonCMap.toString();
	}
	
	//Basic checks on provided inputs
	public static void envChecks(String rootDir, String chmJSON, String viewerMapDir, String dataPath) {
		if (!new File(rootDir).exists()) {
			System.out.println("ERROR: Shaidy Root Directoy: " + rootDir + " does not exist.");
			System.exit(1);
		}
		
		if (!new File(chmJSON).exists()) {
			System.out.println("ERROR: chm.json file: " + chmJSON + " does not exist.");
			System.exit(1);
		}
		
		if (!new File(rootDir).exists()) {
			System.out.println("ERROR: viewer directory: " + viewerMapDir + " does not exist.");
			System.exit(1);
		}
		
		if (!new File(dataPath).exists()) {
			System.out.println("ERROR: dataset directory: " + dataPath + " does not exist.");
			System.exit(1);
		}
		
		try {
			String testFile = viewerMapDir + FILE_SEP + "test.txt";
			PrintWriter writer = new PrintWriter(viewerMapDir + FILE_SEP + "test.txt");
			writer.println("test");
			writer.close();
			new File(testFile).delete();
		} catch (Exception e) {
			System.out.println("Could not write to the viewer directory: " + viewerMapDir);
			System.exit(1);
		}
		
	}
	
	//Pull a required json string entry - if missing add error.
	public static String getRequiredStr (String from, JSONObject obj, String parm) {

		if (obj == null || obj.get(parm) == null || !(obj.get(parm) instanceof String)) {
			errors.append("ERROR: Missing required parameter: " + parm + " in " + from + "\n");
			return "";
		} 
		return (String)obj.get(parm);
	}
	
	//Pull a required json integer entry - if missing add error.
	public static int getRequiredInt (String from, JSONObject obj, String parm) {

		Object valObj = obj.get(parm);
		if (valObj != null && valObj instanceof Long)
			return (int)(long)valObj;
		else 
			errors.append("ERROR: Missing required parameter: " + parm + " in " + from + "\n");
		return 0;
	}
	
	//Pull a required json object - if missing add error.
	public static JSONObject getRequiredObj(String from, JSONObject obj, String parm){
		Object valObj = obj.get(parm);
		if (valObj != null && valObj instanceof JSONObject)
			return (JSONObject)valObj;
		else 
			errors.append("ERROR: Missing required entry: " + parm + " in " + from + "\n");
		return null;
	}

	//Pull a required json array - if missing add error.
	public static JSONArray getRequiredArr(String from, JSONObject obj, String parm){
		Object valObj = obj.get(parm);
		if (valObj != null && valObj instanceof JSONArray) {
			JSONArray arr = (JSONArray)valObj;
			if (arr.size() > 0)
				return arr; 
		}
		
		errors.append("ERROR: Required array: " + parm + " in " + from + " is missing or empty. \n");
		return null;
	}

	
	//This and following four routines perform a recursive zip of the heatmap directory.  It is important
	//that the zip file contain a folder at the top level with folder name = heat map name.
	public static void zipDirectory(File directoryToZip, String zipFileName) throws IOException {

		List<File> fileList = new ArrayList<File>();
		getAllFiles(directoryToZip, fileList, true);
		writeZipFile(directoryToZip, fileList, zipFileName);
	}

	public static void getAllFiles(File dir, List<File> fileList, boolean topLevel) {
		try {
			File[] files = dir.listFiles();
			for (File file : files) {
				if (!topLevel)  // there are some build files we don't need in the viewer zip file.  At the top level, just zip the heat map folder not other files.
					fileList.add(file);
				if (file.isDirectory()) {
					getAllFiles(file, fileList, false);
				} 
			}
		} catch (Exception e) {
			e.printStackTrace();
		}
	}

	public static void writeZipFile(File directoryToZip, List<File> fileList, String zipFileName) {

		try {
			FileOutputStream fos = new FileOutputStream(zipFileName);
			ZipOutputStream zos = new ZipOutputStream(fos);

			for (File file : fileList) {
				if (!file.isDirectory()) { // we only zip files, not directories
					addToZip(directoryToZip, file, zos);
				}
			}

			zos.close();
			fos.close();
		} catch (FileNotFoundException e) {
			e.printStackTrace();
		} catch (IOException e) {
			e.printStackTrace();
		}
	}

	public static void addToZip(File directoryToZip, File file, ZipOutputStream zos) throws FileNotFoundException,
	IOException {

		FileInputStream fis = new FileInputStream(file);

		// we want the zipEntry's path to be a relative path that is relative
		// to the directory being zipped, so chop off the rest of the path
		String zipFilePath = file.getCanonicalPath().substring(directoryToZip.getCanonicalPath().length() + 1,
				file.getCanonicalPath().length());
		if (zipFilePath.contains("\\"))
			zipFilePath = zipFilePath.replace("\\", "/");
		ZipEntry zipEntry = new ZipEntry(zipFilePath);
		zos.putNextEntry(zipEntry);

		byte[] bytes = new byte[1024];
		int length;
		while ((length = fis.read(bytes)) >= 0) {
			zos.write(bytes, 0, length);
		}

		zos.closeEntry();
		fis.close();
	}

	
	//The heat map generator expects a dendro order file whether or not clustering is done.  If clustering
	//was not done, use the shaidy label file to generate a dendro order file.
	public static void dendroOrderFromLabels(String labelFile, String matrixFile, String dendroOrderFile, boolean row) throws Exception {
		HashMap<String, Integer>labelPosition = new HashMap<String, Integer>();
		BufferedReader br = new BufferedReader(new FileReader(labelFile));
		String line = br.readLine();
		int count = 1;
		//build a hash of each label and the position that it should have in the heat map.
		while (line != null) {
			labelPosition.put(line, count);
			count++;
			line = br.readLine();
		}
		br.close();
		
		br = new BufferedReader(new FileReader(matrixFile));
		ArrayList<String> matrixLabels = new ArrayList<String>();
		if (!row) {
			String labels[] = br.readLine().split("\t");
			for (int i=0; i<labels.length; i++){
				if (labels[i] != "") matrixLabels.add(labels[i]);
			}
		} else {
			line = br.readLine(); //skip header line
			line = br.readLine();
			while (line != null) {
				String label = line.substring(0, line.indexOf("\t"));
				if (!label.trim().equals(""))
					matrixLabels.add(label);
				line = br.readLine();
			}
		}
		br.close();
		
		PrintWriter fileout = new PrintWriter( dendroOrderFile );
		fileout.write("Id\tOrder\n");
		for (String label : matrixLabels) {
			if (labelPosition.containsKey(label))
				fileout.write(label + "\t" + labelPosition.get(label) + "\n");
			else
				errors.append("ERROR: Matrix label: " + label + " not included in labels file: " + labelFile + "\n");
		}
		fileout.close();
	}
	
	
	//Main does everything with assistance from helper routines above.  Read in the shaidy chm.json; translate into
	//what is needed by our heat map generator as a heatmapProperties.json; then run heat map generator to create
	//the "viewer" version of the heat map in the appropriate shaidy directory.
	public static void main(String[] args) {
		if (args.length < 3) {
			System.out.println("Usage: ShaidyRMapGen <Shaidy Root Directory> <chm shaidy Id> <viewer Id> [NO_PDF] [NO_ZIP]");
			System.exit(1);
		}	

		String rootDir = args[0];
		String chmJSON = rootDir + File.separator + "chm" + FILE_SEP + args[1] + FILE_SEP + "chm.json";
		String viewerMapDir = rootDir + FILE_SEP + "viewer";
		String dataPath = rootDir + FILE_SEP + "dataset" + FILE_SEP;
		String genPDF = ((args.length == 4 && args[3].equals("NO_PDF")) ||  (args.length == 5 && args[4].equals("NO_PDF"))) ? "" : "-PDF";
		boolean noZip = ((args.length == 4 && args[3].equals("NO_ZIP")) ||  (args.length == 5 && args[4].equals("NO_ZIP")));
		
		//Ensure that directories are properly setup.
		envChecks(rootDir, chmJSON, viewerMapDir, dataPath);
		
		//Add the provided sub directory for this map.
		viewerMapDir = viewerMapDir  + FILE_SEP + args[2];
		
		try {
			
			JSONObject chmRJson = getChmJson(chmJSON);

			//Get the heat map name.
			String mapName = getRequiredStr("chm.json", chmRJson, "name");
		
			//Create the heat map viewer directory
			File theDir = new File(viewerMapDir);
			if (!theDir.exists())
				theDir.mkdir();
			String subdir = viewerMapDir + FILE_SEP + mapName;
			File sub = new File(subdir);
			if (!sub.exists())
				sub.mkdir();

			
			PrintWriter fileout = new PrintWriter( viewerMapDir + File.separator + "heatmapProperties.json", "UTF-8" );
			fileout.println("{");
			fileout.println("\t\"chm_name\": \"" + mapName + "\",");

			//The properties field in the shady R contains various map attributes.  
			JSONArray properties = (JSONArray)chmRJson.get("properties");
			String description = "-";
			fileout.print("\t\"chm_attributes\": [");
			if (properties == null) {
				warnings.append("Warning: No properties provided.\n");
			} else {
				int count = 0;
				for (int i = 0; i < properties.size(); i++) {
					JSONObject prop = (JSONObject)properties.get(i);
					if (prop.get("label") != null) {
						String label = (String)prop.get("label");
						String value = (String)prop.get("value");
						if (count > 0) fileout.print(",");
						fileout.print("{\"" + label + "\": \"" + value + "\"}");
						count++;
						if (label.toLowerCase().equals("chm.info.caption"))
							description = value;
					} 	
				}
			}
			fileout.println("],");

			if (description.equals("-"))
				warnings.append("Warning: No heat map description provided in properties : chm.info.caption.\n");
			fileout.println("\t\"chm_description\": \""+ description + "\",");

			
			JSONArray colors = getRequiredArr("chm.json", chmRJson, "renderers");
			String matrixFile = null;
			
			//Next block is for data matrices.  Can be more than one for flick.
			fileout.println("\t\"matrix_files\": [");
			JSONArray layers = (JSONArray)chmRJson.get("layers");
			if ((layers == null) || layers.size() < 1) errors.append("Error: at least one data layer required.  'layers' item not found or empty.");
			for (int i = 0; i < layers.size(); i++) {
				JSONObject layer = (JSONObject)layers.get(i);
				String name = getRequiredStr("layers", layer, "name");
				JSONObject matrixInfo = getRequiredObj("layers", layer, "data");
				String matrixDir = getRequiredStr("layers : data", matrixInfo, "value");
				matrixFile = dataPath + matrixDir + FILE_SEP + "matrix.tsv";
				if (!new File(matrixFile).exists()) errors.append("ERROR: Data Layer matrix file: " + matrixFile + " does not exist.\n");
				String summaryMethod = (String)layer.get("summary_method");
				if (summaryMethod == null) {
					summaryMethod = "average";
					warnings.append("Warning: Data layer " + name + " summary_method missing.  Defaulting to 'average'.\n");
				}	
				fileout.println("\t\t{");
				fileout.println("\t\t\t\"name\": \"" + name + "\",");
			 	fileout.println("\t\t\t\"path\":  \"" + matrixFile + "\",");
				fileout.println("\t\t\t\"summary_method\": \"" + summaryMethod + "\",");
			 	
			 	//Color map
			 	int cMap = getRequiredInt("layers", layer, "renderer");
			 	if (cMap < 0 || cMap >= colors.size()) errors.append("ERROR: renderer " + cMap + " specified in data layer " + name + " does not exist.");
			 	JSONObject color = (JSONObject)colors.get(cMap);
			 	String type = getRequiredStr("layers : renderer ", color, "type");
			 	fileout.println(colorMap(color, type));
			 	
				if (i==layers.size()-1)
					fileout.println("\t\t}");
				else
					fileout.println("\t\t},");	
			}		
			fileout.println("\t],");
			
			//Process axisTypes
			String colDataType = "Column_Labels";
			String rowDataType = "Row_Labels";
			JSONArray axisList = (JSONArray)chmRJson.get("axisTypes");
			int axisSpecified = (axisList != null) ? axisList.size() : 0;
			for (int i = 0; i < axisSpecified; i++) {
				JSONObject axis = (JSONObject)axisList.get(i);
				if (axis.get("where") != null && axis.get("type") != null) {
					String where = (String)axis.get("where");
					String type = (String)axis.get("type");
					if (where.equals("row") || where.equals("both"))
						rowDataType = type;
					if (where.startsWith("col") || where.equals("both"))
						colDataType = type;
				}
			}
			
			if (colDataType.equals("Column_Labels")) warnings.append("Warning: Column label type (axisTypes where = col or both) not specified.  Will use generic linkouts menu\n");
			if (rowDataType.equals("Row_Labels")) warnings.append("Warning: Row label type (axisTypes where = row or both) not specified.  Will use generic linkouts menu\n");
			
			colDataType = colDataType.replace(".bar.", "\",\"");
			rowDataType = rowDataType.replace(".bar.", "\",\"");
			
			
			//Row ordering / dendro
			String dendroDir = rootDir + FILE_SEP + "dendrogram" + FILE_SEP;
			String orderfile = "";
			JSONObject rowData = getRequiredObj("chm.json", chmRJson, "row_data");
			String orderMethod = getRequiredStr("row_data", rowData, "order_method");
			Object dendro = rowData.get("dendrogram");
			fileout.println("\t\"row_configuration\": ");
			fileout.println("\t\t{");
			fileout.println("\t\t\"data_type\" : [\"" + rowDataType + "\"],");
	        if (rowData.get("label_extra_metadata") != null) {
	        	JSONObject extraLabel  = (JSONObject)rowData.get("label_extra_metadata");
	        	String value = (String)extraLabel.get("value");
	        	fileout.println("\t\t\"label_extra_file\": \"" + rootDir + FILE_SEP + "label" + FILE_SEP + value + FILE_SEP + "labels.txt\"");
	        }
 
			//special case - User ordering method but dendro provided -- switch order method to Heirarchical
			if (orderMethod.equals("User") && dendro!=null)
				orderMethod = "Hierarchical";
				
			if (orderMethod.equals("Hierarchical")){
				String rowDendro = getRequiredStr("row_data : dendrogram", (JSONObject)dendro, "value");
				fileout.println("\t\t\"distance_metric\":  \"" + getRequiredStr("row_data : dendrogram", rowData, "distance_metric") + "\",");
				fileout.println("\t\t\"agglomeration_method\": \"" + getRequiredStr("row_data : dendrogram", rowData, "agglomeration_method") + "\",");
				String dendrofile =  dendroDir+rowDendro + FILE_SEP + "dendrogram-data.tsv";
				if (!new File(dendrofile).exists()) errors.append("ERROR: Row dendrogram file: " + dendrofile + " does not exist.\n");
				fileout.println("\t\t\"dendro_file\": \"" + dendrofile + "\",");
				orderfile = dendroDir+rowDendro + FILE_SEP + "dendrogram-order.tsv";
				if (!new File(orderfile).exists()) errors.append("ERROR: Row order file: " + orderfile + " does not exist.\n");
			} else {
				// For not hierarchical methods, create a dendro order file from the labels file.
				JSONObject labels = getRequiredObj("row_data", rowData, "labels");
				String labelShaidy = getRequiredStr("row_data labels", labels, "value");
				String labelFile =  rootDir + File.separator + "label" + File.separator + labelShaidy + File.separator + "labels.txt";
				if (!new File(labelFile).exists()) errors.append("ERROR: Label file: " + labelFile + " does not exist.\n");
				orderfile = viewerMapDir + FILE_SEP + "rowOrder.txt";
				
				dendroOrderFromLabels(labelFile, matrixFile, orderfile, true);
			}
			
			fileout.println("\t\t\"order_file\": \"" + orderfile + "\",");
			fileout.println("\t\t\"order_method\": \"" + orderMethod + "\"");
			fileout.println("\t\t}");
			fileout.println("\t,");

			//Column ordering / dendro
			orderfile = "";
			JSONObject colData = getRequiredObj("chm.json", chmRJson, "col_data");
			orderMethod = getRequiredStr("col_data", colData, "order_method");
			dendro = colData.get("dendrogram");
			fileout.println("\t\"col_configuration\": ");
			fileout.println("\t\t{");
			fileout.println("\t\t\"data_type\" : [\"" + colDataType + "\"],");
	        if (colData.get("label_extra_metadata") != null) {
	        	JSONObject extraLabel  = (JSONObject)colData.get("label_extra_metadata");
	        	String value = (String)extraLabel.get("value");
	        	fileout.println("\t\t\"label_extra_file\": \"" + rootDir + FILE_SEP + "label" + FILE_SEP + value + FILE_SEP + "labels.txt\"");
	        }

			//special case - User ordering method but dendro provided -- switch order method to Heirarchical
			if (orderMethod.equals("User") && dendro!=null)
				orderMethod = "Hierarchical";

			if (orderMethod.equals("Hierarchical")){
				String colDendro = getRequiredStr("col_data : dendrogram", (JSONObject)dendro, "value");
			 	fileout.println("\t\t\"distance_metric\":  \"" + getRequiredStr("cow_data : dendrogram", colData, "distance_metric") + "\",");
				fileout.println("\t\t\"agglomeration_method\": \"" + getRequiredStr("cow_data : dendrogram", colData, "agglomeration_method") + "\",");
				String dendrofile =  dendroDir+colDendro + FILE_SEP + "dendrogram-data.tsv";
				if (!new File(dendrofile).exists()) errors.append("ERROR: Col dendrogram file: " + dendrofile + " does not exist.\n");
				fileout.println("\t\t\"dendro_file\": \"" + dendrofile + "\",");
				orderfile = dendroDir+colDendro + FILE_SEP + "dendrogram-order.tsv";
				if (!new File(orderfile).exists()) errors.append("ERROR: Col order file: " + orderfile + " does not exist.\n");
			} else {
				// For not hierarchical methods, create a dendro order file from the labels file.
				JSONObject labels = getRequiredObj("col_data", colData, "labels");
				String labelShaidy = getRequiredStr("col_data labels", labels, "value");
				String labelFile =  rootDir + File.separator + "label" + File.separator + labelShaidy + File.separator + "labels.txt";
				if (!new File(labelFile).exists()) errors.append("ERROR: Label file: " + labelFile + " does not exist.\n");
				orderfile = viewerMapDir + FILE_SEP + "colOrder.txt";
				
				dendroOrderFromLabels(labelFile, matrixFile, orderfile, false);
			}
			fileout.println("\t\t\"order_file\": \"" + orderfile + "\",");
			fileout.println("\t\t\"order_method\": \"" + orderMethod + "\"");
			fileout.println("\t\t}");
			fileout.println("\t,");

			//Classifications
			fileout.println("\t\"classification_files\": [");

			//Row Classifications
			JSONArray rowClassifications = (JSONArray)rowData.get("covariates");
			JSONArray coColors = (JSONArray)chmRJson.get("covariate_renderers");
			JSONArray colClassifications = (JSONArray)colData.get("covariates");
			
			if (rowClassifications != null) {
				for (int i = 0; i < rowClassifications.size(); i++) {
					JSONObject covar = (JSONObject)rowClassifications.get(i);
					fileout.println("\t\t{");
					String label = getRequiredStr("covaraites", covar, "label");
					String visible = getRequiredStr("covaraites", covar, "display").equals("visible") ? "Y" : "N";
					fileout.println("\t\t\"name\": \"" + label + "\",");
					JSONObject data = getRequiredObj("covariates", covar, "data");
					String covarFile = dataPath + getRequiredStr("covariates : data", data, "value") + FILE_SEP + "matrix.tsv";
					if (!new File(covarFile).exists()) errors.append("ERROR: Row covariate data file: " + covarFile + " does not exist.\n");
					fileout.println("\t\t\"path\": \"" + covarFile + "\",");
					if (covar.get("thickness") != null)
						fileout.println("\t\t\"height\": \"" + covar.get("thickness") + "\",");
					fileout.println("\t\t\"position\": \"row\",");
					fileout.println("\t\t\"show\": \"" + visible + "\",");
					JSONObject color = null;
					if (covar.get("renderer") != null) {
						int cMap = (int)(long)covar.get("renderer");
						if (cMap < 0 || cMap >= coColors.size()) errors.append("ERROR: renderer " + cMap + " specified in covariate " + label + " does not exist.\n");
						color = (JSONObject)coColors.get(cMap);
					} else warnings.append("Warning: No render for covarate " + label + " colors will be generated.\n");
					String type = getRequiredStr("covariate", covar, "type");
					fileout.println(colorMap(color, type));
					if ((i == rowClassifications.size()-1) && (colClassifications.size() == 0))
						fileout.println("\t\t}");
					else
						fileout.println("\t\t},");	
				}
			}
			
			//Col Classifications
			if (colClassifications != null) {
				for (int i = 0; i < colClassifications.size(); i++) {
					JSONObject covar = (JSONObject)colClassifications.get(i);
					fileout.println("\t\t{");
					String label = getRequiredStr("covaraites", covar, "label");
					String visible = getRequiredStr("covaraites", covar, "display").equals("visible") ? "Y" : "N";
					fileout.println("\t\t\"name\": \"" + label + "\",");
					JSONObject data = getRequiredObj("covariates", covar, "data");
					String covarFile = dataPath + getRequiredStr("covariates : data", data, "value") + FILE_SEP + "matrix.tsv";
					if (!new File(covarFile).exists()) errors.append("ERROR: Col covariate data file: " + covarFile + " does not exist.\n");
					fileout.println("\t\t\"path\": \"" + covarFile + "\",");
					if (covar.get("thickness") != null)
						fileout.println("\t\t\"height\": \"" + covar.get("thickness") + "\",");
					fileout.println("\t\t\"position\": \"col\",");
					fileout.println("\t\t\"show\": \"" + visible + "\",");
					JSONObject color = null;
					if (covar.get("renderer") != null) {
						int cMap = (int)(long)covar.get("renderer");
						if (cMap < 0 || cMap >= coColors.size()) errors.append("ERROR: renderer " + cMap + " specified in covariate " +  " does not exist.\n");
						color = (JSONObject)coColors.get(cMap);
					} else warnings.append("Warning: No render for covarate " + label + " colors will be generated.\n");
					String type = getRequiredStr("covariate", covar, "type");
					fileout.println(colorMap(color, type));

					if (i == colClassifications.size()-1) 
						fileout.println("\t\t}");
					else
						fileout.println("\t\t},");	
				}
			}
			fileout.println("\t],");

			fileout.println("\t\"output_location\": \"" + sub.getAbsolutePath().replaceAll("[\\\\]+","\\\\\\\\") + "\"");
			fileout.println("}");
			
			fileout.close();

			if (errors.length() > 0) {
				System.out.println(errors);
				System.exit(1);
			} else {
				System.out.println(warnings);
				String genArgs[] = new String[] {viewerMapDir+File.separator+"heatmapProperties.json",genPDF};
				HeatmapDataGenerator.main(genArgs);
			}

			//Zip results
			if (!noZip)
				zipDirectory(theDir, subdir + ".zip");
			
		} catch(Exception e) {
			System.out.println(errors);
			e.printStackTrace();
			System.out.println( "error in GalaxyMapGen e= "+ e.getMessage());
		} 
	}
	
}
