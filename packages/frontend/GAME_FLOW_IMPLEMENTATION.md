# Fluxo do Participante - Jogo de Punição Altruísta

## Implementação Completa

Este documento descreve o fluxo completo implementado para a experiência do participante no experimento de Punição Altruísta.

---

## 📋 Estrutura do Fluxo

### 1. **Boas-vindas** (`/intro`)
**Arquivo**: `/src/app/pages/game/intro.tsx`

- Título: "Bem-vindo ao jogo!"
- Explicação breve sobre o jogo
- Destaque: "Você começa com 10 moedas"
- Botão: "Começar"
- Design: Card centralizado com ícone de moedas

---

### 2. **Regras do Jogo** (`/rules`)
**Arquivo**: `/src/app/pages/game/rules.tsx`

- Três etapas explicadas visualmente:
  1. **Observe**: Personagem distribui moedas
  2. **Avalie**: Decide se é justa ou injusta
  3. **Decida**: Pode punir ou não punir
- **Destaque em vermelho**: Custo da punição
  - "Punir custa 1 moeda sua"
  - "Faz o distribuidor perder 3 moedas"
- Botão: "Entendi"

---

### 3. **Rodada de Treino** (`/training`)
**Arquivo**: `/src/app/pages/game/training.tsx`

- Badge no topo: "Rodada de Exemplo"
- **Etapa 1**: Apresenta distribuição igual (5-5)
  - Pergunta: "Essa distribuição é justa ou injusta?"
  - Botões: "Justa" / "Injusta"
- **Etapa 2**: Decisão de punição
  - Pergunta: "Você quer punir quem fez a distribuição?"
  - Botões: "Punir (-1 moeda)" / "Não Punir"
- **Etapa 3**: Confirmação
  - "Essa foi apenas uma rodada de exemplo"
  - Resume as escolhas do participante
  - Botão: "Começar o Jogo"

---

### 4. **Rodadas do Jogo** (`/game?round=X&coins=Y`)
**Arquivo**: `/src/app/pages/game/game-round.tsx`

#### Features:
- **Barra de progresso**: "Rodada X de 64"
- **Contador de moedas**: Exibido no canto superior direito
- **Alerta de última rodada**: Quando round === 64

#### Fluxo em 2 Etapas:

**Etapa 1 - Julgamento**:
- Apresenta os dois personagens
- Mostra quantidade de moedas de cada um
- Identifica quem é o "Distribuidor"
- Pergunta: "Essa distribuição é justa ou injusta?"
- Botões: "Justa" (verde) / "Injusta" (vermelho)

**Etapa 2 - Punição**:
- Feedback da etapa anterior
- Pergunta: "Você quer punir quem fez a distribuição?"
- Botões: "Punir (-1 moeda)" / "Não Punir"
- Texto helper: Explica o custo

---

### 5. **Feedback da Decisão** (`/feedback`)
**Arquivo**: `/src/app/pages/game/feedback.tsx`

- Mostra contador de moedas atualizado
- Ícone visual (TrendingDown para punir, Minus para não punir)
- **Se puniu**:
  - "Você puniu o distribuidor"
  - "Você perdeu 1 moeda"
  - "O distribuidor perdeu 3 moedas"
- **Se não puniu**:
  - "Você decidiu não punir"
  - "Suas moedas permanecem as mesmas"
- Botão: "Próxima Rodada" (ou "Ver Resultado Final" na última)
- **Delay**: 1.5 segundos antes de permitir continuar

---

### 6. **Tela Final** (`/end`)
**Arquivo**: `/src/app/pages/game/end.tsx`

- Ícone de troféu
- Título: "Muito bem!"
- Texto: "Você completou o experimento"
- **Destaque**: Moedas finais (grande e amarelo)
- Mensagem: "Obrigado por participar deste estudo"
- Botão: "Finalizar"
- Nota: "Você pode fechar esta página agora"

---

## 🎨 Elementos de Design

### Cores e Estilo
- **Inspiração**: Duolingo, apps educacionais, jogos casuais
- **Cores suaves**: Gradientes sutis, backgrounds limpos
- **Fonte**: Nunito (font-nunito)
- **Cards**: Rounded-3xl, sombras suaves
- **Botões**: Grande, arredondados, cores vivas

