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
  { deep: "#02060d", fog: "#071a26", base: "#18e08d", warp: "#1ab8e8", accent: "#c84dff" },
  { deep: "#03070e", fog: "#091d2b", base: "#24f0a8", warp: "#4b82ff", accent: "#ff5ea8" },
  { deep: "#050312", fog: "#130d2e", base: "#1ed6b8", warp: "#6f4dff", accent: "#ff478a" },
  { deep: "#020806", fog: "#08211b", base: "#3ef27a", warp: "#17c9c3", accent: "#9e5eff" },
  { deep: "#040610", fog: "#0d1a2e", base: "#20e39e", warp: "#2bb5ff", accent: "#ff8ce0" },
];

const LIGHT_PALETTES: WormholePalette[] = [
  { deep: "#1b2b3d", fog: "#6c8ba6", base: "#3df2ad", warp: "#4fd6ff", accent: "#eb8cff" },
  { deep: "#212842", fog: "#7983ad", base: "#52f0c3", warp: "#73a8ff", accent: "#ff9ec7" },
  { deep: "#182d36", fog: "#67969e", base: "#47eb8f", warp: "#5be0e6", accent: "#c799ff" },
  { deep: "#20273d", fog: "#7d88a8", base: "#3ae6c1", warp: "#6eb5ff", accent: "#ffa6b8" },
  { deep: "#28223b", fog: "#877da6", base: "#4de8a5", warp: "#66c7ff", accent: "#ffba94" },
];

