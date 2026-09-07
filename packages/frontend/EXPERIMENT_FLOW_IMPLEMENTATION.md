# Implementação do Fluxo Experimental Completo

## 📋 Visão Geral

Este documento descreve a implementação completa do fluxo experimental de Punição Altruística seguindo rigorosamente o protocolo descrito no documento de especificação.

**✨ ATUALIZAÇÃO: Versão Tablet com Imagens Reais dos Personagens**

O fluxo agora utiliza as imagens reais dos personagens fornecidas pelos pesquisadores e está otimizado para tablets (não smartphones).

## 🎯 Fluxo Implementado

O experimento segue **exatamente** estas etapas em sequência:

### 1. **Step 01: Cards** - Exibição dos Cartões
- **Duração**: 2.5 segundos (automático)
- **Conteúdo**:
  - **NOVO**: Mostra imagem real da dupla de personagens (8 duplas disponíveis)
  - Exibe o número da rodada
  - Mostra os nomes dos personagens (Isabella, Cecília, Lucas, Miguel, etc.)
  - Mostra a quantidade de moedas de cada personagem com visual aprimorado
  - **Layout Tablet**: Card grande centralizado com imagem widescreen

### 2. **Distribute** - Momento "HORA DE DIVIDIR"
- **Duração**: 2.5 segundos (automático)
- **Conteúdo**:
  - Banner animado com gradiente amarelo/laranja/vermelho
  - Texto maior: "⏰ HORA DE DIVIDIR! ⏰" (texto 5xl)
  - Indica qual personagem está distribuindo (usa nome real)
  - Animação de pulsação suave contínua
  - **Layout Tablet**: Ocupação total da área central

### 3. **Step 02: Justice** - Pergunta de Justiça
- **Interativo**: Aguarda decisão da criança
- **Conteúdo**:
  - Resumo colorido da distribuição (fundo azul claro)
  - Pergunta em destaque: "Você acha que essa distribuição foi justa ou injusta?" (texto 3xl)
  - Botões grandes com emojis (otimizados para toque em tablet):
    - 🙂 **Justa** (verde) - emoji 6xl
    - 😟 **Injusta** (vermelho) - emoji 6xl
  - **Layout Tablet**: Botões py-12 (muito espaçosos)

### 4. **Step 03: Punishment** - Pergunta de Punição
- **Interativo**: Aguarda decisão da criança
- **Conteúdo**:
  - Mostra a decisão anterior
  - Pergunta com nome real do personagem
  - Representação visual ampliada: 🪙 (6xl) → 🪙🪙🪙 (6xl)
  - Botões grandes:
    - ❌ **Não** (texto 3xl)
    - ✅ **Sim** (texto 3xl)
  - **Layout Tablet**: Card p-10 com espaçamento generoso

### 5. **Coin Donation** - Animação da Moeda Saindo
- **Condicional**: Apenas se a criança escolheu punir
- **Duração**: 1.8 segundos (automático)
- **Conteúdo**:
  - Animação de moeda 🪙 (9xl) saindo para cima
  - Texto grande: "Sua moeda foi doada..." (3xl)
  - **Layout Tablet**: Animação mais longa e visível

### 6. **Step 04: Consensus** - Decisão em Dupla
- **Duração**: Aguarda clique no botão "Continuar"
- **Conteúdo**:
  - Título grande: "Decisão da Dupla" (4xl)
  - Mostra as duas decisões lado a lado (cards espaçosos p-6):
    - Você: SIM/NÃO (texto 4xl)
    - Seu parceiro: SIM/NÃO (texto 4xl)
  - Resultado do consenso em destaque (texto 2xl)
  - **Layout Tablet**: Avatares maiores (16x16), espaçamento amplo

### 7. **Step 05: Result** - Resultado da Punição
- **Condicional**: Apenas se ambos puniram
- **Duração**: Aguarda clique no botão "Continuar"
- **Conteúdo**:
  - Título: "⚠️ Punição Aplicada!" (4xl)
  - Nome do personagem punido (usa nome real, 3xl)
  - Animação de aparecer: "Perdeu 3 moedas 🪙🪙🪙" (3xl)
  - Toca som de punição
  - **Layout Tablet**: Card p-10 com borda grossa (border-4)

### 8. **Step 06: CC** - Consequência Cultural
- **Condicional**: Apenas após punição aplicada
- **Duração**: Aguarda clique no botão "Próxima Rodada"
- **Conteúdo**:
  - Título animado: "🎬 Consequência Cultural! 🎬" (5xl)
  - Banner verde gradiente (p-12)
  - Texto: "+3 Moedas" (4xl)
  - Ícone: 🎉 (8xl) + 🪙🪙🪙 (6xl)
  - Explicação ampliada
  - Toca som culturante
  - **Layout Tablet**: Cards grandes e vistosos

## 🎨 Personagens e Imagens Reais

### Duplas Disponíveis (8 pares)

1. **Lucas & Miguel** - Meninos (cabelos vermelho e azul)
2. **Rafael & Daniel** - Meninos (cabelos laranja e roxo)
3. **Pedro & Sofia** - Menino e menina (cabelos azul escuro e roxo)
4. **João & Felipe** - Meninos diversos (um negro, um asiático)
5. **Ana & Beatriz** - Meninas (cabelos preto e azul)
6. **Julia & Mariana** - Meninas (cabelos azul e rosa)
7. **Isabella & Cecília** - Meninas (cabelos roxo e preto)
8. **Laura & Amanda** - Meninas negras (cabelos longos)

