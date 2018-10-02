package mda.ngchm.servlet;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import javax.servlet.ServletException;
import javax.servlet.ServletOutputStream;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * Servlet implementation class GetMatrix
 */
@WebServlet("/GetTile")
public class GetTile extends HttpServlet {
	private static final long serialVersionUID = 1L;
	private static final String mapLocation = "/NGCHMProto";
       
	/**
	 * @see HttpServlet#doGet(HttpServletRequest request, HttpServletResponse response)
	 */
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    	//Set the MIME type of the response stream
    	response.setContentType("application/binary");

    	//serve a fixed file, located in the root folder of this web app 
    	ServletOutputStream output = response.getOutputStream();
    	String map = request.getParameter("map");
    	String datalayer = request.getParameter("datalayer");
    	String level = request.getParameter("level");
    	String tile = request.getParameter("tile");
    	String tileFile = mapLocation + File.separator + map + File.separator + datalayer + File.separator + level + File.separator +tile+".tile";
    	if (!new File(tileFile).exists()) {
    		tileFile = mapLocation + File.separator + map + File.separator + datalayer + File.separator + level + File.separator +tile+".bin";
    	}
   	    InputStream input = new FileInputStream(tileFile);
    	//transfer input stream to output stream, via a buffer
    	byte[] buffer = new byte[65535];
    	int bytesRead;    
    	while ((bytesRead = input.read(buffer)) != -1) {
    		output.write(buffer, 0, bytesRead);
    	}
    	input.close();
    	response.flushBuffer();
    }

	/**
	 * @see HttpServlet#doPost(HttpServletRequest request, HttpServletResponse response)
	 */
	protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		doGet(request, response);
	}

}
