# Simulated "photo" illustrations drawn in SVG: the Galaxy A16 and the four trades (no image generation needed).


def _phone_front(x, y, w, h, rot):
    return f'''<g transform="rotate({rot} {x + w / 2} {y + h / 2})">
  <rect x="{x + 6}" y="{y + 14}" width="{w}" height="{h}" rx="34" fill="#0B1F33" opacity=".28" filter="url(#a16blur)"/>
  <rect x="{x}" y="{y}" width="{w}" height="{h}" rx="34" fill="url(#a16frame)"/>
  <rect x="{x + 7}" y="{y + 7}" width="{w - 14}" height="{h - 14}" rx="28" fill="#05080D"/>
  <rect x="{x + 11}" y="{y + 11}" width="{w - 22}" height="{h - 22}" rx="25" fill="url(#a16wall)"/>
  <path d="M{x + 11} {y + h * .62} C {x + w * .35} {y + h * .52}, {x + w * .7} {y + h * .74}, {x + w - 11} {y + h * .6} L {x + w - 11} {y + h - 36} Q {x + w - 11} {y + h - 11} {x + w - 36} {y + h - 11} L {x + 36} {y + h - 11} Q {x + 11} {y + h - 11} {x + 11} {y + h - 36} Z" fill="#00D4C8" opacity=".35"/>
  <path d="M{x + 11} {y + h * .72} C {x + w * .4} {y + h * .64}, {x + w * .6} {y + h * .84}, {x + w - 11} {y + h * .7} L {x + w - 11} {y + h - 36} Q {x + w - 11} {y + h - 11} {x + w - 36} {y + h - 11} L {x + 36} {y + h - 11} Q {x + 11} {y + h - 11} {x + 11} {y + h - 36} Z" fill="#0B6FA8" opacity=".55"/>
  <circle cx="{x + w / 2}" cy="{y + 26}" r="6" fill="#05080D"/>
  <text x="{x + w / 2}" y="{y + h * .27}" text-anchor="middle" font-family="Montserrat" font-weight="700" font-size="{w * .24}" fill="#fff">21:00</text>
  <text x="{x + w / 2}" y="{y + h * .27 + 26}" text-anchor="middle" font-family="Montserrat" font-weight="600" font-size="14" fill="#CFEFF2">lundi 26 octobre</text>
  <rect x="{x + w / 2 - 40}" y="{y + h - 26}" width="80" height="5" rx="2.5" fill="#fff" opacity=".7"/>
  <path d="M{x + 11} {y + 40} L {x + w * .55} {y + 11} L {x + w * .8} {y + 11} L {x + 11} {y + h * .45} Z" fill="#fff" opacity=".08"/>
</g>'''


def _phone_back(x, y, w, h, rot):
    lens = ''
    for i in range(3):
        cy = y + 46 + i * 54
        lens += f'''<circle cx="{x + 46}" cy="{cy}" r="21" fill="#0A0D12" stroke="url(#a16ring)" stroke-width="4"/>
  <circle cx="{x + 46}" cy="{cy}" r="13" fill="url(#a16lens)"/>
  <circle cx="{x + 41}" cy="{cy - 5}" r="3.2" fill="#fff" opacity=".75"/>'''
    return f'''<g transform="rotate({rot} {x + w / 2} {y + h / 2})">
  <rect x="{x + 6}" y="{y + 14}" width="{w}" height="{h}" rx="34" fill="#0B1F33" opacity=".28" filter="url(#a16blur)"/>
  <rect x="{x}" y="{y}" width="{w}" height="{h}" rx="34" fill="url(#a16back)"/>
  <rect x="{x}" y="{y}" width="{w}" height="{h}" rx="34" fill="none" stroke="#7E8A9A" stroke-width="2" opacity=".6"/>
  <path d="M{x + w * .15} {y} L {x + w * .5} {y} L {x} {y + h * .55} L {x} {y + h * .2} Z" fill="#fff" opacity=".1"/>
  {lens}
  <circle cx="{x + 86}" cy="{y + 46}" r="6" fill="#E8E2C8" opacity=".9"/>
  <text x="{x + w / 2}" y="{y + h - 50}" text-anchor="middle" font-family="Montserrat" font-weight="700" font-size="15" letter-spacing="5" fill="#A9B4C2">SAMSUNG</text>
</g>'''


