function noise(seed) {
  const value = Math.sin(seed * 124.67 + 0.76) * 43758.5453;
  return value - Math.floor(value);
}

function backdrop(canvas, scene) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  function draw() {
    const bounds = canvas.getBoundingClientRect();
    const sceneBounds = scene.getBoundingClientRect();
    const density = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(bounds.width * density);
    canvas.height = Math.round(bounds.height * density);
    ctx.setTransform(density, 0, 0, density, 0, 0);

    const centerX = sceneBounds.left - bounds.left + sceneBounds.width / 2;
    const centerY = sceneBounds.top - bounds.top + sceneBounds.height * 0.56;
    const radiusX = sceneBounds.width * 0.7;
    const radiusY = sceneBounds.height * 0.73;
    const step = 6;
    for (let y = 0; y < bounds.height; y += step) {
      for (let x = 0; x < bounds.width; x += step) {
        const u = (x - centerX) / radiusX;
        const v = (y - centerY) / radiusY;
        const arc = Math.hypot(u, v + u * 0.15);
        const falloff = Math.max(0, 1 - arc);
        if (!falloff) continue;
        const seed = x * 9 + y * 173;
        const grain = noise(seed);
        const band = 0.46 + 0.54 * Math.cos(arc * 23 - u * 2) ** 2;
        if (grain > Math.min(0.96, falloff * 1.66 * band)) continue;
        ctx.fillStyle =
          noise(seed + 4) > 0.36
            ? `rgba(255,199,44,${0.11 + 0.37 * falloff})`
            : `rgba(185,185,195,${0.09 + 0.21 * falloff})`;
        ctx.fillRect(x, y, falloff > 0.7 && grain < 0.25 ? 2 : 1, 1);
      }
    }
  }

  new ResizeObserver(draw).observe(canvas.closest(".hero"));
}

export function drawHero(canvas) {
  const scene = canvas?.parentElement?.querySelector(".hero-scene");
  if (!scene) return;
  backdrop(canvas, scene);

  const button = scene.querySelector(".hero-motion");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let paused = false;
  let inView = true;
  function sync() {
    scene.classList.toggle("is-animated", !reduced.matches);
    scene.classList.toggle("is-paused", paused || !inView);
    button.hidden = reduced.matches;
    button.dataset.paused = String(paused);
    button.setAttribute(
      "aria-label",
      paused ? "Play card animation" : "Pause card animation",
    );
  }
  button.addEventListener("click", () => {
    paused = !paused;
    sync();
  });
  reduced.addEventListener("change", sync);
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    sync();
  }).observe(scene);
  sync();
}
