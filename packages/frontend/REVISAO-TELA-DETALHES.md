# Revisão da Tela de Detalhes do Experimento

## Mudanças Implementadas

### 1. Renomeação
- **Antes:** `experiment-workspace.tsx` → **Agora:** `experiment-details.tsx`
- **Motivo:** Nome mais descritivo e alinhado com sua função principal

### 2. Novo Layout

#### Header
```
[← Voltar]

Título do Experimento                    [✏️ Editar]
[Status Badge] Criado em X de março

Descrição do experimento...

┌─────────────────────────────────────────────────┐
│ ℹ️ Protocolo do Experimento                     │
│ Sequência: ABAC • Condições: 4 • Tentativas: 64│
│ Cartões pré-configurados pelo sistema          │
└─────────────────────────────────────────────────┘
```

#### Welcome Banner (apenas para novos experimentos)
```
┌─────────────────────────────────────────────────┐
│ ✨ Comece a Coletar Dados                       │
│ Crie sessões experimentais cadastrando duplas   │
│ [Criar Primeira Sessão]                         │
└─────────────────────────────────────────────────┘
```

#### Quick Stats (Grid 4 colunas)
```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ 📅 0     │ │ 👥 0     │ │ 📊 64    │ │ ⚙️ 4     │
│ Sessões  │ │ Partici. │ │ Tentativ.│ │ Condições│
│    [+]   │ │          │ │          │ │          │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

#### Main Content (Grid 2/3 + 1/3)

**Coluna Principal (2/3):**

**Estado Vazio:**
```
┌─────────────────────────────────────────────────┐
│ Como Executar                                   │
├─────────────────────────────────────────────────┤
│ ① Criar Sessão                                  │
│   Cadastre nome, data/horário e dupla           │
│                                                 │
│ ② Iniciar Sessão                                │
│   Gere QR codes para os participantes           │
│                                                 │
│ ③ Monitorar em Tempo Real                       │
│   Acompanhe o progresso da dupla                │
│                                                 │
│ [Criar Primeira Sessão]                         │
└─────────────────────────────────────────────────┘
```

**Com Dados:**
```
┌─────────────────────────────────────────────────┐
│ Sessões                           [+ Nova]      │
├─────────────────────────────────────────────────┤
│ 🟡 Em Execução                                  │
│ ┌─────────────────────────────────────────┐   │
│ │ Sessão 1 - Manhã         [Em Execução] │   │
│ │ 10 mar, 09:00                           │   │
│ │ 🟢 P001 • 🟢 P002                       │   │
│ │ Progresso: 23/64 ████░░░░ 36%          │   │
│ │                           [Monitorar]   │   │
│ └─────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│ 🔵 Agendadas                                    │
│ ┌─────────────────────────────────────────┐   │
│ │ Sessão 2 - Tarde            [Agendada]  │   │
│ │ 10 mar, 14:00                           │   │
│ │ ⚪ P003 • ⚪ P004                        │   │
│ │                               [Ver]      │   │
│ └─────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│ 🟢 Concluídas                                   │
│ ┌─────────────────────────────────────────┐   │
│ │ Estudo Piloto              [Concluída]  │   │
│ │ 05 mar, 10:00                           │   │
│ │ ⚪ P007 • ⚪ P008                        │   │
│ │ Progresso: 64/64 ████████ 100%         │   │
│ │                               [Ver]      │   │
│ └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

**Sidebar (1/3):**
```
┌─────────────────────────────┐
│ Resumo do Protocolo         │
├─────────────────────────────┤
│ SEQUÊNCIA                   │
│ ABAC                        │
│                             │
│ CONDIÇÕES                   │
│ 4 condições (A, B, C, D)    │
│ 16 tentativas cada          │
│                             │
│ TOTAL DE TENTATIVAS         │
│ 64 tentativas               │
│                             │
│ CARTÕES DE ESTÍMULO         │
│ ✓ Pré-configurados          │
│                             │
│ ESTRUTURA DA SESSÃO         │
│ 1 sessão = 1 dupla          │
│ 2 participantes por sessão  │
│                             │
│ [📅 Ver Todas as Sessões]   │
└─────────────────────────────┘
```

