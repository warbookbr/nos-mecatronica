---
name: conduzir-caminho
description: Conduz um objeto pelo caminho de ponta a ponta (requisitos, componentes, forma no Modelar, simulação e pacote) a partir do caderno dele, retomando de onde parou sem a história de sessões anteriores. Use quando a pessoa disser o que quer construir, pedir para continuar um objeto ou perguntar em que pé ele está. Não use para mudar o contrato da ponte nem para editar geometria.
---

# Conduzir o caminho

O estado do objeto mora em `objetos/<objeto>/caderno.json`, e não na conversa. Comece sempre por `npm run caminho -- <objeto>`: ele confere o caderno e os arquivos da pasta e diz a etapa de agora, o repositório, a skill, o comando, o que fazer, o que se espera da pessoa e a etapa seguinte. Se o objeto ainda não tem pasta, o caminho começa pela skill `alinhar-requisitos`, que a cria.

## A cada passo

Faça o que o comando diz, com a skill que ele cita, e rode o comando de novo ao terminar, para ver o passo seguinte. A etapa da forma acontece no Modelar (`warbookbr/nos-modelar`), pelas skills de lá e pelo plano ativo de lá; este repositório nunca edita geometria. A ficha que o Modelar exporta é copiada para `objetos/<objeto>/<objeto>.ficha.json`, e o pedido inicial que o Modelar responde volta como `ponte/exemplos/<objeto>.pedido-inicial.json`.

Na simulação, rode `npm run simular:ficha -- <objeto>` e despache o agente `critico-da-simulacao` só com a pasta do objeto, sem a história. Leve à pessoa o resultado e o que o crítico achou, em linguagem simples, com uma recomendação. O que o crítico achar e o processo não pegou vira conta na simulação, gate ou campo antes de a etapa seguir. Se a folga cair abaixo do mínimo aprovado ou o erro na ponta passar da precisão pedida, ofereça à pessoa as trocas (outro componente, menos carga, requisito mais folgado), e a escolhida volta à etapa de componentes com a revisão nova.

## Aprovar

Quando a etapa termina, passe-a a `aguarda-pessoa` com os arquivos dela e mostre o resultado. Só grave `aprovada` com a frase da pessoa copiada como ela disse, o nome que ela usa e a data; você nunca grava aprovação por conta própria, nem a partir de silêncio. Rode `npm run objetos:conferir -- objetos/<objeto>` depois de cada mudança no caderno.

## Parar

Pare e pergunte à pessoa quando o comando recusar o caderno e o conserto não for evidente, quando uma etapa pedir mudança em etapa já aprovada (a reabertura pede o motivo dito por ela) ou quando o passo exigir um plano que não existe, como o do pacote hoje: escreva o plano e peça a aprovação dele antes de implementar.
