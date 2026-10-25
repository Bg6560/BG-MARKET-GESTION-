# Vertical (1080x1920) typographic overlays. Times are film seconds (same cut as the 16:9 film).
import re, os
OUT = os.path.join(os.path.dirname(__file__), '..', 'compositions')
BASE = '''* { margin:0; padding:0; box-sizing:border-box; }
    #root { position:absolute; inset:0; overflow:hidden; font-family:"Montserrat",sans-serif; color:#fff; }
    #root .t { color:#00D4C8; } #root .o { color:#FF6208; }
    #root .w { display:inline-block; white-space:pre; }
    #root .plate { background:rgba(11,15,20,.66); border:2px solid rgba(255,255,255,.14); border-radius:24px; }
    #root .c { position:absolute; left:0; right:0; margin:auto; width:max-content; max-width:1000px; text-align:center; white-space:nowrap; }'''
def scene(id, body, css, js):
    return f'''<template>
  <style>
    {BASE}
    {css}
  </style>
  <div id="root" data-composition-id="{id}" data-width="1080" data-height="1920">
{body}
  </div>
  <script>
    const tl = gsap.timeline({{ paused: true }});
{js}
    window.__timelines["{id}"] = tl;
  </script>
</template>
'''
def write(name, s): open(os.path.join(OUT, name + '.html'), 'w').write(s)
def r(x): return round(x, 2)

def caption(id, text, top, size, t_in, t_out, color='#fff', plate=True):
    return dict(id=id, text=text, top=top, size=size, t_in=t_in, t_out=t_out, color=color, plate=plate)
def captions_scene(id, items):
    body = css = js = ''
    for c in items:
        words = ''.join(f'<span class="w">{w} </span>' for w in re.findall(r'<span[^>]*>.*?</span>|[^\s<]+', c['text']))
        body += f'    <div id="{id}-{c["id"]}" class="clip c{" plate" if c["plate"] else ""}" data-start="{c["t_in"]}" data-duration="{r(c["t_out"]-c["t_in"])}">{words}</div>\n'
        pad = 'padding:16px 34px;' if c['plate'] else ''
        css += f'    #{id}-{c["id"]} {{ top:{c["top"]}px; font-weight:900; font-size:{c["size"]}px; letter-spacing:-0.02em; color:{c["color"]}; {pad} }}\n'
        js += f'    tl.fromTo("#{id}-{c["id"]} .w", {{ opacity:0, filter:"blur(10px)", y:22 }}, {{ opacity:1, filter:"blur(0px)", y:0, duration:0.3, ease:"expo.out", stagger:0.07 }}, {c["t_in"]});\n'
        js += f'    tl.to("#{id}-{c["id"]}", {{ opacity:0, y:-40, filter:"blur(10px)", duration:0.22, ease:"power3.in" }}, {r(c["t_out"]-0.24)});\n'
    write(id, scene(id, body, css, js))

# 1. hook (host 0 -> 5.0)
write('hook', scene('hook', '''    <div id="hook-l1" class="clip c" data-start="0" data-duration="4.8"><span class="w">LE </span><span class="w">HUAWEI </span><span class="w t">MATE </span><span class="w t">30 </span><span class="w t">PRO </span><span class="w">EN</span></div>
    <div id="hook-l2" class="clip c" data-start="0" data-duration="4.8"><span class="w" id="hook-promo">PROMO </span><span class="w" id="hook-bang">!</span></div>
    <div id="hook-l3" class="clip c" data-start="0" data-duration="4.8">CHEZ <span class="o">BG-MARKET</span></div>''', '''
    #hook-l1 { top:200px; font-weight:800; font-size:56px; letter-spacing:-0.01em; }
    #hook-l2 { top:262px; font-weight:900; font-size:228px; color:#FF6208; letter-spacing:-0.035em; line-height:1; }
    #hook-l3 { top:520px; font-weight:800; font-size:62px; }''', '''
    tl.fromTo("#hook-l1 .w", { opacity:0, filter:"blur(8px)" }, { opacity:1, filter:"blur(0px)", duration:0.2, ease:"power4.out", stagger:0.13 }, 1.2);
    tl.fromTo("#hook-promo", { opacity:0, filter:"blur(26px)", x:-160 }, { opacity:1, filter:"blur(0px)", x:0, duration:0.6, ease:"expo.out" }, 2.85);
    tl.fromTo("#hook-bang", { opacity:0, scale:2.4, filter:"blur(10px)", transformOrigin:"50% 60%" }, { opacity:1, scale:1, filter:"blur(0px)", duration:0.35, ease:"back.out(1.6)" }, 3.3);
    tl.fromTo("#hook-l3", { opacity:0, y:40 }, { opacity:1, y:0, duration:0.5, ease:"expo.out" }, 3.8);
    tl.to(["#hook-l1","#hook-l2","#hook-l3"], { opacity:0, y:-120, filter:"blur(16px)", duration:0.28, ease:"power3.in", stagger:0.04 }, 4.55);'''))

