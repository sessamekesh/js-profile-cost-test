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
sess.demo.Profile.Run = function (maxTimeElapsed, maxBufferSize, scene) {
	sess.demo.Profile.RunFrameOnlyTests(maxTimeElapsed, maxBufferSize, scene);
};

// Invoke cb when exit false condition hit
sess.demo.Profile.WrapMethod = function (fn, fnId, sharedSettings, idBuffer, timeBuffer, cb) {
	var startTime = 0;
	var endTime = 0;

	// Settings:
	//  - fnID
	//  - stopTime
	//  - nextBufferIdx
	//  - maxBufferSize

	return {
		original: fn,
		method: function () {
			startTime = performance.now();
			fn.apply(this, arguments);
			endTime = performance.now();

			if (endTime < sharedSettings.stopTime && sharedSettings.nextBufferIdx < sharedSettings.maxBufferSize) {
				idBuffer[sharedSettings.nextBufferIdx] = fnId;
				timeBuffer[sharedSettings.nextBufferIdx] = endTime - startTime;
				sharedSettings.nextBufferIdx++;
			} else {
				cb();
			}
		}
	};
};

sess.demo.Profile.RunFrameOnlyTests = function (maxTimeElapsed, maxBufferSize, scene) {
	async.mapSeries([
		200, 2000, 20000
	], function (val, cb) {
		var stopTestTime = performance.now() + maxTimeElapsed;
		var nextBufferIndex = 0;
		var FN_FRAME_ID = 0;
		scene.setNumParticles(val);
		var methodCalledBuffer = new Uint8Array(maxBufferSize);
		var frameTimeBuffer = new Float32Array(maxBufferSize);
		var alreadyFinished = false;

		var sharedSettings = {
			nextBufferIdx: 0,
			stopTime: stopTestTime,
			maxBufferSize: maxBufferSize
		};

		var onFinish = function () {
			if (alreadyFinished) {
				return;
			}

			alreadyFinished = true;

			// Restore original methods
			sess.demo.Scene.prototype.frame = frameWrapped.original;

			// Collect metrics
			var frameTimeAverage = 0;
			for (var i = 0; i < sharedSettings.nextBufferIdx; i++) {
				frameTimeAverage += frameTimeBuffer[i] / sharedSettings.nextBufferIdx;
			}
			cb(null, frameTimeAverage);
		};

		var frameWrapped = sess.demo.Profile.WrapMethod(sess.demo.Scene.prototype.frame, 0, sharedSettings, methodCalledBuffer, frameTimeBuffer, onFinish);
		sess.demo.Scene.prototype.frame = frameWrapped.method;

	}, function (err, result) {
		console.log('Frame times (ms) for various number of particles:');
		console.log('200: ' + result[0] + '  2000: ' + result[1] + '  20000: ' + result[2]);
		scene.setNumParticles(300);
	});
};