### Sistema de Rotação

- Cada rodada usa uma dupla diferente baseada no `pairIndex`
- As imagens são importadas usando o sistema `figma:asset`
- Em produção, o sistema selecionará a dupla apropriada para cada tentativa

## 📱 Otimização para Tablet

### Design Responsivo

- **Target**: Tablets (iPad, Android tablets) - NÃO smartphones
- **Min-width recomendado**: 768px
- **Layout**: Centralizado com `max-w-4xl` (mais largo que mobile)
- **Padding**: `p-6 lg:p-8` (espaçamento generoso)
- **Background**: Gradiente suave `from-blue-50 to-purple-50`

### Tamanhos Aumentados

- **Textos**: 2xl a 5xl (vs xl a 2xl no mobile)
- **Emojis**: 6xl a 9xl (vs 2xl a 4xl no mobile)
- **Botões**: py-8 a py-12 (vs py-4 a py-6 no mobile)
- **Cards**: p-8 a p-12 (vs p-4 a p-6 no mobile)
- **Gaps**: gap-6 a gap-8 (vs gap-3 a gap-4 no mobile)
- **Avatares**: w-16 h-16 (vs w-12 h-12 no mobile)

### Elementos Visuais

- **Bordas**: border-4 (mais grossas)
- **Sombras**: shadow-2xl (mais pronunciadas)
- **Arredondamentos**: rounded-3xl (mais suaves)
- **Imagens**: Full width com aspect ratio preservado

## 🔄 Lógica de Fluxo

```
Rodada N
├── Cards (2.5s auto) → Mostra IMAGEM REAL da dupla
├── Distribute (2.5s auto) → Banner "HORA DE DIVIDIR"
├── Justice (input) → Botões grandes 🙂/😟
├── Punishment (input) → Botões grandes ❌/✅
│   ├── Se escolheu NÃO punir
│   │   └── → Consensus → Próxima Rodada
│   └── Se escolheu SIM punir
│       ├── → Coin Donation (1.8s auto)
│       └── → Consensus
│           ├── Se ambos SIM
│           │   ├── → Result (com som)
│           │   └── → CC (com som)
│           └── Se não há consenso
│               └── → Próxima Rodada
└── Rodada N+1
```

## 📊 Estado e Dados

### Personagens e Duplas

- `characterPairs`: Array com 8 duplas (imagem + nomes)
- `currentPair`: Dupla atual baseada em `pairIndex`
- `distributorName`: Nome do distribuidor (dinâmico)

### Progressão (inalterado)

- `currentRound`: Rodada atual (1-64)
- `totalRounds`: Total de rodadas (fixo: 64)

## 🎮 Navegação e Rotas

### Rota Principal
```
/session/:sessionId/participant/:participantId/flow?round=N
```

### Rota de Teste
```
/test-experiment
```
- Página de seleção entre novo fluxo e fluxo simplificado
- Acessível via banner no dashboard
- URL direta: `/test-experiment`

## 🧪 Como Testar

1. **Acesse o dashboard** → `/`
2. **Clique no banner azul/roxo** no topo
3. **Escolha "Iniciar Novo Fluxo"**
4. **Experimente todas as etapas**:
   - Observe a exibição automática dos cartões
   - Veja o momento "Hora de Dividir"
   - Faça um julgamento (Justa/Injusta)
   - Decida sobre punir (Sim/Não)
   - Se escolher punir, veja a animação da moeda
   - Observe a tela de consenso
   - Se houver consenso, veja resultado e CC

## ✅ Checklist de Conformidade

- [x] Fluxo segue exatamente o protocolo especificado
- [x] Todas as 8 etapas implementadas
- [x] Animações e transições suaves
- [x] Emojis nos botões de julgamento (🙂/😟)
- [x] Moedas visuais (🪙)
- [x] Momento "HORA DE DIVIDIR" destacado
- [x] Sistema de consenso (dupla)
- [x] Consequência Cultural (+3 moedas, 🎬)
- [x] Sons implementados (punição + culturante)
- [x] Interface colorida e amigável para crianças
- [x] Design lúdico e intuitivo
- [x] Feedbacks visuais claros
- [x] Responsivo (desktop + mobile)

## 🚀 Próximos Passos

1. **Integração com Backend**:
   - Conectar ao Supabase
   - Salvar decisões em tempo real
   - Sincronizar com parceiro real

2. **Dados Reais**:
   - Substituir mock data por API calls
   - Carregar estímulos do banco
   - Gerenciar estado compartilhado da dupla

3. **Coleta de Dados**:
   - Registrar tempo de reação
   - Salvar todas as decisões
   - Exportar para análise estatística

## 📝 Notas Importantes

- O sistema atual simula a decisão do parceiro (50% de chance)
- Em produção, será necessário sincronização real entre participantes
- Os sons estão implementados no hook `useGameSounds`
- O fluxo é totalmente baseado em estados React (sem backend por enquanto)
- Todas as transições usam Motion (Framer Motion)