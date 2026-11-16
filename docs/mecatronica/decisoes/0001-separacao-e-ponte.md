# A forma é do Modelar, a simulação é daqui, e a ponte entre os dois é um contrato de arquivos

Estado: em vigor.
Decidido em: 2026-11-16.
Origem: a criação do repositório, no primeiro commit.
Substitui: nada.

## O que ficou decidido

O Modelar (`warbookbr/nos-modelar`) é o dono da forma: a geometria, as peças, a montagem e a aprovação visual da pessoa. Este repositório é o dono da simulação: as ligações elétricas, o circuito, o programa, a física e o laço fechado entre eles. Nenhum dos dois edita o que é do outro.

Os dois conversam só por arquivos, pelo contrato em [`ponte/`](../../../ponte/README.md). Do Modelar chega a ficha do objeto, com a geometria exportada, as peças com identificador, as portas elétricas com posição e tipo, os volumes livres, a massa e a inércia. Daqui volta o pedido, que cita cada peça pelo identificador da ficha e diz o que a simulação precisa dela: espaço, posição, passagem de chicote e saída de ar. O Modelar cumpre o pedido na receita da peça e confere o resultado com as réguas dele, e a ficha nova volta para cá.

Quem trabalha nos dois numa sessão só segue o mesmo fluxo, em ordem: exporta a ficha no Modelar, simula aqui, escreve o pedido aqui, cumpre e confere o pedido no Modelar, exporta a ficha de novo e simula outra vez. Cada repositório recebe o commit da sua parte e passa pelos gates dele, e nenhuma etapa pula o arquivo da ponte, mesmo quando a mesma sessão tem os dois abertos.

O ferramental é JavaScript sobre Node 22, com os gates em `tools/`, os testes em vitest e os formatos em JSON, do mesmo jeito que no Modelar. Os motores de simulação (circuito, microcontrolador emulado, física) entram como programas externos, chamados por linha de comando, com versão e licença declaradas aqui em `decisoes/`.

## Por quê

A forma e a simulação mudam por motivos diferentes e são aprovadas por réguas diferentes: a forma pela pessoa na bancada do Modelar, a simulação pela prova de cada linha da [matriz](../MATRIZ.md). Separar os repositórios impede que uma conveniência da simulação mude geometria sem passar pela aprovação de forma. O contrato de arquivos deixa a troca versionada, reexecutável e conferível pelos dois lados. JavaScript reaproveita o ferramental de gates, planos e documentos do Modelar e lê os formatos dele sem tradução, e o motor como programa externo evita copiar código de terceiros para dentro e permite trocá-lo sem reescrever as camadas.

## Quando reabrir

Se um motor de simulação necessário só existir como biblioteca, sem forma de ser chamado como programa, ou se a ficha exportada precisar de um dado que o Modelar não consegue produzir sem conhecer a simulação.
