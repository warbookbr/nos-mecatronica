/* conferir.mjs — confere os requisitos e o caderno de cada objeto (objetos/<objeto>/requisitos.json e caderno.json)
   contra os esquemas de tools/objetos/ e as regras que o JSON Schema não exprime: a ordem das etapas, a etapa aprovada
   com a frase da pessoa, quem e a data, nenhuma etapa aprovada depois de uma que não está aprovada, o motivo da
   reaberta e o campo obrigatório que não pode sair ausente. Na pasta do objeto confere também o nome da pasta, os
   arquivos que o caderno cita e a presença do requisitos.json, que só pode faltar com a etapa de requisitos aberta.
   O validador é o da ponte (tools/ponte/conferir.mjs), importado. A saída depende só da entrada.
   uso: npm run objetos:conferir                  confere o exemplo, toda pasta de objetos/ e os errados
        npm run objetos:conferir -- <arquivo|pasta> ... */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mostrar, validar } from '../ponte/conferir.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '../..');
export const TIPOS = ['requisitos', 'caderno'];
export const ETAPAS = ['requisitos', 'componentes', 'forma', 'simulacao', 'pacote'];
export const EXEMPLOS = 'tools/objetos/exemplos';
export const ERRADOS = 'tools/objetos/errados';
export const OBJETOS = 'objetos';
const DATA = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const QUEM_E_A_IA = /^(a\s+)?(ia|claude|assistente|agente)\b/i;

export function lerEsquema(tipo) {
  return JSON.parse(readFileSync(join(RAIZ, 'tools/objetos', `${tipo}.schema.json`), 'utf8'));
}

const ehObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/* O valor no caminho "$.a.b[0].c" de `dado`, ou undefined. */
function noCaminho(dado, caminho) {
  const partes = [...caminho.slice(1).matchAll(/\.([^.[\]]+)|\[(\d+)\]/g)].map((m) => m[1] ?? Number(m[2]));
  return partes.reduce((no, p) => (no == null ? undefined : no[p]), dado);
}

/* Os caminhos de "$.a.b[0].c" do mais curto ao próprio: $.a, $.a.b, $.a.b[0], $.a.b[0].c. */
function ancestrais(caminho) {
  return [...caminho.matchAll(/\.[^.[\]]+|\[\d+\]/g)].map((m) => caminho.slice(0, m.index + m[0].length));
}

/* Um campo escrito como ausente onde o esquema não aceita a forma ausente (o validador recusa o próprio "ausente" como
   campo desconhecido) é o obrigatório com valor: as recusas debaixo dele viram uma. */
function juntarAusentes(dado, erros) {
  const proibidos = new Set(erros.filter((e) => e.caminho.endsWith('.ausente') && e.regra === 'campo desconhecido nesta versão')
    .map((e) => e.caminho.slice(0, -'.ausente'.length)));
  return erros.map((e) => {
    const onde = ancestrais(e.caminho).find((c) => proibidos.has(c) && noCaminho(dado, c)?.ausente === true);
    return onde ? { caminho: onde, regra: 'é obrigatório com valor e não pode sair ausente; pergunte de novo à pessoa', valor: noCaminho(dado, onde) } : e;
  });
}

/* As regras do caderno, sobre um caderno que já passou no esquema. */
export function regrasDoCaderno(c) {
  const erros = [];
  const falha = (caminho, regra, valor) => erros.push({ caminho, regra, valor });
  let pendente = null;
  c.etapas.forEach((e, i) => {
    const onde = `$.etapas[${i}]`;
    if (e.etapa !== ETAPAS[i]) falha(`${onde}.etapa`, `tem de ser "${ETAPAS[i]}"; as etapas vêm na ordem ${ETAPAS.join(', ')}`, e.etapa);
    if (e.estado === 'aprovada') {
      const a = e.aprovacao;
      if (!a) falha(`${onde}.aprovacao`, 'etapa aprovada exige a aprovação com a frase da pessoa, quem, a data e o que foi aprovado', a);
      else {
        if (!a.frase) falha(`${onde}.aprovacao.frase`, 'etapa aprovada exige a frase da pessoa, como ela a disse; a IA não aprova sozinha', a.frase);
        if (!a.quem) falha(`${onde}.aprovacao.quem`, 'etapa aprovada exige quem aprovou', a.quem);
        else if (QUEM_E_A_IA.test(a.quem)) falha(`${onde}.aprovacao.quem`, 'quem aprova é a pessoa, nunca a IA', a.quem);
        if (!a.data) falha(`${onde}.aprovacao.data`, 'etapa aprovada exige a data da aprovação', a.data);
        else if (!DATA.test(a.data)) falha(`${onde}.aprovacao.data`, 'escreva a data como AAAA-MM-DD', a.data);
        if (!a.oQue) falha(`${onde}.aprovacao.oQue`, 'etapa aprovada exige o que foi aprovado', a.oQue);
      }
      if (pendente) falha(`${onde}.estado`, `etapa aprovada depois de ${pendente.onde}, que está "${pendente.estado}"; aprove na ordem ou reabra esta`, e.estado);
    } else if (!pendente) pendente = { onde: `$.etapas[${i}]`, estado: e.estado };
    if (e.estado === 'reaberta' && !e.motivo) falha(`${onde}.motivo`, 'etapa reaberta exige o motivo', e.motivo);
  });
  return erros;
}

