# Contrato da ponte 1.1: o item `ligacoes` no pedido e o tipo de porta `passivo` na ficha

**Estado:** ativo

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

A preencher.
