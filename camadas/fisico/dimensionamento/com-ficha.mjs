/* com-ficha.mjs — refaz o torque de cada junta do braço plano de duas juntas com a ficha que o Modelar exportou, no lugar das
   hipóteses de antes da forma: a massa, o centro e a inércia de cada conjunto móvel vêm da ficha, o eixo de cada junta também,
   e a carga, a aceleração e a velocidade de cada junta vêm do dimensionamento. Confere a folga dos componentes escolhidos
   contra esse torque e compara com a estimativa de antes da forma. Grava objetos/<objeto>/simulacao.json.
   O que prova: a conta estática e de aceleração na pose esticada na horizontal, com as massas da ficha. O que não cobre: a
   dinâmica no tempo, o atrito, a folga das polias e a flexão dos elos, que ficam na matriz.
   uso: npm run simular:ficha -- <objeto> [--check] */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { lerCatalogo } from '../../../tools/componentes/conferir.mjs';
import { conferir } from '../../../tools/ponte/conferir.mjs';
import { GRAVIDADE } from './braco.mjs';
import { avaliarJunta } from './selecao.mjs';
import { gravarOuConferir, texto } from './dimensionar.mjs';

const RAIZ = new URL('../../../', import.meta.url).pathname;
const RAD = Math.PI / 180;
const arred = (x, casas) => Number(x.toFixed(casas));

/* Os conjuntos que uma junta move: o filho e tudo o que pende dele pelas outras juntas. */
function movidos(ficha, junta) {
  const filhos = new Set([junta.filho]);
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const j of ficha.juntas) if (filhos.has(j.pai) && !filhos.has(j.filho)) { filhos.add(j.filho); mudou = true; }
  }
  return ficha.conjuntos.filter((c) => filhos.has(c.id));
}

/**
 * A conta com a ficha. `ficha` em mm, g e g·mm²; a gravidade em -y, como o referencial da ficha do Modelar (y para cima).
 * Cada junta precisa ser paralela a z (braço num plano vertical xy); a ficha que não for recusa com o motivo.
 */
