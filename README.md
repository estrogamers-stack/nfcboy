# NFC BOY V4 — GUARDADO ROBUSTO

## Por qué existe esta versión

La caché de la web y el guardado de la partida son cosas diferentes.

EmulatorJS/RetroArch puede guardar SRAM/SRM en IndexedDB, pero existen casos
documentados en los que esa SRAM no se restaura de forma consistente entre
recargas/dispositivos.

Además, versiones anteriores de NFC BOY añadían `?v=<timestamp>` a la URL de la
ROM al abrirla. V4 elimina eso completamente: EmulatorJS recibe siempre una URL
estable.

## Solución V4

V4 mantiene dos niveles:

1. El guardado normal del juego/EmulatorJS sigue existiendo.
2. NFC BOY crea además un SAVE STATE automático propio cada 10 segundos en
   IndexedDB y lo carga automáticamente la próxima vez.

Esto significa que, aunque el SRAM interno falle, deberías volver prácticamente
al mismo punto del juego.

## Identidad de la partida

NFC BOY calcula SHA-256 de la ROM.

- Misma ROM = mismo save.
- Cambias la ROM = save independiente.
- Puedes seguir llamando al archivo `juego.gba`, `juego.gbc` o `juego.gb`.

## Instalación

Sustituye en GitHub:

- index.html
- app.js
- sw.js
- manifest.webmanifest
- icons/

Dentro de `/rom` deja tu ROM:

- `juego.gba`
- `juego.gbc`
- `juego.gb`

NO subas `PON_AQUI_TU_ROM.txt` si no quieres.

Prueba con:

    https://TUUSUARIO.github.io/nfcboy/?v=40

## Prueba correcta

1. Abre el juego.
2. Avanza hasta un punto claramente reconocible.
3. Juega al menos 15-20 segundos.
4. Debe aparecer `PARTIDA GUARDADA ✓`.
5. Cierra Safari.
6. Vuelve a entrar.
7. Debe aparecer `PARTIDA RESTAURADA ✓`.

## Importante

Esta versión usa `EJS_emulator.gameManager.getState()` de EmulatorJS 4.2.3 para
capturar el estado completo. Hemos fijado EmulatorJS a 4.2.3 para que esa API no
cambie debajo del proyecto.

El estado se guarda en IndexedDB del navegador, NO en GitHub.

Si borras los datos del sitio en Safari, se elimina también la partida.
