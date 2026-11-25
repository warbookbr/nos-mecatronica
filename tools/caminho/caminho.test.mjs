/* caminho.test.mjs — o passo certo em cada estado do caderno, com cadernos de exemplo em cada etapa, e o comando no braço de
   prova. */
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { ETAPAS, passoDoCaderno, textoDoPasso } from './caminho.mjs';

const ORDEM = Object.keys(ETAPAS);
const aprovacao = { quem: 'Pessoa', data: '2026-11-25', oQue: 'x', frase: 'aprovo' };
/* o caderno com as etapas antes de `ate` aprovadas e `ate` no estado dado */
const caderno = (ate, estado = 'aberta', extra = {}) => ({
  tipo: 'caderno', versao: '1.0', objeto: 'prova',
  etapas: ORDEM.map((etapa, i) => {
    const n = ORDEM.indexOf(ate);
    if (ate === null || i < n) return { etapa, estado: 'aprovada', arquivos: [], aprovacao };
    if (i === n) return { etapa, estado, arquivos: estado === 'aguarda-pessoa' ? ['saida.json'] : [], ...extra };
    return { etapa, estado: 'aberta', arquivos: [] };
  }),
});

describe('passoDoCaderno', () => {
  it.each(ORDEM)('a etapa %s aberta dá o repositório, a skill, o comando e a seguinte', (etapa) => {
    const p = passoDoCaderno(caderno(etapa));
    expect(p).toMatchObject({ etapa, estado: 'aberta', repositorio: ETAPAS[etapa].repositorio, skill: ETAPAS[etapa].skill });
    expect(p.comando).not.toContain('<objeto>');
    expect(p.seguinte).toBe(ORDEM[ORDEM.indexOf(etapa) + 1] ?? null);
  });
  it('a etapa que aguarda a pessoa pede a frase dela sobre os arquivos', () => {
    const p = passoDoCaderno(caderno('simulacao', 'aguarda-pessoa'));
    expect(p.fazer).toMatch(/saida\.json.*frase/);
  });
  it('a etapa reaberta diz o motivo', () => {
    expect(passoDoCaderno(caderno('componentes', 'reaberta', { motivo: 'a folga caiu abaixo de 2' })).fazer).toMatch(/folga caiu/);
  });
  it('com tudo aprovado, o caminho acabou', () => {
    expect(textoDoPasso(passoDoCaderno(caderno(null)))).toMatch(/fim/);
  });
});

describe('npm run caminho', () => {
  it('diz o passo do braço de prova e recusa o objeto sem caderno', () => {
    expect(execFileSync('node', ['tools/caminho/caminho.mjs', 'braco-de-prova'], { encoding: 'utf8' })).toMatch(/etapa pacote/);
    expect(() => execFileSync('node', ['tools/caminho/caminho.mjs', 'nao-existe'], { stdio: 'pipe' })).toThrow();
  });
});
