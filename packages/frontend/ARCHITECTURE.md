# Arquitetura do Sistema - Dashboard de Pesquisa Comportamental

## 📋 Visão Geral

Sistema web completo para gerenciamento de experimentos de pesquisa comportamental, desenvolvido com React, TypeScript, shadcn/ui e Tailwind CSS. O sistema permite que pesquisadores acadêmicos configurem experimentos, gerenciem sessões e coletem dados de participantes através de uma interface de jogo interativa mobile-first.

**Stack Tecnológica:**
- React 18.3.1 com React Router 7.13.0
- TypeScript
- Tailwind CSS 4.1.12
- shadcn/ui (componentes baseados em Radix UI)
- Vite 6.3.5 (build tool)
- Motion (animações)
- QRCode.react (geração de QR codes)
- Recharts (visualização de dados)

---

## 🏗️ Estrutura de Pastas

```
/src
├── /app
│   ├── App.tsx                         # Componente raiz
│   ├── routes.tsx                      # Configuração de rotas
│   │
│   ├── /components                     # Componentes customizados
│   │   ├── badge.tsx                   # Badge de status
│   │   ├── button.tsx                  # Botão principal
│   │   ├── card.tsx                    # Card container
│   │   ├── empty-state.tsx             # Estado vazio genérico
│   │   ├── experiment-card.tsx         # Card de experimento
│   │   ├── experiment-progress.tsx     # Indicador de progresso
│   │   ├── experiments-table.tsx       # Tabela de experimentos
│   │   ├── search-filter-bar.tsx       # Barra de busca/filtro
│   │   │
│   │   ├── /game                       # Componentes do jogo
│   │   │   ├── coin-counter.tsx        # Contador de moedas
│   │   │   ├── game-button.tsx         # Botão do jogo (Duolingo-style)
│   │   │   ├── progress-indicator.tsx  # Indicador de progresso do jogo
│   │   │   └── stimulus-card.tsx       # Card de apresentação de estímulo
│   │   │
│   │   ├── /figma                      # Componentes especiais
│   │   │   └── ImageWithFallback.tsx   # (protegido)
│   │   │
│   │   └── /ui                         # Componentes shadcn/ui
│   │       ├── accordion.tsx
│   │       ├── alert-dialog.tsx
│   │       ├── alert.tsx
│   │       ├── aspect-ratio.tsx
│   │       ├── avatar.tsx
│   │       ├── badge.tsx
│   │       ├── breadcrumb.tsx
│   │       ├── button.tsx
│   │       ├── calendar.tsx
│   │       ├── card.tsx
│   │       ├── carousel.tsx
│   │       ├── chart.tsx
│   │       ├── checkbox.tsx
│   │       ├── collapsible.tsx
│   │       ├── command.tsx
│   │       ├── context-menu.tsx
│   │       ├── dialog.tsx
│   │       ├── drawer.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── form.tsx
│   │       ├── hover-card.tsx
│   │       ├── input-otp.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── menubar.tsx
│   │       ├── navigation-menu.tsx
│   │       ├── pagination.tsx
│   │       ├── popover.tsx
│   │       ├── progress.tsx
│   │       ├── radio-group.tsx
│   │       ├── resizable.tsx
│   │       ├── scroll-area.tsx
│   │       ├── select.tsx
│   │       ├── separator.tsx
│   │       ├── sheet.tsx
│   │       ├── sidebar.tsx
│   │       ├── skeleton.tsx
│   │       ├── slider.tsx
│   │       ├── sonner.tsx
│   │       ├── switch.tsx
│   │       ├── table.tsx
│   │       ├── tabs.tsx
│   │       ├── textarea.tsx
│   │       ├── toggle-group.tsx
│   │       ├── toggle.tsx
│   │       ├── tooltip.tsx
│   │       ├── use-mobile.ts
│   │       └── utils.ts
│   │
│   ├── /layouts                        # Layouts principais
│   │   ├── dashboard-layout.tsx        # Layout do dashboard (pesquisadores)
│   │   └── game-layout.tsx             # Layout do jogo (participantes)
│   │
│   ├── /pages                          # Páginas principais
│   │   ├── login.tsx                   # Autenticação
│   │   ├── register.tsx                # Registro
│   │   ├── dashboard.tsx               # Dashboard principal
│   │   ├── create-experiment.tsx       # Criação de experimento (etapa única)
│   │   ├── experiment-details.tsx     # Detalhes e visão geral do experimento
│   │   ├── sessions.tsx                # Gerenciamento de sessões
│   │
│   │   └── /game                       # Interface do participante
│   │       ├── waiting.tsx             # Tela de espera
│   │       ├── intro.tsx               # Introdução do jogo
│   │       ├── stimulus-presentation.tsx # Apresentação do estímulo
│   │       ├── decision.tsx            # Tomada de decisão
│   │       ├── game-round.tsx          # (deprecated - mantida para compatibilidade)
│   │       ├── feedback.tsx            # Feedback da decisão
│   │       └── end.tsx                 # Conclusão do experimento
│   │
│   └── /lib                            # Utilitários
│       └── utils.ts                    # Funções auxiliares (cn, etc)
│
├── /styles                             # Estilos globais
│   ├── index.css                       # Entry point de estilos
│   ├── tailwind.css                    # Base do Tailwind
│   ├── theme.css                       # Tokens de tema (cores, fontes)
│   ├── fonts.css                       # Imports de fontes
│   └── game-theme.css                  # Tema específico do jogo (Duolingo-style)
│
└── /imports                            # Documentação e referências
    ├── experiment-config-workflow-1.md
    ├── experiment-management-app.md
    ├── experiment-setup-ux.md
    ├── fairness-game-design.md
    └── trial-execution-flow.md
```

