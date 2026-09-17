import { Router } from "express";
import { v4 as uuid } from "uuid";
import { db } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  OrderRow, OrderItemRow, ProductRow, StoreRow, OrderStatus, PaymentMethod,
} from "../types";

const router = Router();

function publicOrder(o: OrderRow, items: OrderItemRow[]) {
  return {
    id: o.id,
    storeId: o.store_id,
    storeName: o.store_name,
    storeType: o.store_type,
    clientId: o.client_id,
    clientName: o.client_name,
    driverId: o.driver_id ?? undefined,
    driverName: o.driver_name ?? undefined,
    status: o.status,
    subtotal: o.subtotal,
    deliveryFee: o.delivery_fee,
    total: o.total,
    platformFee: o.platform_fee,
    merchantPayout: o.merchant_payout,
    driverEarning: o.driver_earning,
    paymentMethod: o.payment_method,
    paymentStatus: o.payment_status,
    delivery: {
      nom: o.delivery_nom,
      quartier: o.delivery_quartier,
      adresse: o.delivery_adresse,
      repere: o.delivery_repere,
      telephone: o.delivery_telephone,
    },
    note: o.note ?? undefined,
    createdAt: o.created_at,
    items: items.map((it) => ({
      productId: it.product_id,
      name: it.product_name,
      price: it.price,
      qty: it.qty,
    })),
  };
}

function getItems(orderId: string): OrderItemRow[] {
  return db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(orderId) as OrderItemRow[];
}

function nextOrderId(): string {
  const row = db.prepare("SELECT id FROM orders ORDER BY rowid DESC LIMIT 1").get() as { id: string } | undefined;
  const lastNum = row ? parseInt(row.id.replace("CMD-", ""), 10) || 0 : 0;
  return `CMD-${String(lastNum + 1).padStart(3, "0")}`;
}

function notify(userId: string, title: string, body: string, orderId?: string) {
  db.prepare(
    `INSERT INTO notifications (id, user_id, title, body, read, order_id) VALUES (?, ?, ?, ?, 0, ?)`
  ).run(uuid(), userId, title, body, orderId || null);
}

