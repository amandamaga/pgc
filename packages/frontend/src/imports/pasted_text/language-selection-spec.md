Objetivo

Implementar um sistema de seleção e aplicação de idioma que:


Permite pesquisador selecionar idioma ao criar uma nova sessão
Garante que toda a interface e todos os dados sejam apresentados no idioma selecionado
Mantém rastreamento do idioma em todos os dados coletados
Facilita análise posterior dos dados por idioma


Requisitos Funcionais

1. Seleção de Idioma


Momento: Quando o pesquisador cria uma nova sessão
Opções disponíveis: Português (pt-BR), Norueguês (no-NO)
Armazenamento: Campo language na tabela/documento de sessão
Escopo: A escolha é FIXA para toda a sessão - não pode ser alterada depois
Padrão: Nenhum (pesquisador DEVE escolher explicitamente)


2. Interface no Idioma Correto

A seguinte interface deve aparecer no idioma selecionado:

2.1 Instruções Iniciais

Português: "Hei! Vamos jogar um jogo: você decide o que vai acontecer..."
Norueguês: "Hei! La oss spille et spill: du bestemmer hva som skal skje..."

2.2 Elementos dos Cartões

Português: "Justo" / "Injusto"
Norueguês: "Rettferdig" / "Urettferdig"

2.3 Questionário pré-experimento (Apêndice G)


Todas as questões traduzidas
Opções de resposta no idioma correto


2.4 Descrições de Sons

Português: "Som de vitória", "Som de perda"
Norueguês: "Vinnerlyd", "Taperlyd"

2.5 Etiquetas da Interface

Todos os rótulos, botões e mensagens no idioma selecionado

3. Rastreamento de Idioma nos Dados


Campo language deve ser herdado de session.language para todos os registros
Estrutura dos dados:


javascript{
  "session_id": "SESS_2025_001",
  "language": "pt-BR",  // ou "no-NO"
  "experiment_id": "EXP_2025_PUNALTR",
  "participants": ["P1", "P2"],
  "condition": "A",
  "location": "Universidade de Brasília",
  "created_at": "2025-03-14T10:00:00Z",
  "trials": [
    {
      "trial_number": 1,
      "distribution": "equal",
      "response": "fair",  // ou em portugu
      "language": "pt-BR",  // sempre herdado de session.language
      "timestamp": "2025-03-14T10:02:30Z"
    }
    // ... mais tentativas
  ]
}

4. Restrições


Uma língua por sessão: Não permitir mudança de idioma durante a sessão
Seleção obrigatória: Sistema não permite criar sessão sem selecionar idioma
Sem padrão implícito: Pesquisador deve escolher explicitamente (não há "idioma padrão")


Fluxo do Usuário (Pesquisador)

1. Pesquisador clica em "Nova Sessão"
   ↓
2. Formulário aparece com campos:
   - Nome da sessão
   - Data
   - Local
   - Participantes (IDs)
   - [CAMPO CRÍTICO] Idioma: [Português v] ou [Norueguês v]
   ↓
3. Pesquisador seleciona idioma
   ↓
4. Clica em "Criar Sessão"
   ↓
5. Sistema salva:
   - session_id: "SESS_2025_XXX"
   - language: "pt-BR" (ou "no-NO")
   - ...outros dados
   ↓
6. Interface de experimento carrega no idioma selecionado
   ↓
7. Participantes veem tudo em Português OU Norueguês
   ↓
8. Todos os dados coletados etiquetados com language: "pt-BR" (ou "no-NO")

Variações de Idioma

Português (pt-BR)


Código: pt-BR
Strings de instrução: Começam com "Hei! Vamos jogar..."
Cartões: Mostram "Justo" e "Injusto"
Questionário: Todas as questões em português (Apêndice G)
Sons: Descritos em português


Norueguês (no-NO)


Código: no-NO
Strings de instrução: Começam com "Hei! La oss spille..."
Cartões: Mostram "Rettferdig" e "Urettferdig"
Questionário: Todas as questões em norueguês (Apêndice G)
Sons: Descritos em norueguês


