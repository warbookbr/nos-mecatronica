import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { lerCatalogo } from '../../../tools/componentes/conferir.mjs';
import { dimensionarBraco, fatoresDaPose, GRAVIDADE, massaPorComprimento } from './braco.mjs';
import { dimensionar, HIPOTESES, lerRequisitos, texto } from './dimensionar.mjs';
import { gerarOpcoes } from './opcoes.mjs';
import { avaliarJunta, torqueNaCurva } from './selecao.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const g = GRAVIDADE;
const perto = (a, b, casas = 9) => expect(a).toBeCloseTo(b, casas);

/* O braço de teste: dois elos de 100 mm e 10 g cada, 200 g no cotovelo, 100 g na ponta (distância 0), a ponta a
   100 mm/s e 1000 mm/s², e a varredura reduzida à pose com o cotovelo a 90 graus (ponta a 100·√2 mm do ombro). */
const TESTE = {
  comprimentos: [100, 100], massasDosElos: [10, 10], carga: 100, distanciaDaCarga: 0, massaNoCotovelo: 200,
  velocidadeDaPonta: 100, aceleracaoDaPonta: 1000, raioMinimo: 100 * Math.SQRT2, raioMaximo: 100 * Math.SQRT2,
};

describe('o braço de teste contra a conta à mão', () => {
  const [j1, j2] = dimensionarBraco(TESTE).juntas;

  it('gravidade na pose esticada', () => {
    // junta 2: 0,010 kg × 0,05 m + 0,100 kg × 0,10 m = 0,0105 kg·m
    perto(j2.torqueGravidade, g * 0.0105);
    // junta 1: 0,010 × 0,05 + 0,200 × 0,10 + 0,010 × 0,15 + 0,100 × 0,20 = 0,042 kg·m
    perto(j1.torqueGravidade, g * 0.042);
    perto(j1.torqueGravidade, 0.4118793, 6);
  });

  it('inércia na pose esticada', () => {
    // junta 2: 0,010 × 0,1² ÷ 3 + 0,100 × 0,1² = 0,00103333 kg·m²
    perto(j2.inercia, 0.01 * 0.01 / 3 + 0.001, 12);
    // junta 1: 0,010 × 0,1² ÷ 3 + 0,200 × 0,1² + 0,010 × (0,1² ÷ 12 + 0,15²) + 0,100 × 0,2² = 0,00626667 kg·m²
    perto(j1.inercia, 0.01 * 0.01 / 3 + 0.002 + 0.01 * (0.01 / 12 + 0.0225) + 0.004, 12);
  });

  it('velocidade, aceleração e torque de aceleração com o cotovelo a 90 graus', () => {
    // Com θ2 = 90°: junta 1 gira v ÷ L1 = 0,1 ÷ 0,1 = 1 rad/s; junta 2 gira v · r ÷ (L1 · L2) = 0,1 × 0,141421 ÷ 0,01 rad/s.
    perto(j1.velocidade, 1);
    perto(j2.velocidade, Math.SQRT2);
    perto(j1.aceleracao, 10);
    perto(j2.aceleracao, 10 * Math.SQRT2);
    perto(j1.torqueAceleracao, 0.00626667 * 10, 7);
    perto(j2.torqueAceleracao, 0.00103333 * 10 * Math.SQRT2, 7);
    perto(j1.torqueTotal, j1.torqueGravidade + j1.torqueAceleracao, 12);
  });

  it('a carga além da ponta e a massa no cotovelo entram com o braço de alavanca certo', () => {
    const [k1, k2] = dimensionarBraco({ ...TESTE, distanciaDaCarga: 50, massaNoCotovelo: 0 }).juntas;
    perto(k2.torqueGravidade, g * (0.01 * 0.05 + 0.1 * 0.15));
    perto(k1.torqueGravidade, g * (0.01 * 0.05 + 0.01 * 0.15 + 0.1 * 0.25));
  });

  it('os fatores da pose e a seção do elo', () => {
    const f = fatoresDaPose(150, 150, 100);
    // cos θ2 = (100² − 2 × 150²) ÷ (2 × 150²) = −7/9
    const s2 = Math.sqrt(1 - (7 / 9) ** 2);
    perto(f.junta1, 1 / (0.15 * s2));
    perto(f.junta2, 0.1 / (0.15 * 0.15 * s2));
    expect(() => fatoresDaPose(150, 150, 300)).toThrow(/fora do alcance útil/);
    expect(massaPorComprimento({ largura: 30, altura: 20, parede: 2.5, densidade: 1.24 })).toEqual({ area: 225, gPorMm: 0.279 });
  });
});

