// ============================================================
// Vigie — Constantes globales
// Toutes les valeurs partagées entre background, content, popup
// ============================================================

// ------------------------------------------------------------
// API — Backend FastAPI
// ------------------------------------------------------------
export const API_BASE_URL = "https://sidikompagnie-vigie-api.hf.space";
export const API_PREDICT = `${API_BASE_URL}/predict`;
export const API_WHITELIST = `${API_BASE_URL}/extension/whitelist-offline`;

// ------------------------------------------------------------
// Verdicts possibles (alignés sur le backend)
// ------------------------------------------------------------
export const VERDICT = Object.freeze({
  BON_SITE:   "bon_site",
  CLONE:      "clone",
  VIEUX:      "vieux",
  INEXISTANT: "inexistant",
  INCONNU:    "inconnu",
  ERREUR:     "erreur"
});

// ------------------------------------------------------------
// Niveaux de danger (alignés sur le backend)
// ------------------------------------------------------------
export const NIVEAU = Object.freeze({
  INCONNU:  "inconnu",
  FAIBLE:   "faible",
  MOYEN:    "moyen",
  ELEVE:    "eleve",
  CRITIQUE: "critique"
});

// ------------------------------------------------------------
// Durées (millisecondes)
// ------------------------------------------------------------
export const TIMING = Object.freeze({
  COCHE_VERTE:    3000,
  CACHE_VERDICT:  5 * 60 * 1000,
  SYNC_WHITELIST: 6 * 60 * 60 * 1000,
  DOUBLE_CLIC:    3000,
  TIMEOUT_IP:     3000,
  TIMEOUT_API:    60000  // ← 60 sec (l'analyse peut être longue)
});

// ------------------------------------------------------------
// Badges de l'icône Chrome
// ------------------------------------------------------------
export const BADGE = Object.freeze({
  [VERDICT.BON_SITE]:   { text: "✓", color: "#22C55E" },
  [VERDICT.CLONE]:      { text: "!", color: "#EF4444" },
  [VERDICT.VIEUX]:      { text: "?", color: "#F59E0B" },
  [VERDICT.INEXISTANT]: { text: "×", color: "#6B7280" },
  [VERDICT.ERREUR]:     { text: "…", color: "#9CA3AF" },
  [VERDICT.INCONNU]:    { text: "",  color: "#9CA3AF" }
});

// ------------------------------------------------------------
// Messages entre scripts (background ↔ content ↔ popup)
// ------------------------------------------------------------
export const MSG = Object.freeze({
  VERDICT:        "VERDICT",           // background → content
  GET_VERDICT:    "GET_VERDICT_ACTIF", // popup → background
  REANALYSER:     "REANALYSER",        // popup → background
  GET_WHITELIST:  "GET_WHITELIST"      // popup → background
});

// ------------------------------------------------------------
// Protocoles ignorés (on n'analyse pas ces URLs)
// ------------------------------------------------------------
export const PROTOCOLES_IGNORES = Object.freeze([
  "chrome://",
  "chrome-extension://",
  "edge://",
  "about:",
  "file://",
  "view-source:",
  "data:",
  "blob:",
  "javascript:"
]);

// ------------------------------------------------------------
// Thème Vigie (couleurs utilisées dans content.css et popup.css)
// ------------------------------------------------------------
export const THEME = Object.freeze({
  NUIT:            "#0F2A3F",
  NUIT_CLAIR:      "#1A3A52",
  MENTHE:          "#A8E6A3",
  MENTHE_FONCE:    "#7DD87A",
  FOND:            "#F7F7F2",
  BLANC:           "#FFFFFF",
  VERT:            "#22C55E",
  ROUGE:           "#EF4444",
  ORANGE:          "#F59E0B",
  GRIS:            "#6B7280",
  TEXTE:           "#0F2A3F",
  TEXTE_SECONDAIRE:"#6B7280",
  BORDURE:         "#E5E7EB"
});