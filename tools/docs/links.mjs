/* links.mjs — confere que todo link relativo em arquivo .md do repositório resolve para um arquivo ou pasta que existe.
   Link externo (com esquema, como https:), âncora pura e link dentro de bloco ou trecho de código ficam fora. */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '../..');
const IGNORADAS = new Set(['.git', 'node_modules', 'tmp', 'build']);

export function arquivosMarkdown(raiz, pasta = raiz) {
  const achados = [];
  for (const entrada of readdirSync(pasta, { withFileTypes: true })) {
    if (IGNORADAS.has(entrada.name)) continue;
    const caminho = join(pasta, entrada.name);
    if (entrada.isDirectory()) achados.push(...arquivosMarkdown(raiz, caminho));
    else if (entrada.name.endsWith('.md')) achados.push(caminho);
  }
  return achados.sort();
}

/* Os destinos de link de um texto markdown, com a linha de cada um, sem o que está em código. */
export function linksDe(texto) {
  const links = [];
  let emBloco = false;
  texto.split('\n').forEach((linha, i) => {
    if (/^\s*(```|~~~)/.test(linha)) { emBloco = !emBloco; return; }
    if (emBloco) return;
    const semCodigo = linha.replace(/`[^`]*`/g, '');
    for (const m of semCodigo.matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) links.push({ destino: m[1], linha: i + 1 });
  });
  return links;
}

export function conferirLinks({ raiz = RAIZ } = {}) {
  const problemas = [];
  const arquivos = arquivosMarkdown(raiz);
  let total = 0;
  for (const arquivo of arquivos) {
    const nome = relative(raiz, arquivo);
    for (const { destino, linha } of linksDe(readFileSync(arquivo, 'utf8'))) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(destino) || destino.startsWith('#')) continue;
      total += 1;
      const caminho = decodeURIComponent(destino.split('#')[0]);
      const alvo = caminho.startsWith('/') ? join(raiz, caminho) : join(dirname(arquivo), caminho);
      if (!existsSync(alvo)) {
        problemas.push(`${nome}:${linha}: o link "${destino}" aponta para ${relative(raiz, alvo)}, que não existe; corrija o caminho ou crie o arquivo`);
      }
    }
  }
  return { problemas, arquivos: arquivos.length, links: total };
}

function executar() {
  if (process.argv.includes('--ajuda')) {
    console.log('uso: node tools/docs/links.mjs\nconfere que todo link relativo dos arquivos .md resolve para um arquivo existente');
    return;
  }
  const { problemas, arquivos, links } = conferirLinks();
  if (problemas.length > 0) {
    console.error(`docs:links:check FALHOU — ${problemas.length} link(s) quebrado(s):`);
    for (const p of problemas) console.error(`  - ${p}`);
    process.exitCode = 1;
    return;
  }
  console.log(`docs:links:check ok — ${links} link(s) relativo(s) em ${arquivos} arquivo(s)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) executar();
