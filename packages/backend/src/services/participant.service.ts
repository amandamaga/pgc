/**
 * participant.service.ts
 * Acesso e estado do participante por accessToken.
 *
 * Não expõe: sequenceVariant, condition, bloco, número/total de rodadas,
 * respostas do parceiro ou accessToken de qualquer participante.
 */

import { prisma } from '../config/prisma';
import { INITIAL_COINS } from '../domain/experiment.types';
import { SessionBootstrapError } from './session.drafts';
import { deriveStage } from './participant.stage';
import type { ParticipantStage, OwnResponse, PartnerStatus } from './participant.stage';

export type { ParticipantStage, OwnResponse, PartnerStatus };
export { deriveStage };

export type CurrentAttemptView = {
  id: string;
  endowment: number;
  distributorDistribution: number;
  receptorDistribution: number;
  distributorCharacter: string;
  receptorCharacter: string;
};

/** Dados do resultado observável — apenas consequências visíveis */
export type TrialResultView = {
  ownIndividualCost:    number;
  ownCoinsAfter:        number;
  punishmentApplied:    boolean;
  distributorResult:    { character: string; finalCoins: number; coinsLost: number } | null;
  culturalConsequence:  number;
  groupCoinsAfter:      number;
};

/**
 * Visão do parceiro.
 *
 * `judgment` e `punishment` só são preenchidos DEPOIS que este participante
 * respondeu a mesma etapa — conforme o fluxo desenhado ("esta caixa só deve
 * aparecer depois que 'você' responder"). Antes disso vêm null, para que a
 * resposta do parceiro não influencie a escolha própria.
 *
 * `displayName` é sempre exposto: a dupla joga lado a lado e o fluxo chama o
 * parceiro pelo nome, não pela sigla.
 */
export type PartnerView = {
  slot:        string;
  displayName: string;
  judgment:    string | null;
  punishment:  string | null;
  hasAck:      boolean;
  /** Moedas do parceiro após a última tentativa resolvida; null antes disso. */
  coinsAfter:  number | null;
  /**
   * Segundos desde a última vez que o parceiro consultou o próprio estado
   * (lastSeenAt), calculados no servidor para não depender do relógio do
   * dispositivo do participante. Null se o parceiro nunca foi visto.
   *
   * Isto NÃO é um heartbeat: o parceiro só é "visto" quando busca o próprio
   * estado, o que só acontece automaticamente enquanto ele está numa etapa de
   * espera (ver WAITING_STAGES no front). Durante o próprio turno do parceiro
   * (julgando/punindo), esse valor cresce normalmente — é esperado que passe
   * dezenas de segundos sem atualização. O consumidor deve usar uma janela de
   * tolerância longa (60-90s) antes de considerar o parceiro desconectado.
   */
  secondsSinceSeen: number | null;
};

/**
 * A própria resposta desta tentativa. Devolvida para que a tela possa mostrar
 * a escolha já feita sem guardar estado no navegador — um refresh no meio da
 * tentativa não perde o que a criança marcou.
 */
export type OwnView = {
  judgment:   string | null;
  punishment: string | null;
  hasAck:     boolean;
};

/**
 * Saldos correntes, sempre presentes.
 *
 * O `trialResult` só existe quando a tentativa atual já foi resolvida, mas a
 * tela mostra as moedas o tempo todo — inclusive durante o julgamento. Estes
 * valores vêm da última tentativa resolvida da sessão, ou do estado inicial
 * quando nenhuma foi.
 */
export type BalancesView = {
  ownCoins:     number;
  partnerCoins: number;
  groupCoins:   number;
};

export type ParticipantStateResult = {
  participant: {
    id:              string;
    slot:            string;
    displayName:     string;
    participantCode: string;
    joinedAt:        Date | null;
    lastSeenAt:      Date | null;
    createdAt:       Date;
  };
  session: { id: string; name: string; status: string };
  stage:          ParticipantStage;
  currentAttempt: CurrentAttemptView | null;
  trialResult:    TrialResultView | null;
  partner:        PartnerView | null;
  own:            OwnView;
  balances:       BalancesView;
};

// ---------------------------------------------------------------------------
// Helper: carrega o attempt ativo e a resposta do próprio participante
// "Ativo" = sem completedAt E sem ambos os acks dados
// ---------------------------------------------------------------------------

