package mda.ngchm.util;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStreamReader;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.io.FileNotFoundException;
import java.util.Base64;
import java.util.Date;

import java.util.List;
import java.util.ArrayList;
import java.math.BigInteger;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

public class CompilerUtilities {

	/*******************************************************************
	 * METHOD: getFileBytes
	 *
	 * This method reads in a file as a byte array.
	 ******************************************************************/
	public static byte[] getFileBytes (String fileName) throws Exception {
		byte[] bytes = new byte[0];
		try {
			File file = new File(fileName);
			FileInputStream fileInputStreamReader = new FileInputStream(file);
			bytes = new byte[(int)file.length()];
			fileInputStreamReader.read(bytes);
			fileInputStreamReader.close();
		} catch (Exception e) {
			System.out.println("ServerAppGenerator: Error reading file bytes " + fileName);
			e.printStackTrace();
			System.exit(1);
		}
		return bytes;
	}

	/*******************************************************************
	 * METHOD: encodeFileToBase64Binary
	 *
	 * This method reads in an image file and converts it to a base64-encoded
	 * string representation.
	 ******************************************************************/
	public static String encodeFileToBase64Binary(String image) {
		String encodedfile = null;
		try {
			byte[] bytes = getFileBytes (image);
			encodedfile = "data:image/png;base64," + Base64.getEncoder().encodeToString(bytes);
		} catch (Exception e) {
			System.out.println("ServerAppGenerator: Error encoding image " + image);
			e.printStackTrace();
			System.exit(1);
		}
		return encodedfile;
	}

	/*******************************************************************
	 * METHOD: getFileDigest
	 *
	 * This method returns the SHA-1 digest of the contents of the file
	 * with name fileName.
	 ******************************************************************/
	public static String getFileDigest (String fileName)
	{
		String hashtext = "";
		try {
			MessageDigest md = MessageDigest.getInstance("SHA-1");
			byte[] messageDigest = md.digest(getFileBytes(fileName));

			BigInteger no = new BigInteger(1, messageDigest);
			hashtext = no.toString(16);
			while (hashtext.length() < 32) {
				hashtext = "0" + hashtext;
			}
		} catch (Exception e) {
			System.out.println("ServerAppGenerator: Error digesting file " + fileName);
			e.printStackTrace();
			System.exit(1);
		}
		return hashtext;
	}

	/*******************************************************************
	 * METHOD: copyFile
	 *
	 * This method copies the file with name inputFile to the file with
	 * name outputFile.
	 ******************************************************************/
	public static void copyFile (String inputFile, String outputFile) {
		final int BUFFER_SIZE = 4096; // 4KB

		try (
			FileInputStream inputStream = new FileInputStream(inputFile);
			FileOutputStream outputStream = new FileOutputStream(outputFile);
		) {
			byte[] buffer = new byte[BUFFER_SIZE];
			int bytesRead = -1;

			while ((bytesRead = inputStream.read(buffer)) != -1) {
				outputStream.write(buffer, 0, bytesRead);
			}
		} catch (Exception e) {
			System.out.println("ServerAppGenerator: Error copying file " + inputFile + " to " + outputFile);
			e.printStackTrace();
			System.exit(1);
		}
	}

	/*******************************************************************
	 * Static members imageFiles and imageCounts.
	 *
	 * These two lists are used to count the number of distinct times each
	 * image is referenced in the source files.  imageCounts[idx] is the
	 * number of times imageFiles[idx] has been referenced.
	 ******************************************************************/
	private static List<String> imageFiles = new ArrayList<String>(100);
	private static List<Integer> imageCounts = new ArrayList<Integer>(100);

