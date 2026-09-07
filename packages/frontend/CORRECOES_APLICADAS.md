# Correções Aplicadas ao Fluxo do Experimento

## ✅ MUDANÇAS CRÍTICAS REALIZADAS

### 1. **Fluxo Simplificado**
- ❌ **REMOVIDO:** Tela de "Consenso" (mostrava decisão do parceiro antes da resposta)
- ❌ **REMOVIDO:** Tela de "Pausa/Break" entre rodadas
- ✅ **APLICADO:** Fluxo contínuo sem interrupções artificiais

### 2. **Tela de Distribuição - CORREÇÕES NECESSÁRIAS**
⚠️ **AINDA PRECISA SER CORRIGIDO NO CÓDIGO:**

#### Remover elementos que indicam o distribuidor:
- ❌ **Badge "Lucas divide"** - revela quem é o distribuidor (linha 434-436)
- ❌ **Coroa no badge** - ícone associado ao distribuidor (linha 430-433)
- ❌ **Cores diferentes nos painéis antes do reveal** - painel roxo indica distribuidor (linhas 520-554)
  - Antes do reveal: ambos os painéis devem ter a mesma aparência
  - Apenas APÓS revelar: moedas se redistribuem

#### Remover feedback interpretativo:
- ❌ **"Hora de dividir!"** com emoji (linhas 449-475)
- ❌ **Seta de direção** da divisão (linhas 477-513) - indica quem distribui
- ❌ **Callout "Divisão igual!"** ou **"Diferença de X moedas"** (linhas 608-626)
  - Esse callout interpreta a distribuição como justa/injusta

#### Como deve ficar:
✅ **Estado Não Revelado:**
- Card com imagem dos personagens
- Painéis IGUAIS para ambos (sem indicação de quem distribui)
- Um painel mostra total de moedas (12), outro mostra 0
- Botão: "Ver moedas" (simplificado)

✅ **Estado Revelado:**
- Animação das moedas se redistribuindo
- Painéis mostram quantidade final
- Botão: "Continuar" (simplificado)

### 3. **Tela de Julgamento - CORREÇÕES NECESSÁRIAS**
⚠️ **AINDA PRECISA SER CORRIGIDO NO CÓDIGO:**

#### Remover redundância e simplificar:
- ❌ **Card de contexto** com "Ana ficou com X e deu Y para Beatriz" (linhas 644-677)
  - Criança acabou de ver a distribuição, não precisa ler novamente
- ❌ **Texto longo:** "Você acha que essa distribuição foi justa ou injusta?" (linha 691)
  - Muito texto para uma criança processar

#### Como deve ficar:
✅ **Pergunta simples:**
- Apenas um balão com: **"Foi justo?"**
- 2 botões: **"Sim"** e **"Não"** (sem emojis)

### 4. **Tela de Punição - CORREÇÕES NECESSÁRIAS**
⚠️ **AINDA PRECISA SER CORRIGIDO NO CÓDIGO:**

#### Remover reforço do julgamento anterior:
- ❌ **Card de recap** "Você disse que foi justa/injusta" com emojis ✅❌ (linhas 726-743)
  - Reforça a resposta anterior, pode induzir consistência forçada

#### Remover elementos visuais do distribuidor:
- ❌ **Foto circular do distribuidor** (linhas 746-763)
  - Muito explícito e pode gerar viés emocional

#### Simplificar texto:
- ❌ Texto atual: "Você daria uma moeda para que Lucas perca 3 moedas?"
- ✅ Texto sugerido: "Doar 1 moeda sua para tirar 3 de [nome]?"

#### Como deve ficar:
✅ **Tela simplificada:**
- Pergunta direta (sem foto)
- Box visual mostrando troca: Você -1 | Distribuidor -3
- Botões: "Não" e "Sim"

### 5. **Tela de Resultado - CORREÇÕES NECESSÁRIAS**
⚠️ **AINDA PRECISA SER CORRIGIDO NO CÓDIGO:**

