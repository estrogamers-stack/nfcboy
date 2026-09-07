# NFC Boy — prueba 2048

Demo para GitHub Pages.

## Qué hace
- Abres la URL.
- EmulatorJS carga automáticamente.
- 2048 para Game Boy arranca sin selector de ROM.
- Controles táctiles del emulador.
- Service Worker básico para cachear recursos visitados.

## Juego de prueba
2048-gb de Wyatt Ferguson.
Repositorio: https://github.com/wyattferguson/2048-gb
Licencia: MIT.

## Motor
EmulatorJS:
https://github.com/EmulatorJS/EmulatorJS

Esta DEMO usa el CDN oficial de EmulatorJS y la ROM MIT desde GitHub.
La versión final puede copiar ambos dentro del mismo repositorio para
hacerla completamente self-hosted.

## Subir a GitHub Pages
1. Crea un repositorio, por ejemplo `nfcboy`.
2. Sube index.html, manifest.webmanifest y sw.js a la raíz.
3. Settings > Pages.
4. Deploy from a branch.
5. Branch: main / root.
6. GitHub te dará una URL tipo:
   https://TUUSUARIO.github.io/nfcboy/
7. Esa URL es la que grabas en el NFC.

## Offline
La primera visita necesita Internet.
Después de ejecutar el juego una vez, el Service Worker intenta reutilizar
los recursos ya descargados. La versión final self-hosted permitirá
controlar este caché con mucha más precisión.
