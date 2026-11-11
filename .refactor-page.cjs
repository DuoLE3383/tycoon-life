const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const pagePath = path.resolve('src/app/page.tsx');
const pageText = fs.readFileSync(pagePath, 'utf8');
const configPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, 'tsconfig.json');
const config = ts.readConfigFile(configPath, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd());
const program = ts.createProgram(parsed.fileNames, parsed.options);
const checker = program.getTypeChecker();
const sf = program.getSourceFile(pagePath);
if (!sf) throw new Error('Unable to load src/app/page.tsx');
if (sf.parseDiagnostics.length) {
  throw new Error(ts.formatDiagnosticsWithColorAndContext(sf.parseDiagnostics, {
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getCanonicalFileName: x => x,
    getNewLine: () => '\n',
  }));
}

const groups = {
  WhatsNewModal: 'components/modals/WhatsNewModal.tsx',
  useEscapeKey: 'components/shared.tsx',
  Row: 'components/shared.tsx',
  Btn: 'components/shared.tsx',
  useReqLabel: 'components/shared.tsx',
  Header: 'components/layout/Header.tsx',
  PinZone: 'components/layout/PinZone.tsx',
  EditProfileModal: 'components/modals/EditProfileModal.tsx',
  GigsPopup: 'components/modals/GigsPopup.tsx',
  DonutChart: 'components/charts.tsx',
  BarChart: 'components/charts.tsx',
  NavPopups: 'components/layout/NavPopups.tsx',
  TravelSection: 'components/tabs/HomeTab.tsx',
  HomeTab: 'components/tabs/HomeTab.tsx',
  TipsCard: 'components/tabs/HomeTab.tsx',
  MoreInfoPopup: 'components/tabs/HomeTab.tsx',
  CareerTab: 'components/tabs/CareerTab.tsx',
  EduTab: 'components/tabs/EduTab.tsx',
  BizTab: 'components/tabs/BizTab.tsx',
  BrandEditorModal: 'components/modals/BrandEditorModal.tsx',
  SpaceTab: 'components/tabs/SpaceTab.tsx',
  HealthTab: 'components/tabs/HealthTab.tsx',
  HealthAlerts: 'components/tabs/HealthTab.tsx',
  SpiritTab: 'components/tabs/SpiritTab.tsx',
  HexLines: 'components/tabs/SpiritTab.tsx',
  KinhDichPanel: 'components/tabs/SpiritTab.tsx',
  TuViPanel: 'components/tabs/SpiritTab.tsx',
  PhongThuyPanel: 'components/tabs/SpiritTab.tsx',
  TarotSpreadPanel: 'components/tabs/SpiritTab.tsx',
  AssetsTab: 'components/tabs/AssetsTab.tsx',
  PurchaseConfirm: 'components/modals/PurchaseConfirm.tsx',
  StockTab: 'components/tabs/StockTab.tsx',
  SocialTab: 'components/tabs/SocialTab.tsx',
  ClubTab: 'components/tabs/ClubTab.tsx',
  PetsTab: 'components/tabs/PetsTab.tsx',
  RelationsTab: 'components/tabs/RelationsTab.tsx',
  PortfolioTab: 'components/tabs/PortfolioTab.tsx',
  FinanceOverviewTab: 'components/tabs/FinanceOverviewTab.tsx',
  formatThousands: 'components/tabs/BankTab.tsx',
  parseAmount: 'components/tabs/BankTab.tsx',
  AmountRow: 'components/tabs/BankTab.tsx',
  BankTab: 'components/tabs/BankTab.tsx',
  RankTab: 'components/tabs/RankTab.tsx',
  PowerTab: 'components/tabs/PowerTab.tsx',
  EntityTab: 'components/tabs/EntityTab.tsx',
  FameTab: 'components/tabs/FameTab.tsx',
  LinksTab: 'components/tabs/LinksTab.tsx',
  Intro: 'components/modals/IntroModal.tsx',
  EventModal: 'components/modals/EventModal.tsx',
  GameOver: 'components/modals/EventModal.tsx',
};

