// ============================================================
// Vigie — Content Script (autonome, sans import)
// ============================================================

(function() {
  "use strict";

  // ------------------------------------------------------------
  // Constantes (copiées depuis lib/constants.js)
  // ------------------------------------------------------------
  const VERDICT = {
    BON_SITE:   "bon_site",
    CLONE:      "clone",
    VIEUX:      "vieux",
    INEXISTANT: "inexistant",
    INCONNU:    "inconnu",
    ERREUR:     "erreur"
  };

  const TIMING = {
    COCHE_VERTE: 3000,
    DOUBLE_CLIC: 3000
  };

  const MSG = {
    VERDICT:    "VERDICT",
    REANALYSER: "REANALYSER"
  };

  // ------------------------------------------------------------
  // État global
  // ------------------------------------------------------------
  let cocheActive = null;
  let bandeauActif = null;

  // ------------------------------------------------------------
  // Écoute des messages du background
  // ------------------------------------------------------------
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === MSG.VERDICT) {
      gererVerdict(message.data);
    }
  });

  // ------------------------------------------------------------
  // Gestion du verdict
  // ------------------------------------------------------------
  function gererVerdict(data) {
    if (!data) return;

    const verdict = data.verdict || VERDICT.INCONNU;

    fermerBandeau();

    switch (verdict) {
      case VERDICT.BON_SITE:
        afficherCocheVerte(data);
        break;
      case VERDICT.CLONE:
        afficherBandeauClone(data);
        break;
      case VERDICT.VIEUX:
        afficherBandeauHorsLigne(data, "vieux");
        break;
      case VERDICT.INEXISTANT:
      case VERDICT.ERREUR:
      case VERDICT.INCONNU:
        afficherBandeauHorsLigne(data, "inexistant");
        break;

      default:
        break;
    
    }
  }

  // ------------------------------------------------------------
  // Coche verte (site vérifié)
  // ------------------------------------------------------------
  function afficherCocheVerte(data) {
    if (cocheActive) return;

    const coche = document.createElement("div");
    coche.id = "vigie-coche";
    coche.innerHTML = `
      <div class="vigie-coche-icone">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M5 12l5 5L20 7" stroke="#0F2A3F" stroke-width="3"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="vigie-coche-texte">
        <div class="vigie-coche-titre">Vigie est à vos côtés</div>
        <div class="vigie-coche-sous-titre">
          Site vérifié — ${echapper(data.domaine || "")}
        </div>
      </div>
    `;

    document.body.appendChild(coche);
    cocheActive = coche;

    requestAnimationFrame(() => coche.classList.add("vigie-visible"));

    setTimeout(() => {
      coche.classList.remove("vigie-visible");
      setTimeout(() => {
        coche.remove();
        cocheActive = null;
      }, 300);
    }, TIMING.COCHE_VERTE);
  }

  // ------------------------------------------------------------
  // Bandeau clone
  // ------------------------------------------------------------
  function afficherBandeauClone(data) {
  if (bandeauActif) return;

  const domaine = data.domaine || "";
  const domaineOfficiel = data.domaine_officiel || domaine;
  const score = Math.round((data.probabilite_clone || 0) * 100);

  const bandeau = document.createElement("div");
  bandeau.id = "vigie-bandeau";
  bandeau.className = "vigie-bandeau-clone";
  bandeau.innerHTML = `
    <div class="vigie-bandeau-contenu">
      <div class="vigie-bandeau-icone">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L1 21h22L12 2z" fill="#EF4444"/>
          <path d="M12 9v5M12 17h.01" stroke="#FFFFFF" stroke-width="2.5"
                stroke-linecap="round"/>
        </svg>
      </div>
      <div class="vigie-bandeau-texte">
        <div class="vigie-bandeau-titre">
          Vigie a détecté un site frauduleux
        </div>
        <div class="vigie-bandeau-message">
          Ce site imite <strong>${echapper(domaineOfficiel)}</strong>.
          Ne saisissez aucune information.
        </div>
        <div class="vigie-bandeau-detail">
          Score de danger : <strong>${score}%</strong>
        </div>
      </div>
      <div class="vigie-bandeau-boutons">
        <button id="vigie-btn-retour" class="vigie-btn vigie-btn-vert">
          🟢 Revenir en arrière
        </button>
        <button id="vigie-btn-continuer" class="vigie-btn vigie-btn-jaune">
          🟡 Continuer quand même
          <span class="vigie-badge-clics">2 clics</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(bandeau);
  bandeauActif = bandeau;

  requestAnimationFrame(() => bandeau.classList.add("vigie-visible"));

  // Bouton vert → revenir à la page précédente
  document.getElementById("vigie-btn-retour").addEventListener("click", () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Si pas d'historique, rediriger vers Google
      window.location.href = "https://www.google.cm";
    }
  });

  // Bouton jaune → double-clic
  configurerDoubleClic(
    document.getElementById("vigie-btn-continuer"),
    () => fermerBandeau()
  );
} 
  // ------------------------------------------------------------
  // Bandeau hors ligne
  // ------------------------------------------------------------
  function afficherBandeauHorsLigne(data, type) {
    if (bandeauActif) return;

    const estVieux = type === "vieux";
    const titre = estVieux ? "Ce site n'est pas vérifié" : "Ce site ne répond pas";
    const message = estVieux
      ? "Vigie n'a pas pu confirmer l'authenticité de ce site."
      : "Le site est peut-être hors ligne ou temporairement indisponible.";

    const bandeau = document.createElement("div");
    bandeau.id = "vigie-bandeau";
    bandeau.className = "vigie-bandeau-hors-ligne";
    bandeau.innerHTML = `
      <div class="vigie-bandeau-contenu">
        <div class="vigie-bandeau-icone">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#6B7280" stroke-width="2"/>
            <path d="M12 7v6M12 17h.01" stroke="#6B7280" stroke-width="2.5"
                  stroke-linecap="round"/>
          </svg>
        </div>
        <div class="vigie-bandeau-texte">
          <div class="vigie-bandeau-titre">${titre}</div>
          <div class="vigie-bandeau-message">${message}</div>
        </div>
        <div class="vigie-bandeau-boutons">
          <button id="vigie-btn-reessayer" class="vigie-btn vigie-btn-jaune">
            🟡 Réessayer
          </button>
          <button id="vigie-btn-ignorer" class="vigie-btn vigie-btn-gris">
            ⚪ Ignorer
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(bandeau);
    bandeauActif = bandeau;

    requestAnimationFrame(() => bandeau.classList.add("vigie-visible"));

    document.getElementById("vigie-btn-reessayer").addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: MSG.REANALYSER });
      fermerBandeau();
    });

    document.getElementById("vigie-btn-ignorer").addEventListener("click", () => {
      fermerBandeau();
    });
  }

  // ------------------------------------------------------------
  // Double-clic
  // ------------------------------------------------------------
  function configurerDoubleClic(bouton, callback) {
    let clics = 0;
    let timer = null;

    bouton.addEventListener("click", () => {
      clics++;
      if (clics === 1) {
        bouton.classList.add("vigie-attente");
        bouton.innerHTML = `🟡 Cliquez encore une fois pour confirmer`;
        timer = setTimeout(() => {
          clics = 0;
          bouton.classList.remove("vigie-attente");
          bouton.innerHTML = `🟡 Continuer quand même <span class="vigie-badge-clics">2 clics</span>`;
        }, TIMING.DOUBLE_CLIC);
      } else if (clics === 2) {
        clearTimeout(timer);
        callback();
      }
    });
  }

  // ------------------------------------------------------------
  // Fermeture
  // ------------------------------------------------------------
  function fermerBandeau() {
    if (!bandeauActif) return;
    bandeauActif.classList.remove("vigie-visible");
    const element = bandeauActif;
    bandeauActif = null;
    setTimeout(() => element.remove(), 300);
  }

  // ------------------------------------------------------------
  // Échappement HTML
  // ------------------------------------------------------------
  function echapper(texte) {
    const div = document.createElement("div");
    div.textContent = String(texte);
    return div.innerHTML;
  }

})();