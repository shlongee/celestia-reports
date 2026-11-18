precision highp float;

uniform float uTime;
uniform float uWarp;
uniform float uSpeed;
uniform float uSwirl;
uniform float uDensity;
uniform float uSplit;
uniform vec2 uPointer;
uniform vec2 uResolution;

uniform vec3 uColorDeep;
uniform vec3 uColorBase;
uniform vec3 uColorWarp;
uniform vec3 uColorAccent;

varying vec2 vUv;

float hash3(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise3(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(
      mix(hash3(i + vec3(0.0, 0.0, 0.0)), hash3(i + vec3(1.0, 0.0, 0.0)), f.x),
      mix(hash3(i + vec3(0.0, 1.0, 0.0)), hash3(i + vec3(1.0, 1.0, 0.0)), f.x),
      f.y
    ),
    mix(
      mix(hash3(i + vec3(0.0, 0.0, 1.0)), hash3(i + vec3(1.0, 0.0, 1.0)), f.x),
      mix(hash3(i + vec3(0.0, 1.0, 1.0)), hash3(i + vec3(1.0, 1.0, 1.0)), f.x),
      f.y
    ),
    f.z
  );
}

float fbm3(vec3 p) {
  float value = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amp * noise3(p);
    p *= 2.03;
    amp *= 0.5;
  }
  return value;
}

vec2 rotate2D(vec2 v, float a) {
  float s = sin(a);
  float c = cos(a);
  return vec2(v.x * c - v.y * s, v.x * s + v.y * c);
}

vec3 renderWormhole(vec2 uv, float swirlStrength, float withCore) {
  float dist = max(length(uv), 0.0005);
  // Seamless unit circle direction (no atan branch cut!)
  vec2 dir = uv / dist;
  vec2 swirled = rotate2D(dir, swirlStrength / (dist + 0.35));

  float travel = uTime * uSpeed + uWarp * 2.2;
  float radial = 1.4 / dist + travel;

  float n1 = fbm3(vec3(swirled * 1.65, radial * 0.65 - travel * 0.25));
  float n2 = fbm3(vec3(swirled * 3.1 + n1 * 0.55, radial * 1.15 - travel * 0.55));

  vec3 neb = mix(uColorBase, uColorWarp, uWarp * 0.75 + n1 * 0.35);
  vec3 col = mix(uColorDeep, neb, smoothstep(0.24, 0.84, n2 * uDensity));
  col += uColorAccent * smoothstep(0.55, 0.92, n1 * n2) * (0.5 + uWarp * 0.85);

  if (withCore > 0.5) {
    float core = smoothstep(0.45, 0.02, dist) * (0.28 + uWarp * 0.9);
    col += mix(vec3(0.35, 0.55, 1.0), vec3(1.0, 0.85, 0.6), uWarp) * core;
  }

  // Keep side margins glowing gently instead of crushing to black on wide screens
  col *= mix(0.45, 1.0, smoothstep(2.4, 0.25, dist));
  return col;
}

void main() {
  // Exact 1:1 aspect ratio regardless of viewport width/height
  float minDim = max(min(uResolution.x, uResolution.y), 1.0);
  vec2 uv = (vUv - 0.5) * 2.0 * (uResolution / minDim);
  uv -= uPointer * 0.08;

  vec3 col = (vUv.x < uSplit)
    ? renderWormhole(uv, 0.0, 0.0)
    : renderWormhole(uv, uSwirl, 1.0);

  if (uSplit > 0.01 && uSplit < 0.99 && abs(vUv.x - uSplit) < 0.002) {
    col = vec3(1.0, 0.85, 0.4);
  }

  gl_FragColor = vec4(col, 1.0);
}