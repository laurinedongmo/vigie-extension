// ============================================================
// Vigie — Service Worker
// Cerveau de l'extension : écoute les onglets, appelle l'API,
// diffuse le verdict et met à jour le badge.
// ============================================================

import { VERDICT, BADGE, MSG, TIMING, PROTOCOLES_IGNORES } from "./lib/constants.js";
import * as Cache from "./lib/cache.js";
import * as API from "./lib/api.js";

// ============================================================
// 1. UTILITAIRES
// ============================================================

/**
 * Vérifie si une URL doit être analysée.
 * @param {string} url
 * @returns {boolean}
 */
function urlAnalysable(url) {
  if (!url) return false;
  if (PROTOCOLES_IGNORES.some(p => url.startsWith(p))) return false;
  return url.startsWith("http://") || url.startsWith("https://");
}

/**
 * Extrait le domaine racine d'une URL.
 * @param {string} url
 * @returns {string}
 */
function extraireDomaine(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

// ============================================================
// 2. NOTIFICATION SYSTÈME
// Utilisée quand le content script ne peut pas s'injecter
// (pages d'erreur Chrome : chrome-error://)
// ============================================================

function afficherNotification(data) {
  const verdict = data.verdict;

  const config = {
    [VERDICT.INEXISTANT]: {
      title: "🔌 Site inaccessible",
      message: `${data.domaine || "Ce site"} ne répond pas. Vérifiez l'URL.`
    },
    [VERDICT.CLONE]: {
      title: "🚨 Site frauduleux détecté",
      message: `${data.domaine || "Ce site"} semble être un clone. Ne saisissez rien.`
    },
    [VERDICT.VIEUX]: {
      title: "⚠️ Site non vérifié",
      message: `${data.domaine || "Ce site"} n'a pas pu être vérifié.`
    }
  };

  const c = config[verdict];
  if (!c) return;

  chrome.notifications.create(`vigie-${Date.now()}-${Math.random()}`, {
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: c.title,
    message: c.message,
    priority: verdict === VERDICT.CLONE ? 2 : 1,
    requireInteraction: false,
    silent: false
  });
}

// ============================================================
// 3. ÉCOUTE DES ONGLETS
// ============================================================

// 3.1 — Navigation complète
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;
  if (!urlAnalysable(tab.url)) return;
  await analyserOnglet(tabId, tab.url);
});

// 3.2 — Changement d'onglet actif
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (!urlAnalysable(tab.url)) return;
    await analyserOnglet(tab.id, tab.url);
  } catch (err) {
    console.warn("[Vigie] onActivated erreur :", err);
  }
});

// 3.3 — Au démarrage du service worker : analyser l'onglet actif
(async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && urlAnalysable(tab.url)) {
      await analyserOnglet(tab.id, tab.url);
    }
  } catch (err) {
    console.warn("[Vigie] Réveil erreur :", err);
  }
})();

// ============================================================
// 4. ANALYSE D'UN ONGLET
// ============================================================

async function analyserOnglet(tabId, url) {
  console.log("[Vigie] Analyse de :", url);

  // 1. Vérifier le cache
  const cached = Cache.get(url);
  if (cached) {
    console.log("[Vigie] Cache HIT");
    diffuserVerdict(tabId, cached);
    return;
  }

  // 2. Appeler l'API
  try {
    const ipObservee = await getIpObservee(tabId);
    console.log("[Vigie] IP observée :", ipObservee);

    const data = await API.predire({
      url,
      ip_observee: ipObservee,
      analyse_profonde: false
    });

    console.log("[Vigie] Réponse :", data.verdict);

    Cache.set(url, data);
    diffuserVerdict(tabId, data);
  } catch (err) {
    console.error("[Vigie] Erreur analyse :", err.message);

    const dataErreur = {
      verdict: VERDICT.INEXISTANT,
      verdict_message: "Le site n'a pas pu être vérifié.",
      domaine: extraireDomaine(url),
      probabilite_clone: 0
    };
    diffuserVerdict(tabId, dataErreur);
  }
}

