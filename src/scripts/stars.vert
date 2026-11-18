precision highp float;

attribute vec3 position;
attribute vec3 color;
attribute float aSize;
attribute float aSeed;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float uPixelRatio;
uniform float uTime;
uniform float uWarp;

varying vec3 vColor;
varying float vSeed;
varying float vDepth;
varying float vTwinkle;

void main() {
  vColor = color;
  vSeed = aSeed;

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  float depth = max(-mvPosition.z, 1.0);
  vDepth = depth;
  vTwinkle = 0.7 + 0.3 * sin(uTime * (1.6 + fract(aSeed) * 2.6) + aSeed * 6.2831);

  float size = aSize * (1.0 + uWarp * 0.9) * uPixelRatio * (360.0 / depth);
  gl_PointSize = clamp(size, 2.5, 46.0 * uPixelRatio);
  gl_Position = projectionMatrix * mvPosition;
}