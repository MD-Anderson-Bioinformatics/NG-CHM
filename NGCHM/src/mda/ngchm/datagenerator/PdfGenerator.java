package mda.ngchm.datagenerator;

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.InputStream;
import java.util.List;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.graphics.image.LosslessFactory;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;

import javax.imageio.ImageIO;

import static mda.ngchm.datagenerator.ImportConstants.*;

public class PdfGenerator { 

	/*******************************************************************
	 * METHOD: createHeatmapPDF
	 *
	 * This method is the main driver for generating a heat map PDF 
	 * document using the PdfBox library.  A page is created for each 
	 * data layer and a legend page is created at the end of the PDF.
	 ******************************************************************/
	public void createHeatmapPDF(ImportData iData) throws Exception {
		PDDocument doc = null;
		BufferedImage image;
		try {
		    doc = new PDDocument();
			for (int i=0; i < iData.matrixImages.size(); i++) {
				image = iData.matrixImages.get(i); 
				createPDFHeatmapPage(doc, image, iData);
			}
			if ((iData.rowClassLegends.size() > 0) || (iData.colClassLegends.size() > 0)) {
				createPDFLegendPage(doc, iData);
			}
		    doc.save(iData.outputDir+File.separator+iData.chmName+" HeatMap.pdf");
		    doc.close();
		} catch (Exception e) {
			System.out.println("Error in PdfGen createHeatmapPDF: " + e.toString());
			throw e;
		} finally {
		    if( doc != null ) {
		        doc.close();
		    }
		}
	}	
	
	public PDPageContentStream getPdfPage(PDDocument doc, ImportData iData) throws Exception {
        PDPage page = new PDPage();
        doc.addPage(page);
        PDPageContentStream contentStream = new PDPageContentStream(doc, page);
        //Write header and footer to PDF Document
        drawHeaderFooter(doc, contentStream, iData.chmName);
		return contentStream;
	}
   
	public void createPDFHeatmapPage(PDDocument doc, BufferedImage image, ImportData iData) throws Exception {
		try {
            PDPageContentStream contentStream = getPdfPage(doc, iData);
            int[] rowColPos = getStartingPositions(iData);
            //Draw row dendrogram on PDF
            if (iData.colDendroMatrix != null) {
	            rowColPos = drawColumnDendrogram(doc, contentStream, iData, rowColPos);
            }
            //Draw column covariates on PDF
            rowColPos = drawColumnCovariates(doc, contentStream, iData, rowColPos);
            //Draw row dendrogram on PDF
            rowColPos[PDF_ROW_POS] -= PDF_MAP_SIZE;
            if (iData.rowDendroMatrix != null) {
                rowColPos = drawRowDendrogram(doc, contentStream, iData, rowColPos);
            }
            //Draw row covariates on PDF
            rowColPos = drawRowCovariates(doc, contentStream, iData, rowColPos);
            //Draw heat map on PDF
            PDImageXObject  pdImageXObject = LosslessFactory.createFromImage(doc, image);
            contentStream.drawImage(pdImageXObject, rowColPos[PDF_COL_POS], rowColPos[PDF_ROW_POS], PDF_MAP_SIZE, PDF_MAP_SIZE);   
            contentStream.close();
		} catch (Exception e) {
			System.out.println("Error in PdfGen createPDFHeatmapPage: " + e.toString());
			throw e;
		} 
	}	
	
	public int[] getStartingPositions(ImportData iData) throws Exception {
        int[] rowColPos = new int[2];
        rowColPos[PDF_ROW_POS] = PDF_CONTENT_START;
        rowColPos[PDF_COL_POS] = 10 + (PDF_CLASS_HEIGHT*iData.rowClassImages.size()) + 1;
        if (iData.rowDendroMatrix != null) {
        	 rowColPos[PDF_COL_POS] += PDF_DENDRO_HEIGHT;
        }
        return rowColPos;
	}
	
