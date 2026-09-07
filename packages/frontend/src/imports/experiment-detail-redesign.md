Redesenhe a tela Detalhe do Experimento de um sistema web de pesquisa comportamental utilizado por pesquisadores para gerenciar sessões experimentais.

O objetivo é melhorar dois aspectos de usabilidade:

reduzir o peso visual do Resumo do Protocolo

tornar a lista de sessões mais escalável e fácil de acompanhar

O sistema faz parte de um TCC de Ciência da Computação, portanto a interface deve ser clara, funcional e focada em acompanhamento de experimento.

Utilizar estilo baseado em Tailwind + shadcn/ui.

1️⃣ Ajuste do resumo do protocolo

Atualmente o resumo do protocolo ocupa um painel lateral grande.
Isso deve ser reduzido.

Mover as principais informações do protocolo para uma linha compacta abaixo do título do experimento.

Exemplo:

Estudo de Punição Altruísta
Ativo • Criado em 1 mar 2026

Protocolo: A → B → A → C
4 condições • 64 tentativas • 16 por condição

Adicionar um botão discreto:

Ver protocolo completo

Esse botão abre um modal ou drawer com:

Sequência experimental
Condições
Tentativas por condição
Estrutura da sessão
Informação sobre cartões de estímulo

O objetivo é manter a página de acompanhamento mais limpa.

2️⃣ Melhorar a lista de sessões

A lista atual usa cards grandes para todas as sessões.
Isso não escala bem quando existem muitas sessões.

Redesenhar a seção Sessões usando dois tipos de visualização:

Sessão em execução

Manter um card detalhado para sessões em execução.

Mostrar:

Nome da sessão
Horário
Dupla de participantes

Exemplo:

Dupla: P001 — P002

Condição atual do experimento:

Condição atual: B

Progresso da sessão:

Tentativa 23 de 64

Exibir uma barra de progresso.

Adicionar botão principal:

Acompanhar sessão

Sessões agendadas

Exibir em lista compacta, não em card.

Cada linha deve mostrar:

Nome da sessão
Horário
Participantes
Status
Botão de ação

Exemplo:

Sessão 2 – Tarde
10 mar • 14:00
P003 — P004
Status: Agendada
Botão: Ver

Sessões finalizadas

Exibir também em lista compacta.

Mostrar:

Nome da sessão
Participantes
Status concluído
Indicador visual de sessão finalizada.

3️⃣ Hierarquia visual da página

Estrutura final da tela:

1️⃣ Cabeçalho do experimento
2️⃣ Métricas do experimento (sessões, participantes, tentativas, condições)
3️⃣ Linha compacta com resumo do protocolo
4️⃣ Lista de sessões

4️⃣ Objetivo do redesign

A nova versão deve:

melhorar o acompanhamento de sessões

reduzir ruído visual

facilitar o monitoramento durante coleta de dados

tornar a tela escalável quando houver muitas sessões

Evitar excesso de elementos visuais e priorizar leitura rápida.