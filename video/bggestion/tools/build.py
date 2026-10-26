# Builds the BG-MARKET-GESTION vertical film (1080x1920): index.html + compositions/*.html.
# Film times come from the voice-over word timings (assets/audio/words.json) shifted by V0.
import json, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from ui import *

ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'compositions')
V0 = 4.5
WORDS = [w for w in json.load(open(os.path.join(ROOT, 'assets/audio/words.json')))['words'] if w['type'] == 'word' and not w['text'].startswith('[') and not w['text'].endswith(']')]
VO_END = V0 + WORDS[-1]['end']


def _anchors():
    import difflib
    old = [w for w in json.load(open(os.path.join(ROOT, 'assets/audio/words_take2.json')))['words'] if w['type'] == 'word' and not w['text'].startswith('[') and not w['text'].endswith(']')]
    nz = lambda x: x.lower().strip('…,.?!:;«» ')
    a, b = [nz(w['text']) for w in old], [nz(w['text']) for w in WORDS]
    pts = [(0.0, 0.0)]
    for blk in difflib.SequenceMatcher(None, a, b, autojunk=False).get_matching_blocks():
        for k in range(blk.size):
            pts.append((V0 + old[blk.a + k]['start'], V0 + WORDS[blk.b + k]['start']))
    pts.append((V0 + old[-1]['end'] + 30, V0 + WORDS[-1]['end'] + 30))
    return sorted(set(pts))


ANCH = _anchors()


def M(t):
    """Map a film time authored against the first voice take to the current voice."""
    for (x0, y0), (x1, y1) in zip(ANCH, ANCH[1:]):
        if x0 <= t <= x1:
            return round(y0 + (t - x0) * (y1 - y0) / max(x1 - x0, 1e-6), 2)
    return round(t, 2)
DUR = round(VO_END + 5.6, 2)


def norm(x):
    return x.lower().strip('…,.?!:;«» ')


def W(word, n=1, after=0.0):
    """Film time of the n-th spoken word starting with `word` (after film time `after`, authored on the first take)."""
    k = 0
    after = M(after)
    for w in WORDS:
        t = V0 + w['start']
        if t < after:
            continue
        a, q = norm(w['text']), norm(word)
        if a == q or (len(q) >= 4 and a.startswith(q) and word[-1] not in '…,.?!:;'):
            k += 1
            if k == n:
                return round(t, 2)
    raise KeyError(word)


def r(x):
    return round(x, 2)


BASE = '''* { margin:0; padding:0; box-sizing:border-box; }
    #root { position:absolute; inset:0; overflow:hidden; font-family:"Montserrat",sans-serif; color:#fff; }
    .t { color:#00D4C8; } .o { color:#FF6208; }
    .w { display:inline-block; white-space:pre; }
    .cap { position:absolute; left:0; right:0; margin:auto; width:max-content; max-width:980px; text-align:center; }
    .lab { position:absolute; left:0; right:0; margin:auto; width:max-content; font-weight:800; font-size:26px; letter-spacing:.32em; color:#00D4C8; padding:10px 22px; border:2px solid rgba(0,212,200,.55); border-radius:40px; background:rgba(0,212,200,.08); }
    .big { font-weight:900; letter-spacing:-.03em; line-height:1.02; }
    .glass { background:linear-gradient(180deg,rgba(20,32,48,.86),rgba(9,14,24,.9)); border:1.5px solid rgba(0,212,200,.35); border-radius:28px; box-shadow:0 30px 60px rgba(0,0,0,.45), 0 0 40px rgba(0,212,200,.10) inset; }
    .phn { position:absolute; background:linear-gradient(145deg,#2c3546,#0b0f16 38%,#151b26 70%,#2a3343); box-shadow:0 50px 90px rgba(0,0,0,.65), 0 0 0 2px rgba(255,255,255,.07) inset, 0 0 80px rgba(0,212,200,.16); }
    .phn .scr { position:relative; overflow:hidden; background:#060A12; }
    .phn .appw { position:absolute; left:0; top:0; transform-origin:0 0; }
    .phn .cam { position:absolute; left:50%; border-radius:50%; background:#000; box-shadow:0 0 0 2px #121822; z-index:60; }
    .lap { position:absolute; }
    .lap .lid { position:relative; background:linear-gradient(180deg,#1d2533,#0b0f16); border-radius:22px; padding:14px; box-shadow:0 40px 80px rgba(0,0,0,.6), 0 0 0 2px rgba(255,255,255,.06) inset, 0 0 70px rgba(40,170,255,.18); }
    .lap .scr { position:relative; overflow:hidden; border-radius:8px; background:#050D1C; }
    .lap .appw { position:absolute; left:0; top:0; transform-origin:0 0; }
    .lap .base { margin:0 auto; height:22px; border-radius:0 0 26px 26px; background:linear-gradient(180deg,#3a4354,#1a1f2a); box-shadow:0 20px 40px rgba(0,0,0,.5); }
    .tap { position:absolute; width:64px; height:64px; margin:-32px 0 0 -32px; border-radius:50%; border:3px solid rgba(255,255,255,.95); background:rgba(255,255,255,.22); opacity:0; z-index:90; }
    .cur { position:absolute; width:34px; height:34px; z-index:95; filter:drop-shadow(0 4px 8px rgba(0,0,0,.6)); }''' + APP_CSS + DK_CSS


def scene(id, body, css, js, w=1080, h=1920):
    return f'''<template>
  <style>
    {BASE}
    {css}
  </style>
  <div id="root" data-composition-id="{id}" data-width="{w}" data-height="{h}">
{body}
  </div>
  <script>
    const tl = gsap.timeline({{ paused: true }});
    const fmt = (n) => Math.round(n).toString().replace(/\\B(?=(\\d{{3}})+(?!\\d))/g, " ");
    const count = (sel, from, to, at, dur, pre, suf) => {{ const o = {{ v: from }}; tl.to(o, {{ v: to, duration: dur, ease: "power3.out", onUpdate: () => {{ document.querySelectorAll(sel).forEach(e => e.textContent = (pre || "") + fmt(o.v) + (suf || "")); }} }}, at); }};
    const type = (sel, text, at, dt) => {{ for (let i = 0; i <= text.length; i++) tl.set(sel, {{ textContent: text.slice(0, i) || "\\u00a0" }}, at + i * dt); }};
    const tap = (sel, at) => {{ tl.fromTo(sel, {{ scale: 0.35, opacity: 0.95 }}, {{ scale: 1.7, opacity: 0, duration: 0.55, ease: "power2.out", immediateRender: false }}, at); }};
{js}
    window.__timelines["{id}"] = tl;
  </script>
</template>
'''


def write(name, s):
    open(os.path.join(OUT, name + '.html'), 'w').write(s)


def words_html(text):
    return ''.join(f'<span class="w">{w} </span>' for w in re.findall(r'<span[^>]*>.*?</span>|[^\s<]+', text))


def kin(id, text, top, size, t_in, t_out, color='#fff', weight=900, stagger=0.06, extra=''):
    """Kinetic caption: words rise in with blur, leave upwards."""
    body = f'    <div id="{id}" class="clip cap big" data-start="{r(t_in)}" data-duration="{r(t_out - t_in)}">{words_html(text)}</div>\n'
    css = f'    #{id} {{ top:{top}px; font-size:{size}px; color:{color}; font-weight:{weight}; {extra} }}\n'
    js = (f'    tl.fromTo("#{id} .w", {{ opacity:0, y:size_y, filter:"blur(12px)" }}, {{ opacity:1, y:0, filter:"blur(0px)", duration:0.45, ease:"expo.out", stagger:{stagger} }}, {r(t_in)});\n'
          f'    tl.to("#{id}", {{ opacity:0, y:-50, filter:"blur(12px)", duration:0.3, ease:"power3.in" }}, {r(t_out - 0.32)});\n').replace('size_y', str(int(size * 0.5)))
    return body, css, js


def phone(id, s, inner, extra_style=''):
    w, h, bz = 390 * s, 844 * s, 13
    return (f'<div id="{id}" class="phn" style="width:{r(w + 2 * bz)}px;height:{r(h + 2 * bz)}px;border-radius:{r(58 * s + bz)}px;padding:{bz}px;{extra_style}">'
            f'<div class="scr" style="width:{r(w)}px;height:{r(h)}px;border-radius:{r(50 * s)}px">'
            f'<div class="appw" style="transform:scale({s})">{inner}</div>'
            f'<div class="cam" style="top:{r(11 * s)}px;width:{r(11 * s)}px;height:{r(11 * s)}px;margin-left:{r(-5.5 * s)}px"></div></div></div>')


def laptop(id, s, inner, extra_style=''):
    w, h = 1280 * s, 800 * s
    return (f'<div id="{id}" class="lap" style="width:{r(w + 28)}px;{extra_style}"><div class="lid"><div class="scr" style="width:{r(w)}px;height:{r(h)}px">'
            f'<div class="appw" style="transform:scale({s})">{inner}</div></div></div>'
            f'<div class="base" style="width:{r(w + 120)}px;margin-left:-46px"></div></div>')


def tablet(id, s, inner, extra_style=''):
    w, h, bz = 1280 * s, 800 * s, 16
    return (f'<div id="{id}" class="phn" style="width:{r(w + 2 * bz)}px;height:{r(h + 2 * bz)}px;border-radius:30px;padding:{bz}px;{extra_style}">'
            f'<div class="scr" style="width:{r(w)}px;height:{r(h)}px;border-radius:14px"><div class="appw" style="transform:scale({s})">{inner}</div></div></div>')


CURSOR = '<svg viewBox="0 0 24 24" width="34" height="34"><path d="M4 2l15 11-7 1.3 4.2 7.5-3 1.7-4.2-7.6L4 21z" fill="#fff" stroke="#0B0F14" stroke-width="1.4" stroke-linejoin="round"/></svg>'
FOUNDER_AV = 'assets/people/founder_round.jpg'

# ------------------------------------------------------------------ app screens (simulated demo data)
CHART_MONTHS = [('mai', 1.12, 0.10), ('juin', 1.48, 0.13), ('juil', 1.86, 0.17), ('août', 1.64, 0.15), ('sept', 2.38, 0.24), ('oct', 2.14, 0.26)]


def chart_svg(pfx, w=326, h=170, maxv=3.0):
    bw = w / len(CHART_MONTHS)
    bars = line = ''
    pts = []
    for i, (m, v, p) in enumerate(CHART_MONTHS):
        x = 30 + i * (w - 30) / len(CHART_MONTHS) + 8
        bh = (h - 30) * v / maxv
        bars += f'<rect class="{pfx}bar" x="{r(x)}" y="{r(h - 20 - bh)}" width="{r(bw - 26)}" height="{r(bh)}" rx="5" fill="url(#{pfx}g)"/>'
        bars += f'<text x="{r(x + (bw - 26) / 2)}" y="{h - 4}" fill="#8FA0B3" font-size="10.5" text-anchor="middle" font-family="Montserrat" font-weight="600">{m}</text>'
        py = h - 20 - (h - 30) * p * 3.2 / maxv
        pts.append((x + (bw - 26) / 2, py))
    grid = ''.join(f'<line x1="30" x2="{w}" y1="{r(h - 20 - (h - 30) * k / 3)}" y2="{r(h - 20 - (h - 30) * k / 3)}" stroke="rgba(255,255,255,.07)"/>'
                   f'<text x="0" y="{r(h - 16 - (h - 30) * k / 3)}" fill="#6F8094" font-size="10" font-family="Montserrat">{k} M</text>' for k in range(4))
    poly = ' '.join(f'{r(x)},{r(y)}' for x, y in pts)
    dots = ''.join(f'<circle cx="{r(x)}" cy="{r(y)}" r="3.5" fill="#FF6208" stroke="#fff" stroke-width="1.2"/>' for x, y in pts)
    return (f'<svg viewBox="0 0 {w} {h}" width="{w}" height="{h}"><defs><linearGradient id="{pfx}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3DF2E6"/><stop offset="1" stop-color="#00A89F"/></linearGradient></defs>'
            f'{grid}{bars}<polyline class="{pfx}line" points="{poly}" fill="none" stroke="#FF6208" stroke-width="2.5"/>{dots}</svg>')


def donut_svg(pfx, size=120, total='2,1 M F'):
    segs = [(41, TEAL), (24, ORANGE), (19, PURPLE), (16, BLUE)]
    C = 2 * 3.14159 * 46
    out, off = '', 0
    for i, (p, c) in enumerate(segs):
        L = C * p / 100
        out += (f'<circle class="{pfx}seg" cx="60" cy="60" r="46" fill="none" stroke="{c}" stroke-width="17" '
                f'stroke-dasharray="{r(L - 2)} {r(C)}" stroke-dashoffset="{r(-off)}" transform="rotate(-90 60 60)"/>')
        off += L
    return (f'<svg viewBox="0 0 120 120" width="{size}" height="{size}">{out}<text x="60" y="58" text-anchor="middle" fill="#fff" font-size="15" font-weight="800" font-family="Montserrat">{total}</text>'
            f'<text x="60" y="74" text-anchor="middle" fill="#8FA0B3" font-size="9.5" font-family="Montserrat">Total</text></svg>')


def ring_svg(id, size=124, color1=ORANGE, color2=TEAL, label='71 %'):
    C = 2 * 3.14159 * 50
    return (f'<svg viewBox="0 0 124 124" width="{size}" height="{size}"><defs><linearGradient id="{id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{color1}"/><stop offset="1" stop-color="{color2}"/></linearGradient></defs>'
            f'<circle cx="62" cy="62" r="50" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="11"/>'
            f'<circle id="{id}" cx="62" cy="62" r="50" fill="none" stroke="url(#{id}g)" stroke-width="11" stroke-linecap="round" stroke-dasharray="{r(C)}" stroke-dashoffset="{r(C)}" transform="rotate(-90 62 62)"/>'
            f'<text id="{id}t" x="62" y="62" text-anchor="middle" fill="#fff" font-size="25" font-weight="800" font-family="Montserrat">{label}</text>'
            f'<text x="62" y="80" text-anchor="middle" fill="#8FA0B3" font-size="10" font-family="Montserrat">de l\'objectif</text></svg>')


def dash_phone(p):
    """Patron dashboard (phone). p = id prefix."""
    return f'''<div class="app">{statusbar()}{header(av_img(FOUNDER_AV))}
<div class="scroll" id="{p}scroll">
  <h1>Bonjour, <em>Gnohité</em> <span class="role">Patron</span></h1>
  <div class="date">{ic('cal', 16, TEAL)} 01/10/2026 – 26/10/2026</div>
  <div class="qbtn"><span class="o">Nouvelle commande</span><span>Nouvelle facture</span><span>Nouveau client</span></div>
  <div class="kpis">
    {kpi('', 'cart', 'Ventes du jour', '0 F', 'Aujourd\'hui', TEAL, [6, 9, 5, 12, 8, 14, 26], f'{p}k1')}
    {kpi('or', 'db', 'Bénéfice du jour', '+0 F', 'Aujourd\'hui', ORANGE, [4, 7, 5, 9, 6, 10, 22], f'{p}k2')}
    {kpi('pu', 'doc', 'Commandes du jour', '0', 'Aujourd\'hui', PURPLE, [5, 4, 8, 6, 9, 7, 18], f'{p}k3')}
    {kpi('bl', 'users', 'Nouveaux clients', '0', 'Aujourd\'hui', BLUE, [3, 6, 4, 8, 5, 9, 16], f'{p}k4')}
  </div>
  <div class="todo"><b>À TRAITER</b><span class="pill"><b>2</b> Commandes à valider</span><span class="pill"><b>1</b> Factures</span></div>
  <div class="crd" id="{p}chart"><h3>Évolution du chiffre d'affaires</h3><p class="sub">Comparaison des ventes et du bénéfice sur la période</p>
    <div class="tabs"><span>7 jours</span><span id="{p}t30" class="on">30 jours</span><span id="{p}t6">6 mois</span><span>12 mois</span></div>
    <div style="margin-top:14px">{chart_svg(p)}</div></div>
  <div class="crd" id="{p}rep"><h3>Répartition des ventes <small>Ce mois</small></h3>
    <div style="display:flex;align-items:center;gap:16px;margin-top:10px">{donut_svg(p)}
      <div style="flex:1;font-size:12.5px;line-height:2;font-weight:600">
        <div><span style="color:{TEAL}">●</span> Samsung <b style="float:right">41 %</b></div><div><span style="color:{ORANGE}">●</span> Apple <b style="float:right">24 %</b></div>
        <div><span style="color:{PURPLE}">●</span> Tecno <b style="float:right">19 %</b></div><div><span style="color:{BLUE}">●</span> Xiaomi <b style="float:right">16 %</b></div></div></div></div>
  <div class="crd" id="{p}top"><h3>Top produits vendus <small>Ce mois</small></h3>
    <div class="row" id="{p}tp1"><b style="width:14px">1</b><div class="ri">{ic('phone', 18)}</div><div class="rt"><b>SAMSUNG GALAXY A56</b><span>4 unités</span></div><div class="rv">980 000 F</div></div>
    <div class="row" id="{p}tp2"><b style="width:14px">2</b><div class="ri">{ic('phone', 18)}</div><div class="rt"><b>IPHONE 13 128 GO</b><span>2 unités</span></div><div class="rv">520 000 F</div></div>
    <div class="row" id="{p}tp3"><b style="width:14px">3</b><div class="ri">{ic('phone', 18)}</div><div class="rt"><b>TECNO CAMON 30</b><span>3 unités</span></div><div class="rv">375 000 F</div></div></div>
  <div class="crd" id="{p}obj"><h3>Objectif du mois</h3>
    <div style="display:flex;align-items:center;gap:14px;margin-top:10px">{ring_svg(p + 'ring')}
      <div><div style="font-size:11.5px;color:#8FA0B3">Chiffre d'affaires du mois</div><div style="font-size:22px;font-weight:800" id="{p}objv">2 140 000 F</div>
      <div style="font-size:11.5px;color:#8FA0B3">sur un objectif de 3 000 000 F</div><div style="font-size:12px;margin-top:6px">Bénéfice du mois <b style="color:{ORANGE}">+256 000 F</b></div></div></div></div>
</div>{nav('home', fab_id=p + 'fab')}</div>'''


