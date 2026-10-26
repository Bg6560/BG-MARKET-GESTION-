# BG-MARKET-GESTION — storytelling cut (1080x1920). Light white/turquoise stage, Serge's evening as the bookend.
# Voice: assets/audio/voice.mp3 starts at film 0; words.json carries word times and the speaker ('n' narrator, 's' Serge).
import json, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
import build as B
from build import r, phone, laptop, dash_phone, dash_employe, sheet_create, form_commande, invoice_paper, precommande_screen, dk_factures, dk_dashboard, kpi, words_html, CURSOR
from illus import a16_svg, TRADES
from ui import ic, APP_CSS, DK_CSS, TEAL, ORANGE, GREEN

ROOT = B.ROOT
OUT = B.OUT
B.V0 = 0.0
DATA = json.load(open(os.path.join(ROOT, 'assets/audio/words.json')))
WORDS = [w for w in DATA['words'] if w['text'] not in ('direct,',)]
VO_END = WORDS[-1]['end']
DUR = 108.0
INK, TEAL_D, NAVY = '#0B1F33', '#00A99F', '#0B1F33'


def norm(x):
    return x.lower().strip('…,.?!:;«» ')


def W(word, n=1, after=0.0, spk=None):
    k = 0
    for w in WORDS:
        if w['start'] < after or (spk and w['spk'] != spk):
            continue
        a, q = norm(w['text']), norm(word)
        if a == q or (len(q) >= 4 and a.startswith(q) and word[-1] not in '…,.?!:;'):
            k += 1
            if k == n:
                return round(w['start'], 2)
    raise KeyError(word)


BASE = '''* { margin:0; padding:0; box-sizing:border-box; }
    #root { position:absolute; inset:0; overflow:hidden; font-family:"Montserrat",sans-serif; color:#0B1F33; }
    .t { color:#00A99F; } .o { color:#FF6208; } .wt { color:#fff; }
    .w { display:inline-block; white-space:pre; }
    .cap { position:absolute; left:0; right:0; margin:auto; width:max-content; max-width:980px; text-align:center; }
    .big { font-weight:900; letter-spacing:-.03em; line-height:1.02; }
    .card { position:absolute; background:#fff; border-radius:32px; box-shadow:0 30px 80px rgba(11,31,51,.16), 0 2px 0 rgba(255,255,255,.9) inset; border:1px solid rgba(11,31,51,.06); }
    .bub { position:absolute; background:#fff; color:#0B1F33; border-radius:34px; padding:26px 34px; font-size:40px; font-weight:800; line-height:1.2; box-shadow:0 24px 60px rgba(11,31,51,.22); }
    .bub::after { content:""; position:absolute; bottom:-22px; width:44px; height:44px; background:#fff; transform:rotate(45deg); border-radius:6px; }
    .bub.l::after { left:70px; } .bub.r::after { right:70px; }
    .bub em { display:block; font-style:normal; font-size:24px; font-weight:800; letter-spacing:.14em; color:#FF6208; margin-bottom:6px; }
    .cut { position:absolute; filter:drop-shadow(0 30px 50px rgba(11,31,51,.28)); }
    .phn { position:absolute; background:linear-gradient(145deg,#2c3546,#0b0f16 38%,#151b26 70%,#2a3343); box-shadow:0 50px 90px rgba(11,31,51,.35), 0 0 0 2px rgba(255,255,255,.07) inset; }
    .phn .scr { position:relative; overflow:hidden; background:#060A12; }
    .phn .appw { position:absolute; left:0; top:0; transform-origin:0 0; }
    .phn .cam { position:absolute; left:50%; border-radius:50%; background:#000; box-shadow:0 0 0 2px #121822; z-index:60; }
    .lap { position:absolute; }
    .lap .lid { position:relative; background:linear-gradient(180deg,#1d2533,#0b0f16); border-radius:22px; padding:14px; box-shadow:0 40px 80px rgba(11,31,51,.3), 0 0 0 2px rgba(255,255,255,.06) inset; }
    .lap .scr { position:relative; overflow:hidden; border-radius:8px; background:#050D1C; }
    .lap .appw { position:absolute; left:0; top:0; transform-origin:0 0; }
    .lap .base { margin:0 auto; height:22px; border-radius:0 0 26px 26px; background:linear-gradient(180deg,#c9d3df,#8e9aab); box-shadow:0 20px 40px rgba(11,31,51,.25); }
    .tap { position:absolute; width:64px; height:64px; margin:-32px 0 0 -32px; border-radius:50%; border:3px solid rgba(255,255,255,.95); background:rgba(255,255,255,.22); opacity:0; z-index:90; }
    .cur { position:absolute; width:34px; height:34px; z-index:95; filter:drop-shadow(0 4px 8px rgba(0,0,0,.4)); }
    .chip { position:absolute; display:flex; align-items:center; gap:16px; padding:20px 30px; border-radius:26px; background:#fff; font-size:32px; font-weight:800; box-shadow:0 24px 60px rgba(11,31,51,.16); white-space:nowrap; }''' + APP_CSS + DK_CSS

HOSTS = {}


def host(name, s, e):
    HOSTS[name] = (r(s), r(e))
    return (lambda t: r(t - s)), r(e - s)


def scene(id, body, css, js):
    return B.scene(id, body, css, js).replace(B.BASE, BASE)


def write(name, s):
    open(os.path.join(OUT, name + '.html'), 'w').write(s)


def kin(id, text, top, size, t_in, t_out, color=INK, weight=900, stagger=0.06, extra=''):
    return B.kin(id, text, top, size, t_in, t_out, color=color, weight=weight, stagger=stagger, extra=extra)


def bubble(id, who, text, x, y, w, t_in, t_out, side='l'):
    body = f'    <div id="{id}" class="clip bub {side}" data-start="{r(t_in)}" data-duration="{r(t_out - t_in)}" style="left:{x}px;top:{y}px;width:{w}px"><em>{who}</em>{text}</div>\n'
    js = (f'    tl.fromTo("#{id}", {{ opacity:0, scale:0.6, y:40, transformOrigin:"{"20% 100%" if side == "l" else "80% 100%"}" }}, {{ opacity:1, scale:1, y:0, duration:0.45, ease:"back.out(1.6)" }}, {r(t_in)});\n'
          f'    tl.to("#{id}", {{ opacity:0, scale:0.9, duration:0.25, ease:"power2.in" }}, {r(t_out - 0.27)});\n')
    return body, js


SERGE = 'assets/people/admin.png'          # navy polo: Serge, the shop owner (illustration)
YANNICK = 'assets/people/employe.png'      # turquoise polo: Yannick, salesman
ARNAUD = 'assets/people/vendeur2.png'      # orange tee: Arnaud, administrator


# ------------------------------------------------------------------ stage: light gradient + night tint
def build_bg():
    nights = [(4.4, W('Chez') - 0.3), (W('Vingt-et-une', 2) - 0.5, W("Oui") + 1.6)]
    body = f'''    <div id="bg-base" class="clip" data-start="0" data-duration="{DUR}"></div>
    <div id="bg-b1" class="clip blob" data-start="0" data-duration="{DUR}"></div>
    <div id="bg-b2" class="clip blob" data-start="0" data-duration="{DUR}"></div>
    <div id="bg-b3" class="clip blob" data-start="0" data-duration="{DUR}"></div>
    <div id="bg-grid" class="clip" data-start="0" data-duration="{DUR}"></div>
    <div id="bg-night" class="clip" data-start="0" data-duration="{DUR}"></div>'''
    css = '''
    #bg-base { position:absolute; inset:0; background:linear-gradient(170deg,#FFFFFF 0%,#F2FBFB 30%,#DDF4F3 62%,#CFE7F8 100%); }
    .blob { position:absolute; border-radius:50%; filter:blur(110px); }
    #bg-b1 { width:820px; height:820px; left:460px; top:-220px; background:rgba(0,212,200,.30); }
    #bg-b2 { width:760px; height:760px; left:-320px; top:1100px; background:rgba(60,140,255,.22); }
    #bg-b3 { width:420px; height:420px; left:620px; top:1380px; background:rgba(255,98,8,.10); }
    #bg-grid { position:absolute; inset:-200px; background-image:linear-gradient(rgba(11,31,51,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(11,31,51,.035) 1px, transparent 1px); background-size:90px 90px; }
    #bg-night { position:absolute; inset:0; background:radial-gradient(120% 80% at 50% 25%, #16324F 0%, #0B1F33 60%, #071524 100%); opacity:0; }'''
    js = f'''
    tl.to("#bg-b1", {{ x:-380, y:480, duration:{DUR / 2}, ease:"sine.inOut", yoyo:true, repeat:1 }}, 0);
    tl.to("#bg-b2", {{ x:520, y:-560, duration:{DUR / 2}, ease:"sine.inOut", yoyo:true, repeat:1 }}, 0);
    tl.to("#bg-b3", {{ x:-420, y:-300, scale:1.5, duration:{DUR / 3}, ease:"sine.inOut", yoyo:true, repeat:2 }}, 0);
    tl.fromTo("#bg-grid", {{ y:0 }}, {{ y:180, duration:{DUR}, ease:"none" }}, 0);'''
    for a, b in nights:
        js += f'''
    tl.to("#bg-night", {{ opacity:0.94, duration:1.2, ease:"power2.inOut" }}, {r(a)});
    tl.to("#bg-night", {{ opacity:0, duration:1.4, ease:"power2.inOut" }}, {r(b)});'''
    write('bg', scene('bg', body, css, js))
    HOSTS['bg'] = (0, DUR)
    return nights


