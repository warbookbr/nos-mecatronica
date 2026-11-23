# Contrato da ponte 1.1: o item `ligacoes` no pedido e o tipo de porta `passivo` na ficha

**Estado:** concluído

**Território:** `ponte/`, `tools/ponte/`

Ativado pela pessoa em 2026-11-23.

**Responsável:** a IA da sessão implementa; a pessoa aprovou o formato pela proposta do Modelar e aprova a versão antes do fechamento.

**Repositório e base:** `warbookbr/nos-mecatronica`, main na ativação. O outro lado é o Modelar: o plano das trilhas de lá (`docs/modelar/planos/2026-11-17-trilhas-e-validacao-da-placa.md`), que espera o item `ligacoes` para fechar, e o plano da ponte de lá (`docs/modelar/planos/2026-11-16-ponte-com-a-mecatronica.md`), que copia os esquemas pela decisão 0004.

## Problema observado

O Modelar já traça e confere o cobre de uma placa a partir de uma lista de redes, e entregou a proposta do item que leva essa lista no pedido (`docs/modelar/banco-de-provas/trilhas-da-placa-2026-11-23/PROPOSTA-DO-ITEM.md`, lá). O pedido 1.0 só tem os itens `espaco`, `posicao`, `passagem` e `saidaDeAr`, então a lista de redes não tem onde ir. Além disso, as redes citam terminais de resistor, capacitor e LED, e a ficha 1.0 só aceita porta de alimentação, terra, sinal digital, sinal analógico, barramento e fase de motor: um pedido de ligações que cite esses terminais seria recusado pelo conferidor porque a porta não existiria na ficha.

## Resultado

Os esquemas sobem para 1.1 com o item `ligacoes` no pedido e o tipo de porta `passivo` na ficha, o `versoes.json` traz o SHA-256 da 1.1 e mantém o da 1.0, o `ponte:conferir` aceita os exemplos 1.1 e recusa cada erro novo com o caminho do campo, e um arquivo 1.0 continua aceito. A linha `ponte-esquema-do-pedido` da matriz passa a citar a 1.1 na prova.

## Ferramentas externas

Nenhuma. O conferidor continua o de `tools/ponte/conferir.mjs`, sem dependência.

## Incluído

- no `pedido.schema.json`, o item `ligacoes` como na proposta do Modelar: `placa` (peça da ficha), `redes` com ao menos uma rede, cada uma com `id` no padrão da ponte, ao menos dois `terminais` `{ peca, porta }`, e `larguraMinima` e `distanciaMinima` opcionais em mm com origem, mais o `motivo` e a `resposta` como nos outros itens; a `resposta` não cumprida pode trazer as redes que não fecharam;
- no `ficha.schema.json`, o tipo de porta `passivo`, para terminal de componente sem papel elétrico fixo (resistor, capacitor, LED, cristal), com a tensão ausente;
- o `versao` aceitando `1.0` e `1.1`, e a regra do README de que tipo novo opcional sobe a versão menor;
- no conferidor, as regras de referência do item: a placa é peça da ficha, cada terminal é porta da ficha, nenhum terminal aparece em duas redes, nenhuma rede repete terminal;
- nos exemplos, o pedido do braço de prova ganha um item `ligacoes` sobre a placa dele, e a ficha ganha as portas que ele cita (passivas onde for o caso); em `ponte/exemplos/errados/`, um arquivo por erro novo (terminal inexistente, terminal em duas redes, rede com um terminal, placa que não é peça), recusado com o caminho do campo por teste;
- `versoes.json` com a entrada 1.1 e o teste que confere o SHA-256 dos arquivos atuais contra a última versão;
- o README da ponte e a linha da matriz atualizados.

## Excluído

- calcular `larguraMinima` e `distanciaMinima` pela corrente e pela tensão, que é da camada elétrica e tem linha própria na matriz;
- o traçado e a conferência do cobre, que são do Modelar;
- a conversão para o MuJoCo de qualquer campo novo, porque nenhum deles muda a física.

## Gate de saída

O `npm run gates` verde, com os exemplos 1.1 aceitos, cada errado novo recusado com o caminho do campo e o valor, um arquivo 1.0 ainda aceito, e o SHA-256 da 1.1 conferido contra os arquivos; a matriz e o README atualizados com o que a 1.1 prova e não cobre.

## Fatias

1. Os errados novos e o pedido 1.1 de exemplo, que o conferidor de hoje recusa pelo motivo errado (item desconhecido).
2. Os esquemas 1.1, as regras de referência no conferidor e os testes, com o SHA-256 em `versoes.json`.
3. O README, a matriz e o fechamento.

## Riscos e parada

Se a 1.1 obrigar a mudar algum campo que a 1.0 já tinha, o plano para, porque isso subiria a versão maior e quebraria a cópia do Modelar. Se o conferidor passar de umas 300 linhas, vale a regra do plano dos esquemas.

## Fechamento

Concluído em 2026-11-23, no ramo `claude/admiring-rubin-h9zjwx`, sobre a main da ativação; as fatias estão nos commits `c1d0c1d` (o pedido 1.1 de exemplo e os errados), `dd9f3eb` (esquemas 1.1, regras do conferidor, testes e `versoes.json`) e no commit deste fechamento. A main anda quando o CI do envio passar, e a pessoa aprova a versão 1.1 nesse envio.

O gate de saída vale no ramo. `npm run gates` passou com os seis gates verdes: planos, matriz, links, o conferidor sobre a ficha e o pedido 1.1 do braço de prova, e os testes, que recusam cada errado novo com o caminho do campo e o valor, aceitam a ficha e o pedido rebaixados para 1.0 sem a porta passiva e o item `ligacoes`, recusam os dois num arquivo 1.0 e conferem o SHA-256 da 1.1 contra os arquivos. Nenhum campo da 1.0 mudou; a 1.1 acrescenta o tipo de item, a definição da rede, a resposta das ligações com as redes que não fecharam e o tipo de porta `passivo`, que exige a tensão ausente. O SHA-256 da 1.1 é `c371e178686bf1b52a2cb13a2b9acedecbff60d88db5dc342002e9a3c077aea1` para a ficha e `20b1186ccd6e3206ba607cbaee3b329fbf8248663d5db5f33d2b8f1a674220f0` para o pedido. O conferidor ficou com 300 linhas, no limite da regra do plano dos esquemas.

Além das quatro regras do plano, o conferidor recusa a rede de identificador repetido e a resposta que cita rede fora do item, cada uma com o seu errado, porque o Modelar relata as redes pelo identificador. O MJCF esperado mudou só no comentário que diz a versão da ficha, e a física não mudou, então a carga no MuJoCo da decisão 0003 continua valendo. O resistor e o LED de estado do exemplo estão soldados na placa e contados na massa dela, então os terminais deles são portas passivas da própria placa, regra que o README da ponte passou a dizer.

O resultado observado é que o Modelar tem onde pôr a lista de redes e pode fechar o plano das trilhas copiando os esquemas 1.1 com o SHA-256 acima. Um achado que o processo não pegaria sozinho: a recusa de um tipo de porta fora da lista num arquivo 1.0 passou a citar `passivo` entre os aceitos, porque o conferidor guardava a primeira recusa de cada campo e a da lista geral vem antes da restrição da 1.0. Só o arquivo esperado de `tipo-de-porta` mostrou a mudança; agora a lista mais estreita prevalece, e um teste confere que o arquivo 1.0 é recusado com a lista da 1.0. O cálculo da largura e da distância mínimas pela corrente e pela tensão continua na linha própria da camada elétrica na matriz.
