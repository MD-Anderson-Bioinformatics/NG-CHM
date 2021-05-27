/*******************************************************************
 * SERVLET CLASS: GetDescriptor
 *
 * This class contains the logic necessary to retrieve the two main
 * configuration files (mapConfig.json and mapData.json) for a given
 * heat map from the server and return them to the client as JSON
 * output. It is called on the client  * side from the MatrixManager 
 * JS file.
 * 
 * Argument1: map - Name of the heat map on the server
 * Argument2: type - Type of file (mapConfig or mapData) being requested.
 * 
 * Author: Mark Stucky
 * Date: 2016
 ******************************************************************/
package mda.ngchm.servlet;

import java.io.BufferedReader;
import java.io.File;
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
@WebServlet("/GetDescriptor")
public class GetDescriptor extends HttpServlet {
	private static final long serialVersionUID = 1L;
	private static final String mapLocation = "/NGCHMProto";
       
    /**
     * @see HttpServlet#HttpServlet()
     */
    public GetDescriptor() {
        super();
    }

	/**
	 * @see HttpServlet#doGet(HttpServletRequest request, HttpServletResponse response)
	 */
	protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    	//Set the MIME type of the response stream
    	response.setContentType("application/json");

    	//serve a fixed file, located in the root folder of this web app 
    	String map = request.getParameter("map");
    	String type = request.getParameter("type");
    	String tileFile = mapLocation + File.separator + map + File.separator + type + ".json";
    	BufferedReader br = new BufferedReader(new FileReader(tileFile));
    	StringBuffer tileStructureJSON = new StringBuffer();
    	String line = br.readLine();
    	while (line != null) {
    		tileStructureJSON.append(line);
    		line = br.readLine();
    	}
    	br.close();
    	response.getWriter().write(tileStructureJSON.toString());
    	response.flushBuffer();
	}

	/**
	 * @see HttpServlet#doPost(HttpServletRequest request, HttpServletResponse response)
	 */
	protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		doGet(request, response);
	}

}
