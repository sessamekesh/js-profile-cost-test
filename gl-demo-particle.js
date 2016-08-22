var sess = sess || {};
sess.demo = sess.demo || {};

/**
 * Represents logical data for a single particle, as well as information
 *  needed to construct that particle in 3D space.
 * @param {!number} surfaceVelocity Speed at which the particle is travelling across the surface of the sphere
 * @param {!number} angleOfMotion Angle from horizontal at which particle travels along surface of the sphere
 * @param {!number} latitude Starting latitude of the particle
 * @param {!number} longitude Starting longitude of the particle
 * @param {!number} lifetime Lifetime, in seconds, of this particle
 * @param {!vec4} startColor Starting color of the particle (at t = 0)
 * @param {!vec4} endColor   Ending color of the particle (at t = max)
 */
sess.demo.Particle = function (surfaceVelocity, angleOfMotion, latitude, longitude, lifetime, startColor, endColor) {
	/** @private {!number} */
	this.surfaceVelocity_ = surfaceVelocity;

	/** @private {!number} */
	this.angleOfMotion_ = angleOfMotion;

	/** @private {!number} */
	this.latitude_ = latitude;

	/** @private {!number} */
	this.longitude_ = longitude;

	/** @private {!number} */
	this.timeRemaining_ = lifetime;

	/** @private {!number} */
	this.lifetime_ = lifetime;

	/** @private {!vec4} */
	this.startColor_ = startColor;

	/** @private {!vec4} */
	this.endColor_ = endColor;

	this.position_ = {
		dirty: true,
		radiusValue: 0,
		value: vec3.create()
	};
};

/**
 * Update the particle to have a new position and remaining lifetime
 * @param  {!number} ms_dt Time elapsed, in milliseconds
 * @return {!boolean} True if the particle lives still, false otherwise
 */
sess.demo.Particle.prototype.update = function (ms_dt) {
	this.timeRemaining_ -= ms_dt;
	if (this.timeRemaining_ < 0) {
		return false;
	}

	// Update latitude and longitude
	this.position_.dirty = true;
	this.latitude_ += Math.cos(this.angleOfMotion_) * this.surfaceVelocity_ * ms_dt;
	this.longitude_ += Math.sin(this.angleOfMotion_) * this.surfaceVelocity_ * ms_dt;

	return true;
};

/**
 * Get the position of a particle
 * @param {!number} ballRadius Radius of the ball around which this particle orbits
 * @return {vec3}
 */
sess.demo.Particle.prototype.position = function (ballRadius) {
	if (this.position_.dirty || this.position_.radiusValue != ballRadius) {
		this.position_.value[0] = ballRadius * Math.sin(this.latitude_) * Math.cos(this.longitude_);
		this.position_.value[1] = ballRadius * Math.cos(this.latitude_);
		this.position_.value[2] = ballRadius * Math.sin(this.latitude_) * Math.sin(this.longitude_);

		this.position_.radiusValue = ballRadius;
		this.position_.dirty = false;
	}

	return this.position_.value;
};

/**
 * Get the vertices associated with this particle. Writes directly to a typed array
 *  passed in to avoid memory allocation and copies
 * @param  {!number} ballRadius Radius of the ball in world coordinates
 * @param  {!vec3} cameraPosition Position of the camera in world space
 * @param  {!vec3} cameraUp       Up direction of the camera in world space
 * @param  {!number} particleWidth Width of a particle in world units
 * @param  {!number} particleHeight Height of a particle in world units
 * @param  {!Float32Array} o_verts  Output vertex array (float32)
 * @param  {?number=} offset        Offset into the vertex array to begin (zero default)
 */
