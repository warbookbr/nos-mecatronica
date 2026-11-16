/* Confere a cópia de referência dos esquemas da ponte (decisão 0004): a última versão de ponte/esquemas/versoes.json é a
   última que os dois esquemas aceitam, e o SHA-256 dela é o dos arquivos atuais. Mudar um esquema sem registrar a versão
   nova falha aqui, antes de a cópia do Modelar ficar diferente da referência com o mesmo número. */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { lerEsquema, TIPOS } from './conferir.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '../..');
const ESQUEMAS = join(RAIZ, 'ponte/esquemas');
const { versoes } = JSON.parse(readFileSync(join(ESQUEMAS, 'versoes.json'), 'utf8'));
const sha256 = (arquivo) => createHash('sha256').update(readFileSync(join(ESQUEMAS, arquivo))).digest('hex');
const ordem = (v) => v.split('.').map(Number);

describe('cópia de referência dos esquemas', () => {
  it('lista versões únicas, em ordem crescente, cada uma com o SHA-256 dos dois esquemas', () => {
    expect(versoes.length).toBeGreaterThan(0);
    for (let i = 0; i < versoes.length; i++) {
      expect(versoes[i].versao).toMatch(/^\d+\.\d+$/);
      for (const tipo of TIPOS) expect(versoes[i][`${tipo}.schema.json`]).toMatch(/^[0-9a-f]{64}$/);
      if (i > 0) {
        const [a, b] = [ordem(versoes[i - 1].versao), ordem(versoes[i].versao)];
        expect(b[0] > a[0] || (b[0] === a[0] && b[1] > a[1])).toBe(true);
      }
    }
  });

  it('a última versão é a última que os esquemas aceitam e tem o SHA-256 dos arquivos atuais', () => {
    const ultima = versoes.at(-1);
    for (const tipo of TIPOS) {
      expect(lerEsquema(tipo).properties.versao.enum.at(-1)).toBe(ultima.versao);
      expect(sha256(`${tipo}.schema.json`), `${tipo}.schema.json mudou sem versão nova em versoes.json`).toBe(ultima[`${tipo}.schema.json`]);
    }
  });
});
