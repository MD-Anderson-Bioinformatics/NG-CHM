
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
			NgChm.RecPanes.mapConfigPanelConfiguration = NgChm.heatMap.getPanelConfiguration();
			reconstructPanelLayoutFromMapConfig();
			recreateReconstructedPanes();
			setPanesContent();
			// TODO: fix this hack for multiple primaryMaps added to DetailMaps.
			//       perhaps best done by fixing the 'wait for initialization' hack
			if (NgChm.DMM.DetailMaps.filter( x => x.version ).length > 1) {
				for (let idx = 0; idx < NgChm.DMM.DetailMaps.length; idx++) {
					NgChm.DMM.DetailMaps.splice(idx,1);
					break;
				}
			}
			addDividerControlsToResizeHelpers();
			addResizeHandlersToContainers();
			window.dispatchEvent(new Event('resize'));
			triggerUpdateSelectionOnDetailMaps();
			NgChm.SUM.summaryPaneResizeHandler();
			NgChm.heatMap.setUnAppliedChanges(false);
			NgChm.UTIL.containerElement = document.getElementById('ngChmContainer');
		} else { // wait for NGCHM to initialize itself
			setTimeout(reconstructPanelsFromMapConfig, 500);
		}
	}

	/**
	 * After a time delay, call updateSelection on each detail map in order to force a redraw.
	 *
	 * This is a very bad hack: without the setTimeout,
	 * the call to updateSelection() does not seem to draw the detail maps,
	 * and the map areas are blank (but labels and outline are drawn). 
	 * But we are unsure about what the code needs wait for...so for the moment
	 * we have this hack.
	 * TODO: fix this hack.
	*/
	function triggerUpdateSelectionOnDetailMaps() {
		if (document.getElementsByClassName('detail_chm').length < 1) { return; }
		var idx = 0;
		function triggerUpdateSelection() {
			setTimeout( () => {
				NgChm.SEL.updateSelection(NgChm.DMM.DetailMaps[idx]);
				idx = idx + 1;
				if (idx < NgChm.DMM.DetailMaps.length) {
					triggerUpdateSelection();
				}
			}, 100);
		}
		triggerUpdateSelection();
	}

	/**
	 *	Reconstruct ngChmContainer and pane layout.
	 */ 
	function reconstructPanelLayoutFromMapConfig() {
		let baseNgChmContainer = document.getElementById('ngChmContainer');
		let panel_layoutJSON = NgChm.RecPanes.mapConfigPanelConfiguration.panel_layout;
		let reconstructedPanelLayout = domJSON.toDOM(panel_layoutJSON);
		baseNgChmContainer.parentNode.replaceChild(reconstructedPanelLayout, baseNgChmContainer);
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
	 *	Set the primary detail pane's content first, then set the remaining
	 *	panes' content. (it doesn't seem to work as desired without setting the
	 *	primary detail pane first. TODO: clean this up!)
	 */
	function setPanesContent() {
		setPrimaryDetailPaneContent();
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

	/**
	 * Draw the primary detail map in the primary detail pane.
	 */
	function setPrimaryDetailPaneContent() {
		let pane = getPrimaryDetailPane();
		if (pane == null) {return false;}
		NgChm.DMM.primaryMap.pane = pane.id;
		let paneInfo = getPaneInfoFromMapConfig(pane.id); /*must call before swtichPaneToDetail bc will rm mapConfig info for pane*/
		NgChm.DET.switchPaneToDetail(NgChm.Pane.findPaneLocation(pane));
		let canvas = pane.querySelector('.detail_canvas');
		let mapItem = NgChm.DMM.getMapItemFromCanvas(canvas);
		let chm = document.getElementById('detail_chm');
		NgChm.DMM.completeMapItemConfig(chm, mapItem);
		NgChm.DET.setDrawDetailTimeout(mapItem,5,false);
		NgChm.DET.drawRowAndColLabels(mapItem);
		NgChm.DEV.addEvents(pane.getAttribute('id'));
		NgChm.DMM.switchToPrimary(pane.childNodes[1]);
		NgChm.DET.setDetailDataSize(mapItem, paneInfo.zoomBoxSize);
		NgChm.SEL.setCurrentRowFromSum(mapItem, paneInfo.currentRow);
		NgChm.SEL.setCurrentColFromSum(mapItem, paneInfo.currentCol);
		NgChm.SEL.updateSelection(mapItem);
		NgChm.DET.updateDisplayedLabels();
	}

	/**
	 *	Set a pane's content based on 'textContent' attribute, unless a primary pane (then just
	 *	return)
	 */
	function setPaneContent(paneid) {
		let pane = document.getElementById(paneid);
		let customjsPlugins = NgChm.LNK.getPanePlugins(); // plugins from custom.js
		if (pane.textContent.includes("Heat Map Summary")) {
			NgChm.SUM.switchPaneToSummary(NgChm.Pane.findPaneLocation(pane));
		} else if (pane.textContent.includes("Heat Map Detail")) {
			let paneInfo = getPaneInfoFromMapConfig(paneid);
			paneInfo.versionNumber == "" ? NgChm.DMM.nextMapNumber = 1 : NgChm.DMM.nextMapNumber = parseInt(paneInfo.versionNumber)-1;
			let loc = NgChm.Pane.findPaneLocation(pane);
			NgChm.DET.switchPaneToDetail(NgChm.Pane.findPaneLocation(pane));
			if (paneInfo.version == "P") {
				NgChm.DMM.switchToPrimary(pane.childNodes[1]);
			}
			// set zoom/pan state of detail map
			let mapItem = NgChm.DMM.getMapItemFromPane(pane.id);
			NgChm.DET.setDetailDataSize(mapItem, paneInfo.zoomBoxSize);
			NgChm.SEL.setCurrentRowFromSum(mapItem, paneInfo.currentRow);
			NgChm.SEL.setCurrentColFromSum(mapItem, paneInfo.currentCol);
			NgChm.SEL.updateSelection(mapItem);
			NgChm.DET.updateDisplayedLabels();
		} else if (pane.textContent == 'empty') {
			return;
		} else {
			let specifiedPlugin = customjsPlugins.filter(pc => pane.textContent.indexOf(pc.name) > -1)[0];
			if (specifiedPlugin == undefined) { // then assume pane was a linkout pane
				NgChm.LNK.linkoutElement = NgChm.UTIL.newElement('DIV.linkouts');
				let loc = NgChm.Pane.findPaneLocation(pane);
				NgChm.Pane.setPaneTitle(loc, 'Linkouts');
				loc.pane.appendChild(NgChm.LNK.linkoutElement);
				let linkoutData = getPaneInfoFromMapConfig(pane.id);
				NgChm.LNK.openUrl(linkoutData.url, linkoutData.paneTitle);
			} else {
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
	* Send any exiting data from mapConfig.json to plugin and close Gear Menu
	*/
	function initializePluginWithMapConfigData(pluginInstance) {
		let paneId = getPaneIdFromInstance(pluginInstance);
		let pluginConfigData = getPaneInfoFromMapConfig(paneId);
		if (pluginConfigData) {
			let nonce = pluginInstance.nonce;
			let config = pluginConfigData.config;
			let data = pluginConfigData.data;
			NgChm.LNK.sendMessageToPlugin({nonce, op: 'plot', config, data});
			let dataFromPlugin = pluginConfigData.dataFromPlugin;
			NgChm.LNK.sendMessageToPlugin({nonce, op: 'savedPluginData', dataFromPlugin});
			NgChm.Pane.removePopupNearIcon(document.getElementById(paneId+'Gear'), document.getElementById(paneId+'Icon'));
		} else {
			return false;
		}
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

})();

