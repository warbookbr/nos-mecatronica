import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { conferirLinks, linksDe } from './links.mjs';

let raiz;
afterEach(() => { if (raiz) rmSync(raiz, { recursive: true, force: true }); });

function montar(arquivos) {
  raiz = mkdtempSync(join(tmpdir(), 'links-'));
  for (const [nome, texto] of Object.entries(arquivos)) {
    mkdirSync(join(raiz, nome, '..'), { recursive: true });
    writeFileSync(join(raiz, nome), texto);
  }
  return conferirLinks({ raiz });
}

describe('docs:links:check', () => {
  it('aceita link relativo, com âncora, à raiz e a pasta que existem', () => {
    const { problemas, links } = montar({
      'README.md': '[a](docs/a.md#topo) e [b](/docs/) e [site](https://exemplo.org) e [c](#fim)\n',
      'docs/a.md': '[volta](../README.md)\n',
    });
    expect(problemas).toEqual([]);
    expect(links).toBe(3);
  });

  it('recusa link para arquivo ausente dizendo arquivo, linha e destino', () => {
    const { problemas } = montar({ 'docs/a.md': 'texto\n[x](falta.md)\n' });
    expect(problemas).toEqual(['docs/a.md:2: o link "falta.md" aponta para docs/falta.md, que não existe; corrija o caminho ou crie o arquivo']);
  });

  it('ignora link em bloco de código, em trecho de código e em node_modules', () => {
    const { problemas } = montar({
      'a.md': '```\n[x](falta.md)\n```\n`[y](falta.md)`\n',
      'node_modules/p/README.md': '[z](falta.md)\n',
    });
    expect(problemas).toEqual([]);
  });

  it('lê destino com título', () => {
    expect(linksDe('[a](b.md "título")')).toEqual([{ destino: 'b.md', linha: 1 }]);
  });
});
