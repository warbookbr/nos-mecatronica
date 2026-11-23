# Roteiro de ponta a ponta: o braço de duas juntas do pedido da pessoa à simulação aprovada, pelos dois repositórios

**Estado:** rascunho

**Território:** a declarar ao ativar: `tools/caminho/`, `.claude/agents/critico-da-simulacao.md`, `.claude/skills/conduzir-caminho/`, `ponte/`, `tools/ponte/`, `camadas/fisico/`, `objetos/braco-de-prova/`.

**Responsável:** a IA da sessão implementa nos dois repositórios; a pessoa aprova a mudança do contrato da ponte, a forma do braço de prova no Modelar e o resultado da simulação.

**Repositório e base:** `warbookbr/nos-mecatronica`, main na ativação, e um plano irmão no `warbookbr/nos-modelar` para a forma do braço de prova, escrito e ativado junto com este. Filho 3 do plano-raiz [do pedido da pessoa ao pacote de construção](2026-11-23-do-pedido-ao-pacote.md), depois dos filhos 1 e 2, concluídos em 2026-11-23, e do plano da ponte do Modelar, concluído no mesmo dia.

## Problema observado

O braço de prova tem os requisitos aprovados e os componentes escolhidos (`objetos/braco-de-prova/componentes.json`: NEMA 23 com planetária de 5:1 no ombro, NEMA 17 com correia de 4:1 no cotovelo), e as etapas seguintes não andam sozinhas. Três coisas faltam.

A escolha não chega ao Modelar. O contrato da ponte só leva um pedido que responde a uma ficha existente (`ficha.revisao` de 1 em diante), e o braço de prova não tem ficha, porque ainda não tem forma. Pela decisão 0001, nenhum lado lê os arquivos do outro, então o Modelar não pode ler `componentes.json`: o motor, a redução e as medidas de cada um precisam atravessar pelo pedido.

Ninguém diz o passo seguinte. O caderno guarda o estado de cada etapa, mas cada passo hoje depende de a sessão lembrar em que repositório está, que skill usar e o que esperar da pessoa.

A simulação não confere a forma. O dimensionamento estimou a massa dos elos antes de haver forma; com a ficha do Modelar, a massa medida tem de voltar para o cálculo, e alguém sem a história do projeto precisa ler o resultado antes de a pessoa aprovar.

## Resultado

Para o braço de prova, a sessão roda `npm run caminho -- braco-de-prova` e recebe, a cada etapa, o repositório, a skill, o comando, o que se espera da pessoa e o passo seguinte, lidos do caderno. O pedido inicial leva os componentes escolhidos ao Modelar, que modela o braço com eles dentro; a ficha exportada volta, a camada física refaz o torque com a massa medida e confere a folga, o crítico da simulação lê o resultado sem a história, e a pessoa aprova. A etapa de simulação do caderno termina aprovada, e o que ainda não é simulado (ligações, circuito, programa) fica escrito no caderno.

## Ferramentas externas

O MuJoCo 4.0.1, pela decisão 0003, para a conferência manual do torque de gravidade na ficha do braço de prova, como foi feito com o braço de seis eixos. O gate não depende dele.

## O que muda no contrato da ponte (decisão da pessoa)

A versão 1.2 do pedido, só com acréscimos opcionais: o pedido inicial, com `ficha.revisao` igual a 0, para um objeto que ainda não tem ficha, em que as referências a peça não se conferem; e o item `componente`, que pede ao Modelar que ponha um componente comprado na forma, com o nome, a família quando houver, a caixa e a massa da folha de dados, o eixo de saída quando for motor ou redução, e a junta ou a peça a que ele serve. A resposta do Modelar a esse item diz em que peça e em que pose o componente ficou. A 1.0 e a 1.1 continuam aceitas, e o Modelar copia a 1.2 pela decisão 0004.

## Incluído

