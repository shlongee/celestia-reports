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
uniform vec3 uColorFog;
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

float fbm3(vec3 p, float detailWeight) {
  float value = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    float weight = (i >= 2) ? detailWeight : 1.0;
    value += amp * weight * noise3(p);
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

vec3 renderWormhole(vec2 uv, float swirlStrength) {
  float dist = max(length(uv), 0.0005);
  vec2 dir = uv / dist;
  vec2 swirled = rotate2D(dir, swirlStrength / (dist + 0.35));

  float travel = uTime * uSpeed + uWarp * 2.2;
  float radial = 1.35 / dist + travel;

  // Blur out fine octaves in the far center so the wormhole dissolves into mist
  float detailFade = smoothstep(0.06, 0.62, dist);

  float n1 = fbm3(vec3(swirled * 1.6, radial * 0.6 - travel * 0.24), detailFade);
  float n2 = fbm3(vec3(swirled * 3.0 + n1 * 0.5, radial * 1.1 - travel * 0.52), detailFade * 0.85);

  vec3 neb = mix(uColorBase, uColorWarp, uWarp * 0.72 + n1 * 0.38);
  vec3 col = mix(uColorDeep, neb, smoothstep(0.22, 0.84, n2 * uDensity));
  col += uColorAccent * smoothstep(0.56, 0.92, n1 * n2) * (0.48 + uWarp * 0.85) * detailFade;

  // Strong mysterious distance fog enveloping the deep throat of the wormhole
  float distanceFog = smoothstep(0.78, 0.04, dist);
  float deepMist = exp(-dist * 2.5);
  col = mix(col, uColorFog, clamp(distanceFog * 0.82 + deepMist * 0.32, 0.0, 0.96));

  // Subtle luminous veil at the mist horizon
  float veil = smoothstep(0.55, 0.08, dist) * smoothstep(0.0, 0.25, dist);
  col += mix(uColorWarp, uColorAccent, 0.35 + uWarp * 0.5) * veil * (0.18 + uWarp * 0.45);

  // Gentle side-margin illumination (stays visible behind the blog)
  col = mix(uColorDeep * 0.9 + uColorFog * 0.15, col, smoothstep(2.6, 0.25, dist));
  return col;
}

void main() {
  float minDim = max(min(uResolution.x, uResolution.y), 1.0);
  vec2 uv = (vUv - 0.5) * 2.0 * (uResolution / minDim);
  uv -= uPointer * 0.08;

  vec3 col = (vUv.x < uSplit)
    ? renderWormhole(uv, 0.0)
    : renderWormhole(uv, uSwirl);

  if (uSplit > 0.01 && uSplit < 0.99 && abs(vUv.x - uSplit) < 0.002) {
    col = vec3(1.0, 0.85, 0.4);
  }

  gl_FragColor = vec4(col, 1.0);
}