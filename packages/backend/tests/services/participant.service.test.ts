/**
 * participant.service.test.ts
 * Testes diretos de getParticipantState() com Prisma mockado.
 * Sem banco, sem Neon.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/prisma', () => ({
  prisma: {
    sessionParticipant: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    attempt: { findFirst: vi.fn() },
  },
}));

import { getParticipantState, touchParticipant } from '../../src/services/participant.service';
import { SessionBootstrapError } from '../../src/services/session.drafts';
import { prisma } from '../../src/config/prisma';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SP_ID   = 'sp-001';
const SESS_ID = 'sess-001';
const ATT_ID  = 'att-001';
const NOW     = new Date('2024-01-01T10:00:00Z');

const mockSpBase = {
  id:              SP_ID,
  sessionId:       SESS_ID,
  slot:            'P1',
  displayName:     'Alice',
  participantCode: 'G1P1',
  accessToken:     'tok-abc',       // nunca deve aparecer na resposta
  joinedAt:        NOW,
  lastSeenAt:      NOW,
  createdAt:       NOW,
  session: { id: SESS_ID, name: 'Turma A', status: 'IN_PROGRESS', sequenceVariant: 'ABAC' },
};

const mockAttemptBase = {
  id:                      ATT_ID,
  endowment:               32,
  distributorDistribution: 24,
  receptorDistribution:    8,
  distributorCharacter:    'Lucas',
  receptorCharacter:       'Isaac',
  // campos internos que nunca devem aparecer na resposta pública
  condition:               'A',
  blockNumber:             1,
  globalNumber:            5,
  completedAt:             null,
  trialRecord:             null,
  responses:               [] as Array<{
    sessionParticipantId: string;
    judgment: string | null;
    punishment: string | null;
    resultAcknowledgedAt: Date | null;
  }>,
};

const mockTrialRecord = {
  p1IndividualCost:    1,
  p2IndividualCost:    1,
  p1CoinsAfter:        79,
  p2CoinsAfter:        79,
  punishmentApplied:   true,
  distributorFinal:    8,
  distributorLost:     16,
  culturalConsequence: 3,
  groupCoinsAfter:     3,
};

const mockTrialRecordNoPunish = {
  ...mockTrialRecord,
  punishmentApplied:   false,
  distributorFinal:    24,
  distributorLost:     0,
  culturalConsequence: 3,
  groupCoinsAfter:     3,
};

function ownResponse(
  judgment: string | null = null,
  punishment: string | null = null,
  ack: Date | null = null,
) {
  return { sessionParticipantId: SP_ID, judgment, punishment, resultAcknowledgedAt: ack };
}

/** Registro do parceiro da dupla (sessionParticipant.findFirst). */
const mockPartnerRecord = {
  id:          'sp-002',
  slot:        'P2',
  displayName: 'Bia',
  lastSeenAt:  NOW,
};

function partnerResponse(
  judgment: string | null = null,
  punishment: string | null = null,
  ack: Date | null = null,
) {
  return { sessionParticipantId: 'sp-002', judgment, punishment, resultAcknowledgedAt: ack };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(prisma.sessionParticipant.update).mockResolvedValue(undefined as never);
  // Parceiro da dupla: ausente por padrão (os testes daqui não dependem dele).
  vi.mocked(prisma.sessionParticipant.findFirst).mockResolvedValue(null as never);
});

// ---------------------------------------------------------------------------
// Token inválido
// ---------------------------------------------------------------------------

describe('accessToken inválido', () => {
  it('lança SessionBootstrapError quando sp não encontrado', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(null as never);
    await expect(getParticipantState('tok-invalido')).rejects.toThrow(SessionBootstrapError);
    await expect(getParticipantState('tok-invalido')).rejects.toThrow(/inválido/);
  });
});

// ---------------------------------------------------------------------------
// Sessão WAITING
// ---------------------------------------------------------------------------

