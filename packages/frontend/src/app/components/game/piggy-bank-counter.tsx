import { motion, AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { PiggyBank } from "lucide-react";

function FlatCoinSm() {
  return (
    null
  );
}


interface PiggyBankCounterProps {
  count: number;
  label?: string;
}

export function PiggyBankCounter({ count, label = "Juntos" }: PiggyBankCounterProps) {
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
    <div className="relative w-full overflow-visible">
      {/* Floating +N indicator */}
      <AnimatePresence>
        {showChange !== 0 && (
          <motion.div
            key={`change-${showChange}-${Date.now()}`}
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: -36, scale: 0.85 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute left-1/2 -translate-x-1/2 z-50 pointer-events-none"
            style={{ top: 0 }}
          >
            <div
              className="font-nunito font-black text-sm px-3 py-1 rounded-xl whitespace-nowrap border-2"
              style={{ backgroundColor: "#FFD900", borderColor: "#CE9200", color: "#7A5800" }}
            >
              +{showChange}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-width strip — dourado */}
      <motion.div
        animate={pulse ? { scale: [1, 1.02, 1] } : { scale: 1 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="w-full flex items-center justify-center py-1.5 cursor-default select-none px-[0px] py-[10px] gap-y-[8px] gap-x-[2px]"
        style={{ backgroundColor: "#FFD900", boxShadow: "inset 0 1px 0 #E8C400" }}
      >
        <PiggyBank size={20} color="#6B4200" strokeWidth={2} />
        
        {count > 0 && (
          <div className="flex items-center gap-0.5">
            {Array.from({ length: count }, (_, i) => (
              <motion.div key={i} initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: i * 0.05, type: "spring", stiffness: 400, damping: 18 }}>
                <FlatCoinSm />
              </motion.div>
            ))}
          </div>
        )}
        <span className="font-nunito font-black text-lg leading-none" style={{ color: "#6B4200" }}>{count}</span>
      </motion.div>
    </div>
  );
}