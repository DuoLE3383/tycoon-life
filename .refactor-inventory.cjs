const fs = require('node:fs');
const ts = require('typescript');
const file = 'src/app/page.tsx';
const source = fs.readFileSync(file, 'utf8');
const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const functions = new Map();
for (const node of sf.statements) {
  const start = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
  const end = sf.getLineAndCharacterOfPosition(node.end).line + 1;
  const name = node.name?.text || '';
  const kind = ts.SyntaxKind[node.kind];
  if (ts.isFunctionDeclaration(node) && name) functions.set(name, node);
  let detail = name;
  if (ts.isVariableStatement(node)) detail = node.declarationList.declarations.map(d => d.name.getText(sf)).join(', ');
  if (ts.isImportDeclaration(node)) detail = node.moduleSpecifier.text;
  console.log(`${start}-${end}\t${kind}\t${detail}`);
}
for (const [name, node] of functions) {
  const refs = new Set();
  const scan = n => {
    if (ts.isIdentifier(n) && functions.has(n.text) && n.text !== name) refs.add(n.text);
    ts.forEachChild(n, scan);
  };
  scan(node.body);
  if (refs.size) console.log(`REF\t${name}\t${[...refs].join(', ')}`);
}