def dash_employe(p):
    return f'''<div class="app">{statusbar()}{header(av_letter('Y'))}
<div class="scroll">
  <h1>Bonjour, <em>Yannick</em> <span class="role">Employé</span></h1>
  <div class="date">{ic('cal', 16, TEAL)} 01/10/2026 – 26/10/2026</div>
  <div class="qbtn"><span class="o">Nouvelle commande</span><span>Nouvelle facture</span></div>
  <div class="kpis">
    {kpi('', 'cart', 'Mes ventes du jour', '245 000 F', '+1 vente aujourd\'hui', TEAL, [4, 6, 3, 8, 5, 7, 20], f'{p}k1', True)}
    {kpi('or', 'doc', 'Mes factures du jour', '1', 'En attente de validation', ORANGE, [2, 3, 2, 4, 3, 2, 14])}
    {kpi('pu', 'box', 'Mes commandes du jour', '2', 'Aujourd\'hui', PURPLE, [3, 2, 4, 3, 5, 4, 12])}
    {kpi('bl', 'users', 'Mes nouveaux clients', '1', 'Aujourd\'hui', BLUE, [2, 1, 3, 2, 2, 3, 10])}
  </div>
  <div class="todo"><b>À TRAITER</b><span class="pill"><b>1</b> Ma facture à valider</span></div>
  <div class="crd"><h3>Mes ventes <small>Ce mois</small></h3><p class="sub">Uniquement mes propres ventes validées</p>
    <div style="margin-top:12px;font-size:26px;font-weight:800">1 120 000 F</div>
    <div style="margin-top:10px;height:10px;border-radius:6px;background:rgba(255,255,255,.07)"><div style="width:62%;height:100%;border-radius:6px;background:linear-gradient(90deg,{ORANGE},{TEAL})"></div></div>
    <div style="margin-top:6px;font-size:11.5px;color:#8FA0B3">Mon objectif : 62 %</div></div>
</div>{nav('home')}</div>'''


def sheet_create(p):
    items = [('box', 'Nouvelle<br>commande', TEAL, 'rgba(0,212,200,.14)'), ('receipt', 'Nouvelle<br>facture', GREEN, 'rgba(60,203,127,.14)'),
             ('card', 'Nouvelle<br>précommande', ORANGE, 'rgba(255,98,8,.14)'), ('wrench', 'Nouveau<br>SAV', '#F5C04A', 'rgba(245,192,74,.12)'),
             ('users', 'Nouveau<br>client', PURPLE, 'rgba(167,139,250,.14)'), ('phone', 'Nouveau<br>produit', BLUE, 'rgba(59,155,255,.14)')]
    cells = ''.join(f'<div {f"id={p}nc" if i == 0 else ""}><i style="background:{bg};color:{c}">{ic(k, 19)}</i><span>{t}</span></div>' for i, (k, t, c, bg) in enumerate(items))
    return f'<div class="dim" id="{p}dim"></div><div class="sheet" id="{p}sheet"><div class="grab"></div><h4>Créer</h4><div class="sg">{cells}</div></div>'


def form_commande(p):
    return f'''<div class="app" id="{p}form" style="z-index:50">{statusbar()}{header(av_img(FOUNDER_AV))}
<div class="scroll">
  <div class="ttl"><div class="bk">{ic('left', 18)}</div><div><h2>Nouvelle commande</h2><p>Les champs avec * sont obligatoires</p></div></div>
  <div class="crd" style="border-color:rgba(255,255,255,.08)"><h3 style="font-size:15px">Client</h3>
    <div class="fld"><label>Nom complet *</label><div class="inp ph" id="{p}f1">Ex : Jean Kouassi</div></div>
    <div class="fld"><label>Téléphone</label><div class="inp ph" id="{p}f2">07 00 00 00 00</div></div></div>
  <div class="crd" style="border-color:rgba(255,255,255,.08)"><h3 style="font-size:15px">Téléphone 1</h3>
    <div class="fld"><label>Modèle *</label><div class="inp ph" id="{p}f3">Ex : iPhone 15 Pro Max</div></div>
    <div class="seg"><span id="{p}neuf">Neuf</span><span>Quasi-neuf</span></div>
    <div style="display:flex;gap:10px"><div class="fld" style="flex:1"><label>Stockage</label><div class="inp" id="{p}f5">256 Go</div></div><div class="fld" style="flex:1"><label>RAM</label><div class="inp">8 Go</div></div></div>
    <div class="fld"><label>Prix de vente (F) *</label><div class="inp ph" id="{p}f4">0</div></div></div>
  <div class="cta" id="{p}save">Enregistrer la commande</div>
</div>{nav('box')}</div>'''


def invoice_paper(p):
    return f'''<div id="{p}inv" class="clip" data-start="__S__" data-duration="__D__" style="position:absolute;width:820px;border-radius:26px;background:#fff;color:#0B1726;font-family:Montserrat;overflow:hidden;box-shadow:0 50px 100px rgba(0,0,0,.6)">
  <div style="height:10px;background:linear-gradient(90deg,{ORANGE},{TEAL})"></div>
  <div style="padding:34px 40px 0;display:flex;justify-content:space-between;align-items:flex-start">
    <div><img src="assets/brand/logo_app.png" style="height:64px;filter:brightness(.25) saturate(2.4)" alt="" /><div style="font-size:15px;color:#4A5A6C;margin-top:8px;line-height:1.5">Abidjan (Yopougon)<br>WhatsApp : 07 15 78 69 75</div></div>
    <div style="text-align:right"><div style="font-size:44px;font-weight:900;letter-spacing:.02em">FACTURE</div><div style="font-size:20px;font-weight:800;color:{ORANGE}">FAC-128</div><div style="font-size:15px;color:#4A5A6C">26/10/2026</div>
    <div style="display:inline-block;margin-top:8px;font-size:14px;font-weight:800;color:#1E9E5C;background:#DDF7E9;padding:4px 14px;border-radius:20px">PAYÉE</div></div></div>
  <div style="margin:22px 40px 0;display:flex;gap:16px">
    <div style="flex:1;border-left:5px solid {TEAL};background:#F1F5F9;border-radius:12px;padding:12px 16px"><div style="font-size:12px;font-weight:800;letter-spacing:.14em;color:#0E8F88">FACTURÉ À</div><div style="font-size:24px;font-weight:800">Aïcha Traoré</div><div style="font-size:14px;color:#4A5A6C">Tél : 07 00 00 00 12 · Cocody Angré</div></div>
    <div style="width:220px;border-left:5px solid {ORANGE};background:#F1F5F9;border-radius:12px;padding:12px 16px"><div style="font-size:12px;font-weight:800;letter-spacing:.14em;color:#D9530A">PAIEMENT</div><div style="font-size:18px;font-weight:800">À la livraison</div></div></div>
  <div style="margin:20px 40px 0;border-radius:10px;overflow:hidden">
    <div style="display:flex;background:#0B1726;color:#fff;font-size:13px;font-weight:800;letter-spacing:.08em;padding:12px 16px"><span style="flex:1">DÉSIGNATION</span><span style="width:60px">QTÉ</span><span style="width:150px;text-align:right">TOTAL</span></div>
    <div style="display:flex;font-size:17px;font-weight:700;padding:16px;border-bottom:1px solid #E3E8EE"><span style="flex:1">SAMSUNG GALAXY A56<br><small style="font-weight:600;color:#4A5A6C">256 Go / 8 Go RAM · Neuf</small></span><span style="width:60px">1</span><span style="width:150px;text-align:right">245 000 F</span></div>
    <div style="display:flex;font-size:15px;color:#4A5A6C;padding:10px 16px"><span style="flex:1">Livraison</span><span style="width:150px;text-align:right">2 000 F</span></div></div>
  <div style="margin:10px 40px 0;background:#0B1726;color:#fff;border-radius:14px;display:flex;justify-content:space-between;align-items:center;padding:18px 22px"><b style="font-size:18px;letter-spacing:.12em">TOTAL</b><b style="font-size:34px;color:{ORANGE}">247 000 F</b></div>
  <div style="text-align:center;color:#0E8F88;font-size:15px;font-weight:700;padding:18px 40px 26px">Merci pour votre confiance. BG MARKET — Technologie pour tous.</div>
</div>'''


def dk_top(avatar_html, name, role):
    return (f'<div class="top"><div class="mn">{ic("menu", 20)}</div><div class="se">{ic("search", 16)} Rechercher un produit, une commande, un client… <kbd>Ctrl + K</kbd></div>'
            f'<div class="sp"></div><div class="cr">{ic("plus", 16, sw=2.6)} Créer</div><div class="ib">{ic("sun", 18)}</div><div class="ib">{ic("bell", 18)}<b>3</b></div>'
            f'<div class="pr">{avatar_html}<div><b>{name}</b><span>{role}</span></div></div></div>')


def dk_dashboard(p):
    kp = (f'<div class="gl"><div class="ki">{ic("cart", 22)}</div><div><b>Ventes du jour</b><strong id="{p}d1">485 000 F</strong><span>Aujourd\'hui</span></div></div>'
          f'<div class="gl or"><div class="ki">{ic("db", 22)}</div><div><b>Bénéfice du jour</b><strong id="{p}d2">+58 500 F</strong><span>Aujourd\'hui</span></div></div>'
          f'<div class="gl bl"><div class="ki">{ic("doc", 22)}</div><div><b>Commandes du jour</b><strong>6</strong><span>Aujourd\'hui</span></div></div>'
          f'<div class="gl bl"><div class="ki">{ic("users", 22)}</div><div><b>Nouveaux clients</b><strong>3</strong><span>Aujourd\'hui</span></div></div>')
    return f'''<div class="dk">{dk_top(f'<div class="av"><img src="{FOUNDER_AV}" alt="" /></div>', 'Gnohité Djôlo', 'Patron')}
<div class="main">
  <h1>Bonjour, <em>Gnohité</em><span class="role">Patron</span></h1>
  <div class="kp">{kp}</div>
  <div class="todo"><b>À TRAITER</b><span><i>2</i>Commandes à valider</span><span><i>1</i>Facture à valider</span><span><i>0</i>Comptes en attente</span><span><i>2</i>Stock bas</span></div>
  <div style="display:flex;gap:16px;margin-top:16px">
    <div class="gl" style="flex:1.75;padding:18px 20px"><h3>Évolution du chiffre d'affaires</h3><p class="sub">Comparaison des ventes et du bénéfice sur la période sélectionnée</p>
      <div style="margin-top:8px">{chart_svg(p + 'd', 700, 300)}</div></div>
    <div class="gl" style="flex:1;padding:18px 20px"><h3>Répartition des ventes <a>Ce mois</a></h3>
      <div style="display:flex;justify-content:center;margin-top:16px">{donut_svg(p + 'd', 190)}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 14px;font-size:13px;font-weight:600;margin-top:14px">
        <span><b style="color:{TEAL}">●</b> Samsung 41 %</span><span><b style="color:{ORANGE}">●</b> Apple 24 %</span><span><b style="color:{PURPLE}">●</b> Tecno 19 %</span><span><b style="color:{BLUE}">●</b> Xiaomi 16 %</span></div></div>
  </div>
</div></div>'''


def dk_factures(p):
    rows = [('FAC-129', 'Koffi Yao', 'Yannick K.', '245 000 F'), ('FAC-130', 'Mariam Diallo', 'Moussa D.', '118 000 F')]
    tr = ''.join(f'<tr id="{p}r{i}"><td><b>{a}</b></td><td>{b}</td><td>{c}</td><td style="font-weight:800">{d}</td><td><span class="tag o" id="{p}s{i}">À valider</span></td>'
                 f'<td style="text-align:right"><span class="btn v" id="{p}v{i}">{ic("check", 14, sw=3)} Valider</span></td></tr>' for i, (a, b, c, d) in enumerate(rows))
    rows2 = [('FAC-127', 'Serge Kouamé', 'Gnohité D.', '190 000 F'), ('FAC-126', 'Fatou Bamba', 'Yannick K.', '67 000 F'), ('FAC-125', 'Ange N\'Guessan', 'Moussa D.', '310 000 F')]
    tr2 = ''.join(f'<tr><td><b>{a}</b></td><td>{b}</td><td>{c}</td><td style="font-weight:800">{d}</td><td><span class="tag g">Payée</span></td><td></td></tr>' for a, b, c, d in rows2)
    return f'''<div class="dk">{dk_top('<div class="av">A</div>', 'Arnaud B.', 'Administrateur')}
<div class="main"><h1>Factures</h1><p class="sub" style="font-size:13px">128 factures · 2 à valider</p>
  <div class="gl" style="margin-top:16px;padding:16px 20px;border-color:rgba(255,160,60,.55)"><h3>À valider <a style="color:#FFB067">Créées par les employés</a></h3>
    <table style="margin-top:6px"><tr><th>N°</th><th>CLIENT</th><th>VENDEUR</th><th>MONTANT</th><th>STATUT</th><th></th></tr>{tr}</table></div>
  <div class="gl" style="margin-top:16px;padding:16px 20px"><h3>Récentes</h3><table style="margin-top:6px"><tr><th>N°</th><th>CLIENT</th><th>VENDEUR</th><th>MONTANT</th><th>STATUT</th><th></th></tr>{tr2}</table></div>
</div></div>'''


def dk_perf(p):
    return f'''<div class="dk">{dk_top(f'<div class="av"><img src="{FOUNDER_AV}" alt="" /></div>', 'Gnohité Djôlo', 'Patron')}
<div class="main" style="display:flex;flex-direction:column;gap:16px">
  <div class="gl" style="padding:18px 22px" id="{p}perf"><h3>Performance des employés</h3><p class="sub">Ce mois-ci, ventes facturées validées</p>
    <table style="margin-top:8px"><tr><th>EMPLOYÉ</th><th>COMMANDES</th><th>FACTURES VALIDÉES</th><th>VENTES</th><th>BÉNÉFICE</th></tr>
      <tr><td style="display:flex;align-items:center;gap:10px"><img src="assets/people/employe_face.png" style="width:34px;height:34px;border-radius:50%;object-fit:cover;border:2px solid #00D4C8" alt=""/>Yannick K.<i id="{p}b1" style="display:block;height:6px;width:120px;border-radius:4px;background:linear-gradient(90deg,#00D4C8,#3DF2E6);transform-origin:left"></i></td><td>9</td><td>8</td><td>1 120 000 F</td><td style="color:#3CCB7F">+132 000 F</td></tr>
      <tr><td style="display:flex;align-items:center;gap:10px"><img src="assets/people/vendeur2_face.png" style="width:34px;height:34px;border-radius:50%;object-fit:cover;border:2px solid #FF6208" alt=""/>Moussa D.<i id="{p}b2" style="display:block;height:6px;width:82px;border-radius:4px;background:linear-gradient(90deg,#FF6208,#FF9A4D);transform-origin:left;margin-left:12px"></i></td><td>6</td><td>6</td><td>760 000 F</td><td style="color:#3CCB7F">+84 000 F</td></tr></table></div>
  <div style="display:flex;gap:16px">
    <div class="gl" style="flex:1;padding:18px 22px;display:flex;gap:20px;align-items:center"><div>{ring_svg(p + 'ring', 150)}</div><div><h3>Objectif du mois</h3><div style="font-size:12px;color:#8FC4E6;margin-top:6px">Chiffre d'affaires du mois</div><div style="font-size:30px;font-weight:800">2 140 000 F</div><div style="font-size:12px;color:#8FC4E6">sur un objectif de 3 000 000 F</div><div style="font-size:14px;margin-top:6px">Bénéfice du mois <b style="color:#FF8A3D">+256 000 F</b></div></div></div>
    <div class="gl" style="flex:1;padding:18px 22px"><h3>État du stock <a>Voir les produits</a></h3><p class="sub">2 alertes · seuil d'alerte 2</p>
      <div style="margin-top:12px;font-size:14px;font-weight:700;display:flex;justify-content:space-between">Samsung Galaxy A16 128 Go <span class="tag o">1 restant</span></div>
      <div style="margin-top:12px;font-size:14px;font-weight:700;display:flex;justify-content:space-between">iPhone 14 128 Go <span class="tag r">Rupture</span></div></div>
  </div></div></div>'''


