import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/config/prisma', () => ({
  prisma: {
    sessionParticipant: { findUnique: vi.fn(), findMany: vi.fn() },
    attempt:  { findUnique: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn() },
    response: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
    session:  { update: vi.fn() },
    trialRecord: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('../../src/services/trial.service', () => ({
  recordJudgment:    vi.fn(),
  recordPunishment:  vi.fn(),
  finalizeAttempt:   vi.fn(),
  acknowledgeResult: vi.fn(),
}));

vi.mock('../../src/services/participant.service', () => ({
  getParticipantState: vi.fn(),
}));

import {
  submitJudgment, submitPunishment, submitAcknowledge,
  markStoryShown, markNextStoryAvailable,
} from '../../src/services/response.service';
import { Prisma } from '@prisma/client';
import { SessionBootstrapError } from '../../src/services/session.drafts';
import { prisma } from '../../src/config/prisma';
import * as trialService from '../../src/services/trial.service';
import * as participantService from '../../src/services/participant.service';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockSp         = { id: 'sp-001', sessionId: 'sess-001', accessToken: 'tok', session: { status: 'IN_PROGRESS' } };
const mockAttempt    = { id: 'att-001', sessionId: 'sess-001', globalNumber: 5,  completedAt: null };
const mockAttemptDone  = { id: 'att-001', sessionId: 'sess-001', globalNumber: 5,  completedAt: new Date() };
const mockAttempt64Done = { id: 'att-064', sessionId: 'sess-001', globalNumber: 64, completedAt: new Date() };
const twoParticipants   = [{ id: 'sp-001' }, { id: 'sp-002' }];

const mockStateWaiting    = { stage: 'WAITING_JUDGMENT_PARTNER' };
const mockStateResult     = { stage: 'RESULT' };
const mockStateWaitResult = { stage: 'WAITING_RESULT_PARTNER' };
const mockStateCompleted  = { stage: 'COMPLETED' };

// ---------------------------------------------------------------------------
// Helpers — configuram todos os mocks necessários para o caminho feliz.
// Cada helper é auto-suficiente: não depende de estado de testes anteriores.
// ---------------------------------------------------------------------------

function setupJudgmentHappy() {
  vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSp as never);
  vi.mocked(prisma.attempt.findUnique).mockResolvedValue(mockAttempt as never);
  vi.mocked(prisma.attempt.findFirst)
    .mockResolvedValueOnce({ id: 'att-001' } as never) // firstPending
    .mockResolvedValueOnce(null as never);              // hasPendingResult → sem pendente
  vi.mocked(prisma.response.findUnique).mockResolvedValue(null as never);
  vi.mocked(trialService.recordJudgment).mockResolvedValue(undefined as never);
  vi.mocked(participantService.getParticipantState).mockResolvedValue(mockStateWaiting as never);
}

/**
 * Configura o caminho feliz de submitPunishment.
 * A sequência de mockResolvedValueOnce segue a ordem exata de chamadas no service:
 *   1. resolveActive → sessionParticipant.findUnique
 *   2. resolveActive → attempt.findUnique
 *   3. attempt.findFirst (primeiro pendente)
 *   4. sessionParticipant.findMany (bothHaveField)
 *   5. response.findUnique × 2 (bothHaveField judgment: sp-001, sp-002)
 *   6. response.findUnique (getOwnResponse — punishment prévio)
 *   7. response.findUnique × 2 (bothHaveField punishment: sp-001, sp-002)
 */
function setupPunishmentHappy(bothPunished = false) {
  vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSp as never);
  vi.mocked(prisma.attempt.findUnique).mockResolvedValue(mockAttempt as never);
  vi.mocked(prisma.attempt.findFirst)
    .mockResolvedValueOnce({ id: 'att-001' } as never) // firstPending
    .mockResolvedValueOnce(null as never);              // hasPendingResult → sem pendente
  vi.mocked(prisma.sessionParticipant.findMany).mockResolvedValue(twoParticipants as never);
  vi.mocked(trialService.recordPunishment).mockResolvedValue(undefined as never);
  vi.mocked(trialService.finalizeAttempt).mockResolvedValue(undefined as never);
  vi.mocked(participantService.getParticipantState).mockResolvedValue(mockStateResult as never);

  // bothHaveField('judgment'): sp-001 e sp-002 ambos têm
  vi.mocked(prisma.response.findUnique)
    .mockResolvedValueOnce({ judgment: 'Just', punishment: null, resultAcknowledgedAt: null } as never)
    .mockResolvedValueOnce({ judgment: 'Just', punishment: null, resultAcknowledgedAt: null } as never)
    // getOwnResponse: sem punishment prévio
    .mockResolvedValueOnce(null as never);

  // bothHaveField('punishment')
  if (bothPunished) {
    vi.mocked(prisma.response.findUnique)
      .mockResolvedValueOnce({ judgment: 'Just', punishment: 'Punish', resultAcknowledgedAt: null } as never)
      .mockResolvedValueOnce({ judgment: 'Just', punishment: 'Punish', resultAcknowledgedAt: null } as never);
  } else {
    vi.mocked(prisma.response.findUnique)
      .mockResolvedValueOnce({ judgment: 'Just', punishment: 'Punish', resultAcknowledgedAt: null } as never)
      .mockResolvedValueOnce(null as never); // sp-002 ainda não puniu
  }
}