export function simularComFicha({ ficha, dimensionamento, componentes, catalogo, requisitos = null }) {
  const carga = dimensionamento.entradas.carga.valor / 1000;
  const distancia = dimensionamento.entradas.distanciaDaCarga.valor;
  const ultima = ficha.juntas.at(-1);
  const comprimentoDoElo2 = dimensionamento.elos?.[1]?.comprimento?.valor ?? dimensionamento.entradas.alcance.valor / 2;
  /* a carga além da ponta do último elo, como no dimensionamento: o eixo da última junta mais o elo mais a distância */
  const xCarga = ultima.eixo.valor.ponto[0] + comprimentoDoElo2 + distancia;
  const porId = (cat, id) => {
    const c = catalogo.find((x) => x.id === id);
    if (!c) throw new Error(`o catálogo não tem '${id}', citado em componentes.json; rode npm run componentes:conferir`);
    return c;
  };
  const juntas = ficha.juntas.map((j, n) => {
    const { ponto, direcao } = j.eixo.valor;
    if (Math.abs(Math.abs(direcao[2]) - 1) > 1e-6) throw new Error(`a junta '${j.id}' não é paralela a z (${direcao}); a conta é do braço num plano vertical`);
    const conjuntos = movidos(ficha, j);
    if (conjuntos.some((c) => c.massa.ausente)) throw new Error(`a ficha não dá a massa de um conjunto movido por '${j.id}'`);
    let torqueGravidade = 0; let inercia = 0; let massa = 0;
    for (const c of conjuntos) {
      const m = c.massa.valor / 1000; const [x, y] = c.centroDeMassa.valor.map((v, k) => (v - ponto[k]) / 1000);
      torqueGravidade += m * GRAVIDADE * Math.abs(x);
      inercia += c.inercia.valor.izz * 1e-9 + m * (x * x + y * y);
      massa += c.massa.valor;
    }
    const xc = (xCarga - ponto[0]) / 1000;
    torqueGravidade += carga * GRAVIDADE * Math.abs(xc);
    inercia += carga * xc * xc;
    const antes = dimensionamento.juntas[n];
    const aceleracao = antes.aceleracao.valor * RAD;
    const velocidade = antes.velocidade.valor * RAD;
    const torqueAceleracao = inercia * aceleracao;
    const torqueTotal = torqueGravidade + torqueAceleracao;
    const escolha = componentes.juntas.find((x) => x.junta === j.id);
    if (!escolha) throw new Error(`componentes.json não tem a junta '${j.id}' da ficha`);
    const av = avaliarJunta({ torque: torqueTotal, velocidade }, porId(catalogo, escolha.motor), porId(catalogo, escolha.reducao), porId(catalogo, escolha.driver));
    return {
      id: j.id,
      massaMovida: { valor: arred(massa, 1), origem: 'ficha', nota: `soma dos conjuntos ${conjuntos.map((c) => c.id).join(', ')}, sem a carga` },
      torqueGravidade: { valor: arred(torqueGravidade, 4), origem: 'estimativa', nota: 'braço esticado na horizontal, pose da ficha: cada conjunto pelo centro de massa da ficha, mais a carga do pior caso' },
      inercia: { valor: arred(inercia, 6), origem: 'estimativa', nota: 'izz de cada conjunto da ficha levada ao eixo da junta, mais a carga como ponto' },
      torqueAceleracao: { valor: arred(torqueAceleracao, 4), origem: 'estimativa', nota: 'a inércia da ficha vezes a maior aceleração angular do dimensionamento' },
      torqueTotal: { valor: arred(torqueTotal, 4), origem: 'estimativa' },
      torqueAntesDaForma: { valor: antes.torqueTotal.valor, origem: 'estimativa', nota: 'dimensionamento.json, com os elos estimados antes da forma' },
      razaoContraAntes: { valor: arred(torqueTotal / antes.torqueTotal.valor, 2), origem: 'estimativa', nota: 'acima de 2 o plano manda parar e perguntar a massa dos elos à pessoa' },
      torqueDisponivel: { valor: arred(av.torqueDisponivel, 4), origem: 'estimativa', nota: `${escolha.motor} com ${escolha.reducao} e ${escolha.driver}, na velocidade da junta; limitado por ${av.limitadoPor === 'motor' ? 'o motor' : 'a redução'}` },
      folga: { valor: arred(av.folga, 2), origem: 'estimativa', nota: `torque disponível sobre o total; o mínimo aprovado é ${dimensionamento.entradas.folgaMinima.valor}` },
      passa: av.folga >= dimensionamento.entradas.folgaMinima.valor && torqueTotal / antes.torqueTotal.valor <= 2,
    };
  });
  /* O erro na ponta pela folga das reduções: cada folga angular vezes a distância do eixo da junta até a carga, somadas no pior
     sentido, contra a precisão e a repetibilidade dos requisitos. */
  const parcelas = ficha.juntas.map((j) => {
    const escolha = componentes.juntas.find((x) => x.junta === j.id);
    const folga = porId(catalogo, escolha.reducao).especificacao.folga;
    const raio = Math.abs(xCarga - j.eixo.valor.ponto[0]);
    return { junta: j.id, folga: folga?.valor ?? 0, raio, erro: (folga?.valor ?? 0) * RAD * raio };
  });
  const erro = parcelas.reduce((s, x) => s + x.erro, 0);
  const pedido = (campo) => (requisitos?.[campo] && !requisitos[campo].ausente ? requisitos[campo].valor : null);
  const precisao = {
    erroNaPonta: { valor: arred(erro, 2), origem: 'estimativa', nota: `a folga angular de cada redução do catálogo vezes a distância do eixo da junta até a carga: ${parcelas.map((x) => `${x.junta} ${x.folga} grau a ${arred(x.raio, 0)} mm, ${arred(x.erro, 2)} mm`).join('; ')}; somadas no pior sentido, sem a gravidade que encosta a folga num lado` },
    precisaoPedida: pedido('precisao'),
    repetibilidadePedida: pedido('repetibilidade'),
  };
  /* A folga conta contra a precisão; a repetibilidade é a de voltar ao mesmo ponto pelo mesmo lado, em que a folga fica encostada
     e não entra, e por isso ela não se confere aqui: depende de o programa chegar sempre pelo mesmo sentido. */
  precisao.passa = precisao.precisaoPedida === null || erro <= precisao.precisaoPedida;
  if (precisao.repetibilidadePedida !== null) precisao.repetibilidade = { valor: precisao.repetibilidadePedida, origem: 'requisitos', nota: 'não conferida pela folga: vale se o programa chegar a cada ponto sempre pelo mesmo sentido, com a folga encostada; o resto dela, perda de passo, flexão e correia, está no que a simulação não cobre' };
  return {
    tipo: 'simulacao', versao: '1.0', objeto: ficha.objeto,
    ficha: { caminho: `${ficha.objeto}.ficha.json`, revisao: ficha.revisao },
    componentes: { revisao: componentes.revisao ?? null },
    modelo: 'Torque estático e de aceleração de cada junta do braço plano, na pose esticada na horizontal, com as massas, os centros e as inércias dos conjuntos da ficha do Modelar e a carga do pior caso além da ponta.',
    juntas,
    precisao,
    passa: juntas.every((j) => j.passa) && precisao.passa,
    naoCobre: [
      'a dinâmica no tempo, com o perfil de movimento e a perda de passo do motor (linha fis-modelo-dinamico)',
      'o atrito do rolamento, das polias e da planetária, que só entra pela eficiência da redução',
      'a flexão dos elos impressos e a folga da correia',
      'a perda de passo sem encoder, o aquecimento dos drivers a 1,5 A sem dissipador e a flexão dos elos e da correia, que também pesam contra a repetibilidade',
      'a estabilidade da base: o centro de massa do braço esticado com a carga sai da base de 90 mm de raio, e a base precisa ser presa à mesa',
    ],
  };
}

