# NFC BOY V3.1 — FIX DE ROM CACHEADA

Esta versión corrige el problema por el que seguía apareciendo `NFC BOY TEST`.

## IMPORTANTE
NO incluye ninguna ROM de prueba.

Debes subir tu ROM en:

- `rom/juego.gba` para Game Boy Advance
- `rom/juego.gbc` para Game Boy Color
- `rom/juego.gb` para Game Boy

## Qué se ha corregido

La V3 metía `rom/juego.gb` dentro del APP_SHELL del Service Worker y utilizaba
cache-first. Eso podía hacer que la ROM TEST antigua siguiera apareciendo.

V3.1:
- NO precachea ninguna ROM.
- Con Internet: ROM = NETWORK FIRST.
- Sin Internet: usa la última ROM que haya quedado cacheada.
- Añade query anti-caché al cargar la ROM online.
- Cambia el nombre de versión del Service Worker.

## Para limpiar la versión anterior

1. Sube estos archivos reemplazando los anteriores.
2. Deja SOLO tu ROM dentro de `/rom`.
3. Abre una vez:
   https://TUUSUARIO.github.io/nfcboy/?fix=31
4. Recarga una segunda vez si Safari todavía tenía el worker antiguo activo.

Si aun apareciese TEST después de eso:
Ajustes iPhone -> Apps -> Safari -> Avanzado -> Datos de sitios web ->
busca github.io -> elimina los datos de tu sitio, y abre la web de nuevo.
