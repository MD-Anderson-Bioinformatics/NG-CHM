(function () {
  "use strict";
  NgChm.markFile();

  /*==============================================================================================
   *
   * FLICK VIEW PROCESSING FUNCTIONS
   *
   *=============================================================================================*/

  // Define Namespace for NgChm FlickManager
  const exports = {
    enableFlicks,
    disableFlicks,
    flickIsOn,
    isFlickUp,
    getFlickState,
    setFlickState,
    toggleFlickState,
    setFlickHandler,
    getFlickSaveState,
  };
  const FLICK = NgChm.createNS("NgChm.FLICK", exports);

  const flicksElement = document.getElementById("layer_control");
  const layersOpenClose = document.getElementById("layers_open_close");
  const flickBtn = document.getElementById("flick_btn");
  const flickViewsElement = document.getElementById("flickViews");
  const flickDrop1 = document.getElementById("flick1");
  const flickDrop2 = document.getElementById("flick2");

  function enableFlicks(layers, options, savedState) {
    flickDrop1.innerHTML = options;
    flickDrop2.innerHTML = options;

    const flickStateOK =
      savedState.flick_btn_state == "flickUp" ||
      savedState.flick_btn_state == "flickDown";
    flickViewsElement.dataset.state = flickStateOK
      ? savedState.flick_btn_state
      : "flickUp";
    flickDrop1.value = layers.includes(savedState.flick1)
      ? savedState.flick1
      : layers[0];
    if (layers.includes(savedState.flick2)) {
      flickDrop2.value = savedState.flick2;
    } else {
      // Make flick2 default different from flick1 value if possible.
      flickDrop2.value =
        layers.length < 2 || layers[1] == flickDrop1.value
          ? layers[0]
          : layers[1];
    }
    flicksElement.style.display = "";
    return isFlickUp() ? flickDrop1.value : flickDrop2.value;
  }

  function disableFlicks() {
    flicksElement.style.display = "none";
  }

  function getFlickSaveState() {
    const savedState = {
      flick_btn_state: flickViewsElement.dataset.state,
      flick1: flickDrop1.value,
      flick2: flickDrop2.value,
    };
    return savedState;
  }

  /************************************************************************************************
   * FUNCTION: flickIsOn - Returns true if the user has opened the flick control by checking to
   * see if the flickViews DIV is visible.
   ***********************************************************************************************/
  function flickIsOn() {
    return flicksElement.style.display === "";
  }

  function isFlickUp() {
    return flickViewsElement.dataset.state === "flickUp";
  }

  /************************************************************************************************
   * FUNCTION: flickToggleOn - Opens the flick control.
   ***********************************************************************************************/
  function flickToggleOn() {
    //Make sure that dropdowns contain different
    //options (with the selected option in the top box)
    if (flickDrop1.selectedIndex === flickDrop2.selectedIndex) {
      if (flickDrop1.selectedIndex === 0) {
        flickDrop2.selectedIndex = 1;
      } else {
        flickDrop2.selectedIndex = 0;
      }
    }
    flickViewsElement.style.display = "";
    layersOpenClose.dataset.state = "open";
  }

  /************************************************************************************************
   * FUNCTION: flickToggleOff - Closes (hides) the flick control.
   ***********************************************************************************************/
  function flickToggleOff() {
    flickViewsElement.style.display = "none";
    layersOpenClose.dataset.state = "closed";
  }

  function flickToggleOnOff() {
    if (layersOpenClose.dataset.state == "closed") {
      flickToggleOn();
    } else {
      flickToggleOff();
    }
  }

  // Low-level utility to change the state of the flick button and
  // return the value associated with the new state.
  //
  // Used by UI Manager.flickChange().  You should call that function
  // if you want to changethe flick state.
  function toggleFlickState(flickElement) {
    let togglePosition = flickViewsElement.dataset.state;
    let layer =
      (togglePosition === "flickUp" ? flickDrop1.value : flickDrop2.value) ||
      "dl1";
    let redrawRequired = false;

    if (flickElement === "toggle") {
      // Toggle is a pseudo-element.
      // Toggle the flick element.
      flickElement = togglePosition === "flickUp" ? "flick2" : "flick1"; // Switch active flick element.
      const newLayer = setFlickState(flickElement);
      // Redraw if new layer is different.
      if (layer !== newLayer) {
        layer = newLayer;
        redrawRequired = true;
      }
    } else {
      if (flickElement === "flick1" && togglePosition === "flickUp") {
        // Active flick1 changed.
        redrawRequired = true;
      } else if (flickElement === "flick2" && togglePosition === "flickDown") {
        // Active flick2 changed.
        redrawRequired = true;
      } else {
        // Inactive flick element possibly changed.
        // No redraw required.
        layer =
          (flickElement === "flick1" ? flickDrop1.value : flickDrop2.value) ||
          "dl1";
      }
    }
    return { flickElement, layer, redrawRequired };
  }

  // Set the flickState to the position of flickElement, update the flickColors, return the value
  // associated with the flickElement (or "dl1" if no associated value).
  function setFlickState(flickElement) {
    flickViewsElement.dataset.state =
      flickElement === "flick1" ? "flickUp" : "flickDown";
    return (
      (flickElement === "flick1" ? flickDrop1.value : flickDrop2.value) || "dl1"
    );
  }

  function getFlickState() {
    const f1 = { element: "flick1", layer: flickDrop1.value || "dl1" };
    if (flicksElement.style.display == "none") {
      return [f1];
    } else {
      const f2 = { element: "flick2", layer: flickDrop2.value };
      return flickViewsElement.dataset.state === "flickUp"
        ? [f1, f2]
        : [f2, f1];
    }
  }

  function setFlickHandler(flickHandler) {
    document.getElementById("flick_btn").onclick = function (event) {
      flickHandler(toggleFlickState("toggle"));
    };
    document.getElementById("flick1").onchange = function (event) {
      flickHandler(toggleFlickState("flick1"));
    };
    document.getElementById("flick2").onchange = function (event) {
      flickHandler(toggleFlickState("flick2"));
    };
  }

  layersOpenClose.onclick = function (event) {
    flickToggleOnOff();
  };
})();
