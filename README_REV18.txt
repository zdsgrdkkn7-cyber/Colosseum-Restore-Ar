COLOSSEUM RESTORATION — REV18

Base revisada: main actual del repositorio GitHub, que contiene:
- index.html
- app.js
- styles.css
- pdf-v17.js
- batch-budget-v17.js
- pricing-v17-2.js
- sw.js

Rev18 se implementa de forma ADITIVA para reducir el riesgo de romper la app estable.
No cambia IndexedDB: sigue usando versión 1.

ARCHIVOS NUEVOS:
- rev18.js
- rev18.css
- pdf-rev18.js

ARCHIVO A REEMPLAZAR:
- sw.js

INDEX.HTML:
Aplicar los dos cambios indicados en INDEX_PATCH.txt.

FUNCIONES:
1. Centering Frente/Dorso sobre las fotos DESPUÉS.
2. Editor manual con rectángulo exterior + interior y cuatro esquinas ajustables.
3. H L/R y V T/B.
4. Nota Colosseum independiente por cara.
5. Referencias PSA/BGS/CGC/TAG independientes por cara.
6. Sin nota global ni pre-grade.
7. PDF: cotas discretas alrededor de la foto Después y resumen de centrado.
8. Detalles de restauración: filas ilimitadas, Antes/Después 4:3 horizontal + descripción de una línea.
9. Se permiten fotos individuales.
10. Filas totalmente vacías no se imprimen.
11. PDF: hasta dos filas de detalles por página.
12. Reportes viejos compatibles: centering y restorationDetails son propiedades opcionales.

IMPORTANTE:
La tabla de Centering Rev18 usa la tabla de trabajo acordada en la conversación. Las referencias de graders son orientativas y no constituyen una predicción de grade.
