/* conferir.mjs — confere uma ficha ou um pedido da ponte contra o esquema da versão que o arquivo declara
   (ponte/esquemas/<tipo>.schema.json) e as regras de referência que o JSON Schema não exprime. Cobre só o que os
   esquemas usam: $ref local, type, const, enum, required, properties, additionalProperties, items, minItems,
   maxItems, minimum, exclusiveMinimum, minLength, pattern, allOf e if/then/else. Cada recusa diz o caminho JSON do
   campo, a regra e o valor recebido, e o cabeçalho diz o tipo e a versão; a saída depende só da entrada.
   uso: npm run ponte:conferir -- <arquivo> [--ficha=<arquivo>] */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '../..');
export const TIPOS = ['ficha', 'pedido'];

export function lerEsquema(tipo) {
  return JSON.parse(readFileSync(join(RAIZ, 'ponte/esquemas', `${tipo}.schema.json`), 'utf8'));
}

export function mostrar(valor) {
  if (valor === undefined) return 'nada';
  const texto = JSON.stringify(valor);
  return texto.length > 70 ? `${texto.slice(0, 67)}...` : texto;
}

const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const ehObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const TIPO_JSON = {
  object: ehObjeto, array: Array.isArray, string: (v) => typeof v === 'string', boolean: (v) => typeof v === 'boolean',
  number: (v) => typeof v === 'number' && Number.isFinite(v), integer: Number.isInteger, null: (v) => v === null,
};
const NOME_TIPO = { object: 'objeto', array: 'lista', string: 'texto', boolean: 'booleano', number: 'número', integer: 'inteiro', null: 'null' };

function resolverRef(raiz, ref) {
  if (!ref.startsWith('#/')) throw new Error(`$ref "${ref}" não é local; o conferidor só lê #/...`);
  return ref.slice(2).split('/').reduce((no, parte) => no[parte], raiz);
}

/* Confere `valor` contra `esquema` e acrescenta em `erros` cada { caminho, regra, valor }. */
export function validar(valor, esquema, caminho, raiz, erros) {
  if (esquema === true) return;
  if (esquema === false) { erros.push({ caminho, regra: 'campo não permitido', valor }); return; }
  const falha = (regra, onde = caminho, recebido = valor) => erros.push({ caminho: onde, regra, valor: recebido });
  if (esquema.$ref) validar(valor, resolverRef(raiz, esquema.$ref), caminho, raiz, erros);
  if ('const' in esquema && !igual(valor, esquema.const)) return falha(`tem de ser ${JSON.stringify(esquema.const)}`);
  if (esquema.enum && !esquema.enum.some((e) => igual(e, valor))) {
    return falha(`tem de ser um de ${esquema.enum.map((e) => JSON.stringify(e)).join(', ')}`);
  }
  if (esquema.type) {
    const tipos = [].concat(esquema.type);
    if (!tipos.some((t) => TIPO_JSON[t](valor))) return falha(`tem de ser ${tipos.map((t) => NOME_TIPO[t]).join(' ou ')}`);
  }
  if (typeof valor === 'number') {
    if ('minimum' in esquema && valor < esquema.minimum) falha(`tem de ser no mínimo ${esquema.minimum}`);
    if ('exclusiveMinimum' in esquema && valor <= esquema.exclusiveMinimum) falha(`tem de ser maior que ${esquema.exclusiveMinimum}`);
  }
  if (typeof valor === 'string') {
    if ('minLength' in esquema && valor.length < esquema.minLength) falha('não pode ser vazio');
    if (esquema.pattern && !new RegExp(esquema.pattern, 'u').test(valor)) falha('use minúsculas, algarismos e hífen, como "motor-ombro"');
  }
  if (Array.isArray(valor)) {
    if ('minItems' in esquema && valor.length < esquema.minItems) falha(`tem de ter pelo menos ${esquema.minItems} item(ns)`);
    if ('maxItems' in esquema && valor.length > esquema.maxItems) falha(`tem de ter no máximo ${esquema.maxItems} item(ns)`);
    if (esquema.items) valor.forEach((v, i) => validar(v, esquema.items, `${caminho}[${i}]`, raiz, erros));
  }
  if (ehObjeto(valor)) {
    for (const campo of esquema.required ?? []) if (!(campo in valor)) erros.push({ caminho: `${caminho}.${campo}`, regra: 'campo obrigatório ausente', valor: undefined });
    for (const [campo, v] of Object.entries(valor)) {
      if (esquema.properties && campo in esquema.properties) validar(v, esquema.properties[campo], `${caminho}.${campo}`, raiz, erros);
      else if (esquema.additionalProperties === false) falha('campo desconhecido nesta versão', `${caminho}.${campo}`, v);
    }
  }
  for (const parte of esquema.allOf ?? []) validar(valor, parte, caminho, raiz, erros);
  if (esquema.if) {
    const teste = [];
    validar(valor, esquema.if, caminho, raiz, teste);
    const ramo = teste.length ? esquema.else : esquema.then;
    if (ramo) validar(valor, ramo, caminho, raiz, erros);
  }
}

