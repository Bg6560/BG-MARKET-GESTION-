# Generates the typographic overlay scenes (compositions/*.html). Times are film seconds.
import re, os
OUT = os.path.join(os.path.dirname(__file__), '..', 'compositions')
BASE = '''* { margin:0; padding:0; box-sizing:border-box; }
    #root { position:absolute; inset:0; overflow:hidden; font-family:"Montserrat",sans-serif; color:#fff; }
    #root .t { color:#00D4C8; } #root .o { color:#FF6208; }
    #root .w { display:inline-block; white-space:pre; }
    #root .plate { background:rgba(11,15,20,.62); border:2px solid rgba(255,255,255,.14); border-radius:22px; }'''
def scene(id, body, css, js):
    return f'''<template>
  <style>
    {BASE}
    {css}
  </style>
  <div id="root" data-composition-id="{id}" data-width="1920" data-height="1080">
{body}
  </div>
  <script>
    const tl = gsap.timeline({{ paused: true }});
{js}
    window.__timelines["{id}"] = tl;
  </script>
</template>
'''
def write(name, s):
    open(os.path.join(OUT, name + '.html'), 'w').write(s)
def r(x): return round(x, 2)

# ---------- generic "caption" helper: a big line with word-by-word blur-in and a timed exit ----------
def caption(id, text, left, top, size, t_in, t_out, color='#fff', align='left', weight=900, plate=False):
    return {'id': id, 'text': text, 'left': left, 'top': top, 'size': size, 'in': t_in, 'out': t_out, 'color': color, 'align': align, 'weight': weight, 'plate': plate}
def captions_scene(id, items, dur, extra_css='', extra_js=''):
    body = ''; css = ''; js = ''
    for c in items:
        words = ''.join(f'<span class="w">{w} </span>' for w in re.findall(r'<span[^>]*>.*?</span>|[^\s<]+', c['text']))
        body += f'    <div id="{id}-{c["id"]}" class="clip{" plate" if c["plate"] else ""}" data-start="{c["in"]}" data-duration="{r(c["out"]-c["in"])}">{words}</div>\n'
        pad = 'padding:14px 30px;' if c['plate'] else ''
        css += f'    #{id}-{c["id"]} {{ position:absolute; left:{c["left"]}px; top:{c["top"]}px; font-weight:{c["weight"]}; font-size:{c["size"]}px; letter-spacing:-0.02em; color:{c["color"]}; white-space:nowrap; text-align:{c["align"]}; {pad} }}\n'
        js += f'    tl.fromTo("#{id}-{c["id"]} .w", {{ opacity:0, filter:"blur(10px)", y:22 }}, {{ opacity:1, filter:"blur(0px)", y:0, duration:0.3, ease:"expo.out", stagger:0.07 }}, {c["in"]});\n'
        js += f'    tl.to("#{id}-{c["id"]}", {{ opacity:0, x:-90, filter:"blur(10px)", duration:0.22, ease:"power3.in" }}, {r(c["out"]-0.24)});\n'
    write(id, scene(id, body, css + extra_css, js + extra_js))

# 1. hook (host 0 -> 5.0)
write('hook', scene('hook', '''    <div id="hook-l1" class="clip" data-start="0" data-duration="4.8"><span class="w">LE </span><span class="w">HUAWEI </span><span class="w t">MATE </span><span class="w t">30 </span><span class="w t">PRO </span><span class="w">EN</span></div>
    <div id="hook-l2" class="clip" data-start="0" data-duration="4.8"><span class="w" id="hook-promo">PROMO </span><span class="w" id="hook-bang">!</span></div>
    <div id="hook-l3" class="clip" data-start="0" data-duration="4.8">CHEZ <span class="o">BG-MARKET</span></div>''', '''
    #hook-l1 { position:absolute; left:120px; top:210px; font-weight:800; font-size:58px; white-space:nowrap; letter-spacing:-0.01em; }
    #hook-l2 { position:absolute; left:108px; top:280px; font-weight:900; font-size:215px; color:#FF6208; letter-spacing:-0.035em; line-height:1; white-space:nowrap; }
    #hook-l3 { position:absolute; left:124px; top:560px; font-weight:800; font-size:56px; white-space:nowrap; }''', '''
    tl.fromTo("#hook-l1 .w", { opacity:0, filter:"blur(8px)" }, { opacity:1, filter:"blur(0px)", duration:0.2, ease:"power4.out", stagger:0.13 }, 1.2);
    tl.fromTo("#hook-promo", { opacity:0, filter:"blur(26px)", x:-160 }, { opacity:1, filter:"blur(0px)", x:0, duration:0.6, ease:"expo.out" }, 2.85);
    tl.fromTo("#hook-bang", { opacity:0, scale:2.4, filter:"blur(10px)", transformOrigin:"50% 60%" }, { opacity:1, scale:1, filter:"blur(0px)", duration:0.35, ease:"back.out(1.6)" }, 3.3);
    tl.fromTo("#hook-l3", { opacity:0, x:-60 }, { opacity:1, x:0, duration:0.5, ease:"expo.out" }, 3.8);
    tl.to(["#hook-l1","#hook-l2","#hook-l3"], { opacity:0, x:-220, filter:"blur(16px)", duration:0.28, ease:"power3.in", stagger:0.04 }, 4.55);'''))

