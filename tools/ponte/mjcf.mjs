/* mjcf.mjs — converte a parte física de uma ficha da ponte em MJCF, o formato do MuJoCo. Cada conjunto vira um corpo e
   cada peça um corpo dentro dele, só com a massa, o centro de massa e a inércia (sem geometria: a ficha não traz a caixa
   de cada peça e a malha fica de fora). O conjunto fixo fica preso ao mundo; o móvel nasce no ponto do eixo da junta que
   o liga ao conjunto da peça-pai, com a junta de dobradiça no eixo e no curso da ficha. Converte mm em m, g em kg e
   g·mm² em kg·m², deixa os ângulos em grau e põe a gravidade em -y, porque a ficha tem y para cima. A ficha é conferida
   antes, e a saída depende só da entrada.
   uso: npm run ponte:mjcf -- <ficha> [--saida=<arquivo>] */
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { conferir } from './conferir.mjs';

const M = 1e-3;
const KG = 1e-3;
const KG_M2 = 1e-9;

export function numero(x) {
  const n = Number(x.toPrecision(12));
  return Object.is(n, -0) ? '0' : String(n);
}
const lista = (xs, escala = 1) => xs.map((x) => numero(x * escala)).join(' ');
const menos = (a, b) => a.map((x, i) => x - b[i]);
const atributo = (texto) => String(texto).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/* O MJCF de uma ficha já conferida; recusa (lança) o que a conversão não sabe montar. */
export function gerarMjcf(ficha) {
  const pecasDe = (c) => ficha.pecas.filter((p) => p.conjunto === c);
  const conjuntoDe = new Map(ficha.pecas.map((p) => [p.id, p.conjunto]));
  const juntaDe = new Map();
  for (const j of ficha.juntas) {
    const c = conjuntoDe.get(j.filho);
    if (juntaDe.has(c)) throw new Error(`o conjunto "${c}" é filho de duas juntas ("${juntaDe.get(c).id}" e "${j.id}"); a conversão só monta uma junta por conjunto`);
    if (j.eixo.ausente || j.curso.ausente) throw new Error(`a junta "${j.id}" tem eixo ou curso ausente; a conversão precisa dos dois`);
    juntaDe.set(c, j);
  }
  for (const c of ficha.conjuntos) {
    if (c.movel && !juntaDe.has(c.id)) throw new Error(`o conjunto móvel "${c.id}" não é filho de nenhuma junta`);
  }
  const origemDe = (c) => (juntaDe.has(c) ? juntaDe.get(c).eixo.valor.ponto : [0, 0, 0]);

  const linhas = [];
  const escrever = (nivel, texto) => linhas.push(`${'  '.repeat(nivel)}${texto}`);

  const corpoDaPeca = (p, origem, nivel) => {
    if (p.posicao.ausente) throw new Error(`a peça "${p.id}" tem posição ausente; a conversão precisa dela`);
    const o = p.orientacao.ausente ? null : p.orientacao.valor;
    const giro = o && o.angulo !== 0 ? ` axisangle="${lista(o.eixo)} ${numero(o.angulo)}"` : '';
    escrever(nivel, `<body name="${p.id}" pos="${lista(menos(p.posicao.valor, origem), M)}"${giro}>`);
    if (p.massa.ausente) escrever(nivel + 1, '<!-- massa ausente na ficha: corpo sem inércia -->');
    else {
      const com = p.centroDeMassa.ausente ? [0, 0, 0] : p.centroDeMassa.valor;
      const massa = numero(p.massa.valor * KG);
      if (p.inercia.ausente) {
        escrever(nivel + 1, '<!-- inércia ausente na ficha: massa pontual no centro de massa -->');
        escrever(nivel + 1, `<inertial pos="${lista(com, M)}" mass="${massa}" diaginertia="0 0 0"/>`);
      } else {
        const i = p.inercia.valor;
        const tensor = lista([i.ixx, i.iyy, i.izz, i.ixy, i.ixz, i.iyz], KG_M2);
        escrever(nivel + 1, `<inertial pos="${lista(com, M)}" mass="${massa}" fullinertia="${tensor}"/>`);
      }
    }
    escrever(nivel, '</body>');
  };

  const corpoDoConjunto = (c, origemDoPai, nivel) => {
    const origem = origemDe(c.id);
    escrever(nivel, `<body name="conjunto:${c.id}" pos="${lista(menos(origem, origemDoPai), M)}">`);
    const j = juntaDe.get(c.id);
    if (j) {
      const { min, max } = j.curso.valor;
      escrever(nivel + 1, `<joint name="${j.id}" type="hinge" pos="0 0 0" axis="${lista(j.eixo.valor.direcao)}" limited="true" range="${numero(min)} ${numero(max)}"/>`);
    }
    for (const p of pecasDe(c.id)) corpoDaPeca(p, origem, nivel + 1);
    for (const filho of ficha.conjuntos) {
      const jf = juntaDe.get(filho.id);
      if (jf && conjuntoDe.get(jf.pai) === c.id) corpoDoConjunto(filho, origem, nivel + 1);
    }
    escrever(nivel, '</body>');
  };

  escrever(0, `<mujoco model="${atributo(ficha.objeto)}">`);
  escrever(1, `<!-- gerado de uma ficha da ponte (versão ${atributo(ficha.versao)}, revisão ${ficha.revisao}) por npm run ponte:mjcf; não edite à mão -->`);
  escrever(1, '<compiler angle="degree" inertiafromgeom="false"/>');
  escrever(1, '<option timestep="0.001" gravity="0 -9.81 0"/>');
  escrever(1, '<worldbody>');
  for (const c of ficha.conjuntos) if (!c.movel) corpoDoConjunto(c, [0, 0, 0], 2);
  escrever(1, '</worldbody>');
  escrever(0, '</mujoco>');
  return `${linhas.join('\n')}\n`;
}

function executar() {
  const args = process.argv.slice(2);
  const saida = args.find((a) => a.startsWith('--saida='))?.slice('--saida='.length);
  const arquivos = args.filter((a) => !a.startsWith('--'));
  if (arquivos.length !== 1) {
    console.error('uso: npm run ponte:mjcf -- <ficha> [--saida=<arquivo>]');
    process.exitCode = 2;
    return;
  }
  const ficha = JSON.parse(readFileSync(arquivos[0], 'utf8'));
  const { tipo, erros } = conferir(ficha);
  if (tipo !== 'ficha' || erros.length) {
    console.error(`${arquivos[0]}: recusado; rode npm run ponte:conferir -- ${arquivos[0]} para ver os ${erros.length} problema(s)`);
    process.exitCode = 1;
    return;
  }
  let xml;
  try { xml = gerarMjcf(ficha); } catch (e) { console.error(`${arquivos[0]}: ${e.message}`); process.exitCode = 1; return; }
  if (saida) { writeFileSync(saida, xml); console.log(`${saida} gravado`); } else process.stdout.write(xml);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) executar();
