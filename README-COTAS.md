# Cotas no visualizador OB

O botão **Mostrar cotas** fica no menu lateral, abaixo de **Apresentar aos clientes**. No celular, abra o menu de controles.

- Exibe **L** (largura), **C** (comprimento) e **H** (altura), em metros, com **uma casa decimal** (ex.: 4,5 m), inclusive na lista CSV.
- Filtros: prédios, paredes/pilares/mobiliário, vãos/acessos e equipamentos.
- O seletor alfabético enquadra um elemento e mostra suas três medidas.
- A visão geral mostra as cotas dos prédios; ao aproximar, surgem detalhes. Até seis elementos (três em telas estreitas) são cotados simultaneamente. Etiquetas maiores, com fundo escuro, são distribuídas na tela sem sobreposição e ligadas à cota por linhas. A seleção individual e o CSV dão acesso a todos os elementos.
- **Ocultar cotas** desliga as anotações. Também há um atalho sobre a imagem, inclusive no celular.
- **Baixar lista de cotas** salva o catálogo completo em CSV.

As medidas vêm da geometria do modelo. Os três envelopes de prédios são as dimensões nominais das paredes, sem cobertura ou placas solares. As alturas e os equipamentos continuam ilustrativos; isso não transforma a maquete em levantamento executivo. As cotas dos equipamentos seguem seus eixos locais e acompanham seu movimento, sem alterar os valores por causa da rotação.

As anotações participam da cena de visualização/PNG, mas ficam fora da geometria exportada em GLB. O HTML continua independente, sem scripts externos. Esta alteração preserva a implantação da REV11 publicada no repositório, incluindo os controles de movimentação das empilhadeiras.

## Manutenção

O repositório original contém um único HTML já empacotado. O código legível da função está em `dimensions.js`. Execute `node build-dimensions.mjs` após editá-lo para atualizar somente o bloco identificado dentro do HTML. A ferramenta verifica os pontos de integração antes de alterar o arquivo.

`verify-dimensions.mjs` verifica o pacote real da REV11, o catálogo de medidas, o controle de visibilidade, os filtros, o enquadramento, a exportação CSV e a invariância das medidas de uma empilhadeira em movimento. O teste usa uma simulação do DOM e não substitui inspeção visual em navegador. O caminho de `@napi-rs/canvas` no teste corresponde ao ambiente local de autoria e pode ser ajustado em outro computador.