export function mountSpaceWormhole(): void {
  const canvas = document.querySelector<HTMLCanvasElement>("[data-space-wormhole]");
  if (!canvas) return;

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
    new THREE.Color(0xe8fff8),
    new THREE.Color(0x9be7ff),
    new THREE.Color(0x9effcf),
    new THREE.Color(0xffffff),
    new THREE.Color(0xe6b8ff),
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
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

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
    devHud?.syncFromTargets();
  };

  const onShuffle = () => {
    if (isDarkTheme()) {
      darkIndex = (darkIndex + 1) % DARK_PALETTES.length;
      applyTargetPalette(DARK_PALETTES[darkIndex]);
    } else {
      lightIndex = (lightIndex + 1) % LIGHT_PALETTES.length;
      applyTargetPalette(LIGHT_PALETTES[lightIndex]);
    }
    devHud?.syncFromTargets();
  };

  const animate = (now: number) => {
    let fpsFrames = 0;
    let fpsLast = performance.now();

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

    if (devHud) {
      fpsFrames += 1;
      if (now - fpsLast >= 500) {
        devHud.updateFps(Math.round((fpsFrames * 1000) / (now - fpsLast)));
        fpsFrames = 0;
        fpsLast = now;
      }
    }
  };

  // DEV SHADER TUNER (stripped completely in `npm run build`)
  let devHud: {
  dispose: () => void;
  syncFromTargets: () => void;
  updateFps: (fps: number) => void;
  } | null = null;
  if (import.meta.env.DEV) {
     devHud = createDevHud(tunnelUniforms, targetColors, {
       onWarpChange: (v) => { overrideWarp = v; },
       onPauseToggle: (isPaused) => { paused = isPaused; },
       onStarsToggle: (visible) => { stars.visible = visible; },
       onShuffle,
       onReset: () => {
         tunnelUniforms.uSpeed.value = 0.42;
         tunnelUniforms.uSwirl.value = 2.0;
         tunnelUniforms.uDensity.value = 1.05;
         tunnelUniforms.uSplit.value = 0.0;
         overrideWarp = null;
         onThemeSync();
       },
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
    uColorFog: { value: THREE.Color };
    uColorBase: { value: THREE.Color };
    uColorWarp: { value: THREE.Color };
    uColorAccent: { value: THREE.Color };
  },
  targetColors: {
    deep: THREE.Color;
    fog: THREE.Color;
    base: THREE.Color;
    warp: THREE.Color;
    accent: THREE.Color;
  },
  callbacks: {
    onWarpChange: (value: number | null) => void;
    onPauseToggle: (paused: boolean) => void;
    onStarsToggle: (visible: boolean) => void;
    onShuffle: () => void;
    onReset: () => void;
  },
) {
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
      // Ignore storage errors
    }
  };

  const panel = document.createElement("aside");
  panel.style.cssText = css`
    position: fixed;
    top: ${state.y}px;
    left: ${state.x}px;
    z-index: 9999;
    width: 272px;
    border-radius: 10px;
    background: rgba(10, 12, 20, 0.9);
    color: #eee;
    border: 1px solid rgba(255, 255, 255, 0.18);
    backdrop-filter: blur(10px);
    font: 12px/1.4 monospace;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.5);
    overflow: hidden;
  `;

  // --- Draggable Header + FPS Badge ---
  const header = document.createElement("div");
  header.style.cssText = css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 10px;
    cursor: grab;
    user-select: none;
    touch-action: none;
    background: rgba(255, 255, 255, 0.06);
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  `;

  const titleWrap = document.createElement("div");
  titleWrap.style.cssText = css`
    display: flex;
    align-items: center;
    gap: 8px;
  `;

  const title = document.createElement("span");
  title.textContent = "Shader HUD";
  title.style.cssText = css`
    font-weight: 700;
    letter-spacing: 0.04em;
    color: #9effcf;
  `;

  const fpsBadge = document.createElement("span");
  fpsBadge.textContent = "-- fps";
  fpsBadge.style.cssText = css`
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.1);
    color: #9be7ff;
  `;

  titleWrap.append(title, fpsBadge);

  const minimizeBtn = document.createElement("button");
  minimizeBtn.type = "button";
  minimizeBtn.setAttribute("aria-label", "Toggle shader HUD");
  minimizeBtn.style.cssText = css`
    width: 24px;
    height: 24px;
    padding: 0;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.22);
    background: rgba(255, 255, 255, 0.08);
    color: #eee;
    font: 700 14px/1 monospace;
    cursor: pointer;
  `;

  header.append(titleWrap, minimizeBtn);

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

  let dragStart: { pointerX: number; pointerY: number; originX: number; originY: number } | null = null;
  header.addEventListener(
    "pointerdown",
    (e: PointerEvent) => {
      if ((e.target as HTMLElement | null)?.closest("button")) return;
      if (e.button !== 0) return;
      e.stopPropagation();
      header.setPointerCapture(e.pointerId);
      header.style.cursor = "grabbing";
      dragStart = { pointerX: e.clientX, pointerY: e.clientY, originX: state.x, originY: state.y };
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
    if (header.hasPointerCapture(e.pointerId)) header.releasePointerCapture(e.pointerId);
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

  // --- Sliders (tracked so Reset updates them cleanly) ---
  const sliderSyncs: Array<() => void> = [];
  const makeSlider = (
    label: string,
    min: number,
    max: number,
    step: number,
    getVal: () => number,
    onInput: (v: number) => void,
  ) => {
    const row = document.createElement("label");
    row.style.cssText = css`
      display: grid;
      gap: 2px;
    `;
    const readout = document.createElement("span");
    const input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);

    const sync = () => {
      const v = getVal();
      input.value = String(v);
      readout.textContent = `${label}: ${v.toFixed(2)}`;
    };
    sliderSyncs.push(sync);
    sync();

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

  // --- Color Pickers (update both targetColors & uniform immediately!) ---
  const colorSyncs: Array<() => void> = [];
  const makeColor = (
    label: string,
    target: THREE.Color,
    uniform: THREE.Color,
  ) => {
    const row = document.createElement("label");
    row.style.cssText = css`
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    const input = document.createElement("input");
    input.type = "color";
    input.style.cssText = css`
      width: 44px;
      height: 22px;
      padding: 0;
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 4px;
      background: transparent;
      cursor: pointer;
    `;

    const sync = () => {
      input.value = `#${target.getHexString()}`;
    };
    colorSyncs.push(sync);
    sync();

    input.addEventListener(
      "input",
      () => {
        target.set(input.value);
        uniform.set(input.value);
      },
      { signal },
    );
    row.append(label, input);
    return row;
  };

  const makeBtn = (text: string, onClick: () => void) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = text;
    b.style.cssText = css`
      padding: 4px 8px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      background: rgba(255, 255, 255, 0.08);
      color: #eee;
      font: 11px/1.2 monospace;
      cursor: pointer;
    `;
    b.addEventListener("click", onClick, { signal });
    return b;
  };

  // --- Warp Row (Slider + Auto Release) ---
  let warpOverride = 0;
  let warpLocked = false;
  const warpRow = makeSlider(
    "Warp",
    0,
    1,
    0.01,
    () => warpOverride,
    (v) => {
      warpOverride = v;
      warpLocked = true;
      callbacks.onWarpChange(v);
    },
  );

  // --- Action Buttons ---
  let paused = false;
  let starsVisible = true;
  let uiHidden = false;

  const setPageUiHidden = (hidden: boolean) => {
    document
      .querySelectorAll<HTMLElement>(
        ".title-particles, .wormhole-home__nav, .home-arcane-dock, .codex-shell",
      )
      .forEach((el) => {
        el.style.visibility = hidden ? "hidden" : "visible";
      });
  };

  const pauseBtn = makeBtn("Pause", () => {
    paused = !paused;
    pauseBtn.textContent = paused ? "Resume" : "Pause";
    callbacks.onPauseToggle(paused);
  });

  const starsBtn = makeBtn("Stars: On", () => {
    starsVisible = !starsVisible;
    starsBtn.textContent = starsVisible ? "Stars: On" : "Stars: Off";
    callbacks.onStarsToggle(starsVisible);
  });

  const hideUiBtn = makeBtn("Hide UI", () => {
    uiHidden = !uiHidden;
    hideUiBtn.textContent = uiHidden ? "Show UI" : "Hide UI";
    setPageUiHidden(uiHidden);
  });

  const shuffleBtn = makeBtn("Shuffle", () => {
    callbacks.onShuffle();
  });

  const warpAutoBtn = makeBtn("Warp: Auto", () => {
    if (warpLocked) {
      warpLocked = false;
      warpOverride = 0;
      callbacks.onWarpChange(null);
      sliderSyncs.forEach((s) => s());
    } else {
      warpLocked = true;
      warpOverride = 1;
      callbacks.onWarpChange(1);
      sliderSyncs.forEach((s) => s());
    }
    warpAutoBtn.textContent = warpLocked ? "Release Warp" : "Test Warp";
  });
  warpAutoBtn.textContent = "Test Warp";

  const resetBtn = makeBtn("Reset", () => {
    warpLocked = false;
    warpOverride = 0;
    warpAutoBtn.textContent = "Test Warp";
    callbacks.onReset();
    sliderSyncs.forEach((s) => s());
    colorSyncs.forEach((s) => s());
  });

  const copyBtn = makeBtn("Copy Palette", async () => {
    const hex = (c: THREE.Color) => `#${c.getHexString()}`;
    const paletteLine = `{ deep: "${hex(targetColors.deep)}", fog: "${hex(targetColors.fog)}", base: "${hex(targetColors.base)}", warp: "${hex(targetColors.warp)}", accent: "${hex(targetColors.accent)}" }`;
    const uniformsBlock = `uSpeed: ${uniforms.uSpeed.value}, uSwirl: ${uniforms.uSwirl.value}, uDensity: ${uniforms.uDensity.value}`;
    await navigator.clipboard.writeText(`${paletteLine}\n// ${uniformsBlock}`);
    copyBtn.textContent = "Copied!";
    setTimeout(() => {
      copyBtn.textContent = "Copy Palette";
    }, 1200);
  });

  const btnGrid = document.createElement("div");
  btnGrid.style.cssText = css`
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 2px;
  `;
  btnGrid.append(pauseBtn, starsBtn, hideUiBtn, shuffleBtn, warpAutoBtn, resetBtn, copyBtn);

  body.append(
    warpRow,
    makeSlider("Speed", 0, 2, 0.05, () => uniforms.uSpeed.value, (v) => {
      uniforms.uSpeed.value = v;
    }),
    makeSlider("Swirl", -3, 3, 0.05, () => uniforms.uSwirl.value, (v) => {
      uniforms.uSwirl.value = v;
    }),
    makeSlider("Density", 0.4, 1.8, 0.02, () => uniforms.uDensity.value, (v) => {
      uniforms.uDensity.value = v;
    }),
    makeSlider("A/B Split", 0, 1, 0.01, () => uniforms.uSplit.value, (v) => {
      uniforms.uSplit.value = v;
    }),
    makeColor("Deep Sky", targetColors.deep, uniforms.uColorDeep.value),
    makeColor("Mist Fog", targetColors.fog, uniforms.uColorFog.value),
    makeColor("Base", targetColors.base, uniforms.uColorBase.value),
    makeColor("Warp", targetColors.warp, uniforms.uColorWarp.value),
    makeColor("Accent", targetColors.accent, uniforms.uColorAccent.value),
    btnGrid,
  );

  panel.append(header, body);
  document.body.append(panel);

  applyCollapsed(state.collapsed);
  clampPosition();

  return {
    syncFromTargets: () => {
      colorSyncs.forEach((s) => s());
    },
    updateFps: (fps: number) => {
      fpsBadge.textContent = `${fps} fps`;
    },
    dispose: () => {
      if (uiHidden) setPageUiHidden(false);
      controller.abort();
      panel.remove();
    },
  };
}