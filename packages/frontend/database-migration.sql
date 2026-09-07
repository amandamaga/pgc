-- ============================================
-- MIGRATION: Initial Database Setup
-- Sistema de Gerenciamento de Experimentos Comportamentais
-- Data: 2026-03-09
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: researchers
-- Gerencia os pesquisadores do sistema
-- ============================================
CREATE TABLE researchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    institution TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Auth linkage (Supabase Auth)
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes
CREATE INDEX idx_researchers_auth_user ON researchers(auth_user_id);
CREATE INDEX idx_researchers_email ON researchers(email);
CREATE INDEX idx_researchers_created_at ON researchers(created_at DESC);

-- Comments
COMMENT ON TABLE researchers IS 'Pesquisadores que gerenciam experimentos';
COMMENT ON COLUMN researchers.auth_user_id IS 'Link com auth.users do Supabase Auth';

-- ============================================
-- TABLE: experiments
-- Armazena experimentos de pesquisa
-- ============================================
CREATE TABLE experiments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    researcher_id UUID NOT NULL REFERENCES researchers(id) ON DELETE CASCADE,
    
    -- Basic Info
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Rascunho',
    
    -- Protocol Configuration
    condition_sequence TEXT NOT NULL DEFAULT 'ABAC',
    total_trials INTEGER NOT NULL DEFAULT 64,
    trials_per_condition INTEGER NOT NULL DEFAULT 16,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    archived_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('Rascunho', 'Ativo', 'Concluído', 'Arquivado')),
    CONSTRAINT valid_condition_sequence CHECK (length(condition_sequence) > 0),
    CONSTRAINT valid_total_trials CHECK (total_trials > 0 AND total_trials <= 1000),
    CONSTRAINT valid_trials_per_condition CHECK (trials_per_condition > 0)
);

-- Indexes
CREATE INDEX idx_experiments_researcher ON experiments(researcher_id);
CREATE INDEX idx_experiments_status ON experiments(status);
CREATE INDEX idx_experiments_created_at ON experiments(created_at DESC);
CREATE INDEX idx_experiments_updated_at ON experiments(updated_at DESC);

-- Comments
COMMENT ON TABLE experiments IS 'Experimentos de pesquisa comportamental';
COMMENT ON COLUMN experiments.condition_sequence IS 'Sequência de condições (ex: ABAC)';
COMMENT ON COLUMN experiments.total_trials IS 'Número total de tentativas (default: 64)';

-- ============================================
-- TABLE: participants
-- Cadastro global de participantes
-- ============================================
CREATE TABLE participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    researcher_id UUID NOT NULL REFERENCES researchers(id) ON DELETE CASCADE,
    
    -- Participant Info
    code TEXT NOT NULL,
    age INTEGER NOT NULL,
    sex TEXT NOT NULL,
    school TEXT,
    
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

-- Comments
COMMENT ON TABLE participants IS 'Pool global de participantes reutilizáveis';
COMMENT ON COLUMN participants.code IS 'Código único do participante (ex: P001, P002)';

-- ============================================
-- TABLE: sessions
-- Sessões experimentais (1 sessão = 1 dupla)
-- ============================================
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    
    -- Session Info
    name TEXT NOT NULL,
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Scheduled',
    
    -- Execution Tracking
    current_trial INTEGER DEFAULT 0,
    current_condition TEXT,
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    
    -- QR Code Access
    qr_code_token TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('Scheduled', 'Running', 'Completed', 'Cancelled')),
    CONSTRAINT valid_current_trial CHECK (current_trial >= 0 AND current_trial <= 1000),
    CONSTRAINT valid_timing CHECK (
        (started_at IS NULL AND completed_at IS NULL) OR
        (started_at IS NOT NULL AND (completed_at IS NULL OR completed_at >= started_at))
    ),
    CONSTRAINT valid_duration CHECK (duration_minutes IS NULL OR duration_minutes > 0)
);

