# Fluxo Completo do Experimento - Todas as Telas

## Estrutura Geral
- **Total de tentativas:** 64 (divididas em 4 rodadas de 16 tentativas cada)
- **Pausa:** Apenas ao final de cada rodada (após 16ª, 32ª, 48ª tentativa)
- **Navegação:** Botão X no topo esquerdo para voltar
- **Header fixo:** Presente em todas as telas com:
  - Contador "Você" (moedas do participante)
  - Contador "Parceiro" (moedas do parceiro)
  - Contador "Cofrinho" (moedas acumuladas do grupo)

---

## TELA 1: DISTRIBUIÇÃO (distribute)

### Descrição
Tela principal onde o participante vê a divisão de moedas feita por um personagem (distribuidor) para outro (receptor). A tela tem dois estados: **não revelado** e **revelado**.

### Elementos Visuais

#### Estado Não Revelado (inicial)
- **Card principal:** 
  - Imagem dos dois personagens da dupla
  - Borda roxa (`#A560F8`)
  
- **Badge no topo da imagem:**
  - Ícone de coroa (SVG flat branco)
  - Texto: **"[NOME DO DISTRIBUIDOR] divide"** (em caixa alta, branco, fonte Nunito Black)
  - Cor de fundo: roxo (`#A560F8`)
  - Borda: roxo escuro (`#7C3AED`)

- **Painéis inferiores (2 colunas):**
  - **Painel do Distribuidor:**
    - Mostra pilha completa de moedas (12 moedas)
    - Número abaixo: total de moedas
    - Cor de fundo: roxo translúcido (`rgba(165,96,248,0.18)`)
    - Borda: roxa (`#A560F8`)
    - Nome em badge roxo na base
  
  - **Painel do Receptor:**
    - Mostra 0 moedas (moeda opaca a 25%)
    - Número: 0
    - Cor de fundo: branco translúcido (`rgba(255,255,255,0.07)`)
    - Borda: branco translúcido (`rgba(255,255,255,0.18)`)
    - Nome em badge branco translúcido na base

- **Botão:**
  - Texto: **"Ver distribuição →"**
  - Cor: roxo primário (`#A560F8`)

#### Estado Revelado (após clicar "Ver distribuição")
- **Animações:**
  - Badge **"⚡ Hora de dividir!"** aparece acima dos painéis (roxo)
  - Seta circular no centro indicando direção da divisão (roxo com ícone de seta)
  - As moedas se redistribuem entre os painéis com animação

- **Painéis após revelação:**
  - **Se divisão igual (6-6):**
    - Ambos os painéis ficam verdes (`#58CC02`)
    - Borda do card principal fica verde
    
  - **Se divisão desigual:**
    - Painel do distribuidor: permanece roxo
    - Painel de quem recebeu mais: verde (`#58CC02`)
    - Painel de quem recebeu menos: vermelho (`#FF4B4B`)
    - Borda do card principal fica vermelha

- **Callout de diferença (aparece abaixo do card):**
  - **Se igual:**
    - Emoji: ⚖️
    - Texto: **"Divisão igual!"**
    - Fundo: verde claro (`#E8F5E9`)
    - Borda: verde escuro (`#46A302`)
    
  - **Se desigual:**
    - Emoji: ⚠️
    - Texto: **"Diferença de X moedas"** (onde X = diferença absoluta)
    - Fundo: vermelho claro (`#FFF0F0`)
    - Borda: vermelho (`#FF4B4B`)

- **Botão:**
  - Texto: **"O que você acha? →"**
  - Cor: azul (`#1CB0F6`)

### Exemplos de Distribuição
- Lucas ficou com 12 e deu 0 para Miguel
- Ana ficou com 6 e deu 6 para Beatriz
- Pedro ficou com 8 e deu 4 para Sofia

---

## TELA 2: JULGAMENTO (justice)

### Descrição
Tela onde o participante julga se a distribuição foi justa ou injusta.

