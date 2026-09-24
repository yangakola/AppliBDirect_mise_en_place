import { useState, useEffect, useRef, createContext, useContext } from "react";
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
import { AuthAPI, StoresAPI, ProductsAPI, OrdersAPI, NotificationsAPI, AdminAPI, setAuthToken, getAuthToken } from "../lib/api";

/* ════════════════════════════════ TYPES ════════════════════════════════════ */
type Phase = "splash"|"wait"|"setup"|"onboarding"|"auth_choice"|"login"|"account_type"|"register"|"otp"|"app";
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

/* ══════════════════════════ DATA LAYER (API) ══════════════════════════════ */
const StoresCtx=createContext<Store[]>([]);
const UsersCtx=createContext<AppUser[]>([]);
const toDate=(v:any):Date=>{const t=String(v||"");return new Date(t.includes("T")?t:t.replace(" ","T")+"Z");};
const toAppUser=(u:any):AppUser=>({id:u.id,name:u.name,email:u.email,role:u.role,storeId:u.storeId??u.store_id??undefined,telephone:u.telephone??undefined,avatar:u.avatar??undefined,accountType:u.accountType??u.account_type??undefined});
function mapOrder(o:any,prods:Product[]):Order{
  return {...o,createdAt:toDate(o.createdAt),
    items:(o.items||[]).map((it:any)=>({product:prods.find(p=>p.id===it.productId)||{id:it.productId,storeId:o.storeId,name:it.name,price:it.price,description:"",image:"",available:true,category:"",stock:0},qty:it.qty}))};
}
const fileToDataUrl=(f:File,max=640):Promise<string>=>new Promise((res,rej)=>{
  const img=new Image();const url=URL.createObjectURL(f);
  img.onload=()=>{const k=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement("canvas");c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);
    c.getContext("2d")!.drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);res(c.toDataURL("image/jpeg",0.72));};
  img.onerror=()=>{URL.revokeObjectURL(url);rej(new Error("Image illisible"));};img.src=url;
});
const INPUT_CLS="w-full bg-muted rounded-xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all";
function Field({label,children}:{label:string;children:React.ReactNode}){
  return(<div><label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">{label}</label>{children}</div>);
}

function WaitScreen({error,onRetry}:{error:boolean;onRetry:()=>void}){
  return(
    <div className="fixed inset-0 bg-primary flex flex-col items-center justify-center gap-4 px-8 text-center text-white">
      {error?(
        <>
          <AlertCircle size={40}/>
          <p className="font-bold">Impossible de joindre le serveur</p>
          <p className="text-white/70 text-sm">Vérifiez votre connexion Internet puis réessayez.</p>
          <button onClick={onRetry} className="bg-white text-primary font-bold px-6 py-3 rounded-2xl">Réessayer</button>
        </>
      ):(
        <>
          <div className="w-10 h-10 border-white border-t-transparent rounded-full animate-spin" style={{borderWidth:"3px"}}/>
          <p className="font-bold">Connexion au serveur…</p>
          <p className="text-white/70 text-sm">Le premier démarrage peut prendre quelques secondes.</p>
        </>
      )}
    </div>
  );
}

function SetupScreen({requiresCode,onDone}:{requiresCode:boolean;onDone:(u:AppUser)=>void}){
  const [code,setCode]=useState("");const [name,setName]=useState("");const [email,setEmail]=useState("");
  const [pwd,setPwd]=useState("");const [pwd2,setPwd2]=useState("");
  const [err,setErr]=useState("");const [loading,setLoading]=useState(false);
  const submit=async()=>{
    if(!name.trim()||!email.trim()||!pwd||(requiresCode&&!code.trim())){setErr("Merci de remplir tous les champs.");return;}
    if(pwd!==pwd2){setErr("Les deux mots de passe ne correspondent pas.");return;}
    setErr("");setLoading(true);
    try{
      const {token,user}=await AuthAPI.setupAdmin({setupCode:code.trim(),name:name.trim(),email:email.trim(),password:pwd});
      setAuthToken(token);
      onDone(toAppUser(user));
    }catch(e:any){setErr(e?.message||"Erreur lors de la création du compte.");setLoading(false);}
  };
  return(
    <div className="h-full flex flex-col bg-background">
      <div className="bg-primary text-white px-6 pt-12 pb-8">
        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-4"><Shield size={26} className="text-primary"/></div>
        <h1 className="text-2xl font-black" style={{fontFamily:DF}}>Bienvenue 👋</h1>
        <p className="text-white/80 text-sm mt-1">Créez le compte administrateur pour démarrer l'application.</p>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
        {requiresCode&&(<Field label="Code d'installation"><input value={code} onChange={e=>setCode(e.target.value)} placeholder="Code reçu du déploiement" autoCapitalize="off" className={INPUT_CLS}/></Field>)}
        <Field label="Nom complet"><input value={name} onChange={e=>setName(e.target.value)} placeholder="Votre nom" className={INPUT_CLS}/></Field>
        <Field label="Email"><input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="admin@email.com" className={INPUT_CLS}/></Field>
        <Field label="Mot de passe"><input value={pwd} onChange={e=>setPwd(e.target.value)} type="password" placeholder="8+ car., majuscule, chiffre, symbole" className={INPUT_CLS}/></Field>
        <Field label="Confirmer le mot de passe"><input value={pwd2} onChange={e=>setPwd2(e.target.value)} type="password" placeholder="••••••••" className={INPUT_CLS}/></Field>
        {err&&<p className="text-sm text-red-600 font-semibold">{err}</p>}
        <button onClick={submit} disabled={loading} className={`w-full py-4 rounded-2xl font-bold text-sm shadow-lg ${loading?"bg-primary/60 text-white":"bg-primary text-white active:scale-[0.97]"}`}>{loading?"Création…":"Créer le compte administrateur"}</button>
        <p className="text-xs text-muted-foreground text-center pt-1">Cet écran n'apparaît qu'une seule fois, tant qu'aucun administrateur n'existe.</p>
      </div>
    </div>
  );
}

function CreateStoreScreen({user,onCreated,onLogout}:{user:AppUser;onCreated:(store:Store,token:string)=>void;onLogout:()=>void}){
  const [f,setF]=useState({name:"",type:"restaurant" as StoreType,category:"",quartier:QUARTIERS[0],address:"",openHours:"08h–20h",deliveryFee:"500",description:""});
  const [err,setErr]=useState("");const [loading,setLoading]=useState(false);
  const set=(k:string,v:string)=>setF(p=>({...p,[k]:v}));
  const submit=async()=>{
    if(!f.name.trim()||!f.category.trim()){setErr("Le nom et la catégorie sont obligatoires.");return;}
    setErr("");setLoading(true);
    try{
      const {store,token}=await StoresAPI.create({name:f.name.trim(),type:f.type,category:f.category.trim(),quartier:f.quartier,address:f.address.trim(),openHours:f.openHours.trim(),deliveryFee:Number(f.deliveryFee)||500,description:f.description.trim()});
      onCreated(store,token);
    }catch(e:any){setErr(e?.message||"Impossible de créer la boutique.");setLoading(false);}
  };
  return(
    <div className="h-full flex flex-col bg-background">
      <div className="bg-primary text-white px-6 pt-12 pb-6">
        <h1 className="text-2xl font-black" style={{fontFamily:DF}}>Créez votre boutique</h1>
        <p className="text-white/80 text-sm mt-1">Bonjour {user.name.split(" ")[0]} ! Renseignez votre commerce pour recevoir des commandes.</p>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
        <Field label="Nom du commerce"><input value={f.name} onChange={e=>set("name",e.target.value)} className={INPUT_CLS}/></Field>
        <Field label="Type"><select value={f.type} onChange={e=>set("type",e.target.value)} className={INPUT_CLS}>
          <option value="restaurant">Restaurant</option><option value="pharmacie">Pharmacie</option><option value="marche">Marché</option><option value="boutique">Boutique</option><option value="express">Express</option>
        </select></Field>
        <Field label="Catégorie"><input value={f.category} onChange={e=>set("category",e.target.value)} placeholder="Ex : Grillades, Mode…" className={INPUT_CLS}/></Field>
        <Field label="Quartier"><select value={f.quartier} onChange={e=>set("quartier",e.target.value)} className={INPUT_CLS}>{QUARTIERS.map(q=><option key={q}>{q}</option>)}</select></Field>
        <Field label="Adresse"><input value={f.address} onChange={e=>set("address",e.target.value)} className={INPUT_CLS}/></Field>
        <Field label="Horaires"><input value={f.openHours} onChange={e=>set("openHours",e.target.value)} className={INPUT_CLS}/></Field>
        <Field label="Frais de livraison (FCFA)"><input value={f.deliveryFee} onChange={e=>set("deliveryFee",e.target.value)} inputMode="numeric" className={INPUT_CLS}/></Field>
        <Field label="Description"><textarea value={f.description} onChange={e=>set("description",e.target.value)} rows={3} className={INPUT_CLS}/></Field>
        {err&&<p className="text-sm text-red-600 font-semibold">{err}</p>}
        <button onClick={submit} disabled={loading} className={`w-full py-4 rounded-2xl font-bold text-sm shadow-lg ${loading?"bg-primary/60 text-white":"bg-primary text-white active:scale-[0.97]"}`}>{loading?"Création…":"Créer ma boutique"}</button>
        <button onClick={onLogout} className="w-full text-sm text-muted-foreground py-2">Se déconnecter</button>
      </div>
    </div>
  );
}

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

  const handleGoogleCredential=async(response:any)=>{
    setErr("");setLoading(true);
    try{
      const {token,user}=await AuthAPI.google(response.credential);
      setAuthToken(token);
      setLoading(false);
      onLogin({id:user.id,name:user.name,email:user.email,role:user.role,storeId:user.storeId,telephone:user.telephone,accountType:user.accountType});
    }catch(e:any){
      setLoading(false);
      setErr(e?.message||"Connexion Google impossible.");
    }
  };

  useEffect(()=>{
    const clientId=(import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
    if(!clientId) return;
    let interval:any;
    const init=()=>{
      const w=window as any;
      if(w.google?.accounts?.id){
        w.google.accounts.id.initialize({client_id:clientId,callback:handleGoogleCredential});
        const el=document.getElementById("google-signin-btn");
        if(el){el.innerHTML="";w.google.accounts.id.renderButton(el,{theme:"outline",size:"large",width:320,text:"continue_with"});}
        clearInterval(interval);
      }
    };
    interval=setInterval(init,200);
    init();
    return ()=>clearInterval(interval);
  },[]);

  const socialLogin=(provider:string)=>{
    setErr("La connexion via "+provider+" n'est pas encore disponible. Utilisez votre email et mot de passe.");
  };


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
          <div id="google-signin-btn" className="w-full flex justify-center min-h-[44px]"/>
          {[
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
  const STORES=useContext(StoresCtx);
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

  const p=PROMOS[promoIdx];

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
      {myOrders.length===0&&(
        <div className="text-center py-20">
          <ClipboardList size={52} className="mx-auto text-muted-foreground/40 mb-4"/>
          <p className="font-bold text-base">Aucune commande</p>
          <p className="text-muted-foreground text-sm mt-1">Passez votre première commande !</p>
          <button onClick={()=>setView("home")} className="mt-5 bg-primary text-white px-6 py-3 rounded-2xl font-bold text-sm">Commander maintenant</button>
        </div>
      )}
      <div className="space-y-3 pb-4">
        {myOrders.map(o=>(
          <button key={o.id} onClick={()=>{setActiveOrder(o);setView("order_detail");}}
            className="w-full bg-card border border-border rounded-2xl p-4 text-left shadow-sm active:scale-[0.99] transition-transform">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-black text-sm" style={{fontFamily:DF}}>{o.storeName}</p>
                <p className="text-muted-foreground text-xs mt-0.5">{o.id} · {o.items.length} article{o.items.length>1?"s":""}</p>
              </div>
              <Badge status={o.status}/>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              <span className="text-xs text-muted-foreground">{o.createdAt.toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"})}</span>
              <span className="font-black text-primary" style={{fontFamily:DF}}>{FMT(o.total)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  /* ORDER DETAIL */
  const renderOrderDetail=()=>{
    const o=activeOrder;
    if(!o)return(<div className="px-4 pt-4 text-center py-16 text-muted-foreground">Commande introuvable</div>);
    return(
      <div className="px-4 pt-4 pb-4 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={()=>setView("orders")} className="w-10 h-10 bg-card border border-border rounded-2xl flex items-center justify-center shadow-sm"><ChevronLeft size={18}/></button>
          <div className="flex-1">
            <h1 className="font-black text-base" style={{fontFamily:DF}}>{o.id}</h1>
            <p className="text-xs text-muted-foreground">{o.storeName}</p>
          </div>
          <Badge status={o.status}/>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-black text-sm mb-4" style={{fontFamily:DF}}>Suivi en temps réel</h2>
          <StatusTracker status={o.status}/>
        </div>
        {o.driverName&&(
          <div className="bg-secondary border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center"><Bike size={22} className="text-white"/></div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Votre livreur</p>
              <p className="font-black text-sm" style={{fontFamily:DF}}>{o.driverName}</p>
            </div>
            <a href={`tel:${user.telephone}`} className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow"><Phone size={16} className="text-white"/></a>
          </div>
        )}
        <div className="bg-card border border-border rounded-2xl p-4">
          <h2 className="font-black text-sm mb-3" style={{fontFamily:DF}}>Articles</h2>
          {o.items.map(i=>(
            <div key={i.product.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-sm">{i.qty}× {i.product.name}</span>
              <span className="text-sm font-bold">{FMT(i.product.price*i.qty)}</span>
            </div>
          ))}
          <div className="flex justify-between mt-3 pt-3 border-t border-border font-black" style={{fontFamily:DF}}>
            <span>Total</span><span className="text-primary">{FMT(o.total)}</span>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <h2 className="font-black text-sm mb-1" style={{fontFamily:DF}}>Livraison</h2>
          <p className="text-sm flex items-center gap-2"><MapPin size={14} className="text-primary flex-shrink-0"/>{o.delivery.quartier} · {o.delivery.adresse}</p>
          {o.delivery.repere&&<p className="text-xs text-muted-foreground ml-5">{o.delivery.repere}</p>}
          <p className="text-sm flex items-center gap-2"><Phone size={14} className="text-primary flex-shrink-0"/>{o.delivery.telephone}</p>
          <p className="text-sm flex items-center gap-2"><Smartphone size={14} className="text-primary flex-shrink-0"/>{PAY_LABELS[o.paymentMethod]}</p>
        </div>
      </div>
    );
  };

  /* FAVORITES */
  const renderFavorites=()=>{
    const faves=STORES.filter(s=>favorites.includes(s.id));
    return(
      <div className="px-4 pt-4 space-y-4">
        <h1 className="font-black text-xl" style={{fontFamily:DF}}>Mes favoris</h1>
        {faves.length===0&&(
          <div className="text-center py-20">
            <Heart size={52} className="mx-auto text-muted-foreground/40 mb-4"/>
            <p className="font-bold text-base">Aucun favori</p>
            <p className="text-muted-foreground text-sm mt-1">Appuyez sur ❤️ pour ajouter un commerce</p>
            <button onClick={()=>setView("home")} className="mt-5 bg-primary text-white px-6 py-3 rounded-2xl font-bold text-sm">Explorer</button>
          </div>
        )}
        <div className="space-y-4 pb-4">
          {faves.map(s=>(
            <StoreCard key={s.id} store={s} isFav={true} onFav={()=>toggleFav(s.id)}
              onClick={()=>{setActiveStore(s);setView("store");}}/>
          ))}
        </div>
      </div>
    );
  };

  /* PROFILE */
  const renderProfile=()=>(
    <div className="px-4 pt-4 pb-4 space-y-4">
      <h1 className="font-black text-xl" style={{fontFamily:DF}}>Mon profil</h1>
      <div className="bg-primary rounded-2xl p-5 flex items-center gap-4">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
          <User size={30} className="text-white"/>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-white text-base truncate" style={{fontFamily:DF}}>{user.name}</p>
          <p className="text-white/70 text-sm">{user.email}</p>
          {user.telephone&&<p className="text-white/70 text-xs mt-0.5">{user.telephone}</p>}
          <span className="mt-1.5 inline-block bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            {user.accountType==="personal"?"👤 Compte Personnel":"Compte Client"}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          {label:"Commandes",val:String(myOrders.length),icon:<ClipboardList size={18}/>,color:"text-blue-600",bg:"bg-blue-50"},
          {label:"Favoris",val:String(favorites.length),icon:<Heart size={18}/>,color:"text-red-500",bg:"bg-red-50"},
          {label:"Livrées",val:String(myOrders.filter(o=>o.status==="livrée").length),icon:<CheckCircle size={18}/>,color:"text-emerald-600",bg:"bg-emerald-50"},
        ].map(c=>(
          <div key={c.label} className="bg-card border border-border rounded-2xl p-4 text-center">
            <div className={`w-8 h-8 ${c.bg} rounded-xl flex items-center justify-center mx-auto mb-2 ${c.color}`}>{c.icon}</div>
            <p className="font-black text-lg" style={{fontFamily:DF}}>{c.val}</p>
            <p className="text-muted-foreground text-xs">{c.label}</p>
          </div>
        ))}
      </div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {[
          {icon:<Bell size={18}/>,label:"Notifications",sub:"Paramétrer les alertes"},
          {icon:<MapPin size={18}/>,label:"Mes adresses",sub:"Gérer les adresses de livraison"},
          {icon:<Shield size={18}/>,label:"Sécurité",sub:"Mot de passe, confidentialité"},
          {icon:<Smartphone size={18}/>,label:"Modes de paiement",sub:"Orange Money, Airtel Money"},
        ].map((item,i)=>(
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-0 active:bg-muted transition-colors cursor-pointer">
            <div className="w-9 h-9 bg-muted rounded-xl flex items-center justify-center flex-shrink-0 text-muted-foreground">{item.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.sub}</p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground flex-shrink-0"/>
          </div>
        ))}
      </div>
      <button onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-500 border border-red-200 py-4 rounded-2xl font-bold active:scale-[0.97] transition-transform">
        <LogOut size={18}/>Se déconnecter
      </button>
    </div>
  );

  return(
    <div className="relative h-full overflow-hidden">
      <div className="h-full overflow-y-auto pb-20 scrollbar-hide">
        {view==="home"         && renderHome()}
        {view==="search"       && renderSearch()}
        {view==="store"        && renderStore()}
        {view==="cart"         && renderCart()}
        {view==="checkout"     && renderCheckout()}
        {view==="orders"       && renderOrders()}
        {view==="order_detail" && renderOrderDetail()}
        {view==="favorites"    && renderFavorites()}
        {view==="profile"      && renderProfile()}
      </div>
      <ClientNav view={view} setView={setView} cartCount={cart.length} unread={unread}/>
      {showNotif&&<NotifPanel notifs={allNotifs} userId={user.id} onClose={()=>setShowNotif(false)} onRead={readNotif}/>}
    </div>
  );
}

/* ═══════════════════════════ MERCHANT APP ══════════════════════════════════ */
function MerchantApp({user,allOrders,setAllOrders,allNotifs,allProducts,setAllProducts,onLogout}:{
  user:AppUser;allOrders:Order[];setAllOrders:React.Dispatch<React.SetStateAction<Order[]>>;
  allNotifs:Notif[];allProducts:Product[];setAllProducts:React.Dispatch<React.SetStateAction<Product[]>>;
  onLogout:()=>void;
}){
  const STORES=useContext(StoresCtx);
  const [view,setView]=useState<MerchantView>("dashboard");
  const [selectedOrder,setSelectedOrder]=useState<Order|null>(null);
  const [showNotif,setShowNotif]=useState(false);
  const [mTab,setMTab]=useState<OrderStatus|"all">("nouvelle");
  const fileRef=useRef<HTMLInputElement>(null);
  const [preview,setPreview]=useState("");
  const [newP,setNewP]=useState({name:"",price:"",description:"",category:"",stock:""});

  const store=STORES.find(s=>s.id===user.storeId);
  const myOrders=allOrders.filter(o=>o.storeId===user.storeId);
  const unread=allNotifs.filter(n=>n.userId===user.id&&!n.read).length;
  const storeProds=allProducts.filter(p=>p.storeId===user.storeId);
  const today=new Date();
  const todayOrders=myOrders.filter(o=>o.createdAt.toDateString()===today.toDateString());
  const todayRev=todayOrders.filter(o=>o.status==="livrée").reduce((s,o)=>s+o.total,0);
  const pending=myOrders.filter(o=>["nouvelle","acceptée","préparation"].includes(o.status)).length;

  const updateStatus=(id:string,s:OrderStatus)=>{
    setAllOrders(prev=>prev.map(o=>o.id===id?{...o,status:s}:o));
    if(selectedOrder?.id===id)setSelectedOrder(p=>p?{...p,status:s}:p);
  };
  const toggleAvail=(pid:string)=>setAllProducts(prev=>prev.map(p=>p.id===pid?{...p,available:!p.available}:p));
  const setStock=(pid:string,stock:number)=>setAllProducts(prev=>prev.map(p=>p.id===pid?{...p,stock}:p));

  const weekData=["L","M","M","J","V","S","D"].map((d,i)=>({jour:d,cmd:Math.floor(Math.random()*12+2)}));

  const items:[MerchantView,React.ReactNode,string][]=[
    ["dashboard",  <Activity size={20}/>,    "Tableau"],
    ["m_orders",   <ClipboardList size={20}/>,"Commandes"],
    ["m_products", <Package size={20}/>,     "Produits"],
    ["add_product",<PlusCircle size={20}/>,  "Ajouter"],
    ["m_profile",  <User size={20}/>,        "Profil"],
  ];

  /* DASHBOARD */
  const renderDash=()=>(
    <div className="px-4 pt-4 pb-4 space-y-5">
      <div className="flex items-center justify-between">
        <div><p className="text-xs text-muted-foreground">Tableau de bord</p><h1 className="font-black text-xl" style={{fontFamily:DF}}>Bonjour, {user.name.split(" ")[0]} 👋</h1></div>
        <div className="flex gap-2">
          <button onClick={()=>setShowNotif(true)} className="relative w-10 h-10 bg-card border border-border rounded-2xl flex items-center justify-center shadow-sm">
            <Bell size={18}/>
            {unread>0&&<span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-card">{unread}</span>}
          </button>
          <BDLogo size="sm"/>
        </div>
      </div>
      {store&&(
        <div className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border ${store.isOpen?"bg-emerald-50 border-emerald-200":"bg-red-50 border-red-200"}`}>
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${store.isOpen?"bg-emerald-500 animate-pulse":"bg-red-400"}`}/>
          <div className="flex-1">
            <p className="font-black text-sm" style={{fontFamily:DF}}>{store.name}</p>
            <p className={`text-xs ${store.isOpen?"text-emerald-600":"text-red-500"}`}>{store.isOpen?"Ouvert":"Fermé"} · {store.openHours}</p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground"/>
        </div>
      )}
      {pending>0&&(
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0"><AlertCircle size={20} className="text-amber-600"/></div>
          <div className="flex-1">
            <p className="font-black text-sm text-amber-700" style={{fontFamily:DF}}>{pending} commande{pending>1?"s":""} en attente</p>
            <p className="text-xs text-amber-600">Action requise</p>
          </div>
          <button onClick={()=>{setMTab("nouvelle");setView("m_orders");}} className="bg-amber-500 text-white text-xs font-bold px-3 py-2 rounded-xl">Voir</button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {[
          {label:"Commandes aujourd'hui",val:String(todayOrders.length),icon:<ClipboardList size={20}/>,color:"text-blue-600",bg:"bg-blue-50"},
          {label:"Revenus du jour",val:FMT(todayRev),icon:<DollarSign size={20}/>,color:"text-emerald-600",bg:"bg-emerald-50"},
          {label:"En attente",val:String(pending),icon:<AlertCircle size={20}/>,color:"text-amber-600",bg:"bg-amber-50"},
          {label:"Produits actifs",val:String(storeProds.filter(p=>p.available).length),icon:<Package size={20}/>,color:"text-violet-600",bg:"bg-violet-50"},
        ].map(c=>(
          <div key={c.label} className="bg-card border border-border rounded-2xl p-4">
            <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center mb-3 ${c.color}`}>{c.icon}</div>
            <p className="font-black text-xl leading-tight" style={{fontFamily:DF}}>{c.val}</p>
            <p className="text-muted-foreground text-xs mt-0.5 leading-tight">{c.label}</p>
          </div>
        ))}
      </div>
      <div className="bg-card border border-border rounded-2xl p-4">
        <h2 className="font-black text-sm mb-4" style={{fontFamily:DF}}>Commandes — 7 jours</h2>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={weekData} barSize={22}>
            <XAxis dataKey="jour" tick={{fontSize:12}} axisLine={false} tickLine={false}/>
            <YAxis hide/>
            <Tooltip formatter={(v:number)=>[`${v} cmd`,""]} contentStyle={{borderRadius:"12px",fontSize:"12px",border:"none",boxShadow:"0 4px 20px rgba(0,0,0,0.1)"}}/>
            <Bar dataKey="cmd" fill="#1A6B45" radius={[6,6,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-sm" style={{fontFamily:DF}}>Commandes récentes</h2>
          <button onClick={()=>setView("m_orders")} className="text-primary text-xs font-bold">Tout voir →</button>
        </div>
        <div className="space-y-2">
          {myOrders.slice(0,3).map(o=>(
            <button key={o.id} onClick={()=>{setSelectedOrder(o);setView("m_order_detail");}}
              className="w-full bg-card border border-border rounded-2xl p-4 text-left flex items-center gap-3 active:scale-[0.99] transition-transform">
              <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center flex-shrink-0"><Package size={18} className="text-muted-foreground"/></div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{o.id} · {o.clientName.split(" ")[0]}</p>
                <p className="text-xs text-muted-foreground">{o.items.length} article{o.items.length>1?"s":""} · {FMT(o.total)}</p>
              </div>
              <Badge status={o.status}/>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  /* ORDERS */
  const renderOrders=()=>{
    const tabs:[OrderStatus|"all",string][]=[["all","Tout"],["nouvelle","Nouvelles"],["acceptée","Acceptées"],["préparation","Préparation"],["prête","Prêtes"],["livrée","Livrées"]];
    const filtered=mTab==="all"?myOrders:myOrders.filter(o=>o.status===mTab);
    return(
      <div className="pt-4 pb-4">
        <h1 className="font-black text-xl px-4 mb-3" style={{fontFamily:DF}}>Commandes</h1>
        <div className="flex gap-2 px-4 overflow-x-auto scrollbar-hide pb-2">
          {tabs.map(([s,l])=>(
            <button key={s} onClick={()=>setMTab(s)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-all ${mTab===s?"bg-primary text-white border-primary":"bg-card text-foreground border-border"}`}>
              {l}{s!=="all"&&` (${myOrders.filter(o=>o.status===s).length})`}
            </button>
          ))}
        </div>
        <div className="px-4 mt-3 space-y-3">
          {filtered.length===0&&<p className="text-center text-muted-foreground py-10 text-sm">Aucune commande</p>}
          {filtered.map(o=>(
            <button key={o.id} onClick={()=>{setSelectedOrder(o);setView("m_order_detail");}}
              className="w-full bg-card border border-border rounded-2xl p-4 text-left shadow-sm active:scale-[0.99] transition-transform">
              <div className="flex items-start justify-between gap-2">
                <div><p className="font-black text-sm" style={{fontFamily:DF}}>{o.id}</p><p className="text-muted-foreground text-xs">{o.clientName} · {o.delivery.quartier}</p></div>
                <Badge status={o.status}/>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground">{o.items.length} art. · {PAY_LABELS[o.paymentMethod]}</span>
                <span className="font-black text-primary text-sm" style={{fontFamily:DF}}>{FMT(o.total)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  /* ORDER DETAIL */
  const renderOrderDetail=()=>{
    const o=selectedOrder;if(!o)return null;
    const actions:[OrderStatus,string][]=[];
    if(o.status==="nouvelle")    actions.push(["acceptée","✓ Accepter la commande"]);
    if(o.status==="acceptée")    actions.push(["préparation","🍳 Commencer la préparation"]);
    if(o.status==="préparation") actions.push(["prête","✅ Marquer comme prête"]);
    return(
      <div className="px-4 pt-4 pb-4 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={()=>setView("m_orders")} className="w-10 h-10 bg-card border border-border rounded-2xl flex items-center justify-center shadow-sm"><ChevronLeft size={18}/></button>
          <div className="flex-1"><h1 className="font-black text-base" style={{fontFamily:DF}}>{o.id}</h1><p className="text-xs text-muted-foreground">{o.createdAt.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</p></div>
          <Badge status={o.status}/>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 space-y-2.5">
          <h2 className="font-black text-sm" style={{fontFamily:DF}}>👤 Client</h2>
          <p className="flex items-center gap-2 text-sm"><User size={14} className="text-primary flex-shrink-0"/>{o.clientName}</p>
          <p className="flex items-center gap-2 text-sm"><MapPin size={14} className="text-primary flex-shrink-0"/>{o.delivery.quartier} · {o.delivery.adresse}</p>
          {o.delivery.repere&&<p className="text-xs text-muted-foreground ml-5">{o.delivery.repere}</p>}
          <p className="flex items-center gap-2 text-sm"><Phone size={14} className="text-primary flex-shrink-0"/>{o.delivery.telephone}</p>
          <p className="flex items-center gap-2 text-sm"><Smartphone size={14} className="text-primary flex-shrink-0"/>{PAY_LABELS[o.paymentMethod]}</p>
          {o.note&&<p className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 rounded-xl p-2.5 mt-1"><AlertCircle size={14} className="flex-shrink-0 mt-0.5"/>Note : {o.note}</p>}
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <h2 className="font-black text-sm mb-3" style={{fontFamily:DF}}>🛍️ Articles</h2>
          {o.items.map(i=>(
            <div key={i.product.id} className="flex justify-between items-center py-2.5 border-b border-border last:border-0">
              <span className="text-sm">{i.qty}× {i.product.name}</span>
              <span className="text-sm font-bold">{FMT(i.product.price*i.qty)}</span>
            </div>
          ))}
          <div className="flex justify-between mt-3 pt-3 border-t border-border font-black" style={{fontFamily:DF}}>
            <span>Total</span><span className="text-primary">{FMT(o.total)}</span>
          </div>
        </div>
        {actions.map(([s,l])=>(
          <button key={s} onClick={()=>updateStatus(o.id,s)}
            className="w-full bg-primary text-white py-4 rounded-2xl font-black shadow-lg active:scale-[0.97] transition-transform">
            {l}
          </button>
        ))}
        {o.status==="prête"&&<div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center"><CheckCircle size={28} className="mx-auto text-emerald-600 mb-2"/><p className="text-emerald-700 font-bold text-sm">Commande prête — En attente d'un livreur</p></div>}
        {o.status==="livraison"&&<div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center gap-3"><Bike size={22} className="text-primary flex-shrink-0"/><p className="text-primary font-bold text-sm">{o.driverName} est en route</p></div>}
        {o.status==="livrée"&&<div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center"><CheckCircle size={28} className="mx-auto text-green-600 mb-2 fill-green-100"/><p className="text-green-700 font-bold">Commande livrée avec succès ✓</p></div>}
        {!["livrée","livraison","prête"].includes(o.status)&&o.status!=="annulée"&&(
          <button onClick={()=>updateStatus(o.id,"annulée")} className="w-full border border-red-200 text-red-500 py-3 rounded-2xl text-sm font-bold">Annuler la commande</button>
        )}
      </div>
    );
  };

  /* PRODUCTS */
  const renderProducts=()=>(
    <div className="px-4 pt-4 pb-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-black text-xl" style={{fontFamily:DF}}>Mes produits</h1>
        <button onClick={()=>setView("add_product")} className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm"><Plus size={14}/>Ajouter</button>
      </div>
      {storeProds.map(p=>(
        <div key={p.id} className="bg-card border border-border rounded-2xl p-4 flex gap-3">
          <img src={p.image} alt={p.name} className="w-16 h-16 rounded-xl object-cover bg-muted flex-shrink-0"/>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-bold text-sm leading-tight flex-1 truncate">{p.name}</p>
              <span className={`text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0 ${p.available?"bg-emerald-50 text-emerald-600":"bg-red-50 text-red-500"}`}>
                {p.available?"Actif":"Inactif"}
              </span>
            </div>
            <p className="text-primary font-black text-sm mt-0.5">{FMT(p.price)}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">Stock :</span>
              <button onClick={()=>setStock(p.id,Math.max(0,p.stock-1))} className="w-6 h-6 bg-muted rounded-lg flex items-center justify-center active:scale-90"><Minus size={11}/></button>
              <span className={`text-xs font-black w-6 text-center ${p.stock<5?"text-amber-600":""}`}>{p.stock}</span>
              <button onClick={()=>setStock(p.id,p.stock+1)} className="w-6 h-6 bg-muted rounded-lg flex items-center justify-center active:scale-90"><Plus size={11}/></button>
              {p.stock<5&&<span className="text-amber-600 text-xs font-bold">⚠ Stock bas</span>}
            </div>
            <button onClick={()=>toggleAvail(p.id)} className={`mt-1.5 flex items-center gap-1.5 text-xs font-bold ${p.available?"text-emerald-600":"text-muted-foreground"}`}>
              {p.available?<ToggleRight size={18}/>:<ToggleLeft size={18}/>}{p.available?"Désactiver":"Activer"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  /* ADD PRODUCT */
  const renderAddProduct=()=>{
    const save=()=>{
      if(!newP.name||!newP.price)return;
      setAllProducts(prev=>[...prev,{id:`p${Date.now()}`,storeId:user.storeId||"",name:newP.name,price:Number(newP.price),description:newP.description,image:preview||PH("photo-1664992960082-0ea299a9c53e",400,300),available:true,category:newP.category||"Produits",stock:Number(newP.stock)||10}]);
      setNewP({name:"",price:"",description:"",category:"",stock:""});setPreview("");setView("m_products");
    };
    return(
      <div className="px-4 pt-4 pb-4 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={()=>setView("m_products")} className="w-10 h-10 bg-card border border-border rounded-2xl flex items-center justify-center shadow-sm"><ChevronLeft size={18}/></button>
          <h1 className="font-black text-xl" style={{fontFamily:DF}}>Ajouter un produit</h1>
        </div>
        <button onClick={()=>fileRef.current?.click()}
          className="w-full h-48 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-3 bg-muted/50 overflow-hidden active:scale-[0.98] transition-transform">
          {preview?<img src={preview} alt="aperçu" className="w-full h-full object-cover"/>:
            <><Camera size={32} className="text-muted-foreground"/><p className="text-muted-foreground text-sm font-bold">Ajouter une photo</p><p className="text-muted-foreground text-xs">JPG, PNG · Max 5 MB</p></>}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)fileToDataUrl(f).then(setPreview).catch(()=>{});}}/>
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          {([["Nom du produit *","name","Gozo et Sauce Feuilles","text"],["Prix (FCFA) *","price","1500","number"],["Description","description","Courte description…","text"],["Catégorie","category","Plats principaux, Jus…","text"],["Stock initial","stock","20","number"]] as [string,string,string,string][]).map(([label,key,ph,type])=>(
            <div key={key}>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">{label}</label>
              <input type={type} value={(newP as Record<string,string>)[key]||""} onChange={e=>setNewP(p=>({...p,[key]:e.target.value}))} placeholder={ph}
                className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"/>
            </div>
          ))}
        </div>
        <button onClick={save} className="w-full bg-primary text-white py-4 rounded-2xl font-black shadow-lg active:scale-[0.97] transition-transform">
          Enregistrer le produit
        </button>
      </div>
    );
  };

  /* PROFILE */
  const renderProfile=()=>(
    <div className="px-4 pt-4 pb-4 space-y-4">
      <h1 className="font-black text-xl" style={{fontFamily:DF}}>Mon profil</h1>
      <div className="bg-primary rounded-2xl p-5 flex items-center gap-4">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center"><Store size={30} className="text-white"/></div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-white text-base" style={{fontFamily:DF}}>{user.name}</p>
          <p className="text-white/70 text-sm">{user.email}</p>
          {store&&<p className="text-white/90 text-xs font-bold mt-1">🏪 {store.name}</p>}
          <span className="mt-1.5 inline-block bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full">Compte Commerçant Pro</span>
        </div>
      </div>
      {store&&(
        <div className="bg-card border border-border rounded-2xl p-4 space-y-2.5">
          <h2 className="font-black text-sm" style={{fontFamily:DF}}>Ma boutique</h2>
          <p className="text-sm flex items-center gap-2"><MapPin size={14} className="text-primary"/>{store.address}</p>
          <p className="text-sm flex items-center gap-2"><Clock size={14} className="text-primary"/>{store.openHours}</p>
          <p className="text-sm flex items-center gap-2"><Star size={14} className="fill-amber-400 text-amber-400"/>{store.rating} · {store.ratingCount} avis</p>
        </div>
      )}
      <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-500 border border-red-200 py-4 rounded-2xl font-bold active:scale-[0.97]"><LogOut size={18}/>Se déconnecter</button>
    </div>
  );

  return(
    <div className="relative h-full overflow-hidden">
      <div className="h-full overflow-y-auto pb-20 scrollbar-hide">
        {view==="dashboard"      && renderDash()}
        {view==="m_orders"       && renderOrders()}
        {view==="m_order_detail" && renderOrderDetail()}
        {view==="m_products"     && renderProducts()}
        {view==="add_product"    && renderAddProduct()}
        {view==="m_profile"      && renderProfile()}
      </div>
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm bg-card/95 backdrop-blur border-t border-border shadow-2xl z-40">
        <div className="flex items-stretch">
          {items.map(([v,icon,label])=>{
            const active=view===v;
            return(
              <button key={v} onClick={()=>setView(v)}
                className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 relative transition-colors ${active?"text-primary":"text-muted-foreground"}`}>
                {active&&<div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full"/>}
                {icon}<span className={`text-[10px] font-semibold ${active?"text-primary":""}`}>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
      {showNotif&&<NotifPanel notifs={allNotifs} userId={user.id} onClose={()=>setShowNotif(false)} onRead={()=>{}}/>}
    </div>
  );
}

/* ═══════════════════════════ DRIVER APP ════════════════════════════════════ */
function DriverApp({user,allOrders,setAllOrders,allNotifs,onLogout}:{
  user:AppUser;allOrders:Order[];setAllOrders:React.Dispatch<React.SetStateAction<Order[]>>;
  allNotifs:Notif[];onLogout:()=>void;
}){
  const STORES=useContext(StoresCtx);
  const [view,setView]=useState<DriverView>("d_available");
  const [isOnline,setIsOnline]=useState(true);
  const [showNotif,setShowNotif]=useState(false);

  const available=allOrders.filter(o=>o.status==="prête"&&!o.driverId);
  const activeCourse=allOrders.find(o=>o.driverId===user.id&&o.status==="livraison");
  const history=allOrders.filter(o=>o.driverId===user.id&&o.status==="livrée");
  const unread=allNotifs.filter(n=>n.userId===user.id&&!n.read).length;
  const totalGains=history.reduce((s,o)=>s+Math.round(o.deliveryFee*0.65),0);

  const accept=(id:string)=>{setAllOrders(prev=>prev.map(o=>o.id===id?{...o,status:"livraison",driverId:user.id,driverName:user.name}:o));setView("d_course");};
  const confirm=(id:string)=>{setAllOrders(prev=>prev.map(o=>o.id===id?{...o,status:"livrée"}:o));setView("d_history");};

  const navItems:[DriverView,React.ReactNode,string][]=[
    ["d_available",<Package size={20}/>,     "Courses"],
    ["d_course",   <Navigation size={20}/>,  "En cours"],
    ["d_history",  <ClipboardList size={20}/>,"Historique"],
    ["d_earnings", <DollarSign size={20}/>,  "Gains"],
  ];
  const weekGains=[
    {j:"L",g:4200},{j:"M",g:6500},{j:"M",g:3800},{j:"J",g:7200},{j:"V",g:5100},{j:"S",g:9400},{j:"D",g:2800},
  ];

  const renderAvailable=()=>(
    <div className="px-4 pt-4 pb-4 space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="font-black text-xl" style={{fontFamily:DF}}>Courses disponibles</h1><p className="text-xs text-muted-foreground">{available.length} prête{available.length!==1?"s":""}</p></div>
        <div className="flex gap-2">
          <button onClick={()=>setShowNotif(true)} className="relative w-10 h-10 bg-card border border-border rounded-2xl flex items-center justify-center shadow-sm">
            <Bell size={18}/>
            {unread>0&&<span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-card">{unread}</span>}
          </button>
        </div>
      </div>
      <button onClick={()=>setIsOnline(v=>!v)}
        className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border font-black transition-all ${isOnline?"bg-emerald-50 border-emerald-200 text-emerald-700":"bg-muted border-border text-muted-foreground"}`}>
        <span className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isOnline?"bg-emerald-500 animate-pulse":"bg-gray-400"}`}/>
          <span style={{fontFamily:DF}}>{isOnline?"En ligne — Je prends des courses":"Hors ligne"}</span>
        </span>
        {isOnline?<ToggleRight size={28} className="text-emerald-600"/>:<ToggleLeft size={28}/>}
      </button>
      {!isOnline&&<div className="text-center py-14"><Bike size={48} className="mx-auto text-muted-foreground/40 mb-3"/><p className="font-bold text-base">Vous êtes hors ligne</p><p className="text-muted-foreground text-sm mt-1">Passez en ligne pour voir les courses</p></div>}
      {isOnline&&available.length===0&&<div className="text-center py-14"><Package size={48} className="mx-auto text-muted-foreground/40 mb-3"/><p className="font-bold text-base">Aucune course disponible</p><p className="text-muted-foreground text-sm mt-1">Vous serez notifié dès qu'une commande est prête</p></div>}
      {isOnline&&available.map(o=>{
        const s=STORES.find(st=>st.id===o.storeId);
        return(
          <div key={o.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-primary/5 border-b border-border px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs font-bold text-primary">{o.id}</span>
              <span className="text-xs text-muted-foreground">{o.createdAt.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</span>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div><p className="font-black text-base" style={{fontFamily:DF}}>{o.storeName}</p><p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin size={10}/>{s?.quartier} → {o.delivery.quartier}</p></div>
                <div className="bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl text-center">
                  <p className="text-emerald-700 font-black text-base" style={{fontFamily:DF}}>+{FMT(Math.round(o.deliveryFee*0.65))}</p>
                  <p className="text-emerald-600 text-xs">vos gains</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 bg-muted rounded-xl px-3 py-2"><Package size={11}/>{o.items.length} article{o.items.length>1?"s":""}</span>
                <span className="flex items-center gap-1 bg-muted rounded-xl px-3 py-2"><Banknote size={11}/>{PAY_LABELS[o.paymentMethod]}</span>
              </div>
              <button onClick={()=>accept(o.id)} className="w-full bg-primary text-white py-3.5 rounded-xl font-black shadow-md active:scale-[0.97] transition-transform">
                🏍️ Accepter cette course
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderCourse=()=>{
    if(!activeCourse)return(
      <div className="px-4 pt-4 text-center py-16"><Navigation size={48} className="mx-auto text-muted-foreground/40 mb-3"/><p className="font-bold text-base">Aucune course active</p><button onClick={()=>setView("d_available")} className="mt-4 text-primary font-bold text-sm">Voir les courses disponibles</button></div>
    );
    const o=activeCourse;const s=STORES.find(st=>st.id===o.storeId);
    return(
      <div className="px-4 pt-4 pb-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-black text-xl" style={{fontFamily:DF}}>Course en cours</h1>
          <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1.5 rounded-full">{o.id}</span>
        </div>
        {/* Map */}
        <div className="h-52 bg-gradient-to-br from-primary/10 to-emerald-50 rounded-2xl overflow-hidden relative border border-border">
          <svg viewBox="0 0 320 200" className="w-full h-full">
            <rect width="320" height="200" fill="#edf4f0"/>
            <line x1="0" y1="100" x2="320" y2="100" stroke="#c8ddd0" strokeWidth="2.5"/>
            <line x1="0" y1="60" x2="320" y2="60" stroke="#c8ddd0" strokeWidth="1.5"/>
            <line x1="0" y1="140" x2="320" y2="140" stroke="#c8ddd0" strokeWidth="1.5"/>
            <line x1="80" y1="0" x2="80" y2="200" stroke="#c8ddd0" strokeWidth="1.5"/>
            <line x1="160" y1="0" x2="160" y2="200" stroke="#c8ddd0" strokeWidth="2.5"/>
            <line x1="240" y1="0" x2="240" y2="200" stroke="#c8ddd0" strokeWidth="1.5"/>
            <path d="M80 60 Q160 80 240 140" stroke="#1A6B45" strokeWidth="3" fill="none" strokeDasharray="8 4" strokeLinecap="round"/>
            <circle cx="80" cy="60" r="13" fill="#1A6B45" opacity="0.2"/>
            <circle cx="80" cy="60" r="10" fill="#1A6B45"/>
            <text x="80" y="64" textAnchor="middle" fontSize="11" fill="white" fontWeight="700">P</text>
            <circle cx="240" cy="140" r="13" fill="#F59E0B" opacity="0.2"/>
            <circle cx="240" cy="140" r="10" fill="#F59E0B"/>
            <text x="240" y="144" textAnchor="middle" fontSize="11" fill="white" fontWeight="700">C</text>
          </svg>
          <div className="absolute bottom-3 left-3 right-3 flex gap-2">
            <div className="bg-card rounded-xl px-3 py-2 shadow-md flex items-center gap-2 flex-1">
              <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center"><span className="text-white text-[9px] font-black">P</span></div>
              <span className="text-xs font-bold truncate">{s?.name}</span>
            </div>
            <div className="bg-card rounded-xl px-3 py-2 shadow-md flex items-center gap-2 flex-1">
              <div className="w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center"><span className="text-white text-[9px] font-black">C</span></div>
              <span className="text-xs font-bold truncate">{o.delivery.quartier}</span>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 space-y-2.5">
          <h2 className="font-black text-sm" style={{fontFamily:DF}}>👤 Client à livrer</h2>
          <p className="flex items-center gap-2 text-sm"><User size={14} className="text-primary"/>{o.clientName}</p>
          <p className="flex items-center gap-2 text-sm"><MapPin size={14} className="text-primary"/>{o.delivery.quartier} · {o.delivery.adresse}</p>
          {o.delivery.repere&&<p className="text-xs text-muted-foreground ml-5">{o.delivery.repere}</p>}
          <div className="flex gap-2 mt-2">
            <a href={`tel:${o.delivery.telephone}`} className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl font-bold text-sm shadow active:scale-95"><Phone size={15}/>Appeler</a>
            <button className="flex-1 flex items-center justify-center gap-2 bg-muted text-foreground py-3 rounded-xl font-bold text-sm"><Navigation size={15}/>Navigation</button>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <h2 className="font-black text-sm mb-2" style={{fontFamily:DF}}>🏪 Récupérer chez</h2>
          <p className="flex items-center gap-2 text-sm"><Store size={14} className="text-primary"/>{o.storeName}</p>
          <p className="flex items-center gap-2 text-xs text-muted-foreground mt-1"><MapPin size={11}/>{s?.address}</p>
          <p className="text-xs text-muted-foreground mt-1">{o.items.length} article{o.items.length>1?"s":""} · {FMT(o.total)}</p>
        </div>
        <button onClick={()=>confirm(o.id)}
          className="w-full bg-primary text-white py-4 rounded-2xl font-black shadow-xl active:scale-[0.97] transition-transform flex items-center justify-center gap-2">
          <CheckCircle size={20}/>Confirmer la livraison
        </button>
      </div>
    );
  };

  const renderHistory=()=>(
    <div className="px-4 pt-4 pb-4 space-y-3">
      <h1 className="font-black text-xl" style={{fontFamily:DF}}>Historique</h1>
      {history.length===0&&<div className="text-center py-14"><ClipboardList size={48} className="mx-auto text-muted-foreground/40 mb-3"/><p className="font-bold">Aucune livraison effectuée</p></div>}
      {history.map(o=>(
        <div key={o.id} className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-start justify-between gap-2">
            <div><p className="font-black text-sm" style={{fontFamily:DF}}>{o.storeName}</p><p className="text-xs text-muted-foreground">{o.id} · {o.delivery.quartier}</p></div>
            <span className="text-emerald-600 font-black text-base" style={{fontFamily:DF}}>+{FMT(Math.round(o.deliveryFee*0.65))}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">{o.createdAt.toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"})}</p>
        </div>
      ))}
    </div>
  );

  const renderEarnings=()=>(
    <div className="px-4 pt-4 pb-4 space-y-5">
      <h1 className="font-black text-xl" style={{fontFamily:DF}}>Mes gains</h1>
      <div className="bg-primary rounded-2xl p-6 text-center">
        <p className="text-white/70 text-sm">Total cumulé</p>
        <p className="text-white text-4xl font-black mt-1" style={{fontFamily:DF}}>{FMT(totalGains)}</p>
        <div className="flex justify-center gap-6 mt-4">
          <div className="text-center"><p className="text-white font-black text-xl" style={{fontFamily:DF}}>{history.length}</p><p className="text-white/60 text-xs">Livraisons</p></div>
          <div className="w-px bg-white/20"/>
          <div className="text-center"><p className="text-white font-black text-xl" style={{fontFamily:DF}}>65%</p><p className="text-white/60 text-xs">Votre part</p></div>
          <div className="w-px bg-white/20"/>
          <div className="text-center"><p className="text-white font-black text-xl" style={{fontFamily:DF}}>{FMT(Math.round(totalGains*0.12))}</p><p className="text-white/60 text-xs">Aujourd'hui</p></div>
        </div>
      </div>
      <div className="bg-card border border-border rounded-2xl p-4">
        <h2 className="font-black text-sm mb-4" style={{fontFamily:DF}}>Gains — 7 derniers jours</h2>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={weekGains} barSize={24}>
            <XAxis dataKey="j" tick={{fontSize:12}} axisLine={false} tickLine={false}/>
            <YAxis hide/>
            <Tooltip formatter={(v:number)=>[`${v.toLocaleString("fr-FR")} FCFA`,""]} contentStyle={{borderRadius:"12px",fontSize:"12px",border:"none",boxShadow:"0 4px 20px rgba(0,0,0,0.1)"}}/>
            <Bar dataKey="g" fill="#1A6B45" radius={[6,6,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-500 border border-red-200 py-4 rounded-2xl font-bold"><LogOut size={18}/>Se déconnecter</button>
    </div>
  );

  return(
    <div className="relative h-full overflow-hidden">
      <div className="h-full overflow-y-auto pb-20 scrollbar-hide">
        {view==="d_available"&&renderAvailable()}
        {view==="d_course"&&renderCourse()}
        {view==="d_history"&&renderHistory()}
        {view==="d_earnings"&&renderEarnings()}
      </div>
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm bg-card/95 backdrop-blur border-t border-border shadow-2xl z-40">
        <div className="flex items-stretch">
          {navItems.map(([v,icon,label])=>{
            const active=view===v;
            return(
              <button key={v} onClick={()=>setView(v)} className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 relative transition-colors ${active?"text-primary":"text-muted-foreground"}`}>
                {active&&<div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full"/>}
                {icon}<span className={`text-[10px] font-semibold ${active?"text-primary":""}`}>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
      {showNotif&&<NotifPanel notifs={allNotifs} userId={user.id} onClose={()=>setShowNotif(false)} onRead={()=>{}}/>}
    </div>
  );
}

/* ═══════════════════════════ ADMIN APP ═════════════════════════════════════ */
function AdminApp({user,allOrders,allNotifs,allProducts,onLogout}:{
  user:AppUser;allOrders:Order[];allNotifs:Notif[];allProducts:Product[];onLogout:()=>void;
}){
  const STORES=useContext(StoresCtx);const USERS=useContext(UsersCtx);
  const [view,setView]=useState<AdminView>("a_stats");
  const storeData=STORES.map(s=>({name:s.name.split(" ").slice(0,2).join(" "),cmd:allOrders.filter(o=>o.storeId===s.id).length}));
  const navItems:[AdminView,React.ReactNode,string][]=[
    ["a_stats",  <BarChart2 size={20}/>,    "Stats"],
    ["a_orders", <ClipboardList size={20}/>,"Commandes"],
    ["a_shops",  <Store size={20}/>,        "Commerces"],
    ["a_clients",<Users size={20}/>,        "Clients"],
    ["a_drivers",<Bike size={20}/>,         "Livreurs"],
  ];

  const renderStats=()=>(
    <div className="px-4 pt-4 pb-4 space-y-5">
      <div className="flex items-center justify-between">
        <div><p className="text-xs text-muted-foreground">Administration</p><h1 className="font-black text-xl" style={{fontFamily:DF}}>Tableau de bord</h1></div>
        <BDLogo size="sm"/>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          {label:"Total commandes",val:String(allOrders.length),icon:<ClipboardList size={20}/>,color:"text-blue-600",bg:"bg-blue-50"},
          {label:"Chiffre d'affaires",val:FMT(allOrders.filter(o=>o.status==="livrée").reduce((t,o)=>t+o.total,0)),icon:<DollarSign size={20}/>,color:"text-emerald-600",bg:"bg-emerald-50"},
          {label:"Commerces actifs",val:String(STORES.filter(s=>s.isOpen).length)+"/"+String(STORES.length),icon:<Store size={20}/>,color:"text-primary",bg:"bg-secondary"},
          {label:"Utilisateurs",val:String(USERS.length),icon:<Users size={20}/>,color:"text-violet-600",bg:"bg-violet-50"},
        ].map(c=>(
          <div key={c.label} className="bg-card border border-border rounded-2xl p-4">
            <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center mb-3 ${c.color}`}>{c.icon}</div>
            <p className="font-black text-lg leading-tight" style={{fontFamily:DF}}>{c.val}</p>
            <p className="text-muted-foreground text-xs mt-0.5 leading-tight">{c.label}</p>
          </div>
        ))}
      </div>
      <div className="bg-card border border-border rounded-2xl p-4">
        <h2 className="font-black text-sm mb-4" style={{fontFamily:DF}}>Commandes par commerce</h2>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={storeData} barSize={18}>
            <XAxis dataKey="name" tick={{fontSize:9}} axisLine={false} tickLine={false}/>
            <YAxis hide/>
            <Tooltip contentStyle={{borderRadius:"12px",fontSize:"12px",border:"none",boxShadow:"0 4px 20px rgba(0,0,0,0.1)"}}/>
            <Bar dataKey="cmd" name="Commandes" fill="#1A6B45" radius={[5,5,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-card border border-border rounded-2xl p-4">
        <h2 className="font-black text-sm mb-4" style={{fontFamily:DF}}>Statuts des commandes</h2>
        {(["nouvelle","acceptée","préparation","prête","livraison","livrée","annulée"] as OrderStatus[]).map(s=>{
          const n=allOrders.filter(o=>o.status===s).length;const pct=Math.round((n/(allOrders.length||1))*100);
          return(
            <div key={s} className="flex items-center gap-3 mb-2">
              <span className="text-xs text-muted-foreground w-24 flex-shrink-0">{STATUS_CFG[s].label}</span>
              <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden"><div className="h-full bg-primary rounded-full transition-all" style={{width:`${pct}%`}}/></div>
              <span className="text-xs font-black w-5 text-right" style={{fontFamily:DF}}>{n}</span>
            </div>
          );
        })}
      </div>
      <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-500 border border-red-200 py-4 rounded-2xl font-bold"><LogOut size={18}/>Se déconnecter</button>
    </div>
  );

  const renderOrders=()=>(
    <div className="px-4 pt-4 pb-4 space-y-3">
      <h1 className="font-black text-xl" style={{fontFamily:DF}}>Toutes les commandes</h1>
      {allOrders.map(o=>(
        <div key={o.id} className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-start justify-between gap-2">
            <div><p className="font-black text-sm" style={{fontFamily:DF}}>{o.id}</p><p className="text-xs text-muted-foreground">{o.storeName} · {o.clientName}</p></div>
            <Badge status={o.status}/>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
            <span>{o.delivery.quartier} · {PAY_LABELS[o.paymentMethod]}</span>
            <span className="font-black text-foreground" style={{fontFamily:DF}}>{FMT(o.total)}</span>
          </div>
        </div>
      ))}
    </div>
  );

  const renderShops=()=>(
    <div className="px-4 pt-4 pb-4 space-y-3">
      <h1 className="font-black text-xl" style={{fontFamily:DF}}>Commerces ({STORES.length})</h1>
      {STORES.map(s=>{
        const tc=STORE_TYPE_CFG[s.type];const cnt=allOrders.filter(o=>o.storeId===s.id).length;
        return(
          <div key={s.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <img src={s.coverImage} alt={s.name} className="w-full h-28 object-cover bg-muted"/>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div><h3 className="font-black text-sm" style={{fontFamily:DF}}>{s.name}</h3><p className="text-xs text-muted-foreground">{s.quartier} · {s.openHours}</p></div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${s.isOpen?"bg-emerald-50 text-emerald-600":"bg-red-50 text-red-500"}`}>{s.isOpen?"Ouvert":"Fermé"}</span>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border text-xs flex-wrap">
                <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-bold ${tc.color}`}>{tc.icon}{tc.label}</span>
                <span className="flex items-center gap-1 text-muted-foreground"><Star size={11} className="fill-amber-400 text-amber-400"/>{s.rating} ({s.ratingCount})</span>
                <span className="text-muted-foreground">{cnt} commande{cnt!==1?"s":""}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderClients=()=>(
    <div className="px-4 pt-4 pb-4 space-y-3">
      <h1 className="font-black text-xl" style={{fontFamily:DF}}>Utilisateurs ({USERS.length})</h1>
      {USERS.map(u=>{
        const roleConfig={client:{icon:<User size={20}/>,color:"text-blue-600",bg:"bg-blue-50",label:"Client"},merchant:{icon:<Store size={20}/>,color:"text-amber-600",bg:"bg-amber-50",label:"Commerçant"},driver:{icon:<Bike size={20}/>,color:"text-violet-600",bg:"bg-violet-50",label:"Livreur"},admin:{icon:<Shield size={20}/>,color:"text-primary",bg:"bg-secondary",label:"Admin"}};
        const rc=roleConfig[u.role];
        return(
          <div key={u.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
            <div className={`w-12 h-12 ${rc.bg} rounded-2xl flex items-center justify-center flex-shrink-0 ${rc.color}`}>{rc.icon}</div>
            <div className="flex-1 min-w-0"><p className="font-black text-sm truncate" style={{fontFamily:DF}}>{u.name}</p><p className="text-xs text-muted-foreground">{u.email}</p>{u.telephone&&<p className="text-xs text-muted-foreground">{u.telephone}</p>}</div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${rc.bg} ${rc.color}`}>{rc.label}</span>
          </div>
        );
      })}
    </div>
  );

  const renderDrivers=()=>(
    <div className="px-4 pt-4 pb-4 space-y-3">
      <h1 className="font-black text-xl" style={{fontFamily:DF}}>Livreurs</h1>
      {USERS.filter(u=>u.role==="driver").map(u=>{
        const done=allOrders.filter(o=>o.driverId===u.id&&o.status==="livrée").length;
        const active=allOrders.find(o=>o.driverId===u.id&&o.status==="livraison");
        return(
          <div key={u.id} className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center flex-shrink-0"><Bike size={26} className="text-violet-600"/></div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-base" style={{fontFamily:DF}}>{u.name}</p>
                <p className="text-xs text-muted-foreground">{u.telephone}</p>
                <p className="text-xs text-primary font-bold mt-1">{done} livraison{done!==1?"s":""} effectuée{done!==1?"s":""}</p>
              </div>
              <div className="text-right">
                <span className={`text-xs font-bold px-2.5 py-1.5 rounded-full block ${active?"bg-primary/10 text-primary animate-pulse":"bg-emerald-50 text-emerald-600"}`}>
                  {active?"En course":"Disponible"}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return(
    <div className="relative h-full overflow-hidden">
      <div className="h-full overflow-y-auto pb-20 scrollbar-hide">
        {view==="a_stats"  &&renderStats()}
        {view==="a_orders" &&renderOrders()}
        {view==="a_shops"  &&renderShops()}
        {view==="a_clients"&&renderClients()}
        {view==="a_drivers"&&renderDrivers()}
      </div>
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm bg-card/95 backdrop-blur border-t border-border shadow-2xl z-40">
        <div className="flex items-stretch">
          {navItems.map(([v,icon,label])=>{
            const active=view===v;
            return(
              <button key={v} onClick={()=>setView(v)} className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 relative transition-colors ${active?"text-primary":"text-muted-foreground"}`}>
                {active&&<div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full"/>}
                {icon}<span className={`text-[10px] font-semibold ${active?"text-primary":""}`}>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/* ══════════════════════════ ROOT APP ════════════════════════════════════════ */
export default function App(){
  const [phase,setPhase]=useState<Phase>("splash");
  const [user,setUser]=useState<AppUser|null>(null);
  const [accountType,setAccountType]=useState<AccountType>("personal");
  const [regError,setRegError]=useState("");
  const [orders,setOrders]=useState<Order[]>([]);
  const [notifs,setNotifs]=useState<Notif[]>([]);
  const [products,setProducts]=useState<Product[]>([]);
  const [stores,setStores]=useState<Store[]>([]);
  const [users,setUsers]=useState<AppUser[]>([]);
  const [boot,setBoot]=useState<{user?:AppUser;needsSetup:boolean;requiresCode:boolean}|null>(null);
  const [bootErr,setBootErr]=useState(false);
  const [syncErr,setSyncErr]=useState("");
  const ordersRef=useRef<Order[]>([]);const productsRef=useRef<Product[]>([]);const notifsRef=useRef<Notif[]>([]);
  const serverNotifIds=useRef<Set<string>>(new Set());
  ordersRef.current=orders;productsRef.current=products;notifsRef.current=notifs;

  /* ── Démarrage : état d'installation + restauration de session ── */
  const runBoot=async()=>{
    setBootErr(false);setBoot(null);
    try{
      const st=await AuthAPI.setupStatus();
      let u:AppUser|undefined;
      if(getAuthToken()){
        try{const r=await AuthAPI.me();u=toAppUser(r.user);}
        catch(e:any){if(e instanceof TypeError)throw e;setAuthToken(null);}
      }
      setBoot({user:u,needsSetup:st.needsSetup,requiresCode:st.requiresCode});
    }catch{setBootErr(true);}
  };
  useEffect(()=>{runBoot();},[]);

  /* ── Chargement des données depuis l'API ── */
  const loadAll=async(u:AppUser)=>{
    try{
      const [s,p,o,n]=await Promise.all([StoresAPI.list(),ProductsAPI.list(),OrdersAPI.list(),NotificationsAPI.list()]);
      const prods:Product[]=p.products;
      setStores(s.stores);setProducts(prods);productsRef.current=prods;
      const mapped=o.orders.map((x:any)=>mapOrder(x,prods));
      setOrders(mapped);ordersRef.current=mapped;
      const notes=n.notifications.map((x:any)=>({...x,createdAt:toDate(x.createdAt)}));
      setNotifs(notes);notifsRef.current=notes;
      serverNotifIds.current=new Set(n.notifications.map((x:any)=>x.id));
      if(u.role==="admin"){const r=await AdminAPI.users();setUsers(r.users.map(toAppUser));}
      setSyncErr("");
    }catch(e:any){setSyncErr(e?.message||"Connexion au serveur impossible.");}
  };

  const login=(u:AppUser)=>{setUser(u);setPhase("app");loadAll(u);};
  const logout=()=>{setAuthToken(null);setUser(null);setOrders([]);setNotifs([]);setProducts([]);setStores([]);setUsers([]);setPhase("auth_choice");runBoot();};

  useEffect(()=>{
    if(phase!=="wait"||!boot)return;
    if(boot.user)login(boot.user);
    else if(boot.needsSetup)setPhase("setup");
    else setPhase("onboarding");
  },[phase,boot]);

  useEffect(()=>{
    if(phase!=="app"||!user)return;
    const t=setInterval(()=>loadAll(user),15000);
    return()=>clearInterval(t);
  },[phase,user]);

  /* ── Écritures : l'UI modifie son état local, on répercute les changements sur l'API ── */
  const syncOrders=async(prev:Order[],next:Order[],u:AppUser)=>{
    let failure="";
    try{
      const prevMap=new Map(prev.map(o=>[o.id,o]));
      for(const o of next){
        const old=prevMap.get(o.id);
        if(!old){
          if(u.role==="client"||u.role==="admin")await OrdersAPI.create({storeId:o.storeId,items:o.items.map(i=>({productId:i.product.id,qty:i.qty})),paymentMethod:o.paymentMethod,delivery:o.delivery,note:o.note});
        }else{
          if(u.role==="driver"&&!old.driverId&&o.driverId)await OrdersAPI.assign(o.id);
          if(old.status!==o.status)await OrdersAPI.setStatus(o.id,o.status);
        }
      }
    }catch(e:any){failure=e?.message||"Erreur de synchronisation.";}
    await loadAll(u);
    if(failure)setSyncErr(failure);
  };
  const setOrdersSynced:React.Dispatch<React.SetStateAction<Order[]>>=(upd)=>{
    const prev=ordersRef.current;
    const next=typeof upd==="function"?(upd as (p:Order[])=>Order[])(prev):upd;
    ordersRef.current=next;setOrders(next);
    if(user)syncOrders(prev,next,user);
  };

  const syncProducts=async(prev:Product[],next:Product[],u:AppUser)=>{
    let failure="";
    const body=(p:Product)=>({name:p.name,price:p.price,description:p.description,image:p.image,available:p.available,category:p.category,stock:p.stock,unit:p.unit});
    try{
      const prevMap=new Map(prev.map(p=>[p.id,p]));
      for(const p of next){
        const old=prevMap.get(p.id);
        if(!old)await ProductsAPI.create({storeId:p.storeId,...body(p)});
        else if(JSON.stringify(old)!==JSON.stringify(p))await ProductsAPI.update(p.id,body(p));
      }
      for(const old of prev)if(!next.some(p=>p.id===old.id))await ProductsAPI.remove(old.id);
    }catch(e:any){failure=e?.message||"Erreur de synchronisation.";}
    await loadAll(u);
    if(failure)setSyncErr(failure);
  };
  const setProductsSynced:React.Dispatch<React.SetStateAction<Product[]>>=(upd)=>{
    const prev=productsRef.current;
    const next=typeof upd==="function"?(upd as (p:Product[])=>Product[])(prev):upd;
    productsRef.current=next;setProducts(next);
    if(user)syncProducts(prev,next,user);
  };

  const setNotifsSynced:React.Dispatch<React.SetStateAction<Notif[]>>=(upd)=>{
    const prev=notifsRef.current;
    const next=typeof upd==="function"?(upd as (p:Notif[])=>Notif[])(prev):upd;
    notifsRef.current=next;setNotifs(next);
    for(const n of next){
      const old=prev.find(x=>x.id===n.id);
      if(old&&!old.read&&n.read&&serverNotifIds.current.has(n.id))NotificationsAPI.markRead(n.id).catch(()=>{});
    }
  };

  /* ── Inscription (la vérification SMS sera branchée avec un fournisseur SMS) ── */
  const doRegister=async(d:{name:string;phone:string;email:string;pwd:string})=>{
    setRegError("");
    try{
      const {token,user:nu}=await AuthAPI.register({name:d.name,email:d.email,password:d.pwd,telephone:d.phone,accountType});
      setAuthToken(token);
      login(toAppUser(nu));
    }catch(e:any){
      setRegError(e?.message||"Impossible de créer le compte. Réessayez.");
      setPhase("register");
    }
  };

  const onStoreCreated=(store:Store,token:string)=>{
    setAuthToken(token);
    const u={...user!,storeId:store.id};
    setUser(u);loadAll(u);
  };

  return(
    <div className="flex items-center justify-center min-h-screen bg-zinc-800" style={{fontFamily:"'DM Sans',sans-serif"}}>
      <div className="relative w-full max-w-sm h-screen bg-background overflow-hidden shadow-2xl">
        <StoresCtx.Provider value={stores}><UsersCtx.Provider value={users}>
        {phase==="splash"       && <SplashScreen onDone={()=>setPhase("wait")}/>}
        {phase==="wait"         && !boot && <WaitScreen error={bootErr} onRetry={runBoot}/>}
        {phase==="setup"        && boot && <SetupScreen requiresCode={boot.requiresCode} onDone={login}/>}
        {phase==="onboarding"   && <OnboardingScreen onDone={()=>setPhase("auth_choice")}/>}
        {phase==="auth_choice"  && <AuthChoiceScreen onLogin={()=>setPhase("login")} onRegister={()=>setPhase("account_type")}/>}
        {phase==="login"        && <LoginScreen onLogin={login} onBack={()=>setPhase("auth_choice")} onRegister={()=>setPhase("account_type")}/>}
        {phase==="account_type" && <AccountTypeScreen onSelect={t=>{setAccountType(t);setPhase("register");}} onBack={()=>setPhase("auth_choice")}/>}
        {phase==="register"     && <RegisterScreen accountType={accountType} initialError={regError} onSubmit={doRegister} onBack={()=>setPhase("account_type")}/>}
        {phase==="app"&&user&&(
          <>
            {user.role==="client"  &&<ClientApp user={user} allOrders={orders} setAllOrders={setOrdersSynced} allNotifs={notifs} setAllNotifs={setNotifsSynced} allProducts={products} onLogout={logout}/>}
            {user.role==="merchant"&&!user.storeId&&<CreateStoreScreen user={user} onCreated={onStoreCreated} onLogout={logout}/>}
            {user.role==="merchant"&&!!user.storeId&&<MerchantApp user={user} allOrders={orders} setAllOrders={setOrdersSynced} allNotifs={notifs} allProducts={products} setAllProducts={setProductsSynced} onLogout={logout}/>}
            {user.role==="driver"  &&<DriverApp user={user} allOrders={orders} setAllOrders={setOrdersSynced} allNotifs={notifs} onLogout={logout}/>}
            {user.role==="admin"   &&<AdminApp user={user} allOrders={orders} allNotifs={notifs} allProducts={products} onLogout={logout}/>}
          </>
        )}
        </UsersCtx.Provider></StoresCtx.Provider>
        {syncErr&&phase==="app"&&(
          <div onClick={()=>setSyncErr("")} className="absolute top-0 inset-x-0 z-50 bg-red-600 text-white text-xs font-semibold px-4 py-2 text-center">{syncErr} · toucher pour fermer</div>
        )}
      </div>
    </div>
  );
}
