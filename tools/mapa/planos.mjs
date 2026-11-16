/* planos.mjs — confere os planos de docs/mecatronica/planos/: estado válido, teto de linhas, até seis ativos, cada ativo
   com território próprio, plano raiz fora de jogo, e o índice e o README.md da raiz dizendo os mesmos planos ativos.
   Versão enxuta de tools/mapa/planos.mjs do Modelar. */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '../..');
export const ESTADOS = ['rascunho', 'pronto', 'ativo', 'concluído', 'cancelado', 'congelado'];
const EM_JOGO = new Set(['rascunho', 'pronto', 'ativo']);
const NOME_PLANO = /^\d{4}-\d{2}-\d{2}-.+\.md$/;
export const TETO_DE_LINHAS = 300;
export const MAXIMO_DE_ATIVOS = 6;

/* Caminhos que todo plano pode mudar sem disputar território: o índice de planos, a matriz e o ferramental comum. */
export const CAMINHOS_COMPARTILHADOS = [
  'docs/mecatronica/planos/',
  'docs/mecatronica/matriz.json',
  'docs/mecatronica/MATRIZ.md',
  'tools/gates.mjs',
  '.github/workflows/',
  'package.json',
  'package-lock.json',
];

function planosDe(pasta, prefixo = '') {
  const achados = [];
  for (const entrada of readdirSync(pasta, { withFileTypes: true })) {
    const relativo = prefixo ? `${prefixo}/${entrada.name}` : entrada.name;
    if (entrada.isDirectory()) achados.push(...planosDe(join(pasta, entrada.name), relativo));
    else if (NOME_PLANO.test(entrada.name)) achados.push({ nome: relativo, caminho: join(pasta, entrada.name), naRaiz: !prefixo });
  }
  return achados.sort((a, b) => a.nome.localeCompare(b.nome));
}

function contarLinhas(texto) {
  const normal = texto.replace(/\r\n/g, '\n').replace(/\n$/, '');
  return normal ? normal.split('\n').length : 0;
}

function campo(texto, nome) {
  return texto.match(new RegExp(`^\\*\\*${nome}:\\*\\*\\s*(.*?)\\s*$`, 'mi'))?.[1];
}

export function sobrepoe(a, b) {
  return a === b || (a.endsWith('/') && b.startsWith(a)) || (b.endsWith('/') && a.startsWith(b));
}

