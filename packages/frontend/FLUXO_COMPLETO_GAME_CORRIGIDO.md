# Fluxo Completo do Experimento - VERSÃO CORRIGIDA ✅

## Estrutura Geral
- **Total de tentativas:** 64 (sem divisão visível em rodadas)
- **Pausa:** Nenhuma (fluxo contínuo)
- **Navegação:** Botão X no topo esquerdo para voltar
- **Header fixo:** Presente em todas as telas com:
  - **Esquerda:** "Você" (moedas do participante)
  - **Centro (DESTAQUE):** "Cofrinho" (moedas acumuladas do grupo)
  - **Direita:** "Parceiro" (moedas do parceiro)

---

## HEADER (TODAS AS TELAS)

### Layout
```
[X]  Você: 10     🏦 COFRINHO: 15     Parceiro: 10
```

### Características:
- **Cofrinho centralizado e maior** (com `flex-1`)
- Sempre visível no topo
- Atualiza em tempo real

---

## TELA 1: DISTRIBUIÇÃO (distribute)

### Descrição
Tela principal onde o participante vê a divisão de moedas entre dois personagens. A tela tem dois estados: **não revelado** e **revelado**.

### Elementos Visuais

#### Estado Não Revelado (inicial)
- **Card principal:** 
  - Imagem dos dois personagens da dupla
  - Borda roxa (`#A560F8`) - **SEMPRE**
  
- **Painéis inferiores (2 colunas) - IGUAIS:**
  - **Painel Esquerdo (primeiro personagem):**
    - Se é o distribuidor: mostra 12 moedas
    - Se é o receptor: mostra 0 moedas
    - Cor de fundo: branco translúcido (`rgba(255,255,255,0.1)`)
    - Borda: branco translúcido (`rgba(255,255,255,0.3)`)
    - Nome em badge branco translúcido na base
  
  - **Painel Direito (segundo personagem):**
    - Se é o distribuidor: mostra 12 moedas
    - Se é o receptor: mostra 0 moedas
    - **MESMAS CORES** que o painel esquerdo
    - **IMPORTANTE:** Impossível identificar quem é o distribuidor antes de revelar

- **Botão:**
  - Texto: **"Ver moedas"**
  - Cor: verde (`#58CC02`)
  - Tamanho: `lg` (médio)

#### Estado Revelado (após clicar "Ver moedas")
- **Animação:**
  - As moedas se redistribuem entre os painéis com animação suave
  - **SEM** badge "Hora de dividir!"
  - **SEM** seta de direção
  - **SEM** indicação de quem distribui

- **Painéis após revelação:**
  - **Cores permanecem neutras** (branco translúcido)
  - Mostram quantidade final de moedas
  - **SEM** diferenciação por cor (verde/vermelho)

- **Botão:**
  - Texto: **"Continuar"**
  - Cor: azul (`#1CB0F6`)
  - Tamanho: `lg` (médio)

### O que FOI REMOVIDO:
- ❌ Badge "Lucas divide" com coroa
- ❌ Cores diferentes nos painéis antes do reveal (roxo para distribuidor)
- ❌ Borda do card mudando de cor (verde/vermelho)
- ❌ "Hora de dividir!" com emoji raio
- ❌ Seta de direção da divisão
- ❌ Callout "Divisão igual!" ou "Diferença de X moedas"

### Exemplos de Distribuição
- Um personagem ficou com 12 e outro com 0
- Um personagem ficou com 6 e outro com 6
- Um personagem ficou com 8 e outro com 4

---

## TELA 2: JULGAMENTO (justice)

### Descrição
Tela onde o participante julga se a distribuição foi justa.

### Elementos Visuais

- **Balão de pergunta:**
  - Fundo: branco
  - Borda: azul (`#1CB0F6`)
  - Texto: **"Foi justo?"**
  - Fonte: Nunito Black, tamanho 3xl, cor azul (`#1CB0F6`)
  - Possui "bico" apontando para baixo (SVG triangular)

- **Botões de resposta (2 colunas):**
  - **Botão "Sim":**
    - Cor: azul claro (`#1CB0F6`)
    - Texto: **"Sim"**
    - Tamanho: `lg`
  
  - **Botão "Não":**
    - Cor: azul escuro (`#0E7490`)
    - Texto: **"Não"**
    - Tamanho: `lg`

### O que FOI REMOVIDO:
- ❌ Card de contexto "Ana ficou com 6 e deu 6 para Beatriz"
- ❌ Texto longo "Você acha que essa distribuição foi justa ou injusta?"
- ❌ Botões "Justa" e "Injusta"

---

## TELA 3: PUNIÇÃO (punishment)

### Descrição
Após julgar, o participante decide se quer doar 1 moeda para punir o distribuidor (fazendo-o perder 3 moedas).

### Elementos Visuais

