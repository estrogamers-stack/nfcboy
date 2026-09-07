# NFC BOY V3.2 — GUARDADO AUTOMÁTICO

Esta versión corrige el problema de partidas que no quedaban persistidas.

## Cambios
- `EJS_fixedSaveInterval = 5000`: fuerza el volcado del save cada 5 segundos.
- `EJS_gameName = "NFCBOY_GAME"` y `EJS_gameID = 731032`: identificadores estables.
- `EJS_onSaveUpdate`: muestra `PARTIDA GUARDADA ✓` cuando cambia el save.
- Solicita almacenamiento persistente con `navigator.storage.persist()`.
- Service Worker actualizado.
- La ROM sigue siendo network-first para que puedas sustituirla sin arrastrar la antigua.

## Instalación
1. Sustituye en GitHub los archivos de esta carpeta.
2. Mantén tu ROM en `/rom` con uno de estos nombres:
   - `juego.gba`
   - `juego.gbc`
   - `juego.gb`
3. Abre:
   `https://TUUSUARIO.github.io/nfcboy/?savefix=32`
4. Guarda DENTRO DEL JUEGO y espera 5–10 segundos.
5. Debería aparecer `PARTIDA GUARDADA ✓`.
6. Cierra y vuelve a abrir para comprobarlo.

## Nota
El guardado normal del juego (SAV/SRAM) y los Save States son cosas distintas.