const declarationFiles = {
  asset: 'components/gameDeps.ts',
  BUNDLED_VERSION: 'components/gameDeps.ts',
  VERSION_POLL_MS: 'components/gameDeps.ts',
  SEEN_KEY: 'components/gameDeps.ts',
  AVATAR_CHOICES: 'components/modals/EditProfileModal.tsx',
  TIP_KEYS: 'components/tabs/HomeTab.tsx',
  TIP_LINKS: 'components/tabs/HomeTab.tsx',
  TIP_ICONS: 'components/tabs/HomeTab.tsx',
  CATART: 'components/tabs/AssetsTab.tsx',
  LNODES: 'components/tabs/LinksTab.tsx',
  NW: 'components/tabs/LinksTab.tsx',
  NH: 'components/tabs/LinksTab.tsx',
  IH: 'components/tabs/LinksTab.tsx',
  LKEY: 'components/tabs/LinksTab.tsx',
  LEDGES: 'components/tabs/LinksTab.tsx',
  cut: 'components/tabs/LinksTab.tsx',
};
const typeFiles = {
  Act: 'components/shared.tsx',
  TFn: 'components/shared.tsx',
  AssetSec: 'components/tabs/AssetsTab.tsx',
  LEdge: 'components/tabs/LinksTab.tsx',
};

const functionNodes = new Map();
const namedNodes = new Map();
const imports = [];
for (const statement of sf.statements) {
  if (ts.isFunctionDeclaration(statement) && statement.name) {
    functionNodes.set(statement.name.text, statement);
  } else if (ts.isImportDeclaration(statement)) {
    imports.push(statement);
  } else if (ts.isVariableStatement(statement)) {
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name)) namedNodes.set(declaration.name.text, declaration);
    }
  } else if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) {
    namedNodes.set(statement.name.text, statement);
  }
}

for (const name of functionNodes.keys()) {
  if (name !== 'Page' && !groups[name]) throw new Error(`Missing component destination for ${name}`);
}

function sourceText(node) {
  return pageText.slice(node.getFullStart(), node.end);
}

function exportSource(node) {
  const leading = pageText.slice(node.getFullStart(), node.getStart(sf));
  return leading + 'export ' + pageText.slice(node.getStart(sf), node.end);
}

function getImportBinding(symbol) {
  for (const declaration of symbol?.declarations || []) {
    if (ts.isImportSpecifier(declaration)) {
      const clause = declaration.parent.parent;
      const importDecl = clause.parent;
      return {
        name: declaration.name.text,
        typeOnly: declaration.isTypeOnly || clause.isTypeOnly,
        module: importDecl.moduleSpecifier.text,
      };
    }
    if (ts.isNamespaceImport(declaration)) {
      const importDecl = declaration.parent.parent;
      return { name: declaration.name.text, typeOnly: false, module: importDecl.moduleSpecifier.text };
    }
    if (ts.isImportClause(declaration) && declaration.name) {
      const importDecl = declaration.parent;
      return { name: declaration.name.text, typeOnly: declaration.isTypeOnly, module: importDecl.moduleSpecifier.text };
    }
  }
  return null;
}

function collectReferences(nodes) {
  const external = new Map();
  const calledFunctions = new Set();
  const movedDeclarations = new Set();
  const unmappedDeclarations = new Set();
  const scan = node => {
    if (ts.isIdentifier(node)) {
      const symbol = checker.getSymbolAtLocation(node);
      const imported = getImportBinding(symbol);
      if (imported) external.set(imported.name, imported);
      for (const declaration of symbol?.declarations || []) {
        if (ts.isFunctionDeclaration(declaration) && declaration.name && groups[declaration.name.text]) {
          calledFunctions.add(declaration.name.text);
        }
        if (ts.isVariableDeclaration(declaration) && ts.isIdentifier(declaration.name)) {
          const varName = declaration.name.text;
          const declarationStatement = declaration.parent.parent.parent;
          if (declarationStatement === sf) {
            if (declarationFiles[varName]) movedDeclarations.add(varName);
            else unmappedDeclarations.add(varName);
          }
        }
        if ((ts.isTypeAliasDeclaration(declaration) || ts.isInterfaceDeclaration(declaration)) &&
            declaration.parent === sf) {
          if (typeFiles[declaration.name.text]) movedDeclarations.add(declaration.name.text);
          else unmappedDeclarations.add(declaration.name.text);
        }
      }
    }
    ts.forEachChild(node, scan);
  };
  for (const node of nodes) scan(node);
  return { external, calledFunctions, movedDeclarations, unmappedDeclarations };
}

