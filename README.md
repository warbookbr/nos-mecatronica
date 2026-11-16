# nos-mecatronica

Simulação de ponta a ponta dos objetos do [Modelar](https://github.com/warbookbr/nos-modelar): um objeto modelado lá (um
braço robótico, um eletrodoméstico, um robô) ganha aqui as ligações elétricas, o circuito, o programa e a física, e a
simulação fecha o laço entre eles para achar os erros de projeto antes do teste prático.

Planos ativos: nenhum.

## Estrutura

```
docs/mecatronica/   índice, a matriz do que se simula, planos, decisões, guias e banco de provas
ponte/              o contrato com o Modelar: a ficha do objeto que chega e o pedido que volta
camadas/            ligacoes, eletrico, logico, fisico e laco: uma pasta por camada da simulação
componentes/        o modelo elétrico de cada componente, com o nome da família do Modelar
objetos/            um por objeto simulado, com o circuito, o programa e os cenários
tools/              as verificações (gates, planos, matriz, links)
```

## Como rodar

```bash
npm install
npm run gates
```

O conteúdo de origem deste trabalho em parte vem do [Eletrifica](https://github.com/brigsd/Eletrifica), do mesmo dono,
reescrito aqui; o que vier de lá é citado pelo arquivo de origem.
