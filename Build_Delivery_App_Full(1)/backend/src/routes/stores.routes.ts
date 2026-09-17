import { Router } from "express";
import { v4 as uuid } from "uuid";
import { db } from "../db";
import { requireAuth, requireRole, optionalAuth } from "../middleware/auth";
import { StoreRow, StoreType } from "../types";

const router = Router();

function publicStore(s: StoreRow) {
  return {
    id: s.id,
    name: s.name,
    type: s.type,
    category: s.category,
    tags: JSON.parse(s.tags || "[]"),
    rating: s.rating,
    ratingCount: s.rating_count,
    deliveryTime: s.delivery_time,
    deliveryFee: s.delivery_fee,
    coverImage: s.cover_image,
    description: s.description,
    quartier: s.quartier,
    isOpen: !!s.is_open,
    openHours: s.open_hours,
    merchantId: s.merchant_id,
    address: s.address,
  };
}

// GET /api/stores?type=&quartier=&search=
router.get("/", optionalAuth, (req, res) => {
  const { type, quartier, search } = req.query as { type?: string; quartier?: string; search?: string };

  let sql = "SELECT * FROM stores WHERE 1=1";
  const params: unknown[] = [];

  if (type) {
    sql += " AND type = ?";
    params.push(type);
  }
  if (quartier) {
    sql += " AND quartier = ?";
    params.push(quartier);
  }
  if (search) {
    sql += " AND (name LIKE ? OR category LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  const rows = db.prepare(sql).all(...params) as StoreRow[];
  return res.json({ stores: rows.map(publicStore) });
});

// GET /api/stores/:id
router.get("/:id", (req, res) => {
  const store = db.prepare("SELECT * FROM stores WHERE id = ?").get(req.params.id) as StoreRow | undefined;
  if (!store) return res.status(404).json({ error: "Boutique introuvable." });
  return res.json({ store: publicStore(store) });
});

// POST /api/stores — un marchand crée sa boutique
router.post("/", requireAuth, requireRole("merchant", "admin"), (req, res) => {
  const {
    name, type, category, tags, deliveryTime, deliveryFee,
    coverImage, description, quartier, openHours, address,
  } = req.body as Partial<{
    name: string; type: StoreType; category: string; tags: string[];
    deliveryTime: string; deliveryFee: number; coverImage: string;
    description: string; quartier: string; openHours: string; address: string;
  }>;

  if (!name || !type || !category || !quartier) {
    return res.status(400).json({ error: "name, type, category et quartier sont requis." });
  }

  const id = uuid();
  db.prepare(
    `INSERT INTO stores (id, name, type, category, tags, rating, rating_count, delivery_time,
      delivery_fee, cover_image, description, quartier, is_open, open_hours, merchant_id, address)
     VALUES (?, ?, ?, ?, ?, 5, 0, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
  ).run(
    id, name, type, category, JSON.stringify(tags || []), deliveryTime || "20-40 min",
    deliveryFee ?? 500, coverImage || "", description || "", quartier, openHours || "",
    req.user!.id, address || ""
  );

  // On lie la boutique au compte marchand créateur
  db.prepare("UPDATE users SET store_id = ? WHERE id = ?").run(id, req.user!.id);

  const store = db.prepare("SELECT * FROM stores WHERE id = ?").get(id) as StoreRow;
  return res.status(201).json({ store: publicStore(store) });
});

function assertOwnStoreOrAdmin(req: import("express").Request, storeId: string) {
  if (req.user!.role === "admin") return true;
  return req.user!.storeId === storeId;
}

// PUT /api/stores/:id — modifier sa boutique
router.put("/:id", requireAuth, requireRole("merchant", "admin"), (req, res) => {
  const store = db.prepare("SELECT * FROM stores WHERE id = ?").get(req.params.id) as StoreRow | undefined;
  if (!store) return res.status(404).json({ error: "Boutique introuvable." });
  if (!assertOwnStoreOrAdmin(req, store.id)) {
    return res.status(403).json({ error: "Vous ne gérez pas cette boutique." });
  }

  const fields = req.body as Partial<{
    name: string; category: string; tags: string[]; deliveryTime: string; deliveryFee: number;
    coverImage: string; description: string; quartier: string; openHours: string; address: string;
  }>;

  const merged: StoreRow = {
    ...store,
    name: fields.name ?? store.name,
    category: fields.category ?? store.category,
    tags: fields.tags ? JSON.stringify(fields.tags) : store.tags,
    delivery_time: fields.deliveryTime ?? store.delivery_time,
    delivery_fee: fields.deliveryFee ?? store.delivery_fee,
    cover_image: fields.coverImage ?? store.cover_image,
    description: fields.description ?? store.description,
    quartier: fields.quartier ?? store.quartier,
    open_hours: fields.openHours ?? store.open_hours,
    address: fields.address ?? store.address,
  };

  db.prepare(
    `UPDATE stores SET name=?, category=?, tags=?, delivery_time=?, delivery_fee=?, cover_image=?,
      description=?, quartier=?, open_hours=?, address=? WHERE id=?`
  ).run(
    merged.name, merged.category, merged.tags, merged.delivery_time, merged.delivery_fee,
    merged.cover_image, merged.description, merged.quartier, merged.open_hours, merged.address,
    store.id
  );

  return res.json({ store: publicStore(merged) });
});

// PATCH /api/stores/:id/toggle-open — ouvrir/fermer sa boutique
router.patch("/:id/toggle-open", requireAuth, requireRole("merchant", "admin"), (req, res) => {
  const store = db.prepare("SELECT * FROM stores WHERE id = ?").get(req.params.id) as StoreRow | undefined;
  if (!store) return res.status(404).json({ error: "Boutique introuvable." });
  if (!assertOwnStoreOrAdmin(req, store.id)) {
    return res.status(403).json({ error: "Vous ne gérez pas cette boutique." });
  }

  const newState = store.is_open ? 0 : 1;
  db.prepare("UPDATE stores SET is_open = ? WHERE id = ?").run(newState, store.id);
  return res.json({ store: publicStore({ ...store, is_open: newState }) });
});

export default router;
