/**
 * export.model.csv.test.ts
 * Testa serializeModelExportCsv — sem banco, sem I/O.
 */

import { describe, expect, it } from 'vitest';
import { serializeModelExportCsv, MODEL_COLUMNS } from '../../src/services/export.model.csv';
import type { ExportRow } from '../../src/domain/export.contract';
import type { Culturant, SessionState } from '../../src/domain/experiment.types';
import { resolveTrial, shouldAwardCulturalConsequence } from '../../src/domain/experiment.rules';
import { REAL_SESSION } from '../fixtures/real-session.reference';

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

function makeRow(overrides: Partial<ExportRow> = {}): ExportRow {
  return {
    sessionId: 'sess-001', sessionName: 'Turma A',
    sequenceVariant: 'ABAC', sessionStatus: 'COMPLETED',
    p1ParticipantCode: 'G1P1', p2ParticipantCode: 'G1P2',
    globalNumber: 1, blockNumber: 1, trialInBlock: 1,
    condition: 'A',
    endowment: 16,
    distributorCharacter: 'Lucas', receptorCharacter: 'Isaac',
    distributorDistribution: 12, receptorDistribution: 4,   // Desigual
    p1StoryShownAt: new Date(),
    p1Judgment: 'Unjust', p1JudgmentAt: new Date(),
    p1Punishment: 'Punish', p1PunishmentAt: new Date(),
    p1NextStoryAvailableAt: new Date(),
    p1ResultAcknowledgedAt: new Date(),
    p2StoryShownAt: new Date(),
    p2Judgment: 'Unjust', p2JudgmentAt: new Date(),
    p2Punishment: 'NoPunish', p2PunishmentAt: new Date(),
    p2NextStoryAvailableAt: null,
    p2ResultAcknowledgedAt: new Date(),
    consensus: false, culturant: 'D',
    p1IndividualCost: 1, p2IndividualCost: 0,
    punishmentApplied: false,
    distributorFinal: 4, distributorLost: 8,
    culturalConsequence: 0,
    p1CoinsAfter: 79, p2CoinsAfter: 80,
    groupCoinsAfter: 0, disagreementCountAfter: 1,
    attemptStartedAt: new Date(), attemptCompletedAt: new Date(),
    ...overrides,
  };
}

function fields(csv: string, lineIndex = 1): string[] {
  return csv.split('\n')[lineIndex].split(',');
}

// ---------------------------------------------------------------------------
// Cabeçalho
// ---------------------------------------------------------------------------

describe('serializeModelExportCsv — cabeçalho', () => {
  it('[] retorna somente o cabeçalho sem \\n', () => {
    const csv = serializeModelExportCsv([]);
    expect(csv).toBe(MODEL_COLUMNS.join(','));
    expect(csv.includes('\n')).toBe(false);
  });

  it('cabeçalho contém exatamente 24 colunas', () => {
    const [header] = serializeModelExportCsv([makeRow()]).split('\n');
    expect(header.split(',').length).toBe(24);
  });

  it('ordem do cabeçalho é exatamente a especificada', () => {
    const [header] = serializeModelExportCsv([makeRow()]).split('\n');
    expect(header).toBe(MODEL_COLUMNS.join(','));
  });
});

// ---------------------------------------------------------------------------
// Mapeamento de Condition
// ---------------------------------------------------------------------------

describe('serializeModelExportCsv — Condition', () => {
  it('A no bloco 1 → A', () => {
    const f = fields(serializeModelExportCsv([makeRow({ condition: 'A', blockNumber: 1 })]));
    expect(f[0]).toBe('A');
  });

  it('A no bloco 3 → Aa', () => {
    const f = fields(serializeModelExportCsv([makeRow({ condition: 'A', blockNumber: 3 })]));
    expect(f[0]).toBe('Aa');
  });

  it('B → B', () => {
    const f = fields(serializeModelExportCsv([makeRow({ condition: 'B', blockNumber: 2 })]));
    expect(f[0]).toBe('B');
  });

  it('C no bloco 4 → C (não vira Aa)', () => {
    const f = fields(serializeModelExportCsv([makeRow({ condition: 'C', blockNumber: 4 })]));
    expect(f[0]).toBe('C');
  });
});

