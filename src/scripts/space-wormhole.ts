import * as THREE from "three";
import tunnelVertex from "./wormhole.vert?raw";
import tunnelFragment from "./wormhole.frag?raw";
import starsVertex from "./stars.vert?raw";
import starsFragment from "./stars.frag?raw";

interface WormholePalette {
  deep: string;
  fog: string;
  base: string;
  warp: string;
  accent: string;
}

const DARK_PALETTES: WormholePalette[] = [
  { deep: "#03040b", fog: "#0b122b", base: "#23378c", warp: "#7b32bd", accent: "#d9a13d" },
  { deep: "#020808", fog: "#082221", base: "#0f5951", warp: "#2a8c82", accent: "#9bf2ca" },
  { deep: "#090206", fog: "#240a18", base: "#6e173a", warp: "#b52d52", accent: "#ffba70" },
  { deep: "#05020b", fog: "#1b0d33", base: "#4d1f91", warp: "#9e3ee0", accent: "#88e6ff" },
  { deep: "#070403", fog: "#211209", base: "#733912", warp: "#b8581d", accent: "#ffe184" },
];

const LIGHT_PALETTES: WormholePalette[] = [
  { deep: "#1c203b", fog: "#6c6396", base: "#4d599e", warp: "#9d7cc2", accent: "#ffd791" },
  { deep: "#172930", fog: "#658f96", base: "#32707a", warp: "#68a8a4", accent: "#ffe8ad" },
  { deep: "#2b1c30", fog: "#99708e", base: "#6e3d69", warp: "#b86b92", accent: "#ffdcb0" },
  { deep: "#1d2438", fog: "#7987b8", base: "#425ca8", warp: "#8295db", accent: "#ffdf9e" },
  { deep: "#2a201b", fog: "#9e8168", base: "#7a5338", warp: "#bf885a", accent: "#fff0ba" },
];

let mounted = false;

