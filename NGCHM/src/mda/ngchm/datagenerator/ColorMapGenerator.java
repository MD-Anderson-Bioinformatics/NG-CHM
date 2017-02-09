/*******************************************************************
 * CLASS: ColorMapGenerator
 *
 * This class generates color maps for matrices and for classfication
 * bars. 
 * 
 * Author: Mike Ryan
 * Date: December 2015
 ******************************************************************/
package mda.ngchm.datagenerator;

import static mda.ngchm.datagenerator.ImportConstants.*;

import java.awt.Color;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.util.ArrayList;
import org.json.simple.JSONObject;
import org.json.simple.JSONArray;

public class ColorMapGenerator {
    public static final String[] defaultColors = {"#1f77b4", "#aec7e8", "#ff7f0e", "#ffbb78", "#2ca02c", "#98df8a", "#d62728", "#ff9896", "#9467bd", "#c5b0d5", "#8c564b", "#c49c94", "#e377c2", "#f7b6d2", "#7f7f7f", "#c7c7c7", "#bcbd22", "#dbdb8d", "#17becf", "#9edae5"};
    public static final String[] blueWhiteRed = {"#0000FF","#FFFFFF","#FF0000"};

	/*******************************************************************
	 * METHOD: getJsonColors
	 *
	 * This method takes a JSON object containing a color map and 
	 * returns a colorMap object.
	 ******************************************************************/
    public static ColorMap getJsonColors(JSONObject jocm, ColorMap cm) {
		String colorType = (String) jocm.get(COLORMAP_TYPE);
		if (colorType != null) {
			cm.type = colorType.trim();
		} else {
			cm.type = COLORTYPE_LINEAR;
		}
		JSONArray colors = (JSONArray) jocm.get(COLORMAP_COLORS);
        for (int i=0; i < colors.size();i++) {
       		String joc = (String) colors.get(i);
       		if (!joc.startsWith("#")) {
       			joc = hexForColor(joc);
       		} 
       		cm.colors.add(Color.decode(joc));
        }
		JSONArray breaks = (JSONArray) jocm.get(COLORMAP_THRESHOLDS);
        for (int i=0; i < breaks.size();i++) {
        	Object obj = breaks.get(i);
       		cm.breaks.add(obj.toString());
        }
        String missingColor = (String) jocm.get(COLORMAP_MISSING);
        if (missingColor != null) {
       		if (!missingColor.startsWith("#")) {
       			missingColor = hexForColor(missingColor);
       		}
        	cm.missingColor = Color.decode(missingColor);
        } else {
        	cm.missingColor = Color.decode("#000000");
        }
        if (cm.type.equals(COLORTYPE_CONTINUOUS)) {
        	setJsonContinuousBreaksAndColors(cm);
        }
    	return cm;
    }

	//Look up a color string and convert it to a hex rgb value. 
	public static String hexForColor(String color) {
		String hex = COLOR_BLACK;
		for (int i = 0; i < COLOR_NAME_MAP.length; i+=2) {
			String mapCol = COLOR_NAME_MAP[i].toLowerCase();
			if (mapCol.equals(color.toLowerCase())) {
				String rgb[] = COLOR_NAME_MAP[i+1].split(",");
				int r = Integer.parseInt(rgb[0]);
				int g = Integer.parseInt(rgb[1]);
				int b = Integer.parseInt(rgb[2]);
				hex = String.format("#%02x%02x%02x", r, g, b);	
				break;
			}
		}
		return hex;
	}

