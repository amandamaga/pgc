# Hierarquia Visual - Componentes do Jogo

## 🎮 Experiment Flow Vertical - Componente Principal

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXPERIMENT FLOW VERTICAL                     │
│                  (experiment-flow-vertical.tsx)                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐      ┌──────────────┐
│   HEADER     │    │  MAIN IMAGE  │      │   ACTIONS    │
│   (sticky)   │    │  + OVERLAYS  │      │   SECTION    │
└──────────────┘    └──────────────┘      └──────────────┘
        │                   │                      │
        │                   │                      │
   ┌────┴────┐         ┌────┴────┐          ┌─────┴─────┐
   │         │         │         │          │           │
   ▼         ▼         ▼         ▼          ▼           ▼
 VOCÊ    COFRINHO   DISTRIBUTE  JUSTICE  CULTURANT   BUTTONS
         GRUPO      OVERLAY     OVERLAY   SCREEN
  │         │          │           │         │
  │         │          │           │         │
  ▼         ▼          ▼           ▼         ▼
```

---

## 📦 Hierarquia Detalhada por Seção

### 1. HEADER (Sticky Top)

```
┌──────────────────────────────────────────────────────────┐
│                      STICKY HEADER                       │
│  <div className="sticky top-0 z-50 bg-white">           │
└──────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐      ┌──────────────┐
│ CoinCounter  │    │  PiggyBank   │      │  PartnerCoin │
│             │    │   Counter    │      │   Counter    │
│  Você: 10🪙  │    │  Grupo: 3🪙   │      │  Maria: 10🪙  │
└──────────────┘    └──────────────┘      └──────────────┘
        │                   │                      │
        ▼                   ▼                      ▼
  FlatCoin (×10)     FlatCoinSm (×3)        FlatCoin (×10)
   <svg>              <motion.div>           <svg>
```

**Arquivo:** `src/app/components/game/`
- `coin-counter.tsx` - Moedas do jogador
- `piggy-bank-counter.tsx` - Cofrinho (responsivo)
- `partner-coin-counter.tsx` - Moedas do parceiro

---

### 2. MAIN IMAGE + OVERLAYS

```
┌──────────────────────────────────────────────────────────┐
│                    IMAGE CONTAINER                       │
│        <div className="relative rounded-3xl">            │
│              height: 280px (compacto)                    │
└──────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
   ┌────────┐         ┌─────────────┐        ┌──────────┐
   │ <img>  │         │  OVERLAYS   │        │ AnimatePresence │
   │ Pair   │         │ (absolute)  │        │  <motion.div>   │
   │ Image  │         └─────────────┘        └──────────┘
   └────────┘                │
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ DISTRIBUTE   │    │ DISTRIBUTING │    │  JUSTICE     │
│  OVERLAY     │    │   OVERLAY    │    │  OVERLAY     │
└──────────────┘    └──────────────┘    └──────────────┘
        │                   │                    │
        ▼                   ▼                    ▼
 MiniCoinStack      Flying Coins         MiniCoinStack
 (Lucas/Miguel)     <motion.div>         (após divisão)
```

**Sub-componente:** `MiniCoinStack`
```
function MiniCoinStack({ count }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center px-2 py-1 rounded-lg">
        {Array.from({ length: count }, (_, i) => (
          <FlatCoin size={20} />
        ))}
      </div>
      <span>{count}</span>
    </div>
  );
}
```

---

### 3. ACTIONS SECTION (Abaixo da Imagem)

```
┌──────────────────────────────────────────────────────────┐
│                    ACTIONS SECTION                       │
│          <AnimatePresence mode="wait">                   │
└──────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐      ┌──────────────┐
│ DISTRIBUTE   │    │   JUSTICE    │      │  PUNISHMENT  │
│   BUTTON     │    │   QUESTION   │      │   QUESTION   │
└──────────────┘    └──────────────┘      └──────────────┘
        │                   │                      │
        ▼                   ▼                      ▼
  GameButton        Question Card          Question Card
 "Ver História"     + Status Cards        + Status Cards
                    + 2 Buttons           + 2 Buttons
```

**Componente de Pergunta (Justice/Punishment):**
```
┌──────────────────────────────────────────────┐
│           QUESTION CARD                      │
│  "Você acha que foi justa ou injusta?"       │
└──────────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│  STATUS CARD    │    │  STATUS CARD    │
│    (Você)       │    │    (Maria)      │
│  ● pensando...  │    │  ✓ JUSTA        │
└─────────────────┘    └─────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│  GameButton     │    │  GameButton     │
│     JUSTA       │    │    INJUSTA      │
└─────────────────┘    └─────────────────┘
```

---

### 4. CULTURANT SCREEN

```
┌──────────────────────────────────────────────────────────┐
│                   CULTURANT SCREEN                       │
│            (quando concordar + ambos punem)              │
└──────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐      ┌──────────────┐
│   TROPHY     │    │    TITLE     │      │   COINS      │
│    ICON      │    │  "Vocês      │      │   +3 🪙🪙🪙    │
│     🏆       │    │  ganharam!"  │      └──────────────┘
└──────────────┘    └──────────────┘              │
                                                  ▼
                                          <motion.div>
                                           animate scale
                                              │
                                              ▼
                                        GameButton
                                        "Continuar"