// ============================================================
// 5. RÉCUPÉRATION DE L'IP OBSERVÉE (webRequest)
// ============================================================

function getIpObservee(tabId) {
  return new Promise((resolve) => {
    let resolved = false;

    const listener = (details) => {
      if (details.tabId === tabId && details.ip && !resolved) {
        resolved = true;
        chrome.webRequest.onCompleted.removeListener(listener);
        resolve(details.ip);
      }
    };

    chrome.webRequest.onCompleted.addListener(listener, {
      urls: ["<all_urls>"],
      types: ["main_frame"]
    });

    setTimeout(() => {
      if (!resolved) {
        chrome.webRequest.onCompleted.removeListener(listener);
        resolve(null);
      }
    }, TIMING.TIMEOUT_IP);
  });
}

// ============================================================
// 6. DIFFUSION DU VERDICT
// ============================================================

function diffuserVerdict(tabId, data) {
  // 1. Envoyer au content script
  chrome.tabs.sendMessage(tabId, {
    type: MSG.VERDICT,
    data
  }).catch(() => {
    // Content script non injectable (page d'erreur Chrome)
    // → notification système en secours
    afficherNotification(data);
  });

  // 2. Mettre à jour le badge
  mettreAJourBadge(tabId, data.verdict);
}

// ============================================================
// 7. BADGE DE L'ICÔNE
// ============================================================

function mettreAJourBadge(tabId, verdict) {
  const config = BADGE[verdict] || BADGE[VERDICT.INCONNU];

  chrome.action.setBadgeText({ tabId, text: config.text });
  chrome.action.setBadgeBackgroundColor({ tabId, color: config.color });
}

// ============================================================
// 8. SYNCHRONISATION WHITELIST HORS-LIGNE
// ============================================================

async function syncWhitelist() {
  try {
    const data = await API.getWhitelist();

    // Le backend retourne : { whitelist: [...], version, sha256, ... }
    const domaines = data.whitelist || data.domaines || [];

    await chrome.storage.local.set({
      whitelist: domaines,
      whitelist_version: data.version || null,
      whitelist_sha256: data.sha256 || null,
      whitelist_timestamp: Date.now()
    });

    console.log(`[Vigie] Whitelist synchronisée : ${domaines.length} domaines`);
  } catch (err) {
    console.warn("[Vigie] Sync whitelist échouée :", err.message);
  }
}

// ============================================================
// 9. MESSAGES DU POPUP
// ============================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // --- Récupérer le verdict de l'onglet actif
  if (message.type === MSG.GET_VERDICT) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        sendResponse(null);
        return;
      }
      const cached = Cache.get(tabs[0].url);
      sendResponse(cached || null);
    });
    return true;
  }

  // --- Forcer une ré-analyse
  if (message.type === MSG.REANALYSER) {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs[0]) {
        sendResponse({ ok: false });
        return;
      }

      Cache.remove(tabs[0].url);
      await analyserOnglet(tabs[0].id, tabs[0].url);
      sendResponse({ ok: true });
    });
    return true;
  }

  // --- Récupérer la whitelist
  if (message.type === MSG.GET_WHITELIST) {
    chrome.storage.local.get(["whitelist", "whitelist_timestamp"], (data) => {
      sendResponse(data);
    });
    return true;
  }

});

// ============================================================
// 10. CYCLE DE VIE
// ============================================================

// Sync whitelist au démarrage
chrome.runtime.onInstalled.addListener(syncWhitelist);
chrome.runtime.onStartup.addListener(syncWhitelist);

// Sync périodique
setInterval(syncWhitelist, TIMING.SYNC_WHITELIST);

// Nettoyage du cache toutes les minutes
setInterval(() => {
  const n = Cache.prune();
  if (n > 0) console.log(`[Vigie] Cache nettoyé : ${n} entrées supprimées`);
}, 60 * 1000);