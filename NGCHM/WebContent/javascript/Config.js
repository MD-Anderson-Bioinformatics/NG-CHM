// NgChm Config
NgChm.createNS('NgChm.CFG', {

    // Location at which NGCHM server can be contacted.
    // If non-empty, must end with a /.
    //
    api: document.body.dataset.hasOwnProperty('ngchmApi') ? document.body.dataset.ngchmApi : '',

    // Location of script for defining custom link outs etc.
    //
    custom_script: document.body.dataset.hasOwnProperty('ngchmCustomFile') ? document.body.dataset.ngchmCustomFile : 'javascript/custom/custom.js',
});