describe('sessão WAITING', () => {
  it('retorna WAITING_SESSION com currentAttempt null e trialResult null', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue({
      ...mockSpBase, session: { ...mockSpBase.session, status: 'WAITING' },
    } as never);
    // Nenhuma tentativa resolvida ainda: a consulta de saldos devolve null.
    vi.mocked(prisma.attempt.findFirst).mockResolvedValue(null as never);

    const result = await getParticipantState('tok-abc');

    expect(result.stage).toBe('WAITING_SESSION');
    expect(result.currentAttempt).toBeNull();
    expect(result.trialResult).toBeNull();
    // Em WAITING o serviço consulta attempt só para os saldos (última
    // tentativa resolvida), nunca para carregar tentativa ativa.
    expect(prisma.attempt.findFirst).toHaveBeenCalledTimes(1);
    expect(prisma.attempt.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ trialRecord: { isNot: null } }) }),
    );
    // Sem tentativa resolvida, os saldos são os iniciais.
    expect(result.balances).toEqual({ ownCoins: 80, partnerCoins: 80, groupCoins: 0 });
  });
});

// ---------------------------------------------------------------------------
// Sessão COMPLETED
// ---------------------------------------------------------------------------

describe('sessão COMPLETED', () => {
  it('retorna COMPLETED com currentAttempt null e trialResult null', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue({
      ...mockSpBase, session: { ...mockSpBase.session, status: 'COMPLETED' },
    } as never);
    // A tela final mostra os saldos: o serviço busca a última tentativa
    // resolvida mesmo com a sessão encerrada.
    vi.mocked(prisma.attempt.findFirst).mockResolvedValue({
      trialRecord: { p1CoinsAfter: 71, p2CoinsAfter: 74, groupCoinsAfter: 12 },
    } as never);

    const result = await getParticipantState('tok-abc');

    expect(result.stage).toBe('COMPLETED');
    expect(result.currentAttempt).toBeNull();
    expect(result.trialResult).toBeNull();
    expect(prisma.attempt.findFirst).toHaveBeenCalledTimes(1);
    // sp é P1: ownCoins vem de p1CoinsAfter.
    expect(result.balances).toEqual({ ownCoins: 71, partnerCoins: 74, groupCoins: 12 });
  });
});

// ---------------------------------------------------------------------------
// IN_PROGRESS — estágios progressivos
// ---------------------------------------------------------------------------

describe('IN_PROGRESS — JUDGMENT', () => {
  it('primeira tentativa sem resposta → JUDGMENT', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSpBase as never);
    vi.mocked(prisma.attempt.findFirst).mockResolvedValue({
      ...mockAttemptBase,
      responses: [],
    } as never);

    const result = await getParticipantState('tok-abc');

    expect(result.stage).toBe('JUDGMENT');
    expect(result.currentAttempt).not.toBeNull();
    expect(result.currentAttempt?.id).toBe(ATT_ID);
    expect(result.trialResult).toBeNull();
  });
});

describe('IN_PROGRESS — WAITING_JUDGMENT_PARTNER', () => {
  it('próprio julgou, parceiro ainda não → WAITING_JUDGMENT_PARTNER', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSpBase as never);
    vi.mocked(prisma.attempt.findFirst).mockResolvedValue({
      ...mockAttemptBase,
      responses: [ownResponse('Just')], // só o próprio
    } as never);

    const result = await getParticipantState('tok-abc');

    expect(result.stage).toBe('WAITING_JUDGMENT_PARTNER');
    expect(result.trialResult).toBeNull();
  });
});

describe('IN_PROGRESS — PUNISHMENT', () => {
  it('ambos julgaram, punição própria ausente → PUNISHMENT', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSpBase as never);
    vi.mocked(prisma.attempt.findFirst).mockResolvedValue({
      ...mockAttemptBase,
      responses: [ownResponse('Just'), partnerResponse('Unjust')],
    } as never);

    const result = await getParticipantState('tok-abc');

    expect(result.stage).toBe('PUNISHMENT');
    expect(result.trialResult).toBeNull();
  });
});