async function loadActiveAttemptForParticipant(sessionId: string, participantId: string) {
  // Attempt ativo: ou sem completedAt (ainda não finalizado)
  // ou finalizado mas pelo menos um participante ainda não deu ack
  const attempt = await prisma.attempt.findFirst({
    where: {
      sessionId,
      OR: [
        { completedAt: null },
        {
          completedAt: { not: null },
          trialRecord: { isNot: null },
          // tem attempt finalizado onde nem todos deram ack
          responses: {
            some: { resultAcknowledgedAt: null },
          },
        },
      ],
    },
    orderBy: { globalNumber: 'asc' },
    select: {
      id: true,
      endowment: true,
      distributorDistribution: true,
      receptorDistribution: true,
      distributorCharacter: true,
      receptorCharacter: true,
      completedAt: true,
      trialRecord: {
        select: {
          p1IndividualCost: true,
          p2IndividualCost: true,
          p1CoinsAfter: true,
          p2CoinsAfter: true,
          punishmentApplied: true,
          distributorFinal: true,
          distributorLost: true,
          culturalConsequence: true,
          groupCoinsAfter: true,
        },
      },
      responses: {
        select: {
          sessionParticipantId: true,
          judgment:             true,
          punishment:           true,
          resultAcknowledgedAt: true,
        },
      },
    },
  });

  return attempt;
}

// ---------------------------------------------------------------------------
// getParticipantState
// ---------------------------------------------------------------------------

