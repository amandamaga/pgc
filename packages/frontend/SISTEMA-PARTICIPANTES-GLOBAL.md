# Sistema de Participantes Global + Seleção/Criação Inline

## Visão Geral

O sistema agora implementa um **registro global de participantes** que podem ser reutilizados em diferentes sessões experimentais, combinado com a capacidade de **criar novos participantes diretamente** no fluxo de criação de sessões.

---

## Arquitetura

### 1. Participantes Globais

**Entidade:** `Participant`
```typescript
interface Participant {
  id: string;
  code: string;        // Ex: P001
  age: number;
  sex: string;         // Masculino, Feminino, Outro
  school: string;      // Escola/Departamento
  createdAt: string;   // Data de cadastro
}
```

**Características:**
- ✅ Cadastrados uma vez
- ✅ Reutilizáveis em múltiplas sessões
- ✅ Gerenciados centralmente em `/participants`
- ✅ Persistem no sistema independentemente das sessões

### 2. Sessões com Duplas

**Estrutura:** 1 Sessão = Exatamente 2 Participantes

```typescript
interface Session {
  id: string;
  name: string;
  participant1: Participant;  // ← Referência ao participante global
  participant2: Participant;  // ← Referência ao participante global
  scheduledDateTime: string;
  status: "Scheduled" | "Running" | "Completed";
}
```

**Regras:**
- ✅ Cada sessão DEVE ter exatamente 2 participantes
- ✅ Participantes podem ser de qualquer sessão anterior
- ✅ Um mesmo participante pode estar em múltiplas sessões
- ✅ Os 2 participantes de uma sessão DEVEM ser diferentes

---

## Fluxos de Uso

### Fluxo 1: Gerenciar Participantes Globalmente

**Página:** `/participants` (ParticipantsGlobalPage)

**Funcionalidades:**
1. **Visualizar** todos os participantes cadastrados no sistema
2. **Buscar** participantes por código, escola ou sexo
3. **Cadastrar** novos participantes
4. **Excluir** participantes (se não estiverem em sessões ativas)

**Quando usar:**
- Cadastrar vários participantes antes de criar sessões
- Gerenciar o banco de dados de participantes
- Revisar participantes existentes

**Acesso:**
- Link na navegação principal: "Participantes"
- Ícone: 👥 (Users)

---

### Fluxo 2: Criar Sessão (Selecionar OU Criar)

**Página:** `/experiments/:id/sessions` (SessionsPage)

**Modal de Criação de Sessão:**

```
┌─────────────────────────────────────────────────┐
│ Criar Nova Sessão                               │
├─────────────────────────────────────────────────┤
│ Nome da Sessão: _____________________           │
│ Data e Horário: _____________________           │
│                                                 │
│ ┌──────────────────────────────────────────┐  │
│ │ PARTICIPANTE 1          [+ Criar Novo]   │  │
│ ├──────────────────────────────────────────┤  │
│ │ [Dropdown: Selecione um participante]    │  │
│ │ > P001 - Feminino, 24 anos               │  │
│ │ > P002 - Masculino, 22 anos              │  │
│ │ > P003 - Feminino, 26 anos               │  │
│ └──────────────────────────────────────────┘  │
│                                                 │
│ ┌──────────────────────────────────────────┐  │
│ │ PARTICIPANTE 2          [+ Criar Novo]   │  │
│ ├──────────────────────────────────────────┤  │
│ │ [Dropdown: Selecione um participante]    │  │
│ │ > P001 - Feminino, 24 anos               │  │
│ │ > P002 - Masculino, 22 anos              │  │
│ │ > P005 - Feminino, 25 anos               │  │
│ └──────────────────────────────────────────┘  │
│                                                 │
│                    [Cancelar] [Criar Sessão]   │
└─────────────────────────────────────────────────┘
```

#### Opção A: Selecionar Participante Existente

**Passos:**
1. Clicar no dropdown "Selecionar participante"
2. Escolher um participante da lista
3. Informações aparecem automaticamente
4. Repetir para o segundo participante
5. Criar sessão

**Vantagens:**
- Rápido se participantes já estão cadastrados
- Não precisa digitar dados novamente
- Garante consistência de dados