### Elementos Visuais

- **Card de contexto (topo):**
  - Fundo: azul claro (`#E3F4FD`)
  - Borda: azul (`#1CB0F6`)
  - Texto: **"[DISTRIBUIDOR] ficou com [ICON MOEDA] X e deu [ICON MOEDA] Y para [RECEPTOR]."**
  - Exemplo: "Ana ficou com 🪙 6 e deu 🪙 6 para Beatriz."
  - Fonte: Nunito Bold, cor azul escuro (`#0E7490`)
  - Números dentro de tags inline com borda azul

- **Balão de pergunta:**
  - Fundo: branco
  - Borda: azul (`#1CB0F6`)
  - Texto: **"Você acha que essa distribuição foi justa ou injusta?"**
  - Fonte: Nunito Black, tamanho 2xl, cor azul (`#1CB0F6`)
  - Possui "bico" apontando para baixo (SVG triangular)

- **Botões de resposta (2 colunas):**
  - **Botão "Justa":**
    - Cor: azul claro (`#1CB0F6`)
    - Texto: **"Justa"** (sem emoji)
  
  - **Botão "Injusta":**
    - Cor: azul escuro (`#0E7490`)
    - Texto: **"Injusta"** (sem emoji)

---

## TELA 3: PUNIÇÃO (punishment)

### Descrição
Após julgar, o participante decide se quer doar 1 moeda para punir o distribuidor (fazendo-o perder 3 moedas).

### Elementos Visuais

- **Card de recap (topo):**
  - Mostra a decisão anterior
  - **Se julgou "Justa":**
    - Fundo: azul claro (`#E3F4FD`)
    - Borda: azul (`#1CB0F6`)
    - Texto: **"Você disse que foi ✅ Justa"**
  
  - **Se julgou "Injusta":**
    - Fundo: azul acinzentado (`#D1E7EE`)
    - Borda: azul escuro (`#0E7490`)
    - Texto: **"Você disse que foi ❌ Injusta"**

- **Card principal (DuoCard vermelho):**
  - Borda superior: vermelho (`#FF4B4B`)
  
  - **Foto do distribuidor:**
    - Círculo recortado da foto da dupla
    - Diâmetro: 80px
    - Borda: vermelha (`#FF4B4B`), 3px
    - Mostra o lado correto (20% ou 80% da imagem)
  
  - **Nome do distribuidor:**
    - Abaixo da foto
    - Cor: vermelho (`#FF4B4B`)
    - Fonte: Nunito Black, uppercase
  
  - **Pergunta:**
    - Texto: **"Você daria uma moeda para que [DISTRIBUIDOR] perca 3 moedas?"**
    - Fonte: Nunito Black, tamanho 2xl
    - Cor base: cinza escuro (`#3C3C3C`)
    - Nome do distribuidor em vermelho (`#FF4B4B`)
  
  - **Box de troca:**
    - Fundo: cinza claro (`#F7F7F7`)
    - Borda: cinza (`#E5E5E5`)
    - Dois sub-boxes lado a lado:
      - **"Você perde 1":** mostra 1 moeda
      - **"[DISTRIBUIDOR] perde 3":** mostra 3 moedas
    - Moedas flat amarelas (`#FFD900`)

- **Botões de resposta (2 colunas):**
  - **Botão "Não":**
    - Cor: vermelho (`#FF4B4B`)
    - Texto: **"Não"**
  
  - **Botão "Sim":**
    - Cor: verde (`#58CC02`)
    - Texto: **"Sim"**

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
- Após ~1.8s, avança automaticamente para a tela de Consenso

---

## TELA 5: CONSENSO (consensus)

### Descrição
Mostra a decisão do participante e do parceiro lado a lado.

### Elementos Visuais

- **Título:**
  - **"Decisão da Dupla"**
  - Fonte: Nunito Black, tamanho 3xl
  - Cor: cinza escuro (`#3C3C3C`)