- os esquemas 1.2 do pedido, com o item `componente`, o pedido inicial, os exemplos e os arquivos errados, e o conferidor da ponte atualizado;
- `npm run caminho -- <objeto>`, que lê o caderno e diz a etapa aberta, o repositório, a skill, o comando, o que se espera da pessoa e o passo seguinte, e recusa avançar uma etapa cuja anterior não está aprovada;
- a skill `conduzir-caminho`, que segue o que o comando diz de uma ponta à outra, para uma sessão nova retomar o objeto só pelo caderno;
- `npm run pedido-inicial -- <objeto>`, que gera o pedido inicial de `componentes.json`, com um item `componente` por motor, redução, driver, placa e fonte;
- no Modelar, pelo plano irmão: a forma do braço de prova de duas juntas com os componentes dentro, pela skill de alinhamento e pelo laço de modelagem de lá, aprovada pela pessoa por imagem; a ficha exportada e a resposta ao pedido inicial;
- a simulação: `npm run dimensionar -- <objeto> --ficha=<arquivo>` refaz o torque com a massa e o centro de massa de cada conjunto da ficha no lugar da estimativa, e diz a folga de cada junta com os motores escolhidos; se a folga cair abaixo de 2, o caminho volta à escolha de componentes, com o motivo no caderno;
- o agente `critico-da-simulacao`, que lê a ficha, o dimensionamento e as opções sem a história do projeto e diz o que está fora do esperado (folga abaixo do mínimo, massa medida muito diferente da estimada, componente sem resposta do Modelar), no estilo do crítico visual do Modelar;
- a etapa de simulação do caderno aprovada pela pessoa, com o crítico lido e o que ainda não é simulado escrito.

## Excluído

- as camadas de ligações, circuito, programa e laço; o caminho as chama quando existirem, e o caderno diz que não foram simuladas;
- o pacote de construção, que é o filho 4;
- o braço de seis eixos do Modelar, que segue no caminho depois do braço de prova.

## Gate de saída

1. Os esquemas 1.2 aceitam o pedido inicial de exemplo e recusam cada errado novo, e um arquivo 1.0 e um 1.1 continuam aceitos.
2. `npm run caminho -- braco-de-prova` diz o passo certo em cada estado do caderno, por teste com cadernos de exemplo em cada etapa.
3. O pedido inicial do braço de prova sai igual em duas gerações e passa no conferidor; o Modelar o responde com cada componente posto na forma.
4. A ficha do braço de prova passa no conferidor da ponte, e o dimensionamento refeito com ela diz a folga de cada junta.
5. O crítico leu o resultado, e a pessoa aprovou a forma no Modelar e a simulação aqui, as duas no caderno.
6. Uma sessão nova, só com a skill `conduzir-caminho`, chega ao estado de agora a partir do caderno, sem a história deste plano.

## Fatias

1. O contrato 1.2 em texto, para a pessoa aprovar, com o pedido inicial de exemplo do braço de prova.
2. Os esquemas 1.2, o conferidor e o `pedido-inicial`; o Modelar copia a 1.2.
3. O comando `caminho` e a skill `conduzir-caminho`, com os cadernos de exemplo.
4. No Modelar, pelo plano irmão: a forma do braço de prova com os componentes, aprovada pela pessoa, a ficha e a resposta ao pedido inicial.
5. O dimensionamento com a ficha, o crítico da simulação e a aprovação da pessoa.
6. A prova com uma sessão nova, a documentação e o fechamento.

## Riscos e parada

Se a forma do braço de prova não comportar um componente escolhido (o NEMA 23 com a planetária não cabe no elo de 150 mm, por exemplo), o Modelar responde o item como não cumprido com o motivo, e o caminho volta à escolha de componentes, sem o Modelar mudar a forma por conta própria. Se a folga medida cair abaixo de 2, o caminho volta à escolha, e a pessoa decide entre outro componente e menos carga. Se o plano irmão do Modelar não puder ser ativado por falta de lugar entre os planos ativos de lá, este para na fatia 3.

## Fechamento

A preencher.
