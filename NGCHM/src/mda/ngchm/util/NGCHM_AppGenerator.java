/*******************************************************************
 * CLASS: NGCHM_AppGenerator
 *
 * This class contains the logic necessary to create the stand-alone
 * NG-CHM Viewer .HTML file. It is typically called from the ANT
 * script (build_ngchmApp.xml). It reads in the chm.html file. Using
 * the script include statements, it reads in any CSS files and writes
 * them into the stand-alone.  It also reads/writes the minimized ngchm-min.js
 * into the stand-alone html. All images are converted to base64 images
 * as they are written into the stand-alone html file.
 *
 * Argument1: Input - Path to the Web directory (e.g. ./WebContent/)
 * 				of the project
 * Argument2: Output - File name for stand-alone html (e.g. ngChmApp.html)
 *
 * Author: Mark Stucky
 * Date: 2017
 ******************************************************************/

package mda.ngchm.util;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Date;
import mda.ngchm.util.CompilerUtilities;

public class NGCHM_AppGenerator {

  /*******************************************************************
   * METHOD: styleToString
   *
   * This method reads in CSS file line and writes it out to the
   * stand-alone html output file.  Any images contained in the CSS
   * will be written in base64 binary.
   ******************************************************************/
  public static String styleToString(String webDir, String cssFile) throws Exception {
    StringBuffer strBuff = new StringBuffer();

    BufferedReader br = new BufferedReader(new FileReader(webDir + "/" + cssFile));
    String line = br.readLine();
    while (line != null) {
      String toks[] = line.split("\\s+");
      for (String tok : toks) {
        if (tok.contains("images/")) {
          int start = tok.indexOf("images/");
          int stop = tok.indexOf(".png") + 4;
          strBuff.append(tok.substring(0, start - 4));
          strBuff.append(
            CompilerUtilities.encodeFileToBase64Binary(webDir + "/" + tok.substring(start, stop))
          );
          strBuff.append(tok.substring(stop + 1) + " ");
        } else {
          strBuff.append(tok.replace("\"", "\\\"") + " ");
        }
      }
      line = br.readLine();
    }

    br.close();
    return strBuff.toString();
  }

  public static void copyToFile(String src, BufferedWriter bw)
    throws FileNotFoundException, IOException {
    BufferedReader br = new BufferedReader(new FileReader(src));
    String jsLine = br.readLine();
    while (jsLine != null) {
      bw.write(jsLine + "\n");
      jsLine = br.readLine();
    }
    br.close();
  }

  /*******************************************************************
   * METHOD: main
   *
   * This method is the driver for the entire stand-alone html file
   * build process. chm.html, ngchm-min.js and jspdf.min.js are read
   * in and the stand-alone is written out.
   ******************************************************************/
  public static void main(String[] args) {
    System.out.println("BEGIN NGCHM_AppGenerator  " + new Date());
    try {
      if (args.length < 2) {
        System.out.println("Usage: NGCHM_AppGenerator <web directory> <output file>");
        System.exit(1);
      }

      ArrayList<String> preservedScripts = new ArrayList<String>();
      BufferedReader br = new BufferedReader(new FileReader(args[0] + "chm.html"));
      BufferedWriter bw = new BufferedWriter(new FileWriter(args[0] + args[1]));
      StringBuffer scriptedLines = new StringBuffer();
      boolean isScript = false;

      String line = br.readLine();
      while (line != null) {
        String htmlString = "";
        if (line.contains("text/Javascript")) {
          //Beginning of embedded Javascript in chm.html
          scriptedLines.append("/* BEGIN chm.html Javascript: */\n");
          isScript = true;
        } else if (isScript && line.contains("</script>")) {
          //End of embedded Javascript in chm.html
          scriptedLines.append("/* END chm.html Javascript: */\n\n");
          isScript = false;
        } else if (isScript) {
          scriptedLines.append(line + "\n");
          //For css file - convert it into a string and use javascript to add it to the html document
        } else if (line.contains("src=\"javascript")) {
          if (line.contains("PRESERVE")) {
            // Add to list of preserved files to add later
            String jsFile = CompilerUtilities.getJavascriptFileName(line);
            preservedScripts.add(jsFile);
          }
          // Otherwise ignore
        } else if (line.contains("<link rel=\"stylesheet")) {
          //Write out css to be added into Javascript file later
          String cssFile = CompilerUtilities.getCSSFileName(line);
          bw.write("<style type='text/css'>");
          bw.write(styleToString(args[0], cssFile));
          bw.write("</style>\n");
        } else if (line.contains("images/")) {
          //Write out images, as base 64 binary, to HTML string
          String toks[] = line.split(" ");
          for (String tok : toks) {
            if (tok.contains("images/")) {
              int start = tok.indexOf("images/");
              int stop = tok.indexOf(".png") + 4;
              htmlString += tok.substring(0, start);
              htmlString += CompilerUtilities.encodeFileToBase64Binary(
                args[0] + "/" + tok.substring(start, stop)
              );
              htmlString += tok.substring(stop) + " ";
            } else {
              htmlString += tok + " ";
            }
          }
          bw.write(htmlString + "\n");
        } else if (line.contains("</body>")) {
          // Add all SVG icons just before javascript.
          copyToFile(args[0] + "icons.svg", bw);
          // Write all javascript just before closing body tag.
          if (args[1].equals("ngChm.html")) {
            bw.write("<script src='javascript/ngchm-min.js'></script>\n");
          } else {
            bw.write("<script>\n");
            bw.write("var isNgChmAppViewer=true;\n");
            copyToFile(args[0] + "javascript/ngchm-min.js", bw);
            for (int i = 0; i < preservedScripts.size(); i++) {
              copyToFile(args[0] + preservedScripts.get(i), bw);
            }
            bw.write(scriptedLines.toString());
            bw.write("</script>\n");
          }
          bw.write(line + "\n");
        } else {
          //This is standard HTML, write out to html string
          bw.write(line.replaceAll("icons.svg", "") + "\n");
        }
        line = br.readLine();
      }
      bw.close();
      br.close();
      System.out.println("END NGCHM_AppGenerator " + new Date());
    } catch (Exception e) {
      // TODO Auto-generated catch block
      e.printStackTrace();
    }
  }
}
