# Diagrama Entity-Relationship (ER)

## Diagrama Completo de Relacionamentos

```mermaid
erDiagram
    RESEARCHERS ||--o{ EXPERIMENTS : creates
    RESEARCHERS ||--o{ PARTICIPANTS : manages
    
    EXPERIMENTS ||--o{ SESSIONS : contains
    EXPERIMENTS }o--o{ PARTICIPANTS : uses
    
    SESSIONS ||--|| SESSION_PARTICIPANTS : has_exactly_2
    SESSIONS ||--o{ TRIALS : executes_64
    SESSIONS ||--o{ CULTURAL_CONSEQUENCES : triggers
    
    PARTICIPANTS ||--o{ SESSION_PARTICIPANTS : participates_in
    PARTICIPANTS ||--o{ JUDGMENTS : makes
    PARTICIPANTS ||--o{ PUNISHMENTS : applies
    
    TRIALS ||--|| JUDGMENTS : receives_2
    TRIALS ||--o{ PUNISHMENTS : may_trigger
    TRIALS ||--o| CULTURAL_CONSEQUENCES : may_trigger
    
    JUDGMENTS ||--o| PUNISHMENTS : may_lead_to
    
    RESEARCHERS {
        uuid id PK
        text email UK
        text name
        text institution
        uuid auth_user_id FK
        timestamp created_at
        timestamp updated_at
    }
    
    EXPERIMENTS {
        uuid id PK
        uuid researcher_id FK
        text name
        text description
        text status "Rascunho|Ativo|Concluído|Arquivado"
        text condition_sequence "ABAC"
        integer total_trials "64"
        integer trials_per_condition "16"
        timestamp created_at
        timestamp updated_at
        timestamp archived_at
    }
    
    PARTICIPANTS {
        uuid id PK
        uuid researcher_id FK
        text code UK "P001, P002..."
        integer age
        text sex "Masculino|Feminino|Outro"
        text school
        timestamp created_at
        timestamp updated_at
    }
    
    SESSIONS {
        uuid id PK
        uuid experiment_id FK
        text name
        timestamp scheduled_date
        text status "Scheduled|Running|Completed|Cancelled"
        integer current_trial "0-64"
        text current_condition "A|B|C|D"
        timestamp started_at
        timestamp completed_at
        integer duration_minutes
        text qr_code_token UK
        timestamp created_at
        timestamp updated_at
    }
    
    SESSION_PARTICIPANTS {
        uuid id PK
        uuid session_id FK
        uuid participant_id FK
        text role "participant_1|participant_2"
        text connection_status "Waiting|Connected|Disconnected|Completed"
        timestamp connected_at
        timestamp disconnected_at
        timestamp created_at
    }
    
    TRIALS {
        uuid id PK
        uuid session_id FK
        integer trial_number "1-64"
        text condition "A|B|C|D"
        text card_type "Justa|Injusta"
        text card_image_url
        text card_description
        integer distributor_coins
        integer recipient_coins
        timestamp started_at
        timestamp completed_at
        integer duration_seconds
        timestamp created_at
    }
    
    JUDGMENTS {
        uuid id PK
        uuid trial_id FK
        uuid participant_id FK
        text judgment "Justa|Injusta"
        timestamp judged_at
        integer reaction_time_ms
        timestamp created_at
    }
    
    PUNISHMENTS {
        uuid id PK
        uuid judgment_id FK
        uuid trial_id FK
        uuid punisher_id FK
        boolean punish_decision
        integer coins_removed
        integer self_cost
        boolean punishment_sound_played
        timestamp decided_at
        integer decision_time_ms
        timestamp created_at
    }
    
    CULTURAL_CONSEQUENCES {
        uuid id PK
        uuid trial_id FK
        uuid session_id FK
        boolean both_judged_unjust
        boolean both_punished
        boolean culturant_sound_played
        timestamp triggered_at
        timestamp created_at
    }
```

## Fluxo de Dados Durante uma Sessão