	/*******************************************************************
	 * METHOD: getDefaultColors
	 *
	 * Based upon the file type and color type, this method returns a 
	 * default colorMap object.
	 ******************************************************************/
    public static ColorMap getDefaultColors(String ifile, ColorMap cm){
        if (!cm.type.equals(COLORTYPE_LINEAR) && !cm.type.equals(COLORTYPE_QUANTILE) && !cm.type.equals(COLORTYPE_DISCRETE) && !cm.type.equals(COLORTYPE_CONTINUOUS))
           return null;
         
        cm.missingColor = Color.black;
        
        if (colorsSupplied(ifile)){
        	getColorSchemeCont(ifile, cm);
        } else {
        
            if (cm.type.equals(COLORTYPE_LINEAR)) {
            	ArrayList<Double> range = getDataRange(ifile);
            	cm.breaks.add(range.get(0).toString()); //min
            	cm.breaks.add(range.get(1).toString()); //mid
            	cm.breaks.add(range.get(2).toString()); //max
            	if (cm.id.equals("dl2")) {
	            	cm.colors.add(Color.green);
	            	cm.colors.add(Color.black);
	            	cm.colors.add(Color.orange);
            	} else if (cm.id.equals("dl3")) {
	            	cm.colors.add(Color.yellow);
	            	cm.colors.add(Color.white);
	            	cm.colors.add(Color.blue);
            	} else {
	            	cm.colors.add(Color.blue);
	            	cm.colors.add(Color.white);
	            	cm.colors.add(Color.red);
            	}
            } else if (cm.type.equals(COLORTYPE_QUANTILE)) {
            	cm.breaks.add("0.25");
            	cm.breaks.add("0.50");
            	cm.breaks.add("0.75");
            	cm.colors.add(Color.blue);
            	cm.colors.add(Color.white);
            	cm.colors.add(Color.red);
            } else if (cm.type.equals(COLORTYPE_CONTINUOUS)) {
            	ArrayList<Double> range = getMinMax(ifile);
            	cm.breaks.add(range.get(0).toString());
            	cm.breaks.add(range.get(2).toString());
            	cm.colors.add(Color.white);
            	cm.colors.add(Color.red);
            	setDefaultContinuousBreaksAndColors(cm, range);
            } else if (cm.type.equals(COLORTYPE_DISCRETE)) {           
        	ArrayList<String> categories = getCategories(ifile);
        	int i = 0;
        	for (String cat : categories) {
        		cm.breaks.add(cat);
        		if (i < defaultColors.length -1)
        			cm.colors.add(Color.decode(defaultColors[i]));
        		else
        			//whoops - ran out of colors - just use the last one.
        			cm.colors.add(Color.decode(defaultColors[defaultColors.length-1]));
        		i++;        
        	}
        }
        }
        return cm;
    }
    
	private static void setDefaultContinuousBreaksAndColors(ColorMap cm, ArrayList<Double> range) {
		Double bottomBreak = range.get(0);
		Double topBreak = range.get(2);
		Color bottomColor = cm.colors.get(0);
		Color topColor = cm.colors.get(1);
		Double keySize = (topBreak - bottomBreak) / 8;
    	cm.contBreaks.add(bottomBreak.toString());
    	cm.contColors.add(bottomColor);
       	for (int i = 1; i <= 7; i++){
      		Double nextBreak = bottomBreak+(keySize*i);
    		Double ratio = ((nextBreak - bottomBreak) / (topBreak - bottomBreak));
            float fRatio = ratio.floatValue();
      		Color breakColor = blendColors(bottomColor, topColor, fRatio);
        	cm.contBreaks.add(nextBreak.toString());
        	cm.contColors.add(breakColor);
       	}
    	cm.contBreaks.add(topBreak.toString());
    	cm.contColors.add(topColor);
	}
	
	private static void setJsonContinuousBreaksAndColors(ColorMap cm) {
		Float bottomBreak = new Float(cm.breaks.get(0));
		Float topBreak = new Float(cm.breaks.get(cm.breaks.size()-1));
		Float keySize = (topBreak - bottomBreak) / 8;
    	cm.contBreaks.add(bottomBreak.toString());
    	cm.contColors.add(cm.colors.get(0));
       	for (int i = 1; i <= 7; i++){
      		float nextBreak = bottomBreak+(keySize*i);
            int j = 0;
            // find the breakpoints that this value is between
            while (Float.parseFloat(cm.breaks.get(j)) <= nextBreak && j < cm.breaks.size()-1){
            	j++;
            };
            Color lowCol = cm.colors.get(j-1);
            Color hiCol = cm.colors.get(j);
            float low = Float.parseFloat(cm.breaks.get(j-1));
            float hi = Float.parseFloat(cm.breaks.get(j));
            float ratio = (hi-nextBreak)/(hi-low);
            Color breakColor = ColorMapGenerator.blendColors(hiCol,lowCol,ratio);
        	cm.contBreaks.add(String.valueOf(nextBreak));
        	cm.contColors.add(breakColor);
       	}
    	cm.contBreaks.add(topBreak.toString());
    	cm.contColors.add(cm.colors.get(cm.colors.size()-1));
	}
	