-- Indexes
CREATE INDEX idx_sessions_experiment ON sessions(experiment_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_scheduled_date ON sessions(scheduled_date);
CREATE INDEX idx_sessions_qr_token ON sessions(qr_code_token) WHERE qr_code_token IS NOT NULL;
CREATE INDEX idx_sessions_updated_at ON sessions(updated_at DESC);

-- Comments
COMMENT ON TABLE sessions IS 'Sessões experimentais (cada sessão = 1 dupla de participantes)';
COMMENT ON COLUMN sessions.current_trial IS 'Tentativa atual (0 = não iniciada, 1-64 = em progresso)';
COMMENT ON COLUMN sessions.qr_code_token IS 'Token único para acesso via QR code';

-- ============================================
-- TABLE: session_participants
-- Relacionamento sessão-participantes (exatamente 2)
-- ============================================
CREATE TABLE session_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    
    -- Role in session
    role TEXT NOT NULL,
    
    -- Connection Status
    connection_status TEXT DEFAULT 'Waiting',
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
CREATE INDEX idx_session_participants_role ON session_participants(session_id, role);

-- Comments
COMMENT ON TABLE session_participants IS 'Join table: cada sessão tem exatamente 2 participantes';
COMMENT ON COLUMN session_participants.role IS 'Papel na sessão: participant_1 ou participant_2';

-- Trigger: Enforce exactly 2 participants per session
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

-- ============================================
-- TABLE: trials
-- Tentativas individuais do experimento
-- ============================================
CREATE TABLE trials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    
    -- Trial Identification
    trial_number INTEGER NOT NULL,
    condition TEXT NOT NULL,
    
    -- Stimulus Card
    card_type TEXT NOT NULL,
    card_image_url TEXT,
    card_description TEXT,
    
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
    CONSTRAINT valid_trial_number CHECK (trial_number >= 1 AND trial_number <= 1000),
    CONSTRAINT valid_card_type CHECK (card_type IN ('Justa', 'Injusta')),
    CONSTRAINT valid_coins CHECK (
        distributor_coins >= 0 AND 
        recipient_coins >= 0
    ),
    CONSTRAINT valid_duration CHECK (duration_seconds IS NULL OR duration_seconds > 0),
    CONSTRAINT unique_session_trial UNIQUE (session_id, trial_number)
);

-- Indexes
CREATE INDEX idx_trials_session ON trials(session_id);
CREATE INDEX idx_trials_trial_number ON trials(session_id, trial_number);
CREATE INDEX idx_trials_condition ON trials(condition);
CREATE INDEX idx_trials_card_type ON trials(card_type);
CREATE INDEX idx_trials_started_at ON trials(started_at DESC);

-- Comments
COMMENT ON TABLE trials IS 'Tentativas individuais (64 por sessão)';
COMMENT ON COLUMN trials.card_type IS 'Tipo do cartão: Justa ou Injusta';

-- ============================================
-- TABLE: judgments
-- Julgamentos dos participantes sobre as tentativas
-- ============================================
CREATE TABLE judgments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trial_id UUID NOT NULL REFERENCES trials(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    
    -- Judgment
    judgment TEXT NOT NULL,
    
    -- Timing
    judged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reaction_time_ms INTEGER,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_judgment CHECK (judgment IN ('Justa', 'Injusta')),
    CONSTRAINT valid_reaction_time CHECK (reaction_time_ms IS NULL OR reaction_time_ms > 0),
    CONSTRAINT unique_trial_participant_judgment UNIQUE (trial_id, participant_id)
);

-- Indexes
CREATE INDEX idx_judgments_trial ON judgments(trial_id);
CREATE INDEX idx_judgments_participant ON judgments(participant_id);
CREATE INDEX idx_judgments_judgment ON judgments(judgment);
CREATE INDEX idx_judgments_judged_at ON judgments(judged_at DESC);

-- Comments
COMMENT ON TABLE judgments IS 'Julgamentos (2 por tentativa: 1 por participante)';
COMMENT ON COLUMN judgments.judgment IS 'Julgamento: Justa ou Injusta';

-- ============================================
-- TABLE: punishments
-- Punições aplicadas após julgamento de "Injusta"
-- ============================================
CREATE TABLE punishments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    judgment_id UUID NOT NULL REFERENCES judgments(id) ON DELETE CASCADE,
    trial_id UUID NOT NULL REFERENCES trials(id) ON DELETE CASCADE,
    punisher_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    
    -- Punishment Decision
    punish_decision BOOLEAN NOT NULL,
    coins_removed INTEGER DEFAULT 0,
    self_cost INTEGER DEFAULT 0,
    
    -- Sound Feedback
    punishment_sound_played BOOLEAN DEFAULT FALSE,
    
    -- Timing
    decided_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    decision_time_ms INTEGER,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_coins_removed CHECK (coins_removed >= 0),
    CONSTRAINT valid_self_cost CHECK (self_cost >= 0),
    CONSTRAINT valid_decision_time CHECK (decision_time_ms IS NULL OR decision_time_ms > 0)
);

-- Indexes
CREATE INDEX idx_punishments_judgment ON punishments(judgment_id);
CREATE INDEX idx_punishments_trial ON punishments(trial_id);
CREATE INDEX idx_punishments_punisher ON punishments(punisher_id);
CREATE INDEX idx_punishments_decision ON punishments(punish_decision);
CREATE INDEX idx_punishments_decided_at ON punishments(decided_at DESC);

-- Comments
COMMENT ON TABLE punishments IS 'Punições aplicadas (só após julgamento "Injusta")';
COMMENT ON COLUMN punishments.punish_decision IS 'TRUE = decidiu punir, FALSE = decidiu não punir';

