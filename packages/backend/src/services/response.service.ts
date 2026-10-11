/**
 * response.service.ts
 * Orquestração de respostas e coordenação de rodada.
 *
 * submitPunishment exige que ambos tenham judgment antes de aceitar,
 * e aciona finalizeAttempt quando ambos concluem punishment.
 * acknowledgeResult delega para trial.service.acknowledgeResult.
 * Session.update é responsabilidade exclusiva de trial.service.acknowledgeResult.
 *
 * markStoryShown e markNextStoryAvailable registram marcos de tempo por
 * participante e por tentativa, sempre com o relógio do servidor e em regime
 * first-write: um valor já gravado nunca é substituído (retry é inofensivo).
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { SessionBootstrapError } from './session.drafts';
import {
  recordJudgment,
  recordPunishment,
  finalizeAttempt,
  acknowledgeResult,
} from './trial.service';
import { getParticipantState } from './participant.service';

// ---------------------------------------------------------------------------
// Helper: localiza participante e valida attempt (para Attempt ativo)
// ---------------------------------------------------------------------------

async function resolveActive(accessToken: string, attemptId: string) {
  const sp = await prisma.sessionParticipant.findUnique({
    where: { accessToken },
    include: { session: { select: { status: true } } },
  });
  if (!sp) throw new SessionBootstrapError('Token inválido ou participante não encontrado.');

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: { id: true, sessionId: true, globalNumber: true, completedAt: true },
  });
  if (!attempt) throw new SessionBootstrapError(`Attempt não encontrado: ${attemptId}`);
  if (attempt.sessionId !== sp.sessionId) {
    throw new SessionBootstrapError(`Attempt ${attemptId} não pertence à Session do participante.`);
  }

  return { sp, attempt };
}

async function getOwnResponse(attemptId: string, sessionParticipantId: string) {
  return prisma.response.findUnique({
    where: { attemptId_sessionParticipantId: { attemptId, sessionParticipantId } },
    select: { judgment: true, punishment: true, resultAcknowledgedAt: true },
  });
}

async function bothHaveField(
  sessionId: string,
  attemptId: string,
  field: 'judgment' | 'punishment',
): Promise<boolean> {
  const participants = await prisma.sessionParticipant.findMany({
    where: { sessionId }, select: { id: true },
  });
  for (const p of participants) {
    const r = await prisma.response.findUnique({
      where: { attemptId_sessionParticipantId: { attemptId, sessionParticipantId: p.id } },
      select: { [field]: true },
    });
    if (!r || !r[field]) return false;
  }
  return participants.length === 2;
}

/**
 * Retorna true se existe na sessão algum Attempt finalizado (com TrialRecord)
 * cujo resultado ainda não foi reconhecido pelos dois participantes.
 * Enquanto isso for verdade, novos judgments/punishments devem ser bloqueados.
 */
async function hasPendingResult(sessionId: string): Promise<boolean> {
  const pendingAck = await prisma.attempt.findFirst({
    where: {
      sessionId,
      completedAt: { not: null },
      trialRecord: { isNot: null },
      responses: { some: { resultAcknowledgedAt: null } },
    },
    select: { id: true },
  });
  return pendingAck !== null;
}

// ---------------------------------------------------------------------------
// submitJudgment
// ---------------------------------------------------------------------------

export async function submitJudgment(
  accessToken: string,
  attemptId: string,
  judgment: 'Just' | 'Unjust',
) {
  const { sp, attempt } = await resolveActive(accessToken, attemptId);

  // Idempotência pós-finalização: attempt já finalizado
  if (attempt.completedAt) {
    const existing = await getOwnResponse(attemptId, sp.id);
    if (existing?.judgment === judgment) return getParticipantState(accessToken);
    if (existing?.judgment) {
      throw new SessionBootstrapError(
        `Julgamento já registrado como "${existing.judgment}". Não é possível alterá-lo.`
      );
    }
    throw new SessionBootstrapError(`Attempt ${attemptId} já foi finalizado.`);
  }

  // Session deve estar IN_PROGRESS para Attempt ativo
  if (sp.session.status !== 'IN_PROGRESS') {
    throw new SessionBootstrapError(`Session não está IN_PROGRESS (status: ${sp.session.status}).`);
  }

  // Verificar que é o primeiro pendente (em ordem)
  const firstPending = await prisma.attempt.findFirst({
    where: { sessionId: sp.sessionId, completedAt: null },
    orderBy: { globalNumber: 'asc' },
    select: { id: true },
  });
  if (!firstPending || firstPending.id !== attemptId) {
    throw new SessionBootstrapError(
      `Attempt ${attemptId} não é o próximo a ser respondido.`
    );
  }

  // Barreira de resultado: bloquear enquanto tentativa anterior tiver ack pendente
  if (await hasPendingResult(sp.sessionId)) {
    throw new SessionBootstrapError(
      'Aguardando confirmação do resultado da tentativa anterior antes de avançar.'
    );
  }

  const existing = await getOwnResponse(attemptId, sp.id);
  if (existing?.judgment !== null && existing?.judgment !== undefined) {
    if (existing.judgment === judgment) return getParticipantState(accessToken);
    throw new SessionBootstrapError(
      `Julgamento já registrado como "${existing.judgment}". Não é possível alterá-lo.`
    );
  }

  await recordJudgment(attemptId, sp.id, judgment);
  return getParticipantState(accessToken);
}

