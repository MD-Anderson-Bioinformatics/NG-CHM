/*******************************************************************
 * CLASS: NGCHM_ServerAppGenerator
 *
 * This class contains the logic necessary to transform the viewer source
 * codes (chm.html and supporting CSS and Javascript) into an optimized
 * NG-CHM Viewer application provided by a server (such as shaidy server).
 *
 * This class is typically called from the ANT script (build_ngchmApp.xml).
 *
 * The generator copies chm.html and all CSS, Javascript, and image files
 * used in chm.html, and its included files, from the source directory to the
 * output directory.
 *
 * Javascript and CSS files included by the generated chm.html are renamed
 * to include the SHA-1 hash of their contents.  Thus, updated versions
 * of the included files will not be in client caches, whereas files that have
 * not been updated will have the same hash and will continue to be available
 * from client caches.
 *
 * CSS files can be included in the same place in the head of chm.html
 * (say, if needed for painting the initial screen) or they can be deferred
 * to the end of the generated file.  To defer loading of a CSS file
 * include the HTML comment <!--DEFER--> on the line that includes it.
 * The deferred CSS will be injected into the HEAD element using a separate
 * Javascript file that is loaded after all others.
 *
 * Javascript files included by chm.html are concatenated into large "chunks"
 * and passed through the closure compiler to minimize their size.  The
 * start of a new chunk is specified by including a line containing the HTML
 * comment <!-- NEW CHUNK --> before the first script tag of the new chunk.
 *
 * No transformations to included images are performed by this tool.
 * However, all referenced images are copied to the output directory under "/images".
 * The number of distinct references to each image is tracked and a table of the
 * number of references to each image is output to the console at the end of the job.
 *
 * The ngchm-mode data attribute is added to the document body element
 * with value 'server-app'.
 *
 * The custom link out file (custom.js) is minimized and copied to the output
 * directory, but is not included in the chm.html file.  The name of the
 * minimized custom.js file is added to the document body element as the
 * value of the ngchm-custom-file data attribute.
 *
 * Note: images referenced in the custom.js file and not automatically copied to
 *       the output directory.
 *
 * Usage:
 *
 * Argument1: Input - Path to the Web directory (e.g. ./WebContent/)
 *				of the project
 * Argument2: Output - Path to output for server app (e.g. ./dist/)
 *
 * Argument3: Input - Path to the closure compiler jar file.
 *
 * Author: Bradley Broom
 * based in part on code originally created by Mark Stucky
 * Date: January, 2022
 ******************************************************************/

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

public class NGCHM_ServerAppGenerator {

	/*******************************************************************
	 * METHOD: getFileBytes
	 *
	 * This method reads in a file as a byte array.
	 ******************************************************************/
	private static byte[] getFileBytes (String fileName) throws Exception {
		byte[] bytes = new byte[0];
		try {
			File file = new File(fileName);
			FileInputStream fileInputStreamReader = new FileInputStream(file);
			bytes = new byte[(int)file.length()];
			fileInputStreamReader.read(bytes);
			fileInputStreamReader.close();
		} catch (Exception e) {
			System.out.println("Usage: Error reading file bytes " + fileName);
			e.printStackTrace();
			System.exit(1);
		}
		return bytes;
	}

