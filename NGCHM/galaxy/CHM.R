### This method generates a row and column ordering given an input matrix and ordering methods.
###
### matrixData - numeric matrix 
### rowOrderMethod - Hierarchical, Original, Random
### rowDistanceMeasure - For clustering, distance measure. May be: euclidean, binary, manhattan, maximum, canberra, minkowski, or correlation.
### rowAgglomerationMethod - For clustering, agglomeration method.  May be:  'average' for Average Linkage, 'complete' for Complete Linkage,
###                                                                          'single' for Single Linkage, 'ward', 'mcquitty', 'median', or 'centroid'.
### colOrderMethod 
### colDistanceMeasure
### colAgglomerationMethod
### rowOrderFile - output file of order of rows 
### rowDendroFile - output file of row dendrogram  
### colOrderFile - output file of order of cols
### colDendroFile - output file of col dendrogram

performDataOrdering<-function(dataFile, rowOrderMethod, rowDistanceMeasure, rowAgglomerationMethod, colOrderMethod, colDistanceMeasure, colAgglomerationMethod,rowOrderFile, colOrderFile, rowDendroFile, colDendroFile)
{ 
   dataMatrix = read.table(dataFile, header=TRUE, sep = "\t", row.names = 1, as.is=TRUE)
   rowOrder <-  createOrdering(dataMatrix, rowOrderMethod, "row", rowDistanceMeasure, rowAgglomerationMethod)  
   if (rowOrderMethod == "Hierarchical") {
      writeHCDataTSVs(rowOrder, rowDendroFile, rowOrderFile)
   } else {
      writeOrderTSV(rowOrder, rownames(dataMatrix), rowOrderFile)
   }

   colOrder <-  createOrdering(dataMatrix, colOrderMethod, "col", colDistanceMeasure, colAgglomerationMethod)  
   if (colOrderMethod == "Hierarchical") {
      writeHCDataTSVs(colOrder, colDendroFile, colOrderFile)
   } else {
      writeOrderTSV(colOrder, colnames(dataMatrix), colOrderFile)
   }
}

#creates output files for hclust ordering
writeHCDataTSVs<-function(uDend, outputHCDataFileName, outputHCOrderFileName)
{
   data<-cbind(uDend$merge, uDend$height, deparse.level=0)
   colnames(data)<-c("A", "B", "Height")
   write.table(data, file = outputHCDataFileName, append = FALSE, quote = FALSE, sep = "\t", row.names=FALSE)
 
   data=matrix(,length(uDend$labels),2);
   for (i in 1:length(uDend$labels)) {
      data[i,1] = uDend$labels[i];
      data[i,2] = which(uDend$order==i);
   }
   colnames(data)<-c("Id", "Order")
   write.table(data, file = outputHCOrderFileName, append = FALSE, quote = FALSE, sep = "\t", row.names=FALSE)
}

#creates order file for non-clustering methods
writeOrderTSV<-function(newOrder, originalOrder, outputHCOrderFileName)
{
   data=matrix(,length(originalOrder),2);
   for (i in 1:length(originalOrder)) {
      data[i,1] = originalOrder[i];
      data[i,2] = which(newOrder==originalOrder[i]);
   }
   colnames(data)<-c("Id", "Order")
   write.table(data, file = outputHCOrderFileName, append = FALSE, quote = FALSE, sep = "\t", row.names=FALSE)
}



createOrdering<-function(matrixData, orderMethod, direction, distanceMeasure, agglomerationMethod)
{
  ordering <- NULL

  if (orderMethod == "Hierarchical")
  {

    # Compute dendrogram for "Distance Metric"
    distVals <- NULL
    if(direction=="row") {
      if (distanceMeasure == "correlation") {
        geneGeneCor <- cor(t(matrixData), use="pairwise")
        distVals <- as.dist((1-geneGeneCor)/2)
      } else {
        distVals <- dist(matrixData, method=distanceMeasure)
      }
    } else { #column
      if (distanceMeasure == "correlation") {
        geneGeneCor <- cor(matrixData, use="pairwise")
        distVals <- as.dist((1-geneGeneCor)/2)
      } else {
        distVals <- dist(t(matrixData), method=distanceMeasure)
      }
    }

    if (agglomerationMethod == "ward") {
      ordering <- hclust(distVals * distVals, method="ward.D2")
    } else {
      ordering <- hclust(distVals, method=agglomerationMethod)
    }
  }
  else if (orderMethod == "Random")
  {
    if(direction=="row") {
       headerList <- rownames(matrixData)
       ordering <- sample(headerList, length(headerList)) 
    } else {
       headerList <- colnames(matrixData)
       ordering <- sample(headerList, length(headerList)) 
    }
  }
  else if (orderMethod == "Original")
  {
    if(direction=="row") {
       ordering <- rownames(matrixData) 
    } else {
       ordering <- colnames(matrixData) 
    }
  } else {
    stop("createOrdering -- failed to find ordering method")
  }
  return(ordering)
}
### Initialize command line arguments and call performDataOrdering

options(warn=-1)

args = commandArgs(TRUE)

performDataOrdering(dataFile=args[1], rowOrderMethod=args[2], rowDistanceMeasure=args[3], rowAgglomerationMethod=args[4], colOrderMethod=args[5], colDistanceMeasure=args[6], colAgglomerationMethod=args[7],rowOrderFile=args[8], colOrderFile=args[9], rowDendroFile=args[10], colDendroFile=args[11])

#suppressWarnings(performDataOrdering(dataFile=args[1], rowOrderMethod=args[2], rowDistanceMeasure=args[3], rowAgglomerationMethod=args[4], colOrderMethod=args[5], colDistanceMeasure=args[6], colAgglomerationMethod=args[7],rowOrderFile=args[8], colOrderFile=args[9], rowDendroFile=args[10], colDendroFile=args[11]))
