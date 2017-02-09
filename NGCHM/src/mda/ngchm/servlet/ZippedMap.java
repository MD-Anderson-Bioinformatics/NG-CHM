package mda.ngchm.servlet;

import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import javax.servlet.ServletException;
import javax.servlet.ServletOutputStream;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * Servlet implementation class GetMatrix
 */
@WebServlet("/ZippedMap")
public class ZippedMap extends HttpServlet {
	private static final long serialVersionUID = 1L;
	private static final String mapLocation = "/NGCHMProto";
	
	/*******************************************************************
	 * METHOD: zipDirectory
	 *
	 * This method is the top-level method for zipping up the specified
	 * heatmap directory. First it retrieves a list of all files to be
	 * written to the zip and then it writes them out to a 
	 * ZipOutputStream.
	 ******************************************************************/
	public static void zipDirectory(File directoryToZip, String mapName, String config, ZipOutputStream zos) throws IOException {
		List<File> fileList = new ArrayList<File>();
		getHeatmapFiles(directoryToZip, fileList, mapName);
		writeZipFile(directoryToZip, fileList, config, zos);
		return;
	}

	/*******************************************************************
	 * METHOD: getHeatmapFiles
	 *
	 * This method gets all files in the heatmap directory and returns
	 * them as a File[] list object.  It calls a method to retrieve all 
	 * files (getAllFiles) AFTER placing a top-level directory entry into 
	 * the zip archive.
	 ******************************************************************/
	public static void getHeatmapFiles(File dir, List<File> fileList, String mapName) {
		try {
			File[] files = dir.listFiles();
			for (File file : files) {
				if (file.getName().equals(mapName)) {
					fileList.add(file);
					if (file.isDirectory()) {
						getAllFiles(file, fileList);
					} 
				}
			}
		} catch (Exception e) {
			e.printStackTrace();
		}
	}

	/*******************************************************************
	 * METHOD: getAllFiles
	 *
	 * This method gets all files in the heatmap directory and returns
	 * them as a File[] list object.
	 ******************************************************************/
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

	/*******************************************************************
	 * METHOD: writeZipFile
	 *
	 * This method iterates thru all of the files in the heatmap directory
	 * and adds them to the new zip archive.  The contents of the 
	 * mapConfig.JSON file are replaced with config text passed to the 
	 * servlet.
	 ******************************************************************/
	public static void writeZipFile(File directoryToZip, List<File> fileList, String config, ZipOutputStream zos) {
		try {
			for (File file : fileList) {
				if (!file.isDirectory()) { // we only zip files, not directories
					if (file.getName().equals("mapConfig.json")) {
						addConfigToZip(directoryToZip, file, zos, config);
					} else {
						addToZip(directoryToZip, file, zos); 
					}
				}
			}
		} catch (FileNotFoundException e) {
			e.printStackTrace();
		} catch (IOException e) {
			e.printStackTrace();
		}
		return;
	}

	/*******************************************************************
	 * METHOD: addToZip
	 *
	 * This method adds the contents of the file being processed to the
	 * new zip archive.
	 ******************************************************************/
	public static void addToZip(File directoryToZip, File file, ZipOutputStream zos) throws FileNotFoundException, IOException {
		FileInputStream fis = new FileInputStream(file);
		zos.putNextEntry(getZipEntry(directoryToZip, file));
		byte[] bytes = new byte[1024];
		int length;
		while ((length = fis.read(bytes)) >= 0) {
			zos.write(bytes, 0, length);
		}
		zos.closeEntry();
		fis.close();
	}
	
	/*******************************************************************
	 * METHOD: addConfigToZip
	 *
	 * This method adds the contents of the mapConfig.JSON file, as 
	 * passed into the servlet, into the zipped version of the file 
	 * going into the new zip archive.
	 ******************************************************************/
	public static void addConfigToZip(File directoryToZip, File file, ZipOutputStream zos, String config) throws FileNotFoundException, IOException {
		zos.putNextEntry(getZipEntry(directoryToZip, file));
		byte[] b = config.toString().getBytes();
		zos.write(b, 0, b.length);
		zos.closeEntry();
	}
	
	/*******************************************************************
	 * METHOD: getZipEntry
	 *
	 * This method creates a ZipEntry object from the directory and file
	 * to be zipped.
	 ******************************************************************/
	public static ZipEntry getZipEntry(File directoryToZip, File file) throws FileNotFoundException, IOException {
		// we want the zipEntry's path to be a relative path that is relative to the directory being zipped, so chop off the rest of the path
		String zipFilePath = file.getCanonicalPath().substring(directoryToZip.getCanonicalPath().length() + 1, file.getCanonicalPath().length());
		zipFilePath = zipFilePath.replaceAll("\\\\", "/");
		return new ZipEntry(zipFilePath);
	}
	
	/*******************************************************************
	 * METHOD: processRequest
	 *
	 * This method processes the POST request sent to the servlet.  Map
	 * name (used for file location purposes) and heat map configuration
	 * data are retrieved from the request.  Using this information,
	 * logic is called to zip up the contents of the heatmap directory, 
	 * while replacing the contents of mapConfig.JSON with the passed-in
	 * configuration data.
	 ******************************************************************/
	protected void processRequest(HttpServletRequest request, HttpServletResponse response) {
    	try {
    		// Retrieve parameters from request
        	String mapName = request.getParameter("map");
    		String configData = request.getParameter("configData");
        	File configDir = new File(mapLocation);  
    		// Configure response
        	response.setContentType("application/zip");
            response.addHeader("Content-Disposition", "attachment; filename="+mapName+".ngchm");
            // Retrieve ServletOutputStream as a ZipOutputStream
    		ServletOutputStream out = response.getOutputStream();
    		ZipOutputStream zos = new ZipOutputStream(new BufferedOutputStream(out));
            // Zip up contents of requested heatmap directory
        	zipDirectory(configDir, mapName, configData, zos);
    		zos.flush();
        	zos.close();
       } catch (Exception e) {
         //Do something here
        }
		return;
	}
       
	/**
	 * @see HttpServlet#doGet(HttpServletRequest request, HttpServletResponse response)
	 */
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		doPost(request, response);
    } 
    
	/**
	 * @see HttpServlet#doPost(HttpServletRequest request, HttpServletResponse response)
	 */
	protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException { 
        processRequest(request, response);
	}

}