# ------------------------------------------------------------------ subtitles (narrator only; Serge speaks in bubbles)
def build_subs():
    phrases, cur = [], []
    for w in WORDS:
        if w['spk'] != 'n':
            if cur:
                phrases.append(cur); cur = []
            continue
        if w['text'] in ('?', '»…', '«', ':') and cur:
            cur.append(w); continue
        cur.append(w)
        if re.search(r'[.?!…,]$', w['text']) and (len(cur) >= 3 or w['text'].endswith(('.', '?', '!', '…'))):
            phrases.append(cur); cur = []
        elif len(cur) >= 7:
            phrases.append(cur); cur = []
    if cur:
        phrases.append(cur)
    body = css = js = ''
    for i, ph in enumerate(phrases):
        a = ph[0]['start'] - 0.05
        b = (phrases[i + 1][0]['start'] - 0.05) if i + 1 < len(phrases) and phrases[i + 1][0]['start'] - ph[-1]['end'] < 0.8 else ph[-1]['end'] + 0.45
        b = max(b, a + 0.8)
        spans = ''
        for k, w in enumerate(ph):
            spans += f'<span id="sb{i}_{k}">{w["text"]}</span> '
            js += f'    tl.set("#sb{i}_{k}", {{ color:"#3DF2E6" }}, {r(w["start"] - a)});\n'
        body += f'    <div id="sb{i}" class="clip sb" data-start="{r(a)}" data-duration="{r(b - a)}"><div>{spans.strip()}</div></div>\n'
    css = '''
    .sb { position:absolute; left:0; right:0; top:1640px; display:flex; justify-content:center; }
    .sb div { max-width:940px; text-align:center; padding:16px 30px; border-radius:20px; background:rgba(11,31,51,.86); color:#fff; font-size:38px; font-weight:700; line-height:1.3; }'''
    # subtitles use one composition-wide timeline: every phrase's sets are absolute
    js2 = ''
    for i, ph in enumerate(phrases):
        a = ph[0]['start'] - 0.05
        for k, w in enumerate(ph):
            js2 += f'    tl.set("#sb{i}_{k}", {{ color:"#3DF2E6" }}, {r(w["start"])});\n'
    write('subs', scene('subs', body, css, js2))
    HOSTS['subs'] = (0, DUR)


# ------------------------------------------------------------------ A. Serge, 21:00, the question
def build_intro():
    S, E = 0.0, W('Le', 1, 12.8) - 0.1
    L, D = host('intro', S, E)
    t21 = W('vingt-et-une')
    tq = W('Bon', 1, 9, 's')
    q_end = W('?', 1, tq) + 0.5
    b1, j1 = bubble('in-q', 'SERGE', 'Bon… combien on a vendu aujourd\'hui ?', 70, 330, 640, L(tq) - 0.1, L(q_end) + 0.1)
    body = f'''    <img id="in-serge" class="clip cut" data-start="0" data-duration="{D}" src="{SERGE}" alt="Serge (illustration)" />
    <div id="in-tag" class="clip card" data-start="{L(W('Serge')) - 0.1}" data-duration="{r(L(t21) - L(W('Serge')) + 0.2)}"><b>Serge</b><span>Boutique de téléphones</span><i id="in-yop">{ic('store', 30, ORANGE)} Yopougon</i></div>
    <div id="in-clock" class="clip" data-start="{L(t21) - 0.1}" data-duration="{r(D - L(t21) + 0.1)}"><span>21</span><i id="in-col">:</i><span>00</span></div>
    <div id="in-sign" class="clip" data-start="{L(W('fermée')) - 0.2}" data-duration="{r(D - L(W('fermée')) + 0.2)}"><div id="in-signb">FERMÉ</div></div>
{b1}'''
    css = '''
    #in-serge { left:470px; top:520px; height:1080px; width:auto; }
    #in-tag { left:70px; top:620px; width:480px; padding:34px 38px; }
    #in-tag b { display:block; font-size:76px; font-weight:900; letter-spacing:-.03em; }
    #in-tag span { display:block; font-size:30px; font-weight:700; color:#4A5D72; margin-top:4px; }
    #in-tag i { display:flex; align-items:center; gap:10px; font-style:normal; font-size:30px; font-weight:800; color:#FF6208; margin-top:14px; }
    #in-clock { position:absolute; left:0; right:0; top:120px; text-align:center; font-size:230px; font-weight:900; letter-spacing:-.02em; color:#fff; font-variant-numeric:tabular-nums; }
    #in-clock i { font-style:normal; display:inline-block; color:#3DF2E6; margin:0 8px; }
    #in-sign { position:absolute; left:90px; top:1000px; width:300px; height:260px; }
    #in-signb { position:absolute; left:0; top:60px; width:300px; padding:26px 0; text-align:center; border-radius:20px; background:#fff; color:#FF6208; font-size:58px; font-weight:900; letter-spacing:.12em; border:6px solid #FF6208; transform-origin:50% -60px; }
    #in-sign::before { content:""; position:absolute; left:148px; top:0; width:4px; height:60px; background:#c9d3df; }'''
    js = j1 + f'''
    tl.fromTo("#in-serge", {{ x:420, opacity:0 }}, {{ x:0, opacity:1, duration:0.9, ease:"expo.out" }}, 0.0);
    tl.fromTo("#in-tag", {{ x:-300, opacity:0 }}, {{ x:0, opacity:1, duration:0.6, ease:"expo.out" }}, {r(L(W('Serge')) - 0.1)});
    tl.from("#in-yop", {{ opacity:0, y:16, duration:0.3 }}, {r(L(W('Yopougon')))});
    tl.to("#in-tag", {{ opacity:0, x:-200, duration:0.3, ease:"power2.in" }}, {r(L(t21) - 0.1)});
    tl.fromTo("#in-clock span", {{ opacity:0, y:-80, filter:"blur(10px)" }}, {{ opacity:1, y:0, filter:"blur(0px)", duration:0.6, ease:"expo.out", stagger:0.12 }}, {r(L(t21))});
    tl.fromTo("#in-col", {{ opacity:1 }}, {{ opacity:0.15, duration:0.5, yoyo:true, repeat:{int((D - L(t21)) / 0.5) - 1}, ease:"steps(1)" }}, {r(L(t21) + 0.6)});
    tl.fromTo("#in-signb", {{ rotation:-28, opacity:0 }}, {{ rotation:0, opacity:1, duration:1.2, ease:"elastic.out(1,0.45)" }}, {r(L(W('fermée')) - 0.2)});
    tl.to("#in-serge", {{ scale:1.04, transformOrigin:"50% 100%", duration:{r(D - 1)}, ease:"none" }}, 1.0);
    tl.to(["#in-serge", "#in-sign", "#in-clock"], {{ opacity:0, y:-60, duration:0.35, ease:"power2.in" }}, {r(D - 0.4)});'''
    write('intro', scene('intro', body, css, js))


# ------------------------------------------------------------------ B. three totals, a stock nobody knows, the lost invoice
def build_chaos():
    S, E = W('Le', 1, 12.8) - 0.2, W('Ça') - 0.1
    L, D = host('chaos', S, E)
    tc, tw, tk = L(W('cahier')), L(W('WhatsApp')), L(W('caisse'))
    tg, tq2 = L(W('Galaxy')), L(W('Yannick', 1, 22, 's'))
    cards = f'''    <div id="ch-nb" class="clip card chc" data-start="{r(tc - 0.15)}" data-duration="{r(tg - tc + 0.6)}"><em>{ic('doc', 30, '#4A5D72')} Le cahier</em><b>Total : <span class="o">478 000 F</span></b></div>
    <div id="ch-wa" class="clip card chc" data-start="{r(tw - 0.15)}" data-duration="{r(tg - tw + 0.6)}"><em>{ic('wa', 32)} WhatsApp</em><b>« 490 000 je crois »</b></div>
    <div id="ch-ca" class="clip card chc" data-start="{r(tk - 0.15)}" data-duration="{r(tg - tk + 0.6)}"><em>{ic('card', 30, '#4A5D72')} La caisse</em><b>Total : <span class="o">512 000 F</span></b></div>
    <div id="ch-ne" class="clip" data-start="{r(L(W('encore', 1, 16.5)) - 0.1)}" data-duration="{r(tg - L(W('encore', 1, 16.5)) + 0.5)}">≠</div>
    <div id="ch-st" class="clip card" data-start="{r(tg - 0.2)}" data-duration="{r(tq2 - tg + 0.3)}"><div id="ch-ph">{a16_svg(300, 420)}</div><div id="ch-tx"><b>Galaxy A16</b><i>Reste en stock</i><strong id="ch-n">1</strong></div><div id="ch-sh"></div></div>
'''
    b2, j2 = bubble('ch-q', 'SERGE → YANNICK', 'Yannick ! La facture de Koffi… tu l\'as envoyée ?', 80, 560, 760, tq2 - 0.1, D)
    cards += b2 + f'''    <div id="ch-typ" class="clip" data-start="{r(tq2 + 1.6)}" data-duration="{r(D - tq2 - 1.6)}"><img src="assets/people/employe_face.png" alt="" /><span><i></i><i></i><i></i></span></div>
'''
    caps = [kin('ch-k1', 'Personne ne sait <span class="t">vraiment.</span>', 260, 64, L(W('Personne')), tq2 - 0.1, color='#fff')]
    body = cards + ''.join(b for b, c, j in caps)
    css = ''.join(c for b, c, j in caps) + '''
    .chc { width:620px; padding:30px 36px; }
    .chc em { display:flex; align-items:center; gap:12px; font-style:normal; font-size:28px; font-weight:800; color:#4A5D72; }
    .chc b { display:block; margin-top:10px; font-size:52px; font-weight:900; letter-spacing:-.02em; }
    #ch-nb { left:60px; top:300px; } #ch-wa { left:400px; top:640px; } #ch-ca { left:90px; top:980px; }
    #ch-ne { position:absolute; left:760px; top:1000px; font-size:200px; font-weight:900; color:#FF6208; }
    #ch-st { left:70px; top:560px; width:940px; height:620px; display:flex; align-items:center; gap:10px; padding:0 40px 0 20px; overflow:hidden; }
    #ch-ph { width:400px; height:560px; display:flex; align-items:center; justify-content:center; background:radial-gradient(circle at 50% 55%, #E3F3F6 0, #F7FAFC 60%); border-radius:28px; }
    #ch-tx { flex:1; display:flex; flex-direction:column; align-items:center; }
    #ch-st b { font-size:62px; font-weight:900; } #ch-st i { font-style:normal; font-size:32px; color:#4A5D72; font-weight:700; }
    #ch-st strong { margin-top:16px; font-size:220px; font-weight:900; line-height:1; color:#FF6208; font-variant-numeric:tabular-nums; }
    #ch-sh { position:absolute; top:-100px; left:0; width:160px; height:900px; background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.75),rgba(255,255,255,0)); transform:translateX(-300px) rotate(18deg); }
    #ch-typ { position:absolute; left:500px; top:900px; display:flex; align-items:center; gap:18px; }
    #ch-typ img { width:110px; height:110px; border-radius:50%; border:5px solid #00D4C8; object-fit:cover; background:#0E2235; }
    #ch-typ span { display:flex; gap:10px; padding:26px 30px; border-radius:30px; background:#fff; }
    #ch-typ span i { width:18px; height:18px; border-radius:50%; background:#9AA8B8; }'''
    js = ''.join(j for b, c, j in caps) + j2
    for sel, t, rot, dx in [('#ch-nb', tc, -5, -600), ('#ch-wa', tw, 4, 600), ('#ch-ca', tk, -3, -600)]:
        js += f'''
    tl.fromTo("{sel}", {{ x:{dx}, rotation:{rot * 3}, opacity:0 }}, {{ x:0, rotation:{rot}, opacity:1, duration:0.6, ease:"expo.out" }}, {r(t - 0.15)});
    tl.to("{sel}", {{ y:-260, scale:0.7, opacity:0, duration:0.45, ease:"power2.in" }}, {r(tg - 0.15)});'''
    js += f'''
    tl.fromTo("#ch-ne", {{ scale:0, rotation:-30 }}, {{ scale:1, rotation:0, duration:0.45, ease:"back.out(2)" }}, {r(L(W('encore', 1, 16.5)) - 0.1)});
    tl.to("#ch-ne", {{ opacity:0, duration:0.3 }}, {r(tg - 0.2)});
    tl.fromTo("#ch-st", {{ scale:0.6, opacity:0 }}, {{ scale:1, opacity:1, duration:0.6, ease:"expo.out" }}, {r(tg - 0.2)});
    tl.fromTo("#ch-ph svg", {{ x:-260, rotation:-14, scale:0.8 }}, {{ x:0, rotation:0, scale:1, duration:0.9, ease:"expo.out" }}, {r(tg - 0.1)});
    tl.fromTo("#ch-ph svg", {{ y:0 }}, {{ y:-14, duration:1.1, yoyo:true, repeat:2, ease:"sine.inOut" }}, {r(tg + 0.8)});
    tl.fromTo("#ch-sh", {{ x:-300 }}, {{ x:1200, duration:0.9, ease:"power2.inOut" }}, {r(tg + 0.5)});'''
    seq = ['1', '0', '?', '1', '0', '?']
    for i, v in enumerate(seq):
        js += f'\n    tl.set("#ch-n", {{ textContent:"{v}" }}, {r(L(W("un…", 1, 19)) + i * 0.32)});'
    js += f'''
    tl.to("#ch-st", {{ scale:0.85, opacity:0, duration:0.35, ease:"power2.in" }}, {r(tq2 - 0.15)});
    tl.fromTo("#ch-typ", {{ opacity:0, y:30 }}, {{ opacity:1, y:0, duration:0.4 }}, {r(tq2 + 1.6)});
    tl.fromTo("#ch-typ span i", {{ y:0 }}, {{ y:-12, duration:0.25, yoyo:true, repeat:5, ease:"sine.inOut", stagger:0.12 }}, {r(tq2 + 1.7)});'''
    write('chaos', scene('chaos', body, css, js))