// resetAllMocks garante que implementações (mockResolvedValue) não vazam entre testes
beforeEach(() => { vi.resetAllMocks(); });

// ===========================================================================
// submitJudgment — validações
// ===========================================================================

describe('submitJudgment — validações', () => {
  it('token inválido → erro', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(null as never);
    await expect(submitJudgment('bad', 'att-001', 'Just')).rejects.toThrow(/inválido/);
  });

  it('Session não IN_PROGRESS → erro', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(
      { ...mockSp, session: { status: 'WAITING' } } as never
    );
    // resolveActive carrega attempt antes de verificar session.status
    vi.mocked(prisma.attempt.findUnique).mockResolvedValue(mockAttempt as never);
    await expect(submitJudgment('tok', 'att-001', 'Just')).rejects.toThrow(/IN_PROGRESS/);
  });

  it('Attempt inexistente → erro', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSp as never);
    vi.mocked(prisma.attempt.findUnique).mockResolvedValue(null as never);
    await expect(submitJudgment('tok', 'att-999', 'Just')).rejects.toThrow(/não encontrado/);
  });

  it('Attempt de outra Session → erro', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSp as never);
    vi.mocked(prisma.attempt.findUnique).mockResolvedValue(
      { ...mockAttempt, sessionId: 'sess-OUTRA' } as never
    );
    await expect(submitJudgment('tok', 'att-001', 'Just')).rejects.toThrow(/não pertence/);
  });

  it('Attempt já finalizado sem resposta → erro (não busca firstPending)', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSp as never);
    vi.mocked(prisma.attempt.findUnique).mockResolvedValue(mockAttemptDone as never);
    vi.mocked(prisma.response.findUnique).mockResolvedValue(null as never);
    await expect(submitJudgment('tok', 'att-001', 'Just')).rejects.toThrow(/finalizado/);
    expect(prisma.attempt.findFirst).not.toHaveBeenCalled();
  });

  it('Attempt fora de ordem → erro', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSp as never);
    vi.mocked(prisma.attempt.findUnique).mockResolvedValue(mockAttempt as never);
    vi.mocked(prisma.attempt.findFirst).mockResolvedValue({ id: 'att-002' } as never);
    await expect(submitJudgment('tok', 'att-001', 'Just')).rejects.toThrow(/não é o próximo/);
  });

  it('retry com mesmo judgment é idempotente', async () => {
    setupJudgmentHappy();
    // sobrescreve o response.findUnique configurado no helper
    vi.mocked(prisma.response.findUnique).mockResolvedValue(
      { judgment: 'Just', punishment: null, resultAcknowledgedAt: null } as never
    );
    await submitJudgment('tok', 'att-001', 'Just');
    expect(trialService.recordJudgment).not.toHaveBeenCalled();
  });

  it('valor diferente ao registrado → 409', async () => {
    setupJudgmentHappy();
    vi.mocked(prisma.response.findUnique).mockResolvedValue(
      { judgment: 'Just', punishment: null, resultAcknowledgedAt: null } as never
    );
    await expect(submitJudgment('tok', 'att-001', 'Unjust')).rejects.toThrow(/Julgamento já registrado/);
  });

  it('chama recordJudgment com sp.id correto', async () => {
    setupJudgmentHappy();
    await submitJudgment('tok', 'att-001', 'Just');
    expect(trialService.recordJudgment).toHaveBeenCalledWith('att-001', 'sp-001', 'Just');
  });

  it('nunca chama finalizeAttempt', async () => {
    setupJudgmentHappy();
    await submitJudgment('tok', 'att-001', 'Just');
    expect(trialService.finalizeAttempt).not.toHaveBeenCalled();
  });

  it('retry com mesmo valor após Attempt finalizado → idempotente', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSp as never);
    vi.mocked(prisma.attempt.findUnique).mockResolvedValue(mockAttemptDone as never);
    vi.mocked(prisma.response.findUnique).mockResolvedValue(
      { judgment: 'Just', punishment: 'Punish', resultAcknowledgedAt: null } as never
    );
    vi.mocked(participantService.getParticipantState).mockResolvedValue(mockStateResult as never);
    const result = await submitJudgment('tok', 'att-001', 'Just');
    expect(trialService.recordJudgment).not.toHaveBeenCalled();
    expect(result).toBe(mockStateResult);
  });

  it('valor diferente após Attempt finalizado → 409', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSp as never);
    vi.mocked(prisma.attempt.findUnique).mockResolvedValue(mockAttemptDone as never);
    vi.mocked(prisma.response.findUnique).mockResolvedValue(
      { judgment: 'Just', punishment: 'Punish', resultAcknowledgedAt: null } as never
    );
    await expect(submitJudgment('tok', 'att-001', 'Unjust')).rejects.toThrow(/Julgamento já registrado/);
  });
});

// ===========================================================================
// submitPunishment — bloqueio antes do segundo judgment
// ===========================================================================

