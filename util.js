var sess = sess || {};
sess.demo = sess.demo || {};

sess.demo.RandomInRange = function RandomInRange(min, max) {
	return Math.random() * (max - min) + min;
};

sess.demo.LoadShaderAsync = function loadShaderAsync(shaderURL, callback) {
	var req = new XMLHttpRequest();
	req.open('GET', shaderURL, true);
	req.onload = function () {
		if (req.status < 200 || req.status >= 300) {
			callback('Could not load ' + shaderURL);
		} else {
			callback(null, req.responseText);
		}
	};
	req.send();
};

sess.demo.LoadImage = function LoadImage(url, callback) {
	var image = new Image();
	image.onload = function () {
		callback(null, image);
	};
	image.src = url;
};