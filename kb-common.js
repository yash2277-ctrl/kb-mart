// Shared builders for the KB Mart pages: people, vehicles and ambient occlusion.
// Plain script (not a module) so the pages also work when opened straight from disk.
window.KBC = (() => {
  const SHIRT = ['#f4f1ea', '#1f2a44', '#b3202a', '#3b5b86', '#e7a33e', '#2f6f6f', '#7a4b8c', '#d9c7a3', '#4c5a33', '#e2e6ec', '#c2185b', '#1b1b1d', '#8fb8de', '#f2d16b', '#ffffff', '#9c2f45'];
  const PANTS = ['#23395d', '#1b1b1d', '#3b4250', '#c9b48f', '#5b5f66', '#2d3a55', '#6b5a48', '#4a6fa5'];
  const DRESS = ['#c2185b', '#e67e22', '#16a085', '#b3202a', '#f1c40f', '#8e44ad', '#2980b9', '#f4a6b8', '#e8dcc4', '#27ae60', '#d35400', '#f5f0e6'];
  const ACCENT = ['#e0302b', '#f2b705', '#1f5fb3', '#ffffff', '#2e7d32', '#e67e22', '#c2185b', '#1b1b1d', '#d8b46a'];
  const SKIN = ['#8d5a3b', '#a8704a', '#c68b5e', '#6e452c', '#d6a27a', '#b57a52', '#9a6341'];
  const HAIR = ['#141110', '#1f1914', '#2b2019', '#3a2a1e', '#0d0d0d', '#4a3526'];

  const clean = (g) => { g = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(g.attributes)) if (!['position', 'normal'].includes(k)) g.deleteAttribute(k); return g; };
  function place(THREE, geo, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    const g = clean(geo.index ? geo.toNonIndexed() : geo.clone());
    g.scale(sx, sy, sz); g.rotateX(rx); g.rotateY(ry); g.rotateZ(rz); g.translate(x, y, z); return g;
  }
  // tapered cylinder from p0 (radius r0) to p1 (radius r1)
  function limb(THREE, p0, p1, r0, r1, seg = 8, keepUV = false) {
    const d = new THREE.Vector3().subVectors(p1, p0), len = d.length();
    const g = new THREE.CylinderGeometry(r1, r0, len, seg); g.translate(0, len / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
    g.translate(p0.x, p0.y, p0.z); return keepUV ? g : clean(g);
  }
  const joint = (THREE, p, r) => { const g = new THREE.SphereGeometry(r, 8, 6); g.translate(p.x, p.y, p.z); return clean(g); };
  function lathe(THREE, pts, sz = .66, seg = 14) {
    const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg); g.scale(1, 1, sz); return clean(g);
  }

  // Figure facing +z, feet at y = 0, ~1.7 m tall. Colour slots: top, bottom, skin, dark (hair + shoes), accent (bags, dupatta, backpack).
  function humanGeos(THREE, merge, pose) {
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const female = ['fWalk', 'fStand', 'shopper'].includes(pose), dress = pose === 'fWalk' || pose === 'fStand';
    const walking = ['mWalk', 'fWalk', 'shopper', 'student'].includes(pose);
    const S = { top: [], bottom: [], skin: [], dark: [], accent: [] };
    const sw = walking ? .34 : .04, hipW = female ? .085 : .095, shW = female ? .175 : .2;
    // legs: thigh + knee + shin + shoe
    for (const s of [-1, 1]) {
      const phi = s * sw, kappa = walking && s > 0 ? .28 : .05;
      const H = V(s * hipW, .88, 0), K = H.clone().add(V(0, -Math.cos(phi) * .44, Math.sin(phi) * .44));
      const A = K.clone().add(V(0, -Math.cos(phi - kappa) * .42, Math.sin(phi - kappa) * .42));
      const legSlot = dress ? 'skin' : 'bottom';
      S[legSlot].push(limb(THREE, H, K, .082, .064)); S[legSlot].push(joint(THREE, K, .064)); S[legSlot].push(limb(THREE, K, A, .062, .045));
      const shoe = new THREE.BoxGeometry(.1, .075, .25); shoe.translate(A.x, Math.max(.035, A.y - .02), A.z + .06); S.dark.push(clean(shoe));
    }
    // torso
    if (dress) {
      S.top.push(lathe(THREE, [[0, 1.46], [.06, 1.455], [.12, 1.42], [.165, 1.37], [.16, 1.25], [.135, 1.1], [.15, 1.0], [.2, .75], [.25, .45], [.27, .3], [0, .3]], .7));
      if (pose === 'fStand') S.accent.push(place(THREE, new THREE.BoxGeometry(.13, .9, .02), .02, 1.05, .11, .08, 0, .52));
      else S.accent.push(place(THREE, new THREE.BoxGeometry(.12, .7, .02), -.14, 1.15, -.12, -.1, 0, -.15));
    } else {
      S.top.push(lathe(THREE, [[0, 1.46], [.06, 1.455], [.13, 1.42], [shW - .01, 1.37], [shW - .025, 1.25], [female ? .13 : .155, 1.08], [female ? .15 : .155, .97], [0, .96]], .62));
      S.bottom.push(lathe(THREE, [[0, .97], [female ? .155 : .158, .97], [female ? .165 : .16, .9], [.14, .82], [0, .8]], .7));
    }
    // arms: sleeve (top) + forearm (skin) + hand
    for (const s of [-1, 1]) {
      const psi = walking ? -s * sw * .75 : .05, beta = walking ? .25 : .12;
      const Sh = V(s * shW, 1.37, 0), E = Sh.clone().add(V(s * .03, -Math.cos(psi) * .29, Math.sin(psi) * .29));
      const W = E.clone().add(V(s * .01, -Math.cos(psi + beta) * .26, Math.sin(psi + beta) * .26));
      S.top.push(joint(THREE, Sh, .062)); S.top.push(limb(THREE, Sh, E, .058, .048, 7));
      S[dress ? 'top' : 'skin'].push(limb(THREE, E, W, .044, .036, 7));
      S.skin.push(joint(THREE, W.clone().add(V(0, -.05, 0)), .045));
      if (pose === 'shopper' && s > 0) {
        const bag = new THREE.BoxGeometry(.3, .34, .11); bag.translate(W.x + .04, W.y - .26, W.z); S.accent.push(clean(bag));
        S.dark.push(place(THREE, new THREE.TorusGeometry(.07, .008, 4, 10, Math.PI), W.x + .04, W.y - .09, W.z));
      }
    }
    if (pose === 'student') { const bp = new THREE.BoxGeometry(.3, .42, .16); bp.translate(0, 1.15, -.17); S.accent.push(clean(bp)); }
    // neck, head, hair
    S.skin.push(limb(THREE, V(0, 1.43, 0), V(0, 1.52, .005), .048, .044, 7));
    S.skin.push(place(THREE, new THREE.SphereGeometry(.1, 14, 12), 0, 1.61, .01, 0, 0, 0, .9, 1.12, .98));
    S.skin.push(place(THREE, new THREE.SphereGeometry(.03, 6, 5), 0, 1.6, .105));
    const cap = new THREE.SphereGeometry(.108, 14, 8, 0, Math.PI * 2, 0, Math.PI * .52);
    S.dark.push(place(THREE, cap, 0, 1.63, -.012, -.28, 0, 0, .95, 1.05, 1.06));
    if (female) {
      S.dark.push(place(THREE, new THREE.SphereGeometry(.1, 10, 8), 0, 1.5, -.07, 0, 0, 0, 1.05, 1.6, .55));
      if (pose === 'shopper') S.dark.push(place(THREE, new THREE.SphereGeometry(.055, 8, 6), 0, 1.6, -.14));
    }
    const out = {}; for (const k in S) if (S[k].length) out[k] = merge(S[k]); return out;
  }

  const POSES = [['mWalk', .22], ['mStand', .13], ['fWalk', .18], ['fStand', .11], ['shopper', .17], ['student', .19]];
  const _cache = new Map();
  function crowd(THREE, merge, parent, n, sample, rnd, opts = {}) {
    const pick = a => a[Math.floor(rnd() * a.length)];
    const counts = {}, items = [];
    for (let i = 0; i < n; i++) { let t = rnd(), p = POSES[0][0]; for (const [k, w] of POSES) { if ((t -= w) < 0) { p = k; break; } } counts[p] = (counts[p] || 0) + 1; items.push([p, sample()]); }
    const mat = opts.mat || new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .8 });
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s3 = new THREE.Vector3(), c = new THREE.Color();
    for (const [pose] of POSES) {
      if (!counts[pose]) continue;
      if (!_cache.has(pose)) _cache.set(pose, humanGeos(THREE, merge, pose));
      const G = _cache.get(pose);
      const slots = Object.keys(G).map(k => { const im = new THREE.InstancedMesh(G[k], mat, counts[pose]); im.castShadow = opts.shadow !== false; im.receiveShadow = true; parent.add(im); return [k, im]; });
      let idx = 0;
      for (const [p, [pos, y, rot]] of items) {
        if (p !== pose) continue;
        const sc = (pose[0] === 'f' || pose === 'shopper' ? .95 : 1.02) * (.92 + rnd() * .12);
        q.setFromEuler(e.set(0, rot ?? rnd() * Math.PI * 2, 0)); s3.set(sc, sc, sc);
        m4.compose(new THREE.Vector3(pos.x, y, pos.z), q, s3);
        const dress = pose === 'fWalk' || pose === 'fStand';
        const cols = { top: dress ? pick(DRESS) : pick(SHIRT), bottom: pick(PANTS), skin: pick(SKIN), dark: pick(HAIR), accent: pick(ACCENT) };
        for (const [k, im] of slots) { im.setMatrixAt(idx, m4); im.setColorAt(idx, c.set(cols[k])); }
        idx++;
      }
    }
  }

  // ---------- trees, palms, shrubs (leaf-cluster cards with alpha) ----------
  function canvasTex(THREE, w, h, draw) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  }
  function leafTexture(THREE, tones, flowers) {
    const R = Math.random;
    return canvasTex(THREE, 256, 256, (g, w, h) => {
      for (let i = 0; i < 520; i++) {
        const ang = R() * 6.283, rad = Math.sqrt(R()) * w * .44, x = w / 2 + Math.cos(ang) * rad, y = h / 2 + Math.sin(ang) * rad;
        g.save(); g.translate(x, y); g.rotate(R() * 6.283);
        g.fillStyle = tones[Math.floor(R() * tones.length)]; g.globalAlpha = 1;
        g.beginPath(); g.ellipse(0, 0, 5 + R() * 5, 2.2 + R() * 1.8, 0, 0, 7); g.fill();
        g.restore();
      }
      if (flowers) for (let i = 0; i < 260; i++) { const ang = R() * 6.283, rad = Math.sqrt(R()) * w * .42; g.fillStyle = flowers[Math.floor(R() * flowers.length)]; g.beginPath(); g.arc(w / 2 + Math.cos(ang) * rad, h / 2 + Math.sin(ang) * rad, 2 + R() * 3, 0, 7); g.fill(); }
    });
  }
  function plantMats(THREE) {
    const leaf = (tones, flowers, x = {}) => new THREE.MeshStandardMaterial({ map: leafTexture(THREE, tones, flowers), alphaTest: .45, side: THREE.DoubleSide, roughness: .85, ...x });
    const frond = canvasTex(THREE, 512, 128, (g, w, h) => {
      g.strokeStyle = '#5b4a2a'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
      for (let x = 14; x < w - 6; x += 6) {
        const L = (h * .46) * Math.min(1, (w - x) / (w * .55)) * (.75 + Math.random() * .25);
        for (const s of [-1, 1]) { g.strokeStyle = ['#3f7a2c', '#4d8a34', '#35682a', '#5a9a3a'][Math.floor(Math.random() * 4)]; g.lineWidth = 3.2; g.beginPath(); g.moveTo(x, h / 2); g.quadraticCurveTo(x + 8, h / 2 + s * L * .5, x + 16, h / 2 + s * L); g.stroke(); }
      }
    });
    const bark = canvasTex(THREE, 64, 256, (g, w, h) => { g.fillStyle = '#6e5642'; g.fillRect(0, 0, w, h); for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '40,28,18' : '160,140,115'},${.15 + Math.random() * .25})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 4 + Math.random() * 14); } });
    bark.wrapS = bark.wrapT = THREE.RepeatWrapping;
    const palmBark = canvasTex(THREE, 64, 256, (g, w, h) => { for (let y = 0; y < h; y += 8) { g.fillStyle = y % 16 ? '#8a7258' : '#6d573f'; g.fillRect(0, y, w, 8); g.fillStyle = 'rgba(40,28,18,.4)'; g.fillRect(0, y + 6, w, 2); } });
    palmBark.wrapS = palmBark.wrapT = THREE.RepeatWrapping; palmBark.repeat.set(1, 6);
    return {
      leafA: leaf(['#3f7a2c', '#4d8a34', '#35682a', '#5a9a3a', '#2e5e22']),
      leafB: leaf(['#5f8f3a', '#6f9a3f', '#4f7f30', '#7ea84a', '#557a2d']),
      leafC: leaf(['#2f5a26', '#3b6e2e', '#2a4f22', '#46803a']),
      gulmohar: leaf(['#4d8a34', '#3f7a2c'], ['#e0442b', '#d9361f', '#f25a2e', '#c62f1a']),
      amaltas: leaf(['#6f9a3f', '#5f8f3a'], ['#f5d000', '#f2c230', '#ffe14d']),
      bougain: leaf(['#3f7a2c', '#4d8a34'], ['#d63384', '#e0439a', '#c2185b', '#f06bb0']),
      frond: new THREE.MeshStandardMaterial({ map: frond, alphaTest: .4, side: THREE.DoubleSide, roughness: .8 }),
      bark: new THREE.MeshStandardMaterial({ map: bark, roughness: .95 }),
      palmBark: new THREE.MeshStandardMaterial({ map: palmBark, roughness: .95 }),
    };
  }
  // Canopy cards with normals pointing away from the canopy centre, for soft rounded shading.
  function canopy(THREE, cx, cy, cz, rx, ry, n, card, rnd, out) {
    for (let i = 0; i < n; i++) {
      const u = rnd() * 2 - 1, th = rnd() * 6.283, k = .45 + .55 * Math.cbrt(rnd());
      const px = cx + Math.sqrt(1 - u * u) * Math.cos(th) * rx * k, py = cy + u * ry * k, pz = cz + Math.sqrt(1 - u * u) * Math.sin(th) * rx * k;
      const sz = card * (.75 + rnd() * .5), g = new THREE.PlaneGeometry(sz, sz);
      g.rotateX(rnd() * 3.14); g.rotateY(rnd() * 3.14); g.rotateZ(rnd() * 3.14); g.translate(px, py, pz);
      const p = g.attributes.position, nrm = g.attributes.normal, v = new THREE.Vector3();
      for (let j = 0; j < p.count; j++) { v.set(p.getX(j) - cx, (p.getY(j) - cy) * 1.3 + ry * .35, p.getZ(j) - cz).normalize(); nrm.setXYZ(j, v.x, v.y, v.z); }
      out.push(g);
    }
  }
  // returns { bark: [geos], leaf: [geos] }
  function treeGeos(THREE, x, z, s, rnd, opts = {}) {
    const h = (opts.h ?? 3.4) * s, bark = [], leaf = [];
    const lean = (rnd() - .5) * .12;
    const t = new THREE.CylinderGeometry(.13 * s, .28 * s, h, 8, 3); t.translate(0, h / 2, 0); t.rotateZ(lean); t.translate(x, 0, z); bark.push(t);
    const top = new THREE.Vector3(x - Math.sin(lean) * h, h, z);
    const nb = 3 + Math.floor(rnd() * 2), R = (opts.r ?? 2.6) * s;
    for (let k = 0; k < nb; k++) {
      const ang = k / nb * 6.283 + rnd() * .6, len = R * (.7 + rnd() * .3);
      const end = top.clone().add(new THREE.Vector3(Math.cos(ang) * len * .75, len * .6, Math.sin(ang) * len * .75));
      bark.push(limb(THREE, top.clone().add(new THREE.Vector3(0, -h * .15, 0)), end, .09 * s, .04 * s, 6, true));
      canopy(THREE, end.x, end.y + R * .1, end.z, R * .62, R * .5, Math.round(10 * (opts.density ?? 1)), 1.7 * s, rnd, leaf);
    }
    canopy(THREE, top.x, top.y + R * .75, top.z, R * .8, R * .55, Math.round(16 * (opts.density ?? 1)), 1.9 * s, rnd, leaf);
    return { bark, leaf };
  }
  function shrubGeos(THREE, x, z, s, rnd, y = 0) { const leaf = []; canopy(THREE, x, y + .55 * s, z, .9 * s, .55 * s, 9, 1.1 * s, rnd, leaf); return leaf; }
  // returns { trunk: [geos], frond: [geos] }
  function palmGeos(THREE, x, z, s, rnd, y0 = 0) {
    const h = (7 + rnd() * 3) * s, lean = (rnd() - .5) * .14, trunk = [], frond = [];
    const t = new THREE.CylinderGeometry(.19 * s, .3 * s, h, 10, 6); t.translate(0, h / 2, 0);
    const p = t.attributes.position; for (let i = 0; i < p.count; i++) { const yy = p.getY(i) / h; p.setX(i, p.getX(i) + Math.sin(yy * 2.5) * .25 * s * yy); }
    t.computeVertexNormals(); t.rotateZ(lean); t.translate(x, y0, z); trunk.push(t);
    const top = new THREE.Vector3(x - Math.sin(lean) * h, y0 + h, z);
    const crown = new THREE.SphereGeometry(.38 * s, 8, 6); crown.scale(1, 1.3, 1); crown.translate(top.x, top.y - .1, top.z); trunk.push(crown);
    const n = 16, rot0 = rnd() * 6.283;
    for (let i = 0; i < n; i++) {
      const young = i >= 12, L = (young ? 2.8 : 4.3 + rnd() * 1.3) * s, W = 1.9 * s;
      const f = new THREE.PlaneGeometry(L, W, 12, 2); f.translate(L / 2, 0, 0); f.rotateX(-Math.PI / 2);
      const fp = f.attributes.position, droop = young ? .4 : 1.6 + rnd() * 1.6, rise = young ? 2.2 : .9;
      for (let k = 0; k < fp.count; k++) { const u = fp.getX(k) / L, zz = fp.getZ(k); fp.setZ(k, zz * (1 - .5 * u)); fp.setY(k, rise * u * L / 5 * (1 - u) * 2 - droop * u * u * L / 5 + Math.abs(zz) * .35); }
      f.computeVertexNormals(); f.rotateY(rot0 + i * 2.4 + rnd() * .3); f.translate(top.x, top.y, top.z); frond.push(f);
    }
    return { trunk, frond };
  }

  // ---------- vehicles ----------
  function profile(THREE, pts, depth, bevel = .05) {
    const s = new THREE.Shape(); pts.forEach(([x, y], i) => i ? s.lineTo(x, y) : s.moveTo(x, y));
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 4 });
    g.translate(0, 0, -depth / 2); return g;
  }
  function wheel(THREE, parts, x, z, r = .33, w = .24) {
    const t = new THREE.CylinderGeometry(r, r, w, 16); t.rotateX(Math.PI / 2); t.translate(x, r, z); parts.push([t, 'tyre']);
    const h = new THREE.CylinderGeometry(r * .58, r * .58, w + .02, 12); h.rotateX(Math.PI / 2); h.translate(x, r, z); parts.push([h, 'rim']);
  }
  const box = (THREE, w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };

  // Returns [[geometry, slot]]; slots: body, glass, tyre, rim, head, tail, trim, accent, roof.
  // Vehicles point along +x, sit on y = 0.
  function vehicleParts(THREE, kind) {
    const P = [];
    if (kind === 'sedan' || kind === 'hatch' || kind === 'suv') {
      const suv = kind === 'suv', hatch = kind === 'hatch';
      const L = suv ? 2.35 : hatch ? 1.95 : 2.25, lift = suv ? .12 : 0;
      P.push([profile(THREE, [[-L, .3 + lift], [L - .05, .3 + lift], [L + .05, .55 + lift], [L, .8 + lift], [L * .45, .93 + lift], [-L * .78, .98 + lift], [-L, .9 + lift], [-L - .04, .6 + lift]], 1.66), 'body']);
      const cab = suv ? [[L * .42, .9 + lift], [L * .12, 1.5 + lift], [-L * .88, 1.53 + lift], [-L * .97, .95 + lift]]
        : hatch ? [[L * .42, .9], [L * .08, 1.42], [-L * .82, 1.44], [-L * .95, .95]]
          : [[L * .42, .9], [L * .12, 1.38], [-L * .42, 1.4], [-L * .78, .95]];
      P.push([profile(THREE, cab, 1.48, .04), 'glass']);
      const rx0 = cab[1][0], rx1 = cab[2][0];
      P.push([box(THREE, rx0 - rx1 - .1, .06, 1.5, (rx0 + rx1) / 2, cab[1][1] + .03, 0), 'body']);
      for (const s of [-1, 1]) P.push([box(THREE, .08, cab[1][1] - .9, .08, (cab[0][0] + cab[1][0]) / 2 + .02, (cab[1][1] + .92) / 2, s * .74), 'body']);
      for (const s of [-1, 1]) { P.push([box(THREE, .06, .14, .36, L + .06, .66 + lift, s * .58), 'head']); P.push([box(THREE, .06, .14, .4, -L - .08, .72 + lift, s * .56), 'tail']); }
      P.push([box(THREE, .06, .12, 1.1, L + .08, .45 + lift, 0), 'trim']);
      for (const x of [L * .6, -L * .62]) for (const s of [-1, 1]) wheel(THREE, P, x, s * .78, suv ? .38 : .33);
    } else if (kind === 'auto') {
      P.push([profile(THREE, [[-1.2, .28], [.9, .28], [1.25, .45], [1.25, .95], [.95, 1.0], [-1.2, 1.0]], 1.3, .04), 'accent']);
      P.push([profile(THREE, [[-1.25, 1.95], [.55, 1.95], [.95, 1.8], [1.05, 1.0], [.95, 1.0], [.8, 1.72], [-1.2, 1.78]], 1.34, .04), 'body']);
      P.push([box(THREE, .04, .7, 1.1, 1.0, 1.35, 0), 'glass']);
      for (const s of [-1, 1]) P.push([box(THREE, .05, .8, .05, -1.18, 1.4, s * .64), 'trim']);
      P.push([box(THREE, .5, .5, 1.2, -.7, .8, 0), 'trim']);
      P.push([box(THREE, .06, .14, .22, 1.27, .8, 0), 'head']);
      wheel(THREE, P, 1.0, 0, .26, .16); wheel(THREE, P, -.85, .62, .26, .16); wheel(THREE, P, -.85, -.62, .26, .16);
    } else if (kind === 'bus') {
      P.push([profile(THREE, [[-5.6, .45], [5.6, .45], [5.75, .8], [5.75, 3.0], [5.5, 3.2], [-5.6, 3.2]], 2.45, .06), 'body']);
      P.push([box(THREE, 10.6, .85, 2.5, -.2, 2.15, 0), 'glass']);
      P.push([box(THREE, .06, 1.5, 2.2, 5.79, 2.0, 0), 'glass']);
      P.push([box(THREE, 11.2, .25, 2.52, 0, 1.35, 0), 'accent']);
      P.push([box(THREE, 10.8, .15, 2.2, -.2, 3.3, 0), 'roof']);
      for (const s of [-1, 1]) { P.push([box(THREE, .06, .18, .35, 5.8, .9, s * .9), 'head']); P.push([box(THREE, .06, .25, .3, -5.68, 1.0, s * .95), 'tail']); }
      for (const x of [3.9, -3.6]) for (const s of [-1, 1]) wheel(THREE, P, x, s * 1.05, .48, .3);
    }
    return P;
  }
  const KINDS = [['sedan', 5], ['hatch', 4], ['suv', 3], ['auto', 3], ['bus', 1]];
  function randomKind(rnd, noBus) { const list = KINDS.filter(k => !(noBus && k[0] === 'bus')); const tot = list.reduce((a, k) => a + k[1], 0); let t = rnd() * tot; for (const [k, w] of list) { if ((t -= w) < 0) return k; } return 'sedan'; }
  const BODY = ['#f4f4f2', '#1d1f24', '#9aa1a8', '#b3202a', '#23395d', '#c7c9cc', '#5b5f66', '#e8dcc4', '#f4f4f2', '#8a1c1c', '#34495e'];
  function vehicleMats(THREE) {
    const std = (c, r, m, x = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...x });
    return {
      body: BODY.map(c => std(c, .3, .55)), glass: std('#141b24', .08, .8), tyre: std('#141414', .85, 0), rim: std('#b9bdc2', .3, .9),
      head: std('#ffffff', .2, 0, { emissive: '#fff4dc', emissiveIntensity: .2 }), tail: std('#6a0d0d', .3, 0, { emissive: '#ff2a1a', emissiveIntensity: .3 }),
      trim: std('#1c1c1e', .5, .2), accent: std('#1f8a3a', .45, .1), autoTop: std('#f2c230', .45, .1), roof: std('#e9e9e9', .5, .2),
      busBody: std('#f2f0ea', .35, .3), busAccent: std('#1f5fb3', .4, .2),
    };
  }
  function slotMat(VM, kind, slot, colorIdx) {
    if (slot === 'body') return kind === 'auto' ? VM.autoTop : kind === 'bus' ? VM.busBody : VM.body[colorIdx % VM.body.length];
    if (slot === 'accent') return kind === 'bus' ? VM.busAccent : VM.accent;
    return VM[slot];
  }
  function vehicleGroup(THREE, merge, VM, kind, colorIdx) {
    const g = new THREE.Group(), byMat = new Map();
    for (const [geo, slot] of vehicleParts(THREE, kind)) { const mt = slotMat(VM, kind, slot, colorIdx); if (!byMat.has(mt)) byMat.set(mt, []); byMat.get(mt).push(geo.index ? geo.toNonIndexed() : geo); }
    byMat.forEach((geos, mt) => { geos.forEach(x => x.clearGroups()); const m = new THREE.Mesh(merge(geos), mt); m.castShadow = true; m.receiveShadow = true; g.add(m); });
    g.userData.kind = kind; g.userData.len = kind === 'bus' ? 11.5 : kind === 'auto' ? 2.6 : 4.6;
    return g;
  }
  // transformed parts for static (batched) vehicles
  function vehicleStatic(THREE, VM, kind, colorIdx, matrix) {
    return vehicleParts(THREE, kind).map(([geo, slot]) => [geo.applyMatrix4(matrix), slotMat(VM, kind, slot, colorIdx)]);
  }

  // ---------- ambient occlusion that ignores glass, sky and helpers ----------
  function makeAO(THREE, GTAOPass, scene, camera, opts = {}) {
    const scale = opts.scale ?? (devicePixelRatio > 1.4 ? .5 : .75);
    const ao = new GTAOPass(scene, camera, Math.max(64, Math.ceil(innerWidth * devicePixelRatio * scale)), Math.max(64, Math.ceil(innerHeight * devicePixelRatio * scale)));
    ao.output = GTAOPass.OUTPUT.Default;
    ao.blendIntensity = opts.intensity ?? 1;
    ao.updateGtaoMaterial({ radius: opts.radius ?? 1, distanceExponent: 1, thickness: opts.thickness ?? 1, scale: 1, samples: 16, distanceFallOff: 1, screenSpaceRadius: false });
    ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, radiusExponent: 2, rings: 2, samples: 16 });
    const baseSetSize = ao.setSize.bind(ao);
    ao.setSize = (w, h) => { if (w > 0 && h > 0) baseSetSize(Math.ceil(w * scale), Math.ceil(h * scale)); };
    ao.overrideVisibility = function () {
      const cache = this._visibilityCache;
      this.scene.traverse(o => {
        cache.set(o, o.visible);
        const m = o.material;
        if (o.isPoints || o.isLine || o.isSprite || o.userData.noAO || (m && !Array.isArray(m) && (m.transparent || m.userData?.noAO))) o.visible = false;
      });
    };
    return ao;
  }

  // Watches the first few visible seconds; if the machine can't keep ~28 fps, calls onLow once.
  function autoQuality(onLow, minFps = 28) {
    let t0 = 0, n = 0, done = false;
    return () => {
      if (done || document.hidden) { t0 = 0; n = 0; return; }
      const now = performance.now(); if (!t0) { t0 = now; return; }
      n++; const el = (now - t0) / 1000;
      if (el > 4) { done = true; if (n / el < minFps) onLow(); }
    };
  }

  return { crowd, vehicleGroup, vehicleStatic, vehicleMats, randomKind, makeAO, autoQuality, plantMats, treeGeos, shrubGeos, palmGeos };
})();
