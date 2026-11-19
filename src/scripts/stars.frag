precision highp float;

uniform float uWarp;

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
  vec2 druv = rotate2D(uv, vSeed * 3.14159 + 0.78539); // 45-deg diagonal rays

  float core = exp(-d * d * 32.0);
  float halo = exp(-d * 4.8) * 0.62;

  float mainSpikes =
    (exp(-abs(ruv.y) * 24.0) * exp(-abs(ruv.x) * 5.2) +
     exp(-abs(ruv.x) * 24.0) * exp(-abs(ruv.y) * 5.2)) * 0.6;

  float isHero = step(0.84, fract(vSeed * 13.7));
  float diagSpikes =
    (exp(-abs(druv.y) * 30.0) * exp(-abs(druv.x) * 8.0) +
     exp(-abs(druv.x) * 30.0) * exp(-abs(druv.y) * 8.0)) * 0.42 * isHero;

  float intensity = (core * 1.25 + halo + mainSpikes + diagSpikes) * vTwinkle;
  intensity *= smoothstep(0.5, 0.16, d);

  float fog = smoothstep(1420.0, 260.0, vDepth);
  vec3 starCol = mix(vColor, vec3(1.0), core * 0.65);
  float alpha = clamp(intensity * fog * (0.95 + uWarp * 0.45), 0.0, 1.0);

  gl_FragColor = vec4(starCol, alpha);
}