---

## 🎯 Arquitetura de Rotas

### Rotas de Autenticação
```
/login              - LoginPage
/register           - RegisterPage
```

### Rotas do Dashboard (Pesquisadores)
Todas sob o layout `DashboardLayout`:

```
/                                                    - DashboardPage
/experiments/new                                     - CreateExperimentPage
/experiments/:id                                     - ExperimentDetailsPage
/experiments/:id/sessions                            - SessionsPage
/experiments/:id/sessions/:sessionId/monitor         - SessionMonitorPage
```

### Rotas do Jogo (Participantes)
Todas sob o layout `GameLayout`:

```
/session/:sessionId/participant/:participantId       - GameIntroPage (índice)
/session/:sessionId/participant/:participantId/waiting               - GameWaitingPage
/session/:sessionId/participant/:participantId/stimulus              - StimulusPresentationPage
/session/:sessionId/participant/:participantId/decision              - DecisionPage
/session/:sessionId/participant/:participantId/game                  - GameRoundPage (deprecated)
/session/:sessionId/participant/:participantId/feedback              - GameFeedbackPage
/session/:sessionId/participant/:participantId/end                   - GameEndPage
```

### Rotas de Preview
Rotas espelhadas para pesquisadores testarem o jogo:

```
/game-preview                           - GameIntroPage
/game-preview/waiting                   - GameWaitingPage
/game-preview/stimulus                  - StimulusPresentationPage
/game-preview/decision                  - DecisionPage
/game-preview/game                      - GameRoundPage
/game-preview/feedback                  - GameFeedbackPage
/game-preview/end                       - GameEndPage
```

---

## 📊 Modelo de Dados

### Hierarquia Experimental