describe('IN_PROGRESS — WAITING_PUNISHMENT_PARTNER', () => {
  it('próprio puniu, parceiro ainda não → WAITING_PUNISHMENT_PARTNER', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSpBase as never);
    vi.mocked(prisma.attempt.findFirst).mockResolvedValue({
      ...mockAttemptBase,
      responses: [ownResponse('Just', 'Punish'), partnerResponse('Unjust')], // parceiro sem punishment
    } as never);

    const result = await getParticipantState('tok-abc');

    expect(result.stage).toBe('WAITING_PUNISHMENT_PARTNER');
    expect(result.trialResult).toBeNull();
  });

  it('ambos puniram MAS attempt não finalizado → WAITING_PUNISHMENT_PARTNER', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSpBase as never);
    vi.mocked(prisma.attempt.findFirst).mockResolvedValue({
      ...mockAttemptBase,
      completedAt: null,     // não finalizado
      trialRecord: null,
      responses: [ownResponse('Just', 'Punish'), partnerResponse('Unjust', 'NoPunish')],
    } as never);

    const result = await getParticipantState('tok-abc');

    // attemptFinalized=false → nunca RESULT
    expect(result.stage).toBe('WAITING_PUNISHMENT_PARTNER');
    expect(result.trialResult).toBeNull();
  });
});

describe('IN_PROGRESS — RESULT', () => {
  it('tentativa finalizada (completedAt + trialRecord), próprio sem ack → RESULT com trialResult não nulo', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSpBase as never);
    vi.mocked(prisma.attempt.findFirst).mockResolvedValue({
      ...mockAttemptBase,
      completedAt:  new Date(),
      trialRecord:  mockTrialRecord,
      responses: [ownResponse('Just', 'Punish'), partnerResponse('Unjust', 'Punish')],
    } as never);

    const result = await getParticipantState('tok-abc');

    expect(result.stage).toBe('RESULT');
    // RESULT nunca pode existir com trialResult null
    expect(result.trialResult).not.toBeNull();
    expect(result.trialResult?.punishmentApplied).toBe(true);
    expect(result.trialResult?.ownIndividualCost).toBe(1);   // P1 cost
    expect(result.trialResult?.ownCoinsAfter).toBe(79);      // P1 coins
    expect(result.trialResult?.culturalConsequence).toBe(3);
    expect(result.trialResult?.groupCoinsAfter).toBe(3);
    // distributorResult presente quando punishmentApplied=true
    expect(result.trialResult?.distributorResult).not.toBeNull();
    expect(result.trialResult?.distributorResult?.character).toBe('Lucas');
    expect(result.trialResult?.distributorResult?.finalCoins).toBe(8);
    expect(result.trialResult?.distributorResult?.coinsLost).toBe(16);
  });

  it('punishmentApplied=false → distributorResult null', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSpBase as never);
    vi.mocked(prisma.attempt.findFirst).mockResolvedValue({
      ...mockAttemptBase,
      completedAt:  new Date(),
      trialRecord:  mockTrialRecordNoPunish,
      responses: [ownResponse('Just', 'NoPunish'), partnerResponse('Just', 'NoPunish')],
    } as never);

    const result = await getParticipantState('tok-abc');

    expect(result.stage).toBe('RESULT');
    expect(result.trialResult?.punishmentApplied).toBe(false);
    // distributorResult deve ser null quando punishmentApplied=false
    expect(result.trialResult?.distributorResult).toBeNull();
    expect(result.trialResult?.culturalConsequence).toBe(3); // culturalConsequence independente
  });

  it('P2 recebe ownCost e ownCoinsAfter corretos (p2IndividualCost / p2CoinsAfter)', async () => {
    const spP2 = { ...mockSpBase, id: 'sp-002', slot: 'P2', accessToken: 'tok-p2' };
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(spP2 as never);
    vi.mocked(prisma.attempt.findFirst).mockResolvedValue({
      ...mockAttemptBase,
      completedAt:  new Date(),
      trialRecord:  { ...mockTrialRecord, p2IndividualCost: 0, p2CoinsAfter: 80 },
      responses: [
        { sessionParticipantId: SP_ID,    judgment: 'Just',   punishment: 'Punish',   resultAcknowledgedAt: null },
        { sessionParticipantId: 'sp-002', judgment: 'Unjust', punishment: 'NoPunish', resultAcknowledgedAt: null },
      ],
    } as never);

    const result = await getParticipantState('tok-p2');

    expect(result.trialResult?.ownIndividualCost).toBe(0);  // p2IndividualCost
    expect(result.trialResult?.ownCoinsAfter).toBe(80);     // p2CoinsAfter
  });
});