```mermaid
sequenceDiagram
    participant R as Researcher
    participant S as Session
    participant P1 as Participant 1
    participant P2 as Participant 2
    participant T as Trial
    participant DB as Database
    
    R->>S: Cria sessão com dupla (P1, P2)
    R->>S: Gera QR codes
    
    P1->>S: Escaneia QR e conecta
    P2->>S: Escaneia QR e conecta
    S->>DB: Atualiza connection_status
    
    R->>S: Inicia sessão
    
    loop 64 Tentativas
        S->>T: Cria tentativa N
        T->>P1: Mostra cartão de distribuição
        T->>P2: Mostra cartão de distribuição
        
        P1->>T: Julga (Justa/Injusta)
        P2->>T: Julga (Justa/Injusta)
        T->>DB: Salva judgments
        
        alt P1 julgou Injusta
            T->>P1: Pergunta se quer punir
            P1->>T: Decide punir (sim/não)
            T->>DB: Salva punishment P1
            opt P1 puniu
                T->>P1: 🔊 Som de punição
            end
        end
        
        alt P2 julgou Injusta
            T->>P2: Pergunta se quer punir
            P2->>T: Decide punir (sim/não)
            T->>DB: Salva punishment P2
            opt P2 puniu
                T->>P2: 🔊 Som de punição
            end
        end
        
        alt Ambos julgaram Injusta E Ambos puniram
            T->>P1: 🎵 Som culturante
            T->>P2: 🎵 Som culturante
            T->>DB: Salva cultural_consequence
        end
        
        T->>S: Atualiza current_trial
        S->>R: Notifica progresso (real-time)
    end
    
    S->>DB: Marca sessão como Completed
    S->>R: Notifica conclusão
```

## Cardinalidades Principais

```mermaid
graph TD
    R[Researcher] -->|1:N| E[Experiments]
    R -->|1:N| P[Participants]
    
    E -->|1:N| S[Sessions]
    E -.->|N:M| P
    
    S -->|1:2| SP[Session Participants]
    S -->|1:64| T[Trials]
    
    P -->|N:M| SP
    
    T -->|1:2| J[Judgments]
    T -->|1:0..2| PU[Punishments]
    T -->|1:0..1| CC[Cultural Consequences]
    
    J -->|1:0..1| PU
    
    style R fill:#e3f2fd
    style E fill:#fff3e0
    style P fill:#f3e5f5
    style S fill:#e8f5e9
    style T fill:#fce4ec
    style J fill:#fff9c4
    style PU fill:#ffebee
    style CC fill:#e0f2f1
```

## Hierarquia Visual

```
📊 Sistema de Experimentos
│
├── 👤 Researcher (Pesquisador)
│   │
│   ├── 🔬 Experiment 1
│   │   │
│   │   ├── 📅 Session 1
│   │   │   ├── 👦 Participant 1 (P001)
│   │   │   ├── 👧 Participant 2 (P002)
│   │   │   └── 📋 Trials (1-64)
│   │   │       ├── Trial 1 [Condition A]
│   │   │       │   ├── 👦 P001: Julgamento → Punição?
│   │   │       │   ├── 👧 P002: Julgamento → Punição?
│   │   │       │   └── 🎵 Consequência Cultural?
│   │   │       ├── Trial 2 [Condition A]
│   │   │       │   └── ...
│   │   │       └── ...
│   │   │
│   │   ├── 📅 Session 2
│   │   │   └── ...
│   │   └── ...
│   │
│   ├── 🔬 Experiment 2
│   │   └── ...
│   │
│   └── 👥 Participants Pool (Global)
│       ├── P001 (Ana, 8 anos)
│       ├── P002 (João, 7 anos)
│       ├── P003 (Maria, 9 anos)
│       └── ...
│
└── 👤 Outro Researcher
    └── ...
```

## Estados e Transições

### Estados de Session
```mermaid
stateDiagram-v2
    [*] --> Scheduled: Criar sessão
    Scheduled --> Running: Iniciar sessão
    Scheduled --> Cancelled: Cancelar
    Running --> Completed: Completar 64 tentativas
    Running --> Cancelled: Cancelar
    Cancelled --> [*]
    Completed --> [*]
```

### Estados de Participant Connection
```mermaid
stateDiagram-v2
    [*] --> Waiting: Sessão criada
    Waiting --> Connected: Escanear QR
    Connected --> Disconnected: Perder conexão
    Disconnected --> Connected: Reconectar
    Connected --> Completed: Sessão finalizada
    Completed --> [*]
```

### Fluxo de Trial
```mermaid
stateDiagram-v2
    [*] --> ShowCard: Iniciar tentativa
    ShowCard --> WaitJudgments: Mostrar distribuição
    WaitJudgments --> CheckJudgments: Ambos julgaram
    
    CheckJudgments --> NextTrial: Ambos julgaram Justa
    
    CheckJudgments --> AskPunishment: Pelo menos 1 Injusta
    AskPunishment --> ProcessPunishments: Decisões tomadas
    ProcessPunishments --> CheckCultural: Verificar consenso
    
    CheckCultural --> PlayCulturantSound: Ambos Injusta + Ambos Puniram
    CheckCultural --> NextTrial: Sem consenso
    
    PlayCulturantSound --> NextTrial
    NextTrial --> [*]: Trial completo
```

