/* Phone3D — procedural Huawei Mate 30 Pro built with Three.js from official textures.
   Units: cm. Body 7.31 x 15.81 x 0.88 (official dimensions). Back/colours: official Huawei renders.
   Not a scanned model: the frame, the curved-glass profile, lens stack and buttons are modelled here. */
(function () {
  const TH = window.THREE;
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const W = 7.31, H = 15.81, D = 0.88, BX = 0.5, BZ = 0.38, RC = 0.95;
  const COLORS = [
    { name: "silver", img: "assets/huawei/mate30-pro-4g-design-pic-silver-2x.png", frame: 0xb7bbd8, ring: 0xc3c4e2, glow: 0x8fa4ff },
    { name: "black",  img: "assets/huawei/mate30-pro-4g-design-pic-black-2x.png",  frame: 0x1a1c21, ring: 0x272a31, glow: 0xff9a55 },
    { name: "green",  img: "assets/huawei/mate30-pro-4g-design-pic-green-2x.png",  frame: 0x0f8f86, ring: 0x1b968d, glow: 0x00e0c0 },
    { name: "purple", img: "assets/huawei/mate30-pro-4g-design-pic-purple-2x.png", frame: 0x5d3166, ring: 0x6f3f78, glow: 0xc060ff },
  ];
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const sstep = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const eio = (x) => { x = clamp(x, 0, 1); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const eout = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 4);
  const ein = (x) => { x = clamp(x, 0, 1); return x * x * x; };
  const lerp = (a, b, k) => a + (b - a) * k;
  // keyframes [[t, v, ease?], ...]; the ease of a key shapes the segment that ends on it
  function K(keys, t) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) { const a = keys[i - 1], b = keys[i], u = (t - a[0]) / (b[0] - a[0]); return lerp(a[1], b[1], (b[2] || eio)(u)); }
    }
    return keys[keys.length - 1][1];
  }
  const loadImg = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });

  function makeRig(canvas) {
    const renderer = new TH.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1); renderer.setSize(canvas.width, canvas.height, false); renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = TH.SRGBColorSpace; renderer.toneMapping = TH.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    const scene = new TH.Scene(); const camera = new TH.PerspectiveCamera(28, canvas.width / canvas.height, 0.5, 400);
    const c = document.createElement("canvas"); c.width = 1024; c.height = 512; const g = c.getContext("2d");
    const grad = g.createLinearGradient(0, 0, 0, 512); grad.addColorStop(0, "#1c2733"); grad.addColorStop(.5, "#0a0e14"); grad.addColorStop(1, "#05070a"); g.fillStyle = grad; g.fillRect(0, 0, 1024, 512);
    const strip = (x, y, w, h, col, blur) => { g.save(); g.filter = "blur(" + blur + "px)"; g.fillStyle = col; g.fillRect(x, y, w, h); g.restore(); };
    strip(120, 60, 90, 360, "#ffffff", 10); strip(420, 20, 200, 60, "#bfeaff", 8); strip(760, 80, 70, 340, "#e8e4e0", 10);
    strip(560, 300, 160, 40, "#00d4c8", 12); strip(0, 200, 60, 200, "#5a2a12", 14); strip(940, 150, 70, 240, "#9fb8ff", 12);
    const tex = new TH.CanvasTexture(c); tex.mapping = TH.EquirectangularReflectionMapping; tex.colorSpace = TH.SRGBColorSpace;
    const pm = new TH.PMREMGenerator(renderer); scene.environment = pm.fromEquirectangular(tex).texture; pm.dispose();
    const key = new TH.DirectionalLight(0xfff0e0, 2.2); key.position.set(-20, 25, 30); scene.add(key);
    const rim = new TH.DirectionalLight(0x6fd8ff, 2.6); rim.position.set(25, 5, -25); scene.add(rim);
    const rim2 = new TH.DirectionalLight(0xff7a30, 0.8); rim2.position.set(-25, -10, -20); scene.add(rim2);
    scene.add(new TH.AmbientLight(0x6070a0, 0.25));
    const gc = document.createElement("canvas"); gc.width = gc.height = 256; { const gg = gc.getContext("2d"); const r = gg.createRadialGradient(128, 128, 0, 128, 128, 128); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(.4, "rgba(255,255,255,.35)"); r.addColorStop(1, "rgba(255,255,255,0)"); gg.fillStyle = r; gg.fillRect(0, 0, 256, 256); }
    const glowMat = new TH.SpriteMaterial({ map: new TH.CanvasTexture(gc), color: 0x8fa4ff, transparent: true, depthWrite: false, blending: TH.AdditiveBlending, opacity: 0.5 });
    const glow = new TH.Sprite(glowMat); glow.position.set(0, 0, -14); glow.scale.set(60, 60, 1); scene.add(glow);
    return { renderer, scene, camera, key, rim, rim2, glow, glowMat };
  }

  // cross-section of the curved glass / back (same ellipse as the body bevel), offset outwards by `off`
  function crossSection(sign, off) {
    const pts = [], A = BX + off, B = BZ + off, hx = W / 2 - BX, zc = D / 2 - BZ, N = 16, F = 8;
    for (let i = 0; i <= N; i++) { const p = (1 - i / N) * Math.PI / 2; pts.push([-hx - A * Math.sin(p), sign * (zc + B * Math.cos(p))]); }
    for (let i = 1; i < F; i++) pts.push([-hx + (2 * hx) * i / F, sign * (D / 2 + off)]);
    for (let i = 0; i <= N; i++) { const p = (i / N) * Math.PI / 2; pts.push([hx + A * Math.sin(p), sign * (zc + B * Math.cos(p))]); }
    return pts;
  }
  function skinGeometry(sign, off, flipU) {
    const cs = crossSection(sign, off), ny = 140, pos = [], uv = [], idx = [];
    let tot = 0; const cum = [0]; for (let i = 1; i < cs.length; i++) { tot += Math.hypot(cs[i][0] - cs[i - 1][0], cs[i][1] - cs[i - 1][1]); cum.push(tot); }
    for (let j = 0; j <= ny; j++) {
      const v = j / ny, y = H / 2 - v * H; let yy = y; const e = Math.abs(y) - (H / 2 - BX);
      const cyy = Math.abs(y) - (H / 2 - RC), sq = cyy > 0 ? ((W / 2 - RC) + Math.sqrt(Math.max(0, RC * RC - cyy * cyy))) / (W / 2) : 1;
      for (let i = 0; i < cs.length; i++) {
        let x = cs[i][0], z = cs[i][1];
        if (e > 0) { const p = Math.min(1, e / (BX + off)), a = p * Math.PI / 2; yy = Math.sign(y) * ((H / 2 - BX) + (BX + off) * Math.sin(a)); z = z - Math.sign(z) * (BZ + off) * (1 - Math.cos(a)); }
        pos.push(x * sq, yy, z); const u = cum[i] / tot; uv.push(flipU ? 1 - u : u, 1 - v);
      }
    }
    const nx = cs.length;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1; if (sign > 0) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c); }
    const g = new TH.BufferGeometry(); g.setAttribute("position", new TH.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new TH.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }


  // ---- smooth normals for a non-indexed geometry (merge by position) ----
  function smoothNormals(g) {
    const pos = g.attributes.position, n = pos.count, acc = new Map(), key = (i) => Math.round(pos.getX(i) * 2000) + "," + Math.round(pos.getY(i) * 2000) + "," + Math.round(pos.getZ(i) * 2000);
    const va = new TH.Vector3(), vb = new TH.Vector3(), vc = new TH.Vector3(), fn = new TH.Vector3();
    for (let i = 0; i < n; i += 3) {
      va.fromBufferAttribute(pos, i); vb.fromBufferAttribute(pos, i + 1); vc.fromBufferAttribute(pos, i + 2);
      fn.subVectors(vc, vb).cross(new TH.Vector3().subVectors(va, vb));
      for (let k = 0; k < 3; k++) { const kk = key(i + k); const a = acc.get(kk) || new TH.Vector3(); a.add(fn); acc.set(kk, a); }
    }
    const nr = new Float32Array(n * 3), t = new TH.Vector3();
    for (let i = 0; i < n; i++) { t.copy(acc.get(key(i))).normalize(); nr[i * 3] = t.x; nr[i * 3 + 1] = t.y; nr[i * 3 + 2] = t.z; }
    g.setAttribute("normal", new TH.BufferAttribute(nr, 3)); return g;
  }
  // arc length of the side bevel (ellipse BX x BZ) up to a horizontal offset d: used so artwork wraps the curved glass without stretching
  const ARC_D = [], ARC_L = [];
  (function () { const N = 96; let L = 0, px = 0, pz = BZ; ARC_D.push(0); ARC_L.push(0); for (let i = 1; i <= N; i++) { const f = i / N * Math.PI / 2, x = BX * Math.sin(f), z = BZ * Math.cos(f); L += Math.hypot(x - px, z - pz); px = x; pz = z; ARC_D.push(x); ARC_L.push(L); } })();
  function arcLen(d) { d = Math.min(Math.max(d, 0), BX); let i = 1; while (i < ARC_D.length - 1 && ARC_D[i] < d) i++; const a = ARC_D[i - 1], b = ARC_D[i], k = b > a ? (d - a) / (b - a) : 0; return ARC_L[i - 1] + (ARC_L[i] - ARC_L[i - 1]) * k; }
  // front / back skin = the body's own front-facing (or back-facing) triangles, pushed out by `off`, with wrap-around UVs
  function skinFromBody(body, sign, off, flipU, flatV) {
    const pos = body.attributes.position, P = [], va = new TH.Vector3(), vb = new TH.Vector3(), vc = new TH.Vector3(), fn = new TH.Vector3();
    for (let i = 0; i < pos.count; i += 3) {
      va.fromBufferAttribute(pos, i); vb.fromBufferAttribute(pos, i + 1); vc.fromBufferAttribute(pos, i + 2);
      fn.subVectors(vc, vb).cross(new TH.Vector3().subVectors(va, vb)).normalize();
      const hz = (D - 2 * BZ) / 2 - 1e-3; if (sign * va.z >= hz && sign * vb.z >= hz && sign * vc.z >= hz) P.push(va.x, va.y, va.z, vb.x, vb.y, vb.z, vc.x, vc.y, vc.z);
    }
    const g = new TH.BufferGeometry(); g.setAttribute("position", new TH.BufferAttribute(new Float32Array(P), 3)); smoothNormals(g);
    const gp = g.attributes.position, gn = g.attributes.normal, n = gp.count, uv = new Float32Array(n * 2), hx = W / 2 - BX, S = 2 * (hx + arcLen(BX));
    for (let i = 0; i < n; i++) {
      const x = gp.getX(i), y = gp.getY(i), ax = Math.abs(x), sx = Math.sign(x) * (ax <= hx ? ax : hx + arcLen(ax - hx)); let u = (sx + S / 2) / S; if (flipU) u = 1 - u;
      const v = flatV ? Math.min(1, Math.max(0, 0.5 + y / (H - 2 * BX))) : 0.5 + y / H; uv[i * 2] = u; uv[i * 2 + 1] = v;
      gp.setXYZ(i, gp.getX(i) + gn.getX(i) * off, gp.getY(i) + gn.getY(i) * off, gp.getZ(i) + gn.getZ(i) * off);
    }
    g.setAttribute("uv", new TH.BufferAttribute(uv, 2)); return g;
  }

  const UIW = 760, UIH = 1560;
  function createPhone(imgs, withUI) {
    const grp = new TH.Group(), inner = new TH.Group(); grp.add(inner);
    const sh = new TH.Shape(), bw = W - 2 * BX, bh = H - 2 * BX, br = RC - BX, hx = bw / 2, hy = bh / 2;
    sh.moveTo(-hx + br, -hy); sh.absarc(hx - br, -hy + br, br, -Math.PI / 2, 0, false); sh.absarc(hx - br, hy - br, br, 0, Math.PI / 2, false); sh.absarc(-hx + br, hy - br, br, Math.PI / 2, Math.PI, false); sh.absarc(-hx + br, -hy + br, br, Math.PI, Math.PI * 1.5, false);
    const bodyGeo = new TH.ExtrudeGeometry(sh, { depth: D - 2 * BZ, bevelEnabled: true, bevelThickness: BZ, bevelSize: BX, bevelSegments: 12, curveSegments: 18, steps: 1 });
    bodyGeo.translate(0, 0, -(D - 2 * BZ) / 2); smoothNormals(bodyGeo);
    const bodyMat = new TH.MeshStandardMaterial({ color: COLORS[0].frame, metalness: 0.95, roughness: 0.28 });
    inner.add(new TH.Mesh(bodyGeo, bodyMat));
    const bwp = 600, bhp = 1288, backC = document.createElement("canvas"); backC.width = bwp; backC.height = bhp; const bg = backC.getContext("2d");
    const backTex = new TH.CanvasTexture(backC); backTex.colorSpace = TH.SRGBColorSpace; backTex.anisotropy = 4;
    const backMat = new TH.MeshPhysicalMaterial({ map: backTex, metalness: 0.15, roughness: 0.34, clearcoat: 0.9, clearcoatRoughness: 0.12, envMapIntensity: 0.9, side: TH.DoubleSide });
    inner.add(new TH.Mesh(skinFromBody(bodyGeo, -1, 0.004, true, false), backMat));
    const uiC = document.createElement("canvas"); uiC.width = UIW; uiC.height = UIH; const uiOut = document.createElement("canvas"); uiOut.width = UIW; uiOut.height = UIH; const uiTex = new TH.CanvasTexture(uiOut); const uiMargin = Math.round(UIH * BX / H); uiTex.colorSpace = TH.SRGBColorSpace; uiTex.anisotropy = 8;
    const screenMat = new TH.MeshPhysicalMaterial({ color: 0x020305, roughness: 0.06, metalness: 0.0, clearcoat: 0.7, clearcoatRoughness: 0.08, emissive: 0xffffff, emissiveMap: withUI ? uiTex : null, emissiveIntensity: 0.0, envMapIntensity: 0.55, side: TH.DoubleSide });
    inner.add(new TH.Mesh(skinFromBody(bodyGeo, 1, 0.004, false, false), screenMat));
    // camera module: ring, black glass, four lenses (procedural, stays sharp in macro shots)
    const cy = H / 2 - 252 / 81.5, ringMat = new TH.MeshStandardMaterial({ color: COLORS[0].ring, metalness: 0.7, roughness: 0.3 }), zb = -D / 2 - 0.004;
    const ring = new TH.Mesh(new TH.CylinderGeometry(2.33, 2.36, 0.07, 96), ringMat); ring.rotation.x = Math.PI / 2; ring.position.set(0, cy, zb - 0.035); inner.add(ring);
    const glass = new TH.Mesh(new TH.CylinderGeometry(1.53, 1.55, 0.09, 96), new TH.MeshPhysicalMaterial({ color: 0x010102, metalness: 0.1, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 0.7 })); glass.rotation.x = Math.PI / 2; glass.position.set(0, cy, zb - 0.115); inner.add(glass);
    // lens stack measured on the official render: outer ring r = 0.39 cm, glass r = 0.36 cm, blue cores of different sizes (right-hand lenses larger)
    const ringA = new TH.MeshStandardMaterial({ color: 0x2b2e35, metalness: 0.8, roughness: 0.35, envMapIntensity: 0.8 }), ringB = new TH.MeshStandardMaterial({ color: 0x14161b, metalness: 0.6, roughness: 0.45, envMapIntensity: 0.6 });
    function lensTexture(core) {
      const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d");
      const bgG = g.createRadialGradient(128, 128, 0, 128, 128, 128); bgG.addColorStop(0, "#050a1a"); bgG.addColorStop(.7, "#03050d"); bgG.addColorStop(1, "#000"); g.fillStyle = bgG; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 3; i++) { g.strokeStyle = "rgba(90,110,190," + (0.16 - i * 0.04) + ")"; g.lineWidth = 3; g.beginPath(); g.arc(128, 128, 86 + i * 14, 0, TAU); g.stroke(); }
      const R = core * 128, cg = g.createRadialGradient(128 - R * 0.25, 128 - R * 0.3, R * 0.05, 128, 128, R); cg.addColorStop(0, "#8fd0ff"); cg.addColorStop(.25, "#1c7bff"); cg.addColorStop(.7, "#0a3aa8"); cg.addColorStop(1, "rgba(5,20,70,0)"); g.fillStyle = cg; g.beginPath(); g.arc(128, 128, R * 1.05, 0, TAU); g.fill();
      g.fillStyle = "rgba(255,255,255,.9)"; g.beginPath(); g.arc(128 - R * 0.32, 128 - R * 0.36, Math.max(3, R * 0.11), 0, TAU); g.fill();
      const t = new TH.CanvasTexture(c); t.colorSpace = TH.SRGBColorSpace; return t;
    }
    const lensCoat = new TH.MeshPhysicalMaterial({ color: 0x000000, transparent: true, opacity: 0.35, metalness: 0, roughness: 0.03, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.1, depthWrite: false });
    const lensRings = [];
    [{ p: [-0.65, 0.71], core: 0.36 }, { p: [0.65, 0.71], core: 0.56 }, { p: [-0.65, -0.71], core: 0.42 }, { p: [0.65, -0.71], core: 0.48 }].forEach((L) => {
      const p = L.p, x = p[0], y = cy + p[1];
      const r1 = new TH.Mesh(new TH.TorusGeometry(0.385, 0.02, 10, 64), ringA); r1.position.set(x, y, zb - 0.2); inner.add(r1);
      const r2 = new TH.Mesh(new TH.TorusGeometry(0.335, 0.013, 10, 64), ringB); r2.position.set(x, y, zb - 0.2); inner.add(r2);
      const l = new TH.Mesh(new TH.CircleGeometry(0.36, 48), new TH.MeshBasicMaterial({ map: lensTexture(L.core) })); l.rotation.y = Math.PI; l.position.set(x, y, zb - 0.2); inner.add(l);
      const l2 = new TH.Mesh(new TH.CircleGeometry(0.36, 48), lensCoat); l2.rotation.y = Math.PI; l2.position.set(x, y, zb - 0.206); inner.add(l2);
      const hl = new TH.Mesh(new TH.TorusGeometry(0.5, 0.026, 10, 64), new TH.MeshBasicMaterial({ color: 0x00d4c8, transparent: true, opacity: 0, depthWrite: false, blending: TH.AdditiveBlending })); hl.position.set(x, y, zb - 0.23); inner.add(hl); lensRings.push(hl);
    });
    // power key (red accent), USB-C and SIM tray on the bottom edge. No physical volume keys: the Mate 30 Pro uses a touch volume control.
    const pwr = new TH.Mesh(new TH.BoxGeometry(0.07, 1.25, 0.34), new TH.MeshStandardMaterial({ color: 0xb8341f, metalness: 0.8, roughness: 0.32 })); pwr.position.set(W / 2 + 0.005, 3.2, 0.02); inner.add(pwr);
    const dark = new TH.MeshStandardMaterial({ color: 0x050506, metalness: 0.2, roughness: 0.6 });
    const usb = new TH.Mesh(new TH.BoxGeometry(0.95, 0.07, 0.26), dark); usb.position.set(0, -H / 2 - 0.002, 0); inner.add(usb);
    const sim = new TH.Mesh(new TH.BoxGeometry(0.9, 0.05, 0.05), dark); sim.position.set(-1.8, -H / 2 - 0.002, 0); inner.add(sim);
    for (let i = 0; i < 6; i++) { const h = new TH.Mesh(new TH.CylinderGeometry(0.05, 0.05, 0.06, 10), dark); h.position.set(1.6 + i * 0.16, -H / 2 - 0.002, 0); inner.add(h); }
    let drawn = "";
    function setColor(a, b, p) {
      const sig = a + "|" + b + "|" + p.toFixed(3);
      if (sig !== drawn) {
        drawn = sig; const ia = imgs[a], ib = imgs[b], hex = (n) => "#" + COLORS[n].frame.toString(16).padStart(6, "0");
        bg.globalCompositeOperation = "source-over"; bg.fillStyle = hex(a); bg.fillRect(0, 0, bwp, bhp); if (ia) bg.drawImage(ia, 0, 0, bwp, bhp);
        if (p > 0 && ib) {
          const off = document.createElement("canvas"); off.width = bwp; off.height = bhp; const og = off.getContext("2d");
          og.fillStyle = hex(b); og.fillRect(0, 0, bwp, bhp); og.drawImage(ib, 0, 0, bwp, bhp);
          const edge = lerp(bhp * 1.15, -bhp * 0.15, p), soft = 140; og.globalCompositeOperation = "destination-in";
          const gr = og.createLinearGradient(0, edge - soft, 0, edge + soft); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,1)"); og.fillStyle = gr; og.fillRect(0, 0, bwp, bhp);
          bg.drawImage(off, 0, 0);
          if (p < 1) { const hl = bg.createLinearGradient(0, edge - 40, 0, edge + 40); hl.addColorStop(0, "rgba(255,255,255,0)"); hl.addColorStop(.5, "rgba(210,255,252,0.85)"); hl.addColorStop(1, "rgba(255,255,255,0)"); bg.globalCompositeOperation = "lighter"; bg.fillStyle = hl; bg.fillRect(0, edge - 40, bwp, 80); bg.globalCompositeOperation = "source-over"; }
        }
        backTex.needsUpdate = true;
      }
      bodyMat.color.copy(new TH.Color(COLORS[a].frame)).lerp(new TH.Color(COLORS[b].frame), p);
      ringMat.color.copy(new TH.Color(COLORS[a].ring)).lerp(new TH.Color(COLORS[b].ring), p);
    }
    function flush() { const o = uiOut.getContext("2d"); o.fillStyle = "#000"; o.fillRect(0, 0, UIW, UIH); o.drawImage(uiC, 0, uiMargin, UIW, UIH - 2 * uiMargin); uiTex.needsUpdate = true; }
    return { group: grp, inner, uiC, uiTex, screenMat, setColor, lensRings, flush };
  }

  // ---------- screen: official EMUI reference captures + subtle, finger-less interactions ----------
  const SCR = {}; // name -> Image (assets/ui/emui_<name>.jpg)
  async function loadScreens(names) { for (const n of names) SCR[n] = await loadImg("assets/ui/emui_" + n + ".jpg"); SCR.photo = await loadImg("assets/ui/camera_sample.jpg"); }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  // draw a screen image stretched on the whole panel, optionally scaled about (ax, ay) in 0..1
  function putScreen(g, name, o) {
    o = o || {}; const img = SCR[name]; if (!img) return; const s = o.s || 1, ax = o.ax == null ? .5 : o.ax, ay = o.ay == null ? .5 : o.ay;
    g.save(); g.globalAlpha = o.a == null ? 1 : o.a; const w = UIW * s, h = UIH * s; g.drawImage(img, (o.x || 0) + ax * UIW - ax * w, (o.y || 0) + ay * UIH - ay * h, w, h);
    if (o.dim) { g.fillStyle = "rgba(0,0,0," + o.dim + ")"; g.fillRect(0, 0, UIW, UIH); }
    g.restore();
  }
  // soft touch feedback (no finger): a faint glass ripple at (u, v)
  function ripple(g, u, v, k, r) {
    if (k <= 0 || k >= 1) return; const x = u * UIW, y = v * UIH, rad = (r || 46) * (0.5 + 1.1 * eout(k));
    const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, "rgba(255,255,255," + 0.38 * (1 - k) + ")"); gr.addColorStop(.6, "rgba(190,240,255," + 0.2 * (1 - k) + ")"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
  }
  // right-edge touch volume control (reference: "Écran incurvé et contrôle tactile")
  function volumePill(g, k, level) {
    if (k <= 0) return; const x0 = UIW - 128, w = 104, y0 = 440, h = 820, a = sstep(k);
    g.save(); g.globalAlpha = a; g.translate((1 - eout(k)) * 40, 0);
    rr(g, x0, y0, w, h, 52); g.fillStyle = "rgba(10,28,40,.55)"; g.fill();
    g.save(); rr(g, x0, y0, w, h, 52); g.clip(); const fh = (h - 120) * level + 60; const fg = g.createLinearGradient(0, y0 + h - fh, 0, y0 + h); fg.addColorStop(0, "rgba(220,250,255,.95)"); fg.addColorStop(1, "rgba(0,212,200,.85)"); g.fillStyle = fg; g.fillRect(x0, y0 + h - fh, w, fh); g.restore();
    const sg = g.createLinearGradient(x0, y0, x0 + w, y0 + h); sg.addColorStop(0, "rgba(255,255,255,.95)"); sg.addColorStop(.5, "rgba(0,212,200,.9)"); sg.addColorStop(1, "rgba(255,255,255,.9)"); g.strokeStyle = sg; g.lineWidth = 5; rr(g, x0, y0, w, h, 52); g.stroke();
    g.strokeStyle = "rgba(0,212,200,.35)"; g.lineWidth = 16; rr(g, x0 - 2, y0 - 2, w + 4, h + 4, 54); g.stroke();
    g.strokeStyle = level > 0.9 ? "#0b0f14" : "#ffffff"; g.lineWidth = 7; g.lineCap = "round"; const cx = x0 + w / 2;
    g.beginPath(); g.moveTo(cx - 20, y0 + 62); g.lineTo(cx + 20, y0 + 62); g.moveTo(cx, y0 + 42); g.lineTo(cx, y0 + 82); g.stroke();
    g.strokeStyle = level > 0.12 ? "#0b0f14" : "#fff"; g.beginPath(); g.moveTo(cx - 20, y0 + h - 62); g.lineTo(cx + 20, y0 + h - 62); g.stroke();
    g.restore();
  }
  // 3D face unlock: scanning dots + sweep around the sensor cut-out, then a ring around the padlock
  function faceScan(g, k) {
    if (k <= 0 || k >= 1) return; const cx = UIW / 2, cy = UIH * 0.46, R = 250, a = Math.sin(Math.PI * k);
    g.save(); g.globalAlpha = Math.min(1, a * 1.6);
    for (let i = 0; i < 5; i++) { const kk = (k * 1.4 + i * 0.2) % 1, rad = 60 + 520 * kk; g.strokeStyle = "rgba(0,212,200," + 0.8 * (1 - kk) + ")"; g.lineWidth = 6; g.beginPath(); g.arc(UIW * 0.5, 40, rad, Math.PI * 0.12, Math.PI * 0.88); g.stroke(); }
    g.fillStyle = "rgba(190,255,250,.9)";
    for (let r = 1; r <= 7; r++) for (let n = 0; n < r * 8; n++) { const th = n / (r * 8) * TAU, rad = r * R / 7, x = cx + Math.cos(th) * rad * 0.82, y = cy + Math.sin(th) * rad; const yy = (y - (cy - R)) / (2 * R); if (yy < k + 0.03 && yy > -0.05) { g.globalAlpha = Math.min(1, a * 1.6) * (0.55 + 0.45 * Math.max(0, 1 - Math.abs(yy - k) * 5)); g.beginPath(); g.arc(x, y, 5.5, 0, TAU); g.fill(); } }
    g.globalAlpha = Math.min(1, a * 1.6); g.strokeStyle = "rgba(0,230,215,1)"; g.lineWidth = 9; g.beginPath(); g.ellipse(cx, cy, R * 0.86, R * 1.08, 0, 0, TAU); g.setLineDash([22, 14]); g.stroke(); g.setLineDash([]);
    const sy = cy - R + 2 * R * k; const sg = g.createLinearGradient(0, sy - 30, 0, sy + 30); sg.addColorStop(0, "rgba(0,212,200,0)"); sg.addColorStop(.5, "rgba(190,255,250,.9)"); sg.addColorStop(1, "rgba(0,212,200,0)"); g.fillStyle = sg; g.fillRect(cx - R, sy - 30, 2 * R, 60);
    g.restore();
  }
  // in-display fingerprint area: concentric arcs lighting up
  function fingerprint(g, k) {
    if (k <= 0 || k >= 1) return; const cx = UIW / 2, cy = UIH * 0.855, a = Math.sin(Math.PI * k);
    g.save(); g.globalAlpha = Math.min(1, a * 1.5); for (let i = 0; i < 6; i++) { const rr_ = 16 + i * 17, lit = k * 7 > i; g.strokeStyle = lit ? "rgba(0,235,220,1)" : "rgba(255,255,255,.55)"; g.lineWidth = 7; g.beginPath(); g.arc(cx, cy, rr_, Math.PI * (1.08 - 0.02 * i), Math.PI * (1.92 + 0.02 * i)); g.stroke(); }
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, 140 * (0.4 + k)); gr.addColorStop(0, "rgba(0,212,200," + 0.35 * a + ")"); gr.addColorStop(1, "rgba(0,212,200,0)"); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, 160, 0, TAU); g.fill(); g.restore();
  }
  function sweepBar(g, v, k, h) { if (k <= 0 || k >= 1) return; const y = v * UIH, hh = h || 70, a = Math.sin(Math.PI * k); const gr = g.createLinearGradient(0, 0, UIW, 0); gr.addColorStop(0, "rgba(0,212,200,0)"); gr.addColorStop(Math.max(0, k - .2), "rgba(0,212,200,0)"); gr.addColorStop(k, "rgba(0,212,200," + 0.35 * a + ")"); gr.addColorStop(Math.min(1, k + .2), "rgba(0,212,200,0)"); gr.addColorStop(1, "rgba(0,212,200,0)"); g.fillStyle = gr; g.fillRect(0, y - hh / 2, UIW, hh); }

  window.Phone3D = { TH, TAU, DEG, W, H, D, COLORS, clamp, sstep, eio, eout, ein, lerp, K, loadImg, makeRig, createPhone, SCR, loadScreens, putScreen, ripple, volumePill, faceScan, fingerprint, sweepBar, rr, UIW, UIH };
})();
