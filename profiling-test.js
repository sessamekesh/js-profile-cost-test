var sess = sess || {};
sess.demo = sess.demo || {};
sess.demo.Profile = sess.demo.Profile || {};

/**
 * Profiler used to capture information about the running of a scene.
 * Three levels of capture:
 *  (1): Capture just the frame time
 *     (a): With 200 particles
 *     (a): With 1000 particles
 *     (a): With 10000 particles
 *  (2): Capture all high-level functions (once per frame)
 *  (3): Capture all mid-level functions (many times per frame)
 *  (4): Capture all low-level functions (the sort)
 *  (5): Capture all functions together
 */
sess.demo.Profile.Run = function (frameCountPerSample, scene) {
	sess.demo.Profile.RunFrameOnlyTests(frameCountPerSample, scene);
};

sess.demo.Profile.RunFrameOnlyTests = function (frameCountPerSample, scene) {
	async.mapSeries([
		200, 2000, 20000
	], function (val, cb) {
		scene.setNumParticles(val);
		var frameTimeBuffer = new Float32Array(frameCountPerSample);
		var frameIndex = 0;
		var oldFrameMethod = sess.demo.Scene.prototype.frame;
		var invokeCallback = true;
		var startTime = 0;
		var endTime = 0;
		sess.demo.Scene.prototype.frame = function (pn) {
			startTime = performance.now();
			oldFrameMethod.call(this, pn);
			endTime = performance.now();

			if (frameIndex < frameCountPerSample) {
				frameTimeBuffer[frameIndex] = endTime - startTime;
				frameIndex++;
			} else if (invokeCallback) {
				sess.demo.Scene.prototype.frame = oldFrameMethod;
				var average = 0;
				for (var i = 0; i < frameCountPerSample; i++) {
					average += frameTimeBuffer[i] / frameCountPerSample;
				}
				invokeCallback && cb(null, average);
				invokeCallback = false;
			}
		};
	}, function (err, result) {
		console.log('Frame times (ms) for various number of particles:');
		console.log('200: ' + result[0] + '  2000: ' + result[1] + '  20000: ' + result[2]);
		scene.setNumParticles(300);
	});
};