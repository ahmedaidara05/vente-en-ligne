/**
 * Cloud Functions — setAdminRole + createOrder (prix/stock serveur) + recalculateOrderOnCreate (sécurité prix)
 * Deploy: firebase deploy --only functions
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

exports.setAdminRole = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Non authentifié');
  const caller = await db.collection('users').doc(context.auth.uid).get();
  if (!caller.exists || !['superadmin', 'admin'].includes(caller.data().role))
    throw new functions.https.HttpsError('permission-denied', 'Droits insuffisants');
  const { uid, role } = data;
  if (!uid || !['superadmin', 'admin', 'manager', 'stock', 'orders', 'client', 'customer'].includes(role))
    throw new functions.https.HttpsError('invalid-argument', 'Paramètres invalides');
  await admin.auth().setCustomUserClaims(uid, { role });
  await db.collection('users').doc(uid).set({ role, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  return { success: true, uid, role };
});

function unitPriceFromProduct(p, variants) {
  let unit = (p.promoPrice != null && p.promoPrice < p.price) ? Number(p.promoPrice) : Number(p.price || 0);
  for (const g of (p.variantGroups || [])) {
    const label = (variants || {})[g.name];
    if (!label || !g.options) continue;
    const opt = g.options.find((o) => o.label === label);
    if (opt && opt.priceDelta != null) unit += Number(opt.priceDelta) || 0;
  }
  return unit < 0 ? 0 : unit;
}

exports.createOrder = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Connecte-toi pour commander');
  const { items, customer, notes, shippingFee } = data || {};
  if (!items || !items.length) throw new functions.https.HttpsError('invalid-argument', 'Panier vide');
  if (!customer || !customer.name || !customer.phone || !customer.address)
    throw new functions.https.HttpsError('invalid-argument', 'Coordonnées manquantes');

  return db.runTransaction(async (tx) => {
    const productSnaps = {};
    const byBoutique = {};
    for (const item of items) {
      if (!item.productId || !item.qty || item.qty < 1)
        throw new functions.https.HttpsError('invalid-argument', 'Ligne panier invalide');
      const pRef = db.collection('products').doc(item.productId);
      let pSnap = productSnaps[item.productId];
      if (!pSnap) { pSnap = await tx.get(pRef); productSnaps[item.productId] = pSnap; }
      if (!pSnap.exists) throw new functions.https.HttpsError('not-found', 'Produit introuvable');
      const p = pSnap.data();
      if (p.published === false)
        throw new functions.https.HttpsError('failed-precondition', (p.name || 'Produit') + ' non disponible');
      const qty = Math.floor(Number(item.qty));
      if ((p.stock || 0) < qty)
        throw new functions.https.HttpsError('failed-precondition', 'Stock insuffisant pour ' + (p.name || item.productId));
      const unitPrice = unitPriceFromProduct(p, item.variants || item.selectedVariants || {});
      const boutiqueId = p.boutiqueId || item.boutiqueId || null;
      const key = boutiqueId || '_none';
      if (!byBoutique[key]) byBoutique[key] = { boutiqueId, lines: [], stockUpdates: {} };
      byBoutique[key].lines.push({
        productId: item.productId, name: p.name || '', price: unitPrice, qty,
        variants: item.variants || item.selectedVariants || {},
        image: (p.images && p.images[0]) || '', boutiqueId, boutiqueName: p.boutiqueName || ''
      });
      byBoutique[key].stockUpdates[item.productId] = (byBoutique[key].stockUpdates[item.productId] || 0) + qty;
    }
    const globalStock = {};
    for (const key of Object.keys(byBoutique)) {
      for (const pid of Object.keys(byBoutique[key].stockUpdates))
        globalStock[pid] = (globalStock[pid] || 0) + byBoutique[key].stockUpdates[pid];
    }
    for (const pid of Object.keys(globalStock)) {
      const p = productSnaps[pid].data();
      const newStock = (p.stock || 0) - globalStock[pid];
      if (newStock < 0) throw new functions.https.HttpsError('failed-precondition', 'Stock insuffisant');
      tx.update(db.collection('products').doc(pid), { stock: newStock, sold: (p.sold || 0) + globalStock[pid] });
    }
    const ship = Number(shippingFee) || 0;
    const orderIds = [];
    Object.keys(byBoutique).forEach((key, idx) => {
      const group = byBoutique[key];
      const subtotal = group.lines.reduce((s, l) => s + l.price * l.qty, 0);
      const shipping = idx === 0 ? ship : 0;
      const total = subtotal + shipping;
      const orderNumber = 'CMD-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
      const orderRef = db.collection('orders').doc();
      
      // Détermine si un acompte est exigé pour positionner le bon statut initial
      let hasPrepayment = false;
      group.lines.forEach(l => {
        // Optionnel: si besoin de détecter un acompte basé sur les produits du groupe
      });

      tx.set(orderRef, {
        orderNumber, userId: context.auth.uid, boutiqueId: group.boutiqueId,
        customer: { name: String(customer.name).slice(0, 120), phone: String(customer.phone).slice(0, 40),
          address: String(customer.address).slice(0, 300), email: context.auth.token.email || customer.email || '' },
        items: group.lines, subtotal, shipping, total, status: 'pending',
        notes: notes ? String(notes).slice(0, 500) : '',
        statusHistory: [{ status: 'pending', at: new Date().toISOString(), by: 'customer' }],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      orderIds.push({ orderId: orderRef.id, orderNumber, total, boutiqueId: group.boutiqueId });
    });
    return { ok: true, orders: orderIds };
  });
});

/**
 * Double sécurité additionnelle : Recalcule et vérifie les montants côté serveur 
 * lors de la création d'une commande pour contrer toute manipulation client.
 */
exports.recalculateOrderOnCreate = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snapshot, context) => {
    const orderData = snapshot.data();
    const items = orderData.items || [];
    
    let serverSubtotal = 0;

    for (const item of items) {
      if (!item.productId) continue;
      
      const productRef = db.collection('products').doc(item.productId);
      const productSnap = await productRef.get();
      
      if (!productSnap.exists) continue;
      const productData = productSnap.data();

      // Utilise la fonction de calcul unitaire existante pour la cohérence des prix et variantes
      const officialUnit = unitPriceFromProduct(productData, item.variants || {});
      const qty = parseInt(item.qty) || 1;
      
      serverSubtotal += officialUnit * qty;
    }

    const shipping = parseFloat(orderData.shipping) || 0;
    const serverTotal = serverSubtotal + shipping;

    if (serverTotal !== orderData.total || serverSubtotal !== orderData.subtotal) {
      await snapshot.ref.update({
        subtotal: serverSubtotal,
        total: serverTotal,
        serverVerified: true,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`Commande ${context.params.orderId} recalculée et sécurisée par le serveur.`);
    }
  });
