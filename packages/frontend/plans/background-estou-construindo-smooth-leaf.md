# Revisão de UI — Tela de Flow do Jogo

## Context

A tela de flow (`/flow-vertical`) usa um frame fixo de 997×592 px escalado por CSS. Após várias iterações, o layout ficou funcional mas não aproveita bem o espaço horizontal e vertical disponível. Esta revisão identifica os problemas e propõe melhorias concretas mantendo a usabilidade.

---

## Diagnóstico atual

### Layout principal (excluindo PiggyBankCounter de ~36px)
```
[Sidebar 62px] | [Conteúdo ~873px com px-4] | [Sidebar 62px]
```

### Problemas identificados

| # | Problema | Impacto |
|---|---|---|
| 1 | **Step "distribute" quase vazio** — centro mostra só um botão flutuante em ~873×556px | Espaço desperdiçado, falta contexto para o participante |
| 2 | **Block usa ~300px dos 841px disponíveis** — avatares de 80px num frame landscape de 841px largura | Muito espaço branco nas laterais do Block |
| 3 | **Sidebar dots (7px) subaproveitados** — 4 colunas × 7px = 28px usados dos 62px da sidebar | Moedas pequenas demais para o espaço disponível |
| 4 | **`$` nos dots de 10px** — símbolo ilegível nessa escala, prejudica leitura | Visual poluído sem ganho informacional |
| 5 | **Card com muito espaço vertical sobrando** — após Block de 120px, restam ~370px para card de ~165px | Botões poderiam ser maiores e mais fáceis de tocar |
| 6 | **Sem indicador de progresso** — participante não sabe em qual rodada está | Desorientação durante o experimento |
| 7 | **"Repetir história" acima da pergunta** — quebra o fluxo natural Block → Pergunta | UX menos intuitiva |

---

## Melhorias propostas

### 1. Step "distribute" — adicionar contexto de rodada
Transformar o estado ocioso em uma tela de preparação:
- **Indicador "Rodada X de 4"** no topo da área central (badge discreto)
- **Preview dos personagens** da rodada atual: dois avatares pequenos (~40px) lado a lado com os nomes, antes do botão "Ver história"
- Manter o botão principal centralizado, mas com contexto acima

### 2. Block — usar todo o espaço horizontal
O frame tem 841px usáveis; o Block usa ~300px. Proposta:
- Avatares: **80→108px** (normal) e **96→128px** (distributing)
- Aumentar gap entre as colunas para o Arrow ficar mais centrado
- Nomes dos personagens: 12→**14px**, negrito mais presente
- DotGrid: dots **10→12px**, mais legíveis junto dos avatares maiores
- Contagem de moedas junto dos dots: 14→**16px**

### 3. Sidebar dots maiores
- `ds`: 7→**9px**, ainda sem `$` (ilegível abaixo de 12px)
- 4 colunas × 9px = 36px + 3×2px gaps = 42px — melhor proporção nos 62px
- Contagem e label na base permanecem

### 4. Remover `$` dos Dots completamente
- O círculo amarelo já comunica "moeda" no contexto do jogo
- O `$` em 10px fica espremido e pixelado — remover a condição `s>=10`
- Se quiser "cara de moeda" futuramente, fazer em tamanho ≥20px como SVG dedicado

### 5. Botões do Card maiores
Com o espaço vertical disponível (~370px para card de ~165px):
- `minHeight`: 60→**72px**
- `fontSize`: 17→**19px**
- `padding`: "16px 10px" → **"20px 12px"**
- `borderBottom`: 5→**6px** (proporção)

### 6. Indicador de progresso de rodada
Adicionar um row discreto acima do Block (ou embutido nele):
```
○ ● ○ ○   Rodada 2 de 4
```
Bolinhas (4 no total, a atual preenchida). Ocupa ~20px de altura.

### 7. Reposicionar "Repetir história"
Mover o botão "Repetir história" para **abaixo dos botões de justiça**, não acima da pergunta. Isso respeita o fluxo visual: Block → Pergunta → Resposta → (se necessário) Repetir.

---

## Arquivos a modificar

| Arquivo | Mudanças |
|---|---|
| `src/app/App.tsx` | Todos os itens acima — componentes `Dot`, `Sidebar`, `Block`, `Card`, `Game` |

Apenas um arquivo. Todas as mudanças são auto-contidas no `App.tsx`.

---

## Verificação

```bash
node_modules/.bin/vite build   # sem erros
```

Testar visualmente em `/game-preview/flow-vertical?round=1&sequence=ABAC`:
1. Step "distribute": ver preview de personagens + indicador de rodada
2. Step "distributing": Block expandido ocupando mais largura
3. Step "justice": botões maiores, "Repetir" abaixo
4. Step "punishment": botões maiores, Bubs abaixo
5. Sidebars: dots 9px visíveis, nome+contagem na base
