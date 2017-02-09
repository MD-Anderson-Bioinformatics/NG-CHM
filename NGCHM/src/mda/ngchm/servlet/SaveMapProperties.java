package mda.ngchm.servlet;

import java.io.BufferedReader;
import java.io.DataOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.IOException;
import java.io.OutputStreamWriter;

import javax.servlet.ServletException;
import javax.servlet.ServletOutputStream;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;

/**
 * Servlet implementation class GetMatrix
 */
@WebServlet("/SaveMapProperties")
public class SaveMapProperties extends HttpServlet {
	private static final long serialVersionUID = 1L;
	private static final String mapLocation = "/NGCHMProto";
	
	/*******************************************************************
	 * METHOD: updateMapConfig
	 *
	 * This method replaces the contents of the specified colormaps.json
	 * file with the JSON data passed in in the request payload.
	 ******************************************************************/
	protected boolean updateMapConfig(String map, JSONObject config) {
		boolean success = true;
		try {
	    	String configFile = mapLocation + File.separator + map + File.separator + "mapConfig.json";
	    	if (!isReadOnly(configFile)) {
				DataOutputStream writer = new DataOutputStream(new FileOutputStream(configFile));
				OutputStreamWriter fw = new OutputStreamWriter(writer, "utf-8");
				fw.write(config.toString());
				fw.close();
	    	} else {
	    		success = false;
	    	}
		} catch (Exception e) {
			success = false;
		}
		return success;
	}
	
	/*******************************************************************
	 * METHOD: isReadOnly
	 *
	 * This method checks the original config file to ensure that the 
	 * map was not readOnly at the time  
	 ******************************************************************/
	protected boolean isReadOnly(String config) {
		boolean isReadOnly = false;
        JSONParser parser = new JSONParser();
		try {
		    Object obj = parser.parse(new FileReader(config));
		    JSONObject jo =  (JSONObject) obj;
		    JSONObject jo_config =  (JSONObject) jo.get("data_configuration");
		    JSONObject jo_data =  (JSONObject) jo_config.get("map_information");
            String readOnlyValue = (String) jo_data.get("read_only");
            if (readOnlyValue.equals("Y")) {
            	isReadOnly = true;
            }
		} catch (Exception e) {
			//Error
		}
	    return isReadOnly;
	}
	
	/*******************************************************************
	 * METHOD: processRequest
	 *
	 * This method processes the POST request sent to the servlet.  Map
	 * name (used for file location purposes) and Property Type (the
	 * type of properties JSON being processed) are retrieved from the 
	 * request.  The payload, containing JSON data, is then retrieved.
	 * Using the Property Type, the appropriate update method is called. 
	 ******************************************************************/
	protected Boolean processRequest(HttpServletRequest request, HttpServletResponse response) {
		// Retrieve parameters from request
    	String mapName = request.getParameter("map");
        Boolean success = false;
        try {
        	// Retrieve JSON data payload
        	StringBuilder buffer = new StringBuilder();
            BufferedReader reader = request.getReader();
            String line;
            while ((line = reader.readLine()) != null) {
                buffer.append(line);
            }
            String data = buffer.toString();
            // Parse payload into JSON Object
            JSONParser parser = new JSONParser();
            JSONObject jsonObject  = (JSONObject) parser.parse(data);
    		success = updateMapConfig(mapName, jsonObject);
        } catch (Exception e) {
        	success = false;
        }
		return success;
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
    	//Set the MIME type of the response stream
    	response.setContentType("application/binary");
    	//serve a fixed file, located in the root folder of this web app 
    	ServletOutputStream output = response.getOutputStream();
    	Boolean success = processRequest(request, response);
    	output.write(success.toString().getBytes("UTF-8"));
    	response.flushBuffer();
	}

}
