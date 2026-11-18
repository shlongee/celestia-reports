precision highp float;

uniform float uWarp;
uniform vec3 uFogColor;

varying vec3 vColor;
varying float vSeed;
varying float vDepth;
varying float vTwinkle;

vec2 rotate2D(vec2 v, float a) {
  float s = sin(a);
  float c = cos(a);
  return vec2(v.x * c - v.y * s, v.x * s + v.y * c);
}

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;

  vec2 ruv = rotate2D(uv, vSeed * 3.14159);

  float core = exp(-d * d * 52.0);
  float halo = exp(-d * 6.8) * 0.42;
  float spikeX = exp(-abs(ruv.y) * 26.0) * exp(-abs(ruv.x) * 6.5);
  float spikeY = exp(-abs(ruv.x) * 26.0) * exp(-abs(ruv.y) * 6.5);
  float spikes = (spikeX + spikeY) * 0.48;

  float intensity = (core + halo + spikes) * vTwinkle;
  intensity *= smoothstep(0.5, 0.2, d);

  float fog = smoothstep(1380.0, 220.0, vDepth);
  vec3 starCol = mix(uFogColor, vColor + vec3(core * 0.55), fog);
  float alpha = clamp(intensity * fog * (0.85 + uWarp * 0.35), 0.0, 1.0);

  gl_FragColor = vec4(starCol, alpha);
}