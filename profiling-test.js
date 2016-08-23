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

sess.demo.Profile.RunFrameAndHighLevelTests = function (maxTimeElapsed, maxBufferSize, scene) {
	async.mapSeries([
		200, 2000, 20000
	], function (val, cb) {
		var stopTestTime = performance.now() + maxTimeElapsed;
		var FN_ID = {
			frame: 0,
			update: 1,
			draw: 2,
			updateParticles: 3,
			sortParticles: 4,
			updateVertexBuffer: 5
		};
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
				return
			}
			alreadyFinished = true;

			// Restore original methods
			sess.demo.Scene.prototype.frame = frameWrapped.original;
			sess.demo.Scene.prototype.update = updateWrapped.original;
			sess.demo.Scene.prototype.draw = drawWrapped.original;
			sess.demo.Scene.prototype.updateParticles = updateParticlesWrapped.original;
			sess.demo.Scene.prototype.sortParticles = sortParticlesWrapped.original;
			sess.demo.Scene.prototype.updateVertexBuffer = updateVertexBufferWrapped.original;


			// Collect metrics
			var fnStats = {
				frame: {
					averageTimeMS: 0,
					count: 0
				},
				update: {
					averageTimeMS: 0,
					count: 0
				},
				draw: {
					averageTimeMS: 0,
					count: 0
				},
				updateParticles: {
					averageTimeMS: 0,
					count: 0
				},
				sortParticles: {
					averageTimeMS: 0,
					count: 0
				},
				updateVertexBuffer: {
					averageTimeMS: 0,
					count: 0
				}
			};

			for (var i = 0; i < sharedSettings.nextBufferIdx; i++) {
				switch (methodCalledBuffer[i]) {
					case FN_ID.frame:
					fnStats.frame.count++;
					fnStats.frame.averageTimeMS += frameTimeBuffer[i];
					break;
					case FN_ID.update:
					fnStats.update.count++;
					fnStats.update.averageTimeMS += frameTimeBuffer[i];
					break;
					case FN_ID.draw:
					fnStats.draw.count++;
					fnStats.draw.averageTimeMS += frameTimeBuffer[i];
					break;
					case FN_ID.updateParticles:
					fnStats.updateParticles.count++;
					fnStats.updateParticles.averageTimeMS += frameTimeBuffer[i];
					break;
					case FN_ID.sortParticles:
					fnStats.sortParticles.count++;
					fnStats.sortParticles.averageTimeMS += frameTimeBuffer[i];
					break;
					case FN_ID.updateVertexBuffer:
					fnStats.updateVertexBuffer.count++;
					fnStats.updateVertexBuffer.averageTimeMS += frameTimeBuffer[i];
					break;
				}
			}
			fnStats.frame.averageTimeMS /= fnStats.frame.count;
			fnStats.update.averageTimeMS /= fnStats.update.count;
			fnStats.draw.averageTimeMS /= fnStats.draw.count;
			fnStats.updateParticles.averageTimeMS /= fnStats.updateParticles.count;
			fnStats.sortParticles.averageTimeMS /= fnStats.sortParticles.count;
			fnStats.updateVertexBuffer.averageTimeMS /= fnStats.updateVertexBuffer.count;
			cb(null, fnStats);
		}
		
		var frameWrapped = sess.demo.Profile.WrapMethod(
			sess.demo.Scene.prototype.frame, FN_ID.frame ,sharedSettings,
			methodCalledBuffer, frameTimeBuffer, onFinish);
		sess.demo.Scene.prototype.frame = frameWrapped.method;

		var updateWrapped = sess.demo.Profile.WrapMethod(
			sess.demo.Scene.prototype.update, FN_ID.update, sharedSettings,
			methodCalledBuffer, frameTimeBuffer, onFinish);
		sess.demo.Scene.prototype.update = updateWrapped.method;

		var drawWrapped = sess.demo.Profile.WrapMethod(
			sess.demo.Scene.prototype.draw, FN_ID.draw, sharedSettings,
			methodCalledBuffer, frameTimeBuffer, onFinish);
		sess.demo.Scene.prototype.draw = drawWrapped.method;

		var updateParticlesWrapped = sess.demo.Profile.WrapMethod(
			sess.demo.Scene.prototype.updateParticles, FN_ID.updateParticles, sharedSettings,
			methodCalledBuffer, frameTimeBuffer, onFinish);
		sess.demo.Scene.prototype.updateParticles = updateParticlesWrapped.method;

		var sortParticlesWrapped = sess.demo.Profile.WrapMethod(
			sess.demo.Scene.prototype.sortParticles, FN_ID.sortParticles, sharedSettings,
			methodCalledBuffer, frameTimeBuffer, onFinish);
		sess.demo.Scene.prototype.sortParticles = sortParticlesWrapped.method;

		var updateVertexBufferWrapped = sess.demo.Profile.WrapMethod(
			sess.demo.Scene.prototype.updateVertexBuffer, FN_ID.updateVertexBuffer, sharedSettings,
			methodCalledBuffer, frameTimeBuffer, onFinish);
		sess.demo.Scene.prototype.updateVertexBuffer = updateVertexBufferWrapped.method;
	}, function (err, result) {
		console.log(err, result);
	});
};