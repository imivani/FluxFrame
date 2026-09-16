import { gsap } from "./assets/vendor/gsap.js";

// React Bits Depth Carousel: the original depth-rail layout, GSAP tween and
// pointer projection, adapted to this static portfolio. See vendor/README.md.
export function initHeroCarousel(reduced) {
  const root = document.querySelector("[data-hero-carousel]");
  if (!root) return () => {};
  const viewport = root.querySelector("[data-carousel-viewport]");
  const cards = Array.from(root.querySelectorAll("[data-slide]"));
  const overlays = cards.map(card => card.querySelector(".depth-showcase-tint"));
  const selectors = Array.from(root.querySelectorAll("[data-slide-to]"));
  const toggle = root.querySelector("[data-carousel-toggle]");
  const status = root.querySelector("[data-carousel-status]");
  const name = root.querySelector("[data-carousel-name]");
  const viewer = document.querySelector("[data-lightbox]");
  const names = ["iPredict", "CrazyRDP", "rdp.sh"];
  const count = cards.length;
  const cfg = { cardWidth: 480, depth: 220, spread: 90, tilt: 22, visibleCards: 4, falloff: 0.2, blur: 6, duration: 0.7 };
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  let position = 0;
  let focused = 0;
  let scale = 1;
  let tween = null;
  let drag = null;
  let autoTimer = 0;
  let hovered = false;
  let visible = true;
  let userPaused = false;
  let disposed = false;
  let suppressClick = false;
  let viewerOrigin = null;

  const layout = pos => {
    for (let i = 0; i < count; i++) {
      let d = i - pos;
      d = ((d % count) + count) % count;
      if (d > count / 2) d -= count;
      const back = Math.max(0, d);
      const shown = Math.abs(d) <= cfg.visibleCards + 0.5;
      const tz = -cfg.depth * d;
      const tx = cfg.spread * d;
      const ry = cfg.tilt * clamp(d, 0, 1);
      let opacity = d < 0 ? Math.max(0, 1 + d) : 1;
      if (!shown) opacity = 0;
      const brightness = Math.max(0.15, 1 - back * cfg.falloff);
      const blurPx = Math.min(cfg.blur, back / cfg.visibleCards * cfg.blur);
      const style = cards[i].style;
      style.transform = `translate(-50%, -50%) scale(${scale}) translateX(${tx.toFixed(2)}px) translateZ(${tz.toFixed(2)}px) rotateY(${ry.toFixed(3)}deg)`;
      style.opacity = opacity.toFixed(3);
      style.filter = `brightness(${brightness.toFixed(3)}) blur(${blurPx.toFixed(2)}px)`;
      style.zIndex = String(Math.round(2000 - d * 20));
      style.pointerEvents = shown && opacity > 0.05 ? "auto" : "none";
      overlays[i].style.opacity = clamp(back * cfg.falloff * 1.25, 0, 0.86).toFixed(3);
    }
  };
  const notify = (index, manual) => {
    root.dataset.activeSlide = String(index % names.length);
    root.dataset.railIndex = String(index);
    name.textContent = names[index % names.length];
    const focusOnCard = cards.includes(document.activeElement);
    cards[index].setAttribute("aria-hidden", "false");
    if (focusOnCard) cards[index].focus({ preventScroll: true });
    for (let i = 0; i < count; i++) {
      cards[i].setAttribute("aria-hidden", String(i !== index));
      cards[i].tabIndex = i === index ? 0 : -1;
    }
    for (let i = 0; i < selectors.length; i++) selectors[i].setAttribute("aria-pressed", String(i === index % names.length));
    if (manual) status.textContent = `${names[index % names.length]}, design ${index % names.length + 1} of 3`;
  };
  const setFocus = (rawIndex, animate = true, manual = false) => {
    if (disposed) return;
    const index = ((rawIndex % count) + count) % count;
    let delta = index - position;
    delta = ((delta % count) + count) % count;
    if (delta > count / 2) delta -= count;
    tween?.kill();
    focused = index;
    notify(index, manual);
    const target = position + delta;
    if (!animate || reduced.matches) {
      position = index;
      layout(position);
      return;
    }
    const proxy = { p: position };
    tween = gsap.to(proxy, {
      p: target, duration: cfg.duration, ease: "power3.out",
      onUpdate() { position = proxy.p; layout(position); },
      onComplete() { position = ((position % count) + count) % count; layout(position); },
    });
    if (document.hidden || !visible) tween.pause();
  };
  const viewerOpen = () => viewer?.getAttribute("aria-hidden") === "false";
  const stopAuto = () => { clearInterval(autoTimer); autoTimer = 0; };
  const sync = () => {
    if (disposed) return;
    toggle.hidden = reduced.matches;
    toggle.setAttribute("aria-pressed", String(userPaused));
    toggle.setAttribute("aria-label", userPaused ? "Play slideshow" : "Pause slideshow");
    const suspended = document.hidden || !visible || viewerOpen();
    root.dataset.introMotion = suspended ? "paused" : "running";
    if (reduced.matches) { tween?.kill(); position = focused; layout(position); }
    else if (suspended) tween?.pause();
    else tween?.resume();
    const focusHeld = root.contains(document.activeElement) && document.activeElement !== toggle;
    const run = !reduced.matches && !suspended && !hovered && !focusHeld && !userPaused && !drag;
    root.dataset.rotation = run ? "running" : "paused";
    if (!run) stopAuto();
    else if (!autoTimer) {
      // Start-to-start interval, independent of the 700 ms transition duration.
      autoTimer = window.setInterval(() => {
        root.dataset.lastAdvance = String(Date.now());
        setFocus(focused + 1);
      }, 5000);
    }
  };
  const navigate = step => setFocus(focused + step, true, true);
  root.querySelector("[data-carousel-prev]").addEventListener("click", () => navigate(-1));
  root.querySelector("[data-carousel-next]").addEventListener("click", () => navigate(1));
  for (const button of selectors) button.addEventListener("click", () => {
    const design = Number(button.dataset.slideTo);
    let target = design;
    let best = Infinity;
    for (let i = design; i < count; i += names.length) {
      let delta = ((i - position) % count + count) % count;
      if (delta > count / 2) delta -= count;
      if (Math.abs(delta) < best) { best = Math.abs(delta); target = i; }
    }
    setFocus(target, true, true);
  });
  toggle.addEventListener("click", () => { userPaused = !userPaused; sync(); });
  root.addEventListener("pointerenter", event => { if (event.pointerType !== "touch") { hovered = true; sync(); } });
  root.addEventListener("pointerleave", () => { hovered = false; sync(); });
  root.addEventListener("focusin", sync);
  root.addEventListener("focusout", () => queueMicrotask(sync));
  root.addEventListener("keydown", event => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    navigate(event.key === "ArrowRight" ? 1 : -1);
  });
  viewport.addEventListener("pointerdown", event => {
    if (event.button !== 0 || event.target.closest(".depth-showcase-arrow")) return;
    tween?.kill();
    suppressClick = false;
    drag = { x: event.clientX, y: event.clientY, startPos: position, lastX: event.clientX, lastT: performance.now(), v: 0, moved: false, id: event.pointerId };
    sync();
  });
  viewport.addEventListener("pointermove", event => {
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved && Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { drag = null; sync(); return; }
    if (!drag.moved && Math.abs(dx) > 4) { drag.moved = true; viewport.setPointerCapture(drag.id); }
    if (!drag.moved) return;
    const now = performance.now();
    drag.v = (event.clientX - drag.lastX) / Math.max(now - drag.lastT, 1);
    drag.lastX = event.clientX;
    drag.lastT = now;
    position = drag.startPos - dx / Math.max(cfg.cardWidth * 0.55 * scale, 40);
    layout(position);
  });
  const endPointer = () => {
    if (!drag) return;
    const gesture = drag;
    drag = null;
    if (gesture.moved) {
      suppressClick = true;
      const projected = position - gesture.v * 180 / Math.max(cfg.cardWidth * 0.55 * scale, 40);
      setFocus(Math.round(projected), true, true);
    }
    sync();
  };
  viewport.addEventListener("pointerup", endPointer);
  viewport.addEventListener("pointercancel", endPointer);
  viewport.addEventListener("click", event => {
    const card = event.target.closest("[data-slide]");
    if (suppressClick) { event.preventDefault(); event.stopImmediatePropagation(); suppressClick = false; return; }
    if (!card) return;
    const index = cards.indexOf(card);
    if (index !== focused) { event.preventDefault(); event.stopImmediatePropagation(); setFocus(index, true, true); }
    else { viewerOrigin = card; sync(); }
  }, true);
  const resize = new ResizeObserver(([entry]) => {
    // Keep enough space for the receding image edges without shrinking the
    // website into a thumbnail on phones; the depth formula stays unchanged.
    scale = clamp(entry.contentRect.width / (cfg.cardWidth + cfg.spread), 0.4, 1);
    for (const card of cards) card.style.height = `${entry.contentRect.height / scale}px`;
    layout(position);
  });
  resize.observe(viewport);
  const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: 0.15 });
  visibility.observe(root);
  const viewerObserver = new MutationObserver(() => {
    if (!viewerOpen() && viewerOrigin) { viewerOrigin.focus({ preventScroll: true }); viewerOrigin = null; }
    sync();
  });
  if (viewer) viewerObserver.observe(viewer, { attributes: true, attributeFilter: ["aria-hidden"] });
  window.addEventListener("pageshow", sync);
  window.addEventListener("pagehide", event => {
    stopAuto();
    tween?.pause();
    if (!event.persisted) { disposed = true; tween?.kill(); resize.disconnect(); visibility.disconnect(); viewerObserver.disconnect(); }
  });
  notify(0, false);
  layout(0);
  sync();
  return sync;
}
