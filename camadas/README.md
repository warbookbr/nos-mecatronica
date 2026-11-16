# Camadas da simulação

Cada pasta aqui é uma camada da simulação, com o código, os testes e os dados dela. A camada lê o que a anterior produz e não conhece objeto específico: o que só serve a um objeto mora em `objetos/`. A cobertura de cada camada está na [matriz](../docs/mecatronica/MATRIZ.md).

- [`ligacoes/`](ligacoes/README.md): quem liga com quem.
- [`eletrico/`](eletrico/README.md): tensão, corrente e calor.
- [`logico/`](logico/README.md): o programa no microcontrolador emulado.
- [`fisico/`](fisico/README.md): forças, movimento e colisão.
- [`laco/`](laco/README.md): o programa, o circuito e a física rodando juntos.