# 2. colours (host 5.0 -> 10.9)
names = [('SPACE SILVER', 6.45, 7.62, '#C3C4E2'), ('NOIR', 7.62, 8.38, '#FFFFFF'), ('EMERALD GREEN', 8.38, 9.4, '#1FE0CF'), ('COSMIC PURPLE', 9.42, 10.75, '#C77DFF')]
body = '    <div id="col-h" class="clip c" data-start="0.1" data-duration="5.7">4 COLORIS <span class="t">OFFICIELS</span></div>\n'
css = '    #col-h { top:190px; font-weight:900; font-size:60px; letter-spacing:-0.02em; }\n'
js = '    tl.fromTo("#col-h", { opacity:0, filter:"blur(10px)" }, { opacity:1, filter:"blur(0px)", duration:0.4, ease:"power4.out" }, 0.1);\n    tl.to("#col-h", { opacity:0, filter:"blur(10px)", duration:0.25 }, 5.5);\n'
for i, (n, a, b, c) in enumerate(names):
    body += f'    <div id="col-n{i}" class="clip c" data-start="{r(a-5.0)}" data-duration="{r(b-a)}">{n}</div>\n'
    css += f'    #col-n{i} {{ top:1600px; font-weight:900; font-size:118px; letter-spacing:-0.03em; color:{c}; text-shadow:0 6px 30px rgba(0,0,0,.6); }}\n'
    js += f'    tl.fromTo("#col-n{i}", {{ opacity:0, y:60, filter:"blur(16px)" }}, {{ opacity:1, y:0, filter:"blur(0px)", duration:0.4, ease:"expo.out" }}, {r(a-5.0)});\n    tl.to("#col-n{i}", {{ opacity:0, y:-40, filter:"blur(12px)", duration:0.2, ease:"power3.in" }}, {r(b-5.0-0.22)});\n'
write('colors', scene('colors', body, css, js))

captions_scene('feat1', [caption('a', 'ÉCRAN <span class="t">OLED</span> INCURVÉ', 1600, 58, 0.2, 1.9), caption('b', 'BORDS ULTRA-FINS', 1600, 62, 1.95, 3.2, color='#00D4C8')])
captions_scene('feat2', [caption('a', 'MODULE PHOTO <span class="o">CIRCULAIRE</span>', 1600, 54, 0.1, 1.55), caption('b', 'SIGNÉ <span class="o">LEICA</span>', 1600, 66, 1.6, 2.7)])
write('feat3', scene('feat3', '''    <div id="feat3-n" class="clip c plate" data-start="0.05" data-duration="2.3"><span id="feat3-num" class="t">1</span> <span>CAMÉRAS</span></div>
    <div id="feat3-s" class="clip c plate" data-start="1.35" data-duration="1.0">POUR TOUT CAPTURER</div>''', '''
    #feat3-n { top:1560px; font-weight:900; font-size:86px; padding:14px 38px; }
    #feat3-s { top:1700px; font-weight:800; font-size:44px; padding:10px 28px; }''', '''
    tl.fromTo("#feat3-n", { opacity:0, y:40, filter:"blur(10px)" }, { opacity:1, y:0, filter:"blur(0px)", duration:0.4, ease:"expo.out" }, 0.05);
    ["2","3","4"].forEach((n, i) => { tl.set("#feat3-num", { textContent:n }, 0.42 + i * 0.32); });
    tl.set("#feat3-num", { textContent:"1" }, 0.05);
    tl.fromTo("#feat3-s", { opacity:0, y:30, filter:"blur(10px)" }, { opacity:1, y:0, filter:"blur(0px)", duration:0.4, ease:"expo.out" }, 1.4);
    tl.to(["#feat3-n","#feat3-s"], { opacity:0, y:-40, filter:"blur(10px)", duration:0.22, ease:"power3.in" }, 2.1);'''))
