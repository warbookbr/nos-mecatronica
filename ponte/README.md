# Ponte com o Modelar

A ponte é o contrato de arquivos entre o Modelar, dono da forma, e este repositório, dono da simulação, como decidido em [0001](../docs/mecatronica/decisoes/0001-separacao-e-ponte.md). Ela tem dois arquivos por objeto: a ficha, que o Modelar exporta e este repositório lê, e o pedido, que este repositório escreve e o Modelar cumpre. Nenhum dos lados lê o código do outro; o que não estiver num dos dois arquivos não atravessa.

## A ficha do objeto

A ficha leva a geometria exportada do objeto montado, num formato de malha que os dois lados leem, com a unidade em milímetro e o referencial do Modelar. Leva a lista das peças, cada uma com o identificador estável que ela tem na receita, o nome da família de componentes quando a peça é um componente (motor, sensor, placa, fonte) e a posição e a orientação dela na montagem. Leva as portas elétricas de cada peça, cada uma com o identificador, a posição no referencial da peça e o tipo (alimentação, terra, sinal digital, sinal analógico, barramento, fase de motor), para a camada de ligações saber onde cada fio começa e termina. Leva os volumes livres, os espaços dentro do objeto que nenhuma peça ocupa e onde pode entrar placa, chicote ou ar. E leva a massa, o centro de massa e a inércia de cada peça e de cada conjunto móvel, com os eixos das juntas, para a camada física.

A ficha diz de onde veio cada valor: o que foi medido na geometria, o que foi declarado na receita e o que é estimativa, como a densidade de um material.

## O pedido que volta

O pedido lista o que a simulação precisa que a forma mude, peça por peça, citando cada uma pelo identificador da ficha. Ele pode pedir espaço (um volume mínimo para uma placa, um driver ou uma bateria, dentro de uma peça ou entre peças), posição (onde fica um componente ou um conector, com a tolerância aceita), passagem (o caminho de um chicote entre duas peças, com o diâmetro e o raio de curvatura mínimos, inclusive através de uma junta que gira) e saída de ar (a área e o lugar de uma abertura para tirar o calor que a camada elétrica calculou). Cada item diz por que é pedido, com a linha da [matriz](../docs/mecatronica/MATRIZ.md) e o resultado da simulação que o motivou.

O Modelar cumpre o pedido na receita da peça e confere o resultado com as réguas dele, e a ficha exportada de novo mostra se o pedido foi atendido. Pedido não cumprido volta com o motivo, e a simulação decide o que muda do lado dela.

## O que ainda falta

Os esquemas JSON da ficha e do pedido, com a versão do contrato e a conferência de cada campo, ficam para o primeiro plano da ponte.
