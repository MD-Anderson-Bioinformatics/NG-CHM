/*******************************************************************
 * CLASS: NGCHM_Widgetizer
 *
 * This class contains the logic necessary merge all of the javascript
 * included in the Viewer project into a single widgetized NG-CHM JS file
 * (ngchmWidget-min.js). It is typically called from the ANT script 
 * (build_ngchmApp.xml). It uses chm.html as an input template.  Previously
 * created minimized JS files are written into the widget.  CSS is written
 * into the widget at the very end.  Any images are converted to base64
 * images.  Viewer header and footers are excluded from the widget. At the
 * end a final segment of all-new JS is written so that the widget may
 * embed a heat map into whatever product that it is included within.
 * 
 * Argument1: Input - Path to the Web directory (e.g. ./WebContent/) 
 * 				of the project to the chm.html file
 * Argument2: Output - Name of the output file (e.g. ngchmWidget-min.js).
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
import java.io.IOException;
import java.io.FileNotFoundException;
import java.util.Base64;
import java.util.Date;

public class NGCHM_Widgetizer {

	/*******************************************************************
	 * METHOD: encodeFileToBase64Binary
	 *
	 * This method reads in an image file and writes it out in base64 
	 * binary representation.
	 ******************************************************************/
   private static String encodeFileToBase64Binary(String image) throws Exception {
          String encodedfile = null;
          try {
        	  File file = new File(image);
              FileInputStream fileInputStreamReader = new FileInputStream(file);
              byte[] bytes = new byte[(int)file.length()];
              fileInputStreamReader.read(bytes);
              encodedfile = "data:image/png;base64," + Base64.getEncoder().encodeToString(bytes);
              fileInputStreamReader.close();
          } catch (Exception e) {
              // TODO Auto-generated catch block
              e.printStackTrace();
          } 

          return encodedfile;
    }
     
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
		int lineNumber = 1;
		while (line != null) {
			String toks[] = line.split("\\s+");
			for (String tok : toks) {
				if (tok.contains("images/")) {
					int start = tok.indexOf("images/");
					int stop = tok.indexOf(".png");
					if (start < 0 || stop < 0) {
					    System.out.println ("Bad image string: '" + tok + "' in " + webDir + "/" + cssFile + ", line " + lineNumber);
					}
				        stop = stop + 4; // End of .png
					// BMB: Why use start-4 and stop+1 to extract text around image path?
					// BMB: I think it's because the stylefile wraps it in url( ) and
					// BMB: we don't want to copy that.
					strBuff.append(tok.substring(0,start-4));
					strBuff.append(encodeFileToBase64Binary(webDir + "/" + tok.substring(start,stop)));
					strBuff.append(tok.substring(stop+1) + " ");
				} else {
					strBuff.append(tok.replace("\"", "\\\"") + " ");
				}
			}
			line = br.readLine();
			lineNumber += 1;
		}
    	
		br.close();
    	return strBuff.toString();
    }

    public static void copyToFile (String src, BufferedWriter bw)
	throws FileNotFoundException, IOException
    {
	BufferedReader br = new BufferedReader(new FileReader(src));
	String jsLine = br.readLine();
	while (jsLine != null) {
	    bw.write(jsLine+"\n");
	    jsLine = br.readLine();
	}
	br.close();
    }

	/*******************************************************************
	 * METHOD: main
	 *
	 * This method is the driver for the js widgetizer process. It reads
	 * in the chm.html file, css files, and already minimized JS files
	 * and writes out the contents into the output file (ngchmWidget-min.js)
	 ******************************************************************/
    public static void main(String[] args) {
		boolean debug = false;
		System.out.println("BEGIN NGCHM Widgetizer  " + new Date());
        try {
   		if (args.length < 2) {
    			System.out.println("Usage: NGCHM_Widgetizer <web directory> <output file> <mode>");
    			System.exit(1);
    		}
		
		StringBuffer cssLines = new StringBuffer();
    		StringBuffer scriptedLines = new StringBuffer();
    		BufferedReader br = new BufferedReader(new FileReader(args[0] + "/chm.html" ));
		BufferedWriter bw = new BufferedWriter(new FileWriter(args[1]));
    		String mode = args[2];
    		String htmlString = "";
    		
    		String line = br.readLine();
    		boolean isScript = false;
		boolean copyingToWidget = false;
		int lineNumber = 1;
    		while (line != null) {
			if (line.contains("text/Javascript")) {
    				//Beginning of embedded Javascript in chm.html
    				scriptedLines.append("/* BEGIN chm.html Javascript: */\n");
    				isScript = true;
    			} else if (line.contains("</script>")) {  
    				//End of embedded Javascript in chm.html
    				scriptedLines.append("/* END chm.html Javascript: */\n\n");
    				isScript = false;
    			} else if (isScript) { 
       				//Write out embedded Javascript from chm.html
    				if (line.contains("window.onload")) {
    					line = br.readLine();
        				scriptedLines.append(line + "\n");
    					line = br.readLine();
        				scriptedLines.append(line + "\n");
        				line = br.readLine();
    					line = br.readLine();
    					line = br.readLine();
    					line = br.readLine();
					lineNumber += 6;
     				} else {
        				scriptedLines.append(line + "\n");
     				}
        			//For css file - convert it into a string and use javascript to add it to the html document 
    			}  else if (line.contains("<link rel=\"stylesheet")) {
       				//Write out css to be added into Javascript file later
				int href = line.indexOf("href=\"");
				int queryStr = line.indexOf("?");
				if (href < 0 || queryStr < 0) {
					System.out.println ("Bad stylesheet reference: '" + line + "' in " + args[0] + "/chm.html, line " + lineNumber);
				}
				String cssFile = line.substring(href+6, queryStr);
				cssLines.append("(function() { var css = document.createElement(\"style\");\ncss.type = \"text/css\";\n");
				cssLines.append("css.innerText = \"" + styleToString(args[0], cssFile) + "\";\ndocument.head.appendChild(css);\n");
				cssLines.append("})();\n");
			} else if (line.contains("<body") || line.contains("WIDGET INCLUDE")){
				copyingToWidget = true;
			} else if (line.contains("</body") || line.contains("WIDGET EXCLUDE")){
				copyingToWidget = false;
			} else if (copyingToWidget) {
				if (debug) System.out.println ("Copying to widget: " + line);
				if (line.contains("images/")) {
					//Write out images, as base 64 binary, to HTML string
					String toks[] = line.split(" ");
					for (String tok : toks) {
						if (tok.contains("images/")) {
							int start = tok.indexOf("images/");
							int stop = tok.indexOf(".png");
							if (start < 0 || stop < 0) {
								System.out.println ("Bad image string: '" + tok + "' in " + args[0] + "/chm.html, line " + lineNumber);
							}
							stop = stop + 4;  // Stop at end of .png
							htmlString += tok.substring(0,start);
							htmlString += encodeFileToBase64Binary(args[0] + "/" + tok.substring(start,stop));
							htmlString += tok.substring(stop) + " ";
						} else {
							htmlString += tok + " ";
						}
					}
				} else {
					//This is standard HTML, write out to html string
					htmlString += line;
				}
			} else {
				if (debug) System.out.println ("Skipping         : " + line);
			}
    			line = br.readLine();
			lineNumber += 1;
    		} 	
		br.close();

		// Inject CSS.
		bw.write("/* BEGIN CSS Javascript: */\n");
		bw.write(cssLines.toString());
		bw.write("/* END CSS Javascript: */\n\n");

		// Inject HTML.
		String finalHtml = htmlString.replace("\"", "\\\"").replace("\\\\\"", "\\\"");
		bw.write("(function() {\n");
    		bw.write("var htmlContent = \"" + finalHtml + "\"\n");
    		bw.write("var embedDiv = document.getElementById(\"NGCHMEmbed\");\n");
    		bw.write("if (embedDiv !== null) {embedDiv.innerHTML = htmlContent;}\n");
		bw.write("})()\n");

		// Inject scripts.
		bw.write("var ngChmWidgetMode = '" + mode + "';\n");
		copyToFile (args[0] + "javascript/ngchm-min.js", bw);
		copyToFile (args[0] + "javascript/lib/jspdf.min.js", bw);
    		bw.write("document.body.addEventListener('click', NgChm.UHM.closeMenu,true);\n");
    		bw.write(scriptedLines.toString());

		// Close output file.
    		bw.close();
    		System.out.println("END NGCHM Widgetizer  " + new Date());
		
        } catch (Exception e) {
            // TODO Auto-generated catch block
            e.printStackTrace();
        } 

	}

}
