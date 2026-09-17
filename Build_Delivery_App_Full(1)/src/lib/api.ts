/**
 * Petit client HTTP pour appeler l'API Build Delivery Backend.
 * Objectif : remplacer progressivement les données mockées de App.tsx (USERS, STORES,
 * INIT_PRODUCTS, SEED_ORDERS...) par de vrais appels réseau, écran par écran,
 * sans tout réécrire d'un coup. Voir MIGRATION.md à la racine du projet.
 */

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

let authToken: string | null = localStorage.getItem("bd_token");

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) localStorage.setItem("bd_token", token);
  else localStorage.removeItem("bd_token");
}

export function getAuthToken() {
  return authToken;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error || `Erreur ${res.status}`);
  }
  return data as T;
}

// ─── Auth ────────────────────────────────────────────────────────────────
export const AuthAPI = {
  register: (body: { name: string; email: string; password: string; telephone?: string; accountType?: string }) =>
    request<{ token: string; user: any }>("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (email: string, password: string) =>
    request<{ token: string; user: any }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => request<{ user: any }>("/auth/me"),
  requestOtp: (telephone: string) =>
    request<{ message: string; devCode?: string }>("/auth/otp/request", { method: "POST", body: JSON.stringify({ telephone }) }),
  verifyOtp: (telephone: string, code: string) =>
    request<{ verified: boolean }>("/auth/otp/verify", { method: "POST", body: JSON.stringify({ telephone, code }) }),
};

// ─── Boutiques ───────────────────────────────────────────────────────────
export const StoresAPI = {
  list: (params?: { type?: string; quartier?: string; search?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ stores: any[] }>(`/stores${qs ? `?${qs}` : ""}`);
  },
  get: (id: string) => request<{ store: any }>(`/stores/${id}`),
  create: (body: any) => request<{ store: any }>("/stores", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: any) => request<{ store: any }>(`/stores/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  toggleOpen: (id: string) => request<{ store: any }>(`/stores/${id}/toggle-open`, { method: "PATCH" }),
};

// ─── Produits ────────────────────────────────────────────────────────────
export const ProductsAPI = {
  list: (params?: { storeId?: string; category?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ products: any[] }>(`/products${qs ? `?${qs}` : ""}`);
  },
  create: (body: any) => request<{ product: any }>("/products", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: any) => request<{ product: any }>(`/products/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  remove: (id: string) => request<{ deleted: boolean }>(`/products/${id}`, { method: "DELETE" }),
};

// ─── Commandes ───────────────────────────────────────────────────────────
export const OrdersAPI = {
  create: (body: any) => request<{ order: any }>("/orders", { method: "POST", body: JSON.stringify(body) }),
  list: (status?: string) => request<{ orders: any[] }>(`/orders${status ? `?status=${status}` : ""}`),
  get: (id: string) => request<{ order: any }>(`/orders/${id}`),
  assign: (id: string) => request<{ order: any }>(`/orders/${id}/assign`, { method: "POST" }),
  setStatus: (id: string, status: string) =>
    request<{ order: any }>(`/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  myEarnings: () => request<{ deliveries: number; totalEarnings: number }>("/orders/earnings/me"),
};

// ─── Notifications ───────────────────────────────────────────────────────
export const NotificationsAPI = {
  list: () => request<{ notifications: any[] }>("/notifications"),
  markRead: (id: string) => request<{ notification: any }>(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllRead: () => request<{ ok: boolean }>("/notifications/read-all", { method: "PATCH" }),
};

// ─── Admin ───────────────────────────────────────────────────────────────
export const AdminAPI = {
  stats: () => request<any>("/admin/stats"),
  users: (role?: string) => request<{ users: any[] }>(`/admin/users${role ? `?role=${role}` : ""}`),
};