describe('IN_PROGRESS — WAITING_RESULT_PARTNER', () => {
  it('próprio deu ack, parceiro ainda não → WAITING_RESULT_PARTNER', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSpBase as never);
    vi.mocked(prisma.attempt.findFirst).mockResolvedValue({
      ...mockAttemptBase,
      completedAt:  new Date(),
      trialRecord:  mockTrialRecord,
      responses: [
        ownResponse('Just', 'Punish', NOW),      // próprio com ack
        partnerResponse('Unjust', 'Punish', null), // parceiro sem ack
      ],
    } as never);

    const result = await getParticipantState('tok-abc');

    expect(result.stage).toBe('WAITING_RESULT_PARTNER');
    expect(result.trialResult).not.toBeNull(); // resultado ainda visível
  });
});

// ---------------------------------------------------------------------------
// Seleção de attempt ativo
// ---------------------------------------------------------------------------

describe('seleção de attempt ativo', () => {
  it('tentativa finalizada com ack pendente → selecionada antes da próxima incompleta', async () => {
    // Simula: attempt N finalizado mas ack pendente → deve ser retornado, não o N+1
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSpBase as never);
    vi.mocked(prisma.attempt.findFirst).mockResolvedValue({
      ...mockAttemptBase,
      id:           'att-N',
      completedAt:  new Date(),
      trialRecord:  mockTrialRecord,
      responses: [ownResponse('Just', 'Punish', null), partnerResponse('Just', 'Punish', null)],
    } as never);

    const result = await getParticipantState('tok-abc');

    expect(result.currentAttempt?.id).toBe('att-N');
    expect(result.stage).toBe('RESULT');
    expect(prisma.attempt.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sessionId: SESS_ID,
          OR: expect.arrayContaining([
            { completedAt: null },
            expect.objectContaining({
              completedAt: { not: null },
              trialRecord: { isNot: null },
              responses: { some: { resultAcknowledgedAt: null } },
            }),
          ]),
        }),
        orderBy: { globalNumber: 'asc' },
      })
    );
  });

  it('após ambos os acks, attempt.findFirst retorna a próxima tentativa incompleta', async () => {
    // Simula: findFirst retornou o próximo attempt (sem completedAt)
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSpBase as never);
    vi.mocked(prisma.attempt.findFirst).mockResolvedValue({
      ...mockAttemptBase,
      id:          'att-N+1',
      completedAt: null,
      trialRecord: null,
      responses:   [],
    } as never);

    const result = await getParticipantState('tok-abc');

    expect(result.currentAttempt?.id).toBe('att-N+1');
    expect(result.stage).toBe('JUDGMENT');
    expect(prisma.attempt.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sessionId: SESS_ID,
          OR: expect.arrayContaining([
            { completedAt: null },
            expect.objectContaining({
              completedAt: { not: null },
              trialRecord: { isNot: null },
              responses: { some: { resultAcknowledgedAt: null } },
            }),
          ]),
        }),
        orderBy: { globalNumber: 'asc' },
      })
    );
  });

  it('nenhum attempt ativo → stage COMPLETED (todos finalizados com ambos os acks)', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSpBase as never);
    vi.mocked(prisma.attempt.findFirst).mockResolvedValue(null as never);

    const result = await getParticipantState('tok-abc');

    expect(result.stage).toBe('COMPLETED');
    expect(result.currentAttempt).toBeNull();
    expect(prisma.attempt.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sessionId: SESS_ID,
          OR: expect.arrayContaining([
            { completedAt: null },
            expect.objectContaining({
              completedAt: { not: null },
              trialRecord: { isNot: null },
              responses: { some: { resultAcknowledgedAt: null } },
            }),
          ]),
        }),
        orderBy: { globalNumber: 'asc' },
      })
    );
  });
});

