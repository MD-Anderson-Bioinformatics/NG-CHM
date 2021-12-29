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
		while (line != null) {
			String toks[] = line.split("\\s+");
			for (String tok : toks) {
				if (tok.contains("images/")) {
					int start = tok.indexOf("images/");
					int stop = tok.indexOf(".png") + 4;
					strBuff.append(tok.substring(0,start-4));
					strBuff.append(encodeFileToBase64Binary(webDir + "/" + tok.substring(start,stop)));
					strBuff.append(tok.substring(stop+1) + " ");
				} else {
					strBuff.append(tok.replace("\"", "\\\"") + " ");
				}
			}
			line = br.readLine();
		}
    	
		br.close();
    	return strBuff.toString();
    }
	
	/*******************************************************************
	 * METHOD: excludeDiv
	 *
	 * This method excludes certain header/footer DIVs from being 
	 * written into the widget.
	 ******************************************************************/
    public static void excludeDiv(BufferedReader br) throws Exception {
    	String line = "";
		while (!line.contains("/div")) {
			line = br.readLine();
		}
    	return;
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
		System.out.println("BEGIN NGCHM Widgetizer  " + new Date());
        try {
   		if (args.length < 2) {
    			System.out.println("Usage: NGCHM_Widgetizer <web directory> <output file> <mode>");
    			System.exit(1);
    		}
		
    		StringBuffer delayedLines = new StringBuffer();
    		StringBuffer scriptedLines = new StringBuffer();
    		BufferedWriter  bw = new BufferedWriter(new FileWriter(args[1]));
    		BufferedReader br = new BufferedReader(new FileReader(args[0] + "/chm.html" ));
    		String mode = args[2];
    		String htmlString = "";
    		
    		String line = br.readLine();
    		boolean isScript = false;
    		boolean isFirstJSFile = true;
    		while (line != null) {
    			if (line.contains("src=\"javascript")){
    				if (isFirstJSFile) {
    					isFirstJSFile = false;
					copyToFile (args[0] + "javascript/ngchm-min.js", bw);
					copyToFile (args[0] + "javascript/lib/jspdf.min.js", bw);
    				}
    			} else if (line.contains("text/Javascript")) {
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
     				} else {
        				scriptedLines.append(line + "\n");
     				}
        			//For css file - convert it into a string and use javascript to add it to the html document 
    			}  else if (line.contains("<link rel=\"stylesheet")) {
       				//Write out css to be added into Javascript file later
    				String cssFile = line.substring(line.indexOf("href=\"")+6,line.indexOf("?"));
				delayedLines.append("(function() { var css = document.createElement(\"style\");\ncss.type = \"text/css\";\n");
				delayedLines.append("css.innerText = \"" + styleToString(args[0], cssFile) + "\";\ndocument.head.appendChild(css);\n");
				delayedLines.append("})();\n");
    			} else if (line.contains("images/")) {
       				//Write out images, as base 64 binary, to HTML string
    				String toks[] = line.split(" ");
    				for (String tok : toks) {
    					if (tok.contains("images/")) {
    						int start = tok.indexOf("images/");
    						int stop = tok.indexOf(".png") + 4;
    						htmlString += tok.substring(0,start);
    						htmlString += encodeFileToBase64Binary(args[0] + "/" + tok.substring(start,stop));
    						htmlString += tok.substring(stop) + " ";
    					} else {
    						htmlString += tok + " ";
    					}
    				}
    			} else if (line.contains("body")){
    				//skip
    			} else {	
    				if ((line.contains("mda_header")) || (line.contains("insilico_footer"))) {
    					//Exclude MDA and Insilico logo from widgetized html
    					excludeDiv(br);
    				} else {
        				//This is standard HTML, write out to html string
        				htmlString += line;
    				}
    			}
    			line = br.readLine();
    		} 	
			String finalHtml = "";
			finalHtml = htmlString.replace("\"", "\\\"").replace("\\\\\"", "\\\"");
       		bw.write("/* BEGIN CSS Javascript: */\n");
			bw.write(delayedLines.toString());
       		bw.write("/* END CSS Javascript: */\n\n");
		bw.write("var ngChmWidgetMode = '" + mode + "';\n");
		bw.write("(function() {\n");
    		bw.write("var htmlContent = \"" + finalHtml + "\"\n");
    		bw.write("var embedDiv = document.getElementById(\"NGCHMEmbed\");\n");
    		bw.write("if (embedDiv !== null) {embedDiv.innerHTML = htmlContent;}\n");
		bw.write("})()\n");
    		bw.write("document.body.addEventListener('click', NgChm.UHM.closeMenu,true);\n");
    		bw.write(scriptedLines.toString());
    		//hide save button for "widget mode"
       		if (mode.equals("web")) {
       		    bw.write("document.getElementById('save_btn').style.display = 'none';\n"); 
       		}
    		bw.close();
    		br.close();
    		System.out.println("END NGCHM Widgetizer  " + new Date());
		
        } catch (Exception e) {
            // TODO Auto-generated catch block
            e.printStackTrace();
        } 

	}

}