/* Confere um documento já lido. Devolve { tipo, versao, erros }. */
export function conferir(dado) {
  if (!ehObjeto(dado)) return { tipo: '?', versao: '?', erros: [{ caminho: '$', regra: 'tem de ser objeto', valor: dado }] };
  const { tipo, versao } = dado;
  if (!TIPOS.includes(tipo)) {
    return { tipo: '?', versao: String(versao ?? '?'), erros: [{ caminho: '$.tipo', regra: `tem de ser um de ${TIPOS.map((t) => `"${t}"`).join(', ')}`, valor: tipo }] };
  }
  const esquema = lerEsquema(tipo);
  const conhecidas = esquema.properties.versao.enum;
  if (!conhecidas.includes(versao)) {
    return { tipo, versao: String(versao ?? '?'), erros: [{ caminho: '$.versao', regra: `versão desconhecida; o esquema de ${tipo} conhece ${conhecidas.join(', ')}`, valor: versao }] };
  }
  let erros = [];
  validar(dado, esquema, '$', esquema, erros);
  erros = juntarAusentes(dado, erros);
  if (!erros.length && tipo === 'caderno') erros.push(...regrasDoCaderno(dado));
  const unicos = new Map();
  for (const e of erros) if (!unicos.has(e.caminho)) unicos.set(e.caminho, e);
  return { tipo, versao, erros: [...unicos.values()] };
}

function lerJson(caminho) {
  try { return { dado: JSON.parse(readFileSync(caminho, 'utf8')) }; } catch (e) { return { erro: e.code === 'ENOENT' ? 'arquivo não encontrado' : `não é JSON válido (${e.message})` }; }
}

function texto(arquivo, { tipo, versao, erros }) {
  if (!erros.length) return `${arquivo}: aceito (${tipo}, versão ${versao})\n`;
  const linhas = erros.map((e) => `  ${e.caminho}: ${e.regra}; recebido ${mostrar(e.valor)}`);
  return `${arquivo}: recusado (${tipo}, versão ${versao}), ${erros.length} problema(s)\n${linhas.join('\n')}\n`;
}

/* Confere um arquivo e devolve { aceito, texto, dado }. O caminho impresso é o dado; ele se lê a partir de `raiz`. */
export function conferirArquivo(arquivo, { raiz = process.cwd() } = {}) {
  const lido = lerJson(resolve(raiz, arquivo));
  if (lido.erro) return { aceito: false, texto: `${arquivo}: recusado: ${lido.erro}\n` };
  const r = conferir(lido.dado);
  return { aceito: !r.erros.length, texto: texto(arquivo, r), dado: lido.dado };
}

/* Confere a pasta de um objeto: o caderno, os requisitos quando existem, e a coerência entre a pasta e o caderno. */
export function conferirPasta(pasta, { raiz = process.cwd() } = {}) {
  const nome = basename(pasta);
  const saida = [];
  let aceito = true;
  const problema = (onde, regra) => { aceito = false; saida.push(`${onde}: recusado: ${regra}\n`); };
  const doArquivo = (arquivo) => {
    const r = conferirArquivo(join(pasta, arquivo), { raiz });
    saida.push(r.texto);
    if (!r.aceito) aceito = false;
    else if (r.dado.objeto !== nome) problema(join(pasta, arquivo), `$.objeto é "${r.dado.objeto}" e tem de ser o nome da pasta, "${nome}"`);
    return r;
  };
  const caderno = doArquivo('caderno.json');
  const existe = (arquivo) => existsSync(resolve(raiz, pasta, arquivo));
  if (existe('requisitos.json')) doArquivo('requisitos.json');
  else if (caderno.aceito) {
    const estado = caderno.dado.etapas[0].estado;
    if (estado !== 'aberta') problema(join(pasta, 'requisitos.json'), `não existe, e a etapa de requisitos está "${estado}"; só a etapa aberta fica sem ele`);
  }
  if (caderno.aceito) {
    caderno.dado.etapas.forEach((e, i) => e.arquivos.forEach((a, k) => {
      if (!existe(a)) problema(join(pasta, 'caderno.json'), `$.etapas[${i}].arquivos[${k}] cita "${a}", que não existe na pasta`);
    }));
  }
  return { aceito, texto: saida.join('') };
}

const pastasDe = (raiz, pasta) => (existsSync(join(raiz, pasta))
  ? readdirSync(join(raiz, pasta), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => `${pasta}/${e.name}`).sort()
  : []);

/* Os errados: cada .json tem de ser recusado com o texto do .recusa.txt ao lado, byte a byte. */
export function conferirErrados({ raiz = RAIZ } = {}) {
  const nomes = readdirSync(join(raiz, ERRADOS)).filter((n) => n.endsWith('.json')).sort();
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

/* Tudo o que o gate confere: o exemplo, cada pasta de objetos/ e os errados. */
export function conferirTudo({ raiz = RAIZ } = {}) {
  const partes = [];
  let aceito = true;
  for (const pasta of [...pastasDe(raiz, EXEMPLOS), ...pastasDe(raiz, OBJETOS)]) {
    const r = conferirPasta(pasta, { raiz });
    partes.push(r.texto);
    if (!r.aceito) aceito = false;
  }
  const { nomes, problemas } = conferirErrados({ raiz });
  if (problemas.length) { aceito = false; partes.push(...problemas.map((p) => `${p}\n`)); }
  else partes.push(`${ERRADOS}: ${nomes.length} arquivo(s) recusado(s) como esperado\n`);
  return { aceito, texto: partes.join('') };
}

function executar() {
  const args = process.argv.slice(2);
  if (args.includes('--ajuda')) {
    console.error('uso: npm run objetos:conferir [-- <arquivo|pasta> ...]');
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
    const ehPasta = existsSync(alvo) && statSync(alvo).isDirectory();
    const r = ehPasta ? conferirPasta(alvo) : conferirArquivo(alvo);
    process.stdout.write(r.texto);
    if (!r.aceito) aceito = false;
  }
  if (!aceito) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) executar();
