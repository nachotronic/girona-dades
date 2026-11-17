"""Genera el logotipo de «Girona en xifres» (SVG) a partir de la tipografía de la web.

Uso: python scripts/logo/generar_logo.py && node scripts/logo/rasteritzar.js
Requiere fonttools y brotli (solo para regenerar; los ficheros generados se versionan).
Logotipo: tres barras crecientes, la última roja.
Escribe en web/: favicon.svg, logo.svg, logo-blanc.svg y scripts/logo/build/*.svg|html para rasterizar.
"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import glif

AQUI = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.join(AQUI, '..', '..', 'web')
BUILD = os.path.join(AQUI, 'build'); os.makedirs(BUILD, exist_ok=True)
RED, INK, W = '#e3001b', '#0f1113', '#ffffff'

BARRES = [(96, 150), (208, 230), (320, 320)]   # (x, alto) en un lienzo de 512; ancho 96, base 416

def barres(escala=1.0, clases=None, colors=(W, W, RED)):
    """Tres barras crecientes, la última roja. escala<1 deja margen (iconos 'maskable')."""
    out = ''
    for i, (x, h) in enumerate(BARRES):
        bw, base = 96, 416
        X = 256 + (x - 256) * escala; Y = 256 + (base - h - 256) * escala
        attr = f'class="{clases[i]}"' if clases else f'fill="{colors[i]}"'
        out += f'<rect {attr} x="{X:.1f}" y="{Y:.1f}" width="{bw*escala:.1f}" height="{h*escala:.1f}"/>'
    return out

def icona(escala=1.0, fons=INK, barra=W):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">'
            f'<rect width="512" height="512" fill="{fons}"/>{barres(escala, colors=(barra, barra, RED))}</svg>')

def logotip(text_color=INK, fons_icona=INK, barra=W):
    """Icono + «GIRONA EN XIFRES» en una línea (alto 120)."""
    h = 120
    s = h / 512
    td, tw = glif.text('GIRONA EN XIFRES', 0, 0, 100, track=0.01)
    _, ty0, _, ty1 = glif.bbox('GIRONA', 100)
    ts = 72 / (ty1 - ty0)              # mayúsculas de 72 de alto
    tx = h + 28; tyb = h / 2 + 72 / 2
    width = tx + tw * ts
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:.0f} {h}" role="img" aria-label="Girona en xifres">'
            f'<g transform="scale({s:.5f})"><rect width="512" height="512" fill="{fons_icona}"/>{barres(colors=(barra, barra, RED))}</g>'
            f'<g transform="translate({tx:.2f} {tyb:.2f}) scale({ts:.5f})"><path d="{td}" fill="{text_color}"/></g></svg>')

def escriu(ruta, s):
    with open(ruta, 'w', encoding='utf-8') as f: f.write(s)

escriu(os.path.join(WEB, 'favicon.svg'), icona())
escriu(os.path.join(WEB, 'logo.svg'), logotip())
escriu(os.path.join(WEB, 'logo-blanc.svg'), logotip(text_color=W, fons_icona=W, barra=INK))
escriu(os.path.join(BUILD, 'icona.svg'), icona())
escriu(os.path.join(BUILD, 'icona-maskable.svg'), icona(escala=0.72))
# Marca para la cabecera: colores por variables CSS, se adapta al tema oscuro
escriu(os.path.join(BUILD, 'marca-inline.svg'),
       f'<svg class="marca-icona" viewBox="0 0 512 512" aria-hidden="true"><rect width="512" height="512" class="mi-f"/>'
       f'{barres(clases=("mi-b", "mi-b", "mi-p"))}</svg>')
print('ok')
