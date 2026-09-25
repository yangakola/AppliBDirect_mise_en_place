import { Router } from "express";
import { v4 as uuid } from "uuid";
import { db } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";
import { ProductRow, StoreRow } from "../types";

const router = Router();

function publicProduct(p: ProductRow) {
  return {
    id: p.id,
    storeId: p.store_id,
    name: p.name,
    price: p.price,
    description: p.description,
    image: p.image,
    available: !!p.available,
    category: p.category,
    stock: p.stock,
    unit: p.unit ?? undefined,
  };
}

// GET /api/products?storeId=&category=
router.get("/", (req, res) => {
  const { storeId, category } = req.query as { storeId?: string; category?: string };
  let sql = "SELECT * FROM products WHERE 1=1";
  const params: unknown[] = [];
  if (storeId) {
    sql += " AND store_id = ?";
    params.push(storeId);
  }
  if (category) {
    sql += " AND category = ?";
    params.push(category);
  }
  const rows = db.prepare(sql).all(...params) as ProductRow[];
  return res.json({ products: rows.map(publicProduct) });
});

// GET /api/products/:id
router.get("/:id", (req, res) => {
  const p = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id) as ProductRow | undefined;
  if (!p) return res.status(404).json({ error: "Produit introuvable." });
  return res.json({ product: publicProduct(p) });
});

function ownsStore(req: import("express").Request, storeId: string) {
  if (req.user!.role === "admin") return true;
  return req.user!.storeId === storeId;
}

// POST /api/products — un marchand ajoute un produit à sa boutique
router.post("/", requireAuth, requireRole("merchant", "admin"), (req, res) => {
  const { storeId, name, price, description, image, category, stock, unit } = req.body as Partial<{
    storeId: string; name: string; price: number; description: string; image: string;
    category: string; stock: number; unit: string;
  }>;

  if (!storeId || !name || price == null) {
    return res.status(400).json({ error: "storeId, name et price sont requis." });
  }

  const store = db.prepare("SELECT * FROM stores WHERE id = ?").get(storeId) as StoreRow | undefined;
  if (!store) return res.status(404).json({ error: "Boutique introuvable." });
  if (!ownsStore(req, storeId)) return res.status(403).json({ error: "Vous ne gérez pas cette boutique." });

  const id = uuid();
  db.prepare(
    `INSERT INTO products (id, store_id, name, price, description, image, available, category, stock, unit)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
  ).run(id, storeId, name, price, description || "", image || "", category || "", stock ?? 0, unit || null);

  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(id) as ProductRow;
  return res.status(201).json({ product: publicProduct(product) });
});

// PUT /api/products/:id
router.put("/:id", requireAuth, requireRole("merchant", "admin"), (req, res) => {
  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id) as ProductRow | undefined;
  if (!product) return res.status(404).json({ error: "Produit introuvable." });
  if (!ownsStore(req, product.store_id)) return res.status(403).json({ error: "Vous ne gérez pas cette boutique." });

  const fields = req.body as Partial<{
    name: string; price: number; description: string; image: string;
    available: boolean; category: string; stock: number; unit: string;
  }>;

  const merged: ProductRow = {
    ...product,
    name: fields.name ?? product.name,
    price: fields.price ?? product.price,
    description: fields.description ?? product.description,
    image: fields.image ?? product.image,
    available: fields.available === undefined ? product.available : fields.available ? 1 : 0,
    category: fields.category ?? product.category,
    stock: fields.stock ?? product.stock,
    unit: fields.unit ?? product.unit,
  };

  db.prepare(
    `UPDATE products SET name=?, price=?, description=?, image=?, available=?, category=?, stock=?, unit=? WHERE id=?`
  ).run(
    merged.name, merged.price, merged.description, merged.image, merged.available,
    merged.category, merged.stock, merged.unit, product.id
  );

  return res.json({ product: publicProduct(merged) });
});

// DELETE /api/products/:id
router.delete("/:id", requireAuth, requireRole("merchant", "admin"), (req, res) => {
  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id) as ProductRow | undefined;
  if (!product) return res.status(404).json({ error: "Produit introuvable." });
  if (!ownsStore(req, product.store_id)) return res.status(403).json({ error: "Vous ne gérez pas cette boutique." });

  db.prepare("DELETE FROM products WHERE id = ?").run(product.id);
  return res.json({ deleted: true });
});

export default router;