```
Experimento
├── Configuração
│   ├── Nome
│   ├── Descrição
│   └── Sequência de Condições (ex: ABAC)
│
├── Blocos de Condições (4 blocos: A, B, C, D)
│   └── 16 tentativas por bloco
│       └── 1 cartão de estímulo por tentativa
│       └── Total: 64 tentativas
│
├── Participantes (Participants)
│   └── Pool de participantes disponíveis
│
└── Sessões (Sessions)
    ├── 1 sessão = 1 dupla de participantes
    ├── Executa as 64 tentativas do experimento
    │
    └── Tentativas (Trials)
        ├── Session ID
        ├── Participant ID
        ├── Stimulus Card ID
        ├── Condition
        ├── Block Number
        ├── Trial Number (1-64)
        ├── Decision (Punir/Não Punir)
        ├── Reaction Time
        └── Timestamp
```

### Entidades Principais

**Experiment**
```typescript
{
  id: string;
  name: string;
  description: string;
  conditionSequence: "ABAC" | "ACAB" | "BCBC" | "CBCB"; // Sequência pré-definida
  status: "Rascunho" | "Ativo" | "Pausado" | "Concluído" | "Arquivado";
  totalTrials: 64; // Fixo para o MVP
  blocksPerCondition: 1; // Fixo
  trialsPerBlock: 16; // Fixo
  createdAt: string;
}
```

**Condition** (Pré-definidas: A, B, C, D)
```typescript
{
  id: string;
  code: "A" | "B" | "C" | "D";
  name: string;
  description: string;
  // Condições são criadas automaticamente quando o experimento é criado
}
```

**StimulusCard** (Pré-carregados no sistema)
```typescript
{
  id: string;
  conditionId: string; // Vinculado a uma condição
  trialNumber: number; // 1-16 dentro da condição
  characterA: {
    name: string;
    gender: "Masculino" | "Feminino" | "Outro";
    image: string; // URL da imagem
    coins: number; // moedas distribuídas
  };
  characterB: {
    name: string;
    gender: "Masculino" | "Feminino" | "Outro";
    image: string;
    coins: number;
  };
  situation: string; // descrição textual
  totalCoins: number; // total disponível (geralmente 10)
}
```

**Participant**
```typescript
{
  id: string;
  experimentId: string;
  name: string;
  email?: string;
  demographics?: {
    age?: number;
    gender?: string;
    // outros campos demográficos
  };
  createdAt: string;
}
```

**Session** (1 sessão = 1 dupla = EXATAMENTE 2 participantes)
```typescript
{
  id: string;
  experimentId: string;
  name: string;
  scheduledDate?: string; // ISO 8601
  startTime?: string; // Quando iniciou de fato
  endTime?: string;
  status: "Scheduled" | "Running" | "Completed" | "Cancelled";
  participant1: {  // ← OBRIGATÓRIO - Participante 1 da dupla
    id: string;
    name: string;
    status: "Waiting" | "Connected" | "Playing" | "Completed";
    currentTrial?: number; // 1-64
  };
  participant2: {  // ← OBRIGATÓRIO - Participante 2 da dupla
    id: string;
    name: string;
    status: "Waiting" | "Connected" | "Playing" | "Completed";
    currentTrial?: number; // 1-64
  };
  totalTrials: 64; // Herdado do experimento
}
```

**Trial** (Unidade fundamental de dados experimentais)
```typescript
{
  id: string;
  sessionId: string;
  experimentId: string;
  participantId: string; // Qual participante da dupla
  stimulusCardId: string;
  condition: "A" | "B" | "C" | "D";
  blockNumber: number; // 1-4 (qual bloco de condição)
  trialNumber: number; // 1-64 (número sequencial global)
  trialInBlock: number; // 1-16 (número dentro do bloco)
  decision: "Punir" | "Não Punir";
  reactionTime: number; // milissegundos
  timestamp: string; // ISO 8601
  // Campos opcionais para análise
  coinsBefore?: number;
  coinsAfter?: number;
}
```

---

## 🔄 Fluxos Principais

### 1. Fluxo de Configuração de Experimento (MVP Simplificado)

**Página:** `/experiments/new` (CreateExperimentPage)

