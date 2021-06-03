/*******************************************************************
 * SERVLET CLASS: GetSoftwareVersion
 *
 * This class contains the logic necessary to retrive the software
 * version number from the CompatibilityManager.js file and return
 * that value to the caller.  It is currently not called by the
 * NG-CHM project but may be called by other MDA source systems.
 * 
 * Author: Mark Stucky
 * Date: 2016
 ******************************************************************/
package mda.ngchm.servlet;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * Servlet implementation class GetTileStructure
 */
@WebServlet("/GetSoftwareVersion")
public class GetSoftwareVersion extends HttpServlet {
	private static final long serialVersionUID = 1L;
       
    /**
     * @see HttpServlet#HttpServlet()
     */
    public GetSoftwareVersion() {
        super();
    }

	public static String getVersion(File compatibilityJS) throws FileNotFoundException, IOException {
	    String currentVersion = null;
   		BufferedReader br = new BufferedReader(new FileReader(compatibilityJS));
	    String sCurrentLine;
		while((sCurrentLine = br.readLine()) != null) {
			if (sCurrentLine.contains("NgChm.CM.version")) {
				String vals[] = sCurrentLine.split("\"");
				currentVersion = vals[1];
			}
		}	
	    br.close();
	    return currentVersion;

	}
    
    /**
	 * @see HttpServlet#doGet(HttpServletRequest request, HttpServletResponse response)
	 */
	protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    	//Set the MIME type of the response stream
    	response.setContentType("text/plain");
        response.addHeader("Access-Control-Allow-Origin", "*");
   		File compatibilityJS =  new File(getServletContext().getRealPath("/")+"javascript/CompatibilityManager.js");
		String version = getVersion(compatibilityJS);
    	response.getWriter().write(version);
    	response.flushBuffer();
	}

	/**
	 * @see HttpServlet#doPost(HttpServletRequest request, HttpServletResponse response)
	 */
	protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		doGet(request, response);
	}

}