function uniqueRefs(nodes) {
  return collectReferences(nodes);
}

function addSharedImports(names, importsList) {
  for (const name of names) importsList.set(name, { name, typeOnly: ['Act', 'TFn'].includes(name) });
}

function importLine(names, module) {
  if (!names.size) return '';
  const items = [...names.values()].sort((a, b) => a.name.localeCompare(b.name))
    .map(item => item.typeOnly ? `type ${item.name}` : item.name);
  return `import { ${items.join(', ')} } from '${module}';\n`;
}

const fileEntries = new Map();
for (const [name, node] of functionNodes) {
  if (name === 'Page') continue;
  const filename = groups[name];
  if (!fileEntries.has(filename)) fileEntries.set(filename, []);
  fileEntries.get(filename).push({ name, node, start: node.getStart(sf) });
}
for (const [name, filename] of Object.entries(declarationFiles)) {
  const node = namedNodes.get(name);
  if (!node) throw new Error(`Missing moved declaration ${name}`);
  const statement = node.parent;
  if (!fileEntries.has(filename)) fileEntries.set(filename, []);
  fileEntries.get(filename).push({ name, node: statement, start: statement.getStart(sf), declaration: true });
}
for (const [name, filename] of Object.entries(typeFiles)) {
  const node = namedNodes.get(name);
  if (!node) throw new Error(`Missing moved type ${name}`);
  if (!fileEntries.has(filename)) fileEntries.set(filename, []);
  fileEntries.get(filename).push({ name, node, start: node.getStart(sf), declaration: true });
}

const allImportExports = imports.map(statement => {
  let text = pageText.slice(statement.getStart(sf), statement.end);
  text = text.replace(/^import\b/, 'export');
  if (statement.moduleSpecifier.text === './community') {
    text = text.replace("'./community'", "'@/app/community'").replace('"./community"', "'@/app/community'");
  }
  return text;
});

const depsDeclarations = ['asset', 'BUNDLED_VERSION', 'VERSION_POLL_MS', 'SEEN_KEY'].map(name => {
  const node = namedNodes.get(name);
  const statement = ts.isVariableDeclaration(node) ? node.parent.parent : node;
  return exportSource(statement);
});
const depsContent = [
  "'use client';",
  '',
  ...allImportExports,
  '',
  ...depsDeclarations,
].join('\n') + '\n';

const generatedFiles = new Map();
generatedFiles.set('src/components/gameDeps.ts', depsContent);

