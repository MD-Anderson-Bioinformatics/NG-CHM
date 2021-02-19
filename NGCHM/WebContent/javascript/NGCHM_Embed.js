NgChmEmbedSingleMap = function (options) {
	
	//Set all option parameters to defaults if not provided
	const divId = (options.divId === undefined) ? 'iFrameDiv' : options.divId;
	const displayWidth = (options.displayWidth === undefined) ? '100' : options.displayWidth.substring(0,options.displayWidth.length-1);
	const displayHeight = (options.displayHeight === undefined) ? '100' : options.displayHeight.substring(0,options.displayHeight.length-1);
    //Path to widget file. If in servers top level web content directory, just use file name
    //to path to another sub-directory within web content: e.g. './subdir/ngchmWidget-min.js'
    //to path to a URL location e.g. 'http://widgetloc.com/ngchmWidget-1.2.0-min.js' (one we have tested with: 'http://cloudflare.com/..../ngchmWidget-1.2.0-min.js')
    const widgetPath = (options.ngchmWidget === undefined) ? 'ngchmWidget-min.js' : options.ngchmWidget;
    const iFrameName = (options.iframeId === undefined) ? 'mapIframe' : options.iframeId;

	
	
	
	//Retrieve required heat map div (above)
	const embeddedDiv = document.getElementById(divId);
	const ngchmIFrame = document.createElement('iframe');
	ngchmIFrame.name = iFrameName; 
    //Optional configuration for iframe
	ngchmIFrame.scrolling = "no";
	ngchmIFrame.style = "height:"+displayHeight+"%; width:"+displayWidth+"%; border-style:none; ";
    //Required sandbox parameters to permit full heat map functionality
	ngchmIFrame.sandbox = 'allow-scripts allow-same-origin allow-popups allow-forms allow-modals allow-downloads'; 
    //Add Iframe to required DIV
	embeddedDiv.appendChild(ngchmIFrame); 
    //Construct a fully configured embedded iframe and add it to the html page
	var doc = ngchmIFrame.contentWindow.document;
	doc.open();
	doc.write(	"<!DOCTYPE html><HTML><script>function init(){window.parent.setup_"+iFrameName+"();return true;}<");
	doc.write(	"/script><BODY onload='init();'><div style='margin: 1em 0 0 5%; width: 90%;'><div id='NGCHMEmbed' style='display: flex; flex-direction: column; background-color: white; height: 80vh; margin-bottom: 0.25em; border: 2px solid gray; padding: 5px'></div></div><script src='"+widgetPath+"'><")
	doc.write(	"/script></BODY></HTML>");
	doc.close();
}