// POST /api/orders — un client passe commande
router.post("/", requireAuth, requireRole("client", "admin"), (req, res) => {
  const { storeId, items, paymentMethod, delivery, note } = req.body as {
    storeId?: string;
    items?: { productId: string; qty: number }[];
    paymentMethod?: PaymentMethod;
    delivery?: { nom: string; quartier: string; adresse: string; repere?: string; telephone: string };
    note?: string;
  };

  if (!storeId || !items?.length || !paymentMethod || !delivery) {
    return res.status(400).json({ error: "storeId, items, paymentMethod et delivery sont requis." });
  }
  if (!delivery.nom || !delivery.quartier || !delivery.adresse || !delivery.telephone) {
    return res.status(400).json({ error: "Informations de livraison incomplètes." });
  }

  const store = db.prepare("SELECT * FROM stores WHERE id = ?").get(storeId) as StoreRow | undefined;
  if (!store) return res.status(404).json({ error: "Boutique introuvable." });
  if (!store.is_open) return res.status(400).json({ error: "Cette boutique est actuellement fermée." });

  // On calcule les montants côté serveur à partir des prix réels en base (ne jamais faire confiance
  // aux prix envoyés par le client) et on vérifie le stock disponible.
  const resolvedItems: { product: ProductRow; qty: number }[] = [];
  for (const it of items) {
    if (!it.productId || !it.qty || it.qty < 1) {
      return res.status(400).json({ error: "Chaque article doit avoir un productId et une quantité valide." });
    }
    const product = db.prepare("SELECT * FROM products WHERE id = ?").get(it.productId) as ProductRow | undefined;
    if (!product || product.store_id !== storeId) {
      return res.status(400).json({ error: `Produit ${it.productId} introuvable dans cette boutique.` });
    }
    if (!product.available) {
      return res.status(400).json({ error: `${product.name} n'est plus disponible.` });
    }
    if (product.stock < it.qty) {
      return res.status(400).json({ error: `Stock insuffisant pour ${product.name} (disponible: ${product.stock}).` });
    }
    resolvedItems.push({ product, qty: it.qty });
  }

  const subtotal = resolvedItems.reduce((sum, it) => sum + it.product.price * it.qty, 0);
  const total = subtotal + store.delivery_fee;

  // Commission plateforme : prélevée sur le sous-total (part du marchand), les frais de
  // livraison reviennent intégralement au livreur. C'est le mécanisme de revenu de l'app.
  const commissionRate = Number(process.env.PLATFORM_COMMISSION_RATE ?? 0.10);
  const platformFee = Math.round(subtotal * commissionRate);
  const merchantPayout = subtotal - platformFee;
  const driverEarning = store.delivery_fee;

  const orderId = nextOrderId();
  const clientId = req.user!.id;
  const client = db.prepare("SELECT name FROM users WHERE id = ?").get(clientId) as { name: string };

  const createOrder = db.transaction(() => {
    db.prepare(
      `INSERT INTO orders (id, store_id, store_name, store_type, client_id, client_name, status,
        subtotal, delivery_fee, total, platform_fee, merchant_payout, driver_earning,
        payment_method, payment_status,
        delivery_nom, delivery_quartier, delivery_adresse, delivery_repere, delivery_telephone, note)
       VALUES (?, ?, ?, ?, ?, ?, 'nouvelle', ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)`
    ).run(
      orderId, store.id, store.name, store.type, clientId, client.name,
      subtotal, store.delivery_fee, total, platformFee, merchantPayout, driverEarning, paymentMethod,
      delivery.nom, delivery.quartier, delivery.adresse, delivery.repere || "", delivery.telephone, note || null
    );

    for (const it of resolvedItems) {
      db.prepare(
        `INSERT INTO order_items (id, order_id, product_id, product_name, price, qty) VALUES (?, ?, ?, ?, ?, ?)`
      ).run(uuid(), orderId, it.product.id, it.product.name, it.product.price, it.qty);

      db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?").run(it.qty, it.product.id);
    }

    notify(store.merchant_id, "Nouvelle commande !", `Commande ${orderId} reçue de ${client.name}.`, orderId);
  });

  createOrder();

  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId) as OrderRow;
  return res.status(201).json({ order: publicOrder(order, getItems(orderId)) });
});

// GET /api/orders — liste filtrée selon le rôle
router.get("/", requireAuth, (req, res) => {
  const { status } = req.query as { status?: OrderStatus };
  const user = req.user!;

  let sql = "SELECT * FROM orders WHERE 1=1";
  const params: unknown[] = [];

  if (user.role === "client") {
    sql += " AND client_id = ?";
    params.push(user.id);
  } else if (user.role === "merchant") {
    sql += " AND store_id = ?";
    params.push(user.storeId);
  } else if (user.role === "driver") {
    // Le livreur voit ses propres courses + les commandes prêtes non encore assignées
    sql += " AND (driver_id = ? OR (status = 'prête' AND driver_id IS NULL))";
    params.push(user.id);
  }
  // admin : aucun filtre supplémentaire

  if (status) {
    sql += " AND status = ?";
    params.push(status);
  }
  sql += " ORDER BY created_at DESC";

  const rows = db.prepare(sql).all(...params) as OrderRow[];
  const orders = rows.map((o) => publicOrder(o, getItems(o.id)));
  return res.json({ orders });
});

function canViewOrder(user: { id: string; role: string; storeId?: string | null }, order: OrderRow) {
  if (user.role === "admin") return true;
  if (user.role === "client") return order.client_id === user.id;
  if (user.role === "merchant") return order.store_id === user.storeId;
  if (user.role === "driver") return order.driver_id === user.id || (order.status === "prête" && !order.driver_id);
  return false;
}

// GET /api/orders/:id
router.get("/:id", requireAuth, (req, res) => {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id) as OrderRow | undefined;
  if (!order) return res.status(404).json({ error: "Commande introuvable." });
  if (!canViewOrder(req.user!, order)) return res.status(403).json({ error: "Accès refusé à cette commande." });
  return res.json({ order: publicOrder(order, getItems(order.id)) });
});

