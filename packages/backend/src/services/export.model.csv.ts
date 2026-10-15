/**
 * export.model.csv.ts
 * Serialização do CSV compatível com G1_P1_modelo.xlsx (planilha de Luiza F. Caldas).
 *
 * 24 colunas na ordem exata da planilha de referência.
 * Reutiliza ExportRow — sem acesso ao banco.
 */

import type { ExportRow } from '../domain/export.contract';
import { shouldAwardCulturalConsequence } from '../domain/experiment.rules';

// ---------------------------------------------------------------------------
// Cabeçalho exato da planilha de referência (24 colunas)
// ---------------------------------------------------------------------------

export const MODEL_COLUMNS = [
  'Condition',
  'Trial',
  'Distributor',
  'Initial',
  'Distributor',
  'Receptor',
  'D Final',
  'D lost (D-)',
  'Igual/Desigual',
  'BOY',
  'GIRL',
  'BOY',
  'GIRL',
  'G.Coins',
  'G.Coins Cum.',
  'Norm P1',
  'Norm P2',
  'P1',
  'P2',
  'Culturant',
  'D',
  'D Cumulated',
  'APtype',
  'COMENTÁRIOS',
] as const;

// ---------------------------------------------------------------------------
// Helpers de mapeamento
// ---------------------------------------------------------------------------

/** Condition: bloco 3 com condição A → Aa */
function mapCondition(row: ExportRow): string {
  if (row.condition === 'A' && row.blockNumber === 3) return 'Aa';
  return row.condition;
}

/** E/U baseado nas distribuições */
function mapEqualUnequal(row: ExportRow): string {
  return row.distributorDistribution === row.receptorDistribution ? 'E' : 'U';
}

/**
 * D Final potencial (independe de punishmentApplied):
 * - Igual:    distribuidor/2
 * - Desigual: receptorDistribution
 */
function dFinal(row: ExportRow): number {
  if (row.distributorDistribution === row.receptorDistribution) {
    return row.distributorDistribution / 2;
  }
  return row.receptorDistribution;
}

/**
 * D Lost potencial (independe de punishmentApplied):
 * distribuidor - dFinal
 */
function dLost(row: ExportRow): number {
  return row.distributorDistribution - dFinal(row);
}

/** Just/Unjust → j/i; null → vazio */
function mapJudgment(j: string | null): string {
  if (j === null) return '';
  return j === 'Just' ? 'j' : 'i';
}

/** Punish/NoPunish → 1/0; null → vazio */
function mapPunishment(p: string | null): string {
  if (p === null) return '';
  return p === 'Punish' ? '1' : '0';
}

/**
 * Norm P1/P2:
 * - U + Unjust → SN
 * - E + Just   → SN
 * - outros     → NN
 * - null       → vazio
 */
function mapNorm(judgment: string | null, eu: string): string {
  if (judgment === null) return '';
  if (eu === 'U' && judgment === 'Unjust') return 'SN';
  if (eu === 'E' && judgment === 'Just')   return 'SN';
  return 'NN';
}

/**
 * D (indicator de desacordo):
 * - sem culturant → vazio
 * - culturant=D → 1
 * - outros → 0
 */
function mapD(culturant: string | null): string {
  if (culturant === null) return '';
  return culturant === 'D' ? '1' : '0';
}

/**
 * APtype — derivado da mesma matriz que decide a consequência cultural
 * (shouldAwardCulturalConsequence), para que as duas regras nunca divirjam:
 *
 * - sem culturant          → vazio
 * - desacordo (D)          → A/Aa: 'D'  |  B/C: 'APd'
 * - consenso que gera CC   → A/Aa: 'APa' | B: 'APb' | C: 'APc'
 * - consenso que não gera  → 'APd'
 *
 * Rótulos do sistema (classifyCulturant):
 *   Bp  = punir igual       Cnp = não punir igual
 *   Cp  = punir desigual    Bnp = não punir desigual
 * Logo: B → APb para Bp/Bnp; C → APc para Cp/Cnp; A → APa para os quatro.
 *
 * A planilha G1P1 usa só Cp/Cnp na coluna Culturant (o Bp do sistema aparece
 * lá como Cp em distribuição igual); o APtype não depende desse rótulo.
 */
const AP_BY_CONDITION: Record<'A' | 'B' | 'C', string> = {
  A: 'APa',
  B: 'APb',
  C: 'APc',
};

function mapAPtype(row: ExportRow): string {
  const culturant = row.culturant;
  if (culturant === null) return '';

  if (culturant === 'D') {
    return row.condition === 'A' ? 'D' : 'APd';
  }

  return shouldAwardCulturalConsequence(row.condition, culturant)
    ? AP_BY_CONDITION[row.condition]
    : 'APd';
}

// ---------------------------------------------------------------------------
// CSV field escaping (mesmo comportamento do export.csv.ts)
// ---------------------------------------------------------------------------

function csvField(value: unknown): string {
  if (value === null || value === undefined) return '';

  let str: string;
  if (value instanceof Date)           str = value.toISOString();
  else if (typeof value === 'boolean') str = String(value);
  else                                 str = String(value);

  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// ---------------------------------------------------------------------------
// serializeModelExportCsv
// ---------------------------------------------------------------------------

export function serializeModelExportCsv(rows: ExportRow[]): string {
  const header = MODEL_COLUMNS.join(',');
  if (rows.length === 0) return header;

  const dataLines = rows.map(row => {
    const eu = mapEqualUnequal(row);

    const fields: unknown[] = [
      mapCondition(row),            // Condition
      row.trialInBlock,             // Trial
      row.distributorCharacter,     // Distributor (personagem)
      row.endowment,                // Initial
      row.distributorDistribution,  // Distributor (moedas)
      row.receptorDistribution,     // Receptor
      dFinal(row),                  // D Final (potencial)
      dLost(row),                   // D lost (potencial)
      eu,                           // Igual/Desigual
      mapJudgment(row.p1Judgment),  // BOY (P1 judgment)
      mapJudgment(row.p2Judgment),  // GIRL (P2 judgment)
      mapPunishment(row.p1Punishment), // BOY (P1 punishment)
      mapPunishment(row.p2Punishment), // GIRL (P2 punishment)
      row.culturalConsequence !== null ? row.culturalConsequence : '', // G.Coins
      row.groupCoinsAfter !== null ? row.groupCoinsAfter : '',         // G.Coins Cum.
      mapNorm(row.p1Judgment, eu),  // Norm P1
      mapNorm(row.p2Judgment, eu),  // Norm P2
      row.p1CoinsAfter !== null ? row.p1CoinsAfter : '',               // P1
      row.p2CoinsAfter !== null ? row.p2CoinsAfter : '',               // P2
      row.culturant ?? '',          // Culturant
      mapD(row.culturant),          // D
      row.disagreementCountAfter !== null ? row.disagreementCountAfter : '', // D Cumulated
      mapAPtype(row),                // APtype
      '',                           // COMENTÁRIOS (sempre vazio)
    ];

    return fields.map(csvField).join(',');
  });

  return [header, ...dataLines].join('\n');
}
