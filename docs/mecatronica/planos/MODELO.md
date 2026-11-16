# [ID] — resultado curto

**Estado:** rascunho

**Território:** a declarar ao ativar o plano: os caminhos que ele muda, entre crases e separados por vírgula (pasta terminada em `/` ou arquivo), ou `nenhum (aguarda aprovação)`. Dois planos ativos não podem ter territórios sobrepostos (regra no [índice de planos](README.md)).

**Responsável:** a definir

**Repositório e base:** a definir

## Problema observado

Descreva a evidência reproduzível e a consequência, apontando para o registro permanente em vez de copiar um relatório inteiro.

## Resultado

Uma frase verificável dizendo o que passa a ser possível, com as linhas da [matriz](../MATRIZ.md) que mudam de estado.

## Ferramentas externas

Se o plano traz um motor de simulação de terceiros (circuito, microcontrolador, física), diga qual, a versão, a licença e como é chamado como programa, e registre a escolha em `docs/mecatronica/decisoes/` antes de usá-lo. Diga também o que a simulação prova e o que é estimativa.

## Incluído

O que é estritamente necessário para o resultado, com a prova num objeto de teste geral e no objeto real só quando o resultado exigir.

## Excluído

As melhorias próximas que não bloqueiam o resultado e as refatorações sem relação com ele, que voltam ao backlog.

## Gate de saída

O comportamento mensurável, o determinismo da saída gerada, os testes proporcionais ao risco, as linhas da matriz atualizadas com a prova e o que não cobrem, e a documentação do que mudou.

## Fatias

A primeira fatia é o caso que falha ou a medida de partida; depois vem a menor implementação completa, a prova e a documentação, e por fim o fechamento.

## Riscos e parada

Declare o risco que obriga parar, cancelar ou redesenhar antes de ampliar o escopo.

## Fechamento

Preencha somente ao concluir ou cancelar: o estado final, o commit, os gates, o resultado observado e os candidatos devolvidos ao backlog.