def a16_svg(w=330, h=460):
    return f'''<svg viewBox="0 0 330 460" width="{w}" height="{h}" xmlns="http://www.w3.org/2000/svg">
<defs>
  <filter id="a16blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="12"/></filter>
  <linearGradient id="a16back" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4B5567"/><stop offset=".45" stop-color="#1E2633"/><stop offset=".75" stop-color="#2E3847"/><stop offset="1" stop-color="#151B25"/></linearGradient>
  <linearGradient id="a16frame" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5C6778"/><stop offset=".5" stop-color="#262E3B"/><stop offset="1" stop-color="#5C6778"/></linearGradient>
  <linearGradient id="a16wall" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#0B2742"/><stop offset=".55" stop-color="#0E4A6B"/><stop offset="1" stop-color="#0A2236"/></linearGradient>
  <linearGradient id="a16ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#B8C2CE"/><stop offset="1" stop-color="#3A4452"/></linearGradient>
  <radialGradient id="a16lens" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#2B5C8A"/><stop offset=".45" stop-color="#0D1A2A"/><stop offset="1" stop-color="#020407"/></radialGradient>
</defs>
{_phone_back(14, 30, 190, 390, -9)}
{_phone_front(126, 44, 190, 390, 6)}
</svg>'''


_DEFS = '''<defs>
  <filter id="{p}b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
  <filter id="{p}s" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter>
  <linearGradient id="{p}v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient>
  {extra}
</defs>'''


def _wrap(p, inner, extra=''):
    return (f'<svg viewBox="0 0 500 400" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">'
            + _DEFS.format(p=p, extra=extra) + inner + f'<rect width="500" height="400" fill="url(#{p}v)"/></svg>')


def shop_phone():
    p = 'tb'
    extra = f'''<linearGradient id="{p}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4F1EA"/><stop offset="1" stop-color="#DCE6EA"/></linearGradient>
  <linearGradient id="{p}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".85"/><stop offset="1" stop-color="#BFD6DE" stop-opacity=".6"/></linearGradient>'''
    s = f'<rect width="500" height="400" fill="url(#{p}w)"/>'
    for i in range(5):
        s += f'<circle cx="{60 + i * 95}" cy="0" r="60" fill="#FFF6D8" opacity=".55" filter="url(#{p}b)"/>'
    cols = ['#0B1F33', '#2B3445', '#E9EEF3', '#1E3A5F', '#3A4352']
    scr = ['#00D4C8', '#0B6FA8', '#FF6208', '#2DBE60', '#1AA3E8']
    for k, yy in enumerate([60, 150]):
        s += f'<rect x="20" y="{yy + 72}" width="460" height="10" rx="3" fill="#B9C9D2"/><rect x="20" y="{yy + 82}" width="460" height="5" fill="#0B1F33" opacity=".12"/>'
        for i in range(10):
            x = 34 + i * 45
            s += (f'<rect x="{x}" y="{yy}" width="30" height="62" rx="6" fill="{cols[(i + k) % 5]}"/>'
                  f'<rect x="{x + 3}" y="{yy + 4}" width="24" height="54" rx="4" fill="{scr[(i * 2 + k) % 5]}" opacity=".9"/>'
                  f'<rect x="{x + 3}" y="{yy + 4}" width="12" height="54" rx="4" fill="#fff" opacity=".12"/>'
                  f'<rect x="{x + 4}" y="{yy + 66}" width="22" height="5" rx="2" fill="#FF6208"/>')
    s += (f'<rect x="0" y="262" width="500" height="138" fill="#E7EEF1"/>'
          f'<rect x="40" y="250" width="420" height="110" rx="10" fill="url(#{p}c)" stroke="#fff" stroke-width="2"/>'
          f'<rect x="40" y="342" width="420" height="8" fill="#00D4C8"/>')
    for i in range(6):
        s += f'<rect x="{64 + i * 66}" y="290" width="34" height="46" rx="6" fill="{cols[i % 5]}" opacity=".85"/><rect x="{67 + i * 66}" y="293" width="28" height="40" rx="4" fill="{scr[i % 5]}" opacity=".6"/>'
    s += f'<ellipse cx="250" cy="380" rx="220" ry="16" fill="#0B1F33" opacity=".12" filter="url(#{p}s)"/>'
    return _wrap(p, s, extra)


