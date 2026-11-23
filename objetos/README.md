# Objetos

Uma pasta por objeto simulado, com o nome que ele tem no Modelar. Cada uma guarda a ficha recebida pela [ponte](../ponte/README.md), o circuito do objeto, o programa, os cenários de simulação e o pedido que volta. O primeiro alvo é o braço robótico do Modelar, e depois o robô humanoide.

O caminho de um objeto começa pelos requisitos. O `caderno.json` de cada pasta diz em que etapa o objeto está (requisitos, componentes, forma, simulação e pacote), os arquivos que cada etapa produziu e quem aprovou o quê, com a frase da pessoa; o `requisitos.json` diz o que a pessoa quer do objeto, com a origem de cada valor. Os dois seguem os esquemas de [`tools/objetos/`](../tools/objetos/), e `npm run objetos:conferir`, que entra em `npm run gates`, confere toda pasta daqui: os dois arquivos, o nome da pasta igual ao objeto, os arquivos que o caderno cita e a presença do `requisitos.json`, que só pode faltar enquanto a etapa de requisitos está aberta. Os requisitos se levantam com a pessoa pela skill [`alinhar-requisitos`](../.claude/skills/alinhar-requisitos/SKILL.md), e a aprovação de uma etapa só se grava com a frase dela.

Hoje há uma pasta, [`braco-de-prova/`](braco-de-prova/), o braço de duas juntas dos exemplos da ponte, com o caderno e a etapa de requisitos aberta, à espera da rodada de prova com a pessoa.
