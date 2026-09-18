import jwt from "jsonwebtoken";
import { AuthUser } from "../types";

const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export function signToken(payload: AuthUser): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): AuthUser {
  return jwt.verify(token, JWT_SECRET) as AuthUser;
}
