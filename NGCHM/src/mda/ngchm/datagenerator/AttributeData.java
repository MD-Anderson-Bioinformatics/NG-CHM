/*******************************************************************
 * CLASS: AttributeData
 *
 * This class instantiates an TagData object for a given user-
 * provided tag.
 *
 * Author: Mark Stucky
 * Date: March 15, 2016
 ******************************************************************/

package mda.ngchm.datagenerator;

public class AttributeData {

  public String attributeName = null;
  public String attributeValue = null;

  /*******************************************************************
   * CONSTRUCTOR: ImportData
   *
   * This constructor creates an ImportData object containing an array
   * of ImportLayerData objects for each data layer to be generated.
   ******************************************************************/
  public AttributeData(String name, String value) {
    attributeName = name.trim();
    attributeValue = value.trim();
  }
}
