import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { conferir, conferirArquivo, conferirPasta, conferirTudo, ERRADOS, ETAPAS, EXEMPLOS, lerEsquema, TIPOS } from './conferir.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '../..');
const EXEMPLO = `${EXEMPLOS}/objeto-de-teste`;
const ler = (caminho) => JSON.parse(readFileSync(join(RAIZ, caminho), 'utf8'));
const requisitos = () => ler(`${EXEMPLO}/requisitos.json`);
const caderno = () => ler(`${EXEMPLO}/caderno.json`);
const caminhos = (r) => r.erros.map((e) => e.caminho);

describe('objetos:conferir sobre os exemplos', () => {
  it('os esquemas são JSON Schema 2020-12 na versão 1.0', () => {
    for (const tipo of TIPOS) {
      const esquema = lerEsquema(tipo);
      expect(esquema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
      expect(esquema.properties.versao.enum).toEqual(['1.0']);
    }
  });

  it('os requisitos têm os campos do plano, na ordem das perguntas, e as origens do plano', () => {
    const esquema = lerEsquema('requisitos');
    expect(esquema.required.slice(5)).toEqual([
      'objetivo', 'carga', 'alcance', 'espacoDeTrabalho', 'precisao', 'repetibilidade', 'velocidade', 'cicloDeTrabalho',
      'ambiente', 'alimentacao', 'comando', 'orcamento', 'fabricacao', 'jaTem', 'seguranca',
    ]);
    expect(esquema.$defs.origem.enum).toEqual(['pessoa', 'sugestao-aceita', 'estimativa']);
  });

  it('aceita o exemplo, toda pasta de objetos/ e recusa cada errado como esperado', () => {
    const { aceito, texto } = conferirTudo();
    expect(texto).toMatch(/objetos\/braco-de-prova\/caderno\.json: aceito/);
    expect(texto).toMatch(/objeto-de-teste\/requisitos\.json: aceito \(requisitos, versão 1\.0\)/);
    expect(aceito).toBe(true);
  });

  const errados = readdirSync(join(RAIZ, ERRADOS)).filter((n) => n.endsWith('.json')).sort();
  it('há um arquivo errado por regra, cada um com a recusa esperada', () => {
    expect(errados).toEqual([
      'aprovacao-sem-frase.caderno.json', 'aprovada-depois-de-aberta.caderno.json', 'campo-ausente.requisitos.json',
      'obrigatorio-ausente.requisitos.json', 'reaberta-sem-motivo.caderno.json', 'valor-sem-origem.requisitos.json',
    ]);
    const recusas = readdirSync(join(RAIZ, ERRADOS)).filter((n) => n.endsWith('.recusa.txt')).sort();
    expect(recusas).toEqual(errados.map((n) => n.replace(/\.json$/, '.recusa.txt')));
  });

  it.each(errados)('recusa %s com o caminho do campo e o valor', (nome) => {
    const { aceito, texto } = conferirArquivo(`${ERRADOS}/${nome}`, { raiz: RAIZ });
    expect(aceito).toBe(false);
    expect(texto).toBe(readFileSync(join(RAIZ, ERRADOS, nome.replace(/\.json$/, '.recusa.txt')), 'utf8'));
    expect(texto).toMatch(/recusado \((requisitos|caderno), versão 1\.0\), 1 problema\(s\)\n {2}\$\.\S+: .+; recebido .+\n$/);
  });

  it('dá a mesma saída byte a byte pela linha de comando, e sai 1 na recusa', () => {
    const rodar = () => spawnSync(process.execPath, ['tools/objetos/conferir.mjs', `${ERRADOS}/valor-sem-origem.requisitos.json`], { cwd: RAIZ });
    const [a, b] = [rodar(), rodar()];
    expect(a.status).toBe(1);
    expect(Buffer.compare(a.stdout, b.stdout)).toBe(0);
    expect(a.stdout.toString()).toBe(readFileSync(join(RAIZ, ERRADOS, 'valor-sem-origem.requisitos.recusa.txt'), 'utf8'));
  });
});

describe('regras do caderno', () => {
  it('recusa etapa fora de ordem, aprovação incompleta, quem é a IA e data fora do formato', () => {
    const c = caderno();
    [c.etapas[1].etapa, c.etapas[2].etapa] = ['forma', 'componentes'];
    c.etapas[0].aprovacao = { quem: 'Claude', data: '23/11/2026', frase: 'ok' };
    expect(conferir(c).erros.map((e) => `${e.caminho}: ${e.regra}`)).toEqual([
      '$.etapas[0].aprovacao.quem: quem aprova é a pessoa, nunca a IA',
      '$.etapas[0].aprovacao.data: escreva a data como AAAA-MM-DD',
      '$.etapas[0].aprovacao.oQue: etapa aprovada exige o que foi aprovado',
      `$.etapas[1].etapa: tem de ser "componentes"; as etapas vêm na ordem ${ETAPAS.join(', ')}`,
      `$.etapas[2].etapa: tem de ser "forma"; as etapas vêm na ordem ${ETAPAS.join(', ')}`,
    ]);
  });

  it('recusa etapa aprovada sem aprovação e aprovada depois de reaberta ou aguardando a pessoa', () => {
    const c = caderno();
    c.etapas[0] = { etapa: 'requisitos', estado: 'reaberta', arquivos: ['requisitos.json'], motivo: 'A carga mudou para 300 g.', aprovacao: c.etapas[0].aprovacao };
    c.etapas[1] = { etapa: 'componentes', estado: 'aprovada', arquivos: [] };
    expect(caminhos(conferir(c))).toEqual(['$.etapas[1].aprovacao', '$.etapas[1].estado']);
    const d = caderno();
    d.etapas[1].estado = 'aguarda-pessoa';
    d.etapas[2] = { ...d.etapas[0], etapa: 'forma' };
    expect(conferir(d).erros.map((e) => e.regra)).toEqual(['etapa aprovada depois de $.etapas[1], que está "aguarda-pessoa"; aprove na ordem ou reabra esta']);
  });

  it('aceita o caderno todo aberto e o reaberto com motivo', () => {
    const c = caderno();
    for (const e of c.etapas) { e.estado = 'aberta'; delete e.aprovacao; }
    expect(conferir(c).erros).toEqual([]);
    c.etapas[0].estado = 'reaberta';
    c.etapas[0].motivo = 'O orçamento caiu pela metade.';
    expect(conferir(c).erros).toEqual([]);
  });

  it('recusa estado fora da lista e etapa a mais', () => {
    const c = caderno();
    c.etapas[3].estado = 'feita';
    c.etapas.push({ etapa: 'pacote', estado: 'aberta', arquivos: [] });
    expect(caminhos(conferir(c))).toEqual(['$.etapas', '$.etapas[3].estado']);
  });
});

describe('regras dos requisitos', () => {
  it('recusa origem fora da lista, campo desconhecido e valor do tipo errado', () => {
    const r = requisitos();
    r.carga.piorCaso.origem = 'medido';
    r.cor = 'azul';
    r.alcance.valor = -5;
    r.comando.valor = ['joystick'];
    expect(caminhos(conferir(r))).toEqual(['$.carga.piorCaso.origem', '$.alcance.valor', '$.comando.valor[0]', '$.cor']);
  });

  it('aceita campo opcional ausente com motivo e recusa ausente sem motivo', () => {
    const r = requisitos();
    r.seguranca = { ausente: true, motivo: 'A pessoa vai decidir depois de ver os componentes.' };
    r.velocidade.ponta = { ausente: true, motivo: 'Não importa para a tarefa.' };
    expect(conferir(r).erros).toEqual([]);
    r.ambiente = { ausente: true };
    expect(caminhos(conferir(r))).toEqual(['$.ambiente.motivo']);
  });

  it('recusa folha obrigatória com valor escrita como ausente, numa só linha', () => {
    const r = requisitos();
    r.orcamento.quantia = { ausente: true, motivo: 'Não sabe.' };
    r.alimentacao = { ausente: true, motivo: 'Não sabe.' };
    expect(conferir(r).erros.map((e) => `${e.caminho}: ${e.regra}`)).toEqual([
      '$.alimentacao: é obrigatório com valor e não pode sair ausente; pergunte de novo à pessoa',
      '$.orcamento.quantia: é obrigatório com valor e não pode sair ausente; pergunte de novo à pessoa',
    ]);
  });
});

describe('a pasta do objeto', () => {
  let raiz;
  afterEach(() => rmSync(raiz, { recursive: true, force: true }));
  const montar = () => {
    raiz = mkdtempSync(join(tmpdir(), 'objetos-'));
    cpSync(join(RAIZ, EXEMPLO), join(raiz, 'objeto-de-teste'), { recursive: true });
    return (nome, dado) => writeFileSync(join(raiz, 'objeto-de-teste', nome), JSON.stringify(dado));
  };

  it('aceita a etapa de requisitos aberta sem o requisitos.json, e recusa sem ele em outro estado', () => {
    const gravar = montar();
    rmSync(join(raiz, 'objeto-de-teste/requisitos.json'));
    const c = caderno();
    for (const e of c.etapas) { e.estado = 'aberta'; e.arquivos = []; delete e.aprovacao; }
    gravar('caderno.json', c);
    expect(conferirPasta('objeto-de-teste', { raiz }).aceito).toBe(true);
    c.etapas[0].estado = 'aguarda-pessoa';
    gravar('caderno.json', c);
    const r = conferirPasta('objeto-de-teste', { raiz });
    expect(r.aceito).toBe(false);
    expect(r.texto).toMatch(/requisitos\.json: recusado: não existe, e a etapa de requisitos está "aguarda-pessoa"/);
  });

  it('recusa objeto com nome diferente da pasta e arquivo citado que não existe', () => {
    const gravar = montar();
    const r = requisitos();
    r.objeto = 'outro-objeto';
    gravar('requisitos.json', r);
    const c = caderno();
    c.etapas[1].arquivos = ['opcoes.json'];
    gravar('caderno.json', c);
    const { aceito, texto } = conferirPasta('objeto-de-teste', { raiz });
    expect(aceito).toBe(false);
    expect(texto).toMatch(/requisitos\.json: recusado: \$\.objeto é "outro-objeto" e tem de ser o nome da pasta, "objeto-de-teste"/);
    expect(texto).toMatch(/\$\.etapas\[1\]\.arquivos\[0\] cita "opcoes\.json", que não existe na pasta/);
  });

  it('recusa pasta sem caderno', () => {
    montar();
    rmSync(join(raiz, 'objeto-de-teste/caderno.json'));
    expect(conferirPasta('objeto-de-teste', { raiz }).texto).toMatch(/caderno\.json: recusado: arquivo não encontrado/);
  });
});
