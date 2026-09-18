import Database from "better-sqlite3";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_FILE = process.env.DATABASE_FILE || "./data.db";

export const db = new Database(path.resolve(process.cwd(), DATABASE_FILE));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('client','merchant','driver','admin')),
      store_id TEXT,
      telephone TEXT,
      avatar TEXT,
      account_type TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stores (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('restaurant','pharmacie','marche','boutique','express')),
      category TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      rating REAL NOT NULL DEFAULT 5,
      rating_count INTEGER NOT NULL DEFAULT 0,
      delivery_time TEXT NOT NULL DEFAULT '20-40 min',
      delivery_fee INTEGER NOT NULL DEFAULT 500,
      cover_image TEXT,
      description TEXT,
      quartier TEXT NOT NULL,
      is_open INTEGER NOT NULL DEFAULT 1,
      open_hours TEXT,
      merchant_id TEXT NOT NULL,
      address TEXT,
      FOREIGN KEY (merchant_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      description TEXT,
      image TEXT,
      available INTEGER NOT NULL DEFAULT 1,
      category TEXT,
      stock INTEGER NOT NULL DEFAULT 0,
      unit TEXT,
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL,
      store_name TEXT NOT NULL,
      store_type TEXT NOT NULL,
      client_id TEXT NOT NULL,
      client_name TEXT NOT NULL,
      driver_id TEXT,
      driver_name TEXT,
      status TEXT NOT NULL DEFAULT 'nouvelle',
      subtotal INTEGER NOT NULL,
      delivery_fee INTEGER NOT NULL,
      total INTEGER NOT NULL,
      platform_fee INTEGER NOT NULL DEFAULT 0,
      merchant_payout INTEGER NOT NULL DEFAULT 0,
      driver_earning INTEGER NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'pending',
      delivery_nom TEXT NOT NULL,
      delivery_quartier TEXT NOT NULL,
      delivery_adresse TEXT NOT NULL,
      delivery_repere TEXT,
      delivery_telephone TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (store_id) REFERENCES stores(id),
      FOREIGN KEY (client_id) REFERENCES users(id),
      FOREIGN KEY (driver_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      price INTEGER NOT NULL,
      qty INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      order_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);
    CREATE INDEX IF NOT EXISTS idx_orders_client ON orders(client_id);
    CREATE INDEX IF NOT EXISTS idx_orders_store ON orders(store_id);
    CREATE INDEX IF NOT EXISTS idx_orders_driver ON orders(driver_id);
    CREATE INDEX IF NOT EXISTS idx_notifs_user ON notifications(user_id);
  `);
}