# 2. colours (host 5.0 -> 10.9) : names timed to the voice
names = [('SPACE SILVER', 6.45, 7.62, '#C3C4E2'), ('NOIR', 7.62, 8.38, '#FFFFFF'), ('EMERALD GREEN', 8.38, 9.4, '#1FE0CF'), ('COSMIC PURPLE', 9.42, 10.75, '#C77DFF')]
body = '    <div id="col-h" class="clip" data-start="5.1" data-duration="5.7">4 COLORIS <span class="t">OFFICIELS</span></div>\n'
css = '    #col-h { position:absolute; left:110px; top:130px; font-weight:900; font-size:48px; letter-spacing:-0.02em; white-space:nowrap; }\n'
js = '    tl.fromTo("#col-h .w, #col-h", { opacity:0, filter:"blur(10px)" }, { opacity:1, filter:"blur(0px)", duration:0.4, ease:"power4.out" }, 5.1);\n    tl.to("#col-h", { opacity:0, filter:"blur(10px)", duration:0.25 }, 10.5);\n'
for i, (n, a, b, c) in enumerate(names):
    body += f'    <div id="col-n{i}" class="clip" data-start="{a-5.0}" data-duration="{r(b-a)}">{n}</div>\n'
    css += f'    #col-n{i} {{ position:absolute; left:110px; top:860px; font-weight:900; font-size:104px; letter-spacing:-0.03em; color:{c}; white-space:nowrap; text-shadow:0 6px 30px rgba(0,0,0,.6); }}\n'
    js += f'    tl.fromTo("#col-n{i}", {{ opacity:0, x:-120, filter:"blur(16px)" }}, {{ opacity:1, x:0, filter:"blur(0px)", duration:0.4, ease:"expo.out" }}, {r(a-5.0)});\n    tl.to("#col-n{i}", {{ opacity:0, x:80, filter:"blur(12px)", duration:0.2, ease:"power3.in" }}, {r(b-5.0-0.22)});\n'
write('colors', scene('colors', body.replace('data-start="5.1"', 'data-start="0.1"'), css, js.replace('}, 5.1);', '}, 0.1);').replace('}, 10.5);', '}, 5.5);')))

# 3. screen + module + cameras + unlock + volume (captions on plates, left/bottom)
captions_scene('feat1', [
    caption('a', 'ÉCRAN <span class="t">OLED</span> INCURVÉ', 110, 840, 74, 0.2, 1.9, plate=True),
    caption('b', 'BORDS ULTRA-FINS', 110, 840, 74, 1.95, 3.2, color='#00D4C8', plate=True)], 3.2)
captions_scene('feat2', [
    caption('a', 'MODULE PHOTO <span class="o">CIRCULAIRE</span>', 110, 840, 70, 0.1, 1.55, plate=True),
    caption('b', 'SIGNÉ <span class="o">LEICA</span>', 110, 840, 74, 1.6, 2.8, plate=True)], 2.8)
