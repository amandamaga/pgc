# Arquitetura e Banco de Dados - Sistema de Gerenciamento de Experimentos Comportamentais

## 📋 Visão Geral do Sistema

Sistema acadêmico para gerenciamento de experimentos de pesquisa comportamental (especificamente Punição Altruística com crianças), desenvolvido como MVP para TCC.

### Stack Tecnológica
- **Frontend**: React + TypeScript + Tailwind CSS
- **UI Components**: shadcn/ui
- **Routing**: React Router (Data Mode)
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Deployment**: Figma Make

---

## 🏗️ Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Dashboard   │  │ Experiments  │  │  Sessions    │      │
│  │    Page      │  │   Details    │  │   Monitor    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Participants │  │  Game View   │  │  Analytics   │      │
│  │   Global     │  │  (Mobile)    │  │    Export    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ Supabase Client API
                            │ (Auth, Real-time, REST)
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                   SUPABASE BACKEND                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    Auth      │  │  PostgreSQL  │  │  Real-time   │      │
│  │   (Login)    │  │   Database   │  │  Subscriptions│     │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │ Row Level    │  │   Storage    │                         │
│  │  Security    │  │   (Assets)   │                         │
│  └──────────────┘  └──────────────┘                         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Estrutura do Banco de Dados

### Hierarquia de Dados

```
Researcher (Pesquisador)
    │
    └── Experiments (Experimentos)
            │
            ├── Participants (Participantes Globais)
            │
            └── Sessions (Sessões)
                    │
                    ├── Participant 1 (Dupla)
                    │
                    ├── Participant 2 (Dupla)
                    │
                    └── Trials (64 Tentativas)
                            │
                            ├── Trial Data
                            ├── Judgments (Julgamentos)
                            └── Punishments (Punições)
```

---

## 📊 Tabelas do Banco de Dados

### 1. **researchers** (Pesquisadores)
Gerencia os usuários pesquisadores do sistema.

```sql
CREATE TABLE researchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    institution TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Auth linkage
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_researchers_auth_user ON researchers(auth_user_id);
CREATE INDEX idx_researchers_email ON researchers(email);
```

**Relacionamentos:**
- 1 Researcher → N Experiments
- Vinculado com `auth.users` do Supabase Auth

---

### 2. **experiments** (Experimentos)
Armazena os experimentos de pesquisa.

```sql
CREATE TABLE experiments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    researcher_id UUID NOT NULL REFERENCES researchers(id) ON DELETE CASCADE,
    
    -- Basic Info
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Rascunho',
        -- Values: 'Rascunho', 'Ativo', 'Concluído', 'Arquivado'
    
    -- Protocol Configuration
    condition_sequence TEXT NOT NULL DEFAULT 'ABAC',
        -- Example: 'ABAC' = 4 conditions
    total_trials INTEGER NOT NULL DEFAULT 64,
        -- Default: 64 trials (16 per condition)
    trials_per_condition INTEGER NOT NULL DEFAULT 16,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    archived_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('Rascunho', 'Ativo', 'Concluído', 'Arquivado')),
    CONSTRAINT valid_condition_sequence CHECK (length(condition_sequence) > 0),
    CONSTRAINT valid_total_trials CHECK (total_trials > 0)
);

-- Indexes
CREATE INDEX idx_experiments_researcher ON experiments(researcher_id);
CREATE INDEX idx_experiments_status ON experiments(status);
CREATE INDEX idx_experiments_created_at ON experiments(created_at DESC);
```

**Relacionamentos:**
- N Experiments → 1 Researcher
- 1 Experiment → N Sessions
- 1 Experiment → N Participants (global pool)

---

### 3. **participants** (Participantes Globais)
Cadastro global de participantes que podem ser reutilizados em múltiplas sessões.

```sql
CREATE TABLE participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    researcher_id UUID NOT NULL REFERENCES researchers(id) ON DELETE CASCADE,
    
    -- Participant Info
    code TEXT NOT NULL,
        -- Example: 'P001', 'P002'
    age INTEGER NOT NULL,
    sex TEXT NOT NULL,
        -- Values: 'Masculino', 'Feminino', 'Outro'
    school TEXT,
        -- Optional: school or institution
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_age CHECK (age > 0 AND age < 120),
    CONSTRAINT valid_sex CHECK (sex IN ('Masculino', 'Feminino', 'Outro')),
    CONSTRAINT unique_code_per_researcher UNIQUE (researcher_id, code)
);

-- Indexes
CREATE INDEX idx_participants_researcher ON participants(researcher_id);
CREATE INDEX idx_participants_code ON participants(code);
CREATE INDEX idx_participants_created_at ON participants(created_at DESC);
```