```

---

## 🎨 Componentes Reutilizáveis

### FlatCoin (Ícone SVG)

```
<svg width={size} height={size}>
  <circle cx="16" cy="16" r="14" fill="#FFD900" />
  <circle cx="16" cy="16" r="14" stroke="#CE9200" strokeWidth="2.5" />
  <circle cx="16" cy="16" r="10" fill="#F5C400" />
  <text x="16" y="21" fill="#CE9200">$</text>
</svg>
```

**Variações:**
- `FlatCoin` - Tamanho normal (20-24px)
- `FlatCoinSm` - Pequeno (12px)

---

### GameButton (Botão Estilizado)

```
<button className="rounded-2xl border-2 border-b-[5px] shadow-lg">
  {children}
</button>
```

**Variantes:**
- `primary` - Verde (#58CC02)
- `blue` - Azul (#1CB0F6)
- `blue-dark` - Azul escuro
- `danger` - Vermelho (#FF4B4B)

---

## 📊 Árvore de Estados (State Machine)

```
                    ┌─────────────┐
                    │  distribute │
                    └──────┬──────┘
                           │ onClick("Ver História")
                           ▼
                  ┌────────────────┐
                  │  distributing  │
                  └────────┬───────┘
                           │ auto (4s)
                           ▼
                    ┌─────────────┐
                    │   justice   │◄──┐
                    └──────┬──────┘   │
                           │ onClick  │
                           ▼          │
                  ┌────────────────┐  │
                  │  aguarda       │  │
                  │  parceiro      │  │
                  └────────┬───────┘  │
                           │          │
                           ▼          │
                   ┌────────────────┐ │
                   │  punishment    │ │
                   └────────┬───────┘ │
                            │ onClick │
                            ▼         │
                   ┌─────────────────┐│
                   │  aguarda        ││
                   │  parceiro       ││
                   └────────┬────────┘│
                            │         │
              ┌─────────────┴─────────┴──────┐
              │                              │
              ▼                              ▼
      ┌──────────────┐            ┌──────────────┐
      │  culturant   │            │  goNext()    │
      └──────┬───────┘            └──────┬───────┘
             │                           │
             └───────────┬───────────────┘
                         │
                         ▼
                  próxima tentativa
                  (round N+1)
```

---

## 🔄 Ciclo de Vida de 1 Tentativa

```
MOUNT
  │
  ▼
useState hooks inicializados
  │
  ├─ step: "distribute"
  ├─ revealed: false
  ├─ coins: 10
  ├─ piggyBank: 0
  ├─ judgment: null
  └─ partnerJudgment: null
  │
  ▼
RENDER "distribute"
  │
  ├─ Mostra imagem
  ├─ Mostra overlay com moedas iniciais
  └─ Mostra botão "Ver História"
  │
  ▼
USER CLICK "Ver História"
  │
  ▼
setStep("distributing")
  │
  ├─ RE-RENDER com animação
  ├─ setTimeout 1.5s → muda fase
  └─ setTimeout 4s → setStep("justice")
  │
  ▼
RENDER "justice"
  │
  ├─ Mostra overlay estático
  ├─ Mostra pergunta
  ├─ Mostra cards de status
  └─ Mostra botões
  │
  ▼
USER CLICK "Justa" ou "Injusta"
  │
  ├─ setJudgment(choice)
  ├─ setTimeout 1.8s → simula resposta parceiro
  └─ setTimeout 3.8s → setStep("punishment")
  │
  ▼
RENDER "punishment"
  │
  ├─ Similar ao justice
  └─ Botões: "Sim" / "Não"
  │
  ▼
USER CLICK "Sim" ou "Não"
  │
  ├─ setWantsToPunish(choice)
  ├─ setTimeout 1.8s → simula resposta parceiro
  └─ setTimeout 3.8s → verifica metacontingência
  │
  ▼
┌─────────────────────────────────┐
│  Concordar + Ambos Punem?       │
├─────────────────────────────────┤
│  SIM: setStep("culturant")      │
│  NÃO: goNext()                  │
└─────────────────────────────────┘
  │
  ▼
CULTURANT ou NEXT
  │
  ├─ playCulturantSound() (se culturant)
  ├─ setPiggyBank(p => p + 3) (se culturant)
  └─ navigate(round N+1)
  │
  ▼
UNMOUNT / REMOUNT (próxima tentativa)
```

---

## 📁 Estrutura de Importações

```
experiment-flow-vertical.tsx
│
├─ React hooks
│   ├─ useState
│   ├─ useEffect
│   └─ useNavigate, useParams, useSearchParams
│
├─ Components
│   ├─ GameButton
│   ├─ CoinCounter
│   ├─ PiggyBankCounter
│   ├─ PartnerCoinCounter
│   └─ ProgressIndicator
│
├─ Motion
│   ├─ motion
│   └─ AnimatePresence
│
├─ Hooks
│   └─ useGameSounds
│
└─ Assets (figma:asset)
    ├─ pair1.png
    ├─ pair2.png
    ├─ pair3.png
    └─ ... (8 pares)
```

---

**Criado em:** 2026-05-07  
**Versão:** 1.0
