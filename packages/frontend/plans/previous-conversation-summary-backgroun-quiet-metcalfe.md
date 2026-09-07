# Plano: MVP — Listagem e Criação de Experimentos

## Contexto

O MVP do dashboard precisa cobrir dois fluxos principais para o pesquisador:
1. **Listar experimentos** — visão geral para gerenciar e navegar para experimentos existentes
2. **Criar um novo experimento** — formulário guiado para configurar um experimento

O estado atual tem ambas as telas funcionando, mas com inconsistências visuais, dados stub e campos fora do escopo do MVP. O objetivo é aparar o excesso, corrigir inconsistências e deixar os dois fluxos sólidos e coerentes para a entrega do TCC.

---

## O que muda

### 1. Tela de listagem — `src/app/pages/dashboard.tsx`

**Problemas atuais:**
- Status badge exibe em inglês (`Active`, `Draft`, `Finished`) enquanto a UI é em português
- Ações de "Editar", "Duplicar" e "Arquivar" são apenas `console.log` — no MVP não precisamos de todas; limpar escopo
- `Participantes` na tabela não faz sentido no contexto atual — o experimento em si não tem participantes, as sessões têm duplas
- Mock data hardcodada no componente, sem nenhuma forma de persistência mesmo local

**O que fica (MVP mínimo):**
| Coluna | Campo |
|--------|-------|
| Nome | `name` |
| Status | badge PT-BR: `Rascunho / Ativo / Finalizado` |
| Sessões | contagem de sessões (substituir `participants`) |
| Criado em | data de criação (substituir `lastModified`) |
| — | menu de contexto com: Abrir, Excluir (com diálogo de confirmação) |

**Mudanças:**
- Corrigir labels de status para PT-BR em `ExperimentsTable` e `SearchFilterBar`
- Remover colunas `Participantes` e `Última Modificação`; adicionar `Sessões` e `Criado em`
- Ações no menu contextual: manter só **Abrir** e **Excluir** (com `AlertDialog` de confirmação)
- Remover `onEdit`, `onDuplicate`, `onArchive` das props (simplificar interface)
- Adicionar campo `createdAt: string` e `sessions: number` na interface `Experiment`
- Atualizar mock data em `dashboard.tsx` com esses campos
- Corrigir filtro de status no `SearchFilterBar` para usar valores PT-BR ou mapear internamente

### 2. Formulário de criação — `src/app/pages/create-experiment.tsx`

**Problemas atuais:**
- Campo "Vídeo Tutorial" está fora do escopo do MVP — aumenta complexidade sem valor
- Tela de sucesso (step 2) navega para ID hardcoded `/researcher/experiments/1` em vez do ID real
- Formulário não persiste o experimento em nenhum estado compartilhado; ao voltar ao dashboard, o experimento criado não aparece

**O que fica (MVP):**
- Campos: **Nome*** + **Descrição** + **Sequência de condições***
- Remover completamente a seção "Vídeo Tutorial"
- Tela de sucesso substitui o hardcoded por um `newId` gerado no momento do submit
- Estado compartilhado: mover `experiments` para um Context React simples (`ExperimentsContext`) ou para `sessionStorage` — o experimento criado aparece na lista

**Mudanças:**
- Remover `enableTutorialVideo` e `tutorialVideoUrl` do `formData`
- Remover seção de vídeo tutorial do JSX
- Criar `src/app/lib/experiments-store.ts` — estado global simples via `useState` + Context; exporta `useExperiments()` hook
- `DashboardPage` e `CreateExperimentPage` consomem `useExperiments()` em vez de estado local
- Ao criar, gera ID com `crypto.randomUUID()`, adiciona ao store, navega para `/researcher/experiments/:newId`
- Tela de sucesso do step 2 usa o ID real para o link "Ir para Detalhes"

### 3. Componentes auxiliares

| Arquivo | Mudança |
|---------|---------|
| `src/app/components/experiments-table.tsx` | Remover props `onEdit`, `onDuplicate`, `onArchive`; simplificar menu para Abrir + Excluir; adicionar `AlertDialog` de confirmação de exclusão; ajustar colunas |
| `src/app/components/search-filter-bar.tsx` | Corrigir valores do filtro de status para PT-BR |
| `src/app/components/experiment-card.tsx` | Adicionar `createdAt` e `sessions` na interface `Experiment`; remover `participants` |

### 4. Roteamento e layout

Nenhuma mudança nas rotas — o fluxo `/researcher` → `/researcher/experiments/new` → `/researcher/experiments/:id` já está correto.

---

## Estado compartilhado (abordagem)

Criar `src/app/lib/experiments-store.ts` com um Context + Provider simples (in-memory). Futuramente o banco substitui apenas as funções do store — as páginas não precisam ser alteradas.

```ts
// Expõe:
const { experiments, addExperiment, deleteExperiment } = useExperiments();
```

Inicializa com os 5 mock experiments. `ExperimentsProvider` envolve o router em `App.tsx` (ou só as rotas do researcher no layout).

> **Nota de migração futura**: ao integrar backend, basta substituir o `useState` interno por chamadas `fetch`/`axios` e trocar o retorno do hook por React Query ou SWR — as páginas continuam iguais.

---

## Verificação / Teste

1. Abrir `/researcher` — ver tabela com colunas corretas e status em PT-BR
2. Filtrar por status "Rascunho" — ver somente Rascunhos
3. Buscar por nome — filtro funciona
4. Excluir experimento — diálogo de confirmação aparece; após confirmar, linha some da tabela
5. Clicar "Criar Experimento" — ir para formulário
6. Preencher nome + sequência, submeter — tela de sucesso aparece com ID correto
7. Clicar "Ir para Detalhes" — navegar para `/researcher/experiments/:newId`
8. Clicar "Voltar ao Dashboard" — novo experimento aparece na lista

---

## Arquivos a modificar

- `src/app/pages/dashboard.tsx`
- `src/app/pages/create-experiment.tsx`
- `src/app/components/experiments-table.tsx`
- `src/app/components/experiment-card.tsx` (interface `Experiment`)
- `src/app/components/search-filter-bar.tsx`
- `src/app/app.tsx` (adicionar `ExperimentsProvider`)

## Arquivo novo

- `src/app/lib/experiments-store.ts`
