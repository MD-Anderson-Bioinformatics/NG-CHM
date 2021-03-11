/*
	Initial stub of a file for code to handle state management. 
	
	** THIS CODE IS EXPORATORY **
	
	Working with a hand-crafted .ngchm file with an manually written 
	mapConfig.json. 
*/

// Define Namespace for NgChm StateManager
NgChm.createNS('NgChm.STAT')

/*
	Hack to wait for map to be loaded
	
	This will fail if there are no plugins from custom.js
*/
function waitForMapLoaded() {
	if (NgChm.heatMap && NgChm.heatMap.isMapLoaded() && NgChm.LNK.getPanePlugins().length>0) { // map ready 
		let plugins = NgChm.LNK.getPanePlugins()
		let panes = document.getElementsByClassName("pane")
		let paneControl = document.getElementsByClassName("menuItem")

		let pane_configuration = NgChm.heatMap.getPaneConfiguration()
		let config = pane_configuration.plugins[0].config
		let data = pane_configuration.plugins[0].data
		
		let icons = document.getElementsByClassName("paneMenuIcon")
		let iconDetail = icons[1]

		// Open pane below detail pane
		NgChm.Pane.splitPaneCheck(true, NgChm.Pane.findPaneLocation(iconDetail))

		// Open scatter plot plugin
		//NgChm.LNK.newGearDialog(icons[icons.length-1],'pane3')
		let iconScatterPlot = icons[icons.length-1]
		iconScatterPlot.click()
		let scatterPlot = document.querySelectorAll(".ScatterPlot")[0]
		scatterPlot.click()

		// Hack of a wait for things to load, post message to plugin and close gear dialog
		setTimeout(() => {  
			let loc = NgChm.Pane.findPaneLocation(iconScatterPlot)
			let iframe = loc.pane.getElementsByTagName('IFRAME')[0]
			let nonce = iframe.dataset.nonce
			let src = iframe.contentWindow
			src.postMessage({vanodi: { nonce, op:'plot', config, data}},'*')
			NgChm.Pane.clearExistingGearDialog('pane3')
		}, 2000);
	} else { // waiting for map to load
		setTimeout(waitForMapLoaded, 100)
	}
}

waitForMapLoaded()
