/*******************************************************************
 * SERVLET CLASS: ZipAppDownload
 *
 * This class contains the logic necessary to return the stand-alone
 * NG-CHM Viewer to the client when the user requests a download.  It 
 * is called on the client side from the MatrixManager JS file.
 * 
 * Author: Mark Stucky
 * Date: 2016
 ******************************************************************/
package mda.ngchm.servlet;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.io.PrintWriter;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * Servlet implementation class ZipAppDownload
 */
@WebServlet("/ZipAppDownload")
public class ZipAppDownload extends HttpServlet {
	private static final long serialVersionUID = 1L;
	
	/*******************************************************************
	 * METHOD: processRequest
	 *
	 * This method processes the POST request sent to the servlet.  Map
	 * name (used for file location purposes) and heat map configuration
	 * data are retrieved from the request.  Using this information,
	 * logic is called to zip up the contents of the heatmap directory, 
	 * while replacing the contents of mapConfig.JSON with the passed-in
	 * configuration data.
	 ******************************************************************/
	protected void processRequest(HttpServletRequest request, HttpServletResponse response) {
    	try {
    		File configDir =  new File(getServletContext().getRealPath("/"));
            response.addHeader("Content-Disposition", "attachment; filename=ngChmApp.html");
    		PrintWriter out = response.getWriter();
    		//Read in and load NG-CHM File Viewer HTML file into bufferedReader
    		BufferedReader br = new BufferedReader(new FileReader(configDir+"/ngChmApp.html"));
			String jsLine = br.readLine();
			while (jsLine != null) {
				out.println(jsLine+"\n");
				jsLine = br.readLine();
			}
    		br.close();
       } catch (Exception e) {
         System.out.println("Servlet Error: ZipAppDownload failed to generate ngChmApp.html: " + e.getMessage());
        }
		return;
	}
       
	/**
	 * @see HttpServlet#doGet(HttpServletRequest request, HttpServletResponse response)
	 */
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		doPost(request, response);
    } 
    
	/**
	 * @see HttpServlet#doPost(HttpServletRequest request, HttpServletResponse response)
	 */
	protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException { 
        processRequest(request, response);
	}

}



