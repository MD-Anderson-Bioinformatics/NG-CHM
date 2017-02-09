package mda.ngchm.datagenerator;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.nio.file.Files;
import java.util.ArrayList;

//This import causes issues with the git pull / ant build - comment out for now.
//import org.apache.tomcat.util.http.fileupload.FileUtils;

import static mda.ngchm.datagenerator.ImportConstants.*;

public class LegacyMapGen {
	private static String FILE_SEP = File.separator + File.separator; // On windows "\" path separator characters need to be doubled in json strings
	private static ArrayList<String> props = new ArrayList<String>();
	private static ArrayList<String> propValues = new ArrayList<String>();
	private static String HOME_DIR = System.getProperty("user.dir");
	private static boolean ARCHIVE = false;
	
	private static String findValue(String lookup) {
		String propValue = "NA";
		for (int i = 0; i < props.size(); i++) {
			String prop = props.get(i);
			if (prop.equals(lookup)) {
				propValue = propValues.get(i);
				break;
			}
		}
		return propValue;
	}

	private static String scrubValues(String valueObj) {
		String scrubbedVal = "[";
		String interim = valueObj.substring(1,valueObj.length()-1);
		String[] valueBits = interim.split(";");
		for (int i = 0; i < valueBits.length; i++) {
			String bit = valueBits[i];
			if (isNumeric(bit)) {
				scrubbedVal += bit;
			} else {
				scrubbedVal += QUOTE+bit+QUOTE;
			}
			if (i == valueBits.length - 1) {
				scrubbedVal += "]";
			} else {
				scrubbedVal += ",";
			}
		}
		return scrubbedVal;
	}
	private static void archiveFile(String filename, String from, String to) throws IOException {
		if (ARCHIVE) {
			copyFile(filename, from, to);
		}
	}

	private static void copyFile(String filename, String from, String to) throws IOException {
		File toDir = new File(to);
		if (!toDir.exists()) {
			toDir.mkdirs();
		}
		File fromFile = new File(from+FILE_SEP+filename);
		File toFile = new File(to+FILE_SEP+filename);
		if ((fromFile.exists()) && (!toFile.exists())) {
		    Files.copy(fromFile.toPath(),toFile.toPath());
		}
		
	}

	public static void cleanupData(String from, String to, String propfile)
	{
		try {
			File theFile = new File(from);
			if (theFile.exists()) {
				//This utility causes issues with the git pull / ant build - comment out for now.
				//FileUtils.deleteDirectory(theFile);
			}
			File prop = new File(propfile);
			if (prop.exists()) {
				prop.delete();
			}
		} catch (Exception e) {
			//something here
		}
	}

	public static boolean isNumeric(String str)
	{
	  return str.matches("-?\\d+(\\.\\d+)?");  //match a number with optional '-' and decimal.
	}
	
	public static String getLabelType(String ltype)
	{
		String label = "NA";
        switch (ltype) {
	        case "gene":
	     	   	 label = "GENE_SYM_ID";
	             break;
	        case "protein":
	     	   	 label = "GENE_SYM";
	             break;
	        case "probe":   
	     	   	 label = "PROBE_SYM";
	             break;
	        case "mirna":  
	     	   	 label = "MIRNA_SYM";
	             break;
	        case "sample":   
	     	     label = "SAMPLE";
	             break;
        }
		return label;
	}
	
	public static void execRClustering(String dataloc) {
	   ArrayList<String> commandLine = new ArrayList<String>();

	   commandLine.add("R");
       commandLine.add("--slave");
       commandLine.add("--vanilla");
       commandLine.add("--file="+HOME_DIR+"\\galaxy\\CHM.R");
       commandLine.add("--args");
       commandLine.add(dataloc+File.separator+"data1.data.tsv");
       commandLine.add("Hierarchical");
       commandLine.add("euclidean");
       commandLine.add("ward.D");
       commandLine.add("Hierarchical");
       commandLine.add("euclidean");
       commandLine.add("ward.D");
       commandLine.add(dataloc+File.separator+"ROfile.txt");
       commandLine.add(dataloc+File.separator+"COfile.txt");
       commandLine.add(dataloc+File.separator+"RDfile.txt");
       commandLine.add(dataloc+File.separator+"CDfile.txt");

       try {
	       ProcessBuilder pb = new ProcessBuilder(commandLine);
	       pb.redirectErrorStream(true);
	       Process process = pb.start();
	       InputStream stdout = process.getInputStream();
	       BufferedReader br = new BufferedReader(new InputStreamReader(stdout));
	        String line = null;
	        while ((line = br.readLine()) != null) {
	        	System.out.println(line);
	        }
	       int exitCode = process.waitFor();
	       if (exitCode == 0)
	    	   System.out.println("STATUS: COMPLETE");
	       else
	    	   System.out.println("STATUS: ERROR");
       } catch (Exception e) {
    	   System.out.println("Clustering step failed: "+e.toString());
       }
	}
	
