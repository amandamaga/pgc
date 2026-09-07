Redesenhe a tela de detalhe de experimento de um sistema web de pesquisa comportamental utilizado por pesquisadores para gerenciar sessões experimentais.

O objetivo da tela é permitir que o pesquisador:

visualize rapidamente o status do experimento

acompanhe sessões em execução

monitore o progresso das tentativas

entenda a estrutura do protocolo experimental

O sistema faz parte de um TCC de Ciência da Computação, portanto a interface deve ser clara, funcional e organizada, priorizando usabilidade e leitura rápida.

Utilizar estilo moderno baseado em Tailwind + shadcn UI.

Estrutura da tela
Cabeçalho do experimento

Mostrar:

nome do experimento

status (ativo/inativo)

data de criação

descrição do experimento

botão Editar experimento

Adicionar também um botão de ação principal:

+ Nova Sessão

Esse botão deve ser visualmente destacado.

Métricas do experimento

Exibir quatro cards informativos:

Sessões

Participantes

Tentativas

Condições

Os cards devem mostrar:

número em destaque

label menor

ícone simples

Evitar aparência de botão caso não sejam clicáveis.

Área principal — Sessões

Criar uma lista de sessões organizadas por estado:

Em execução

Agendadas

Finalizadas

Cada sessão deve mostrar:

Nome da sessão
Horário
Dupla de participantes

Exemplo:

Dupla: P001 — P002

Também mostrar:

Progresso da sessão

Exemplo:

Tentativa 23 de 64

Incluir uma barra de progresso visual.

Adicionar também a condição atual do experimento:

Condição atual: B

Cada sessão deve ter um botão de ação:

Acompanhar sessão (quando em execução)

Ver sessão (quando agendada ou finalizada)

Painel lateral — Resumo do protocolo

Adicionar um painel lateral com informações do experimento.

Conteúdo:

Sequência experimental

Exemplo:

A → B → A → C

Condições

4 condições (A, B, C, D)

Tentativas

64 tentativas totais
16 tentativas por condição

Estrutura da sessão

1 sessão = 1 dupla
2 participantes por sessão

Cartões de estímulo

Pré-configurados

Diretrizes de design

A interface deve:

priorizar leitura rápida

ter hierarquia clara de informação

facilitar monitoramento durante coleta de dados

usar layout limpo e espaçamento consistente

Evitar excesso de elementos visuais.

A barra de progresso e o status das sessões devem ser facilmente identificáveis.

Objetivo do redesign

A nova versão da tela deve:

melhorar o acompanhamento do experimento

facilitar o monitoramento das sessões

tornar o protocolo experimental mais claro

reduzir risco de erro durante a coleta de dados