def dk_months(p):
    m = [('Octobre 2026', '2 140 000 F', '-10 % par rapport au mois précédent', '18', '17', '+256 000 F', 71, ''), ('Septembre 2026', '2 380 000 F', '+45 % par rapport au mois précédent', '21', '20', '+243 000 F', 79, 'Meilleur mois'),
         ('Août 2026', '1 640 000 F', '-12 % par rapport au mois précédent', '15', '14', '+120 000 F', 55, '')]
    cards = ''
    for i, (a, b, c, d, e, f, pc, best) in enumerate(m):
        bb = f'<span class="tag g" style="float:right">{best}</span>' if best else ''
        cards += (f'<div class="gl" id="{p}m{i}" style="padding:16px 22px"><h3 style="display:block">{a}{bb}</h3><div style="font-size:32px;font-weight:900;color:#FF8A3D;margin-top:4px">{b}</div>'
                  f'<div style="font-size:12px;color:{"#3CCB7F" if c.startswith("+") else "#FF8C8C"};font-weight:700">{c}</div>'
                  f'<div style="height:8px;border-radius:5px;background:rgba(255,255,255,.08);margin-top:10px"><div style="width:{pc}%;height:100%;border-radius:5px;background:linear-gradient(90deg,#00D4C8,#FF6208)"></div></div>'
                  f'<div style="display:flex;gap:10px;margin-top:10px;font-size:12px"><span class="btn d"><b>{d}</b>&nbsp;Commandes</span><span class="btn d"><b>{e}</b>&nbsp;Factures</span><span class="btn d"><b style="color:#3CCB7F">{f}</b>&nbsp;Bénéfice</span></div></div>')
    return f'''<div class="dk">{dk_top(f'<div class="av"><img src="{FOUNDER_AV}" alt="" /></div>', 'Gnohité Djôlo', 'Patron')}
<div class="main"><h1>Historique</h1><p class="sub" style="font-size:13px">Tout ce que fait l'équipe</p>
  <div style="display:flex;gap:8px;margin-top:12px"><span class="btn d">Factures</span><span class="btn d">SAV</span><span class="btn v">Résumé mensuel</span></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px">{cards}</div></div></div>'''


def mini_dk(p):
    """Light-weight desktop dashboard for small device thumbnails."""
    return dk_dashboard(p)


# =================================================================== scenes
HOSTS = {}


def host(name, s, e):
    s, e = M(s), (e if e == DUR else M(e))
    HOSTS[name] = (r(s), r(e))
    return lambda t: r(t - s), r(e - s)


# ---------- background (whole film)
def build_bg():
    body = '''    <div id="bg-base" class="clip" data-start="0" data-duration="__DUR__"></div>
    <div id="bg-grid" class="clip" data-start="0" data-duration="__DUR__"></div>
    <div id="bg-b1" class="clip blob" data-start="0" data-duration="__DUR__"></div>
    <div id="bg-b2" class="clip blob" data-start="0" data-duration="__DUR__"></div>
    <div id="bg-b3" class="clip blob" data-start="0" data-duration="__DUR__"></div>
    <div id="bg-vig" class="clip" data-start="0" data-duration="__DUR__"></div>'''.replace('__DUR__', str(DUR))
    css = '''
    #bg-base { position:absolute; inset:0; background:radial-gradient(130% 80% at 50% 10%, #0F1C2C 0%, #0B0F14 55%, #06080C 100%); }
    #bg-grid { position:absolute; inset:-200px; background-image:linear-gradient(rgba(0,212,200,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,200,.06) 1px, transparent 1px); background-size:90px 90px; -webkit-mask-image:radial-gradient(60% 50% at 50% 45%, #000 0%, transparent 100%); mask-image:radial-gradient(60% 50% at 50% 45%, #000 0%, transparent 100%); }
    .blob { position:absolute; border-radius:50%; filter:blur(120px); }
    #bg-b1 { width:760px; height:760px; left:520px; top:-180px; background:rgba(0,212,200,.30); }
    #bg-b2 { width:820px; height:820px; left:-360px; top:1180px; background:rgba(255,98,8,.24); }
    #bg-b3 { width:620px; height:620px; left:300px; top:700px; background:rgba(40,110,255,.16); }
    #bg-vig { position:absolute; inset:0; background:radial-gradient(120% 90% at 50% 50%, transparent 60%, rgba(0,0,0,.55) 100%); }'''
    js = f'''
    tl.to("#bg-b1", {{ x:-420, y:520, duration:{DUR / 2}, ease:"sine.inOut", yoyo:true, repeat:1 }}, 0);
    tl.to("#bg-b2", {{ x:520, y:-640, duration:{DUR / 2}, ease:"sine.inOut", yoyo:true, repeat:1 }}, 0);
    tl.to("#bg-b3", {{ x:-260, y:420, scale:1.4, duration:{DUR / 3}, ease:"sine.inOut", yoyo:true, repeat:2 }}, 0);
    tl.fromTo("#bg-grid", {{ y:0 }}, {{ y:180, duration:{DUR}, ease:"none" }}, 0);'''
    write('bg', scene('bg', body, css, js))
    HOSTS['bg'] = (0, DUR)


# ---------- 0. logo intro
def build_intro():
    L, HD = host('intro', 0, 5.0)
    body = '''    <video id="in-logo" class="clip" data-start="0" data-duration="5.0" src="assets/brand/logo_anim.webm" muted playsinline></video>'''
    css = '#in-logo { position:absolute; left:0; top:656px; width:1080px; height:608px; }'
    js = '''
    tl.fromTo("#in-logo", { opacity:0 }, { opacity:1, duration:0.3 }, 0);
    tl.to("#in-logo", { scale:1.12, opacity:0, filter:"blur(16px)", duration:0.55, ease:"power2.in" }, 4.4);'''
    write('intro', scene('intro', body, css, js))


# ---------- 1. hook: morphing tile (unique businesses) -> phone outline
def build_hook():
    S = 4.5
    L, HD = host('hook', S, 11.15)
    icons = ['store', 'pill', 'utensils', 'cart', 'bag', 'phone']
    ico = ''.join(f'<div class="hk-i" id="hk-i{i}">{ic(n, 150, "#fff", 1.6)}</div>' for i, n in enumerate(icons))
    b1, c1, j1 = kin('hk-l1', 'Votre activité…', 250, 96, L(W('Votre')), L(W('Alors')) + 0.2)
    b2, c2, j2 = kin('hk-l2', 'est <span class="o">unique.</span>', 370, 132, L(W('elle')), L(W('Alors')) + 0.25)
    b3, c3, j3 = kin('hk-l3', 'Et votre application', 220, 76, L(W('pourquoi')), 6.55, stagger=0.08)
    b4, c4, j4 = kin('hk-l4', 'de gestion <span class="t">?</span>', 315, 76, L(W('gestion')), 6.55)
    body = f'''    <div id="hk-shape" class="clip" data-start="0" data-duration="6.55">{ico}</div>
    <div id="hk-ph" class="clip" data-start="0" data-duration="6.55"><div id="hk-q">?</div></div>
{b1}{b2}{b3}{b4}'''
    css = c1 + c2 + c3 + c4 + '''
    #hk-shape { position:absolute; left:390px; top:830px; width:300px; height:300px; border-radius:90px; background:linear-gradient(135deg,#FF7A26,#FF5A00 45%,#00D4C8); box-shadow:0 40px 90px rgba(255,98,8,.35), 0 0 0 2px rgba(255,255,255,.15) inset; display:flex; align-items:center; justify-content:center; }
    .hk-i { position:absolute; left:75px; top:75px; width:150px; height:150px; opacity:0; }
    #hk-ph { position:absolute; left:375px; top:640px; width:330px; height:680px; border-radius:58px; background:linear-gradient(135deg,rgba(0,212,200,.12),rgba(11,15,20,.6)); box-shadow:0 40px 90px rgba(0,212,200,.25), 0 0 0 5px #00D4C8 inset; opacity:0; }
    #hk-q { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:220px; font-weight:900; color:#00D4C8; opacity:0; }'''
    js = j1 + j2 + j3 + j4
    js += '''
    tl.fromTo("#hk-shape", { scale:0, rotation:-40 }, { scale:1, rotation:0, duration:0.7, ease:"back.out(1.6)" }, 0.05);'''
    # cycle icons with shape morphs (Morph.)
    radii = [90, 150, 40, 120, 60, 150]
    t = 0.75
    for i in range(6):
        js += f'''
    tl.fromTo("#hk-i{i}", {{ opacity:0, scale:0.5, rotation:-20 }}, {{ opacity:1, scale:1, rotation:0, duration:0.25, ease:"back.out(2)" }}, {r(t)});
    tl.to("#hk-i{i}", {{ opacity:0, scale:1.3, duration:0.18, ease:"power2.in" }}, {r(t + 0.42)});
    tl.to("#hk-shape", {{ borderRadius:{radii[i]}, rotation:{(i % 2) * 10 - 5}, duration:0.4, ease:"power3.inOut" }}, {r(t)});'''
        t += 0.42
    # morph into a phone outline
    tp = L(W('pourquoi'))
    js += f'''
    tl.to("#hk-shape", {{ scaleX:1.1, scaleY:2.2, borderRadius:58, opacity:0, duration:0.6, ease:"expo.in" }}, {r(tp)});
    tl.fromTo("#hk-ph", {{ scaleX:0.9, scaleY:0.45, opacity:0 }}, {{ scaleX:1, scaleY:1, opacity:1, duration:0.7, ease:"expo.out" }}, {r(tp + 0.35)});
    tl.fromTo("#hk-q", {{ opacity:0, scale:0.4 }}, {{ opacity:1, scale:1, duration:0.5, ease:"back.out(2)" }}, {r(tp + 0.8)});
    tl.to("#hk-q", {{ scale:1.12, duration:0.5, yoyo:true, repeat:3, ease:"sine.inOut" }}, {r(tp + 1.3)});
    tl.to("#hk-ph", {{ scale:3.2, opacity:0, filter:"blur(20px)", duration:0.5, ease:"power3.in" }}, 6.0);'''
    write('hook', scene('hook', body, css, js))


# ---------- 2. the need: notebook / WhatsApp / stock chaos
def build_besoin():
    S = 11.0
    L, HD = host('besoin', S, 21.6)
    note = '''<div class="bs-tag">Ventes notées dans un cahier</div>
      <div class="nb-line"><s>12/10 Galaxy A16 ........ 95 000</s></div><div class="nb-line">13/10 iPhone 11 ..... 140 000 (avance ?)</div>
      <div class="nb-line">14/10 Écouteurs x2 ........ ??? </div><div class="nb-line">15/10 Client Koffi — payé ? </div><div class="nb-line">Total semaine = ...... </div>'''
    wa = f'''<div class="bs-tag">Factures perdues dans WhatsApp</div>
      <div class="wa-h">{ic('wa', 34)}<b>Boutique — Équipe</b></div>
      <div class="wa-m l">La facture de Koffi, tu l'as envoyée ?</div><div class="wa-m r">Je ne la retrouve plus…</div><div class="wa-m l">C'était quel prix déjà ?</div>'''
    st = f'''<div class="bs-tag">Stock vérifié au dernier moment</div>
      <div class="st-r"><span>{ic('phone', 34, '#9FB0C2')}</span><div><b>Galaxy A16 128 Go</b><em>Stock : <i id="bs-q">?</i></em></div></div>
      <div class="st-al">{ic('alert', 26, '#FF7B7B')} Rupture découverte trop tard</div>'''
    tf = L(W('Franchement'))
    b1, c1, j1 = kin('bs-l1', 'Votre commerce', 760, 100, L(W('votre', 1, 19.5)), 10.6)
    b2, c2, j2 = kin('bs-l2', 'mérite <span class="t">mieux.</span>', 880, 128, L(W('mérite')), 10.6)
    body = f'''    <div id="bs-nb" class="clip bs-card" data-start="{L(W('Des')) - 0.15}" data-duration="{r(tf - L(W('Des')) + 0.9)}">{note}</div>
    <div id="bs-wa" class="clip bs-card" data-start="{L(W('des', 1, 12.5)) - 0.15}" data-duration="{r(tf - L(W('des', 1, 12.5)) + 0.9)}">{wa}</div>
    <div id="bs-st" class="clip bs-card" data-start="{L(W('stock')) - 0.2}" data-duration="{r(tf - L(W('stock')) + 1.0)}">{st}</div>
{b1}{b2}'''
    css = c1 + c2 + '''
    .bs-card { position:absolute; border-radius:26px; padding:70px 36px 30px; box-shadow:0 40px 80px rgba(0,0,0,.55); }
    .bs-tag { position:absolute; left:28px; top:-26px; padding:12px 24px; border-radius:30px; background:#FF6208; color:#fff; font-weight:800; font-size:30px; white-space:nowrap; box-shadow:0 10px 30px rgba(255,98,8,.45); }
    #bs-nb { left:90px; top:260px; width:820px; background:#F4EEDC; color:#2B3A55; background-image:repeating-linear-gradient(transparent 0 58px, rgba(60,100,160,.25) 58px 60px); }
    .nb-line { font-family:"EB Garamond",serif; font-style:italic; font-size:44px; height:60px; line-height:60px; white-space:nowrap; }
    .nb-line s { color:#9A3B2A; }
    #bs-wa { left:170px; top:820px; width:780px; background:#0E1B16; border:2px solid rgba(37,211,102,.35); }
    .wa-h { display:flex; align-items:center; gap:14px; font-size:30px; margin-bottom:18px; }
    .wa-m { font-size:32px; font-weight:600; padding:16px 22px; border-radius:20px; margin:10px 0; width:max-content; max-width:600px; }
    .wa-m.l { background:#1F2C26; } .wa-m.r { background:#0F5D45; margin-left:auto; }
    #bs-st { left:110px; top:1370px; width:700px; background:#121A27; border:2px solid rgba(255,123,123,.45); }
    .st-r { display:flex; gap:20px; align-items:center; }
    .st-r > span { width:84px; height:84px; border-radius:22px; background:#1C2738; display:flex; align-items:center; justify-content:center; }
    .st-r b { display:block; font-size:38px; } .st-r em { font-style:normal; font-size:32px; color:#9FB0C2; }
    #bs-q { font-style:normal; font-size:44px; font-weight:900; color:#FF7B7B; }
    .st-al { margin-top:20px; display:flex; gap:12px; align-items:center; font-size:28px; font-weight:700; color:#FF9A9A; }'''
    js = j1 + j2
    for sel, rot, dx, t0 in [('#bs-nb', -5, -500, L(W('Des'))), ('#bs-wa', 4, 520, L(W('des', 1, 12.5))), ('#bs-st', -3, -520, L(W('stock')))]:
        js += f'''
    tl.fromTo("{sel}", {{ x:{dx}, rotation:{rot * 3}, opacity:0, filter:"blur(10px)" }}, {{ x:0, rotation:{rot}, opacity:1, filter:"blur(0px)", duration:0.6, ease:"expo.out" }}, {r(t0 - 0.1)});
    tl.to("{sel}", {{ y:26, rotation:{rot * 1.4}, duration:{r(tf - t0 - 0.5)}, ease:"sine.inOut" }}, {r(t0 + 0.5)});
    tl.to("{sel}", {{ y:926, rotation:{rot * 6}, opacity:0, filter:"blur(14px) grayscale(1)", duration:0.8, ease:"power3.in" }}, {r(tf + 0.05)});'''
    js += f'''
    tl.to("#bs-nb, #bs-wa, #bs-st", {{ filter:"saturate(.35) brightness(.7)", duration:0.6 }}, {r(tf - 0.6)});
    tl.fromTo("#bs-q", {{ opacity:1 }}, {{ opacity:0.15, duration:0.25, yoyo:true, repeat:9, ease:"none" }}, {r(L(W('stock')) + 0.4)});
    tl.from(".wa-m", {{ opacity:0, y:20, duration:0.3, stagger:0.45, ease:"power2.out" }}, {r(L(W('des', 1, 12.5)) + 0.3)});
    tl.from(".nb-line", {{ opacity:0, x:-30, duration:0.25, stagger:0.18, ease:"power2.out" }}, {r(L(W('Des')) + 0.2)});'''
    write('besoin', scene('besoin', body, css, js))