	/*******************************************************************
	 * METHOD: encodeFileToBase64Binary
	 *
	 * This method reads in an image file and converts it to a base64-encoded
	 * string representation.  It is not current used.  It is kept in case
	 * we ever need it again.
	 ******************************************************************/
	private static String encodeFileToBase64Binary(String image) {
		String encodedfile = null;
		try {
			byte[] bytes = getFileBytes (image);
			encodedfile = "data:image/png;base64," + Base64.getEncoder().encodeToString(bytes);
		} catch (Exception e) {
			System.out.println("Usage: Error encoding image " + image);
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
			System.out.println("Usage: Error digesting file " + fileName);
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
	private static void copyFile (String inputFile, String outputFile) {
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
			System.out.println("Usage: Error copying file " + inputFile + " to " + outputFile);
			e.printStackTrace();
			System.exit(1);
		}
	}

	/*******************************************************************
	 * Static members imageFiles and imageCounts.
	 *
	 * These two lists are used to count the number of distinct times each
	 * image is references in the source files.  imageCounts[idx] is the
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
	private static void copyLineAndImages (String line, String inputDir, String outputDir) throws Exception {
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
						copyFile (inputDir + "/" + fileName, outputDir + "/" + fileName);
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
	private static void outputImageCounts () {
		int N = imageFiles.size();
		System.out.println("\nCount  Image file name\n");
		for (int i = 0; i < N; i++) {
			System.out.println (String.format("%5d", imageCounts.get(i)) + ": " + imageFiles.get(i));
		}
	}

	/*******************************************************************
	 * METHOD: minify
	 *
	 * This method minimizes the Javascript source file srcFile using the
	 * closure compiler at the SIMPLE_OPTIMIZATIONS level.
	 * The minimized output file is written to the outDir directory.
	 * The name of the output file is formed by concatenating the supplied prefix,
	 * the SHA-1 digest of the file's contents, and the supplied suffix.
	 * Error/warning messages written by the closure compiler to its
	 * standard error are output to the console.
	 *
	 * The name of the minified file is returned.
	 *
	 ******************************************************************/
	public static String minify (String srcFile, String outDir, String prefix, String suffix, String closure)
		throws FileNotFoundException, IOException
	{
		String tmpFile = outDir + "/tmp.min" + suffix;
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

		String digest = getFileDigest(tmpFile);
		String minFile = prefix + digest + suffix;
		File tmp = new File(tmpFile);
		File min = new File(outDir + "/" + minFile);
		if (!min.exists()) {
		    tmp.renameTo(min);
		}
	        System.out.println (srcFile + " => " + minFile);
		return minFile;
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
		        copyLineAndImages (line, srcDir, outputDir);
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
        public static String readFileAsString(String srcDir, String outputDir, String fileName) throws Exception {
		StringBuffer strBuff = new StringBuffer();

		BufferedReader br = new BufferedReader(new FileReader(srcDir + "/" + fileName));
		String line = br.readLine();
		while (line != null) {
		        copyLineAndImages (line, srcDir, outputDir);
			strBuff.append(line+"\n");
			line = br.readLine();
		}
		br.close();
		return strBuff.toString();
        }

	/*******************************************************************
	 * METHOD: injectInlineCSS
	 *
	 * This method copies cssFile from srcDir to serverDir and a new name
	 * that includes the digest of the file's contents.
	 *
	 * Any images referenced by the cssFile are copied from srcDir to serverDir.
	 *
	 * A link element referencing the new css file is output to the BufferedWriter
	 * for the chm.html file being output.
	 *
	 ******************************************************************/
	public static void injectInlineCSS (String cssFile, String srcDir, String serverDir, BufferedWriter bw)
	{
		try {
			String srcFile = srcDir + "/" + cssFile;
			BufferedReader br = new BufferedReader(new FileReader(srcFile));
			String line = br.readLine();
			while (line != null) {
				copyLineAndImages (line, srcDir, serverDir);
				line = br.readLine();
			}
			br.close();
			String digest = getFileDigest(srcFile);
			String digestFile = "css/ngchm-" + digest + ".css";
			copyFile (srcFile, serverDir + "/" + digestFile);

			bw.write("<link rel='stylesheet' type='text/css' href='" +  digestFile + "'>\n");
		} catch (Exception e) {
			System.out.println("NGCHM_ServerAppGenerator failed when processing " + cssFile);
			e.printStackTrace();
			System.exit(1);
		}
	}

	/*******************************************************************
	 * METHOD: injectDeferredCSS
	 *
	 * This method creates a minified Javascript module for injecting
	 * deferred CSS into the document's head element.
	 *
	 * The generated Javascript is minified and given a name that includes
	 * a SHA-1 digest of its contents.
	 *
	 * A script element referencing the new Javascript  file is output to the BufferedWriter
	 * for the chm.html file being output.
	 *
	 ******************************************************************/
	public static void injectDeferredCSS (int chunkNumber, StringBuffer css, String serverDir, BufferedWriter bw, String closure)
		throws FileNotFoundException, IOException
	{
		String js = "(function() {\n"
		          + "var css = document.createElement('style');\n"
		          + "css.type='text/css';\n"
		          + "css.textContent='" + css.toString() + "';\n"
		          + "document.head.appendChild(css);\n"
		          + "})()\n";

		String chunkFile = serverDir + "/javascript/chunk" + chunkNumber + ".js";
		BufferedWriter cw = new BufferedWriter(new FileWriter(chunkFile));
		cw.write(js);
		cw.close();
		String minChunkFile = minify (chunkFile, serverDir, "javascript/ngchm-", ".js", closure);

		bw.write("<script defer src='" + minChunkFile + "'></script>\n");
	}

	/*******************************************************************
	 * METHOD: outputChunk
	 *
	 * This method creates a minified Javascript module for the current
	 * chunk of accumulated Javascript.
	 *
	 * The accumulated Javascript is minified and given a name that includes
	 * a SHA-1 digest of its contents.
	 *
	 * A script element referencing the new Javascript file is output to the BufferedWriter
	 * for the chm.html file being output.
	 *
	 ******************************************************************/
	public static void outputChunk (int chunkNumber, StringBuffer scriptBuffer, String serverDir, BufferedWriter bw, String closure)
		throws FileNotFoundException, IOException
	{
		String chunkFile = serverDir + "/javascript/chunk" + chunkNumber + ".js";
		BufferedWriter cw = new BufferedWriter(new FileWriter(chunkFile));
		cw.write(scriptBuffer.toString());
		cw.close();
		String minChunkFile = minify (chunkFile, serverDir, "javascript/ngchm-", ".js", closure);

		bw.write("<script defer src='" + minChunkFile + "'></script>\n");
	}

	private static void testDirectory (String path)
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

	/*******************************************************************
	 * METHOD: main
	 *
	 * This method is the driver for the entire server-app html file
	 * build process.
	 *
	 ******************************************************************/
	public static void main(String[] args) {
		System.out.println("BEGIN NGCHM_ServerAppGenerator  " + new Date());

		if (args.length < 3) {
			System.out.println("Usage: NGCHM_ServerAppGenerator <web directory> <output directory> <closure.jar path>");
			System.exit(1);
		}

		if (args[0].equals(args[1])) {
			System.out.println("Error: <web directory> must differ from <output directory>");
			System.exit(1);
		}

		// Check that the output directories exist and maken them if not.
		testDirectory (args[1]);
		testDirectory (args[1] + "/images");
		testDirectory (args[1] + "/css");
		testDirectory (args[1] + "/javascript");

		// Process custom javascript early so we know the name of the minified custom.js.
		// We will add a ngchm-custom-file data attribute to the document body so that the
		// Javascript can determine its location.
		String customFile = "";
		try {
			String srcFile = args[0] + "/javascript/custom/custom.js";
			customFile = minify (srcFile, args[1], "javascript/custom-", ".js", args[2]);
		} catch (Exception e) {
			System.out.println("NGCHM_ServerAppGenerator failed when processing javascript/custom/custom.js");
			e.printStackTrace();
			System.exit(1);
		}


		try {
			BufferedReader br = new BufferedReader(new FileReader(args[0] + "chm.html" ));
			BufferedWriter bw = new BufferedWriter(new FileWriter(args[1] + "chm.html" ));
			int chunkNumber = 1;
			StringBuffer scriptedLines = new StringBuffer();
			StringBuffer cssLines = new StringBuffer();
			boolean isScript = false;

			String line = br.readLine();
			while (line != null) {
				if (line.contains("text/Javascript")) {
					//Beginning of embedded Javascript in chm.html
					scriptedLines.append("/* BEGIN chm.html Javascript: */\n");
					isScript = true;
				} else if (isScript && line.contains("</script>")) {
					//End of embedded Javascript in chm.html
					scriptedLines.append("/* END chm.html Javascript: */\n\n");
					isScript = false;
				} else if (isScript) {
					scriptedLines.append(line + "\n");
				} else if (line.contains("NEW CHUNK") && (scriptedLines.length() > 0)) {
					outputChunk (chunkNumber, scriptedLines, args[1], bw, args[2]);
					chunkNumber++;
					scriptedLines.setLength(0);
				} else if (line.contains("src=\"javascript")){
					// Add to current chunk.
					String jsFile = line.substring(line.indexOf("src=\"")+5,line.indexOf("?"));
					scriptedLines.append (readFileAsString (args[0], args[1], jsFile));
				}  else if (line.contains("<link rel=\"stylesheet")) {
					String cssFile = line.substring(line.indexOf("href=\"")+6,line.indexOf("?"));
					if (line.contains("<!--DEFER-->")) {
						// Save css to be added into html file later.
						cssLines.append (readStyleAsString(args[0], args[1], cssFile));
					} else {
						injectInlineCSS (cssFile, args[0], args[1], bw);
					}
				} else if (line.contains("<body")) {
					if (customFile.length() > 0) {
						line = line.replace ("<body", "<body data-ngchm-custom-file='" + customFile + "'");
					}
					line = line.replace ("<body", "<body data-ngchm-mode='server-app'");
					bw.write(line+"\n");
				} else if (line.contains("</body>")) {
					// Write any remaining javascript just before closing body tag.
					if (scriptedLines.length() > 0) {
						outputChunk (chunkNumber, scriptedLines, args[1], bw, args[2]);
						chunkNumber++;
					}
					// Inject any deferred CSS.
					if (cssLines.length() > 0) {
						injectDeferredCSS (chunkNumber, cssLines, args[1], bw, args[2]);
						chunkNumber++;
						cssLines.setLength(0);
					}
					// Close the body.
					bw.write(line+"\n");
				} else {
					//This is standard HTML, write out to html string
					copyLineAndImages (line, args[0], args[1]);
					bw.write(line+"\n");
				}
				line = br.readLine();
			}
			bw.close();
			br.close();
		} catch (Exception e) {
			System.out.println("NGCHM_ServerAppGenerator failed when processing chm.html");
			e.printStackTrace();
			System.exit(1);
		}

		System.out.println("END NGCHM_ServerAppGenerator " + new Date());
		outputImageCounts ();

		System.exit(0);

	}

}
