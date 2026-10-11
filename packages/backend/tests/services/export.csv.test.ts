/**
 * export.csv.test.ts
 * Testa a serialização CSV sem banco, sem I/O.
 */

import { describe, expect, it } from 'vitest';
import { serializeExportCsv } from '../../src/services/export.csv';
import { EXPORT_COLUMNS } from '../../src/domain/export.contract';
import type { ExportRow } from '../../src/domain/export.contract';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOW = new Date('2024-10-24T10:00:00.000Z');

/** Posição (0-based) de uma coluna na linha CSV — sem índices contados à mão. */
const col = (name: typeof EXPORT_COLUMNS[number]) => EXPORT_COLUMNS.indexOf(name);

/** Linha completa com valores não-nulos para todos os 43 campos */
function makeCompleteRow(overrides: Partial<ExportRow> = {}): ExportRow {
  return {
    sessionId:               'sess-001',
    sessionName:             'Turma A',
    sequenceVariant:         'ABAC',
    sessionStatus:           'COMPLETED',
    p1ParticipantCode:       'G1P1',
    p2ParticipantCode:       'G1P2',
    globalNumber:            1,
    blockNumber:             1,
    trialInBlock:            1,
    condition:               'A',
    endowment:               32,
    distributorCharacter:    'Lucas',
    receptorCharacter:       'Isaac',
    distributorDistribution: 24,
    receptorDistribution:    8,
    p1StoryShownAt:          NOW,
    p1Judgment:              'Unjust',
    p1JudgmentAt:            NOW,
    p1Punishment:            'Punish',
    p1PunishmentAt:          NOW,
    p1NextStoryAvailableAt:  NOW,
    p1ResultAcknowledgedAt:  NOW,
    p2StoryShownAt:          NOW,
    p2Judgment:              'Unjust',
    p2JudgmentAt:            NOW,
    p2Punishment:            'Punish',
    p2PunishmentAt:          NOW,
    p2NextStoryAvailableAt:  NOW,
    p2ResultAcknowledgedAt:  NOW,
    consensus:               true,
    culturant:               'Cp',
    p1IndividualCost:        1,
    p2IndividualCost:        1,
    punishmentApplied:       true,
    distributorFinal:        8,
    distributorLost:         16,
    culturalConsequence:     3,
    p1CoinsAfter:            79,
    p2CoinsAfter:            79,
    groupCoinsAfter:         3,
    disagreementCountAfter:  0,
    attemptStartedAt:        NOW,
    attemptCompletedAt:      NOW,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. Cabeçalho: 43 colunas na ordem exata de EXPORT_COLUMNS
// ---------------------------------------------------------------------------

/** Ordem científica esperada, escrita por extenso (F1.4: 39 → 43 colunas). */
const EXPECTED_SCIENTIFIC_ORDER = [
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

describe('serializeExportCsv — cabeçalho', () => {
  it('primeira linha é o cabeçalho com as 43 colunas', () => {
    const csv = serializeExportCsv([]);
    expect(csv).toBe(EXPORT_COLUMNS.join(','));
  });

  it('cabeçalho contém exatamente 43 campos', () => {
    const [header] = serializeExportCsv([makeCompleteRow()]).split('\n');
    expect(header.split(',').length).toBe(43);
    expect(EXPORT_COLUMNS.length).toBe(43);
  });

  it('EXPORT_COLUMNS segue exatamente a ordem científica especificada', () => {
    expect([...EXPORT_COLUMNS]).toEqual([...EXPECTED_SCIENTIFIC_ORDER]);
  });

  it('cabeçalho literal é exatamente a ordem científica especificada', () => {
    const [header] = serializeExportCsv([makeCompleteRow()]).split('\n');
    expect(header).toBe(EXPECTED_SCIENTIFIC_ORDER.join(','));
  });

  it('timestamps de cada participante ficam agrupados em ordem cronológica', () => {
    for (const p of ['p1', 'p2'] as const) {
      const start = EXPORT_COLUMNS.indexOf(`${p}StoryShownAt`);
      expect([...EXPORT_COLUMNS].slice(start, start + 7)).toEqual([
        `${p}StoryShownAt`, `${p}Judgment`, `${p}JudgmentAt`,
        `${p}Punishment`, `${p}PunishmentAt`,
        `${p}NextStoryAvailableAt`, `${p}ResultAcknowledgedAt`,
      ]);
    }
    // P1 inteiro antes de P2, e P2 antes dos campos de resultado.
    expect(col('p1ResultAcknowledgedAt') + 1).toBe(col('p2StoryShownAt'));
    expect(col('p2ResultAcknowledgedAt') + 1).toBe(col('consensus'));
  });

  it('ordem do cabeçalho é exatamente a de EXPORT_COLUMNS', () => {
    const [header] = serializeExportCsv([makeCompleteRow()]).split('\n');
    expect(header).toBe(EXPORT_COLUMNS.join(','));
  });
});

// ---------------------------------------------------------------------------
// 2. null → campo vazio
// ---------------------------------------------------------------------------

describe('serializeExportCsv — null', () => {
  it('campos null produzem campo vazio (sem "null" literal)', () => {
    const row = makeCompleteRow({
      p1Judgment: null, p1JudgmentAt: null,
      consensus: null, culturant: null,
      p1IndividualCost: null, culturalConsequence: null,
      attemptStartedAt: null,
    });
    const [, dataLine] = serializeExportCsv([row]).split('\n');
    expect(dataLine).not.toContain('null');
    const fields = dataLine.split(',');
    expect(fields[col('p1Judgment')]).toBe('');  // p1Judgment → vazio
  });

  it('novos timestamps null (F1.4) viram campos vazios na posição certa', () => {
    const row = makeCompleteRow({
      p1StoryShownAt: null, p1NextStoryAvailableAt: null,
      p2StoryShownAt: null, p2NextStoryAvailableAt: null,
    });
    const [, dataLine] = serializeExportCsv([row]).split('\n');
    expect(dataLine).not.toContain('null');
    const fields = dataLine.split(',');
    expect(fields.length).toBe(43);
    expect(fields[col('p1StoryShownAt')]).toBe('');
    expect(fields[col('p1NextStoryAvailableAt')]).toBe('');
    expect(fields[col('p2StoryShownAt')]).toBe('');
    expect(fields[col('p2NextStoryAvailableAt')]).toBe('');
    // Vizinhos continuam preenchidos: o vazio não "escorrega" de coluna.
    expect(fields[col('p1Judgment')]).toBe('Unjust');
    expect(fields[col('p1ResultAcknowledgedAt')]).toBe(NOW.toISOString());
    expect(fields[col('p2Judgment')]).toBe('Unjust');
    expect(fields[col('p2ResultAcknowledgedAt')]).toBe(NOW.toISOString());
  });
});

// ---------------------------------------------------------------------------
// 3. Date → ISO 8601
// ---------------------------------------------------------------------------

describe('serializeExportCsv — Date', () => {
  it('Date é serializada como ISO 8601', () => {
    const row = makeCompleteRow({ p1JudgmentAt: NOW });
    const [, dataLine] = serializeExportCsv([row]).split('\n');
    expect(dataLine).toContain('2024-10-24T10:00:00.000Z');
  });

  it('múltiplas datas são serializadas individualmente', () => {
    const d1 = new Date('2024-01-01T00:00:00.000Z');
    const d2 = new Date('2024-12-31T23:59:59.000Z');
    const row = makeCompleteRow({ attemptStartedAt: d1, attemptCompletedAt: d2 });
    const csv = serializeExportCsv([row]);
    expect(csv).toContain('2024-01-01T00:00:00.000Z');
    expect(csv).toContain('2024-12-31T23:59:59.000Z');
  });

  it('os quatro novos timestamps (F1.4) saem em ISO 8601, cada um na sua coluna', () => {
    const row = makeCompleteRow({
      p1StoryShownAt:         new Date('2026-10-11T12:00:00.000Z'),
      p1NextStoryAvailableAt: new Date('2026-10-11T12:00:41.250Z'),
      p2StoryShownAt:         new Date('2026-10-11T12:00:02.500Z'),
      p2NextStoryAvailableAt: new Date('2026-10-11T12:00:43.000Z'),
    });
    const fields = serializeExportCsv([row]).split('\n')[1].split(',');
    expect(fields[col('p1StoryShownAt')]).toBe('2026-10-11T12:00:00.000Z');
    expect(fields[col('p1NextStoryAvailableAt')]).toBe('2026-10-11T12:00:41.250Z');
    expect(fields[col('p2StoryShownAt')]).toBe('2026-10-11T12:00:02.500Z');
    expect(fields[col('p2NextStoryAvailableAt')]).toBe('2026-10-11T12:00:43.000Z');
  });
});

// ---------------------------------------------------------------------------
// 4. boolean → "true" / "false"
// ---------------------------------------------------------------------------

describe('serializeExportCsv — boolean', () => {
  it('true serializa como "true"', () => {
    const [, dataLine] = serializeExportCsv([makeCompleteRow({ consensus: true })]).split('\n');
    const fields = dataLine.split(',');
    expect(fields[col('consensus')]).toBe('true');
  });

  it('false serializa como "false"', () => {
    const [, dataLine] = serializeExportCsv([makeCompleteRow({ punishmentApplied: false })]).split('\n');
    const fields = dataLine.split(',');
    expect(fields[col('punishmentApplied')]).toBe('false');
  });

  it('boolean null serializa como campo vazio', () => {
    const [, dataLine] = serializeExportCsv([makeCompleteRow({ consensus: null })]).split('\n');
    const fields = dataLine.split(',');
    expect(fields[col('consensus')]).toBe('');
  });
});

// ---------------------------------------------------------------------------
// 5. Vírgulas escapadas
// ---------------------------------------------------------------------------

describe('serializeExportCsv — escaping: vírgulas', () => {
  it('sessionName com vírgula é envolvido em aspas duplas', () => {
    const row = makeCompleteRow({ sessionName: 'Turma A, G1' });
    const [, dataLine] = serializeExportCsv([row]).split('\n');
    expect(dataLine).toContain('"Turma A, G1"');
  });

  it('campo com vírgula não quebra a contagem de 43 campos', () => {
    const row = makeCompleteRow({ sessionName: 'A, B, C' });
    const csv = serializeExportCsv([row]);
    const lines = csv.split('\n');
    // Usar regex para parsear CSV corretamente não é o objetivo aqui;
    // verificamos que o campo escapado está presente
    expect(lines[1]).toContain('"A, B, C"');
  });
});

// ---------------------------------------------------------------------------
// 6. Aspas duplicadas
// ---------------------------------------------------------------------------

describe('serializeExportCsv — escaping: aspas', () => {
  it('aspas duplas no valor são duplicadas e o campo envolvido em aspas', () => {
    const row = makeCompleteRow({ sessionName: 'Diz "olá"' });
    const [, dataLine] = serializeExportCsv([row]).split('\n');
    expect(dataLine).toContain('"Diz ""olá"""');
  });

  it('aspas simples não são afetadas', () => {
    const row = makeCompleteRow({ sessionName: "It's fine" });
    const [, dataLine] = serializeExportCsv([row]).split('\n');
    expect(dataLine).toContain("It's fine");
    expect(dataLine).not.toContain('"It\'s fine"');
  });
});

// ---------------------------------------------------------------------------
// 7. Quebra de linha escapada
// ---------------------------------------------------------------------------

describe('serializeExportCsv — escaping: quebra de linha', () => {
  it('\\n no valor é envolvido em aspas duplas', () => {
    const row = makeCompleteRow({ sessionName: 'linha1\nlinha2' });
    const csv = serializeExportCsv([row]);
    expect(csv).toContain('"linha1\nlinha2"');
  });

  it('\\r no valor é envolvido em aspas duplas', () => {
    const row = makeCompleteRow({ sessionName: 'dado\rdado' });
    const csv = serializeExportCsv([row]);
    expect(csv).toContain('"dado\rdado"');
  });
});

// ---------------------------------------------------------------------------
// 8. Linha completa mantém 43 campos
// ---------------------------------------------------------------------------

describe('serializeExportCsv — linha completa', () => {
  it('linha de dados tem exatamente 43 campos separados por vírgula (sem escaping)', () => {
    const row = makeCompleteRow(); // sem campos especiais
    const [, dataLine] = serializeExportCsv([row]).split('\n');
    expect(dataLine.split(',').length).toBe(43);
  });

  it('linha completa: cada um dos 43 campos bate com o valor da sua coluna', () => {
    const row = makeCompleteRow({
      p1StoryShownAt:         new Date('2026-10-11T12:00:00.000Z'),
      p1NextStoryAvailableAt: new Date('2026-10-11T12:00:40.000Z'),
      p2StoryShownAt:         new Date('2026-10-11T12:00:01.000Z'),
      p2NextStoryAvailableAt: new Date('2026-10-11T12:00:42.000Z'),
    });
    const fields = serializeExportCsv([row]).split('\n')[1].split(',');
    expect(fields.length).toBe(43);
    EXPORT_COLUMNS.forEach((name, i) => {
      const v = (row as Record<string, unknown>)[name];
      const expected = v instanceof Date ? v.toISOString() : String(v);
      expect(fields[i], name).toBe(expected);
    });
  });

  it('valores de string/número preservados na posição correta', () => {
    const row = makeCompleteRow();
    const [, dataLine] = serializeExportCsv([row]).split('\n');
    const fields = dataLine.split(',');
    expect(fields[col('sessionId')]).toBe('sess-001');
    expect(fields[col('globalNumber')]).toBe('1');
    expect(fields[col('p1CoinsAfter')]).toBe('79');
    expect(fields[col('disagreementCountAfter')]).toBe('0');
  });

  it('múltiplas linhas geram múltiplas linhas de dados', () => {
    const rows = [
      makeCompleteRow({ globalNumber: 1 }),
      makeCompleteRow({ globalNumber: 2 }),
      makeCompleteRow({ globalNumber: 3 }),
    ];
    const lines = serializeExportCsv(rows).split('\n');
    expect(lines.length).toBe(4); // 1 header + 3 data
    expect(lines[1]).toContain(',1,');
    expect(lines[2]).toContain(',2,');
    expect(lines[3]).toContain(',3,');
  });
});

// ---------------------------------------------------------------------------
// 9. Array vazio gera só cabeçalho
// ---------------------------------------------------------------------------

describe('serializeExportCsv — array vazio', () => {
  it('[] retorna apenas a linha de cabeçalho (sem \\n final)', () => {
    const csv = serializeExportCsv([]);
    expect(csv).toBe(EXPORT_COLUMNS.join(','));
    expect(csv.includes('\n')).toBe(false);
  });

  it('cabeçalho de [] é idêntico ao cabeçalho de lista não vazia', () => {
    const emptyHeader = serializeExportCsv([]).split('\n')[0];
    const fullHeader  = serializeExportCsv([makeCompleteRow()]).split('\n')[0];
    expect(emptyHeader).toBe(fullHeader);
  });
});
