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

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.BufferedReader;
import java.io.FileReader;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

public class InputClass {
	public String name;
	public String file;
	public String barType = COLOR_PLOT;
	public String fgColor = COLOR_BLACK;
	public String bgColor = COLOR_WHITE;
	public String lowBound = "0";
	public String highBound = "100";
	public String dataType = null;
	public String height;
	public String position;
	public String show = YES;
	public ColorMap map;
	public String[] orderedClass;
	public BufferedImage classImage;
	public BufferedImage classLegend;
	public int[][] classMatrix;
	public int valueCol = 1;
	public int classPos = 1;
	private boolean isMatrixClass = false;
	public int[] cutLocations = null;

	public InputClass(JSONObject jo, String pos, RowColData rcData, int classCtr, InputFile iFile) throws Exception {
		try {
			String[] classArray = rcData.classArray;
			name = (String) jo.get(NAME);
			file = (String) jo.get(PATH);
			position = pos.trim();
			if (file.equals("matrix")) {
				isMatrixClass = true;
			}
			classPos = classCtr;
			String id = COL_CLASS+classCtr;
			if (position.equals(ROW)) {
				id = ROW_CLASS+classCtr;
			}	
			if ((String) jo.get(VALUE_COL) != null) {
				valueCol = (int) Integer.parseInt((String) jo.get(VALUE_COL));
				valueCol--;
			}
			if ((String) jo.get(CLASS_BAR_TYPE) != null) {
				barType = (String) jo.get(CLASS_BAR_TYPE);
			}
			if ((String) jo.get(CLASS_FG_COLOR) != null) {
				String sFgColor = (String) jo.get(CLASS_FG_COLOR);
		   		if (!sFgColor.startsWith("#")) {
		   			sFgColor = ColorMapGenerator.hexForColor(sFgColor);
		   		} 
		   		fgColor = sFgColor;
			}
			if ((String) jo.get(CLASS_BG_COLOR) != null) {
				String sBgColor = (String) jo.get(CLASS_BG_COLOR);
		   		if (!sBgColor.startsWith("#")) {
		   			sBgColor = ColorMapGenerator.hexForColor(sBgColor);
		   		} 
		   		bgColor = sBgColor;
			}
			boolean lowFound = false;
			if ((String) jo.get(CLASS_LOW_BOUND) != null) {
				lowFound = true;
				lowBound = (String) jo.get(CLASS_LOW_BOUND);
			}
			boolean highFound = false;
			if ((String) jo.get(CLASS_HIGH_BOUND) != null) {
				highFound = true;
				highBound = (String) jo.get(CLASS_HIGH_BOUND);
			} 
			if ((String) jo.get(SHOW) != null) {
				show = (String) jo.get(SHOW);
			}
	   		String barheight = (String) jo.get(HEIGHT);
	   		if (barheight != null) {
	   			height = barheight;
	   		} else {
	   			height = DEFAULT_HEIGHT;
	   		}
			if ((String) jo.get(DATA_TYPE) != null) {
				dataType = (String) jo.get(DATA_TYPE);
			}
			Map<String, String> origData = null;
	   		JSONObject jocm = (JSONObject) jo.get(COLORMAP);
			ColorMap cMap = new ColorMap();
			cMap.id = id;
			cMap.type = (String) jocm.get(COLORMAP_TYPE);
			if (file.equals("treecut")) {
				String treeCutStr = (String) jo.get(TREE_CUTS);
				int treeCuts = treeCutStr != null ? Integer.parseInt(treeCutStr) : 0;
				RowColData rcd = new RowColData();
				cutLocations = rcd.getTreeCutPositions(treeCuts, rcData.dendroValues);
				orderedClass = buildTreeCutClassificationFile(classArray);
			} else {
				if (isMatrixClass) {
					origData = extractClassDataFromMatrix(iFile);
				} else {
					String errMsg = MatrixValidator.validateClassificationFile(name, file, cMap.type);
					if (errMsg != null) {
						throw new Exception(errMsg);
					}
					origData = extractClassDataFromFile();
				}
				orderedClass = reOrderClassificationFile(origData, classArray);
			}
			if ((jocm != null) && (jocm.get("colors") != null)) {
				map = ColorMapGenerator.getJsonColors(jocm, cMap);
			} else {
				if (!barType.equals(COLOR_PLOT)) {
					cMap.colors.add(Color.decode(bgColor));
					cMap.colors.add(Color.decode(fgColor));
				}
		        if (ColorMapGenerator.definedClassColorsFound(file)){
		        	map = ColorMapGenerator.getDefinedClassColors(file, cMap);
		        } else {
		        	map = ColorMapGenerator.getDefaultClassColors(cMap,this);
				}
			}
			if (barType.matches("scatter_plot|bar_plot")) {
				if (!lowFound || !highFound) {
					calcLowHighBounds(lowFound, highFound);
				}
			}	
		} catch (Exception ex) {
	        throw ex;
		}
	}