export function mountSpaceWormhole(): void {
  const canvas = document.querySelector<HTMLCanvasElement>("[data-space-wormhole]");
  if (!canvas) return;
  mounted = true;

  const isDarkTheme = () => document.documentElement.classList.contains("dark");
  let darkIndex = 0;
  let lightIndex = 0;

  const getInitialPalette = () =>
    isDarkTheme() ? DARK_PALETTES[darkIndex] : LIGHT_PALETTES[lightIndex];
  
  const initial = getInitialPalette();

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: "high-performance"
    });
  } catch {
    return;
  }

  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0x03050b, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);
  camera.position.z = 100;

  const tunnelUniforms = {
    uTime: { value: 0 },
    uWarp: { value: 0 },
    uSpeed: { value: 0.42 },
    uSwirl: { value: 2.0 },
    uDensity: { value: 1.05 },
    uSplit: { value: 0.0 },
    uPointer: { value: new THREE.Vector2(0, 0) },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uColorDeep: { value: new THREE.Color(initial.deep) },
    uColorFog: { value: new THREE.Color(initial.fog) },
    uColorBase: { value: new THREE.Color(initial.base) },
    uColorWarp: { value: new THREE.Color(initial.warp) },
    uColorAccent: { value: new THREE.Color(initial.accent) },
  };

  const targetColors = {
    deep: new THREE.Color(initial.deep),
    fog: new THREE.Color(initial.fog),
    base: new THREE.Color(initial.base),
    warp: new THREE.Color(initial.warp),
    accent: new THREE.Color(initial.accent),
  };

  const applyTargetPalette = (palette: WormholePalette) => {
    targetColors.deep.set(palette.deep);
    targetColors.fog.set(palette.fog);
    targetColors.base.set(palette.base);
    targetColors.warp.set(palette.warp);
    targetColors.accent.set(palette.accent);
  };

  const quadGeo = new THREE.PlaneGeometry(2, 2);
  const quadMat = new THREE.RawShaderMaterial({
    uniforms: tunnelUniforms,
    vertexShader: tunnelVertex,
    fragmentShader: tunnelFragment,
    depthTest: false,
    depthWrite: false,
  });
  const bgScene = new THREE.Scene();
  const bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  bgScene.add(new THREE.Mesh(quadGeo, quadMat));

  // Procedural twinkling stars
  const starCount = 460;
  const starPositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);
  const starSizes = new Float32Array(starCount);
  const starSeeds = new Float32Array(starCount);
  const starPalette = [
    new THREE.Color("#ffffff"),
    new THREE.Color("#fff1d6"),
    new THREE.Color("#ffd285"),
    new THREE.Color('#d5b8ff'),
    new THREE.Color("#9ec2ff"),
  ];

  for (let i = 0; i < starCount; i++) {
    const i3 = i * 3;
    starPositions[i3] = (Math.random() - 0.5) * 960;
    starPositions[i3 + 1] = (Math.random() - 0.5) * 650;
    starPositions[i3 + 2] = -Math.random() * 1400;
    const c = starPalette[i % starPalette.length];
    starColors[i3] = c.r;
    starColors[i3 + 1] = c.g;
    starColors[i3 + 2] = c.b;
    starSizes[i] = 1.6 + Math.random() * 2.8;
    starSeeds[i] = Math.random();
  }

  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  starGeo.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
  starGeo.setAttribute("aSize", new THREE.BufferAttribute(starSizes, 1));
  starGeo.setAttribute("aSeed", new THREE.BufferAttribute(starSeeds, 1));

  const starUniforms = {
    uPixelRatio: { value: pixelRatio },
    uTime: tunnelUniforms.uTime,
    uWarp: tunnelUniforms.uWarp,
    uFogColor: tunnelUniforms.uColorFog,
  };

  const starMat = new THREE.RawShaderMaterial({
    uniforms: starUniforms,
    vertexShader: starsVertex,
    fragmentShader: starsFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  scene.add(new THREE.Points(starGeo, starMat));

  const targetPointer = new THREE.Vector2();
  let warpTarget = 0;
  let overrideWarp: number | null = null;
  let paused = false;
  let rafId = 0;
  let last = performance.now();
  let disposed = false;

  const resize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const pr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pr);
    renderer.setSize(width, height, false);
    tunnelUniforms.uResolution.value.set(width, height);
    starUniforms.uPixelRatio.value = pr;
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
  };

  const isFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const onPointerMove = (e: PointerEvent) => {
    if (!isFinePointer) return;
    targetPointer.set(
      (e.clientX / Math.max(1, window.innerWidth) - 0.5) * 2,
      -(e.clientY / Math.max(1, window.innerHeight) - 0.5) * 2,
    );
  };

  const onWarp = () => {
    overrideWarp = null;
    warpTarget = 1;
  };

  const onPageLoad = () => {
    overrideWarp = null;
    warpTarget = 0;
  };

  const onThemeSync = () => {
    const palette = isDarkTheme() ? DARK_PALETTES[darkIndex] : LIGHT_PALETTES[lightIndex];
    applyTargetPalette(palette);
  };

  const onShuffle = () => {
    if (isDarkTheme()) {
      darkIndex = (darkIndex + 1) % DARK_PALETTES.length;
      applyTargetPalette(DARK_PALETTES[darkIndex]);
    } else {
      lightIndex = (lightIndex + 1) % LIGHT_PALETTES.length;
      applyTargetPalette(LIGHT_PALETTES[lightIndex]);
    }
  };

  const animate = (now: number) => {
    if (disposed) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (!paused && !reducedMotion) {
      tunnelUniforms.uTime.value += dt;
    }

    // Smooth color transitions for theme toggle and shuffle
    const colorRate = Math.min(1, dt * 2.4);
    tunnelUniforms.uColorDeep.value.lerp(targetColors.deep, colorRate);
    tunnelUniforms.uColorFog.value.lerp(targetColors.fog, colorRate);
    tunnelUniforms.uColorBase.value.lerp(targetColors.base, colorRate);
    tunnelUniforms.uColorWarp.value.lerp(targetColors.warp, colorRate);
    tunnelUniforms.uColorAccent.value.lerp(targetColors.accent, colorRate);

    const activeWarp = overrideWarp ?? warpTarget;
    tunnelUniforms.uWarp.value += (activeWarp - tunnelUniforms.uWarp.value) * Math.min(1, dt * 5);
    tunnelUniforms.uPointer.value.lerp(targetPointer, Math.min(1, dt * 4)); 

    if (!paused && !reducedMotion) {
      const speed = 42 + tunnelUniforms.uWarp.value * 950;
      const pos = starGeo.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < starCount; i++) {
        let z = pos.getZ(i) + speed * dt;
        if (z > 100) z = -1400;
        pos.setZ(i, z);
      }
      pos.needsUpdate = true;
    }

    camera.position.x = tunnelUniforms.uPointer.value.x * 16;
    camera.position.y = tunnelUniforms.uPointer.value.y * 10;
    camera.lookAt(0, 0, -400);

    renderer.autoClear = false;
    renderer.clear();
    renderer.render(bgScene, bgCamera);
    renderer.render(scene, camera);

    if (!reducedMotion) {
      rafId = requestAnimationFrame(animate);
    }
  };

  // DEV SHADER TUNER (stripped completely in `npm run build`)
  let devHud: { dispose: () => void } | null = null;
  if (import.meta.env.DEV) {
    devHud = createDevHud(tunnelUniforms, {
      onWarpChange: (v) => { overrideWarp = v; },
      onPauseToggle: (isPaused) => { paused = isPaused; },
    });
    
    if (import.meta.hot) {
      import.meta.hot.accept(
        ["./wormhole.vert?raw", "./wormhole.frag?raw", "./stars.vert?raw", "./stars.frag?raw"],
        ([wVert, wFrag, sVert, sFrag]) => {
          if (wVert) quadMat.vertexShader = wVert.default;
          if (wFrag) quadMat.fragmentShader = wFrag.default;
          if (wVert || wFrag) quadMat.needsUpdate = true;

          if (sVert) starMat.vertexShader = sVert.default;
          if (sFrag) starMat.fragmentShader = sFrag.default;
          if (sVert || sFrag) starMat.needsUpdate = true;
        },
      );
    }
  }

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(rafId);
    window.removeEventListener("resize", resize);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("shlongeeland:warp", onWarp);
    devHud?.dispose();
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
  window.addEventListener("shlongeeland:theme", onThemeSync);
  window.addEventListener("shlongeeland:shuffle", onShuffle);
  document.addEventListener("astro:page-load", onPageLoad);

  if (reducedMotion) {
    requestAnimationFrame(animate);
  } else {
    rafId = requestAnimationFrame(animate);
  }
}