	/*******************************************************************
	 * METHOD: blendColors
	 *
	 * This method takes two colors and blends them according to the ratio.
	 * It is used during the generation of PNG files for the thumbnail
	 * view and the heat map PDF.
	 ******************************************************************/
	public static Color blendColors( Color c1, Color c2, float ratio ) {
	    if ( ratio > 1f ) ratio = 1f;
	    else if ( ratio < 0f ) ratio = 0f;
	    float iRatio = 1.0f - ratio;

	    int i1 = c1.getRGB();
	    int i2 = c2.getRGB();
	    int r1 = ((i1 & 0xff0000) >> 16);
	    int g1 = ((i1 & 0xff00) >> 8);
	    int b1 = (i1 & 0xff);
	    int r2 = ((i2 & 0xff0000) >> 16);
	    int g2 = ((i2 & 0xff00) >> 8);
	    int b2 = (i2 & 0xff);
	    int r = (int)((r1 * iRatio) + (r2 * ratio));
	    int g = (int)((g1 * iRatio) + (g2 * ratio));
	    int b = (int)((b1 * iRatio) + (b2 * ratio));

	    return new Color( r << 16 | g << 8 | b );
	}

	/*******************************************************************
	 * METHOD: getMinMax
	 *
	 * Get the min, mid, and max values. Used for classification files 
	 * with continuous data.
	 ******************************************************************/
	private static ArrayList<Double> getMinMax(String classificationFile) {
		Double min = Double.MAX_VALUE;
		Double mid = 0.0;
		Double max = Double.MIN_VALUE;
        try {
            BufferedReader read = new BufferedReader(new FileReader(new File(classificationFile)));
            String line = read.readLine();
            while (line != null) {
                line = line.trim();
                String[] toks = line.split(TAB);
                if (toks.length > 1) {
                	Double value = null;
                	try {value = Double.parseDouble(toks[1]);} catch (NumberFormatException nex) {/*ignore*/}
                	if ((value != null) && (value < min))
                		min = value;
                	if ((value != null) && (value > max))
                		max = value;
                }  
                line = read.readLine();
            }
            read.close();
            mid = (min + max) / 2;
         } catch (Exception e) {
             System.out.println("Error reading classification bar file ");
             e.printStackTrace();
         }
		 ArrayList<Double> result = new ArrayList<Double>();
		 result.add(min);
		 result.add(mid);
		 result.add(max);
		 return (result);
	}
	
	/*******************************************************************
	 * METHOD: getDataRange
	 *
	 * Get range of data in a data matrix.  Used for linear color maps.
	 ******************************************************************/
	private static ArrayList<Double> getDataRange(String dataFile) {
		Double min = Double.MAX_VALUE;
		Double mid = 0.0;
		Double max = Double.MIN_VALUE;
        try {
            BufferedReader read = new BufferedReader(new FileReader(new File(dataFile)));
            String line = read.readLine();
            line = read.readLine(); //Skip column headers.
            while (line != null) {
                line = line.trim();
                String[] toks = line.split(TAB);
                for (int i = 1; i < toks.length; i++) {
                 	Double value = null;
                	try {value = Double.parseDouble(toks[i]);} catch (NumberFormatException nex) {/*ignore*/}
                	if ((value != null) && (value < min))
                		min = value;
                	if ((value != null) && (value > max))
                		max = value;
                }  
                line = read.readLine();
            }
            read.close();
            if (min < 0 && max > 0)
            	mid = 0.0;
            else
            	mid = (min + max) / 2;
         } catch (Exception e) {
             System.out.println("Error reading classification bar file ");
             e.printStackTrace();
         }
		 ArrayList<Double> result = new ArrayList<Double>();
		 result.add(min);
		 result.add(mid);
		 result.add(max);
		 return (result);
	}

