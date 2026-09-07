(() => {
  const EJS_VERSION = "4.2.3";
  const EJS_DATA = `https://cdn.emulatorjs.org/${EJS_VERSION}/data/`;
  const EJS_LOADER = `${EJS_DATA}loader.js`;

  // Busca automáticamente estos nombres.
  const games = [
    { url: "./rom/juego.gba", core: "gba", label: "Game Boy Advance" },
    { url: "./rom/juego.gbc", core: "gb",  label: "Game Boy Color" },
    { url: "./rom/juego.gb",  core: "gb",  label: "Game Boy" }
  ];

  const boot = document.getElementById("boot");
  const msg = document.getElementById("bootMsg");
  const detail = document.getElementById("bootDetail");
  const offline = document.getElementById("offline");

  function setStatus(text, extra="") {
    msg.textContent = text;
    detail.textContent = extra;
  }

  function showError(text, extra="") {
    boot.classList.add("error");
    setStatus(text, extra);
  }

  function updateOnlineBadge() {
    offline.style.display = navigator.onLine ? "none" : "block";
  }
  addEventListener("online", updateOnlineBadge);
  addEventListener("offline", updateOnlineBadge);
  updateOnlineBadge();

  addEventListener("error", e => {
    if (document.body.contains(boot)) showError("Error al iniciar", e.message || "Error desconocido");
  });

  addEventListener("unhandledrejection", e => {
    if (document.body.contains(boot)) showError("Error al cargar recursos", String(e.reason || e));
  });

  async function ensureServiceWorker() {
    if (!("serviceWorker" in navigator) || location.protocol !== "https:") return;
    try {
      await navigator.serviceWorker.register("./sw.js?v=31", { scope:"./" });
      await navigator.serviceWorker.ready;
    } catch (err) {
      console.warn("SW:", err);
    }
  }

  async function exists(url) {
    try {
      // cache-busting query prevents stale ROM detection while online.
      const testUrl = navigator.onLine
        ? `${url}?romcheck=${Date.now()}`
        : url;
      const r = await fetch(testUrl, { cache:"no-store" });
      return r.ok;
    } catch (_) {
      return false;
    }
  }

  async function findGame() {
    setStatus("Buscando tu ROM…");
    for (const game of games) {
      if (await exists(game.url)) return game;
    }
    throw new Error(
      "No encuentro ninguna ROM en /rom. Renombra la tuya a juego.gba, juego.gbc o juego.gb."
    );
  }

  function configureEmulator(game) {
    // Add version query to force fresh ROM when online.
    const romUrl = navigator.onLine
      ? `${game.url}?v=${Date.now()}`
      : game.url;

    window.EJS_player = "#game";
    window.EJS_core = game.core;
    window.EJS_gameUrl = romUrl;
    window.EJS_gameName = "NFCBOY_GAME";
    window.EJS_pathtodata = EJS_DATA;
    window.EJS_startOnLoaded = true;
    window.EJS_volume = 0.7;
    window.EJS_disableAutoLang = true;
    window.EJS_language = "en-US";
  }

  function loadEmulator() {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = EJS_LOADER;
      script.onload = resolve;
      script.onerror = () => reject(new Error("No se pudo cargar EmulatorJS."));
      document.body.appendChild(script);
    });
  }

  function watchForGame(game) {
    const observer = new MutationObserver(() => {
      if (document.querySelector("#game canvas")) {
        boot?.remove();
        observer.disconnect();
      }
    });
    observer.observe(document.getElementById("game"), {childList:true, subtree:true});

    setTimeout(() => {
      if (document.body.contains(boot)) {
        setStatus(
          `Cargando ${game.label}…`,
          navigator.onLine
            ? "Si acabas de cambiar la ROM, esta versión ya fuerza la copia nueva de GitHub."
            : "Modo offline: usando la última ROM guardada."
        );
      }
    }, 10000);
  }

  async function main() {
    await ensureServiceWorker();
    const game = await findGame();
    setStatus(`Abriendo ${game.label}…`, game.url);
    configureEmulator(game);
    watchForGame(game);
    await loadEmulator();
  }

  main().catch(err => {
    console.error(err);
    showError("No se pudo abrir el juego", err.message || String(err));
  });
})();
