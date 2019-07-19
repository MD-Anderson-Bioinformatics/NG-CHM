//"use strict";

//Define Namespace for NgChm Drawing
NgChm.createNS('NgChm.DRAW');

NgChm.DRAW.createRenderBuffer = function (width, height, pixelScaleFactor) {

	function resize (width, height) {
		width = width|0;
		height = height|0;
		if (width !== this.width || height !== this.height) {
			this.width = width;
			this.height = height;
			this.pixels = new Uint8Array(new ArrayBuffer((width * NgChm.SUM.BYTE_PER_RGBA) * height));
		}
	}

	const renderBuffer = {
		width: width|0,
		height: height|0,
		pixels: new Uint8Array(new ArrayBuffer((width * NgChm.SUM.BYTE_PER_RGBA) * height)),
		pixelScaleFactor: +pixelScaleFactor
	};

	renderBuffer.resize = resize.bind(renderBuffer);
	return renderBuffer;
};
