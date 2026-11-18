precision highp float;

uniform sampler2D uTexture;
varying vec2 vPUv;
varying vec2 vUv;

void main() {
  vec4 color = texture2D(uTexture, vPUv);
  float grey = color.r * 0.21 + color.g * 0.71 + color.b * 0.07;

  float border = 0.3;
  float radius = 0.5;
  float dist = radius - distance(vUv, vec2(0.5));
  float alpha = smoothstep(0.0, border, dist);

  gl_FragColor = vec4(vec3(grey), alpha);
}