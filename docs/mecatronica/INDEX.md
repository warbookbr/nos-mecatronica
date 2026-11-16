# Por onde começar

Este é o índice da documentação da Mecatrônica. Quem chega pela primeira vez lê o [contrato](../../CLAUDE.md), depois a [decisão que separa a forma da simulação](decisoes/0001-separacao-e-ponte.md) e o [contrato da ponte](../../ponte/README.md), que diz o que chega do Modelar e o que volta para ele.

O mapa do trabalho é a [matriz](MATRIZ.md): uma linha por capacidade que a simulação precisa ter, agrupada por camada, com quem a faz, o estado, como se prova e o que a simulação não substitui. A fonte é [`matriz.json`](matriz.json), e o `.md` é gerado dela por `npm run matriz:gerar`.

O trabalho anda por planos curtos, com as regras e a lista dos ativos no [índice de planos](planos/README.md), o [modelo](planos/MODELO.md) para escrever um plano novo e o [backlog](planos/BACKLOG.md) das ideias que ainda não viraram plano. As escolhas que continuam valendo ficam nas [decisões](decisoes/README.md). Os guias de uso moram em [`usar/`](usar/README.md) e as medidas de custo e de desempenho da simulação em [`banco-de-provas/`](banco-de-provas/README.md).

O código fica fora daqui: cada camada da simulação tem uma pasta em [`camadas/`](../../camadas/README.md), o modelo elétrico de cada componente em [`componentes/`](../../componentes/README.md), e cada objeto simulado, com o circuito, o programa e os cenários dele, em [`objetos/`](../../objetos/README.md).
