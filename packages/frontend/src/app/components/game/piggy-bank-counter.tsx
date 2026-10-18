import { motion, AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { PiggyBank } from "lucide-react";

interface PiggyBankCounterProps {
  count: number;
  label?: string;
}

// Tamanho em px multiplicado pela escala da tela do jogo (--ui, definida em
// experiment-flow-vertical). Fora do jogo a variável não existe e vale 1.
const u = (px: number) => `calc(${px}px * var(--ui, 1))`;

// Quantas moedas desenhar como bolinhas na faixa. O cofrinho cresce de 3 em 3
// e raramente passa de ~45 numa sessão; acima do teto as bolinhas param de
// crescer e o número continua valendo (mesma convenção das pilhas laterais).
const STRIP_MAX_DOTS = 66;

// Faixa do cofrinho do grupo no topo da tela (F3, itens da Luiza de 07/10):
// barra amarela com o porquinho, "COFRINHO DO GRUPO N" e as moedas desenhadas
// como bolinhas, para ficarem mais visíveis que só o número. Antes o rótulo
// chegava por prop mas não era desenhado, e o ícone de 20 px sumia num notebook.
export function PiggyBankCounter({ count, label = "Cofrinho do grupo" }: PiggyBankCounterProps) {
  const prevCountRef = useRef(count);
  const [showChange, setShowChange] = useState<number>(0);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (count !== prevCountRef.current) {
      const change = count - prevCountRef.current;
      prevCountRef.current = count;
      setShowChange(change);
      setPulse(true);

      const timer = setTimeout(() => {
        setShowChange(0);
        setPulse(false);
      }, 1800);

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
            quebrando em mais de uma linha quando o cofrinho enche. aria-hidden
            porque o número acima já informa o valor. */}
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

      {/* +N do ganho: sai logo abaixo da faixa e desce sumindo. Antes subia a
          partir do topo da página e ficava fora da tela. */}
      <AnimatePresence>
        {showChange !== 0 && (
          <motion.div
            key={`change-${showChange}-${count}`}
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: 28, scale: 0.9 }}
            transition={{ duration: 1.6, ease: "easeOut" }}
            className="absolute left-1/2 -translate-x-1/2 z-50 pointer-events-none"
            style={{ top: "100%" }}
          >
            <div
              className="font-nunito font-black rounded-xl whitespace-nowrap border-2"
              style={{
                backgroundColor: "#FFD900", borderColor: "#CE9200", color: "#7A5800",
                fontSize: u(20), padding: `${u(2)} ${u(12)}`,
              }}
            >
              {showChange > 0 ? `+${showChange}` : showChange}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
