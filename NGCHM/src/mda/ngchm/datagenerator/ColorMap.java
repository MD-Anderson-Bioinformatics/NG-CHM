/*******************************************************************
 * CLASS: ColorMap
 *
 * This class instantiates an colorMap object for a given data or
 * classification file color definition.
 *
 * Author: Mike Ryan
 * Date: December 2015
 ******************************************************************/
package mda.ngchm.datagenerator;

import static mda.ngchm.datagenerator.ImportConstants.*;

import java.awt.Color;
import java.util.ArrayList;

public class ColorMap {

  public String id;
  public String type;
  public ArrayList<Color> colors = new ArrayList<Color>();
  public Color missingColor;
  public ArrayList<String> breaks = new ArrayList<String>();

  public ArrayList<Color> contColors = new ArrayList<Color>();
  public ArrayList<String> contBreaks = new ArrayList<String>();

  /*******************************************************************
   * METHOD: asJSON
   *
   * This method returns the colorMap as a JSON string to be written
   * out to the mapConfig.JSON output file.
   ******************************************************************/
  public String asJSON() throws Exception {
    StringBuffer json = new StringBuffer(COLOR_MAP_LABEL + BRACE_OPEN);
    json.append(TYPE_LABEL + QUOTE + type + QUOTE + COMMA);
    String color0 = COLOR_BLACK;
    if (colors.size() > 0) {
      color0 = toHex(colors.get(0));
    }
    json.append(COLORS_LABEL + BRACKET_OPEN + QUOTE + HASHTAG + color0 + QUOTE);
    for (int i = 1; i < colors.size(); i++) {
      json.append(COMMA + QUOTE + HASHTAG + toHex(colors.get(i)) + QUOTE);
    }
    json.append(BRACKET_CLOSE + COMMA);
    boolean isNumeric = (areBreaksNumeric(breaks) && !type.equals(COLORTYPE_DISCRETE));
    String break0 = EMPTY;
    if (breaks.size() > 0) {
      break0 = getBreakString(breaks.get(0), isNumeric);
    }
    json.append(THRESHOLDS_LABEL + BRACKET_OPEN + break0);
    for (int i = 1; i < breaks.size(); i++) {
      json.append(COMMA + getBreakString(breaks.get(i), isNumeric));
    }
    json.append(BRACKET_CLOSE + COMMA);
    json.append(MISSING_LABEL + QUOTE + HASHTAG + toHex(missingColor) + QUOTE);
    json.append(BRACE_CLOSE);
    return json.toString();
  }

  /*******************************************************************
   * METHOD: getBreakString
   *
   * This method returns a breakpoint as a string for inclusion in
   * a JSON file.  If the break value is not numeric, it returns the
   * value as a string with quotes around it.
   ******************************************************************/
  private String getBreakString(String breakpt, boolean isNumeric) throws Exception {
    if (!isNumeric) {
      breakpt = QUOTE + breakpt + QUOTE;
    }
    return breakpt;
  }

  /*******************************************************************
   * METHOD: areBreaksNumeric
   *
   * This method inspects the breakpoints for a given color map and
   * returns a boolean indicating whether they are numeric breakpoints.
   ******************************************************************/
  private boolean areBreaksNumeric(ArrayList<String> breaks) throws Exception {
    boolean isNumeric = true;
    for (int i = 0; i < breaks.size(); i++) {
      if (!MatrixValidator.isNumeric(breaks.get(i))) {
        isNumeric = false;
      }
    }
    return isNumeric;
  }

  /*******************************************************************
   * METHOD: toHex
   *
   * This method returns the hex representation for the color contained
   * in a Color object .
   ******************************************************************/
  private String toHex(Color c) throws Exception {
    String hex = "" + Integer.toHexString(c.getRGB());
    return hex.substring(2);
  }
}