for (const [filename, entries] of fileEntries) {
  const functions = entries.filter(entry => !entry.declaration);
  const declRefs = entries.map(entry => entry.node);
  const references = uniqueRefs(declRefs);
  const external = new Map(references.external);
  const sharedNames = new Set();
  for (const name of ['Act', 'TFn', 'Row', 'Btn', 'useReqLabel', 'useEscapeKey']) {
    if (references.calledFunctions.has(name) || references.external.has(name)) sharedNames.add(name);
  }
  for (const name of references.movedDeclarations) {
    if (declarationFiles[name] === 'components/gameDeps.ts') {
      external.set(name, { name, typeOnly: false });
    } else if (typeFiles[name] === 'components/shared.tsx') {
      sharedNames.add(name);
    }
  }

  const componentImports = new Map();
  for (const name of references.calledFunctions) {
    const sourceFile = groups[name];
    if (sourceFile && sourceFile !== filename) {
      const item = componentImports.get(sourceFile) || new Set();
      item.add(name);
      componentImports.set(sourceFile, item);
    }
  }
  const importsBlock = [
    importLine(external, '@/components/gameDeps'),
    sharedNames.size ? `import { ${[...sharedNames].sort().map(name => ['Act', 'TFn'].includes(name) ? `type ${name}` : name).join(', ')} } from '@/components/shared';\n` : '',
    ...[...componentImports.entries()].map(([sourceFile, names]) => {
      const module = '@/' + sourceFile.replace(/^src\//, '').replace(/\.tsx?$/, '');
      return `import { ${[...names].sort().join(', ')} } from '${module}';\n`;
    }),
  ].filter(Boolean).join('');

  const emitted = new Set();
  const body = entries.sort((a, b) => a.start - b.start).map(entry => {
    if (emitted.has(entry.node)) return '';
    emitted.add(entry.node);
    if (entry.declaration && (nameIsType(entry.node))) return exportSource(entry.node);
    if (entry.declaration) {
      const raw = sourceText(entry.node);
      if (declarationFiles[entry.name] === 'components/gameDeps.ts') return '';
      return raw;
    }
    return exportSource(entry.node);
  }).filter(Boolean).join('\n\n');

  if (filename === 'components/shared.tsx') {
    const escaped = functionNodes.get('useEscapeKey');
    const actType = namedNodes.get('Act');
    const tfnType = namedNodes.get('TFn');
    const existing = fs.readFileSync('src/components/shared.tsx', 'utf8');
    const additions = [
      exportSource(actType),
      exportSource(tfnType),
      exportSource(escaped),
    ].join('\n\n');
    generatedFiles.set('src/components/shared.tsx', existing.replace(
      "import { useT } from '@/lib/i18n';",
      "import { useT } from '@/lib/i18n';\nimport { useEffect } from 'react';",
    ).replace(
      'export type Act = (fn: (state: GameState) => string | null | void) => void;',
      '',
    ).replace(
      "export type TFn = ReturnType<typeof useT>['t'];",
      '',
    ).replace(/\nexport function Row[\s\S]*?\nexport function useReqLabel[\s\S]*?\n}\n?$/, match => match + '\n\n' + additions + '\n')
    );
  } else {
    generatedFiles.set('src/' + filename, `'use client';\n\n${importsBlock}\n${body}\n`);
  }
}

function nameIsType(node) {
  return ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node);
}

const pageFn = functionNodes.get('Page');
const returnIndex = pageFn.body.statements.findIndex(ts.isReturnStatement);
if (returnIndex < 0) throw new Error('Could not locate Page render return');
const setupStatements = pageFn.body.statements.slice(0, returnIndex);
const returnStatement = pageFn.body.statements[returnIndex];

const controllerNames = new Set();
function addBindingNames(name) {
  if (ts.isIdentifier(name)) controllerNames.add(name.text);
  else if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
    for (const element of name.elements) if (ts.isBindingElement(element)) addBindingNames(element.name);
  }
}
for (const statement of setupStatements) {
  if (ts.isVariableStatement(statement)) {
    for (const declaration of statement.declarationList.declarations) addBindingNames(declaration.name);
  }
  if (ts.isFunctionDeclaration(statement) && statement.name) controllerNames.add(statement.name.text);
}

const jsxNames = new Set();
const jsxScan = node => {
  if (ts.isIdentifier(node)) {
    const symbol = checker.getSymbolAtLocation(node);
    for (const declaration of symbol?.declarations || []) {
      if (ts.isBindingElement(declaration) || ts.isVariableDeclaration(declaration)) {
        let current = declaration;
        while (current && current.parent !== pageFn.body) current = current.parent;
        if (current && current.parent === pageFn.body && controllerNames.has(node.text)) jsxNames.add(node.text);
      }
    }
  }
  ts.forEachChild(node, jsxScan);
};
jsxScan(returnStatement);

const controllerRefs = uniqueRefs(setupStatements);
for (const name of controllerRefs.movedDeclarations) {
  if (declarationFiles[name] === 'components/gameDeps.ts') {
    controllerRefs.external.set(name, { name, typeOnly: false });
  }
}
const controllerImports = importLine(controllerRefs.external, '@/components/gameDeps');
const setupCode = setupStatements.map(sourceText).join('\n');
const controllerCode = [
  "'use client';",
  '',
  controllerImports,
  '',
  'export function useGameController() {',
  setupCode,
  `\n  return { ${[...jsxNames].sort().join(', ')} };`,
  '}',
  '',
].join('\n');
generatedFiles.set('src/components/useGameController.ts', controllerCode);

