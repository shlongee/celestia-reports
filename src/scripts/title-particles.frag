precision highp float;

uniform sampler2D uTexture;
varying vec2 vPUv;
varying vec2 vUv;
varying float vShimmer;

void main() {
  float grey = texture2D(uTexture, vPUv).r;
  float d = distance(vUv, vec2(0.5)) * 2.0;
  if (d > 1.0) discard;

  float core = exp(-d * d * 6.5);
  float halo = exp(-d * 2.4) * 0.58;
  float alpha = (core + halo) * smoothstep(1.0, 0.35, d) * grey * vShimmer;
  if (alpha < 0.015) discard;

  vec3 tint = mix(vec3(0.35, 0.86, 1.0), vec3(0.95, 0.99, 1.0), clamp(core * 1.1, 0.0, 1.0));
  gl_FragColor = vec4(tint * alpha, alpha);
}