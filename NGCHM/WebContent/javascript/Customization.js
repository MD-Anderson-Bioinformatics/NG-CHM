// This module defines facilities for customizing an NG-CHM via 'plugins'.
// It builds on the linkouts machinery defined in Linkouts.js using the
// linkouts interface.

//Define Namespace for NgChm Customization
NgChm.createNS('NgChm.CUST');

NgChm.CUST.verbose = false;

// Interfaces added at the end.
(function() {

    function separator (sep) {
        if (sep === "space") return " ";
        if (sep === "colon") return ":";
        if (sep === "comma") return ",";
        if (sep === "semicolon") return ";";
        if (sep === "slash") return "/";
        if (sep === "tilde") return "~";
        if (sep === "exclamation") return "!";
        if (sep === "hash") return "#";
        if (sep === "amp") return "&";
        if (sep === "plus") return "+";
        if (sep === "minus" || sep === "dash") return "-";
        if (sep === "underscore") return "_";
        if (sep === "equals") return "=";
        if (sep === "period") return ".";
	if (sep.length === 1) return sep;
        if (NgChm.CUST.verbose) console.log('NgChm.CUST: Unknown type separator: ' + sep );
        return sep;
    }

    // A label type may include one or more transforms appended to a primitive type name.
    // Values of the specified type will be transformed as specified before being passed
    // to linkouts defined for the primitive type.  If multiple transforms are specified,
    // they will be applied left-to-right.
    //
    // This function parses the transform specifications on a label type, if any, and
    // appends a vector of transforms to apply to NgChm.CUST.transforms.
    //
    // The following transforms are accepted:
    // :list.separator, where separator is space, colon, comma, semicolon, slash, tilde,
    //                  exclamation, hash, amp, plus, minus (dash), underscore, equals, period,
    //                  or any single character.
    // :replace/pat/with/options, where pat, with, and options match those of javascript
    //                            string pattern replacement.
    function addTransform (typename) {
        if (NgChm.CUST.verbose) console.log( 'NgChm.CUST: adding transforms for ' + typename );
        var ff = typename.split(":");
        if (ff.length > 1) {
		    var xforms = [];
		    for (var fidx = 1; fidx < ff.length; fidx++) {
		        if (ff[fidx].indexOf("list.") === 0) {
		        	xforms.push({ xform: 'list', separator: separator( ff[fidx].substr(5)) });
		        } else if (ff[fidx].indexOf("replace/") === 0) {
		        	var m = /replace\/(.*)\/(.*)\/(.*)/.exec(ff[fidx]);
		        	if (m && m.length===4) {
			        xforms.push({ xform: 'replace', pattern: m[1], replacement: m[2], options: m[3] });
		        	} else {
		        		if (NgChm.CUST.verbose) console.log( 'Error: badly formed type modifier ' + ff[idx] );
		        	}
		        } else {
		        	if (NgChm.CUST.verbose) console.log( 'Error: unknown type modifier ' + ff[idx] );
		        }
		    }
            NgChm.CUST.transforms.push({ baseType: ff[0], typeName: typename, doTypeTransform: doTypeTransform, xforms: xforms.reverse() });
        }
    }

    function doTypeTransform (transform, menuEntry, linkoutType, selectMode, linkoutFn, attributes) {
        var supertypes = NgChm.CUST.superTypes[transform.baseType] || [];
        if (linkoutType === transform.baseType || supertypes.indexOf(linkoutType)>=0) {
            if (NgChm.CUST.verbose) console.log( 'Adding typetransform linkout "' + menuEntry + '" for type ' + transform.typeName + ' mode ' + selectMode );
	    linkouts.addLinkout( menuEntry, transform.typeName, selectMode, function(labels) {
                var xforms = transform.xforms;
		for (var xidx = 0; xidx < xforms.length; xidx++ ) {
		    if (xforms[xidx].xform === 'list') {
			if( selectMode === linkouts.SINGLE_SELECT) {
			    labels = labels[0].split(xforms[xidx].separator);
			} else {
			    labels = Array.from(new Set([].concat.apply([],labels.map(function (x) { return x.split(xforms[xidx].separator) }))));
			}
		    } else if (xforms[xidx].xform === 'replace') {
			var re = new RegExp(xform[xidx].pattern, xform[xidx].options);
		        labels = labels.map(function(x) { return x.replace(re,xform[xidx].replacement) });
		    }
		}
		linkoutFn(labels);
	    }, attributes);
	}
    }

    function initLabelTypes (typeList) {
        NgChm.CUST.superTypes = {};
        NgChm.CUST.subTypes = {};

        NgChm.CUST.allTypes = Array.from(new Set(typeList));  // make list of unique types
        NgChm.CUST.transforms = [];
        NgChm.CUST.allTypes.forEach (addTransform);
    };


    // Add type descriptions.  typelist is a vector of type descriptors.  Each type descriptor
    // is an object with the following fields:
    // - typeName: name of the type being described (mandatory)
    // - description: high-level description of the meaning of type values (mandatory)
    // - displayName: user friendly type name (optional)
    // - format: description of the lexical/syntactic rules of valid type values (optional)
    // - examples: one or more examples of type values (optional).
    // - the typelist is stored on NgChm.CUST.linkoutTypes for use in the NG-CHM viewer
    // - and builder
    function describeTypes (typelist) {
    	for (var i=0;i<typelist.length;i++) {
    		var typeItem = typelist[i];
    		NgChm.CUST.linkoutTypes.push(typeItem);
    	}
    };

    // Add subtype relation.
    // We maintain two maps:
    // 1. a map from each type to all of its subtypes, and
    // 2. a map from each type to all of its supertypes.
    function addSubtype (subtype, supertype) {
	var supTypes = [supertype].concat(NgChm.CUST.superTypes[supertype] || []).sort();
	var subTypes = [subtype].concat(NgChm.CUST.subTypes[subtype] || []).sort();
        // Check for attempt to define a circular relationship.
        // supertype (plus its supertypes) cannot intersect subtype (plus its subtypes).
        var pidx = 0;
        var bidx = 0;
        while (bidx < subTypes.length && pidx < supTypes.length) {
            if (subTypes[bidx] < supTypes[pidx]) { bidx++; }
            else if (subTypes[bidx] > supTypes[pidx]) { pidx++; }
            else {
                // Found a type in common.
                console.log('Adding ' + subtype + ' as a subtype of ' + supertype + ' would create a cycle. Ignored.');
                if (subTypes[bidx] !== subtype) {
                    if (subTypes[bidx] === supertype) {
                        console.log ('Type ' + supertype + ' is a subtype of ' + subtype);
                    } else {
                        console.log ('Type ' + subTypes[bidx] + ' is a subtype of ' + subtype + ' as well as a supertype of ' + supertype);
                    }
                } else {
                    if (subtype === supertype) {
                        console.log ('Type ' + subtype + ' was given as both subtype and supertype');
                    } else {
                        console.log ('Type ' + subtype + ' is a supertype of ' + supertype);
                    }
                }
                return;
            }
        }

        // Add relations from all subTypes to all supTypes.
        // We do not expect large subtype/supertype trees.
        for (pidx = 0; pidx < supTypes.length; pidx++) {
            supertype = supTypes[pidx];
	    if (!NgChm.CUST.subTypes.hasOwnProperty(supertype)) NgChm.CUST.subTypes[supertype] = [];
            for (bidx = 0; bidx < subTypes.length; bidx++) {
                subtype = subTypes[bidx];
	        if (!NgChm.CUST.superTypes.hasOwnProperty(subtype)) NgChm.CUST.superTypes[subtype] = [];
	        if (NgChm.CUST.subTypes[supertype].indexOf(subtype) < 0) {
	            NgChm.CUST.subTypes[supertype].push(subtype);
                }
	        if (NgChm.CUST.superTypes[subtype].indexOf(supertype) < 0) {
	            NgChm.CUST.superTypes[subtype].push(supertype);
                }
            }
        }
    };

    function createPluginLinkout (menuEntry, typeName, selectMode, linkoutFn, attributes) {

	if (NgChm.CUST.verbose) console.log ('NgChm.CUST.createPluginLinkout "' + menuEntry + '" typeName: ' + typeName + ' selectMode: ' + selectMode );

	// Wrap linkout in a check function.
	if (selectMode === linkouts.SINGLE_SELECT) {
	    linkoutFn = (function(lofn) {
		return function(labels) {
		    if (labels.length===0 || labels[0]==="-") {
			alert("No information known for the selected label");
		    } else {
			lofn(labels);
		    }
		};
	    })(linkoutFn);
	} else if (selectMode === linkouts.MULTI_SELECT) {
	    linkoutFn = (function(lofn) {
		return function(labels) {
		    var idx = labels.indexOf("-");
		    if (idx >= 0) labels.splice(idx,1);
		    if (labels.length===0) {
			alert("No information known for any selected label");
		    } else {
			lofn(labels);
		    }
		};
	    })(linkoutFn);
	} else {
	    alert('Unknown selectMode: ' + selectMode);
	}

	if (NgChm.CUST.allTypes.indexOf( typeName ) >= 0) {
	    if (NgChm.CUST.verbose) console.log( 'Adding type linkout for "' + menuEntry + '" typeName: ' + typeName + ' selectMode: ' + selectMode );
	    linkouts.addLinkout( menuEntry, typeName, selectMode, linkoutFn, attributes );
	}
	NgChm.CUST.transforms.forEach(function (tt) {
	    tt.doTypeTransform( tt, menuEntry, typeName, selectMode, linkoutFn, attributes );
	});
	var subtypes = NgChm.CUST.subTypes[typeName] || [];
	subtypes.forEach(function(subtype) {
	    if (NgChm.CUST.allTypes.indexOf( subtype ) >= 0) {
		if (NgChm.CUST.verbose) console.log( 'Adding subtype linkout for "' + menuEntry + '" typeName: ' + subtype + ' selectMode: ' + selectMode );
		linkouts.addLinkout( menuEntry, subtype, selectMode, linkoutFn, attributes );
	    }
	});
    };

    // Executed before custom.js is loaded.
    NgChm.CUST.beforeLoadCustom = function (heatMap) {
		var colTypes = heatMap.getColLabels().label_type;
		var rowTypes = heatMap.getRowLabels().label_type;
		if (NgChm.CUST.verbose) {
		    console.log( 'Column types:' );
		    colTypes.forEach( function (ty) { console.log( ty ); } );
		    console.log( 'Row types:' );
		    rowTypes.forEach( function (ty) { console.log( ty ); } );
		}
	
	        NgChm.CUST.customPlugins = [];
	        NgChm.CUST.linkoutTypes = [];
		initLabelTypes ([].concat(colTypes,rowTypes));
    };

    // Executed after custom.js has been loaded.
    NgChm.CUST.definePluginLinkouts = function() {
	for (var pidx = 0; pidx < NgChm.CUST.customPlugins.length; pidx++) {
	    var plugin = NgChm.CUST.customPlugins[pidx];
	    if (plugin.expandLinkOuts) plugin.expandLinkOuts( );
	}

	for (var pidx = 0; pidx < NgChm.CUST.customPlugins.length; pidx++) {
	    var plugin = NgChm.CUST.customPlugins[pidx];
	    if (plugin.linkouts) {
		if (NgChm.CUST.verbose) console.log( 'Defining custom linkouts for plugin ' + plugin.name );
		for (var idx = 0; idx < plugin.linkouts.length; idx++) {
		    var l = plugin.linkouts[idx];
		    createPluginLinkout( l.menuEntry, l.typeName, l.selectMode, l.linkoutFn, l.attributes||[] );
		}
	    }
	    if (plugin.matrixLinkouts) {
		if (NgChm.CUST.verbose) console.log( 'Defining custom matrix linkouts for plugin ' + plugin.name );
		for (var idx = 0; idx < plugin.matrixLinkouts.length; idx++) {
		    var l = plugin.matrixLinkouts[idx];
		    linkouts.addMatrixLinkout( l.menuEntry, l.typeName1, l.typeName2, l.selectMode, l.linkoutFn, l.attributes||[] );
		}
	    }
	}
    };

    // Interface accessible to other modules.
    // Load the user's custom.js file.
    NgChm.CUST.addCustomJS = function() {
	if (NgChm.heatMap.isInitialized()){
		NgChm.CUST.beforeLoadCustom(NgChm.heatMap);
	    var head = document.getElementsByTagName('head')[0];
	    var script = document.createElement('script');
	    head.appendChild(script);
	    script.type = 'text/javascript';
	    script.src = 'javascript/custom/custom.js';
        // Most browsers:   NOTE: The next 2 lines of code are replaced when building ngchmApp.html and ngchmWidget-min.js (the "file mode" and "widget" versions of the application)
        script.onload = NgChm.CUST.definePluginLinkouts;
        // Internet explorer:
        script.onreadystatechange = function() { if (this.readyState == 'complete') {     	NgChm.CUST.definePluginLinkouts();   }   };  //Leave this as one line for filemode version app builder
	} else {
	    setTimeout(function(){ NgChm.CUST.addCustomJS();}, 100);
	}
    };

    // Published interface.
    // Define a subtype: any linkouts defined for the supertype will also be defined
    // for the subtype.  No transformation will be applied to the labels.  For
    // instance: addSubtype('bio.gene.hugo', 'bio.pubmed'): linkouts defined for bio.pubmed
    // will also be defined for bio.gene.hugo.
    linkouts.addSubtype = function (subtype, supertype) {
        addSubtype (subtype, supertype);
    };

    // Published interface.
    // Add the specified plugin.
    linkouts.addPlugin = function ( plugin ) {
        if (NgChm.CUST.verbose) console.log( 'NgChm.CUST: adding plugin ' + plugin.name );
        NgChm.CUST.customPlugins.push( plugin );
    };

    // Published interface.
    // Describe plugin types.
    linkouts.describeTypes = function (typelist) {
        describeTypes (typelist);
    };
})();

