# Plano: bolha de perda de moeda no canto superior do avatar (opção 1)

## Contexto

A mensagem "X perdeu N moedas" deve ser associada visualmente ao avatar do personagem que perdeu. Após iterações de posicionamento, o usuário escolheu a **opção 1** (imagem-5): bolha ancorada no canto superior-esquerdo do círculo do personagem, ligeiramente sobreposta ao topo. Isso torna a relação mensagem↔personagem inequívoca.

---

## Estado atual (após edições já aplicadas)

| Local | Estilo atual da bolha |
|---|---|
| `experiment-flow-vertical.tsx` bolha A | `top: 50%, right: calc(100% + 6px), translateY(-50%)` — lateral |
| `experiment-flow-vertical.tsx` bolha B | `top: 50%, left: calc(100% + 6px), translateY(-50%)` — lateral |
| `App.tsx` avatar A (`dA`) | `top: 50%, right: calc(100% + 8px), translateY(-50%)` — lateral |
| `App.tsx` avatar B (`!dA`) | `top: 50%, left: calc(100% + 8px), translateY(-50%)` — lateral |

---

## Mudança: canto superior do círculo

**Estilo alvo** (reproduz a imagem 1):
```css
position: absolute;
bottom: calc(100% - 12px);  /* sobrepõe ~12px o topo do círculo */
left: -8px;                  /* desloca para a esquerda */
transform: none;
z-index: 10;
white-space: nowrap;
pointer-events: none;
```

Para o distribuidor do **lado B** (coluna direita), espelhar:
```css
right: -8px;
left: auto;
```

---

## Arquivos a modificar

### `src/app/pages/game/experiment-flow-vertical.tsx`

`CharacterBlock` — dois `motion.div`:
- `key="bubble-a"` (distributorIsA=true): trocar por `bottom: "calc(100% - 12px)", left: "-8px", transform: "none"`
- `key="bubble-b"` (distributorIsA=false): trocar por `bottom: "calc(100% - 12px)", right: "-8px", left: "auto", transform: "none"`

### `src/app/App.tsx`

`Block` — dois `motion.div key="db"`:
- Wrapper coluna A (`dA`): trocar por `bottom: "calc(100% - 12px)", left: "-8px", transform: "none"`
- Wrapper coluna B (`!dA`): trocar por `bottom: "calc(100% - 12px)", right: "-8px", left: "auto", transform: "none"`

---

## Verificação

1. Rota `/game-preview/flow-vertical` → punir → bolha aparece no canto superior do avatar do distribuidor, sobrepondo levemente o círculo
2. Testar com distribuidor A (lado esquerdo) e B (lado direito)
3. Confirmar que layout não se move quando a bolha aparece/desaparece
