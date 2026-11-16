/* gates.mjs — roda todos os gates em sequência e relata todos, sem parar no primeiro que falha: cada um aparece como
   verde ou vermelho, e o fim diz quantos passaram e quais falharam. A saída é não zero se qualquer um falhar. */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

export const GATES = [
  ['planos:check', ['tools/mapa/planos.mjs', '--check']],
  ['matriz:check', ['tools/matriz/matriz.mjs', '--check']],
  ['docs:links:check', ['tools/docs/links.mjs']],
  ['test', ['node_modules/vitest/vitest.mjs', 'run']],
];

const resultados = [];
for (const [nome, args] of GATES) {
  console.log(`\n── ${nome}`);
  const r = spawnSync(process.execPath, args, { cwd: RAIZ, stdio: 'inherit' });
  const verde = r.status === 0;
  if (r.error) console.error(r.error.message);
  console.log(`${verde ? 'verde' : 'VERMELHO'} — ${nome}`);
  resultados.push({ nome, verde });
}

const falhas = resultados.filter((r) => !r.verde).map((r) => r.nome);
console.log(`\n${resultados.length - falhas.length}/${resultados.length} gates verdes`);
if (falhas.length) {
  console.log(`falharam: ${falhas.join(', ')}`);
  process.exitCode = 1;
}
