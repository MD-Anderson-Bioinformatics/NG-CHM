package mda.ngchm.datagenerator;

import static mda.ngchm.datagenerator.ImportConstants.*;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.util.List;

public class MatrixValidator {

  public static void validateDataLayersSize(List<InputFile> matrixFiles) throws Exception {
    String errMsg = null;
    if (matrixFiles.size() > 1) {
      int baseRows = matrixFiles.get(0).rows;
      int baseCols = matrixFiles.get(0).cols;
      String baseName = matrixFiles.get(0).name;
      for (int i = 1; i < matrixFiles.size(); i++) {
        InputFile ifl = matrixFiles.get(i);
        if ((ifl.rows != baseRows) || (ifl.cols != baseCols)) {
          errMsg =
            "All DataLayer Matrices must contain the same number of rows and columns. DL Matrix (" +
            ifl.name +
            ") is not the same size as DL: " +
            baseName +
            ".";
          break;
        }
      }
    }
    if (errMsg != null) {
      throw new Exception(errMsg);
    }
  }

  public static String validateMatrixRowLength(int headerLength, int lineLength) throws Exception {
    String errMsg = null;
    if (headerLength != lineLength) {
      errMsg =
        "MATRIX INVALID: Number of Column Labels not equal to data in matrix.  Label Count: " +
        headerLength +
        " Data Count: " +
        lineLength;
    }
    return errMsg;
  }

  public static String validateMatrixLabelValue(String val, boolean isRowLabel) throws Exception {
    String errMsg = null;
    if (val.equals(EMPTY)) {
      if (isRowLabel) {
        errMsg = "MATRIX INVALID: Matrix Row Label contains no value at row: ";
      } else {
        errMsg = "MATRIX INVALID: Matrix Column Label contains no value at column: ";
      }
    }
    return errMsg;
  }

  public static String validateMatrixDataValue(String val) throws Exception {
    String errMsg = null;
    if (!isNumeric(val)) {
      if (!NA_VALUES.contains(val)) {
        errMsg =
          "MATRIX INVALID: Matrix contains non-numeric data (" +
          val +
          ") other than a Missing Data Value at: ";
      }
    }
    return errMsg;
  }

  public static String validateClassificationFile(String name, String file, String type)
    throws Exception {
    String errMsg = null;
    int rowId = 0;
    BufferedReader br = null;
    try {
      br = new BufferedReader(new FileReader(new File(file)));
      String sCurrentLine;
      while ((sCurrentLine = br.readLine()) != null) {
        rowId++;
        if (rowId > 1) {
          if (rowId == 2) {
            if (!sCurrentLine.contains("\t")) {
              errMsg = "COVARIATE INVALID: The covariate file (" + name + ") is not tab delimited";
              break;
            }
          }
          String vals[] = sCurrentLine.split("\t");
          int rowLen = vals.length;
          if (rowLen < 1) {
            errMsg =
              "COVARIATE INVALID: A row (" +
              rowId +
              ") in the covariate file (" +
              name +
              ") contains no elements.  Each row must contain at least a label";
            break;
          }
          if ((vals[0] == null) || (vals[0].equals(EMPTY))) {
            errMsg =
              "COVARIATE INVALID: A row (" +
              rowId +
              ") in the covariate file (" +
              name +
              ") contains no label";
            break;
          }
          if ((type.equals("continuous")) && (vals.length == 1)) {
            errMsg =
              "COVARIATE INVALID: All values for a continuous covariate bar must be numeric OR valid N/A values (NA, N/A)";
            break;
          }
          if (
            (type.equals("continuous")) && ((!isNumeric(vals[1])) && !NA_VALUES.contains(vals[1]))
          ) {
            errMsg =
              "COVARIATE INVALID: All values for a continuous covariate bar must be numeric OR valid N/A values (NA, N/A)";
            break;
          }
        }
      }
      br.close();
    } finally {
      try {
        br.close();
      } catch (Exception ex) {}
    }
    return errMsg;
  }

  /*******************************************************************
   * METHOD: isNumeric
   *
   * This method inspects a string value and returns a boolean if that
   * value is numeric.
   ******************************************************************/
  public static boolean isNumeric(String str) throws Exception {
    try {
      @SuppressWarnings("unused")
      double d = Double.parseDouble(str);
    } catch (Exception e) {
      return false;
    }
    return true;
  }

  public static boolean isInteger(String str) throws Exception {
    try {
      @SuppressWarnings("unused")
      Integer d = Integer.parseInt(str);
    } catch (Exception e) {
      return false;
    }
    return true;
  }
}
