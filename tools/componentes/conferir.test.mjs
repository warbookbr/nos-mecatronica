import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { CATALOGO, CATEGORIAS, conferir, conferirArquivo, conferirCatalogo, conferirTudo, ERRADOS, lerCatalogo, lerEsquema } from './conferir.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '../..');
const ler = (nome) => JSON.parse(readFileSync(join(RAIZ, CATALOGO, `${nome}.json`), 'utf8'));
const caminhos = (r) => r.erros.map((e) => e.caminho);

describe('componentes:conferir sobre o catálogo', () => {
  it('o esquema é JSON Schema 2020-12 na versão 1.0, com as origens da ponte', () => {
    const esquema = lerEsquema();
    expect(esquema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(esquema.properties.versao.enum).toEqual(['1.0']);
    expect(esquema.$defs.origem.enum).toEqual(['declarado', 'medido', 'estimativa']);
    expect(esquema.properties.categoria.enum).toEqual(CATEGORIAS);
  });

  it('aceita o catálogo inteiro e recusa cada errado como esperado', () => {
    const { aceito, texto } = conferirTudo();
    expect(texto).toMatch(/componentes\/motor-17hs4401\.json: aceito \(componente, versão 1\.0\)/);
    expect(texto).toMatch(/tools\/componentes\/errados: 3 arquivo\(s\) recusado\(s\) como esperado/);
    expect(aceito).toBe(true);
  });

  it('o catálogo tem os componentes do plano: só NEMA 17 e NEMA 23, as reduções, os três drivers e o que a pessoa já tem', () => {
    const catalogo = lerCatalogo();
    expect(catalogo.length).toBeGreaterThanOrEqual(10);
    expect(catalogo.length).toBeLessThanOrEqual(15);
    const motores = catalogo.filter((c) => c.categoria === 'motor-de-passo');
    expect(new Set(motores.map((m) => m.especificacao.tamanho))).toEqual(new Set(['nema-17', 'nema-23']));
    expect(new Set(catalogo.filter((c) => c.categoria === 'reducao').map((r) => r.especificacao.tipo))).toEqual(new Set(['polia-e-correia', 'planetaria']));
    expect(catalogo.filter((c) => c.categoria === 'driver').map((c) => c.id)).toEqual(['driver-a4988', 'driver-drv8825', 'driver-tmc2209']);
    expect(catalogo.filter((c) => c.jaTem).map((c) => c.id)).toEqual(['fonte-12v-5a', 'placa-arduino-uno']);
    for (const c of catalogo) expect(c.preco).toMatchObject({ origem: 'estimativa' });
  });

  const errados = readdirSync(join(RAIZ, ERRADOS)).filter((n) => n.endsWith('.json')).sort();
  it('há um arquivo errado por regra do plano, cada um com a recusa ao lado', () => {
    expect(errados).toEqual(['curva-fora-de-ordem.componente.json', 'numero-sem-origem.componente.json', 'sem-fonte.componente.json']);
    const recusas = readdirSync(join(RAIZ, ERRADOS)).filter((n) => n.endsWith('.recusa.txt')).sort();
    expect(recusas).toEqual(errados.map((n) => n.replace(/\.json$/, '.recusa.txt')));
  });

  it.each(errados)('recusa %s com o caminho do campo e o valor', (nome) => {
    const { aceito, texto } = conferirArquivo(`${ERRADOS}/${nome}`, { raiz: RAIZ });
    expect(aceito).toBe(false);
    expect(texto).toBe(readFileSync(join(RAIZ, ERRADOS, nome.replace(/\.json$/, '.recusa.txt')), 'utf8'));
    expect(texto).toMatch(/recusado \(componente, versão 1\.0\), 1 problema\(s\)\n {2}\$\.\S+: .+; recebido .+\n$/);
  });

  it('dá a mesma saída byte a byte pela linha de comando, e sai 1 na recusa', () => {
    const rodar = () => spawnSync(process.execPath, ['tools/componentes/conferir.mjs', `${ERRADOS}/sem-fonte.componente.json`], { cwd: RAIZ });
    const [a, b] = [rodar(), rodar()];
    expect(a.status).toBe(1);
    expect(Buffer.compare(a.stdout, b.stdout)).toBe(0);
    expect(a.stdout.toString()).toBe(readFileSync(join(RAIZ, ERRADOS, 'sem-fonte.componente.json'.replace(/\.json$/, '.recusa.txt')), 'utf8'));
  });
});

describe('regras do componente', () => {
  it('recusa a curva com torque subindo ou acima do de retenção', () => {
    const m = ler('motor-17hs4401');
    m.especificacao.curva.pontos[2][1] = 0.39;
    m.especificacao.curva.pontos[0][1] = 0.45;
    expect(conferir(m).erros.map((e) => `${e.caminho}: ${e.regra}`)).toEqual([
      '$.especificacao.curva.pontos[0]: o torque passa do de retenção, 0.4 N·m',
      '$.especificacao.curva.pontos[2]: curva fora de ordem: o torque não sobe com a velocidade, e o ponto anterior tem 0.32 N·m',
    ]);
  });

  it('recusa fonte vazia ou repetida, origem fora da lista, preço fora de ordem e data fora do formato', () => {
    const d = ler('driver-a4988');
    d.fontes = [];
    expect(caminhos(conferir(d))).toEqual(['$.fontes']);
    d.fontes = [{ nome: 'a', documento: 'x' }, { nome: 'a', documento: 'y' }];
    d.preco = { faixa: [30, 10], data: '23/11/2026', origem: 'estimativa' };
    expect(caminhos(conferir(d))).toEqual(['$.fontes[1].nome', '$.preco.data', '$.preco.faixa']);
    const r = ler('reducao-gt2-20-60');
    r.especificacao.eficiencia.origem = 'achado';
    r.preco.origem = 'declarado';
    expect(caminhos(conferir(r))).toEqual(['$.preco.origem', '$.especificacao.eficiencia.origem']);
  });

  it('recusa a especificação de outra categoria e campo desconhecido', () => {
    const f = ler('fonte-12v-5a');
    f.categoria = 'driver';
    f.cor = 'azul';
    const r = conferir(f);
    expect(caminhos(r)).toEqual(['$.cor', '$.especificacao.correnteMaxima', '$.especificacao.correnteContinua', '$.especificacao.tensaoLogica', '$.especificacao.micropasso', '$.especificacao.tensao.valor', '$.especificacao.corrente', '$.especificacao.potencia']);
  });

  it('recusa eficiência acima de 1 e corrente contínua acima da máxima', () => {
    const r = ler('reducao-gt2-20-80');
    r.especificacao.eficiencia.valor = 1.2;
    expect(caminhos(conferir(r))).toEqual(['$.especificacao.eficiencia.valor']);
    const d = ler('driver-drv8825');
    d.especificacao.correnteContinua.valor = 3;
    expect(caminhos(conferir(d))).toEqual(['$.especificacao.correnteContinua.valor']);
  });
});

describe('a pasta do catálogo', () => {
  let raiz;
  afterEach(() => rmSync(raiz, { recursive: true, force: true }));

  it('recusa id diferente do nome do arquivo, e lerCatalogo não lê catálogo recusado', () => {
    raiz = mkdtempSync(join(tmpdir(), 'componentes-'));
    cpSync(join(RAIZ, CATALOGO), join(raiz, CATALOGO), { recursive: true });
    cpSync(join(RAIZ, 'tools/componentes/componente.schema.json'), join(raiz, 'tools/componentes/componente.schema.json'));
    const m = ler('motor-17hs8401');
    m.id = 'motor-outro';
    writeFileSync(join(raiz, CATALOGO, 'motor-17hs8401.json'), JSON.stringify(m));
    const r = conferirCatalogo({ raiz });
    expect(r.aceito).toBe(false);
    expect(r.texto).toMatch(/motor-17hs8401\.json: recusado: \$\.id é "motor-outro" e tem de ser o nome do arquivo, "motor-17hs8401"/);
    expect(() => lerCatalogo({ raiz })).toThrow(/é recusado/);
  });
});