/* O território de um plano ativo: { caminhos } (vazio quando aguarda aprovação) ou { problema }. */
export function territorioDe(texto) {
  const linha = campo(texto, 'Território');
  if (linha === undefined) {
    return { problema: 'está ativo sem a linha **Território:**; declare os caminhos que ele muda, entre crases, ou "nenhum (aguarda aprovação)"' };
  }
  if (/^nenhum \(aguarda aprovação\)\.?$/i.test(linha)) return { caminhos: [] };
  const caminhos = [...linha.matchAll(/`([^`]+)`/g)].map((m) => m[1].trim());
  if (caminhos.length === 0) {
    return { problema: `**Território:** "${linha}" não tem caminho entre crases; liste os caminhos assim, ou escreva "nenhum (aguarda aprovação)"` };
  }
  const invalido = caminhos.find((c) => !c || c.startsWith('/') || c.includes('..') || /\s/.test(c));
  if (invalido !== undefined) {
    return { problema: `**Território:** caminho "${invalido}" inválido; use caminho relativo à raiz, sem espaço nem "..", com pasta terminada em "/"` };
  }
  return { caminhos: caminhos.filter((c) => !CAMINHOS_COMPARTILHADOS.some((s) => sobrepoe(c, s))) };
}

/* Os nomes de arquivo listados depois da marca, no resto da linha ou na lista logo abaixo dela; [] para "nenhum";
   undefined quando a marca falta ou não diz nada legível. */
export function ativosDeclarados(texto, marca) {
  const achado = marca.exec(texto);
  if (!achado) return undefined;
  const linhas = [achado[1]];
  const seguintes = texto.slice(achado.index + achado[0].length).replace(/^\n/, '').split('\n');
  if (!achado[1].trim()) {
    let i = 0;
    while (i < seguintes.length && !seguintes[i].trim()) i++;
    for (; i < seguintes.length && seguintes[i].trim(); i++) linhas.push(seguintes[i]);
  }
  const bloco = linhas.join('\n');
  const nomes = [...bloco.matchAll(/\]\(([^)]+\.md)(?:#[^)]*)?\)/g)].map((m) => m[1].split('/').pop());
  if (nomes.length === 0 && !/\bnenhum\b/i.test(bloco)) return undefined;
  return nomes;
}

const MARCA_INDICE = /^\*\*Planos ativos:\*\*(.*)$/m;
const MARCA_RAIZ = /^Planos ativos:(.*)$/m;

export function conferirPlanos({
  pasta = join(RAIZ, 'docs/mecatronica/planos'),
  indice = join(pasta, 'README.md'),
  readme = join(RAIZ, 'README.md'),
} = {}) {
  const problemas = [];
  const rotulo = 'docs/mecatronica/planos';
  if (!existsSync(pasta)) return { problemas: [`a pasta de planos ${pasta} não existe; crie-a com o README.md do índice`], planos: [], ativos: [] };
  if (!existsSync(indice)) return { problemas: [`${rotulo}/README.md não existe; crie o índice com a linha "**Planos ativos:** nenhum."`], planos: [], ativos: [] };

  const planos = planosDe(pasta).map(({ nome, caminho, naRaiz }) => {
    const texto = readFileSync(caminho, 'utf8');
    const linhas = contarLinhas(texto);
    const estado = campo(texto, 'Estado')?.toLowerCase();
    const tipo = campo(texto, 'Tipo')?.toLowerCase();
    const onde = `${rotulo}/${nome}`;
    if (linhas > TETO_DE_LINHAS) problemas.push(`${onde}: tem ${linhas} linhas e o teto é ${TETO_DE_LINHAS}; corte repetição ou divida o plano`);
    if (!estado || !ESTADOS.includes(estado)) {
      problemas.push(`${onde}: **Estado:** "${estado ?? '(ausente)'}" não vale; use um de ${ESTADOS.join(', ')}`);
    }
    if (!naRaiz && EM_JOGO.has(estado)) {
      problemas.push(`${onde}: está em subpasta com estado "${estado}"; plano em jogo mora na raiz de planos/, mova-o para lá`);
    }
    if (tipo === 'raiz' && (estado === 'ativo' || estado === 'pronto')) {
      problemas.push(`${onde}: é **Tipo:** raiz e está "${estado}"; plano raiz só organiza os outros, deixe-o em rascunho ou congelado e ative um plano filho`);
    }
    return { nome, texto, estado, linhas, naRaiz };
  });

  const ativos = planos.filter((p) => p.estado === 'ativo');
  if (ativos.length > MAXIMO_DE_ATIVOS) {
    problemas.push(`há ${ativos.length} planos ativos e o máximo é ${MAXIMO_DE_ATIVOS} (${ativos.map((p) => p.nome).join(', ')}); conclua, congele ou cancele algum antes de ativar outro`);
  }

  const territorios = [];
  for (const plano of ativos) {
    const { problema, caminhos } = territorioDe(plano.texto);
    if (problema) problemas.push(`${rotulo}/${plano.nome}: ${problema}`);
    else territorios.push({ nome: plano.nome, caminhos });
  }
  for (let i = 0; i < territorios.length; i++) {
    for (let j = i + 1; j < territorios.length; j++) {
      for (const a of territorios[i].caminhos) {
        for (const b of territorios[j].caminhos) {
          if (sobrepoe(a, b)) {
            problemas.push(`os territórios de ${territorios[i].nome} e ${territorios[j].nome} se sobrepõem em "${a.length <= b.length ? a : b}"; tire o caminho de um dos dois ou espere o outro encerrar`);
          }
        }
      }
    }
  }

  const textoIndice = readFileSync(indice, 'utf8');
  const nomesAtivos = ativos.map((p) => p.nome).sort();
  const conferirLista = (onde, listados, esperado) => {
    if (!listados) { problemas.push(`${onde}: não declara os planos ativos; escreva ${esperado} seguido dos links dos ativos, ou "nenhum."`); return; }
    for (const nome of listados) if (!nomesAtivos.includes(nome)) problemas.push(`${onde}: lista como ativo ${nome}, que não está ativo; tire-o da lista ou ative o plano`);
    for (const nome of nomesAtivos) if (!listados.includes(nome)) problemas.push(`${onde}: não lista o plano ativo ${nome}; acrescente o link dele em ${esperado}`);
    if (new Set(listados).size !== listados.length) problemas.push(`${onde}: lista o mesmo plano ativo mais de uma vez; deixe um link por plano`);
  };
  conferirLista(`${rotulo}/README.md`, ativosDeclarados(textoIndice, MARCA_INDICE), '"**Planos ativos:**"');
  if (!existsSync(readme)) problemas.push('README.md da raiz não existe; crie-o com o parágrafo "Planos ativos: nenhum."');
  else conferirLista('README.md', ativosDeclarados(readFileSync(readme, 'utf8'), MARCA_RAIZ), 'o parágrafo "Planos ativos:"');

  const ligados = new Set([...textoIndice.matchAll(/\]\(([^)]+\.md)(?:#[^)]*)?\)/g)].map((m) => m[1].split('/').pop()));
  for (const plano of planos) {
    if (plano.naRaiz && (plano.estado === 'rascunho' || plano.estado === 'pronto') && !ligados.has(plano.nome)) {
      problemas.push(`${rotulo}/README.md: não liga o plano em "${plano.estado}" ${plano.nome}; ponha um link para ele no índice ou encerre-o`);
    }
  }

  return { problemas, planos, ativos };
}

function executar() {
  if (process.argv.includes('--ajuda')) {
    console.log('uso: node tools/mapa/planos.mjs --check\nconfere estado, teto de linhas, ativos, territórios e as listas de planos ativos');
    return;
  }
  const { problemas, planos, ativos } = conferirPlanos();
  if (problemas.length > 0) {
    console.error(`planos:check FALHOU — ${problemas.length} problema(s):`);
    for (const p of problemas) console.error(`  - ${p}`);
    process.exitCode = 1;
    return;
  }
  console.log(`planos:check ok — ${planos.length} plano(s), ${ativos.length} ativo(s)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) executar();