## Constraints e Regras de Integridade

```mermaid
graph TB
    subgraph "Regras de Negócio"
        R1[1 Sessão = Exatamente 2 Participantes]
        R2[1 Sessão = Exatamente 64 Tentativas]
        R3[1 Tentativa = Exatamente 2 Julgamentos]
        R4[Julgamento 'Injusta' → Pode Punir]
        R5[Ambos Injusta + Ambos Puniram → Som Cultural]
    end
    
    subgraph "Constraints SQL"
        C1[UNIQUE session_id + role]
        C2[CHECK role IN participant_1, participant_2]
        C3[TRIGGER max 2 participants]
        C4[UNIQUE session_id + trial_number]
        C5[CHECK trial_number 1-64]
        C6[UNIQUE trial_id + participant_id]
    end
    
    R1 --> C1
    R1 --> C2
    R1 --> C3
    R2 --> C4
    R2 --> C5
    R3 --> C6
    
    style R1 fill:#e8f5e9
    style R2 fill:#e8f5e9
    style R3 fill:#e8f5e9
    style R4 fill:#fff3e0
    style R5 fill:#fff3e0
    style C1 fill:#e3f2fd
    style C2 fill:#e3f2fd
    style C3 fill:#e3f2fd
    style C4 fill:#e3f2fd
    style C5 fill:#e3f2fd
    style C6 fill:#e3f2fd
```

## Índices Estratégicos

```mermaid
graph LR
    subgraph "Queries Frequentes"
        Q1[Listar sessões do experimento]
        Q2[Buscar sessão por QR token]
        Q3[Trials de uma sessão]
        Q4[Judgments de um trial]
        Q5[Participantes de um researcher]
    end
    
    subgraph "Índices"
        I1[idx_sessions_experiment]
        I2[idx_sessions_qr_token]
        I3[idx_trials_session]
        I4[idx_judgments_trial]
        I5[idx_participants_researcher]
    end
    
    Q1 --> I1
    Q2 --> I2
    Q3 --> I3
    Q4 --> I4
    Q5 --> I5
    
    style Q1 fill:#fff3e0
    style Q2 fill:#fff3e0
    style Q3 fill:#fff3e0
    style Q4 fill:#fff3e0
    style Q5 fill:#fff3e0
    style I1 fill:#e8f5e9
    style I2 fill:#e8f5e9
    style I3 fill:#e8f5e9
    style I4 fill:#e8f5e9
    style I5 fill:#e8f5e9
```

## Performance Considerations

### Query Otimizada: Sessões com Participantes
```sql
-- ❌ RUIM (N+1 queries)
SELECT * FROM sessions WHERE experiment_id = $1;
-- Depois: SELECT * FROM participants WHERE id = ...

-- ✅ BOM (1 query com JOINs)
SELECT 
    s.*,
    json_build_object(
        'participant1', json_build_object('code', p1.code, 'name', p1.name),
        'participant2', json_build_object('code', p2.code, 'name', p2.name)
    ) AS participants
FROM sessions s
JOIN session_participants sp1 ON s.id = sp1.session_id AND sp1.role = 'participant_1'
JOIN session_participants sp2 ON s.id = sp2.session_id AND sp2.role = 'participant_2'
JOIN participants p1 ON sp1.participant_id = p1.id
JOIN participants p2 ON sp2.participant_id = p2.id
WHERE s.experiment_id = $1;
```

### Real-time Subscriptions
```typescript
// Subscribe apenas aos dados necessários
const subscription = supabase
  .channel(`session:${sessionId}`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'trials',
      filter: `session_id=eq.${sessionId}`
    },
    (payload) => {
      // Update UI
    }
  )
  .subscribe();
```

## Tamanho Estimado do Banco

### Por Sessão Completa:
- 1 sessão
- 2 participantes (referências)
- 64 trials
- 128 judgments (2 por trial)
- ~40 punishments (média, depende dos dados)
- ~10 cultural consequences (média)

**Total por sessão**: ~244 registros

### Estimativa de Storage:
- 100 sessões = ~24,400 registros
- Tamanho médio por registro: ~500 bytes
- **Total**: ~12 MB de dados brutos
- Com índices: ~25-30 MB

### Escalabilidade:
- PostgreSQL suporta bilhões de registros
- Supabase free tier: 500 MB
- Supabase pro tier: 8 GB+
- ✅ Sistema comporta facilmente 1000+ sessões

---

**Última Atualização**: 9 de março de 2026