// ---------------------------------------------------------------------------
// Resposta do parceiro — revelada assim que ELE responde
//
// Regra alterada em 26/10/2026 a pedido da pesquisadora (itens 6 e 7 do
// e-mail da Luiza): a criança vê a escolha do parceiro (justa/injusta, sim/não)
// antes de decidir. Antes, só depois da própria resposta. A etapa derivada
// (deriveStage) NÃO muda: cada caso confere que o stage é o mesmo de quando o
// parceiro não está carregado.
// ---------------------------------------------------------------------------

describe('resposta do parceiro revelada antes da própria', () => {
  /** Roda o mesmo cenário sem e com o parceiro carregado; devolve os dois. */
  async function runWithAndWithoutPartner(
    responses: ReturnType<typeof ownResponse>[],
    attemptOverrides: Record<string, unknown> = {},
    sp: typeof mockSpBase = mockSpBase,
    partner: Record<string, unknown> = mockPartnerRecord,
  ) {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(sp as never);
    vi.mocked(prisma.attempt.findFirst).mockResolvedValue({
      ...mockAttemptBase, ...attemptOverrides, responses,
    } as never);

    vi.mocked(prisma.sessionParticipant.findFirst).mockResolvedValue(null as never);
    const withoutPartner = await getParticipantState(sp.accessToken);

    vi.mocked(prisma.sessionParticipant.findFirst).mockResolvedValue(partner as never);
    const withPartner = await getParticipantState(sp.accessToken);

    return { withoutPartner, withPartner };
  }

  it('parceiro julgou, próprio ainda não (stage JUDGMENT) → partner.judgment preenchido', async () => {
    const { withoutPartner, withPartner } = await runWithAndWithoutPartner(
      [partnerResponse('Unjust')],
    );

    expect(withPartner.stage).toBe('JUDGMENT');
    expect(withPartner.stage).toBe(withoutPartner.stage);
    expect(withPartner.partner?.judgment).toBe('Unjust');
    expect(withPartner.partner?.punishment).toBeNull();
    // a própria resposta continua vazia: revelar o parceiro não muda o "own"
    expect(withPartner.own).toEqual({ judgment: null, punishment: null, hasAck: false });
  });

  it('parceiro puniu, próprio ainda não (stage PUNISHMENT) → partner.punishment === "Punish"', async () => {
    const { withoutPartner, withPartner } = await runWithAndWithoutPartner(
      [ownResponse('Just'), partnerResponse('Unjust', 'Punish')],
    );

    expect(withPartner.stage).toBe('PUNISHMENT');
    expect(withPartner.stage).toBe(withoutPartner.stage);
    expect(withPartner.partner?.punishment).toBe('Punish');
    expect(withPartner.partner?.judgment).toBe('Unjust');
    expect(withPartner.own.punishment).toBeNull();
  });

  it('parceiro escolheu NÃO punir, próprio ainda não → partner.punishment === "NoPunish"', async () => {
    const { withPartner } = await runWithAndWithoutPartner(
      [ownResponse('Just'), partnerResponse('Just', 'NoPunish')],
    );

    expect(withPartner.stage).toBe('PUNISHMENT');
    expect(withPartner.partner?.punishment).toBe('NoPunish');
  });

  it('parceiro ainda não respondeu → judgment e punishment null', async () => {
    const { withoutPartner, withPartner } = await runWithAndWithoutPartner([]);

    expect(withPartner.stage).toBe('JUDGMENT');
    expect(withPartner.stage).toBe(withoutPartner.stage);
    expect(withPartner.partner?.judgment).toBeNull();
    expect(withPartner.partner?.punishment).toBeNull();
  });

  it('próprio julgou, parceiro não (WAITING_JUDGMENT_PARTNER) → partner.judgment null', async () => {
    const { withoutPartner, withPartner } = await runWithAndWithoutPartner(
      [ownResponse('Just')],
    );

    expect(withPartner.stage).toBe('WAITING_JUDGMENT_PARTNER');
    expect(withPartner.stage).toBe(withoutPartner.stage);
    expect(withPartner.partner?.judgment).toBeNull();
  });

  it('coinsAfter do parceiro continua null antes do TrialRecord, mesmo com a punição revelada', async () => {
    const { withPartner } = await runWithAndWithoutPartner(
      [ownResponse('Just'), partnerResponse('Unjust', 'Punish')],
    );

    expect(withPartner.partner?.punishment).toBe('Punish');
    expect(withPartner.partner?.coinsAfter).toBeNull();
    // o resultado continua só com TrialRecord
    expect(withPartner.trialResult).toBeNull();
  });

  it('vale também para P2 vendo as respostas de P1', async () => {
    const spP2 = { ...mockSpBase, id: 'sp-002', slot: 'P2', displayName: 'Bia', accessToken: 'tok-p2' };
    const p1Record = { id: SP_ID, slot: 'P1', displayName: 'Alice', lastSeenAt: NOW };
    const { withoutPartner, withPartner } = await runWithAndWithoutPartner(
      [
        // aqui SP_ID é o PARCEIRO (P1), que já julgou e puniu
        { sessionParticipantId: SP_ID,    judgment: 'Unjust', punishment: 'Punish', resultAcknowledgedAt: null },
        { sessionParticipantId: 'sp-002', judgment: 'Unjust', punishment: null,     resultAcknowledgedAt: null },
      ],
      {},
      spP2,
      p1Record,
    );

    expect(withPartner.stage).toBe('PUNISHMENT');
    expect(withPartner.stage).toBe(withoutPartner.stage);
    expect(withPartner.partner?.slot).toBe('P1');
    expect(withPartner.partner?.punishment).toBe('Punish');
    expect(withPartner.own.punishment).toBeNull();
  });

  it.each([
    { name: 'JUDGMENT',                   responses: [partnerResponse('Just')] },
    { name: 'WAITING_JUDGMENT_PARTNER',   responses: [ownResponse('Just')] },
    { name: 'PUNISHMENT',                 responses: [ownResponse('Just'), partnerResponse('Unjust', 'Punish')] },
    { name: 'WAITING_PUNISHMENT_PARTNER', responses: [ownResponse('Just', 'Punish'), partnerResponse('Unjust')] },
  ])('stage $name é o mesmo com e sem o parceiro carregado', async ({ name, responses }) => {
    const { withoutPartner, withPartner } = await runWithAndWithoutPartner(responses);

    expect(withoutPartner.stage).toBe(name);
    expect(withPartner.stage).toBe(name);
  });

  it.each([
    { name: 'RESULT',                 ack: null },
    { name: 'WAITING_RESULT_PARTNER', ack: NOW },
  ])('stage $name (tentativa finalizada) é o mesmo com e sem o parceiro carregado', async ({ name, ack }) => {
    const { withoutPartner, withPartner } = await runWithAndWithoutPartner(
      [ownResponse('Just', 'Punish', ack), partnerResponse('Unjust', 'Punish')],
      { completedAt: new Date(), trialRecord: mockTrialRecord },
    );

    expect(withoutPartner.stage).toBe(name);
    expect(withPartner.stage).toBe(name);
    expect(withPartner.partner?.punishment).toBe('Punish');
    // no resultado, as moedas do parceiro vêm do TrialRecord (sp é P1 → p2CoinsAfter)
    expect(withPartner.partner?.coinsAfter).toBe(mockTrialRecord.p2CoinsAfter);
  });
});

