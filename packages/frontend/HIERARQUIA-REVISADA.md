# Hierarquia Revisada: Sessão → Dupla + Participantes Globais

## Última Atualização
**Data:** 6 de março de 2026  
**Versão:** 2.0 - Sistema de Participantes Globais

---

## Nova Estrutura: Participantes Globais + Sessões com Duplas

### Mudanças Implementadas

#### 1. Hierarquia Atual

```
SISTEMA
│
├── PARTICIPANTES (Global)
│   ├── P001
│   ├── P002
│   ├── P003
│   └── ...
│
└── EXPERIMENTOS
    └── SESSÕES
        ├── Sessão 1 (referencia P001 + P002)
        ├── Sessão 2 (referencia P003 + P004)
        └── Sessão 3 (referencia P001 + P005)  ← P001 reutilizado!
```

**Características:**
- ✅ Participantes são cadastrados **uma vez** no sistema
- ✅ Participantes **podem ser reutilizados** em múltiplas sessões
- ✅ Cada sessão ainda contém **exatamente 2 participantes** (dupla)
- ✅ Participantes podem ser **selecionados OU criados** durante criação da sessão

#### 2. Fluxo de Criação Atualizado

**Fluxo Principal:**
1. **Criar Experimento** (etapa única)
   - Nome
   - Descrição
   - Sequência de condições (ABAC, ACAB, BCBC, CBCB)
   - 64 tentativas fixas geradas automaticamente
   - Cartões de estímulo pré-configurados pelo backend

2. **Gerenciar Participantes** (opcional, mas recomendado)
   - Acessar `/participants`
   - Cadastrar participantes que serão usados nas sessões
   - Buscar, editar, excluir participantes
   - Visualizar histórico

3. **Criar Sessões** (1 sessão = 1 dupla)
   - Nome da sessão
   - Data e horário
   - **Participante 1:** 
     - **Opção A:** Selecionar de participantes cadastrados
     - **Opção B:** Criar novo participante inline
   - **Participante 2:**
     - **Opção A:** Selecionar de participantes cadastrados
     - **Opção B:** Criar novo participante inline

4. **Executar e Monitorar**
   - Iniciar sessão
   - Gerar QR codes para os participantes
   - Monitorar progresso em tempo real

#### 3. Arquivos Modificados

**`/src/app/pages/sessions.tsx`**
- ✅ Removida seleção de participantes de pool existente
- ✅ Adicionado formulário integrado para cadastrar dupla durante criação da sessão
- ✅ Interface `Session` atualizada para incluir objetos `Participant` completos
- ✅ Formulário com seções separadas (azul para P1, roxo para P2) para melhor visualização
- ✅ Modal responsivo com scroll

**`/src/app/pages/experiment-details.tsx` (renomeado de experiment-workspace.tsx)**
- ✅ **Arquivo renomeado** para melhor refletir sua função
- ✅ Removida seção "Participantes" como etapa separada
- ✅ **Tela completamente revisada** com novo layout em grid
- ✅ Contadores ajustados em cards separados (Sessões, Participantes, Tentativas, Condições)
- ✅ Welcome banner atualizado para enfatizar criação de sessões
- ✅ "Como Executar" com 3 etapas claras
- ✅ Resumo do protocolo em sidebar dedicada
- ✅ Lista de sessões categorizada por status (Em Execução, Agendadas, Concluídas)
- ✅ Layout mais limpo e organizado

**Rotas atualizadas em `/src/app/routes.tsx`:**
- ✅ `/experiments/:id` agora usa `ExperimentDetailsPage`
- ✅ Remoção de rotas desnecessárias (participants, conditions, stimulus-cards)

#### 4. Estrutura de Dados

```typescript
interface Participant {
  code: string;        // Código do participante (ex: "P001")
  age: number;         // Idade
  sex: string;         // Sexo (Masculino, Feminino, Outro)
  school: string;      // Escola/Departamento
}

interface Session {
  id: string;
  name: string;
  participant1: Participant;  // Objeto completo, não apenas ID
  participant2: Participant;  // Objeto completo, não apenas ID
  scheduledDateTime: string;
  status: "Scheduled" | "Running" | "Completed";
}
```

#### 5. Benefícios da Nova Estrutura

1. **Simplicidade**: Não há mais necessidade de gerenciar pool de participantes separadamente
2. **Fluxo Direto**: Criação de sessão cadastra participantes em uma única etapa
3. **Menos Navegação**: Usuário não precisa ir para tela separada de participantes
4. **Menos Confusão**: Hierarquia clara - participantes pertencem às sessões
5. **MVP Focado**: Estrutura otimizada para o TCC onde cada sessão = 1 dupla

#### 6. Visualização no Sistema

**Cards de Sessão:**
```
Sessão Matinal - Dupla 1                    [Agendada]
Agendado: 10 mar, 09:00

🔵 P001 - Feminino, 24
🟣 P002 - Masculino, 22

[Iniciar]  [Monitorar]  [🗑️]
```

**Estatísticas do Experimento:**
- **Participantes**: 10 (Em 5 sessões)
- **Sessões**: 5 (1 sessão = 1 dupla)
- **Tentativas**: 64 (4 condições × 16)

#### 7. Página de Participantes (descontinuada)

A página `/src/app/pages/participants.tsx` ainda existe no código mas não é mais utilizada no fluxo principal. Pode ser:
- Mantida para referência futura
- Removida completamente se desejado

#### 8. Próximos Passos Recomendados

1. **Remover rota de participantes** em `/src/app/routes.tsx` se não for mais necessária
2. **Deletar `/src/app/pages/participants.tsx`** se confirmado que não será utilizada
3. **Remover componente `ExperimentProgress`** que mostrava etapas, pois agora é fluxo direto
4. **Atualizar backend** para refletir nova estrutura de dados

---

## Resumo

O sistema agora segue uma hierarquia simplificada onde:
- **Sessões** são a entidade principal de trabalho
- **Participantes** são cadastrados diretamente durante a criação da sessão
- **Cada sessão** contém exatamente **1 dupla** de participantes
- **Não há pool separado** de participantes

Esta estrutura é mais adequada para o MVP do TCC e elimina complexidade desnecessária.