const css = String.raw;

function createDevHud(
  uniforms: {
    uSpeed: { value: number };
    uSwirl: { value: number };
    uDensity: { value: number };
    uSplit: { value: number };
    uColorDeep: { value: THREE.Color };
    uColorBase: { value: THREE.Color };
    uColorWarp: { value: THREE.Color };
    uColorAccent: { value: THREE.Color };
  },
  callbacks: {
    onWarpChange: (value: number | null) => void;
    onPauseToggle: (paused: boolean) => void;
  },
): { dispose: () => void } {
  const STORAGE_KEY = "shlongeeland-devhud-state";
  const controller = new AbortController();
  const { signal } = controller;

  type HudState = { x: number; y: number; collapsed: boolean };
  const loadState = (): HudState => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { x: 12, y: 12, collapsed: false };
      const parsed = JSON.parse(raw) as Partial<HudState>;
      return {
        x: typeof parsed.x === "number" ? parsed.x : 12,
        y: typeof parsed.y === "number" ? parsed.y : 12,
        collapsed: Boolean(parsed.collapsed),
      };
    } catch {
      return { x: 12, y: 12, collapsed: false };
    }
  };

  const state = loadState();
  const saveState = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage errors in private/restricted contexts
    }
  };

  const panel = document.createElement("aside");
  panel.style.cssText = css`
    position: fixed;
    top: ${state.y}px;
    left: ${state.x}px;
    z-index: 9999;
    width: 260px;
    border-radius: 10px;
    background: rgba(10, 12, 20, 0.88);
    color: #eee;
    border: 1px solid rgba(255, 255, 255, 0.18);
    backdrop-filter: blur(8px);
    font: 12px/1.4 monospace;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
    overflow: hidden;
  `;

  // --- Draggable Header ---
  const header = document.createElement("div");
  header.style.cssText = css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    cursor: grab;
    user-select: none;
    touch-action: none;
    background: rgba(255, 255, 255, 0.05);
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  `;

  const title = document.createElement("span");
  title.textContent = "Shader HUD";
  title.style.cssText = css`
    font-weight: 700;
    letter-spacing: 0.04em;
    color: #f4e6ca;
  `;

  const minimizeBtn = document.createElement("button");
  minimizeBtn.type = "button";
  minimizeBtn.setAttribute("aria-label", "Toggle shader HUD");
  minimizeBtn.style.cssText = css`
    width: 24px;
    height: 24px;
    padding: 0;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.08);
    color: #eee;
    font: 700 14px/1 monospace;
    cursor: pointer;
  `;

  header.append(title, minimizeBtn);

  // --- Collapsible Body ---
  const body = document.createElement("div");
  body.style.cssText = css`
    padding: 10px 12px 12px;
    display: grid;
    gap: 8px;
  `;

  const applyCollapsed = (collapsed: boolean) => {
    state.collapsed = collapsed;
    body.style.display = collapsed ? "none" : "grid";
    header.style.borderBottom = collapsed
      ? "none"
      : "1px solid rgba(255, 255, 255, 0.12)";
    minimizeBtn.textContent = collapsed ? "+" : "−";
    minimizeBtn.setAttribute("aria-expanded", String(!collapsed));
  };

  const clampPosition = () => {
    const margin = 8;
    const rect = panel.getBoundingClientRect();
    const maxX = Math.max(margin, window.innerWidth - rect.width - margin);
    const maxY = Math.max(margin, window.innerHeight - rect.height - margin);
    state.x = Math.min(Math.max(margin, state.x), maxX);
    state.y = Math.min(Math.max(margin, state.y), maxY);
    panel.style.left = `${state.x}px`;
    panel.style.top = `${state.y}px`;
  };

  minimizeBtn.addEventListener(
    "click",
    () => {
      applyCollapsed(!state.collapsed);
      clampPosition();
      saveState();
    },
    { signal },
  );

  // --- Dragging via Pointer Events ---
  let dragStart: { pointerX: number; pointerY: number; originX: number; originY: number } | null = null;

  header.addEventListener(
    "pointerdown",
    (e: PointerEvent) => {
      if ((e.target as HTMLElement | null)?.closest("button")) return;
      if (e.button !== 0) return;
      e.stopPropagation();
      header.setPointerCapture(e.pointerId);
      header.style.cursor = "grabbing";
      dragStart = {
        pointerX: e.clientX,
        pointerY: e.clientY,
        originX: state.x,
        originY: state.y,
      };
    },
    { signal },
  );

  header.addEventListener(
    "pointermove",
    (e: PointerEvent) => {
      if (!dragStart) return;
      e.stopPropagation();
      state.x = dragStart.originX + (e.clientX - dragStart.pointerX);
      state.y = dragStart.originY + (e.clientY - dragStart.pointerY);
      clampPosition();
    },
    { signal },
  );

  const endDrag = (e: PointerEvent) => {
    if (!dragStart) return;
    dragStart = null;
    header.style.cursor = "grab";
    if (header.hasPointerCapture(e.pointerId)) {
      header.releasePointerCapture(e.pointerId);
    }
    saveState();
  };

  header.addEventListener("pointerup", endDrag, { signal });
  header.addEventListener("pointercancel", endDrag, { signal });
  window.addEventListener(
    "resize",
    () => {
      clampPosition();
      saveState();
    },
    { passive: true, signal },
  );

  // --- Controls ---
  const slider = (
    label: string,
    min: number,
    max: number,
    step: number,
    val: number,
    onInput: (v: number) => void,
  ) => {
    const row = document.createElement("label");
    row.style.cssText = css`
      display: grid;
      gap: 2px;
    `;
    const readout = document.createElement("span");
    readout.textContent = `${label}: ${val.toFixed(2)}`;
    const input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(val);
    input.addEventListener(
      "input",
      () => {
        const v = parseFloat(input.value);
        readout.textContent = `${label}: ${v.toFixed(2)}`;
        onInput(v);
      },
      { signal },
    );
    row.append(readout, input);
    return row;
  };

  const colorInput = (label: string, color: THREE.Color) => {
    const row = document.createElement("label");
    row.style.cssText = css`
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    const input = document.createElement("input");
    input.type = "color";
    input.value = `#${color.getHexString()}`;
    input.addEventListener("input", () => color.set(input.value), { signal });
    row.append(label, input);
    return row;
  };

  let paused = false;
  const btnRow = document.createElement("div");
  btnRow.style.cssText = css`
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 2px;
  `;

  const pauseBtn = document.createElement("button");
  pauseBtn.textContent = "Pause";
  pauseBtn.type = "button";
  pauseBtn.addEventListener(
    "click",
    () => {
      paused = !paused;
      pauseBtn.textContent = paused ? "Resume" : "Pause";
      callbacks.onPauseToggle(paused);
    },
    { signal },
  );

  let uiHidden = false;
  const hideUiBtn = document.createElement("button");
  hideUiBtn.textContent = "Hide Title";
  hideUiBtn.type = "button";
  hideUiBtn.addEventListener(
    "click",
    () => {
      uiHidden = !uiHidden;
      hideUiBtn.textContent = uiHidden ? "Show Title" : "Hide Title";
      document
        .querySelectorAll<HTMLElement>(".title-particles, .wormhole-home__nav")
        .forEach((el) => {
          el.style.visibility = uiHidden ? "hidden" : "visible";
        });
    },
    { signal },
  );

  const copyBtn = document.createElement("button");
  copyBtn.textContent = "Copy";
  copyBtn.type = "button";
  copyBtn.addEventListener(
    "click",
    async () => {
      const snippet = JSON.stringify(
        {
          uSpeed: uniforms.uSpeed.value,
          uSwirl: uniforms.uSwirl.value,
          uDensity: uniforms.uDensity.value,
          uColorDeep: `#${uniforms.uColorDeep.value.getHexString()}`,
          uColorBase: `#${uniforms.uColorBase.value.getHexString()}`,
          uColorWarp: `#${uniforms.uColorWarp.value.getHexString()}`,
          uColorAccent: `#${uniforms.uColorAccent.value.getHexString()}`,
        },
        null,
        2,
      );
      await navigator.clipboard.writeText(snippet);
      copyBtn.textContent = "Copied!";
      setTimeout(() => {
        copyBtn.textContent = "Copy";
      }, 1200);
    },
    { signal },
  );

  btnRow.append(pauseBtn, hideUiBtn, copyBtn);

  body.append(
    slider("Warp", 0, 1, 0.01, 0, (v) => callbacks.onWarpChange(v)),
    slider("Speed", 0, 2, 0.05, uniforms.uSpeed.value, (v) => {
      uniforms.uSpeed.value = v;
    }),
    slider("Swirl", -3, 3, 0.05, uniforms.uSwirl.value, (v) => {
      uniforms.uSwirl.value = v;
    }),
    slider("Density", 0.4, 1.8, 0.02, uniforms.uDensity.value, (v) => {
      uniforms.uDensity.value = v;
    }),
    slider("A/B Split", 0, 1, 0.01, uniforms.uSplit.value, (v) => {
      uniforms.uSplit.value = v;
    }),
    colorInput("Deep", uniforms.uColorDeep.value),
    colorInput("Base", uniforms.uColorBase.value),
    colorInput("Warp", uniforms.uColorWarp.value),
    colorInput("Accent", uniforms.uColorAccent.value),
    btnRow,
  );

  panel.append(header, body);
  document.body.append(panel);

  applyCollapsed(state.collapsed);
  clampPosition();

  return {
    dispose: () => {
      controller.abort();
      panel.remove();
    },
  };
}