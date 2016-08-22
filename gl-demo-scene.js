var sess = sess || {};
sess.demo = sess.demo || {};

//
// Globals
//
/** @type {!number} */
sess.demo.MIN_SURFACE_VELOCITY = 0.2;
/** @type {!number} */
sess.demo.MAX_SURFACE_VELOCITY = 1.0;
/** @type {!number} */
sess.demo.MIN_PARTICLE_LIFETIME = 1.5;
/** @type {!number} */
sess.demo.MAX_PARTICLE_LIFETIME = 3.0;

/**
 * Scene used to draw all the WebGL stuff for this example scene
 * @param {!WebGLRenderingContext} gl
 */
sess.demo.Scene = function (gl, numParticles) {
	/** @private {!WebGLRenderingContext} */
	this.gl = gl;

	/** @private {!WebGLProgram} */
	this.program;

	/** @private {!WebGLTexture} */
	this.texture;

	/** @private {!Array.<!sess.demo.Particle>} */
	this.particles = [];

	/** @private {{WebGLUniformLocation}} */
	this.uniforms = {};

	/** @private {{WebGLAttribLocation}} */
	this.attribs = {};

	/** @private {mat4} */
	this.mModel = mat4.create();

	/** @private {mat4} */
	this.mViewProj = mat4.create();

	/**
	 * Cached camera position, used in getting vertices and sort
	 * @private {!vec3}
	 */
	this.cameraPosition_ = vec3.create();

	/**
	 * Cached camera up direction, used in getting vertices
	 * @private {!vec3}
	 */
	this.cameraUp_ = vec3.create();

	/**
	 * To be used for our dynamic vertex buffer. Fixed size, since there is a fixed
	 *  number of particles and a fixed number of attributes per vertex
	 * Size will be nParticles * nVertsPerParticle * nValsPerVert
	 * @private {!Float32Array}
	 */
	this.vertices;

	/** @private {!WebGLBuffer} */
	this.vertexBuffer = gl.createBuffer();

	this.setNumParticles(numParticles);
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.DYNAMIC_DRAW);

	//
	// Public, mutable properties
	//
	
	/** @type {Number} */
	this.particleWidth = 1;
	/** @type {Number} */
	this.particleHeight = 1;
	/** @type {Number} */
	this.ballRadius = 5;
};

/**
 * Change the number of particles in the demo scene
 * @param {!number} numParticles
 */
sess.demo.Scene.prototype.setNumParticles = function (numParticles) {
	this.numParticles = numParticles;
	for (var i = 0; i < numParticles; i++) {
 		var surfaceVelocity = sess.demo.RandomInRange(sess.demo.MIN_SURFACE_VELOCITY, sess.demo.MAX_SURFACE_VELOCITY);
 		var angleOfMotion = sess.demo.RandomInRange(0, 2 * π);
 		var latitude = sess.demo.RandomInRange(0, 2 * π);
 		var longitude = sess.demo.RandomInRange(0, 2 * π);
 		var lifetime = sess.demo.RandomInRange(sess.demo.MIN_PARTICLE_LIFETIME, sess.demo.MAX_PARTICLE_LIFETIME);

 		var startColor = vec4.fromValues(
 			sess.demo.RandomInRange(0, 1),
 			sess.demo.RandomInRange(0, 1),
 			sess.demo.RandomInRange(0, 1),
 			sess.demo.RandomInRange(0.7, 1)
		);
 		var endColor = vec4.fromValues(
 			sess.demo.RandomInRange(0, 1),
 			sess.demo.RandomInRange(0, 1),
 			sess.demo.RandomInRange(0, 1),
 			sess.demo.RandomInRange(0, 0.3)
		);

		this.particles[i] = new sess.demo.Particle(
			surfaceVelocity,
			angleOfMotion,
			latitude,
			longitude,
			lifetime,
			startColor,
			endColor
		);
	}

	this.vertices = new Float32Array(numParticles * 6 * 9);
	var gl = this.gl;
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.DYNAMIC_DRAW);
}

/**
 * @param {!vec3} cameraPosition Position at which the camera is located
 * @param {!vec3} cameraLookAt Position at which the camera is pointed
 * @param {!vec3} cameraUp Up direction for use with the camera
 * @param {!number} fovy Field of view in the Y direction of the view
 */