	public void createPDFLegendPage(PDDocument doc, ImportData iData) throws Exception {
		try {
           PDPageContentStream contentStream = getPdfPage(doc, iData);
           BufferedImage borderBox = new BufferedImage(1, 1, BufferedImage.TYPE_INT_RGB);
           borderBox.setRGB(0, 0, Color.black.getRGB());
           PDImageXObject pdImageBorderBox = LosslessFactory.createFromImage(doc, borderBox);
           int rowCovStartY = 712;
   		   if (iData.rowClassLegends.size() > 0)  {
   			  writePDFText(contentStream, "Row Covariate Bar Legends", 12, PDF_FONT_BOLD, 10, rowCovStartY, false);
   			  rowCovStartY -= 15;
   			  float pairs = new Float(iData.rowClassLegends.size())/2;
   			  int next = 0;
   			  //Get number of pairs of row class legends
   			  for (int i=0; i<pairs; i++) {
   				int legend2 = -1;
   				if ((pairs % 1) == 0) {
   					legend2 = next+1;
   				}
   				//IF legend pair fits on page, write to page ELSE create new page and write to it.
   				if (legendFitsOnPage(doc, iData, contentStream, next, legend2, rowCovStartY, false)) {
   					rowCovStartY = writeLegend(doc, iData, contentStream, next, legend2, rowCovStartY, pdImageBorderBox, false);
   				} else {
   					rowCovStartY = 712;
   					contentStream.close();
   					contentStream = getPdfPage(doc, iData);
   	   			    writePDFText(contentStream, "Row Covariate Bar Legends (continued)", 12, PDF_FONT_BOLD, 10, rowCovStartY, false);
   	   			    rowCovStartY -= 15;
   					rowCovStartY = writeLegend(doc, iData, contentStream, next, legend2, rowCovStartY, pdImageBorderBox, false);
  				}
   				next += 2;
   			  }
   		   }
   		   if (iData.colClassLegends.size() > 0)  {
   			   writePDFText(contentStream, "Column Covariate Bar Legends", 12, PDF_FONT_BOLD, 10, rowCovStartY, false);
   	           rowCovStartY -= 15;
 			   float pairs = new Float(iData.colClassLegends.size())/2;
			   int next = 0;
   			   for (int i=0; i<pairs; i++) {
   				   int legend2 = -1;
   				   if ((pairs % 1) == 0) {
   					   legend2 = next+1;
   				   }
       			   if (legendFitsOnPage(doc, iData, contentStream, next, legend2, rowCovStartY, true)) {
      					rowCovStartY = writeLegend(doc, iData, contentStream, next, legend2, rowCovStartY, pdImageBorderBox, true);
       				} else {
       					rowCovStartY = 712;
       					contentStream.close();
       					contentStream = getPdfPage(doc, iData);
       	   			    writePDFText(contentStream, "Column Covariate Bar Legends (continued)", 12, PDF_FONT_BOLD, 10, rowCovStartY, false);
       	   			    rowCovStartY -= 15;
       					rowCovStartY = writeLegend(doc, iData, contentStream, next, legend2, rowCovStartY, pdImageBorderBox, true);
      				}
   				   next += 2;
   			   }
   		   }
           contentStream.close();
		} catch (Exception e) {
			System.out.println("Error in PdfGen createPDFLegendPage: " + e.toString());
			throw e;
		} 
	}	
   
