"use strict";
/**
 *	Initial stub of a file for code to handle state management. 
 */

NgChm.createNS('NgChm.StateMan');

(function(){

	NgChm.StateMan.reconstructPanelsFromMapConfig = reconstructPanelsFromMapConfig;
	NgChm.StateMan.initializeWithMapConfigData = initializeWithMapConfigData;
	/**
	 *	Reconstruct the panels from data in the mapConfig.json file
	 */
	async function reconstructPanelsFromMapConfig() {
		if (NgChm.heatMap && NgChm.heatMap.isMapLoaded() && NgChm.LNK.getPanePlugins().length>0) { // map ready
			reconstructPanelLayoutFromMapConfig();
			recreateReconstructedPanes();
			setPanesContent()
			addDividerControlsToResizeHelpers();
			addResizeHandlersToContainers();
			window.dispatchEvent(new Event('resize'))
		} else { // wait for NGCHM to initialize itself
			setTimeout(reconstructPanelsFromMapConfig, 100)
		}
	}
	
	/**
	 *	Reconstruct ngChmContainer and pane layout.
	 */ 
	function reconstructPanelLayoutFromMapConfig() {
		let baseNgChmContainer = document.getElementById('ngChmContainer1')
		let panel_layoutJSON = NgChm.heatMap.getPanelConfiguration()['panel_layout'];
		let reconstructedPanelLayout = domJSON.toDOM(panel_layoutJSON)
		baseNgChmContainer.parentNode.replaceChild(reconstructedPanelLayout, baseNgChmContainer)
	}

	/**
	 * Add DividerControl methods to resizeHelper elements
	 */
	function addDividerControlsToResizeHelpers() {
		let dividers = document.getElementsByClassName("resizerHelper")
		for (let i=0; i<dividers.length; i++) {
			dividers[i].dividerController = new NgChm.Pane.DividerControl(dividers[i])
		}
	}

	/**
	 * Add paneresize event handlers to ngChmContainer elements
	 */
	function addResizeHandlersToContainers() {
		let containers = document.getElementsByClassName("ngChmContainer")
		for (let i=0; i<containers.length; i++) {
			containers[i].addEventListener('paneresize', NgChm.Pane.resizeHandler)
		}
	}

	/**
	 *	For each DOM element with className = 'pane' (presumably reconstructed from mapConfig.json),
	 *	replace the element with a pane created from NgChm.Pane.newPane, so that it has all the 
	 *	features panes should have.
	 */
	function recreateReconstructedPanes() {
		NgChm.DMM.DetailMaps = []
		let panes = document.getElementsByClassName("pane")
		for (let i=0; i<panes.length; i++) {
			let displayedPane = document.getElementById(panes[i].id)
			let newPane = NgChm.Pane.newPane({height: displayedPane.clientHeight+"px", width: displayedPane.clientWidth+"px"}, displayedPane.textContent,
			displayedPane.id)
				displayedPane.parentNode.replaceChild(newPane,displayedPane)
		}
	}

	/**
	 *	For each pane, call the function that adds appropriate content
	 */
	function setPanesContent() {
		let panes = document.getElementsByClassName("pane")
		for (let i=0; i<panes.length; i++) {
			setPaneContent(panes[i].id)
		}
		NgChm.Pane.resetPaneCounter(panes.length+1);
	}

	/**
	 *	Set a pane's content based on 'textContent' attribute
	 */
	function setPaneContent(paneid) {
		let pane = document.getElementById(paneid)
		let customjsPlugins = NgChm.LNK.getPanePlugins(); // plugins from custom.js
		if (pane.textContent.includes("Heat Map Summary")) {
			NgChm.SUM.switchPaneToSummary(NgChm.Pane.findPaneLocation(pane))
		} else if (pane.textContent.includes("Heat Map Detail")) {
			NgChm.DET.switchPaneToDetail(NgChm.Pane.findPaneLocation(pane),false)
		} else {
			try {
				let specifiedPlugin = customjsPlugins.filter(pc => pane.textContent.indexOf(pc.name) > -1)[0]
				NgChm.LNK.switchPaneToPlugin(NgChm.Pane.findPaneLocation(pane),specifiedPlugin)
				NgChm.Pane.initializeGearIconMenu(document.getElementById(paneid+'Icon'))
			} catch(err) {
				console.error(err)
				console.error("Specified plugin: ",pane.textContent)
				throw("Error loading plugin")
			}
		}
		NgChm.Pane.resizePane(pane)
	}

	/**
	* Send any exiting data from mapConfig.json to plugin and close Gear Menu
	*/
	function initializeWithMapConfigData(pluginInstance) {
		let paneId = getPaneIdFromInstance(pluginInstance)
		let pluginConfigData = getPluginDataFromMapConfig(paneId)
		if (pluginConfigData) {
			let nonce = pluginInstance.nonce;
			let config = pluginConfigData.config;
			let data = pluginConfigData.data;
			NgChm.LNK.sendMessageToPlugin({nonce, op: 'plot', config, data})
			NgChm.Pane.removePopupNearIcon(document.getElementById(paneId+'Gear'), document.getElementById(paneId+'Icon'))
		} else {
			return false;
		}
	}

	function getPaneIdFromInstance(pluginInstance) {
		let paneId = pluginInstance.iframe.parentElement.parentElement.id
		if (paneId == null) {
			throw "No pane found for this plugin"
		}
		return paneId;
	}

	function getPluginDataFromMapConfig(paneId) {
		let pluginConfigData = NgChm.heatMap.getPanelConfiguration()[paneId]
		return pluginConfigData;
	}

})();