# ---------- 3. reveal: BG-MARKET -> BG-MARKET-GESTION -> devices
def build_reveal():
    S = 21.5
    L, HD = host('reveal', S, 31.55)
    tv = L(W('Voici'))
    tdev = L(W('téléphone'))
    b1, c1, j1 = kin('rv-l1', 'On a commencé… <span class="t">par nous-mêmes.</span>', 980, 64, L(W('on', 1, 22)), r(tv + 0.1), weight=800)
    b2, c2, j2 = kin('rv-l2', 'L\'application qui organise <span class="o">notre boutique</span>', 560, 50, L(W("L'application")), HD, weight=700)
    devices = (phone('rv-ph', 0.56, dash_phone('rvp'), 'left:770px;top:1250px;') +
               tablet('rv-tb', 0.37, mini_dk('rvt'), 'left:60px;top:1390px;') +
               laptop('rv-lp', 0.64, mini_dk('rvl'), 'left:104px;top:700px;'))
    body = f'''    <img id="rv-logo" class="clip" data-start="{L(W('Chez')) - 0.1}" data-duration="{r(HD - L(W('Chez')) + 0.1)}" src="assets/brand/logo_bg_market.png" alt="BG MARKET" />
    <div id="rv-ttl" class="clip cap big" data-start="{tv}" data-duration="{r(HD - tv)}"><span class="w">BG-MARKET</span><br><span class="w o" id="rv-g">GESTION</span></div>
{b1}{b2}
    <div id="rv-dev" class="clip" data-start="{r(tdev - 0.2)}" data-duration="{r(HD - tdev + 0.2)}">{devices}
      <div class="rv-dl" id="rv-d1" style="left:800px;top:1795px">Téléphone</div><div class="rv-dl" id="rv-d2" style="left:180px;top:1745px">Tablette</div><div class="rv-dl" id="rv-d3" style="left:430px;top:1270px">Ordinateur</div></div>'''
    css = c1 + c2 + '''
    #rv-logo { position:absolute; left:110px; top:560px; width:860px; height:auto; }
    #rv-ttl { top:250px; font-size:118px; line-height:.95; }
    #rv-g { font-size:150px; letter-spacing:.06em; }
    .rv-dl { position:absolute; font-size:30px; font-weight:800; color:#00D4C8; letter-spacing:.06em; }'''
    js = j1 + j2 + f'''
    tl.fromTo("#rv-logo", {{ opacity:0, scale:0.8, filter:"blur(20px)" }}, {{ opacity:1, scale:1, filter:"blur(0px)", duration:0.8, ease:"expo.out" }}, {r(L(W('Chez')) - 0.1)});
    tl.to("#rv-logo", {{ y:-120, scale:0.6, opacity:0, filter:"blur(12px)", duration:0.6, ease:"power3.in" }}, {r(tv - 0.2)});
    tl.from("#rv-ttl .w", {{ opacity:0, y:80, filter:"blur(16px)", duration:0.7, ease:"expo.out", stagger:0.2 }}, {r(tv + 0.3)});
    tl.to("#rv-ttl", {{ y:-20, scale:0.82, duration:0.7, ease:"power3.inOut" }}, {r(L(W("L'application")) - 0.3)});
    tl.fromTo("#rv-ph", {{ y:500, opacity:0, rotation:8 }}, {{ y:0, opacity:1, rotation:0, duration:0.7, ease:"expo.out" }}, {r(tdev - 0.15)});
    tl.fromTo("#rv-tb", {{ x:-600, opacity:0, rotation:-6 }}, {{ x:0, opacity:1, rotation:0, duration:0.7, ease:"expo.out" }}, {r(L(W('tablette')) - 0.15)});
    tl.fromTo("#rv-lp", {{ y:-400, opacity:0, scale:0.85 }}, {{ y:0, opacity:1, scale:1, duration:0.8, ease:"expo.out" }}, {r(L(W('ordinateur')) - 0.25)});
    tl.from("#rv-d1", {{ opacity:0, y:20, duration:0.3 }}, {r(tdev + 0.3)});
    tl.from("#rv-d2", {{ opacity:0, y:20, duration:0.3 }}, {r(L(W('tablette')) + 0.3)});
    tl.from("#rv-d3", {{ opacity:0, y:20, duration:0.3 }}, {r(L(W('ordinateur')) + 0.3)});
    tl.to("#rv-dev", {{ opacity:0, scale:1.15, filter:"blur(14px)", duration:0.4, ease:"power2.in" }}, {r(HD - 0.4)});
    tl.to(["#rv-ttl"], {{ opacity:0, y:-60, duration:0.35, ease:"power2.in" }}, {r(HD - 0.4)});'''
    write('reveal', scene('reveal', body, css, js))


def precommande_screen(p):
    return f'''<div class="app" id="{p}pre" style="z-index:55">{statusbar()}{header(av_img(FOUNDER_AV))}
<div class="scroll">
  <div class="ttl"><div class="bk">{ic('left', 18)}</div><div><h2>Précommandes</h2><p>Acomptes, versements et soldes</p></div></div>
  <div class="tabs"><span class="on">En cours</span><span>Acompte</span><span>Soldée</span><span>Retirée</span></div>
  <div class="crd" style="border-color:rgba(255,98,8,.45)">
    <div style="display:flex;align-items:center;gap:10px"><div class="ri" style="width:42px;height:42px;border-radius:12px;background:rgba(255,98,8,.14);color:#FF8A3D;display:flex;align-items:center;justify-content:center">{ic('card', 20)}</div>
      <div style="flex:1"><b style="font-size:15px">Ange N'Guessan</b><div style="font-size:12px;color:#8FA0B3">iPhone 15 Pro · 256 Go · PRE-041</div></div>
      <span class="tag o" id="{p}ptag">Acompte</span><span class="tag g" id="{p}ptag2" style="position:absolute;right:32px;opacity:0">Soldée</span></div>
    <div style="display:flex;justify-content:space-between;margin-top:14px;font-size:12px;color:#8FA0B3"><span>Prix total</span><span>Versé</span><span>Reste à payer</span></div>
    <div style="display:flex;justify-content:space-between;margin-top:2px;font-size:15px;font-weight:800"><span>650 000 F</span><span style="color:#3CCB7F" id="{p}pv">250 000 F</span><span style="color:#FF8A3D" id="{p}pr">400 000 F</span></div>
    <div style="margin-top:12px;height:12px;border-radius:7px;background:rgba(255,255,255,.08)"><div id="{p}pbar" style="width:38%;height:100%;border-radius:7px;background:linear-gradient(90deg,#FF6208,#00D4C8)"></div></div>
    <div style="margin-top:14px;font-size:12.5px;line-height:2;font-weight:600">
      <div>{ic('check', 14, GREEN, 3)} 20/10 · Acompte initial <b style="float:right">250 000 F</b></div>
      <div id="{p}h2">{ic('check', 14, GREEN, 3)} 24/10 · Versement <b style="float:right">+200 000 F</b></div>
      <div id="{p}h3">{ic('check', 14, GREEN, 3)} 26/10 · Solde <b style="float:right">+200 000 F</b></div></div></div>
  <div class="crd" style="opacity:.55"><div style="display:flex;justify-content:space-between"><b>Fatou Bamba</b><span class="tag o">Acompte</span></div><div style="font-size:12px;color:#8FA0B3;margin-top:4px">Galaxy S24 · 256 Go · 40 % versé</div></div>
</div>{nav('menu')}</div>'''


