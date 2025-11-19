
import React from 'react';
import { useLocalization } from '../context/LocalizationContext';

const TallyMarks: React.FC<{ score: number }> = ({ score }) => {
  const fullGroups = Math.floor(score / 5);
  const remainder = score % 5;

  const groups = [];

  for (let i = 0; i < fullGroups; i++) {
    groups.push(
      <div key={`group-${i}`} className="relative w-8 h-8 mr-2 flex items-center justify-center text-xl lg:text-2xl font-mono text-white/90" style={{textShadow: '1px 1px 0 rgba(0,0,0,0.5)'}}>
        <span className="tracking-tighter" style={{ letterSpacing: '-0.15em' }}>||||</span>
        <div className="absolute top-1/2 left-1/2 w-[140%] h-[2px] bg-red-500/90 transform -translate-x-1/2 -translate-y-1/2 -rotate-45 shadow-sm" />
      </div>
    );
  }

  if (remainder > 0) {
    groups.push(
      <div key="remainder" className="relative h-8 flex items-center justify-center text-xl lg:text-2xl font-mono text-white/90" style={{textShadow: '1px 1px 0 rgba(0,0,0,0.5)'}}>
        <span className="tracking-tighter" style={{ letterSpacing: '-0.15em' }}>{'|'.repeat(remainder)}</span>
      </div>
    );
  }

  return <div className="flex items-center h-8 pl-1">{groups.length > 0 ? <>{groups}</> : <span className="text-white/50 text-xl lg:text-2xl opacity-50">0</span>}</div>;
};


const Scoreboard: React.FC<{ playerScore: number; aiScore: number; className?: string }> = ({ playerScore, aiScore, className = '' }) => {
  const { t } = useLocalization();
  return (
    // Wood Frame Container
    <div className={`bg-gradient-to-b from-amber-800 to-amber-950 p-1.5 rounded-lg shadow-xl border border-amber-950 w-44 lg:w-52 ${className}`}>
      {/* Inner Slate/Chalkboard */}
      <div className="bg-stone-900/90 border border-white/10 rounded-md p-2 shadow-inner inset-shadow-black">
        <h2 className="text-xs font-bold text-center mb-2 text-amber-400/80 font-cinzel tracking-[0.2em] uppercase border-b border-white/10 pb-1">
            {t('scoreboard.title')}
        </h2>
        <div className="space-y-1">
            <div className="flex justify-between items-center">
                <span className="font-bold text-amber-100 text-xs uppercase tracking-wider w-16 text-right pr-2 border-r border-white/10 mr-2">{t('common.you_short')}</span>
                <div className="flex-grow">
                    <TallyMarks score={playerScore} />
                </div>
            </div>
            <div className="flex justify-between items-center">
                <span className="font-bold text-amber-100 text-xs uppercase tracking-wider w-16 text-right pr-2 border-r border-white/10 mr-2">{t('common.ai')}</span>
                 <div className="flex-grow">
                    <TallyMarks score={aiScore} />
                </div>
            </div>
        </div>
      </div>
      {/* Screw heads for decoration */}
      <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-amber-950/50 shadow-inner"></div>
      <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-950/50 shadow-inner"></div>
      <div className="absolute bottom-1 left-1 w-1.5 h-1.5 rounded-full bg-amber-950/50 shadow-inner"></div>
      <div className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-950/50 shadow-inner"></div>
    </div>
  );
};

export default Scoreboard;