# 4 cameras counter
write('feat3', scene('feat3', '''    <div id="feat3-n" class="clip plate" data-start="0.05" data-duration="2.3"><span id="feat3-num" class="t">1</span> <span>CAMÉRAS</span></div>
    <div id="feat3-s" class="clip plate" data-start="1.35" data-duration="1.0">POUR TOUT CAPTURER</div>''', '''
    #feat3-n { position:absolute; left:110px; top:820px; font-weight:900; font-size:86px; padding:14px 34px; white-space:nowrap; }
    #feat3-s { position:absolute; left:110px; top:950px; font-weight:800; font-size:44px; padding:10px 26px; white-space:nowrap; color:#fff; }''', '''
    tl.fromTo("#feat3-n", { opacity:0, y:40, filter:"blur(10px)" }, { opacity:1, y:0, filter:"blur(0px)", duration:0.4, ease:"expo.out" }, 0.05);
    ["2","3","4"].forEach((n, i) => { tl.set("#feat3-num", { textContent:n }, 0.42 + i * 0.32 + 0.0); });
    tl.set("#feat3-num", { textContent:"1" }, 0.05);
    tl.fromTo("#feat3-s", { opacity:0, y:30, filter:"blur(10px)" }, { opacity:1, y:0, filter:"blur(0px)", duration:0.4, ease:"expo.out" }, 1.4);
    tl.to(["#feat3-n","#feat3-s"], { opacity:0, x:-90, filter:"blur(10px)", duration:0.22, ease:"power3.in" }, 2.1);'''))
captions_scene('feat4', [
    caption('a', 'DÉVERROUILLAGE <span class="t">FACIAL 3D</span>', 110, 840, 66, 0.1, 1.85, plate=True),
    caption('b', 'OU PAR <span class="o">EMPREINTE</span> SOUS L\'ÉCRAN', 110, 840, 58, 1.85, 3.3, plate=True)], 3.3)
captions_scene('feat5', [
    caption('a', 'PAS DE BOUTON DE VOLUME', 110, 150, 60, 0.1, 1.15, plate=True),
    caption('b', 'TOUCHEZ <span class="t">DEUX FOIS</span> LE BORD DE L\'ÉCRAN', 110, 150, 52, 1.2, 2.9, plate=True),
    caption('c', 'PUIS <span class="o">FAITES GLISSER</span>', 110, 150, 60, 2.9, 4.15, plate=True)], 4.2)

# 5. EMUI tour captions (host 26.8 -> 40.4)
tour = [('INTERFACE <span class="t">EMUI</span>', 26.9, 27.45), ("ÉCRAN D'ACCUEIL", 27.5, 29.45), ('MENU PRINCIPAL', 29.55, 30.5), ('PARAMÈTRES', 30.6, 31.4), ('INFORMATIONS TÉLÉPHONE', 31.5, 32.3), ('APPAREIL PHOTO', 32.4, 35.1),
        ('GALERIE', 35.25, 36.2), ('MUSIQUE', 36.3, 37.0), ('VIDÉO', 37.1, 37.85), ('THÈMES', 37.95, 38.7), ('GESTIONNAIRE DU TÉLÉPHONE', 38.8, 40.3)]
items = [caption(f't{i}', txt, 110, 120, 60 if i else 66, r(a - 26.8), r(b - 26.8), plate=True) for i, (txt, a, b) in enumerate(tour)]
captions_scene('tour', items, 13.6)

