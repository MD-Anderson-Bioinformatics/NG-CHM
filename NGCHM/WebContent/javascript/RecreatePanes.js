
/**
 *	NGCHM namespace responsible for reconstructing a saved pane layout.
 */

NgChm.createNS('NgChm.RecPanes');

(function(){
	"use strict";
	NgChm.RecPanes.reconstructPanelsFromMapConfig = reconstructPanelsFromMapConfig;
	NgChm.RecPanes.initializePluginWithMapConfigData = initializePluginWithMapConfigData;

	/**
	 * Reconstruct the panels from data in the mapConfig.json file
	 *
	 * This function combines and if/else with setTmeout in order to wait for the general 
	 * initialization of the NGCHM to complete before attempting to reconstruct the panel layout. 
	 * This is a hack.
	 * TODO: Understand the NGCHM initialization code well enough to not need this hack.
	 */
	async function reconstructPanelsFromMapConfig() {
		if (NgChm.heatMap && NgChm.heatMap.isMapLoaded() && NgChm.LNK.getPanePlugins().length>0) { // map ready
			NgChm.RecPanes.savedInitialDetailPane = document.getElementById('detail_chm');
			NgChm.RecPanes.mapConfigPanelConfiguration = Object.assign({},NgChm.heatMap.getPanelConfiguration());
			reconstructPanelLayoutFromMapConfig();
			recreateReconstructedPanes();
			setPanesContent();
			setSelections();;
			addDividerControlsToResizeHelpers();
			addResizeHandlersToContainers();
			window.dispatchEvent(new Event('resize'));
			NgChm.SUM.summaryPaneResizeHandler();
			NgChm.heatMap.setUnAppliedChanges(false);
			setFlickState();
			setNextMapNumber();
			setTimeout(() => {
				NgChm.SEL.updateSelections(true);
				NgChm.UTIL.UI.hideLoader();  // Hide loader screen, display NG-CHM.
			}, 500);
		} else { // wait for NGCHM to initialize itself
			setTimeout(reconstructPanelsFromMapConfig, 500);
		}
	}

	/**
	 *	Reconstruct ngChmContainer and pane layout.
	 */ 
	function reconstructPanelLayoutFromMapConfig() {
		try {
			let panel_layoutJSON = NgChm.RecPanes.mapConfigPanelConfiguration.panel_layout;
			let reconstructedPanelLayout = domJSON.toDOM(panel_layoutJSON);
			NgChm.UTIL.containerElement.replaceChildren(...reconstructedPanelLayout.firstChild.children);
		} catch(err) {
			console.error("Cannot reconstruct panel layout: "+err);
			throw "Error reconstructing panel layout from mapConfig.";
		}
	}

	/**
	 * Add DividerControl methods to resizeHelper elements
	 */
	function addDividerControlsToResizeHelpers() {
		let dividers = document.getElementsByClassName("resizerHelper");
		for (let i=0; i<dividers.length; i++) {
			dividers[i].dividerController = new NgChm.Pane.DividerControl(dividers[i]);
		}
	}

	/**
	 * Add paneresize event handlers to ngChmContainer elements
	 */
	function addResizeHandlersToContainers() {
		let containers = document.getElementsByClassName("ngChmContainer");
		for (let i=0; i<containers.length; i++) {
			containers[i].addEventListener('paneresize', NgChm.Pane.resizeHandler);
		}
	}

	/**
	 *	For each DOM element with className = 'pane' (presumably reconstructed from mapConfig.json),
	 *	replace the element with a pane created from NgChm.Pane.newPane, so that it has all the 
	 *	features panes should have.
	 */
	function recreateReconstructedPanes() {
		NgChm.DMM.DetailMaps = [];
		let panes = document.getElementsByClassName("pane");
		for (let i=0; i<panes.length; i++) {
			let displayedPane = document.getElementById(panes[i].id);
			let newPane = NgChm.Pane.newPane({height: displayedPane.clientHeight+"px", width: displayedPane.clientWidth+"px"}, displayedPane.textContent,
				displayedPane.id);
			displayedPane.parentNode.replaceChild(newPane,displayedPane);
		}
	}

	/**
	 *	Iterate over panes and set their content
	 *	The sort is included so that 'nextMapNumber' (i.e. the number suffix to id = 'detail_chm*')
	 *	goes smoothly
	 */
	function setPanesContent() {
		let panesArray = Array.from(document.getElementsByClassName("pane"));
		panesArray.sort(function(a, b) { // sort to numerical pane order 
			if (a.id > b.id) return 1;  // e.g.: 'pane3' > 'pane2' = true
			if (a.id < b.id) return -1;  // e.g.: 'pane3' < 'pane4' = true
			return 0;
		})
		panesArray.forEach(pane => {
			setPaneContent(pane.id);
		})
		NgChm.Pane.resetPaneCounter(getHighestPaneId() + 1);
	}

	/**
		Return hightest pane id for panes currently in DOM
	*/
	function getHighestPaneId() {
		let panes = document.getElementsByClassName("pane");
		try {
			let paneIds = [...panes].map(p => {return p.id;}).map(p => {return parseInt(p.replace('pane',''));});
			return Math.max(...paneIds);
		} catch(err) {
			console.error("Cannot determine hightest pane id");
			throw err;
		}
	}

	/**
	 * Iterate over panes and return the primary detail pane. If no primary detail pane,
	 * return null.
	 */
	function getPrimaryDetailPane() {
		let panes = document.getElementsByClassName("pane");
		for (let i=0; i<panes.length; i++) {
			let pane = document.getElementById(panes[i].id);
			if (pane.textContent.includes("Heat Map Detail - Primary")) {
				return pane;
			}
		}
		return null;
	}

	function setSelections() {
		if (!NgChm.RecPanes.mapConfigPanelConfiguration.hasOwnProperty('selections')) return;
		let rowSelections = NgChm.RecPanes.mapConfigPanelConfiguration['selections']['row'];
		NgChm.SRCH.setAxisSearchResultsVec('Row', rowSelections);
		let colSelections = NgChm.RecPanes.mapConfigPanelConfiguration['selections']['col'];
		NgChm.SRCH.setAxisSearchResultsVec('Column', colSelections);
	}

	/**
	 *	Set a pane's content based on 'textContent' attribute, unless a primary pane (then just
	 *	return)
	 */
	function setPaneContent(paneid) {
		let pane = document.getElementById(paneid);
		if (pane.textContent.includes("Heat Map Summary")) {
			NgChm.SUM.switchPaneToSummary(NgChm.Pane.findPaneLocation(pane));
			delete NgChm.RecPanes.mapConfigPanelConfiguration[paneid];
		} else if (pane.textContent.includes("Heat Map Detail")) {
			let paneInfo = getPaneInfoFromMapConfig(paneid);
			paneInfo.versionNumber == "" ? NgChm.DMM.nextMapNumber = 1 : NgChm.DMM.nextMapNumber = parseInt(paneInfo.versionNumber)-1;
			NgChm.DET.switchPaneToDetail(NgChm.Pane.findPaneLocation(pane));
			if (paneInfo.version == "P") {
				NgChm.DMM.switchToPrimary(pane.childNodes[1]);
			}
			NgChm.DET.updateDisplayedLabels();
			// set zoom/pan state of detail map
			let mapItem = NgChm.DMM.getMapItemFromPane(pane.id);
			mapItem.currentCol = paneInfo.currentCol;
			mapItem.currentRow = paneInfo.currentRow;
			mapItem.dataBoxHeight = paneInfo.dataBoxHeight;
			mapItem.dataBoxWidth = paneInfo.dataBoxWidth;
			mapItem.dataPerCol = paneInfo.dataPerCol;
			mapItem.dataPerRow = paneInfo.dataPerRow;
			mapItem.mode = paneInfo.mode;
			let zoomBoxSizeIdx = NgChm.DET.zoomBoxSizes.indexOf(paneInfo.dataBoxWidth);
			switch (paneInfo.mode) {
				case "NORMAL":
					NgChm.DET.setDetailDataSize(mapItem, NgChm.DET.zoomBoxSizes[zoomBoxSizeIdx]);
					break;
				case "RIBBONV":
					NgChm.DEV.detailVRibbon(mapItem);
					break;
				case "RIBBONH":
					NgChm.DEV.detailHRibbon(mapItem);
					break;
				case "FULL_MAP":
					NgChm.DEV.detailFullMap(mapItem);
					break;
				default: // just use the 'NORMAL' case for unknown modes
					NgChm.DET.setDetailDataSize(mapItem, NgChm.DET.zoomBoxSizes[zoomBoxSizeIdx]);
			}
			NgChm.SEL.updateSelection(mapItem);
			delete NgChm.RecPanes.mapConfigPanelConfiguration[paneid];
		} else if (pane.textContent == 'empty') {
			return;
		} else {
			let customjsPlugins = NgChm.LNK.getPanePlugins(); // plugins from custom.js
			let specifiedPlugin = customjsPlugins.filter(pc => pane.textContent.indexOf(pc.name) > -1)[0];
			if (specifiedPlugin == undefined) { // then assume pane was a linkout pane
				let loc = NgChm.Pane.findPaneLocation(pane);
				NgChm.LNK.switchPaneToLinkouts(loc);
				let linkoutData = getPaneInfoFromMapConfig(paneid);
				if (linkoutData != null) {
					NgChm.LNK.openUrl(linkoutData.url, linkoutData.paneTitle);
				}
			} else { // one of the pane plugins
				try {
					NgChm.LNK.switchPaneToPlugin(NgChm.Pane.findPaneLocation(pane),specifiedPlugin);
					NgChm.Pane.initializeGearIconMenu(document.getElementById(paneid+'Icon'));
				} catch(err) {
					console.error(err);
					console.error("Specified plugin: ",pane.textContent);
					throw("Error loading plugin");
				}
			}
		}
	}

	/**
	* Send any existing data from mapConfig.json to plugin and close Gear Menu
	*
	* It's confusing because there are many things called 'data'. To hopefully help clarify:
	*
	*   paneInfo.config and paneInfo.data: 
	*      This is the data send to the plugin when user clicked 'APPLY' on the Gear Menu
	*      before they saved the map. All plugins should have this data.
	*      
	*      An annoying thing: if there are selected labels on the saved NGCHM that came from selecting points
	*      on, say, a scatter plot, those selections are NOT saved in the pluginConfigData :-(.
	*      So the current selectedLabels are re-generated and added below. TODO: modify the code
	*      that saves what becomes the pluginConfigData to capture selections that came from the plugin.
	*
	*   dataFromPlugin:
	*      This is the sort of data that is generated by the user's manupulation in the plugin,
	*      and did not come from the NGCHM. Example: the zoom/pan state of the 3D Scatter Plot.
	*      Some plugins have not yet been updated to send this data to the NGCHM when the user 
	*      saves the .ngchm file; these plugins will not have any dataFromPlugin.
	*/
	function initializePluginWithMapConfigData(pluginInstance) {
		let paneId = getPaneIdFromInstance(pluginInstance);
		let paneInfo = getPaneInfoFromMapConfig(paneId);
		if (typeof paneInfo == 'undefined' || paneInfo.type != "plugin") {
			return;
		}
		if (paneInfo) {
			let nonce = pluginInstance.nonce;
			let config = paneInfo.config;
			let data = paneInfo.data;
			let selectedLabels = getSelectedLabels(config.axes[0].axisName);
			data.axes[0].selectedLabels = selectedLabels;
			NgChm.LNK.sendMessageToPlugin({nonce, op: 'plot', config, data});
			let dataFromPlugin = paneInfo.dataFromPlugin;
			NgChm.LNK.sendMessageToPlugin({nonce, op: 'savedPluginData', dataFromPlugin});
			NgChm.Pane.removePopupNearIcon(document.getElementById(paneId+'Gear'), document.getElementById(paneId+'Icon'));
			delete NgChm.RecPanes.mapConfigPanelConfiguration[paneId];
		} else {
			return false;
		}
	}

	function getSelectedLabels(axis) {
		const allLabels = NgChm.heatMap.getAxisLabels(axis).labels;
		const searchItems = NgChm.SRCH.getAxisSearchResults(axis); // axis == 'Row' or 'Column'
		let selectedLabels = [];
		searchItems.forEach((si, idx) => {
			let pointId = allLabels[si - 1];
			pointId = pointId.indexOf("|") !== -1 ? pointId.substring(0, pointId.indexOf("!")) : pointId;
			selectedLabels.push(pointId);
		});
		return selectedLabels;
	}

	function getPaneIdFromInstance(pluginInstance) {
		let paneId = pluginInstance.iframe.parentElement.parentElement.id;
		if (paneId == null) {
			throw "No pane found for this plugin";
		}
		return paneId;
	}

	function getPaneInfoFromMapConfig(paneId) {
		try {
			let paneInfo = NgChm.RecPanes.mapConfigPanelConfiguration[paneId];
			return paneInfo;
		} catch (error) {
			if (error instanceof TypeError) {
				return false;
			} else {
				throw error;
			}
		}
	}

	/*
	 * Set the 'flick' control and data layer
	*/
	function setFlickState() {
		if (!NgChm.RecPanes.mapConfigPanelConfiguration.hasOwnProperty('flickInfo')) {
			return;
		}
		if (Object.keys(NgChm.heatMap.getDataLayers()).length == 1) {
			return;
		}
		try {
			document.getElementById('flick1').value = NgChm.RecPanes.mapConfigPanelConfiguration.flickInfo.flick1;
			document.getElementById('flick2').value = NgChm.RecPanes.mapConfigPanelConfiguration.flickInfo.flick2;
			if (NgChm.RecPanes.mapConfigPanelConfiguration.flickInfo['flick_btn_state'] === 'flickDown') {
				document.getElementById('flick_btn').dataset.state = 'flickUp'; // <-- set to opposite so flickChange will set to desired
				NgChm.DEV.flickChange();
			} else {
				document.getElementById('flick_btn').dataset.state = 'flickDown'; // <-- set to opposite so flickChange will set to desired
				NgChm.DEV.flickChange();
			}
		} catch(err) {
			console.error(err)
		}
	}

	function setNextMapNumber() {
		let currentMapNumbers = NgChm.DMM.DetailMaps.map(dm => parseInt(dm.chm.id.replace('detail_chm',''))).filter(n => !Number.isNaN(n));
		if (currentMapNumbers.length > 0) {
			NgChm.DMM.nextMapNumber = Math.max(...currentMapNumbers);
		} else {
			NgChm.DMM.nextMapNumber = 1;
		}
	}

})();