	public int writeLegend(PDDocument doc, ImportData iData, PDPageContentStream contentStream, int legend1, int legend2, int rowCovStartY, PDImageXObject pdImageBorderBox, boolean isColumn) throws Exception {
		int currRow = rowCovStartY;
		InputClass iFile;
		String[]rowValues;
		List<BufferedImage>legends;
        
		int colStart = 0;
		if (isColumn) {
			iFile = iData.colClassFiles.get(legend1);
			rowValues = iData.colClassValues.get(legend1);
			legends = iData.colClassLegends;
		} else {
			iFile = iData.rowClassFiles.get(legend1);
	      	rowValues = iData.rowClassValues.get(legend1);
	      	legends = iData.rowClassLegends;
		}
		int breakSize = iFile.map.breaks.size()+1;
      	if (iFile.map.type.equals("continuous")) {
      		breakSize = iFile.map.contBreaks.size()+1;
      	}
		writePDFText(contentStream, iFile.name, 10, PDF_FONT_BOLD, colStart+14, currRow, false);
		currRow -= (breakSize*10)+5;
		//Write legend class totals to the PDF
		if (iFile.map.type.equals("continuous")) {
  	        writeContinuousCovariateClassTotals(contentStream, iFile, rowValues, currRow, colStart);
		} else {
  	        writeDiscreteClassTotals(contentStream, iFile, rowValues, currRow, colStart);
		}
        //Draw covariate legend on the PDF 
        PDImageXObject  pdImageClassXObjectC = LosslessFactory.createFromImage(doc, legends.get(legend1));
        contentStream.drawImage(pdImageBorderBox, colStart+17, currRow-1, 12, (breakSize*10)+2);
        contentStream.drawImage(pdImageClassXObjectC, colStart+18, currRow, 10, breakSize*10);
        int legend1Rows = currRow;
        currRow = rowCovStartY;
        if (legend2 > 0) {
        	colStart = 300;
			if (isColumn) {
		      	iFile = iData.colClassFiles.get(legend2);
		      	rowValues = iData.colClassValues.get(legend2);
		      	legends = iData.colClassLegends;
			} else {
				iFile = iData.rowClassFiles.get(legend2);
		      	rowValues = iData.rowClassValues.get(legend2);
		      	legends = iData.rowClassLegends;
			}
			breakSize = iFile.map.breaks.size()+1;
	      	if (iFile.map.type.equals("continuous")) {
	      		breakSize = iFile.map.contBreaks.size()+1;
	      	}
			writePDFText(contentStream, iFile.name, 10, PDF_FONT_BOLD, colStart+14, currRow, false);
			currRow -= (breakSize*10)+5;
			//Write legend class totals to the PDF
			if (iFile.map.type.equals("continuous")) {
	  	        writeContinuousCovariateClassTotals(contentStream, iFile, rowValues, currRow, colStart);
			} else {
				writeDiscreteClassTotals(contentStream, iFile, rowValues, currRow, colStart);
			}
	        //Draw covariate legend on the PDF 
	        pdImageClassXObjectC = LosslessFactory.createFromImage(doc, legends.get(legend2));
	        contentStream.drawImage(pdImageBorderBox, colStart+16, currRow-1, 12, (breakSize*10)+2);
	        contentStream.drawImage(pdImageClassXObjectC, colStart+17, currRow, 10, breakSize*10);
	        if (currRow < legend1Rows) {
	        	legend1Rows = currRow;
	        }
        }
        legend1Rows -= 45;
		return legend1Rows;
	}
	
	public boolean legendFitsOnPage(PDDocument doc, ImportData iData, PDPageContentStream contentStream, int legend1, int legend2, int rowCovStartY, boolean isColumn) throws Exception {
		boolean itFits = true;
		int currRow = rowCovStartY;
		InputClass iFile;
		if (isColumn) {
			iFile = iData.colClassFiles.get(legend1);
		} else {
			iFile = iData.rowClassFiles.get(legend1);
		}
		int breakSize = iFile.map.breaks.size()+1;
      	if (iFile.map.type.equals("continuous")) {
      		breakSize = iFile.map.contBreaks.size()+1;
      	}
		currRow -= (breakSize*10)+5;
        int legend1Rows = currRow;
        currRow = rowCovStartY;
        if (legend2 > 0) {
			if (isColumn) {
		      	iFile = iData.colClassFiles.get(legend2);
			} else {
				iFile = iData.rowClassFiles.get(legend2);
			}
			breakSize = iFile.map.breaks.size();
	      	if (iFile.map.type.equals("continuous")) {
	      		breakSize = iFile.map.contBreaks.size();
	      	}
			currRow -= (breakSize*10)+5;
	        if (currRow < legend1Rows) {
	        	legend1Rows = currRow;
	        }
        }
        if (legend1Rows < 50) {
        	itFits = false;
        }
		return itFits;
	}	
		
   public void writeDiscreteClassTotals(PDPageContentStream contentStream, InputClass iFile, String[] covValues, int rowCovStartY, int colStart) throws Exception {
        int[] covTotals = new int[iFile.map.breaks.size()+1];
        for (int j = 1; j < covValues.length; j++) {
            boolean found = false;
        	String elemValue = covValues[j];
        	for (int k = 0; k < iFile.map.breaks.size(); k++) {
        		if (elemValue.equals(iFile.map.breaks.get(k))) {
        			found = true;
        			covTotals[k]++;
        		}
        	}
        	if (!found) {
        		covTotals[covTotals.length-1]++;
        	}
        } 
        int revOrder = covTotals.length - 1;
        for (int k = 0; k < covTotals.length;k++) {
        	String breakVal;
        	if (k == covTotals.length - 1) {
        		breakVal = "Missing Value";
        	} else {
            	breakVal = iFile.map.breaks.get(k);
        	}
        	if (breakVal.length() > 25) {
        		breakVal = breakVal.substring(0,25)+"...";
        	}
		    writePDFText(contentStream, breakVal, 7, PDF_FONT, colStart+35, (rowCovStartY+2)+(10*revOrder), false);
		    writePDFText(contentStream, "n = "+ covTotals[k], 7, PDF_FONT, colStart+150, (rowCovStartY+2)+(10*revOrder), false);
		    revOrder--;
        }
   }
   
