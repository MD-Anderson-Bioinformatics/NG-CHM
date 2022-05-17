
const NgChm = {};

(function() {
    'use strict';

    const debug = false;
    const log = [];

    // Function: exportToNS
    // This function is called from other JS files to define their individual namespaces.
    // The contents of iContent, if present, will be added to the namespace (even if it already exists).
    // The namespace will be returned.
    NgChm['exportToNS'] = exportToNS;
    NgChm['createNS'] = exportToNS;
    NgChm['importNS'] = importNS;
    NgChm['getLog'] = getLog;
    
    var lastFile = 'n/a';

    function importNS (namespace) {
	return getNS (namespace, 'import');
    }

    function exportToNS (namespace, content) {
	const ns = getNS (namespace, 'export');
	// Add content if specified:
	if (content) {
	    Object.assign (ns, content);
	}
	return ns;
    }

    function getNS (namespace, op) {
	let nsparts = namespace.split(".");

	// we want to be able to include or exclude the root namespace so we strip
	// it if it's in the namespace
	if (nsparts[0] === "NgChm") {
	    nsparts = nsparts.slice(1);
	}

	// Determine javascript file name by creating an Error object
	// and extracting the file name from the stack trace.
	const err = new Error ("Defining namespace " + namespace);
	const trace = err.stack.split('\n');
	const nindex = trace[0].indexOf('NgChm.');
	const jindex = trace[3].indexOf('javascript/');
	const qindex = trace[3].indexOf('.js:');
	if (nindex > 0 && jindex >= 0 && qindex >= 0) {
	    lastFile = trace[3].substring(jindex+11, qindex+3);
	    log.push({ op, ns: trace[0].substr(nindex+6), src: lastFile });
	}
	if (debug) {
	    trace.splice(1,1);
	    console.log (trace.join(''));
	}

	let parent = NgChm;
	// loop through the parts and create a nested namespace if necessary
	for (let i = 0; i < nsparts.length; i++) {
	    const partname = nsparts[i];
	    // check if the current parent already has the namespace declared
	    // if it isn't, then create it
	    if (typeof parent[partname] === "undefined") {
		parent[partname] = {};
	    }
	    // get a reference to the deepest element in the hierarchy so far
	    parent = parent[partname];
	}
	// The element for the last namespace field is now constructed
	// with empty intermediate namespaces if needed and can be used.

	// We return the element for the last namespace field.
	return parent;
    }

    function getLog () {
	return log.slice(0);
    }


})();
