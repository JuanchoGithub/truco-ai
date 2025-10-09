

import React from 'react';

interface MainMenuProps {
  onPlay: () => void;
  onLearn: () => void;
  onPlayWithHelp: () => void;
  onManual: () => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onPlay, onLearn, onPlayWithHelp, onManual }) => {
  return (
    <div className="h-screen bg-green-900 text-white font-sans flex items-center justify-center" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/felt.png')"}}>
      <div className="text-center p-8 bg-black/40 border-4 border-yellow-800/60 rounded-xl shadow-2xl animate-fade-in-scale">
        <h1 className="text-6xl md:text-8xl font-cinzel font-bold tracking-wider text-yellow-300 mb-2" style={{ textShadow: '4px 4px 6px rgba(0,0,0,0.8)' }}>
          TRUCO AI
        </h1>
        <p className="text-gray-300 mb-12">Un desafío de cartas contra una IA estratégica.</p>
        <div className="flex flex-col gap-6">
          <button
            onClick={onPlay}
            className="px-8 py-4 text-xl md:text-2xl rounded-lg font-bold text-white shadow-lg transition-transform transform hover:scale-105 border-b-4 bg-gradient-to-b from-yellow-600 to-yellow-700 border-yellow-900 hover:from-yellow-500 hover:to-yellow-600"
            style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.5)' }}
          >
            Jugar contra la IA
          </button>
          <button
            onClick={onPlayWithHelp}
            className="px-8 py-4 text-xl md:text-2xl rounded-lg font-bold text-white shadow-lg transition-transform transform hover:scale-105 border-b-4 bg-gradient-to-b from-green-600 to-green-700 border-green-900 hover:from-green-500 hover:to-green-600"
            style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.5)' }}
          >
            Jugar con Ayuda
          </button>
          <button
            onClick={onLearn}
            className="px-8 py-4 text-xl md:text-2xl rounded-lg font-bold text-white shadow-lg transition-transform transform hover:scale-105 border-b-4 bg-gradient-to-b from-blue-600 to-blue-700 border-blue-900 hover:from-blue-500 hover:to-blue-600"
            style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.5)' }}
          >
            Aprender a Jugar
          </button>
           <button
            onClick={onManual}
            className="px-8 py-4 text-xl md:text-2xl rounded-lg font-bold text-white shadow-lg transition-transform transform hover:scale-105 border-b-4 bg-gradient-to-b from-slate-600 to-slate-700 border-slate-900 hover:from-slate-500 hover:to-slate-600"
            style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.5)' }}
          >
            Manual del Truco
          </button>
        </div>
      </div>
    </div>
  );
};

export default MainMenu;