# ---------- 4+5. phone: dashboard tour, sale, invoice, pre-order
def build_phone():
    S = 31.4
    L, HD = host('phone', S, 53.05)
    s = 1.42
    p = 'pd'
    taps = ''.join(f'<div class="tap" id="{p}tap{i}" style="left:{x}px;top:{y}px"></div>' for i, (x, y) in enumerate([(195, 792), (100, 545), (195, 712), (195, 712)]))
    toast = f'<div class="toast" id="{p}toast"><i>{ic("check", 16, "#06301E", 3)}</i>Commande CMD-212 enregistrée</div>'
    ov = '<div class="app" style="background:transparent;z-index:%d">%s</div>'
    inner = dash_phone(p) + ov % (20, sheet_create(p)) + form_commande(p) + ov % (70, toast) + precommande_screen(p) + taps
    ph = phone('pd-phone', s, inner, 'left:250px;top:610px;')
    # pop-out widgets (copies of KPI cards)
    w1 = f'<div id="pd-w1" class="clip app popw" data-start="{L(W("ventes,", 1, 34)) - 0.1}" data-duration="{r(L(W("l\'évolution")) - L(W("ventes,", 1, 34)) + 0.2)}">{kpi("", "cart", "Ventes du jour", "0 F", "+3 ventes aujourd\'hui", TEAL, [6, 9, 5, 12, 8, 14, 26], "pdw1v", True)}</div>'
    w2 = f'<div id="pd-w2" class="clip app popw" data-start="{L(W("bénéfice")) - 0.1}" data-duration="{r(L(W("l\'évolution")) - L(W("bénéfice")) + 0.2)}">{kpi("or", "db", "Bénéfice du jour", "+0 F", "Visible par le patron", ORANGE, [4, 7, 5, 9, 6, 10, 22], "pdw2v")}</div>'
    tinv = L(W('facture', 1, 45))
    tpre = L(W('précommande'))
    inv = invoice_paper(p).replace('__S__', str(r(tinv - 0.1))).replace('__D__', str(r(tpre - tinv + 0.5)))
    share = f'''<div id="pd-share" class="clip" data-start="{r(L(W('WhatsApp.', 1, 48)) - 0.3)}" data-duration="{r(tpre - L(W('WhatsApp.', 1, 48)) + 0.8)}">
      <div class="sh-h">{ic('wa', 40)}<div><b>Aïcha Traoré</b><span>07 00 00 00 12</span></div></div>
      <div class="sh-b"><div class="sh-img"><div style="height:6px;background:linear-gradient(90deg,#FF6208,#00D4C8)"></div><b>FACTURE FAC-128</b><span>Total 247 000 F</span></div>
      <p>Bonjour Aïcha, voici votre facture FAC-128. Merci pour votre achat !</p></div>
      <div class="sh-f"><span>Message préparé par l'application</span><div id="pd-send">{ic('send', 30, '#fff', 2.4)}</div></div><div class="tap" id="pd-tapS" style="left:722px;top:396px"></div></div>'''
    btns = f'''<div id="pd-btns" class="clip" data-start="{r(L(W('imprimer')) - 0.2)}" data-duration="{r(tpre - L(W('imprimer')) + 0.6)}">
      <div class="pb" id="pd-b1">{ic('printer', 30)} Imprimer / PDF</div><div class="pb wa" id="pd-b2">{ic('image', 30)} Image WhatsApp</div><div class="tap" id="pd-tapW" style="left:742px;top:52px"></div></div>'''
    caps = []
    caps.append(kin('pd-c1', 'L\'essentiel,', 210, 104, L(W('Dès')), L(W("l'évolution")) - 0.05))
    caps.append(kin('pd-c1b', '<span class="t">en un coup d\'œil.</span>', 330, 84, L(W('tableau')), L(W("l'évolution")) - 0.05))
    caps.append(kin('pd-c2', 'Chiffre d\'affaires', 170, 74, L(W("l'évolution")), L(W('Un', 1, 40)) - 0.05))
    caps.append(kin('pd-c3', '<span class="t">Top produits</span>', 280, 74, L(W('meilleurs')), L(W('Un', 1, 40)) - 0.05))
    caps.append(kin('pd-c4', '<span class="o">Objectif du mois</span>', 390, 74, L(W("l'objectif")), L(W('Un', 1, 40)) - 0.05))
    caps.append(kin('pd-c5', 'Une vente,', 200, 104, L(W('Un', 1, 40)), tinv - 0.1))
    caps.append(kin('pd-c6', 'Client · <span class="t">Téléphone</span> · <span class="o">Prix</span>', 340, 62, L(W('client,')), tinv - 0.1, weight=800))
    caps.append(kin('pd-c7', 'La facture <span class="o">suit…</span>', 230, 96, tinv, tpre - 0.05))
    caps.append(kin('pd-c8', 'Précommandes', 190, 100, tpre, HD))
    caps.append(kin('pd-c9', 'Chaque acompte, <span class="t">jusqu\'au solde.</span>', 320, 60, L(W('garde')), HD, weight=800))
    body = f'''    <div id="pd-wrap" class="clip" data-start="0" data-duration="{HD}">{ph}</div>
    {w1}{w2}{inv}{btns}{share}
''' + ''.join(b for b, c, j in caps)
    css = ''.join(c for b, c, j in caps) + '''
    .popw { position:absolute; width:390px !important; height:auto !important; background:none !important; overflow:visible !important; }
    #pd-w1 { left:20px; top:720px; } #pd-w2 { left:670px; top:960px; }
    .popw .kpi { width:390px; height:200px; box-shadow:0 40px 80px rgba(0,0,0,.6), 0 0 40px rgba(0,212,200,.25); }
    .popw .kpi .kv { font-size:38px; } .popw .kpi .kl { font-size:20px; } .popw .kpi .ks { font-size:16px; }
    #pdinv { left:130px; top:560px; }
    #pd-btns { position:absolute; left:130px; top:1500px; width:820px; height:120px; display:flex; gap:20px; }
    .pb { flex:1; height:96px; border-radius:24px; background:#111826; border:2px solid rgba(255,255,255,.12); display:flex; align-items:center; justify-content:center; gap:14px; font-size:30px; font-weight:800; box-shadow:0 20px 40px rgba(0,0,0,.5); }
    .pb.wa { background:linear-gradient(180deg,#2BD86C,#1DAA54); border-color:transparent; }
    #pd-share { position:absolute; left:150px; top:1020px; width:780px; border-radius:30px; background:#0B141A; border:2px solid rgba(37,211,102,.45); box-shadow:0 50px 100px rgba(0,0,0,.7); padding:26px; }
    .sh-h { display:flex; gap:16px; align-items:center; } .sh-h b { display:block; font-size:30px; } .sh-h span { font-size:22px; color:#8FA0B3; }
    .sh-b { margin-top:20px; margin-left:auto; width:560px; border-radius:20px; background:#005C4B; padding:14px; }
    .sh-img { border-radius:12px; overflow:hidden; background:#fff; color:#0B1726; padding-bottom:12px; }
    .sh-img b { display:block; padding:12px 16px 0; font-size:24px; } .sh-img span { display:block; padding:0 16px; font-size:20px; color:#D9530A; font-weight:800; }
    .sh-b p { margin-top:12px; font-size:24px; line-height:1.35; }
    .sh-f { display:flex; align-items:center; justify-content:space-between; margin-top:18px; font-size:20px; color:#8FA0B3; }
    #pd-send { width:76px; height:76px; border-radius:50%; background:#1DAA54; display:flex; align-items:center; justify-content:center; }
    #pd-wrap { position:absolute; inset:0; }'''
    js = ''.join(j for b, c, j in caps)
    js += f'''
    tl.fromTo("#pd-phone", {{ y:1300, rotation:-7, scale:0.9 }}, {{ y:0, rotation:0, scale:1, duration:1.0, ease:"expo.out" }}, 0);
    tl.set(["#{p}dim", "#{p}sheet", "#{p}toast"], {{ opacity:0 }}, 0);
    tl.set(["#{p}form", "#{p}pre"], {{ x:390 }}, 0);
    tl.set(["#{p}h2", "#{p}h3"], {{ opacity:0 }}, 0);
    tl.from(".{p}bar", {{ scaleY:0, transformOrigin:"50% 100%", duration:0.8, ease:"expo.out", stagger:0.06 }}, 0.6);
    count("#{p}k1, #pdw1v", 0, 485000, {L(W('ventes,', 1, 34))}, 1.1, "", " F");
    count("#{p}k2, #pdw2v", 0, 58500, {L(W('bénéfice'))}, 1.1, "+", " F");
    count("#{p}k3", 0, 6, {L(W('bénéfice')) + 0.3}, 0.8, "", "");
    count("#{p}k4", 0, 3, {L(W('bénéfice')) + 0.45}, 0.8, "", "");
    tl.fromTo("#pd-w1", {{ x:250, y:-200, scale:0.4, opacity:0 }}, {{ x:0, y:0, scale:1, opacity:1, duration:0.6, ease:"back.out(1.4)" }}, {L(W('ventes,', 1, 34)) - 0.1});
    tl.fromTo("#pd-w2", {{ x:-250, y:-300, scale:0.4, opacity:0 }}, {{ x:0, y:0, scale:1, opacity:1, duration:0.6, ease:"back.out(1.4)" }}, {L(W('bénéfice')) - 0.1});
    tl.to(["#pd-w1", "#pd-w2"], {{ scale:0.5, opacity:0, duration:0.3, ease:"power2.in" }}, {L(W("l'évolution")) - 0.2});
    tl.to("#{p}scroll", {{ y:-420, duration:0.7, ease:"power3.inOut" }}, {L(W("l'évolution")) - 0.2});
    tl.fromTo(".{p}bar", {{ scaleY:0 }}, {{ scaleY:1, transformOrigin:"50% 100%", duration:0.7, ease:"expo.out", stagger:0.07, immediateRender:false }}, {L(W("l'évolution")) + 0.3});
    tl.set("#{p}t30", {{ className:"" }}, {L(W("d'affaires")) + 0.1});
    tl.set("#{p}t6", {{ className:"on" }}, {L(W("d'affaires")) + 0.1});
    tl.fromTo(".{p}bar", {{ scaleY:0.2 }}, {{ scaleY:1, transformOrigin:"50% 100%", duration:0.6, ease:"expo.out", stagger:0.05, immediateRender:false }}, {L(W("d'affaires")) + 0.15});
    tl.to("#{p}scroll", {{ y:-1000, duration:0.7, ease:"power3.inOut" }}, {L(W('meilleurs')) - 0.3});
    tl.from(["#{p}tp1", "#{p}tp2", "#{p}tp3"], {{ x:60, opacity:0, duration:0.4, stagger:0.15, ease:"power2.out" }}, {L(W('meilleurs')) + 0.1});
    tl.to("#{p}scroll", {{ y:-1225, duration:0.7, ease:"power3.inOut" }}, {L(W("l'objectif")) - 0.5});
    tl.fromTo("#{p}ring", {{ attr:{{ "stroke-dashoffset":314.16 }} }}, {{ attr:{{ "stroke-dashoffset":91.1 }}, duration:1.3, ease:"power3.out" }}, {L(W("l'objectif"))});
    tl.fromTo("#{p}obj", {{ boxShadow:"0 0 0 rgba(0,212,200,0)" }}, {{ boxShadow:"0 0 40px rgba(0,212,200,.45)", duration:0.6, yoyo:true, repeat:1 }}, {L(W("l'objectif"))});
    tl.to("#{p}scroll", {{ y:0, duration:0.6, ease:"power3.inOut" }}, {L(W('Un', 1, 40)) - 0.1});
    tap("#{p}tap0", {L(W('plus'))});
    tl.to("#{p}fab", {{ rotation:45, duration:0.3, ease:"back.out(2)" }}, {L(W('plus')) + 0.05});
    tl.to("#{p}dim", {{ opacity:1, duration:0.25 }}, {L(W('plus')) + 0.1});
    tl.fromTo("#{p}sheet", {{ y:400, opacity:1 }}, {{ y:0, opacity:1, duration:0.45, ease:"expo.out" }}, {L(W('plus')) + 0.1});
    tap("#{p}tap1", {L(W('commence.')) - 0.1});
    tl.to("#{p}nc", {{ backgroundColor:"rgba(0,212,200,.18)", duration:0.15 }}, {L(W('commence.')) - 0.05});
    tl.to("#{p}form", {{ x:0, duration:0.5, ease:"expo.out" }}, {L(W('commence.')) + 0.3});
    tl.set(["#{p}dim", "#{p}sheet"], {{ opacity:0 }}, {L(W('commence.')) + 0.85});
    tl.set("#{p}f1", {{ className:"inp focus" }}, {L(W('client,')) - 0.05});
    type("#{p}f1", "Aïcha Traoré", {L(W('client,'))}, 0.045);
    tl.set("#{p}f1", {{ className:"inp" }}, {L(W('client,')) + 0.6});
    tl.set("#{p}f2", {{ className:"inp focus" }}, {L(W('client,')) + 0.6});
    type("#{p}f2", "07 00 00 00 12", {L(W('client,')) + 0.62}, 0.025);
    tl.set("#{p}f2", {{ className:"inp" }}, {L(W('téléphone,', 1, 40)) - 0.05});
    tl.set("#{p}f3", {{ className:"inp focus" }}, {L(W('téléphone,', 1, 40)) - 0.05});
    type("#{p}f3", "Samsung Galaxy A56", {L(W('téléphone,', 1, 40))}, 0.035);
    tl.set("#{p}f3", {{ className:"inp" }}, {L(W('téléphone,', 1, 40)) + 0.7});
    tl.set("#{p}neuf", {{ className:"on" }}, {L(W('téléphone,', 1, 40)) + 0.7});
    tl.to("#{p}form .scroll", {{ y:-150, duration:0.5, ease:"power3.inOut" }}, {L(W('prix.')) - 0.4});
    tl.set("#{p}f4", {{ className:"inp focus" }}, {L(W('prix.')) - 0.05});
    type("#{p}f4", "245 000", {L(W('prix.'))}, 0.05);
    tl.set("#{p}f4", {{ className:"inp" }}, {L(W('prix.')) + 0.45});
    tap("#{p}tap2", {L(W('prix.')) + 0.5});
    tl.to("#{p}save", {{ scale:0.96, duration:0.1, yoyo:true, repeat:1 }}, {L(W('prix.')) + 0.5});
    tl.fromTo("#{p}toast", {{ y:-40, opacity:0 }}, {{ y:0, opacity:1, duration:0.35, ease:"back.out(2)" }}, {L(W('prix.')) + 0.65});
    tl.to("#{p}toast", {{ opacity:0, duration:0.3 }}, {tinv + 1.2});
    tl.to("#pd-phone", {{ opacity:0.35, scale:0.94, filter:"blur(3px)", duration:0.5 }}, {tinv - 0.1});
    tl.fromTo("#{p}inv", {{ y:500, scale:0.3, rotation:-8, opacity:0 }}, {{ y:0, scale:1, rotation:0, opacity:1, duration:0.8, ease:"expo.out" }}, {tinv - 0.1});
    tl.to("#{p}inv", {{ y:-20, rotation:0.8, duration:{r(L(W("WhatsApp.", 1, 48)) - 0.3 - tinv - 0.8)}, ease:"sine.inOut" }}, {tinv + 0.8});
    tl.from("#pd-b1", {{ y:60, opacity:0, duration:0.4, ease:"back.out(1.6)" }}, {L(W('imprimer'))});
    tl.to("#pd-b1", {{ borderColor:"#00D4C8", boxShadow:"0 0 30px rgba(0,212,200,.5)", duration:0.25, yoyo:true, repeat:1 }}, {L(W('imprimer')) + 0.3});
    tl.from("#pd-b2", {{ y:60, opacity:0, duration:0.4, ease:"back.out(1.6)" }}, {L(W('envoyer'))});
    tap("#pd-tapW", {L(W('WhatsApp.', 1, 48)) - 0.35});
    tl.to("#pd-b2", {{ scale:0.95, duration:0.1, yoyo:true, repeat:1 }}, {L(W('WhatsApp.', 1, 48)) - 0.35});
    tl.to("#{p}inv", {{ y:-260, scale:0.62, duration:0.6, ease:"power3.inOut" }}, {L(W('WhatsApp.', 1, 48)) - 0.3});
    tl.fromTo("#pd-share", {{ y:300, opacity:0, scale:0.9 }}, {{ y:0, opacity:1, scale:1, duration:0.5, ease:"expo.out" }}, {L(W('WhatsApp.', 1, 48)) - 0.25});
    tap("#pd-tapS", {L(W('Et', 1, 49.4)) + 0.05});
    tl.to("#pd-send", {{ scale:0.85, duration:0.1, yoyo:true, repeat:1 }}, {L(W('Et', 1, 49.4)) + 0.05});
    tl.to(["#{p}inv", "#pd-btns", "#pd-share"], {{ x:-1100, rotation:-8, opacity:0, duration:0.6, ease:"power3.in", stagger:0.05 }}, {tpre - 0.05});
    tl.to("#pd-phone", {{ opacity:1, scale:1, filter:"blur(0px)", duration:0.5 }}, {tpre});
    tl.to("#{p}pre", {{ x:0, duration:0.55, ease:"expo.out" }}, {tpre + 0.1});
    tl.to("#{p}pbar", {{ width:"69%", duration:0.7, ease:"power3.out" }}, {L(W('acomptes'))});
    tl.to("#{p}h2", {{ opacity:1, duration:0.3 }}, {L(W('acomptes'))});
    count("#{p}pv", 250000, 450000, {L(W('acomptes'))}, 0.7, "", " F");
    count("#{p}pr", 400000, 200000, {L(W('acomptes'))}, 0.7, "", " F");
    tl.to("#{p}pbar", {{ width:"100%", duration:0.7, ease:"power3.out" }}, {L(W('solde.'))});
    tl.to("#{p}h3", {{ opacity:1, duration:0.3 }}, {L(W('solde.'))});
    count("#{p}pv", 450000, 650000, {L(W('solde.'))}, 0.7, "", " F");
    count("#{p}pr", 200000, 0, {L(W('solde.'))}, 0.7, "", " F");
    tl.to("#{p}ptag", {{ opacity:0, duration:0.2 }}, {L(W('solde.')) + 0.4});
    tl.to("#{p}ptag2", {{ opacity:1, duration:0.2 }}, {L(W('solde.')) + 0.4});
    tl.to("#pd-phone", {{ scale:0.5, y:-300, opacity:0, filter:"blur(12px)", duration:0.5, ease:"power3.in" }}, {r(HD - 0.5)});'''
    write('phone', scene('phone', body, css, js))


# ---------- 6. follow-up: SAV / stock / suppliers widget grid
def build_suivi():
    S = 52.95
    L, HD = host('suivi', S, 62.05)
    steps = ['Déposé', 'En réparation', 'Prêt', 'Restitué']
    st = ''.join(f'<div class="sv-n" id="sv-n{i}"><i>{ic("check", 26, "#04222A", 3.2)}</i><span>{n}</span></div>' for i, n in enumerate(steps))
    tsav = L(W('SAV'))
    tst = L(W('stock', 1, 56))
    tfo = L(W('fournisseurs', 1, 58))
    body = f'''    <div id="sv-a" class="clip glass sv-t" data-start="{r(tsav - 0.2)}" data-duration="{r(HD - tsav + 0.2)}">
      <div class="sv-h"><span class="sv-ic" style="background:rgba(245,192,74,.15);color:#F5C04A">{ic('wrench', 34)}</span><div><b>SAV-034 · Mariam Diallo</b><em>Tecno Spark 20 · Écran fissuré</em></div><span class="sv-tag" id="sv-tag">Déposé</span></div>
      <div class="sv-st"><div class="sv-line"><i id="sv-fill"></i></div>{st}</div></div>
    <div id="sv-b" class="clip glass sv-t" data-start="{r(tst - 0.2)}" data-duration="{r(HD - tst + 0.2)}">
      <div class="sv-h"><span class="sv-ic" style="background:rgba(255,98,8,.15);color:#FF8A3D">{ic('alert', 34)}</span><div><b>Stock bas</b><em>Seuil d'alerte : 2</em></div></div>
      <div class="sv-r">Samsung Galaxy A16 128 Go <span class="tg o">1 restant</span></div><div class="sv-r">iPhone 14 128 Go <span class="tg r">Rupture</span></div></div>
    <div id="sv-bell" class="clip glass" data-start="{r(tst - 0.1)}" data-duration="{r(HD - tst + 0.1)}"><div id="sv-bi">{ic('bell', 84, '#fff', 1.8)}</div><b>2</b></div>
    <div id="sv-c" class="clip glass sv-t" data-start="{r(tfo - 0.25)}" data-duration="{r(HD - tfo + 0.25)}">
      <div class="sv-h"><span class="sv-ic" style="background:rgba(0,212,200,.15);color:#00D4C8">{ic('factory', 34)}</span><div><b>Prix fournisseurs</b><em>Samsung Galaxy A56 · 256 Go</em></div><span class="sv-an" id="sv-an">Analyser</span></div>
      <div class="sv-body"><div class="sv-paste" id="sv-paste">Galaxy A56 256Go - 228.000<br>A56 256 Go : 221k<br>Galaxy A56 256Go | 226 500 F</div>
      <div class="sv-fr" id="sv-f0"><span>Fournisseur Plateau</span><b>228 000 F</b></div>
      <div class="sv-fr best" id="sv-f1"><span>Fournisseur Adjamé <em id="sv-best">Meilleur prix</em></span><b>221 000 F</b></div>
      <div class="sv-fr" id="sv-f2"><span>Fournisseur Treichville</span><b>226 500 F</b></div>
      <div class="sv-mg" id="sv-mg">Prix de vente 245 000 F · marge estimée <b>+24 000 F</b></div></div></div>
'''
    caps = [kin('sv-k1', 'Le SAV, <span class="t">étape par étape.</span>', 160, 70, tsav, tst - 0.05),
            kin('sv-k2', 'Le stock <span class="o">vous prévient.</span>', 160, 70, tst, tfo - 0.05),
            kin('sv-k3', 'Le meilleur prix <span class="t">fournisseur.</span>', 160, 66, tfo, HD)]
    body += ''.join(b for b, c, j in caps)
    css = ''.join(c for b, c, j in caps) + '''
    .sv-t { position:absolute; left:60px; width:960px; padding:30px 34px; }
    #sv-a { top:330px; } #sv-b { top:800px; width:600px; } #sv-c { top:1200px; }
    #sv-bell { position:absolute; left:690px; top:800px; width:330px; height:330px; display:flex; align-items:center; justify-content:center; }
    #sv-bell b { position:absolute; right:84px; top:80px; width:56px; height:56px; border-radius:50%; background:#FF4D5E; font-size:30px; display:flex; align-items:center; justify-content:center; }
    .sv-h { display:flex; align-items:center; gap:20px; }
    .sv-h b { display:block; font-size:34px; } .sv-h em { font-style:normal; font-size:24px; color:#8FA0B3; }
    .sv-ic { width:72px; height:72px; border-radius:20px; display:flex; align-items:center; justify-content:center; flex:none; }
    .sv-tag { margin-left:auto; font-size:22px; font-weight:800; padding:8px 18px; border-radius:20px; color:#F5C04A; border:2px solid rgba(245,192,74,.5); }
    .sv-st { position:relative; display:flex; justify-content:space-between; margin-top:40px; }
    .sv-line { position:absolute; left:50px; right:50px; top:26px; height:8px; border-radius:4px; background:rgba(255,255,255,.1); }
    .sv-line i { display:block; height:100%; width:100%; border-radius:4px; background:linear-gradient(90deg,#F5C04A,#00D4C8); transform-origin:left; }
    .sv-n { position:relative; width:180px; text-align:center; }
    .sv-n i { width:60px; height:60px; margin:0 auto; border-radius:50%; background:#1C2738; border:3px solid rgba(255,255,255,.15); display:flex; align-items:center; justify-content:center; }
    .sv-n i svg { opacity:0; }
    .sv-n span { display:block; margin-top:14px; font-size:24px; font-weight:700; color:#8FA0B3; }
    .sv-r { display:flex; justify-content:space-between; align-items:center; margin-top:22px; font-size:24px; font-weight:700; }
    .tg { font-size:20px; padding:5px 14px; border-radius:16px; font-weight:800; }
    .tg.o { color:#FF9A4D; border:2px solid rgba(255,98,8,.5); } .tg.r { color:#FF7B7B; border:2px solid rgba(255,123,123,.5); }
    .sv-an { margin-left:auto; font-size:24px; font-weight:800; padding:14px 26px; border-radius:18px; background:linear-gradient(180deg,#FF7A26,#FF5A00); }
    .sv-body { position:relative; height:400px; }
    .sv-paste { position:absolute; left:0; right:0; top:22px; margin-top:0; font-size:24px; line-height:1.5; color:#B5C4D4; background:#0A101A; border:1px dashed rgba(255,255,255,.2); border-radius:16px; padding:16px 20px; font-family:"JetBrains Mono",monospace; }
    .sv-fr { display:flex; justify-content:space-between; align-items:center; margin-top:14px; padding:18px 22px; border-radius:18px; background:#0E1522; border:1px solid rgba(255,255,255,.08); font-size:27px; font-weight:700; }
    .sv-fr b { font-size:30px; } .sv-fr.best { border:2px solid #00D4C8; background:rgba(0,212,200,.10); }
    .sv-fr em { font-style:normal; font-size:19px; font-weight:800; color:#04222A; background:#00D4C8; padding:4px 12px; border-radius:14px; margin-left:12px; vertical-align:middle; }
    .sv-mg { margin-top:16px; font-size:24px; color:#9FB0C2; text-align:right; } .sv-mg b { color:#3CCB7F; }'''
    js = ''.join(j for b, c, j in caps)
    js += f'''
    tl.fromTo("#sv-a", {{ y:200, opacity:0, scale:0.9 }}, {{ y:0, opacity:1, scale:1, duration:0.6, ease:"expo.out" }}, {r(tsav - 0.2)});
    tl.set("#sv-fill", {{ scaleX:0 }}, 0);'''
    tags = ['Déposé', 'En réparation', 'Prêt', 'Restitué']
    for i in range(4):
        t = tsav + 0.3 + i * 0.95
        js += f'''
    tl.to("#sv-n{i} i", {{ backgroundColor:"#00D4C8", borderColor:"#00D4C8", scale:1.15, duration:0.25, ease:"back.out(3)" }}, {r(t)});
    tl.to("#sv-n{i} i", {{ scale:1, duration:0.2 }}, {r(t + 0.25)});
    tl.to("#sv-n{i} i svg", {{ opacity:1, duration:0.2 }}, {r(t)});
    tl.to("#sv-n{i} span", {{ color:"#ffffff", duration:0.2 }}, {r(t)});
    tl.set("#sv-tag", {{ textContent:"{tags[i]}" }}, {r(t)});
    tl.to("#sv-fill", {{ scaleX:{i / 3}, duration:0.5, ease:"power2.out" }}, {r(t - 0.4 if i else t)});'''
    js += f'''
    tl.set("#sv-tag", {{ color:"#3CCB7F", borderColor:"rgba(60,203,127,.6)" }}, {r(tsav + 0.3 + 3 * 0.95)});
    tl.to("#sv-a", {{ scale:0.9, y:-40, opacity:0.55, duration:0.5, ease:"power2.inOut" }}, {r(tst - 0.2)});
    tl.fromTo("#sv-b", {{ x:-500, opacity:0 }}, {{ x:0, opacity:1, duration:0.6, ease:"expo.out" }}, {r(tst - 0.2)});
    tl.fromTo("#sv-bell", {{ x:400, opacity:0 }}, {{ x:0, opacity:1, duration:0.6, ease:"expo.out" }}, {r(tst - 0.1)});
    tl.fromTo("#sv-bi", {{ rotation:-18 }}, {{ rotation:18, duration:0.12, yoyo:true, repeat:7, ease:"sine.inOut" }}, {r(L(W('prévient')))});
    tl.to("#sv-bi", {{ rotation:0, duration:0.15 }}, {r(L(W('prévient')) + 0.96)});
    tl.from("#sv-bell b", {{ scale:0, duration:0.35, ease:"back.out(3)" }}, {r(L(W('prévient')))});
    tl.to(["#sv-b", "#sv-bell"], {{ opacity:0.55, duration:0.4 }}, {r(tfo - 0.25)});
    tl.fromTo("#sv-c", {{ y:400, opacity:0 }}, {{ y:0, opacity:1, duration:0.6, ease:"expo.out" }}, {r(tfo - 0.25)});
    tl.set(["#sv-f0", "#sv-f1", "#sv-f2", "#sv-mg"], {{ opacity:0 }}, 0);
    tl.to("#sv-an", {{ scale:0.9, duration:0.12, yoyo:true, repeat:1 }}, {r(tfo + 0.55)});
    tl.to("#sv-paste", {{ opacity:0, y:-30, duration:0.35 }}, {r(L(W('comparés')) - 0.3)});
    tl.to(["#sv-f0", "#sv-f1", "#sv-f2"], {{ opacity:1, duration:0.35, stagger:0.15 }}, {r(L(W('comparés')) - 0.1)});
    tl.from("#sv-best", {{ scale:0, duration:0.4, ease:"back.out(3)" }}, {r(L(W('meilleur.', 1, 61)))});
    tl.to("#sv-f1", {{ boxShadow:"0 0 40px rgba(0,212,200,.55)", duration:0.4, yoyo:true, repeat:1 }}, {r(L(W('meilleur.', 1, 61)))});
    tl.to("#sv-mg", {{ opacity:1, duration:0.4 }}, {r(L(W('meilleur.', 1, 61)) + 0.2)});
    tl.to(["#sv-a", "#sv-b", "#sv-bell", "#sv-c"], {{ opacity:0, y:-80, filter:"blur(10px)", duration:0.4, stagger:0.05, ease:"power2.in" }}, {r(HD - 0.5)});'''
    write('suivi', scene('suivi', body, css, js))