**Relacionamentos:**
- N Participants → 1 Researcher
- 1 Participant → N Sessions (many-to-many through session_participants)

---

### 4. **sessions** (Sessões Experimentais)
Cada sessão contém exatamente 1 dupla (2 participantes) executando 64 tentativas.

```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    
    -- Session Info
    name TEXT NOT NULL,
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Scheduled',
        -- Values: 'Scheduled', 'Running', 'Completed', 'Cancelled'
    
    -- Execution Tracking
    current_trial INTEGER DEFAULT 0,
        -- Range: 0-64 (0 = not started)
    current_condition TEXT,
        -- Current condition letter (A, B, C, D)
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
        -- Calculated duration in minutes
    
    -- QR Codes for participants
    qr_code_token TEXT UNIQUE,
        -- Unique token for session access
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('Scheduled', 'Running', 'Completed', 'Cancelled')),
    CONSTRAINT valid_current_trial CHECK (current_trial >= 0 AND current_trial <= 64),
    CONSTRAINT valid_timing CHECK (
        (started_at IS NULL AND completed_at IS NULL) OR
        (started_at IS NOT NULL AND (completed_at IS NULL OR completed_at >= started_at))
    )
);

-- Indexes
CREATE INDEX idx_sessions_experiment ON sessions(experiment_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_scheduled_date ON sessions(scheduled_date);
CREATE INDEX idx_sessions_qr_token ON sessions(qr_code_token);
```

**Relacionamentos:**
- N Sessions → 1 Experiment
- 1 Session → 2 Participants (exactly, through session_participants)
- 1 Session → 64 Trials

---

### 5. **session_participants** (Relação Sessão-Participantes)
Join table para relacionar sessões com exatamente 2 participantes (dupla).

```sql
CREATE TABLE session_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    
    -- Role in session
    role TEXT NOT NULL,
        -- Values: 'participant_1', 'participant_2'
    
    -- Connection Status
    connection_status TEXT DEFAULT 'Waiting',
        -- Values: 'Waiting', 'Connected', 'Disconnected', 'Completed'
    connected_at TIMESTAMP WITH TIME ZONE,
    disconnected_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_role CHECK (role IN ('participant_1', 'participant_2')),
    CONSTRAINT valid_connection_status CHECK (
        connection_status IN ('Waiting', 'Connected', 'Disconnected', 'Completed')
    ),
    CONSTRAINT unique_session_participant UNIQUE (session_id, participant_id),
    CONSTRAINT unique_session_role UNIQUE (session_id, role)
);

-- Indexes
CREATE INDEX idx_session_participants_session ON session_participants(session_id);
CREATE INDEX idx_session_participants_participant ON session_participants(participant_id);

-- Trigger to enforce exactly 2 participants per session
CREATE OR REPLACE FUNCTION check_session_participant_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM session_participants WHERE session_id = NEW.session_id) >= 2 THEN
        RAISE EXCEPTION 'Uma sessão pode ter no máximo 2 participantes';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_two_participants
    BEFORE INSERT ON session_participants
    FOR EACH ROW
    EXECUTE FUNCTION check_session_participant_count();
```

**Relacionamentos:**
- Many-to-Many between Sessions and Participants
- Enforces exactly 2 participants per session

---

### 6. **trials** (Tentativas)
Armazena dados de cada tentativa do experimento (64 por sessão).

