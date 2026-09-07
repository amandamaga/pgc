Crie o fluxo completo da experiência do participante em um experimento digital chamado Jogo da Punição Altruísta.

O sistema faz parte de um TCC de Ciência da Computação que implementa digitalmente um experimento comportamental baseado em uma tese acadêmica.

O objetivo é tornar a experiência:

clara para os participantes

agradável e motivadora

semelhante a um pequeno jogo

metodologicamente fiel ao experimento

A interface deve se inspirar em:

Duolingo

apps educacionais

jogos casuais mobile

Mas sem exagerar em estímulos que possam interferir nas decisões.

Estrutura do fluxo do participante

O jogo possui 64 rodadas (tentativas).

Em cada rodada o participante:

observa uma distribuição de moedas entre dois personagens

classifica se a distribuição é justa ou injusta

decide se quer punir o distribuidor

Cada rodada segue exatamente essa sequência.

Estilo visual

Inspirar-se em:

Duolingo

jogos educativos

interfaces gamificadas simples

Utilizar:

cores suaves

cards centralizados

progress bar

micro animações

ícones de moedas

personagens simples (cartoon minimalista)

A tela deve ter um foco central por rodada.

Tela 1 — Boas-vindas

Título:

Bem-vindo ao jogo!

Texto:

Neste jogo você verá personagens dividindo moedas.
Você poderá avaliar se a divisão foi justa e decidir se quer punir quem fez a distribuição.

Informação importante:

Você começa com 10 moedas.

Botão principal:

Começar

Estilo semelhante a uma tela inicial de jogo educativo.

Tela 2 — Explicação das regras

Explicar de forma simples:

um personagem distribui moedas

você observa a distribuição

você decide se ela é justa ou injusta

depois decide se quer punir quem fez a distribuição

Explicar o custo da punição:

Punir custa 1 moeda sua
e faz o distribuidor perder 3 moedas

Usar:

ícones de moedas

exemplos visuais

layout simples

Botão:

Entendi

Tela 3 — Rodada de exemplo (treino)

Mostrar uma distribuição simples.

Exemplo:

Personagem A: 5 moedas
Personagem B: 5 moedas

Pergunta:

Essa distribuição é justa ou injusta?

Após resposta, mostrar:

Agora você pode decidir se quer punir quem fez a distribuição.

Botões:

Punir
Não punir

Mensagem final:

Essa foi apenas uma rodada de exemplo.

Botão:

Começar o jogo

Tela principal das rodadas

Esta tela se repete durante o experimento.

Estrutura da tela:

Topo:

barra de progresso (Rodada X de 64)

contador de moedas do participante

Centro:

Card com os dois personagens.

Exemplo:

Personagem A
Personagem B

Um deles deve ser identificado como Distribuidor.

Mostrar a distribuição de moedas de forma visual.

Exemplo:

A recebeu 8 moedas
B recebeu 2 moedas

ou usando ícones de moedas.

Etapa 1 — Julgamento de justiça

Pergunta:

Essa distribuição é justa ou injusta?

Botões grandes:

Justa
Injusta

Após resposta, aparece a segunda pergunta.

Etapa 2 — Decisão de punição

Pergunta:

Você quer punir quem fez a distribuição?

Botões:

Punir (-1 moeda)
Não punir

Pequeno texto explicativo abaixo:

Punir custa 1 moeda sua e remove 3 moedas do distribuidor.

Tela de feedback da rodada

Após a decisão, mostrar feedback rápido.

Se punir:

Texto:

Você puniu o distribuidor.

Você perdeu 1 moeda.
O distribuidor perdeu 3 moedas.

Atualizar contador de moedas.

Tocar som curto negativo estilo game.

Se não punir:

Texto:

Você decidiu não punir.

Suas moedas permanecem as mesmas.

Som neutro ou levemente positivo.

Transição entre rodadas

Mostrar botão:

Próxima rodada

Adicionar pequena animação de transição.

Última rodada

Quando estiver na última tentativa, mostrar aviso:

Última rodada!

Tela final

Título:

Muito bem!

Texto:

Você completou o experimento.

Mostrar:

Moedas finais: X

Mensagem:

Obrigado por participar deste estudo.

Botão:

Finalizar

Elementos de gamificação

Adicionar elementos leves de jogo:

barra de progresso

contador de moedas

animações sutis

feedback visual

ícones de moedas

Inspirar-se em Duolingo, mas manter o foco no experimento.

Feedback sonoro

Adicionar sons discretos:

Punir → som negativo curto
Não punir → som neutro
Final do experimento → som positivo

Os sons devem ser opcionais e discretos.

Dados coletados pelo sistema

Cada tentativa deve registrar:

número da rodada

condição experimental

distribuição apresentada

julgamento de justiça (justa / injusta)

decisão de punição (punir / não punir)

tempo de decisão

O tempo de decisão deve ser registrado automaticamente e não exibido ao participante.

Objetivo do redesign

A nova experiência deve:

manter fidelidade ao experimento da tese

melhorar compreensão do participante

tornar o experimento mais envolvente

reduzir erros de interpretação

manter validade científica

Se quiser, eu também posso te mostrar um ajuste importante no fluxo que quase sempre aparece em bancas de TCC de sistemas experimentais: