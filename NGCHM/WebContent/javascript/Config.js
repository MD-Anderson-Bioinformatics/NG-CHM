(function() {
    'use strict';
    NgChm.markFile();

    NgChm.createNS('NgChm.CFG', {
	// NgChm Config

	// Location at which NGCHM server can be contacted.
	// If non-empty, must end with a /.
	//
	api: document.body.dataset.hasOwnProperty('ngchmApi') ? document.body.dataset.ngchmApi : '',

	// Is the location of custom.js specified explicitly?
	//
	custom_specified: document.body.dataset.hasOwnProperty('ngchmCustomFile'),

	// Location of script for defining custom link outs etc.
	//
	custom_script: document.body.dataset.hasOwnProperty('ngchmCustomFile') ? document.body.dataset.ngchmCustomFile : 'javascript/custom/custom.js',
    });

})();
