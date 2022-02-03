# NG-CHM PROJECT UTILITY ANT SCRIPT FUNCTIONALITY
There are 4 utility ANT scripts that create ancillary products from the NG-CHM Project.  Each of these scripts have all of the arguments required provided within the script.  So they need only be executed to produce the intended output:

1.	`build_galaxymapgen.xml`:  This script creates the `GalaxyMapGen.jar`.  This jar is to be copied to the top-level directory (`NG-CHM_Galaxy`) in the NG-CHM Galaxy project.  The JAR provides HeatmapDataGenerator functionality to the Galaxy NG-CHM interface.
2.	`build_mapgen.xml`:  This script creates the `MapGen.jar`.  This jar is to be copied to the top-level directory (`./Web Content/WEB-INF/lib/`) in the NG-CHM GUI Builder project.  The JAR provides HeatmapDataGenerator functionality to the NG-CHM GUI Builder application.
3.	`build_shaidyRmapgen.xml`:  This script creates the `ShaidyRMapGen.jar`.  This jar is to be copied to the Shaidy project.  The JAR provides a HeatmapDataGenerator interface to Shaidy, converting chm.json Shaidy input to heatmapProperties.json and executing the HeatmapDataGenerator.
4.	`build_ngchmApp.xml`:  This multi-part script creates :
  -  the stand-alone NG-CHM Viewer (`ngChmApp.html`),
  -  the server NG-CHM Viewer, and
  -  the NG-CHM Widget (`ngchmWidget-min.js`) for embedding NG-CHM Viewer functionality into other applications (e.g. Galaxy and the NG-CHM Builder).

 The widget may be copied to the NG-CHM GUI Builder project directory (`./Web Content/javascript`) and the NG-CHM Galaxy project directory (`.mda_heatmap_viz/static/javascript`).
 
 The NG-CHM stand-alone Viewer html file may be copied to the NG-CHM GUI Builder project directory (`./Web Content`) and the NG-CHM Galaxy project directory (`.mda_heatmap_viz/static`).  However, first the html file must be zipped into a zip file titled (`ngChmApp.zip`).
 
 The script contains targets for creating just one output or all three outputs at the same time.  Typically, it is executed to create all three when the contents of the NG-CHM Viewer project are ready to be released and ported to the other projects.

