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

/* Wrapper class to connect the HeatmapDataGenerator into a Galaxy tool */
public class GalaxyMapGen {


	public static void main(String[] args){


		if (args.length < 17) {
			System.out.println("Usage: GalaxyMapGen "
					+ "<chm name> <chm description> <matrix name> <matrix file> <matrix color type> <matrix row type> <matrix column type> "
					+ "<row order method> <row distance> <row agglomeration> <row order file> <row dendro file> "
					+ "<col order method> <col distance> <col agglomeration> <col order file> <col dendro file> "
					+ "<summary method> "
					+ "[<classification name> <classification file> <classification type>] "
					+ "<output file>");
			System.exit(1);
		}	

		//Create an output directory - this should be a heatmap name.
		String dir = ""+ new Date().getTime();
		File tDir = new File(dir);
		tDir.mkdir();
		String name = args[0].replace(' ', '_');
		String subdir = dir + File.separator + File.separator + name;
		File sub = new File(subdir);
		sub.mkdir();
		subdir = subdir + File.separator + File.separator;

		try {
			PrintWriter fileout = new PrintWriter( "heatmapProperties.json", "UTF-8" );
			fileout.println("{");
			fileout.println("\t\t\"chm_name\": \"" + name + "\",");
			fileout.println("\t\t\"chm_description\": \"" + args[1] + "\",");
			fileout.println("\t\t\"chm_attributes\": [],");
			fileout.println("\t\"matrix_files\": [");
			fileout.println("\t\t{");
			fileout.println("\t\t\"name\": \"" + args[2] + "\",");
		 	fileout.println("\t\t\"path\":  \"" + args[3] + "\",");
			fileout.println("\t\t\"color_type\": \"" + args[4] + "\",");
			fileout.println("\t\"summary_method\": \"" + args[17] + "\"");
			fileout.println("\t\t}");
			fileout.println("\t],");

			fileout.println("\t\"row_configuration\": ");
			fileout.println("\t\t{");
			fileout.println("\t\t\"data_type\": [\"" + args[5] + "\"],");
			fileout.println("\t\t\"order_method\": \"" + args[7] + "\",");
		 	fileout.println("\t\t\"distance_metric\":  \"" + args[8] + "\",");
			fileout.println("\t\t\"agglomeration_method\": \"" + args[9] + "\",");
			fileout.println("\t\t\"order_file\": \"" + args[10] + "\",");
			fileout.println("\t\t\"dendro_file\": \"" + args[11] + "\"");
			fileout.println("\t\t}");
			fileout.println("\t,");

			fileout.println("\t\"col_configuration\": ");
			fileout.println("\t\t{");
			fileout.println("\t\t\"data_type\": [\"" + args[6] + "\"],");
			fileout.println("\t\t\"order_method\": \"" + args[12] + "\",");
		 	fileout.println("\t\t\"distance_metric\":  \"" + args[13] + "\",");
			fileout.println("\t\t\"agglomeration_method\": \"" + args[14] + "\",");
			fileout.println("\t\t\"order_file\": \"" + args[15] + "\",");
			fileout.println("\t\t\"dendro_file\": \"" + args[16] + "\"");
			fileout.println("\t\t}");
			fileout.println("\t,");


			fileout.println("\t\"classification_files\": [");
			for (int pos = 18; pos < args.length-3; pos+=3) {
				String type = "column";
				String colorType = "discrete";
				if (args[pos+2].contains("row")) {
					type = "row";
				}
				if (args[pos+2].contains("continuous")) {
					colorType = "continuous";
				}
				fileout.println("\t\t{");
				String fileName = new File(args[pos+1]).getName();
				if (fileName.contains("."))
					fileName = fileName.substring(0,fileName.lastIndexOf("."));
				fileout.println("\t\t\"name\": \"" + args[pos] + "\",");
				fileout.println("\t\t\"path\": \"" + args[pos+1] + "\",");
				fileout.println("\t\t\"position\": \"" + type + "\",");
				fileout.println("\t\t\"color_map\": {");
				fileout.println("\t\t\"type\": \"" + colorType + "\"}");
				if (pos == args.length-4) 
					fileout.println("\t\t}");
				else
					fileout.println("\t\t},");	
			}
			fileout.println("\t],");

			fileout.println("\t\"output_location\": \"" + subdir + "\"");
			fileout.println("}");
			
			fileout.close();

			String genArgs[] = new String[] {"heatmapProperties.json"};
			HeatmapDataGenerator.main(genArgs);

			//Zip results
			zipDirectory(tDir, args[args.length-1]);
			
		} catch(Exception e) {
			e.printStackTrace();
			System.out.println( "error in GalaxyMapGen e= "+ e.getMessage());
		}


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
