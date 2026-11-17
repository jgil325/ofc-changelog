const GOLD = "255, 199, 44";
const LIGHT = "255, 231, 157";
const FIELD_CARD = [
  {
    x: -174,
    y: 16,
    angle: -0.32,
    tilt: 0.52,
    yaw: -0.58,
    suit: "♦",
    width: 157,
    opacity: 0.44,
  },
  {
    x: 169,
    y: 34,
    angle: 0.3,
    tilt: 0.54,
    yaw: -0.39,
    suit: "♣",
    width: 164,
    opacity: 0.52,
  },
  {
    x: 1,
    y: -9,
    angle: -0.1,
    tilt: 0.52,
    yaw: -0.43,
    suit: "♠",
    width: 191,
    opacity: 1,
  },
];

function noise(seed) {
  const value = Math.sin(seed * 124.67 + 0.76) * 43758.5453;
  return value - Math.floor(value);
}

function cardTransform(card, shift) {
  const turn = card.angle + shift * 0.022;
  const yaw = card.yaw + shift * 0.085;
  return (u, v) => {
    const x = u * Math.cos(turn) - v * Math.sin(turn);
    const y = u * Math.sin(turn) + v * Math.cos(turn);
    const depth = x * Math.sin(yaw) - y * Math.sin(card.tilt);
    const perspective = 1 / (1 + depth / 980);
    return [
      card.x + x * Math.cos(yaw) * perspective,
      card.y + y * Math.cos(card.tilt) * perspective,
    ];
  };
}

function suitDots(suit) {
  const tile = document.createElement("canvas");
  tile.width = 124;
  tile.height = 124;
  const pen = tile.getContext("2d");
  if (!pen) return [];
  pen.font = "102px Georgia, serif";
  pen.textAlign = "center";
  pen.textBaseline = "middle";
  pen.fillText(suit, 62, 67);
  const mask = pen.getImageData(0, 0, 124, 124).data;
  const dots = [];
  for (let y = 2; y < 124; y += 4) {
    for (let x = 2; x < 124; x += 4) {
      if (mask[(y * 124 + x) * 4 + 3] > 110) dots.push([x - 62, y - 62]);
    }
  }
  return dots;
}

function dot(ctx, x, y, radius, rgb, opacity) {
  ctx.fillStyle = `rgba(${rgb}, ${opacity})`;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawCard(ctx, card, project, symbol) {
  const width = card.width / 2;
  const height = card.width * 0.714;
  const corners = [
    project(-width, -height),
    project(width, -height),
    project(width, height),
    project(-width, height),
  ];

  const face = ctx.createLinearGradient(
    corners[0][0],
    corners[0][1],
    corners[2][0],
    corners[2][1],
  );
  face.addColorStop(0, `rgba(71, 56, 28, ${0.64 * card.opacity})`);
  face.addColorStop(0.48, "rgba(19, 19, 19, .96)");
  face.addColorStop(1, `rgba(79, 58, 23, ${0.46 * card.opacity})`);
  ctx.beginPath();
  ctx.moveTo(...corners[0]);
  for (const point of corners.slice(1)) ctx.lineTo(...point);
  ctx.closePath();
  ctx.fillStyle = face;
  ctx.fill();
  ctx.strokeStyle = `rgba(${GOLD}, ${0.63 * card.opacity})`;
  ctx.lineWidth = card.opacity > 0.9 ? 1.45 : 1;
  ctx.stroke();

  for (let u = -width + 4; u < width; u += 5.5) {
    for (let v = -height + 4; v < height; v += 5.5) {
      const [x, y] = project(u, v);
      const intensity = noise(u * 11 + v * 3);
      dot(ctx, x, y, 0.56, GOLD, (0.085 + intensity * 0.14) * card.opacity);
    }
  }
  for (const [u, v] of symbol) {
    const [x, y] = project(u * 0.95, v * 0.95);
    dot(
      ctx,
      x,
      y,
      card.opacity > 0.9 ? 1.31 : 1.01,
      LIGHT,
      (0.55 + noise(u + v * 11) * 0.36) * card.opacity,
    );
  }
  const rank = project(-width + 14, -height + 21);
  ctx.fillStyle = `rgba(${LIGHT}, ${0.92 * card.opacity})`;
  ctx.font = "700 17px monospace";
  ctx.fillText("A", ...rank);
  for (const [u, v] of [
    [-width, -height],
    [width, height],
  ]) {
    const [x, y] = project(u, v);
    dot(ctx, x, y, 2, LIGHT, card.opacity);
  }
}

export function drawHero(canvas) {
  const ctx = canvas?.getContext("2d");
  if (!ctx) return;
  const hero = canvas.closest(".hero");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const symbols = new Map(FIELD_CARD.map(({ suit }) => [suit, suitDots(suit)]));
  let width = 0;
  let height = 0;
  let resolution = 1;
  let shift = 0;
  let target = 0;
  let frame = 0;

  function draw() {
    frame = 0;
    shift += (target - shift) * 0.14;
    ctx.setTransform(resolution, 0, 0, resolution, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const mobile = width <= 540;
    const compact = width <= 790;
    const x = width * (mobile ? 0.72 : compact ? 0.78 : 0.73);
    const y = height * (mobile ? 0.76 : 0.54);
    const size = Math.min(height / 440, width / (compact ? 620 : 1050), 1.27);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size, size);

    const glow = ctx.createRadialGradient(0, 0, 10, 0, 0, 340);
    glow.addColorStop(0, "rgba(179, 116, 24, .15)");
    glow.addColorStop(1, "rgba(179, 116, 24, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(-340, -340, 680, 680);

    for (let ring = 0; ring < 5; ring++) {
      const r = 220 + ring * 55;
      ctx.beginPath();
      ctx.ellipse(14, 68, r, r * 0.32, -0.29, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${GOLD}, ${0.15 - ring * 0.026})`;
      ctx.lineWidth = 0.85;
      ctx.setLineDash([2, 8]);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    for (let i = 0; i < 570; i++) {
      const x = (noise(i * 7 + 6) - 0.5) * 850;
      const y = (noise(i * 7 + 9) - 0.5) * 520;
      const falloff = Math.max(0, 1 - Math.hypot(x / 475, y / 275));
      const highlight = noise(i * 7 + 10);
      dot(
        ctx,
        x + shift * y * 0.026,
        y,
        highlight > 0.96 ? 1.5 : 0.57,
        highlight > 0.7 ? GOLD : "153, 155, 162",
        (0.16 + highlight * 0.64) * falloff,
      );
    }
    for (const card of FIELD_CARD)
      drawCard(ctx, card, cardTransform(card, shift), symbols.get(card.suit));
    ctx.restore();

    if (Math.abs(target - shift) > 0.008) frame = requestAnimationFrame(draw);
  }

  const queue = () => {
    if (!frame) frame = requestAnimationFrame(draw);
  };
  new ResizeObserver(() => {
    const box = canvas.getBoundingClientRect();
    width = box.width;
    height = box.height;
    resolution = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * resolution);
    canvas.height = Math.round(height * resolution);
    queue();
  }).observe(hero);
  hero.addEventListener("pointermove", (event) => {
    if (reduced.matches || event.pointerType === "touch") return;
    const box = hero.getBoundingClientRect();
    target = ((event.clientX - box.left) / box.width) * 2 - 1;
    queue();
  });
  hero.addEventListener("pointerleave", () => {
    target = 0;
    queue();
  });
}