```sql
CREATE TABLE trials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    
    -- Trial Identification
    trial_number INTEGER NOT NULL,
        -- Range: 1-64
    condition TEXT NOT NULL,
        -- Current condition (A, B, C, D)
    
    -- Stimulus Card
    card_type TEXT NOT NULL,
        -- Values: 'Justa', 'Injusta'
    card_image_url TEXT,
        -- Pre-configured card image
    card_description TEXT,
        -- Description of the distribution
    
    -- Distribution Details
    distributor_coins INTEGER NOT NULL,
    recipient_coins INTEGER NOT NULL,
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_trial_number CHECK (trial_number >= 1 AND trial_number <= 64),
    CONSTRAINT valid_card_type CHECK (card_type IN ('Justa', 'Injusta')),
    CONSTRAINT valid_coins CHECK (
        distributor_coins >= 0 AND 
        recipient_coins >= 0 AND
        distributor_coins + recipient_coins >= 0
    ),
    CONSTRAINT unique_session_trial UNIQUE (session_id, trial_number)
);

-- Indexes
CREATE INDEX idx_trials_session ON trials(session_id);
CREATE INDEX idx_trials_trial_number ON trials(session_id, trial_number);
CREATE INDEX idx_trials_condition ON trials(condition);
CREATE INDEX idx_trials_card_type ON trials(card_type);
```

**Relacionamentos:**
- N Trials → 1 Session
- 1 Trial → N Judgments (2, one per participant)
- 1 Trial → N Punishments (0-2, depending on judgments)

---

### 7. **judgments** (Julgamentos)
Armazena os julgamentos de cada participante sobre a tentativa.

```sql
CREATE TABLE judgments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trial_id UUID NOT NULL REFERENCES trials(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    
    -- Judgment
    judgment TEXT NOT NULL,
        -- Values: 'Justa', 'Injusta'
    
    -- Timing
    judged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reaction_time_ms INTEGER,
        -- Time to make judgment in milliseconds
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_judgment CHECK (judgment IN ('Justa', 'Injusta')),
    CONSTRAINT valid_reaction_time CHECK (reaction_time_ms > 0),
    CONSTRAINT unique_trial_participant_judgment UNIQUE (trial_id, participant_id)
);

-- Indexes
CREATE INDEX idx_judgments_trial ON judgments(trial_id);
CREATE INDEX idx_judgments_participant ON judgments(participant_id);
CREATE INDEX idx_judgments_judgment ON judgments(judgment);
```

**Relacionamentos:**
- N Judgments → 1 Trial
- N Judgments → 1 Participant
- Each trial has exactly 2 judgments (one per participant in the pair)

---

### 8. **punishments** (Punições)
Armazena as punições aplicadas quando um participante julga como injusta.

```sql
CREATE TABLE punishments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    judgment_id UUID NOT NULL REFERENCES judgments(id) ON DELETE CASCADE,
    trial_id UUID NOT NULL REFERENCES trials(id) ON DELETE CASCADE,
    punisher_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    
    -- Punishment Decision
    punish_decision BOOLEAN NOT NULL,
        -- TRUE = chose to punish, FALSE = chose not to punish
    coins_removed INTEGER DEFAULT 0,
        -- Number of coins removed from distributor
    self_cost INTEGER DEFAULT 0,
        -- Cost to punisher (if any, based on condition)
    
    -- Sound Feedback
    punishment_sound_played BOOLEAN DEFAULT FALSE,
        -- Discrete descending tone
    
    -- Timing
    decided_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    decision_time_ms INTEGER,
        -- Time to decide on punishment
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_coins_removed CHECK (coins_removed >= 0),
    CONSTRAINT valid_self_cost CHECK (self_cost >= 0),
    CONSTRAINT valid_decision_time CHECK (decision_time_ms > 0)
);

-- Indexes
CREATE INDEX idx_punishments_judgment ON punishments(judgment_id);
CREATE INDEX idx_punishments_trial ON punishments(trial_id);
CREATE INDEX idx_punishments_punisher ON punishments(punisher_id);
CREATE INDEX idx_punishments_decision ON punishments(punish_decision);
```

**Relacionamentos:**
- N Punishments → 1 Judgment
- N Punishments → 1 Trial
- N Punishments → 1 Participant (punisher)

---

### 9. **cultural_consequences** (Consequências Culturais)
Armazena quando ocorrem consequências culturais (som especial) baseado em consenso da dupla.

