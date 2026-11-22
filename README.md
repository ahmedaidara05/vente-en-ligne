# Vente en Ligne — Marketplace E-commerce + Admin

Marketplace **réelle et fonctionnelle** (mobile-first) + back-office d’administration, connectés à Firebase.

## Fichiers principaux

| Fichier | Description |
|---------|-------------|
| `index.html` | **Site client** — boutique complète (catalogue, fiches, panier, auth, commandes) |
| `admin.html` | **Back-office** — produits, commandes, stocks, boutiques, catégories, stats |
| `manifest.json` / `sw.js` | PWA (installable, cache) |
| `firestore.rules` / `storage.rules` | Règles de sécurité |
| `firebase.json` | Config Hosting + Firestore + Storage |

## Démarrage rapide

1. **Ouvrir le site client** : ouvrez `index.html` (ou déployez sur Firebase Hosting / GitHub Pages).
2. **Ouvrir l’admin** : ouvrez `admin.html`.

### Configuration Firebase obligatoire

1. Allez sur [Firebase Console](https://console.firebase.google.com/) → projet `vente-en-ligne-5388c`
2. **Authentication** → activez **Email/Password**
3. **Firestore** → créez la base (mode production) et **déployez les règles** :
   ```bash
   firebase deploy --only firestore:rules,storage
   ```
4. **Storage** → activez et déployez `storage.rules`
5. **Index** : déployez aussi les index :
   ```bash
   firebase deploy --only firestore:indexes
   ```

### Créer le premier administrateur

1. Créez un compte normal sur le **site client** (inscription).
2. Dans Firebase Console → Authentication, copiez l’**UID** de l’utilisateur.
3. Dans Firestore, collection `users`, document = UID, ajoutez/modifiez le champ :
   ```
   role: "admin"
   ```
   (ou `superadmin`)
4. Reconnectez-vous sur `admin.html`.

Vous pouvez aussi utiliser le bouton « Attribuer rôle admin » dans **Paramètres** de l’admin (une fois connecté avec un premier admin).

### Premier contenu

Depuis **admin.html** :

1. Créez une **catégorie**
2. Créez une **boutique**
3. Créez un **produit** (avec stock, images URL ou upload, prix)
4. Publiez-le

Le produit apparaît immédiatement sur le site client.

## Parcours de test recommandé

1. Admin → créer catégorie + boutique + produit (stock > 0, publié)
2. Client → voir le produit sur l’accueil / catalogue
3. Client → ajouter au panier (panier conservé en localStorage)
4. Client → inscription / connexion
5. Client → passer commande (adresse + confirmation)
6. Admin → voir la commande, changer le statut (Confirmée → Expédiée…)
7. Vérifier que le stock a bien diminué
8. Annuler une commande → stock restitué

## Sécurité

- Les règles Firestore/Storage **ne sont pas ouvertes**.
- Un simple champ `role` côté client n’est **pas** suffisant en production longue durée : préférez **Custom Claims** via Cloud Functions pour les rôles admin.
- Les prix et stocks sont **revérifiés** côté client au moment de la commande (idéal = Cloud Function transactionnelle).

## Déploiement

### Firebase Hosting

```bash
npm i -g firebase-tools
firebase login
firebase use vente-en-ligne-5388c
firebase deploy
```

### GitHub Pages

Poussez le contenu à la racine d’un repo et activez GitHub Pages (branche `main` / root).

## PWA

Les deux pages sont installables (Add to Home Screen). Service Worker + manifest inclus.

## Coûts Firebase

- Spark (gratuit) : adapté au démarrage (limites de lectures/écritures).
- Blaze (pay-as-you-go) : nécessaire pour Cloud Functions et volumes plus importants.

## Structure des collections Firestore

- `users` — profils + rôle
- `products` — produits (published, stock, images, variants…)
- `categories`
- `stores`
- `orders` — commandes + statusHistory
- `inventoryMovements` — historique des mouvements de stock
- `settings/general` — devise, frais de livraison, nom

---

**Important** : ce n’est pas une maquette. Les opérations CRUD, le panier, les commandes et la mise à jour des stocks sont réellement branchés sur Firebase.