	/*******************************************************************
	 * METHOD: extractClassDataFromMatrix
	 *
	 * This method pulls the label and value data for a given classification
	 * file from the matrix that the data was embedded in.
	 ******************************************************************/
	private Map<String,String> extractClassDataFromMatrix(InputFile iFile) throws Exception {
		Map<String, String> origData = new HashMap<String, String>();
		String matrix[][] = iFile.origMatrix;
		try {
			if (position.equals("row")) {
		    	String colLabels[] = matrix[0];
		    	int classPosition = 0;
		    	for (int i=1;i<iFile.rowCovs+1;i++) {
		    		if (colLabels[i].toLowerCase().equals(name.toLowerCase())) {
		    			classPosition = i;
		    			break;
		    		}
		    	}
		    	int rowStart = iFile.colCovs+1;
		    	for (int i=rowStart;i<matrix.length;i++) {
		    		String rowValues[] = matrix[i];
                   	origData.put(rowValues[0], rowValues[classPosition]);
		    	}
			} else {
		    	int classPosition = 0;
		    	for (int i=1;i<iFile.colCovs+1;i++) {
		    		String rowValues[] = matrix[i];
		    		if (rowValues[0].toLowerCase().equals(name.toLowerCase())) {
		    			classPosition = i;
		    			break;
		    		}
		    	}
		    	String colLabels[] = matrix[0];
		    	String colValues[] = matrix[classPosition];
		    	int colStart = iFile.rowCovs+1;
		    	for (int i=colStart;i<colLabels.length;i++) {
                   	origData.put(colLabels[i], colValues[i]);
		    	}
			}
    	} catch (Exception ex) { 
    		System.out.println("ERROR extracting class data from matrix for the Class: (" + name + ")  Message: " + ex.toString());
    		throw ex;
	    }
        return origData;
	}
	
	/*******************************************************************
	 * METHOD: extractClassDataFromMatrix
	 *
	 * This method pulls the label and value data for a given classification
	 * file from a file provided by along with the matrix containing these values
	 ******************************************************************/
	private Map<String,String> extractClassDataFromFile() throws Exception {
		Map<String, String> origData = new HashMap<String, String>();
        BufferedReader br = null;
        
		try {
			// Reading the data file and writing the output file
	        br = new BufferedReader(new FileReader(file));
	        String line = br.readLine(); // skip header row
            if (line.split("\t").length == 1)  {
            	line = br.readLine();
            }
	        while(line !=null) {
	              String toks[] = line.split("\t");
	              for (int i = 0; i < toks.length; i++) {
	            	  if (toks.length < valueCol+1) {
		            	  origData.put(toks[0], NA);
	            	  } else {
		            	  origData.put(toks[0], toks[valueCol]);
	            	  }
	              }      
	              line = br.readLine();
	        }
	        br.close();
    	} catch (Exception ex) { 
    		System.out.println("ERROR extracting original class file data: " + ex.toString());
    		throw ex;
    	} finally {
	    	try {
	    		br.close();
	    	} catch (Exception ex) { /* Do nothing */ }
	    }
        return origData;
	}
		
