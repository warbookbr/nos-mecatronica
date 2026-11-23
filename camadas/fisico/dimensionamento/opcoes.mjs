/* opcoes.mjs — cruza objetos/<objeto>/dimensionamento.json com o catálogo de componentes/ e grava
   objetos/<objeto>/opcoes.json com duas ou três combinações de motor e redução por junta, driver, fonte e placa: a mais
   barata, a de maior folga e a que usa mais do que a pessoa já tem (quando duas coincidem, ficam numa opção só, com os
   dois critérios; a de maior folga pode passar do orçamento e diz quanto). Cada uma diz o torque disponível na velocidade pedida, tirado da curva, a folga, a corrente contra a
   fonte, o custo contra o orçamento e as medidas. A junta 1 se refaz para cada conjunto da junta 2, porque a massa
   dele vai no cotovelo. Só entra combinação com folga igual ou acima da mínima nas duas juntas; se nenhuma couber no
   orçamento, as opções saem assim mesmo com quanto passam dele, e se nenhuma cobrir o torque, o arquivo diz o que falta.
   uso: npm run opcoes -- <objeto> [--check]     --check só confere que o arquivo gravado está em dia */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { lerCatalogo } from '../../../tools/componentes/conferir.mjs';
import { dimensionarBraco } from './braco.mjs';
import { conjuntos, entradas, gravarOuConferir, HIPOTESES, lerRequisitos, texto } from './dimensionar.mjs';
import { avaliarJunta } from './selecao.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const GRAUS = 180 / Math.PI;

/* A corrente que a fonte dá a cada motor, como fração da corrente de fase aplicada, e a da placa e do regulador. */
export const CORRENTE_DA_FONTE = {
  porFase: { valor: 2 / 3, origem: 'estimativa', nota: 'O driver chaveado tira da fonte cerca de dois terços da corrente de fase que aplica no motor, regra usual de dimensionamento de fonte para motor de passo.' },
  placa: { valor: 0.5, origem: 'estimativa', nota: 'A placa de controle e o regulador de 5 V, com folga.' },
};

const arred = (x, casas) => Number(x.toFixed(casas));

/* A hipótese do dimensionamento gravado, ou a padrão quando o arquivo não a traz. */
function hipotesesDe(dimensionamento) {
  return Object.fromEntries(Object.keys(HIPOTESES).map((k) => [k, dimensionamento.hipoteses?.[k] ?? HIPOTESES[k]]));
}

function saidaDaJunta(id, pedido, c) {
  const a = c.avaliacao;
  return {
    junta: id,
    motor: c.motor.id,
    reducao: c.reducao.id,
    driver: c.driver.id,
    torqueTotal: arred(pedido.torque, 4),
    velocidadeDaJunta: arred(pedido.velocidade * GRAUS, 1),
    rpmDoMotor: arred(a.rpmDoMotor, 1),
    torqueDaCurva: arred(a.torqueDaCurva, 4),
    correnteAplicada: arred(a.correnteAplicada, 2),
    torqueDisponivel: arred(a.torqueDisponivel, 4),
    limitadoPor: a.limitadoPor,
    folga: arred(a.folga, 2),
  };
}

