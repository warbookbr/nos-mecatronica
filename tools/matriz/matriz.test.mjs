import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { conferirMatriz, FONTE, gerarMarkdown, gerarMatriz, SAIDA, validarMatriz } from './matriz.mjs';

const linha = (extra = {}) => ({
  id: 'lig-polaridade', camada: 'ligacoes', capacidade: 'Polaridade', dono: 'mecatronica', estado: 'falta',
  prova: 'Circuito com fonte invertida reprova.', naoCobre: 'Conector montado ao contrário na bancada.', ...extra,
});

let raiz;
afterEach(() => { if (raiz) rmSync(raiz, { recursive: true, force: true }); });

function montar(fonte) {
  raiz = mkdtempSync(join(tmpdir(), 'matriz-'));
  mkdirSync(join(raiz, 'docs/mecatronica'), { recursive: true });
  writeFileSync(join(raiz, FONTE), typeof fonte === 'string' ? fonte : JSON.stringify(fonte));
  return raiz;
}

describe('validarMatriz', () => {
  it('aceita linha completa, com e sem origem', () => {
    expect(validarMatriz([linha(), linha({ id: 'b', origem: 'eletrifica:modulos/conexoes/verificador.py' })])).toEqual([]);
  });

  it('recusa camada, dono e estado fora da lista dizendo o valor', () => {
    const problemas = validarMatriz([linha({ camada: 'optica', dono: 'eu', estado: 'quase' })]).join('\n');
    expect(problemas).toMatch(/camada "optica" não vale; use um de ligacoes/);
    expect(problemas).toMatch(/dono "eu" não vale/);
    expect(problemas).toMatch(/estado "quase" não vale/);
  });

  it('recusa campo ausente, campo desconhecido, id malformado e id repetido', () => {
    const { prova, ...semProva } = linha();
    const problemas = validarMatriz([semProva, linha({ extra: 1 }), linha({ id: 'Lig X' })]).join('\n');
    expect(problemas).toMatch(/campo "prova" ausente ou vazio/);
    expect(problemas).toMatch(/campo "extra" desconhecido/);
    expect(problemas).toMatch(/id "Lig X" inválido/);
    expect(problemas).toMatch(/id "lig-polaridade" repetido, já usado na linha 1/);
  });

  it('recusa raiz que não é lista', () => {
    expect(validarMatriz({})).toEqual([`${FONTE}: a raiz tem de ser uma lista de linhas, e veio object`]);
  });
});

describe('MATRIZ.md', () => {
  it('traz o resumo por estado e uma tabela por camada, com barra escapada', () => {
    const texto = gerarMarkdown([linha({ prova: 'a | b' }), linha({ id: 'b', estado: 'parcial', camada: 'eletrico' })]);
    expect(texto).toMatch(/\| Ligações \| 1 \| 0 \| 0 \| 1 \|/);
    expect(texto).toMatch(/\| Todas \| 1 \| 1 \| 0 \| 2 \|/);
    expect(texto).toMatch(/## Físico\n\nNenhuma linha ainda\./);
    expect(texto).toContain('a \\| b');
  });

  it('o check recusa MATRIZ.md ausente e fora de dia, e aceita depois de gerar', () => {
    montar([linha()]);
    expect(conferirMatriz({ raiz }).problemas.join('\n')).toMatch(/não existe; rode `npm run matriz:gerar`/);
    expect(gerarMatriz({ raiz }).problemas).toEqual([]);
    expect(conferirMatriz({ raiz }).problemas).toEqual([]);
    writeFileSync(join(raiz, SAIDA), `${readFileSync(join(raiz, SAIDA), 'utf8')}\nà mão\n`);
    expect(conferirMatriz({ raiz }).problemas.join('\n')).toMatch(/fora de dia/);
  });

  it('o gerar não grava com fonte inválida', () => {
    montar('[{');
    expect(gerarMatriz({ raiz }).problemas.join('\n')).toMatch(/não é JSON válido/);
  });
});