```sql
CREATE TABLE cultural_consequences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trial_id UUID NOT NULL REFERENCES trials(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    
    -- Consensus Information
    both_judged_unjust BOOLEAN NOT NULL,
        -- TRUE if both participants judged as "Injusta"
    both_punished BOOLEAN NOT NULL,
        -- TRUE if both chose to punish
    
    -- Cultural Sound
    culturant_sound_played BOOLEAN DEFAULT FALSE,
        -- Ascending tone sequence for cultural consequence
    
    -- Metadata
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_cultural_consequences_trial ON cultural_consequences(trial_id);
CREATE INDEX idx_cultural_consequences_session ON cultural_consequences(session_id);
CREATE INDEX idx_cultural_consequences_consensus ON cultural_consequences(both_judged_unjust, both_punished);
```

**Relacionamentos:**
- N Cultural Consequences → 1 Trial
- N Cultural Consequences → 1 Session

---

### 10. **experiment_analytics** (Analytics Aggregadas)
View materializada para analytics rápidas (opcional, para performance).

```sql
CREATE MATERIALIZED VIEW experiment_analytics AS
SELECT
    e.id AS experiment_id,
    e.name AS experiment_name,
    e.researcher_id,
    
    -- Session Counts
    COUNT(DISTINCT s.id) AS total_sessions,
    COUNT(DISTINCT CASE WHEN s.status = 'Completed' THEN s.id END) AS completed_sessions,
    COUNT(DISTINCT CASE WHEN s.status = 'Running' THEN s.id END) AS running_sessions,
    
    -- Participant Counts
    COUNT(DISTINCT sp.participant_id) AS total_participants,
    
    -- Trial Counts
    COUNT(DISTINCT t.id) AS total_trials,
    
    -- Judgment Statistics
    COUNT(DISTINCT j.id) AS total_judgments,
    COUNT(DISTINCT CASE WHEN j.judgment = 'Injusta' THEN j.id END) AS unjust_judgments,
    ROUND(
        100.0 * COUNT(DISTINCT CASE WHEN j.judgment = 'Injusta' THEN j.id END) / 
        NULLIF(COUNT(DISTINCT j.id), 0), 
        2
    ) AS unjust_percentage,
    
    -- Punishment Statistics
    COUNT(DISTINCT p.id) AS total_punishments_available,
    COUNT(DISTINCT CASE WHEN p.punish_decision = TRUE THEN p.id END) AS actual_punishments,
    ROUND(
        100.0 * COUNT(DISTINCT CASE WHEN p.punish_decision = TRUE THEN p.id END) / 
        NULLIF(COUNT(DISTINCT p.id), 0), 
        2
    ) AS punishment_rate,
    
    -- Cultural Consequences
    COUNT(DISTINCT cc.id) AS cultural_consequences_count,
    
    -- Timing
    AVG(s.duration_minutes) AS avg_session_duration_minutes,
    AVG(t.duration_seconds) AS avg_trial_duration_seconds,
    
    -- Last Updated
    MAX(s.updated_at) AS last_updated
    
FROM experiments e
LEFT JOIN sessions s ON e.id = s.experiment_id
LEFT JOIN session_participants sp ON s.id = sp.session_id
LEFT JOIN trials t ON s.id = t.session_id
LEFT JOIN judgments j ON t.id = j.trial_id
LEFT JOIN punishments p ON j.id = p.judgment_id
LEFT JOIN cultural_consequences cc ON t.id = cc.trial_id
GROUP BY e.id, e.name, e.researcher_id;

-- Index for fast queries
CREATE UNIQUE INDEX idx_experiment_analytics_id ON experiment_analytics(experiment_id);

-- Refresh function (call after data changes)
CREATE OR REPLACE FUNCTION refresh_experiment_analytics()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY experiment_analytics;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

---

## 🔐 Row Level Security (RLS)

### Políticas de Segurança

```sql
-- Enable RLS on all tables
ALTER TABLE researchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE judgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE punishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cultural_consequences ENABLE ROW LEVEL SECURITY;

-- Researchers: can only see their own data
CREATE POLICY researchers_own_data ON researchers
    FOR ALL
    USING (auth_user_id = auth.uid());

-- Experiments: researchers can only access their own experiments
CREATE POLICY experiments_own_data ON experiments
    FOR ALL
    USING (
        researcher_id IN (
            SELECT id FROM researchers WHERE auth_user_id = auth.uid()
        )
    );