# ------------------------------------------------------------------ C. three months of "demain"
def build_months():
    S, E = W('Ça') - 0.15, W('Chez') - 0.1
    L, D = host('months', S, E)
    tm, tdm, tsq, tcl, tcah = L(W('trois')), L(W('demain,')), L(W('Sauf')), L(W('clients.')), L(W('cahiers.'))
    pages = ''.join(f'<div class="mo-p" id="mo-p{i}"><em>{m}</em><b>{d}</b></div>' for i, (m, d) in enumerate([('AOÛT', '26'), ('SEPT', '26'), ('OCT', '26')]))
    stack = ''.join(f'<div class="mo-c" id="mo-c{i}" style="top:{1180 - i * 46}px;left:{300 + (i % 2) * 30}px;transform:rotate({(-1) ** i * 3}deg)"><b>CAHIER {i + 1}</b></div>' for i in range(6))
    body = f'''    <div id="mo-cal" class="clip" data-start="0" data-duration="{r(tdm - 0.05)}">{pages}</div>
    <div id="mo-q" class="clip cap big" data-start="{r(tdm - 0.2)}" data-duration="{r(tsq - tdm + 0.1)}">« Demain,<br><span class="t">je m'organise.</span> »</div>
    <div id="mo-st" class="clip" data-start="{r(tsq + 0.6)}" data-duration="{r(D - tsq - 0.6)}">{stack}</div>
    <div id="mo-cl" class="clip" data-start="{r(tcl - 0.4)}" data-duration="{r(D - tcl + 0.4)}"><div class="bub l" style="left:60px;top:560px;width:520px;font-size:34px"><em>CLIENT</em>Vous avez l'iPhone 13 ?</div><div class="bub r" style="left:480px;top:800px;width:540px;font-size:34px"><em>CLIENT</em>C'est combien, le A56 ?</div></div>
'''
    caps = [kin('mo-k1', '3 mois.', 260, 240, tm - 0.1, tdm - 0.1, color='#fff'),
            kin('mo-k2', 'Sauf que <span class="o">demain…</span>', 240, 96, tsq, D, color='#fff')]
    body += ''.join(b for b, c, j in caps)
    css = ''.join(c for b, c, j in caps) + '''
    #mo-cal { position:absolute; left:340px; top:700px; width:400px; height:440px; }
    .mo-p { position:absolute; inset:0; border-radius:34px; background:#fff; box-shadow:0 30px 70px rgba(0,0,0,.35); text-align:center; overflow:hidden; transform-origin:50% 0; }
    .mo-p em { display:block; font-style:normal; background:#FF6208; color:#fff; font-size:44px; font-weight:900; padding:22px 0; letter-spacing:.1em; }
    .mo-p b { display:block; font-size:200px; font-weight:900; color:#0B1F33; line-height:1.4; }
    #mo-q { top:820px; font-size:96px; color:#fff; }
    #mo-st { position:absolute; inset:0; }
    .mo-c { position:absolute; width:480px; height:120px; border-radius:18px; background:#F4EEDC; border:3px solid #d8cdb0; box-shadow:0 14px 30px rgba(0,0,0,.35); display:flex; align-items:center; justify-content:center; }
    .mo-c b { font-size:34px; font-weight:900; letter-spacing:.2em; color:#7a6a45; }
    #mo-cl { position:absolute; inset:0; }'''
    js = ''.join(j for b, c, j in caps)
    js += f'''
    tl.fromTo("#mo-cal", {{ y:200, opacity:0 }}, {{ y:0, opacity:1, duration:0.6, ease:"expo.out" }}, {r(tm)});'''
    for i in range(3):
        js += f'''
    tl.set("#mo-p{i}", {{ zIndex:{3 - i} }}, 0);'''
        if i < 2:
            js += f'''
    tl.to("#mo-p{i}", {{ rotationX:-100, y:-120, opacity:0, duration:0.45, ease:"power2.in" }}, {r(tm + 0.7 + i * 0.6)});'''
    js += f'''
    tl.fromTo("#mo-q", {{ opacity:0, scale:0.9 }}, {{ opacity:1, scale:1, duration:0.5, ease:"expo.out" }}, {r(tdm - 0.2)});
    tl.to("#mo-q", {{ opacity:0, y:-60, duration:0.3, ease:"power2.in" }}, {r(tsq - 0.15)});
    tl.fromTo(".mo-c", {{ y:-900, opacity:0 }}, {{ y:0, opacity:1, duration:0.45, ease:"power3.in", stagger:{r((tcah - tsq - 0.8) / 6)} }}, {r(tsq + 0.6)});
    tl.from("#mo-cl .bub", {{ opacity:0, scale:0.6, duration:0.4, stagger:0.5, ease:"back.out(1.6)" }}, {r(tcl - 0.4)});
    tl.to(["#mo-st", "#mo-cl"], {{ opacity:0, y:80, duration:0.35, ease:"power2.in" }}, {r(D - 0.38)});'''
    write('months', scene('months', body, css, js))


# ------------------------------------------------------------------ D. the turn: we built ours
def build_turn():
    S, E = W('Chez') - 0.15, W('Le', 1, 41) - 0.15
    L, D = host('turn', S, E)
    tv, tg = L(W('Voici')), L(W('BG-MARKET-GESTION.'))
    ph = phone('tu-ph', 1.0, dash_phone('tup'), 'left:327px;top:900px;')
    body = f'''    <img id="tu-logo" class="clip" data-start="0" data-duration="{D}" src="assets/brand/logo_light.png" alt="BG MARKET" />
    <div id="tu-g" class="clip cap big" data-start="{r(tg - 0.1)}" data-duration="{r(D - tg + 0.1)}">BG-MARKET-<span class="o">GESTION</span></div>
    <div id="tu-phw" class="clip" data-start="{r(tv)}" data-duration="{r(D - tv)}">{ph}</div>
'''
    caps = [kin('tu-k1', 'On a connu <span class="t">exactement ça.</span>', 760, 64, L(W('on', 1, 35)), L(W('Alors')) - 0.05, weight=800),
            kin('tu-k2', 'Alors on a construit', 740, 64, L(W('Alors')), tv - 0.05, weight=800),
            kin('tu-k3', '<span class="o">notre propre application.</span>', 830, 64, L(W('notre')), tv - 0.05, weight=800)]
    body += ''.join(b for b, c, j in caps)
    css = ''.join(c for b, c, j in caps) + '''
    #tu-logo { position:absolute; left:160px; top:420px; width:760px; height:auto; }
    #tu-g { top:560px; font-size:96px; }
    #tu-phw { position:absolute; inset:0; }'''
    js = ''.join(j for b, c, j in caps) + f'''
    tl.fromTo("#tu-logo", {{ opacity:0, scale:0.85, filter:"blur(14px)" }}, {{ opacity:1, scale:1, filter:"blur(0px)", duration:0.8, ease:"expo.out" }}, 0.05);
    tl.to("#tu-logo", {{ y:-260, scale:0.62, duration:0.8, ease:"expo.inOut" }}, {r(tv - 0.3)});
    tl.fromTo("#tu-g", {{ opacity:0, y:40, filter:"blur(12px)" }}, {{ opacity:1, y:0, filter:"blur(0px)", duration:0.6, ease:"expo.out" }}, {r(tg - 0.1)});
    tl.fromTo("#tu-ph", {{ y:1100, rotation:6 }}, {{ y:0, rotation:0, duration:1.1, ease:"expo.out" }}, {r(tv)});
    tl.to(["#tu-logo", "#tu-g"], {{ opacity:0, y:-80, duration:0.35, ease:"power2.in" }}, {r(D - 0.4)});
    tl.to("#tu-ph", {{ scale:1.42, y:-290, duration:0.6, ease:"power3.inOut" }}, {r(D - 0.6)});'''
    write('turn', scene('turn', body, css, js))