captions_scene('feat4', [caption('a', 'DÉVERROUILLAGE <span class="t">FACIAL 3D</span>', 1620, 50, 0.1, 1.85), caption('b', 'OU PAR <span class="o">EMPREINTE</span> SOUS L\'ÉCRAN', 1620, 46, 1.85, 3.3)])
captions_scene('feat5', [caption('a', 'PAS DE BOUTON DE VOLUME', 180, 54, 0.1, 1.15), caption('b', 'TOUCHEZ <span class="t">DEUX FOIS</span> LE BORD<br>DE L\'ÉCRAN', 180, 50, 1.2, 2.9), caption('c', 'PUIS <span class="o">FAITES GLISSER</span>', 180, 62, 2.9, 4.15)])
# tour
tour = [('INTERFACE <span class="t">EMUI</span>', 26.9, 27.45), ("ÉCRAN D'ACCUEIL", 27.5, 29.45), ('MENU PRINCIPAL', 29.55, 30.5), ('PARAMÈTRES', 30.6, 31.4), ('INFORMATIONS TÉLÉPHONE', 31.5, 32.3), ('APPAREIL PHOTO', 32.4, 35.1),
        ('GALERIE', 35.25, 36.2), ('MUSIQUE', 36.3, 37.0), ('VIDÉO', 37.1, 37.85), ('THÈMES', 37.95, 38.7), ('GESTIONNAIRE DU TÉLÉPHONE', 38.8, 40.3)]
captions_scene('tour', [caption(f't{i}', txt, 170, 50 if i != 10 else 44, r(a - 26.8), r(b - 26.8)) for i, (txt, a, b) in enumerate(tour)])

def offer(id, ver, ram1, ram2, old, new, eco, acc, dur, t_new, t_old, t_eco, cnt):
    write(id, scene(id, f'''    <div id="{id}-tag" class="clip c" data-start="0.4" data-duration="{r(dur-0.7)}">{ver}</div>
    <div id="{id}-r1" class="clip c" data-start="0.7" data-duration="{r(dur-1.0)}">{ram1}</div>
    <div id="{id}-r2" class="clip c" data-start="1.1" data-duration="{r(dur-1.35)}">{ram2}</div>
    <div id="{id}-new" class="clip c" data-start="{t_new}" data-duration="{r(dur-t_new-0.25)}"><span id="{id}-num">{new}</span><small> FCFA</small></div>
    <div id="{id}-old" class="clip c" data-start="{t_old}" data-duration="{r(dur-t_old-0.25)}"><span>{old} FCFA</span><i id="{id}-strike"></i></div>
    <div id="{id}-eco" class="clip c" data-start="{t_eco}" data-duration="{r(dur-t_eco-0.25)}">Économie : {eco} FCFA</div>''', f'''
    #{id}-tag {{ top:150px; font-weight:800; font-size:34px; letter-spacing:.2em; padding:12px 30px; border:3px solid {acc}; color:{acc}; border-radius:40px; }}
    #{id}-r1 {{ top:225px; font-weight:900; font-size:112px; letter-spacing:-0.03em; line-height:1; }}
    #{id}-r2 {{ top:342px; font-weight:900; font-size:112px; letter-spacing:-0.03em; line-height:1; color:{acc}; }}
    #{id}-new {{ top:1390px; font-weight:900; font-size:176px; letter-spacing:-0.045em; line-height:1; color:{acc}; text-shadow:0 8px 40px rgba(0,0,0,.55); }}
    #{id}-new small {{ font-size:58px; letter-spacing:0; color:#fff; font-weight:800; }}
    #{id}-old {{ top:1590px; font-weight:700; font-size:62px; color:#9aa4ad; }}
    #{id}-old span {{ position:relative; }}
    #{id}-strike {{ position:absolute; left:-8px; top:50%; height:6px; width:calc(100% + 16px); background:#FF6208; transform-origin:left center; }}
    #{id}-eco {{ top:1675px; font-weight:800; font-size:44px; padding:14px 32px; background:{acc}; color:#0B0F14; border-radius:16px; }}''', f'''
    tl.fromTo("#{id}-tag", {{ opacity:0, filter:"blur(8px)" }}, {{ opacity:1, filter:"blur(0px)", duration:0.25, ease:"power4.out" }}, 0.4);
    tl.fromTo("#{id}-r1", {{ opacity:0, filter:"blur(14px)", y:-60 }}, {{ opacity:1, filter:"blur(0px)", y:0, duration:0.5, ease:"expo.out" }}, 0.7);
    tl.fromTo("#{id}-r2", {{ opacity:0, filter:"blur(14px)", y:-60 }}, {{ opacity:1, filter:"blur(0px)", y:0, duration:0.5, ease:"expo.out" }}, 1.1);
    tl.fromTo("#{id}-new", {{ opacity:0, scale:1.25, filter:"blur(22px)", transformOrigin:"50% 60%" }}, {{ opacity:1, scale:1, filter:"blur(0px)", duration:0.55, ease:"expo.out" }}, {t_new});
    const c = {{ v:0 }}; tl.to(c, {{ v:{cnt}, duration:0.9, ease:"power3.out", onUpdate:()=>{{ document.getElementById("{id}-num").textContent = Math.round(c.v).toString().replace(/\\B(?=(\\d{{3}})+(?!\\d))/g," "); }} }}, {t_new});
    tl.fromTo("#{id}-old", {{ opacity:0, y:20 }}, {{ opacity:1, y:0, duration:0.3, ease:"power3.out" }}, {t_old});
    tl.fromTo("#{id}-strike", {{ scaleX:0 }}, {{ scaleX:1, duration:0.35, ease:"power3.inOut" }}, {r(t_old+0.45)});
    tl.fromTo("#{id}-eco", {{ opacity:0, clipPath:"inset(0 100% 0 0)" }}, {{ opacity:1, clipPath:"inset(0 0% 0 0)", duration:0.4, ease:"power3.out" }}, {t_eco});
    tl.to(["#{id}-tag","#{id}-r1","#{id}-r2","#{id}-new","#{id}-old","#{id}-eco"], {{ opacity:0, y:-60, filter:"blur(14px)", duration:0.24, ease:"power3.in", stagger:0.03 }}, {r(dur-0.42)});'''))