-- Participants: researchers can only access their own participants
CREATE POLICY participants_own_data ON participants
    FOR ALL
    USING (
        researcher_id IN (
            SELECT id FROM researchers WHERE auth_user_id = auth.uid()
        )
    );

-- Sessions: through experiments
CREATE POLICY sessions_own_data ON sessions
    FOR ALL
    USING (
        experiment_id IN (
            SELECT id FROM experiments WHERE researcher_id IN (
                SELECT id FROM researchers WHERE auth_user_id = auth.uid()
            )
        )
    );

-- Session Participants: through sessions
CREATE POLICY session_participants_own_data ON session_participants
    FOR ALL
    USING (
        session_id IN (
            SELECT s.id FROM sessions s
            JOIN experiments e ON s.experiment_id = e.id
            JOIN researchers r ON e.researcher_id = r.id
            WHERE r.auth_user_id = auth.uid()
        )
    );

-- Similar policies for trials, judgments, punishments, cultural_consequences...
```

---

## 📈 Regras de Negócio Implementadas

### 1. **Hierarquia de Sessões**
- ✅ Cada sessão tem **exatamente 2 participantes** (uma dupla)
- ✅ Cada sessão executa **exatamente 64 tentativas**
- ✅ As tentativas seguem uma sequência de condições pré-definida (ex: ABAC)

### 2. **Participantes Globais**
- ✅ Participantes são cadastrados globalmente no sistema
- ✅ Um mesmo participante pode participar de múltiplas sessões
- ✅ Cada participante tem um código único por pesquisador

### 3. **Fluxo de Tentativas**
```
1. Sistema exibe cartão de estímulo (distribuição justa/injusta)
2. Ambos participantes julgam simultaneamente (🙂 Justa / 😟 Injusta)
3. Se julgou INJUSTA → participante decide se quer punir
4. Se ambos julgaram INJUSTA E ambos puniram → Som culturante (consequência cultural)
5. Próxima tentativa
```

### 4. **Sistema de Sons**
- 🔊 **Som de Punição**: Tom descendente discreto (individual)
- 🎵 **Som Culturante**: Sequência ascendente (consequência cultural, quando dupla converge)

### 5. **Condições Experimentais**
- 4 condições diferentes (A, B, C, D)
- Sequência: ABAC (configurável)
- 16 tentativas por condição
- Total: 64 tentativas

### 6. **Estados de Sessão**
```
Scheduled → Running → Completed
     ↓
 Cancelled
```

### 7. **Conexão de Participantes**
- QR Code único por sessão
- Cada participante escaneia e entra como P1 ou P2
- Sistema monitora status de conexão em tempo real

---

## 🔄 Fluxo de Dados em Tempo Real

```
Game View (Mobile)
    ↓
    [WebSocket] Supabase Real-time
    ↓
Session Monitor (Desktop)
    ↓
    [Real-time Updates]
    - Current trial
    - Participant connections
    - Judgments
    - Punishments
```

---

## 📊 Queries Principais

### 1. Buscar Sessões de um Experimento (com filtros)
```sql
SELECT 
    s.*,
    p1.code AS participant1_code,
    p2.code AS participant2_code,
    sp1.connection_status AS p1_status,
    sp2.connection_status AS p2_status
FROM sessions s
JOIN session_participants sp1 ON s.id = sp1.session_id AND sp1.role = 'participant_1'
JOIN session_participants sp2 ON s.id = sp2.session_id AND sp2.role = 'participant_2'
JOIN participants p1 ON sp1.participant_id = p1.id
JOIN participants p2 ON sp2.participant_id = p2.id
WHERE 
    s.experiment_id = $1
    AND s.status != 'Cancelled'
    AND (
        $2 = '' OR -- search query
        s.name ILIKE '%' || $2 || '%' OR
        p1.code ILIKE '%' || $2 || '%' OR
        p2.code ILIKE '%' || $2 || '%'
    )
    AND ($3 = FALSE OR s.status != 'Completed') -- hide completed
