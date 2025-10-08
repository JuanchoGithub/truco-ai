
import React from 'react';

const TallyMarks: React.FC<{ score: number }> = ({ score }) => {
  const fullGroups = Math.floor(score / 5);
  const remainder = score % 5;

  const groups = [];

  for (let i = 0; i < fullGroups; i++) {
    groups.push(
      // Use flex to center the vertical bars, which will also center the absolute positioned slash
      <div key={`group-${i}`} className="relative w-8 h-8 mr-2 flex items-center justify-center text-xl md:text-2xl font-mono text-amber-50 not-italic" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.5)'}}>
        <span className="tracking-tighter" style={{ letterSpacing: '-0.15em' }}>||||</span>
        {/* This slash is now perfectly centered relative to the centered bars */}
        <div className="absolute top-1/2 left-1/2 w-[155%] h-[3px] bg-red-500 transform -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full" />
      </div>
    );
  }

  if (remainder > 0) {
    groups.push(
      // Use flex here as well for consistent vertical alignment with the full groups
      <div key="remainder" className="relative h-8 flex items-center justify-center text-xl md:text-2xl font-mono text-amber-50 not-italic" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.5)'}}>
        <span className="tracking-tighter" style={{ letterSpacing: '-0.15em' }}>{'|'.repeat(remainder)}</span>
      </div>
    );
  }

  return <div className="flex items-center h-8">{groups.length > 0 ? <>{groups}</> : <span className="text-amber-50 text-xl md:text-2xl">0</span>}</div>;
};


const Scoreboard: React.FC<{ playerScore: number; aiScore: number; className?: string }> = ({ playerScore, aiScore, className = '' }) => {
  return (
    <div className={`bg-black/30 p-2 md:p-4 rounded-lg shadow-xl border-2 border-yellow-700/30 w-40 md:w-48 shadow-inner shadow-black/30 ${className}`}>
      <h2 className="text-base md:text-lg font-bold text-center mb-2 md:mb-3 text-yellow-300 font-cinzel tracking-widest" style={{ textShadow: '2px 2px 3px rgba(0,0,0,0.7)' }}>Tantos</h2>
      <div className="flex justify-between items-center mb-1 md:mb-2">
        <span className="font-semibold text-amber-50 text-sm md:text-base">Jugador:</span>
        <TallyMarks score={playerScore} />
      </div>
      <div className="flex justify-between items-center">
        <span className="font-semibold text-amber-50 text-sm md:text-base">IA:</span>
        <TallyMarks score={aiScore} />
      </div>
    </div>
  );
};

export default Scoreboard;
