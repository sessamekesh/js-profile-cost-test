precision mediump float;

varying vec2 fUV;
varying vec4 fColor;

uniform sampler2D uSampler;

void main() {
	gl_FragColor = texture2D(uSampler, fUV) * fColor;
}