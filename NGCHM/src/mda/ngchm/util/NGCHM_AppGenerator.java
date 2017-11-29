package mda.ngchm.util;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileReader;
import java.io.FileWriter;
import java.util.Base64;
import java.util.Date;

public class NGCHM_AppGenerator {

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
	
    public static void main(String[] args) {
		System.out.println("BEGIN NGCHM_AppGenerator  " + new Date());
        try {
   		if (args.length < 2) {
    			System.out.println("Usage: NGCHM_AppGenerator <web directory> <output file>");
    			System.exit(1);
    		}
		
    		BufferedReader br = new BufferedReader(new FileReader(args[0] + "chm.html" ));
    		BufferedReader br2 = new BufferedReader(new FileReader(args[0] + "javascript/ngchm-min.js" ));
    		BufferedReader br3 = new BufferedReader(new FileReader(args[0] + "javascript/lib/jspdf.min.js" )); 
    		BufferedWriter bw = new BufferedWriter(new FileWriter(args[0] + args[1] ));
     		
    		String line = br.readLine(); 
     		while (line != null) {
     			String htmlString = "";
    			//For css file - convert it into a string and use javascript to add it to the html document 
    			if (line.contains("src=\"javascript")){
    				//Ignore
    			}  else if (line.contains("<link rel=\"stylesheet")) {
       				//Write out css to be added into Javascript file later
    				String cssFile = line.substring(line.indexOf("href=\"")+6,line.indexOf("\">"));
    				bw.write("<style type='text/css'>");
     				bw.write(styleToString(args[0], cssFile));
     				bw.write("</style>\n");
     				if (args[1].equals("ngChm.html")) {
         				bw.write("<script src='javascript/ngchm-min.js'></script>\n");
    				} else {
         				String jsLine = br2.readLine();
         				bw.write("<script>\n");
         				bw.write("var isApp=true;\n");
         				while (jsLine != null) {
             				bw.write(jsLine+"\n");
             				jsLine = br2.readLine();
         				}
         				jsLine = br3.readLine();
         				while (jsLine != null) {
             				bw.write(jsLine+"\n");
             				jsLine = br3.readLine();
        				}
         				bw.write("</script>\n");
     				}
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
    				bw.write(htmlString+"\n");
    			} else {	
    				//This is standard HTML, write out to html string
    				bw.write(line+"\n");
    			}
    			line = br.readLine();
    		} 	
    		bw.close();
    		br.close();
    		br2.close();
    		System.out.println("END NGCHM_AppGenerator " + new Date());
		
        } catch (Exception e) {
            // TODO Auto-generated catch block
            e.printStackTrace();
        } 

	}

}