/* As regras de referência da ficha, sobre uma ficha que já passou no esquema. */
export function regrasDaFicha(f) {
  const erros = [];
  const falha = (caminho, regra, valor) => erros.push({ caminho, regra, valor });
  const unicos = (lista, nome, chave = (x) => x.id) => {
    const vistos = new Map();
    lista.forEach((x, i) => {
      const k = chave(x);
      if (vistos.has(k)) falha(`$.${nome}[${i}].id`, `identificador repetido, já usado em $.${nome}[${vistos.get(k)}]`, x.id);
      else vistos.set(k, i);
    });
  };
  unicos(f.conjuntos, 'conjuntos');
  unicos(f.pecas, 'pecas');
  unicos(f.portas, 'portas', (p) => `${p.peca}\u0000${p.id}`);
  unicos(f.juntas, 'juntas');
  unicos(f.volumesLivres, 'volumesLivres');
  const conjuntos = new Map(f.conjuntos.map((c) => [c.id, c]));
  const pecas = new Map(f.pecas.map((p) => [p.id, p]));
  const pecaExiste = (caminho, id) => {
    if (id !== null && !pecas.has(id)) falha(caminho, 'cita uma peça que não existe na ficha', id);
    return pecas.get(id);
  };
  f.pecas.forEach((p, i) => {
    if (!conjuntos.has(p.conjunto)) falha(`$.pecas[${i}].conjunto`, 'cita um conjunto que não existe na ficha', p.conjunto);
  });
  f.portas.forEach((p, i) => pecaExiste(`$.portas[${i}].peca`, p.peca));
  f.volumesLivres.forEach((v, i) => pecaExiste(`$.volumesLivres[${i}].dentroDe`, v.dentroDe));
  f.juntas.forEach((j, i) => {
    const pai = pecaExiste(`$.juntas[${i}].pai`, j.pai);
    const filho = pecaExiste(`$.juntas[${i}].filho`, j.filho);
    pecaExiste(`$.juntas[${i}].acionadaPor`, j.acionadaPor);
    if (!pai || !filho) return;
    if (pai.conjunto === filho.conjunto) falha(`$.juntas[${i}].filho`, `está no mesmo conjunto do pai ("${pai.conjunto}")`, j.filho);
    else if (conjuntos.get(filho.conjunto)?.movel === false) falha(`$.juntas[${i}].filho`, `está no conjunto "${filho.conjunto}", que não é móvel`, j.filho);
  });
  f.conjuntos.forEach((c, i) => {
    const suas = f.pecas.filter((p) => p.conjunto === c.id);
    if (!suas.length) return falha(`$.conjuntos[${i}].id`, 'nenhuma peça pertence a este conjunto', c.id);
    if (c.massa.ausente || suas.some((p) => p.massa.ausente)) return;
    const soma = suas.reduce((s, p) => s + p.massa.valor, 0);
    if (Math.abs(soma - c.massa.valor) > 1e-6 * Math.max(1, soma)) {
      falha(`$.conjuntos[${i}].massa.valor`, `tem de ser a soma das massas das peças do conjunto, ${Number(soma.toPrecision(12))}`, c.massa.valor);
    }
    if (suas.some((p) => p.massa.origem === 'estimativa') && c.massa.origem !== 'estimativa') {
      falha(`$.conjuntos[${i}].massa.origem`, 'tem de ser "estimativa", porque soma massas estimadas', c.massa.origem);
    }
    if (suas.some((p) => p.posicao.ausente || p.orientacao.ausente || p.centroDeMassa.ausente)) return;
    const centros = suas.map((p) => soma3(p.posicao.valor, girar(p.orientacao.valor, p.centroDeMassa.valor)));
    const centro = [0, 1, 2].map((k) => suas.reduce((s, p, n) => s + p.massa.valor * centros[n][k], 0) / soma);
    const arredondar = (xs) => xs.map((x) => Number(x.toFixed(1)));
    if (!c.centroDeMassa.ausente && c.centroDeMassa.valor.some((x, k) => Math.abs(x - centro[k]) > 0.1)) {
      falha(`$.conjuntos[${i}].centroDeMassa.valor`, `tem de ser o centro de massa das peças do conjunto, ${JSON.stringify(arredondar(centro))}, com 0,1 mm de folga`, c.centroDeMassa.valor);
    }
    if (c.inercia.ausente || suas.some((p) => p.inercia.ausente)) return;
    const tensor = inerciaDoConjunto(suas, centros, centro);
    const lido = INERCIA.map((nome) => c.inercia.valor[nome]);
    const folga = 1e-3 * Math.max(...tensor.slice(0, 3));
    if (lido.some((x, k) => Math.abs(x - tensor[k]) > folga)) {
      falha(`$.conjuntos[${i}].inercia.valor`, `tem de ser a inércia das peças em torno do centro do conjunto, ${JSON.stringify(tensor.map(Math.round))}, com 0,1% de folga`, c.inercia.valor);
    }
  });
  return erros;
}

