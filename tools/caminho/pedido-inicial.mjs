/* pedido-inicial.mjs — gera o pedido inicial da ponte (versão 1.2, ficha.revisao 0) de um objeto a partir da escolha
   gravada em objetos/<objeto>/componentes.json e do catálogo componentes/. Um item componente por componente: por junta,
   o motor e a redução, que servem à junta e se acoplam ao motor, e o driver, um item por junta mesmo quando o modelo se
   repete; depois a placa e a fonte. Driver, placa e fonte são abrigados na peça "base", nome combinado com o Modelar até a
   primeira ficha. Nome, família, medidas e massa saem do catálogo com a origem de lá; o eixo de saída só entra quando o
   catálogo dá o diâmetro e o comprimento. A saída depende só dos arquivos lidos.
   uso: npm run pedido-inicial -- <objeto> [--escrever=<arquivo>] */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '../..');
export const PECA_QUE_ABRIGA = 'base';
const LINHA_DA_MATRIZ = 'fis-torque-gravidade';

const lerJson = (caminho) => JSON.parse(readFileSync(join(RAIZ, caminho), 'utf8'));

function item(id, catalogo, serve, acopla, data) {
  const c = lerJson(`componentes/${catalogo}.json`);
  const e = c.especificacao;
  const massa = { valor: e.massa.valor, origem: e.massa.origem };
  const saida = e.eixoDeSaida?.valor;
  return {
    id,
    tipo: 'componente',
    componente: c.id,
    nome: c.nome,
    familia: c.familia ?? null,
    caixa: e.medidas.valor,
    massa,
    serve,
    ...(saida ? { eixoDeSaida: { diametro: saida[0], comprimento: saida[1] } } : {}),
    ...(acopla ? { acopla } : {}),
    motivo: {
      linhaDaMatriz: LINHA_DA_MATRIZ,
      texto: `componente escolhido pela pessoa em ${data}`,
      resultado: { grandeza: 'massa', valor: massa.valor, unidade: 'g', origem: massa.origem },
    },
  };
}

export function gerar(objeto) {
  const escolha = lerJson(`objetos/${objeto}/componentes.json`);
  const caderno = lerJson(`objetos/${objeto}/caderno.json`);
  const aprovacao = caderno.etapas.find((x) => x.etapa === 'componentes')?.aprovacao;
  if (!aprovacao) throw new Error(`a etapa de componentes de ${objeto} não está aprovada no caderno`);
  const { data } = aprovacao;
  const itens = [];
  for (const j of escolha.juntas) {
    itens.push(item(j.motor, j.motor, { junta: j.junta }, null, data));
    if (j.reducao) itens.push(item(j.reducao, j.reducao, { junta: j.junta }, j.motor, data));
  }
  for (const j of escolha.juntas) itens.push(item(`driver-${j.junta}`, j.driver, { peca: PECA_QUE_ABRIGA }, null, data));
  for (const id of [escolha.placa, escolha.fonte]) itens.push(item(id, id, { peca: PECA_QUE_ABRIGA }, null, data));
  return { tipo: 'pedido', versao: '1.2', objeto, ficha: { caminho: `${objeto}.ficha.json`, revisao: 0 }, itens };
}

export const texto = (objeto) => `${JSON.stringify(gerar(objeto), null, 2)}\n`;

function executar() {
  const args = process.argv.slice(2);
  const objetos = args.filter((a) => !a.startsWith('--'));
  const destino = args.find((a) => a.startsWith('--escrever='))?.slice('--escrever='.length);
  if (objetos.length !== 1) {
    console.error('uso: npm run pedido-inicial -- <objeto> [--escrever=<arquivo>]');
    process.exitCode = 2;
    return;
  }
  const saida = texto(objetos[0]);
  if (destino) writeFileSync(destino, saida);
  else process.stdout.write(saida);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) executar();