offer('offer1', 'VERSION 1', '8 Go RAM', '+ 256 Go', '175 000', '160 000', '15 000', '#00D4C8', 6.3, 2.3, 3.3, 4.1, 160000)
offer('offer2', 'VERSION 2', '8 Go RAM', '+ 128 Go', '155 000', '140 000', '15 000', '#FF6208', 5.6, 2.0, 3.0, 3.8, 140000)

write('sealed', scene('sealed', '''    <div id="sealed-a" class="clip c" data-start="0.1" data-duration="2.1">NEUF SCELLÉ</div>
    <div id="sealed-b" class="clip c" data-start="1.25" data-duration="1.0">GARANTIE : <span class="o">3 MOIS</span></div>''', '''
    #sealed-a { top:200px; font-weight:900; font-size:128px; letter-spacing:-0.03em; color:#00D4C8; text-shadow:0 6px 40px rgba(0,0,0,.6); }
    #sealed-b { top:362px; font-weight:900; font-size:92px; letter-spacing:-0.03em; text-shadow:0 6px 40px rgba(0,0,0,.6); }''', '''
    tl.fromTo("#sealed-a", { opacity:0, y:-80, filter:"blur(22px)" }, { opacity:1, y:0, filter:"blur(0px)", duration:0.55, ease:"expo.out" }, 0.1);
    tl.fromTo("#sealed-b", { opacity:0, y:-80, filter:"blur(22px)" }, { opacity:1, y:0, filter:"blur(0px)", duration:0.55, ease:"expo.out" }, 1.25);
    tl.to(["#sealed-a","#sealed-b"], { opacity:0, y:-100, filter:"blur(14px)", duration:0.24, ease:"power3.in", stagger:0.04 }, 2.1);'''))

