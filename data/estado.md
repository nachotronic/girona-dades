# Estado de la última actualización

2026-11-10 15:52 UTC

## territorio: ok (1 s)

```
221 municipios, 9 comarcas
```

## generalitat: ok (42 s)

```
qww9-bvhh: 11753/47541 filas, filtrado por Codi territorial (codigo)
hepw-33ik: 5/3645 filas, filtrado por Habitatges (codigo)
t2h3-cgys: 47806/112696 filas, filtrado por Codi Municipi (IDESCAT) (codigo)
q4sr-68c3: 382/1378 filas, filtrado por Municipi (nombre)
u5i2-b24m: 5852/26031 filas, filtrado por Codi municipi (codigo)
69zu-w48s: 5525/23687 filas, filtrado por Codi municipi (codigo)
8idm-becu: 12803/54611 filas, filtrado por CDMUN (codigo)
2b4s-skfm: 23007/138769 filas, filtrado por Municipi (nombre)
8aaj-ypcb: 442/1896 filas, filtrado por Codi municipi (codigo)
yqwd-vj5e: 47/245 filas, filtrado por CODI_MUNICIPI (codigo)
qnyt-emjc: 338223/338223 filas, SIN FILTRAR (no se encontró columna de municipio)
```

## mitma: ok (39 s)

```
34010210 (municipio): 1 hojas, 227 filas
34010220 (municipio): 1 hojas, 227 filas
34010230 (municipio): 1 hojas, 227 filas
34010240 (municipio): 1 hojas, 227 filas
34010250 (municipio): 1 hojas, 227 filas
36102000 (municipio): 1 hojas, 9 filas
36102500 (municipio): 1 hojas, 9 filas
36103000 (municipio): 1 hojas, 9 filas
36103500 (municipio): 1 hojas, 9 filas
36104000 (municipio): 1 hojas, 9 filas
36401000 (municipio): 1 hojas, 9 filas
36401500 (municipio): 1 hojas, 9 filas
36402000 (municipio): 1 hojas, 9 filas
36402500 (municipio): 1 hojas, 9 filas
36403000 (municipio): 1 hojas, 9 filas
34010110 (provincia): 5 hojas, 365 filas
34010120 (provincia): 5 hojas, 363 filas
34010130 (provincia): 5 hojas, 364 filas
34010140 (provincia): 5 hojas, 363 filas
34010150 (provincia): 5 hojas, 366 filas
34010160 (provincia): 5 hojas, 365 filas
34010170 (provincia): 5 hojas, 364 filas
34010180 (provincia): 5 hojas, 363 filas
34010190 (provincia): 5 hojas, 364 filas
340101a0 (provincia): 86 hojas, 6038 filas
340101d0 (provincia): 78 hojas, 5612 filas
340101h0 (provincia): 78 hojas, 4763 filas
340101l0 (provincia): 64 hojas, 1024 filas
34020110 (provincia): 6 hojas, 436 filas
34020150 (provincia): 6 hojas, 437 filas
34020160 (provincia): 6 hojas, 437 filas
34020170 (provincia): 6 hojas, 439 filas
34020180 (provincia): 30 hojas, 2165 filas
36100500 (provincia): 1 hojas, 71 filas
36101000 (provincia): 1 hojas, 72 filas
36101500 (provincia): 1 hojas, 72 filas
36200500 (provincia): 1 hojas, 72 filas
36201000 (provincia): 1 hojas, 73 filas
36201500 (provincia): 1 hojas, 73 filas
36300500 (provincia): 1 hojas, 72 filas
36301000 (provincia): 1 hojas, 73 filas
36301500 (provincia): 1 hojas, 73 filas
36400500 (provincia): 1 hojas, 70 filas
```

## ine: ERROR (10 s)

```
Traceback (most recent call last):
  File "/home/runner/work/girona-dades/girona-dades/scripts/actualizar.py", line 27, in main
    res = importlib.import_module(f"fuentes.{n}").ejecutar()
          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/runner/work/girona-dades/girona-dades/fuentes/ine.py", line 44, in ejecutar
    tablas = _tablas_girona(salida)
             ^^^^^^^^^^^^^^^^^^^^^^
  File "/home/runner/work/girona-dades/girona-dades/fuentes/ine.py", line 34, in _tablas_girona
    cabezas = {normaliza(s.get("Nombre", "").split(".")[0].split(" sección")[0].split(" distrito")[0]) for s in series[:300]}
                                                                                                                ~~~~~~^^^^^^
KeyError: slice(None, 300, None)

```
