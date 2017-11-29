package mda.ngchm.datagenerator;

import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import static mda.ngchm.datagenerator.ImportConstants.*;

/* Wrapper class to connect the HeatmapDataGenerator into a Galaxy tool */
public class GalaxyMapGen {
	
public static boolean debugOutput = false;


	public static void main(String[] args){
		
		if (debugOutput) {
			writeOutArgsAndParams(args);
		}
		if (args[0].equals("advanced")) {
			performAdvancedMapGeneration(args);
		} else if (args[0].equals("standard")) {
			performStandardMapGeneration(args);
		} else {
			System.out.println("Error: No proper type (standard/advanced) provided on Galaxy heat map request. Exiting.");
			System.exit(1);
		}
	}
	
	public static void performAdvancedMapGeneration(String[] args){
		
		if (args.length < 24) {
			System.out.println("Usage: GalaxyMapGen "
					+ "<chm name> <chm description> <data layer name> <matrix file> <matrix coloring type> <row lable type> <column label type> "
					+ "<row order method> <row distance> <row agglomeration> <row order file> <row dendro file> <row tree cuts> <row top items>"
					+ "<col order method> <col distance> <col agglomeration> <col order file> <col dendro file> <col tree cuts> <col top items>"
					+ "<summary method> <matrix attribs>"
					+ "[<classification name> <classification file> <classification bar type> <classification type>] "
					+ "<output file>");
			System.exit(1);
		}
		System.out.println("START Galaxy Interface Advanced Heat Map Generation: " + new Date()); 
		//Create an output directory - this should be a heatmap name.
		String dir = ""+ new Date().getTime();
		File tDir = new File(dir);
		tDir.mkdir();
		String name = args[1].replace(' ', '_');
		String subdir = dir + File.separator + File.separator + name;
		File sub = new File(subdir);
		sub.mkdir();
		subdir = subdir + File.separator + File.separator;
		//Optional heat map attributes are passed as a string with ";" as attribute separator and ":" as attrib/value separator
		String attribs[] = args[23].trim().split("[\\s;]+");
		if (attribs[0].equalsIgnoreCase("None") || attribs[0].equalsIgnoreCase("")) {
			attribs = new String[0];
		}
		try {
			String matrixFile = args[4];
	/*		String errMsg = MatrixValidator.validateMatrixFile(matrixFile);
			if (errMsg != null) {
				System.out.println(errMsg);
				throw new Exception(errMsg);
			} 
			*/
			PrintWriter fileout = new PrintWriter( "heatmapProperties.json", "UTF-8" );
			if (debugOutput) {
				System.out.println("BEGIN properties file");
			}
			writeHeatmapPropertiesEntry(fileout, "{");
			writeHeatmapPropertiesEntry(fileout, "\t\t\"chm_name\": \"" + name + "\",");
			writeHeatmapPropertiesEntry(fileout, "\t\t\"chm_description\": \"" + args[2] + "\",");
			writeHeatmapPropertiesEntry(fileout, "\t\t\"chm_attributes\": [");
			boolean first = true;
			for (String attrib : attribs) {
				if (!first) {
					writeHeatmapPropertiesEntry(fileout, ",");
				}
				String[] attr = attrib.split(":");
				if (attr.length == 2) {
					if ((!attr[0].equals("")) && (!attr[1].equals(""))) {
						writeHeatmapPropertiesEntry(fileout, "\t\t\t\t{\"" + attr[0] + "\":\"" + attr[1] + "\"}");
					} else {
						System.out.println("WARNING: Errant attribute found and skipped. Parameter data must be entered for both the key and value for an attribute pair.");
					}
				} else {
					System.out.println("WARNING: Errant attribute found and skipped. Parameter data must be entered for both the key and value for an attribute pair.");
				}
				first=false;
			} 		
			writeHeatmapPropertiesEntry(fileout, "\t\t],");
			writeHeatmapPropertiesEntry(fileout, "\t\"matrix_files\": [");
			writeHeatmapPropertiesEntry(fileout, "\t\t{");
			writeHeatmapPropertiesEntry(fileout, "\t\t\"name\": \"" + args[3] + "\",");
			writeHeatmapPropertiesEntry(fileout, "\t\t\"path\":  \"" + matrixFile + "\",");
			writeHeatmapPropertiesEntry(fileout, "\t\t\"color_type\": \"" + args[5] + "\"");
			writeHeatmapPropertiesEntry(fileout, "\t\t}");
			writeHeatmapPropertiesEntry(fileout, "\t],");

			writeHeatmapPropertiesEntry(fileout, "\t\"row_configuration\": ");
			writeHeatmapPropertiesEntry(fileout, "\t\t{");
			writeHeatmapPropertiesEntry(fileout, "\t\t\"data_type\": [\"" + args[6] + "\"],");
			writeHeatmapPropertiesEntry(fileout, "\t\t\"order_method\": \"" + args[8] + "\",");
			writeHeatmapPropertiesEntry(fileout, "\t\t\"distance_metric\":  \"" + args[9] + "\",");
			writeHeatmapPropertiesEntry(fileout, "\t\t\"agglomeration_method\": \"" + args[10] + "\",");
			String rowCutsVal = args[13].substring(2, args[13].length());
			int isTree = rowCutsVal.lastIndexOf("t");
			if (isTree > 0) {
				String[] cutValues = rowCutsVal.split("t");
				writeHeatmapPropertiesEntry(fileout, "\t\t\"tree_cuts\": \"" + cutValues[0] + "\",");
				writeHeatmapPropertiesEntry(fileout, "\t\t\"cut_width\": \"10\",");
			} else if (!rowCutsVal.equals("None") && !rowCutsVal.equals("0")) {
				String[] toks = rowCutsVal.split(",");
				boolean cutsValid = true;
				for (int j=0;j<toks.length;j++) {
					String tokVal = toks[j];
					if (!MatrixValidator.isInteger(tokVal)) {
						cutsValid = false;
						System.out.println("Warning: Row Gap Locations parameter invalid and skipped. Must contain only a comma-delimited string of integer values.");
						break;
					}
				}
				if (cutsValid) {
					writeHeatmapPropertiesEntry(fileout, "\t\t\"cut_locations\": [" + rowCutsVal + "],");
					writeHeatmapPropertiesEntry(fileout, "\t\t\"cut_width\": \"10\",");
				}
			}
			String rowTopItems = args[14].substring(2, args[14].length());
			if ((!rowTopItems.equals("None")) && (!rowTopItems.equals(EMPTY))) {
	            String[] toks = rowTopItems.split(",");
	            String rowTops = "\"";
	            if (toks.length > 10) {
					System.out.println("Warning: Row Top Items exceed limit of 10 items. Remaining items have been skipped.");
	            }
	            int topLen = toks.length > 10 ? 10 : toks.length;
	            for (int i=0; i<topLen;i++) {
	            	rowTops += toks[i]+"\"";
	            	if (i<topLen-1) {
	            		rowTops += ",\"";
	            	}
	            }
				writeHeatmapPropertiesEntry(fileout, "\t\t\"top_items\": [" + rowTops + "],");
			}
			if (args[8].equals("Hierarchical")) {
				writeHeatmapPropertiesEntry(fileout, "\t\t\"order_file\": \"" + args[11] + "\",");
				writeHeatmapPropertiesEntry(fileout, "\t\t\"dendro_file\": \"" + args[12] + "\"");
			}
			writeHeatmapPropertiesEntry(fileout, "\t\t}");
			writeHeatmapPropertiesEntry(fileout, "\t,");

			writeHeatmapPropertiesEntry(fileout, "\t\"col_configuration\": ");
			writeHeatmapPropertiesEntry(fileout, "\t\t{");
			writeHeatmapPropertiesEntry(fileout, "\t\t\"data_type\": [\"" + args[7] + "\"],");
			writeHeatmapPropertiesEntry(fileout, "\t\t\"order_method\": \"" + args[15] + "\",");
			writeHeatmapPropertiesEntry(fileout, "\t\t\"distance_metric\":  \"" + args[16] + "\",");
			writeHeatmapPropertiesEntry(fileout, "\t\t\"agglomeration_method\": \"" + args[17] + "\",");
			String colCutsVal = args[20].substring(2, args[20].length());
			isTree = colCutsVal.lastIndexOf("t");
			if (isTree > 0) {
				String[] cutValues = colCutsVal.split("t");
				writeHeatmapPropertiesEntry(fileout, "\t\t\"tree_cuts\": \"" + cutValues[0] + "\",");
				writeHeatmapPropertiesEntry(fileout, "\t\t\"cut_width\": \"10\",");
			} else if (!colCutsVal.equals("None") && !colCutsVal.equals("0") && !colCutsVal.equals(EMPTY)) {
				String[] toks = colCutsVal.split(",");
				boolean cutsValid = true;
				for (int j=0;j<toks.length;j++) {
					String tokVal = toks[j];
					if (!MatrixValidator.isInteger(tokVal)) {
						cutsValid = false;
						System.out.println("Warning: Column Gap Locations parameter invalid and skipped. Must contain only a comma-delimited string of integer values.");
						break;
					}
				}
				if (cutsValid) {
					System.out.println("INSIDE CUTS VALID");
					writeHeatmapPropertiesEntry(fileout, "\t\t\"cut_locations\": [" + colCutsVal + "],");
					writeHeatmapPropertiesEntry(fileout, "\t\t\"cut_width\": \"10\",");
				}
			}
			String colTopItems = args[21].substring(2, args[21].length());
			if ((!colTopItems.equals("None"))  && (!colTopItems.equals(EMPTY))) {
	            String[] toks = colTopItems.split(",");
	            String colTops = "\"";
	            if (toks.length > 10) {
					System.out.println("Warning: Column Top Items exceed limit of 10 items. Remaining items have been skipped.");
	            }
	            int topLen = toks.length > 10 ? 10 : toks.length;
	            for (int i=0; i<topLen;i++) {
	            	colTops += toks[i]+"\"";
	            	if (i<topLen-1){
	            		colTops += ",\"";
	            	}
	            }
				writeHeatmapPropertiesEntry(fileout, "\t\t\"top_items\": [" + colTops + "],");
			}
			if (args[15].equals("Hierarchical")) {
				writeHeatmapPropertiesEntry(fileout, "\t\t\"order_file\": \"" + args[18] + "\",");
				writeHeatmapPropertiesEntry(fileout, "\t\t\"dendro_file\": \"" + args[19] + "\"");
			}
			writeHeatmapPropertiesEntry(fileout, "\t\t}");
			writeHeatmapPropertiesEntry(fileout, "\t,");

			writeHeatmapPropertiesEntry(fileout, "\t\"classification_files\": [");
			for (int pos = 24; pos < args.length-3; pos+=4) {
				String type = "column";
				String colorType = "discrete";
				if (args[pos+2].contains("row")) {
					type = "row";
				}
				if (args[pos+2].contains("continuous")) {
					colorType = "continuous";
				}
				String barType = args[pos+3];
				if ((colorType.equals("discrete")) && (!barType.equals("color_plot"))){
					barType = "color_plot";
					System.out.println("WARNING: Bar Plot and Scatter Plot display types are only available for continuous data.  The Bar Type for covariate bar ("+ args[pos] +") has been changed to color_plot");
				}
				if (debugOutput) {
					System.out.println("CLASSES args[pos]: " + args[pos] + " args[pos+1]: " + args[pos+1] + " args[pos+2]: " + args[pos+2] + "  args[pos+3]: " + args[pos+3]);
					System.out.println("CLASSES pos: " + pos + " position: " + type + " barType: " + barType + " name: " + args[pos] + " path: " + args[pos+1]);
				}
				writeHeatmapPropertiesEntry(fileout, "\t\t{");
				String fileName = new File(args[pos+1]).getName();
				if (fileName.contains("."))
					fileName = fileName.substring(0,fileName.lastIndexOf("."));
				writeHeatmapPropertiesEntry(fileout, "\t\t\"name\": \"" + args[pos] + "\",");
				writeHeatmapPropertiesEntry(fileout, "\t\t\"path\": \"" + args[pos+1] + "\",");
				writeHeatmapPropertiesEntry(fileout, "\t\t\"position\": \"" + type + "\",");
				if (!barType.equals("color_plot")) {
					writeHeatmapPropertiesEntry(fileout, "\t\t\"bar_type\": \"" + barType + "\",");
					writeHeatmapPropertiesEntry(fileout, "\t\t\"height\": \"50\",");
				}
				writeHeatmapPropertiesEntry(fileout, "\t\t\"color_map\": {");
				writeHeatmapPropertiesEntry(fileout, "\t\t\"type\": \"" + colorType + "\"}");
				if (pos == args.length-4) {
					writeHeatmapPropertiesEntry(fileout, "\t\t}");
				} else {
					writeHeatmapPropertiesEntry(fileout, "\t\t},");
				}
			}
			writeHeatmapPropertiesEntry(fileout, "\t],");
			writeHeatmapPropertiesEntry(fileout, "\t\"output_location\": \"" + subdir + "\"");
			writeHeatmapPropertiesEntry(fileout, "}");
			if (debugOutput) {
				System.out.println("END properties file");
			}
			
			fileout.close();

			String genArgs[] = new String[] {"heatmapProperties.json"};
			String errMsg = HeatmapDataGenerator.processHeatMap(genArgs);
			if (errMsg != null) {
				System.out.println( "ERROR in GalaxyMapGen e= "+ errMsg);
				System.exit(1);
			} else {
				//Zip results
				zipDirectory(tDir, args[args.length-1]);
				System.exit(0);
			}
		} catch(Exception e) {
			e.printStackTrace();
			System.out.println( "Error in GalaxyMapGen e= "+ e.getMessage());
			System.exit(1);
		}
	}

