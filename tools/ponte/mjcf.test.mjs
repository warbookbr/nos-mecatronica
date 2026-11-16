import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { gerarMjcf } from './mjcf.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '../..');
const ficha = () => JSON.parse(readFileSync(join(RAIZ, 'ponte/exemplos/braco-de-prova.ficha.json'), 'utf8'));

describe('ponte:mjcf', () => {
  it('gera do braço de prova o MJCF esperado, que o MuJoCo carregou (decisão 0003)', () => {
    const esperado = readFileSync(join(RAIZ, 'ponte/exemplos/braco-de-prova.mjcf.xml'), 'utf8');
    expect(gerarMjcf(ficha())).toBe(esperado);
  });

  it('converte unidades: mm para m, g para kg, g·mm² para kg·m², e mantém o curso em grau', () => {
    const xml = gerarMjcf(ficha());
    expect(xml).toContain('<body name="motor-ombro" pos="0.03 0.15 0" axisangle="0 1 0 90">');
    expect(xml).toContain('mass="0.28" fullinertia="0.0000785 0.0000785 0.0000823 0 0 0"');
    expect(xml).toContain('<joint name="cotovelo" type="hinge" pos="0 0 0" axis="1 0 0" limited="true" range="-135 135"/>');
    expect(xml).toContain('gravity="0 -9.81 0"');
  });

  it('recusa conjunto móvel sem junta e conjunto filho de duas juntas', () => {
    const semJunta = ficha();
    semJunta.juntas.pop();
    expect(() => gerarMjcf(semJunta)).toThrow('o conjunto móvel "elo-2" não é filho de nenhuma junta');
    const duas = ficha();
    duas.juntas.push({ ...duas.juntas[1], id: 'punho' });
    expect(() => gerarMjcf(duas)).toThrow('o conjunto "elo-2" é filho de duas juntas ("cotovelo" e "punho")');
  });
});