const INERCIA = ['ixx', 'iyy', 'izz', 'ixy', 'ixz', 'iyz'];
const soma3 = (a, b) => a.map((x, k) => x + b[k]);

/* Gira o vetor v pela orientação { eixo, angulo } (grau, mão direita), pela fórmula de Rodrigues. */
export function girar({ eixo, angulo }, v) {
  const n = Math.hypot(...eixo);
  if (!n || !angulo) return v;
  const [x, y, z] = eixo.map((e) => e / n);
  const a = (angulo * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const ponto = x * v[0] + y * v[1] + z * v[2];
  const cruz = [y * v[2] - z * v[1], z * v[0] - x * v[2], x * v[1] - y * v[0]];
  return [x, y, z].map((e, k) => v[k] * c + cruz[k] * s + e * ponto * (1 - c));
}

/* O tensor de inércia (ixx, iyy, izz, ixy, ixz, iyz) das peças em torno de `centro`, no referencial da montagem. */
function inerciaDoConjunto(pecas, centros, centro) {
  const total = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  pecas.forEach((p, n) => {
    const { ixx, iyy, izz, ixy, ixz, iyz } = p.inercia.valor;
    const proprio = [[ixx, ixy, ixz], [ixy, iyy, iyz], [ixz, iyz, izz]];
    const colunas = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map((e) => girar(p.orientacao.valor, e));
    const d = centros[n].map((x, k) => x - centro[k]);
    const dd = d[0] ** 2 + d[1] ** 2 + d[2] ** 2;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        let girado = 0;
        for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) girado += colunas[a][i] * proprio[a][b] * colunas[b][j];
        total[i][j] += girado + p.massa.valor * ((i === j ? dd : 0) - d[i] * d[j]);
      }
    }
  });
  return [total[0][0], total[1][1], total[2][2], total[0][1], total[0][2], total[1][2]];
}

