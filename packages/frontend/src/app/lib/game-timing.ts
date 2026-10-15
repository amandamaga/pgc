/**
 * game-timing.ts
 * Tempo padrão de tudo que avança sozinho na tela da criança (sem clique).
 *
 * Decisão da F2 (reunião com a Luiza, out/2026): toda tela ou feedback
 * automático fica 3 s na tela. Para mudar o ritmo do jogo inteiro, altere só
 * este valor — os tempos em experiment-flow-vertical.tsx derivam dele.
 *
 * Hoje usam este valor:
 *   - "Hora de Dividir"            → AUTO_SCREEN_MS
 *   - moedas voando                → AUTO_SCREEN_MS
 *   - "Moedas distribuídas..."     → AUTO_SCREEN_MS
 *   - aviso de perda de moedas     → AUTO_SCREEN_MS por linha
 *
 * Sugestão registrada na proposta: no futuro, a pesquisadora poderia definir
 * este tempo ao criar o experimento.
 */
export const AUTO_SCREEN_MS = 3000;
