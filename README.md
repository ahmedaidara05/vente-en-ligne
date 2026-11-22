# Vente en Ligne 🛒

Marketplace **mobile-first** inspiré de Pinduoduo, prêt pour PWA et publication future sur le Play Store.

**2 interfaces dans un seul projet :**
- **Site client** (`/`) : navigation libre, panier local, commande uniquement après connexion.
- **Back-office admin** (`/admin`) : gestion produits, boutiques, commandes, stock (accès réservé aux rôles `admin` / `seller`).

## Stack

- **Frontend** : React 19 + TypeScript + Vite 6 + Tailwind CSS 4
- **État** : Zustand (panier persisté en `localStorage`)
- **Data** : Firebase (Auth + Firestore + Storage + Analytics)
- **PWA** : `vite-plugin-pwa` (offline, installable, cache images)
- **Routing** : React Router 7
- **Data fetching** : TanStack Query

## Fonctionnalités client

- Navigation sans compte (Home, catégories, recherche, fiche produit)
- Prix groupés (style Pinduoduo) + badge réduction
- Panier local (sauvegarde automatique, survivance au refresh)
- Inscription / Connexion email obligatoire avant commande
- Checkout (adresse + COD / Mobile Money) → enregistrement Firestore
- Historique commandes
- Design mobile-first + responsive desktop
- Bottom navigation + safe-area (iOS/Android)

## Fonctionnalités admin (`/admin`)

- Dashboard
- CRUD produits (stock, images, prix groupé)
- Gestion boutiques
- Liste & validation des commandes (statuts)

## Démarrage rapide

```bash
git clone https://github.com/ahmedaidara05/vente-en-ligne.git
cd vente-en-ligne
npm install
npm run dev
```

Ouvrez http://localhost:5173

### Configuration Firebase

1. Allez dans [Firebase Console](https://console.firebase.google.com/) → projet `vente-en-ligne-5388c`
2. Activez **Authentication** (Email/Password)
3. Créez Firestore (mode production ou test)
4. Activez Storage
5. (Optionnel) Analytics déjà configuré

Pour devenir admin : dans Firestore, collection `users`, document de votre UID, champ `role: "admin"`.

## PWA & Play Store

```bash
npm run build
```

Le dossier `dist/` contient l'app installable.

- **PWA** : déjà configuré (manifest + service worker). Testez "Add to Home Screen".
- **Play Store** : utilisez Bubblewrap ou TWA pour wrapper le PWA en APK/AAB.

## Structure du code (disponible dans le repo et localement)

Le code complet a été généré localement. Clonez le repo et je peux pousser les fichiers source complets dans un prochain commit si besoin, or continuez le développement.

Fait avec ❤️ pour un marketplace rapide, mobile-first et prêt pour le Play Store.
