# 0003 — O MuJoCo 4.0.1 como conferência manual do MJCF que a ficha gera

Estado: em vigor.
Decidido em: 2026-11-16, na fatia 2 do [plano dos esquemas da ponte](../planos/2026-11-16-esquemas-da-ponte.md).
Origem: o item 6 do gate de saída do plano, que pede a ficha do braço de prova convertida para MJCF e carregada no MuJoCo.
Substitui: nada.

## O que ficou decidido

A ficha da ponte converte para MJCF, o formato do MuJoCo, por `npm run ponte:mjcf -- <ficha> [--saida=<arquivo>]` ([`tools/ponte/mjcf.mjs`](../../../tools/ponte/mjcf.mjs)). Cada conjunto vira um corpo e cada peça um corpo dentro dele, só com a massa, o centro de massa e a inércia, sem geometria, porque a ficha não traz a caixa de cada peça e a malha fica fora deste plano. O conjunto fixo fica preso ao mundo, e cada conjunto móvel nasce no ponto do eixo da junta que o liga ao conjunto da peça-pai, com a junta de dobradiça no eixo e no curso da ficha. A conversão passa mm para m, g para kg e g·mm² para kg·m², deixa os ângulos em grau (`compiler angle="degree"`) e põe a gravidade em -y, porque a ficha tem y para cima. Peça com inércia ausente vira massa pontual no centro de massa, e peça com massa ausente fica sem inércia.

O MuJoCo entra como ferramenta externa declarada, na versão 4.0.1, licença Apache-2.0, pelo pacote Python `mujoco` (`pip install mujoco==4.0.1`, que traz o `mujoco-core` da mesma versão). Ele é chamado como programa pelo script [`tools/ponte/carregar_mujoco.py`](../../../tools/ponte/carregar_mujoco.py), `python3 tools/ponte/carregar_mujoco.py <arquivo.mjcf.xml> [passos] [angulo-inicial]`, que carrega o arquivo, diz os corpos, as juntas, a massa total e a massa e o centro de massa de cada conjunto na pose zero, solta as juntas de um ângulo inicial sob a gravidade e diz o ângulo de cada junta ao fim. Nenhum código do MuJoCo entra no repositório.

A carga no MuJoCo é uma conferência manual, registrada aqui; o gate não depende do MuJoCo instalado, porque o CI não o tem. O gate confere que o MJCF gerado da ficha do braço de prova é igual, byte a byte, ao arquivo esperado [`ponte/exemplos/braco-de-prova.mjcf.xml`](../../../ponte/exemplos/braco-de-prova.mjcf.xml), que é o que o MuJoCo carregou. Quem muda a conversão regera o esperado pelo comando e roda a conferência manual de novo.

## A conferência de 2026-11-16

O MuJoCo 4.0.1 carregou o MJCF do braço de prova sem erro nem aviso: 15 corpos contando o mundo, 2 juntas e 1,348 kg no total, que são os 903 g, 375 g e 70 g dos três conjuntos da ficha. O centro de massa de cada conjunto na pose zero, calculado pelo MuJoCo a partir das peças, deu [3,0, 68,4, 6,0] mm no fixo, [18,3, 288,5, 0] mm no elo-1 e [49, 370, 0] mm no elo-2, os valores da ficha. Soltos de 10 grau, 2000 passos de 1 ms depois o ombro estava em 90,08 grau, no fim do curso, e o cotovelo em 50,26 grau, sem estado inválido.

A conferência achou um erro no exemplo aprovado: o centro de massa do conjunto fixo estava escrito como [3,1, 72,6, 6,5] mm, e a média das peças pesada pela massa dá [3,0, 68,4, 6,0] mm. O conferidor não o pegaria, porque só conferia a massa do conjunto contra a soma das peças; agora confere também o centro de massa (com 0,1 mm de folga) e a inércia (com 0,1% de folga) do conjunto contra as peças, e o exemplo foi corrigido.

## O que não cobre

A conversão não leva a malha nem a geometria de colisão, não leva os motores como atuadores (a junta diz `acionadaPor`, mas o MJCF não tem `actuator`), não leva a redução nem o atrito da junta, e só monta uma junta por conjunto móvel. A carga no MuJoCo prova que a parte física da ficha fala o formato que os simuladores leem, não que a dinâmica do braço esteja certa.

## Quando reabrir

Se a física pelo Rapier, primeira escolha da [0002](0002-microcontrolador-e-simuladores.md), não ler o que esta conversão escreve por um caminho equivalente, ou se o MuJoCo mudar de versão maior ou de licença.
