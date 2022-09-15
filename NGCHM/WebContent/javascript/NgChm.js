
const NgChm = {};

(function() {
    'use strict';

    const debug = false;
    const log = [];
    const definedNamespaces = [];

    // Function: exportToNS
    // This function is called from other JS files to define their individual namespaces.
    // The contents of iContent, if present, will be added to the namespace (even if it already exists).
    // The namespace will be returned.
    NgChm['exportToNS'] = exportToNS;
    NgChm['createNS'] = exportToNS;
    NgChm['importNS'] = importNS;
    NgChm['markFile'] = () => {};  // No-op in compiled code. Dev mode version defined below.
    
    var lastFile = 'n/a';
    var importsBeforeDefinition = 0;

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

	// BEGIN EXCLUDE from production code.
	//
	// Determine javascript file name by creating an Error object
	// and extracting the file name from the stack trace.
	const err = new Error ("Defining namespace " + namespace);
	const trace = err.stack.split('\n');
	const nindex = err.message.indexOf('NgChm.');
	let traceIdx = 2;
	if (trace[0].includes(err.message)) {
	    // True on Chrome, false on Firefox.
	    traceIdx++;
	}
	const jindex = trace[traceIdx].indexOf('javascript/');
	const qindex = trace[traceIdx].indexOf('.js:');
	if (nindex > 0 && jindex >= 0 && qindex >= 0) {
	    lastFile = trace[traceIdx].substring(jindex+11, qindex+3);
	    log.push({ op, ns: err.message.substr(nindex+6), src: lastFile });
	}
	if (debug) {
	    trace.splice(1,1);
	    console.log (trace.join(''));
	}
	if (op === 'export') {
	    if (definedNamespaces.indexOf(namespace) < 0) {
		definedNamespaces.push(namespace);
	    }
	}
	if (op == 'import') {
	    if (definedNamespaces.indexOf(namespace) < 0) {
		importsBeforeDefinition++;
		console.log ('Namespace imported before definition #' + importsBeforeDefinition + ': ' + namespace + ' in ' + lastFile);
	    }
	}
	// END EXCLUDE

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

    // BEGIN EXCLUDE from production code.
    //
    // The code from this comment block until the matching end block is removed
    // by the compiler.
    NgChm['getLog'] = getLog;
    function getLog () {
	return log.slice(0);
    }

    var scriptLoaded = false;

    function dynload (srcs, next) {
	if (srcs.length == 0) {
	    next();
	    console.log ("next executed");
	} else {
	    const script = document.createElement('SCRIPT');
	    script.type = 'text/javascript';
	    script.src = srcs.shift();
	    script.onload = () => { console.log ("Loaded " + script.src); dynload (srcs, next); };
	    script.onerror = () => { console.error ("Error loading " + script.src); };
	    document.head.appendChild (script);
	}
    }

    var canvas;
    const fileColorTable = {};
    const markedFileColor = '#eeffee';  // Use slight green color for marked files.
    const unmarkedFileColor = '#fff7f7';// Use slight pink color for unmarked files.
    const moduleColor = '#eeeeff';      // Use slight blue color for modules.

    // Mark the current file.  Marked files are displayed in a distinct color.
    NgChm['markFile'] = markFile;
    function markFile () {
	const err = new Error ("Source file done");
	const trace = err.stack.split('\n');
	let traceIdx = 1;
	if (trace[0].includes(err.message)) {
	    // True on Chrome, false on Firefox.
	    traceIdx++;
	}
	const jindex = trace[traceIdx].indexOf('javascript/');
	const qindex = trace[traceIdx].indexOf('.js:');
	if (jindex >= 0 && qindex >= 0) {
	    lastFile = trace[traceIdx].substring(jindex+11, qindex+3);
	    fileColorTable[lastFile] = markedFileColor;
	}
    }

    NgChm['dracula'] = dracula;
    function dracula () {
	if (scriptLoaded) {
	    drawGraph();
	} else {
	    dynload (['javascript/lib/raphael.js', 'javascript/lib/dracula.min.js'], () => {
		drawGraph();
	    });
	}

	function drawGraph(script) {
	    if (scriptLoaded) {
		canvas.replaceChildren();
	    } else {
		canvas = document.createElement('CANVAS');
		const content = document.getElementById('content');
		canvas.id = 'dracula';
		canvas.style.display = 'block';
		canvas.style.position = 'relative';
		canvas.style.width = content.innerWidth;
		canvas.style.height = content.innerHeight;
		canvas.width = 1000;
		canvas.height = 1000;
		[...content.children].forEach(ch => {
		    if (ch != canvas) {
			ch.style.display = 'none';
		    }
		});
		content.appendChild (canvas);
		canvas.addEventListener ('mousedown', mouseDown, { passive: true });
		canvas.addEventListener ('mousemove', mouseDrag, { passive: true });
		canvas.addEventListener ('mouseup', mouseUp, { passive: true });
		canvas.addEventListener ('mouseout', mouseUp, { passive: true });
		scriptLoaded = true;
	    }

	    const g = new Dracula.Graph();
	    log.forEach (entry => {
		if (entry.op == 'export') {
		    g.addEdge (entry.src, entry.ns, { directed: true, color: '#aaaaff' });
		} else {
		    g.addEdge (entry.ns, entry.src, { directed: true, color: '#ffaaaa' });
		}
	    });

	    const layout = new Dracula.Layout.Spring(g);
	    const ctx = canvas.getContext('2d');
	    const maxw = Object.entries(layout.graph.nodes)
		.map(([key,node]) => Math.ceil(ctx.measureText(key).width + 4))
		.reduce((t,v) => Math.max(t,v));
	    const tt = {};

	    var count = 0;
	    requestAnimationFrame (animate);

	    var dragging = false;
	    var enabled = true;
	    var dragNode;

	    dracula.start = function() {
		setEnabled (true);
		requestAnimationFrame (animate);
	    }

	    dracula.stop = function() {
		setEnabled (false);
	    }

	    function setEnabled (value) {
		enabled = value;
	    }

	    function mouseDown (ev) {
		const m = Object.entries(layout.graph.nodes).filter(([key,node]) => {
		    const w = Math.ceil(ctx.measureText(key).width + 4) / tt.xs;
		    const h = 30 / tt.ys;
		    const bb = canvas.getBoundingClientRect();
		    const x = xit(ev.clientX - bb.x);
		    const y = yit(ev.clientY - bb.y);

		    const hitX = (x >= node.layoutPosX) && (x <= node.layoutPosX+w);
		    const hitY = (y >= node.layoutPosY) && (y <= node.layoutPosY+h);
		    return hitX && hitY;
		});
		if (m.length > 0) {
		    dragNode = m[0][1];
		    dragging = true;
		}
	    }

	    function mouseDrag (ev) {
		if (dragging) {
		    dragNode.layoutPosX += ev.movementX / tt.xs;
		    dragNode.layoutPosY += ev.movementY / tt.ys;
		    if (!enabled) requestAnimationFrame (animate);
		}
	    }

	    function mouseUp (ev) {
		dragging = false;
	    }


	    function nodeColor (id) {
		if (id.includes('.js')) {
		    const color = fileColorTable[id];
		    return color || unmarkedFileColor;
		} else {
		    return  moduleColor;
		}
	    }

	    function animate () {
		layout.layoutIteration();
		layout.layoutCalcBounds();
		ctx.clearRect (0, 0, 1000, 1000);
		ctx.lineWidth = 1;
		tt.xp = -layout.graph.layoutMinX;
		tt.xs = (1000-maxw-10)/(layout.graph.layoutMaxX + tt.xp);
		tt.yp = -layout.graph.layoutMinY;
		tt.ys = (1000-40)/(layout.graph.layoutMaxY + tt.yp);
		Object.entries(layout.graph.nodes).forEach(([key,node]) => {
		    const w = Math.ceil(ctx.measureText(key).width + 4);
		    const x = xt(node.layoutPosX);
		    const y = yt(node.layoutPosY);
		    ctx.fillStyle = nodeColor (node.id);
		    ctx.fillRect (x, y, w, 30);
		    ctx.strokeStyle = '#000000';
		    ctx.strokeRect (x, y, w, 30);
		    ctx.fillStyle = "#000000";
		    ctx.fillText (key, x+2, y+20);
		});
		ctx.lineWidth = 3;
		Object.entries(layout.graph.edges).forEach(([key,edge]) => {
		    ctx.beginPath();
		    ctx.strokeStyle = edge.style.color;
		    let sx = xt(edge.source.layoutPosX);
		    let sy = yt(edge.source.layoutPosY);
		    const sw = Math.ceil(ctx.measureText(edge.source.id).width + 4);
		    let tx = xt(edge.target.layoutPosX);
		    let ty = yt(edge.target.layoutPosY);
		    const tw = Math.ceil(ctx.measureText(edge.target.id).width + 4);
		    if (tx > sx+sw) { sx += sw; }
		    else if (sx > tx+tw) { tx += tw; }
		    else { sx += sw/2; tx += tw/2; }
		    if (ty > sy+30) { sy += 30; }
		    else if (sy > ty+30) { ty += 30; }
		    else { sy += 15; ty += 15; }
		    ctx.moveTo (sx, sy);
		    ctx.lineTo (tx, ty);
		    ctx.closePath();
		    ctx.stroke();
		});
		count++;
		if (enabled) requestAnimationFrame (animate);
	    }

	    function xt (x) {
		return 2+(x + tt.xp) * tt.xs;
	    }
	    function xit (x) {
		return (x-2)/tt.xs - tt.xp;
	    }

	    function yt (y) {
		return 2+(y + tt.yp) * tt.ys;
	    }
	    function yit (y) {
		return (y-2)/tt.ys - tt.yp;
	    }
	}
    }
    // End of the code removed from the system by the compiler.
    //
    // END EXCLUDE
})();
