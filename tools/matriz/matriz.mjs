/* matriz.mjs — a matriz do que se simula: a fonte é docs/mecatronica/matriz.json, uma lista de linhas, e
   docs/mecatronica/MATRIZ.md é gerado dela. `--check` recusa campo inválido, id repetido e MATRIZ.md fora de dia;
   `--gerar` regrava MATRIZ.md. */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '../..');
export const FONTE = 'docs/mecatronica/matriz.json';
export const SAIDA = 'docs/mecatronica/MATRIZ.md';
const COMANDO_GERAR = 'npm run matriz:gerar';

export const CAMADAS = {
  ligacoes: 'Ligações',
  eletrico: 'Elétrico',
  logico: 'Lógico',
  fisico: 'Físico',
  laco: 'Laço fechado',
  ponte: 'Ponte com o Modelar',
  projeto: 'Projeto do objeto',
};
export const DONOS = ['modelar', 'mecatronica', 'ponte'];
export const ESTADOS = ['falta', 'parcial', 'feito'];
const OBRIGATORIOS = ['id', 'camada', 'capacidade', 'dono', 'estado', 'prova', 'naoCobre'];
const OPCIONAIS = ['origem'];
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/* Os problemas de uma lista de linhas já lida do JSON; cada um diz a linha, o campo, o valor e o que se espera. */
export function validarMatriz(linhas) {
  if (!Array.isArray(linhas)) return [`${FONTE}: a raiz tem de ser uma lista de linhas, e veio ${typeof linhas}`];
  const problemas = [];
  const vistos = new Map();
  linhas.forEach((linha, i) => {
    const onde = `${FONTE}, linha ${i + 1}${linha && typeof linha.id === 'string' ? ` (${linha.id})` : ''}`;
    if (!linha || typeof linha !== 'object' || Array.isArray(linha)) { problemas.push(`${onde}: cada linha é um objeto, e veio ${JSON.stringify(linha)}`); return; }
    for (const chave of Object.keys(linha)) {
      if (!OBRIGATORIOS.includes(chave) && !OPCIONAIS.includes(chave)) {
        problemas.push(`${onde}: campo "${chave}" desconhecido; os campos são ${[...OBRIGATORIOS, ...OPCIONAIS].join(', ')}`);
      }
    }
    for (const chave of OBRIGATORIOS) {
      if (typeof linha[chave] !== 'string' || !linha[chave].trim()) problemas.push(`${onde}: campo "${chave}" ausente ou vazio; escreva um texto`);
    }
    if ('origem' in linha && (typeof linha.origem !== 'string' || !linha.origem.trim())) {
      problemas.push(`${onde}: campo "origem" vazio; escreva de onde vem ou tire o campo`);
    }
    if (typeof linha.id === 'string' && linha.id && !ID.test(linha.id)) {
      problemas.push(`${onde}: id "${linha.id}" inválido; use minúsculas, algarismos e hífen, como "lig-polaridade"`);
    }
    const enumerado = (chave, aceitos) => {
      if (typeof linha[chave] === 'string' && linha[chave] && !aceitos.includes(linha[chave])) {
        problemas.push(`${onde}: ${chave} "${linha[chave]}" não vale; use um de ${aceitos.join(', ')}`);
      }
    };
    enumerado('camada', Object.keys(CAMADAS));
    enumerado('dono', DONOS);
    enumerado('estado', ESTADOS);
    if (typeof linha.id === 'string' && linha.id) {
      if (vistos.has(linha.id)) problemas.push(`${onde}: id "${linha.id}" repetido, já usado na linha ${vistos.get(linha.id)}; dê um id único`);
      else vistos.set(linha.id, i + 1);
    }
  });
  return problemas;
}

const celula = (texto) => String(texto ?? '').replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ');