# 6. offers
def offer(id, side, ver, ram1, ram2, old, new, eco, acc, dur, t_new, t_old, t_eco, cnt):
    x = 1080 if side == 'right' else 110
    write(id, scene(id, f'''    <div id="{id}-tag" class="clip" data-start="0.4" data-duration="{r(dur-0.7)}">{ver}</div>
    <div id="{id}-r1" class="clip" data-start="0.7" data-duration="{r(dur-1.0)}">{ram1}</div>
    <div id="{id}-r2" class="clip" data-start="1.1" data-duration="{r(dur-1.35)}">{ram2}</div>
    <div id="{id}-new" class="clip" data-start="{t_new}" data-duration="{r(dur-t_new-0.25)}"><span id="{id}-num">{new}</span><small> FCFA</small></div>
    <div id="{id}-old" class="clip" data-start="{t_old}" data-duration="{r(dur-t_old-0.25)}"><span>{old} FCFA</span><i id="{id}-strike"></i></div>
    <div id="{id}-eco" class="clip" data-start="{t_eco}" data-duration="{r(dur-t_eco-0.25)}">Économie : {eco} FCFA</div>''', f'''
    #{id}-tag {{ position:absolute; left:{x}px; top:170px; font-weight:800; font-size:34px; letter-spacing:.2em; padding:12px 28px; border:3px solid {acc}; color:{acc}; border-radius:40px; white-space:nowrap; }}
    #{id}-r1 {{ position:absolute; left:{x-4}px; top:250px; font-weight:900; font-size:98px; letter-spacing:-0.03em; line-height:1; white-space:nowrap; }}
    #{id}-r2 {{ position:absolute; left:{x-4}px; top:352px; font-weight:900; font-size:98px; letter-spacing:-0.03em; line-height:1; white-space:nowrap; color:{acc}; }}
    #{id}-new {{ position:absolute; left:{x-6}px; top:520px; font-weight:900; font-size:142px; letter-spacing:-0.045em; line-height:1; color:{acc}; white-space:nowrap; text-shadow:0 8px 40px rgba(0,0,0,.55); }}
    #{id}-new small {{ font-size:50px; letter-spacing:0; color:#fff; font-weight:800; }}
    #{id}-old {{ position:absolute; left:{x}px; top:730px; font-weight:700; font-size:58px; color:#9aa4ad; white-space:nowrap; }}
    #{id}-strike {{ position:absolute; left:-8px; top:50%; height:6px; width:calc(100% + 16px); background:#FF6208; transform-origin:left center; }}
    #{id}-eco {{ position:absolute; left:{x}px; top:850px; font-weight:800; font-size:46px; padding:16px 32px; background:{acc}; color:#0B0F14; border-radius:16px; white-space:nowrap; }}''', f'''
    const dirx = {1 if side == 'right' else -1};
    tl.fromTo("#{id}-tag", {{ opacity:0, filter:"blur(8px)" }}, {{ opacity:1, filter:"blur(0px)", duration:0.25, ease:"power4.out" }}, 0.4);
    tl.fromTo("#{id}-r1", {{ opacity:0, filter:"blur(14px)", x:dirx*120 }}, {{ opacity:1, filter:"blur(0px)", x:0, duration:0.5, ease:"expo.out" }}, 0.7);
    tl.fromTo("#{id}-r2", {{ opacity:0, filter:"blur(14px)", x:dirx*120 }}, {{ opacity:1, filter:"blur(0px)", x:0, duration:0.5, ease:"expo.out" }}, 1.1);
    tl.fromTo("#{id}-new", {{ opacity:0, scale:1.25, filter:"blur(22px)", transformOrigin:"0% 60%" }}, {{ opacity:1, scale:1, filter:"blur(0px)", duration:0.55, ease:"expo.out" }}, {t_new});
    const c = {{ v:0 }}; tl.to(c, {{ v:{cnt}, duration:0.9, ease:"power3.out", onUpdate:()=>{{ document.getElementById("{id}-num").textContent = Math.round(c.v).toString().replace(/\\B(?=(\\d{{3}})+(?!\\d))/g," "); }} }}, {t_new});
    tl.fromTo("#{id}-old", {{ opacity:0, y:20 }}, {{ opacity:1, y:0, duration:0.3, ease:"power3.out" }}, {t_old});
    tl.fromTo("#{id}-strike", {{ scaleX:0 }}, {{ scaleX:1, duration:0.35, ease:"power3.inOut" }}, {r(t_old+0.45)});
    tl.fromTo("#{id}-eco", {{ opacity:0, clipPath:"inset(0 100% 0 0)" }}, {{ opacity:1, clipPath:"inset(0 0% 0 0)", duration:0.4, ease:"power3.out" }}, {t_eco});
    tl.to(["#{id}-tag","#{id}-r1","#{id}-r2","#{id}-new","#{id}-old","#{id}-eco"], {{ opacity:0, x:dirx*200, filter:"blur(14px)", duration:0.24, ease:"power3.in", stagger:0.03 }}, {r(dur-0.42)});'''))
offer('offer1', 'right', 'VERSION 1', '8 Go RAM', '+ 256 Go', '175 000', '160 000', '15 000', '#00D4C8', 6.3, 3.0, 4.9, 5.45, 160000)
offer('offer2', 'left', 'VERSION 2', '8 Go RAM', '+ 128 Go', '155 000', '140 000', '15 000', '#FF6208', 5.6, 2.7, 4.0, 4.65, 140000)

