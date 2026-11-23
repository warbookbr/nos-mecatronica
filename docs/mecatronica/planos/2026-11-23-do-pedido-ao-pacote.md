# Do pedido da pessoa ao pacote de construção: o caminho de ponta a ponta entre a mecatrônica e o Modelar

**Estado:** rascunho

**Tipo:** raiz

**Território:** nenhum (aguarda aprovação)

**Responsável:** a IA da sessão escreve e conduz os planos filhos; a pessoa aprova cada filho antes de ativá-lo e, dentro do caminho, aprova três coisas: os requisitos, os componentes principais e a forma (esta no Modelar).

**Repositório e base:** `warbookbr/nos-mecatronica`, main de 2026-11-23, com o contrato da ponte na versão 1.1. O outro lado é o Modelar (`warbookbr/nos-modelar`), que desenha a forma, exporta a ficha e cumpre os pedidos, pelo plano da ponte de lá (`docs/modelar/planos/2026-11-16-ponte-com-a-mecatronica.md`).

Escrito a pedido da pessoa em 2026-11-23, que aprovou a estrutura descrita aqui na conversa: alinhamento de requisitos, caderno do objeto, catálogo e escolha de componentes, dimensionamento, roteiro de ponta a ponta com crítico e a saída de construção.

## Problema observado

O que a pessoa quer dizer é "quero construir um braço que levante 1 kg a 50 cm", e hoje nenhum dos dois repositórios sabe receber isso. O Modelar modela a forma a partir de um alinhamento de forma (objeto, referências, partes, contatos), e a mecatrônica tem só o contrato da ponte: a [matriz](../MATRIZ.md) tem 68 capacidades de simulação e nenhuma sobre o que vem antes delas, isto é, saber o que a pessoa quer, escolher os componentes e dimensionar. As pastas `componentes/` e `objetos/` deste repositório só têm o README, e ele não tem nenhuma skill nem agente.

A consequência já apareceu no braço robótico do Modelar: a forma foi modelada e aprovada antes de se saber que motor e que redução vão dentro de cada junta, e a ficha exportada hoje sai com a junta sem motor e com o curso e a redução estimados depois. Na prática é o contrário: a carga e o alcance dão o torque, o torque escolhe o motor e a redução, e o motor dá o tamanho da junta. Sem um caminho que comece pelos requisitos, cada objeto novo repete o braço, e o que a simulação achar chega tarde, depois da forma aprovada.

## Resultado

A pessoa diz o que quer construir, e a IA conduz o caminho inteiro pelos dois repositórios até o pacote de construção (lista de compras, arquivos de fabricação, firmware e passo a passo de montagem), parando para a pessoa só nas três aprovações, com cada etapa registrada no caderno do objeto e retomável por qualquer sessão. O caminho é provado inteiro num braço de duas juntas antes de servir ao braço de seis.

## O caminho

Requisitos: a IA levanta com a pessoa, uma pergunta por vez, o que o objeto faz, a carga, o alcance, a precisão, a velocidade, o ciclo de trabalho, o ambiente, a alimentação, quem comanda, o orçamento, os meios de fabricação e o que a pessoa já tem; quando a pessoa não sabe, oferece duas opções concretas. Fecha num arquivo conferido e na aprovação da pessoa.

Dimensionamento e escolha: dos requisitos sai o torque de cada junta na pior pose, com a massa dos elos estimada antes de haver forma; do torque saem duas ou três combinações de motor, redução, driver, placa e fonte do catálogo de componentes, lado a lado com custo, folga e tamanho, para a pessoa escolher. A escolha vira o espaço que cada componente pede ao Modelar.

Forma: o Modelar modela com os componentes escolhidos dentro, pelo alinhamento e pelo laço de modelagem de lá, e a pessoa aprova a forma lá. A ficha exportada volta para cá.

Simulação: as camadas conferem a ficha (ligações, elétrico, lógico, físico e o laço), e o que falha volta como pedido ao Modelar ou como troca de componente, com o crítico lendo o resultado sem a história do projeto.

Pacote: a lista de compras sai do catálogo, os arquivos de fabricação saem dos exportadores do Modelar, o firmware sai da camada lógica e o passo a passo sai do manual de montagem do Modelar.

## Planos filhos

1. [Requisitos e caderno do objeto](concluidos/2026-11-23-requisitos-e-caderno-do-objeto.md), concluído em 2026-11-23: a skill de alinhamento de requisitos com as perguntas-chave, o formato salvo dos requisitos com o conferidor e o caderno do objeto com o estado de cada etapa e as aprovações. Abre na matriz a camada do projeto, com as linhas do caminho. Não depende de nada.
2. [Dimensionamento e escolha de componentes](2026-11-23-dimensionamento-e-componentes.md), ativo: o catálogo de componentes reais (motor, redutor, driver, placa, fonte) com a fonte de cada número, o torque por junta na pior pose (linhas `fis-modelo-dinamico`, `fis-torque-gravidade`, `fis-curva-do-motor` e `fis-limite-de-curso`), a skill que monta as opções para a pessoa e o pedido de espaço ao Modelar para cada componente escolhido. Depende do 1, e da massa e inércia da ficha (fatia 3 do plano da ponte de lá) só para conferir depois da forma.
3. Roteiro de ponta a ponta: o comando que diz, a cada passo, em que repositório se está, a skill, o que se espera da pessoa e o passo seguinte, lendo o caderno; o agente crítico da simulação; e a prova inteira num braço de duas juntas, do pedido da pessoa até a simulação aprovada. Depende do 2 e do plano da ponte de lá concluído.
4. Pacote de construção: a lista de compras, os arquivos de fabricação (inclusive o da placa, que sai do cobre traçado no Modelar), o firmware de partida e o passo a passo, num pacote gerado e conferido. Depende do 3 e da camada lógica.

As camadas elétrica, lógica e do laço seguem pelos planos delas, guiados pela matriz; este caminho as chama onde existirem e diz no caderno o que ainda não foi simulado.

## Excluído

O robô humanoide, que entra depois do braço; as camadas de simulação em si, que têm planos próprios; e qualquer mudança no contrato da ponte, que segue a decisão 0004 e o fluxo de versão de `ponte/`.

## Riscos e parada

Se o alinhamento de requisitos não fechar num arquivo conferido, porque a pessoa responde de forma vaga e nenhuma das opções serve, o filho 1 para e a lista de perguntas volta à pessoa antes de seguir. Se o dimensionamento antes da forma errar demais contra a massa medida depois (mais que o dobro do torque numa junta), o filho 2 para e a estimativa de massa dos elos vira pergunta à pessoa. Se o caminho pedir que este repositório edite geometria, ele para: a forma é do Modelar.

## Fechamento

A preencher, quando os quatro filhos estiverem concluídos ou cancelados.
