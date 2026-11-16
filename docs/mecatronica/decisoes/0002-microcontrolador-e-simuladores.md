# 0002 — Vários microcontroladores por uma interface, o RP2040 primeiro, e os simuladores de cada camada

Estado: em vigor.
Decidido em: 2026-11-16, pela pessoa, com a recomendação da sessão que conduz.
Origem: a pesquisa de simuladores do mesmo dia.
Substitui: nada.

## Contexto

A camada lógica roda o firmware real do objeto, e o simulador depende do chip. A pesquisa de 2026-11-16 achou, para os chips candidatos do braço: `rp2040js` (MIT, roda em Node, conta ciclos), `avr8js` (MIT, roda em Node, fraco para dois motores de passo e comunicação) e, para o ESP32, só o QEMU da Espressif (GPL-2.0, chamável como programa, cobertura de periféricos incerta). O motor do Wokwi é proprietário.

## O que ficou decidido

A camada lógica tem uma interface só para o microcontrolador: carregar o firmware, avançar o tempo em passo fixo e ler e escrever os pinos e os periféricos. Cada chip é uma implementação dessa interface, e a ficha do objeto diz qual chip a peça é (pela variante do componente); a simulação escolhe a implementação por ela. O primeiro chip é o RP2040, pelo `rp2040js`, porque prova o laço inteiro em Node, determinístico e sem licença que obrigue processo à parte. O ESP32 vem em seguida, pelo QEMU da Espressif chamado como programa, depois de um teste dos periféricos que o braço usa (GPIO, temporizador, PWM e UART).

Para as outras camadas, a primeira escolha da pesquisa: o circuito pelo ngspice 47 chamado como programa (BSD-3), com o `eecircuit-engine` (MIT, ngspice em WASM) como reserva; a física pelo Rapier no modo determinístico (Apache-2.0), com o MuJoCo 4 como segunda opinião; e o laço fechado por um escalonador próprio de passo fixo, porque nada aberto junta firmware, circuito e mecânica num relógio só. A ordem de chegada é o circuito, a física, o firmware e o laço. Cada ferramenta, ao entrar, ganha a sua linha neste registro com a versão fixada, a licença e como é chamada, como o contrato manda.

## Consequências e quando reabrir

O braço de prova da ponte passa a declarar a variante `rp2040` no módulo microcontrolador quando a ficha for revista. Um objeto com outro chip só pede a implementação dele, sem mudar a camada. O que o ESP32 não cobrir no QEMU fica escrito na linha da matriz como o que a simulação não prova. Reabrir se o `rp2040js` não cobrir um periférico que o braço pede, ou se o QEMU da Espressif não rodar o firmware do ESP32 com os periféricos do braço.
