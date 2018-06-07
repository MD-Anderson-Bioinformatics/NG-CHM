/*******************************************************************
 * CLASS: ImportConstants
 *
 * This class contains string and int constants to be utilized by the
 * HeatMapDataGenerator process.
 * 
 * Author: Mark Stucky
 * Date: December 14, 2015
 ******************************************************************/

package mda.ngchm.datagenerator;

import java.io.File;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;

public final class ImportConstants {

	//Version #
	public static String CURRENT_GENERATOR_VERSION = "1.1.0";

	//turn debugging on/off
	public static boolean DEBUG = false;

	//Character Constants
	public static String EMPTY = "";
	public static String DOT = ".";
	public static String SPACE = " ";
	public static String LINE_FEED = "\n";
	public static String BACK_SLASH = "\\";
	public static String TAB = "\t";
	public static String COMMA = ",";
	public static String QUOTE = "\"";
	public static String COLON = ":";
	public static String HASHTAG = "#";
	public static String BRACE_OPEN = "{";
	public static String BRACE_CLOSE = "}";
	public static String BRACKET_OPEN = "[";
	public static String BRACKET_CLOSE = "]";
	public static String FILE_SEP = File.separator + File.separator;
	
	//Covariate Bar Types
	public static String SCATTER_PLOT = "scatter_plot";
	public static String COLOR_PLOT = "color_plot";
	public static String BAR_PLOT = "bar_plot";

	//JSON Label Constants
	public static String HEIGHT_LABEL = "\"height\": ";
	public static String SHOW_LABEL = "\"show\": ";
	public static String COLOR_MAP_LABEL = "\"color_map\": ";
	public static String ORGANIZATION_LABEL = "\"organization\": ";
	public static String CLASSIFICATIONS_LABEL = "\"classifications\": ";
	public static String CLASSIFICATIONS_ORDER_LABEL = "\"classifications_order\": ";
	public static String DATA_CONFIG_LABEL = "\"data_configuration\": ";
	public static String ROWDATA_LABEL = "\"row_data\": ";
	public static String MAP_INFO_LABEL = "\"map_information\": ";
	public static String DATA_LAYER_LABEL = "\"data_layer\": ";
	public static String ROW_CONFIG_LABEL = "\"row_configuration\": ";
	public static String COLDATA_LABEL = "\"col_data\": ";
	public static String COL_CONFIG_LABEL = "\"col_configuration\": ";
	public static String TILEROWS_LABEL = "\"tile_rows\": ";
	public static String TILECOLS_LABEL = "\"tile_cols\": ";
	public static String TILEROWSPER_LABEL = "\"rows_per_tile\": ";
	public static String TILECOLSPER_LABEL = "\"cols_per_tile\": ";
	public static String TOTALROWS_LABEL = "\"total_rows\": ";
	public static String TOTALCOLS_LABEL = "\"total_cols\": ";
	public static String MAP_CUT_ROWS_LABEL = "\"map_cut_rows\": ";
	public static String MAP_CUT_COLS_LABEL = "\"map_cut_cols\": ";
	public static String LEVELS_LABEL = "\"levels\" : ";
	public static String ROW_SUMMARY_RATIO_LABEL = "\"row_summary_ratio\": ";
	public static String COL_SUMMARY_RATIO_LABEL = "\"col_summary_ratio\": ";
	public static String COLORMAPS_LABEL = "\"colormaps\" :";
	public static String TYPE_LABEL = "\"type\" :";		
	public static String COLORS_LABEL = "\"colors\" :";	
	public static String DATA_TYPE_LABEL = "\"data_type\" :";	
	public static String THRESHOLDS_LABEL = "\"thresholds\" :";	
	public static String MISSING_LABEL = "\"missing\" :";	
	public static String LABEL_LABEL = "\"label\" :";	
	public static String LABELS_LABEL = "\"labels\" :";	
	public static String LABEL_TYPE_LABEL = "\"label_type\" :";	
	public static String ORDER_METHOD_LABEL = "\"order_method\" :";	
	public static String AGGLOMERATION_LABEL = "\"agglomeration_method\" :";	
	public static String DISTANCE_METRIC_LABEL = "\"distance_metric\" :";	
	public static String NAME_LABEL = "\"name\" :";	
	public static String DESC_LABEL = "\"description\" :";	
	public static String ATTRS_LABEL = "\"attributes\" :";	
	public static String DATA_LAYERS_LABEL = "\"data_layers\" :";	
	public static String DENDROGRAM_LABEL = "\"dendrogram\" :";	
	public static String GRID_SHOW_LABEL = "\"grid_show\" :";	
	public static String GRID_COLOR_LABEL = "\"grid_color\" :";	
	public static String VERSION_LABEL = "\"version_id\" :";	
	public static String LABEL_LENGTH_LABEL = "\"label_display_length\" :";	
	public static String TOP_ITEMS_LABEL = "\"top_items\" :";	
	public static String LABEL_ABBREV_METHOD_LABEL = "\"label_display_method\" :";	
	public static String LABEL_TRUNCATION_LABEL = "\"label_display_truncation\" :";	
	public static String READ_ONLY_LABEL = "\"read_only\" :";	
	public static String SUMMARY_WIDTH_LABEL = "\"summary_width\" :";	
	public static String DETAIL_WIDTH_LABEL = "\"detail_width\" :";	
	public static String SUMMARY_HEIGHT_LABEL = "\"summary_height\" :";	
	public static String DETAIL_HEIGHT_LABEL = "\"detail_height\" :";	
	public static String SELECTION_COLOR_LABEL = "\"selection_color\" :";	
	public static String BAR_TYPE_LABEL = "\"bar_type\" :";	
	public static String FG_COLOR_LABEL = "\"fg_color\" :";	
	public static String BG_COLOR_LABEL = "\"bg_color\" :";	
	public static String LOW_BOUND_LABEL = "\"low_bound\" :";	
	public static String HIGH_BOUND_LABEL = "\"high_bound\" :";	
	