# ------------------------------------------------------------------ E. a day with the app (phone)
def build_phone():
    S, E = W('Le', 1, 41) - 0.2, W('Yannick,', 1, 60, 'n') - 0.1
    L, D = host('phone', S, E)
    s, p = 1.42, 'pd'
    taps = ''.join(f'<div class="tap" id="{p}tap{i}" style="left:{x}px;top:{y}px"></div>' for i, (x, y) in enumerate([(195, 792), (100, 545), (195, 712)]))
    toast = f'<div class="toast" id="{p}toast"><i>{ic("check", 16, "#06301E", 3)}</i>Commande CMD-212 enregistrée</div>'
    ov = '<div class="app" style="background:transparent;z-index:%d">%s</div>'
    inner = dash_phone(p) + ov % (20, sheet_create(p)) + form_commande(p) + ov % (70, toast) + precommande_screen(p) + taps
    ph = phone('pd-phone', s, inner, 'left:250px;top:610px;')
    tm, tv, tb, to = L(W('matin')), L(W('ventes,')), L(W('bénéfice')), L(W("l'objectif"))
    tcl, tpl, tcli, ttel, tpx = L(W('client', 1, 47)), L(W('plus')), L(W('client,')), L(W('téléphone,')), L(W('prix.'))
    tinv, twa, tpre, tac, tsol = L(W('facture', 1, 51)), L(W("l'envoie")), L(W('précommande')), L(W("L'acompte")), L(W('solde.'))
    tsav, tst = L(W('réparation')), L(W('stock…'))
    inv = invoice_paper(p).replace('__S__', str(r(tinv - 0.1))).replace('__D__', str(r(tpre - tinv + 0.4)))
    share = f'''<div id="pd-share" class="clip" data-start="{r(twa - 0.2)}" data-duration="{r(tpre - twa + 0.6)}">
      <div class="sh-h">{ic('wa', 40)}<div><b>Aïcha Traoré</b><span>07 00 00 00 12</span></div></div>
      <div class="sh-b"><div class="sh-img"><div style="height:6px;background:linear-gradient(90deg,#FF6208,#00D4C8)"></div><b>FACTURE FAC-128</b><span>Total 247 000 F</span></div>
      <p>Bonjour Aïcha, voici votre facture FAC-128. Merci pour votre achat !</p></div>
      <div class="sh-f"><span>Message préparé par l'application</span><div id="pd-send">{ic('send', 30, '#fff', 2.4)}</div></div><div class="tap" id="pd-tapS" style="left:722px;top:396px"></div></div>'''
    steps = ['Déposé', 'En réparation', 'Prêt', 'Restitué']
    sav = f'''<div id="pd-sav" class="clip card" data-start="{r(tsav - 0.2)}" data-duration="{r(D - tsav + 0.2)}"><div class="pw-h"><span>{ic('wrench', 34, '#C99410')}</span><div><b>SAV-034 · Tecno Spark 20</b><em>Écran fissuré</em></div></div>
      <div class="pw-st">{''.join(f'<div id="pd-n{i}"><i>{ic("check", 22, "#fff", 3.2)}</i><span>{n}</span></div>' for i, n in enumerate(steps))}</div></div>
    <div id="pd-stk" class="clip card" data-start="{r(tst - 0.2)}" data-duration="{r(D - tst + 0.2)}"><span id="pd-bell">{ic('bell', 46, ORANGE, 2)}</span><div><b>Stock bas</b><em>Galaxy A16 · 1 restant</em></div></div>'''
    morning = f'<div id="pd-am" class="clip chip" data-start="{r(tm - 0.1)}" data-duration="{r(tv - tm + 0.2)}">{ic("sun", 40, ORANGE, 2.2)} 08:00 · Le matin</div>'
    client = f'<div id="pd-cl" class="clip chip" data-start="{r(tcl - 0.1)}" data-duration="{r(tpl - tcl + 0.4)}">{ic("users", 36, TEAL_D, 2.2)} Un client arrive</div>'
    caps = [kin('pd-c1', 'Tout est là.', 220, 100, L(W('Tout')), tcl - 0.1),
            kin('pd-c5', 'Client · <span class="t">Téléphone</span> · <span class="o">Prix</span>', 250, 62, tcli, tinv - 0.1, weight=800),
            kin('pd-c7', 'La facture <span class="o">est prête.</span>', 230, 90, tinv, tpre - 0.05),
            kin('pd-c8', 'Précommande', 210, 96, tpre, tsav - 0.05),
            kin('pd-c9', 'Le SAV <span class="t">suit chaque étape.</span>', 220, 62, tsav, tst - 0.05, weight=800),
            kin('pd-c10', 'Le stock <span class="o">prévient.</span>', 220, 80, tst, D)]
    body = f'''    <div id="pd-wrap" class="clip" data-start="0" data-duration="{D}">{ph}</div>
    {morning}{client}{inv}{share}{sav}
''' + ''.join(b for b, c, j in caps)
    css = ''.join(c for b, c, j in caps) + '''
    #pd-wrap { position:absolute; inset:0; }
    #pd-am { left:300px; top:330px; } #pd-cl { left:280px; top:340px; }
    #pdinv { left:130px; top:520px; }
    #pd-share { position:absolute; left:150px; top:980px; width:780px; border-radius:30px; background:#0B141A; color:#fff; border:2px solid rgba(37,211,102,.45); box-shadow:0 50px 100px rgba(11,31,51,.4); padding:26px; }
    .sh-h { display:flex; gap:16px; align-items:center; } .sh-h b { display:block; font-size:30px; } .sh-h span { font-size:22px; color:#8FA0B3; }
    .sh-b { margin-top:20px; margin-left:auto; width:560px; border-radius:20px; background:#005C4B; padding:14px; }
    .sh-img { border-radius:12px; overflow:hidden; background:#fff; color:#0B1726; padding-bottom:12px; }
    .sh-img b { display:block; padding:12px 16px 0; font-size:24px; } .sh-img span { display:block; padding:0 16px; font-size:20px; color:#D9530A; font-weight:800; }
    .sh-b p { margin-top:12px; font-size:24px; line-height:1.35; }
    .sh-f { display:flex; align-items:center; justify-content:space-between; margin-top:18px; font-size:20px; color:#8FA0B3; }
    #pd-send { width:76px; height:76px; border-radius:50%; background:#1DAA54; display:flex; align-items:center; justify-content:center; }
    #pd-sav { left:90px; top:1080px; width:900px; padding:28px 32px; }
    .pw-h { display:flex; gap:18px; align-items:center; } .pw-h > span { width:70px; height:70px; border-radius:20px; background:#FFF4D6; display:flex; align-items:center; justify-content:center; }
    .pw-h b { display:block; font-size:32px; } .pw-h em { font-style:normal; font-size:24px; color:#4A5D72; }
    .pw-st { display:flex; justify-content:space-between; margin-top:24px; }
    .pw-st div { width:200px; text-align:center; } .pw-st i { width:56px; height:56px; margin:0 auto; border-radius:50%; background:#D5DEE8; display:flex; align-items:center; justify-content:center; }
    .pw-st i svg { opacity:0; } .pw-st span { display:block; margin-top:10px; font-size:24px; font-weight:700; color:#6A7C90; }
    #pd-stk { left:200px; top:1380px; width:680px; padding:24px 30px; display:flex; align-items:center; gap:20px; border:2px solid rgba(255,98,8,.4); }
    #pd-stk b { display:block; font-size:36px; } #pd-stk em { font-style:normal; font-size:26px; color:#4A5D72; }'''
    js = ''.join(j for b, c, j in caps)
    js += f'''
    tl.set(["#{p}dim", "#{p}sheet", "#{p}toast"], {{ opacity:0 }}, 0);
    tl.set(["#{p}form", "#{p}pre"], {{ x:390 }}, 0);
    tl.set(["#{p}h2", "#{p}h3"], {{ opacity:0 }}, 0);
    tl.fromTo("#pd-am", {{ y:-40, opacity:0 }}, {{ y:0, opacity:1, duration:0.45, ease:"expo.out" }}, {r(tm - 0.1)});
    tl.from(".{p}bar", {{ scaleY:0, transformOrigin:"50% 100%", duration:0.8, ease:"expo.out", stagger:0.06 }}, 0.5);
    count("#{p}k1", 0, 485000, {tv}, 1.0, "", " F");
    count("#{p}k2", 0, 58500, {tb}, 1.0, "+", " F");
    count("#{p}k3", 0, 6, {r(tb + 0.3)}, 0.8, "", "");
    count("#{p}k4", 0, 3, {r(tb + 0.45)}, 0.8, "", "");
    tl.to("#{p}scroll", {{ y:-1225, duration:0.7, ease:"power3.inOut" }}, {r(to - 0.4)});
    tl.fromTo("#{p}ring", {{ attr:{{ "stroke-dashoffset":314.16 }} }}, {{ attr:{{ "stroke-dashoffset":91.1 }}, duration:1.1, ease:"power3.out" }}, {r(to)});
    tl.to("#{p}scroll", {{ y:0, duration:0.5, ease:"power3.inOut" }}, {r(tcl - 0.2)});
    tl.fromTo("#pd-cl", {{ y:-40, opacity:0 }}, {{ y:0, opacity:1, duration:0.45, ease:"expo.out" }}, {r(tcl - 0.1)});
    tap("#{p}tap0", {tpl});
    tl.to("#{p}fab", {{ rotation:45, duration:0.3, ease:"back.out(2)" }}, {r(tpl + 0.05)});
    tl.to("#{p}dim", {{ opacity:1, duration:0.2 }}, {r(tpl + 0.1)});
    tl.fromTo("#{p}sheet", {{ y:400, opacity:1 }}, {{ y:0, opacity:1, duration:0.4, ease:"expo.out", immediateRender:false }}, {r(tpl + 0.1)});
    tap("#{p}tap1", {r(tcli - 0.3)});
    tl.to("#{p}form", {{ x:0, duration:0.4, ease:"expo.out" }}, {r(tcli - 0.15)});
    tl.set(["#{p}dim", "#{p}sheet"], {{ opacity:0 }}, {r(tcli + 0.3)});
    type("#{p}f1", "Aïcha Traoré", {r(tcli + 0.1)}, 0.035);
    type("#{p}f2", "07 00 00 00 12", {r(tcli + 0.55)}, 0.02);
    type("#{p}f3", "Samsung Galaxy A56", {ttel}, 0.03);
    tl.set("#{p}neuf", {{ className:"on" }}, {r(ttel + 0.6)});
    tl.to("#{p}form .scroll", {{ y:-150, duration:0.4, ease:"power3.inOut" }}, {r(tpx - 0.35)});
    type("#{p}f4", "245 000", {tpx}, 0.04);
    tap("#{p}tap2", {r(tpx + 0.35)});
    tl.fromTo("#{p}toast", {{ y:-40, opacity:0 }}, {{ y:0, opacity:1, duration:0.3, ease:"back.out(2)", immediateRender:false }}, {r(tpx + 0.45)});
    tl.to("#{p}toast", {{ opacity:0, duration:0.3 }}, {r(tinv + 1.0)});
    tl.to("#pd-phone", {{ opacity:0.3, scale:0.94, duration:0.4 }}, {r(tinv - 0.1)});
    tl.fromTo("#{p}inv", {{ y:500, scale:0.3, rotation:-8, opacity:0 }}, {{ y:0, scale:1, rotation:0, opacity:1, duration:0.7, ease:"expo.out" }}, {r(tinv - 0.1)});
    tl.to("#{p}inv", {{ y:-300, scale:0.6, duration:0.5, ease:"power3.inOut" }}, {r(twa - 0.25)});
    tl.fromTo("#pd-share", {{ y:300, opacity:0 }}, {{ y:0, opacity:1, duration:0.45, ease:"expo.out" }}, {r(twa - 0.2)});
    tap("#pd-tapS", {r(L(W('WhatsApp.', 1, 52)) + 0.2)});
    tl.to("#pd-send", {{ scale:0.85, duration:0.1, yoyo:true, repeat:1 }}, {r(L(W('WhatsApp.', 1, 52)) + 0.2)});
    tl.to(["#{p}inv", "#pd-share"], {{ x:-1100, opacity:0, duration:0.45, ease:"power3.in", stagger:0.05 }}, {r(tpre - 0.1)});
    tl.to("#pd-phone", {{ opacity:1, scale:1, duration:0.4 }}, {r(tpre - 0.05)});
    tl.to("#{p}pre", {{ x:0, duration:0.45, ease:"expo.out" }}, {r(tpre)});
    tl.to("#{p}pbar", {{ width:"69%", duration:0.5, ease:"power3.out" }}, {r(tac)});
    tl.to("#{p}h2", {{ opacity:1, duration:0.3 }}, {r(tac)});
    count("#{p}pv", 250000, 450000, {tac}, 0.5, "", " F");
    count("#{p}pr", 400000, 200000, {tac}, 0.5, "", " F");
    tl.to("#{p}pbar", {{ width:"100%", duration:0.5, ease:"power3.out" }}, {r(tsol)});
    tl.to("#{p}h3", {{ opacity:1, duration:0.3 }}, {r(tsol)});
    count("#{p}pv", 450000, 650000, {tsol}, 0.5, "", " F");
    count("#{p}pr", 200000, 0, {tsol}, 0.5, "", " F");
    tl.to("#{p}ptag", {{ opacity:0, duration:0.2 }}, {r(tsol + 0.3)});
    tl.to("#{p}ptag2", {{ opacity:1, duration:0.2 }}, {r(tsol + 0.3)});
    tl.to("#pd-phone", {{ y:-260, scale:0.72, duration:0.6, ease:"power3.inOut" }}, {r(tsav - 0.3)});
    tl.fromTo("#pd-sav", {{ y:300, opacity:0 }}, {{ y:0, opacity:1, duration:0.5, ease:"expo.out" }}, {r(tsav - 0.2)});'''
    for i in range(4):
        t = tsav + 0.5 + i * 0.45
        js += f'''
    tl.to("#pd-n{i} i", {{ backgroundColor:"#00C2B6", duration:0.2 }}, {r(t)});
    tl.to("#pd-n{i} i svg", {{ opacity:1, duration:0.2 }}, {r(t)});
    tl.to("#pd-n{i} span", {{ color:"#0B1F33", duration:0.2 }}, {r(t)});'''
    js += f'''
    tl.fromTo("#pd-stk", {{ y:200, opacity:0 }}, {{ y:0, opacity:1, duration:0.45, ease:"expo.out" }}, {r(tst - 0.2)});
    tl.fromTo("#pd-bell", {{ rotation:-18 }}, {{ rotation:18, duration:0.12, yoyo:true, repeat:7, ease:"sine.inOut" }}, {r(L(W('prévient')))});
    tl.to(["#pd-wrap", "#pd-sav", "#pd-stk", "#pd-c10"], {{ opacity:0, x:-160, duration:0.35, ease:"power2.in" }}, {r(D - 0.38)});'''
    write('phone', scene('phone', body, css, js))