Estrutura de Dados Recomendada

Tabela/Coleção: sessions

{
  session_id (PK): string
  experiment_id (FK): string
  language: enum ["pt-BR", "no-NO"]  // REQUERIDO, sem padrão
  participant_ids: string[]
  location: string
  condition: enum ["A", "B", "C", "ABAC", "ACAB"]
  created_at: timestamp
  started_at: timestamp (nullable)
  ended_at: timestamp (nullable)
  status: enum ["created", "running", "completed", "abandoned"]
  metadata: {
    researcher_id: string,
    school_name: string,
    notes: string
  }
}

Tabela/Coleção: trial_responses

{
  response_id (PK): string
  session_id (FK): string
  language (inherited): enum ["pt-BR", "no-NO"]
  trial_number: integer
  participant_id: string
  distribution_type: enum ["equal", "unequal"]
  response: enum ["fair", "unfair"]  // ou em português/norueguês conforme needed
  timestamp: timestamp
}

Considerar para Análise Posterior


Todos os dados estarão etiquetados com o idioma coletado
Análises comparativas entre Brasil e Noruega podem agrupar por language
Possibilidade de futuras análises sobre efeito de idioma/cultura (se aplicável)
Auditoria: conseguir rastrear exatamente qual idioma foi usado em cada sessão


Padrão de Implementação Sugerido

Frontend (Seleção de Idioma)


Criar componente LanguageSelector com dois botões/radio buttons
Ambos visíveis e igualmente acessíveis (sem padrão pré-selecionado)
Mostrar labels em Português: "Português" / "Norueguês"
Armazenar seleção em estado do formulário antes de enviar


Backend (Criação de Sessão)


Validar que language está presente na requisição
Rejeitar se language for null/undefined/inválido
Salvar language junto com outros dados da sessão
Retornar language na resposta (confirmar ao frontend)


Frontend (Durante o Experimento)


Buscar session.language ao carregar a sessão
Usar um arquivo de tradução/localization baseado em session.language
Aplicar strings de UI, labels dos cartões, descrições
Garantir que quando participantes respondem, language é incluído nos dados


Backend (Armazenamento de Respostas)


Ao salvar trial response, incluir language copiado de session.language
Nunca permitir que language mude durante a sessão (validar em cada request)
Se houver tentativa de mudar idioma, logar como erro e rejeitar


Exemplo de Fluxo de Dados

Pesquisador seleciona: language = "no-NO"
                ↓
Backend salva: sessions[SESS_001].language = "no-NO"
                ↓
Frontend carrega experimento com i18n.load("no-NO")
                ↓
Interface renderiza:
  - Instruções: "Hei! La oss spille..."
  - Cartões: "Rettferdig" / "Urettferdig"
  - Botões: "Ja" / "Nei"
                ↓
Participante responde, Frontend envia:
  {
    session_id: "SESS_001",
    trial: 1,
    response: "rettferdig",
    language: "no-NO"  ← herdado
  }
                ↓
Backend armazena com language = "no-NO"
                ↓
Na análise: query por language="no-NO" retorna todos dados noruegueses

Testes Críticos


 Pesquisador consegue criar sessão com language = "pt-BR"
 Pesquisador consegue criar sessão com language = "no-NO"
 Sistema rejeita criação de sessão sem language selecionado
 Interface renderiza em português quando language = "pt-BR"
 Interface renderiza em norueguês quando language = "no-NO"
 Tentativa de mudar language durante sessão é bloqueada
 Todos os dados salvos incluem language correto
 Análise consegue filtrar dados por language


Notas de Implementação


Não usar cookie/localStorage para idioma: O idioma é propriedade da SESSÃO, não do usuário
Tradução centralizada: Usar arquivo de strings externo (JSON ou i18n library) ao invés de hardcoding
Validação em ambos os lados: Frontend valida, Backend valida também (nunca confiar no cliente)
Logging: Registrar qual idioma foi selecionado para cada sessão (auditoria)
Performance: Carregar strings de idioma uma única vez ao iniciar a sessão