package mda.ngchm.util;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileReader;
import java.io.FileWriter;
import java.util.Base64;
import java.util.Date;

public class NGCHM_Widgetizer {


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
     
    public static String styleToString(String webDir, String cssFile) throws Exception {
    	StringBuffer strBuff = new StringBuffer();
    	
		BufferedReader br = new BufferedReader(new FileReader(webDir + "/" + cssFile));
		String line = br.readLine();
		while (line != null) {
			String toks[] = line.split("\\s+");
			for (String tok : toks) {
				strBuff.append(tok.replace("\"", "\\\"") + " ");
			}
			line = br.readLine();
		}
    	
		br.close();
    	return strBuff.toString();
    }
	
    public static void excludeDiv(BufferedReader br) throws Exception {
    	String line = "";
		while (!line.contains("/div")) {
			line = br.readLine();
		}
    	return;
    }
	

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
    		BufferedReader br2 = new BufferedReader(new FileReader(args[0] + "javascript/ngchm-min.js" ));
    		BufferedReader br3 = new BufferedReader(new FileReader(args[0] + "javascript/lib/jspdf.min.js" )); 
    		String mode = args[2];
    		String htmlString = "";
    		
    		String line = br.readLine();
    		boolean isScript = false;
    		boolean isFirstJSFile = true;
    		while (line != null) {
    			//For css file - convert it into a string and use javascript to add it to the html document 
    			if (line.contains("src=\"javascript")){
    				if (isFirstJSFile) {
    					isFirstJSFile = false;
         				String jsLine = br2.readLine();
         				while (jsLine != null) {
             				bw.write(jsLine+"\n");
             				jsLine = br2.readLine();
         				} 
         				jsLine = br3.readLine();
         				while (jsLine != null) {
             				bw.write(jsLine+"\n");
             				jsLine = br3.readLine();
        				}
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
    					line = br.readLine();
     				} else {
        				scriptedLines.append(line + "\n");
     				}
    			}  else if (line.contains("<link rel=\"stylesheet")) {
       				//Write out css to be added into Javascript file later
    				String cssFile = line.substring(line.indexOf("href=\"")+6,line.indexOf("\">"));
    				delayedLines.append("var css = document.createElement(\"style\");\ncss.type = \"text/css\";\n");
     				delayedLines.append("css.innerHTML = \"" + styleToString(args[0], cssFile) + "\";\ndocument.body.appendChild(css);\n");
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
	       	bw.write("var ngChmWidgetMode = '" + mode + "'\n");
    		bw.write("var htmlContent = \"" + finalHtml + "\"\n");
    		bw.write("var embedDiv = document.getElementById(\"NGCHMEmbed\");\n");
    		bw.write("embedDiv.innerHTML = htmlContent;\n");
    		bw.write(scriptedLines.toString());
    		//hide split screen and save buttons for "widget mode"
       		bw.write("document.getElementById('split_btn').style.display = 'none';\n");
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