### 3. Melhorias Principais

#### Visual
- ✅ Layout em grid responsivo (1/3 colunas em desktop)
- ✅ Cards de estatísticas mais compactos e informativos
- ✅ Sidebar dedicada para resumo do protocolo
- ✅ Sessões organizadas por status com cores diferenciadas
- ✅ Indicadores visuais de progresso nas sessões

#### Funcional
- ✅ Acesso rápido aos botões de ação (+ Nova Sessão)
- ✅ Navegação clara entre sessões ativas e concluídas
- ✅ Informações do protocolo sempre visíveis
- ✅ Estado vazio com instruções claras
- ✅ Welcome banner contextual para novos experimentos

#### UX
- ✅ Menos clutter - removido wizard de etapas desnecessário
- ✅ Foco nas ações principais (Criar Sessão, Monitorar)
- ✅ Informações hierarquizadas por importância
- ✅ Feedback visual claro sobre status das sessões
- ✅ Progressão linear e intuitiva

### 4. Componentes Revisados

#### SessionRow
- Componente helper para renderizar linha de sessão
- Props incluem formatadores de data e status
- Exibe:
  - Nome e badge de status
  - Data/hora agendada
  - Códigos dos participantes com indicadores de conexão
  - Barra de progresso (quando aplicável)
  - Botão de ação contextual (Monitorar/Ver)

### 5. Responsividade

**Desktop (≥1024px):**
- Grid 2/3 + 1/3 (conteúdo principal + sidebar)
- Stats em 4 colunas
- Todas as informações visíveis

**Tablet (768-1023px):**
- Grid 1 coluna (sidebar após conteúdo)
- Stats em 4 colunas
- Layout vertical

**Mobile (<768px):**
- Grid 1 coluna
- Stats em 1 coluna
- Componentes empilhados

### 6. Estados da Interface

#### hasData = false (Novo Experimento)
- Welcome banner visível
- Stats mostrando 0
- "Como Executar" na área principal
- Sidebar com resumo do protocolo
- CTA: "Criar Primeira Sessão"

#### hasData = true (Com Sessões)
- Stats populados
- Lista de sessões categorizada
- Botão "+ Nova Sessão" no header
- Sidebar permanece igual

### 7. Cores e Status

**Status de Sessão:**
- 🟡 **Em Execução**: Fundo amber-50, borda amber-100
- 🔵 **Agendada**: Fundo blue-50, borda blue-100
- 🟢 **Concluída**: Fundo green-50, borda green-100

**Indicadores de Conexão:**
- 🟢 Verde: Conectado
- ⚪ Cinza: Aguardando/Desconectado

### 8. Navegação

**Rotas disponíveis:**
```
← Voltar                    → /
✏️ Editar                   → /experiments/:id/edit (futuro)
📅 Ver Todas as Sessões     → /experiments/:id/sessions
+ Nova Sessão               → /experiments/:id/sessions (com modal)
Monitorar                   → /experiments/:id/sessions/:sessionId/monitor
```

---

## Comparativo Antes/Depois

### Antes (experiment-workspace.tsx)
❌ Nome genérico "workspace"
❌ Tabs complexas
❌ Wizard de configuração com múltiplas etapas
❌ Stats de participantes como entidade separada
❌ Layout confuso com muitos elementos
❌ Informações espalhadas
❌ Difícil de entender o fluxo

### Depois (experiment-details.tsx)
✅ Nome descritivo "details"
✅ Layout limpo em grid
✅ Fluxo direto: Experimento → Sessões
✅ Stats contextualizados (participantes nas sessões)
✅ Organização visual clara
✅ Informações agrupadas logicamente
✅ Fluxo intuitivo e linear

---

## Resumo

A tela foi **completamente redesenhada** para refletir a nova hierarquia simplificada onde:
- Experimentos contêm apenas **Sessões**
- Cada sessão contém sua própria **Dupla de Participantes**
- Interface focada em **criação e monitoramento de sessões**
- Layout **limpo, organizado e responsivo**
- **Menos clutter, mais clareza**
