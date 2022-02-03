# NG-CHM PROJECT VERSIONING
The purpose of this document is to lay out the steps required to change the version in each of the 3 NG-CHM projects (NG-CHM Viewer, NG-CHM GUI Builder, NG-CHM Galaxy).

## NG-CHM Viewer
The version number for the NG-CHM viewer is stored in the Javascript file `CompatibilityManager.js`.

To update:

1. Edit the `CompatibilityManager.js` file to change the value of the variable `NgChm.CM.version` to the intended version number.
2. Commit the changes, via pull request, to the NG-CHM project master branch.
3. Tag the release when merged.
4. Run the ANT script `build_ngchmApp.xml` to build the widget, standalone app, and server app for deployment.

## NG-CHM GUI Builder
The version number for the NG-CHM builder is stored in the JAVA file `HeatmapPropertiesManager.java`.

To update:

1. First and foremost, ensure that you have the latest version of the NG-CHM Viewer included in the builder project.  This includes the NG-CHM widget JS (`ngchmWidget-min.js`) and the stand-alone Viewer (`ngChmApp.html`).  These are created by the ANT script `build_ngchmApp.xml` in the NGCHM project.  Please see the document `NG_CHM - Utility ANT scripts` for information on creating and copying these files to the Builder project. 
2. Update the `builder_version` variable in the Heatmap class near the top of the JAVA file `HeatmapPropertiesManager.java`.
3. Verify the versions of the Viewer, stand-alone, and Builder by creating a sample heat map in the Builder.  Go to the last screen and review the Viewer Version and Builder Version in the preferences panel for the map.  Download the stand-alone viewer from this page and check the version in the application.
4. Commit the changes to the NG-CHM GUI Builder project master branch.
5. Tag release when ready. 

## NG-CHM Galaxy
The version number for the NG-CHM Galaxy interface is partially set in the NG-CHM project in the JAVA file `GalaxyMapGen.java`.

To update:

1. As with the Builder one of the first steps would be to ensure that (if you intend it) you have the latest version of the NG-CHM Viewer included in the NG-CHM Galaxy project.  This includes the NG-CHM widget JS (`ngchmWidget-min.js`) and the stand-alone Viewer (`ngChmApp.zip`).  These are created by the ANT script `build_ngchmApp.xml` in the NG-CHM project.  Please see the document `NG_CHM - Utility ANT scripts` for information on creating and copying these files to the Galaxy project. 
2. Update the `BUILDER_VERSION` variable in the Heatmap class near the top of the JAVA file `GalaxyMapGen.java`.
3. In order to port the version to the NG-CHM Galaxy project, you will need to create the `GalaxyMapGen.jar`.  This is done by executing the ANT script `build_galaxymapgen.xml` in the NG-CHM project.  Once created, the `GalaxyMapGen.jar` must be copied to the top level directory in the NG-CHM Galaxy project.
4. Within the NG-CHM Galaxy project there are 2 other places where the version number must be set.  These are for the galaxy data entry screens and not the viewer portion of the Galaxy implementation.  The version number appears on the second line of the files `mda_heatmap_gen.xml` and `mda_advanced_heatmap_gen.xml` (found in directories with the same name in the NG-CHM Galaxy project).
5. Commit the changes to the NG-CHM Galaxy project master branch.
6. Tag release when ready.