	private String[] reOrderClassificationFile(Map<String,String> origData, String[] order) throws Exception {
		String reorg[] = new String[order.length];
		try {
			boolean foundMatch = false;
			for (int row = 0; row < order.length; row++) {
	        	  String orderStr = order[row];
	        	  String classification = null;
	        	  if ((orderStr != null) && (orderStr.equals(CUT_VALUE))) {
	        		  classification = orderStr;
	        	  } else {
	        		  classification = origData.get(orderStr);
		        	  if (classification != null)  {
		        		  foundMatch = true;
		        	  }
	        	  }
	        	  // If we don't find a match and the label has hidden fields, try to 
	        	  // match without the hidden fields.
	        	  if ((classification == null) && (orderStr != null) && orderStr.contains("|")) {
	        		  orderStr = orderStr.substring(0, orderStr.indexOf('|'));
	        		  classification = origData.get(orderStr);
	        	  }
	              reorg[row] = classification;
	        }
			if (!foundMatch) {
				throw new Exception("COVARIATE INVALID: The covariate file (" + name + ") contains class labels that do not match the data matrix labels");
			}
 
    	} catch (Exception ex) { 
    		throw ex;
	    }
		return reorg;
	}
	
	private String[] buildTreeCutClassificationFile(String[] order) throws Exception {
		String reorg[] = new String[order.length];
		try {
			for (int i = 0; i < order.length; i++) {
	        	  String orderStr = order[i];
	        	  String classification = null;
	        	  if ((orderStr == null) || (orderStr.equals(CUT_VALUE))) {
	        		  classification = orderStr;
	        	  } else {
	        		  boolean found = false;
	        		  for (int j=0;j<cutLocations.length;j++) {
	        			  if (i<cutLocations[j]) {
	        				  classification = "Cluster"+(j+1);
	        				  found=true;
	        				  break;
	        			  }
	        			  if (!found) {
	        				  classification = "Cluster"+(j+2);
	        			  }
	        		  }
	        	  }
	              reorg[i] = classification;
	        }
 
    	} catch (Exception ex) { 
    		throw ex;
	    }
		return reorg;
	}

	
	/*******************************************************************
	 * METHOD: calcLowHighBounds
	 *
	 * This method calculates low and high boundaries for scatterplot and
	 * histogram class bars when values are not provided in the incoming 
	 * properties.  Low and high boundaries are calculated as the lowest
	 * and highest values in the class data provided.
	 ******************************************************************/
	private void calcLowHighBounds(boolean lowFound, boolean highFound) throws Exception  {
		float lowVal = MAX_VALUES;
	    float highVal = MIN_VALUES;
	    for (int row = 1; row < orderedClass.length; row++) {
    		if (MatrixValidator.isNumeric(orderedClass[row])) {
	        	float floatValue = Float.parseFloat(orderedClass[row]);
	        	if (floatValue > highVal) {
	        		highVal = floatValue;
	        	} else if (floatValue < lowVal) {
	        		lowVal = floatValue;
	        	}
    		}
    	}
	    if (!lowFound) {
			lowBound = String.valueOf(lowVal);
	    } 
	    if (!highFound) {
			highBound = String.valueOf(highVal);
	    } 
	}
	
