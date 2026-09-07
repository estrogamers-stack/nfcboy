(() => {
  const EJS_VERSION = "4.2.3";
  const EJS_DATA = `https://cdn.emulatorjs.org/${EJS_VERSION}/data/`;
  const EJS_LOADER = `${EJS_DATA}loader.js`;

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
    if (boot) showError("Error al iniciar", e.message || "Error desconocido");
  });

  addEventListener("unhandledrejection", e => {
    if (boot) showError("Error al cargar recursos", String(e.reason || e));
  });

  async function ensureServiceWorker() {
    if (!("serviceWorker" in navigator) || location.protocol !== "https:") return;

    try {
      setStatus("Preparando modo offline…");
      await navigator.serviceWorker.register("./sw.js", { scope: "./" });
      await navigator.serviceWorker.ready;

      // On the very first visit the page may not yet be controlled.
      // One automatic reload makes sure EmulatorJS + core downloads pass
      // through the service worker and are cached.
      if (!navigator.serviceWorker.controller &&
          !sessionStorage.getItem("nfcboy-sw-reload")) {
        sessionStorage.setItem("nfcboy-sw-reload", "1");

        await Promise.race([
          new Promise(resolve => {
            navigator.serviceWorker.addEventListener("controllerchange", resolve, { once:true });
          }),
          new Promise(resolve => setTimeout(resolve, 1500))
        ]);

        location.reload();
        return new Promise(() => {});
      }

      sessionStorage.removeItem("nfcboy-sw-reload");
    } catch (err) {
      console.warn("Service Worker no disponible:", err);
    }
  }

  async function findGame() {
    setStatus("Buscando juego…");

    for (const game of games) {
      try {
        const r = await fetch(game.url, { cache:"no-store" });
        if (r.ok) return game;
      } catch (_) {}
    }

    throw new Error(
      "No encuentro ninguna ROM. Sube un archivo llamado juego.gb, juego.gbc o juego.gba dentro de la carpeta /rom."
    );
  }

  function configureEmulator(game) {
    window.EJS_player = "#game";
    window.EJS_core = game.core;
    window.EJS_gameUrl = game.url;
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

  function watchForGame() {
    const observer = new MutationObserver(() => {
      if (document.querySelector("#game canvas")) {
        boot?.remove();
        observer.disconnect();
      }
    });
    observer.observe(document.getElementById("game"), { childList:true, subtree:true });

    setTimeout(() => {
      if (document.body.contains(boot)) {
        setStatus(
          "El juego está tardando más de lo normal…",
          navigator.onLine
            ? "Recarga una vez si no arranca."
            : "Conecta a Internet para completar la primera descarga."
        );
      }
    }, 15000);
  }

  async function main() {
    await ensureServiceWorker();
    const game = await findGame();

    setStatus(`Abriendo ${game.label}…`,
      navigator.serviceWorker.controller
        ? "El motor y el juego se guardarán para futuras aperturas offline."
        : "");

    configureEmulator(game);
    watchForGame();
    await loadEmulator();
  }

  main().catch(err => {
    console.error(err);
    showError("No se pudo abrir el juego", err.message || String(err));
  });
})();
