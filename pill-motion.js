import { specularRimFragmentShader } from "./assets/vendor/specular-rim.js";

// React Bits' original rim shader, adapted to the site's existing renderer.
// Only an active pointer/focus transition schedules frames; idle pills are still.
export function initSpecularPills(ShaderMount, reduced) {
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const controllers = [];

  for (const button of document.querySelectorAll(".specular-pill")) {
    const label = document.createElement("span");
    label.className = "specular-label";
    label.append(...button.childNodes);
    const surface = document.createElement("span");
    surface.className = "specular-fx";
    surface.setAttribute("aria-hidden", "true");
    button.append(surface, label);

    let mount;
    try {
      mount = new ShaderMount(surface, specularRimFragmentShader, {
        uCenter: [1, 1], uHalfSize: [1, 1], uRadius: 1,
        uAngle: 2.4, uPx: 1, uIntensity: 0.3,
        uLineColor: button.classList.contains("primary") ? [1, 0.85, 0.91] : [0.79, 0.88, 1],
        uBaseColor: [0.32, 0.32, 0.35],
        uShineSize: 10 * Math.PI / 180, uShineFade: 40 * Math.PI / 180,
        uThickness: 1, uBaseWidth: 1,
      }, { alpha: true, antialias: false, premultipliedAlpha: true }, 0, 0, 1, 180000);
    } catch {
      surface.remove();
      continue;
    }

    let visible = false;
    let disposed = false;
    let hovered = false;
    let focused = false;
    let frame = 0;
    let lastTime = 0;
    let angle = 2.4;
    let targetAngle = 2.4;
    let intensity = 0.3;
    let targetIntensity = 0.3;
    let bounds;
    let geometryFrame = 0;
    let surfaceWidth = 1;
    const values = { uAngle: angle, uIntensity: intensity };
    const draw = () => {
      values.uAngle = angle;
      values.uIntensity = intensity;
      mount.setUniforms(values);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      surface.dataset.motion = "idle";
    };
    const tick = (time) => {
      const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 1 / 60;
      lastTime = time;
      angle += (targetAngle - angle) * (1 - Math.exp(-7 * dt));
      intensity += (targetIntensity - intensity) * (1 - Math.exp(-8 * dt));
      draw();
      if (Math.abs(targetAngle - angle) < 0.001 && Math.abs(targetIntensity - intensity) < 0.001) {
        angle = targetAngle;
        intensity = targetIntensity;
        draw();
        stop();
      } else frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      if (disposed) return;
      targetIntensity = hovered || focused ? 1.3 : 0.3;
      if (!visible || document.hidden || reduced.matches || !finePointer.matches) {
        stop();
        angle = 2.4;
        intensity = focused ? 1.3 : 0.3;
        draw();
        return;
      }
      if (!frame) {
        surface.dataset.motion = "settling";
        frame = requestAnimationFrame(tick);
      }
    };
    const move = (event) => {
      if (event.pointerType === "touch" || !finePointer.matches || reduced.matches) return;
      if (!bounds) bounds = button.getBoundingClientRect();
      const nx = (event.clientX - bounds.left) / bounds.width * 2 - 1;
      const ny = (event.clientY - bounds.top) / bounds.height * 2 - 1;
      targetAngle = Math.atan2(2 / bounds.height, -2 / bounds.width) + nx * 0.3 + ny * 0.15;
      sync();
    };
    button.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "touch" || !finePointer.matches) return;
      hovered = true;
      bounds = button.getBoundingClientRect();
      move(event);
    });
    button.addEventListener("pointermove", move);
    button.addEventListener("pointerleave", () => {
      hovered = false;
      bounds = undefined;
      targetAngle = 2.4;
      sync();
    });
    button.addEventListener("focus", () => { focused = true; sync(); });
    button.addEventListener("blur", () => { focused = false; sync(); });

    // Measure after resize observers finish: the renderer may resize its
    // backing canvas in a separate observer at a responsive breakpoint.
    const updateGeometry = () => {
      geometryFrame = 0;
      if (disposed) return;
      const canvas = surface.querySelector("canvas");
      const ratio = canvas.width / surfaceWidth;
      const width = button.offsetWidth;
      const height = button.offsetHeight;
      mount.setUniforms({
        uCenter: [canvas.width / 2, canvas.height / 2],
        uHalfSize: [width / 2 * ratio, height / 2 * ratio],
        uRadius: height / 2 * ratio,
        uPx: ratio, uThickness: ratio, uBaseWidth: ratio,
      });
      bounds = undefined;
    };
    const resize = new ResizeObserver(([entry]) => {
      const size = entry.borderBoxSize[0];
      if (!size || disposed) return;
      surfaceWidth = size.inlineSize;
      cancelAnimationFrame(geometryFrame);
      geometryFrame = requestAnimationFrame(updateGeometry);
    });
    resize.observe(surface);
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) { hovered = false; targetAngle = 2.4; }
      sync();
    });
    visibility.observe(button);
    surface.querySelector("canvas").addEventListener("webglcontextlost", () => {
      stop();
      disposed = true;
      cancelAnimationFrame(geometryFrame);
      resize.disconnect();
      visibility.disconnect();
      surface.style.visibility = "hidden";
    });
    controllers.push({
      sync,
      stop,
      dispose() {
        if (disposed) return;
        disposed = true;
        cancelAnimationFrame(geometryFrame);
        stop();
        resize.disconnect();
        visibility.disconnect();
        mount.dispose();
      },
    });
  }

  const sync = () => controllers.forEach((controller) => controller.sync());
  finePointer.addEventListener("change", sync);
  window.addEventListener("pageshow", sync);
  window.addEventListener("pagehide", (event) => {
    for (const controller of controllers) {
      if (event.persisted) controller.stop();
      else controller.dispose();
    }
  });
  return sync;
}
