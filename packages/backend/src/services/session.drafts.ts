/**
 * session.drafts.ts
 * Função pura que gera os 64 drafts de Attempt a partir dos TrialTemplates
 * carregados do banco. Sem Prisma, sem efeitos colaterais.
 *
 * Separada do service para permitir testes unitários sem banco.
 */

import {
  BLOCK_COUNT,
  formatBlockSequence,
  isBlockConditions,
  type BlockConditions,
  type Condition,
} from '../domain/experiment.types';

// ---------------------------------------------------------------------------
// Tipos de entrada e saída
// ---------------------------------------------------------------------------

/** Subconjunto do TrialTemplate com Stimulus incluído — shape do que o Prisma retorna */
export type TrialTemplateWithStimulus = {
  id: string;
  blockNumber: number;
  trialInBlock: number;
  stimulus: {
    endowment: number;
    distributorDistribution: number;
    receptorDistribution: number;
    distributorCharacter: string;
    receptorCharacter: string;
  };
};

/** Draft de um Attempt pronto para createMany — sem id ou timestamps */
export type AttemptDraft = {
  sessionId: string;
  globalNumber: number;
  blockNumber: number;
  trialInBlock: number;
  condition: Condition;
  trialTemplateId: string;
  endowment: number;
  distributorDistribution: number;
  receptorDistribution: number;
  distributorCharacter: string;
  receptorCharacter: string;
};

// ---------------------------------------------------------------------------
// Erros de domínio
// ---------------------------------------------------------------------------

export class SessionBootstrapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionBootstrapError';
  }
}

// ---------------------------------------------------------------------------
// Função pura
// ---------------------------------------------------------------------------

/**
 * Gera os 64 AttemptDrafts a partir dos 64 TrialTemplates (um por posição) e
 * da condição escolhida para cada bloco da sessão.
 *
 * Valida:
 * - blockConditions com 4 condições, cada uma A, B ou C
 * - exatamente 64 templates
 * - exatamente 4 blocos de 16
 * - condition derivada exclusivamente de blockConditions[blockNumber - 1]
 *
 * Lança SessionBootstrapError se qualquer invariante for violada.
 */
export function buildAttemptDrafts(
  sessionId: string,
  blockConditions: readonly Condition[],
  templates: TrialTemplateWithStimulus[],
): AttemptDraft[] {
  if (!isBlockConditions(blockConditions)) {
    throw new SessionBootstrapError(
      `blockConditions inválido: esperado ${BLOCK_COUNT} condições (A, B ou C), recebido ${JSON.stringify(blockConditions)}.`
    );
  }
  const conditions: BlockConditions = blockConditions;
  const label = formatBlockSequence(conditions);

  if (templates.length !== 64) {
    throw new SessionBootstrapError(
      `Esperado 64 TrialTemplates (sessão ${label}), encontrado ${templates.length}.`
    );
  }

  // Valida 4 blocos: exatamente trialInBlock 1..16, sem duplicatas nem lacunas
  for (let b = 1; b <= 4; b++) {
    const blockTemplates = templates.filter(t => t.blockNumber === b);
    if (blockTemplates.length !== 16) {
      throw new SessionBootstrapError(
        `Bloco ${b} tem ${blockTemplates.length} templates (esperado 16).`
      );
    }
    const trialNumbers = blockTemplates.map(t => t.trialInBlock).sort((a, b) => a - b);
    const expected = Array.from({ length: 16 }, (_, i) => i + 1);
    const isValid = trialNumbers.every((n, i) => n === expected[i]);
    if (!isValid) {
      throw new SessionBootstrapError(
        `Bloco ${b} tem trialInBlock inválidos: [${trialNumbers.join(', ')}]. Esperado 1..16 sem duplicatas nem lacunas.`
      );
    }
  }

  // Ordena por (blockNumber, trialInBlock) para globalNumber determinístico
  const sorted = [...templates].sort(
    (a, b) => a.blockNumber !== b.blockNumber
      ? a.blockNumber - b.blockNumber
      : a.trialInBlock - b.trialInBlock
  );

  return sorted.map((t) => {
    const condition = conditions[t.blockNumber - 1]; // blockConditions indexado 0..3
    const globalNumber = (t.blockNumber - 1) * 16 + t.trialInBlock;

    return {
      sessionId,
      globalNumber,
      blockNumber: t.blockNumber,
      trialInBlock: t.trialInBlock,
      condition,
      trialTemplateId: t.id,
      endowment: t.stimulus.endowment,
      distributorDistribution: t.stimulus.distributorDistribution,
      receptorDistribution: t.stimulus.receptorDistribution,
      distributorCharacter: t.stimulus.distributorCharacter,
      receptorCharacter: t.stimulus.receptorCharacter,
    };
  });
}
