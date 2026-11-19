precision highp float;

uniform vec3 uGlowColor;
uniform vec3 uFogColor;
uniform float uTime;
uniform float uHover;
uniform float uIsCap;

varying vec3 vNormalView;
varying vec3 vViewPos;
varying vec2 vUv;
varying float vDepth;

void main() {
  vec3 N = normalize(vNormalView);
  vec3 V = normalize(vViewPos);

  float ndotv = clamp(abs(dot(N, V)), 0.0, 1.0);
  float fresnel = pow(1.0 - ndotv, 2.0);
  float pulse = 0.85 + 0.15 * sin(uTime * 2.4 + vUv.x * 6.2831);

  // Delicate glowing spots on the cap
  float spots = 0.0;
  if (uIsCap > 0.5) {
    vec2 cell = fract(vUv * vec2(7.0, 4.0)) - 0.5;
    float r = length(cell);
    spots = smoothstep(0.24, 0.08, r) * smoothstep(0.15, 0.55, vUv.y);
  }

  vec3 innerTint = mix(uFogColor * 0.7, uGlowColor * 0.45, 0.45);
  vec3 rimTint = mix(uGlowColor, vec3(0.95, 1.0, 1.0), 0.35 + uHover * 0.35);

  vec3 col = mix(innerTint, rimTint, fresnel * 0.9 + spots * 0.65) * pulse;
  col += uGlowColor * (0.25 + uHover * 0.55) * (fresnel + spots * 0.4);

  // Match the exact distance fog of the wormhole & stars
  float fog = smoothstep(1380.0, 220.0, vDepth);
  col = mix(uFogColor, col, fog);

  float alpha = clamp((0.26 + fresnel * 0.74 + spots * 0.45 + uHover * 0.25) * fog, 0.0, 0.96);
  gl_FragColor = vec4(col, alpha);
}