describe('submitPunishment — bloqueia se parceiro não julgou', () => {
  it('parceiro sem judgment → 409', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSp as never);
    vi.mocked(prisma.attempt.findUnique).mockResolvedValue(mockAttempt as never);
    vi.mocked(prisma.attempt.findFirst)
      .mockResolvedValueOnce({ id: 'att-001' } as never) // firstPending
      .mockResolvedValueOnce(null as never);              // hasPendingResult → sem pendente
    vi.mocked(prisma.sessionParticipant.findMany).mockResolvedValue(twoParticipants as never);
    // bothHaveField('judgment'): sp-001 tem, sp-002 não tem
    vi.mocked(prisma.response.findUnique)
      .mockResolvedValueOnce({ judgment: 'Just', punishment: null, resultAcknowledgedAt: null } as never)
      .mockResolvedValueOnce(null as never);
    await expect(submitPunishment('tok', 'att-001', 'Punish'))
      .rejects.toThrow(/Aguardando julgamento do parceiro/);
    expect(trialService.recordPunishment).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// submitPunishment — validações
// ===========================================================================

describe('submitPunishment — validações', () => {
  it('token inválido → erro', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(null as never);
    await expect(submitPunishment('bad', 'att-001', 'Punish')).rejects.toThrow(/inválido/);
  });

  it('Session não IN_PROGRESS → erro', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(
      { ...mockSp, session: { status: 'WAITING' } } as never
    );
    // resolveActive carrega attempt antes de verificar session.status
    vi.mocked(prisma.attempt.findUnique).mockResolvedValue(mockAttempt as never);
    await expect(submitPunishment('tok', 'att-001', 'Punish')).rejects.toThrow(/IN_PROGRESS/);
  });

  it('Attempt inexistente → erro', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSp as never);
    vi.mocked(prisma.attempt.findUnique).mockResolvedValue(null as never);
    await expect(submitPunishment('tok', 'att-999', 'Punish')).rejects.toThrow(/não encontrado/);
  });

  it('Attempt de outra Session → erro', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSp as never);
    vi.mocked(prisma.attempt.findUnique).mockResolvedValue(
      { ...mockAttempt, sessionId: 'sess-OUTRA' } as never
    );
    await expect(submitPunishment('tok', 'att-001', 'Punish')).rejects.toThrow(/não pertence/);
  });

  it('Attempt já finalizado sem resposta → erro', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSp as never);
    vi.mocked(prisma.attempt.findUnique).mockResolvedValue(mockAttemptDone as never);
    vi.mocked(prisma.response.findUnique).mockResolvedValue(null as never);
    await expect(submitPunishment('tok', 'att-001', 'Punish')).rejects.toThrow(/finalizado/);
  });

  it('Attempt fora de ordem → erro', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSp as never);
    vi.mocked(prisma.attempt.findUnique).mockResolvedValue(mockAttempt as never);
    vi.mocked(prisma.attempt.findFirst).mockResolvedValue({ id: 'att-002' } as never);
    await expect(submitPunishment('tok', 'att-001', 'Punish')).rejects.toThrow(/não é o próximo/);
  });

  it('valor diferente ao registrado → 409', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSp as never);
    vi.mocked(prisma.attempt.findUnique).mockResolvedValue(mockAttempt as never);
    vi.mocked(prisma.attempt.findFirst)
      .mockResolvedValueOnce({ id: 'att-001' } as never) // firstPending
      .mockResolvedValueOnce(null as never);              // hasPendingResult → sem pendente
    vi.mocked(prisma.sessionParticipant.findMany).mockResolvedValue(twoParticipants as never);
    // bothHaveField('judgment'): ambos têm
    vi.mocked(prisma.response.findUnique)
      .mockResolvedValueOnce({ judgment: 'Just', punishment: null, resultAcknowledgedAt: null } as never)
      .mockResolvedValueOnce({ judgment: 'Just', punishment: null, resultAcknowledgedAt: null } as never)
      // getOwnResponse: punishment já registrado
      .mockResolvedValueOnce({ judgment: 'Just', punishment: 'Punish', resultAcknowledgedAt: null } as never);
    await expect(submitPunishment('tok', 'att-001', 'NoPunish')).rejects.toThrow(/já registrada/);
  });
});

// ===========================================================================
// submitPunishment — coordenação de rodada
// ===========================================================================

