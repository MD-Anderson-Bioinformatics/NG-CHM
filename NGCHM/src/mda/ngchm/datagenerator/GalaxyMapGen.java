/*******************************************************************
 * CLASS: GalaxyMapGen
 *
 * This class contains the logic included in the GalaxyMapGen JAR
 * that is built in the NGCHM project and ported to the NG-CHM Galaxy
 * project to provide HeatmapDataGenerator functionality to the
 * Galaxy implementation of the NG-CHM Viewer. A JSON object
 * containing a nearly complete heatmapProperties JSON file is
 * passed in from Galaxy. Some modifications (commented below)
 * are made to the JSON file and the HMDG is called using the
 * modified JSON.
 *
 * ALSO: This class is where the version value is set for the
 * NG-CHM Galaxy implementation.
 *
 * Author: Mark Stucky
 * Date: December 14, 2015
 ******************************************************************/
package mda.ngchm.datagenerator;

import static mda.ngchm.datagenerator.ImportConstants.*;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;

/* Wrapper class to connect the HeatmapDataGenerator into a Galaxy tool */
public class GalaxyMapGen {

  public static boolean debugOutput = false;
  private static String BUILDER_VERSION = "2.14.0";

  public static void main(String[] args) {
    try {
      JSONParser parser = new JSONParser();
      Object obj = parser.parse(args[0]);
      JSONObject jsonObject = (JSONObject) obj;
      if (debugOutput) {
        System.out.println("Galaxy JSON Arguments: " + args[0]);
      }
      performMapGeneration(jsonObject);
    } catch (ParseException e) {
      System.out.println("FATAL ERROR: GalaxyMapGen could not parse JSON arguments: " + args[0]);
      System.exit(1);
    }
  }

  public static void performMapGeneration(JSONObject jsonObject) {
    System.out.println("START Galaxy Interface Heat Map Generation: " + new Date());
    try {
      //Used to keep pdfBox warning messages out of the log (specifically for Galaxy)
      java.util.logging.Logger.getLogger("org.apache.pdfbox").setLevel(
        java.util.logging.Level.SEVERE
      );

      //Create an output directory - this should be a heatmap name.
      String dir = "" + new Date().getTime();
      File tDir = new File(dir);
      tDir.mkdir();
      String hmName = (String) jsonObject.get(CHM_NAME);

      //Get contents of JSON output location from Galaxy and then remove from JSON (for use as zip output location)
      String outputLocation = (String) jsonObject.get(OUTPUT_LOC);
      jsonObject.remove(OUTPUT_LOC);

      //Construct subdir string for heatmap output and place on JSON object
      String name = hmName.replace(' ', '_');
      //Truncate name to 40 characters
      if (name.length() > 40) {
        name = name.substring(0, 40);
      }
      String subdir = dir + File.separator + File.separator + name;
      File sub = new File(subdir);
      sub.mkdir();
      subdir = subdir + File.separator + File.separator;

      //Add heatmap output subdirectory and galaxy version number to heatmapProperties JSON
      jsonObject.put(OUTPUT_LOC, subdir);
      String buildPlatform = (String) jsonObject.get(BUILD_PLATFORM);
      jsonObject.put(BUILDER_VER, buildPlatform + SPACE + BUILDER_VERSION);
      jsonObject.remove(BUILD_PLATFORM);

      //Fix org.simple.JSON escaping of forward slashes throughout JSON
      String jsonString = jsonObject.toString();
      jsonString = jsonString.replaceAll("\\\\", "");

      //Write json string to heatmapProperties.json file
      PrintWriter fileout = new PrintWriter("heatmapProperties.json", "UTF-8");
      if (debugOutput) {
        System.out.println("BEGIN properties file");
      }
      writeHeatmapPropertiesEntry(fileout, jsonString);
      if (debugOutput) {
        System.out.println("END properties file");
      }
      fileout.close();

      //Execute heatmap data generator to create heat map
      String genArgs[] = new String[] { "heatmapProperties.json" };
      String errMsg = HeatmapDataGenerator.processHeatMap(genArgs);
      if ((errMsg != EMPTY) && (errMsg.contains("BUILD ERROR"))) {
        System.out.println("ERROR in GalaxyMapGen e= " + errMsg);
        System.exit(1);
      } else {
        //Zip results
        zipDirectory(tDir, outputLocation);
        System.exit(0);
      }
    } catch (Exception e) {
      e.printStackTrace();
      System.out.println("FATAL ERROR: In GalaxyMapGen e= " + e.getMessage());
      System.exit(1);
    }
  }

  public static void writeHeatmapPropertiesEntry(PrintWriter fileout, String dataOut) {
    fileout.println(dataOut);
    if (debugOutput) {
      System.out.println(dataOut);
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

  public static void addToZip(File directoryToZip, File file, ZipOutputStream zos)
    throws FileNotFoundException, IOException {
    FileInputStream fis = new FileInputStream(file);

    // we want the zipEntry's path to be a relative path that is relative
    // to the directory being zipped, so chop off the rest of the path
    String zipFilePath = file
      .getCanonicalPath()
      .substring(directoryToZip.getCanonicalPath().length() + 1, file.getCanonicalPath().length());
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