def pharmacy():
    p = 'tp'
    extra = f'''<linearGradient id="{p}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6FBFA"/><stop offset="1" stop-color="#DDEDEA"/></linearGradient>'''
    s = f'<rect width="500" height="400" fill="url(#{p}w)"/>'
    s += f'<circle cx="250" cy="70" r="70" fill="#2DBE60" opacity=".45" filter="url(#{p}b)"/>'
    s += ('<g transform="translate(250 70)"><rect x="-46" y="-46" width="92" height="92" rx="12" fill="#0E2A1E"/>'
          '<path d="M-12 -34 H12 V-12 H34 V12 H12 V34 H-12 V12 H-34 V-12 H-12 Z" fill="#3BE07A"/>'
          '<path d="M-12 -34 H12 V-12 H34 V12 H12 V34 H-12 V12 H-34 V-12 H-12 Z" fill="#fff" opacity=".25"/></g>')
    box = ['#FFFFFF', '#2DBE60', '#1AA3E8', '#F2F5F7', '#FF6208', '#BFE8D3', '#0B6FA8']
    for side, x0 in [('l', 10), ('r', 330)]:
        for k in range(4):
            yy = 140 + k * 52
            s += f'<rect x="{x0}" y="{yy + 40}" width="160" height="7" fill="#C9D9D6"/>'
            for i in range(7):
                hh = 26 + (i * 7 + k * 5) % 14
                s += f'<rect x="{x0 + 6 + i * 22}" y="{yy + 40 - hh}" width="18" height="{hh}" rx="2" fill="{box[(i + k + (x0 > 100)) % 7]}" stroke="#0B1F33" stroke-opacity=".08"/>'
    s += ('<rect x="180" y="150" width="140" height="160" rx="8" fill="#E9F3F1"/>'
          '<rect x="195" y="168" width="110" height="70" rx="6" fill="#CFE7E2"/>'
          '<rect x="0" y="318" width="500" height="82" fill="#FFFFFF"/>'
          '<rect x="0" y="318" width="500" height="10" fill="#2DBE60"/>'
          '<rect x="210" y="290" width="80" height="30" rx="4" fill="#0B1F33"/><rect x="216" y="295" width="68" height="18" rx="3" fill="#2DBE60" opacity=".7"/>')
    return _wrap(p, s, extra)