   public void writeContinuousCovariateClassTotals(PDPageContentStream contentStream, InputClass iFile, String[] covValues, int rowCovStartY, int colStart) throws Exception {
       int[] covTotals = new int[iFile.map.contBreaks.size()+1];
       for (int j = 1; j < covValues.length; j++) {
	       	String elemValue = covValues[j];
	    	if (!HeatmapDataGenerator.isNumeric(elemValue)) {
	    		covTotals[iFile.map.contBreaks.size()]++;
	    	} else {
		       	for (int k = 0; k < iFile.map.contBreaks.size(); k++) {
					if (k == 0 && Float.valueOf(elemValue) < Float.valueOf(iFile.map.contBreaks.get(k))){
						covTotals[k]++;
					} else if (k == iFile.map.contBreaks.size() - 1 && Float.valueOf(elemValue) > Float.valueOf(iFile.map.contBreaks.get(k))){
						covTotals[k]++;
					} else if (Float.valueOf(elemValue) <= Float.valueOf(iFile.map.contBreaks.get(k))){
						covTotals[k]++;
						break;
					}
		       	}
	    	}
       } 
       int revOrder = covTotals.length - 1;
       for (int k = 0; k < covTotals.length;k++) {
        	String breakVal;
        	if (k == covTotals.length - 1) {
        		breakVal = "Missing Value";
        	} else {
            	breakVal = iFile.map.contBreaks.get(k);
        	}
        	if (breakVal.length() > 25) {
        		breakVal = breakVal.substring(0,25)+"...";
        	}
		    writePDFText(contentStream, breakVal, 7, PDF_FONT, colStart+35, (rowCovStartY+2)+(10*revOrder), false);
		    writePDFText(contentStream, "n = "+ covTotals[k], 7, PDF_FONT, colStart+150, (rowCovStartY+2)+(10*revOrder), false);
		    revOrder--;
       }
  }
   
	public void drawHeaderFooter(PDDocument doc, PDPageContentStream contentStream, String mapName)  throws Exception {
        try {
        	//Write heatmap name to header (truncating if necessary)
        	if (mapName.length() > 40) {
	        	mapName = mapName.substring(0,40) + "...";
	        }
			writePDFText(contentStream, mapName, 14, PDF_FONT_BOLD, 130, 755, false);
			//Draw MDA logo on header
			InputStream is = getClass().getResourceAsStream("/images/mdabcblogo262x108.png");
	        BufferedImage mdaLogoImg = ImageIO.read(is);
	        PDImageXObject  mdaLogo = LosslessFactory.createFromImage(doc, mdaLogoImg);
	        contentStream.drawImage(mdaLogo, 10, 740, 100, 40);
			//Draw red bar on header
	        BufferedImage redBarImg = ImageIO.read(getClass().getResourceAsStream("/images/redbar.png"));
	        PDImageXObject  redBar = LosslessFactory.createFromImage(doc, redBarImg);
	        contentStream.drawImage(redBar, 10, 735, 590, 12);
			//Draw In Silico logo on footer
	        BufferedImage insilicoLogoImg = ImageIO.read(getClass().getResourceAsStream("/images/insilicologo.png"));
	        PDImageXObject  insilicoLogo = LosslessFactory.createFromImage(doc, insilicoLogoImg);
	        contentStream.drawImage(insilicoLogo, 10, 10, 70, 22);
		} catch (Exception e) {
			System.out.println("Error in PdfGen drawHeaderFooter: " + e.toString());
			throw e;
        } 
	}

	public int[] drawColumnDendrogram(PDDocument doc, PDPageContentStream contentStream, ImportData iData, int[] posArray)  throws Exception {
		posArray[PDF_ROW_POS] -= PDF_DENDRO_HEIGHT;
        try {
            PDImageXObject  pdColDendroImageXObject = LosslessFactory.createFromImage(doc, iData.colDendroImage);
            contentStream.drawImage(pdColDendroImageXObject, posArray[PDF_COL_POS], posArray[PDF_ROW_POS], PDF_MAP_SIZE, PDF_DENDRO_HEIGHT);
		} catch (Exception e) {
			System.out.println("Error in PdfGen drawColumnDendrogram: " + e.toString());
			throw e;
        } 

        return posArray;
	}
	
