# Estado de la última actualización

2026-11-13 14:49 UTC

## salut: ERROR (7 s)

```
Traceback (most recent call last):
  File "/home/runner/work/girona-dades/girona-dades/scripts/actualizar.py", line 27, in main
    res = importlib.import_module(f"fuentes.{n}").ejecutar()
          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/runner/work/girona-dades/girona-dades/fuentes/salut.py", line 132, in ejecutar
    codis, txt = _abs_girona(sal)
                 ^^^^^^^^^^^^^^^^
  File "/home/runner/work/girona-dades/girona-dades/fuentes/salut.py", line 38, in _abs_girona
    g = gpd.GeoDataFrame(g.drop(columns=[col]), geometry=g[col].map(wkt.loads), crs=4326)
                                                         ^^^^^^^^^^^^^^^^^^^^^
TypeError: Expected bytes or string, got float

```