const pageRefs = uniqueRefs([returnStatement, ...sf.statements.filter(ts.isIfStatement)]);
const pageImports = importLine(pageRefs.external, '@/components/gameDeps');
const pageComponentImports = new Map();
for (const name of pageRefs.calledFunctions) {
  const sourceFile = groups[name];
  if (sourceFile) {
    const item = pageComponentImports.get(sourceFile) || new Set();
    item.add(name);
    pageComponentImports.set(sourceFile, item);
  }
}
pageComponentImports.set('src/components/layout/NavBar.tsx', new Set(['NavBar']));
pageComponentImports.set('src/components/layout/MobileNav.tsx', new Set(['MobileNav']));
const componentImportText = [...pageComponentImports.entries()].map(([sourceFile, names]) => {
  const module = '@/' + sourceFile.replace(/^src\//, '').replace(/\.tsx?$/, '');
  return `import { ${[...names].sort().join(', ')} } from '${module}';`;
}).join('\n');

let pageJSX = pageText.slice(returnStatement.getStart(sf), returnStatement.end);
function replaceElement(className, replacement) {
  const find = node => {
    if (ts.isJsxElement(node)) {
      const opening = node.openingElement;
      if (opening.attributes.properties.some(attr =>
        ts.isJsxAttribute(attr) && attr.name.getText(sf) === 'className' &&
        attr.initializer && ts.isStringLiteral(attr.initializer) && attr.initializer.text === className
      )) return node;
    }
    let result;
    ts.forEachChild(node, child => { if (!result) result = find(child); });
    return result;
  };
  const element = find(returnStatement);
  if (!element) throw new Error(`Could not find JSX element .${className}`);
  const start = element.getStart(sf) - returnStatement.getStart(sf);
  const end = element.end - returnStatement.getStart(sf);
  pageJSX = pageJSX.slice(0, start) + replacement + pageJSX.slice(end);
}

replaceElement('mobile-nav-shell', `<MobileNav s={s} t={t} tab={tab} activeGroup={activeGroup} curSubs={curSubs}
        lastTab={lastTab}
        onSelectGroup={(gid: string, first: string) => setTab(lastTab[gid] || first)}
        onSelectTab={(key: string) => { setTab(key); setLastTab(lt => ({ ...lt, [activeGroup]: key })); }} />`);
replaceElement('sticky-header', `<div className="sticky-header">
        <PinZone s={s} t={t} onEdit={() => setEditingProfile(true)} act={act}
          onNav={(k: string) => { setTab(k); setLastTab(lt => ({ ...lt, [activeGroup]: k })); }}
          expanded={pzExpanded} onToggleExpand={() => setPzExpanded(v => !v)} />
        <NavBar s={s} t={t} tab={tab} activeGroup={activeGroup} curSubs={curSubs}
          lastTab={lastTab} friendActivity={comm.ready && (comm.incoming.length > 0 || comm.unclaimedGifts.length > 0)}
          onSelectGroup={(gid: string, first: string) => setTab(lastTab[gid] || first)}
          onSelectTab={(key: string) => { setTab(key); setLastTab(lt => ({ ...lt, [activeGroup]: key })); }} />
      </div>`);

const setupForPage = [
  "const { " + [...jsxNames].sort().join(', ') + " } = useGameController();",
].join('\n');
const debugStatement = sf.statements.find(ts.isIfStatement);
const debugCode = debugStatement ? sourceText(debugStatement) : '';
const pageCode = [
  "'use client';",
  '',
  pageImports,
  componentImportText,
  `import { useGameController } from '@/components/useGameController';`,
  '',
  debugCode,
  '',
  'export default function Page() {',
  `  ${setupForPage}`,
  `  ${pageJSX}`,
  '}',
  '',
].join('\n');
generatedFiles.set('src/app/page.tsx', pageCode);

generatedFiles.set('src/components/layout/NavBar.tsx', `'use client';

import { Ic } from '@/lib/art';
import { entityTierOf, GROUPS, type GameState } from '@/components/gameDeps';
import type { TFn } from '@/components/shared';

type SubTabs = (typeof GROUPS)[number][3];

export function NavBar({ s, t, tab, activeGroup, curSubs, friendActivity, onSelectGroup, onSelectTab }: {
  s: GameState;
  t: TFn;
  tab: string;
  activeGroup: string;
  curSubs: SubTabs;
  friendActivity: boolean;
  onSelectGroup: (groupId: string, firstTab: string) => void;
  onSelectTab: (tabId: string) => void;
}) {
  const visibleSubs = activeGroup === 'world'
    ? curSubs.filter(([key]) => key !== 'space' || entityTierOf(s) === 'empire' || entityTierOf(s) === 'federation')
    : curSubs;
  return (
    <>
      <nav role="tablist" className="tnav gnav" aria-label="Sections">
        {GROUPS.map(([gid, name, icon, subs]) => {
          const visible = gid === 'world'
            ? subs.filter(([key]) => key !== 'space' || entityTierOf(s) === 'empire' || entityTierOf(s) === 'federation')
            : subs;
          return (
            <button key={gid} role="tab" aria-selected={activeGroup === gid} data-g={gid}
              onClick={() => onSelectGroup(gid, visible[0][0])}>
              {Ic({ id: icon, className: 'si navsi' })}{t('grp.' + gid, name)}
            </button>
          );
        })}
      </nav>
      {visibleSubs.length > 1 && (
        <nav role="tablist" className="tnav subnav" aria-label="Sub-sections">
          {visibleSubs.map(([key, name, icon]) => (
            <button key={key} role="tab" aria-selected={tab === key} data-t={key}
              data-tip={t('ttab.' + key, '')}
              onClick={() => onSelectTab(key)}>
              {Ic({ id: icon, className: 'si navsi' })}{t('tab.' + key, name)}
              {key === 'friends' && friendActivity && <span className="navdot" />}
            </button>
          ))}
        </nav>
      )}
    </>
  );
}
`);

generatedFiles.set('src/components/layout/MobileNav.tsx', `'use client';

import { Ic } from '@/lib/art';
import { entityTierOf, GROUPS, type GameState } from '@/components/gameDeps';
import type { TFn } from '@/components/shared';

type SubTabs = (typeof GROUPS)[number][3];

export function MobileNav({ s, t, tab, activeGroup, curSubs, onSelectGroup, onSelectTab }: {
  s: GameState;
  t: TFn;
  tab: string;
  activeGroup: string;
  curSubs: SubTabs;
  onSelectGroup: (groupId: string, firstTab: string) => void;
  onSelectTab: (tabId: string) => void;
}) {
  const visibleSubs = activeGroup === 'world'
    ? curSubs.filter(([key]) => key !== 'space' || entityTierOf(s) === 'empire' || entityTierOf(s) === 'federation')
    : curSubs;
  return (
    <div className="mobile-nav-shell">
      {visibleSubs.length > 1 && (
        <nav role="tablist" className="mobile-subnav" aria-label="Sub-sections">
          {visibleSubs.map(([key, name, icon]) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key}
              className="mobile-subnav-btn" data-t={key}
              aria-label={t('tab.' + key, name)} onClick={() => onSelectTab(key)}>
              {Ic({ id: icon, className: 'si' })}
            </button>
          ))}
        </nav>
      )}
      <nav role="tablist" className="mobile-bottom-nav" aria-label="Sections">
        {GROUPS.map(([gid, name, icon, subs]) => {
          const visible = gid === 'world'
            ? subs.filter(([key]) => key !== 'space' || entityTierOf(s) === 'empire' || entityTierOf(s) === 'federation')
            : subs;
          return (
            <button key={gid} type="button" role="tab" aria-selected={activeGroup === gid}
              className="mobile-nav-btn" data-g={gid}
              aria-label={t('grp.' + gid, name)} aria-current={activeGroup === gid}
              onClick={() => onSelectGroup(gid, visible[0][0])}>
              {Ic({ id: icon, className: 'si' })}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
`);

for (const [filename, entries] of fileEntries) {
  const refs = uniqueRefs(entries.map(entry => entry.node));
  if (refs.unmappedDeclarations.size) {
    throw new Error(`${filename} uses unmapped top-level declarations: ${[...refs.unmappedDeclarations].join(', ')}`);
  }
}

for (const [file, contents] of generatedFiles) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
}

console.log(`Generated ${generatedFiles.size} files.`);
console.log(`Page JSX uses ${jsxNames.size} controller values.`);
console.log(`Page output: ${pageCode.split('\n').length} lines.`);
