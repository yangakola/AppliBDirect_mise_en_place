/* Peuple la base avec des données de démonstration reprenant celles du prototype front-end,
   pour pouvoir brancher l'app existante sur cette API sans perdre l'expérience de démo.
   Exécuter avec: npm run seed */
import bcrypt from "bcryptjs";
import { db, initSchema } from "./db";

if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED !== "true") {
  console.error("Seed refusé en production (il efface toutes les données). Définir ALLOW_SEED=true pour forcer.");
  process.exit(0);
}

initSchema();

const PASSWORD = "password123";
const hash = bcrypt.hashSync(PASSWORD, 10);

const PH = (id: string, w = 800, h = 500) => `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&auto=format`;

function reset() {
  db.exec(`
    DELETE FROM order_items;
    DELETE FROM orders;
    DELETE FROM notifications;
    DELETE FROM products;
    DELETE FROM stores;
    DELETE FROM users;
  `);
}

function seedUsers() {
  const users = [
    { id: "u1", name: "Jean-Baptiste Maïna", email: "client@test.com", role: "client", telephone: "+236 72 01 23 45", accountType: "personal" },
    { id: "u2", name: "Cécile Ngakoutou", email: "merchant@test.com", role: "merchant", storeId: "s1", telephone: "+236 75 98 76 54", accountType: "merchant_pro" },
    { id: "u3", name: "Rodrigue Mbaitoloum", email: "driver@test.com", role: "driver", telephone: "+236 70 34 56 78", accountType: "driver_pro" },
    { id: "u4", name: "Parfait Sanga-Ndombi", email: "admin@test.com", role: "admin", telephone: "+236 77 00 11 22", accountType: null },
    { id: "u5", name: "Aristide Koyakouno", email: "merchant2@test.com", role: "merchant", storeId: "s2", telephone: "+236 72 45 67 89", accountType: "merchant_pro" },
    { id: "u6", name: "Fabrice Doumta", email: "merchant3@test.com", role: "merchant", storeId: "s3", telephone: "+236 72 11 22 33", accountType: "merchant_pro" },
    { id: "u7", name: "Pharmacie Santé+", email: "merchant4@test.com", role: "merchant", storeId: "s4", telephone: "+236 72 22 33 44", accountType: "merchant_pro" },
    { id: "u8", name: "Coopérative Marché KM5", email: "merchant5@test.com", role: "merchant", storeId: "s5", telephone: "+236 72 33 44 55", accountType: "merchant_pro" },
    { id: "u9", name: "Sylvie Ngoumbango", email: "merchant6@test.com", role: "merchant", storeId: "s6", telephone: "+236 72 44 55 66", accountType: "merchant_pro" },
    { id: "u10", name: "Fraîcheur Tropicale", email: "merchant7@test.com", role: "merchant", storeId: "s7", telephone: "+236 72 55 66 77", accountType: "merchant_pro" },
    { id: "u11", name: "Landry Ouagalengué", email: "driver2@test.com", role: "driver", telephone: "+236 70 88 99 00", accountType: "driver_pro" },
  ];

  const stmt = db.prepare(
    `INSERT INTO users (id, name, email, password_hash, role, store_id, telephone, account_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const u of users) {
    stmt.run(u.id, u.name, u.email, hash, u.role, u.storeId || null, u.telephone, u.accountType);
  }
  console.log(`✓ ${users.length} utilisateurs créés (mot de passe pour tous: "${PASSWORD}")`);
}

function seedStores() {
  const stores = [
    { id: "s1", name: "Maman Cécile", type: "restaurant", category: "Cuisine Centrafricaine", tags: ["Traditionnel", "Fait maison", "Populaire"], rating: 4.9, ratingCount: 342, deliveryTime: "25–40 min", deliveryFee: 500, coverImage: PH("photo-1664992960082-0ea299a9c53e"), description: "Les meilleures spécialités de Bangui préparées avec amour depuis 2010.", quartier: "Lakouanga", isOpen: 1, openHours: "07h–21h", merchantId: "u2", address: "Quartier Lakouanga, Rue 12.050" },
    { id: "s2", name: "Chez Aristide", type: "restaurant", category: "Grillades & Brochettes", tags: ["Brochettes", "Poisson", "Bœuf"], rating: 4.7, ratingCount: 218, deliveryTime: "20–30 min", deliveryFee: 400, coverImage: PH("photo-1599487488170-d11ec9c172f0"), description: "Brochettes grillées au charbon de bois, poissons du fleuve Oubangui.", quartier: "Boy-Rabé", isOpen: 1, openHours: "11h–23h", merchantId: "u5", address: "Boy-Rabé, Avenue de l'Indépendance" },
    { id: "s3", name: "Pizza Bangui", type: "restaurant", category: "Pizzas & Fast Food", tags: ["Pizza", "Burgers", "Rapide"], rating: 4.5, ratingCount: 156, deliveryTime: "30–45 min", deliveryFee: 600, coverImage: PH("photo-1589148753554-b4bd9db83fa2"), description: "Pizzas artisanales et burgers généreux livrés chauds chez vous.", quartier: "Fatima", isOpen: 1, openHours: "10h–22h30", merchantId: "u6", address: "Fatima, Rue des Artisans" },
    { id: "s4", name: "Pharmacie Santé+", type: "pharmacie", category: "Pharmacie", tags: ["Médicaments", "Urgences", "7j/7"], rating: 4.8, ratingCount: 89, deliveryTime: "20–35 min", deliveryFee: 400, coverImage: PH("photo-1631549916768-4119b2e5f926"), description: "Médicaments et parapharmacie livrés rapidement en toute discrétion.", quartier: "Miskine", isOpen: 1, openHours: "06h–22h", merchantId: "u7", address: "Miskine, Centre Commercial" },
    { id: "s5", name: "Marché KM5", type: "marche", category: "Marché", tags: ["Légumes", "Fruits", "Épices", "Frais"], rating: 4.6, ratingCount: 203, deliveryTime: "25–40 min", deliveryFee: 300, coverImage: PH("photo-1734255026082-82fdc81991f0"), description: "Légumes frais, fruits locaux et épices du marché KM5 livrés chez vous.", quartier: "Kilomètre 5", isOpen: 1, openHours: "06h–19h", merchantId: "u8", address: "Kilomètre 5, Marché Central" },
    { id: "s6", name: "Wax & Style", type: "boutique", category: "Mode & Accessoires", tags: ["Wax", "Vêtements", "Accessoires"], rating: 4.4, ratingCount: 67, deliveryTime: "30–50 min", deliveryFee: 500, coverImage: PH("photo-1552710307-537199cd41c0"), description: "Tissus wax de qualité, vêtements et accessoires africains tendance.", quartier: "Galabadja", isOpen: 1, openHours: "09h–20h", merchantId: "u9", address: "Galabadja, Marché des Artisans" },
    { id: "s7", name: "Fraîcheur Tropicale", type: "express", category: "Jus & Snacks", tags: ["Jus naturels", "Beignets", "Express"], rating: 4.6, ratingCount: 134, deliveryTime: "10–20 min", deliveryFee: 250, coverImage: PH("photo-1603569283847-aa295f0d016a"), description: "Jus pressés et beignets chauds. Livraison express garantie en 15 min !", quartier: "Gobongo", isOpen: 0, openHours: "07h–18h", merchantId: "u10", address: "Gobongo, Rue du Marché" },
  ];

  const stmt = db.prepare(
    `INSERT INTO stores (id, name, type, category, tags, rating, rating_count, delivery_time,
      delivery_fee, cover_image, description, quartier, is_open, open_hours, merchant_id, address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const s of stores) {
    stmt.run(
      s.id, s.name, s.type, s.category, JSON.stringify(s.tags), s.rating, s.ratingCount,
      s.deliveryTime, s.deliveryFee, s.coverImage, s.description, s.quartier, s.isOpen,
      s.openHours, s.merchantId, s.address
    );
  }
  console.log(`✓ ${stores.length} boutiques créées`);
}

function seedProducts() {
  const products: [string, string, string, number, string, string, string, number, string?][] = [
    // [id, storeId, name, price, description, image, category, stock, unit?]
    ["p1", "s1", "Gozo et Sauce Feuilles", 1500, "Pâte de manioc avec sauce aux feuilles et poisson fumé", PH("photo-1664992960082-0ea299a9c53e", 400, 300), "Plats principaux", 20],
    ["p2", "s1", "Kanda en Sauce Arachide", 2000, "Boulettes de viande hachée en sauce arachide avec riz blanc", PH("photo-1664992960082-0ea299a9c53e", 400, 300), "Plats principaux", 15],
    ["p3", "s1", "Poulet DG", 3500, "Poulet sauté aux légumes et plantains frits, spécialité de la maison", PH("photo-1687422808277-2334638f09fb", 400, 300), "Plats principaux", 8],
    ["p4", "s1", "Sanga Sanga", 1200, "Feuilles de patate douce à l'huile de palme et crevettes séchées", PH("photo-1664992960082-0ea299a9c53e", 400, 300), "Plats principaux", 12],
    ["p5", "s1", "Fufu Banane", 800, "Banane pilée — accompagnement idéal pour toutes les sauces", PH("photo-1603569283847-aa295f0d016a", 400, 300), "Accompagnements", 25],
    ["p6", "s1", "Jus de Bissap", 500, "Jus d'hibiscus frais légèrement sucré, servi bien frais", PH("photo-1614707585284-9cb9fc018387", 400, 300), "Boissons", 30],
    ["p7", "s1", "Eau Minérale 50cl", 300, "Bouteille d'eau fraîche", PH("photo-1603569283847-aa295f0d016a", 400, 300), "Boissons", 50],
    ["p8", "s2", "Brochettes Bœuf (6 pcs)", 1800, "Brochettes marinées grillées au charbon, sauce piment maison", PH("photo-1599487488170-d11ec9c172f0", 400, 300), "Brochettes", 20],
    ["p9", "s2", "Brochettes Porc (6 pcs)", 1500, "Brochettes de porc tendres et savoureuses", PH("photo-1605908580297-f3e1c02e64ff", 400, 300), "Brochettes", 15],
    ["p10", "s2", "Poisson Braisé Entier", 3000, "Poisson du fleuve braisé avec alloco et sauce tomate maison", PH("photo-1599487488170-d11ec9c172f0", 400, 300), "Poissons", 6],
    ["p11", "s2", "Poulet Grillé ½", 2500, "Demi-poulet mariné aux épices locales grillé au charbon", PH("photo-1687422808277-2334638f09fb", 400, 300), "Viandes", 10],
    ["p12", "s2", "Alloco (Plantain Frit)", 600, "Banane plantain mûre frite dorée", PH("photo-1603569283847-aa295f0d016a", 400, 300), "Accompagnements", 30],
    ["p13", "s3", "Pizza Margherita", 4500, "Sauce tomate maison, mozzarella, basilic frais", PH("photo-1589148753554-b4bd9db83fa2", 400, 300), "Pizzas", 15],
    ["p14", "s3", "Pizza Tropicale", 5000, "Jambon, ananas, fromage, sauce barbecue", PH("photo-1589148753554-b4bd9db83fa2", 400, 300), "Pizzas", 12],
    ["p15", "s3", "Burger Bangui", 3500, "Steak haché, cheddar, tomate, salade, sauce maison", PH("photo-1664992960082-0ea299a9c53e", 400, 300), "Burgers", 20],
    ["p16", "s3", "Frites Maison", 1000, "Frites dorées croustillantes, sauce mayo ou ketchup", PH("photo-1603569283847-aa295f0d016a", 400, 300), "Accompagnements", 25],
    ["p17", "s4", "Paracétamol 500mg (×10)", 500, "Antidouleur et antipyrétique — boîte de 10 comprimés", PH("photo-1631549916768-4119b2e5f926", 400, 300), "Antidouleurs", 50, "boîte"],
    ["p18", "s4", "Amoxicilline 500mg (×12)", 1800, "Antibiotique à large spectre — boîte de 12 gélules", PH("photo-1631549916768-4119b2e5f926", 400, 300), "Antibiotiques", 30, "boîte"],
    ["p19", "s4", "Ibuprofène 400mg (×10)", 700, "Anti-inflammatoire — boîte de 10 comprimés", PH("photo-1631549916768-4119b2e5f926", 400, 300), "Antidouleurs", 40, "boîte"],
    ["p20", "s4", "Masques Chirurgicaux (×10)", 1000, "Masques de protection certifiés", PH("photo-1631549916768-4119b2e5f926", 400, 300), "Protection", 60, "paquet"],
    ["p21", "s5", "Tomates fraîches (1 kg)", 400, "Tomates locales mûres et juteuses", PH("photo-1734255026082-82fdc81991f0", 400, 300), "Légumes", 100, "kg"],
    ["p22", "s5", "Oignons (1 kg)", 350, "Oignons violets de qualité supérieure", PH("photo-1687422809617-a7d97879b3b0", 400, 300), "Légumes", 80, "kg"],
    ["p23", "s5", "Bananes Plantain (régime)", 800, "Régime de 8 bananes plantain mûres", PH("photo-1603569283847-aa295f0d016a", 400, 300), "Fruits", 20, "régime"],
    ["p24", "s5", "Gombo frais (500 g)", 300, "Gombo tendre idéal pour les sauces", PH("photo-1734255026082-82fdc81991f0", 400, 300), "Légumes", 50, "500g"],
    ["p25", "s5", "Piment rouge (250 g)", 200, "Piment frais de Bangui très parfumé", PH("photo-1734255026082-82fdc81991f0", 400, 300), "Épices", 60, "250g"],
    ["p26", "s6", "Tissu Wax Floral (6 yards)", 8500, "Tissu wax imprimé floral 100% coton premium", PH("photo-1552710307-537199cd41c0", 400, 300), "Tissus", 15, "6 yards"],
    ["p27", "s6", "Tissu Wax Géométrique", 7500, "Motifs géométriques modernes, couleurs vives", PH("photo-1578509566163-068acd11b8e7", 400, 300), "Tissus", 12, "6 yards"],
    ["p28", "s6", "Sac Raphia Artisanal", 3500, "Sac à main tressé à la main, résistant et élégant", PH("photo-1552710307-537199cd41c0", 400, 300), "Accessoires", 8],
    ["p29", "s7", "Jus Gingembre-Citron", 700, "Tonifiant et revigorant, pressé à la commande", PH("photo-1621506289937-a8e4df240d0b", 400, 300), "Jus", 20],
    ["p30", "s7", "Jus de Mangue (50cl)", 600, "Mangue fraîche mixée, sans sucre ajouté", PH("photo-1614707585284-9cb9fc018387", 400, 300), "Jus", 25],
    ["p31", "s7", "Beignets Haricots (10 pcs)", 500, "Croustillants et chauds, sauce piment douce", PH("photo-1664992960082-0ea299a9c53e", 400, 300), "Snacks", 15],
    ["p32", "s7", "Beignets Banane (5 pcs)", 400, "Beignets de banane dorés, sucrés et moelleux", PH("photo-1603569283847-aa295f0d016a", 400, 300), "Snacks", 18],
  ];

  const stmt = db.prepare(
    `INSERT INTO products (id, store_id, name, price, description, image, available, category, stock, unit)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
  );
  for (const [id, storeId, name, price, description, image, category, stock, unit] of products) {
    stmt.run(id, storeId, name, price, description, image, category, stock, unit || null);
  }
  console.log(`✓ ${products.length} produits créés`);
}

function seedOrdersAndNotifs() {
  const orders: {
    id: string; storeId: string; storeName: string; storeType: string;
    clientId: string; clientName: string; driverId?: string; driverName?: string;
    status: string; items: { productId: string; name: string; price: number; qty: number }[];
    subtotal: number; deliveryFee: number; total: number; paymentMethod: string;
    delivery: { nom: string; quartier: string; adresse: string; repere: string; telephone: string };
    minutesAgo: number;
  }[] = [
    {
      id: "CMD-001", storeId: "s1", storeName: "Maman Cécile", storeType: "restaurant",
      clientId: "u1", clientName: "Jean-Baptiste Maïna", driverId: "u3", driverName: "Rodrigue Mbaitoloum",
      status: "livrée",
      items: [
        { productId: "p1", name: "Gozo et Sauce Feuilles", price: 1500, qty: 2 },
        { productId: "p6", name: "Jus de Bissap", price: 500, qty: 1 },
      ],
      subtotal: 3500, deliveryFee: 500, total: 4000, paymentMethod: "orange_money",
      delivery: { nom: "Jean-Baptiste Maïna", quartier: "Boy-Rabé", adresse: "Rue 14.120", repere: "En face de l'église", telephone: "+236 72 01 23 45" },
      minutesAgo: 2 * 24 * 60,
    },
    {
      id: "CMD-002", storeId: "s2", storeName: "Chez Aristide", storeType: "restaurant",
      clientId: "u1", clientName: "Jean-Baptiste Maïna", status: "préparation",
      items: [
        { productId: "p8", name: "Brochettes Bœuf (6 pcs)", price: 1800, qty: 2 },
        { productId: "p12", name: "Alloco (Plantain Frit)", price: 600, qty: 1 },
      ],
      subtotal: 4200, deliveryFee: 400, total: 4600, paymentMethod: "cash",
      delivery: { nom: "Jean-Baptiste Maïna", quartier: "Boy-Rabé", adresse: "Rue 14.120", repere: "En face de l'église", telephone: "+236 72 01 23 45" },
      minutesAgo: 30,
    },
    {
      id: "CMD-003", storeId: "s1", storeName: "Maman Cécile", storeType: "restaurant",
      clientId: "u5", clientName: "Aristide Koyakouno", status: "nouvelle",
      items: [
        { productId: "p3", name: "Poulet DG", price: 3500, qty: 1 },
        { productId: "p5", name: "Fufu Banane", price: 800, qty: 2 },
      ],
      subtotal: 5100, deliveryFee: 500, total: 5600, paymentMethod: "orange_money",
      delivery: { nom: "Aristide Koyakouno", quartier: "Fatima", adresse: "Rue Docteur Lenoir", repere: "Maison bleue, carrefour", telephone: "+236 75 98 76 54" },
      minutesAgo: 5,
    },
    {
      id: "CMD-004", storeId: "s1", storeName: "Maman Cécile", storeType: "restaurant",
      clientId: "u1", clientName: "Jean-Baptiste Maïna", status: "prête",
      items: [
        { productId: "p2", name: "Kanda en Sauce Arachide", price: 2000, qty: 1 },
        { productId: "p4", name: "Sanga Sanga", price: 1200, qty: 1 },
      ],
      subtotal: 3200, deliveryFee: 500, total: 3700, paymentMethod: "airtel_money",
      delivery: { nom: "Jean-Baptiste Maïna", quartier: "Castor", adresse: "Avenue Boganda", repere: "Immeuble La Paix, 2e étage", telephone: "+236 72 01 23 45" },
      minutesAgo: 45,
    },
  ];

  const commissionRate = Number(process.env.PLATFORM_COMMISSION_RATE ?? 0.10);

  const orderStmt = db.prepare(
    `INSERT INTO orders (id, store_id, store_name, store_type, client_id, client_name, driver_id, driver_name,
      status, subtotal, delivery_fee, total, platform_fee, merchant_payout, driver_earning,
      payment_method, payment_status,
      delivery_nom, delivery_quartier, delivery_adresse, delivery_repere, delivery_telephone, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))`
  );
  const itemStmt = db.prepare(
    `INSERT INTO order_items (id, order_id, product_id, product_name, price, qty) VALUES (?, ?, ?, ?, ?, ?)`
  );

  for (const o of orders) {
    const paymentStatus = o.status === "livrée" || o.paymentMethod === "cash" ? "paid" : "pending";
    const platformFee = Math.round(o.subtotal * commissionRate);
    const merchantPayout = o.subtotal - platformFee;
    const driverEarning = o.deliveryFee;
    orderStmt.run(
      o.id, o.storeId, o.storeName, o.storeType, o.clientId, o.clientName,
      o.driverId || null, o.driverName || null, o.status, o.subtotal, o.deliveryFee, o.total,
      platformFee, merchantPayout, driverEarning,
      o.paymentMethod, paymentStatus, o.delivery.nom, o.delivery.quartier, o.delivery.adresse,
      o.delivery.repere, o.delivery.telephone, `-${o.minutesAgo} minutes`
    );
    for (const it of o.items) {
      itemStmt.run(`${o.id}-${it.productId}`, o.id, it.productId, it.name, it.price, it.qty);
    }
  }
  console.log(`✓ ${orders.length} commandes de démonstration créées`);

  const notifs = [
    { id: "n1", userId: "u1", title: "Commande livrée ✓", body: "Votre commande CMD-001 a été livrée avec succès !", read: 1, orderId: "CMD-001", minutesAgo: 2 * 24 * 60 },
    { id: "n2", userId: "u1", title: "En préparation", body: "Chez Aristide prépare votre commande CMD-002.", read: 0, orderId: "CMD-002", minutesAgo: 20 },
    { id: "n3", userId: "u2", title: "Nouvelle commande !", body: "Commande CMD-003 reçue de Aristide Koyakouno.", read: 0, orderId: "CMD-003", minutesAgo: 5 },
  ];
  const notifStmt = db.prepare(
    `INSERT INTO notifications (id, user_id, title, body, read, order_id, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now', ?))`
  );
  for (const n of notifs) {
    notifStmt.run(n.id, n.userId, n.title, n.body, n.read, n.orderId, `-${n.minutesAgo} minutes`);
  }
  console.log(`✓ ${notifs.length} notifications créées`);
}

reset();
seedUsers();
seedStores();
seedProducts();
seedOrdersAndNotifs();
console.log("\n✅ Base de données peuplée avec succès.");
console.log(`   Mot de passe commun à tous les comptes de démo: "${PASSWORD}"`);
console.log("   Comptes: client@test.com · merchant@test.com · driver@test.com · admin@test.com");
