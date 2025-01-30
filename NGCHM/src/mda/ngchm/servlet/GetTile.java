/*******************************************************************
 * SERVLET CLASS: GetTile
 *
 * This class contains the logic necessary to retrieve binary data tile
 * files for a given heat map from the server. It is called on the client
 * side from the MatrixManager JS file.
 *
 * Argument1: map - Name of the heat map on the server
 * Argument2: data layer - The data layer (dl1,dl2,etc...) being requested,.
 * Argument3: data level - The data layer (s,d,rh,rv,tn) being requested,.
 * Argument2: tile name - tile file name being requested.
 *
 * Author: Mark Stucky
 * Date: 2016
 ******************************************************************/
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
  protected void doGet(HttpServletRequest request, HttpServletResponse response)
    throws ServletException, IOException {
    //Set the MIME type of the response stream
    response.setContentType("application/binary");

    //serve a fixed file, located in the root folder of this web app
    ServletOutputStream output = response.getOutputStream();
    String map = request.getParameter("map");
    String datalayer = request.getParameter("datalayer");
    String level = request.getParameter("level");
    String tile = request.getParameter("tile");
    String tileFile =
      mapLocation +
      File.separator +
      map +
      File.separator +
      datalayer +
      File.separator +
      level +
      File.separator +
      tile +
      ".tile";
    if (!new File(tileFile).exists()) {
      tileFile =
        mapLocation +
        File.separator +
        map +
        File.separator +
        datalayer +
        File.separator +
        level +
        File.separator +
        tile +
        ".bin";
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
  protected void doPost(HttpServletRequest request, HttpServletResponse response)
    throws ServletException, IOException {
    doGet(request, response);
  }
}
