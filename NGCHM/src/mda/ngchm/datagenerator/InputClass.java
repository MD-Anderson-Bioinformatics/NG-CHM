/*******************************************************************
 * CLASS: InputClass
 *
 * This class instantiates an InputClass object for a given classification
 * data file.  It is called when the heatmapProperties.json file
 * is parsed by the ImportData class for each incoming classification file. 
 * An object is created and a colormap is created for the classification file.
 * 
 * Author: Mark Stucky
 * Date: March 29, 2016
 ******************************************************************/
package mda.ngchm.datagenerator;

import org.json.simple.JSONObject;

import static mda.ngchm.datagenerator.ImportConstants.*;

public class InputClass {
	public String name;
	public String file;
	public String height;
	public String position;
	public String show = YES;
	public ColorMap map;

	public InputClass(JSONObject jo, String id, String pos) {
		name = (String) jo.get(NAME);
		file = (String) jo.get(PATH);
		if ((String) jo.get(SHOW) != null) {
			show = (String) jo.get(SHOW);
		}
   		String barheight = (String) jo.get(HEIGHT);
   		if (barheight != null) {
   			height = barheight;
   		} else {
   			height = DEFAULT_HEIGHT;
   		}
		position = pos.trim();
   		JSONObject jocm = (JSONObject) jo.get(COLORMAP);
		ColorMap cMap = new ColorMap();
		cMap.id = id;
		cMap.type = (String) jocm.get(COLORMAP_TYPE);
		if (jocm.get("colors") != null) {
			map = ColorMapGenerator.getJsonColors(jocm, cMap);
		} else {
			map = ColorMapGenerator.getDefaultColors(file,cMap);
		}
	}
	
	
	/*******************************************************************
	 * Getters AND Setters
	 ******************************************************************/
	public String getName() {
		return name;
	}

	public String getFile() {
		return file;
	}

	public String getPosition() {
		return position;
	}

	public String getHeight() {
		return height;
	}

	public ColorMap getMap() {
		return map;
	}


}
