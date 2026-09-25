import jwt from "jsonwebtoken";
import { AuthUser } from "../types";

const isProd = process.env.NODE_ENV === "production";
if (isProd && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  throw new Error("JWT_SECRET est obligatoire en production (32 caractères minimum).");
}
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-secret-not-for-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export function signToken(payload: AuthUser): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): AuthUser {
  return jwt.verify(token, JWT_SECRET) as AuthUser;
}
