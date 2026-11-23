/* conferir.mjs — confere o catálogo de componentes (componentes/<id>.json) contra tools/componentes/componente.schema.json
   e as regras que o JSON Schema não exprime: a curva de torque com a velocidade sempre subindo, o torque nunca subindo e
   nenhum ponto acima do torque de retenção; as faixas com o mínimo até o máximo; a data do preço; fontes sem nome
   repetido; e, na pasta do catálogo, o id igual ao nome do arquivo. O validador é o da ponte (tools/ponte/conferir.mjs),
   importado. Cada recusa diz o caminho JSON do campo, a regra e o valor recebido; a saída depende só da entrada.
   uso: npm run componentes:conferir                  confere a pasta componentes/ e os errados
        npm run componentes:conferir -- <arquivo> ... */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mostrar, validar } from '../ponte/conferir.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '../..');
export const CATALOGO = 'componentes';
export const ERRADOS = 'tools/componentes/errados';
export const CATEGORIAS = ['motor-de-passo', 'reducao', 'driver', 'placa-de-controle', 'fonte'];
const DATA = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function lerEsquema() {
  return JSON.parse(readFileSync(join(RAIZ, 'tools/componentes/componente.schema.json'), 'utf8'));
}

const ehObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/* As regras do componente, sobre um componente que já passou no esquema. */
export function regrasDoComponente(c) {
  const erros = [];
  const falha = (caminho, regra, valor) => erros.push({ caminho, regra, valor });
  const nomes = new Map();
  c.fontes.forEach((f, i) => {
    if (nomes.has(f.nome)) falha(`$.fontes[${i}].nome`, `nome repetido, já usado em $.fontes[${nomes.get(f.nome)}]`, f.nome);
    else nomes.set(f.nome, i);
  });
  if (!DATA.test(c.preco.data)) falha('$.preco.data', 'escreva a data como AAAA-MM-DD', c.preco.data);
  const faixa = (caminho, [min, max]) => { if (min > max) falha(caminho, 'o mínimo vem antes e não passa do máximo', [min, max]); };
  faixa('$.preco.faixa', c.preco.faixa);
  const e = c.especificacao;
  for (const campo of ['tensao', 'tensaoLogica', 'tensaoDeEntrada']) if (e[campo]?.valor?.length === 2) faixa(`$.especificacao.${campo}.valor`, e[campo].valor);
  if (c.categoria === 'reducao' && e.eficiencia.valor > 1) falha('$.especificacao.eficiencia.valor', 'a eficiência é uma fração de 0 a 1', e.eficiencia.valor);
  if (c.categoria === 'driver' && e.correnteContinua.valor > e.correnteMaxima.valor) {
    falha('$.especificacao.correnteContinua.valor', `não pode passar da corrente máxima, ${e.correnteMaxima.valor} A`, e.correnteContinua.valor);
  }
  if (c.categoria === 'motor-de-passo') {
    e.curva.pontos.forEach(([rpm, torque], i) => {
      const onde = `$.especificacao.curva.pontos[${i}]`;
      if (torque > e.torqueDeRetencao.valor) falha(onde, `o torque passa do de retenção, ${e.torqueDeRetencao.valor} N·m`, [rpm, torque]);
      if (i === 0) return;
      const [rpmAntes, torqueAntes] = e.curva.pontos[i - 1];
      if (rpm <= rpmAntes) falha(onde, `curva fora de ordem: a velocidade tem de subir a cada ponto, e o ponto anterior tem ${rpmAntes} rpm`, [rpm, torque]);
      else if (torque > torqueAntes) falha(onde, `curva fora de ordem: o torque não sobe com a velocidade, e o ponto anterior tem ${torqueAntes} N·m`, [rpm, torque]);
    });
  }
  return erros;
}

/* Confere um componente já lido. Devolve { versao, erros }. */
export function conferir(dado) {
  if (!ehObjeto(dado)) return { versao: '?', erros: [{ caminho: '$', regra: 'tem de ser objeto', valor: dado }] };
  if (dado.tipo !== 'componente') return { versao: String(dado.versao ?? '?'), erros: [{ caminho: '$.tipo', regra: 'tem de ser "componente"', valor: dado.tipo }] };
  const esquema = lerEsquema();
  const conhecidas = esquema.properties.versao.enum;
  if (!conhecidas.includes(dado.versao)) {
    return { versao: String(dado.versao ?? '?'), erros: [{ caminho: '$.versao', regra: `versão desconhecida; o esquema do componente conhece ${conhecidas.join(', ')}`, valor: dado.versao }] };
  }
  const erros = [];
  validar(dado, esquema, '$', esquema, erros);
  if (!erros.length) erros.push(...regrasDoComponente(dado));
  const unicos = new Map();
  for (const e of erros) if (!unicos.has(e.caminho)) unicos.set(e.caminho, e);
  return { versao: dado.versao, erros: [...unicos.values()] };
}

