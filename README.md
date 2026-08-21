# Colosseum Restoration Rev 16.1

Correcciones sobre Rev16:
- Costo final de restauración visible, editable y sobreescribible manualmente.
- Descuento por resultado expresado como porcentaje.
- Costo automático = precio base × (1 - descuento/100), salvo override manual del costo final.
- RECALCULAR restaura la fórmula automática.
- Si descuento = 0 o está vacío, el reporte PDF no muestra la línea de descuento.
- Disclaimer rediseñado como una sola página/recuadro discreto, sin repetir logo/cabecera.
- El mismo disclaimer se agrega tanto al PDF de presupuesto como al PDF final.
- Se conserva IndexedDB versión 1 y compatibilidad con registros previos.
