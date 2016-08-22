precision mediump float;

// Grumble grumble this is shit vertex packing...
attribute vec3 vPos;
attribute vec2 vUV;
attribute vec4 vColor;

varying vec2 fUV;
varying vec4 fColor;

uniform mat4 uModel;
uniform mat4 uViewProj;

void main() {
	fUV = vUV;
	fColor = vColor;
	gl_Position = uViewProj * uModel * vec4(vPos, 1.0);
}