describe('submitPunishment — coordenação de rodada', () => {
  it('ambos julgaram → punishment aceito (não bloqueia)', async () => {
    // Verifica que quando bothHaveField('judgment') = true,
    // recordPunishment é chamado normalmente sem lançar erro de bloqueio
    setupPunishmentHappy(false);
    await submitPunishment('tok', 'att-001', 'Punish');
    expect(trialService.recordPunishment).toHaveBeenCalledWith('att-001', 'sp-001', 'Punish');
  });

  it('apenas um puniu → não chama finalizeAttempt, retorna estado WAITING_PUNISHMENT_PARTNER', async () => {
    setupPunishmentHappy(false);
    vi.mocked(participantService.getParticipantState).mockResolvedValue(
      { stage: 'WAITING_PUNISHMENT_PARTNER' } as never
    );
    const result = await submitPunishment('tok', 'att-001', 'Punish');
    expect(trialService.finalizeAttempt).not.toHaveBeenCalled();
    expect((result as { stage: string }).stage).toBe('WAITING_PUNISHMENT_PARTNER');
  });

  it('ambos puniram → chama finalizeAttempt', async () => {
    setupPunishmentHappy(true);
    await submitPunishment('tok', 'att-001', 'Punish');
    expect(trialService.finalizeAttempt).toHaveBeenCalledWith('att-001');
  });

  it('só um puniu → não chama finalizeAttempt', async () => {
    setupPunishmentHappy(false);
    await submitPunishment('tok', 'att-001', 'Punish');
    expect(trialService.finalizeAttempt).not.toHaveBeenCalled();
  });

  it('chama recordPunishment com sp.id correto', async () => {
    setupPunishmentHappy(false);
    await submitPunishment('tok', 'att-001', 'Punish');
    expect(trialService.recordPunishment).toHaveBeenCalledWith('att-001', 'sp-001', 'Punish');
  });

  it('retorno após ambos punirem chama getParticipantState', async () => {
    setupPunishmentHappy(true);
    const result = await submitPunishment('tok', 'att-001', 'Punish');
    expect(participantService.getParticipantState).toHaveBeenCalledWith('tok');
    expect(result).toBe(mockStateResult);
  });

  it('retry idempotente em attempt ativo continua verificando coordenação', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSp as never);
    vi.mocked(prisma.attempt.findUnique).mockResolvedValue(mockAttempt as never);
    vi.mocked(prisma.attempt.findFirst)
      .mockResolvedValueOnce({ id: 'att-001' } as never) // firstPending
      .mockResolvedValueOnce(null as never);              // hasPendingResult → sem pendente
    vi.mocked(prisma.sessionParticipant.findMany).mockResolvedValue(twoParticipants as never);
    vi.mocked(trialService.finalizeAttempt).mockResolvedValue(undefined as never);
    vi.mocked(participantService.getParticipantState).mockResolvedValue(mockStateResult as never);
    // bothHaveField('judgment'): ambos têm
    vi.mocked(prisma.response.findUnique)
      .mockResolvedValueOnce({ judgment: 'Just', punishment: null, resultAcknowledgedAt: null } as never)
      .mockResolvedValueOnce({ judgment: 'Just', punishment: null, resultAcknowledgedAt: null } as never)
      // getOwnResponse: punishment já existe (retry)
      .mockResolvedValueOnce({ judgment: 'Just', punishment: 'Punish', resultAcknowledgedAt: null } as never)
      // bothHaveField('punishment'): ambos têm
      .mockResolvedValueOnce({ judgment: 'Just', punishment: 'Punish', resultAcknowledgedAt: null } as never)
      .mockResolvedValueOnce({ judgment: 'Just', punishment: 'Punish', resultAcknowledgedAt: null } as never);
    await submitPunishment('tok', 'att-001', 'Punish');
    expect(trialService.recordPunishment).not.toHaveBeenCalled();
    expect(trialService.finalizeAttempt).toHaveBeenCalledWith('att-001');
  });
});

// ===========================================================================
// submitPunishment — idempotência pós-finalização
// ===========================================================================

describe('submitPunishment — pós-finalização', () => {
  it('retry com mesmo punishment após Attempt finalizado → idempotente', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSp as never);
    vi.mocked(prisma.attempt.findUnique).mockResolvedValue(mockAttemptDone as never);
    vi.mocked(prisma.response.findUnique).mockResolvedValue(
      { judgment: 'Just', punishment: 'Punish', resultAcknowledgedAt: null } as never
    );
    vi.mocked(participantService.getParticipantState).mockResolvedValue(mockStateResult as never);
    const result = await submitPunishment('tok', 'att-001', 'Punish');
    expect(trialService.recordPunishment).not.toHaveBeenCalled();
    expect(result).toBe(mockStateResult);
  });

  it('retry com mesmo punishment após trial 64 / COMPLETED → idempotente', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSp as never);
    vi.mocked(prisma.attempt.findUnique).mockResolvedValue(mockAttempt64Done as never);
    vi.mocked(prisma.response.findUnique).mockResolvedValue(
      { judgment: 'Just', punishment: 'NoPunish', resultAcknowledgedAt: new Date() } as never
    );
    vi.mocked(participantService.getParticipantState).mockResolvedValue(mockStateCompleted as never);
    const result = await submitPunishment('tok', 'att-064', 'NoPunish');
    expect(result).toBe(mockStateCompleted);
  });

  it('valor diferente após Attempt finalizado → 409', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSp as never);
    vi.mocked(prisma.attempt.findUnique).mockResolvedValue(mockAttemptDone as never);
    vi.mocked(prisma.response.findUnique).mockResolvedValue(
      { judgment: 'Just', punishment: 'Punish', resultAcknowledgedAt: null } as never
    );
    await expect(submitPunishment('tok', 'att-001', 'NoPunish')).rejects.toThrow(/já registrada/);
  });

  it('response.service não chama session.update diretamente', async () => {
    setupPunishmentHappy(true);
    await submitPunishment('tok', 'att-001', 'Punish');
    expect(prisma.session.update).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// submitAcknowledge
// ===========================================================================

describe('submitAcknowledge', () => {
  it('delega para acknowledgeResult com ids corretos', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSp as never);
    vi.mocked(prisma.attempt.findUnique).mockResolvedValue(mockAttemptDone as never);
    vi.mocked(trialService.acknowledgeResult).mockResolvedValue(undefined as never);
    vi.mocked(participantService.getParticipantState).mockResolvedValue(mockStateWaitResult as never);
    const result = await submitAcknowledge('tok', 'att-001');
    expect(trialService.acknowledgeResult).toHaveBeenCalledWith('att-001', 'sp-001');
    expect(result).toBe(mockStateWaitResult);
  });

  it('ack intermediário → retorna WAITING_RESULT_PARTNER', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSp as never);
    vi.mocked(prisma.attempt.findUnique).mockResolvedValue(mockAttemptDone as never);
    vi.mocked(trialService.acknowledgeResult).mockResolvedValue(undefined as never);
    vi.mocked(participantService.getParticipantState).mockResolvedValue(mockStateWaitResult as never);
    const result = await submitAcknowledge('tok', 'att-001');
    expect(result).toBe(mockStateWaitResult);
  });

  it('ack final (trial 64) → retorna COMPLETED', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSp as never);
    vi.mocked(prisma.attempt.findUnique).mockResolvedValue(mockAttempt64Done as never);
    vi.mocked(trialService.acknowledgeResult).mockResolvedValue(undefined as never);
    vi.mocked(participantService.getParticipantState).mockResolvedValue(mockStateCompleted as never);
    const result = await submitAcknowledge('tok', 'att-064');
    expect(result).toBe(mockStateCompleted);
  });

  it('attempt ainda não finalizado → erro', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSp as never);
    vi.mocked(prisma.attempt.findUnique).mockResolvedValue(mockAttempt as never);
    await expect(submitAcknowledge('tok', 'att-001')).rejects.toThrow(/ainda não foi finalizado/);
  });

  it('token inválido → erro', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(null as never);
    await expect(submitAcknowledge('bad', 'att-001')).rejects.toThrow(/inválido/);
  });
});

