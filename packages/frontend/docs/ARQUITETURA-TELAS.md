# Arquitetura de Telas - Sistema de Experimento de Punição Altruísta

## 🎯 Visão Geral

Sistema completo para experimentos de punição altruísta com crianças de 6-10 anos, composto por duas interfaces principais:

1. **Dashboard do Pesquisador** - Interface para gerenciar experimentos, participantes e sessões
2. **Interface do Jogo** - Experiência do participante durante o experimento

---

## 📂 Estrutura de Arquivos

```
src/app/
├── layouts/
│   ├── dashboard-layout.tsx          # Layout base do dashboard
│   └── game-layout.tsx                # Layout base do jogo
│
├── pages/
│   ├── login.tsx                      # Login do pesquisador
│   ├── register.tsx                   # Registro do pesquisador
│   ├── dashboard.tsx                  # Dashboard principal
│   ├── participants-global.tsx        # Gerenciamento de participantes
│   ├── create-experiment.tsx          # Criação de novo experimento
│   ├── experiment-details.tsx         # Detalhes do experimento
│   ├── sessions.tsx                   # Gerenciamento de sessões
│   ├── session-monitor.tsx            # Monitoramento de sessão em tempo real
│   │
│   └── game/
│       ├── intro.tsx                  # Tela de introdução do jogo
│       ├── waiting.tsx                # Aguardando parceiro
│       ├── experiment-flow-vertical.tsx  # Fluxo principal do experimento
│       └── end.tsx                    # Tela de finalização
│
├── components/
│   ├── game/
│   │   ├── coin-counter.tsx           # Contador de moedas do jogador
│   │   ├── partner-coin-counter.tsx   # Contador de moedas do parceiro
│   │   ├── piggy-bank-counter.tsx     # Contador do cofrinho do grupo
│   │   ├── progress-indicator.tsx     # Indicador de progresso
│   │   └── game-button.tsx            # Botão estilizado do jogo
│   │
│   ├── ui/                            # Componentes shadcn/ui
│   └── button.tsx                     # Botão genérico
│
├── routes.tsx                         # Definição de rotas
└── App.tsx                            # Componente raiz
```

---

## 🗺️ Mapa de Navegação

### Dashboard do Pesquisador

```
┌─────────────────────────────────────────────────────────────┐
│                      AUTENTICAÇÃO                           │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
         [/login]                        [/register]
      Login do Pesquisador            Registro de Conta
              │
              └──────────────┐
                             │
┌─────────────────────────────────────────────────────────────┐
│                    DASHBOARD PRINCIPAL                      │
└─────────────────────────────────────────────────────────────┘
                             │
                [/] Dashboard Home
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   [/participants]    [/experiments/new]    [Experimentos]
   Participantes      Criar Experimento      Existentes
   Globais                   │                    │
                             │                    │
                             └────────┬───────────┘
                                      │
                        [/experiments/:id]
                      Detalhes do Experimento
                                      │
                        [/experiments/:id/sessions]
                        Gerenciar Sessões
                                      │
              [/experiments/:id/sessions/:sessionId/monitor]
              Monitorar Sessão em Tempo Real
```

### Interface do Jogo (Participante)

