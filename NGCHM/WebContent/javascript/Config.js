
// Define/use Namespace for NgChm Application
var NgChm = NgChm || { };
NgChm.CFG = NgChm.CFG || {};

// Location at which NGCHM server can be contacted.
// Must end with a /.
NgChm.CFG.api = document.body.dataset.hasOwnProperty('ngchmApi') ? document.body.dataset.ngchmApi : '';

// Location of script for defining custom link outs etc.
NgChm.CFG.custom_script = document.body.dataset.hasOwnProperty('ngchmCustomFile') ? document.body.dataset.ngchmCustomFile : 'javascript/custom/custom.js';
