/* caminho.mjs — lê objetos/<objeto>/caderno.json e diz em que passo do caminho o objeto está: a etapa, o repositório, a skill,
   o comando, o que se espera da pessoa e o passo seguinte. Não muda nada; quem avança é a sessão, e quem aprova é a pessoa.
   uso: npm run caminho -- <objeto> */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { conferirPasta } from '../objetos/conferir.mjs';

const RAIZ = new URL('../../', import.meta.url).pathname;

/* O que cada etapa pede, na ordem do caderno. */
export const ETAPAS = {
  requisitos: {
    repositorio: 'nos-mecatronica', skill: 'alinhar-requisitos',
    comando: 'npm run objetos:conferir -- objetos/<objeto>',
    fazer: 'levantar os requisitos com a pessoa, uma pergunta por vez, e gravar requisitos.json',
    pessoa: 'responder às perguntas e aprovar o resumo dos requisitos',
  },
  componentes: {
    repositorio: 'nos-mecatronica', skill: 'escolher-componentes',
    comando: 'npm run dimensionar -- <objeto> e npm run opcoes -- <objeto>',
    fazer: 'dimensionar as juntas, mostrar as opções de componentes lado a lado e gravar componentes.json com a escolhida',
    pessoa: 'escolher uma das opções',
  },
  forma: {
    repositorio: 'nos-modelar', skill: 'alinhar-modelagem, depois laco-de-modelagem (lá)',
    comando: 'npm run pedido-inicial -- <objeto> --escrever=ponte/exemplos/<objeto>.pedido-inicial.json; no Modelar, npm run exportar:ficha -- <objeto> e npm run conferir:pedido -- <pedido> --escrever',
    fazer: 'gerar o pedido inicial com os componentes; no Modelar, modelar a forma com eles dentro, fixar as etapas da montagem, exportar a ficha e responder o pedido; copiar a ficha para objetos/<objeto>/',
    pessoa: 'decidir a forma no alinhamento e aprová-la por imagem no Modelar',
  },
  simulacao: {
    repositorio: 'nos-mecatronica', skill: 'conduzir-caminho (este passo) e o agente critico-da-simulacao',
    comando: 'npm run simular:ficha -- <objeto>',
    fazer: 'refazer o torque e o erro na ponta com a ficha, despachar o crítico da simulação sem a história e trazer o resultado e o crítico à pessoa',
    pessoa: 'aprovar a simulação ou escolher a troca que o resultado pede',
  },
  pacote: {
    repositorio: 'nos-mecatronica, com o plano em docs/mecatronica/planos/ (o Modelar entra com os arquivos de fabricação, por plano irmão de lá)', skill: 'nenhuma ainda',
    comando: 'nenhum ainda',
    fazer: 'escrever o plano do pacote de construção (lista de compras, arquivos de fabricação, firmware de partida e passo a passo) e pedir a aprovação dele',
    pessoa: 'aprovar o plano do pacote, que ainda não existe',
  },
};

const ORDEM = Object.keys(ETAPAS);
const sub = (texto, objeto) => texto.replaceAll('<objeto>', objeto);

/** O passo de agora a partir do caderno já lido. Devolve `{ etapa, estado, ... }` ou `{ concluido: true }`. */
export function passoDoCaderno(caderno) {
  const atual = caderno.etapas.find((e) => e.estado !== 'aprovada');
  if (!atual) return { objeto: caderno.objeto, concluido: true };
  const d = ETAPAS[atual.etapa];
  const seguinte = ORDEM[ORDEM.indexOf(atual.etapa) + 1] ?? null;
  const base = {
    objeto: caderno.objeto, etapa: atual.etapa, estado: atual.estado, repositorio: d.repositorio, skill: d.skill,
    comando: sub(d.comando, caderno.objeto), seguinte,
  };
  if (atual.estado === 'aguarda-pessoa') {
    return { ...base, fazer: `mostrar à pessoa o resultado da etapa (${atual.arquivos.join(', ') || 'sem arquivo'}) e esperar a frase dela`, pessoa: d.pessoa };
  }
  const reaberta = atual.estado === 'reaberta' ? ` A etapa foi reaberta: ${atual.motivo ?? 'sem motivo'}.` : '';
  return { ...base, fazer: `${sub(d.fazer, caderno.objeto)}.${reaberta}`, pessoa: d.pessoa };
}

export function textoDoPasso(p) {
  if (p.concluido) return `${p.objeto}: as cinco etapas estão aprovadas; o caminho chegou ao fim.`;
  return [
    `${p.objeto}: etapa ${p.etapa} (${p.estado})`,
    `  repositório: ${p.repositorio}`,
    `  skill: ${p.skill}`,
    `  comando: ${p.comando}`,
    `  fazer: ${p.fazer}`,
    `  da pessoa: ${p.pessoa}`,
    `  depois: ${p.seguinte ?? 'o fim do caminho'}`,
  ].join('\n');
}

function executar() {
  const objeto = process.argv.slice(2).find((a) => !a.startsWith('--'));
  if (!objeto && !process.argv.includes('--ajuda')) {
    const pasta = join(RAIZ, 'objetos');
    const objetos = readdirSync(pasta, { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(join(pasta, d.name, 'caderno.json'))).map((d) => d.name);
    console.log(objetos.length ? `objetos com caderno: ${objetos.join(', ')}\nuso: npm run caminho -- <objeto>` : 'nenhum objeto com caderno ainda; o caminho começa pela skill alinhar-requisitos');
    return;
  }
  if (process.argv.includes('--ajuda')) { console.error('uso: npm run caminho -- <objeto>\n  lê objetos/<objeto>/caderno.json e diz o passo de agora'); process.exitCode = 2; return; }
  const pasta = join(RAIZ, 'objetos', objeto);
  if (!existsSync(join(pasta, 'caderno.json'))) { console.error(`objetos/${objeto}/caderno.json não existe: o caminho começa pela skill alinhar-requisitos, que cria a pasta e o caderno`); process.exitCode = 1; return; }
  const r = conferirPasta(pasta, { raiz: RAIZ });
  if (!r.aceito) { console.error(`o caderno ou os arquivos de objetos/${objeto} são recusados; conserte antes de seguir:\n${[].concat(r.texto).join('')}`); process.exitCode = 1; return; }
  console.log(textoDoPasso(passoDoCaderno(JSON.parse(readFileSync(join(pasta, 'caderno.json'), 'utf8')))));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) executar();