#### Opção B: Criar Novo Participante Inline

**Passos:**
1. Clicar em "Criar Novo"
2. Formulário inline aparece com campos:
   - Código (obrigatório)
   - Idade (obrigatório)
   - Sexo (obrigatório)
   - Escola (opcional)
3. Clicar em "Cadastrar P1" ou "Cadastrar P2"
4. Participante é:
   - ✅ Adicionado ao registro global
   - ✅ Selecionado automaticamente para a sessão
5. Repetir para o segundo participante
6. Criar sessão

**Vantagens:**
- Não precisa sair do fluxo de criação
- Participante fica disponível para futuras sessões
- Fluxo contínuo

---

## Interface do Modal

### Estado: Modo Seleção (Padrão)

```
┌──────────────────────────────────────────┐
│ PARTICIPANTE 1          [+ Criar Novo]   │
├──────────────────────────────────────────┤
│ Selecionar Participante *                │
│ ┌────────────────────────────────────┐   │
│ │ Selecione um participante...       ▼│   │
│ └────────────────────────────────────┘   │
│                                          │
│ [Quando selecionado:]                    │
│ P001 - Feminino, 24 anos                 │
│ Departamento de Psicologia               │
└──────────────────────────────────────────┘
```

### Estado: Modo Criação

```
┌──────────────────────────────────────────┐
│ PARTICIPANTE 1                           │
├──────────────────────────────────────────┤
│ Código *        Idade *                  │
│ [P006____]      [24___]                  │
│                                          │
│ Sexo *          Escola                   │
│ [Feminino ▼]    [Depto de Psicologia__] │
│                                          │
│ [Cadastrar P1]  [Cancelar]               │
└──────────────────────────────────────────┘
```

---

## Fluxo de Estados no Modal

```
INICIAL
  │
  ├─→ Dropdown Vazio
  │   │
  │   ├─→ Usuário seleciona participante
  │   │   └─→ Mostra informações do participante
  │   │
  │   └─→ Usuário clica "Criar Novo"
  │       └─→ MODO CRIAÇÃO
  │
  └─→ MODO CRIAÇÃO
      │
      ├─→ Usuário preenche campos
      │   │
      │   ├─→ Clica "Cadastrar P1/P2"
      │   │   └─→ Participante criado e selecionado
      │   │       └─→ Volta para DROPDOWN COM PARTICIPANTE SELECIONADO
      │   │
      │   └─→ Clica "Cancelar"
      │       └─→ Volta para DROPDOWN VAZIO
      │
      └─→ [Fim]
```

---

## Validações

### Ao Criar Sessão

```typescript
// ✅ Validações obrigatórias
const isValid = 
  sessionName.length > 0 &&
  scheduledDateTime !== "" &&
  participant1Id !== "" &&
  participant2Id !== "" &&
  participant1Id !== participant2Id; // ← Participantes devem ser diferentes

if (!isValid) {
  alert("Por favor, preencha todos os campos e selecione participantes diferentes");
  return;
}
```

### Ao Criar Participante Inline

```typescript
// ✅ Validações obrigatórias
const isValid = 
  code.length > 0 &&
  age > 0 &&
  sex !== "";

// Botão "Cadastrar" só fica ativo se válido
<Button disabled={!isValid}>
  Cadastrar P1
</Button>
```

---

## Benefícios da Arquitetura

### ✅ Para Pesquisadores

1. **Flexibilidade:**
   - Pode pré-cadastrar participantes
   - OU criar na hora da sessão
   - Ambos os fluxos são suportados

2. **Eficiência:**
   - Não precisa digitar dados repetidos
   - Participantes reutilizáveis
   - Banco de dados centralizado

3. **Organização:**
   - Todos os participantes em um lugar
   - Fácil de buscar e gerenciar
   - Histórico completo

### ✅ Para o Sistema

1. **Normalização de Dados:**
   - Participantes são entidades de primeira classe
   - Sem duplicação de dados
   - Integridade referencial

2. **Escalabilidade:**
   - Pode adicionar estatísticas por participante
   - Histórico de participação
   - Análises longitudinais

3. **Manutenibilidade:**
   - Lógica clara e separada
   - Fácil de estender
   - Código organizado

