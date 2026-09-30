import { Router } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import crypto from "crypto";
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


// ─── Installation : création du PREMIER administrateur ──────────────────────
// Possible uniquement tant qu'aucun admin n'existe. En production, protégé par SETUP_CODE
// (code secret défini dans les variables d'environnement) pour qu'un inconnu ne puisse pas
// prendre le contrôle de l'app en arrivant le premier sur l'URL.
const adminExists = () => !!db.prepare("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1").get();
let setupFailures: number[] = [];

router.get("/setup-status", (_req, res) => {
  const needsSetup = !adminExists();
  const requiresCode = process.env.NODE_ENV === "production";
  const enabled = needsSetup && (!requiresCode || !!process.env.SETUP_CODE);
  return res.json({ needsSetup: enabled, requiresCode });
});

router.post("/setup-admin", (req, res) => {
  const { setupCode, name, email, password, telephone } = req.body as {
    setupCode?: string; name?: string; email?: string; password?: string; telephone?: string;
  };

  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  setupFailures = setupFailures.filter((t) => t > oneHourAgo);
  if (setupFailures.length >= 10) {
    return res.status(429).json({ error: "Trop de tentatives. Réessayez plus tard." });
  }
  if (adminExists()) return res.status(409).json({ error: "Un administrateur existe déjà." });

  if (process.env.NODE_ENV === "production") {
    const expected = process.env.SETUP_CODE;
    if (!expected) return res.status(403).json({ error: "Installation désactivée (SETUP_CODE non défini)." });
    const a = Buffer.from(String(setupCode ?? ""));
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      setupFailures.push(Date.now());
      return res.status(403).json({ error: "Code d'installation incorrect." });
    }
  }

  if (!name || !email || !password) return res.status(400).json({ error: "name, email et password sont requis." });
  const passwordError = isPasswordStrong(password);
  if (passwordError) return res.status(400).json({ error: passwordError });

  const id = uuid();
  const cleanEmail = email.trim().toLowerCase();
  try {
    db.prepare(
      "INSERT INTO users (id, name, email, password_hash, role, telephone) VALUES (?, ?, ?, ?, 'admin', ?)"
    ).run(id, name.trim(), cleanEmail, bcrypt.hashSync(password, 10), telephone ?? null);
  } catch {
    return res.status(409).json({ error: "Un compte existe déjà avec cet email." });
  }
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow;
  const token = signToken({ id: user.id, role: user.role, storeId: null });
  return res.status(201).json({ token, user: publicUser(user) });
});

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
  if (process.env.NODE_ENV === "production") {
    // Aucun fournisseur SMS branché : on refuse plutôt que de fausser la vérification.
    return res.status(501).json({ error: "Vérification par SMS non disponible pour le moment." });
  }
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

// POST /api/auth/google — connexion/inscription via Google Identity Services
router.post("/google", async (req, res) => {
  const { idToken } = req.body as { idToken?: string };
  if (!idToken) return res.status(400).json({ error: "idToken est requis." });

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return res.status(500).json({ error: "Connexion Google non configurée côté serveur." });

  try {
    // On délègue la vérification de signature/expiration à Google elle-même via son
    // endpoint tokeninfo, pour éviter une dépendance supplémentaire côté serveur.
    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!verifyRes.ok) return res.status(401).json({ error: "Jeton Google invalide." });
    const payload = (await verifyRes.json()) as { aud?: string; email?: string; email_verified?: string; name?: string; sub?: string };

    if (payload.aud !== clientId) return res.status(401).json({ error: "Jeton Google destiné à une autre application." });
    if (payload.email_verified !== "true" || !payload.email) return res.status(401).json({ error: "Email Google non vérifié." });

    let user = db.prepare("SELECT * FROM users WHERE email = ?").get(payload.email) as UserRow | undefined;

    if (!user) {
      const id = uuid();
      const randomPasswordHash = bcrypt.hashSync(uuid() + uuid(), 10); // jamais utilisé pour se connecter, juste pour respecter le schéma
      db.prepare(
        `INSERT INTO users (id, name, email, password_hash, role, account_type) VALUES (?, ?, ?, ?, 'client', 'personal')`
      ).run(id, payload.name || payload.email.split("@")[0], payload.email, randomPasswordHash);
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow;
    }

    const token = signToken({ id: user.id, role: user.role, storeId: user.store_id });
    return res.json({ token, user: publicUser(user) });
  } catch {
    return res.status(500).json({ error: "Impossible de vérifier le jeton Google." });
  }
});

export default router;
