# Girona en dades / Girona en datos

Web de datos abiertos sobre la provincia de Girona: vivienda, renta, población, empleo, salud y finanzas municipales, por municipio y sección censal. Inspirada en [datosclaros.es](https://www.datosclaros.es/vivienda-en-espana/).

Web de dades obertes sobre la província de Girona: habitatge, renda, població, ocupació, salut i finances municipals, per municipi i secció censal.

## Estructura

| Carpeta | Contenido |
| --- | --- |
| `docs/` | Catálogo de fuentes e indicadores |
| `fuentes.yml` | Registro de fuentes que usarán los scripts |
| `fuentes/` | Un módulo por fuente: descarga, limpieza y filtrado a la provincia |
| `scripts/actualizar.py` | Ejecuta las fuentes y escribe `data/estado.md` |
| `data/raw/` | Descargas originales (no se suben al repositorio) |
| `data/processed/` | Datos limpios, con código INE de municipio y sección censal |
| `web/` | Web estática bilingüe (ca/es). `scripts/construir_web.py` genera `web/datos/municipios.json` y la Action **Publicar web** la sube a GitHub Pages |

## Plan

1. Catálogo de fuentes e indicadores (`docs/fuentes.md`).
2. Scripts de descarga y GitHub Action de actualización periódica.
3. Web bilingüe en GitHub Pages: primero vivienda y renta.
4. Dominio propio y nuevas secciones.

## Actualizar los datos

La Action **Actualizar datos** se ejecuta cada lunes y también a mano desde la pestaña Actions. En local:

```
pip install -r requirements.txt
python scripts/actualizar.py            # todas las fuentes
python scripts/actualizar.py xifra ine  # solo algunas
```

Fuentes disponibles: `territorio`, `generalitat`, `ine`, `mitma`, `xifra`, `catastro`.

## Ver la web en local

```
python scripts/construir_web.py
cd web && python -m http.server 8000   # http://localhost:8000
```
