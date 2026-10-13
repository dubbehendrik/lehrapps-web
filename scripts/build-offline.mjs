import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { zipSync, strToU8 } from 'fflate';

const root = resolve(import.meta.dirname, '..');
const revision = process.env.CF_PAGES_COMMIT_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const date = new Date().toISOString().slice(0, 10);
const version = `${date} / ${revision.slice(0, 8)}`;
const example = 'data:image/png;base64,' + (await readFile(resolve(root, 'public/flock-inspector/beispiel.png'))).toString('base64');
const bundle = await build({
  configFile: false,
  root,
  publicDir: false,
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'import.meta.env.VITE_OFFLINE': JSON.stringify('true'),
    'import.meta.env.VITE_OFFLINE_VERSION': JSON.stringify(version),
    'import.meta.env.VITE_OFFLINE_EXAMPLE': JSON.stringify(example),
  },
  worker: { format: 'iife' },
  build: {
    target: 'firefox115',
    write: false,
    sourcemap: false,
    lib: { entry: resolve(root, 'src/offline/main.tsx'), name: 'FlockInspector', formats: ['iife'] },
  },
});
const output = (Array.isArray(bundle) ? bundle : [bundle]).flatMap(item => item.output);
const js = output.filter(item => item.type === 'chunk').map(item => item.code).join('\n');
const css = output.filter(item => item.type === 'asset' && item.fileName.endsWith('.css')).map(item => item.source).join('\n');
if (/process\.env|import\.meta/.test(js)) throw Error('Offline bundle contains unresolved runtime globals.');
if (!js || !css || output.some(item => item.type === 'chunk' && (item.imports.length || item.dynamicImports.length))) throw Error('Offline build must be self-contained.');
const html = `<!doctype html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Flock-Inspector · Offline</title><style>${css.replace(/<\/style/gi, '<\\/style')}</style></head><body><div id="root"></div><script>${js.replace(/<\/script/gi, '<\\/script')}</script></body></html>`;
const readme = `Flock-Inspector – Offline\r\nStand: ${version}\r\nQuellstand: ${revision}\r\n\r\n1. ZIP vollständig in einen eigenen Ordner entpacken.\r\n2. Start-Flock-Inspector.html mit Firefox öffnen: Rechtsklick > Öffnen mit > Firefox.\r\n3. Internet ist für die App nicht erforderlich. Kein Server und keine Administratorrechte nötig.\r\n4. Projekte vor dem Schließen als ZIP speichern; es gibt keine automatische Speicherung.\r\n5. Neue Version von https://lehrapps-web.pages.dev/flock-inspector herunterladen und separat entpacken. Gespeicherte Projekte können wieder geladen werden.\r\n\r\nWindows 7: Firefox 115 ESR oder neuer kompatibler Firefox. Windows 7 SP1 und ausreichender Arbeitsspeicher werden vorausgesetzt. Beide Windows-Architekturen verwenden dasselbe HTML-Paket. Nicht mit Internet Explorer öffnen.\r\nWindows 10/11: aktueller Firefox oder Chrome.\r\nKeine Zusage einer geprüften Windows-7-Ausführung ohne Test auf dem Zielrechner. Das Paket wird auf Firefox-115-kompatible Syntax gebaut.\r\n\r\nDie Funktionen entsprechen dem gemeinsamen Quellcode der Online-App einschließlich Beispielbild, Erkennung, manueller Korrektur, Statistik und Exporten. Externe Links (Support, Download) benötigen eine Verbindung. Kein automatischer Updateabruf.\r\nNutzung ausschließlich für Demonstrations- und Lehrzwecke; Disclaimer in der App beachten.\r\n`;
const packages = ['react', 'react-dom', 'scheduler', 'fflate', 'plotly.js-basic-dist-min', 'react-plotly.js'];
const notices = strToU8((await Promise.all(packages.map(async name => `## ${name}\n\n${await readFile(resolve(root, 'node_modules', name, 'LICENSE'), 'utf8')}`))).join('\n\n'));
const files = {
  'Start-Flock-Inspector.html': strToU8(html),
  'LIESMICH.txt': strToU8(readme),
  'THIRD_PARTY_NOTICES.txt': notices,
  'version.json': strToU8(JSON.stringify({ app: 'Flock-Inspector', date, revision, target: 'firefox115' }, null, 2)),
};
const destination = resolve(root, 'dist/downloads');
await mkdir(destination, { recursive: true });
await writeFile(resolve(destination, 'Flock-Inspector-Offline.zip'), zipSync(files));
console.log(`Offline package: ${version}`);
