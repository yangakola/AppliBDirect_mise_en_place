import { useState, useEffect, useRef } from "react";
import {
  Search, Home, ShoppingCart, ClipboardList, Heart, User,
  ChevronLeft, Plus, Minus, X, MapPin, Phone, CheckCircle,
  Package, Bike, ChevronRight, Bell, LogOut, Smartphone,
  Banknote, Trash2, Store, AlertCircle, ChefHat, Star,
  Clock, Zap, ShoppingBag, TrendingUp, Users, Check,
  Navigation, Camera, Truck, PlusCircle, ArrowRight,
  Shield, Pencil, BarChart2, DollarSign, Activity,
  ToggleLeft, ToggleRight, Eye, EyeOff, Lock, Mail,
  Building2, UserCheck, ChevronDown,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { AuthAPI, setAuthToken } from "../lib/api";

/* ════════════════════════════════ TYPES ════════════════════════════════════ */
type Phase = "splash"|"onboarding"|"auth_choice"|"login"|"account_type"|"register"|"otp"|"app";
type UserRole = "client"|"merchant"|"driver"|"admin";
type AccountType = "personal"|"merchant_pro"|"driver_pro";
type StoreType = "restaurant"|"pharmacie"|"marche"|"boutique"|"express";
type OrderStatus = "nouvelle"|"acceptée"|"préparation"|"prête"|"livraison"|"livrée"|"annulée";
type PaymentMethod = "orange_money"|"airtel_money"|"cash";
type ClientView = "home"|"search"|"store"|"cart"|"checkout"|"orders"|"order_detail"|"favorites"|"profile"|"settings";
type MerchantView = "dashboard"|"m_orders"|"m_order_detail"|"m_products"|"add_product"|"m_profile";
type DriverView = "d_available"|"d_course"|"d_history"|"d_earnings";
type AdminView = "a_stats"|"a_orders"|"a_shops"|"a_clients"|"a_drivers";

interface AppUser { id:string;name:string;email:string;role:UserRole;storeId?:string;telephone?:string;avatar?:string;accountType?:AccountType; }
interface Store { id:string;name:string;type:StoreType;category:string;tags:string[];rating:number;ratingCount:number;deliveryTime:string;deliveryFee:number;coverImage:string;description:string;quartier:string;isOpen:boolean;openHours:string;merchantId:string;address:string; }
interface Product { id:string;storeId:string;name:string;price:number;description:string;image:string;available:boolean;category:string;stock:number;unit?:string; }
interface CartItem { product:Product;qty:number; }
interface DeliveryInfo { nom:string;quartier:string;adresse:string;repere:string;telephone:string; }
interface Order { id:string;storeId:string;storeName:string;storeType:StoreType;clientId:string;clientName:string;driverId?:string;driverName?:string;items:CartItem[];status:OrderStatus;subtotal:number;deliveryFee:number;total:number;paymentMethod:PaymentMethod;delivery:DeliveryInfo;createdAt:Date;note?:string; }
interface Notif { id:string;userId:string;title:string;body:string;read:boolean;createdAt:Date;orderId?:string; }

/* ════════════════════════════ CONSTANTS ════════════════════════════════════ */
const QUARTIERS = ["Lakouanga","Boy-Rabé","Fatima","Gobongo","Miskine","Sango","Galabadja","Castor","Kilomètre 5","Fouh","Pétévo","Bimbo","Autre"];
const STATUS_STEPS:OrderStatus[] = ["nouvelle","acceptée","préparation","prête","livraison","livrée"];
const STATUS_CFG:Record<OrderStatus,{label:string;color:string;bg:string}> = {
  nouvelle:    {label:"Reçue",          color:"text-blue-600",    bg:"bg-blue-50"},
  acceptée:    {label:"Acceptée",       color:"text-violet-600",  bg:"bg-violet-50"},
  préparation: {label:"En préparation", color:"text-amber-600",   bg:"bg-amber-50"},
  prête:       {label:"Prête",          color:"text-emerald-600", bg:"bg-emerald-50"},
  livraison:   {label:"En route",       color:"text-primary",     bg:"bg-secondary"},
  livrée:      {label:"Livrée ✓",       color:"text-green-700",   bg:"bg-green-100"},
  annulée:     {label:"Annulée",        color:"text-red-600",     bg:"bg-red-50"},
};
const PAY_LABELS:Record<PaymentMethod,string> = {orange_money:"Orange Money",airtel_money:"Airtel Money",cash:"Espèces à la livraison"};
const FMT = (n:number) => n.toLocaleString("fr-FR")+" FCFA";
const PH = (id:string,w=800,h=500) => `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&auto=format`;
const DF = "'Bricolage Grotesque',sans-serif";

/* ══════════════════════════ MOCK DATA ══════════════════════════════════════ */
const USERS:AppUser[] = [
  {id:"u1",name:"Jean-Baptiste Maïna",   email:"client@test.com",   role:"client",   telephone:"+236 72 01 23 45",accountType:"personal"},
  {id:"u2",name:"Cécile Ngakoutou",      email:"merchant@test.com",  role:"merchant", storeId:"s1",telephone:"+236 75 98 76 54",accountType:"merchant_pro"},
  {id:"u3",name:"Rodrigue Mbaitoloum",   email:"driver@test.com",    role:"driver",   telephone:"+236 70 34 56 78",accountType:"driver_pro"},
  {id:"u4",name:"Parfait Sanga-Ndombi",  email:"admin@test.com",     role:"admin",    telephone:"+236 77 00 11 22"},
  {id:"u5",name:"Aristide Koyakouno",    email:"merchant2@test.com", role:"merchant", storeId:"s2",telephone:"+236 72 45 67 89",accountType:"merchant_pro"},
];
const STORES:Store[] = [
  {id:"s1",name:"Maman Cécile",type:"restaurant",category:"Cuisine Centrafricaine",tags:["Traditionnel","Fait maison","Populaire"],rating:4.9,ratingCount:342,deliveryTime:"25–40 min",deliveryFee:500,coverImage:PH("photo-1664992960082-0ea299a9c53e"),description:"Les meilleures spécialités de Bangui préparées avec amour depuis 2010.",quartier:"Lakouanga",isOpen:true,openHours:"07h–21h",merchantId:"u2",address:"Quartier Lakouanga, Rue 12.050"},
  {id:"s2",name:"Chez Aristide",type:"restaurant",category:"Grillades & Brochettes",tags:["Brochettes","Poisson","Bœuf"],rating:4.7,ratingCount:218,deliveryTime:"20–30 min",deliveryFee:400,coverImage:PH("photo-1599487488170-d11ec9c172f0"),description:"Brochettes grillées au charbon de bois, poissons du fleuve Oubangui.",quartier:"Boy-Rabé",isOpen:true,openHours:"11h–23h",merchantId:"u5",address:"Boy-Rabé, Avenue de l'Indépendance"},
  {id:"s3",name:"Pizza Bangui",type:"restaurant",category:"Pizzas & Fast Food",tags:["Pizza","Burgers","Rapide"],rating:4.5,ratingCount:156,deliveryTime:"30–45 min",deliveryFee:600,coverImage:PH("photo-1589148753554-b4bd9db83fa2"),description:"Pizzas artisanales et burgers généreux livrés chauds chez vous.",quartier:"Fatima",isOpen:true,openHours:"10h–22h30",merchantId:"u6",address:"Fatima, Rue des Artisans"},
  {id:"s4",name:"Pharmacie Santé+",type:"pharmacie",category:"Pharmacie",tags:["Médicaments","Urgences","7j/7"],rating:4.8,ratingCount:89,deliveryTime:"20–35 min",deliveryFee:400,coverImage:PH("photo-1631549916768-4119b2e5f926"),description:"Médicaments et parapharmacie livrés rapidement en toute discrétion.",quartier:"Miskine",isOpen:true,openHours:"06h–22h",merchantId:"u7",address:"Miskine, Centre Commercial"},
  {id:"s5",name:"Marché KM5",type:"marche",category:"Marché",tags:["Légumes","Fruits","Épices","Frais"],rating:4.6,ratingCount:203,deliveryTime:"25–40 min",deliveryFee:300,coverImage:PH("photo-1734255026082-82fdc81991f0"),description:"Légumes frais, fruits locaux et épices du marché KM5 livrés chez vous.",quartier:"Kilomètre 5",isOpen:true,openHours:"06h–19h",merchantId:"u8",address:"Kilomètre 5, Marché Central"},
  {id:"s6",name:"Wax & Style",type:"boutique",category:"Mode & Accessoires",tags:["Wax","Vêtements","Accessoires"],rating:4.4,ratingCount:67,deliveryTime:"30–50 min",deliveryFee:500,coverImage:PH("photo-1552710307-537199cd41c0"),description:"Tissus wax de qualité, vêtements et accessoires africains tendance.",quartier:"Galabadja",isOpen:true,openHours:"09h–20h",merchantId:"u9",address:"Galabadja, Marché des Artisans"},
  {id:"s7",name:"Fraîcheur Tropicale",type:"express",category:"Jus & Snacks",tags:["Jus naturels","Beignets","Express"],rating:4.6,ratingCount:134,deliveryTime:"10–20 min",deliveryFee:250,coverImage:PH("photo-1603569283847-aa295f0d016a"),description:"Jus pressés et beignets chauds. Livraison express garantie en 15 min !",quartier:"Gobongo",isOpen:false,openHours:"07h–18h",merchantId:"u10",address:"Gobongo, Rue du Marché"},
];
const INIT_PRODUCTS:Product[] = [
  {id:"p1",storeId:"s1",name:"Gozo et Sauce Feuilles",price:1500,description:"Pâte de manioc avec sauce aux feuilles et poisson fumé",image:PH("photo-1664992960082-0ea299a9c53e",400,300),available:true,category:"Plats principaux",stock:20},
  {id:"p2",storeId:"s1",name:"Kanda en Sauce Arachide",price:2000,description:"Boulettes de viande hachée en sauce arachide avec riz blanc",image:PH("photo-1664992960082-0ea299a9c53e",400,300),available:true,category:"Plats principaux",stock:15},
  {id:"p3",storeId:"s1",name:"Poulet DG",price:3500,description:"Poulet sauté aux légumes et plantains frits, spécialité de la maison",image:PH("photo-1687422808277-2334638f09fb",400,300),available:true,category:"Plats principaux",stock:8},
  {id:"p4",storeId:"s1",name:"Sanga Sanga",price:1200,description:"Feuilles de patate douce à l'huile de palme et crevettes séchées",image:PH("photo-1664992960082-0ea299a9c53e",400,300),available:true,category:"Plats principaux",stock:12},
  {id:"p5",storeId:"s1",name:"Fufu Banane",price:800,description:"Banane pilée — accompagnement idéal pour toutes les sauces",image:PH("photo-1603569283847-aa295f0d016a",400,300),available:true,category:"Accompagnements",stock:25},
  {id:"p6",storeId:"s1",name:"Jus de Bissap",price:500,description:"Jus d'hibiscus frais légèrement sucré, servi bien frais",image:PH("photo-1614707585284-9cb9fc018387",400,300),available:true,category:"Boissons",stock:30},
  {id:"p7",storeId:"s1",name:"Eau Minérale 50cl",price:300,description:"Bouteille d'eau fraîche",image:PH("photo-1603569283847-aa295f0d016a",400,300),available:true,category:"Boissons",stock:50},
  {id:"p8",storeId:"s2",name:"Brochettes Bœuf (6 pcs)",price:1800,description:"Brochettes marinées grillées au charbon, sauce piment maison",image:PH("photo-1599487488170-d11ec9c172f0",400,300),available:true,category:"Brochettes",stock:20},
  {id:"p9",storeId:"s2",name:"Brochettes Porc (6 pcs)",price:1500,description:"Brochettes de porc tendres et savoureuses",image:PH("photo-1605908580297-f3e1c02e64ff",400,300),available:true,category:"Brochettes",stock:15},
  {id:"p10",storeId:"s2",name:"Poisson Braisé Entier",price:3000,description:"Poisson du fleuve braisé avec alloco et sauce tomate maison",image:PH("photo-1599487488170-d11ec9c172f0",400,300),available:true,category:"Poissons",stock:6},
  {id:"p11",storeId:"s2",name:"Poulet Grillé ½",price:2500,description:"Demi-poulet mariné aux épices locales grillé au charbon",image:PH("photo-1687422808277-2334638f09fb",400,300),available:true,category:"Viandes",stock:10},
  {id:"p12",storeId:"s2",name:"Alloco (Plantain Frit)",price:600,description:"Banane plantain mûre frite dorée",image:PH("photo-1603569283847-aa295f0d016a",400,300),available:true,category:"Accompagnements",stock:30},
  {id:"p13",storeId:"s3",name:"Pizza Margherita",price:4500,description:"Sauce tomate maison, mozzarella, basilic frais",image:PH("photo-1589148753554-b4bd9db83fa2",400,300),available:true,category:"Pizzas",stock:15},
  {id:"p14",storeId:"s3",name:"Pizza Tropicale",price:5000,description:"Jambon, ananas, fromage, sauce barbecue",image:PH("photo-1589148753554-b4bd9db83fa2",400,300),available:true,category:"Pizzas",stock:12},
  {id:"p15",storeId:"s3",name:"Burger Bangui",price:3500,description:"Steak haché, cheddar, tomate, salade, sauce maison",image:PH("photo-1664992960082-0ea299a9c53e",400,300),available:true,category:"Burgers",stock:20},
  {id:"p16",storeId:"s3",name:"Frites Maison",price:1000,description:"Frites dorées croustillantes, sauce mayo ou ketchup",image:PH("photo-1603569283847-aa295f0d016a",400,300),available:true,category:"Accompagnements",stock:25},
  {id:"p17",storeId:"s4",name:"Paracétamol 500mg (×10)",price:500,description:"Antidouleur et antipyrétique — boîte de 10 comprimés",image:PH("photo-1631549916768-4119b2e5f926",400,300),available:true,category:"Antidouleurs",stock:50,unit:"boîte"},
  {id:"p18",storeId:"s4",name:"Amoxicilline 500mg (×12)",price:1800,description:"Antibiotique à large spectre — boîte de 12 gélules",image:PH("photo-1631549916768-4119b2e5f926",400,300),available:true,category:"Antibiotiques",stock:30,unit:"boîte"},
  {id:"p19",storeId:"s4",name:"Ibuprofène 400mg (×10)",price:700,description:"Anti-inflammatoire — boîte de 10 comprimés",image:PH("photo-1631549916768-4119b2e5f926",400,300),available:true,category:"Antidouleurs",stock:40,unit:"boîte"},
  {id:"p20",storeId:"s4",name:"Masques Chirurgicaux (×10)",price:1000,description:"Masques de protection certifiés",image:PH("photo-1631549916768-4119b2e5f926",400,300),available:true,category:"Protection",stock:60,unit:"paquet"},
  {id:"p21",storeId:"s5",name:"Tomates fraîches (1 kg)",price:400,description:"Tomates locales mûres et juteuses",image:PH("photo-1734255026082-82fdc81991f0",400,300),available:true,category:"Légumes",stock:100,unit:"kg"},
  {id:"p22",storeId:"s5",name:"Oignons (1 kg)",price:350,description:"Oignons violets de qualité supérieure",image:PH("photo-1687422809617-a7d97879b3b0",400,300),available:true,category:"Légumes",stock:80,unit:"kg"},
  {id:"p23",storeId:"s5",name:"Bananes Plantain (régime)",price:800,description:"Régime de 8 bananes plantain mûres",image:PH("photo-1603569283847-aa295f0d016a",400,300),available:true,category:"Fruits",stock:20,unit:"régime"},
  {id:"p24",storeId:"s5",name:"Gombo frais (500 g)",price:300,description:"Gombo tendre idéal pour les sauces",image:PH("photo-1734255026082-82fdc81991f0",400,300),available:true,category:"Légumes",stock:50,unit:"500g"},
  {id:"p25",storeId:"s5",name:"Piment rouge (250 g)",price:200,description:"Piment frais de Bangui très parfumé",image:PH("photo-1734255026082-82fdc81991f0",400,300),available:true,category:"Épices",stock:60,unit:"250g"},
  {id:"p26",storeId:"s6",name:"Tissu Wax Floral (6 yards)",price:8500,description:"Tissu wax imprimé floral 100% coton premium",image:PH("photo-1552710307-537199cd41c0",400,300),available:true,category:"Tissus",stock:15,unit:"6 yards"},
  {id:"p27",storeId:"s6",name:"Tissu Wax Géométrique",price:7500,description:"Motifs géométriques modernes, couleurs vives",image:PH("photo-1578509566163-068acd11b8e7",400,300),available:true,category:"Tissus",stock:12,unit:"6 yards"},
  {id:"p28",storeId:"s6",name:"Sac Raphia Artisanal",price:3500,description:"Sac à main tressé à la main, résistant et élégant",image:PH("photo-1552710307-537199cd41c0",400,300),available:true,category:"Accessoires",stock:8},
  {id:"p29",storeId:"s7",name:"Jus Gingembre-Citron",price:700,description:"Tonifiant et revigorant, pressé à la commande",image:PH("photo-1621506289937-a8e4df240d0b",400,300),available:true,category:"Jus",stock:20},
  {id:"p30",storeId:"s7",name:"Jus de Mangue (50cl)",price:600,description:"Mangue fraîche mixée, sans sucre ajouté",image:PH("photo-1614707585284-9cb9fc018387",400,300),available:true,category:"Jus",stock:25},
  {id:"p31",storeId:"s7",name:"Beignets Haricots (10 pcs)",price:500,description:"Croustillants et chauds, sauce piment douce",image:PH("photo-1664992960082-0ea299a9c53e",400,300),available:true,category:"Snacks",stock:15},
  {id:"p32",storeId:"s7",name:"Beignets Banane (5 pcs)",price:400,description:"Beignets de banane dorés, sucrés et moelleux",image:PH("photo-1603569283847-aa295f0d016a",400,300),available:true,category:"Snacks",stock:18},
];
const now = new Date();
const ago = (m:number) => new Date(now.getTime()-m*60000);
const SEED_ORDERS:Order[] = [
  {id:"CMD-001",storeId:"s1",storeName:"Maman Cécile",storeType:"restaurant",clientId:"u1",clientName:"Jean-Baptiste Maïna",driverId:"u3",driverName:"Rodrigue Mbaitoloum",items:[{product:INIT_PRODUCTS[0],qty:2},{product:INIT_PRODUCTS[5],qty:1}],status:"livrée",subtotal:3500,deliveryFee:500,total:4000,paymentMethod:"orange_money",delivery:{nom:"Jean-Baptiste Maïna",quartier:"Boy-Rabé",adresse:"Rue 14.120",repere:"En face de l'église",telephone:"+236 72 01 23 45"},createdAt:ago(2*24*60)},
  {id:"CMD-002",storeId:"s2",storeName:"Chez Aristide",storeType:"restaurant",clientId:"u1",clientName:"Jean-Baptiste Maïna",items:[{product:INIT_PRODUCTS[7],qty:2},{product:INIT_PRODUCTS[11],qty:1}],status:"préparation",subtotal:4200,deliveryFee:400,total:4600,paymentMethod:"cash",delivery:{nom:"Jean-Baptiste Maïna",quartier:"Boy-Rabé",adresse:"Rue 14.120",repere:"En face de l'église",telephone:"+236 72 01 23 45"},createdAt:ago(30)},
  {id:"CMD-003",storeId:"s1",storeName:"Maman Cécile",storeType:"restaurant",clientId:"u5",clientName:"Aristide Koyakouno",items:[{product:INIT_PRODUCTS[2],qty:1},{product:INIT_PRODUCTS[4],qty:2}],status:"nouvelle",subtotal:5100,deliveryFee:500,total:5600,paymentMethod:"orange_money",delivery:{nom:"Aristide Koyakouno",quartier:"Fatima",adresse:"Rue Docteur Lenoir",repere:"Maison bleue, carrefour",telephone:"+236 75 98 76 54"},createdAt:ago(5)},
  {id:"CMD-004",storeId:"s1",storeName:"Maman Cécile",storeType:"restaurant",clientId:"u1",clientName:"Jean-Baptiste Maïna",items:[{product:INIT_PRODUCTS[1],qty:1},{product:INIT_PRODUCTS[3],qty:1}],status:"prête",subtotal:3200,deliveryFee:500,total:3700,paymentMethod:"airtel_money",delivery:{nom:"Jean-Baptiste Maïna",quartier:"Castor",adresse:"Avenue Boganda",repere:"Immeuble La Paix, 2e étage",telephone:"+236 72 01 23 45"},createdAt:ago(45)},
];
const SEED_NOTIFS:Notif[] = [
  {id:"n1",userId:"u1",title:"Commande livrée ✓",body:"Votre commande CMD-001 a été livrée avec succès !",read:true,createdAt:ago(2*24*60),orderId:"CMD-001"},
  {id:"n2",userId:"u1",title:"En préparation",body:"Chez Aristide prépare votre commande CMD-002.",read:false,createdAt:ago(20),orderId:"CMD-002"},
  {id:"n3",userId:"u2",title:"Nouvelle commande !",body:"Commande CMD-003 reçue de Aristide Koyakouno.",read:false,createdAt:ago(5),orderId:"CMD-003"},
];

/* ════════════════════════ STORE CONFIG ═════════════════════════════════════ */
const STORE_TYPE_CFG:Record<StoreType,{icon:React.ReactNode;color:string;label:string}> = {
  restaurant:{icon:<ChefHat size={16}/>,color:"bg-orange-100 text-orange-600",label:"Restaurant"},
  pharmacie: {icon:<Plus size={16}/>,   color:"bg-green-100 text-green-600",  label:"Pharmacie"},
  marche:    {icon:<ShoppingBag size={16}/>,color:"bg-yellow-100 text-yellow-700",label:"Marché"},
  boutique:  {icon:<Package size={16}/>,color:"bg-purple-100 text-purple-600",label:"Boutique"},
  express:   {icon:<Zap size={16}/>,    color:"bg-primary/10 text-primary",   label:"Express"},
};

/* ════════════════════════════ SVG ICONS ════════════════════════════════════ */
function GoogleIcon(){return(<svg viewBox="0 0 24 24" width="20" height="20"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>);}
function AppleIcon(){return(<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>);}
function FacebookIcon(){return(<svg viewBox="0 0 24 24" width="20" height="20" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>);}

/* ════════════════════════ SHARED COMPONENTS ════════════════════════════════ */
function BDLogo({size="md",white=false}:{size?:"sm"|"md"|"lg";white?:boolean}){
  const s = size==="sm"?"w-8 h-8 text-sm":size==="lg"?"w-16 h-16 text-2xl":"w-10 h-10 text-base";
  return(
    <div className={`${s} ${white?"bg-white/20 border border-white/30":"bg-primary shadow-sm"} rounded-2xl flex items-center justify-center flex-shrink-0`}>
      <span className="text-white font-black tracking-tight" style={{fontFamily:DF}}>BD</span>
    </div>
  );
}

function PharmaCross({size=56}:{size?:number}){
  return(
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
      <circle cx="30" cy="30" r="28" fill="#dcfce7" opacity="0.9"/>
      <circle cx="30" cy="30" r="20" fill="#bbf7d0" opacity="0.7"/>
      <rect x="21" y="10" width="18" height="40" rx="5" fill="url(#phG)"/>
      <rect x="10" y="21" width="40" height="18" rx="5" fill="url(#phG)"/>
      <rect x="21" y="10" width="7" height="40" rx="5" fill="white" opacity="0.22"/>
      <defs><linearGradient id="phG" x1="10" y1="10" x2="50" y2="50" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#4ade80"/><stop offset="100%" stopColor="#16a34a"/></linearGradient></defs>
    </svg>
  );
}

function Badge({status}:{status:OrderStatus}){
  const c = STATUS_CFG[status];
  return <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${c.color} ${c.bg}`}>{c.label}</span>;
}

function StatusTracker({status}:{status:OrderStatus}){
  if(status==="annulée") return(
    <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-center">
      <X className="mx-auto text-red-500 mb-2" size={28}/><p className="text-red-600 font-bold">Commande annulée</p>
    </div>
  );
  const labels=["Reçue","Acceptée","Préparation","Prête","En route","Livrée"];
  const icons=[Package,Check,ChefHat,CheckCircle,Truck,Heart];
  const cur=STATUS_STEPS.indexOf(status);
  return(
    <div>
      {STATUS_STEPS.map((s,i)=>{
        const Icon=icons[i];const done=i<=cur;const active=i===cur;
        return(
          <div key={s} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${active?"bg-primary text-white ring-4 ring-primary/20 scale-110":done?"bg-primary/80 text-white":"bg-muted text-muted-foreground"}`}>
                <Icon size={15}/>
              </div>
              {i<STATUS_STEPS.length-1&&<div className={`w-0.5 h-7 mt-0.5 transition-colors ${i<cur?"bg-primary":"bg-muted"}`}/>}
            </div>
            <div className="pt-1.5 pb-7 last:pb-0">
              <p className={`text-sm font-semibold leading-tight ${done?"text-foreground":"text-muted-foreground"}`}>{labels[i]}</p>
              {active&&<p className="text-xs text-primary mt-0.5">En cours…</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NotifPanel({notifs,userId,onClose,onRead}:{notifs:Notif[];userId:string;onClose:()=>void;onRead:(id:string)=>void}){
  const mine=notifs.filter(n=>n.userId===userId);
  return(
    <div className="fixed inset-0 z-50 flex flex-col bg-black/40" onClick={onClose}>
      <div className="mt-auto bg-card rounded-t-3xl max-h-[70vh] flex flex-col" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
          <h3 className="font-black text-lg" style={{fontFamily:DF}}>Notifications</h3>
          <button onClick={onClose} className="w-8 h-8 bg-muted rounded-full flex items-center justify-center"><X size={16}/></button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {mine.length===0&&<p className="text-center text-muted-foreground py-8 text-sm">Aucune notification</p>}
          {mine.map(n=>(
            <div key={n.id} onClick={()=>onRead(n.id)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all active:scale-[0.98] ${n.read?"bg-card border-border":"bg-secondary border-primary/20"}`}>
              <p className={`text-sm font-bold ${n.read?"text-foreground":"text-primary"}`}>{n.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
              <p className="text-xs text-muted-foreground/60 mt-1.5">{n.createdAt.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OTPInput({value,onChange}:{value:string;onChange:(v:string)=>void}){
  const refs=useRef<(HTMLInputElement|null)[]>([]);
  const digits=value.padEnd(6," ").split("").slice(0,6);
  const handle=(i:number,v:string)=>{
    const d=[...digits]; d[i]=v.replace(/\D/,"").slice(-1);
    onChange(d.join("").replace(/ /g,""));
    if(v&&i<5) refs.current[i+1]?.focus();
  };
  const kd=(i:number,e:React.KeyboardEvent)=>{
    if(e.key==="Backspace"&&!digits[i].trim()&&i>0) refs.current[i-1]?.focus();
  };
  return(
    <div className="flex gap-3 justify-center">
      {digits.map((d,i)=>(
        <input key={i} ref={el=>refs.current[i]=el}
          type="text" maxLength={1} value={d.trim()}
          onChange={e=>handle(i,e.target.value)} onKeyDown={e=>kd(i,e)}
          className={`w-12 h-14 text-center text-2xl font-black bg-muted rounded-2xl border-2 outline-none transition-all ${d.trim()?"border-primary text-primary":"border-transparent text-foreground"} focus:border-primary focus:scale-105`}/>
      ))}
    </div>
  );
}

/* ════════════════════════ ONBOARDING ILLUSTRATIONS ════════════════════════ */
function Illus1(){
  return(
    <svg viewBox="0 0 280 220" className="w-full h-full">
      <ellipse cx="140" cy="200" rx="120" ry="18" fill="#1A6B45" opacity="0.08"/>
      {/* plate */}
      <ellipse cx="140" cy="150" rx="65" ry="22" fill="#e8f4ee"/>
      <ellipse cx="140" cy="145" rx="55" ry="18" fill="#f0fdf4"/>
      {/* food */}
      <circle cx="125" cy="135" r="18" fill="#E8A020"/>
      <circle cx="155" cy="133" r="14" fill="#c44b0a"/>
      <circle cx="140" cy="140" r="12" fill="#1A6B45"/>
      {/* steam */}
      <path d="M125 110 Q122 103 126 97 Q130 91 127 85" stroke="#94a3b8" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M140 108 Q137 101 141 95 Q145 89 142 83" stroke="#94a3b8" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M155 112 Q152 105 156 99 Q160 93 157 87" stroke="#94a3b8" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      {/* bag */}
      <rect x="90" y="60" width="60" height="50" rx="10" fill="#1A6B45"/>
      <rect x="105" y="52" width="30" height="16" rx="8" fill="none" stroke="#1A6B45" strokeWidth="4"/>
      <text x="120" y="90" textAnchor="middle" fill="white" fontSize="14" fontWeight="800">BD</text>
      {/* stars */}
      <text x="55" y="70" fontSize="18" opacity="0.7">⭐</text>
      <text x="200" y="90" fontSize="14" opacity="0.5">⭐</text>
      <text x="185" y="55" fontSize="10" opacity="0.4">✨</text>
    </svg>
  );
}
function Illus2(){
  return(
    <svg viewBox="0 0 280 220" className="w-full h-full">
      <ellipse cx="140" cy="200" rx="120" ry="18" fill="#1A6B45" opacity="0.08"/>
      {/* phone */}
      <rect x="95" y="35" width="90" height="155" rx="18" fill="#1A1A1A"/>
      <rect x="100" y="41" width="80" height="143" rx="13" fill="#e8f4ee"/>
      {/* map */}
      <rect x="103" y="50" width="74" height="90" rx="8" fill="#d1fae5"/>
      <path d="M113 90 L140 70 L167 85 L155 105 L140 95 L125 108 Z" fill="#bbf7d0" stroke="#1A6B45" strokeWidth="1.5"/>
      {/* route */}
      <path d="M118 112 Q130 98 148 88 Q160 82 165 72" stroke="#1A6B45" strokeWidth="2.5" fill="none" strokeDasharray="5 3" strokeLinecap="round"/>
      {/* pins */}
      <circle cx="118" cy="112" r="7" fill="#1A6B45"/>
      <circle cx="118" cy="112" r="3" fill="white"/>
      <ellipse cx="165" cy="70" rx="8" ry="10" fill="#E8A020"/>
      <circle cx="165" cy="68" r="3.5" fill="white"/>
      {/* status bar */}
      <rect x="103" y="147" width="74" height="36" rx="0" fill="white"/>
      <rect x="108" y="152" width="40" height="6" rx="3" fill="#e8f4ee"/>
      <rect x="108" y="163" width="25" height="4" rx="2" fill="#bbf7d0"/>
      <circle cx="167" cy="160" r="9" fill="#1A6B45"/>
      <path d="M163 160 L166 163 L171 157" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      {/* signal arcs */}
      <path d="M205 80 Q215 70 205 60" stroke="#1A6B45" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M210 85 Q225 70 210 55" stroke="#1A6B45" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6"/>
    </svg>
  );
}
function Illus3(){
  return(
    <svg viewBox="0 0 280 220" className="w-full h-full">
      <ellipse cx="140" cy="200" rx="120" ry="18" fill="#1A6B45" opacity="0.08"/>
      {/* phone */}
      <rect x="95" y="45" width="90" height="145" rx="18" fill="#1A6B45"/>
      <rect x="101" y="52" width="78" height="131" rx="12" fill="#f0fdf4"/>
      {/* Orange Money card */}
      <rect x="108" y="65" width="64" height="38" rx="8" fill="#FF6600"/>
      <circle cx="120" cy="75" r="8" fill="#FFB800" opacity="0.7"/>
      <circle cx="128" cy="75" r="8" fill="#FF6600" opacity="0.7"/>
      <text x="140" y="96" textAnchor="middle" fill="white" fontSize="9" fontWeight="700">ORANGE MONEY</text>
      {/* Airtel card */}
      <rect x="108" y="110" width="64" height="38" rx="8" fill="#CC0000"/>
      <text x="140" y="127" textAnchor="middle" fill="white" fontSize="9" fontWeight="700">AIRTEL MONEY</text>
      <text x="140" y="140" textAnchor="middle" fill="white" fontSize="7">●●●● ●●●●</text>
      {/* coins */}
      <circle cx="188" cy="80" r="14" fill="#E8A020" opacity="0.9"/>
      <circle cx="188" cy="80" r="11" fill="#F59E0B"/>
      <text x="188" y="84" textAnchor="middle" fill="white" fontSize="10" fontWeight="900">F</text>
      <circle cx="200" cy="105" r="10" fill="#E8A020" opacity="0.7"/>
      <circle cx="200" cy="105" r="7.5" fill="#F59E0B" opacity="0.9"/>
      <circle cx="82" cy="95" r="11" fill="#E8A020" opacity="0.6"/>
      <circle cx="82" cy="95" r="8" fill="#F59E0B" opacity="0.8"/>
      {/* check at bottom */}
      <circle cx="140" cy="165" r="12" fill="#1A6B45"/>
      <path d="M134 165 L138 169 L146 160" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

/* ════════════════════════ AUTH SCREENS ═════════════════════════════════════ */
function SplashScreen({onDone}:{onDone:()=>void}){
  useEffect(()=>{const t=setTimeout(onDone,2400);return()=>clearTimeout(t);},[onDone]);
  return(
    <div className="fixed inset-0 bg-primary flex flex-col items-center justify-center overflow-hidden">
      {/* background circles */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3"/>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/3"/>
      <div className="relative flex flex-col items-center gap-5">
        <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-2xl">
          <span className="text-primary font-black text-4xl" style={{fontFamily:DF}}>BD</span>
        </div>
        <div className="text-center">
          <h1 className="text-white text-3xl font-black" style={{fontFamily:DF}}>Bangui Direct</h1>
          <p className="text-white/70 mt-1.5 text-sm tracking-wide">Livraison locale · Bangui, RCA</p>
        </div>
      </div>
      <div className="flex gap-2 mt-20">
        {[0,1,2].map(i=>(<div key={i} className="w-2 h-2 bg-white/40 rounded-full animate-pulse" style={{animationDelay:`${i*0.25}s`}}/>))}
      </div>
    </div>
  );
}

const SLIDES=[
  {title:"Commandez en quelques clics",sub:"Restaurants, pharmacies, marchés et boutiques de Bangui — livrés directement chez vous.",bg:"bg-primary",Illus:Illus1},
  {title:"Suivi en temps réel",sub:"Suivez chaque étape de votre livraison depuis votre téléphone, minute par minute.",bg:"bg-amber-500",Illus:Illus2},
  {title:"Payez comme vous voulez",sub:"Orange Money, Airtel Money ou espèces à la livraison. Simple, sécurisé, rapide.",bg:"bg-blue-600",Illus:Illus3},
];

function OnboardingScreen({onDone}:{onDone:()=>void}){
  const [idx,setIdx]=useState(0);
  const slide=SLIDES[idx];
  const Illus=slide.Illus;
  return(
    <div className={`flex flex-col h-full ${slide.bg} transition-colors duration-500`}>
      {/* Skip */}
      <div className="flex justify-end px-5 pt-12">
        <button onClick={onDone} className="text-white/70 text-sm font-semibold bg-white/15 px-4 py-2 rounded-full">
          Ignorer
        </button>
      </div>
      {/* Illustration */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-xs aspect-square">
          <Illus/>
        </div>
      </div>
      {/* Text */}
      <div className="bg-card rounded-t-[2.5rem] px-7 pt-8 pb-10">
        {/* Dots */}
        <div className="flex gap-2 mb-6 justify-center">
          {SLIDES.map((_,i)=>(
            <div key={i} className={`h-1.5 rounded-full transition-all ${i===idx?"w-8 bg-primary":"w-2 bg-muted"}`}/>
          ))}
        </div>
        <h2 className="text-2xl font-black text-foreground text-center leading-tight mb-3" style={{fontFamily:DF}}>
          {slide.title}
        </h2>
        <p className="text-muted-foreground text-center text-sm leading-relaxed mb-8">
          {slide.sub}
        </p>
        {idx<SLIDES.length-1?(
          <button onClick={()=>setIdx(i=>i+1)}
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-base shadow-lg active:scale-[0.97] transition-transform">
            Suivant <ArrowRight className="inline ml-1" size={18}/>
          </button>
        ):(
          <button onClick={onDone}
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-base shadow-lg active:scale-[0.97] transition-transform">
            Commencer maintenant
          </button>
        )}
      </div>
    </div>
  );
}

function AuthChoiceScreen({onLogin,onRegister}:{onLogin:()=>void;onRegister:()=>void}){
  return(
    <div className="flex flex-col h-full bg-primary overflow-hidden">
      <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/4 translate-x-1/4"/>
      <div className="absolute bottom-48 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/4 -translate-x-1/4"/>
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center relative z-10">
        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-2xl mb-6">
          <span className="text-primary font-black text-3xl" style={{fontFamily:DF}}>BD</span>
        </div>
        <h1 className="text-white text-3xl font-black mb-3" style={{fontFamily:DF}}>Bangui Direct</h1>
        <p className="text-white/70 text-sm leading-relaxed max-w-xs">
          La première application de livraison locale à Bangui. Rapide, fiable, à votre service.
        </p>
        {/* Trust indicators */}
        <div className="flex gap-6 mt-8">
          {[{v:"7",l:"Commerces"},  {v:"100+",l:"Produits"}, {v:"4.8★",l:"Note"}].map(i=>(
            <div key={i.l} className="text-center">
              <p className="text-white font-black text-xl" style={{fontFamily:DF}}>{i.v}</p>
              <p className="text-white/60 text-xs">{i.l}</p>
            </div>
          ))}
        </div>
      </div>
      {/* CTA */}
      <div className="bg-card rounded-t-[2.5rem] px-6 pt-8 pb-10 space-y-3">
        <button onClick={onLogin}
          className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-base shadow-lg active:scale-[0.97] transition-transform">
          Se connecter
        </button>
        <button onClick={onRegister}
          className="w-full bg-muted text-foreground py-4 rounded-2xl font-bold text-base active:scale-[0.97] transition-transform">
          Créer un compte
        </button>
        <p className="text-center text-xs text-muted-foreground pt-2">
          En continuant, vous acceptez nos{" "}
          <span className="text-primary font-semibold">Conditions d'utilisation</span>
        </p>
      </div>
    </div>
  );
}

function LoginScreen({onLogin,onBack,onRegister}:{onLogin:(u:AppUser)=>void;onBack:()=>void;onRegister:()=>void}){
  const [email,setEmail]=useState("");
  const [pwd,setPwd]=useState("");
  const [showPwd,setShowPwd]=useState(false);
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);

  const doLogin=async()=>{
    if(!email.trim()||!pwd){setErr("Merci de renseigner votre email et votre mot de passe.");return;}
    setErr("");setLoading(true);
    try{
      const {token,user}=await AuthAPI.login(email.trim(),pwd);
      setAuthToken(token);
      setLoading(false);
      onLogin({id:user.id,name:user.name,email:user.email,role:user.role,storeId:user.storeId,telephone:user.telephone,accountType:user.accountType});
    }catch(e:any){
      setLoading(false);
      setErr(e?.message||"Email ou mot de passe incorrect.");
    }
  };

  const socialLogin=(provider:string)=>{
    setErr("La connexion via "+provider+" n'est pas encore disponible. Utilisez votre email et mot de passe.");
  };

  const demoAccounts=[
    {label:"👤 Client",     email:"client@test.com",  cls:"bg-blue-50 text-blue-700 border border-blue-200"},
    {label:"🏪 Commerçant", email:"merchant@test.com", cls:"bg-amber-50 text-amber-700 border border-amber-200"},
    {label:"🏍️ Livreur",   email:"driver@test.com",   cls:"bg-violet-50 text-violet-700 border border-violet-200"},
    {label:"⚙️ Admin",      email:"admin@test.com",    cls:"bg-primary/10 text-primary border border-primary/20"},
  ];

  return(
    <div className="flex flex-col h-full bg-card overflow-hidden">
      {/* Header */}
      <div className="bg-primary px-5 pt-14 pb-8">
        <button onClick={onBack} className="flex items-center gap-2 text-white/70 mb-6 text-sm">
          <ChevronLeft size={18}/>Retour
        </button>
        <h1 className="text-white text-2xl font-black" style={{fontFamily:DF}}>Connexion</h1>
        <p className="text-white/70 text-sm mt-1">Bienvenue sur Bangui Direct</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 scrollbar-hide">
        {/* Social login */}
        <div className="space-y-2.5 mb-5">
          {[
            {icon:<GoogleIcon/>,   label:"Continuer avec Google",   bg:"bg-white border border-gray-200",  text:"text-foreground"},
            {icon:<AppleIcon/>,    label:"Continuer avec Apple",    bg:"bg-black",                          text:"text-white"},
            {icon:<FacebookIcon/>, label:"Continuer avec Facebook", bg:"bg-[#1877F2]",                      text:"text-white"},
          ].map(s=>(
            <button key={s.label} onClick={()=>socialLogin(s.label)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-semibold text-sm ${s.bg} ${s.text} shadow-sm active:scale-[0.97] transition-transform`}>
              <span className="w-6 flex-shrink-0 flex items-center justify-center">{s.icon}</span>
              <span className="flex-1 text-center">{s.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-border"/>
          <span className="text-xs text-muted-foreground font-medium">ou par email</span>
          <div className="flex-1 h-px bg-border"/>
        </div>

        {/* Form */}
        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"/>
              <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="votre@email.com"
                className="w-full bg-muted rounded-xl pl-10 pr-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"/>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">Mot de passe</label>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"/>
              <input value={pwd} onChange={e=>setPwd(e.target.value)} type={showPwd?"text":"password"} placeholder="••••••••"
                className="w-full bg-muted rounded-xl pl-10 pr-12 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"/>
              <button onClick={()=>setShowPwd(v=>!v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPwd?<EyeOff size={16}/>:<Eye size={16}/>}
              </button>
            </div>
          </div>
          {err&&<p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle size={12}/>{err}</p>}
          <div className="flex justify-end">
            <button className="text-primary text-xs font-semibold">Mot de passe oublié ?</button>
          </div>
        </div>

        <button onClick={doLogin} disabled={loading}
          className={`w-full py-4 rounded-2xl font-bold text-sm shadow-lg transition-all ${loading?"bg-primary/60 text-white":"bg-primary text-white active:scale-[0.97]"}`}>
          {loading?"Connexion en cours…":"Se connecter"}
        </button>

        {/* Demo accounts */}
        <div className="mt-5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Comptes démo (mot de passe : password123)</p>
          <div className="grid grid-cols-2 gap-2">
            {demoAccounts.map(d=>(
              <button key={d.email} onClick={()=>{setEmail(d.email);setPwd("password123");setErr("");}}
                className={`${d.cls} rounded-xl py-2.5 text-xs font-bold text-center active:scale-95 transition-transform`}>
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-5">
          Pas de compte ?{" "}
          <button onClick={onRegister} className="text-primary font-bold">Créer un compte</button>
        </p>
      </div>
      {loading&&(
        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card rounded-2xl p-6 shadow-xl flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" style={{borderWidth:"3px"}}/>
            <p className="text-sm font-semibold">Connexion en cours…</p>
          </div>
        </div>
      )}
    </div>
  );
}

function AccountTypeScreen({onSelect,onBack}:{onSelect:(t:AccountType)=>void;onBack:()=>void}){
  const types=[
    {id:"personal" as AccountType, icon:"👤", title:"Compte Personnel", sub:"Commandez auprès de restaurants, pharmacies, marchés et boutiques de Bangui.", badge:"", color:"border-border hover:border-primary"},
    {id:"merchant_pro" as AccountType, icon:"🏪", title:"Compte Commerçant Pro", sub:"Vendez vos produits, gérez vos commandes et développez votre activité.", badge:"PRO", color:"border-amber-200 hover:border-amber-400"},
    {id:"driver_pro" as AccountType, icon:"🏍️", title:"Compte Livreur Pro", sub:"Effectuez des livraisons et gagnez de l'argent à votre rythme.", badge:"PRO", color:"border-violet-200 hover:border-violet-400"},
  ];
  return(
    <div className="flex flex-col h-full bg-card">
      <div className="bg-primary px-5 pt-14 pb-8">
        <button onClick={onBack} className="flex items-center gap-2 text-white/70 mb-6 text-sm">
          <ChevronLeft size={18}/>Retour
        </button>
        <h1 className="text-white text-2xl font-black" style={{fontFamily:DF}}>Quel type de compte ?</h1>
        <p className="text-white/70 text-sm mt-1">Choisissez selon votre profil</p>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {types.map(t=>(
          <button key={t.id} onClick={()=>onSelect(t.id)}
            className={`w-full text-left border-2 ${t.color} bg-card rounded-2xl p-5 transition-all active:scale-[0.97] shadow-sm`}>
            <div className="flex items-start gap-4">
              <span className="text-4xl leading-none mt-1">{t.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-black text-base" style={{fontFamily:DF}}>{t.title}</p>
                  {t.badge&&<span className="text-xs font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{t.badge}</span>}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{t.sub}</p>
              </div>
              <ChevronRight size={18} className="text-muted-foreground flex-shrink-0 mt-1"/>
            </div>
          </button>
        ))}
        <p className="text-center text-xs text-muted-foreground pt-2 pb-4">
          Vous pouvez modifier votre type de compte à tout moment dans les paramètres.
        </p>
      </div>
    </div>
  );
}

function RegisterScreen({accountType,onSubmit,onBack,initialError}:{accountType:AccountType;onSubmit:(data:{name:string;phone:string;email:string;pwd:string})=>void;onBack:()=>void;initialError?:string}){
  const COUNTRIES=[
    {code:"+236",flag:"🇨🇫",name:"Centrafrique"},
    {code:"+235",flag:"🇹🇩",name:"Tchad"},
    {code:"+237",flag:"🇨🇲",name:"Cameroun"},
    {code:"+242",flag:"🇨🇬",name:"Congo-Brazzaville"},
    {code:"+243",flag:"🇨🇩",name:"RD Congo"},
    {code:"+241",flag:"🇬🇦",name:"Gabon"},
    {code:"+33", flag:"🇫🇷",name:"France"},
  ];
  const [country,setCountry]=useState(COUNTRIES[0]);
  const [showCountryPicker,setShowCountryPicker]=useState(false);
  const [form,setForm]=useState({name:"",phone:"",email:"",pwd:"",confirmPwd:""});
  const [showPwd,setShowPwd]=useState(false);
  const [storeName,setStoreName]=useState("");
  const [err,setErr]=useState(initialError||"");
  const isMerchant=accountType==="merchant_pro";
  const isDriver=accountType==="driver_pro";
  const title=isMerchant?"Compte Commerçant Pro":isDriver?"Compte Livreur Pro":"Compte Personnel";
  const emoji=isMerchant?"🏪":isDriver?"🏍️":"👤";

  const submit=()=>{
    if(!form.name||!form.phone||!form.email||!form.pwd){setErr("Veuillez remplir tous les champs obligatoires.");return;}
    if(form.pwd!==form.confirmPwd){setErr("Les mots de passe ne correspondent pas.");return;}
    if(form.pwd.length<8){setErr("Le mot de passe doit contenir au moins 8 caractères.");return;}
    if(!/[a-z]/.test(form.pwd)){setErr("Le mot de passe doit contenir au moins une minuscule.");return;}
    if(!/[A-Z]/.test(form.pwd)){setErr("Le mot de passe doit contenir au moins une majuscule.");return;}
    if(!/[0-9]/.test(form.pwd)){setErr("Le mot de passe doit contenir au moins un chiffre.");return;}
    if(!/[^A-Za-z0-9]/.test(form.pwd)){setErr("Le mot de passe doit contenir au moins un caractère spécial (ex: ! ? # @ _ -).");return;}
    setErr("");
    onSubmit({name:form.name,phone:country.code+" "+form.phone,email:form.email,pwd:form.pwd});
  };

  const field=(label:string,key:keyof typeof form,opts?:{type?:string;placeholder?:string;icon?:React.ReactNode})=>(
    <div key={key}>
      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">{label}</label>
      <div className="relative">
        {opts?.icon&&<span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">{opts.icon}</span>}
        <input type={opts?.type||"text"} value={form[key]} placeholder={opts?.placeholder}
          onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}
          className={`w-full bg-muted rounded-xl ${opts?.icon?"pl-10":"pl-4"} pr-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all`}/>
      </div>
    </div>
  );

  return(
    <div className="flex flex-col h-full bg-card">
      <div className="bg-primary px-5 pt-14 pb-8">
        <button onClick={onBack} className="flex items-center gap-2 text-white/70 mb-6 text-sm">
          <ChevronLeft size={18}/>Retour
        </button>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{emoji}</span>
          <div>
            <h1 className="text-white text-xl font-black" style={{fontFamily:DF}}>{title}</h1>
            <p className="text-white/70 text-sm">Créez votre compte gratuitement</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3 scrollbar-hide">
        {/* Social register */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            {icon:<GoogleIcon/>,   label:"Google", bg:"bg-white border border-gray-200 text-foreground"},
            {icon:<AppleIcon/>,    label:"Apple",  bg:"bg-black text-white"},
            {icon:<FacebookIcon/>, label:"Facebook",bg:"bg-[#1877F2] text-white"},
          ].map(s=>(
            <button key={s.label} className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl ${s.bg} text-xs font-semibold active:scale-95 transition-transform shadow-sm`}>
              {s.icon}<span>{s.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 mb-1">
          <div className="flex-1 h-px bg-border"/>
          <span className="text-xs text-muted-foreground">ou remplissez le formulaire</span>
          <div className="flex-1 h-px bg-border"/>
        </div>

        {field("Nom complet *","name",{placeholder:"Jean-Baptiste Maïna",icon:<User size={15}/>})}
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">Téléphone *</label>
          <div className="flex gap-2 relative">
            <button type="button" onClick={()=>setShowCountryPicker(v=>!v)}
              className="bg-muted rounded-xl px-3 py-3.5 flex items-center gap-1.5 flex-shrink-0">
              <span className="text-sm">{country.flag}</span>
              <span className="text-sm font-semibold">{country.code}</span>
              <ChevronDown size={13}/>
            </button>
            <input value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))}
              placeholder="72 01 23 45" className="flex-1 bg-muted rounded-xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"/>
            {showCountryPicker&&(
              <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-20 w-56 overflow-hidden">
                {COUNTRIES.map(c=>(
                  <button key={c.code} type="button" onClick={()=>{setCountry(c);setShowCountryPicker(false);}}
                    className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm hover:bg-muted text-left">
                    <span>{c.flag}</span><span className="flex-1">{c.name}</span><span className="text-muted-foreground">{c.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {field("Email *","email",{type:"email",placeholder:"vous@email.com",icon:<Mail size={15}/>})}
        {isMerchant&&(
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">Nom du commerce *</label>
            <div className="relative">
              <Building2 size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"/>
              <input value={storeName} onChange={e=>setStoreName(e.target.value)} placeholder="Mon Restaurant / Ma Boutique…"
                className="w-full bg-muted rounded-xl pl-10 pr-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"/>
            </div>
          </div>
        )}
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">Mot de passe *</label>
          <div className="relative">
            <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"/>
            <input type={showPwd?"text":"password"} value={form.pwd} onChange={e=>setForm(p=>({...p,pwd:e.target.value}))} placeholder="8 caractères min., Aa1!"
              className="w-full bg-muted rounded-xl pl-10 pr-12 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"/>
            <button onClick={()=>setShowPwd(v=>!v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showPwd?<EyeOff size={16}/>:<Eye size={16}/>}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Au moins 8 caractères, avec une majuscule, une minuscule, un chiffre et un caractère spécial.</p>
        </div>
        {field("Confirmer le mot de passe *","confirmPwd",{type:showPwd?"text":"password",placeholder:"Répétez le mot de passe",icon:<Lock size={15}/>})}

        {err&&<div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
          <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5"/><p className="text-red-600 text-xs">{err}</p>
        </div>}

        <button onClick={submit}
          className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg active:scale-[0.97] transition-transform">
          Continuer
        </button>

        <div className="text-xs text-muted-foreground text-center pb-4">
          En créant un compte, vous acceptez nos{" "}
          <span className="text-primary font-semibold">Conditions générales</span>{" "}et notre{" "}
          <span className="text-primary font-semibold">Politique de confidentialité</span>.
        </div>
      </div>
    </div>
  );
}

function OTPScreen({phone,onVerify,onBack}:{phone:string;onVerify:()=>void;onBack:()=>void}){
  const [otp,setOtp]=useState("");
  const [timer,setTimer]=useState(60);
  const [err,setErr]=useState("");
  const [verified,setVerified]=useState(false);

  useEffect(()=>{
    if(timer>0){const t=setTimeout(()=>setTimer(v=>v-1),1000);return()=>clearTimeout(t);}
  },[timer]);

  const verify=()=>{
    if(otp==="123456"||otp.length===6){
      setVerified(true);
      setTimeout(onVerify,1200);
    } else {
      setErr("Code incorrect. Code démo : 123456");
    }
  };

  return(
    <div className="flex flex-col h-full bg-card">
      <div className="bg-primary px-5 pt-14 pb-8">
        <button onClick={onBack} className="flex items-center gap-2 text-white/70 mb-6 text-sm">
          <ChevronLeft size={18}/>Retour
        </button>
        <h1 className="text-white text-2xl font-black" style={{fontFamily:DF}}>Vérification</h1>
        <p className="text-white/70 text-sm mt-1">Entrez le code reçu par SMS</p>
      </div>

      <div className="flex-1 px-6 py-8 flex flex-col">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-5">
            <Smartphone size={36} className="text-primary"/>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Un code à 6 chiffres a été envoyé au<br/>
            <strong className="text-foreground">{phone}</strong>
          </p>
        </div>

        <OTPInput value={otp} onChange={setOtp}/>

        {err&&!verified&&(
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mt-4">
            <AlertCircle size={14} className="text-red-500 flex-shrink-0"/><p className="text-red-600 text-xs">{err}</p>
          </div>
        )}

        {verified&&(
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 mt-4">
            <CheckCircle size={14} className="text-emerald-600 flex-shrink-0"/><p className="text-emerald-700 text-xs font-semibold">Code vérifié ! Création du compte…</p>
          </div>
        )}

        <button onClick={verify} disabled={otp.length<6||verified}
          className={`mt-6 w-full py-4 rounded-2xl font-bold shadow-lg transition-all ${otp.length===6&&!verified?"bg-primary text-white active:scale-[0.97]":"bg-muted text-muted-foreground"}`}>
          {verified?"Compte créé ✓":"Vérifier le code"}
        </button>

        <div className="mt-6 text-center">
          {timer>0?(
            <p className="text-muted-foreground text-sm">Renvoyer dans <strong className="text-primary">{timer}s</strong></p>
          ):(
            <button onClick={()=>setTimer(60)} className="text-primary font-semibold text-sm">Renvoyer le code</button>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4 bg-muted rounded-xl py-3 px-4">
          Code de démonstration : <strong>123456</strong>
        </p>
      </div>
    </div>
  );
}

/* ════════════════════════════ CLIENT APP ════════════════════════════════════ */
const PROMOS=[
  {id:1,title:"Livraison gratuite",sub:"Sur votre première commande",from:"from-emerald-600",to:"to-green-500",emoji:"🎁"},
  {id:2,title:"Marché KM5",sub:"Légumes frais en 30 min",from:"from-amber-500",to:"to-orange-500",emoji:"🥬"},
  {id:3,title:"Pharmacie 7j/7",sub:"Médicaments en urgence",from:"from-blue-600",to:"to-cyan-500",emoji:"💊"},
];
const CATS=[
  {type:"restaurant" as StoreType,label:"Restaurant",icon:<ChefHat size={22}/>,special:false},
  {type:"pharmacie"  as StoreType,label:"Pharmacie", icon:null, special:true},
  {type:"marche"     as StoreType,label:"Marché",    icon:<ShoppingBag size={22}/>,special:false},
  {type:"boutique"   as StoreType,label:"Boutique",  icon:<Package size={22}/>,special:false},
  {type:"express"    as StoreType,label:"Express",   icon:<Zap size={22}/>,special:false},
];
const CAT_COLOR:Record<StoreType,string>={
  restaurant:"bg-orange-50 text-orange-600 border-orange-100",
  pharmacie:"bg-green-50 text-green-600 border-green-100",
  marche:"bg-yellow-50 text-yellow-700 border-yellow-100",
  boutique:"bg-purple-50 text-purple-600 border-purple-100",
  express:"bg-primary/5 text-primary border-primary/10",
};

function StoreCard({store,isFav,onFav,onClick}:{store:Store;isFav:boolean;onFav:()=>void;onClick:()=>void}){
  const tc=STORE_TYPE_CFG[store.type];
  return(
    <div className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border active:scale-[0.99] transition-transform cursor-pointer" onClick={onClick}>
      <div className="relative">
        <img src={store.coverImage} alt={store.name} className="w-full h-44 object-cover bg-muted"/>
        {!store.isOpen&&(
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-white/90 text-foreground text-xs font-bold px-3 py-1.5 rounded-full">Fermé · Ouvre {store.openHours.split("–")[0]}</span>
          </div>
        )}
        <button onClick={e=>{e.stopPropagation();onFav();}}
          className="absolute top-3 right-3 w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-md active:scale-90 transition-transform">
          <Heart size={17} className={isFav?"fill-red-500 text-red-500":"text-gray-400"}/>
        </button>
        {store.type==="express"&&(
          <div className="absolute top-3 left-3 bg-primary text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
            <Zap size={10}/>Express
          </div>
        )}
        <div className={`absolute bottom-3 left-3 flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold ${tc.color}`}>
          {tc.icon}{tc.label}
        </div>
      </div>
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-foreground leading-tight truncate text-base" style={{fontFamily:DF}}>{store.name}</h3>
            <p className="text-muted-foreground text-xs mt-0.5 flex items-center gap-1"><MapPin size={10}/>{store.quartier}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
            <Star size={12} className="fill-amber-400 text-amber-400"/>
            <span className="text-xs font-black text-amber-700">{store.rating}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-2.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock size={11}/>{store.deliveryTime}</span>
          <span className="flex items-center gap-1"><Truck size={11}/>{FMT(store.deliveryFee)}</span>
          <span className="text-[10px]">{store.ratingCount} avis</span>
        </div>
      </div>
    </div>
  );
}

function ProductRow({product,qty,onAdd,onRemove}:{product:Product;qty:number;onAdd:()=>void;onRemove:()=>void}){
  return(
    <div className="flex gap-3 py-3.5 border-b border-border last:border-0">
      <img src={product.image} alt={product.name} className="w-20 h-20 rounded-xl object-cover bg-muted flex-shrink-0"/>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-sm leading-snug">{product.name}</h4>
        <p className="text-muted-foreground text-xs mt-0.5 line-clamp-2">{product.description}</p>
        {!product.available&&<span className="text-red-500 text-xs font-medium mt-1 block">Indisponible</span>}
        <div className="flex items-center justify-between mt-2.5">
          <span className="text-primary font-black text-sm">{FMT(product.price)}</span>
          {product.available&&(
            qty===0?(
              <button onClick={onAdd}
                className="bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform shadow-sm">
                <Plus size={16}/>
              </button>
            ):(
              <div className="flex items-center gap-2 bg-primary rounded-full px-3 py-1.5">
                <button onClick={onRemove}><Minus size={13} className="text-white"/></button>
                <span className="text-white font-black text-sm w-4 text-center">{qty}</span>
                <button onClick={onAdd}><Plus size={13} className="text-white"/></button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function ClientNav({view,setView,cartCount,unread}:{view:ClientView;setView:(v:ClientView)=>void;cartCount:number;unread:number}){
  const items:[ClientView,React.ReactNode,string][]=[
    ["home",    <Home size={21}/>,         "Accueil"],
    ["search",  <Search size={21}/>,       "Rechercher"],
    ["cart",    <ShoppingCart size={21}/>, "Panier"],
    ["orders",  <ClipboardList size={21}/>,"Commandes"],
    ["favorites",<Heart size={21}/>,       "Favoris"],
    ["profile", <User size={21}/>,         "Profil"],
  ];
  return(
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm bg-card/95 backdrop-blur border-t border-border shadow-2xl z-40">
      <div className="flex items-stretch">
        {items.map(([v,icon,label])=>{
          const active=view===v;
          return(
            <button key={v} onClick={()=>setView(v)}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 relative transition-colors ${active?"text-primary":"text-muted-foreground"}`}>
              {active&&<div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full"/>}
              <div className="relative">
                {icon}
                {v==="cart"&&cartCount>0&&(
                  <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">{cartCount}</span>
                )}
                {v==="profile"&&unread>0&&(
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-card"/>
                )}
              </div>
              <span className={`text-[10px] font-semibold ${active?"text-primary":""}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function ClientApp({user,allOrders,setAllOrders,allNotifs,setAllNotifs,allProducts,onLogout}:{
  user:AppUser;allOrders:Order[];setAllOrders:React.Dispatch<React.SetStateAction<Order[]>>;
  allNotifs:Notif[];setAllNotifs:React.Dispatch<React.SetStateAction<Notif[]>>;
  allProducts:Product[];onLogout:()=>void;
}){
  const [view,setView]=useState<ClientView>("home");
  const [activeStore,setActiveStore]=useState<Store|null>(null);
  const [filterType,setFilterType]=useState<StoreType|null>(null);
  const [cart,setCart]=useState<CartItem[]>([]);
  const [cartStoreId,setCartStoreId]=useState<string|null>(null);
  const [activeOrder,setActiveOrder]=useState<Order|null>(null);
  const [favorites,setFavorites]=useState<string[]>(["s1","s3"]);
  const [query,setQuery]=useState("");
  const [showNotif,setShowNotif]=useState(false);
  const [delivery,setDelivery]=useState<Partial<DeliveryInfo>>({nom:user.name,telephone:user.telephone||""});
  const [payment,setPayment]=useState<PaymentMethod>("orange_money");
  const [note,setNote]=useState("");
  const [promoIdx,setPromoIdx]=useState(0);

  useEffect(()=>{const i=setInterval(()=>setPromoIdx(a=>(a+1)%PROMOS.length),3500);return()=>clearInterval(i);},[]);

  const myOrders=allOrders.filter(o=>o.clientId===user.id);
  const unread=allNotifs.filter(n=>n.userId===user.id&&!n.read).length;
  const cartTotal=cart.reduce((s,i)=>s+i.product.price*i.qty,0);
  const storeProducts=activeStore?allProducts.filter(p=>p.storeId===activeStore.id):[];
  const filteredStores=STORES.filter(s=>!filterType||s.type===filterType).filter(s=>!query||s.name.toLowerCase().includes(query.toLowerCase())||s.category.toLowerCase().includes(query.toLowerCase()));

  const addToCart=(product:Product)=>{
    if(cartStoreId&&cartStoreId!==product.storeId){setCart([]);setCartStoreId(product.storeId);}
    if(!cartStoreId)setCartStoreId(product.storeId);
    setCart(prev=>{const ex=prev.find(i=>i.product.id===product.id);return ex?prev.map(i=>i.product.id===product.id?{...i,qty:i.qty+1}:i):[...prev,{product,qty:1}];});
  };
  const removeFromCart=(pid:string)=>{
    setCart(prev=>{const u=prev.map(i=>i.product.id===pid?{...i,qty:i.qty-1}:i).filter(i=>i.qty>0);if(u.length===0)setCartStoreId(null);return u;});
  };
  const getQty=(pid:string)=>cart.find(i=>i.product.id===pid)?.qty??0;

  const placeOrder=()=>{
    const d=delivery as DeliveryInfo;
    if(!activeStore||!d.quartier||!d.adresse||!d.telephone)return;
    const id=`CMD-${String(allOrders.length+1).padStart(3,"0")}`;
    const o:Order={id,storeId:activeStore.id,storeName:activeStore.name,storeType:activeStore.type,clientId:user.id,clientName:user.name,items:[...cart],status:"nouvelle",subtotal:cartTotal,deliveryFee:activeStore.deliveryFee,total:cartTotal+activeStore.deliveryFee,paymentMethod:payment,delivery:d,createdAt:new Date(),note};
    setAllOrders(prev=>[o,...prev]);
    setAllNotifs(prev=>[{id:`n${Date.now()}`,userId:activeStore.merchantId,title:"🔔 Nouvelle commande !",body:`Commande ${id} de ${user.name}`,read:false,createdAt:new Date(),orderId:id},...prev]);
    setCart([]);setCartStoreId(null);setActiveOrder(o);setView("order_detail");
  };
  const readNotif=(id:string)=>setAllNotifs(prev=>prev.map(n=>n.id===id?{...n,read:true}:n));
  const toggleFav=(id:string)=>setFavorites(prev=>prev.includes(id)?prev.filter(f=>f!==id):[...prev,id]);

  /* HOME */
  const renderHome=()=>(
    <div className="px-4 pt-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Bonjour 👋</p>
          <h1 className="font-black text-xl leading-tight" style={{fontFamily:DF}}>{user.name.split(" ")[0]}</h1>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={()=>setShowNotif(true)} className="relative w-10 h-10 bg-card border border-border rounded-2xl flex items-center justify-center shadow-sm">
            <Bell size={18}/>
            {unread>0&&<span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-card">{unread}</span>}
          </button>
          <BDLogo size="sm"/>
        </div>
      </div>
      {/* Search bar */}
      <button onClick={()=>setView("search")}
        className="w-full flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3.5 shadow-sm active:scale-[0.98] transition-transform">
        <Search size={17} className="text-muted-foreground flex-shrink-0"/>
        <span className="text-sm text-muted-foreground flex-1 text-left">Restaurants, pharmacies, marchés…</span>
        <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded-xl text-muted-foreground">
          <MapPin size={11}/><span className="text-xs">Bangui</span>
        </div>
      </button>
      {/* Promo carousel */}
      <div className="relative overflow-hidden rounded-2xl h-36">
        {PROMOS.map((promo,i)=>(
          <div key={promo.id}
            className={`absolute inset-0 bg-gradient-to-r ${promo.from} ${promo.to} transition-opacity duration-500 flex items-center justify-between px-6`}
            style={{opacity:i===promoIdx?1:0}}>
            <div>
              <p className="text-white/75 text-xs font-medium mb-1">{promo.sub}</p>
              <h3 className="text-white text-xl font-black" style={{fontFamily:DF}}>{promo.title}</h3>
              <div className="mt-3 inline-flex items-center gap-1 bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                Commander <ArrowRight size={11}/>
              </div>
            </div>
            <span className="text-5xl select-none">{promo.emoji}</span>
          </div>
        ))}
        <div className="absolute bottom-3 right-4 flex gap-1.5">
          {PROMOS.map((_,i)=>(
            <button key={i} onClick={()=>setPromoIdx(i)} className={`h-1.5 rounded-full transition-all ${i===promoIdx?"w-5 bg-white":"w-1.5 bg-white/40"}`}/>
          ))}
        </div>
      </div>
      {/* Categories */}
      <div>
        <h2 className="font-black text-base mb-3" style={{fontFamily:DF}}>Catégories</h2>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
          {CATS.map(cat=>(
            <button key={cat.type} onClick={()=>{setFilterType(cat.type);setView("search");}}
              className={`flex-shrink-0 flex flex-col items-center gap-2 px-5 py-3.5 rounded-2xl border ${CAT_COLOR[cat.type]} active:scale-95 transition-transform`}>
              {cat.special?<PharmaCross size={32}/>:<div className="w-8 h-8 flex items-center justify-center">{cat.icon}</div>}
              <span className="text-xs font-bold">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>
      {/* Stores */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-base" style={{fontFamily:DF}}>Commerces ouverts</h2>
          <button onClick={()=>setView("search")} className="text-primary text-xs font-bold">Voir tout →</button>
        </div>
        <div className="space-y-4 pb-4">
          {STORES.filter(s=>s.isOpen).map(s=>(
            <StoreCard key={s.id} store={s} isFav={favorites.includes(s.id)} onFav={()=>toggleFav(s.id)}
              onClick={()=>{setActiveStore(s);setView("store");}}/>
          ))}
          {STORES.filter(s=>!s.isOpen).length>0&&(
            <div className="opacity-60">
              <p className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wide">Actuellement fermés</p>
              {STORES.filter(s=>!s.isOpen).map(s=>(
                <StoreCard key={s.id} store={s} isFav={favorites.includes(s.id)} onFav={()=>toggleFav(s.id)}
                  onClick={()=>{setActiveStore(s);setView("store");}}/>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  /* SEARCH */
  const renderSearch=()=>(
    <div className="px-4 pt-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={()=>{setView("home");setFilterType(null);setQuery("");}} className="w-10 h-10 bg-card border border-border rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
          <ChevronLeft size={18}/>
        </button>
        <div className="flex-1 flex items-center gap-2 bg-card border border-border rounded-2xl px-4 py-3 shadow-sm">
          <Search size={16} className="text-muted-foreground flex-shrink-0"/>
          <input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher…"
            className="flex-1 text-sm outline-none bg-transparent"/>
          {query&&<button onClick={()=>setQuery("")}><X size={14} className="text-muted-foreground"/></button>}
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        <button onClick={()=>setFilterType(null)}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-all ${!filterType?"bg-primary text-white border-primary":"bg-card text-foreground border-border"}`}>
          Tout
        </button>
        {CATS.map(c=>(
          <button key={c.type} onClick={()=>setFilterType(c.type===filterType?null:c.type)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-all ${filterType===c.type?"bg-primary text-white border-primary":"bg-card text-foreground border-border"}`}>
            {c.label}
          </button>
        ))}
      </div>
      <div className="space-y-4 pb-4">
        {filteredStores.length===0&&<div className="text-center py-16"><Search size={40} className="mx-auto text-muted-foreground/40 mb-3"/><p className="text-muted-foreground font-medium">Aucun résultat</p></div>}
        {filteredStores.map(s=>(
          <StoreCard key={s.id} store={s} isFav={favorites.includes(s.id)} onFav={()=>toggleFav(s.id)}
            onClick={()=>{setActiveStore(s);setView("store");}}/>
        ))}
      </div>
    </div>
  );

  /* STORE */
  const renderStore=()=>{
    if(!activeStore)return null;
    const cats2=[...new Set(storeProducts.map(p=>p.category))];
    const tc=STORE_TYPE_CFG[activeStore.type];
    const cartForStore=cart.filter(i=>i.product.storeId===activeStore.id);
    const storeCartTotal=cartForStore.reduce((s,i)=>s+i.product.price*i.qty,0);
    return(
      <div>
        <div className="relative h-60">
          <img src={activeStore.coverImage} alt={activeStore.name} className="w-full h-full object-cover bg-muted"/>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"/>
          <button onClick={()=>setView("home")} className="absolute top-4 left-4 w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20">
            <ChevronLeft size={18} className="text-white"/>
          </button>
          <button onClick={()=>toggleFav(activeStore.id)} className="absolute top-4 right-4 w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20">
            <Heart size={17} className={favorites.includes(activeStore.id)?"fill-red-400 text-red-400":"text-white"}/>
          </button>
          <div className="absolute bottom-4 left-4 right-4">
            <div className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-bold mb-2 ${tc.color}`}>{tc.icon}{tc.label}</div>
            <h1 className="text-white text-2xl font-black" style={{fontFamily:DF}}>{activeStore.name}</h1>
            <div className="flex items-center gap-3 text-white/80 text-xs mt-1">
              <span className="flex items-center gap-1"><Star size={11} className="fill-amber-400 text-amber-400"/>{activeStore.rating}</span>
              <span className="flex items-center gap-1"><Clock size={11}/>{activeStore.deliveryTime}</span>
              <span className="flex items-center gap-1"><Truck size={11}/>{FMT(activeStore.deliveryFee)}</span>
            </div>
          </div>
        </div>
        <div className="px-4 py-4 pb-28 space-y-6">
          <p className="text-sm text-muted-foreground">{activeStore.description}</p>
          {cats2.map(cat=>(
            <div key={cat}>
              <h2 className="font-black text-base mb-1 pb-2 border-b border-border" style={{fontFamily:DF}}>{cat}</h2>
              {storeProducts.filter(p=>p.category===cat).map(p=>(
                <ProductRow key={p.id} product={p} qty={getQty(p.id)} onAdd={()=>addToCart(p)} onRemove={()=>removeFromCart(p.id)}/>
              ))}
            </div>
          ))}
        </div>
        {cart.length>0&&cartStoreId===activeStore.id&&(
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 pb-2">
            <button onClick={()=>setView("cart")}
              className="w-full bg-primary text-white py-4 rounded-2xl font-black flex items-center justify-between px-5 shadow-xl active:scale-[0.97] transition-transform">
              <span className="bg-white/20 text-white text-xs font-black px-2 py-1 rounded-xl">{cart.reduce((s,i)=>s+i.qty,0)} article{cart.reduce((s,i)=>s+i.qty,0)>1?"s":""}</span>
              <span style={{fontFamily:DF}}>Voir le panier</span>
              <span>{FMT(storeCartTotal)}</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  /* CART */
  const renderCart=()=>{
    const cs=STORES.find(s=>s.id===cartStoreId);
    return(
      <div className="px-4 pt-4 pb-4 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={()=>setView(activeStore?"store":"home")} className="w-10 h-10 bg-card border border-border rounded-2xl flex items-center justify-center shadow-sm">
            <ChevronLeft size={18}/>
          </button>
          <h1 className="font-black text-xl flex-1" style={{fontFamily:DF}}>Mon panier</h1>
          {cart.length>0&&<button onClick={()=>{setCart([]);setCartStoreId(null);}} className="text-red-500 text-xs font-bold">Vider</button>}
        </div>
        {cart.length===0?(
          <div className="text-center py-20">
            <ShoppingCart size={52} className="mx-auto text-muted-foreground/40 mb-4"/>
            <p className="text-foreground font-bold text-base">Votre panier est vide</p>
            <p className="text-muted-foreground text-sm mt-1">Explorez nos commerces pour commander</p>
            <button onClick={()=>setView("home")} className="mt-5 bg-primary text-white px-6 py-3 rounded-2xl font-bold text-sm">
              Découvrir les commerces
            </button>
          </div>
        ):(
          <>
            {cs&&<div className="flex items-center gap-2 bg-secondary border border-primary/20 rounded-2xl px-4 py-3">
              <Store size={16} className="text-primary"/><span className="text-sm font-bold text-primary">{cs.name}</span>
            </div>}
            <div className="bg-card rounded-2xl border border-border divide-y divide-border overflow-hidden">
              {cart.map(item=>(
                <div key={item.product.id} className="flex items-center gap-3 p-4">
                  <img src={item.product.image} alt={item.product.name} className="w-14 h-14 rounded-xl object-cover bg-muted flex-shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{item.product.name}</p>
                    <p className="text-primary font-black text-sm">{FMT(item.product.price*item.qty)}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-primary rounded-full px-3 py-1.5">
                    <button onClick={()=>removeFromCart(item.product.id)}><Minus size={13} className="text-white"/></button>
                    <span className="text-white font-black text-sm w-4 text-center">{item.qty}</span>
                    <button onClick={()=>addToCart(item.product)}><Plus size={13} className="text-white"/></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-card rounded-2xl border border-border p-4 space-y-2.5">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Sous-total</span><span className="font-bold">{FMT(cartTotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Livraison</span><span className="font-bold">{cs?FMT(cs.deliveryFee):"—"}</span></div>
              <div className="h-px bg-border"/>
              <div className="flex justify-between font-black text-lg" style={{fontFamily:DF}}><span>Total</span><span className="text-primary">{FMT(cartTotal+(cs?.deliveryFee??0))}</span></div>
            </div>
            <button onClick={()=>setView("checkout")}
              className="w-full bg-primary text-white py-4 rounded-2xl font-black shadow-xl active:scale-[0.97] transition-transform">
              Passer la commande →
            </button>
          </>
        )}
      </div>
    );
  };

  /* CHECKOUT */
  const renderCheckout=()=>{
    const cs=STORES.find(s=>s.id===cartStoreId);
    const pays:[PaymentMethod,React.ReactNode,string,string][]=[
      ["orange_money",<Smartphone size={20}/>,"Orange Money","Paiement mobile Orange"],
      ["airtel_money", <Smartphone size={20}/>,"Airtel Money","Paiement mobile Airtel"],
      ["cash",         <Banknote size={20}/>,"Espèces","Payer à la livraison"],
    ];
    const ready=!!(delivery.quartier&&delivery.adresse&&delivery.telephone);
    return(
      <div className="px-4 pt-4 pb-4 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={()=>setView("cart")} className="w-10 h-10 bg-card border border-border rounded-2xl flex items-center justify-center shadow-sm"><ChevronLeft size={18}/></button>
          <h1 className="font-black text-xl" style={{fontFamily:DF}}>Livraison</h1>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <h2 className="font-black text-sm" style={{fontFamily:DF}}>📍 Informations de livraison</h2>
          {[
            {label:"Nom complet",key:"nom",placeholder:"Jean-Baptiste Maïna"},
            {label:"Adresse *",key:"adresse",placeholder:"Rue, numéro…"},
            {label:"Repère",key:"repere",placeholder:"En face de…, à côté de…"},
            {label:"Téléphone *",key:"telephone",placeholder:"+236 72 01 23 45"},
          ].map(f=>(
            <div key={f.key}>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">{f.label}</label>
              <input value={(delivery as Record<string,string>)[f.key]||""} onChange={e=>setDelivery(p=>({...p,[f.key]:e.target.value}))}
                placeholder={f.placeholder} className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"/>
            </div>
          ))}
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1 block">Quartier *</label>
            <select value={delivery.quartier||""} onChange={e=>setDelivery(p=>({...p,quartier:e.target.value}))}
              className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 appearance-none">
              <option value="">Choisir un quartier</option>
              {QUARTIERS.map(q=><option key={q} value={q}>{q}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1 block">Note pour le commerçant</label>
            <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Allergies, préférences…"
              className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"/>
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 space-y-2">
          <h2 className="font-black text-sm mb-2" style={{fontFamily:DF}}>💳 Paiement</h2>
          {pays.map(([id,icon,label,sub])=>(
            <button key={id} onClick={()=>setPayment(id)}
              className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all ${payment===id?"border-primary bg-secondary shadow-sm":"border-border"}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${payment===id?"bg-primary text-white":"bg-muted text-muted-foreground"}`}>{icon}</div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-sm font-bold">{label}</p>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${payment===id?"border-primary bg-primary":"border-border"}`}>
                {payment===id&&<Check size={11} className="text-white"/>}
              </div>
            </button>
          ))}
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex justify-between items-center">
            <span className="font-black text-lg" style={{fontFamily:DF}}>Total à payer</span>
            <span className="font-black text-xl text-primary" style={{fontFamily:DF}}>{FMT(cartTotal+(cs?.deliveryFee??0))}</span>
          </div>
        </div>
        <button onClick={placeOrder} disabled={!ready}
          className={`w-full py-4 rounded-2xl font-black shadow-xl transition-all ${ready?"bg-primary text-white active:scale-[0.97]":"bg-muted text-muted-foreground opacity-60"}`}>
          ✓ Confirmer la commande
        </button>
      </div>
    );
  };

  /* ORDERS */
  const renderOrders=()=>(
    <div className="px-4 pt-4 space-y-4">
      <h1 className="font-black text-xl" style={{fontFamily:DF}}>Mes commandes</h1>
      {myOrders.length===0?(
        <div className="text-center py-20">
          <ClipboardList size={52} className="mx-auto text-muted-foreground/40 mb-4"/>
          <p className="font-bold text-base">Aucune commande pour le moment</p>
          <button onClick={()=>setView("home")} className="mt-4 bg-primary text-white px-6 py-2.5 rounded-2xl font-bold text-sm">Découvrir les restaurants</button>
        </div>
      ):(
        <div className="space-y-3">
          {myOrders.map(o=>(
            <div key={o.id} onClick={()=>{setActiveOrder(o);setView("order_detail");}}
              className="bg-card rounded-2xl border border-border p-4 cursor-pointer active:scale-[0.98] transition-transform space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-black text-base" style={{fontFamily:DF}}>{o.storeName}</p>
                  <p className="text-xs text-muted-foreground">{o.id} · {o.createdAt.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</p>
                </div>
                <Badge status={o.status}/>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
                <span className="text-muted-foreground">{o.items.reduce((s,i)=>s+i.qty,0)} article(s)</span>
                <span className="font-black text-sm text-primary">{FMT(o.total)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  /* ORDER DETAIL */
  const renderOrderDetail=()=>{
    if(!activeOrder)return null;
    return(
      <div className="px-4 pt-4 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={()=>setView("orders")} className="w-10 h-10 bg-card border border-border rounded-2xl flex items-center justify-center shadow-sm"><ChevronLeft size={18}/></button>
          <div>
            <h1 className="font-black text-lg leading-tight" style={{fontFamily:DF}}>{activeOrder.id}</h1>
            <p className="text-xs text-muted-foreground">{activeOrder.storeName}</p>
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5">
          <h2 className="font-black text-sm mb-4" style={{fontFamily:DF}}>Statut de la commande</h2>
          <StatusTracker status={activeOrder.status}/>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 space-y-2">
          <h2 className="font-black text-sm mb-2" style={{fontFamily:DF}}>Articles</h2>
          {activeOrder.items.map(item=>(
            <div key={item.product.id} className="flex items-center justify-between text-sm py-1">
              <span>{item.qty}× {item.product.name}</span>
              <span className="font-bold">{FMT(item.product.price*item.qty)}</span>
            </div>
          ))}
          <div className="h-px bg-border my-2"/>
          <div className="flex justify-between text-xs text-muted-foreground"><span>Sous-total</span><span>{FMT(activeOrder.subtotal)}</span></div>
          <div className="flex justify-between text-xs text-muted-foreground"><span>Livraison</span><span>{FMT(activeOrder.deliveryFee)}</span></div>
          <div className="flex justify-between font-black text-base pt-1" style={{fontFamily:DF}}><span>Total</span><span className="text-primary">{FMT(activeOrder.total)}</span></div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 space-y-1 text-xs">
          <h2 className="font-black text-sm mb-2" style={{fontFamily:DF}}>Livraison & Paiement</h2>
          <p><span className="text-muted-foreground">Adresse :</span> <strong>{activeOrder.delivery.adresse}, {activeOrder.delivery.quartier}</strong></p>
          <p><span className="text-muted-foreground">Paiement :</span> <strong>{PAY_LABELS[activeOrder.paymentMethod]}</strong></p>
          {activeOrder.driverName&&<p><span className="text-muted-foreground">Livreur :</span> <strong>{activeOrder.driverName}</strong></p>}
        </div>
      </div>
    );
  };

  /* FAVORITES */
  const renderFavorites=()=>{
    const favStores=STORES.filter(s=>favorites.includes(s.id));
    return(
      <div className="px-4 pt-4 space-y-4">
        <h1 className="font-black text-xl" style={{fontFamily:DF}}>Mes Favoris</h1>
        {favStores.length===0?(
          <div className="text-center py-20">
            <Heart size={52} className="mx-auto text-muted-foreground/40 mb-4"/>
            <p className="font-bold text-base">Aucun favori enregistré</p>
            <p className="text-xs text-muted-foreground mt-1">Ajoutez vos commerces préférés en cliquant sur le cœur</p>
          </div>
        ):(
          <div className="space-y-4 pb-4">
            {favStores.map(s=>(
              <StoreCard key={s.id} store={s} isFav={true} onFav={()=>toggleFav(s.id)} onClick={()=>{setActiveStore(s);setView("store");}}/>
            ))}
          </div>
        )}
      </div>
    );
  };

  /* PROFILE */
  const renderProfile=()=>(
    <div className="px-4 pt-4 space-y-4">
      <h1 className="font-black text-xl" style={{fontFamily:DF}}>Mon Profil</h1>
      <div className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center font-black text-2xl text-primary flex-shrink-0" style={{fontFamily:DF}}>
          {user.name.slice(0,2).toUpperCase()}
        </div>
        <div>
          <p className="font-black text-lg" style={{fontFamily:DF}}>{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
          <p className="text-xs text-muted-foreground">{user.telephone||"—"}</p>
        </div>
      </div>
      <div className="bg-card rounded-2xl border border-border divide-y divide-border overflow-hidden">
        {[
          {icon:<ClipboardList size={18}/>, label:"Mes commandes", count:myOrders.length, action:()=>setView("orders")},
          {icon:<Heart size={18}/>,         label:"Mes favoris",   count:favorites.length, action:()=>setView("favorites")},
          {icon:<Bell size={18}/>,          label:"Notifications",  count:unread,           action:()=>setShowNotif(true)},
          {icon:<Shield size={18}/>,        label:"Confidentialité & Sécurité", action:()=>{}},
        ].map(item=>(
          <button key={item.label} onClick={item.action}
            className="w-full flex items-center justify-between p-4 hover:bg-muted text-left transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-primary">{item.icon}</span>
              <span className="text-sm font-semibold">{item.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {item.count!==undefined&&item.count>0&&<span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">{item.count}</span>}
              <ChevronRight size={16} className="text-muted-foreground"/>
            </div>
          </button>
        ))}
      </div>
      <button onClick={onLogout}
        className="w-full bg-red-50 text-red-600 border border-red-200 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
        <LogOut size={16}/>Déconnexion
      </button>
    </div>
  );

  return(
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="flex-1 overflow-y-auto pb-24 scrollbar-hide">
        {view==="home"&&renderHome()}
        {view==="search"&&renderSearch()}
        {view==="store"&&renderStore()}
        {view==="cart"&&renderCart()}
        {view==="checkout"&&renderCheckout()}
        {view==="orders"&&renderOrders()}
        {view==="order_detail"&&renderOrderDetail()}
        {view==="favorites"&&renderFavorites()}
        {view==="profile"&&renderProfile()}
      </div>
      {showNotif&&<NotifPanel notifs={allNotifs} userId={user.id} onClose={()=>setShowNotif(false)} onRead={readNotif}/>}
      <ClientNav view={view} setView={setView} cartCount={cart.reduce((s,i)=>s+i.qty,0)} unread={unread}/>
    </div>
  );
}

/* ════════════════════════ MERCHANT APP ════════════════════════════════════ */
function MerchantApp({user,allOrders,setAllOrders,allProducts,setAllProducts,onLogout}:{
  user:AppUser;allOrders:Order[];setAllOrders:React.Dispatch<React.SetStateAction<Order[]>>;
  allProducts:Product[];setAllProducts:React.Dispatch<React.SetStateAction<Product[]>>;
  onLogout:()=>void;
}){
  const [view,setView]=useState<MerchantView>("dashboard");
  const [activeOrder,setActiveOrder]=useState<Order|null>(null);
  const [newProd,setNewProd]=useState({name:"",price:"",desc:"",cat:"",unit:"",stock:"10"});
  const myStore=STORES.find(s=>s.id===user.storeId)||STORES[0];
  const myOrders=allOrders.filter(o=>o.storeId===myStore.id);
  const myProds=allProducts.filter(p=>p.storeId===myStore.id);

  const revenue=myOrders.filter(o=>o.status==="livrée").reduce((s,o)=>s+o.subtotal,0);

  const updateStatus=(orderId:string,newStatus:OrderStatus)=>{
    setAllOrders(prev=>prev.map(o=>o.id===orderId?{...o,status:newStatus}:o));
    if(activeOrder&&activeOrder.id===orderId) setActiveOrder(p=>p?{...p,status:newStatus}:null);
  };

  const addProduct=()=>{
    if(!newProd.name||!newProd.price)return;
    const p:Product={id:`p-${Date.now()}`,storeId:myStore.id,name:newProd.name,price:Number(newProd.price),description:newProd.desc,image:PH("photo-1664992960082-0ea299a9c53e",400,300),available:true,category:newProd.cat||"Général",stock:Number(newProd.stock)||10,unit:newProd.unit};
    setAllProducts(prev=>[p,...prev]);
    setNewProd({name:"",price:"",desc:"",cat:"",unit:"",stock:"10"});
    setView("m_products");
  };

  const toggleProduct=(pid:string)=>{
    setAllProducts(prev=>prev.map(p=>p.id===pid?{...p,available:!p.available}:p));
  };

  const navItems:[MerchantView,React.ReactNode,string][]=[
    ["dashboard",<BarChart2 size={20}/>,"Tableau de bord"],
    ["m_orders",  <ClipboardList size={20}/>,"Commandes"],
    ["m_products",<Package size={20}/>,"Produits"],
    ["m_profile", <User size={20}/>,"Profil"],
  ];

  return(
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="bg-primary px-5 pt-12 pb-5 text-white flex items-center justify-between flex-shrink-0">
        <div>
          <span className="text-xs text-white/70 font-semibold bg-white/15 px-2.5 py-0.5 rounded-full">Espace Commerçant</span>
          <h1 className="text-xl font-black mt-1" style={{fontFamily:DF}}>{myStore.name}</h1>
        </div>
        <BDLogo size="sm" white/>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-20 space-y-4 scrollbar-hide">
        {view==="dashboard"&&(
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card p-4 rounded-2xl border border-border">
                <p className="text-xs text-muted-foreground">Revenus livrés</p>
                <p className="text-lg font-black text-primary mt-1" style={{fontFamily:DF}}>{FMT(revenue)}</p>
              </div>
              <div className="bg-card p-4 rounded-2xl border border-border">
                <p className="text-xs text-muted-foreground">Commandes</p>
                <p className="text-lg font-black text-foreground mt-1" style={{fontFamily:DF}}>{myOrders.length}</p>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-black text-sm" style={{fontFamily:DF}}>Commandes récentes</h2>
                <button onClick={()=>setView("m_orders")} className="text-primary text-xs font-bold">Voir tout →</button>
              </div>
              <div className="space-y-2">
                {myOrders.slice(0,3).map(o=>(
                  <div key={o.id} onClick={()=>{setActiveOrder(o);setView("m_order_detail");}}
                    className="flex items-center justify-between p-3 bg-muted rounded-xl cursor-pointer">
                    <div>
                      <p className="font-bold text-sm">{o.id} · {o.clientName}</p>
                      <p className="text-xs text-muted-foreground">{FMT(o.total)}</p>
                    </div>
                    <Badge status={o.status}/>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view==="m_orders"&&(
          <div className="space-y-3">
            <h2 className="font-black text-lg" style={{fontFamily:DF}}>Toutes les commandes</h2>
            {myOrders.map(o=>(
              <div key={o.id} onClick={()=>{setActiveOrder(o);setView("m_order_detail");}}
                className="bg-card rounded-2xl border border-border p-4 cursor-pointer space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-base" style={{fontFamily:DF}}>{o.id}</span>
                  <Badge status={o.status}/>
                </div>
                <p className="text-xs text-muted-foreground">Client : {o.clientName} ({o.delivery.telephone})</p>
                <p className="text-xs text-muted-foreground">{o.items.map(i=>`${i.qty}× ${i.product.name}`).join(", ")}</p>
                <div className="flex justify-between items-center pt-2 border-t border-border text-xs font-bold">
                  <span>Total :</span><span className="text-primary">{FMT(o.total)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {view==="m_order_detail"&&activeOrder&&(
          <div className="space-y-4">
            <button onClick={()=>setView("m_orders")} className="flex items-center gap-2 text-sm text-muted-foreground">
              <ChevronLeft size={16}/>Retour
            </button>
            <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="font-black text-lg" style={{fontFamily:DF}}>{activeOrder.id}</h2>
                <Badge status={activeOrder.status}/>
              </div>
              <div className="text-xs space-y-1">
                <p>Client : <strong>{activeOrder.clientName}</strong></p>
                <p>Téléphone : <strong>{activeOrder.delivery.telephone}</strong></p>
                <p>Adresse : <strong>{activeOrder.delivery.adresse}, {activeOrder.delivery.quartier}</strong></p>
              </div>
              <div className="border-t border-b border-border py-3 space-y-2">
                {activeOrder.items.map(i=>(
                  <div key={i.product.id} className="flex justify-between text-sm">
                    <span>{i.qty}× {i.product.name}</span>
                    <span className="font-bold">{FMT(i.product.price*i.qty)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-black text-base" style={{fontFamily:DF}}>
                <span>Total :</span><span className="text-primary">{FMT(activeOrder.total)}</span>
              </div>
              {/* Actions status */}
              <div className="space-y-2 pt-2">
                <p className="text-xs font-bold text-muted-foreground uppercase">Changer le statut :</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["acceptée","préparation","prête","annulée"] as OrderStatus[]).map(st=>(
                    <button key={st} onClick={()=>updateStatus(activeOrder.id,st)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${activeOrder.status===st?"bg-primary text-white border-primary":"bg-muted border-border"}`}>
                      {STATUS_CFG[st].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {view==="m_products"&&(
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-black text-lg" style={{fontFamily:DF}}>Produits ({myProds.length})</h2>
              <button onClick={()=>setView("add_product")} className="bg-primary text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1">
                <Plus size={14}/>Ajouter
              </button>
            </div>
            <div className="bg-card rounded-2xl border border-border divide-y divide-border overflow-hidden">
              {myProds.map(p=>(
                <div key={p.id} className="flex items-center gap-3 p-3">
                  <img src={p.image} alt={p.name} className="w-12 h-12 rounded-xl object-cover bg-muted flex-shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{p.name}</p>
                    <p className="text-xs text-primary font-black">{FMT(p.price)}</p>
                  </div>
                  <button onClick={()=>toggleProduct(p.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold ${p.available?"bg-emerald-100 text-emerald-700":"bg-red-100 text-red-700"}`}>
                    {p.available?"Disponible":"Masqué"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {view==="add_product"&&(
          <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
            <button onClick={()=>setView("m_products")} className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <ChevronLeft size={16}/>Annuler
            </button>
            <h2 className="font-black text-lg" style={{fontFamily:DF}}>Nouveau produit</h2>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">Nom du produit *</label>
              <input value={newProd.name} onChange={e=>setNewProd(p=>({...p,name:e.target.value}))} placeholder="ex: Brochettes Poulet" className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none"/>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">Prix (FCFA) *</label>
              <input type="number" value={newProd.price} onChange={e=>setNewProd(p=>({...p,price:e.target.value}))} placeholder="1500" className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none"/>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">Catégorie</label>
              <input value={newProd.cat} onChange={e=>setNewProd(p=>({...p,cat:e.target.value}))} placeholder="ex: Plats principaux" className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none"/>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">Description</label>
              <textarea value={newProd.desc} onChange={e=>setNewProd(p=>({...p,desc:e.target.value}))} placeholder="Ingrédients, portion…" className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none h-20"/>
            </div>
            <button onClick={addProduct} className="w-full bg-primary text-white py-3.5 rounded-2xl font-black shadow-lg">
              Ajouter le produit
            </button>
          </div>
        )}

        {view==="m_profile"&&(
          <div className="space-y-4">
            <h2 className="font-black text-lg" style={{fontFamily:DF}}>Profil Commerçant</h2>
            <div className="bg-card rounded-2xl border border-border p-5 space-y-2">
              <p className="font-black text-base" style={{fontFamily:DF}}>{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
              <p className="text-xs text-muted-foreground">{myStore.address}</p>
            </div>
            <button onClick={onLogout} className="w-full bg-red-50 text-red-600 border border-red-200 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2">
              <LogOut size={16}/>Déconnexion
            </button>
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm bg-card border-t border-border z-40 flex">
        {navItems.map(([v,icon,label])=>(
          <button key={v} onClick={()=>setView(v)}
            className={`flex-1 flex flex-col items-center py-3 gap-1 text-[10px] font-bold ${view===v?"text-primary":"text-muted-foreground"}`}>
            {icon}<span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

/* ════════════════════════ DRIVER APP ═══════════════════════════════════════ */
function DriverApp({user,allOrders,setAllOrders,onLogout}:{
  user:AppUser;allOrders:Order[];setAllOrders:React.Dispatch<React.SetStateAction<Order[]>>;
  onLogout:()=>void;
}){
  const [view,setView]=useState<DriverView>("d_available");
  const [activeCourse,setActiveCourse]=useState<Order|null>(null);

  const readyOrders=allOrders.filter(o=>o.status==="prête"&&!o.driverId);
  const myCourses=allOrders.filter(o=>o.driverId===user.id);
  const totalEarnings=myCourses.filter(o=>o.status==="livrée").reduce((s,o)=>s+o.deliveryFee,0);

  const acceptCourse=(order:Order)=>{
    setAllOrders(prev=>prev.map(o=>o.id===order.id?{...o,driverId:user.id,driverName:user.name,status:"livraison"}:o));
    setActiveCourse({...order,driverId:user.id,driverName:user.name,status:"livraison"});
    setView("d_course");
  };

  const completeCourse=(orderId:string)=>{
    setAllOrders(prev=>prev.map(o=>o.id===orderId?{...o,status:"livrée"}:o));
    setActiveCourse(null);
    setView("d_available");
  };

  return(
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="bg-primary px-5 pt-12 pb-5 text-white flex items-center justify-between flex-shrink-0">
        <div>
          <span className="text-xs text-white/70 font-semibold bg-white/15 px-2.5 py-0.5 rounded-full">Espace Livreur</span>
          <h1 className="text-xl font-black mt-1" style={{fontFamily:DF}}>{user.name}</h1>
        </div>
        <BDLogo size="sm" white/>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-20 space-y-4 scrollbar-hide">
        {view==="d_available"&&(
          <div className="space-y-4">
            <div className="bg-card p-4 rounded-2xl border border-border flex justify-between items-center">
              <div>
                <p className="text-xs text-muted-foreground">Gains accumulés</p>
                <p className="text-xl font-black text-primary" style={{fontFamily:DF}}>{FMT(totalEarnings)}</p>
              </div>
              <Bike size={32} className="text-primary"/>
            </div>

            <h2 className="font-black text-lg" style={{fontFamily:DF}}>Courses disponibles ({readyOrders.length})</h2>
            {readyOrders.length===0?(
              <div className="text-center py-16 text-muted-foreground text-sm">
                Aucune course disponible actuellement. En attente de nouvelles commandes…
              </div>
            ):(
              readyOrders.map(o=>(
                <div key={o.id} className="bg-card rounded-2xl border border-border p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-base" style={{fontFamily:DF}}>{o.storeName}</span>
                    <span className="text-xs font-black bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">+{FMT(o.deliveryFee)}</span>
                  </div>
                  <div className="text-xs space-y-1 text-muted-foreground">
                    <p>📍 Retrait : {o.storeName}</p>
                    <p>🏠 Livraison : {o.delivery.adresse}, {o.delivery.quartier}</p>
                  </div>
                  <button onClick={()=>acceptCourse(o)}
                    className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm shadow-md active:scale-[0.98]">
                    Accepter la course
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {view==="d_course"&&activeCourse&&(
          <div className="space-y-4">
            <h2 className="font-black text-lg" style={{fontFamily:DF}}>Course en cours</h2>
            <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-black text-lg" style={{fontFamily:DF}}>{activeCourse.id}</span>
                <span className="text-xs font-bold text-primary bg-secondary px-3 py-1 rounded-full">En route</span>
              </div>
              <div className="space-y-2 text-sm border-t border-b border-border py-3">
                <p>🏪 <strong>Commerçant :</strong> {activeCourse.storeName}</p>
                <p>👤 <strong>Client :</strong> {activeCourse.clientName}</p>
                <p>📞 <strong>Téléphone :</strong> <a href={`tel:${activeCourse.delivery.telephone}`} className="text-primary underline">{activeCourse.delivery.telephone}</a></p>
                <p>📍 <strong>Adresse :</strong> {activeCourse.delivery.adresse}, {activeCourse.delivery.quartier}</p>
                {activeCourse.delivery.repere&&<p>💡 <strong>Repère :</strong> {activeCourse.delivery.repere}</p>}
              </div>
              <button onClick={()=>completeCourse(activeCourse.id)}
                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-base shadow-lg">
                ✓ Marquer comme livrée
              </button>
            </div>
          </div>
        )}

        {view==="d_history"&&(
          <div className="space-y-3">
            <h2 className="font-black text-lg" style={{fontFamily:DF}}>Historique des courses</h2>
            {myCourses.map(o=>(
              <div key={o.id} className="bg-card rounded-2xl border border-border p-4 flex justify-between items-center">
                <div>
                  <p className="font-bold text-sm">{o.id} · {o.storeName}</p>
                  <p className="text-xs text-muted-foreground">{o.delivery.quartier}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-emerald-600 text-sm">+{FMT(o.deliveryFee)}</p>
                  <Badge status={o.status}/>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm bg-card border-t border-border z-40 flex">
        {[
          ["d_available",<Bike size={20}/>,"Disponibles"],
          ["d_history",  <ClipboardList size={20}/>,"Historique"],
        ].map(([v,icon,label])=>(
          <button key={v} onClick={()=>setView(v as DriverView)}
            className={`flex-1 flex flex-col items-center py-3 gap-1 text-[10px] font-bold ${view===v?"text-primary":"text-muted-foreground"}`}>
            {icon}<span>{label}</span>
          </button>
        ))}
        <button onClick={onLogout} className="flex-1 flex flex-col items-center py-3 gap-1 text-[10px] font-bold text-red-500">
          <LogOut size={20}/><span>Déconnexion</span>
        </button>
      </nav>
    </div>
  );
}

/* ════════════════════════ ADMIN APP ═══════════════════════════════════════ */
function AdminApp({user,allOrders,onLogout}:{user:AppUser;allOrders:Order[];onLogout:()=>void}){
  const [view,setView]=useState<AdminView>("a_stats");
  const totalRev=allOrders.filter(o=>o.status==="livrée").reduce((s,o)=>s+o.total,0);

  const chartData=[
    {name:"Lun",ventes:12000}, {name:"Mar",ventes:19000}, {name:"Mer",ventes:15000},
    {name:"Jeu",ventes:22000}, {name:"Ven",ventes:31000}, {name:"Sam",ventes:42000}, {name:"Dim",ventes:38000},
  ];

  return(
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="bg-primary px-5 pt-12 pb-5 text-white flex items-center justify-between flex-shrink-0">
        <div>
          <span className="text-xs text-white/70 font-semibold bg-white/15 px-2.5 py-0.5 rounded-full">Administration</span>
          <h1 className="text-xl font-black mt-1" style={{fontFamily:DF}}>Bangui Direct Admin</h1>
        </div>
        <BDLogo size="sm" white/>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-20 space-y-4 scrollbar-hide">
        {view==="a_stats"&&(
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card p-4 rounded-2xl border border-border">
                <p className="text-xs text-muted-foreground">Volume total</p>
                <p className="text-lg font-black text-primary mt-1" style={{fontFamily:DF}}>{FMT(totalRev)}</p>
              </div>
              <div className="bg-card p-4 rounded-2xl border border-border">
                <p className="text-xs text-muted-foreground">Total commandes</p>
                <p className="text-lg font-black mt-1" style={{fontFamily:DF}}>{allOrders.length}</p>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border p-4">
              <h2 className="font-black text-sm mb-3" style={{fontFamily:DF}}>Activité hebdomadaire</h2>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={10}/>
                    <YAxis stroke="#888888" fontSize={10}/>
                    <Tooltip/>
                    <Bar dataKey="ventes" fill="#1A6B45" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {view==="a_orders"&&(
          <div className="space-y-3">
            <h2 className="font-black text-lg" style={{fontFamily:DF}}>Toutes les commandes ({allOrders.length})</h2>
            {allOrders.map(o=>(
              <div key={o.id} className="bg-card rounded-2xl border border-border p-4 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-black text-sm" style={{fontFamily:DF}}>{o.id} · {o.storeName}</span>
                  <Badge status={o.status}/>
                </div>
                <p className="text-xs text-muted-foreground">Client : {o.clientName}</p>
                <p className="text-xs font-bold text-primary">{FMT(o.total)}</p>
              </div>
            ))}
          </div>
        )}

        {view==="a_shops"&&(
          <div className="space-y-3">
            <h2 className="font-black text-lg" style={{fontFamily:DF}}>Commerces partenaires ({STORES.length})</h2>
            {STORES.map(s=>(
              <div key={s.id} className="bg-card rounded-2xl border border-border p-4 flex justify-between items-center">
                <div>
                  <p className="font-bold text-sm">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.category} · {s.quartier}</p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${s.isOpen?"bg-emerald-100 text-emerald-700":"bg-red-100 text-red-700"}`}>
                  {s.isOpen?"Ouvert":"Fermé"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm bg-card border-t border-border z-40 flex">
        {[
          ["a_stats", <BarChart2 size={20}/>,"Stats"],
          ["a_orders",<ClipboardList size={20}/>,"Commandes"],
          ["a_shops", <Store size={20}/>,"Commerces"],
        ].map(([v,icon,label])=>(
          <button key={v} onClick={()=>setView(v as AdminView)}
            className={`flex-1 flex flex-col items-center py-3 gap-1 text-[10px] font-bold ${view===v?"text-primary":"text-muted-foreground"}`}>
            {icon}<span>{label}</span>
          </button>
        ))}
        <button onClick={onLogout} className="flex-1 flex flex-col items-center py-3 gap-1 text-[10px] font-bold text-red-500">
          <LogOut size={20}/><span>Déconnexion</span>
        </button>
      </nav>
    </div>
  );
}

/* ════════════════════════════ MAIN APP ═════════════════════════════════════ */
export default function App() {
  const [phase,setPhase]=useState<Phase>("splash");
  const [user,setUser]=useState<AppUser|null>(null);
  const [selectedAccType,setSelectedAccType]=useState<AccountType>("personal");
  const [regError,setRegError]=useState("");
  const [pendingUser,setPendingUser]=useState<{name:string;phone:string;email:string;pwd:string}|null>(null);

  const [allOrders,setAllOrders]=useState<Order[]>(SEED_ORDERS);
  const [allNotifs,setAllNotifs]=useState<Notif[]>(SEED_NOTIFS);
  const [allProducts,setAllProducts]=useState<Product[]>(INIT_PRODUCTS);

  const handleRegisterSubmit=async(data:{name:string;phone:string;email:string;pwd:string})=>{
    setRegError("");
    try{
      const role:UserRole=selectedAccType==="merchant_pro"?"merchant":selectedAccType==="driver_pro"?"driver":"client";
      const {token,user:newUser}=await AuthAPI.register(data.name,data.email,data.pwd,role,data.phone,selectedAccType);
      setAuthToken(token);
      setUser({id:newUser.id,name:newUser.name,email:newUser.email,role:newUser.role,storeId:newUser.storeId,telephone:newUser.telephone,accountType:newUser.accountType});
      setPendingUser(data);
      setPhase("otp");
    }catch(e:any){
      setRegError(e?.message||"Une erreur est survenue lors de l'inscription.");
    }
  };

  const handleLogout=()=>{
    setUser(null);
    setAuthToken(null);
    setPhase("auth_choice");
  };

  return (
    <div className="w-full h-screen bg-neutral-900 flex items-center justify-center font-sans antialiased select-none">
      <div className="w-full max-w-sm h-full max-h-[844px] bg-background text-foreground shadow-2xl relative overflow-hidden sm:rounded-[2.5rem] sm:border-8 sm:border-neutral-800">
        {phase==="splash"&&<SplashScreen onDone={()=>setPhase("onboarding")}/>}
        {phase==="onboarding"&&<OnboardingScreen onDone={()=>setPhase("auth_choice")}/>}
        {phase==="auth_choice"&&<AuthChoiceScreen onLogin={()=>setPhase("login")} onRegister={()=>setPhase("account_type")}/>}
        {phase==="login"&&<LoginScreen onLogin={(u)=>{setUser(u);setPhase("app");}} onBack={()=>setPhase("auth_choice")} onRegister={()=>setPhase("account_type")}/>}
        {phase==="account_type"&&<AccountTypeScreen onSelect={(t)=>{setSelectedAccType(t);setRegError("");setPhase("register");}} onBack={()=>setPhase("auth_choice")}/>}
        {phase==="register"&&<RegisterScreen accountType={selectedAccType} onSubmit={handleRegisterSubmit} onBack={()=>setPhase("account_type")} initialError={regError}/>}
        {phase==="otp"&&<OTPScreen phone={pendingUser?.phone||"+236 72 00 00 00"} onVerify={()=>setPhase("app")} onBack={()=>setPhase("register")}/>}

        {phase==="app"&&user&&(
          <>
            {user.role==="client"&&<ClientApp user={user} allOrders={allOrders} setAllOrders={setAllOrders} allNotifs={allNotifs} setAllNotifs={setAllNotifs} allProducts={allProducts} onLogout={handleLogout}/>}
            {user.role==="merchant"&&<MerchantApp user={user} allOrders={allOrders} setAllOrders={setAllOrders} allProducts={allProducts} setAllProducts={setAllProducts} onLogout={handleLogout}/>}
            {user.role==="driver"&&<DriverApp user={user} allOrders={allOrders} setAllOrders={setAllOrders} onLogout={handleLogout}/>}
            {user.role==="admin"&&<AdminApp user={user} allOrders={allOrders} onLogout={handleLogout}/>}
          </>
        )}
      </div>
    </div>
  );
}import { useState, useEffect, useRef } from "react";
import {
  Search, Home, ShoppingCart, ClipboardList, Heart, User,
  ChevronLeft, Plus, Minus, X, MapPin, Phone, CheckCircle,
  Package, Bike, ChevronRight, Bell, LogOut, Smartphone,
  Banknote, Trash2, Store, AlertCircle, ChefHat, Star,
  Clock, Zap, ShoppingBag, TrendingUp, Users, Check,
  Navigation, Camera, Truck, PlusCircle, ArrowRight,
  Shield, Pencil, BarChart2, DollarSign, Activity,
  ToggleLeft, ToggleRight, Eye, EyeOff, Lock, Mail,
  Building2, UserCheck, ChevronDown,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { AuthAPI, setAuthToken } from "../lib/api";

/* ════════════════════════════════ TYPES ════════════════════════════════════ */
type Phase = "splash"|"onboarding"|"auth_choice"|"login"|"account_type"|"register"|"otp"|"app";
type UserRole = "client"|"merchant"|"driver"|"admin";
type AccountType = "personal"|"merchant_pro"|"driver_pro";
type StoreType = "restaurant"|"pharmacie"|"marche"|"boutique"|"express";
type OrderStatus = "nouvelle"|"acceptée"|"préparation"|"prête"|"livraison"|"livrée"|"annulée";
type PaymentMethod = "orange_money"|"airtel_money"|"cash";
type ClientView = "home"|"search"|"store"|"cart"|"checkout"|"orders"|"order_detail"|"favorites"|"profile"|"settings";
type MerchantView = "dashboard"|"m_orders"|"m_order_detail"|"m_products"|"add_product"|"m_profile";
type DriverView = "d_available"|"d_course"|"d_history"|"d_earnings";
type AdminView = "a_stats"|"a_orders"|"a_shops"|"a_clients"|"a_drivers";

interface AppUser { id:string;name:string;email:string;role:UserRole;storeId?:string;telephone?:string;avatar?:string;accountType?:AccountType; }
interface Store { id:string;name:string;type:StoreType;category:string;tags:string[];rating:number;ratingCount:number;deliveryTime:string;deliveryFee:number;coverImage:string;description:string;quartier:string;isOpen:boolean;openHours:string;merchantId:string;address:string; }
interface Product { id:string;storeId:string;name:string;price:number;description:string;image:string;available:boolean;category:string;stock:number;unit?:string; }
interface CartItem { product:Product;qty:number; }
interface DeliveryInfo { nom:string;quartier:string;adresse:string;repere:string;telephone:string; }
interface Order { id:string;storeId:string;storeName:string;storeType:StoreType;clientId:string;clientName:string;driverId?:string;driverName?:string;items:CartItem[];status:OrderStatus;subtotal:number;deliveryFee:number;total:number;paymentMethod:PaymentMethod;delivery:DeliveryInfo;createdAt:Date;note?:string; }
interface Notif { id:string;userId:string;title:string;body:string;read:boolean;createdAt:Date;orderId?:string; }

/* ════════════════════════════ CONSTANTS ════════════════════════════════════ */
const QUARTIERS = ["Lakouanga","Boy-Rabé","Fatima","Gobongo","Miskine","Sango","Galabadja","Castor","Kilomètre 5","Fouh","Pétévo","Bimbo","Autre"];
const STATUS_STEPS:OrderStatus[] = ["nouvelle","acceptée","préparation","prête","livraison","livrée"];
const STATUS_CFG:Record<OrderStatus,{label:string;color:string;bg:string}> = {
  nouvelle:    {label:"Reçue",          color:"text-blue-600",    bg:"bg-blue-50"},
  acceptée:    {label:"Acceptée",       color:"text-violet-600",  bg:"bg-violet-50"},
  préparation: {label:"En préparation", color:"text-amber-600",   bg:"bg-amber-50"},
  prête:       {label:"Prête",          color:"text-emerald-600", bg:"bg-emerald-50"},
  livraison:   {label:"En route",       color:"text-primary",     bg:"bg-secondary"},
  livrée:      {label:"Livrée ✓",       color:"text-green-700",   bg:"bg-green-100"},
  annulée:     {label:"Annulée",        color:"text-red-600",     bg:"bg-red-50"},
};
const PAY_LABELS:Record<PaymentMethod,string> = {orange_money:"Orange Money",airtel_money:"Airtel Money",cash:"Espèces à la livraison"};
const FMT = (n:number) => n.toLocaleString("fr-FR")+" FCFA";
const PH = (id:string,w=800,h=500) => `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&auto=format`;
const DF = "'Bricolage Grotesque',sans-serif";

/* ══════════════════════════ MOCK DATA ══════════════════════════════════════ */
const USERS:AppUser[] = [
  {id:"u1",name:"Jean-Baptiste Maïna",   email:"client@test.com",   role:"client",   telephone:"+236 72 01 23 45",accountType:"personal"},
  {id:"u2",name:"Cécile Ngakoutou",      email:"merchant@test.com",  role:"merchant", storeId:"s1",telephone:"+236 75 98 76 54",accountType:"merchant_pro"},
  {id:"u3",name:"Rodrigue Mbaitoloum",   email:"driver@test.com",    role:"driver",   telephone:"+236 70 34 56 78",accountType:"driver_pro"},
  {id:"u4",name:"Parfait Sanga-Ndombi",  email:"admin@test.com",     role:"admin",    telephone:"+236 77 00 11 22"},
  {id:"u5",name:"Aristide Koyakouno",    email:"merchant2@test.com", role:"merchant", storeId:"s2",telephone:"+236 72 45 67 89",accountType:"merchant_pro"},
];
const STORES:Store[] = [
  {id:"s1",name:"Maman Cécile",type:"restaurant",category:"Cuisine Centrafricaine",tags:["Traditionnel","Fait maison","Populaire"],rating:4.9,ratingCount:342,deliveryTime:"25–40 min",deliveryFee:500,coverImage:PH("photo-1664992960082-0ea299a9c53e"),description:"Les meilleures spécialités de Bangui préparées avec amour depuis 2010.",quartier:"Lakouanga",isOpen:true,openHours:"07h–21h",merchantId:"u2",address:"Quartier Lakouanga, Rue 12.050"},
  {id:"s2",name:"Chez Aristide",type:"restaurant",category:"Grillades & Brochettes",tags:["Brochettes","Poisson","Bœuf"],rating:4.7,ratingCount:218,deliveryTime:"20–30 min",deliveryFee:400,coverImage:PH("photo-1599487488170-d11ec9c172f0"),description:"Brochettes grillées au charbon de bois, poissons du fleuve Oubangui.",quartier:"Boy-Rabé",isOpen:true,openHours:"11h–23h",merchantId:"u5",address:"Boy-Rabé, Avenue de l'Indépendance"},
  {id:"s3",name:"Pizza Bangui",type:"restaurant",category:"Pizzas & Fast Food",tags:["Pizza","Burgers","Rapide"],rating:4.5,ratingCount:156,deliveryTime:"30–45 min",deliveryFee:600,coverImage:PH("photo-1589148753554-b4bd9db83fa2"),description:"Pizzas artisanales et burgers généreux livrés chauds chez vous.",quartier:"Fatima",isOpen:true,openHours:"10h–22h30",merchantId:"u6",address:"Fatima, Rue des Artisans"},
  {id:"s4",name:"Pharmacie Santé+",type:"pharmacie",category:"Pharmacie",tags:["Médicaments","Urgences","7j/7"],rating:4.8,ratingCount:89,deliveryTime:"20–35 min",deliveryFee:400,coverImage:PH("photo-1631549916768-4119b2e5f926"),description:"Médicaments et parapharmacie livrés rapidement en toute discrétion.",quartier:"Miskine",isOpen:true,openHours:"06h–22h",merchantId:"u7",address:"Miskine, Centre Commercial"},
  {id:"s5",name:"Marché KM5",type:"marche",category:"Marché",tags:["Légumes","Fruits","Épices","Frais"],rating:4.6,ratingCount:203,deliveryTime:"25–40 min",deliveryFee:300,coverImage:PH("photo-1734255026082-82fdc81991f0"),description:"Légumes frais, fruits locaux et épices du marché KM5 livrés chez vous.",quartier:"Kilomètre 5",isOpen:true,openHours:"06h–19h",merchantId:"u8",address:"Kilomètre 5, Marché Central"},
  {id:"s6",name:"Wax & Style",type:"boutique",category:"Mode & Accessoires",tags:["Wax","Vêtements","Accessoires"],rating:4.4,ratingCount:67,deliveryTime:"30–50 min",deliveryFee:500,coverImage:PH("photo-1552710307-537199cd41c0"),description:"Tissus wax de qualité, vêtements et accessoires africains tendance.",quartier:"Galabadja",isOpen:true,openHours:"09h–20h",merchantId:"u9",address:"Galabadja, Marché des Artisans"},
  {id:"s7",name:"Fraîcheur Tropicale",type:"express",category:"Jus & Snacks",tags:["Jus naturels","Beignets","Express"],rating:4.6,ratingCount:134,deliveryTime:"10–20 min",deliveryFee:250,coverImage:PH("photo-1603569283847-aa295f0d016a"),description:"Jus pressés et beignets chauds. Livraison express garantie en 15 min !",quartier:"Gobongo",isOpen:false,openHours:"07h–18h",merchantId:"u10",address:"Gobongo, Rue du Marché"},
];
const INIT_PRODUCTS:Product[] = [
  {id:"p1",storeId:"s1",name:"Gozo et Sauce Feuilles",price:1500,description:"Pâte de manioc avec sauce aux feuilles et poisson fumé",image:PH("photo-1664992960082-0ea299a9c53e",400,300),available:true,category:"Plats principaux",stock:20},
  {id:"p2",storeId:"s1",name:"Kanda en Sauce Arachide",price:2000,description:"Boulettes de viande hachée en sauce arachide avec riz blanc",image:PH("photo-1664992960082-0ea299a9c53e",400,300),available:true,category:"Plats principaux",stock:15},
  {id:"p3",storeId:"s1",name:"Poulet DG",price:3500,description:"Poulet sauté aux légumes et plantains frits, spécialité de la maison",image:PH("photo-1687422808277-2334638f09fb",400,300),available:true,category:"Plats principaux",stock:8},
  {id:"p4",storeId:"s1",name:"Sanga Sanga",price:1200,description:"Feuilles de patate douce à l'huile de palme et crevettes séchées",image:PH("photo-1664992960082-0ea299a9c53e",400,300),available:true,category:"Plats principaux",stock:12},
  {id:"p5",storeId:"s1",name:"Fufu Banane",price:800,description:"Banane pilée — accompagnement idéal pour toutes les sauces",image:PH("photo-1603569283847-aa295f0d016a",400,300),available:true,category:"Accompagnements",stock:25},
  {id:"p6",storeId:"s1",name:"Jus de Bissap",price:500,description:"Jus d'hibiscus frais légèrement sucré, servi bien frais",image:PH("photo-1614707585284-9cb9fc018387",400,300),available:true,category:"Boissons",stock:30},
  {id:"p7",storeId:"s1",name:"Eau Minérale 50cl",price:300,description:"Bouteille d'eau fraîche",image:PH("photo-1603569283847-aa295f0d016a",400,300),available:true,category:"Boissons",stock:50},
  {id:"p8",storeId:"s2",name:"Brochettes Bœuf (6 pcs)",price:1800,description:"Brochettes marinées grillées au charbon, sauce piment maison",image:PH("photo-1599487488170-d11ec9c172f0",400,300),available:true,category:"Brochettes",stock:20},
  {id:"p9",storeId:"s2",name:"Brochettes Porc (6 pcs)",price:1500,description:"Brochettes de porc tendres et savoureuses",image:PH("photo-1605908580297-f3e1c02e64ff",400,300),available:true,category:"Brochettes",stock:15},
  {id:"p10",storeId:"s2",name:"Poisson Braisé Entier",price:3000,description:"Poisson du fleuve braisé avec alloco et sauce tomate maison",image:PH("photo-1599487488170-d11ec9c172f0",400,300),available:true,category:"Poissons",stock:6},
  {id:"p11",storeId:"s2",name:"Poulet Grillé ½",price:2500,description:"Demi-poulet mariné aux épices locales grillé au charbon",image:PH("photo-1687422808277-2334638f09fb",400,300),available:true,category:"Viandes",stock:10},
  {id:"p12",storeId:"s2",name:"Alloco (Plantain Frit)",price:600,description:"Banane plantain mûre frite dorée",image:PH("photo-1603569283847-aa295f0d016a",400,300),available:true,category:"Accompagnements",stock:30},
  {id:"p13",storeId:"s3",name:"Pizza Margherita",price:4500,description:"Sauce tomate maison, mozzarella, basilic frais",image:PH("photo-1589148753554-b4bd9db83fa2",400,300),available:true,category:"Pizzas",stock:15},
  {id:"p14",storeId:"s3",name:"Pizza Tropicale",price:5000,description:"Jambon, ananas, fromage, sauce barbecue",image:PH("photo-1589148753554-b4bd9db83fa2",400,300),available:true,category:"Pizzas",stock:12},
  {id:"p15",storeId:"s3",name:"Burger Bangui",price:3500,description:"Steak haché, cheddar, tomate, salade, sauce maison",image:PH("photo-1664992960082-0ea299a9c53e",400,300),available:true,category:"Burgers",stock:20},
  {id:"p16",storeId:"s3",name:"Frites Maison",price:1000,description:"Frites dorées croustillantes, sauce mayo ou ketchup",image:PH("photo-1603569283847-aa295f0d016a",400,300),available:true,category:"Accompagnements",stock:25},
  {id:"p17",storeId:"s4",name:"Paracétamol 500mg (×10)",price:500,description:"Antidouleur et antipyrétique — boîte de 10 comprimés",image:PH("photo-1631549916768-4119b2e5f926",400,300),available:true,category:"Antidouleurs",stock:50,unit:"boîte"},
  {id:"p18",storeId:"s4",name:"Amoxicilline 500mg (×12)",price:1800,description:"Antibiotique à large spectre — boîte de 12 gélules",image:PH("photo-1631549916768-4119b2e5f926",400,300),available:true,category:"Antibiotiques",stock:30,unit:"boîte"},
  {id:"p19",storeId:"s4",name:"Ibuprofène 400mg (×10)",price:700,description:"Anti-inflammatoire — boîte de 10 comprimés",image:PH("photo-1631549916768-4119b2e5f926",400,300),available:true,category:"Antidouleurs",stock:40,unit:"boîte"},
  {id:"p20",storeId:"s4",name:"Masques Chirurgicaux (×10)",price:1000,description:"Masques de protection certifiés",image:PH("photo-1631549916768-4119b2e5f926",400,300),available:true,category:"Protection",stock:60,unit:"paquet"},
  {id:"p21",storeId:"s5",name:"Tomates fraîches (1 kg)",price:400,description:"Tomates locales mûres et juteuses",image:PH("photo-1734255026082-82fdc81991f0",400,300),available:true,category:"Légumes",stock:100,unit:"kg"},
  {id:"p22",storeId:"s5",name:"Oignons (1 kg)",price:350,description:"Oignons violets de qualité supérieure",image:PH("photo-1687422809617-a7d97879b3b0",400,300),available:true,category:"Légumes",stock:80,unit:"kg"},
  {id:"p23",storeId:"s5",name:"Bananes Plantain (régime)",price:800,description:"Régime de 8 bananes plantain mûres",image:PH("photo-1603569283847-aa295f0d016a",400,300),available:true,category:"Fruits",stock:20,unit:"régime"},
  {id:"p24",storeId:"s5",name:"Gombo frais (500 g)",price:300,description:"Gombo tendre idéal pour les sauces",image:PH("photo-1734255026082-82fdc81991f0",400,300),available:true,category:"Légumes",stock:50,unit:"500g"},
  {id:"p25",storeId:"s5",name:"Piment rouge (250 g)",price:200,description:"Piment frais de Bangui très parfumé",image:PH("photo-1734255026082-82fdc81991f0",400,300),available:true,category:"Épices",stock:60,unit:"250g"},
  {id:"p26",storeId:"s6",name:"Tissu Wax Floral (6 yards)",price:8500,description:"Tissu wax imprimé floral 100% coton premium",image:PH("photo-1552710307-537199cd41c0",400,300),available:true,category:"Tissus",stock:15,unit:"6 yards"},
  {id:"p27",storeId:"s6",name:"Tissu Wax Géométrique",price:7500,description:"Motifs géométriques modernes, couleurs vives",image:PH("photo-1578509566163-068acd11b8e7",400,300),available:true,category:"Tissus",stock:12,unit:"6 yards"},
  {id:"p28",storeId:"s6",name:"Sac Raphia Artisanal",price:3500,description:"Sac à main tressé à la main, résistant et élégant",image:PH("photo-1552710307-537199cd41c0",400,300),available:true,category:"Accessoires",stock:8},
  {id:"p29",storeId:"s7",name:"Jus Gingembre-Citron",price:700,description:"Tonifiant et revigorant, pressé à la commande",image:PH("photo-1621506289937-a8e4df240d0b",400,300),available:true,category:"Jus",stock:20},
  {id:"p30",storeId:"s7",name:"Jus de Mangue (50cl)",price:600,description:"Mangue fraîche mixée, sans sucre ajouté",image:PH("photo-1614707585284-9cb9fc018387",400,300),available:true,category:"Jus",stock:25},
  {id:"p31",storeId:"s7",name:"Beignets Haricots (10 pcs)",price:500,description:"Croustillants et chauds, sauce piment douce",image:PH("photo-1664992960082-0ea299a9c53e",400,300),available:true,category:"Snacks",stock:15},
  {id:"p32",storeId:"s7",name:"Beignets Banane (5 pcs)",price:400,description:"Beignets de banane dorés, sucrés et moelleux",image:PH("photo-1603569283847-aa295f0d016a",400,300),available:true,category:"Snacks",stock:18},
];
const now = new Date();
const ago = (m:number) => new Date(now.getTime()-m*60000);
const SEED_ORDERS:Order[] = [
  {id:"CMD-001",storeId:"s1",storeName:"Maman Cécile",storeType:"restaurant",clientId:"u1",clientName:"Jean-Baptiste Maïna",driverId:"u3",driverName:"Rodrigue Mbaitoloum",items:[{product:INIT_PRODUCTS[0],qty:2},{product:INIT_PRODUCTS[5],qty:1}],status:"livrée",subtotal:3500,deliveryFee:500,total:4000,paymentMethod:"orange_money",delivery:{nom:"Jean-Baptiste Maïna",quartier:"Boy-Rabé",adresse:"Rue 14.120",repere:"En face de l'église",telephone:"+236 72 01 23 45"},createdAt:ago(2*24*60)},
  {id:"CMD-002",storeId:"s2",storeName:"Chez Aristide",storeType:"restaurant",clientId:"u1",clientName:"Jean-Baptiste Maïna",items:[{product:INIT_PRODUCTS[7],qty:2},{product:INIT_PRODUCTS[11],qty:1}],status:"préparation",subtotal:4200,deliveryFee:400,total:4600,paymentMethod:"cash",delivery:{nom:"Jean-Baptiste Maïna",quartier:"Boy-Rabé",adresse:"Rue 14.120",repere:"En face de l'église",telephone:"+236 72 01 23 45"},createdAt:ago(30)},
  {id:"CMD-003",storeId:"s1",storeName:"Maman Cécile",storeType:"restaurant",clientId:"u5",clientName:"Aristide Koyakouno",items:[{product:INIT_PRODUCTS[2],qty:1},{product:INIT_PRODUCTS[4],qty:2}],status:"nouvelle",subtotal:5100,deliveryFee:500,total:5600,paymentMethod:"orange_money",delivery:{nom:"Aristide Koyakouno",quartier:"Fatima",adresse:"Rue Docteur Lenoir",repere:"Maison bleue, carrefour",telephone:"+236 75 98 76 54"},createdAt:ago(5)},
  {id:"CMD-004",storeId:"s1",storeName:"Maman Cécile",storeType:"restaurant",clientId:"u1",clientName:"Jean-Baptiste Maïna",items:[{product:INIT_PRODUCTS[1],qty:1},{product:INIT_PRODUCTS[3],qty:1}],status:"prête",subtotal:3200,deliveryFee:500,total:3700,paymentMethod:"airtel_money",delivery:{nom:"Jean-Baptiste Maïna",quartier:"Castor",adresse:"Avenue Boganda",repere:"Immeuble La Paix, 2e étage",telephone:"+236 72 01 23 45"},createdAt:ago(45)},
];
const SEED_NOTIFS:Notif[] = [
  {id:"n1",userId:"u1",title:"Commande livrée ✓",body:"Votre commande CMD-001 a été livrée avec succès !",read:true,createdAt:ago(2*24*60),orderId:"CMD-001"},
  {id:"n2",userId:"u1",title:"En préparation",body:"Chez Aristide prépare votre commande CMD-002.",read:false,createdAt:ago(20),orderId:"CMD-002"},
  {id:"n3",userId:"u2",title:"Nouvelle commande !",body:"Commande CMD-003 reçue de Aristide Koyakouno.",read:false,createdAt:ago(5),orderId:"CMD-003"},
];

/* ════════════════════════ STORE CONFIG ═════════════════════════════════════ */
const STORE_TYPE_CFG:Record<StoreType,{icon:React.ReactNode;color:string;label:string}> = {
  restaurant:{icon:<ChefHat size={16}/>,color:"bg-orange-100 text-orange-600",label:"Restaurant"},
  pharmacie: {icon:<Plus size={16}/>,   color:"bg-green-100 text-green-600",  label:"Pharmacie"},
  marche:    {icon:<ShoppingBag size={16}/>,color:"bg-yellow-100 text-yellow-700",label:"Marché"},
  boutique:  {icon:<Package size={16}/>,color:"bg-purple-100 text-purple-600",label:"Boutique"},
  express:   {icon:<Zap size={16}/>,    color:"bg-primary/10 text-primary",   label:"Express"},
};

/* ════════════════════════════ SVG ICONS ════════════════════════════════════ */
function GoogleIcon(){return(<svg viewBox="0 0 24 24" width="20" height="20"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>);}
function AppleIcon(){return(<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>);}
function FacebookIcon(){return(<svg viewBox="0 0 24 24" width="20" height="20" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>);}

/* ════════════════════════ SHARED COMPONENTS ════════════════════════════════ */
function BDLogo({size="md",white=false}:{size?:"sm"|"md"|"lg";white?:boolean}){
  const s = size==="sm"?"w-8 h-8 text-sm":size==="lg"?"w-16 h-16 text-2xl":"w-10 h-10 text-base";
  return(
    <div className={`${s} ${white?"bg-white/20 border border-white/30":"bg-primary shadow-sm"} rounded-2xl flex items-center justify-center flex-shrink-0`}>
      <span className="text-white font-black tracking-tight" style={{fontFamily:DF}}>BD</span>
    </div>
  );
}

function PharmaCross({size=56}:{size?:number}){
  return(
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
      <circle cx="30" cy="30" r="28" fill="#dcfce7" opacity="0.9"/>
      <circle cx="30" cy="30" r="20" fill="#bbf7d0" opacity="0.7"/>
      <rect x="21" y="10" width="18" height="40" rx="5" fill="url(#phG)"/>
      <rect x="10" y="21" width="40" height="18" rx="5" fill="url(#phG)"/>
      <rect x="21" y="10" width="7" height="40" rx="5" fill="white" opacity="0.22"/>
      <defs><linearGradient id="phG" x1="10" y1="10" x2="50" y2="50" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#4ade80"/><stop offset="100%" stopColor="#16a34a"/></linearGradient></defs>
    </svg>
  );
}

function Badge({status}:{status:OrderStatus}){
  const c = STATUS_CFG[status];
  return <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${c.color} ${c.bg}`}>{c.label}</span>;
}

function StatusTracker({status}:{status:OrderStatus}){
  if(status==="annulée") return(
    <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-center">
      <X className="mx-auto text-red-500 mb-2" size={28}/><p className="text-red-600 font-bold">Commande annulée</p>
    </div>
  );
  const labels=["Reçue","Acceptée","Préparation","Prête","En route","Livrée"];
  const icons=[Package,Check,ChefHat,CheckCircle,Truck,Heart];
  const cur=STATUS_STEPS.indexOf(status);
  return(
    <div>
      {STATUS_STEPS.map((s,i)=>{
        const Icon=icons[i];const done=i<=cur;const active=i===cur;
        return(
          <div key={s} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${active?"bg-primary text-white ring-4 ring-primary/20 scale-110":done?"bg-primary/80 text-white":"bg-muted text-muted-foreground"}`}>
                <Icon size={15}/>
              </div>
              {i<STATUS_STEPS.length-1&&<div className={`w-0.5 h-7 mt-0.5 transition-colors ${i<cur?"bg-primary":"bg-muted"}`}/>}
            </div>
            <div className="pt-1.5 pb-7 last:pb-0">
              <p className={`text-sm font-semibold leading-tight ${done?"text-foreground":"text-muted-foreground"}`}>{labels[i]}</p>
              {active&&<p className="text-xs text-primary mt-0.5">En cours…</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NotifPanel({notifs,userId,onClose,onRead}:{notifs:Notif[];userId:string;onClose:()=>void;onRead:(id:string)=>void}){
  const mine=notifs.filter(n=>n.userId===userId);
  return(
    <div className="fixed inset-0 z-50 flex flex-col bg-black/40" onClick={onClose}>
      <div className="mt-auto bg-card rounded-t-3xl max-h-[70vh] flex flex-col" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
          <h3 className="font-black text-lg" style={{fontFamily:DF}}>Notifications</h3>
          <button onClick={onClose} className="w-8 h-8 bg-muted rounded-full flex items-center justify-center"><X size={16}/></button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {mine.length===0&&<p className="text-center text-muted-foreground py-8 text-sm">Aucune notification</p>}
          {mine.map(n=>(
            <div key={n.id} onClick={()=>onRead(n.id)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all active:scale-[0.98] ${n.read?"bg-card border-border":"bg-secondary border-primary/20"}`}>
              <p className={`text-sm font-bold ${n.read?"text-foreground":"text-primary"}`}>{n.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
              <p className="text-xs text-muted-foreground/60 mt-1.5">{n.createdAt.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OTPInput({value,onChange}:{value:string;onChange:(v:string)=>void}){
  const refs=useRef<(HTMLInputElement|null)[]>([]);
  const digits=value.padEnd(6," ").split("").slice(0,6);
  const handle=(i:number,v:string)=>{
    const d=[...digits]; d[i]=v.replace(/\D/,"").slice(-1);
    onChange(d.join("").replace(/ /g,""));
    if(v&&i<5) refs.current[i+1]?.focus();
  };
  const kd=(i:number,e:React.KeyboardEvent)=>{
    if(e.key==="Backspace"&&!digits[i].trim()&&i>0) refs.current[i-1]?.focus();
  };
  return(
    <div className="flex gap-3 justify-center">
      {digits.map((d,i)=>(
        <input key={i} ref={el=>refs.current[i]=el}
          type="text" maxLength={1} value={d.trim()}
          onChange={e=>handle(i,e.target.value)} onKeyDown={e=>kd(i,e)}
          className={`w-12 h-14 text-center text-2xl font-black bg-muted rounded-2xl border-2 outline-none transition-all ${d.trim()?"border-primary text-primary":"border-transparent text-foreground"} focus:border-primary focus:scale-105`}/>
      ))}
    </div>
  );
}

/* ════════════════════════ ONBOARDING ILLUSTRATIONS ════════════════════════ */
function Illus1(){
  return(
    <svg viewBox="0 0 280 220" className="w-full h-full">
      <ellipse cx="140" cy="200" rx="120" ry="18" fill="#1A6B45" opacity="0.08"/>
      {/* plate */}
      <ellipse cx="140" cy="150" rx="65" ry="22" fill="#e8f4ee"/>
      <ellipse cx="140" cy="145" rx="55" ry="18" fill="#f0fdf4"/>
      {/* food */}
      <circle cx="125" cy="135" r="18" fill="#E8A020"/>
      <circle cx="155" cy="133" r="14" fill="#c44b0a"/>
      <circle cx="140" cy="140" r="12" fill="#1A6B45"/>
      {/* steam */}
      <path d="M125 110 Q122 103 126 97 Q130 91 127 85" stroke="#94a3b8" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M140 108 Q137 101 141 95 Q145 89 142 83" stroke="#94a3b8" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M155 112 Q152 105 156 99 Q160 93 157 87" stroke="#94a3b8" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      {/* bag */}
      <rect x="90" y="60" width="60" height="50" rx="10" fill="#1A6B45"/>
      <rect x="105" y="52" width="30" height="16" rx="8" fill="none" stroke="#1A6B45" strokeWidth="4"/>
      <text x="120" y="90" textAnchor="middle" fill="white" fontSize="14" fontWeight="800">BD</text>
      {/* stars */}
      <text x="55" y="70" fontSize="18" opacity="0.7">⭐</text>
      <text x="200" y="90" fontSize="14" opacity="0.5">⭐</text>
      <text x="185" y="55" fontSize="10" opacity="0.4">✨</text>
    </svg>
  );
}
function Illus2(){
  return(
    <svg viewBox="0 0 280 220" className="w-full h-full">
      <ellipse cx="140" cy="200" rx="120" ry="18" fill="#1A6B45" opacity="0.08"/>
      {/* phone */}
      <rect x="95" y="35" width="90" height="155" rx="18" fill="#1A1A1A"/>
      <rect x="100" y="41" width="80" height="143" rx="13" fill="#e8f4ee"/>
      {/* map */}
      <rect x="103" y="50" width="74" height="90" rx="8" fill="#d1fae5"/>
      <path d="M113 90 L140 70 L167 85 L155 105 L140 95 L125 108 Z" fill="#bbf7d0" stroke="#1A6B45" strokeWidth="1.5"/>
      {/* route */}
      <path d="M118 112 Q130 98 148 88 Q160 82 165 72" stroke="#1A6B45" strokeWidth="2.5" fill="none" strokeDasharray="5 3" strokeLinecap="round"/>
      {/* pins */}
      <circle cx="118" cy="112" r="7" fill="#1A6B45"/>
      <circle cx="118" cy="112" r="3" fill="white"/>
      <ellipse cx="165" cy="70" rx="8" ry="10" fill="#E8A020"/>
      <circle cx="165" cy="68" r="3.5" fill="white"/>
      {/* status bar */}
      <rect x="103" y="147" width="74" height="36" rx="0" fill="white"/>
      <rect x="108" y="152" width="40" height="6" rx="3" fill="#e8f4ee"/>
      <rect x="108" y="163" width="25" height="4" rx="2" fill="#bbf7d0"/>
      <circle cx="167" cy="160" r="9" fill="#1A6B45"/>
      <path d="M163 160 L166 163 L171 157" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      {/* signal arcs */}
      <path d="M205 80 Q215 70 205 60" stroke="#1A6B45" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M210 85 Q225 70 210 55" stroke="#1A6B45" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6"/>
    </svg>
  );
}
function Illus3(){
  return(
    <svg viewBox="0 0 280 220" className="w-full h-full">
      <ellipse cx="140" cy="200" rx="120" ry="18" fill="#1A6B45" opacity="0.08"/>
      {/* phone */}
      <rect x="95" y="45" width="90" height="145" rx="18" fill="#1A6B45"/>
      <rect x="101" y="52" width="78" height="131" rx="12" fill="#f0fdf4"/>
      {/* Orange Money card */}
      <rect x="108" y="65" width="64" height="38" rx="8" fill="#FF6600"/>
      <circle cx="120" cy="75" r="8" fill="#FFB800" opacity="0.7"/>
      <circle cx="128" cy="75" r="8" fill="#FF6600" opacity="0.7"/>
      <text x="140" y="96" textAnchor="middle" fill="white" fontSize="9" fontWeight="700">ORANGE MONEY</text>
      {/* Airtel card */}
      <rect x="108" y="110" width="64" height="38" rx="8" fill="#CC0000"/>
      <text x="140" y="127" textAnchor="middle" fill="white" fontSize="9" fontWeight="700">AIRTEL MONEY</text>
      <text x="140" y="140" textAnchor="middle" fill="white" fontSize="7">●●●● ●●●●</text>
      {/* coins */}
      <circle cx="188" cy="80" r="14" fill="#E8A020" opacity="0.9"/>
      <circle cx="188" cy="80" r="11" fill="#F59E0B"/>
      <text x="188" y="84" textAnchor="middle" fill="white" fontSize="10" fontWeight="900">F</text>
      <circle cx="200" cy="105" r="10" fill="#E8A020" opacity="0.7"/>
      <circle cx="200" cy="105" r="7.5" fill="#F59E0B" opacity="0.9"/>
      <circle cx="82" cy="95" r="11" fill="#E8A020" opacity="0.6"/>
      <circle cx="82" cy="95" r="8" fill="#F59E0B" opacity="0.8"/>
      {/* check at bottom */}
      <circle cx="140" cy="165" r="12" fill="#1A6B45"/>
      <path d="M134 165 L138 169 L146 160" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

/* ════════════════════════ AUTH SCREENS ═════════════════════════════════════ */
function SplashScreen({onDone}:{onDone:()=>void}){
  useEffect(()=>{const t=setTimeout(onDone,2400);return()=>clearTimeout(t);},[onDone]);
  return(
    <div className="fixed inset-0 bg-primary flex flex-col items-center justify-center overflow-hidden">
      {/* background circles */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3"/>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/3"/>
      <div className="relative flex flex-col items-center gap-5">
        <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-2xl">
          <span className="text-primary font-black text-4xl" style={{fontFamily:DF}}>BD</span>
        </div>
        <div className="text-center">
          <h1 className="text-white text-3xl font-black" style={{fontFamily:DF}}>Bangui Direct</h1>
          <p className="text-white/70 mt-1.5 text-sm tracking-wide">Livraison locale · Bangui, RCA</p>
        </div>
      </div>
      <div className="flex gap-2 mt-20">
        {[0,1,2].map(i=>(<div key={i} className="w-2 h-2 bg-white/40 rounded-full animate-pulse" style={{animationDelay:`${i*0.25}s`}}/>))}
      </div>
    </div>
  );
}

const SLIDES=[
  {title:"Commandez en quelques clics",sub:"Restaurants, pharmacies, marchés et boutiques de Bangui — livrés directement chez vous.",bg:"bg-primary",Illus:Illus1},
  {title:"Suivi en temps réel",sub:"Suivez chaque étape de votre livraison depuis votre téléphone, minute par minute.",bg:"bg-amber-500",Illus:Illus2},
  {title:"Payez comme vous voulez",sub:"Orange Money, Airtel Money ou espèces à la livraison. Simple, sécurisé, rapide.",bg:"bg-blue-600",Illus:Illus3},
];

function OnboardingScreen({onDone}:{onDone:()=>void}){
  const [idx,setIdx]=useState(0);
  const slide=SLIDES[idx];
  const Illus=slide.Illus;
  return(
    <div className={`flex flex-col h-full ${slide.bg} transition-colors duration-500`}>
      {/* Skip */}
      <div className="flex justify-end px-5 pt-12">
        <button onClick={onDone} className="text-white/70 text-sm font-semibold bg-white/15 px-4 py-2 rounded-full">
          Ignorer
        </button>
      </div>
      {/* Illustration */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-xs aspect-square">
          <Illus/>
        </div>
      </div>
      {/* Text */}
      <div className="bg-card rounded-t-[2.5rem] px-7 pt-8 pb-10">
        {/* Dots */}
        <div className="flex gap-2 mb-6 justify-center">
          {SLIDES.map((_,i)=>(
            <div key={i} className={`h-1.5 rounded-full transition-all ${i===idx?"w-8 bg-primary":"w-2 bg-muted"}`}/>
          ))}
        </div>
        <h2 className="text-2xl font-black text-foreground text-center leading-tight mb-3" style={{fontFamily:DF}}>
          {slide.title}
        </h2>
        <p className="text-muted-foreground text-center text-sm leading-relaxed mb-8">
          {slide.sub}
        </p>
        {idx<SLIDES.length-1?(
          <button onClick={()=>setIdx(i=>i+1)}
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-base shadow-lg active:scale-[0.97] transition-transform">
            Suivant <ArrowRight className="inline ml-1" size={18}/>
          </button>
        ):(
          <button onClick={onDone}
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-base shadow-lg active:scale-[0.97] transition-transform">
            Commencer maintenant
          </button>
        )}
      </div>
    </div>
  );
}

function AuthChoiceScreen({onLogin,onRegister}:{onLogin:()=>void;onRegister:()=>void}){
  return(
    <div className="flex flex-col h-full bg-primary overflow-hidden">
      <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/4 translate-x-1/4"/>
      <div className="absolute bottom-48 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/4 -translate-x-1/4"/>
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center relative z-10">
        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-2xl mb-6">
          <span className="text-primary font-black text-3xl" style={{fontFamily:DF}}>BD</span>
        </div>
        <h1 className="text-white text-3xl font-black mb-3" style={{fontFamily:DF}}>Bangui Direct</h1>
        <p className="text-white/70 text-sm leading-relaxed max-w-xs">
          La première application de livraison locale à Bangui. Rapide, fiable, à votre service.
        </p>
        {/* Trust indicators */}
        <div className="flex gap-6 mt-8">
          {[{v:"7",l:"Commerces"},  {v:"100+",l:"Produits"}, {v:"4.8★",l:"Note"}].map(i=>(
            <div key={i.l} className="text-center">
              <p className="text-white font-black text-xl" style={{fontFamily:DF}}>{i.v}</p>
              <p className="text-white/60 text-xs">{i.l}</p>
            </div>
          ))}
        </div>
      </div>
      {/* CTA */}
      <div className="bg-card rounded-t-[2.5rem] px-6 pt-8 pb-10 space-y-3">
        <button onClick={onLogin}
          className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-base shadow-lg active:scale-[0.97] transition-transform">
          Se connecter
        </button>
        <button onClick={onRegister}
          className="w-full bg-muted text-foreground py-4 rounded-2xl font-bold text-base active:scale-[0.97] transition-transform">
          Créer un compte
        </button>
        <p className="text-center text-xs text-muted-foreground pt-2">
          En continuant, vous acceptez nos{" "}
          <span className="text-primary font-semibold">Conditions d'utilisation</span>
        </p>
      </div>
    </div>
  );
}

function LoginScreen({onLogin,onBack,onRegister}:{onLogin:(u:AppUser)=>void;onBack:()=>void;onRegister:()=>void}){
  const [email,setEmail]=useState("");
  const [pwd,setPwd]=useState("");
  const [showPwd,setShowPwd]=useState(false);
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);

  const doLogin=async()=>{
    if(!email.trim()||!pwd){setErr("Merci de renseigner votre email et votre mot de passe.");return;}
    setErr("");setLoading(true);
    try{
      const {token,user}=await AuthAPI.login(email.trim(),pwd);
      setAuthToken(token);
      setLoading(false);
      onLogin({id:user.id,name:user.name,email:user.email,role:user.role,storeId:user.storeId,telephone:user.telephone,accountType:user.accountType});
    }catch(e:any){
      setLoading(false);
      setErr(e?.message||"Email ou mot de passe incorrect.");
    }
  };

  const socialLogin=(provider:string)=>{
    setErr("La connexion via "+provider+" n'est pas encore disponible. Utilisez votre email et mot de passe.");
  };

  const demoAccounts=[
    {label:"👤 Client",     email:"client@test.com",  cls:"bg-blue-50 text-blue-700 border border-blue-200"},
    {label:"🏪 Commerçant", email:"merchant@test.com", cls:"bg-amber-50 text-amber-700 border border-amber-200"},
    {label:"🏍️ Livreur",   email:"driver@test.com",   cls:"bg-violet-50 text-violet-700 border border-violet-200"},
    {label:"⚙️ Admin",      email:"admin@test.com",    cls:"bg-primary/10 text-primary border border-primary/20"},
  ];

  return(
    <div className="flex flex-col h-full bg-card overflow-hidden">
      {/* Header */}
      <div className="bg-primary px-5 pt-14 pb-8">
        <button onClick={onBack} className="flex items-center gap-2 text-white/70 mb-6 text-sm">
          <ChevronLeft size={18}/>Retour
        </button>
        <h1 className="text-white text-2xl font-black" style={{fontFamily:DF}}>Connexion</h1>
        <p className="text-white/70 text-sm mt-1">Bienvenue sur Bangui Direct</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 scrollbar-hide">
        {/* Social login */}
        <div className="space-y-2.5 mb-5">
          {[
            {icon:<GoogleIcon/>,   label:"Continuer avec Google",   bg:"bg-white border border-gray-200",  text:"text-foreground"},
            {icon:<AppleIcon/>,    label:"Continuer avec Apple",    bg:"bg-black",                          text:"text-white"},
            {icon:<FacebookIcon/>, label:"Continuer avec Facebook", bg:"bg-[#1877F2]",                      text:"text-white"},
          ].map(s=>(
            <button key={s.label} onClick={()=>socialLogin(s.label)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-semibold text-sm ${s.bg} ${s.text} shadow-sm active:scale-[0.97] transition-transform`}>
              <span className="w-6 flex-shrink-0 flex items-center justify-center">{s.icon}</span>
              <span className="flex-1 text-center">{s.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-border"/>
          <span className="text-xs text-muted-foreground font-medium">ou par email</span>
          <div className="flex-1 h-px bg-border"/>
        </div>

        {/* Form */}
        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"/>
              <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="votre@email.com"
                className="w-full bg-muted rounded-xl pl-10 pr-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"/>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">Mot de passe</label>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"/>
              <input value={pwd} onChange={e=>setPwd(e.target.value)} type={showPwd?"text":"password"} placeholder="••••••••"
                className="w-full bg-muted rounded-xl pl-10 pr-12 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"/>
              <button onClick={()=>setShowPwd(v=>!v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPwd?<EyeOff size={16}/>:<Eye size={16}/>}
              </button>
            </div>
          </div>
          {err&&<p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle size={12}/>{err}</p>}
          <div className="flex justify-end">
            <button className="text-primary text-xs font-semibold">Mot de passe oublié ?</button>
          </div>
        </div>

        <button onClick={doLogin} disabled={loading}
          className={`w-full py-4 rounded-2xl font-bold text-sm shadow-lg transition-all ${loading?"bg-primary/60 text-white":"bg-primary text-white active:scale-[0.97]"}`}>
          {loading?"Connexion en cours…":"Se connecter"}
        </button>

        {/* Demo accounts */}
        <div className="mt-5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Comptes démo (mot de passe : password123)</p>
          <div className="grid grid-cols-2 gap-2">
            {demoAccounts.map(d=>(
              <button key={d.email} onClick={()=>{setEmail(d.email);setPwd("password123");setErr("");}}
                className={`${d.cls} rounded-xl py-2.5 text-xs font-bold text-center active:scale-95 transition-transform`}>
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-5">
          Pas de compte ?{" "}
          <button onClick={onRegister} className="text-primary font-bold">Créer un compte</button>
        </p>
      </div>
      {loading&&(
        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card rounded-2xl p-6 shadow-xl flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" style={{borderWidth:"3px"}}/>
            <p className="text-sm font-semibold">Connexion en cours…</p>
          </div>
        </div>
      )}
    </div>
  );
}

function AccountTypeScreen({onSelect,onBack}:{onSelect:(t:AccountType)=>void;onBack:()=>void}){
  const types=[
    {id:"personal" as AccountType, icon:"👤", title:"Compte Personnel", sub:"Commandez auprès de restaurants, pharmacies, marchés et boutiques de Bangui.", badge:"", color:"border-border hover:border-primary"},
    {id:"merchant_pro" as AccountType, icon:"🏪", title:"Compte Commerçant Pro", sub:"Vendez vos produits, gérez vos commandes et développez votre activité.", badge:"PRO", color:"border-amber-200 hover:border-amber-400"},
    {id:"driver_pro" as AccountType, icon:"🏍️", title:"Compte Livreur Pro", sub:"Effectuez des livraisons et gagnez de l'argent à votre rythme.", badge:"PRO", color:"border-violet-200 hover:border-violet-400"},
  ];
  return(
    <div className="flex flex-col h-full bg-card">
      <div className="bg-primary px-5 pt-14 pb-8">
        <button onClick={onBack} className="flex items-center gap-2 text-white/70 mb-6 text-sm">
          <ChevronLeft size={18}/>Retour
        </button>
        <h1 className="text-white text-2xl font-black" style={{fontFamily:DF}}>Quel type de compte ?</h1>
        <p className="text-white/70 text-sm mt-1">Choisissez selon votre profil</p>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {types.map(t=>(
          <button key={t.id} onClick={()=>onSelect(t.id)}
            className={`w-full text-left border-2 ${t.color} bg-card rounded-2xl p-5 transition-all active:scale-[0.97] shadow-sm`}>
            <div className="flex items-start gap-4">
              <span className="text-4xl leading-none mt-1">{t.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-black text-base" style={{fontFamily:DF}}>{t.title}</p>
                  {t.badge&&<span className="text-xs font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{t.badge}</span>}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{t.sub}</p>
              </div>
              <ChevronRight size={18} className="text-muted-foreground flex-shrink-0 mt-1"/>
            </div>
          </button>
        ))}
        <p className="text-center text-xs text-muted-foreground pt-2 pb-4">
          Vous pouvez modifier votre type de compte à tout moment dans les paramètres.
        </p>
      </div>
    </div>
  );
}

function RegisterScreen({accountType,onSubmit,onBack,initialError}:{accountType:AccountType;onSubmit:(data:{name:string;phone:string;email:string;pwd:string})=>void;onBack:()=>void;initialError?:string}){
  const COUNTRIES=[
    {code:"+236",flag:"🇨🇫",name:"Centrafrique"},
    {code:"+235",flag:"🇹🇩",name:"Tchad"},
    {code:"+237",flag:"🇨🇲",name:"Cameroun"},
    {code:"+242",flag:"🇨🇬",name:"Congo-Brazzaville"},
    {code:"+243",flag:"🇨🇩",name:"RD Congo"},
    {code:"+241",flag:"🇬🇦",name:"Gabon"},
    {code:"+33", flag:"🇫🇷",name:"France"},
  ];
  const [country,setCountry]=useState(COUNTRIES[0]);
  const [showCountryPicker,setShowCountryPicker]=useState(false);
  const [form,setForm]=useState({name:"",phone:"",email:"",pwd:"",confirmPwd:""});
  const [showPwd,setShowPwd]=useState(false);
  const [storeName,setStoreName]=useState("");
  const [err,setErr]=useState(initialError||"");
  const isMerchant=accountType==="merchant_pro";
  const isDriver=accountType==="driver_pro";
  const title=isMerchant?"Compte Commerçant Pro":isDriver?"Compte Livreur Pro":"Compte Personnel";
  const emoji=isMerchant?"🏪":isDriver?"🏍️":"👤";

  const submit=()=>{
    if(!form.name||!form.phone||!form.email||!form.pwd){setErr("Veuillez remplir tous les champs obligatoires.");return;}
    if(form.pwd!==form.confirmPwd){setErr("Les mots de passe ne correspondent pas.");return;}
    if(form.pwd.length<8){setErr("Le mot de passe doit contenir au moins 8 caractères.");return;}
    if(!/[a-z]/.test(form.pwd)){setErr("Le mot de passe doit contenir au moins une minuscule.");return;}
    if(!/[A-Z]/.test(form.pwd)){setErr("Le mot de passe doit contenir au moins une majuscule.");return;}
    if(!/[0-9]/.test(form.pwd)){setErr("Le mot de passe doit contenir au moins un chiffre.");return;}
    if(!/[^A-Za-z0-9]/.test(form.pwd)){setErr("Le mot de passe doit contenir au moins un caractère spécial (ex: ! ? # @ _ -).");return;}
    setErr("");
    onSubmit({name:form.name,phone:country.code+" "+form.phone,email:form.email,pwd:form.pwd});
  };

  const field=(label:string,key:keyof typeof form,opts?:{type?:string;placeholder?:string;icon?:React.ReactNode})=>(
    <div key={key}>
      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">{label}</label>
      <div className="relative">
        {opts?.icon&&<span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">{opts.icon}</span>}
        <input type={opts?.type||"text"} value={form[key]} placeholder={opts?.placeholder}
          onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}
          className={`w-full bg-muted rounded-xl ${opts?.icon?"pl-10":"pl-4"} pr-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all`}/>
      </div>
    </div>
  );

  return(
    <div className="flex flex-col h-full bg-card">
      <div className="bg-primary px-5 pt-14 pb-8">
        <button onClick={onBack} className="flex items-center gap-2 text-white/70 mb-6 text-sm">
          <ChevronLeft size={18}/>Retour
        </button>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{emoji}</span>
          <div>
            <h1 className="text-white text-xl font-black" style={{fontFamily:DF}}>{title}</h1>
            <p className="text-white/70 text-sm">Créez votre compte gratuitement</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3 scrollbar-hide">
        {/* Social register */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            {icon:<GoogleIcon/>,   label:"Google", bg:"bg-white border border-gray-200 text-foreground"},
            {icon:<AppleIcon/>,    label:"Apple",  bg:"bg-black text-white"},
            {icon:<FacebookIcon/>, label:"Facebook",bg:"bg-[#1877F2] text-white"},
          ].map(s=>(
            <button key={s.label} className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl ${s.bg} text-xs font-semibold active:scale-95 transition-transform shadow-sm`}>
              {s.icon}<span>{s.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 mb-1">
          <div className="flex-1 h-px bg-border"/>
          <span className="text-xs text-muted-foreground">ou remplissez le formulaire</span>
          <div className="flex-1 h-px bg-border"/>
        </div>

        {field("Nom complet *","name",{placeholder:"Jean-Baptiste Maïna",icon:<User size={15}/>})}
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">Téléphone *</label>
          <div className="flex gap-2 relative">
            <button type="button" onClick={()=>setShowCountryPicker(v=>!v)}
              className="bg-muted rounded-xl px-3 py-3.5 flex items-center gap-1.5 flex-shrink-0">
              <span className="text-sm">{country.flag}</span>
              <span className="text-sm font-semibold">{country.code}</span>
              <ChevronDown size={13}/>
            </button>
            <input value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))}
              placeholder="72 01 23 45" className="flex-1 bg-muted rounded-xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"/>
            {showCountryPicker&&(
              <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-20 w-56 overflow-hidden">
                {COUNTRIES.map(c=>(
                  <button key={c.code} type="button" onClick={()=>{setCountry(c);setShowCountryPicker(false);}}
                    className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm hover:bg-muted text-left">
                    <span>{c.flag}</span><span className="flex-1">{c.name}</span><span className="text-muted-foreground">{c.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {field("Email *","email",{type:"email",placeholder:"vous@email.com",icon:<Mail size={15}/>})}
        {isMerchant&&(
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">Nom du commerce *</label>
            <div className="relative">
              <Building2 size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"/>
              <input value={storeName} onChange={e=>setStoreName(e.target.value)} placeholder="Mon Restaurant / Ma Boutique…"
                className="w-full bg-muted rounded-xl pl-10 pr-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"/>
            </div>
          </div>
        )}
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">Mot de passe *</label>
          <div className="relative">
            <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"/>
            <input type={showPwd?"text":"password"} value={form.pwd} onChange={e=>setForm(p=>({...p,pwd:e.target.value}))} placeholder="8 caractères min., Aa1!"
              className="w-full bg-muted rounded-xl pl-10 pr-12 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"/>
            <button onClick={()=>setShowPwd(v=>!v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showPwd?<EyeOff size={16}/>:<Eye size={16}/>}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Au moins 8 caractères, avec une majuscule, une minuscule, un chiffre et un caractère spécial.</p>
        </div>
        {field("Confirmer le mot de passe *","confirmPwd",{type:showPwd?"text":"password",placeholder:"Répétez le mot de passe",icon:<Lock size={15}/>})}

        {err&&<div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
          <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5"/><p className="text-red-600 text-xs">{err}</p>
        </div>}

        <button onClick={submit}
          className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg active:scale-[0.97] transition-transform">
          Continuer
        </button>

        <div className="text-xs text-muted-foreground text-center pb-4">
          En créant un compte, vous acceptez nos{" "}
          <span className="text-primary font-semibold">Conditions générales</span>{" "}et notre{" "}
          <span className="text-primary font-semibold">Politique de confidentialité</span>.
        </div>
      </div>
    </div>
  );
}

function OTPScreen({phone,onVerify,onBack}:{phone:string;onVerify:()=>void;onBack:()=>void}){
  const [otp,setOtp]=useState("");
  const [timer,setTimer]=useState(60);
  const [err,setErr]=useState("");
  const [verified,setVerified]=useState(false);

  useEffect(()=>{
    if(timer>0){const t=setTimeout(()=>setTimer(v=>v-1),1000);return()=>clearTimeout(t);}
  },[timer]);

  const verify=()=>{
    if(otp==="123456"||otp.length===6){
      setVerified(true);
      setTimeout(onVerify,1200);
    } else {
      setErr("Code incorrect. Code démo : 123456");
    }
  };

  return(
    <div className="flex flex-col h-full bg-card">
      <div className="bg-primary px-5 pt-14 pb-8">
        <button onClick={onBack} className="flex items-center gap-2 text-white/70 mb-6 text-sm">
          <ChevronLeft size={18}/>Retour
        </button>
        <h1 className="text-white text-2xl font-black" style={{fontFamily:DF}}>Vérification</h1>
        <p className="text-white/70 text-sm mt-1">Entrez le code reçu par SMS</p>
      </div>

      <div className="flex-1 px-6 py-8 flex flex-col">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-5">
            <Smartphone size={36} className="text-primary"/>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Un code à 6 chiffres a été envoyé au<br/>
            <strong className="text-foreground">{phone}</strong>
          </p>
        </div>

        <OTPInput value={otp} onChange={setOtp}/>

        {err&&!verified&&(
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mt-4">
            <AlertCircle size={14} className="text-red-500 flex-shrink-0"/><p className="text-red-600 text-xs">{err}</p>
          </div>
        )}

        {verified&&(
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 mt-4">
            <CheckCircle size={14} className="text-emerald-600 flex-shrink-0"/><p className="text-emerald-700 text-xs font-semibold">Code vérifié ! Création du compte…</p>
          </div>
        )}

        <button onClick={verify} disabled={otp.length<6||verified}
          className={`mt-6 w-full py-4 rounded-2xl font-bold shadow-lg transition-all ${otp.length===6&&!verified?"bg-primary text-white active:scale-[0.97]":"bg-muted text-muted-foreground"}`}>
          {verified?"Compte créé ✓":"Vérifier le code"}
        </button>

        <div className="mt-6 text-center">
          {timer>0?(
            <p className="text-muted-foreground text-sm">Renvoyer dans <strong className="text-primary">{timer}s</strong></p>
          ):(
            <button onClick={()=>setTimer(60)} className="text-primary font-semibold text-sm">Renvoyer le code</button>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4 bg-muted rounded-xl py-3 px-4">
          Code de démonstration : <strong>123456</strong>
        </p>
      </div>
    </div>
  );
}

/* ════════════════════════════ CLIENT APP ════════════════════════════════════ */
const PROMOS=[
  {id:1,title:"Livraison gratuite",sub:"Sur votre première commande",from:"from-emerald-600",to:"to-green-500",emoji:"🎁"},
  {id:2,title:"Marché KM5",sub:"Légumes frais en 30 min",from:"from-amber-500",to:"to-orange-500",emoji:"🥬"},
  {id:3,title:"Pharmacie 7j/7",sub:"Médicaments en urgence",from:"from-blue-600",to:"to-cyan-500",emoji:"💊"},
];
const CATS=[
  {type:"restaurant" as StoreType,label:"Restaurant",icon:<ChefHat size={22}/>,special:false},
  {type:"pharmacie"  as StoreType,label:"Pharmacie", icon:null, special:true},
  {type:"marche"     as StoreType,label:"Marché",    icon:<ShoppingBag size={22}/>,special:false},
  {type:"boutique"   as StoreType,label:"Boutique",  icon:<Package size={22}/>,special:false},
  {type:"express"    as StoreType,label:"Express",   icon:<Zap size={22}/>,special:false},
];
const CAT_COLOR:Record<StoreType,string>={
  restaurant:"bg-orange-50 text-orange-600 border-orange-100",
  pharmacie:"bg-green-50 text-green-600 border-green-100",
  marche:"bg-yellow-50 text-yellow-700 border-yellow-100",
  boutique:"bg-purple-50 text-purple-600 border-purple-100",
  express:"bg-primary/5 text-primary border-primary/10",
};

function StoreCard({store,isFav,onFav,onClick}:{store:Store;isFav:boolean;onFav:()=>void;onClick:()=>void}){
  const tc=STORE_TYPE_CFG[store.type];
  return(
    <div className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border active:scale-[0.99] transition-transform cursor-pointer" onClick={onClick}>
      <div className="relative">
        <img src={store.coverImage} alt={store.name} className="w-full h-44 object-cover bg-muted"/>
        {!store.isOpen&&(
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-white/90 text-foreground text-xs font-bold px-3 py-1.5 rounded-full">Fermé · Ouvre {store.openHours.split("–")[0]}</span>
          </div>
        )}
        <button onClick={e=>{e.stopPropagation();onFav();}}
          className="absolute top-3 right-3 w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-md active:scale-90 transition-transform">
          <Heart size={17} className={isFav?"fill-red-500 text-red-500":"text-gray-400"}/>
        </button>
        {store.type==="express"&&(
          <div className="absolute top-3 left-3 bg-primary text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
            <Zap size={10}/>Express
          </div>
        )}
        <div className={`absolute bottom-3 left-3 flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold ${tc.color}`}>
          {tc.icon}{tc.label}
        </div>
      </div>
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-foreground leading-tight truncate text-base" style={{fontFamily:DF}}>{store.name}</h3>
            <p className="text-muted-foreground text-xs mt-0.5 flex items-center gap-1"><MapPin size={10}/>{store.quartier}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
            <Star size={12} className="fill-amber-400 text-amber-400"/>
            <span className="text-xs font-black text-amber-700">{store.rating}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-2.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock size={11}/>{store.deliveryTime}</span>
          <span className="flex items-center gap-1"><Truck size={11}/>{FMT(store.deliveryFee)}</span>
          <span className="text-[10px]">{store.ratingCount} avis</span>
        </div>
      </div>
    </div>
  );
}

function ProductRow({product,qty,onAdd,onRemove}:{product:Product;qty:number;onAdd:()=>void;onRemove:()=>void}){
  return(
    <div className="flex gap-3 py-3.5 border-b border-border last:border-0">
      <img src={product.image} alt={product.name} className="w-20 h-20 rounded-xl object-cover bg-muted flex-shrink-0"/>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-sm leading-snug">{product.name}</h4>
        <p className="text-muted-foreground text-xs mt-0.5 line-clamp-2">{product.description}</p>
        {!product.available&&<span className="text-red-500 text-xs font-medium mt-1 block">Indisponible</span>}
        <div className="flex items-center justify-between mt-2.5">
          <span className="text-primary font-black text-sm">{FMT(product.price)}</span>
          {product.available&&(
            qty===0?(
              <button onClick={onAdd}
                className="bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform shadow-sm">
                <Plus size={16}/>
              </button>
            ):(
              <div className="flex items-center gap-2 bg-primary rounded-full px-3 py-1.5">
                <button onClick={onRemove}><Minus size={13} className="text-white"/></button>
                <span className="text-white font-black text-sm w-4 text-center">{qty}</span>
                <button onClick={onAdd}><Plus size={13} className="text-white"/></button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function ClientNav({view,setView,cartCount,unread}:{view:ClientView;setView:(v:ClientView)=>void;cartCount:number;unread:number}){
  const items:[ClientView,React.ReactNode,string][]=[
    ["home",    <Home size={21}/>,         "Accueil"],
    ["search",  <Search size={21}/>,       "Rechercher"],
    ["cart",    <ShoppingCart size={21}/>, "Panier"],
    ["orders",  <ClipboardList size={21}/>,"Commandes"],
    ["favorites",<Heart size={21}/>,       "Favoris"],
    ["profile", <User size={21}/>,         "Profil"],
  ];
  return(
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm bg-card/95 backdrop-blur border-t border-border shadow-2xl z-40">
      <div className="flex items-stretch">
        {items.map(([v,icon,label])=>{
          const active=view===v;
          return(
            <button key={v} onClick={()=>setView(v)}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 relative transition-colors ${active?"text-primary":"text-muted-foreground"}`}>
              {active&&<div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full"/>}
              <div className="relative">
                {icon}
                {v==="cart"&&cartCount>0&&(
                  <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">{cartCount}</span>
                )}
                {v==="profile"&&unread>0&&(
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-card"/>
                )}
              </div>
              <span className={`text-[10px] font-semibold ${active?"text-primary":""}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function ClientApp({user,allOrders,setAllOrders,allNotifs,setAllNotifs,allProducts,onLogout}:{
  user:AppUser;allOrders:Order[];setAllOrders:React.Dispatch<React.SetStateAction<Order[]>>;
  allNotifs:Notif[];setAllNotifs:React.Dispatch<React.SetStateAction<Notif[]>>;
  allProducts:Product[];onLogout:()=>void;
}){
  const [view,setView]=useState<ClientView>("home");
  const [activeStore,setActiveStore]=useState<Store|null>(null);
  const [filterType,setFilterType]=useState<StoreType|null>(null);
  const [cart,setCart]=useState<CartItem[]>([]);
  const [cartStoreId,setCartStoreId]=useState<string|null>(null);
  const [activeOrder,setActiveOrder]=useState<Order|null>(null);
  const [favorites,setFavorites]=useState<string[]>(["s1","s3"]);
  const [query,setQuery]=useState("");
  const [showNotif,setShowNotif]=useState(false);
  const [delivery,setDelivery]=useState<Partial<DeliveryInfo>>({nom:user.name,telephone:user.telephone||""});
  const [payment,setPayment]=useState<PaymentMethod>("orange_money");
  const [note,setNote]=useState("");
  const [promoIdx,setPromoIdx]=useState(0);

  useEffect(()=>{const i=setInterval(()=>setPromoIdx(a=>(a+1)%PROMOS.length),3500);return()=>clearInterval(i);},[]);

  const myOrders=allOrders.filter(o=>o.clientId===user.id);
  const unread=allNotifs.filter(n=>n.userId===user.id&&!n.read).length;
  const cartTotal=cart.reduce((s,i)=>s+i.product.price*i.qty,0);
  const storeProducts=activeStore?allProducts.filter(p=>p.storeId===activeStore.id):[];
  const filteredStores=STORES.filter(s=>!filterType||s.type===filterType).filter(s=>!query||s.name.toLowerCase().includes(query.toLowerCase())||s.category.toLowerCase().includes(query.toLowerCase()));

  const addToCart=(product:Product)=>{
    if(cartStoreId&&cartStoreId!==product.storeId){setCart([]);setCartStoreId(product.storeId);}
    if(!cartStoreId)setCartStoreId(product.storeId);
    setCart(prev=>{const ex=prev.find(i=>i.product.id===product.id);return ex?prev.map(i=>i.product.id===product.id?{...i,qty:i.qty+1}:i):[...prev,{product,qty:1}];});
  };
  const removeFromCart=(pid:string)=>{
    setCart(prev=>{const u=prev.map(i=>i.product.id===pid?{...i,qty:i.qty-1}:i).filter(i=>i.qty>0);if(u.length===0)setCartStoreId(null);return u;});
  };
  const getQty=(pid:string)=>cart.find(i=>i.product.id===pid)?.qty??0;

  const placeOrder=()=>{
    const d=delivery as DeliveryInfo;
    if(!activeStore||!d.quartier||!d.adresse||!d.telephone)return;
    const id=`CMD-${String(allOrders.length+1).padStart(3,"0")}`;
    const o:Order={id,storeId:activeStore.id,storeName:activeStore.name,storeType:activeStore.type,clientId:user.id,clientName:user.name,items:[...cart],status:"nouvelle",subtotal:cartTotal,deliveryFee:activeStore.deliveryFee,total:cartTotal+activeStore.deliveryFee,paymentMethod:payment,delivery:d,createdAt:new Date(),note};
    setAllOrders(prev=>[o,...prev]);
    setAllNotifs(prev=>[{id:`n${Date.now()}`,userId:activeStore.merchantId,title:"🔔 Nouvelle commande !",body:`Commande ${id} de ${user.name}`,read:false,createdAt:new Date(),orderId:id},...prev]);
    setCart([]);setCartStoreId(null);setActiveOrder(o);setView("order_detail");
  };
  const readNotif=(id:string)=>setAllNotifs(prev=>prev.map(n=>n.id===id?{...n,read:true}:n));
  const toggleFav=(id:string)=>setFavorites(prev=>prev.includes(id)?prev.filter(f=>f!==id):[...prev,id]);

  /* HOME */
  const renderHome=()=>(
    <div className="px-4 pt-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Bonjour 👋</p>
          <h1 className="font-black text-xl leading-tight" style={{fontFamily:DF}}>{user.name.split(" ")[0]}</h1>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={()=>setShowNotif(true)} className="relative w-10 h-10 bg-card border border-border rounded-2xl flex items-center justify-center shadow-sm">
            <Bell size={18}/>
            {unread>0&&<span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-card">{unread}</span>}
          </button>
          <BDLogo size="sm"/>
        </div>
      </div>
      {/* Search bar */}
      <button onClick={()=>setView("search")}
        className="w-full flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3.5 shadow-sm active:scale-[0.98] transition-transform">
        <Search size={17} className="text-muted-foreground flex-shrink-0"/>
        <span className="text-sm text-muted-foreground flex-1 text-left">Restaurants, pharmacies, marchés…</span>
        <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded-xl text-muted-foreground">
          <MapPin size={11}/><span className="text-xs">Bangui</span>
        </div>
      </button>
      {/* Promo carousel */}
      <div className="relative overflow-hidden rounded-2xl h-36">
        {PROMOS.map((promo,i)=>(
          <div key={promo.id}
            className={`absolute inset-0 bg-gradient-to-r ${promo.from} ${promo.to} transition-opacity duration-500 flex items-center justify-between px-6`}
            style={{opacity:i===promoIdx?1:0}}>
            <div>
              <p className="text-white/75 text-xs font-medium mb-1">{promo.sub}</p>
              <h3 className="text-white text-xl font-black" style={{fontFamily:DF}}>{promo.title}</h3>
              <div className="mt-3 inline-flex items-center gap-1 bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                Commander <ArrowRight size={11}/>
              </div>
            </div>
            <span className="text-5xl select-none">{promo.emoji}</span>
          </div>
        ))}
        <div className="absolute bottom-3 right-4 flex gap-1.5">
          {PROMOS.map((_,i)=>(
            <button key={i} onClick={()=>setPromoIdx(i)} className={`h-1.5 rounded-full transition-all ${i===promoIdx?"w-5 bg-white":"w-1.5 bg-white/40"}`}/>
          ))}
        </div>
      </div>
      {/* Categories */}
      <div>
        <h2 className="font-black text-base mb-3" style={{fontFamily:DF}}>Catégories</h2>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
          {CATS.map(cat=>(
            <button key={cat.type} onClick={()=>{setFilterType(cat.type);setView("search");}}
              className={`flex-shrink-0 flex flex-col items-center gap-2 px-5 py-3.5 rounded-2xl border ${CAT_COLOR[cat.type]} active:scale-95 transition-transform`}>
              {cat.special?<PharmaCross size={32}/>:<div className="w-8 h-8 flex items-center justify-center">{cat.icon}</div>}
              <span className="text-xs font-bold">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>
      {/* Stores */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-base" style={{fontFamily:DF}}>Commerces ouverts</h2>
          <button onClick={()=>setView("search")} className="text-primary text-xs font-bold">Voir tout →</button>
        </div>
        <div className="space-y-4 pb-4">
          {STORES.filter(s=>s.isOpen).map(s=>(
            <StoreCard key={s.id} store={s} isFav={favorites.includes(s.id)} onFav={()=>toggleFav(s.id)}
              onClick={()=>{setActiveStore(s);setView("store");}}/>
          ))}
          {STORES.filter(s=>!s.isOpen).length>0&&(
            <div className="opacity-60">
              <p className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wide">Actuellement fermés</p>
              {STORES.filter(s=>!s.isOpen).map(s=>(
                <StoreCard key={s.id} store={s} isFav={favorites.includes(s.id)} onFav={()=>toggleFav(s.id)}
                  onClick={()=>{setActiveStore(s);setView("store");}}/>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  /* SEARCH */
  const renderSearch=()=>(
    <div className="px-4 pt-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={()=>{setView("home");setFilterType(null);setQuery("");}} className="w-10 h-10 bg-card border border-border rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
          <ChevronLeft size={18}/>
        </button>
        <div className="flex-1 flex items-center gap-2 bg-card border border-border rounded-2xl px-4 py-3 shadow-sm">
          <Search size={16} className="text-muted-foreground flex-shrink-0"/>
          <input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher…"
            className="flex-1 text-sm outline-none bg-transparent"/>
          {query&&<button onClick={()=>setQuery("")}><X size={14} className="text-muted-foreground"/></button>}
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        <button onClick={()=>setFilterType(null)}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-all ${!filterType?"bg-primary text-white border-primary":"bg-card text-foreground border-border"}`}>
          Tout
        </button>
        {CATS.map(c=>(
          <button key={c.type} onClick={()=>setFilterType(c.type===filterType?null:c.type)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-all ${filterType===c.type?"bg-primary text-white border-primary":"bg-card text-foreground border-border"}`}>
            {c.label}
          </button>
        ))}
      </div>
      <div className="space-y-4 pb-4">
        {filteredStores.length===0&&<div className="text-center py-16"><Search size={40} className="mx-auto text-muted-foreground/40 mb-3"/><p className="text-muted-foreground font-medium">Aucun résultat</p></div>}
        {filteredStores.map(s=>(
          <StoreCard key={s.id} store={s} isFav={favorites.includes(s.id)} onFav={()=>toggleFav(s.id)}
            onClick={()=>{setActiveStore(s);setView("store");}}/>
        ))}
      </div>
    </div>
  );

  /* STORE */
  const renderStore=()=>{
    if(!activeStore)return null;
    const cats2=[...new Set(storeProducts.map(p=>p.category))];
    const tc=STORE_TYPE_CFG[activeStore.type];
    const cartForStore=cart.filter(i=>i.product.storeId===activeStore.id);
    const storeCartTotal=cartForStore.reduce((s,i)=>s+i.product.price*i.qty,0);
    return(
      <div>
        <div className="relative h-60">
          <img src={activeStore.coverImage} alt={activeStore.name} className="w-full h-full object-cover bg-muted"/>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"/>
          <button onClick={()=>setView("home")} className="absolute top-4 left-4 w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20">
            <ChevronLeft size={18} className="text-white"/>
          </button>
          <button onClick={()=>toggleFav(activeStore.id)} className="absolute top-4 right-4 w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20">
            <Heart size={17} className={favorites.includes(activeStore.id)?"fill-red-400 text-red-400":"text-white"}/>
          </button>
          <div className="absolute bottom-4 left-4 right-4">
            <div className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-bold mb-2 ${tc.color}`}>{tc.icon}{tc.label}</div>
            <h1 className="text-white text-2xl font-black" style={{fontFamily:DF}}>{activeStore.name}</h1>
            <div className="flex items-center gap-3 text-white/80 text-xs mt-1">
              <span className="flex items-center gap-1"><Star size={11} className="fill-amber-400 text-amber-400"/>{activeStore.rating}</span>
              <span className="flex items-center gap-1"><Clock size={11}/>{activeStore.deliveryTime}</span>
              <span className="flex items-center gap-1"><Truck size={11}/>{FMT(activeStore.deliveryFee)}</span>
            </div>
          </div>
        </div>
        <div className="px-4 py-4 pb-28 space-y-6">
          <p className="text-sm text-muted-foreground">{activeStore.description}</p>
          {cats2.map(cat=>(
            <div key={cat}>
              <h2 className="font-black text-base mb-1 pb-2 border-b border-border" style={{fontFamily:DF}}>{cat}</h2>
              {storeProducts.filter(p=>p.category===cat).map(p=>(
                <ProductRow key={p.id} product={p} qty={getQty(p.id)} onAdd={()=>addToCart(p)} onRemove={()=>removeFromCart(p.id)}/>
              ))}
            </div>
          ))}
        </div>
        {cart.length>0&&cartStoreId===activeStore.id&&(
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 pb-2">
            <button onClick={()=>setView("cart")}
              className="w-full bg-primary text-white py-4 rounded-2xl font-black flex items-center justify-between px-5 shadow-xl active:scale-[0.97] transition-transform">
              <span className="bg-white/20 text-white text-xs font-black px-2 py-1 rounded-xl">{cart.reduce((s,i)=>s+i.qty,0)} article{cart.reduce((s,i)=>s+i.qty,0)>1?"s":""}</span>
              <span style={{fontFamily:DF}}>Voir le panier</span>
              <span>{FMT(storeCartTotal)}</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  /* CART */
  const renderCart=()=>{
    const cs=STORES.find(s=>s.id===cartStoreId);
    return(
      <div className="px-4 pt-4 pb-4 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={()=>setView(activeStore?"store":"home")} className="w-10 h-10 bg-card border border-border rounded-2xl flex items-center justify-center shadow-sm">
            <ChevronLeft size={18}/>
          </button>
          <h1 className="font-black text-xl flex-1" style={{fontFamily:DF}}>Mon panier</h1>
          {cart.length>0&&<button onClick={()=>{setCart([]);setCartStoreId(null);}} className="text-red-500 text-xs font-bold">Vider</button>}
        </div>
        {cart.length===0?(
          <div className="text-center py-20">
            <ShoppingCart size={52} className="mx-auto text-muted-foreground/40 mb-4"/>
            <p className="text-foreground font-bold text-base">Votre panier est vide</p>
            <p className="text-muted-foreground text-sm mt-1">Explorez nos commerces pour commander</p>
            <button onClick={()=>setView("home")} className="mt-5 bg-primary text-white px-6 py-3 rounded-2xl font-bold text-sm">
              Découvrir les commerces
            </button>
          </div>
        ):(
          <>
            {cs&&<div className="flex items-center gap-2 bg-secondary border border-primary/20 rounded-2xl px-4 py-3">
              <Store size={16} className="text-primary"/><span className="text-sm font-bold text-primary">{cs.name}</span>
            </div>}
            <div className="bg-card rounded-2xl border border-border divide-y divide-border overflow-hidden">
              {cart.map(item=>(
                <div key={item.product.id} className="flex items-center gap-3 p-4">
                  <img src={item.product.image} alt={item.product.name} className="w-14 h-14 rounded-xl object-cover bg-muted flex-shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{item.product.name}</p>
                    <p className="text-primary font-black text-sm">{FMT(item.product.price*item.qty)}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-primary rounded-full px-3 py-1.5">
                    <button onClick={()=>removeFromCart(item.product.id)}><Minus size={13} className="text-white"/></button>
                    <span className="text-white font-black text-sm w-4 text-center">{item.qty}</span>
                    <button onClick={()=>addToCart(item.product)}><Plus size={13} className="text-white"/></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-card rounded-2xl border border-border p-4 space-y-2.5">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Sous-total</span><span className="font-bold">{FMT(cartTotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Livraison</span><span className="font-bold">{cs?FMT(cs.deliveryFee):"—"}</span></div>
              <div className="h-px bg-border"/>
              <div className="flex justify-between font-black text-lg" style={{fontFamily:DF}}><span>Total</span><span className="text-primary">{FMT(cartTotal+(cs?.deliveryFee??0))}</span></div>
            </div>
            <button onClick={()=>setView("checkout")}
              className="w-full bg-primary text-white py-4 rounded-2xl font-black shadow-xl active:scale-[0.97] transition-transform">
              Passer la commande →
            </button>
          </>
        )}
      </div>
    );
  };

  /* CHECKOUT */
  const renderCheckout=()=>{
    const cs=STORES.find(s=>s.id===cartStoreId);
    const pays:[PaymentMethod,React.ReactNode,string,string][]=[
      ["orange_money",<Smartphone size={20}/>,"Orange Money","Paiement mobile Orange"],
      ["airtel_money", <Smartphone size={20}/>,"Airtel Money","Paiement mobile Airtel"],
      ["cash",         <Banknote size={20}/>,"Espèces","Payer à la livraison"],
    ];
    const ready=!!(delivery.quartier&&delivery.adresse&&delivery.telephone);
    return(
      <div className="px-4 pt-4 pb-4 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={()=>setView("cart")} className="w-10 h-10 bg-card border border-border rounded-2xl flex items-center justify-center shadow-sm"><ChevronLeft size={18}/></button>
          <h1 className="font-black text-xl" style={{fontFamily:DF}}>Livraison</h1>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <h2 className="font-black text-sm" style={{fontFamily:DF}}>📍 Informations de livraison</h2>
          {[
            {label:"Nom complet",key:"nom",placeholder:"Jean-Baptiste Maïna"},
            {label:"Adresse *",key:"adresse",placeholder:"Rue, numéro…"},
            {label:"Repère",key:"repere",placeholder:"En face de…, à côté de…"},
            {label:"Téléphone *",key:"telephone",placeholder:"+236 72 01 23 45"},
          ].map(f=>(
            <div key={f.key}>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">{f.label}</label>
              <input value={(delivery as Record<string,string>)[f.key]||""} onChange={e=>setDelivery(p=>({...p,[f.key]:e.target.value}))}
                placeholder={f.placeholder} className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"/>
            </div>
          ))}
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1 block">Quartier *</label>
            <select value={delivery.quartier||""} onChange={e=>setDelivery(p=>({...p,quartier:e.target.value}))}
              className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 appearance-none">
              <option value="">Choisir un quartier</option>
              {QUARTIERS.map(q=><option key={q} value={q}>{q}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1 block">Note pour le commerçant</label>
            <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Allergies, préférences…"
              className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"/>
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 space-y-2">
          <h2 className="font-black text-sm mb-2" style={{fontFamily:DF}}>💳 Paiement</h2>
          {pays.map(([id,icon,label,sub])=>(
            <button key={id} onClick={()=>setPayment(id)}
              className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all ${payment===id?"border-primary bg-secondary shadow-sm":"border-border"}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${payment===id?"bg-primary text-white":"bg-muted text-muted-foreground"}`}>{icon}</div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-sm font-bold">{label}</p>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${payment===id?"border-primary bg-primary":"border-border"}`}>
                {payment===id&&<Check size={11} className="text-white"/>}
              </div>
            </button>
          ))}
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex justify-between items-center">
            <span className="font-black text-lg" style={{fontFamily:DF}}>Total à payer</span>
            <span className="font-black text-xl text-primary" style={{fontFamily:DF}}>{FMT(cartTotal+(cs?.deliveryFee??0))}</span>
          </div>
        </div>
        <button onClick={placeOrder} disabled={!ready}
          className={`w-full py-4 rounded-2xl font-black shadow-xl transition-all ${ready?"bg-primary text-white active:scale-[0.97]":"bg-muted text-muted-foreground opacity-60"}`}>
          ✓ Confirmer la commande
        </button>
      </div>
    );
  };

  /* ORDERS */
  const renderOrders=()=>(
    <div className="px-4 pt-4 space-y-4">
      <h1 className="font-black text-xl" style={{fontFamily:DF}}>Mes commandes</h1>
      {myOrders.length===0?(
        <div className="text-center py-20">
          <ClipboardList size={52} className="mx-auto text-muted-foreground/40 mb-4"/>
          <p className="font-bold text-base">Aucune commande pour le moment</p>
          <button onClick={()=>setView("home")} className="mt-4 bg-primary text-white px-6 py-2.5 rounded-2xl font-bold text-sm">Découvrir les restaurants</button>
        </div>
      ):(
        <div className="space-y-3">
          {myOrders.map(o=>(
            <div key={o.id} onClick={()=>{setActiveOrder(o);setView("order_detail");}}
              className="bg-card rounded-2xl border border-border p-4 cursor-pointer active:scale-[0.98] transition-transform space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-black text-base" style={{fontFamily:DF}}>{o.storeName}</p>
                  <p className="text-xs text-muted-foreground">{o.id} · {o.createdAt.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</p>
                </div>
                <Badge status={o.status}/>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
                <span className="text-muted-foreground">{o.items.reduce((s,i)=>s+i.qty,0)} article(s)</span>
                <span className="font-black text-sm text-primary">{FMT(o.total)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  /* ORDER DETAIL */
  const renderOrderDetail=()=>{
    if(!activeOrder)return null;
    return(
      <div className="px-4 pt-4 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={()=>setView("orders")} className="w-10 h-10 bg-card border border-border rounded-2xl flex items-center justify-center shadow-sm"><ChevronLeft size={18}/></button>
          <div>
            <h1 className="font-black text-lg leading-tight" style={{fontFamily:DF}}>{activeOrder.id}</h1>
            <p className="text-xs text-muted-foreground">{activeOrder.storeName}</p>
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5">
          <h2 className="font-black text-sm mb-4" style={{fontFamily:DF}}>Statut de la commande</h2>
          <StatusTracker status={activeOrder.status}/>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 space-y-2">
          <h2 className="font-black text-sm mb-2" style={{fontFamily:DF}}>Articles</h2>
          {activeOrder.items.map(item=>(
            <div key={item.product.id} className="flex items-center justify-between text-sm py-1">
              <span>{item.qty}× {item.product.name}</span>
              <span className="font-bold">{FMT(item.product.price*item.qty)}</span>
            </div>
          ))}
          <div className="h-px bg-border my-2"/>
          <div className="flex justify-between text-xs text-muted-foreground"><span>Sous-total</span><span>{FMT(activeOrder.subtotal)}</span></div>
          <div className="flex justify-between text-xs text-muted-foreground"><span>Livraison</span><span>{FMT(activeOrder.deliveryFee)}</span></div>
          <div className="flex justify-between font-black text-base pt-1" style={{fontFamily:DF}}><span>Total</span><span className="text-primary">{FMT(activeOrder.total)}</span></div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 space-y-1 text-xs">
          <h2 className="font-black text-sm mb-2" style={{fontFamily:DF}}>Livraison & Paiement</h2>
          <p><span className="text-muted-foreground">Adresse :</span> <strong>{activeOrder.delivery.adresse}, {activeOrder.delivery.quartier}</strong></p>
          <p><span className="text-muted-foreground">Paiement :</span> <strong>{PAY_LABELS[activeOrder.paymentMethod]}</strong></p>
          {activeOrder.driverName&&<p><span className="text-muted-foreground">Livreur :</span> <strong>{activeOrder.driverName}</strong></p>}
        </div>
      </div>
    );
  };

  /* FAVORITES */
  const renderFavorites=()=>{
    const favStores=STORES.filter(s=>favorites.includes(s.id));
    return(
      <div className="px-4 pt-4 space-y-4">
        <h1 className="font-black text-xl" style={{fontFamily:DF}}>Mes Favoris</h1>
        {favStores.length===0?(
          <div className="text-center py-20">
            <Heart size={52} className="mx-auto text-muted-foreground/40 mb-4"/>
            <p className="font-bold text-base">Aucun favori enregistré</p>
            <p className="text-xs text-muted-foreground mt-1">Ajoutez vos commerces préférés en cliquant sur le cœur</p>
          </div>
        ):(
          <div className="space-y-4 pb-4">
            {favStores.map(s=>(
              <StoreCard key={s.id} store={s} isFav={true} onFav={()=>toggleFav(s.id)} onClick={()=>{setActiveStore(s);setView("store");}}/>
            ))}
          </div>
        )}
      </div>
    );
  };

  /* PROFILE */
  const renderProfile=()=>(
    <div className="px-4 pt-4 space-y-4">
      <h1 className="font-black text-xl" style={{fontFamily:DF}}>Mon Profil</h1>
      <div className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center font-black text-2xl text-primary flex-shrink-0" style={{fontFamily:DF}}>
          {user.name.slice(0,2).toUpperCase()}
        </div>
        <div>
          <p className="font-black text-lg" style={{fontFamily:DF}}>{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
          <p className="text-xs text-muted-foreground">{user.telephone||"—"}</p>
        </div>
      </div>
      <div className="bg-card rounded-2xl border border-border divide-y divide-border overflow-hidden">
        {[
          {icon:<ClipboardList size={18}/>, label:"Mes commandes", count:myOrders.length, action:()=>setView("orders")},
          {icon:<Heart size={18}/>,         label:"Mes favoris",   count:favorites.length, action:()=>setView("favorites")},
          {icon:<Bell size={18}/>,          label:"Notifications",  count:unread,           action:()=>setShowNotif(true)},
          {icon:<Shield size={18}/>,        label:"Confidentialité & Sécurité", action:()=>{}},
        ].map(item=>(
          <button key={item.label} onClick={item.action}
            className="w-full flex items-center justify-between p-4 hover:bg-muted text-left transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-primary">{item.icon}</span>
              <span className="text-sm font-semibold">{item.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {item.count!==undefined&&item.count>0&&<span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">{item.count}</span>}
              <ChevronRight size={16} className="text-muted-foreground"/>
            </div>
          </button>
        ))}
      </div>
      <button onClick={onLogout}
        className="w-full bg-red-50 text-red-600 border border-red-200 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
        <LogOut size={16}/>Déconnexion
      </button>
    </div>
  );

  return(
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="flex-1 overflow-y-auto pb-24 scrollbar-hide">
        {view==="home"&&renderHome()}
        {view==="search"&&renderSearch()}
        {view==="store"&&renderStore()}
        {view==="cart"&&renderCart()}
        {view==="checkout"&&renderCheckout()}
        {view==="orders"&&renderOrders()}
        {view==="order_detail"&&renderOrderDetail()}
        {view==="favorites"&&renderFavorites()}
        {view==="profile"&&renderProfile()}
      </div>
      {showNotif&&<NotifPanel notifs={allNotifs} userId={user.id} onClose={()=>setShowNotif(false)} onRead={readNotif}/>}
      <ClientNav view={view} setView={setView} cartCount={cart.reduce((s,i)=>s+i.qty,0)} unread={unread}/>
    </div>
  );
}

/* ════════════════════════ MERCHANT APP ════════════════════════════════════ */
function MerchantApp({user,allOrders,setAllOrders,allProducts,setAllProducts,onLogout}:{
  user:AppUser;allOrders:Order[];setAllOrders:React.Dispatch<React.SetStateAction<Order[]>>;
  allProducts:Product[];setAllProducts:React.Dispatch<React.SetStateAction<Product[]>>;
  onLogout:()=>void;
}){
  const [view,setView]=useState<MerchantView>("dashboard");
  const [activeOrder,setActiveOrder]=useState<Order|null>(null);
  const [newProd,setNewProd]=useState({name:"",price:"",desc:"",cat:"",unit:"",stock:"10"});
  const myStore=STORES.find(s=>s.id===user.storeId)||STORES[0];
  const myOrders=allOrders.filter(o=>o.storeId===myStore.id);
  const myProds=allProducts.filter(p=>p.storeId===myStore.id);

  const revenue=myOrders.filter(o=>o.status==="livrée").reduce((s,o)=>s+o.subtotal,0);

  const updateStatus=(orderId:string,newStatus:OrderStatus)=>{
    setAllOrders(prev=>prev.map(o=>o.id===orderId?{...o,status:newStatus}:o));
    if(activeOrder&&activeOrder.id===orderId) setActiveOrder(p=>p?{...p,status:newStatus}:null);
  };

  const addProduct=()=>{
    if(!newProd.name||!newProd.price)return;
    const p:Product={id:`p-${Date.now()}`,storeId:myStore.id,name:newProd.name,price:Number(newProd.price),description:newProd.desc,image:PH("photo-1664992960082-0ea299a9c53e",400,300),available:true,category:newProd.cat||"Général",stock:Number(newProd.stock)||10,unit:newProd.unit};
    setAllProducts(prev=>[p,...prev]);
    setNewProd({name:"",price:"",desc:"",cat:"",unit:"",stock:"10"});
    setView("m_products");
  };

  const toggleProduct=(pid:string)=>{
    setAllProducts(prev=>prev.map(p=>p.id===pid?{...p,available:!p.available}:p));
  };

  const navItems:[MerchantView,React.ReactNode,string][]=[
    ["dashboard",<BarChart2 size={20}/>,"Tableau de bord"],
    ["m_orders",  <ClipboardList size={20}/>,"Commandes"],
    ["m_products",<Package size={20}/>,"Produits"],
    ["m_profile", <User size={20}/>,"Profil"],
  ];

  return(
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="bg-primary px-5 pt-12 pb-5 text-white flex items-center justify-between flex-shrink-0">
        <div>
          <span className="text-xs text-white/70 font-semibold bg-white/15 px-2.5 py-0.5 rounded-full">Espace Commerçant</span>
          <h1 className="text-xl font-black mt-1" style={{fontFamily:DF}}>{myStore.name}</h1>
        </div>
        <BDLogo size="sm" white/>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-20 space-y-4 scrollbar-hide">
        {view==="dashboard"&&(
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card p-4 rounded-2xl border border-border">
                <p className="text-xs text-muted-foreground">Revenus livrés</p>
                <p className="text-lg font-black text-primary mt-1" style={{fontFamily:DF}}>{FMT(revenue)}</p>
              </div>
              <div className="bg-card p-4 rounded-2xl border border-border">
                <p className="text-xs text-muted-foreground">Commandes</p>
                <p className="text-lg font-black text-foreground mt-1" style={{fontFamily:DF}}>{myOrders.length}</p>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-black text-sm" style={{fontFamily:DF}}>Commandes récentes</h2>
                <button onClick={()=>setView("m_orders")} className="text-primary text-xs font-bold">Voir tout →</button>
              </div>
              <div className="space-y-2">
                {myOrders.slice(0,3).map(o=>(
                  <div key={o.id} onClick={()=>{setActiveOrder(o);setView("m_order_detail");}}
                    className="flex items-center justify-between p-3 bg-muted rounded-xl cursor-pointer">
                    <div>
                      <p className="font-bold text-sm">{o.id} · {o.clientName}</p>
                      <p className="text-xs text-muted-foreground">{FMT(o.total)}</p>
                    </div>
                    <Badge status={o.status}/>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view==="m_orders"&&(
          <div className="space-y-3">
            <h2 className="font-black text-lg" style={{fontFamily:DF}}>Toutes les commandes</h2>
            {myOrders.map(o=>(
              <div key={o.id} onClick={()=>{setActiveOrder(o);setView("m_order_detail");}}
                className="bg-card rounded-2xl border border-border p-4 cursor-pointer space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-base" style={{fontFamily:DF}}>{o.id}</span>
                  <Badge status={o.status}/>
                </div>
                <p className="text-xs text-muted-foreground">Client : {o.clientName} ({o.delivery.telephone})</p>
                <p className="text-xs text-muted-foreground">{o.items.map(i=>`${i.qty}× ${i.product.name}`).join(", ")}</p>
                <div className="flex justify-between items-center pt-2 border-t border-border text-xs font-bold">
                  <span>Total :</span><span className="text-primary">{FMT(o.total)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {view==="m_order_detail"&&activeOrder&&(
          <div className="space-y-4">
            <button onClick={()=>setView("m_orders")} className="flex items-center gap-2 text-sm text-muted-foreground">
              <ChevronLeft size={16}/>Retour
            </button>
            <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="font-black text-lg" style={{fontFamily:DF}}>{activeOrder.id}</h2>
                <Badge status={activeOrder.status}/>
              </div>
              <div className="text-xs space-y-1">
                <p>Client : <strong>{activeOrder.clientName}</strong></p>
                <p>Téléphone : <strong>{activeOrder.delivery.telephone}</strong></p>
                <p>Adresse : <strong>{activeOrder.delivery.adresse}, {activeOrder.delivery.quartier}</strong></p>
              </div>
              <div className="border-t border-b border-border py-3 space-y-2">
                {activeOrder.items.map(i=>(
                  <div key={i.product.id} className="flex justify-between text-sm">
                    <span>{i.qty}× {i.product.name}</span>
                    <span className="font-bold">{FMT(i.product.price*i.qty)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-black text-base" style={{fontFamily:DF}}>
                <span>Total :</span><span className="text-primary">{FMT(activeOrder.total)}</span>
              </div>
              {/* Actions status */}
              <div className="space-y-2 pt-2">
                <p className="text-xs font-bold text-muted-foreground uppercase">Changer le statut :</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["acceptée","préparation","prête","annulée"] as OrderStatus[]).map(st=>(
                    <button key={st} onClick={()=>updateStatus(activeOrder.id,st)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${activeOrder.status===st?"bg-primary text-white border-primary":"bg-muted border-border"}`}>
                      {STATUS_CFG[st].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {view==="m_products"&&(
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-black text-lg" style={{fontFamily:DF}}>Produits ({myProds.length})</h2>
              <button onClick={()=>setView("add_product")} className="bg-primary text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1">
                <Plus size={14}/>Ajouter
              </button>
            </div>
            <div className="bg-card rounded-2xl border border-border divide-y divide-border overflow-hidden">
              {myProds.map(p=>(
                <div key={p.id} className="flex items-center gap-3 p-3">
                  <img src={p.image} alt={p.name} className="w-12 h-12 rounded-xl object-cover bg-muted flex-shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{p.name}</p>
                    <p className="text-xs text-primary font-black">{FMT(p.price)}</p>
                  </div>
                  <button onClick={()=>toggleProduct(p.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold ${p.available?"bg-emerald-100 text-emerald-700":"bg-red-100 text-red-700"}`}>
                    {p.available?"Disponible":"Masqué"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {view==="add_product"&&(
          <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
            <button onClick={()=>setView("m_products")} className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <ChevronLeft size={16}/>Annuler
            </button>
            <h2 className="font-black text-lg" style={{fontFamily:DF}}>Nouveau produit</h2>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">Nom du produit *</label>
              <input value={newProd.name} onChange={e=>setNewProd(p=>({...p,name:e.target.value}))} placeholder="ex: Brochettes Poulet" className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none"/>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">Prix (FCFA) *</label>
              <input type="number" value={newProd.price} onChange={e=>setNewProd(p=>({...p,price:e.target.value}))} placeholder="1500" className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none"/>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">Catégorie</label>
              <input value={newProd.cat} onChange={e=>setNewProd(p=>({...p,cat:e.target.value}))} placeholder="ex: Plats principaux" className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none"/>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">Description</label>
              <textarea value={newProd.desc} onChange={e=>setNewProd(p=>({...p,desc:e.target.value}))} placeholder="Ingrédients, portion…" className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none h-20"/>
            </div>
            <button onClick={addProduct} className="w-full bg-primary text-white py-3.5 rounded-2xl font-black shadow-lg">
              Ajouter le produit
            </button>
          </div>
        )}

        {view==="m_profile"&&(
          <div className="space-y-4">
            <h2 className="font-black text-lg" style={{fontFamily:DF}}>Profil Commerçant</h2>
            <div className="bg-card rounded-2xl border border-border p-5 space-y-2">
              <p className="font-black text-base" style={{fontFamily:DF}}>{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
              <p className="text-xs text-muted-foreground">{myStore.address}</p>
            </div>
            <button onClick={onLogout} className="w-full bg-red-50 text-red-600 border border-red-200 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2">
              <LogOut size={16}/>Déconnexion
            </button>
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm bg-card border-t border-border z-40 flex">
        {navItems.map(([v,icon,label])=>(
          <button key={v} onClick={()=>setView(v)}
            className={`flex-1 flex flex-col items-center py-3 gap-1 text-[10px] font-bold ${view===v?"text-primary":"text-muted-foreground"}`}>
            {icon}<span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

/* ════════════════════════ DRIVER APP ═══════════════════════════════════════ */
function DriverApp({user,allOrders,setAllOrders,onLogout}:{
  user:AppUser;allOrders:Order[];setAllOrders:React.Dispatch<React.SetStateAction<Order[]>>;
  onLogout:()=>void;
}){
  const [view,setView]=useState<DriverView>("d_available");
  const [activeCourse,setActiveCourse]=useState<Order|null>(null);

  const readyOrders=allOrders.filter(o=>o.status==="prête"&&!o.driverId);
  const myCourses=allOrders.filter(o=>o.driverId===user.id);
  const totalEarnings=myCourses.filter(o=>o.status==="livrée").reduce((s,o)=>s+o.deliveryFee,0);

  const acceptCourse=(order:Order)=>{
    setAllOrders(prev=>prev.map(o=>o.id===order.id?{...o,driverId:user.id,driverName:user.name,status:"livraison"}:o));
    setActiveCourse({...order,driverId:user.id,driverName:user.name,status:"livraison"});
    setView("d_course");
  };

  const completeCourse=(orderId:string)=>{
    setAllOrders(prev=>prev.map(o=>o.id===orderId?{...o,status:"livrée"}:o));
    setActiveCourse(null);
    setView("d_available");
  };

  return(
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="bg-primary px-5 pt-12 pb-5 text-white flex items-center justify-between flex-shrink-0">
        <div>
          <span className="text-xs text-white/70 font-semibold bg-white/15 px-2.5 py-0.5 rounded-full">Espace Livreur</span>
          <h1 className="text-xl font-black mt-1" style={{fontFamily:DF}}>{user.name}</h1>
        </div>
        <BDLogo size="sm" white/>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-20 space-y-4 scrollbar-hide">
        {view==="d_available"&&(
          <div className="space-y-4">
            <div className="bg-card p-4 rounded-2xl border border-border flex justify-between items-center">
              <div>
                <p className="text-xs text-muted-foreground">Gains accumulés</p>
                <p className="text-xl font-black text-primary" style={{fontFamily:DF}}>{FMT(totalEarnings)}</p>
              </div>
              <Bike size={32} className="text-primary"/>
            </div>

            <h2 className="font-black text-lg" style={{fontFamily:DF}}>Courses disponibles ({readyOrders.length})</h2>
            {readyOrders.length===0?(
              <div className="text-center py-16 text-muted-foreground text-sm">
                Aucune course disponible actuellement. En attente de nouvelles commandes…
              </div>
            ):(
              readyOrders.map(o=>(
                <div key={o.id} className="bg-card rounded-2xl border border-border p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-base" style={{fontFamily:DF}}>{o.storeName}</span>
                    <span className="text-xs font-black bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">+{FMT(o.deliveryFee)}</span>
                  </div>
                  <div className="text-xs space-y-1 text-muted-foreground">
                    <p>📍 Retrait : {o.storeName}</p>
                    <p>🏠 Livraison : {o.delivery.adresse}, {o.delivery.quartier}</p>
                  </div>
                  <button onClick={()=>acceptCourse(o)}
                    className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm shadow-md active:scale-[0.98]">
                    Accepter la course
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {view==="d_course"&&activeCourse&&(
          <div className="space-y-4">
            <h2 className="font-black text-lg" style={{fontFamily:DF}}>Course en cours</h2>
            <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-black text-lg" style={{fontFamily:DF}}>{activeCourse.id}</span>
                <span className="text-xs font-bold text-primary bg-secondary px-3 py-1 rounded-full">En route</span>
              </div>
              <div className="space-y-2 text-sm border-t border-b border-border py-3">
                <p>🏪 <strong>Commerçant :</strong> {activeCourse.storeName}</p>
                <p>👤 <strong>Client :</strong> {activeCourse.clientName}</p>
                <p>📞 <strong>Téléphone :</strong> <a href={`tel:${activeCourse.delivery.telephone}`} className="text-primary underline">{activeCourse.delivery.telephone}</a></p>
                <p>📍 <strong>Adresse :</strong> {activeCourse.delivery.adresse}, {activeCourse.delivery.quartier}</p>
                {activeCourse.delivery.repere&&<p>💡 <strong>Repère :</strong> {activeCourse.delivery.repere}</p>}
              </div>
              <button onClick={()=>completeCourse(activeCourse.id)}
                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-base shadow-lg">
                ✓ Marquer comme livrée
              </button>
            </div>
          </div>
        )}

        {view==="d_history"&&(
          <div className="space-y-3">
            <h2 className="font-black text-lg" style={{fontFamily:DF}}>Historique des courses</h2>
            {myCourses.map(o=>(
              <div key={o.id} className="bg-card rounded-2xl border border-border p-4 flex justify-between items-center">
                <div>
                  <p className="font-bold text-sm">{o.id} · {o.storeName}</p>
                  <p className="text-xs text-muted-foreground">{o.delivery.quartier}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-emerald-600 text-sm">+{FMT(o.deliveryFee)}</p>
                  <Badge status={o.status}/>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm bg-card border-t border-border z-40 flex">
        {[
          ["d_available",<Bike size={20}/>,"Disponibles"],
          ["d_history",  <ClipboardList size={20}/>,"Historique"],
        ].map(([v,icon,label])=>(
          <button key={v} onClick={()=>setView(v as DriverView)}
            className={`flex-1 flex flex-col items-center py-3 gap-1 text-[10px] font-bold ${view===v?"text-primary":"text-muted-foreground"}`}>
            {icon}<span>{label}</span>
          </button>
        ))}
        <button onClick={onLogout} className="flex-1 flex flex-col items-center py-3 gap-1 text-[10px] font-bold text-red-500">
          <LogOut size={20}/><span>Déconnexion</span>
        </button>
      </nav>
    </div>
  );
}

/* ════════════════════════ ADMIN APP ═══════════════════════════════════════ */
function AdminApp({user,allOrders,onLogout}:{user:AppUser;allOrders:Order[];onLogout:()=>void}){
  const [view,setView]=useState<AdminView>("a_stats");
  const totalRev=allOrders.filter(o=>o.status==="livrée").reduce((s,o)=>s+o.total,0);

  const chartData=[
    {name:"Lun",ventes:12000}, {name:"Mar",ventes:19000}, {name:"Mer",ventes:15000},
    {name:"Jeu",ventes:22000}, {name:"Ven",ventes:31000}, {name:"Sam",ventes:42000}, {name:"Dim",ventes:38000},
  ];

  return(
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="bg-primary px-5 pt-12 pb-5 text-white flex items-center justify-between flex-shrink-0">
        <div>
          <span className="text-xs text-white/70 font-semibold bg-white/15 px-2.5 py-0.5 rounded-full">Administration</span>
          <h1 className="text-xl font-black mt-1" style={{fontFamily:DF}}>Bangui Direct Admin</h1>
        </div>
        <BDLogo size="sm" white/>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-20 space-y-4 scrollbar-hide">
        {view==="a_stats"&&(
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card p-4 rounded-2xl border border-border">
                <p className="text-xs text-muted-foreground">Volume total</p>
                <p className="text-lg font-black text-primary mt-1" style={{fontFamily:DF}}>{FMT(totalRev)}</p>
              </div>
              <div className="bg-card p-4 rounded-2xl border border-border">
                <p className="text-xs text-muted-foreground">Total commandes</p>
                <p className="text-lg font-black mt-1" style={{fontFamily:DF}}>{allOrders.length}</p>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border p-4">
              <h2 className="font-black text-sm mb-3" style={{fontFamily:DF}}>Activité hebdomadaire</h2>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={10}/>
                    <YAxis stroke="#888888" fontSize={10}/>
                    <Tooltip/>
                    <Bar dataKey="ventes" fill="#1A6B45" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {view==="a_orders"&&(
          <div className="space-y-3">
            <h2 className="font-black text-lg" style={{fontFamily:DF}}>Toutes les commandes ({allOrders.length})</h2>
            {allOrders.map(o=>(
              <div key={o.id} className="bg-card rounded-2xl border border-border p-4 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-black text-sm" style={{fontFamily:DF}}>{o.id} · {o.storeName}</span>
                  <Badge status={o.status}/>
                </div>
                <p className="text-xs text-muted-foreground">Client : {o.clientName}</p>
                <p className="text-xs font-bold text-primary">{FMT(o.total)}</p>
              </div>
            ))}
          </div>
        )}

        {view==="a_shops"&&(
          <div className="space-y-3">
            <h2 className="font-black text-lg" style={{fontFamily:DF}}>Commerces partenaires ({STORES.length})</h2>
            {STORES.map(s=>(
              <div key={s.id} className="bg-card rounded-2xl border border-border p-4 flex justify-between items-center">
                <div>
                  <p className="font-bold text-sm">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.category} · {s.quartier}</p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${s.isOpen?"bg-emerald-100 text-emerald-700":"bg-red-100 text-red-700"}`}>
                  {s.isOpen?"Ouvert":"Fermé"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm bg-card border-t border-border z-40 flex">
        {[
          ["a_stats", <BarChart2 size={20}/>,"Stats"],
          ["a_orders",<ClipboardList size={20}/>,"Commandes"],
          ["a_shops", <Store size={20}/>,"Commerces"],
        ].map(([v,icon,label])=>(
          <button key={v} onClick={()=>setView(v as AdminView)}
            className={`flex-1 flex flex-col items-center py-3 gap-1 text-[10px] font-bold ${view===v?"text-primary":"text-muted-foreground"}`}>
            {icon}<span>{label}</span>
          </button>
        ))}
        <button onClick={onLogout} className="flex-1 flex flex-col items-center py-3 gap-1 text-[10px] font-bold text-red-500">
          <LogOut size={20}/><span>Déconnexion</span>
        </button>
      </nav>
    </div>
  );
}

/* ════════════════════════════ MAIN APP ═════════════════════════════════════ */
export default function App() {
  const [phase,setPhase]=useState<Phase>("splash");
  const [user,setUser]=useState<AppUser|null>(null);
  const [selectedAccType,setSelectedAccType]=useState<AccountType>("personal");
  const [regError,setRegError]=useState("");
  const [pendingUser,setPendingUser]=useState<{name:string;phone:string;email:string;pwd:string}|null>(null);

  const [allOrders,setAllOrders]=useState<Order[]>(SEED_ORDERS);
  const [allNotifs,setAllNotifs]=useState<Notif[]>(SEED_NOTIFS);
  const [allProducts,setAllProducts]=useState<Product[]>(INIT_PRODUCTS);

  const handleRegisterSubmit=async(data:{name:string;phone:string;email:string;pwd:string})=>{
    setRegError("");
    try{
      const role:UserRole=selectedAccType==="merchant_pro"?"merchant":selectedAccType==="driver_pro"?"driver":"client";
      const {token,user:newUser}=await AuthAPI.register(data.name,data.email,data.pwd,role,data.phone,selectedAccType);
      setAuthToken(token);
      setUser({id:newUser.id,name:newUser.name,email:newUser.email,role:newUser.role,storeId:newUser.storeId,telephone:newUser.telephone,accountType:newUser.accountType});
      setPendingUser(data);
      setPhase("otp");
    }catch(e:any){
      setRegError(e?.message||"Une erreur est survenue lors de l'inscription.");
    }
  };

  const handleLogout=()=>{
    setUser(null);
    setAuthToken(null);
    setPhase("auth_choice");
  };

  return (
    <div className="w-full h-screen bg-neutral-900 flex items-center justify-center font-sans antialiased select-none">
      <div className="w-full max-w-sm h-full max-h-[844px] bg-background text-foreground shadow-2xl relative overflow-hidden sm:rounded-[2.5rem] sm:border-8 sm:border-neutral-800">
        {phase==="splash"&&<SplashScreen onDone={()=>setPhase("onboarding")}/>}
        {phase==="onboarding"&&<OnboardingScreen onDone={()=>setPhase("auth_choice")}/>}
        {phase==="auth_choice"&&<AuthChoiceScreen onLogin={()=>setPhase("login")} onRegister={()=>setPhase("account_type")}/>}
        {phase==="login"&&<LoginScreen onLogin={(u)=>{setUser(u);setPhase("app");}} onBack={()=>setPhase("auth_choice")} onRegister={()=>setPhase("account_type")}/>}
        {phase==="account_type"&&<AccountTypeScreen onSelect={(t)=>{setSelectedAccType(t);setRegError("");setPhase("register");}} onBack={()=>setPhase("auth_choice")}/>}
        {phase==="register"&&<RegisterScreen accountType={selectedAccType} onSubmit={handleRegisterSubmit} onBack={()=>setPhase("account_type")} initialError={regError}/>}
        {phase==="otp"&&<OTPScreen phone={pendingUser?.phone||"+236 72 00 00 00"} onVerify={()=>setPhase("app")} onBack={()=>setPhase("register")}/>}

        {phase==="app"&&user&&(
          <>
            {user.role==="client"&&<ClientApp user={user} allOrders={allOrders} setAllOrders={setAllOrders} allNotifs={allNotifs} setAllNotifs={setAllNotifs} allProducts={allProducts} onLogout={handleLogout}/>}
            {user.role==="merchant"&&<MerchantApp user={user} allOrders={allOrders} setAllOrders={setAllOrders} allProducts={allProducts} setAllProducts={setAllProducts} onLogout={handleLogout}/>}
            {user.role==="driver"&&<DriverApp user={user} allOrders={allOrders} setAllOrders={setAllOrders} onLogout={handleLogout}/>}
            {user.role==="admin"&&<AdminApp user={user} allOrders={allOrders} onLogout={handleLogout}/>}
          </>
        )}
      </div>
    </div>
  );
}