write('pay', scene('pay', '''    <div id="pay-c1" class="clip c plate" data-start="0.05" data-duration="6.2"><span class="o">À ABIDJAN</span> : PAIEMENT À LA LIVRAISON.</div>
    <div id="pay-c2" class="clip c plate" data-start="2.15" data-duration="4.1"><span class="t">HORS ABIDJAN</span> : PAIEMENT DU TÉLÉPHONE<br>ET DES FRAIS D'EXPÉDITION<br><span class="t">AVANT EXPÉDITION</span>.</div>''', '''
    #pay-c1, #pay-c2 { font-weight:800; font-size:42px; padding:22px 40px; line-height:1.3; letter-spacing:.01em; }
    #pay-c1 { top:170px; } #pay-c2 { top:310px; }''', '''
    tl.fromTo("#pay-c1", { opacity:0, y:-60, filter:"blur(12px)" }, { opacity:1, y:0, filter:"blur(0px)", duration:0.5, ease:"expo.out" }, 0.05);
    tl.fromTo("#pay-c2", { opacity:0, y:-60, filter:"blur(12px)" }, { opacity:1, y:0, filter:"blur(0px)", duration:0.5, ease:"expo.out" }, 2.15);
    tl.to(["#pay-c1","#pay-c2"], { opacity:0, y:-40, filter:"blur(10px)", duration:0.25, ease:"power3.in", stagger:0.05 }, 6.0);'''))

WA = '<svg id="end-wa" viewBox="0 0 64 64" width="64" height="64"><circle cx="32" cy="32" r="30" fill="#25D366"/><path d="M32 13.5c-10.2 0-18.5 8.2-18.5 18.4 0 3.3.9 6.4 2.5 9.1L13.6 50.5l9.7-2.5c2.6 1.4 5.5 2.2 8.6 2.2 10.2 0 18.5-8.2 18.5-18.4S42.200 13.5 32 13.5z" fill="none" stroke="#fff" stroke-width="3.2" stroke-linejoin="round"/><path d="M25.800 22.500c-.5-1-1-1-1.500-1h-1.300c-.5 0-1.200.2-1.800.9-.6.700-2.400 2.300-2.400 5.600s2.400 6.500 2.800 6.900c.3.400 4.700 7.300 11.500 9.900 5.700 2.200 6.800 1.800 8 1.700 1.200-.1 3.900-1.600 4.400-3.100.5-1.500.5-2.800.4-3.100-.2-.3-.6-.5-1.300-.9s-3.900-1.900-4.500-2.100-1-.3-1.500.3c-.4.700-1.700 2.100-2.100 2.500-.4.400-.8.500-1.500.2-.7-.3-2.800-1-5.400-3.300-2-1.800-3.300-4-3.700-4.700-.4-.700 0-1.100.3-1.400.3-.3.700-.8 1-1.200.3-.4.400-.7.700-1.100.2-.5.100-.9-.1-1.200s-1.500-3.600-2-4.900z" fill="#fff"/></svg>'
write('end', scene('end', f'''    <div id="end-scrim" class="clip" data-start="0" data-duration="9.5"></div>
    <video id="end-anim" class="clip" data-start="0" data-duration="6.0" src="assets/brand/logo_anim.webm" muted playsinline></video>
    <img id="end-logo" class="clip" data-start="5.95" data-duration="3.55" src="assets/brand/logo_final.png" alt="BG-MARKET, Technologie pour tous" />
    <div id="end-cta" class="clip c" data-start="1.9" data-duration="7.4">Contactez-nous pour commander</div>
    <div id="end-tel" class="clip c" data-start="2.9" data-duration="6.4">{WA}<span class="t">07</span> 15 78 69 75</div>''', '''
    #end-scrim { position:absolute; inset:0; background:rgba(11,15,20,0.62); }
    #end-anim, #end-logo { position:absolute; left:0; top:60px; width:1080px; height:608px; }
    #end-cta { top:1690px; font-weight:800; font-size:50px; letter-spacing:-0.02em; }
    #end-cta::after { content:""; position:absolute; left:50%; margin-left:-280px; width:560px; bottom:-12px; height:6px; background:linear-gradient(90deg,#00D4C8,#FF6208); transform-origin:left; transform:scaleX(var(--ul,0)); }
    #end-cta { --ul:0; }
    #end-tel { top:1760px; font-weight:900; font-size:84px; letter-spacing:.02em; text-shadow:0 6px 40px rgba(0,0,0,.6); display:flex; align-items:center; justify-content:center; gap:22px; }
    #end-wa { filter:drop-shadow(0 4px 16px rgba(0,0,0,.5)); }''', '''
    tl.fromTo("#end-scrim", { opacity:0 }, { opacity:1, duration:0.5, ease:"power2.out" }, 0);
    tl.to("#end-scrim", { opacity:0.18, duration:0.9, ease:"power2.inOut" }, 4.6);
    tl.fromTo("#end-cta", { opacity:0, y:40, filter:"blur(12px)" }, { opacity:1, y:0, filter:"blur(0px)", duration:0.5, ease:"expo.out" }, 1.9);
    tl.to("#end-cta", { "--ul":1, duration:0.6, ease:"power3.inOut" }, 2.4);
    tl.fromTo("#end-tel", { opacity:0, scale:0.9, filter:"blur(14px)", transformOrigin:"50% 50%" }, { opacity:1, scale:1, filter:"blur(0px)", duration:0.55, ease:"expo.out" }, 2.9);
    tl.to(["#end-cta","#end-tel","#end-logo","#end-scrim"], { opacity:0, duration:0.45, ease:"power2.in" }, 9.0);'''))

