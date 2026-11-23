/* Confere a cópia de referência dos esquemas da ponte (decisão 0004): o SHA-256 da última versão de ponte/esquemas/versoes.json
   é o dos arquivos atuais, e cada esquema aceita até a última versão em que o SHA-256 dele mudou; o que não muda numa
   versão repete o SHA-256 da anterior. Mudar um esquema sem registrar a versão
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

  it('a última versão tem o SHA-256 dos arquivos atuais, e cada esquema aceita até a última versão em que mudou', () => {
    const ultima = versoes.at(-1);
    for (const tipo of TIPOS) {
      const arquivo = `${tipo}.schema.json`;
      expect(sha256(arquivo), `${arquivo} mudou sem versão nova em versoes.json`).toBe(ultima[arquivo]);
      const mudou = versoes.filter((v, i) => i === 0 || v[arquivo] !== versoes[i - 1][arquivo]).at(-1);
      expect(lerEsquema(tipo).properties.versao.enum.at(-1)).toBe(mudou.versao);
    }
  });
});