ORDER BY s.scheduled_date DESC;
```

### 2. Dados Completos de uma Sessão
```sql
SELECT 
    s.*,
    json_agg(DISTINCT jsonb_build_object(
        'trial_number', t.trial_number,
        'condition', t.condition,
        'card_type', t.card_type,
        'judgments', (
            SELECT json_agg(jsonb_build_object(
                'participant_code', p.code,
                'judgment', j.judgment,
                'reaction_time_ms', j.reaction_time_ms
            ))
            FROM judgments j
            JOIN participants p ON j.participant_id = p.id
            WHERE j.trial_id = t.id
        ),
        'punishments', (
            SELECT json_agg(jsonb_build_object(
                'punisher_code', p.code,
                'punish_decision', pu.punish_decision,
                'coins_removed', pu.coins_removed
            ))
            FROM punishments pu
            JOIN participants p ON pu.punisher_id = p.id
            WHERE pu.trial_id = t.id
        )
    )) AS trials_data
FROM sessions s
LEFT JOIN trials t ON s.id = t.session_id
WHERE s.id = $1
GROUP BY s.id;
```

### 3. Analytics de um Experimento
```sql
SELECT * FROM experiment_analytics
WHERE experiment_id = $1;
```

---

## 📤 Exportação de Dados (CSV)

### Estrutura do CSV de Sessão
```csv
trial_number,condition,card_type,distributor_coins,recipient_coins,p1_judgment,p1_reaction_time,p2_judgment,p2_reaction_time,p1_punished,p1_coins_removed,p2_punished,p2_coins_removed,cultural_consequence
1,A,Justa,5,5,Justa,1234,Justa,1456,FALSE,0,FALSE,0,FALSE
2,A,Injusta,8,2,Injusta,2345,Injusta,2123,TRUE,2,TRUE,2,TRUE
...
```

---

## 🚀 Otimizações

### Índices Estratégicos
- ✅ Índices em foreign keys
- ✅ Índices em campos de busca (code, name)
- ✅ Índices em campos de ordenação (created_at, scheduled_date)
- ✅ Índices compostos para queries complexas

### Materialized Views
- ✅ `experiment_analytics` para dashboard rápido
- ✅ Refresh manual ou por triggers

### Real-time Subscriptions
- ✅ Subscribe apenas aos canais necessários
- ✅ Filtros no lado do servidor (RLS)

---

## 🎨 Interface Lúdica para Crianças

### Design Considerations (Frontend)
- 🪙 Moedas visuais (emoji)
- 🙂😟 Botões com emojis para julgamento
- 🎨 Cores vibrantes e amigáveis
- 📱 Interface touch-friendly
- 🔊 Feedback sonoro claro e apropriado

### Sistema de Sons
```javascript
// sounds.ts
export const sounds = {
  punishment: new Audio('/sounds/punishment-descending.mp3'),
  culturant: new Audio('/sounds/culturant-ascending.mp3')
};
```

---

## 📝 Próximos Passos (Implementação)

### Backend Setup
1. ✅ Criar conta Supabase
2. ✅ Executar migration SQL (todas as tabelas)
3. ✅ Configurar RLS policies
4. ✅ Criar índices de performance
5. ✅ Setup de auth (email/password)

### Frontend Integration
1. ✅ Instalar `@supabase/supabase-js`
2. ✅ Configurar client do Supabase
3. ✅ Implementar queries e mutations
4. ✅ Setup de real-time subscriptions
5. ✅ Implementar auth flow

### Funcionalidades Críticas
1. ✅ CRUD de experimentos
2. ✅ CRUD de participantes globais
3. ✅ CRUD de sessões (com duplas)
4. ✅ Geração de QR codes
5. ✅ Game view mobile
6. ✅ Session monitor real-time
7. ✅ Exportação CSV
8. ✅ Analytics dashboard

---

## 🔒 Segurança

### Checklist
- ✅ Row Level Security (RLS) em todas as tabelas
- ✅ Auth do Supabase (email/password)
- ✅ Validação no backend (constraints SQL)
- ✅ Validação no frontend (formulários)
- ✅ QR codes com tokens únicos e expiração
- ✅ Sessões isoladas por pesquisador

---

## 📚 Referências

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [React Router Data APIs](https://reactrouter.com/en/main/routers/create-browser-router)
- [shadcn/ui Components](https://ui.shadcn.com/)

---

**Versão**: 1.0  
**Última Atualização**: 9 de março de 2026  
**Autor**: Sistema de TCC - Experimento de Punição Altruística