**Filosofia do MVP:** Experimentos pré-configurados com 64 tentativas fixas (4 condições × 16 tentativas por condição). O sistema gera automaticamente blocos e tentativas conforme protocolo padrão de punição altruísta.

**Etapa Única - Informações do Experimento:**

**Campos:**
- Nome do experimento (obrigatório)
- Descrição (opcional)
- Sequência de condições (seleção obrigatória entre: ABAC, ACAB, BCBC, CBCB)

**Informações Exibidas:**
- Estrutura visual em árvore mostrando:
  - Experimento
    - Sequência escolhida
    - 4 blocos de condições
    - 16 tentativas por bloco
    - 1 cartão por tentativa
    - **Total: 64 tentativas**
- Banner informativo explicando o protocolo pré-definido
- Nota: "Cada sessão que você criar executará estas 64 tentativas com uma dupla de participantes"

**Confirmação:**
- Após salvar, exibe tela de sucesso com resumo completo
- Botões de ação:
  - "Cadastrar Participantes" → vai para `/experiments/:id/participants`
  - "Configurar Sessões" → vai para `/experiments/:id/sessions`

**Características do MVP:**
- ✅ Formulário simples de 1 etapa (sem stepper)
- ✅ Condições A, B, C, D pré-definidas no sistema
- ✅ Cartões de estímulo pré-carregados (64 cartões)
- ✅ Imagens padrão pré-definidas
- ✅ 64 tentativas fixas em todas as execuções
- ✅ Sessões configuradas posteriormente, uma por vez
- ✅ Cada sessão = 1 dupla de participantes

**Fluxo pós-criação:**
1. Experimento criado com estrutura completa (4 condições na sequência escolhida)
2. Pesquisador configura os 64 cartões de estímulo:
   - Condição A: 16 tentativas, cada uma associada a 1 cartão (Tentativa 1 → Cartão 1, Tentativa 2 → Cartão 2, etc.)
   - Condição B: 16 tentativas, cada uma associada a 1 cartão
   - Condição C: 16 tentativas, cada uma associada a 1 cartão
   - Condição D: 16 tentativas, cada uma associada a 1 cartão
   - Cada cartão possui 2 personagens (com imagens, gêneros e distribuição de moedas)
   - **Total: 64 tentativas = 64 cartões (relação 1:1)**
3. Pesquisador cadastra participantes no pool
4. Pesquisador cria sessões individuais:
   - Seleciona 2 participantes do pool (1 dupla)
   - Define data/hora (opcional)
   - Sessão herda as 64 tentativas (com seus cartões associados) do experimento

### 2. Fluxo de Criação de Sessão

**Página:** `/experiments/:id/sessions` (SessionsPage)

**Objetivo:** Configurar uma sessão para executar o experimento com uma dupla de participantes.

**Campos:**
- Nome/identificador da sessão (ex: "Sessão 1 - Manhã")
- Data e horário agendados (opcional)
- Seleção do Participante 1 (dropdown do pool)
- Seleção do Participante 2 (dropdown do pool)
- Observações (opcional)

**Características:**
- Cada sessão = exatamente 1 dupla
- Herda automaticamente as 64 tentativas do experimento
- Herda a sequência de condições do experimento
- Valida que os 2 participantes sejam diferentes
- Gera links/QR codes únicos para cada participante

**Após Criação:**
- Sessão fica com status "Scheduled"
- Disponível para monitoramento em `/experiments/:id/sessions/:sessionId/monitor`
- Pesquisador pode iniciar a sessão quando os participantes estiverem conectados

### 3. Fluxo de Detalhes do Experimento

**Página:** `/experiments/:id` (ExperimentDetailsPage)

**Interface Unificada e Adaptativa:**

**Estado Vazio (hasData = false):**
- Exibe wizard de configuração guiado
- Cards com CTAs para cada etapa:
  - Condições
  - Cartões de Estímulo
  - Participantes
  - Sessões
- Indicadores de progresso (0/0)
- Design minimalista e clean

