// Disposição fixa dos personagens, como nos cartões originais de estímulo.
//
// Cada par aparece sempre na mesma posição: o primeiro nome à esquerda e o
// segundo à direita. O que muda de uma história para outra é quem divide, e por
// isso a seta pode apontar para a direita (→, quem divide está à esquerda) ou
// para a esquerda (←, quem divide está à direita).
//
// O backend manda só distributorCharacter / receptorCharacter. O lado é
// derivado daqui, pelo nome, sem nenhum dado novo na API ou no banco.

export type Side = "left" | "right";

export const CHARACTER_PAIRS: ReadonlyArray<readonly [left: string, right: string]> = [
  ["Alice", "Laura"],
  ["David", "Theo"],
  ["Isabella", "Cecilia"],
  ["Maria", "Sarah"],
  ["Sofia", "Olivia"],
  ["Lucas", "Isaac"],
  ["Oliver", "William"],
  ["Phillip", "Benjamin"],
];

const normalize = (name: string) => name.trim().toLowerCase();

const SIDE_BY_NAME = new Map<string, Side>();
for (const [left, right] of CHARACTER_PAIRS) {
  SIDE_BY_NAME.set(normalize(left), "left");
  SIDE_BY_NAME.set(normalize(right), "right");
}

/** Lado fixo do personagem nos cartões originais, ou null se o nome não é conhecido. */
export function characterSide(name: string): Side | null {
  return SIDE_BY_NAME.get(normalize(name)) ?? null;
}

export type StimulusLayout = {
  left: string;
  right: string;
  distributorSide: Side;
  /** false quando o par não pôde ser confirmado e valeu o padrão (quem divide à esquerda). */
  known: boolean;
};

/**
 * Posição de quem divide e de quem recebe numa história.
 *
 * Com um par conhecido, cada um fica no seu lado fixo. Se o par não puder ser
 * confirmado (nome fora da tabela, ou os dois do mesmo lado), mantém o
 * comportamento anterior — quem divide à esquerda — e marca `known: false`.
 */
export function stimulusLayout(distributor: string, receptor: string): StimulusLayout {
  const dSide = characterSide(distributor);
  const rSide = characterSide(receptor);
  const known = dSide !== null && rSide !== null && dSide !== rSide;
  const distributorSide: Side = known ? dSide : "left";
  return distributorSide === "left"
    ? { left: distributor, right: receptor, distributorSide, known }
    : { left: receptor, right: distributor, distributorSide, known };
}
