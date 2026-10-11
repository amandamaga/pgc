/**
 * export.contract.ts
 * Contrato do dataset de exportação científica.
 *
 * Uma linha por Attempt. Define a ordem exata das colunas (EXPORT_COLUMNS)
 * e o tipo correspondente (ExportRow).
 *
 * Campos proibidos (nunca presentes): displayName, accessToken, passwordHash,
 * email, nome do pesquisador, researcherId, APtype.
 *
 * Campos de resposta/resultado/timestamp podem ser null em sessões incompletas.
 * Campos de estímulo/posição do Attempt são sempre obrigatórios.
 *
 * Os campos de cada participante seguem a ordem cronológica da tentativa:
 * história apresentada → julgamento → punição → avanço disponível → avanço
 * confirmado. Todos os horários são do servidor.
 */

import type {
  Condition,
  SequenceVariant,
  JudgmentResponse,
  PunishmentDecision,
  Culturant,
} from './experiment.types';

// ---------------------------------------------------------------------------
// Tipo de status de sessão (espelha enum SessionStatus do schema)
// ---------------------------------------------------------------------------

export type SessionStatus = 'WAITING' | 'IN_PROGRESS' | 'COMPLETED';

// ---------------------------------------------------------------------------
// Ordem exata das colunas — fonte de verdade
// ---------------------------------------------------------------------------

export const EXPORT_COLUMNS = [
  'sessionId',
  'sessionName',
  'sequenceVariant',
  'sessionStatus',
  'p1ParticipantCode',
  'p2ParticipantCode',
  'globalNumber',
  'blockNumber',
  'trialInBlock',
  'condition',
  'endowment',
  'distributorCharacter',
  'receptorCharacter',
  'distributorDistribution',
  'receptorDistribution',
  'p1StoryShownAt',
  'p1Judgment',
  'p1JudgmentAt',
  'p1Punishment',
  'p1PunishmentAt',
  'p1NextStoryAvailableAt',
  'p1ResultAcknowledgedAt',
  'p2StoryShownAt',
  'p2Judgment',
  'p2JudgmentAt',
  'p2Punishment',
  'p2PunishmentAt',
  'p2NextStoryAvailableAt',
  'p2ResultAcknowledgedAt',
  'consensus',
  'culturant',
  'p1IndividualCost',
  'p2IndividualCost',
  'punishmentApplied',
  'distributorFinal',
  'distributorLost',
  'culturalConsequence',
  'p1CoinsAfter',
  'p2CoinsAfter',
  'groupCoinsAfter',
  'disagreementCountAfter',
  'attemptStartedAt',
  'attemptCompletedAt',
] as const;

export type ExportColumn = typeof EXPORT_COLUMNS[number];

// ---------------------------------------------------------------------------
// Tipo de uma linha do dataset
// ---------------------------------------------------------------------------

export type ExportRow = {
  // Identificação da sessão
  sessionId:          string;
  sessionName:        string;
  sequenceVariant:    SequenceVariant;
  sessionStatus:      SessionStatus;
  p1ParticipantCode:  string;
  p2ParticipantCode:  string;

  // Posição da tentativa (obrigatórios)
  globalNumber:  number;
  blockNumber:   number;
  trialInBlock:  number;
  condition:     Condition;

  // Estímulo (obrigatórios)
  endowment:               number;
  distributorCharacter:    string;
  receptorCharacter:       string;
  distributorDistribution: number;
  receptorDistribution:    number;

  // Respostas de P1 (null se ainda não registradas)
  // storyShownAt: história completa visível para a criança.
  // nextStoryAvailableAt: avanço para a próxima história ficou disponível.
  // resultAcknowledgedAt: a criança efetivamente avançou.
  p1StoryShownAt:         Date | null;
  p1Judgment:             JudgmentResponse | null;
  p1JudgmentAt:           Date | null;
  p1Punishment:           PunishmentDecision | null;
  p1PunishmentAt:         Date | null;
  p1NextStoryAvailableAt: Date | null;
  p1ResultAcknowledgedAt: Date | null;

  // Respostas de P2 (null se ainda não registradas)
  p2StoryShownAt:         Date | null;
  p2Judgment:             JudgmentResponse | null;
  p2JudgmentAt:           Date | null;
  p2Punishment:           PunishmentDecision | null;
  p2PunishmentAt:         Date | null;
  p2NextStoryAvailableAt: Date | null;
  p2ResultAcknowledgedAt: Date | null;

  // Resultado da tentativa (null se não finalizada)
  consensus:              boolean | null;
  culturant:              Culturant | null;
  p1IndividualCost:       0 | 1 | null;
  p2IndividualCost:       0 | 1 | null;
  punishmentApplied:      boolean | null;
  distributorFinal:       number | null;
  distributorLost:        number | null;
  culturalConsequence:    0 | 3 | null;
  p1CoinsAfter:           number | null;
  p2CoinsAfter:           number | null;
  groupCoinsAfter:        number | null;
  disagreementCountAfter: number | null;

  // Timestamps da tentativa (null se ainda não iniciada/finalizada)
  attemptStartedAt:   Date | null;
  attemptCompletedAt: Date | null;
};
