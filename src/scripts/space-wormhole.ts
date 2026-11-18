import * as THREE from "three";

const tunnelVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const tunnelFragment = /* glsl */ `
precision highp float;

uniform float uTime;
uniform float uWarp;
uniform vec2 uPointer;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amp * noise(p);
    p *= 2.05;
    amp *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = (vUv - 0.5) * 2.0;
  uv -= uPointer * 0.08;

  float dist = max(length(uv), 0.001);
  float angle = atan(uv.y, uv.x);

  float travel = uTime * 0.45 + uWarp * 2.2;
  float radial = 1.4 / dist + travel;
  vec2 polar = vec2(angle * 2.0 / 3.14159265, radial);

  float n1 = fbm(polar * vec2(3.0, 1.5) + vec2(0.0, -travel * 0.4));
  float n2 = fbm(polar * vec2(6.0, 2.5) + vec2(n1 * 1.4, -travel * 0.9));

  vec3 deep = vec3(0.01, 0.015, 0.045);
  vec3 indigo = vec3(0.16, 0.24, 0.58);
  vec3 gold = vec3(0.85, 0.63, 0.24);
  vec3 violet = vec3(0.55, 0.22, 0.78);

  vec3 nebulaColor = mix(indigo, violet, uWarp * 0.75 + n1 * 0.35);
  vec3 col = mix(deep, nebulaColor, smoothstep(0.25, 0.85, n2));
  col += gold * smoothstep(0.68, 0.96, n1 * n2) * (0.45 + uWarp * 0.8);

  // Subtle core glow and outer vignette
  float core = smoothstep(0.45, 0.02, dist) * (0.25 + uWarp * 0.9);
  col += mix(vec3(0.35, 0.55, 1.0), vec3(1.0, 0.85, 0.6), uWarp) * core;
  col *= smoothstep(1.65, 0.2, dist);

  gl_FragColor = vec4(col, 1.0);
}
`;

export function mountSpaceWormhole(): void {
  const canvas = document.querySelector<HTMLCanvasElement>("[data-space-wormhole]");
  if (!canvas) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion) return;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
  } catch {
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x03050b, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);
  camera.position.z = 100;

  // Fullscreen procedural nebula/wormhole shader quad
  const quadGeo = new THREE.PlaneGeometry(2, 2);
  const tunnelUniforms = {
    uTime: { value: 0 },
    uWarp: { value: 0 },
    uPointer: { value: new THREE.Vector2(0, 0) },
  };
  const quadMat = new THREE.ShaderMaterial({
    uniforms: tunnelUniforms,
    vertexShader: tunnelVertex,
    fragmentShader: tunnelFragment,
    depthTest: false,
    depthWrite: false,
  });
  const bgScene = new THREE.Scene();
  const bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  bgScene.add(new THREE.Mesh(quadGeo, quadMat));

  // Procedural starfield
  const starCount = 500;
  const starPositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);
  const palette = [
    new THREE.Color(0xf4e6ca),
    new THREE.Color(0x8eb5ff),
    new THREE.Color(0xd9a13d),
    new THREE.Color(0xffffff),
  ];

  for (let i = 0; i < starCount; i++) {
    const i3 = i * 3;
    starPositions[i3] = (Math.random() - 0.5) * 900;
    starPositions[i3 + 1] = (Math.random() - 0.5) * 600;
    starPositions[i3 + 2] = -Math.random() * 1400;
    const c = palette[i % palette.length];
    starColors[i3] = c.r;
    starColors[i3 + 1] = c.g;
    starColors[i3 + 2] = c.b;
  }

  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  starGeo.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
  const starMat = new THREE.PointsMaterial({
    size: 2.2,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  scene.add(new THREE.Points(starGeo, starMat));

  const targetPointer = new THREE.Vector2();
  let warpTarget = 0;
  let rafId = 0;
  let last = performance.now();
  let disposed = false;

  const resize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
  };

  const onPointerMove = (e: PointerEvent) => {
    targetPointer.set(
      (e.clientX / Math.max(1, window.innerWidth) - 0.5) * 2,
      -(e.clientY / Math.max(1, window.innerHeight) - 0.5) * 2,
    );
  };

  const onWarp = () => {
    warpTarget = 1;
  };

  const animate = (now: number) => {
    if (disposed) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    tunnelUniforms.uTime.value += dt;
    tunnelUniforms.uWarp.value += (warpTarget - tunnelUniforms.uWarp.value) * Math.min(1, dt * 4);
    tunnelUniforms.uPointer.value.lerp(targetPointer, Math.min(1, dt * 4));

    const speed = 45 + tunnelUniforms.uWarp.value * 950;
    const pos = starGeo.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < starCount; i++) {
      let z = pos.getZ(i) + speed * dt;
      if (z > 100) z = -1400;
      pos.setZ(i, z);
    }
    pos.needsUpdate = true;

    camera.position.x = tunnelUniforms.uPointer.value.x * 16;
    camera.position.y = tunnelUniforms.uPointer.value.y * 10;
    camera.lookAt(0, 0, -400);

    renderer.autoClear = false;
    renderer.clear();
    renderer.render(bgScene, bgCamera);
    renderer.render(scene, camera);

    rafId = requestAnimationFrame(animate);
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(rafId);
    window.removeEventListener("resize", resize);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("shlongeeland:warp", onWarp);
    quadGeo.dispose();
    quadMat.dispose();
    starGeo.dispose();
    starMat.dispose();
    renderer.dispose();
  };

  resize();
  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("shlongeeland:warp", onWarp);
  window.addEventListener("pagehide", dispose, { once: true });
  rafId = requestAnimationFrame(animate);
}