- **Subtítulo:**
  - **"Veja o que cada um decidiu"**
  - Fonte: Nunito Bold
  - Cor: cinza (`#AFAFAF`)

- **Card principal (DuoCard roxo):**
  - Borda superior: roxa (`#A560F8`)
  
  - **Linha "Você":**
    - Avatar circular: fundo azul claro (`#E3F4FD`), borda azul (`#1CB0F6`)
    - Ícone de pessoa simplificado
    - Texto: **"Você"**
    - Badge de decisão:
      - **"SIM":** verde (`#58CC02`), borda verde escura (`#46A302`)
      - **"NÃO":** vermelho (`#FF4B4B`), borda vermelha (`#EA2B2B`)
    - Fundo da linha:
      - Se SIM: vermelho claro (`#FFF0F0`)
      - Se NÃO: verde claro (`#F0FFF4`)
  
  - **Linha "Parceiro":**
    - Avatar circular: fundo roxo claro (`#F3E8FF`), borda roxa (`#A560F8`)
    - Ícone de pessoa simplificado
    - Texto: **"Parceiro"**
    - Badge de decisão (mesmas cores que acima)
    - Fundo da linha (mesmas regras que acima)

- **Botão:**
  - Texto: **"Continuar →"**
  - Cor: verde (`#58CC02`)

### Lógica
- Se AMBOS disseram "SIM": avança para tela de Resultado (punição aplicada)
- Se pelo menos UM disse "NÃO": pula direto para próxima tentativa

---

## TELA 6: RESULTADO DA PUNIÇÃO (result)

### Descrição
Aparece apenas se ambos os participantes escolheram punir. Mostra que o distribuidor perdeu 3 moedas.

### Elementos Visuais

- **Título:**
  - **"Punição Aplicada!"**
  - Fonte: Nunito Black, tamanho 3xl
  - Cor: vermelho (`#FF4B4B`)
  - Animação: pulsa 3 vezes (escala 1 → 1.08 → 1)

- **Card principal (DuoCard vermelho):**
  - Borda superior: vermelha (`#FF4B4B`)
  
  - **Nome do distribuidor:**
    - Topo do card
    - Texto: **"[DISTRIBUIDOR]"** (uppercase)
    - Fonte: Nunito Black, tamanho 2xl
    - Cor: cinza escuro (`#3C3C3C`)
  
  - **Box de perda:**
    - Fundo: vermelho claro (`#FFF0F0`)
    - Borda: vermelha (`#FF4B4B`)
    - Texto: **"−3 moedas"** (uppercase)
    - Cor: vermelho (`#FF4B4B`)
    - Mostra pilha de 3 moedas
    - Animação: aparece com spring effect (escala 0 → 1)
  
  - **Explicação:**
    - Fundo: cinza claro (`#F7F7F7`)
    - Borda: cinza (`#E5E5E5`)
    - Texto: **"As moedas foram retiradas do total de [DISTRIBUIDOR]"**
    - Cor: cinza (`#AFAFAF`)

- **Botão:**
  - Texto: **"Continuar →"**
  - Cor: verde (`#58CC02`)

### Efeitos Sonoros
- Som de punição toca após 400ms

---

## TELA 7: CULTURANT / RECOMPENSA (cc)

### Descrição
Aparece após a punição ser aplicada. Mostra que a dupla ganhou 3 moedas para o cofrinho.

### Elementos Visuais

- **Título:**
  - **"Vocês ganharam moedas"** (sem emoji)
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
  - Texto: **"Continuar →"**
  - Cor: verde (`#58CC02`)

### Efeitos
- Som de "culturant" toca após 500ms
- Contador do cofrinho no header aumenta em +3

### Lógica Após Esta Tela
- Se ainda não completou 64 tentativas:
  - Se for fim de rodada (16ª, 32ª, 48ª): vai para tela de PAUSA
  - Se não: volta para TELA 1 (nova tentativa)
- Se completou 64 tentativas: vai para tela final

---