/* O texto de MATRIZ.md para uma lista de linhas válida. */
export function gerarMarkdown(linhas) {
  const saida = [
    '# Matriz da simulação',
    '',
    `Gerado de \`${FONTE}\` por \`${COMANDO_GERAR}\`; não edite à mão. Cada linha é uma capacidade que a simulação precisa ter para achar um erro de projeto antes do teste prático, com quem a faz, em que estado está, como se prova e o que a simulação não substitui. Na coluna origem, \`eletrifica:<caminho>\` é um arquivo do [Eletrifica](https://github.com/brigsd/Eletrifica), de onde vem o que já existe ou a evidência que pede a linha.`,
    '',
    '## Resumo por estado',
    '',
    `| Camada | ${ESTADOS.join(' | ')} | total |`,
    `| --- | ${ESTADOS.map(() => '---:').join(' | ')} | ---: |`,
  ];
  const contar = (filtro) => ESTADOS.map((e) => linhas.filter((l) => filtro(l) && l.estado === e).length);
  for (const [chave, nome] of Object.entries(CAMADAS)) {
    const n = contar((l) => l.camada === chave);
    saida.push(`| ${nome} | ${n.join(' | ')} | ${n.reduce((a, b) => a + b, 0)} |`);
  }
  const total = contar(() => true);
  saida.push(`| Todas | ${total.join(' | ')} | ${linhas.length} |`, '');
  for (const [chave, nome] of Object.entries(CAMADAS)) {
    const daCamada = linhas.filter((l) => l.camada === chave);
    saida.push(`## ${nome}`, '');
    if (daCamada.length === 0) { saida.push('Nenhuma linha ainda.', ''); continue; }
    saida.push('| id | capacidade | dono | estado | como se prova | o que não cobre | origem |', '| --- | --- | --- | --- | --- | --- | --- |');
    for (const l of daCamada) {
      saida.push(`| \`${l.id}\` | ${celula(l.capacidade)} | ${l.dono} | ${l.estado} | ${celula(l.prova)} | ${celula(l.naoCobre)} | ${l.origem ? `\`${celula(l.origem)}\`` : ''} |`);
    }
    saida.push('');
  }
  return saida.join('\n');
}

function lerFonte(raiz) {
  const caminho = join(raiz, FONTE);
  if (!existsSync(caminho)) return { problemas: [`${FONTE} não existe; crie-o com uma lista JSON de linhas, mesmo vazia: []`] };
  try { return { linhas: JSON.parse(readFileSync(caminho, 'utf8')), problemas: [] }; } catch (erro) {
    return { problemas: [`${FONTE} não é JSON válido (${erro.message}); corrija a sintaxe`] };
  }
}

export function conferirMatriz({ raiz = RAIZ } = {}) {
  const { linhas, problemas } = lerFonte(raiz);
  if (problemas.length) return { problemas, linhas: [] };
  problemas.push(...validarMatriz(linhas));
  if (problemas.length) return { problemas, linhas };
  const saida = join(raiz, SAIDA);
  if (!existsSync(saida)) problemas.push(`${SAIDA} não existe; rode \`${COMANDO_GERAR}\``);
  else if (readFileSync(saida, 'utf8') !== gerarMarkdown(linhas)) problemas.push(`${SAIDA} está fora de dia com ${FONTE}; rode \`${COMANDO_GERAR}\` e não edite o .md à mão`);
  return { problemas, linhas };
}

export function gerarMatriz({ raiz = RAIZ } = {}) {
  const { linhas, problemas } = lerFonte(raiz);
  if (problemas.length) return { problemas, linhas: [] };
  problemas.push(...validarMatriz(linhas));
  if (!problemas.length) writeFileSync(join(raiz, SAIDA), gerarMarkdown(linhas));
  return { problemas, linhas };
}

function executar() {
  if (process.argv.includes('--ajuda')) {
    console.log(`uso: node tools/matriz/matriz.mjs --check | --gerar\n--check confere ${FONTE} e se ${SAIDA} está em dia; --gerar regrava ${SAIDA}`);
    return;
  }
  const gerar = process.argv.includes('--gerar');
  const nome = gerar ? 'matriz:gerar' : 'matriz:check';
  const { problemas, linhas } = gerar ? gerarMatriz() : conferirMatriz();
  if (problemas.length) {
    console.error(`${nome} FALHOU — ${problemas.length} problema(s):`);
    for (const p of problemas) console.error(`  - ${p}`);
    process.exitCode = 1;
    return;
  }
  const porEstado = ESTADOS.map((e) => `${linhas.filter((l) => l.estado === e).length} ${e}`).join(', ');
  console.log(`${nome} ok — ${linhas.length} linha(s): ${porEstado}${gerar ? `; ${SAIDA} regravado` : ''}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) executar();
