# Datos procesados

Todo está filtrado a la provincia de Girona. Los municipios se identifican con el código INE de 5 cifras (`17079` = Girona). El estado de la última ejecución está en [`estado.md`](estado.md).

| Carpeta | Contenido |
| --- | --- |
| `territorio/municipios.csv` | 221 municipios con código INE, código Idescat y comarca |
| `generalitat/` | Dades obertes de la Generalitat: alquiler medio (Incasòl), establecimientos turísticos y HUT, impuesto turístico, renta garantizada, residuos, consumo eléctrico, autoconsumo, indicadores territoriales, estaciones XEMA, delitos (región policial de Girona) |
| `mitma/` | Boletín del Ministerio: compraventas de vivienda por municipio desde 2004 (trimestral) y tablas provinciales de valor y de suelo urbano |
| `ine/atlas_renta/` | Atlas de distribución de renta del INE (2015-2024) por municipio, distrito y sección censal: renta media, fuentes de ingreso, umbrales de pobreza, Gini y P80/P20 |
| `xifra/` | Todas las tablas municipales de Xifra (Diputació de Girona), último año; `_indice.csv` las describe |
| `catastro/` | Edificios del Catastro: uno por fila (`edificios.csv.gz`, con año, uso, viviendas, superficie y coordenadas UTM 31N) y agregados por municipio |

Los valores numéricos del INE vienen con punto de miles y coma decimal (`17.794` = 17.794 €).
