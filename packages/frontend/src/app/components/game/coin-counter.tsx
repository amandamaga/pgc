import { motion, AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";

function FlatCoinSm() {
  return (
    <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="14" fill="#FFD900" />
      <circle cx="16" cy="16" r="14" stroke="#CE9200" strokeWidth="2.5" />
      <circle cx="16" cy="16" r="10" fill="#F5C400" />
      <text x="16" y="21" textAnchor="middle" fontSize="12" fontWeight="900" fill="#CE9200" fontFamily="sans-serif">$</text>
    </svg>
  );
}

interface CoinCounterProps {
  count: number;
  label?: string;
}

export function CoinCounter({ count, label = "Você" }: CoinCounterProps) {
  // useRef evita re-render loop: atualizar ref não dispara o effect de novo
  const prevCountRef = useRef(count);
  const [showChange, setShowChange] = useState<number>(0);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (count !== prevCountRef.current) {
      const change = count - prevCountRef.current;
      prevCountRef.current = count; // atualiza ref sem re-render
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
    <div className="relative flex-shrink-0">
      {/* Floating +/- indicator */}
      <AnimatePresence>
        {showChange !== 0 && (
          <motion.div
            key={`change-${showChange}-${Date.now()}`}
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: -44, scale: 0.85 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute left-1/2 -translate-x-1/2 z-50 pointer-events-none"
            style={{ bottom: "100%" }}
          >
            <div
              className="font-nunito font-black text-sm px-3 py-1 rounded-xl whitespace-nowrap border-2"
              style={{
                backgroundColor: showChange > 0 ? "#58CC02" : "#FF4B4B",
                borderColor: showChange > 0 ? "#46A302" : "#EA2B2B",
                color: "white",
              }}
            >
              {showChange > 0 ? "+" : ""}{showChange}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Counter — coins → number → label */}
      <motion.div
        animate={pulse ? { scale: [1, 1.15, 1] } : { scale: 1 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="flex items-center gap-1.5 cursor-default select-none"
      >
        {count > 0 && (
          <div className="flex items-center gap-0.5">
            {Array.from({ length: count }, (_, i) => (
              <motion.div key={i} initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: i * 0.03, type: "spring", stiffness: 450, damping: 18 }}>
                <FlatCoinSm />
              </motion.div>
            ))}
          </div>
        )}
        <span className="font-nunito font-black text-xl leading-none" style={{ color: "#58CC02" }}>{count}</span>
        <span className="font-nunito font-bold uppercase leading-none" style={{ fontSize: "10px", color: "#AFAFAF", letterSpacing: "0.04em" }}>{label}</span>
      </motion.div>
    </div>
  );
}