
import React from 'react';
import { Player } from '../types';
import { useLocalization } from '../context/LocalizationContext';

interface GameOverModalProps {
  winner: Player;
  onPlayAgain: () => void;
  reason?: string | null;
}

const GameOverModal: React.FC<GameOverModalProps> = ({ winner, onPlayAgain, reason }) => {
  const { t } = useLocalization();

  const isWin = winner === 'player';
  const title = isWin ? t('gameOverModal.win_title') : t('gameOverModal.lose_title');
  const defaultReason = isWin ? t('gameOverModal.win_reason') : t('gameOverModal.lose_reason');

  // Styles based on result
  const containerGradient = isWin 
    ? "from-green-900 via-stone-900 to-black" 
    : "from-red-950 via-stone-900 to-black";
  const borderColor = isWin ? "border-yellow-500" : "border-red-800";
  const titleColor = isWin ? "text-yellow-400" : "text-red-500";
  const glow = isWin ? "shadow-yellow-500/20" : "shadow-red-500/20";

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] animate-fade-in-scale backdrop-blur-sm p-4">
      <div className={`bg-gradient-to-b ${containerGradient} border-4 ${borderColor} rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.8),0_0_20px_${isWin ? '#eab308' : '#ef4444'}] p-8 lg:p-12 text-center w-full max-w-lg transform transition-transform duration-300 relative overflow-hidden`}>
        {/* Decorative background pattern */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] opacity-10 pointer-events-none"></div>
        
        {/* Confetti / Decoration */}
        {isWin && <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
             <div className="absolute top-[-20%] left-[20%] text-6xl animate-float opacity-20">🏆</div>
             <div className="absolute top-[50%] right-[10%] text-6xl animate-float opacity-20" style={{animationDelay: '1s'}}>🎉</div>
        </div>}

        <div className="relative z-10">
            <h2 className={`text-5xl lg:text-6xl font-bold ${titleColor} mb-6 font-cinzel tracking-widest drop-shadow-lg uppercase`}>
            {title}
            </h2>
            
            <div className="mb-10 p-4 bg-black/30 rounded-lg border border-white/10">
                <p className="text-lg lg:text-xl text-stone-200 font-lora italic">
                "{reason || defaultReason}"
                </p>
            </div>

            <button
            onClick={onPlayAgain}
            className={`
                px-8 py-4 text-xl font-bold uppercase tracking-widest rounded-lg shadow-xl transition-all transform hover:scale-105 active:scale-95
                ${isWin 
                    ? 'bg-gradient-to-b from-yellow-500 to-yellow-600 text-yellow-950 border-b-4 border-yellow-800 hover:from-yellow-400 hover:to-yellow-500' 
                    : 'bg-gradient-to-b from-stone-600 to-stone-700 text-stone-100 border-b-4 border-stone-900 hover:from-stone-500 hover:to-stone-600'}
            `}
            >
            {t('gameOverModal.play_again')}
            </button>
        </div>
      </div>
    </div>
  );
};

export default GameOverModal;