### Componentes Reutilizáveis
1. **GameButton**: Botões estilizados (primary, danger, success)
2. **CoinCounter**: Contador de moedas visual
3. **ProgressIndicator**: Barra de progresso das rodadas

### Variáveis CSS
```css
--game-primary: Azul principal
--game-danger: Vermelho (punição)
--game-success: Verde (justiça/sucesso)
--game-coin: Amarelo (moedas)
--game-bg: Background cinza claro
--game-text-primary: Texto principal
--game-text-secondary: Texto secundário
```

---

## 📊 Dados Coletados

Cada tentativa deve registrar:
- Número da rodada (1-64)
- Condição experimental (A, B, C, D)
- Distribuição apresentada (moedas A e B)
- Distribuidor (A ou B)
- **Julgamento**: "justa" ou "injusta"
- **Decisão**: "punir" ou "não punir"
- **Tempo de decisão**: Em milissegundos (implementado com useEffect)
- Moedas restantes

---

## 🔄 Fluxo de Navegação

```
/intro (Boas-vindas)
    ↓
/rules (Regras)
    ↓
/training (Treino)
    ↓
/game?round=1&coins=10 (Rodada 1)
    ↓ Etapa 1: Julgamento
    ↓ Etapa 2: Punição
    ↓
/feedback?round=1&judgment=just&punish=true&coins=9
    ↓
/game?round=2&coins=9 (Rodada 2)
    ↓
... (Repete até rodada 64)
    ↓
/end?coins=X (Tela Final)
```

---

## 🎯 Características Especiais

### Gamificação Leve
- ✅ Barra de progresso
- ✅ Contador de moedas
- ✅ Feedback visual imediato
- ✅ Ícones e emojis
- ✅ Animações sutis (bounce, transitions)
- ✅ Cards centralizados
- ✅ Delays estratégicos (1.5s no feedback)

### Fidelidade Experimental
- ✅ 64 tentativas fixas
- ✅ Duas etapas distintas (julgamento + punição)
- ✅ Rastreamento de tempo de decisão
- ✅ Feedback claro sobre consequências
- ✅ Rodada de treino antes do experimento real

### Acessibilidade e UX
- ✅ Instruções claras e progressivas
- ✅ Uma ação por tela
- ✅ Botões grandes e bem espaçados
- ✅ Feedback imediato
- ✅ Textos legíveis (tamanho adequado)
- ✅ Hierarquia visual clara

---

## 📱 Rotas Configuradas

### Rotas do Participante
```typescript
/session/:sessionId/participant/:participantId
  ├── / (intro)
  ├── /rules
  ├── /training
  ├── /game
  ├── /feedback
  └── /end
```

### Rotas de Preview (para pesquisadores testarem)
```typescript
/game-preview
  ├── / (intro)
  ├── /rules
  ├── /training
  ├── /game
  ├── /feedback
  └── /end
```

---

## ✨ Próximos Passos (Futuras Melhorias)

1. **Backend Integration**
   - Conectar com API real para buscar estímulos
   - Salvar dados das decisões em tempo real
   - Sincronizar com sistema de sessões

2. **Sons** (Opcional)
   - Som discreto ao punir
   - Som neutro ao não punir
   - Som positivo ao completar

3. **Animações Avançadas**
   - Transição de moedas com Motion
   - Animação do distribuidor
   - Efeitos de partículas ao completar

4. **Analytics**
   - Dashboard de tempo médio por decisão
   - Heatmap de distribuições mais punidas
   - Taxa de punição por condição

---

## 🎓 Observações para TCC

Este fluxo implementa fielmente o experimento de Punição Altruísta, mantendo:

1. **Validade científica**: Coleta todos os dados necessários
2. **Engajamento**: Interface amigável e motivadora
3. **Clareza**: Instruções progressivas e feedback constante
4. **Padronização**: Todos os participantes passam pelo mesmo fluxo
5. **Controle**: 64 tentativas fixas, sequências pré-definidas

O design foi pensado para reduzir erros de interpretação e tornar a experiência mais agradável, sem interferir nas decisões dos participantes.
