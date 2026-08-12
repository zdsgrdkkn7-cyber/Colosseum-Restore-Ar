# Colosseum Restoration PWA

Prototipo offline-first de la app de reportes de restauración.

## Cómo probarla en una computadora
Necesita servirse por HTTP/HTTPS para que la PWA y el modo offline funcionen correctamente.

Con Python:
    python3 -m http.server 8080

Luego abrir:
    http://localhost:8080

## Cómo usarla en iPhone
1. Publicar esta carpeta en un hosting HTTPS estático (por ejemplo GitHub Pages, Netlify, Cloudflare Pages o Vercel).
2. Abrir la URL en Safari.
3. Compartir > Añadir a pantalla de inicio.
4. Abrirla una vez con conexión. Después, la interfaz queda cacheada y puede funcionar offline.

Los reportes se guardan en IndexedDB del navegador del dispositivo.
El botón GENERAR PDF abre la vista de impresión; en iPhone se puede guardar/compartir como PDF desde la hoja de impresión.

## Incluye
- Comparación Antes / Después en dos columnas.
- Frente y Dorso en dos filas.
- 4 fotos cargables desde cámara/fototeca.
- Escalas 1–10 con Poké Balls clickeables.
- Datos de carta, trabajo realizado y observaciones.
- Guardado local de reportes e historial.
- Nuevo reporte.
- Exportación a PDF mediante impresión.
- Manifest y Service Worker para instalación PWA/offline.
