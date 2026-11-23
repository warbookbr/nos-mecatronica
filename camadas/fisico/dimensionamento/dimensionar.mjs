/* dimensionar.mjs — lê objetos/<objeto>/requisitos.json e o catálogo de componentes/ e grava
   objetos/<objeto>/dimensionamento.json: o torque de gravidade e o de aceleração de cada junta de um braço serial
   plano de duas juntas num plano vertical, a velocidade de cada junta e a massa estimada dos elos, com a origem de cada
   número. A massa do motor e da redução da junta 2 pesa na junta 1, e por isso a conta itera: começa sem massa no
   cotovelo, acha no catálogo o conjunto mais leve que cobre a junta 2 com a folga mínima, soma a massa dele ao elo 1 e
   refaz até a massa não mudar. As hipóteses estimadas antes de haver forma ficam em HIPOTESES, cada uma com a nota.
   uso: npm run dimensionar -- <objeto> [--check]     --check só confere que o arquivo gravado está em dia */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { lerCatalogo } from '../../../tools/componentes/conferir.mjs';
import { dimensionarBraco, GRAVIDADE, massaPorComprimento, PONTOS_DA_VARREDURA } from './braco.mjs';
import { avaliarJunta, incompatibilidade } from './selecao.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const GRAUS = 180 / Math.PI;

export const HIPOTESES = {
  divisaoDoAlcance: { valor: 0.5, origem: 'estimativa', nota: 'Os dois elos somam o alcance e têm o mesmo comprimento; a divisão igual é a que dá o maior espaço de trabalho ao braço plano de duas juntas.' },
  secaoDoElo: { valor: { largura: 30, altura: 20, parede: 2.5 }, origem: 'estimativa', nota: 'Elo impresso como tubo retangular oco de 30 por 20 mm com parede de 2,5 mm, que equivale a um elo com nervuras e as pontas mais cheias; vale até haver a forma do Modelar.' },
  densidade: { valor: 1.24, origem: 'estimativa', nota: 'PLA maciço, 1,24 g/cm³; a parede da seção já conta só o material.' },
  aceleracaoDaPonta: { valor: 500, origem: 'estimativa', nota: 'Perfil trapezoidal: a ponta chega a 100 mm/s em 0,2 s e 10 mm, um quinto do caminho típico de 200 mm, e freia igual.' },
  fracaoMinimaDoAlcance: { valor: 1 / 3, origem: 'estimativa', nota: 'A ponta não chega mais perto do ombro que um terço do alcance; no braço de prova são 100 mm, o começo da faixa do espaço de trabalho.' },
  fracaoMaximaDoAlcance: { valor: 0.9, origem: 'estimativa', nota: 'A ponta anda à velocidade pedida até 90% do alcance; mais perto do braço esticado a junta 2 teria de girar sem limite para manter a velocidade da ponta, e o programa reduz a velocidade ali.' },
};

const arred = (x, casas) => Number(x.toFixed(casas));
const num = (valor, origem, nota) => (nota ? { valor, origem, nota } : { valor, origem });

/* A distância da carga além da ponta, em mm, lida do texto de carga.ondeFica ("cerca de 30 mm além..."). */
export function distanciaDaCarga(requisitos) {
  const onde = requisitos.carga.ondeFica;
  const achado = onde?.valor?.match(/(\d+(?:[.,]\d+)?)\s*mm/);
  if (!achado) throw new Error('requisitos.carga.ondeFica não diz a distância da carga em mm; reabra a etapa de requisitos e pergunte à pessoa');
  return Number(achado[1].replace(',', '.'));
}

/* As entradas e hipóteses do braço, tiradas dos requisitos; tudo o que dimensionarBraco precisa menos a massa no cotovelo. */
export function entradas(requisitos, hipoteses = HIPOTESES) {
  if (requisitos.velocidade.ausente || requisitos.velocidade.ponta.ausente) throw new Error('requisitos.velocidade.ponta está ausente; o dimensionamento precisa da velocidade da ponta');
  const alcance = requisitos.alcance.valor;
  const L1 = alcance * hipoteses.divisaoDoAlcance.valor;
  const comprimentos = [L1, alcance - L1];
  const { area, gPorMm } = massaPorComprimento({ ...hipoteses.secaoDoElo.valor, densidade: hipoteses.densidade.valor });
  return {
    alcance,
    comprimentos,
    area,
    massasDosElos: comprimentos.map((L) => L * gPorMm),
    carga: requisitos.carga.piorCaso.ausente ? requisitos.carga.massaNaPonta.valor : requisitos.carga.piorCaso.valor,
    distanciaDaCarga: distanciaDaCarga(requisitos),
    velocidadeDaPonta: requisitos.velocidade.ponta.valor,
    aceleracaoDaPonta: hipoteses.aceleracaoDaPonta.valor,
    raioMinimo: alcance * hipoteses.fracaoMinimaDoAlcance.valor,
    raioMaximo: alcance * hipoteses.fracaoMaximaDoAlcance.valor,
    tensao: Math.max(...requisitos.alimentacao.tensoes.valor),
    gravidade: GRAVIDADE,
  };
}

