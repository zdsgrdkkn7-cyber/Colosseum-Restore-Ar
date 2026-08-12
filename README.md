# Colosseum Restoration V13.3

Corrección funcional sobre V13.2:
- Los botones Guardar, Generar PDF, Nuevo reporte e Historial se inicializan de forma segura al cargar el DOM.
- Los campos son null-safe: un campo ausente ya no rompe todo app.js.
- Errores de PDF/guardado/historial muestran un aviso en pantalla en vez de dejar la app sin responder.
- Mantiene intacto el layout visual de V13.2.
