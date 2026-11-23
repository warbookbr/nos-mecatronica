import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { conferir } from '../ponte/conferir.mjs';
import { gerar, texto } from './pedido-inicial.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('npm run pedido-inicial', () => {
  it('gera do braço de prova o pedido inicial do exemplo, igual byte a byte em duas gerações', () => {
    const exemplo = readFileSync(join(RAIZ, 'ponte/exemplos/braco-de-prova.pedido-inicial.json'), 'utf8');
    expect(texto('braco-de-prova')).toBe(exemplo);
    expect(texto('braco-de-prova')).toBe(texto('braco-de-prova'));
  });

  it('dá um item por componente, com um driver por junta mesmo quando o modelo se repete, e o conferidor aceita', () => {
    const p = gerar('braco-de-prova');
    expect(p.itens.map((i) => i.id)).toEqual([
      'motor-23hs30-2804s', 'reducao-planetaria-nema23-5', 'motor-17hs4401', 'reducao-gt2-20-80',
      'driver-junta-1', 'driver-junta-2', 'placa-arduino-uno', 'fonte-12v-5a',
    ]);
    expect(p.itens.slice(4, 6).map((i) => i.componente)).toEqual(['driver-drv8825', 'driver-drv8825']);
    expect(conferir(p).erros).toEqual([]);
  });
});