/* Os conjuntos de motor, redução e driver do catálogo que montam com a tensão dada. */
export function conjuntos(catalogo, tensao) {
  const de = (categoria) => catalogo.filter((c) => c.categoria === categoria);
  const lista = [];
  for (const motor of de('motor-de-passo')) {
    for (const reducao of de('reducao')) {
      for (const driver of de('driver')) if (!incompatibilidade(motor, reducao, driver, tensao)) lista.push({ motor, reducao, driver });
    }
  }
  return lista;
}

/* O conjunto mais leve que cobre a junta com a folga; no empate, o mais barato e depois o de menor id. */
export function maisLeve(lista, pedido, folgaMinima) {
  const bons = lista.map((c) => ({ ...c, avaliacao: avaliarJunta(pedido, c.motor, c.reducao, c.driver) })).filter((c) => c.avaliacao.folga >= folgaMinima);
  const preco = (c) => c.motor.preco.faixa[1] + c.reducao.preco.faixa[1] + c.driver.preco.faixa[1];
  const chave = (c) => `${c.motor.id}/${c.reducao.id}/${c.driver.id}`;
  bons.sort((a, b) => a.avaliacao.massa - b.avaliacao.massa || preco(a) - preco(b) || chave(a).localeCompare(chave(b)));
  return bons[0] ?? null;
}

/* O documento dimensionamento.json de um objeto. */
export function dimensionar(requisitos, catalogo, { hipoteses = HIPOTESES, folgaMinima = 2 } = {}) {
  const e = entradas(requisitos, hipoteses);
  const lista = conjuntos(catalogo, e.tensao);
  const iteracoes = [];
  let massa = 0;
  let resultado;
  let escolhido = null;
  for (let volta = 0; volta < 10; volta++) {
    resultado = dimensionarBraco({ ...e, massaNoCotovelo: massa });
    const [, j2] = resultado.juntas;
    escolhido = maisLeve(lista, { torque: j2.torqueTotal, velocidade: j2.velocidade }, folgaMinima);
    const nova = escolhido ? escolhido.avaliacao.massa : massa;
    iteracoes.push({
      massaNoCotovelo: massa,
      torqueTotalDaJunta1: arred(resultado.juntas[0].torqueTotal, 4),
      conjuntoMaisLeveDaJunta2: escolhido ? { motor: escolhido.motor.id, reducao: escolhido.reducao.id, driver: escolhido.driver.id, massa: nova } : null,
    });
    if (nova === massa) break;
    massa = nova;
  }
  if (resultado.elosContraCarga > 1) {
    throw new Error(`a estimativa dos elos pesa ${arred(resultado.elosContraCarga, 2)} vezes a carga no torque do ombro; o dimensionamento para e a seção e o material dos elos viram pergunta à pessoa`);
  }
  const juntas = resultado.juntas.map((j, i) => ({
    id: `junta-${i + 1}`,
    torqueGravidade: num(arred(j.torqueGravidade, 4), 'estimativa', 'Braço esticado na horizontal: cada massa vezes a distância horizontal até a junta, vezes a gravidade.'),
    inercia: num(arred(j.inercia, 6), 'estimativa', 'Na pose esticada, a maior: elo como barra fina, carga e massa no cotovelo como pontos.'),
    aceleracao: num(arred(j.aceleracao * GRAUS, 1), 'estimativa', `A maior da varredura, com a ponta a ${arred(j.raioDoPior, 1)} mm do ombro.`),
    torqueAceleracao: num(arred(j.torqueAceleracao, 4), 'estimativa', 'A inércia na pose esticada vezes a maior aceleração angular da varredura.'),
    torqueTotal: num(arred(j.torqueTotal, 4), 'estimativa', 'Gravidade mais aceleração, somadas no pior caso de cada uma.'),
    torquePedido: num(arred(j.torqueTotal * folgaMinima, 4), 'estimativa', `O torque total vezes a folga mínima de ${folgaMinima}.`),
    velocidade: num(arred(j.velocidade * GRAUS, 1), 'estimativa', `A maior da varredura, com a ponta a ${arred(j.raioDoPior, 1)} mm do ombro andando a ${e.velocidadeDaPonta} mm/s na pior direção.`),
    potencia: num(arred(j.torqueTotal * j.velocidade, 3), 'estimativa', 'O torque total vezes a maior velocidade da junta, os dois no pior caso; é o teto da potência mecânica na saída da junta.'),
  }));
  const [m1, m2] = e.massasDosElos;
  return {
    tipo: 'dimensionamento',
    versao: '1.0',
    objeto: requisitos.objeto,
    requisitos: { revisao: requisitos.revisao },
    modelo: 'Braço serial plano de duas juntas num plano vertical: a junta 1 (ombro) na base, o elo 1, a junta 2 (cotovelo), o elo 2 e a carga além da ponta do elo 2.',
    unidades: { comprimento: 'mm', massa: 'g', torque: 'N·m', inercia: 'kg·m²', potencia: 'W', velocidadeLinear: 'mm/s', aceleracaoLinear: 'mm/s²', velocidadeAngular: 'grau/s', aceleracaoAngular: 'grau/s²', tensao: 'V' },
    entradas: {
      alcance: num(e.alcance, 'requisitos', 'requisitos.alcance.'),
      carga: num(e.carga, 'requisitos', 'requisitos.carga.piorCaso, no ponto da carga.'),
      distanciaDaCarga: num(e.distanciaDaCarga, 'requisitos', 'Lida de requisitos.carga.ondeFica, medida além da ponta do elo 2, onde a garra se prende; os elos somam o alcance, e com isso a carga fica a alcance + esta distância do ombro, o que é conservador.'),
      velocidadeDaPonta: num(e.velocidadeDaPonta, 'requisitos', 'requisitos.velocidade.ponta.'),
      tensao: num(e.tensao, 'requisitos', 'A maior de requisitos.alimentacao.tensoes; é a dos drivers e a da curva dos motores.'),
      folgaMinima: num(folgaMinima, 'pessoa', 'Aprovada pela pessoa na ativação do plano de dimensionamento, em 2026-11-23: o torque disponível tem de ser pelo menos 2 vezes o total.'),
    },
    hipoteses: {
      ...hipoteses,
      gravidade: num(GRAVIDADE, 'declarado', 'Gravidade padrão, em m/s².'),
      varredura: num(PONTOS_DA_VARREDURA, 'declarado', 'Intervalos iguais da distância do ombro à ponta, do raio mínimo ao máximo, com os extremos.'),
    },
    elos: [
      { id: 'elo-1', comprimento: num(e.comprimentos[0], 'estimativa', 'Metade do alcance.'), massa: num(arred(m1, 2), 'estimativa', `Seção de ${e.area} mm² vezes o comprimento vezes a densidade.`) },
      { id: 'elo-2', comprimento: num(e.comprimentos[1], 'estimativa', 'Metade do alcance.'), massa: num(arred(m2, 2), 'estimativa', `Seção de ${e.area} mm² vezes o comprimento vezes a densidade.`) },
    ],
    massaNoCotovelo: {
      ...num(massa, 'estimativa', escolhido
        ? 'O motor e a redução do conjunto mais leve do catálogo que cobre a junta 2 com a folga, presos na ponta do elo 1; as opções refazem a junta 1 com a massa de cada conjunto.'
        : 'Nenhum conjunto do catálogo cobre a junta 2 com a folga; a junta 1 fica sem a massa do cotovelo, e as opções dizem o que falta.'),
      conjunto: escolhido ? { motor: escolhido.motor.id, reducao: escolhido.reducao.id, driver: escolhido.driver.id } : null,
    },
    iteracoes,
    juntas,
    elosContraCarga: num(arred(resultado.elosContraCarga, 3), 'estimativa', 'O momento dos elos no ombro dividido pelo da carga, na pose esticada; acima de 1 o dimensionamento para e pergunta à pessoa.'),
    naoCobre: 'A massa real dos elos, que só a ficha do Modelar traz depois da forma; a inércia própria do motor do cotovelo e a do rotor refletida pela redução; o acoplamento entre as juntas quando as duas aceleram juntas; atrito, folga e rigidez da transmissão; e o motor do cotovelo levado para a base por correia, que tiraria a massa do cotovelo.',
  };
}

