// Share the existing TypeScript validation rules with Node and the domain tests.
const fs = require('node:fs');
const path = require('node:path');
let ts;
try { ts = require('typescript'); }
catch { ts = require(process.env.TYPESCRIPT_PATH || 'typescript'); }
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'tests', '.compiled');
fs.mkdirSync(output, { recursive: true });
for (const name of ['domain', 'seed']) {
  const result = ts.transpileModule(fs.readFileSync(path.join(root, 'src', name + '.ts'), 'utf8'), {
    fileName: name + '.ts', reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  });
  if ((result.diagnostics || []).some(d => d.category === ts.DiagnosticCategory.Error)) throw new Error('Compilation métier impossible.');
  fs.writeFileSync(path.join(output, name + '.cjs'), result.outputText.replaceAll('require("./domain")', 'require("./domain.cjs")'));
}