# ---------- 7. roles intro
def build_roles():
    S = 61.95
    L, HD = host('roles', S, 64.8)
    people = [('employe', 'Employé', 'Yannick K.', 'Vend · suit ses propres ventes', TEAL), ('admin', 'Administrateur', 'Arnaud B.', 'Valide · stock · fournisseurs', '#3B9BFF'),
              ('founder_r', 'Patron', 'Gnohité Djôlo', 'Voit tout · décide des droits', ORANGE)]
    cards = ''.join(f'<div class="rl-c" id="rl-c{i}" style="top:{560 + i * 380}px;border-color:{c}"><img src="assets/people/{'founder_round.jpg' if n == 'founder_r' else n + '_face.png'}" style="border-color:{c}" alt="" />'
                    f'<div><em style="color:{c}">{role}</em><b>{nm}</b><span>{d}</span></div></div>' for i, (n, role, nm, d, c) in enumerate(people))
    b1, c1, j1 = kin('rl-k1', 'Chacun voit', 190, 110, L(W('chacun')) - 0.3, HD)
    b2, c2, j2 = kin('rl-k2', '<span class="t">ce qu\'il doit voir.</span>', 320, 84, L(W('voit', 1, 63)), HD)
    body = f'    <div id="rl-wrap" class="clip" data-start="0" data-duration="{HD}">{cards}</div>\n' + b1 + b2
    css = c1 + c2 + '''
    #rl-wrap { position:absolute; inset:0; }
    .rl-c { position:absolute; left:80px; width:920px; height:320px; border-radius:36px; border:2px solid; background:linear-gradient(180deg,rgba(20,32,48,.9),rgba(9,14,24,.92)); display:flex; align-items:center; gap:40px; padding:0 40px; box-shadow:0 30px 60px rgba(0,0,0,.45); }
    .rl-c img { width:220px; height:220px; border-radius:50%; border:5px solid; object-fit:cover; background:#0E2235; }
    .rl-c em { display:block; font-style:normal; font-size:28px; font-weight:800; letter-spacing:.2em; text-transform:uppercase; }
    .rl-c b { display:block; font-size:50px; font-weight:900; margin-top:6px; } .rl-c span { display:block; font-size:28px; color:#9FB0C2; margin-top:8px; font-weight:600; }'''
    js = j1 + j2 + '''
    tl.fromTo(".rl-c", { x:1100, opacity:0 }, { x:0, opacity:1, duration:0.6, ease:"expo.out", stagger:0.35 }, 0.25);
    tl.to("#rl-c1, #rl-c2", { opacity:0.3, x:-200, duration:0.4, ease:"power2.in" }, ''' + str(r(HD - 0.5)) + ''');
    tl.to("#rl-c0", { scale:1.15, opacity:0, y:300, duration:0.45, ease:"power2.in" }, ''' + str(r(HD - 0.45)) + ''');'''
    write('roles', scene('roles', body, css, js))


# ---------- 8. employee
def build_employe():
    S = 64.65
    L, HD = host('employe', S, 70.4)
    ph = phone('em-ph', 1.0, dash_employe('em'), 'left:600px;top:560px;')
    tsans = L(W('sans'))
    tsa = L(W('Sa'))
    prod = f'''<div id="em-prod" class="clip glass" data-start="{r(tsans - 0.2)}" data-duration="{r(HD - tsans + 0.2)}">
      <div class="em-h"><span>{ic('phone', 34, TEAL)}</span><div><b>Samsung Galaxy A56</b><em>256 Go · 8 Go RAM · Neuf</em></div></div>
      <div class="em-r"><span>Prix de vente</span><b>245 000 F</b></div>
      <div class="em-r"><span>Prix d'achat</span><b class="em-hid"><i>221 000 F</i>{ic('lock', 30, ORANGE, 2.4)}</b></div>
      <div class="em-note">Masqué pour l'employé</div></div>'''
    fac = f'''<div id="em-fac" class="clip glass" data-start="{r(tsa - 0.2)}" data-duration="{r(HD - tsa + 0.2)}">
      <span class="em-fi">{ic('receipt', 34, TEAL)}</span><div><b>FAC-129 · Koffi Yao</b><em>245 000 F · par Yannick K.</em></div><span id="em-tag">À valider</span></div>'''
    b1, c1, j1 = kin('em-k1', 'Il vend, et suit', 220, 76, L(W("L'employé")) + 0.3, HD)
    b2, c2, j2 = kin('em-k2', '<span class="t">ses propres ventes.</span>', 312, 70, L(W('propres')) - 0.2, HD)
    body = f'''    <div id="em-lab" class="clip lab" data-start="0.05" data-duration="5.7">L'EMPLOYÉ</div>
    <img id="em-man" class="clip" data-start="0" data-duration="{HD}" src="assets/people/employe.png" alt="Employé (illustration)" />
    <div id="em-phw" class="clip" data-start="0" data-duration="{HD}">{ph}</div>
    {prod}{fac}
{b1}{b2}'''
    css = c1 + c2 + '''
    #em-lab { top:120px; }
    #em-man { position:absolute; left:-20px; top:700px; height:1260px; width:auto; filter:drop-shadow(0 30px 60px rgba(0,0,0,.6)); }
    #em-phw { position:absolute; inset:0; }
    #em-prod { position:absolute; left:250px; top:1240px; width:780px; padding:28px 32px; border-color:rgba(255,98,8,.5); }
    .em-h { display:flex; gap:18px; align-items:center; } .em-h > span { width:68px; height:68px; border-radius:18px; background:rgba(0,212,200,.12); display:flex; align-items:center; justify-content:center; }
    .em-h b { display:block; font-size:34px; } .em-h em { font-style:normal; font-size:22px; color:#8FA0B3; }
    .em-r { display:flex; justify-content:space-between; align-items:center; margin-top:18px; font-size:28px; font-weight:700; color:#C9D6E3; } .em-r b { font-size:32px; color:#fff; }
    .em-hid { display:flex; align-items:center; gap:14px; } .em-hid i { font-style:normal; filter:blur(11px); opacity:.8; }
    .em-note { margin-top:14px; font-size:22px; font-weight:800; color:#FF8A3D; text-align:right; letter-spacing:.04em; }
    #em-fac { position:absolute; left:250px; top:1600px; width:780px; padding:24px 30px; display:flex; align-items:center; gap:18px; }
    .em-fi { width:64px; height:64px; border-radius:18px; background:rgba(0,212,200,.12); display:flex; align-items:center; justify-content:center; }
    #em-fac b { display:block; font-size:30px; } #em-fac em { font-style:normal; font-size:22px; color:#8FA0B3; }
    #em-tag { margin-left:auto; font-size:24px; font-weight:800; padding:10px 20px; border-radius:22px; color:#FF9A4D; background:rgba(255,98,8,.14); border:2px solid rgba(255,98,8,.55); white-space:nowrap; }'''
    js = j1 + j2 + f'''
    tl.fromTo("#em-lab", {{ opacity:0, y:-20 }}, {{ opacity:1, y:0, duration:0.4 }}, 0.05);
    tl.fromTo("#em-man", {{ x:-500, opacity:0 }}, {{ x:0, opacity:1, duration:0.8, ease:"expo.out" }}, 0.0);
    tl.fromTo("#em-ph", {{ x:600, rotation:10, opacity:0 }}, {{ x:0, rotation:0, opacity:1, duration:0.8, ease:"expo.out" }}, 0.15);
    tl.to("#em-man", {{ y:-14, duration:2.6, yoyo:true, repeat:1, ease:"sine.inOut" }}, 0.8);
    tl.fromTo("#em-prod", {{ y:300, opacity:0, scale:0.9 }}, {{ y:0, opacity:1, scale:1, duration:0.55, ease:"expo.out" }}, {r(tsans - 0.2)});
    tl.fromTo(".em-hid svg", {{ scale:0 }}, {{ scale:1, duration:0.4, ease:"back.out(3)" }}, {r(L(W("d'achat.")))});
    tl.to("#em-prod", {{ y:-120, scale:0.92, opacity:0.75, duration:0.45, ease:"power2.inOut" }}, {r(tsa - 0.3)});
    tl.fromTo("#em-fac", {{ y:200, opacity:0 }}, {{ y:0, opacity:1, duration:0.5, ease:"expo.out" }}, {r(tsa - 0.2)});
    tl.fromTo("#em-tag", {{ boxShadow:"0 0 0 rgba(255,98,8,0)" }}, {{ boxShadow:"0 0 30px rgba(255,98,8,.7)", duration:0.4, yoyo:true, repeat:3 }}, {r(L(W('validation.')) - 0.2)});
    tl.to(["#em-man", "#em-phw", "#em-prod", "#em-fac", "#em-lab"], {{ opacity:0, x:-120, duration:0.35, ease:"power2.in", stagger:0.03 }}, {r(HD - 0.4)});'''
    write('employe', scene('employe', body, css, js))


# ---------- 9. administrator
def build_admin():
    S = 70.2
    L, HD = host('admin', S, 74.05)
    lp = laptop('ad-lp', 0.72, dk_factures('ad'), 'left:28px;top:420px;')
    tv = L(W('valide…'))
    # Valider button of row 0 sits around (1150, 236) in desktop units -> screen
    cx, cy = r(28 + 14 + 1135 * 0.72), r(420 + 14 + 252 * 0.72)
    body = f'''    <div id="ad-lab" class="clip lab" data-start="0.05" data-duration="3.8">L'ADMINISTRATEUR</div>
    <img id="ad-man" class="clip" data-start="0" data-duration="{HD}" src="assets/people/admin.png" alt="Administrateur (illustration)" />
    <div id="ad-lpw" class="clip" data-start="0" data-duration="{HD}">{lp}<div class="cur" id="ad-cur" style="left:{cx}px;top:{cy}px">{CURSOR}</div><div class="tap" id="ad-tap" style="left:{cx}px;top:{cy}px"></div></div>
    <div id="ad-ch1" class="clip ad-chip" data-start="{r(L(W('stock', 1, 72)) - 0.1)}" data-duration="{r(HD - L(W('stock', 1, 72)) + 0.1)}">{ic('alert', 34, ORANGE)} Stock bas · 2 produits</div>
    <div id="ad-ch2" class="clip ad-chip" data-start="{r(L(W('fournisseurs.', 1, 72)) - 0.1)}" data-duration="{r(HD - L(W('fournisseurs.', 1, 72)) + 0.1)}">{ic('factory', 34, TEAL)} Fournisseurs · prix comparés</div>
'''
    b1, c1, j1 = kin('ad-k1', 'Il <span class="t">valide</span>, surveille', 200, 70, 0.25, HD)
    b2, c2, j2 = kin('ad-k2', 'le stock et les fournisseurs.', 290, 54, L(W('surveille')), HD, weight=800)
    body += b1 + b2
    css = c1 + c2 + '''
    #ad-lab { top:110px; }
    #ad-man { position:absolute; left:610px; top:1090px; height:900px; width:auto; filter:drop-shadow(0 30px 60px rgba(0,0,0,.6)); }
    #ad-lpw { position:absolute; inset:0; }
    .ad-chip { position:absolute; left:60px; display:flex; align-items:center; gap:16px; padding:22px 30px; border-radius:24px; font-size:32px; font-weight:800; background:linear-gradient(180deg,rgba(20,32,48,.92),rgba(9,14,24,.94)); border:2px solid rgba(255,255,255,.14); box-shadow:0 30px 60px rgba(0,0,0,.5); }
    #ad-ch1 { top:1190px; border-color:rgba(255,98,8,.55); } #ad-ch2 { top:1350px; border-color:rgba(0,212,200,.55); }'''
    js = j1 + j2 + f'''
    tl.fromTo("#ad-lab", {{ opacity:0, y:-20 }}, {{ opacity:1, y:0, duration:0.4 }}, 0.05);
    tl.fromTo("#ad-lp", {{ y:-500, opacity:0, scale:0.9 }}, {{ y:0, opacity:1, scale:1, duration:0.7, ease:"expo.out" }}, 0.0);
    tl.fromTo("#ad-man", {{ x:500, opacity:0 }}, {{ x:0, opacity:1, duration:0.7, ease:"expo.out" }}, 0.1);
    tl.fromTo("#ad-cur", {{ x:-420, y:300, opacity:0 }}, {{ x:0, y:0, opacity:1, duration:0.7, ease:"power3.inOut" }}, {r(tv - 0.8)});
    tap("#ad-tap", {r(tv - 0.05)});
    tl.fromTo("#ad-lpw", {{ scale:1 }}, {{ scale:1.45, transformOrigin:"{cx}px {cy}px", duration:0.7, ease:"power3.inOut" }}, {r(tv - 0.9)});
    tl.to("#ad-lpw", {{ scale:1, duration:0.6, ease:"power3.inOut" }}, {r(tv + 0.6)});
    tl.set("#ads0", {{ className:"tag g", textContent:"Validée" }}, {r(tv)});
    tl.to("#adv0", {{ opacity:0.25, duration:0.2 }}, {r(tv)});
    tl.fromTo("#adr0", {{ backgroundColor:"rgba(60,203,127,.0)" }}, {{ backgroundColor:"rgba(60,203,127,.16)", duration:0.3, yoyo:true, repeat:1 }}, {r(tv)});
    tl.fromTo("#ad-ch1", {{ x:-600, opacity:0 }}, {{ x:0, opacity:1, duration:0.5, ease:"expo.out" }}, {r(L(W('stock', 1, 72)) - 0.1)});
    tl.fromTo("#ad-ch2", {{ x:-600, opacity:0 }}, {{ x:0, opacity:1, duration:0.5, ease:"expo.out" }}, {r(L(W('fournisseurs.', 1, 72)) - 0.1)});
    tl.to(["#ad-lab", "#ad-lpw", "#ad-man", "#ad-ch1", "#ad-ch2", "#ad-k1", "#ad-k2"], {{ opacity:0, x:120, duration:0.3, ease:"power2.in", stagger:0.02 }}, {r(HD - 0.35)});'''
    write('admin', scene('admin', body, css, js))


