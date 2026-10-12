// ============================================================
// Vigie — Cache des verdicts
// Évite de spammer l'API pour la même URL dans un court laps de temps
// ============================================================

import { TIMING } from "./constants.js";

// ------------------------------------------------------------
// Cache en mémoire (Map : url → { data, timestamp })
// ------------------------------------------------------------
const memo = new Map();

// ------------------------------------------------------------
// Récupère un verdict en cache s'il est encore valide
// @param {string} url
// @returns {Object|null}
// ------------------------------------------------------------
export function get(url) {
  const entry = memo.get(url);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > TIMING.CACHE_VERDICT) {
    memo.delete(url);
    return null;
  }

  return entry.data;
}

// ------------------------------------------------------------
// Stocke un verdict en cache
// @param {string} url
// @param {Object} data
// ------------------------------------------------------------
export function set(url, data) {
  memo.set(url, {
    data,
    timestamp: Date.now()
  });
}

// ------------------------------------------------------------
// Supprime une entrée spécifique
// @param {string} url
// ------------------------------------------------------------
export function remove(url) {
  memo.delete(url);
}

// ------------------------------------------------------------
// Vide tout le cache
// ------------------------------------------------------------
export function clear() {
  memo.clear();
}

// ------------------------------------------------------------
// Nettoie les entrées expirées (appelé périodiquement)
// ------------------------------------------------------------
export function prune() {
  const now = Date.now();
  let supprimees = 0;

  for (const [url, entry] of memo.entries()) {
    if (now - entry.timestamp > TIMING.CACHE_VERDICT) {
      memo.delete(url);
      supprimees++;
    }
  }

  return supprimees;
}

// ------------------------------------------------------------
// Statistiques du cache (utile pour le debug)
// ------------------------------------------------------------
export function stats() {
  return {
    taille: memo.size,
    urls: Array.from(memo.keys())
  };
}