sess.demo.Scene.prototype.setupViewProjMatrices = function (cameraPosition, cameraLookAt, cameraUp, fovy) {
	mat4.identity(this.mModel);
	var mView = mat4.create();
	var mProj = mat4.create();
	mat4.lookAt(mView, cameraPosition, cameraLookAt, cameraUp);
	mat4.perspective(mProj, glMatrix.toRadian(90), this.gl.canvas.width / this.gl.canvas.height, 0.1, 1000.0);

	// TODO KAM: This might be in the wrong order, fix that maybe?
	mat4.multiply(this.mViewProj, mProj, mView);

	vec3.copy(this.cameraPosition_, cameraPosition);
	vec3.copy(this.cameraUp_, cameraUp);
};

/**
 * Load the particle shader and create program
 * @param  {!string} vsURL Location at which the vertex shader source code can be found
 * @param  {!string} fsURL Location at which the fragment shader source code can be found
 * @param  {!Function(err: Error)} cb Callback to be invoked once everything
 */
sess.demo.Scene.prototype.loadParticleShader = function (vsURL, fsURL, cb) {
	var gl = this.gl;

	async.mapValues({
		vs: vsURL,
		fs: fsURL
	}, function (url, name, callback) {
		sess.demo.LoadShaderAsync(url, callback);
	}, function (err, result) {
		if (err) {
			cb(err);
			return;
		}

		// Create shaders
		var vs = gl.createShader(gl.VERTEX_SHADER);
		var fs = gl.createShader(gl.FRAGMENT_SHADER);

		gl.shaderSource(vs, result.vs);
		gl.shaderSource(fs, result.fs);

		gl.compileShader(vs);
		if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
			cb('Error compiling vertex shader - ' + gl.getShaderInfoLog(vs));
			return;
		}

		gl.compileShader(fs);
		if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
			cb('Error compiling fragment shader - ' + gl.getShaderInfoLog(fs));
			return;
		}

		// Create program
		this.program = gl.createProgram();
		gl.attachShader(this.program, vs);
		gl.attachShader(this.program, fs);

		gl.linkProgram(this.program);
		gl.validateProgram(this.program);
		if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
			cb(gl.getProgramInfoLog(this.program));
			return;
		}

		// Get uniform and attrib references
		this.attribs.vPos = gl.getAttribLocation(this.program, 'vPos');
		this.attribs.vUV = gl.getAttribLocation(this.program, 'vUV');
		this.attribs.vColor = gl.getAttribLocation(this.program, 'vColor');
		this.uniforms.uModel = gl.getUniformLocation(this.program, 'uModel');
		this.uniforms.uViewProj = gl.getUniformLocation(this.program, 'uViewProj');
		this.uniforms.uSampler = gl.getUniformLocation(this.program, 'uSampler');

		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.vertexAttribPointer(
			this.attribs.vPos,
			3,
			gl.FLOAT,
			gl.FALSE,
			9 * Float32Array.BYTES_PER_ELEMENT,
			0);
		gl.vertexAttribPointer(
			this.attribs.vUV,
			2,
			gl.FLOAT,
			gl.FALSE,
			9 * Float32Array.BYTES_PER_ELEMENT,
			3 * Float32Array.BYTES_PER_ELEMENT);
		gl.vertexAttribPointer(
			this.attribs.vColor,
			4,
			gl.FLOAT,
			gl.FALSE,
			9 * Float32Array.BYTES_PER_ELEMENT,
			5 * Float32Array.BYTES_PER_ELEMENT);
		gl.enableVertexAttribArray(this.attribs.vPos);
		gl.enableVertexAttribArray(this.attribs.vUV);
		gl.enableVertexAttribArray(this.attribs.vColor);

		cb();
		return;
	}.bind(this));
};

/**
 * Load the particle image from the provided URL
 * @param  {!string}   imgURL Location at which the particle image may be found
 * @param  {Function(err: ?Error=)} cb Callback when finished
 */
sess.demo.Scene.prototype.loadTexture = function (imgURL, cb) {
	var gl = this.gl;

	sess.demo.LoadImage(imgURL, function (err, image) {
		if (err) {
			cb(err);
			return;
		}

		this.texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texImage2D(
			gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
			gl.UNSIGNED_BYTE,
			image);
		cb();
		return;

	}.bind(this));
};

/**
 * Call this function to begin the demo!
 */
sess.demo.Scene.prototype.loop = function () {
	var lastFrame = performance.now();
	var innerLoop = function (pn) {
		this.update((pn - lastFrame) / 1000);
		lastFrame = pn;
		this.draw();
		
		requestAnimationFrame(innerLoop.bind(this));
	}
	requestAnimationFrame(innerLoop.bind(this));
};

/**
 * Called once per frame to update the world state of the scene
 * @param  {!number} ms_dt Time elapsed since last update, in milliseconds
 */
