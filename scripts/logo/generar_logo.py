"""Genera el logotipo de «Girona en xifres» (SVG) a partir de la tipografía de la web.

Uso: python scripts/logo/generar_logo.py && node scripts/logo/rasteritzar.js
Requiere fonttools y brotli (solo para regenerar; los ficheros generados se versionan).
Escribe en web/: favicon.svg, logo.svg, logo-blanc.svg y scripts/logo/build/*.svg|html para rasterizar.
"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import glif

AQUI = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.join(AQUI, '..', '..', 'web')
BUILD = os.path.join(AQUI, 'build'); os.makedirs(BUILD, exist_ok=True)
RED, INK, W = '#e3001b', '#0f1113', '#ffffff'

def marca(escala=1.0):
    """Path de la G y rectángulo del punto, en un lienzo de 512 (escala<1 = margen para iconos 'maskable')."""
    size = 400 * escala
    x0, y0, x1, y1 = glif.bbox('G', size)
    gw, gh = x1 - x0, y1 - y0
    sq, gap = 74 * escala, 22 * escala
    total = gw + gap + sq
    left = 262 - total / 2            # ligeramente a la derecha: el punto pesa menos que la G
    base = 256 + gh / 2
    d, _ = glif.text('G', left - x0, base + y0, size)
    return d, (left + gw + gap, base - sq, sq)

def icona(escala=1.0, fons=INK, lletra=W):
    d, (x, y, sq) = marca(escala)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">'
            f'<rect width="512" height="512" fill="{fons}"/><path d="{d}" fill="{lletra}"/>'
            f'<rect x="{x:.1f}" y="{y:.1f}" width="{sq:.1f}" height="{sq:.1f}" fill="{RED}"/></svg>')

def logotip(text_color=INK, fons_icona=INK, lletra_icona=W):
    """Icono + «GIRONA EN XIFRES» en una línea (alto 120)."""
    h = 120
    d, (x, y, sq) = marca()
    s = h / 512
    td, tw = glif.text('GIRONA EN XIFRES', 0, 0, 100, track=0.01)
    _, ty0, _, ty1 = glif.bbox('GIRONA', 100)
    cap = ty1 - ty0
    ts = 72 / cap                      # mayúsculas de 72 de alto
    tx = h + 28; tyb = h / 2 + 72 / 2
    width = tx + tw * ts
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:.0f} {h}" role="img" aria-label="Girona en xifres">'
            f'<g transform="scale({s:.5f})"><rect width="512" height="512" fill="{fons_icona}"/><path d="{d}" fill="{lletra_icona}"/>'
            f'<rect x="{x:.1f}" y="{y:.1f}" width="{sq:.1f}" height="{sq:.1f}" fill="{RED}"/></g>'
            f'<g transform="translate({tx:.2f} {tyb:.2f}) scale({ts:.5f})"><path d="{td}" fill="{text_color}"/></g></svg>')

def escriu(ruta, s):
    with open(ruta, 'w', encoding='utf-8') as f: f.write(s)

escriu(os.path.join(WEB, 'favicon.svg'), icona())
escriu(os.path.join(WEB, 'logo.svg'), logotip())
escriu(os.path.join(WEB, 'logo-blanc.svg'), logotip(text_color=W, fons_icona=W, lletra_icona=INK))
escriu(os.path.join(BUILD, 'icona.svg'), icona())
escriu(os.path.join(BUILD, 'icona-maskable.svg'), icona(escala=0.72))
# Marca para la cabecera: colores por variables CSS, se adapta al tema oscuro
d, (x, y, sq) = marca()
escriu(os.path.join(BUILD, 'marca-inline.svg'),
       f'<svg class="marca-icona" viewBox="0 0 512 512" aria-hidden="true"><rect width="512" height="512" class="mi-f"/>'
       f'<path class="mi-g" d="{d}"/><rect class="mi-p" x="{x:.1f}" y="{y:.1f}" width="{sq:.1f}" height="{sq:.1f}"/></svg>')
print('ok')