# ------------------------------------------------------------------ F. the team: Yannick, Arnaud, Serge
def build_team():
    S, E = W('Yannick,', 1, 60, 'n') - 0.2, W('Vingt-et-une', 2) - 0.2
    L, D = host('team', S, E)
    tA, tS = L(W('Arnaud')), L(W('Serge', 1, 68))
    tsans, tval, tfo, tord = L(W('sans')), L(W('valide')), L(W('fournisseurs.')), L(W('ordinateur'))
    ph = phone('tm-ph', 0.98, dash_employe('tme'), 'left:610px;top:520px;')
    lpA = laptop('tm-lpa', 0.72, dk_factures('tma'), 'left:28px;top:400px;')
    lpS = laptop('tm-lps', 0.72, dk_dashboard('tms'), 'left:28px;top:400px;')
    cx, cy = r(28 + 14 + 1135 * 0.72), r(400 + 14 + 252 * 0.72)
    body = f'''    <div id="tm-y" class="clip" data-start="0" data-duration="{r(tA + 0.1)}">
      <img class="cut" id="tm-yi" src="{YANNICK}" alt="Yannick (illustration)" />{ph}
      <div class="card tm-tag" id="tm-yt"><b>Yannick</b><span>Vendeur</span></div>
      <div class="card" id="tm-pr"><div class="em-r"><span>Prix de vente</span><b>245 000 F</b></div><div class="em-r"><span>Prix d'achat</span><b class="em-hid"><i>221 000 F</i>{ic('lock', 30, ORANGE, 2.4)}</b></div></div></div>
    <div id="tm-a" class="clip" data-start="{r(tA - 0.1)}" data-duration="{r(tS - tA + 0.2)}">{lpA}
      <img class="cut" id="tm-ai" src="{ARNAUD}" alt="Arnaud (illustration)" /><div class="card tm-tag" id="tm-at"><b>Arnaud</b><span>Administrateur</span></div>
      <div class="cur" id="tm-cur" style="left:{cx}px;top:{cy}px">{CURSOR}</div><div class="tap" id="tm-tap" style="left:{cx}px;top:{cy}px"></div>
      <div class="chip" id="tm-fo" style="left:60px;top:1150px">{ic('factory', 34, TEAL_D)} Fournisseurs · meilleur prix</div></div>
    <div id="tm-s" class="clip" data-start="{r(tS - 0.1)}" data-duration="{r(D - tS + 0.1)}">{lpS}
      <img class="cut" id="tm-si" src="{SERGE}" alt="Serge (illustration)" /><div class="card tm-tag" id="tm-st"><b>Serge</b><span>Patron</span></div>
      <div class="chip" id="tm-home" style="left:60px;top:1150px">{ic('home', 36, ORANGE)} À la maison</div></div>
'''
    caps = [kin('tm-k1', 'Il vend… <span class="t">sans voir les prix d\'achat.</span>', 160, 52, 0.2, tA - 0.05, weight=800),
            kin('tm-k2', 'Il valide <span class="t">et compare.</span>', 160, 70, tA + 0.3, tS - 0.05),
            kin('tm-k3', 'Il voit <span class="o">tout.</span>', 160, 90, tS + 0.4, D)]
    body += ''.join(b for b, c, j in caps)
    css = ''.join(c for b, c, j in caps) + '''
    #tm-y, #tm-a, #tm-s { position:absolute; inset:0; }
    #tm-yi { left:20px; top:640px; height:1160px; width:auto; }
    .tm-tag { padding:20px 30px; } .tm-tag b { display:block; font-size:50px; font-weight:900; } .tm-tag span { font-size:26px; font-weight:800; color:#00A99F; letter-spacing:.08em; text-transform:uppercase; }
    #tm-yt { left:60px; top:420px; }
    #tm-pr { left:300px; top:1260px; width:720px; padding:26px 32px; border:2px solid rgba(255,98,8,.4); }
    .em-r { display:flex; justify-content:space-between; align-items:center; margin:8px 0; font-size:30px; font-weight:700; color:#4A5D72; } .em-r b { font-size:34px; color:#0B1F33; }
    .em-hid { display:flex; align-items:center; gap:14px; } .em-hid i { font-style:normal; filter:blur(11px); }
    #tm-ai { left:600px; top:1000px; height:900px; width:auto; }
    #tm-at { left:60px; top:1320px; }
    #tm-si { left:620px; top:1000px; height:900px; width:auto; }
    #tm-st { left:60px; top:1320px; }'''
    js = ''.join(j for b, c, j in caps) + f'''
    tl.fromTo("#tm-yi", {{ x:-500, opacity:0 }}, {{ x:0, opacity:1, duration:0.7, ease:"expo.out" }}, 0.0);
    tl.fromTo("#tm-ph", {{ x:500, opacity:0 }}, {{ x:0, opacity:1, duration:0.7, ease:"expo.out" }}, 0.1);
    tl.fromTo("#tm-yt", {{ y:30, opacity:0 }}, {{ y:0, opacity:1, duration:0.4 }}, 0.3);
    tl.fromTo("#tm-pr", {{ y:200, opacity:0 }}, {{ y:0, opacity:1, duration:0.5, ease:"expo.out" }}, {r(tsans - 0.2)});
    tl.fromTo("#tm-pr svg", {{ scale:0 }}, {{ scale:1, duration:0.35, ease:"back.out(3)" }}, {r(L(W("d'achat.")))});
    tl.to("#tm-y", {{ x:-1080, duration:0.5, ease:"power3.in" }}, {r(tA - 0.45)});
    tl.fromTo("#tm-lpa", {{ y:-400, opacity:0 }}, {{ y:0, opacity:1, duration:0.6, ease:"expo.out" }}, {r(tA - 0.1)});
    tl.fromTo("#tm-ai", {{ x:500, opacity:0 }}, {{ x:0, opacity:1, duration:0.6, ease:"expo.out" }}, {r(tA)});
    tl.fromTo("#tm-at", {{ y:30, opacity:0 }}, {{ y:0, opacity:1, duration:0.4 }}, {r(tA + 0.2)});
    tl.fromTo("#tm-cur", {{ x:-420, y:300, opacity:0 }}, {{ x:0, y:0, opacity:1, duration:0.6, ease:"power3.inOut" }}, {r(tval - 0.7)});
    tap("#tm-tap", {r(tval - 0.05)});
    tl.set("#tmas0", {{ className:"tag g", textContent:"Validée" }}, {r(tval)});
    tl.to("#tmav0", {{ opacity:0.25, duration:0.2 }}, {r(tval)});
    tl.fromTo("#tm-fo", {{ x:-600, opacity:0 }}, {{ x:0, opacity:1, duration:0.45, ease:"expo.out" }}, {r(tfo - 0.3)});
    tl.to("#tm-a", {{ x:-1080, duration:0.5, ease:"power3.in" }}, {r(tS - 0.45)});
    tl.fromTo("#tm-lps", {{ y:-400, opacity:0 }}, {{ y:0, opacity:1, duration:0.6, ease:"expo.out" }}, {r(tS - 0.1)});
    tl.fromTo("#tm-si", {{ x:500, opacity:0 }}, {{ x:0, opacity:1, duration:0.6, ease:"expo.out" }}, {r(tS)});
    tl.fromTo("#tm-st", {{ y:30, opacity:0 }}, {{ y:0, opacity:1, duration:0.4 }}, {r(tS + 0.2)});
    tl.from(".tmsdbar", {{ scaleY:0, transformOrigin:"50% 100%", duration:0.7, ease:"expo.out", stagger:0.06 }}, {r(tS + 0.3)});
    tl.fromTo("#tm-home", {{ x:-600, opacity:0 }}, {{ x:0, opacity:1, duration:0.45, ease:"expo.out" }}, {r(tord)});
    tl.to("#tm-s", {{ opacity:0, duration:0.35 }}, {r(D - 0.38)});'''
    write('team', scene('team', body, css, js))


