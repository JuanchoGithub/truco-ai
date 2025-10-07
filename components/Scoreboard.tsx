
import React from 'react';

const TallyMarks: React.FC<{ score: number }> = ({ score }) => {
  const fullGroups = Math.floor(score / 5);
  const remainder = score % 5;

  const groups = [];

  for (let i = 0; i < fullGroups; i++) {
    groups.push(
      <div key={`group-${i}`} className="relative w-7 h-7 mr-1 md:w-8 md:h-8 md:mr-2 text-xl md:text-2xl font-mono text-amber-50 not-italic" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.5)'}}>
        <span className="absolute left-0 -top-1 tracking-tighter" style={{ letterSpacing: '-0.15em' }}>||||</span>
        <div className="absolute left-0 w-full h-[3px] bg-red-500 transform -rotate-45 origin-top-left -translate-y-1/2 scale-x-125 rounded-full" style={{left: '-2px', top: 'calc(50% + 1px)' }}></div>
      </div>
    );
  }

  if (remainder > 0) {
    groups.push(
      <div key="remainder" className="relative h-8 text-xl md:text-2xl font-mono text-amber-50 not-italic" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.5)'}}>
        <span className="tracking-tighter" style={{ letterSpacing: '-0.15em' }}>{'|'.repeat(remainder)}</span>
      </div>
    );
  }

  return <div className="flex items-center h-8">{groups.length > 0 ? <>{groups}</> : <span className="text-amber-50 text-xl md:text-2xl">0</span>}</div>;
};


const Scoreboard: React.FC<{ playerScore: number; aiScore: number; className?: string }> = ({ playerScore, aiScore, className = '' }) => {
  return (
    <div className={`bg-black/30 p-2 md:p-4 rounded-lg shadow-xl border-2 border-yellow-700/30 w-40 md:w-48 shadow-inner shadow-black/30 ${className}`}>
      <h2 className="text-base md:text-lg font-bold text-center mb-2 md:mb-3 text-yellow-300 font-cinzel tracking-widest" style={{ textShadow: '2px 2px 3px rgba(0,0,0,0.7)' }}>Score</h2>
      <div className="flex justify-between items-center mb-1 md:mb-2">
        <span className="font-semibold text-amber-50 text-sm md:text-base">Player:</span>
        <TallyMarks score={playerScore} />
      </div>
      <div className="flex justify-between items-center">
        <span className="font-semibold text-amber-50 text-sm md:text-base">AI:</span>
        <TallyMarks score={aiScore} />
      </div>
    </div>
  );
};

export default Scoreboard;
