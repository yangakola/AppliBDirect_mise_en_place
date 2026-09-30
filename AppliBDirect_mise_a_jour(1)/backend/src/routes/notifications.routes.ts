import { Router } from "express";
import { db } from "../db";
import { requireAuth } from "../middleware/auth";
import { NotifRow } from "../types";

const router = Router();

function publicNotif(n: NotifRow) {
  return {
    id: n.id,
    userId: n.user_id,
    title: n.title,
    body: n.body,
    read: !!n.read,
    orderId: n.order_id ?? undefined,
    createdAt: n.created_at,
  };
}

// GET /api/notifications
router.get("/", requireAuth, (req, res) => {
  const rows = db
    .prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC")
    .all(req.user!.id) as NotifRow[];
  return res.json({ notifications: rows.map(publicNotif) });
});

// PATCH /api/notifications/:id/read
router.patch("/:id/read", requireAuth, (req, res) => {
  const notif = db.prepare("SELECT * FROM notifications WHERE id = ?").get(req.params.id) as NotifRow | undefined;
  if (!notif) return res.status(404).json({ error: "Notification introuvable." });
  if (notif.user_id !== req.user!.id) return res.status(403).json({ error: "Accès refusé." });

  db.prepare("UPDATE notifications SET read = 1 WHERE id = ?").run(notif.id);
  return res.json({ notification: publicNotif({ ...notif, read: 1 }) });
});

// PATCH /api/notifications/read-all
router.patch("/read-all", requireAuth, (req, res) => {
  db.prepare("UPDATE notifications SET read = 1 WHERE user_id = ?").run(req.user!.id);
  return res.json({ ok: true });
});

export default router;