	public static void performStandardMapGeneration(String[] args){
	
		if (args.length < 19) {
			System.out.println("Usage: GalaxyMapGen "
					+ "<chm name> <chm description> <data layer name> <matrix file> <matrix coloring type> <row lable type> <column label type> "
					+ "<row order method> <row distance> <row agglomeration> <row order file> <row dendro file> "
					+ "<col order method> <col distance> <col agglomeration> <col order file> <col dendro file> "
					+ "<summary method> "
					+ "[<classification name> <classification file> <classification type>] "
					+ "<output file>");
			System.exit(1);
		}		
		System.out.println("START Galaxy Interface Heat Map Generation: " + new Date()); 
		//Create an output directory - this should be a heatmap name.
		String dir = ""+ new Date().getTime();
		File tDir = new File(dir);
		tDir.mkdir();
		String name = args[1].replace(' ', '_');
		String subdir = dir + File.separator + File.separator + name;
		File sub = new File(subdir);
		sub.mkdir();
		subdir = subdir + File.separator + File.separator;
		
		try {
			String matrixFile = args[4];
/*			String errMsg = MatrixValidator.validateMatrixFile(matrixFile);
			if (errMsg != null) {
				System.out.println(errMsg);
				throw new Exception(errMsg);
			} */
			PrintWriter fileout = new PrintWriter( "heatmapProperties.json", "UTF-8" );
			if (debugOutput) {
				System.out.println("BEGIN properties file");
			}
			writeHeatmapPropertiesEntry(fileout, "{");
			writeHeatmapPropertiesEntry(fileout, "\t\t\"chm_name\": \"" + name + "\",");
			writeHeatmapPropertiesEntry(fileout, "\t\t\"chm_description\": \"" + args[2] + "\",");
			writeHeatmapPropertiesEntry(fileout, "\t\t\"chm_attributes\": [],");
			writeHeatmapPropertiesEntry(fileout, "\t\"matrix_files\": [");
			writeHeatmapPropertiesEntry(fileout, "\t\t{");
			writeHeatmapPropertiesEntry(fileout, "\t\t\"name\": \"" + args[3] + "\",");
			writeHeatmapPropertiesEntry(fileout, "\t\t\"path\":  \"" + matrixFile + "\",");
			writeHeatmapPropertiesEntry(fileout, "\t\"summary_method\": \"" + args[18] + "\"");
			writeHeatmapPropertiesEntry(fileout, "\t\t}");
			writeHeatmapPropertiesEntry(fileout, "\t],");
		
			writeHeatmapPropertiesEntry(fileout, "\t\"row_configuration\": ");
			writeHeatmapPropertiesEntry(fileout, "\t\t{");
			writeHeatmapPropertiesEntry(fileout, "\t\t\"data_type\": [\"" + args[6] + "\"],");
			writeHeatmapPropertiesEntry(fileout, "\t\t\"order_method\": \"" + args[8] + "\",");
			writeHeatmapPropertiesEntry(fileout, "\t\t\"distance_metric\":  \"" + args[9] + "\",");
			writeHeatmapPropertiesEntry(fileout, "\t\t\"agglomeration_method\": \"" + args[10] + "\",");
			if (args[8].equals("Hierarchical")) {
				writeHeatmapPropertiesEntry(fileout, "\t\t\"order_file\": \"" + args[11] + "\",");
				writeHeatmapPropertiesEntry(fileout, "\t\t\"dendro_file\": \"" + args[12] + "\"");
			}
			writeHeatmapPropertiesEntry(fileout, "\t\t}");
			writeHeatmapPropertiesEntry(fileout, "\t,");
		
			writeHeatmapPropertiesEntry(fileout, "\t\"col_configuration\": ");
			writeHeatmapPropertiesEntry(fileout, "\t\t{");
			writeHeatmapPropertiesEntry(fileout, "\t\t\"data_type\": [\"" + args[7] + "\"],");
			writeHeatmapPropertiesEntry(fileout, "\t\t\"order_method\": \"" + args[13] + "\",");
			writeHeatmapPropertiesEntry(fileout, "\t\t\"distance_metric\":  \"" + args[14] + "\",");
			writeHeatmapPropertiesEntry(fileout, "\t\t\"agglomeration_method\": \"" + args[15] + "\",");
			if (args[13].equals("Hierarchical")) {
				writeHeatmapPropertiesEntry(fileout, "\t\t\"order_file\": \"" + args[16] + "\",");
				writeHeatmapPropertiesEntry(fileout, "\t\t\"dendro_file\": \"" + args[17] + "\"");
			}
			writeHeatmapPropertiesEntry(fileout, "\t\t}");
			writeHeatmapPropertiesEntry(fileout, "\t,");
		
			writeHeatmapPropertiesEntry(fileout, "\t\"classification_files\": [");
			for (int pos = 19; pos < args.length-3; pos+=3) {
				String type = "column";
				String colorType = "discrete";
				if (args[pos+2].contains("row")) {
					type = "row";
				}
				if (args[pos+2].contains("continuous")) {
					colorType = "continuous";
				}
				writeHeatmapPropertiesEntry(fileout, "\t\t{");
				String fileName = new File(args[pos+1]).getName();
				if (fileName.contains("."))
					fileName = fileName.substring(0,fileName.lastIndexOf("."));
				writeHeatmapPropertiesEntry(fileout, "\t\t\"name\": \"" + args[pos] + "\",");
				writeHeatmapPropertiesEntry(fileout, "\t\t\"path\": \"" + args[pos+1] + "\",");
				writeHeatmapPropertiesEntry(fileout, "\t\t\"position\": \"" + type + "\",");
				writeHeatmapPropertiesEntry(fileout, "\t\t\"color_map\": {");
				writeHeatmapPropertiesEntry(fileout, "\t\t\"type\": \"" + colorType + "\"}");
				if (pos == args.length-4) {
					writeHeatmapPropertiesEntry(fileout, "\t\t}");
				} else {
					writeHeatmapPropertiesEntry(fileout, "\t\t},");
				}
			}
			writeHeatmapPropertiesEntry(fileout, "\t],");
			writeHeatmapPropertiesEntry(fileout, "\t\"output_location\": \"" + subdir + "\"");
			writeHeatmapPropertiesEntry(fileout, "}");
			if (debugOutput) {
				System.out.println("END properties file");
			}
			
			fileout.close();
		
			String genArgs[] = new String[] {"heatmapProperties.json"};
			String errMsg = HeatmapDataGenerator.processHeatMap(genArgs);
			if (errMsg != null) {
				System.out.println( "ERROR in GalaxyMapGen e= "+ errMsg);
				System.exit(1);
			} else {
				//Zip results
				zipDirectory(tDir, args[args.length-1]);
				System.exit(0);
			}
		} catch(Exception e) {
			e.printStackTrace();
			System.out.println( "Error in GalaxyMapGen e= "+ e.getMessage());
			System.exit(1);
		}
	}
	
