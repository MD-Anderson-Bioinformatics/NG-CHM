(function() {
    "use strict";
    NgChm.markFile();

    //Define Namespace for NgChm Drawing
    const DRAW = NgChm.createNS('NgChm.DRAW');

    const UHM = NgChm.importNS('NgChm.UHM');

    DRAW.BYTE_PER_RGBA = 4;

    DRAW.createRenderBuffer = function (width, height, pixelScaleFactor) {

	function resize (width, height) {
		width = width|0;
		height = height|0;
		if (width !== this.width || height !== this.height) {
			this.width = width;
			this.height = height;
			this.pixels = new Uint8Array(new ArrayBuffer((width * DRAW.BYTE_PER_RGBA) * height));
		}
	}

	const renderBuffer = {
		width: width|0,
		height: height|0,
		pixels: new Uint8Array(new ArrayBuffer((width * DRAW.BYTE_PER_RGBA) * height)),
		pixelScaleFactor: +pixelScaleFactor
	};

	renderBuffer.resize = resize.bind(renderBuffer);
	return renderBuffer;
    };

    /***************************
     * WebGL stuff
     **************************/

    DRAW.GL = {};

    // We use WebGL to display heat map and covariate bar contents.  The
    // overall process is:
    // 1. Prepare the content to display in a renderBuffer
    // 2. Copy the renderBuffer to a WebGL texture
    // 3. Render the WebGL texture to the canvas.

    // ClipSpace specifies the region of the canvas in which the texture will be drawn.
    // ClipSpace coordinates range from -1,-1 at the left bottom to 1,1 at the right top.
    // The ClipSpace to use is specified by an array of triangles.
    //
    // fullClipSpace is two triangles that cover the entire canvas:
    // #1. bottom left, bottom right, top right.
    // #2. bottom left, top left, top right.
    DRAW.GL.fullClipSpace = rectToTriangles (-1, -1, 1, 1);

    // TextureSpace specifies the region of the texture from which the texture will be drawn.
    // TextureSpace coordinates range from 0,0 at the left bottom to 1,1 at the right top.
    // The TextureSpace to use is specified by an array of triangles.
    //
    // fullTextureSpace is two triangles that cover the entire texture:
    // #1. bottom left, bottom right, top right.
    // #2. bottom left, top left, top right.
    DRAW.GL.fullTextureSpace = rectToTriangles (0, 0, 1, 1);

    // To use WebGL for rendering, we need a WebGL context. But, the browser can remove
    // the current window's access to a context between *any* two event callbacks.
    // NO WebGL related functions can be used with a context when it has been lost.
    //
    // When the browser restores access to the context, any previous state associated
    // with the context has been destroyed and must be recreated.
    //
    // We manage this via a GlManager object that:
    // - tracks GL context loss and restore events,
    // - initializes the GL context when it is restored, and
    // - provides a simple interface for determining if we currently have a valid context.

    class GlManager {
	// The GlManager constructor should be called at most once for a canvas.
	// getVertexShader and getFragmentShader are functions that create the vertex and
	// fragment shaders for the GL context given as the only parameter.  They are called by
	// GlManager when initializing or re-initializing a context.
	//
	constructor (canvas, getVertexShader, getFragmentShader, onRestore, widthScale, heightScale) {
	    this._state = getTrackedGlContext (canvas, onRestore);
	    this._OK = false;
	    this._getVertexShader = getVertexShader;
	    this._getFragmentShader = getFragmentShader;
	    this._program = null;
	    this._itemsToDraw = 0;
	    this._widthScale = widthScale || 1;
	    this._heightScale = heightScale || 1;
	}

	// Determine if the manager's GL context can be used.
	//
	// If necessary, the GL context is (re-)initialized using the
	// getVertexShader and getFragmentShader functions.
	//
	// If supplied, userinit is a function to perform user initialization
	// of the context.  It is passed the context and program and should
	// return truthy on success, falsey on error.
	check (userinit) {
		let initialized;

		if (this._state.lost) {
		    // Either a new context, or the context was lost.
		    if (this._state.restored) {
			// Either a new context or the context has been restored: reinitialize.
			this._state.lost = false;
			this._state.restored = false;
			this._OK = true;
			initialized = false;
		    } else {
			// Lost but not restored - cannot use.
			this._OK = false;
		    }
		} else {
		    // Not lost since last use
		    // Resizing the viewport, which is needed if the canvas was resized.
		    const ctx = this._state.context;
		    ctx.viewport(0, 0, ctx.drawingBufferWidth*this._widthScale, ctx.drawingBufferHeight*this._heightScale);
		    this._OK = true;
		    initialized = true;
		}

		// Initialize the GL program and shaders if needed.
		if (this._OK && !initialized) {
		    const ctx = this._state.context;
		    if (ctx) {
			ctx.clearColor(1, 1, 1, 1);
			// Texture shaders
			this._program = ctx.createProgram();
			if (this._program) {
			    const vertexShader = this._getVertexShader(ctx);
			    const fragmentShader = this._getFragmentShader(ctx);
			    ctx.attachShader(this._program, vertexShader);
			    ctx.attachShader(this._program, fragmentShader);
			    ctx.linkProgram(this._program);
			    ctx.useProgram(this._program);
			    this.setTextureProps();
			    if (userinit && !userinit (this, this._state.context, this._program)) {
				console.error ("User initialization failed for ", ctx);
				this._OK = false;
			    }
			} else {
			    console.error ("Unable to create program for ", ctx);
			    this._OK = false;
			}
		    } else {
			console.error ("No context");
			this._OK = false;
		    }
		}

		return this._OK;
	}

	setTextureProps () {
		// Texture
		const ctx = this._state.context;
		const texture = ctx.createTexture();
		if (texture) {
		    ctx.bindTexture(ctx.TEXTURE_2D, texture);
		    ctx.texParameteri(
				    ctx.TEXTURE_2D,
				    ctx.TEXTURE_WRAP_S,
				    ctx.CLAMP_TO_EDGE);
		    ctx.texParameteri(
				    ctx.TEXTURE_2D,
				    ctx.TEXTURE_WRAP_T,
				    ctx.CLAMP_TO_EDGE);
		    ctx.texParameteri(
				    ctx.TEXTURE_2D,
				    ctx.TEXTURE_MIN_FILTER,
				    ctx.NEAREST);
		    ctx.texParameteri(
				    ctx.TEXTURE_2D,
				    ctx.TEXTURE_MAG_FILTER,
				    ctx.NEAREST);
		} else {
		    console.error ("Unable to create texture for ", ctx);
		    this._OK = false;
		}
	}

	// Determine if the manager's GL context can be used.
	// This is only valid if accessed during the same top-level
	// event handler as the last call to the check method.
	get OK () {
		return this._OK;
	}

	// Get the manager's GL context.
	get context () {
		return this._state.context;
	}

	// Get the program attached to the manager's GL context.
	get program () {
		return this._program;
	}

	// Indicate that the manager's GL context is unusable.
	// Call if an error is detected using a GL function.
	dontUse () {
		this._OK = false;
	}

	// Set the clip region.
	setClipRegion (vertices) {
		const ctx = this._state.context;
		const buffer = ctx.createBuffer();
		ctx.bindBuffer(ctx.ARRAY_BUFFER, buffer);
		ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array(vertices), ctx.STATIC_DRAW);
		const byte_per_vertex = Float32Array.BYTES_PER_ELEMENT;
		const component_per_vertex = 2;
		const stride = component_per_vertex * byte_per_vertex;
		const locn = ctx.getAttribLocation(this._program, 'position');	 	
		ctx.enableVertexAttribArray(locn);
		ctx.vertexAttribPointer(locn, 2, ctx.FLOAT, false, stride, 0);
		this._itemsToDraw = vertices.length / component_per_vertex;
	}

	// Set the texture region to use.
	// Only valid if the vertexShader has a "texCoord" attribute (i.e. it is for a detail map).
	setTextureRegion (vertices) {
		const ctx = this._state.context;
		const buffer = ctx.createBuffer();
		ctx.bindBuffer(ctx.ARRAY_BUFFER, buffer);
		ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array(vertices), ctx.STATIC_DRAW);
		const locn = ctx.getAttribLocation(this._program, "texCoord");
		ctx.enableVertexAttribArray(locn);
		ctx.vertexAttribPointer(locn, 2, ctx.FLOAT, false, 0, 0);
	}

	// Set the context's texture from the renderBuffer.
	setTextureFromRenderBuffer (renderBuffer) {
		const ctx = this._state.context;
		ctx.activeTexture(ctx.TEXTURE0);
		ctx.texImage2D(
			    ctx.TEXTURE_2D,
			    0,
			    ctx.RGBA,
			    renderBuffer.width,
			    renderBuffer.height,
			    0,
			    ctx.RGBA,
			    ctx.UNSIGNED_BYTE,
			    renderBuffer.pixels);
	}

	// Draw the texture.
	drawTexture () {
	    const ctx = this._state.context;
	    ctx.drawArrays(ctx.TRIANGLE_STRIP, 0, this._itemsToDraw);
	}

    }

    DRAW.GL.createGlManager = function (canvas, getVertexShader, getFragmentShader, onRestore, widthScale, heightScale) {
	    return new GlManager (canvas, getVertexShader, getFragmentShader, onRestore, widthScale, heightScale);
    };

    // Returns a tracked GL context for the specified canvas.
    // The return value is an object with three fields:
    // - context The WebGL context for the canvas.
    // - lost Boolean, true on initialization or if the context was *ever* lost since the last check
    // - restored Boolean, true if the context has been restored after the most recent loss.
    function getTrackedGlContext (canvas, onRestore) {
	const debug = true;
	if (!!window.WebGLRenderingContext) {
	    const names = ["webgl", "experimental-webgl", "moz-webgl", "webkit-3d"];
	    for(let i=0;i<names.length;i++) {
		try {
		    const context = canvas.getContext(names[i], {preserveDrawingBuffer: true});
		    if (context && typeof context.getParameter == "function") {
			// WebGL is enabled
			const obj = { lost: true, restored: true, context };
			(function(obj, onRestore) {
			    canvas.addEventListener('webglcontextlost', ev => {
				ev.preventDefault();
				if (debug) console.debug ('WebGL context lost at ' + Date());
				obj.lost = true;
				obj.restored = false;
			    }, false);
			    canvas.addEventListener('webglcontextrestored', ev => {
				ev.preventDefault();
				if (debug) console.debug ('WebGL context restored at ' + Date());
				obj.restored = true;
				// Workaround for bug(s) in Chrome/Safari on Macs.
				// The canvas 'hibernates' after the context restore.
				// WebGL operations on the canvas aren't redrawn until
				// there is an additional trigger to force the redraw.
				//
				// The 'Chrome on Mac fix' section below works for Mac Chrome 96.0.4664.110.
				//
				// The 'Safari fix' code below works for Mac Safari (14.1.2) and some, but not
				// all, Mac Chrome installs.  Tested with Chrome 96.0.4664.110: some systems
				// work with just this fix, some don't.
				//
				// Chrome on Linux, Firefox on Mac are not affected by the issue.
				{ // Chrome on Mac fix:
				  // It is adding the handler for this specific event that revives the canvas.
				  // No idea why.
				  let handler = (e) => console.log(e);
				  document.addEventListener('touchmove', handler, {passive: false});
				  document.removeEventListener('touchmove', handler);
				  // Safari fix:
				  canvas.classList.add('hide');
				  requestAnimationFrame (() => canvas.classList.remove('hide'));
				}
				if (onRestore) setTimeout(onRestore);
			    }, false);
			})(obj, onRestore);
			return obj;
		    }
		} catch(e) {}
	    }
	    // WebGL is supported, but disabled
	    UHM.noWebGlContext(true);
	    return null;
	}
	// WebGL not supported
	UHM.noWebGlContext(false);
	return null;
    }

    // Convert the sides of rectangle into an array of
    // triangle vertices.
    DRAW.GL.rectToTriangles = rectToTriangles;
    function rectToTriangles (bottom, left, top, right) {
	return [ left, bottom, right, bottom, right, top,
		 left, bottom, left, top, right, top ];
    }

    // Helper function for debugging WebGL context issues.
    // Intended for use by developers.
    DRAW.GL.getContextSimulator = function (id) {
	if (!id) {
	    console.log ("Usage: var ext = NgChm.DRAW.GL.getContextSimulator(id);");
	    console.log ("       ext.loseContext();");
	    console.log ("       ext.restoreContext();");
	    console.log ("Valid ids are like summary_canvas, row_class_canvas, col_class_canvas, detail_canvas, detail_canvas2, etc.");
	    return;
	}
	return document.getElementById(id).getContext("webgl").getExtension("WEBGL_lose_context");
    }
})();
