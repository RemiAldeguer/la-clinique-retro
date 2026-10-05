// Keep test artifacts out of Git and always compile the current domain sources.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'tests', '.compiled');
fs.mkdirSync(out, {recursive:true});
for (const name of ['domain', 'seed']) {
  const filename = path.join(root, 'src', name + '.ts');
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    reportDiagnostics: true,
    compilerOptions: {target:ts.ScriptTarget.ES2022, module:ts.ModuleKind.CommonJS, esModuleInterop:true},
  });
  const errors = (result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
  if (errors.length) {
    console.error(ts.formatDiagnosticsWithColorAndContext(errors, {
      getCurrentDirectory: () => root, getCanonicalFileName: x => x, getNewLine: () => '\n',
    }));
    process.exit(1);
  }
  fs.writeFileSync(path.join(out, name + '.cjs'), result.outputText.replace('require("./domain")', 'require("./domain.cjs")'));
}
