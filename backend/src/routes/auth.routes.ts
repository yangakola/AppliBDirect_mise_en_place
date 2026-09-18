import { Router } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { db } from "../db";
import { signToken } from "../utils/jwt";
import { requireAuth } from "../middleware/auth";
import { AccountType, UserRole, UserRow } from "../types";

const router = Router();

function roleFromAccountType(accountType: AccountType): UserRole {
  if (accountType === "merchant_pro") return "merchant";
  if (accountType === "driver_pro") return "driver";
  return "client";
}

function publicUser(u: UserRow) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    storeId: u.store_id ?? undefined,
    telephone: u.telephone ?? undefined,
    avatar: u.avatar ?? undefined,
    accountType: u.account_type ?? undefined,
  };
}

function isPasswordStrong(pwd: string): string | null {
  if (pwd.length < 8) return "Le mot de passe doit contenir au moins 8 caractères.";
  if (!/[a-z]/.test(pwd)) return "Le mot de passe doit contenir au moins une minuscule.";
  if (!/[A-Z]/.test(pwd)) return "Le mot de passe doit contenir au moins une majuscule.";
  if (!/[0-9]/.test(pwd)) return "Le mot de passe doit contenir au moins un chiffre.";
  if (!/[^A-Za-z0-9]/.test(pwd)) return "Le mot de passe doit contenir au moins un caractère spécial (ex: ! ? # @ _ -).";
  return null;
}

// POST /api/auth/register
router.post("/register", (req, res) => {
  const { name, email, password, telephone, accountType } = req.body as {
    name?: string;
    email?: string;
    password?: string;
    telephone?: string;
    accountType?: AccountType;
  };

  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email et password sont requis." });
  }
  const passwordError = isPasswordStrong(password);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    return res.status(409).json({ error: "Un compte existe déjà avec cet email." });
  }

  const type: AccountType = accountType || "personal";
  const role = roleFromAccountType(type);
  const id = uuid();
  const passwordHash = bcrypt.hashSync(password, 10);

  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, role, telephone, account_type)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, name, email, passwordHash, role, telephone || null, type);

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow;
  const token = signToken({ id: user.id, role: user.role, storeId: user.store_id });

  return res.status(201).json({ token, user: publicUser(user) });
});

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    return res.status(400).json({ error: "email et password sont requis." });
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as UserRow | undefined;
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Email ou mot de passe incorrect." });
  }

  const token = signToken({ id: user.id, role: user.role, storeId: user.store_id });
  return res.json({ token, user: publicUser(user) });
});

// GET /api/auth/me
router.get("/me", requireAuth, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user!.id) as UserRow | undefined;
  if (!user) return res.status(404).json({ error: "Utilisateur introuvable." });
  return res.json({ user: publicUser(user) });
});

// ─── OTP (vérification par SMS) ─────────────────────────────────────────────
// Implémentation simulée : aucun SMS n'est réellement envoyé. Pour la production,
// brancher ici un fournisseur SMS (ex: Twilio, Vonage, ou une passerelle locale
// compatible RCA) et ne plus renvoyer `devCode` dans la réponse.
const otpStore = new Map<string, { code: string; expiresAt: number }>();

router.post("/otp/request", (req, res) => {
  const { telephone } = req.body as { telephone?: string };
  if (!telephone) return res.status(400).json({ error: "telephone est requis." });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(telephone, { code, expiresAt: Date.now() + 5 * 60 * 1000 });

  // TODO production: envoyer `code` par SMS via un fournisseur, et retirer devCode de la réponse.
  return res.json({ message: "Code envoyé.", devCode: code });
});

router.post("/otp/verify", (req, res) => {
  const { telephone, code } = req.body as { telephone?: string; code?: string };
  if (!telephone || !code) return res.status(400).json({ error: "telephone et code sont requis." });

  const entry = otpStore.get(telephone);
  if (!entry || entry.code !== code || entry.expiresAt < Date.now()) {
    return res.status(400).json({ error: "Code invalide ou expiré." });
  }
  otpStore.delete(telephone);
  return res.json({ verified: true });
});

export default router;