// ---------------------------------------------------------------------------
// D Final e D Lost potenciais
// ---------------------------------------------------------------------------

describe('serializeModelExportCsv — D Final e D Lost potenciais', () => {
  it('desigual 12/4: D Final=4, D Lost=8', () => {
    const f = fields(serializeModelExportCsv([makeRow({
      distributorDistribution: 12, receptorDistribution: 4,
    })]));
    expect(f[6]).toBe('4');   // D Final
    expect(f[7]).toBe('8');   // D Lost
  });

  it('desigual 24/8: D Final=8, D Lost=16 (exemplo G1P1)', () => {
    const f = fields(serializeModelExportCsv([makeRow({
      distributorDistribution: 24, receptorDistribution: 8,
    })]));
    expect(f[6]).toBe('8');
    expect(f[7]).toBe('16');
  });

  it('igual 6/6: D Final=3, D Lost=3', () => {
    const f = fields(serializeModelExportCsv([makeRow({
      distributorDistribution: 6, receptorDistribution: 6,
    })]));
    expect(f[6]).toBe('3');
    expect(f[7]).toBe('3');
  });

  it('punishmentApplied=false não muda D Final/D Lost (valores potenciais)', () => {
    const f = fields(serializeModelExportCsv([makeRow({
      distributorDistribution: 12, receptorDistribution: 4,
      punishmentApplied: false,
    })]));
    expect(f[6]).toBe('4');   // D Final potencial
    expect(f[7]).toBe('8');   // D Lost potencial
  });
});

// ---------------------------------------------------------------------------
// Igual/Desigual
// ---------------------------------------------------------------------------

describe('serializeModelExportCsv — Igual/Desigual', () => {
  it('distribuições iguais → E', () => {
    const f = fields(serializeModelExportCsv([makeRow({
      distributorDistribution: 6, receptorDistribution: 6,
    })]));
    expect(f[8]).toBe('E');
  });

  it('distribuições desiguais → U', () => {
    const f = fields(serializeModelExportCsv([makeRow({
      distributorDistribution: 12, receptorDistribution: 4,
    })]));
    expect(f[8]).toBe('U');
  });
});

// ---------------------------------------------------------------------------
// Judgment (j/i) e Punishment (1/0)
// ---------------------------------------------------------------------------

describe('serializeModelExportCsv — judgment e punishment', () => {
  it('Just → j', () => {
    const f = fields(serializeModelExportCsv([makeRow({
      p1Judgment: 'Just', p2Judgment: 'Just',
    })]));
    expect(f[9]).toBe('j');   // BOY = P1 judgment
    expect(f[10]).toBe('j');  // GIRL = P2 judgment
  });

  it('Unjust → i', () => {
    const f = fields(serializeModelExportCsv([makeRow({
      p1Judgment: 'Unjust', p2Judgment: 'Unjust',
    })]));
    expect(f[9]).toBe('i');
    expect(f[10]).toBe('i');
  });

  it('null → vazio', () => {
    const f = fields(serializeModelExportCsv([makeRow({
      p1Judgment: null, p2Judgment: null,
      p1Punishment: null, p2Punishment: null,
    })]));
    expect(f[9]).toBe('');    // P1 judgment
    expect(f[10]).toBe('');   // P2 judgment
    expect(f[11]).toBe('');   // P1 punishment
    expect(f[12]).toBe('');   // P2 punishment
  });

  it('Punish → 1, NoPunish → 0', () => {
    const f = fields(serializeModelExportCsv([makeRow({
      p1Punishment: 'Punish', p2Punishment: 'NoPunish',
    })]));
    expect(f[11]).toBe('1');  // BOY = P1 punishment
    expect(f[12]).toBe('0');  // GIRL = P2 punishment
  });
});

// ---------------------------------------------------------------------------
// Norm P1 / Norm P2
// ---------------------------------------------------------------------------

