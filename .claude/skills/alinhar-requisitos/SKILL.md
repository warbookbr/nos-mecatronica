---
name: alinhar-requisitos
description: Levanta com a pessoa, uma pergunta por vez, os requisitos de um objeto (o que faz, carga, alcance, precisão, velocidade, ambiente, alimentação, comando, orçamento, fabricação, o que já tem e segurança) e os grava em objetos/<objeto>/requisitos.json, conferido por npm run objetos:conferir, com a aprovação da pessoa no caderno. Use quando a pessoa disser o que quer construir ou quando a etapa de requisitos do caderno estiver aberta ou reaberta. Não use para escolher componentes, dimensionar ou desenhar.
---

# Alinhar requisitos

Esta skill conduz a primeira etapa do caminho de um objeto: saber o que a pessoa quer, com números, antes de qualquer componente ou forma. O resultado é o arquivo `objetos/<objeto>/requisitos.json`, no formato de [`tools/objetos/requisitos.schema.json`](../../../tools/objetos/requisitos.schema.json), aceito por `npm run objetos:conferir`, e a etapa de requisitos aprovada no `objetos/<objeto>/caderno.json`, no formato de [`tools/objetos/caderno.schema.json`](../../../tools/objetos/caderno.schema.json). Leia os dois esquemas antes da primeira pergunta; o exemplo de teste em [`tools/objetos/exemplos/objeto-de-teste/`](../../../tools/objetos/exemplos/objeto-de-teste/) mostra a forma de cada campo, mas os valores dele são fictícios e não servem de sugestão.

## Antes de perguntar

Confira se a pasta `objetos/<objeto>/` existe, com o nome do objeto em minúsculas e hífen, o mesmo do Modelar quando ele já existir lá. Se não existir, crie-a com o `caderno.json` das cinco etapas abertas e sem arquivos. Leia o caderno: se a etapa de requisitos estiver aprovada, não há rodada a fazer, e o que muda um requisito aprovado é a reabertura, que pede o motivo dito pela pessoa e reabre as etapas seguintes. Se já houver um `requisitos.json`, a rodada continua dele, do primeiro campo que falta ou que a pessoa quer mudar, e a revisão sobe em um quando um valor já aprovado muda.

## A rodada

Faça uma pergunta por vez, na ordem dos campos do formato: objetivo, carga, alcance, espaço de trabalho, precisão, repetibilidade, velocidade, ciclo de trabalho, ambiente, alimentação, comando, orçamento, fabricação, o que a pessoa já tem e segurança. Cada pergunta cobre um campo, diz a unidade em que a resposta entra (mm, g, grau, V, mm/s, grau/s, °C) e cabe em uma ou duas frases. Não junte campos numa pergunta só, não mande a lista inteira de uma vez e não pule para a frente porque a pessoa adiantou algo; o que ela adiantar se escreve no campo certo e a pergunta daquele campo vira confirmação quando chegar a vez dele.

Resposta vaga não avança. "Leve", "rápido", "uns trocados" ou "o normal" não são valor: peça o número ou a escolha, com a unidade, e só passe ao campo seguinte quando ele estiver no arquivo. Quando a pessoa disser que não sabe, ofereça duas opções concretas e a consequência de cada uma para o projeto, por exemplo "1 kg a 50 cm pede motor de passo NEMA 23 com redução; 300 g pede NEMA 17 direto", e deixe a pessoa escolher. A opção escolhida entra com a origem `sugestao-aceita`. Se ela também não escolher, você pode propor um valor e dizer que ele entra como estimativa; se ela não contestar, ele entra com a origem `estimativa`. O que a pessoa disse por conta própria entra com a origem `pessoa`.

Os campos objetivo, carga (a massa na ponta), alcance, alimentação, comando, orçamento e fabricação (os meios) são obrigatórios com valor, e o conferidor recusa qualquer um deles escrito como ausente: insista com as duas opções até haver valor. Os outros campos podem sair ausentes, e o motivo é o que a pessoa disse, como "decide depois de ver os componentes". No campo do que a pessoa já tem, use o nome da família de componentes do Modelar quando houver (`motor-de-passo`, `fonte-chaveada`, `modulo-de-placa`) e `null` quando não houver.

Escreva cada resposta no `requisitos.json` na hora, antes da pergunta seguinte, para que uma sessão interrompida retome do arquivo e não da memória. Enquanto houver campo sem resposta, o arquivo ainda não passa no conferidor, e tudo bem; ele só precisa passar no fim.

Na rodada você não escolhe componente, não dimensiona e não desenha nada. Citar um componente numa opção, para mostrar a consequência dela, é permitido; anotar a escolha de um componente não é, porque isso é a etapa seguinte. Se a pessoa pedir um componente, registre o pedido na nota do campo e diga que ele entra na escolha de componentes.

## Fechar

Rode `npm run objetos:conferir -- objetos/<objeto>` e corrija até sair verde; cada recusa diz o caminho do campo, e o que faltar volta como pergunta à pessoa, nunca como valor inventado. Depois mostre à pessoa um resumo de um parágrafo, em prosa corrida, com os números que ela deu e o que entrou como sugestão aceita ou estimativa, e pergunte se aprova.

Passe a etapa de requisitos do caderno a `aguarda-pessoa` com `requisitos.json` na lista de arquivos enquanto espera a resposta. Só quando a pessoa aprovar, grave a etapa como `aprovada` com a aprovação: em `quem`, o nome que a pessoa usa; em `data`, o dia no formato AAAA-MM-DD; em `oQue`, o arquivo e a revisão aprovados; e em `frase`, a frase dela copiada como ela a disse. Você nunca grava aprovação por conta própria, nem com frase escrita por você, nem a partir de um silêncio. Se a pessoa pedir mudança, volte à pergunta do campo, mude o arquivo e mostre o resumo de novo. Rode o conferidor uma última vez com o caderno gravado.

Se a rodada passar de uns quinze minutos de perguntas, pare e diga isso à pessoa: o plano prevê cortar a lista aos obrigatórios e perguntar os outros só quando o dimensionamento precisar deles.
