/* Drawing kit for the mock-ups.
   Any element with data-part="name" gets that drawing put inside it when the page loads.
   Extra data-* attributes adjust it (data-red, data-n="60", data-value="40", ...).
   Add data-live to make it keep changing like a live readout; data-rate="3" slows that down.
   Each screen is laid out on a fixed 1600x950 "stage" that gets scaled to fit the window. */
(() => {
  "use strict";

  // Repeatable random numbers, so a drawing looks the same on every reload.
  let seed = 11;
  const seeded = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let R = seeded; // switched to Math.random while redrawing live parts

  const f = (n) => Math.round(n * 10) / 10;
  const rad = (d) => (d * Math.PI) / 180;
  const num = (v, d) => (v === undefined || v === "" ? d : +v);
  const has = (o, k) => o[k] !== undefined;
  let uid = 0;

  // Angles are in degrees, 0 = straight up, going clockwise.
  const pt = (cx, cy, r, a) => [f(cx + r * Math.sin(rad(a))), f(cy - r * Math.cos(rad(a)))];
  const arc = (cx, cy, r, a0, a1) => {
    a1 = Math.min(a1, a0 + 359.9);
    const [x0, y0] = pt(cx, cy, r, a0), [x1, y1] = pt(cx, cy, r, a1);
    return `M${x0} ${y0}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`;
  };
  const sector = (cx, cy, r0, r1, a0, a1) => {
    const [a, b] = pt(cx, cy, r1, a0), [c, d] = pt(cx, cy, r1, a1);
    const [e, g] = pt(cx, cy, r0, a1), [h, i] = pt(cx, cy, r0, a0);
    const L = a1 - a0 > 180 ? 1 : 0;
    return `M${a} ${b}A${r1} ${r1} 0 ${L} 1 ${c} ${d}L${e} ${g}A${r0} ${r0} 0 ${L} 0 ${h} ${i}Z`;
  };
  const svg = (w, h, inner, cls = "", extra = "") =>
    `<svg class="hud ${cls}" viewBox="0 0 ${w} ${h}" ${extra}>${inner}</svg>`;
  const STRETCH = 'preserveAspectRatio="none"';

  // Rough outlines, good enough to read as "USA" and "Africa" at a glance.
  const AFRICA = "22,8 35,3 48,6 58,8 66,10 70,18 76,30 84,40 96,38 90,50 80,60 74,72 70,86 60,100 52,104 46,96 42,80 40,66 34,56 24,52 12,50 4,42 2,30 8,18";
  const USA = "6,14 40,18 80,20 100,18 110,14 118,22 128,20 140,12 152,8 156,16 146,30 140,40 136,50 128,60 124,68 132,84 128,90 120,78 110,70 96,72 90,80 84,92 78,88 70,74 56,72 44,62 30,60 18,52 8,40 4,26";

  const P = {};

  /* ---------- round pieces ---------- */

  // Number in the middle of a partial ring: the "25 / 40 / 60 / 75" dials.
  P.gauge = (o) => {
    const v = num(o.value, 40), red = has(o, "red") ? "r" : "", tr = red ? "tr" : "";
    return svg(100, 100,
      `<circle cx="50" cy="50" r="44" class="d dots"/>` +
      `<path d="${arc(50, 50, 44, 20, 20 + v * 2.2)}" class="thick ${red}"/>` +
      `<text x="50" y="59" class="num ${tr}" text-anchor="middle">${v}</text>`);
  };

  // Radar dial with a turning sweep and a few blips.
  P.radar = (o) => {
    const red = has(o, "red"), [lx, ly] = pt(50, 50, 46, 60);
    let s = `<circle cx="50" cy="50" r="46" class="d"/><circle cx="50" cy="50" r="31" class="d"/>` +
      `<circle cx="50" cy="50" r="16" class="d"/><path d="M50 4V96M4 50H96" class="d dots"/>`;
    s += `<g class="spin" style="animation-duration:${f(3 + R() * 4)}s">` +
      `<path d="M50 50L50 4A46 46 0 0 1 ${lx} ${ly}Z" class="sweep ${red ? "" : "grey"}"/>` +
      `<path d="M50 50L${lx} ${ly}" class="${red ? "r" : ""}"/></g>`;
    for (let i = 0; i < 4; i++) {
      const [x, y] = pt(50, 50, 8 + R() * 36, R() * 360);
      s += `<circle cx="${x}" cy="${y}" r="1.6" class="fr"/>`;
    }
    if (red) s += `<path d="${arc(50, 50, 38, R() * 360, R() * 360 + 120)}" class="r thick"/>`;
    return svg(100, 100, s);
  };

  // Ring of tick marks; data-rand gives uneven lengths, data-target adds a red crosshair.
  P.ticks = (o) => {
    const n = num(o.n, 60), r1 = num(o.r, 46), len = num(o.len, 8), rand = has(o, "rand");
    let w = "", r = "";
    for (let i = 0; i < n; i++) {
      const a = (i * 360) / n, l = rand ? len * (0.15 + R()) : len;
      const [x0, y0] = pt(50, 50, r1 - l, a), [x1, y1] = pt(50, 50, r1, a);
      if (has(o, "red") && R() < 0.18) r += `M${x0} ${y0}L${x1} ${y1}`;
      else w += `M${x0} ${y0}L${x1} ${y1}`;
    }
    let s = `<path d="${w}"/><path d="${r}" class="r"/>`;
    if (has(o, "inner")) s += `<circle cx="50" cy="50" r="${r1 - len - 4}" class="d"/>`;
    if (has(o, "target")) s += `<circle cx="50" cy="50" r="22" class="r"/><path d="M50 42V58M42 50H58"/>`;
    return svg(100, 100, s, has(o, "spin") ? "" : "");
  };

  // Rings made of broken arc pieces, each ring slowly turning.
  P.segs = (o) => {
    const min = num(o.min, 8), step = num(o.step, 6);
    let s = "";
    for (let r = 46, k = 0; r > min; r -= step, k++) {
      if (has(o, "guides")) s += `<circle cx="50" cy="50" r="${r}" class="d faint"/>`;
      let d = "", dr = "";
      for (let j = 0, n = 1 + Math.floor(R() * 3); j < n; j++) {
        const a = R() * 360, l = 25 + R() * 110, p = arc(50, 50, r, a, a + l);
        if (has(o, "red") && R() < 0.25) dr += p; else d += p;
      }
      const thick = R() < 0.3 ? "thick" : "";
      const spin = has(o, "still") ? "" : "spin";
      s += `<g class="${spin}" style="animation-duration:${f(8 + R() * 16)}s;animation-direction:${k % 2 ? "reverse" : "normal"}">` +
        `<path d="${d}" class="${thick}"/><path d="${dr}" class="r ${thick}"/></g>`;
    }
    if (has(o, "dot")) s += `<circle cx="50" cy="50" r="3" class="fw"/>`;
    return svg(100, 100, s);
  };

  // Thick broken bezel ring that goes around the big Download globe.
  P.bezel = () => {
    let s = "", a = 0;
    while (a < 350) {
      const l = 6 + R() * 40, red = R() < 0.1;
      s += `<path d="${arc(50, 50, 46, a, Math.min(a + l, 358))}" class="${red ? "r" : "d"}" style="stroke-width:${red ? 6 : 10}"/>`;
      a += l + 3 + R() * 14;
    }
    return svg(100, 100, `<g class="spin" style="animation-duration:90s">${s}</g>`);
  };

  // Wireframe globe. Its north-south lines are animated so it looks like it's turning.
  P.globe = (o) => {
    const lat = num(o.lat, 10), lon = num(o.lon, 8), tilt = num(o.tilt, 0.12), cls = has(o, "dim") ? "d" : "";
    let s = `<circle cx="50" cy="50" r="45" class="${has(o, "redrim") ? "r thick" : cls}"/>`;
    for (let i = 1; i < lat; i++) {
      const t = rad(-90 + (i * 180) / lat), y = 50 - 45 * Math.sin(t), rx = 45 * Math.cos(t);
      s += `<ellipse cx="50" cy="${f(y)}" rx="${f(rx)}" ry="${f(rx * tilt)}" class="${cls}"/>`;
    }
    for (let i = 0; i < lon; i++) {
      const red = has(o, "red") && i === 0 ? "r" : "";
      s += `<ellipse class="lon ${cls} ${red}" data-o="${((i * Math.PI) / lon).toFixed(3)}" cx="50" cy="50" rx="45" ry="45"/>`;
    }
    if (has(o, "orbit")) s += `<ellipse cx="50" cy="50" rx="47" ry="13" transform="rotate(-22 50 50)" class="r thick"/>`;
    return svg(100, 100, s, "globe");
  };

  // Ball of dots that turns (positions are moved every frame further down).
  P.dotsphere = (o) => {
    const n = num(o.n, 240), allRed = has(o, "red");
    let s = `<circle cx="50" cy="50" r="45" class="d faint"/>`;
    for (let i = 0; i < n; i++) s += `<circle r="0.9" class="${allRed || i % 11 === 0 ? "fr" : "fw"}"/>`;
    return svg(100, 100, s, "dotsphere");
  };

  // Sphere drawn as one line spiralling from pole to pole (front half only).
  P.spiral = () => {
    let d = "", pen = false;
    for (let i = 0, N = 900; i <= N; i++) {
      const t = i / N, la = -Math.PI / 2 + Math.PI * t, lo = 9 * 2 * Math.PI * t;
      if (Math.cos(lo) > 0) {
        d += `${pen ? "L" : "M"}${f(50 + 45 * Math.cos(la) * Math.sin(lo))} ${f(50 - 45 * Math.sin(la))}`;
        pen = true;
      } else pen = false;
    }
    return svg(100, 100, `<circle cx="50" cy="50" r="45"/><path d="${d}"/>`);
  };

  // Rings cut into blocks of different brightness.
  P.sectors = (o) => {
    const n = num(o.n, 16);
    let s = "";
    for (let r = 0; r < 5; r++)
      for (let i = 0; i < n; i++) {
        if (R() < 0.22) continue;
        const r0 = 10 + r * 7, a0 = (i * 360) / n, red = has(o, "red") && R() < 0.06;
        s += `<path d="${sector(50, 50, r0, r0 + 6, a0, a0 + 360 / n - 2)}" class="${red ? "fr" : "fg"}" ${red ? "" : `style="opacity:${f(0.12 + R() * 0.6)}"`}/>`;
      }
    return svg(100, 100, s);
  };

  // Chunky progress ring.
  P.progress = (o) => {
    const v = num(o.value, 75);
    return svg(100, 100,
      `<circle cx="50" cy="50" r="36" class="d" style="stroke-width:14;vector-effect:none;opacity:.4"/>` +
      `<path d="${arc(50, 50, 36, 0, v * 3.6)}" class="${has(o, "red") ? "r" : ""}" style="stroke-width:14;vector-effect:none"/>`);
  };

  // Circles made of different dash patterns.
  P.dashrings = (o) => {
    let s = "";
    for (let r = 46; r > 14; r -= 5)
      s += `<circle cx="50" cy="50" r="${r}" class="${has(o, "red") && R() < 0.2 ? "r" : "d"}" style="stroke-dasharray:${f(1 + R() * 6)} ${f(1 + R() * 4)}"/>`;
    return svg(100, 100, s);
  };

  // Cloud of specks in a circle.
  P.cloud = () => {
    let s = "";
    for (let i = 0; i < 320; i++) {
      const [x, y] = pt(50, 50, 45 * Math.sqrt(R()), R() * 360);
      s += `<circle cx="${x}" cy="${y}" r="${f(0.3 + R() * 0.6)}" class="${R() < 0.15 ? "fr" : "fw"}" style="opacity:${f(0.3 + R() * 0.7)}"/>`;
    }
    return svg(100, 100, s);
  };

  // Big shaded Earth for the Broadcast screen, with a red glow on one side.
  P.earth = () => {
    const id = ++uid;
    let s = `<defs>
      <radialGradient id="eg${id}" cx="42%" cy="40%" r="65%"><stop offset="0" stop-color="#6a6a6a"/><stop offset=".65" stop-color="#1d1d1d"/><stop offset="1" stop-color="#050505"/></radialGradient>
      <radialGradient id="er${id}" cx="10%" cy="30%" r="70%"><stop offset="0" stop-color="#ff4657" stop-opacity=".75"/><stop offset=".6" stop-color="#ff4657" stop-opacity="0"/></radialGradient>
      <clipPath id="ec${id}"><circle cx="50" cy="50" r="40"/></clipPath></defs>`;
    s += `<circle cx="50" cy="50" r="40" style="fill:url(#eg${id});stroke:none"/>`;
    s += `<g clip-path="url(#ec${id})">`;
    s += `<polygon points="${AFRICA}" transform="translate(42 38) scale(.36)" class="land"/>`;
    s += `<polygon points="${USA}" transform="translate(4 18) scale(.22) rotate(-8)" class="land" style="opacity:.6"/>`;
    for (let i = 0; i < 14; i++) {
      const [x, y] = pt(50, 50, 38 * Math.sqrt(R()), R() * 360);
      s += `<ellipse cx="${x}" cy="${y}" rx="${f(2 + R() * 6)}" ry="${f(0.6 + R() * 1.5)}" class="fw" style="opacity:.25;filter:blur(.6px)"/>`;
    }
    for (let i = 1; i < 12; i++) {
      const t = rad(-90 + (i * 180) / 12), y = 50 - 40 * Math.sin(t), rx = 40 * Math.cos(t);
      s += `<ellipse cx="50" cy="${f(y)}" rx="${f(rx)}" ry="${f(rx * 0.06)}" class="faint"/>`;
    }
    for (let i = 0; i < 10; i++) s += `<ellipse class="lon faint" data-r="40" data-o="${((i * Math.PI) / 10).toFixed(3)}" cx="50" cy="50" rx="40" ry="40"/>`;
    s += `</g><circle cx="50" cy="50" r="40" style="fill:url(#er${id});stroke:none"/>`;
    s += `<circle cx="50" cy="50" r="40"/><circle cx="50" cy="50" r="42.5" class="d"/>`;
    return svg(100, 100, s);
  };

  // Map outline filled with tiny dots, with a red target marker at (data-mx, data-my).
  P.map = (o) => {
    const usa = o.which === "usa", pts = usa ? USA : AFRICA, w = usa ? 160 : 100, h = usa ? 100 : 110, id = ++uid;
    let s = `<defs><pattern id="dp${id}" width="2" height="2" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".4" class="fd"/></pattern>` +
      `<clipPath id="cp${id}"><polygon points="${pts}"/></clipPath></defs>`;
    s += `<polygon points="${pts}" class="d" style="fill:url(#dp${id})"/><g clip-path="url(#cp${id})">`;
    for (let i = 0; i < 16; i++)
      s += `<path d="M${f(R() * w)} ${f(R() * h)}l${f((R() - 0.5) * 50)} ${f((R() - 0.5) * 50)}" class="d faint"/>`;
    s += `</g>`;
    if (has(o, "mx")) {
      const x = +o.mx, y = +o.my;
      s += `<circle cx="${x}" cy="${y}" r="13" class="fr" style="opacity:.25;filter:blur(3px)"/>` +
        `<rect x="${x - 8}" y="${y - 5}" width="16" height="10" class="r"/><circle cx="${x}" cy="${y}" r="3" class="r"/>` +
        `<path d="M${x} ${y - 6}V${y + 6}M${x - 6} ${y}H${x + 6}" class="r"/>`;
    }
    return svg(w, h, s);
  };

  /* ---------- charts and strips ---------- */

  // Bar chart strip. data-mirror centers the bars (sound-wave look), data-env="4" groups them in bursts.
  P.bars = (o) => {
    const w = num(o.w, 400), h = num(o.h, 40), n = num(o.n, 80), gap = w / n, bw = Math.max(1, gap * num(o.fill, 0.45));
    let s = "";
    for (let i = 0; i < n; i++) {
      let v = R();
      if (o.env) v *= Math.abs(Math.sin((i / n) * Math.PI * num(o.env, 4)));
      const bh = Math.max(1, v * h), y = has(o, "mirror") ? (h - bh) / 2 : h - bh;
      const red = has(o, "red") && R() < 0.14;
      s += `<rect x="${f(i * gap)}" y="${f(y)}" width="${f(bw)}" height="${f(bh)}" class="${red ? "fr" : has(o, "hollow") ? "" : "fw"}"/>`;
    }
    if (has(o, "base")) s += `<path d="M0 ${h - 0.5}H${w}" class="d"/>`;
    return svg(w, h, s, "", STRETCH);
  };

  // Thin stalks with a dot on top, around a center line.
  P.stems = (o) => {
    const w = num(o.w, 600), h = num(o.h, 60), n = num(o.n, 90), g = w / n;
    let s = `<path d="M0 ${h / 2}H${w}" class="d faint"/>`;
    for (let i = 0; i < n; i++) {
      const x = f(i * g + g / 2), y = f(4 + R() * (h - 8));
      s += `<path d="M${x} ${h / 2}V${y}" class="d"/><circle cx="${x}" cy="${y}" r="1.7" class="${R() < 0.15 ? "fr" : "fw"}"/>`;
    }
    return svg(w, h, s);
  };

  // Row of dots following a wave.
  P.dotwave = (o) => {
    const w = num(o.w, 400), h = num(o.h, 40), n = num(o.n, 80), k = num(o.k, 6), ph = num(o.phase, 0);
    let s = "";
    for (let i = 0; i < n; i++) {
      const x = f(2 + (i * (w - 4)) / (n - 1)), y = f(h / 2 + (h / 2 - 3) * Math.sin((i / n) * Math.PI * 2 * k + ph));
      s += `<circle cx="${x}" cy="${y}" r="1.4" class="${has(o, "red") && i % 9 === 0 ? "fr" : "fw"}"/>`;
    }
    return svg(w, h, s);
  };

  // Single line: data-type="sine" (default), "zig" or "ecg" (heartbeat).
  P.line = (o) => {
    const w = num(o.w, 400), h = num(o.h, 40), ph = num(o.phase, 0), type = o.type || "sine", pts = [];
    if (type === "ecg") {
      for (let x = 0; x <= w; x += 2) {
        const t = (((x + ph * 40) % 90) + 90) % 90 / 90;
        let y = h * 0.62;
        if (t > 0.3 && t < 0.35) y = h * 0.5;
        else if (t > 0.42 && t < 0.45) y = h * 0.05;
        else if (t >= 0.45 && t < 0.48) y = h * 0.95;
        pts.push(x, f(y));
      }
    } else if (type === "zig") {
      for (let x = 0, i = 0; x <= w; x += 7, i++) pts.push(x, f(i % 2 ? 3 + R() * 4 : h - 3 - R() * h * 0.3));
    } else {
      for (let x = 0; x <= w; x += 2) pts.push(x, f(h / 2 + (h / 2 - 2) * Math.sin((x / w) * Math.PI * 2 * num(o.k, 6) + ph)));
    }
    let s = `<polyline points="${pts.join(" ")}" class="${has(o, "red") ? "r" : ""}"/>`;
    if (has(o, "marks")) for (let i = 1; i < 8; i++) {
      const j = Math.floor((i / 8) * (pts.length / 2)) * 2;
      s += `<circle cx="${pts[j]}" cy="${pts[j + 1]}" r="2" class="fr"/>`;
    }
    return svg(w, h, s);
  };

  // Two dotted waves twisting around each other, joined by thin lines (DNA look).
  P.helix = (o) => {
    const w = num(o.w, 400), h = num(o.h, 50), n = num(o.n, 60), k = num(o.k, 3), ph = num(o.phase, 0);
    let s = "";
    for (let i = 0; i < n; i++) {
      const x = f(3 + (i * (w - 6)) / (n - 1)), t = (i / n) * Math.PI * 2 * k + ph;
      const y1 = f(h / 2 + (h / 2 - 3) * Math.sin(t)), y2 = f(h / 2 - (h / 2 - 3) * Math.sin(t));
      s += `<path d="M${x} ${y1}V${y2}" class="d faint"/><circle cx="${x}" cy="${y1}" r="1.5" class="fr"/><circle cx="${x}" cy="${y2}" r="1.5" class="fw"/>`;
    }
    return svg(w, h, s);
  };

  // Grid of blocks in different brightness, a few red.
  P.grid = (o) => {
    const c = num(o.cols, 24), r = num(o.rows, 3), w = num(o.w, 400), h = num(o.h, 40), cw = w / c, ch = h / r;
    let s = "";
    for (let y = 0; y < r; y++)
      for (let x = 0; x < c; x++) {
        const red = R() < 0.06;
        s += `<rect x="${f(x * cw + 1.5)}" y="${f(y * ch + 1.5)}" width="${f(cw - 3)}" height="${f(ch - 3)}" class="${red ? "fr" : "fw"}" style="opacity:${red ? 1 : f(0.08 + R() * 0.8)}"/>`;
      }
    return svg(w, h, s, "", STRETCH);
  };

  // Rows of dashes that read as "text" at a distance.
  P.dashes = (o) => {
    const w = num(o.w, 240), rows = num(o.rows, 6), h = num(o.h, rows * 10), rh = h / rows;
    let s = "";
    for (let r = 0; r < rows; r++) {
      const y = f(r * rh + rh / 2), maxx = w * (0.45 + R() * 0.55);
      let d = "", x = 0;
      while (x < maxx) {
        const l = 4 + R() * 40;
        d += `M${f(x)} ${y}H${f(Math.min(x + l, maxx))}`;
        x += l + 3 + R() * 6;
      }
      const red = has(o, "allred") || (has(o, "red") && R() < 0.2);
      s += `<path d="${d}" class="${red ? "r" : ""}" style="stroke-width:2"/>`;
    }
    return svg(w, h, s, "", STRETCH);
  };

  // Horizontal level meters.
  P.meters = (o) => {
    const rows = num(o.rows, 4), h = rows * 14;
    let s = "";
    for (let i = 0; i < rows; i++) {
      const y = i * 14 + 2;
      s += `<rect x="1" y="${y}" width="98" height="9" class="d"/>` +
        `<rect x="2" y="${y + 1}" width="${f(96 * (0.1 + 0.85 * R()))}" height="7" class="${R() < 0.15 ? "fr" : "fg"}" style="opacity:.75"/>`;
    }
    return svg(100, h, s, "", STRETCH);
  };

  // Row of small round dials: data-kind="ring" (default), "disc" or "radar".
  P.dials = (o) => {
    const n = num(o.n, 7), kind = o.kind || "ring";
    let s = "";
    for (let i = 0; i < n; i++) {
      const cx = i * 40 + 20;
      if (kind === "disc") {
        s += `<circle cx="${cx}" cy="20" r="15" class="d"/><path d="${sector(cx, 20, 4, 15, 0, 90 + R() * 200)}" class="fg" style="opacity:.55"/><circle cx="${cx}" cy="20" r="2.5" class="fw"/>`;
      } else if (kind === "radar") {
        const [x, y] = pt(cx, 20, 15, R() * 360);
        s += `<circle cx="${cx}" cy="20" r="15" class="d"/><circle cx="${cx}" cy="20" r="8" class="d"/><path d="M${cx} 20L${x} ${y}"/><path d="${arc(cx, 20, 11, R() * 360, R() * 360 + 90)}" class="r"/>`;
      } else {
        let d = "";
        for (let j = 0; j < 36; j++) {
          if (R() < 0.25) continue;
          const [x0, y0] = pt(cx, 20, 9, j * 10), [x1, y1] = pt(cx, 20, 15, j * 10);
          d += `M${x0} ${y0}L${x1} ${y1}`;
        }
        const a = R() * 360;
        s += `<path d="${d}" class="d"/><path d="${arc(cx, 20, 12, a, a + 40)}" class="r thick"/>`;
      }
    }
    return svg(n * 40, 40, s);
  };

  // Chain of stretched hexagons.
  P.chain = (o) => {
    const w = num(o.w, 400), h = num(o.h, 24);
    let d = "";
    for (let x = 0; x + 48 <= w; x += 60)
      d += `M${x} ${h / 2}L${x + 8} 2H${x + 40}L${x + 48} ${h / 2}L${x + 40} ${h - 2}H${x + 8}ZM${x + 48} ${h / 2}H${x + 60}`;
    return svg(w, h, `<path d="${d}" class="${has(o, "red") ? "r" : ""}"/>`);
  };

  // Blocks of tiny dot "letters".
  P.braille = (o) => {
    const cols = num(o.cols, 14), rows = num(o.rows, 3), w = cols * 10, h = rows * 14;
    let s = "";
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        for (let j = 0; j < 6; j++) {
          if (R() < 0.5) continue;
          s += `<rect x="${c * 10 + 2 + (j % 2) * 4}" y="${r * 14 + 2 + Math.floor(j / 2) * 4}" width="2.4" height="2.4" class="${has(o, "red") && R() < 0.06 ? "fr" : "fw"}"/>`;
        }
    return svg(w, h, s);
  };

  // Barcode-style strip.
  P.barcode = (o) => {
    const w = num(o.w, 400), h = num(o.h, 20);
    let s = "", x = 0;
    while (x < w) {
      const bw = 1 + R() * 3;
      if (R() < 0.7) s += `<rect x="${f(x)}" y="0" width="${f(bw)}" height="${h}" class="${R() < 0.1 ? "fr" : "fw"}" style="opacity:${f(0.4 + R() * 0.6)}"/>`;
      x += bw + 1 + R() * 3;
    }
    return svg(w, h, s, "", STRETCH);
  };

  /* ---------- icons ---------- */

  // Simple line icons on a 24x24 grid, drawn to match the kit's icon sheet.
  const ICONS = [
    '<path d="M12 2V22M2 12H22"/>',
    '<rect x="3" y="3" width="18" height="18"/><path d="M3 3L21 21M21 3L3 21"/><path d="M3 21L12 12L21 21Z" class="fw"/>',
    '<circle cx="12" cy="12" r="9" class="r"/><path d="M12 6V18M7 9L17 15M17 9L7 15" class="r"/>',
    '<circle cx="12" cy="12" r="9" class="dots"/><circle cx="12" cy="12" r="5" class="dots"/>',
    '<path d="M4 20V8M8 20V4M12 20V10M16 20V6M20 20V12"/>',
    '<path d="M6 5A9 9 0 0 0 6 19M18 5A9 9 0 0 1 18 19"/>',
    '<rect x="3" y="3" width="18" height="18"/><path d="M12 7L17 12L12 17L7 12Z"/>',
    '<path d="M3 8L8 3M3 13L13 3M3 18L18 3M8 21L21 8M13 21L21 13"/>',
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/>',
    '<path d="M7 4H17L22 12L17 20H7L2 12Z"/><path d="M7 4L12 12L17 4M2 12H22M7 20L12 12L17 20"/>',
    '<circle cx="12" cy="12" r="9"/><path d="M5 19L19 5"/>',
    '<path d="M3 6H21M3 10H21M3 14H21M3 18H21"/>',
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="1.5" class="fw"/><path d="M12 3V12"/>',
    '<rect x="3" y="3" width="18" height="18" class="fw"/><path d="M3 9L9 3M3 15L15 3M3 21L21 3M9 21L21 9M15 21L21 15" class="k"/>',
    '<rect x="3" y="3" width="18" height="18"/><path d="M3 3L21 21M21 3L3 21M12 3V21M3 12H21"/>',
    '<circle cx="12" cy="12" r="9" class="r"/><path d="M8 8L16 16M16 8L8 16" class="r"/>',
    '<circle cx="12" cy="12" r="9" class="dots"/>',
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="2" class="fw"/>',
    '<path d="M3 5L11 12L3 19ZM12 5L20 12L12 19Z" class="fr"/>',
    '<path d="M3 5H21M3 9H21M3 13H21M3 17H21M3 21H21"/>',
    '<circle cx="12" cy="12" r="9"/><path d="M12 3V21M3 12H21"/>',
    '<rect x="2" y="2" width="20" height="20" class="fr"/><path d="M7 7L17 17M17 7L7 17" class="k"/>',
    '<circle cx="12" cy="12" r="9" class="dots"/><path d="M8 8L16 16M16 8L8 16"/>',
    '<path d="M8.5 8.5A5 5 0 0 0 8.5 15.5M15.5 8.5A5 5 0 0 1 15.5 15.5M5 5A10 10 0 0 0 5 19M19 5A10 10 0 0 1 19 19"/><circle cx="12" cy="12" r="1.5" class="fw"/>',
    '<circle cx="12" cy="12" r="9"/><path d="M10 8L16 12L10 16Z" class="fw"/>',
    '<rect x="3" y="3" width="18" height="18"/><path d="M12 3L21 12L12 21L3 12Z"/>',
    '<path d="M4 4L20 20M20 4L4 20"/>',
    '<circle cx="12" cy="12" r="9" class="dots"/><circle cx="12" cy="12" r="5" class="fw"/>',
    '<path d="M4 4H16L20 8V20H8L4 16Z"/>',
    '<circle cx="12" cy="12" r="9"/><path d="M12 12V3A9 9 0 0 1 20 16Z" class="fw"/>',
    '<rect x="3" y="3" width="18" height="18"/><rect x="8" y="8" width="8" height="8" class="fw"/><path d="M3 3L8 8M21 3L16 8M3 21L8 16M21 21L16 16"/>',
    '<path d="M3 8V3H8M16 3H21V8M21 16V21H16M8 21H3V16"/>',
    '<circle cx="12" cy="12" r="9"/><path d="M6 6L18 18M9 4L20 15M4 9L15 20"/>',
    '<path d="M3 4L9 12L3 20M9 4L15 12L9 20M15 4L21 12L15 20"/>',
    '<circle cx="12" cy="12" r="9" class="dots"/><path d="M12 7V17M7 12H17"/>',
    '<path d="M2 4L12 12L2 20ZM22 4L12 12L22 20Z" class="fw"/>',
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3V8M12 16V21M3 12H8M16 12H21"/>',
    '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12H21M5 7H19M5 17H19"/>',
    '<path d="M3 3L10 10L3 10ZM21 21L14 14L21 14Z" class="fw"/>',
    '<path d="M7 7L17 17M17 7L7 17M12 3V21M3 12H21"/>',
    '<path d="M12 2L14 10L22 12L14 14L12 22L10 14L2 12L10 10Z"/>',
    '<circle cx="12" cy="12" r="9" class="r"/><circle cx="12" cy="12" r="4" class="fr"/>',
    '<rect x="3" y="3" width="18" height="18"/><circle cx="12" cy="12" r="5"/><path d="M3 21L21 3"/>',
    '<path d="M7 5A9 9 0 0 0 7 19M17 5A9 9 0 0 1 17 19"/><rect x="9" y="9" width="6" height="6"/>',
    '<path d="M3 7V3H7M17 3H21V7M21 17V21H17M7 21H3V17" class="dots"/>',
    '<circle cx="12" cy="12" r="9"/><path d="M12 12V3M12 12L4.2 16.5M12 12L19.8 16.5"/>',
    '<path d="M3 3L9 9M21 3L15 9M3 21L9 15M21 21L15 15"/>',
    '<rect x="3" y="3" width="18" height="18"/><path d="M8 12H16M12 8V16"/>',
    '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/>',
    '<circle cx="12" cy="7" r="4" class="fw"/><circle cx="7" cy="16" r="4" class="fw"/><circle cx="17" cy="16" r="4" class="fw"/>',
    '<circle cx="12" cy="12" r="9"/><path d="M6 18L18 6"/>',
    '<rect x="3" y="3" width="18" height="18"/><path d="M3 21L21 3"/>',
    '<path d="M12 3L21 20H3Z" class="fr"/><path d="M12 9V14M12 16V17.5" class="k"/>',
    '<path d="M3 4H21L12 20Z"/><circle cx="12" cy="9.5" r="3"/>',
    '<rect x="3" y="3" width="18" height="18" class="fw"/><path d="M12 5L19 12L12 19L5 12Z" class="fk"/>',
    '<rect x="3" y="3" width="18" height="18" class="fw"/><path d="M8 6L16 12L8 18Z" class="fk"/>',
    '<rect x="3" y="3" width="18" height="18" class="fr"/><circle cx="12" cy="12" r="6" class="fk"/>',
    '<path d="M3 3H21V21Z" class="fw"/><path d="M3 3V21H21"/>',
    '<circle cx="12" cy="12" r="9" class="fw"/><path d="M12 12L12 3A9 9 0 0 1 19.8 7.5ZM12 12L19.8 16.5A9 9 0 0 1 4.2 16.5ZM12 12L4.2 7.5A9 9 0 0 1 12 3Z" class="fk"/>',
    '<path d="M12 3V21M3 12H21" class="dots"/>',
    '<path d="M3 12H21"/><circle cx="12" cy="12" r="9"/>',
    '<path d="M2 8L6 4L10 8L14 4L18 8L22 4M2 14L6 10L10 14L14 10L18 14L22 10M2 20L6 16L10 20L14 16L18 20L22 16"/>',
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="6.5" r="1.3" class="fw"/><circle cx="7.5" cy="14.5" r="1.3" class="fw"/><circle cx="16.5" cy="14.5" r="1.3" class="fw"/>',
    '<path d="M9 3H15V9H21V15H15V21H9V15H3V9H9Z" class="fw"/>',
    '<rect x="3" y="3" width="18" height="18"/><path d="M8 8L16 16M16 8L8 16"/>',
    '<rect x="3" y="3" width="18" height="18" class="fw"/><path d="M8 8L16 16M16 8L8 16" class="k"/>',
    '<circle cx="12" cy="12" r="9"/><path d="M3 12A9 9 0 0 0 21 12Z" class="fw"/>',
  ];
  P.icon = (o) => svg(24, 24, ICONS[num(o.i, 0) % ICONS.length], "icon" + (has(o, "red") ? " redicon" : ""));

  /* ---------- putting it on the page ---------- */

  let lons = [], spheres = [], live = [];

  function render(root = document) {
    root.querySelectorAll("[data-part]").forEach((el) => {
      const fn = P[el.dataset.part];
      if (!fn) return console.warn("unknown part:", el.dataset.part);
      el.innerHTML = fn(el.dataset);
      el.classList.add("part");
    });
    lons = [...document.querySelectorAll("ellipse.lon")];
    spheres = [...document.querySelectorAll("svg.dotsphere")].map((s) => [...s.querySelectorAll("circle")].slice(1));
    live = [...document.querySelectorAll("[data-live]")];
  }

  let lastSlow = 0;
  function frame(t) {
    const s = t / 1000;
    for (const e of lons) {
      const r = num(e.dataset.r, 45);
      e.setAttribute("rx", f(r * Math.abs(Math.cos(s * 0.35 + +e.dataset.o))));
    }
    for (const dots of spheres) {
      const n = dots.length;
      dots.forEach((d, i) => {
        const y = 1 - (2 * (i + 0.5)) / n, rr = Math.sqrt(1 - y * y), th = i * 2.39996 + s * 0.4;
        d.setAttribute("cx", f(50 + 45 * Math.cos(th) * rr));
        d.setAttribute("cy", f(50 + 45 * y));
        d.style.opacity = Math.sin(th) > 0 ? 1 : 0.15;
      });
    }
    if (t - lastSlow > 150) {
      lastSlow = t;
      R = Math.random;
      for (const el of live) {
        el._tick = (el._tick || 0) + 1;
        if (el._tick % num(el.dataset.rate, 1)) continue;
        el.dataset.phase = f(num(el.dataset.phase, 0) + num(el.dataset.speed, 0.3));
        el.innerHTML = P[el.dataset.part](el.dataset);
      }
      R = seeded;
    }
    requestAnimationFrame(frame);
  }

  // Scale the fixed 1600x950 stage to fit the window, centered.
  function fit() {
    const st = document.querySelector(".stage");
    if (!st) return;
    const k = Math.min(innerWidth / 1600, innerHeight / 950);
    st.style.transform = `translate(${f((innerWidth - 1600 * k) / 2)}px,${f((innerHeight - 950 * k) / 2)}px) scale(${k})`;
  }

  addEventListener("resize", fit);
  // Pass number-key presses up to the tabbed window, so 1-8 switch tabs even after clicking a screen.
  addEventListener("keydown", (e) => {
    if (window.top !== window && /^[1-9]$/.test(e.key)) window.top.postMessage({ tab: +e.key }, location.origin);
  });
  document.addEventListener("DOMContentLoaded", () => {
    render();
    fit();
    requestAnimationFrame(frame);
  });

  window.HUD = { P, ICONS, render, fit };
})();