describe('serializeModelExportCsv — Norm', () => {
  it('U + Unjust → SN', () => {
    const f = fields(serializeModelExportCsv([makeRow({
      distributorDistribution: 12, receptorDistribution: 4, // U
      p1Judgment: 'Unjust', p2Judgment: 'Unjust',
    })]));
    expect(f[15]).toBe('SN');  // Norm P1
    expect(f[16]).toBe('SN');  // Norm P2
  });

  it('E + Just → SN', () => {
    const f = fields(serializeModelExportCsv([makeRow({
      distributorDistribution: 6, receptorDistribution: 6, // E
      p1Judgment: 'Just', p2Judgment: 'Just',
    })]));
    expect(f[15]).toBe('SN');
    expect(f[16]).toBe('SN');
  });

  it('U + Just → NN', () => {
    const f = fields(serializeModelExportCsv([makeRow({
      distributorDistribution: 12, receptorDistribution: 4, // U
      p1Judgment: 'Just', p2Judgment: 'Just',
    })]));
    expect(f[15]).toBe('NN');
    expect(f[16]).toBe('NN');
  });

  it('E + Unjust → NN', () => {
    const f = fields(serializeModelExportCsv([makeRow({
      distributorDistribution: 6, receptorDistribution: 6, // E
      p1Judgment: 'Unjust', p2Judgment: 'Unjust',
    })]));
    expect(f[15]).toBe('NN');
    expect(f[16]).toBe('NN');
  });

  it('null judgment → vazio', () => {
    const f = fields(serializeModelExportCsv([makeRow({
      p1Judgment: null, p2Judgment: null,
    })]));
    expect(f[15]).toBe('');
    expect(f[16]).toBe('');
  });
});

// ---------------------------------------------------------------------------
// D (indicator de desacordo) e D Cumulated
// ---------------------------------------------------------------------------

describe('serializeModelExportCsv — D e D Cumulated', () => {
  it('culturant=D → D=1', () => {
    const f = fields(serializeModelExportCsv([makeRow({ culturant: 'D' })]));
    expect(f[20]).toBe('1');
  });

  it('culturant=Cp → D=0', () => {
    const f = fields(serializeModelExportCsv([makeRow({ culturant: 'Cp' })]));
    expect(f[20]).toBe('0');
  });

  it('culturant=null → D vazio', () => {
    const f = fields(serializeModelExportCsv([makeRow({ culturant: null })]));
    expect(f[20]).toBe('');
  });

  it('disagreementCountAfter=3 → D Cumulated=3', () => {
    const f = fields(serializeModelExportCsv([makeRow({ disagreementCountAfter: 3 })]));
    expect(f[21]).toBe('3');
  });

  it('disagreementCountAfter=null → D Cumulated vazio', () => {
    const f = fields(serializeModelExportCsv([makeRow({ disagreementCountAfter: null })]));
    expect(f[21]).toBe('');
  });
});

// ---------------------------------------------------------------------------
// APtype
// ---------------------------------------------------------------------------

describe('serializeModelExportCsv — APtype', () => {
  it('sem culturant → APtype vazio', () => {
    const f = fields(serializeModelExportCsv([makeRow({ culturant: null })]));
    expect(f[22]).toBe('');
  });

  // Matriz completa nos rótulos do sistema (classifyCulturant):
  //   Bp = punir igual · Cnp = não punir igual · Cp = punir desigual · Bnp = não punir desigual
  // Espelha CULTURAL_CONSEQUENCE_MATRIX: consenso que gera CC → APa/APb/APc; senão APd.
  const cases: Array<[condition: 'A' | 'B' | 'C', block: number, culturant: Culturant, expected: string]> = [
    ['A', 1, 'Bp',  'APa'], ['A', 1, 'Bnp', 'APa'], ['A', 1, 'Cp',  'APa'], ['A', 1, 'Cnp', 'APa'], ['A', 1, 'D', 'D'],
    ['A', 3, 'Bp',  'APa'], ['A', 3, 'Bnp', 'APa'], ['A', 3, 'Cp',  'APa'], ['A', 3, 'Cnp', 'APa'], ['A', 3, 'D', 'D'],
    ['B', 2, 'Bp',  'APb'], ['B', 2, 'Bnp', 'APb'], ['B', 2, 'Cp',  'APd'], ['B', 2, 'Cnp', 'APd'], ['B', 2, 'D', 'APd'],
    ['C', 4, 'Bp',  'APd'], ['C', 4, 'Bnp', 'APd'], ['C', 4, 'Cp',  'APc'], ['C', 4, 'Cnp', 'APc'], ['C', 4, 'D', 'APd'],
  ];

  it.each(cases)('%s (bloco %i) + %s → %s', (condition, blockNumber, culturant, expected) => {
    const f = fields(serializeModelExportCsv([makeRow({ condition, blockNumber, culturant })]));
    expect(f[22]).toBe(expected);
  });

  it('APtype é APa/APb/APc exatamente quando há consequência cultural', () => {
    for (const [condition, blockNumber, culturant] of cases) {
      if (culturant === 'D') continue;
      const f = fields(serializeModelExportCsv([makeRow({ condition, blockNumber, culturant })]));
      const awarded = shouldAwardCulturalConsequence(condition, culturant);
      expect(f[22] !== 'APd').toBe(awarded);
    }
  });
});