sess.demo.Particle.prototype.getVertices = function (ballRadius, cameraPosition, cameraUp, particleWidth, particleHeight, o_verts, offset) {
	offset = offset || 0;

	var particleFromCamera = vec3.create();
	var right = vec3.create();
	var up = vec3.create();

	var particleColor = vec4.create();

	// LERPing backwards, because the t-term here will start at 1 and end at 0
	vec4.lerp(particleColor, this.endColor_, this.startColor_, this.timeRemaining_ / this.lifetime_);

	vec3.subtract(particleFromCamera, this.position(ballRadius), cameraPosition);
	vec3.cross(right, particleFromCamera, cameraUp);
	vec3.cross(up, right, particleFromCamera);

	vec3.normalize(up, up);
	vec3.normalize(right, right);

	vec3.scale(right, right, 0.5 * particleWidth);
	vec3.scale(up, up, 0.5 * particleHeight);

	var topLeft = vec3.create();
	var topRight = vec3.create();
	var bottomLeft = vec3.create();
	var bottomRight = vec3.create();

	// topLeft = this.Position - right * 0.5 + up * 0.5;
	vec3.add(topLeft, this.position(ballRadius), up);
	vec3.subtract(topLeft, topLeft, right);

	vec3.add(topRight, this.position(ballRadius), up);
	vec3.add(topRight, topRight, right);

	vec3.subtract(bottomLeft, this.position(ballRadius), up);
	vec3.subtract(bottomLeft, bottomLeft, right);

	vec3.subtract(bottomRight, this.position(ballRadius), up);
	vec3.add(bottomRight, bottomRight, right);

	// Bottom Right : Top Right : Bottom Left
	o_verts[offset + 0] = bottomRight[0];
	o_verts[offset + 1] = bottomRight[1];
	o_verts[offset + 2] = bottomRight[2];
	o_verts[offset + 3] = 0.0;
	o_verts[offset + 4] = 0.0;
	o_verts[offset + 5] = particleColor[0];
	o_verts[offset + 6] = particleColor[1];
	o_verts[offset + 7] = particleColor[2];
	o_verts[offset + 8] = particleColor[3];

	o_verts[offset + 9] = topRight[0];
	o_verts[offset + 10] = topRight[1];
	o_verts[offset + 11] = topRight[2];
	o_verts[offset + 12] = 0.0;
	o_verts[offset + 13] = 1.0;
	o_verts[offset + 14] = particleColor[0];
	o_verts[offset + 15] = particleColor[1];
	o_verts[offset + 16] = particleColor[2];
	o_verts[offset + 17] = particleColor[3];

	o_verts[offset + 18] = bottomLeft[0];
	o_verts[offset + 19] = bottomLeft[1];
	o_verts[offset + 20] = bottomLeft[2];
	o_verts[offset + 21] = 1.0;
	o_verts[offset + 22] = 0.0;
	o_verts[offset + 23] = particleColor[0];
	o_verts[offset + 24] = particleColor[1];
	o_verts[offset + 25] = particleColor[2];
	o_verts[offset + 26] = particleColor[3];

	// Top Right : Bottom Left : Top Left
	o_verts[offset + 27] = topRight[0];
	o_verts[offset + 28] = topRight[1];
	o_verts[offset + 29] = topRight[2];
	o_verts[offset + 30] = 0.0;
	o_verts[offset + 31] = 1.0;
	o_verts[offset + 32] = particleColor[0];
	o_verts[offset + 33] = particleColor[1];
	o_verts[offset + 34] = particleColor[2];
	o_verts[offset + 35] = particleColor[3];

	o_verts[offset + 36] = bottomLeft[0];
	o_verts[offset + 37] = bottomLeft[1];
	o_verts[offset + 38] = bottomLeft[2];
	o_verts[offset + 39] = 1.0;
	o_verts[offset + 40] = 0.0;
	o_verts[offset + 41] = particleColor[0];
	o_verts[offset + 42] = particleColor[1];
	o_verts[offset + 43] = particleColor[2];
	o_verts[offset + 44] = particleColor[3];

	o_verts[offset + 45] = topLeft[0];
	o_verts[offset + 46] = topLeft[1];
	o_verts[offset + 47] = topLeft[2];
	o_verts[offset + 48] = 1.0;
	o_verts[offset + 49] = 1.0;
	o_verts[offset + 50] = particleColor[0];
	o_verts[offset + 51] = particleColor[1];
	o_verts[offset + 52] = particleColor[2];
	o_verts[offset + 53] = particleColor[3];
};