// ===========================================================================
// Barreira de resultado pendente
// ===========================================================================

describe('barreira de resultado pendente (submitJudgment)', () => {
  it('trial N finalizada com ack pendente + judgment da trial N+1 → 409', async () => {
    // resolveActive: sp e attempt N+1 (ativo)
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSp as never);
    vi.mocked(prisma.attempt.findUnique).mockResolvedValue(mockAttempt as never); // completedAt: null
    // firstPending aponta para este attempt (em ordem)
    vi.mocked(prisma.attempt.findFirst)
      .mockResolvedValueOnce({ id: 'att-001' } as never)  // firstPending
      .mockResolvedValueOnce({ id: 'att-prev' } as never); // hasPendingResult → encontrou pendente
    await expect(submitJudgment('tok', 'att-001', 'Just'))
      .rejects.toThrow(/Aguardando confirmação do resultado da tentativa anterior/);
    expect(trialService.recordJudgment).not.toHaveBeenCalled();
  });

  it('após ambos os acks (hasPendingResult = null), judgment da trial N+1 → permitido', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSp as never);
    vi.mocked(prisma.attempt.findUnique).mockResolvedValue(mockAttempt as never);
    vi.mocked(prisma.attempt.findFirst)
      .mockResolvedValueOnce({ id: 'att-001' } as never) // firstPending
      .mockResolvedValueOnce(null as never);             // hasPendingResult → nenhum pendente
    vi.mocked(prisma.response.findUnique).mockResolvedValue(null as never);
    vi.mocked(trialService.recordJudgment).mockResolvedValue(undefined as never);
    vi.mocked(participantService.getParticipantState).mockResolvedValue(mockStateWaiting as never);
    await submitJudgment('tok', 'att-001', 'Just');
    expect(trialService.recordJudgment).toHaveBeenCalledWith('att-001', 'sp-001', 'Just');
  });

  it('retry do mesmo judgment na própria trial já finalizada → idempotente (não testa hasPendingResult)', async () => {
    // Attempt já finalizado: vai pelo caminho pós-finalização, não pela barreira
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSp as never);
    vi.mocked(prisma.attempt.findUnique).mockResolvedValue(mockAttemptDone as never);
    vi.mocked(prisma.response.findUnique).mockResolvedValue(
      { judgment: 'Just', punishment: 'Punish', resultAcknowledgedAt: null } as never
    );
    vi.mocked(participantService.getParticipantState).mockResolvedValue(mockStateResult as never);
    const result = await submitJudgment('tok', 'att-001', 'Just');
    expect(trialService.recordJudgment).not.toHaveBeenCalled();
    // hasPendingResult NÃO é chamado — o fluxo retorna antes por completedAt
    expect(prisma.attempt.findFirst).not.toHaveBeenCalled();
    expect(result).toBe(mockStateResult);
  });
});

