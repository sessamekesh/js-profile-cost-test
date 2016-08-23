# js-profile-cost-test
Test of doing JavaScript profiling on a WebGL demo. Roughly measure performance impact on varying frequency function calls. Intentionally CPU-heavy particle effect code.

## Running
Everything is front-end Javascript. Requirements:
* Web browser with developer console
* WebGL (included in all modern browsers, see [http://webglreport.com/](http://webglreport.com/))
* Some way to host static files on a webserver

My favorite way to run things is with `python -m SimpleHTTPServer`, run that from the root directory of this project and direct your browser to localhost:8000 (or whatever Python tells you in your CLI).

Another easy way is with `http-server` from the root directory of this project. Http-server can be installed via npm: `npm install -g http-server`

[Screenshot](https://github.com/sessamekesh/js-profile-cost-test/blob/master/assets/screenshot.png)

## Testing
Using the developer console, there are some commands that are exposed. This is very rough right now, as it is just a proof of concept. Each function runs the desired test group for a scene with 200 particles, 2000 particles, and 20000 particles.

`sess.demo.Profile.RunXXXXXXXXX(maxTimeElapsed, maxBufferSize, scene)`: maxTimeElapsed is the maximum sampling time in milliseconds that the tests will run. maxBufferSize is the number of elements that will be allocated for profiling (40 bytes per buffer element - one Uint8, one Float32). Finally, scene is the actual sess.demo.Scene object that is being profiled - use `Demo`.

* RunFrameOnlyTests: Only profile framerate
* RunFrameAndHighLevelTests: Profile framerate and functions that are called once per frame
* RunFrameAndLowLevelTests: Profile framerate, functions that are called once per frame, and functions that are called once per particle per frame.

## Other Things
`Demo` is the global object for the demo. The `setNumParticles` method will change the number of particles, and the `particleWidth`, `particleHeight`, and `ballRadius` properties may also change at runtime, updated the next frame.

## My results
The idea of this project was to test the viability of wrapping functions in timing functions, then recording the time difference (before/after) to a pre-allocated memory buffer, in a high-speed JavaScript application. From a cursory glance, it seems viable for *rough* regression testing and simple analysis of where time is spent. If a function call takes on the orders of hundreds of microseconds to execute, the performance hit of measuring time elapsed is pretty negligible. Rapidly executed functions, for instance ones like `sess.demo.Scene.prototype.compareParticleDistances`, have an extremely large performance impact _to calling functions_ when measured, but measuring the time those functions themselves took to execute yields fairly accurate results.