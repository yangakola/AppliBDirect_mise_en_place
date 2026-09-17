export type UserRole = "client" | "merchant" | "driver" | "admin";
export type AccountType = "personal" | "merchant_pro" | "driver_pro";
export type StoreType = "restaurant" | "pharmacie" | "marche" | "boutique" | "express";
export type OrderStatus =
  | "nouvelle"
  | "acceptée"
  | "préparation"
  | "prête"
  | "livraison"
  | "livrée"
  | "annulée";
export type PaymentMethod = "orange_money" | "airtel_money" | "cash";
export type PaymentStatus = "pending" | "paid" | "failed";

// Ordre de progression normal d'une commande (utilisé pour valider les transitions de statut)
export const STATUS_FLOW: OrderStatus[] = [
  "nouvelle",
  "acceptée",
  "préparation",
  "prête",
  "livraison",
  "livrée",
];

export interface AuthUser {
  id: string;
  role: UserRole;
  storeId?: string | null;
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  store_id: string | null;
  telephone: string | null;
  avatar: string | null;
  account_type: AccountType | null;
  created_at: string;
}

export interface StoreRow {
  id: string;
  name: string;
  type: StoreType;
  category: string;
  tags: string; // JSON string
  rating: number;
  rating_count: number;
  delivery_time: string;
  delivery_fee: number;
  cover_image: string;
  description: string;
  quartier: string;
  is_open: number; // 0/1
  open_hours: string;
  merchant_id: string;
  address: string;
}

export interface ProductRow {
  id: string;
  store_id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  available: number; // 0/1
  category: string;
  stock: number;
  unit: string | null;
}

export interface OrderRow {
  id: string;
  store_id: string;
  store_name: string;
  store_type: StoreType;
  client_id: string;
  client_name: string;
  driver_id: string | null;
  driver_name: string | null;
  status: OrderStatus;
  subtotal: number;
  delivery_fee: number;
  total: number;
  platform_fee: number;
  merchant_payout: number;
  driver_earning: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  delivery_nom: string;
  delivery_quartier: string;
  delivery_adresse: string;
  delivery_repere: string;
  delivery_telephone: string;
  note: string | null;
  created_at: string;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  price: number;
  qty: number;
}

export interface NotifRow {
  id: string;
  user_id: string;
  title: string;
  body: string;
  read: number; // 0/1
  order_id: string | null;
  created_at: string;
}
