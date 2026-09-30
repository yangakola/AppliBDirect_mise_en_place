import { Router } from "express";
import { db } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.use(requireAuth, requireRole("admin"));

// GET /api/admin/stats
router.get("/stats", (_req, res) => {
  const ordersByStatus = db
    .prepare("SELECT status, COUNT(*) as count FROM orders GROUP BY status")
    .all() as { status: string; count: number }[];

  const revenue = db
    .prepare("SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE status = 'livrée'")
    .get() as { total: number };

  // Revenu réel de la plateforme (commission uniquement, pas le total encaissé qui inclut
  // la part des marchands et des livreurs)
  const platformRevenue = db
    .prepare("SELECT COALESCE(SUM(platform_fee), 0) as total FROM orders WHERE status = 'livrée'")
    .get() as { total: number };

  const usersByRole = db
    .prepare("SELECT role, COUNT(*) as count FROM users GROUP BY role")
    .all() as { role: string; count: number }[];

  const storesCount = (db.prepare("SELECT COUNT(*) as c FROM stores").get() as { c: number }).c;
  const openStoresCount = (db.prepare("SELECT COUNT(*) as c FROM stores WHERE is_open = 1").get() as { c: number }).c;
  const ordersTodayCount = (
    db.prepare("SELECT COUNT(*) as c FROM orders WHERE date(created_at) = date('now')").get() as { c: number }
  ).c;

  return res.json({
    ordersByStatus,
    revenueLivree: revenue.total,
    platformRevenue: platformRevenue.total,
    usersByRole,
    storesCount,
    openStoresCount,
    ordersTodayCount,
  });
});

// GET /api/admin/users?role=
router.get("/users", (req, res) => {
  const { role } = req.query as { role?: string };
  let sql = "SELECT id, name, email, role, store_id, telephone, account_type, created_at FROM users WHERE 1=1";
  const params: unknown[] = [];
  if (role) {
    sql += " AND role = ?";
    params.push(role);
  }
  const rows = db.prepare(sql).all(...params);
  return res.json({ users: rows });
});

export default router;