export async function getParticipantState(accessToken: string): Promise<ParticipantStateResult> {
  const now = new Date();

  const sp = await prisma.sessionParticipant.findUnique({
    where: { accessToken },
    include: { session: { select: { id: true, name: true, status: true } } },
  });

  if (!sp) {
    throw new SessionBootstrapError('Token inválido ou participante não encontrado.');
  }

  // Atualizar joinedAt (só no primeiro acesso) e lastSeenAt (sempre)
  await prisma.sessionParticipant.update({
    where: { id: sp.id },
    data: { joinedAt: sp.joinedAt ?? now, lastSeenAt: now },
  });

  // O parceiro da dupla. O nome está sempre disponível; as respostas só são
  // reveladas depois que este participante responder (ver PartnerView).
  const partnerRecord = await prisma.sessionParticipant.findFirst({
    where: { sessionId: sp.sessionId, id: { not: sp.id } },
    select: { id: true, slot: true, displayName: true, lastSeenAt: true },
  });
  const partnerIdentity = partnerRecord
    ? { slot: partnerRecord.slot, displayName: partnerRecord.displayName }
    : null;
  const partnerSecondsSinceSeen = partnerRecord?.lastSeenAt
    ? Math.max(0, Math.floor((now.getTime() - partnerRecord.lastSeenAt.getTime()) / 1000))
    : null;

  // Saldo corrente: última tentativa resolvida da sessão, ou o estado inicial.
  const isP1Slot = sp.slot === 'P1';
  const lastResolved = await prisma.attempt.findFirst({
    where: { sessionId: sp.sessionId, trialRecord: { isNot: null } },
    orderBy: { globalNumber: 'desc' },
    select: {
      trialRecord: {
        select: { p1CoinsAfter: true, p2CoinsAfter: true, groupCoinsAfter: true },
      },
    },
  });
  const lastTr = lastResolved?.trialRecord ?? null;
  const balances: BalancesView = {
    ownCoins:     lastTr ? (isP1Slot ? lastTr.p1CoinsAfter : lastTr.p2CoinsAfter) : INITIAL_COINS,
    partnerCoins: lastTr ? (isP1Slot ? lastTr.p2CoinsAfter : lastTr.p1CoinsAfter) : INITIAL_COINS,
    groupCoins:   lastTr ? lastTr.groupCoinsAfter : 0,
  };

  const sessionStatus = sp.session.status;

  if (sessionStatus === 'WAITING' || sessionStatus === 'COMPLETED') {
    const stage = deriveStage(sessionStatus, false, null, null, false);
    return {
      participant: {
        id: sp.id, slot: sp.slot, displayName: sp.displayName,
        participantCode: sp.participantCode,
        joinedAt: sp.joinedAt ?? now, lastSeenAt: now, createdAt: sp.createdAt,
      },
      session: { id: sp.session.id, name: sp.session.name, status: sessionStatus },
      stage,
      currentAttempt: null,
      trialResult:    null,
      partner: partnerIdentity
        ? { ...partnerIdentity, judgment: null, punishment: null, hasAck: false, coinsAfter: null, secondsSinceSeen: partnerSecondsSinceSeen }
        : null,
      own: { judgment: null, punishment: null, hasAck: false },
      balances,
    };
  }

  // IN_PROGRESS: carregar attempt ativo
  const attempt = await loadActiveAttemptForParticipant(sp.sessionId, sp.id);

  let currentAttempt: CurrentAttemptView | null = null;
  let trialResult:    TrialResultView | null    = null;
  let ownResponse:    OwnResponse               = null;
  let partnerStatus:  PartnerStatus | null      = null;
  let partnerView:    PartnerView | null        = partnerIdentity
    ? { ...partnerIdentity, judgment: null, punishment: null, hasAck: false, coinsAfter: null, secondsSinceSeen: partnerSecondsSinceSeen }
    : null;
  let ownView:        OwnView                   = { judgment: null, punishment: null, hasAck: false };

  if (attempt) {
    currentAttempt = {
      id:                      attempt.id,
      endowment:               attempt.endowment,
      distributorDistribution: attempt.distributorDistribution,
      receptorDistribution:    attempt.receptorDistribution,
      distributorCharacter:    attempt.distributorCharacter,
      receptorCharacter:       attempt.receptorCharacter,
    };

    // Resposta do próprio participante
    type RawResponse = typeof attempt.responses[number];
    const ownRaw = attempt.responses.find((r: RawResponse) => r.sessionParticipantId === sp.id);
    ownResponse = ownRaw
      ? { judgment: ownRaw.judgment, punishment: ownRaw.punishment,
          resultAcknowledgedAt: ownRaw.resultAcknowledgedAt }
      : null;

    ownView = {
      judgment:   ownRaw?.judgment   ?? null,
      punishment: ownRaw?.punishment ?? null,
      hasAck:     !!(ownRaw?.resultAcknowledgedAt),
    };

    // Status do parceiro (o outro slot)
    const partnerRaw = attempt.responses.find((r: RawResponse) => r.sessionParticipantId !== sp.id);
    partnerStatus = {
      hasJudgment:   !!(partnerRaw?.judgment),
      hasPunishment: !!(partnerRaw?.punishment),
      hasAck:        !!(partnerRaw?.resultAcknowledgedAt),
    };

    // A resposta do parceiro só aparece depois que este participante respondeu
    // a mesma etapa — antes disso ela influenciaria a escolha.
    if (partnerIdentity) {
      partnerView = {
        ...partnerIdentity,
        judgment:   ownRaw?.judgment   ? (partnerRaw?.judgment   ?? null) : null,
        punishment: ownRaw?.punishment ? (partnerRaw?.punishment ?? null) : null,
        hasAck:     !!(partnerRaw?.resultAcknowledgedAt),
        // Preenchido logo abaixo, quando a tentativa já tem TrialRecord.
        coinsAfter: partnerView?.coinsAfter ?? null,
        secondsSinceSeen: partnerSecondsSinceSeen,
      };
    }

    // Resultado observável (apenas se attempt já foi finalizado com TrialRecord)
    const attemptFinalized = !!(attempt.trialRecord && attempt.completedAt);
    if (attempt.trialRecord && attempt.completedAt) {
      const tr = attempt.trialRecord;
      const isP1 = sp.slot === 'P1';
      const ownCost   = isP1 ? tr.p1IndividualCost : tr.p2IndividualCost;
      const ownCoins  = isP1 ? tr.p1CoinsAfter     : tr.p2CoinsAfter;
      trialResult = {
        ownIndividualCost:   ownCost,
        ownCoinsAfter:       ownCoins,
        punishmentApplied:   tr.punishmentApplied,
        distributorResult:   tr.punishmentApplied
          ? { character: attempt.distributorCharacter,
              finalCoins: tr.distributorFinal,
              coinsLost:  tr.distributorLost }
          : null,
        culturalConsequence: tr.culturalConsequence,
        groupCoinsAfter:     tr.groupCoinsAfter,
      };

      // Moedas do parceiro — desfecho da tentativa, revelado junto com o resto.
      if (partnerView) partnerView.coinsAfter = isP1 ? tr.p2CoinsAfter : tr.p1CoinsAfter;
    }
  }

  const stage = deriveStage(sessionStatus, attempt !== null, ownResponse, partnerStatus, attempt ? !!(attempt.trialRecord && attempt.completedAt) : false);

  return {
    participant: {
      id: sp.id, slot: sp.slot, displayName: sp.displayName,
      participantCode: sp.participantCode,
      joinedAt: sp.joinedAt ?? now, lastSeenAt: now, createdAt: sp.createdAt,
    },
    session: { id: sp.session.id, name: sp.session.name, status: sessionStatus },
    stage,
    currentAttempt,
    trialResult,
    partner: partnerView,
    own: ownView,
    balances,
  };
}
