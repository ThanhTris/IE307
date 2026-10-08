// Parse imports rather than searching text: aliases, dynamic imports and require
// must not allow SDK/UI/network dependencies into the pure domain layer.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../src/domain');
const violations = [];

function check(file) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  function visit(node) {
    let specifier;
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) specifier = node.moduleSpecifier;
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      specifier = node.moduleReference.expression;
    }
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) specifier = node.argument.literal;
    if (ts.isCallExpression(node)) {
      const name = node.expression.getText(source);
      if (name === 'require' || node.expression.kind === ts.SyntaxKind.ImportKeyword) specifier = node.arguments[0];
      if (['fetch', 'globalThis.fetch', 'XMLHttpRequest', 'WebSocket'].includes(name)) {
        violations.push(`${file}: network call ${name}`);
      }
    }
    if (ts.isNewExpression(node) && ['XMLHttpRequest', 'WebSocket'].includes(node.expression.getText(source))) {
      violations.push(`${file}: network constructor`);
    }
    if (specifier) {
      if (!ts.isStringLiteralLike(specifier) || !specifier.text.startsWith('.')) {
        violations.push(`${file}: domain must use local pure imports`);
      } else {
        const target = path.resolve(path.dirname(file), specifier.text);
        if (target !== root && !target.startsWith(root + path.sep)) violations.push(`${file}: import leaves domain`);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}

function walk(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) walk(full);
    else if (/\.tsx?$/.test(item.name)) check(full);
  }
}
walk(root);
if (violations.length) {
  console.error(violations.join('\n'));
  process.exitCode = 1;
} else console.log('Domain boundary OK: local pure imports only.');
