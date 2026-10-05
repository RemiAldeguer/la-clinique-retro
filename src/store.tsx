import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
import {type Store,validateStore,STORAGE_KEY,now,csvCell,money,consoleInvestment,STATES} from './domain';
import {demoStore} from './seed';
export type Toast={id:number;message:string;error:boolean};
export type EditModal={type:'console'|'repair'|'part';id?:string;consoleId?:string}|null;
export type Confirm={title:string;body:string;label?:string;destructive?:boolean;verify?:string;run:()=>boolean|void}|null;
interface AppContextValue {
 data:Store; transact:(fn:(draft:Store)=>void,message?:string)=>boolean;
 notify:(message:string,error?:boolean)=>void; go:(path:string)=>void;
 edit:(value:EditModal)=>void; ask:(value:Confirm)=>void;
 exportData:()=>void; exportInventory:()=>void; storageError:string;
}
const AppContext=createContext<AppContextValue|null>(null);
export const useApp=()=>{const c=useContext(AppContext);if(!c)throw Error('Application non initialisée.');return c;};
export function downloadFile(content:string,name:string,type='application/json'){
 const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
export function useHash(){const [path,setPath]=useState(()=>location.hash.slice(1)||'/dashboard');useEffect(()=>{const h=()=>{setPath(location.hash.slice(1)||'/dashboard');window.scrollTo({top:0});};addEventListener('hashchange',h);return()=>removeEventListener('hashchange',h);},[]);return path;}
function initial(){let raw='';try{raw=localStorage.getItem(STORAGE_KEY)||'';if(raw)return{data:validateStore(JSON.parse(raw)),fatal:'',raw};const data=demoStore();localStorage.setItem(STORAGE_KEY,JSON.stringify(data));return{data,fatal:'',raw:''};}catch(e){return{data:demoStore(),fatal:e instanceof Error?e.message:'Impossible de lire les données locales.',raw};}}
export function Provider({children,showToast,edit,ask}:{children:React.ReactNode;showToast:(t:Toast)=>void;edit:(m:EditModal)=>void;ask:(c:Confirm)=>void}){
 const [boot]=useState(initial),[data,setData]=useState(boot.data),[storageError,setStorageError]=useState(''),[fatal,setFatal]=useState(boot.fatal);
 const ref=useRef(data);ref.current=data;
 const notify=(message:string,error=false)=>showToast({id:Date.now()+Math.random(),message,error});
 function transact(fn:(d:Store)=>void,message?:string){
  try{
   const latestRaw=localStorage.getItem(STORAGE_KEY);
   if(latestRaw){const latest=validateStore(JSON.parse(latestRaw));if(latest.revision!==ref.current.revision){ref.current=latest;setData(latest);notify('Les données ont changé dans un autre onglet. Vue actualisée, renouvelez votre action.',true);return false;}}
   const draft=structuredClone(ref.current);fn(draft);draft.revision=ref.current.revision+1;
   const valid=validateStore(draft);localStorage.setItem(STORAGE_KEY,JSON.stringify(valid));
   ref.current=valid;setData(valid);setStorageError('');if(message)notify(message);return true;
  }catch(e){const text=e instanceof Error?e.message:'L’opération a échoué.';const capacity=e instanceof DOMException&&(e.name==='QuotaExceededError'||e.name==='SecurityError');if(capacity)setStorageError('Sauvegarde locale impossible. Exportez vos données et libérez de l’espace ou autorisez le stockage. L’action n’a pas été enregistrée.');notify(capacity?'Stockage indisponible ou plein : aucune modification enregistrée.':text,true);return false;}
 }
 useEffect(()=>{const onStorage=(e:StorageEvent)=>{if(e.key!==STORAGE_KEY)return;if(!e.newValue){setStorageError('Le stockage a été effacé dans un autre onglet. Exportez cette session avant de continuer.');return;}try{const v=validateStore(JSON.parse(e.newValue));ref.current=v;setData(v);setStorageError('');}catch{setStorageError('Une mise à jour locale est invalide. Les données de cette session sont conservées.');}};addEventListener('storage',onStorage);return()=>removeEventListener('storage',onStorage);},[]);
 const go=(path:string)=>{location.hash=path;};
 function exportData(){const at=now();const copy=structuredClone(ref.current);copy.settings.lastExportAt=at;downloadFile(JSON.stringify({...copy,exportedAt:at},null,2),`clinique-retro-sauvegarde-${at.slice(0,10)}.json`);transact(s=>{s.settings.lastExportAt=at;},'Sauvegarde JSON exportée. Conservez-la dans un endroit sûr.');}
 function exportInventory(){const s=ref.current;const rows=[['Référence','Marque','Modèle','Variante','Numéro de série','État','État esthétique','Date d’acquisition','Achat EUR','Valeur estimée EUR','Investissement hors temps EUR','Emplacement','Provenance','Accessoires','Notes','Archivée'],...s.consoles.map(c=>[c.code,c.brand,c.model,c.variant,c.serial,STATES[c.state],c.condition,c.acquiredAt,c.purchasePrice.toFixed(2).replace('.',','),c.estimatedValue.toFixed(2).replace('.',','),consoleInvestment(s,c).toFixed(2).replace('.',','),c.location,c.source,c.accessories,c.notes,c.archived?'Oui':'Non'])];downloadFile('\uFEFF'+rows.map(r=>r.map(csvCell).join(';')).join('\r\n'),`inventaire-clinique-retro-${now().slice(0,10)}.csv`,'text/csv;charset=utf-8');notify('Inventaire complet exporté au format CSV.');}
 if(fatal)return <div className="recovery"><h1>Votre sauvegarde est protégée.</h1><p>La lecture des données a échoué. Aucune donnée existante n’a été écrasée.</p><pre>{fatal}</pre><p>Récupérez d’abord le fichier brut pour pouvoir le conserver. Vérifiez ensuite que votre navigateur autorise le stockage local.</p><div className="button-row"><button className="btn primary" onClick={()=>downloadFile(boot.raw||JSON.stringify(data),'clinique-retro-recuperation.txt','text/plain')}>Récupérer les données brutes</button><button className="btn danger" onClick={()=>{if(!window.confirm('Réinitialiser le stockage local ? Les données précédentes seront remplacées.'))return;try{const d=demoStore();localStorage.setItem(STORAGE_KEY,JSON.stringify(d));ref.current=d;setData(d);setFatal('');}catch{notify('Le stockage reste indisponible. Essayez avec un autre navigateur ou le serveur local fourni.',true);}}}>Réinitialiser</button></div></div>;
 return <AppContext.Provider value={{data,transact,notify,go,edit,ask,exportData,exportInventory,storageError}}>{children}</AppContext.Provider>;
}
