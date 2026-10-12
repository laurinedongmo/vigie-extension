// ============================================================
// Vigie — Client API
// Communication avec le backend FastAPI
// ============================================================

import {
  API_PREDICT,
  API_WHITELIST,
  TIMING
} from "./constants.js";

// ------------------------------------------------------------
// Utilitaire : fetch avec timeout
// ------------------------------------------------------------
async function fetchAvecTimeout(url, options = {}, timeoutMs = TIMING.TIMEOUT_API) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

// ------------------------------------------------------------
// Analyse une URL via /predict
// @param {Object} params
// @param {string}      params.url
// @param {string|null} params.ip_observee
// @param {boolean}     params.analyse_profonde
// @param {boolean}     params.has_momo_form
// @param {boolean}     params.has_password_form
// @param {number}      params.html_length
// @returns {Promise<Object>}
// ------------------------------------------------------------
export async function predire({
  url,
  ip_observee = null,
  analyse_profonde = false,
  has_momo_form = false,
  has_password_form = false,
  html_length = 0
}) {
  const body = {
    url,
    seuil: 0.5,
    has_momo_form,
    has_password_form,
    html_length,
    ip_observee: ip_observee || "",  // ← string vide au lieu de null
    analyse_profonde,
    profils: ["bot", "android", "ios"]
  };

  const response = await fetchAvecTimeout(API_PREDICT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }, 30000);  // ← 30 secondes au lieu de 15

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Vigie] Erreur API :", response.status, errorText);
    throw new Error(`API /predict ${response.status}`);
  }

  return response.json();
}

// ------------------------------------------------------------
// Récupère la whitelist hors-ligne
// @returns {Promise<Object>}
// ------------------------------------------------------------
export async function getWhitelist() {
  const response = await fetchAvecTimeout(API_WHITELIST, {
    method: "GET"
  });

  if (!response.ok) {
    throw new Error(`API /whitelist ${response.status}`);
  }

  return response.json();
}

// ------------------------------------------------------------
// Vérifie si le backend est joignable
// @returns {Promise<boolean>}
// ------------------------------------------------------------
export async function ping() {
  try {
    const response = await fetchAvecTimeout(
      `${API_PREDICT.replace("/predict", "/docs")}`,
      { method: "HEAD" },
      3000
    );
    return response.ok;
  } catch {
    return false;
  }
}