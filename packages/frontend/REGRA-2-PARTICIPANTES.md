# Regra Fundamental do Sistema

## 1 Sessão = 1 Dupla = EXATAMENTE 2 Participantes

### Estrutura Rígida

```
EXPERIMENTO
│
├── SESSÃO 1
│   ├── PARTICIPANTE 1 (obrigatório)
│   └── PARTICIPANTE 2 (obrigatório)
│
├── SESSÃO 2
│   ├── PARTICIPANTE 1 (obrigatório)
│   └── PARTICIPANTE 2 (obrigatório)
│
└── SESSÃO N
    ├── PARTICIPANTE 1 (obrigatório)
    └── PARTICIPANTE 2 (obrigatório)
```

### Impossível:
❌ Sessão com 1 participante  
❌ Sessão com 3+ participantes  
❌ Sessão sem participantes  
❌ Pool de participantes separado  
❌ Reutilizar participantes entre sessões

### Sempre Verdade:
✅ Cada sessão tem EXATAMENTE 2 participantes  
✅ Cada participante pertence a UMA sessão específica  
✅ Cada dupla executa 64 tentativas juntos  
✅ Participantes são cadastrados na criação da sessão

---

## Formulário de Criação de Sessão

O formulário de criação de sessão sempre solicita:

```
Nome da Sessão: __________
Data/Hora: __________

┌─────────────────────────────┐
│ PARTICIPANTE 1 (obrigatório)│
├─────────────────────────────┤
│ Código: ____                │
│ Idade: ____                 │
│ Sexo: ____                  │
│ Escola: ____                │
└─────────────────────────────┘

┌─────────────────────────────┐
│ PARTICIPANTE 2 (obrigatório)│
├─────────────────────────────┤
│ Código: ____                │
│ Idade: ____                 │
│ Sexo: ____                  │
│ Escola: ____                │
└─────────────────────────────┘
```

**Ambos os participantes são obrigatórios.**  
Não é possível criar uma sessão sem preencher os dados dos 2 participantes.

---

## Interface TypeScript

```typescript
interface Participant {
  code: string;
  age: number;
  sex: string;
  school: string;
}

interface Session {
  id: string;
  name: string;
  participant1: Participant;  // ← OBRIGATÓRIO
  participant2: Participant;  // ← OBRIGATÓRIO
  scheduledDateTime: string;
  status: "Scheduled" | "Running" | "Completed";
}

// ❌ IMPOSSÍVEL:
interface WrongSession {
  participants: Participant[];  // ← NÃO! Não é array
  participantIds: string[];      // ← NÃO! Não são IDs
}
```

---

## Exemplos de Sessões

### Sessão 1
```json
{
  "id": "1",
  "name": "Sessão Matinal - Dupla 1",
  "participant1": {
    "code": "P001",
    "age": 24,
    "sex": "Feminino",
    "school": "Departamento de Psicologia"
  },
  "participant2": {
    "code": "P002",
    "age": 22,
    "sex": "Masculino",
    "school": "Laboratório de Neurociência"
  },
  "scheduledDateTime": "2026-03-10T09:00",
  "status": "Scheduled"
}
```

### Sessão 2
```json
{
  "id": "2",
  "name": "Sessão da Tarde - Dupla 2",
  "participant1": {
    "code": "P005",
    "age": 25,
    "sex": "Feminino",
    "school": "Departamento de Psicologia"
  },
  "participant2": {
    "code": "P006",
    "age": 27,
    "sex": "Masculino",
    "school": "Ciências Comportamentais"
  },
  "scheduledDateTime": "2026-03-10T14:00",
  "status": "Scheduled"
}
```

---

## Contador de Participantes

O contador de participantes no dashboard mostra:

```
Participantes: N
```

Onde `N = número de sessões × 2`

**Exemplo:**
- 5 sessões = 10 participantes (5 × 2)
- 10 sessões = 20 participantes (10 × 2)
- 1 sessão = 2 participantes (1 × 2)

---

## Textos da Interface

Todos os textos da interface enfatizam esta regra:

### Página de Sessões
> "Configure sessões experimentais. **Cada sessão contém exatamente 2 participantes (uma dupla)** que executarão as 64 tentativas."

### Modal de Criação
> "Configure uma sessão experimental cadastrando **uma dupla de participantes** que executarão as 64 tentativas juntos."

### Welcome Banner
> "Crie sessões experimentais cadastrando **duplas de participantes (exatamente 2 por sessão)**."

### Resumo do Protocolo
```
ESTRUTURA DA SESSÃO
1 sessão = 1 dupla
2 participantes por sessão
```

---

## Por Que Esta Estrutura?

### Contexto do Experimento
Este é um experimento de **punição altruísta** onde:
- Participantes trabalham em **DUPLAS**
- Um é o **distribuidor** de recursos
- Outro é o **observador** que pode punir
- A interação da dupla é essencial para o experimento

### MVP do TCC
- Estrutura simplificada para desenvolvimento inicial
- Foco na execução básica do experimento
- Não requer complexidade de pools de participantes
- Cadastro direto na hora da sessão

### Design Intencional
- ✅ Simplicidade
- ✅ Clareza
- ✅ Menos possibilidade de erro
- ✅ Fluxo direto
- ✅ Adequado ao protocolo experimental

---

## Validação no Frontend

O formulário deve validar:

```typescript
// ✅ CORRETO
const isValid = 
  sessionName.length > 0 &&
  scheduledDateTime !== "" &&
  participant1.code.length > 0 &&
  participant1.age > 0 &&
  participant1.sex !== "" &&
  participant2.code.length > 0 &&
  participant2.age > 0 &&
  participant2.sex !== "";

// ✅ CRIAR SESSÃO
if (isValid) {
  createSession({
    name,
    scheduledDateTime,
    participant1: {...},  // ← 2 participantes obrigatórios
    participant2: {...}
  });
}
```

---

## Mensagens de Erro (Futuro)

Caso o backend receba requisições incorretas:

```
❌ "Uma sessão deve conter exatamente 2 participantes"
❌ "Participante 1 é obrigatório"
❌ "Participante 2 é obrigatório"
❌ "Os códigos dos participantes devem ser diferentes"
```

---

## Resumo Final

**REGRA ABSOLUTA:**

# Cada Sessão = Exatamente 2 Participantes

Não há exceções. Não há flexibilidade. Esta é a estrutura fundamental do sistema MVP.