## TELA 8: PAUSA ENTRE RODADAS (break)

### Descrição
Aparece apenas ao final de cada rodada (após tentativas 16, 32 e 48).

### Elementos Visuais

- **Ilustração animada (topo):**
  - Figura em meditação (SVG flat)
  - Cor: roxo (`#A560F8`)
  - Borda: roxo escuro (`#7C3AED`)
  - Tamanho: 96x96px
  - Animação: flutua verticalmente (movimento Y infinito)

- **Card principal (DuoCard roxo):**
  - Borda superior: roxa (`#A560F8`)
  
  - **Título:**
    - **"Pausa para Respirar!"**
    - Fonte: Nunito Black, tamanho 3xl
    - Cor: roxo escuro (`#7C3AED`)
  
  - **Texto:**
    - **"Vocês foram ótimos! Respire fundo antes da próxima rodada."**
    - Fonte: Nunito Bold
    - Cor: cinza (`#6B7280`)
  
  - **Badge de conclusão:**
    - Fundo: roxo claro (`#F3E8FF`)
    - Borda: roxa (`#A560F8`)
    - Ícone: checkmark circular roxo (SVG)
    - Texto: **"Rodada X concluída!"** (onde X = número da rodada que acabou)
    - Cor do texto: roxo escuro (`#7C3AED`)
  
  - **Botão:**
    - Texto: **"Pronto! Próxima Rodada →"**
    - Cor: verde (`#58CC02`)
    - Tamanho: xl

### Comportamento
- Botão avança para primeira tentativa da próxima rodada
- Volta para TELA 1 (distribute)

---

## TELA FINAL: ENCERRAMENTO (end)

### Descrição
Aparece após completar as 64 tentativas (fim do experimento).

**Nota:** Esta tela está em outro arquivo (`/src/app/pages/game/end.tsx`) e não foi incluída neste documento. Para documentá-la, seria necessário ler esse arquivo.

---

## Resumo do Fluxo por Tentativa

### Cenário 1: Ninguém pune OU apenas 1 pune
1. DISTRIBUIÇÃO → 2. JULGAMENTO → 3. PUNIÇÃO → 5. CONSENSO → [próxima tentativa]

### Cenário 2: Ambos punem
1. DISTRIBUIÇÃO → 2. JULGAMENTO → 3. PUNIÇÃO → 4. DOAÇÃO → 5. CONSENSO → 6. RESULTADO → 7. RECOMPENSA → [próxima tentativa]

### Ao final de rodada (16ª, 32ª, 48ª tentativa):
- Após completar a tentativa → 8. PAUSA → [primeira tentativa da próxima rodada]

### Ao completar 64 tentativas:
- TELA FINAL (end)

---

## Paleta de Cores Utilizada

- **Verde (sucesso/justo):** `#58CC02` (primário), `#46A302` (borda)
- **Azul (neutro/informação):** `#1CB0F6` (claro), `#0E7490` (escuro)
- **Vermelho (perigo/injusto):** `#FF4B4B` (primário), `#EA2B2B` (borda)
- **Amarelo (moedas):** `#FFD900` (primário), `#CE9200` (borda)
- **Roxo (distribuidor/destaque):** `#A560F8` (primário), `#7C3AED` (borda)
- **Cinzas:** `#3C3C3C` (texto escuro), `#AFAFAF` (texto claro), `#F7F7F7` (fundo claro), `#E5E5E5` (borda)

---

## Componentes de UI Customizados

- **DuoCard:** Card com borda colorida e faixa superior
- **GameButton:** Botões com variantes (primary, danger, blue, blue-dark)
- **FlatCoin:** Ícone de moeda flat (SVG)
- **MiniCoinStack:** Pilha de moedas animada
- **DecisionBadge:** Badge "SIM"/"NÃO"
- **FlatFace:** Emoji de rosto flat (feliz/triste)

---

## Fontes

- **Nunito Black:** Títulos, botões, badges (font-black)
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

