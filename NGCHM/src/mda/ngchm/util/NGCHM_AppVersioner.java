/*******************************************************************
 * CLASS: NGCHM_AppVersioner
 *
 * This class contains the logic necessary to "version" the ngChm
 * primary html file (chm.html).  It is typically called from the ANT
 * script (build_ngchmApp.xml). The html file is read in.  As is
 * the CompatibilityManager.js file.  The latest version number is pulled
 * from the compatibility manager and written into a new version of the
 * chmTemp.html file which is written back into the web content directory.
 * A later step in the script build_ngchmApp.xml will MOVE chmTemp.html
 * to chm.html in the web content directory.
 * 
 * Argument1: Input - Path to the Web directory (e.g. ./WebContent/) 
 * 				of the project 
 * 
 * Author: Mark Stucky
 * Date: 2021
 ******************************************************************/
package mda.ngchm.util;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.util.Date;


public class NGCHM_AppVersioner {

	/*******************************************************************
	 * METHOD: getVersion
	 *
	 * This method reads in the CompatibilityManager.js file and extracts
	 * the latest version number.  The number is returned to the calling
	 * method.
	 ******************************************************************/
	public static String getVersion(File compatibilityJS) throws FileNotFoundException, IOException {
	    String currentVersion = null;
   		BufferedReader br = new BufferedReader(new FileReader(compatibilityJS));
	    String sCurrentLine;
		while((sCurrentLine = br.readLine()) != null) {
			if (sCurrentLine.contains("NgChm.CM.version")) {
				String vals[] = sCurrentLine.split("\"");
				currentVersion = vals[1];
				break;
			}
		}	
	    br.close();
	    return currentVersion;

	}
	
	/*******************************************************************
	 * METHOD: main
	 *
	 * This method is the driver for the app versioning process. It reads
	 * in the chm.html file and writes out a chmTemp.html version of that
	 * file.
	 ******************************************************************/
    public static void main(String[] args) {
		System.out.println("BEGIN NGCHM_AppVersioner  " + new Date());
        try {
   		if (args.length < 1) {
    			System.out.println("Usage: NGCHM_AppVersioner <web directory>");
    			System.exit(1);
    		}
   			File compatMgr = new File(args[0] + "/" + "javascript/CompatibilityManager.js");
			String version = getVersion(compatMgr);
    		BufferedReader br = new BufferedReader(new FileReader(args[0] + "chm.html" ));
    		BufferedWriter bw = new BufferedWriter(new FileWriter(args[0] + "chmTemp.html" ));
     		
    		String line = br.readLine(); 
     		while (line != null) {
    			if ((line.contains("src=\"javascript")) || (line.contains("<link rel=\"stylesheet"))) {
    				int qmLoc = line.indexOf("?");
    				int closeLoc = line.indexOf(">");
    				String firstHalf = line.substring(0,qmLoc);
       				String lastHalf = line.substring(closeLoc-1,line.length());
   				String newLine = firstHalf + "?v=" + version + lastHalf;
    				bw.write(newLine+"\n");
    			} else {
    				bw.write(line+"\n");
    			}
    			line = br.readLine();
    		} 	
    		bw.close();
    		br.close();
    		System.out.println("END NGCHM_AppVersioner " + new Date());
		
        } catch (Exception e) {
            // TODO Auto-generated catch block
            e.printStackTrace();
        } 

	}

}
