// The text to display in the tour dialog box is determined by data-title
// and data-intro attributes added to the elements in the tour.
//
// The selection and order of elements to include in the tour is determined
// programmatically and is a combination of both fixed elements and dynamic
// elements based on the current display.
//
(function() {
NgChm.TOUR = { showTour };

function showTour (loc) {

    if (!introJs) return;  // User clicked before introJs has loaded.

    if (loc) {
	const steps = [...loc.pane.querySelectorAll("*[data-intro]")].map (e => {
	        const step = { element: e, intro: e.dataset.intro };
		if (e.dataset.title) step.title = e.title;
		return step;
	});
	steps.unshift ({ element: loc.pane, title: "Brief Panel Tour", intro: "We'll briefly highlight and describe the major features of this NG-CHM panel." });
	addTourOfPanelControls (loc.pane, steps);
	addTourOfSummaryNGCHM (loc.pane, steps);
	addTourOfDetailNGCHM (loc.pane, steps);
	steps.push ({ title: "End of Panel Tour", intro: "This completes the tour of this panel." });
	introJs().setOptions({steps}).start();
	return;
    }

    const querySelectors = [
	"#introButton", "#introAboutButton", "#aboutMenu_btn", "#fileButton", "#barMenu_btn", "#colorMenu_btn", "#pdf_gear",
        "#mapName", "#fileOpen_btn", "#back_btn", "#search_on", "#search_text", "#search_cov_cont", "#search_target", "#go_btn", "#prev_btn", "#next_btn", "#cancel_btn",
    ];
    const tourElements = querySelectors.map(qs => document.querySelector(qs)).filter (e => e !== null && e.clientHeight > 0);
    const steps = tourElements.map(e => {
	const step = { element: e, intro: e.dataset.intro || "Missing data-intro" };
	if (e.dataset.title) step.title = e.dataset.title;
	return step;
    });
    steps.unshift ({ title: "Brief Interface Tour", intro: "We'll briefly highlight and describe the major features of the NG-CHM viewer that you can currently see." });
    if (true) {
	// Add help items for dynamicly inserted panels.
	let e = document.querySelector (".pane");
	if (e && e.clientHeight > 0) {
	    steps.push ({ element: e, title: "Panel", intro: "Content panels display NG-CHM visualizations, such as summary views, detail views, or plugin components." });
	    addTourOfPanelControls (e, steps);
	}
	e = document.querySelector(".resizerHelper");
	if (e && e.clientHeight > 0) steps.push ({ element: e, title: "Panel Resizer", intro: "Drag the resizer left or right (or up or down) to resize the panels adjacent to the resizer." });

	addTourOfSummaryNGCHM (document, steps);
	addTourOfDetailNGCHM (document, steps);
    }
    steps.push ({ title: "End of Tour", intro: "We have briefly highlighted and described the major features of the NG-CHM viewer.<P>Our <A href='https://www.youtube.com/channel/UCADGir2q8IaI9cGQuzjSL9w/playlists'>YouTube channel</A> has a <A href='https://www.youtube.com/playlist?list=PLIBaINv-Qmd05G3Kj7SbBbSAPZrG-H5bq'>playlist of short videos</A> describing and demonstrating key user interface elements." });
    introJs().setOptions({steps}).start();
}

function addTourOfSummaryNGCHM (doc, steps) {
    let e = doc.querySelector("#summary_chm");
    if (e && e.clientHeight > 0) steps.push ({ element: e, title: "Summary View", intro: "Displays a summary view of the entire map. Clicking and/or dragging on the summary view will move the primary detail panel to that position." });
}

function addTourOfDetailNGCHM (doc, steps) {
    let e = doc.querySelector("#detail_chm") || doc.querySelector (".detail_chm");
    if (e && e.clientHeight > 0) {
	steps.push ({ element: e, title: "Detail (Zoomed) View", intro: "Displays a detailed (or zoomed) view of part of the map. Clicking on the detail view will display information about the data point(s) at that position. You can also drag the detail view to pan the display." });
	let e2 = e.parentElement.querySelector('.client_icons');
	if (e2.clientHeight > 0) steps.push ({ element: e2, title: "Zoom Controls", intro: "These buttons control the zoom level and display mode for this detail view." });
    }
}

function addTourOfPanelControls (e, steps) {
    let e2 = e.querySelector (".paneScreenModeIcon");
    if (e2 && e2.clientHeight > 0) steps.push ({ element: e2, title: "Full Window Toggle", intro: "Click this button to expand the panel to fill the NG-CHM display. Click again to unmaximize." });
    e2 = e.querySelector (".paneTitle");
    if (e2 && e2.clientHeight > 0) steps.push ({ element: e2, title: "Panel Title", intro: "The panel's title." });
    e2 = [...e.querySelectorAll (".gearIcon")].filter(e => !e.classList.contains('hide'));
    if (e2 && e2[0] && e2[0].clientHeight > 0) steps.push ({ element: e2[0], title: "Plugin Gear Menu", intro: "This button opens a dialog window for controlling a panel plugin app." });
    e2 = e.querySelector(".paneMenuIcon") || document.querySelector(".paneMenuIcon");
    if (e2 && e2.clientHeight > 0) steps.push ({ element: e2, title: "Panel Menu", intro: "Use this menu to create or destroy panels or change their content. The menu includes an option for a short tour just of the pane contents." });
}

[...document.querySelectorAll('.tour-button')].forEach( function (btn) { btn.onclick = function() { showTour(); }});

})();