# ------------------------------------------------------------------ G. 21:00 again — the answer
def build_payoff():
    S, E = W('Vingt-et-une', 2) - 0.3, W('BG-MARKET-GESTION,', 1, 80) - 0.2
    L, D = host('payoff', S, E)
    tq, tr, ta, to, trn = L(W('Bon.', 1, 74, 's')), L(W('réponse')), L(W('Ah', 1, 78, 's')), L(W('Oui')), L(W('rentrer'))
    qe = L(W('?', 1, 76, 's')) + 0.5
    b1, j1 = bubble('po-q', 'SERGE', 'Bon. Combien on a vendu aujourd\'hui ?', 60, 330, 620, tq - 0.1, qe)
    b2, j2 = bubble('po-a', 'SERGE', 'Ah… c\'est tout ?', 120, 330, 460, ta - 0.1, to + 0.2)
    ans = f'''<div id="po-ans" class="clip card" data-start="{r(tr - 0.2)}" data-duration="{r(D - tr + 0.2)}"><div class="po-i">{ic('cart', 54, '#04222A', 2.2)}</div><em>Ventes du jour</em><b id="po-v">0 F</b><span>Bénéfice <i>+58 500 F</i> · 6 commandes</span></div>'''
    body = f'''    <div id="po-clock" class="clip" data-start="0" data-duration="{r(tr)}"><span>21</span><i>:</i><span>00</span></div>
    <img id="po-serge" class="clip cut" data-start="0" data-duration="{D}" src="{SERGE}" alt="Serge (illustration)" />
    {ans}
{b1}{b2}'''
    caps = [kin('po-k1', 'C\'est tout.', 210, 110, to, trn - 0.05, color='#fff'),
            kin('po-k2', 'Tu peux <span class="t">rentrer.</span>', 210, 110, trn - 0.2, D, color='#fff')]
    body += ''.join(b for b, c, j in caps)
    css = ''.join(c for b, c, j in caps) + '''
    #po-clock { position:absolute; left:0; right:0; top:120px; text-align:center; font-size:230px; font-weight:900; color:#fff; font-variant-numeric:tabular-nums; }
    #po-clock i { font-style:normal; color:#3DF2E6; margin:0 8px; }
    #po-serge { left:470px; top:560px; height:1060px; width:auto; }
    #po-ans { left:80px; top:700px; width:620px; padding:34px 38px; border:3px solid #00D4C8; }
    .po-i { width:92px; height:92px; border-radius:26px; background:linear-gradient(180deg,#22E3D6,#00B3A9); display:flex; align-items:center; justify-content:center; }
    #po-ans em { display:block; font-style:normal; margin-top:18px; font-size:34px; font-weight:800; color:#4A5D72; }
    #po-ans b { display:block; font-size:96px; font-weight:900; letter-spacing:-.03em; font-variant-numeric:tabular-nums; }
    #po-ans span { display:block; font-size:28px; font-weight:700; color:#4A5D72; } #po-ans i { font-style:normal; color:#FF6208; font-weight:900; }'''
    js = ''.join(j for b, c, j in caps) + j1 + j2 + f'''
    tl.fromTo("#po-clock span", {{ opacity:0, y:-80 }}, {{ opacity:1, y:0, duration:0.6, ease:"expo.out", stagger:0.12 }}, 0.1);
    tl.fromTo("#po-serge", {{ x:400, opacity:0 }}, {{ x:0, opacity:1, duration:0.8, ease:"expo.out" }}, 0.2);
    tl.to("#po-clock", {{ opacity:0, y:-60, duration:0.3 }}, {r(tr - 0.3)});
    tl.fromTo("#po-ans", {{ scale:0.5, opacity:0, y:120 }}, {{ scale:1, opacity:1, y:0, duration:0.6, ease:"back.out(1.5)" }}, {r(tr - 0.2)});
    count("#po-v", 0, 485000, {r(tr)}, 1.0, "", " F");
    tl.to("#po-ans", {{ y:300, scale:0.9, duration:0.5, ease:"power3.inOut" }}, {r(to - 0.3)});
    tl.to("#po-serge", {{ x:700, opacity:0, duration:0.9, ease:"power2.in" }}, {r(trn + 0.3)});
    tl.to("#po-ans", {{ opacity:0, duration:0.4 }}, {r(D - 0.45)});'''
    write('payoff', scene('payoff', body, css, js))


# ------------------------------------------------------------------ H. yours: your rules, your roles, your brand
def build_perso():
    S, E = W('BG-MARKET-GESTION,', 1, 80) - 0.3, W('Derrière') - 0.15
    L, D = host('perso', S, E)
    mk = phone('ps-mk', 0.98, B.generic_app('gx'), 'left:328px;top:460px;')
    trades = [('store', 'Boutique', TEAL, 'Boutique'), ('pill', 'Pharmacie', GREEN, 'pharmacie'), ('utensils', 'Restaurant', '#E0A100', 'restaurant'), ('cart', 'Supermarché', ORANGE, 'supermarché')]
    pos = [(40, 520), (790, 520), (40, 980), (790, 980)]
    pos = [(30, 470), (790, 470), (30, 960), (790, 960)]
    tiles = ''.join(f'<div class="ps-t" id="ps-t{i}" style="left:{x}px;top:{y}px;--c:{c}"><div class="ps-im"><div class="ps-kb">{TRADES[k]()}</div><i class="ps-gl"></i></div><b><span>{ic(k, 30, c, 2.2)}</span>{n}</b></div>' for i, ((k, n, c, w), (x, y)) in enumerate(zip(trades, pos)))
    chips = [('Vos règles', 'règles,'), ('Vos rôles', 'rôles…'), ('Votre marque', 'marque.')]
    ch = ''.join(f'<div class="ps-c" id="ps-c{i}">{n}</div>' for i, (n, w) in enumerate(chips))
    body = f'''    <div id="ps-mkw" class="clip" data-start="{r(L(W('vôtre')) - 0.2)}" data-duration="{r(D - L(W('vôtre')) + 0.2)}">{mk}<div id="ps-lab">Maquette d'illustration</div></div>
    <div id="ps-tw" class="clip" data-start="{r(L(W('Boutique', 1, 88)) - 0.2)}" data-duration="{r(D - L(W('Boutique', 1, 88)) + 0.2)}">{tiles}</div>
    <div id="ps-cw" class="clip" data-start="{r(L(W('règles,')) - 0.2)}" data-duration="{r(L(W('Boutique', 1, 88)) - L(W('règles,')) + 0.3)}">{ch}</div>
    <div id="ps-au" class="clip chip" data-start="{r(L(W("l'audit")) - 0.2)}" data-duration="{r(D - L(W("l'audit")) + 0.2)}">{ic('clip', 36, TEAL_D)} 1. Audit <span style="color:#9AA8B8">→</span> {ic('phone', 36, ORANGE)} 2. Votre application</div>
'''
    caps = [kin('ps-k1', 'L\'application <span class="t">de notre boutique.</span>', 220, 62, 0.3, L(W('vôtre')) - 0.1, weight=800),
            kin('ps-k2', 'La vôtre ?', 200, 110, L(W('vôtre')) - 0.1, L(W('Boutique', 1, 88)) - 0.1),
            kin('ps-k3', 'On la construit <span class="o">pour vous.</span>', 200, 76, L(W('construit', 1, 92)) - 0.3, D)]
    body += ''.join(b for b, c, j in caps)
    css = ''.join(c for b, c, j in caps) + '''
    #ps-mkw, #ps-tw, #ps-cw { position:absolute; inset:0; }
    #ps-mk { --acc:#00A8E8; }
    #ps-lab { position:absolute; left:0; right:0; top:1340px; text-align:center; font-size:24px; font-weight:700; color:#6A7C90; }
    .ps-t { position:absolute; width:260px; height:360px; border-radius:30px; background:#fff; padding:10px; box-shadow:0 30px 70px rgba(11,31,51,.22); border:3px solid var(--c); }
    .ps-im { position:relative; width:234px; height:270px; border-radius:22px; overflow:hidden; background:#ddd; }
    .ps-kb { position:absolute; inset:0; }
    .ps-kb svg { display:block; width:100%; height:100%; }
    .ps-gl { position:absolute; top:-40px; left:0; width:90px; height:360px; background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.7),rgba(255,255,255,0)); transform:translateX(-160px) rotate(16deg); }
    .ps-t b { display:flex; align-items:center; justify-content:center; gap:10px; margin-top:16px; font-size:28px; font-weight:800; }
    .ps-t b span { display:flex; }
    #ps-cw { display:flex; flex-direction:column; align-items:flex-start; gap:20px; padding:560px 0 0 40px; }
    .ps-c { padding:20px 32px; border-radius:30px; font-size:38px; font-weight:900; background:#fff; box-shadow:0 20px 50px rgba(11,31,51,.14); border:3px solid #00D4C8; }
    #ps-au { left:150px; top:1400px; }'''
    js = ''.join(j for b, c, j in caps)
    js += f'''
    tl.fromTo("#ps-mk", {{ y:900, rotation:6 }}, {{ y:0, rotation:0, duration:0.8, ease:"expo.out" }}, {r(L(W('vôtre')) - 0.2)});'''
    for i, (n, w) in enumerate(chips):
        js += f'\n    tl.fromTo("#ps-c{i}", {{ x:-400, opacity:0 }}, {{ x:0, opacity:1, duration:0.4, ease:"expo.out" }}, {r(L(W(w)) - 0.15)});'
    js += f'\n    tl.to("#ps-cw", {{ opacity:0, x:-200, duration:0.3 }}, {r(L(W("Boutique", 1, 88)) - 0.2)});'
    for i, (k, n, c, w) in enumerate(trades):
        t0 = L(W(w, 1, 88)) - 0.1
        dx = -420 if i % 2 == 0 else 420
        js += f'''
    tl.fromTo("#ps-t{i}", {{ x:{dx}, rotation:{-10 if i % 2 == 0 else 10}, opacity:0 }}, {{ x:0, rotation:{-3 if i % 2 == 0 else 3}, opacity:1, duration:0.7, ease:"expo.out" }}, {r(t0)});
    tl.fromTo("#ps-t{i} .ps-kb", {{ scale:1.35 }}, {{ scale:1.0, duration:3.2, ease:"power2.out" }}, {r(t0)});
    tl.fromTo("#ps-t{i} .ps-gl", {{ x:-160 }}, {{ x:340, duration:0.8, ease:"power2.inOut" }}, {r(t0 + 0.45)});
    tl.to("#ps-t{i}", {{ y:-10, duration:1.4, yoyo:true, repeat:1, ease:"sine.inOut" }}, {r(t0 + 0.7)});'''
    for i, col in enumerate(['#FF3B6B', '#2DBE60', '#E0A100', '#FF6208', '#00A8E8']):
        js += f'\n    tl.set("#ps-mk", {{ "--acc":"{col}" }}, {r(L(W("Boutique", 1, 88)) + i * 0.5)});'
    js += f'''
    tl.fromTo("#ps-au", {{ y:60, opacity:0 }}, {{ y:0, opacity:1, duration:0.45, ease:"expo.out" }}, {r(L(W("l'audit")) - 0.2)});
    tl.to(["#ps-mkw", "#ps-tw", "#ps-au", "#ps-k3"], {{ opacity:0, y:-60, duration:0.35, ease:"power2.in" }}, {r(D - 0.38)});'''
    write('perso', scene('perso', body, css, js))


