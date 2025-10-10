
import React from 'react';
import { Player } from '../types';

interface GameOverModalProps {
  winner: Player;
  onPlayAgain: () => void;
  reason?: string | null;
}

const GameOverModal: React.FC<GameOverModalProps> = ({ winner, onPlayAgain, reason }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-green-800 border-4 border-yellow-500 rounded-xl shadow-2xl p-6 lg:p-8 text-center transform scale-100 transition-transform duration-300">
        <h2 className="text-3xl lg:text-4xl font-bold text-yellow-300 mb-4">
          {winner === 'player' ? '¡Ganaste!' : '¡Perdiste!'}
        </h2>
        <p className="text-base lg:text-lg text-gray-200 mb-8">
          {reason || (winner === 'player' ? '¡Felicitaciones, eres el campeón de Truco!' : '¡Mejor suerte la próxima vez!')}
        </p>
        <button
          onClick={onPlayAgain}
          className="px-6 py-2 text-lg lg:px-8 lg:py-3 lg:text-xl bg-yellow-600 text-white font-bold rounded-lg shadow-lg hover:bg-yellow-500 transition-colors duration-200"
        >
          Jugar de Nuevo
        </button>
      </div>
    </div>
  );
};

export default GameOverModal;