	public static void main(String[] args) {
		if (args.length < 3) {
			System.out.println("Usage: LegacyMapGen <Data Root Directory> <Data Staging Directory> <archive (true/false)>");
			System.exit(1);
		}	

		//Create an output directory - this should be a heat map name.
		String dataPath = args[0];
		String legacyLoc = dataPath+File.separator+args[1];
		if ((args[2] != null) && (args[2].equals("true"))) {
			ARCHIVE = true;
		}
		String dataLoc = legacyLoc+File.separator+"ngchm.input";
		
		boolean filesExist = false;
		boolean colClassesExist = false;
		boolean rowClassesExist = false;

		try {
	    	File colClassFile = new File(dataLoc+File.separator+"columnClassification1.txt");
	    	File rowClassFile = new File(dataLoc+File.separator+"rowClassification1.txt");

	    	File dataDir = new File(dataLoc);
	    	File propFile = new File(dataLoc+File.separator+"chm.properties");
	    	if (!dataDir.exists()) {
	    		//ERROR no data 
	    		System.out.println("Error: the data directory does not exist"); 
	    	} else {
				//Check to see if chm.properties exists (nothing will be done without this file).
		    	if (!propFile.exists()) {
		    		System.out.println("Error: the chm.properties file does not exist");
		    	} else {
		    		filesExist = true;
		    	}
				//Check to see if there are any column classification covariates for this legacy map
		    	if (colClassFile.exists()) {
		    		colClassesExist = true;
		    	}
				//Check to see if there are any row classification covariates for this legacy map
		    	if (rowClassFile.exists()) {
		    		rowClassesExist = true;
		    	}
	    	}
	    	execRClustering(dataLoc);
	    	
			//Read thru legacy chm.properties file, adding to an pair of properties/values string arrays.
			int datalayers = 0;
			if (filesExist) {
				try (BufferedReader br = new BufferedReader(new FileReader(propFile))) {
				    String line;
				    while ((line = br.readLine()) != null) {
				       int eqLoc = line.indexOf("=");
				       if (eqLoc > 0) {
				    	   String value = line.substring(0, eqLoc);
				    	   if (value.indexOf("colormap") == 0) {
				    		   int dotLoc = value.indexOf(".");
				    		   datalayers = Integer.parseInt(value.substring(8,dotLoc));
				    	   }
				    	   props.add(line.substring(0, eqLoc));
				    	   propValues.add(line.substring(eqLoc+1, line.length()));
				       }
				    }
				}
			}
			int rowClassCtr = 0;
			if (rowClassesExist) {
				try (BufferedReader br = new BufferedReader(new FileReader(rowClassFile))) {
				    String line;
				    while ((line = br.readLine()) != null) {
				       int eqLoc = line.indexOf("=");
				       if (eqLoc > 0) {
				    	   props.add("r"+line.substring(0, eqLoc));
				    	   propValues.add(line.substring(eqLoc+1, line.length()));
				       }
				       rowClassCtr++;
				    }
				}
			}
			rowClassCtr = rowClassCtr/8;
			int colClassCtr = 0;
			if (colClassesExist) {
				try (BufferedReader br = new BufferedReader(new FileReader(colClassFile))) {
				    String line;
				    while ((line = br.readLine()) != null) {
				       int eqLoc = line.indexOf("=");
				       if (eqLoc > 0) {
				    	   props.add("c"+line.substring(0, eqLoc));
				    	   propValues.add(line.substring(eqLoc+1, line.length()));
				       }
				       colClassCtr++;
				    }
				}
			}
			colClassCtr = colClassCtr/8;
			String mapName = findValue("data.set.name");
			String[] fileNameAttrs = mapName.split("_");

			String archiveDir = legacyLoc+File.separator+mapName;
			archiveFile(propFile.getName(),dataLoc,archiveDir);
			File outputLoc = new File(dataPath+File.separator+mapName);
			if (!outputLoc.exists()) {
				outputLoc.mkdirs();
	    	}
			String outputDirPath = outputLoc.getAbsolutePath().replace(File.separator, FILE_SEP);
			
			//Retrieve column type and row type from map name
			String rowsId = getLabelType(fileNameAttrs[4]);
			String colsId = getLabelType(fileNameAttrs[5]);
			
			//Construct the heatmapProperties.json file
			PrintWriter fileout = new PrintWriter(outputLoc + File.separator + "heatmapProperties.json", "UTF-8" );
			fileout.println("{");
			fileout.println("\t\"chm_name\": \"" + mapName + "\",");
			String value = findValue("chm.info.caption");
			fileout.println("\t\"chm_description\": \"" + value + "\",");
			fileout.println("\t\"chm_attributes\": [{\"dataset\":\"Geneexpr\"},{\"studyId\":\"blca_tcga\"}],");
			fileout.println("\t\"read_only\": \"Y\",");
			fileout.println("\t\"version_id\": \"1.0.0\",");
			fileout.println("\t\"matrix_files\": [");
			String dataDirPath = dataDir.getAbsolutePath().replace(File.separator, FILE_SEP);
			for (int i=1;i<=datalayers;i++) {
				value = findValue("data"+i+".label.name");
				fileout.println("\t{");
				fileout.println("\t\t\"name\": \"" + value + "\",");
				value = findValue("data"+i+".file.name");
				archiveFile(value,dataDirPath,archiveDir);
				copyFile(value,dataDirPath,outputDirPath);
				fileout.println("\t\t\"path\": \"" + outputDirPath + FILE_SEP + value + "\",");
				fileout.println("\t\t\"summary_method\": \"average\",");
				fileout.println("\t\t\"color_map\": {");
				value = findValue("colormap"+i+".color.type");
				fileout.println("\t\t\t\"type\": \"" + value + "\",");
				value = findValue("colormap"+i+".colors");
				value = scrubValues(value);
				fileout.println("\t\t\t\"colors\": " + value + ",");
				value = findValue("colormap"+i+".thresholds");
				value = scrubValues(value);
				fileout.println("\t\t\t\"thresholds\": " + value + ",");
				value = findValue("colormap"+i+".missing.color");
				fileout.println("\t\t\t\"missing\": \"" + value + "\"");
				fileout.println("\t\t}");
				fileout.println("\t}");
				if (i < datalayers) {
					fileout.println(",");
				} else {
					fileout.println("],");
				}
			}
			String DFile = outputDirPath + FILE_SEP + "RDFile.txt";
			String OFile = outputDirPath + FILE_SEP + "ROFile.txt";
			archiveFile("RDFile.txt",dataDirPath,archiveDir);
			copyFile("RDFile.txt",dataDirPath,outputDirPath);
			archiveFile("ROFile.txt",dataDirPath,archiveDir);
			copyFile("ROFile.txt",dataDirPath,outputDirPath);
			fileout.println("\t\"row_configuration\": {");
			fileout.println("\t\"data_type\": [\""+rowsId+"\"],");
			fileout.println("\t\"order_method\": \"Hierarchical\",");
			fileout.println("\t\"distance_metric\": \"Euclidean\",");
			fileout.println("\t\"agglomeration_method\": \"Ward\",");
			fileout.println("\t\"order_file\": \""+OFile+"\",");
			fileout.println("\t\"dendro_file\": \""+DFile+"\"");
			fileout.println("\t},");
			DFile = outputDirPath + FILE_SEP + "CDFile.txt";
			OFile = outputDirPath + FILE_SEP + "COFile.txt";
			archiveFile("CDFile.txt",dataDirPath,archiveDir);
			copyFile("CDFile.txt",dataDirPath,outputDirPath);
			archiveFile("COFile.txt",dataDirPath,archiveDir);
			copyFile("COFile.txt",dataDirPath,outputDirPath);
			fileout.println("\t\"col_configuration\": {");
			fileout.println("\t\"data_type\": [\""+colsId+"\"],");
			fileout.println("\t\"order_method\": \"Hierarchical\",");
			fileout.println("\t\"distance_metric\": \"Euclidean\",");
			fileout.println("\t\"agglomeration_method\": \"Ward\",");
			fileout.println("\t\"order_file\": \""+OFile+"\",");
			fileout.println("\t\"dendro_file\": \""+DFile+"\"");
			fileout.println("\t},");
			fileout.println("\t\"classification_files\": [");
			if (rowClassCtr+colClassCtr == 0) {
				fileout.println("],");
			} else {
				if (rowClassCtr > 0) {
					for (int i=1;i<=rowClassCtr;i++) {
						value = findValue("rclassification.label"+i);
						fileout.println("\t{");
						fileout.println("\t\t\"name\": \"" + value + "\",");
						value = "rowClassificationData"+i+".txt";
						archiveFile(value,dataDirPath,archiveDir);
						copyFile(value,dataDirPath,outputDirPath);
						fileout.println("\t\t\"path\": \"" + outputDirPath + FILE_SEP + value + "\",");
						fileout.println("\t\t\"position\": \"row\",");
						fileout.println("\t\t\"color_map\": {");
						value = findValue("rclassification.type"+i);
						fileout.println("\t\t\t\"type\": \"" + value + "\",");
						value = findValue("rclassification.colors"+i);
						value = scrubValues(value);
						fileout.println("\t\t\t\"colors\": " + value + ",");
						value = findValue("rclassification.values"+i);
						value = scrubValues(value);
						fileout.println("\t\t\t\"thresholds\": " + value + ",");
						value = findValue("rclassification.missing.color"+i);
						fileout.println("\t\t\t\"missing\": \"" + value + "\"");
						fileout.println("\t\t}");
						fileout.println("\t}");
						if ((i < rowClassCtr) || (colClassCtr > 0)) {
							fileout.println(",");
						}
					}
				}
				if (colClassCtr > 0) {
					for (int i=1;i<=colClassCtr;i++) {
						value = findValue("cclassification.label"+i);
						fileout.println("\t{");
						fileout.println("\t\t\"name\": \"" + value + "\",");
						value = "columnClassificationData"+i+".txt";
						archiveFile(value,dataDirPath,archiveDir);
						copyFile(value,dataDirPath,outputDirPath);
						fileout.println("\t\t\"path\": \"" + outputDirPath + FILE_SEP + value + "\",");
						fileout.println("\t\t\"position\": \"column\",");
						fileout.println("\t\t\"color_map\": {");
						value = findValue("cclassification.type"+i);
						fileout.println("\t\t\t\"type\": \"" + value + "\",");
						value = findValue("cclassification.colors"+i);
						value = scrubValues(value);
						fileout.println("\t\t\t\"colors\": " + value + ",");
						value = findValue("cclassification.values"+i);
						value = scrubValues(value);
						fileout.println("\t\t\t\"thresholds\": " + value + ",");
						value = findValue("cclassification.missing.color"+i);
						fileout.println("\t\t\t\"missing\": \"" + value + "\"");
						fileout.println("\t\t}");
						fileout.println("\t}");
						if (i < colClassCtr) {
							fileout.println(",");
						}
					}
				}
				fileout.println("],");
			}
			
			fileout.println("\t\"output_location\": \""+outputDirPath+"\"");
			fileout.println("}");
			fileout.close();
			
			archiveFile("heatmapProperties.json",outputLoc.getPath(),archiveDir);
			archiveFile(colClassFile.getName(),dataLoc,archiveDir);
			archiveFile(rowClassFile.getName(),dataLoc,archiveDir);

			//Call and execute HeatMapDataGenerator
			String heatProps = outputDirPath+FILE_SEP+"heatmapProperties.json";
			String genArgs[] = new String[] {heatProps};
			HeatmapDataGenerator.main(genArgs);
			
			String extraProp = legacyLoc+File.separator+"chm.properties";
			cleanupData(dataLoc.replace(File.separator, FILE_SEP),archiveDir.replace(File.separator, FILE_SEP), extraProp.replace(File.separator, FILE_SEP));
		} catch(Exception e) {
			e.printStackTrace();
			System.out.println( "error in LegacyMapGen e= "+ e.getMessage());
		}


	}
	
}
