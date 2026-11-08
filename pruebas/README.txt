COLOSSEUM RESTORATION — REV18.8.0

NOVEDAD: Exportar e importar la base IndexedDB local.
Se agregan dos botones dentro del Historial.

Exportar: descarga JSON con todos los reportes y fotos, sin eliminarlos.
Importar: agrega solamente IDs nuevos; no sobrescribe ni borra reportes existentes.
Compatible con la base colosseumRestoration v1, sin migración de esquema.

ARCHIVOS A SUBIR AL REPOSITORIO:
- index.html
- sw.js
- database-transfer.js (NUEVO)
- pdf.js (sin cambios respecto a Rev18.7.1, incluido por comodidad)

PRUEBA RECOMENDADA:
1. Exportar en el iPhone y conservar el archivo.
2. Importar ese mismo archivo; debe indicar 0 nuevos, todos existentes.
3. Para cargar reportes desde otro dispositivo, exportar allí e importar en el iPhone.

IMPORTANTE:
- Los datos siguen siendo locales; todavía NO hay sincronización automática.
- Nunca borrar datos del navegador antes de verificar el respaldo.
- Los archivos JSON con fotos pueden ser grandes.
- No compartir los respaldos públicamente: contienen datos de clientes y fotos.

REV18.8.1 — ÍCONO SHADOW LUGIA
- apple-touch-icon ahora apunta a assets/lugia.png.
- manifest.webmanifest apunta al mismo sprite.
- Los sprites dentro de la app no cambian.
- Se incrementó versión de caché en sw.js.
- Subir index.html, sw.js, manifest.webmanifest y database-transfer.js.
- pdf.js está incluido sin cambios.
- El archivo assets/lugia.png debe existir en tu repositorio (ya se usa en la cabecera).
- Para ver el nuevo ícono en iPhone: quitar SOLO el acceso directo y volver a agregarlo desde Safari. No borrar datos del sitio.