# ---------- 10. boss
def build_patron():
    S = 73.95
    L, HD = host('patron', S, 81.45)
    D = HD
    tb = L(W('bénéfice', 1, 75))
    tp = L(W('performance'))
    tm = L(W('bilan'))
    td = L(W('droits'))
    lp = laptop('pt-lp', 0.72, f'<div id="pt-s1" style="position:absolute;inset:0">{dk_dashboard("pt")}</div><div id="pt-s2" style="position:absolute;inset:0">{dk_perf("pt")}</div><div id="pt-s3" style="position:absolute;inset:0">{dk_months("pt")}</div>', 'left:28px;top:420px;')
    rights = [('Coûts et bénéfices', False), ('Suppression', False), ('Réglages de travail', True), ('Totaux de la boutique', False)]
    rows = ''.join(f'<div class="pt-rr"><span>{n}</span><i class="sw{" on" if on else ""}" id="pt-sw{i}"><u></u></i></div>' for i, (n, on) in enumerate(rights))
    body = f'''    <div id="pt-lab" class="clip lab" data-start="0.05" data-duration="{D - 0.05}">LE PATRON</div>
    <div id="pt-man" class="clip rnd" data-start="0" data-duration="{D}"><img src="assets/people/founder_round.jpg" alt="Gnohité Djôlo" /><span>Gnohité Djôlo · Patron</span></div>
    <div id="pt-lpw" class="clip" data-start="0" data-duration="{D}">{lp}</div>
    <div id="pt-rg" class="clip glass" data-start="{r(td - 0.6)}" data-duration="{r(D - td + 0.6)}"><div class="pt-rh"><img src="assets/people/employe_face.png" alt="" /><div><b>Droits de Yannick K.</b><em>Employé · décidé par le patron</em></div></div>{rows}</div>
'''
    b1, c1, j1 = kin('pt-k1', 'Il voit <span class="o">tout.</span>', 200, 92, L(W('voit', 1, 74.5)) - 0.1, D)
    b2, c2, j2 = kin('pt-k2', 'Et il décide <span class="t">des droits.</span>', 310, 60, L(W("C'est")), D, weight=800)
    body += b1 + b2
    css = c1 + c2 + '''
    #pt-lab { top:110px; }
    .rnd { position:absolute; border-radius:50%; padding:10px; background:conic-gradient(from 200deg,#00D4C8,#FF6208,#00D4C8); box-shadow:0 30px 70px rgba(0,0,0,.6), 0 0 60px rgba(0,212,200,.3); }
    .rnd img { display:block; width:100%; height:100%; border-radius:50%; object-fit:cover; border:8px solid #0B0F14; }
    .rnd span { position:absolute; left:50%; bottom:-34px; transform:translateX(-50%); white-space:nowrap; font-size:26px; font-weight:800; padding:10px 22px; border-radius:24px; background:#0B0F14; border:2px solid rgba(255,98,8,.6); color:#FF8A3D; }
    #pt-man { left:50px; top:1200px; width:360px; height:360px; }
    #pt-lpw { position:absolute; inset:0; }
    #pt-rg { position:absolute; left:440px; top:1150px; width:600px; padding:26px 30px; border-color:rgba(255,98,8,.55); }
    .pt-rh { display:flex; align-items:center; gap:16px; margin-bottom:8px; } .pt-rh img { width:72px; height:72px; border-radius:50%; border:3px solid #00D4C8; object-fit:cover; }
    .pt-rh b { display:block; font-size:30px; } .pt-rh em { font-style:normal; font-size:20px; color:#8FA0B3; }
    .pt-rr { display:flex; justify-content:space-between; align-items:center; margin-top:18px; font-size:26px; font-weight:700; }
    .sw { position:relative; width:84px; height:46px; border-radius:23px; background:#2A3546; display:block; }
    .sw u { position:absolute; left:5px; top:5px; width:36px; height:36px; border-radius:50%; background:#fff; }
    .sw.on { background:#00D4C8; } .sw.on u { left:43px; }'''
    js = j1 + j2 + f'''
    tl.fromTo("#pt-lab", {{ opacity:0, y:-20 }}, {{ opacity:1, y:0, duration:0.4 }}, 0.05);
    tl.fromTo("#pt-lp", {{ y:-500, opacity:0 }}, {{ y:0, opacity:1, duration:0.7, ease:"expo.out" }}, 0.0);
    tl.fromTo("#pt-man", {{ y:400, opacity:0 }}, {{ y:0, opacity:1, duration:0.8, ease:"expo.out" }}, 0.15);
    tl.set(["#pt-s2", "#pt-s3"], {{ opacity:0 }}, 0);
    tl.from(".ptdbar", {{ scaleY:0, transformOrigin:"50% 100%", duration:0.7, ease:"expo.out", stagger:0.06 }}, 0.5);
    count("#ptd2", 0, 58500, {r(tb - 0.1)}, 0.9, "+", " F");
    tl.fromTo("#pt-lp", {{ scale:1 }}, {{ scale:1.18, x:120, y:40, duration:0.6, ease:"power3.inOut" }}, {r(tb - 0.3)});
    tl.to("#pt-lp", {{ scale:1, x:0, y:0, duration:0.5, ease:"power3.inOut" }}, {r(tp - 0.4)});
    tl.to("#pt-s1", {{ opacity:0, duration:0.3 }}, {r(tp - 0.2)});
    tl.to("#pt-s2", {{ opacity:1, duration:0.3 }}, {r(tp - 0.2)});
    tl.fromTo(["#ptb1", "#ptb2"], {{ scaleX:0 }}, {{ scaleX:1, duration:0.7, ease:"expo.out", stagger:0.2 }}, {r(tp + 0.2)});
    tl.fromTo("#ptring", {{ attr:{{ "stroke-dashoffset":314.16 }} }}, {{ attr:{{ "stroke-dashoffset":91.1 }}, duration:1.0, ease:"power3.out" }}, {r(tp + 0.4)});
    tl.to("#pt-s2", {{ opacity:0, duration:0.3 }}, {r(tm - 0.2)});
    tl.to("#pt-s3", {{ opacity:1, duration:0.3 }}, {r(tm - 0.2)});
    tl.from(["#ptm0", "#ptm1", "#ptm2"], {{ y:40, opacity:0, duration:0.4, stagger:0.12, ease:"power2.out" }}, {r(tm)});
    tl.fromTo("#pt-rg", {{ x:600, opacity:0 }}, {{ x:0, opacity:1, duration:0.55, ease:"expo.out" }}, {r(td - 0.6)});
    tl.set("#pt-sw3", {{ className:"sw on" }}, {r(td + 0.25)});
    tl.fromTo("#pt-sw3", {{ scale:1 }}, {{ scale:1.15, duration:0.15, yoyo:true, repeat:1 }}, {r(td + 0.25)});
    tl.to(["#pt-lab", "#pt-lpw", "#pt-man", "#pt-rg", "#pt-k1", "#pt-k2"], {{ opacity:0, y:-80, filter:"blur(10px)", duration:0.35, ease:"power2.in", stagger:0.02 }}, {D - 0.4});'''
    write('patron', scene('patron', body, css, js))


def generic_app(p):
    """Illustrative mock-up of a client's own app (not BG-MARKET-GESTION)."""
    return f'''<div class="app" style="background:#F4F6FA;color:#14202E">
  <div class="sb" style="background:transparent;color:#14202E"><span>08:42</span><span>5G</span></div>
  <div style="position:absolute;left:0;right:0;top:34px;height:70px;display:flex;align-items:center;gap:12px;padding:0 18px">
    <div class="gx-logo" style="width:44px;height:44px;border-radius:14px;background:var(--acc);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:16px">VL</div>
    <b style="font-size:17px;letter-spacing:.08em">VOTRE LOGO</b></div>
  <div style="position:absolute;left:16px;right:16px;top:116px">
    <div style="font-size:24px;font-weight:800">Bonjour, <span style="color:var(--acc)">Gérant</span></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px">
      <div style="height:120px;border-radius:20px;background:var(--acc);color:#fff;padding:14px"><div style="font-size:12px;opacity:.85">Ventes du jour</div><div style="font-size:24px;font-weight:800;margin-top:30px">— F</div></div>
      <div style="height:120px;border-radius:20px;background:#fff;border:2px solid var(--acc);padding:14px"><div style="font-size:12px;color:#5A6B7D">Vos opérations</div><div style="font-size:24px;font-weight:800;margin-top:30px;color:var(--acc)">…</div></div>
      <div style="height:120px;border-radius:20px;background:#fff;padding:14px;border:1px solid #DCE3EC"><div style="font-size:12px;color:#5A6B7D">Vos rôles</div><div style="display:flex;gap:6px;margin-top:34px"><i style="width:26px;height:26px;border-radius:50%;background:var(--acc)"></i><i style="width:26px;height:26px;border-radius:50%;background:var(--acc);opacity:.6"></i><i style="width:26px;height:26px;border-radius:50%;background:var(--acc);opacity:.3"></i></div></div>
      <div style="height:120px;border-radius:20px;background:#fff;padding:14px;border:1px solid #DCE3EC"><div style="font-size:12px;color:#5A6B7D">Vos règles</div><div style="height:8px;border-radius:4px;background:var(--acc);margin-top:44px;width:70%"></div></div>
    </div>
    <div style="margin-top:14px;height:180px;border-radius:20px;background:#fff;border:1px solid #DCE3EC;padding:16px;display:flex;align-items:flex-end;gap:12px">
      {''.join(f'<i style="flex:1;height:{h}%;border-radius:8px;background:var(--acc);opacity:{o}"></i>' for h, o in [(40, .4), (65, .55), (52, .7), (80, .85), (95, 1)])}</div>
  </div>
  <div style="position:absolute;left:12px;right:12px;bottom:14px;height:64px;border-radius:24px;background:#fff;box-shadow:0 6px 20px rgba(0,0,0,.08);display:flex;align-items:center;justify-content:space-around">
    <i style="width:26px;height:26px;border-radius:8px;background:var(--acc)"></i><i style="width:26px;height:26px;border-radius:8px;background:#C9D3DF"></i><i style="width:52px;height:52px;border-radius:50%;background:var(--acc)"></i><i style="width:26px;height:26px;border-radius:8px;background:#C9D3DF"></i><i style="width:26px;height:26px;border-radius:8px;background:#C9D3DF"></i></div>
</div>'''