	/*******************************************************************
	 * METHOD: copyLineAndImages
	 *
	 * This method copies any image referenced on line from the inputDir
	 * to the outDir and its reference count is incremented.
	 ******************************************************************/
	public static void copyLineAndImages (String line, String inputDir, String outputDir)
		throws Exception
	{
		if (line.contains("images/")) {
			// Copy any images on line to output directory.
			String toks[] = line.split(" ");
			for (String tok : toks) {
				if (tok.contains("images/")) {
					int start = tok.indexOf("images/");
					int stop = tok.indexOf(".png");
					String fileName;
					if (start < 0 || stop < 0) {
						System.out.println ("Bad image string: '" + tok + "' on line " + line);
					}
					stop = stop + 4;  // Stop at end of .png
					fileName = tok.substring(start,stop);
					if (!imageFiles.contains(fileName)) {
						System.out.println("Copying image file " + fileName);
						CompilerUtilities.copyFile (inputDir + "/" + fileName, outputDir + "/" + fileName);
						imageFiles.add (fileName);
						imageCounts.add (0);
					}
					int idx = imageFiles.indexOf(fileName);
					imageCounts.set (idx, imageCounts.get (idx) + 1);
				}
			}
		}
	}

	/*******************************************************************
	 * METHOD: outputImageCounts
	 *
	 * This method outputs a table of image reference counts to the console.
	 ******************************************************************/
	public static void outputImageCounts () {
		int N = imageFiles.size();
		System.out.println("\nCount  Image file name\n");
		for (int i = 0; i < N; i++) {
			System.out.println (String.format("%5d", imageCounts.get(i)) + ": " + imageFiles.get(i));
		}
	}

	/*******************************************************************
	 * METHOD: minifyFile
	 *
	 * This method minimizes the Javascript source file srcFile using the
	 * closure compiler at the SIMPLE_OPTIMIZATIONS level.
	 *
	 * The minimized output is returned.
	 *
	 * Error/warning messages written by the closure compiler to its
	 * standard error are output to the console.
	 *
	 ******************************************************************/
	public static String minifyFile (String srcFile, String outDir, String closure)
		throws FileNotFoundException, IOException
	{
		String tmpFile = outDir + "/tmp.min.js";
		String[] cmd = { "java", "-jar", closure,
		                 srcFile,
			         "--compilation_level", "SIMPLE_OPTIMIZATIONS",
				 "--jscomp_off", "uselessCode",
				 "--language_out", "ECMASCRIPT_2018",
				 "--js_output_file", tmpFile
			       };

		/* Minimize srcFile */
		Process process = Runtime.getRuntime().exec(cmd);
		BufferedReader errorReader = new BufferedReader (new InputStreamReader (process.getErrorStream()));
		String line;
		while ((line = errorReader.readLine()) != null) {
		    System.out.println (line);
		}
		errorReader.close();

		StringBuffer strBuff = new StringBuffer();

		BufferedReader br = new BufferedReader(new FileReader(tmpFile));
		line = br.readLine();
		while (line != null) {
			strBuff.append(line+"\n");
			line = br.readLine();
		}
		br.close();
		return strBuff.toString();
	}

	/*******************************************************************
	 * METHOD: minifyString
	 *
	 * This method minimizes the Javascript in string src using the
	 * closure compiler at the SIMPLE_OPTIMIZATIONS level.
	 *
	 * The minimized output is returned as a string.
	 *
	 ******************************************************************/
	public static String minifyString (String src, String outDir, String closure)
		throws FileNotFoundException, IOException
	{
		String tmpFile = outDir + "/minify-tmp.js";
		BufferedWriter cw = new BufferedWriter(new FileWriter(tmpFile));
		cw.write(src);
		cw.close();
		String minjs = CompilerUtilities.minifyFile (tmpFile, outDir, closure);

		File tmp = new File(tmpFile);
		tmp.delete();

		return minjs;
	}

	/*******************************************************************
	 * METHOD: readStyleAsString
	 *
	 * This method returns the contents of cssFile as a String.  Any double
	 * quotes in the file are escaped.
	 *
	 * Any images referenced in the file are copied to the output directory.
	 *
	 ******************************************************************/
	public static String readStyleAsString(String srcDir, String outputDir, String cssFile) throws Exception {
		StringBuffer strBuff = new StringBuffer();

		BufferedReader br = new BufferedReader(new FileReader(srcDir + "/" + cssFile));
		String line = br.readLine();
		while (line != null) {
		        CompilerUtilities.copyLineAndImages (line, srcDir, outputDir);
			strBuff.append(line.replaceAll("\"", "\\\""));
			line = br.readLine();
		}

		br.close();
		return strBuff.toString();
	}