// ---------------------------------------------------------------------------
// Segurança: campos proibidos na resposta
// ---------------------------------------------------------------------------

describe('não expõe campos proibidos', () => {
  it('accessToken nunca aparece na resposta', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSpBase as never);
    vi.mocked(prisma.attempt.findFirst).mockResolvedValue(null as never);

    const result = await getParticipantState('tok-abc');
    const json = JSON.stringify(result);

    expect(json).not.toContain('tok-abc');
    expect((result.participant as Record<string, unknown>).accessToken).toBeUndefined();
  });

  it('session não expõe sequenceVariant', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSpBase as never);
    vi.mocked(prisma.attempt.findFirst).mockResolvedValue(null as never);

    const result = await getParticipantState('tok-abc');

    expect((result.session as Record<string, unknown>).sequenceVariant).toBeUndefined();
  });

  it('currentAttempt não expõe condition, blockNumber, globalNumber', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSpBase as never);
    vi.mocked(prisma.attempt.findFirst).mockResolvedValue({
      ...mockAttemptBase, responses: [],
    } as never);

    const result = await getParticipantState('tok-abc');
    const att = result.currentAttempt as Record<string, unknown>;

    expect(att.condition).toBeUndefined();
    expect(att.blockNumber).toBeUndefined();
    expect(att.globalNumber).toBeUndefined();
  });

  it('trialResult não expõe culturant', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSpBase as never);
    vi.mocked(prisma.attempt.findFirst).mockResolvedValue({
      ...mockAttemptBase,
      completedAt: new Date(),
      trialRecord: { ...mockTrialRecord, culturant: 'Cp' }, // campo interno
      responses: [ownResponse('Just', 'Punish'), partnerResponse('Just', 'Punish')],
    } as never);

    const result = await getParticipantState('tok-abc');
    const tr = result.trialResult as Record<string, unknown>;

    expect(tr.culturant).toBeUndefined();
  });

  // Até 26/10/2026 este bloco tinha "resposta nunca expõe julgamento ou punição
  // do parceiro" — que passava sem testar nada, porque o parceiro vinha null
  // (beforeEach). Com a regra nova (itens 6 e 7 da Luiza) as respostas do
  // parceiro são expostas assim que ele responde; o que continua proibido é
  // expor o que o parceiro AINDA NÃO respondeu.
  it('expõe julgamento e punição do parceiro assim que ele responde, mesmo antes da própria resposta', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSpBase as never);
    vi.mocked(prisma.sessionParticipant.findFirst).mockResolvedValue(mockPartnerRecord as never);
    vi.mocked(prisma.attempt.findFirst).mockResolvedValue({
      ...mockAttemptBase,
      // próprio só julgou; parceiro julgou e puniu
      responses: [ownResponse('Just'), partnerResponse('Unjust', 'NoPunish')],
    } as never);

    const result = await getParticipantState('tok-abc');
    const json = JSON.stringify(result);

    // 'Unjust' e 'NoPunish' só podem ter vindo do parceiro (próprio usou 'Just')
    expect(json).toContain('Unjust');
    expect(json).toContain('NoPunish');
  });

  it('não expõe resposta que o parceiro ainda não deu', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSpBase as never);
    vi.mocked(prisma.sessionParticipant.findFirst).mockResolvedValue(mockPartnerRecord as never);
    vi.mocked(prisma.attempt.findFirst).mockResolvedValue({
      ...mockAttemptBase,
      // ninguém puniu ainda: nenhum valor de punição pode aparecer na resposta
      responses: [ownResponse('Just'), partnerResponse('Unjust')],
    } as never);

    const result = await getParticipantState('tok-abc');
    const json = JSON.stringify(result);

    expect(result.partner?.punishment).toBeNull();
    // 'Punish'/'NoPunish' com P maiúsculo: não confunde com as chaves
    // punishment, punishmentLoss etc.
    expect(json).not.toContain('Punish');
  });

  it('currentAttempt expõe somente os campos públicos esperados', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSpBase as never);
    vi.mocked(prisma.attempt.findFirst).mockResolvedValue({
      ...mockAttemptBase, responses: [],
    } as never);

    const result = await getParticipantState('tok-abc');
    const att = result.currentAttempt!;
    const keys = Object.keys(att).sort();

    expect(keys).toEqual([
      'distributorCharacter',
      'distributorDistribution',
      'endowment',
      'id',
      'punishmentLoss',
      'receptorCharacter',
      'receptorDistribution',
    ]);
  });

  it('trialResult expõe somente os campos públicos esperados (punishmentApplied=true)', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSpBase as never);
    vi.mocked(prisma.attempt.findFirst).mockResolvedValue({
      ...mockAttemptBase,
      completedAt: new Date(),
      trialRecord: mockTrialRecord,
      responses: [ownResponse('Just', 'Punish'), partnerResponse('Just', 'Punish')],
    } as never);

    const result = await getParticipantState('tok-abc');
    const tr = result.trialResult!;
    const keys = Object.keys(tr).sort();

    expect(keys).toEqual([
      'culturalConsequence',
      'distributorResult',
      'groupCoinsAfter',
      'ownCoinsAfter',
      'ownIndividualCost',
      'punishmentApplied',
    ]);
  });
});

