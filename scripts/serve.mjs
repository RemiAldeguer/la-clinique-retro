// No npm installation is required to serve the already built application.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
const port=Number(process.env.PORT||4173);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('PORT must be an integer between 1024 and 65535.');
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.json':'application/json'};
if(!fs.existsSync(path.join(root,'index.html')))throw Error('dist/index.html is missing. Build the application first.');
const server=http.createServer((req,res)=>{
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end('Method not allowed');}
 let pathname;try{pathname=decodeURIComponent(new URL(req.url||'/','http://127.0.0.1').pathname);}catch{res.writeHead(400);return res.end('Bad request');}
 const filename=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!filename.startsWith(root+path.sep)){res.writeHead(403);return res.end('Forbidden');}
 fs.stat(filename,(error,stat)=>{
  if(error||!stat.isFile()){res.writeHead(404);return res.end('Not found');}
  res.writeHead(200,{'Content-Type':types[path.extname(filename)]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY'});
  if(req.method==='HEAD')return res.end();
  const stream=fs.createReadStream(filename);stream.on('error',()=>res.destroy());stream.pipe(res);
 });
});
server.on('error',e=>{console.error(`Impossible de démarrer : ${e.message}`);process.exit(1);});
server.listen(port,'127.0.0.1',()=>console.log(`La Clinique Rétro\nOuvrez http://127.0.0.1:${port}\nCtrl+C pour arrêter.\nLes données restent dans votre navigateur.`));