/* As regras de referência do pedido contra a ficha a que ele responde. */
export function regrasDoPedido(p, f) {
  const erros = [];
  const falha = (caminho, regra, valor) => erros.push({ caminho, regra, valor });
  if (p.objeto !== f.objeto) falha('$.objeto', `tem de ser o objeto da ficha, "${f.objeto}"`, p.objeto);
  if (p.ficha.revisao !== f.revisao) falha('$.ficha.revisao', `a ficha conferida é a revisão ${f.revisao}`, p.ficha.revisao);
  const pecas = new Set(f.pecas.map((x) => x.id));
  const portas = new Set(f.portas.map((x) => `${x.peca}\u0000${x.id}`));
  const juntas = new Set(f.juntas.map((x) => x.id));
  const peca = (caminho, id) => { if (!pecas.has(id)) falha(caminho, 'cita uma peça que não existe na ficha', id); };
  const porta = (caminho, ref) => {
    if (!pecas.has(ref.peca)) falha(`${caminho}.peca`, 'cita uma peça que não existe na ficha', ref.peca);
    else if (!portas.has(`${ref.peca}\u0000${ref.porta}`)) falha(`${caminho}.porta`, `cita uma porta que a peça "${ref.peca}" não tem na ficha`, ref.porta);
  };
  const vistos = new Map();
  p.itens.forEach((item, i) => {
    const onde = `$.itens[${i}]`;
    if (vistos.has(item.id)) falha(`${onde}.id`, `identificador repetido, já usado em $.itens[${vistos.get(item.id)}]`, item.id);
    else vistos.set(item.id, i);
    if (item.tipo === 'espaco') peca(`${onde}.dentroDe`, item.dentroDe);
    if (item.tipo === 'posicao') peca(`${onde}.alvo`, item.alvo);
    if (item.tipo === 'saidaDeAr') peca(`${onde}.em`, item.em);
    if (item.tipo === 'passagem') {
      item.de.forEach((r, k) => porta(`${onde}.de[${k}]`, r));
      item.para.forEach((r, k) => porta(`${onde}.para[${k}]`, r));
      if (item.de.length !== item.para.length) falha(`${onde}.para`, `tem de ter tantas portas quanto "de", ${item.de.length}`, item.para.length);
      item.atravessa.forEach((j, k) => { if (!juntas.has(j)) falha(`${onde}.atravessa[${k}]`, 'cita uma junta que não existe na ficha', j); });
    }
    if (item.tipo === 'ligacoes') regrasDasLigacoes(item, onde, { peca, porta, falha });
  });
  return erros;
}

/* As regras do item ligacoes: a placa e cada terminal existem na ficha, cada terminal está numa rede só e uma vez só,
   cada rede tem identificador próprio e a resposta cita só redes do item. */
function regrasDasLigacoes(item, onde, { peca, porta, falha }) {
  peca(`${onde}.placa`, item.placa);
  const redes = new Map();
  const terminais = new Map();
  item.redes.forEach((rede, r) => {
    const aqui = `${onde}.redes[${r}]`;
    if (redes.has(rede.id)) falha(`${aqui}.id`, `identificador repetido, já usado em ${onde}.redes[${redes.get(rede.id)}]`, rede.id);
    else redes.set(rede.id, r);
    rede.terminais.forEach((t, k) => {
      porta(`${aqui}.terminais[${k}]`, t);
      const chave = `${t.peca}\u0000${t.porta}`;
      const antes = terminais.get(chave);
      if (!antes) terminais.set(chave, { r, k, id: rede.id });
      else if (antes.r === r) falha(`${aqui}.terminais[${k}]`, `terminal repetido na rede, já em ${aqui}.terminais[${antes.k}]`, t);
      else falha(`${aqui}.terminais[${k}]`, `terminal já ligado à rede "${antes.id}" em ${onde}.redes[${antes.r}].terminais[${antes.k}]`, t);
    });
  });
  (item.resposta?.redes ?? []).forEach((id, k) => { if (!redes.has(id)) falha(`${onde}.resposta.redes[${k}]`, 'cita uma rede que não existe no item', id); });
}