// ---------------------------------------------------------------------------
// punishmentLoss — perda real do distribuidor mostrada na pergunta de punição
// ---------------------------------------------------------------------------

describe('currentAttempt.punishmentLoss', () => {
  it.each([
    { distributorDistribution: 12, receptorDistribution: 4, expected: 8 },
    { distributorDistribution: 24, receptorDistribution: 8, expected: 16 },
    { distributorDistribution: 6,  receptorDistribution: 6, expected: 3 },
  ])(
    '$distributorDistribution/$receptorDistribution → $expected',
    async ({ distributorDistribution, receptorDistribution, expected }) => {
      vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSpBase as never);
      vi.mocked(prisma.attempt.findFirst).mockResolvedValue({
        ...mockAttemptBase,
        endowment: distributorDistribution + receptorDistribution,
        distributorDistribution,
        receptorDistribution,
        responses: [],
      } as never);

      const result = await getParticipantState('tok-abc');

      expect(result.currentAttempt?.punishmentLoss).toBe(expected);
    },
  );

  it('é o mesmo valor que resolveTrial grava em distributorLost', async () => {
    vi.mocked(prisma.sessionParticipant.findUnique).mockResolvedValue(mockSpBase as never);
    vi.mocked(prisma.attempt.findFirst).mockResolvedValue({
      ...mockAttemptBase,
      completedAt: new Date(),
      trialRecord: mockTrialRecord,
      responses: [ownResponse('Just', 'Punish'), partnerResponse('Just', 'Punish')],
    } as never);

    const result = await getParticipantState('tok-abc');

    expect(result.currentAttempt?.punishmentLoss).toBe(mockTrialRecord.distributorLost);
    expect(result.trialResult?.distributorResult?.coinsLost).toBe(mockTrialRecord.distributorLost);
  });
});

