import * as THREE from "three";
import tunnelVertex from "./wormhole.vert?raw";
import tunnelFragment from "./wormhole.frag?raw";

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

  const tunnelUniforms = {
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uTime: { value: 0 },
    uWarp: { value: 0 },
    uSpeed: { value: 0.45 },
    uSwirl: { value: 0.0 },
    uDensity: { value: 1.0 },
    uSplit: { value: 0.0 },
    uPointer: { value: new THREE.Vector2(0, 0) },
    uColorDeep: { value: new THREE.Color("#03040b") },
    uColorBase: { value: new THREE.Color("#293d94") },
    uColorWarp: { value: new THREE.Color("#8c38c7") },
    uColorAccent: { value: new THREE.Color("#d9a13d") },
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
  let overrideWarp: number | null = null;
  let paused = false;
  let rafId = 0;
  let last = performance.now();
  let disposed = false;

  const resize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    tunnelUniforms.uResolution.value.set(width, height);
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
  };

  const onPointerMove = (e: PointerEvent) => {
    targetPointer.set(
      (e.clientX / Math.max(1, window.innerWidth) - 0.5) * 4,
      -(e.clientY / Math.max(1, window.innerHeight) - 0.5) * 4,
    );
  };

  const onWarp = () => {
    overrideWarp = null;
    warpTarget = 1;
  };

  const animate = (now: number) => {
    if (disposed) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (!paused) {
      tunnelUniforms.uTime.value += dt;
    }

    const activeWarp = overrideWarp ?? warpTarget;
    tunnelUniforms.uWarp.value += (activeWarp - tunnelUniforms.uWarp.value) * Math.min(1, dt * 6);
    tunnelUniforms.uPointer.value.lerp(targetPointer, Math.min(1, dt * 4));

    if (!paused) {
      const speed = 45 + tunnelUniforms.uWarp.value * 950;
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

    rafId = requestAnimationFrame(animate);
  };

// --- DEV-ONLY SHADER TUNER (stripped completely in `npm run build`) ---
  let devHud: { dispose: () => void } | null = null;
  if (import.meta.env.DEV) {
    devHud = createDevHud(tunnelUniforms, {
      onWarpChange: (v) => { overrideWarp = v; },
      onPauseToggle: (isPaused) => { paused = isPaused; },
    });

    if (import.meta.hot) {
      import.meta.hot.accept(
        ["./wormhole.vert?raw", "./wormhole.frag?raw"],
        ([vertMod, fragMod]) => {
          if (vertMod) quadMat.vertexShader = vertMod.default;
          if (fragMod) quadMat.fragmentShader = fragMod.default;
          quadMat.needsUpdate = true;
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
  window.addEventListener("pagehide", dispose, { once: true });
  rafId = requestAnimationFrame(animate);
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