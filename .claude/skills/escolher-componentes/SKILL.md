---
name: escolher-componentes
description: Mostra à pessoa as combinações de componentes que o dimensionamento achou para um objeto (motor e redução por junta, driver, placa e fonte), lado a lado com folga, custo e medidas, e grava a escolhida em objetos/<objeto>/componentes.json com a aprovação dela no caderno. Use depois que a etapa de requisitos estiver aprovada e as opções existirem. Não use para mudar requisito nem para desenhar a forma.
---

# Escolher componentes

Esta skill conduz a segunda etapa do caminho de um objeto. Ela parte de `objetos/<objeto>/requisitos.json` aprovado e termina com `objetos/<objeto>/componentes.json` e a etapa de componentes aprovada no caderno.

## Antes de mostrar

Rode `npm run dimensionar -- <objeto>` e `npm run opcoes -- <objeto>`. Leia `opcoes.json`: as regras de cálculo estão no campo `regras`, e cada opção traz por junta o torque pedido, o disponível, o que o limita e a folga, e para o conjunto a corrente, o custo e as medidas. Se nenhuma opção cobre a folga mínima dentro do orçamento, não invente componente: diga o que falta e pergunte à pessoa se muda o orçamento, a carga ou o alcance; mudar requisito reabre a etapa de requisitos com o motivo dela.

## Como mostrar

Mostre as opções numa tabela curta (o que cada junta usa, a folga, o custo e o que passa do orçamento) e, abaixo, um parágrafo com a sua recomendação e o motivo. Diga sempre o que é estimativa e pesa na escolha: um limite de torque estimado, uma corrente que o driver não entrega sem ventilação, um preço no topo da faixa. Termine perguntando qual a pessoa escolhe.

## Gravar

Só com a resposta da pessoa, grave `componentes.json` com o tipo `componentes`, a versão `1.0`, o objeto, a revisão, o arquivo de opções e o id da escolhida, e a lista do que ela usa, copiada da opção. Passe a etapa de componentes do caderno a `aprovada`, com `componentes.json` e `opcoes.json` na lista de arquivos e a aprovação com quem, a data, o que foi aprovado e a frase dela copiada como foi dita. Você nunca grava aprovação por conta própria. Rode `npm run objetos:conferir -- objetos/<objeto>` no fim.
