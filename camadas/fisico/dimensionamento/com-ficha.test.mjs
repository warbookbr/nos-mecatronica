/* com-ficha.test.mjs — a conta com a ficha num braço de prova de massas pontuais, que se confere à mão, e o arquivo do braço de
   prova em dia. */
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { simularComFicha } from './com-ficha.mjs';

const conj = (id, massa, cm) => ({ id, movel: id !== 'base', massa: { valor: massa }, centroDeMassa: { valor: cm }, inercia: { valor: { izz: 0 } } });
const ficha = {
  objeto: 'prova', revisao: 1,
  conjuntos: [conj('base', 1000, [0, 0, 0]), conj('elo-1', 100, [50, 0, 0]), conj('elo-2', 100, [150, 0, 0])],
  juntas: [
    { id: 'junta-1', pai: 'base', filho: 'elo-1', eixo: { valor: { ponto: [0, 0, 0], direcao: [0, 0, 1] } } },
    { id: 'junta-2', pai: 'elo-1', filho: 'elo-2', eixo: { valor: { ponto: [100, 0, 0], direcao: [0, 0, 1] } } },
  ],
};
const junta = (torque) => ({ aceleracao: { valor: 0 }, velocidade: { valor: 10 }, torqueTotal: { valor: torque } });
const dimensionamento = {
  entradas: { carga: { valor: 100 }, distanciaDaCarga: { valor: 0 }, alcance: { valor: 200 }, folgaMinima: { valor: 2 } },
  elos: [{ comprimento: { valor: 100 } }, { comprimento: { valor: 100 } }],
  juntas: [junta(1), junta(1)],
};
const especificacao = { massa: { valor: 1 }, corrente: { valor: 1 }, curva: { pontos: [[0, 10], [10000, 10]] } };
const catalogo = [
  { id: 'm', especificacao },
  { id: 'r', especificacao: { razao: { valor: 1 }, eficiencia: { valor: 1 }, torqueMaximo: { valor: 100 }, massa: { valor: 1 } } },
  { id: 'd', especificacao: { correnteContinua: { valor: 1 } } },
];
const componentes = { juntas: ['junta-1', 'junta-2'].map((j) => ({ junta: j, motor: 'm', reducao: 'r', driver: 'd' })) };

describe('simularComFicha', () => {
  const r = simularComFicha({ ficha, dimensionamento, componentes, catalogo });
  it('soma os conjuntos que pendem de cada junta e a carga além da ponta', () => {
    /* junta 1: 0,1·0,05 + 0,1·0,15 + 0,1·0,2 = 0,04 kg·m; junta 2: 0,1·0,05 + 0,1·0,1 = 0,015 kg·m */
    expect(r.juntas[0].torqueGravidade.valor).toBeCloseTo(0.04 * 9.80665, 4);
    expect(r.juntas[1].torqueGravidade.valor).toBeCloseTo(0.015 * 9.80665, 4);
    expect(r.juntas[0].massaMovida.valor).toBe(200);
  });
  it('compara com a estimativa de antes da forma e para acima do dobro', () => {
    expect(r.juntas.map((j) => j.passa)).toEqual([true, true]);
    const pesada = simularComFicha({ ficha, dimensionamento: { ...dimensionamento, juntas: [junta(0.1), junta(1)] }, componentes, catalogo });
    expect(pesada.juntas[0].passa).toBe(false);
  });
  it('soma a folga das reduções levada à ponta e confere com a precisão pedida', () => {
    const comFolga = structuredClone(catalogo); comFolga[1].especificacao.folga = { valor: 1 };
    const p = simularComFicha({ ficha, dimensionamento, componentes, catalogo: comFolga, requisitos: { precisao: { valor: 2 }, repetibilidade: { valor: 1 } } });
    /* 1 grau a 200 mm mais 1 grau a 100 mm */
    expect(p.precisao.erroNaPonta.valor).toBeCloseTo(300 * Math.PI / 180, 2);
    expect(p.precisao.passa).toBe(false);
    expect(p.passa).toBe(false);
  });
  it('recusa a junta fora do plano vertical', () => {
    const torta = structuredClone(ficha); torta.juntas[1].eixo.valor.direcao = [1, 0, 0];
    expect(() => simularComFicha({ ficha: torta, dimensionamento, componentes, catalogo })).toThrow(/não é paralela a z/);
  });
  it('o arquivo do braço de prova está em dia', () => {
    execFileSync('node', ['camadas/fisico/dimensionamento/com-ficha.mjs', 'braco-de-prova', '--check'], { stdio: 'pipe' });
  });
});