write('brand', scene('brand', '''    <img id="brand-logo" class="clip" data-start="0.2" data-duration="60.2" src="assets/brand/logo_bg_market.png" alt="BG-MARKET" />''', '''
    #brand-logo { position:absolute; left:50px; top:66px; width:220px; height:auto; }''', '''
    tl.fromTo("#brand-logo", { opacity:0 }, { opacity:0.95, duration:0.5, ease:"power2.out" }, 0.2);
    tl.to("#brand-logo", { opacity:0, duration:0.3, ease:"power2.in" }, 59.9);'''))

times = [4.9, 10.8, 14.2, 19.4, 22.7, 27.0, 40.4, 46.7, 52.3, 54.9, 61.0]
streaks = ''.join(f'<div id="fx-s{i}" class="clip fxs" data-start="{r(t-0.35)}" data-duration="0.95"><i></i></div>' for i, t in enumerate(times))
js = ''.join(f'''
    tl.fromTo("#fx-s{i} i", {{ x:-1500, skewX:-24, opacity:0 }}, {{ x:1500, skewX:-24, opacity:1, duration:0.7, ease:"power2.inOut" }}, {r(t-0.35)});
    tl.to("#fx-s{i} i", {{ opacity:0, duration:0.2 }}, {r(t+0.41)});''' for i, t in enumerate(times))
write('fx', scene('fx', streaks, '''
    .fxs { position:absolute; inset:0; overflow:hidden; mix-blend-mode:screen; }
    .fxs i { position:absolute; left:50%; top:-300px; width:380px; height:2600px; margin-left:-190px; background:linear-gradient(90deg,rgba(0,212,200,0),rgba(190,255,250,.55) 45%,rgba(255,255,255,.9) 50%,rgba(255,150,80,.5) 56%,rgba(255,98,8,0)); filter:blur(14px); }''', js))

cts = [10.8, 19.4, 27.0, 40.35]
body = ''.join(f'<div id="ct{i}" class="clip ct" data-start="{r(t-0.1)}" data-duration="1.1"><svg viewBox="0 0 400 860" width="400" height="860"><rect x="6" y="6" width="388" height="848" rx="60" ry="60" fill="none" stroke="#00D4C8" stroke-width="6" vector-effect="non-scaling-stroke"/><rect x="6" y="6" width="388" height="848" rx="60" ry="60" fill="none" stroke="#FF6208" stroke-width="3" vector-effect="non-scaling-stroke" opacity=".8"/><path d="M130 6 Q130 52 160 52 L240 52 Q270 52 270 6" fill="none" stroke="#fff" stroke-width="4" vector-effect="non-scaling-stroke"/></svg></div>' for i, t in enumerate(cts))
js = ''.join(f'''
    tl.fromTo("#ct{i} svg", {{ scale:0.9, transformOrigin:"50% 50%" }}, {{ scale:6, duration:0.95, ease:"power3.in" }}, {r(t-0.1)});
    tl.fromTo("#ct{i} svg", {{ opacity:0 }}, {{ opacity:1, duration:0.12, ease:"none" }}, {r(t-0.1)});
    tl.to("#ct{i} svg", {{ opacity:0, duration:0.25, ease:"power2.out" }}, {r(t+0.7)});''' for i, t in enumerate(cts))
write('contour', scene('contour', body, '''
    .ct { position:absolute; inset:0; }
    .ct svg { position:absolute; left:340px; top:530px; filter:drop-shadow(0 0 14px rgba(0,212,200,.9)); }''', js))
print('vertical overlays written')
