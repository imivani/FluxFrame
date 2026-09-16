(() => {
  "use strict";

  const hero = document.querySelector(".home-experience .cinematic-hero");
  if (!hero) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  let syncArtwork = () => {};
  let syncPills = () => {};
  let syncCarousel = () => {};
  let syncPreviews = () => {};
  let carouselActive = false;

  const syncMotion = () => {
    syncArtwork();
    syncPills();
    syncCarousel();
    syncPreviews();
  };
  reduced.addEventListener("change", syncMotion);
  document.addEventListener("visibilitychange", syncMotion);

  // React Bits' Silk shader, using its exact color/scale/speed settings and the
  // existing renderer. The quieter Paper mesh remains behind the full page.
  const initBackgrounds = async () => {
    const { ShaderMount, meshGradientFragmentShader, getShaderColorFromString } =
      await import("./assets/vendor/paper-mesh.js");
    const { silkFragmentShader } = await import("./assets/vendor/silk.js");
    const colors = ["#111326", "#4b386f", "#c64573", "#e88369", "#255969"].map(getShaderColorFromString);
    const uniforms = {
      u_colors: colors,
      u_colorsCount: colors.length,
      u_distortion: 0.58,
      u_swirl: 0.12,
      u_grainMixer: 0,
      u_grainOverlay: 0.025,
      u_fit: 2,
      u_scale: 1,
      u_rotation: 0,
      u_offsetX: 0,
      u_offsetY: 0,
      u_originX: 0.5,
      u_originY: 0.5,
      u_worldWidth: 0,
      u_worldHeight: 0,
    };
    const options = { alpha: false, antialias: false, powerPreference: "low-power" };
    const container = document.querySelector("[data-silk-background]");
    const ambient = document.querySelector("[data-page-mesh]");
    const compact = window.matchMedia("(max-width: 760px), (pointer: coarse)");
    const mount = new ShaderMount(container, silkFragmentShader, {
      uColor: [244 / 255, 63 / 255, 94 / 255],
      uSpeed: 5, uScale: 1, uRotation: 0, uNoiseIntensity: 1.5, uLightMode: 0,
    }, options, 0, 0, 1, compact.matches ? 360000 : 1600000);
    const pageMount = new ShaderMount(ambient, meshGradientFragmentShader,
      { ...uniforms, u_scale: 0.85, u_grainOverlay: 0 }, options, 0, 12500, 1, compact.matches ? 120000 : 360000);
    const resizeQuality = () => {
      mount.setMaxPixelCount(compact.matches ? 360000 : 1600000);
      pageMount.setMaxPixelCount(compact.matches ? 120000 : 360000);
    };
    compact.addEventListener("change", resizeQuality);
    let visible = true;
    let disposed = false;
    syncArtwork = () => {
      if (disposed) return;
      const animate = !document.hidden && !reduced.matches && !carouselActive;
      const run = visible && animate;
      // Silk's useFrame advances its time at 0.1 * delta; preserve that timing.
      mount.setSpeed(run ? 0.1 : 0);
      pageMount.setSpeed(animate ? 0.12 : 0);
      container.dataset.motion = run ? "running" : "paused";
      ambient.dataset.motion = animate ? "running" : "paused";
    };
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncArtwork();
    });
    visibility.observe(hero);
    container.classList.add("is-ready");
    ambient.classList.add("is-ready");
    const canvas = container.querySelector("canvas");
    canvas?.addEventListener("webglcontextlost", () => container.classList.remove("is-ready"));
    ambient.querySelector("canvas")?.addEventListener("webglcontextlost", () => ambient.classList.remove("is-ready"));
    window.addEventListener("pagehide", (event) => {
      mount.setSpeed(0);
      pageMount.setSpeed(0);
      if (!event.persisted) {
        disposed = true;
        visibility.disconnect();
        compact.removeEventListener("change", resizeQuality);
        mount.dispose();
        pageMount.dispose();
      }
    });
    window.addEventListener("pageshow", syncArtwork);
    syncArtwork();
  };
  initBackgrounds().catch(() => {});

  Promise.all([
    import("./assets/vendor/paper-mesh.js"),
    import("./pill-motion.js"),
  ]).then(([{ ShaderMount }, { initSpecularPills }]) => {
    syncPills = initSpecularPills(ShaderMount, reduced);
    syncPills();
  }).catch(() => {});

  import("./hero-carousel.js").then(({ initHeroCarousel }) => {
    syncCarousel = initHeroCarousel(reduced, active => {
      carouselActive = active;
      syncArtwork();
    });
    syncCarousel();
  }).catch(() => {});

  // Highlight the chapter that crosses the reading zone; native page scrolling
  // and ordinary anchor navigation remain available at every viewport size.
  const steps = Array.from(document.querySelectorAll("[data-story-step]"));
  const chapterLinks = Array.from(document.querySelectorAll(".story-index a"));
  const setChapter = (id) => {
    for (const link of chapterLinks) {
      const active = link.hash === `#${id}`;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "step");
      else link.removeAttribute("aria-current");
    }
  };
  if ("IntersectionObserver" in window) {
    const chapters = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) setChapter(entry.target.id);
    }, { rootMargin: "-25% 0px -45% 0px", threshold: 0 });
    for (const step of steps) chapters.observe(step);
  }

  // Animate the artwork inside fixed frames. Layout is measured only on load
  // and resize; CSS transforms handle the movement without a per-frame loop.
  const previews = Array.from(document.querySelectorAll("[data-story-preview]"));
  const visiblePreviews = new Set();
  syncPreviews = () => {
    for (const preview of previews) {
      const loaded = Array.from(preview.querySelectorAll("img")).every(img => img.complete && img.naturalWidth);
      preview.dataset.running = String(loaded && visiblePreviews.has(preview) && !document.hidden && !reduced.matches);
    }
  };
  const sizePreview = (preview) => {
    const bounds = preview.getBoundingClientRect();
    const style = getComputedStyle(preview);
    const width = bounds.width - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth);
    const height = bounds.height - parseFloat(style.borderTopWidth) - parseFloat(style.borderBottomWidth);
    const measurements = Array.from(preview.querySelectorAll(".story-page-pan, .story-cover-pan"), img => {
      const image = img.getBoundingClientRect();
      const distance = img.classList.contains("story-page-pan") ? height - image.height : width - image.width;
      return { img, end: Number.isFinite(distance) ? Math.min(0, distance) : 0 };
    });
    for (const { img, end } of measurements) {
      img.style.setProperty("--pan-end", `${end}px`);
      img.style.setProperty("--pan-center", `${end / 2}px`);
    }
  };
  const previewSize = new ResizeObserver(entries => {
    for (const entry of entries) sizePreview(entry.target);
  });
  const previewVisibility = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) visiblePreviews.add(entry.target);
      else visiblePreviews.delete(entry.target);
    }
    syncPreviews();
  }, { threshold: 0.15 });
  for (const preview of previews) {
    previewSize.observe(preview);
    previewVisibility.observe(preview);
    for (const img of preview.querySelectorAll("img")) {
      img.addEventListener("load", () => { sizePreview(preview); syncPreviews(); });
    }
    sizePreview(preview);
  }
  window.addEventListener("pagehide", event => {
    if (!event.persisted) { previewSize.disconnect(); previewVisibility.disconnect(); }
  });
  window.addEventListener("pageshow", syncPreviews);
  syncMotion();
})();
