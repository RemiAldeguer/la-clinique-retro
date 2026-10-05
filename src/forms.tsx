import React,{useState} from 'react';
import {useApp,type EditModal} from './store';
import {Icon,Modal,Field,Empty,ConsoleArt} from './ui';
import {type ConsoleItem,type ConsoleState,type Illustration,type Part,type Priority,STATES,PRIORITIES,uid,now,today,nextCode,active,addEvent,createRepair} from './domain';
export const text=(f:FormData,k:string)=>String(f.get(k)||'').trim();
export const number=(f:FormData,k:string)=>Number(f.get(k)||0);
export function Editor({modal,onClose}:{modal:NonNullable<EditModal>;onClose:()=>void}){
 if(modal.type==='console')return <ConsoleForm id={modal.id} onClose={onClose}/>;
 if(modal.type==='repair')return <RepairForm consoleId={modal.consoleId} onClose={onClose}/>;
 return <PartForm id={modal.id} onClose={onClose}/>;
}
function FormFooter({onClose,label}:{onClose:()=>void;label:string}){return <div className="modal-footer"><button className="btn secondary" type="button" onClick={onClose}>Annuler</button><button className="btn primary" type="submit"><Icon name="check" size={17}/>{label}</button></div>;}
function ConsoleForm({id,onClose}:{id?:string;onClose:()=>void}){
 const {data,transact,go}=useApp();const item=data.consoles.find(c=>c.id===id);const [illustration,setIllustration]=useState<Illustration>(item?.illustration||'gameboy');
 const open=item&&data.repairs.some(r=>r.consoleId===item.id&&active(r));
 function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);let saved='';const ok=transact(s=>{
  const c:ConsoleItem={id:item?.id||uid(),code:item?.code||nextCode(s.consoles,'CRT-'),brand:text(f,'brand'),model:text(f,'model'),variant:text(f,'variant'),serial:text(f,'serial'),state:open?'en-reparation':text(f,'state') as ConsoleState,condition:text(f,'condition'),acquiredAt:text(f,'acquiredAt'),purchasePrice:number(f,'purchasePrice'),estimatedValue:number(f,'estimatedValue'),source:text(f,'source'),location:text(f,'location'),accessories:text(f,'accessories'),notes:text(f,'notes'),illustration,photos:item?.photos||[],archived:item?.archived||false,createdAt:item?.createdAt||now()};
  if(!c.brand||!c.model)throw Error('La marque et le modèle sont obligatoires.');
  if(c.serial&&s.consoles.some(x=>x.id!==c.id&&x.serial.toLowerCase()===c.serial.toLowerCase()))throw Error('Ce numéro de série est déjà associé à une console.');
  if(item){const index=s.consoles.findIndex(x=>x.id===id);if(index<0)throw Error('Cette console n’existe plus.');c.photos=s.consoles[index].photos;s.consoles[index]=c;}else s.consoles.unshift(c);
  addEvent(s,`${c.code} · ${c.model} ${item?'mise à jour':'ajoutée à l’inventaire'}.`,item?'edit':'created',{consoleId:c.id});saved=c.id;
 },item?'Fiche console mise à jour.':'Console ajoutée à l’inventaire.');if(ok){onClose();go('/inventory/'+saved);}}
 return <Modal title={item?'Modifier la console':'Une nouvelle pensionnaire'} subtitle={item?`${item.code} · ${item.brand} ${item.model}`:'Ajoutez une console à votre collection. Les champs * sont obligatoires.'} onClose={onClose} wide><form onSubmit={submit}><div className="modal-body"><div className="form-preview"><ConsoleArt item={{illustration,model:item?.model||'Console'}} small/><div><strong>Chaque console a son histoire.</strong><p>Commencez par son identité. Vous pourrez ensuite ajouter des photos et ouvrir un dossier de réparation.</p></div></div><div className="form-grid">
 <Field label="Marque *"><input name="brand" defaultValue={item?.brand||'Nintendo'} maxLength={80} required list="brands"/><datalist id="brands">{['Nintendo','Sony','Sega','Microsoft','Atari','SNK','NEC','Autre'].map(x=><option key={x}>{x}</option>)}</datalist></Field>
 <Field label="Modèle *"><input name="model" defaultValue={item?.model} placeholder="Game Boy, PlayStation…" maxLength={120} required autoFocus/></Field>
 <Field label="Variante / révision"><input name="variant" defaultValue={item?.variant} placeholder="DMG-01 · PAL · Édition…" maxLength={150}/></Field>
 <Field label="Numéro de série"><input name="serial" defaultValue={item?.serial} maxLength={100} placeholder="Optionnel"/></Field>
 <Field label="État fonctionnel" hint={open?'Piloté par le dossier de réparation ouvert.':undefined}><select name="state" defaultValue={item?.state||'a-tester'} disabled={!!open}>{Object.entries(STATES).filter(([key])=>key!=='en-reparation'||open).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></Field>
 <Field label="État esthétique"><select name="condition" defaultValue={item?.condition||'À évaluer'}>{['À évaluer','Comme neuve','Très bon état','Bon état','Traces d’usage','À restaurer'].map(x=><option key={x}>{x}</option>)}</select></Field>
 <Field label="Date d’acquisition"><input name="acquiredAt" type="date" defaultValue={item?.acquiredAt||today()}/></Field>
 <Field label="Provenance"><input name="source" defaultValue={item?.source} maxLength={200} placeholder="Brocante, don, particulier…"/></Field>
 <Field label="Prix d’achat (€)"><input name="purchasePrice" type="number" min="0" max="1000000000" step="0.01" defaultValue={item?.purchasePrice||0} required/></Field>
 <Field label="Valeur estimée (€)" hint="Votre estimation personnelle, non calculée par l’app."><input name="estimatedValue" type="number" min="0" max="1000000000" step="0.01" defaultValue={item?.estimatedValue||0} required/></Field>
 <Field label="Emplacement"><input name="location" defaultValue={item?.location} maxLength={200} placeholder="Étagère B2, bac A1…"/></Field>
 <Field label="Illustration générique"><select value={illustration} onChange={e=>setIllustration(e.target.value as Illustration)}>{[['gameboy','Console portable verticale'],['snes','Console 16 bits grise'],['playstation','Console à disque grise'],['megadrive','Console 16 bits noire'],['dreamcast','Console à disque blanche'],['gamegear','Console portable noire'],['switch','Console portable turquoise']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field>
 <Field label="Accessoires" className="span-2"><input name="accessories" defaultValue={item?.accessories} maxLength={30000} placeholder="Alimentation, câble vidéo, manettes…"/></Field>
 <Field label="Notes" className="span-2"><textarea name="notes" defaultValue={item?.notes} rows={3} maxLength={30000} placeholder="Histoire, défauts visibles, précautions particulières…"/></Field>
 </div></div><FormFooter onClose={onClose} label={item?'Enregistrer les modifications':'Ajouter la console'}/></form></Modal>;
}
function RepairForm({consoleId,onClose}:{consoleId?:string;onClose:()=>void}){
 const {data,transact,go,edit}=useApp();const choices=data.consoles.filter(c=>!c.archived&&!data.repairs.some(r=>r.consoleId===c.id&&active(r)));
 const [selected,setSelected]=useState(consoleId||choices[0]?.id||'');const c=choices.find(x=>x.id===selected);
 function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);let id='';const ok=transact(s=>{id=createRepair(s,{consoleId:selected,title:text(f,'title'),symptoms:text(f,'symptoms'),priority:text(f,'priority') as Priority,dueDate:text(f,'dueDate')}).id;},'Dossier ouvert. La console entre à l’atelier.');if(ok){onClose();go('/repairs/'+id);}}
 return <Modal title="Ouvrir un dossier de réparation" subtitle="Une nouvelle admission à La Clinique Rétro." onClose={onClose}>{!choices.length?<div className="modal-body"><Empty title="Aucune console disponible" icon="gamepad" action={<button className="btn primary" onClick={()=>edit({type:'console'})}>Ajouter une console</button>}>Toutes vos consoles sont archivées ou possèdent déjà une réparation ouverte.</Empty></div>:<form onSubmit={submit}><div className="modal-body"><Field label="Console concernée *"><select value={selected} onChange={e=>setSelected(e.target.value)} required>{choices.map(c=><option key={c.id} value={c.id}>{c.code} · {c.brand} {c.model}</option>)}</select></Field>{c&&<div className="selected-console"><ConsoleArt item={c} small/><div><strong>{c.brand} {c.model}</strong><small>{c.variant} · {c.location||'Emplacement non renseigné'}</small></div></div>}<div className="form-grid">
 <Field label="Objet de la réparation *" className="span-2"><input name="title" placeholder="Ex. Absence de son au haut-parleur" maxLength={200} required autoFocus/></Field>
 <Field label="Symptômes constatés *" className="span-2"><textarea name="symptoms" rows={4} placeholder="Que se passe-t-il ? Dans quelles conditions ?" maxLength={30000} required/></Field>
 <Field label="Priorité"><select name="priority" defaultValue="normale">{Object.entries(PRIORITIES).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field>
 <Field label="Échéance souhaitée"><input type="date" name="dueDate"/></Field></div><div className="notice compact"><Icon name="info" size={17}/><span>Le dossier débutera à l’étape <strong>Réception</strong>. Une seule réparation peut être ouverte par console.</span></div></div><FormFooter onClose={onClose} label="Ouvrir le dossier"/></form>}</Modal>;
}
function PartForm({id,onClose}:{id?:string;onClose:()=>void}){
 const {data,transact}=useApp();const part=data.parts.find(p=>p.id===id);
 function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const ok=transact(s=>{const p:Part={id:part?.id||uid(),reference:text(f,'reference'),name:text(f,'name'),category:text(f,'category'),compatibility:text(f,'compatibility'),quantity:number(f,'quantity'),threshold:number(f,'threshold'),unitCost:number(f,'unitCost'),location:text(f,'location'),supplier:text(f,'supplier')};if(!p.name||!p.reference)throw Error('Nom et référence obligatoires.');if(s.parts.some(x=>x.id!==p.id&&x.reference.toLowerCase()===p.reference.toLowerCase()))throw Error('Cette référence existe déjà dans le stock.');if(part){const i=s.parts.findIndex(x=>x.id===part.id);if(i<0)throw Error('Pièce introuvable.');const delta=p.quantity-s.parts[i].quantity;s.parts[i]=p;addEvent(s,`${p.reference} mise à jour${delta?` ; stock ajusté de ${delta>0?'+':''}${delta}`:''}.`,'part');}else{s.parts.unshift(p);addEvent(s,`${p.reference} · ${p.name} ajoutée au stock (${p.quantity} unité(s)).`,'part');}},part?'Référence mise à jour.':'Pièce ajoutée au stock.');if(ok)onClose();}
 return <Modal title={part?'Modifier la pièce':'Ajouter une pièce'} subtitle="Le coût unitaire sera mémorisé lors de chaque utilisation." onClose={onClose}><form onSubmit={submit}><div className="modal-body"><div className="form-grid">
 <Field label="Référence *"><input name="reference" defaultValue={part?.reference} placeholder="CAP-100-16" maxLength={80} required/></Field>
 <Field label="Catégorie"><input name="category" defaultValue={part?.category||'Composants'} maxLength={80} list="categories"/><datalist id="categories">{['Composants','Condensateurs','Kits de réparation','Boutons & membranes','Écrans','Lecteurs & optiques','Consommables','Câbles'].map(c=><option key={c}>{c}</option>)}</datalist></Field>
 <Field label="Désignation *" className="span-2"><input name="name" defaultValue={part?.name} maxLength={200} required autoFocus/></Field>
 <Field label="Consoles compatibles" className="span-2"><input name="compatibility" defaultValue={part?.compatibility} maxLength={500} placeholder="Game Boy DMG-01, Game Gear…"/></Field>
 <Field label="Quantité en stock *"><input name="quantity" type="number" min="0" max="1000000000" step="1" defaultValue={part?.quantity||0} required/></Field>
 <Field label="Seuil d’alerte *"><input name="threshold" type="number" min="0" max="1000000000" step="1" defaultValue={part?.threshold??2} required/></Field>
 <Field label="Coût unitaire (€) *"><input name="unitCost" type="number" min="0" max="1000000000" step="0.01" defaultValue={part?.unitCost||0} required/></Field>
 <Field label="Emplacement"><input name="location" defaultValue={part?.location} maxLength={200}/></Field>
 <Field label="Fournisseur" className="span-2"><input name="supplier" defaultValue={part?.supplier} maxLength={200}/></Field>
 </div>{part&&<p className="form-hint">Un changement de prix ne modifie pas le coût des pièces déjà utilisées dans les réparations.</p>}</div><FormFooter onClose={onClose} label={part?'Enregistrer':'Ajouter la pièce'}/></form></Modal>;
}
