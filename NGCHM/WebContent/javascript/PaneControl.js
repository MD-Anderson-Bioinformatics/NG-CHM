(function(){
    "use strict";
    NgChm.markFile();

	//Define Namespace for Pane Control
	const PANE = NgChm.createNS('NgChm.Pane');

	const UTIL = NgChm.importNS('NgChm.UTIL');
	const MMGR = NgChm.importNS('NgChm.MMGR');
	const UHM = NgChm.importNS('NgChm.UHM');
	const TOUR = NgChm.importNS('NgChm.TOUR');

	PANE.showPaneHeader = true;
	PANE.ngchmContainerWidth = 100;	// Percent of window width to use for NGCHM
	PANE.ngchmContainerHeight = 100;	// Percent of window height to use for NGCHM


	/////////////////////////////////////////////////////////////////////
	//
	// Define exports.
	//

	// function initializePanes() - call to (re-)initialize pane interface
	PANE.paneLayout = layout;
	PANE.initializePanes = initializePanes;
	PANE.newPane = newPane;
	PANE.resizePane = resizePane;
	PANE.DividerControl = DividerControl;
	PANE.resizeHandler = resizeHandler;
	PANE.resetPaneCounter = resetPaneCounter;
	PANE.toggleScreenMode = toggleScreenMode;
	PANE.collapsePane = collapsePane;
	PANE.isCollapsedPane = isCollapsedPane;

	// function findPaneLocation(el) - return PaneLocation containing element el
	PANE.findPaneLocation = findPaneLocation;

	// function emptyPaneLocation(loc) - remove and return client elements from pane location
	PANE.emptyPaneLocation = emptyPaneLocation;

	// function splitPaneCheck (vertical, loc) - check if OK to split pane
	PANE.splitPaneCheck = splitPaneCheck;

	// function splitPane (vertical, loc) - split the pane at PaneLocation loc
	PANE.splitPane = splitPane;

	// function registerPaneContentOption (menuEntry, callback) - register pane content option
	PANE.registerPaneContentOption = registerPaneContentOption;

	// function registerPaneExtraOption (menuEntry, enabled, callback, data) - register pane extra content option
	PANE.registerPaneExtraOption = registerPaneExtraOption;

	// function setPanePropWidths (percent, left, right, divider) - set default pane proportions
	PANE.setPanePropWidths = setPanePropWidths;

	// function registerPaneEventHandler(pane,name,callback) - set callback for Event name on pane
	PANE.registerPaneEventHandler = registerPaneEventHandler;

	// function clearExistingDialogs (paneId) - clear any existing dialogs from pane.
	PANE.clearExistingDialogs = clearExistingDialogs;

	// function setDividerPref (percent) - resize panes in standard configuration.
	PANE.setDividerPref = setDividerPref;

	// function setPaneTitle (loc, title) - set the title of the pane at PaneLocation loc
	PANE.setPaneTitle = setPaneTitle;

	// function addPanelIcons (icons) Add the icons (an array) to the left of the PanelIcon in the PanelIconGroup
	PANE.addPanelIcons = addPanelIcons;

	// function setPaneClientIcons (loc, icons) - Set the icon group containing icons (an array) to the pane header.
	PANE.setPaneClientIcons = setPaneClientIcons;

	// function insertPopupNearIcon (popup, icon) - display a popup near a pane icon
	PANE.insertPopupNearIcon = insertPopupNearIcon;

	// function removePopupNearIcon (popup, icon) - remove a popup inserted by insertPopupNearIcon
	PANE.removePopupNearIcon = removePopupNearIcon;

	//
	/////////////////////////////////////////////////////////////////////

	const debug = false;
	const verticalDividerMargins = 20;	// Total left+right margins for a vertical divider
	const horizontalDividerMargins = 10;	// Total top+bottom margins for a horizontal divider
						// Above two constants must match sizes specified in css file.

	// Return unique ID for a pane element - to aid in automated tests
	var nextUniquePaneId = 1;
	function resetPaneCounter(count) {
		if (count == null) { 
			nextUniquePaneId = 1 
		} else {
			nextUniquePaneId = count;
		}
	}
	function getUniquePaneId () {
		return "pane" + nextUniquePaneId++;
	}

	// Return unique ID for a container element - to aid in automated tests
	var nextUniqueContainerId = 1;
	function getUniqueContainerId () {
		return "ngChmContainer" + nextUniqueContainerId++;
	}

	// The panel user interface is a DOM tree:
	// - Leaf nodes are panels. They are implemented as DIV elements with class pane.
	// - Internal tree nodes are containers.  They are implemented as DIV elements with class container.
	// All internal containers (i.e. except for the root container) must contain at least two children.
	//
	// Containers have a direction, horizontal or vertical, which refers to the relative positioning of its children.
	// Vertical containers belong to class vertical, while horizontal containers don't.
	// Sub-containers must have the orthogonal orientation to their parent container.
	//
	// There is a DIV element with class resizerHelper between all children of a container.

	// Exported function.
	// Return a pane location object for the pane containing element.
	// element can be a pane element or any element inside the pane element.
	// Pane Location objects have the following entries:
	//	pane - DOM element for the pane (has class pane)
	//	container - DOM element for the enclosing container (has class container)
	//	paneHeader - DOM element for the pane header (has class paneHeader)
	//	paneTitle - DOM element for the pane title (has class paneTitle)

	function findPaneLocation (element) {
		const res = {
			pane: null,
			container: null,
			paneHeader: null,
			paneTitle: null
		};
		// Walk up the DOM until we find the enclosing container,
		// noting any relevant HTML elements that we encounter.
		let p = element;
		while (p) {
			if (p.classList.contains('paneHeader')) res.paneHeader = p;
			else if (p.classList.contains('paneTitle')) res.paneTitle = p;
			else if (p.classList.contains('pane')) res.pane = p;
			else if (p.classList.contains('ngChmContainer')) {
				res.container = p;
				break;
			}
			p = p.parentElement;
		}
		if (!res.pane) {
			if (UTIL.isBuilderView !== true) {
				// Should have found the pane element.
				console.error ({ m: 'findPaneLocation: could not find pane', element, res });
			}
			return res;
		}
		if (!res.container) {
			// Should have found the container element.
			console.error ({ m: 'findPaneLocation: could not find container', element, res });
			return res;
		}
		if (!res.paneHeader) {
			// May not have started inside the header.
			const hdrs = res.pane.getElementsByClassName('paneHeader');
			if (hdrs.length !== 1) {
				console.error({ m: 'findPaneLocation: wrong number of headers', res, hdrs });
				return res;
			} else {
				res.paneHeader = hdrs[0];
			}
		}
		if (!res.paneTitle) {
			// May not have started inside the title.
			const titles = res.paneHeader.getElementsByClassName('paneTitle');
			if (titles.length !== 1) {
				console.error({ m: 'findPaneLocation: wrong number of header titles', res, titles });
				return res;
			} else {
				res.paneTitle = titles[0];
			}
		}
		return res;
	}

	// Return a save state specification for the layout of el.
	// Users should pass the top-level ngChmContainer object.
	// The function calls itself recursively for subsidiary panes and containers.
	//
	// Expanded is set to true for an expanded pane and its width and height are
	// set to their original values. Similarly, the width and height of its enclosing
	// container are also set to their original values.
	function layout (el) {
	    const details = { id: el.id, width: el.style.width, height: el.style.height };
	    if (el.classList.contains('pane')) {
		details.type = 'pane';
		details.collapsed = el.classList.contains('collapsed');
		details.expanded = isPaneExpanded && el.style.display !== 'none';
		if (details.expanded) {
		    details.width = origPane.width;
		    details.height = origPane.height;
		    details.origContainer = origContainer;  // Pass up to enclosing container.
		}
		return details;
	    } else if (el.classList.contains('ngChmContainer')) {
		details.type = 'container';
		details.vertical = el.classList.contains('vertical');
		details.children = [...el.children].map(layout).filter(d => d !== null);
		details.children.forEach (ch => {
		    if (ch.origContainer) {
			details.width = ch.origContainer.width;
			details.height = ch.origContainer.height;
			delete ch.origContainer;
		    }
		});
		return details;
	    } else {
		// Don't include resizer's etc.
		return null;
	    }
	}

	var panesInitialized = false;
	// Exported function.
	// Create the initial panel structure.
	function initializePanes () {
		if (debug) console.log ('Initialize Panes');

		const topContainer = document.getElementById('ngChmContainer');
		if (!panesInitialized) {
			PANE.resizeNGCHM = resizeNGCHM;
			window.onresize = resizeNGCHM;
		}

		// Remove previous contents, if any.
		while (topContainer.firstElementChild) {
			topContainer.removeChild (topContainer.firstElementChild);
		}

		const initialPane = createInitialPane();
		const initialLoc = findPaneLocation (initialPane);
		panesInitialized = true;
		return initialLoc;

		function resizeNGCHM () {
			const topContainer = document.getElementById('ngChmContainer');
			const debug = false;
			if (debug) console.log ('NGCHM resized');
			if (topContainer && topContainer.parentElement) {
				const embed = document.getElementById('NGCHMEmbed');
				const bb = (embed || document.body).getBoundingClientRect();
				if (embed) {
					const cont = document.getElementById('ngChmContainer');
					if (cont) cont.classList.add('hide');
					const estyle = window.getComputedStyle(embed);
					if (cont) cont.classList.remove('hide');
					bb.width -= +estyle['padding-left'].replace('px','');
					bb.width -= +estyle['padding-right'].replace('px','');
					bb.height -= +estyle['padding-top'].replace('px','');
					bb.height -= +estyle['padding-bottom'].replace('px','');
				}
				const hdrbb = document.getElementById("mdaServiceHeader").getBoundingClientRect();
				const ch = topContainer.firstElementChild;
				if (!ch) {
				    return;
				}
				if (typeof ch.getBoundingClientRect != "function") {
					console.error ({ m: 'getBoundingClientRect', ch });
				}
				const oldbb = ch.getBoundingClientRect();
				const newWidth = Math.floor (PANE.ngchmContainerWidth * bb.width / 100);
				const newHeight = Math.floor (PANE.ngchmContainerHeight * bb.height / 100) - hdrbb.height;

				if (debug) console.log ({ m: 'window.onresize: topContainer',
					oldwidth: oldbb.width, newWidth,
					oldheight: oldbb.height, newHeight });
				if (newWidth !== oldbb.width) {
					ch.dispatchEvent(new CustomEvent('paneresize', { detail: {
						what: 'width',
						amount: newWidth - oldbb.width
					}}));
				}
				if (newHeight !== oldbb.height) {
					ch.dispatchEvent(new CustomEvent('paneresize', { detail: {
						what: 'height',
						amount: newHeight - oldbb.height
					}}));
				}
				updatePopupPositions ();
				UTIL.keepElementInViewport("prefs");
				UTIL.keepElementInViewport("pdfPrefs");
				UTIL.keepElementInViewport("msgBox");
				UTIL.keepElementInViewport("linkBox");
			}
		}
	}

	// Initialize DOM IMG element icon to a panel menu.
	var openIconMenu = null;
	function initializePaneIconMenu (icon) {
		icon.onmouseout = function(e) {
			UHM.hlpC();
		};
		icon.onmouseover = function(e) {
			UHM.hlp(icon, 'Open panel menu', 120, 0);
		};
		icon.addEventListener ('click', function(e) {
			if (openIconMenu != null) {
				let e2 = new e.constructor (e.type, e);
				openIconMenu.dispatchEvent(e2);
			}
			if (debug) console.log ({ m: 'paneMenuIcon click', e });
			e.stopPropagation();
			newIconMenu (icon);
		}, true);
	}

	//******* BEGIN SCREEN MODE FUNCTIONS *********//
	// variables used in screen expansion/contraction
	let origPane = {};
	let origContainer = {};
	let activeContainers = [];
	let isPaneExpanded = false;

	// Toggle screen mode for the specified pane.
	function toggleScreenMode (paneId) {
		const icon = document.getElementById(paneId + "_ScreenMode");
		if (icon) {
		    changeScreenMode (icon);
		}
	}

	// Initialize DOM IMG element for the screen mode (expand/contract) function.
	function initializePaneScreenMode (expander, shrinker, paneId) {
		expander.id = paneId + "_ScreenModeE";
		expander.onmouseout = function(e) {
			UHM.hlpC();
		};
		expander.onmouseover = function(e) {
			UHM.hlp(expander, 'Expand Panel', 120, 0);
		};
		expander.addEventListener ('click', function(ev) {
			changeScreenMode (ev.currentTarget);
		}, true);
		shrinker.id = paneId + "_ScreenModeS";
		shrinker.onmouseout = function(e) {
			UHM.hlpC();
		};
		shrinker.onmouseover = function(e) {
			UHM.hlp(shrinker, 'Contract Panel', 120, 0);
		};
		shrinker.addEventListener ('click', function(ev) {
			changeScreenMode (ev.currentTarget);
		}, true);
	}

	// Change screen mode and icon button when user invokes functionality.
	function changeScreenMode (icon) {
		let paneId = icon.id.split("_")[0];
		if (isPaneExpanded === true) {
			closeFullScreen(paneId);
		} else {
			openFullScreen(paneId);
		}
		icon.parentElement.dataset.expanded = '' + isPaneExpanded;
	}

	//Grab a list of panes and show/hide them all
	function getActiveContainers (paneId) {
		let thisPaneParent = paneId.parentElement;
		while (thisPaneParent.id !== 'ngChmContainer') {
			activeContainers.push(thisPaneParent.id);
			thisPaneParent = thisPaneParent.parentElement;
		}
	}
	
	function openFullScreen (paneId) {
		isPaneExpanded = true;
		const thisPane = document.getElementById(paneId);
		const thisPaneParent = thisPane.parentElement;
		getActiveContainers (thisPane);
		const topContainer = document.getElementById('ngChmContainer');
		//Hide all panes
		displayPanes('none');
		//Hide all resizers
		displayResizers ('none');
		//Hide all containers but the one holding the pane being expanded AND the top container
		displayContainers('none');
		//Retain original sizing for pane and parent container
		origPane = {width: thisPane.style.width, height: thisPane.style.height};
		origContainer = {width: thisPaneParent.style.width, height: thisPaneParent.style.height};
		//Resize the pane being expanded to fill it's parent container
		thisPaneParent.style.width = topContainer.clientWidth + 'px';
		thisPaneParent.style.height = topContainer.clientHeight + 'px';
		thisPane.style.width = topContainer.clientWidth + 'px';
		thisPane.style.height = topContainer.clientHeight + 'px';
		thisPane.style.display = '';
		// Resize the pane to 'full window'
		resizePane (thisPane);
	}
	
	function closeFullScreen (paneId) {
		isPaneExpanded = false;
		const thisPane = document.getElementById(paneId);
		const thisPaneParent = thisPane.parentElement;
		//display all panes
		displayPanes('');
		//display all re-sizers
		displayResizers ('');
		//display all containers
		displayContainers('');
		//Resize the pane being expanded to fill it's parent container
		thisPaneParent.style.width = origContainer.width;
		thisPaneParent.style.height = origContainer.height;
		thisPane.style.width = origPane.width;
		thisPane.style.height = origPane.height;
		//Rest original sizing objects
		origPane = {};
		origContainer = {};
		activeContainers = [];
		//Resize all panes to their original size.
		[...document.getElementsByClassName('pane')].forEach(resizePane);
	}
	
	//Grab a list of panes and show/hide them all
	function displayPanes (method) {
		const panes = document.getElementsByClassName('pane');
		for (let i=0;i<panes.length;i++) {
			panes[i].style.display = method;
		}
	}

	//Grab a list of resizers and show/hide them all
	function displayResizers (method) {
		const resizers = document.getElementsByClassName('resizerHelper');
		for (let i=0;i<resizers.length;i++) {
			resizers[i].style.display = method;
		}
	}
	
	//Grab a list of containers and show/hide all but the ones holding the pane being expanded AND the top container
	function displayContainers(method) {
		const containers = document.getElementsByClassName('ngChmContainer');
		for (let i=0;i<containers.length;i++) {
			let currCont = containers[i];
			if (currCont.id !== 'ngChmContainer') {
				let found = false;
				for (let j=0;j<activeContainers.length;j++) {
					if (activeContainers[j] === currCont.id) {
						found = true;
					}
				}
				if (found === false) {
					currCont.style.display = method;
				}
			}
		}
	}
	//******* END SCREEN MODE FUNCTIONS *********//

	// Exported function.
	function setPaneTitle (loc, title) {
		loc.paneTitle.innerText = title;
	}

	// Exported function.
	function addPanelIcons (loc, userIcons) {
	    // Find the icon group containing the paneMenuIcon.
	    const paneIcon = loc.paneHeader.querySelector('DIV.icon_group .paneMenuIcon');
	    const iconGroup = paneIcon.parentElement;
	    userIcons.forEach (icon => {
		iconGroup.insertBefore (icon, paneIcon);
	    });
	}
	
	// Exported function.
	// Check for and clear any existing gear dialog on the pane.
	function clearExistingDialogs (paneId) {
	    [...document.querySelectorAll('#' + paneId + ' [data-popup-name]')].forEach (icon => {
		const popup = document.getElementById(icon.dataset.popupName);
		if (popup !== null) {
			removePopupNearIcon (popup, icon);
		}
	    });
	}

	// Handler for custom resize event for both Panels (leaf nodes) and Containers.
	// The width or height of the target node is modified by e.detail.amount pixels.
	// If the target is a Panel:
	//	If the target panel contains a Heatmap view:
	//		- Resize the view.
	//	otherwise:
	//		- No nothing. Other panels are assummed to resize themselves.
	// If the target is a Container:
	//	If the change direction matches the container direction:
	//		- Divide e.detail.amount by the number of children, and resize each by that amount
	//	otherwise:
	// 		- Resize each subcontainer by e.detail.amount
	function resizeHandler (e) {
		if (e.target.style.display === "none") {
			return;
		}  

		if (debug) console.log ({ m: 'paneresize', e });

		// Quit if (propagated) resize amount has shrunk to zero.
		if (e.detail.amount === 0) return;
		const bb = e.target.getBoundingClientRect();

		// If shrinking, shrink children first.
		if (e.detail.amount < 0) {
			resizeChildren();
		}

		// Resize this container/pane.
		e.target.style[e.detail.what]=(bb[e.detail.what]+e.detail.amount)+'px';

		if (!e.target.classList.contains('ngChmContainer')) {
			resizePane (e.target, true);
		}

		// If expanding, expand children last.
		if (e.detail.amount > 0) resizeChildren();

		function resizeChildren() {
			if (e.target.classList.contains('ngChmContainer')) {
				// Resize children of the container.
				if (debug) console.log ('container resize');
				const verticalContainer = e.target.classList.contains('vertical');
				const verticalChange = e.detail.what === 'height';
				const children = [...e.target.children].filter(ch => !ch.classList.contains('resizerHelper') && !ch.classList.contains('collapsed'));
				if (verticalContainer !== verticalChange) {
					children.forEach(ch => {
						const newEv = new CustomEvent('paneresize', { detail: e.detail });
						ch.dispatchEvent(newEv);
					});
				} else {
					const amt = Math.round(e.detail.amount / children.length);
					const extra = e.detail.amount - amt * children.length;
					children.shift().dispatchEvent(new CustomEvent('paneresize', { detail: { what: e.detail.what, amount: amt + extra } }));
					children.forEach(ch => {
						ch.dispatchEvent(new CustomEvent('paneresize', { detail: { what: e.detail.what, amount: amt } }));
					});
				}
			}
		}
	}
	
	// Create and return a new Pane element.
	// - style is a dictionary of styles to add to the Pane element.
	// - title is the pane's initial title.
	// - paneid is the id to assign the new pane (if null, a unique paneid will be generated)
	// If a title is given, the pane will be initialized with a paneHeader.
	function newPane(style, title, paneid) {
		MMGR.getHeatMap().setUnAppliedChanges(true);
		if (paneid == null) paneid = getUniquePaneId();
		const pane = UTIL.newElement('DIV.pane', { style, id: paneid });
		pane.addEventListener('paneresize', resizeHandler);
		if (title) {
			const h = UTIL.newElement('DIV.paneHeader.activePane');
			if (!PANE.showPaneHeader) h.classList.add ('hide');
			pane.appendChild(h);

			const sc = UTIL.newElement('DIV.paneScreenMode');
			h.appendChild (sc);

			const t = UTIL.newElement('DIV.paneTitle');
			t.innerText = title;
			h.appendChild (t);

			const ci = UTIL.newElement('DIV.icon_group.client_icons');
			h.appendChild(ci);

			const ig = UTIL.newElement('DIV.icon_group.panel_icons');
			h.appendChild(ig);

			const img = UTIL.newSvgButton ('icon-four-panels!icon-four-panels-glow.paneMenuIcon');
			initializePaneIconMenu (img);
			ig.appendChild(img);

			const expander = UTIL.newSvgButton('icon-expand.expander', { align: 'left' });
			const shrinker = UTIL.newSvgButton('icon-shrink.shrinker', { align: 'left' });
			initializePaneScreenMode(expander, shrinker, paneid);
			sc.dataset.expanded = 'false';
			sc.appendChild(expander);
			sc.appendChild(shrinker);

		}
		return pane;
	}

	// Exported function.
	// Add a group of icons to the pane header.
	// Spec is an object with the following entries:
	// - icons An array of icons or buttonSets to add to the panel header
	// - template The grid-template-columns to set on the .client_icons div.
	function setPaneClientIcons (loc, spec) {
		if (!loc.paneHeader || !loc.paneTitle) return;
		const panelIcons = loc.paneHeader.querySelector('.panel_icons');
		let clientIcons = loc.paneHeader.querySelector('.client_icons');
		// Remove existing clientIcons, if any.
		if (clientIcons) {
			clientIcons.remove();
		}
		clientIcons = UTIL.newElement('DIV.icon_group.client_icons');
		clientIcons.style.gridTemplateColumns = spec.template;
		if (spec.icons) {
		    const icons = spec.icons.slice();
		    while (icons.length > 0) {
			    clientIcons.appendChild (icons.shift());
		    }
		}
		loc.paneHeader.insertBefore (clientIcons, panelIcons);
	}


	// Exported function.
	/**
		Function to determine if pane can be divided without loss of PathwayMapper
		state. If no loss of PathwayMapper state, then divide pane. If division would
		result in loss of PathwayMapper state, present a system message with a warning,
		and allow the user to decide if they want to proceed or not.
	*/
	function splitPaneCheck (vertical, loc) {
		if (!loc.pane || !loc.container) return;
		const verticalContainer = loc.container.classList.contains('vertical');
		// If user is attempting pane manipulation that will reset PathwayMapper, offer them a chance to cancel:
		if (vertical != verticalContainer && loc.pane.textContent.indexOf('PathwayMapper') > -1) {
			/**
				Function to create dialog for user to choose 'Cancel' or 'OK. 
				Returns a promise: resolve if 'OK' button clicked, reject if 'Cancel' button clicked
				This function was created to warn user about resetting the PathwayMapper pane.
			*/
			function promisePrompt(vertical, loc) {
			    return new Promise(function(resolve, reject) {
				UHM.initMessageBox();
				UHM.setMessageBoxHeader('PathwayMapper Pane Reset Warning');
				UHM.setMessageBoxText('This action will delete all the information in PathwayMapper. Would you like to continue?')
				UHM.setMessageBoxButton('cancel', { type: 'text', text: 'Cancel', }, 'Cancel Button', () => {
				    reject(false);
				});
				UHM.setMessageBoxButton('ok', { type: 'text', text: 'OK' }, 'OK Button', () => {
				    resolve();
				});
				UHM.displayMessageBox();
			    });
			}
			promisePrompt(vertical, loc)
				.then(function() {  // promise resolved, split pane
				    splitPane(vertical, loc)
				})
				.catch(function(error) {  // promise rejected, do not split pane
				    if (error) console.log (error);
				})
				.finally(() => {
				    UHM.messageBoxCancel();
				});
		} else { // pane division can proceed w/o any loss of PathwayMapper state
			splitPane(vertical, loc)
		}
	} // end splitPaneCheck

	// Exported function.
	// Split the pane at Pane Location loc into two.
	// The pane is split vertically is verticle is true, otherwise horizontally.
	// If the split is in the same direction as the enclosing container:
	//	- insert a divider and new pane after the current pane and resize
	// otherwise:
	//	- convert the pane into a container
	//	- create two new child panes and a divider
	//	- move the original pane's contents into the first child pane.
	// Returns the two child panes.
	function splitPane(vertical, loc) {
		if (debug) console.log ({ m: 'splitPane', vertical, loc });
		if (!loc.pane || !loc.container) return;
		const verticalContainer = loc.container.classList.contains('vertical');
		if (loc.paneHeader) loc.paneHeader.classList.remove('activePane');
		const style = {};
		style[vertical ? 'height' : 'width'] = 'calc(50% - 5px)';
		const divider = UTIL.newElement('DIV.resizerHelper');
			divider.classList.add('resizerHelper' + (vertical ? 'Bottom' : 'Right'));
		const splitter = UTIL.newElement('DIV');
			splitter.classList.add('resizerSplitter' + (vertical ? 'Horizontal' : 'Vertical'));
		divider.appendChild(splitter);

		const child2 = newPane(style, 'empty',null);

		let container;
		let child1;
		let h = loc.pane.clientHeight;
		let w = loc.pane.clientWidth;
		if (vertical === verticalContainer && loc.container.id !== 'ngChmContainer') {
			container = loc.container;
			child1 = loc.pane;
		} else {
			container = loc.pane;
			if (vertical) container.classList.add('vertical'); else container.classList.remove('vertical');
			child1 = newPane(style, null, container.id);
			let p = container.firstChild;
			while (p) {
				container.removeChild (p);
				child1.appendChild(p);
				p = container.firstChild;
			}
			container.classList.replace ('pane', 'ngChmContainer');
			container.id = getUniqueContainerId ();
			container.appendChild (child1);
			updatePaneHandlers (container, child1);
		}

		// Move data properties that were defined on the original pane (now the container)
		// to the new first child.
		const propsToMove = [ 'pluginName', 'title', 'intro', ];
		propsToMove.forEach (prop => {
		    if (prop in container.dataset) {
			child1.dataset[prop] = container.dataset[prop];
			delete container.dataset[prop];
		    }
		});

		const nextSib = child1.nextSibling;
		container.insertBefore (divider, nextSib);
		if (debug) console.log({ m:'splitPane', vertical, height: container.clientHeight, width: container.clientWidth });
		if (vertical) {
			h = h - divider.offsetHeight - horizontalDividerMargins;
			child1.style.height = h/2 + 'px';
			child2.style.height = h/2 + 'px';
			child1.style.width = w + 'px';
			child2.style.width = w + 'px';
		} else {
			w = w - divider.offsetWidth - verticalDividerMargins;
			child1.style.width = w/2 + 'px';
			child2.style.width = w/2 + 'px';
			child1.style.height = h + 'px';
			child2.style.height = h + 'px';
		}
		if (debug) console.log ({ m: 'child1', height: child1.style.height, width: child1.style.width });
		if (debug) console.log ({ m: 'child2', height: child2.style.height, width: child2.style.width });

		container.insertBefore (child2, nextSib);
		divider.dividerController = new DividerControl (divider);

		resizePane (child1, false);
		return { child1, child2, divider };
	}  // end splitPane

	const collapsedPanes = [];

	function isCollapsedPane (paneLoc) {
		return collapsedPanes.indexOf(paneLoc.pane) != -1;
	}

	/* Called to collapse a pane or to re-collapse an already collapsed pane.
	 * The re-collapse case is used when reloading from saved state:
	 * once after recreating the pane structure and once after filling the
	 * pane's contents.
	 */
	function collapsePane (paneLoc) {
		if (debug) console.log ('collapsePane', paneLoc);
		paneLoc.pane.classList.add('collapsed');
		if (collapsedPanes.indexOf(paneLoc.pane) === -1) {
		    collapsedPanes.push (paneLoc.pane);
		}
		let p = paneLoc.pane.firstElementChild;
		while (p) {
			if (p !== paneLoc.paneHeader) p.style.display = 'none';
			p = p.nextElementSibling;
		}
		paneLoc.paneTitle.style.display = 'none';
		paneLoc.paneHeader.style.width = 'fit-content';
		if (paneLoc.container.classList.contains('vertical')) {
			paneLoc.pane.style.height = 'fit-content';
		} else {
			paneLoc.pane.style.width = 'fit-content';
		}
	}

	function expandPane (paneLoc) {
		if (debug) console.log ('expandPane', paneLoc);
		paneLoc.pane.classList.remove('collapsed');
		if (paneLoc.container.classList.contains('vertical')) {
		    paneLoc.pane.style.width = paneLoc.container.style.width;
		} else {
		    paneLoc.pane.style.height = paneLoc.container.style.height;
		}
	}

	const paneContentOptions = [];

	// Exported function.
	function registerPaneContentOption (menuEntry, callback) {
		paneContentOptions.push ({ menuEntry, callback });
	}

	const paneExtraOptions = [];
	// Exported function.
	function registerPaneExtraOption (name, enabled, switcher, data) {
		paneExtraOptions.push ({ name, enabled, switcher, data });
	}

	// Get the next (or previous if need be) unexpanded sibling of a pane.
	function getExpandedSibling (loc) {
		// Get all children of parent container.
		var sib;
		const c = [...loc.container.children];
		let idx = c.indexOf (loc.pane);
		if (idx < c.length-1) {
			sib = getNextUncollapsedPane (c[idx+1]);
			if (sib) return sib;
		}
		if (idx > 0) {
			return getPrevUncollapsedPane(c[idx-1]);
		}
		return null;
	}

	// Create an Icon Menu for the DOM element icon.
	function newIconMenu (icon) {
		const menu = UTIL.newElement('DIV.menuPanel');
		const paneLoc = findPaneLocation(icon);

		function menuHeader (text) {
			const mh = UTIL.newElement('DIV.menuHeader');
			mh.onclick = () => {
			};
			mh.innerText = text;
			menu.appendChild(mh);
		}

		function menuItem (text, callback) {
			const mi = UTIL.newElement('DIV.menuItem');
			mi.onclick = () => {
			    callback (findPaneLocation(icon));
			};
			mi.innerText = text;
			menu.appendChild(mi);
		}

		function menuItemDisabled (text) {
			const mi = UTIL.newElement('DIV.menuItem.disabled');
			mi.onclick = () => {
			};
			mi.innerText = text;
			menu.appendChild(mi);
		}

		function menuSeparator() {
			const mb = UTIL.newElement('DIV.menuItemBorder');
			menu.appendChild(mb);
		}

		if (!paneLoc.pane.classList.contains('collapsed')) {
			menuHeader ('Set content to');
			if (debug) {
				menuItem ('Empty', () => {
					emptyPaneLocation (findPaneLocation(icon));
				});
			}
			// Add standard content options.
			paneContentOptions.forEach(opt => {
				menuItem (opt.menuEntry, () => {
					const loc = findPaneLocation (icon);
					opt.callback (loc);
					resizePane (loc.pane);
				});
			});
			// Add plugin options.
			paneExtraOptions.forEach (opt => {
				if (opt.enabled()) {
					menuItem (opt.name, () => {
						const loc = findPaneLocation (icon);
						emptyPaneLocation (loc);
						opt.switcher (loc, opt.data);
					});
				}
			});  
			menuSeparator();
		}

		menuHeader ('Panel control');
		if (isPaneExpanded === true) {
			menuItemDisabled ('Add Panel Below');
			menuItemDisabled ('Add Panel Right');
		} else if (paneLoc.pane.classList.contains('collapsed')) {
			menuItemDisabled ('Add Panel Below');
			menuItemDisabled ('Add Panel Right');
		} else {
			menuItem ('Add Panel Below', () => {
				splitPaneCheck (true, findPaneLocation(icon));
			});
			menuItem ('Add Panel Right', () => {
				splitPaneCheck (false, findPaneLocation(icon));
			});
		}
		const collapsedPaneIdx = collapsedPanes.indexOf (paneLoc.pane);

		if (isPaneExpanded === true) {
			menuItemDisabled ('Collapse');
		} else if (collapsedPaneIdx >= 0) {
			menuItem ('Uncollapse', () => {
				collapsedPanes.splice(collapsedPaneIdx,1);
				expandPane (findPaneLocation(icon));
				const what = paneLoc.container.classList.contains('vertical') ? 'height' : 'width';
				const curSize = paneLoc.pane.getBoundingClientRect()[what];
				if (curSize < 200) {
					const amount = 200 - curSize;
					// Get siblings of pane that aren't resizers and aren't collapsed.
					const siblings = [...paneLoc.container.children].filter (ch => {
						return ch !== paneLoc.pane && !ch.classList.contains('resizerHelper') && !ch.classList.contains('collapsed');
					});
					if (siblings.length > 0) {
						const resizeDetail = { what, amount: - amount / siblings.length };
						if (debug) {
							console.log({ m: 'Shrinking siblings', curSize, amount, numSiblings: siblings.length, resizeDetail });
						}
						// Shrink siblings.
						siblings.forEach(ch => {
							ch.dispatchEvent(new CustomEvent('paneresize', { detail: resizeDetail }));
						});
					}
					// Then expand target.
					if (debug) {
						console.log({ m: 'Expanding target', what, amount });
					}
					paneLoc.pane.dispatchEvent(new CustomEvent('paneresize', {detail:{what, amount}}));
				}
				// Re-enable display of pane contents.
				let p = paneLoc.pane.firstElementChild;
				while (p) {
					if (p !== paneLoc.paneHeader) p.style.display = '';
					p = p.nextElementSibling;
				}
				paneLoc.paneTitle.style.display = '';
				paneLoc.paneHeader.style.width = '100%';
				getPaneEventHandler (paneLoc.pane, 'resize') (paneLoc);
			});
		} else {
			if (getExpandedSibling(paneLoc) == null) {
				menuItemDisabled ('Collapse');
			} else {
				menuItem ('Collapse', () => {
					collapsePane (findPaneLocation(icon));
					if (debug) console.log ({ width: paneLoc.pane.clientWidth, height: paneLoc.pane.clientHeight });
					const target = getExpandedSibling (paneLoc);
					if (target == null) {
						console.log ('No uncollapsed siblings');
					} else {
						redistributeContainer (paneLoc.container, target);
					}
				});
			}
		}

		let parentC = paneLoc.container.parentElement;
		while (parentC !== null && !parentC.classList.contains('ngChmContainer')) {
			parentC = parentC.parentElement;
		}
		if (parentC !== null) {
			if (isPaneExpanded === true) {
				menuItemDisabled ('Close');
			} else if (getExpandedSibling(paneLoc) == null) {
				menuItemDisabled ('Close');
			} else {
				menuItem ('Close', () => {
					MMGR.getHeatMap().setUnAppliedChanges(true);
					emptyPaneLocation (paneLoc);
					if (debug) console.log({ m: 'closePane', paneLoc, parentC, siblings: paneLoc.container.children });
					try { // remove Gear dialong if it exists
						let idIdx = paneLoc.pane.id.slice(4) // id is, e.g., 'pane3'
						let gearDialog = document.getElementById('pane'+idIdx+'Gear')
						let gearIcon = document.getElementById('pane'+idIdx+'Icon')
						PANE.removePopupNearIcon(gearDialog, gearIcon)
					} catch (err) {} // if err, then popup wasn't open
					// Get all children of parent container.
					const c = [...paneLoc.container.children];
					if (c.length < 3) {
						console.error({ m: 'container has too few children', paneLoc, c });
						return;
					}
					// Determine index of this pane.
					let idx = c.indexOf (paneLoc.pane);
					if (idx < 0) {
						console.error ({ m: 'pane not found', paneLoc, c });
						return;
					}
					// Find nearby uncollapsed sibling for returning space to.
					const target = getExpandedSibling(paneLoc);
					/** 
						Function to replace container with only remaining child.
					*/
					function replaceContainerWithOnlyChild() {
						// Move all child contents into the container:
						const ch = paneLoc.container.firstChild;
						const oldSize = ch.firstElementChild.getBoundingClientRect();
						while (ch.childNodes.length > 0) {
							let p = ch.firstChild;
							ch.removeChild (p);
							paneLoc.container.appendChild (p);
						}
						// Remove the old child
						paneLoc.container.removeChild (ch);
						if (ch.classList.contains('pane')) {
							// Move any old pane handlers to 'container'
							updatePaneHandlers (ch, paneLoc.container);
							// Change the 'container' into a pane
							paneLoc.container.classList.replace ('ngChmContainer', 'pane');
							paneLoc.container.id = ch.id;
							if (ch.hasAttribute('data-plugin-name')) {
								paneLoc.container.setAttribute('data-plugin-name', ch.getAttribute('data-plugin-name'));
							}
							resizePane (paneLoc.container, false);
						} else {
							// The old remaining child is a container.
							if (ch.classList.contains('vertical')) {
								paneLoc.container.classList.add('vertical');
							} else {
								paneLoc.container.classList.remove('vertical');
							}
							// Resize child containers to full width or height of parent.
							const resizeDetail = { what: 'height', amount: 0 };
							const fullSize = paneLoc.container.getBoundingClientRect();
							if (ch.classList.contains('vertical')) {
								resizeDetail.what = 'width';
								resizeDetail.amount = fullSize.width - oldSize.width;
							} else {
								resizeDetail.amount = fullSize.height - oldSize.height;
							}
							[...paneLoc.container.children].forEach(ch => {
								ch.dispatchEvent(new CustomEvent('paneresize', { detail: resizeDetail }));
							});
							// If parent is a similarly oriented container, merge child elements into parent.
							const pc = paneLoc.container.parentElement;
							if (pc.id !== 'ngChmContainer' && pc.classList.contains('ngChmContainer') &&
							    pc.classList.contains('vertical') === paneLoc.container.classList.contains('vertical')) {
								while (paneLoc.container.firstChild) {
									pc.insertBefore (paneLoc.container.firstChild, paneLoc.container);
								}
								paneLoc.container.remove();
							}
						}
					}  // end function replaceContainerWithOnlyChild
					/**
						Function to remove pane and adjacent divider
					*/
					function removePaneAndAdjacentDivider() {
						if (idx === 0) {
							// Remove divider after pane instead of before.
							paneLoc.container.removeChild (c[idx]);  // Pane
							paneLoc.container.removeChild (c[idx+1]); // Divider
							c.splice (idx,2);
						} else {
							// Remove divider before pane.
							paneLoc.container.removeChild (c[idx-1]); // Divider
							paneLoc.container.removeChild (c[idx]); // Pane
							c.splice (idx-1,2);
						}
					} // end function removePaneAndAdjacentDivider
					/**
						Function to create dialog for user to choose 'Cancel' or 'OK'.
						Returns a promise: resolve if 'OK' button clicked, reject if 'Cancel' button clicked
						This function was created to warn user about resetting the PathwayMapper pane.
					*/
					function promisePrompt(paneLoc) {
					    return new Promise(function(resolve, reject) {
						UHM.initMessageBox();
						UHM.setMessageBoxHeader('PathwayMapper Pane Reset Warning');
						UHM.setMessageBoxText('This action will delete all information in PathwayMapper. Would you like to continue?')
						UHM.setMessageBoxButton('cancel', { type: 'text', text: 'Cancel' }, 'Cancel Button', () => {
						    reject(false);
						});
						UHM.setMessageBoxButton('ok', { type: 'text', text: 'OK', }, 'OK Button', () => {
						    resolve();
						});
						UHM.displayMessageBox();
					    });
					}  // end function promisePrompt

					// If user is attempting to close a pane that will result in resetting PathwayMapper, offer them the chance to cancel:
					if (paneLoc.container.textContent.indexOf('PathwayMapper') > -1 && c.length < 4) {
						promisePrompt(paneLoc)
						.then(function() { // promise resolved, continue pane manipulation
						    removePaneAndAdjacentDivider();
						    if (paneLoc.container.children.length === 1) {
							replaceContainerWithOnlyChild()
						    } else {
							// Redistribute space among remaining children.
							if (target) redistributeContainer (paneLoc.container, target);
						    }
						})
						.catch(function(error) { // promise rejected, do NOT continue pane manipulation
						    if (error) {
							console.error (error);
						    }
						})
						.finally(() => {
						    UHM.messageBoxCancel()
						});
					} else { // PathwayMapper pane unaffected, OK to close
						removePaneAndAdjacentDivider();
						if (paneLoc.container.children.length === 1) {
							replaceContainerWithOnlyChild()
						} else {
							// Redistribute space among remaining children.
							if (target) redistributeContainer (paneLoc.container, target);
						}
					} // endif for checking for PathwayMapper pane reset
				});
			}
		}

		menuItem ('Tour', function(loc) {
		    TOUR.showTour (loc);
		});
		insertPopupNearIcon (menu, icon);

		function closeMenu() {
			removePopupNearIcon (menu, icon);
			openIconMenu = null;
			document.removeEventListener ('click', closeMenu);
		}
		document.addEventListener('click', closeMenu);
		openIconMenu = menu;
	}

	const neighborPopups = [];
	const neighborIcons = [];

	// Exported function.
	// Also used internally to reposition the popup after changes to the icon position.
	function insertPopupNearIcon (popup, icon) {
		if (popup.parentElement !== UTIL.containerElement) {
			// Test lets us reuse this function to reposition popup after moving the icon.
			UTIL.containerElement.appendChild(popup);
			neighborPopups.push (popup);
			neighborIcons.push (icon);
		}
		const contBB = UTIL.containerElement.getBoundingClientRect();
		const iconBB = icon.getBoundingClientRect();
		let topPosn = iconBB.bottom - contBB.top;
		let leftPosn = iconBB.left - contBB.left;
		popup.style.display = '';
		popup.style.top = topPosn + 'px';
		popup.style.left = leftPosn + 'px';
		const popupBB = popup.getBoundingClientRect();
		if (popupBB.bottom > contBB.bottom) {
			topPosn = iconBB.bottom - contBB.top + contBB.bottom - popupBB.bottom - 1;
			if (topPosn < 0) {
				topPosn = 0;
				popup.style.height = (contBB.height - 14) + 'px';
				popup.style.overflowY = 'scroll';
			} else {
				popup.style.height = '';
				popup.style.overflowY = '';
			}
		}
		if (popupBB.right > contBB.right) {
			leftPosn = iconBB.left - contBB.left + contBB.right - popupBB.right;
			if (popup.style.overflowY === 'scroll') {
				// Leave some space for added scrollbar.
				leftPosn = Math.max(leftPosn - 15, 0);
			}
		}
		popup.style.top = topPosn + 'px';
		popup.style.left = leftPosn + 'px';
	}

	function updatePopupPositions () {
		for (let idx = 0; idx < neighborPopups.length; idx++) {
			insertPopupNearIcon (neighborPopups[idx], neighborIcons[idx]);
		}
	}

	// Exported function.
	function removePopupNearIcon (popup, icon) {
		UTIL.containerElement.removeChild (popup);
		for (let idx = 0; idx < neighborPopups.length; idx++) {
			if (popup === neighborPopups[idx] && icon === neighborIcons[idx]) {
				neighborPopups.splice(idx,1);
				neighborIcons.splice(idx,1);
				return;
			}
		}
		console.error(new Error('attempt to remove unknown popup/icon tuple'));
	}

	// Documented pane events:
	// 'empty':
	// 	Before the content of a panel is emptied or changed (= empty + fill)
	// 	the empty handler (if any) for the panel is called synchronously.
	// 'resize':
	//	After the size of a panel has changed, the resize handler (if any) is called.

	// Pane event handlers are stored as three synchronized arrays.
	const panesWithEventHandlers = [];	// An array of panes with event handlers.
	const paneEventNames = [];		// The event names for the above panes.
	const paneEventHandlers = [];		// The event handlers for the above panes.

	// Exported function.
	// Set callback as the event handler for the specified pane and event.
	// Pane is the DOM element for the pane.
	// The previous handler, if any, is discarded.
	function registerPaneEventHandler (pane, name, callback) {
		if (debug) console.log ({ m: 'registerPaneEventHandler', pane, name, callback });
		// Update existing handler if any
		for (let idx = 0; idx < panesWithEventHandlers.length; idx++) {
			if (panesWithEventHandlers[idx] === pane && paneEventNames[idx] === name) {
				paneEventHandlers[idx] = callback;
				return;
			}
		}
		// Register new handler.
		panesWithEventHandlers.push (pane);
		paneEventNames.push (name);
		paneEventHandlers.push (callback);
	}

	// Move the event handlers, if any, from oldpane to newpane.
	// Oldpane and newpane are the DOM elements for the panes concerned.
	function updatePaneHandlers (oldpane, newpane) {
		for (let idx = 0; idx < panesWithEventHandlers.length; idx++) {
			if (panesWithEventHandlers[idx] === oldpane) {
				panesWithEventHandlers[idx] = newpane;
			}
		}
	}

	// Remove any event handlers from oldpane.
	// Oldpane is the DOM element for the pane concerned.
	function removePaneHandlers (oldpane) {
		for (let idx = 0; idx < panesWithEventHandlers.length; ) {
			if (panesWithEventHandlers[idx] === oldpane) {
				panesWithEventHandlers.splice (idx, 1);
				paneEventNames.splice (idx, 1);
				paneEventHandlers.splice (idx, 1);
			} else {
				idx++;
			}
		}
	}

	// Return the event handler for the specified pane and event.
	// If no handler, return a dummy handler.
	function getPaneEventHandler (pane, name) {
		for (let idx = 0; idx < panesWithEventHandlers.length; idx++) {
			if (panesWithEventHandlers[idx] === pane && paneEventNames[idx] === name) {
				return paneEventHandlers[idx];
			}
		}
		return () => {};
	}

	// Exported function.
	// Empty the pane identified by the Pane Location loc:
	// - all client elements (i.e. not the Pane Header) are removed from the DOM
	// - the empty handler (if any) is called then discarded
	// - the Pane Header is reset to empty
	// - the removed client elements are returned.
	function emptyPaneLocation (loc) {
		if (loc.pane === null) return;  //builder logic
		// Remove all client elements from the pane.
		const clientElements = [];
		for (let idx = 0; idx < loc.pane.childNodes.length; idx++) {
			const p = loc.pane.childNodes[idx];
			if (p !== loc.paneHeader) {
				loc.pane.removeChild(p);
				clientElements.push (p);
			}
		}
		// Call the empty callback, if any.
		getPaneEventHandler (loc.pane, 'empty') (loc, clientElements);
		removePaneHandlers (loc.pane);
		// Set pane title to empty, hide the gear icon, and remove client icons (if any).
		setPaneTitle (loc, 'empty');
		removePanelMenuGroupIcons (loc);
		PANE.setPaneClientIcons (loc, {});
		MMGR.getHeatMap().removePaneInfoFromMapConfig(loc.pane.id)
		// Return remaining client elements to caller.
		return clientElements;
	}

	// Remove any icons except the PanelMenuIcon from the panel menu group.
	function removePanelMenuGroupIcons (loc) {
	    const paneIcon = loc.paneHeader.querySelector('DIV.icon_group .paneMenuIcon');
	    const iconGroup = paneIcon.parentElement;
	    [...iconGroup.children].forEach (element => {
		if (element !== paneIcon) {
		    element.remove();
		}
	    });
	}

	
	// Create an initial, immediate child pane of the top-level container.
	// Used only during initialization of the panel interface.
	function createInitialPane () {
		const header = document.getElementById('mdaServiceHeader');
		const footer = document.getElementById('footer');
		const topContainer = document.getElementById('ngChmContainer');

		if (topContainer.children.length === 0) {

			if (debug) {
				console.log ('body height: ' + document.body.clientHeight);
				console.log ('header height: ' + header.offsetHeight);
				console.log ('footer height: ' + footer.offsetHeight);
				console.log ('Set top container height to ' + topContainer.style.height);
			}
			// Create an empty pane and insert it into the top container.
			const topbb = topContainer.getBoundingClientRect();
			const gpbb = topContainer.parentElement.getBoundingClientRect();
			if (debug) {
				console.log ({ m: 'Initial top container bb', topbb });
				console.log ({ m: 'Initial top.parentElement container bb', gpbb });
			}
			const initialPane = newPane({ width: '100%', height: '100%' }, 'empty', null);
			topContainer.appendChild(initialPane);
			initialPane.style.height = topbb.height + 'px';
			initialPane.style.width = topbb.width + 'px';
			return initialPane;
		} else {
			console.error ({ m: 'topContainer already initialized', bb: topContainer.getBoundingClientRect() });
			return topContainer.children[0];
		}
	}

	/**********************************************************************************
	 * START: PANE SIZING
	 **********************************************************************************/

	// Creation function for an object that manages dragging events on a divider.
	function DividerControl (divider) {

		this.dividerElement = divider;

		this.debounceT = 0;	// Pending debounce timeout if not 0.
		this.debounceX = 0;	// Total change in X since last debounce timeout
		this.debounceY = 0;	// Total change in Y since last debounce timeout
		this.debounceN = 0;	// Number of move events since last debounce timeout

		// Add listeners for events that initiate divider movement to the divider.
		(function(dc) {
			if (debug) console.log ({ dc });
			dc.dividerElement.onmousedown = (e) => dc.dividerStart(e);
			dc.dividerElement.ontouchstart = (e) => dc.dividerStart(e);
		})(this);
	}

	// This method is called when a divider move is initiated.  It sets global listeners
	// for pointer movement and release events.
	DividerControl.prototype.dividerStart = function(e) {
		// Prevent iframes from grabbing the pointer while the divider is moving.
		const iframes = [...document.getElementsByTagName('IFRAME')];
		iframes.forEach (iframe => iframe.classList.add('nopointer'));

		UHM.hlpC();
		e.preventDefault();

		if (MMGR.getHeatMap()) MMGR.getHeatMap().setUnAppliedChanges(true);

		this.excessDrag = 0;

		// Create and register listeners for pointer events while the divider is moving.
		this.moveListener = (function(dc) {
			return ((e) => dc.dividerMove(e));
		})(this);
		this.endListener = (function(dc) {
			return ((e) => dc.dividerEnd(e));
		})(this);
		document.addEventListener('mousemove', this.moveListener, UTIL.passiveCompat({passive: false}));
		document.addEventListener('touchmove', this.moveListener, UTIL.passiveCompat({passive: false}));
		document.addEventListener('mouseup', this.endListener);
		document.addEventListener('touchend', this.endListener);
		UTIL.containerElement.addEventListener('mouseleave', this.endListener);
	};

	// This method is called for each pointer movement while moving the divider.
	// It debounces the movement events and calls debouncedDividerMove periodically.
	DividerControl.prototype.dividerMove = function (e) {

		if (debug) console.log({ m: 'dividerMove', dc: this, e });
		e.preventDefault();
		e.stopPropagation();
		let x = e.movementX;
		let y = e.movementY;
		if (e.touches) {
			if (e.touches.length > 1) {
				return false;
			} else {
				x = UTIL.getCursorPosition(e).x;
				y = UTIL.getCursorPosition(e).y;
			}
		}
		// Add this event's change in x and y to the current totals.
		this.debounceX += x;
		this.debounceY += y;
		this.debounceN ++;

		// Schedule a debounced divider timeout if there isn't one already.
		if (this.debounceT === 0) {
			this.debounceT = setTimeout (() => {
				this.debounceT = 0;
				this.debouncedDividerMove (this.debounceX, this.debounceY);
				this.debounceX = 0;
				this.debounceY = 0;
				this.debounceN = 0;
			}, 32);
		}
	};

	// Get the closest uncollapsed pane/container before el, which is a divider element.
	function getPrevUncollapsedPane (el) {
		el = el.previousElementSibling;
		while (el && el.classList.contains('collapsed')) {
			el = el.previousElementSibling;  // Should be a divider.
			if (el) el = el.previousElementSibling; // So skip it.
		}
		return el;
	}

	// Get the closest uncollapsed pane/container after el, which is a divider element.
	function getNextUncollapsedPane (el) {
		el = el.nextElementSibling;
		while (el && el.classList.contains('collapsed')) {
			el = el.nextElementSibling;  // Should be a divider.
			if (el) el = el.nextElementSibling; // So skip it.
		}
		return el;
	}

	// This method is called for debounced move events while moving the divider.
	// The parameters are the total change in x and y since
	// the last time this function was called.
	DividerControl.prototype.debouncedDividerMove = function debouncedDividerMove (x, y) {
		// Determine current neighbors.
		const element1 = getPrevUncollapsedPane (this.dividerElement);
		const element2 = getNextUncollapsedPane (this.dividerElement);
		if (!element1 || !element2) {
			if (debug) console.log ('Divider not between (expanded) siblings');
			return;
		}
		// Determine the allowed change for the current divider.
		const bb1 = element1.getBoundingClientRect();
		const bb2 = element2.getBoundingClientRect();
		let change = false;
		let resizeEvent1 = null, resizeEvent2 = null;
		if (this.dividerElement.classList.contains('resizerHelperRight')) {
			// Vertical divider. Panes are side-by-side.
			const w1 = bb1.width;
			const w2 = bb2.width;
			x += this.excessDrag;
			this.excessDrag = 0;
			if (x < 0 && (w1+x) < 30) { this.excessDrag = x; x = 0; };
			if (x > 0 && (w2-x) < 30) { this.excessDrag = x; x = 0; };
			if (x !== 0) {
				change = true;
				resizeEvent1 = new CustomEvent('paneresize', { detail: { what: 'width', amount: x }});
				resizeEvent2 = new CustomEvent('paneresize', { detail: { what: 'width', amount: -x }});
			}
		} else {
			// Horizontal divider. Panes are one above the other.
			const h1 = bb1.height;
			const h2 = bb2.height;
			y += this.excessDrag;
			this.excessDrag = 0;
			if (y < 0 && (h1+y) < 30) { this.excessDrag = y; y = 0; }
			if (y > 0 && (h2-y) < 30) { this.excessDrag = y; y = 0; }
			if (y !== 0) {
				change = true;
				resizeEvent1 = new CustomEvent('paneresize', { detail: { what: 'height', amount: y }});
				resizeEvent2 = new CustomEvent('paneresize', { detail: { what: 'height', amount: -y }});
			}
		}

		if (debug) console.log ({ m: 'dividerMove', x, y, e1w: element1.style.width, e1h: element1.style.height, debounceN: this.debounceN });

		if (change) {
			// Propagate the allowed change to the divider's neighbors.
			// The conditional guards below ensure that we always resize the
			// element that's shrinking before resizing the element that's growing.
			if (resizeEvent1.detail.amount < 0) element1.dispatchEvent(resizeEvent1);
			element2.dispatchEvent(resizeEvent2);
			if (resizeEvent1.detail.amount > 0) element1.dispatchEvent(resizeEvent1);
			updatePopupPositions ();
		}
	};

	// This method is called when the divider move is completed.
	// It removes the global pointer listeners and resets the DOM state.
	DividerControl.prototype.dividerEnd = function (e) {

		if (debug) console.log({ 'dividerEnd': e });
		e.preventDefault();

		// Clear any outstanding debounce timeout.
		if (this.debounceT !== 0) {
			clearTimeout (this.debounceT);
			this.debounceT = 0;
		}

		// Allow iframes to see the pointer again.
		const iframes = [...document.getElementsByTagName('IFRAME')];
		iframes.forEach (iframe => iframe.classList.remove('nopointer'));

		document.removeEventListener('mousemove', this.moveListener);
		document.removeEventListener('mouseup', this.endListener);
		document.removeEventListener('touchmove',this.moveListener);
		document.removeEventListener('touchend',this.endListener);

		// Fine tune container space distribution if needed.
		const element2 = getNextUncollapsedPane (this.dividerElement);
		if (element2) {
			redistributeContainer (this.dividerElement.parentElement, element2);
			updatePopupPositions ();
		} else {
			if (debug) console.log ('Divider not between (expanded) siblings');
		}
	};

	// This function redistributes the space in the container so that total space (height or width)
	// assigned to subelements and dividers equals the space of the container.
	// Any space adjustment needed is made by altering the space for the element
	// spaceTarget (a child element of container).
	function redistributeContainer (container, spaceTarget) {
		if (debug) console.log ({ m: '> redistributeContainer', container, spaceTarget });
		const bb2 = spaceTarget.getBoundingClientRect();
		const sibs = container.children;
		if (container.classList.contains('vertical')) {
			// Vertical container. Panes are one above the other.
			let calch2 = container.clientHeight;
			for (let ii = 0; ii < sibs.length; ii++) {
				if (sibs[ii].classList.contains('resizerHelper')) {
					calch2 = calch2 - sibs[ii].offsetHeight - horizontalDividerMargins;
				} else if (sibs[ii] !== spaceTarget) {
					calch2 = calch2 - sibs[ii].offsetHeight;
				}
			}
			if (calch2 != Math.round(bb2.height)) {
				if (debug) console.log ('Target pane is ' + bb2.height + ' pixels, but should be ' + calch2 + ' pixels');
				const resizeEvent2 = new CustomEvent('paneresize', { detail: { what: 'height', amount: calch2 - bb2.height }});
				spaceTarget.dispatchEvent(resizeEvent2);
			}
		} else {
			// Horizontal container. Panes are side-by-side.
			let calcw2 = container.clientWidth;
			for (let ii = 0; ii < sibs.length; ii++) {
				if (sibs[ii].classList.contains('resizerHelper')) {
					calcw2 = calcw2 - sibs[ii].offsetWidth - verticalDividerMargins;
				} else if (sibs[ii] !== spaceTarget) {
					calcw2 = calcw2 - sibs[ii].offsetWidth;
				}
			}
			if (calcw2 != Math.round(bb2.width)) {
				if (debug) console.log ('Target pane is ' + bb2.width + ' pixels, but should be ' + calcw2 + ' pixels');
				const resizeEvent2 = new CustomEvent('paneresize', { detail: { what: 'width', amount: calcw2 - bb2.width }});
				spaceTarget.dispatchEvent(resizeEvent2);
			}
		}

		// Set the heatmap's DividerPref iff the Pane configuation matches the standard configuration.
		const { summary, detail } = getStandardConfiguration();
		if (summary) {
			const sumPercent = Math.ceil(100 * summary.pane.clientWidth / UTIL.containerElement.clientWidth);
			if (debug) console.log ('Setting DividerPref to ' + sumPercent);
			MMGR.getHeatMap().setDividerPref(sumPercent);
		}
	}

	// Exported function.
	// Set the percent of the display width to use for the summary panel.
	// Only update the display if the panes are in the standard confirguration.
	function setDividerPref (percent) {
		MMGR.getHeatMap().setDividerPref (percent);
		const { summary, detail, divider } = getStandardConfiguration();
		if (summary) {
			if (debug) console.log ('Need to resize DividerPref to ' + percent);
			setPanePropWidths (percent, summary.pane, detail.pane, divider)
		}
	}

	// Exported function.
	function setPanePropWidths (percent, left, right, divider) {
		const w = UTIL.containerElement.clientWidth - divider.offsetWidth - verticalDividerMargins;
		const w1 = (w * percent) / 100;
		left.style.width = w1 + 'px';
		right.style.width = (w - w1) + 'px';
		resizePane (left, false);
		resizePane (right, false);
	}

	// The DOM element pane has been resized.
	function resizePane (pane) {
		const loc = findPaneLocation (pane);
		if (debug) console.log ({ m: 'resizePane', title: loc.paneTitle.innerText, loc });
		if (loc.pane.children.length > 1) {
		    // Set height available for panel contents (child 1) after accounting
		    // for header height (child 0) and the header's bottom margin (not included in offsetHeight).
		    loc.pane.children[1].style.height = (loc.pane.clientHeight - loc.pane.children[0].offsetHeight - 4) + 'px';
		}
		getPaneEventHandler (loc.pane, 'resize') (loc);
	}

	// If the panel configuration is in its initial standard configuration
	// (a summary heat map and a detail heat map side-by-side),
	// this function returns an object containing the PaneLocations of the summary and detail NG-CHMs.
	// Otherwise, it returns an empty object.
	function getStandardConfiguration() {
		const c1 = UTIL.containerElement.children;
		// Stop if top-level container does not contain exactly one container.
		if (c1.length !== 1 || !c1[0].classList.contains('ngChmContainer')) return {};
		// Stop if subcontainer is not horizontal.
		if (c1[0].classList.contains('vertical')) return {};
		// Stop if subcontainer does not contain exactly two panes.
		const c2 = c1[0].children;
		if (c2.length !== 3 || !c2[0].classList.contains('pane') || !c2[2].classList.contains('pane')) return {};
		const p1 = findPaneLocation (c2[0]);
		const p2 = findPaneLocation (c2[2]);
		// FIXME: These magic strings come from Summary and Detail heatmap display modules.
		if (p1.paneTitle.innerText !== 'Heatmap Summary') return {};
		if (p2.paneTitle.innerText !== 'Heatmap Detail') return {};
		return { summary: p1, detail: p2, divider: c2[1] };
	}

	/**********************************************************************************
	 * END: PANE SIZING
	 **********************************************************************************/

})();