	//PDF Generation Constants
	public static int PDF_CONTENT_START = 725;
	public static int PDF_MAP_SIZE = 430;
	public static int PDF_DENDRO_HEIGHT = 80;
	public static int PDF_CLASS_HEIGHT = 7;
	public static int PDF_ROW_HEIGHT = 12;
	public static int PDF_ROW_POS = 0;
	public static int PDF_COL_POS = 1;
	public static PDFont PDF_FONT = PDType1Font.HELVETICA;
	public static PDFont PDF_FONT_BOLD = PDType1Font.HELVETICA_BOLD;
	public static String GENERATE_PDF = "-PDF";
	public static String GENERATE_NGCHM = "-NGCHM";
	
	//Dendro PNG Generation Constants
	public static int TN_HEIGHT = 60;
	public static int TN_WIDTH = 200;
	public static int PDF_HEIGHT = 161;
	public static int PDF_WIDTH = 600;
	public static int TN_MAX_WIDTH = 210;
	public static int TN_MIN_WIDTH = 170;
	public static int TN_THUMB_WIDTH = TN_MAX_WIDTH + TN_HEIGHT + 1;
	public enum LineSegment {NONE, LEFT_END, MIDDLE, RIGHT_END}
			
	//Data layer constants
	public static String LAYER_THUMBNAIL = "tn";
	public static String LAYER_SUMMARY = "s";
	public static String LAYER_DETAIL = "d";
	public static String LAYER_RIBBONVERT = "rv";
	public static String LAYER_RIBBONHORIZ = "rh";
	
	//JSON file name constants
	public static String HEATMAP_PROPERTIES_FILE = "heatmapProperties.json";
	public static String MAP_DATA_FILE = "mapData.json";
	public static String MAP_CONFIG_FILE = "mapConfig.json";
	public static String BIN_FILE = ".bin";
	public static String TXT_FILE = ".txt";

