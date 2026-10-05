import {type Store,type ConsoleItem,type Repair,type Stage,type Part,emptyStore,defaultTests,localDate,uid} from './domain';
const stamp=(days:number,hour=11)=>{const d=new Date();d.setDate(d.getDate()+days);d.setHours(hour,20,0,0);return d.toISOString();};
const day=(days:number)=>{const d=new Date();d.setDate(d.getDate()+days);return localDate(d);};
export function demoStore(): Store {
  const s=emptyStore();s.settings.demo=true;
  const records=[
    ['Nintendo','Game Boy','DMG-01 · Édition originale','gameboy','en-reparation',25,95,'Bac A1','Brocante'],
    ['Nintendo','Super Nintendo','PAL · SNSP-001A','snes','en-reparation',40,115,'Établi 02','Petites annonces'],
    ['Sony','PlayStation','SCPH-5502 · PAL','playstation','en-reparation',20,75,'Banc de test','Don'],
    ['Sega','Game Gear','VA1 · Double ASIC','gamegear','en-reparation',30,130,'Bac A3','Brocante'],
    ['Sega','Mega Drive II','PAL · MK-1631-50','megadrive','en-reparation',25,85,'Étagère B2','Petites annonces'],
    ['Sega','Dreamcast','PAL · HKT-3030','dreamcast','en-reparation',55,155,'Étagère B1','Collection personnelle'],
    ['Nintendo','Game Boy Color','CGB-001 · Grape','gameboy','fonctionnelle',30,110,'Vitrine 01','Brocante'],
    ['Nintendo','NES','PAL · NES-001','snes','fonctionnelle',35,95,'Vitrine 01','Petites annonces'],
    ['Sony','PlayStation 2','SCPH-39004 · Fat','playstation','fonctionnelle',20,90,'Vitrine 02','Don'],
    ['Sony','PSP','PSP-1004 · Piano Black','switch','a-tester',35,80,'Bac A2','Petites annonces'],
    ['Atari','2600','CX-2600 · Vader','megadrive','en-panne',15,85,'Étagère C1','Brocante'],
    ['Nintendo','Switch Lite','HDH-001 · Turquoise','switch','fonctionnelle',70,125,'Vitrine 02','Petites annonces'],
  ] as const;
  s.consoles=records.map((x,i)=>({id:`console-${i+1}`,code:`CRT-${String(i+1).padStart(3,'0')}`,brand:x[0],model:x[1],variant:x[2],illustration:x[3],state:x[4],purchasePrice:x[5],estimatedValue:x[6],location:x[7],source:x[8],serial:`DEMO-${String(85241+i*177)}`,condition:i%3===0?'Bon état':i%3===1?'Traces d’usage':'Très bon état',acquiredAt:day(-20-i*7),accessories:i%2?'Alimentation, câble vidéo, manette':'Console seule',notes:i===0?'Coque d’origine à conserver. Nettoyage doux des plastiques prévu.':i===3?'Prévoir un remplacement complet des condensateurs après diagnostic.':'Console de démonstration. À remplacer par vos propres données.',photos:[],archived:false,createdAt:stamp(-20-i*7)}) as ConsoleItem);
  s.parts=[
    ['CAP-100-16','Condensateur 100 µF / 16 V','Condensateurs','Game Boy, Game Gear',24,5,0.45,'Tiroir C1','Fournisseur de démonstration'],
    ['MEM-DMG','Membranes de boutons DMG','Boutons & membranes','Game Boy DMG-01',3,2,3.90,'Tiroir B2','Fournisseur de démonstration'],
    ['KIT-GG-VA1','Kit condensateurs Game Gear','Kits de réparation','Game Gear VA1',0,2,12.50,'Tiroir C3','Fournisseur de démonstration'],
    ['FUS-2A','Fusible CMS 2 A','Composants','Multi-consoles',8,3,0.60,'Tiroir C2','Fournisseur de démonstration'],
    ['LAS-KSM440','Bloc optique KSM-440BAM','Lecteurs & optiques','PlayStation',1,1,18.50,'Étagère P1','Fournisseur de démonstration'],
    ['THERM-5G','Pâte thermique 5 g','Consommables','Multi-consoles',4,1,6.20,'Tiroir D1','Fournisseur de démonstration'],
    ['FUSE-DC','Résistance fusible Dreamcast','Composants','Dreamcast',0,2,1.20,'Tiroir C2','Fournisseur de démonstration'],
    ['SCR-DMG','Écran de remplacement DMG','Écrans','Game Boy DMG-01',2,1,24.90,'Étagère P2','Fournisseur de démonstration'],
  ].map((p,i)=>({id:`part-${i+1}`,reference:p[0],name:p[1],category:p[2],compatibility:p[3],quantity:p[4],threshold:p[5],unitCost:p[6],location:p[7],supplier:p[8]}) as Part);
  const jobs:[number,Stage,string,string,string,number][]=[
    [0,'reparation','Redonner de la voix à la Game Boy','Son très faible au haut-parleur, casque fonctionnel.','Oxydation légère sur les contacts du haut-parleur. Condensateur de sortie à remplacer.',2],
    [1,'diagnostic','Écran noir au démarrage','La LED s’allume mais aucune image ne s’affiche.','Vérifier l’alimentation puis le connecteur cartouche. Contrôler le signal vidéo.',3],
    [2,'tests','Remplacement du bloc optique','Lecture des disques intermittente.','Bloc optique usé. Module remplacé, lecture à valider sur plusieurs disques.',0],
    [3,'attente-pieces','Restauration audio et vidéo','Écran peu lumineux et son absent.','Condensateurs vieillissants. Un kit complet VA1 est nécessaire.',6],
    [4,'reception','Connecteur d’alimentation instable','La console s’éteint au moindre mouvement du câble.','',4],
    [5,'a-commander','Ports manettes non détectés','Aucune manette reconnue sur les quatre ports.','Résistance fusible du circuit des ports manettes à remplacer après mesure.',8],
    [6,'terminee','Nettoyage et restauration des commandes','Bouton A peu réactif.','Contacts nettoyés et membranes restaurées.',-5],
    [7,'terminee','Nettoyage du connecteur cartouche','Écran clignotant au démarrage.','Nettoyage du connecteur et test de trois cartouches.',-9],
    [8,'terminee','Entretien du refroidissement','Ventilation bruyante après quelques minutes.','Dépoussiérage, nettoyage du ventilateur et remplacement de la pâte thermique.',-12],
  ];
  s.repairs=jobs.map((x,i)=>{
    const tests=defaultTests();if(x[1]==='terminee')tests.forEach(t=>t.result='pass');if(x[1]==='tests')tests.forEach((t,j)=>t.result=j<3?'pass':'pending');
    const r:Repair={id:`repair-${i+1}`,code:`REP-${String(i+1).padStart(3,'0')}`,consoleId:`console-${x[0]+1}`,title:x[2],symptoms:x[3],diagnosis:x[4],stage:x[1],priority:i===1?'urgente':i===0||i===2?'haute':'normale',dueDate:day(x[5]),createdAt:stamp(-15-i),updatedAt:stamp(i<3?0:-3,9+i%3),completedAt:x[1]==='terminee'?stamp(x[5]):'',parts:[],worklogs:i===4?[]:[{id:uid(),minutes:[45,25,75,30,0,20,50,40,60][i],note:'Diagnostic et intervention initiale',createdAt:stamp(-2-i)}],tests,timerStartedAt:'',photos:[]};
    if(i===0)r.parts=[{id:uid(),partId:'part-1',name:s.parts[0].name,quantity:2,unitCost:0.45,usedAt:stamp(-1)}];
    if(i===2)r.parts=[{id:uid(),partId:'part-5',name:s.parts[4].name,quantity:1,unitCost:18.50,usedAt:stamp(-1)}];
    if(i===8)r.parts=[{id:uid(),partId:'part-6',name:s.parts[5].name,quantity:1,unitCost:6.20,usedAt:stamp(-13)}];
    s.events.push({id:uid(),kind:'created',text:`Dossier ${r.code} ouvert : ${r.title}.`,createdAt:r.createdAt,repairId:r.id,consoleId:r.consoleId});
    if(r.stage!=='reception')s.events.push({id:uid(),kind:'stage',text:`Dossier passé à l’étape « ${x[1]==='terminee'?'Terminée':x[1]==='tests'?'Tests de validation':x[1]==='reparation'?'Réparation en cours':x[1]==='attente-pieces'?'En attente de pièces':x[1]==='a-commander'?'Pièces à commander':'Diagnostic'} ».`,createdAt:r.updatedAt,repairId:r.id,consoleId:r.consoleId});
    return r;
  });
  s.events.push({id:uid(),kind:'note',text:'Contacts du haut-parleur nettoyés. Remplacement des condensateurs effectué, soudure à inspecter avant les tests.',createdAt:stamp(0,11),consoleId:'console-1',repairId:'repair-1'});
  s.events.push({id:uid(),kind:'part',text:'1 × Bloc optique KSM-440BAM utilisé (18,50 €).',createdAt:stamp(-1,16),consoleId:'console-3',repairId:'repair-3'});
  s.events.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));return s;
}