- **Card principal (DuoCard vermelho):**
  - Borda superior: vermelho (`#FF4B4B`)
  
  - **Pergunta:**
    - Texto: **"Doar 1 moeda sua para tirar 3 de [NOME]?"**
    - Fonte: Nunito Black, tamanho 2xl
    - Cor base: cinza escuro (`#3C3C3C`)
    - Nome do distribuidor em vermelho (`#FF4B4B`)
  
  - **Box de troca:**
    - Fundo: cinza claro (`#F7F7F7`)
    - Borda: cinza (`#E5E5E5`)
    - Dois sub-boxes lado a lado:
      - **"Você −1":** mostra 1 moeda
      - **"[NOME] −3":** mostra 3 moedas
    - Moedas flat amarelas (`#FFD900`)

- **Botões de resposta (2 colunas):**
  - **Botão "Não":**
    - Cor: vermelho (`#FF4B4B`)
    - Texto: **"Não"**
    - Tamanho: `lg`
  
  - **Botão "Sim":**
    - Cor: verde (`#58CC02`)
    - Texto: **"Sim"**
    - Tamanho: `lg`

### O que FOI REMOVIDO:
- ❌ Card de recap "Você disse que foi ✅ Justa / ❌ Injusta"
- ❌ Foto circular do distribuidor
- ❌ Nome destacado do distribuidor (removido avatar visual)
- ❌ Texto: "Você daria uma moeda para que..."
- ❌ Labels: "Você perde 1" / "Lucas perde 3"

---

## TELA 4: DOAÇÃO DA MOEDA (coin-donation)

### Descrição
Aparece apenas se o participante escolheu "Sim" na tela anterior. Mostra animação da moeda sendo doada.

### Elementos Visuais

- **Animação central:**
  - Moeda grande (80px) no centro
  - Animação: moeda sobe e desaparece (fade + escala + movimento Y)
  - Duração: 1 segundo

- **Texto:**
  - Aparece após 0.7s
  - **"Sua moeda foi doada…"**
  - Fonte: Nunito Black, tamanho 2xl
  - Cor: cinza escuro (`#3C3C3C`)

- **Indicador de loading:**
  - 3 bolinhas verdes saltando
  - Cor: verde (`#58CC02`)
  - Animação de bounce infinita

### Comportamento
- Após ~1.8s, sistema **simula decisão do parceiro** em background
- **Se parceiro também puniu** → vai para TELA 5 (Resultado)
- **Se parceiro NÃO puniu** → pula direto para próxima tentativa

---

## TELA 5: RESULTADO DA PUNIÇÃO (result)

### Descrição
Aparece apenas se **AMBOS** os participantes escolheram punir. Mostra que o distribuidor perdeu 3 moedas.

### Elementos Visuais

- **Título:**
  - **"Punição Aplicada"**
  - Fonte: Nunito Black, tamanho 3xl
  - Cor: vermelho (`#FF4B4B`)
  - Animação: pulsa 3 vezes (escala 1 → 1.08 → 1)

- **Card principal (DuoCard vermelho):**
  - Borda superior: vermelha (`#FF4B4B`)
  
  - **Nome do distribuidor:**
    - Topo do card
    - Texto: **"[NOME]"** (uppercase)
    - Fonte: Nunito Black, tamanho 2xl
    - Cor: cinza escuro (`#3C3C3C`)
  
  - **Box de perda:**
    - Fundo: vermelho claro (`#FFF0F0`)
    - Borda: vermelha (`#FF4B4B`)
    - Texto: **"−3"**
    - Tamanho: 3xl
    - Cor: vermelho (`#FF4B4B`)
    - Mostra pilha de 3 moedas
    - Animação: aparece com spring effect (escala 0 → 1)

- **Botão:**
  - Texto: **"Continuar"**
  - Cor: verde (`#58CC02`)
  - Tamanho: `lg`

### Efeitos Sonoros
- Som de punição toca após 400ms

### O que FOI REMOVIDO:
- ❌ Box explicativo "As moedas foram retiradas do total de [NOME]"
- ❌ Texto "−3 moedas" (agora só "−3")

---

## TELA 6: RECOMPENSA / CULTURANT (cc)

### Descrição
Aparece após a punição ser aplicada. Mostra que a dupla ganhou 3 moedas para o cofrinho.

### Elementos Visuais

- **Título:**
  - **"Vocês ganharam moedas"**
  - Fonte: Nunito Black, tamanho 3xl
  - Cor: verde (`#58CC02`)
  - Animação: rotaciona (0° → 4° → -4° → 0°), 3 repetições

- **Card principal (verde gigante):**
  - Fundo: verde (`#58CC02`)
  - Borda: verde escuro (`#46A302`)
  
  - **Ícone de troféu (topo):**
    - SVG flat branco
    - Tamanho: 72x72px
    - Animação: flutua (movimento Y)
  
  - **Texto principal:**
    - **"+3 Moedas"**
    - Fonte: Nunito Black, tamanho 5xl
    - Cor: branco
  
  - **Subtítulo:**
    - **"Essas moedas vão para o cofrinho do grupo!"**
    - Fonte: Nunito Bold
    - Cor: branco
  
  - **3 moedas flat:**
    - Alinhadas horizontalmente
    - Tamanho: 44px cada
    - Cor: amarelo (`#FFD900`)