-- ============================================
-- TABLE: cultural_consequences
-- Consequências culturais (som especial quando há consenso)
-- ============================================
CREATE TABLE cultural_consequences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trial_id UUID NOT NULL REFERENCES trials(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    
    -- Consensus Information
    both_judged_unjust BOOLEAN NOT NULL,
    both_punished BOOLEAN NOT NULL,
    
    -- Cultural Sound
    culturant_sound_played BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_cultural_consequences_trial ON cultural_consequences(trial_id);
CREATE INDEX idx_cultural_consequences_session ON cultural_consequences(session_id);
CREATE INDEX idx_cultural_consequences_consensus ON cultural_consequences(both_judged_unjust, both_punished);
CREATE INDEX idx_cultural_consequences_triggered_at ON cultural_consequences(triggered_at DESC);

-- Comments
COMMENT ON TABLE cultural_consequences IS 'Consequências culturais (quando ambos julgam injusta E punem)';
COMMENT ON COLUMN cultural_consequences.culturant_sound_played IS 'Som culturante (sequência ascendente)';

-- ============================================
-- MATERIALIZED VIEW: experiment_analytics
-- Analytics pré-calculadas para performance
-- ============================================
CREATE MATERIALIZED VIEW experiment_analytics AS
SELECT
    e.id AS experiment_id,
    e.name AS experiment_name,
    e.researcher_id,
    e.status AS experiment_status,
    
    -- Session Counts
    COUNT(DISTINCT s.id) AS total_sessions,
    COUNT(DISTINCT CASE WHEN s.status = 'Completed' THEN s.id END) AS completed_sessions,
    COUNT(DISTINCT CASE WHEN s.status = 'Running' THEN s.id END) AS running_sessions,
    COUNT(DISTINCT CASE WHEN s.status = 'Scheduled' THEN s.id END) AS scheduled_sessions,
    
    -- Participant Counts
    COUNT(DISTINCT sp.participant_id) AS total_participants,
    
    -- Trial Counts
    COUNT(DISTINCT t.id) AS total_trials,
    COUNT(DISTINCT CASE WHEN t.card_type = 'Justa' THEN t.id END) AS just_trials,
    COUNT(DISTINCT CASE WHEN t.card_type = 'Injusta' THEN t.id END) AS unjust_trials,
    
    -- Judgment Statistics
    COUNT(DISTINCT j.id) AS total_judgments,
    COUNT(DISTINCT CASE WHEN j.judgment = 'Injusta' THEN j.id END) AS unjust_judgments,
    ROUND(
        100.0 * COUNT(DISTINCT CASE WHEN j.judgment = 'Injusta' THEN j.id END) / 
        NULLIF(COUNT(DISTINCT j.id), 0), 
        2
    ) AS unjust_percentage,
    
    -- Punishment Statistics
    COUNT(DISTINCT p.id) AS total_punishment_opportunities,
    COUNT(DISTINCT CASE WHEN p.punish_decision = TRUE THEN p.id END) AS actual_punishments,
    ROUND(
        100.0 * COUNT(DISTINCT CASE WHEN p.punish_decision = TRUE THEN p.id END) / 
        NULLIF(COUNT(DISTINCT p.id), 0), 
        2
    ) AS punishment_rate,
    
    -- Cultural Consequences
    COUNT(DISTINCT cc.id) AS cultural_consequences_count,
    
    -- Timing Averages
    ROUND(AVG(s.duration_minutes), 2) AS avg_session_duration_minutes,
    ROUND(AVG(t.duration_seconds), 2) AS avg_trial_duration_seconds,
    ROUND(AVG(j.reaction_time_ms), 2) AS avg_judgment_reaction_time_ms,
    ROUND(AVG(p.decision_time_ms), 2) AS avg_punishment_decision_time_ms,
    
    -- Dates
    MIN(s.scheduled_date) AS first_session_date,
    MAX(s.scheduled_date) AS last_session_date,
    MAX(s.updated_at) AS last_updated
    
FROM experiments e
LEFT JOIN sessions s ON e.id = s.experiment_id
LEFT JOIN session_participants sp ON s.id = sp.session_id
LEFT JOIN trials t ON s.id = t.session_id
LEFT JOIN judgments j ON t.id = j.trial_id
LEFT JOIN punishments p ON j.id = p.judgment_id
LEFT JOIN cultural_consequences cc ON t.id = cc.trial_id
GROUP BY e.id, e.name, e.researcher_id, e.status;

-- Index for fast lookups
CREATE UNIQUE INDEX idx_experiment_analytics_id ON experiment_analytics(experiment_id);
CREATE INDEX idx_experiment_analytics_researcher ON experiment_analytics(researcher_id);

-- Comments
COMMENT ON MATERIALIZED VIEW experiment_analytics IS 'Analytics pré-calculadas por experimento (refresh manual ou via trigger)';

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_experiment_analytics()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY experiment_analytics;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- Segurança por linha: pesquisadores só veem seus dados
-- ============================================

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

-- Trials: through sessions
CREATE POLICY trials_own_data ON trials
    FOR ALL
    USING (
        session_id IN (
            SELECT s.id FROM sessions s
            JOIN experiments e ON s.experiment_id = e.id
            JOIN researchers r ON e.researcher_id = r.id
            WHERE r.auth_user_id = auth.uid()
        )
    );

-- Judgments: through trials
CREATE POLICY judgments_own_data ON judgments
    FOR ALL
    USING (
        trial_id IN (
            SELECT t.id FROM trials t
            JOIN sessions s ON t.session_id = s.id
            JOIN experiments e ON s.experiment_id = e.id
            JOIN researchers r ON e.researcher_id = r.id
            WHERE r.auth_user_id = auth.uid()
        )
    );

-- Punishments: through trials
CREATE POLICY punishments_own_data ON punishments
    FOR ALL
    USING (
        trial_id IN (
            SELECT t.id FROM trials t
            JOIN sessions s ON t.session_id = s.id
            JOIN experiments e ON s.experiment_id = e.id
            JOIN researchers r ON e.researcher_id = r.id
            WHERE r.auth_user_id = auth.uid()
        )
    );

-- Cultural Consequences: through trials
CREATE POLICY cultural_consequences_own_data ON cultural_consequences
    FOR ALL
    USING (
        trial_id IN (
            SELECT t.id FROM trials t
            JOIN sessions s ON t.session_id = s.id
            JOIN experiments e ON s.experiment_id = e.id
            JOIN researchers r ON e.researcher_id = r.id
            WHERE r.auth_user_id = auth.uid()
        )
    );

-- ============================================
-- FUNCTIONS: Helper functions for common operations
-- ============================================

-- Function: Get session with participants
CREATE OR REPLACE FUNCTION get_session_with_participants(session_uuid UUID)
RETURNS TABLE (
    session_id UUID,
    session_name TEXT,
    status TEXT,
    current_trial INTEGER,
    participant1_id UUID,
    participant1_code TEXT,
    participant1_status TEXT,
    participant2_id UUID,
    participant2_code TEXT,
    participant2_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        s.status,
        s.current_trial,
        p1.id,
        p1.code,
        sp1.connection_status,
        p2.id,
        p2.code,
        sp2.connection_status
    FROM sessions s
    JOIN session_participants sp1 ON s.id = sp1.session_id AND sp1.role = 'participant_1'
    JOIN session_participants sp2 ON s.id = sp2.session_id AND sp2.role = 'participant_2'
    JOIN participants p1 ON sp1.participant_id = p1.id
    JOIN participants p2 ON sp2.participant_id = p2.id
    WHERE s.id = session_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function: Check if trial should trigger cultural consequence
CREATE OR REPLACE FUNCTION check_cultural_consequence(trial_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    unjust_count INTEGER;
    punishment_count INTEGER;
BEGIN
    -- Count "Injusta" judgments
    SELECT COUNT(*) INTO unjust_count
    FROM judgments
    WHERE trial_id = trial_uuid AND judgment = 'Injusta';
    
    -- Count actual punishments
    SELECT COUNT(*) INTO punishment_count
    FROM punishments
    WHERE trial_id = trial_uuid AND punish_decision = TRUE;
    
    -- Cultural consequence if both judged unjust AND both punished
    RETURN (unjust_count = 2 AND punishment_count = 2);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SEED DATA (Optional - for testing)
-- ============================================

-- Insert a test researcher (requires auth.users to exist first)
-- This would typically be done after Supabase Auth is configured
/*
INSERT INTO researchers (id, email, name, institution, auth_user_id) VALUES
    ('00000000-0000-0000-0000-000000000001', 'test@example.com', 'Dr. Teste', 'Universidade Teste', NULL);

INSERT INTO experiments (id, researcher_id, name, description, status, condition_sequence) VALUES
    ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Experimento Teste', 'Descrição teste', 'Ativo', 'ABAC');
*/

-- ============================================
-- COMPLETION
-- ============================================

-- Grant permissions (adjust as needed for your Supabase setup)
-- GRANT USAGE ON SCHEMA public TO authenticated;
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database migration completed successfully!';
    RAISE NOTICE 'Tables created: researchers, experiments, participants, sessions, session_participants, trials, judgments, punishments, cultural_consequences';
    RAISE NOTICE 'Materialized view created: experiment_analytics';
    RAISE NOTICE 'RLS policies enabled on all tables';
    RAISE NOTICE 'Helper functions created: get_session_with_participants, check_cultural_consequence';
END $$;
