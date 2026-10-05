// Build a single HTML file from the same React/TypeScript application.
// Dependencies must first be installed with npm install. No CDN is used.
import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try {
  const result = await build({
    absWorkingDir: root,
    entryPoints: ['src/main.tsx'],
    outfile: 'app.js',
    bundle: true,
    write: false,
    minify: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2022',
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
    legalComments: 'inline',
  });
  const javascript = result.outputFiles.find(file => file.path.endsWith('.js'))?.text;
  const css = result.outputFiles.find(file => file.path.endsWith('.css'))?.text;
  if (!javascript || !css) throw new Error('La compilation n’a pas produit les scripts et styles attendus.');
  const notices = await readFile(path.join(root, 'THIRD_PARTY_NOTICES.md'), 'utf8');
  const html = `<!doctype html>
<html lang="fr"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#1c5138">
<meta name="description" content="Votre collection de consoles, votre atelier de réparation. Une application locale et autonome.">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">
<title>La Clinique Rétro · Votre atelier</title>
<style>${css.replace(/<\/style/gi, '<\\/style')}</style>
</head><body><noscript>Activez JavaScript pour utiliser La Clinique Rétro.</noscript><div id="root"></div>
<!-- ${notices.replace(/--/g, '—')} -->
<script>${javascript.replace(/<\/script/gi, '<\\/script')}</script>
</body></html>`;
  await mkdir(path.join(root, 'dist'), { recursive: true });
  await writeFile(path.join(root, 'dist', 'index.html'), html);
  console.log(`Édition autonome : dist/index.html (${Math.round(Buffer.byteLength(html) / 1024)} Ko).`);
} catch (error) {
  console.error('Construction autonome impossible :', error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
