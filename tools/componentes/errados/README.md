# Arquivos errados do catálogo de componentes

Cada arquivo aqui é o motor [`motor-17hs4401.json`](../../../componentes/motor-17hs4401.json) do catálogo com uma só mudança que quebra uma regra, e ao lado dele está a recusa que `npm run componentes:conferir -- <arquivo>` tem de imprimir, byte a byte. O `npm run componentes:conferir` sem argumento confere todos eles, e o teste em [`../conferir.test.mjs`](../conferir.test.mjs) também. A recusa diz a versão do arquivo, o caminho JSON do campo, a regra e o valor recebido.

[`sem-fonte.componente.json`](sem-fonte.componente.json) tira a lista das fontes, e o componente fica sem dizer de onde vieram os números. [`numero-sem-origem.componente.json`](numero-sem-origem.componente.json) tira a origem do torque de retenção. [`curva-fora-de-ordem.componente.json`](curva-fora-de-ordem.componente.json) troca dois pontos da curva de torque, e a velocidade desce de 180 para 120 rpm.
