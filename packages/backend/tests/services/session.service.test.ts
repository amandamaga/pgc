/**
 * session.service.test.ts
 * Testes unitários de ownership e listagem no session.service.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/prisma', () => ({
  prisma: {
    session:            { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    sessionParticipant: { create: vi.fn(), findMany: vi.fn() },
    trialTemplate:      { findMany: vi.fn() },
    attempt:            { createMany: vi.fn(), findFirst: vi.fn() },
    $transaction:       vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb({
      session:            { findUnique: vi.fn(), update: vi.fn() },
      sessionParticipant: { findMany: vi.fn() },
      trialTemplate:      { findMany: vi.fn() },
      attempt:            { createMany: vi.fn() },
    })),
  },
}));

import {
  createSession,
  addParticipant,
  startSession,
  getSession,
  listSessions,
} from '../../src/services/session.service';
import { SessionBootstrapError } from '../../src/services/session.drafts';
import { prisma } from '../../src/config/prisma';

const RES_A = 'res-A';
const RES_B = 'res-B';
const SESS_ID = 'sess-001';

const sessionOfA = { id: SESS_ID, researcherId: RES_A, status: 'WAITING', blockConditions: ['A', 'B', 'A', 'C'], name: 'T' };

beforeEach(() => { vi.resetAllMocks(); });

// ---------------------------------------------------------------------------
// createSession — usa researcherId do serviço (nunca do body)
// ---------------------------------------------------------------------------

describe('createSession', () => {
  it('cria sessão com researcherId passado pelo service (do JWT)', async () => {
    vi.mocked(prisma.session.create).mockResolvedValue(sessionOfA as never);
    await createSession(RES_A, 'Turma A', ['A', 'B', 'A', 'C']);
    expect(prisma.session.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ researcherId: RES_A }),
    });
  });

  it('grava blockConditions (com repetição) e devolve o rótulo blockSequence', async () => {
    vi.mocked(prisma.session.create).mockResolvedValue(
      { ...sessionOfA, blockConditions: ['A', 'A', 'B', 'B'] } as never,
    );
    const result = await createSession(RES_A, 'Turma A', ['A', 'A', 'B', 'B']);
    expect(prisma.session.create).toHaveBeenCalledWith({
      data: { researcherId: RES_A, name: 'Turma A', blockConditions: ['A', 'A', 'B', 'B'] },
    });
    expect(result.blockSequence).toBe('A1-A2-B3-B4');
    expect(result).not.toHaveProperty('sequenceVariant');
  });
});

// ---------------------------------------------------------------------------
// addParticipant — ownership
// ---------------------------------------------------------------------------

describe('addParticipant — ownership', () => {
  it('lança erro (404-semântico) se sessão pertence a outra pesquisadora', async () => {
    vi.mocked(prisma.session.findUnique).mockResolvedValue(sessionOfA as never); // sessão de A
    await expect(addParticipant(SESS_ID, RES_B, 'P1', 'Alice', 'G1P1'))
      .rejects.toThrow(SessionBootstrapError);
    await expect(addParticipant(SESS_ID, RES_B, 'P1', 'Alice', 'G1P1'))
      .rejects.toThrow(/não encontrada/);
    // Nunca deve criar o participante
    expect(prisma.sessionParticipant.create).not.toHaveBeenCalled();
  });

  it('lança erro se sessão inexistente (mesmo erro — não revela existência)', async () => {
    vi.mocked(prisma.session.findUnique).mockResolvedValue(null as never);
    await expect(addParticipant(SESS_ID, RES_A, 'P1', 'Alice', 'G1P1'))
      .rejects.toThrow(/não encontrada/);
    expect(prisma.sessionParticipant.create).not.toHaveBeenCalled();
  });

  it('cria participante quando ownership é válida', async () => {
    vi.mocked(prisma.session.findUnique).mockResolvedValue(sessionOfA as never);
    vi.mocked(prisma.sessionParticipant.create).mockResolvedValue({ id: 'sp-001' } as never);
    await addParticipant(SESS_ID, RES_A, 'P1', 'Alice', 'G1P1');
    expect(prisma.sessionParticipant.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ sessionId: SESS_ID, slot: 'P1' }),
    });
  });
});

// ---------------------------------------------------------------------------
// startSession — ownership
// ---------------------------------------------------------------------------

describe('startSession — ownership', () => {
  it('lança erro se sessão pertence a outra pesquisadora', async () => {
    // Configura o mock do tx.session.findUnique para retornar sessão de A
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        session: {
          findUnique: vi.fn().mockResolvedValue(sessionOfA), // sessão de A
          update: vi.fn(),
        },
        sessionParticipant: { findMany: vi.fn() },
        trialTemplate: { findMany: vi.fn() },
        attempt: { createMany: vi.fn() },
      };
      return cb(tx);
    });

    await expect(startSession(SESS_ID, RES_B)).rejects.toThrow(/não encontrada/);
  });
});

// ---------------------------------------------------------------------------
// startSession — F8: condição de cada bloco vem de session.blockConditions
// ---------------------------------------------------------------------------

describe('startSession — condições dos blocos (F8)', () => {
  it('busca os 64 templates sem filtro de variante e grava a condição de cada bloco', async () => {
    const { RAW_STIMULI } = await import('../../src/prisma/seed-data');
    const templates = RAW_STIMULI.map(([blockNumber, trialInBlock, dist, endowment, dDist, rDist], i) => ({
      id: `tmpl-${i}`, blockNumber, trialInBlock,
      stimulus: {
        endowment, distributorDistribution: dDist, receptorDistribution: rDist,
        distributorCharacter: dist, receptorCharacter: `r-${dist}`,
      },
    }));
    const tx = {
      session: {
        findUnique: vi.fn().mockResolvedValue({ ...sessionOfA, blockConditions: ['C', 'C', 'A', 'B'] }),
        update: vi.fn().mockResolvedValue({ ...sessionOfA, status: 'IN_PROGRESS' }),
      },
      sessionParticipant: { findMany: vi.fn().mockResolvedValue([{ slot: 'P1' }, { slot: 'P2' }]) },
      trialTemplate: { findMany: vi.fn().mockResolvedValue(templates) },
      attempt: { createMany: vi.fn() },
    };
    vi.mocked(prisma.$transaction).mockImplementation(
      (async (cb: (t: unknown) => Promise<unknown>) => cb(tx)) as never,
    );

    await startSession(SESS_ID, RES_A);

    expect(tx.trialTemplate.findMany).toHaveBeenCalledWith({ include: { stimulus: true } });
    const { data } = tx.attempt.createMany.mock.calls[0][0] as { data: Array<{ blockNumber: number; condition: string }> };
    expect(data).toHaveLength(64);
    const byBlock = [1, 2, 3, 4].map(b => [...new Set(data.filter(d => d.blockNumber === b).map(d => d.condition))]);
    expect(byBlock).toEqual([['C'], ['C'], ['A'], ['B']]);
    expect(data.every(d => !('sessionSequenceVariant' in d))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getSession — ownership
// ---------------------------------------------------------------------------

describe('getSession — ownership', () => {
  it('lança erro se sessão pertence a outra pesquisadora', async () => {
    vi.mocked(prisma.session.findUnique)
      .mockResolvedValueOnce(sessionOfA as never)  // loadOwnedSession
      .mockResolvedValueOnce(sessionOfA as never); // findUnique final
    await expect(getSession(SESS_ID, RES_B)).rejects.toThrow(/não encontrada/);
  });

  it('lança erro se sessão inexistente', async () => {
    vi.mocked(prisma.session.findUnique).mockResolvedValue(null as never);
    await expect(getSession(SESS_ID, RES_A)).rejects.toThrow(/não encontrada/);
  });

  it('retorna sessão quando ownership é válida', async () => {
    const fullSession = { ...sessionOfA, participants: [], _count: { attempts: 0 } };
    vi.mocked(prisma.session.findUnique)
      .mockResolvedValueOnce(sessionOfA as never)    // loadOwnedSession
      .mockResolvedValueOnce(fullSession as never);  // findUnique com include
    const result = await getSession(SESS_ID, RES_A);
    expect(result).not.toBeNull();
    expect(result!.blockConditions).toEqual(['A', 'B', 'A', 'C']);
    expect(result!.blockSequence).toBe('A1-B2-A3-C4');
  });
});

// ---------------------------------------------------------------------------
// listSessions — retorna somente sessões da pesquisadora
// ---------------------------------------------------------------------------

describe('listSessions', () => {
  it('filtra por researcherId e ordena da mais recente para mais antiga', async () => {
    vi.mocked(prisma.session.findMany).mockResolvedValue([sessionOfA] as never);
    await listSessions(RES_A);
    expect(prisma.session.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { researcherId: RES_A },
        orderBy: { createdAt: 'desc' },
      })
    );
  });

  it('pesquisadora B não vê sessões de A', async () => {
    // Simula findMany retornando apenas sessões do filtro — pesquisadora B não tem sessões
    vi.mocked(prisma.session.findMany).mockResolvedValue([]);
    const result = await listSessions(RES_B);
    expect(result).toHaveLength(0);
    // Garante que o filtro usa RES_B, não RES_A
    expect(prisma.session.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { researcherId: RES_B } })
    );
  });

  it('cada sessão vem com blockConditions e o rótulo blockSequence', async () => {
    vi.mocked(prisma.session.findMany).mockResolvedValue([
      sessionOfA,
      { ...sessionOfA, id: 'sess-002', blockConditions: ['B', 'B', 'B', 'B'] },
    ] as never);
    const result = await listSessions(RES_A);
    expect(result.map(s => s.blockSequence)).toEqual(['A1-B2-A3-C4', 'B1-B2-B3-B4']);
    const select = vi.mocked(prisma.session.findMany).mock.calls[0][0]!.select as Record<string, unknown>;
    expect(select['blockConditions']).toBe(true);
    expect(select['sequenceVariant']).toBeUndefined();
  });

  it('retorna lista vazia quando pesquisadora não tem sessões', async () => {
    vi.mocked(prisma.session.findMany).mockResolvedValue([]);
    const result = await listSessions(RES_A);
    expect(result).toEqual([]);
  });
});

// ===========================================================================
// getSessionPanel — M4.3
// ===========================================================================

import { getSessionPanel, getParticipantAccess } from '../../src/services/session.service';

const sessionFull = {
  ...sessionOfA,
  participants: [
    { id: 'sp-001', slot: 'P1', displayName: 'Alice', participantCode: 'G1P1', joinedAt: null, lastSeenAt: null },
    { id: 'sp-002', slot: 'P2', displayName: 'Bob',   participantCode: 'G1P2', joinedAt: null, lastSeenAt: null },
  ],
  attempts: [
    // finalizado + ambos ackaram
    { completedAt: new Date(), responses: [{ resultAcknowledgedAt: new Date() }, { resultAcknowledgedAt: new Date() }] },
    // finalizado mas sem ack
    { completedAt: new Date(), responses: [{ resultAcknowledgedAt: null }, { resultAcknowledgedAt: null }] },
    // não finalizado
    { completedAt: null, responses: [] },
  ],
};

describe('getSessionPanel — ownership', () => {
  it('lança erro se sessão pertence a outra pesquisadora', async () => {
    vi.mocked(prisma.session.findUnique).mockResolvedValue(sessionOfA as never);
    await expect(getSessionPanel(SESS_ID, RES_B)).rejects.toThrow(/não encontrada/);
  });

  it('lança erro se sessão inexistente', async () => {
    vi.mocked(prisma.session.findUnique).mockResolvedValue(null as never);
    await expect(getSessionPanel(SESS_ID, RES_A)).rejects.toThrow(/não encontrada/);
  });
});

// Fixture: sessão IN_PROGRESS com dois participantes e attempt ativo
const SP1_ID = 'sp-001';
const SP2_ID = 'sp-002';

const sessionInProgress = {
  ...sessionOfA,
  status: 'IN_PROGRESS',
  participants: [
    { id: SP1_ID, slot: 'P1', displayName: 'Alice', participantCode: 'G1P1', joinedAt: null, lastSeenAt: null },
    { id: SP2_ID, slot: 'P2', displayName: 'Bob',   participantCode: 'G1P2', joinedAt: null, lastSeenAt: null },
  ],
  attempts: [
    { completedAt: new Date(), responses: [{ resultAcknowledgedAt: new Date() }, { resultAcknowledgedAt: new Date() }] },
    { completedAt: new Date(), responses: [{ resultAcknowledgedAt: null }, { resultAcknowledgedAt: null }] },
    { completedAt: null, responses: [] },
  ],
};

function makeActiveAttempt(globalNumber: number, responses: object[]) {
  return { globalNumber, completedAt: null, trialRecord: null, responses };
}

describe('getSessionPanel — stage dos participantes', () => {
  it('WAITING → ambos os participantes têm stage WAITING_SESSION', async () => {
    const sessionWaiting = { ...sessionOfA, status: 'WAITING', participants: sessionInProgress.participants, attempts: [] };
    vi.mocked(prisma.session.findUnique)
      .mockResolvedValueOnce(sessionOfA as never)
      .mockResolvedValueOnce(sessionWaiting as never);
    // attempt.findFirst não é chamado para WAITING
    const result = await getSessionPanel(SESS_ID, RES_A);
    expect(result.participants[0].stage).toBe('WAITING_SESSION');
    expect(result.participants[1].stage).toBe('WAITING_SESSION');
    expect(prisma.attempt.findFirst).not.toHaveBeenCalled();
  });

  it('COMPLETED → ambos os participantes têm stage COMPLETED', async () => {
    const sessionCompleted = { ...sessionInProgress, status: 'COMPLETED' };
    vi.mocked(prisma.session.findUnique)
      .mockResolvedValueOnce(sessionOfA as never)
      .mockResolvedValueOnce(sessionCompleted as never);
    const result = await getSessionPanel(SESS_ID, RES_A);
    expect(result.participants[0].stage).toBe('COMPLETED');
    expect(result.participants[1].stage).toBe('COMPLETED');
    expect(prisma.attempt.findFirst).not.toHaveBeenCalled();
  });

  it('P1 julgou, P2 ainda não → P1 WAITING_JUDGMENT_PARTNER, P2 JUDGMENT', async () => {
    vi.mocked(prisma.session.findUnique)
      .mockResolvedValueOnce(sessionOfA as never)
      .mockResolvedValueOnce(sessionInProgress as never);
    // P1 já julgou, P2 não
    const activeAttempt = makeActiveAttempt(5, [
      { sessionParticipantId: SP1_ID, judgment: 'Just', punishment: null, resultAcknowledgedAt: null },
    ]);
    vi.mocked(prisma.attempt.findFirst).mockResolvedValue(activeAttempt as never);
    const result = await getSessionPanel(SESS_ID, RES_A);
    const p1 = result.participants.find((p: { slot: string }) => p.slot === 'P1');
    const p2 = result.participants.find((p: { slot: string }) => p.slot === 'P2');
    expect(p1?.stage).toBe('WAITING_JUDGMENT_PARTNER');
    expect(p2?.stage).toBe('JUDGMENT');
  });

  it('ambos julgaram, nenhum puniu → ambos PUNISHMENT', async () => {
    vi.mocked(prisma.session.findUnique)
      .mockResolvedValueOnce(sessionOfA as never)
      .mockResolvedValueOnce(sessionInProgress as never);
    const activeAttempt = makeActiveAttempt(5, [
      { sessionParticipantId: SP1_ID, judgment: 'Just',   punishment: null, resultAcknowledgedAt: null },
      { sessionParticipantId: SP2_ID, judgment: 'Unjust', punishment: null, resultAcknowledgedAt: null },
    ]);
    vi.mocked(prisma.attempt.findFirst).mockResolvedValue(activeAttempt as never);
    const result = await getSessionPanel(SESS_ID, RES_A);
    expect(result.participants[0].stage).toBe('PUNISHMENT');
    expect(result.participants[1].stage).toBe('PUNISHMENT');
  });

  it('P1 puniu, P2 ainda não → P1 WAITING_PUNISHMENT_PARTNER, P2 PUNISHMENT', async () => {
    vi.mocked(prisma.session.findUnique)
      .mockResolvedValueOnce(sessionOfA as never)
      .mockResolvedValueOnce(sessionInProgress as never);
    const activeAttempt = makeActiveAttempt(5, [
      { sessionParticipantId: SP1_ID, judgment: 'Just', punishment: 'Punish', resultAcknowledgedAt: null },
      { sessionParticipantId: SP2_ID, judgment: 'Just', punishment: null,     resultAcknowledgedAt: null },
    ]);
    vi.mocked(prisma.attempt.findFirst).mockResolvedValue(activeAttempt as never);
    const result = await getSessionPanel(SESS_ID, RES_A);
    const p1 = result.participants.find((p: { slot: string }) => p.slot === 'P1');
    const p2 = result.participants.find((p: { slot: string }) => p.slot === 'P2');
    expect(p1?.stage).toBe('WAITING_PUNISHMENT_PARTNER');
    expect(p2?.stage).toBe('PUNISHMENT');
  });

  it('attempt finalizado com trialRecord → stage RESULT para ambos', async () => {
    vi.mocked(prisma.session.findUnique)
      .mockResolvedValueOnce(sessionOfA as never)
      .mockResolvedValueOnce(sessionInProgress as never);
    const activeAttempt = {
      globalNumber: 3,
      completedAt:  new Date(),
      trialRecord:  { id: 'tr-001' },
      responses: [
        { sessionParticipantId: SP1_ID, judgment: 'Just', punishment: 'Punish', resultAcknowledgedAt: null },
        { sessionParticipantId: SP2_ID, judgment: 'Just', punishment: 'Punish', resultAcknowledgedAt: null },
      ],
    };
    vi.mocked(prisma.attempt.findFirst).mockResolvedValue(activeAttempt as never);
    const result = await getSessionPanel(SESS_ID, RES_A);
    expect(result.participants[0].stage).toBe('RESULT');
    expect(result.participants[1].stage).toBe('RESULT');
  });
});

describe('getSessionPanel — activeAttemptNumber', () => {
  it('IN_PROGRESS com attempt ativo → activeAttemptNumber correto', async () => {
    vi.mocked(prisma.session.findUnique)
      .mockResolvedValueOnce(sessionOfA as never)
      .mockResolvedValueOnce(sessionInProgress as never);
    vi.mocked(prisma.attempt.findFirst).mockResolvedValue(makeActiveAttempt(7, []) as never);
    const result = await getSessionPanel(SESS_ID, RES_A);
    expect(result.progress.activeAttemptNumber).toBe(7);
  });

  it('WAITING → activeAttemptNumber null', async () => {
    const sessionWaiting = { ...sessionInProgress, status: 'WAITING', attempts: [] };
    vi.mocked(prisma.session.findUnique)
      .mockResolvedValueOnce(sessionOfA as never)
      .mockResolvedValueOnce(sessionWaiting as never);
    const result = await getSessionPanel(SESS_ID, RES_A);
    expect(result.progress.activeAttemptNumber).toBeNull();
  });

  it('COMPLETED → activeAttemptNumber null', async () => {
    const sessionCompleted = { ...sessionInProgress, status: 'COMPLETED' };
    vi.mocked(prisma.session.findUnique)
      .mockResolvedValueOnce(sessionOfA as never)
      .mockResolvedValueOnce(sessionCompleted as never);
    const result = await getSessionPanel(SESS_ID, RES_A);
    expect(result.progress.activeAttemptNumber).toBeNull();
  });

  it('IN_PROGRESS sem attempt ativo → activeAttemptNumber null', async () => {
    vi.mocked(prisma.session.findUnique)
      .mockResolvedValueOnce(sessionOfA as never)
      .mockResolvedValueOnce(sessionInProgress as never);
    vi.mocked(prisma.attempt.findFirst).mockResolvedValue(null as never);
    const result = await getSessionPanel(SESS_ID, RES_A);
    expect(result.progress.activeAttemptNumber).toBeNull();
  });
});

describe('getSessionPanel — polling sem writes', () => {
  it('não chama update, create nem delete — somente leituras', async () => {
    vi.mocked(prisma.session.findUnique)
      .mockResolvedValueOnce(sessionOfA as never)
      .mockResolvedValueOnce(sessionInProgress as never);
    vi.mocked(prisma.attempt.findFirst).mockResolvedValue(makeActiveAttempt(1, []) as never);
    await getSessionPanel(SESS_ID, RES_A);
    expect(prisma.sessionParticipant.create).not.toHaveBeenCalled();
    expect(prisma.session.update).not.toHaveBeenCalled();
    // sessionParticipant.update não existe no mock — ausência confirma que não foi chamado
  });

  it('não expõe judgment, punishment, culturant ou accessToken no retorno', async () => {
    vi.mocked(prisma.session.findUnique)
      .mockResolvedValueOnce(sessionOfA as never)
      .mockResolvedValueOnce(sessionInProgress as never);
    const activeAttempt = makeActiveAttempt(1, [
      { sessionParticipantId: SP1_ID, judgment: 'Just', punishment: 'Punish', resultAcknowledgedAt: null },
    ]);
    vi.mocked(prisma.attempt.findFirst).mockResolvedValue(activeAttempt as never);
    const result = await getSessionPanel(SESS_ID, RES_A);
    const json = JSON.stringify(result);
    expect(json).not.toContain('judgment');
    expect(json).not.toContain('punishment');
    expect(json).not.toContain('culturant');
    expect(json).not.toContain('accessToken');
    expect(json).not.toContain('CoinsAfter');
  });
});

describe('getSessionPanel — progresso (existente)', () => {
  beforeEach(() => {
    vi.mocked(prisma.session.findUnique)
      .mockResolvedValueOnce(sessionOfA as never)
      .mockResolvedValueOnce(sessionInProgress as never);
    vi.mocked(prisma.attempt.findFirst).mockResolvedValue(null as never);
  });

  it('progress contém totalAttempts=3, finalizedAttempts=2, acknowledgedAttempts=1', async () => {
    const result = await getSessionPanel(SESS_ID, RES_A);
    expect(result.session.blockConditions).toEqual(['A', 'B', 'A', 'C']);
    expect(result.session.blockSequence).toBe('A1-B2-A3-C4');
    expect(result.progress.totalAttempts).toBe(3);
    expect(result.progress.finalizedAttempts).toBe(2);
    expect(result.progress.acknowledgedAttempts).toBe(1);
  });
});

// ===========================================================================
// getParticipantAccess — M4.3
// ===========================================================================

describe('getParticipantAccess — ownership', () => {
  it('lança erro se sessão pertence a outra pesquisadora', async () => {
    vi.mocked(prisma.session.findUnique).mockResolvedValue(sessionOfA as never);
    await expect(getParticipantAccess(SESS_ID, RES_B)).rejects.toThrow(/não encontrada/);
  });

  it('lança erro se sessão inexistente', async () => {
    vi.mocked(prisma.session.findUnique).mockResolvedValue(null as never);
    await expect(getParticipantAccess(SESS_ID, RES_A)).rejects.toThrow(/não encontrada/);
  });
});

describe('getParticipantAccess — dados retornados', () => {
  it('retorna slot, displayName, participantCode e accessToken', async () => {
    vi.mocked(prisma.session.findUnique).mockResolvedValue(sessionOfA as never);
    vi.mocked(prisma.sessionParticipant.findMany).mockResolvedValue([
      { slot: 'P1', displayName: 'Alice', participantCode: 'G1P1', accessToken: 'tok-p1' },
      { slot: 'P2', displayName: 'Bob',   participantCode: 'G1P2', accessToken: 'tok-p2' },
    ] as never);
    const result = await getParticipantAccess(SESS_ID, RES_A);
    expect(result).toHaveLength(2);
    expect(result[0].accessToken).toBe('tok-p1');
    expect(result[1].accessToken).toBe('tok-p2');
  });

  it('não retorna campos além dos esperados', async () => {
    vi.mocked(prisma.session.findUnique).mockResolvedValue(sessionOfA as never);
    vi.mocked(prisma.sessionParticipant.findMany).mockResolvedValue([
      { slot: 'P1', displayName: 'Alice', participantCode: 'G1P1', accessToken: 'tok-p1' },
    ] as never);
    const result = await getParticipantAccess(SESS_ID, RES_A);
    const keys = Object.keys(result[0]).sort();
    expect(keys).toEqual(['accessToken', 'displayName', 'participantCode', 'slot']);
  });
});

// ---------------------------------------------------------------------------
// deleteSession — só WAITING, valida ownership, DELETE condicionado ao status
// ---------------------------------------------------------------------------

import { deleteSession } from '../../src/services/session.service';

describe('deleteSession', () => {
  it('apaga sessão em WAITING da própria pesquisadora, com o status na condição do DELETE', async () => {
    vi.mocked(prisma.session.findUnique).mockResolvedValue(sessionOfA as never);
    vi.mocked(prisma.session.deleteMany).mockResolvedValue({ count: 1 } as never);
    await expect(deleteSession(SESS_ID, RES_A)).resolves.toEqual({ id: SESS_ID });
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { id: SESS_ID, researcherId: RES_A, status: 'WAITING' },
    });
  });

  it('lança "não encontrada" se a sessão pertence a outra pesquisadora, sem apagar', async () => {
    vi.mocked(prisma.session.findUnique).mockResolvedValue(sessionOfA as never);
    await expect(deleteSession(SESS_ID, RES_B)).rejects.toThrow(/não encontrada/);
    expect(prisma.session.deleteMany).not.toHaveBeenCalled();
  });

  it('lança "não encontrada" se a sessão não existe', async () => {
    vi.mocked(prisma.session.findUnique).mockResolvedValue(null as never);
    await expect(deleteSession(SESS_ID, RES_A)).rejects.toThrow(/não encontrada/);
    expect(prisma.session.deleteMany).not.toHaveBeenCalled();
  });

  it.each(['IN_PROGRESS', 'COMPLETED'])('recusa sessão %s (tem dado de criança), sem apagar', async (status) => {
    vi.mocked(prisma.session.findUnique).mockResolvedValue({ ...sessionOfA, status } as never);
    const err = await deleteSession(SESS_ID, RES_A).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SessionBootstrapError);
    expect((err as Error).message).toMatch(/já foi iniciada/);
    expect((err as Error).message).not.toMatch(/não encontrada/); // vira 409, não 404
    expect(prisma.session.deleteMany).not.toHaveBeenCalled();
  });

  it('recusa se a sessão foi iniciada entre a leitura e o DELETE (nada apagado)', async () => {
    vi.mocked(prisma.session.findUnique).mockResolvedValue(sessionOfA as never);
    vi.mocked(prisma.session.deleteMany).mockResolvedValue({ count: 0 } as never);
    await expect(deleteSession(SESS_ID, RES_A)).rejects.toThrow(/já foi iniciada/);
  });
});