	/*******************************************************************
	 * METHOD: createClassSummaryImg
	 *
	 * This method creates a bufferedImage of a given classification bar
	 * using summary level info its color map.  It is used in generating 
	 * the heat map PDF.
	 ******************************************************************/
	public void createClassSummaryImg(int size) throws Exception {
		BufferedImage image = null;
		if (!barType.equals(COLOR_PLOT)) {
			float barHeight = Float.parseFloat(height);
			generateClassMatrix(size,barHeight);
	        image = position.equals("row") ? new BufferedImage((int)barHeight, size, BufferedImage.TYPE_INT_RGB) : new BufferedImage(size, (int)barHeight, BufferedImage.TYPE_INT_RGB);
       		int fgRgb = Color.decode(fgColor).getRGB();
       		int bgRgb = Color.decode(bgColor).getRGB();
	    	for (int h = 0; h < classMatrix.length; h++) { 
	    		int[] row = classMatrix[h];
	    		for (int k = 0; k < row.length; k++) { 
	    			int posVal = row[k];
	    			//Reverse draw for column class bar
	    			int colAdj = (classMatrix.length-1)-h;
	    			if (posVal == 1) {
			        	if (position.equals("row")) {
			        		image.setRGB(h, k, fgRgb);
			        	} else {
			                image.setRGB(k, colAdj, fgRgb);
			        	}
	    			} else if (posVal == 2) {
			        	if (position.equals("row")) {
			        		image.setRGB(h, k, RGB_WHITE);
			        	} else {
			                image.setRGB(k, colAdj, RGB_WHITE);
			        	}
	    			} else {
			        	if (position.equals("row")) {
			        		image.setRGB(h, k, bgRgb);
			        	} else {
			                image.setRGB(k, colAdj, bgRgb);
			        	}
	    			}
	    		}
	    	}
		} else {
	        int sampleFactor = orderedClass.length/size;
	        image = position.equals("row") ? new BufferedImage(1, size, BufferedImage.TYPE_INT_RGB) : new BufferedImage(size, 1, BufferedImage.TYPE_INT_RGB);
 	        for (int i = 1; i < size + 1; i++) {
	        	int valPos = i*sampleFactor > orderedClass.length-1 ? orderedClass.length-1 :  i*sampleFactor;
	        	String elemValue = orderedClass[valPos];
	        	int rgb = 0;
	        	if (elemValue == null) {
                	Color cut = map.missingColor;
                	rgb = cut.getRGB();
	        	} else if (elemValue == CUT_VALUE) {
                	rgb = RGB_WHITE;
	        	} else {
		        	if (map.type.equals("continuous")) {
		        		rgb = getContinuousColor(elemValue);
		        	} else {
		        		rgb = getDiscreteColor(elemValue);
		        	}
	        	}
	        	if (position.equals("row")) {
	        		image.setRGB(0, i - 1, rgb);
	        	} else {
	                image.setRGB(i - 1, 0, rgb);
	        	}
	        }
		}
        classImage = image;
	}
	
	/*******************************************************************
	 * METHOD: generateClassMatrix
	 *
	 * This method generates a matrix for the classification bar
	 * This matrix will be used to generate classification bar
	 * image for the PDF.
	 ******************************************************************/
	public void generateClassMatrix(int length,float barHeight) throws Exception {
		int[][] matrix = new int[Integer.parseInt(height)][length];
		boolean isBarPlot = barType.equals(SCATTER_PLOT) ? false : true;
		float highVal = Float.parseFloat(highBound);
		float lowVal = Float.parseFloat(lowBound);
		highVal += 1;
		float scaleVal = highVal - lowVal;
		int normalizedK = 0;
		for (int k = 1; k <= length; k++) { 
			boolean isCut = false;
			String origStr = orderedClass[k];
			if ((NA_VALUES.contains(orderedClass[k])) || (CUT_VALUE.contains(origStr))) {
				isCut = true;
				origStr = "0";
			}
			float origVal = Float.parseFloat(origStr);
			//For when the range is exclusive: Set for values out side range so that lower values register as the lowest value in the range
			//and higher values register as the highest value in the range. (Per Bradley Broom)
			if (origVal < lowVal) origVal = lowVal;
			if (origVal >= highVal) origVal = highVal;
			float adjVal = origVal-lowVal;
			float valScale = adjVal/scaleVal;
			int valHeight = Math.round(barHeight*valScale) == barHeight ? Math.round(barHeight*valScale)-1 : Math.round(barHeight*valScale);
			if ((origVal >= lowVal) && (origVal <= highVal)) {
				if (isBarPlot) {
					//select from the lower bound UP TO the current position in the matrix
					if (isCut) {
						for (int l = 0; l <= Integer.parseInt(height)-1; l++) {
							matrix[l][normalizedK] = 2;
						}
					} else {
						for (int l = 0; l <= valHeight; l++) {
							matrix[l][normalizedK] = 1;
						}
					}
				} else {
					if (isCut) {
						//set all positions on this row to white
						for (int l = 0; l <= Integer.parseInt(height)-1; l++) {
							matrix[l][normalizedK] = 2;
						}
					} else {
						//select just the current position in the matrix
						matrix[valHeight][normalizedK] = 1;
					}
				}
			}
			normalizedK++;
		} 
		classMatrix = matrix;
	}

