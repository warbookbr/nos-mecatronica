/* braco.mjs — a conta fechada de um braço serial plano de duas juntas num plano vertical, antes de haver forma: a massa
   de cada elo pela seção e pelo material, o torque de gravidade de cada junta na pior pose (braço esticado na
   horizontal), o torque para acelerar a carga, os elos e a massa no cotovelo, e a velocidade de cada junta. Funções
   puras, sem arquivo: quem lê requisitos e catálogo é dimensionar.mjs. Unidades de entrada: mm, g, mm/s, mm/s² e
   m/s²; de saída: N·m, kg·m², rad/s e rad/s².

   O modelo: o elo é uma barra fina de massa uniforme; a carga e a massa no cotovelo (motor e redução da junta 2) são
   pontos, a carga a `distanciaDaCarga` além da ponta do elo 2 e a massa no cotovelo na ponta do elo 1. A velocidade e
   a aceleração de cada junta saem da ponta andando à velocidade e à aceleração pedidas na pior direção, em cada pose
   com a ponta entre `raioMinimo` e `raioMaximo` do ombro: pela inversa do jacobiano, a junta 1 gira v ÷ (L1 · |sen θ2|)
   e a junta 2 gira v · r ÷ (L1 · L2 · |sen θ2|), com r a distância do ombro à ponta. O torque de aceleração é a
   inércia na pose esticada (a maior) vezes a maior aceleração angular de qualquer pose, e se soma ao de gravidade
   na pose esticada: a soma é o pior caso, mais alto que o de qualquer pose real. */

export const GRAVIDADE = 9.80665;
export const PONTOS_DA_VARREDURA = 200;

/* A massa por comprimento (g/mm) de um elo de seção retangular oca: área da parede vezes a densidade (g/cm³). */
export function massaPorComprimento({ largura, altura, parede, densidade }) {
  const area = largura * altura - (largura - 2 * parede) * (altura - 2 * parede);
  return { area, gPorMm: (area * densidade) / 1000 };
}

/* Os fatores cinemáticos de uma pose com a ponta a `r` mm do ombro: a velocidade angular de cada junta (rad/s) por
   unidade de velocidade da ponta (m/s), na pior direção. */
export function fatoresDaPose(L1, L2, r) {
  const c2 = (r * r - L1 * L1 - L2 * L2) / (2 * L1 * L2);
  if (!(c2 > -1 && c2 < 1)) throw new Error(`a ponta a ${r} mm do ombro está fora do alcance útil (${Math.abs(L1 - L2)} a ${L1 + L2} mm, sem os extremos)`);
  const s2 = Math.sqrt(1 - c2 * c2);
  const [l1, l2, rm] = [L1 / 1000, L2 / 1000, r / 1000];
  return { junta1: 1 / (l1 * s2), junta2: rm / (l1 * l2 * s2), cotovelo: Math.acos(c2) };
}

/* O maior fator de cada junta numa varredura de `PONTOS_DA_VARREDURA` intervalos iguais de r, com os extremos. */
export function fatoresMaximos(L1, L2, raioMinimo, raioMaximo) {
  const maior = { junta1: { fator: 0, raio: 0 }, junta2: { fator: 0, raio: 0 } };
  for (let i = 0; i <= PONTOS_DA_VARREDURA; i++) {
    const r = raioMinimo + ((raioMaximo - raioMinimo) * i) / PONTOS_DA_VARREDURA;
    const f = fatoresDaPose(L1, L2, r);
    for (const j of ['junta1', 'junta2']) if (f[j] > maior[j].fator) maior[j] = { fator: f[j], raio: r };
  }
  return maior;
}

/* O torque e a velocidade de cada junta. `entrada`: comprimentos [L1, L2] (mm), massasDosElos [m1, m2] (g), carga (g),
   distanciaDaCarga (mm), massaNoCotovelo (g), velocidadeDaPonta (mm/s), aceleracaoDaPonta (mm/s²), raioMinimo e
   raioMaximo (mm), gravidade (m/s²). */
export function dimensionarBraco(entrada) {
  const { comprimentos: [L1mm, L2mm], massasDosElos: [m1g, m2g], carga, distanciaDaCarga, massaNoCotovelo } = entrada;
  const g = entrada.gravidade ?? GRAVIDADE;
  const [L1, L2, d] = [L1mm / 1000, L2mm / 1000, distanciaDaCarga / 1000];
  const [m1, m2, mc, mm] = [m1g / 1000, m2g / 1000, carga / 1000, massaNoCotovelo / 1000];

  /* Gravidade na pose esticada na horizontal: cada massa vezes a distância horizontal até a junta. */
  const gravidade2 = g * (m2 * L2 / 2 + mc * (L2 + d));
  const gravidade1 = g * (m1 * L1 / 2 + mm * L1 + m2 * (L1 + L2 / 2) + mc * (L1 + L2 + d));
  /* Inércia na pose esticada: barra fina em torno da ponta (mL²/3), barra deslocada (mL²/12 + m·x²) e pontos (m·x²). */
  const inercia2 = m2 * L2 * L2 / 3 + mc * (L2 + d) ** 2;
  const inercia1 = m1 * L1 * L1 / 3 + mm * L1 * L1 + m2 * (L2 * L2 / 12 + (L1 + L2 / 2) ** 2) + mc * (L1 + L2 + d) ** 2;

  const fatores = fatoresMaximos(L1mm, L2mm, entrada.raioMinimo, entrada.raioMaximo);
  const [v, a] = [entrada.velocidadeDaPonta / 1000, entrada.aceleracaoDaPonta / 1000];
  const junta = (gravidade, inercia, { fator, raio }) => {
    const aceleracao = a * fator;
    const torqueAceleracao = inercia * aceleracao;
    return { torqueGravidade: gravidade, inercia, aceleracao, torqueAceleracao, torqueTotal: gravidade + torqueAceleracao, velocidade: v * fator, raioDoPior: raio };
  };
  return {
    juntas: [junta(gravidade1, inercia1, fatores.junta1), junta(gravidade2, inercia2, fatores.junta2)],
    /* O peso dos elos contra o da carga no torque do ombro: acima de 1, a estimativa dos elos manda mais que a carga. */
    elosContraCarga: (m1 * L1 / 2 + m2 * (L1 + L2 / 2)) / (mc * (L1 + L2 + d)),
  };
}
