# Dimensionamento e escolha de componentes: dos requisitos ao torque de cada junta e às opções para a pessoa escolher

**Estado:** ativo

**Território:** `componentes/`, `camadas/fisico/dimensionamento/`, `tools/componentes/`, `.claude/skills/escolher-componentes/`, `objetos/braco-de-prova/`.

Ativado pela pessoa em 2026-11-23, que aprovou a folga mínima de torque de 2 vezes e o catálogo inicial só de motores de passo NEMA 17 e NEMA 23, com redução por polia e correia ou planetária.

**Responsável:** a IA da sessão implementa; a pessoa aprova a folga de torque e o formato do catálogo antes da fatia 2, e escolhe entre as opções na fatia 4.

**Repositório e base:** `warbookbr/nos-mecatronica`, main na ativação. Filho 2 do plano-raiz [do pedido da pessoa ao pacote de construção](2026-11-23-do-pedido-ao-pacote.md), depois do filho 1, concluído em 2026-11-23.

## Problema observado

O braço de prova tem os requisitos aprovados (`objetos/braco-de-prova/requisitos.json`: 150 g no pior caso a 30 mm além da última junta, alcance de 300 mm num plano vertical, 100 mm/s na ponta, 2 mm de precisão, 12 V da tomada, até 800 reais), e nada transforma esses números em componentes. A pasta `componentes/` só tem o README, a camada física não tem código, e as linhas `fis-torque-gravidade`, `fis-inercia-aceleracao`, `fis-curva-do-motor`, `proj-dimensionamento` e `proj-escolha-de-componentes` da [matriz](../MATRIZ.md) estão em falta. Sem isso, a próxima etapa do caminho, a forma no Modelar, começaria sem saber que motor vai dentro de cada junta, que é o erro que o braço de seis eixos do Modelar já mostrou.

## Resultado

`npm run dimensionar -- braco-de-prova` lê os requisitos e grava `objetos/braco-de-prova/dimensionamento.json` com o torque de cada junta na pior pose (gravidade e aceleração, com a massa dos elos estimada antes de haver forma) e a velocidade de cada junta; `npm run opcoes -- braco-de-prova` cruza esse resultado com o catálogo e grava duas ou três combinações de motor, redução, driver e fonte, cada uma com a folga de torque, o custo e as medidas; a pessoa escolhe uma pela skill `escolher-componentes`, e a etapa de componentes do caderno fica aprovada com a frase dela.

## Ferramentas externas

Nenhuma nesta etapa: o torque de um braço plano de duas juntas sai de conta fechada, e a conferência pelo MuJoCo (decisão 0003) fica para quando houver ficha com a forma. Os números do catálogo vêm de folhas de dados públicas, cada um com a fonte e a data, e o preço é faixa com a data da consulta e origem `estimativa`.

## Incluído

- o catálogo em `componentes/`, um arquivo JSON por componente, com o formato conferido por `npm run componentes:conferir`: motores de passo (torque de retenção, curva de torque por velocidade em pontos, corrente, resistência, indutância, passo, massa, medidas), reduções (polia e correia, planetária: razão, eficiência, folga, massa, medidas), drivers (corrente máxima, faixa de tensão, micropasso), placas de controle (o Arduino Uno que a pessoa já tem entra marcado como `jaTem`) e fontes; cada número com a origem da ponte (`declarado` da folha de dados, `medido` ou `estimativa`) e a fonte; uns 10 a 15 componentes, o bastante para as opções do braço de prova;
- o dimensionamento em `camadas/fisico/dimensionamento/`, para braço serial plano (o caso do braço de prova): a massa de cada elo estimada pelo comprimento, por uma seção e pelo material declarados como estimativa, a massa do motor da junta seguinte somada ao elo de baixo, o torque de gravidade na pior pose, o de aceleração pelo perfil de movimento que sai da velocidade e do ciclo, e a velocidade de cada junta; resolvido por iteração, porque a massa do motor escolhido muda o torque da junta de baixo;
- as opções: para cada junta, o motor e a redução cujo torque disponível na velocidade pedida, tirado da curva, cobre o pedido com a folga mínima, e para o conjunto, o driver e a fonte que cobrem a corrente; a combinação mais barata, a de maior folga e, quando houver, a que usa o que a pessoa já tem;
- a skill `escolher-componentes`, que mostra as opções lado a lado em prosa curta (folga, custo, tamanho e o que cada uma pede da forma), pergunta qual a pessoa escolhe, grava `objetos/<objeto>/componentes.json` e registra a aprovação no caderno, com as mesmas regras da skill de requisitos;
- as linhas `fis-torque-gravidade`, `fis-inercia-aceleracao` e `fis-curva-do-motor` a parcial e `proj-dimensionamento` e `proj-escolha-de-componentes` a feito na matriz, com a prova e o que não cobrem.

## Excluído

- o braço de seis eixos do Modelar, que entra quando o caminho estiver provado no de duas juntas;
- o pedido de espaço ao Modelar para cada componente, que precisa de uma ficha com a forma e fica no filho 3;
- a conferência dinâmica pelo MuJoCo, o atrito e a folga como parâmetros (`fis-atrito-e-folga`) e a rigidez dos elos;
- compra, frete e preço atualizado: o preço é faixa de referência.

## Gate de saída

1. Um braço de teste de forma simples tem o torque de gravidade e o de aceleração conferidos contra a conta à mão, por teste.
2. O dimensionamento e as opções do braço de prova saem iguais em duas execuções, e cada opção cobre o torque pedido com a folga aprovada e cabe no orçamento, ou diz quanto passa dele.
3. `npm run componentes:conferir` aceita o catálogo e recusa componente sem fonte, número sem origem e curva de torque fora de ordem, com o caminho do campo, por teste.
4. A pessoa escolheu uma opção pela skill, e a etapa de componentes do caderno está aprovada com a frase dela.
5. A matriz e os README de `componentes/` e da camada física dizem o que existe, e `npm run gates` está verde.

## Fatias

1. O formato do catálogo e a folga de torque, em texto, para a pessoa aprovar; a conta do braço de teste à mão.
2. O catálogo dos componentes do braço de prova, com o conferidor.
3. O dimensionamento e as opções, com os testes.
4. A skill e a escolha da pessoa no braço de prova.
5. A documentação, a matriz e o fechamento.

## Decisões da pessoa

A folga mínima de torque: a recomendação é 2 vezes o torque calculado na pior pose, porque motor de passo perde passo sem aviso quando passa do limite, e a massa dos elos é estimada antes de haver forma. E o tipo de motor do catálogo inicial: a recomendação é só motor de passo (NEMA 17 e NEMA 23), com redução por polia e correia ou planetária, que cabe no orçamento e no comando por Arduino; servo de modelismo e motor com encoder ficam para quando um requisito de precisão os pedir.

## Riscos e parada

Se o torque pedido não couber em nenhuma combinação do catálogo dentro do orçamento, o plano não inventa componente: as opções dizem o que falta, e a pergunta volta à pessoa (mais orçamento, menos carga ou menos alcance), reabrindo a etapa de requisitos se ela mudar um requisito. Se a estimativa da massa dos elos pesar mais que a carga no torque do ombro, a fatia 3 para e a seção e o material dos elos viram pergunta à pessoa.

## Fechamento

A preencher.
