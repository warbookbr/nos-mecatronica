# Planos

Um plano é o que autoriza implementação neste repositório. Sem plano ativo, o backlog não autoriza nada. Cada plano é um arquivo nesta pasta com o nome `AAAA-MM-DD-assunto-curto.md`, escrito a partir do [modelo](MODELO.md), e o gate `npm run planos:check` confere as regras abaixo.

**Planos ativos:** nenhum.

## Regras

O plano declara a linha `**Estado:**` com um destes valores: `rascunho`, `pronto`, `ativo`, `concluído`, `cancelado` ou `congelado`. O plano em rascunho, pronto ou ativo mora na raiz desta pasta, e uma subpasta só guarda o que saiu de cena. Todo plano tem no máximo 300 linhas, porque plano é para ser lido inteiro antes de começar.

Podem estar ativos ao mesmo tempo até seis planos. O plano ativo declara a linha `**Território:**` com os caminhos que ele muda, entre crases e separados por vírgula, com pasta terminada em `/`, ou `nenhum (aguarda aprovação)`. Dois planos ativos não podem ter territórios sobrepostos, e há sobreposição quando os caminhos são iguais ou um é pasta que contém o outro. Ficam fora dessa conta os caminhos que todo plano pode mudar: esta pasta, `docs/mecatronica/matriz.json`, `docs/mecatronica/MATRIZ.md`, `tools/gates.mjs`, `.github/workflows/`, `package.json` e `package-lock.json`.

O plano com a linha `**Tipo:** raiz` organiza outros planos e não se executa: ele não pode estar ativo nem pronto, e o que se ativa é um plano filho dele.

A linha "**Planos ativos:**" acima lista o link de cada plano ativo, ou diz "nenhum.", e o parágrafo "Planos ativos:" do [README.md da raiz](../../../README.md) diz o mesmo. Todo plano em rascunho ou pronto tem um link neste índice, na lista abaixo, para ninguém esquecê-lo parado na pasta.

## Planos em rascunho ou prontos

Em rascunho: [do pedido da pessoa ao pacote de construção](2026-11-23-do-pedido-ao-pacote.md), plano-raiz que não se ativa: o caminho de ponta a ponta entre a mecatrônica e o Modelar, dos requisitos ao pacote de construção, em quatro planos filhos. O primeiro filho, [requisitos e caderno do objeto](2026-11-23-requisitos-e-caderno-do-objeto.md), pode ser ativado.
