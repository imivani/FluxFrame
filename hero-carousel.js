// React Bits depth-rail geometry, with compositor-driven transform/opacity
// transitions. No per-frame filters, stacking changes or animation JS loop.
export function initHeroCarousel(reduced, onActivity = () => {}) {
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
  const cfg = { cardWidth: 480, depth: 220, spread: 90, tilt: 22, visibleCards: 4, falloff: 0.2, duration: 700 };
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const ease = t => 1 - (1 - t) ** 4;
  let position = 0;
  let focused = 0;
  let scale = 1;
  let cardHeight = 560;
  let transition = null;
  let dragFrame = 0;
  let active = false;
  let drag = null;
  let autoTimer = 0;
  let hovered = false;
  let visible = true;
  let userPaused = false;
  let disposed = false;
  let suppressClick = false;
  let viewerOrigin = null;

  const pose = { transform: "", opacity: 0, tint: 0, depth: 0 };
  const computePose = (i, pos) => {
    let d = ((i - pos) % count + count) % count;
    if (d > count / 2) d -= count;
    const back = Math.max(0, d);
    pose.depth = d;
    pose.opacity = Math.abs(d) > cfg.visibleCards + 0.5 ? 0 : d < 0 ? Math.max(0, 1 + d) : 1;
    pose.transform = `translate3d(-240px,${-cardHeight / 2}px,0) scale(${scale}) translate3d(${(cfg.spread * d).toFixed(2)}px,0,${(-cfg.depth * d).toFixed(2)}px) rotateY(${(cfg.tilt * clamp(d, 0, 1)).toFixed(3)}deg)`;
    // A simple translucent layer replaces brightness + blur + multiply blend.
    pose.tint = 1 - Math.max(0.15, 1 - back * cfg.falloff) * (1 - clamp(back * cfg.falloff * 1.25, 0, 0.86));
  };
  const setActivity = value => {
    if (active === value) return;
    active = value;
    root.dataset.moving = String(value);
    onActivity(value);
  };
  const updateInteraction = pos => {
    for (let i = 0; i < count; i++) {
      computePose(i, pos);
      const style = cards[i].style;
      const pointer = pose.opacity > 0.05 ? "auto" : "none";
      if (style.pointerEvents !== pointer) style.pointerEvents = pointer;
      // Stack order only changes at selection boundaries, never every frame.
      let rank = (i - focused + count) % count;
      if (rank > count / 2) rank -= count;
      const order = String(2000 - rank * 20);
      if (style.zIndex !== order) style.zIndex = order;
    }
  };
  const layout = pos => {
    for (let i = 0; i < count; i++) {
      computePose(i, pos);
      cards[i].style.transform = pose.transform;
      cards[i].style.opacity = String(pose.opacity);
      overlays[i].style.opacity = String(pose.tint);
    }
    updateInteraction(pos);
  };
  const stopTransition = () => {
    if (!transition) return;
    const current = transition;
    const t = clamp(Number(current.animations[0].currentTime ?? 0) / cfg.duration, 0, 1);
    position = current.start + (current.target - current.start) * ease(t);
    transition = null;
    layout(position);
    for (const animation of current.animations) animation.cancel();
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
    stopTransition();
    const index = ((rawIndex % count) + count) % count;
    let delta = index - position;
    delta = ((delta % count) + count) % count;
    if (delta > count / 2) delta -= count;
    focused = index;
    notify(index, manual);
    const target = position + delta;
    if (!animate || reduced.matches || Math.abs(delta) < 0.0001) {
      position = index;
      layout(position);
      setActivity(false);
      return;
    }
    setActivity(true);
    const animations = [];
    const start = position;
    // Sample the curved rail once per interaction. The browser interpolates
    // these keyframes independently of the main JS thread, including on iOS.
    for (let i = 0; i < count; i++) {
      const frames = [], tintFrames = [];
      let shown = false;
      for (let step = 0; step <= 42; step++) {
        computePose(i, start + delta * ease(step / 42));
        frames.push({ transform: pose.transform, opacity: pose.opacity });
        tintFrames.push({ opacity: pose.tint });
        shown ||= pose.opacity > 0;
      }
      if (!shown) continue;
      animations.push(cards[i].animate(frames, { duration: cfg.duration, fill: "both" }));
      animations.push(overlays[i].animate(tintFrames, { duration: cfg.duration, fill: "both" }));
    }
    const current = { animations, start, target };
    transition = current;
    updateInteraction(target);
    animations[0].onfinish = () => {
      if (transition !== current) return;
      position = index;
      transition = null;
      layout(position);
      for (const animation of animations) animation.cancel();
      setActivity(false);
    };
    if (document.hidden || !visible) for (const animation of animations) animation.pause();
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
    if (reduced.matches) { stopTransition(); position = focused; layout(position); }
    else if (transition) for (const animation of transition.animations) {
      if (suspended) animation.pause();
      else if (animation.playState === "paused") animation.play();
    }
    setActivity(!reduced.matches && !suspended && !!(transition || drag));
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
    stopTransition();
    suppressClick = false;
    drag = { x: event.clientX, y: event.clientY, startPos: position, lastX: event.clientX, lastT: performance.now(), v: 0, moved: false, id: event.pointerId };
    sync();
  });
  viewport.addEventListener("pointermove", event => {
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved && Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { drag = null; setFocus(focused); sync(); return; }
    if (!drag.moved && Math.abs(dx) > 4) { drag.moved = true; viewport.setPointerCapture(drag.id); }
    if (!drag.moved) return;
    const now = performance.now();
    drag.v = (event.clientX - drag.lastX) / Math.max(now - drag.lastT, 1);
    drag.lastX = event.clientX;
    drag.lastT = now;
    position = drag.startPos - dx / Math.max(cfg.cardWidth * 0.55 * scale, 40);
    if (!dragFrame) dragFrame = requestAnimationFrame(renderDrag);
  });
  const renderDrag = () => { dragFrame = 0; layout(position); };
  const endPointer = () => {
    if (!drag) return;
    const gesture = drag;
    drag = null;
    cancelAnimationFrame(dragFrame);
    dragFrame = 0;
    if (gesture.moved) {
      suppressClick = true;
      const projected = position - gesture.v * 180 / Math.max(cfg.cardWidth * 0.55 * scale, 40);
      setFocus(Math.round(projected), true, true);
    } else setFocus(focused);
    sync();
  };
  window.addEventListener("pointerup", endPointer);
  window.addEventListener("pointercancel", endPointer);
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
    const wasTransitioning = !!transition;
    stopTransition();
    scale = clamp(entry.contentRect.width / (cfg.cardWidth + cfg.spread), 0.4, 1);
    cardHeight = entry.contentRect.height / scale;
    for (const card of cards) card.style.height = `${cardHeight}px`;
    layout(position);
    if (wasTransitioning) setFocus(focused);
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
    cancelAnimationFrame(dragFrame);
    dragFrame = 0;
    drag = null;
    if (transition) for (const animation of transition.animations) animation.pause();
    setActivity(false);
    if (!event.persisted) { disposed = true; stopTransition(); resize.disconnect(); visibility.disconnect(); viewerObserver.disconnect(); }
  });
  notify(0, false);
  layout(0);
  sync();
  return sync;
}