# ------------------------------------------------------------------ I. founder
def build_founder():
    S, E = W('Derrière') - 0.2, W('Et', 1, 97.5) - 0.1
    L, D = host('founder', S, E)
    tn = L(W('Gnohité'))
    body = f'''    <div id="fd-man" class="clip" data-start="0" data-duration="{D}"><div id="fd-ring"></div><img src="assets/people/founder_round.jpg" alt="Gnohité Djôlo, fondateur de BG-MARKET" /></div>
    <div id="fd-plate" class="clip card" data-start="{r(tn - 0.2)}" data-duration="{r(D - tn + 0.2)}"><b>GNOHITÉ DJÔLO</b><span>Fondateur de BG-MARKET</span></div>'''
    css = '''
    #fd-man { position:absolute; left:240px; top:380px; width:600px; height:600px; }
    #fd-ring { position:absolute; inset:-16px; border-radius:50%; background:conic-gradient(from 0deg,#00D4C8,#FF6208,#00D4C8 60%,#FF6208,#00D4C8); }
    #fd-man img { position:absolute; inset:0; width:600px; height:600px; border-radius:50%; object-fit:cover; border:12px solid #fff; }
    #fd-plate { left:90px; right:90px; top:1110px; padding:34px 40px; text-align:center; }
    #fd-plate b { display:block; font-size:80px; font-weight:900; letter-spacing:.01em; }
    #fd-plate span { display:block; margin-top:6px; font-size:42px; font-weight:800; color:#FF6208; }'''
    js = f'''
    tl.fromTo("#fd-man", {{ opacity:0, scale:0.6 }}, {{ opacity:1, scale:1, duration:0.8, ease:"expo.out" }}, 0.0);
    tl.fromTo("#fd-ring", {{ rotation:0 }}, {{ rotation:160, duration:{D}, ease:"none" }}, 0.0);
    tl.fromTo("#fd-plate", {{ y:150, opacity:0 }}, {{ y:0, opacity:1, duration:0.5, ease:"expo.out" }}, {r(tn - 0.2)});
    tl.to(["#fd-man", "#fd-plate"], {{ opacity:0, scale:0.9, duration:0.35, ease:"power2.in" }}, {r(D - 0.38)});'''
    write('founder', scene('founder', body, css, js))


# ------------------------------------------------------------------ J. the question to you + end card
def build_end():
    S = W('Et', 1, 97.5) - 0.15
    L, D = host('end', S, DUR)
    tw = L(W('Écrivez-nous'))
    body = f'''    <div id="en-q" class="clip cap big" data-start="0.1" data-duration="{r(tw - 0.05)}"><span class="w">Et vous…</span><br><span class="w">ce soir, vous savez</span><br><span class="w o">combien</span><br><span class="w o">vous avez vendu ?</span></div>
    <div id="en-dark" class="clip" data-start="{r(tw - 0.4)}" data-duration="{r(D - tw + 0.4)}"></div>
    <video id="en-anim" class="clip" data-start="{r(tw - 0.2)}" data-duration="6.0" src="assets/brand/logo_anim.webm" muted playsinline></video>
    <img id="en-logo" class="clip" data-start="{r(tw + 5.75)}" data-duration="{r(D - tw - 5.75)}" src="assets/brand/logo_final.png" alt="BG-MARKET, Technologie pour tous" />
    <div id="en-msg" class="clip cap" data-start="{r(tw + 0.9)}" data-duration="{r(D - tw - 0.9)}">Une application de gestion <span class="t2">à l'image de votre commerce.</span></div>
    <div id="en-cta" class="clip cap" data-start="{r(tw + 0.1)}" data-duration="{r(D - tw - 0.1)}">Écrivez-nous sur WhatsApp</div>
    <div id="en-tel" class="clip cap" data-start="{r(tw + 0.5)}" data-duration="{r(D - tw - 0.5)}">{ic('wa', 92)}<span><span class="t2">07</span> 15 78 69 75</span></div>'''
    css = '''
    #en-q { top:560px; font-size:84px; line-height:1.15; }
    #en-dark { position:absolute; inset:0; background:radial-gradient(120% 80% at 50% 30%, #16324F 0%, #0B1F33 60%, #071524 100%); }
    #en-anim, #en-logo { position:absolute; left:0; top:220px; width:1080px; height:608px; }
    .t2 { color:#3DF2E6; }
    #en-msg { top:900px; width:880px; white-space:normal; font-size:54px; font-weight:800; line-height:1.22; color:#fff; }
    #en-cta { top:1230px; font-size:46px; font-weight:800; color:#C9D6E3; }
    #en-tel { top:1320px; white-space:nowrap; display:flex; align-items:center; gap:24px; font-size:86px; font-weight:900; color:#fff; padding:26px 46px; border-radius:40px; background:rgba(37,211,102,.10); border:3px solid rgba(37,211,102,.6); }'''
    js = f'''
    tl.fromTo("#en-q .w", {{ opacity:0, y:40, filter:"blur(10px)" }}, {{ opacity:1, y:0, filter:"blur(0px)", duration:0.5, ease:"expo.out", stagger:0.55 }}, 0.1);
    tl.to("#en-q", {{ opacity:0, scale:0.95, duration:0.3 }}, {r(tw - 0.35)});
    tl.fromTo("#en-dark", {{ clipPath:"circle(0% at 50% 60%)" }}, {{ clipPath:"circle(150% at 50% 60%)", duration:0.8, ease:"power3.inOut" }}, {r(tw - 0.4)});
    tl.fromTo("#en-cta", {{ opacity:0, y:30 }}, {{ opacity:1, y:0, duration:0.45, ease:"expo.out" }}, {r(tw + 0.1)});
    tl.fromTo("#en-tel", {{ opacity:0, scale:0.85 }}, {{ opacity:1, scale:1, duration:0.55, ease:"expo.out" }}, {r(tw + 0.5)});
    tl.fromTo("#en-msg", {{ opacity:0, y:30 }}, {{ opacity:1, y:0, duration:0.6, ease:"expo.out" }}, {r(tw + 0.9)});
    tl.to("#en-tel", {{ boxShadow:"0 0 80px rgba(37,211,102,.45)", duration:0.8, yoyo:true, repeat:3, ease:"sine.inOut" }}, {r(tw + 1.4)});'''
    write('end', scene('end', body, css, js))


def build_fx(cuts):
    streaks = ''.join(f'<div id="fx-s{i}" class="clip fxs" data-start="{r(t - 0.35)}" data-duration="0.95"><i></i></div>' for i, t in enumerate(cuts))
    js = ''.join(f'''
    tl.fromTo("#fx-s{i} i", {{ y:-2400, skewY:-14, opacity:0 }}, {{ y:2400, skewY:-14, opacity:0.8, duration:0.7, ease:"power2.inOut" }}, {r(t - 0.35)});
    tl.to("#fx-s{i} i", {{ opacity:0, duration:0.2 }}, {r(t + 0.41)});''' for i, t in enumerate(cuts))
    wipes = [t for i, t in enumerate(cuts) if i % 2 == 1]
    streaks += ''.join(f'<div id="fx-w{i}" class="clip fxw" data-start="{r(t - 0.42)}" data-duration="0.9"><i class="a"></i><i class="b"></i><i class="c"></i></div>' for i, t in enumerate(wipes))
    for i, t in enumerate(wipes):
        js += f'''
    tl.fromTo("#fx-w{i} .a", {{ xPercent:-130 }}, {{ xPercent:0, duration:0.38, ease:"power3.in" }}, {r(t - 0.42)});
    tl.fromTo("#fx-w{i} .b", {{ xPercent:-130 }}, {{ xPercent:0, duration:0.38, ease:"power3.in" }}, {r(t - 0.36)});
    tl.fromTo("#fx-w{i} .c", {{ xPercent:-130 }}, {{ xPercent:0, duration:0.38, ease:"power3.in" }}, {r(t - 0.30)});
    tl.to("#fx-w{i} .a", {{ xPercent:130, duration:0.4, ease:"power3.out" }}, {r(t + 0.04)});
    tl.to("#fx-w{i} .b", {{ xPercent:130, duration:0.4, ease:"power3.out" }}, {r(t + 0.08)});
    tl.to("#fx-w{i} .c", {{ xPercent:130, duration:0.4, ease:"power3.out" }}, {r(t + 0.0)});'''
    write('fx', scene('fx', streaks, '''
    .fxw { position:absolute; inset:0; overflow:hidden; }
    .fxw i { position:absolute; left:-25%; width:150%; height:2400px; top:-240px; transform:skewX(-16deg); }
    .fxw .a { background:#00D4C8; } .fxw .b { background:#FF6208; } .fxw .c { background:#FFFFFF; }
    .fxs { position:absolute; inset:0; overflow:hidden; }
    .fxs i { position:absolute; left:-200px; top:50%; width:1480px; height:300px; margin-top:-150px; background:linear-gradient(180deg,rgba(0,212,200,0),rgba(0,212,200,.25) 40%,rgba(255,255,255,.75) 50%,rgba(255,98,8,.2) 60%,rgba(255,98,8,0)); filter:blur(18px); }''', js))
    HOSTS['fx'] = (0, DUR)


