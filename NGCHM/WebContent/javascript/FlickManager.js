(function() {
    'use strict';
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
	setFlickState,
	toggleFlickState,
	setFlickHandler,
    };
    const FLICK = NgChm.createNS('NgChm.FLICK', exports);

    const flicksElement = document.getElementById("flicks");
    const flickBtn = document.getElementById("flick_btn");
    const flickViewsElement = document.getElementById("flickViews");
    const flickViewsOffElement = document.getElementById("noFlickViews");
    const flickDrop1 = document.getElementById("flick1");
    const flickDrop2 = document.getElementById("flick2");

    function enableFlicks (options, value1, value2) {
	flickDrop1.innerHTML = options;
	flickDrop2.innerHTML = options;
	flickDrop1.value = value1;
	flickDrop2.value = value2;
	flickViewsElement.style.display = '';
	flicksElement.style.display = '';
    }

    function disableFlicks() {
	flicksElement.style.display = 'none';
    }

    /************************************************************************************************
     * FUNCTION: flickIsOn - Returns true if the user has opened the flick control by checking to
     * see if the flickViews DIV is visible.
     ***********************************************************************************************/
    function flickIsOn () {
	return flickViewsElement.style.display === '';
    }

    function isFlickUp () {
	return flickBtn.dataset.state === 'flickUp';
    }

    /************************************************************************************************
     * FUNCTION: flickToggleOn - Opens the flick control.
     ***********************************************************************************************/
    function flickToggleOn () {
	//Make sure that dropdowns contain different
	//options (with the selected option in the top box)
	if (flickDrop1.selectedIndex === flickDrop2.selectedIndex) {
	    if (flickDrop1.selectedIndex === 0) {
		flickDrop2.selectedIndex = 1;
	    } else {
		flickDrop2.selectedIndex = 0;
	    }
	}
	setFlickColors();
	flickViewsOffElement.style.display="none";
	flickViewsElement.style.display='';
    }

    /************************************************************************************************
     * FUNCTION: flickToggleOff - Closes (hides) the flick control.
     ***********************************************************************************************/
    function flickToggleOff () {
	flickViewsElement.style.display="none";
	flickViewsOffElement.style.display='';
    }

    function setFlickColors () {
	if (flickBtn.dataset.state === 'flickUp') {
	    flickDrop1.style.backgroundColor="yellow";
	    flickDrop2.style.backgroundColor="white";
	} else {
	    flickDrop1.style.backgroundColor="white";
	    flickDrop2.style.backgroundColor="yellow";
	}
    }

    // Table of flick button images so that Widgetizer only adds one
    // data: URL for each to the widget.
    const toggleButtons = {
	flickUp: 'images/toggleUp.png',
	flickDown: 'images/toggleDown.png'
    };

    // Low-level utility to change the state of the flick button and
    // return the value associated with the new state.
    //
    // Used by UI Manager.flickChange().  You should call that function
    // if you want to changethe flick state.
    function toggleFlickState (fromList) {
	let newstate = null;

	if (typeof fromList === 'undefined' || fromList === null) {
	    newstate = flickBtn.dataset.state === 'flickUp' ? 'flickDown' : 'flickUp';
	} else {
	    if ((fromList === "flick1") && (flickBtn.dataset.state === 'flickUp')) {
		newstate = 'flickUp';
	    } else if ((fromList === "flick2") && (flickBtn.dataset.state === 'flickDown')) {
		newstate = 'flickDown';
	    } else if ((fromList === "toggle1") && (flickBtn.dataset.state === 'flickDown')) {
		newstate = 'flickUp';
	    } else if ((fromList === "toggle2") && (flickBtn.dataset.state === 'flickUp')) {
		newstate = 'flickDown';
	    } else {
		return null;
	    }
	}
	return setFlickState (newstate);
    }

    // Set the flickState to state, update the flickColors, return the value
    // associated with the state (or "dl1" if no associated value).
    function setFlickState (state) {
	if (state !== 'flickUp' && state !== 'flickDown') {
	    console.error ('Invalid attempt to set flick state to ' + state);
	    return "dl1";
	}
	if (flickBtn.dataset.state !== state) {
	    flickBtn.dataset.state = state;
	    flickBtn.setAttribute('src', toggleButtons[state]);
	    setFlickColors();
	}
	return (state === 'flickUp' ? flickDrop1.value : flickDrop2.value) || "dl1";
    }

    function setFlickHandler (flickHandler) {
	document.getElementById('flick_btn').onclick = function (event) {
	    flickHandler();
	};
	document.getElementById('flick1').onchange = function (event) {
	    flickHandler('flick1');
	};
	document.getElementById('flick2').onchange = function (event) {
	    flickHandler('flick2');
	};
    }

    document.getElementById('flickOff').onclick = () => {
	flickToggleOn();
    };

    document.getElementById('flickOn_pic').onclick = function (event) {
	flickToggleOff();
    };

    setFlickColors();
})();