	public int[] drawColumnCovariates(PDDocument doc, PDPageContentStream contentStream, ImportData iData, int[] posArray) throws Exception {
        try {
        	if (iData.colClassImages.size()> 0) {
            	posArray[PDF_ROW_POS] -= PDF_CLASS_HEIGHT;
        	} else {
            	posArray[PDF_ROW_POS] -= 1;
        	}
            for (int i = 0; i <  iData.colClassImages.size(); i++) {
	            PDImageXObject  pdImageClassXObjectC = LosslessFactory.createFromImage(doc, iData.colClassImages.get(i));
	            contentStream.drawImage(pdImageClassXObjectC, posArray[PDF_COL_POS], posArray[PDF_ROW_POS], PDF_MAP_SIZE, PDF_CLASS_HEIGHT - 1);
            	String covName = iData.colClassFiles.get(i).name;
    			covName = covName.length() > 20 ? covName.substring(0, 20)+"..." : covName;
	    		writePDFText(contentStream, covName, 6, PDF_FONT_BOLD, posArray[PDF_COL_POS]+PDF_MAP_SIZE+2, posArray[PDF_ROW_POS], false);
	            if (i < iData.colClassImages.size() - 1) {
	            	posArray[PDF_ROW_POS] -= PDF_CLASS_HEIGHT;
	            } else {
	            	posArray[PDF_ROW_POS] -= 1;
	            }
            }
		} catch (Exception e) {
			System.out.println("Error in PdfGen drawColumnCovariates: " + e.toString());
			throw e;
        } 

        return posArray;
	}
	
	public int[] drawRowDendrogram(PDDocument doc, PDPageContentStream contentStream, ImportData iData, int[] posArray)  throws Exception {
        try {
        	PDImageXObject  pdRowDendroImageXObject = LosslessFactory.createFromImage(doc, iData.rowDendroImage);
            contentStream.drawImage(pdRowDendroImageXObject, 10, posArray[PDF_ROW_POS], PDF_DENDRO_HEIGHT, PDF_MAP_SIZE);
		} catch (Exception e) {
			System.out.println("Error in PdfGen drawRowDendrogram: " + e.toString());
			throw e;
        } 

        return posArray;
	}
	
	public int[] drawRowCovariates(PDDocument doc, PDPageContentStream contentStream, ImportData iData, int[] posArray)  throws Exception {
        int colStartPos = posArray[PDF_COL_POS] - ((PDF_CLASS_HEIGHT*iData.rowClassImages.size()));
        try {
            for (int i = 0; i <  iData.rowClassImages.size(); i++) {
	            PDImageXObject  pdImageClassXObjectR = LosslessFactory.createFromImage(doc, iData.rowClassImages.get(i));
	            contentStream.drawImage(pdImageClassXObjectR, colStartPos, posArray[PDF_ROW_POS], PDF_CLASS_HEIGHT - 1, PDF_MAP_SIZE);
            	String covName = iData.rowClassFiles.get(i).name;
    			covName = covName.length() > 20 ? covName.substring(0, 20)+"..." : covName;
	    		writePDFText(contentStream, covName, 6, PDF_FONT_BOLD, posArray[PDF_COL_POS]-6, posArray[PDF_ROW_POS]-3, true);
            	colStartPos += PDF_CLASS_HEIGHT;
            }
		} catch (Exception e) {
			System.out.println("Error in PdfGen drawRowCovariates: " + e.toString());
			throw e;
        } 

        return posArray;
	}
	
	/*******************************************************************
	 * METHOD: writePDFText
	 *
	 * This is a helper method that writes text on the PDF page at a 
	 * given location.
	 ******************************************************************/
	public void writePDFText(PDPageContentStream contentStream, String text, int fontSize, PDFont font, int startX, int startY, boolean rotate) throws Exception {
		contentStream.beginText();
		contentStream.setFont(PDF_FONT, fontSize);
		contentStream.newLineAtOffset(startX, startY);
		if (rotate) {
			contentStream.setTextRotation(-20.42, startX, startY);
		}
		contentStream.showText(text);
		contentStream.endText();
	}
	


}