export function texto(documento) {
  return `${JSON.stringify(documento, null, 2)}\n`;
}

export function lerRequisitos(objeto, raiz = RAIZ) {
  const arquivo = join(raiz, 'objetos', objeto, 'requisitos.json');
  if (!existsSync(arquivo)) throw new Error(`objetos/${objeto}/requisitos.json não existe; levante os requisitos antes`);
  return JSON.parse(readFileSync(arquivo, 'utf8'));
}

/* Grava, ou só confere com --check, um arquivo gerado; devolve o código de saída. */
export function gravarOuConferir(caminho, conteudo, check, comando) {
  const relativo = caminho.slice(RAIZ.length + 1);
  if (check) {
    const atual = existsSync(caminho) ? readFileSync(caminho, 'utf8') : null;
    if (atual === conteudo) { console.log(`${relativo}: em dia`); return 0; }
    console.log(`${relativo}: ${atual === null ? 'não existe' : 'fora de dia'}; rode ${comando}`);
    return 1;
  }
  writeFileSync(caminho, conteudo);
  console.log(`${relativo}: gravado`);
  return 0;
}

function executar() {
  const args = process.argv.slice(2);
  const [objeto] = args.filter((a) => !a.startsWith('--'));
  if (!objeto) { console.error('uso: npm run dimensionar -- <objeto> [--check]'); process.exitCode = 2; return; }
  const documento = dimensionar(lerRequisitos(objeto), lerCatalogo());
  process.exitCode = gravarOuConferir(join(RAIZ, 'objetos', objeto, 'dimensionamento.json'), texto(documento), args.includes('--check'), `npm run dimensionar -- ${objeto}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) executar();