describe('barreira de resultado pendente (submitPunishment)', () => {
  it('trial N finalizada com ack pendente + punishment da trial N+1 → 409', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSp as never);
    vi.mocked(prisma.attempt.findUnique).mockResolvedValue(mockAttempt as never);
    vi.mocked(prisma.attempt.findFirst)
      .mockResolvedValueOnce({ id: 'att-001' } as never)  // firstPending
      .mockResolvedValueOnce({ id: 'att-prev' } as never); // hasPendingResult → pendente
    await expect(submitPunishment('tok', 'att-001', 'Punish'))
      .rejects.toThrow(/Aguardando confirmação do resultado da tentativa anterior/);
    expect(trialService.recordPunishment).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// F1.3 — marcos de tempo por participante (storyShownAt, nextStoryAvailableAt)
// ===========================================================================
//
// Um "banco" em memória atrás dos mocks do Prisma: só o suficiente para que a
// semântica first-write (updateMany condicional a campo null) e a criação da
// Response possam ser verificadas de verdade, sem Neon.

type FakeResponse = {
  id: string;
  sessionId: string;
  attemptId: string;
  sessionParticipantId: string;
  storyShownAt: Date | null;
  nextStoryAvailableAt: Date | null;
  resultAcknowledgedAt: Date | null;
};

const T1 = new Date('2026-10-11T12:00:00.000Z');
const T2 = new Date('2026-10-11T12:00:07.000Z');
const T3 = new Date('2026-10-11T12:00:15.000Z');

const spP1 = { id: 'sp-001', sessionId: 'sess-001', accessToken: 'tok-p1', session: { status: 'IN_PROGRESS' } };
const spP2 = { id: 'sp-002', sessionId: 'sess-001', accessToken: 'tok-p2', session: { status: 'IN_PROGRESS' } };

function makeFakeDb(opts: {
  attemptCompletedAt?: Date | null;
  attemptStartedAt?: Date | null;
  sessionStatus?: string;
  firstPendingId?: string | null;
  pendingResult?: boolean;
  responses?: Array<Partial<FakeResponse> & { sessionParticipantId: string }>;
} = {}) {
  const attempt = {
    id: 'att-001', sessionId: 'sess-001', globalNumber: 5,
    completedAt: opts.attemptCompletedAt ?? null,
    startedAt: opts.attemptStartedAt ?? null,
  };
  const responses = new Map<string, FakeResponse>();
  for (const r of opts.responses ?? []) {
    responses.set(r.sessionParticipantId, {
      id: `resp-${r.sessionParticipantId}`, sessionId: 'sess-001', attemptId: 'att-001',
      storyShownAt: null, nextStoryAvailableAt: null, resultAcknowledgedAt: null, ...r,
    });
  }
  const status = opts.sessionStatus ?? 'IN_PROGRESS';

  vi.mocked(prisma.sessionParticipant.findUnique).mockImplementation((async (args: { where: { accessToken: string } }) => {
    const sp = [spP1, spP2].find(p => p.accessToken === args.where.accessToken);
    return sp ? { ...sp, session: { status } } : null;
  }) as never);
  vi.mocked(prisma.attempt.findUnique).mockImplementation((async (args: { where: { id: string } }) =>
    args.where.id === attempt.id ? { ...attempt } : null) as never);
  vi.mocked(prisma.attempt.findFirst).mockImplementation((async (args: { where: { completedAt: unknown } }) => {
    // completedAt: null → busca do primeiro pendente; senão → barreira de resultado.
    if (args.where.completedAt === null) {
      const id = opts.firstPendingId === undefined ? attempt.id : opts.firstPendingId;
      return id ? { id } : null;
    }
    return opts.pendingResult ? { id: 'att-000' } : null;
  }) as never);
  vi.mocked(prisma.attempt.updateMany).mockImplementation((async (args: {
    where: { id: string; startedAt?: null }; data: { startedAt: Date };
  }) => {
    if (args.where.id !== attempt.id) return { count: 0 };
    if ('startedAt' in args.where && attempt.startedAt !== null) return { count: 0 };
    attempt.startedAt = args.data.startedAt;
    return { count: 1 };
  }) as never);

  vi.mocked(prisma.response.findUnique).mockImplementation((async (args: {
    where: { attemptId_sessionParticipantId: { attemptId: string; sessionParticipantId: string } };
  }) => {
    const k = args.where.attemptId_sessionParticipantId;
    if (k.attemptId !== attempt.id) return null;
    const r = responses.get(k.sessionParticipantId);
    return r ? { ...r } : null;
  }) as never);
  vi.mocked(prisma.response.updateMany).mockImplementation((async (args: {
    where: Record<string, unknown> & { attemptId: string; sessionParticipantId: string };
    data: Partial<FakeResponse>;
  }) => {
    const r = args.where.attemptId === attempt.id ? responses.get(args.where.sessionParticipantId) : undefined;
    if (!r) return { count: 0 };
    for (const [field, value] of Object.entries(args.where)) {
      if (field === 'attemptId' || field === 'sessionParticipantId') continue;
      if (value === null && (r as Record<string, unknown>)[field] !== null) return { count: 0 };
    }
    Object.assign(r, args.data);
    return { count: 1 };
  }) as never);
  type CreateData = Pick<FakeResponse, 'sessionId' | 'attemptId' | 'sessionParticipantId'> & Partial<FakeResponse>;
  vi.mocked(prisma.response.create).mockImplementation((async (args: { data: CreateData }) => {
    if (responses.has(args.data.sessionParticipantId)) {
      throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002', clientVersion: 'test',
      });
    }
    const row: FakeResponse = {
      id: `resp-${args.data.sessionParticipantId}`, storyShownAt: null,
      nextStoryAvailableAt: null, resultAcknowledgedAt: null, ...args.data,
    };
    responses.set(row.sessionParticipantId, row);
    return { ...row };
  }) as never);
  // Transação interativa: executa o callback com o próprio cliente mockado.
  vi.mocked(prisma.$transaction).mockImplementation((async (fn: (tx: unknown) => unknown) => fn(prisma)) as never);
  vi.mocked(participantService.getParticipantState).mockResolvedValue({ stage: 'JUDGMENT' } as never);

  return { attempt, responses };
}

function setNow(d: Date) { vi.setSystemTime(d); }