- **Botão:**
  - Texto: **"Continuar"**
  - Cor: verde (`#58CC02`)
  - Tamanho: `lg`

### Efeitos
- Som de "culturant" toca após 500ms
- Contador do cofrinho no header aumenta em +3

---

## TELAS REMOVIDAS ❌

### TELA DE CONSENSO (removida)
**Por que foi removida:**
- Mostrava decisão do parceiro **antes/durante** a resposta
- Permitia que criança visse a decisão do outro
- Violava independência das decisões

### TELA DE PAUSA/BREAK (removida)
**Por que foi removida:**
- Indicava número da rodada ("Rodada 1 concluída!")
- Criava auto-monitoramento
- Interrompia fluxo natural

---

## Resumo do Fluxo por Tentativa

### Cenário 1: Criança NÃO pune
1. DISTRIBUIÇÃO → 2. JULGAMENTO → 3. PUNIÇÃO (Não) → **[próxima tentativa]**

### Cenário 2: Criança pune, parceiro NÃO
1. DISTRIBUIÇÃO → 2. JULGAMENTO → 3. PUNIÇÃO (Sim) → 4. DOAÇÃO → **[próxima tentativa]**

### Cenário 3: AMBOS punem
1. DISTRIBUIÇÃO → 2. JULGAMENTO → 3. PUNIÇÃO (Sim) → 4. DOAÇÃO → 5. RESULTADO → 6. RECOMPENSA → **[próxima tentativa]**

### Ao completar 64 tentativas:
- **Tela Final** (end)

---

## Paleta de Cores Utilizada

- **Verde (sucesso/neutro):** `#58CC02` (primário), `#46A302` (borda)
- **Azul (neutro/informação):** `#1CB0F6` (claro), `#0E7490` (escuro)
- **Vermelho (perigo/punição):** `#FF4B4B` (primário), `#EA2B2B` (borda)
- **Amarelo (moedas):** `#FFD900` (primário), `#CE9200` (borda)
- **Roxo (distribuidor/destaque):** `#A560F8` (primário), `#7C3AED` (borda)
- **Cinzas:** `#3C3C3C` (texto escuro), `#AFAFAF` (texto claro), `#F7F7F7` (fundo claro), `#E5E5E5` (borda)
- **Branco translúcido:** `rgba(255,255,255,0.1)` (fundo), `rgba(255,255,255,0.3)` (borda), `rgba(255,255,255,0.9)` (texto)

---

## Componentes de UI Customizados

- **DuoCard:** Card com borda colorida e faixa superior
- **GameButton:** Botões com variantes (primary, danger, blue, blue-dark), tamanho `lg`
- **FlatCoin:** Ícone de moeda flat (SVG)
- **MiniCoinStack:** Pilha de moedas animada
- **CoinCounter:** Contador de moedas do jogador
- **PartnerCoinCounter:** Contador de moedas do parceiro
- **PiggyBankCounter:** Contador do cofrinho (centralizado e maior)

---

## Fontes

- **Nunito Black:** Títulos, botões, números (font-black)
- **Nunito Bold:** Textos descritivos (font-bold)

---

## Animações

- **Motion (Framer Motion):** Todas as transições entre telas e elementos
- **Tipos de animação:**
  - Fade in/out (opacity)
  - Slide (x, y)
  - Scale (zoom)
  - Spring (efeito elástico)
  - Bounce infinito (loading)
  - Pulse (ênfase)

---

## Sons

- **Punição:** Toca ao entrar na tela de Resultado
- **Culturant/Recompensa:** Toca ao entrar na tela CC

---

## Princípios de Design

### 1. Simplicidade
- Textos curtos e diretos
- Botões tamanho médio (`lg`)
- Sem emojis desnecessários

### 2. Neutralidade
- Cores iguais nos painéis antes do reveal
- Sem indicadores do distribuidor
- Sem feedback interpretativo

### 3. Clareza Infantil
- Perguntas diretas: "Foi justo?" em vez de frases longas
- Botões intuitivos: "Sim"/"Não"

### 4. Fidelidade Experimental
- Decisões independentes (sem tela de consenso)
- Sem auto-monitoramento (sem indicação de rodadas)
- Sem indução (sem recap de respostas anteriores)

---

## Validação

- ✅ Criança consegue entender sem explicação externa
- ✅ Nenhum elemento indica "certo" ou "errado"
- ✅ Impossível identificar distribuidor antes do reveal
- ✅ Textos adequados para crianças (curtos e simples)
- ✅ Feedback visual/sonoro (sem texto interpretativo)
- ✅ Fluxo contínuo (sem pausas artificiais)
- ✅ Decisão do parceiro invisível ao jogador