def build_index(sfx):
    order = ['bg', 'shop', 'intro', 'chaos', 'months', 'turn', 'phone', 'team', 'payoff', 'perso', 'founder', 'end', 'fx']
    hosts = ''
    for z, n in enumerate(order):
        s, e = HOSTS[n]
        hosts += (f'    <div id="h-{n}" class="clip" data-composition-id="{n}" data-composition-src="compositions/{n}.html" data-start="{s}" data-duration="{r(e - s)}" '
                  f'data-track-index="{z}" data-track-kind="graphics" data-width="1080" data-height="1920" style="z-index:{z}"></div>\n')
    aud = (f'    <audio id="a-music" class="clip" data-start="0" data-duration="{DUR}" src="assets/audio/music_bed.mp3" data-volume="1"></audio>\n'
           f'    <audio id="a-voice" class="clip" data-start="0" data-duration="{r(VO_END + 0.5)}" src="assets/audio/voice.mp3" data-volume="1"></audio>\n'
           f'    <audio id="a-logo" class="clip" data-start="{r(W("Écrivez-nous") - 0.2)}" data-duration="6" src="assets/brand/logo_anim_audio.mp3" data-volume="0.35"></audio>\n')
    for i, (n, t, v) in enumerate(sfx):
        aud += f'    <audio id="a-sfx{i}" class="clip" data-start="{r(t)}" data-duration="2" src="assets/audio/sfx/{n}.mp3" data-volume="{v}"></audio>\n'
    html = f'''<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=1080, height=1920" />
  <title>BG-MARKET-GESTION — L'histoire de Serge</title>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
  <style>
    html, body {{ margin:0; padding:0; width:1080px; height:1920px; overflow:hidden; background:#F2FBFB; }}
    #root {{ position:relative; width:1080px; height:1920px; overflow:hidden; background:#F2FBFB; }}
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
    s = []
    for n, a in [('intro', 0), ('chaos', 0), ('months', 0), ('turn', 0), ('phone', 0), ('team', 0), ('payoff', 0), ('perso', 0), ('founder', 0)]:
        if HOSTS[n][0] > 0.5:
            s.append(('soft_whoosh', HOSTS[n][0] - 0.25, 0.45))
    s += [('notif', W('WhatsApp') + 0.1, 0.35), ('paper', W('cahier') - 0.1, 0.5), ('tap', W('caisse'), 0.4),
          ('notif', W('Yannick', 1, 22, 's') + 1.6, 0.3), ('paper', W('trois') + 0.6, 0.45), ('riser_impact', W('Voici') + 0.3, 0.3),
          ('tap', W('plus'), 0.55), ('typing', W('client,'), 0.4), ('typing', W('téléphone,'), 0.35), ('success', W('prix.') + 0.45, 0.45),
          ('tap', W('WhatsApp.', 1, 52) + 0.2, 0.5), ('success', W('solde.') + 0.3, 0.45), ('notif', W('prévient'), 0.45),
          ('tap', W('valide') - 0.05, 0.5), ('success', W('valide'), 0.4), ('success', W('réponse') + 0.9, 0.5), ('success', W('Écrivez-nous') + 0.5, 0.4)]
    return s


# ------------------------------------------------------------------ simulated set: the phone shop (night and day versions)
def shop_svg(night):
    wall = ('#15304A', '#0E2236') if night else ('#FFFFFF', '#E9F6F7')
    shelf = '#24425F' if night else '#D7E6EE'
    edge = '#33587A' if night else '#BFD3DE'
    phc = ['#2C4A68', '#3A5B7C', '#1F3A55'] if night else ['#0B1F33', '#3B4A5C', '#F1F4F8']
    scr = '#0F2A40' if night else '#BFEFF0'
    tag = '#C2551A' if night else '#FF6208'
    out = f'''<svg viewBox="0 0 1080 1920" width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="w{int(night)}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{wall[0]}"/><stop offset="1" stop-color="{wall[1]}"/></linearGradient>
<linearGradient id="c{int(night)}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{'#1B3550' if night else '#FFFFFF'}"/><stop offset="1" stop-color="{'#0A1828' if night else '#DCEBF0'}"/></linearGradient></defs>
<rect width="1080" height="1920" fill="url(#w{int(night)})"/>
<rect x="0" y="0" width="1080" height="1920" fill="{'#00D4C8' if not night else '#00D4C8'}" opacity="{0.05 if not night else 0.04}"/>'''
    for k, y in enumerate([330, 610, 890]):
        out += f'<rect x="90" y="{y + 150}" width="900" height="18" rx="6" fill="{shelf}"/><rect x="90" y="{y + 168}" width="900" height="6" fill="{edge}"/>'
        for i in range(9):
            x = 120 + i * 96 + (k % 2) * 20
            c = phc[(i + k) % 3]
            out += (f'<rect x="{x}" y="{y + 30}" width="62" height="120" rx="12" fill="{c}"/>'
                    f'<rect x="{x + 5}" y="{y + 38}" width="52" height="102" rx="8" fill="{scr}" opacity="{0.35 if night else 0.9}"/>'
                    f'<rect x="{x + 8}" y="{y + 158}" width="44" height="8" rx="3" fill="{tag}" opacity="{0.6 if night else 0.9}"/>')
    # counter
    out += (f'<rect x="0" y="1330" width="1080" height="590" fill="url(#c{int(night)})"/>'
            f'<rect x="0" y="1330" width="1080" height="10" fill="{edge}"/>'
            f'<rect x="0" y="1520" width="1080" height="16" fill="#00D4C8" opacity="{0.35 if night else 0.85}"/>'
            f'<rect x="0" y="1546" width="1080" height="6" fill="#FF6208" opacity="{0.3 if night else 0.8}"/>')
    for i in range(6):
        out += f'<rect x="{110 + i * 150}" y="1390" width="70" height="110" rx="12" fill="{phc[i % 3]}" opacity="0.8"/>'
    return out + '</svg>'


def build_shop(nights):
    # visible windows of the set: story scenes before the app and the evening payoff; blurred behind the team
    S0, S1 = 0.0, HOSTS['phone'][0] + 0.3
    T0, T1 = HOSTS['team'][0], HOSTS['perso'][0] + 0.3
    body = f'''    <div id="sh-a" class="clip shw" data-start="{S0}" data-duration="{r(S1 - S0)}"><div class="day">{shop_svg(False)}</div><div class="night">{shop_svg(True)}</div></div>
    <div id="sh-b" class="clip shw" data-start="{r(T0)}" data-duration="{r(T1 - T0)}"><div class="day">{shop_svg(False)}</div><div class="night">{shop_svg(True)}</div></div>
    <div id="sh-shut" class="clip" data-start="0" data-duration="{r(HOSTS['months'][1])}"></div>'''
    css = '''
    .shw { position:absolute; inset:0; }
    .shw .day, .shw .night { position:absolute; inset:0; }
    .sh-logo { position:absolute; left:290px; top:120px; width:500px; height:auto; opacity:.9; }
    #sh-shut { position:absolute; left:0; top:0; width:1080px; height:520px; background:repeating-linear-gradient(180deg,#3a4a5c 0 26px,#2a3848 26px 30px); box-shadow:0 14px 30px rgba(0,0,0,.45); transform:translateY(-560px); }'''
    tf = W('fermée')
    js = f'''
    tl.set(".shw .night", {{ opacity:0 }}, 0);
    tl.to("#sh-a", {{ opacity:0.55, filter:"blur(3px)", duration:0.6 }}, {r(HOSTS['chaos'][0] - 0.3)});
    tl.to("#sh-a", {{ opacity:0.35, filter:"blur(6px)", duration:0.8 }}, {r(HOSTS['turn'][0] - 0.2)});
    tl.to("#sh-a", {{ opacity:0, duration:0.4 }}, {r(S1 - 0.45)});
    tl.fromTo("#sh-b", {{ opacity:0 }}, {{ opacity:0.55, filter:"blur(5px)", duration:0.5 }}, {r(T0)});
    tl.to("#sh-b", {{ opacity:1, filter:"blur(0px)", duration:0.6 }}, {r(HOSTS['payoff'][0])});
    tl.to("#sh-b", {{ opacity:0, duration:0.35 }}, {r(T1 - 0.4)});
    tl.fromTo("#sh-shut", {{ y:-560 }}, {{ y:-120, duration:1.4, ease:"power2.inOut" }}, {r(tf - 0.3)});
    tl.to("#sh-shut", {{ y:-560, duration:1.0, ease:"power2.inOut" }}, {r(HOSTS['months'][1] - 1.1)});'''
    for sel in ['#sh-a', '#sh-b']:
        for a, b in nights:
            js += f'''
    tl.to("{sel} .night", {{ opacity:1, duration:1.2, ease:"power2.inOut" }}, {r(a)});
    tl.to("{sel} .night", {{ opacity:0, duration:1.4, ease:"power2.inOut" }}, {r(b)});'''
    write('shop', scene('shop', body, css, js))
    HOSTS['shop'] = (0, DUR)


if __name__ == '__main__':
    nights = build_bg(); build_intro(); build_chaos(); build_months(); build_turn(); build_phone(); build_team(); build_payoff(); build_perso(); build_founder(); build_end()
    build_shop(nights)
    cuts = sorted(v[0] for k, v in HOSTS.items() if k not in ('bg', 'subs', 'intro', 'shop') and v[0] > 1)
    build_fx(cuts)
    build_index(plan_sfx())
    for f in os.listdir(OUT):
        bad = re.findall(r'\}, (-[0-9.]+)\);', open(os.path.join(OUT, f)).read())
        if bad:
            print('NEGATIVE', f, bad[:4])
    print('DUR', DUR, 'VO_END', VO_END, HOSTS)