/* O documento opcoes.json de um objeto. */
export function gerarOpcoes(requisitos, dimensionamento, catalogo) {
  const folgaMinima = dimensionamento.entradas.folgaMinima.valor;
  const e = entradas(requisitos, hipotesesDe(dimensionamento));
  const lista = conjuntos(catalogo, e.tensao);
  const orcamento = requisitos.orcamento.quantia.valor;
  const fontes = catalogo.filter((c) => c.categoria === 'fonte' && c.especificacao.tensao.valor === e.tensao);
  const placas = catalogo.filter((c) => c.categoria === 'placa-de-controle');
  const contagem = { conjuntosPorJunta: lista.length, junta2ComFolga: 0, junta1ComFolga: 0, semFonte: 0, semPlaca: 0, combinacoes: 0 };

  const base = dimensionarBraco({ ...e, massaNoCotovelo: 0 });
  const pedido2 = { torque: base.juntas[1].torqueTotal, velocidade: base.juntas[1].velocidade };
  const avaliar = (pedido) => lista.map((c) => ({ ...c, avaliacao: avaliarJunta(pedido, c.motor, c.reducao, c.driver) })).filter((c) => c.avaliacao.folga >= folgaMinima);
  const junta2 = avaliar(pedido2);
  contagem.junta2ComFolga = junta2.length;

  const porMassa = new Map();
  const combinacoes = [];
  for (const c2 of junta2) {
    const massa = c2.avaliacao.massa;
    if (!porMassa.has(massa)) {
      const j1 = dimensionarBraco({ ...e, massaNoCotovelo: massa }).juntas[0];
      const pedido1 = { torque: j1.torqueTotal, velocidade: j1.velocidade };
      porMassa.set(massa, { pedido1, gravidade1: j1.torqueGravidade, aceleracao1: j1.torqueAceleracao, junta1: avaliar(pedido1) });
    }
    const { pedido1, gravidade1, aceleracao1, junta1 } = porMassa.get(massa);
    for (const c1 of junta1) {
      contagem.junta1ComFolga++;
      for (const fonte of fontes) {
        for (const placa of placas) {
          const pinos = 2 * 2 + 1;
          if (placa.especificacao.pinosDigitais.valor < pinos) { contagem.semPlaca++; continue; }
          const logica = placa.especificacao.tensaoLogica.valor;
          if ([c1, c2].some((c) => logica < c.driver.especificacao.tensaoLogica.valor[0] || logica > c.driver.especificacao.tensaoLogica.valor[1])) { contagem.semPlaca++; continue; }
          const demanda = CORRENTE_DA_FONTE.porFase.valor * (c1.avaliacao.correnteAplicada + c2.avaliacao.correnteAplicada) + CORRENTE_DA_FONTE.placa.valor;
          if (demanda > fonte.especificacao.corrente.valor) { contagem.semFonte++; continue; }
          combinacoes.push({ c1, c2, fonte, placa, pedido1, pedido2, gravidade1, aceleracao1, massa, demanda });
        }
      }
    }
  }
  contagem.combinacoes = combinacoes.length;

  for (const k of combinacoes) {
    const itens = new Map();
    for (const comp of [k.c1.motor, k.c1.reducao, k.c1.driver, k.c2.motor, k.c2.reducao, k.c2.driver, k.fonte, k.placa]) {
      const atual = itens.get(comp.id) ?? { componente: comp, quantidade: 0 };
      atual.quantidade++;
      itens.set(comp.id, atual);
    }
    k.itens = [...itens.values()].sort((a, b) => a.componente.id.localeCompare(b.componente.id));
    const compra = k.itens.filter((i) => !i.componente.jaTem);
    k.custo = [0, 1].map((n) => compra.reduce((s, i) => s + i.quantidade * i.componente.preco.faixa[n], 0));
    k.jaTem = k.itens.filter((i) => i.componente.jaTem).length;
    k.folga = Math.min(k.c1.avaliacao.folga, k.c2.avaliacao.folga);
    k.chave = [k.c1, k.c2].map((c) => `${c.motor.id}/${c.reducao.id}/${c.driver.id}`).concat(k.fonte.id, k.placa.id).join(' ');
  }
  const cabem = combinacoes.filter((k) => k.custo[1] <= orcamento);
  const universo = cabem.length ? cabem : combinacoes;
  const barata = (a, b) => a.custo[1] - b.custo[1] || a.custo[0] - b.custo[0] || b.folga - a.folga || a.chave.localeCompare(b.chave);
  const criterios = [
    ['mais-barata', universo, barata],
    ['maior-folga', combinacoes, (a, b) => b.folga - a.folga || barata(a, b)],
    ['usa-o-que-ja-tem', universo, (a, b) => b.jaTem - a.jaTem || barata(a, b)],
  ];
  const escolhidas = [];
  for (const [nome, entre, ordem] of criterios) {
    const melhor = [...entre].sort(ordem)[0];
    if (!melhor) continue;
    const ja = escolhidas.find((x) => x.k === melhor);
    if (ja) ja.criterios.push(nome);
    else escolhidas.push({ k: melhor, criterios: [nome] });
  }

  const opcoes = escolhidas.map(({ k, criterios: crit }, i) => ({
    id: `opcao-${i + 1}`,
    criterios: crit,
    juntas: [saidaDaJunta('junta-1', k.pedido1, k.c1), saidaDaJunta('junta-2', k.pedido2, k.c2)],
    torqueDaJunta1: { gravidade: arred(k.gravidade1, 4), aceleracao: arred(k.aceleracao1, 4), massaNoCotovelo: k.massa },
    folga: arred(k.folga, 2),
    fonte: k.fonte.id,
    placa: k.placa.id,
    corrente: { demanda: arred(k.demanda, 2), daFonte: k.fonte.especificacao.corrente.valor },
    custo: {
      faixa: k.custo,
      orcamento,
      cabe: k.custo[1] <= orcamento,
      passaDoOrcamento: Math.max(0, k.custo[1] - orcamento),
      jaTem: k.itens.filter((x) => x.componente.jaTem).map((x) => x.componente.id),
      itens: k.itens.map((x) => ({ id: x.componente.id, quantidade: x.quantidade, faixa: x.componente.jaTem ? [0, 0] : x.componente.preco.faixa })),
    },
    medidas: k.itens.map((x) => ({ id: x.componente.id, caixa: x.componente.especificacao.medidas.valor, massa: x.componente.especificacao.massa.valor })),
  }));

  return {
    tipo: 'opcoes',
    versao: '1.0',
    objeto: requisitos.objeto,
    dimensionamento: { arquivo: 'dimensionamento.json', revisaoDosRequisitos: dimensionamento.requisitos.revisao },
    unidades: { torque: 'N·m', velocidadeAngular: 'grau/s', velocidadeDoMotor: 'rpm', corrente: 'A', massa: 'g', comprimento: 'mm', moeda: requisitos.orcamento.moeda.valor },
    folgaMinima,
    orcamento,
    regras: {
      torque: 'O torque disponível é o da curva do motor na velocidade da junta vezes a razão da redução, vezes a fração da corrente nominal que o driver sustenta sem ventilação, vezes a razão e a eficiência da redução, e limitado ao torque máximo dela. A folga é ele dividido pelo torque total da junta (gravidade mais aceleração); a da opção é a menor das duas juntas.',
      junta1: 'A junta 1 se refaz com a massa do motor e da redução da junta 2 de cada combinação no cotovelo; por isso o torque dela muda de uma opção para outra.',
      corrente: `A demanda é ${arred(CORRENTE_DA_FONTE.porFase.valor, 3)} vezes a soma das correntes de fase aplicadas mais ${CORRENTE_DA_FONTE.placa.valor} A da placa e do regulador; ${CORRENTE_DA_FONTE.porFase.nota} Tudo estimativa.`,
      custo: 'A soma das faixas de preço do catálogo, sem o que a pessoa já tem; é referência com a data do catálogo, sem frete nem o material impresso.',
      escolha: 'A mais barata pelo topo da faixa e a que usa mais do que a pessoa já tem saem das combinações cujo topo da faixa cabe no orçamento (ou de todas, se nenhuma couber); a de maior folga sai de todas e diz quanto passa do orçamento. Quando dois critérios dão a mesma combinação, ela aparece uma vez com os dois.',
    },
    contagem,
    opcoes,
    falta: opcoes.length ? null : 'Nenhuma combinação do catálogo cobre as duas juntas com a folga mínima e a corrente da fonte; a pergunta volta à pessoa: mais orçamento para outro motor ou driver, menos carga ou menos alcance.',
  };
}

function lerJson(caminho, comando) {
  if (!existsSync(caminho)) throw new Error(`${caminho.slice(RAIZ.length + 1)} não existe; rode ${comando}`);
  return JSON.parse(readFileSync(caminho, 'utf8'));
}

function executar() {
  const args = process.argv.slice(2);
  const [objeto] = args.filter((a) => !a.startsWith('--'));
  if (!objeto) { console.error('uso: npm run opcoes -- <objeto> [--check]'); process.exitCode = 2; return; }
  const dimensionamento = lerJson(join(RAIZ, 'objetos', objeto, 'dimensionamento.json'), `npm run dimensionar -- ${objeto}`);
  const documento = gerarOpcoes(lerRequisitos(objeto), dimensionamento, lerCatalogo());
  process.exitCode = gravarOuConferir(join(RAIZ, 'objetos', objeto, 'opcoes.json'), texto(documento), args.includes('--check'), `npm run opcoes -- ${objeto}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) executar();