describe('o torque de um conjunto do catálogo', () => {
  const catalogo = lerCatalogo();
  const de = (id) => catalogo.find((c) => c.id === id);

  it('lê a curva por interpolação, com o primeiro ponto embaixo e zero acima do último', () => {
    const pontos = [[30, 0.5], [60, 0.5], [120, 0.3], [240, 0.1]];
    expect(torqueNaCurva(pontos, 10)).toBe(0.5);
    perto(torqueNaCurva(pontos, 90), 0.4);
    perto(torqueNaCurva(pontos, 180), 0.2);
    expect(torqueNaCurva(pontos, 241)).toBe(0);
  });

  it('confere à mão o 17HS4401 com a correia de 3:1 e o DRV8825', () => {
    // 1 rad/s na junta é 3 rad/s no motor, 28,65 rpm, abaixo do primeiro ponto: 0,32 N·m da curva; o DRV8825 sustenta
    // 1,5 A dos 1,7 A nominais; na saída, × 3 × 0,95.
    const a = avaliarJunta({ torque: 0.4, velocidade: 1 }, de('motor-17hs4401'), de('reducao-gt2-20-60'), de('driver-drv8825'));
    perto(a.rpmDoMotor, 3 * 60 / (2 * Math.PI));
    perto(a.torqueDisponivel, 0.32 * (1.5 / 1.7) * 3 * 0.95);
    perto(a.folga, (0.32 * (1.5 / 1.7) * 3 * 0.95) / 0.4);
    expect(a.limitadoPor).toBe('motor');
    expect(a.massa).toBe(340);
    // O NEMA 23 de 1,9 N·m na correia de 4:1 passa do torque máximo da correia, 2,5 N·m.
    const b = avaliarJunta({ torque: 1, velocidade: 1 }, de('motor-23hs30-2804s'), de('reducao-gt2-20-80'), de('driver-tmc2209'));
    expect(b.limitadoPor).toBe('reducao');
    expect(b.torqueDisponivel).toBe(2.5);
  });
});

describe('o braço de prova', () => {
  const requisitos = lerRequisitos('braco-de-prova');
  const catalogo = lerCatalogo();

  it('o dimensionamento e as opções saem iguais em duas execuções e iguais aos arquivos gravados', () => {
    const d1 = texto(dimensionar(requisitos, catalogo));
    const d2 = texto(dimensionar(lerRequisitos('braco-de-prova'), lerCatalogo()));
    expect(d1).toBe(d2);
    expect(d1).toBe(readFileSync(join(RAIZ, 'objetos/braco-de-prova/dimensionamento.json'), 'utf8'));
    const o1 = texto(gerarOpcoes(requisitos, JSON.parse(d1), catalogo));
    const o2 = texto(gerarOpcoes(requisitos, JSON.parse(d2), lerCatalogo()));
    expect(o1).toBe(o2);
    expect(o1).toBe(readFileSync(join(RAIZ, 'objetos/braco-de-prova/opcoes.json'), 'utf8'));
  });

  it('pela linha de comando, --check acha os dois arquivos em dia', () => {
    for (const script of ['dimensionar', 'opcoes']) {
      const r = spawnSync(process.execPath, [`camadas/fisico/dimensionamento/${script}.mjs`, 'braco-de-prova', '--check'], { cwd: RAIZ });
      expect(r.status, r.stdout.toString() + r.stderr.toString()).toBe(0);
    }
  });

  it('a massa no cotovelo convergiu e cada número diz de onde vem', () => {
    const d = dimensionar(requisitos, catalogo);
    const massas = d.iteracoes.map((i) => i.massaNoCotovelo);
    expect(d.iteracoes.at(-1).conjuntoMaisLeveDaJunta2.massa).toBe(massas.at(-1));
    expect(d.massaNoCotovelo.valor).toBe(massas.at(-1));
    expect(d.entradas.carga).toMatchObject({ valor: 150, origem: 'requisitos' });
    expect(d.entradas.distanciaDaCarga.valor).toBe(30);
    expect(d.elos.map((e) => e.comprimento.valor)).toEqual([150, 150]);
    for (const j of d.juntas) for (const campo of ['torqueGravidade', 'torqueAceleracao', 'torqueTotal', 'velocidade', 'potencia']) expect(j[campo].origem).toBe('estimativa');
  });

  it('cada opção cobre as duas juntas com a folga mínima e diz o custo contra o orçamento', () => {
    const d = dimensionar(requisitos, catalogo);
    const o = gerarOpcoes(requisitos, d, catalogo);
    expect(o.opcoes.length).toBeGreaterThanOrEqual(1);
    expect(o.opcoes.length).toBeLessThanOrEqual(3);
    expect(o.opcoes.flatMap((x) => x.criterios).sort()).toEqual(['maior-folga', 'mais-barata', 'usa-o-que-ja-tem']);
    for (const x of o.opcoes) {
      for (const j of x.juntas) expect(j.torqueDisponivel / j.torqueTotal).toBeGreaterThanOrEqual(2);
      expect(x.custo.passaDoOrcamento).toBe(Math.max(0, x.custo.faixa[1] - 800));
      expect(x.custo.jaTem).toEqual(['fonte-12v-5a', 'placa-arduino-uno']);
      expect(x.corrente.demanda).toBeLessThanOrEqual(x.corrente.daFonte);
    }
  });

  it('diz o que falta quando nada do catálogo cobre o torque', () => {
    const pesado = structuredClone(requisitos);
    pesado.carga.piorCaso.valor = 3000;
    const o = gerarOpcoes(pesado, dimensionar(pesado, catalogo), catalogo);
    expect(o.opcoes).toEqual([]);
    expect(o.falta).toMatch(/a pergunta volta à pessoa/);
  });

  it('para quando a estimativa dos elos pesa mais que a carga no ombro', () => {
    const leve = structuredClone(requisitos);
    leve.carga.piorCaso.valor = 10;
    expect(() => dimensionar(leve, catalogo)).toThrow(/viram pergunta à pessoa/);
    expect(HIPOTESES.secaoDoElo.origem).toBe('estimativa');
  });
});