	/*******************************************************************
	 * METHOD: getCategories
	 *
	 * This method goes through the classification file and build a list 
	 * of the unique classification values (e.g. 'Smoker', 'Non-smoker').  
	 * Ignore N/A, NA, and None.
	 ******************************************************************/
    private static ArrayList<String> getCategories(String classificationFileWFullPath) {
         ArrayList<String> cats = new ArrayList<>();
         try {
            BufferedReader read = new BufferedReader(new FileReader(new File(classificationFileWFullPath)));
            String line = read.readLine();
            while (line != null) {
                line = line.trim();
                String[] toks = line.split(TAB);
                if ((toks.length > 1) && !cats.contains(toks[1])) {
                    if (!toks[1].equalsIgnoreCase(NONE) && 
                        !toks[1].equalsIgnoreCase(NA) &&
                        !toks[1].equalsIgnoreCase(NA) ) {
                       cats.add(toks[1]);
                    }
                }  
                line = read.readLine();
            }
            read.close();
         } catch (Exception e) {
             System.out.println("Error reading classification bar file ");
             e.printStackTrace();
         }
         return cats;
     }
    
	/*******************************************************************
	 * METHOD: colorsSupplied
	 *
	 * This method processes user submitted colors for a classification 
	 * file IF they are present in the incoming JSON.  
	 ******************************************************************/
    private static boolean colorsSupplied(String classificationFile) {
         boolean supplied = false;

         try {
            BufferedReader read = new BufferedReader(new FileReader(new File(classificationFile)));
            String line = read.readLine().toLowerCase();
            int i = 0;
            while (line != null && i < 3 ) {
                line = line.trim();
                if (line.contains("<color-scheme>")){
                	supplied = true;
                    break;
                }
                line = read.readLine().toLowerCase();
                i++;
            }
            read.close();
         } catch (Exception e) {
             System.out.println("Error reading classification bar file ");
             e.printStackTrace();
         }
         return supplied;
     }
    
    /** Not Used for now.
    private static ArrayList<String> findMissingCats(BobColormapBreaks[] colorScheme, ArrayList<String> categories, int catsFound) {
         ArrayList<String> missingCats = categories;
         for (int i = 0; i < catsFound; i++){
             if (missingCats.contains(colorScheme[i].breakpoint)){
                 missingCats.remove(colorScheme[i].breakpoint);
             }
         }
         return missingCats;
     }
     **/
    
	/*******************************************************************
	 * METHOD: getColorSchemeCont
	 *
	 * This method gets the color map from a submitted file.  
	 ******************************************************************/
    private static void getColorSchemeCont(String classColorDefFile, ColorMap cm ) {
         boolean startRead = false;
         try {
            BufferedReader read = new BufferedReader(new FileReader(new File(classColorDefFile)));
            String line = read.readLine();
            for (int i = 0; i < 50; i++ ) {
                line = line.trim();
                if (!startRead){
                    if (line.toLowerCase().contains("<color-scheme>")){
                        startRead = true;
                    }
                } else{
                    if (line.toLowerCase().contains("</color-scheme>")){
                        break;
                    } else {
                        String[] toks = line.split(TAB);
                        cm.breaks.add(toks[0]);
                        cm.colors.add(Color.decode(toks[1]));
                    }
                }
                line = read.readLine();
            }
            read.close();
         } catch (Exception e) {
             System.out.println("Error reading classification color bar file ");
             e.printStackTrace();
         }
     }
    
	/*******************************************************************
	 * METHOD: main
	 *
	 * Main method used for testing only.  
	 ******************************************************************/
    public static void main(String[] args) {
        //ColorMap cm = getDefaultColors("Type", "C:\\NGCHMProto\\400x400\\Type_RowClassification.txt", "discrete");
    	ColorMap cm = new ColorMap();
        getDefaultColors("C:\\NGCHMProto\\400x400\\400x400.txt", cm);
        System.out.println(cm.asJSON());
    }  
}
