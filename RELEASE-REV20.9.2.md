# Colosseum Restore — Rev20.9.2 (ESTABLE)

Fecha de publicación: 2026-11-08.

Versión oficial: https://zdsgrdkkn7-cyber.github.io/Colosseum-Restore-Ar/
Branch estable: stable-rev20.9.2
Versión oficial previa preservada: stable-rev19.7.5-pre20-promotion (y stable-rev19.7.5).

## Cambios incorporados desde PRUEBAS
- Encabezado del reporte: Cliente/Lote a la izquierda, Fecha a la derecha sobre Instagram, logo japonés más grande y Ho-Oh/Lugia desplazados 38 px hacia el centro.
- Historial compacto: Lote, selección, presupuesto, remito, clientes y carpetas.
- Botones Exportar/Importar compartidos: sin Google Drive, ZIP/JSON local; con Google Drive, respaldo y recuperación manual directa.
- Google Drive: conexión persistente durante la sesión, estado y botón compacto en una fila; recuperación incremental de fotografías.
- Tachito rojo para borrar datos locales, protegido con confirmación y frase exacta BORRAR OFICIAL.

## Seguridad de datos
- Se conserva el nombre original de IndexedDB: colosseumRestoration, store reports, versión 1.
- Se conservan las claves locales cr_draft y colosseumFoldersV1.
- NO se ejecutó ninguna migración, borrado o importación de los datos del navegador.
- Google Drive oficial utiliza carpeta separada: Colosseum Restore - OFICIAL. No usa la carpeta de pruebas.
- Los archivos de /pruebas/ y su IndexedDB independiente permanecen intactos.
- Se actualizó el service worker a colosseum-restoration-v20-9-2 para renovar los recursos de la PWA.

## Validación
- La interfaz Rev20.9.2 y el flujo manual de Drive fueron probados por el usuario en PRUEBAS.
- La publicación oficial y el acceso a los datos locales oficiales deben verificarse en el iPhone después de recargar.