---

## Exemplo de Uso Completo

### Cenário: Criar 3 Sessões com Mix de Participantes

**Passo 1:** Cadastrar alguns participantes globalmente
```
/participants → Cadastrar:
- P001 (Ana, 24F)
- P002 (João, 22M)
- P003 (Maria, 26F)
```

**Passo 2:** Criar Sessão 1
```
/experiments/1/sessions → Nova Sessão:
- Nome: "Sessão Manhã"
- P1: Selecionar P001 (Ana)
- P2: Criar Novo → P004 (Carlos, 23M)
```
Resultado: P004 agora está no registro global

**Passo 3:** Criar Sessão 2
```
/experiments/1/sessions → Nova Sessão:
- Nome: "Sessão Tarde"
- P1: Selecionar P002 (João)
- P2: Selecionar P004 (Carlos) ← Criado na sessão anterior!
```

**Passo 4:** Criar Sessão 3
```
/experiments/1/sessions → Nova Sessão:
- Nome: "Sessão Noite"
- P1: Selecionar P003 (Maria)
- P2: Criar Novo → P005 (Lucia, 25F)
```

**Resultado Final:**
- 5 participantes no registro global
- 3 sessões criadas
- Mix de seleção + criação inline

---

## Código Principal

### Mock de Participantes Globais

```typescript
const mockGlobalParticipants: Participant[] = [
  { 
    id: "1", 
    code: "P001", 
    age: 24, 
    sex: "Feminino", 
    school: "Departamento de Psicologia",
    createdAt: "2026-03-01"
  },
  // ... mais participantes
];
```

### Função de Criar Participante Inline

```typescript
const handleCreateNewParticipant = (participantNumber: 1 | 2) => {
  const data = participantNumber === 1 ? newParticipant1 : newParticipant2;
  
  const newParticipant: Participant = {
    id: String(globalParticipants.length + 1),
    code: data.code,
    age: Number(data.age),
    sex: data.sex,
    school: data.school,
    createdAt: new Date().toISOString().split('T')[0],
  };
  
  // Adiciona ao registro global
  setGlobalParticipants([...globalParticipants, newParticipant]);
  
  // Seleciona automaticamente para a sessão
  if (participantNumber === 1) {
    setSessionFormData({ ...sessionFormData, participant1Id: newParticipant.id });
    setIsCreatingParticipant1(false);
  } else {
    setSessionFormData({ ...sessionFormData, participant2Id: newParticipant.id });
    setIsCreatingParticipant2(false);
  }
};
```

---

## Rotas Atualizadas

```
/                              - Dashboard de Experimentos
/participants                  - Gerenciamento Global de Participantes
/experiments/new               - Criar Experimento
/experiments/:id               - Detalhes do Experimento
/experiments/:id/sessions      - Gerenciar Sessões (com criação inline)
```

---

## Resumo Final

| Característica | Antes | Agora |
|---------------|-------|-------|
| Participantes | Cadastrados por sessão | Registro global |
| Reutilização | Não | Sim ✅ |
| Criação inline | Obrigatória | Opcional ✅ |
| Seleção de existente | Não | Sim ✅ |
| Gerenciamento central | Não | Sim ✅ |
| Flexibilidade | Baixa | Alta ✅ |

**Filosofia:**
> "Cadastre uma vez, use em qualquer lugar. Ou crie na hora se precisar."

---

## Próximos Passos Possíveis

1. **Histórico de Participação:**
   - Mostrar em quantas sessões cada participante esteve
   - Links para visualizar sessões específicas

2. **Estatísticas por Participante:**
   - Desempenho médio
   - Tempos de reação
   - Padrões de decisão

3. **Import/Export:**
   - Importar lista de participantes (CSV)
   - Exportar dados de participantes

4. **Grupos/Tags:**
   - Agrupar participantes por turma, experimento, etc.
   - Filtros avançados

5. **Validação de Unicidade:**
   - Garantir códigos únicos
   - Detectar duplicatas

---

**Status:** ✅ Implementado e funcional  
**Data:** 6 de março de 2026  
**Versão:** 2.0 (Participantes Globais + Inline)