function lerJson(caminho) {
  try { return { dado: JSON.parse(readFileSync(caminho, 'utf8')) }; } catch (e) { return { erro: e.code === 'ENOENT' ? 'arquivo não encontrado' : `não é JSON válido (${e.message})` }; }
}

/* Confere um arquivo e devolve { aceito, texto, dado }. O caminho impresso é o dado; ele se lê a partir de `raiz`. */
export function conferirArquivo(arquivo, { raiz = process.cwd() } = {}) {
  const lido = lerJson(resolve(raiz, arquivo));
  if (lido.erro) return { aceito: false, texto: `${arquivo}: recusado: ${lido.erro}\n` };
  const { versao, erros } = conferir(lido.dado);
  if (!erros.length) return { aceito: true, texto: `${arquivo}: aceito (componente, versão ${versao})\n`, dado: lido.dado };
  const linhas = erros.map((e) => `  ${e.caminho}: ${e.regra}; recebido ${mostrar(e.valor)}`);
  return { aceito: false, texto: `${arquivo}: recusado (componente, versão ${versao}), ${erros.length} problema(s)\n${linhas.join('\n')}\n` };
}

const jsonsDe = (raiz, pasta) => (existsSync(join(raiz, pasta)) ? readdirSync(join(raiz, pasta)).filter((n) => n.endsWith('.json')).sort() : []);

/* Confere a pasta do catálogo: cada arquivo, e o id igual ao nome do arquivo. */
export function conferirCatalogo({ raiz = RAIZ, pasta = CATALOGO } = {}) {
  const partes = [];
  let aceito = true;
  const nomes = jsonsDe(raiz, pasta);
  if (!nomes.length) return { aceito: false, texto: `${pasta}: recusado: nenhum componente no catálogo\n` };
  for (const n of nomes) {
    const arquivo = `${pasta}/${n}`;
    const r = conferirArquivo(arquivo, { raiz });
    partes.push(r.texto);
    if (!r.aceito) aceito = false;
    else if (r.dado.id !== basename(n, '.json')) {
      aceito = false;
      partes.push(`${arquivo}: recusado: $.id é "${r.dado.id}" e tem de ser o nome do arquivo, "${basename(n, '.json')}"\n`);
    }
  }
  return { aceito, texto: partes.join('') };
}

/* Os errados: cada .json tem de ser recusado com o texto do .recusa.txt ao lado, byte a byte. */
export function conferirErrados({ raiz = RAIZ } = {}) {
  const nomes = jsonsDe(raiz, ERRADOS);
  const problemas = [];
  for (const n of nomes) {
    const { aceito, texto: obtido } = conferirArquivo(`${ERRADOS}/${n}`, { raiz });
    const esperado = join(raiz, ERRADOS, n.replace(/\.json$/, '.recusa.txt'));
    if (aceito) problemas.push(`${ERRADOS}/${n}: foi aceito e tinha de ser recusado`);
    else if (!existsSync(esperado)) problemas.push(`${ERRADOS}/${n}: falta a recusa esperada em ${basename(esperado)}`);
    else if (readFileSync(esperado, 'utf8') !== obtido) problemas.push(`${ERRADOS}/${n}: a recusa difere de ${basename(esperado)}; veio:\n${obtido}`);
  }
  return { nomes, problemas };
}

/* Tudo o que o gate confere: o catálogo e os errados. */
export function conferirTudo({ raiz = RAIZ } = {}) {
  const r = conferirCatalogo({ raiz });
  const partes = [r.texto];
  let { aceito } = r;
  const { nomes, problemas } = conferirErrados({ raiz });
  if (problemas.length) { aceito = false; partes.push(...problemas.map((p) => `${p}\n`)); }
  else partes.push(`${ERRADOS}: ${nomes.length} arquivo(s) recusado(s) como esperado\n`);
  return { aceito, texto: partes.join('') };
}

/* O catálogo lido para uso: a lista dos componentes aceitos, em ordem de id. Recusa o catálogo inteiro se um falhar. */
export function lerCatalogo({ raiz = RAIZ, pasta = CATALOGO } = {}) {
  const r = conferirCatalogo({ raiz, pasta });
  if (!r.aceito) throw new Error(`o catálogo em ${pasta}/ é recusado; rode npm run componentes:conferir\n${r.texto}`);
  return jsonsDe(raiz, pasta).map((n) => JSON.parse(readFileSync(join(raiz, pasta, n), 'utf8')));
}

function executar() {
  const args = process.argv.slice(2);
  if (args.includes('--ajuda')) {
    console.error('uso: npm run componentes:conferir [-- <arquivo> ...]');
    process.exitCode = 2;
    return;
  }
  let aceito = true;
  const alvos = args.filter((a) => !a.startsWith('--'));
  if (!alvos.length) {
    const r = conferirTudo();
    process.stdout.write(r.texto);
    aceito = r.aceito;
  }
  for (const alvo of alvos) {
    const r = conferirArquivo(alvo);
    process.stdout.write(r.texto);
    if (!r.aceito) aceito = false;
  }
  if (!aceito) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) executar();
