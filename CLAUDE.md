# Mecatrônica — contrato mínimo

Este repositório simula de ponta a ponta os objetos que o [Modelar](https://github.com/warbookbr/nos-modelar) desenha: as
ligações elétricas, o circuito, a lógica do programa, a física e o laço fechado entre elas. A meta é achar na simulação a
maior parte dos erros de projeto que hoje só o teste prático acharia. O mapa do que existe e do que falta é a
[matriz](docs/mecatronica/MATRIZ.md).

## Regras

- A forma é do Modelar. Este repositório nunca edita geometria: lê a ficha do objeto que o Modelar exporta e devolve um
  pedido (espaço, posição, passagem) que o Modelar cumpre e confere, pelo contrato em [`ponte/`](ponte/README.md).
- Tudo é gerado por script, determinístico e reexecutável. Para mudar uma saída, mude o script ou a fonte e rode de novo;
  artefato gerado não se edita à mão.
- Cada resultado diz o que a simulação prova e o que é estimativa (corpo de componente, tolerância, modelo aproximado), e o
  que ela não cobre fica escrito na linha da matriz.
- Motor de simulação de terceiros (circuito, microcontrolador, física) entra só como ferramenta externa declarada, com
  versão e licença em `docs/mecatronica/decisoes/`, chamada como programa; nunca copiado para dentro.
- Um componente usa o mesmo nome da família de componentes do Modelar, para a ficha e o modelo elétrico se acharem.
- Sem plano ativo, o backlog não autoriza implementação. Os planos seguem [`planos/README.md`](docs/mecatronica/planos/README.md).

## Coordenação e qualidade

- Use pt-BR. Escreva em parágrafos corridos e literais, sem frases picotadas nem negrito no meio do texto.
- Responda curto e, ao reportar à pessoa, traga um sumário breve, sem termos internos, com a recomendação quando algo
  depende da decisão dela.
- Rode `npm run gates` antes de enviar. O envio vai a um ramo `claude/**`; o CI só junta à main com tudo verde.
- Todo achado responde se o processo o teria pego sozinho; quando não, o que falta vira gate, campo ou instrução.
