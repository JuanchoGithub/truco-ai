import React from 'react';

interface AiBlurbProps {
  text: string;
  isVisible: boolean;
}

const AiBlurb: React.FC<AiBlurbProps> = ({ text, isVisible }) => {
  return (
    <div
      className={`absolute top-[140px] md:top-[160px] left-1/2 -translate-x-1/2 w-80 md:w-96 p-4 bg-black/80 border-2 border-cyan-400 rounded-lg shadow-lg shadow-cyan-500/30 transition-all duration-500 ease-in-out font-vt323 text-cyan-200 text-lg md:text-xl text-center z-30 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-5 pointer-events-none'
      }`}
      style={{ textShadow: '0 0 5px currentColor' }}
    >
      {/* Speech bubble tail pointing up */}
      <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[10px] border-b-cyan-400"></div>
      <p>"{text}"</p>
    </div>
  );
};

export default AiBlurb;