	/*******************************************************************
	 * METHOD: readFileAsString
	 *
	 * This method returns the contents of fileName as a String.
	 *
	 * Any images referenced in the file are copied to the output directory.
	 *
	 ******************************************************************/
        public static String readFileAsString(String srcDir, String outputDir, String fileName)
		throws Exception
	{
		StringBuffer strBuff = new StringBuffer();

		BufferedReader br = new BufferedReader(new FileReader(srcDir + "/" + fileName));
		String line = br.readLine();
		while (line != null) {
		        CompilerUtilities.copyLineAndImages (line, srcDir, outputDir);
			strBuff.append(line+"\n");
			line = br.readLine();
		}
		br.close();
		return strBuff.toString();
        }

	/*******************************************************************
	 * METHOD: minifyDeferredCSS
	 *
	 * This method creates a minified Javascript module for injecting
	 * deferred CSS into the document's head element.
	 *
	 * The generated Javascript is returned as a String.
	 *
	 ******************************************************************/
	public static String minifyDeferredCSS (StringBuffer css, String serverDir, String closure)
		throws FileNotFoundException, IOException
	{
		String js = "(function() {\n"
		          + "var css = document.createElement('style');\n"
		          + "css.type='text/css';\n"
		          + "css.textContent='" + css.toString() + "';\n"
		          + "document.head.appendChild(css);\n"
		          + "})()\n";
		return CompilerUtilities.minifyString (js, serverDir, closure);
	}

	/*******************************************************************
	 * METHOD: testDirectory
	 *
	 * Create directory at path if it doesn't already exist.
	 *
	 ******************************************************************/
	public static void testDirectory (String path)
	{
		File directory = new File (path);
		if (directory.exists()) {
			return;
		}
		if (directory.mkdir()) {
			return;
		}

		System.out.println("Error: required output directory " + path + " does not exist and cannot be made.");
		System.exit(1);
	}

	public static String getJavascriptFileName (String line)
		throws Exception
	{
		boolean error = false;
		int start = line.indexOf("src=\"");
		if (start >= 0) {
			start += 5;
		} else {
			start = line.indexOf("src='");
			if (start >= 0) {
				start += 5;
			} else {
				System.out.println ("Cannot find src= attribute on script line");
				error = true;
			}
		}
		int end = line.indexOf(".js?");
		if (end >= 0) {
			end += 3;
		} else {
			end = line.indexOf(".js\"");
			if (end >= 0) {
				end += 3;
			} else {
				end = line.indexOf(".js'");
				if (end >= 0) {
					end += 3;
				} else {
					System.out.println ("Error: Cannot find end of src= attribute on script line");
					error = true;
				}
			}
		}
		if (end >= 0 && start >= end) {
			System.out.println ("End of src= attribute on script line comes before its start");
			error = true;
		}
		if (error) {
			System.out.println ("HTML line containing error was:");
			System.out.println (line);
			throw new Exception("Cannot find script file name");
		}
		return line.substring(start, end);
	}

	public static String getCSSFileName (String line)
		throws Exception
	{
		boolean error = false;
		int start = line.indexOf("href=\"");
		if (start >= 0) {
			start += 6;
		} else {
			start = line.indexOf("href='");
			if (start >= 0) {
				start += 6;
			} else {
				System.out.println ("Cannot find href= attribute on style line");
				error = true;
			}
		}
		int end = line.indexOf(".css?");
		if (end >= 0) {
			end += 4;
		} else {
			end = line.indexOf(".css\"");
			if (end >= 0) {
				end += 4;
			} else {
				end = line.indexOf(".css'");
				if (end >= 0) {
					end += 4;
				} else {
					System.out.println ("Cannot find end of href= attribute on style line");
					error = true;
				}
			}
		}
		if (end >= 0 && start >= end) {
			System.out.println ("End of href= attribute on style line comes before its start");
			error = true;
		}
		if (error) {
			System.out.println ("HTML line containing error was:");
			System.out.println (line);
			throw new Exception("Cannot find style file name");
		}
		return line.substring(start, end);
	}
}