sess.demo.Scene.prototype.update = function (ms_dt) {
	this.updateParticles(ms_dt);
	this.sortParticles();
	this.updateVertexBuffer();
};

/**
 * Update the particles in the scene to be in their proper positions
 * @param  {!number} ms_dt Time elapsed since last update, in milliseconds
 */
sess.demo.Scene.prototype.updateParticles = function (ms_dt) {
	for (var i = 0; i < this.particles.length; i++) {
		if (!this.particles[i].update(ms_dt)) {
			var surfaceVelocity = sess.demo.RandomInRange(sess.demo.MIN_SURFACE_VELOCITY, sess.demo.MAX_SURFACE_VELOCITY);
	 		var angleOfMotion = sess.demo.RandomInRange(0, 2 * π);
	 		var latitude = sess.demo.RandomInRange(0, 2 * π);
	 		var longitude = sess.demo.RandomInRange(0, 2 * π);
	 		var lifetime = sess.demo.RandomInRange(sess.demo.MIN_PARTICLE_LIFETIME, sess.demo.MAX_PARTICLE_LIFETIME);

	 		var startColor = vec4.fromValues(
	 			sess.demo.RandomInRange(0, 1),
	 			sess.demo.RandomInRange(0, 1),
	 			sess.demo.RandomInRange(0, 1),
	 			sess.demo.RandomInRange(0.7, 1)
			);
	 		var endColor = vec4.fromValues(
	 			sess.demo.RandomInRange(0, 1),
	 			sess.demo.RandomInRange(0, 1),
	 			sess.demo.RandomInRange(0, 1),
	 			sess.demo.RandomInRange(0, 0.3)
			);

			this.particles[i] = new sess.demo.Particle(
				surfaceVelocity,
				angleOfMotion,
				latitude,
				longitude,
				lifetime,
				startColor,
				endColor
			);
		}
	}
};

/**
 * Sort the particles in the scene, furthest from the camera to nearest
 */
sess.demo.Scene.prototype.sortParticles = function () {
	this.particles.sort(this.compareParticleDistances.bind(this));
};

/**
 * Compare method for two particles. Compares by distance from camera.
 * @param  {!sess.demo.Particle} particleA
 * @param  {!sess.demo.Particle} particleB
 * @return {!number} Less than 0 if a is a lower index than b, higher otherwise
 */
sess.demo.Scene.prototype.compareParticleDistances = function (particleA, particleB) {
	return vec3.squaredDistance(particleA.position(this.ballRadius), this.cameraPosition_)
		- vec3.squaredDistance(particleB.position(this.ballRadius), this.cameraPosition_);
};

/**
 * Update the data in the vertex buffer on the GPU side of things
 */
sess.demo.Scene.prototype.updateVertexBuffer = function () {
	var offset = 0;
	for (var i = 0; i < this.numParticles; i++) {
		this.particles[i].getVertices(
			this.ballRadius,
			this.cameraPosition_, this.cameraUp_,
			this.particleWidth, this.particleHeight,
			this.vertices, offset
			);

		// 54 new values added each time, add 54 to the offset
		offset += 54;
	}

	var gl = this.gl;
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
	gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices);
};

/**
 * Draw the scene, baby!
 */
sess.demo.Scene.prototype.draw = function () {
	var gl = this.gl;
	gl.useProgram(this.program);
	gl.uniformMatrix4fv(this.uniforms.uModel, gl.FALSE, this.mModel);
	gl.uniformMatrix4fv(this.uniforms.uViewProj, gl.FALSE, this.mViewProj);
	gl.uniform1i(this.uniforms.uSampler, 0);

	gl.clearColor(0.1, 0.1, 0.1, 1.0);
	gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

	// TODO KAM: Change these :-)
	gl.disable(gl.DEPTH_TEST);
	gl.disable(gl.CULL_FACE);
	gl.frontFace(gl.CCW);
	gl.cullFace(gl.BACK);
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
	// gl.enable(gl.BLENDING);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, this.texture);

	// 6 vertices per particle, yeah?
	gl.drawArrays(gl.TRIANGLES, 0, this.numParticles * 6);
};

/**
 * Method to invoke whenever the view is resized
 * @param  {!number} width
 * @param  {!number} height
 */
sess.demo.Scene.prototype.handleResize = function (width, height) {
	this.gl.canvas.width = width;
	this.gl.canvas.height = height;
	this.gl.viewport(0, 0, width, height);

	this.setupViewProjMatrices(this.cameraPosition_, [0, 0, 0], this.cameraUp_, glMatrix.toRadian(90));
};