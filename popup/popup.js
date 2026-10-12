// ============================================================
// Vigie — Popup
// Affiche le verdict de l'onglet actif et gère les actions
// ============================================================

import { VERDICT, MSG, BADGE } from "../lib/constants.js";

// ============================================================
// 1. ÉLÉMENTS DOM
// ============================================================

const $ = (id) => document.getElementById(id);

const elements = {
  statut:        $("vigie-statut"),
  statutIcone:   $("vigie-statut-icone"),
  statutTitre:   $("vigie-statut-titre"),
  statutDomaine: $("vigie-statut-domaine"),
  detailScore:   $("vigie-detail-score"),
  detailVerdict: $("vigie-detail-verdict"),
  detailTemps:   $("vigie-detail-temps"),
  raisons:       $("vigie-raisons"),
  raisonsListe:  $("vigie-raisons-liste"),
  btnReanalyser: $("vigie-btn-reanalyser"),
  btnSignaler:   $("vigie-btn-signaler"),
  footerWhitelist: $("vigie-footer-whitelist")
};

// ============================================================
// 2. ICÔNES SVG PAR VERDICT
// ============================================================

const ICONES = {
  [VERDICT.BON_SITE]: `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M5 12l5 5L20 7" stroke="#0F2A3F" stroke-width="3"
            stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  [VERDICT.CLONE]: `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L1 21h22L12 2z" fill="#FFFFFF"/>
      <path d="M12 9v5M12 17h.01" stroke="#EF4444" stroke-width="2.5"
            stroke-linecap="round"/>
    </svg>`,
  [VERDICT.VIEUX]: `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#FFFFFF" stroke-width="2"/>
      <path d="M12 7v6M12 17h.01" stroke="#FFFFFF" stroke-width="2.5"
            stroke-linecap="round"/>
    </svg>`,
  [VERDICT.INEXISTANT]: `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#FFFFFF" stroke-width="2"/>
      <path d="M15 9l-6 6M9 9l6 6" stroke="#FFFFFF" stroke-width="2"
            stroke-linecap="round"/>
    </svg>`,
  [VERDICT.ERREUR]: `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#FFFFFF" stroke-width="2"/>
      <path d="M12 8v4M12 16h.01" stroke="#FFFFFF" stroke-width="2"
            stroke-linecap="round"/>
    </svg>`,
  [VERDICT.INCONNU]: `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#FFFFFF" stroke-width="2"/>
      <path d="M12 8v4M12 16h.01" stroke="#FFFFFF" stroke-width="2"
            stroke-linecap="round"/>
    </svg>`
};

// ============================================================
// 3. LIBELLÉS PAR VERDICT
// ============================================================

const TITRES = {
  [VERDICT.BON_SITE]:   "Site vérifié",
  [VERDICT.CLONE]:      "Site frauduleux détecté",
  [VERDICT.VIEUX]:      "Site ancien ou non vérifié",
  [VERDICT.INEXISTANT]: "Domaine inexistant",
  [VERDICT.ERREUR]:     "Service indisponible",
  [VERDICT.INCONNU]:    "Analyse en cours…"
};

// ============================================================
// 4. INITIALISATION
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
  await chargerVerdict();
  await chargerWhitelistInfo();
  brancherActions();
});

// ============================================================
// 5. CHARGER LE VERDICT DE L'ONGLET ACTIF
// ============================================================

async function chargerVerdict() {
  chrome.runtime.sendMessage({ type: MSG.GET_VERDICT }, (data) => {
    if (chrome.runtime.lastError) {
      afficherVerdict(VERDICT.ERREUR, { domaine: "—" });
      return;
    }
    afficherVerdict(data?.verdict || VERDICT.INCONNU, data || {});
  });

  // Récupérer le domaine de l'onglet actif
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) {
    try {
      const domaine = new URL(tab.url).hostname;
      elements.statutDomaine.textContent = domaine;
    } catch {
      elements.statutDomaine.textContent = "—";
    }
  }
}

// ============================================================
// 6. AFFICHER LE VERDICT
// ============================================================

function afficherVerdict(verdict, data) {
  // --- Carte de statut
  elements.statut.className = `vigie-statut vigie-statut-${verdict}`;
  elements.statutIcone.innerHTML = ICONES[verdict] || ICONES[VERDICT.INCONNU];
  elements.statutTitre.textContent = TITRES[verdict] || TITRES[VERDICT.INCONNU];

  if (data.domaine) {
    elements.statutDomaine.textContent = data.domaine;
  }

  // --- Détails
  const score = calculerScore(data);
  elements.detailScore.textContent = score;
  elements.detailVerdict.textContent = verdict;
  elements.detailTemps.textContent = new Date().toLocaleTimeString("fr-FR");

  // --- Raisons
  if (Array.isArray(data.raisons) && data.raisons.length > 0) {
    elements.raisons.hidden = false;
    elements.raisonsListe.innerHTML = data.raisons
      .map(r => `<li>${echapper(r)}</li>`)
      .join("");
  } else {
    elements.raisons.hidden = true;
  }
}

// ============================================================
// 7. CALCUL DU SCORE DE DANGER
// ============================================================

function calculerScore(data) {
  const proba = data.probabilite_clone ?? 0;
  return `${Math.round(proba * 100)}%`;
}

// ============================================================
// 8. CHARGER LES INFOS WHITELIST
// ============================================================

async function chargerWhitelistInfo() {
  chrome.storage.local.get(["whitelist"], (data) => {
    const nb = data.whitelist?.length || 0;
    elements.footerWhitelist.textContent = `Whitelist : ${nb} domaines`;
  });
}

// ============================================================
// 9. ACTIONS
// ============================================================

function brancherActions() {
  // --- Réanalyser
  elements.btnReanalyser.addEventListener("click", () => {
    elements.btnReanalyser.disabled = true;
    elements.statutTitre.textContent = "Analyse en cours…";

    chrome.runtime.sendMessage({ type: MSG.REANALYSER }, () => {
      setTimeout(() => {
        elements.btnReanalyser.disabled = false;
        chargerVerdict();
      }, 1500);
    });
  });

  // --- Signaler (désactivé pour l'instant)
  if (elements.btnSignaler) {
    elements.btnSignaler.addEventListener("click", async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        chrome.tabs.create({
          url: `http://localhost:8000/signaler?url=${encodeURIComponent(tab.url)}`
        });
      }
    });
  }
}

// ============================================================
// 10. UTILITAIRE : ÉCHAPPEMENT HTML
// ============================================================

function echapper(texte) {
  const div = document.createElement("div");
  div.textContent = String(texte);
  return div.innerHTML;
}