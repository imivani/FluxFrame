(() => {
  "use strict";

  const hero = document.querySelector(".home-experience .cinematic-hero");
  if (!hero) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const toggle = document.querySelector("[data-motion-toggle]");
  const label = document.querySelector("[data-motion-label]");
  let userPaused = false;
  let syncArtwork = () => {};
  let syncVideos = () => {};

  const syncMotion = () => {
    const paused = reduced.matches || userPaused;
    document.body.classList.toggle("user-motion-paused", paused);
    toggle.setAttribute("aria-pressed", String(paused));
    label.textContent = paused ? "Resume motion" : "Pause motion";
    toggle.hidden = reduced.matches;
    syncArtwork();
    syncVideos();
  };
  toggle.addEventListener("click", () => {
    userPaused = !userPaused;
    syncMotion();
  });
  reduced.addEventListener("change", syncMotion);
  document.addEventListener("visibilitychange", () => {
    syncArtwork();
    syncVideos();
  });

  // Paper's framework-independent Mesh Gradient uses the same renderer as its
  // React component. Vendor bundle is pinned; the static CSS blend is a fallback.
  const initMesh = async () => {
    const { ShaderMount, meshGradientFragmentShader, getShaderColorFromString } =
      await import("./assets/vendor/paper-mesh.js");
    const container = document.querySelector("[data-mesh-gradient]");
    const colors = ["#111326", "#4b386f", "#c64573", "#e88369", "#255969"].map(getShaderColorFromString);
    const mount = new ShaderMount(container, meshGradientFragmentShader, {
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
    }, { alpha: false, antialias: false, powerPreference: "low-power" }, 0, 8000, 1, 900000);
    let visible = true;
    let disposed = false;
    syncArtwork = () => {
      if (disposed) return;
      const run = visible && !document.hidden && !reduced.matches && !userPaused;
      mount.setSpeed(run ? 0.45 : 0);
      container.dataset.motion = run ? "running" : "paused";
      hero.classList.toggle("hero-motion-paused", !run);
    };
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncArtwork();
    });
    visibility.observe(hero);
    container.classList.add("is-ready");
    const canvas = container.querySelector("canvas");
    canvas?.addEventListener("webglcontextlost", () => container.classList.remove("is-ready"));
    window.addEventListener("pagehide", (event) => {
      mount.setSpeed(0);
      if (!event.persisted) {
        disposed = true;
        visibility.disconnect();
        mount.dispose();
      }
    });
    window.addEventListener("pageshow", syncArtwork);
    syncArtwork();
  };
  initMesh().catch(() => {});

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

  const videoSection = document.querySelector(".story-art-motion");
  const videos = Array.from(document.querySelectorAll("[data-story-video]"));
  const videoToggle = document.querySelector("[data-video-toggle]");
  let videosVisible = false;
  let videosPaused = false;
  syncVideos = () => {
    const stopped = userPaused || reduced.matches || videosPaused;
    videoToggle.hidden = reduced.matches;
    videoToggle.textContent = stopped ? "Play previews" : "Pause previews";
    videoToggle.setAttribute("aria-pressed", String(stopped));
    for (const video of videos) {
      if (videosVisible && !document.hidden && !stopped) video.play().catch(() => {});
      else video.pause();
    }
  };
  videoToggle.addEventListener("click", () => {
    if (userPaused || videosPaused) {
      userPaused = false;
      videosPaused = false;
    } else videosPaused = true;
    syncMotion();
  });
  if ("IntersectionObserver" in window) {
    const videoObserver = new IntersectionObserver(([entry]) => {
      videosVisible = entry.isIntersecting;
      syncVideos();
    }, { threshold: 0.15 });
    videoObserver.observe(videoSection);
  }
  syncMotion();
})();
