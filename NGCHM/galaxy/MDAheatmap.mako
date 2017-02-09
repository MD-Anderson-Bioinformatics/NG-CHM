<HTML>
   <HEAD>
      <link rel="stylesheet" href="/plugins/visualizations/MDAheatmap/static/css/NGCHM.css">
      <script src="/plugins/visualizations/MDAheatmap/static/javascript/lib/zip.js"></script>
      <script src="/plugins/visualizations/MDAheatmap/static/javascript/lib/inflate.js"></script>
      <script src="/plugins/visualizations/MDAheatmap/static/javascript/NGCHM_Util.js"></script>
      <script src="/plugins/visualizations/MDAheatmap/static/javascript/SelectionManager.js"></script>
      <script src="/plugins/visualizations/MDAheatmap/static/javascript/MatrixManager.js"></script>
      <script src="/plugins/visualizations/MDAheatmap/static/javascript/ColorMapManager.js"></script>
      <script src="/plugins/visualizations/MDAheatmap/static/javascript/SummaryHeatMapDisplay.js"></script>
      <script src="/plugins/visualizations/MDAheatmap/static/javascript/DetailHeatMapDisplay.js"></script>
      <script src="/plugins/visualizations/MDAheatmap/static/javascript/UserHelpManager.js"></script>
      <script src="/plugins/visualizations/MDAheatmap/static/javascript/UserPreferenceManager.js"></script>
      <script src="/plugins/visualizations/MDAheatmap/static/javascript/PdfGenerator.js"></script>
      <script src="/plugins/visualizations/MDAheatmap/static/javascript/lib/jspdf.debug.js"></script>
 	 <script src="/plugins/visualizations/MDAheatmap/static/javascript/custom.js"></script>

	 <meta id='viewport' name ="viewport" content="">

   </HEAD>
   
   <BODY onresize="chmResize()">
    <%
       from galaxy import model
       users_current_history = trans.history
       url_dict = { }
       dataset_ids = [ trans.security.encode_id( d.id ) for d in users_current_history.datasets ]
       output_datasets = hda.creating_job.output_datasets
       for o in output_datasets:
              url_dict[ o.name ] = trans.security.encode_id( o.dataset_id )
    %>

    <script>
      NgChm.heatMap = null;  //global - heatmap object.
 	  NgChm.staticPath = "/plugins/visualizations/MDAheatmap/static/"; //path for static web content - changes in galaxy.

       var url_dict = ${ h.dumps( url_dict ) };
       var hdaId   = '${trans.security.encode_id( hda.id )}';
       var hdaExt  = '${hda.ext}';
       var ajaxUrl = "${h.url_for( controller='/datasets', action='index')}/" + hdaId + "/display?to_ext=" + hdaExt;

       var xmlhttp=new XMLHttpRequest();
       xmlhttp.open("GET", ajaxUrl, true);
       xmlhttp.responseType = 'blob';
       xmlhttp.onload = function(e) {
           if (this.status == 200) {
               var blob = new Blob([this.response], {type: 'compress/zip'});
               zip.useWebWorkers = false;
               var matrixMgr = new NgChm.MMGR.MatrixManager(NgChm.MMGR.FILE_SOURCE);
               var name = this.getResponseHeader("Content-Disposition");
               if (name.indexOf('[') > -1) {
                 name = name.substring(name.indexOf('[')+1, name.indexOf(']'));
               }               
               NgChm.heatMap = matrixMgr.getHeatMap(name,  NgChm.SUM.processSummaryMapUpdate, blob);
               NgChm.heatMap.addEventListener(NgChm.DET.processDetailMapUpdate);
               NgChm.SUM.initSummaryDisplay();
               NgChm.DET.initDetailDisplay()
           }
       };
       xmlhttp.send();

       function chmResize() {
          NgChm.DET.detailResize();
       }

    </script>

    <div class="mdaServiceHeader">
        <div class="mdaServiceHeaderLogo">
            <img src="/plugins/visualizations/MDAheatmap/static/images/mdandersonlogo260x85.png" alt="">
        </div>
      
	   <div id='detail_buttons' align="center" style="display:none">
 		    <img id='zoomOut_btn' src='/plugins/visualizations/MDAheatmap/static/images/zoom-out.png' alt='Zoom Out' onmouseover='NgChm.UHM.detailDataToolHelp(this,"Zoom Out")' onclick='NgChm.DET.detailDataZoomOut();'   align="top"   />
		    <img id='zoomIn_btn' src='/plugins/visualizations/MDAheatmap/static/images/zoom-in.png' alt='Zoom In' onmouseover='NgChm.UHM.detailDataToolHelp(this,"Zoom In")' onclick='NgChm.DET.detailDataZoomIn();' align="top"   />
		    <img id='full_btn' src='/plugins/visualizations/MDAheatmap/static/images/full_selected.png' alt='Full' onmouseover='NgChm.UHM.detailDataToolHelp(this,"Normal View")' onclick='NgChm.DET.detailNormal();' align="top"   />
		    <img id='ribbonH_btn' src='/plugins/visualizations/MDAheatmap/static/images/ribbonH.png' alt='Ribbon H' onmouseover='NgChm.UHM.detailDataToolHelp(this,"Horizontal Ribbon View",160)' onclick='NgChm.DET.detailHRibbonButton();' align="top"  />
		    <img id='ribbonV_btn' src='/plugins/visualizations/MDAheatmap/static/images/ribbonV.png' alt='Ribbon V' onmouseover='NgChm.UHM.detailDataToolHelp(this,"Vertical Ribbon View",160)' onclick='NgChm.DET.detailVRibbonButton();'  align="top"  />
   		    <span style='display: inline-block;'><b>Search: </b><input type="text" id="search_text" name="search" onkeypress='NgChm.DET.clearSrchBtns();' onchange='NgChm.DET.detailSearch();'
   			                                                     onmouseover='NgChm.UHM.detailDataToolHelp(this,"Search row and column labels.  Enter search term and click Go. The search will find labels that partially match the search text. To find exact matches only, put \"\" characters around the search term.  Multiple search terms can be separated by spaces.  If the search box turns red, none of the search terms were found.  If it turns yellow, only some of the search terms were found.", 400)' ></span>	
		    <img id='go_btn' src='/plugins/visualizations/MDAheatmap/static/images/go.png' alt='Go' onmouseover='NgChm.UHM.detailDataToolHelp(this,"Search Row/Column Labels",180)'  onclick='NgChm.DET.detailSearch();' align="top"  />
		    <img id='prev_btn' src='/plugins/visualizations/MDAheatmap/static/images/prev.png' alt='Previous' onmouseover='NgChm.UHM.detailDataToolHelp(this,"Previous Search Result",160)' style="display:none;" onclick='NgChm.DET.searchPrev();'  align="top"  />
		    <img id='next_btn' src='/plugins/visualizations/MDAheatmap/static/images/next.png' alt='Next' onmouseover='NgChm.UHM.detailDataToolHelp(this,"Next Search Result",160)' style="display:none;" onclick='NgChm.DET.searchNext();'  align="top"  />
		    <img id='cancel_btn' src='/plugins/visualizations/MDAheatmap/static/images/cancel.png' alt='Cancel' onmouseover='NgChm.UHM.detailDataToolHelp(this,"Clear Search Results",160)' style="display:none;" onclick='NgChm.DET.clearSearch();'  align="top"  />
		    <img id='pdf_btn' src='/plugins/visualizations/MDAheatmap/static/images/pdf.png' alt='go' onmouseover='NgChm.UHM.detailDataToolHelp(this,"Save as PDF")' onclick='NgChm.PDF.openPdfPrefs(this,null);'  align="top" style="position: absolute; right: 60;"  />
 	    	    <img id='gear_btn' src='/plugins/visualizations/MDAheatmap/static/images/gear.png' alt='Modify Map' onmouseover='NgChm.UHM.detailDataToolHelp(this,"Modify Map Preferences")' onclick='NgChm.UPM.editPreferences(this,null);' align="top" style="position: absolute; right: 30;"  />
       </div>
    </div>

    <div id="container">

       <div id='summary_chm' style='position: relative;'>
          <canvas id='summary_canvas'></canvas>
		<div id='sumlabelDiv' style="display: inline-block"></div>
       </div>

	  <div id= 'divider' style='position: relative;' onmousedown="NgChm.SUM.dividerStart()" ontouchstart="NgChm.SUM.dividerStart()">
	  </div>

       <div id='detail_chm' style='position: relative;'>
          <canvas id='detail_canvas' style='display: inline-block'></canvas>
          <div id='labelDiv' style="display: inline-block"></div>
       </div>
   </div>

	<div id="pdfPrefsPanel" style="display: none; position: absolute; background-color: rgb(203, 219, 246);">
		<div class="prefsHeader" id="pdfPrefsHeader">PDF Generation</div>
		<table>
			<tbody>
				<tr>
					<td>
						<div id="pdfprefprefs" style="display: block; background-color: rgb(203, 219, 246);">
							<div style="display: inherit; width: 220px; height: 220px;">
								<h3 style="margin-bottom:0px;">Show maps:</h3>
								<input id="pdfInputSummaryMap" type="radio" name="pages" value="summary"> Summary<br>
								<input id="pdfInputDetailMap" type="radio" name="pages" value="detail"> Detail<br>
								<input id="pdfInputBothMaps" type="radio" name="pages" value="both" checked> Both<br><br>
						<!--		<input id="pdfInputPages" type="checkbox" name="pages" value="separate"> Show maps on separate pages<br>		-->					
								<input id="pdfInputPortrait" type="radio" name="orientation" value="portrait"> Portrait 
								<input id="pdfInputLandscape" type="radio" name="orientation" value="Landscape" checked> Landscape <br>							
								<h3 style="margin-bottom:0px;">Show classification bars:</h3>							
								<input id="pdfInputCondensed" type="radio" name="condensed" value="condensed"> Condensed 
								<input id="pdfInputHistogram" type="radio" name="condensed" value="histogram" checked> Histogram <br>							
								<input id="pdfInputColumn" type="checkbox" name="class" value="row" checked> Column<br>							
								<input id="pdfInputRow" type="checkbox" name="class" value="column" checked> Row
							</div>
							<table>
								<tbody>
									<tr>
										<td style="font-weight: bold;">
											<div id="pref_buttons" align="right">
												<img id="prefCancel_btn" src="/plugins/visualizations/MDAheatmap/static/images/prefCancel.png" alt="Cancel changes" onclick="NgChm.PDF.pdfCancelButton();" align="top">&nbsp;&nbsp;
												<img id="prefCreate_btn" src="/plugins/visualizations/MDAheatmap/static/images/createPdf.png" alt="Create PDF" onclick="NgChm.PDF.getPDF();" align="top">
											</div>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</BODY >
</HTML>