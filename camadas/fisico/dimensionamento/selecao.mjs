/* selecao.mjs — o torque que um conjunto de motor, redução e driver do catálogo dá numa junta, na velocidade pedida, e a
   folga contra o torque pedido. Funções puras sobre componentes já conferidos por tools/componentes/conferir.mjs.

   A regra: a velocidade do motor é a da junta vezes a razão da redução; o torque do motor sai da curva nessa
   velocidade, interpolado entre os pontos (abaixo do primeiro vale o primeiro, acima do último o motor não serve), e
   cai na proporção da corrente quando o driver sustenta menos que a corrente nominal do motor; na saída, ele se
   multiplica pela razão e pela eficiência e fica limitado ao torque máximo da redução. A folga é o torque na saída
   dividido pelo torque pedido. */

export const RPM_POR_RAD_S = 60 / (2 * Math.PI);

/* O torque da curva [[rpm, N·m], ...] na velocidade `rpm`. */
export function torqueNaCurva(pontos, rpm) {
  if (rpm <= pontos[0][0]) return pontos[0][1];
  for (let i = 1; i < pontos.length; i++) {
    const [r1, t1] = pontos[i];
    if (rpm <= r1) {
      const [r0, t0] = pontos[i - 1];
      return t0 + ((t1 - t0) * (rpm - r0)) / (r1 - r0);
    }
  }
  return 0;
}

/* Por que o conjunto não monta, ou null quando monta. */
export function incompatibilidade(motor, reducao, driver, tensao) {
  const m = motor.especificacao;
  if (!reducao.especificacao.paraMotores.includes(m.tamanho)) return `a redução ${reducao.id} não serve para ${m.tamanho}`;
  if (m.curva.tensao.valor !== tensao) return `a curva do ${motor.id} é de ${m.curva.tensao.valor} V e a alimentação é de ${tensao} V`;
  const [min, max] = driver.especificacao.tensao.valor;
  if (tensao < min || tensao > max) return `o ${driver.id} trabalha de ${min} a ${max} V`;
  return null;
}

/* O conjunto numa junta que pede `torque` (N·m) a `velocidade` (rad/s). */
export function avaliarJunta({ torque, velocidade }, motor, reducao, driver) {
  const m = motor.especificacao;
  const r = reducao.especificacao;
  const rpmDoMotor = velocidade * r.razao.valor * RPM_POR_RAD_S;
  const correnteAplicada = Math.min(m.corrente.valor, driver.especificacao.correnteContinua.valor);
  const fatorDeCorrente = correnteAplicada / m.corrente.valor;
  const torqueDaCurva = torqueNaCurva(m.curva.pontos, rpmDoMotor);
  const torqueDoMotor = torqueDaCurva * fatorDeCorrente;
  const torqueNaSaida = torqueDoMotor * r.razao.valor * r.eficiencia.valor;
  const torqueDisponivel = Math.min(torqueNaSaida, r.torqueMaximo.valor);
  return {
    rpmDoMotor,
    correnteAplicada,
    fatorDeCorrente,
    torqueDaCurva,
    torqueDoMotor,
    torqueDisponivel,
    limitadoPor: torqueNaSaida > r.torqueMaximo.valor ? 'reducao' : 'motor',
    folga: torqueDisponivel / torque,
    massa: m.massa.valor + r.massa.valor,
  };
}
