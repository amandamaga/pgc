-- =============================================================================
-- F8 — Condição livre por bloco
--
-- A sessão deixa de guardar uma das 4 sequências fixas (enum SequenceVariant)
-- e passa a guardar a condição de cada bloco (block_conditions, 4 itens, com
-- repetição). Os templates de tentativa deixam de ser por variante: um por
-- posição (bloco × tentativa), 64 no total.
--
-- Dados existentes são preservados:
--   - cada sessão recebe as 4 condições da sua variante (ABAC → {A,B,A,C} ...);
--   - cada tentativa passa a apontar para o template da mesma posição;
--   - condition, snapshot do estímulo, respostas e registros não mudam.
--
-- A migration roda numa transação: se a guarda (passo 1) falhar, nada muda.
-- =============================================================================

-- 1. Guarda: o estímulo de cada posição tem de ser o mesmo em todas as
--    variantes. Se não for, colapsar os templates perderia informação.
DO $$
DECLARE
  divergent INTEGER;
BEGIN
  SELECT COUNT(*) INTO divergent
  FROM (
    SELECT "block_number", "trial_in_block"
    FROM "trial_templates"
    GROUP BY "block_number", "trial_in_block"
    HAVING COUNT(DISTINCT "stimulus_id") > 1
  ) AS d;

  IF divergent > 0 THEN
    RAISE EXCEPTION 'F8: % posicao(oes) com estimulos diferentes entre variantes; migration abortada.', divergent;
  END IF;
END $$;

-- 2. Sessões: block_conditions a partir da variante
ALTER TABLE "sessions" ADD COLUMN "block_conditions" "Condition"[];

UPDATE "sessions" SET "block_conditions" = CASE "sequence_variant"
  WHEN 'ABAC' THEN ARRAY['A', 'B', 'A', 'C']::"Condition"[]
  WHEN 'ACAB' THEN ARRAY['A', 'C', 'A', 'B']::"Condition"[]
  WHEN 'BCBC' THEN ARRAY['B', 'C', 'B', 'C']::"Condition"[]
  WHEN 'CBCB' THEN ARRAY['C', 'B', 'C', 'B']::"Condition"[]
END;

-- Prisma cria listas escalares sem NOT NULL; para não gerar drift no próximo
-- `migrate dev`, a obrigatoriedade e o tamanho ficam num CHECK (que o Prisma
-- não gerencia): exatamente 4 condições, nenhuma nula.
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_block_conditions_four_blocks_check"
  CHECK (
    "block_conditions" IS NOT NULL
    AND cardinality("block_conditions") = 4
    AND array_position("block_conditions", NULL) IS NULL
  );

-- 3. Tentativas: soltar as FKs compostas que usam a variante
ALTER TABLE "attempts" DROP CONSTRAINT "attempts_session_id_session_sequence_variant_fkey";
ALTER TABLE "attempts" DROP CONSTRAINT "attempts_trial_template_id_session_sequence_variant_block__fkey";

-- 4. Repontar cada tentativa para um template canônico da mesma posição
--    (o de menor id entre as variantes — todos têm o mesmo estímulo, passo 1)
WITH canonical AS (
  SELECT DISTINCT ON ("block_number", "trial_in_block")
         "id", "block_number", "trial_in_block"
  FROM "trial_templates"
  ORDER BY "block_number", "trial_in_block", "id"
)
UPDATE "attempts" a
SET "trial_template_id" = c."id"
FROM canonical c
WHERE a."block_number" = c."block_number"
  AND a."trial_in_block" = c."trial_in_block"
  AND a."trial_template_id" <> c."id";

-- 5. Templates: manter só o canônico de cada posição (64) e tirar a variante
DELETE FROM "trial_templates" t
WHERE t."id" NOT IN (
  SELECT DISTINCT ON ("block_number", "trial_in_block") "id"
  FROM "trial_templates"
  ORDER BY "block_number", "trial_in_block", "id"
);

DROP INDEX "trial_templates_sequence_variant_block_number_trial_in_bloc_key";
DROP INDEX "trial_templates_id_sequence_variant_block_number_trial_in_b_key";
ALTER TABLE "trial_templates" DROP COLUMN "sequence_variant";

CREATE UNIQUE INDEX "trial_templates_block_number_trial_in_block_key" ON "trial_templates"("block_number", "trial_in_block");
CREATE UNIQUE INDEX "trial_templates_id_block_number_trial_in_block_key" ON "trial_templates"("id", "block_number", "trial_in_block");

-- 6. Tentativas: tirar a coluna pivô e criar as FKs novas
ALTER TABLE "attempts" DROP COLUMN "session_sequence_variant";

ALTER TABLE "attempts" ADD CONSTRAINT "attempts_session_id_fkey"
  FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attempts" ADD CONSTRAINT "attempts_trial_template_id_block_number_trial_in_block_fkey"
  FOREIGN KEY ("trial_template_id", "block_number", "trial_in_block")
  REFERENCES "trial_templates"("id", "block_number", "trial_in_block") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 7. Sessões: tirar a variante e o enum
DROP INDEX "sessions_id_sequence_variant_key";
ALTER TABLE "sessions" DROP COLUMN "sequence_variant";
DROP TYPE "SequenceVariant";
