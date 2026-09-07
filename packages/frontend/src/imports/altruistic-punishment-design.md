Projete as telas do fluxo Criar Experimento para um sistema web de pesquisa comportamental (Altruistic Punishment Game). O objetivo é permitir que a pesquisadora configure o experimento, enquanto o sistema gera automaticamente blocos e tentativas. O design deve ser simples, claro e adequado a um TCC de Ciência da Computação.

Etapa 1 — Informações Gerais do Experimento

Tela de formulário com:

Nome do experimento

Descrição

Ordem das condições (seleção entre sequências pré-definidas: ABAC, ACAB, BCBC, CBCB)

Informação fixa: 64 tentativas totais (4 condições × 16 tentativas)

Texto explicativo: “As condições e estímulos são pré-definidos conforme o protocolo experimental.”

Botões: Cancelar | Salvar e continuar

Layout:

Formulário central

Sidebar ou stepper indicando progresso: 1. Informações gerais → 2. Configurar sessões

Etapa 2 — Configurar Sessões

Tela para definir como o experimento será executado.

Elementos:

Campo Número de sessões

Campo Número de duplas por sessão

Informação fixa: Cada sessão executará 64 tentativas

Campo opcional Observações da sessão

Visualizar:

Pequeno resumo gerado automaticamente:

Experimento
 └ Sessões
    └ Condições (A, B, C, D)
       └ 16 tentativas por condição

Botões:

Voltar

Salvar experimento

Tela de Confirmação

Após salvar:

Mensagem:
“Experimento criado com sucesso”

Exibir resumo:

Nome do experimento

Ordem das condições

Total de tentativas: 64

Sessões configuradas

Botões:

Cadastrar participantes

Ir para sessões

Diretrizes visuais

Estilo minimalista e acadêmico

Layout limpo com foco em formulários

Componentes baseados em Tailwind / shadcn UI

Tipografia clara e hierarquia bem definida

Usar stepper horizontal para mostrar progresso das etapas