**Estado Preenchido (hasData = true):**
- Header com informações do experimento
- Tabs para navegação entre seções
- Resumo de dados em cards
- Lista de sessões com status
- Botões de ação contextuais

### 4. Fluxo de Trial Execution (Participantes)

**Baseado em:** `/src/imports/trial-execution-flow.md`

**Sequência Completa:**

```
1. WAITING
   ├── Tela de espera inicial
   ├── Exibe informações da sessão/par
   ├── Aguarda início pelo pesquisador
   └── Sem ações disponíveis

2. STIMULUS PRESENTATION
   ├── Apresenta o cartão de estímulo
   ├── Mostra 2 personagens com imagens
   ├── Exibe distribuição de moedas
   ├── Indicador de round (Round X of N)
   ├── Barra de progresso
   ├── Timer opcional antes da decisão
   └── SEM botões de decisão (importante!)

3. DECISION
   ├── Mantém estímulo visível
   ├── Apresenta a pergunta: "Deseja punir o distribuidor?"
   ├── Botões grandes e claros:
   │   ├── Punir (cor primária)
   │   └── Não Punir (cor neutra)
   ├── Reaction Timer inicia quando botões aparecem
   ├── Contador de moedas permanece visível
   └── Ao clicar: registra Trial com todos os dados

4. FEEDBACK
   ├── Exibe resultado da decisão
   ├── Mostra atualização de moedas (se aplicável)
   ├── Delay curto (2-3s)
   ├── Botão: "Próxima Rodada"
   └── Se última rodada → vai para END

5. END
   ├── Mensagem de conclusão
   ├── Informações finais (rounds, moedas)
   ├── Agradecimento
   └── Botão: "Finalizar"
```

**Características Importantes:**

- **Separação clara:** Apresentação do estímulo e decisão são telas diferentes
- **Reaction Timer:** Mede tempo desde aparecimento dos botões até decisão
- **Dados de Trial:** Cada decisão gera um registro completo
- **UX Controlada:** Uma decisão por vez, sem distrações
- **Progressão Linear:** Não é possvel voltar ou pular etapas

### 5. Fluxo de Monitoramento de Sessão

**Página:** `/experiments/:id/sessions/:sessionId/monitor` (SessionMonitorPage)

**Funcionalidades:**

1. **Visualização de Pares**
   - Status de cada participante (Waiting/Connected/Completed)
   - Indicadores visuais de conexão
   - QR codes individuais para acesso

2. **Controle de Início**
   - Botão "Iniciar Sessão"
   - Envia sinal para todos participantes saírem da tela WAITING
   - Atualiza status da sessão para "Running"

3. **Geração de Links e QR Codes**
   - Link único por participante
   - Download de QR codes em PNG
   - Copiar link para clipboard
   - Formato: `/session/{sessionId}/participant/{participantId}`

4. **Monitoramento em Tempo Real**
   - Status de conexão
   - Progresso de cada par
   - (Futuro: progresso de trials em tempo real)

---

## 🎨 Design System

### Temas

**Dashboard (Pesquisadores):**
- Definido em: `/src/styles/theme.css`
- Estilo: Clean, minimalista, profissional
- Fundo: Branco
- Componentes: shadcn/ui padrão
- Tipografia: System fonts (Inter, SF Pro, Segoe UI)

**Game (Participantes):**
- Definido em: `/src/styles/game-theme.css`
- Estilo: Duolingo-inspired
- Cores vibrantes e amigáveis
- Botões com sombras e bordas grossas
- Animações suaves (Motion)
- Mobile-first e responsivo

### Tokens CSS Principais

