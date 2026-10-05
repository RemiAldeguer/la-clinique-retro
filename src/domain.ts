/** Domain rules are independent from the UI and the storage mechanism. */
export const SCHEMA = 1;
export const STORAGE_KEY = 'la-clinique-retro:v1';
export const STATES = {
  'a-tester': 'À tester', 'en-panne': 'En panne', 'en-reparation': 'En réparation',
  'fonctionnelle': 'Fonctionnelle', 'pour-pieces': 'Pour pièces',
} as const;
export type ConsoleState = keyof typeof STATES;
export const STAGES = [
  { id: 'reception', label: 'Réception', short: 'Réception', color: 'slate', icon: 'inbox' },
  { id: 'diagnostic', label: 'Diagnostic', short: 'Diagnostic', color: 'purple', icon: 'stethoscope' },
  { id: 'a-commander', label: 'Pièces à commander', short: 'À commander', color: 'orange', icon: 'cart' },
  { id: 'attente-pieces', label: 'En attente de pièces', short: 'Attente pièces', color: 'amber', icon: 'package' },
  { id: 'reparation', label: 'Réparation en cours', short: 'Réparation', color: 'blue', icon: 'wrench' },
  { id: 'tests', label: 'Tests de validation', short: 'Tests', color: 'teal', icon: 'checklist' },
  { id: 'terminee', label: 'Terminée', short: 'Terminée', color: 'green', icon: 'check' },
  { id: 'irreparable', label: 'Irréparable', short: 'Irréparable', color: 'red', icon: 'alert' },
  { id: 'abandonnee', label: 'Abandonnée', short: 'Abandonnée', color: 'slate', icon: 'archive' },
] as const;
export type Stage = typeof STAGES[number]['id'];
export const PRIORITIES = { urgente: 'Urgente', haute: 'Haute', normale: 'Normale', basse: 'Basse' } as const;
export type Priority = keyof typeof PRIORITIES;
export type Illustration = 'gameboy' | 'snes' | 'playstation' | 'megadrive' | 'dreamcast' | 'switch' | 'gamegear';
export type TestResult = 'pending' | 'pass' | 'fail' | 'na';
export interface Photo { id: string; data: string; caption: string; createdAt: string; }
export interface ConsoleItem {
  id: string; code: string; brand: string; model: string; variant: string; serial: string;
  state: ConsoleState; condition: string; acquiredAt: string; purchasePrice: number; estimatedValue: number;
  source: string; location: string; accessories: string; notes: string; illustration: Illustration;
  photos: Photo[]; archived: boolean; createdAt: string;
}
export interface Part {
  id: string; reference: string; name: string; category: string; compatibility: string;
  quantity: number; threshold: number; unitCost: number; location: string; supplier: string;
}
export interface PartUsage { id: string; partId: string; name: string; quantity: number; unitCost: number; usedAt: string; }
export interface Worklog { id: string; minutes: number; note: string; createdAt: string; }
export interface RepairTest { id: string; label: string; result: TestResult; }
export interface Repair {
  id: string; code: string; consoleId: string; title: string; symptoms: string; diagnosis: string;
  stage: Stage; priority: Priority; dueDate: string; createdAt: string; updatedAt: string; completedAt: string;
  parts: PartUsage[]; worklogs: Worklog[]; tests: RepairTest[]; timerStartedAt: string; photos: Photo[];
}
export interface Activity {
  id: string; kind: 'created' | 'stage' | 'note' | 'part' | 'time' | 'test' | 'edit' | 'system' | 'photo';
  text: string; createdAt: string; consoleId?: string; repairId?: string;
}
export interface Store {
  schemaVersion: number; revision: number;
  settings: { workshop: string; owner: string; hourlyRate: number; demo: boolean; lastExportAt: string; };
  consoles: ConsoleItem[]; repairs: Repair[]; parts: Part[]; events: Activity[];
}
export const uid = () => globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const now = () => new Date().toISOString();
export const today = () => localDate(new Date());
export const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const active = (r: Repair) => !['terminee','irreparable','abandonnee'].includes(r.stage);
export const stageInfo = (s: Stage) => STAGES.find(x => x.id === s)!;
export const money = (v: number) => new Intl.NumberFormat('fr-FR',{ style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(v);
export const compactMoney = (v: number) => new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(v);
export const dateFmt = (s: string, full = false) => !s ? 'Non renseignée' : new Intl.DateTimeFormat('fr-FR', full ? {dateStyle:'long'} : {day:'2-digit',month:'short',year:'numeric'}).format(new Date(s.length===10 ? s+'T12:00:00' : s));
export const timeFmt = (s: string) => new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit'}).format(new Date(s));
export const minutesFmt = (n: number) => n < 60 ? `${n} min` : `${Math.floor(n/60)} h${n%60 ? ` ${String(n%60).padStart(2,'0')}` : ''}`;
export const totalMinutes = (r: Repair) => r.worklogs.reduce((a,w)=>a+w.minutes,0);
export const partsCost = (r: Repair) => cents(r.parts.reduce((a,p)=>a+p.quantity*p.unitCost,0));
export const cents = (n: number) => Math.round((n + Number.EPSILON)*100)/100;
export const consoleInvestment = (s: Store,c: ConsoleItem) => cents(c.purchasePrice+s.repairs.filter(r=>r.consoleId===c.id).reduce((a,r)=>a+partsCost(r),0));
export const overdue = (r: Repair) => active(r) && !!r.dueDate && r.dueDate < today();
export const nextCode = (arr: {code:string}[],prefix:string) => prefix + String(Math.max(0,...arr.map(x=>Number(x.code.match(/\d+$/)?.[0])||0))+1).padStart(3,'0');
export const defaultTests = (): RepairTest[] => [
  'Démarrage et alimentation','Image et affichage','Son et sortie audio','Commandes et connectiques','Stabilité : 30 min minimum'
].map(label=>({id:uid(),label,result:'pending'}));
export function addEvent(s: Store,text: string,kind: Activity['kind']='edit',refs: Pick<Activity,'consoleId'|'repairId'>={}) {
  s.events.unshift({id:uid(),text,kind,createdAt:now(),...refs});
}
export function stopTimer(s: Store,r: Repair) {
  if(!r.timerStartedAt) return;
  const minutes=Math.max(1,Math.ceil((Date.now()-Date.parse(r.timerStartedAt))/60000));
  r.worklogs.push({id:uid(),minutes,note:'Session chronométrée',createdAt:now()}); r.timerStartedAt='';
  addEvent(s,`${minutesFmt(minutes)} d’intervention enregistrées.`, 'time',{consoleId:r.consoleId,repairId:r.id});
}
export function moveRepair(s: Store,id: string,stage: Stage) {
  const r=s.repairs.find(x=>x.id===id); if(!r) throw Error('Dossier introuvable.');
  if(r.stage===stage) return;
  const c=s.consoles.find(x=>x.id===r.consoleId)!;
  if(!STAGES.some(x=>x.id===stage)) throw Error('Étape inconnue.');
  if(!['terminee','abandonnee','irreparable'].includes(stage)) {
    if(c.archived) throw Error('Restaurez d’abord cette console dans l’inventaire.');
    if(s.repairs.some(x=>x.id!==id&&x.consoleId===c.id&&active(x))) throw Error('Cette console possède déjà une réparation ouverte.');
  }
  if(stage==='terminee' && (!r.tests.length || r.tests.some(t=>t.result==='pending'||t.result==='fail') || !r.tests.some(t=>t.result==='pass'))) {
    throw Error('Validez les tests avant de terminer : tous doivent être réussis ou non applicables, avec au moins un test réussi.');
  }
  const previous=stageInfo(r.stage).label;
  const targetOpen=!['terminee','irreparable','abandonnee'].includes(stage);
  const mustRetest=targetOpen&&(!active(r)||(r.stage==='tests'&&stage!=='tests'));
  if(mustRetest)r.tests.forEach(t=>t.result='pending');
  r.stage=stage; r.updatedAt=now(); r.completedAt=active(r)?'':now();
  if(!active(r)) stopTimer(s,r);
  const anotherOpen=s.repairs.some(x=>x.id!==r.id&&x.consoleId===c.id&&active(x));
  c.state=anotherOpen?'en-reparation':stage==='terminee'?'fonctionnelle':stage==='irreparable'?'pour-pieces':stage==='abandonnee'?'en-panne':'en-reparation';
  addEvent(s,`${previous} → ${stageInfo(stage).label}`, 'stage',{consoleId:c.id,repairId:r.id});
}
export function usePart(s: Store,repairId: string,partId: string,quantity: number) {
  const r=s.repairs.find(x=>x.id===repairId), p=s.parts.find(x=>x.id===partId);
  if(!r||!p) throw Error('Pièce ou réparation introuvable.');
  if(!active(r)) throw Error('Rouvrez le dossier avant de modifier les pièces.');
  if(!Number.isSafeInteger(quantity)||quantity<1) throw Error('La quantité doit être un entier positif.');
  if(quantity>p.quantity) throw Error(`Stock insuffisant : ${p.quantity} unité(s) disponible(s).`);
  r.tests.forEach(t=>t.result='pending');
  p.quantity-=quantity; r.parts.push({id:uid(),partId:p.id,name:p.name,quantity,unitCost:p.unitCost,usedAt:now()}); r.updatedAt=now();
  addEvent(s,`${quantity} × ${p.name} utilisées (${money(quantity*p.unitCost)}).`, 'part',{consoleId:r.consoleId,repairId:r.id});
}
export function returnPart(s: Store,repairId: string,usageId: string) {
  const r=s.repairs.find(x=>x.id===repairId)!;
  if(!r || !active(r)) throw Error('Rouvrez le dossier avant de modifier les pièces.');
  const u=r.parts.find(x=>x.id===usageId); if(!u) throw Error('Utilisation introuvable.');
  const p=s.parts.find(x=>x.id===u.partId); if(!p) throw Error('Référence introuvable dans le stock.');
  r.tests.forEach(t=>t.result='pending');
  p.quantity+=u.quantity; r.parts=r.parts.filter(x=>x.id!==usageId);r.updatedAt=now();
  addEvent(s,`${u.quantity} × ${u.name} remises en stock.`, 'part',{consoleId:r.consoleId,repairId:r.id});
}
export function createRepair(s: Store,input: Pick<Repair,'consoleId'|'title'|'symptoms'|'priority'|'dueDate'>) {
  const c=s.consoles.find(x=>x.id===input.consoleId); if(!c||c.archived) throw Error('Choisissez une console non archivée.');
  if(s.repairs.some(x=>x.consoleId===c.id&&active(x))) throw Error('Cette console possède déjà un dossier en cours.');
  if(!input.title.trim()) throw Error('Le titre du dossier est obligatoire.');
  const r: Repair={...input,id:uid(),code:nextCode(s.repairs,'REP-'),stage:'reception',diagnosis:'',createdAt:now(),updatedAt:now(),completedAt:'',timerStartedAt:'',photos:[],parts:[],worklogs:[],tests:defaultTests()};
  s.repairs.unshift(r);c.state='en-reparation';addEvent(s,`Dossier ${r.code} ouvert : ${r.title}.`,'created',{consoleId:c.id,repairId:r.id});return r;
}
export function emptyStore(): Store {
  return {schemaVersion:SCHEMA,revision:0,settings:{workshop:'La Clinique Rétro',owner:'Rémi',hourlyRate:35,demo:false,lastExportAt:''},consoles:[],repairs:[],parts:[],events:[]};
}
/** Strict import validation: known fields only, bounds, foreign keys and lifecycle invariants. */
export function validateStore(raw: unknown): Store {
  const fail=(label:string):never=>{throw Error(`Sauvegarde invalide : ${label}.`)};
  const rec=(x:unknown):Record<string,unknown>=>x&&typeof x==='object'&&!Array.isArray(x)?x as Record<string,unknown>:fail('objet attendu');
  const str=(x:unknown,max=30000):string=>typeof x==='string'&&x.length<=max?x:fail('texte manquant ou trop long');
  const num=(x:unknown,integer=false):number=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=1e9&&(!integer||Number.isSafeInteger(x))?x:fail('nombre hors limites');
  const required=(x:unknown,max=30000):string=>{const v=str(x,max);return v.trim()?v:fail('champ obligatoire vide')};
  const flag=(x:unknown):boolean=>typeof x==='boolean'?x:fail('booléen attendu');
  const one=<T extends string>(x:unknown,values:readonly T[]):T=>values.includes(x as T)?x as T:fail('valeur non autorisée');
  const arr=(x:unknown,max=50000):unknown[]=>Array.isArray(x)&&x.length<=max?x:fail('liste manquante ou trop longue');
  const timestamp=(x:unknown,optional=false):string=>{const v=str(x,40);return (optional&&!v)||(/^\d{4}-\d\d-\d\dT/.test(v)&&Number.isFinite(Date.parse(v)))?v:fail('horodatage invalide')};
  const day=(x:unknown):string=>{const v=str(x,10);if(!v)return '';if(!/^\d{4}-\d\d-\d\d$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v+'T12:00:00Z').toISOString().slice(0,10)!==v)return fail('date invalide');return v;};
  const id=(x:unknown)=>{const v=str(x,120);return /^[A-Za-z0-9_-]+$/.test(v)?v:fail('identifiant invalide')};
  const photos=(x:unknown):Photo[]=>arr(x,8).map(y=>{const p=rec(y);const data=str(p.data,650000);if(!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(data))fail('image invalide');return{id:id(p.id),data,caption:str(p.caption,300),createdAt:timestamp(p.createdAt)};});
  const v=rec(raw); if(v.schemaVersion!==SCHEMA)fail('version non prise en charge');
  const settings=rec(v.settings);
  const s:Store={schemaVersion:SCHEMA,revision:num(v.revision,true),settings:{workshop:required(settings.workshop,120),owner:str(settings.owner,80),hourlyRate:num(settings.hourlyRate),demo:flag(settings.demo),lastExportAt:timestamp(settings.lastExportAt,true)},consoles:[],repairs:[],parts:[],events:[]};
  s.consoles=arr(v.consoles).map(y=>{const c=rec(y);return{id:id(c.id),code:required(c.code,40),brand:required(c.brand,80),model:required(c.model,120),variant:str(c.variant,150),serial:str(c.serial,100),state:one(c.state,Object.keys(STATES) as ConsoleState[]),condition:str(c.condition,80),acquiredAt:day(c.acquiredAt),purchasePrice:num(c.purchasePrice),estimatedValue:num(c.estimatedValue),source:str(c.source,200),location:str(c.location,200),accessories:str(c.accessories),notes:str(c.notes),illustration:one(c.illustration,['gameboy','snes','playstation','megadrive','dreamcast','switch','gamegear'] as const),photos:photos(c.photos),archived:flag(c.archived),createdAt:timestamp(c.createdAt)};});
  s.parts=arr(v.parts).map(y=>{const p=rec(y);return{id:id(p.id),reference:required(p.reference,80),name:required(p.name,200),category:str(p.category,80),compatibility:str(p.compatibility,500),quantity:num(p.quantity,true),threshold:num(p.threshold,true),unitCost:num(p.unitCost),location:str(p.location,200),supplier:str(p.supplier,200)};});
  s.repairs=arr(v.repairs).map(y=>{const r=rec(y);return{id:id(r.id),code:required(r.code,40),consoleId:id(r.consoleId),title:required(r.title,200),symptoms:str(r.symptoms),diagnosis:str(r.diagnosis),stage:one(r.stage,STAGES.map(x=>x.id)),priority:one(r.priority,Object.keys(PRIORITIES) as Priority[]),dueDate:day(r.dueDate),createdAt:timestamp(r.createdAt),updatedAt:timestamp(r.updatedAt),completedAt:timestamp(r.completedAt,true),timerStartedAt:timestamp(r.timerStartedAt,true),photos:photos(r.photos),parts:arr(r.parts).map(y=>{const p=rec(y);const q=num(p.quantity,true);if(q<1)fail('quantité utilisée nulle');return{id:id(p.id),partId:id(p.partId),name:required(p.name,200),quantity:q,unitCost:num(p.unitCost),usedAt:timestamp(p.usedAt)};}),worklogs:arr(r.worklogs).map(y=>{const w=rec(y);return{id:id(w.id),minutes:num(w.minutes,true),note:str(w.note,1000),createdAt:timestamp(w.createdAt)};}),tests:arr(r.tests,100).map(y=>{const t=rec(y);return{id:id(t.id),label:required(t.label,300),result:one(t.result,['pending','pass','fail','na'] as const)};})};});
  s.events=arr(v.events,100000).map(y=>{const e=rec(y);return{id:id(e.id),kind:one(e.kind,['created','stage','note','part','time','test','edit','system','photo'] as const),text:str(e.text),createdAt:timestamp(e.createdAt),...(e.consoleId?{consoleId:id(e.consoleId)}:{}),...(e.repairId?{repairId:id(e.repairId)}:{})};});
  function unique(items:{id:string}[]) {const ids=new Set(items.map(x=>x.id));if(ids.size!==items.length)fail('identifiants dupliqués');return ids;}
  const consoles=unique(s.consoles),parts=unique(s.parts),repairs=unique(s.repairs);unique(s.events);
  if(new Set(s.consoles.map(c=>c.code)).size!==s.consoles.length||new Set(s.repairs.map(r=>r.code)).size!==s.repairs.length)fail('numéros de dossier dupliqués');
  if(new Set(s.parts.map(p=>p.reference.toLowerCase())).size!==s.parts.length)fail('références de pièces dupliquées');
  const open=new Set<string>();let timers=0;
  for(const r of s.repairs){if(active(r)&&r.completedAt)fail('date de clôture sur un dossier ouvert');if(!active(r)&&!r.completedAt)fail('date de clôture manquante');if(!consoles.has(r.consoleId))fail('console de réparation introuvable');unique(r.parts);unique(r.tests);unique(r.worklogs);unique(r.photos);for(const p of r.parts){if(!parts.has(p.partId))fail('référence de pièce introuvable');}if(active(r)){if(open.has(r.consoleId))fail('plusieurs réparations ouvertes pour une même console');open.add(r.consoleId);}if(r.timerStartedAt){timers++;if(!active(r))fail('chronomètre sur un dossier fermé');}if(r.stage==='terminee'&&(!r.tests.some(t=>t.result==='pass')||r.tests.some(t=>t.result==='fail'||t.result==='pending')))fail('dossier terminé sans tests validés');}
  if(timers>1)fail('plusieurs chronomètres actifs');
  for(const c of s.consoles){unique(c.photos);if(open.has(c.id)&&(c.archived||c.state!=='en-reparation'))fail('état de console incohérent avec une réparation ouverte');}
  for(const e of s.events){if(e.consoleId&&!consoles.has(e.consoleId))fail('console de journal introuvable');if(e.repairId&&!repairs.has(e.repairId))fail('réparation de journal introuvable');if(e.repairId&&e.consoleId&&s.repairs.find(r=>r.id===e.repairId)?.consoleId!==e.consoleId)fail('journal lié à une autre console');}
  return s;
}
export function csvCell(value: unknown) {
  let s=String(value??'');if(/^[\s]*[=+\-@\t\r]/.test(s))s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';
}
