package mda.ngchm.test;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.util.Date;
import java.util.Random;

public class genTestMatrix {
	public static int NUM_ROWS = 0;
	public static int NUM_COLS = 0;
	public static Random rnd = new Random();		
	
	public static void randomizeCol (float[] columnData) {
		for (int i = 0; i < columnData.length; i++) {
			if (rnd.nextFloat()<.85)
				columnData[i] = (rnd.nextFloat()*2) - 1;
		}
	}
	public static void randomizeColSmall (float[] columnData) {
		for (int i = 0; i < columnData.length; i++) {
			if (rnd.nextFloat()<.10)
				columnData[i] = (rnd.nextFloat()*2) - 1;
		}
	}
	
	public static void main(String[] args) throws Exception {
		System.out.println("START: " + new Date());
		NUM_ROWS = Integer.parseInt(args[0]);
		NUM_COLS = Integer.parseInt(args[1]);
		String filename = NUM_ROWS+"x"+NUM_COLS;
		float matrix[][] = new float[NUM_ROWS][NUM_COLS];
		float columnData[] = new float[NUM_ROWS];
    	File dataDir = new File("C:\\NGCHMProto\\"+filename);
    	if (!dataDir.exists()) {
    		dataDir.mkdirs();
    	}
		BufferedWriter write = new BufferedWriter(new FileWriter("C:\\NGCHMProto\\"+filename+"\\"+filename+".txt"));
		randomizeCol(columnData);
		
		write.write("\tSAMP_" + 1 );
		for (int i = 1; i < NUM_COLS; i++) {
			write.write("\tSAMP_" + (i+1));
		}
		write.write("\n");
		
		for (int i = 0; i < NUM_COLS;  i++) {
			for (int j = 0; j < NUM_ROWS; j++) {
				if (rnd.nextFloat() < .3)
					matrix[j][i] = (rnd.nextFloat()*2)-1;
				else
					matrix[j][i] = columnData[j] + (rnd.nextFloat()*0.6F - 0.3F);
			}
			if (i == (NUM_COLS/.4) || i == (NUM_COLS/.7) || i == (NUM_COLS*.85)) {
				randomizeCol(columnData);
			}
			if (rnd.nextFloat() < 0.15F) {
				randomizeColSmall(columnData);
			}
		}
		
		for (int i = 0; i < NUM_ROWS; i++) {
			write.write("Gene_" + (i+1));
			for (int j = 0; j < NUM_COLS; j++ ) {
				write.write("\t" + String.format("%.4f", matrix[i][j]));
			}
			write.write("\n");
		}	
		write.close();
		
		//classification 1
		
		write = new BufferedWriter(new FileWriter("C:\\NGCHMProto\\"+filename+"\\Smoker_ColClassification.txt"));
		write.write("Discrete"+ "\n");
		for (int i = 0; i < NUM_COLS; i++) {
			String cat;
			if (i < (NUM_COLS/.4))
				cat = (rnd.nextFloat()<.85) ? "Smoker" : "Non-Smoker";
			else
				cat = (rnd.nextFloat()<.15) ? "Smoker" : "Non-Smoker";
			write.write("TCGA_SAMP_" + (i+1) + "\t" + cat + "\n");
		}
		write.close();
		
		write = new BufferedWriter(new FileWriter("C:\\NGCHMProto\\"+filename+"\\Age_ColClassification.txt"));
		write.write("Continuous"+ "\n");
		for (int i = 0; i < NUM_COLS; i++) {
			write.write("TCGA_SAMP_" + (i+1) + "\t" + (rnd.nextInt(70)+20) + "\n");
		}
		write.close();
		
		write = new BufferedWriter(new FileWriter("C:\\NGCHMProto\\"+filename+"\\Type_RowClassification.txt"));
		write.write("Discrete"+ "\n");
		for (int i = 0; i < NUM_ROWS; i++) {
			String cat = "Type_" + (rnd.nextInt(4)+1);
			write.write("Gene_" + (i+1) + "\t" + cat + "\n");
		}
		write.close();		
		System.out.println("END: " + new Date());
	}	
}
