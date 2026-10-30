import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { PiggyBank } from "lucide-react";

interface PiggyBankCounterProps {
  count: number;
  label?: string;
}

// Tamanho em px multiplicado pela escala da tela do jogo (--ui, definida em
// experiment-flow-vertical). Fora do jogo a variável não existe e vale 1.
const u = (px: number) => `calc(${px}px * var(--ui, 1))`;

// Quantas moedas desenhar como bolinhas na faixa. As moedas do grupo crescem de
// 3 em 3 e raramente passam de ~45 numa sessão; acima do teto as bolinhas param
// de crescer e o número continua valendo (mesma convenção das pilhas laterais).
const STRIP_MAX_DOTS = 66;

// Faixa das moedas do grupo no topo da tela: barra amarela com o porquinho,
// "MOEDAS DO GRUPO N" e as moedas desenhadas como bolinhas, para ficarem mais
// visíveis que só o número (F3, itens da Luiza de 07/10). Rótulo "Moedas do
// grupo" no lugar de "Cofrinho do grupo" (item 9 da Luiza, 26/10).
export function PiggyBankCounter({ count, label = "Moedas do grupo" }: PiggyBankCounterProps) {
  const prevCountRef = useRef(count);
  const [pulse, setPulse] = useState(false);

  // Quando o número muda, a faixa pulsa uma vez. O "+N" que saía flutuando
  // embaixo da faixa foi retirado a pedido da Luiza (item 10, 26/10): o ganho
  // já aparece na janela "Vocês ganharam moedas".
  useEffect(() => {
    if (count !== prevCountRef.current) {
      prevCountRef.current = count;
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 1800);
      return () => clearTimeout(timer);
    }
  }, [count]);

  return (
    <div className="relative w-full overflow-visible" data-testid="piggy-bank">
      {/* Faixa dourada */}
      <motion.div
        animate={pulse ? { scale: [1, 1.03, 1] } : { scale: 1 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="w-full flex flex-col items-center justify-center cursor-default select-none"
        style={{
          backgroundColor: "#FFD900", boxShadow: "inset 0 -2px 0 #E8C400",
          gap: u(5), padding: `${u(8)} 0`,
        }}
      >
        <div className="flex items-center justify-center" style={{ gap: u(12) }}>
          <PiggyBank color="#6B4200" strokeWidth={2.2} style={{ width: u(30), height: u(30) }} aria-hidden />
          <span className="font-nunito font-black uppercase leading-none"
            style={{ color: "#6B4200", fontSize: u(20), letterSpacing: 1 }}>
            {label}
          </span>
          <span className="font-nunito font-black leading-none" data-testid="piggy-bank-count"
            style={{ color: "#6B4200", fontSize: u(30) }}>
            {count}
          </span>
        </div>
        {/* As moedas do grupo como bolinhas (pedido da Luiza): uma por moeda,
            quebrando em mais de uma linha quando o grupo junta muitas.
            aria-hidden porque o número acima já informa o valor. */}
        {count > 0 && (
          <div className="flex flex-wrap items-center justify-center" aria-hidden
            style={{ gap: u(3), maxWidth: u(440) }} data-testid="piggy-bank-dots">
            {Array.from({ length: Math.min(count, STRIP_MAX_DOTS) }, (_, i) => (
              <div key={i} style={{
                width: u(9), height: u(9), borderRadius: "50%",
                backgroundColor: "#FFF3B0", border: "1.5px solid #CE9200",
              }} />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