function executar() {
  const args = process.argv.slice(2);
  if (args.includes('--ajuda') || !args.filter((a) => !a.startsWith('--')).length) {
    console.error('uso: npm run simular:ficha -- <objeto> [--check]\n  lê objetos/<objeto>/<objeto>.ficha.json, dimensionamento.json e componentes.json e grava simulacao.json');
    process.exitCode = 2; return;
  }
  const objeto = args.find((a) => !a.startsWith('--'));
  const pasta = join(RAIZ, 'objetos', objeto);
  const arquivoDaFicha = join(pasta, `${objeto}.ficha.json`);
  if (!existsSync(arquivoDaFicha)) { console.error(`falta ${arquivoDaFicha}: copie a ficha que o Modelar exportou (npm run exportar:ficha -- ${objeto}, lá)`); process.exitCode = 1; return; }
  const ficha = JSON.parse(readFileSync(arquivoDaFicha, 'utf8'));
  const r = conferir(ficha);
  if (r.erros.length) { console.error(`a ficha é recusada pelo conferidor da ponte; rode npm run ponte:conferir -- ${arquivoDaFicha}`); process.exitCode = 1; return; }
  const ler = (n) => JSON.parse(readFileSync(join(pasta, n), 'utf8'));
  const doc = simularComFicha({ ficha, dimensionamento: ler('dimensionamento.json'), componentes: ler('componentes.json'), catalogo: lerCatalogo(), requisitos: ler('requisitos.json') });
  gravarOuConferir(join(pasta, 'simulacao.json'), texto(doc), args.includes('--check'), `npm run simular:ficha -- ${objeto}`);
  console.log(`erro na ponta pela folga das reduções: ${doc.precisao.erroNaPonta.valor} mm (precisão pedida ${doc.precisao.precisaoPedida} mm; a repetibilidade de ${doc.precisao.repetibilidadePedida} mm pede chegar sempre pelo mesmo sentido) — ${doc.precisao.passa ? 'passa' : 'NÃO passa'}`);
  for (const j of doc.juntas) console.log(`${j.id}: torque ${j.torqueTotal.valor} N·m (antes da forma ${j.torqueAntesDaForma.valor}), disponível ${j.torqueDisponivel.valor}, folga ${j.folga.valor} — ${j.passa ? 'passa' : 'NÃO passa'}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) executar();
