# Colosseum Restoration Rev 16 — Presupuestos

Novedades:
- Un mismo registro guardado puede generar dos PDFs distintos:
  - GENERAR PRESUPUESTO
  - GENERAR PDF (reporte final)
- El campo `precio` se conserva internamente para compatibilidad, pero ahora se muestra como VALOR DECLARADO.
- Presupuesto automático:
  - cada trabajo seleccionado suma U$5;
  - "Otro" pasa a ser el octavo trabajo seleccionable;
  - el factor se asigna automáticamente según Valor declarado;
  - si Valor declarado está vacío, factor x1,00;
  - precio mínimo U$15 cuando existe al menos un trabajo;
  - más de U$2.000: Evaluación especial.
- Precio base presupuestado editable manualmente.
- Botón RECALCULAR para volver a la fórmula automática.
- Descuento por resultado manual.
- Costo final = Precio base presupuestado - Descuento por resultado.
- Reporte final muestra Precio base, Descuento por resultado y Costo final.
- PDF de presupuesto contiene solo estado inicial, trabajos propuestos, cotización y condiciones.
- La tabla de factores y las condiciones aprobadas se incluyen en el PDF de presupuesto.
- No se modifica la versión/esquema de IndexedDB: los reportes anteriores siguen siendo compatibles.
- Se mantiene toda la funcionalidad de Rev15 (Remitos, selección múltiple, descuento por lote, rating 1→0, safe area, etc.).
