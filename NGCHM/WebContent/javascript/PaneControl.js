"use strict";

//Define Namespace for Pane Control
NgChm.createNS('NgChm.Pane');

NgChm.Pane.showPaneHeader = true;
NgChm.Pane.ngchmContainerWidth = 100;	// Percent of window width to use for NGCHM
NgChm.Pane.ngchmContainerHeight = 100;	// Percent of window height to use for NGCHM

(function(){

	/////////////////////////////////////////////////////////////////////
	//
	// Define exports.
	//

	// function initializePanes() - call to (re-)initialize pane interface
	NgChm.Pane.initializePanes = initializePanes;

	// function findPaneLocation(el) - return PaneLocation containing element el
	NgChm.Pane.findPaneLocation = findPaneLocation;

	// function emptyPaneLocation(loc) - remove and return client elements from pane location
	NgChm.Pane.emptyPaneLocation = emptyPaneLocation;

	// function openDetailPaneLocation(oldLoc, loc.pane.id) - Add new secondary detail pane
	NgChm.Pane.openDetailPaneLocation = openDetailPaneLocation;
	
	// function splitPaneCheck (vertical, loc) - check if OK to split pane
	NgChm.Pane.splitPaneCheck = splitPaneCheck;

	// function splitPane (vertical, loc) - split the pane at PaneLocation loc
	NgChm.Pane.splitPane = splitPane;

	// function registerPaneContentOption (menuEntry, callback) - register pane content option
	NgChm.Pane.registerPaneContentOption = registerPaneContentOption;

	// function setPanePropWidths (percent, left, right, divider) - set default pane proportions
	NgChm.Pane.setPanePropWidths = setPanePropWidths;

	// function registerPaneEventHandler(pane,name,callback) - set callback for Event name on pane
	NgChm.Pane.registerPaneEventHandler = registerPaneEventHandler;

	// function switchToPlugin (loc, name) - switch the pane to the plugin called name.
	NgChm.Pane.switchToPlugin = switchToPlugin;
	
	// function clearExistingGearDialog (paneId) - clear any existing gear dialog from pane.
	NgChm.Pane.clearExistingGearDialog = clearExistingGearDialog

	// function setDividerPref (percent) - resize panes in standard configuration.
	NgChm.Pane.setDividerPref = setDividerPref;

	// function setPaneTitle (loc, title) - set the title of the pane at PaneLocation loc
	NgChm.Pane.setPaneTitle = setPaneTitle;

	// function setPaneClientIcons (loc, icons) - Set the icon group containing icons (an array) to the pane header.
	NgChm.Pane.setPaneClientIcons = setPaneClientIcons;

	// function insertPopupNearIcon (popup, icon) - display a popup near a pane icon
	NgChm.Pane.insertPopupNearIcon = insertPopupNearIcon;

	// function removePopupNearIcon (popup, icon) - remove a popup inserted by insertPopupNearIcon
	NgChm.Pane.removePopupNearIcon = removePopupNearIcon;

	//
	/////////////////////////////////////////////////////////////////////

	const debug = false;
	const verticalDividerMargins = 20;	// Total left+right margins for a vertical divider
	const horizontalDividerMargins = 10;	// Total top+bottom margins for a horizontal divider
						// Above two constants must match sizes specified in css file.

	// Return unique ID for a pane element - to aid in automated tests
	var nextUniquePaneId = 1;
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
			// Should have found the pane element.
			console.error ({ m: 'findPaneLocation: could not find pane', element, res });
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

	var panesInitialized = false;
	// Exported function.
	// Create the initial panel structure.
	function initializePanes () {
		if (debug) console.log ('Initialize Panes');

		const topContainer = document.getElementById('ngChmContainer');
		if (!panesInitialized) {
			NgChm.Pane.resizeNGCHM = resizeNGCHM;
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
				if (typeof ch.getBoundingClientRect != "function") {
					console.error ({ m: 'getBoundingClientRect', ch });
				}
				const oldbb = ch.getBoundingClientRect();
				const newWidth = Math.floor (NgChm.Pane.ngchmContainerWidth * bb.width / 100);
				const newHeight = Math.floor (NgChm.Pane.ngchmContainerHeight * bb.height / 100) - hdrbb.height;

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
			}
		}
	}

	// Initialize DOM IMG element icon to a panel menu.
	var openIconMenu = null;
	function initializePaneIconMenu (icon) {
		icon.onmouseout = function(e) {
			icon.src = 'images/paneMenu.png';
			NgChm.UHM.hlpC();
		};
		icon.onmouseover = function(e) {
			icon.src = 'images/paneMenuHover.png';
			NgChm.UHM.hlp(icon, 'Open pane menu', 120, 0);
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

	// Initialize DOM IMG element for the screen mode (expand/contract) function.
	function initializePaneScreenMode (icon, paneId) {
		icon.id = paneId + "_ScreenMode";
		icon.onmouseout = function(e) {
			NgChm.UHM.hlpC();
		};
		icon.onmouseover = function(e) {
			NgChm.UHM.hlp(icon, 'Expand/Contract Panel', 120, 0);
		};
		icon.addEventListener ('click', function(icon) {
			changeScreenMode (icon);
		}, true);
	}

	// Change screen mode and icon button when user invokes functionality.
	function changeScreenMode (icon) {
		let iconTarget = icon.currentTarget;
		let paneId = icon.currentTarget.id.split("_")[0];
		if (isPaneExpanded === true) {
			icon.currentTarget.src = 'images/iconFullScreen.png';
			closeFullScreen(paneId);
		} else {
			icon.currentTarget.src = 'images/iconCloseFullScreen.png';
			openFullScreen(paneId);
		}
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
		//Hide all contaniers but the one holding the pane being expanded AND the top container
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
		//Resize panels
		NgChm.SUM.calcSummaryLayout();NgChm.SUM.redrawSummaryPane();
		NgChm.DMM.detailResize();NgChm.DET.setDrawDetailTimeout(NgChm.DET.redrawSelectionTimeout, false);
	}
	
	function closeFullScreen (paneId) {
		isPaneExpanded = false;
		const thisPane = document.getElementById(paneId);
		const thisPaneParent = thisPane.parentElement;
		//Hide all panes
		displayPanes('');
		//Hide all re-sizers
		displayResizers ('');
		//Hide all containers but the ones holding the pane being expanded AND the top container
		displayContainers('flex');
		//Resize the pane being expanded to fill it's parent container
		thisPaneParent.style.width = origContainer.width;
		thisPaneParent.style.height = origContainer.height;
		thisPane.style.width = origPane.width;
		thisPane.style.height = origPane.height;
		//Rest original sizing objects
		origPane = {};
		origContainer = {};
		activeContainers = [];
		//Resize all panels
		NgChm.SUM.calcSummaryLayout();NgChm.SUM.redrawSummaryPane();
		NgChm.DMM.detailResize();NgChm.DET.setDrawDetailTimeout(NgChm.DET.redrawSelectionTimeout, false);
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

	// Initialize DOM IMG element icon to a gear menu.
	function initializeGearIconMenu (icon) {
		icon.classList.add('hide');
		icon.onmouseout = function(e) {
			icon.src = 'images/gear.png';
			NgChm.UHM.hlpC();
		};
		icon.onmouseover = function(e) {
			icon.src = 'images/gearHover.png';
			NgChm.UHM.hlp(icon, 'Open gear menu', 120, 0);
		};
		icon.onclick = function(e) {
			if (debug) console.log ({ m: 'paneGearIcon click', e });
			e.stopPropagation();
			let paneIdx = e.target.id.slice(0,-4) // e.g. 'pane2Gear'
			NgChm.LNK.newGearDialog (icon, paneIdx);
		};
	}

	// Exported function.
	function setPaneTitle (loc, title) {
		loc.paneTitle.innerText = title;
	}

	// Exported function.
	// Switch the pane specified by Pane Location loc to the plugin called name.
	function switchToPlugin (loc, name) {
		setPaneTitle (loc, name);
		const gearIcon = loc.paneHeader.getElementsByClassName('gearIcon')[0];
		gearIcon.classList.remove('hide');
		clearExistingGearDialog (loc.pane.id);
		NgChm.LNK.newGearDialog (gearIcon, loc.pane.id);
	}
	
	// Exported function.
	// Check for and clear any existing gear dialog on the pane.
	function clearExistingGearDialog (paneId) {
		const existingGear = document.getElementById(paneId+"Gear");
		const existingIcon = document.getElementById(paneId+"Icon");
		if (existingGear !== null) {
			removePopupNearIcon (existingGear, existingIcon);
		}
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

		if (debug) console.log ({ m: 'paneresize', e });

		// Quit if (propagated) resize amount has shrunk to zero.
		if (e.detail.amount === 0) return;
		const bb = e.target.getBoundingClientRect();

		// If shrinking, shrink children first.
		if (e.detail.amount < 0) resizeChildren();

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
				const children = [...e.target.children].filter(ch => !ch.classList.contains('resizerHelper'));
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
		if (paneid == null) paneid = getUniquePaneId();
		const pane = NgChm.UTIL.newElement('DIV.pane', { style, id: paneid });
		pane.addEventListener('paneresize', resizeHandler);
		if (title) {
			const h = NgChm.UTIL.newElement('DIV.paneHeader.activePane');
			if (!NgChm.Pane.showPaneHeader) h.classList.add ('hide');
			pane.appendChild(h);

			const sc = NgChm.UTIL.newElement('DIV.paneScreenMode');
			h.appendChild (sc);

			const t = NgChm.UTIL.newElement('DIV.paneTitle');
			t.innerText = title;
			h.appendChild (t);

			const ig = NgChm.UTIL.newElement('DIV.icon_group');
			h.appendChild(ig);

			const img2 = NgChm.UTIL.newElement('IMG.gearIcon', {
				src: 'images/gear.png',
				alt: 'Open gear menu',
				align: 'top',
				id: paneid+"Icon"
			});
			initializeGearIconMenu (img2);
			ig.appendChild(img2);

			const img = NgChm.UTIL.newElement('IMG.paneMenuIcon', {
				src: 'images/paneMenu.png',
				alt: 'Open pane menu',
				align: 'top'
			});
			initializePaneIconMenu (img);
			const imgScr = NgChm.UTIL.newElement('IMG.paneScreenModeIcon', {
				src: 'images/iconFullScreen.png',
				alt: 'Expand Pane',
				align: 'left'
			});
			initializePaneScreenMode(imgScr, paneid);
			ig.appendChild(img);
			sc.appendChild(imgScr);

		}
		return pane;
	}

	// Exported function.
	// Add an icon group containing icons (an array) to the pane header.
	function setPaneClientIcons (loc, icons) {
		if (!loc.paneHeader || !loc.paneTitle) return;
		var ig = loc.paneTitle.nextSibling;
		// Remove existing clientIcons, if any.
		if (ig && ig.classList.contains('client_icons')) {
			ig.remove();
		}
		if (icons && icons.length > 0) {
		    ig = NgChm.UTIL.newElement('DIV.icon_group.client_icons');
		    while (icons.length > 0) {
			    ig.appendChild (icons.shift());
		    }
		    loc.paneHeader.insertBefore (ig, loc.paneTitle.nextSibling);
		}
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
				let dialog = document.getElementById('msgBox')
				NgChm.UHM.initMessageBox();
				NgChm.UHM.setMessageBoxHeader('PathwayMapper Pane Reset Warning');
				NgChm.UHM.setMessageBoxText('This action will delete all the information in PathwayMapper. Would you like to continue?')
				NgChm.UHM.setMessageBoxButton(1, 'images/cancelSmall.png', 'Cancel Button')
				NgChm.UHM.setMessageBoxButton(2, 'images/okButton.png', 'OK Button')
				dialog.style.display = '';
				return new Promise(function(resolve, reject) {
					let okButton = dialog.querySelector('#msgBoxBtnImg_2')
					let cancelButton = dialog.querySelector('#msgBoxBtnImg_1')
					dialog.addEventListener('click', function handleButtonClick(e) {
						if (e.target.tagName !== 'IMG') {return;}
						dialog.removeEventListener('click', handleButtonClick)
						if (e.target === okButton) {
							resolve();
						} else {
							reject()
						}
					})
				})
			}
			promisePrompt(vertical, loc)
				.then(function() {  // promise resolved, split pane
					NgChm.UHM.messageBoxCancel();
					splitPane(vertical, loc)
				})
				.catch(function() {  // promise rejected, do not split pane
					NgChm.UHM.messageBoxCancel();
					return;
				})
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
		const divider = NgChm.UTIL.newElement('DIV.resizerHelper');
			divider.classList.add('resizerHelper' + (vertical ? 'Bottom' : 'Right'));
		const splitter = NgChm.UTIL.newElement('DIV');
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

	function collapsePane (loc) {
		if (debug) console.log ('collapsePane');
		loc.pane.classList.add('collapsed');
	}

	function expandPane (loc) {
		if (debug) console.log ('expandPane');
		loc.pane.classList.remove('collapsed');
	}

	const paneContentOptions = [];

	// Exported function.
	function registerPaneContentOption (menuEntry, callback) {
		paneContentOptions.push ({ menuEntry, callback });
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
		const menu = NgChm.UTIL.newElement('DIV.menuPanel');
		const paneLoc = findPaneLocation(icon);

		function menuHeader (text) {
			const mh = NgChm.UTIL.newElement('DIV.menuHeader');
			mh.onclick = () => {
			};
			mh.innerText = text;
			menu.appendChild(mh);
		}

		function menuItem (text, callback) {
			const mi = NgChm.UTIL.newElement('DIV.menuItem');
			mi.onclick = () => {
				callback ();
			};
			mi.innerText = text;
			menu.appendChild(mi);
		}

		function menuItemDisabled (text) {
			const mi = NgChm.UTIL.newElement('DIV.menuItem.disabled');
			mi.onclick = () => {
			};
			mi.innerText = text;
			menu.appendChild(mi);
		}

		function menuSeparator() {
			const mb = NgChm.UTIL.newElement('DIV.menuItemBorder');
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
					getPaneEventHandler (loc.pane, 'resize') (loc);
				});
			});
			// Add plugin options.
			const plugins = NgChm.LNK.getPanePlugins ();
			plugins.forEach(plugin => {
				if (plugin.params) {
					menuItem (plugin.name, () => {
						const loc = findPaneLocation (icon);
						emptyPaneLocation (loc);
						NgChm.LNK.switchPaneToPlugin (loc, plugin);
					});
				}
			});  
			menuSeparator();
		}

		menuHeader ('Pane control');
		if (isPaneExpanded === true) {
			menuItemDisabled ('Add Pane Below');
			menuItemDisabled ('Add Pane Right');
		} else if (paneLoc.pane.classList.contains('collapsed')) {
			menuItemDisabled ('Add Pane Below');
			menuItemDisabled ('Add Pane Right');
		} else {
			menuItem ('Add Pane Below', () => {
				splitPaneCheck (true, findPaneLocation(icon));
			});
			menuItem ('Add Pane Right', () => {
				splitPaneCheck (false, findPaneLocation(icon));
			});
		}
		const collapsedPaneIdx = collapsedPanes.indexOf (paneLoc.pane);

		if (isPaneExpanded === true) {
			menuItemDisabled ('Collapse');
		} else if (collapsedPaneIdx >= 0) {
			menuItem ('Expand', () => {
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
					collapsedPanes.push (paneLoc.pane);
					collapsePane (findPaneLocation(icon));
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
					emptyPaneLocation (paneLoc);
					if (debug) console.log({ m: 'closePane', paneLoc, parentC, siblings: paneLoc.container.children });
					try { // remove Gear dialong if it exists
						let idIdx = paneLoc.pane.id.slice(4) // id is, e.g., 'pane3'
						let gearDialog = document.getElementById('pane'+idIdx+'Gear')
						let gearIcon = document.getElementById('pane'+idIdx+'Icon')
						NgChm.Pane.removePopupNearIcon(gearDialog, gearIcon)
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
								console.log ('Merging into parent container.');
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
						let dialog = document.getElementById('msgBox');
						NgChm.UHM.initMessageBox();
						NgChm.UHM.setMessageBoxHeader('PathwayMapper Pane Reset Warning');
						NgChm.UHM.setMessageBoxText('This action will delete all information in PathwayMapper. Would you like to continue?')
						NgChm.UHM.setMessageBoxButton(1, 'images/cancelSmall.png', 'Cancel Button')
						NgChm.UHM.setMessageBoxButton(2, 'images/okButton.png', 'OK Button')
						dialog.style.display = '';
						return new Promise(function(resolve, reject) {
							let okButton = dialog.querySelector('#msgBoxBtnImg_2')
							let cancelButton = dialog.querySelector('#msgBoxBtnImg_1')
							dialog.addEventListener('click', function handleButtonClick(e) {
								if (e.target.tagName !== 'IMG') {return;}
								dialog.removeEventListener('click', handleButtonClick)
								if (e.target === okButton) {
									resolve();
								} else { 
									reject();
								}
							})
						})
					}  // end function promisePrompt
					// If user is attempting to close a pane that will result in resetting PathwayMapper, offer them the chance to cancel:
					if (paneLoc.container.textContent.indexOf('PathwayMapper') > -1 && c.length < 4) {
						promisePrompt(paneLoc)
							.then(function() { // promise resolved, continue pane manipulation
								NgChm.UHM.messageBoxCancel()
								removePaneAndAdjacentDivider();
								if (paneLoc.container.children.length === 1) {
									replaceContainerWithOnlyChild()
								} else {
									// Redistribute space among remaining children.
									if (target) redistributeContainer (paneLoc.container, target);
								}
							})
							.catch(function() { // promise rejected, do NOT continue pane manipulation
								NgChm.UHM.messageBoxCancel()
								return;
							})
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
		if (popup.parentElement !== NgChm.UTIL.containerElement) {
			// Test lets us reuse this function to reposition popup after moving the icon.
			NgChm.UTIL.containerElement.appendChild(popup);
			neighborPopups.push (popup);
			neighborIcons.push (icon);
		}
		const contBB = NgChm.UTIL.containerElement.getBoundingClientRect();
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
		NgChm.UTIL.containerElement.removeChild (popup);
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
		const gearIcon = loc.paneHeader.getElementsByClassName('gearIcon')[0];
		gearIcon.classList.add('hide');
		NgChm.Pane.setPaneClientIcons (loc, []);

		// Return remaining client elements to caller.
		return clientElements;
	}
	
	function openDetailPaneLocation (loc, newPane) {
		// Remove all client elements from the pane.
		const clientElements = [];
		let pClone = null;	
		for (let idx = 0; idx < loc.pane.childNodes.length; idx++) {
			const p = loc.pane.childNodes[idx];
			if (p !== loc.paneHeader) {
				//drawImage() called passing the source canvas directly
				pClone = p.cloneNode(true);
				NgChm.DMM.nextMapNumber++;
				pClone.id = p.id + NgChm.DMM.nextMapNumber;
				renameElements(pClone);
				clientElements.push (pClone);
				NgChm.DMM.AddDetailMap(pClone, newPane);
				
			}
		}
		// Return remaining client elements to caller.
		return clientElements;
	}

	function renameElements (pClone) {
		// Rename all client elements on the pane.
		for (let idx = 0; idx < pClone.children.length; idx++) {
			const p = pClone.children[idx];
			p.id = p.id + NgChm.DMM.nextMapNumber;
			if (p.children.length > 0) {
				let removals = [];
		        for (let idx2 = 0; idx2 < p.children.length; idx2++) {
					const q = p.children[idx2];
					//rename all but label elements and place label elements in a deletion array
					if ((q.id.includes('rowLabelDiv')) || (q.id.includes('colLabelDiv'))) {
						q.id = q.id + NgChm.DMM.nextMapNumber;
					} else {
						removals.push(q.id);
					}
		        }
		        //strip out all label elements
		        for (let idx3 = 0; idx3 < removals.length; idx3++) {
					const rem = removals[idx3];
			        for (let idx4 = 0; idx4 < p.children.length; idx4++) {
						const q = p.children[idx4];
						if (rem === q.id) {
							q.remove();
							break;
						}
			        }
		        }
			}
		}
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

		NgChm.UHM.hlpC();
		e.preventDefault();

		if (NgChm.heatMap) NgChm.heatMap.setUnAppliedChanges(true);

		// Create and register listeners for pointer events while the divider is moving.
		this.moveListener = (function(dc) {
			return ((e) => dc.dividerMove(e));
		})(this);
		this.endListener = (function(dc) {
			return ((e) => dc.dividerEnd(e));
		})(this);
		document.addEventListener('mousemove', this.moveListener, NgChm.UTIL.passiveCompat({passive: false}));
		document.addEventListener('touchmove', this.moveListener, NgChm.UTIL.passiveCompat({passive: false}));
		document.addEventListener('mouseup', this.endListener);
		document.addEventListener('touchend', this.endListener);
		NgChm.UTIL.containerElement.addEventListener('mouseleave', this.endListener);
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
				x = NgChm.UTIL.getCursorPosition(e).x;
				y = NgChm.UTIL.getCursorPosition(e).y;
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
			if (x < 0 && (w1+x) < 30) x = 0;
			if (x > 0 && (w2-x) < 30) x = 0;
			if (x !== 0) {
				change = true;
				resizeEvent1 = new CustomEvent('paneresize', { detail: { what: 'width', amount: x }});
				resizeEvent2 = new CustomEvent('paneresize', { detail: { what: 'width', amount: -x }});
			}
		} else {
			// Horizontal divider. Panes are one above the other.
			const h1 = bb1.height;
			const h2 = bb2.height;
			if (y < 0 && (h1+y) < 30) y = 0;
			if (y > 0 && (h2-y) < 30) y = 0;
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
			const sumPercent = Math.ceil(100 * summary.pane.clientWidth / NgChm.UTIL.containerElement.clientWidth);
			if (debug) console.log ('Setting DividerPref to ' + sumPercent);
			NgChm.heatMap.setDividerPref(sumPercent);
		}
	}

	// Exported function.
	// Set the percent of the display width to use for the summary panel.
	// Only update the display if the panes are in the standard confirguration.
	function setDividerPref (percent) {
		NgChm.heatMap.setDividerPref (percent);
		const { summary, detail, divider } = getStandardConfiguration();
		if (summary) {
			if (debug) console.log ('Need to resize DividerPref to ' + percent);
			setPanePropWidths (percent, summary.pane, detail.pane, divider)
		}
	}

	// Exported function.
	function setPanePropWidths (percent, left, right, divider) {
		const w = NgChm.UTIL.containerElement.clientWidth - divider.offsetWidth - verticalDividerMargins;
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
		getPaneEventHandler (loc.pane, 'resize') (loc);
	}

	// If the panel configuration is in its initial standard configuration
	// (a summary heat map and a detail heat map side-by-side),
	// this function returns an object containing the PaneLocations of the summary and detail NG-CHMs.
	// Otherwise, it returns an empty object.
	function getStandardConfiguration() {
		const c1 = NgChm.UTIL.containerElement.children;
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