```
┌─────────────────────────────────────────────────────────────┐
│              FLUXO DO PARTICIPANTE NO JOGO                  │
└─────────────────────────────────────────────────────────────┘

[/session/:sessionId/participant/:participantId]
                        │
                   📱 INTRO
                Bem-vindo ao Jogo
              - Vídeo tutorial (opcional)
              - Apresenta parceiro
              - Botão "COMEÇAR"
                        │
                        ▼
    [/session/:sessionId/participant/:participantId/waiting]
                        │
                  ⏳ WAITING
              Aguardando Parceiro
            - Mostra status dos 2 jogadores
            - Aguarda ambos clicarem "COMEÇAR"
                        │
                        ▼
[/session/:sessionId/participant/:participantId/flow-vertical?round=N]
                        │
            🎮 EXPERIMENT FLOW VERTICAL
                 (Loop 64 tentativas)
                        │
        ┌───────────────┴───────────────┐
        │                               │
   STEP 1: DISTRIBUTE              STEP 2: DISTRIBUTING
   - Mostra imagem do par          - Animação de divisão
   - Overlay com distribuição      - Moedas voando
   - Botão "Ver História"          - Badge "Hora de Dividir"
        │                               │
        └───────────────┬───────────────┘
                        ▼
                  STEP 3: JUSTICE
              "Foi justa ou injusta?"
            - Cards de status tempo real
            - Você: pensando/respondeu
            - Parceiro: pensando/respondeu
            - Botões: JUSTA / INJUSTA
                        │
                        ▼
                 STEP 4: PUNISHMENT
           "Você quer punir o distribuidor?"
          - Custo: 1 moeda sua, 3 do outro
          - Cards de status tempo real
          - Botões: SIM / NÃO
                        │
                        ▼
            ┌───────────┴───────────┐
            │                       │
       CULTURANT              Próxima Tentativa
   (Concordar + Ambos Punem)       │
    - Som de vitória                │
    - +3 moedas para grupo          │
    - Tela de celebração            │
            │                       │
            └───────────┬───────────┘
                        │
                Round 64 completo?
                        │
                   Sim  │  Não
                        │   └──> Volta para round N+1
                        ▼
    [/session/:sessionId/participant/:participantId/end]
                        │
                    🏁 END
                 Jogo Finalizado
              - Mostra moedas finais
              - Mensagem de conclusão
```

---

## 🎨 Componentes Reutilizáveis do Jogo

### Header Fixo (todas as telas de jogo)
```
┌────────────────────────────────────────────┐
│  [VOCÊ: 10🪙]  [GRUPO: 3🪙]  [MARIA: 10🪙] │
└────────────────────────────────────────────┘
```

**Componentes:**
- `CoinCounter` - Moedas do jogador
- `PiggyBankCounter` - Cofrinho do grupo (responsivo)
- `PartnerCoinCounter` - Moedas do parceiro

### Indicador de Progresso
```
Round 1 de 64  [████░░░░░░░░░░░░] 1.6%
```

**Componente:** `ProgressIndicator`

---

## 🔄 Estados e Transições

### ExperimentFlowVertical - Estados do Step

```typescript
type GameStep = 
  | "distribute"      // Mostra distribuição inicial
  | "distributing"    // Animação de divisão
  | "justice"         // Pergunta sobre justiça
  | "punishment"      // Pergunta sobre punição
  | "culturant";      // Tela de culturante alvo
```

### Fluxo de Decisão

```
distribute ──[Ver História]──> distributing ──[auto 4s]──> justice
                                                              │
justice ──[Escolhe Justa/Injusta]──> aguarda parceiro ──> punishment
                                                              │
punishment ──[Escolhe Sim/Não]──> aguarda parceiro ──┬──> culturant
                                                      │
                                                      └──> próxima tentativa
```

### Metacontingências

```
┌─────────────┬──────────┬────────────────────────────┐
│ Concordaram │ Ambosum  │ Resultado                  │
├─────────────┼──────────┼────────────────────────────┤
│     SIM     │   SIM    │ CULTURANT (+3 grupo)       │
│     SIM     │   NÃO    │ Próxima tentativa          │
│     NÃO     │   SIM    │ Próxima tentativa          │
│     NÃO     │   NÃO    │ Próxima tentativa          │
└─────────────┴──────────┴────────────────────────────┘
```

---

## 📊 Dados Mock

### Pares de Personagens (8 pares)

```typescript
const characterPairs = [
  { image: pair1, nameA: "Lucas", nameB: "Miguel" },
  { image: pair2, nameA: "Rafael", nameB: "Daniel" },
  { image: pair3, nameA: "Pedro", nameB: "Sofia" },
  { image: pair4, nameA: "João", nameB: "Felipe" },
  { image: pair5, nameA: "Ana", nameB: "Beatriz" },
  { image: pair6, nameA: "Julia", nameB: "Mariana" },
  { image: pair7, nameA: "Isabella", nameB: "Cecília" },
  { image: pair8, nameA: "Laura", nameB: "Amanda" },
];
```

