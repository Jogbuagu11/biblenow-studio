import React, { useEffect, useState } from 'react';

interface GiftBurstProps {
  amount: number;
  senderName?: string;
  onDone?: () => void;
  durationMs?: number;
}

const GiftBurst: React.FC<GiftBurstProps> = ({ amount, senderName, onDone, durationMs = 2600 }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, onDone]);

  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center">
      <style>{`
        @keyframes gift-pop { 0% { transform: scale(0.7); opacity: 0; } 15% { transform: scale(1.05); opacity: 1; } 30% { transform: scale(1); } 85% { opacity: 1; } 100% { opacity: 0; transform: translateY(-10px) scale(0.98); } }
        @keyframes gift-ping { 0% { transform: scale(1); opacity: 0.5; } 80% { transform: scale(1.6); opacity: 0; } 100% { transform: scale(1.7); opacity: 0; } }
      `}</style>
      <div className="relative">
        {/* expanding rings */}
        <div className="absolute inset-0 rounded-full bg-yellow-400/30" style={{ animation: 'gift-ping 1.2s ease-out infinite' }} />
        <div className="absolute inset-0 rounded-full bg-amber-500/20" style={{ animation: 'gift-ping 1.6s ease-out infinite', animationDelay: '150ms' }} />
        {/* coin */}
        <div
          className="relative rounded-full shadow-2xl border-4 border-yellow-300 bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-400 px-6 py-6 flex items-center justify-center"
          style={{ animation: 'gift-pop 2.4s ease-out forwards' }}
        >
          <div className="text-center leading-tight">
            <div className="text-4xl font-extrabold text-yellow-900 drop-shadow">{amount}</div>
            <div className="text-xs font-semibold text-yellow-950 tracking-wide">SHEKELZ</div>
            {senderName && (
              <div className="mt-2 text-xs font-semibold text-white bg-yellow-800/70 rounded px-2 py-0.5">
                from {senderName}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GiftBurst; 