import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const normalize = value => value.split(path.sep).join('/');
const files = [];
function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const filename = path.join(directory, entry.name);
        if (entry.isDirectory()) walk(filename);
        else if (filename.endsWith('.ts')) files.push(filename);
    }
}
walk(path.join(root, 'modules'));
function domain(filename) {
    const parts = normalize(path.relative(root, filename)).split('/');
    return parts.slice(0, parts[1] === 'streamyard' ? 3 : 2).join('/');
}
const graph = new Map(files.map(file => [domain(file), new Set()]));
const evidence = new Map();
for (const file of files) {
    // TypeScript erases both `import type` and inline type-only imports here.
    const emitted = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
        compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
        fileName: file
    }).outputText;
    const source = ts.createSourceFile(file, emitted, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    function visit(node) {
        let specifier;
        if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) specifier = node.moduleSpecifier;
        else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) specifier = node.arguments[0];
        if (specifier && ts.isStringLiteral(specifier) && specifier.text.startsWith('.')) {
            const base = path.resolve(path.dirname(file), specifier.text);
            const resolved = [base, `${base}.ts`, path.join(base, 'index.ts')].find(candidate =>
                fs.existsSync(candidate) && fs.statSync(candidate).isFile());
            if (resolved && resolved.endsWith('.ts')) {
                const from = domain(file), to = domain(resolved);
                if (from !== to && graph.has(to)) {
                    graph.get(from).add(to);
                    evidence.set(`${from}->${to}`, normalize(path.relative(root, file)));
                }
            }
        }
        ts.forEachChild(node, visit);
    }
    visit(source);
}
const visited = new Set(), active = new Set(), stack = [];
function check(node) {
    if (active.has(node)) {
        const cycle = [...stack.slice(stack.indexOf(node)), node];
        throw new Error(`Runtime module cycle: ${cycle.join(' -> ')}\n` +
            cycle.slice(1).map((to, i) => `${cycle[i]} -> ${to}: ${evidence.get(`${cycle[i]}->${to}`)}`).join('\n'));
    }
    if (visited.has(node)) return;
    active.add(node); stack.push(node);
    for (const next of graph.get(node)) check(next);
    stack.pop(); active.delete(node); visited.add(node);
}
for (const node of graph.keys()) check(node);
console.log(`Module dependencies: ${files.length} files, ${graph.size} domains, no runtime cycles.`);
