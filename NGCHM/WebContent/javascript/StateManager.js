/**
 *	Initial stub of a file for code to handle state management. 
 *	
 *	** THIS CODE IS EXPORATORY **
 *	
 */

/** 
 *	Define Namespace for NgChm StateManager
 */
NgChm.createNS('NgChm.StateMan')

/**
 *	Set up a temporary 'onclick' event on the MDA logo for reconstructing
 *	the panel layout. These are initial ideas for the save-state feature.
 */
NgChm.StateMan.listening = function(event,title) {
	document.getElementById("mdaLogo").onclick = function() {
		reconstructPaneLayout()
		setPanes()
	}
}

/**
 *	Reconstruct base container layout from domJSON output.
 */ 
function reconstructPaneLayout() {
	let elementToReconstruct = document.getElementById('ngChmContainer1')
	let elementJSON = domJSON.toJSON(elementToReconstruct,{absolutePaths:false})
	let reconstructedElement = domJSON.toDOM(elementJSON)
	elementToReconstruct.parentNode.replaceChild(reconstructedElement, elementToReconstruct)
}

/**
 *	For each DOM element with className = 'pane', determine what the content should be,
 *	and set it.
 */
function setPanes() {
	NgChm.DMM.DetailMaps = []
	let panesDisplayed = document.getElementsByClassName("pane")
	for (let i=0; i<panesDisplayed.length; i++) {
		let displayedPane = document.getElementById(panesDisplayed[i].id)
		let newPane = NgChm.Pane.newPane({height: displayedPane.clientHeight+"px", width: displayedPane.clientWidth+"px"}, displayedPane.textContent,
			displayedPane.id)
		displayedPane.parentNode.replaceChild(newPane,displayedPane)
		setPane(newPane.id, newPane.textContent)
	}
}

/**
 *	Set a pane to specified content
 *	
 *	Inputs:
 *	@param {string} paneid id of pane (e.g. 'pane1')
 *	@param {string} paneContentsName content name (e.g. 'PathwayMapper'),
 *	   must match heat map summary name string, detail map string,
 *	   or one of the names of the plugins loaded from custom.js
 *	
 */
function setPane(paneid,paneContentsName) {
	let pane = document.getElementById(paneid)
	let customjsPlugins = NgChm.LNK.getPanePlugins(); // plugins from custom.js
	if (paneContentsName.includes("Heat Map Summary")) {
		NgChm.SUM.switchPaneToSummary(NgChm.Pane.findPaneLocation(pane))
	} else if (paneContentsName.includes("Heat Map Detail")) {
		NgChm.DET.switchPaneToDetail(NgChm.Pane.findPaneLocation(pane),false)
	} else {
		try {
			NgChm.LNK.switchPaneToPlugin(NgChm.Pane.findPaneLocation(pane),
				customjsPlugins.filter(pc => pc.name == paneContentsName)[0])
			let gearIcon = document.getElementById(paneid+'Icon')
			NgChm.Pane.initializeGearIconMenu(gearIcon)
		} catch(err) {
			console.error(err)
			console.error("Specified plugin: ",paneContentsName)
			throw("Error loading plugin")
		}
	}
	NgChm.Pane.resizePane(pane)
}
