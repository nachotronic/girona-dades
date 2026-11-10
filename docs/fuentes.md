# Catálogo de fuentes

El registro completo, con el organismo, el nivel territorial, la frecuencia y el estado de cada fuente, está en [`fuentes.yml`](../fuentes.yml). El estado `comprobada` indica que la fuente se ha abierto y verificado; `por_confirmar` indica que se verificará al escribir su script de descarga.

## Niveles territoriales

- **Sección censal**: Atlas de renta (INE), padrón (INE), Censo 2021 y Catastro (agregando edificios).
- **Municipio**: Incasòl, compraventas, viviendas de uso turístico, AEAT, Hacienda, Idescat, paro.
- **Provincia o municipios grandes**: Colegio de Registradores y Ministerio de Vivienda.
- **ABS (Área Básica de Salud)**: indicadores de salud, cruzados con municipio mediante una tabla de equivalencias.

## Primera versión

1. Vivienda: alquiler, compraventas, uso turístico, viviendas vacías y parque edificado.
2. Renta: Atlas del INE, IRPF de la AEAT e índice de esfuerzo.
3. Base territorial: municipios, comarcas y secciones censales con su código INE.
4. Después: finanzas municipales, empleo, movilidad y salud.
