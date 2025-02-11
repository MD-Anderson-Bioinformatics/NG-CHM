/*******************************************************************
 * CLASS: NGCHM_Minimizer
 *
 * This class contains the logic necessary merge all of the javascript
 * included in the Viewer project into a single JS file (ngchm.js). It
 * is typically called from the ANT script (build_ngchmApp.xml). That
 * script will later minify the JS into ngchm-min.js. This file will
 * later be used to construct both the NG-CHM widget (ngchmWidget-min.js)
 * and stand-alone NG-CHM Viewer (ngChmApp.html).  The chm.html file
 * will be traversed.  Each time a JS include statement is found, that
 * file is read in and written to the output file.  Any images that are
 * found in the JS as it is being processed will be written out as base64
 * images to the output file.
 *
 * Argument1: Input - Path to the Web directory (e.g. ./WebContent/)
 * 				of the project to the chm.html file
 * Argument2: Output - Name of the output file (e.g. ngchm.js).
 *
 * Author: Mark Stucky
 * Date: 2016
 ******************************************************************/
package mda.ngchm.util;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileReader;
import java.io.FileWriter;
import java.util.Base64;
import java.util.Date;

public class NGCHM_Minimizer {

  /*******************************************************************
   * METHOD: writeJSFile
   *
   * This method reads the contents of a javascript file and write its
   * to the combined file, changing any images into base64 encoded strings.
   ******************************************************************/
  private static void writeJSFile(String webDir, String jsFile, BufferedWriter combinedWidget)
    throws Exception {
    BufferedReader br = new BufferedReader(new FileReader(webDir + "/" + jsFile));
    String line = br.readLine();
    Boolean inExcludedRegion = false;
    while (line != null) {
      if (line.contains("BEGIN EXCLUDE")) {
        inExcludedRegion = true; // Exclude this and following lines.
      } else if (line.contains("END EXCLUDE")) {
        inExcludedRegion = false; // Include following lines.
      } else if (inExcludedRegion) {
        // Ignore excluded lines.
      } else {
        line = line.replaceAll("icons.svg", "");
        if (line.contains("images/")) {
          String toks[] = line.split(" ");
          for (String tok : toks) {
            if (tok.contains("images/")) {
              int start = tok.indexOf("images/");
              int stop = tok.indexOf(".png") + 4;
              combinedWidget.write(tok.substring(0, start));
              combinedWidget.write(
                CompilerUtilities.encodeFileToBase64Binary(
                  webDir + "/" + tok.substring(start, stop)
                )
              );
              combinedWidget.write(tok.substring(stop) + " ");
            } else {
              combinedWidget.write(tok + " ");
            }
          }
          combinedWidget.write("\n");
        } else if (line.contains("USE DEFAULT CUSTOM.JS")) {
          // Skip the USE DEFAULT line and the following two lines.
          line = br.readLine();
          line = br.readLine();
          writeCustomJS(webDir, combinedWidget);
        } else if (line.contains("NgChm.PDF.getViewerHeatmapPDF = function()")) {
          combinedWidget.write(line + "\n");
          combinedWidget.write("NgChm.PDF.isWidget = true;\n");
        } else {
          combinedWidget.write(line + "\n");
        }
      }
      line = br.readLine();
    }
    br.close();
  }

  /*******************************************************************
   * METHOD: writeCustomJS
   *
   * This method writes the contents of custom-min.js to the ngchm.js
   * output file.
   ******************************************************************/
  private static void writeCustomJS(String webDir, BufferedWriter combinedWidget) throws Exception {
    BufferedReader br = new BufferedReader(
      new FileReader(webDir + "/javascript/custom/custom-min.js")
    );
    String writeStr = "var s = document.getElementsByTagName('script')[0];\n";
    writeStr += "script.text = '";
    String line = br.readLine();
    while (line != null) {
      writeStr += line;
      line = br.readLine();
    }
    writeStr += "'\n";
    writeStr += "s.parentNode.insertBefore(script, s);\n";
    writeStr += "NgChm.CUST.definePluginLinkouts();\n";
    combinedWidget.write(writeStr);
    br.close();
  }

  /*******************************************************************
   * METHOD: main
   *
   * This method is the driver for the js minimizer process. It reads
   * in the chm.html file and writes out the contents of all JS files
   * included therein, except those marked by PRESERVE, into the output file (ngchm.js)
   ******************************************************************/
  public static void main(String[] args) {
    System.out.println("BEGIN NGCHM_Minimizer  " + new Date());
    if (args.length < 2) {
      System.out.println("Usage: NGCHM_Minimizer <web directory> <output file>");
      System.exit(1);
    }
    try {
      BufferedReader br = new BufferedReader(new FileReader(args[0] + "/chm.html"));
      BufferedWriter bw = new BufferedWriter(new FileWriter(args[0] + "/javascript/" + args[1]));

      String line = br.readLine();
      while (line != null) {
        if (line.contains("src=\"javascript") && !line.contains("PRESERVE")) {
          String jsFile = CompilerUtilities.getJavascriptFileName(line);
          bw.write("/* BEGIN Javascript file: " + jsFile + " */ \n");
          writeJSFile(args[0], jsFile, bw);
          bw.write("/* END Javascript file: " + jsFile + " */ \n\n");
        }
        line = br.readLine();
      }
      bw.close();
      br.close();
      System.out.println("END NGCHM_Minimizer  " + new Date());
    } catch (Exception e) {
      // TODO Auto-generated catch block
      e.printStackTrace();
    }
  }
}
