import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { conferir, conferirArquivo, girar, lerEsquema, TIPOS } from './conferir.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '../..');
const EXEMPLOS = 'ponte/exemplos';
const ERRADOS = `${EXEMPLOS}/errados`;
const ler = (caminho) => JSON.parse(readFileSync(join(RAIZ, caminho), 'utf8'));
const ficha = () => ler(`${EXEMPLOS}/braco-de-prova.ficha.json`);
const pedido = () => ler(`${EXEMPLOS}/braco-de-prova.pedido.json`);
const comFicha = (f) => ({ lerFicha: () => ({ ficha: f, caminho: 'ficha.json' }) });
const caminhos = (r) => r.erros.map((e) => e.caminho);

describe('ponte:conferir sobre os exemplos', () => {
  it('os esquemas são JSON Schema 2020-12; a ficha conhece 1.0 e 1.1 e o pedido também a 1.2', () => {
    const versoes = { ficha: ['1.0', '1.1'], pedido: ['1.0', '1.1', '1.2'] };
    for (const tipo of TIPOS) {
      const esquema = lerEsquema(tipo);
      expect(esquema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
      expect(esquema.properties.versao.enum).toEqual(versoes[tipo]);
    }
  });

  it('aceita o pedido inicial do braço de prova sem ler ficha', () => {
    process.chdir(RAIZ);
    const { aceito, texto } = conferirArquivo(`${EXEMPLOS}/braco-de-prova.pedido-inicial.json`, { ficha: 'nao-existe.json' });
    expect(texto).toMatch(/aceito \(pedido, versão 1\.2\)/);
    expect(aceito).toBe(true);
  });

  it('aceita a ficha e o pedido do braço de prova', () => {
    process.chdir(RAIZ);
    for (const nome of ['braco-de-prova.ficha.json', 'braco-de-prova.pedido.json']) {
      const { aceito, texto } = conferirArquivo(`${EXEMPLOS}/${nome}`);
      expect(texto).toMatch(/aceito \((ficha|pedido), versão 1\.1\)/);
      expect(aceito).toBe(true);
    }
  });

  const errados = readdirSync(join(RAIZ, ERRADOS)).filter((n) => n.endsWith('.json')).sort();
  it('há um arquivo errado por regra, cada um com a recusa esperada', () => {
    expect(errados).toEqual([
      'acopla-inexistente.pedido.json', 'campo-ausente.ficha.json', 'componente-sem-caixa.pedido.json',
      'item-no-pedido-inicial.pedido.json', 'massa-sem-origem.pedido.json', 'peca-inexistente.pedido.json', 'placa-inexistente.pedido.json',
      'rede-com-um-terminal.pedido.json', 'rede-da-resposta-inexistente.pedido.json', 'rede-repetida.pedido.json',
      'serve-junta-inexistente.pedido.json', 'serve-peca-inexistente.pedido.json', 'terminal-em-duas-redes.pedido.json', 'terminal-inexistente.pedido.json', 'terminal-repetido.pedido.json',
      'tipo-de-porta.ficha.json', 'valor-sem-origem.ficha.json', 'versao-desconhecida.ficha.json',
    ]);
    const recusas = readdirSync(join(RAIZ, ERRADOS)).filter((n) => n.endsWith('.recusa.txt')).sort();
    expect(recusas).toEqual(errados.map((n) => n.replace(/\.json$/, '.recusa.txt')));
  });

  it.each(errados)('recusa %s com o campo, o valor e a versão esperados', (nome) => {
    process.chdir(RAIZ);
    const { aceito, texto } = conferirArquivo(`${ERRADOS}/${nome}`);
    expect(aceito).toBe(false);
    expect(texto).toBe(readFileSync(join(RAIZ, ERRADOS, nome.replace(/\.json$/, '.recusa.txt')), 'utf8'));
    expect(texto).toMatch(/recusado \((ficha|pedido), versão \d+\.\d+\), 1 problema\(s\)\n {2}\$\.\S+: .+; recebido .+\n$/);
  });

  it('dá a mesma saída byte a byte pela linha de comando', () => {
    const rodar = () => spawnSync(process.execPath, ['tools/ponte/conferir.mjs', `${ERRADOS}/tipo-de-porta.ficha.json`], { cwd: RAIZ });
    const [a, b] = [rodar(), rodar()];
    expect(a.status).toBe(1);
    expect(Buffer.compare(a.stdout, b.stdout)).toBe(0);
    expect(a.stdout.toString()).toBe(readFileSync(join(RAIZ, ERRADOS, 'tipo-de-porta.ficha.recusa.txt'), 'utf8'));
  });

  it('usa a ficha de --ficha quando dada e recusa o pedido de ficha recusada', () => {
    process.chdir(RAIZ);
    const { texto } = conferirArquivo(`${EXEMPLOS}/braco-de-prova.pedido.json`, { ficha: `${ERRADOS}/campo-ausente.ficha.json` });
    expect(texto).toMatch(/\$\.ficha\.caminho: a ficha citada é recusada \(1 problema\(s\)\)/);
  });
});

describe('regras de referência da ficha', () => {
  it('recusa porta, junta e volume que citam peça ausente, e peça de conjunto ausente', () => {
    const f = ficha();
    f.portas[0].peca = 'motor-punho';
    f.juntas[0].acionadaPor = 'motor-punho';
    f.volumesLivres[1].dentroDe = 'torre';
    f.pecas[5].conjunto = 'elo-3';
    expect(caminhos(conferir(f))).toEqual([
      '$.pecas[5].conjunto', '$.portas[0].peca', '$.volumesLivres[1].dentroDe', '$.juntas[0].acionadaPor',
      '$.conjuntos[0].massa.valor', '$.conjuntos[0].centroDeMassa.valor',
    ]);
  });

  it('recusa identificador repetido e junta com o filho no conjunto do pai ou em conjunto fixo', () => {
    const f = ficha();
    f.portas[1].id = 'a1';
    f.juntas[1].filho = 'motor-cotovelo';
    f.juntas[0].filho = 'fonte';
    const r = conferir(f);
    expect(r.erros.map((e) => `${e.caminho}: ${e.regra}`)).toEqual([
      '$.portas[1].id: identificador repetido, já usado em $.portas[0]',
      '$.juntas[0].filho: está no mesmo conjunto do pai ("fixo")',
      '$.juntas[1].filho: está no mesmo conjunto do pai ("elo-1")',
    ]);
  });

  it('recusa massa, centro de massa e inércia de conjunto que não batem com as peças', () => {
    const f = ficha();
    f.conjuntos[0].massa.valor = 900;
    f.conjuntos[1].centroDeMassa.valor = [18.3, 290, 0];
    f.conjuntos[1].inercia.valor.ixy = -150700;
    f.conjuntos[2].massa.origem = 'medido';
    expect(conferir(f).erros.map((e) => e.caminho)).toEqual([
      '$.conjuntos[0].massa.valor', '$.conjuntos[1].centroDeMassa.valor', '$.conjuntos[1].inercia.valor', '$.conjuntos[2].massa.origem',
    ]);
  });

  it('gira pela regra da mão direita: 90 grau em y leva z a x', () => {
    expect(girar({ eixo: [0, 1, 0], angulo: 90 }, [0, 0, 1]).map((x) => Math.round(x * 1e9) / 1e9 + 0)).toEqual([1, 0, 0]);
  });

  it('recusa campo desconhecido, tipo errado e ausente sem motivo', () => {
    const f = ficha();
    f.pecas[0].cor = 'cinza';
    f.revisao = '3';
    f.pecas[10].inercia = { ausente: true };
    expect(caminhos(conferir(f))).toEqual(['$.revisao', '$.pecas[0].cor', '$.pecas[10].inercia.motivo']);
  });
});

describe('regras de referência do pedido', () => {
  it('recusa porta que a peça não tem, junta ausente, listas de tamanhos diferentes e revisão de outra ficha', () => {
    const p = pedido();
    p.ficha.revisao = 4;
    p.itens[2].de[0].porta = 'c1';
    p.itens[2].para.pop();
    p.itens[2].atravessa = ['punho'];
    p.itens[3].em = 'tampa';
    expect(conferir(p, comFicha(ficha())).erros.map((e) => `${e.caminho}: ${e.regra}`)).toEqual([
      '$.ficha.revisao: a ficha conferida é a revisão 3',
      '$.itens[2].de[0].porta: cita uma porta que a peça "motor-cotovelo" não tem na ficha',
      '$.itens[2].para: tem de ter tantas portas quanto "de", 4',
      '$.itens[2].atravessa[0]: cita uma junta que não existe na ficha',
      '$.itens[3].em: cita uma peça que não existe na ficha',
    ]);
  });

  it('recusa tipo de item fora da lista e resposta sem o que o estado pede', () => {
    const p = pedido();
    p.itens[3].tipo = 'furo';
    p.itens[0].resposta = { estado: 'cumprido' };
    p.itens[1].resposta.estado = 'talvez';
    expect(caminhos(conferir(p, comFicha(ficha())))).toEqual([
      '$.itens[0].resposta.revisaoDaFicha', '$.itens[1].resposta.estado', '$.itens[3].tipo',
    ]);
  });

  it('recusa no item ligacoes a placa e o terminal que a ficha não tem, o terminal repetido ou em duas redes e a rede curta', () => {
    const p = pedido();
    const lig = p.itens[4];
    lig.placa = 'placa';
    lig.redes[0].terminais[1].peca = 'driver-punho';
    lig.redes[2].terminais.push({ peca: 'driver-ombro', porta: 'gnd' }, { peca: 'driver-cotovelo', porta: 'vdd' });
    lig.redes[3].id = 'gnd';
    lig.resposta = { estado: 'nao-cumprido', motivo: 'não fechou', redes: ['led-estado', 'led'] };
    expect(conferir(p, comFicha(ficha())).erros.map((e) => `${e.caminho}: ${e.regra}`)).toEqual([
      '$.itens[4].placa: cita uma peça que não existe na ficha',
      '$.itens[4].redes[0].terminais[1].peca: cita uma peça que não existe na ficha',
      '$.itens[4].redes[2].terminais[3]: terminal já ligado à rede "gnd" em $.itens[4].redes[1].terminais[0]',
      '$.itens[4].redes[2].terminais[4]: terminal repetido na rede, já em $.itens[4].redes[2].terminais[2]',
      '$.itens[4].redes[3].id: identificador repetido, já usado em $.itens[4].redes[1]',
      '$.itens[4].resposta.redes[1]: cita uma rede que não existe no item',
    ]);
    lig.redes[4].terminais.pop();
    expect(caminhos(conferir(p, comFicha(ficha())))).toEqual(['$.itens[4].redes[4].terminais']);
  });
});

describe('compatibilidade com a 1.0', () => {
  const para10 = (doc) => ({ ...doc, versao: '1.0' });

  it('aceita a ficha e o pedido 1.0, que não usam a porta passiva nem o item ligacoes', () => {
    const f = para10(ficha());
    f.portas = f.portas.filter((x) => x.tipo !== 'passivo');
    const p = para10(pedido());
    p.itens = p.itens.filter((x) => x.tipo !== 'ligacoes');
    expect(conferir(f).erros).toEqual([]);
    expect(conferir(p, comFicha(ficha())).erros).toEqual([]);
  });

  it('recusa a porta passiva e o item ligacoes num arquivo 1.0', () => {
    const f = para10(ficha());
    const passiva = f.portas.findIndex((x) => x.tipo === 'passivo');
    expect(conferir(f).erros.map((e) => `${e.caminho}: ${e.valor}`)[0]).toBe(`$.portas[${passiva}].tipo: passivo`);
    expect(conferir(para10(pedido()), comFicha(ficha())).erros.map((e) => `${e.caminho}: ${e.valor}`)).toEqual(['$.itens[4].tipo: ligacoes']);
  });

  it('recusa o tipo fora da lista num arquivo 1.0 com a lista da 1.0', () => {
    const f = para10(ficha());
    f.portas = f.portas.filter((x) => x.tipo !== 'passivo');
    f.portas[0].tipo = 'pwm';
    expect(conferir(f).erros.map((e) => e.regra)).toEqual(['tem de ser um de "alimentacao", "terra", "sinal-digital", "sinal-analogico", "barramento", "fase-de-motor"']);
  });

  it('exige a tensão ausente na porta passiva', () => {
    const f = ficha();
    const passiva = f.portas.findIndex((x) => x.tipo === 'passivo');
    f.portas[passiva].tensao = { valor: 3.3, origem: 'declarado' };
    expect(caminhos(conferir(f))).toEqual([`$.portas[${passiva}].tensao.ausente`, `$.portas[${passiva}].tensao.motivo`, `$.portas[${passiva}].tensao.valor`, `$.portas[${passiva}].tensao.origem`]);
  });
});

describe('versão 1.2: o pedido inicial e o item componente', () => {
  const inicial = () => ler(`${EXEMPLOS}/braco-de-prova.pedido-inicial.json`);
  const componente = (serve) => ({ ...inicial().itens[0], serve });

  it('aceita item componente num pedido 1.2 que responde à ficha, com serve e resposta que ela tem', () => {
    const p = { ...pedido(), versao: '1.2' };
    p.itens.push({ ...componente({ junta: 'ombro' }), resposta: { estado: 'cumprido', revisaoDaFicha: 3, peca: 'motor-ombro' } });
    p.itens.push({ ...componente({ peca: 'base' }), id: 'outro', acopla: 'motor-23hs30-2804s' });
    expect(conferir(p, comFicha(ficha())).erros).toEqual([]);
    p.itens[5].resposta.peca = 'motor-punho';
    expect(caminhos(conferir(p, comFicha(ficha())))).toEqual(['$.itens[5].resposta.peca']);
  });

  it('recusa o item componente e a revisão 0 num pedido 1.1', () => {
    const p = pedido();
    p.itens.push(componente({ junta: 'ombro' }));
    expect(conferir(p, comFicha(ficha())).erros.map((e) => `${e.caminho}: ${e.valor}`)).toEqual(['$.itens[5].tipo: componente']);
    const q = { ...inicial(), versao: '1.1' };
    expect(caminhos(conferir(q))).toContain('$.ficha.revisao');
  });

  it('recusa acopla que cita item que não é componente e serve sem junta nem peça', () => {
    const p = { ...pedido(), versao: '1.2' };
    p.itens.push({ ...componente({}), acopla: p.itens[0].id });
    expect(caminhos(conferir(p, comFicha(ficha())))).toEqual(['$.itens[5].serve.peca']);
    p.itens[5].serve = { peca: 'base' };
    expect(caminhos(conferir(p, comFicha(ficha())))).toEqual(['$.itens[5].acopla']);
  });
});