```css
/* theme.css - Dashboard */
--background: hsl(0, 0%, 100%);
--foreground: hsl(222.2, 84%, 4.9%);
--primary: hsl(221.2, 83.2%, 53.3%);
--secondary: hsl(210, 40%, 96.1%);
--accent: hsl(210, 40%, 96.1%);
--destructive: hsl(0, 84.2%, 60.2%);
--border: hsl(214.3, 31.8%, 91.4%);
--radius: 0.5rem;

/* game-theme.css - Jogo */
--game-primary: hsl(142, 76%, 36%);
--game-secondary: hsl(204, 86%, 53%);
--game-accent: hsl(45, 100%, 51%);
--game-border: 4px;
--game-shadow: 0 4px 0 rgba(0,0,0,0.2);
```

### Componentes Principais

**Dashboard:**
- Badge: Status visual (Ativo, Rascunho, etc)
- Card: Container principal
- Button: Ações primárias/secundárias
- ExperimentCard: Card específico de experimento
- ExperimentsTable: Tabela responsiva
- EmptyState: Estado vazio consistente

**Jogo:**
- GameButton: Botão Duolingo-style com sombra
- CoinCounter: Contador de moedas animado
- ProgressIndicator: Barra de progresso do jogo
- StimulusCard: Card de apresentação com 2 personagens

---

## 🔧 Funcionalidades Implementadas

### ✅ Autenticação
- Login e registro
- (Mock - sem backend real)

### ✅ Dashboard de Experimentos
- Listagem de experimentos
- Filtros e busca
- Cards informativos
- Status badges
- Navegação para workspace

### ✅ Criação de Experimentos
- **MVP ultra-simplificado: 1 etapa única** (sem stepper)
- Formulário com 3 campos: nome, descrição, sequência de condições
- Sequências de condições pré-definidas (ABAC, ACAB, BCBC, CBCB)
- 64 tentativas fixas automaticamente (4 condições × 16 tentativas)
- Visualização em árvore da estrutura hierárquica
- Tela de confirmação com resumo completo
- Sessões configuradas posteriormente, uma por vez
- Cada sessão = 1 dupla de participantes

### ✅ Workspace Unificado
- Interface adaptativa (vazia vs. preenchida)
- Tabs para navegação
- Resumo de progresso
- Lista de sessões
- CTAs contextuais

### ✅ Gerenciamento de Condições
- CRUD completo
- Ordenação
- Associação com experimento

### ✅ Gerenciamento de Cartões de Estímulo
- Criação com 2 personagens obrigatórios
- Upload de imagens
- Gêneros independentes por personagem
- Distribuição de moedas
- Preview visual

### ✅ Gerenciamento de Participantes
- Cadastro individual/em lote
- Dados demográficos
- Associação com sessões

### ✅ Gerenciamento de Sessões
- Agendamento
- Criação de pares
- Status tracking
- Controle de horários

### ✅ Monitor de Sessão
- Visualização de pares
- QR codes individuais
- Links de acesso direto
- Controle de início de sessão
- Status em tempo real

### ✅ Interface do Jogo (Participantes)
- Tela de espera (waiting)
- Introdução
- **Apresentação de estímulo** (separada)
- **Tela de decisão** (separada)
- Reaction timer
- Feedback
- Tela de conclusão
- Design mobile-first
- Tema Duolingo-style

### ✅ Sistema de Trials
- Registro automático de tentativas
- Captura de todas as métricas:
  - Session ID
  - Pair ID
  - Stimulus Card ID
  - Round Number
  - Decision
  - Reaction Time
  - Timestamp
- Estrutura pronta para análise de dados

---

## 🚀 Próximos Passos Sugeridos

### Backend & Persistência
- [ ] Integração com Supabase
- [ ] Autenticação real
- [ ] Armazenamento de dados
- [ ] Real-time updates (WebSockets)

### Análise de Dados
- [ ] Dashboard de análise
- [ ] Exportação de dados (CSV, JSON)
- [ ] Visualizações (Recharts)
- [ ] Estatísticas descritivas

### Funcionalidades Avançadas
- [ ] Randomização de estímulos
- [ ] Contrabalanceamento automático
- [ ] Configuração de número de rounds
- [ ] Timer configurável por etapa
- [ ] Feedback customizável

