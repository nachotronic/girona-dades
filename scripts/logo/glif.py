"""Texto -> path SVG con Archivo (instancia wght/wdth) y Plex Mono."""
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
import functools
import os
F=os.path.join(os.path.dirname(__file__),'..','..','web','fonts')+'/'
@functools.lru_cache(None)
def font(name, wght=800, wdth=72):
    f=TTFont(F+name)
    if 'fvar' in f: f=instantiateVariableFont(f,{'wght':wght,'wdth':wdth})
    return f
def text(s, x, y, size, name='archivo-latin-wdth-normal.woff2', wght=800, wdth=72, track=0.0):
    """Devuelve (d, ancho) con la línea base en y."""
    f=font(name,wght,wdth); gs=f.getGlyphSet(); cmap=f.getBestCmap(); upm=f['head'].unitsPerEm
    sc=size/upm; pen=SVGPathPen(gs); cx=0
    for ch in s:
        g=cmap[ord(ch)]
        tp=TransformPen(pen,(sc,0,0,-sc,x+cx,y))
        gs[g].draw(tp); cx+=gs[g].width*sc+track*size
    return pen.getCommands(), cx-track*size
def bbox(s,size,**k):
    from fontTools.pens.boundsPen import BoundsPen
    f=font(k.get('name','archivo-latin-wdth-normal.woff2'),k.get('wght',800),k.get('wdth',72)); gs=f.getGlyphSet(); cmap=f.getBestCmap(); upm=f['head'].unitsPerEm
    bp=BoundsPen(gs); cx=0
    for ch in s:
        g=cmap[ord(ch)]; tp=TransformPen(bp,(1,0,0,1,cx,0)); gs[g].draw(tp); cx+=gs[g].width
    b=bp.bounds; s_=size/upm
    return tuple(v*s_ for v in b)  # xmin,ymin,xmax,ymax (y hacia arriba)