// ---------------------------------------------------------------------------
// submitPunishment
// ---------------------------------------------------------------------------

export async function submitPunishment(
  accessToken: string,
  attemptId: string,
  punishment: 'Punish' | 'NoPunish',
) {
  const { sp, attempt } = await resolveActive(accessToken, attemptId);

  // Idempotência pós-finalização
  if (attempt.completedAt) {
    const existing = await getOwnResponse(attemptId, sp.id);
    if (existing?.punishment === punishment) return getParticipantState(accessToken);
    if (existing?.punishment) {
      throw new SessionBootstrapError(
        `Decisão de punição já registrada como "${existing.punishment}". Não é possível alterá-la.`
      );
    }
    throw new SessionBootstrapError(`Attempt ${attemptId} já foi finalizado.`);
  }

  if (sp.session.status !== 'IN_PROGRESS') {
    throw new SessionBootstrapError(`Session não está IN_PROGRESS (status: ${sp.session.status}).`);
  }

  const firstPending = await prisma.attempt.findFirst({
    where: { sessionId: sp.sessionId, completedAt: null },
    orderBy: { globalNumber: 'asc' },
    select: { id: true },
  });
  if (!firstPending || firstPending.id !== attemptId) {
    throw new SessionBootstrapError(`Attempt ${attemptId} não é o próximo a ser respondido.`);
  }

  // Barreira de resultado: bloquear enquanto tentativa anterior tiver ack pendente
  if (await hasPendingResult(sp.sessionId)) {
    throw new SessionBootstrapError(
      'Aguardando confirmação do resultado da tentativa anterior antes de avançar.'
    );
  }

  // Ambos devem ter judgment antes de aceitar punishment
  const bothJudged = await bothHaveField(sp.sessionId, attemptId, 'judgment');
  if (!bothJudged) {
    throw new SessionBootstrapError(
      'Aguardando julgamento do parceiro antes de aceitar decisão de punição.'
    );
  }

  const existing = await getOwnResponse(attemptId, sp.id);
  if (existing?.punishment !== null && existing?.punishment !== undefined) {
    if (existing.punishment === punishment) {
      // Retry idempotente em attempt ativo: continua verificando coordenação
    } else {
      throw new SessionBootstrapError(
        `Decisão de punição já registrada como "${existing.punishment}". Não é possível alterá-la.`
      );
    }
  } else {
    await recordPunishment(attemptId, sp.id, punishment);
  }

  // Verificar se ambos concluíram punishment
  const bothPunished = await bothHaveField(sp.sessionId, attemptId, 'punishment');
  if (bothPunished) {
    await finalizeAttempt(attemptId);
  }

  return getParticipantState(accessToken);
}

// ---------------------------------------------------------------------------
// submitAcknowledge
// ---------------------------------------------------------------------------

export async function submitAcknowledge(
  accessToken: string,
  attemptId: string,
) {
  const { sp, attempt } = await resolveActive(accessToken, attemptId);

  // Deve ter trialRecord (attempt finalizado)
  if (!attempt.completedAt) {
    throw new SessionBootstrapError(`Attempt ${attemptId} ainda não foi finalizado.`);
  }

  await acknowledgeResult(attemptId, sp.id);
  return getParticipantState(accessToken);
}

// ---------------------------------------------------------------------------
// markStoryShown — POST /participant/attempts/:attemptId/story-shown
// ---------------------------------------------------------------------------

/** Violação de unicidade do Prisma (corrida entre dois creates da mesma Response). */
function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

/**
 * Grava storyShownAt desta criança nesta tentativa, se ainda não houver valor.
 *
 * - Cria a Response quando ela ainda não existe (o evento vem antes do julgamento).
 * - A gravação é condicional (`storyShownAt: null`), então um retry ou uma
 *   requisição concorrente nunca sobrescreve o primeiro valor.
 * - Na mesma transação, quando ESTA chamada gravou o storyShownAt, preenche
 *   Attempt.startedAt se ele ainda for null. A condição `startedAt: null` faz
 *   com que a apresentação do segundo participante não sobrescreva o valor.
 *
 * Retorna true se esta chamada gravou o timestamp.
 */
