var Demo = (function () {

	// IFFE to avoid leakage of globals because EWW GLOBALS GROSS
	var canvas = document.getElementById('gl-surface');
	var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
	if (!gl) {
		alert('Cannot obtain GL context - abortinng demo');
		return;
	}

	var Scene = new sess.demo.Scene(gl, 300);
	Scene.handleResize(window.innerWidth, window.innerHeight);
	async.parallel(
		[
			function (callback) {
				Scene.loadParticleShader('./glsl/particle_shader.vert', './glsl/particle_shader.frag', callback);
			},
			function (callback) {
				Scene.loadTexture('./assets/gradient.png', callback);
			}
		],
		function (err, results) {
			if (err) {
				alert('Could not start demo: ' + err);
				return;
			}

			Scene.setupViewProjMatrices(
				// Position
				vec3.fromValues(15, 0, 0),
				// LookAt
				vec3.fromValues(0, 0, 0),
				// Up
				vec3.fromValues(0, 1, 0),
				// fovy
				glMatrix.toRadian(90)
			);			

			Scene.loop();
		}
	);
	
	window.addEventListener('resize', function () {
		Scene.handleResize(window.innerWidth, window.innerHeight);
	});

	return Scene;
})();

var ProfileTest = (function () {
	return 'Not yet implemented!';
})();