	public static void writeHeatmapPropertiesEntry(PrintWriter fileout, String dataOut) {
		fileout.println(dataOut);
		if (debugOutput) {
			System.out.println(dataOut);
		}
	}

	public static void writeOutArgsAndParams(String[] args) {
		System.out.println("BEGIN args");
		for (int i=0;i<args.length;i++) {
			System.out.println("args[" + i + "]: " + args[i]);
		}
		System.out.println("END args");
		if (args[0].equals("advanced")) {
			System.out.println("INSIDE ADVANCED MAP GENERATION");
			System.out.println("<chm name> " + args[1]);
			System.out.println("<chm description> " + args[2]);
			System.out.println("<data layer name> " + args[3]);
			System.out.println("<matrix file> " + args[4]);
			System.out.println("<matrix coloring type> " + args[5]);
			System.out.println("<row lable type> " + args[6]);
			System.out.println("<column label type> " + args[7]);
			System.out.println("<row order method> " + args[8]);
			System.out.println("<row distance> " + args[9]);
			System.out.println("<row agglomeration> " + args[10]);
			System.out.println("<row order file> " + args[11]);
			System.out.println("<row dendro file> " + args[12]);
			System.out.println("<row tree cuts> " + args[13]);
			System.out.println("<row top items> " + args[14]);
			System.out.println("<col order method> " + args[15]);
			System.out.println("<col distance> " + args[16]);
			System.out.println("<col agglomeration> " + args[17]);
			System.out.println("<col order file> " + args[18]);
			System.out.println("<col dendro file> " + args[19]);
			System.out.println("<col tree cuts> " + args[20]);
			System.out.println("<col top items> " + args[21]);
			System.out.println("<summary method> " + args[22]);
			System.out.println("<matrix attribs> " + args[23]);
			System.out.println("<classifications> " + args[24]);
		} else {
			System.out.println("INSIDE STANDARD MAP GENERATION");
			System.out.println("<chm name> " + args[1]);
			System.out.println("<chm description> " + args[2]);
			System.out.println("<data layer name> " + args[3]);
			System.out.println("<matrix file> " + args[4]);
			System.out.println("<matrix coloring type> " + args[5]);
			System.out.println("<row lable type> " + args[6]);
			System.out.println("<column label type> " + args[7]);
			System.out.println("<row order method> " + args[8]);
			System.out.println("<row distance> " + args[9]);
			System.out.println("<row agglomeration> " + args[10]);
			System.out.println("<row order file> " + args[11]);
			System.out.println("<row dendro file> " + args[12]);
			System.out.println("<col order method> " + args[13]);
			System.out.println("<col distance> " + args[14]);
			System.out.println("<col agglomeration> " + args[15]);
			System.out.println("<col order file> " + args[16]);
			System.out.println("<col dendro file> " + args[17]);
			System.out.println("<summary method> " + args[18]);
			System.out.println("<classifications> " + args[19]);
		}
		System.out.println("BEGIN heatmapProperties.json");
	}


	public static void zipDirectory(File directoryToZip, String zipFileName) throws IOException {

		List<File> fileList = new ArrayList<File>();
		getAllFiles(directoryToZip, fileList);
		writeZipFile(directoryToZip, fileList, zipFileName);
	}

	public static void getAllFiles(File dir, List<File> fileList) {
		try {
			File[] files = dir.listFiles();
			for (File file : files) {
				fileList.add(file);
				if (file.isDirectory()) {
					getAllFiles(file, fileList);
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

}