async function writeStoryShownOnce(
  sessionId: string,
  attemptId: string,
  sessionParticipantId: string,
): Promise<boolean> {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const now = new Date();

    const updated = await tx.response.updateMany({
      where: { attemptId, sessionParticipantId, storyShownAt: null },
      data:  { storyShownAt: now },
    });
    let wrote = updated.count > 0;

    if (!wrote) {
      const existing = await tx.response.findUnique({
        where:  { attemptId_sessionParticipantId: { attemptId, sessionParticipantId } },
        select: { id: true },
      });
      if (!existing) {
        await tx.response.create({
          data: { sessionId, attemptId, sessionParticipantId, storyShownAt: now },
        });
        wrote = true;
      }
    }

    if (wrote) {
      await tx.attempt.updateMany({
        where: { id: attemptId, startedAt: null },
        data:  { startedAt: now },
      });
    }

    return wrote;
  });
}

export async function markStoryShown(
  accessToken: string,
  attemptId: string,
) {
  const { sp, attempt } = await resolveActive(accessToken, attemptId);

  // Tentativa já finalizada: retry depois do fim é idempotente se já houve
  // registro; sem registro, não faz sentido apresentar a história agora.
  if (attempt.completedAt) {
    const existing = await prisma.response.findUnique({
      where:  { attemptId_sessionParticipantId: { attemptId, sessionParticipantId: sp.id } },
      select: { storyShownAt: true },
    });
    if (existing?.storyShownAt) return getParticipantState(accessToken);
    throw new SessionBootstrapError(`Attempt ${attemptId} já foi finalizado.`);
  }

  if (sp.session.status !== 'IN_PROGRESS') {
    throw new SessionBootstrapError(`Session não está IN_PROGRESS (status: ${sp.session.status}).`);
  }

  // Mesma ordem dos demais endpoints: só a próxima tentativa pendente,
  // e só depois que os dois confirmaram o resultado da anterior.
  const firstPending = await prisma.attempt.findFirst({
    where: { sessionId: sp.sessionId, completedAt: null },
    orderBy: { globalNumber: 'asc' },
    select: { id: true },
  });
  if (!firstPending || firstPending.id !== attemptId) {
    throw new SessionBootstrapError(`Attempt ${attemptId} não é o próximo a ser respondido.`);
  }

  if (await hasPendingResult(sp.sessionId)) {
    throw new SessionBootstrapError(
      'Aguardando confirmação do resultado da tentativa anterior antes de avançar.'
    );
  }

  try {
    await writeStoryShownOnce(sp.sessionId, attemptId, sp.id);
  } catch (err) {
    // Duas requisições da mesma criança tentaram criar a Response ao mesmo
    // tempo: a outra venceu. Repetir uma vez cai no caminho condicional.
    if (!isUniqueViolation(err)) throw err;
    await writeStoryShownOnce(sp.sessionId, attemptId, sp.id);
  }

  return getParticipantState(accessToken);
}

// ---------------------------------------------------------------------------
// markNextStoryAvailable — POST /participant/attempts/:attemptId/next-story-available
// ---------------------------------------------------------------------------

/**
 * Grava nextStoryAvailableAt desta criança: quando o avanço para a próxima
 * história ficou disponível para ela. Não mexe em resultAcknowledgedAt, que
 * continua sendo o momento em que ela efetivamente avançou.
 *
 * Só vale para tentativa finalizada e exige a Response do participante.
 * First-write: a gravação é condicional (`nextStoryAvailableAt: null`).
 */
export async function markNextStoryAvailable(
  accessToken: string,
  attemptId: string,
) {
  const { sp, attempt } = await resolveActive(accessToken, attemptId);

  if (!attempt.completedAt) {
    throw new SessionBootstrapError(`Attempt ${attemptId} ainda não foi finalizado.`);
  }

  const existing = await prisma.response.findUnique({
    where:  { attemptId_sessionParticipantId: { attemptId, sessionParticipantId: sp.id } },
    select: { id: true },
  });
  if (!existing) {
    throw new SessionBootstrapError(
      `Resposta do participante não encontrada para o Attempt ${attemptId}.`
    );
  }

  await prisma.response.updateMany({
    where: { attemptId, sessionParticipantId: sp.id, nextStoryAvailableAt: null },
    data:  { nextStoryAvailableAt: new Date() },
  });

  return getParticipantState(accessToken);
}