/* Confere um documento já lido. Devolve { tipo, versao, erros }; `lerFicha` dá a ficha que um pedido cita. */
export function conferir(dado, { lerFicha } = {}) {
  const erros = [];
  if (!ehObjeto(dado)) return { tipo: '?', versao: '?', erros: [{ caminho: '$', regra: 'tem de ser objeto', valor: dado }] };
  const { tipo, versao } = dado;
  if (!TIPOS.includes(tipo)) {
    return { tipo: '?', versao: String(versao ?? '?'), erros: [{ caminho: '$.tipo', regra: `tem de ser um de ${TIPOS.map((t) => `"${t}"`).join(', ')}`, valor: tipo }] };
  }
  const esquema = lerEsquema(tipo);
  const conhecidas = esquema.properties.versao.enum;
  if (!conhecidas.includes(versao)) {
    return { tipo, versao: String(versao ?? '?'), erros: [{ caminho: '$.versao', regra: `versão desconhecida; o esquema da ${tipo} conhece ${conhecidas.join(', ')}`, valor: versao }] };
  }
  validar(dado, esquema, '$', esquema, erros);
  if (!erros.length && tipo === 'ficha') erros.push(...regrasDaFicha(dado));
  if (!erros.length && tipo === 'pedido') {
    const lida = lerFicha?.(dado);
    if (lida?.erro) erros.push({ caminho: '$.ficha.caminho', regra: lida.erro, valor: dado.ficha.caminho });
    else if (lida) {
      const daFicha = conferir(lida.ficha);
      if (daFicha.tipo !== 'ficha' || daFicha.erros.length) erros.push({ caminho: '$.ficha.caminho', regra: `a ficha citada é recusada (${daFicha.erros.length} problema(s)); confira-a antes`, valor: lida.caminho });
      else erros.push(...regrasDoPedido(dado, lida.ficha));
    }
  }
  const unicos = new Map();
  for (const e of erros) if (!unicos.has(e.caminho)) unicos.set(e.caminho, e);
  return { tipo, versao, erros: [...unicos.values()] };
}

function lerJson(caminho) {
  try { return { dado: JSON.parse(readFileSync(caminho, 'utf8')) }; } catch (e) { return { erro: e.code === 'ENOENT' ? 'arquivo não encontrado' : `não é JSON válido (${e.message})` }; }
}

/* Confere um arquivo e devolve { aceito, texto }, com o texto que a linha de comando imprime. */
export function conferirArquivo(arquivo, { ficha: arquivoDaFicha } = {}) {
  const lido = lerJson(arquivo);
  if (lido.erro) return { aceito: false, texto: `${arquivo}: recusado: ${lido.erro}\n` };
  const lerFicha = (pedido) => {
    const caminho = arquivoDaFicha ?? join(dirname(arquivo), pedido.ficha.caminho);
    const ficha = lerJson(caminho);
    return ficha.erro ? { erro: `a ficha ${caminho}: ${ficha.erro}; passe --ficha=<arquivo>` } : { ficha: ficha.dado, caminho };
  };
  const { tipo, versao, erros } = conferir(lido.dado, { lerFicha });
  if (!erros.length) return { aceito: true, texto: `${arquivo}: aceito (${tipo}, versão ${versao})\n` };
  const linhas = erros.map((e) => `  ${e.caminho}: ${e.regra}; recebido ${mostrar(e.valor)}`);
  return { aceito: false, texto: `${arquivo}: recusado (${tipo}, versão ${versao}), ${erros.length} problema(s)\n${linhas.join('\n')}\n` };
}

function executar() {
  const args = process.argv.slice(2);
  const ficha = args.find((a) => a.startsWith('--ficha='))?.slice('--ficha='.length);
  const arquivos = args.filter((a) => !a.startsWith('--'));
  if (arquivos.length !== 1 || args.includes('--ajuda')) {
    console.error('uso: npm run ponte:conferir -- <arquivo> [--ficha=<arquivo>]');
    process.exitCode = 2;
    return;
  }
  const { aceito, texto } = conferirArquivo(arquivos[0], { ficha });
  process.stdout.write(texto);
  if (!aceito) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) executar();