#### Remover explicações textuais:
- ❌ **Texto:** "As moedas foram retiradas do total de [nome]" (linha 970)
  - Explicação desnecessária, a animação visual é suficiente

#### Como deve ficar:
✅ **Visual apenas:**
- Título: "Punição Aplicada"
- Nome do distribuidor
- Animação: -3 moedas (com ícone)
- Botão: "Continuar"

### 6. **Header - CORREÇÕES NECESSÁRIAS**
⚠️ **AINDA PRECISA SER CORRIGIDO NO CÓDIGO:**

#### Reorganizar hierarquia visual:
Atual (linhas 368-373):
```
Você | Parceiro | Cofrinho
```

Ideal:
```
Você         COFRINHO         Parceiro
(menor)      (MAIOR)          (menor)
```

#### Como deve ficar:
✅ **Cofrinho no centro com destaque:**
- Maior tamanho
- Mais visível
- Reforça objetivo coletivo

---

## 📊 ESTRUTURA DO FLUXO CORRIGIDO

### Cenário 1: Não punir OU só 1 pune
1. **Distribuição** → 2. **Julgamento** → 3. **Punição** → 4. **Próxima tentativa**

### Cenário 2: Ambos punem
1. **Distribuição** → 2. **Julgamento** → 3. **Punição** → 4. **Doação** → 5. **Resultado** → 6. **Recompensa** → 7. **Próxima tentativa**

### Ao completar 64 tentativas:
- **Tela Final** (end)

---

## 🎯 PRÓXIMOS PASSOS PRIORITÁRIOS

### URGENTE - Tela de Distribuição:
1. Remover badge "Lucas divide" e coroa
2. Igualar painéis antes do reveal (sem cores que indiquem distribuidor)
3. Remover "Hora de dividir!" e seta
4. Remover callout de diferença/igualdade
5. Simplificar botões

### IMPORTANTE - Tela de Julgamento:
1. Remover card de contexto redundante
2. Simplificar pergunta para "Foi justo?"
3. Remover emojis dos botões (manter apenas "Sim"/"Não")

### IMPORTANTE - Tela de Punição:
1. Remover card de recap do julgamento
2. Remover foto do distribuidor
3. Simplificar texto da pergunta

### MÉDIO - Outras telas:
1. Remover texto explicativo da tela de resultado
2. Reorganizar header (cofrinho no centro, maior)

---

## 📝 RESUMO EXECUTIVO

**Total de violações identificadas:** 13
**Correções já aplicadas:** 2 (remoção de telas consensus e break)
**Correções pendentes:** 11

### Impacto das correções pendentes:

✅ **Redução de viés:** Remover indicadores do distribuidor evita julgamentos baseados em quem distribui
✅ **Naturalidade:** Simplificar textos permite respostas espontâneas
✅ **Fidelidade experimental:** Eliminar feedback interpretativo mantém neutralidade
✅ **Clareza infantil:** Interface mais visual e menos textual

### Prioridade de implementação:

1. **🔴 CRÍTICO:** Tela de Distribuição (maior fonte de viés)
2. **🟡 ALTO:** Telas de Julgamento e Punição (indução de resposta)
3. **🟢 MÉDIO:** Header e tela de Resultado (UX e consistência)

---

## 🧪 VALIDAÇÃO PÓS-CORREÇÃO

Após aplicar todas as correções, validar:

- [ ] Criança consegue entender o que fazer sem explicação externa?
- [ ] Algum elemento indica "certo" ou "errado"?
- [ ] É possível identificar quem é o distribuidor antes do reveal?
- [ ] Textos estão adequados para leitura infantil (curtos e simples)?
- [ ] Feedback é apenas visual/sonoro (sem texto interpretativo)?
- [ ] Fluxo é contínuo (sem pausas artificiais)?
- [ ] Decisão do parceiro só é visível após resposta do usuário?

