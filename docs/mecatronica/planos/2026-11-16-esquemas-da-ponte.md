# Esquemas da ponte: a ficha e o pedido como JSON versionado, com conferidor e exemplos de prova

**Estado:** ativo

**Território:** `ponte/`, `tools/ponte/`, `docs/mecatronica/decisoes/`

Ativado pela pessoa em 2026-11-16.

**Responsável:** a IA da sessão implementa; Tiago aprova o formato antes da fatia 2.

**Repositório e base:** `warbookbr/nos-mecatronica`, main na ativação. O outro lado é o plano da ponte do Modelar (`docs/modelar/planos/2026-11-16-ponte-com-a-mecatronica.md`, lá), que exporta a ficha e lê o pedido por estes esquemas.

## Problema observado

O contrato da ponte existe só em prosa ([`ponte/README.md`](../../../ponte/README.md)), e o próprio texto diz que os esquemas ficam para o primeiro plano da ponte. Sem eles, o Modelar não tem o que exportar e este repositório não tem o que ler: as linhas `ponte-esquema-da-ficha` e `ponte-esquema-do-pedido` da [matriz](../MATRIZ.md) estão em falta, e todas as linhas das camadas que leem a ficha (ligações, elétrico, físico) e a que escreve o pedido (`ponte-espaco-placa-e-chicote`) dependem delas. É também o único trabalho deste repositório que não espera nada do Modelar: o plano da ponte de lá espera estes esquemas.

## Resultado

Os esquemas JSON da ficha e do pedido, versionados, com um conferidor por comando que recusa o arquivo errado dizendo o campo, o valor e a versão, e exemplos escritos à mão de um objeto de prova (um braço de duas juntas com motor, driver, placa e fonte) que passam; as linhas `ponte-esquema-da-ficha` e `ponte-esquema-do-pedido` passam a `feito`.

## Ferramentas externas

Nenhum motor de simulação. O conferidor é nosso, em JavaScript, sem dependência: o formato dos esquemas é o JSON Schema na versão 2020-12 como documentação legível, e a conferência é feita por código próprio que só cobre o que os esquemas usam (tipos, campos obrigatórios, enumerações, faixas e referências entre campos), porque a regra de referência (pedido que cita peça ou porta da ficha) não cabe em JSON Schema. Se o código próprio passar de umas 300 linhas, a fatia para e a pessoa decide entre aceitar um validador de terceiros declarado em `decisoes/` e cortar a conferência.

## Incluído

- `ponte/esquemas/ficha.schema.json` e `ponte/esquemas/pedido.schema.json`, com a versão do contrato (`versao`, começando em 1) e a regra de que campo novo opcional sobe a versão menor e campo novo obrigatório ou mudado sobe a maior;
- a ficha: unidade (mm), referencial, o caminho da malha exportada e o resumo dela (caixa, contagem de faces), as peças (identificador estável, nome, família de componentes quando houver, posição e orientação na montagem, conjunto móvel a que pertence), as portas (identificador, peça, posição no referencial da peça, tipo entre alimentação, terra, sinal digital, sinal analógico, barramento e fase de motor, e a tensão nominal quando declarada), as juntas (eixo, peças dos dois lados, curso), os volumes livres e a massa, o centro de massa e a inércia; cada valor numérico com a origem `medido`, `declarado` ou `estimativa`, e campo ausente dito como ausente;
- o pedido: a versão da ficha a que responde, e os itens `espaco`, `posicao`, `passagem` e `saidaDeAr`, cada um citando peça e porta pelo identificador, com a tolerância, o motivo e a linha da matriz que o motivou; e a resposta do Modelar por item (`cumprido`, `nao-cumprido` com o motivo);
- `tools/ponte/conferir.mjs` (`npm run ponte:conferir -- <arquivo> [--ficha=<arquivo>]`), que confere o esquema e, no pedido, que cada peça e porta citada existe na ficha; com teste e entrada em `npm run gates` sobre os exemplos;
- os exemplos em `ponte/exemplos/`: a ficha do braço de prova, um pedido dele que passa, e um arquivo errado por regra (campo ausente, versão desconhecida, tipo de porta fora da lista, peça citada que não existe, valor sem origem), cada um com a recusa esperada;
- a decisão em `docs/mecatronica/decisoes/` de onde mora a cópia de referência: aqui, e o Modelar guarda uma cópia com a versão e confere que é igual à desta versão.

## Excluído

- exportar a ficha do Modelar e cumprir o pedido, que são do plano da ponte de lá;
- ler a malha exportada (só o caminho e o resumo entram na ficha);
- qualquer camada da simulação;
- volumes livres calculados: o esquema os aceita, quem os calcula é outro plano.

## Gate de saída

1. Os dois esquemas, o conferidor e os exemplos na main, com `npm run gates` verde e o conferidor rodando sobre os exemplos.
2. Cada arquivo errado de `ponte/exemplos/` é recusado com o campo, o valor recebido e a versão, e os certos passam, por teste.
3. A mesma entrada dá a mesma saída do conferidor, byte a byte.
4. A pessoa aprovou o formato da ficha e do pedido, lidos nos exemplos (aprovado em 2026-11-16, com dois ajustes: a variante `rp2040` no microcontrolador do braço de prova e a conversão abaixo).
5. As linhas `ponte-esquema-da-ficha` e `ponte-esquema-do-pedido` em `feito`, com a prova e o que não cobrem, e o `ponte/README.md` apontando para os esquemas no lugar de "o que ainda falta".
6. A ficha do braço de prova converte por comando para MJCF (`npm run ponte:mjcf -- <ficha>`), com as peças, as juntas com eixo e curso, a massa, o centro de massa e a inércia, e o MuJoCo carrega o resultado sem erro, chamado como programa e declarado em `decisoes/` com versão e licença; a conversão mostra que a parte física da ficha fala o formato que os simuladores já leem.

## Fatias

1. Feita em 2026-11-16, aprovada pela pessoa com dois ajustes: os exemplos à mão primeiro (a ficha e o pedido do braço de prova), para a pessoa ler o formato antes de qualquer código.
2. Os esquemas e o conferidor, com os arquivos errados e o teste, e a conversão da ficha para MJCF com a carga no MuJoCo.
3. A decisão da cópia de referência, a matriz, o README da ponte e o fechamento.

## Riscos e parada

Se o plano da ponte do Modelar, ao ser ativado, precisar de campo que muda o formato, o esquema sobe a versão maior e este plano registra a mudança, sem quebrar os exemplos da versão anterior. Se a pessoa não aprovar o formato na fatia 1, a fatia 2 não começa.

## Fechamento

A preencher.
