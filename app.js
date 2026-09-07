(() => {
  const EJS_VERSION = "4.2.3";
  const EJS_DATA = `https://cdn.emulatorjs.org/${EJS_VERSION}/data/`;
  const EJS_LOADER = `${EJS_DATA}loader.js`;

  // IMPORTANT:
  // EmulatorJS receives a STABLE ROM URL. No timestamp/query is added here.
  const candidates = [
    { url: "./rom/juego.gba", core: "gba", label: "Game Boy Advance" },
    { url: "./rom/juego.gbc", core: "gb",  label: "Game Boy Color" },
    { url: "./rom/juego.gb",  core: "gb",  label: "Game Boy" }
  ];

  const DB_NAME = "nfcboy-v4";
  const DB_VERSION = 1;
  const STORE = "states";
  const AUTOSAVE_MS = 10000;

  const boot = document.getElementById("boot");
  const msg = document.getElementById("bootMsg");
  const detail = document.getElementById("bootDetail");
  const offline = document.getElementById("offline");
  const saveIcon = document.getElementById("saveIcon");

  let currentGame = null;
  let currentGameKey = null;
  let autosaveTimer = null;
  let loadedStateBlobUrl = null;
  let saveIconTimer = null;
  let lastStateSignature = "";

  function status(text, extra="") {
    msg.textContent = text;
    detail.textContent = extra;
  }

  function fail(text, extra="") {
    boot.classList.add("error");
    status(text, extra);
  }

  function flashSaveIcon(ms=850) {
    if (!saveIcon) return;
    saveIcon.classList.add("show");
    clearTimeout(saveIconTimer);
    saveIconTimer = setTimeout(() => saveIcon.classList.remove("show"), ms);
  }

  function onlineBadge() {
    offline.style.display = navigator.onLine ? "none" : "block";
  }
  addEventListener("online", onlineBadge);
  addEventListener("offline", onlineBadge);
  onlineBadge();

  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function dbGet(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  }

  async function dbPut(key, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  }

  async function requestPersistentStorage() {
    try {
      if (navigator.storage?.persist) {
        const ok = await navigator.storage.persist();
        console.log("[NFC BOY] persistent storage:", ok);
      }
    } catch (e) {
      console.warn("[NFC BOY] persist request failed:", e);
    }
  }

  async function registerSW() {
    if (!("serviceWorker" in navigator) || location.protocol !== "https:") return;
    try {
      await navigator.serviceWorker.register("./sw.js?v=41", { scope:"./" });
      await navigator.serviceWorker.ready;
    } catch (e) {
      console.warn("[NFC BOY] SW:", e);
    }
  }

  async function fetchRomForIdentity(game) {
    // Network-first behavior is implemented by sw.js.
    // We use a stable URL; cache:'no-store' only influences browser HTTP cache.
    const response = await fetch(game.url, { cache:"no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  }

  async function sha256Hex(bytes) {
    if (crypto?.subtle) {
      const hash = await crypto.subtle.digest("SHA-256", bytes);
      return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2,"0")).join("");
    }
    // Fallback lightweight identity if subtle crypto is unavailable.
    let h = 2166136261 >>> 0;
    for (const b of bytes) {
      h ^= b;
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h.toString(16).padStart(8,"0");
  }

  async function findGame() {
    status("Buscando tu ROM…");
    for (const game of candidates) {
      try {
        const bytes = await fetchRomForIdentity(game);
        const hash = await sha256Hex(bytes);
        return { ...game, hash, size: bytes.byteLength };
      } catch (_) {}
    }
    throw new Error("No encuentro /rom/juego.gba, /rom/juego.gbc ni /rom/juego.gb.");
  }

  function numericIdFromHash(hash) {
    const raw = parseInt(hash.slice(0,8), 16) >>> 0;
    return (raw % 2147483000) + 1;
  }

  async function loadOurAutosave(game) {
    const key = `state:${game.hash}`;
    const record = await dbGet(key);
    if (!record?.data) return null;

    const data = record.data instanceof Uint8Array
      ? record.data
      : new Uint8Array(record.data);

    if (!data.byteLength) return null;

    const blob = new Blob([data], {type:"application/octet-stream"});
    loadedStateBlobUrl = URL.createObjectURL(blob);
    return {
      url: loadedStateBlobUrl,
      savedAt: record.savedAt || 0,
      bytes: data.byteLength
    };
  }

  function getEmulatorState() {
    const gm = window.EJS_emulator?.gameManager;
    if (!gm || typeof gm.getState !== "function") return null;

    try {
      const state = gm.getState();
      if (!state) return null;
      return state instanceof Uint8Array ? state : new Uint8Array(state);
    } catch (e) {
      console.warn("[NFC BOY] getState failed:", e);
      return null;
    }
  }

  function quickSignature(bytes) {
    if (!bytes || !bytes.length) return "";
    let h = 2166136261 >>> 0;
    const step = Math.max(1, Math.floor(bytes.length / 2048));
    for (let i=0; i<bytes.length; i+=step) {
      h ^= bytes[i];
      h = Math.imul(h, 16777619) >>> 0;
    }
    return `${bytes.length}:${h}`;
  }

  async function saveOurState(showToast=true) {
    if (!currentGameKey) return false;

    const state = getEmulatorState();
    if (!state || state.byteLength < 100) return false;

    const sig = quickSignature(state);
    if (sig === lastStateSignature) return false;

    // Copy because Emscripten-backed buffers can mutate after getState().
    const copy = new Uint8Array(state);
    await dbPut(currentGameKey, {
      data: copy,
      savedAt: Date.now(),
      romHash: currentGame.hash,
      core: currentGame.core
    });

    lastStateSignature = sig;
    if (showToast) flashSaveIcon();
    console.log("[NFC BOY] autosave state:", copy.byteLength);
    return true;
  }

  function startAutosave() {
    clearInterval(autosaveTimer);
    autosaveTimer = setInterval(() => {
      saveOurState(true).catch(console.warn);
    }, AUTOSAVE_MS);

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        // Best effort. Regular 10-second autosave is the primary protection.
        saveOurState(false).catch(()=>{});
      }
    });

    addEventListener("pagehide", () => {
      saveOurState(false).catch(()=>{});
    });
  }

  function configure(game, restored) {
    currentGame = game;
    currentGameKey = `state:${game.hash}`;

    window.EJS_player = "#game";
    window.EJS_core = game.core;

    // STABLE URL — critical for consistent EmulatorJS identity.
    window.EJS_gameUrl = game.url;

    // Stable identity for EmulatorJS internal saves/settings.
    window.EJS_gameName = `NFCBOY_${game.hash.slice(0,16)}`;
    window.EJS_gameID = numericIdFromHash(game.hash);

    window.EJS_pathtodata = EJS_DATA;
    window.EJS_startOnLoaded = true;
    window.EJS_volume = 0.7;
    window.EJS_disableAutoLang = true;
    window.EJS_language = "en-US";

    // Official documented state-loading hook.
    if (restored?.url) {
      window.EJS_loadStateURL = restored.url;
    }

    window.EJS_onGameStart = function() {
      requestPersistentStorage();
      startAutosave();
      if (restored?.url) {
        setTimeout(() => flashSaveIcon(1100), 1000);
      }
    };
  }

  function loadEJS() {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = EJS_LOADER;
      script.onload = resolve;
      script.onerror = () => reject(new Error("No se pudo cargar EmulatorJS."));
      document.body.appendChild(script);
    });
  }

  function watchCanvas() {
    const ob = new MutationObserver(() => {
      if (document.querySelector("#game canvas")) {
        boot?.remove();
        ob.disconnect();
      }
    });
    ob.observe(document.getElementById("game"), {childList:true, subtree:true});
  }

  addEventListener("error", e => {
    if (document.body.contains(boot)) fail("Error al iniciar", e.message || "Error desconocido");
  });

  addEventListener("unhandledrejection", e => {
    if (document.body.contains(boot)) fail("Error al cargar", String(e.reason || e));
  });

  async function main() {
    await registerSW();

    const game = await findGame();
    status(`ROM detectada: ${game.label}`, `${game.size} bytes · ${game.hash.slice(0,12)}…`);

    currentGame = game;
    currentGameKey = `state:${game.hash}`;

    let restored = null;
    try {
      restored = await loadOurAutosave(game);
    } catch (e) {
      console.warn("[NFC BOY] no state restore:", e);
    }

    if (restored) {
      status("Partida encontrada", "Se restaurará automáticamente al iniciar.");
    } else {
      status(`Abriendo ${game.label}…`, "Primera partida para esta ROM.");
    }

    configure(game, restored);
    watchCanvas();
    await loadEJS();

    setTimeout(() => {
      if (document.body.contains(boot)) {
        status("El emulador está tardando…", "Recarga si no entra tras unos segundos.");
      }
    }, 15000);
  }

  main().catch(err => {
    console.error(err);
    fail("No se pudo abrir el juego", err.message || String(err));
  });
})();
