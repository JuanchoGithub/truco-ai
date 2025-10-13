
import React from 'react';
import { useLocalization } from '../context/LocalizationContext';

interface PlayerBlurbProps {
  text: string;
  isVisible: boolean;
}

const PlayerBlurb: React.FC<PlayerBlurbProps> = ({ text, isVisible }) => {
  const { t } = useLocalization();

  return (
    <div
      className={`absolute bottom-[110px] lg:bottom-[120px] left-1/2 -translate-x-1/2 w-auto min-w-[120px] max-w-xs p-3 bg-black/80 border-2 border-yellow-400 rounded-lg shadow-lg shadow-yellow-500/30 transition-all duration-500 ease-in-out font-vt323 text-yellow-200 text-xl lg:text-2xl text-center z-40 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5 pointer-events-none'
      }`}
      style={{ textShadow: '0 0 5px currentColor' }}
    >
      {/* Speech bubble tail pointing down */}
      <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-yellow-400"></div>
      <p>{text ? t(text) : ''}</p>
    </div>
  );
};

export default PlayerBlurb;