describe('markStoryShown', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); });
  afterEach(() => { vi.useRealTimers(); });

  it('primeira chamada cria a Response e grava storyShownAt com o horário do servidor', async () => {
    const db = makeFakeDb();
    setNow(T1);
    const state = await markStoryShown('tok-p1', 'att-001');

    expect(state).toEqual({ stage: 'JUDGMENT' });
    const r = db.responses.get('sp-001')!;
    expect(r.storyShownAt).toEqual(T1);
    expect(r.sessionId).toBe('sess-001');
    expect(r.attemptId).toBe('att-001');
    // A Response nasce sem julgamento: o evento acontece antes dele.
    expect(prisma.response.create).toHaveBeenCalledWith({
      data: { sessionId: 'sess-001', attemptId: 'att-001', sessionParticipantId: 'sp-001', storyShownAt: T1 },
    });
  });

  it('retry não altera o timestamp original', async () => {
    const db = makeFakeDb();
    setNow(T1);
    await markStoryShown('tok-p1', 'att-001');
    setNow(T2);
    await markStoryShown('tok-p1', 'att-001');

    expect(db.responses.get('sp-001')!.storyShownAt).toEqual(T1);
    expect(prisma.response.create).toHaveBeenCalledTimes(1);
  });

  it('P1 e P2 têm timestamps próprios', async () => {
    const db = makeFakeDb();
    setNow(T1);
    await markStoryShown('tok-p1', 'att-001');
    setNow(T2);
    await markStoryShown('tok-p2', 'att-001');

    expect(db.responses.get('sp-001')!.storyShownAt).toEqual(T1);
    expect(db.responses.get('sp-002')!.storyShownAt).toEqual(T2);
  });

  it('primeira apresentação da tentativa preenche Attempt.startedAt', async () => {
    const db = makeFakeDb();
    setNow(T1);
    await markStoryShown('tok-p1', 'att-001');

    expect(db.attempt.startedAt).toEqual(T1);
    expect(prisma.attempt.updateMany).toHaveBeenCalledWith({
      where: { id: 'att-001', startedAt: null },
      data:  { startedAt: T1 },
    });
  });

  it('segunda apresentação (do parceiro) não sobrescreve Attempt.startedAt', async () => {
    const db = makeFakeDb();
    setNow(T1);
    await markStoryShown('tok-p1', 'att-001');
    setNow(T2);
    await markStoryShown('tok-p2', 'att-001');

    expect(db.attempt.startedAt).toEqual(T1);
  });

  it('retry não tenta preencher Attempt.startedAt de novo', async () => {
    makeFakeDb();
    setNow(T1);
    await markStoryShown('tok-p1', 'att-001');
    vi.mocked(prisma.attempt.updateMany).mockClear();
    setNow(T2);
    await markStoryShown('tok-p1', 'att-001');

    expect(prisma.attempt.updateMany).not.toHaveBeenCalled();
  });

  it('não sobrescreve Attempt.startedAt já preenchido (ex.: fallback do recordJudgment)', async () => {
    const db = makeFakeDb({ attemptStartedAt: T1 });
    setNow(T2);
    await markStoryShown('tok-p1', 'att-001');

    expect(db.attempt.startedAt).toEqual(T1);
    expect(db.responses.get('sp-001')!.storyShownAt).toEqual(T2);
  });

  it('Response já existente sem storyShownAt: grava no registro existente, sem criar outro', async () => {
    const db = makeFakeDb({ responses: [{ sessionParticipantId: 'sp-001' }] });
    setNow(T1);
    await markStoryShown('tok-p1', 'att-001');

    expect(db.responses.get('sp-001')!.storyShownAt).toEqual(T1);
    expect(prisma.response.create).not.toHaveBeenCalled();
    expect(db.attempt.startedAt).toEqual(T1);
  });

  it('corrida na criação da Response (P2002): repete uma vez e mantém o primeiro valor', async () => {
    const db = makeFakeDb();
    // Simula a requisição concorrente da mesma criança vencendo entre o
    // updateMany (nada a atualizar) e o create desta chamada.
    const realCreate = vi.mocked(prisma.response.create).getMockImplementation()!;
    vi.mocked(prisma.response.create).mockImplementationOnce((async (args: { data: Partial<FakeResponse> }) => {
      db.responses.set('sp-001', {
        id: 'resp-sp-001', sessionId: 'sess-001', attemptId: 'att-001', sessionParticipantId: 'sp-001',
        storyShownAt: T1, nextStoryAvailableAt: null, resultAcknowledgedAt: null,
      });
      return realCreate(args as never);
    }) as never);
    setNow(T2);

    await expect(markStoryShown('tok-p1', 'att-001')).resolves.toEqual({ stage: 'JUDGMENT' });
    expect(db.responses.get('sp-001')!.storyShownAt).toEqual(T1);
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it('erro que não é P2002 é propagado sem retry', async () => {
    makeFakeDb();
    vi.mocked(prisma.response.create).mockRejectedValueOnce(new Error('DB fora'));
    await expect(markStoryShown('tok-p1', 'att-001')).rejects.toThrow('DB fora');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  // --- validações, iguais às dos endpoints atuais ---------------------------

  it('token inválido → erro de token, sem gravar nada', async () => {
    makeFakeDb();
    await expect(markStoryShown('tok-x', 'att-001')).rejects.toThrow(/Token inválido/);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('attempt inexistente → não encontrado', async () => {
    makeFakeDb();
    await expect(markStoryShown('tok-p1', 'att-999')).rejects.toThrow(/não encontrado/);
  });

  it('attempt de outra sessão → rejeitado', async () => {
    makeFakeDb();
    vi.mocked(prisma.attempt.findUnique).mockResolvedValue(
      { id: 'att-001', sessionId: 'sess-OUTRA', globalNumber: 5, completedAt: null } as never
    );
    await expect(markStoryShown('tok-p1', 'att-001')).rejects.toThrow(/não pertence/);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('sessão fora de IN_PROGRESS → rejeitado', async () => {
    makeFakeDb({ sessionStatus: 'WAITING' });
    await expect(markStoryShown('tok-p1', 'att-001')).rejects.toThrow(/IN_PROGRESS/);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('attempt que não é o próximo pendente → rejeitado', async () => {
    makeFakeDb({ firstPendingId: 'att-000' });
    await expect(markStoryShown('tok-p1', 'att-001')).rejects.toThrow(/não é o próximo/);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('resultado anterior ainda sem ack dos dois → rejeitado', async () => {
    makeFakeDb({ pendingResult: true });
    await expect(markStoryShown('tok-p1', 'att-001')).rejects.toThrow(/Aguardando confirmação/);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('attempt finalizado com storyShownAt já gravado → retry idempotente, sem escrita', async () => {
    const db = makeFakeDb({
      attemptCompletedAt: T3,
      responses: [{ sessionParticipantId: 'sp-001', storyShownAt: T1 }],
    });
    await expect(markStoryShown('tok-p1', 'att-001')).resolves.toEqual({ stage: 'JUDGMENT' });
    expect(db.responses.get('sp-001')!.storyShownAt).toEqual(T1);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('attempt finalizado sem storyShownAt → já foi finalizado', async () => {
    makeFakeDb({ attemptCompletedAt: T3, responses: [{ sessionParticipantId: 'sp-001' }] });
    await expect(markStoryShown('tok-p1', 'att-001')).rejects.toThrow(/já foi finalizado/);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('markNextStoryAvailable', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); });
  afterEach(() => { vi.useRealTimers(); });

  it('attempt não finalizado → rejeitado, sem escrita', async () => {
    makeFakeDb({ responses: [{ sessionParticipantId: 'sp-001' }] });
    await expect(markNextStoryAvailable('tok-p1', 'att-001')).rejects.toThrow(/ainda não foi finalizado/);
    expect(prisma.response.updateMany).not.toHaveBeenCalled();
  });

  it('attempt finalizado → grava nextStoryAvailableAt com o horário do servidor', async () => {
    const db = makeFakeDb({ attemptCompletedAt: T1, responses: [{ sessionParticipantId: 'sp-001' }] });
    setNow(T2);
    const state = await markNextStoryAvailable('tok-p1', 'att-001');

    expect(state).toEqual({ stage: 'JUDGMENT' });
    expect(db.responses.get('sp-001')!.nextStoryAvailableAt).toEqual(T2);
  });

  it('retry não altera o timestamp original', async () => {
    const db = makeFakeDb({ attemptCompletedAt: T1, responses: [{ sessionParticipantId: 'sp-001' }] });
    setNow(T2);
    await markNextStoryAvailable('tok-p1', 'att-001');
    setNow(T3);
    await markNextStoryAvailable('tok-p1', 'att-001');

    expect(db.responses.get('sp-001')!.nextStoryAvailableAt).toEqual(T2);
  });

  it('P1 e P2 têm timestamps independentes', async () => {
    const db = makeFakeDb({
      attemptCompletedAt: T1,
      responses: [{ sessionParticipantId: 'sp-001' }, { sessionParticipantId: 'sp-002' }],
    });
    setNow(T2);
    await markNextStoryAvailable('tok-p1', 'att-001');
    setNow(T3);
    await markNextStoryAvailable('tok-p2', 'att-001');

    expect(db.responses.get('sp-001')!.nextStoryAvailableAt).toEqual(T2);
    expect(db.responses.get('sp-002')!.nextStoryAvailableAt).toEqual(T3);
  });

  it('não mexe em resultAcknowledgedAt nem aciona o ack', async () => {
    const db = makeFakeDb({ attemptCompletedAt: T1, responses: [{ sessionParticipantId: 'sp-001' }] });
    setNow(T2);
    await markNextStoryAvailable('tok-p1', 'att-001');

    expect(db.responses.get('sp-001')!.resultAcknowledgedAt).toBeNull();
    expect(prisma.response.updateMany).toHaveBeenCalledWith({
      where: { attemptId: 'att-001', sessionParticipantId: 'sp-001', nextStoryAvailableAt: null },
      data:  { nextStoryAvailableAt: T2 },
    });
    expect(trialService.acknowledgeResult).not.toHaveBeenCalled();
  });

  it('sem Response do participante → não encontrada, sem escrita', async () => {
    makeFakeDb({ attemptCompletedAt: T1 });
    await expect(markNextStoryAvailable('tok-p1', 'att-001')).rejects.toThrow(/não encontrada/);
    expect(prisma.response.updateMany).not.toHaveBeenCalled();
  });

  it('token inválido → erro de token', async () => {
    makeFakeDb({ attemptCompletedAt: T1 });
    await expect(markNextStoryAvailable('tok-x', 'att-001')).rejects.toThrow(/Token inválido/);
  });

  it('attempt de outra sessão → rejeitado', async () => {
    makeFakeDb({ attemptCompletedAt: T1, responses: [{ sessionParticipantId: 'sp-001' }] });
    vi.mocked(prisma.attempt.findUnique).mockResolvedValue(
      { id: 'att-001', sessionId: 'sess-OUTRA', globalNumber: 5, completedAt: T1 } as never
    );
    await expect(markNextStoryAvailable('tok-p1', 'att-001')).rejects.toThrow(/não pertence/);
    expect(prisma.response.updateMany).not.toHaveBeenCalled();
  });
});
