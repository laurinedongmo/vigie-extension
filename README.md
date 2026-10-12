# 🛡️ Vigie — Anti-Phishing Cameroun

> **Votre tranquillité, sous surveillance.**

Extension Chrome qui protège les utilisateurs contre le phishing, le typosquatting et l'usurpation d'identité visuelle sur les domaines camerounais (`.cm` et `.gov.cm`).

---

## 📋 Table des matières

- [Présentation](#-présentation)
- [Fonctionnalités](#-fonctionnalités)
- [Architecture](#-architecture)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Utilisation](#-utilisation)
- [Structure du projet](#-structure-du-projet)
- [Développement](#-développement)
- [Tests](#-tests)
- [Sécurité](#-sécurité)
- [Roadmap](#-roadmap)
- [Licence](#-licence)

---

## 🎯 Présentation

**Vigie** est une extension Chrome qui analyse en temps réel chaque site visité et affiche un verdict clair :

| Verdict | Signification | Affichage |
|---------|---------------|-----------|
| ✅ `bon_site` | Site vérifié et sûr | Coche verte (3 secondes) |
| 🚨 `clone` | Site frauduleux détecté | Bandeau rouge en bas |
| ⚠️ `vieux` | Site ancien ou non vérifié | Bandeau orange en bas |
| 🔌 `inexistant` | Domaine inexistant ou hors ligne | Notification système |

L'extension s'appuie sur un backend FastAPI (`237_Safe_Check V5`) hébergé sur **Hugging Face Spaces** qui combine :
- Vérification **DNSSEC** + **DoT**
- Analyse **lexicale** (Levenshtein, Jaro-Winkler, homoglyphes)
- **Scraping** multi-profils (Bot, Android, iOS)
- **Threat Intelligence** (GSB, PhishTank, OpenPhish)
- **Machine Learning** (Random Forest)
- **Comparaison visuelle** (pHash)

---

## ✨ Fonctionnalités

### 🔍 Analyse automatique
- Analyse **chaque onglet** dès qu'il est chargé
- **Cache** de 5 minutes pour éviter de spammer l'API
- Ré-analyse **manuelle** via le popup

### 🎨 Affichage intelligent
- **Coche verte** — confirmation visuelle discrète (3 secondes)
- **Bandeau clone** — alerte rouge avec 2 boutons :
  - 🟢 *Aller au bon site* (redirection vers le site officiel)
  - 🟡 *Continuer quand même* (double-clic obligatoire)
- **Bandeau hors ligne** — information neutre avec :
  - 🟡 *Réessayer* (relance l'analyse)
  - ⚪ *Ignorer* (ferme le bandeau)
- **Notification système** — pour les pages d'erreur Chrome

### 📱 Popup interactif
- Verdict détaillé du site actif
- Score de danger (%)
- Liste des signaux détectés
- Boutons *Réanalyser* et *Signaler*

### 🔒 Sécurité
- **Aucun tracking** des utilisateurs
- **Aucune donnée personnelle** envoyée
- **Protection XSS** (échappement HTML systématique)

---

## 🏗️ Architecture
┌─────────────────────────────────────────────────────────────┐
│ CHROME (navigateur) │
│ │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ BACKGROUND (service worker) │ │
│ │ → Écoute les onglets │ │
│ │ → Appelle l'API /predict │ │
│ │ → Gère le cache et le badge │ │
│ └───────────────────────────────────────────────────────┘ │
│ ↕ │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ CONTENT SCRIPT (content.js) │ │
│ │ → Injecté dans chaque page │ │
│ │ → Affiche coche + bandeaux │ │
│ └───────────────────────────────────────────────────────┘ │
│ ↕ │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ POPUP (popup.html + popup.js) │ │
│ │ → Interface au clic sur l'icône │ │
│ └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
↓
┌─────────────────────────────────────────────────────────────┐
│ BACKEND FastAPI (237_Safe_Check ) │
│ https://sidikompagnie-vigie-api.hf.space/predict │
└─────────────────────────────────────────────────────────────┘

text

---

## 🚀 Installation

### Prérequis

- **Google Chrome** (version 88+)
- **Connexion Internet** (le backend est hébergé sur Hugging Face)

### Étapes

1. **Clone le dépôt**
   ```bash
   git clone https://github.com/<ton-user>/vigie-extension.git
   cd vigie-extension
Ouvre Chrome et va sur :

text
chrome://extensions/
Active le mode développeur (toggle en haut à droite)

Clique sur "Charger l'extension non empaquetée"

Sélectionne le dossier vigie-extension/

Vérifie que l'extension apparaît avec l'icône 🛡️

⚙️ Configuration
URL du backend
Par défaut, l'extension pointe vers le backend hébergé sur Hugging Face :

javascript
export const API_BASE_URL = "https://sidikompagnie-vigie-api.hf.space";
Pour changer l'URL (ex: développement local), modifie lib/constants.js :

javascript
// Développement local
export const API_BASE_URL = "http://localhost:8000";

// Production (Hugging Face)
export const API_BASE_URL = "https://sidikompagnie-vigie-api.hf.space";
📖 Utilisation
Analyse automatique
Navigue vers n'importe quel site

L'extension analyse en arrière-plan

Le verdict s'affiche automatiquement

Consulter le verdict
Clique sur l'icône Vigie dans la barre Chrome pour voir :

Le verdict du site actif

Le score de danger

Les signaux détectés

Les actions disponibles

Ré-analyser un site
Dans le popup, clique sur "🔄 Réanalyser".

Signaler un site suspect
Dans le popup, clique sur "🚨 Signaler".

📁 Structure du projet
text
vigie-extension/
├── manifest.json              # Configuration Manifest V3
├── background.js              # Service worker
├── content/
│   ├── content.js             # Script injecté dans les pages
│   └── content.css            # Styles des bandeaux
├── popup/
│   ├── popup.html             # Interface du popup
│   ├── popup.css              # Styles du popup
│   └── popup.js               # Logique du popup
├── lib/
│   ├── constants.js           # Constantes globales
│   ├── cache.js               # Cache des verdicts
│   └── api.js                 # Client API
├── icons/
│   ├── icon.svg               # Source SVG
│   ├── icon16.png             # Icône 16x16
│   ├── icon48.png             # Icône 48x48
│   └── icon128.png            # Icône 128x128
└── README.md                  # Ce fichier
💻 Développement
Modifier l'extension
Modifie les fichiers dans vigie-extension/

Va sur chrome://extensions/

Clique sur ↻ Actualiser sur la carte Vigie

Recharge la page pour voir les changements

Logs du service worker
chrome://extensions/

Clique sur "Service Worker" sous Vigie

La console DevTools s'ouvre

Logs du content script
Va sur n'importe quel site

F12 → Console

Cherche les messages [Vigie]

Tester l'API directement
Dans la console du service worker :

javascript
fetch("https://sidikompagnie-vigie-api.hf.space/predict", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url: "https://minfi.cm", seuil: 0.5 })
})
.then(r => r.json())
.then(console.log);
🧪 Tests
Checklist de validation
#	Test	Statut
1	Extension chargée sans erreur	⬜
2	Coche verte sur site vérifié	⬜
3	Bandeau rouge sur site clone	⬜
4	Bandeau gris sur site hors ligne	⬜
5	Notification système sur page d'erreur	⬜
6	Popup s'ouvre au clic	⬜
7	Bouton "Réanalyser" fonctionne	⬜
8	Bouton "Signaler" fonctionne	⬜
9	Badge change selon verdict	⬜
10	Cache fonctionne (2e visite rapide)	⬜
Sites de test
URL	Verdict attendu
https://minfi.cm	bon_site
https://ubacameroon.com	bon_site
https://abk.com	inexistant
https://site-fantome-12345.cm	inexistant
🔒 Sécurité
Ce que l'extension fait
✅ Analyse les URLs visitées

✅ Envoie les URLs au backend pour analyse

✅ Affiche des avertissements visuels

Ce que l'extension ne fait PAS
❌ Ne collecte aucune donnée personnelle

❌ N'envoie pas l'historique de navigation

❌ N'accède pas aux mots de passe ou formulaires

❌ Ne modifie pas le contenu des sites

Permissions utilisées
Permission	Rôle
tabs	Écouter les changements d'onglet
storage	Stocker les préférences locales
webRequest	Capturer l'IP observée
activeTab	Accéder à l'onglet actif
notifications	Afficher les alertes système
🗺️ Roadmap
Version 5.1
□ Mode sombre pour le popup
□ Historique des sites analysés
□ Export des statistiques en JSON
Version 5.2
□ Support multi-langues (FR + EN)
□ Page d'options (paramètres utilisateur)
□ Whitelist personnelle
Version 6.0
□ Support Firefox
□ Support Edge
□ Synchronisation cloud des préférences
🤝 Contribution
Les contributions sont les bienvenues !

Fork le projet

Crée une branche (git checkout -b feature/ma-feature)

Commit (git commit -m 'Ajout de ma feature')

Push (git push origin feature/ma-feature)

Ouvre une Pull Request

📄 Licence
Ce projet est sous licence MIT. Voir le fichier LICENSE pour plus de détails.

📞 Contact
Auteur : DONGMO NGUETSOP Laurie

Email : dongmolaurie@gmail.com

Projet : 237_Safe_Check 

Backend : FastAPI + Random Forest + Playwright

Hébergement : Hugging Face Spaces