// ---------------------------------------------------------------------------
// APtype — regressão com a sessão real G1P1 (24.10.2024)
// Esperado: coluna APtype da aba G1P1 de G1_P1_24.10.2024_3.xlsx, na ordem das
// 64 tentativas de REAL_SESSION (ordem conferida tentativa a tentativa).
// ---------------------------------------------------------------------------

const G1P1_APTYPE = [
  // Bloco 1 — A
  'D', 'APa', 'APa', 'APa', 'APa', 'APa', 'D', 'APa', 'D', 'APa', 'APa', 'APa', 'APa', 'APa', 'APa', 'D',
  // Bloco 2 — B
  'APd', 'APd', 'APd', 'APd', 'APd', 'APd', 'APd', 'APd', 'APd', 'APd', 'APd', 'APd', 'APd', 'APd', 'APd', 'APd',
  // Bloco 3 — Aa
  'APa', 'APa', 'D', 'APa', 'APa', 'APa', 'APa', 'APa', 'APa', 'APa', 'APa', 'APa', 'APa', 'APa', 'APa', 'APa',
  // Bloco 4 — C
  'APc', 'APd', 'APc', 'APc', 'APc', 'APc', 'APc', 'APc', 'APd', 'APc', 'APc', 'APc', 'APc', 'APc', 'APc', 'APd',
];

describe('serializeModelExportCsv — APtype na sessão real G1P1', () => {
  let state: SessionState = { p1Coins: 80, p2Coins: 80, groupCoins: 0, disagreementCount: 0 };
  const rows: ExportRow[] = REAL_SESSION.map((fx, i) => {
    const { result, nextState } = resolveTrial(fx.input.condition, fx.input.stimulus, fx.input.responses, state);
    state = nextState;
    return makeRow({
      globalNumber: i + 1,
      blockNumber: fx.input.block,
      trialInBlock: fx.input.trialInBlock,
      condition: fx.input.condition,
      endowment: fx.input.stimulus.endowment,
      distributorDistribution: fx.input.stimulus.distributorDistribution,
      receptorDistribution: fx.input.stimulus.receptorDistribution,
      culturant: result.culturant,
    });
  });
  const csvLines = serializeModelExportCsv(rows).split('\n').slice(1);

  it('fixture e esperado têm 64 tentativas', () => {
    expect(REAL_SESSION).toHaveLength(64);
    expect(G1P1_APTYPE).toHaveLength(64);
  });

  it.each(G1P1_APTYPE.map((ap, i) => [i + 1, ap] as const))(
    'tentativa %i → %s',
    (n, expected) => {
      expect(csvLines[n - 1].split(',')[22]).toBe(expected);
    },
  );
});

// ---------------------------------------------------------------------------
// COMENTÁRIOS sempre vazio
// ---------------------------------------------------------------------------

describe('serializeModelExportCsv — COMENTÁRIOS', () => {
  it('campo COMENTÁRIOS é sempre vazio', () => {
    const f = fields(serializeModelExportCsv([makeRow()]));
    expect(f[23]).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Linha de dados tem 24 campos
// ---------------------------------------------------------------------------

describe('serializeModelExportCsv — estrutura', () => {
  it('linha de dados tem exatamente 24 campos', () => {
    const f = fields(serializeModelExportCsv([makeRow()]));
    expect(f.length).toBe(24);
  });

  it('múltiplas linhas geram múltiplas linhas de dados', () => {
    const csv = serializeModelExportCsv([makeRow({ trialInBlock: 1 }), makeRow({ trialInBlock: 2 })]);
    expect(csv.split('\n').length).toBe(3); // header + 2 data
  });
});
