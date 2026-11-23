# Requisitos e caderno do objeto: o que a pessoa quer, levantado por perguntas e salvo num arquivo conferido

**Estado:** ativo

**Território:** `.claude/skills/alinhar-requisitos/`, `tools/objetos/`, `objetos/README.md`, `objetos/braco-de-prova/`, `tools/matriz/`.

Ativado pela pessoa em 2026-11-23, que aprovou com o plano a lista de perguntas e o formato descritos abaixo.

**Responsável:** a IA da sessão implementa; a pessoa aprova a lista de perguntas e o formato antes da fatia 2, e responde a rodada de prova da fatia 3.

**Repositório e base:** `warbookbr/nos-mecatronica`, main na ativação. Filho 1 do plano-raiz [do pedido da pessoa ao pacote de construção](2026-11-23-do-pedido-ao-pacote.md).

## Problema observado

Nada neste repositório recebe o que a pessoa quer construir. A pasta `objetos/` só tem o README, a matriz não tem linha sobre requisitos, e nenhuma skill conduz a conversa. Sem isso, a primeira etapa do caminho depende da memória da sessão: a carga, o alcance e o orçamento combinados numa conversa somem na seguinte, e a etapa de dimensionamento (filho 2) não tem de onde tirar os números. No braço do Modelar, o efeito foi a forma aprovada antes de qualquer requisito de carga.

## Resultado

Uma sessão nova consegue, só pela skill `alinhar-requisitos`, levantar com a pessoa os requisitos de um objeto e gravá-los em `objetos/<objeto>/requisitos.json`, que `npm run objetos:conferir` aceita ou recusa dizendo o campo; o caderno `objetos/<objeto>/caderno.json` diz em que etapa o objeto está e quem aprovou o quê. Na matriz, a camada nova do projeto ganha as linhas do caminho, com `proj-requisitos` e `proj-caderno` passando a `feito`.

## Ferramentas externas

Nenhuma. O conferidor é código próprio, como o da ponte.

## O formato dos requisitos

`{ tipo: 'requisitos', versao: '1.0', objeto, revisao, unidades, ... }`, nas unidades da ficha da ponte (mm, g, grau, V) mais grau/s e mm/s, com cada valor no padrão da ponte: `{ valor, origem, nota? }` ou `{ ausente: true, motivo }`. A origem aqui é `pessoa` (a pessoa disse), `sugestao-aceita` (a IA ofereceu e a pessoa escolheu) ou `estimativa` (a IA supôs e a pessoa não contestou). Os campos:

- `objetivo`: o que o objeto faz, em uma frase, e a tarefa típica;
- `carga`: a massa na ponta e onde ela fica, e a carga de pior caso;
- `alcance` e `espacoDeTrabalho`: a distância máxima e a região que a ponta precisa cobrir;
- `precisao` e `repetibilidade`, em mm;
- `velocidade` e `cicloDeTrabalho`: a velocidade da ponta ou das juntas, e quanto tempo seguido trabalha;
- `ambiente`: dentro ou fora, faixa de temperatura, poeira e água;
- `alimentacao`: rede, bateria ou fonte, e as tensões disponíveis;
- `comando`: quem manda (botão, computador, programa autônomo, sem fio);
- `orcamento`: o valor e a moeda;
- `fabricacao`: os meios que a pessoa tem (impressora 3D e área de impressão, usinagem, placa fabricada ou montada à mão);
- `jaTem`: os componentes e as peças que a pessoa já tem, com o nome da família de componentes do Modelar quando houver;
- `seguranca`: se trabalha perto de pessoas e o que tem de acontecer quando falta energia.

São obrigatórios com valor `objetivo`, `carga`, `alcance`, `alimentacao`, `comando`, `orcamento` e `fabricacao`; os outros podem sair ausentes, com o motivo. O formato fica em `tools/objetos/requisitos.schema.json` e segue a regra de versão da ponte.

## O caderno

`objetos/<objeto>/caderno.json` lista as etapas do caminho (requisitos, componentes, forma, simulação, pacote) com o estado de cada uma (`aberta`, `aguarda-pessoa`, `aprovada`, `reaberta`), os arquivos que ela produziu, e a aprovação com quem, a data e o que foi aprovado. Uma etapa só passa a `aprovada` com a frase da pessoa registrada; a IA nunca grava aprovação por conta própria. Reabrir uma etapa aprovada pede o motivo e reabre as seguintes. `npm run objetos:conferir` confere os dois arquivos de cada pasta de `objetos/` e entra em `npm run gates`.

## A skill

`.claude/skills/alinhar-requisitos/SKILL.md` conduz a rodada: uma pergunta por vez, na ordem do formato; resposta vaga não avança, e quando a pessoa não sabe a IA oferece duas opções concretas com a consequência de cada uma ("1 kg a 50 cm pede motor de passo NEMA 23 com redução; 300 g pede NEMA 17 direto"); cada resposta é escrita no arquivo na hora; a IA não escolhe componente nem desenha nada na rodada. Ela fecha com o conferidor verde, um resumo de um parágrafo para a pessoa e a aprovação registrada no caderno. Uma rodada respondida inteira fica de exemplo ao lado da skill.

## Incluído

- o formato e o conferidor dos requisitos e do caderno, com testes, arquivos errados de exemplo e o comando `objetos:conferir` no `gates`;
- a skill com as perguntas-chave e o exemplo de rodada;
- a camada `projeto` na matriz, com as linhas `proj-requisitos`, `proj-caderno`, `proj-dimensionamento`, `proj-escolha-de-componentes`, `proj-roteiro` e `proj-pacote`;
- a pasta `objetos/braco-de-prova/`, com os requisitos do braço de duas juntas dos exemplos da ponte levantados numa rodada real com a pessoa, e o caderno com a etapa de requisitos aprovada.

## Excluído

- escolher componentes e dimensionar, que é o filho 2;
- os requisitos do braço de seis eixos do Modelar, que entram quando o caminho estiver provado no braço de duas juntas;
- o roteiro que encadeia as etapas, que é o filho 3.

## Gate de saída

1. `npm run objetos:conferir` aceita o braço de prova e recusa cada arquivo errado (campo obrigatório ausente, valor sem origem, aprovação sem a frase da pessoa, etapa aprovada depois de uma aberta) com o caminho do campo, por teste.
2. A rodada de prova foi conduzida só pela skill, numa sessão sem a história deste plano, e o arquivo saiu aceito na primeira conferência ou com a correção registrada.
3. A matriz e o README de `objetos/` dizem o que existe, e `npm run gates` está verde.

## Fatias

1. As perguntas e o formato, em texto, para a pessoa aprovar, com o arquivo errado de cada regra.
2. O conferidor, os testes, o comando no `gates` e a camada nova na matriz.
3. A skill e a rodada de prova com a pessoa no braço de duas juntas.
4. A documentação e o fechamento.

## Riscos e parada

Se a pessoa achar a rodada longa demais (mais de uns quinze minutos de perguntas), o plano para e a lista é cortada aos obrigatórios, com os outros perguntados só quando o dimensionamento precisar deles.

## Fechamento

A preencher.