	//Configuration constants
	public static int THUMB_SIZE = 150;
	public static int TILE_SIZE = 500;
	public static int SUMMARY_SIZE = 1000;
	public static String DEFAULT_HEIGHT = "15";
	public static String ROW = "Row";
	public static String COL = "Column";
	public static String NA = "NA"; 
	public static String NONE =  "None";
	public static String UTF8 = "utf-8";
	public static String YES = "Y";
	public static String NO = "N";
	public static String ALL = "ALL";
	public static String SUMMARY = "SUMMARY";
	public static String COLOR_WHITE = "#FFFFFF";
	public static String TEN = "10";
	public static String HUNDRED = "100";
	public static String COLOR_BLACK = "#000000";
	public static String COLOR_LIME = "#00FF38";
	public static float MAX_VALUES = 2147483647;
	public static float MIN_VALUES = -2147483647;
	public static String LABEL_LENGTH_DEFAULT = "\"20\""; 
	public static String LABEL_TRUNCATE_DEFAULT = "\"END\""; 
	public static String CUT_VALUE = "!CUT!"; 
	public static Set<String> NA_VALUES = new HashSet<String>(Arrays.asList("null","NA","N/A","-","?","NAN","NaN","Na","na","n/a",EMPTY,SPACE));

	
	//JSON node name constants
	public static String READ_ONLY = "read_only";
	public static String SUMMARY_METHOD = "summary_method";
	public static String GRID_SHOW = "grid_show";
	public static String GRID_COLOR = "grid_color";
	public static String SUMMARY_WIDTH = "summary_width";
	public static String DETAIL_WIDTH = "detail_width";
	public static String SUMMARY_HEIGHT = "summary_height";
	public static String DETAIL_HEIGHT  = "detail_height";
	public static String SELECTION_COLOR = "selection_color";
	public static String OUTPUT_LOC = "output_location";
	public static String METHOD_SAMPLE = "sample";
	public static String METHOD_AVERAGE = "average";
	public static String METHOD_MODE = "mode";
	public static String CLASS_FILES =  "classification_files";
	public static String MATRIX_FILES =  "matrix_files";
	public static String DATA_LAYER =  "dl";
	public static String DATA_POSITION =  "DataLayer";
	public static String COL_CLASS =  "ColClass";
	public static String ROW_CLASS =  "RowClass";
	public static String NAME =  "name";
	public static String PATH =  "path";
	public static String SHOW =  "show";
	public static String COLOR_TYPE =  "color_type";
	public static String DATA_TYPE =  "data_type";
	public static String POSITION =  "position";
	public static String HEIGHT =  "height";
	public static String ORDER_HIERARCHICAL =  "Hierarchical";
	public static String ORDER_RANDOM =  "Random";
	public static String ORDER_ORIGINAL =  "Original";
	public static String ORDER_FILE =  "order_file";
	public static String ORDER_METHOD =  "order_method";
	public static String TOP_ITEMS =  "top_items";
	public static String DENDRO_SHOW =  "dendro_show";
	public static String DENDRO_HEIGHT =  "dendro_height";
	public static String CUT_LOCATIONS =  "cut_locations";
	public static String CUT_WIDTH =  "cut_width";
	public static String TREE_CUTS =  "tree_cuts";
	public static String LABEL_MAXIMUM_LENGTH = "label_display_length"; 
	public static String LABEL_ABBREV_METHOD = "label_display_abbreviation";
	public static String DISTANCE_METRIC =  "distance_metric";
	public static String AGGLOMERATION_METHOD =  "agglomeration_method";
	public static String DENDRO_FILE =  "dendro_file";
	public static String EXTRA_FILE = "label_extra_file";
	public static String ROW_CONFIGURATION =  "row_configuration";
	public static String COL_CONFIGURATION =  "col_configuration";
	public static String CHM_NAME = "chm_name";
	public static String CHM_DESC = "chm_description";
	public static String CHM_ATTRS = "chm_attributes"; 
	public static String COLORMAP =  "color_map";
	public static String COLORTYPE_LINEAR =  "linear";
	public static String COLORTYPE_QUANTILE =  "quantile";
	public static String COLORTYPE_DISCRETE = "discrete";
	public static String COLORTYPE_CONTINUOUS = "continuous";
	public static String COLORMAP_TYPE = "type"; 
	public static String CLASS_BAR_TYPE = "bar_type"; 
	public static String CLASS_FG_COLOR = "fg_color"; 
	public static String CLASS_BG_COLOR = "bg_color"; 
	public static String CLASS_LOW_BOUND = "low_bound"; 
	public static String CLASS_HIGH_BOUND = "high_bound"; 
	public static String COLORMAP_THRESHOLDS = "thresholds"; 
	public static String COLORMAP_COLORS = "colors"; 
	public static String COLORMAP_MISSING = "missing"; 
	public static String DATA_START_ROW = "data_start_row";
	public static String DATA_START_COL = "data_start_column"; 
	public static String DATA_END_ROW = "data_end_row"; 
	public static String ROW_COVARIATES = "row_covariates"; 
	public static String COL_COVARIATES = "col_covariates"; 
	public static String VALUE_ROW = "value_row"; 
	public static String VALUE_COL = "value_column"; 
	public static Set<String> NGCHM_FILES = new HashSet<String>(Arrays.asList("mapConfig.json","mapData.json","tn.png","tnPre.png"));
	
	
	public static int RGB_BLACK = -16777216;     
	public static int RGB_WHITE = -1;     

	
	//Mapping constant for colors
	public static String COLOR_NAME_MAP[] = {
			"AliceBlue", "240,248,255",       
			"AntiqueWhite", "250,235,215",
			"AntiqueWhite1", "255,239,219",
			"AntiqueWhite2", "238,223,204",
			"AntiqueWhite3", "205,192,176",
			"AntiqueWhite4", "139,131,120",
			"aquamarine", "127,255,212",
			"aquamarine1", "127,255,212",
			"aquamarine2", "118,238,198",
			"aquamarine3", "102,205,170",
			"aquamarine4", "69,139,116", 
			"azure", "240,255,255",
			"azure1", "240,255,255",
			"azure2", "224,238,238",
			"azure3", "193,205,205",
			"azure4", "131,139,139",
			"beige", "245,245,220",
			"bisque", "255,228,196",
			"bisque1", "255,228,196",
			"bisque2", "238,213,183",
			"bisque3", "205,183,158",
			"bisque4", "139,125,107",
			"black", "0,0,0",      
			"BlanchedAlmond", "255,235,205",
			"blue", "0,0,255",    
			"blue1", "0,0,255",    
			"blue2", "0,0,238",    
			"blue3", "0,0,205",    
			"blue4", "0,0,139",    
			"BlueViolet", "138,43,226", 
			"brown", "165,42,42",  
			"brown1", "255,64,64",  
			"brown2", "238,59,59",  
			"brown3", "205,51,51",  
			"brown4", "139,35,35",  
			"burlywood", "222,184,135",
			"burlywood1", "255,211,155",
			"burlywood2", "238,197,145",
			"burlywood3", "205,170,125",
			"burlywood4", "139,115,85", 
			"CadetBlue", "95,158,160", 
			"CadetBlue1", "152,245,255",
			"CadetBlue2", "142,229,238",
			"CadetBlue3", "122,197,205",
			"CadetBlue4", "83,134,139", 
			"chartreuse", "127,255,0",  
			"chartreuse1", "127,255,0",  
			"chartreuse2", "118,238,0",  
			"chartreuse3", "102,205,0",  
			"chartreuse4", "69,139,0",   
			"chocolate", "210,105,30", 
			"chocolate1", "255,127,36", 
			"chocolate2", "238,118,33", 
			"chocolate3", "205,102,29", 
			"chocolate4", "139,69,19",  
			"coral", "255,127,80", 
			"coral1", "255,114,86", 
			"coral2", "238,106,80", 
			"coral3", "205,91,69",  
			"coral4", "139,62,47",  
			"CornflowerBlue", "100,149,237",
			"cornsilk", "255,248,220",
			"cornsilk1", "255,248,220",
			"cornsilk2", "238,232,205",
			"cornsilk3", "205,200,177",
			"cornsilk4", "139,136,120",
			"cyan", "0,255,255",  
			"cyan1", "0,255,255",  
			"cyan2", "0,238,238",  
			"cyan3", "0,205,205",  
			"cyan4", "0,139,139",  
			"DarkBlue", "0,0,139",    
			"DarkCyan", "0,139,139",  
			"DarkGoldenrod", "184,134,11", 
			"DarkGoldenrod1", "255,185,15", 
			"DarkGoldenrod2", "238,173,14", 
			"DarkGoldenrod3", "205,149,12", 
			"DarkGoldenrod4", "139,101,8",  
			"DarkGray", "169,169,169",
			"DarkGreen", "0,100,0",    
			"DarkGrey", "169,169,169",
			"DarkKhaki", "189,183,107",
			"DarkMagenta", "139,0,139",  
			"DarkOliveGreen", "85,107,47",  
			"DarkOliveGreen1", "202,255,112",
			"DarkOliveGreen2", "188,238,104",
			"DarkOliveGreen3", "162,205,90", 
			"DarkOliveGreen4", "110,139,61", 
			"DarkOrange", "255,140,0",  
			"DarkOrange1", "255,127,0",  
			"DarkOrange2", "238,118,0",  
			"DarkOrange3", "205,102,0",  
			"DarkOrange4", "139,69,0",   
			"DarkOrchid", "153,50,204", 
			"DarkOrchid1", "191,62,255", 
			"DarkOrchid2", "178,58,238", 
			"DarkOrchid3", "154,50,205", 
			"DarkOrchid4", "104,34,139", 
			"DarkRed", "139,0,0",    
			"DarkSalmon", "233,150,122",
			"DarkSeaGreen", "143,188,143",
			"DarkSeaGreen1", "193,255,193",
			"DarkSeaGreen2", "180,238,180",
			"DarkSeaGreen3", "155,205,155",
			"DarkSeaGreen4", "105,139,105",
			"DarkSlateBlue", "72,61,139",  
			"DarkSlateGray", "47,79,79",   
			"DarkSlateGray1", "151,255,255",
			"DarkSlateGray2", "141,238,238",
			"DarkSlateGray3", "121,205,205",
			"DarkSlateGray4", "82,139,139", 
			"DarkSlateGrey", "47,79,79",   
			"DarkTurquoise", "0,206,209",  
			"DarkViolet", "148,0,211",  
			"DeepPink", "255,20,147", 
			"DeepPink1", "255,20,147", 
			"DeepPink2", "238,18,137", 
			"DeepPink3", "205,16,118", 
			"DeepPink4", "139,10,80",  
			"DeepSkyBlue", "0,191,255",  
			"DeepSkyBlue1", "0,191,255",  
			"DeepSkyBlue2", "0,178,238",  
			"DeepSkyBlue3", "0,154,205",  
			"DeepSkyBlue4", "0,104,139",  
			"DimGray", "105,105,105",
			"DimGrey", "105,105,105",
			"DodgerBlue", "30,144,255", 
			"DodgerBlue1", "30,144,255", 
			"DodgerBlue2", "28,134,238", 
			"DodgerBlue3", "24,116,205", 
			"DodgerBlue4", "16,78,139",  
			"firebrick", "178,34,34",  
			"firebrick1", "255,48,48",  
			"firebrick2", "238,44,44",  
			"firebrick3", "205,38,38",  
			"firebrick4", "139,26,26",  
			"FloralWhite", "255,250,240",
			"ForestGreen", "34,139,34",  
			"gainsboro", "220,220,220",
			"GhostWhite", "248,248,255",
			"gold", "255,215,0",  
			"gold1", "255,215,0",  
			"gold2", "238,201,0",  
			"gold3", "205,173,0",  
			"gold4", "139,117,0",  
			"goldenrod", "218,165,32", 
			"goldenrod1", "255,193,37", 
			"goldenrod2", "238,180,34", 
			"goldenrod3", "205,155,29", 
			"goldenrod4", "139,105,20", 
			"gray", "190,190,190",
			"gray0", "0,0,0",      
			"gray1", "3,3,3",      
			"gray10", "26,26,26",   
			"gray100", "255,255,255",
			"gray11", "28,28,28",   
			"gray12", "31,31,31",   
			"gray13", "33,33,33",   
			"gray14", "36,36,36",   
			"gray15", "38,38,38",   
			"gray16", "41,41,41",   
			"gray17", "43,43,43",   
			"gray18", "46,46,46",   
			"gray19", "48,48,48",   
			"gray2", "5,5,5",      
			"gray20", "51,51,51",   
			"gray21", "54,54,54",   
			"gray22", "56,56,56",   
			"gray23", "59,59,59",   
			"gray24", "61,61,61",   
			"gray25", "64,64,64",   
			"gray26", "66,66,66",   
			"gray27", "69,69,69",   
			"gray28", "71,71,71",   
			"gray29", "74,74,74",   
			"gray3", "8,8,8",      
			"gray30", "77,77,77",   
			"gray31", "79,79,79",   
			"gray32", "82,82,82",   
			"gray33", "84,84,84",   
			"gray34", "87,87,87",   
			"gray35", "89,89,89",   
			"gray36", "92,92,92",   
			"gray37", "94,94,94",   
			"gray38", "97,97,97",   
			"gray39", "99,99,99",   
			"gray4", "10,10,10",   
			"gray40", "102,102,102",
			"gray41", "105,105,105",
			"gray42", "107,107,107",
			"gray43", "110,110,110",
			"gray44", "112,112,112",
			"gray45", "115,115,115",
			"gray46", "117,117,117",
			"gray47", "120,120,120",
			"gray48", "122,122,122",
			"gray49", "125,125,125",
			"gray5", "13,13,13",   
			"gray50", "127,127,127",
			"gray51", "130,130,130",
			"gray52", "133,133,133",
			"gray53", "135,135,135",
			"gray54", "138,138,138",
			"gray55", "140,140,140",
			"gray56", "143,143,143",
			"gray57", "145,145,145",
			"gray58", "148,148,148",
			"gray59", "150,150,150",
			"gray6", "15,15,15",   
			"gray60", "153,153,153",
			"gray61", "156,156,156",
			"gray62", "158,158,158",
			"gray63", "161,161,161",
			"gray64", "163,163,163",
			"gray65", "166,166,166",
			"gray66", "168,168,168",
			"gray67", "171,171,171",
			"gray68", "173,173,173",
			"gray69", "176,176,176",
			"gray7", "18,18,18",   
			"gray70", "179,179,179",
			"gray71", "181,181,181",
			"gray72", "184,184,184",
			"gray73", "186,186,186",
			"gray74", "189,189,189",
			"gray75", "191,191,191",
			"gray76", "194,194,194",
			"gray77", "196,196,196",
			"gray78", "199,199,199",
			"gray79", "201,201,201",
			"gray8", "20,20,20",   
			"gray80", "204,204,204",
			"gray81", "207,207,207",
			"gray82", "209,209,209",
			"gray83", "212,212,212",
			"gray84", "214,214,214",
			"gray85", "217,217,217",
			"gray86", "219,219,219",
			"gray87", "222,222,222",
			"gray88", "224,224,224",
			"gray89", "227,227,227",
			"gray9", "23,23,23",   
			"gray90", "229,229,229",
			"gray91", "232,232,232",
			"gray92", "235,235,235",
			"gray93", "237,237,237",
			"gray94", "240,240,240",
			"gray95", "242,242,242",
			"gray96", "245,245,245",
			"gray97", "247,247,247",
			"gray98", "250,250,250",
			"gray99", "252,252,252",
			"green", "0,255,0",    
			"green1", "0,255,0",    
			"green2", "0,238,0",    
			"green3", "0,205,0",    
			"green4", "0,139,0",    
			"GreenYellow", "173,255,47", 
			"grey", "190,190,190",
			"grey0", "0,0,0",      
			"grey1", "3,3,3",      
			"grey10", "26,26,26",   
			"grey100", "255,255,255",
			"grey11", "28,28,28",   
			"grey12", "31,31,31",   
			"grey13", "33,33,33",   
			"grey14", "36,36,36",   
			"grey15", "38,38,38",   
			"grey16", "41,41,41",   
			"grey17", "43,43,43",   
			"grey18", "46,46,46",   
			"grey19", "48,48,48",   
			"grey2", "5,5,5",      
			"grey20", "51,51,51",   
			"grey21", "54,54,54",   
			"grey22", "56,56,56",   
			"grey23", "59,59,59",   
			"grey24", "61,61,61",   
			"grey25", "64,64,64",   
			"grey26", "66,66,66",   
			"grey27", "69,69,69",   
			"grey28", "71,71,71",   
			"grey29", "74,74,74",   
			"grey3", "8,8,8",      
			"grey30", "77,77,77",   
			"grey31", "79,79,79",   
			"grey32", "82,82,82",   
			"grey33", "84,84,84",   
			"grey34", "87,87,87",   
			"grey35", "89,89,89",   
			"grey36", "92,92,92",   
			"grey37", "94,94,94",   
			"grey38", "97,97,97",   
			"grey39", "99,99,99",   
			"grey4", "10,10,10",   
			"grey40", "102,102,102",
			"grey41", "105,105,105",
			"grey42", "107,107,107",
			"grey43", "110,110,110",
			"grey44", "112,112,112",
			"grey45", "115,115,115",
			"grey46", "117,117,117",
			"grey47", "120,120,120",
			"grey48", "122,122,122",
			"grey49", "125,125,125",
			"grey5", "13,13,13",   
			"grey50", "127,127,127",
			"grey51", "130,130,130",
			"grey52", "133,133,133",
			"grey53", "135,135,135",
			"grey54", "138,138,138",
			"grey55", "140,140,140",
			"grey56", "143,143,143",
			"grey57", "145,145,145",
			"grey58", "148,148,148",
			"grey59", "150,150,150",
			"grey6", "15,15,15",   
			"grey60", "153,153,153",
			"grey61", "156,156,156",
			"grey62", "158,158,158",
			"grey63", "161,161,161",
			"grey64", "163,163,163",
			"grey65", "166,166,166",
			"grey66", "168,168,168",
			"grey67", "171,171,171",
			"grey68", "173,173,173",
			"grey69", "176,176,176",
			"grey7", "18,18,18",   
			"grey70", "179,179,179",
			"grey71", "181,181,181",
			"grey72", "184,184,184",
			"grey73", "186,186,186",
			"grey74", "189,189,189",
			"grey75", "191,191,191",
			"grey76", "194,194,194",
			"grey77", "196,196,196",
			"grey78", "199,199,199",
			"grey79", "201,201,201",
			"grey8", "20,20,20",   
			"grey80", "204,204,204",
			"grey81", "207,207,207",
			"grey82", "209,209,209",
			"grey83", "212,212,212",
			"grey84", "214,214,214",
			"grey85", "217,217,217",
			"grey86", "219,219,219",
			"grey87", "222,222,222",
			"grey88", "224,224,224",
			"grey89", "227,227,227",
			"grey9", "23,23,23",   
			"grey90", "229,229,229",
			"grey91", "232,232,232",
			"grey92", "235,235,235",
			"grey93", "237,237,237",
			"grey94", "240,240,240",
			"grey95", "242,242,242",
			"grey96", "245,245,245",
			"grey97", "247,247,247",
			"grey98", "250,250,250",
			"grey99", "252,252,252",
			"honeydew", "240,255,240",
			"honeydew1", "240,255,240",
			"honeydew2", "224,238,224",
			"honeydew3", "193,205,193",
			"honeydew4", "131,139,131",
			"HotPink", "255,105,180",
			"HotPink1", "255,110,180",
			"HotPink2", "238,106,167",
			"HotPink3", "205,96,144", 
			"HotPink4", "139,58,98",  
			"IndianRed", "205,92,92",  
			"IndianRed1", "255,106,106",
			"IndianRed2", "238,99,99",  
			"IndianRed3", "205,85,85",  
			"IndianRed4", "139,58,58",  
			"ivory", "255,255,240",
			"ivory1", "255,255,240",
			"ivory2", "238,238,224",
			"ivory3", "205,205,193",
			"ivory4", "139,139,131",
			"khaki", "240,230,140",
			"khaki1", "255,246,143",
			"khaki2", "238,230,133",
			"khaki3", "205,198,115",
			"khaki4", "139,134,78", 
			"lavender", "230,230,250",
			"LavenderBlush", "255,240,245",
			"LavenderBlush1", "255,240,245",
			"LavenderBlush2", "238,224,229",
			"LavenderBlush3", "205,193,197",
			"LavenderBlush4", "139,131,134",
			"LawnGreen", "124,252,0",  
			"LemonChiffon", "255,250,205",
			"LemonChiffon1", "255,250,205",
			"LemonChiffon2", "238,233,191",
			"LemonChiffon3", "205,201,165",
			"LemonChiffon4", "139,137,112",
			"LightBlue", "173,216,230",
			"LightBlue1", "191,239,255",
			"LightBlue2", "178,223,238",
			"LightBlue3", "154,192,205",
			"LightBlue4", "104,131,139",
			"LightCoral", "240,128,128",
			"LightCyan", "224,255,255",
			"LightCyan1", "224,255,255",
			"LightCyan2", "209,238,238",
			"LightCyan3", "180,205,205",
			"LightCyan4", "122,139,139",
			"LightGoldenrod", "238,221,130",
			"LightGoldenrod1", "255,236,139",
			"LightGoldenrod2", "238,220,130",
			"LightGoldenrod3", "205,190,112",
			"LightGoldenrod4", "139,129,76", 
			"LightGoldenrodYellow", "250,250,210",
			"LightGray", "211,211,211",
			"LightGreen", "144,238,144",
			"LightGrey", "211,211,211",
			"LightPink", "255,182,193",
			"LightPink1", "255,174,185",
			"LightPink2", "238,162,173",
			"LightPink3", "205,140,149",
			"LightPink4", "139,95,101", 
			"LightSalmon", "255,160,122",
			"LightSalmon1", "255,160,122",
			"LightSalmon2", "238,149,114",
			"LightSalmon3", "205,129,98", 
			"LightSalmon4", "139,87,66",  
			"LightSeaGreen", "32,178,170", 
			"LightSkyBlue", "135,206,250",
			"LightSkyBlue1", "176,226,255",
			"LightSkyBlue2", "164,211,238",
			"LightSkyBlue3", "141,182,205",
			"LightSkyBlue4", "96,123,139", 
			"LightSlateBlue", "132,112,255",
			"LightSlateGray", "119,136,153",
			"LightSlateGrey", "119,136,153",
			"LightSteelBlue", "176,196,222",
			"LightSteelBlue1", "202,225,255",
			"LightSteelBlue2", "188,210,238",
			"LightSteelBlue3", "162,181,205",
			"LightSteelBlue4", "110,123,139",
			"LightYellow", "255,255,224",
			"LightYellow1", "255,255,224",
			"LightYellow2", "238,238,209",
			"LightYellow3", "205,205,180",
			"LightYellow4", "139,139,122",
			"LimeGreen", "50,205,50",  
			"linen", "250,240,230",
			"magenta", "255,0,255",  
			"magenta1", "255,0,255",  
			"magenta2", "238,0,238",  
			"magenta3", "205,0,205",  
			"magenta4", "139,0,139",  
			"maroon", "176,48,96",  
			"maroon1", "255,52,179", 
			"maroon2", "238,48,167", 
			"maroon3", "205,41,144", 
			"maroon4", "139,28,98",  
			"MediumAquamarine", "102,205,170",
			"MediumBlue", "0,0,205",    
			"MediumOrchid", "186,85,211", 
			"MediumOrchid1", "224,102,255",
			"MediumOrchid2", "209,95,238", 
			"MediumOrchid3", "180,82,205", 
			"MediumOrchid4", "122,55,139", 
			"MediumPurple", "147,112,219",
			"MediumPurple1", "171,130,255",
			"MediumPurple2", "159,121,238",
			"MediumPurple3", "137,104,205",
			"MediumPurple4", "93,71,139",  
			"MediumSeaGreen", "60,179,113", 
			"MediumSlateBlue", "123,104,238",
			"MediumSpringGreen","0,250,154",  
			"MediumTurquoise", "72,209,204", 
			"MediumVioletRed", "199,21,133", 
			"MidnightBlue", "25,25,112",  
			"MintCream", "245,255,250",
			"MistyRose", "255,228,225",
			"MistyRose1", "255,228,225",
			"MistyRose2", "238,213,210",
			"MistyRose3", "205,183,181",
			"MistyRose4", "139,125,123",
			"moccasin", "255,228,181",
			"NavajoWhite", "255,222,173",
			"NavajoWhite1", "255,222,173",
			"NavajoWhite2", "238,207,161",
			"NavajoWhite3", "205,179,139",
			"NavajoWhite4", "139,121,94", 
			"navy", "0,0,128",    
			"NavyBlue", "0,0,128",    
			"OldLace", "253,245,230",
			"OliveDrab", "107,142,35", 
			"OliveDrab1", "192,255,62", 
			"OliveDrab2", "179,238,58", 
			"OliveDrab3", "154,205,50", 
			"OliveDrab4", "105,139,34", 
			"orange", "255,165,0",  
			"orange1", "255,165,0",  
			"orange2", "238,154,0",  
			"orange3", "205,133,0",  
			"orange4", "139,90,0",   
			"OrangeRed", "255,69,0",   
			"OrangeRed1", "255,69,0",   
			"OrangeRed2", "238,64,0",   
			"OrangeRed3", "205,55,0",   
			"OrangeRed4", "139,37,0",   
			"orchid", "218,112,214",
			"orchid1", "255,131,250",
			"orchid2", "238,122,233",
			"orchid3", "205,105,201",
			"orchid4", "139,71,137", 
			"PaleGoldenrod", "238,232,170",
			"PaleGreen", "152,251,152",
			"PaleGreen1", "154,255,154",
			"PaleGreen2", "144,238,144",
			"PaleGreen3", "124,205,124",
			"PaleGreen4", "84,139,84",  
			"PaleTurquoise", "175,238,238",
			"PaleTurquoise1", "187,255,255",
			"PaleTurquoise2", "174,238,238",
			"PaleTurquoise3", "150,205,205",
			"PaleTurquoise4", "102,139,139",
			"PaleVioletRed", "219,112,147",
			"PaleVioletRed1", "255,130,171",
			"PaleVioletRed2", "238,121,159",
			"PaleVioletRed3", "205,104,137",
			"PaleVioletRed4", "139,71,93",  
			"PapayaWhip", "255,239,213",
			"PeachPuff", "255,218,185",
			"PeachPuff1", "255,218,185",
			"PeachPuff2", "238,203,173",
			"PeachPuff3", "205,175,149",
			"PeachPuff4", "139,119,101",
			"peru", "205,133,63", 
			"pink", "255,192,203",
			"pink1", "255,181,197",
			"pink2", "238,169,184",
			"pink3", "205,145,158",
			"pink4", "139,99,108", 
			"plum", "221,160,221",
			"plum1", "255,187,255",
			"plum2", "238,174,238",
			"plum3", "205,150,205",
			"plum4", "139,102,139",
			"PowderBlue", "176,224,230",
			"purple", "160,32,240", 
			"purple1", "155,48,255", 
			"purple2", "145,44,238", 
			"purple3", "125,38,205", 
			"purple4", "85,26,139",  
			"red", "255,0,0",    
			"red1", "255,0,0",    
			"red2", "238,0,0",    
			"red3", "205,0,0",    
			"red4", "139,0,0",    
			"RosyBrown", "188,143,143",
			"RosyBrown1", "255,193,193",
			"RosyBrown2", "238,180,180",
			"RosyBrown3", "205,155,155",
			"RosyBrown4", "139,105,105",
			"RoyalBlue", "65,105,225", 
			"RoyalBlue1", "72,118,255", 
			"RoyalBlue2", "67,110,238", 
			"RoyalBlue3", "58,95,205",  
			"RoyalBlue4", "39,64,139",  
			"SaddleBrown", "139,69,19",  
			"salmon", "250,128,114",
			"salmon1", "255,140,105",
			"salmon2", "238,130,98", 
			"salmon3", "205,112,84", 
			"salmon4", "139,76,57",  
			"SandyBrown", "244,164,96", 
			"SeaGreen", "46,139,87",  
			"SeaGreen1", "84,255,159", 
			"SeaGreen2", "78,238,148", 
			"SeaGreen3", "67,205,128", 
			"SeaGreen4", "46,139,87",  
			"seashell", "255,245,238",
			"seashell1", "255,245,238",
			"seashell2", "238,229,222",
			"seashell3", "205,197,191",
			"seashell4", "139,134,130",
			"sienna", "160,82,45",  
			"sienna1", "255,130,71", 
			"sienna2", "238,121,66", 
			"sienna3", "205,104,57", 
			"sienna4", "139,71,38",  
			"SkyBlue", "135,206,235",
			"SkyBlue1", "135,206,255",
			"SkyBlue2", "126,192,238",
			"SkyBlue3", "108,166,205",
			"SkyBlue4", "74,112,139", 
			"SlateBlue", "106,90,205", 
			"SlateBlue1", "131,111,255",
			"SlateBlue2", "122,103,238",
			"SlateBlue3", "105,89,205", 
			"SlateBlue4", "71,60,139",  
			"SlateGray", "112,128,144",
			"SlateGray1", "198,226,255",
			"SlateGray2", "185,211,238",
			"SlateGray3", "159,182,205",
			"SlateGray4", "108,123,139",
			"SlateGrey", "112,128,144",
			"snow", "255,250,250",
			"snow1", "255,250,250",
			"snow2", "238,233,233",
			"snow3", "205,201,201",
			"snow4", "139,137,137",
			"SpringGreen", "0,255,127",  
			"SpringGreen1", "0,255,127",  
			"SpringGreen2", "0,238,118",  
			"SpringGreen3", "0,205,102",  
			"SpringGreen4", "0,139,69",   
			"SteelBlue", "70,130,180", 
			"SteelBlue1", "99,184,255", 
			"SteelBlue2", "92,172,238", 
			"SteelBlue3", "79,148,205", 
			"SteelBlue4", "54,100,139", 
			"tan", "210,180,140",
			"tan1", "255,165,79", 
			"tan2", "238,154,73", 
			"tan3", "205,133,63", 
			"tan4", "139,90,43",  
			"thistle", "216,191,216",
			"thistle1", "255,225,255",
			"thistle2", "238,210,238",
			"thistle3", "205,181,205",
			"thistle4", "139,123,139",
			"tomato", "255,99,71",  
			"tomato1", "255,99,71",  
			"tomato2", "238,92,66",  
			"tomato3", "205,79,57",  
			"tomato4", "139,54,38",  
			"turquoise", "64,224,208", 
			"turquoise1", "0,245,255",  
			"turquoise2", "0,229,238",  
			"turquoise3", "0,197,205",  
			"turquoise4", "0,134,139",  
			"violet", "238,130,238",
			"VioletRed", "208,32,144", 
			"VioletRed1", "255,62,150", 
			"VioletRed2", "238,58,140", 
			"VioletRed3", "205,50,120", 
			"VioletRed4", "139,34,82",  
			"wheat", "245,222,179",
			"wheat1", "255,231,186",
			"wheat2", "238,216,174",
			"wheat3", "205,186,150",
			"wheat4", "139,126,102",
			"white", "255,255,255",
			"WhiteSmoke", "245,245,245",
			"yellow", "255,255,0",  
			"yellow1", "255,255,0",  
			"yellow2", "238,238,0",  
			"yellow3", "205,205,0",  
			"yellow4", "139,139,0",  
			"YellowGreen", "154,205,50"}; 
}