# 7. sealed (host 52.3 -> 54.7)
write('sealed', scene('sealed', '''    <div id="sealed-a" class="clip" data-start="0.1" data-duration="2.1">NEUF SCELLÉ</div>
    <div id="sealed-b" class="clip" data-start="1.25" data-duration="1.0">GARANTIE <span class="o">3 MOIS</span></div>''', '''
    #sealed-a { position:absolute; left:110px; top:300px; font-weight:900; font-size:108px; letter-spacing:-0.03em; color:#00D4C8; white-space:nowrap; text-shadow:0 6px 40px rgba(0,0,0,.6); }
    #sealed-b { position:absolute; left:110px; top:440px; font-weight:900; font-size:92px; letter-spacing:-0.03em; white-space:nowrap; text-shadow:0 6px 40px rgba(0,0,0,.6); }''', '''
    tl.fromTo("#sealed-a", { opacity:0, x:-160, filter:"blur(22px)" }, { opacity:1, x:0, filter:"blur(0px)", duration:0.55, ease:"expo.out" }, 0.1);
    tl.fromTo("#sealed-b", { opacity:0, x:-160, filter:"blur(22px)" }, { opacity:1, x:0, filter:"blur(0px)", duration:0.55, ease:"expo.out" }, 1.25);
    tl.to(["#sealed-a","#sealed-b"], { opacity:0, x:-200, filter:"blur(14px)", duration:0.24, ease:"power3.in", stagger:0.04 }, 2.1);'''))

# 8. payment (host 54.7 -> 61.6, dur 6.9)
write('pay', scene('pay', '''    <div id="pay-c1" class="clip" data-start="0.05" data-duration="6.4"><span class="o">À Abidjan</span> : paiement à la livraison</div>
    <div id="pay-c2" class="clip" data-start="2.15" data-duration="4.3"><span class="t">Hors Abidjan</span> : paiement du téléphone et des<br>frais d'expédition <span class="t">avant expédition</span></div>''', '''
    #pay-c1, #pay-c2 { position:absolute; left:0; right:0; margin:auto; width:max-content; font-weight:800; font-size:50px; padding:20px 44px; border-radius:20px; background:rgba(11,15,20,.72); border:3px solid rgba(255,255,255,.22); text-align:center; line-height:1.25; }
    #pay-c1 { top:56px; } #pay-c2 { top:164px; }''', '''
    tl.fromTo("#pay-c1", { opacity:0, y:-60, filter:"blur(12px)" }, { opacity:1, y:0, filter:"blur(0px)", duration:0.5, ease:"expo.out" }, 0.05);
    tl.fromTo("#pay-c2", { opacity:0, y:-60, filter:"blur(12px)" }, { opacity:1, y:0, filter:"blur(0px)", duration:0.5, ease:"expo.out" }, 2.15);
    tl.to(["#pay-c1","#pay-c2"], { opacity:0, y:-40, filter:"blur(10px)", duration:0.25, ease:"power3.in", stagger:0.05 }, 6.25);'''))

# 9. end (host 61.6 -> 68.5, dur 6.9)
write('end', scene('end', '''    <img id="end-logo" class="clip" data-start="0.1" data-duration="6.8" src="assets/brand/logo_bg_market.png" alt="BG-MARKET, Technologie pour tous" />
    <div id="end-shine" class="clip" data-start="0.7" data-duration="1.4"></div>
    <div id="end-cta" class="clip" data-start="1.35" data-duration="5.5">Contactez-nous pour commander</div>''', '''
    #end-logo { position:absolute; left:560px; top:70px; width:800px; height:auto; }
    #end-shine { position:absolute; left:560px; top:70px; width:800px; height:267px; overflow:hidden; mix-blend-mode:screen; }
    #end-shine::before { content:""; position:absolute; top:-40px; left:-300px; width:160px; height:360px; background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.85),rgba(255,255,255,0)); transform:skewX(-20deg); transform:skewX(-20deg); }
    #end-cta { position:absolute; left:0; right:0; top:900px; text-align:center; font-weight:900; font-size:76px; letter-spacing:-0.02em; white-space:nowrap; }
    #end-cta::after { content:""; position:absolute; left:50%; margin-left:-340px; width:680px; bottom:-18px; height:8px; background:linear-gradient(90deg,#00D4C8,#FF6208); transform-origin:left; transform:scaleX(var(--ul,0)); }
    #end-cta { --ul:0; }''', '''
    tl.fromTo("#end-logo", { opacity:0, scale:0.8, filter:"blur(18px)" }, { opacity:1, scale:1, filter:"blur(0px)", duration:0.7, ease:"expo.out" }, 0.1);
    tl.fromTo("#end-shine", { opacity:1 }, { opacity:1, duration:0.01 }, 0.7);
    tl.fromTo("#end-cta", { opacity:0, y:40, filter:"blur(12px)" }, { opacity:1, y:0, filter:"blur(0px)", duration:0.5, ease:"expo.out" }, 1.35);
    tl.to("#end-cta", { "--ul":1, duration:0.6, ease:"power3.inOut" }, 1.85);
    tl.to("#end-logo", { opacity:0, duration:0.4, ease:"power2.in" }, 6.4);
    tl.to("#end-cta", { opacity:0, duration:0.4, ease:"power2.in" }, 6.4);'''))

