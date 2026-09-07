# NFC BOY V3

## Qué hace

- NFC -> URL de GitHub Pages -> juego directo.
- Sin selector de ROM.
- Detecta automáticamente:
  1. `rom/juego.gba`
  2. `rom/juego.gbc`
  3. `rom/juego.gb`
- Incluye `rom/juego.gb`, una ROM de prueba original que muestra "NFC BOY TEST".
- Usa EmulatorJS 4.2.3 fijado a una versión concreta.
- La primera ejecución descarga el motor/core.
- El Service Worker almacena los recursos para siguientes aperturas offline.
- EmulatorJS conserva sus datos/guardados en el almacenamiento del navegador.

## DÓNDE PONER TU ROM

Entra en la carpeta:

    rom/

Para Game Boy:
    reemplaza `juego.gb`

Para Game Boy Color:
    sube `juego.gbc`

Para Game Boy Advance:
    sube `juego.gba`

No necesitas editar el HTML ni JavaScript. La web detecta la consola por el archivo.

Si hay más de una ROM, tiene prioridad:
GBA > GBC > GB.

## SUBIR A GITHUB

Sube TODO el contenido de esta carpeta a la raíz de tu repositorio:

    index.html
    app.js
    sw.js
    manifest.webmanifest
    icons/
    rom/

GitHub:
Settings -> Pages -> Deploy from a branch -> main -> /(root)

## IMPORTANTE: PRIMERA CARGA

La primera ejecución necesita Internet porque descarga EmulatorJS 4.2.3 y
el core correspondiente desde el CDN oficial.

Después, el Service Worker cachea los recursos. En Safari/iPhone el sistema
puede eliminar datos web por presión de almacenamiento o políticas del navegador,
por lo que "offline" no equivale a almacenamiento permanente garantizado.

Para máxima persistencia en iPhone, también puedes añadir la web a la pantalla
de inicio como PWA.

## CAMBIAR EL JUEGO

Mantén siempre el nombre:
- juego.gb
- juego.gbc
- juego.gba

Así no necesitas volver a modificar el NFC: la URL sigue siendo la misma.

## ROMS

Usa únicamente ROMs que tengas derecho a alojar/distribuir.
