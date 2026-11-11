const { execFileSync } = require('node:child_process');
const ts = require('typescript');
const source = execFileSync('git', ['show', 'HEAD:src/app/page.tsx'], { encoding: 'utf8' });
const file = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
for (const statement of file.statements) {
  if (ts.isImportDeclaration(statement)) console.log(statement.getText(file));
}
console.log(`STATUS\n${execFileSync('git', ['status', '--short'], { encoding: 'utf8' })}`);
