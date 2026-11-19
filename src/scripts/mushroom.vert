precision highp float;

attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;

varying vec3 vNormalView;
varying vec3 vViewPos;
varying vec2 vUv;
varying float vDepth;

void main() {
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  vViewPos = -mvPos.xyz;
  vNormalView = normalize(normalMatrix * normal);
  vUv = uv;
  vDepth = max(-mvPos.z, 1.0);
  gl_Position = projectionMatrix * mvPos;
}