# 10. brand watermark (host 0.8 -> 61.4)
write('brand', scene('brand', '''    <img id="brand-logo" class="clip" data-start="0.2" data-duration="60.2" src="assets/brand/logo_bg_market.png" alt="BG-MARKET" />''', '''
    #brand-logo { position:absolute; left:64px; top:40px; width:250px; height:auto; }''', '''
    tl.fromTo("#brand-logo", { opacity:0 }, { opacity:0.95, duration:0.5, ease:"power2.out" }, 0.2);
    tl.to("#brand-logo", { opacity:0, duration:0.3, ease:"power2.in" }, 59.9);'''))

# 11. fx light streaks on cuts
times = [4.9, 10.8, 14.2, 19.4, 22.7, 27.0, 40.4, 46.7, 52.3, 54.9, 61.6]
streaks = ''.join(f'<div id="fx-s{i}" class="clip fxs" data-start="{r(t-0.35)}" data-duration="0.95"><i></i></div>' for i, t in enumerate(times))
js = ''.join(f'''
    tl.fromTo("#fx-s{i} i", {{ x:-2400, skewX:-24, opacity:0 }}, {{ x:2400, skewX:-24, opacity:1, duration:0.7, ease:"power2.inOut" }}, {r(t-0.35)});
    tl.to("#fx-s{i} i", {{ opacity:0, duration:0.2 }}, {r(t+0.41)});''' for i, t in enumerate(times))
write('fx', scene('fx', streaks, '''
    .fxs { position:absolute; inset:0; overflow:hidden; mix-blend-mode:screen; }
    .fxs i { position:absolute; left:50%; top:-300px; width:420px; height:1700px; margin-left:-210px; background:linear-gradient(90deg,rgba(0,212,200,0),rgba(190,255,250,.55) 45%,rgba(255,255,255,.9) 50%,rgba(255,150,80,.5) 56%,rgba(255,98,8,0)); filter:blur(14px); }''', js))

# phone-contour portal transitions (outline of the phone expands out of its silhouette)
cts = [10.8, 19.4, 27.0, 40.35]
body = ''.join(f'<div id="ct{i}" class="clip ct" data-start="{r(t-0.1)}" data-duration="1.1"><svg viewBox="0 0 400 860" width="400" height="860"><rect x="6" y="6" width="388" height="848" rx="60" ry="60" fill="none" stroke="#00D4C8" stroke-width="6" vector-effect="non-scaling-stroke"/><rect x="6" y="6" width="388" height="848" rx="60" ry="60" fill="none" stroke="#FF6208" stroke-width="3" vector-effect="non-scaling-stroke" opacity=".8" transform="translate(0 0)"/><path d="M130 6 Q130 52 160 52 L240 52 Q270 52 270 6" fill="none" stroke="#fff" stroke-width="4" vector-effect="non-scaling-stroke"/></svg></div>' for i, t in enumerate(cts))
js = ''.join(f'''
    tl.fromTo("#ct{i} svg", {{ scale:0.82, transformOrigin:"50% 50%" }}, {{ scale:5.5, duration:0.95, ease:"power3.in" }}, {r(t-0.1)});
    tl.fromTo("#ct{i} svg", {{ opacity:0 }}, {{ opacity:1, duration:0.12, ease:"none" }}, {r(t-0.1)});
    tl.to("#ct{i} svg", {{ opacity:0, duration:0.25, ease:"power2.out" }}, {r(t+0.7)});''' for i, t in enumerate(cts))
write('contour', scene('contour', body, '''
    .ct { position:absolute; inset:0; }
    .ct svg { position:absolute; left:760px; top:110px; filter:drop-shadow(0 0 14px rgba(0,212,200,.9)); }''', js))
print('overlays written')
