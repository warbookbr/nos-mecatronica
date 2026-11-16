import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { conferirPlanos, sobrepoe, territorioDe } from './planos.mjs';

let raiz;
afterEach(() => { if (raiz) rmSync(raiz, { recursive: true, force: true }); });

function montar({ planos = {}, indice = '**Planos ativos:** nenhum.\n', readme = 'Planos ativos: nenhum.\n' } = {}) {
  raiz = mkdtempSync(join(tmpdir(), 'planos-'));
  const pasta = join(raiz, 'planos');
  mkdirSync(pasta, { recursive: true });
  for (const [nome, texto] of Object.entries(planos)) {
    mkdirSync(join(pasta, nome, '..'), { recursive: true });
    writeFileSync(join(pasta, nome), texto);
  }
  writeFileSync(join(pasta, 'README.md'), indice);
  writeFileSync(join(raiz, 'README.md'), readme);
  return conferirPlanos({ pasta, readme: join(raiz, 'README.md') });
}

const plano = (estado, extra = '') => `# Plano\n\n**Estado:** ${estado}\n${extra}\n`;
const listaDe = (...nomes) => nomes.map((n) => `[${n}](${n})`).join(', ');

describe('planos:check', () => {
  it('aceita a pasta sem planos com os dois índices dizendo nenhum', () => {
    expect(montar().problemas).toEqual([]);
  });

  it('recusa estado inválido dizendo o valor e os aceitos', () => {
    const { problemas } = montar({ planos: { '2026-11-16-a.md': plano('andando') }, indice: '**Planos ativos:** nenhum.\n' });
    expect(problemas.join('\n')).toMatch(/"andando" não vale; use um de rascunho/);
  });

  it('recusa plano acima de 300 linhas', () => {
    const texto = `${plano('concluído')}${'linha\n'.repeat(300)}`;
    expect(montar({ planos: { '2026-11-16-a.md': texto } }).problemas.join('\n')).toMatch(/o teto é 300/);
  });

  it('recusa ativo sem território e aceita o que aguarda aprovação', () => {
    const indice = `**Planos ativos:** ${listaDe('2026-11-16-a.md', '2026-11-16-b.md')}\n`;
    const readme = `Planos ativos: ${listaDe('2026-11-16-a.md', '2026-11-16-b.md')}\n`;
    const { problemas } = montar({
      planos: { '2026-11-16-a.md': plano('ativo'), '2026-11-16-b.md': plano('ativo', '**Território:** nenhum (aguarda aprovação)') },
      indice, readme,
    });
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatch(/2026-11-16-a\.md: está ativo sem a linha \*\*Território:\*\*/);
  });

  it('recusa territórios sobrepostos e ignora os caminhos compartilhados', () => {
    const nomes = ['2026-11-16-a.md', '2026-11-16-b.md'];
    const { problemas } = montar({
      planos: {
        [nomes[0]]: plano('ativo', '**Território:** `camadas/`, `package.json`'),
        [nomes[1]]: plano('ativo', '**Território:** `camadas/eletrico/`, `package.json`'),
      },
      indice: `**Planos ativos:** ${listaDe(...nomes)}\n`,
      readme: `Planos ativos: ${listaDe(...nomes)}\n`,
    });
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatch(/se sobrepõem em "camadas\/"/);
  });

  it('recusa mais de seis ativos', () => {
    const nomes = Array.from({ length: 7 }, (_, i) => `2026-11-1${i}-p.md`);
    const planos = Object.fromEntries(nomes.map((n, i) => [n, plano('ativo', `**Território:** \`objetos/o${i}/\``)]));
    const { problemas } = montar({ planos, indice: `**Planos ativos:** ${listaDe(...nomes)}\n`, readme: `Planos ativos: ${listaDe(...nomes)}\n` });
    expect(problemas.join('\n')).toMatch(/há 7 planos ativos e o máximo é 6/);
  });

  it('recusa plano raiz ativo ou pronto', () => {
    const { problemas } = montar({
      planos: { '2026-11-16-r.md': plano('pronto', '**Tipo:** raiz') },
      indice: '**Planos ativos:** nenhum.\n\n[r](2026-11-16-r.md)\n',
    });
    expect(problemas.join('\n')).toMatch(/é \*\*Tipo:\*\* raiz e está "pronto"/);
  });

  it('recusa índice ou README.md da raiz que divergem dos ativos', () => {
    const nome = '2026-11-16-a.md';
    const { problemas } = montar({
      planos: { [nome]: plano('ativo', '**Território:** `ponte/`') },
      indice: `**Planos ativos:** ${listaDe(nome)}\n`,
      readme: 'Planos ativos: nenhum.\n',
    });
    expect(problemas).toEqual([`README.md: não lista o plano ativo ${nome}; acrescente o link dele em o parágrafo "Planos ativos:"`]);
  });

  it('recusa índice sem a declaração', () => {
    expect(montar({ indice: '# Planos\n' }).problemas.join('\n')).toMatch(/não declara os planos ativos/);
  });

  it('recusa rascunho na raiz sem link no índice e plano em jogo em subpasta', () => {
    const { problemas } = montar({ planos: { '2026-11-16-a.md': plano('rascunho'), 'velhos/2026-01-01-b.md': plano('pronto') } });
    const texto = problemas.join('\n');
    expect(texto).toMatch(/não liga o plano em "rascunho" 2026-11-16-a\.md/);
    expect(texto).toMatch(/velhos\/2026-01-01-b\.md: está em subpasta/);
  });
});

describe('território', () => {
  it('lê caminhos entre crases e recusa caminho absoluto', () => {
    expect(territorioDe('**Território:** `ponte/`, `objetos/braco/`').caminhos).toEqual(['ponte/', 'objetos/braco/']);
    expect(territorioDe('**Território:** `/etc/`').problema).toMatch(/caminho "\/etc\/" inválido/);
  });

  it('sobrepõe pasta e arquivo dentro dela', () => {
    expect(sobrepoe('ponte/', 'ponte/README.md')).toBe(true);
    expect(sobrepoe('ponte/a.md', 'ponte/b.md')).toBe(false);
  });
});