// ---------------------------------------------------------------------------
// touchParticipant (heartbeat)
// ---------------------------------------------------------------------------

describe('touchParticipant', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('atualiza só o lastSeenAt do dono do token, sem ler estado', async () => {
    vi.mocked(prisma.sessionParticipant.updateMany).mockResolvedValue({ count: 1 } as never);

    await touchParticipant('tok-abc');

    expect(prisma.sessionParticipant.updateMany).toHaveBeenCalledTimes(1);
    const call = vi.mocked(prisma.sessionParticipant.updateMany).mock.calls[0][0] as {
      where: Record<string, unknown>; data: Record<string, unknown>;
    };
    expect(call.where).toEqual({ accessToken: 'tok-abc' });
    expect(Object.keys(call.data)).toEqual(['lastSeenAt']);
    expect(call.data.lastSeenAt).toBeInstanceOf(Date);

    expect(prisma.sessionParticipant.findUnique).not.toHaveBeenCalled();
    expect(prisma.sessionParticipant.findFirst).not.toHaveBeenCalled();
    expect(prisma.attempt.findFirst).not.toHaveBeenCalled();
  });

  it('token desconhecido → SessionBootstrapError', async () => {
    vi.mocked(prisma.sessionParticipant.updateMany).mockResolvedValue({ count: 0 } as never);
    await expect(touchParticipant('tok-xxx')).rejects.toBeInstanceOf(SessionBootstrapError);
  });
});
