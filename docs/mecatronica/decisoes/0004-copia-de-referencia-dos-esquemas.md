# 0004 — A cópia de referência dos esquemas da ponte mora aqui, e o Modelar confere a dele pelo SHA-256 da versão

Estado: em vigor.
Decidido em: 2026-11-16, na fatia 3 do [plano dos esquemas da ponte](../planos/concluidos/2026-11-16-esquemas-da-ponte.md).
Origem: o item do plano que pede a decisão de onde mora a cópia de referência dos esquemas.
Substitui: nada.

## O que ficou decidido

A cópia de referência dos esquemas da ponte, [`ficha.schema.json`](../../../ponte/esquemas/ficha.schema.json) e [`pedido.schema.json`](../../../ponte/esquemas/pedido.schema.json), mora neste repositório, em `ponte/esquemas/`. Só aqui um esquema muda, e só com a versão nova, pela regra de versão do [contrato da ponte](../../../ponte/README.md). A versão do contrato é uma só para os dois esquemas.

O arquivo [`ponte/esquemas/versoes.json`](../../../ponte/esquemas/versoes.json) lista cada versão do contrato com o SHA-256 dos dois esquemas como estavam quando ela saiu. O teste [`tools/ponte/versoes.test.mjs`](../../../tools/ponte/versoes.test.mjs), que roda em `npm run gates`, confere que a última versão da lista é a última que os dois esquemas aceitam e que o SHA-256 dela é o dos arquivos atuais; quem muda um esquema sem acrescentar a versão nova à lista é recusado. Os esquemas são gravados com fim de linha LF em qualquer sistema, pelo `.gitattributes` da pasta, para o SHA-256 não depender de quem fez o checkout.

O Modelar guarda uma cópia dos dois esquemas, byte a byte, com a versão que ela é e os dois SHA-256 dessa versão copiados de `versoes.json`, e o gate de lá confere que a cópia tem esses SHA-256. Onde mora a cópia e como o gate de lá se chama é do plano da ponte do Modelar. Para subir de versão, este repositório muda o esquema e registra a versão nova aqui primeiro, e o Modelar troca a cópia e os SHA-256 num commit dele depois; até lá ele continua na versão anterior, que o conferidor daqui segue aceitando pela regra de versão.

## Por quê

O esquema nasce das camadas da simulação, que são daqui, e o conferidor que lê os esquemas também é daqui; pôr a referência no mesmo repositório deixa o esquema, o conferidor e os exemplos mudarem num commit só, conferidos pelos mesmos gates. O Modelar precisa de uma cópia porque nenhum repositório lê o código do outro ([0001](0001-separacao-e-ponte.md)) e o CI de cada um roda sem o outro. O SHA-256 por versão dá ao Modelar com que conferir a cópia sem buscar este repositório, e o teste daqui impede o erro que a cópia não acharia sozinha: o esquema mudado aqui com o mesmo número de versão, que deixaria as duas cópias diferentes dizendo ser a mesma. Foram descartados a referência no Modelar, que separaria o esquema do conferidor que o lê, um terceiro repositório só para os esquemas, que é mais um lugar para manter para dois arquivos, e o submódulo do git, que faria o checkout de um depender do outro.

## O que não cobre

O teste daqui não sabe se a mudança é de versão menor ou maior; essa leitura é de quem muda o esquema. A conferência da cópia no Modelar não existe ainda e é do plano da ponte de lá. O SHA-256 de uma versão antiga não é reconferido, porque o arquivo dela já mudou; ele fica na lista para o Modelar que ainda não subiu de versão.

## Quando reabrir

Se o Modelar precisar mudar o esquema por conta própria, com mais frequência do que este repositório, ou se um terceiro repositório passar a ler a ficha ou o pedido.