### Rodadas de Distribuição (16 estímulos que se repetem)

```typescript
const mockRounds = [
  { id: 1, distributorSide: "A", coinA: 6, coinB: 6 },
  { id: 2, distributorSide: "B", coinA: 12, coinB: 0 },
  { id: 3, distributorSide: "A", coinA: 8, coinB: 4 },
  // ... 16 estímulos no total
];
```

**Total:** 64 tentativas (16 estímulos × 4 repetições)

---

## 🎯 Design System - Duolingo-Inspired

### Cores Principais

```css
--game-primary: #58CC02      /* Verde - Sucesso */
--game-info: #1CB0F6         /* Azul - Informação */
--game-danger: #FF4B4B       /* Vermelho - Punição */
--game-warning: #FFD900      /* Amarelo - Moedas */
--game-text-primary: #3C3C3C /* Texto escuro */
--game-text-secondary: #8B8B8B /* Texto secundário */
--game-bg: #F7F7F7           /* Fundo claro */
```

### Estilo de Bordas

```css
/* Flat Design com bordas bottom */
border: 2px solid color
border-bottom: 5px solid color  /* Efeito 3D sutil */
border-radius: 24px (xl) ou 16px (lg)
```

### Fontes

```css
font-family: 'Nunito', sans-serif
font-weight: 900 (Black) para títulos
font-weight: 700 (Bold) para texto
```

---

## 🚀 Próximos Passos (Produção)

### Backend Integration
- [ ] Supabase para banco de dados
- [ ] WebSocket para sincronização em tempo real
- [ ] API REST para CRUD de experimentos/participantes
- [ ] Autenticação de pesquisadores

### Recursos Faltantes
- [ ] Export de dados CSV/Excel
- [ ] Gráficos de análise de resultados
- [ ] Sistema de notificações em tempo real
- [ ] Backup automático de sessões

### Otimizações
- [ ] Lazy loading de imagens
- [ ] Service Worker para offline
- [ ] Compressão de assets
- [ ] Analytics de eventos

---

## 📱 Rotas Completas

### Dashboard (Pesquisador)
```
/login                                    - Login
/register                                 - Registro
/                                         - Dashboard Home
/participants                             - Lista de participantes
/experiments/new                          - Criar experimento
/experiments/:id                          - Detalhes do experimento
/experiments/:id/sessions                 - Gerenciar sessões
/experiments/:id/sessions/:sessionId/monitor - Monitorar sessão
```

### Game (Participante)
```
/session/:sessionId/participant/:participantId            - Intro
/session/:sessionId/participant/:participantId/waiting    - Waiting
/session/:sessionId/participant/:participantId/flow-vertical?round=N - Experimento
/session/:sessionId/participant/:participantId/end        - Fim

/game-preview                            - Preview (sem sessão)
/game-preview/waiting
/game-preview/flow-vertical?round=N
/game-preview/end
```

---

## 🎮 Exemplo de Fluxo Completo (1 Tentativa)

```
1. Participante vê imagem do par (Lucas e Miguel)
2. Overlay mostra: Lucas tem 12 moedas, Miguel tem 0
3. Participante clica "Ver História"
4. Animação: moedas voam de Lucas → Miguel
5. Resultado: Lucas 12, Miguel 0 (distribuição mantida)
6. Pergunta: "Foi justa ou injusta?"
7. Participante responde "INJUSTA"
8. Aguarda parceiro responder
9. Parceiro também responde "INJUSTA" (concordaram!)
10. Pergunta: "Você quer punir Lucas?"
11. Participante responde "SIM" (perde 1 moeda)
12. Aguarda parceiro responder
13. Parceiro também responde "SIM" (ambos punem!)
14. 🎉 CULTURANT! +3 moedas para o grupo
15. Tela de celebração com som de vitória
16. Avança para próxima tentativa (round 2)
```

---

**Última atualização:** 2026-05-07  
**Versão:** 1.0  
**Autor:** Sistema de Experimento de Punição Altruísta