	/*******************************************************************
	 * METHOD: getContinuousColor
	 *
	 * This method retrieves the RGB color corresponding to a given 
	 * element for drawing a continuous classification bar. It is used
	 * in generating the heat map PDF.
	 ******************************************************************/
	private int getContinuousColor(String elemValue) throws Exception {
		ArrayList<String> classBreaks = new ArrayList<String>(map.contBreaks);
		ArrayList<Color> classColors = new ArrayList<Color>(map.contColors);
    	int rgb = 0;
    	if (!MatrixValidator.isNumeric(elemValue)) {
    		Color missingColor = map.missingColor;
    		rgb = missingColor.getRGB();
    	} else {
        	float eVal = Float.parseFloat(elemValue);
            int i = 0;
            // find the breakpoints that this value is between
            while (Float.parseFloat(classBreaks.get(i)) <= eVal && i < classBreaks.size()-1){
            	i++;
            };
            Color lowCol = classColors.get(i-1);
            Color hiCol = classColors.get(i);
            float low = Float.parseFloat(classBreaks.get(i-1));
            float hi = Float.parseFloat(classBreaks.get(i));
            float ratio = (hi-eVal)/(hi-low);
            Color breakColor = ColorMapGenerator.blendColors(hiCol,lowCol,ratio);
            rgb = breakColor.getRGB();
    	}
    	return rgb;
	}

	/*******************************************************************
	 * METHOD: getDiscreteColor
	 *
	 * This method retrieves the RGB color corresponding to a given 
	 * element for drawing a discrete classification bar. It is used
	 * in generating the heat map PDF.
	 ******************************************************************/
	private int getDiscreteColor(String elemValue) throws Exception {
		ArrayList<String> classBreaks = new ArrayList<String>(map.breaks);
		ArrayList<Color> classColors = new ArrayList<Color>(map.colors);
    	Color elemColor;
    	int rgb = 0;
    	boolean found = false;
    	for (int y = 0; y < classBreaks.size(); y++) {
    		if (elemValue.equals(classBreaks.get(y))) {
    	        elemColor = classColors.get(y);
    	        rgb = elemColor.getRGB();
    	        found = true;
    		}
    	}
    	if (!found) {
    		elemColor = map.missingColor;
    		rgb = elemColor.getRGB();
    	}
    	return rgb;
	}
	
	/*******************************************************************
	 * METHOD: createClassLegendImg
	 *
	 * This method creates a bufferedImage for the legend of the  
	 * classification bar using summary level info its color map. It is
	 * used in generating the heat map PDF.
	 ******************************************************************/
	public void createClassLegendImg() throws Exception {
    	Color elemColor;
    	ArrayList<String> classBreaks;
    	ArrayList<Color> classColors;
        if (map.type.equals("continuous")) {
        	classBreaks = new ArrayList<String>(map.contBreaks);
        	classColors = new ArrayList<Color>(map.contColors);
        } else {
	    	classBreaks = new ArrayList<String>(map.breaks);
	    	classColors = new ArrayList<Color>(map.colors);
        }
        BufferedImage image = new BufferedImage(1, classBreaks.size()+1, BufferedImage.TYPE_INT_RGB);
    	int rgb = 0;
    	for (int y = 0; y < classBreaks.size(); y++) {
	        elemColor = classColors.get(y);
	        rgb = elemColor.getRGB();
            image.setRGB(0, y, rgb);
    	}
    	elemColor = map.missingColor;
    	rgb = elemColor.getRGB();
    	image.setRGB(0, classBreaks.size(), rgb);
    	classLegend = image;
	}
	
	/*******************************************************************
	 * Getters AND Setters
	 ******************************************************************/
	public ColorMap getMap() {
		return map;
	}


}
