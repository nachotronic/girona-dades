# Girona en dades / Girona en datos

Web de datos abiertos sobre la provincia de Girona: vivienda, renta, población, empleo, salud y finanzas municipales, por municipio y sección censal. Inspirada en [datosclaros.es](https://www.datosclaros.es/vivienda-en-espana/).

Web de dades obertes sobre la província de Girona: habitatge, renda, població, ocupació, salut i finances municipals, per municipi i secció censal.

## Estructura

| Carpeta | Contenido |
| --- | --- |
| `docs/` | Catálogo de fuentes e indicadores |
| `fuentes.yml` | Registro de fuentes que usarán los scripts |
| `scripts/` | Descarga y limpieza de cada fuente |
| `data/raw/` | Descargas originales (no se suben al repositorio) |
| `data/processed/` | Datos limpios, con código INE de municipio y sección censal |
| `web/` | Web estática bilingüe (ca/es) para GitHub Pages |

## Plan

1. Catálogo de fuentes e indicadores (`docs/fuentes.md`).
2. Scripts de descarga y GitHub Action de actualización periódica.
3. Web bilingüe en GitHub Pages: primero vivienda y renta.
4. Dominio propio y nuevas secciones.