def restaurant():
    p = 'tr'
    extra = f'''<linearGradient id="{p}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A2A22"/><stop offset="1" stop-color="#5A4031"/></linearGradient>
  <linearGradient id="{p}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8A6446"/><stop offset="1" stop-color="#5E412C"/></linearGradient>
  <linearGradient id="{p}n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E2236"/><stop offset="1" stop-color="#1D4A6B"/></linearGradient>'''
    s = f'<rect width="500" height="400" fill="url(#{p}w)"/>'
    s += f'<rect x="300" y="40" width="170" height="170" rx="6" fill="url(#{p}n)" stroke="#2A1D16" stroke-width="8"/><line x1="385" y1="40" x2="385" y2="210" stroke="#2A1D16" stroke-width="6"/>'
    for i, (cx, cy) in enumerate([(330, 80), (420, 120), (360, 170)]):
        s += f'<circle cx="{cx}" cy="{cy}" r="3" fill="#FFE9B0"/>'
    for x in [90, 250, 410]:
        s += (f'<line x1="{x}" y1="0" x2="{x}" y2="70" stroke="#1B120D" stroke-width="2"/>'
              f'<circle cx="{x}" cy="95" r="70" fill="#FFC86A" opacity=".45" filter="url(#{p}b)"/>'
              f'<path d="M{x - 26} 90 Q {x} 60 {x + 26} 90 Z" fill="#E8A94A"/><ellipse cx="{x}" cy="92" rx="12" ry="5" fill="#FFF3C9"/>')
    s += f'<rect x="0" y="250" width="500" height="150" fill="url(#{p}f)"/>'
    for cx, cy, rx in [(120, 280, 95), (370, 300, 105)]:
        s += (f'<ellipse cx="{cx}" cy="{cy + 50}" rx="{rx * .8}" ry="12" fill="#000" opacity=".25" filter="url(#{p}s)"/>'
              f'<rect x="{cx - 6}" y="{cy}" width="12" height="55" fill="#2A1D16"/>'
              f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="26" fill="#F7F1E6"/><ellipse cx="{cx}" cy="{cy + 4}" rx="{rx}" ry="26" fill="#E6DCCB" opacity=".5"/>')
        for dx in [-45, 0, 45]:
            s += (f'<ellipse cx="{cx + dx}" cy="{cy - 2}" rx="17" ry="7" fill="#fff" stroke="#D9CDB8"/>'
                  f'<ellipse cx="{cx + dx}" cy="{cy - 3}" rx="9" ry="3.5" fill="#E07B2E" opacity=".85"/>')
        s += f'<rect x="{cx + 20}" y="{cy - 26}" width="8" height="18" rx="2" fill="#BFE6F0" opacity=".8"/>'
    for x in [30, 210, 270, 470]:
        s += f'<rect x="{x - 14}" y="245" width="28" height="70" rx="5" fill="#2A1D16" opacity=".9"/>'
    return _wrap(p, s, extra)


def supermarket():
    p = 'ts'
    extra = f'''<linearGradient id="{p}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4F7F9"/><stop offset="1" stop-color="#DCE5EA"/></linearGradient>
  <linearGradient id="{p}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E4EAEE"/><stop offset="1" stop-color="#B9C6CE"/></linearGradient>'''
    s = f'<rect width="500" height="400" fill="url(#{p}w)"/><path d="M0 400 L 210 210 L 290 210 L 500 400 Z" fill="url(#{p}f)"/>'
    for i in range(5):
        y = 20 + i * 30
        s += f'<rect x="{230 - (5 - i) * 30}" y="{y}" width="{40 + (5 - i) * 60}" height="6" rx="3" fill="#FFFFFF"/><rect x="{230 - (5 - i) * 30}" y="{y}" width="{40 + (5 - i) * 60}" height="6" rx="3" fill="#FFF7D6" opacity=".8" filter="url(#{p}s)"/>'
    prod = ['#FF6208', '#2DBE60', '#1AA3E8', '#E8C21A', '#E03A3A', '#FFFFFF', '#0B6FA8', '#00D4C8']
    for side in (0, 1):
        for k in range(5):
            ytop, ybot = 120 + k * 46, 120 + k * 46 + 38
            for i in range(9):
                t0, t1 = i / 9, (i + 1) / 9
                if side == 0:
                    xa, xb = 0 + t0 * 210, 0 + t1 * 210
                else:
                    xa, xb = 500 - t1 * 210, 500 - t0 * 210
                sc = 1 - (t0 if side == 0 else 1 - t1) * 0.55
                yy0 = 210 + (ytop - 210) * sc
                yy1 = 210 + (ybot - 210) * sc
                s += f'<rect x="{xa + 1:.1f}" y="{yy0:.1f}" width="{xb - xa - 2:.1f}" height="{yy1 - yy0:.1f}" rx="2" fill="{prod[(i + k * 3 + side) % 8]}" opacity=".9"/>'
            yl = 210 + (ybot + 3 - 210)
            if side == 0:
                s += f'<path d="M0 {yl} L 210 {210 + (ybot + 3 - 210) * .45} L 210 {210 + (ybot + 7 - 210) * .45} L 0 {yl + 6} Z" fill="#8A9BA8"/>'
            else:
                s += f'<path d="M500 {yl} L 290 {210 + (ybot + 3 - 210) * .45} L 290 {210 + (ybot + 7 - 210) * .45} L 500 {yl + 6} Z" fill="#8A9BA8"/>'
    s += ('<g transform="translate(300 300)" stroke="#2B3445" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round">'
          '<path d="M-20 0 L 0 0 L 18 62 L 110 62 L 126 14 L 6 14"/><path d="M20 30 H 118 M 28 46 H 112" stroke-width="3"/>'
          '<circle cx="30" cy="80" r="9" fill="#2B3445"/><circle cx="100" cy="80" r="9" fill="#2B3445"/></g>'
          '<rect x="335" y="292" width="26" height="22" rx="3" fill="#FF6208"/><rect x="366" y="286" width="20" height="28" rx="3" fill="#2DBE60"/><rect x="390" y="294" width="22" height="20" rx="3" fill="#1AA3E8"/>')
    return _wrap(p, s, extra)


TRADES = {'store': shop_phone, 'pill': pharmacy, 'utensils': restaurant, 'cart': supermarket}