### UX/UI
- [ ] Tutorial interativo
- [ ] Modo preview completo
- [ ] Testes de acessibilidade
- [ ] Suporte a idiomas

### Administração
- [ ] Gestão de usuários/pesquisadores
- [ ] Permissões e roles
- [ ] Auditoria de ações
- [ ] Backup e restore

---

## 📝 Notas Técnicas

### Componentes Protegidos
- `/src/app/components/figma/ImageWithFallback.tsx` - NÃO MODIFICAR
- `/pnpm-lock.yaml` - NÃO MODIFICAR

### Convenções de Código
- **Idioma:** Português (BR) em toda interface
- **Componentes:** PascalCase
- **Arquivos:** kebab-case.tsx
- **Tipos:** TypeScript strict mode
- **Estilos:** Tailwind classes inline
- **Importações:** Relative paths

### Tailwind CSS v4
- Sem arquivo `tailwind.config.js`
- Tokens definidos em CSS custom properties
- Base styles em `/src/styles/tailwind.css`
- Tema em `/src/styles/theme.css`

### Shadcn/ui
- Componentes em `/src/app/components/ui/`
- NÃO sobrescrever componentes existentes
- Importar com paths relativos
- Exemplo: `import { Button } from "./components/ui/button"`

### Bibliotecas Específicas

**Motion (animações):**
```typescript
import { motion } from "motion/react";
```

**Recharts (gráficos):**
```typescript
import { LineChart, Line, XAxis, YAxis } from "recharts";
```

**QRCode:**
```typescript
import { QRCodeSVG } from "qrcode.react";
```

### Performance
- Lazy loading de rotas (futuro)
- Memoização de componentes pesados
- Otimização de imagens
- Code splitting

---

## 📚 Documentação de Referência

Documentos importantes em `/src/imports/`:

- `trial-execution-flow.md` - Fluxo detalhado de execução de trials
- `fairness-game-design.md` - Design do jogo de justiça
- `experiment-config-workflow-1.md` - Workflow de configuração
- `experiment-setup-ux.md` - UX de setup
- `experiment-management-app.md` - Visão geral do sistema

---

## 🎓 Conceitos Experimentais

### Punição Altruísta
O sistema é projetado para experimentos de punição altruísta, onde participantes observam uma distribuição injusta de recursos e podem optar por punir o distribuidor, mesmo com custo para si próprios.

### Estrutura Experimental Clássica
- **Between-subjects:** Diferentes condições entre grupos
- **Within-subjects:** Mesmos participantes em várias condições
- **Repeated measures:** Múltiplas tentativas por participante
- **Paired design:** Participantes em duplas

### Métricas Coletadas
- **Reaction Time:** Tempo de resposta à decisão
- **Decision:** Binária (Punir/Não Punir)
- **Round Number:** Controle de ordem
- **Timestamp:** Rastreamento temporal preciso

---

## 🏁 Conclusão

Esta arquitetura fornece uma base sólida e escalável para pesquisa comportamental, com foco em:
- **Usabilidade** para pesquisadores
- **Experiência controlada** para participantes
- **Coleta rigorosa de dados**
- **Flexibilidade** para diferentes designs experimentais

O sistema está pronto para integração com backend e expansão de funcionalidades conforme necessidades específicas de pesquisa.

---

**Versão:** 1.4  
**Última Atualização:** 6 de março de 2026  
**Idioma:** Português (Brasil)  
**Mudanças v1.4:** Cartões de estímulo configuráveis - pesquisador deve criar os 64 cartões (16 por condição) após criar o experimento  
**Mudanças v1.3:** Refatoração completa para MVP - estrutura simplificada com protocolo pré-configurado implementado em todas as páginas  
**Mudanças v1.2:** Modelo simplificado - 1 sessão = 1 dupla; criação de experimento em 1 etapa única