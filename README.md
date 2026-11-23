# Vente en ligne (IDUS)

Marketplace e-commerce. See index.html, boutique.html, admin.html.

**Latest fix (local + this commit):**
- Product images stored on Cloudflare R2 only (HTTPS URL in Firestore — no data-URL, avoids 1MB limit)
- Back from chat returns to boutique/product (history keeps page ids)

Redeploy Cloudflare Worker (`cloudflare-worker-videos.js`) for correct image Content-Type.
