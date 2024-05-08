// The text to display in the tour dialog box is determined by data-title
// and data-intro attributes added to the elements in the tour.
//
// The selection and order of elements to include in the tour is determined
// programmatically and is a combination of both fixed elements and dynamic
// elements based on the current display.
//
(function () {
  "use strict";
  NgChm.markFile();

  const TOUR = NgChm.createNS("NgChm.TOUR", { showTour });
  const DVW = NgChm.importNS("NgChm.DVW");

  function showTour(loc) {
    if (!introJs) return; // User clicked before introJs has loaded.

    if (loc) {
      const steps = [...loc.pane.querySelectorAll("*[data-intro]")]
        .filter(isVisible)
        .map((e) => {
          const step = { element: e, intro: e.dataset.intro };
          if (e.dataset.title) step.title = e.dataset.title;
          return step;
        });
      let title = "Brief Panel Tour";
      if (loc.pane.dataset.title) title = title + ": " + loc.pane.dataset.title;
      let intro =
        "<P>We'll briefly highlight and describe the major features of this NG-CHM panel.</P>";
      if (loc.pane.dataset.intro) intro = intro + loc.pane.dataset.intro;
      steps.unshift({ element: loc.pane, title, intro });
      addTourOfPanelControls(loc.pane, steps);
      steps.push({
        title: "End of Panel Tour",
        intro: "This completes the tour of this panel.",
      });
      introJs().setOptions({ steps }).start();
      return;
    }

    const querySelectors = [
      "#introButton",
      "#introAboutButton",
      "#splash",
      "#closeSplash",
      "#aboutButton",
      "#fileButton",
      "#barMenu_btn",
      "#colorMenu_btn",
      "#layer_control",
      "#mapName",
      "#search_on",
      "#search_text",
      "#search_cov_cont",
      "#search_target",
      "#go_btn",
      "#prev_btn",
      "#next_btn",
      "#cancel_btn",
    ];
    const tourElements = querySelectors
      .map((qs) => document.querySelector(qs))
      .filter(isVisible);
    const steps = tourElements.map((e) => {
      const step = {
        element: e,
        intro: e.dataset.intro || "Missing data-intro",
      };
      if (e.dataset.title) step.title = e.dataset.title;
      return step;
    });
    const infoDetails =
      "<P>Also, our <A href='https://www.youtube.com/channel/UCADGir2q8IaI9cGQuzjSL9w/playlists' target='_blank'>YouTube channel</A> has a <A href='https://www.youtube.com/playlist?list=PLIBaINv-Qmd05G3Kj7SbBbSAPZrG-H5bq' target='_blank'>playlist of short videos</A> describing and demonstrating key user interface elements.</P>";
    steps.unshift({
      title: "Brief Interface Tour",
      intro:
        "We'll briefly highlight and describe the major features of the NG-CHM viewer that you can currently see." +
        infoDetails,
    });
    if (true) {
      // Add help items for dynamicly inserted panels.
      let e = document.querySelector(".pane");
      if (e && e.clientHeight > 0) {
        steps.push({
          element: e,
          title: "Panel",
          intro:
            "<P>Content panels display NG-CHM visualizations, such as summary views, detail views, or plugin components.</P><P>A panel-specific tour may be available from the panel menu button on the right of the panel header.</P>",
        });
        addTourOfPanelControls(e, steps);
      }
      e = document.querySelector(".resizerHelper");
      if (e && e.clientHeight > 0)
        steps.push({
          element: e,
          title: "Panel Resizer",
          intro:
            "Drag the resizer left or right (or up or down) to resize the panels adjacent to the resizer.",
        });

      addTourOfSummaryNGCHM(document, steps);
      addTourOfDetailNGCHM(document, steps);
    }
    steps.push({
      title: "End of Tour",
      intro:
        "We have briefly highlighted and described the major features of the NG-CHM viewer." +
        infoDetails,
    });
    introJs().setOptions({ steps }).start();
  }

  function isVisible(el) {
    if (!el) return false;
    if (el.clientHeight == 0) return false;
    if (el.id == "closeSplash")
      return isVisible(document.getElementById("splash"));
    const cs = window.getComputedStyle(el);
    if (cs.visibility != "visible") return false;
    if (cs.opacity == 0) return false;
    return true;
  }

  function addTourOfSummaryNGCHM(doc, steps) {
    let e = doc.querySelector("#summary_chm");
    if (e && e.clientHeight > 0)
      steps.push({
        element: e,
        title: "Summary View",
        intro:
          "Displays a summary view of the entire map. Clicking and/or dragging on the summary view will move the primary detail panel to that position.",
      });
  }

  function addTourOfDetailNGCHM(doc, steps) {
    if (!DVW.primaryMap) return;
    const chm = DVW.primaryMap.chm;
    if (chm && chm.clientHeight > 0) {
      steps.push({
        element: chm,
        title: "Detail (Zoomed) View",
        intro:
          "Displays a detailed (or zoomed) view of part of the map. Clicking on the detail view will display information about the data point(s) at that position. You can also drag the detail view to pan the display.",
      });
      const clientButtons = chm.parentElement.querySelectorAll("[data-intro]");
      [...clientButtons].filter(isVisible).forEach((element) => {
        if (element.clientHeight > 0) {
          const step = { element, intro: element.dataset.intro };
          if (element.dataset.title) step.title = element.dataset.title;
          steps.push(step);
        }
      });
    }
  }

  function addTourOfPanelControls(e, steps) {
    let e2 = e.querySelector(".paneScreenMode");
    if (e2 && e2.clientHeight > 0)
      steps.push({
        element: e2,
        title: "Full Window Toggle",
        intro:
          "Click this button to expand the panel to fill the NG-CHM display. Click again to unmaximize.",
      });
    e2 = e.querySelector(".paneTitle");
    if (e2 && e2.clientHeight > 0)
      steps.push({
        element: e2,
        title: "Panel Title",
        intro: "The panel's title.",
      });
    e2 = [...e.querySelectorAll(".gearIcon")].filter(
      (e) => !e.classList.contains("hide"),
    );
    if (e2 && e2[0] && e2[0].clientHeight > 0)
      steps.push({
        element: e2[0],
        title: "Plugin Gear Menu",
        intro:
          "This button opens a dialog window for controlling a panel plugin app.",
      });
    e2 =
      e.querySelector(".paneMenuIcon") ||
      document.querySelector(".paneMenuIcon");
    if (e2 && e2.clientHeight > 0)
      steps.push({
        element: e2,
        title: "Panel Menu",
        intro:
          "Use this menu to create or destroy panels or change their content. The menu includes an option for a short tour just of the pane contents.",
      });
  }

  [...document.querySelectorAll(".tour-button")].forEach(function (btn) {
    btn.onclick = function () {
      showTour();
    };
  });
})();
