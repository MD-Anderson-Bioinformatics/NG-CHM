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
     
    //Get the contents of a javascript file and write it to the combined file, changing
    //any images into encoded strings.
    private static void writeJSFile(String webDir, String jsFile, BufferedWriter combinedWidget) throws Exception {
		BufferedReader br = new BufferedReader(new FileReader(webDir + "/" + jsFile ));
		String line = br.readLine();
		while (line != null) {
			if (line.contains("images/")) {
				String toks[] = line.split(" ");
				for (String tok : toks) {
					if (tok.contains("images/")) {
						int start = tok.indexOf("images/");
						int stop = tok.indexOf(".png") + 4;
						combinedWidget.write(tok.substring(0,start));
						combinedWidget.write(encodeFileToBase64Binary(webDir + "/" + tok.substring(start,stop)));
						combinedWidget.write(tok.substring(stop) + " ");
					} else {
						combinedWidget.write(tok + " ");
					}
				}
				combinedWidget.write("\n");
			} else {
				if (line.contains("script.src = 'javascript/custom/custom.js'")) {
					line = br.readLine();
					combinedWidget.write(line + "\n");
					writeCustomJS(webDir, combinedWidget);
					line = br.readLine();
					line = br.readLine();
					line = br.readLine();
				} else if (line.contains("NgChm.PDF.getPDF = function()")) {
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
    
    private static void writeCustomJS(String webDir, BufferedWriter combinedWidget) throws Exception { 
 		BufferedReader br = new BufferedReader(new FileReader(webDir + "/javascript/custom/custom-min.js" ));
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
     
    public static void main(String[] args) {
		System.out.println("BEGIN NGCHM Minimizer  " + new Date());
        try {
   		if (args.length < 2) {
    			System.out.println("Usage: NGCHM_Minimizer <web directory> <output file>");
    			System.exit(1);
    		}
    		BufferedReader br = new BufferedReader(new FileReader(args[0] + "/chm.html" ));
    		BufferedWriter  bw = new BufferedWriter(new FileWriter(args[0] + "/javascript/" + args[1]));
     		
    		String line = br.readLine();
     		while (line != null) {
    			if (line.contains("src=\"javascript")){
					String jsFile = line.substring(line.indexOf("src=\"")+5,line.indexOf("\">"));
					if (!jsFile.equals("javascript/lib/jspdf.min.js")) {
			       		bw.write("/* BEGIN Javascript file: " + jsFile + " */ \n");
		   				writeJSFile(args[0], jsFile, bw);
		   	       		bw.write("/* END Javascript file: " + jsFile + " */ \n\n");
					}
    			}
    			line = br.readLine();
    		} 	
    		bw.close();
    		br.close();
    		System.out.println("END NGCHM Minimizer  " + new Date());
        } catch (Exception e) {
            // TODO Auto-generated catch block
            e.printStackTrace();
        } 
	}

}