# ---------- 11. customisation: our example -> your rules -> process -> your app
def build_perso():
    S = 81.35
    L, HD = host('perso', S, 97.35)
    D = HD
    tv = L(W('Votre', 1, 84))
    ta = L(W('Après'))
    trades = [('store', 'Boutique', TEAL, 'Boutique'), ('cart', 'Supermarché', ORANGE, 'supermarché'), ('pill', 'Pharmacie', GREEN, 'pharmacie'),
              ('utensils', 'Restaurant', '#F5C04A', 'restaurant'), ('bag', 'Vente en ligne', PURPLE, 'vente'), ('plus', 'Votre activité', '#FFFFFF', None)]
    tiles = ''
    tjs = ''
    for i, (k, n, c, wd) in enumerate(trades):
        x, y = 80 + (i % 2) * 470, 470 + (i // 2) * 330
        tiles += f'<div class="ps-t" id="ps-t{i}" style="left:{x}px;top:{y}px;--c:{c}"><span>{ic(k, 64, c, 2)}</span><b>{n}</b></div>'
        t = L(W(wd, 1, 86)) - 0.1 if wd else L(W('ligne.')) + 0.35
        tjs += f'\n    tl.fromTo("#ps-t{i}", {{ scale:0.3, opacity:0, rotation:{-10 + i * 4} }}, {{ scale:1, opacity:1, rotation:0, duration:0.5, ease:"back.out(1.8)" }}, {r(t)});'
    steps = [('wa', 'Un message', 'sur WhatsApp', 'Après'), ('clip', 'Audit', 'de votre activité', 'audit'), ('palette', 'Votre marque', 'logo, couleurs, charte', 'marque,'), ('phone', 'Votre application', 'sur mesure', 'image.')]
    st = ''
    sjs = ''
    for i, (k, a, b, wd) in enumerate(steps):
        st += f'<div class="ps-s" id="ps-s{i}" style="top:{460 + i * 250}px"><span>{ic(k, 52, TEAL, 2) if k != "wa" else ic("wa", 60)}</span><div><em>0{i + 1}</em><b>{a}</b><i>{b}</i></div></div>'
        t = L(W(wd, 1, 89.5)) - 0.15 if wd != 'Après' else ta + 0.05
        if wd == 'marque,':
            t = L(W('activité,', 1, 90)) + 0.6
        if wd == 'image.':
            t = L(W('application…', 1, 92)) + 0.1
        sjs += f'\n    tl.fromTo("#ps-s{i}", {{ x:-400, opacity:0 }}, {{ x:0, opacity:1, duration:0.5, ease:"expo.out" }}, {r(t)});'
    chips = [('Vos rôles', 'rôles,'), ('Vos opérations', 'opérations'), ('Votre marque', 'marque,'), ('Vos couleurs', 'couleurs.')]
    ch = ''.join(f'<div class="ps-c" id="ps-c{i}">{n}</div>' for i, (n, w) in enumerate(chips))
    cjs = ''.join(f'\n    tl.fromTo("#ps-c{i}", {{ y:40, opacity:0 }}, {{ y:0, opacity:1, duration:0.35, ease:"back.out(2)" }}, {r(L(W(w, 1, 93)) - 0.1)});' for i, (n, w) in enumerate(chips))
    mock = phone('ps-mk', 0.98, generic_app('gx'), 'left:600px;top:470px;')
    ex = phone('ps-ex', 0.9, dash_phone('pse'), 'left:345px;top:560px;')
    b1, c1, j1 = kin('ps-k1', 'C\'est <span class="o">notre exemple.</span>', 230, 84, L(W("c'est", 1, 82)) - 0.2, tv - 0.05)
    b2, c2, j2 = kin('ps-k2', 'Votre commerce a', 180, 76, tv, ta - 0.05)
    b3, c3, j3 = kin('ps-k3', '<span class="t">ses propres règles.</span>', 275, 76, L(W('ses', 1, 85)), ta - 0.05)
    b4, c4, j4 = kin('ps-k4', 'Une application', 170, 80, ta, D)
    b5, c5, j5 = kin('ps-k5', '<span class="o">à votre image.</span>', 270, 80, L(W('image.')) - 0.4, D)
    body = f'''    <div id="ps-exw" class="clip" data-start="0" data-duration="{r(tv + 0.4)}">{ex}<div id="ps-exl">BG-MARKET-GESTION · notre exemple</div></div>
    <div id="ps-tw" class="clip" data-start="{r(tv - 0.1)}" data-duration="{r(ta - tv + 0.5)}">{tiles}</div>
    <div id="ps-sw" class="clip" data-start="{r(ta - 0.1)}" data-duration="{r(D - ta + 0.1)}">{st}{mock}<div id="ps-mkl">Maquette d'illustration</div><div id="ps-cw">{ch}</div></div>
{b1}{b2}{b3}{b4}{b5}'''
    css = c1 + c2 + c3 + c4 + c5 + '''
    #ps-exw, #ps-tw, #ps-sw { position:absolute; inset:0; }
    #ps-exl { position:absolute; left:0; right:0; top:1420px; margin:auto; width:max-content; font-size:30px; font-weight:800; padding:14px 28px; border-radius:30px; border:2px solid rgba(255,98,8,.6); color:#FF8A3D; background:rgba(255,98,8,.1); }
    .ps-t { position:absolute; width:450px; height:300px; border-radius:36px; background:linear-gradient(180deg,rgba(20,32,48,.92),rgba(9,14,24,.94)); border:2px solid var(--c); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:20px; box-shadow:0 30px 60px rgba(0,0,0,.45), 0 0 50px color-mix(in srgb, var(--c) 18%, transparent) inset; }
    .ps-t span { width:120px; height:120px; border-radius:34px; background:color-mix(in srgb, var(--c) 14%, transparent); display:flex; align-items:center; justify-content:center; }
    .ps-t b { font-size:40px; font-weight:800; }
    #ps-t5 { border-style:dashed; }
    .ps-s { position:absolute; left:50px; width:520px; display:flex; align-items:center; gap:22px; }
    .ps-s > span { width:110px; height:110px; flex:none; border-radius:30px; background:rgba(0,212,200,.10); border:2px solid rgba(0,212,200,.5); display:flex; align-items:center; justify-content:center; }
    .ps-s em { display:block; font-style:normal; font-size:24px; font-weight:800; color:#FF8A3D; letter-spacing:.1em; }
    .ps-s b { display:block; font-size:40px; font-weight:900; line-height:1.05; } .ps-s i { display:block; font-style:normal; font-size:24px; color:#9FB0C2; font-weight:600; }
    #ps-mk { --acc:#00A8E8; }
    #ps-mkl { position:absolute; left:600px; width:424px; top:1380px; text-align:center; font-size:22px; color:#8FA0B3; font-weight:600; letter-spacing:.04em; }
    #ps-cw { position:absolute; left:40px; right:40px; top:1480px; display:flex; flex-wrap:wrap; gap:18px; justify-content:center; }
    .ps-c { padding:18px 30px; border-radius:30px; font-size:34px; font-weight:800; background:rgba(255,255,255,.06); border:2px solid rgba(255,255,255,.18); }'''
    js = j1 + j2 + j3 + j4 + j5 + tjs + sjs + cjs + f'''
    tl.fromTo("#ps-ex", {{ scale:0.7, opacity:0, y:200 }}, {{ scale:1, opacity:1, y:0, duration:0.6, ease:"expo.out" }}, 0.0);
    tl.fromTo("#ps-exl", {{ opacity:0, y:30 }}, {{ opacity:1, y:0, duration:0.4 }}, {r(L(W('exemple.')) - 0.2)});
    tl.to("#ps-ex", {{ scale:0.45, y:-250, opacity:0, duration:0.55, ease:"power3.in" }}, {r(tv - 0.15)});
    tl.to("#ps-exl", {{ opacity:0, duration:0.25 }}, {r(tv - 0.15)});
    tl.to("#ps-tw .ps-t", {{ scale:0.6, opacity:0, duration:0.4, stagger:0.04, ease:"power2.in" }}, {r(ta - 0.15)});
    tl.fromTo("#ps-mk", {{ x:500, opacity:0, rotation:8 }}, {{ x:0, opacity:1, rotation:0, duration:0.7, ease:"expo.out" }}, {r(L(W('conçoit')) - 0.2)});
    tl.fromTo("#ps-mkl", {{ opacity:0 }}, {{ opacity:1, duration:0.4 }}, {r(L(W('conçoit')) + 0.4)});'''
    for i, col in enumerate(['#FF3B6B', '#2DBE60', '#7B5CFF', '#FF6208']):
        js += f'\n    tl.set("#ps-mk", {{ "--acc":"{col}" }}, {r(L(W("couleurs.")) - 0.1 + i * 0.32)});'
    js += f'''
    tl.to(["#ps-sw", "#ps-k4", "#ps-k5"], {{ opacity:0, filter:"blur(10px)", duration:0.35, ease:"power2.in" }}, {D - 0.38});'''
    write('perso', scene('perso', body, css, js))


# ---------- 12. founder
def build_founder():
    S = 97.25
    L, HD = host('founder', S, 103.4)
    D = HD
    tn = L(W('Gnohité'))
    b1, c1, j1 = kin('fd-k1', 'Derrière BG-MARKET…', 190, 78, 0.05, D)
    body = f'''    <div id="fd-halo" class="clip" data-start="0" data-duration="{D}"></div>
    <div id="fd-man" class="clip" data-start="0" data-duration="{D}"><div id="fd-ring"></div><img src="assets/people/founder_round.jpg" alt="Gnohité Djôlo, fondateur de BG-MARKET" /></div>
    <div id="fd-plate" class="clip" data-start="{r(tn - 0.15)}" data-duration="{r(D - tn + 0.15)}"><b>GNOHITÉ DJÔLO</b><span>Fondateur de BG-MARKET</span></div>
{b1}'''
    css = c1 + '''
    #fd-halo { position:absolute; left:140px; top:380px; width:800px; height:800px; border-radius:50%; background:radial-gradient(circle, rgba(0,212,200,.45), rgba(255,98,8,.18) 55%, transparent 72%); filter:blur(30px); }
    #fd-man { position:absolute; left:200px; top:440px; width:680px; height:680px; }
    #fd-ring { position:absolute; inset:-16px; border-radius:50%; background:conic-gradient(from 0deg,#00D4C8,#FF6208,#00D4C8 60%,#FF6208,#00D4C8); box-shadow:0 0 80px rgba(0,212,200,.45); }
    #fd-man img { position:absolute; inset:0; width:680px; height:680px; border-radius:50%; object-fit:cover; border:12px solid #0B0F14; }
    #fd-plate { position:absolute; left:60px; right:60px; top:1260px; padding:34px 40px; border-radius:34px; background:linear-gradient(180deg,rgba(11,15,20,.85),rgba(11,15,20,.95)); border:2px solid rgba(0,212,200,.55); text-align:center; box-shadow:0 30px 60px rgba(0,0,0,.6); }
    #fd-plate b { display:block; font-size:84px; font-weight:900; letter-spacing:.02em; }
    #fd-plate span { display:block; margin-top:8px; font-size:44px; font-weight:800; color:#FF6208; }'''
    js = j1 + f'''
    tl.fromTo("#fd-man", {{ opacity:0, scale:0.6 }}, {{ opacity:1, scale:1, duration:1.0, ease:"expo.out" }}, 0.0);
    tl.fromTo("#fd-ring", {{ rotation:0 }}, {{ rotation:200, duration:{D}, ease:"none" }}, 0.0);
    tl.to("#fd-man img", {{ scale:1.04, duration:{D - 1}, ease:"none" }}, 1.0);
    tl.fromTo("#fd-halo", {{ opacity:0, scale:0.6 }}, {{ opacity:1, scale:1, duration:1.2, ease:"power2.out" }}, 0.0);
    tl.fromTo("#fd-plate", {{ y:200, opacity:0 }}, {{ y:0, opacity:1, duration:0.6, ease:"expo.out" }}, {r(tn - 0.15)});
    tl.from("#fd-plate b", {{ scale:1.25, opacity:0, duration:0.8, ease:"expo.out" }}, {r(tn)});
    tl.to(["#fd-man", "#fd-plate", "#fd-halo", "#fd-k1"], {{ opacity:0, filter:"blur(12px)", duration:0.4, ease:"power2.in" }}, {D - 0.42});'''
    write('founder', scene('founder', body, css, js))


# ---------- 13. end card
def build_end():
    S = 103.3
    L, HD = host('end', S, DUR)
    S = M(S)
    D = HD
    tw = L(W('Écrivez-nous'))
    body = f'''    <video id="en-anim" class="clip" data-start="0" data-duration="6.0" src="assets/brand/logo_anim.webm" muted playsinline></video>
    <img id="en-logo" class="clip" data-start="5.95" data-duration="{r(D - 5.95)}" src="assets/brand/logo_final.png" alt="BG-MARKET, Technologie pour tous" />
    <div id="en-msg" class="clip cap" data-start="0.6" data-duration="{r(D - 0.6)}">Nous concevons des applications de gestion <span class="t">adaptées à votre activité.</span></div>
    <div id="en-cta" class="clip cap" data-start="{r(tw - 0.1)}" data-duration="{r(D - tw + 0.1)}">Écrivez-nous sur WhatsApp</div>
    <div id="en-tel" class="clip cap" data-start="{r(tw + 0.5)}" data-duration="{r(D - tw - 0.5)}">{ic('wa', 92)}<span><span class="t">07</span> 15 78 69 75</span></div>'''
    css = '''
    #en-anim, #en-logo { position:absolute; left:0; top:200px; width:1080px; height:608px; }
    #en-msg { top:880px; width:900px; white-space:normal; font-size:56px; font-weight:800; line-height:1.22; letter-spacing:-.01em; }
    #en-cta { top:1240px; font-size:48px; font-weight:800; color:#C9D6E3; }
    #en-tel { top:1340px; white-space:nowrap; display:flex; align-items:center; gap:24px; font-size:86px; font-weight:900; letter-spacing:.01em; padding:26px 46px; border-radius:40px; background:rgba(37,211,102,.08); border:3px solid rgba(37,211,102,.55); box-shadow:0 0 60px rgba(37,211,102,.18); }'''
    js = f'''
    tl.fromTo("#en-anim", {{ opacity:0 }}, {{ opacity:1, duration:0.3 }}, 0);
    tl.fromTo("#en-msg", {{ opacity:0, y:40, filter:"blur(12px)" }}, {{ opacity:1, y:0, filter:"blur(0px)", duration:0.7, ease:"expo.out" }}, 0.6);
    tl.fromTo("#en-cta", {{ opacity:0, y:30 }}, {{ opacity:1, y:0, duration:0.5, ease:"expo.out" }}, {r(tw - 0.1)});
    tl.fromTo("#en-tel", {{ opacity:0, scale:0.85, filter:"blur(14px)" }}, {{ opacity:1, scale:1, filter:"blur(0px)", duration:0.6, ease:"expo.out" }}, {r(tw + 0.5)});
    tl.to("#en-tel", {{ boxShadow:"0 0 90px rgba(37,211,102,.45)", duration:0.8, yoyo:true, repeat:3, ease:"sine.inOut" }}, {r(tw + 1.2)});'''
    write('end', scene('end', body, css, js))


# ---------- light streak transitions
CUTS = []


def build_fx():
    times = [M(t) for t in [4.75, 11.0, 21.5, 31.45, 53.0, 62.0, 64.65, 70.25, 73.95, 81.4, 97.3, 103.35]]
    CUTS.extend(times)
    streaks = ''.join(f'<div id="fx-s{i}" class="clip fxs" data-start="{r(t - 0.35)}" data-duration="0.95"><i></i></div>' for i, t in enumerate(times))
    js = ''.join(f'''
    tl.fromTo("#fx-s{i} i", {{ y:-2400, skewY:-14, opacity:0 }}, {{ y:2400, skewY:-14, opacity:1, duration:0.7, ease:"power2.inOut" }}, {r(t - 0.35)});
    tl.to("#fx-s{i} i", {{ opacity:0, duration:0.2 }}, {r(t + 0.41)});''' for i, t in enumerate(times))
    write('fx', scene('fx', streaks, '''
    .fxs { position:absolute; inset:0; overflow:hidden; mix-blend-mode:screen; }
    .fxs i { position:absolute; left:-200px; top:50%; width:1480px; height:420px; margin-top:-210px; background:linear-gradient(180deg,rgba(0,212,200,0),rgba(190,255,250,.5) 45%,rgba(255,255,255,.85) 50%,rgba(255,150,80,.45) 56%,rgba(255,98,8,0)); filter:blur(16px); }''', js))
    HOSTS['fx'] = (0, DUR)


# =================================================================== index + audio
SFX = []


def sfx(name, t, vol):
    SFX.append((name, r(t), vol))


def build_index():
    order = ['bg', 'intro', 'hook', 'besoin', 'reveal', 'phone', 'suivi', 'roles', 'employe', 'admin', 'patron', 'perso', 'founder', 'end', 'fx']
    hosts = ''
    for z, n in enumerate(order):
        s, e = HOSTS[n]
        hosts += (f'    <div id="h-{n}" class="clip" data-composition-id="{n}" data-composition-src="compositions/{n}.html" data-start="{s}" data-duration="{r(e - s)}" '
                  f'data-track-index="{z}" data-track-kind="graphics" data-width="1080" data-height="1920" style="z-index:{z}"></div>\n')
    aud = (f'    <audio id="a-music" class="clip" data-start="0" data-duration="{DUR}" src="assets/audio/music_bed.mp3" data-volume="1"></audio>\n'
           f'    <audio id="a-voice" class="clip" data-start="{V0}" data-duration="{r(VO_END - V0 + 0.3)}" src="assets/audio/voice.mp3" data-volume="1"></audio>\n'
           f'    <audio id="a-logo1" class="clip" data-start="0" data-duration="6" src="assets/brand/logo_anim_audio.mp3" data-volume="0.9"></audio>\n'
           f'    <audio id="a-logo2" class="clip" data-start="{M(103.3)}" data-duration="6" src="assets/brand/logo_anim_audio.mp3" data-volume="0.4"></audio>\n')
    for i, (n, t, v) in enumerate(SFX):
        aud += f'    <audio id="a-sfx{i}" class="clip" data-start="{t}" data-duration="2" src="assets/audio/sfx/{n}.mp3" data-volume="{v}"></audio>\n'
    html = f'''<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=1080, height=1920" />
  <title>BG-MARKET-GESTION — Présentation</title>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
  <style>
    html, body {{ margin:0; padding:0; width:1080px; height:1920px; overflow:hidden; background:#0B0F14; }}
    #root {{ position:relative; width:1080px; height:1920px; overflow:hidden; background:#0B0F14; }}
  </style>
</head>
<body>
  <div id="root" data-composition-id="root" data-width="1080" data-height="1920" data-start="0" data-duration="{DUR}">
{hosts}{aud}  </div>
  <script>
    window.__timelines = window.__timelines || {{}};
    window.__timelines["root"] = gsap.timeline({{ paused: true }});
  </script>
</body>
</html>
'''
    open(os.path.join(ROOT, 'index.html'), 'w').write(html)


def plan_sfx():
    for t in [M(x) for x in [4.75, 21.5, 31.45, 62.0, 81.4, 97.3]]:
        sfx('soft_whoosh', t - 0.3, 0.55)
    for t in [M(x) for x in [11.0, 53.0, 64.65, 70.25, 73.95]]:
        sfx('whoosh_a', t - 0.35, 0.3)
    sfx('paper', W('Des') - 0.1, 0.6)
    sfx('notif', W('des', 1, 12.5) + 0.4, 0.45)
    sfx('notif', W('stock') + 0.2, 0.3)
    sfx('riser_impact', W('Voici') + 0.2, 0.35)
    for t in [W('plus'), W('commence.') - 0.1, W('prix.') + 0.5, W('WhatsApp.', 1, 48) - 0.35, W('Et', 1, 49.4) + 0.05, W('valide…') - 0.05]:
        sfx('tap', t, 0.6)
    sfx('typing', W('client,'), 0.45)
    sfx('typing', W('téléphone,', 1, 40), 0.4)
    sfx('success', W('prix.') + 0.65, 0.5)
    sfx('success', W('solde.') + 0.35, 0.5)
    sfx('success', W('valide…'), 0.5)
    sfx('notif', W('prévient'), 0.5)
    sfx('success', W('meilleur.', 1, 61), 0.4)
    sfx('tap', W('droits') + 0.25, 0.5)
    sfx('success', W('Écrivez-nous') + 0.5, 0.45)


if __name__ == '__main__':
    build_bg(); build_intro(); build_hook(); build_besoin(); build_reveal(); build_phone(); build_suivi(); build_roles()
    build_employe(); build_admin(); build_patron(); build_perso(); build_founder(); build_end(); build_fx()
    plan_sfx(); build_index()
    for f in os.listdir(OUT):
        bad = re.findall(r'\}, (-[0-9.]+)\);', open(os.path.join(OUT, f)).read())
        if bad:
            print('NEGATIVE POSITIONS', f, bad[:5])
    print('DUR', DUR, 'VO_END', VO_END)
