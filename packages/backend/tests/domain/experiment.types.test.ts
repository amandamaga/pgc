import { describe, expect, it } from 'vitest';
import {
  CC_REWARD,
  INDIVIDUAL_PUNISHMENT_COST,
  INITIAL_COINS,
  SEQUENCE_PRESETS,
  blockLabel,
  formatBlockSequence,
  isBlockConditions,
} from '../../src/domain/experiment.types';

// -----------------------------------------------------------------------------
// SEQUENCE_PRESETS (atalhos das sequências da tese)
// -----------------------------------------------------------------------------

describe('SEQUENCE_PRESETS', () => {
  it('ABAC → [A, B, A, C]', () => {
    expect(SEQUENCE_PRESETS['ABAC']).toEqual(['A', 'B', 'A', 'C']);
  });

  it('ACAB → [A, C, A, B]', () => {
    expect(SEQUENCE_PRESETS['ACAB']).toEqual(['A', 'C', 'A', 'B']);
  });

  it('BCBC → [B, C, B, C]', () => {
    expect(SEQUENCE_PRESETS['BCBC']).toEqual(['B', 'C', 'B', 'C']);
  });

  it('CBCB → [C, B, C, B]', () => {
    expect(SEQUENCE_PRESETS['CBCB']).toEqual(['C', 'B', 'C', 'B']);
  });
});

// -----------------------------------------------------------------------------
// isBlockConditions — validação da condição de cada bloco
// -----------------------------------------------------------------------------

describe('isBlockConditions', () => {
  it.each([
    [['A', 'B', 'A', 'C']],
    [['A', 'A', 'A', 'A']],
    [['C', 'C', 'B', 'B']],
    [['B', 'A', 'C', 'A']],
  ])('aceita %j (qualquer combinação, com repetição)', (value) => {
    expect(isBlockConditions(value)).toBe(true);
  });

  it.each([
    [['A', 'B', 'A']],
    [['A', 'B', 'A', 'C', 'B']],
    [[]],
    [['A', 'B', 'A', 'D']],
    [['a', 'b', 'a', 'c']],
    [['Aa', 'B', 'A', 'C']],
    [['A', 'B', null, 'C']],
    ['ABAC'],
    [null],
    [undefined],
    [{ 0: 'A', 1: 'B', 2: 'A', 3: 'C', length: 4 }],
  ])('recusa %j', (value) => {
    expect(isBlockConditions(value)).toBe(false);
  });
});

// -----------------------------------------------------------------------------
// Rótulos do bloco
// -----------------------------------------------------------------------------

describe('blockLabel e formatBlockSequence', () => {
  it('blockLabel = condição + número do bloco', () => {
    expect(blockLabel('A', 1)).toBe('A1');
    expect(blockLabel('A', 3)).toBe('A3');
    expect(blockLabel('C', 4)).toBe('C4');
  });

  it('ABAC → A1-B2-A3-C4', () => {
    expect(formatBlockSequence(['A', 'B', 'A', 'C'])).toBe('A1-B2-A3-C4');
  });

  it('sequência com repetição → AABB → A1-A2-B3-B4', () => {
    expect(formatBlockSequence(['A', 'A', 'B', 'B'])).toBe('A1-A2-B3-B4');
  });
});

// -----------------------------------------------------------------------------
// Constantes experimentais
// -----------------------------------------------------------------------------

describe('constantes experimentais', () => {
  it('INITIAL_COINS = 80', () => {
    expect(INITIAL_COINS).toBe(80);
  });

  it('CC_REWARD = 3', () => {
    expect(CC_REWARD).toBe(3);
  });

  it('INDIVIDUAL_PUNISHMENT_COST = 1', () => {
    expect(INDIVIDUAL_PUNISHMENT_COST).toBe(1);
  });
});