// POST /api/orders/:id/assign — un livreur se propose pour une course prête
router.post("/:id/assign", requireAuth, requireRole("driver"), (req, res) => {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id) as OrderRow | undefined;
  if (!order) return res.status(404).json({ error: "Commande introuvable." });
  if (order.status !== "prête" || order.driver_id) {
    return res.status(400).json({ error: "Cette commande n'est plus disponible." });
  }

  const driver = db.prepare("SELECT name FROM users WHERE id = ?").get(req.user!.id) as { name: string };
  db.prepare("UPDATE orders SET driver_id = ?, driver_name = ? WHERE id = ?").run(req.user!.id, driver.name, order.id);
  notify(order.client_id, "Livreur en route", `${driver.name} a pris en charge votre commande ${order.id}.`, order.id);

  const updated = db.prepare("SELECT * FROM orders WHERE id = ?").get(order.id) as OrderRow;
  return res.json({ order: publicOrder(updated, getItems(order.id)) });
});

// Transitions de statut autorisées par rôle
const MERCHANT_TRANSITIONS: Record<string, OrderStatus[]> = {
  nouvelle: ["acceptée", "annulée"],
  acceptée: ["préparation", "annulée"],
  préparation: ["prête", "annulée"],
};
const DRIVER_TRANSITIONS: Record<string, OrderStatus[]> = {
  prête: ["livraison"],
  livraison: ["livrée"],
};

// PATCH /api/orders/:id/status
router.patch("/:id/status", requireAuth, requireRole("merchant", "driver", "admin"), (req, res) => {
  const { status } = req.body as { status?: OrderStatus };
  if (!status) return res.status(400).json({ error: "status est requis." });

  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id) as OrderRow | undefined;
  if (!order) return res.status(404).json({ error: "Commande introuvable." });

  const user = req.user!;
  if (user.role === "merchant") {
    if (order.store_id !== user.storeId) return res.status(403).json({ error: "Vous ne gérez pas cette boutique." });
    const allowed = MERCHANT_TRANSITIONS[order.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Transition ${order.status} → ${status} non autorisée pour un marchand.` });
    }
  } else if (user.role === "driver") {
    if (order.driver_id !== user.id) return res.status(403).json({ error: "Cette course ne vous est pas assignée." });
    const allowed = DRIVER_TRANSITIONS[order.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Transition ${order.status} → ${status} non autorisée pour un livreur.` });
    }
  }
  // admin : toute transition est permise

  const paymentStatus = status === "livrée" && order.payment_method === "cash" ? "paid" : order.payment_status;
  db.prepare("UPDATE orders SET status = ?, payment_status = ? WHERE id = ?").run(status, paymentStatus, order.id);

  const STATUS_LABELS: Record<string, string> = {
    "acceptée": "acceptée par le commerçant",
    "préparation": "en cours de préparation",
    "prête": "prête, un livreur va la récupérer",
    "livraison": "en cours de livraison",
    "livrée": "livrée ✓",
    "annulée": "annulée",
  };
  notify(order.client_id, "Mise à jour de commande", `Votre commande ${order.id} est ${STATUS_LABELS[status] || status}.`, order.id);

  const updated = db.prepare("SELECT * FROM orders WHERE id = ?").get(order.id) as OrderRow;
  return res.json({ order: publicOrder(updated, getItems(order.id)) });
});

// GET /api/orders/earnings/me — total des gains d'un livreur (courses livrées)
router.get("/earnings/me", requireAuth, requireRole("driver"), (req, res) => {
  const row = db
    .prepare(
      `SELECT COUNT(*) as deliveries, COALESCE(SUM(driver_earning), 0) as total
       FROM orders WHERE driver_id = ? AND status = 'livrée'`
    )
    .get(req.user!.id) as { deliveries: number; total: number };
  return res.json({ deliveries: row.deliveries, totalEarnings: row.total });
});

export default router;
